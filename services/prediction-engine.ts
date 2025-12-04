
import { ProcessedMatch, LeagueStanding, FootballDataMatch } from '../types';
import { StorageService } from './storage';

// ============================================
// REDZONE PREDICTION ENGINE v2.0
// Advanced Statistical Analysis for Betting
// ============================================

interface TeamStats {
  name: string;
  position: number;
  goalsFor: number;
  goalsAgainst: number;
  gamesPlayed: number;
  homeWins: number;
  awayWins: number;
  form: string[];
  avgGoalsScored: number;
  avgGoalsConceded: number;
  // Home/Away splits
  homeGoalsScored?: number;
  homeGoalsConceded?: number;
  awayGoalsScored?: number;
  awayGoalsConceded?: number;
  homeGames?: number;
  awayGames?: number;
}

interface WhyPickReason {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 1-10
  description: string;
}

interface PredictionResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  over15Prob: number;
  over25Prob: number;
  over35Prob: number;
  bttsProb: number;
  mostLikelyScore: string;
  valueEdges: ValueEdge[];
  formScore: { home: number; away: number };
  strengthIndex: { home: number; away: number };
  confidenceBoost: number;
  analysis: string;
  // NEW: Enhanced analysis fields
  whyThisPick: WhyPickReason[];
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  homeAwayAdvantage: {
    homeAttackAtHome: number;
    homeDefenseAtHome: number;
    awayAttackAway: number;
    awayDefenseAway: number;
  };
}

interface ValueEdge {
  market: string;
  calculatedProb: number;
  impliedProb: number;
  edge: number;
  isValue: boolean;
  rating: 'STRONG' | 'MODERATE' | 'WEAK';
}

// League averages (can be updated dynamically)
const LEAGUE_AVERAGES = {
  SA: { homeGoals: 1.45, awayGoals: 1.15, totalGoals: 2.6 },
  PL: { homeGoals: 1.55, awayGoals: 1.25, totalGoals: 2.8 },
  CL: { homeGoals: 1.50, awayGoals: 1.20, totalGoals: 2.7 },
  LL: { homeGoals: 1.40, awayGoals: 1.10, totalGoals: 2.5 } // La Liga
};

// Form weight decay (most recent = highest weight)
const FORM_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08];

export const PredictionEngine = {

  // ============================================
  // CORE PROBABILITY FUNCTIONS
  // ============================================

  /**
   * Calculate Poisson probability for exactly k goals
   * P(X = k) = (λ^k * e^-λ) / k!
   */
  poissonProbability: (lambda: number, k: number): number => {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  },

  /**
   * Calculate cumulative Poisson probability (0 to k goals)
   */
  poissonCumulative: (lambda: number, upTo: number): number => {
    let sum = 0;
    for (let k = 0; k <= upTo; k++) {
      sum += PredictionEngine.poissonProbability(lambda, k);
    }
    return sum;
  },

  /**
   * Calculate probability of Over X.5 goals
   */
  calculateOverProbability: (lambdaHome: number, lambdaAway: number, threshold: number): number => {
    let underProb = 0;
    for (let h = 0; h <= threshold; h++) {
      for (let a = 0; a <= threshold - h; a++) {
        underProb += PredictionEngine.poissonProbability(lambdaHome, h) *
          PredictionEngine.poissonProbability(lambdaAway, a);
      }
    }
    return 1 - underProb;
  },

  /**
   * Calculate BTTS (Both Teams To Score) probability
   */
  calculateBTTSProbability: (lambdaHome: number, lambdaAway: number): number => {
    const homeScoresProb = 1 - PredictionEngine.poissonProbability(lambdaHome, 0);
    const awayScoresProb = 1 - PredictionEngine.poissonProbability(lambdaAway, 0);
    return homeScoresProb * awayScoresProb;
  },

  // ============================================
  // FORM & STRENGTH ANALYSIS
  // ============================================

  /**
   * Calculate weighted form score (0-100)
   * W = 3pts, D = 1pt, L = 0pt, weighted by recency
   */
  calculateFormScore: (form: string[]): number => {
    if (!form || form.length === 0) return 50; // Neutral

    let weightedScore = 0;
    let totalWeight = 0;

    form.slice(0, 5).forEach((result, index) => {
      const weight = FORM_WEIGHTS[index] || 0.05;
      let points = 0;
      if (result === 'W') points = 100;
      else if (result === 'D') points = 40;
      else if (result === 'L') points = 0;

      weightedScore += points * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  },

  /**
   * Calculate team strength index (0-100) based on multiple factors
   */
  calculateStrengthIndex: (stats: TeamStats, totalTeams: number = 20): number => {
    // Position factor (1st = 100, last = 0)
    const positionScore = ((totalTeams - stats.position) / (totalTeams - 1)) * 100;

    // Goal difference factor
    const gdPerGame = (stats.goalsFor - stats.goalsAgainst) / (stats.gamesPlayed || 1);
    const gdScore = Math.max(0, Math.min(100, 50 + (gdPerGame * 20)));

    // Attack strength
    const attackScore = Math.min(100, (stats.avgGoalsScored / 2.5) * 100);

    // Defense strength (lower = better)
    const defenseScore = Math.max(0, 100 - (stats.avgGoalsConceded / 2) * 50);

    // Weighted combination
    return Math.round(
      (positionScore * 0.30) +
      (gdScore * 0.25) +
      (attackScore * 0.25) +
      (defenseScore * 0.20)
    );
  },

  /**
   * Calculate expected goals using attack/defense strength
   */
  calculateExpectedGoals: (
    attackStrength: number,
    defenseWeakness: number,
    leagueAvg: number,
    isHome: boolean
  ): number => {
    const homeFactor = isHome ? 1.15 : 0.85;
    const attackFactor = attackStrength / 50; // Normalize around 1
    const defenseFactor = defenseWeakness / 50;

    return leagueAvg * attackFactor * defenseFactor * homeFactor;
  },

  // ============================================
  // VALUE BETTING DETECTION
  // ============================================

  /**
   * Detect value betting opportunities
   */
  detectValueBets: (
    calculatedProbs: { home: number; draw: number; away: number },
    odds: { home: number; draw: number; away: number }
  ): ValueEdge[] => {
    const edges: ValueEdge[] = [];

    const markets = [
      { name: '1 (Casa)', calculated: calculatedProbs.home, odd: odds.home },
      { name: 'X (Pareggio)', calculated: calculatedProbs.draw, odd: odds.draw },
      { name: '2 (Ospite)', calculated: calculatedProbs.away, odd: odds.away }
    ];

    markets.forEach(m => {
      const impliedProb = 1 / m.odd;
      const edge = (m.calculated - impliedProb) * 100;

      edges.push({
        market: m.name,
        calculatedProb: Math.round(m.calculated * 100),
        impliedProb: Math.round(impliedProb * 100),
        edge: Math.round(edge * 10) / 10,
        isValue: edge > 5,
        rating: edge > 15 ? 'STRONG' : edge > 8 ? 'MODERATE' : 'WEAK'
      });
    });

    return edges.sort((a, b) => b.edge - a.edge);
  },

  // ============================================
  // SCORE MATRIX CALCULATION
  // ============================================

  /**
   * Generate most likely scorelines
   */
  calculateScoreMatrix: (lambdaHome: number, lambdaAway: number, topN: number = 5): { score: string; prob: number }[] => {
    const scores: { score: string; prob: number }[] = [];

    for (let h = 0; h <= 5; h++) {
      for (let a = 0; a <= 5; a++) {
        const prob = PredictionEngine.poissonProbability(lambdaHome, h) *
          PredictionEngine.poissonProbability(lambdaAway, a);
        scores.push({ score: `${h}-${a}`, prob });
      }
    }

    return scores.sort((a, b) => b.prob - a.prob).slice(0, topN);
  },

  // ============================================
  // MAIN PREDICTION FUNCTION
  // ============================================

  /**
   * Generate complete prediction for a match
   */
  generatePrediction: (
    match: ProcessedMatch,
    league: 'SA' | 'PL' | 'CL' = 'SA'
  ): PredictionResult => {
    const standings = StorageService.getStandings();
    const leagueAvg = LEAGUE_AVERAGES[league];

    // Get team stats from standings
    const homeStanding = standings.find(s =>
      s.team.name.toLowerCase().includes(match.homeTeam.toLowerCase().split(' ')[0]) ||
      match.homeTeam.toLowerCase().includes(s.team.name.toLowerCase().split(' ')[0])
    );

    const awayStanding = standings.find(s =>
      s.team.name.toLowerCase().includes(match.awayTeam.toLowerCase().split(' ')[0]) ||
      match.awayTeam.toLowerCase().includes(s.team.name.toLowerCase().split(' ')[0])
    );

    // Build team stats
    const homeStats: TeamStats = homeStanding ? {
      name: match.homeTeam,
      position: homeStanding.position,
      goalsFor: homeStanding.goalsFor,
      goalsAgainst: homeStanding.goalsAgainst,
      gamesPlayed: homeStanding.playedGames,
      homeWins: homeStanding.won,
      awayWins: 0,
      form: homeStanding.form?.split(',') || [],
      avgGoalsScored: homeStanding.goalsFor / (homeStanding.playedGames || 1),
      avgGoalsConceded: homeStanding.goalsAgainst / (homeStanding.playedGames || 1)
    } : {
      name: match.homeTeam,
      position: 10,
      goalsFor: 15,
      goalsAgainst: 15,
      gamesPlayed: 12,
      homeWins: 3,
      awayWins: 2,
      form: ['D', 'D', 'D', 'D', 'D'],
      avgGoalsScored: 1.25,
      avgGoalsConceded: 1.25
    };

    const awayStats: TeamStats = awayStanding ? {
      name: match.awayTeam,
      position: awayStanding.position,
      goalsFor: awayStanding.goalsFor,
      goalsAgainst: awayStanding.goalsAgainst,
      gamesPlayed: awayStanding.playedGames,
      homeWins: 0,
      awayWins: awayStanding.won,
      form: awayStanding.form?.split(',') || [],
      avgGoalsScored: awayStanding.goalsFor / (awayStanding.playedGames || 1),
      avgGoalsConceded: awayStanding.goalsAgainst / (awayStanding.playedGames || 1)
    } : {
      name: match.awayTeam,
      position: 10,
      goalsFor: 15,
      goalsAgainst: 15,
      gamesPlayed: 12,
      homeWins: 2,
      awayWins: 3,
      form: ['D', 'D', 'D', 'D', 'D'],
      avgGoalsScored: 1.25,
      avgGoalsConceded: 1.25
    };

    // Calculate strength indices
    const homeStrength = PredictionEngine.calculateStrengthIndex(homeStats);
    const awayStrength = PredictionEngine.calculateStrengthIndex(awayStats);

    // Calculate form scores
    const homeForm = PredictionEngine.calculateFormScore(homeStats.form);
    const awayForm = PredictionEngine.calculateFormScore(awayStats.form);

    // Calculate defense weaknesses (inverse of strength)
    const homeDefenseWeakness = 100 - (100 - homeStats.avgGoalsConceded * 40);
    const awayDefenseWeakness = 100 - (100 - awayStats.avgGoalsConceded * 40);

    // Calculate expected goals (lambda for Poisson)
    const lambdaHome = PredictionEngine.calculateExpectedGoals(
      homeStats.avgGoalsScored * 40 + 20,
      awayDefenseWeakness,
      leagueAvg.homeGoals,
      true
    );

    const lambdaAway = PredictionEngine.calculateExpectedGoals(
      awayStats.avgGoalsScored * 40 + 20,
      homeDefenseWeakness,
      leagueAvg.awayGoals,
      false
    );

    // Clamp lambdas to reasonable range
    const clampedLambdaHome = Math.max(0.5, Math.min(4, lambdaHome));
    const clampedLambdaAway = Math.max(0.3, Math.min(3.5, lambdaAway));

    // Calculate 1X2 probabilities
    let homeWinProb = 0;
    let drawProb = 0;
    let awayWinProb = 0;

    for (let h = 0; h <= 10; h++) {
      for (let a = 0; a <= 10; a++) {
        const prob = PredictionEngine.poissonProbability(clampedLambdaHome, h) *
          PredictionEngine.poissonProbability(clampedLambdaAway, a);
        if (h > a) homeWinProb += prob;
        else if (h === a) drawProb += prob;
        else awayWinProb += prob;
      }
    }

    // Normalize probabilities
    const total = homeWinProb + drawProb + awayWinProb;
    homeWinProb = homeWinProb / total;
    drawProb = drawProb / total;
    awayWinProb = awayWinProb / total;

    // Calculate over/under probabilities
    const over15Prob = PredictionEngine.calculateOverProbability(clampedLambdaHome, clampedLambdaAway, 1);
    const over25Prob = PredictionEngine.calculateOverProbability(clampedLambdaHome, clampedLambdaAway, 2);
    const over35Prob = PredictionEngine.calculateOverProbability(clampedLambdaHome, clampedLambdaAway, 3);

    // BTTS probability
    const bttsProb = PredictionEngine.calculateBTTSProbability(clampedLambdaHome, clampedLambdaAway);

    // Most likely score
    const scoreMatrix = PredictionEngine.calculateScoreMatrix(clampedLambdaHome, clampedLambdaAway);
    const mostLikelyScore = scoreMatrix[0]?.score || '1-1';

    // Detect value bets
    const valueEdges = PredictionEngine.detectValueBets(
      { home: homeWinProb, draw: drawProb, away: awayWinProb },
      match.odds
    );

    // Calculate confidence boost based on data quality
    let confidenceBoost = 0;
    if (homeStanding) confidenceBoost += 10;
    if (awayStanding) confidenceBoost += 10;
    if (homeStats.form.length >= 5) confidenceBoost += 5;
    if (awayStats.form.length >= 5) confidenceBoost += 5;
    if (valueEdges.some(e => e.isValue)) confidenceBoost += 5;

    // Generate analysis text
    const bestValue = valueEdges.find(e => e.isValue);
    const analysis = PredictionEngine.generateAnalysisText(
      homeStats, awayStats, homeForm, awayForm,
      clampedLambdaHome, clampedLambdaAway, bestValue
    );

    // NEW: Generate "Why This Pick" reasons
    const whyThisPick: WhyPickReason[] = [];

    // Form factor
    if (homeForm > awayForm + 15) {
      whyThisPick.push({
        factor: 'Forma Casa',
        impact: 'positive',
        weight: 8,
        description: `${match.homeTeam} in forma superiore (${homeForm}% vs ${awayForm}%)`
      });
    } else if (awayForm > homeForm + 15) {
      whyThisPick.push({
        factor: 'Forma Ospite',
        impact: 'positive',
        weight: 8,
        description: `${match.awayTeam} in forma superiore (${awayForm}% vs ${homeForm}%)`
      });
    }

    // Position factor
    if (homeStats.position < awayStats.position - 5) {
      whyThisPick.push({
        factor: 'Classifica',
        impact: 'positive',
        weight: 7,
        description: `${match.homeTeam} ${homeStats.position}° vs ${match.awayTeam} ${awayStats.position}°`
      });
    } else if (awayStats.position < homeStats.position - 5) {
      whyThisPick.push({
        factor: 'Classifica',
        impact: 'negative',
        weight: 7,
        description: `Ospite superiore in classifica (${awayStats.position}° vs ${homeStats.position}°)`
      });
    }

    // Home advantage factor
    if (homeStrength > awayStrength + 10) {
      whyThisPick.push({
        factor: 'Fattore Casa',
        impact: 'positive',
        weight: 6,
        description: `Forza casa: ${homeStrength}/100 vs trasferta: ${awayStrength}/100`
      });
    }

    // Expected goals factor
    const totalXG = clampedLambdaHome + clampedLambdaAway;
    if (totalXG > 3) {
      whyThisPick.push({
        factor: 'Alto xG',
        impact: 'positive',
        weight: 6,
        description: `Expected Goals totale: ${totalXG.toFixed(1)} → Over probabile`
      });
    } else if (totalXG < 2) {
      whyThisPick.push({
        factor: 'Basso xG',
        impact: 'neutral',
        weight: 5,
        description: `Expected Goals totale: ${totalXG.toFixed(1)} → Under probabile`
      });
    }

    // Value edge factor
    if (bestValue && bestValue.edge > 5) {
      whyThisPick.push({
        factor: 'Value Bet',
        impact: 'positive',
        weight: 9,
        description: `${bestValue.market} con edge ${bestValue.edge.toFixed(1)}% (${bestValue.rating})`
      });
    }

    // NEW: Calculate confidence level
    let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' = 'MEDIUM';
    if (confidenceBoost >= 30) confidenceLevel = 'VERY_HIGH';
    else if (confidenceBoost >= 20) confidenceLevel = 'HIGH';
    else if (confidenceBoost >= 10) confidenceLevel = 'MEDIUM';
    else confidenceLevel = 'LOW';

    // NEW: Home/Away advantage stats
    const homeAwayAdvantage = {
      homeAttackAtHome: homeStats.homeGoalsScored ?? homeStats.avgGoalsScored * 1.15,
      homeDefenseAtHome: homeStats.homeGoalsConceded ?? homeStats.avgGoalsConceded * 0.9,
      awayAttackAway: awayStats.awayGoalsScored ?? awayStats.avgGoalsScored * 0.85,
      awayDefenseAway: awayStats.awayGoalsConceded ?? awayStats.avgGoalsConceded * 1.1,
    };

    return {
      homeWinProb: Math.round(homeWinProb * 100),
      drawProb: Math.round(drawProb * 100),
      awayWinProb: Math.round(awayWinProb * 100),
      expectedGoalsHome: Math.round(clampedLambdaHome * 100) / 100,
      expectedGoalsAway: Math.round(clampedLambdaAway * 100) / 100,
      over15Prob: Math.round(over15Prob * 100),
      over25Prob: Math.round(over25Prob * 100),
      over35Prob: Math.round(over35Prob * 100),
      bttsProb: Math.round(bttsProb * 100),
      mostLikelyScore,
      valueEdges,
      formScore: { home: homeForm, away: awayForm },
      strengthIndex: { home: homeStrength, away: awayStrength },
      confidenceBoost,
      analysis,
      whyThisPick,
      confidenceLevel,
      homeAwayAdvantage
    };
  },

  /**
   * Generate human-readable analysis text
   */
  generateAnalysisText: (
    homeStats: TeamStats,
    awayStats: TeamStats,
    homeForm: number,
    awayForm: number,
    lambdaHome: number,
    lambdaAway: number,
    bestValue: ValueEdge | undefined
  ): string => {
    const parts: string[] = [];

    // Position comparison
    if (homeStats.position < awayStats.position - 5) {
      parts.push(`${homeStats.name} superiore in classifica (${homeStats.position}° vs ${awayStats.position}°).`);
    } else if (awayStats.position < homeStats.position - 5) {
      parts.push(`${awayStats.name} meglio in classifica (${awayStats.position}° vs ${homeStats.position}°).`);
    }

    // Form analysis
    if (homeForm > awayForm + 20) {
      parts.push(`Casa in forma migliore (${homeForm}% vs ${awayForm}%).`);
    } else if (awayForm > homeForm + 20) {
      parts.push(`Ospite in forma superiore (${awayForm}% vs ${homeForm}%).`);
    }

    // Expected goals
    const totalXG = lambdaHome + lambdaAway;
    if (totalXG > 3) {
      parts.push(`Alto potenziale offensivo (xG totale: ${totalXG.toFixed(1)}). Over probabile.`);
    } else if (totalXG < 2) {
      parts.push(`Partita chiusa prevista (xG totale: ${totalXG.toFixed(1)}). Under favorito.`);
    }

    // Value bet highlight
    if (bestValue) {
      parts.push(`⚡ VALUE DETECTED: ${bestValue.market} con edge +${bestValue.edge}%.`);
    }

    return parts.join(' ') || 'Analisi statistica completata.';
  },

  /**
   * Generate enhanced context for Gemini AI
   */
  generateEnhancedContext: (match: ProcessedMatch, league: 'SA' | 'PL' | 'CL' = 'SA'): string => {
    const prediction = PredictionEngine.generatePrediction(match, league);

    return `
=== ANALISI MATEMATICA AVANZATA (PREDICTION ENGINE v2.0) ===

PROBABILITÀ CALCOLATE (Distribuzione Poisson):
• Vittoria Casa (1): ${prediction.homeWinProb}%
• Pareggio (X): ${prediction.drawProb}%
• Vittoria Ospite (2): ${prediction.awayWinProb}%

GOL ATTESI (Expected Goals):
• ${match.homeTeam}: ${prediction.expectedGoalsHome} xG
• ${match.awayTeam}: ${prediction.expectedGoalsAway} xG
• Totale: ${(prediction.expectedGoalsHome + prediction.expectedGoalsAway).toFixed(2)} xG

MERCATI GOL:
• Over 1.5: ${prediction.over15Prob}%
• Over 2.5: ${prediction.over25Prob}%
• Over 3.5: ${prediction.over35Prob}%
• BTTS (Entrambe segnano): ${prediction.bttsProb}%

RISULTATO PIÙ PROBABILE: ${prediction.mostLikelyScore}

ANALISI FORMA:
• ${match.homeTeam}: Form Score ${prediction.formScore.home}/100
• ${match.awayTeam}: Form Score ${prediction.formScore.away}/100

INDICE DI FORZA:
• ${match.homeTeam}: ${prediction.strengthIndex.home}/100
• ${match.awayTeam}: ${prediction.strengthIndex.away}/100

VALUE BETTING ANALYSIS:
${prediction.valueEdges.map(e =>
      `• ${e.market}: Prob Calcolata ${e.calculatedProb}% vs Implicita ${e.impliedProb}% → Edge: ${e.edge > 0 ? '+' : ''}${e.edge}% ${e.isValue ? '🔥 VALUE!' : ''}`
    ).join('\n')}

NOTA AI: Usa questi dati matematici come BASE per il tuo reasoning. 
Se i calcoli indicano un edge significativo (>5%), enfatizzalo nel consiglio.
Il risultato esatto suggerito matematicamente è: ${prediction.mostLikelyScore}

${prediction.analysis}
`;
  }
};

export default PredictionEngine;

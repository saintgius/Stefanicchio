
export enum RiskLevel {
  LOW = 'BASSO',
  MED = 'MEDIO',
  HIGH = 'ALTO'
}

export interface AnalysisResult {
  prediction: string;
  risk_level: RiskLevel;
  recommended_bet: string;
  reasoning: string;
  confidence_score: number; // 0-100
  
  // New Advanced Fields
  exact_score: string;      // "2-1"
  exact_score_reasoning?: string; // "Inter segna sempre in casa, Milan difesa colabrodo"
  bet_1x2: string;          // "1", "X", or "2"
  risky_bet: string;        // "Combo 1 + Over 2.5"
  risky_reasoning: string;
  
  // Stefanicchio's Arsenal (Multiple Picks)
  prediction_multigol: string;   // "Multigol 2-4"
  prediction_over_under: string; // "Over 2.5"
  prediction_goalscorer: string; // "Lautaro Martinez"
  prediction_combo: string;      // "1X + Over 1.5"
  
  // Deep Analysis
  tactical_insight: string; // Long text (>100 words)
  key_duels: string;        // "Lautaro vs Tomori"
  
  // Stefanicchio's Exclusive Upgrades
  manager_duel: string;     // "Inzaghi (3-5-2) vs Conte (3-4-3)"
  stadium_atmosphere: string; // "San Siro sarà una bolgia, fattore casa decisivo"
  
  // Tactical Formations (AI Predicted)
  predicted_formation_home: string; // "3-5-2"
  predicted_formation_away: string; // "4-2-3-1"

  // New Features (Turnover & Referee)
  turnover_alert?: string; // "ATTENZIONE: Giocano le riserve (Mancano Lautaro, Barella)"
  referee_analysis?: string; // "Orsato: Media 4.5 gialli, severo sui falli tattici."

  // Advanced Metrics
  best_value_market: string; 
  market_reasoning: string;
  max_drawdown: number;
  cynical_take?: string;
  
  // Team News & Hierarchies
  unavailable_players?: string[]; // List of injured/suspended players
  key_players_analysis?: string;  // Analysis of form/key players
  
  timestamp: number;

  // USER FEEDBACK / LEARNING MEMORY
  result?: 'WIN' | 'LOSS' | 'VOID';
  final_score?: string;     // "2-1" settato dall'utente
  final_scorers?: string;   // "Lautaro, Thuram" settato dall'utente
  user_feedback_timestamp?: number;
}

export interface OracleEvent {
  minute: number;
  type: 'KICKOFF' | 'GOAL' | 'CARD' | 'VAR' | 'SUB' | 'FULLTIME' | 'CHANCE';
  team?: string;
  description: string;
}

export interface WeatherData {
  temp: number;
  condition: 'SUN' | 'RAIN' | 'CLOUDY' | 'SNOW' | 'WIND';
  wind_speed: number;
  precip_prob: number;
}

export interface OddsData {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: {
        name: string;
        price: number;
      }[];
    }[];
  }[];
}

export interface ProcessedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  // Now stores the BEST odds found across all bookmakers
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  // Stores the name of the bookmaker offering the best price
  providers: {
    home: string;
    draw: string;
    away: string;
  };
}

export interface BetSelection {
  id: string;
  match: string;     // e.g. "Milan - Inter"
  selection: string; // e.g. "Over 2.5"
  odds: number;
}

export interface BetRecord {
  id: number;
  type: 'SINGLE' | 'MULTIPLE';
  selections: BetSelection[];
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  result: 'WIN' | 'LOSS' | 'PENDING';
  profit: number;
  date: string;
}

export interface UserStats {
  totalWagered: number;
  netProfit: number;
  bets: BetRecord[];
}

// --- FOOTBALL DATA ORG TYPES ---

export interface LeagueStanding {
  position: number;
  team: {
    id: number;
    name: string;
    tla: string; // Sigla (es. MIL)
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string; // es. "W,W,D,L,W"
  league?: 'SA' | 'CL' | 'PL'; // ADDED TAG
}

export interface TopScorer {
  player: {
    id: number;
    name: string;
  };
  team: {
    id: number;
    name: string;
  };
  goals: number;
  assists: number | null;
  penalties: number | null;
  league?: 'SA' | 'CL' | 'PL'; // ADDED TAG
}

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string; tla: string };
  awayTeam: { name: string; tla: string };
  score: {
    fullTime: { home: number; away: number };
  };
}

export interface HistoricalMatch {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: {
    name: string;
    score: string;
  }[] | null;
  last_update: string | null;
}

export interface Player {
  id: number;
  name: string;
  position: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface TeamSquad {
  id: number;
  name: string;
  tla: string;
  crest: string;
  squad: Player[];
  coach?: {
      id: number;
      name: string;
      nationality?: string;
  };
}

export interface ArbitrageOpportunity {
    match: string;
    home: { price: number, bookie: string };
    draw: { price: number, bookie: string };
    away: { price: number, bookie: string };
    margin: number; // e.g., 98.5 (Surebet) or 105.2 (Normal)
    profitPercentage: number; // e.g. 1.5%
}

export const BET_CATEGORIES = ['1X2', 'Under/Over', 'Goal/NoGoal', 'Angoli', 'Cartellini', 'Marcatori', 'Combo', 'Multipla'];

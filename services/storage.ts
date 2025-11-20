
import { BetRecord, UserStats, LeagueStanding, FootballDataMatch, TopScorer, TeamSquad } from '../types';
import { NewsArticle } from './news';

const KEYS = {
  ODDS_API: 'rz_odds_api_key',
  GEMINI_API: 'rz_gemini_api_key',
  FOOTBALL_KEY: 'rz_football_api_key',
  NEWS_KEY: 'rz_news_api_key',
  BETS: 'rz_user_bets_v2',
  FAV_TEAM: 'rz_favorite_team',
  STANDINGS: 'rz_standings',
  SEASON_MATCHES: 'rz_season_matches',
  SCORERS: 'rz_scorers',
  SQUADS: 'rz_squads', // NEW KEY
  LAST_FOOTBALL_SYNC: 'rz_last_football_sync',
  LAST_BACKUP_DATE: 'rz_last_backup_date',
  BANKROLL: 'rz_bankroll',
  OPENING_ODDS: 'rz_opening_odds',
  CACHED_NEWS: 'rz_cached_news'
};

// Advanced Normalization
const normalizeTeamName = (name: string): string => {
  if (!name) return '';
  let n = name.toLowerCase();
  
  // Mappature specifiche note per Serie A
  const mappings: {[key: string]: string} = {
    'inter': 'inter',
    'internazionale': 'inter',
    'fc internazionale milano': 'inter',
    'milan': 'milan',
    'ac milan': 'milan',
    'juventus': 'juventus',
    'juve': 'juventus',
    'juventus fc': 'juventus',
    'roma': 'roma',
    'as roma': 'roma',
    'lazio': 'lazio',
    'ss lazio': 'lazio',
    'napoli': 'napoli',
    'ssc napoli': 'napoli',
    'fiorentina': 'fiorentina',
    'acffiorentina': 'fiorentina',
    'atalanta': 'atalanta',
    'atalanta bc': 'atalanta',
    'bologna': 'bologna',
    'bologna fc': 'bologna',
    'torino': 'torino',
    'torino fc': 'torino',
    'monza': 'monza',
    'ac monza': 'monza',
    'lecce': 'lecce',
    'us lecce': 'lecce',
    'verona': 'verona',
    'hellas verona': 'verona',
    'hellas verona fc': 'verona',
    'cagliari': 'cagliari',
    'cagliari calcio': 'cagliari',
    'empoli': 'empoli',
    'empoli fc': 'empoli',
    'salernitana': 'salernitana',
    'us salernitana': 'salernitana',
    'udinese': 'udinese',
    'udinese calcio': 'udinese',
    'sassuolo': 'sassuolo',
    'us sassuolo': 'sassuolo',
    'genoa': 'genoa',
    'genoa cfc': 'genoa',
    'frosinone': 'frosinone',
    'frosinone calcio': 'frosinone',
    'parma': 'parma',
    'parma calcio 1913': 'parma',
    'como': 'como',
    'como 1907': 'como',
    'venezia': 'venezia',
    'venezia fc': 'venezia'
  };

  // First check direct mapping
  if (mappings[n]) return mappings[n];
  
  // Generic cleanup
  n = n.replace(/fc|ac|as|ssc|calcio|football club|sportiva|u\.s\.|c\.f\.|1907|1913/g, '')
       .replace(/\s+/g, '')
       .replace(/[^a-z]/g, '')
       .trim();

  return n;
};

export const StorageService = {
  saveKeys: (oddsKey: string, geminiKey: string, footballKey: string, newsKey?: string) => {
    if (oddsKey !== undefined) localStorage.setItem(KEYS.ODDS_API, oddsKey);
    if (geminiKey !== undefined) localStorage.setItem(KEYS.GEMINI_API, geminiKey);
    if (footballKey !== undefined) localStorage.setItem(KEYS.FOOTBALL_KEY, footballKey);
    if (newsKey !== undefined) localStorage.setItem(KEYS.NEWS_KEY, newsKey);
  },

  getKeys: () => {
    return {
      oddsKey: localStorage.getItem(KEYS.ODDS_API),
      geminiKey: localStorage.getItem(KEYS.GEMINI_API),
      footballKey: localStorage.getItem(KEYS.FOOTBALL_KEY),
      newsKey: localStorage.getItem(KEYS.NEWS_KEY),
    };
  },

  saveFavoriteTeam: (team: string) => {
    localStorage.setItem(KEYS.FAV_TEAM, team);
  },

  getFavoriteTeam: () => {
    return localStorage.getItem(KEYS.FAV_TEAM) || '';
  },
  
  getLastBackupDate: () => {
    return localStorage.getItem(KEYS.LAST_BACKUP_DATE);
  },

  // --- BANKROLL MANAGEMENT ---
  saveBankrollSettings: (amount: number, kellyStrategy: 'aggressive' | 'moderate' | 'conservative') => {
    localStorage.setItem(KEYS.BANKROLL, JSON.stringify({ amount, strategy: kellyStrategy }));
  },

  getBankrollSettings: () => {
    const data = localStorage.getItem(KEYS.BANKROLL);
    return data ? JSON.parse(data) : { amount: 1000, strategy: 'conservative' };
  },

  // --- NEWS CACHING ---
  saveNews: (news: NewsArticle[]) => {
      localStorage.setItem(KEYS.CACHED_NEWS, JSON.stringify(news));
  },

  getNews: (): NewsArticle[] => {
      const data = localStorage.getItem(KEYS.CACHED_NEWS);
      return data ? JSON.parse(data) : [];
  },

  // --- DROPPING ODDS TRACKING ---
  trackOpeningOdds: (matches: { id: string, odds: { home: number, draw: number, away: number } }[]) => {
    const storedData = localStorage.getItem(KEYS.OPENING_ODDS);
    const openingOdds = storedData ? JSON.parse(storedData) : {};
    let changed = false;

    matches.forEach(match => {
      if (!openingOdds[match.id]) {
        openingOdds[match.id] = match.odds;
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(KEYS.OPENING_ODDS, JSON.stringify(openingOdds));
    }
    return openingOdds;
  },

  getOpeningOdds: (matchId: string) => {
    const storedData = localStorage.getItem(KEYS.OPENING_ODDS);
    const openingOdds = storedData ? JSON.parse(storedData) : {};
    return openingOdds[matchId] || null;
  },

  // --- FOOTBALL DATA MANAGEMENT ---
  saveFootballData: (standings: LeagueStanding[], matches: FootballDataMatch[], scorers: TopScorer[], squads?: TeamSquad[]) => {
    localStorage.setItem(KEYS.STANDINGS, JSON.stringify(standings));
    localStorage.setItem(KEYS.SEASON_MATCHES, JSON.stringify(matches));
    localStorage.setItem(KEYS.SCORERS, JSON.stringify(scorers));
    if (squads) localStorage.setItem(KEYS.SQUADS, JSON.stringify(squads));
    localStorage.setItem(KEYS.LAST_FOOTBALL_SYNC, Date.now().toString());
  },

  getFootballData: () => {
    const standings = localStorage.getItem(KEYS.STANDINGS);
    const matches = localStorage.getItem(KEYS.SEASON_MATCHES);
    const scorers = localStorage.getItem(KEYS.SCORERS);
    const squads = localStorage.getItem(KEYS.SQUADS);
    const lastSync = localStorage.getItem(KEYS.LAST_FOOTBALL_SYNC);
    return {
      standings: standings ? JSON.parse(standings) : [],
      matches: matches ? JSON.parse(matches) : [],
      scorers: scorers ? JSON.parse(scorers) : [],
      squads: squads ? JSON.parse(squads) : [],
      lastSync: lastSync ? parseInt(lastSync) : 0
    };
  },

  getStandings: (): LeagueStanding[] => {
    const data = localStorage.getItem(KEYS.STANDINGS);
    return data ? JSON.parse(data) : [];
  },
  
  getSquads: (): TeamSquad[] => {
      const data = localStorage.getItem(KEYS.SQUADS);
      return data ? JSON.parse(data) : [];
  },

  // --- HELPERS FOR DETAILED CONTEXT ---
  getDetailedLastMatches: (teamName: string, limit: number = 5): string => {
      const matches: FootballDataMatch[] = localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [];
      if (matches.length === 0) return "Dati storico partite non presenti (Eseguire Sync).";

      const normTeam = normalizeTeamName(teamName);
      
      // Filter matches for this team
      const teamMatches = matches.filter(m => {
          const h = normalizeTeamName(m.homeTeam.name);
          const a = normalizeTeamName(m.awayTeam.name);
          return h === normTeam || a === normTeam || h.includes(normTeam) || a.includes(normTeam);
      });

      // Sort descending by date
      teamMatches.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

      if (teamMatches.length === 0) return "Nessuna partita recente trovata.";

      return teamMatches.slice(0, limit).map(m => {
          const isHome = normalizeTeamName(m.homeTeam.name).includes(normTeam) || normalizeTeamName(m.homeTeam.name) === normTeam;
          const opponent = isHome ? m.awayTeam.name : m.homeTeam.name;
          const score = m.score.fullTime.home !== null ? `${m.score.fullTime.home}-${m.score.fullTime.away}` : 'N/D';
          const date = m.utcDate.split('T')[0];
          const outcome = isHome 
             ? (m.score.fullTime.home > m.score.fullTime.away ? 'W' : m.score.fullTime.home === m.score.fullTime.away ? 'D' : 'L')
             : (m.score.fullTime.away > m.score.fullTime.home ? 'W' : m.score.fullTime.away === m.score.fullTime.home ? 'D' : 'L');
          
          return `- [${date}] vs ${opponent} (${outcome}) Risultato: ${score}`;
      }).join('\n');
  },

  // --- CONTEXT GENERATION FOR GEMINI ---
  getMatchContext: (homeTeamName: string, awayTeamName: string): string => {
    const standings = StorageService.getStandings();
    const matches: FootballDataMatch[] = localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [];
    const scorers: TopScorer[] = localStorage.getItem(KEYS.SCORERS) ? JSON.parse(localStorage.getItem(KEYS.SCORERS) || '[]') : [];
    const squads: TeamSquad[] = localStorage.getItem(KEYS.SQUADS) ? JSON.parse(localStorage.getItem(KEYS.SQUADS) || '[]') : [];
    const news = StorageService.getNews();

    const normHome = normalizeTeamName(homeTeamName);
    const normAway = normalizeTeamName(awayTeamName);

    let context = `DATA ODIERNA: ${new Date().toISOString().split('T')[0]}\n\n`;

    // 1. Classifica Logic
    const findTeam = (normName: string) => standings.find(s => {
        const sNorm = normalizeTeamName(s.team.name);
        return sNorm === normName || sNorm.includes(normName) || normName.includes(sNorm);
    });

    const homeStat = findTeam(normHome);
    const awayStat = findTeam(normAway);

    if (homeStat) {
      context += `SQUADRA CASA: ${homeTeamName} (ufficiale: ${homeStat.team.name})\n`;
      context += `Classifica: ${homeStat.position}° posto, ${homeStat.points} punti.\n`;
      context += `Gol: ${homeStat.goalsFor} Fatti, ${homeStat.goalsAgainst} Subiti.\n`;
      context += `ULTIME 5 PARTITE DETTAGLIATE (Fondamentale per analisi forma):\n${StorageService.getDetailedLastMatches(homeTeamName)}\n\n`;
    } else {
      context += `SQUADRA CASA: ${homeTeamName} - Dati classifica non trovati (Verificare Sync).\n\n`;
    }

    if (awayStat) {
      context += `SQUADRA OSPITE: ${awayTeamName} (ufficiale: ${awayStat.team.name})\n`;
      context += `Classifica: ${awayStat.position}° posto, ${awayStat.points} punti.\n`;
      context += `Gol: ${awayStat.goalsFor} Fatti, ${awayStat.goalsAgainst} Subiti.\n`;
      context += `ULTIME 5 PARTITE DETTAGLIATE (Fondamentale per analisi forma):\n${StorageService.getDetailedLastMatches(awayTeamName)}\n\n`;
    } else {
      context += `SQUADRA OSPITE: ${awayTeamName} - Dati classifica non trovati (Verificare Sync).\n\n`;
    }

    // 2. SQUADS / ROSE & SCORERS INTEGRATION
    const findSquad = (normName: string) => squads.find(t => {
        const sNorm = normalizeTeamName(t.name);
        return sNorm === normName || sNorm.includes(normName) || normName.includes(sNorm);
    });

    // Helper to get exact goals for a player from the scorers list
    const getPlayerGoals = (playerName: string, teamName: string) => {
        const normP = normalizeTeamName(playerName);
        const normT = normalizeTeamName(teamName);
        
        // Find scorer entry that matches player AND team (to avoid duplicates or wrong attributions)
        const entry = scorers.find(s => {
            const sP = normalizeTeamName(s.player.name);
            const sT = normalizeTeamName(s.team.name);
            
            const teamMatch = sT.includes(normT) || normT.includes(sT);
            if (!teamMatch) return false;
            
            return sP.includes(normP) || normP.includes(sP);
        });
        return entry ? entry.goals : 0;
    };

    const homeSquad = findSquad(normHome);
    const awaySquad = findSquad(normAway);

    if (homeSquad && homeSquad.squad) {
        const players = homeSquad.squad.slice(0, 25).map(p => {
             const goals = getPlayerGoals(p.name, homeTeamName);
             const scorerTag = goals > 0 ? ` [${goals} GOL]` : '';
             return `${p.name} (${p.position})${scorerTag}`;
        }).join(', ');
        context += `ROSA COMPLETA ${homeTeamName} (con gol segnati):\n${players}\nAllenatore: ${homeSquad.coach?.name || 'N/D'}\n\n`;
    }

    if (awaySquad && awaySquad.squad) {
        const players = awaySquad.squad.slice(0, 25).map(p => {
             const goals = getPlayerGoals(p.name, awayTeamName);
             const scorerTag = goals > 0 ? ` [${goals} GOL]` : '';
             return `${p.name} (${p.position})${scorerTag}`;
        }).join(', ');
        context += `ROSA COMPLETA ${awayTeamName} (con gol segnati):\n${players}\nAllenatore: ${awaySquad.coach?.name || 'N/D'}\n\n`;
    }

    // 3. SPECIFIC TEAM TOP SCORERS LIST
    const getTeamTopScorers = (teamName: string) => {
        const normT = normalizeTeamName(teamName);
        return scorers.filter(s => {
            const sT = normalizeTeamName(s.team.name);
            return sT.includes(normT) || normT.includes(sT);
        }).sort((a,b) => b.goals - a.goals).slice(0, 3);
    };

    const homeTopScorers = getTeamTopScorers(homeTeamName);
    const awayTopScorers = getTeamTopScorers(awayTeamName);

    if (homeTopScorers.length > 0) {
        context += `TOP MARCATORI ${homeTeamName}:\n`;
        homeTopScorers.forEach(s => context += `- ${s.player.name}: ${s.goals} Gol\n`);
        context += `\n`;
    }
    
    if (awayTopScorers.length > 0) {
        context += `TOP MARCATORI ${awayTeamName}:\n`;
        awayTopScorers.forEach(s => context += `- ${s.player.name}: ${s.goals} Gol\n`);
        context += `\n`;
    }


    // 4. H2H Stagionali
    const h2h = matches.filter(m => {
      const mHome = normalizeTeamName(m.homeTeam.name);
      const mAway = normalizeTeamName(m.awayTeam.name);
      return ((mHome.includes(normHome) || normHome.includes(mHome)) && (mAway.includes(normAway) || normAway.includes(mAway))) ||
             ((mHome.includes(normAway) || normAway.includes(mHome)) && (mAway.includes(normHome) || normHome.includes(mAway)));
    });

    if (h2h.length > 0) {
      context += `PRECEDENTI DIRETTI STAGIONE CORRENTE:\n`;
      h2h.forEach(m => {
        context += `${m.utcDate.split('T')[0]}: ${m.homeTeam.name} ${m.score.fullTime.home} - ${m.score.fullTime.away} ${m.awayTeam.name}\n`;
      });
    } else {
      context += `Nessun precedente diretto registrato in questa stagione.\n`;
    }
    
    // 5. Medical Report & Tactical News (Mining)
    const medKeywords = ['infortunio', 'squalifica', 'out', 'indisponibile', 'non convocato', 'salta', 'stop', 'lesione', 'problema muscolare'];
    
    const filterNews = (normTeam: string) => news.filter(n => {
         const txt = (n.title + n.description).toLowerCase();
         // Basic check if news talks about the team
         if (!txt.includes(normTeam)) return false;
         // Check for medical keywords
         return medKeywords.some(k => txt.includes(k));
    });

    const homeNews = filterNews(normHome);
    const awayNews = filterNews(normAway);

    if (homeNews.length > 0 || awayNews.length > 0) {
        context += `\n=== REPORT MEDICO & NEWS TATTICHE ===\n`;
        if(homeNews.length > 0) {
            context += `\nNOTIZIE ${homeTeamName}:\n`;
            homeNews.forEach(n => context += `- ${n.title} (${n.publishedAt.split('T')[0]})\n`);
        }
        if(awayNews.length > 0) {
            context += `\nNOTIZIE ${awayTeamName}:\n`;
            awayNews.forEach(n => context += `- ${n.title} (${n.publishedAt.split('T')[0]})\n`);
        }
        context += `\n=====================================\n`;
    }

    return context;
  },

  getH2HMatches: (homeTeamName: string, awayTeamName: string): FootballDataMatch[] => {
    const matches: FootballDataMatch[] = localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [];
    const normHome = normalizeTeamName(homeTeamName);
    const normAway = normalizeTeamName(awayTeamName);

    return matches.filter(m => {
       const mHome = normalizeTeamName(m.homeTeam.name);
       const mAway = normalizeTeamName(m.awayTeam.name);
       return ((mHome.includes(normHome) || normHome.includes(mHome)) && (mAway.includes(normAway) || normAway.includes(mAway))) ||
              ((mHome.includes(normAway) || normAway.includes(mHome)) && (mAway.includes(normHome) || normHome.includes(mAway)));
    }).sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  },

  getTeamRank: (teamName: string): number | null => {
    const standings = StorageService.getStandings();
    const normName = normalizeTeamName(teamName);
    const team = standings.find(s => {
        const sName = normalizeTeamName(s.team.name);
        return sName === normName || sName.includes(normName) || normName.includes(sName);
    });
    return team ? team.position : null;
  },
  
  getFormArray: (teamName: string): string[] => {
    const standings = StorageService.getStandings();
    const normName = normalizeTeamName(teamName);
    const team = standings.find(s => {
        const sName = normalizeTeamName(s.team.name);
        return sName === normName || sName.includes(normName) || normName.includes(sName);
    });
    
    if (team && team.form) {
        return team.form.split(',').map(c => c.trim());
    }
    return ['-','-','-','-','-'];
  },

  // --- ANALYSIS CACHE ---
  getAnalysis: (matchId: string) => {
    const data = localStorage.getItem(`analysis_${matchId}`);
    return data ? JSON.parse(data) : null;
  },

  saveAnalysis: (matchId: string, analysis: any) => {
    localStorage.setItem(`analysis_${matchId}`, JSON.stringify({
      ...analysis,
      timestamp: Date.now()
    }));
  },

  deleteAnalysis: (matchId: string) => {
    localStorage.removeItem(`analysis_${matchId}`);
  },

  // --- BETS MANAGEMENT ---
  saveBet: (bet: Omit<BetRecord, 'id' | 'profit' | 'result'>) => {
    const existingData = localStorage.getItem(KEYS.BETS);
    const stats: UserStats = existingData ? JSON.parse(existingData) : { totalWagered: 0, netProfit: 0, bets: [] };
    
    const newBet: BetRecord = {
      ...bet,
      id: Date.now(),
      result: 'PENDING',
      profit: 0
    };

    stats.bets.unshift(newBet);
    stats.totalWagered += Number(bet.stake);
    
    localStorage.setItem(KEYS.BETS, JSON.stringify(stats));
    return stats;
  },

  getStats: (): UserStats => {
    const data = localStorage.getItem(KEYS.BETS);
    if (!data) return { totalWagered: 0, netProfit: 0, bets: [] };
    try {
      return JSON.parse(data);
    } catch (e) {
      return { totalWagered: 0, netProfit: 0, bets: [] };
    }
  },
  
  updateBetStatus: (betId: number, result: 'WIN' | 'LOSS') => {
    const existingData = localStorage.getItem(KEYS.BETS);
    if (!existingData) return;
    
    const stats: UserStats = JSON.parse(existingData);
    const betIndex = stats.bets.findIndex(b => b.id === betId);
    
    if (betIndex !== -1 && stats.bets[betIndex].result === 'PENDING') {
      const bet = stats.bets[betIndex];
      bet.result = result;
      
      if (result === 'WIN') {
        bet.profit = (bet.stake * bet.totalOdds) - bet.stake;
        stats.netProfit += bet.profit;
      } else {
        bet.profit = -bet.stake;
        stats.netProfit -= bet.stake;
      }
      
      localStorage.setItem(KEYS.BETS, JSON.stringify(stats));
    }
    return stats;
  },

  deleteBet: (betId: number) => {
    const existingData = localStorage.getItem(KEYS.BETS);
    if (!existingData) return;
    
    const stats: UserStats = JSON.parse(existingData);
    const updatedBets = stats.bets.filter(b => b.id !== betId);
    
    // Recalculate stats from scratch to avoid drift
    let newTotalWagered = 0;
    let newNetProfit = 0;
    
    updatedBets.forEach(b => {
        newTotalWagered += b.stake;
        if (b.result === 'WIN') newNetProfit += b.profit;
        if (b.result === 'LOSS') newNetProfit -= b.stake;
    });

    const newStats = {
        ...stats,
        bets: updatedBets,
        totalWagered: newTotalWagered,
        netProfit: newNetProfit
    };
    
    localStorage.setItem(KEYS.BETS, JSON.stringify(newStats));
    return newStats;
  },

  // --- BACKUP SYSTEM ---
  createBackup: () => {
    const now = new Date().toISOString();
    localStorage.setItem(KEYS.LAST_BACKUP_DATE, now);

    const backupData: any = {
      meta: {
        version: '2.8',
        timestamp: now,
        app: 'RedZoneBet'
      },
      config: {
        oddsKey: localStorage.getItem(KEYS.ODDS_API),
        geminiKey: localStorage.getItem(KEYS.GEMINI_API),
        footballKey: localStorage.getItem(KEYS.FOOTBALL_KEY),
        newsKey: localStorage.getItem(KEYS.NEWS_KEY),
        favTeam: localStorage.getItem(KEYS.FAV_TEAM),
        bankroll: localStorage.getItem(KEYS.BANKROLL)
      },
      userData: {
        bets: localStorage.getItem(KEYS.BETS) ? JSON.parse(localStorage.getItem(KEYS.BETS) || '{}') : null,
      },
      footballData: {
        standings: localStorage.getItem(KEYS.STANDINGS) ? JSON.parse(localStorage.getItem(KEYS.STANDINGS) || '[]') : [],
        matches: localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [],
        scorers: localStorage.getItem(KEYS.SCORERS) ? JSON.parse(localStorage.getItem(KEYS.SCORERS) || '[]') : [],
        squads: localStorage.getItem(KEYS.SQUADS) ? JSON.parse(localStorage.getItem(KEYS.SQUADS) || '[]') : [],
        lastSync: localStorage.getItem(KEYS.LAST_FOOTBALL_SYNC),
        openingOdds: localStorage.getItem(KEYS.OPENING_ODDS) ? JSON.parse(localStorage.getItem(KEYS.OPENING_ODDS) || '{}') : {}
      },
      newsCache: localStorage.getItem(KEYS.CACHED_NEWS) ? JSON.parse(localStorage.getItem(KEYS.CACHED_NEWS) || '[]') : [],
      cache: {}
    };

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('analysis_')) {
        try {
          backupData.cache[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch (e) { /* ignore */ }
      }
    });

    return JSON.stringify(backupData, null, 2);
  },

  restoreBackup: (jsonString: string): boolean => {
    try {
      const backup = JSON.parse(jsonString);
      
      if (backup.meta?.app !== 'RedZoneBet') throw new Error("File non valido");

      // CRITICAL: Clear existing data first to avoid conflicts
      localStorage.clear();

      if (backup.config.oddsKey) localStorage.setItem(KEYS.ODDS_API, backup.config.oddsKey);
      if (backup.config.geminiKey) localStorage.setItem(KEYS.GEMINI_API, backup.config.geminiKey);
      if (backup.config.footballKey) localStorage.setItem(KEYS.FOOTBALL_KEY, backup.config.footballKey);
      if (backup.config.newsKey) localStorage.setItem(KEYS.NEWS_KEY, backup.config.newsKey);
      if (backup.config.favTeam) localStorage.setItem(KEYS.FAV_TEAM, backup.config.favTeam);
      if (backup.config.bankroll) localStorage.setItem(KEYS.BANKROLL, backup.config.bankroll);

      if (backup.userData.bets) {
        localStorage.setItem(KEYS.BETS, JSON.stringify(backup.userData.bets));
      }

      if (backup.footballData) {
        if (backup.footballData.standings) localStorage.setItem(KEYS.STANDINGS, JSON.stringify(backup.footballData.standings));
        if (backup.footballData.matches) localStorage.setItem(KEYS.SEASON_MATCHES, JSON.stringify(backup.footballData.matches));
        if (backup.footballData.scorers) localStorage.setItem(KEYS.SCORERS, JSON.stringify(backup.footballData.scorers));
        if (backup.footballData.squads) localStorage.setItem(KEYS.SQUADS, JSON.stringify(backup.footballData.squads));
        if (backup.footballData.lastSync) localStorage.setItem(KEYS.LAST_FOOTBALL_SYNC, backup.footballData.lastSync);
        if (backup.footballData.openingOdds) localStorage.setItem(KEYS.OPENING_ODDS, JSON.stringify(backup.footballData.openingOdds));
      }
      
      if (backup.newsCache) {
          localStorage.setItem(KEYS.CACHED_NEWS, JSON.stringify(backup.newsCache));
      }

      if (backup.cache) {
        Object.keys(backup.cache).forEach(key => {
          localStorage.setItem(key, JSON.stringify(backup.cache[key]));
        });
      }
      
      // Restore last backup date (or set to now)
      localStorage.setItem(KEYS.LAST_BACKUP_DATE, new Date().toISOString());

      return true;
    } catch (e) {
      console.error("Backup restore failed:", e);
      return false;
    }
  }
};

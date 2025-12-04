
import { BetRecord, UserStats, LeagueStanding, FootballDataMatch, TopScorer, TeamSquad, ProcessedMatch, AnalysisResult } from '../types';
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
  SQUADS: 'rz_squads',
  LAST_FOOTBALL_SYNC: 'rz_last_football_sync',
  LAST_BACKUP_DATE: 'rz_last_backup_date',
  BANKROLL: 'rz_bankroll',
  OPENING_ODDS: 'rz_opening_odds',
  CACHED_NEWS: 'rz_cached_news',
  UPCOMING_MATCHES: 'rz_upcoming_matches' 
};

// Advanced Normalization
const normalizeTeamName = (name: string): string => {
  if (!name) return '';
  let n = name.toLowerCase();
  
  // Mappature specifiche note
  const mappings: {[key: string]: string} = {
    // SERIE A
    'inter': 'inter',
    'internazionale': 'inter',
    'inter milan': 'inter',
    'fc internazionale milano': 'inter',
    'milan': 'milan',
    'ac milan': 'milan',
    'juventus': 'juventus',
    'juve': 'juventus',
    'juventus fc': 'juventus',
    'juventus turin': 'juventus',
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
    'udinese': 'udinese',
    'udinese calcio': 'udinese',
    'torino': 'torino',
    'torino fc': 'torino',
    'monza': 'monza',
    'ac monza': 'monza',
    'lecce': 'lecce',
    'us lecce': 'lecce',
    'verona': 'verona',
    'hellas verona': 'verona',
    'cagliari': 'cagliari',
    'empoli': 'empoli',
    'salernitana': 'salernitana',
    'sassuolo': 'sassuolo',
    'genoa': 'genoa',
    'frosinone': 'frosinone',
    'parma': 'parma',
    'como': 'como',
    'venezia': 'venezia',

    // PREMIER LEAGUE
    'manchester city': 'manchestercity',
    'man city': 'manchestercity',
    'manchester united': 'manchesterunited',
    'man utd': 'manchesterunited',
    'liverpool': 'liverpool',
    'liverpool fc': 'liverpool',
    'arsenal': 'arsenal',
    'arsenal fc': 'arsenal',
    'tottenham hotspur': 'tottenham',
    'tottenham': 'tottenham',
    'spurs': 'tottenham',
    'aston villa': 'astonvilla',
    'chelsea': 'chelsea',
    'chelsea fc': 'chelsea',
    'newcastle united': 'newcastle',
    'newcastle': 'newcastle',
    'west ham united': 'westham',
    'west ham': 'westham',
    'brighton & hove albion': 'brighton',
    'brighton': 'brighton',
    'wolverhampton wanderers': 'wolves',
    'wolves': 'wolves',
    'nottingham forest': 'nottingham',
    'nottingham': 'nottingham',
    'fulham': 'fulham',
    'fulham fc': 'fulham',
    'crystal palace': 'crystalpalace',
    'brentford': 'brentford',
    'everton': 'everton',
    'everton fc': 'everton',
    'luton town': 'luton',
    'burnley': 'burnley',
    'sheffield united': 'sheffield',
    'leicester city': 'leicester',
    'leicester': 'leicester',
    'ipswich town': 'ipswich',
    'ipswich': 'ipswich',
    'southampton': 'southampton',
    'southampton fc': 'southampton',

    // CHAMPIONS / EUROPE
    'real madrid': 'realmadrid',
    'real madrid cf': 'realmadrid',
    'barcelona': 'barcelona',
    'fc barcelona': 'barcelona',
    'atlético madrid': 'atleticomadrid',
    'atletico madrid': 'atleticomadrid',
    'girona': 'girona',
    'bayern munich': 'bayernmunchen',
    'bayern munchen': 'bayernmunchen',
    'fc bayern munchen': 'bayernmunchen',
    'borussia dortmund': 'borussiadortmund',
    'bvb': 'borussiadortmund',
    'bayer leverkusen': 'bayerleverkusen',
    'bayer 04 leverkusen': 'bayerleverkusen',
    'leipzig': 'rbleipzig',
    'rb leipzig': 'rbleipzig',
    'stuttgart': 'vfbstuttgart',
    'psg': 'parissaintgermain',
    'paris saint-germain': 'parissaintgermain',
    'paris sg': 'parissaintgermain',
    'monaco': 'asmonaco',
    'lille': 'lilleosc',
    'brest': 'stadebrestois29',
    'benfica': 'slbenfica',
    'sporting cp': 'sportingcp',
    'sporting lisbon': 'sportingcp',
    'psv': 'psveindhoven',
    'feyenoord': 'feyenoordrotterdam',
    'celtic': 'celtic',
    'club brugge': 'clubbruggekv',
    'shakhtar donetsk': 'shakhtardonetsk',
    'red star belgrade': 'crvenazvezda',
    'young boys': 'bscyoungboys',
    'salzburg': 'rbsalzburg',
    'sparta prague': 'acspartapraha',
    'sturm graz': 'sksturmgraz',
    'dinamo zagreb': 'gnkdinamozagreb',
    'slovan bratislava': 'skslovanbratislava'
  };

  if (mappings[n]) return mappings[n];
  
  n = n.replace(/fc|ac|as|ssc|calcio|football club|sportiva|u\.s\.|c\.f\.|1907|1913|04|b\.c\.|s\.s\.|g\.n\.k\.|k\.v\.|c\.d\.|s\.l\.|o\.s\.c\.|c\.p\./g, '')
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

  saveBankrollSettings: (amount: number, kellyStrategy: 'aggressive' | 'moderate' | 'conservative') => {
    localStorage.setItem(KEYS.BANKROLL, JSON.stringify({ amount, strategy: kellyStrategy }));
  },

  getBankrollSettings: () => {
    const data = localStorage.getItem(KEYS.BANKROLL);
    return data ? JSON.parse(data) : { amount: 1000, strategy: 'conservative' };
  },

  saveNews: (news: NewsArticle[]) => {
      localStorage.setItem(KEYS.CACHED_NEWS, JSON.stringify(news));
  },

  getNews: (): NewsArticle[] => {
      const data = localStorage.getItem(KEYS.CACHED_NEWS);
      return data ? JSON.parse(data) : [];
  },

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

  saveUpcomingMatches: (matches: ProcessedMatch[]) => {
      const stored = localStorage.getItem(KEYS.UPCOMING_MATCHES);
      let currentPool: ProcessedMatch[] = stored ? JSON.parse(stored) : [];
      
      const now = new Date();
      currentPool = currentPool.filter(m => new Date(m.startTime) > now);

      const newIds = new Set(matches.map(m => m.id));
      const merged = [
          ...currentPool.filter(m => !newIds.has(m.id)),
          ...matches
      ];

      merged.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      localStorage.setItem(KEYS.UPCOMING_MATCHES, JSON.stringify(merged));
  },

  getUpcomingMatches: (): ProcessedMatch[] => {
      const data = localStorage.getItem(KEYS.UPCOMING_MATCHES);
      return data ? JSON.parse(data) : [];
  },

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

  getDetailedLastMatches: (teamName: string, limit: number = 5): string => {
      const matches: FootballDataMatch[] = localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [];
      if (matches.length === 0) return "Dati storico partite non presenti (Eseguire Sync).";

      const normTeam = normalizeTeamName(teamName);
      
      const teamMatches = matches.filter(m => {
          const h = normalizeTeamName(m.homeTeam.name);
          const a = normalizeTeamName(m.awayTeam.name);
          return h === normTeam || a === normTeam || h.includes(normTeam) || a.includes(normTeam);
      });

      teamMatches.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

      if (teamMatches.length === 0) return "Nessuna partita recente trovata (Verificare Competizione).";

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

  getAdvancedForm: (teamName: string, limit: number = 5): {result: 'W'|'D'|'L', score: string, color: string, tooltip: string}[] => {
      const matches: FootballDataMatch[] = localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [];
      if (matches.length === 0) return [];

      const normTeam = normalizeTeamName(teamName);
      
      const teamMatches = matches.filter(m => {
          const h = normalizeTeamName(m.homeTeam.name);
          const a = normalizeTeamName(m.awayTeam.name);
          return h === normTeam || a === normTeam || h.includes(normTeam) || a.includes(normTeam);
      });

      teamMatches.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

      return teamMatches.slice(0, limit).map(m => {
          const isHome = normalizeTeamName(m.homeTeam.name).includes(normTeam) || normalizeTeamName(m.homeTeam.name) === normTeam;
          const scoreHome = m.score.fullTime.home;
          const scoreAway = m.score.fullTime.away;
          const score = `${scoreHome}-${scoreAway}`;
          
          let result: 'W'|'D'|'L' = 'D';
          let color = 'bg-neutral-600'; 
          let tooltip = `Pareggio (${score})`;

          if (isHome) {
              if (scoreHome > scoreAway) {
                  result = 'W';
                  if (scoreHome - scoreAway > 1) {
                      color = 'bg-green-600 border border-green-400 shadow-[0_0_5px_#22c55e]';
                      tooltip = `Vittoria Netta (${score})`;
                  } else {
                      color = 'bg-yellow-500 text-black border border-yellow-300';
                      tooltip = `Vittoria Risicata (${score})`;
                  }
              } else if (scoreHome < scoreAway) {
                  result = 'L';
                  color = 'bg-red-600 border border-red-400';
                  tooltip = `Sconfitta (${score})`;
              } else {
                  if (scoreHome > 1) {
                      color = 'bg-orange-500 text-black border border-orange-300';
                      tooltip = `Pareggio Spettacolo (${score})`;
                  } else {
                      color = 'bg-neutral-600 border border-neutral-500';
                  }
              }
          } else {
              if (scoreAway > scoreHome) {
                  result = 'W';
                  if (scoreAway - scoreHome > 1) {
                      color = 'bg-green-600 border border-green-400 shadow-[0_0_5px_#22c55e]'; 
                      tooltip = `Vittoria Netta (${score})`;
                  } else {
                      color = 'bg-yellow-500 text-black border border-yellow-300';
                      tooltip = `Vittoria Risicata (${score})`;
                  }
              } else if (scoreAway < scoreHome) {
                  result = 'L';
                  color = 'bg-red-600 border border-red-400';
                  tooltip = `Sconfitta (${score})`;
              } else {
                   if (scoreAway > 1) {
                      color = 'bg-orange-500 text-black border border-orange-300';
                      tooltip = `Pareggio Spettacolo (${score})`;
                  } else {
                      color = 'bg-neutral-600 border border-neutral-500';
                  }
              }
          }
          
          return { result, score, color, tooltip };
      }).reverse();
  },

  getMatchContext: (homeTeamName: string, awayTeamName: string): string => {
    const standings = StorageService.getStandings();
    const matches: FootballDataMatch[] = localStorage.getItem(KEYS.SEASON_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.SEASON_MATCHES) || '[]') : [];
    const scorers: TopScorer[] = localStorage.getItem(KEYS.SCORERS) ? JSON.parse(localStorage.getItem(KEYS.SCORERS) || '[]') : [];
    const squads: TeamSquad[] = localStorage.getItem(KEYS.SQUADS) ? JSON.parse(localStorage.getItem(KEYS.SQUADS) || '[]') : [];
    const news = StorageService.getNews();

    const normHome = normalizeTeamName(homeTeamName);
    const normAway = normalizeTeamName(awayTeamName);

    let context = `DATA ODIERNA: ${new Date().toISOString().split('T')[0]}\n\n`;

    const getTeamOfficialScorers = (teamName: string) => {
        const nT = normalizeTeamName(teamName);
        return scorers.filter(s => {
            const sTeam = normalizeTeamName(s.team.name);
            return sTeam === nT || sTeam.includes(nT) || nT.includes(sTeam);
        }).sort((a,b) => b.goals - a.goals);
    };

    const homeRealScorers = getTeamOfficialScorers(homeTeamName);
    const awayRealScorers = getTeamOfficialScorers(awayTeamName);

    const findTeam = (normName: string) => standings.find(s => {
        const sNorm = normalizeTeamName(s.team.name);
        return sNorm === normName || sNorm.includes(normName) || normName.includes(sNorm);
    });

    const homeStat = findTeam(normHome);
    const awayStat = findTeam(normAway);

    if (homeStat) {
      context += `SQUADRA CASA: ${homeTeamName} (Ufficiale: ${homeStat.team.name})\n`;
      context += `Classifica: ${homeStat.position}° posto, ${homeStat.points} punti.\n`;
      context += `Gol: ${homeStat.goalsFor} Fatti, ${homeStat.goalsAgainst} Subiti.\n`;
      context += `ULTIME 5 PARTITE:\n${StorageService.getDetailedLastMatches(homeTeamName)}\n`;
      
      if (homeRealScorers.length > 0) {
          context += `\n*** CANNONIERI UFFICIALI ${homeTeamName} (DA API) ***\n`;
          homeRealScorers.slice(0, 5).forEach(s => {
              context += `- ${s.player.name}: ${s.goals} GOL\n`;
          });
      }
      context += `\n`;
    } else {
      context += `SQUADRA CASA: ${homeTeamName} - Dati classifica non trovati.\n\n`;
    }

    if (awayStat) {
      context += `SQUADRA OSPITE: ${awayTeamName} (Ufficiale: ${awayStat.team.name})\n`;
      context += `Classifica: ${awayStat.position}° posto, ${awayStat.points} punti.\n`;
      context += `Gol: ${awayStat.goalsFor} Fatti, ${awayStat.goalsAgainst} Subiti.\n`;
      context += `ULTIME 5 PARTITE:\n${StorageService.getDetailedLastMatches(awayTeamName)}\n`;

      if (awayRealScorers.length > 0) {
          context += `\n*** CANNONIERI UFFICIALI ${awayTeamName} (DA API) ***\n`;
          awayRealScorers.slice(0, 5).forEach(s => {
              context += `- ${s.player.name}: ${s.goals} GOL\n`;
          });
      }
      context += `\n`;
    } else {
      context += `SQUADRA OSPITE: ${awayTeamName} - Dati classifica non trovati.\n\n`;
    }

    const findSquad = (normName: string) => squads.find(t => {
        const sNorm = normalizeTeamName(t.name);
        return sNorm === normName || sNorm.includes(normName) || normName.includes(sNorm);
    });

    const homeSquad = findSquad(normHome);
    const awaySquad = findSquad(normAway);

    if (homeSquad && homeSquad.squad) {
        context += `ROSA COMPLETA ${homeTeamName} (Lista Giocatori):\n`;
        const players = homeSquad.squad.map(p => {
             const scorerData = homeRealScorers.find(s => normalizeTeamName(s.player.name) === normalizeTeamName(p.name));
             const goalTag = scorerData ? ` [★ ${scorerData.goals} GOL]` : '';
             return `${p.name} (${p.position})${goalTag}`;
        }).join(', ');
        context += `${players}\n\n`;
    }

    if (awaySquad && awaySquad.squad) {
        context += `ROSA COMPLETA ${awayTeamName} (Lista Giocatori):\n`;
        const players = awaySquad.squad.map(p => {
             const scorerData = awayRealScorers.find(s => normalizeTeamName(s.player.name) === normalizeTeamName(p.name));
             const goalTag = scorerData ? ` [★ ${scorerData.goals} GOL]` : '';
             return `${p.name} (${p.position})${goalTag}`;
        }).join(', ');
        context += `${players}\n\n`;
    }

    const h2h = matches.filter(m => {
      const mHome = normalizeTeamName(m.homeTeam.name);
      const mAway = normalizeTeamName(m.awayTeam.name);
      return ((mHome.includes(normHome) || normHome.includes(mHome)) && (mAway.includes(normAway) || normAway.includes(mAway))) ||
             ((mHome.includes(normAway) || normAway.includes(mHome)) && (mAway.includes(normHome) || normHome.includes(mAway)));
    });

    if (h2h.length > 0) {
      context += `PRECEDENTI DIRETTI STAGIONE:\n`;
      h2h.forEach(m => {
        context += `${m.utcDate.split('T')[0]}: ${m.homeTeam.name} ${m.score.fullTime.home} - ${m.score.fullTime.away} ${m.awayTeam.name}\n`;
      });
    }
    
    const medKeywords = ['infortunio', 'squalifica', 'out', 'indisponibile', 'non convocato', 'salta', 'stop', 'lesione', 'turnover', 'panchina', 'riserve'];
    const filterNews = (normTeam: string) => news.filter(n => {
         const txt = (n.title + n.description).toLowerCase();
         if (!txt.includes(normTeam)) return false;
         return medKeywords.some(k => txt.includes(k));
    });

    const homeNews = filterNews(normHome);
    const awayNews = filterNews(normAway);

    if (homeNews.length > 0 || awayNews.length > 0) {
        context += `\n=== NEWS NOTEVOLI (POSSIBILE TURNOVER/ASSENZE) ===\n`;
        if(homeNews.length > 0) homeNews.slice(0,3).forEach(n => context += `- ${n.title}\n`);
        if(awayNews.length > 0) awayNews.slice(0,3).forEach(n => context += `- ${n.title}\n`);
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

  // --- ANALYSIS MANAGEMENT ---

  getAnalysis: (matchId: string) => {
    const data = localStorage.getItem(`analysis_${matchId}`);
    return data ? JSON.parse(data) : null;
  },

  getAllAnalyses: (): { matchId: string, analysis: AnalysisResult }[] => {
      const results: { matchId: string, analysis: AnalysisResult }[] = [];
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith('analysis_')) {
              try {
                  const data = JSON.parse(localStorage.getItem(key) || '{}');
                  results.push({ matchId: key.replace('analysis_', ''), analysis: data });
              } catch (e) {
                  console.error("Failed to parse analysis", key);
              }
          }
      });
      return results.sort((a,b) => b.analysis.timestamp - a.analysis.timestamp);
  },

  saveAnalysis: (matchId: string, analysis: any) => {
    localStorage.setItem(`analysis_${matchId}`, JSON.stringify({
      ...analysis,
      timestamp: Date.now()
    }));
  },

  // NEW: Save Feedback for Archive
  updateAnalysisFeedback: (matchId: string, result: 'WIN' | 'LOSS' | 'VOID', score: string, scorers: string) => {
      const existing = localStorage.getItem(`analysis_${matchId}`);
      if (existing) {
          const data = JSON.parse(existing);
          data.result = result;
          data.final_score = score;
          data.final_scorers = scorers;
          data.user_feedback_timestamp = Date.now();
          localStorage.setItem(`analysis_${matchId}`, JSON.stringify(data));
      }
  },

  // NEW: Generate Learning Context for AI
  getLearningContext: (): string => {
      const all = StorageService.getAllAnalyses();
      const rated = all.filter(a => a.analysis.result); // Solo quelli con feedback utente
      
      if (rated.length === 0) return "Nessuno storico disponibile.";

      // Riassumi ultimi 10 risultati
      const recent = rated.slice(0, 10).map(item => {
          const mName = item.matchId.replace(/-[0-9]{4}.*/, '').replace(/-/g, ' ').toUpperCase();
          const bet = item.analysis.recommended_bet;
          const res = item.analysis.result;
          return `- Match: ${mName}. Bet: ${bet}. Esito: ${res}.`;
      }).join('\n');

      // Calcola stats rapide
      const wins = rated.filter(a => a.analysis.result === 'WIN').length;
      const losses = rated.filter(a => a.analysis.result === 'LOSS').length;
      const accuracy = (wins / (wins + losses || 1) * 100).toFixed(0);

      return `TUA ACCURATEZZA STORICA: ${accuracy}% su ${wins+losses} match valutati.\nRECENTI:\n${recent}\n\nIMPARA DA QUESTI ERRORI/SUCCESSI.`;
  },

  deleteAnalysis: (matchId: string) => {
    localStorage.removeItem(`analysis_${matchId}`);
  },

  clearAllAnalyses: () => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('analysis_')) {
            localStorage.removeItem(key);
        }
    });
  },

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

  createBackup: () => {
    const now = new Date().toISOString();
    localStorage.setItem(KEYS.LAST_BACKUP_DATE, now);

    const backupData: any = {
      meta: {
        version: '3.0',
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
        openingOdds: localStorage.getItem(KEYS.OPENING_ODDS) ? JSON.parse(localStorage.getItem(KEYS.OPENING_ODDS) || '{}') : {},
        upcomingMatches: localStorage.getItem(KEYS.UPCOMING_MATCHES) ? JSON.parse(localStorage.getItem(KEYS.UPCOMING_MATCHES) || '[]') : []
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
        if (backup.footballData.upcomingMatches) localStorage.setItem(KEYS.UPCOMING_MATCHES, JSON.stringify(backup.footballData.upcomingMatches));
      }
      
      if (backup.newsCache) {
          localStorage.setItem(KEYS.CACHED_NEWS, JSON.stringify(backup.newsCache));
      }

      if (backup.cache) {
        Object.keys(backup.cache).forEach(key => {
          localStorage.setItem(key, JSON.stringify(backup.cache[key]));
        });
      }
      
      localStorage.setItem(KEYS.LAST_BACKUP_DATE, new Date().toISOString());

      return true;
    } catch (e) {
      console.error("Backup restore failed:", e);
      return false;
    }
  }
};

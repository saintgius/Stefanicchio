
import React, { useEffect, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { OddsService } from '../services/odds';
import { FootballDataService } from '../services/footballdata';
import { StorageService } from '../services/storage';
import { NewsService, NewsArticle } from '../services/news';
import { ProcessedMatch } from '../types';
import { RefreshCw, AlertTriangle, CalendarDays, Settings as SettingsIcon, DownloadCloud, BarChart3, Megaphone, Trophy, Shield, Crown, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { LeagueStatsModal } from '../components/LeagueStatsModal';
import { TheLock } from '../components/TheLock';

interface DashboardProps {
  oddsKey: string | null;
  geminiKey: string | null;
  footballKey: string | null;
  onNavigateSettings: () => void;
  onAddToSlip: (match: string, selection: string, odds: number) => void;
}

type LeagueCode = 'SA' | 'CL';

export const Dashboard: React.FC<DashboardProps> = ({ oddsKey, geminiKey, footballKey, onNavigateSettings, onAddToSlip }) => {
  const [matches, setMatches] = useState<ProcessedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('');
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [showLeagueStats, setShowLeagueStats] = useState(false);
  const [dropAlerts, setDropAlerts] = useState<{[key:string]: number}>({});
  
  // Clear All Confirmation State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [analysisVersion, setAnalysisVersion] = useState(0); // Used to force re-render of MatchCards

  // LEAGUE STATE
  const [activeLeague, setActiveLeague] = useState<LeagueCode>('SA');
  
  // News State
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [showNews, setShowNews] = useState(false);

  // THEME COLORS HELPERS
  const isChampions = activeLeague === 'CL';
  const themeColor = isChampions ? 'blue' : 'redzone'; // Base color name
  const themeBg = isChampions ? 'bg-blue-600' : 'bg-redzone-600';
  const themeText = isChampions ? 'text-blue-500' : 'text-redzone-500';
  const themeBorder = isChampions ? 'border-blue-600' : 'border-redzone-600';

  // Helper to get codes based on active league
  const getLeagueConfig = (league: LeagueCode) => {
      if (league === 'CL') {
          return {
              oddsKey: 'soccer_uefa_champs_league',
              footballDataKey: 'CL',
              label: 'Champions League',
              newsTopic: 'Champions League'
          };
      }
      return {
          oddsKey: 'soccer_italy_serie_a',
          footballDataKey: 'SA',
          label: 'Serie A',
          newsTopic: 'Serie A'
      };
  };

  // SMART SYNC & CONTEXT SWITCHING
  const refreshContextData = async (force: boolean = false) => {
      if (!footballKey) return;
      
      const config = getLeagueConfig(activeLeague);
      const { lastSync } = StorageService.getFootballData(); 
      const twelveHours = 12 * 60 * 60 * 1000;
      
      if (force || Date.now() - lastSync > twelveHours) {
        console.log(`Smart Sync: Scaricando dati contesto per ${config.label}...`);
        setIsSyncingHistory(true);
        try {
          // DOWNLOAD ALL DATA INCLUDING SQUADS (TEAMS)
          const [standings, matchesHist, scorers, squads] = await Promise.all([
             FootballDataService.fetchStandings(footballKey, config.footballDataKey),
             FootballDataService.fetchSeasonMatches(footballKey, config.footballDataKey),
             FootballDataService.fetchTopScorers(footballKey, config.footballDataKey),
             FootballDataService.fetchTeams(footballKey, config.footballDataKey)
          ]);
          
          StorageService.saveFootballData(standings, matchesHist, scorers, squads);
          console.log("Smart Sync: Contesto Aggiornato (inclusi Rose/Squads).");
        } catch (e) {
          console.error("Smart Sync Failed:", e);
        } finally {
          setIsSyncingHistory(false);
        }
      }
  };

  // NEWS FETCH LOGIC - Updates when Active League Changes
  useEffect(() => {
      const { newsKey } = StorageService.getKeys();
      if (newsKey) {
          const config = getLeagueConfig(activeLeague);
          NewsService.fetchNews(newsKey, config.newsTopic).then(articles => {
              if (articles.length > 0) {
                  setNews(articles);
                  setShowNews(true);
              }
          });
      }
  }, [activeLeague]);

  const loadMatches = async () => {
    if (!oddsKey) return;
    setLoading(true);
    setError(null);
    setMatches([]); 

    try {
      const config = getLeagueConfig(activeLeague);
      
      const allMatches = await OddsService.fetchMatches(oddsKey, config.oddsKey);
      
      refreshContextData(true); 

      if (allMatches.length > 0) {
        // TRACK OPENING ODDS
        const openingOdds = StorageService.trackOpeningOdds(allMatches);
        
        // CHECK FOR DROPS
        const newDropAlerts: {[key:string]: number} = {};
        allMatches.forEach(m => {
            const initial = openingOdds[m.id];
            if (initial) {
                if (m.odds.home < initial.home * 0.95) {
                    newDropAlerts[m.id] = Math.round(((initial.home - m.odds.home) / initial.home) * 100);
                }
                else if (m.odds.away < initial.away * 0.95) {
                     newDropAlerts[m.id] = Math.round(((initial.away - m.odds.away) / initial.away) * 100);
                }
            }
        });
        setDropAlerts(newDropAlerts);

        const firstMatchDate = new Date(allMatches[0].startTime);
        
        const windowDays = activeLeague === 'CL' ? 14 : 6;
        const cutoffDate = new Date(firstMatchDate);
        cutoffDate.setDate(cutoffDate.getDate() + windowDays);

        const nextMatchdayMatches = allMatches.filter(m => {
          const matchDate = new Date(m.startTime);
          return matchDate < cutoffDate;
        });

        setMatches(nextMatchdayMatches);

        if (nextMatchdayMatches.length > 0) {
             const startStr = firstMatchDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short'});
             const endStr = new Date(nextMatchdayMatches[nextMatchdayMatches.length - 1].startTime).toLocaleDateString('it-IT', { day: 'numeric', month: 'short'});
             setDateRange(`${startStr} - ${endStr}`);
        } else {
             setDateRange('');
        }

      } else {
        setMatches([]);
        setDateRange('');
      }

    } catch (err) {
      console.error(err);
      setError('Impossibile caricare quote. Controlla la chiave API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (oddsKey) {
      loadMatches();
    }
  }, [oddsKey, activeLeague]);

  const handleClearAllAnalyses = () => {
      StorageService.clearAllAnalyses();
      setAnalysisVersion(prev => prev + 1); // Increment version to force re-render of MatchCards
      setShowClearConfirm(false);
  };

  if (!oddsKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in px-6">
        <div className="p-6 bg-neutral-900 rounded-full border border-neutral-800">
          <SettingsIcon className="w-12 h-12 text-neutral-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Configurazione Richiesta</h3>
          <p className="text-neutral-400 text-sm max-w-xs mx-auto">
            Per visualizzare le partite e le quote, devi inserire la tua API Key di The Odds API nelle impostazioni.
          </p>
        </div>
        <Button onClick={onNavigateSettings}>Vai alle Impostazioni</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 relative">
      
      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center animate-fade-in p-6">
            <div className="bg-neutral-900 border border-red-900 p-6 rounded-xl text-center max-w-sm w-full shadow-2xl">
                <Trash2 size={48} className="text-red-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-white mb-2">Cancellare Tutto?</h3>
                <p className="text-neutral-400 text-sm mb-6">
                    Eliminerai TUTTE le analisi IA salvate. Dovrai rigenerarle (usando crediti API).
                </p>
                <div className="flex gap-3">
                    <Button onClick={() => setShowClearConfirm(false)} variant="secondary" className="flex-1">
                        ANNULLA
                    </Button>
                    <Button onClick={handleClearAllAnalyses} variant="danger" className="flex-1">
                        CANCELLA TUTTO
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Stefanicchio Welcome */}
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-redzone-600 to-yellow-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                 S
             </div>
             <div>
                 <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Bentornato</div>
                 <h1 className="text-lg font-black text-white leading-none">Stefanicchio</h1>
             </div>
         </div>
         <Crown size={20} className="text-yellow-500 animate-pulse" />
      </div>

      {/* BREAKING NEWS TICKER */}
      {showNews && news.length > 0 && (
          <div className={`${isChampions ? 'bg-blue-900/20 border-blue-900/50' : 'bg-redzone-900/20 border-redzone-900/50'} border-y -mx-4 mb-4 overflow-hidden relative h-10 flex items-center shadow-lg transition-colors duration-500`}>
             <div className={`absolute left-0 z-10 bg-darkbg px-3 h-full flex items-center border-r ${isChampions ? 'border-blue-900/50' : 'border-redzone-900/50'} shadow-[5px_0_15px_rgba(0,0,0,0.8)]`}>
                <Megaphone size={16} className={`${isChampions ? 'text-blue-500' : 'text-redzone-500'} animate-pulse`} />
             </div>
             <div className="whitespace-nowrap animate-marquee flex items-center gap-12 pl-4 hover:pause cursor-default">
                {news.map((item, idx) => (
                   <span key={idx} className="text-xs font-bold text-white uppercase tracking-wide inline-flex items-center">
                      <span className={`${isChampions ? 'text-blue-500' : 'text-redzone-500'} mr-2 text-sm`}>🚨</span>
                      {item.title}
                   </span>
                ))}
             </div>
          </div>
      )}

      {/* LEAGUE SELECTOR TABS */}
      <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button 
             onClick={() => setActiveLeague('SA')}
             className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeLeague === 'SA' ? 'bg-cardbg text-white shadow-lg border border-redzone-600' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
             <Shield size={16} className={activeLeague === 'SA' ? 'text-redzone-500' : ''} /> SERIE A
          </button>
          <button 
             onClick={() => setActiveLeague('CL')}
             className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeLeague === 'CL' ? 'bg-cardbg text-white shadow-lg border border-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
             <Trophy size={16} className={activeLeague === 'CL' ? 'text-blue-500' : ''} /> CHAMPIONS
          </button>
      </div>

      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            <span className={`w-2 h-8 rounded-sm block shadow-[0_0_10px] ${isChampions ? 'bg-blue-600 shadow-blue-600/50' : 'bg-redzone-600 shadow-red-600/50'}`}></span>
            {activeLeague === 'CL' ? 'CHAMPIONS LEAGUE' : 'SERIE A'}
          </h2>
          
          <div className="flex gap-2">
             <button 
                onClick={() => setShowClearConfirm(true)}
                className="bg-neutral-800 p-2 rounded-full hover:bg-red-900 transition-colors text-neutral-400 hover:text-white border border-neutral-700"
                title="Cancella tutte le analisi"
             >
                <Trash2 size={20} />
             </button>
             <button 
                onClick={loadMatches} 
                className="bg-neutral-800 p-2 rounded-full hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white border border-neutral-700"
             >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
           {dateRange && (
            <div className="text-xs text-neutral-400 font-mono flex items-center gap-1">
              <CalendarDays size={12} /> {dateRange}
              {isSyncingHistory && <span className={`${isChampions ? 'text-blue-400' : 'text-yellow-500'} flex items-center gap-1 ml-2`}><DownloadCloud size={10} className="animate-bounce"/> Scarico Dati...</span>}
            </div>
          )}
          <button 
            onClick={() => setShowLeagueStats(true)}
            className="text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded border border-neutral-700 flex items-center gap-2 transition-colors"
          >
            <BarChart3 size={14} /> DATI {activeLeague}
          </button>
        </div>
      </div>
      
      {/* THE LOCK (CASSAFORTE) FEATURE */}
      {matches.length > 0 && (
          <TheLock matches={matches} onAddToSlip={onAddToSlip} />
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-sm flex items-center gap-3">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {loading && !matches.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isChampions ? 'border-blue-500' : 'border-redzone-600'}`}></div>
           <div className="text-neutral-500 text-sm animate-pulse">Analisi mercato {activeLeague}...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {matches.map(match => (
            <MatchCard 
                key={`${match.id}-${analysisVersion}`} // Key changes force remount when analysis cleared
                match={match} 
                geminiKey={geminiKey} 
                league={activeLeague} // Pass league info for styling
                onDeleteAnalysis={() => {
                    StorageService.deleteAnalysis(match.id);
                    // Force a single card refresh by key update? 
                    // Or simpler: let the parent re-render handle it if needed, but Delete in card updates local state.
                    // If we need global refresh on single delete, we need state lift. 
                    // But MatchCard handles its own delete UI well.
                }}
                onAddToSlip={onAddToSlip}
                dropPercentage={dropAlerts[match.id]}
            />
          ))}
          
          {!loading && matches.length === 0 && !error && (
            <div className="col-span-full text-center py-16 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
              <p className="text-neutral-500 font-medium">Nessuna partita {activeLeague === 'CL' ? 'di Champions' : 'di Serie A'} trovata a breve.</p>
            </div>
          )}
        </div>
      )}

      {showLeagueStats && (
        <LeagueStatsModal onClose={() => setShowLeagueStats(false)} />
      )}
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 80s linear infinite;
        }
        .hover\\:pause:hover {
            animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

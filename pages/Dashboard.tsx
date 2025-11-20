
import React, { useEffect, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { OddsService } from '../services/odds';
import { FootballDataService } from '../services/footballdata';
import { StorageService } from '../services/storage';
import { NewsService, NewsArticle } from '../services/news';
import { ProcessedMatch } from '../types';
import { RefreshCw, AlertTriangle, CalendarDays, Settings as SettingsIcon, DownloadCloud, BarChart3, Megaphone } from 'lucide-react';
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

export const Dashboard: React.FC<DashboardProps> = ({ oddsKey, geminiKey, footballKey, onNavigateSettings, onAddToSlip }) => {
  const [matches, setMatches] = useState<ProcessedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('');
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [showLeagueStats, setShowLeagueStats] = useState(false);
  const [dropAlerts, setDropAlerts] = useState<{[key:string]: number}>({}); // Map matchId -> percent drop
  
  // News State
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [showNews, setShowNews] = useState(false);

  // AUTO-SYNC LOGIC
  useEffect(() => {
    const checkAutoSync = async () => {
      if (!footballKey) return;

      const { lastSync } = StorageService.getFootballData();
      const twelveHours = 12 * 60 * 60 * 1000;
      
      // Se i dati sono vecchi di 12 ore, aggiorna in background
      if (Date.now() - lastSync > twelveHours) {
        console.log("Smart Sync: Aggiornamento dati storici in corso...");
        setIsSyncingHistory(true);
        try {
          const standings = await FootballDataService.fetchStandings(footballKey);
          const matches = await FootballDataService.fetchSeasonMatches(footballKey);
          const scorers = await FootballDataService.fetchTopScorers(footballKey);
          StorageService.saveFootballData(standings, matches, scorers);
          console.log("Smart Sync: Completato.");
        } catch (e) {
          console.error("Smart Sync Failed:", e);
        } finally {
          setIsSyncingHistory(false);
        }
      }
    };

    checkAutoSync();
  }, [footballKey]);

  // NEWS FETCH LOGIC
  useEffect(() => {
      const { newsKey } = StorageService.getKeys();
      if (newsKey) {
          NewsService.fetchSerieANews(newsKey).then(articles => {
              if (articles.length > 0) {
                  setNews(articles);
                  setShowNews(true);
              }
          });
      }
  }, []);

  const loadMatches = async () => {
    if (!oddsKey) return;
    setLoading(true);
    setError(null);
    try {
      const allMatches = await OddsService.fetchMatches(oddsKey);
      
      if (allMatches.length > 0) {
        // TRACK OPENING ODDS
        const openingOdds = StorageService.trackOpeningOdds(allMatches);
        
        // CHECK FOR DROPS
        const newDropAlerts: {[key:string]: number} = {};
        allMatches.forEach(m => {
            const initial = openingOdds[m.id];
            if (initial) {
                // Check Home Drop
                if (m.odds.home < initial.home * 0.95) {
                    newDropAlerts[m.id] = Math.round(((initial.home - m.odds.home) / initial.home) * 100);
                }
                // Check Away Drop
                else if (m.odds.away < initial.away * 0.95) {
                     newDropAlerts[m.id] = Math.round(((initial.away - m.odds.away) / initial.away) * 100);
                }
            }
        });
        setDropAlerts(newDropAlerts);

        const firstMatchDate = new Date(allMatches[0].startTime);
        
        const windowDays = 5;
        const cutoffDate = new Date(firstMatchDate);
        cutoffDate.setDate(cutoffDate.getDate() + windowDays);

        const nextMatchdayMatches = allMatches.filter(m => {
          const matchDate = new Date(m.startTime);
          return matchDate < cutoffDate;
        });

        setMatches(nextMatchdayMatches);

        const startStr = firstMatchDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short'});
        const endStr = new Date(nextMatchdayMatches[nextMatchdayMatches.length - 1].startTime).toLocaleDateString('it-IT', { day: 'numeric', month: 'short'});
        setDateRange(`${startStr} - ${endStr}`);

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
  }, [oddsKey]);

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
    <div className="space-y-6 pb-24">
      
      {/* BREAKING NEWS TICKER */}
      {showNews && news.length > 0 && (
          <div className="bg-redzone-900/20 border-y border-redzone-900/50 -mx-4 mb-4 overflow-hidden relative h-10 flex items-center shadow-lg">
             <div className="absolute left-0 z-10 bg-darkbg px-3 h-full flex items-center border-r border-redzone-900/50 shadow-[5px_0_15px_rgba(0,0,0,0.8)]">
                <Megaphone size={16} className="text-redzone-500 animate-pulse" />
             </div>
             <div className="whitespace-nowrap animate-marquee flex items-center gap-12 pl-4 hover:pause cursor-default">
                {news.map((item, idx) => (
                   <span key={idx} className="text-xs font-bold text-white uppercase tracking-wide inline-flex items-center">
                      <span className="text-redzone-500 mr-2 text-sm">🚨</span>
                      {item.title}
                   </span>
                ))}
             </div>
          </div>
      )}

      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            <span className="w-2 h-8 bg-redzone-600 rounded-sm block shadow-[0_0_10px_#dc2626]"></span>
            PROSSIMO TURNO
          </h2>
           <button 
            onClick={loadMatches} 
            className="bg-neutral-800 p-2 rounded-full hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white border border-neutral-700"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="flex justify-between items-center">
           {dateRange && (
            <div className="text-xs text-neutral-400 font-mono flex items-center gap-1">
              <CalendarDays size={12} /> {dateRange}
              {isSyncingHistory && <span className="text-yellow-500 flex items-center gap-1 ml-2"><DownloadCloud size={10} className="animate-bounce"/> Sync Dati...</span>}
            </div>
          )}
          <button 
            onClick={() => setShowLeagueStats(true)}
            className="text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded border border-neutral-700 flex items-center gap-2 transition-colors"
          >
            <BarChart3 size={14} /> CLASSIFICA SERIE A
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
           <div className="w-8 h-8 border-4 border-redzone-600 border-t-transparent rounded-full animate-spin"></div>
           <div className="text-neutral-500 text-sm animate-pulse">Analisi mercato in corso...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {matches.map(match => (
            <MatchCard 
                key={match.id} 
                match={match} 
                geminiKey={geminiKey} 
                onDeleteAnalysis={() => {
                    StorageService.deleteAnalysis(match.id);
                }}
                onAddToSlip={onAddToSlip}
                dropPercentage={dropAlerts[match.id]}
            />
          ))}
          
          {!loading && matches.length === 0 && !error && (
            <div className="col-span-full text-center py-16 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
              <p className="text-neutral-500 font-medium">Nessuna partita trovata nel breve periodo.</p>
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
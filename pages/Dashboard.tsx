
import React, { useEffect, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { OddsService } from '../services/odds';
import { FootballDataService } from '../services/footballdata';
import { StorageService } from '../services/storage';
import { NewsService, NewsArticle } from '../services/news';
import { SyncService } from '../services/sync-service';
import { ProcessedMatch } from '../types';
import { RefreshCw, AlertTriangle, CalendarDays, Settings as SettingsIcon, DownloadCloud, BarChart3, Megaphone, Trophy, Shield, Crown, Trash2, Quote, TowerControl, Star } from 'lucide-react';
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

type LeagueCode = 'SA' | 'CL' | 'PL';

// STEFANICCHIO'S MOTIVATION DATABASE
const MOTIVATION_DB = {
    HYPE: [
        "Vai Stefanicchio, oggi i bookmaker pagano l'affitto al posto tuo!",
        "Stefanicchio, sento profumo di CASSA nell'aria.",
        "Non è scommettere, Stefanicchio. È visione del futuro.",
        "Stefanicchio, ricordati: la fortuna aiuta gli audaci (e chi studia le stats).",
        "Oggi sbanchiamo tutto, Stefanicchio. Me lo sento nel codice.",
        "Stefanicchio, quel moltiplicatore x20 ti sta chiamando. Rispondi!",
        "Il destino è nelle tue mani, Stefanicchio. E anche la bolletta.",
        "Stefanicchio, sei a una giocata di distanza dalla gloria.",
        "Fai vedere all'algoritmo chi comanda, Stefanicchio!",
        "Stefanicchio, oggi niente 'Under'. Oggi si punta in alto.",
        "Prepara la valigia Stefanicchio, che con questa schedina andiamo alle Maldive.",
        "Stefanicchio, il lunedì è triste solo per chi non ha vinto la domenica.",
        "Hai studiato o vai a sensazione? In ogni caso, credici Stefanicchio!",
        "Stefanicchio, la quota è alta, ma la tua fede deve essere di più.",
        "Metticelo quel '2 fisso' a sorpresa, Stefanicchio. Sii eroe."
    ],
    WISDOM: [
        "Testa fredda e quote calde, Stefanicchio. Questa è la via.",
        "Stefanicchio, non inseguire le perdite. Insegui il Valore.",
        "Fidati dei dati, Stefanicchio. I numeri non mentono mai (gli arbitri sì).",
        "Stefanicchio, la multipla è un'arte, e tu sei Michelangelo.",
        "Meglio un raddoppio oggi che un 'persa per una' domani, vero Stefanicchio?",
        "Stefanicchio, controlla le formazioni prima di fare follie!",
        "La pazienza è la virtù dei forti... e di chi aspetta il cashout, Stefanicchio.",
        "Stefanicchio, gioca responsabile, ma vinci irresponsabilmente.",
        "Non è fortuna, Stefanicchio. È competenza statistica applicata.",
        "Stefanicchio, ricordati: la copertura non è da codardi, è da professionisti."
    ],
    RESILIENCE: [
        "Stefanicchio, 'persa per una' fa male, ma ti renderà più forte.",
        "Rialzati Stefanicchio! Il campionato è lungo.",
        "Maledetto recupero... ma la prossima entra, Stefanicchio.",
        "Stefanicchio, anche i migliori sbagliano un rigore.",
        "Non strappare la schedina, Stefanicchio. È esperienza per la prossima.",
        "Stefanicchio, il palo è solo un gol che non ci ha creduto abbastanza.",
        "Asciuga quelle lacrime Stefanicchio, c'è il turno infrasettimanale!",
        "Era fuorigioco netto, Stefanicchio. Avevi ragione tu.",
        "Stefanicchio, la ruota gira. E quando gira, noi saremo lì col carrello pieno.",
        "Non mollare ora Stefanicchio, la Surebet della vita è dietro l'angolo."
    ],
    IRONY: [
        "Stefanicchio, se prendi questa ti offro una cena virtuale.",
        "Smetti di gufarla agli altri e pensa alla tua, Stefanicchio!",
        "Stefanicchio, ma l'hai giocata o stai solo guardando?",
        "Quel pareggio a 3.40 è una trappola, Stefanicchio... o forse no?",
        "Stefanicchio, spero tu non abbia giocato di nuovo la tua squadra del cuore...",
        "Se vinci questa, Stefanicchio, voglio il 10% per il consiglio.",
        "Stefanicchio, quel 'Gol Casa' è più sicuro delle tasse.",
        "Ci vuole coraggio per quel pronostico, Stefanicchio. Rispetto.",
        "Stefanicchio, oggi l'Under 2.5 è illegale. Vogliamo spettacolo!",
        "Stai studiando troppo Stefanicchio, butta 'sto gettone!"
    ]
};

export const Dashboard: React.FC<DashboardProps> = ({ oddsKey, geminiKey, footballKey, onNavigateSettings, onAddToSlip }) => {
    const [matches, setMatches] = useState<ProcessedMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLeagueStats, setShowLeagueStats] = useState(false);
    const [dropAlerts, setDropAlerts] = useState<{ [key: string]: number }>({});

    // Clear All Confirmation State
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [analysisVersion, setAnalysisVersion] = useState(0); // Used to force re-render of MatchCards

    // Motivation State
    const [dailyQuote, setDailyQuote] = useState<{ text: string, author: string } | null>(null);

    // LEAGUE STATE
    const [activeLeague, setActiveLeague] = useState<LeagueCode>('SA');

    // News State
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [showNews, setShowNews] = useState(false);

    // THEME COLORS HELPERS
    const isChampions = activeLeague === 'CL';
    const isPremier = activeLeague === 'PL';

    const themeText = isChampions ? 'text-blue-500' : isPremier ? 'text-purple-500' : 'text-redzone-500';
    const themeBg = isChampions ? 'bg-blue-600' : isPremier ? 'bg-purple-600' : 'bg-redzone-600';

    // Helper to get codes based on active league
    const getLeagueConfig = (league: LeagueCode) => {
        if (league === 'CL') {
            return {
                oddsKey: 'soccer_uefa_champs_league',
                footballDataKey: 'CL',
                label: 'Champions League',
                newsTopic: 'Champions League'
            };
        } else if (league === 'PL') {
            return {
                oddsKey: 'soccer_epl',
                footballDataKey: 'PL',
                label: 'Premier League',
                newsTopic: 'Premier League'
            };
        }
        return {
            oddsKey: 'soccer_italy_serie_a',
            footballDataKey: 'SA',
            label: 'Serie A',
            newsTopic: 'Serie A'
        };
    };

    // MOTIVATIONAL QUOTE GENERATOR - SMART CONTEXT
    useEffect(() => {
        const stats = StorageService.getStats();
        const lastBet = stats.bets.length > 0 ? stats.bets[0] : null;

        let category: keyof typeof MOTIVATION_DB = 'HYPE';

        if (lastBet) {
            if (lastBet.result === 'LOSS') {
                // Se l'ultima è persa, o Resilienza o Ironia (50/50)
                category = Math.random() > 0.5 ? 'RESILIENCE' : 'IRONY';
            } else if (lastBet.result === 'WIN') {
                // Se vinta, Saggezza o Hype
                category = Math.random() > 0.5 ? 'WISDOM' : 'HYPE';
            }
        }

        const phrases = MOTIVATION_DB[category];
        const selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];

        const squads = StorageService.getSquads();
        let author = "Il Mister";
        let teamName = "";

        // Try to find a random player from stored squads
        if (squads && squads.length > 0) {
            const validTeams = squads.filter(t => t.squad && t.squad.length > 0);
            if (validTeams.length > 0) {
                const randomTeam = validTeams[Math.floor(Math.random() * validTeams.length)];
                const randomPlayer = randomTeam.squad[Math.floor(Math.random() * randomTeam.squad.length)];
                author = randomPlayer.name;
                teamName = randomTeam.name;
            } else {
                const legends = ["Zlatan Ibrahimovic", "Jose Mourinho", "Carlo Ancelotti", "Francesco Totti", "Pep Guardiola"];
                author = legends[Math.floor(Math.random() * legends.length)];
                teamName = "Leggenda";
            }
        } else {
            const legends = ["Zlatan Ibrahimovic", "Jose Mourinho", "Carlo Ancelotti", "Francesco Totti", "Pep Guardiola"];
            author = legends[Math.floor(Math.random() * legends.length)];
            teamName = "Leggenda";
        }

        setDailyQuote({
            text: selectedPhrase,
            author: `${author} (${teamName})`
        });

    }, []);

    // NEWS FETCH LOGIC
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

    // ODDS FETCH LOGIC
    const fetchMatches = async () => {
        if (!oddsKey) return;
        setLoading(true);
        setError(null);
        try {
            const config = getLeagueConfig(activeLeague);
            const data = await OddsService.fetchMatches(oddsKey, config.oddsKey);

            // Filter by date if needed, or just show upcoming
            const upcoming = data.filter(m => new Date(m.startTime) > new Date());
            setMatches(upcoming);

            // Calculate drop alerts (simple logic simulation for demo)
            const drops: { [key: string]: number } = {};
            upcoming.forEach(m => {
                if (Math.random() > 0.8) drops[m.id] = Math.floor(Math.random() * 15) + 5;
            });
            setDropAlerts(drops);

            StorageService.saveUpcomingMatches(upcoming);

        } catch (err) {
            setError("Errore caricamento quote. Controlla la chiave API.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, [activeLeague, oddsKey]);

    // AUTOMATIC SYNC LOGIC
    useEffect(() => {
        const checkAndSync = async () => {
            if (!footballKey) return;

            const isStale = SyncService.isStale();
            if (isStale) {
                console.log("[Dashboard] Data is stale, starting auto-sync...");
                try {
                    await SyncService.syncAll(footballKey);
                    console.log("[Dashboard] Auto-sync completed.");
                    // Force re-render or data refresh if needed
                } catch (e) {
                    console.error("[Dashboard] Auto-sync failed", e);
                }
            }
        };

        // Check on mount
        checkAndSync();

        // Check every minute
        const interval = setInterval(checkAndSync, 60000);
        return () => clearInterval(interval);
    }, [footballKey]);

    const handleRefresh = () => {
        fetchMatches();
    };

    const handleClearAll = () => {
        StorageService.clearAllAnalyses();
        setAnalysisVersion(prev => prev + 1);
        setShowClearConfirm(false);
    };

    return (
        <div className="space-y-6 pb-24 animate-fade-in relative">

            {/* Premium Header */}
            <div className="relative overflow-hidden">
                {/* Ambient glow */}
                <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-20 ${isChampions ? 'bg-blue-500' : isPremier ? 'bg-purple-500' : 'bg-red-500'}`} />

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isChampions ? 'bg-blue-500' : isPremier ? 'bg-purple-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Live Betting</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">
                            REDZONE<span className={`${themeText} ml-1`}>AI</span>
                        </h1>
                        <p className="text-xs text-neutral-500 font-medium mt-1">Predizioni Statistiche Avanzate</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="glass-card p-2.5 rounded-xl text-neutral-500 hover:text-red-500 transition-all hover:scale-105 active-scale"
                            title="Cancella tutte le analisi"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className={`glass-card p-2.5 rounded-xl text-white transition-all hover:scale-105 active-scale ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* League Tabs - Premium */}
            <div className="glass-panel p-1.5 rounded-2xl">
                <div className="flex gap-1">
                    {(['SA', 'PL', 'CL'] as LeagueCode[]).map(code => {
                        const isActive = activeLeague === code;
                        let activeClass = '';
                        let icon = null;

                        if (code === 'CL') {
                            activeClass = isActive ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-glow-blue' : '';
                            icon = <Star size={12} className={isActive ? 'fill-current' : ''} />;
                        } else if (code === 'PL') {
                            activeClass = isActive ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : '';
                            icon = <TowerControl size={12} />;
                        } else {
                            activeClass = isActive ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-glow-red' : '';
                            icon = <Shield size={12} />;
                        }

                        return (
                            <button
                                key={code}
                                onClick={() => setActiveLeague(code)}
                                className={`
                                  flex-1 py-3 text-xs font-bold rounded-xl transition-all uppercase tracking-wider
                                  flex items-center justify-center gap-2 active-scale
                                  ${isActive ? activeClass : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'}
                              `}
                            >
                                {icon}
                                {code === 'SA' ? 'Serie A' : code === 'PL' ? 'Premier' : 'Champions'}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MOTIVATION QUOTE */}
            {dailyQuote && (
                <div className="glass-card border-l-4 border-yellow-500 p-5 rounded-2xl relative overflow-hidden group hover-lift">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-500/10 to-transparent" />
                    <Quote size={56} className="absolute right-2 bottom-2 text-yellow-500/5 -rotate-12 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-neutral-200 italic font-medium relative z-10 leading-relaxed">"{dailyQuote.text}"</p>
                    <p className="text-[10px] text-yellow-500/80 font-bold mt-3 uppercase tracking-widest relative z-10 flex items-center gap-2">
                        <span className="w-4 h-px bg-yellow-500/50" />
                        {dailyQuote.author}
                    </p>
                </div>
            )}

            {/* THE LOCK (Safe Bet) */}
            {matches.length > 0 && (
                <TheLock matches={matches} onAddToSlip={onAddToSlip} />
            )}

            {/* NEWS TICKER */}
            {showNews && news.length > 0 && (
                <div className="bg-neutral-900 border-y border-neutral-800 py-2 overflow-hidden relative">
                    <div className="flex gap-8 animate-marquee whitespace-nowrap">
                        {news.map((n, i) => (
                            <span key={i} className="text-xs text-neutral-400 flex items-center gap-2">
                                <Megaphone size={12} className="text-redzone-500" />
                                <span className="font-bold text-neutral-300">{n.source.name}:</span> {n.title}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* LEAGUE STATS BUTTON */}
            <button
                onClick={() => setShowLeagueStats(true)}
                className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-3 rounded-xl flex items-center justify-between group transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isChampions ? 'bg-blue-900/20 text-blue-500' : isPremier ? 'bg-purple-900/20 text-purple-500' : 'bg-red-900/20 text-red-500'}`}>
                        <Trophy size={18} />
                    </div>
                    <div className="text-left">
                        <div className="text-white font-bold text-sm group-hover:text-redzone-500 transition-colors">
                            Classifica & Marcatori
                        </div>
                        <div className="text-[10px] text-neutral-500">
                            {isChampions ? 'Champions League' : isPremier ? 'Premier League' : 'Serie A'} 2024/25
                        </div>
                    </div>
                </div>
                <BarChart3 size={18} className="text-neutral-600 group-hover:text-white" />
            </button>

            {/* MATCH LIST */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw className="animate-spin text-redzone-600" size={32} />
                        <p className="text-neutral-500 text-xs animate-pulse">Analisi quote in corso...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                        <p className="text-red-400 text-sm mb-4">{error}</p>
                        <Button onClick={() => onNavigateSettings()} variant="secondary">
                            <SettingsIcon size={14} className="mr-2" /> Configura API
                        </Button>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-xl">
                        <CalendarDays className="mx-auto text-neutral-600 mb-2" size={32} />
                        <p className="text-neutral-500 text-sm">Nessuna partita in programma.</p>
                        <p className="text-neutral-600 text-xs mt-1">Il calendario è vuoto, e anche il frigo.</p>
                    </div>
                ) : (
                    matches.map(match => (
                        <MatchCard
                            key={`${match.id}-${analysisVersion}`}
                            match={match}
                            geminiKey={geminiKey}
                            league={activeLeague}
                            onDeleteAnalysis={() => setAnalysisVersion(v => v + 1)}
                            onAddToSlip={onAddToSlip}
                            dropPercentage={dropAlerts[match.id]}
                        />
                    ))
                )}
            </div>

            {/* STATS MODAL */}
            {showLeagueStats && (
                <LeagueStatsModal
                    league={activeLeague}
                    onClose={() => setShowLeagueStats(false)}
                />
            )}

            {/* CLEAR ALL CONFIRMATION */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center animate-fade-in p-6">
                    <div className="bg-neutral-900 border border-red-900 p-6 rounded-xl text-center max-w-sm w-full shadow-2xl">
                        <Trash2 size={48} className="text-red-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Tabula Rasa?</h3>
                        <p className="text-neutral-400 text-sm mb-6">
                            Vuoi davvero cancellare tutte le analisi salvate? Dovrai rigenerarle (usando crediti API).
                        </p>
                        <div className="flex gap-3">
                            <Button onClick={() => setShowClearConfirm(false)} variant="secondary" className="flex-1">
                                ANNULLA
                            </Button>
                            <Button onClick={handleClearAll} variant="danger" className="flex-1">
                                PROCEDI
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

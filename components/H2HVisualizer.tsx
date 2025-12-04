
import React, { useState, useEffect } from 'react';
import { FootballDataMatch } from '../types';
import { StorageService } from '../services/storage';
import { Swords, TrendingUp, TrendingDown, Minus, Calendar, Target, Shield, Trophy, ChevronLeft, ChevronRight, Activity, Zap, BarChart3 } from 'lucide-react';

interface H2HVisualizerProps {
    homeTeam: string;
    awayTeam: string;
    onClose?: () => void;
}

interface H2HStats {
    totalMatches: number;
    homeWins: number;
    awayWins: number;
    draws: number;
    homeGoals: number;
    awayGoals: number;
    avgGoals: number;
    bttsCount: number;
    overCount: number;
    patterns: string[];
}

export const H2HVisualizer: React.FC<H2HVisualizerProps> = ({ homeTeam, awayTeam, onClose }) => {
    const [matches, setMatches] = useState<FootballDataMatch[]>([]);
    const [stats, setStats] = useState<H2HStats | null>(null);
    const [activeMatch, setActiveMatch] = useState(0);
    const [viewMode, setViewMode] = useState<'timeline' | 'stats'>('timeline');

    useEffect(() => {
        const h2hMatches = StorageService.getH2HMatches(homeTeam, awayTeam);
        setMatches(h2hMatches);

        if (h2hMatches.length > 0) {
            calculateStats(h2hMatches);
        }
    }, [homeTeam, awayTeam]);

    const calculateStats = (h2hMatches: FootballDataMatch[]) => {
        let homeWins = 0;
        let awayWins = 0;
        let draws = 0;
        let homeGoals = 0;
        let awayGoals = 0;
        let bttsCount = 0;
        let overCount = 0;
        const patterns: string[] = [];

        for (const match of h2hMatches) {
            const hg = match.score?.fullTime?.home || 0;
            const ag = match.score?.fullTime?.away || 0;

            // Determina chi era casa in quella partita
            const wasHomeTeamHome = match.homeTeam?.name?.includes(homeTeam) ||
                match.homeTeam?.tla === homeTeam.substring(0, 3).toUpperCase();

            if (wasHomeTeamHome) {
                if (hg > ag) homeWins++;
                else if (hg < ag) awayWins++;
                else draws++;
                homeGoals += hg;
                awayGoals += ag;
            } else {
                if (ag > hg) homeWins++;
                else if (ag < hg) awayWins++;
                else draws++;
                homeGoals += ag;
                awayGoals += hg;
            }

            if (hg > 0 && ag > 0) bttsCount++;
            if (hg + ag > 2) overCount++;
        }

        const total = h2hMatches.length;
        const avgGoals = total > 0 ? (homeGoals + awayGoals) / total : 0;

        // Pattern detection
        if (draws / total > 0.4) patterns.push("Alto tasso di pareggi");
        if (bttsCount / total > 0.6) patterns.push("Spesso Goal Entrambe");
        if (overCount / total > 0.5) patterns.push("Tendenza Over 2.5");
        if (homeWins / total > 0.5) patterns.push(`${homeTeam} domina i precedenti`);
        if (awayWins / total > 0.5) patterns.push(`${awayTeam} domina i precedenti`);
        if (avgGoals < 2) patterns.push("Partite con pochi gol");
        if (avgGoals > 3.5) patterns.push("Scontri molto prolifici");

        setStats({
            totalMatches: total,
            homeWins,
            awayWins,
            draws,
            homeGoals,
            awayGoals,
            avgGoals,
            bttsCount,
            overCount,
            patterns
        });
    };

    const getResultColor = (match: FootballDataMatch) => {
        const hg = match.score?.fullTime?.home || 0;
        const ag = match.score?.fullTime?.away || 0;
        const wasHomeTeamHome = match.homeTeam?.name?.includes(homeTeam) ||
            match.homeTeam?.tla === homeTeam.substring(0, 3).toUpperCase();

        if (hg === ag) return 'from-neutral-600 to-neutral-700';
        if (wasHomeTeamHome) {
            return hg > ag ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700';
        } else {
            return ag > hg ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700';
        }
    };

    const getResultLabel = (match: FootballDataMatch) => {
        const hg = match.score?.fullTime?.home || 0;
        const ag = match.score?.fullTime?.away || 0;
        const wasHomeTeamHome = match.homeTeam?.name?.includes(homeTeam) ||
            match.homeTeam?.tla === homeTeam.substring(0, 3).toUpperCase();

        if (hg === ag) return { text: 'PARI', icon: Minus };
        if (wasHomeTeamHome) {
            return hg > ag ? { text: homeTeam, icon: Trophy } : { text: awayTeam, icon: Trophy };
        } else {
            return ag > hg ? { text: homeTeam, icon: Trophy } : { text: awayTeam, icon: Trophy };
        }
    };

    if (matches.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6 text-center">
                <Swords size={48} className="text-neutral-700 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">Nessun Precedente</h3>
                <p className="text-neutral-500 text-sm">Non ci sono dati H2H disponibili per queste squadre.</p>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="glass-panel p-4 border-b border-neutral-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-600/20">
                            <Swords size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Head to Head</h3>
                            <span className="text-[10px] text-neutral-500">{matches.length} precedenti trovati</span>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex glass-light rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'timeline' ? 'bg-purple-600 text-white' : 'text-neutral-500'
                                }`}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setViewMode('stats')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'stats' ? 'bg-purple-600 text-white' : 'text-neutral-500'
                                }`}
                        >
                            Stats
                        </button>
                    </div>
                </div>
            </div>

            {/* Teams Header */}
            <div className="grid grid-cols-3 p-4 gap-2 text-center">
                <div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-800/30 border border-blue-500/30 flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-black text-white">{homeTeam.charAt(0)}</span>
                    </div>
                    <div className="font-bold text-white text-sm truncate">{homeTeam}</div>
                    {stats && (
                        <div className="text-2xl font-black text-blue-400 mt-1">{stats.homeWins}</div>
                    )}
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Pareggi</div>
                    <div className="text-3xl font-black text-neutral-500">{stats?.draws || 0}</div>
                </div>
                <div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/30 to-red-800/30 border border-red-500/30 flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-black text-white">{awayTeam.charAt(0)}</span>
                    </div>
                    <div className="font-bold text-white text-sm truncate">{awayTeam}</div>
                    {stats && (
                        <div className="text-2xl font-black text-red-400 mt-1">{stats.awayWins}</div>
                    )}
                </div>
            </div>

            {/* Dominance Bar */}
            {stats && stats.totalMatches > 0 && (
                <div className="px-4 pb-4">
                    <div className="h-3 rounded-full overflow-hidden flex bg-neutral-800">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${(stats.homeWins / stats.totalMatches) * 100}%` }}
                        />
                        <div
                            className="h-full bg-gradient-to-r from-neutral-600 to-neutral-700 transition-all duration-500"
                            style={{ width: `${(stats.draws / stats.totalMatches) * 100}%` }}
                        />
                        <div
                            className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500"
                            style={{ width: `${(stats.awayWins / stats.totalMatches) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* TIMELINE VIEW */}
            {viewMode === 'timeline' && (
                <div className="p-4 space-y-3">
                    {/* Timeline Navigator */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <button
                            onClick={() => setActiveMatch(Math.max(0, activeMatch - 1))}
                            disabled={activeMatch === 0}
                            className="glass-light p-2 rounded-lg disabled:opacity-30 hover:bg-neutral-700/50 transition-all"
                        >
                            <ChevronLeft size={20} className="text-white" />
                        </button>
                        <div className="flex gap-1">
                            {matches.slice(0, 5).map((match, i) => (
                                <div
                                    key={i}
                                    onClick={() => setActiveMatch(i)}
                                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${activeMatch === i ? 'bg-purple-500 scale-125' : 'bg-neutral-700 hover:bg-neutral-600'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => setActiveMatch(Math.min(matches.length - 1, activeMatch + 1))}
                            disabled={activeMatch === matches.length - 1}
                            className="glass-light p-2 rounded-lg disabled:opacity-30 hover:bg-neutral-700/50 transition-all"
                        >
                            <ChevronRight size={20} className="text-white" />
                        </button>
                    </div>

                    {/* Active Match Card */}
                    {matches[activeMatch] && (
                        <div className={`glass-light rounded-xl p-5 bg-gradient-to-br ${getResultColor(matches[activeMatch])} bg-opacity-20 border border-neutral-700/50 animate-scale-in`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-2">
                                    <Calendar size={12} />
                                    {new Date(matches[activeMatch].utcDate).toLocaleDateString('it-IT', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </div>
                                <div className="flex items-center gap-1 bg-neutral-900/50 px-2 py-1 rounded-lg">
                                    {React.createElement(getResultLabel(matches[activeMatch]).icon, { size: 12, className: "text-yellow-500" })}
                                    <span className="text-[10px] font-bold text-yellow-500">{getResultLabel(matches[activeMatch]).text}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-6 mb-4">
                                <div className="text-center">
                                    <div className="text-sm font-bold text-white mb-1">
                                        {matches[activeMatch].homeTeam?.tla || matches[activeMatch].homeTeam?.name}
                                    </div>
                                    <div className="text-4xl font-black text-white">
                                        {matches[activeMatch].score?.fullTime?.home || 0}
                                    </div>
                                </div>
                                <div className="text-neutral-600 font-black text-xl">-</div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-white mb-1">
                                        {matches[activeMatch].awayTeam?.tla || matches[activeMatch].awayTeam?.name}
                                    </div>
                                    <div className="text-4xl font-black text-white">
                                        {matches[activeMatch].score?.fullTime?.away || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats for Match */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                <div className="glass-light rounded-lg py-2">
                                    <span className="text-neutral-500 block">Totale Gol</span>
                                    <span className="text-white font-bold">
                                        {(matches[activeMatch].score?.fullTime?.home || 0) + (matches[activeMatch].score?.fullTime?.away || 0)}
                                    </span>
                                </div>
                                <div className="glass-light rounded-lg py-2">
                                    <span className="text-neutral-500 block">Over 2.5</span>
                                    <span className={`font-bold ${((matches[activeMatch].score?.fullTime?.home || 0) + (matches[activeMatch].score?.fullTime?.away || 0)) > 2
                                        ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {((matches[activeMatch].score?.fullTime?.home || 0) + (matches[activeMatch].score?.fullTime?.away || 0)) > 2 ? 'SÌ' : 'NO'}
                                    </span>
                                </div>
                                <div className="glass-light rounded-lg py-2">
                                    <span className="text-neutral-500 block">BTTS</span>
                                    <span className={`font-bold ${(matches[activeMatch].score?.fullTime?.home || 0) > 0 && (matches[activeMatch].score?.fullTime?.away || 0) > 0
                                        ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {(matches[activeMatch].score?.fullTime?.home || 0) > 0 && (matches[activeMatch].score?.fullTime?.away || 0) > 0 ? 'SÌ' : 'NO'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mini Timeline */}
                    <div className="flex gap-2 overflow-x-auto py-2 px-1">
                        {matches.slice(0, 7).map((match, i) => {
                            const hg = match.score?.fullTime?.home || 0;
                            const ag = match.score?.fullTime?.away || 0;
                            return (
                                <div
                                    key={i}
                                    onClick={() => setActiveMatch(i)}
                                    className={`shrink-0 w-16 glass-light rounded-xl p-2 text-center cursor-pointer transition-all hover:scale-105 ${activeMatch === i ? 'ring-2 ring-purple-500' : ''
                                        }`}
                                >
                                    <div className="text-[9px] text-neutral-500 mb-1">
                                        {new Date(match.utcDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                    <div className="text-white font-black text-sm">{hg}-{ag}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* STATS VIEW */}
            {viewMode === 'stats' && stats && (
                <div className="p-4 space-y-4">
                    {/* Goal Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="glass-light rounded-xl p-4 text-center">
                            <Target size={20} className="text-blue-400 mx-auto mb-2" />
                            <div className="text-2xl font-black text-white">{stats.homeGoals}</div>
                            <div className="text-[10px] text-neutral-500 uppercase">Gol {homeTeam}</div>
                        </div>
                        <div className="glass-light rounded-xl p-4 text-center">
                            <Target size={20} className="text-red-400 mx-auto mb-2" />
                            <div className="text-2xl font-black text-white">{stats.awayGoals}</div>
                            <div className="text-[10px] text-neutral-500 uppercase">Gol {awayTeam}</div>
                        </div>
                    </div>

                    {/* Trends */}
                    <div className="glass-light rounded-xl p-4">
                        <h4 className="text-[10px] text-neutral-500 uppercase font-bold mb-3 flex items-center gap-2">
                            <Activity size={12} /> Tendenze H2H
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <div className="text-2xl font-black text-white">{stats.avgGoals.toFixed(1)}</div>
                                <div className="text-[10px] text-neutral-500">Media Gol</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-green-400">
                                    {Math.round((stats.bttsCount / stats.totalMatches) * 100)}%
                                </div>
                                <div className="text-[10px] text-neutral-500">BTTS</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-yellow-400">
                                    {Math.round((stats.overCount / stats.totalMatches) * 100)}%
                                </div>
                                <div className="text-[10px] text-neutral-500">Over 2.5</div>
                            </div>
                        </div>
                    </div>

                    {/* Patterns */}
                    {stats.patterns.length > 0 && (
                        <div className="glass-light rounded-xl p-4">
                            <h4 className="text-[10px] text-neutral-500 uppercase font-bold mb-3 flex items-center gap-2">
                                <Zap size={12} className="text-yellow-500" /> Pattern Rilevati
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {stats.patterns.map((pattern, i) => (
                                    <span
                                        key={i}
                                        className="bg-purple-900/30 text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-purple-700/30 font-medium"
                                    >
                                        {pattern}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Insight */}
                    <div className="glass-card border-l-4 border-l-purple-500 p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                            <BarChart3 size={18} className="text-purple-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-1">Insight AI</h4>
                                <p className="text-sm text-neutral-300 leading-relaxed">
                                    {stats.homeWins > stats.awayWins
                                        ? `${homeTeam} ha vinto ${stats.homeWins} dei ${stats.totalMatches} precedenti (${Math.round((stats.homeWins / stats.totalMatches) * 100)}%). `
                                        : stats.awayWins > stats.homeWins
                                            ? `${awayTeam} ha vinto ${stats.awayWins} dei ${stats.totalMatches} precedenti (${Math.round((stats.awayWins / stats.totalMatches) * 100)}%). `
                                            : 'Equilibrio perfetto nei precedenti. '}
                                    {stats.avgGoals > 2.5
                                        ? `Media di ${stats.avgGoals.toFixed(1)} gol a partita, propendendo per l'Over.`
                                        : `Media di ${stats.avgGoals.toFixed(1)} gol a partita, propendendo per l'Under.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default H2HVisualizer;

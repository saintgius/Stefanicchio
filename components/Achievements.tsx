
import React, { useState, useEffect } from 'react';
import {
    Trophy, Flame, Target, Brain, Skull, Crown, Diamond,
    Star, Zap, Award, Lock, CheckCircle
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { UserStats } from '../types';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    tier: 'bronze' | 'silver' | 'gold' | 'diamond';
    condition: (stats: UserStats) => boolean;
    progress?: (stats: UserStats) => { current: number; max: number };
}

const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Vinci la tua prima scommessa',
        icon: <Target size={24} />,
        tier: 'bronze',
        condition: (stats) => stats.bets.some(b => b.result === 'WIN'),
    },
    {
        id: 'on_fire',
        name: 'On Fire',
        description: '5 vittorie consecutive',
        icon: <Flame size={24} />,
        tier: 'gold',
        condition: (stats) => {
            let streak = 0;
            let maxStreak = 0;
            for (const bet of stats.bets.filter(b => b.result !== 'PENDING')) {
                if (bet.result === 'WIN') {
                    streak++;
                    maxStreak = Math.max(maxStreak, streak);
                } else {
                    streak = 0;
                }
            }
            return maxStreak >= 5;
        },
        progress: (stats) => {
            let streak = 0;
            for (const bet of [...stats.bets].reverse().filter(b => b.result !== 'PENDING')) {
                if (bet.result === 'WIN') streak++;
                else break;
            }
            return { current: Math.min(streak, 5), max: 5 };
        },
    },
    {
        id: 'diamond_hands',
        name: 'Diamond Hands',
        description: 'Vinci una scommessa a quota > 5.00',
        icon: <Diamond size={24} />,
        tier: 'diamond',
        condition: (stats) => stats.bets.some(b => b.result === 'WIN' && b.totalOdds > 5),
    },
    {
        id: 'analyst',
        name: 'Analyst',
        description: 'Salva 50 analisi',
        icon: <Brain size={24} />,
        tier: 'silver',
        condition: (stats) => {
            const archive = StorageService.getAllAnalyses();
            return Object.keys(archive).length >= 50;
        },
        progress: () => {
            const archive = StorageService.getAllAnalyses();
            return { current: Math.min(Object.keys(archive).length, 50), max: 50 };
        },
    },
    {
        id: 'profit_king',
        name: 'Profit King',
        description: 'Raggiungi €500 di profitto totale',
        icon: <Crown size={24} />,
        tier: 'gold',
        condition: (stats) => stats.netProfit >= 500,
        progress: (stats) => ({ current: Math.min(Math.max(stats.netProfit, 0), 500), max: 500 }),
    },
    {
        id: 'survivor',
        name: 'Survivor',
        description: 'Recupera da un drawdown del 30%',
        icon: <Skull size={24} />,
        tier: 'diamond',
        condition: (stats) => {
            // Check if ever had big loss then recovered
            let lowest = 0;
            let current = 0;
            for (const bet of stats.bets.filter(b => b.result !== 'PENDING')) {
                current += bet.profit;
                lowest = Math.min(lowest, current);
            }
            return lowest < -stats.totalWagered * 0.3 && stats.netProfit > 0;
        },
    },
    {
        id: 'high_roller',
        name: 'High Roller',
        description: 'Piazza 100 scommesse',
        icon: <Zap size={24} />,
        tier: 'silver',
        condition: (stats) => stats.bets.length >= 100,
        progress: (stats) => ({ current: Math.min(stats.bets.length, 100), max: 100 }),
    },
    {
        id: 'sharp',
        name: 'Sharp',
        description: 'Mantieni un ROI > 10%',
        icon: <Star size={24} />,
        tier: 'gold',
        condition: (stats) => {
            if (stats.totalWagered === 0) return false;
            const roi = (stats.netProfit / stats.totalWagered) * 100;
            return roi > 10 && stats.bets.length >= 20;
        },
    },
];

interface AchievementsProps {
    compact?: boolean;
}

export const Achievements: React.FC<AchievementsProps> = ({ compact = false }) => {
    const [stats, setStats] = useState<UserStats>({ totalWagered: 0, netProfit: 0, bets: [] });
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [newUnlock, setNewUnlock] = useState<string | null>(null);

    useEffect(() => {
        const userStats = StorageService.getStats();
        setStats(userStats);

        // Check which achievements are unlocked
        const unlocked = new Set<string>();
        ACHIEVEMENTS.forEach(ach => {
            if (ach.condition(userStats)) {
                unlocked.add(ach.id);
            }
        });
        setUnlockedIds(unlocked);
    }, []);

    const getTierClass = (tier: Achievement['tier']) => {
        switch (tier) {
            case 'bronze': return 'achievement-bronze';
            case 'silver': return 'achievement-silver';
            case 'gold': return 'achievement-gold';
            case 'diamond': return 'achievement-diamond';
        }
    };

    const getTierBg = (tier: Achievement['tier'], unlocked: boolean) => {
        if (!unlocked) return 'bg-gray-900/50';
        switch (tier) {
            case 'bronze': return 'bg-gradient-to-br from-amber-900/20 to-amber-800/10';
            case 'silver': return 'bg-gradient-to-br from-gray-600/20 to-gray-500/10';
            case 'gold': return 'bg-gradient-to-br from-yellow-600/20 to-amber-500/10';
            case 'diamond': return 'bg-gradient-to-br from-cyan-600/20 to-blue-500/10';
        }
    };

    const unlockedCount = unlockedIds.size;
    const totalCount = ACHIEVEMENTS.length;

    if (compact) {
        return (
            <div className="flex items-center gap-2 p-3 glass-card rounded-xl">
                <Trophy className="text-yellow-500" size={20} />
                <div>
                    <p className="text-sm font-semibold text-white">{unlockedCount}/{totalCount}</p>
                    <p className="text-xs text-gray-500">Achievements</p>
                </div>
                <div className="flex -space-x-1 ml-auto">
                    {ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)).slice(0, 3).map(ach => (
                        <div
                            key={ach.id}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${getTierBg(ach.tier, true)} border border-white/10`}
                        >
                            {React.cloneElement(ach.icon as React.ReactElement, { size: 12 })}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Trophy className="text-yellow-500" size={24} />
                    <div>
                        <h3 className="font-bold text-white">Achievements</h3>
                        <p className="text-xs text-gray-500">{unlockedCount} di {totalCount} sbloccati</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold gradient-text-gold">{Math.round((unlockedCount / totalCount) * 100)}%</p>
                </div>
            </div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = unlockedIds.has(ach.id);
                    const progress = ach.progress?.(stats);
                    const isNew = newUnlock === ach.id;

                    return (
                        <div
                            key={ach.id}
                            className={`achievement-badge ${isUnlocked ? 'unlocked' : 'locked'} ${isNew ? 'new' : ''} 
                ${getTierBg(ach.tier, isUnlocked)}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`${isUnlocked ? getTierClass(ach.tier) : 'text-gray-600'}`}>
                                    {ach.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                        {ach.name}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                        {ach.description}
                                    </p>

                                    {/* Progress Bar */}
                                    {progress && !isUnlocked && (
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{progress.current}</span>
                                                <span>{progress.max}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all"
                                                    style={{ width: `${(progress.current / progress.max) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {isUnlocked && (
                                        <div className="mt-2 flex items-center gap-1 text-green-500">
                                            <CheckCircle size={12} />
                                            <span className="text-xs">Sbloccato!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Achievements;

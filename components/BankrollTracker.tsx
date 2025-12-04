
import React, { useState, useEffect } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, AlertTriangle,
    Target, Settings, ChevronDown, ChevronUp, Calculator
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { UserStats } from '../types';

interface BankrollConfig {
    initialBankroll: number;
    currentBankroll: number;
    unitSize: number; // Percentage of bankroll per unit
    maxDailyLoss: number; // Percentage
    kellyFraction: number; // Usually 0.25 for quarter-Kelly
}

interface BankrollTrackerProps {
    compact?: boolean;
    onConfigChange?: (config: BankrollConfig) => void;
}

export const BankrollTracker: React.FC<BankrollTrackerProps> = ({
    compact = false,
    onConfigChange
}) => {
    const [config, setConfig] = useState<BankrollConfig>(() => {
        const saved = localStorage.getItem('redzone_bankroll');
        return saved ? JSON.parse(saved) : {
            initialBankroll: 1000,
            currentBankroll: 1000,
            unitSize: 2,
            maxDailyLoss: 10,
            kellyFraction: 0.25,
        };
    });

    const [stats, setStats] = useState<UserStats>({ totalWagered: 0, netProfit: 0, bets: [] });
    const [showSettings, setShowSettings] = useState(false);
    const [dailyPL, setDailyPL] = useState(0);

    useEffect(() => {
        const userStats = StorageService.getStats();
        setStats(userStats);

        // Calculate daily P/L
        const today = new Date().toDateString();
        const todayBets = userStats.bets.filter(b =>
            new Date(b.date).toDateString() === today && b.result !== 'PENDING'
        );
        const todayPL = todayBets.reduce((sum, b) => sum + b.profit, 0);
        setDailyPL(todayPL);

        // Update current bankroll based on actual P/L
        const newBankroll = config.initialBankroll + userStats.netProfit;
        if (newBankroll !== config.currentBankroll) {
            updateConfig({ currentBankroll: newBankroll });
        }
    }, []);

    const updateConfig = (updates: Partial<BankrollConfig>) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        localStorage.setItem('redzone_bankroll', JSON.stringify(newConfig));
        onConfigChange?.(newConfig);
    };

    // Calculate Kelly Criterion stake
    const calculateKellyStake = (probability: number, odds: number): number => {
        // Kelly formula: f* = (bp - q) / b
        // Where b = odds - 1, p = probability of winning, q = 1 - p
        const b = odds - 1;
        const p = probability / 100;
        const q = 1 - p;
        const kelly = (b * p - q) / b;

        // Apply fraction and clamp
        const fractionalKelly = kelly * config.kellyFraction;
        const stake = Math.max(0, Math.min(fractionalKelly, 0.1)) * config.currentBankroll;

        return Math.round(stake * 100) / 100;
    };

    // Health indicators
    const bankrollHealth = config.currentBankroll / config.initialBankroll;
    const healthStatus = bankrollHealth >= 1 ? 'healthy' : bankrollHealth >= 0.7 ? 'warning' : 'danger';
    const roi = stats.totalWagered > 0 ? (stats.netProfit / stats.totalWagered) * 100 : 0;
    const dailyLossLimit = config.currentBankroll * (config.maxDailyLoss / 100);
    const isNearDailyLimit = dailyPL < 0 && Math.abs(dailyPL) > dailyLossLimit * 0.7;
    const hitDailyLimit = dailyPL < 0 && Math.abs(dailyPL) >= dailyLossLimit;

    if (compact) {
        return (
            <div className={`glass-card p-3 rounded-xl ${hitDailyLimit ? 'border-red-500 animate-pulse' : ''}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className={`${healthStatus === 'healthy' ? 'text-green-500' : healthStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'}`} size={18} />
                        <span className={`font-bold ${config.currentBankroll >= config.initialBankroll ? 'bankroll-positive' : 'bankroll-negative'}`}>
                            €{config.currentBankroll.toFixed(0)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {dailyPL !== 0 && (
                            <span className={`text-xs font-medium ${dailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {dailyPL >= 0 ? '+' : ''}{dailyPL.toFixed(0)} oggi
                            </span>
                        )}
                        {hitDailyLimit && (
                            <AlertTriangle size={14} className="text-red-500 animate-bounce" />
                        )}
                    </div>
                </div>
                <div className="bankroll-bar mt-2">
                    <div
                        className={`bankroll-bar-fill ${healthStatus}`}
                        style={{ width: `${Math.min(bankrollHealth * 100, 100)}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl 
              ${healthStatus === 'healthy' ? 'bg-green-500/20' :
                                healthStatus === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                            <Wallet className={
                                healthStatus === 'healthy' ? 'text-green-500' :
                                    healthStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'
                            } size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Bankroll</h3>
                            <p className="text-xs text-gray-500">Money Management</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Settings size={18} className="text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Main Stats */}
            <div className="p-4">
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Saldo Attuale</p>
                        <p className={`text-3xl font-bold font-display ${config.currentBankroll >= config.initialBankroll ? 'bankroll-positive' : 'bankroll-negative'}`}>
                            €{config.currentBankroll.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-bold ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">P/L Totale</p>
                    </div>
                </div>

                {/* Health Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Salute Bankroll</span>
                        <span>{(bankrollHealth * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bankroll-bar">
                        <div
                            className={`bankroll-bar-fill ${healthStatus}`}
                            style={{ width: `${Math.min(bankrollHealth * 100, 150)}%` }}
                        />
                    </div>
                </div>

                {/* Daily Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-800/30 rounded-lg">
                        <p className={`text-lg font-bold ${dailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {dailyPL >= 0 ? '+' : ''}€{dailyPL.toFixed(0)}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">Oggi</p>
                    </div>
                    <div className="text-center p-2 bg-gray-800/30 rounded-lg">
                        <p className={`text-lg font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {roi.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">ROI</p>
                    </div>
                    <div className="text-center p-2 bg-gray-800/30 rounded-lg">
                        <p className="text-lg font-bold text-white">
                            €{(config.currentBankroll * config.unitSize / 100).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">1 Unit</p>
                    </div>
                </div>

                {/* Warnings */}
                {hitDailyLimit && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl mb-4 flex items-center gap-3">
                        <AlertTriangle className="text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-red-400">Limite Giornaliero Raggiunto!</p>
                            <p className="text-xs text-gray-400">Hai perso €{Math.abs(dailyPL).toFixed(0)} oggi. Fermati qui.</p>
                        </div>
                    </div>
                )}

                {isNearDailyLimit && !hitDailyLimit && (
                    <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-xl mb-4 flex items-center gap-3">
                        <AlertTriangle className="text-yellow-500 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-yellow-400">Attenzione al Limite</p>
                            <p className="text-xs text-gray-400">
                                Sei al {Math.round((Math.abs(dailyPL) / dailyLossLimit) * 100)}% del limite giornaliero
                            </p>
                        </div>
                    </div>
                )}

                {/* Kelly Calculator */}
                <div className="p-3 bg-gray-800/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Calculator size={16} className="text-gray-400" />
                        <span className="text-sm font-semibold text-white">Kelly Calculator</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500">Win Prob (%)</label>
                            <input
                                type="number"
                                className="w-full mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                                placeholder="60"
                                id="kelly-prob"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Quota</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                                placeholder="2.00"
                                id="kelly-odds"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const prob = parseFloat((document.getElementById('kelly-prob') as HTMLInputElement)?.value || '0');
                            const odds = parseFloat((document.getElementById('kelly-odds') as HTMLInputElement)?.value || '0');
                            if (prob && odds) {
                                const stake = calculateKellyStake(prob, odds);
                                alert(`Stake consigliato (Quarter-Kelly): €${stake.toFixed(2)}`);
                            }
                        }}
                        className="w-full mt-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold text-sm transition-colors"
                    >
                        Calcola Stake
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-4 border-t border-gray-800/50 bg-gray-900/50">
                    <h4 className="font-semibold text-white mb-3">Impostazioni</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">Bankroll Iniziale (€)</label>
                            <input
                                type="number"
                                value={config.initialBankroll}
                                onChange={(e) => updateConfig({ initialBankroll: parseFloat(e.target.value) || 0 })}
                                className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Unit Size (% del bankroll)</label>
                            <input
                                type="number"
                                value={config.unitSize}
                                onChange={(e) => updateConfig({ unitSize: parseFloat(e.target.value) || 2 })}
                                className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Max Loss Giornaliero (%)</label>
                            <input
                                type="number"
                                value={config.maxDailyLoss}
                                onChange={(e) => updateConfig({ maxDailyLoss: parseFloat(e.target.value) || 10 })}
                                className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankrollTracker;

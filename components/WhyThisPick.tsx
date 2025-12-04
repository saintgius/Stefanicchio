
import React, { useState } from 'react';
import { HelpCircle, ChevronDown, TrendingUp, TrendingDown, Minus, Zap, Target, BarChart3, Shield, Flame } from 'lucide-react';

interface WhyPickReason {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
}

interface WhyThisPickProps {
    reasons: WhyPickReason[];
    recommendedBet?: string;
    compact?: boolean;
}

export const WhyThisPick: React.FC<WhyThisPickProps> = ({
    reasons,
    recommendedBet,
    compact = false
}) => {
    const [expanded, setExpanded] = useState(!compact);

    const getImpactIcon = (impact: string) => {
        switch (impact) {
            case 'positive': return <TrendingUp size={14} className="text-green-400" />;
            case 'negative': return <TrendingDown size={14} className="text-red-400" />;
            default: return <Minus size={14} className="text-gray-400" />;
        }
    };

    const getFactorIcon = (factor: string) => {
        if (factor.includes('Form')) return <Flame size={14} />;
        if (factor.includes('Classifica')) return <BarChart3 size={14} />;
        if (factor.includes('Casa')) return <Shield size={14} />;
        if (factor.includes('xG')) return <Target size={14} />;
        if (factor.includes('Value')) return <Zap size={14} />;
        return <HelpCircle size={14} />;
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'positive': return 'border-green-500/30 bg-green-900/10';
            case 'negative': return 'border-red-500/30 bg-red-900/10';
            default: return 'border-gray-500/30 bg-gray-900/10';
        }
    };

    const sortedReasons = [...reasons].sort((a, b) => b.weight - a.weight);
    const topReasons = compact ? sortedReasons.slice(0, 2) : sortedReasons;

    if (reasons.length === 0) {
        return null;
    }

    return (
        <div className="glass-card rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/20">
                        <HelpCircle size={16} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-white">Perché questa scelta?</p>
                        <p className="text-[10px] text-gray-500">{reasons.length} fattori analizzati</p>
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Content */}
            {expanded && (
                <div className="p-3 pt-0 space-y-2 animate-fade-in">
                    {/* Recommended Bet Badge */}
                    {recommendedBet && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-purple-900/30 to-purple-800/20 border border-purple-500/30">
                            <Zap size={14} className="text-purple-400" />
                            <span className="text-xs text-purple-300">
                                Suggerimento: <span className="font-bold text-white">{recommendedBet}</span>
                            </span>
                        </div>
                    )}

                    {/* Reasons List */}
                    <div className="space-y-1.5">
                        {topReasons.map((reason, index) => (
                            <div
                                key={index}
                                className={`flex items-start gap-2 p-2 rounded-lg border ${getImpactColor(reason.impact)}`}
                            >
                                {/* Weight indicator */}
                                <div className="shrink-0 mt-0.5">
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-1 h-3 rounded-full ${i < Math.ceil(reason.weight / 2)
                                                        ? reason.impact === 'positive' ? 'bg-green-500'
                                                            : reason.impact === 'negative' ? 'bg-red-500'
                                                                : 'bg-gray-500'
                                                        : 'bg-gray-800'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`${reason.impact === 'positive' ? 'text-green-400'
                                                : reason.impact === 'negative' ? 'text-red-400'
                                                    : 'text-gray-400'
                                            }`}>
                                            {getFactorIcon(reason.factor)}
                                        </span>
                                        <span className="text-xs font-semibold text-white">{reason.factor}</span>
                                        {getImpactIcon(reason.impact)}
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-relaxed">
                                        {reason.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    {reasons.length > 0 && (
                        <div className="pt-2 border-t border-gray-800/50 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">
                                {reasons.filter(r => r.impact === 'positive').length} pro / {' '}
                                {reasons.filter(r => r.impact === 'negative').length} contro
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-500">Forza segnale:</span>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full ${i < Math.min(Math.ceil(reasons.reduce((acc, r) => acc + (r.impact === 'positive' ? r.weight : 0), 0) / 10), 5)
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WhyThisPick;

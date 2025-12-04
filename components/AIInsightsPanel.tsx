
import React, { useState, useEffect } from 'react';
import {
    Brain, Flame, TrendingUp, AlertTriangle, Trophy, Target,
    ChevronRight, Sparkles, Zap, Award
} from 'lucide-react';
import { ProcessedMatch } from '../types';
import { PredictionEngine } from '../services/prediction-engine';
import { StorageService } from '../services/storage';

interface AIInsight {
    type: 'bet_of_day' | 'value_alert' | 'upset_warning' | 'trend';
    title: string;
    description: string;
    match?: string;
    confidence: number;
    odds?: number;
    edge?: number;
}

interface AIInsightsPanelProps {
    matches: ProcessedMatch[];
    league: 'SA' | 'PL' | 'CL';
    onSelectMatch?: (matchId: string) => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
    matches,
    league,
    onSelectMatch
}) => {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        generateInsights();
    }, [matches, league]);

    const generateInsights = () => {
        setLoading(true);
        const newInsights: AIInsight[] = [];
        const standings = StorageService.getStandings(league);

        matches.forEach(match => {
            try {
                const prediction = PredictionEngine.generatePrediction(match, league);

                // Check for value bets
                prediction.valueEdges.forEach(edge => {
                    if (edge.isValue && edge.edge > 5) {
                        newInsights.push({
                            type: edge.edge > 10 ? 'bet_of_day' : 'value_alert',
                            title: edge.edge > 10 ? '🔥 Bet of the Day' : '💎 Value Found',
                            description: `${match.homeTeam} vs ${match.awayTeam}: ${edge.market} ha un edge del ${edge.edge.toFixed(1)}%`,
                            match: match.id,
                            confidence: prediction.confidence_score || 70,
                            odds: edge.market === '1' ? match.odds.home : edge.market === 'X' ? match.odds.draw : match.odds.away,
                            edge: edge.edge,
                        });
                    }
                });

                // Check for potential upsets
                const homeStats = standings.find(s =>
                    match.homeTeam.toLowerCase().includes(s.team.name.toLowerCase().split(' ')[0])
                );
                const awayStats = standings.find(s =>
                    match.awayTeam.toLowerCase().includes(s.team.name.toLowerCase().split(' ')[0])
                );

                if (homeStats && awayStats) {
                    const positionDiff = homeStats.position - awayStats.position;

                    // Big underdog at home with good form
                    if (positionDiff > 10 && prediction.formScore.home > 60) {
                        newInsights.push({
                            type: 'upset_warning',
                            title: '⚠️ Upset Alert',
                            description: `${match.homeTeam} (${homeStats.position}°) in casa contro ${match.awayTeam} (${awayStats.position}°) - Form casa forte!`,
                            match: match.id,
                            confidence: 60,
                            odds: match.odds.home,
                        });
                    }
                }
            } catch (e) {
                // Skip if prediction fails
            }
        });

        // Sort by importance (bet_of_day first, then by edge)
        newInsights.sort((a, b) => {
            if (a.type === 'bet_of_day' && b.type !== 'bet_of_day') return -1;
            if (b.type === 'bet_of_day' && a.type !== 'bet_of_day') return 1;
            return (b.edge || 0) - (a.edge || 0);
        });

        setInsights(newInsights.slice(0, 5));
        setLoading(false);
    };

    const getInsightIcon = (type: AIInsight['type']) => {
        switch (type) {
            case 'bet_of_day': return <Flame className="text-orange-500" />;
            case 'value_alert': return <Target className="text-green-500" />;
            case 'upset_warning': return <AlertTriangle className="text-yellow-500" />;
            case 'trend': return <TrendingUp className="text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="insights-panel p-4 mb-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-900/30" />
                    <div className="flex-1">
                        <div className="h-4 bg-gray-800 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-800 rounded w-48" />
                    </div>
                </div>
                <div className="h-20 bg-gray-800/50 rounded-xl" />
            </div>
        );
    }

    if (insights.length === 0) {
        return null;
    }

    return (
        <div className="insights-panel p-4 mb-6">
            {/* Header */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between mb-4"
            >
                <div className="flex items-center gap-3">
                    <div className="stefanicchio-avatar w-10 h-10 text-xl">
                        🧠
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            AI Insights
                            <Sparkles size={14} className="text-yellow-500" />
                        </h3>
                        <p className="text-xs text-gray-400">{insights.length} opportunità trovate</p>
                    </div>
                </div>
                <ChevronRight
                    size={20}
                    className={`text-gray-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                />
            </button>

            {/* Insights List */}
            {!collapsed && (
                <div className="space-y-3">
                    {insights.map((insight, index) => (
                        <div
                            key={index}
                            onClick={() => insight.match && onSelectMatch?.(insight.match)}
                            className={`${insight.type === 'bet_of_day' ? 'bet-of-day' : 'glass-light'} 
                p-3 rounded-xl cursor-pointer hover:border-red-500/50 transition-all
                ${insight.match ? 'hover:scale-[1.02]' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                    {getInsightIcon(insight.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-white">{insight.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                        {insight.description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        {insight.odds && (
                                            <span className="text-xs font-mono bg-gray-800 px-2 py-0.5 rounded text-green-400">
                                                @{insight.odds.toFixed(2)}
                                            </span>
                                        )}
                                        {insight.edge && (
                                            <span className="text-xs font-semibold text-green-400">
                                                +{insight.edge.toFixed(1)}% edge
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500">
                                            {insight.confidence}% confidence
                                        </span>
                                    </div>
                                </div>
                                {insight.match && (
                                    <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Stats */}
            {!collapsed && insights.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800/50">
                    <div className="flex items-center justify-around text-center">
                        <div>
                            <p className="text-lg font-bold text-green-400">
                                {insights.filter(i => i.type === 'value_alert' || i.type === 'bet_of_day').length}
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Value Bets</p>
                        </div>
                        <div className="w-px h-8 bg-gray-800" />
                        <div>
                            <p className="text-lg font-bold text-yellow-400">
                                {insights.filter(i => i.type === 'upset_warning').length}
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Upsets</p>
                        </div>
                        <div className="w-px h-8 bg-gray-800" />
                        <div>
                            <p className="text-lg font-bold gradient-text-gold">
                                {insights[0]?.edge?.toFixed(0) || 0}%
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Top Edge</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIInsightsPanel;

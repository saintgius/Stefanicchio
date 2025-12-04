
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { BetRecord } from '../types';

interface ProfitChartProps {
    bets: BetRecord[];
    period?: 'week' | 'month' | 'all';
}

export const ProfitChart: React.FC<ProfitChartProps> = ({ bets, period = 'all' }) => {
    const chartData = useMemo(() => {
        // Filter bets by period
        const now = new Date();
        const filteredBets = bets.filter(bet => {
            if (bet.result === 'PENDING') return false;
            const betDate = new Date(bet.date);
            if (period === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return betDate >= weekAgo;
            }
            if (period === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return betDate >= monthAgo;
            }
            return true;
        });

        // Sort by date
        const sortedBets = [...filteredBets].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate cumulative profit
        let cumulative = 0;
        const data = sortedBets.map((bet, index) => {
            cumulative += bet.profit;
            return {
                name: new Date(bet.date).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit'
                }),
                profit: cumulative,
                dailyPL: bet.profit,
                bets: 1,
                fullDate: bet.date,
            };
        });

        // Group by date
        const groupedData: { [key: string]: typeof data[0] } = {};
        data.forEach(item => {
            if (groupedData[item.name]) {
                groupedData[item.name].profit = item.profit;
                groupedData[item.name].dailyPL += item.dailyPL;
                groupedData[item.name].bets += 1;
            } else {
                groupedData[item.name] = { ...item };
            }
        });

        return Object.values(groupedData);
    }, [bets, period]);

    const currentProfit = chartData.length > 0 ? chartData[chartData.length - 1].profit : 0;
    const isPositive = currentProfit >= 0;
    const maxProfit = Math.max(...chartData.map(d => d.profit), 0);
    const minProfit = Math.min(...chartData.map(d => d.profit), 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;

        const data = payload[0].payload;
        return (
            <div className="chart-tooltip p-3">
                <p className="text-xs text-gray-400 mb-1">{data.name}</p>
                <p className={`font-bold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.profit >= 0 ? '+' : ''}€{data.profit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {data.bets} scommess{data.bets === 1 ? 'a' : 'e'} •
                    {data.dailyPL >= 0 ? ' +' : ' '}€{data.dailyPL.toFixed(2)} oggi
                </p>
            </div>
        );
    };

    if (chartData.length < 2) {
        return (
            <div className="glass-card p-6 rounded-2xl text-center">
                <Calendar className="mx-auto text-gray-600 mb-3" size={32} />
                <p className="text-gray-500">Non abbastanza dati</p>
                <p className="text-xs text-gray-600 mt-1">Continua a piazzare scommesse per vedere i grafici</p>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isPositive ? (
                            <div className="p-2 bg-green-500/20 rounded-xl">
                                <TrendingUp className="text-green-500" size={20} />
                            </div>
                        ) : (
                            <div className="p-2 bg-red-500/20 rounded-xl">
                                <TrendingDown className="text-red-500" size={20} />
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Profit/Loss</p>
                            <p className={`text-2xl font-bold ${isPositive ? 'bankroll-positive' : 'bankroll-negative'}`}>
                                {isPositive ? '+' : ''}€{currentProfit.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">
                            {period === 'week' ? '7 giorni' : period === 'month' ? '30 giorni' : 'Tutto'}
                        </p>
                        <p className="text-sm text-gray-400">{chartData.length} giorni</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-4">
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                tickFormatter={(value) => `€${value}`}
                                domain={[minProfit * 1.1, maxProfit * 1.1]}
                            />

                            <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />

                            <Tooltip content={<CustomTooltip />} cursor={false} />

                            <Area
                                type="monotone"
                                dataKey="profit"
                                stroke={isPositive ? '#10b981' : '#ef4444'}
                                strokeWidth={2}
                                fill={isPositive ? 'url(#profitGradient)' : 'url(#lossGradient)'}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats Row */}
                <div className="flex justify-around mt-4 pt-4 border-t border-gray-800/50">
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Max Profit</p>
                        <p className="font-bold text-green-400">+€{maxProfit.toFixed(0)}</p>
                    </div>
                    <div className="w-px h-10 bg-gray-800" />
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Max Drawdown</p>
                        <p className="font-bold text-red-400">€{minProfit.toFixed(0)}</p>
                    </div>
                    <div className="w-px h-10 bg-gray-800" />
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Scommesse</p>
                        <p className="font-bold text-white">{bets.filter(b => b.result !== 'PENDING').length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitChart;


import React from 'react';

interface SparklineProps {
    data: { value: number; label?: string }[];
    width?: number;
    height?: number;
    color?: string;
    showDots?: boolean;
    showArea?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    width = 120,
    height = 40,
    color = '#a855f7',
    showDots = true,
    showArea = true
}) => {
    if (data.length === 0) return null;

    const padding = 4;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;

    const points = data.map((d, i) => ({
        x: padding + (i / (data.length - 1 || 1)) * effectiveWidth,
        y: padding + effectiveHeight - ((d.value - minValue) / range) * effectiveHeight,
        value: d.value
    }));

    const linePath = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area fill */}
            {showArea && (
                <path
                    d={areaPath}
                    fill="url(#sparklineGradient)"
                />
            )}

            {/* Line */}
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Dots */}
            {showDots && points.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === points.length - 1 ? 4 : 2}
                    fill={i === points.length - 1 ? color : 'white'}
                    stroke={color}
                    strokeWidth="1"
                    className={i === points.length - 1 ? 'animate-pulse' : ''}
                />
            ))}
        </svg>
    );
};

// H2H Specific Trend Chart
interface H2HTrendChartProps {
    matches: { homeGoals: number; awayGoals: number; date: string }[];
    homeTeam: string;
    awayTeam: string;
}

export const H2HTrendChart: React.FC<H2HTrendChartProps> = ({
    matches,
    homeTeam,
    awayTeam
}) => {
    // Convert matches to goal difference trend (positive = home team advantage)
    const trendData = matches.map(m => ({
        value: m.homeGoals - m.awayGoals,
        label: `${m.homeGoals}-${m.awayGoals}`
    })).reverse(); // Oldest first for left-to-right

    const totalGoalsData = matches.map(m => ({
        value: m.homeGoals + m.awayGoals,
        label: `${m.homeGoals + m.awayGoals} gol`
    })).reverse();

    if (matches.length < 2) return null;

    const avgGoals = totalGoalsData.reduce((acc, d) => acc + d.value, 0) / totalGoalsData.length;
    const lastResult = matches[0];
    const trend = trendData.length > 1
        ? trendData[trendData.length - 1].value - trendData[0].value
        : 0;

    return (
        <div className="glass-light rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Trend H2H</span>
                <span className={`text-[10px] font-bold ${avgGoals > 2.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                    Ø {avgGoals.toFixed(1)} gol
                </span>
            </div>

            {/* Goal Difference Sparkline */}
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <Sparkline
                        data={trendData}
                        width={100}
                        height={32}
                        color={trend >= 0 ? '#3b82f6' : '#ef4444'}
                        showDots={true}
                        showArea={true}
                    />
                </div>

                {/* Legend */}
                <div className="text-right">
                    <p className="text-xs font-bold text-white">
                        {lastResult.homeGoals}-{lastResult.awayGoals}
                    </p>
                    <p className="text-[10px] text-gray-500">Ultimo</p>
                </div>
            </div>

            {/* Team Legend */}
            <div className="flex justify-between mt-2 text-[9px]">
                <span className="text-blue-400">↑ {homeTeam}</span>
                <span className="text-red-400">↓ {awayTeam}</span>
            </div>
        </div>
    );
};

export default Sparkline;

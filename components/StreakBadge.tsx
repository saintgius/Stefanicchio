
import React from 'react';
import { Flame, Snowflake, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StreakBadgeProps {
    streak: number; // Positive = wins, Negative = losses
    form?: string; // e.g., "W,W,D,L,W"
    compact?: boolean;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, form, compact = false }) => {
    const isHot = streak >= 3;
    const isCold = streak <= -3;
    const isNeutral = !isHot && !isCold;

    // Parse form string if provided
    const formArray = form ? form.split(',').slice(0, 5) : [];

    const getFormDot = (result: string, index: number) => {
        const colors = {
            'W': 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
            'D': 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
            'L': 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
        };
        return (
            <div
                key={index}
                className={`w-2 h-2 rounded-full ${colors[result as keyof typeof colors] || 'bg-gray-600'} transition-all duration-300`}
                style={{ animationDelay: `${index * 100}ms` }}
            />
        );
    };

    if (compact) {
        return (
            <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all duration-300
          ${isHot ? 'streak-hot text-white' : ''}
          ${isCold ? 'streak-cold text-white' : ''}
          ${isNeutral ? 'bg-gray-800/60 text-gray-400' : ''}`}
            >
                {isHot && <Flame size={12} className="animate-pulse" />}
                {isCold && <Snowflake size={12} className="animate-pulse" />}
                {isNeutral && streak > 0 && <TrendingUp size={12} />}
                {isNeutral && streak < 0 && <TrendingDown size={12} />}
                {isNeutral && streak === 0 && <Minus size={12} />}
                <span>{Math.abs(streak)}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Main Streak Badge */}
            <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-300
          ${isHot ? 'streak-hot text-white' : ''}
          ${isCold ? 'streak-cold text-white' : ''}
          ${isNeutral ? 'glass-light text-gray-300' : ''}`}
            >
                {isHot && (
                    <>
                        <Flame size={16} className="animate-pulse" />
                        <span>🔥 {streak} Wins</span>
                    </>
                )}
                {isCold && (
                    <>
                        <Snowflake size={16} className="animate-pulse" />
                        <span>❄️ {Math.abs(streak)} Losses</span>
                    </>
                )}
                {isNeutral && (
                    <>
                        {streak > 0 ? (
                            <><TrendingUp size={16} className="text-green-500" /><span>{streak}W</span></>
                        ) : streak < 0 ? (
                            <><TrendingDown size={16} className="text-red-500" /><span>{Math.abs(streak)}L</span></>
                        ) : (
                            <><Minus size={16} className="text-gray-500" /><span>Even</span></>
                        )}
                    </>
                )}
            </div>

            {/* Form Display */}
            {formArray.length > 0 && (
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Form:</span>
                    {formArray.map((result, index) => getFormDot(result.trim(), index))}
                </div>
            )}
        </div>
    );
};

export default StreakBadge;

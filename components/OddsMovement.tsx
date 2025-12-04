
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface OddsMovementProps {
    currentOdds: number;
    previousOdds?: number;
    showDelta?: boolean;
    size?: 'sm' | 'md';
}

export const OddsMovement: React.FC<OddsMovementProps> = ({
    currentOdds,
    previousOdds,
    showDelta = true,
    size = 'md'
}) => {
    if (!previousOdds || previousOdds === currentOdds) {
        return (
            <span className={`font-mono font-bold ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
                {currentOdds.toFixed(2)}
            </span>
        );
    }

    const delta = currentOdds - previousOdds;
    const percentChange = ((delta / previousOdds) * 100).toFixed(1);
    const isRising = delta > 0;

    return (
        <div className="inline-flex flex-col items-end gap-0.5">
            <span className={`font-mono font-bold ${size === 'sm' ? 'text-sm' : 'text-base'}
        ${isRising ? 'odds-rising' : 'odds-falling'}`}>
                {currentOdds.toFixed(2)}
            </span>

            {showDelta && (
                <span className={`odds-arrow ${isRising ? 'up' : 'down'}`}>
                    {isRising ? (
                        <TrendingUp size={10} />
                    ) : (
                        <TrendingDown size={10} />
                    )}
                    <span>{isRising ? '+' : ''}{percentChange}%</span>
                </span>
            )}
        </div>
    );
};

// Component for displaying odds with their provider
interface OddsDisplayProps {
    odds: number;
    previousOdds?: number;
    provider?: string;
    label?: string;
    isSelected?: boolean;
    onClick?: () => void;
}

export const OddsDisplay: React.FC<OddsDisplayProps> = ({
    odds,
    previousOdds,
    provider,
    label,
    isSelected = false,
    onClick
}) => {
    const hasMovement = previousOdds && previousOdds !== odds;
    const isRising = hasMovement && odds > previousOdds;

    return (
        <button
            onClick={onClick}
            className={`flex-1 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
        ${isSelected
                    ? 'bg-red-600 border-red-500 shadow-glow-red'
                    : 'glass-light hover:bg-white/5 border-transparent'}
        border`}
        >
            {label && (
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            )}

            <div className="flex items-center justify-center gap-1">
                <span className={`font-mono font-bold text-lg
          ${isSelected ? 'text-white' : hasMovement ? (isRising ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                    {odds.toFixed(2)}
                </span>

                {hasMovement && (
                    <span className={`${isRising ? 'text-green-400' : 'text-red-400'}`}>
                        {isRising ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    </span>
                )}
            </div>

            {provider && (
                <p className="text-[9px] text-gray-500 mt-1 truncate">{provider}</p>
            )}
        </button>
    );
};

export default OddsMovement;

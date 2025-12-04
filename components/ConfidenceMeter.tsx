
import React from 'react';

interface ConfidenceMeterProps {
    value: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    animated?: boolean;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
    value,
    size = 'md',
    showLabel = true,
    animated = true
}) => {
    // Size configurations
    const sizes = {
        sm: { width: 80, stroke: 6, fontSize: 'text-lg' },
        md: { width: 120, stroke: 8, fontSize: 'text-2xl' },
        lg: { width: 160, stroke: 10, fontSize: 'text-4xl' }
    };

    const config = sizes[size];
    const radius = (config.width - config.stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    // Color based on value
    const getColor = () => {
        if (value >= 70) return { stroke: '#22c55e', glow: 'rgba(34,197,94,0.5)', text: 'text-green-500' };
        if (value >= 45) return { stroke: '#eab308', glow: 'rgba(234,179,8,0.5)', text: 'text-yellow-500' };
        return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.5)', text: 'text-red-500' };
    };

    const color = getColor();

    // Rating text
    const getRating = () => {
        if (value >= 80) return 'ELITE';
        if (value >= 65) return 'ALTA';
        if (value >= 50) return 'MEDIA';
        if (value >= 35) return 'BASSA';
        return 'RISCHIO';
    };

    return (
        <div className="relative flex flex-col items-center">
            <div
                className="relative"
                style={{ width: config.width, height: config.width }}
            >
                {/* Background Ring */}
                <svg
                    className="absolute transform -rotate-90"
                    width={config.width}
                    height={config.width}
                >
                    <circle
                        cx={config.width / 2}
                        cy={config.width / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={config.stroke}
                    />
                </svg>

                {/* Animated Progress Ring */}
                <svg
                    className={`absolute transform -rotate-90 ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
                    width={config.width}
                    height={config.width}
                    style={{ filter: `drop-shadow(0 0 10px ${color.glow})` }}
                >
                    <defs>
                        <linearGradient id={`gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={color.stroke} stopOpacity="1" />
                            <stop offset="100%" stopColor={color.stroke} stopOpacity="0.6" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={config.width / 2}
                        cy={config.width / 2}
                        r={radius}
                        fill="none"
                        stroke={`url(#gradient-${value})`}
                        strokeWidth={config.stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={animated ? offset : 0}
                        className={animated ? 'animate-[dash_1s_ease-out_forwards]' : ''}
                        style={{
                            transition: animated ? 'stroke-dashoffset 1s ease-out' : 'none'
                        }}
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-black ${config.fontSize} ${color.text} tracking-tight`}>
                        {value}
                    </span>
                    {showLabel && (
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                            {getRating()}
                        </span>
                    )}
                </div>

                {/* Glow Effect */}
                <div
                    className="absolute inset-0 rounded-full opacity-20 blur-xl"
                    style={{ backgroundColor: color.stroke }}
                />
            </div>
        </div>
    );
};

export default ConfidenceMeter;

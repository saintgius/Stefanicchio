
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label?: string;
    };
    color?: 'default' | 'success' | 'danger' | 'warning' | 'gold';
    size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
    default: 'text-white',
    success: 'text-green-400 bankroll-positive',
    danger: 'text-red-400 bankroll-negative',
    warning: 'text-yellow-400',
    gold: 'gradient-text-gold',
};

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    trend,
    color = 'default',
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const valueSizes = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-4xl',
    };

    return (
        <div className={`stat-card ${sizeClasses[size]} group`}>
            {/* Background Icon */}
            {icon && (
                <div className="stat-card-icon group-hover:opacity-20 transition-opacity">
                    {icon}
                </div>
            )}

            {/* Label */}
            <p className="stat-label mb-2">{label}</p>

            {/* Value */}
            <p className={`stat-value ${valueSizes[size]} ${colorClasses[color]}`}>
                {value}
            </p>

            {/* Trend */}
            {trend && (
                <div className="mt-3 flex items-center gap-2">
                    <span className={`stat-trend ${trend.value >= 0 ? 'positive' : 'negative'}`}>
                        {trend.value >= 0 ? (
                            <TrendingUp size={12} />
                        ) : (
                            <TrendingDown size={12} />
                        )}
                        <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
                    </span>
                    {trend.label && (
                        <span className="text-xs text-gray-500">{trend.label}</span>
                    )}
                </div>
            )}
        </div>
    );
};

// Stats Grid Component
interface StatsGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ children, columns = 2 }) => {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-4',
    };

    return (
        <div className={`grid ${gridCols[columns]} gap-4`}>
            {children}
        </div>
    );
};

export default StatCard;

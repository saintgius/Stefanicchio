
import React from 'react';

interface SkeletonCardProps {
    variant?: 'match' | 'stat' | 'insight';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'match' }) => {
    if (variant === 'stat') {
        return (
            <div className="stat-card animate-pulse">
                <div className="skeleton skeleton-avatar mb-4" />
                <div className="skeleton skeleton-title mb-2" style={{ width: '50%' }} />
                <div className="skeleton skeleton-text" style={{ width: '30%' }} />
            </div>
        );
    }

    if (variant === 'insight') {
        return (
            <div className="insights-panel p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="flex-1">
                        <div className="skeleton skeleton-title mb-2" />
                        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                    </div>
                </div>
                <div className="skeleton h-24 rounded-xl" />
            </div>
        );
    }

    // Default: Match Card Skeleton
    return (
        <div className="premium-card p-4 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="skeleton skeleton-text" style={{ width: '80px' }} />
                <div className="skeleton skeleton-text" style={{ width: '60px' }} />
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-lg" />
                    <div className="skeleton skeleton-text" style={{ width: '100px' }} />
                </div>
                <div className="skeleton skeleton-text" style={{ width: '20px' }} />
                <div className="flex items-center gap-3">
                    <div className="skeleton skeleton-text" style={{ width: '100px' }} />
                    <div className="skeleton w-10 h-10 rounded-lg" />
                </div>
            </div>

            {/* Odds */}
            <div className="flex gap-2 mb-4">
                <div className="skeleton h-12 flex-1 rounded-xl" />
                <div className="skeleton h-12 flex-1 rounded-xl" />
                <div className="skeleton h-12 flex-1 rounded-xl" />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center">
                <div className="skeleton skeleton-text" style={{ width: '120px' }} />
                <div className="skeleton w-8 h-8 rounded-full" />
            </div>
        </div>
    );
};

// Multiple skeletons for loading state
export const SkeletonList: React.FC<{ count?: number; variant?: 'match' | 'stat' | 'insight' }> = ({
    count = 3,
    variant = 'match'
}) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} variant={variant} />
        ))}
    </div>
);

export default SkeletonCard;

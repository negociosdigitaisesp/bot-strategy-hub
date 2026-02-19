import React from 'react';
import { StrategyCard } from './StrategyCard';
import { StrategyPerformance } from '../../hooks/useBotAstron';

interface StrategyGridProps {
    strategies: StrategyPerformance[];
    isRunning: boolean;
    onToggleStrategy: (id: number) => void;
}

export const StrategyGrid: React.FC<StrategyGridProps> = ({ strategies, isRunning, onToggleStrategy }) => {
    // Sort by syncScore desc
    const sortedStrategies = [...strategies].sort((a, b) => b.syncScore - a.syncScore);

    // Determine grid columns based on count
    const gridCols = sortedStrategies.length === 1
        ? 'grid-cols-1 max-w-4xl mx-auto' // Single card: Centered, max width for readability
        : sortedStrategies.length === 2
            ? 'grid-cols-1 md:grid-cols-2' // Two cards: Side by side
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'; // 3+ cards: Standard grid

    return (
        <div className={`grid ${gridCols} gap-6 w-full`}>
            {sortedStrategies.map((strategy, index) => (
                <StrategyCard
                    key={strategy.id}
                    rank={index + 1}
                    index={index}
                    strategy={strategy}
                    isRunning={isRunning}
                    onToggle={onToggleStrategy}
                />
            ))}
        </div>
    );
};

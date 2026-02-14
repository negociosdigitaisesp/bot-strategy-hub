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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {sortedStrategies.map((strategy, index) => (
                <StrategyCard
                    key={strategy.id}
                    rank={index + 1}
                    strategy={strategy}
                    isRunning={isRunning}
                    onToggle={onToggleStrategy}
                />
            ))}
        </div>
    );
};

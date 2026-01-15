import React from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard = ({ title, value, icon, trend, className }: StatCardProps) => {
  return (
    <div className={cn("stat-card glass-premium hover-lift animate-scale-in group", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
          {icon}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold tabular-nums animate-slide-up" style={{ animationDelay: '0.1s' }}>{value}</p>
          {trend && (
            <p className={cn(
              "text-xs flex items-center gap-1 mt-1",
              trend.isPositive ? "text-success" : "text-danger"
            )}>
              <span className={cn(
                "inline-block transition-transform duration-300",
                trend.isPositive ? "group-hover:-translate-y-0.5" : "group-hover:translate-y-0.5"
              )}>
                {trend.isPositive ? "↑" : "↓"}
              </span>
              {Math.abs(trend.value)}%
              <span className="text-muted-foreground">vs. último mes</span>
            </p>
          )}
        </div>

        <div className="h-10 w-10 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  colorClass: string; // e.g., text-green-500
  bgClass?: string; // Optional custom bg opacity
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon: Icon, colorClass, bgClass }) => {
  return (
    <div className="bg-surfaceHighlight border border-gray-800 rounded-xl p-5 flex flex-col justify-between h-full relative overflow-hidden group hover:border-gray-700 transition-colors">
      <div className={`absolute top-0 right-0 p-2 opacity-10 ${colorClass}`}>
          {Icon && <Icon size={48} />}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
         {Icon && (
             <div className={`p-1.5 rounded-full bg-opacity-10 ${bgClass || 'bg-gray-700'} ${colorClass}`}>
                 <Icon size={14} />
             </div>
         )}
         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>

      <div className="flex items-baseline gap-1 relative z-10">
        <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
        {subValue && <span className="text-sm text-gray-500 font-medium">{subValue}</span>}
      </div>
    </div>
  );
};
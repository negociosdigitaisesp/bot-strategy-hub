import React from 'react';
import { LogEntry } from '../types';
import { Activity, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface ActivityLogProps {
  logs: LogEntry[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="bg-surfaceHighlight border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#1A1E24]">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Activity size={18} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-white">REGISTRO DE ACTIVIDAD</h3>
                <p className="text-xs text-gray-500">Eventos en tiempo real</p>
            </div>
        </div>
        <span className="text-xs text-gray-600">{logs.length} eventos</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Activity size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Esperando inicio de operaciones...</p>
            </div>
        )}
        
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`
                relative pl-4 pr-3 py-3 rounded-lg border border-gray-800/50 bg-[#15191E]
                ${log.type === 'SUCCESS' ? 'border-l-green-500' : ''}
                ${log.type === 'ERROR' ? 'border-l-red-500' : ''}
                ${log.type === 'INFO' ? 'border-l-blue-500' : ''}
                ${log.type === 'WAITING' ? 'border-l-yellow-500' : ''}
                border-l-[3px]
                transition-all hover:bg-[#1A1E24]
            `}
          >
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-blue-400">{log.timestamp}</span>
                <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">• {log.type}</span>
            </div>
            <div className="flex items-start gap-2">
                {log.type === 'WAITING' && <Clock size={14} className="mt-0.5 text-yellow-500 animate-pulse" />}
                {log.type === 'SUCCESS' && <CheckCircle size={14} className="mt-0.5 text-green-500" />}
                {log.type === 'ERROR' && <AlertCircle size={14} className="mt-0.5 text-red-500" />}
                {log.type === 'INFO' && <Activity size={14} className="mt-0.5 text-blue-500" />}
                
                <p className="text-sm text-gray-300 leading-snug">
                    {log.message}
                    {log.subMessage && <span className="block text-xs text-gray-500 mt-1">{log.subMessage}</span>}
                </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
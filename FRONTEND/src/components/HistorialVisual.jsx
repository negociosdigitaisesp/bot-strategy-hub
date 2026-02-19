import React from 'react';

const HistorialVisual = ({ visualHistory, title = "Histórico Visual" }) => {
  if (!visualHistory || visualHistory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/20 rounded-lg p-3 border border-slate-600/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        </div>
        <div className="text-center text-slate-400 text-xs py-4">
          Nenhum histórico disponível
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/20 rounded-lg p-3 border border-slate-600/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      
      <div className="grid grid-cols-10 gap-1">
        {visualHistory.map((operation, index) => (
          <div
            key={index}
            className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${
              operation.result === 'WIN'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-sm'
                : 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
            }`}
            title={`${operation.result} - Profit: ${operation.profit}% - ${new Date(operation.timestamp).toLocaleString('pt-BR')}`}
          >
            {operation.result === 'WIN' ? 'W' : 'L'}
          </div>
        ))}
      </div>
      
      <div className="mt-3 flex justify-between text-xs text-slate-400">
        <span>Mais recente</span>
        <span>Mais antiga</span>
      </div>
    </div>
  );
};

export default HistorialVisual;
import React from 'react';
import { Clock, Calendar, BarChart3 } from 'lucide-react';

interface Props {
  periodoAtual: string;
  onPeriodoChange: (periodo: string) => void;
  showResults?: boolean;
}

const TimeFilterControls: React.FC<Props> = ({ periodoAtual, onPeriodoChange, showResults = false }) => {
  const filterOptions = [
    {
      value: '1 hour',
      icon: Clock,
      label: '1H',
      fullLabel: 'Última Hora',
      description: 'Análisis de la última hora'
    },
    {
      value: '24 hours',
      icon: Calendar,
      label: '24H',
      fullLabel: 'Últimas 24 Horas',
      description: 'Análisis del último día'
    },
    {
      value: '7 days',
      icon: BarChart3,
      label: '7D',
      fullLabel: 'Últimos 7 Días',
      description: 'Análisis de la última semana'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Título y mensaje de incentivo cuando no hay filtro seleccionado */}
      {!showResults && (
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            📊 Selecciona un Período de Análisis
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Elige el período de tiempo que deseas analizar para ver el ranking de asertividad
            de nuestros bots de trading automatizado.
          </p>
        </div>
      )}

      {/* Botones de filtro temporal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isActive = periodoAtual === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onPeriodoChange(option.value)}
              className={`
                group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
                ${isActive
                  ? 'border-primary/60 bg-primary/10 shadow-xl shadow-primary/25 scale-105 animate-glow-pulse'
                  : 'border-border/40 bg-card/40 hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10'
                }
                backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                min-h-[120px] flex flex-col items-center justify-center text-center
              `}
            >
              {/* Glow effect para botão ativo */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent opacity-60"></div>
              )}

              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

              {/* Conteúdo do botão */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                  ${isActive
                    ? 'bg-primary/25 text-primary shadow-lg shadow-primary/30'
                    : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary group-hover:shadow-md'
                  }
                `}>
                  <Icon size={24} className="transition-transform duration-300 group-hover:scale-110" />
                </div>

                <div>
                  <div className={`
                    text-lg font-bold transition-colors duration-300
                    ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}
                  `}>
                    {option.label}
                  </div>
                  <div className={`
                    text-sm font-medium transition-colors duration-300
                    ${isActive ? 'text-primary/80' : 'text-muted-foreground group-hover:text-primary/70'}
                  `}>
                    {option.fullLabel}
                  </div>
                  <div className={`
                    text-xs mt-1 transition-colors duration-300
                    ${isActive ? 'text-primary/60' : 'text-muted-foreground/70 group-hover:text-primary/50'}
                  `}>
                    {option.description}
                  </div>
                </div>
              </div>

              {/* Indicador de seleção com glow */}
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-primary rounded-full status-online"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mensagem adicional quando nenhum filtro está selecionado */}
      {!showResults && (
        <div className="text-center mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-4 py-2 border border-primary/20">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-primary">
              Selecciona un período para comenzar el análisis
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeFilterControls;
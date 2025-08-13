import React from 'react';
import { Clock, Calendar, BarChart3, Trophy, Flame } from 'lucide-react';

interface Props {
  periodoAtual: string;
  onPeriodoChange: (periodo: string) => void;
  showResults?: boolean;
  showBestOfWeek: boolean;
  showTopApalancamiento: boolean;
  onBestOfWeekChange: (value: boolean) => void;
  onTopApalancamientoChange: (value: boolean) => void;
}

const EnhancedFilterControls: React.FC<Props> = ({ 
  periodoAtual, 
  onPeriodoChange, 
  showResults = false,
  showBestOfWeek,
  showTopApalancamiento,
  onBestOfWeekChange,
  onTopApalancamientoChange
}) => {
  const timeFilterOptions = [
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

  const specialFilters = [
    {
      key: 'bestOfWeek',
      icon: Trophy,
      label: 'TOP 3',
      fullLabel: 'Mejores Bots',
      description: 'de la Semana',
      isActive: showBestOfWeek,
      onChange: onBestOfWeekChange,
      color: 'yellow'
    },
    {
      key: 'topApalancamiento',
      icon: Flame,
      label: 'TOP',
      fullLabel: 'Apalancamiento',
      description: 'Elite Bots',
      isActive: showTopApalancamiento,
      onChange: onTopApalancamientoChange,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      yellow: {
        active: 'border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/20 text-yellow-600',
        inactive: 'border-border/50 bg-card/30 hover:border-yellow-500/30 hover:bg-yellow-500/5 text-muted-foreground hover:text-yellow-600',
        iconActive: 'bg-yellow-500/20 text-yellow-600',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-yellow-500/10 group-hover:text-yellow-600'
      },
      orange: {
        active: 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/20 text-orange-600',
        inactive: 'border-border/50 bg-card/30 hover:border-orange-500/30 hover:bg-orange-500/5 text-muted-foreground hover:text-orange-600',
        iconActive: 'bg-orange-500/20 text-orange-600',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-orange-500/10 group-hover:text-orange-600'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Título quando não há filtro selecionado */}
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

      {/* Container principal dos filtros */}
      <div className="space-y-6">
        {/* Filtros de Tempo */}
        <div>
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-1">Período de Análisis</h3>
            <p className="text-sm text-muted-foreground">Selecciona el rango temporal para el análisis</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {timeFilterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = periodoAtual === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => onPeriodoChange(option.value)}
                  className={`
                    group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
                    ${isActive 
                      ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/20 scale-105' 
                      : 'border-border/50 bg-card/30 hover:border-primary/30 hover:bg-primary/5 hover:scale-102'
                    }
                    backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                    min-h-[120px] flex flex-col items-center justify-center text-center
                  `}
                >
                  {/* Glow effect para botão ativo */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent opacity-50 animate-pulse"></div>
                  )}
                  
                  {/* Conteúdo do botão */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                      ${isActive 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      }
                    `}>
                      <Icon size={24} />
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
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros Especiais */}
        {showResults && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">Filtros Especiales</h3>
              <p className="text-sm text-muted-foreground">Descubre los bots más destacados</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
              {specialFilters.map((filter) => {
                const Icon = filter.icon;
                const colorClasses = getColorClasses(filter.color, filter.isActive);
                
                return (
                  <button
                    key={filter.key}
                    onClick={() => filter.onChange(!filter.isActive)}
                    className={`
                      group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
                      ${filter.isActive 
                        ? colorClasses.active + ' scale-105' 
                        : colorClasses.inactive + ' hover:scale-102'
                      }
                      backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-current/50
                      min-h-[120px] flex flex-col items-center justify-center text-center
                    `}
                  >
                    {/* Glow effect para botão ativo */}
                    {filter.isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-current/20 via-current/10 to-transparent opacity-50 animate-pulse"></div>
                    )}
                    
                    {/* Conteúdo do botão */}
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${filter.isActive 
                          ? colorClasses.iconActive 
                          : colorClasses.iconInactive
                        }
                      `}>
                        <Icon size={24} />
                      </div>
                      
                      <div>
                        <div className="text-lg font-bold transition-colors duration-300">
                          {filter.label}
                        </div>
                        <div className="text-sm font-medium transition-colors duration-300">
                          {filter.fullLabel}
                        </div>
                        <div className="text-xs opacity-80 transition-colors duration-300">
                          {filter.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedFilterControls;
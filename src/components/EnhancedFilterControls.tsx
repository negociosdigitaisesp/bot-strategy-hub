import React from 'react';
import { Clock, Calendar, BarChart3, Trophy, Flame, Zap, Activity } from 'lucide-react';

interface Props {
  periodoAtual: string;
  onPeriodoChange: (periodo: string) => void;
  showResults?: boolean;
  showBestOfWeek: boolean;
  showTopApalancamiento: boolean;
  onBestOfWeekChange: (value: boolean) => void;
  onTopApalancamientoChange: (value: boolean) => void;
  realTimeFilter: string;
  onRealTimeFilterChange: (filter: string) => void;
}

const EnhancedFilterControls: React.FC<Props> = ({ 
  periodoAtual, 
  onPeriodoChange, 
  showResults = false,
  showBestOfWeek,
  showTopApalancamiento,
  onBestOfWeekChange,
  onTopApalancamientoChange,
  realTimeFilter,
  onRealTimeFilterChange
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

  // Opción de Resultado del Ahora
  const realTimeOption = {
    value: '5min',
    icon: Zap,
    label: 'AHORA',
    fullLabel: 'Resultado del Ahora',
    description: 'Datos en tiempo real',
    color: 'green'
  };

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
      },
      blue: {
        active: 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20 text-blue-600',
        inactive: 'border-border/50 bg-card/30 hover:border-blue-500/30 hover:bg-blue-500/5 text-muted-foreground hover:text-blue-600',
        iconActive: 'bg-blue-500/20 text-blue-600',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-600'
      },
      green: {
        active: 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20 text-green-600',
        inactive: 'border-border/50 bg-card/30 hover:border-green-500/30 hover:bg-green-500/5 text-muted-foreground hover:text-green-600',
        iconActive: 'bg-green-500/20 text-green-600',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-green-500/10 group-hover:text-green-600'
      },
      gray: {
        active: 'border-gray-500/50 bg-gray-500/10 shadow-lg shadow-gray-500/20 text-gray-600',
        inactive: 'border-border/50 bg-card/30 hover:border-gray-500/30 hover:bg-gray-500/5 text-muted-foreground hover:text-gray-600',
        iconActive: 'bg-gray-500/20 text-gray-600',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-gray-500/10 group-hover:text-gray-600'
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
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto mb-8">
            <button
              onClick={() => onRealTimeFilterChange(realTimeFilter === '5min' ? 'none' : '5min')}
              className={`
                group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
                ${realTimeFilter === '5min' 
                  ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20 scale-105' 
                  : 'border-border/50 bg-card/30 hover:border-green-500/30 hover:bg-green-500/5 hover:scale-102'
                }
                backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50
                min-h-[120px] flex flex-col items-center justify-center text-center
              `}
            >
              {/* Glow effect para botão ativo */}
              {realTimeFilter === '5min' && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-500/10 to-transparent opacity-50 animate-pulse"></div>
              )}
              
              {/* Indicador de tempo real */}
              {realTimeFilter === '5min' && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              
              {/* Conteúdo do botão */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                  ${realTimeFilter === '5min' 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-muted/50 text-muted-foreground group-hover:bg-green-500/10 group-hover:text-green-600'
                  }
                `}>
                  <Zap size={24} />
                </div>
                
                <div>
                  <div className={`
                    text-lg font-bold transition-colors duration-300
                    ${realTimeFilter === '5min' 
                      ? 'text-green-600' 
                      : 'text-foreground group-hover:text-green-600'
                    }
                  `}>
                    {realTimeOption.label}
                  </div>
                  <div className={`
                    text-sm font-medium transition-colors duration-300
                    ${realTimeFilter === '5min' 
                      ? 'text-green-600/80' 
                      : 'text-muted-foreground group-hover:text-green-600/70'
                    }
                  `}>
                    {realTimeOption.fullLabel}
                  </div>
                </div>
              </div>
            </button>
            
            {/* Filtro 1 Hora */}
            {(() => {
              const option = timeFilterOptions[0]; // 1 hour
              const Icon = option.icon;
              const isActive = periodoAtual === option.value && realTimeFilter === 'none';
              const isDisabled = false; // Permitir clique sempre
              
              return (
                <button
                  key={option.value}
                  onClick={() => onPeriodoChange(option.value)}
                  disabled={isDisabled}
                  className={`
                    group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
                    ${isActive 
                      ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/20 scale-105' 
                      : isDisabled
                        ? 'border-border/30 bg-card/10 cursor-not-allowed'
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
                        : isDisabled
                          ? 'bg-muted/30 text-muted-foreground/50'
                          : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      }
                    `}>
                      <Icon size={24} />
                    </div>
                    
                    <div>
                      <div className={`
                        text-lg font-bold transition-colors duration-300
                        ${isActive 
                          ? 'text-primary' 
                          : isDisabled
                            ? 'text-muted-foreground/50'
                            : 'text-foreground group-hover:text-primary'
                        }
                      `}>
                        {option.label}
                      </div>
                      <div className={`
                        text-sm font-medium transition-colors duration-300
                        ${isActive 
                          ? 'text-primary/80' 
                          : isDisabled
                            ? 'text-muted-foreground/40'
                            : 'text-muted-foreground group-hover:text-primary/70'
                        }
                      `}>
                        {option.fullLabel}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })()}
            
            {/* Filtros 24H e 7D */}
            {timeFilterOptions.slice(1).map((option) => {
              const Icon = option.icon;
              const isActive = periodoAtual === option.value && realTimeFilter === 'none';
              const isDisabled = false; // Permitir clique sempre
              
              return (
                <button
                  key={option.value}
                  onClick={() => onPeriodoChange(option.value)}
                  disabled={isDisabled}
                  className={`
                    group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
                    ${isActive 
                      ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/20 scale-105' 
                      : isDisabled
                        ? 'border-border/30 bg-card/10 cursor-not-allowed'
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
                        : isDisabled
                          ? 'bg-muted/30 text-muted-foreground/50'
                          : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      }
                    `}>
                      <Icon size={24} />
                    </div>
                    
                    <div>
                      <div className={`
                        text-lg font-bold transition-colors duration-300
                        ${isActive 
                          ? 'text-primary' 
                          : isDisabled
                            ? 'text-muted-foreground/50'
                            : 'text-foreground group-hover:text-primary'
                        }
                      `}>
                        {option.label}
                      </div>
                      <div className={`
                        text-sm font-medium transition-colors duration-300
                        ${isActive 
                          ? 'text-primary/80' 
                          : isDisabled
                            ? 'text-muted-foreground/40'
                            : 'text-muted-foreground group-hover:text-primary/70'
                        }
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



        {/* Filtros Especiales */}
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
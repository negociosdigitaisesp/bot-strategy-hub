import React from 'react';
import { Clock, Calendar, BarChart3, Trophy, Flame, Zap, Sparkles, TrendingUp } from 'lucide-react';

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
        active: 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/15 to-amber-500/10 shadow-lg shadow-yellow-500/20 text-yellow-500',
        inactive: 'border-border/40 bg-card/50 hover:border-yellow-500/30 hover:bg-yellow-500/5 text-muted-foreground hover:text-yellow-500',
        iconActive: 'bg-yellow-500/20 text-yellow-500',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-yellow-500/10 group-hover:text-yellow-500'
      },
      orange: {
        active: 'border-orange-500/50 bg-gradient-to-br from-orange-500/15 to-red-500/10 shadow-lg shadow-orange-500/20 text-orange-500',
        inactive: 'border-border/40 bg-card/50 hover:border-orange-500/30 hover:bg-orange-500/5 text-muted-foreground hover:text-orange-500',
        iconActive: 'bg-orange-500/20 text-orange-500',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-orange-500/10 group-hover:text-orange-500'
      },
      green: {
        active: 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-green-500/10 shadow-lg shadow-emerald-500/20 text-emerald-500',
        inactive: 'border-border/40 bg-card/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-500',
        iconActive: 'bg-emerald-500/20 text-emerald-500',
        iconInactive: 'bg-muted/50 text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-500'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Título quando não há filtro selecionado */}
      {!showResults && (
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Análisis de Rendimiento</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Período de Análisis
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto leading-relaxed">
            Selecciona el rango temporal para el análisis
          </p>
        </div>
      )}

      {/* Container principal dos filtros */}
      <div className="space-y-8">
        {/* Filtros de Tempo - Design Refinado */}
        <div>
          {showResults && (
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Período de Análisis</h3>
              <p className="text-sm text-muted-foreground">Selecciona el rango temporal para el análisis</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {/* Botón AHORA - Destacado */}
            <button
              onClick={() => onRealTimeFilterChange(realTimeFilter === '5min' ? 'none' : '5min')}
              className={`
                group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300
                ${realTimeFilter === '5min'
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-transparent shadow-xl shadow-emerald-500/20 scale-[1.02]'
                  : 'border-border/40 bg-card/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:scale-[1.01]'
                }
                backdrop-blur-sm focus:outline-none
              `}
            >
              {realTimeFilter === '5min' && (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
              )}

              {realTimeFilter === '5min' && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                  ${realTimeFilter === '5min'
                    ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 text-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-muted/60 text-muted-foreground group-hover:bg-emerald-500/15 group-hover:text-emerald-400'
                  }
                `}>
                  <Zap size={26} strokeWidth={2.5} />
                </div>

                <div className="text-center">
                  <div className={`
                    text-base font-bold tracking-wide transition-colors duration-300
                    ${realTimeFilter === '5min' ? 'text-emerald-400' : 'text-foreground group-hover:text-emerald-400'}
                  `}>
                    {realTimeOption.label}
                  </div>
                  <div className={`
                    text-xs font-medium transition-colors duration-300
                    ${realTimeFilter === '5min' ? 'text-emerald-400/70' : 'text-muted-foreground group-hover:text-emerald-400/60'}
                  `}>
                    {realTimeOption.fullLabel}
                  </div>
                </div>
              </div>
            </button>

            {/* Time Filters */}
            {timeFilterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = periodoAtual === option.value && realTimeFilter === 'none';

              return (
                <button
                  key={option.value}
                  onClick={() => onPeriodoChange(option.value)}
                  className={`
                    group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300
                    ${isActive
                      ? 'border-primary/50 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent shadow-xl shadow-primary/20 scale-[1.02]'
                      : 'border-border/40 bg-card/50 hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.01]'
                    }
                    backdrop-blur-sm focus:outline-none
                  `}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
                  )}

                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                      ${isActive
                        ? 'bg-gradient-to-br from-primary/30 to-primary/20 text-primary shadow-lg shadow-primary/20'
                        : 'bg-muted/60 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary'
                      }
                    `}>
                      <Icon size={26} strokeWidth={2} />
                    </div>

                    <div className="text-center">
                      <div className={`
                        text-base font-bold tracking-wide transition-colors duration-300
                        ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}
                      `}>
                        {option.label}
                      </div>
                      <div className={`
                        text-xs font-medium transition-colors duration-300
                        ${isActive ? 'text-primary/70' : 'text-muted-foreground group-hover:text-primary/60'}
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

        {/* Filtros Especiales - Design Refinado */}
        {showResults && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-3">
                <Sparkles size={12} className="text-yellow-500" />
                <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-wider">Filtros Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Filtros Especiales</h3>
              <p className="text-sm text-muted-foreground">Descubre los bots más destacados</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
              {specialFilters.map((filter) => {
                const Icon = filter.icon;
                const colorClasses = getColorClasses(filter.color, filter.isActive);

                return (
                  <button
                    key={filter.key}
                    onClick={() => filter.onChange(!filter.isActive)}
                    className={`
                      group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300
                      ${filter.isActive
                        ? colorClasses.active + ' scale-[1.02]'
                        : colorClasses.inactive + ' hover:scale-[1.01]'
                      }
                      backdrop-blur-sm focus:outline-none
                    `}
                  >
                    {filter.isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-current/10 via-transparent to-transparent opacity-50" />
                    )}

                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                        ${filter.isActive ? colorClasses.iconActive : colorClasses.iconInactive}
                      `}>
                        <Icon size={26} strokeWidth={2} />
                      </div>

                      <div className="text-center">
                        <div className="text-base font-bold tracking-wide">{filter.label}</div>
                        <div className="text-xs font-medium">{filter.fullLabel}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{filter.description}</div>
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
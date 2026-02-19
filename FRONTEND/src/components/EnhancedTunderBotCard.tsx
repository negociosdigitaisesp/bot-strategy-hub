import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Bot, 
  Shield, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Zap, 
  Activity, 
  AlertTriangle,
  BarChart3,
  DollarSign,
  Percent,
  Timer,
  Loader2,
  RefreshCw,
  Bug,
  Sparkles,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import HistorialVisual from './HistorialVisual';

interface BotMetrics {
  id: number;
  bot_name: string;
  created_at: string;
  last_update: string;
  total_operaciones: number;
  wins: number;
  losses: number;
  porcentaje_wins: number;
  porcentaje_losses: number;
  secuencias_martingale: number;
  intensidad_martingale: number;
  max_loss_consecutivos: number;
  martingale_frequency: number;
  recovery_rate: number;
  condicion_mercado: string;
  descripcion: string;
  confianza: number;
  recomendacion: string;
  strategy_used: string;
  strategy_confidence: number;
  pattern_found_at: string;
  is_safe_to_operate: boolean;
  reason: string;
  last_10_operations: any[];
  profit_total: number;
  profit_percentage: number;
  stake_value: number;
  martingale_level: number;
  consecutive_losses: number;
  martingale_progression: any[];
  martingale_sequence_id: string;
  risk_level: string;
  hit_statistics: any;
  loss_sequences: any[];
  strategy_results: any;
  execution_logs: any[];
  momentum_analysis: any;
  market_conditions: any;
  version: string;
  cycle_number: number;
  visual_history_20: any[];
}

interface MarketColors {
  bg: string;
  border: string;
  accent: string;
  text: string;
  glow: string;
}

const EnhancedTunderBotCard = () => {
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketStatus, setMarketStatus] = useState('UNKNOWN');
  const [cardColors, setCardColors] = useState<MarketColors>(getDefaultColors());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(5);

  // Sistema de cores dinâmicas baseado em market_conditions
  function getDefaultColors(): MarketColors {
    return {
      bg: 'from-slate-900/30 via-slate-800/20 to-slate-700/10',
      border: 'border-slate-500/50',
      accent: 'bg-slate-500',
      text: 'text-slate-400',
      glow: 'shadow-slate-500/20'
    };
  }

  const updateCardColors = (marketConditions: any) => {
    const condition = marketConditions?.condition || marketConditions || 'UNKNOWN';
    setMarketStatus(condition);
    
    const colorMap: Record<string, MarketColors> = {
      'MERCADO_BUENO': {
        bg: 'from-green-900/30 via-green-800/20 to-green-700/10',
        border: 'border-green-500/50',
        accent: 'bg-green-500',
        text: 'text-green-400',
        glow: 'shadow-green-500/20'
      },
      'MERCADO_ESTABLE': {
        bg: 'from-blue-900/30 via-blue-800/20 to-blue-700/10',
        border: 'border-blue-500/50',
        accent: 'bg-blue-500',
        text: 'text-blue-400',
        glow: 'shadow-blue-500/20'
      },
      'MERCADO_MALO': {
        bg: 'from-red-900/30 via-red-800/20 to-red-700/10',
        border: 'border-red-500/50',
        accent: 'bg-red-500',
        text: 'text-red-400',
        glow: 'shadow-red-500/20'
      },
      'MERCADO_VOLATIL': {
        bg: 'from-orange-900/30 via-orange-800/20 to-orange-700/10',
        border: 'border-orange-500/50',
        accent: 'bg-orange-500',
        text: 'text-orange-400',
        glow: 'shadow-orange-500/20'
      }
    };
    
    setCardColors(colorMap[condition] || getDefaultColors());
  };

  // Hook personalizado para gerenciar dados e subscription realtime
  const fetchBotMetrics = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('bot_metrics_consolidated')
        .select('*')
        .eq('bot_name', 'radartunder3.5')
        .maybeSingle();

      if (error) {
        console.error('Error fetching bot metrics:', error);
        setError('Error al cargar métricas del bot');
        return;
      }

      if (data) {
        setMetrics(data);
        setLastUpdate(new Date());
        setError(null);
        updateCardColors(data.market_conditions || data.condicion_mercado);
      } else {
        console.log('No bot metrics found for radartunder3.5');
        setError('Nenhuma métrica encontrada para este bot');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Error inesperado al cargar dados');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auto-atualização a cada 5 segundos via useEffect
  useEffect(() => {
    fetchBotMetrics();

    // Auto-refresh a cada 5 segundos
    const interval = setInterval(fetchBotMetrics, 5000);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('bug-reset-metrics')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bot_metrics_consolidated',
        filter: 'bot_name=eq.radartunder3.5'
      }, (payload) => {
        console.log('Real-time update received:', payload);
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newData = payload.new as BotMetrics;
          setMetrics(newData);
          setLastUpdate(new Date());
          updateCardColors(newData.market_conditions || newData.condicion_mercado);
          setNextUpdateIn(5); // Reset contador
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Contador regressivo para próxima atualização
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNextUpdateIn(prev => {
        if (prev <= 1) {
          return 5; // Reset para 5 segundos
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const handleDownload = () => {
    window.open('https://drive.google.com/open?id=1xmKhrRbzV8bD-M21vL3pbAj_1Tf_mEgQ&usp=drive_copy', '_blank');
  };

  const renderHistoricoVisual = () => {
    const visualHistory = metrics?.visual_history_20 || [];
    return <HistorialVisual visualHistory={visualHistory} title="Histórico Visual (20 ops)" />;
  };

  // Função para calcular intensidade de martingale e cores de risco
  const getMartingaleIntensityData = (intensidadMartingale: number) => {
    const percentage = Math.round((intensidadMartingale - 1) * 50);
    
    let riskLevel = '';
    let colors = '';
    let bgColor = '';
    let borderColor = '';
    
    if (percentage === 0) {
      riskLevel = 'Sem Martingale';
      colors = 'text-green-400';
      bgColor = 'bg-green-900/30';
      borderColor = 'border-green-500/30';
    } else if (percentage <= 10) {
      riskLevel = 'Baixa Intensidade';
      colors = 'text-emerald-400';
      bgColor = 'bg-emerald-900/30';
      borderColor = 'border-emerald-500/30';
    } else if (percentage <= 25) {
      riskLevel = 'Intensidade Moderada';
      colors = 'text-yellow-400';
      bgColor = 'bg-yellow-900/30';
      borderColor = 'border-yellow-500/30';
    } else if (percentage <= 40) {
      riskLevel = 'Alta Intensidade';
      colors = 'text-orange-400';
      bgColor = 'bg-orange-900/30';
      borderColor = 'border-orange-500/30';
    } else if (percentage <= 50) {
      riskLevel = 'Intensidade Crítica';
      colors = 'text-red-400';
      bgColor = 'bg-red-900/30';
      borderColor = 'border-red-500/30';
    } else {
      riskLevel = 'Máxima Intensidade';
      colors = 'text-red-500';
      bgColor = 'bg-red-900/50';
      borderColor = 'border-red-500/50';
    }
    
    return {
      percentage: Math.max(0, Math.min(100, percentage)),
      riskLevel,
      colors,
      bgColor,
      borderColor,
      intensidadMartingale
    };
  };

  // Componente Header com status de mercado destacado
  const MarketStatusHeader = ({ condition, description, colors }: { condition: string, description: string, colors: MarketColors }) => (
    <div className={`bg-gradient-to-r ${colors.bg} border ${colors.border} rounded-xl p-6 mb-6 backdrop-blur-sm shadow-2xl ${colors.glow} hover:shadow-3xl transition-all duration-500`}>
      <div className="flex items-center gap-4">
        <div className={`w-4 h-4 ${colors.accent} rounded-full animate-pulse shadow-lg`}></div>
        <div className="flex-1">
          <h3 className={`text-xl font-bold tracking-wide ${colors.text}`}>
            {condition || 'Estado del Mercado'}
          </h3>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            {description || 'Analizando condiciones actuales...'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Indicador de atualização automática */}
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 backdrop-blur-sm border border-slate-600/30">
            <div className={`w-2 h-2 bg-green-400 rounded-full ${isRefreshing ? 'animate-ping' : 'animate-pulse'}`}></div>
            <div className="text-xs text-slate-300">
              <div className="font-bold">AUTO-UPDATE</div>
              <div className="text-green-400 font-mono">{nextUpdateIn}s</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bug size={24} className="text-teal-400 animate-bounce" />
            <span className="text-lg font-bold text-teal-300 tracking-wider">BUG RESET</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-8 flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-6">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-teal-400 mx-auto" />
              <div className="absolute inset-0 w-12 h-12 bg-teal-400/20 rounded-full animate-ping mx-auto"></div>
            </div>
            <div>
              <p className="text-slate-300 text-lg font-medium">Cargando Bug Reset</p>
              <p className="text-slate-500 text-sm">Inicializando sistema...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-900/50 border-red-500/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-8 flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-6">
            <div className="relative">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
              <div className="absolute inset-0 w-12 h-12 bg-red-400/20 rounded-full animate-pulse mx-auto"></div>
            </div>
            <div>
              <p className="text-red-400 text-lg font-medium">{error}</p>
              <Button 
                onClick={fetchBotMetrics}
                variant="outline"
                className="mt-4 border-red-400/50 text-red-400 hover:bg-red-400/10 backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="bg-slate-900/50 border-amber-500/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-8 flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-6">
            <Bug className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
            <p className="text-amber-400 text-lg font-medium">No se encontraron datos del bot</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const winRate = metrics.porcentaje_wins || 0;
  const profitPercentage = metrics.profit_percentage || 0;

  return (
    <Card className={`bg-slate-900/80 border-slate-700/50 shadow-2xl backdrop-blur-sm hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] overflow-hidden ${isRefreshing ? 'animate-pulse' : ''}`}>
      {/* Header Premium com Bug Reset */}
      <CardHeader className="bg-gradient-to-r from-slate-800/90 via-teal-900/30 to-slate-800/90 text-white p-6 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/20 rounded-xl shadow-lg backdrop-blur-sm border border-teal-500/30 hover:bg-teal-500/30 transition-all duration-300">
              <Bug size={32} className="text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-wide bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Bug Reset
              </CardTitle>
              <p className="text-slate-300 text-sm mt-1 font-medium">Sistema de Trading Avanzado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1 backdrop-blur-sm">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
              <span className="text-teal-400 text-xs font-medium">ACTIVO</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6 bg-gradient-to-b from-slate-900/50 to-slate-800/30">
        {/* TOPO: Estado do mercado como elemento principal */}
        <MarketStatusHeader 
          condition={marketStatus}
          description={metrics.descripcion || metrics.reason || 'Sistema operando normalmente'}
          colors={cardColors}
        />

        {/* MEIO: Métricas e indicadores visuais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-teal-900/30 via-teal-800/20 to-teal-700/10 rounded-xl p-4 border border-teal-500/30 backdrop-blur-sm hover:border-teal-400/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-lg backdrop-blur-sm">
                <Target size={18} className="text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-teal-400 font-bold tracking-wide">ASERTIVIDAD</p>
                <p className="text-2xl font-bold text-teal-300">{winRate.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={winRate} className="mt-3 h-2 bg-slate-800/50" />
          </div>

          <div className="bg-gradient-to-br from-cyan-900/30 via-cyan-800/20 to-cyan-700/10 rounded-xl p-4 border border-cyan-500/30 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg backdrop-blur-sm">
                <BarChart3 size={18} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-400 font-bold tracking-wide">OPERACIONES</p>
                <p className="text-2xl font-bold text-cyan-300">{metrics.total_operaciones.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/30 via-emerald-800/20 to-emerald-700/10 rounded-xl p-4 border border-emerald-500/30 backdrop-blur-sm hover:border-emerald-400/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm">
                <Shield size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-emerald-400 font-bold tracking-wide">GANANCIAS</p>
                <p className="text-xl font-bold text-emerald-300">{metrics.wins}</p>
              </div>
            </div>
          </div>

          <div className={`bg-gradient-to-br ${profitPercentage >= 0 ? 'from-emerald-900/30 via-emerald-800/20 to-emerald-700/10 border-emerald-500/30' : 'from-red-900/30 via-red-800/20 to-red-700/10 border-red-500/30'} rounded-xl p-4 border backdrop-blur-sm hover:border-opacity-70 transition-all duration-300`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${profitPercentage >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-lg backdrop-blur-sm`}>
                {profitPercentage >= 0 ? 
                  <TrendingUp size={18} className="text-emerald-400" /> : 
                  <TrendingDown size={18} className="text-red-400" />
                }
              </div>
              <div>
                <p className={`text-xs ${profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'} font-bold tracking-wide`}>P&L</p>
                <p className={`text-xl font-bold ${profitPercentage >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Histórico Visual */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
          {renderHistoricoVisual()}
        </div>

        {/* Métricas Detalladas */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
          <h4 className="font-bold text-slate-300 flex items-center gap-2 mb-4 tracking-wide">
            <Activity size={18} className="text-teal-400" />
            MÉTRICAS DETALLADAS
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Pérdidas:</span>
                <span className="font-bold text-red-400">{metrics.losses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Pérdidas Consecutivas:</span>
                <span className="font-bold text-slate-300">{metrics.consecutive_losses}</span>
              </div>
            </div>
            <div className="space-y-3">
              {/* Intensidade Martingale - Display Adaptativo */}
              {(() => {
                const martingaleData = getMartingaleIntensityData(metrics.intensidad_martingale || 1);
                return (
                  <div className={`${martingaleData.bgColor} ${martingaleData.borderColor} border rounded-lg p-3 backdrop-blur-sm transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-bold text-sm">INTENSIDADE MARTINGALE</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${martingaleData.colors}`}>
                          {martingaleData.percentage}%
                        </span>
                        <AlertTriangle size={16} className={martingaleData.colors} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Nível: {martingaleData.intensidadMartingale.toFixed(1)}</span>
                      <span className={`font-bold ${martingaleData.colors}`}>{martingaleData.riskLevel}</span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-slate-700/50 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            martingaleData.percentage === 0 ? 'bg-green-400' :
                            martingaleData.percentage <= 10 ? 'bg-emerald-400' :
                            martingaleData.percentage <= 25 ? 'bg-yellow-400' :
                            martingaleData.percentage <= 40 ? 'bg-orange-400' :
                            martingaleData.percentage <= 50 ? 'bg-red-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${martingaleData.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Última Atualização:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300 text-xs">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
                  </span>
                  {isRefreshing && (
                    <RefreshCw size={12} className="text-green-400 animate-spin" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INFERIOR: Aviso importante sobre duração */}
        <div className="bg-gradient-to-r from-amber-900/30 via-orange-800/20 to-amber-900/30 border border-amber-500/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg backdrop-blur-sm">
              <Timer size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-400 tracking-wide">AVISO IMPORTANTE</p>
              <p className="text-xs text-amber-300 mt-1 font-medium">
                Selecciona una duración de 20 segundos para optimizar resultados
              </p>
            </div>
          </div>
        </div>

        {/* Botón Descarga Premium */}
        <Button 
          onClick={handleDownload}
          className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 hover:from-teal-500 hover:via-cyan-500 hover:to-teal-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-500 transform hover:scale-105 shadow-2xl hover:shadow-teal-500/25 backdrop-blur-sm border border-teal-500/30"
        >
          <Download size={20} className="mr-3" />
          <span className="tracking-wide">DESCARGAR BUG RESET</span>
          <Sparkles size={16} className="ml-3 animate-pulse" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedTunderBotCard;
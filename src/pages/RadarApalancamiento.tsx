import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, BarChart3, Activity, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, XCircle, Zap, Target, Shield, Eye, RefreshCw, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useTunderBot } from '../hooks/useTunderBot';

interface RadarSignal {
  id: string;
  bot_name: string;
  is_safe_to_operate: boolean;
  reason: string;
  operations_after_pattern: number;
  created_at: string;
}

interface BotOperation {
  id: string;
  profit_percentage: number;
  created_at: string;
}

interface BotStats {
  precision: number;
  victories: number;
  defeats: number;
  totalOperations: number;
  lastUpdate: string;
  operationsAfterPattern: string;
}

// Interfaces para Tunder Bot
interface TunderRadarSignal {
  id: string;
  bot_name: string;
  is_safe_to_operate: boolean;
  reason: string;
  operations_after_pattern: number;
  created_at: string;
}

interface TunderBotOperation {
  id: string;
  profit_percentage: number;
  created_at: string;
}



const RadarApalancamiento = () => {
  const navigate = useNavigate();
  const [radarData, setRadarData] = useState<RadarSignal | null>(null);
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [historicData, setHistoricData] = useState<BotOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [lastScalpingOperation, setLastScalpingOperation] = useState(null);
  const [lastTunderOperation, setLastTunderOperation] = useState(null);
  const [scalpingOperationsHistory, setScalpingOperationsHistory] = useState([]);
  const [tunderOperationsHistory, setTunderOperationsHistory] = useState([]);
  
  // Estados para controle de alta volatilidade
  const [scalpingHighVolatility, setScalpingHighVolatility] = useState(false);
  const [tunderHighVolatility, setTunderHighVolatility] = useState(false);

  // Hook do Tunder Bot
  const tunderBot = useTunderBot();

  // Função para converter UTC-3 para horário local do dispositivo
  const convertUTCMinus3ToLocal = (utcMinus3String) => {
    if (!utcMinus3String) return 'N/A';
    
    // Criar data assumindo que o timestamp está em UTC-3
    const utcMinus3Date = new Date(utcMinus3String);
    
    // Adicionar 3 horas para converter UTC-3 para UTC
    const utcDate = new Date(utcMinus3Date.getTime() + (3 * 60 * 60 * 1000));
    
    // Converter para horário local do dispositivo
    return utcDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Função para buscar histórico de operações do Scalping Bot
  const fetchScalpingOperationsHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('scalping_accumulator_bot_logs')
        .select('operation_result, timestamp')
        .in('operation_result', ['WIN', 'LOSS'])
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Erro ao buscar histórico do Scalping Bot:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico do Scalping Bot:', error);
      return [];
    }
  };

  // Função para buscar histórico de operações do Tunder Bot
  const fetchTunderOperationsHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('tunder_bot_logs')
        .select('operation_result, created_at')
        .in('operation_result', ['WIN', 'LOSS'])
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Erro ao buscar histórico do Tunder Bot:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico do Tunder Bot:', error);
      return [];
    }
  };

  // Função para buscar última operação
  const fetchLastOperation = async (tableName) => {
    try {
      // Usar timestamp para scalping_accumulator_bot_logs e created_at para outras tabelas
      const timestampColumn = tableName === 'scalping_accumulator_bot_logs' ? 'timestamp' : 'created_at';
      const selectColumns = tableName === 'scalping_accumulator_bot_logs' 
        ? 'operation_result, timestamp' 
        : 'operation_result, created_at';
      
      const { data, error } = await supabase
        .from(tableName)
        .select(selectColumns)
        .in('operation_result', ['WIN', 'LOSS'])
        .order(timestampColumn, { ascending: false })
        .limit(1);
      
      if (error) {
        console.error(`Erro na consulta ${tableName}:`, error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error(`Erro ao buscar última operação de ${tableName}:`, error);
      return null;
    }
  };

  // Función para obtener el estado del bot
  const obtenerEstadoBot = async () => {
    try {
      setIsConnecting(true);
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .eq('bot_name', 'scalping_accumulator_bot_logs')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching radar data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoBot:', error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Función para obtener el histórico
  const obtenerHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('scalping_accumulator_bot_logs')
        .select('id, profit_percentage, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching historic data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in obtenerHistorico:', error);
      return [];
    }
  };

  // Función para obtener estadísticas exactas según mapeamento
  const obtenerEstadisticasExactas = async () => {
    try {
      const { data, error } = await supabase.rpc('get_scalping_stats_exact');
      
      if (error) {
        console.error('Error al obtener estadísticas exactas:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error en obtenerEstadisticasExactas:', error);
      return null;
    }
  };

  // Usar dados do hook useTunderBot que já pega da vw_tunder_dashboard
  const tunderLocalStats = {
    vd_display: tunderBot.data.victorias_display,
    wins5_display: tunderBot.data.wins_5_display,
    wins5_percent: tunderBot.data.wins_5_percent
  };

  // Función para convertir fecha a timezone local
  const formatToLocalTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  // Función para traducir reason al español latino
  const translateReason = (reason: string) => {
    const translations: { [key: string]: string } = {
      'Pattern detected': 'Patrón detectado',
      'Safe to operate': 'Seguro para operar',
      'Market conditions favorable': 'Condiciones de mercado favorables',
      'High volatility detected': 'Alta volatilidad detectada',
      'Low volume': 'Volumen bajo',
      'Risk too high': 'Riesgo muy alto',
      'Pattern not confirmed': 'Patrón no confirmado',
      'Market unstable': 'Mercado inestable',
      'Waiting for confirmation': 'Esperando confirmación',
      'Technical analysis positive': 'Análisis técnico positivo',
      'Technical analysis negative': 'Análisis técnico negativo',
      'Trend reversal detected': 'Reversión de tendencia detectada',
      'Strong uptrend': 'Tendencia alcista fuerte',
      'Strong downtrend': 'Tendencia bajista fuerte',
      'Sideways market': 'Mercado lateral',
      'News impact detected': 'Impacto de noticias detectado',
      'Mercado Instavel, Volte daqui uns minutos': 'Mercado inestable, vuelve en unos minutos',
      'Esperando o Padrao. Nao ligar ainda.': 'Esperando el patrón. No activar aún.',
      'Padrao Encontrado - Ligar o Bot': 'Patrón encontrado - Activar el Bot'
    };
    
    return translations[reason] || reason;
  };

  // Función para calcular estadísticas usando datos exactos
  const calcularEstadisticas = (historico: BotOperation[], radarInfo: RadarSignal | null, statsExactas: any = null) => {
    if (!historico || historico.length === 0) {
      return {
        precision: 0,
        victories: 0,
        defeats: 0,
        totalOperations: 0,
        lastUpdate: 'N/A',
        operationsAfterPattern: '0/3',
        lossesLast10: 0,
        winsLast5: 0,
        assertivityLast10: 0,
        assertivityLast5: 0,
        // Nuevos campos según mapeamento
        victoriasVsDerrotas: '0/0',
        losses10Display: '0 x 0',
        losses10Percent: 0,
        wins5Display: '0x0',
        wins5Percent: 0
      };
    }

    const victories = historico.filter(op => op.profit_percentage > 0).length;
    const defeats = historico.filter(op => op.profit_percentage <= 0).length;
    const precision = historico.length > 0 ? (victories / historico.length) * 100 : 0;
    
    // Usar estadísticas exactas si están disponibles
    let victoriasVsDerrotas = `${victories}/${defeats}`;
    let losses10Display = '0 x 0';
    let losses10Percent = 0;
    let wins5Display = '0x0';
    let wins5Percent = 0;
    let lossesLast10 = 0;
    let winsLast5 = 0;
    let assertivityLast10 = 0;
    let assertivityLast5 = 0;

    if (statsExactas) {
      // Formato exacto según mapeamento
      victoriasVsDerrotas = `${statsExactas.wins_20}/${statsExactas.losses_20}`;
      losses10Display = `${statsExactas.losses_10} x ${statsExactas.wins_10}`;
      losses10Percent = Math.round((statsExactas.losses_10 / (statsExactas.losses_10 + statsExactas.wins_10)) * 100) || 0;
      wins5Display = `${statsExactas.wins_5}x${statsExactas.losses_5}`;
      wins5Percent = Math.round((statsExactas.wins_5 / (statsExactas.wins_5 + statsExactas.losses_5)) * 100) || 0;
      
      lossesLast10 = statsExactas.losses_10;
      winsLast5 = statsExactas.wins_5;
      assertivityLast10 = Math.round((statsExactas.wins_10 / (statsExactas.losses_10 + statsExactas.wins_10)) * 100) || 0;
      assertivityLast5 = wins5Percent;
    } else {
      // Fallback para cálculo local
      const last10Ops = historico.slice(0, 10);
      lossesLast10 = last10Ops.filter(op => op.profit_percentage <= 0).length;
      const winsLast10 = last10Ops.filter(op => op.profit_percentage > 0).length;
      assertivityLast10 = last10Ops.length > 0 ? Math.round((winsLast10 / last10Ops.length) * 100) : 0;
      
      const last5Ops = historico.slice(0, 5);
      winsLast5 = last5Ops.filter(op => op.profit_percentage > 0).length;
      const lossesLast5 = last5Ops.filter(op => op.profit_percentage <= 0).length;
      assertivityLast5 = last5Ops.length > 0 ? Math.round((winsLast5 / last5Ops.length) * 100) : 0;
      
      losses10Display = `${lossesLast10} x ${winsLast10}`;
      losses10Percent = last10Ops.length > 0 ? Math.round((lossesLast10 / last10Ops.length) * 100) : 0;
      wins5Display = `${winsLast5}x${lossesLast5}`;
      wins5Percent = assertivityLast5;
    }

    return {
      precision: Math.round(precision),
      victories,
      defeats,
      totalOperations: historico.length,
      lastUpdate: radarInfo?.created_at ? formatToLocalTime(radarInfo.created_at) : 'N/A',
      operationsAfterPattern: radarInfo ? `${radarInfo.operations_after_pattern}/3` : '0/3',
      lossesLast10,
      winsLast5,
      assertivityLast10,
      assertivityLast5,
      // Campos formatados según mapeamento
      victoriasVsDerrotas,
      losses10Display,
      losses10Percent,
      wins5Display,
      wins5Percent
    };
  };

  // Función para determinar el color del card
  const getCardColor = (reason) => {
    if (reason.includes("Esperando el patrón") || reason.includes("Aguardando")) {
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        accent: 'bg-yellow-500',
        text: 'text-yellow-400',
        icon: 'text-yellow-400'
      };
    } else if (reason.includes("Patrón Encontrado") || reason.includes("Padrão Encontrado")) {
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        accent: 'bg-green-500',
        text: 'text-green-400',
        icon: 'text-green-400',
        showCheck: true
      };
    } else if (reason.includes("Sinal") && (reason.includes("ativo") || reason.includes("detectado"))) {
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        accent: 'bg-blue-500',
        text: 'text-blue-400',
        icon: 'text-blue-400'
      };
    }
    
    return {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      accent: 'bg-orange-500',
      text: 'text-orange-400',
      icon: 'text-orange-400'
    };
  };

  // Função para obtener filtros
  const getFilterStatus = (historico: BotOperation[], stats: any) => {
    if (!stats) {
      return {
        patronVDV: false,
        victoriasVsDerrotasActive: false,
        winFilterActive: false
      };
    }

    // Victorias / Derrotas: activo se há mais vitórias que derrotas nas últimas 20 ops
    const [wins, losses] = (stats.victoriasVsDerrotas || '0/0').split('/').map(Number);
    const victoriasVsDerrotasActive = wins > losses;
    
    // Wins 5 Ops: activo si wins >= 3 en las últimas 5 operaciones
    const winFilterActive = stats.winsLast5 >= 3;
    
    return {
      patronVDV: evaluarPatronVDV(historico.slice(0, 3)),
      victoriasVsDerrotasActive,
      winFilterActive
    };
  };

  // Función para evaluar patrón V-D-V
  const evaluarPatronVDV = (ultimas3: BotOperation[]) => {
    if (ultimas3.length < 3) return false;
    const [op1, op2, op3] = ultimas3;
    return op1.profit_percentage > 0 && op2.profit_percentage <= 0 && op3.profit_percentage > 0;
  };

  // Función para actualizar datos
  const actualizarDatos = async () => {
    setIsLoading(true);
    try {
      const [estadoBot, historico, statsExactas, lastScalping, lastTunder, scalpingHistory, tunderHistory] = await Promise.all([
        obtenerEstadoBot(),
        obtenerHistorico(),
        obtenerEstadisticasExactas(),
        fetchLastOperation('scalping_accumulator_bot_logs'),
        fetchLastOperation('tunder_bot_logs'),
        fetchScalpingOperationsHistory(),
        fetchTunderOperationsHistory()
      ]);

      setRadarData(estadoBot);
      setHistoricData(historico);
      
      if (estadoBot) {
        const stats = calcularEstadisticas(historico, estadoBot, statsExactas);
        setBotStats(stats);
      }
      
      setLastScalpingOperation(lastScalping);
      setLastTunderOperation(lastTunder);
      setScalpingOperationsHistory(scalpingHistory);
      setTunderOperationsHistory(tunderHistory);
      
      // Verificar alta volatilidade - Scalping Bot
      if (statsExactas && statsExactas.losses_5 > 4) {
        setScalpingHighVolatility(true);
      } else {
        setScalpingHighVolatility(false);
      }
      
      // Verificar alta volatilidade - Tunder Bot (usando dados do hook)
      const tunderLosses = tunderBot.data.wins_5_display ? 
        parseInt(tunderBot.data.wins_5_display.split('/')[1]) || 0 : 0;
      if (tunderLosses > 4) {
        setTunderHighVolatility(true);
      } else {
        setTunderHighVolatility(false);
      }
      
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error updating data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para cargar datos iniciales y configurar actualización automática
  useEffect(() => {
    actualizarDatos();
    
    // REALTIME SUBSCRIPTION para Scalping Bot
    const channel = supabase
      .channel('scalping-bot-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radar_de_apalancamiento_signals',
          filter: 'bot_name=eq.Scalping Bot'
        },
        (payload) => {
          console.log('Scalping Bot - Update recebido:', payload);
          
          if (payload.new) {
            // Atualizar radarData imediatamente
            setRadarData(payload.new);
            
            // Recalcular estatísticas se necessário
            if (historicData.length > 0) {
              const newStats = calcularEstadisticas(historicData, payload.new);
              setBotStats(newStats);
            }
            
            setLastUpdateTime(new Date());
          }
        }
      )
      .subscribe();
    
    // Actualización automática cada 5 segundos
    const interval = setInterval(actualizarDatos, 5000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const scalpingCardColors = getCardColor(radarData?.reason || '');
  const tunderCardColors = getCardColor(tunderBot.data.status_message || '');
  const filterStatus = getFilterStatus(historicData, botStats || {});

  // Detectar padrão encontrado específico para Scalping Bot
  const isScalpingPatternFound = radarData?.reason?.includes("Patrón encontrado - encender bot");

  return (
    <div className="min-h-screen bg-background radar-container">
      {/* Header Compacto */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-card rounded-xl p-4 mb-4 border border-white/10 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="hover:bg-white/10 p-2"
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Target className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
                    🎯 Radar del Apalancamiento
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">Sistema de Monitoreo</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Status de Conexión Compacto */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
              isLoading 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              <span className="font-medium text-xs">
                {isLoading ? '🔄 Conectando...' : '✅ Conectado'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1C2A3A] rounded-lg border border-white/10">
              <Clock className="text-slate-400" size={14} />
              <span className="text-xs font-medium text-slate-300">
                <span className="text-[#2DD4BF]">{lastUpdateTime.toLocaleTimeString('es-ES')}</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-[#2DD4BF]/10 rounded-lg border border-[#2DD4BF]/30">
              <Zap className="text-[#2DD4BF]" size={14} />
              <span className="text-xs font-medium text-[#2DD4BF]">
                Auto: <span className="text-green-400">5s</span>
              </span>
            </div>
            
            {isConnecting && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#2DD4BF]/10 rounded-lg border border-[#2DD4BF]/30 animate-pulse">
                <RefreshCw size={14} className="text-[#2DD4BF] animate-spin" />
                <span className="text-xs font-medium text-cyan-400">
                  Conectando...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Métricas Globales Compactas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#1C2A3A] p-3 rounded-lg border border-white/10 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-[#2DD4BF] rounded-lg">
                <Target className="text-white" size={16} />
              </div>
              <span className="text-xs text-slate-400 font-medium">PRECISIÓN</span>
            </div>
            <div className="text-lg font-bold text-white mb-1">{botStats?.precision || 0}%</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              {botStats?.precision >= 70 ? (
                <><span className="text-green-400">●</span> Excelente</>
              ) : botStats?.precision >= 50 ? (
                <><span className="text-yellow-400">●</span> Bueno</>
              ) : (
                <><span className="text-red-400">●</span> Atención</>
              )}
            </div>
          </div>

          <div className="bg-slate-700 p-3 rounded-lg border border-white/10 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-purple-500 rounded-lg">
                <Activity className="text-white" size={16} />
              </div>
              <span className="text-xs text-slate-400 font-medium">OPERACIONES</span>
            </div>
            <div className="text-lg font-bold text-white mb-1">{botStats?.totalOperations || 0}</div>
            <div className="text-xs text-slate-400">Total ejecutadas</div>
          </div>

          <div className="bg-slate-700 p-3 rounded-lg border border-white/10 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-green-500 rounded-lg">
                <BarChart3 className="text-white" size={16} />
              </div>
              <span className="text-xs text-slate-400 font-medium">V/D</span>
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {botStats?.victoriasVsDerrotas || '0/0'}
            </div>
            <div className="text-xs text-slate-400">Victorias / Derrotas</div>
          </div>

          <div className="bg-slate-700 p-3 rounded-lg border border-white/10 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-orange-500 rounded-lg">
                <Zap className="text-white" size={16} />
              </div>
              <span className="text-xs text-slate-400 font-medium">PATRÓN</span>
            </div>
            <div className="text-lg font-bold text-white mb-1">{botStats?.operationsAfterPattern || '0/3'}</div>
            <div className="text-xs text-slate-400">Después patrón</div>
          </div>
        </div>
      </div>

      {/* Bot Cards - Lado a Lado */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SCALPING BOT Card */}
          <Card className={`bg-[#1C2A3A] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
            isScalpingPatternFound
              ? 'border-green-400 shadow-green-400/50 shadow-2xl'
              : scalpingHighVolatility 
                ? 'border-2 border-red-500' 
                : 'border border-white/10'
          } relative overflow-hidden`}>
            {/* Banner Superior - Apenas quando padrão encontrado */}
            {isScalpingPatternFound && (
              <div className="absolute -top-0 left-0 right-0 z-20">
                <div className="bg-gradient-to-r from-green-400 via-green-500 to-green-400 text-black text-center py-2 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-black text-sm tracking-wide uppercase">
                      Patrón Encontrado - Encender Bot
                    </span>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-transparent via-green-300 to-transparent"></div>
              </div>
            )}

            {/* Accent Bar com animação */}
            <div className={`h-2 rounded-t-lg ${
              isScalpingPatternFound
                ? 'bg-gradient-to-r from-green-300 via-green-400 to-green-300 animate-pulse'
                : scalpingHighVolatility ? 'bg-red-500' : 'bg-[#2DD4BF]'
            }`}></div>
            
            {/* Alerta de Alta Volatilidade */}
            {scalpingHighVolatility && !isScalpingPatternFound && (
              <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-bold text-sm">ALTA VOLATILIDAD - NO OPERAR</span>
                </div>
              </div>
            )}
            
            <CardHeader className={`pb-3 bg-[#1C2A3A]/80 ${
              isScalpingPatternFound || scalpingHighVolatility ? 'pt-6' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 border shadow-md rounded-xl ${
                    isScalpingPatternFound
                      ? 'bg-green-500/20 border-green-500/50 shadow-green-400/30'
                      : 'bg-[#2DD4BF]/20 border-[#2DD4BF]/30'
                  }`}>
                    <Shield className={isScalpingPatternFound ? 'text-green-400' : 'text-[#2DD4BF]'} size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      🤖 SCALPING BOT IA
                    </CardTitle>
                    {lastScalpingOperation && (
                      <div className={`text-xs px-2 py-1 rounded mt-1 ${
                        lastScalpingOperation.operation_result === 'WIN'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        Última operación: {lastScalpingOperation.operation_result || 'N/A'}
                      </div>
                    )}
                    <div className={`text-sm font-medium rounded-lg p-2 mt-2 shadow-inner border ${
                      isScalpingPatternFound
                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : scalpingCardColors.text + ' ' + scalpingCardColors.bg + ' border ' + scalpingCardColors.border
                    }`}>
                      {isLoading ? 'Cargando estado...' : (radarData?.reason ? translateReason(radarData.reason) : 'Sin datos disponibles')}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge className={`text-white text-xs px-2 py-1 ${
                    isScalpingPatternFound ? 'bg-green-500 animate-pulse' : 'bg-[#2DD4BF]'
                  }`}>
                    {isScalpingPatternFound ? 'ACTIVAR' : 'ATIVO'}
                  </Badge>
                </div>
              </div>
          </CardHeader>

            <CardContent className="space-y-4">
            {/* Filtros de Estado */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2 rounded-lg border text-center transition-all duration-300 ${
                filterStatus.patronVDV 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-sm' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <div className="text-xs font-medium mb-1">Patrón V-D-V</div>
                <div className="text-sm font-bold">{filterStatus.patronVDV ? '✓' : '✗'}</div>
              </div>
              
              {/* Filtro: Victorias vs Derrotas últimas 20 ops */}
              <div className={`p-2 rounded-lg border text-center transition-all duration-300 ${
                filterStatus.victoriasVsDerrotasActive 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-md' 
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              }`}>
                <div className="text-xs font-medium mb-1">V/D</div>
                <div className="text-sm font-bold">
                  {botStats?.victoriasVsDerrotas || '0/0'}
                </div>
                <div className="text-xs">Últimas 20</div>
              </div>
              
              {/* Filtro: Wins últimas 5 ops */}
              <div className={`p-2 rounded-lg border text-center transition-all duration-300 ${
                filterStatus.winFilterActive 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-md' 
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              }`}>
                <div className="text-xs font-medium mb-1">Wins 5</div>
                <div className="text-sm font-bold">{botStats?.wins5Display || '0x0'}</div>
                <div className="text-xs">{botStats?.wins5Percent || 0}%</div>
              </div>
            </div>

            {/* Métricas Detalladas */}
            <div className="bg-[#1C2A3A] rounded-lg p-3 flex justify-center">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                  <Target size={12} /> Precisión
                </p>
                <p className="text-lg font-bold text-[#2DD4BF]">{botStats?.precision || 0}%</p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button className="flex-1 bg-[#2DD4BF] hover:bg-[#2DD4BF] text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-sm">
                <Download size={16} className="mr-2" />
                📥 Download
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1 border-[#2DD4BF]/30 text-[#2DD4BF] hover:bg-[#2DD4BF]/10 font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                onClick={() => setShowHistoryModal(true)}
              >
                <BarChart3 size={16} className="mr-2" />
                📊 Histórico
              </Button>
            </div>
            
            {/* Histórico de Operações - Scalping Bot */}
            <div className="mt-4 p-4 bg-[#0F1419] rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-slate-200">Histórico de Operações (Últimas 20)</h3>
              </div>
              
              <div className="grid grid-cols-10 gap-1">
                {scalpingOperationsHistory.length > 0 ? (
                  scalpingOperationsHistory.map((operation, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${
                        operation.operation_result === 'WIN'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-sm'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                      }`}
                      title={`${operation.operation_result} - ${convertUTCMinus3ToLocal(operation.timestamp)}`}
                    >
                      {operation.operation_result === 'WIN' ? 'W' : 'L'}
                    </div>
                  ))
                ) : (
                  <div className="col-span-10 text-center text-slate-400 text-xs py-2">
                    Carregando histórico...
                  </div>
                )}
              </div>
              
              {scalpingOperationsHistory.length > 0 && (
                <div className="mt-3 flex justify-between text-xs text-slate-400">
                  <span>Mais recente</span>
                  <span>Mais antiga</span>
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          {/* TUNDER BOT Card */}
          <Card className={`bg-[#1C2A3A] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
            tunderHighVolatility 
              ? 'border-2 border-red-500' 
              : 'border border-white/10'
          }`}>
            {/* Accent Bar */}
            <div className={`h-2 rounded-t-lg ${
              tunderHighVolatility ? 'bg-red-500' : 'bg-purple-500'
            }`}></div>
            
            {/* Alerta de Alta Volatilidade */}
            {tunderHighVolatility && (
              <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-bold text-sm">ALTA VOLATILIDAD - NO OPERAR</span>
                </div>
              </div>
            )}
            
            <CardHeader className="pb-3 bg-[#1C2A3A]/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 border border-purple-500/30 shadow-md rounded-xl">
                    <Zap className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      ⚡ TUNDER BOT
                    </CardTitle>
                    {lastTunderOperation && (
                      <div className={`text-xs px-2 py-1 rounded mt-1 ${
                        lastTunderOperation.operation_result === 'WIN'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        Última operación: {lastTunderOperation.operation_result || 'N/A'}
                      </div>
                    )}
                    <div className={`text-sm font-medium`}>
                      {tunderBot.data.status_message}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Filtros de Estado del Tunder Bot */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg border text-center transition-all duration-300 bg-purple-50 border-purple-300 text-purple-800">
                  <div className="text-xs font-medium mb-1">V/D</div>
                  <div className="text-sm font-bold text-purple-800">
                    {tunderLocalStats.vd_display}
                  </div>
                  <div className="text-xs">Últimas 20</div>
                </div>
                
                {/* Filtro: Wins últimas 5 ops */}
                <div className="p-2 rounded-lg border text-center transition-all duration-300 bg-purple-50 border-purple-300 text-purple-800">
                  <div className="text-xs font-medium mb-1">Wins 5</div>
                  <div className="text-sm font-bold text-purple-800">{tunderLocalStats.wins5_display}</div>
                  <div className="text-xs text-purple-700">{tunderLocalStats.wins5_percent}%</div>
                </div>
                
                <div className={`p-2 rounded-lg border text-center transition-all duration-300 ${
                  tunderBot.data.vdv_pattern 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-sm' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <div className="text-xs font-medium mb-1">Patrón VDV</div>
                  <div className="text-sm font-bold">{tunderBot.data.vdv_pattern ? '✓' : '✗'}</div>
                </div>
              </div>

              {/* Métricas Detalladas del Tunder Bot */}
              <div className="bg-muted/50 rounded-lg p-3 flex justify-center">
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Target size={12} /> Precisión
                  </p>
                  <p className="text-lg font-bold text-purple-500">{tunderBot.data.precision_percent}%</p>
                </div>
              </div>


              
              {/* Botones de Acción del Tunder Bot */}
              <div className="flex justify-center pt-4">
                <Button className="flex-1 tunder-button hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-sm">
                  <Download size={16} className="mr-2" />
                  ⚡ Download
                </Button>
              </div>
              
              {/* Histórico de Operações - Tunder Bot */}
              <div className="mt-4 p-4 bg-[#0F1419] rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-slate-200">Histórico de Operações (Últimas 20)</h3>
                </div>
                
                <div className="grid grid-cols-10 gap-1">
                  {tunderOperationsHistory.length > 0 ? (
                    tunderOperationsHistory.map((operation, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${
                          operation.operation_result === 'WIN'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-sm'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                        }`}
                        title={`${operation.operation_result} - ${convertUTCMinus3ToLocal(operation.created_at)}`}
                      >
                        {operation.operation_result === 'WIN' ? 'W' : 'L'}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-10 text-center text-slate-400 text-xs py-2">
                      Carregando histórico...
                    </div>
                  )}
                </div>
                
                {tunderOperationsHistory.length > 0 && (
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>Mais recente</span>
                    <span>Mais antiga</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Histórico - Scalping Bot */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl max-w-6xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-border">
            <div className="bg-muted/50 p-8 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-2xl shadow-lg">
                    <BarChart3 className="text-primary-foreground" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      🤖 Histórico Scalping Bot
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">Últimas 20 operaciones del Scalping Bot</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowHistoryModal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl p-2"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[65vh]">
              {historicData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-6 py-4 text-left font-bold text-foreground rounded-l-xl">#</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">📅 Fecha</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">🎯 Resultado</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">💰 Profit %</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground rounded-r-xl">📊 Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historicData.slice(0, 20).map((operation, index) => (
                        <tr key={operation.id} className="hover:bg-muted/50 transition-colors duration-200">
                          <td className="px-6 py-4 text-sm font-bold text-muted-foreground">#{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {formatToLocalTime(operation.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                              operation.profit_percentage > 0 
                                ? 'bg-success/10 text-success border border-success' 
                                : 'bg-danger/10 text-danger border border-danger'
                            }`}>
                              {operation.profit_percentage > 0 ? '🏆 VICTORIA' : '❌ DERROTA'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-lg font-bold ${
                              operation.profit_percentage > 0 ? 'text-success' : 'text-danger'
                            }`}>
                              {operation.profit_percentage > 0 ? '+' : ''}{operation.profit_percentage.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {operation.profit_percentage > 0 ? 
                                <TrendingUp className="text-success" size={20} /> : 
                                <TrendingDown className="text-danger" size={20} />
                              }
                              <span className="text-xs text-muted-foreground font-medium">
                                {operation.profit_percentage > 0 ? 'Positivo' : 'Negativo'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-6 bg-muted rounded-3xl inline-block mb-6">
                    <BarChart3 className="text-muted-foreground" size={64} />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-2">No hay operaciones disponibles</h4>
                  <p className="text-muted-foreground">Las operaciones aparecerán aquí cuando el bot comience a operar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico - Tunder Bot */}
      {tunderBot.showTunderHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl max-w-6xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-border">
            <div className="bg-muted/50 p-8 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500 rounded-2xl shadow-lg">
                    <BarChart3 className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      ⚡ Histórico Tunder Bot
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">Últimas 20 operaciones del Tunder Bot</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => tunderBot.setShowTunderHistoryModal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl p-2"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[65vh]">
              {tunderBot.operations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-6 py-4 text-left font-bold text-foreground rounded-l-xl">#</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">📅 Fecha</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">🎯 Resultado</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">💰 Profit %</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground rounded-r-xl">📊 Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tunderBot.operations.slice(0, 20).map((operation, index) => (
                        <tr key={operation.id} className="hover:bg-muted/50 transition-colors duration-200">
                          <td className="px-6 py-4 text-sm font-bold text-muted-foreground">#{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {formatToLocalTime(operation.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                              operation.profit_percentage > 0 
                                ? 'bg-success/10 text-success border border-success' 
                                : 'bg-danger/10 text-danger border border-danger'
                            }`}>
                              {operation.profit_percentage > 0 ? '🏆 VICTORIA' : '❌ DERROTA'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-lg font-bold ${
                              operation.profit_percentage > 0 ? 'text-success' : 'text-danger'
                            }`}>
                              {operation.profit_percentage > 0 ? '+' : ''}{operation.profit_percentage.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {operation.profit_percentage > 0 ? 
                                <TrendingUp className="text-success" size={20} /> : 
                                <TrendingDown className="text-danger" size={20} />
                              }
                              <span className="text-xs text-muted-foreground font-medium">
                                {operation.profit_percentage > 0 ? 'Positivo' : 'Negativo'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-6 bg-muted rounded-3xl inline-block mb-6">
                    <BarChart3 className="text-muted-foreground" size={64} />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-2">No hay operaciones disponibles</h4>
                  <p className="text-muted-foreground">Las operaciones del Tunder Bot aparecerán aquí cuando comience a operar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarApalancamiento;
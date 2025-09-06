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

// Interfaces para Sistema de Estratégias
interface TradingStrategy {
  id: string;
  name: string;
  confidence: number;
  type: 'PREMIUM_RECOVERY' | 'MOMENTUM_CONTINUATION' | 'VOLATILITY_BREAK' | 'PATTERN_REVERSAL' | 'CYCLE_TRANSITION' | 'FIBONACCI_RECOVERY' | 'MOMENTUM_SHIFT' | 'STABILITY_BREAK';
  filters: StrategyFilter[];
  performance: StrategyPerformance;
  detected_at: string;
}

interface StrategyFilter {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  value: string | number;
  description: string;
  weight: number;
}

interface StrategyPerformance {
  success_rate: number;
  total_operations: number;
  wins: number;
  losses: number;
  avg_profit: number;
  last_updated: string;
}

interface StrategyData {
  strategy_used: string | null;
  strategy_confidence: number;
  available_strategies: number;
  strategy_details: TradingStrategy | null;
  strategy_history: TradingStrategy[];
}

interface StrategyColors {
  bg: string;
  border: string;
  accent: string;
  text: string;
  icon: string;
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
  const [dashboardStats, setDashboardStats] = useState(null);
  const [scalpingLast5Operations, setScalpingLast5Operations] = useState(null);
  
  // Estados para controle de alta volatilidade
  const [scalpingHighVolatility, setScalpingHighVolatility] = useState(false);
  const [tunderHighVolatility, setTunderHighVolatility] = useState(false);

  // Estados para Sistema de Estratégias
  const [strategyData, setStrategyData] = useState<StrategyData>({
    strategy_used: null,
    strategy_confidence: 0,
    available_strategies: 8,
    strategy_details: null,
    strategy_history: []
  });
  const [activeStrategy, setActiveStrategy] = useState<TradingStrategy | null>(null);
  const [showStrategyAlert, setShowStrategyAlert] = useState(false);

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

  // Função para buscar últimas 5 operações da vw_scalping_dashboard
  const fetchScalpingLast5Operations = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_scalping_dashboard')
        .select('wins_5_display')
        .limit(1);
      
      if (error) {
        console.error('Erro ao buscar últimas 5 operações do Scalping:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error('Erro ao buscar últimas 5 operações do Scalping:', error);
      return null;
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



  // Función para obtener colores de estrategia
  const getStrategyColors = (strategyType: string): StrategyColors => {
    const colorMap: { [key: string]: StrategyColors } = {
      'PREMIUM_RECOVERY': {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        accent: 'bg-emerald-500',
        text: 'text-emerald-400',
        icon: 'text-emerald-400'
      },
      'MOMENTUM_CONTINUATION': {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        accent: 'bg-blue-500',
        text: 'text-blue-400',
        icon: 'text-blue-400'
      },
      'VOLATILITY_BREAK': {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        accent: 'bg-orange-500',
        text: 'text-orange-400',
        icon: 'text-orange-400'
      },
      'PATTERN_REVERSAL': {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        accent: 'bg-purple-500',
        text: 'text-purple-400',
        icon: 'text-purple-400'
      },
      'CYCLE_TRANSITION': {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        accent: 'bg-indigo-500',
        text: 'text-indigo-400',
        icon: 'text-indigo-400'
      },
      'FIBONACCI_RECOVERY': {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        accent: 'bg-amber-500',
        text: 'text-amber-400',
        icon: 'text-amber-400'
      },
      'MOMENTUM_SHIFT': {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        accent: 'bg-cyan-500',
        text: 'text-cyan-400',
        icon: 'text-cyan-400'
      },
      'STABILITY_BREAK': {
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
        accent: 'bg-teal-500',
        text: 'text-teal-400',
        icon: 'text-teal-400'
      }
    };

    return colorMap[strategyType] || {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      accent: 'bg-gray-500',
      text: 'text-gray-400',
      icon: 'text-gray-400'
    };
  };

  // Función para simular datos de estrategia (temporal - será reemplazada por datos reales)
  const generateMockStrategyData = (): TradingStrategy => {
    const strategies = [
      'PREMIUM_RECOVERY',
      'MOMENTUM_CONTINUATION', 
      'VOLATILITY_BREAK',
      'PATTERN_REVERSAL',
      'CYCLE_TRANSITION',
      'FIBONACCI_RECOVERY',
      'MOMENTUM_SHIFT',
      'STABILITY_BREAK'
    ];
    
    const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
    const confidence = Math.floor(Math.random() * (97 - 84 + 1)) + 84;
    
    return {
      id: `strategy_${Date.now()}`,
      name: randomStrategy.replace('_', ' '),
      confidence,
      type: randomStrategy as any,
      filters: [
        {
          name: 'Volume Analysis',
          status: 'passed',
          value: '85%',
          description: 'Análisis de volumen de mercado',
          weight: 0.3
        },
        {
          name: 'Trend Confirmation',
          status: 'passed',
          value: 'Bullish',
          description: 'Confirmación de tendencia',
          weight: 0.4
        },
        {
          name: 'Risk Assessment',
          status: confidence > 90 ? 'passed' : 'pending',
          value: `${confidence}%`,
          description: 'Evaluación de riesgo',
          weight: 0.3
        }
      ],
      performance: {
        success_rate: confidence,
        total_operations: Math.floor(Math.random() * 100) + 50,
        wins: Math.floor(Math.random() * 80) + 30,
        losses: Math.floor(Math.random() * 20) + 5,
        avg_profit: Math.random() * 5 + 2,
        last_updated: new Date().toISOString()
      },
      detected_at: new Date().toISOString()
    };
  };

  // Función para calcular estadísticas usando datos exactos
  const calcularEstadisticas = (historico: BotOperation[], radarInfo: RadarSignal | null, statsExactas: any = null, dashboardStats: any = null) => {
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

    // ADICIONAR dados do dashboard:
    let winLosses20Display = '0 x 0';
    let assertivity20 = 0;
    
    if (dashboardStats && dashboardStats.win_losses) {
      winLosses20Display = dashboardStats.win_losses; // Formato "18 x 2"
      
      // Calcular asertividad a partir do formato "wins x losses"
      const [wins, losses] = dashboardStats.win_losses.split(' x ').map(Number);
      const total = wins + losses;
      assertivity20 = total > 0 ? Math.round((wins / total) * 100) : 0;
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
      wins5Percent,
      // Novos campos do dashboard
      winLosses20Display,
      assertivity20
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

  // Función para buscar datos del dashboard
  const obtenerDashboardStats = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_scalping_dashboard')
        .select('wins, losses, wins_5_display') // Colunas wins, losses e wins_5_display
        .limit(1);
      
      if (error) {
        console.error('Error al obtener dashboard stats:', error);
        return null;
      }
 
      return data?.[0] || null;
    } catch (error) {
      console.error('Error en obtenerDashboardStats:', error);
      return null;
    }
  };

  // Función para actualizar datos
  const actualizarDatos = async () => {
    setIsLoading(true);
    try {
      const [estadoBot, historico, statsExactas, dashboardStats, lastScalping, lastTunder, scalpingHistory, tunderHistory, scalpingLast5] = await Promise.all([
        obtenerEstadoBot(),
        obtenerHistorico(),
        obtenerEstadisticasExactas(),
        obtenerDashboardStats(),
        fetchLastOperation('scalping_accumulator_bot_logs'),
        fetchLastOperation('tunder_bot_logs'),
        fetchScalpingOperationsHistory(),
        fetchTunderOperationsHistory(),
        fetchScalpingLast5Operations()
      ]);

      setRadarData(estadoBot);
      setHistoricData(historico);
      setDashboardStats(dashboardStats);
      
      if (estadoBot) {
        const stats = calcularEstadisticas(historico, estadoBot, statsExactas, dashboardStats);
        setBotStats(stats);
      }
      
      setLastScalpingOperation(lastScalping);
      setLastTunderOperation(lastTunder);
      setScalpingOperationsHistory(scalpingHistory);
      setTunderOperationsHistory(tunderHistory);
      setScalpingLast5Operations(scalpingLast5);
      
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
    
    // Simular dados de estratégia iniciais
    const mockStrategy = generateMockStrategyData();
    setStrategyData({
      strategy_used: mockStrategy.name,
      strategy_confidence: mockStrategy.confidence,
      available_strategies: 8,
      strategy_details: mockStrategy,
      strategy_history: []
    });
    
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
              const newStats = calcularEstadisticas(historicData, payload.new, null, null);
              setBotStats(newStats);
            }
            
            // Simular detecção de nova estratégia quando padrão é encontrado
            if (payload.new.reason?.includes('Patrón encontrado')) {
              const newStrategy = generateMockStrategyData();
              setStrategyData({
                strategy_used: newStrategy.name,
                strategy_confidence: newStrategy.confidence,
                available_strategies: 8,
                strategy_details: newStrategy,
                strategy_history: []
              });
              setShowStrategyAlert(true);
              
              // Esconder alerta após 5 segundos
              setTimeout(() => setShowStrategyAlert(false), 5000);
            }
            
            setLastUpdateTime(new Date());
          }
        }
      )
      .subscribe();
    
    // Actualización automática cada 5 segundos
    const interval = setInterval(actualizarDatos, 5000);
    
    // Simular mudanças de estratégia periodicamente para demonstração
    const strategyInterval = setInterval(() => {
      const newStrategy = generateMockStrategyData();
      setStrategyData(newStrategy);
    }, 15000); // A cada 15 segundos
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(strategyInterval);
    };
  }, []);

  // Efecto para detectar mudanças na estratégia ativa
  useEffect(() => {
    if (strategyData.strategy_details && activeStrategy !== strategyData.strategy_details.id) {
      setActiveStrategy(strategyData.strategy_details.id);
      setShowStrategyAlert(true);
      
      // Esconder alerta após 5 segundos
      setTimeout(() => setShowStrategyAlert(false), 5000);
    }
  }, [strategyData.strategy_details, activeStrategy]);

  const scalpingCardColors = getCardColor(radarData?.reason || '');
  const tunderCardColors = getCardColor(tunderBot.data.status_message || '');
  const filterStatus = getFilterStatus(historicData, botStats || {});

  // Detectar padrão encontrado específico para Scalping Bot
  const isScalpingPatternFound = radarData?.reason?.includes("Patrón encontrado - encender bot");

  // Função para traduzir reason do Supabase
  const translateReason = (reason: string) => {
    const translations: { [key: string]: string } = {
      'Waiting for pattern': 'Aguardando padrão',
      'Pattern not found': 'Padrão não encontrado',
      'High volatility detected': 'Alta volatilidade detectada',
      'Market analysis in progress': 'Análise de mercado em progresso',
      'Insufficient data': 'Dados insuficientes'
    };
    return translations[reason] || reason || 'Aguardando estratégia...';
  };

  // Componente StrategyIndicator
  const StrategyIndicator = ({ strategy, reason }: { strategy: TradingStrategy | null; reason?: string }) => {
    if (!strategy || !strategy.name || strategy.name === 'NONE') {
      return (
        <div className="flex items-center gap-2 text-slate-400" role="status" aria-label="Aguardando estratégia">
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse" aria-hidden="true"></div>
          <span className="text-sm">
            {reason ? translateReason(reason) : 'Aguardando estratégia...'}
          </span>
        </div>
      );
    }

    const colors = getStrategyColors(strategy.type);
    
    return (
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all duration-300 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/50" 
           style={{ 
             backgroundColor: colors.bg, 
             borderColor: colors.border 
           }}
           role="region"
           aria-label={`Estratégia ativa: ${strategy.name.replace('_', ' ')} com ${strategy.confidence}% de confiança`}
           tabIndex={0}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-3 h-3 rounded-full animate-pulse flex-shrink-0`} 
               style={{ backgroundColor: colors.accent }}
               aria-hidden="true"></div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate" style={{ color: colors.text }}>
              {strategy.name.replace('_', ' ')}
            </div>
            <div className="text-xs opacity-75 truncate" style={{ color: colors.text }}>
              Confiança: {strategy.confidence}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente ConfidenceBadge
  const ConfidenceBadge = ({ confidence, strategyType }: { confidence: number; strategyType?: string }) => {
    const getConfidenceColor = (conf: number) => {
      if (conf >= 90) return { bg: '#10B981', text: '#FFFFFF', label: 'Alta' };
      if (conf >= 85) return { bg: '#3B82F6', text: '#FFFFFF', label: 'Média' };
      return { bg: '#F59E0B', text: '#FFFFFF', label: 'Baixa' };
    };

    const colors = getConfidenceColor(confidence);
    const shouldPulse = confidence >= 90;

    return (
      <div className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 ${
        shouldPulse ? 'animate-pulse' : ''
      }`}
           style={{ 
             backgroundColor: colors.bg, 
             color: colors.text 
           }}
           role="status"
           aria-label={`Nível de confiança ${colors.label}: ${confidence}%`}
           tabIndex={0}>
        <div className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" aria-hidden="true"></div>
        <span className="whitespace-nowrap">{colors.label} ({confidence}%)</span>
      </div>
    );
  };

  // Componente FilterPanel
  const FilterPanel = ({ strategy }: { strategy: TradingStrategy | null }) => {
    if (!strategy || !strategy.filters.length) {
      return (
        <div className="text-center py-4 text-slate-400" role="status" aria-label="Nenhum filtro ativo">
          <div className="text-sm">Nenhum filtro ativo</div>
        </div>
      );
    }

    return (
      <div className="space-y-2" role="region" aria-label="Filtros da estratégia ativa">
        <div className="text-sm font-medium text-slate-300 mb-3" id="filters-heading">Filtros da Estratégia</div>
        <div className="space-y-2" role="list" aria-labelledby="filters-heading">
          {strategy.filters.map((filter, index) => (
            <div key={index} 
                 className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/50"
                 role="listitem"
                 tabIndex={0}
                 aria-label={`Filtro ${filter.name}: ${filter.status === 'passed' ? 'aprovado' : filter.status === 'failed' ? 'reprovado' : 'pendente'}, valor ${filter.value}`}>
              <div className="flex items-center gap-2 mb-2 sm:mb-0">
                {filter.status === 'passed' ? (
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0" aria-hidden="true" />
                ) : filter.status === 'failed' ? (
                  <XCircle size={16} className="text-red-400 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Clock size={16} className="text-yellow-400 flex-shrink-0" aria-hidden="true" />
                )}
                <span className="text-sm text-slate-300 font-medium">{filter.name}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 ml-6 sm:ml-0">
                <span className="text-xs text-slate-400 font-mono">{filter.value}</span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  filter.status === 'passed' ? 'bg-green-400' :
                  filter.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`} aria-hidden="true"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Componente StrategyHistory
  const StrategyHistory = ({ strategies }: { strategies: TradingStrategy[] }) => {
    if (!strategies || !strategies.length) {
      return (
        <div className="text-center py-6 text-slate-400">
          <History size={24} className="mx-auto mb-2 opacity-50" />
          <div className="text-sm">Nenhuma estratégia detectada ainda</div>
        </div>
      );
    }

    const recentStrategies = strategies.slice(0, 5);

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
          <History size={16} />
          <span>Histórico de Estratégias</span>
        </div>
        
        {recentStrategies.map((strategy, index) => {
          const colors = getStrategyColors(strategy.type);
          const timeAgo = new Date(strategy.detected_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          return (
            <div key={strategy.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }}></div>
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {strategy.name.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-slate-400">{timeAgo}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence={strategy.confidence} />
                <div className="text-xs text-slate-400">
                  {strategy.performance.success_rate}% sucesso
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Gráfico de barras simples com taxa de sucesso */}
        <div className="mt-4 p-3 bg-slate-800/20 rounded-lg border border-slate-700/30">
          <div className="text-xs font-medium text-slate-300 mb-2">Taxa de Sucesso por Estratégia</div>
          <div className="space-y-2">
            {recentStrategies.map((strategy, index) => (
              <div key={strategy.id} className="flex items-center gap-2">
                <div className="text-xs text-slate-400 w-20 truncate">
                  {strategy.name.split('_')[0]}
                </div>
                <div className="flex-1 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${strategy.performance.success_rate}%`,
                      backgroundColor: getStrategyColors(strategy.type).accent
                    }}
                  ></div>
                </div>
                <div className="text-xs text-slate-400 w-10">
                  {strategy.performance.success_rate}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Componente AlertBanner
  const AlertBanner = ({ strategy, show }: { strategy: TradingStrategy | null; show: boolean }) => {
    if (!show || !strategy) return null;

    const colors = getStrategyColors(strategy.type);
    
    const getStrategyMessage = (strategyType: string) => {
      const messages = {
        'PREMIUM_RECOVERY': '🎯 Estratégia Premium Recovery detectada! Oportunidade de recuperação identificada.',
        'MOMENTUM_CONTINUATION': '⚡ Momentum Continuation ativo! Tendência forte confirmada.',
        'VOLATILITY_BREAK': '💥 Volatility Break detectado! Rompimento significativo identificado.',
        'PATTERN_REVERSAL': '🔄 Pattern Reversal confirmado! Reversão de padrão em andamento.',
        'CYCLE_TRANSITION': '🌊 Cycle Transition ativo! Mudança de ciclo detectada.',
        'FIBONACCI_RECOVERY': '📐 Fibonacci Recovery identificado! Retração fibonacci confirmada.',
        'MOMENTUM_SHIFT': '🚀 Momentum Shift detectado! Mudança de momentum identificada.',
        'STABILITY_BREAK': '⚠️ Stability Break confirmado! Rompimento de estabilidade detectado.'
      };
      return messages[strategyType] || '🎯 Nova estratégia detectada!';
    };

    return (
      <div className={`mb-4 p-4 rounded-xl border-2 animate-pulse transition-all duration-500`}
           style={{
             backgroundColor: colors.bg,
             borderColor: colors.accent,
             boxShadow: `0 0 20px ${colors.accent}40`
           }}>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full animate-ping" 
               style={{ backgroundColor: colors.accent }}></div>
          <div>
            <div className="font-semibold text-sm" style={{ color: colors.text }}>
              {getStrategyMessage(strategy.type)}
            </div>
            <div className="text-xs opacity-75 mt-1" style={{ color: colors.text }}>
              Confiança: {strategy.confidence}% • Detectado às {new Date(strategy.detected_at).toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>
      </div>
    );
  };

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


      </div>

      {/* Bot Cards - Lado a Lado */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SCALPING BOT Card */}
          <Card className={`bg-[#1C2A3A] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
            strategyData.strategy_details && strategyData.strategy_used !== 'Analisando el Mercado...' && strategyData.strategy_used !== null
              ? 'border-2 border-blue-500 shadow-blue-500/50'
              : scalpingHighVolatility 
                ? 'border-2 border-red-500' 
                : 'border border-white/10'
          } relative overflow-hidden`}>
            {/* Alert Banner para estratégias */}
            <AlertBanner strategy={strategyData.strategy_details} show={showStrategyAlert} />
            
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
               strategyData.strategy_details && strategyData.strategy_used !== 'Analisando el Mercado...' && strategyData.strategy_used !== null
                 ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 animate-pulse'
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
                    {/* Strategy Indicator */}
                    <div className="mt-2">
                      <StrategyIndicator 
                        strategy={strategyData.strategy_details} 
                        reason={radarData?.reason} 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <Badge className={`text-white text-xs px-2 py-1 ${
                    isScalpingPatternFound ? 'bg-green-500 animate-pulse' : 'bg-[#2DD4BF]'
                  }`}>
                    {isScalpingPatternFound ? 'ACTIVAR' : 'ATIVO'}
                  </Badge>
                  {strategyData.strategy_details && (
                    <div>
                      <ConfidenceBadge 
                        confidence={strategyData.strategy_details.confidence} 
                        strategyType={strategyData.strategy_details.type} 
                      />
                    </div>
                  )}
                </div>
              </div>
          </CardHeader>

            <CardContent className="space-y-4">
            {/* Estratégia Ativa */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Estrategia Activa</div>
                  <div className="text-sm font-bold text-blue-400">
                    {radarData?.strategy_used || 'Analisando el Mercado...'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Confianza</div>
                  <div className="text-lg font-bold text-green-400">
                    {radarData?.strategy_confidence || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Painel de Filtros Avançado */}
            {strategyData.strategy_details && strategyData.strategy_used !== 'Analisando el Mercado...' && strategyData.strategy_used !== null && (
              <div className="bg-[#0F1419] rounded-lg p-4 border border-white/5">
                <FilterPanel strategy={strategyData.strategy_details} />
              </div>
            )}

            {/* Métricas de Operações Recentes - RESTAURADO */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Últimas 20 Operaciones</div>
              <div className="text-sm font-bold text-cyan-400">
                {dashboardStats ? `${dashboardStats.wins} x ${dashboardStats.losses}` : '0 x 0'}
              </div>
              <div className="text-xs text-slate-500">
                Asertividad: {botStats?.assertivity20 || 0}%
              </div>
            </div>

            {/* Métricas das Últimas 5 Operações */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Últimas 5 Operaciones</div>
              <div className="text-sm font-bold text-green-400">
 os 
              </div>
              <div className="text-xs text-slate-500">
                Resultado recente
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
                📥 Descargar
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
            
            {/* Histórico de Estratégias */}
            {strategyData.strategy_history && strategyData.strategy_history.length > 0 && (
              <div className="mt-4 p-4 bg-[#0F1419] rounded-lg border border-white/5">
                <StrategyHistory strategies={strategyData.strategy_history} />
              </div>
            )}
            
            {/* Histórico de Operações - Scalping Bot */}
            <div className="mt-4 space-y-4">
              {/* Últimas 5 Operações da vw_scalping_dashboard */}
              <div className="p-4 bg-[#0F1419] rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-slate-200">Últimas 5 Operaciones (Dashboard)</h3>
                </div>
                
                <div className="flex gap-2 justify-center">
                  {scalpingLast5Operations && scalpingLast5Operations.wins_5_display ? (
                    scalpingLast5Operations.wins_5_display.split('').map((result, index) => (
                      <div
                        key={index}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${
                          result === 'W'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-sm'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                        }`}
                        title={`Operación ${index + 1}: ${result === 'W' ? 'WIN' : 'LOSS'}`}
                      >
                        {result}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-2">
                      Cargando últimas 5 operaciones...
                    </div>
                  )}
                </div>
                
                {scalpingLast5Operations && scalpingLast5Operations.wins_5_display && (
                  <div className="mt-3 text-center text-xs text-slate-400">
                    Resultado: {scalpingLast5Operations.wins_5_display}
                  </div>
                )}
              </div>

              {/* Histórico Completo (Últimas 20) */}
              <div className="p-4 bg-[#0F1419] rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-slate-200">Histórico Completo (Últimas 20)</h3>
                </div>
                
                <div className="grid grid-cols-10 gap-1">
                  {scalpingOperationsHistory && scalpingOperationsHistory.length > 0 ? (
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
                      Cargando histórico...
                    </div>
                  )}
                </div>
                
                {scalpingOperationsHistory && scalpingOperationsHistory.length > 0 && (
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>Más reciente</span>
                        <span>Más antigua</span>
                  </div>
                )}
              </div>
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
                  ⚡ Descargar
                </Button>
              </div>
              
              {/* Histórico de Operações - Tunder Bot */}
              <div className="mt-4 p-4 bg-[#0F1419] rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-slate-200">Histórico de Operaciones (Últimas 20)</h3>
                </div>
                
                <div className="grid grid-cols-10 gap-1">
                  {tunderOperationsHistory && tunderOperationsHistory.length > 0 ? (
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
                      Cargando histórico...
                    </div>
                  )}
                </div>
                
                {tunderOperationsHistory && tunderOperationsHistory.length > 0 && (
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>Más reciente</span>
                    <span>Más antigua</span>
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
                      {historicData && historicData.slice(0, 20).map((operation, index) => (
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
              {tunderBot.operations && tunderBot.operations.length > 0 ? (
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
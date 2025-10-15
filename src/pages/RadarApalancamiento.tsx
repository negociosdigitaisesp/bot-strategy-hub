import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Activity, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, XCircle, Zap, Shield, Eye, RefreshCw, History, Target, Download, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useTunderBot } from '../hooks/useTunderBot';
import { useAudioNotification } from '../services/audioNotificationService';
import EnhancedTunderBotCard from '../components/EnhancedTunderBotCard';

interface RadarSignal {
  id: string;
  bot_name: string;
  is_safe_to_operate: boolean;
  reason: string;
  operations_after_pattern: number;
  created_at: string;
  
  // === NOVOS CAMPOS ADICIONADOS ===
  strategy_used: string | null;
  strategy_confidence: number | null;
  available_strategies: number | null;
  strategy_details: any; // Use 'any' por enquanto, pois o backend envia como JSONB
  filters_applied: string[] | null;
  tracking_id: string | null;
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
  operations_after_pattern?: number;
  created_at?: string;
  strategy_used: string;
  strategy_confidence: number;
  pattern_found_at: string;
  last_update: string;
  last_operations: any; // JSON field with operation data
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

// Interface StrategyData removida - dados agora vêm diretamente do RadarSignal

interface StrategyColors {
  bg: string;
  border: string;
  accent: string;
  text: string;
  icon: string;
}

// Função para obter cores baseadas no tipo de estratégia
const getStrategyColors = (type: string): StrategyColors => {
  const colorMap: Record<string, StrategyColors> = {
    'PREMIUM_RECOVERY': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      accent: 'bg-emerald-500',
      text: 'text-emerald-700',
      icon: 'text-emerald-600'
    },
    'MOMENTUM_CONTINUATION': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      accent: 'bg-blue-500',
      text: 'text-blue-700',
      icon: 'text-blue-600'
    },
    'VOLATILITY_BREAK': {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      accent: 'bg-orange-500',
      text: 'text-orange-700',
      icon: 'text-orange-600'
    },
    'PATTERN_REVERSAL': {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      accent: 'bg-purple-500',
      text: 'text-purple-700',
      icon: 'text-purple-600'
    },
    'CYCLE_TRANSITION': {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      accent: 'bg-indigo-500',
      text: 'text-indigo-700',
      icon: 'text-indigo-600'
    },
    'FIBONACCI_RECOVERY': {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      accent: 'bg-teal-500',
      text: 'text-teal-700',
      icon: 'text-teal-600'
    },
    'MOMENTUM_SHIFT': {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      accent: 'bg-cyan-500',
      text: 'text-cyan-700',
      icon: 'text-cyan-600'
    },
    'STABILITY_BREAK': {
      bg: 'bg-red-50',
      border: 'border-red-200',
      accent: 'bg-red-500',
      text: 'text-red-700',
      icon: 'text-red-600'
    }
  };

  return colorMap[type] || {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    accent: 'bg-gray-500',
    text: 'text-gray-700',
    icon: 'text-gray-600'
  };
};

// Componente ConfidenceBadge
const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (conf >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (conf >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (conf >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getConfidenceColor(confidence)} font-medium`}
    >
      {confidence}% confiança
    </Badge>
  );
};

const RadarApalancamiento = () => {
  const navigate = useNavigate();
  const [scalpingRadarData, setScalpingRadarData] = useState<RadarSignal | null>(null);
  const [scalpingReversionData, setScalpingReversionData] = useState<RadarSignal | null>(null);
  const [tunderRadarData, setTunderRadarData] = useState<TunderRadarSignal | null>(null);
  const [momentumMedioData, setMomentumMedioData] = useState<TunderRadarSignal | null>(null);
  const [momentumCalmoLLData, setMomentumCalmoLLData] = useState<TunderRadarSignal | null>(null);
  const [reversaoCalmaData, setReversaoCalmaData] = useState<TunderRadarSignal | null>(null);
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

  // Estado centralizado para dados do Tunder Dashboard
  const [tunderDashboardData, setTunderDashboardData] = useState({ 
    visual_history_40: '' 
  });

  
  // Estados para controle de alta volatilidade
  const [scalpingHighVolatility, setScalpingHighVolatility] = useState(false);
  const [tunderHighVolatility, setTunderHighVolatility] = useState(false);

  // Estados para Sistema de Estratégias removidos - agora usando scalpingRadarData diretamente

  // Hook do Tunder Bot
  const tunderBot = useTunderBot();

  // Hook para notificação sonora
  const { playNotification, initializeAudio } = useAudioNotification();

  // Refs para controlar quando reproduzir som (evitar sons repetidos)
  const previousScalpingPatternFound = useRef(false);
  const previousScalpingReversionPatternFound = useRef(false);
  const previousMomentumMedioPatternFound = useRef(false);
  const previousMomentumCalmoLLPatternFound = useRef(false);
  const audioInitialized = useRef(false);

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
      
      console.log('📊 Histórico Tunder Bot atualizado:', data?.length || 0, 'operações');
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico do Tunder Bot:', error);
      return [];
    }
  };



  // Função para buscar última operação
  const fetchLastOperation = async (tableName: string) => {
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

  // Função para buscar dados do Tunder Dashboard
  const fetchTunderDashboardData = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_tunder_dashboard')
        .select('*')
        .single();
      
      if (error) {
        console.error('Erro ao buscar dados do Tunder Dashboard:', error);
        return { visual_history_40: '' };
      }
      
      console.log('📊 Dados Tunder Dashboard atualizados:', data);
      return data || { visual_history_40: '' };
    } catch (error) {
      console.error('Erro ao buscar dados do Tunder Dashboard:', error);
      return { visual_history_40: '' };
    }
  };

  // Función para obtener el estado del Scalping Bot
  const obtenerEstadoScalpingBot = async () => {
    try {
      setIsConnecting(true);
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .eq('bot_name', 'Radar Scalping I.A')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching scalping radar data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoScalpingBot:', error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Función para obtener el estado del Scalping Reversion Bot
  const obtenerEstadoScalpingReversion = async () => {
    try {
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .eq('bot_name', 'Scalping Reversion')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching scalping reversion data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoScalpingReversion:', error);
      return null;
    }
  };

  // Función para obtener el estado del Tunder Bot - ACTUALIZADA para nueva estructura
  const obtenerEstadoTunderBot = async () => {
    try {
      setIsConnecting(true);
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .like('bot_name', 'Radar Tunder 3.5%')
        .in('strategy_used', ['Log-ANALISIS', 'Log-RECOMENDACION', 'Log-CICLO'])
        .order('pattern_found_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching tunder radar data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoTunderBot:', error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Función para obtener el estado del Momentum Medio Bot - ACTUALIZADA
  const obtenerEstadoMomentumMedio = async () => {
    try {
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .like('bot_name', 'Radar Tunder 3.5%')
        .eq('strategy_used', 'Log-ANALISIS')
        .order('pattern_found_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching momentum medio radar data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoMomentumMedio:', error);
      return null;
    }
  };

  // Función para obtener el estado del Momentum Calmo LL Bot - ACTUALIZADA
  const obtenerEstadoMomentumCalmoLL = async () => {
    try {
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .like('bot_name', 'Radar Tunder 3.5%')
        .eq('strategy_used', 'Log-METRICAS')
        .order('pattern_found_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching momentum calmo LL radar data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoMomentumCalmoLL:', error);
      return null;
    }
  };

  // Función para obtener el estado del Reversão Calma Bot - ACTUALIZADA
  const obtenerEstadoReversaoCalma = async () => {
    try {
      const { data, error } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .like('bot_name', 'Radar Tunder 3.5%')
        .eq('strategy_used', 'Log-RECOMENDACION')
        .order('pattern_found_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching reversao calma radar data:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in obtenerEstadoReversaoCalma:', error);
      return null;
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
    if (reason.includes("Mercado Acumuladores")) {
      return {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        accent: 'bg-purple-500',
        text: 'text-purple-400',
        icon: 'text-purple-400'
      };
    } else if (reason.includes("Análisis Avanzado de Scalping")) {
      return {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        accent: 'bg-cyan-500',
        text: 'text-cyan-400',
        icon: 'text-cyan-400'
      };
    } else if (reason.includes("Esperando el patrón") || reason.includes("Aguardando")) {
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
      const [estadoScalpingBot, estadoScalpingReversion, estadoTunderBot, estadoMomentumMedio, estadoMomentumCalmoLL, estadoReversaoCalma, historico, statsExactas, dashboardStats, lastScalping, lastTunder, scalpingHistory, tunderHistory, tunderDashboard] = await Promise.all([
        obtenerEstadoScalpingBot(),
        obtenerEstadoScalpingReversion(),
        obtenerEstadoTunderBot(),
        obtenerEstadoMomentumMedio(),
        obtenerEstadoMomentumCalmoLL(),
        obtenerEstadoReversaoCalma(),
        obtenerHistorico(),
        obtenerEstadisticasExactas(),
        obtenerDashboardStats(),
        fetchLastOperation('scalping_accumulator_bot_logs'),
        fetchLastOperation('tunder_bot_logs'),
        fetchScalpingOperationsHistory(),
        fetchTunderOperationsHistory(),
        fetchTunderDashboardData()
      ]);

      setScalpingRadarData(estadoScalpingBot);
      setScalpingReversionData(estadoScalpingReversion);
      setTunderRadarData(estadoTunderBot);
      setMomentumMedioData(estadoMomentumMedio);
      setMomentumCalmoLLData(estadoMomentumCalmoLL);
      setReversaoCalmaData(estadoReversaoCalma);
      setHistoricData(historico);
      setDashboardStats(dashboardStats);
      
      if (estadoScalpingBot) {
        const stats = calcularEstadisticas(historico, estadoScalpingBot, statsExactas, dashboardStats);
        setBotStats(stats);
      }
      
      setLastScalpingOperation(lastScalping);
      setLastTunderOperation(lastTunder);
      setScalpingOperationsHistory(scalpingHistory);
      setTunderOperationsHistory(tunderHistory);
      
      // Atualizar dados centralizados do Tunder Dashboard
      setTunderDashboardData(tunderDashboard);
      
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
    
    // REALTIME SUBSCRIPTION unificada para todos os bots
    const channel = supabase
      .channel('shared-signals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radar_de_apalancamiento_signals'
        },
        (payload) => {
          console.log('Shared Signals - Update recebido:', payload);
          
          if (payload.new) {
            // Distribuir dados baseado no bot_name - ATUALIZADO para nova estrutura
            if (payload.new.bot_name === 'Radar Scalping I.A') {
              console.log('Atualizando dados do Scalping Bot');
              setScalpingRadarData(payload.new);
              
              // Recalcular estatísticas se necessário
              if (historicData.length > 0) {
                const newStats = calcularEstadisticas(historicData, payload.new, null, null);
                setBotStats(newStats);
              }
            } else if (payload.new.bot_name && payload.new.bot_name.includes('Radar Tunder 3.5%')) {
              console.log('Atualizando dados do Tunder Bot - Nova estrutura:', payload.new);
              setTunderRadarData(payload.new);
              
              // Atualizar dados específicos baseado no strategy_used
              if (payload.new.strategy_used === 'Log-ANALISIS') {
                console.log('Atualização de análise recebida');
              } else if (payload.new.strategy_used === 'Log-RECOMENDACION') {
                console.log('Nova recomendação recebida');
              } else if (payload.new.strategy_used === 'Log-CICLO') {
                console.log('Atualização de ciclo recebida');
              }
            }
            
            setLastUpdateTime(new Date());
          }
        }
      )
      .subscribe();

    // SEGUNDA SUBSCRIPTION para bot_metrics_consolidated - TUNDER BOT
    const metricsChannel = supabase
      .channel('bot-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_metrics_consolidated',
          filter: 'bot_name=eq.radartunder3.5'
        },
        (payload) => {
          console.log('📊 Bot metrics atualizados:', payload);
          if (payload.new) {
            // Atualizar dados do EnhancedTunderBotCard automaticamente
            console.log('Métricas do Tunder Bot atualizadas:', payload.new);
            setLastUpdateTime(new Date());
          }
        }
      )
      .subscribe();

    // REMOVIDO: Listener específico para tunder_bot_logs - Agora usando radar_de_apalancamiento_signals unificado
    
    // ATUALIZAÇÃO AUTOMÁTICA A CADA 5 SEGUNDOS
    const autoUpdateInterval = setInterval(() => {
      console.log('🔄 Atualizando dados automaticamente...');
      actualizarDatos();
    }, 5000); // 5 segundos
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(metricsChannel);
      clearInterval(autoUpdateInterval);
    };
  }, []);

  // useEffect para detectar mudanças de estratégia removido - dados agora vêm diretamente do Supabase

  const scalpingCardColors = getCardColor(scalpingRadarData?.reason || '');
  const tunderCardColors = getCardColor(tunderBot.data.status_message || '');
  const filterStatus = getFilterStatus(historicData, botStats || {});

  // Detectar padrão encontrado específico para Scalping Bot
  const isScalpingPatternFound = scalpingRadarData?.is_safe_to_operate === true;
  
  // Detectar padrão encontrado específico para Scalping Reversion
  const isScalpingReversionPatternFound = scalpingReversionData?.is_safe_to_operate === true;
  
  // Detectar padrão encontrado específico para Tunder Bot
  const isTunderPatternFound = tunderRadarData?.is_safe_to_operate === true;
  
  // Detectar padrão encontrado específico para Momentum Medio Bot
  const isMomentumMedioPatternFound = momentumMedioData?.is_safe_to_operate === true;
  
  // Detectar padrão encontrado específico para Momentum Calmo LL Bot
  const isMomentumCalmoLLPatternFound = momentumCalmoLLData?.is_safe_to_operate === true && 
    momentumCalmoLLData?.reason?.includes('SEÑAL ACTIVA: LL detectado');
  
  // Detectar padrão encontrado específico para Reversão Calma Bot
  const isReversaoCalmaPatternFound = reversaoCalmaData?.is_safe_to_operate === true;
  
  // Definir condição para padrão encontrado (qualquer uma das estratégias do Scalping Bot)
  const isPatternFound = isScalpingPatternFound || isScalpingReversionPatternFound;
  
  // Definir condição para padrão encontrado no Alavanca Bot (Momentum Medio OU Momentum Calmo LL)
  const isAlavancaPatternFound = isMomentumMedioPatternFound || isMomentumCalmoLLPatternFound;

  // useEffect para reproduzir som quando padrão for detectado
  useEffect(() => {
    const playNotificationSound = async () => {
      try {
        await playNotification();
      } catch (error) {
        console.warn('Erro ao reproduzir notificação sonora:', error);
      }
    };

    // Verificar se um novo padrão foi encontrado no Scalping Bot
    if (isScalpingPatternFound && !previousScalpingPatternFound.current) {
      playNotificationSound();
      console.log('🔊 Som reproduzido: Padrão detectado no Scalping Bot (PRECISION SURGE)');
    }
    previousScalpingPatternFound.current = isScalpingPatternFound;

    // Verificar se um novo padrão foi encontrado no Scalping Reversion
    if (isScalpingReversionPatternFound && !previousScalpingReversionPatternFound.current) {
      playNotificationSound();
      console.log('🔊 Som reproduzido: Padrão detectado no Scalping Reversion');
    }
    previousScalpingReversionPatternFound.current = isScalpingReversionPatternFound;

    // Verificar se um novo padrão foi encontrado no Momentum Medio Bot
    if (isMomentumMedioPatternFound && !previousMomentumMedioPatternFound.current) {
      playNotificationSound();
      console.log('🔊 Som reproduzido: Padrão detectado no Momentum Medio Bot');
    }
    previousMomentumMedioPatternFound.current = isMomentumMedioPatternFound;

    // Verificar se um novo padrão foi encontrado no Momentum Calmo LL Bot (SEÑAL ACTIVA: LL detectado)
    if (isMomentumCalmoLLPatternFound && !previousMomentumCalmoLLPatternFound.current) {
      playNotificationSound();
      console.log('🔊 Som reproduzido: SEÑAL ACTIVA: LL detectado no Momentum Calmo LL Bot');
    }
    previousMomentumCalmoLLPatternFound.current = isMomentumCalmoLLPatternFound;
  }, [isScalpingPatternFound, isScalpingReversionPatternFound, isMomentumMedioPatternFound, isMomentumCalmoLLPatternFound, playNotification]);

  // useEffect para inicializar áudio após primeira interação do usuário
  useEffect(() => {
    const initializeAudioOnInteraction = async () => {
      if (!audioInitialized.current) {
        try {
          await initializeAudio();
          audioInitialized.current = true;
          console.log('🔊 Áudio inicializado com sucesso');
        } catch (error) {
          console.warn('Erro ao inicializar áudio:', error);
        }
      }
    };

    // Inicializar áudio na primeira interação (click, touch, etc.)
    const handleFirstInteraction = () => {
      initializeAudioOnInteraction();
      // Remover listeners após primeira interação
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
       document.removeEventListener('click', handleFirstInteraction);
       document.removeEventListener('touchstart', handleFirstInteraction);
       document.removeEventListener('keydown', handleFirstInteraction);
     };
   }, [initializeAudio]);



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

      {/* Botão de Instalação */}
      <div className="max-w-7xl mx-auto mb-8 px-4">
        <div className="text-center">
          <Button 
            onClick={() => navigate('/installation-tutorial')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 sm:py-4 sm:px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl border border-blue-500/30 w-full sm:w-auto text-sm sm:text-base"
          >
            <Download size={16} className="mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">📚 Cómo Instalar y Configurar el Radar Del Apalancamiento</span>
          </Button>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 px-2">Aprende a configurar correctamente tu radar para máxima precisión</p>
        </div>
      </div>

      {/* Bot Cards - Lado a Lado */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SCALPING BOT Card - DESIGN UX PROFISSIONAL */}
          <Card className={`bg-gradient-to-br from-slate-900/95 to-slate-800/90 backdrop-blur-sm shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 ${
            isPatternFound
              ? 'border-2 border-emerald-400 shadow-emerald-400/30 ring-2 ring-emerald-400/20'
              : 'border border-slate-600/50 shadow-slate-900/50'
          } relative overflow-hidden group`}>
            
            {/* Banner Superior - Quando padrão encontrado */}
            {isPatternFound && (
              <div className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-black text-center py-2 px-4 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  <span className="font-black text-sm tracking-wide uppercase">
                    ATIVAR BOT AHORA
                  </span>
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
              </div>
            )}

            {/* Accent Bar */}
            <div className={`h-2 rounded-t-lg ${
              isPatternFound ? 'bg-emerald-400' : 'bg-[#2DD4BF]'
            }`}></div>
            
            <CardHeader className="pb-2 bg-[#1C2A3A]/80">
              {/* Tag Minimalista dentro do Card */}
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400 tracking-wide">🎯 MÁS PRECISO</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 border shadow-md rounded-xl ${
                    isPatternFound
                      ? 'bg-green-500/20 border-green-500/50 shadow-green-400/30'
                      : 'bg-[#2DD4BF]/20 border-[#2DD4BF]/30'
                  }`}>
                    <Shield className={isPatternFound ? 'text-green-400' : 'text-[#2DD4BF]'} size={20} />
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
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge className={`text-white text-xs px-2 py-1 ${
                    isPatternFound ? 'bg-green-500 animate-pulse' : 'bg-[#2DD4BF]'
                  }`}>
                    {isPatternFound ? 'PATRÓN ACTIVO' : 'MONITORANDO'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Header com Performance Metrics */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-300">Estratégias Ativas</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/15 to-green-500/15 border border-emerald-400/30 px-3 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-emerald-400">Ganancia: 10%</span>
                </div>
              </div>

              {/* Estratégias Grid Layout */}
              <div className="grid gap-4">
                {/* Estratégia 1 - PRECISION SURGE */}
                <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                  isScalpingPatternFound 
                    ? 'bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-700/10 border-green-500/50 shadow-lg shadow-green-500/20' 
                    : 'bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-700/20 border-slate-600/30 hover:border-slate-500/50'
                }`}>
                  {isScalpingPatternFound && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isScalpingPatternFound 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {isScalpingPatternFound ? (
                            <CheckCircle size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 mb-1">PRECISION SURGE</h4>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-xs text-slate-400">Estratégia Principal</span>
                          </div>
                        </div>
                      </div>
                      {isScalpingPatternFound && (
                        <div className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-500/30 animate-pulse">
                          🚀 ATIVAR
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-medium mb-2 ${
                      isScalpingPatternFound ? 'text-green-300' : 'text-slate-300'
                    }`}>
                      {scalpingRadarData?.reason || 'Aguardando padrão de entrada...'}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Status:</span>
                      <span className={isScalpingPatternFound ? 'text-green-400 font-medium' : 'text-slate-400'}>
                        {isScalpingPatternFound ? 'Padrão Detectado' : 'Monitorando'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estratégia 2 - SCALPING REVERSION */}
                <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                  isScalpingReversionPatternFound 
                    ? 'bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-700/10 border-green-500/50 shadow-lg shadow-green-500/20' 
                    : 'bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-700/10 border-purple-600/30 hover:border-purple-500/50'
                }`}>
                  {isScalpingReversionPatternFound && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isScalpingReversionPatternFound 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {isScalpingReversionPatternFound ? (
                            <CheckCircle size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 mb-1">SCALPING REVERSION</h4>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            <span className="text-xs text-slate-400">Estratégia Reversa</span>
                          </div>
                        </div>
                      </div>
                      {isScalpingReversionPatternFound && (
                        <div className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-500/30 animate-pulse">
                          🚀 ATIVAR
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-medium mb-2 ${
                      isScalpingReversionPatternFound ? 'text-green-300' : 'text-slate-300'
                    }`}>
                      {scalpingReversionData?.reason || 'Aguardando padrão de reversão...'}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Status:</span>
                      <span className={isScalpingReversionPatternFound ? 'text-green-400 font-medium' : 'text-slate-400'}>
                        {isScalpingReversionPatternFound ? 'Padrão Detectado' : 'Monitorando'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas Simplificadas */}
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20">
                   <div className="text-center">
                     <div className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">Vitórias</div>
                     <div className="text-2xl font-bold text-green-400">
                       {dashboardStats ? dashboardStats.wins : '0'}
                     </div>
                     <div className="text-xs text-slate-400 mt-1">Últimas 20</div>
                   </div>
                 </div>
                 
                 <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-4 border border-red-500/20">
                   <div className="text-center">
                     <div className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">Derrotas</div>
                     <div className="text-2xl font-bold text-red-400">
                       {dashboardStats ? dashboardStats.losses : '0'}
                     </div>
                     <div className="text-xs text-slate-400 mt-1">Últimas 20</div>
                   </div>
                 </div>
               </div>

               {/* Histórico Visual das Últimas 20 Operações */}
               <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/20 rounded-lg p-3 border border-slate-600/20">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                   <h3 className="text-sm font-semibold text-slate-200">Histórico Visual</h3>
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



               {/* Estrategia de Operaciones Optimizada */}
               <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/5 rounded-xl p-4 border border-blue-500/20 shadow-lg">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                   <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wide">Estrategia de Precisión Avanzada</h3>
                 </div>
                 
                 <div className="space-y-3">
                   <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 rounded-lg p-3 border border-slate-600/30">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                       <span className="text-xs font-semibold text-emerald-400 uppercase">Recomendación Profesional</span>
                     </div>
                     <p className="text-sm text-slate-200 font-medium leading-relaxed">
                       Utilizar únicamente las <span className="text-emerald-400 font-bold">2 Primeras Operaciones</span> después de surgir el patrón
                     </p>
                     <div className="mt-2 text-xs text-slate-400">
                       Máxima efectividad • Menor exposición al riesgo
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                       <div className="text-xs font-bold text-emerald-400 mb-1">1ª Operación</div>
                       <div className="text-xs text-slate-300">Precisión: 85%</div>
                     </div>
                     <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                       <div className="text-xs font-bold text-blue-400 mb-1">2ª Operación</div>
                       <div className="text-xs text-slate-300">Precisión: 78%</div>
                     </div>
                   </div>
                   
                   <div className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
                     <div className="flex items-center gap-2">
                       <AlertTriangle size={14} className="text-amber-400" />
                       <span className="text-xs font-medium text-amber-400">Importante:</span>
                     </div>
                     <p className="text-xs text-slate-300 mt-1">
                       Evitar operaciones posteriores para mantener rentabilidad óptima
                     </p>
                   </div>
                 </div>
               </div>

               {/* Tarja de Aviso */}
               <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg p-3 mb-4">
                 <div className="flex items-center gap-2 text-amber-400">
                   <AlertTriangle size={16} />
                   <span className="text-xs font-bold">⚠️ ATENCIÓN:</span>
                 </div>
                 <p className="text-xs text-amber-300 mt-1 font-medium">
                   Antes de utilizar el Bot, verifica que la Tasa de Crescimiento esté en 2%
                 </p>
               </div>

               {/* Botão Descargar Bot */}
               <Button 
                 className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                 onClick={() => window.open('https://drive.google.com/file/d/1GvTxgoItvCn6ngvuttIcTX_ryuMuJB4D/view?usp=sharing', '_blank')}
               >
                 <Download size={18} className="mr-2" />
                 Descargar Bot
               </Button>
            </CardContent>
          </Card>

          {/* TUNDER BOT Card - DESIGN UX PROFISSIONAL */}
          <EnhancedTunderBotCard />
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
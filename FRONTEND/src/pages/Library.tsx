import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import BotPerformanceCard from '../components/BotPerformanceCard';
import SkeletonCard from '../components/SkeletonCard';
import EnhancedFilterControls from '../components/EnhancedFilterControls';
import LoadingState from '../components/LoadingState';
import RecentGainsTicker from '../components/RecentGainsTicker';
import TraderProgress from '../components/TraderProgress';
import { RankingSmartHelp } from '../components/RankingSmartHelp';
import {
  Search,
  Filter,
  SortDesc,
  ChevronDown,
  Shield,
  BarChart3,
  Target,
  Users,
  Star,
  TrendingUp,
  Activity,
  Zap,
  Award,
  Bot,
  DollarSign,
  Trophy,
  Sparkles,
  ArrowUpDown,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BotStats {
  nome_bot: string;
  total_operacoes: number;
  vitorias: number;
  derrotas: number;
  assertividade_percentual: number;
  lucro_total?: number;
}

const Library = () => {
  const navigate = useNavigate();

  // Estados principais - ÚNICA FONTE DE DADOS
  const [periodoSelecionado, setPeriodoSelecionado] = useState('24 hours');
  const [stats, setStats] = useState<BotStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros profissionais
  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'excellent' | 'good' | 'average'>('all');
  const [sortBy, setSortBy] = useState<'accuracy' | 'operations' | 'wins' | 'name'>('accuracy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Estados para filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState({
    showMostAssertive: false,    // Más Asertivos (>80%)
    showMostProfitable: false,   // Más Lucrativos (mayor lucro y positivos)
    showTopApalancamiento: false, // Top Apalancamiento (bots com badges TOP 01 e TOP 02)
    showBestOfWeek: false        // Mejores Bots del la Semana
  });

  // Novos estados para controle de exibição
  const [showResults, setShowResults] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isLoadingTransition, setIsLoadingTransition] = useState(false);

  // Estado para filtro de tempo real
  const [realTimeFilter, setRealTimeFilter] = useState<'none' | '5min'>('none');

  // Estado para dados em tempo real
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Função centralizada para buscar dados em tempo real
  const fetchRealTimeData = async () => {
    try {
      setLoading(true);
      const currentTime = new Date();
      setLastUpdateTime(currentTime);

      console.log('[TEMPO REAL] Buscando dados dos últimos 5 minutos...');

      // Obter timestamp de 5 minutos atrás no formato ISO
      const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Usar a nova função que aceita timestamp do cliente
      const { data: realTimeStats, error } = await supabase
        .rpc('calcular_estatisticas_desde_timestamp', { timestamp_inicio: cincoMinutosAtras });

      if (error) {
        console.error('Erro ao buscar dados em tempo real:', error);
        setError(`Erro ao carregar dados em tempo real: ${error.message}`);
        setLoading(false);
        return;
      }

      if (realTimeStats && realTimeStats.length > 0) {
        // Mapear os dados reais dos últimos 5 minutos
        const mappedRealTimeData = realTimeStats.map(bot => ({
          nome_bot: bot.nome_bot,
          total_operacoes: bot.total_operacoes,
          vitorias: bot.vitorias,
          derrotas: bot.derrotas,
          assertividade_percentual: bot.assertividade_percentual,
          lucro_total: bot.lucro_total,
          // Métricas adicionais em tempo real
          assertividade_tempo_real: bot.assertividade_percentual,
          operacoes_recentes: bot.total_operacoes,
          vitorias_recentes: bot.vitorias,
          lucro_recente: bot.lucro_total,
          last_signal_time: currentTime,
          is_real_time: true
        }));

        setRealTimeData(mappedRealTimeData);
        setStats(mappedRealTimeData); // Definir como dados principais
        console.log(`[TEMPO REAL] ${mappedRealTimeData.length} bots com dados em tempo real`);
      } else {
        console.log('[TEMPO REAL] Nenhum dado encontrado para tempo real');
        setRealTimeData([]);
        setStats([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados em tempo real:', error);
      setError(`Problema de conexão detectado: ${error.message}`);
      setLoading(false);
    }
  };

  // Função para lidar com mudança do filtro de tempo real
  const handleRealTimeFilterChange = (filter: string) => {
    if (filter === '5min') {
      // Ativar filtro de tempo real e desativar filtros de período
      setRealTimeFilter('5min');
      setPeriodoSelecionado(''); // Limpar período selecionado
      setShowResults(true); // Mostrar resultados imediatamente

      console.log('[TEMPO REAL] Ativando filtro de dados em tempo real');

      // Executar busca imediatamente
      fetchRealTimeData();
    } else {
      // Desativar filtro de tempo real
      setRealTimeFilter('none');
      setRealTimeData([]);
      setLastUpdateTime(null);
      setStats([]); // Limpar dados
      setShowResults(false); // Voltar ao estado inicial
      setIsFirstLoad(true); // Permitir nova seleção
      setPeriodoSelecionado('24 hours'); // Definir período padrão
    }
  };

  // Função para lidar com a mudança de período
  const handlePeriodChange = (periodo: string) => {
    // Se for a primeira seleção ou uma mudança de período
    if (isFirstLoad || periodoSelecionado !== periodo) {
      // Desativar filtro de tempo real quando selecionar período normal
      setRealTimeFilter('none');
      setRealTimeData([]);
      setLastUpdateTime(null);

      setPeriodoSelecionado(periodo);
      setIsLoadingTransition(true);

      // Se for a primeira carga, atualizar o estado
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }

      // Simular um tempo de carregamento para melhor UX
      setTimeout(() => {
        setShowResults(true);
        setIsLoadingTransition(false);
      }, 1500); // Tempo suficiente para mostrar a animação de loading
    }
  };

  // useEffect para gerenciar dados em tempo real
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (realTimeFilter === '5min') {
      // Configurar intervalo para atualizar dados a cada 30 segundos
      const intervalTime = 30 * 1000; // 30 segundos para dados mais atualizados
      interval = setInterval(fetchRealTimeData, intervalTime);

      // Executar busca imediatamente
      fetchRealTimeData();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeFilter]);

  // useEffect principal - ÚNICA FONTE DE DADOS
  useEffect(() => {
    // Só buscar dados se não for a primeira carga (após seleção do usuário)
    if (!isFirstLoad) {
      // Blindar a chamada RPC com período vazio
      if (!periodoSelecionado) return;

      const fetchFilteredStats = async () => {
        setLoading(true);
        setError(null);

        console.log(`[DIAGNÓSTICO] Chamando RPC com período: '${periodoSelecionado}'`);

        const { data, error: rpcError } = await supabase.rpc(
          'calcular_estatisticas_por_periodo',
          { periodo: periodoSelecionado }
        );

        if (rpcError) {
          console.error("[DIAGNÓSTICO] Erro na chamada RPC:", rpcError);
          setError("Não foi possível carregar os dados. Verifique o console para detalhes técnicos.");
        } else {
          console.log(`[DIAGNÓSTICO] Dados recebidos da RPC:`, data);
          setStats(data || []);
        }

        setLoading(false);
      };

      fetchFilteredStats();
    }
  }, [periodoSelecionado, isFirstLoad]);

  // Função para mapear nomes de bots para suas rotas específicas
  const getBotRoute = (botName: string): string => {
    const normalizedName = botName.toLowerCase().replace(/[_\s]/g, '');

    const botRoutes: { [key: string]: string } = {
      'quantumbotfixedstake': '/bot/11',
      'quantumbot': '/bot/11',
      'botapalancamiento': '/apalancamiento-100x',
      'apalancamiento': '/apalancamiento-100x',
      'botai2.0': '/bot/16',
      'botai': '/bot/16',
      'factor50xconservador': '/factor50x',
      'factor50x': '/factor50x',
      'wolfbot2.0': '/bot/wolf-bot',
      'wolfbot': '/bot/wolf-bot',
      'sniperbotmartingale': '/bot/15',
      'sniperbot': '/bot/15',
      'nexusbot': '/bot/14',
      'bkbot1.0': '/bk-bot',
      'bkbot': '/bk-bot',
      'scalebot': '/bot/scale-bot',
      'scale': '/bot/scale-bot',
      'alfabot': '/alfabot',
      'doublecuentas': '/double-cuentas',
      'double': '/double-cuentas',
      'cuentas': '/double-cuentas',
      'doublecuentas1.0': '/double-cuentas',
      'aurabot': '/aura-bot',
      'aura': '/aura-bot',
      'astronbot': '/astron-bot',
      'astron': '/astron-bot'
    };

    return botRoutes[normalizedName] || '/';
  };

  // Função para navegar para a página do bot
  const handleBotClick = (botName: string) => {
    const route = getBotRoute(botName);
    navigate(route);
  };

  // Función para obtener el color de la asertividad
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-emerald-500';
    if (accuracy >= 70) return 'text-primary';
    if (accuracy >= 60) return 'text-blue-500';
    return 'text-orange-500';
  };

  // Función para obtener el color del progreso
  const getProgressColor = (accuracy: number) => {
    if (accuracy >= 80) return 'from-emerald-500 to-emerald-400';
    if (accuracy >= 70) return 'from-primary to-primary/80';
    if (accuracy >= 60) return 'from-blue-500 to-blue-400';
    return 'from-orange-500 to-orange-400';
  };

  // Lógica de filtros e ordenação com useMemo para performance
  const filteredAndSortedStats = useMemo(() => {
    // Decidir qual array de dados usar
    let dataToFilter = [];

    if (realTimeFilter === '5min') {
      dataToFilter = realTimeData;
    } else {
      dataToFilter = stats;
    }

    let filtered = dataToFilter.filter(bot => {
      // Filtro de busca
      const matchesSearch = bot.nome_bot.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de performance
      const accuracy = parseFloat(bot.assertividade_percentual?.toString() || '0');
      let matchesPerformance = true;

      switch (performanceFilter) {
        case 'excellent':
          matchesPerformance = accuracy >= 80;
          break;
        case 'good':
          matchesPerformance = accuracy >= 70 && accuracy < 80;
          break;
        case 'average':
          matchesPerformance = accuracy < 70;
          break;
        default:
          matchesPerformance = true;
      }

      // Filtros avançados simplificados
      let matchesMostAssertive = true;
      if (advancedFilters.showMostAssertive) {
        matchesMostAssertive = bot.assertividade_percentual >= 80;
      }

      let matchesMostProfitable = true;
      if (advancedFilters.showMostProfitable && bot.lucro_total !== undefined) {
        matchesMostProfitable = bot.lucro_total > 0;
      }

      // Filtro Top Apalancamiento - bots com tarja de alavancagem
      let matchesTopApalancamiento = true;
      if (advancedFilters.showTopApalancamiento) {
        const botName = bot.nome_bot.toLowerCase();
        // Verifica se é Vip Boster (TOP 01 APALANCAMIENTO)
        const isVipBoster = botName.includes('vip') && botName.includes('boster');
        // Verifica se é Factor 50X (TOP 02 APALANCAMIENTO)
        const isFactor50X = botName.includes('factor') && botName.includes('50x');
        // Verifica se é Bot del Apalancamiento, Apalancamiento 100X ou Apalancamiento
        const isApalancamientoBot = (botName.includes('bot') && botName.includes('apalancamiento')) ||
          (botName.includes('apalancamiento') && botName.includes('100x')) ||
          (botName.includes('apalancamiento') && !botName.includes('bot') && !botName.includes('100x'));

        matchesTopApalancamiento = isVipBoster || isFactor50X || isApalancamientoBot;
      }

      // Filtro Mejores Bots del la Semana
      let matchesBestOfWeek = true;
      if (advancedFilters.showBestOfWeek) {
        const botName = bot.nome_bot.toLowerCase();
        const isFactor50X = botName.includes('factor') && botName.includes('50x');
        const isVipBoster = botName.includes('vip') && botName.includes('boster');
        const isQuantumBot = botName.includes('quantum') && botName.includes('bot');

        matchesBestOfWeek = isFactor50X || isVipBoster || isQuantumBot;
      }

      return matchesSearch && matchesPerformance && matchesMostAssertive && matchesMostProfitable && matchesTopApalancamiento && matchesBestOfWeek;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      // Se o filtro "Más Lucrativos" estiver ativo, priorizar ordenação por lucro
      if (advancedFilters.showMostProfitable && sortBy === 'accuracy') {
        aValue = a.lucro_total || 0;
        bValue = b.lucro_total || 0;
      } else {
        switch (sortBy) {
          case 'accuracy':
            aValue = parseFloat(a.assertividade_percentual?.toString() || '0');
            bValue = parseFloat(b.assertividade_percentual?.toString() || '0');
            break;
          case 'operations':
            aValue = parseInt(a.total_operacoes?.toString() || '0');
            bValue = parseInt(b.total_operacoes?.toString() || '0');
            break;
          case 'wins':
            aValue = parseInt(a.vitorias?.toString() || '0');
            bValue = parseInt(b.vitorias?.toString() || '0');
            break;
          case 'name':
            aValue = a.nome_bot.toLowerCase();
            bValue = b.nome_bot.toLowerCase();
            break;
          default:
            aValue = parseFloat(a.assertividade_percentual?.toString() || '0');
            bValue = parseFloat(b.assertividade_percentual?.toString() || '0');
        }
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [stats, realTimeData, realTimeFilter, searchTerm, performanceFilter, sortBy, sortOrder, advancedFilters]);

  // Estatísticas calculadas
  const localStats = useMemo(() => {
    const totalBots = filteredAndSortedStats.length;
    const avgAccuracy = totalBots > 0 ? filteredAndSortedStats.reduce((sum, bot) => sum + parseFloat(bot.assertividade_percentual?.toString() || '0'), 0) / totalBots : 0;
    const totalOperations = filteredAndSortedStats.reduce((sum, bot) => sum + parseInt(bot.total_operacoes?.toString() || '0'), 0);
    const excellentBots = filteredAndSortedStats.filter(bot => parseFloat(bot.assertividade_percentual?.toString() || '0') >= 80).length;

    return {
      totalBots,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      totalOperations,
      excellentBots
    };
  }, [filteredAndSortedStats]);

  // Renderização condicional para loading inicial
  if (loading && isLoadingTransition === false) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-500">
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-2xl shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/15 to-background"></div>

            <div className="relative z-10 py-12 px-8 text-center">
              <div className="inline-block mb-3 bg-primary/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-primary/20">
                <span className="text-primary font-medium text-sm flex items-center gap-2">
                  <Award size={14} className="text-primary" />
                  Ranking de Asertividad
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground leading-tight">
                🏆 <span className="text-primary">Ranking de Asertividad</span>
              </h1>

              <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="text-primary animate-spin" size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-primary">Cargando datos</h3>
                    <p className="text-sm text-muted-foreground">Analizando rendimiento de bots</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>Procesando estadísticas...</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error && stats.length === 0 && !isFirstLoad) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-500">
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-2xl shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/15 to-background"></div>

            <div className="relative z-10 py-12 px-8 text-center">
              <div className="inline-block mb-3 bg-primary/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-primary/20">
                <span className="text-primary font-medium text-sm flex items-center gap-2">
                  <Award size={14} className="text-primary" />
                  Ranking de Asertividad
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground leading-tight">
                🏆 <span className="text-primary">Ranking de Asertividad</span>
              </h1>

              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Bot className="text-destructive" size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-destructive">Error al cargar datos</h3>
                    <p className="text-sm text-muted-foreground">Problema de conexión detectado</p>
                  </div>
                </div>
                <p className="text-sm text-destructive/80 mb-4">{error}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>Cargando datos simulados...</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      {/* Recent Gains Ticker */}
      <RecentGainsTicker className="mb-6 -mx-4" />

      {/* Trader Progress Widget */}
      <TraderProgress className="mb-8" />

      {/* Hero Section - Premium Design */}
      <section className="mb-10">
        <div className="relative overflow-hidden rounded-3xl p-[1px] group">
          {/* Infinite Border Animation - Super subtle */}
          <div className="absolute inset-[-100%] animate-[spin_15s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#0000_0%,rgb(16,185,129)_50%,#0000_100%)] opacity-20" />

          {/* Main Content Container */}
          <div className="relative h-full w-full bg-card/80 backdrop-blur-3xl rounded-[calc(1.5rem-1px)] border border-primary/10 overflow-hidden">

            {/* Background layers with subtle pulse */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background opacity-50" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-30 animate-pulse" style={{ animationDuration: '4s' }} />

            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/10 to-transparent -top-64 -right-32 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
              <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-500/5 to-transparent bottom-0 -left-32 blur-3xl" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            </div>

            <div className="relative z-10 py-10 px-6 md:px-10 flex flex-col lg:flex-row items-start gap-8">
              {/* Left content */}
              <div className="flex-1 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 mb-4 shadow-[0_0_15px_-3px_var(--primary)] shadow-primary/20">
                  <Award size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Ranking de Asertividad</span>
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground leading-tight tracking-tight flex items-center">
                  <span className="bg-gradient-to-r from-primary via-primary to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                    Ranking de Asertividad
                  </span>
                  <RankingSmartHelp variant="ranking" />
                </h1>

                <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl">
                  Descubre los bots de trading con mejor desempeño en nuestra plataforma.
                  Analiza su asertividad, operaciones y resultados en diferentes períodos de tiempo.
                </p>

                {showResults && (
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 backdrop-blur-sm border border-primary/20 hover:bg-primary/10 transition-colors duration-300">
                      <Zap size={16} className="text-primary" />
                      <span className="text-sm font-semibold">
                        <span className="text-primary">{localStats.totalBots}</span>
                        <span className="text-muted-foreground ml-1">Bots Analizados</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/5 backdrop-blur-sm border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors duration-300">
                      <TrendingUp size={16} className="text-emerald-500" />
                      <span className="text-sm font-semibold">
                        <span className="text-emerald-500">{localStats.excellentBots}</span>
                        <span className="text-muted-foreground ml-1">Bots Excelentes</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/5 backdrop-blur-sm border border-blue-500/20 hover:bg-blue-500/10 transition-colors duration-300">
                      <Activity size={16} className="text-blue-500" />
                      <span className="text-sm font-semibold">
                        <span className="text-blue-500">{localStats.avgAccuracy}%</span>
                        <span className="text-muted-foreground ml-1">Precisión Media</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right stats card */}
              {showResults && (
                <div className="w-full lg:w-80 lg:flex-shrink-0">
                  <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-white/5 p-5 shadow-2xl shadow-black/10 hover:shadow-primary/5 transition-shadow duration-500">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                        <BarChart3 className="text-primary" size={22} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">Estadísticas Globales</h3>
                        <p className="text-xs text-muted-foreground">Período: {periodoSelecionado || 'Todos'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground font-medium">Operaciones Totales</span>
                          <span className="text-xs font-bold text-foreground">{localStats.totalOperations.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-out" style={{ width: '100%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground font-medium">Precisión Media</span>
                          <span className="text-xs font-bold text-emerald-500">{localStats.avgAccuracy}%</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-500 rounded-full transition-all duration-1000 ease-out delay-100" style={{ width: `${localStats.avgAccuracy}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground font-medium">Bots Excelentes</span>
                          <span className="text-xs font-bold text-blue-500">{localStats.excellentBots} de {localStats.totalBots}</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500/60 to-blue-500 rounded-full transition-all duration-1000 ease-out delay-200" style={{ width: `${(localStats.excellentBots / Math.max(localStats.totalBots, 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Controles de filtro aprimorados */}
      <section className="mb-8">
        <div className="flex justify-center">
          <EnhancedFilterControls
            periodoAtual={periodoSelecionado}
            onPeriodoChange={handlePeriodChange}
            showResults={showResults}
            showBestOfWeek={advancedFilters.showBestOfWeek}
            showTopApalancamiento={advancedFilters.showTopApalancamiento}
            onBestOfWeekChange={(value) => setAdvancedFilters(prev => ({ ...prev, showBestOfWeek: value }))}
            onTopApalancamientoChange={(value) => setAdvancedFilters(prev => ({ ...prev, showTopApalancamiento: value }))}
            realTimeFilter={realTimeFilter}
            onRealTimeFilterChange={handleRealTimeFilterChange}
          />
        </div>
      </section>

      {/* Filtros Avanzados */}
      {showResults && !isLoadingTransition && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-6xl mx-auto">
            {/* Header de los Filtros */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Filter className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Filtros Avanzados</h2>
                <p className="text-sm text-muted-foreground">Encuentra los bots más exitosos</p>
              </div>
            </div>

            {/* Filtros Básicos - Siempre Visibles */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Buscar por Nombre */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Search size={14} className="text-primary" />
                    Buscar por Nombre
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe el nombre del robot..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                      >
                        <X size={14} className="text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtro de Rendimiento */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Target size={14} className="text-primary" />
                    Nivel de Rendimiento
                  </label>
                  <select
                    value={performanceFilter}
                    onChange={(e) => setPerformanceFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  >
                    <option value="all">Todos los Niveles</option>
                    <option value="excellent">Excelente (≥80%)</option>
                    <option value="good">Bueno (60-79%)</option>
                    <option value="average">Promedio (40-59%)</option>
                  </select>
                </div>

                {/* Filtro Elite: Más Asertivos */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <BarChart3 size={14} className="text-emerald-500" />
                    Más Asertivos
                  </label>
                  <button
                    onClick={() => setAdvancedFilters(prev => ({
                      ...prev,
                      showMostAssertive: !prev.showMostAssertive
                    }))}
                    className={`w-full px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center justify-center gap-2 ${advancedFilters.showMostAssertive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 shadow-lg shadow-emerald-500/10'
                      : 'bg-background border-border hover:border-emerald-500/20 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-600'
                      }`}
                  >
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${advancedFilters.showMostAssertive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      }`}></div>
                    <span className="text-sm font-medium">≥80%</span>
                  </button>
                </div>

                {/* Filtro Elite: Más Lucrativos */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DollarSign size={14} className="text-green-500" />
                    Más Lucrativos
                  </label>
                  <button
                    onClick={() => setAdvancedFilters(prev => ({
                      ...prev,
                      showMostProfitable: !prev.showMostProfitable
                    }))}
                    className={`w-full px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center justify-center gap-2 ${advancedFilters.showMostProfitable
                      ? 'bg-green-500/10 border-green-500/30 text-green-600 shadow-lg shadow-green-500/10'
                      : 'bg-background border-border hover:border-green-500/20 hover:bg-green-500/5 text-muted-foreground hover:text-green-600'
                      }`}
                  >
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${advancedFilters.showMostProfitable ? 'bg-green-500' : 'bg-muted-foreground/30'
                      }`}></div>
                    <span className="text-sm font-medium">Positivos</span>
                  </button>
                </div>


              </div>
            </div>

            {/* Botón de Reset - Minimalista */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  setAdvancedFilters({
                    showMostAssertive: false,
                    showMostProfitable: false,
                    showTopApalancamiento: false,
                    showBestOfWeek: false
                  });
                  setSearchTerm('');
                  setPerformanceFilter('all');
                  setSortBy('accuracy');
                  setSortOrder('desc');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted/80 rounded-lg border border-border transition-all duration-200 group"
              >
                <X size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Limpiar Filtros
                </span>
              </button>
            </div>

            {/* Resultados de los Filtros */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users size={14} />
                <span>
                  Mostrando <span className="font-medium text-primary">{filteredAndSortedStats.length}</span> de{' '}
                  <span className="font-medium">{stats?.length || 0}</span> bots
                </span>
              </div>
              {(searchTerm || performanceFilter !== 'all' || advancedFilters.showMostAssertive ||
                advancedFilters.showMostProfitable) && (
                  <div className="flex items-center gap-2 text-primary">
                    <Filter size={14} />
                    <span>Filtros activos</span>
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* Estado de carregamento personalizado */}
      {isLoadingTransition && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <LoadingState message={`Analisando dados dos últimos ${periodoSelecionado}`} />
        </section>
      )}

      {/* Indicador de Resultado del Ahora */}
      {showResults && !isLoadingTransition && realTimeFilter !== 'none' && (
        <section className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-semibold text-sm">⚡ RESULTADO DEL AHORA ACTIVO</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Actualizando cada 5 minutos
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Zap size={16} className="text-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600">
                    Datos en Tiempo Real
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Container dos cards - Design profissional com cores nativas */}
      {showResults && !isLoadingTransition && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-10 text-red-500">{error}</div>
          )}

          {!loading && !error && filteredAndSortedStats.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Zap size={28} className="text-primary animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Aguardando próxima oportunidad de mercado...</h3>
              <p className="text-muted-foreground">Los bots están analizando las condiciones del mercado.</p>
            </div>
          )}

          {!loading && !error && filteredAndSortedStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedStats.map((bot, index) => (
                <BotPerformanceCard
                  key={bot.nome_bot}
                  bot={bot}
                  index={index}
                  periodoSelecionado={periodoSelecionado}
                  showBestOfWeekBadge={advancedFilters.showBestOfWeek}
                  rankingPosition={index + 1}
                  isRealTime={realTimeFilter !== 'none'}
                  realTimeMetrics={realTimeFilter !== 'none' ? {
                    assertividade_tempo_real: bot.assertividade_tempo_real,
                    momentum_score: bot.momentum_score,
                    volatility_index: bot.volatility_index,
                    risk_reward_ratio: bot.risk_reward_ratio,
                    drawdown_atual: bot.drawdown_atual,
                    sharpe_ratio: bot.sharpe_ratio,
                    win_streak: bot.win_streak,
                    signal_strength: bot.signal_strength,
                    market_correlation: bot.market_correlation,
                    last_signal_time: bot.last_signal_time
                  } : undefined}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Library;
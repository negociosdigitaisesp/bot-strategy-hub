import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  Eye,
  RefreshCw,
  History,
  Target,
  BarChart3,
  Bot,
  Filter,
  Search,
  Calendar,
  Gauge,
  Award,
  Star,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRadarScalping } from '../hooks/useRadarScalping';
import { RadarScalpingFilters } from '../types/radarScalping';

const RadarScalping = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RadarScalpingFilters>({
    showSafeOnly: false,
    minAccuracy: 0,
    minConfidence: 0,
    strategyFilter: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  const { signals, stats, loading, error, lastUpdate, refreshData } = useRadarScalping(filters);

  const filteredSignals = useMemo(() => {
    return signals.filter(signal => 
      signal.bot_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [signals, searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (isSafe: boolean) => {
    return isSafe ? 'text-green-500' : 'text-red-500';
  };

  const getStatusBadge = (isSafe: boolean) => {
    return isSafe ? (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        <CheckCircle size={12} className="mr-1" />
        Seguro
      </Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
        <XCircle size={12} className="mr-1" />
        Risco
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAccuracyColor = (accuracy: number | null) => {
    if (!accuracy) return 'text-gray-500';
    if (accuracy >= 70) return 'text-green-500';
    if (accuracy >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Radar Scalping</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Radar Scalping</h1>
          </div>
          
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
              <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshData} className="flex items-center gap-2">
                <RefreshCw size={16} />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Activity className="text-primary" size={32} />
                Radar Scalping
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitoramento em tempo real dos sinais de apalancamento
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Última atualização: {formatDate(lastUpdate.toISOString())}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Bot className="text-blue-500" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Bots</p>
                  <p className="text-2xl font-bold">{stats.totalBots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="text-green-500" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">Bots Seguros</p>
                  <p className="text-2xl font-bold">{stats.safeBots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">Bots em Risco</p>
                  <p className="text-2xl font-bold">{stats.unsafeBots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="text-purple-500" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">Precisão Média</p>
                  <p className="text-2xl font-bold">{stats.averageAccuracy.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter size={20} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Buscar bot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="safeOnly"
                  checked={filters.showSafeOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, showSafeOnly: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="safeOnly" className="text-sm">Apenas seguros</label>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Precisão mínima (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minAccuracy}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAccuracy: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Confiança mínima (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minConfidence}
                  onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSignals.map((signal) => (
            <Card 
              key={signal.id} 
              className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                signal.is_safe_to_operate 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot size={20} />
                    {signal.bot_name}
                  </CardTitle>
                  {getStatusBadge(signal.is_safe_to_operate)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(signal.created_at)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Status e Razão */}
                {signal.reason && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">Razão:</p>
                    <p className="text-sm text-muted-foreground">{signal.reason}</p>
                  </div>
                )}
                
                {/* Métricas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Precisão</p>
                    <p className={`text-lg font-bold ${
                      getAccuracyColor(signal.historical_accuracy)
                    }`}>
                      {signal.historical_accuracy ? `${signal.historical_accuracy.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Confiança</p>
                    <p className={`text-lg font-bold ${
                      getConfidenceColor(signal.strategy_confidence)
                    }`}>
                      {signal.strategy_confidence ? `${signal.strategy_confidence.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
                
                {/* Estratégia */}
                {signal.strategy_used && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Estratégia:</p>
                    <Badge variant="outline" className="text-xs">
                      {signal.strategy_used}
                    </Badge>
                  </div>
                )}
                
                {/* Operações */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Vitórias (5)</p>
                    <p className="text-sm font-semibold text-green-500">
                      {signal.wins_in_last_5_ops || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Perdas (10)</p>
                    <p className="text-sm font-semibold text-red-500">
                      {signal.losses_in_last_10_ops || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Após Padrão</p>
                    <p className="text-sm font-semibold">
                      {signal.operations_after_pattern}
                    </p>
                  </div>
                </div>
                
                {/* Último Padrão */}
                {signal.last_pattern_found && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Último Padrão:</p>
                    <p className="text-sm font-mono bg-muted/50 p-2 rounded">
                      {signal.last_pattern_found}
                    </p>
                    {signal.pattern_found_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Encontrado em: {formatDate(signal.pattern_found_at)}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Tempo de Execução */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tempo de execução:</span>
                  <span>{signal.execution_time_ms}ms</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredSignals.length === 0 && (
          <Card className="mt-8">
            <CardContent className="p-12 text-center">
              <Bot className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-semibold mb-2">Nenhum sinal encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || filters.showSafeOnly || filters.minAccuracy > 0 || filters.minConfidence > 0
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Aguardando novos sinais do radar de scalping.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RadarScalping;
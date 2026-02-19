import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RadarScalpingSignal, RadarScalpingStats, RadarScalpingFilters } from '../types/radarScalping';

export const useRadarScalping = (filters?: RadarScalpingFilters) => {
  const [signals, setSignals] = useState<RadarScalpingSignal[]>([]);
  const [stats, setStats] = useState<RadarScalpingStats>({
    totalBots: 0,
    safeBots: 0,
    unsafeBots: 0,
    averageAccuracy: 0,
    averageConfidence: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const calculateStats = useCallback((data: RadarScalpingSignal[]): RadarScalpingStats => {
    const totalBots = data.length;
    const safeBots = data.filter(signal => signal.is_safe_to_operate).length;
    const unsafeBots = totalBots - safeBots;
    
    const accuracyValues = data
      .filter(signal => signal.historical_accuracy !== null)
      .map(signal => signal.historical_accuracy!);
    
    const confidenceValues = data
      .filter(signal => signal.strategy_confidence !== null)
      .map(signal => signal.strategy_confidence!);
    
    const averageAccuracy = accuracyValues.length > 0 
      ? accuracyValues.reduce((sum, acc) => sum + acc, 0) / accuracyValues.length 
      : 0;
    
    const averageConfidence = confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length 
      : 0;

    return {
      totalBots,
      safeBots,
      unsafeBots,
      averageAccuracy,
      averageConfidence
    };
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros se fornecidos
      if (filters) {
        if (filters.showSafeOnly) {
          query = query.eq('is_safe_to_operate', true);
        }
        if (filters.minAccuracy > 0) {
          query = query.gte('historical_accuracy', filters.minAccuracy);
        }
        if (filters.minConfidence > 0) {
          query = query.gte('strategy_confidence', filters.minConfidence);
        }
        if (filters.strategyFilter && filters.strategyFilter !== 'all') {
          query = query.eq('strategy_used', filters.strategyFilter);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const signalsData = data as RadarScalpingSignal[];
      setSignals(signalsData);
      setStats(calculateStats(signalsData));
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao buscar sinais do radar:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [filters, calculateStats]);

  const refreshData = useCallback(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Buscar dados iniciais
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Configurar subscription para atualizações em tempo real
  useEffect(() => {
    const subscription = supabase
      .channel('radar_scalping_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radar_de_apalancamiento_signals'
        },
        (payload) => {
          console.log('Mudança detectada na tabela radar_de_apalancamiento_signals:', payload);
          // Recarregar dados quando houver mudanças
          fetchSignals();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSignals]);

  // Auto-refresh a cada 30 segundos como fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSignals();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fetchSignals]);

  return {
    signals,
    stats,
    loading,
    error,
    lastUpdate,
    refreshData
  };
};
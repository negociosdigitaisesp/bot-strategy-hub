import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useTunderBot = () => {
  const [data, setData] = useState({
    victorias_display: '0/0',
    wins_5_display: '0x0',
    wins_5_percent: 0,
    precision_percent: 0,
    status_message: 'Esperando el patrón...',
    ops_patron: '0/3',
    estado: 'ACTIVO',
    vdv_pattern: false
  });
  const [operations, setOperations] = useState([]);
  const [signal, setSignal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTunderHistoryModal, setShowTunderHistoryModal] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Query 1: Performance data
      const { data: statsData, error: statsError } = await supabase
        .from('vw_tunder_dashboard')
        .select('*')
        .limit(1);
      
      // Query 2: Operational signals
      const { data: signalData, error: signalError } = await supabase
        .from('radar_de_apalancamiento_signals')
        .select('*')
        .eq('bot_name', 'Tunder Bot')
        .order('created_at', { ascending: false })
        .limit(1);

      // Query 3: Operations history
      const { data: opsData, error: opsError } = await supabase
        .from('bot_operations')
        .select('*')
        .eq('bot_name', 'TUNDER BOT')
        .order('created_at', { ascending: false })
        .limit(50);

      const stats = statsData?.[0];
      const signalInfo = signalData?.[0];
      
      // Calcular precisión basada en operaciones reales
      const totalOps = opsData?.length || 0;
      const winsOps = opsData?.filter(op => op.result === 'WIN' || op.result === 'win')?.length || 0;
      const calculatedPrecision = totalOps > 0 ? Math.round((winsOps / totalOps) * 100) : 0;
      
      // Detectar patrón VDV en el reason
      const reasonText = signalInfo?.reason || '';
      const hasVDVPattern = reasonText.toLowerCase().includes('vdv') || 
                           reasonText.toLowerCase().includes('v-d-v') ||
                           reasonText.toLowerCase().includes('victoria-derrota-victoria');

      // Corrigir V/D usando wins/losses da vw_tunder_dashboard
      const vdDisplay = `${stats?.wins || 0}/${stats?.losses || 0}`;
      
      // Corrigir Wins 5 usando wins_5_count - 5
      const wins5Count = stats?.wins_5_count || 0;
      const losses5Count = 5 - wins5Count;
      const wins5Display = `${wins5Count}/${losses5Count}`;
      const wins5Percent = wins5Count > 0 ? Math.round((wins5Count / 5) * 100) : 0;

      setData({
        victorias_display: vdDisplay,
        wins_5_display: wins5Display,
        wins_5_percent: wins5Percent,
        precision_percent: calculatedPrecision,
        status_message: signalInfo?.reason || 'Esperando el patrón...',
        ops_patron: `${signalInfo?.operations_after_pattern || 0}/3`,
        estado: signalInfo?.is_safe_to_operate ? 'ACTIVO' : 'RIESGO',
        vdv_pattern: hasVDVPattern
      });
      
      setSignal(signalInfo);
      setOperations(opsData || []);
    } catch (error) {
      console.error('Error Tunder Bot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    operations,
    signal,
    isLoading,
    showTunderHistoryModal,
    setShowTunderHistoryModal
  };
};
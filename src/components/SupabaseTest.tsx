import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// COLOQUE SUAS CHAVES AQUI PARA TESTE RÁPIDO
const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U'; // NÃO USE A SERVICE ROLE AQUI

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function SupabaseTest() {
  const [lastSignal, setLastSignal] = useState<any>(null);
  const [status, setStatus] = useState('Desconectado');

  useEffect(() => {
    setStatus('Conectando...');

    const channel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'active_signals' },
        (payload) => {
          console.log("🔥 SINAL RECEBIDO:", payload.new);
          setLastSignal(payload.new);

          // Teste de Latência
          const now = Date.now();
          const signalTime = new Date(payload.new.created_at).getTime();
          const latency = now - signalTime;
          alert(`Sinal Recebido! Latência: ${latency}ms`);
        }
      )
      .subscribe((status) => setStatus(status));

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-4 bg-gray-800 text-white border border-yellow-500 m-4 rounded">
      <h2 className="font-bold text-yellow-500">TESTE DE RECEPÇÃO SUPABASE</h2>
      <p>Status: {status}</p>
      <div className="mt-2 bg-black p-2 font-mono text-xs">
        {lastSignal ? JSON.stringify(lastSignal, null, 2) : "Aguardando sinal da VPS..."}
      </div>
    </div>
  );
}
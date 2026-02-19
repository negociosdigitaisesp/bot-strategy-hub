import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // ✅ Use singleton

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
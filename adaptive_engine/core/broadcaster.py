# adaptive_engine/core/broadcaster.py
import os
import logging
from supabase import create_client, Client
from typing import Dict, Optional
import time

logger = logging.getLogger(__name__)

# Configuração Supabase (Service Role Key para bypass RLS)
SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4'

class SupabaseBroadcaster:
    """
    Envia sinais para a tabela 'active_signals' do Supabase.
    Permite que o Frontend (React) receba e execute os sinais.
    """
    def __init__(self):
        try:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.enabled = True
            logger.info("-> Supabase Broadcaster inicializado.")
        except Exception as e:
            logger.error(f"❌ Erro ao inciar Supabase Broadcaster: {e}")
            self.enabled = False

    def broadcast(self, signal: Dict):
        """
        Insere sinal na tabela active_signals.
        """
        if not self.enabled: return

        try:
            # Adaptar payload para o schema da tabela
            # Frontend espera: id, asset, direction, expiry_seconds, strategy
            payload = {
                "asset": signal['asset'],
                "direction": signal['direction'],
                "expiry_seconds": 60, # TODO: Workflow deve definir expiração
                "strategy": "Volatility Barrier", # Match com nome no Frontend
                "confidence": int(signal['confidence'] * 100),
                "regime": signal['metadata'].get('regime', 'NORMAL'),
                "created_at": time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
            }

            # Envio assíncrono (fake async na lib sync, mas ok pra MVP)
            data = self.client.table("active_signals").insert(payload).execute()
            logger.info(f"-> Sinal enviado para Supabase: {signal['asset']} {signal['direction']}")
        except Exception as e:
            logger.error(f"ERROR Falha no Broadcast: {e}")

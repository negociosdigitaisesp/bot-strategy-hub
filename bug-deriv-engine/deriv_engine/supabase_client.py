"""
deriv_engine/supabase_client.py — Cliente Supabase (singleton).

Usa service_role key para acesso total às tabelas.
Import e use get_supabase() em qualquer módulo que precisar do cliente.
"""
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

_supabase: Client | None = None


def get_supabase() -> Client:
    """Retorna a instância singleton do cliente Supabase."""
    global _supabase
    if _supabase is None:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase

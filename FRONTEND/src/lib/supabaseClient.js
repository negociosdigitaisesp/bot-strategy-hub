
import { createClient } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════════════════════
// 🏦 BANCO CENTRAL — Million Bots Platform (xwclmxjeombwabfdvyij)
// ⚠️ NÃO use este cliente para tabelas HFT (hft_oracle_results, agent_cycles, etc.)
//    Para HFT, use EXCLUSIVAMENTE o hftSupabase.ts
// ═══════════════════════════════════════════════════════════════════════════════

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas no .env.local')
}

// Cliente principal — conecta ao banco Central (profiles, iq_bots, etc.)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-central-auth', // chave isolada do banco Central
  }
})

// Exportar flag de modo demo (false quando as credenciais reais estão configuradas)
export const isSupabaseDemoMode = !supabaseUrl || !supabaseAnonKey

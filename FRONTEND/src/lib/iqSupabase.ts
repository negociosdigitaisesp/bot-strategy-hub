/**
 * iqSupabase.ts — Cliente Supabase B para IQ Option
 * Gêmeo isolado do hftSupabase.ts — aponta para iq_lake / iq_quant
 *
 * @SHIELD_AGENT: NUNCA importar fora de /IQQuant e hooks IQ diretos
 * Regra de isolamento: hftSupabase → hft_lake/hft_quant (Deriv)
 *                      iqSupabase   → iq_lake/iq_quant  (IQ Option)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_B_URL = import.meta.env.VITE_HFT_SUPABASE_URL as string
const SUPABASE_B_KEY = import.meta.env.VITE_HFT_SUPABASE_ANON_KEY as string

if (!SUPABASE_B_URL || !SUPABASE_B_KEY) {
  console.warn('[iqSupabase] Variáveis VITE_HFT_SUPABASE_* não configuradas')
}

export const iqSupabase = createClient(SUPABASE_B_URL, SUPABASE_B_KEY, {
  auth: {
    storageKey: 'sb-iq-auth',    // isolado de hftSupabase (sb-hft-auth) e Central (sb-central-auth)
    persistSession: false,        // IQ Option não usa auth do Supabase
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export const isIQConfigured = Boolean(SUPABASE_B_URL && SUPABASE_B_KEY)

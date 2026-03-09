import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════════════════════
// 🏦 BANCO CENTRAL — Million Bots Platform (xwclmxjeombwabfdvyij)
// Tabelas: profiles, iq_bots, calcular_estatisticas_por_periodo, etc.
//
// ⚠️ REGRA DE ISOLAMENTO:
//    NÃO use este cliente para tabelas HFT.
//    Para hft_oracle_results, agent_cycles, hft_catalogo_estrategias
//    use EXCLUSIVAMENTE → src/lib/hftSupabase.ts
// ═══════════════════════════════════════════════════════════════════════════════

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseDebug = import.meta.env.VITE_SUPABASE_DEBUG === 'true'

// Validação de configuração
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ BANCO CENTRAL: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no .env.local')
}

// Enhanced fetch com logging em modo debug
const enhancedFetch = (...args: Parameters<typeof fetch>): Promise<Response> => {
  if (supabaseDebug) {
    const url = args[0] instanceof Request ? args[0].url : args[0].toString()
    const method = args[0] instanceof Request ? args[0].method : (args[1]?.method || 'GET')
    const requestId = `req_${Math.random().toString(36).substring(2, 9)}`
    console.log(`🔄 [${requestId}] Central API: ${method} ${url.split('?')[0]}`)
    const startTime = performance.now()

    return fetch(...args)
      .then(response => {
        const duration = (performance.now() - startTime).toFixed(2)
        if (!response.ok) {
          console.error(`❌ [${requestId}] Central API Error (${duration}ms):`, {
            status: response.status, url: response.url.split('?')[0], method
          })
        }
        return response
      })
      .catch(error => {
        console.error(`❌ [${requestId}] Central Fetch Error:`, error.message)
        throw error
      })
  }

  return fetch(...args)
}

// Opções do cliente Central
const supabaseOptions: SupabaseClientOptions<any> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-central-auth', // ← Chave isolada do banco Central
    debug: supabaseDebug
  },
  global: {
    fetch: enhancedFetch
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}

// Cliente principal — BANCO CENTRAL
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  supabaseOptions
)

// Auth state logging
supabase.auth.onAuthStateChange((event, session) => {
  if (supabaseDebug) {
    console.log(`🔐 Central Auth: ${event}`, session ? 'Session present' : 'No session')
  }
})

// Utility: verificar se está configurado
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'undefined'
}

// Flag de modo demo (false quando credenciais reais estão configuradas)
export const isSupabaseDemoMode = !isSupabaseConfigured()

// Helper para tratar erros Supabase
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'Erro desconhecido'
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'El correo electrónico no es válido',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/weak-password': 'La contraseña es demasiado débil',
  }
  return errorMessages[error.code || ''] || error.message || 'An error occurred'
}

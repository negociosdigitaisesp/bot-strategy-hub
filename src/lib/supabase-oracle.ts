/**
 * supabase-oracle.ts
 * @INTEGRATOR_EXPERT: Cliente isolado para o Supabase B (Oracle Quant)
 * @SHIELD_AGENT: Validação de env vars na inicialização
 * @DEBUG_SENTINEL: Log de erros de conexão com contexto completo
 *
 * REGRA CRÍTICA: Este arquivo é INDEPENDENTE do supabaseClient.ts (Supabase A)
 * Nunca importe supabase deste arquivo em conjunto com supabaseA sem comentário explícito.
 * Supabase A = auth/perfil/MB. Supabase B = Oracle Quant data lake.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// @SHIELD_AGENT: Lê vars do ambiente Vite — nunca hardcode
const oracleUrl = import.meta.env.VITE_ORACLE_SUPABASE_URL as string | undefined
const oracleKey = import.meta.env.VITE_ORACLE_SUPABASE_ANON_KEY as string | undefined

// @DEBUG_SENTINEL: Validação na inicialização — falha explícita, não silenciosa
const validateOracleConfig = (): boolean => {
  if (!oracleUrl || oracleUrl === 'undefined') {
    console.error('[ORACLE] VITE_ORACLE_SUPABASE_URL não configurado. Adicione ao .env.local')
    return false
  }
  if (!oracleKey || oracleKey === 'undefined') {
    console.error('[ORACLE] VITE_ORACLE_SUPABASE_ANON_KEY não configurado. Adicione ao .env.local')
    return false
  }
  try {
    new URL(oracleUrl)
  } catch {
    console.error('[ORACLE] VITE_ORACLE_SUPABASE_URL não é uma URL válida:', oracleUrl)
    return false
  }
  return true
}

export const isOracleConfigured = validateOracleConfig()

if (isOracleConfigured) {
  const shortUrl = oracleUrl!.substring(0, 20) + '...'
  console.log(`[ORACLE] Cliente inicializado: ${shortUrl}`)
}

// @INTEGRATOR_EXPERT: Cliente Supabase B com schema hft_lake como padrão
// Usa anon key — sem auth próprio. Segurança via client_id do Supabase A.
export const supabaseOracle: SupabaseClient = createClient(
  oracleUrl ?? '',
  oracleKey ?? '',
  {
    db: {
      // Schema padrão para queries que não especificam .schema()
      schema: 'hft_lake'
    },
    auth: {
      // Supabase B não tem usuários — desabilita persistência de sessão
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      // @DEBUG_SENTINEL: Intercepta erros de rede do Oracle com contexto
      fetch: (...args: Parameters<typeof fetch>): Promise<Response> => {
        const url = args[0] instanceof Request ? args[0].url : String(args[0])
        const method = args[0] instanceof Request ? args[0].method : (args[1]?.method ?? 'GET')

        return fetch(...args).catch((err: Error) => {
          console.error('[ORACLE][FETCH ERROR]', {
            message: err.message,
            url: url.split('?')[0],
            method
          })
          throw err
        })
      }
    }
  }
)

/**
 * @DEBUG_SENTINEL: Testa a conexão com o Supabase B ao inicializar
 * Faz uma query leve para detectar falhas de credencial ou rede
 */
export const testOracleConnection = async (): Promise<boolean> => {
  if (!isOracleConfigured) return false

  try {
    const { error } = await supabaseOracle
      .schema('hft_lake')
      .from('hft_raw_metrics')
      .select('id')
      .limit(1)

    if (error) {
      console.error('[ORACLE][CONNECTION TEST] Falha:', error.message, '| Code:', error.code)
      return false
    }

    console.log('[ORACLE][CONNECTION TEST] OK — hft_lake acessível')
    return true
  } catch (err) {
    console.error('[ORACLE][CONNECTION TEST] Erro inesperado:', err)
    return false
  }
}

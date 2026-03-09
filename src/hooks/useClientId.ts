/**
 * useClientId.ts
 * @INTEGRATOR_EXPERT: Ponte de identidade entre Supabase A e Supabase B
 * @SHIELD_AGENT: O client_id vem EXCLUSIVAMENTE do auth do Supabase A
 *               Nunca aceite client_id de props, localStorage ou input do usuário
 *
 * Retorna o UID do usuário autenticado no Supabase A (Million Bots).
 * Este UID é usado como client_id em TODAS as operações no Supabase B.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// @SHIELD_AGENT: UUID v4 regex — rejeita qualquer string mal-formada
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isValidUUID = (id: string): boolean => UUID_REGEX.test(id)

export interface UseClientIdResult {
  clientId: string | null
  loading: boolean
  error: string | null
}

/**
 * Hook que retorna o clientId (uid do Supabase A) para uso no Supabase B.
 *
 * @returns { clientId, loading, error }
 *   - clientId: string UUID ou null (não autenticado)
 *   - loading: true enquanto busca a sessão
 *   - error: mensagem de erro ou null
 */
export function useClientId(): UseClientIdResult {
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchClientId = async () => {
      setLoading(true)
      setError(null)

      try {
        // @INTEGRATOR_EXPERT: Supabase A é a única fonte de verdade para identidade
        const { data, error: authError } = await supabase.auth.getUser()

        if (cancelled) return

        if (authError) {
          // @DEBUG_SENTINEL: Log de erro de auth com contexto
          console.error('[useClientId] Erro ao buscar usuário do Supabase A:', authError.message)
          setError('Erro de autenticação: ' + authError.message)
          setClientId(null)
          return
        }

        const uid = data.user?.id ?? null

        if (!uid) {
          setClientId(null)
          return
        }

        // @SHIELD_AGENT: Valida o formato UUID antes de expor para Supabase B
        if (!isValidUUID(uid)) {
          console.error('[useClientId] UID inválido recebido do Supabase A:', uid)
          setError('UID de usuário em formato inválido')
          setClientId(null)
          return
        }

        setClientId(uid)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error('[useClientId] Exceção ao buscar clientId:', message)
        setError(message)
        setClientId(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchClientId()

    // @INTEGRATOR_EXPERT: Mantém clientId sincronizado com mudanças de sessão do Supabase A
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const uid = session?.user?.id ?? null
      if (uid && isValidUUID(uid)) {
        setClientId(uid)
      } else {
        setClientId(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { clientId, loading, error }
}

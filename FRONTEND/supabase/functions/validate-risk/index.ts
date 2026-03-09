// supabase/functions/validate-risk/index.ts
// [PASSO 1] Edge Function para validação de risco do Gale
// Supabase A — usa client_id, profiles (plano), client_logs
// ZERO alteração em tabelas existentes
// Reversível: git revert do frontend desfaz a integração

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Constantes do @LGN_AUDITOR (imutáveis) ───────────────────────────────────
const GALE_MULTIPLIERS = [1.0, 2.2, 5.0]
const GALE_TOTAL_UNITS = 8.2          // 1.0 + 2.2 + 5.0
const MAX_RISK_PCT     = 0.01          // 1% da banca por série completa
const TOKEN_TTL_MS     = 60_000        // [@LGN_AUDITOR] Aprovação válida por 1 candle (60s)
const SHADOW_MIN_TRADES = 500          // [@STRESS_TESTER] Mínimo de trades em Shadow Mode

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── [@SHIELD_AGENT] Sempre retorna 200 — nunca 401/500 silencioso ─────────────
function ok(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  // ── [@SHIELD_AGENT] JWT expired → 200 com reason, nunca 401 silencioso ──────
  let client_id: string | null = null
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return ok({ allowed: false, reason: 'auth_missing', approved_stake: 0, approved_until: 0 })
    }

    // Supabase A — usa variáveis de ambiente do projeto central
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verifica sessão — retorna 200 com reason se token expirado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ok({ allowed: false, reason: 'auth_expired', approved_stake: 0, approved_until: 0 })
    }
    client_id = user.id

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json() as {
      balance: number
      base_stake: number
      gale_level?: number          // 0, 1 ou 2
      approved_until?: number      // epoch ms — [@LGN_AUDITOR] TTL token
      shadow_mode?: boolean        // true = apenas loga, não bloqueia
    }

    const { balance, base_stake, gale_level = 0, approved_until, shadow_mode = true } = body

    // ── [@LGN_AUDITOR] Validação de inputs ────────────────────────────────
    if (typeof balance !== 'number' || typeof base_stake !== 'number') {
      return ok({ allowed: false, reason: 'invalid_input', approved_stake: 0, approved_until: 0 })
    }

    // ── [@LGN_AUDITOR] TTL Token — se ainda válido, re-aprova sem recalcular ─
    // Evita divergência de saldo entre G0→G1→G2 dentro do mesmo minuto
    if (approved_until && Date.now() < approved_until && gale_level > 0) {
      const stake_for_level = base_stake * GALE_MULTIPLIERS[gale_level]
      return ok({
        allowed: true,
        reason: 'token_reuse',
        approved_stake: parseFloat(stake_for_level.toFixed(2)),
        approved_until,
      })
    }

    // ── Lê plano do cliente (profiles no Supabase A) ──────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type, max_stake_override')
      .eq('id', client_id)
      .single()

    const planType = (profile?.plan_type || 'free').toLowerCase()
    const maxStakeOverride: number | null = profile?.max_stake_override ?? null

    // ── [@LGN_AUDITOR] Sizing Guard ───────────────────────────────────────
    const totalExposure = base_stake * GALE_TOTAL_UNITS
    const maxAllowed    = balance * MAX_RISK_PCT

    // Stake máximo por plano (se admin configurou override)
    const planLimit = maxStakeOverride ?? (planType === 'free' ? 1.0 : 999)
    const effectiveBase = Math.min(base_stake, planLimit)
    const effectiveExposure = effectiveBase * GALE_TOTAL_UNITS

    const sizingGuardFailed = effectiveExposure > maxAllowed

    // Stake aprovado para esse nível de Gale
    const approved_stake = parseFloat((effectiveBase * GALE_MULTIPLIERS[gale_level]).toFixed(2))

    // ── [@LGN_AUDITOR] Divergência de stake ──────────────────────────────
    // Se o frontend pediu stake diferente do aprovado em >5%, loga alerta
    const requestedStake = base_stake * GALE_MULTIPLIERS[gale_level]
    const divergencePct  = Math.abs(requestedStake - approved_stake) / Math.max(requestedStake, 0.01)
    if (divergencePct > 0.05) {
      console.warn(`[validate-risk] DIVERGENCIA STAKE client=${client_id} requested=${requestedStake.toFixed(2)} approved=${approved_stake.toFixed(2)} pct=${(divergencePct * 100).toFixed(1)}%`)
    }

    // ── [@STRESS_TESTER] Shadow mode — incrementa contador de trades ──────
    // Persiste no Supabase para não resetar com F5
    let shadowCount = 0
    if (shadow_mode) {
      const { data: shadowData } = await supabase
        .from('profiles')
        .select('shadow_trade_count')
        .eq('id', client_id)
        .single()

      shadowCount = (shadowData?.shadow_trade_count ?? 0) + 1

      // Incrementa sem await para não bloquear resposta (fire-and-forget)
      supabase
        .from('profiles')
        .update({ shadow_trade_count: shadowCount })
        .eq('id', client_id)
        .then(() => {})
        .catch(() => {})
    }

    const readyForPasso3 = shadowCount >= SHADOW_MIN_TRADES

    // ── [@LGN_AUDITOR] EV Audit ────────────────────────────────────────────
    const breakEvenPct = ((GALE_TOTAL_UNITS / (GALE_TOTAL_UNITS + 1)) * 100).toFixed(0)

    // ── Resposta ──────────────────────────────────────────────────────────
    if (sizingGuardFailed) {
      return ok({
        allowed: false,
        reason: 'sizing_guard',
        approved_stake: 0,
        approved_until: 0,
        detail: {
          balance,
          total_exposure: parseFloat(totalExposure.toFixed(2)),
          max_allowed:    parseFloat(maxAllowed.toFixed(2)),
          pct_used:       parseFloat(((totalExposure / balance) * 100).toFixed(1)),
          break_even_pct: breakEvenPct,
          plan_type:      planType,
          shadow_count:   shadowCount,
          ready_for_passo3: readyForPasso3,
        }
      })
    }

    return ok({
      allowed: true,
      reason: 'approved',
      approved_stake,
      // [@LGN_AUDITOR] TTL de 60s — válido para todo o ciclo G0→G1→G2
      approved_until: Date.now() + TOKEN_TTL_MS,
      detail: {
        balance,
        base_stake:    effectiveBase,
        gale_level,
        total_exposure: parseFloat(effectiveExposure.toFixed(2)),
        max_allowed:    parseFloat(maxAllowed.toFixed(2)),
        break_even_pct: breakEvenPct,
        plan_type:      planType,
        divergence_pct: parseFloat((divergencePct * 100).toFixed(1)),
        shadow_count:   shadowCount,
        ready_for_passo3: readyForPasso3,
      }
    })

  } catch (err) {
    // [@SHIELD_AGENT] Nunca deixa 500 chegar ao browser — fallback local assume
    console.error('[validate-risk] FATAL:', err)
    return ok({
      allowed: false,
      reason: 'edge_error',
      approved_stake: 0,
      approved_until: 0,
    })
  }
})

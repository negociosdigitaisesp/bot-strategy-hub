/**
 * HftDerivService.ts
 * @SHIELD_AGENT: Sanitização de ativo + bloqueio de CRASH/BOOM
 * @DEBUG_SENTINEL: Log estruturado em cada passo da execução
 *
 * Responsabilidade única: receber {ativo, direcao, stake} e executar
 * a ordem na Deriv via DerivAPI (DerivContext.api.send()).
 * NÃO conhece estratégias, personas ou Supabase — só executa.
 */

import type { DerivAPI } from '@/contexts/DerivContext'

// ─── Constantes ────────────────────────────────────────────────────────────────

/** @SHIELD_AGENT: Únicos ativos permitidos. CRASH/BOOM são bloqueados explicitamente. */
const VALID_VOLATILITY_ASSETS = new Set([
  'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
  '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
])

/** Ativos Crash/Boom que jamais devem vazar para este motor */
const CRASH_BOOM_PATTERN = /^(CRASH|BOOM)/i

/** Timeout máximo aguardando resultado do contrato (ms) */
const CONTRACT_RESULT_TIMEOUT_MS = 90_000

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface HftOrderParams {
  ativo: string       // ex: "R_100"
  direcao: 'CALL' | 'PUT'
  stake: number
  currency?: string   // default: 'USD'
}

export interface HftOrderResult {
  success: boolean
  profit: number
  contractId?: string | number
  error?: string
}

// ─── Sanitização de ativo ──────────────────────────────────────────────────────

/**
 * @SHIELD_AGENT: Sanitiza e valida o ativo recebido do sinal.
 * - Normaliza para uppercase e remove espaços
 * - Bloqueia qualquer ativo CRASH/BOOM explicitamente
 * - Rejeita ativos fora da whitelist
 * @throws {Error} se ativo inválido ou bloqueado
 */
export function sanitizeAtivo(raw: string): string {
  const normalized = raw?.trim().toUpperCase()

  if (!normalized) {
    throw new Error('[HftDerivService][SHIELD] ativo vazio ou null recebido')
  }

  // @SHIELD_AGENT: Bloqueio explícito de CRASH/BOOM
  if (CRASH_BOOM_PATTERN.test(normalized)) {
    console.error('[HftDerivService][SHIELD] CRASH/BOOM bloqueado:', normalized)
    throw new Error(`[SHIELD] Ativo "${normalized}" é CRASH/BOOM — bloqueado para este motor`)
  }

  // Normaliza variantes comuns: 1HZ100V → R_100 se não estiver na whitelist
  // Tenta mapeamento R_XX → 1HZXXV e vice-versa
  if (!VALID_VOLATILITY_ASSETS.has(normalized)) {
    // Tenta mapear "R100" → "R_100"
    const withUnderscore = normalized.replace(/^R(\d+)$/, 'R_$1')
    if (VALID_VOLATILITY_ASSETS.has(withUnderscore)) {
      console.warn(`[HftDerivService][SHIELD] Mapeamento aplicado: "${raw}" → "${withUnderscore}"`)
      return withUnderscore
    }

    console.error('[HftDerivService][SHIELD] Ativo fora da whitelist:', normalized)
    throw new Error(`[SHIELD] Ativo "${normalized}" não está na whitelist de volatilidade`)
  }

  return normalized
}

/**
 * Mapeia CALL/PUT para o contract_type da Deriv.
 * Para índices de volatilidade: CALL → CALL, PUT → PUT (opções de 1 minuto)
 */
function mapDirecaoToContractType(direcao: 'CALL' | 'PUT'): 'CALL' | 'PUT' {
  return direcao // A Deriv aceita CALL/PUT diretamente para volatility indices
}

// ─── Execução de ordem ─────────────────────────────────────────────────────────

/**
 * Executa uma ordem HFT na Deriv via DerivAPI.
 *
 * Fluxo:
 *   1. Sanitiza ativo (@SHIELD_AGENT)
 *   2. Envia proposal para obter preço
 *   3. Compra o contrato com buy
 *   4. Aguarda resultado (is_sold=true) com timeout de 90s
 *
 * @param api    DerivAPI do contexto (não pode ser null)
 * @param params Parâmetros da ordem
 * @returns      HftOrderResult com profit e status
 */
export async function executeDerivOrder(
  api: DerivAPI,
  params: HftOrderParams
): Promise<HftOrderResult> {
  const { direcao, stake, currency = 'USD' } = params

  // @SHIELD_AGENT: sanitização obrigatória antes de qualquer I/O
  let ativo: string
  try {
    ativo = sanitizeAtivo(params.ativo)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, profit: 0, error: msg }
  }

  const contractType = mapDirecaoToContractType(direcao)

  console.log('[HftDerivService] Executando ordem:', { ativo, direcao: contractType, stake })

  // ── 1. Proposal ──────────────────────────────────────────────────────────────
  let proposalId: string
  let askPrice: number

  try {
    const proposalResp = await api.send({
      proposal: 1,
      amount: stake,
      basis: 'stake',
      contract_type: contractType,
      currency,
      duration: 1,
      duration_unit: 'm', // 1 minuto
      symbol: ativo,
    })

    if (proposalResp.error) {
      const errMsg = proposalResp.error.message || 'Erro na proposal'
      console.error('[HftDerivService][PROPOSAL] Falha:', proposalResp.error)
      return { success: false, profit: 0, error: errMsg }
    }

    proposalId = proposalResp.proposal.id
    askPrice = proposalResp.proposal.ask_price

    console.log('[HftDerivService][PROPOSAL] OK:', { proposalId, askPrice })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Timeout na proposal'
    console.error('[HftDerivService][PROPOSAL] Exceção:', msg)
    return { success: false, profit: 0, error: msg }
  }

  // ── 2. Buy ───────────────────────────────────────────────────────────────────
  let contractId: string | number
  try {
    const buyResp = await api.send({
      buy: proposalId,
      price: askPrice,
    })

    if (buyResp.error) {
      const errMsg = buyResp.error.message || 'Erro no buy'
      console.error('[HftDerivService][BUY] Falha:', buyResp.error)
      return { success: false, profit: 0, error: errMsg }
    }

    contractId = buyResp.buy.contract_id
    console.log('[HftDerivService][BUY] Contrato aberto:', contractId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Timeout no buy'
    console.error('[HftDerivService][BUY] Exceção:', msg)
    return { success: false, profit: 0, error: msg }
  }

  // ── 3. Aguarda resultado ──────────────────────────────────────────────────────
  try {
    const profit = await waitForContractResult(api, contractId)
    console.log('[HftDerivService][RESULT] Contrato encerrado:', { contractId, profit })
    return { success: true, profit, contractId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Timeout aguardando resultado'
    console.error('[HftDerivService][RESULT] Falha:', msg, { contractId })
    return { success: false, profit: 0, contractId, error: msg }
  }
}

/**
 * @DEBUG_SENTINEL: Aguarda o contrato ser liquidado (is_sold=true).
 * Subscreve proposal_open_contract e resolve com o profit quando completo.
 * Rejeita após CONTRACT_RESULT_TIMEOUT_MS ms para evitar travamento.
 */
function waitForContractResult(api: DerivAPI, contractId: string | number): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Timeout aguardando contrato ${contractId}`))
    }, CONTRACT_RESULT_TIMEOUT_MS)

    const unsubscribe = api.onMessage((data: any) => {
      if (
        data.msg_type === 'proposal_open_contract' &&
        data.proposal_open_contract?.contract_id === contractId &&
        data.proposal_open_contract?.is_sold
      ) {
        clearTimeout(timer)
        unsubscribe()
        const profit = parseFloat(data.proposal_open_contract.profit ?? '0')
        resolve(profit)
      }
    })

    // Solicita subscription do contrato aberto
    api.send({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1,
    }).catch((err) => {
      clearTimeout(timer)
      unsubscribe()
      reject(err)
    })
  })
}

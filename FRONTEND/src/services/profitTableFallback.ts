// FRONTEND/src/services/profitTableFallback.ts
// Fallback garantido para resultado de contrato via profit_table
// NÃO modifica nada existente — apenas consultado quando necessário

export interface ContractFallbackResult {
  result: 'WIN' | 'LOSS'
  profit: number
  contractId: number
  source: 'profit_table'
}

/**
 * Consulta profit_table para obter resultado de contrato fechado.
 * Usar APENAS quando Transaction Stream e proposal_open_contract falharem.
 *
 * @param contractId - ID numérico real do contrato na Deriv
 * @param ws         - instância ativa do WebSocket
 * @returns resultado confirmado ou null se contrato ainda não fechou
 */
export async function queryProfitTable(
  contractId: number,
  ws: WebSocket
): Promise<ContractFallbackResult | null> {
  // Segurança: não tenta se WS não está aberto
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[profit_table] WS não está aberto. Abortando consulta.')
    return null
  }

  return new Promise((resolve) => {
    const req_id = Date.now()
    let resolved = false

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.msg_type === 'profit_table' && msg.req_id === req_id) {
          ws.removeEventListener('message', handler)
          resolved = true

          const transactions: any[] = msg.profit_table?.transactions ?? []

          const contract = transactions.find(
            (t) => Number(t.contract_id) === contractId
          )

          if (!contract) {
            // Contrato não encontrado = ainda aberto ou fora dos últimos 25
            resolve(null)
            return
          }

          // sell_price e buy_price sempre presentes em contratos fechados
          const profit = Number(contract.sell_price) - Number(contract.buy_price)

          resolve({
            result: profit > 0 ? 'WIN' : 'LOSS',
            profit: parseFloat(profit.toFixed(2)),
            contractId,
            source: 'profit_table'
          })
        }
      } catch {
        // JSON parse error — ignora e aguarda próxima mensagem
      }
    }

    ws.addEventListener('message', handler)

    // Envia request — sem subscribe, sem leak
    ws.send(JSON.stringify({
      profit_table: 1,
      limit: 25,    // últimos 25 contratos — o seu estará aqui
      sort: 'DESC', // mais recente primeiro
      req_id
    }))

    // Timeout de segurança — 6s
    setTimeout(() => {
      if (!resolved) {
        ws.removeEventListener('message', handler)
        resolve(null)
      }
    }, 6000)
  })
}

/**
 * Tenta obter resultado via profit_table com retries automáticos.
 * Usar após RESULT_TIMEOUT confirmado.
 *
 * @param contractId  - ID numérico real do contrato
 * @param ws          - instância ativa do WebSocket
 * @param maxAttempts - número máximo de tentativas (padrão: 3)
 * @param delayMs     - espera entre tentativas em ms (padrão: 3000)
 */
export async function queryProfitTableWithRetry(
  contractId: number,
  ws: WebSocket,
  maxAttempts = 3,
  delayMs = 3000
): Promise<ContractFallbackResult | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[profit_table] Tentativa ${attempt}/${maxAttempts} para contrato ${contractId}`)

    const result = await queryProfitTable(contractId, ws)

    if (result) {
      console.log(`[profit_table] ✅ Resultado confirmado na tentativa ${attempt}: ${result.result}`)
      return result
    }

    if (attempt < maxAttempts) {
      // Aguarda antes da próxima tentativa
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  console.warn(`[profit_table] ❌ ${maxAttempts} tentativas sem resultado para contrato ${contractId}`)
  return null
}

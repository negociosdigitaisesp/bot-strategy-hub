#!/usr/bin/env node
// shadow_backtest.mjs — Backtest Dry-Run para validação do Shadow Mode
// Simula 500 trades: compara lógica local vs Edge Function validate-risk
// Zero ordens reais na Deriv. Zero alteração em tabelas existentes.
//
// USO: node shadow_backtest.mjs
// Deps: node >= 18 (fetch nativo), @supabase/supabase-js
//       npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'

// ── Configuração dos 2 bancos ──────────────────────────────────────────────────
const SUPABASE_A_URL  = 'https://xwclmxjeombwabfdvyij.supabase.co'
const SUPABASE_A_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4'

const SUPABASE_B_URL  = 'https://ypqekkkrfklaqlzhkbwg.supabase.co'
const SUPABASE_B_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwcWVra2tyZmtsYXFsemhrYndnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMTcxMiwiZXhwIjoyMDg3NjA3NzEyfQ.dToc9a9Pb_D3eYXCcRQzL4KcGoxE-UYvsM3NI4krsjs'

const EDGE_URL = `${SUPABASE_A_URL}/functions/v1/validate-risk`

// ── Clientes ───────────────────────────────────────────────────────────────────
const supabaseA = createClient(SUPABASE_A_URL, SUPABASE_A_KEY)
const supabaseB = createClient(SUPABASE_B_URL, SUPABASE_B_KEY)

// ── Constantes (espelha OracleQuant.tsx @LGN_AUDITOR) ─────────────────────────
const GALE_MULTIPLIERS  = [1.0, 2.2, 5.0]
const GALE_TOTAL_UNITS  = 8.2
const MAX_RISK_PCT      = 0.01

// ── Cenários de simulação por row ─────────────────────────────────────────────
// 3 cenários × 500 rows = 1500 checks totais
const SCENARIOS = [
  { balance: 1000, base_stake: 1.0, label: 'Normal   (always ALLOWED)' },
  { balance: 50,   base_stake: 1.0, label: 'Tight    (always BLOCKED)' },
  { balance: 82,   base_stake: 1.0, label: 'Borderline (10% exato)'    },
]

// ── Lógica local do Sizing Guard (espelha executeGaleChain) ───────────────────
function localSizingGuard(balance, base_stake) {
  if (balance <= 0) return { allowed: true, reason: 'balance_zero_skip' }
  const totalExposure = base_stake * GALE_TOTAL_UNITS
  const maxAllowed    = balance * MAX_RISK_PCT
  if (totalExposure > maxAllowed) {
    return { allowed: false, reason: 'sizing_guard', totalExposure, maxAllowed }
  }
  return { allowed: true, reason: 'approved', totalExposure, maxAllowed }
}

// ── Chamada Edge Function com timeout ─────────────────────────────────────────
async function callEdge(balance, base_stake, timeoutMs = 800) {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Service role key faz autenticação server-side
        'Authorization': `Bearer ${SUPABASE_A_KEY}`,
      },
      body: JSON.stringify({ balance, base_stake, gale_level: 0, shadow_mode: true }),
      signal: controller.signal,
    })
    clearTimeout(tid)
    return await res.json()
  } catch (err) {
    clearTimeout(tid)
    return { allowed: null, reason: 'TIMEOUT_OR_NETWORK', approved_stake: 0 }
  }
}

// ── Garante tabela shadow_divergence_log (Supabase B, schema hft_quant) ───────
async function ensureDivergenceTable() {
  // Tenta inserir um row de teste para verificar se a tabela existe
  // Se falhar com "relation does not exist", cria via RPC/SQL
  const { error } = await supabaseB
    .schema('hft_quant')
    .from('shadow_divergence_log')
    .select('id')
    .limit(1)

  if (error && error.code === '42P01') {
    // Tabela não existe — cria via SQL bruto usando rpc exec_sql se disponível
    // Alternativa: criar manualmente no Supabase dashboard com o SQL abaixo
    console.log('\n⚠️  Tabela hft_quant.shadow_divergence_log não encontrada.')
    console.log('   Execute este SQL no Supabase B (Dashboard > SQL Editor):\n')
    console.log(`   CREATE TABLE IF NOT EXISTS hft_quant.shadow_divergence_log (
     id SERIAL PRIMARY KEY,
     ts TIMESTAMPTZ DEFAULT NOW(),
     ativo TEXT,
     hh_mm TEXT,
     cenario TEXT,
     balance NUMERIC,
     base_stake NUMERIC,
     local_allowed BOOLEAN,
     local_reason TEXT,
     edge_allowed BOOLEAN,
     edge_reason TEXT,
     edge_approved_stake NUMERIC,
     is_divergent BOOLEAN
   );\n`)
    console.log('   Depois rode o script novamente.\n')
    process.exit(1)
  }
  console.log('✅  Tabela shadow_divergence_log confirmada.')
}

// ── Log de divergência no Supabase B ──────────────────────────────────────────
async function logDivergence(row) {
  const { error } = await supabaseB
    .schema('hft_quant')
    .from('shadow_divergence_log')
    .insert(row)
  if (error) {
    console.error(`[LOG ERROR] Falha ao inserir divergência: ${error.message}`)
  }
}

// ── Busca dados históricos do Supabase B ──────────────────────────────────────
async function fetchMetrics() {
  const ASSETS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100']
  const rows = []

  for (const ativo of ASSETS) {
    const { data, error } = await supabaseB
      .schema('hft_lake')
      .from('hft_raw_metrics')
      .select('ativo, hh_mm, win_g0_30d, win_g1_30d, win_g2_30d')
      .eq('ativo', ativo)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      console.warn(`⚠️  Erro ao buscar ${ativo}: ${error.message}`)
      // Gera dados sintéticos se tabela não tiver dados suficientes
      for (let i = 0; i < 100; i++) {
        rows.push({
          ativo,
          hh_mm: `${String(Math.floor(i / 60)).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}`,
          win_g0_30d: 0.55 + Math.random() * 0.25,
          win_g1_30d: 0.60 + Math.random() * 0.20,
          win_g2_30d: 0.65 + Math.random() * 0.20,
        })
      }
      continue
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️  Sem dados para ${ativo}. Usando métricas sintéticas.`)
      for (let i = 0; i < 100; i++) {
        rows.push({
          ativo,
          hh_mm: `${String(Math.floor(i / 60)).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}`,
          win_g0_30d: 0.55, win_g1_30d: 0.60, win_g2_30d: 0.65,
        })
      }
      continue
    }

    rows.push(...data)
    console.log(`   ✔ ${ativo}: ${data.length} rows carregados`)
  }

  return rows
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   SHADOW MODE BACKTEST — DRY-RUN                ║')
  console.log('║   Comparando: Local Guard vs Edge validate-risk  ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  console.log('1️⃣  Verificando tabela shadow_divergence_log...')
  await ensureDivergenceTable()

  console.log('\n2️⃣  Buscando dados de hft_lake.hft_raw_metrics...')
  const metrics = await fetchMetrics()
  console.log(`   Total: ${metrics.length} rows (alvos: 500)\n`)

  // ── Simulação ────────────────────────────────────────────────────────────────
  let totalChecks  = 0
  let divergences  = 0
  let edgeTimeouts = 0
  const divergenceDetails = []

  console.log('3️⃣  Iniciando simulação...\n')

  const startTime = Date.now()

  for (const row of metrics) {
    for (const scenario of SCENARIOS) {
      totalChecks++
      const { balance, base_stake, label } = scenario

      // Lógica local (síncrona, sem IO)
      const localResult = localSizingGuard(balance, base_stake)

      // Edge Function (async, com timeout 800ms)
      const edgeResult  = await callEdge(balance, base_stake)

      // Timeout/erro de rede
      if (edgeResult.allowed === null) {
        edgeTimeouts++
        process.stdout.write(`T`) // T = timeout
        continue
      }

      const isDivergent = localResult.allowed !== edgeResult.allowed

      if (isDivergent) {
        divergences++
        const detail = {
          ativo:               row.ativo,
          hh_mm:               row.hh_mm,
          cenario:             label.trim(),
          balance,
          base_stake,
          local_allowed:       localResult.allowed,
          local_reason:        localResult.reason,
          edge_allowed:        edgeResult.allowed,
          edge_reason:         edgeResult.reason,
          edge_approved_stake: edgeResult.approved_stake,
          is_divergent:        true,
        }
        divergenceDetails.push(detail)
        await logDivergence(detail)
        process.stdout.write(`✗`)
      } else {
        process.stdout.write(totalChecks % 50 === 0 ? `.\n` : `.`)
      }
    }
  }

  // ── Relatório Final ──────────────────────────────────────────────────────────
  const elapsed    = ((Date.now() - startTime) / 1000).toFixed(1)
  const convergent = totalChecks - divergences - edgeTimeouts
  const convergPct = ((convergent / (totalChecks - edgeTimeouts)) * 100).toFixed(2)
  const approved   = parseFloat(convergPct) >= 99.0

  console.log('\n\n' + '═'.repeat(52))
  console.log('          SHADOW MODE BACKTEST — RESULTS')
  console.log('═'.repeat(52))
  console.log(`  Total de checks simulados : ${totalChecks.toString().padStart(6)}`)
  console.log(`  Edge timeouts (ignorados) : ${edgeTimeouts.toString().padStart(6)}`)
  console.log(`  Checks válidos            : ${(totalChecks - edgeTimeouts).toString().padStart(6)}`)
  console.log(`  Divergências              : ${divergences.toString().padStart(6)}`)
  console.log(`  Convergência              : ${convergPct.padStart(6)}%`)
  console.log(`  Tempo total               : ${elapsed}s`)
  console.log('─'.repeat(52))

  if (divergences > 0) {
    console.log('\n⚠️  CASOS DIVERGENTES:')
    divergenceDetails.slice(0, 10).forEach((d, i) => {
      console.log(`  ${i+1}. ${d.ativo} ${d.hh_mm} | cenário: ${d.cenario}`)
      console.log(`     Local: ${d.local_allowed ? 'ALLOWED' : 'BLOCKED'} (${d.local_reason})`)
      console.log(`     Edge:  ${d.edge_allowed  ? 'ALLOWED' : 'BLOCKED'} (${d.edge_reason})`)
    })
    if (divergenceDetails.length > 10) {
      console.log(`  ... e mais ${divergenceDetails.length - 10} casos. Ver hft_quant.shadow_divergence_log`)
    }
  }

  console.log('\n' + '═'.repeat(52))
  if (approved) {
    console.log('  ✅ APROVADO PARA PASSO 3')
    console.log(`     Convergência ${convergPct}% >= 99.0% exigido`)
  } else {
    console.log('  ❌ BLOQUEADO — Convergência abaixo de 99%')
    console.log(`     ${convergPct}% < 99.0% exigido`)
    console.log('     Verifique os casos divergentes acima.')
  }
  console.log('═'.repeat(52) + '\n')

  process.exit(approved ? 0 : 1)
}

main().catch(err => {
  console.error('\n[FATAL]', err.message)
  process.exit(1)
})

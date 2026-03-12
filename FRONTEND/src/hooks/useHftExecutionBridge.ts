/**
 * useHftExecutionBridge.ts
 * Motor de Execução Oracle Quant — WebSocket Edition.
 * @MISSION: Fix Definitivo Oracle Quant — WebSocket Execution Engine
 *
 * Responsabilidades:
 *   - Captura contract_id real do BUY response (Number())
 *   - Fallback POC com forget de subscription após is_sold
 *   - onSeriesEnd como ÚNICO ponto de atualização de wins/losses
 *   - Page Visibility API com ordem: reconnect → rehydrate → accept
 *   - Recovery via localStorage com contractId real (número)
 *   - Limpeza obrigatória via AbortController (nunca removeEventListener)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { hftSupabase } from '../lib/hftSupabase';
import { derivApiService } from '../services/derivApiService';
import type {
  GaleLevel,
  ContractDirection,
  TradeContext,
  ActiveContract,
  SeriesOutcome,
  GaleRecoveryState,
} from '../types/derivExecution';

// ── Tipos exportados ────────────────────────────────────────────────────────

export interface OpenPosition {
  id: string;
  asset: string;
  direction: 'CALL' | 'PUT';
  stake: number;
  gale: number;
  openTime: number;
  durationSecs: number;
  bot?: string;
}

interface BridgeProps {
  enabled: boolean;
  baseStake: number;
  activeBots: Set<string>;
  clientId: string;
}

// ── Constantes de risco ─────────────────────────────────────────────────────
const GALE_MULTIPLIERS = [1.0, 2.2, 5.0] as const;
const MAX_CONCURRENT_ASSETS = 3;
const FALLBACK_DELAY_MS = 65_000; // contract_duration(60s) + 5s grace

// ── Hook ────────────────────────────────────────────────────────────────────

export function useHftExecutionBridge({ enabled, baseStake, activeBots, clientId }: BridgeProps) {
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [logs, setLogs] = useState<{ ts: string; level: 'info' | 'error' | 'ok'; msg: string }[]>([]);
  const [isAcceptingSignals, setIsAcceptingSignals] = useState(true);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);

  // Map de contratos ativos indexado por seriesId
  const activeSeries = useRef<Map<string, ActiveContract>>(new Map());
  // Set de ativos sendo executados (anti-duplo)
  const executingAssets = useRef<Set<string>>(new Set());
  // Acumulador de stake por série (para totalStake correto)
  const seriesStakeAccum = useRef<Map<string, number>>(new Map());

  const addLog = useCallback((level: 'info' | 'error' | 'ok', msg: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    setLogs(prev => [{ ts, level, msg }, ...prev].slice(0, 80));
  }, []);

  // ── onSeriesEnd — ÚNICO ponto de atualização de wins/losses ─────────────

  const onSeriesEnd = useCallback((outcome: SeriesOutcome, asset: string, direction: string) => {
    addLog(outcome.finalResult === 'WIN' ? 'ok' : 'error',
      `[FIM] Serie ${outcome.seriesId.substring(0, 8)} finalizada: ${outcome.finalResult} (G${outcome.finalGaleLevel}) | P&L: $${outcome.profit.toFixed(2)}`);

    // WIN = série resolvida em qualquer galeLevel (G0, G1 ou G2)
    if (outcome.finalResult === 'WIN') {
      setSessionWins(prev => prev + 1);
    }
    // LOSS = apenas quando finalResult === 'LOSS' E galeLevel === 2
    if (outcome.finalResult === 'LOSS' && outcome.finalGaleLevel === 2) {
      setSessionLosses(prev => prev + 1);
    }
    // TIMEOUT_UNKNOWN não incrementa nenhum contador

    setSessionProfit(prev => prev + outcome.profit);

    // Limpar estado
    localStorage.removeItem('hft_active_recovery');
    activeSeries.current.delete(outcome.seriesId);
    seriesStakeAccum.current.delete(outcome.seriesId);
    executingAssets.current.delete(asset);
    
    if (outcome.finalResult === 'WIN' || outcome.finalResult === 'LOSS') {
      setOpenPositions(prev => prev.map(p => p.id.startsWith(asset) && !p.result ? { ...p, result: outcome.finalResult } : p));
      setTimeout(() => {
        setOpenPositions(prev => prev.filter(p => !p.id.startsWith(asset)));
      }, 4000);
    } else {
      setOpenPositions(prev => prev.filter(p => !p.id.startsWith(asset)));
    }

    // Persistir no Supabase B (background — não bloqueia)
    const idempotencyKey = `${clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    hftSupabase.from('pending_trades').insert({
      client_id: clientId,
      signal_id: idempotencyKey,
      idempotency_key: idempotencyKey,
      ativo: asset,
      direcao: direction,
      stake: outcome.totalStake,
      status: 'completed',
      result: outcome.finalResult === 'WIN' ? 'win' : (outcome.finalResult === 'TIMEOUT_UNKNOWN' ? 'timeout' : 'hit'),
      profit: outcome.profit,
      executed_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) addLog('error', `[DB] INSERT error: ${error.message}`);
      else addLog('ok', `[DB] Trade persistido OK | result=${outcome.finalResult}`);
    });
  }, [addLog, clientId]);

  // ── handlePOC — Processa proposal_open_contract (recebe o msg COMPLETO) ──

  const handlePOC = useCallback((msg: any, contract: ActiveContract) => {
    const poc = msg.proposal_open_contract;
    if (!poc) return;

    // Só processar se o contrato está encerrado
    const isSold = poc.is_sold === 1 || poc.status === 'sold' || poc.status === 'won' || poc.status === 'lost';
    if (!isSold) return;

    // 1. Abortar listener via AbortController (nunca removeEventListener)
    contract.abortController.abort();
    clearTimeout(contract.fallbackTimer);
    // (A remoção visual é tratada agora pelo onSeriesEnd com delay para exibir WIN/LOSS)

    // 2. OBRIGATÓRIO: forget a subscription para liberar recursos no servidor
    const subscriptionId = msg.subscription?.id || poc.subscription?.id;
    if (subscriptionId) {
      derivApiService.sendRaw({ forget: subscriptionId });
    }

    // 3. Calcular resultado com Number() cast (NUNCA confiar no tipo)
    const profit = Number(poc.profit ?? 0);
    const isWin = profit > 0;

    // Recuperar stake acumulada da série
    const accumStake = seriesStakeAccum.current.get(contract.seriesId) ?? contract.stake;

    if (isWin) {
      onSeriesEnd({
        seriesId: contract.seriesId,
        finalResult: 'WIN',
        finalGaleLevel: contract.galeLevel,
        totalStake: accumStake,
        profit,
        resolvedAt: Date.now(),
      }, contract.asset, contract.direction);
    } else if (contract.galeLevel < 2) {
      // Escalar para próximo Gale
      const nextLevel = (contract.galeLevel + 1) as GaleLevel;
      const nextStake = Number((baseStake * GALE_MULTIPLIERS[nextLevel]).toFixed(2));

      addLog('info', `[LOSS] G${contract.galeLevel} ${contract.asset} | Escalando para G${nextLevel}...`);

      setTimeout(() => {
        executeTradeRef.current({
          reqId: Date.now(),
          asset: contract.asset,
          direction: contract.direction,
          stake: nextStake,
          galeLevel: nextLevel,
          seriesId: contract.seriesId,
          sentAt: Date.now(),
        });
      }, 1000);
    } else {
      // G2 perdido — série encerrada como LOSS
      onSeriesEnd({
        seriesId: contract.seriesId,
        finalResult: 'LOSS',
        finalGaleLevel: 2,
        totalStake: accumStake,
        profit,
        resolvedAt: Date.now(),
      }, contract.asset, contract.direction);
    }
  }, [onSeriesEnd, baseStake, addLog]);

  // ── checkFallback — Query manual após timeout ────────────────────────────

  const checkFallback = useCallback(async (contractId: number, ctx: TradeContext) => {
    addLog('info', `[FALLBACK] Consultando POC manual para ${contractId}`);
    try {
      const { response } = await derivApiService.send({
        proposal_open_contract: 1,
        contract_id: contractId,
        subscribe: 0,  // explícito: NÃO criar subscription
      });

      if (response.proposal_open_contract) {
        const active = activeSeries.current.get(ctx.seriesId);
        if (active) {
          handlePOC(response, active);
        }
      } else {
        // Contrato ainda aberto ou não encontrado — marcar como TIMEOUT_UNKNOWN
        addLog('error', `[FALLBACK] Contrato ${contractId} sem resultado apos timeout`);
        const accumStake = seriesStakeAccum.current.get(ctx.seriesId) ?? ctx.stake;
        onSeriesEnd({
          seriesId: ctx.seriesId,
          finalResult: 'TIMEOUT_UNKNOWN',
          finalGaleLevel: ctx.galeLevel,
          totalStake: accumStake,
          profit: 0,
          resolvedAt: Date.now(),
        }, ctx.asset, ctx.direction);
      }
    } catch (err) {
      addLog('error', `[FALLBACK ERROR] Falha no check manual: ${contractId}`);
      const accumStake = seriesStakeAccum.current.get(ctx.seriesId) ?? ctx.stake;
      onSeriesEnd({
        seriesId: ctx.seriesId,
        finalResult: 'TIMEOUT_UNKNOWN',
        finalGaleLevel: ctx.galeLevel,
        totalStake: accumStake,
        profit: 0,
        resolvedAt: Date.now(),
      }, ctx.asset, ctx.direction);
    }
  }, [handlePOC, addLog, onSeriesEnd]);

  // ── executeTrade — Compra + escuta resultado ─────────────────────────────

  const executeTrade = useCallback(async (ctx: TradeContext) => {
    const posId = `${ctx.asset}-G${ctx.galeLevel}-${Date.now()}`;

    // Acumular stake da série
    const prevAccum = seriesStakeAccum.current.get(ctx.seriesId) ?? 0;
    seriesStakeAccum.current.set(ctx.seriesId, prevAccum + ctx.stake);

    try {
      addLog('info', `[G${ctx.galeLevel}] ${ctx.asset} ${ctx.direction} | Stake: $${ctx.stake.toFixed(2)}`);

      // Registra posição aberta na UI
      setOpenPositions(prev => [...prev, {
        id: posId,
        asset: ctx.asset,
        direction: ctx.direction,
        stake: ctx.stake,
        gale: ctx.galeLevel,
        openTime: Date.now(),
        durationSecs: 60,
      }]);

      // Enviar BUY para a Deriv
      const { response: resp } = await derivApiService.send({
        buy: 1,
        price: ctx.stake,
        parameters: {
          amount: ctx.stake,
          basis: 'stake',
          contract_type: ctx.direction,
          currency: 'USD',
          duration: 1,
          duration_unit: 'm',
          symbol: ctx.asset,
        },
      });

      if (resp.error) throw resp.error;

      // ── contract_id real: SEMPRE Number() ─────────────────────────────
      const realContractId = Number(resp.buy.contract_id);
      const buyPrice = Number(resp.buy.buy_price ?? ctx.stake);
      const ac = new AbortController();

      // Request subscription for updates
      derivApiService.sendRaw({
        proposal_open_contract: 1,
        contract_id: realContractId,
        subscribe: 1
      });

      addLog('ok', `[BUY OK] ${ctx.asset} contract_id=${realContractId} | buyPrice=$${buyPrice.toFixed(2)}`);

      const activeContract: ActiveContract = {
        ...ctx,
        contractId: realContractId,
        abortController: ac,
        fallbackTimer: setTimeout(() => checkFallback(realContractId, ctx), FALLBACK_DELAY_MS),
      };

      activeSeries.current.set(ctx.seriesId, activeContract);

      // ── Persistir recovery (contractId REAL, nunca client_id) ─────────
      const recovery: GaleRecoveryState = {
        seriesId: ctx.seriesId,
        galeLevel: ctx.galeLevel,
        contractId: realContractId,
        asset: ctx.asset,
        direction: ctx.direction,
        stake: ctx.stake,
        savedAt: Date.now(),
      };
      localStorage.setItem('hft_active_recovery', JSON.stringify(recovery));

      // ── Escutar POC via globalHandler + AbortController ───────────────
      const socket = derivApiService.getRawSocket();
      if (socket) {
        socket.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (
              msg.msg_type === 'proposal_open_contract' &&
              Number(msg.proposal_open_contract?.contract_id) === realContractId
            ) {
              handlePOC(msg, activeContract);
            }
          } catch { /* parse error — ignorar */ }
        }, { signal: ac.signal });
      }

    } catch (err: any) {
      setOpenPositions(prev => prev.filter(p => p.id !== posId));
      const errMsg = err.message || JSON.stringify(err);
      addLog('error', `[DERIV ERROR] G${ctx.galeLevel} ${ctx.asset}: ${errMsg}`);

      const accumStake = seriesStakeAccum.current.get(ctx.seriesId) ?? ctx.stake;

      if (errMsg.includes('InsufficientBalance') || errMsg.includes('Insufficient balance')) {
        addLog('error', `[STOP] Saldo insuficiente. Ciclo abortado.`);
        onSeriesEnd({
          seriesId: ctx.seriesId,
          finalResult: 'TIMEOUT_UNKNOWN',
          finalGaleLevel: ctx.galeLevel,
          totalStake: accumStake,
          profit: 0,
          resolvedAt: Date.now(),
        }, ctx.asset, ctx.direction);
      } else if (ctx.galeLevel < 2) {
        addLog('info', `[RETRY] Tentando G${ctx.galeLevel + 1} em 2s devido a erro tecnico...`);
        setTimeout(() => {
          executeTradeRef.current({
            ...ctx,
            reqId: Date.now(),
            galeLevel: (ctx.galeLevel + 1) as GaleLevel,
            stake: Number((baseStake * GALE_MULTIPLIERS[ctx.galeLevel + 1]).toFixed(2)),
            sentAt: Date.now(),
          });
        }, 2000);
      } else {
        onSeriesEnd({
          seriesId: ctx.seriesId,
          finalResult: 'LOSS',
          finalGaleLevel: 2,
          totalStake: accumStake,
          profit: -accumStake,
          resolvedAt: Date.now(),
        }, ctx.asset, ctx.direction);
      }
    }
  }, [addLog, baseStake, onSeriesEnd, checkFallback, handlePOC]);

  // Ref estável para evitar re-subscribe loops
  const executeTradeRef = useRef(executeTrade);
  useEffect(() => { executeTradeRef.current = executeTrade; }, [executeTrade]);

  // ── resumePendingGale — Recovery de série interrompida ───────────────────

  const resumePendingGale = useCallback(async (state: GaleRecoveryState) => {
    addLog('info', `[RECOVERY] Retomando ciclo interrompido: ${state.asset} G${state.galeLevel}`);
    try {
      const { response } = await derivApiService.send({
        proposal_open_contract: 1,
        contract_id: state.contractId,
        subscribe: 0,  // Query pontual, não subscription
      });

      if (response.proposal_open_contract) {
        const ac = new AbortController();
        const contract: ActiveContract = {
          reqId: Date.now(),
          asset: state.asset,
          direction: state.direction,
          stake: state.stake,
          galeLevel: state.galeLevel,
          seriesId: state.seriesId,
          sentAt: Date.now(),   // ← FIX: campo obrigatório que estava faltando
          contractId: state.contractId,
          abortController: ac,
          fallbackTimer: setTimeout(() => {}, 0), // timer dummy — já estamos fazendo query
        };

        // Inicializar acumulador da série com a stake atual
        seriesStakeAccum.current.set(state.seriesId, state.stake);

        handlePOC({ proposal_open_contract: response.proposal_open_contract }, contract);
      } else {
        addLog('info', `[RECOVERY] Contrato ${state.contractId} nao encontrado — limpando`);
        localStorage.removeItem('hft_active_recovery');
      }
    } catch (err) {
      addLog('error', `[RECOVERY ERROR] Falha ao resumir: ${state.contractId}`);
      localStorage.removeItem('hft_active_recovery');
    }
  }, [handlePOC, addLog]);

  // ── Page Visibility API ─────────────────────────────────────────────────

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Parar de aceitar novos sinais imediatamente
        setIsAcceptingSignals(false);
      }
      if (document.visibilityState === 'visible') {
        // Ordem obrigatória: (1) reconectar WS → (2) re-hidratar → (3) aceitar sinais
        await derivApiService.ensureConnected();

        const rawRecovery = localStorage.getItem('hft_active_recovery');
        if (rawRecovery) {
          try {
            const state: GaleRecoveryState = JSON.parse(rawRecovery);
            const ageMs = Date.now() - state.savedAt;
            if (ageMs < 90_000) {
              await resumePendingGale(state);
            } else {
              addLog('info', `[RECOVERY] Estado expirado (${(ageMs / 1000).toFixed(0)}s > 90s) — limpando`);
              localStorage.removeItem('hft_active_recovery');
            }
          } catch { /* parse error */ }
        }

        setIsAcceptingSignals(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [resumePendingGale, addLog]);

  // ── Realtime Signals (hft_catalogo_estrategias) ──────────────────────────

  useEffect(() => {
    if (!enabled || !isAcceptingSignals) return;

    const channel = hftSupabase
      .channel('oracle_signals_bridge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hft_catalogo_estrategias' },
      (payload) => {
        const signal = payload.new as Record<string, unknown>;
        if (String(signal.status ?? '') !== 'CONFIRMED') return;

        // Verificar latência do sinal
        const tsSignal = Number(signal.timestamp_sinal ?? 0);
        const tsNow = Date.now() / 1000;
        const latency = tsNow - tsSignal;
        if (latency > 10 || latency < 0) return;

        // Verificar se o bot está ativo
        const variacao = String(signal.variacao_estrategia ?? 'N/A');
        if (!activeBots.has(variacao)) return;

        const ativo = String(signal.ativo ?? '');

        // Concurrency cap
        if (executingAssets.current.size >= MAX_CONCURRENT_ASSETS) {
          addLog('info', `[CAP] ${executingAssets.current.size}/${MAX_CONCURRENT_ASSETS} ativos em execucao. ${ativo} adiado.`);
          return;
        }

        // Anti-duplo por ativo
        if (executingAssets.current.has(ativo)) return;
        executingAssets.current.add(ativo);

        const direcao = String(signal.direcao || signal.sinal_dir || '') as ContractDirection;

        addLog('ok', `[EXEC] Iniciando ${ativo} ${direcao} | lat=${latency.toFixed(2)}s`);

        executeTradeRef.current({
          reqId: Date.now(),
          asset: ativo,
          direction: direcao,
          stake: Number(baseStake.toFixed(2)),
          galeLevel: 0,
          seriesId: crypto.randomUUID(),
          sentAt: Date.now(),
        });
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') addLog('ok', '[SIGNAL] Canal conectado com sucesso!');
        else if (st === 'CHANNEL_ERROR') addLog('error', `[SIGNAL] Erro no canal!`);
        else addLog('info', `[SIGNAL] Status canal: ${st}`);
      });

    return () => { hftSupabase.removeChannel(channel); };
  }, [enabled, isAcceptingSignals, activeBots, baseStake, addLog]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Abortar todos os contratos ativos
      activeSeries.current.forEach(contract => {
        contract.abortController.abort();
        clearTimeout(contract.fallbackTimer);
      });
      activeSeries.current.clear();
      seriesStakeAccum.current.clear();
      executingAssets.current.clear();
    };
  }, []);

  return {
    sessionWins,
    sessionLosses,
    sessionProfit,
    logs,
    openPositions,
    isAcceptingSignals,
    resetStats: () => {
      setSessionWins(0);
      setSessionLosses(0);
      setSessionProfit(0);
      setLogs([]);
      localStorage.removeItem('@oracle:session_results');
    },
  };
}

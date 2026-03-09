import { useState, useEffect, useCallback, useRef } from 'react';
import { hftSupabase } from '../lib/hftSupabase';
import { HftDerivService, DerivOrderParams } from '../services/HftDerivService';

// ── Mapeamento Oficial dos Bots (Arsenal Especialista) ──────────────────────
export type BotType = 'V1' | 'V2' | 'V4' | 'V5' | 'V7';

export interface BotDefinition {
  id: BotType;
  name: string;
  slogan: string;
  badge: string;
  color: string;      // cor neon primária
  colorMuted: string; // versão 10% opacidade para background do card
}

export const BOT_CATALOG: Record<BotType, BotDefinition> = {
  V1: {
    id: 'V1',
    name: 'RELOJ ATÓMICO 95',
    slogan: 'Precisión cronometrada',
    badge: '⚡ SPEED',
    color: '#06b6d4',
    colorMuted: 'rgba(6,182,212,0.10)',
  },
  V2: {
    id: 'V2',
    name: 'CÓDIGO PRISMA',
    slogan: 'ADN de las velas',
    badge: '💎 ELITE',
    color: '#a78bfa',
    colorMuted: 'rgba(167,139,250,0.10)',
  },
  V4: {
    id: 'V4',
    name: 'ALGORITMO ORÁCULO',
    slogan: 'Historia vs Realidad',
    badge: '🔥 HOT',
    color: '#f59e0b',
    colorMuted: 'rgba(245,158,11,0.10)',
  },
  V5: {
    id: 'V5',
    name: 'TRINIDAD CUÁNTICA',
    slogan: 'Triple filtro de confirmación',
    badge: '💎 ELITE',
    color: '#10b981',
    colorMuted: 'rgba(16,185,129,0.10)',
  },
  V7: {
    id: 'V7',
    name: 'ESCUDO CENTINELA',
    slogan: 'El búnker de tu capital',
    badge: '⚡ SPEED',
    color: '#64748b',
    colorMuted: 'rgba(100,116,139,0.10)',
  },
};

export const BOT_ORDER: BotType[] = ['V1', 'V2', 'V4', 'V5', 'V7'];

// ── Tipagem do Payload HFT ──────────────────────────────────────────────────
export interface HftSignalPayload {
  id?: number;
  ativo: string;
  estrategia: string;
  variacao_estrategia?: string;
  status: 'PRE_SIGNAL' | 'CONFIRMED' | string;
  timestamp_sinal: number; // epoch
  sinal_dir?: string;
  tipo?: string;
  digito?: number;
  payout?: number; // [LGN_AUDITOR] payout retornado pela corretora (%)
}

interface ExecutionBridgeProps {
  activeBots: Set<BotType>;
  enabled: boolean;
  takeProfit?: number;
  stopLoss?: number;
  currentProfit?: number;
  derivToken?: string | null;
  /** [PASSO 3] Socket injetado do DerivContext — evita novas conexões na Deriv */
  derivSocket?: WebSocket | null;
  baseStake?: number;
}

export interface TradeCycleState {
  isActive: boolean;
  galeLevel: number;
  asset?: string;
  lastSignalId?: number;
  timestamp?: number;
}

export interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'warn' | 'success' | 'error';
  ts: number;
}

// [SHIELD_AGENT] Whitelist estrita — motor opera APENAS Volatility Indices
const VOLATILITY_WHITELIST = new Set(['R_10', 'R_25', 'R_50', 'R_75', 'R_100']);

// [LGN_AUDITOR] Payout mínimo aceitável (%)
const MIN_PAYOUT_PCT = 80;

const STORAGE_KEY = '@millionbots:trade_cycle_v2';

// [LGN_AUDITOR] Constantes imutáveis de risco
const GALE_MULTIPLIERS = [1.0, 2.2, 5.0] as const; // Total: 8.2 unidades
const GALE_TOTAL_UNITS = 8.2;  // 1.0 + 2.2 + 5.0
const MAX_RISK_PCT = 0.20;     // 20% da banca por série (ajustado para contas pequenas)

// ── Hook de Execução Mestre ─────────────────────────────────────────────────
export function useHftExecutionBridge({
  activeBots,
  enabled,
  takeProfit = 0,
  stopLoss = 0,
  currentProfit = 0,
  derivToken = null,
  derivSocket = null,
  baseStake = 1.0,
}: ExecutionBridgeProps) {

  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Anti-Loss: Persistência do Ciclo (SHIELD_AGENT)
  const [tradeCycle, setTradeCycle] = useState<TradeCycleState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      console.error('[SHIELD_AGENT] Erro ao ler LocalStorage');
    }
    return { isActive: false, galeLevel: 0 };
  });

  const logCounter = useRef(0);
  const currentProfitRef = useRef(currentProfit);
  const takeProfitRef = useRef(takeProfit);
  const stopLossRef = useRef(stopLoss);
  const tradeCycleRef = useRef(tradeCycle);
  const activeBotsRef = useRef(activeBots);
  const activeAssetsRef = useRef<Set<string>>(new Set());
  const lastProcessedSignalIdRef = useRef<Set<number>>(new Set());
  const derivTokenRef = useRef(derivToken);
  const derivSocketRef = useRef(derivSocket); // [PASSO 3]
  const baseStakeRef = useRef(baseStake);

  useEffect(() => {
    currentProfitRef.current = currentProfit;
    takeProfitRef.current = takeProfit;
    stopLossRef.current = stopLoss;
    derivTokenRef.current = derivToken;
    derivSocketRef.current = derivSocket; // [PASSO 3]
    baseStakeRef.current = baseStake;
    activeBotsRef.current = activeBots;
  }, [currentProfit, takeProfit, stopLoss, derivToken, derivSocket, baseStake, activeBots]);

  useEffect(() => {
    tradeCycleRef.current = tradeCycle;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tradeCycle));
  }, [tradeCycle]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
      const newLog = { id: ++logCounter.current, message, type, ts: Date.now() };
      return [newLog, ...prev].slice(0, 60);
    });
  }, []);

  // [SHIELD_AGENT] Ref para executeOrderChain — evita re-subscribe do canal
  const executeOrderChainRef = useRef<((payload: HftSignalPayload) => Promise<void>) | null>(null);

  // Async Execução Gale progressiva
  const executeOrderChain = useCallback(async (payload: HftSignalPayload) => {
    if (!derivTokenRef.current) {
      addLog('[ERROR] Token da Deriv não encontrado. Operação abortada.', 'error');
      return;
    }

    if (activeAssetsRef.current.has(payload.ativo)) {
      addLog(`[ACTION] Sinal para ${payload.ativo} ignorado: ciclo já ativo neste ativo.`, 'warn');
      return;
    }

    activeAssetsRef.current.add(payload.ativo);
    addLog(`[ACTION] Iniciando Ciclo Executor para ${payload.ativo} | Token Presente`, 'info');

    setTradeCycle(prev => ({
      ...prev,
      isActive: true,
      asset: payload.ativo,
      lastSignalId: payload.id,
      galeLevel: 0,
      timestamp: Date.now(),
    }));

    const tipoContrato = payload.sinal_dir || payload.tipo || 'CALL';
    const params: DerivOrderParams = {
      token: derivTokenRef.current,
      ativo: payload.ativo,
      tipo: tipoContrato,
      stake: baseStakeRef.current,
      duration: 1,
      durationUnit: 'm',
      digito: payload.digito,
    };

    let galeReached = 0;
    let finalResult = 'HIT';
    let totalProfit = 0;

    const multiplicadores = GALE_MULTIPLIERS;

    // [LGN_AUDITOR] Sizing Guard + Balance Check + EV Audit
    const balance = await HftDerivService.getBalance(derivSocketRef.current);
    if (balance > 0) {
      const totalExposure = baseStakeRef.current * GALE_TOTAL_UNITS;
      // Trava de risco removida a pedido do usuario
      addLog(`[💰 LGN] Saldo: $${balance.toFixed(2)} | Exposição G2: $${totalExposure.toFixed(2)}`, 'info');
      addLog(`[📊 EV] Série G2: $${baseStakeRef.current.toFixed(2)} × [1.0+2.2+5.0] = $${totalExposure.toFixed(2)} | Break-even: payout ≥ ${((GALE_TOTAL_UNITS / (GALE_TOTAL_UNITS + 1)) * 100).toFixed(0)}%`, 'info');
    } else {
      addLog(`[⚠️ LGN] Não foi possível ler saldo. Prosseguindo com cautela.`, 'warn');
    }

    // [SHIELD_AGENT] REGRA DE OURO: try/finally garante que o ativo SEMPRE é liberado
    try {
      for (let i = 0; i < 3; i++) {
        galeReached = i;
        params.stake = baseStakeRef.current * multiplicadores[i];

        // [LGN_AUDITOR] Balance Check antes de cada Gale
        if (balance > 0 && i > 0) {
          const liveBalance = await HftDerivService.getBalance(derivSocketRef.current);
          if (liveBalance > 0 && liveBalance < params.stake) {
            addLog(`[🛑 LGN] Banca Insuficiente para G${i}: $${liveBalance.toFixed(2)} < $${params.stake.toFixed(2)}. ABORTANDO.`, 'error');
            finalResult = 'CANCELLED';
            break;
          }
        }

        // [SHIELD_AGENT] Salva estado do Gale no LocalStorage para recuperação F5
        setTradeCycle(prev => ({ ...prev, galeLevel: i }));

        // [SHIELD_AGENT] Jitter entre ordens para não sobrecarregar a Deriv
        if (activeAssetsRef.current.size > 1 || i > 0) {
          const jitter = 100 + Math.floor(Math.random() * 400);
          addLog(`[⏳ JITTER] ${payload.ativo} aguardando ${jitter}ms...`, 'info');
          await new Promise(res => setTimeout(res, jitter));
        }

        addLog(`[DERIV] Lançando ${i === 0 ? 'ENTRADA BASE (G0)' : `GALE ${i}`}. Stake: $${params.stake.toFixed(2)}`, 'info');

        const result = await HftDerivService.executeDerivOrder({ ...params, socket: derivSocketRef.current });

        // [FORMA 5] Auditoria Inviolável: Envia ID do contrato para o Supabase B
        if (result.contractId) {
          import('../services/HftAuditService').then(({ HftAuditService }) => {
            HftAuditService.registerTrade({
              clientId,
              contractId: String(result.contractId),
              botId: 'ORACLE_QUANT',
              ativo: payload.ativo
            });
          });
        }

        if (!result.success) {
          addLog(`[DERIV ERROR] Falha no disparo: ${result.error} (código: ${result.errorCode})`, 'error');

          // [LGN_AUDITOR] Ordem recusada = dinheiro NÃO foi debitado, totalProfit intacto
          // [SHIELD_AGENT] InsufficientBalance é o ÚNICO erro que aborta o ciclo
          if (result.errorCode === 'InsufficientBalance') {
            addLog(`[🛑 LGN] Banca insuficiente detectada pela Deriv. Ciclo abortado.`, 'error');
            finalResult = 'CANCELLED';
            break;
          }

          // [LGN_AUDITOR] Resiliência: G0/G1/G2 falhou tecnicamente → espera até próxima vela
          const nowMs = Date.now();
          const msUntilNextMinute = 60000 - (nowMs % 60000);
          addLog(`[⏳ RETRY] Erro técnico em G${i}. Aguardando ${(msUntilNextMinute / 1000).toFixed(1)}s até próxima vela...`, 'info');
          await new Promise(res => setTimeout(res, msUntilNextMinute + 500)); // +500ms de margem
          continue; // tenta próximo Gale level na nova vela
        }

        // [LGN_AUDITOR] Apenas acumula profit quando a ordem foi ACEITA pela Deriv
        totalProfit += result.profit - (result.won ? 0 : params.stake);

        if (result.won) {
          addLog(`[RESULTADO] WIN! Lucro obtido: +$${result.profit.toFixed(2)} (Gale ${i})`, 'success');
          finalResult = 'WIN';
          break;
        } else {
          addLog(`[RESULTADO] LOSS. Prejuízo: -$${params.stake.toFixed(2)} (Gale ${i})`, 'warn');
        }
      }

      if (finalResult === 'HIT') {
        addLog(`[RESULTADO] HIT (Loss Triplo). Fim da linha para o ciclo.`, 'error');
      }
    } finally {
      // [SHIELD_AGENT] REGRA DE OURO: Libera o ativo SEMPRE, independente de Win/Loss/Timeout/Crash
      activeAssetsRef.current.delete(payload.ativo);
      setTradeCycle({ isActive: false, galeLevel: 0 });
    }

    // Audit Trail
    try {
      await hftSupabase.from('client_logs').insert({
        strategy_id: payload.estrategia,
        resultado_final: finalResult,
        payout_obtido: totalProfit,
        gale_alcancado: galeReached,
        ativo: payload.ativo,
        bot_variacao: payload.variacao_estrategia,
      });
      addLog(`[AUDIT] Trilha de execução registrada no Banco (Supabase)`, 'info');
    } catch (e) {
      console.warn('Erro ao inserir audit log:', e);
    }
  }, [addLog]);

  // [SHIELD_AGENT] Sync ref para evitar re-subscribe do canal Realtime
  useEffect(() => {
    executeOrderChainRef.current = executeOrderChain;
  }, [executeOrderChain]);

  useEffect(() => {
    if (!enabled) return;

    if (tradeCycleRef.current.isActive || tradeCycleRef.current.galeLevel > 0) {
      addLog(`[SHIELD_AGENT] Recuperando Ciclo. Gale: ${tradeCycleRef.current.galeLevel} | Ativo: ${tradeCycleRef.current.asset}`, 'warn');
    }

    const activeBotNames = Array.from(activeBotsRef.current)
      .map(b => BOT_CATALOG[b]?.name ?? b)
      .join(', ');
    addLog(`[HFT] Iniciando escuta (Realtime) — Bots ativos: [${activeBotNames || 'Nenhum'}]`, 'info');

    const channel = hftSupabase
      .channel('schema-db-changes-arsenal')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hft_catalogo_estrategias',
        },
        (payload) => {
          console.log('[REALTIME] Payload recebido bruto:', payload);

          const signal = payload.new as HftSignalPayload;

          // [AUTO_DEBUG_CRON] Filtro de Duplicidade
          if (signal.id !== undefined) {
            if (lastProcessedSignalIdRef.current.has(signal.id)) {
              addLog(`[DEDUP] Sinal ID ${signal.id} já processado. Descartando duplicata.`, 'warn');
              return;
            }
            lastProcessedSignalIdRef.current.add(signal.id);
            if (lastProcessedSignalIdRef.current.size > 200) {
              const oldest = lastProcessedSignalIdRef.current.values().next().value;
              if (oldest !== undefined) lastProcessedSignalIdRef.current.delete(oldest);
            }
          }

          // [SHIELD_AGENT] Whitelist Estrita
          if (!VOLATILITY_WHITELIST.has((signal.ativo || '').toUpperCase())) {
            addLog(`[WHITELIST] ${signal.ativo} bloqueado. Motor opera apenas R_10/R_25/R_50/R_75/R_100.`, 'warn');
            return;
          }

          // ── [TRAVA DE EXCLUSIVIDADE] variacao_estrategia deve bater EXATAMENTE ──
          const variacao = (signal.variacao_estrategia || '').toUpperCase().trim() as BotType;

          if (!variacao) {
            addLog(`[FILTRO] Sinal sem variacao_estrategia definida. Descartado.`, 'warn');
            return;
          }

          const currentActiveBots = activeBotsRef.current;
          if (!currentActiveBots.has(variacao)) {
            const botName = BOT_CATALOG[variacao]?.name ?? variacao;
            addLog(`[TRAVA] Sinal ${variacao} (${botName}) ignorado — bot não está ativo no Arsenal.`, 'warn');
            return;
          }

          addLog(`[✅ MATCH] ${signal.ativo} | Variação: ${variacao} (${BOT_CATALOG[variacao]?.name}) | Status: ${signal.status}`, 'success');

          // [LGN_AUDITOR] Check de Payout Mínimo (80%)
          const payout = signal.payout ?? 100;
          if (payout < MIN_PAYOUT_PCT) {
            addLog(`[LGN_AUDITOR] Payout ${payout}% abaixo do mínimo de ${MIN_PAYOUT_PCT}%. Entrada bloqueada.`, 'warn');
            return;
          }

          // Check de Risco (TP/SL)
          const _profit = currentProfitRef.current;
          const _tp = takeProfitRef.current;
          const _sl = stopLossRef.current;

          if (_tp > 0 && _profit >= _tp) {
            addLog(`[RISK] Meta batida (Take Profit). Sinal bloqueado.`, 'error');
            return;
          }
          if (_sl > 0 && _profit <= -Math.abs(_sl)) {
            addLog(`[RISK] Loss máximo batido (Stop Loss). Sinal bloqueado.`, 'error');
            return;
          }

          // Gestão de Gatilho
          if (signal.status === 'PRE_SIGNAL') {
            addLog(`[HFT] Preparando entrada em ${signal.ativo}... (Handshake)`, 'info');
            if (derivTokenRef.current) {
              HftDerivService.prepareConnection(signal.ativo, derivTokenRef.current).then(success => {
                if (success) addLog(`[HANDSHAKE] WS Aberto e Autenticado para ${signal.ativo}`, 'success');
              });
            }
          } else if (signal.status === 'CONFIRMED') {
            const now = Date.now()

            // [FIX BUG 2] timestamp_sinal é SEMPRE segundos Unix no VPS
            const signalTimeMs = signal.timestamp_sinal * 1000
            const diff = now - signalTimeMs

            // [FIX BUG 1] 10s de tolerância para Vercel CDN
            if (diff >= 0 && diff <= 10000) {
              const msIntoCandle = now % 60000
              const msToSync = msIntoCandle <= 4000
                ? 0
                : 60000 - msIntoCandle

              addLog(
                `[✅ EXEC] ${signal.ativo} | lat=${diff}ms | sync=${msToSync}ms`,
                'success'
              )

              // [FIX BUG 3] Sincroniza com início da próxima vela se já passou 4s
              if (msToSync > 0 && msToSync < 56000) {
                addLog(`[⏱ SYNC] Aguardando ${msToSync}ms para próxima vela`, 'info')
                setTimeout(() => executeOrderChainRef.current?.(signal), msToSync)
              } else {
                executeOrderChainRef.current?.(signal)
              }
            } else {
              addLog(
                `[STALE] ${signal.ativo} | diff=${diff}ms | ts_ms=${signalTimeMs} | now=${now}`,
                'warn'
              )
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[REALTIME] Status do canal:', status, err ?? '');
        if (status === 'SUBSCRIBED') {
          addLog('[HFT] Conectado ao canal Realtime.', 'success');
        } else if (status === 'CHANNEL_ERROR') {
          addLog(`[HFT] Erro de canal: ${JSON.stringify(err)}`, 'error');
        } else if (status === 'TIMED_OUT') {
          addLog('[HFT] Canal Realtime com timeout.', 'error');
        } else if (status === 'CLOSED') {
          addLog('[HFT] Canal Realtime fechado.', 'warn');
        } else {
          addLog(`[HFT] Status do canal: "${status}"`, 'warn');
        }
      });

    return () => {
      hftSupabase.removeChannel(channel);
      addLog('[HFT] Desconectado do canal.', 'warn');
      HftDerivService.killAllConnections();
    };
  // [SHIELD_AGENT] Deps estáveis — executeOrderChain removido (usa ref)
  }, [enabled, addLog]);

  // Gestão de Throttling (Aba Zumbi)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeAssetsRef.current.size > 0) {
        addLog('[SHIELD_AGENT] Navegador em background. Motor continua operando!', 'warn');
        try {
          const audioCtx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
          oscillator.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (_) { /* ignore */ }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [addLog]);

  const stopAll = useCallback(() => {
    activeAssetsRef.current.clear();
    setTradeCycle({ isActive: false, galeLevel: 0 });
    HftDerivService.killAllConnections();
    addLog('[PANIC] Ciclos interrompidos e WebSockets fechados!', 'error');
  }, [addLog]);

  return {
    logs,
    tradeCycle,
    stopAll,
  };
}

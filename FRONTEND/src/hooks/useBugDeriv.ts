// src/hooks/useBugDeriv.ts
//
// ─── MARTINGALE + SOROS ENGINE (2026-02-20) ────────────────────────────────────
//
// IMPLEMENTAÇÃO COMPLETA:
//   1. Martingale configurável (quantidade de níveis + fator multiplicador)
//   2. Estratégia Soros (reinvestir lucro por N vitórias)
//   3. Streak protection (3 losses → pausa de 60s)
//   4. Confidence-gated entry (exige confidence > threshold para cada gale)
//   5. Stop Win / Stop Loss automáticos
//   6. Callback onMartingaleChange para UI mostrar nível atual
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";

export interface BugDerivSignal {
    entrar: true;
    tipo: "DIGITDIFF";
    ativo: string;
    digito: number;
    ev: number;
    percentil: number;
    rtt: number;
    ts: number;
    confidence?: number;
}

export interface MartingaleState {
    /** Nível atual (0 = aposta base, 1 = primeiro gale, etc.) */
    level: number;
    /** Stake atual calculado */
    currentStake: number;
    /** Streak de derrotas consecutivas */
    consecutiveLosses: number;
    /** Se está em pausa por streak protection */
    isPaused: boolean;
}

export interface BugDerivConfig {
    /** Valor do stake base em USD */
    stake: number;
    /** URL WebSocket do VPS */
    vpsUrl: string;
    /** Se o bot deve executar operações reais */
    enabled: boolean;

    // ── Martingale Config ──────────────────────────────────────────────────
    /** Ativar martingale */
    useMartingale?: boolean;
    /** Máximo de níveis de gale (1 = só dobra uma vez, 3 = dobra 3x, etc.) */
    maxGale?: number;
    /** Fator multiplicador (2.0 = dobra, 2.5 = 250%, etc.) */
    martingaleFactor?: number;

    // ── Soros Config ──────────────────────────────────────────────────────
    /** Ativar estratégia Soros */
    useSoros?: boolean;
    /** Número de vitórias consecutivas para reinvestir */
    sorosLevels?: number;

    // ── Stop Config ───────────────────────────────────────────────────────
    /** Stop Win em USD — parar quando lucro atingir este valor */
    stopWin?: number;
    /** Stop Loss em USD — parar quando prejuízo atingir este valor */
    stopLoss?: number;

    // ── Callbacks ─────────────────────────────────────────────────────────
    onSinal?: (sinal: BugDerivSignal) => void;
    onConectado?: () => void;
    onDesconectado?: () => void;
    onErro?: (msg: string) => void;
    onCompra?: (contractId: number | string) => void;
    onResultado?: (resultado: { contractId: number | string, lucro: number, status: "won" | "lost" }) => void;
    /** Chamado sempre que o estado do martingale muda */
    onMartingaleChange?: (state: MartingaleState) => void;
}

/**
 * useBugDeriv — conecta ao servidor de sinais VPS e executa contratos
 * com suporte completo a Martingale e Soros.
 */
export function useBugDeriv(derivAPI: any, config: BugDerivConfig): void {
    const wsRef = useRef<WebSocket | null>(null);
    const configRef = useRef(config);
    const apiRef = useRef(derivAPI);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const isMounted = useRef(true);
    const executingRef = useRef(false);
    const lastTradeRef = useRef<number>(0);
    const activeContracts = useRef<Set<number | string>>(new Set());

    // ── Estado do Martingale ──────────────────────────────────────────────────
    const galeLevel = useRef<number>(0);          // 0 = base, 1+ = gale
    const consecutiveLosses = useRef<number>(0);   // streak de derrotas
    const consecutiveWins = useRef<number>(0);     // streak de vitórias (Soros)
    const streakPauseUntil = useRef<number>(0);    // timestamp até quando está pausado
    const totalProfit = useRef<number>(0);          // lucro acumulado da sessão

    // Mantém refs atualizados
    useEffect(() => {
        configRef.current = config;
        apiRef.current = derivAPI;
    }, [config, derivAPI]);

    // ── Calcula stake dinâmico ────────────────────────────────────────────────
    const calcularStake = useCallback((): number => {
        const cfg = configRef.current;
        const baseStake = cfg.stake;

        // Martingale: stake = base × fator^nível
        if (cfg.useMartingale && galeLevel.current > 0) {
            const fator = cfg.martingaleFactor ?? 2.0;
            const stakeGale = baseStake * Math.pow(fator, galeLevel.current);
            console.log(
                `[BugDeriv] 🎰 Martingale L${galeLevel.current}: ` +
                `$${baseStake} × ${fator}^${galeLevel.current} = $${stakeGale.toFixed(2)}`
            );
            return parseFloat(stakeGale.toFixed(2));
        }

        // Soros: após vitória, reinvestir lucro (stake + último lucro)
        if (cfg.useSoros && consecutiveWins.current > 0 && consecutiveWins.current <= (cfg.sorosLevels ?? 2)) {
            // Soros progressivo simples: dobra o stake a cada vitória
            const sorosMultiplier = Math.pow(2, consecutiveWins.current);
            const stakesSoros = baseStake * sorosMultiplier;
            console.log(
                `[BugDeriv] 📈 Soros W${consecutiveWins.current}: ` +
                `$${baseStake} × ${sorosMultiplier} = $${stakesSoros.toFixed(2)}`
            );
            return parseFloat(stakesSoros.toFixed(2));
        }

        return baseStake;
    }, []);

    // ── Notifica UI sobre estado do martingale ────────────────────────────────
    const notificarMartingale = useCallback(() => {
        const cfg = configRef.current;
        const stake = calcularStake();
        const state: MartingaleState = {
            level: galeLevel.current,
            currentStake: stake,
            consecutiveLosses: consecutiveLosses.current,
            isPaused: Date.now() < streakPauseUntil.current,
        };
        cfg.onMartingaleChange?.(state);
    }, [calcularStake]);

    // ── Processa resultado de trade (WIN/LOSS) ────────────────────────────────
    const processarResultado = useCallback((isWin: boolean) => {
        const cfg = configRef.current;
        const maxG = cfg.maxGale ?? 3;

        if (isWin) {
            // ── VITÓRIA ──
            console.log(
                `[BugDeriv] ✅ WIN no nível Gale ${galeLevel.current} — ` +
                `resetando martingale.`
            );

            // Reset martingale
            galeLevel.current = 0;
            consecutiveLosses.current = 0;

            // Soros: incrementa streak de vitórias
            if (cfg.useSoros) {
                consecutiveWins.current++;
                if (consecutiveWins.current > (cfg.sorosLevels ?? 2)) {
                    console.log(
                        `[BugDeriv] 📈 Soros completado (${consecutiveWins.current - 1} níveis) — ` +
                        `resetando ao stake base.`
                    );
                    consecutiveWins.current = 0;
                }
            }
        } else {
            // ── DERROTA ──
            consecutiveWins.current = 0;  // Reset Soros
            consecutiveLosses.current++;

            if (cfg.useMartingale && galeLevel.current < maxG) {
                galeLevel.current++;
                console.log(
                    `[BugDeriv] ❌ LOSS — avançando para Gale ${galeLevel.current}/${maxG} ` +
                    `(próximo stake: $${calcularStake().toFixed(2)})`
                );
            } else {
                // Max gale ou martingale desativado — reset
                if (cfg.useMartingale) {
                    console.log(
                        `[BugDeriv] 🛑 Max Gale (${maxG}) atingido — ` +
                        `resetando ao stake base. Streak: ${consecutiveLosses.current} losses.`
                    );
                }
                galeLevel.current = 0;
            }

            // ── Streak Protection ──
            // 3 derrotas consecutivas → pausa de 60 segundos
            if (consecutiveLosses.current >= 3) {
                const pausaDuracao = 60_000; // 60s
                streakPauseUntil.current = Date.now() + pausaDuracao;
                console.log(
                    `[BugDeriv] ⚠️ STREAK PROTECTION: ${consecutiveLosses.current} losses consecutivas — ` +
                    `pausando por 60s até ${new Date(streakPauseUntil.current).toLocaleTimeString()}`
                );
                consecutiveLosses.current = 0;
                galeLevel.current = 0;
            }
        }

        notificarMartingale();
    }, [calcularStake, notificarMartingale]);

    const conectar = useCallback(() => {
        if (!isMounted.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const rawUrl = configRef.current.vpsUrl;
        const url = (typeof window !== "undefined" && window.location.protocol === "https:")
            ? rawUrl.replace(/^ws:\/\//, "wss://")
            : rawUrl;

        console.log("[BugDeriv] Conectando ao VPS:", url);

        let socket: WebSocket;
        try {
            socket = new WebSocket(url);
        } catch (err: any) {
            const msg = `Não foi possível conectar ao VPS (${url}): ${err?.message ?? err}`;
            console.error("[BugDeriv] ❌ Erro ao criar WebSocket:", err);
            configRef.current.onErro?.(msg);
            timeoutRef.current = setTimeout(conectar, 10000);
            return;
        }
        wsRef.current = socket;

        socket.onopen = () => {
            if (isMounted.current) {
                console.log("[BugDeriv] ✅ Conectado ao VPS:", url);

                // Log martingale config on connect
                const cfg = configRef.current;
                console.log(
                    `[BugDeriv] 🎰 Martingale config: ` +
                    `{enabled: ${cfg.useMartingale}, maxGale: ${cfg.maxGale}, ` +
                    `factor: ${cfg.martingaleFactor}}`
                );
                console.log(
                    `[BugDeriv] 📈 Soros config: ` +
                    `{enabled: ${cfg.useSoros}, levels: ${cfg.sorosLevels}}`
                );

                configRef.current.onConectado?.();
            }
        };

        socket.onmessage = async (event: MessageEvent) => {
            if (!isMounted.current) return;

            if (!configRef.current.enabled) return;
            if (executingRef.current) {
                console.log("[BugDeriv] Sinal ignorado - ainda executando sinal anterior");
                return;
            }

            try {
                const sinal: BugDerivSignal = JSON.parse(event.data as string);
                if (!sinal.entrar) return;

                console.log("[BugDeriv] 📡 Sinal recebido:", sinal);

                // ── STREAK PAUSE CHECK ──────────────────────────────────────────
                if (Date.now() < streakPauseUntil.current) {
                    const restante = Math.ceil((streakPauseUntil.current - Date.now()) / 1000);
                    console.log(`[BugDeriv] ⏸️ Streak pause ativo — ${restante}s restantes`);
                    return;
                }

                // ── STOP WIN / STOP LOSS CHECK ──────────────────────────────────
                const cfg = configRef.current;
                if (cfg.stopWin && cfg.stopWin > 0 && totalProfit.current >= cfg.stopWin) {
                    console.log(`[BugDeriv] 🏆 Stop Win atingido: $${totalProfit.current.toFixed(2)} >= $${cfg.stopWin}`);
                    return;
                }
                if (cfg.stopLoss && cfg.stopLoss > 0 && totalProfit.current <= -(cfg.stopLoss)) {
                    console.log(`[BugDeriv] 🛑 Stop Loss atingido: $${totalProfit.current.toFixed(2)} <= -$${cfg.stopLoss}`);
                    return;
                }

                // ── CONFIDENCE CHECK PARA MARTINGALE ────────────────────────────
                // Gale > 0 exige confidence mais alta para entrar
                if (cfg.useMartingale && galeLevel.current > 0 && sinal.confidence !== undefined) {
                    const minConfidence = 0.85 + (galeLevel.current * 0.03); // L1=0.88, L2=0.91, L3=0.94
                    if (sinal.confidence < minConfidence) {
                        console.log(
                            `[BugDeriv] 🚫 Gale ${galeLevel.current} rejeitado: ` +
                            `confidence ${sinal.confidence} < ${minConfidence.toFixed(2)} mín`
                        );
                        return;
                    }
                    console.log(
                        `[BugDeriv] ✅ Gale ${galeLevel.current} aprovado: ` +
                        `confidence ${sinal.confidence} >= ${minConfidence.toFixed(2)}`
                    );
                }

                configRef.current.onSinal?.(sinal);

                const api = apiRef.current;
                const currentStake = calcularStake();

                console.log(
                    "[BugDeriv] API disponível:", !!api,
                    "stake atual:", currentStake,
                    "gale level:", galeLevel.current
                );

                if (!api?.send) {
                    const msg = "API Deriv não disponível — conecte sua conta Deriv primeiro";
                    console.warn("[BugDeriv] ⚠️", msg);
                    configRef.current.onErro?.(msg);
                    return;
                }

                // ── COOLDOWN CHECK ─────────────────────────────────────────────
                const COOLDOWN_MS = 4000;
                const agora = Date.now();
                if (agora - lastTradeRef.current < COOLDOWN_MS) {
                    console.log(`[BugDeriv] ⏳ Cooldown ativo`);
                    return;
                }

                executingRef.current = true;
                lastTradeRef.current = agora;

                try {
                    // ── ETAPA 1: PROPOSAL ─────────────────────────────────────────
                    const proposalPayload = {
                        proposal: 1,
                        contract_type: sinal.tipo,
                        symbol: sinal.ativo,
                        duration: 1,
                        duration_unit: "t",
                        barrier: String(sinal.digito),
                        currency: "USD",
                        basis: "stake",
                        amount: currentStake,   // ← STAKE DINÂMICO (martingale/soros)
                    };

                    console.log(
                        `[BugDeriv] 📤 Proposal (Gale ${galeLevel.current}): ` +
                        `$${currentStake} em ${sinal.ativo} ≠${sinal.digito}`
                    );

                    let proposalResp: any;
                    try {
                        proposalResp = await api.send(proposalPayload);
                    } catch (proposalErr: any) {
                        const msg = `Erro no proposal: ${proposalErr?.message || proposalErr?.code || JSON.stringify(proposalErr)}`;
                        console.error("[BugDeriv] ❌ Proposal falhou:", proposalErr);
                        configRef.current.onErro?.(msg);
                        return;
                    }

                    console.log("[BugDeriv] 📨 Proposal response:", JSON.stringify(proposalResp));

                    if (proposalResp?.error) {
                        const msg = `Proposal rejeitado: ${proposalResp.error.message || proposalResp.error.code}`;
                        console.error("[BugDeriv] ❌", msg, proposalResp.error);
                        configRef.current.onErro?.(msg);
                        return;
                    }

                    const proposalId = proposalResp?.proposal?.id;
                    if (!proposalId) {
                        const msg = `proposal_id não encontrado. Resposta: ${JSON.stringify(proposalResp).slice(0, 200)}`;
                        console.error("[BugDeriv] ❌", msg);
                        configRef.current.onErro?.(msg);
                        return;
                    }

                    console.log("[BugDeriv] ✅ proposal_id:", proposalId);

                    // ── ETAPA 2: BUY ──────────────────────────────────────────────
                    const buyPayload = {
                        buy: proposalId,
                        price: currentStake,    // ← STAKE DINÂMICO
                    };

                    console.log("[BugDeriv] 📤 Enviando buy:", buyPayload);

                    let buyResp: any;
                    try {
                        buyResp = await api.send(buyPayload);
                    } catch (buyErr: any) {
                        const msg = `Erro no buy: ${buyErr?.message || buyErr?.code || JSON.stringify(buyErr)}`;
                        console.error("[BugDeriv] ❌ Buy falhou:", buyErr);
                        configRef.current.onErro?.(msg);
                        return;
                    }

                    console.log("[BugDeriv] 📨 Buy response:", JSON.stringify(buyResp));

                    if (buyResp?.error) {
                        const msg = `Buy rejeitado: ${buyResp.error.message || buyResp.error.code}`;
                        console.error("[BugDeriv] ❌", msg, buyResp.error);
                        configRef.current.onErro?.(msg);
                        return;
                    }

                    if (buyResp?.buy) {
                        const contractId = buyResp.buy.contract_id;
                        console.log("[BugDeriv] 🎯 Contrato comprado! ID:", contractId, buyResp.buy);
                        activeContracts.current.add(contractId);
                        configRef.current.onCompra?.(contractId);
                    } else {
                        console.warn("[BugDeriv] ⚠️ Buy retornou resposta inesperada:", buyResp);
                        configRef.current.onErro?.(`Resposta buy inesperada: ${JSON.stringify(buyResp).slice(0, 100)}`);
                    }

                } finally {
                    executingRef.current = false;
                }

            } catch (err) {
                executingRef.current = false;
                console.error("[BugDeriv] ❌ Erro inesperado ao executar sinal:", err);
            }
        };

        socket.onclose = (ev) => {
            if (isMounted.current) {
                console.log(`[BugDeriv] Desconectado do VPS (code=${ev.code}). Reconectando em 3s...`);
                configRef.current.onDesconectado?.();
                timeoutRef.current = setTimeout(conectar, 3000);
            }
        };

        socket.onerror = (err) => {
            console.error("[BugDeriv] WebSocket erro:", err);
            socket.close();
        };
    }, [calcularStake]);

    // ── Monitoramento de Contratos Ativos ─────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(async () => {
            if (activeContracts.current.size === 0) return;
            const api = apiRef.current;
            if (!api?.send) return;

            for (const contractId of Array.from(activeContracts.current)) {
                try {
                    const resp = await api.send({ proposal_open_contract: 1, contract_id: contractId });
                    const contract = resp?.proposal_open_contract;

                    if (contract && contract.is_sold) {
                        const lucro = Number(contract.profit);
                        const isWin = lucro >= 0;
                        const status = isWin ? "won" : "lost";
                        console.log(`[BugDeriv] 🏁 Contrato fechado: ${status} (${lucro})`);

                        // Atualiza lucro total
                        totalProfit.current += lucro;

                        // ── PROCESSA MARTINGALE / SOROS ──
                        processarResultado(isWin);

                        configRef.current.onResultado?.({ contractId, lucro, status });
                        activeContracts.current.delete(contractId);
                    }
                } catch (err) {
                    console.error(`[BugDeriv] Erro ao checar contrato ${contractId}:`, err);
                }
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [processarResultado]);

    useEffect(() => {
        isMounted.current = true;
        conectar();

        // Log inicial do estado
        console.log(
            `[BugDeriv] 🚀 Hook inicializado — ` +
            `Martingale: ${config.useMartingale ? `ON (max ${config.maxGale}, ×${config.martingaleFactor})` : "OFF"} | ` +
            `Soros: ${config.useSoros ? `ON (${config.sorosLevels} levels)` : "OFF"}`
        );

        return () => {
            isMounted.current = false;
            if (wsRef.current) wsRef.current.close();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [conectar]);
}

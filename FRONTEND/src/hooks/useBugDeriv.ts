// src/hooks/useBugDeriv.ts
//
// ─── SIGNAL RECEIVER (v3.0 – VPS BACKEND MODE) ────────────────────────────────
//
// ARQUITETURA NOVA:
//   - Ordens são executadas 100% no backend Python (VPS)
//   - Este hook APENAS recebe sinais via WebSocket do VPS
//   - Mantém todos os callbacks de UI (onSinal, onResultado, etc.)
//   - O Supabase é o canal de comunicação: frontend escreve em active_bots,
//     backend lê e executa as ordens, backend escreve em trade_history
//
// REMOVIDO:
//   - api.send() para proposal + buy (agora fica na VPS)
//   - Monitoramento de contratos abertos (agora no Python engine)
//
// MANTIDO:
//   - Conexão WebSocket ao VPS (recebe sinais do bug-deriv-engine broadcaster)
//   - Callbacks onSinal, onConectado, onDesconectado, onErro, onResultado
//   - MartingaleState UI (para mostrar nível atual na interface)
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
    /** URL WebSocket do VPS (signal broadcaster) */
    vpsUrl: string;
    /** Se o bot está ativo (frontend usa para UI apenas; execução está no backend) */
    enabled: boolean;

    // ── Martingale Config (apenas para exibição na UI) ──────────────────────
    useMartingale?: boolean;
    maxGale?: number;
    martingaleFactor?: number;

    // ── Soros Config ────────────────────────────────────────────────────────
    useSoros?: boolean;
    sorosLevels?: number;

    // ── Stop Config ─────────────────────────────────────────────────────────
    stopWin?: number;
    stopLoss?: number;

    // ── Callbacks ───────────────────────────────────────────────────────────
    onSinal?: (sinal: BugDerivSignal) => void;
    onConectado?: () => void;
    onDesconectado?: () => void;
    onErro?: (msg: string) => void;
    /** Chamado quando o backend confirma abertura de contrato (via Supabase realtime, se implementado) */
    onCompra?: (contractId: number | string) => void;
    onResultado?: (resultado: { contractId: number | string; lucro: number; status: "won" | "lost" }) => void;
    /** Chamado sempre que o estado do martingale muda */
    onMartingaleChange?: (state: MartingaleState) => void;
}

/**
 * useBugDeriv — Conecta ao servidor de sinais VPS e repassa sinais para a UI.
 *
 * NOTA: Nesta versão, o hook NÃO executa ordens. Toda execução é feita
 * pelo DerivEngine Python rodando na VPS. O hook apenas:
 *   1. Recebe sinais do broadcaster (ws_pool → broadcaster → frontend)
 *   2. Atualiza a UI com os callbacks fornecidos
 *   3. Mantém estado de MartingaleState para exibição (sem executar nada)
 */
export function useBugDeriv(_derivAPI: any, config: BugDerivConfig): void {
    const wsRef = useRef<WebSocket | null>(null);
    const configRef = useRef(config);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const isMounted = useRef(true);

    // ── Estado do Martingale (apenas para UI) ─────────────────────────────────
    // O backend executa a lógica real; aqui só mostramos o estado.
    const galeLevel = useRef<number>(0);
    const consecutiveLosses = useRef<number>(0);
    const consecutiveWins = useRef<number>(0);
    const streakPauseUntil = useRef<number>(0);

    // Mantém configRef atualizado sem recriar conexão
    useEffect(() => {
        configRef.current = config;
    }, [config]);

    // ── Notifica UI sobre estado do martingale ────────────────────────────────
    const notificarMartingale = useCallback(() => {
        const cfg = configRef.current;
        const stake = cfg.stake;
        const state: MartingaleState = {
            level: galeLevel.current,
            currentStake: stake,
            consecutiveLosses: consecutiveLosses.current,
            isPaused: Date.now() < streakPauseUntil.current,
        };
        cfg.onMartingaleChange?.(state);
    }, []);

    // ── Atualiza estado de martingale para exibição (sem executar ordens) ─────
    const processarResultadoUI = useCallback((isWin: boolean, lucro: number) => {
        const cfg = configRef.current;
        const maxG = cfg.maxGale ?? 3;

        if (isWin) {
            galeLevel.current = 0;
            consecutiveLosses.current = 0;
            if (cfg.useSoros) {
                consecutiveWins.current++;
                if (consecutiveWins.current > (cfg.sorosLevels ?? 2)) {
                    consecutiveWins.current = 0;
                }
            }
        } else {
            consecutiveWins.current = 0;
            consecutiveLosses.current++;
            if (cfg.useMartingale && galeLevel.current < maxG) {
                galeLevel.current++;
            } else {
                galeLevel.current = 0;
            }
            if (consecutiveLosses.current >= 3) {
                streakPauseUntil.current = Date.now() + 60_000;
                consecutiveLosses.current = 0;
                galeLevel.current = 0;
            }
        }
        notificarMartingale();
    }, [notificarMartingale]);

    // ── Conexão WebSocket ao VPS (signal broadcaster) ────────────────────────
    const conectar = useCallback(() => {
        if (!isMounted.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const rawUrl = configRef.current.vpsUrl;
        const url = (typeof window !== "undefined" && window.location.protocol === "https:")
            ? rawUrl.replace(/^ws:\/\//, "wss://")
            : rawUrl;

        console.log("[BugDeriv] Conectando ao VPS broadcaster:", url);

        let socket: WebSocket;
        try {
            socket = new WebSocket(url);
        } catch (err: any) {
            const msg = `Não foi possível conectar ao VPS (${url}): ${err?.message ?? err}`;
            configRef.current.onErro?.(msg);
            timeoutRef.current = setTimeout(conectar, 10000);
            return;
        }
        wsRef.current = socket;

        socket.onopen = () => {
            if (isMounted.current) {
                console.log("[BugDeriv] ✅ Conectado ao VPS broadcaster:", url);
                configRef.current.onConectado?.();
            }
        };

        socket.onmessage = (event: MessageEvent) => {
            if (!isMounted.current) return;
            if (!configRef.current.enabled) return;

            try {
                const sinal: BugDerivSignal = JSON.parse(event.data as string);
                if (!sinal.entrar) return;

                console.log("[BugDeriv] 📡 Sinal recebido do VPS:", {
                    ativo: sinal.ativo,
                    digito: sinal.digito,
                    confidence: sinal.confidence,
                });

                // Notifica a UI sobre o sinal
                configRef.current.onSinal?.(sinal);

                // Notifica que uma "compra" aconteceu (o backend executa — aqui é apenas informativo)
                // O backend Python envia o sinal quando está executando, então o sinal = contrato sendo executado
                configRef.current.onCompra?.(sinal.ts);

            } catch (err) {
                console.error("[BugDeriv] Erro ao processar mensagem:", err);
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
    }, []);

    // ── Inicialização ─────────────────────────────────────────────────────────
    useEffect(() => {
        isMounted.current = true;
        conectar();

        console.log(
            `[BugDeriv] 🚀 Hook VPS BACKEND MODE — ` +
            `Execução de ordens: Python VPS | ` +
            `Martingale UI: ${config.useMartingale ? "ON" : "OFF"}`
        );

        return () => {
            isMounted.current = false;
            if (wsRef.current) wsRef.current.close();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [conectar]);
}

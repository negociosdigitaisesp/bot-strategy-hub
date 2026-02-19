// src/hooks/useBugDeriv.ts
//
// ─── DIAGNÓSTICO (2026-02-18) ─────────────────────────────────────────────────
// PADRÃO ENCONTRADO: CENÁRIO A — api.send retorna Promise diretamente.
//
// DerivContext.tsx expõe o objeto `api` com:
//   api.send(payload: object): Promise<any>
//   api.onMessage(callback): () => void (unsubscribe)
//
// O req_id é injetado automaticamente pelo DerivContext (reqIdCounter), e
// as respostas são resolvidas via Map de pendingRequests.
//
// PROBLEMAS CORRIGIDOS:
//   1. Fluxo de compra: proposal → captura id → buy com id real
//   2. Campo `enabled` adicionado para que o botão ACTIVAR controle execução
//   3. Logs de debug em cada etapa crítica
//   4. Callback onErro para exibir erros na UI
//   5. Tratamento robusto de erros da API Deriv
//
// VPS STATUS: ws://191.252.182.208:8000 — sinais chegando normalmente
// O VPS emite sinais com: { entrar: true, tipo: "DIGITDIFF", ativo, digito, ev, percentil, rtt, ts }
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
}

export interface BugDerivConfig {
    /** Valor do stake em USD */
    stake: number;
    /** URL WebSocket do VPS, ex: "ws://191.252.182.208:8000" */
    vpsUrl: string;
    /**
     * Controla se o bot deve executar operações reais.
     * Quando false, sinais são recebidos mas NENHUMA ordem é enviada à Deriv.
     */
    enabled: boolean;
    /** Chamado quando um sinal válido é recebido (antes de executar) */
    onSinal?: (sinal: BugDerivSignal) => void;
    /** Chamado quando a conexão com o VPS é estabelecida */
    onConectado?: () => void;
    /** Chamado quando a conexão com o VPS é perdida */
    onDesconectado?: () => void;
    /** Chamado quando ocorre um erro na execução (proposal ou buy) */
    onErro?: (msg: string) => void;
    /** Chamado quando um contrato é comprado com sucesso */
    onCompra?: (contractId: number | string) => void;
    /** Chamado quando um contrato fecha (win/loss) */
    onResultado?: (resultado: { contractId: number | string, lucro: number, status: "won" | "lost" }) => void;
}

/**
 * useBugDeriv — conecta ao servidor de sinais VPS e executa contratos.
 *
 * @param derivAPI  Objeto api do DerivContext (pode ser null se não conectado)
 * @param config    Configuração de stake, URL, enabled e callbacks
 */
export function useBugDeriv(derivAPI: any, config: BugDerivConfig): void {
    const wsRef = useRef<WebSocket | null>(null);
    const configRef = useRef(config);
    const apiRef = useRef(derivAPI);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const isMounted = useRef(true);
    // Evita múltiplas execuções simultâneas (debounce por sinal)
    const executingRef = useRef(false);
    // Cooldown entre trades
    const lastTradeRef = useRef<number>(0);
    // Contratos ativos para monitorar resultado
    const activeContracts = useRef<Set<number | string>>(new Set());

    // Mantém refs atualizados com os valores mais recentes
    useEffect(() => {
        configRef.current = config;
        apiRef.current = derivAPI;
    }, [config, derivAPI]);

    const conectar = useCallback(() => {
        // Evita conexões se desmontado ou já conectado
        if (!isMounted.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        // Auto-upgrade to wss:// when served over HTTPS to avoid Mixed Content block
        const rawUrl = configRef.current.vpsUrl;
        const url = (typeof window !== "undefined" && window.location.protocol === "https:")
            ? rawUrl.replace(/^ws:\/\//, "wss://")
            : rawUrl;

        console.log("[BugDeriv] Conectando ao VPS:", url);

        let socket: WebSocket;
        try {
            socket = new WebSocket(url);
        } catch (err: any) {
            const msg = `Não foi possível conectar ao VPS (${url}): ${err?.message ?? err}. O servidor VPS precisa de SSL (wss://) para funcionar em HTTPS.`;
            console.error("[BugDeriv] ❌ Erro ao criar WebSocket:", err);
            configRef.current.onErro?.(msg);
            // Retry after 10s to avoid spamming
            timeoutRef.current = setTimeout(conectar, 10000);
            return;
        }
        wsRef.current = socket;

        socket.onopen = () => {
            if (isMounted.current) {
                console.log("[BugDeriv] ✅ Conectado ao VPS:", url);
                configRef.current.onConectado?.();
            }
        };

        socket.onmessage = async (event: MessageEvent) => {
            if (!isMounted.current) return;

            // ── GUARD: execução somente quando o bot está ativo ──────────────
            if (!configRef.current.enabled) {
                // Log apenas 1 vez a cada 10s para não poluir o console
                return;
            }

            // Evita execuções paralelas do mesmo sinal
            if (executingRef.current) {
                console.log("[BugDeriv] Sinal ignorado - ainda executando sinal anterior");
                return;
            }

            try {
                const sinal: BugDerivSignal = JSON.parse(event.data as string);

                if (!sinal.entrar) return;

                console.log("[BugDeriv] 📡 Sinal recebido:", sinal);

                // Avisa o componente pai sobre o sinal (para UI)
                configRef.current.onSinal?.(sinal);

                const api = apiRef.current;
                const stake = configRef.current.stake;

                console.log(
                    "[BugDeriv] API disponível:", !!api,
                    "tipo:", api ? typeof api : "null",
                    "métodos:", api ? Object.keys(api) : []
                );

                if (!api?.send) {
                    const msg = "API Deriv não disponível — conecte sua conta Deriv primeiro";
                    console.warn("[BugDeriv] ⚠️", msg);
                    configRef.current.onErro?.(msg);
                    return;
                }

                // ── COOLDOWN CHECK ─────────────────────────────────────────────
                const COOLDOWN_MS = 4000; // 4 segundos mínimo entre trades
                const agora = Date.now();
                if (agora - lastTradeRef.current < COOLDOWN_MS) {
                    console.log(`[BugDeriv] ⏳ Cooldown ativo — aguardando ${(COOLDOWN_MS - (agora - lastTradeRef.current))}ms`);
                    return;
                }

                executingRef.current = true;
                lastTradeRef.current = agora;

                try {
                    // ── ETAPA 1: PROPOSAL ─────────────────────────────────────────
                    const proposalPayload = {
                        proposal: 1,
                        contract_type: sinal.tipo,   // "DIGITDIFF"
                        symbol: sinal.ativo,          // ex: "R_10"
                        duration: 1,
                        duration_unit: "t",
                        barrier: String(sinal.digito),
                        currency: "USD",
                        basis: "stake",
                        amount: stake,
                    };

                    console.log("[BugDeriv] 📤 Enviando proposal:", proposalPayload);

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

                    // Verificar erro na resposta
                    if (proposalResp?.error) {
                        const msg = `Proposal rejeitado: ${proposalResp.error.message || proposalResp.error.code}`;
                        console.error("[BugDeriv] ❌", msg, proposalResp.error);
                        configRef.current.onErro?.(msg);
                        return;
                    }

                    // Extrair proposal_id — Deriv retorna em proposal.id
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
                        price: stake,
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
    }, []); // Dependências vazias para garantir estabilidade da função

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
                        const status = lucro >= 0 ? "won" : "lost";
                        console.log(`[BugDeriv] 🏁 Contrato fechado: ${status} (${lucro})`);

                        configRef.current.onResultado?.({ contractId, lucro, status });
                        activeContracts.current.delete(contractId);
                    }
                } catch (err) {
                    console.error(`[BugDeriv] Erro ao checar contrato ${contractId}:`, err);
                }
            }
        }, 1500); // Polling a cada 1.5s

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        isMounted.current = true;
        conectar();

        return () => {
            isMounted.current = false;
            if (wsRef.current) wsRef.current.close();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [conectar]);
}

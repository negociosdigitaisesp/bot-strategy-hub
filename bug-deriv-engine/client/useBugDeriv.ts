// client/useBugDeriv.ts
// Hook React que conecta ao servidor VPS, recebe sinais e executa contratos
// via a API Deriv do próprio cliente (cada usuário usa sua conta).
//
// Reconecta automaticamente se a conexão cair (backoff de 3s).

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

export interface ClientConfig {
    /** Valor do stake em USD */
    stake: number;
    /** URL WebSocket do VPS, ex: "ws://191.252.182.208:8000" */
    vpsUrl: string;
    /** Chamado quando um sinal válido é recebido (antes de executar) */
    onSinal?: (sinal: BugDerivSignal) => void;
    /** Chamado quando a conexão com o VPS é estabelecida */
    onConectado?: () => void;
    /** Chamado quando a conexão com o VPS é perdida */
    onDesconectado?: () => void;
}

/**
 * useBugDeriv — conecta ao servidor de sinais VPS e executa contratos.
 *
 * @param derivAPI  Instância da Deriv API do cliente (já autenticada)
 * @param config    Configuração de stake, URL e callbacks
 *
 * @example
 * const derivAPI = useDerivAPI(); // seu hook de autenticação
 * useBugDeriv(derivAPI, {
 *   stake: 1,
 *   vpsUrl: "ws://191.252.182.208:8000",
 *   onSinal: (s) => console.log("Sinal recebido:", s),
 *   onConectado: () => setStatus("conectado"),
 *   onDesconectado: () => setStatus("desconectado"),
 * });
 */
export function useBugDeriv(derivAPI: any, config: ClientConfig): void {
    const ws = useRef<WebSocket | null>(null);
    const ativo = useRef<boolean>(true);

    const conectar = useCallback(() => {
        if (!ativo.current) return;

        const socket = new WebSocket(config.vpsUrl);
        ws.current = socket;

        socket.onopen = () => {
            config.onConectado?.();
        };

        socket.onmessage = async (event: MessageEvent) => {
            try {
                const sinal: BugDerivSignal = JSON.parse(event.data as string);

                // Filtro de segurança — só processa sinais positivos
                if (!sinal.entrar) return;

                // Notifica o componente antes de executar
                config.onSinal?.(sinal);

                // Executa contrato na conta Deriv do cliente
                await derivAPI.send({
                    buy: "1",
                    price: config.stake,
                    parameters: {
                        contract_type: sinal.tipo,
                        symbol: sinal.ativo,
                        duration: 1,
                        duration_unit: "t",
                        barrier: String(sinal.digito),
                        currency: "USD",
                        basis: "stake",
                        amount: config.stake,
                    },
                });
            } catch (err) {
                console.error("[BugDeriv] Erro ao executar sinal:", err);
            }
        };

        socket.onclose = () => {
            config.onDesconectado?.();
            // Reconecta após 3s se o hook ainda estiver montado
            if (ativo.current) {
                setTimeout(conectar, 3000);
            }
        };

        socket.onerror = () => {
            // onclose será chamado logo após — deixa o retry lá
            socket.close();
        };
    }, [config, derivAPI]);

    useEffect(() => {
        ativo.current = true;
        conectar();

        return () => {
            ativo.current = false;
            ws.current?.close();
        };
    }, [conectar]);
}

/**
 * EXEMPLO DE INTEGRAÇÃO: SessionResultModal
 * 
 * Este arquivo demonstra como integrar o sistema de modais de encerramento
 * de sessão em qualquer bot da plataforma.
 * 
 * Copie este padrão para seus componentes de bot (BugDeriv, BotSX, etc.)
 */

import React, { useState, useEffect } from 'react';
import { useRiskSystem } from '../hooks/useRiskSystem';
import { useCooldown } from '../hooks/useCooldown';
import { SessionResultModal } from '../components/SessionResultModal';

export const BotWithSessionModals = () => {
    // Estados do bot
    const [isRunning, setIsRunning] = useState(false);
    const [sessionProfit, setSessionProfit] = useState(0);

    // Sistema de risco
    const { checkSafetyLock, settings } = useRiskSystem();

    // Cooldown após Stop Loss
    const { isCooldown, remainingSeconds, startCooldown } = useCooldown('my_bot');

    // Modal de resultado
    const [showResultModal, setShowResultModal] = useState(false);
    const [modalType, setModalType] = useState<'take_profit' | 'stop_loss'>('take_profit');
    const [modalAmount, setModalAmount] = useState(0);

    // ============================================
    // VERIFICAÇÃO AUTOMÁTICA DE LIMITES
    // ============================================
    useEffect(() => {
        if (!isRunning) return;

        const safetyCheck = checkSafetyLock(sessionProfit);

        if (!safetyCheck.allowed && safetyCheck.triggerType) {
            console.log(`[Bot] 🚨 Limite atingido: ${safetyCheck.triggerType}`);

            // Parar o bot imediatamente
            setIsRunning(false);

            // Configurar e abrir modal
            setModalType(safetyCheck.triggerType);
            setModalAmount(Math.abs(sessionProfit));
            setShowResultModal(true);
        }
    }, [sessionProfit, isRunning, checkSafetyLock]);

    // ============================================
    // HANDLERS DO MODAL
    // ============================================

    const handleModalAccept = () => {
        console.log(`[Bot] ✅ Usuário aceitou: ${modalType}`);

        // Se foi Stop Loss, iniciar cooldown de 60s
        if (modalType === 'stop_loss') {
            startCooldown(60);
            console.log('[Bot] ❄️ Cooldown de 60s iniciado');
        }

        // Fechar modal
        setShowResultModal(false);

        // Resetar sessão (opcional)
        setSessionProfit(0);
    };

    const handleModalContinue = () => {
        console.log('[Bot] ⚠️ Usuário escolheu continuar (RISCO)');

        // Fechar modal e permitir continuar
        setShowResultModal(false);
        setIsRunning(true);
    };

    const handleModalClose = () => {
        // Modal tem backdrop static, mas caso precise fechar
        setShowResultModal(false);
    };

    // ============================================
    // CONTROLE DO BOT
    // ============================================

    const handleStartBot = () => {
        if (isCooldown) {
            console.log('[Bot] ❄️ Bot em cooldown, não pode iniciar');
            return;
        }

        setIsRunning(true);
        console.log('[Bot] ▶️ Bot iniciado');
    };

    const handleStopBot = () => {
        setIsRunning(false);
        console.log('[Bot] ⏸️ Bot parado manualmente');
    };

    // ============================================
    // SIMULAÇÃO DE OPERAÇÕES (para teste)
    // ============================================

    const simulateWin = () => {
        setSessionProfit(prev => prev + 10);
    };

    const simulateLoss = () => {
        setSessionProfit(prev => prev - 10);
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="container max-w-4xl mx-auto p-8">
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h1 className="text-2xl font-bold">Bot com Session Modals</h1>

                {/* Status */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="text-lg font-bold">
                            {isRunning ? '🟢 Rodando' : '🔴 Parado'}
                        </div>
                    </div>

                    <div className="bg-background p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">Lucro da Sessão</div>
                        <div className={`text-lg font-mono font-bold ${sessionProfit >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                            {sessionProfit >= 0 ? '+' : ''}${sessionProfit.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-background p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">Cooldown</div>
                        <div className="text-lg font-bold">
                            {isCooldown ? `❄️ ${remainingSeconds}s` : '✅ Pronto'}
                        </div>
                    </div>
                </div>

                {/* Limites Configurados */}
                {settings && (
                    <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="text-sm font-medium mb-2">Limites Configurados:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>🎯 Take Profit: <span className="font-mono">${settings.global_take_profit}</span></div>
                            <div>🛑 Stop Loss: <span className="font-mono">${settings.global_stop_loss}</span></div>
                        </div>
                    </div>
                )}

                {/* Controles */}
                <div className="flex gap-3">
                    <button
                        onClick={handleStartBot}
                        disabled={isRunning || isCooldown}
                        className="flex-1 py-3 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground text-white font-bold transition-colors"
                    >
                        {isCooldown
                            ? `❄️ Enfriando Mente (${remainingSeconds}s)...`
                            : isRunning
                                ? 'Bot Rodando...'
                                : '▶️ INICIAR BOT'
                        }
                    </button>

                    <button
                        onClick={handleStopBot}
                        disabled={!isRunning}
                        className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-muted disabled:text-muted-foreground text-white font-bold transition-colors"
                    >
                        ⏸️ PARAR
                    </button>
                </div>

                {/* Simulação (apenas para teste) */}
                <div className="border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground mb-2">Simulação (para teste):</div>
                    <div className="flex gap-2">
                        <button
                            onClick={simulateWin}
                            className="px-4 py-2 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm"
                        >
                            + $10 (Win)
                        </button>
                        <button
                            onClick={simulateLoss}
                            className="px-4 py-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm"
                        >
                            - $10 (Loss)
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Resultado */}
            <SessionResultModal
                isOpen={showResultModal}
                type={modalType}
                amount={modalAmount}
                onClose={handleModalClose}
                onAccept={handleModalAccept}
                onContinue={modalType === 'take_profit' ? handleModalContinue : undefined}
            />
        </div>
    );
};

export default BotWithSessionModals;

import React from 'react';
import { AccuBlitzPanel } from '../components/bots/AccuBlitzPanel';

/**
 * PÁGINA DE TESTES OCULTA
 * Acesse via: /test-accu
 * 
 * Esta página é usada para testar o fix do Take Profit automático
 * para contratos Accumulators usando a API contract_update.
 */
const TestAccuPage = () => {
    return (
        <div className="min-h-screen bg-background">
            <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400 text-center">
                ⚠️ PÁGINA DE TESTES - Use conta DEMO da Deriv
            </div>
            <AccuBlitzPanel
                isActive={true}
                onToggle={() => { }}
                onBack={() => { }}
            />
        </div>
    );
};

export default TestAccuPage;

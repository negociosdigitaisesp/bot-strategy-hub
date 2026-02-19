import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface AccountNumberDisplayProps {
    accountNumber: string;
    className?: string;
    iconSize?: number;
    showToggle?: boolean;
}

/**
 * Componente para exibir número de conta com opção de ocultar/mostrar
 * Usa localStorage para persistir preferência do usuário
 */
export const AccountNumberDisplay: React.FC<AccountNumberDisplayProps> = ({
    accountNumber,
    className = '',
    iconSize = 14,
    showToggle = true,
}) => {
    const [isVisible, setIsVisible] = useState(() => {
        // Carregar preferência do localStorage
        const saved = localStorage.getItem('show_account_numbers');
        return saved === 'true';
    });

    const toggleVisibility = () => {
        const newValue = !isVisible;
        setIsVisible(newValue);
        // Salvar preferência
        localStorage.setItem('show_account_numbers', newValue.toString());
    };

    const maskAccountNumber = (number: string): string => {
        if (!number || number.length < 4) return '••••••••';

        // Mostrar apenas os últimos 4 dígitos
        const lastFour = number.slice(-4);
        const masked = '••••' + lastFour;
        return masked;
    };

    return (
        <div className={cn('inline-flex items-center gap-2', className)}>
            <span className="font-mono">
                {isVisible ? accountNumber : maskAccountNumber(accountNumber)}
            </span>

            {showToggle && (
                <span
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleVisibility(); } }}
                    className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                    title={isVisible ? 'Ocultar número da conta' : 'Mostrar número da conta'}
                >
                    {isVisible ? (
                        <Eye size={iconSize} className="text-slate-400 hover:text-slate-300" />
                    ) : (
                        <EyeOff size={iconSize} className="text-slate-400 hover:text-slate-300" />
                    )}
                </span>
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableBalance: number;
    onSuccess: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
    isOpen,
    onClose,
    availableBalance,
    onSuccess,
}) => {
    const [walletAddress, setWalletAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!walletAddress || walletAddress.length < 20) {
            toast.error('Por favor ingresa una dirección de billetera válida');
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            // Insert withdrawal request
            const { error: insertError } = await supabase
                .from('withdrawals')
                .insert({
                    user_id: user.id,
                    amount: availableBalance,
                    wallet_address: walletAddress,
                    network: 'TRC20',
                    status: 'pending',
                });

            if (insertError) throw insertError;

            // Deduct balance (optimistic update - will be rolled back if rejected)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ affiliate_balance: 0 })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast.success('¡Solicitud de retiro enviada! Procesaremos tu pago en 24h.');
            setWalletAddress('');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error submitting withdrawal:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
                    >
                        {/* Glows */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                        <Wallet className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Retirar Comisiones</h3>
                                        <p className="text-sm text-slate-400">Red TRC20 (USDT)</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Amount Display */}
                            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                                <p className="text-sm text-emerald-400 mb-1">Monto a Retirar</p>
                                <p className="text-3xl font-bold text-white font-mono">
                                    ${availableBalance.toFixed(2)} <span className="text-lg text-slate-400">USDT</span>
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Dirección de Billetera (TRC20)
                                    </label>
                                    <input
                                        type="text"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                        placeholder="T..."
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        ⚠️ Verifica que sea la red correcta (TRC20 - Tron)
                                    </p>
                                </div>

                                {/* Warning */}
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-200">
                                        <p className="font-semibold mb-1">Importante</p>
                                        <ul className="space-y-1 text-xs text-amber-300/80">
                                            <li>• Verifica tu dirección cuidadosamente</li>
                                            <li>• Los pagos se procesan en 24h</li>
                                            <li>• Red TRC20 (Tron) únicamente</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !walletAddress}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} />
                                            Confirmar Retiro
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

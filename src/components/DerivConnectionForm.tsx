import React, { useState, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { Shield, Key, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, LogOut, Zap, Lock, Link2, Gamepad2, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { AffiliateModal } from './AffiliateModal';
import { SmartHelpTrigger } from './SmartHelpTrigger';
import { AccountNumberDisplay } from './AccountNumberDisplay';
import { motion, AnimatePresence } from 'framer-motion';

// Fake Checkbox UI Component for visual guide
const FakeCheckbox = ({ checked, label, highlight }: { checked: boolean; label: string; highlight?: boolean }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-lg border border-white/10">
        <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            checked
                ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                : "border-gray-500 bg-transparent"
        )}>
            {checked && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )}
        </div>
        <span className={cn(
            "text-sm font-medium transition-colors",
            highlight ? "text-amber-400 font-bold" : "text-white/80"
        )}>
            {label}
        </span>
    </div>
);

// Step Card Component
const StepCard = ({
    stepNumber,
    title,
    description,
    children,
    accentColor = "cyan"
}: {
    stepNumber: number;
    title: string;
    description: string;
    children?: React.ReactNode;
    accentColor?: "cyan" | "amber" | "emerald";
}) => {
    const colorClasses = {
        cyan: {
            bg: "bg-cyan-500/5",
            border: "border-cyan-500/20",
            number: "text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]",
            numberBg: "bg-cyan-500/20 border-cyan-500/30",
            title: "text-cyan-400"
        },
        amber: {
            bg: "bg-amber-500/5",
            border: "border-amber-500/20",
            number: "text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]",
            numberBg: "bg-amber-500/20 border-amber-500/30",
            title: "text-amber-400"
        },
        emerald: {
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/20",
            number: "text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
            numberBg: "bg-emerald-500/20 border-emerald-500/30",
            title: "text-emerald-400"
        }
    };

    const colors = colorClasses[accentColor];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: stepNumber * 0.1 }}
            className={cn(
                "relative p-4 rounded-xl border backdrop-blur-sm",
                colors.bg, colors.border
            )}
        >
            {/* Step Number Badge */}
            <div className={cn(
                "absolute -top-3 -left-2 w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-lg",
                colors.numberBg, colors.number
            )}>
                {stepNumber}
            </div>

            <div className="ml-4">
                <h4 className={cn("font-bold text-sm mb-1", colors.title)}>{title}</h4>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{description}</p>
                {children}
            </div>
        </motion.div>
    );
};

interface LastConnectedAccount {
    loginid: string;
    token: string;
    timestamp: number;
}

export const DerivConnectionForm = () => {
    const { isConnected, isConnecting, connect, disconnect, lastError, account } = useDeriv();
    const [inputToken, setInputToken] = useState('');
    const [showAffiliateModal, setShowAffiliateModal] = useState(false);
    const [lastConnected, setLastConnected] = useState<LastConnectedAccount | null>(null);

    // Load last connected account from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('deriv_last_connected');
            if (stored) {
                setLastConnected(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading last connected account:', error);
        }
    }, []);

    // Save last connected account when successfully connected
    useEffect(() => {
        if (isConnected && account) {
            const savedAccountsStr = localStorage.getItem('deriv_saved_accounts');
            if (savedAccountsStr) {
                try {
                    const savedAccounts = JSON.parse(savedAccountsStr);
                    const currentAccount = savedAccounts.find((acc: any) => acc.loginid === account.loginid);
                    if (currentAccount) {
                        const lastConnectedData: LastConnectedAccount = {
                            loginid: account.loginid,
                            token: currentAccount.token,
                            timestamp: Date.now()
                        };
                        localStorage.setItem('deriv_last_connected', JSON.stringify(lastConnectedData));
                        setLastConnected(lastConnectedData);
                    }
                } catch (error) {
                    console.error('Error saving last connected account:', error);
                }
            }
        }
    }, [isConnected, account]);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputToken.trim()) return;
        await connect(inputToken.trim());
    };

    const handleQuickReconnect = async () => {
        if (lastConnected?.token) {
            await connect(lastConnected.token);
        }
    };

    const handleConfigClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowAffiliateModal(true);
    };

    // Connected State - Clean Display
    if (isConnected && account) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 sm:p-6 shadow-lg backdrop-blur-sm"
            >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-emerald-400 leading-tight">Conectado con Éxito</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground opacity-80">Su cuenta Deriv está activa y vinculada.</p>
                        </div>
                    </div>
                    <button
                        onClick={disconnect}
                        className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-red-400 hover:text-red-300 transition-all px-4 py-2 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/10 hover:border-red-500/30 w-full sm:w-auto"
                        title="Cerrar sesión y usar otra cuenta"
                    >
                        <LogOut size={16} />
                        Desconectar
                    </button>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-background/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1 font-bold">ID de Inicio de Sesión</span>
                        <AccountNumberDisplay
                            accountNumber={account.loginid}
                            className="font-bold text-white text-sm sm:text-base"
                            iconSize={16}
                        />
                    </div>
                    <div className="bg-background/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1 font-bold">Saldo Actual</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                            {account.currency} {parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    {account.fullname && (
                        <div className="bg-background/40 p-4 rounded-xl border border-white/5 backdrop-blur-md sm:col-span-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1 font-bold">Nombre del Titular</span>
                            <span className="font-bold text-white text-sm sm:text-base">{account.fullname}</span>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // Disconnected State - Show Wizard Guide
    return (
        <div className="border rounded-2xl shadow-xl overflow-hidden bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border-white/10">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-transparent to-emerald-500/10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <Shield className="text-cyan-400" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Conexión Deriv API</h2>
                </div>
                <p className="text-gray-400 text-sm">
                    Siga estos 3 pasos para conectar su cuenta de trading de forma segura.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Last Connected Account - Quick Reconnect */}
                {lastConnected && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 shadow-lg"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    {lastConnected.loginid.startsWith('CR') ? (
                                        <DollarSign size={20} className="text-emerald-400" />
                                    ) : (
                                        <Gamepad2 size={20} className="text-cyan-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-0.5">
                                        Última Cuenta Conectada
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <AccountNumberDisplay
                                            accountNumber={lastConnected.loginid}
                                            className="font-mono font-bold text-white text-sm"
                                            iconSize={14}
                                            showToggle={false}
                                        />
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                            lastConnected.loginid.startsWith('CR')
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                        )}>
                                            {lastConnected.loginid.startsWith('CR') ? 'REAL' : 'DEMO'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleQuickReconnect}
                                disabled={isConnecting}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap",
                                    isConnecting
                                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                                )}
                            >
                                {isConnecting ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={16} />
                                        Reconectar Rápido
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ===== 3-STEP WIZARD GUIDE ===== */}
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-5"
                    >
                        {/* PASO 1: Optimización - Cuenta Afiliado */}
                        <StepCard
                            stepNumber={1}
                            title="Cuenta Sincronizada (Anti-Delay)"
                            description="Para evitar atrasos en la ejecución, use una cuenta creada por nuestro enlace optimizado."
                            accentColor="cyan"
                        >
                            <a
                                href="https://deriv.com/es?referrer=&t=TRCjAn8FEcUivlVU8hndU2Nd7ZgqdRLk&utm_campaign=MyAffiliates&utm_content=&utm_medium=affiliate&utm_source=affiliate_223442"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-300 hover:text-cyan-200 font-bold text-xs uppercase tracking-wide transition-all duration-300 group shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_25px_rgba(34,211,238,0.2)]"
                            >
                                <Zap size={14} className="text-emerald-400" />
                                🔗 Crear Cuenta HFT
                                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </a>
                        </StepCard>

                        {/* PASO 2: Permisos - El Error Común */}
                        <StepCard
                            stepNumber={2}
                            title="Generar Token de Acceso"
                            description="En Seguridad > API Token, cree un token marcando EXACTAMENTE estas opciones:"
                            accentColor="amber"
                        >
                            {/* Visual: Fake Checkboxes */}
                            <div className="mb-4 p-3 rounded-xl bg-black/30 border border-white/5">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">
                                    ⚠️ Permisos Obligatorios
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <FakeCheckbox checked={true} label="Leer (Read)" highlight={true} />
                                    <FakeCheckbox checked={true} label="Operar (Trade)" highlight={true} />
                                </div>
                                <p className="text-[10px] text-amber-400/70 mt-2 flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    Sin estos permisos, el bot NO podrá operar.
                                </p>
                            </div>

                            <a
                                href="https://app.deriv.com/account/api-token"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 hover:border-amber-400/50 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wide transition-all duration-300 group shadow-[0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]"
                            >
                                <Lock size={14} />
                                Ir a Deriv API Token
                                <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </a>
                        </StepCard>

                        {/* PASO 3: Conexión */}
                        <StepCard
                            stepNumber={3}
                            title="Validar Acceso"
                            description="Pegue su token API generado en el paso anterior y conecte su cuenta."
                            accentColor="emerald"
                        >
                            <form onSubmit={handleConnect} className="space-y-3">
                                <div className="relative">
                                    <input
                                        id="api-token"
                                        type="password"
                                        value={inputToken}
                                        onChange={(e) => setInputToken(e.target.value)}
                                        placeholder="Pegue su Token API aquí..."
                                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg shadow-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)] pl-10 font-mono text-white placeholder:text-gray-500 transition-all"
                                        disabled={isConnecting}
                                    />
                                    <div className="absolute left-3 top-3.5 text-gray-500">
                                        <Key size={16} />
                                    </div>
                                </div>

                                {lastError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm"
                                    >
                                        <AlertCircle size={16} />
                                        {lastError}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!inputToken || isConnecting}
                                    className={cn(
                                        "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide",
                                        isConnecting
                                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                            : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                                    )}
                                >
                                    {isConnecting ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Conectando...
                                        </>
                                    ) : (
                                        <>
                                            <Link2 size={18} />
                                            Conectar Cuenta
                                        </>
                                    )}
                                </button>
                            </form>
                        </StepCard>
                    </motion.div>
                </AnimatePresence>

                {/* Security Notice */}
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                        <Shield size={14} /> Seguridad Garantizada
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Su token se almacena <strong className="text-white">únicamente</strong> en el localStorage de su navegador.
                        Nunca se envía a nuestros servidores. Solo usted tiene acceso a su cuenta en este dispositivo.
                    </p>
                </div>
            </div>

            <AffiliateModal
                isOpen={showAffiliateModal}
                onClose={() => setShowAffiliateModal(false)}
            />
        </div>
    );
};

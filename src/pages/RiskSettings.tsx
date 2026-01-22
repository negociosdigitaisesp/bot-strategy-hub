import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield,
    Rocket,
    Skull,
    Trophy,
    Loader2,
    CheckCircle2,
    Target,
    DollarSign,
    ChevronUp,
    ChevronDown,
    Sparkles,
    Brain,
    RotateCcw,
    Lock,
    Power,
    ArrowRight,
    Info,
    Zap,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { useDeriv } from '../contexts/DerivContext';
import { AccountSwitcher } from '../components/AccountSwitcher';
import RecentGainsTicker from '../components/RecentGainsTicker';
import { useNavigate } from 'react-router-dom';

// Types
type RiskProfile = 'blindaje' | 'cohete';

interface RiskSettings {
    risk_mode: RiskProfile;
    global_stop_loss: number;
    global_take_profit: number;
    soros_levels: number;
    base_stake: number;
    risk_enabled: boolean;
}

// Profile Configurations (% of balance)
const PROFILE_CONFIG = {
    blindaje: {
        stopLossPercent: 8,
        takeProfitPercent: 4,
        stakePercent: 0.5,
    },
    cohete: {
        stopLossPercent: 15,
        takeProfitPercent: 10,
        stakePercent: 1,
    }
};

const RiskSettingsPage = () => {
    const { user } = useAuth();
    const { account, isConnected } = useDeriv();
    const navigate = useNavigate();

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [totalBalance, setTotalBalance] = useState<string>('');
    const [selectedProfile, setSelectedProfile] = useState<RiskProfile>('blindaje');
    const [isEnabled, setIsEnabled] = useState(false);
    const [settings, setSettings] = useState<RiskSettings>({
        risk_mode: 'blindaje',
        global_stop_loss: 8,
        global_take_profit: 4,
        soros_levels: 3,
        base_stake: 0.5,
        risk_enabled: false
    });

    // Load user settings
    useEffect(() => {
        const loadSettings = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('risk_mode, global_stop_loss, global_take_profit, soros_levels, base_stake, risk_enabled')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error loading risk settings:', error);
                } else if (data) {
                    const mode = (data.risk_mode === 'soros' || data.risk_mode === 'cohete') ? 'cohete' : 'blindaje';
                    setSelectedProfile(mode);
                    setIsEnabled(data.risk_enabled ?? false);
                    setSettings({
                        risk_mode: mode,
                        global_stop_loss: data.global_stop_loss || 8,
                        global_take_profit: data.global_take_profit || 4,
                        soros_levels: data.soros_levels || 3,
                        base_stake: data.base_stake || 0.5,
                        risk_enabled: data.risk_enabled ?? false
                    });
                }
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [user]);

    // Auto-fill balance when connected
    useEffect(() => {
        if (isConnected && account?.balance) {
            setTotalBalance(account.balance.toString());
        }
    }, [isConnected, account]);

    // Auto-calculate when balance or profile changes
    useEffect(() => {
        const balance = parseFloat(totalBalance);
        if (!isNaN(balance) && balance > 0) {
            const config = PROFILE_CONFIG[selectedProfile];
            setSettings(prev => ({
                ...prev,
                risk_mode: selectedProfile,
                global_stop_loss: parseFloat((balance * config.stopLossPercent / 100).toFixed(2)),
                global_take_profit: parseFloat((balance * config.takeProfitPercent / 100).toFixed(2)),
                base_stake: parseFloat((balance * config.stakePercent / 100).toFixed(2)),
            }));
        }
    }, [totalBalance, selectedProfile]);

    // Toggle risk system
    const handleToggle = async () => {
        if (!user) return;

        const newEnabled = !isEnabled;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    risk_enabled: newEnabled,
                    // Also save current settings when enabling
                    ...(newEnabled && {
                        risk_mode: selectedProfile === 'cohete' ? 'soros' : 'fixed',
                        global_stop_loss: settings.global_stop_loss,
                        global_take_profit: settings.global_take_profit,
                        soros_levels: settings.soros_levels,
                        base_stake: settings.base_stake
                    })
                })
                .eq('id', user.id);

            if (error) throw error;

            setIsEnabled(newEnabled);

            if (newEnabled) {
                toast.success('🛡️ Guardián Activado', {
                    description: 'Todos los bots ahora obedecen tus reglas de riesgo.',
                    icon: <Shield className="text-emerald-500" />
                });
            } else {
                toast.info('⚠️ Guardián Desactivado', {
                    description: 'Los bots operarán sin límites de seguridad.',
                });
            }
        } catch (error: any) {
            console.error('Error toggling:', error);
            toast.error('Error al cambiar estado');
        }
    };

    // Save settings
    const handleSave = async () => {
        if (!user) {
            toast.error('Debe iniciar sesión para guardar');
            return;
        }

        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    risk_mode: selectedProfile === 'cohete' ? 'soros' : 'fixed',
                    global_stop_loss: settings.global_stop_loss,
                    global_take_profit: settings.global_take_profit,
                    soros_levels: settings.soros_levels,
                    base_stake: settings.base_stake,
                    risk_enabled: isEnabled
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('¡Configuración Guardada!', {
                description: 'Sus parámetros han sido sincronizados con todos los bots.',
                icon: <CheckCircle2 className="text-emerald-500" />
            });
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error('Error al guardar', {
                description: error.message
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Soros simulation calculation
    const sorosSimulation = useMemo(() => {
        const levels: { level: number; stake: number; profit: number; total: number }[] = [];
        let currentStake = settings.base_stake;
        let totalProfit = 0;

        for (let i = 1; i <= settings.soros_levels; i++) {
            const profit = currentStake * 0.9;
            totalProfit += profit;
            levels.push({ level: i, stake: currentStake, profit, total: totalProfit });
            currentStake = currentStake + profit;
        }

        return levels;
    }, [settings.base_stake, settings.soros_levels]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#08090C] flex items-center justify-center">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#08090C] text-white pt-16 pb-28 md:pt-8 md:pb-8 px-4 overflow-x-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-amber-500/[0.02] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-3">
                {/* Recent Gains Ticker */}
                <RecentGainsTicker className="mb-2 -mx-4" />

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                            <Shield className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                                Gestión de Riesgo
                            </h1>
                            <p className="text-[10px] text-cyan-400/60 font-mono tracking-widest uppercase">ROBO-ADVISOR v2.0</p>
                        </div>
                    </div>

                    <div className="w-full md:w-auto z-50">
                        <AccountSwitcher onAddAccount={() => navigate('/conectar-deriv')} />
                    </div>
                </header>

                <p className="text-sm text-white/40 max-w-md leading-relaxed pl-1 -mt-4 mb-4">
                    Configure y active la protección automática de su capital con inteligencia artificial.
                </p>

                {/* Master Toggle Card */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "relative overflow-hidden rounded-2xl border p-5 transition-all duration-500",
                        isEnabled
                            ? "bg-gradient-to-br from-emerald-950/30 to-cyan-950/20 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                            : "bg-white/[0.02] border-white/[0.08]"
                    )}
                >
                    {/* Scan Line Animation when enabled */}
                    {isEnabled && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-scan" />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-14 h-14 rounded-xl flex items-center justify-center transition-all",
                                isEnabled
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-white/5 text-white/30"
                            )}>
                                <Shield size={28} />
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-lg font-bold transition-colors",
                                    isEnabled ? "text-emerald-100" : "text-white/60"
                                )}>
                                    {isEnabled ? '🛡️ GUARDIÁN ACTIVO' : '⚠️ GUARDIÁN INACTIVO'}
                                </h2>
                                <p className="text-xs text-white/40 mt-0.5">
                                    {isEnabled
                                        ? 'Todos los bots obedecen sus reglas de riesgo'
                                        : 'Los bots operan sin límites de seguridad'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Toggle Button */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleToggle}
                            className={cn(
                                "relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none",
                                isEnabled
                                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                                    : "bg-white/10"
                            )}
                        >
                            <motion.div
                                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
                                animate={{ left: isEnabled ? 'calc(100% - 28px)' : '4px' }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                                <Power size={12} className={isEnabled ? "text-emerald-500" : "text-gray-400"} />
                            </motion.div>
                        </motion.button>
                    </div>

                    {/* Status Info */}
                    <AnimatePresence>
                        {isEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                                        <Skull size={16} className="mx-auto text-rose-400 mb-1" />
                                        <div className="text-xs text-white/40">Stop Loss</div>
                                        <div className="text-sm font-mono font-bold text-rose-300">-${settings.global_stop_loss.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                                        <Target size={16} className="mx-auto text-emerald-400 mb-1" />
                                        <div className="text-xs text-white/40">Meta</div>
                                        <div className="text-sm font-mono font-bold text-emerald-300">+${settings.global_take_profit.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                                        <DollarSign size={16} className="mx-auto text-cyan-400 mb-1" />
                                        <div className="text-xs text-white/40">Stake</div>
                                        <div className="text-sm font-mono font-bold text-cyan-300">${settings.base_stake.toFixed(2)}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                {/* Balance Input */}
                <section className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider">Calibración</span>
                    </div>

                    <label className="text-base font-bold text-white/90 block mb-2">
                        ¿Cuál es tu saldo total?
                    </label>
                    <p className="text-xs text-white/40 mb-4">
                        Ingresa tu capital disponible y la IA calculará automáticamente los límites óptimos según tu perfil de riesgo.
                    </p>

                    <div className="relative group">
                        <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/60 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                            type="number"
                            value={totalBalance}
                            onChange={(e) => setTotalBalance(e.target.value)}
                            placeholder="Ej: 100"
                            className="w-full bg-[#050608] border-2 border-cyan-500/20 rounded-xl py-3.5 pl-11 pr-16 text-xl font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">USD</span>
                    </div>
                </section>

                {/* Profile Selector */}
                <section>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-mono text-amber-400/80 uppercase tracking-wider">Perfil de Riesgo</span>
                    </div>
                    <p className="text-xs text-white/40 mb-4 px-1">
                        Selecciona cómo quieres que la IA administre tu capital durante las operaciones.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BLINDAJE */}
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedProfile('blindaje')}
                            className={cn(
                                "relative cursor-pointer overflow-hidden rounded-2xl p-5 border transition-all duration-300",
                                selectedProfile === 'blindaje'
                                    ? "bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                                    : "bg-white/[0.015] border-white/[0.05] active:bg-white/[0.03]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-colors",
                                    selectedProfile === 'blindaje' ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-white/40"
                                )}>
                                    <Shield size={22} />
                                </div>
                                {selectedProfile === 'blindaje' && (
                                    <CheckCircle2 className="text-cyan-400" size={20} />
                                )}
                            </div>

                            <h3 className={cn("text-lg font-bold mb-1", selectedProfile === 'blindaje' ? "text-cyan-100" : "text-white/60")}>
                                🛡️ BLINDAJE
                            </h3>
                            <p className="text-[11px] text-white/40 leading-relaxed mb-3">
                                Conservador. Protege tu capital con stakes fijos y límites ajustados.
                            </p>

                            <div className="space-y-1.5 text-[10px] font-mono text-cyan-400/70">
                                <div className="flex justify-between"><span>Stop Loss:</span><span className="text-white/60">8% del saldo</span></div>
                                <div className="flex justify-between"><span>Meta:</span><span className="text-white/60">4% del saldo</span></div>
                                <div className="flex justify-between"><span>Stake:</span><span className="text-white/60">0.5% del saldo</span></div>
                            </div>
                        </motion.div>

                        {/* COHETE */}
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedProfile('cohete')}
                            className={cn(
                                "relative cursor-pointer overflow-hidden rounded-2xl p-5 border transition-all duration-300",
                                selectedProfile === 'cohete'
                                    ? "bg-amber-950/20 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                                    : "bg-white/[0.015] border-white/[0.05] active:bg-white/[0.03]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-colors",
                                    selectedProfile === 'cohete' ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/40"
                                )}>
                                    <Rocket size={22} />
                                </div>
                                {selectedProfile === 'cohete' && (
                                    <CheckCircle2 className="text-amber-400" size={20} />
                                )}
                            </div>

                            <h3 className={cn("text-lg font-bold mb-1", selectedProfile === 'cohete' ? "text-amber-100" : "text-white/60")}>
                                🚀 COHETE
                            </h3>
                            <p className="text-[11px] text-white/40 leading-relaxed mb-3">
                                Agresivo (Soros). Reinvierte ganancias para crecimiento exponencial.
                            </p>

                            <div className="space-y-1.5 text-[10px] font-mono text-amber-400/70">
                                <div className="flex justify-between"><span>Stop Loss:</span><span className="text-white/60">15% del saldo</span></div>
                                <div className="flex justify-between"><span>Meta:</span><span className="text-white/60">10% del saldo</span></div>
                                <div className="flex justify-between"><span>Stake:</span><span className="text-white/60">1% del saldo</span></div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Fine Tuning */}
                <section className="bg-white/[0.015] border border-white/[0.08] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono text-emerald-400/80 uppercase tracking-wider">Ajuste Fino</span>
                        <span className="ml-auto text-[10px] text-white/30">Edición manual</span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                                <DollarSign size={11} /> Stake Inicial
                            </label>
                            <p className="text-[10px] text-white/30 mb-2">Monto base de cada operación</p>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50 font-mono">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.base_stake}
                                    onChange={(e) => setSettings(s => ({ ...s, base_stake: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-[#050608] border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-cyan-500/40"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-rose-500/60 uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                                    <Skull size={11} /> Stop Loss
                                </label>
                                <p className="text-[10px] text-white/30 mb-2">Pérdida máxima permitida</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/50 font-mono">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.global_stop_loss}
                                        onChange={(e) => setSettings(s => ({ ...s, global_stop_loss: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-[#050608] border border-rose-900/30 rounded-xl py-2.5 pl-8 pr-4 text-rose-300 font-mono focus:outline-none focus:border-rose-500/40"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-emerald-500/60 uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                                    <Target size={11} /> Meta Diaria
                                </label>
                                <p className="text-[10px] text-white/30 mb-2">Ganancia objetivo del día</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50 font-mono">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.global_take_profit}
                                        onChange={(e) => setSettings(s => ({ ...s, global_take_profit: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-[#050608] border border-emerald-900/30 rounded-xl py-2.5 pl-8 pr-4 text-emerald-300 font-mono focus:outline-none focus:border-emerald-500/40"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Soros Simulator */}
                <AnimatePresence>
                    {selectedProfile === 'cohete' && (
                        <motion.section
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-gradient-to-br from-amber-950/20 to-orange-950/10 border border-amber-500/20 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <Sparkles size={16} />
                                        <span className="font-bold text-sm">Simulador Soros</span>
                                    </div>
                                    <div className="px-2.5 py-1 bg-amber-500/10 rounded-full text-xs text-amber-400 font-mono border border-amber-500/20">
                                        {settings.soros_levels} Niveles
                                    </div>
                                </div>

                                <p className="text-[11px] text-white/40 mb-4">
                                    Visualiza cómo crecerá tu stake con cada victoria consecutiva.
                                </p>

                                {/* Slider */}
                                <div className="flex items-center gap-3 mb-4">
                                    <button
                                        onClick={() => setSettings(s => ({ ...s, soros_levels: Math.max(1, s.soros_levels - 1) }))}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 active:bg-amber-500/20 text-amber-400"
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                                            animate={{ width: `${(settings.soros_levels / 5) * 100}%` }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setSettings(s => ({ ...s, soros_levels: Math.min(5, s.soros_levels + 1) }))}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 active:bg-amber-500/20 text-amber-400"
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                </div>

                                {/* Chain */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                                    {sorosSimulation.map((step, idx) => (
                                        <React.Fragment key={idx}>
                                            <div className={cn(
                                                "flex-shrink-0 p-2.5 rounded-xl border text-center min-w-[70px]",
                                                idx === sorosSimulation.length - 1
                                                    ? "bg-amber-500/20 border-amber-500/40"
                                                    : "bg-white/[0.03] border-white/[0.08]"
                                            )}>
                                                <div className="text-[9px] text-white/40 mb-0.5">Nvl {step.level}</div>
                                                <div className={cn(
                                                    "text-sm font-mono font-bold",
                                                    idx === sorosSimulation.length - 1 ? "text-amber-400" : "text-white/70"
                                                )}>
                                                    ${step.stake.toFixed(2)}
                                                </div>
                                                <div className="text-[9px] text-emerald-400/70">+${step.profit.toFixed(2)}</div>
                                            </div>
                                            {idx < sorosSimulation.length - 1 && (
                                                <ArrowRight size={14} className="text-amber-500/40 flex-shrink-0" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <div className="flex-shrink-0 p-2.5 rounded-xl border border-dashed border-amber-500/30 text-center min-w-[70px]">
                                        <RotateCcw size={14} className="mx-auto text-amber-400/60 mb-0.5" />
                                        <div className="text-[9px] text-amber-400/60">RESET</div>
                                    </div>
                                </div>

                                <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                                    <span className="text-[11px] text-emerald-300/80">Lucro Potencial:</span>
                                    <span className="text-sm font-mono font-bold text-emerald-400">
                                        +${sorosSimulation[sorosSimulation.length - 1]?.total.toFixed(2) || '0.00'}
                                    </span>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* Info Box */}
                <div className="flex gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <Info className="flex-shrink-0 text-blue-400/60 mt-0.5" size={16} />
                    <div>
                        <h4 className="text-sm font-medium text-blue-300/80 mb-1">¿Cómo funciona?</h4>
                        <p className="text-[11px] text-blue-300/50 leading-relaxed">
                            Al activar el Guardián, todos sus bots verificarán automáticamente antes de cada operación si el Stop Loss o la Meta han sido alcanzados.
                            Si algún límite es activado, las operaciones se detienen para proteger su capital.
                        </p>
                    </div>
                </div>

                {/* Save Button */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                        "w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50",
                        selectedProfile === 'cohete'
                            ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-900/30"
                            : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-900/30"
                    )}
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : (
                        <>
                            <Lock size={18} />
                            <span>GUARDAR CONFIGURACIÓN</span>
                        </>
                    )}
                </motion.button>

                <style>{`
                    @keyframes scan {
                        0% { transform: translateX(-100%); opacity: 0; }
                        50% { opacity: 1; }
                        100% { transform: translateX(100%); opacity: 0; }
                    }
                    .animate-scan {
                        animation: scan 3s linear infinite;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default RiskSettingsPage;

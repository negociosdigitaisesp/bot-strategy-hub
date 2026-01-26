import React, { useState } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { Shield, Key, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { AffiliateModal } from './AffiliateModal';
import { SmartHelpTrigger } from './SmartHelpTrigger';
import { AccountNumberDisplay } from './AccountNumberDisplay';

export const DerivConnectionForm = () => {
    const { isConnected, isConnecting, connect, disconnect, lastError, account } = useDeriv();
    const [inputToken, setInputToken] = useState('');
    const [showAffiliateModal, setShowAffiliateModal] = useState(false);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputToken.trim()) return;
        await connect(inputToken.trim());
    };

    const handleConfigClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowAffiliateModal(true);
    };

    if (isConnected && account) {
        return (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 sm:p-6 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        Desconectar / Trocar Conta
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
            </div>
        );
    }

    return (
        <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
            <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="text-primary" size={24} />
                    </div>
                    <h2 className="text-xl font-semibold">Conexión Deriv API</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                    Conecte su cuenta Deriv para permitir operaciones automatizadas. Su token se guarda localmente en su navegador.
                </p>
            </div>

            <div className="p-6 space-y-6">
                <form onSubmit={handleConnect} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="api-token" className="text-sm font-medium flex items-center gap-2">
                            <Key size={16} className="text-primary" />
                            Token de API
                            <SmartHelpTrigger />
                        </label>
                        <div className="relative">
                            <input
                                id="api-token"
                                type="password"
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value)}
                                placeholder="Ingrese su Token de API aquí..."
                                className="w-full p-3 bg-background border border-border rounded-lg shadow-sm focus:border-primary focus:ring-1 focus:ring-primary pl-10 font-mono"
                                disabled={isConnecting}
                            />
                            <div className="absolute left-3 top-3.5 text-muted-foreground">
                                <Key size={16} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 pt-1">
                            <p className="text-xs text-muted-foreground">
                                Para obtener su token, asegúrese de habilitar los permisos "Read" y "Trade".
                            </p>
                            <button
                                onClick={handleConfigClick}
                                type="button"
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-300 group"
                            >
                                <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                Ir a Configuración de API
                            </button>
                        </div>
                    </div>

                    {lastError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} />
                            {lastError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!inputToken || isConnecting}
                        className={cn(
                            "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                            isConnecting
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20"
                        )}
                    >
                        {isConnecting ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Conectando...
                            </>
                        ) : (
                            <>
                                Conectar Cuenta
                            </>
                        )}
                    </button>

                    {/* Affiliate CTA - Subtle but visible */}
                    <a
                        href="https://deriv.com/?t=TRCjAn8FEcUivlVU8hndU2Nd7ZgqdRLk&utm_source=affiliate_223442&utm_medium=affiliate&utm_campaign=MyAffiliates&utm_content=&referrer="
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-3 py-2.5 px-4 rounded-lg font-medium transition-all flex flex-col items-center justify-center gap-0.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 hover:border-amber-500/40 group"
                    >
                        <span className="text-xs text-amber-200/70 group-hover:text-amber-200 transition-colors">
                            ¿No tienes cuenta Deriv?
                        </span>
                        <span className="text-sm font-bold text-amber-400 group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                            Crea una ahora
                            <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </span>
                    </a>
                </form>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-2">
                        <Shield size={14} /> Seguridad
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Su token se almacena estrictamente en el <strong>localStorage</strong> de su navegador. Nunca se envía a nuestras bases de datos. Esto garantiza que solo usted (en este dispositivo) tenga acceso a su cuenta.
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

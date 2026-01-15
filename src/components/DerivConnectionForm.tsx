import React, { useState } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { Shield, Key, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export const DerivConnectionForm = () => {
    const { isConnected, isConnecting, connect, disconnect, lastError, account } = useDeriv();
    const [inputToken, setInputToken] = useState('');

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputToken.trim()) return;
        await connect(inputToken.trim());
    };

    if (isConnected && account) {
        return (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-emerald-500">Conectado con Éxito</h3>
                            <p className="text-sm text-muted-foreground">Su cuenta Deriv está activa y vinculada.</p>
                        </div>
                    </div>
                    <button
                        onClick={disconnect}
                        className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20"
                        title="Cerrar sesión y usar otra cuenta"
                    >
                        <LogOut size={16} />
                        Desconectar / Trocar Conta
                    </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/50 p-4 rounded-lg border border-border">
                        <span className="text-xs text-muted-foreground block mb-1">ID de Inicio de Sesión</span>
                        <span className="font-mono font-medium">{account.loginid}</span>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg border border-border">
                        <span className="text-xs text-muted-foreground block mb-1">Saldo Actual</span>
                        <span className="font-mono font-medium text-emerald-500">
                            {account.currency} {account.balance}
                        </span>
                    </div>
                    {account.fullname && (
                        <div className="bg-background/50 p-4 rounded-lg border border-border md:col-span-2">
                            <span className="text-xs text-muted-foreground block mb-1">Nombre</span>
                            <span className="font-medium">{account.fullname}</span>
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
                            <a
                                href="https://app.deriv.com/account/api-token"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-300 group"
                            >
                                <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                Ir a Configuración de API
                            </a>
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
        </div>
    );
};

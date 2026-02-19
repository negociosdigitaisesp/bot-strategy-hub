import React from 'react';
import { BotTerminal } from '../components/BotTerminal';
import { Zap } from 'lucide-react';

const BotAlpha = () => {
    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Zap className="text-primary" size={28} />
                        </div>
                        Bot Alpha
                    </h1>
                    <p className="text-muted-foreground">
                        Estrategia de alta frecuencia con gestión de riesgo integrada.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    Cuenta Demo / Real
                </div>
            </div>

            <BotTerminal />
        </div>
    );
};

export default BotAlpha;

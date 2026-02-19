import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface APIStatusIndicatorProps {
    status: ConnectionStatus;
    showLabel?: boolean;
    className?: string;
}

const statusConfig = {
    connected: {
        color: 'bg-teal-500',
        glowColor: 'shadow-teal-500/50',
        textColor: 'text-teal-500',
        label: 'API Conectada',
        Icon: Wifi,
    },
    connecting: {
        color: 'bg-yellow-500',
        glowColor: 'shadow-yellow-500/50',
        textColor: 'text-yellow-500',
        label: 'Conectando...',
        Icon: Loader2,
    },
    disconnected: {
        color: 'bg-alert-500',
        glowColor: 'shadow-alert-500/50',
        textColor: 'text-alert-500',
        label: 'Desconectada',
        Icon: WifiOff,
    },
};

const APIStatusIndicator: React.FC<APIStatusIndicatorProps> = ({
    status,
    showLabel = true,
    className = '',
}) => {
    const config = statusConfig[status];
    const Icon = config.Icon;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Pulsating radio indicator */}
            <div className="relative flex items-center justify-center">
                {/* Pulse rings */}
                {status === 'connected' && (
                    <>
                        <motion.div
                            className={`absolute w-4 h-4 rounded-full ${config.color} opacity-40`}
                            animate={{
                                scale: [1, 1.8, 1],
                                opacity: [0.4, 0, 0.4],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                        <motion.div
                            className={`absolute w-4 h-4 rounded-full ${config.color} opacity-40`}
                            animate={{
                                scale: [1, 1.8, 1],
                                opacity: [0.4, 0, 0.4],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 0.75,
                            }}
                        />
                    </>
                )}

                {/* Core dot */}
                <motion.div
                    className={`relative w-3 h-3 rounded-full ${config.color} shadow-lg ${config.glowColor}`}
                    animate={
                        status === 'connecting'
                            ? { scale: [1, 1.2, 1] }
                            : {}
                    }
                    transition={{
                        duration: 0.8,
                        repeat: status === 'connecting' ? Infinity : 0,
                        ease: 'easeInOut',
                    }}
                >
                    {status === 'connected' && (
                        <div className="absolute inset-0 rounded-full bg-white/30" />
                    )}
                </motion.div>
            </div>

            {/* Icon */}
            <Icon
                size={16}
                className={`${config.textColor} ${status === 'connecting' ? 'animate-spin' : ''}`}
            />

            {/* Label */}
            {showLabel && (
                <span className={`text-xs font-medium ${config.textColor}`}>
                    {config.label}
                </span>
            )}
        </div>
    );
};

export default APIStatusIndicator;

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBrokerHub } from '../hooks/useBrokerHub';

interface BrokerRequirementTagProps {
    broker: 'deriv' | 'iq';
    className?: string;
}

const BROKER_CONFIG = {
    deriv: {
        name: 'Deriv',
        color: 'emerald',
        connectedBg: 'bg-emerald-500/10',
        connectedBorder: 'border-emerald-500/20',
        connectedText: 'text-emerald-400',
        disconnectedBg: 'bg-amber-500/10',
        disconnectedBorder: 'border-amber-500/20',
        disconnectedText: 'text-amber-400',
    },
    iq: {
        name: 'IQ Option',
        color: 'cyan',
        connectedBg: 'bg-cyan-500/10',
        connectedBorder: 'border-cyan-500/20',
        connectedText: 'text-cyan-400',
        disconnectedBg: 'bg-amber-500/10',
        disconnectedBorder: 'border-amber-500/20',
        disconnectedText: 'text-amber-400',
    }
};

const BrokerRequirementTag: React.FC<BrokerRequirementTagProps> = ({ broker, className }) => {
    const { derivBroker, iqBroker } = useBrokerHub();
    const config = BROKER_CONFIG[broker];
    const brokerInfo = broker === 'deriv' ? derivBroker : iqBroker;
    const isConnected = brokerInfo.isConnected;

    if (isConnected) {
        return (
            <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold",
                config.connectedBg, config.connectedBorder, config.connectedText,
                className
            )}>
                <CheckCircle size={14} />
                <span>{config.name} Conectado</span>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold",
            config.disconnectedBg, config.disconnectedBorder, config.disconnectedText,
            className
        )}>
            <AlertTriangle size={14} />
            <span>Cuenta {config.name} no conectada.</span>
            <Link
                to="/mis-brokers"
                className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-white transition-colors"
            >
                Conectar aquí
                <ExternalLink size={10} />
            </Link>
        </div>
    );
};

export default BrokerRequirementTag;

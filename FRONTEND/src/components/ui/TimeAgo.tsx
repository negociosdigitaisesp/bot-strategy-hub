import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface TimeAgoProps {
    date: Date;
    updateInterval?: number;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ date, updateInterval = 1000 }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(tick => tick + 1);
        }, updateInterval);

        return () => clearInterval(timer);
    }, [updateInterval]);

    return (
        <span suppressHydrationWarning>
            {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
        </span>
    );
};

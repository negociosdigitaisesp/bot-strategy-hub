import { useState, useEffect } from 'react';

export const useIQCountdown = () => {
    const [countdown, setCountdown] = useState<string>('00:00');
    const [isUrgent, setIsUrgent] = useState<boolean>(false);

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const seconds = 60 - now.getSeconds();

            const formattedSeconds = seconds === 60 ? '00:00' : `00:${seconds.toString().padStart(2, '0')}`;

            setCountdown(formattedSeconds);
            setIsUrgent(seconds <= 10 && seconds > 0);
        };

        // Update immediately and then every second
        updateCountdown();
        const intervalId = setInterval(updateCountdown, 1000);

        return () => clearInterval(intervalId);
    }, []);

    return { countdown, isUrgent };
};

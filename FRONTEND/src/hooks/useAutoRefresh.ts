import { useEffect, useRef, useState, useCallback } from 'react';

export interface AutoRefreshOptions {
    intervalMs?: number;
    enabled?: boolean;
}

export function useAutoRefresh(
    fetchFunction: () => Promise<void>,
    options: AutoRefreshOptions = {}
) {
    const { intervalMs = 30000, enabled = true } = options;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) return;

        setIsRefreshing(true);
        try {
            await fetchFunction();
            setLastRefresh(new Date());
            console.log('✅ Auto-refresh completed');
        } catch (error) {
            console.error('❌ Erro no auto-refresh:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchFunction, enabled]);

    useEffect(() => {
        if (!enabled) return;

        // Initial refresh
        refresh();

        // Setup interval
        intervalRef.current = setInterval(refresh, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [refresh, intervalMs, enabled]);

    const manualRefresh = useCallback(async () => {
        await refresh();
    }, [refresh]);

    return {
        isRefreshing,
        lastRefresh,
        manualRefresh
    };
}

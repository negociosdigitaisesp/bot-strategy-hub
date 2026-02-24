import { useMemo, useState, useEffect, useCallback } from 'react'
import { useDeriv } from '../contexts/DerivContext'
import { useAuth } from '../contexts/AuthContext'
import { getIQBot } from '../lib/supabaseIQ'

export interface BrokerInfo {
    id: string
    name: string
    isConnected: boolean
    isLoading: boolean
    balance: number | null
    currency: string
    icon: string // emoji or identifier
}

export interface BrokerHubState {
    brokers: BrokerInfo[]
    totalBalance: number
    connectedCount: number
    totalBrokers: number
    isAnyConnected: boolean
    isLoading: boolean
    derivBroker: BrokerInfo
    iqBroker: BrokerInfo
    refreshIQ: () => Promise<void>
}

export const useBrokerHub = (): BrokerHubState => {
    const { isConnected: derivConnected, isConnecting: derivConnecting, account: derivAccount } = useDeriv()
    const { user } = useAuth()
    const userId = user?.id

    // IQ Option state - fetched independently to avoid full useIQBot overhead
    const [iqConnected, setIqConnected] = useState(false)
    const [iqLoading, setIqLoading] = useState(true)

    const checkIQStatus = useCallback(async () => {
        if (!userId) {
            setIqLoading(false)
            return
        }
        setIqLoading(true)
        try {
            const { data } = await getIQBot(userId)
            // IQ is "connected" if bot record exists with email set
            setIqConnected(!!data?.iq_email)
        } catch {
            setIqConnected(false)
        } finally {
            setIqLoading(false)
        }
    }, [userId])

    useEffect(() => {
        checkIQStatus()
    }, [checkIQStatus])

    const derivBalance = derivAccount ? parseFloat(derivAccount.balance) : null
    const derivCurrency = derivAccount?.currency || 'USD'

    const derivBroker: BrokerInfo = useMemo(() => ({
        id: 'deriv',
        name: 'Deriv',
        isConnected: derivConnected,
        isLoading: derivConnecting,
        balance: derivConnected ? (derivBalance ?? 0) : null,
        currency: derivCurrency,
        icon: '🟢'
    }), [derivConnected, derivConnecting, derivBalance, derivCurrency])

    const iqBroker: BrokerInfo = useMemo(() => ({
        id: 'iq-option',
        name: 'IQ Option',
        isConnected: iqConnected,
        isLoading: iqLoading,
        balance: null, // IQ Option balance not directly accessible from frontend
        currency: 'USD',
        icon: '📈'
    }), [iqConnected, iqLoading])

    const brokers = useMemo(() => [derivBroker, iqBroker], [derivBroker, iqBroker])

    const connectedCount = brokers.filter(b => b.isConnected).length
    const totalBalance = brokers.reduce((sum, b) => sum + (b.balance ?? 0), 0)
    const isAnyConnected = connectedCount > 0
    const isLoading = brokers.some(b => b.isLoading)

    return {
        brokers,
        totalBalance,
        connectedCount,
        totalBrokers: brokers.length,
        isAnyConnected,
        isLoading,
        derivBroker,
        iqBroker,
        refreshIQ: checkIQStatus
    }
}

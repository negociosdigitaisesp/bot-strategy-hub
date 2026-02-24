import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
    getIQBot,
    saveIQCredentials as dbSaveCredentials,
    toggleIQBot as dbToggleBot,
    toggleIQMode as dbToggleMode,
    getIQTradeLogs,
    getTodayStats,
    subscribeToTrades,
    subscribeToBotStatus
} from '@/lib/supabaseIQ'

const HEALTH_CHECK_URL =
    import.meta.env.VITE_HEALTH_CHECK_URL || 'http://191.252.182.208:4002/health'

const IS_DEV = import.meta.env.DEV

export const useIQBot = () => {
    const { user } = useAuth()
    const userId = user?.id

    const [bot, setBot] = useState(null)
    const [isActive, setIsActive] = useState(false)
    const [mode, setMode] = useState('demo')
    const [sessionStatus, setSessionStatus] = useState('disconnected')
    const [pnlToday, setPnlToday] = useState(0)
    const [winRate, setWinRate] = useState(0)
    const [totalOps, setTotalOps] = useState(0)
    const [wins, setWins] = useState(0)
    const [losses, setLosses] = useState(0)
    const [streak, setStreak] = useState(0)
    const [recentTrades, setRecentTrades] = useState([])
    const [selectedTrader, setSelectedTrader] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    // Em dev, mostra status neutro pois o servidor VPS não está acessível localmente
    const [serverStatus, setServerStatus] = useState(IS_DEV ? 'dev' : 'checking')

    // Initialization
    useEffect(() => {
        if (!userId) {
            setLoading(false)
            return
        }

        let tradeSubscription = null
        let statusSubscription = null

        const initializeBot = async () => {
            try {
                setLoading(true)

                // 1. Fetch user bot
                const { data: botData, error: botError } = await getIQBot(userId)

                if (botError) {
                    setError(botError.message)
                    setLoading(false)
                    return
                }

                if (botData) {
                    setBot(botData)
                    setIsActive(botData.is_active)
                    setMode(botData.mode)
                    setSessionStatus(botData.is_active ? 'connected' : 'disconnected')

                    // 2. Fetch trade logs
                    const { data: logsData } = await getIQTradeLogs(botData.id, 6)
                    if (logsData) {
                        setRecentTrades(logsData)
                        calculateStreak(logsData)
                    }

                    // 3. Calculate today's stats
                    const stats = await getTodayStats(botData.id)
                    setPnlToday(stats.profit)
                    setWins(stats.wins)
                    setLosses(stats.losses)
                    setTotalOps(stats.total)

                    if (stats.total > 0) {
                        setWinRate(Math.round((stats.wins / stats.total) * 100))
                    }

                    // 4. Realtime Subscriptions
                    tradeSubscription = subscribeToTrades(botData.id, handleNewTrade)
                    statusSubscription = subscribeToBotStatus(botData.id, handleStatusUpdate)
                }
            } catch (err) {
                console.error("Failed to initialize IQ Bot:", err)
                setError("Erro ao carregar os dados do robô. Tente novamente.")
            } finally {
                setLoading(false)
            }
        }

        initializeBot()

        // Cleanup
        return () => {
            if (tradeSubscription) tradeSubscription.unsubscribe()
            if (statusSubscription) statusSubscription.unsubscribe()
        }
    }, [userId])

    // Health Check: verifica status do servidor VPS a cada 30s
    const testConnection = useCallback(async () => {
        // Em desenvolvimento, não faz health check (localhost:4002 não existe)
        if (IS_DEV) return

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout
            const res = await fetch(HEALTH_CHECK_URL, { signal: controller.signal })
            clearTimeout(timeout)
            setServerStatus(res.ok ? 'online' : 'offline')
        } catch {
            setServerStatus('offline')
        }
    }, [])

    useEffect(() => {
        testConnection()
        const interval = setInterval(testConnection, 30000)
        return () => clearInterval(interval)
    }, [testConnection])

    // Helpers
    const calculateStreak = (logs) => {
        if (!logs || logs.length === 0) {
            setStreak(0)
            return
        }

        let currentStreak = 0
        const firstResult = logs[0].result

        for (let i = 0; i < logs.length; i++) {
            if (logs[i].result === firstResult) {
                currentStreak++
            } else {
                break
            }
        }

        setStreak(firstResult === 'win' ? currentStreak : -currentStreak)
    }

    // Handlers
    const handleNewTrade = useCallback((newTrade) => {
        setRecentTrades(prev => {
            const updated = [newTrade, ...prev].slice(0, 6)
            calculateStreak(updated)
            return updated
        })

        setWins(prev => newTrade.result === 'win' ? prev + 1 : prev)
        setLosses(prev => newTrade.result === 'loss' ? prev + 1 : prev)
        setTotalOps(prev => prev + 1)
        setPnlToday(prev => prev + Number(newTrade.profit))

        // WinRate updates when dependencies re-evaluate it (effect or derived value)
    }, [])

    // Update WinRate Reactively
    useEffect(() => {
        if (totalOps > 0) {
            setWinRate(Math.round((wins / totalOps) * 100))
        } else {
            setWinRate(0)
        }
    }, [wins, totalOps])

    const handleStatusUpdate = useCallback((updatedBot) => {
        setBot(updatedBot)
        setIsActive(updatedBot.is_active)
        setMode(updatedBot.mode)
        setSessionStatus(updatedBot.is_active ? 'connected' : 'disconnected')
    }, [])

    // Exposed Actions
    const toggleBot = async () => {
        if (!bot) return

        if (!isActive) {
            if (mode === 'real') {
                setShowConfirmModal(true)
            } else {
                await activateBot()
            }
        } else {
            await deactivateBot()
        }
    }

    const activateBot = async () => {
        setError(null)
        const { error: toggleError } = await dbToggleBot(bot.id, true)
        if (toggleError) {
            setError("Erro ao ativar o robô.")
        } else {
            setIsActive(true)
            setSessionStatus('connected')
        }
    }

    const deactivateBot = async () => {
        setError(null)
        const { error: toggleError } = await dbToggleBot(bot.id, false)
        if (toggleError) {
            setError("Erro ao desativar o robô.")
        } else {
            setIsActive(false)
            setSessionStatus('disconnected')
        }
    }

    const confirmActivateReal = async () => {
        setShowConfirmModal(false)
        await activateBot()
    }

    const saveCredentials = async (email, password, stake) => {
        if (!userId) return { error: 'Usuário não autenticado' }

        setLoading(true)
        setError(null)
        const { data, error: saveError } = await dbSaveCredentials(userId, { email, password, stake })

        if (saveError) {
            const msg = "Erro ao salvar credenciais da IQ Option. Verifique seus dados."
            setError(msg)
            setLoading(false)
            return { error: saveError.message || msg }
        }

        if (data) {
            setBot(data)
            setIsActive(data.is_active)
            setMode(data.mode)
        }
        setLoading(false)
        return { success: true }
    }

    const changeMode = async (newMode) => {
        if (!bot) return

        if (newMode === 'real') {
            setShowConfirmModal(true)
        } else {
            const { error: modeError } = await dbToggleMode(bot.id, 'demo')
            if (modeError) {
                setError("Erro ao mudar para conta de demonstração.")
            } else {
                setMode('demo')
            }
        }
    }

    const selectTrader = (trader) => {
        setSelectedTrader(trader)
        // navigation to standard panel happens at the component level
    }

    return {
        bot,
        isActive,
        mode,
        sessionStatus,
        serverStatus,
        pnlToday,
        winRate,
        totalOps,
        wins,
        losses,
        streak,
        recentTrades,
        selectedTrader,
        loading,
        error,
        showConfirmModal,
        setShowConfirmModal,
        toggleBot,
        confirmActivateReal,
        saveCredentials,
        changeMode,
        selectTrader,
        testConnection
    }
}

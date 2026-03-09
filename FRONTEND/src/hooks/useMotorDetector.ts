import { useState, useEffect } from 'react'

type MotorStatus = 'not_installed' | 'connecting' | 'connected' | 'disconnected' | 'ssid_expired' | 'iq_offline'

export function useMotorDetector() {
  const [motorStatus, setMotorStatus] = useState<MotorStatus>('not_installed')
  const [motorVersion, setMotorVersion] = useState<string | null>(null)

  useEffect(() => {
    // Detectar se extensão está instalada via objeto injetado
    const checkInstalled = () => {
      if ((window as any).__millionbots_motor) {
        setMotorStatus('connecting')
      }
    }

    // Checar imediatamente e após 500ms (content.js pode demorar)
    checkInstalled()
    const timer = setTimeout(checkInstalled, 500)

    // Escutar mensagens da extensão
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== 'millionbots_motor') return

      if (event.data.type === 'STATUS') {
        setMotorStatus(event.data.payload.connected ? 'connected' : 'disconnected')
        setMotorVersion(event.data.payload.version)
      }

      if (event.data.type === 'ERROR') {
        setMotorStatus(event.data.payload.code as MotorStatus)
      }
    }

    window.addEventListener('message', handler)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('message', handler)
    }
  }, [])

  const startMotor = (clientId: string) => {
    window.postMessage({
      source: 'millionbots_page',
      type: 'START',
      payload: { client_id: clientId }
    }, '*')
  }

  const stopMotor = () => {
    window.postMessage({ source: 'millionbots_page', type: 'STOP' }, '*')
  }

  return { motorStatus, motorVersion, startMotor, stopMotor }
}

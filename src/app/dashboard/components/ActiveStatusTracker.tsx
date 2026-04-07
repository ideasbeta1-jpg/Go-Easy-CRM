'use client'

import { useEffect } from 'react'
import { updateLastActive } from '@/app/utils/actions/profiles'

/**
 * Este componente no renderiza nada visible. 
 * Se encarga de notificar al servidor que el usuario sigue activo cada cierto tiempo
 * o cuando detecta actividad (mousemove/keydown) con un throttle de 5 minutos.
 */
export function ActiveStatusTracker() {
  useEffect(() => {
    // Primer pulso al montar el componente
    updateLastActive()

    // Pulso automático cada 10 minutos para mantener la sesión "viva" si la pestaña está abierta
    const interval = setInterval(() => {
      updateLastActive()
    }, 10 * 60 * 1000)

    // Pulso basado en actividad real (con un límite de una vez cada 5 minutos para no saturar)
    let lastPulse = Date.now()
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastPulse > 5 * 60 * 1000) { 
        updateLastActive()
        lastPulse = now
      }
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)

    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [])

  return null
}

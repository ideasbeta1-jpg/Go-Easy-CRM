'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    zadarmaWidgetFn?: (
      key: string,
      sip: string,
      shape: 'square' | 'rounded',
      lang: string,
      autoAnswer: boolean,
      position: Record<string, string>
    ) => void
  }
}

interface ZadarmaWidgetProps {
  sipExtension: string // extensión corta: "103"
  pbxNumber: string    // número PBX: "548969"
}

export function ZadarmaWidget({ sipExtension, pbxNumber }: ZadarmaWidgetProps) {
  useEffect(() => {
    const BASE = 'https://my.zadarma.com/webphoneWebRTCWidget/v9/js'
    // Formato confirmado desde el panel de Zadarma: pbxNumber-extension
    const sip = pbxNumber ? `${pbxNumber}-${sipExtension}` : sipExtension

    async function init() {
      const res = await fetch('/api/zadarma/webrtc-key')
      const data = await res.json()
      if (!res.ok || !data.key) {
        console.error('[ZadarmaWidget] Error obteniendo key WebRTC:', data.error)
        return
      }

      function launch() {
        if (!window.zadarmaWidgetFn) return
        console.log('[ZadarmaWidget] Iniciando con SIP:', sip)
        window.zadarmaWidgetFn(data.key, sip, 'square', 'es', true, {
          right: '10px',
          bottom: '5px',
        })
      }

      const libAlreadyLoaded = !!document.querySelector(`script[src*="loader-phone-lib"]`)
      if (libAlreadyLoaded && window.zadarmaWidgetFn) {
        launch()
        return
      }

      if (libAlreadyLoaded) {
        // Scripts are in the DOM but widget function not ready yet — wait for it
        const poll = setInterval(() => {
          if (window.zadarmaWidgetFn) {
            clearInterval(poll)
            launch()
          }
        }, 100)
        setTimeout(() => clearInterval(poll), 5000)
        return
      }

      const lib = document.createElement('script')
      lib.src = `${BASE}/loader-phone-lib.js?sub_v=1`
      lib.onload = () => {
        const fn = document.createElement('script')
        fn.src = `${BASE}/loader-phone-fn.js?sub_v=1`
        fn.onload = launch
        document.head.appendChild(fn)
      }
      document.head.appendChild(lib)
    }

    init()
  }, [sipExtension, pbxNumber])

  return null
}

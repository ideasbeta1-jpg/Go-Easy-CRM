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
  sipExtension: string // formato completo: "548969-103"
}

export function ZadarmaWidget({ sipExtension }: ZadarmaWidgetProps) {
  useEffect(() => {
    const BASE = 'https://my.zadarma.com/webphoneWebRTCWidget/v9/js'

    async function init() {
      // Obtener la key dinámica desde el servidor
      const res = await fetch('/api/zadarma/webrtc-key')
      if (!res.ok) {
        console.error('[ZadarmaWidget] No se pudo obtener la key WebRTC')
        return
      }
      const { key } = await res.json()
      if (!key) return

      function startWidget() {
        if (window.zadarmaWidgetFn) {
          window.zadarmaWidgetFn(key, sipExtension, 'square', 'es', true, {
            right: '10px',
            bottom: '5px',
          })
        }
      }

      function loadFn() {
        const fn = document.createElement('script')
        fn.src = `${BASE}/loader-phone-fn.js?sub_v=1`
        fn.onload = startWidget
        document.head.appendChild(fn)
      }

      if (document.querySelector(`script[src*="loader-phone-lib"]`)) {
        startWidget()
        return
      }

      const lib = document.createElement('script')
      lib.src = `${BASE}/loader-phone-lib.js?sub_v=1`
      lib.onload = loadFn
      document.head.appendChild(lib)
    }

    init()
  }, [sipExtension])

  return null
}

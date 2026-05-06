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

    // Zadarma acepta distintos formatos según la configuración de la cuenta.
    // Intentamos en orden hasta que uno funcione.
    const sipCandidates = [
      sipExtension,                          // "103"
      pbxNumber ? `${pbxNumber}-${sipExtension}` : null,  // "548969-103"
      pbxNumber ? `${pbxNumber}${sipExtension}` : null,   // "548969103"
    ].filter(Boolean) as string[]

    async function init() {
      const res = await fetch('/api/zadarma/webrtc-key')
      const data = await res.json()
      if (!res.ok || !data.key) {
        console.error('[ZadarmaWidget] Error obteniendo key WebRTC:', data)
        return
      }

      function tryNextSip(candidates: string[]) {
        if (!candidates.length || !window.zadarmaWidgetFn) return
        const [sip, ...rest] = candidates
        console.log('[ZadarmaWidget] Probando SIP:', sip)
        try {
          window.zadarmaWidgetFn!(data.key, sip, 'square', 'es', true, {
            right: '10px',
            bottom: '5px',
          })
        } catch (e) {
          console.warn('[ZadarmaWidget] SIP falló, probando siguiente:', sip, e)
          tryNextSip(rest)
        }
      }

      function loadFn() {
        const fn = document.createElement('script')
        fn.src = `${BASE}/loader-phone-fn.js?sub_v=1`
        fn.onload = () => tryNextSip(sipCandidates)
        document.head.appendChild(fn)
      }

      if (document.querySelector(`script[src*="loader-phone-lib"]`)) {
        if (window.zadarmaWidgetFn) tryNextSip(sipCandidates)
        return
      }

      const lib = document.createElement('script')
      lib.src = `${BASE}/loader-phone-lib.js?sub_v=1`
      lib.onload = loadFn
      document.head.appendChild(lib)
    }

    init()
  }, [sipExtension, pbxNumber])

  return null
}

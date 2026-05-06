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
  userKey: string
  sipExtension: string
}

export function ZadarmaWidget({ userKey, sipExtension }: ZadarmaWidgetProps) {
  useEffect(() => {
    // Carga loader-phone-lib.js primero, luego loader-phone-fn.js en cadena
    const BASE = 'https://my.zadarma.com/webphoneWebRTCWidget/v9/js'

    function initWidget() {
      if (window.zadarmaWidgetFn) {
        window.zadarmaWidgetFn(userKey, sipExtension, 'square', 'es', true, {
          right: '10px',
          bottom: '5px',
        })
      }
    }

    function loadFn() {
      const fn = document.createElement('script')
      fn.src = `${BASE}/loader-phone-fn.js?sub_v=1`
      fn.onload = initWidget
      document.head.appendChild(fn)
    }

    // Evitar doble carga si el componente se remonta
    if (document.querySelector(`script[src*="loader-phone-lib"]`)) {
      if (window.zadarmaWidgetFn) initWidget()
      return
    }

    const lib = document.createElement('script')
    lib.src = `${BASE}/loader-phone-lib.js?sub_v=1`
    lib.onload = loadFn
    document.head.appendChild(lib)
  }, [userKey, sipExtension])

  return null
}

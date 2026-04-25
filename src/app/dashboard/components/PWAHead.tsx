'use client'

import { useEffect } from 'react'

// Injects PWA manifest + registers the service worker only for authenticated users.
// This component is rendered exclusively inside the dashboard layout, which
// already enforces authentication — so public visitors never see the install prompt.
export function PWAHead() {
  useEffect(() => {
    // Inject <link rel="manifest"> dynamically so it only appears for auth users
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.json'
    document.head.appendChild(link)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return null
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function showUpdateToast(worker: ServiceWorker) {
  toast('¡Nueva versión disponible!', {
    description: 'Hay una actualización lista para instalar.',
    action: {
      label: 'Actualizar ahora',
      onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
    },
    duration: Infinity,
  })
}

export function PWAHead() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showIOSBanner, setShowIOSBanner] = useState(false)

  // iOS-specific banner display detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true

    const dismissed = localStorage.getItem('ios-pwa-dismissed') === 'true'

    if (isIOS && !isStandalone && !dismissed) {
      setShowIOSBanner(true)
    }
  }, [])

  // Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    const handleAppInstalled = () => {
      setShowInstallBanner(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Update detection
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const trackInstalling = (worker: ServiceWorker) => {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast(worker)
        }
      })
    }

    navigator.serviceWorker.ready.then((reg) => {
      // Force-check for a new SW version on every page load
      reg.update().catch(() => {})

      // Worker already waiting (e.g. came back to a background tab)
      if (reg.waiting) {
        showUpdateToast(reg.waiting)
        return
      }

      // Race condition: updatefound fired before this component mounted
      if (reg.installing) {
        trackInstalling(reg.installing)
        return
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        trackInstalling(newWorker)
      })
    })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBanner(false)
      setInstallPrompt(null)
    }
  }

  if (showIOSBanner) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sky-500 text-xl">install_mobile</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Instalar GE CRM en tu iPhone</p>
            <p className="text-xs text-slate-500 mt-0.5">Acceso rápido y a pantalla completa.</p>
          </div>
          <button
            onClick={() => {
              setShowIOSBanner(false)
              localStorage.setItem('ios-pwa-dismissed', 'true')
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 shrink-0"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        
        <div className="border-t border-slate-100 pt-2 text-xs text-slate-600 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">1</span>
            <p className="leading-snug">
              Presiona el botón de compartir{' '}
              <span className="inline-flex items-center align-middle bg-slate-50 p-1 rounded mx-0.5 text-slate-700">
                <span className="material-symbols-outlined text-[14px]">ios_share</span>
              </span>{' '}
              en Safari.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">2</span>
            <p className="leading-snug">
              Busca y selecciona{' '}
              <span className="font-bold text-slate-800">"Agregar a pantalla de inicio"</span>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!showInstallBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-sky-500 text-xl">install_mobile</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">Instalar GE CRM</p>
        <p className="text-xs text-slate-500">Acceso rápido desde tu pantalla</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setShowInstallBanner(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <button
          onClick={handleInstall}
          className="bg-sky-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-sky-600 transition-colors whitespace-nowrap"
        >
          Instalar
        </button>
      </div>
    </div>
  )
}

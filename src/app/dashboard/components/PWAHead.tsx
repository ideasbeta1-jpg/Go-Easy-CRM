'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function PWAHead() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // next-pwa registers it via injected scripts, but we can hook into it
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              // Has network content changed?
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // new update is available
                toast.success('¡Nueva actualización disponible!', {
                  description: 'Se ha descargado una nueva versión. Actualiza para ver los cambios.',
                  action: {
                    label: 'Actualizar ahora',
                    onClick: () => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                  },
                  duration: Infinity, // Keep it open until they update
                });
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, [])

  return null
}

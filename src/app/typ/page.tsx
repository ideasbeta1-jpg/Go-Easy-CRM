'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SystemSettings {
  crm_name: string
  logo_url?: string
  favicon_url?: string
  updated_at?: string
}

function ThankYouContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const name = searchParams.get('name') || 'Cliente'

  useEffect(() => {
    fetch('/api/public-data')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings)
      })
      .catch(err => console.error('Error fetching settings:', err))
  }, [])

  useEffect(() => {
    if (settings?.favicon_url) {
      const v = settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now();
      const faviconUrl = `${settings.favicon_url}?v=${v}`;
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
      appleLink.href = faviconUrl;
    }
  }, [settings])
  useEffect(() => {
    const id = searchParams.get('id')
    
    let attempts = 0;
    const fireLead = () => {
      if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
        const payload = {
          content_name: 'Registro Exitoso TYP',
          currency: 'USD',
          ...(id ? { eventID: id } : {})
        };
        // 1. Meta Evento Estándar
        (window as any).fbq('track', 'Lead', payload);
        // 2. Meta Evento Personalizado
        (window as any).fbq('trackCustom', 'Lead_renta', payload);
        
        console.log('Meta Events (Lead, Lead_renta) fired', id ? `with ID: ${id}` : '(No ID found)')
      } else if (attempts < 10) {
        attempts++
        setTimeout(fireLead, 500)
      }
    }

    fireLead()
  }, [searchParams])

  return (
    <div className="bg-[#f5f7f8] min-h-screen flex flex-col antialiased items-center" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {settings?.favicon_url && (
        <link rel="icon" href={`${settings.favicon_url}?v=${settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()}`} />
      )}
      
      {/* TopAppBar */}
      <div className="sticky top-0 z-50 w-full flex items-center bg-white/90 backdrop-blur-md p-4 justify-between border-b border-slate-200">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="text-[#003d75] flex size-12 shrink-0 items-center justify-center cursor-pointer hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          
          {/* Dynamic Brand/Logo */}
          <div className="flex-1 flex justify-center items-center gap-2">
            {settings?.logo_url ? (
              <img 
                src={`${settings.logo_url}?v=${settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()}`} 
                alt={settings.crm_name} 
                className="h-8 md:h-10 w-auto object-contain"
              />
            ) : (
              <h2 className="text-[#003d75] text-xl md:text-2xl font-black leading-tight tracking-[-0.015em]">
                {settings?.crm_name || 'GoEasy Rent-A-Car'}
              </h2>
            )}
          </div>

          <div className="flex w-12 items-center justify-end">
            <button className="flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-slate-100 transition-colors text-[#003d75]">
              <span className="material-symbols-outlined font-bold">share</span>
            </button>
          </div>
        </div>
      </div>

      <main className="w-full max-w-5xl flex-1 overflow-y-auto pb-32 pt-4 md:pt-8">
        {/* Hero Section */}
        <div className="px-4 md:px-0">
          <div 
            className="bg-cover bg-center flex flex-col justify-end overflow-hidden rounded-[2rem] md:rounded-[3rem] min-h-[320px] md:min-h-[420px] relative shadow-2xl transition-all duration-700 ease-out md:hover:scale-[1.005]"
            style={{ 
              backgroundImage: 'linear-gradient(180deg, rgba(0, 61, 117, 0.2) 0%, rgba(0, 61, 117, 0.95) 100%), url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1600")' 
            }}
          >
            <div className="absolute top-6 right-6 md:top-8 md:right-8 bg-[#FFD200] text-[#003d75] font-black px-6 py-2 rounded-full text-xs md:text-sm flex items-center gap-2 shadow-xl animate-bounce-subtle z-10">
              <span className="material-symbols-outlined text-lg fill-1">verified</span>
              REGISTRO CONFIRMADO
            </div>
            
            <div className="flex flex-col p-8 md:p-16 gap-4 md:gap-6 relative z-10">
              <div className="bg-white/20 w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-2 backdrop-blur-xl border border-white/30 shadow-inner group transition-all duration-300 hover:bg-white/30">
                <span className="material-symbols-outlined text-white text-4xl md:text-5xl transition-transform duration-300 group-hover:scale-110">chat_bubble</span>
              </div>
              <div className="space-y-1 md:space-y-2">
                <h1 className="text-white tracking-tight text-4xl md:text-6xl font-black leading-tight">
                  ¡Gracias {name}!
                </h1>
                <p className="text-white/90 text-lg md:text-2xl font-medium max-w-xl">
                  Recibimos tu solicitud. Nuestro equipo ya está trabajando para que inicies tu viaje pronto.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout: Timeline and FAQ side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12 px-6 md:px-0">
          
          {/* Left Column: What's Next & Timeline */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <h3 className="text-[#003d75]  tracking-tight text-3xl font-black leading-tight">¿Qué sigue ahora?</h3>
              <p className="text-slate-500  text-lg">Estamos coordinando todo para que tu experiencia sea perfecta.</p>
            </div>

            <div className="space-y-0">
              {/* Step 1 */}
              <div className="grid grid-cols-[64px_1fr] gap-x-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#003d75]/10 text-[#003d75]   transition-all duration-500 hover:rotate-12 group">
                    <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">map</span>
                  </div>
                  <div className="w-[3px] bg-gradient-to-b from-[#003d75]/10 via-[#003d75]/5 to-transparent h-16 grow"></div>
                </div>
                <div className="flex flex-col pb-8 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#FFD200] text-[#003d75] text-[12px] font-black px-3 py-1 rounded-lg">PASO 1</span>
                    <p className="text-[#003d75]  text-xl font-black">Análisis de tu ruta</p>
                  </div>
                  <p className="text-slate-500  text-base leading-relaxed md:max-w-md">
                    Validamos la disponibilidad de categorías y los puntos de entrega en Florida para optimizar tu trayecto.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid grid-cols-[64px_1fr] gap-x-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#003d75]/10 text-[#003d75]   transition-all duration-500 hover:rotate-12 group">
                    <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">directions_car</span>
                  </div>
                  <div className="w-[3px] bg-gradient-to-b from-[#003d75]/10 via-[#003d75]/5 to-transparent h-16 grow"></div>
                </div>
                <div className="flex flex-col pb-8 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#FFD200] text-[#003d75] text-[12px] font-black px-3 py-1 rounded-lg">PASO 2</span>
                    <p className="text-[#003d75]  text-xl font-black">Selección de flota</p>
                  </div>
                  <p className="text-slate-500  text-base leading-relaxed md:max-w-md">
                    Asignamos el vehículo que mejor se adapte a tu grupo, equipaje y preferencias de conducción.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid grid-cols-[64px_1fr] gap-x-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#FFD200] text-[#003d75] shadow-2xl shadow-[#FFD200]/40 animate-pulse transition-all duration-500 hover:rotate-12 group">
                    <span className="material-symbols-outlined text-3xl fill-1 transition-transform group-hover:scale-110">support_agent</span>
                  </div>
                </div>
                <div className="flex flex-col pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#FFD200] text-[#003d75] text-[12px] font-black px-3 py-1 rounded-lg">PASO 3</span>
                    <p className="text-[#003d75]  text-xl font-black">Te contactamos</p>
                  </div>
                  <p className="text-[#003d75]  font-black text-base leading-relaxed mb-4">
                    Un asesor experto te escribirá por WhatsApp en menos de 5 minutos para finalizar los detalles.
                  </p>
                  
                  {/* WhatsApp Speed-up Card */}
                  <div className="bg-white  p-4 rounded-2xl border-2 border-dashed border-[#25D366]/30 space-y-3">
                    <p className="text-slate-600  text-sm font-medium">
                      Si quieres agilizar tu cotización o recibir una <span className="text-[#25D366] font-bold italic">oferta especial</span>, escríbenos ahora mismo:
                    </p>
                    <a 
                      href="https://wa.me/18052406345?text=Hola!%20Acabo%20de%20registrarme%20y%20me%20gustar%C3%ADa%20recibir%20una%20oferta%20especial%20y%20agilizar%20mi%20cotizaci%C3%B3n." 
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1fb355] text-white px-6 py-3.5 rounded-xl font-black transition-all shadow-xl shadow-green-500/10 active:scale-[0.98] group"
                    >
                      <svg className="w-6 h-6 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.399-4.438 9.825-9.885 9.825m10.743-15.143A11.967 11.967 0 0012.052 2.006c-6.686 0-12.126 5.44-12.13 12.126a12.112 12.112 0 001.643 6.132L0 24l3.858-1.012c1.947 1.063 4.14 1.622 6.368 1.623h.005c6.68 0 12.126-5.44 12.13-12.126a12.115 12.115 0 00-3.463-8.563z"/>
                      </svg>
                      ESCRÍBENOS POR WHATSAPP
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: FAQs & Support */}
          <div className="lg:col-span-5 space-y-8">
            <h3 className="text-[#003d75]  tracking-tight text-3xl font-black leading-tight">Preguntas Frecuentes</h3>
            <div className="space-y-4">
              {[
                { q: "¿Incluye seguro el alquiler?", a: "Sí, todas nuestras cotizaciones incluyen protección básica o premium según elijas." },
                { q: "¿Cómo funciona el depósito?", a: "El depósito se realiza de forma segura mediante Stripe para garantizar tu reserva." },
                { q: "¿Soporte en español 24/7?", a: "¡Absolutamente! Nuestro equipo está disponible las 24 horas para asistirte en tu idioma." }
              ].map((faq, i) => (
                <div key={i} className="bg-white  p-6 rounded-[1.5rem] border border-slate-100  shadow-sm transition-all hover:shadow-xl hover:border-slate-200  cursor-pointer group">
                  <div className="flex justify-between items-center">
                    <p className="text-slate-900  font-black text-base md:text-lg">{faq.q}</p>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-[#003d75] transition-all duration-300">expand_more</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Help Chip Desktop */}
            <div className="pt-4">
              <a 
                href="https://wa.me/your-number" 
                target="_blank" 
                className="flex h-16 items-center justify-center gap-x-4 rounded-[1.5rem] bg-[#003d75]/5  px-10 cursor-pointer border border-[#003d75]/10 transition-all hover:bg-[#003d75]/10 hover:shadow-xl group"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-[#003d75] text-white">
                  <span className="material-symbols-outlined text-xl">help</span>
                </div>
                <div className="text-left">
                  <p className="text-[#003d75]  text-lg font-black leading-tight">¿Tienes dudas?</p>
                  <p className="text-[#003d75]/70  text-sm font-bold">Habla con un asesor por WhatsApp</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#f5f7f8]/80 backdrop-blur-xl border-t border-slate-200 z-50">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Link href="/landing" className="w-full md:w-80 bg-[#003d75] text-white h-16 rounded-[1.25rem] font-black text-lg shadow-2xl shadow-[#003d75]/30 flex items-center justify-center gap-3 active:scale-[0.97] transition-all hover:bg-[#002d5a] hover:shadow-primary/50">
            <span className="material-symbols-outlined fill-1">home</span>
            VOLVER AL INICIO
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        .fill-1 {
          font-variation-settings: 'FILL' 1 !important;
        }
      `}</style>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-light ">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}

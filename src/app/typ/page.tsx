'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ThankYouContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name') || 'Cliente'

  return (
    <div className="bg-[#f5f7f8] dark:bg-[#0f1923] min-h-screen flex flex-col antialiased items-center" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      {/* TopAppBar */}
      <div className="sticky top-0 z-50 w-full flex items-center bg-[#f5f7f8]/80 dark:bg-[#0f1923]/80 backdrop-blur-md p-4 justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="text-[#003d75] dark:text-white flex size-12 shrink-0 items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <h2 className="text-[#003d75] dark:text-white text-xl md:text-2xl font-black leading-tight tracking-[-0.015em] flex-1 text-center">GoEasy Rent-A-Car</h2>
          <div className="flex w-12 items-center justify-end">
            <button className="flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[#003d75] dark:text-white">
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
              <h3 className="text-[#003d75] dark:text-white tracking-tight text-3xl font-black leading-tight">¿Qué sigue ahora?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Estamos coordinando todo para que tu experiencia sea perfecta.</p>
            </div>

            <div className="space-y-0">
              {/* Step 1 */}
              <div className="grid grid-cols-[64px_1fr] gap-x-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#003d75]/10 text-[#003d75] dark:bg-[#003d75]/20 dark:text-blue-300 transition-all duration-500 hover:rotate-12 group">
                    <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">map</span>
                  </div>
                  <div className="w-[3px] bg-gradient-to-b from-[#003d75]/10 via-[#003d75]/5 to-transparent h-16 grow"></div>
                </div>
                <div className="flex flex-col pb-8 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#FFD200] text-[#003d75] text-[12px] font-black px-3 py-1 rounded-lg">PASO 1</span>
                    <p className="text-[#003d75] dark:text-white text-xl font-black">Análisis de tu ruta</p>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed md:max-w-md">
                    Validamos la disponibilidad de categorías y los puntos de entrega en Florida para optimizar tu trayecto.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid grid-cols-[64px_1fr] gap-x-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#003d75]/10 text-[#003d75] dark:bg-[#003d75]/20 dark:text-blue-300 transition-all duration-500 hover:rotate-12 group">
                    <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">directions_car</span>
                  </div>
                  <div className="w-[3px] bg-gradient-to-b from-[#003d75]/10 via-[#003d75]/5 to-transparent h-16 grow"></div>
                </div>
                <div className="flex flex-col pb-8 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#FFD200] text-[#003d75] text-[12px] font-black px-3 py-1 rounded-lg">PASO 2</span>
                    <p className="text-[#003d75] dark:text-white text-xl font-black">Selección de flota</p>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed md:max-w-md">
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
                    <p className="text-[#003d75] dark:text-white text-xl font-black">Te contactamos</p>
                  </div>
                  <p className="text-[#003d75] dark:text-blue-300 font-black text-base leading-relaxed">
                    Un asesor experto te escribirá por WhatsApp en menos de 5 minutos para finalizar los detalles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: FAQs & Support */}
          <div className="lg:col-span-5 space-y-8">
            <h3 className="text-[#003d75] dark:text-white tracking-tight text-3xl font-black leading-tight">Preguntas Frecuentes</h3>
            <div className="space-y-4">
              {[
                { q: "¿Incluye seguro el alquiler?", a: "Sí, todas nuestras cotizaciones incluyen protección básica o premium según elijas." },
                { q: "¿Cómo funciona el depósito?", a: "El depósito se realiza de forma segura mediante Stripe para garantizar tu reserva." },
                { q: "¿Soporte en español 24/7?", a: "¡Absolutamente! Nuestro equipo está disponible las 24 horas para asistirte en tu idioma." }
              ].map((faq, i) => (
                <div key={i} className="bg-white dark:bg-slate-800/50 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer group">
                  <div className="flex justify-between items-center">
                    <p className="text-slate-900 dark:text-white font-black text-base md:text-lg">{faq.q}</p>
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
                className="flex h-16 items-center justify-center gap-x-4 rounded-[1.5rem] bg-[#003d75]/5 dark:bg-[#003d75]/20 px-10 cursor-pointer border border-[#003d75]/10 transition-all hover:bg-[#003d75]/10 hover:shadow-xl group"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-[#003d75] text-white">
                  <span className="material-symbols-outlined text-xl">help</span>
                </div>
                <div className="text-left">
                  <p className="text-[#003d75] dark:text-blue-300 text-lg font-black leading-tight">¿Tienes dudas?</p>
                  <p className="text-[#003d75]/70 dark:text-blue-300/70 text-sm font-bold">Habla con un asesor por WhatsApp</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0f1923]/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50">
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
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}

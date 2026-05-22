import { login, sendMagicLink, requestPasswordReset } from './actions'
import { getSystemSettings } from '@/app/utils/actions/settings'
import { Mail, KeyRound, Zap } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magic?: string; reset?: string; email?: string }>
}) {
  const params = await searchParams
  const settings = await getSystemSettings()

  const isMagicSent = params.magic === 'sent'
  const isResetSent = params.reset === 'sent'
  const sentEmail = params.email ? decodeURIComponent(params.email) : ''

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[grid-slate-200_1px_1px] [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-slate-950 dark:bg-[grid-slate-800_1px_1px]">
      <div className="w-full max-w-md relative">
        <div className="absolute inset-0 -z-10 bg-indigo-500/10 blur-3xl rounded-full" />

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 space-y-8 overflow-hidden relative">

          {/* Header */}
          <div className="text-center space-y-4">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings.crm_name} className="h-16 w-auto mx-auto mb-4" />
            ) : (
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {settings?.crm_name?.split(' ')[0] || 'Go'}{' '}
                <span className="text-indigo-600">{settings?.crm_name?.split(' ').slice(1).join(' ') || 'Easy CRM'}</span>
              </h1>
            )}
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {settings?.crm_tagline || 'Ventas y Renta de Autos Florida'}
            </p>
          </div>

          {/* Magic Link sent confirmation */}
          {isMagicSent && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl text-center space-y-2">
              <Mail className="w-8 h-8 text-indigo-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Revisa tu correo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enviamos un enlace de acceso a <span className="font-semibold text-indigo-600">{sentEmail}</span>. El enlace expira en 1 hora.
              </p>
            </div>
          )}

          {/* Password reset sent confirmation */}
          {isResetSent && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-center space-y-2">
              <KeyRound className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Correo enviado</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Si <span className="font-semibold text-emerald-600">{sentEmail}</span> tiene una cuenta, recibirá instrucciones para restablecer la contraseña.
              </p>
            </div>
          )}

          {/* Login form */}
          {!isMagicSent && !isResetSent && (
            <form className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">
                    Email corporativo
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@goeasy.com"
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {params.error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in slide-in-from-top-1">
                  {params.error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  formAction={login}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  Iniciar Sesión
                </button>

                {/* Divider */}
                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">o</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>

                {/* Magic Link */}
                <button
                  formAction={sendMagicLink}
                  className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Zap className="w-4 h-4 text-indigo-500" />
                  Acceder con Magic Link
                </button>

                {/* Forgot Password */}
                <button
                  formAction={requestPasswordReset}
                  className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Olvidé mi contraseña
                </button>
              </div>
            </form>
          )}

          {/* Back to login link when confirmation shown */}
          {(isMagicSent || isResetSent) && (
            <a
              href="/login"
              className="block text-center text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
            >
              ← Volver al inicio de sesión
            </a>
          )}

          {/* Footer */}
          <div className="pt-4 text-center border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © 2026 Go Easy Florida · Sistema de Gestión Interna
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { nextUrl } = request
  
  // Lista de rutas públicas que no deben ser redirigidas o protegidas globalmente
  const publicRoutes = ['/voucher', '/cotizacion', '/landing', '/login', '/auth', '/api/public']
  const isPublicRoute = publicRoutes.some(route => nextUrl.pathname.startsWith(route)) || nextUrl.pathname === '/'

  // Actualmente la protección se maneja en los Layouts (como dashboard/layout.tsx),
  // pero definimos este whitelist para seguir el plan y facilitar futuras protecciones globales.
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

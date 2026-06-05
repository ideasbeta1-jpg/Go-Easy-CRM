import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { nextUrl } = request

  // Rutas públicas que no requieren sesión de Supabase
  const publicRoutes = ['/voucher', '/cotizacion', '/landing', '/login', '/auth', '/api/public', '/landing_puerto_rico', '/typ']
  const isPublicRoute = publicRoutes.some(route => nextUrl.pathname.startsWith(route)) || nextUrl.pathname === '/'

  if (isPublicRoute) {
    return NextResponse.next({ request })
  }

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

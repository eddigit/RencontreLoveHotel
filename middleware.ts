import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl

    // Routes d'administration - seuls les admins
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Routes de messages - utilisateurs connectés uniquement
    if (pathname.startsWith('/messages')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      // Vérifier que l'email est vérifié
      if (!token.email_verified) {
        return NextResponse.redirect(new URL('/verify-email-pending', req.url))
      }
    }

    // Routes de profil - utilisateurs connectés uniquement
    if (pathname.startsWith('/profile')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // API routes sensibles
    if (pathname.startsWith('/api/')) {
      // Routes admin API
      if (pathname.startsWith('/api/admin')) {
        if (!token || token.role !== 'admin') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
      
      // Routes utilisateur connecté
      if (pathname.startsWith('/api/photos') || 
          pathname.startsWith('/api/events') ||
          pathname.startsWith('/api/users')) {
        if (!token) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Autoriser les routes publiques
        const { pathname } = req.nextUrl
        
        // Routes publiques
        const publicRoutes = [
          '/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/verify-email-pending',
          '/about',
          '/terms',
          '/concept',
          '/loolyyb',
          '/loolyyb-memecoin',
          '/api/auth',
          '/api/verify-email',
          '/api/resend-verification',
          '/api/account/request-password-reset',
          '/api/account/reset-password'
        ]
        
        // Autoriser les routes publiques sans token
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // Pour toutes les autres routes, exiger un token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

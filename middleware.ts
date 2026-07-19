import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import {
  isAdminPath,
  isAuthenticatedApiPath,
  isProtectedPagePath,
  isPublicPath,
  requiresVerifiedEmail
} from "@/lib/route-access"

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl

    // Routes d'administration - seuls les admins
    if (isAdminPath(pathname)) {
      if (!token || token.authBlocked || !token.sub || token.role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Routes communautaires - utilisateurs connectés uniquement
    if (isProtectedPagePath(pathname)) {
      if (!token || token.authBlocked || !token.sub) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      if (requiresVerifiedEmail(pathname) && !token.email_verified) {
        return NextResponse.redirect(new URL('/verify-email-pending', req.url))
      }
    }

    if (isAuthenticatedApiPath(pathname)) {
      if (!token || token.authBlocked || !token.sub) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        if (isPublicPath(pathname)) {
          return true
        }

        // Pour toutes les autres routes, exiger un token
        return Boolean(token?.sub && !token.authBlocked)
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

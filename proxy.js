import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Next.js 15.2+ renamed middleware.js → proxy.js
// DELETE the old middleware.js if it still exists in your project root.
//
// Routes that require sign-in. Everything else is public —
// guests can browse and play all music freely.
// ─────────────────────────────────────────────────────────────
const AUTH_REQUIRED = [
  '/add-song',
  '/profile',
]

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must happen before any auth checks
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Guard: redirect guests away from protected routes
  const needsAuth = AUTH_REQUIRED.some(r => pathname.startsWith(r))
  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Convenience: redirect logged-in users away from /login
  if (user && pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next') ?? '/'
    const destUrl = request.nextUrl.clone()
    destUrl.pathname = next
    destUrl.searchParams.delete('next')
    return NextResponse.redirect(destUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
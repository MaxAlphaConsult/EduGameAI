import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { enforceRateLimit, type RlScope } from '@/lib/rate-limit-durable'
import { clientIp } from '@/lib/rate-limit'

// Öffentliche Schüler-Endpoints, die vor Code-Enumeration / Brute-Force
// geschützt werden. Zentral hier statt pro Route, damit es genau einen
// Drosselungs-Choke-Point gibt (siehe proxy.test.ts, das die Abdeckung prüft).
export const RATE_LIMITED: Record<string, RlScope> = {
  '/api/student/lookup': 'lookup',
  '/api/student/start-session': 'session',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate-Limit für Schüler-Endpoints — VOR jeglicher Auth-Arbeit ──────────
  // Diese Routen brauchen keine Lehrer-Session; daher kurzschließen und den
  // teuren Supabase-getUser()-Call sparen.
  const rlScope = RATE_LIMITED[pathname]
  if (rlScope && request.method === 'POST') {
    const verdict = await enforceRateLimit(rlScope, clientIp(request))
    if (!verdict.ok) {
      return Response.json(
        { error: 'Zu viele Versuche. Bitte einen Moment warten und erneut versuchen.' },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSec) } },
      )
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  const { data: { user } } = await supabase.auth.getUser()

  // Dashboard-Routen erfordern Login
  const protectedPaths = ['/dashboard', '/playground', '/modules', '/classes', '/results', '/spiele', '/einstellungen']
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Eingeloggte Nutzer von Login/Signup wegleiten
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

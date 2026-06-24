// Leichter In-Memory-Rate-Limiter (sliding fixed window).
//
// Bewusst KEINE externe Infrastruktur (Redis/Upstash): Auf serverless (Vercel)
// ist der Speicher pro Instanz und flüchtig — das hier ist Defense-in-Depth
// gegen Code-Enumeration, keine harte Garantie. Der Primärschutz ist der
// 8-stellige Zufallscode (10^8 Raum) plus das kurze Aktiv-Fenster eines
// Releases. Der Limiter erhöht die Kosten eines Enumerations-Versuchs
// spürbar, ohne eine ganze Klasse hinter einer Schul-NAT-IP auszusperren.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastSweep = 0

function sweep(now: number) {
  // Abgelaufene Buckets gelegentlich aufräumen, damit die Map nicht wächst.
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k)
  }
}

export interface RateLimitResult {
  ok: boolean
  retryAfterSec: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  bucket.count++
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfterSec: 0 }
}

// Ermittelt die Client-IP aus den Proxy-Headern. `x-real-ip` wird vom Hosting-
// Proxy (Vercel) gesetzt und ist schwerer zu fälschen als der frei wählbare erste
// `x-forwarded-for`-Eintrag — daher bevorzugt. XFF nur als Fallback (lokal/Tests).
// Hinweis: IP-basiertes Limiting ist nicht spoofing-sicher; die per-Release-Grenze
// in start-session ergänzt es um eine nicht client-kontrollierbare Dimension.
export function clientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const xff = request.headers.get('x-forwarded-for') ?? ''
  return xff.split(',')[0]!.trim() || 'unknown'
}

// Baut einen Limiter-Schlüssel aus Client-IP und einem Scope, damit verschiedene
// Endpoints getrennte Kontingente haben.
export function clientKey(request: Request, scope: string): string {
  return `${scope}:${clientIp(request)}`
}

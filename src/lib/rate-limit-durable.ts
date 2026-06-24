import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { rateLimit as memRateLimit } from './rate-limit'

// Durable, instanzübergreifende Rate-Limits über Upstash Redis (REST-API, läuft
// auf Node- UND Edge-Runtime).
//
// Warum durable: Die Next-Proxy-Doku warnt ausdrücklich davor, sich in der
// Proxy/Middleware auf geteilten Modul-/Global-State zu verlassen — auf Vercel
// ist In-Memory pro Lambda-Instanz und flüchtig. Ein Enumeration-/Brute-Force-
// Guard braucht aber einen Zähler, den sich alle Instanzen teilen.
//
// Fehlen die Upstash-Env-Variablen (lokal, Preview, oder noch nicht
// provisioniert), fällt der Limiter transparent auf den In-Memory-Limiter
// zurück — alles funktioniert weiter, nur eben best-effort.

export type RlScope = 'lookup' | 'session'

const LIMIT = 100
const WINDOW = '60 s' // Upstash-Notation
const WINDOW_MS = 60_000 // In-Memory-Fallback

type Limiters = Record<RlScope, Ratelimit>
// undefined = noch nicht initialisiert; null = nicht konfiguriert (Fallback).
let cached: Limiters | null | undefined

function getLimiters(): Limiters | null {
  if (cached !== undefined) return cached
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    cached = null
    return null
  }
  try {
    const redis = new Redis({ url, token })
    const make = (prefix: string) =>
      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMIT, WINDOW), prefix, analytics: false })
    cached = { lookup: make('rl:lookup'), session: make('rl:session') }
  } catch (err) {
    console.error('[rate-limit] Upstash-Init fehlgeschlagen — In-Memory-Fallback', err)
    cached = null
  }
  return cached
}

export interface RateLimitVerdict {
  ok: boolean
  retryAfterSec: number
}

// Prüft und verbucht einen Zugriff. `identifier` ist i.d.R. die Client-IP.
export async function enforceRateLimit(scope: RlScope, identifier: string): Promise<RateLimitVerdict> {
  const limiters = getLimiters()
  if (limiters) {
    try {
      const { success, reset } = await limiters[scope].limit(identifier)
      return { ok: success, retryAfterSec: success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000)) }
    } catch (err) {
      // Store-Ausfall: bewusst fail-open (Verfügbarkeit vor strikter Drosselung),
      // aber geloggt, damit Ausfälle sichtbar sind.
      console.error('[rate-limit] Upstash-Fehler — fail-open', err)
      return { ok: true, retryAfterSec: 0 }
    }
  }
  // Kein Upstash konfiguriert → In-Memory (best effort).
  return memRateLimit(`${scope}:${identifier}`, LIMIT, WINDOW_MS)
}

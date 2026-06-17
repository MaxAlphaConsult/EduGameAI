// Zentrale Reaktions-Helper für alle Spiele — Konfetti, Schütteln, Pop.
// Lazy-load von canvas-confetti, damit es nicht im SSR-Bundle landet.

type ConfettiModule = typeof import('canvas-confetti')
type ConfettiFn = ConfettiModule extends { default: infer T } ? T : ConfettiModule

let confettiPromise: Promise<ConfettiFn> | null = null

async function loadConfetti(): Promise<ConfettiFn> {
  if (!confettiPromise) {
    confettiPromise = import('canvas-confetti').then((m) => {
      const mod = m as unknown as { default?: ConfettiFn }
      return (mod.default ?? (m as unknown as ConfettiFn))
    })
  }
  return confettiPromise
}

export interface BurstOptions {
  /** Stärke des Bursts. Default: 'normal' */
  intensitaet?: 'klein' | 'normal' | 'gross'
  /** Hauptfarbe (Theme-Akzent) */
  farbe?: string
  /** Ursprung in % der Viewportbreite/-höhe (0–1) */
  origin?: { x: number; y: number }
}

export async function burstKorrekt(opts: BurstOptions = {}) {
  if (typeof window === 'undefined') return
  const confetti = await loadConfetti()
  const stufe = opts.intensitaet ?? 'normal'
  const farbe = opts.farbe ?? '#10B981'

  const farben = [farbe, '#FBBF24', '#34D399', '#60A5FA', '#EC4899']

  const baseConfig = {
    origin: opts.origin ?? { x: 0.5, y: 0.6 },
    colors: farben,
    disableForReducedMotion: true,
  } as const

  switch (stufe) {
    case 'klein':
      confetti({ ...baseConfig, particleCount: 30, spread: 50, startVelocity: 25, scalar: 0.7 })
      break
    case 'gross':
      confetti({ ...baseConfig, particleCount: 140, spread: 120, startVelocity: 55, scalar: 1.1, ticks: 220 })
      // Zweiter, leichter Burst für Tiefe
      setTimeout(() => {
        confetti({ ...baseConfig, particleCount: 60, spread: 90, startVelocity: 35, scalar: 0.8 })
      }, 180)
      break
    case 'normal':
    default:
      confetti({ ...baseConfig, particleCount: 70, spread: 80, startVelocity: 35, scalar: 0.9 })
  }
}

/** Subtilere Konfetti-Variante für Streaks */
export async function burstStreak(streak: number, farbe?: string) {
  if (streak < 3) return
  const intensitaet: BurstOptions['intensitaet'] =
    streak >= 7 ? 'gross' : streak >= 4 ? 'normal' : 'klein'
  await burstKorrekt({ intensitaet, farbe, origin: { x: 0.5, y: 0.3 } })
}

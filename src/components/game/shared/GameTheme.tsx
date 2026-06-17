'use client'

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { GameTheme, getThemeForSkin } from '@/lib/game/theme'

const ThemeContext = createContext<GameTheme | null>(null)

export function useGameTheme(): GameTheme {
  const t = useContext(ThemeContext)
  if (!t) throw new Error('useGameTheme muss innerhalb von <GameThemeProvider> verwendet werden')
  return t
}

interface Props {
  skin: string | null | undefined
  children: ReactNode
  /** Falls true wird der animierte Hintergrund-Effekt gerendert (Sterne, Grid, Partikel). */
  withBackground?: boolean
  className?: string
}

export function GameThemeProvider({ skin, children, withBackground = true, className }: Props) {
  const theme = useMemo(() => getThemeForSkin(skin), [skin])

  // CSS-Variablen, die alle Spiel-Komponenten konsumieren können.
  const cssVars: CSSProperties = {
    ['--g-bg' as string]: theme.bg,
    ['--g-surface' as string]: theme.surface,
    ['--g-surface-alt' as string]: theme.surfaceAlt,
    ['--g-border' as string]: theme.border,
    ['--g-text' as string]: theme.text,
    ['--g-text-muted' as string]: theme.textMuted,
    ['--g-accent' as string]: theme.accent,
    ['--g-accent-soft' as string]: theme.accentSoft,
    ['--g-accent-gradient' as string]: theme.accentGradient,
    ['--g-success' as string]: theme.success,
    ['--g-success-soft' as string]: theme.successSoft,
    ['--g-error' as string]: theme.error,
    ['--g-error-soft' as string]: theme.errorSoft,
    ['--g-warning' as string]: theme.warning,
    ['--g-glow' as string]: theme.glowAccent,
    color: theme.text,
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div
        data-game-theme={theme.id}
        data-mood={theme.mood}
        style={{ ...cssVars, background: theme.bg, minHeight: '100%', position: 'relative' }}
        className={className}
      >
        {withBackground && <BackgroundEffect theme={theme} />}
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    </ThemeContext.Provider>
  )
}

function BackgroundEffect({ theme }: { theme: GameTheme }) {
  switch (theme.backgroundEffect) {
    case 'stars': return <Stars />
    case 'grid': return <Grid color={theme.accent} mood={theme.mood} />
    case 'particles': return <Particles color={theme.accent} />
    case 'rays': return <Rays color={theme.accent} />
    case 'fog': return <Fog color={theme.accent} />
    case 'none':
    default: return null
  }
}

function Stars() {
  // Deterministische Positionen damit SSR/Client matchen
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: ((i * 37 + 13) % 100),
        top: ((i * 53 + 7) % 100),
        size: ((i * 7) % 3) + 1,
        delay: (i % 10) * 0.3,
      })),
    [],
  )
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {stars.map((s) => (
        <motion.span
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#fff',
          }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 3 + (s.id % 3), repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  )
}

function Grid({ color, mood }: { color: string; mood: 'light' | 'dark' }) {
  const lineColor = mood === 'dark' ? `${color}22` : '#00000010'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at center, #000 50%, transparent 100%)',
      }}
    />
  )
}

function Particles({ color }: { color: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: ((i * 41 + 11) % 100),
        size: 6 + (i % 5) * 3,
        delay: (i % 7) * 0.5,
        duration: 8 + (i % 5),
      })),
    [],
  )
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: -20,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            opacity: 0.4,
            filter: 'blur(1px)',
          }}
          animate={{ y: ['0%', '-120vh'], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

function Rays({ color }: { color: string }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: '-20%',
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${color}22 30deg, transparent 60deg, ${color}22 90deg, transparent 120deg, ${color}22 150deg, transparent 180deg, ${color}22 210deg, transparent 240deg, ${color}22 270deg, transparent 300deg, ${color}22 330deg, transparent 360deg)`,
          filter: 'blur(40px)',
          opacity: 0.4,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

function Fog({ color }: { color: string }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: '-20%',
          background: `radial-gradient(circle at 30% 40%, ${color}30, transparent 50%), radial-gradient(circle at 70% 60%, ${color}20, transparent 60%)`,
          filter: 'blur(60px)',
        }}
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-3%', '3%', '-3%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

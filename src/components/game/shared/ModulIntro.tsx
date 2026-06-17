'use client'

import { motion } from 'framer-motion'
import { useGameTheme } from './GameTheme'

interface Props {
  /** Modul-Titel (z. B. Lernziel oder Wissensform) */
  titel: string
  /** Untertitel oder Mission-Briefing */
  untertitel?: string
  /** Anzahl Aufgaben in diesem Modul */
  anzahlAufgaben: number
  /** Geschätzte Spielzeit in Minuten */
  spielzeitMin?: number
  onStart: () => void
}

const SKIN_STORY: Record<string, { icon: string; tagline: string }> = {
  kids:      { icon: '🌟', tagline: 'Bereit für dein Lern-Abenteuer?' },
  mission:   { icon: '🚀', tagline: 'Mission gestartet — Wissen aktivieren' },
  analytics: { icon: '📊', tagline: 'Analyse-Modul — strukturiert lernen' },
  boss:      { icon: '⚔️', tagline: 'Der Boss wartet. Bist du bereit?' },
  sprint:    { icon: '🏁', tagline: 'Schnell denken, schnell antworten' },
  noir:      { icon: '🗝️', tagline: 'Knack das Schloss — Stück für Stück' },
  neon:      { icon: '💫', tagline: 'Folge der Spur durchs Wissen' },
  factory:   { icon: '🔧', tagline: 'Bau deinen Wissensapparat zusammen' },
  lab:       { icon: '🧪', tagline: 'Experiment läuft. Genaues Beobachten zählt.' },
}

export function ModulIntro({ titel, untertitel, anzahlAufgaben, spielzeitMin, onStart }: Props) {
  const theme = useGameTheme()
  const story = SKIN_STORY[theme.id] ?? SKIN_STORY.mission

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto p-6 flex flex-col items-center text-center gap-5"
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        className="text-7xl"
        style={{ filter: `drop-shadow(${theme.glowAccent})` }}
      >
        {story.icon}
      </motion.div>

      <div>
        <div
          className="text-[10px] uppercase tracking-[3px] font-bold mb-2"
          style={{ color: theme.accent }}
        >
          {story.tagline}
        </div>
        <h2
          className="text-3xl font-extrabold leading-tight bg-clip-text text-transparent"
          style={{ backgroundImage: theme.accentGradient }}
        >
          {titel}
        </h2>
        {untertitel && (
          <p className="text-sm mt-3 leading-relaxed opacity-80" style={{ color: theme.text }}>
            {untertitel}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Pill>{anzahlAufgaben} {anzahlAufgaben === 1 ? 'Aufgabe' : 'Aufgaben'}</Pill>
        {spielzeitMin && <Pill>~{spielzeitMin} Min</Pill>}
        <Pill>{theme.label}</Pill>
      </div>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="mt-2 px-8 py-4 rounded-2xl text-white font-bold text-base"
        style={{ background: theme.accentGradient, boxShadow: theme.glowAccent }}
      >
        Los geht's →
      </motion.button>
    </motion.div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  const theme = useGameTheme()
  return (
    <span
      className="text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        color: theme.textMuted,
      }}
    >
      {children}
    </span>
  )
}

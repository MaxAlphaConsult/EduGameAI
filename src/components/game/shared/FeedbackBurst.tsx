'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ReactNode } from 'react'
import { useGameTheme } from './GameTheme'

interface ResultBannerProps {
  status: 'idle' | 'korrekt' | 'falsch'
  /** Optionaler Untertitel — z. B. "+10 XP" oder "Streak 3×" */
  detail?: string
  /** Hilfetext oder Erklärung wenn falsch beantwortet */
  erklaerung?: ReactNode
}

/**
 * Banner unter der Aufgabe, das die Antwort auswertet.
 * Animiert mit Pop bei korrekt, Shake bei falsch.
 */
export function ResultBanner({ status, detail, erklaerung }: ResultBannerProps) {
  const theme = useGameTheme()
  if (status === 'idle') return null

  const ok = status === 'korrekt'

  return (
    <AnimatePresence>
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={
          ok
            ? { opacity: 1, y: 0, scale: [0.95, 1.05, 1] }
            : { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }
        }
        transition={{ duration: ok ? 0.45 : 0.4, ease: 'easeOut' }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl px-4 py-3 border flex flex-col gap-1"
        style={{
          background: ok ? theme.successSoft : theme.errorSoft,
          borderColor: ok ? theme.success : theme.error,
          color: ok ? theme.success : theme.error,
        }}
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="text-lg">{ok ? '🎉' : '💡'}</span>
          <span>{ok ? 'Richtig!' : 'Nicht ganz'}</span>
          {detail && (
            <span
              className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: ok ? theme.success : theme.error, color: '#fff' }}
            >
              {detail}
            </span>
          )}
        </div>
        {erklaerung && (
          <div className="text-xs leading-relaxed opacity-90" style={{ color: theme.text }}>
            {erklaerung}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Großes Vollbild-Feedback bei besonderen Momenten (z. B. Streak-Level-up, Modul-Sieg).
 * Wird über `show` gesteuert; danach blendet es selbst aus.
 */
export function CelebrationOverlay({
  show,
  emoji = '🎉',
  titel,
  untertitel,
}: {
  show: boolean
  emoji?: string
  titel: string
  untertitel?: string
}) {
  const theme = useGameTheme()
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div
            className="px-10 py-6 rounded-3xl text-center"
            style={{
              background: theme.accentGradient,
              color: '#fff',
              boxShadow: theme.glowAccent,
            }}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.8 }}
              className="text-5xl mb-2"
            >
              {emoji}
            </motion.div>
            <div className="text-xl font-extrabold tracking-tight">{titel}</div>
            {untertitel && <div className="text-sm font-medium opacity-90 mt-1">{untertitel}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './GameTheme'

interface Props {
  /** Aufgaben-Index (0-basiert) */
  aktuell: number
  /** Gesamtzahl Aufgaben */
  gesamt: number
  xp: number
  streak: number
  leben: number
  /** Max. mögliche Leben (für Anzeige der grauen Herzen). Default 3 */
  maxLeben?: number
  /** Label rechts (z. B. Skin-Name oder Modul-Titel) */
  badgeLabel?: string
}

export function GameHUD({ aktuell, gesamt, xp, streak, leben, maxLeben = 3, badgeLabel }: Props) {
  const theme = useGameTheme()
  const fortschritt = Math.min(100, Math.round((aktuell / Math.max(1, gesamt)) * 100))

  return (
    <div
      style={{
        background: theme.mood === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.65)',
        borderColor: theme.border,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      className="relative border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm overflow-hidden"
    >
      {/* Badge */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="inline-flex items-center justify-center rounded-xl text-base flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: theme.accentSoft,
            border: `1px solid ${theme.border}`,
          }}
        >
          {theme.badge}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 truncate">
            {badgeLabel ?? theme.label}
          </span>
          <span className="text-xs font-semibold tabular-nums">
            {Math.min(aktuell, gesamt)} / {gesamt} gelöst
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Streak */}
      <AnimatePresence mode="popLayout">
        {streak >= 2 && (
          <motion.div
            key="streak"
            initial={{ scale: 0, opacity: 0, x: -10 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${theme.warning}, ${theme.accent})`,
              color: '#fff',
              boxShadow: theme.glowAccent,
            }}
          >
            🔥 <span className="tabular-nums">{streak}×</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP */}
      <motion.div
        key={xp}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1 text-sm font-bold tabular-nums"
        style={{ color: theme.warning }}
      >
        ⭐ {xp}
      </motion.div>

      {/* Lives */}
      <div className="flex items-center gap-0.5" aria-label={`${leben} von ${maxLeben} Leben`}>
        {Array.from({ length: maxLeben }).map((_, i) => {
          const aktiv = i < leben
          return (
            <motion.span
              key={i}
              animate={{ scale: aktiv ? 1 : 0.7, opacity: aktiv ? 1 : 0.25 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-base leading-none"
            >
              {aktiv ? '❤️' : '🤍'}
            </motion.span>
          )
        })}
      </div>

      {/* Progress (am unteren Rand, dünn, voller Breite) */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[3px]"
        style={{ background: theme.mood === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: theme.accentGradient }}
          initial={{ width: 0 }}
          animate={{ width: `${fortschritt}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

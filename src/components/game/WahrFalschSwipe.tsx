'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

export interface SwipeAufgabe {
  aufgabe_id: string
  text: string
  /** Erste Lösung muss 'wahr' oder 'falsch' (case-insensitive) sein */
  loesungen: string[]
  hilfen?: string[]
}

interface Props {
  aufgaben: SwipeAufgabe[]
  onAufgabeAntwort?: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  onSpielVorbei?: (stats: { korrekt: number; gesamt: number }) => void
}

function istWahr(aufgabe: SwipeAufgabe): boolean {
  return /^w(ahr)?$/i.test(aufgabe.loesungen[0]?.trim() ?? '')
}

export function WahrFalschSwipe({ aufgaben, onAufgabeAntwort, onSpielVorbei }: Props) {
  const theme = useGameTheme()
  const [index, setIndex] = useState(0)
  const [korrektCount, setKorrektCount] = useState(0)
  const [fertig, setFertig] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<'korrekt' | 'falsch' | null>(null)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacityLeft = useTransform(x, [-200, -40, 0], [1, 0.6, 0])
  const opacityRight = useTransform(x, [0, 40, 200], [0, 0.6, 1])

  const aktuell = aufgaben[index]
  const total = aufgaben.length

  function entscheiden(antwortWahr: boolean) {
    if (!aktuell || fertig) return
    const erwartetWahr = istWahr(aktuell)
    const istKorrekt = antwortWahr === erwartetWahr
    setLastFeedback(istKorrekt ? 'korrekt' : 'falsch')

    if (onAufgabeAntwort) {
      onAufgabeAntwort(aktuell.aufgabe_id, [antwortWahr ? 'wahr' : 'falsch'], istKorrekt)
    }
    if (istKorrekt) {
      setKorrektCount((c) => c + 1)
      burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.5 } })
    }

    setTimeout(() => {
      setLastFeedback(null)
      x.set(0)
      if (index + 1 >= total) {
        setFertig(true)
        if (onSpielVorbei) {
          setTimeout(() => onSpielVorbei({ korrekt: korrektCount + (istKorrekt ? 1 : 0), gesamt: total }), 800)
        }
      } else {
        setIndex((i) => i + 1)
      }
    }, 600)
  }

  function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    const SCHWELLE = 120
    if (info.offset.x > SCHWELLE) entscheiden(true)
    else if (info.offset.x < -SCHWELLE) entscheiden(false)
    else x.set(0)
  }

  if (fertig) {
    return (
      <ResultBanner
        status={korrektCount >= Math.ceil(total / 2) ? 'korrekt' : 'falsch'}
        detail={`${korrektCount} / ${total} richtig`}
      />
    )
  }

  if (!aktuell) return null

  return (
    <div className="flex flex-col gap-5 select-none">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Karte <span style={{ color: theme.text }}>{index + 1}</span> / {total}
        </span>
        <span style={{ color: theme.textMuted }}>
          Richtig: <span style={{ color: theme.success }}>{korrektCount}</span>
        </span>
      </div>

      <div className="relative" style={{ height: 280 }}>
        {/* Hintergrund-Hinweise links/rechts */}
        <motion.div
          style={{ opacity: opacityLeft }}
          className="absolute inset-y-0 left-0 w-20 flex items-center justify-center pointer-events-none"
        >
          <div className="text-5xl">❌</div>
        </motion.div>
        <motion.div
          style={{ opacity: opacityRight }}
          className="absolute inset-y-0 right-0 w-20 flex items-center justify-center pointer-events-none"
        >
          <div className="text-5xl">✅</div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={aktuell.aufgabe_id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={onDragEnd}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={lastFeedback === 'korrekt' ? { x: 400, opacity: 0 } : { x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="absolute inset-x-6 top-0 bottom-0 rounded-3xl flex flex-col items-center justify-center p-6 cursor-grab active:cursor-grabbing"
            style={{
              x,
              rotate,
              background: theme.accentGradient,
              boxShadow: theme.glowAccent,
              border: `2px solid ${theme.border}`,
              color: '#fff',
            }}
          >
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-3">Aussage</span>
            <p className="text-center text-lg sm:text-xl font-bold leading-snug">{aktuell.text}</p>
            <div className="mt-6 flex items-center gap-3 text-xs opacity-70">
              <span>← Falsch</span>
              <span className="opacity-40">·</span>
              <span>Richtig →</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => entscheiden(false)}
          className="flex-1 max-w-[180px] rounded-2xl py-3.5 text-base font-extrabold text-white"
          style={{ background: theme.error, boxShadow: `0 4px 18px ${theme.error}66` }}
        >
          ❌ Falsch
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => entscheiden(true)}
          className="flex-1 max-w-[180px] rounded-2xl py-3.5 text-base font-extrabold text-white"
          style={{ background: theme.success, boxShadow: `0 4px 18px ${theme.success}66` }}
        >
          ✅ Wahr
        </motion.button>
      </div>

      <p className="text-[10px] text-center font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>
        Wische die Karte • oder nutze die Buttons • oder ←/→ auf der Tastatur
      </p>
    </div>
  )
}

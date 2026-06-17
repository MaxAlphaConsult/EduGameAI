'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

interface Option {
  text: string
  isCorrect: boolean
}

export interface CrackerAufgabe {
  aufgabe_id: string
  text: string
  optionen: Option[]
  hilfen?: string[]
}

interface Props {
  /** Jede Aufgabe = eine Stelle im Code. */
  aufgaben: CrackerAufgabe[]
  onAufgabeAntwort?: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  onSpielVorbei?: (stats: { korrekt: number; gesamt: number }) => void
}

type SlotStatus = 'offen' | 'aktiv' | 'falsch' | 'korrekt'

interface Slot {
  aufgabeIdx: number
  status: SlotStatus
  versuche: number
}

export function CodeCracker({ aufgaben, onAufgabeAntwort, onSpielVorbei }: Props) {
  const theme = useGameTheme()
  const total = aufgaben.length
  const [slots, setSlots] = useState<Slot[]>(() =>
    aufgaben.map((_, i) => ({ aufgabeIdx: i, status: i === 0 ? 'aktiv' : 'offen', versuche: 0 })),
  )
  const [aktiveStelle, setAktiveStelle] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealPhase, setRevealPhase] = useState<'idle' | 'reveal'>('idle')
  const [fertig, setFertig] = useState(false)

  const aktuelleAufgabe = aufgaben[aktiveStelle]
  const optionen = useMemo(() => {
    if (!aktuelleAufgabe) return []
    const list = [...aktuelleAufgabe.optionen]
    // Deterministisch shuffeln basierend auf aufgabe_id
    let seed = 0
    for (let i = 0; i < aktuelleAufgabe.aufgabe_id.length; i++)
      seed = (seed * 31 + aktuelleAufgabe.aufgabe_id.charCodeAt(i)) | 0
    const rand = () => {
      seed = (seed * 9301 + 49297) | 0
      return ((seed >>> 0) % 1000) / 1000
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
  }, [aktuelleAufgabe])

  function antworten(i: number) {
    if (selectedOption !== null || revealPhase !== 'idle' || fertig) return
    setSelectedOption(i)
    const istKorrekt = optionen[i].isCorrect

    if (onAufgabeAntwort && aktuelleAufgabe) {
      onAufgabeAntwort(aktuelleAufgabe.aufgabe_id, [optionen[i].text], istKorrekt)
    }

    setTimeout(() => {
      setRevealPhase('reveal')
      if (istKorrekt) {
        burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.4 } })
      }

      setTimeout(() => {
        setSlots((prev) =>
          prev.map((s) =>
            s.aufgabeIdx === aktiveStelle
              ? { ...s, status: istKorrekt ? 'korrekt' : 'falsch', versuche: s.versuche + 1 }
              : s,
          ),
        )

        if (istKorrekt) {
          const naechste = aktiveStelle + 1
          if (naechste >= total) {
            setFertig(true)
            burstKorrekt({ farbe: theme.success, intensitaet: 'gross' })
            setTimeout(() => onSpielVorbei?.({ korrekt: total, gesamt: total }), 1500)
          } else {
            setSlots((prev) =>
              prev.map((s) => (s.aufgabeIdx === naechste ? { ...s, status: 'aktiv' } : s)),
            )
            setAktiveStelle(naechste)
          }
        }
        setSelectedOption(null)
        setRevealPhase('idle')
        // Bei Falsch: gleiche Stelle bleibt aktiv, Spieler kann nochmal versuchen
        if (!istKorrekt) {
          setSlots((prev) =>
            prev.map((s) =>
              s.aufgabeIdx === aktiveStelle ? { ...s, status: 'aktiv' } : s,
            ),
          )
        }
      }, 1200)
    }, 800)
  }

  if (fertig) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280 }} className="text-7xl">
          🔓
        </motion.div>
        <ResultBanner status="korrekt" detail="Tresor geknackt!" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tresor-Display: alle Stellen als Tumbler */}
      <div className="flex justify-center gap-2 flex-wrap">
        {slots.map((slot, i) => {
          const aufg = aufgaben[slot.aufgabeIdx]
          const showLabel =
            slot.status === 'korrekt'
              ? aufg.optionen.find((o) => o.isCorrect)?.text.charAt(0).toUpperCase() ?? '✓'
              : slot.status === 'aktiv'
              ? '?'
              : slot.status === 'falsch'
              ? '✗'
              : '·'

          let bg = 'rgba(0,0,0,0.5)'
          let color = theme.textMuted
          let border = theme.border
          let glow = 'none'
          if (slot.status === 'aktiv') {
            bg = `linear-gradient(180deg, ${theme.warning}, ${theme.warning}DD)`
            color = '#fff'
            border = theme.warning
            glow = `0 0 24px ${theme.warning}99`
          } else if (slot.status === 'korrekt') {
            bg = `linear-gradient(180deg, ${theme.success}, ${theme.success}DD)`
            color = '#fff'
            border = theme.success
            glow = `0 0 20px ${theme.success}66`
          } else if (slot.status === 'falsch') {
            bg = `linear-gradient(180deg, ${theme.error}, ${theme.error}DD)`
            color = '#fff'
            border = theme.error
          }

          return (
            <motion.div
              key={i}
              animate={
                slot.status === 'aktiv'
                  ? { y: [0, -3, 0], boxShadow: [glow, glow, glow] }
                  : slot.status === 'falsch'
                  ? { x: [0, -6, 6, -3, 3, 0] }
                  : {}
              }
              transition={
                slot.status === 'aktiv'
                  ? { duration: 1.4, repeat: Infinity }
                  : { duration: 0.4 }
              }
              className="flex flex-col items-center justify-center font-black text-2xl rounded-xl"
              style={{
                width: 60,
                height: 80,
                background: bg,
                color,
                border: `2px solid ${border}`,
                boxShadow: glow,
              }}
            >
              <span className="text-xs opacity-70 leading-none">{i + 1}</span>
              <span>{showLabel}</span>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: theme.warning }}>
        🔐 Stelle {aktiveStelle + 1} von {total}
      </div>

      {/* Frage */}
      <motion.div
        key={aktuelleAufgabe?.aufgabe_id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border px-4 py-4 text-center text-base font-bold leading-snug"
        style={{
          background: theme.accentSoft,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {aktuelleAufgabe?.text}
      </motion.div>

      {/* Antworten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {optionen.map((opt, i) => {
          const isSelected = selectedOption === i
          const revealedRight = revealPhase === 'reveal' && opt.isCorrect
          const revealedWrong = revealPhase === 'reveal' && isSelected && !opt.isCorrect

          let bg = theme.surface
          let border = theme.border
          let color = theme.text

          if (isSelected && revealPhase === 'idle') {
            bg = theme.warning
            color = '#fff'
            border = theme.warning
          } else if (revealedRight) {
            bg = theme.success
            color = '#fff'
            border = theme.success
          } else if (revealedWrong) {
            bg = theme.error
            color = '#fff'
            border = theme.error
          }

          return (
            <motion.button
              key={i}
              type="button"
              disabled={selectedOption !== null}
              onClick={() => antworten(i)}
              whileHover={selectedOption === null ? { scale: 1.02 } : undefined}
              whileTap={selectedOption === null ? { scale: 0.97 } : undefined}
              animate={
                isSelected && revealPhase === 'idle'
                  ? { opacity: [1, 0.6, 1], transition: { duration: 0.5, repeat: Infinity } }
                  : revealedRight
                  ? { scale: [1, 1.05, 1] }
                  : revealedWrong
                  ? { x: [0, -8, 8, -4, 4, 0] }
                  : {}
              }
              className="rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold"
              style={{ background: bg, borderColor: border, color }}
            >
              {opt.text}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

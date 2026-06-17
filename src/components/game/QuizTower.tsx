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

export interface TowerAufgabe {
  aufgabe_id: string
  text: string
  optionen: Option[]
  hilfen?: string[]
}

interface Props {
  aufgaben: TowerAufgabe[]
  onAufgabeAntwort?: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  onSpielVorbei?: (stats: { korrekt: number; gesamt: number }) => void
}

interface Block {
  id: number
  isKorrekt: boolean
  /** Versatz in % nach links/rechts (negativ = links, positiv = rechts). */
  offset: number
  rotation: number
  farbe: string
}

const MAX_OFFSET = 14
const MAX_OFFSET_BEVOR_FALL = 28

export function QuizTower({ aufgaben, onAufgabeAntwort, onSpielVorbei }: Props) {
  const theme = useGameTheme()
  const total = aufgaben.length

  const [index, setIndex] = useState(0)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'frage' | 'reveal' | 'einsturz' | 'fertig'>('frage')
  const [korrektCount, setKorrektCount] = useState(0)

  const aktuell = aufgaben[index]
  const optionen = useMemo(() => {
    if (!aktuell) return []
    const list = [...aktuell.optionen]
    let seed = 0
    for (let i = 0; i < aktuell.aufgabe_id.length; i++)
      seed = (seed * 31 + aktuell.aufgabe_id.charCodeAt(i)) | 0
    const rand = () => {
      seed = (seed * 9301 + 49297) | 0
      return ((seed >>> 0) % 1000) / 1000
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktuell?.aufgabe_id])

  function antworten(i: number) {
    if (phase !== 'frage' || selected !== null) return
    setSelected(i)
    const istKorrekt = optionen[i].isCorrect

    if (onAufgabeAntwort && aktuell) {
      onAufgabeAntwort(aktuell.aufgabe_id, [optionen[i].text], istKorrekt)
    }

    setTimeout(() => {
      setPhase('reveal')

      // Block hinzufügen — bei korrekt sauber zentriert, bei falsch verschoben
      const aktuellerOffset = blocks.reduce((sum, b) => sum + b.offset, 0)
      const neuerOffset = istKorrekt
        ? Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, aktuellerOffset + (Math.random() * 4 - 2)))
        : (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 10)
      const totalOffset = Math.abs(aktuellerOffset + neuerOffset)

      const farbe = istKorrekt
        ? theme.success
        : theme.error

      const neuerBlock: Block = {
        id: blocks.length,
        isKorrekt: istKorrekt,
        offset: neuerOffset,
        rotation: istKorrekt ? (Math.random() * 4 - 2) : (Math.random() * 10 - 5),
        farbe,
      }

      setBlocks((prev) => [...prev, neuerBlock])

      if (istKorrekt) {
        setKorrektCount((c) => c + 1)
        burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.5 } })
      }

      // Einsturz wenn Gesamt-Offset zu groß
      if (totalOffset > MAX_OFFSET_BEVOR_FALL) {
        setTimeout(() => {
          setPhase('einsturz')
          setTimeout(() => {
            setPhase('fertig')
            setTimeout(() => onSpielVorbei?.({ korrekt: korrektCount + (istKorrekt ? 1 : 0), gesamt: total }), 1200)
          }, 1500)
        }, 800)
        return
      }

      setTimeout(() => {
        if (index + 1 >= total) {
          setPhase('fertig')
          if (istKorrekt) burstKorrekt({ farbe: theme.warning, intensitaet: 'gross' })
          setTimeout(() => onSpielVorbei?.({ korrekt: korrektCount + (istKorrekt ? 1 : 0), gesamt: total }), 1200)
        } else {
          setIndex((i) => i + 1)
          setSelected(null)
          setPhase('frage')
        }
      }, 900)
    }, 600)
  }

  const cumulativeOffsets = useMemo(() => {
    let sum = 0
    return blocks.map((b) => {
      sum += b.offset
      return sum
    })
  }, [blocks])

  const fertig = phase === 'fertig'
  const istEingestuerzt = phase === 'einsturz' || (fertig && cumulativeOffsets.some((o) => Math.abs(o) > MAX_OFFSET_BEVOR_FALL))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Frage <span style={{ color: theme.text }}>{Math.min(index + 1, total)}</span> / {total}
        </span>
        <span style={{ color: theme.textMuted }}>
          Höhe: <span style={{ color: theme.success }}>{korrektCount} Blöcke</span>
        </span>
      </div>

      {/* Turm-Bereich */}
      <div className="relative w-full" style={{ height: 260, overflow: 'hidden' }}>
        {/* Bodenlinie */}
        <div
          className="absolute left-0 right-0 bottom-0 h-1 rounded-full"
          style={{ background: theme.textMuted, opacity: 0.4 }}
        />
        {/* Blöcke gestapelt */}
        <div className="absolute left-1/2 bottom-1 flex flex-col-reverse items-center" style={{ transform: 'translateX(-50%)' }}>
          <AnimatePresence>
            {blocks.map((b, i) => {
              const offset = cumulativeOffsets[i]
              return (
                <motion.div
                  key={b.id}
                  initial={{ y: -260, opacity: 0, scale: 1.1 }}
                  animate={
                    istEingestuerzt
                      ? {
                          y: 200,
                          x: (i + 1) * (Math.random() > 0.5 ? 80 : -80),
                          rotate: i * (Math.random() > 0.5 ? 80 : -80),
                          opacity: 0,
                        }
                      : { y: 0, opacity: 1, scale: 1, x: `${offset}%` }
                  }
                  transition={
                    istEingestuerzt
                      ? { duration: 0.9, ease: 'easeIn', delay: i * 0.04 }
                      : { type: 'spring', stiffness: 320, damping: 22 }
                  }
                  style={{
                    width: 120,
                    height: 28,
                    background: `linear-gradient(180deg, ${b.farbe}, ${b.farbe}AA)`,
                    border: `2px solid ${b.farbe}`,
                    borderRadius: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                    rotate: `${b.rotation}deg`,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                  className="flex items-center justify-center"
                >
                  Block #{i + 1}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
        {/* Schwank-Warnung */}
        {Math.abs(cumulativeOffsets[cumulativeOffsets.length - 1] ?? 0) > MAX_OFFSET && phase !== 'einsturz' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: theme.error,
              color: '#fff',
            }}
          >
            ⚠️ Wackelt!
          </motion.div>
        )}
      </div>

      {/* Frage + Antworten */}
      {phase !== 'fertig' && phase !== 'einsturz' && aktuell && (
        <>
          <motion.div
            key={aktuell.aufgabe_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border px-4 py-3 text-center text-base font-bold leading-snug"
            style={{ background: theme.accentSoft, borderColor: theme.border, color: theme.text }}
          >
            {aktuell.text}
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {optionen.map((opt, i) => {
              const isSelected = selected === i
              const revealedRight = phase === 'reveal' && opt.isCorrect
              const revealedWrong = phase === 'reveal' && isSelected && !opt.isCorrect

              let bg = theme.surface
              let border = theme.border
              let color = theme.text

              if (phase === 'frage' && isSelected) {
                bg = theme.accent
                color = '#fff'
                border = theme.accent
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
                  disabled={phase !== 'frage'}
                  onClick={() => antworten(i)}
                  whileHover={phase === 'frage' ? { scale: 1.02 } : undefined}
                  whileTap={phase === 'frage' ? { scale: 0.97 } : undefined}
                  className="rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold disabled:cursor-default"
                  style={{ background: bg, borderColor: border, color }}
                >
                  {opt.text}
                </motion.button>
              )
            })}
          </div>
        </>
      )}

      {istEingestuerzt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <div className="text-5xl mb-2">💥</div>
          <div className="font-extrabold text-lg" style={{ color: theme.error }}>
            Turm eingestürzt!
          </div>
        </motion.div>
      )}

      <ResultBanner
        status={
          phase !== 'fertig'
            ? 'idle'
            : istEingestuerzt
            ? 'falsch'
            : korrektCount >= Math.ceil(total * 0.5)
            ? 'korrekt'
            : 'falsch'
        }
        detail={fertig ? `${korrektCount} / ${total} richtig` : undefined}
      />
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

const MAX_FEHLER = 6
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split('')

interface Props {
  text: string
  wort: string
  hilfen: string[]
  feedback: { bei_korrekt: string; bei_falsch: string }
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

// Reihenfolge der Strich-Animationen — jeder Strich wird beim Fehlerstand >= index gezeichnet.
type Stroke = { d?: string; type?: 'circle'; cx?: number; cy?: number; r?: number }
const HANGMAN_STROKES: Stroke[] = [
  { type: 'circle', cx: 75, cy: 35, r: 10 }, // Kopf
  { d: 'M 75 45 L 75 85' },                  // Körper
  { d: 'M 75 55 L 55 70' },                  // Linker Arm
  { d: 'M 75 55 L 95 70' },                  // Rechter Arm
  { d: 'M 75 85 L 55 110' },                 // Linkes Bein
  { d: 'M 75 85 L 95 110' },                 // Rechtes Bein
]

export function Hangman({ text, wort, hilfen, feedback, onAntwort }: Props) {
  const theme = useGameTheme()
  const wordUpper = useMemo(() => wort.toUpperCase(), [wort])
  const [geraten, setGeraten] = useState<Set<string>>(new Set())
  const [hilfeIndex, setHilfeIndex] = useState<number | null>(null)
  const [fertig, setFertig] = useState(false)

  const fehler = [...geraten].filter((b) => !wordUpper.includes(b)).length
  const gewonnen = wordUpper.split('').every((b) => b === ' ' || b === '-' || geraten.has(b))
  const verloren = fehler >= MAX_FEHLER

  const rateBuchstabe = useCallback(
    (b: string) => {
      if (fertig || geraten.has(b)) return
      setGeraten((prev) => new Set([...prev, b]))
    },
    [fertig, geraten],
  )

  useEffect(() => {
    if ((gewonnen || verloren) && !fertig) {
      setFertig(true)
      if (gewonnen) burstKorrekt({ farbe: theme.success, intensitaet: 'normal' })
      setTimeout(() => onAntwort([[...geraten].join(',')], gewonnen), 1400)
    }
  }, [gewonnen, verloren, fertig, geraten, onAntwort, theme.success])

  // Keyboard-Input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (fertig) return
      const ch = e.key.toUpperCase()
      if (ALPHABET.includes(ch)) {
        e.preventDefault()
        rateBuchstabe(ch)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fertig, rateBuchstabe])

  const status: 'idle' | 'korrekt' | 'falsch' = !fertig ? 'idle' : gewonnen ? 'korrekt' : 'falsch'

  return (
    <div className="flex flex-col gap-5">
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-base font-bold leading-snug text-center"
        style={{ color: theme.text }}
      >
        {text}
      </motion.p>

      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 120 140" className="w-32 h-40" strokeLinecap="round" strokeLinejoin="round">
          {/* Galgen — immer sichtbar, gedämpft */}
          <line x1="10" y1="130" x2="110" y2="130" stroke={theme.textMuted} strokeWidth="3" opacity="0.5" />
          <line x1="30" y1="130" x2="30" y2="10" stroke={theme.textMuted} strokeWidth="3" opacity="0.5" />
          <line x1="30" y1="10" x2="75" y2="10" stroke={theme.textMuted} strokeWidth="3" opacity="0.5" />
          <line x1="75" y1="10" x2="75" y2="25" stroke={theme.textMuted} strokeWidth="3" opacity="0.5" />

          {/* Animierte Strich-Reihenfolge je nach Fehlerzahl */}
          {HANGMAN_STROKES.map((stroke, i) => {
            const sichtbar = fehler > i
            if (!sichtbar) return null
            if (stroke.type === 'circle') {
              return (
                <motion.circle
                  key={i}
                  cx={stroke.cx}
                  cy={stroke.cy}
                  r={stroke.r}
                  fill="none"
                  stroke={theme.error}
                  strokeWidth={2.5}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              )
            }
            return (
              <motion.path
                key={i}
                d={stroke.d}
                fill="none"
                stroke={theme.error}
                strokeWidth={2.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            )
          })}
        </svg>

        {/* Fehlerzähler */}
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_FEHLER }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i < fehler ? [1, 1.4, 1] : 1,
                backgroundColor: i < fehler ? theme.error : theme.surfaceAlt,
              }}
              transition={{ duration: 0.3 }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ border: `1px solid ${theme.border}` }}
            />
          ))}
        </div>
      </div>

      {/* Wort-Anzeige */}
      <div className="flex justify-center flex-wrap gap-1.5">
        {wordUpper.split('').map((b, i) => {
          if (b === ' ') return <div key={i} className="w-3" />
          if (b === '-') {
            return (
              <span key={i} className="text-xl font-bold" style={{ color: theme.textMuted }}>
                –
              </span>
            )
          }
          const enthuellt = geraten.has(b) || verloren
          const istNeu = geraten.has(b) && wordUpper.lastIndexOf(b) === i
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <motion.span
                animate={{
                  scale: enthuellt && istNeu ? [0.5, 1.3, 1] : 1,
                  opacity: enthuellt ? 1 : 0.2,
                }}
                transition={{ duration: 0.4, ease: 'backOut' }}
                className="text-xl font-extrabold w-7 text-center"
                style={{
                  color: enthuellt ? (verloren && !geraten.has(b) ? theme.error : theme.accent) : theme.textMuted,
                }}
              >
                {enthuellt ? b : '_'}
              </motion.span>
              <div className="w-7 h-0.5" style={{ background: theme.border }} />
            </div>
          )
        })}
      </div>

      <ResultBanner
        status={status}
        detail={gewonnen ? '+10 XP' : undefined}
        erklaerung={
          fertig && !gewonnen ? (
            <>
              Das Wort war: <strong style={{ color: theme.accent }}>{wordUpper}</strong>
            </>
          ) : undefined
        }
      />

      {/* Hilfen */}
      <AnimatePresence>
        {hilfen.length > 0 && fehler >= 2 && !fertig && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 justify-center flex-wrap"
          >
            <button
              type="button"
              onClick={() =>
                setHilfeIndex((i) => (i === null ? 0 : Math.min(i + 1, hilfen.length - 1)))
              }
              disabled={hilfeIndex !== null && hilfeIndex >= hilfen.length - 1}
              className="text-xs px-3 py-1.5 rounded-full font-semibold disabled:opacity-40"
              style={{
                background: theme.accentSoft,
                color: theme.accent,
                border: `1px solid ${theme.border}`,
              }}
            >
              💡 Hinweis {hilfeIndex !== null ? `${hilfeIndex + 1}/${hilfen.length}` : ''}
            </button>
            {hilfeIndex !== null && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs px-3 py-1.5 rounded-full max-w-full"
                style={{
                  background: theme.accentSoft,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {hilfen[hilfeIndex]}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alphabet */}
      {!fertig && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {ALPHABET.map((b) => {
            const benutzt = geraten.has(b)
            const richtig = benutzt && wordUpper.includes(b)
            const falsch = benutzt && !wordUpper.includes(b)

            const bg = !benutzt
              ? theme.surfaceAlt
              : richtig
              ? theme.success
              : theme.error
            const color = !benutzt ? theme.text : '#fff'
            const border = !benutzt ? theme.border : richtig ? theme.success : theme.error

            return (
              <motion.button
                key={b}
                type="button"
                onClick={() => rateBuchstabe(b)}
                disabled={benutzt}
                whileHover={!benutzt ? { scale: 1.12, y: -2 } : undefined}
                whileTap={!benutzt ? { scale: 0.95 } : undefined}
                animate={
                  falsch
                    ? { x: [0, -3, 3, -2, 2, 0] }
                    : richtig
                    ? { scale: [1, 1.18, 1] }
                    : undefined
                }
                transition={{ duration: 0.35 }}
                className="rounded-lg text-xs font-extrabold flex items-center justify-center disabled:cursor-default"
                style={{
                  width: 32,
                  height: 32,
                  background: bg,
                  color,
                  border: `2px solid ${border}`,
                  textDecoration: falsch ? 'line-through' : undefined,
                }}
              >
                {b}
              </motion.button>
            )
          })}
        </div>
      )}

      {!fertig && (
        <p className="text-[10px] text-center font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>
          Tipp: einfach auf der Tastatur tippen
        </p>
      )}
    </div>
  )
}

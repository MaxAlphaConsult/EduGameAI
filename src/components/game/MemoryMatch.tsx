'use client'

import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

interface Paar {
  links: string
  rechts: string
}

interface Props {
  text: string
  paare: Paar[]
  hilfen: string[]
  feedback: { bei_korrekt: string; bei_falsch: string }
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

type Karte = {
  id: number
  pairId: number
  content: string
  /** 'links' = Begriff, 'rechts' = Definition */
  seite: 'links' | 'rechts'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function MemoryMatch({ text, paare, hilfen, feedback, onAntwort }: Props) {
  const theme = useGameTheme()

  // Max. 6 Paare = 12 Karten, sonst wird das Grid zu unübersichtlich
  const aktivePaare = useMemo(() => paare.slice(0, 6), [paare])
  const karten = useMemo<Karte[]>(() => {
    const list: Karte[] = []
    aktivePaare.forEach((p, idx) => {
      list.push({ id: idx * 2, pairId: idx, content: p.links, seite: 'links' })
      list.push({ id: idx * 2 + 1, pairId: idx, content: p.rechts, seite: 'rechts' })
    })
    return shuffle(list)
  }, [aktivePaare])

  const [aufgedeckt, setAufgedeckt] = useState<number[]>([]) // IDs aktuell sichtbarer Karten (max 2)
  const [gefunden, setGefunden] = useState<Set<number>>(new Set()) // pairIds
  const [zuege, setZuege] = useState(0)
  const [fehler, setFehler] = useState(0)
  const [showHilfe, setShowHilfe] = useState(false)
  const [hilfeIndex, setHilfeIndex] = useState(0)
  const [fertig, setFertig] = useState(false)
  const [lockInput, setLockInput] = useState(false)

  function klickKarte(karte: Karte) {
    if (lockInput || fertig) return
    if (gefunden.has(karte.pairId)) return
    if (aufgedeckt.includes(karte.id)) return
    if (aufgedeckt.length >= 2) return

    const neueAufgedeckt = [...aufgedeckt, karte.id]
    setAufgedeckt(neueAufgedeckt)

    if (neueAufgedeckt.length === 2) {
      setZuege((z) => z + 1)
      const [aId, bId] = neueAufgedeckt
      const a = karten.find((k) => k.id === aId)!
      const b = karten.find((k) => k.id === bId)!

      if (a.pairId === b.pairId) {
        // Match
        setLockInput(true)
        setTimeout(() => {
          setGefunden((prev) => new Set([...prev, a.pairId]))
          setAufgedeckt([])
          setLockInput(false)
          burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.4 } })
        }, 600)
      } else {
        setFehler((f) => f + 1)
        setLockInput(true)
        setTimeout(() => {
          setAufgedeckt([])
          setLockInput(false)
        }, 1100)
      }
    }
  }

  // Sieg-Bedingung: alle Paare gefunden
  useEffect(() => {
    if (gefunden.size === aktivePaare.length && !fertig && aktivePaare.length > 0) {
      setFertig(true)
      const perfekt = fehler === 0
      const guteLeistung = fehler <= Math.ceil(aktivePaare.length / 2)
      burstKorrekt({
        farbe: theme.success,
        intensitaet: perfekt ? 'gross' : guteLeistung ? 'normal' : 'klein',
      })
      const antworten = aktivePaare.map((p) => `${p.links} → ${p.rechts}`)
      setTimeout(() => onAntwort(antworten, guteLeistung), 1500)
    }
  }, [gefunden, aktivePaare, fertig, fehler, onAntwort, theme.success])

  const fortschritt = aktivePaare.length === 0 ? 0 : (gefunden.size / aktivePaare.length) * 100
  const status: 'idle' | 'korrekt' | 'falsch' = !fertig
    ? 'idle'
    : fehler <= Math.ceil(aktivePaare.length / 2)
    ? 'korrekt'
    : 'falsch'

  // 6 Paare → 4×3, 5 → 4×3 mit 2 leeren, 4 → 4×2, 3 → 3×2, 2 → 2×2
  const cols = aktivePaare.length >= 5 ? 4 : aktivePaare.length === 4 ? 4 : aktivePaare.length === 3 ? 3 : 2

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

      {/* Statusleiste */}
      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Züge: <span style={{ color: theme.text }}>{zuege}</span>
        </span>
        <span style={{ color: theme.textMuted }}>
          Paare:{' '}
          <span style={{ color: theme.success }}>
            {gefunden.size}/{aktivePaare.length}
          </span>
        </span>
      </div>

      <div className="h-1 rounded-full" style={{ background: theme.surfaceAlt }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: theme.accentGradient }}
          initial={{ width: 0 }}
          animate={{ width: `${fortschritt}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Karten-Grid */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, perspective: 1000 }}
      >
        {karten.map((karte) => {
          const offen = aufgedeckt.includes(karte.id)
          const matched = gefunden.has(karte.pairId)
          const sichtbar = offen || matched

          return (
            <button
              key={karte.id}
              type="button"
              onClick={() => klickKarte(karte)}
              disabled={matched || lockInput}
              className="relative aspect-[3/4] rounded-2xl select-none"
              style={{ background: 'transparent', perspective: 1000 }}
            >
              <motion.div
                animate={{ rotateY: sichtbar ? 180 : 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Rückseite */}
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    background: theme.accentGradient,
                    color: '#fff',
                    boxShadow: theme.glowAccent,
                  }}
                >
                  {theme.badge}
                </div>

                {/* Vorderseite */}
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center p-2 text-center text-xs font-semibold leading-tight"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: matched ? theme.successSoft : theme.surface,
                    color: matched ? theme.success : theme.text,
                    border: `2px solid ${matched ? theme.success : theme.border}`,
                    boxShadow: matched ? `0 0 0 2px ${theme.success}30` : 'none',
                  }}
                >
                  <span>{karte.content}</span>
                </div>
              </motion.div>
            </button>
          )
        })}
      </div>

      <ResultBanner
        status={status}
        detail={fertig ? (fehler === 0 ? 'Perfekt!' : `${fehler} Fehler`) : undefined}
        erklaerung={
          fertig && fehler > Math.ceil(aktivePaare.length / 2)
            ? feedback.bei_falsch || 'Schau dir die Begriffe nochmal an — du hattest mehr als die Hälfte Fehler.'
            : undefined
        }
      />

      {/* Hilfe */}
      <AnimatePresence>
        {!fertig && hilfen.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!showHilfe ? (
              <button
                type="button"
                onClick={() => setShowHilfe(true)}
                className="text-xs font-semibold underline underline-offset-4 opacity-70 hover:opacity-100"
                style={{ color: theme.textMuted }}
              >
                💡 Hilfe anzeigen
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-2xl px-4 py-3 border"
                style={{
                  background: theme.accentSoft,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: theme.accent }}
                >
                  Hilfe {hilfeIndex + 1}/{hilfen.length}
                </p>
                <p className="text-sm leading-relaxed">{hilfen[hilfeIndex]}</p>
                {hilfeIndex < hilfen.length - 1 && (
                  <button
                    onClick={() => setHilfeIndex((h) => h + 1)}
                    className="text-xs font-semibold mt-2 underline underline-offset-4"
                    style={{ color: theme.accent }}
                  >
                    Weitere Hilfe →
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { burstKorrekt } from '@/lib/game/feedback'

interface Option {
  text: string
  isCorrect: boolean
}

export interface MillionaerAufgabe {
  aufgabe_id: string
  text: string
  optionen: Option[]
  hilfen?: string[]
}

interface Props {
  /** Aufgaben in aufsteigender Schwierigkeit. */
  aufgaben: MillionaerAufgabe[]
  onAufgabeAntwort?: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  onSpielVorbei?: (stats: { erreichteStufe: number; ausstieg: boolean; gewonnen: boolean }) => void
}

const PREIS_LEITER = [
  '100 €',
  '200 €',
  '500 €',
  '1.000 €',
  '2.000 €',
  '5.000 €',
  '16.000 €',
  '32.000 €',
  '250.000 €',
  '1.000.000 €',
]
const SAFE_HAVEN_STUFEN = [3, 7] // 0-basiert: nach Stufe 4 (= 1.000 €) und Stufe 8 (= 32.000 €)
const LETTERS = ['A', 'B', 'C', 'D'] as const

// WWM-Farbpalette
const WWM = {
  bgDeep: '#020617',
  bgMid: '#0a1635',
  bgLight: '#1e3a8a',
  borderGold: '#FBBF24',
  borderGoldDim: '#92400E',
  textGold: '#FCD34D',
  buttonFill: 'rgba(30, 58, 138, 0.55)',
  buttonFillBright: 'rgba(59, 130, 246, 0.6)',
  selectedFill: '#F97316',
  selectedFillEdge: '#EA580C',
  correctFill: '#16A34A',
  correctEdge: '#15803D',
  wrongFill: '#DC2626',
  wrongEdge: '#991B1B',
  white: '#FFFFFF',
  ghost: 'rgba(255,255,255,0.55)',
}

// Hex-Clip-Paths
const HEX_QUESTION =
  'polygon(40px 0%, calc(100% - 40px) 0%, 100% 50%, calc(100% - 40px) 100%, 40px 100%, 0% 50%)'
const HEX_BUTTON =
  'polygon(20px 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 20px 100%, 0% 50%)'

type Phase = 'frage' | 'reveal' | 'fertig'

export function Millionaer({ aufgaben, onAufgabeAntwort, onSpielVorbei }: Props) {
  const totalStufen = Math.min(aufgaben.length, PREIS_LEITER.length)

  const [stufe, setStufe] = useState(0)
  const [phase, setPhase] = useState<Phase>('frage')
  const [selected, setSelected] = useState<number | null>(null)
  const [korrekt, setKorrekt] = useState(false)
  const [hidden5050, setHidden5050] = useState<number[]>([])
  const [showHinweis, setShowHinweis] = useState(false)
  const [usedFifty, setUsedFifty] = useState(false)
  const [usedHinweis, setUsedHinweis] = useState(false)
  const [usedPublikum, setUsedPublikum] = useState(false)
  const [publikumVotes, setPublikumVotes] = useState<number[] | null>(null)
  const [ergebnis, setErgebnis] = useState<{
    erreichteStufe: number
    ausstieg: boolean
    gewonnen: boolean
  } | null>(null)

  const aktuell = aufgaben[stufe]
  // WICHTIG: Dependency nur auf aufgabe_id — die Optionen-Liste selbst kann
  // bei jedem Parent-Render eine neue Identität haben, aber solange die Frage
  // dieselbe ist, dürfen wir die Buttons NICHT neu mischen, sonst springen sie.
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
    return list.slice(0, 4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktuell?.aufgabe_id])

  function abschluss(stats: { erreichteStufe: number; ausstieg: boolean; gewonnen: boolean }) {
    setErgebnis(stats)
    setPhase('fertig')
    if (stats.gewonnen) {
      burstKorrekt({ farbe: WWM.textGold, intensitaet: 'gross' })
    }
    setTimeout(() => {
      if (onSpielVorbei) onSpielVorbei(stats)
    }, 1800)
  }

  function pickAnswer(i: number) {
    if (phase !== 'frage' || selected !== null) return
    if (hidden5050.includes(i)) return
    setSelected(i)
    const istKorrekt = optionen[i].isCorrect
    setKorrekt(istKorrekt)

    if (onAufgabeAntwort && aktuell) {
      onAufgabeAntwort(aktuell.aufgabe_id, [optionen[i].text], istKorrekt)
    }

    // Längere Suspense-Pause als im Original — Spannung
    setTimeout(() => {
      setPhase('reveal')
      if (istKorrekt) burstKorrekt({ farbe: WWM.correctFill, intensitaet: 'klein', origin: { x: 0.5, y: 0.55 } })

      setTimeout(() => {
        if (istKorrekt) {
          const naechste = stufe + 1
          if (naechste >= totalStufen) {
            abschluss({ erreichteStufe: totalStufen, ausstieg: false, gewonnen: true })
          } else {
            setStufe(naechste)
            setSelected(null)
            setKorrekt(false)
            setHidden5050([])
            setShowHinweis(false)
            setPublikumVotes(null)
            setPhase('frage')
          }
        } else {
          abschluss({ erreichteStufe: stufe, ausstieg: false, gewonnen: false })
        }
      }, istKorrekt ? 1600 : 2800)
    }, 1800)
  }

  function joker5050() {
    if (usedFifty || phase !== 'frage') return
    setUsedFifty(true)
    const wrong = optionen
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.isCorrect)
      .map(({ i }) => i)
    const shuffled = [...wrong].sort(() => Math.random() - 0.5)
    setHidden5050(shuffled.slice(0, 2))
  }

  function jokerHinweis() {
    if (usedHinweis || phase !== 'frage') return
    if (!aktuell.hilfen || aktuell.hilfen.length === 0) return
    setUsedHinweis(true)
    setShowHinweis(true)
  }

  function jokerPublikum() {
    if (usedPublikum || phase !== 'frage') return
    setUsedPublikum(true)
    // Realistische Verteilung: Korrekte Antwort bekommt 45-75%, Rest verteilt sich
    const correctIdx = optionen.findIndex((o) => o.isCorrect)
    const votes = new Array(optionen.length).fill(0)
    const correctVote = 45 + Math.floor(Math.random() * 30)
    votes[correctIdx] = correctVote
    let remaining = 100 - correctVote
    const others = optionen.map((_, i) => i).filter((i) => i !== correctIdx && !hidden5050.includes(i))
    others.forEach((idx, k) => {
      if (k === others.length - 1) {
        votes[idx] = remaining
      } else {
        const v = Math.floor(Math.random() * (remaining - (others.length - 1 - k))) + 1
        votes[idx] = v
        remaining -= v
      }
    })
    setPublikumVotes(votes)
  }

  function aussteigen() {
    abschluss({ erreichteStufe: stufe, ausstieg: true, gewonnen: false })
  }

  function berechneAuszahlung(erreichteStufe: number, ausstieg: boolean): string {
    if (erreichteStufe >= totalStufen) return PREIS_LEITER[totalStufen - 1]
    if (ausstieg) {
      if (erreichteStufe === 0) return '0 €'
      return PREIS_LEITER[erreichteStufe - 1]
    }
    const guaranteed = SAFE_HAVEN_STUFEN.filter((s) => s < erreichteStufe).pop()
    if (guaranteed === undefined) return '0 €'
    return PREIS_LEITER[guaranteed]
  }

  if (!aktuell) {
    return (
      <div className="text-center py-12 text-sm text-white/60">
        Keine Aufgaben — Spiel kann nicht gestartet werden.
      </div>
    )
  }

  return (
    <div
      className="relative -m-6 rounded-3xl overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${WWM.bgLight}55 0%, transparent 60%),
                     radial-gradient(ellipse 60% 50% at 50% 110%, ${WWM.bgLight}33 0%, transparent 50%),
                     linear-gradient(180deg, ${WWM.bgMid} 0%, ${WWM.bgDeep} 100%)`,
        color: WWM.white,
      }}
    >
      {/* Spotlights von oben */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 30% 80% at 30% -10%, rgba(251,191,36,0.08) 0%, transparent 60%),
                       radial-gradient(ellipse 30% 80% at 70% -10%, rgba(251,191,36,0.08) 0%, transparent 60%)`,
        }}
      />

      <div className="relative p-5 sm:p-7">
        {/* Top-Bar: Joker + Aussteigen */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Joker label="50:50" disabled={usedFifty || phase !== 'frage'} used={usedFifty} onClick={joker5050}>
              <span className="text-sm font-extrabold tracking-tight">50:50</span>
            </Joker>
            <Joker
              label="Telefonjoker"
              disabled={usedHinweis || phase !== 'frage' || !(aktuell.hilfen && aktuell.hilfen.length > 0)}
              used={usedHinweis}
              onClick={jokerHinweis}
            >
              <span className="text-xl">📞</span>
            </Joker>
            <Joker label="Publikumsjoker" disabled={usedPublikum || phase !== 'frage'} used={usedPublikum} onClick={jokerPublikum}>
              <span className="text-xl">👥</span>
            </Joker>
          </div>

          <motion.button
            whileHover={phase === 'frage' && stufe > 0 ? { scale: 1.04 } : undefined}
            whileTap={phase === 'frage' && stufe > 0 ? { scale: 0.97 } : undefined}
            onClick={aussteigen}
            disabled={phase !== 'frage' || stufe === 0}
            className="px-4 py-2 rounded-md text-xs font-extrabold uppercase tracking-widest border-2 disabled:opacity-30"
            style={{
              borderColor: WWM.borderGold,
              background: 'rgba(251,191,36,0.1)',
              color: WWM.textGold,
            }}
          >
            Aussteigen
          </motion.button>
        </div>

        {/* Layout: Frage+Antworten | Preisleiter */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 items-start">
          {/* Linker Bereich */}
          <div className="flex flex-col gap-6 order-2 lg:order-1">
            {/* Frage in Hexagon */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`q-${stufe}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="relative w-full"
                style={{ minHeight: 130 }}
              >
                {/* Gold-Rand */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, ${WWM.borderGold} 0%, ${WWM.borderGoldDim} 100%)`,
                    clipPath: HEX_QUESTION,
                  }}
                />
                {/* Inner */}
                <div
                  className="absolute"
                  style={{
                    top: 3,
                    left: 3,
                    right: 3,
                    bottom: 3,
                    background: `linear-gradient(180deg, ${WWM.bgMid} 0%, ${WWM.bgDeep} 100%)`,
                    clipPath: HEX_QUESTION,
                  }}
                />
                {/* Inhalt */}
                <div className="relative flex items-center justify-center px-10 py-6 min-h-[130px]">
                  <p className="text-center font-bold text-base sm:text-lg leading-snug" style={{ color: WWM.white }}>
                    {aktuell.text}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Telefonjoker-Hinweis */}
            <AnimatePresence>
              {showHinweis && aktuell.hilfen && aktuell.hilfen[0] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg px-4 py-3 border text-sm flex items-center gap-2"
                  style={{
                    background: 'rgba(251,191,36,0.1)',
                    borderColor: WWM.borderGold,
                    color: WWM.textGold,
                  }}
                >
                  <span className="text-xl flex-shrink-0">📞</span>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">Telefonjoker</span>
                    <span className="block leading-relaxed text-white/90">{aktuell.hilfen[0]}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Antworten — Hexagon-Buttons in 2×2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {optionen.map((opt, i) => {
                const isHidden = hidden5050.includes(i)
                const isSelected = selected === i
                const revealedRight = phase === 'reveal' && opt.isCorrect
                const revealedWrong = phase === 'reveal' && isSelected && !opt.isCorrect
                const isLoadingFinalAnswer = phase === 'frage' && isSelected

                // Farbgebung
                let outerColor = WWM.borderGold
                let innerBg: string = WWM.buttonFill
                let textColor = WWM.white
                let letterColor = WWM.textGold

                if (isLoadingFinalAnswer) {
                  outerColor = WWM.selectedFillEdge
                  innerBg = `linear-gradient(180deg, ${WWM.selectedFill} 0%, ${WWM.selectedFillEdge} 100%)`
                  textColor = WWM.white
                  letterColor = WWM.white
                } else if (revealedRight) {
                  outerColor = WWM.correctEdge
                  innerBg = `linear-gradient(180deg, ${WWM.correctFill} 0%, ${WWM.correctEdge} 100%)`
                  textColor = WWM.white
                  letterColor = WWM.white
                } else if (revealedWrong) {
                  outerColor = WWM.wrongEdge
                  innerBg = `linear-gradient(180deg, ${WWM.wrongFill} 0%, ${WWM.wrongEdge} 100%)`
                  textColor = WWM.white
                  letterColor = WWM.white
                }

                const vote = publikumVotes?.[i]

                return (
                  <motion.button
                    key={i}
                    type="button"
                    disabled={phase !== 'frage' || isHidden}
                    onClick={() => pickAnswer(i)}
                    whileHover={phase === 'frage' && !isHidden && !isSelected ? { scale: 1.02 } : undefined}
                    whileTap={phase === 'frage' && !isHidden && !isSelected ? { scale: 0.98 } : undefined}
                    animate={
                      isLoadingFinalAnswer
                        ? { opacity: [1, 0.6, 1] }
                        : revealedRight
                        ? { scale: [1, 1.05, 1] }
                        : revealedWrong
                        ? { x: [0, -8, 8, -4, 4, 0] }
                        : { opacity: 1, scale: 1, x: 0 }
                    }
                    transition={
                      isLoadingFinalAnswer
                        ? { duration: 0.6, repeat: Infinity }
                        : { duration: 0.4 }
                    }
                    className="relative disabled:cursor-default text-left"
                    style={{
                      visibility: isHidden ? 'hidden' : 'visible',
                      height: 64,
                    }}
                  >
                    {/* Gold-Rand */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(180deg, ${outerColor} 0%, ${
                          outerColor === WWM.borderGold ? WWM.borderGoldDim : outerColor
                        } 100%)`,
                        clipPath: HEX_BUTTON,
                      }}
                    />
                    {/* Inner Background */}
                    <div
                      className="absolute"
                      style={{
                        top: 2,
                        left: 2,
                        right: 2,
                        bottom: 2,
                        background: innerBg,
                        clipPath: HEX_BUTTON,
                      }}
                    />
                    {/* Publikumsjoker-Balken */}
                    {vote !== undefined && !isHidden && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          top: 2,
                          left: 2,
                          bottom: 2,
                          width: `calc(${vote}% - 4px)`,
                          background: 'rgba(251,191,36,0.25)',
                          clipPath: HEX_BUTTON,
                        }}
                      />
                    )}
                    {/* Inhalt */}
                    <div className="relative flex items-center gap-3 px-5 py-3 h-full">
                      <span className="text-base font-black tabular-nums" style={{ color: letterColor }}>
                        {LETTERS[i]}:
                      </span>
                      <span className="text-sm font-semibold flex-1 leading-tight" style={{ color: textColor }}>
                        {opt.text}
                      </span>
                      {vote !== undefined && !isHidden && (
                        <span
                          className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(0,0,0,0.4)', color: WWM.textGold }}
                        >
                          {vote}%
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Preisleiter */}
          <div className="order-1 lg:order-2">
            <div
              className="rounded-md p-3"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: `1px solid ${WWM.borderGoldDim}`,
              }}
            >
              <div
                className="text-[9px] uppercase tracking-widest font-bold text-center mb-2"
                style={{ color: WWM.textGold }}
              >
                Preisleiter
              </div>
              <div className="flex flex-col-reverse gap-0.5">
                {PREIS_LEITER.slice(0, totalStufen).map((preis, i) => {
                  const ist = i === stufe
                  const geschafft = i < stufe || (i === stufe && phase === 'reveal' && korrekt)
                  const isSafe = SAFE_HAVEN_STUFEN.includes(i)
                  let bg = 'transparent'
                  let color: string = WWM.ghost
                  let weight = '600'
                  if (ist) {
                    bg = `linear-gradient(90deg, ${WWM.selectedFill}, ${WWM.selectedFillEdge})`
                    color = WWM.white
                    weight = '900'
                  } else if (geschafft) {
                    color = WWM.textGold
                    weight = '700'
                  } else if (isSafe) {
                    color = WWM.white
                    weight = '800'
                  }
                  return (
                    <motion.div
                      key={i}
                      animate={ist ? { boxShadow: [`0 0 0 ${WWM.selectedFill}`, `0 0 20px ${WWM.selectedFill}`, `0 0 0 ${WWM.selectedFill}`] } : {}}
                      transition={{ duration: 1.8, repeat: ist ? Infinity : 0 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-xs tabular-nums"
                      style={{ background: bg, color, fontWeight: weight }}
                    >
                      <span className="opacity-60 w-5 text-right">{i + 1}</span>
                      <span className="flex-1 text-right">{preis}</span>
                      {isSafe && <span style={{ fontSize: 10, color: ist ? WWM.white : WWM.textGold }}>★</span>}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ergebnis-Overlay */}
      <AnimatePresence>
        {phase === 'fertig' && ergebnis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-6 pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="relative px-8 py-7 text-center max-w-md pointer-events-auto"
              style={{ minWidth: 320 }}
            >
              {/* Gold-Rand */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${WWM.borderGold}, ${WWM.borderGoldDim})`,
                  clipPath: HEX_QUESTION,
                }}
              />
              <div
                className="absolute"
                style={{
                  top: 3,
                  left: 3,
                  right: 3,
                  bottom: 3,
                  background: ergebnis.gewonnen
                    ? `linear-gradient(180deg, ${WWM.bgLight}, ${WWM.bgMid})`
                    : `linear-gradient(180deg, ${WWM.bgMid}, ${WWM.bgDeep})`,
                  clipPath: HEX_QUESTION,
                }}
              />
              <div className="relative">
                <div className="text-6xl mb-3">
                  {ergebnis.gewonnen ? '🏆' : ergebnis.ausstieg ? '💼' : '💔'}
                </div>
                <div
                  className="text-xl font-extrabold mb-1 uppercase tracking-widest"
                  style={{ color: WWM.textGold }}
                >
                  {ergebnis.gewonnen ? 'Millionär!' : ergebnis.ausstieg ? 'Ausgestiegen' : 'Game Over'}
                </div>
                <div className="text-sm opacity-80 mb-4 text-white">
                  {ergebnis.gewonnen
                    ? `Du hast alle ${totalStufen} Fragen geschafft!`
                    : `Du hast ${ergebnis.erreichteStufe} ${
                        ergebnis.erreichteStufe === 1 ? 'Frage' : 'Fragen'
                      } richtig beantwortet.`}
                </div>
                <div className="text-4xl font-black tabular-nums" style={{ color: WWM.textGold }}>
                  {berechneAuszahlung(ergebnis.erreichteStufe, ergebnis.ausstieg)}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Joker({
  label,
  disabled,
  used,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  used: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.08 } : undefined}
      whileTap={!disabled ? { scale: 0.92 } : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="relative rounded-full flex items-center justify-center disabled:cursor-default"
      style={{
        width: 52,
        height: 52,
        background: used
          ? 'rgba(220,38,38,0.15)'
          : `radial-gradient(circle at 30% 30%, rgba(251,191,36,0.25), rgba(0,0,0,0.5))`,
        border: `2px solid ${used ? '#7F1D1D' : WWM.borderGold}`,
        color: used ? 'rgba(255,255,255,0.3)' : WWM.white,
      }}
    >
      {children}
      {used && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            style={{
              width: '125%',
              height: 3,
              background: '#DC2626',
              transform: 'rotate(-45deg)',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </motion.button>
  )
}

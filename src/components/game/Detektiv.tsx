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

export interface Hotspot {
  id: string
  /** Position in % der Szene (0–100) */
  x: number
  y: number
  /** Mini-Frage am Hotspot */
  frage: string
  /** Antwort-Optionen */
  optionen: Option[]
  /** Indiz-Text, das im Notizbuch landet bei richtiger Antwort */
  indiz: string
  hilfen?: string[]
}

export interface DetektivSzene {
  /** SVG-Inhalt (innerHTML eines <svg>-Tags). Wenn leer, nur farbiger Fallback. */
  svg?: string
  /** Beschreibung der Szene */
  beschreibung?: string
}

interface Props {
  text?: string
  szene: DetektivSzene
  hotspots: Hotspot[]
  /** Multi-Step-Frage am Schluss: Aus welchen Indizien lautet die Lösung? */
  abschlussFrage?: string
  abschlussOptionen?: Option[]
  onAufgabeAntwort?: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  onSpielVorbei?: (stats: { korrekt: number; gesamt: number; faktor: number }) => void
}

type Phase = 'erkundung' | 'hotspot' | 'abschluss' | 'fertig'

export function Detektiv({
  text = '🔍 Untersuche die Szene und sammle Indizien',
  szene,
  hotspots,
  abschlussFrage,
  abschlussOptionen,
  onAufgabeAntwort,
  onSpielVorbei,
}: Props) {
  const theme = useGameTheme()
  const [phase, setPhase] = useState<Phase>('erkundung')
  const [aktiverHotspot, setAktiverHotspot] = useState<string | null>(null)
  const [indizien, setIndizien] = useState<Record<string, { korrekt: boolean; text: string }>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [revealPhase, setRevealPhase] = useState<'idle' | 'reveal'>('idle')
  const [abschlussErgebnis, setAbschlussErgebnis] = useState<boolean | null>(null)

  const aktiv = hotspots.find((h) => h.id === aktiverHotspot) ?? null
  const totalHotspots = hotspots.length
  const beantwortet = Object.keys(indizien).length
  const korrekt = Object.values(indizien).filter((i) => i.korrekt).length

  const optionen = useMemo(() => {
    if (!aktiv) return []
    const list = [...aktiv.optionen]
    let seed = 0
    for (let i = 0; i < aktiv.id.length; i++) seed = (seed * 31 + aktiv.id.charCodeAt(i)) | 0
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
  }, [aktiv?.id])

  function oeffneHotspot(id: string) {
    if (indizien[id]) return // schon gelöst
    setAktiverHotspot(id)
    setSelected(null)
    setRevealPhase('idle')
    setPhase('hotspot')
  }

  function antwortenHotspot(i: number) {
    if (!aktiv || selected !== null) return
    setSelected(i)
    const istKorrekt = optionen[i].isCorrect

    if (onAufgabeAntwort) {
      onAufgabeAntwort(aktiv.id, [optionen[i].text], istKorrekt)
    }

    setTimeout(() => {
      setRevealPhase('reveal')
      if (istKorrekt) burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.4 } })

      setTimeout(() => {
        setIndizien((prev) => ({
          ...prev,
          [aktiv.id]: { korrekt: istKorrekt, text: aktiv.indiz },
        }))
        setAktiverHotspot(null)
        setSelected(null)
        setRevealPhase('idle')
        // Wenn alle bearbeitet: Abschlussphase
        const neuerCount = Object.keys(indizien).length + 1
        if (neuerCount >= totalHotspots) {
          if (abschlussFrage && abschlussOptionen && abschlussOptionen.length > 0) {
            setPhase('abschluss')
          } else {
            setPhase('fertig')
            const erfolg = korrekt + (istKorrekt ? 1 : 0)
            setTimeout(
              () =>
                onSpielVorbei?.({
                  korrekt: erfolg,
                  gesamt: totalHotspots,
                  faktor: erfolg / totalHotspots,
                }),
              1000,
            )
          }
        } else {
          setPhase('erkundung')
        }
      }, 1200)
    }, 600)
  }

  function antwortenAbschluss(i: number) {
    if (!abschlussOptionen) return
    const istKorrekt = abschlussOptionen[i].isCorrect
    setAbschlussErgebnis(istKorrekt)
    if (onAufgabeAntwort) {
      onAufgabeAntwort('detektiv-abschluss', [abschlussOptionen[i].text], istKorrekt)
    }
    if (istKorrekt) burstKorrekt({ farbe: theme.success, intensitaet: 'gross' })
    setTimeout(() => {
      setPhase('fertig')
      const gesamt = totalHotspots + 1
      const erfolg = korrekt + (istKorrekt ? 1 : 0)
      setTimeout(() => onSpielVorbei?.({ korrekt: erfolg, gesamt, faktor: erfolg / gesamt }), 800)
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-bold text-center leading-snug" style={{ color: theme.text }}>
        {text}
      </p>

      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Indizien: <span style={{ color: theme.success }}>{korrekt}</span> / {totalHotspots}
        </span>
        <span style={{ color: theme.textMuted }}>
          Untersucht: {beantwortet} / {totalHotspots}
        </span>
      </div>

      {/* Szene */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2"
        style={{
          background: theme.mood === 'dark' ? '#0F172A' : '#F8FAFC',
          borderColor: theme.border,
          aspectRatio: '4 / 3',
        }}>
        {szene.svg ? (
          <div
            className="absolute inset-0"
            dangerouslySetInnerHTML={{ __html: szene.svg }}
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">
            🔬
          </div>
        )}
        {szene.beschreibung && (
          <div
            className="absolute top-2 left-2 right-2 text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
          >
            {szene.beschreibung}
          </div>
        )}
        {/* Hotspot-Marker */}
        {hotspots.map((h) => {
          const gelöst = !!indizien[h.id]
          return (
            <motion.button
              key={h.id}
              onClick={() => !gelöst && phase === 'erkundung' && oeffneHotspot(h.id)}
              animate={!gelöst ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={!gelöst ? { duration: 1.6, repeat: Infinity } : { duration: 0.3 }}
              whileHover={!gelöst ? { scale: 1.25 } : undefined}
              disabled={gelöst || phase !== 'erkundung'}
              className="absolute flex items-center justify-center font-extrabold rounded-full"
              style={{
                left: `${h.x}%`,
                top: `${h.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 34,
                height: 34,
                background: gelöst
                  ? (indizien[h.id].korrekt ? theme.success : theme.error)
                  : theme.warning,
                color: '#fff',
                border: '3px solid #fff',
                boxShadow: gelöst ? 'none' : `0 0 0 4px ${theme.warning}55`,
                cursor: gelöst ? 'default' : 'pointer',
                fontSize: 14,
              }}
            >
              {gelöst ? (indizien[h.id].korrekt ? '✓' : '✗') : '?'}
            </motion.button>
          )
        })}
      </div>

      {/* Notizbuch — gesammelte Indizien */}
      {Object.keys(indizien).length > 0 && (
        <div
          className="rounded-2xl border px-4 py-3"
          style={{
            background: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: theme.accent }}>
            📓 Notizbuch
          </div>
          <ul className="flex flex-col gap-1">
            {Object.entries(indizien).map(([id, ind]) => (
              <li
                key={id}
                className="text-xs flex items-center gap-2"
                style={{
                  color: ind.korrekt ? theme.text : theme.error,
                  textDecoration: ind.korrekt ? undefined : 'line-through',
                }}
              >
                <span>{ind.korrekt ? '✓' : '✗'}</span>
                <span>{ind.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hotspot-Frage Overlay */}
      <AnimatePresence>
        {phase === 'hotspot' && aktiv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="rounded-3xl border-2 max-w-md w-full p-6 flex flex-col gap-4"
              style={{ background: theme.surface, borderColor: theme.accent, boxShadow: theme.glowAccent }}
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl">🔎</span>
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: theme.accent }}>
                  Indiz-Frage
                </span>
              </div>
              <p className="font-bold text-base leading-snug" style={{ color: theme.text }}>
                {aktiv.frage}
              </p>
              <div className="flex flex-col gap-2">
                {optionen.map((opt, i) => {
                  const isSel = selected === i
                  const revR = revealPhase === 'reveal' && opt.isCorrect
                  const revW = revealPhase === 'reveal' && isSel && !opt.isCorrect
                  let bg = theme.surfaceAlt
                  let border = theme.border
                  let color = theme.text
                  if (isSel && revealPhase === 'idle') {
                    bg = theme.accent
                    color = '#fff'
                    border = theme.accent
                  } else if (revR) {
                    bg = theme.success
                    color = '#fff'
                    border = theme.success
                  } else if (revW) {
                    bg = theme.error
                    color = '#fff'
                    border = theme.error
                  }
                  return (
                    <motion.button
                      key={i}
                      onClick={() => antwortenHotspot(i)}
                      disabled={selected !== null}
                      whileHover={selected === null ? { scale: 1.02 } : undefined}
                      whileTap={selected === null ? { scale: 0.97 } : undefined}
                      className="rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold"
                      style={{ background: bg, borderColor: border, color }}
                    >
                      {opt.text}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Abschluss-Frage */}
      {phase === 'abschluss' && abschlussFrage && abschlussOptionen && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 px-4 py-4 flex flex-col gap-3"
          style={{ background: theme.accentSoft, borderColor: theme.accent }}
        >
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: theme.accent }}>
            🧩 Schlussfolgerung
          </div>
          <p className="font-bold text-base" style={{ color: theme.text }}>
            {abschlussFrage}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {abschlussOptionen.map((opt, i) => (
              <motion.button
                key={i}
                onClick={() => abschlussErgebnis === null && antwortenAbschluss(i)}
                disabled={abschlussErgebnis !== null}
                whileHover={abschlussErgebnis === null ? { scale: 1.01 } : undefined}
                className="rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold"
                style={{
                  background:
                    abschlussErgebnis !== null && opt.isCorrect
                      ? theme.success
                      : theme.surface,
                  borderColor:
                    abschlussErgebnis !== null && opt.isCorrect
                      ? theme.success
                      : theme.border,
                  color:
                    abschlussErgebnis !== null && opt.isCorrect ? '#fff' : theme.text,
                }}
              >
                {opt.text}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {phase === 'fertig' && (
        <ResultBanner
          status={korrekt + (abschlussErgebnis ? 1 : 0) >= Math.ceil(totalHotspots * 0.6) ? 'korrekt' : 'falsch'}
          detail={`${korrekt} Indizien richtig`}
        />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

interface Option {
  text: string
  isCorrect: boolean
}

interface BossAufgabe {
  aufgabe_id: string
  text: string
  optionen: Option[]
}

interface Props {
  /** Alle Fragen des Moduls — EIN Boss über alle Fragen. */
  aufgaben: BossAufgabe[]
  /** Sekunden, bis der Boss angreift. Default: 12s */
  zeitSekunden?: number
  /** Startleben — Leben gehen NUR verloren, wenn der Boss seinen Angriff auflädt. */
  startLeben?: number
  onAufgabeAntwort: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  onSpielVorbei: () => void
}

const ATTACK_ICONS = ['🗡️', '✨', '⚡', '💥']
const ATTACK_NAMES = ['Slash', 'Magic', 'Strike', 'Smash']
const DEFAULT_ZEIT = 12
const DEFAULT_LEBEN = 3

type Phase = 'kampf' | 'feedback' | 'sieg' | 'niederlage'

export function BossFight({ aufgaben, zeitSekunden = DEFAULT_ZEIT, startLeben = DEFAULT_LEBEN, onAufgabeAntwort, onSpielVorbei }: Props) {
  const theme = useGameTheme()
  const total = Math.max(1, aufgaben.length)
  // Schaden pro richtiger Antwort — so ist der Boss bei lauter richtigen Antworten
  // spätestens nach der letzten Frage besiegt. Die letzte Frage nimmt ihm den Rest.
  const schadenProTreffer = Math.ceil(100 / total)

  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('kampf')
  const [selected, setSelected] = useState<number | null>(null)
  const [letzteKorrekt, setLetzteKorrekt] = useState(false)
  const [bossHp, setBossHp] = useState(100)
  const [spielerHp, setSpielerHp] = useState(startLeben)
  const [verbleibend, setVerbleibend] = useState(zeitSekunden)
  const [bossShake, setBossShake] = useState(false)
  const [spielerShake, setSpielerShake] = useState(false)
  const [attackEffect, setAttackEffect] = useState<{ icon: string; type: 'spieler' | 'boss' } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const beendetRef = useRef(false)
  const spielerHpRef = useRef(startLeben)

  const aufgabe = aufgaben[idx]
  const istLetzte = idx >= total - 1

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  const beende = useCallback((sieg: boolean) => {
    if (beendetRef.current) return
    beendetRef.current = true
    stopTimer()
    setPhase(sieg ? 'sieg' : 'niederlage')
    if (sieg) burstKorrekt({ farbe: theme.success, intensitaet: 'gross' })
    setTimeout(() => onSpielVorbei(), 1600)
  }, [onSpielVorbei, theme.success])

  // Boss lädt Angriff auf — läuft der Timer ab, verliert man EIN Leben (nur dann!).
  useEffect(() => {
    if (phase !== 'kampf' || beendetRef.current) return
    setVerbleibend(zeitSekunden)
    timerRef.current = setInterval(() => {
      setVerbleibend((v) => {
        if (v <= 1) {
          stopTimer()
          bossAttacke()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return stopTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx])

  function bossAttacke() {
    if (beendetRef.current) return
    // Boss-Angriff aufgeladen → EIN Leben verloren (nur hier, nicht bei Falschantwort).
    setPhase('feedback')
    setLetzteKorrekt(false)
    setAttackEffect({ icon: '💢', type: 'boss' })
    setSpielerShake(true)
    setTimeout(() => setSpielerShake(false), 400)
    const neu = Math.max(0, spielerHpRef.current - 1)
    spielerHpRef.current = neu
    setSpielerHp(neu)
    setTimeout(() => {
      if (beendetRef.current) return
      setAttackEffect(null)
      if (neu <= 0) beende(false)
      else setPhase('kampf') // gleiche Frage, Timer startet neu (Effekt oben)
    }, 1000)
  }

  function angreifen(i: number) {
    if (phase !== 'kampf' || beendetRef.current) return
    stopTimer()
    setSelected(i)
    const korrekt = aufgabe.optionen[i].isCorrect
    setLetzteKorrekt(korrekt)
    onAufgabeAntwort(aufgabe.aufgabe_id, [aufgabe.optionen[i].text], korrekt)
    setAttackEffect({ icon: ATTACK_ICONS[i % ATTACK_ICONS.length], type: 'spieler' })
    setPhase('feedback')

    if (korrekt) {
      setBossShake(true)
      setTimeout(() => setBossShake(false), 400)
    }
    // HP-Abzug: richtiger Treffer nimmt Schaden; die LETZTE Frage besiegt den Boss ganz.
    setBossHp((hp) => (istLetzte ? 0 : korrekt ? Math.max(0, hp - schadenProTreffer) : hp))

    setTimeout(() => {
      if (beendetRef.current) return
      if (istLetzte) { beende(true); return }
      setAttackEffect(null)
      setSelected(null)
      setIdx((n) => n + 1)
      setPhase('kampf')
    }, korrekt ? 1100 : 1900)
  }

  const prozentZeit = (verbleibend / zeitSekunden) * 100
  const bossEmoji = phase === 'sieg' || bossHp <= 0 ? '💀' : bossHp > 50 ? '👹' : '😡'
  const status: 'idle' | 'korrekt' | 'falsch' =
    phase === 'kampf' ? 'idle' : phase === 'feedback' ? (letzteKorrekt ? 'korrekt' : 'falsch') : letzteKorrekt || phase === 'sieg' ? 'korrekt' : 'falsch'

  return (
    <div className="flex flex-col gap-4">
      {/* Fortschritt */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
        <span>Frage {Math.min(idx + 1, total)}/{total}</span>
        <span>{phase === 'sieg' ? '🏆 Boss besiegt!' : phase === 'niederlage' ? '💀 Besiegt' : '⚔️ Ein Boss, alle Fragen'}</span>
      </div>

      {/* Boss */}
      <motion.div
        animate={bossShake ? { x: [0, -12, 12, -8, 8, 0], rotate: [0, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="relative">
          <motion.div
            animate={phase === 'kampf' ? { y: [0, -4, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl"
            style={{ filter: `drop-shadow(0 6px 12px ${theme.error}60)` }}
          >
            {bossEmoji}
          </motion.div>
          <AnimatePresence>
            {attackEffect?.type === 'spieler' && (
              <motion.div
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: [0, 1.6, 1.2], rotate: 0, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 text-5xl pointer-events-none"
                style={{ filter: 'drop-shadow(0 0 8px gold)' }}
              >
                {attackEffect.icon}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Boss HP */}
        <div className="w-full max-w-[260px]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
            <span style={{ color: theme.error }}>Boss</span>
            <span style={{ color: theme.textMuted }} className="tabular-nums">
              {bossHp}/100
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
            <motion.div
              animate={{ width: `${bossHp}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full"
              style={{ background: `linear-gradient(90deg, ${theme.error}, ${theme.warning})` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Boss-Charge-Timer — läuft er ab, kostet es EIN Leben */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
          <span style={{ color: theme.warning }}>⏳ Boss lädt Angriff …</span>
          <span style={{ color: verbleibend <= 3 ? theme.error : theme.textMuted }} className="tabular-nums">
            {verbleibend}s
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.surfaceAlt }}>
          <motion.div
            animate={{ width: `${100 - prozentZeit}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${theme.warning}, ${theme.error})` }}
          />
        </div>
      </div>

      {/* Frage */}
      <div
        className="rounded-2xl px-4 py-3 text-center text-sm font-bold leading-snug"
        style={{ background: theme.accentSoft, border: `1px solid ${theme.border}`, color: theme.text }}
      >
        {aufgabe.text}
      </div>

      {/* Attack Cards */}
      <div className="grid grid-cols-1 gap-2">
        {aufgabe.optionen.map((opt, i) => {
          const isSelected = selected === i
          const showResult = phase !== 'kampf' && isSelected
          const isRight = opt.isCorrect

          let bg = theme.surface
          let border = theme.border
          let color = theme.text
          const glow = 'none'

          if (phase !== 'kampf') {
            if (showResult && isRight) { bg = theme.successSoft; border = theme.success; color = theme.success }
            else if (showResult && !isRight) { bg = theme.errorSoft; border = theme.error; color = theme.error }
            else if (!isSelected && isRight) { bg = theme.successSoft; border = theme.success; color = theme.success }
            else if (!isSelected) { bg = theme.surfaceAlt; color = theme.textMuted }
          }

          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => angreifen(i)}
              disabled={phase !== 'kampf'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.25 }}
              whileHover={phase === 'kampf' ? { scale: 1.02, x: 4 } : undefined}
              whileTap={phase === 'kampf' ? { scale: 0.97 } : undefined}
              className="rounded-2xl border-2 px-3 py-3 flex items-center gap-3 text-left disabled:cursor-default"
              style={{ background: bg, borderColor: border, color, boxShadow: glow }}
            >
              <span
                className="flex items-center justify-center text-lg flex-shrink-0 rounded-xl"
                style={{ width: 38, height: 38, background: theme.accentGradient, border: `2px solid ${theme.border}`, color: '#fff' }}
              >
                {ATTACK_ICONS[i % ATTACK_ICONS.length]}
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                  {ATTACK_NAMES[i % ATTACK_NAMES.length]}
                </span>
                <span className="text-sm font-semibold leading-snug">{opt.text}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Spieler-HP */}
      <motion.div
        animate={spielerShake ? { x: [0, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between rounded-2xl px-3 py-2 border"
        style={{ background: theme.surface, borderColor: theme.border }}
      >
        <span className="text-lg">🧙</span>
        <div className="flex flex-col flex-1 mx-3">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
            Du
          </span>
          <div className="flex gap-1">
            {Array.from({ length: startLeben }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ scale: i < spielerHp ? 1 : 0.7, opacity: i < spielerHp ? 1 : 0.3 }}
                className="text-base leading-none"
              >
                {i < spielerHp ? '❤️' : '🤍'}
              </motion.span>
            ))}
          </div>
        </div>
        <AnimatePresence>
          {attackEffect?.type === 'boss' && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1.2], opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl"
            >
              💢
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <ResultBanner
        status={status}
        detail={status === 'korrekt' ? (phase === 'sieg' ? '🏆 Boss besiegt!' : '⚔️ Treffer!') : status === 'falsch' ? 'Kein Treffer' : undefined}
        erklaerung={
          status === 'falsch' && phase === 'feedback'
            ? `Richtig gewesen wäre: ${aufgabe.optionen.find((o) => o.isCorrect)?.text ?? ''}`
            : undefined
        }
      />
    </div>
  )
}

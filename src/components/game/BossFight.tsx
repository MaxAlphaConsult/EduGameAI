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

interface Props {
  text: string
  optionen: Option[]
  /** Sekunden, bis der Boss angreift. Default: 12s */
  zeitSekunden?: number
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

const ATTACK_ICONS = ['🗡️', '✨', '⚡', '💥']
const ATTACK_NAMES = ['Slash', 'Magic', 'Strike', 'Smash']
const DEFAULT_ZEIT = 12

type Phase = 'kampf' | 'spieler-attack' | 'boss-attack' | 'fertig'

export function BossFight({ text, optionen, zeitSekunden = DEFAULT_ZEIT, onAntwort }: Props) {
  const theme = useGameTheme()
  const [phase, setPhase] = useState<Phase>('kampf')
  const [selected, setSelected] = useState<number | null>(null)
  const [bossHp, setBossHp] = useState(100)
  const [spielerHp, setSpielerHp] = useState(3)
  const [verbleibend, setVerbleibend] = useState(zeitSekunden)
  const [bossShake, setBossShake] = useState(false)
  const [spielerShake, setSpielerShake] = useState(false)
  const [attackEffect, setAttackEffect] = useState<{ icon: string; type: 'spieler' | 'boss' } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedRef = useRef(false)

  const triggerEnde = useCallback(
    (gewonnen: boolean, antwort: string) => {
      if (finishedRef.current) return
      finishedRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('fertig')
      if (gewonnen) burstKorrekt({ farbe: theme.success, intensitaet: 'normal' })
      setTimeout(() => onAntwort([antwort], gewonnen), 1200)
    },
    [onAntwort, theme.success],
  )

  // Timer
  useEffect(() => {
    if (phase !== 'kampf') return
    timerRef.current = setInterval(() => {
      setVerbleibend((v) => {
        if (v <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          // Boss greift an
          bossAttacke()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  function bossAttacke() {
    if (finishedRef.current) return
    setPhase('boss-attack')
    setAttackEffect({ icon: '💢', type: 'boss' })
    setSpielerShake(true)
    setTimeout(() => setSpielerShake(false), 400)
    setSpielerHp((hp) => {
      const neueHp = Math.max(0, hp - 1)
      if (neueHp <= 0) {
        triggerEnde(false, '⏱️ Zeit abgelaufen')
      } else {
        // Eine weitere Chance — neuer Timer
        setTimeout(() => {
          setAttackEffect(null)
          setVerbleibend(zeitSekunden)
          setPhase('kampf')
        }, 700)
      }
      return neueHp
    })
  }

  function angreifen(i: number) {
    if (phase !== 'kampf' || finishedRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSelected(i)
    const korrekt = optionen[i].isCorrect
    setPhase('spieler-attack')
    setAttackEffect({ icon: ATTACK_ICONS[i % ATTACK_ICONS.length], type: 'spieler' })

    if (korrekt) {
      // Boss-Treffer
      setBossShake(true)
      setTimeout(() => setBossShake(false), 400)
      const schaden = 34 + Math.floor(Math.random() * 12)
      setBossHp((hp) => {
        const neueHp = Math.max(0, hp - schaden)
        if (neueHp <= 0) {
          setTimeout(() => triggerEnde(true, optionen[i].text), 600)
        } else {
          // Nächste Runde — falls Aufgabe-Pattern später Multi-Round zulässt
          // Hier: erste richtige Antwort beendet die Aufgabe
          setTimeout(() => triggerEnde(true, optionen[i].text), 600)
        }
        return neueHp
      })
    } else {
      // Spieler verfehlt → Boss greift sofort an
      setTimeout(() => {
        setAttackEffect(null)
        setPhase('boss-attack')
        setSpielerShake(true)
        setTimeout(() => setSpielerShake(false), 400)
        setSpielerHp((hp) => {
          const neueHp = Math.max(0, hp - 1)
          // Falsche Antwort = Aufgabe gilt als falsch beantwortet, Spiel endet
          setTimeout(() => triggerEnde(false, optionen[i].text), 600)
          return neueHp
        })
      }, 500)
    }
  }

  const prozentZeit = (verbleibend / zeitSekunden) * 100
  const status: 'idle' | 'korrekt' | 'falsch' =
    phase !== 'fertig' ? 'idle' : bossHp <= 0 || (selected !== null && optionen[selected].isCorrect) ? 'korrekt' : 'falsch'

  return (
    <div className="flex flex-col gap-4">
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
            {bossHp > 50 ? '👹' : bossHp > 0 ? '😡' : '💀'}
          </motion.div>
          {/* Attack Effect on Boss */}
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

      {/* Boss-Charge-Timer */}
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
        style={{
          background: theme.accentSoft,
          border: `1px solid ${theme.border}`,
          color: theme.text,
        }}
      >
        {text}
      </div>

      {/* Attack Cards */}
      <div className="grid grid-cols-1 gap-2">
        {optionen.map((opt, i) => {
          const isSelected = selected === i
          const showResult = phase !== 'kampf' && isSelected
          const isRight = opt.isCorrect

          let bg = theme.surface
          let border = theme.border
          let color = theme.text
          let glow = 'none'

          if (phase !== 'kampf') {
            if (showResult && isRight) {
              bg = theme.successSoft
              border = theme.success
              color = theme.success
            } else if (showResult && !isRight) {
              bg = theme.errorSoft
              border = theme.error
              color = theme.error
            } else if (!isSelected && isRight) {
              bg = theme.successSoft
              border = theme.success
              color = theme.success
            } else if (!isSelected) {
              bg = theme.surfaceAlt
              color = theme.textMuted
            }
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
                style={{
                  width: 38,
                  height: 38,
                  background: theme.accentGradient,
                  border: `2px solid ${theme.border}`,
                  color: '#fff',
                }}
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
            {Array.from({ length: 3 }).map((_, i) => (
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
        detail={status === 'korrekt' ? '⚔️ Treffer!' : status === 'falsch' ? 'Boss kontert' : undefined}
        erklaerung={
          status === 'falsch'
            ? `Die richtige Attacke wäre: ${optionen.find((o) => o.isCorrect)?.text ?? ''}`
            : undefined
        }
      />
    </div>
  )
}

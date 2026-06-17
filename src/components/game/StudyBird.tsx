'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

interface Option {
  text: string
  isCorrect: boolean
}

/** Eine StudyBird-Aufgabe: Frage + Optionen mit isCorrect-Markierung. */
export interface StudyBirdAufgabe {
  aufgabe_id: string
  text: string
  optionen: Option[]
}

interface Props {
  /** Eine Aufgabe — wird in 3 Hindernisse expandiert (gleiche Frage 3×) */
  text?: string
  optionen?: Option[]
  /** Mehrere Aufgaben — endloser Modus, jedes Hindernis = eine andere Frage */
  aufgaben?: StudyBirdAufgabe[]
  hilfen?: string[]
  feedback?: { bei_korrekt: string; bei_falsch: string }
  /**
   * Pro durchflogenes Hindernis. Wenn `aufgaben` gesetzt ist, mit aufgabe_id der
   * jeweiligen Aufgabe. Sonst leerer String (Single-Aufgabe-Modus).
   */
  onAufgabeAntwort?: (aufgabeId: string, antworten: string[], korrekt: boolean) => void
  /** Wird einmal am Ende aufgerufen. */
  onSpielVorbei?: (stats: { korrekt: number; gesamt: number }) => void
  /** Legacy-Callback für Single-Aufgabe-Modus. */
  onAntwort?: (antworten: string[], korrekt: boolean) => void
}

// Geometrie
const ARENA_H = 420
const BIRD_X_PCT = 22
const BIRD_VISUAL = 34
const BIRD_HITBOX = 22   // kleinere Hitbox als Visual — Forgiveness
const PIPE_WIDTH = 96
const TOP_GAP_Y = 110
const BOTTOM_GAP_Y = 320
const GAP_SIZE = 140
const PIPE_SPACING_PX = 380
const PIPE_SCROLL_PX = 1.8
const GRAVITY = 0.34
const JUMP_VELOCITY = -7.0
const MAX_VELOCITY = 10
const SINGLE_AUFGABE_HINDERNISSE = 3
const MAX_LIVES = 5

interface Obstacle {
  id: number
  /** Index in der internen Aufgaben-Liste */
  aufgabeIdx: number
  x: number
  topLabel: string
  bottomLabel: string
  topIsCorrect: boolean
  chosen: 'top' | 'bottom' | null
  passed: boolean
  revealed: boolean
  /** Diese Aufgabe wurde schonmal gestellt — Retry-Versuch (visuell + Lebenslogik) */
  isRetry: boolean
}

type Phase = 'ready' | 'playing' | 'done'

export function StudyBird(props: Props) {
  const theme = useGameTheme()
  const arenaRef = useRef<HTMLDivElement>(null)

  // Normalisiere Eingabe — Single oder Multi
  const aufgabenInternal = useMemo<StudyBirdAufgabe[]>(() => {
    if (props.aufgaben && props.aufgaben.length > 0) {
      return props.aufgaben
    }
    if (props.text && props.optionen) {
      // Single-Aufgabe → in SINGLE_AUFGABE_HINDERNISSE Wiederholungen aufblähen
      return Array.from({ length: SINGLE_AUFGABE_HINDERNISSE }).map((_, i) => ({
        aufgabe_id: `single-${i}`,
        text: props.text!,
        optionen: props.optionen!,
      }))
    }
    return []
  }, [props.aufgaben, props.text, props.optionen])

  const totalHindernisse = aufgabenInternal.length

  const [phase, setPhase] = useState<Phase>('ready')
  const [birdY, setBirdY] = useState(ARENA_H / 2)
  const [birdRotation, setBirdRotation] = useState(0)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [arenaWidth, setArenaWidth] = useState(400)
  const [flash, setFlash] = useState<'korrekt' | 'falsch' | null>(null)
  /** Index der nächsten noch nicht passierten Aufgabe — bestimmt Frage oben */
  const [aktivIdx, setAktivIdx] = useState(0)

  const velocityRef = useRef(0)
  const lastIdRef = useRef(0)
  const obstaclesRef = useRef<Obstacle[]>([])
  const birdYRef = useRef(ARENA_H / 2)
  const livesRef = useRef(MAX_LIVES)
  const scoreRef = useRef(0)
  const phaseRef = useRef<Phase>('ready')
  const animRef = useRef<number>(0)
  /** performance.now() bis wann der Bird unverwundbar ist (i-Frames nach Crash). */
  const invincibleUntilRef = useRef(0)
  const [invincible, setInvincible] = useState(false)
  /** FIFO-Queue der noch zu spawnenden Aufgabe-Indices. Falsch beantwortete werden ans Ende gepusht. */
  const spawnQueueRef = useRef<number[]>([])
  /** Welche Aufgaben wurden schonmal gestellt — bestimmt isRetry + Lebenslogik */
  const spawnedOnceRef = useRef<Set<string>>(new Set())
  /** Welche Aufgaben wurden mindestens einmal richtig beantwortet */
  const korrektOnceRef = useRef<Set<string>>(new Set())
  const aufgabenRef = useRef(aufgabenInternal)
  aufgabenRef.current = aufgabenInternal

  useEffect(() => { birdYRef.current = birdY }, [birdY])
  useEffect(() => { obstaclesRef.current = obstacles }, [obstacles])
  useEffect(() => { livesRef.current = lives }, [lives])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Arena-Breite messen
  useEffect(() => {
    function update() {
      if (arenaRef.current) setArenaWidth(arenaRef.current.clientWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const beendeSpiel = useCallback(
    (gewonnen: boolean, score: number, total: number) => {
      if (phaseRef.current === 'done') return
      phaseRef.current = 'done'
      setPhase('done')
      if (gewonnen) burstKorrekt({ farbe: theme.success, intensitaet: 'gross' })
      setTimeout(() => {
        if (props.onSpielVorbei) {
          props.onSpielVorbei({ korrekt: score, gesamt: total })
        } else if (props.onAntwort) {
          // Single-Aufgabe-Fallback
          const richtige = aufgabenRef.current[0]?.optionen.find((o) => o.isCorrect)?.text ?? ''
          props.onAntwort([richtige], gewonnen)
        }
      }, 1400)
    },
    [theme.success, props],
  )

  function spawnFromQueue(startX: number): Obstacle | null {
    const idx = spawnQueueRef.current.shift()
    if (idx === undefined) return null
    return makeObstacleFor(idx, startX)
  }

  function makeObstacleFor(aufgabeIdx: number, startX: number): Obstacle {
    const a = aufgabenRef.current[aufgabeIdx]
    const isRetry = spawnedOnceRef.current.has(a.aufgabe_id)
    spawnedOnceRef.current.add(a.aufgabe_id)

    const correct = a.optionen.find((o) => o.isCorrect)
    const distractors = a.optionen.filter((o) => !o.isCorrect)
    const distractor = distractors[Math.floor(Math.random() * Math.max(1, distractors.length))]
    if (!correct || !distractor) {
      return {
        id: ++lastIdRef.current,
        aufgabeIdx,
        x: startX,
        topLabel: correct?.text ?? '?',
        bottomLabel: '?',
        topIsCorrect: true,
        chosen: null,
        passed: false,
        revealed: false,
        isRetry,
      }
    }
    const correctOnTop = Math.random() < 0.5
    return {
      id: ++lastIdRef.current,
      aufgabeIdx,
      x: startX,
      topLabel: correctOnTop ? correct.text : distractor.text,
      bottomLabel: correctOnTop ? distractor.text : correct.text,
      topIsCorrect: correctOnTop,
      chosen: null,
      passed: false,
      revealed: false,
      isRetry,
    }
  }

  function reset() {
    velocityRef.current = 0
    lastIdRef.current = 0
    setBirdY(ARENA_H / 2)
    setBirdRotation(0)
    setScore(0)
    scoreRef.current = 0
    setLives(MAX_LIVES)
    livesRef.current = MAX_LIVES
    setAktivIdx(0)
    // Queue initialisieren — alle Aufgaben in Reihenfolge
    spawnQueueRef.current = aufgabenRef.current.map((_, i) => i)
    spawnedOnceRef.current = new Set()
    korrektOnceRef.current = new Set()
    const pxToPct = 100 / Math.max(arenaWidth, 1)
    const initial: Obstacle[] = []
    const first = spawnFromQueue(115)
    if (first) initial.push(first)
    const second = spawnFromQueue(115 + PIPE_SPACING_PX * pxToPct)
    if (second) initial.push(second)
    setObstacles(initial)
    obstaclesRef.current = initial
  }

  function start() {
    reset()
    setPhase('playing')
    phaseRef.current = 'playing'
  }

  const jump = useCallback(() => {
    if (phaseRef.current === 'ready') {
      start()
      velocityRef.current = JUMP_VELOCITY
      return
    }
    if (phaseRef.current !== 'playing') return
    velocityRef.current = JUMP_VELOCITY
  }, [])

  // Game-Loop
  useEffect(() => {
    if (phase !== 'playing') return
    let last = performance.now()

    function loop(now: number) {
      const dt = Math.min(34, now - last) / 16.6
      last = now

      // Bird-Physik
      velocityRef.current = Math.min(MAX_VELOCITY, velocityRef.current + GRAVITY * dt)
      const newY = birdYRef.current + velocityRef.current * dt
      birdYRef.current = newY
      setBirdY(newY)
      setBirdRotation(Math.max(-30, Math.min(70, velocityRef.current * 6)))

      const isInvincible = now < invincibleUntilRef.current

      // Boundaries — Decke/Boden: clampen statt Reset, evtl. Leben kosten (außer i-Frame)
      if (newY < 6) {
        birdYRef.current = 6
        velocityRef.current = 0
        setBirdY(6)
        if (!isInvincible) {
          loseLife()
          if (livesRef.current <= 0) {
            beendeSpiel(false, scoreRef.current, aufgabenRef.current.length)
            return
          }
        }
      } else if (newY > ARENA_H - BIRD_VISUAL / 2 - 4) {
        birdYRef.current = ARENA_H - BIRD_VISUAL / 2 - 4
        velocityRef.current = 0
        setBirdY(birdYRef.current)
        if (!isInvincible) {
          loseLife()
          if (livesRef.current <= 0) {
            beendeSpiel(false, scoreRef.current, aufgabenRef.current.length)
            return
          }
        }
      }

      // Scrollen
      const pxToPct = 100 / Math.max(arenaWidth, 1)
      const scrollPct = PIPE_SCROLL_PX * dt * pxToPct
      let next = obstaclesRef.current.map((o) => ({ ...o, x: o.x - scrollPct }))

      // Nachspawnen wenn Queue noch nicht leer und genug Platz rechts ist
      const rightmost = next.length > 0 ? Math.max(...next.map((o) => o.x)) : 0
      if (
        spawnQueueRef.current.length > 0 &&
        rightmost < 100 - PIPE_SPACING_PX * pxToPct
      ) {
        const startX = next.length > 0 ? rightmost + PIPE_SPACING_PX * pxToPct : 110
        const newObs = spawnFromQueue(startX)
        if (newObs) next.push(newObs)
      }

      // Hitbox kleiner als Visual = Forgiveness
      const birdLeftPct = BIRD_X_PCT - (BIRD_HITBOX / 2 / arenaWidth) * 100
      const birdRightPct = BIRD_X_PCT + (BIRD_HITBOX / 2 / arenaWidth) * 100
      const birdTop = newY - BIRD_HITBOX / 2
      const birdBottom = newY + BIRD_HITBOX / 2

      let crashed = false
      type Reveal = { id: number; aufgabeIdx: number; korrekt: boolean; antwort: string; isRetry: boolean }
      const reveals: Reveal[] = []

      next = next.map((o) => {
        const pipeRightPct = o.x + (PIPE_WIDTH / arenaWidth) * 100
        const overlapX = pipeRightPct >= birdLeftPct && o.x <= birdRightPct

        const inTopGap =
          birdTop > TOP_GAP_Y - GAP_SIZE / 2 && birdBottom < TOP_GAP_Y + GAP_SIZE / 2
        const inBottomGap =
          birdTop > BOTTOM_GAP_Y - GAP_SIZE / 2 && birdBottom < BOTTOM_GAP_Y + GAP_SIZE / 2

        if (overlapX) {
          if (!inTopGap && !inBottomGap) {
            // Wand getroffen — Crash nur wenn nicht in i-Frames
            if (!isInvincible) crashed = true
          } else if (!o.chosen) {
            o = { ...o, chosen: inTopGap ? 'top' : 'bottom' }
          }
        }

        if (!o.passed && pipeRightPct < birdLeftPct) {
          if (o.chosen) {
            const korrekt =
              (o.chosen === 'top' && o.topIsCorrect) ||
              (o.chosen === 'bottom' && !o.topIsCorrect)
            const antwort = o.chosen === 'top' ? o.topLabel : o.bottomLabel
            reveals.push({ id: o.id, aufgabeIdx: o.aufgabeIdx, korrekt, antwort, isRetry: o.isRetry })
          }
          o = { ...o, passed: true, revealed: true }
        }
        return o
      })

      // Alte raus
      next = next.filter((o) => o.x + (PIPE_WIDTH / arenaWidth) * 100 > -5)

      obstaclesRef.current = next
      setObstacles(next)

      for (const r of reveals) {
        const aufgabe = aufgabenRef.current[r.aufgabeIdx]
        if (!aufgabe) continue
        // Engine bekommt jeden Versuch — auch Retries (für Diagnose)
        if (props.onAufgabeAntwort) {
          props.onAufgabeAntwort(aufgabe.aufgabe_id, [r.antwort], r.korrekt)
        }
        if (r.korrekt) {
          if (!korrektOnceRef.current.has(aufgabe.aufgabe_id)) {
            korrektOnceRef.current.add(aufgabe.aufgabe_id)
            scoreRef.current += 1
            setScore(scoreRef.current)
          }
          setFlash('korrekt')
          setTimeout(() => setFlash(null), 250)
          burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.3, y: 0.45 } })
        } else {
          // Aufgabe an Queue-Ende anhängen — kommt später wieder als Retry
          spawnQueueRef.current.push(r.aufgabeIdx)
          // Nur beim ersten Versuch Leben kosten. Retries sind kostenlose Übung.
          if (!r.isRetry) {
            livesRef.current = Math.max(0, livesRef.current - 1)
            setLives(livesRef.current)
          }
          setFlash('falsch')
          setTimeout(() => setFlash(null), 250)
        }
        setAktivIdx((idx) => Math.max(idx, r.aufgabeIdx + 1))
      }

      if (crashed) {
        loseLife()
        if (livesRef.current <= 0) {
          beendeSpiel(false, scoreRef.current, aufgabenRef.current.length)
          return
        }
        // Bird bleibt wo er ist — i-Frames erlauben Durchflug durch diese Wand
      }

      // Endbedingungen:
      //  - Verloren: 0 Leben (Spiel endet sofort)
      //  - Gewonnen: alle Aufgaben mindestens einmal korrekt + Queue leer + keine Obstacles mehr aktiv
      const allKorrekt =
        korrektOnceRef.current.size >= aufgabenRef.current.length
      const queueLeer = spawnQueueRef.current.length === 0
      const keineObstaclesMehr = obstaclesRef.current.every((o) => o.passed)

      if (livesRef.current <= 0) {
        beendeSpiel(false, scoreRef.current, aufgabenRef.current.length)
        return
      }
      if (allKorrekt && queueLeer && keineObstaclesMehr) {
        beendeSpiel(true, scoreRef.current, aufgabenRef.current.length)
        return
      }

      animRef.current = requestAnimationFrame(loop)
    }

    function loseLife() {
      livesRef.current = Math.max(0, livesRef.current - 1)
      setLives(livesRef.current)
      setFlash('falsch')
      setTimeout(() => setFlash(null), 280)
      // i-Frames für 1.2s — Bird kann durch Wände, blinkt sichtbar
      invincibleUntilRef.current = performance.now() + 1200
      setInvincible(true)
      setTimeout(() => setInvincible(false), 1200)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, arenaWidth, beendeSpiel, theme.success, props])

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump])

  // Sieg = alle Aufgaben mindestens einmal korrekt
  const allRichtig = score >= totalHindernisse
  const status: 'idle' | 'korrekt' | 'falsch' =
    phase !== 'done' ? 'idle' : allRichtig ? 'korrekt' : 'falsch'
  const gewonnen = allRichtig

  // Aktive Aufgabe für die Frage-Anzeige oben
  const aktiveAufgabe = aufgabenInternal[Math.min(aktivIdx, aufgabenInternal.length - 1)]

  function gapBg(o: Obstacle, gap: 'top' | 'bottom'): { fill: string; border: string; label: string } {
    if (o.revealed && o.chosen === gap) {
      const istKorrekt = (gap === 'top' && o.topIsCorrect) || (gap === 'bottom' && !o.topIsCorrect)
      return {
        fill: istKorrekt ? `${theme.success}55` : `${theme.error}55`,
        border: istKorrekt ? theme.success : theme.error,
        label: istKorrekt ? theme.success : theme.error,
      }
    }
    if (o.revealed) {
      return { fill: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)', label: 'rgba(255,255,255,0.3)' }
    }
    // Neutral — translucent, hell sichtbar
    return { fill: `${theme.accent}30`, border: `${theme.accent}AA`, label: theme.accent }
  }

  function wallBg(o: Obstacle): string {
    if (o.revealed && o.chosen) {
      const istKorrekt =
        (o.chosen === 'top' && o.topIsCorrect) ||
        (o.chosen === 'bottom' && !o.topIsCorrect)
      return istKorrekt ? `${theme.success}D0` : `${theme.error}D0`
    }
    return theme.mood === 'dark' ? '#1a1a2e' : '#3f3f46'
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Frage-Banner mit Wechsel-Animation */}
      <div className="min-h-[44px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={aktiveAufgabe?.aufgabe_id ?? 'leer'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="text-base font-bold leading-snug text-center px-2"
            style={{ color: theme.text }}
          >
            {aktiveAufgabe?.text ?? ''}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* HUD */}
      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Leben:{' '}
          <span className="text-base align-middle">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (i < lives ? '❤️' : '🤍')).join('')}
          </span>
        </span>
        <span style={{ color: theme.textMuted }}>
          Treffer:{' '}
          <span style={{ color: theme.success }}>
            {score}/{totalHindernisse}
          </span>
        </span>
      </div>

      {/* Arena */}
      <div
        ref={arenaRef}
        onPointerDown={(e) => {
          e.preventDefault()
          jump()
        }}
        className="relative w-full rounded-2xl overflow-hidden cursor-pointer"
        style={{
          height: ARENA_H,
          background:
            theme.mood === 'dark'
              ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 60%, #334155 100%)'
              : 'linear-gradient(180deg, #BAE6FD 0%, #93C5FD 70%, #86EFAC 100%)',
          border: `2px solid ${theme.border}`,
          boxShadow: theme.glowAccent,
        }}
        tabIndex={0}
      >
        {/* Background clouds */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 27) % 100}%`,
              top: `${15 + ((i * 23) % 40)}%`,
              width: 60 + i * 10,
              height: 24 + i * 4,
              background: theme.mood === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)',
              filter: 'blur(2px)',
            }}
            animate={{ x: ['-10%', '110%'] }}
            transition={{ duration: 25 + i * 5, repeat: Infinity, ease: 'linear', delay: -i * 8 }}
          />
        ))}

        {/* Obstacles */}
        {obstacles.map((o) => {
          const topGapTop = TOP_GAP_Y - GAP_SIZE / 2
          const topGapBottom = TOP_GAP_Y + GAP_SIZE / 2
          const bottomGapTop = BOTTOM_GAP_Y - GAP_SIZE / 2
          const bottomGapBottom = BOTTOM_GAP_Y + GAP_SIZE / 2
          const wall = wallBg(o)
          const topG = gapBg(o, 'top')
          const bottomG = gapBg(o, 'bottom')

          return (
            <div key={o.id}>
              {/* Wall: top */}
              <div
                className="absolute"
                style={{
                  left: `${o.x}%`,
                  top: 0,
                  width: PIPE_WIDTH,
                  height: topGapTop,
                  background: wall,
                  borderRadius: '0 0 12px 12px',
                  boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.25)',
                }}
              />
              {/* Retry-Badge oben über dem Hindernis */}
              {o.isRetry && (
                <div
                  className="absolute pointer-events-none flex items-center justify-center font-extrabold text-[11px]"
                  style={{
                    left: `${o.x}%`,
                    top: 4,
                    width: PIPE_WIDTH,
                    height: 22,
                    color: theme.warning,
                    textShadow: '0 1px 4px rgba(0,0,0,0.65)',
                    letterSpacing: '0.5px',
                  }}
                >
                  🔁 Wiederholung
                </div>
              )}
              {/* TOP GAP — translucent safe zone */}
              <div
                className="absolute pointer-events-none flex flex-col items-center justify-start"
                style={{
                  left: `${o.x}%`,
                  top: topGapTop,
                  width: PIPE_WIDTH,
                  height: GAP_SIZE,
                  background: topG.fill,
                  border: `2px dashed ${topG.border}`,
                  borderLeft: 'none',
                  borderRight: 'none',
                  boxShadow: `inset 0 0 20px ${topG.border}55`,
                }}
              >
                {/* Label-Chip oben in der Gap */}
                <div
                  className="px-2 py-1 mt-1.5 rounded-md text-[11px] font-extrabold text-white text-center max-w-full"
                  style={{
                    background: topG.label,
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    lineHeight: 1.1,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    width: 'calc(100% - 8px)',
                  }}
                >
                  {o.topLabel}
                </div>
              </div>
              {/* Wall: middle */}
              <div
                className="absolute"
                style={{
                  left: `${o.x}%`,
                  top: topGapBottom,
                  width: PIPE_WIDTH,
                  height: bottomGapTop - topGapBottom,
                  background: wall,
                  borderRadius: '12px',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
                }}
              />
              {/* BOTTOM GAP */}
              <div
                className="absolute pointer-events-none flex flex-col items-center justify-start"
                style={{
                  left: `${o.x}%`,
                  top: bottomGapTop,
                  width: PIPE_WIDTH,
                  height: GAP_SIZE,
                  background: bottomG.fill,
                  border: `2px dashed ${bottomG.border}`,
                  borderLeft: 'none',
                  borderRight: 'none',
                  boxShadow: `inset 0 0 20px ${bottomG.border}55`,
                }}
              >
                <div
                  className="px-2 py-1 mt-1.5 rounded-md text-[11px] font-extrabold text-white text-center max-w-full"
                  style={{
                    background: bottomG.label,
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    lineHeight: 1.1,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    width: 'calc(100% - 8px)',
                  }}
                >
                  {o.bottomLabel}
                </div>
              </div>
              {/* Wall: bottom */}
              <div
                className="absolute"
                style={{
                  left: `${o.x}%`,
                  top: bottomGapBottom,
                  width: PIPE_WIDTH,
                  height: ARENA_H - bottomGapBottom,
                  background: wall,
                  borderRadius: '12px 12px 0 0',
                  boxShadow: 'inset 0 4px 0 rgba(0,0,0,0.25)',
                }}
              />
            </div>
          )
        })}

        {/* Bird */}
        <motion.div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            left: `${BIRD_X_PCT}%`,
            top: birdY,
            width: BIRD_VISUAL,
            height: BIRD_VISUAL,
            transform: `translate(-50%, -50%) rotate(${birdRotation}deg)`,
            filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.3))`,
            transition: 'transform 50ms linear',
          }}
          animate={invincible ? { opacity: [1, 0.25, 1, 0.25, 1] } : { opacity: 1 }}
          transition={invincible ? { duration: 0.4, repeat: Infinity } : { duration: 0.1 }}
        >
          <div
            className="rounded-full flex items-center justify-center text-2xl"
            style={{
              width: BIRD_VISUAL,
              height: BIRD_VISUAL,
              background: theme.accentGradient,
              border: `2px solid #fff`,
            }}
          >
            🐦
          </div>
        </motion.div>

        {/* Flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.28 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: flash === 'korrekt' ? theme.success : theme.error }}
            />
          )}
        </AnimatePresence>

        {/* Ready-Screen */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            <div className="text-5xl">🐦</div>
            <div className="text-lg font-extrabold">Tipp oder Leertaste</div>
            <div className="text-xs opacity-90 max-w-xs leading-relaxed">
              Jedes Hindernis hat <strong>zwei Türen</strong>. Flieg durch die mit der
              richtigen Antwort. Falsche Fragen kommen <strong>so lange wieder</strong>,
              bis du sie kannst. Geschafft = alle {totalHindernisse} richtig.
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={start}
              className="mt-2 px-6 py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: theme.accentGradient, boxShadow: theme.glowAccent }}
            >
              Start 🚀
            </motion.button>
          </motion.div>
        )}

        {/* Game-Over-Screen */}
        {phase === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            <div className="text-5xl">{gewonnen ? '🎉' : '💥'}</div>
            <div className="text-xl font-extrabold">{gewonnen ? 'Geschafft!' : 'Knapp daneben'}</div>
            <div className="text-xs opacity-80">
              {score} / {totalHindernisse} richtig
            </div>
          </motion.div>
        )}
      </div>

      <ResultBanner
        status={status}
        detail={status === 'korrekt' ? `+${score * 10} XP` : undefined}
        erklaerung={
          status === 'falsch'
            ? props.feedback?.bei_falsch || `Beim nächsten Mal! ${score} von ${totalHindernisse} richtig.`
            : undefined
        }
      />
    </div>
  )
}

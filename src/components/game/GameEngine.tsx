'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MultipleChoice } from './MultipleChoice'
import { Zuordnung } from './Zuordnung'
import { Reihenfolge } from './Reihenfolge'
import { Hangman } from './Hangman'
import { SpaceInvaders } from './SpaceInvaders'
import { BossFight } from './BossFight'
import { SprintQuiz } from './SprintQuiz'
import { EscapeRoom } from './EscapeRoom'
import { Lueckentext } from './Lueckentext'
import { MemoryMatch } from './MemoryMatch'
import { StudyBird } from './StudyBird'
import { Millionaer } from './Millionaer'
import { WahrFalschSwipe } from './WahrFalschSwipe'
import { CodeCracker } from './CodeCracker'
import { SortierKarussell } from './SortierKarussell'
import { QuizTower } from './QuizTower'
import { WortSchlange } from './WortSchlange'
import { Detektiv, type Hotspot } from './Detektiv'
import { GameThemeProvider, useGameTheme } from './shared/GameTheme'
import { GameHUD } from './shared/GameHUD'
import { ModulIntro } from './shared/ModulIntro'
import { CelebrationOverlay } from './shared/FeedbackBurst'
import { burstStreak } from '@/lib/game/feedback'

interface Aufgabe {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren?: string[]
  hilfen?: string[]
  teilkompetenz?: string
}

interface ModulErgebnis {
  korrekt: number
  gesamt: number
  kannGut: string[]
  nochUeben: string[]
}

interface Props {
  moduleSessionId: string
  aufgaben: Aufgabe[]
  niveau: string
  gameSkin: string
  /** Modul-Titel — wird in der Intro angezeigt. */
  modulTitel?: string
  /** Optionaler Untertitel (Lernziel / Wissensform). */
  modulUntertitel?: string
  onModulFertig: (ergebnis: ModulErgebnis) => void
  preview?: boolean
}

interface AufgabenErgebnis {
  aufgabeId: string
  antworten: string[]
  korrekt: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildOptionen(aufgabe: Aufgabe) {
  return shuffle([
    ...aufgabe.loesungen.map((l) => ({ text: l, isCorrect: true })),
    ...(aufgabe.distraktoren ?? []).map((d) => ({ text: d, isCorrect: false })),
  ])
}

function parsePaare(aufgabe: Aufgabe) {
  const paare = aufgabe.loesungen
    .map((l) => {
      const parts = l.split(/\s*[→\-:]\s*/)
      return parts.length >= 2
        ? { links: parts[0].trim(), rechts: parts.slice(1).join(' → ').trim() }
        : null
    })
    .filter(Boolean) as { links: string; rechts: string }[]
  return paare.length > 0 ? paare : null
}

const XP_KORREKT = 10
const XP_STREAK_BONUS = 5

export function GameEngine(props: Props) {
  return (
    <GameThemeProvider skin={props.gameSkin}>
      <GameEngineInner {...props} />
    </GameThemeProvider>
  )
}

function GameEngineInner({
  moduleSessionId,
  aufgaben,
  gameSkin,
  modulTitel,
  modulUntertitel,
  onModulFertig,
  preview = false,
}: Props) {
  const theme = useGameTheme()
  const [phase, setPhase] = useState<'intro' | 'spiel'>('intro')
  const [current, setCurrent] = useState(0)
  const [bereit, setBereit] = useState(false)
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [leben, setLeben] = useState(5)
  const [celebration, setCelebration] = useState<{ titel: string; untertitel?: string } | null>(null)
  /** Aktuelle Anzeige ist eine Wiederholung einer schon einmal gestellten Aufgabe. */
  const [istRetry, setIstRetry] = useState(false)
  /** Anzahl Aufgaben, die mind. einmal richtig beantwortet wurden — Sieg-Progress. */
  const [geloest, setGeloest] = useState(0)
  const ergebnisseRef = useRef<AufgabenErgebnis[]>([])

  const aufgabe = aufgaben[current]

  const streakRef = useRef(0)
  useEffect(() => { streakRef.current = streak }, [streak])

  // Retry-Mechanik auf Modul-Ebene:
  //  - queueRef = noch zu spielende Aufgabe-Indices (FIFO, falsch beantwortete kommen ans Ende)
  //  - seenIdsRef = Aufgabe-Ids, die schon mind. einmal gezeigt wurden (steuert istRetry-Badge + Lebenslogik)
  //  - korrektOnceRef = Aufgabe-Ids, die mind. einmal richtig beantwortet wurden (Sieg-Bedingung)
  const queueRef = useRef<number[]>([])
  const seenIdsRef = useRef<Set<string>>(new Set())
  const korrektOnceRef = useRef<Set<string>>(new Set())
  const istRetryRef = useRef(false)
  useEffect(() => { istRetryRef.current = istRetry }, [istRetry])

  // Beim Wechsel intro → spiel Queue initialisieren
  useEffect(() => {
    if (phase === 'spiel') {
      queueRef.current = aufgaben.slice(1).map((_, i) => i + 1)
      seenIdsRef.current = new Set([aufgaben[0].aufgabe_id])
      korrektOnceRef.current = new Set()
      setIstRetry(false)
      setGeloest(0)
      setCurrent(0)
    }
  }, [phase, aufgaben])

  const recordAntwort = useCallback(
    async (aufgabeId: string, antworten: string[], korrekt: boolean) => {
      ergebnisseRef.current = [...ergebnisseRef.current, { aufgabeId, antworten, korrekt }]

      // Unique-Korrekt tracking — für Sieg-Bedingung + HUD-Progress
      if (korrekt && !korrektOnceRef.current.has(aufgabeId)) {
        korrektOnceRef.current.add(aufgabeId)
        setGeloest(korrektOnceRef.current.size)
      }

      if (korrekt) {
        const neueStreak = streakRef.current + 1
        streakRef.current = neueStreak
        setStreak(neueStreak)
        setXp((v) => v + XP_KORREKT + Math.max(0, (neueStreak - 1) * XP_STREAK_BONUS))
        if (neueStreak === 3) {
          setCelebration({ titel: 'Triple Combo!', untertitel: '🔥 3 richtig in Folge' })
          setTimeout(() => setCelebration(null), 1400)
          burstStreak(neueStreak, theme.warning)
        } else if (neueStreak === 5) {
          setCelebration({ titel: 'On Fire!', untertitel: '🔥🔥 5 in Folge' })
          setTimeout(() => setCelebration(null), 1400)
          burstStreak(neueStreak, theme.warning)
        } else if (neueStreak >= 7 && neueStreak % 3 === 1) {
          setCelebration({ titel: 'Unstoppable!', untertitel: `🔥 ${neueStreak} in Folge` })
          setTimeout(() => setCelebration(null), 1400)
          burstStreak(neueStreak, theme.warning)
        }
      } else {
        streakRef.current = 0
        setStreak(0)
        // Retry-Versuche kosten kein Leben — nur erste Versuche.
        if (!istRetryRef.current) {
          setLeben((l) => Math.max(0, l - 1))
        }
      }

      if (!preview) {
        try {
          await fetch('/api/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleSessionId, aufgabeId, antwortWert: antworten }),
          })
        } catch {
          /* Spiel läuft weiter */
        }
      }
    },
    [moduleSessionId, preview, theme.warning],
  )

  const handleAntwort = useCallback(
    async (antworten: string[], korrekt: boolean) => {
      await recordAntwort(aufgabe.aufgabe_id, antworten, korrekt)
      setBereit(true)
    },
    [aufgabe, recordAntwort],
  )

  const finishModul = useCallback(() => {
    const teilkompetenzMap = new Map(aufgaben.map((a) => [a.aufgabe_id, a.teilkompetenz]))
    const kannGut = new Set<string>()
    const nochUeben = new Set<string>()
    for (const e of ergebnisseRef.current) {
      const tk = teilkompetenzMap.get(e.aufgabeId)
      if (!tk) continue
      if (e.korrekt) kannGut.add(tk)
      else nochUeben.add(tk)
    }
    for (const tk of nochUeben) kannGut.delete(tk)

    onModulFertig({
      korrekt: ergebnisseRef.current.filter((e) => e.korrekt).length,
      gesamt: aufgaben.length,
      kannGut: [...kannGut],
      nochUeben: [...nochUeben],
    })
  }, [aufgaben, onModulFertig])

  function weiter() {
    setBereit(false)
    const aktuell = aufgaben[current]
    // Letztes Ergebnis für die aktuelle Aufgabe
    const letztes = [...ergebnisseRef.current].reverse().find((e) => e.aufgabeId === aktuell.aufgabe_id)
    if (!letztes?.korrekt) {
      // Falsch → Aufgabe ans Queue-Ende für Wiederholung
      queueRef.current.push(current)
    }

    // Sieg-Bedingung: alle Aufgaben mindestens einmal richtig
    const alleRichtig = korrektOnceRef.current.size >= aufgaben.length
    if (alleRichtig && queueRef.current.length === 0) {
      finishModul()
      return
    }
    // Verloren: keine Leben mehr
    if (leben <= 0) {
      finishModul()
      return
    }

    const nextIdx = queueRef.current.shift()
    if (nextIdx === undefined) {
      // Queue leer aber nicht alles richtig — Sicherheitsnetz
      finishModul()
      return
    }
    const nextAufgabe = aufgaben[nextIdx]
    const wirdRetry = seenIdsRef.current.has(nextAufgabe.aufgabe_id)
    seenIdsRef.current.add(nextAufgabe.aufgabe_id)
    setIstRetry(wirdRetry)
    setCurrent(nextIdx)
  }

  // Spezialfall: ganzes Modul aus study_bird-Aufgaben → ein einziges Endlos-Spiel
  const isStudyBirdModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'study_bird')

  // Spezialfall: ganzes Modul aus millionaer-Aufgaben → eine durchgehende Quiz-Show
  const isMillionaerModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'millionaer')

  const isSwipeModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'swipe')

  const isCodeCrackerModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'code_cracker')

  const isQuizTowerModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'quiz_tower')

  const isWortSchlangeModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'wort_schlange')

  const isDetektivModule =
    aufgaben.length > 0 && aufgaben.every((a) => a.antwortformat === 'detektiv')

  // WICHTIG: buildOptionen() shuffelt zufällig. Wenn das inline im JSX läuft,
  // wird die Reihenfolge bei jedem Re-Render neu gewürfelt — was Antworten
  // optisch „springen" lässt und schlimmer: pickAnswer könnte mit veralteter
  // Liste arbeiten. Daher memoizen wir pro Modul.
  const stableAufgabenMitOptionen = useMemo(
    () =>
      aufgaben.map((a) => ({
        aufgabe_id: a.aufgabe_id,
        text: a.text,
        optionen: buildOptionen(a),
        hilfen: a.hilfen,
      })),
    [aufgaben],
  )

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <ModulIntro
          titel={modulTitel ?? 'Auf zur nächsten Mission'}
          untertitel={modulUntertitel}
          anzahlAufgaben={aufgaben.length}
          spielzeitMin={Math.max(2, Math.round(aufgaben.length * 1.5))}
          onStart={() => setPhase('spiel')}
        />
      </div>
    )
  }

  // study_bird-Modul: ein StudyBird übernimmt alle Aufgaben endlos
  if (isStudyBirdModule) {
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <GameHUD
            aktuell={geloest}
            gesamt={aufgaben.length}
            xp={xp}
            streak={streak}
            leben={leben}
            maxLeben={0}
            badgeLabel={gameSkin}
          />
          <div
            className="rounded-3xl p-6 border"
            style={{
              background: theme.surface,
              borderColor: theme.border,
              boxShadow:
                theme.mood === 'dark'
                  ? '0 8px 32px rgba(0,0,0,0.35)'
                  : '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <StudyBird
              aufgaben={stableAufgabenMitOptionen}
              onAufgabeAntwort={(aufgabeId, antworten, korrekt) => {
                setCurrent((c) => Math.min(aufgaben.length - 1, c + 1))
                recordAntwort(aufgabeId, antworten, korrekt)
              }}
              onSpielVorbei={() => finishModul()}
            />
          </div>
        </div>

        <CelebrationOverlay
          show={celebration !== null}
          emoji="🔥"
          titel={celebration?.titel ?? ''}
          untertitel={celebration?.untertitel}
        />
      </div>
    )
  }

  // millionaer-Modul: 1 Spiel über alle Aufgaben (kein Retry — Millionär hat seine eigene Mechanik)
  if (isMillionaerModule) {
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <GameHUD
            aktuell={geloest}
            gesamt={aufgaben.length}
            xp={xp}
            streak={streak}
            leben={leben}
            maxLeben={0}
            badgeLabel={gameSkin}
          />
          <div
            className="rounded-3xl p-6 border"
            style={{
              background: theme.surface,
              borderColor: theme.border,
              boxShadow:
                theme.mood === 'dark'
                  ? '0 8px 32px rgba(0,0,0,0.35)'
                  : '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <Millionaer
              aufgaben={stableAufgabenMitOptionen}
              onAufgabeAntwort={(aufgabeId, antworten, korrekt) => {
                recordAntwort(aufgabeId, antworten, korrekt)
              }}
              onSpielVorbei={() => finishModul()}
            />
          </div>
        </div>

        <CelebrationOverlay
          show={celebration !== null}
          emoji="🏆"
          titel={celebration?.titel ?? ''}
          untertitel={celebration?.untertitel}
        />
      </div>
    )
  }

  // Swipe-Modul: alle Karten in einem Stack
  if (isSwipeModule) {
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <GameHUD aktuell={geloest} gesamt={aufgaben.length} xp={xp} streak={streak} leben={leben} maxLeben={0} badgeLabel={gameSkin} />
          <div className="rounded-3xl p-6 border" style={{ background: theme.surface, borderColor: theme.border }}>
            <WahrFalschSwipe
              aufgaben={aufgaben.map((a) => ({ aufgabe_id: a.aufgabe_id, text: a.text, loesungen: a.loesungen, hilfen: a.hilfen }))}
              onAufgabeAntwort={recordAntwort}
              onSpielVorbei={() => finishModul()}
            />
          </div>
        </div>
        <CelebrationOverlay show={celebration !== null} emoji="🔥" titel={celebration?.titel ?? ''} untertitel={celebration?.untertitel} />
      </div>
    )
  }

  // Code-Cracker-Modul
  if (isCodeCrackerModule) {
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <GameHUD aktuell={geloest} gesamt={aufgaben.length} xp={xp} streak={streak} leben={leben} maxLeben={0} badgeLabel={gameSkin} />
          <div className="rounded-3xl p-6 border" style={{ background: theme.surface, borderColor: theme.border }}>
            <CodeCracker
              aufgaben={stableAufgabenMitOptionen}
              onAufgabeAntwort={recordAntwort}
              onSpielVorbei={() => finishModul()}
            />
          </div>
        </div>
        <CelebrationOverlay show={celebration !== null} emoji="🔓" titel={celebration?.titel ?? ''} untertitel={celebration?.untertitel} />
      </div>
    )
  }

  // Quiz-Tower-Modul
  if (isQuizTowerModule) {
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <GameHUD aktuell={geloest} gesamt={aufgaben.length} xp={xp} streak={streak} leben={leben} maxLeben={0} badgeLabel={gameSkin} />
          <div className="rounded-3xl p-6 border" style={{ background: theme.surface, borderColor: theme.border }}>
            <QuizTower
              aufgaben={stableAufgabenMitOptionen}
              onAufgabeAntwort={recordAntwort}
              onSpielVorbei={() => finishModul()}
            />
          </div>
        </div>
        <CelebrationOverlay show={celebration !== null} emoji="🗼" titel={celebration?.titel ?? ''} untertitel={celebration?.untertitel} />
      </div>
    )
  }

  // Wort-Schlange-Modul: alle Lösungen aus allen Aufgaben werden ins gleiche Gitter eingebaut
  if (isWortSchlangeModule) {
    const woerter = aufgaben.flatMap((a) => a.loesungen).filter((w) => w && w.length >= 3)
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <GameHUD aktuell={geloest} gesamt={woerter.length} xp={xp} streak={streak} leben={leben} maxLeben={0} badgeLabel={gameSkin} />
          <div className="rounded-3xl p-6 border" style={{ background: theme.surface, borderColor: theme.border }}>
            <WortSchlange
              text={aufgaben[0].text}
              zuFindende={woerter}
              onAntwort={(antworten, korrekt) => {
                // Pro gefundenes Wort: zur passenden Aufgabe das richtige Ergebnis melden
                aufgaben.forEach((a) => {
                  const hit = a.loesungen.some((l) => antworten.includes(l.toUpperCase()))
                  recordAntwort(a.aufgabe_id, hit ? a.loesungen : [], hit)
                })
                finishModul()
                void korrekt
              }}
            />
          </div>
        </div>
        <CelebrationOverlay show={celebration !== null} emoji="🐍" titel={celebration?.titel ?? ''} untertitel={celebration?.untertitel} />
      </div>
    )
  }

  // Detektiv-Modul: Aufgaben werden auf Hotspots gemappt. Position aus aufgabe.teilkompetenz im Format "x@y".
  if (isDetektivModule) {
    const hotspots: Hotspot[] = aufgaben.map((a, idx) => {
      const koords = (a.teilkompetenz ?? '').match(/^(\d+(?:\.\d+)?)@(\d+(?:\.\d+)?)$/)
      const x = koords ? parseFloat(koords[1]) : 20 + (idx * 60) / Math.max(1, aufgaben.length - 1)
      const y = koords ? parseFloat(koords[2]) : 30 + (idx % 2) * 30
      return {
        id: a.aufgabe_id,
        x,
        y,
        frage: a.text,
        optionen: buildOptionen(a),
        indiz: a.loesungen[0] ?? '?',
        hilfen: a.hilfen,
      }
    })
    return (
      <div className="min-h-screen pt-4 pb-12 px-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <GameHUD aktuell={geloest} gesamt={aufgaben.length} xp={xp} streak={streak} leben={leben} maxLeben={0} badgeLabel={gameSkin} />
          <div className="rounded-3xl p-6 border" style={{ background: theme.surface, borderColor: theme.border }}>
            <Detektiv
              szene={{
                svg: '',
                beschreibung: modulTitel ?? 'Untersuche die Szene',
              }}
              hotspots={hotspots}
              onAufgabeAntwort={recordAntwort}
              onSpielVorbei={() => finishModul()}
            />
          </div>
        </div>
        <CelebrationOverlay show={celebration !== null} emoji="🔍" titel={celebration?.titel ?? ''} untertitel={celebration?.untertitel} />
      </div>
    )
  }

  const hilfen = aufgabe.hilfen ?? []
  const feedback = { bei_korrekt: 'Richtig!', bei_falsch: 'Leider falsch.' }
  const format = aufgabe.antwortformat

  return (
    <div className="min-h-screen pt-4 pb-12 px-4">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <GameHUD
          aktuell={geloest}
          gesamt={aufgaben.length}
          xp={xp}
          streak={streak}
          leben={leben}
          maxLeben={5}
          badgeLabel={gameSkin}
        />

        <AnimatePresence>
          {istRetry && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2 rounded-2xl py-2 px-4 font-bold text-xs"
              style={{
                background: `${theme.warning}22`,
                color: theme.warning,
                border: `1px dashed ${theme.warning}`,
              }}
            >
              🔁 Wiederholung — diese Aufgabe kam vorhin schon. Schaff sie jetzt.
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${current}-${ergebnisseRef.current.length}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-3xl p-6 border"
            style={{
              background: theme.surface,
              borderColor: theme.border,
              boxShadow:
                theme.mood === 'dark' ? '0 8px 32px rgba(0,0,0,0.35)' : '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            {format === 'hangman' ? (
              <Hangman
                text={aufgabe.text}
                wort={aufgabe.loesungen[0] ?? ''}
                hilfen={hilfen}
                feedback={feedback}
                onAntwort={handleAntwort}
              />
            ) : format === 'space_invaders' ? (
              <SpaceInvaders
                text={aufgabe.text}
                loesungen={aufgabe.loesungen}
                distraktoren={aufgabe.distraktoren ?? []}
                feedback={feedback}
                onAntwort={handleAntwort}
              />
            ) : format === 'boss_fight' ? (
              <BossFight
                text={aufgabe.text}
                optionen={buildOptionen(aufgabe)}
                onAntwort={handleAntwort}
              />
            ) : format === 'sprint_quiz' ? (
              <SprintQuiz
                text={aufgabe.text}
                optionen={buildOptionen(aufgabe)}
                onAntwort={handleAntwort}
              />
            ) : format === 'escape_room' ? (
              <EscapeRoom
                text={aufgabe.text}
                optionen={buildOptionen(aufgabe)}
                schlossNummer={current + 1}
                gesamtSchloesser={aufgaben.length}
                onAntwort={handleAntwort}
              />
            ) : format === 'lueckentext' ? (
              <Lueckentext
                text={aufgabe.text}
                loesungen={aufgabe.loesungen}
                distraktoren={aufgabe.distraktoren ?? []}
                hilfen={hilfen}
                feedback={feedback}
                onAntwort={handleAntwort}
              />
            ) : format === 'reihenfolge' ? (
              <Reihenfolge
                text={aufgabe.text}
                richtigeReihenfolge={aufgabe.loesungen}
                hilfen={hilfen}
                feedback={feedback}
                onAntwort={handleAntwort}
              />
            ) : format === 'study_bird' || format === 'flappy' ? (
              <StudyBird
                text={aufgabe.text}
                optionen={buildOptionen(aufgabe)}
                hilfen={hilfen}
                feedback={feedback}
                onAntwort={handleAntwort}
              />
            ) : format === 'sortieren' ? (
              (() => {
                // Erwartung: aufgabe.loesungen enthält Paare "Item → Kategorie"
                const items = aufgabe.loesungen
                  .map((l) => {
                    const parts = l.split(/\s*[→\-:]\s*/)
                    return parts.length >= 2
                      ? { text: parts[0].trim(), kategorie: parts.slice(1).join(' → ').trim() }
                      : null
                  })
                  .filter(Boolean) as { text: string; kategorie: string }[]
                const kategorien = Array.from(new Set(items.map((i) => i.kategorie)))
                return items.length > 0 && kategorien.length >= 2 ? (
                  <SortierKarussell
                    text={aufgabe.text}
                    items={items}
                    kategorien={kategorien}
                    onAntwort={handleAntwort}
                  />
                ) : (
                  <MultipleChoice
                    aufgabeId={aufgabe.aufgabe_id}
                    text={aufgabe.text}
                    optionen={buildOptionen(aufgabe)}
                    mehrfach={false}
                    hilfen={hilfen}
                    feedback={feedback}
                    onAntwort={handleAntwort}
                  />
                )
              })()
            ) : format === 'memory' || format === 'memory_match' ? (
              (() => {
                const paare = parsePaare(aufgabe)
                return paare && paare.length >= 2 ? (
                  <MemoryMatch
                    text={aufgabe.text}
                    paare={paare}
                    hilfen={hilfen}
                    feedback={feedback}
                    onAntwort={handleAntwort}
                  />
                ) : (
                  <MultipleChoice
                    aufgabeId={aufgabe.aufgabe_id}
                    text={aufgabe.text}
                    optionen={buildOptionen(aufgabe)}
                    mehrfach={false}
                    hilfen={hilfen}
                    feedback={feedback}
                    onAntwort={handleAntwort}
                  />
                )
              })()
            ) : format === 'zuordnung' ? (
              (() => {
                const paare = parsePaare(aufgabe)
                return paare ? (
                  <Zuordnung
                    text={aufgabe.text}
                    paare={paare}
                    hilfen={hilfen}
                    feedback={feedback}
                    onAntwort={handleAntwort}
                  />
                ) : (
                  <MultipleChoice
                    aufgabeId={aufgabe.aufgabe_id}
                    text={aufgabe.text}
                    optionen={buildOptionen(aufgabe)}
                    mehrfach={false}
                    hilfen={hilfen}
                    feedback={feedback}
                    onAntwort={handleAntwort}
                  />
                )
              })()
            ) : (
              <MultipleChoice
                aufgabeId={aufgabe.aufgabe_id}
                text={aufgabe.text}
                optionen={buildOptionen(aufgabe)}
                mehrfach={format === 'multiple_choice'}
                hilfen={hilfen}
                feedback={feedback}
                onAntwort={handleAntwort}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {bereit && (
            <motion.button
              key="weiter"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={weiter}
              className="w-full py-4 rounded-2xl font-bold text-base text-white"
              style={{ background: theme.accentGradient, boxShadow: theme.glowAccent }}
            >
              {current + 1 >= aufgaben.length ? 'Modul abschließen 🏁' : 'Weiter →'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={celebration !== null}
        emoji="🔥"
        titel={celebration?.titel ?? ''}
        untertitel={celebration?.untertitel}
      />
    </div>
  )
}

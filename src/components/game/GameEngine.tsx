'use client'

import { useState, useCallback, useRef } from 'react'
import { MultipleChoice } from './MultipleChoice'
import { Zuordnung } from './Zuordnung'
import { Reihenfolge } from './Reihenfolge'
import { Hangman } from './Hangman'
import { SpaceInvaders } from './SpaceInvaders'
import { BossFight } from './BossFight'
import { SprintQuiz } from './SprintQuiz'
import { EscapeRoom } from './EscapeRoom'
import { Lueckentext } from './Lueckentext'

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
  // Wird gefeuert, sobald alle Aufgaben des Moduls beantwortet sind.
  // Der Flow-Player triggert daraufhin den Übergang zum nächsten Modul
  // (oder zur Abschlussübersicht).
  onModulFertig: (ergebnis: ModulErgebnis) => void
  // Vorschau-Modus für die Lehrkraft: Antworten werden NICHT an /api/answers
  // gesendet, damit die Diagnostik clean bleibt.
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

const SKIN_LABEL: Record<string, string> = {
  unterstufe: '🐾 Lern-Abenteuer',
  mittelstufe: '🚀 Mission',
  oberstufe: '📊 Analyse',
  // Neue Skins
  'Boss Battle': '⚔️ Boss Fight',
  'Sprint-Bahn': '🏃 Sprint',
  'Escape Room': '🔐 Escape',
  'Detective Room': '🔍 Detektiv',
  'Radar-Scanner': '📡 Radar',
  'Puzzle-Karte': '🗺️ Puzzle',
  'Entdeckerkarte': '🧩 Entdecken',
  'Story-Fork': '📖 Story',
  'Werkstatt-Band': '🏭 Werkstatt',
  'Flow-Kette': '⛓️ Prozess',
  'Werkzeugkasten': '🔧 Begriffe',
  'Fehler-Scanner': '🔬 Fehler',
  'Waage': '⚖️ Kriterien',
  'Arena': '🏆 Gauntlet',
}

export function GameEngine({ moduleSessionId, aufgaben, gameSkin, onModulFertig, preview = false }: Props) {
  const [current, setCurrent] = useState(0)
  const [bereit, setBereit] = useState(false)
  const ergebnisseRef = useRef<AufgabenErgebnis[]>([])

  const aufgabe = aufgaben[current]
  const fortschritt = Math.round((current / aufgaben.length) * 100)

  const handleAntwort = useCallback(async (antworten: string[], korrekt: boolean) => {
    const eintrag = { aufgabeId: aufgabe.aufgabe_id, antworten, korrekt }
    ergebnisseRef.current = [...ergebnisseRef.current, eintrag]

    if (!preview) {
      try {
        await fetch('/api/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleSessionId, aufgabeId: aufgabe.aufgabe_id, antwortWert: antworten }),
        })
      } catch { /* Spiel läuft weiter */ }
    }

    setBereit(true)
  }, [aufgabe, moduleSessionId, preview])

  function weiter() {
    setBereit(false)
    if (current + 1 >= aufgaben.length) {
      // Modul fertig → Ergebnis an Flow-Player melden
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
    } else {
      setCurrent((c) => c + 1)
    }
  }

  const hilfen = aufgabe.hilfen ?? []
  const feedback = { bei_korrekt: 'Richtig!', bei_falsch: 'Leider falsch.' }
  const format = aufgabe.antwortformat

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{SKIN_LABEL[gameSkin] ?? 'Spiel'}</span>
        <span className="text-xs text-muted-foreground">Aufgabe {current + 1} / {aufgaben.length}</span>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${fortschritt}%` }} />
      </div>

      <div key={current} className="border rounded-2xl p-4 sm:p-6">
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
      </div>

      {bereit && (
        <button
          onClick={weiter}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
        >
          {current + 1 >= aufgaben.length ? 'Modul abschließen →' : 'Weiter →'}
        </button>
      )}
    </div>
  )
}

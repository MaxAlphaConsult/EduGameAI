'use client'

import { useEffect, useMemo, useState } from 'react'
import { SimpleMarkdown } from './SimpleMarkdown'
import type { Aufgabe, BausteinInhalt } from '@/types'

export interface ModulErgebnis {
  korrekt: number
  gesamt: number
  kannGut: string[]
  nochUeben: string[]
}

export interface BausteinRunnerProps {
  moduleSessionId: string
  titel: string
  inhalt: BausteinInhalt | null
  aufgaben: Aufgabe[]
  /** 'erklaer' gibt richtig/falsch-Feedback; 'check' bleibt neutral (unbenotet). */
  modus: 'erklaer' | 'check'
  preview?: boolean
  onModulFertig: (ergebnis: ModulErgebnis) => void
  /** Beschriftung des Start-Buttons auf dem Inhalts-Screen. */
  startLabel: string
  /** Optionaler Einleitungssatz über dem Inhalt. */
  intro?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const norm = (s: string) => s.toLowerCase().trim()

export function BausteinRunner({
  moduleSessionId, titel, inhalt, aufgaben, modus, preview, onModulFertig, startLabel, intro,
}: BausteinRunnerProps) {
  const [screen, setScreen] = useState<'inhalt' | 'fragen'>(inhalt ? 'inhalt' : 'fragen')

  // Inhalts-Text: Alt-Form nutzt `markdown`; neue Bausteine (Block D) tragen eine
  // Segment-Sequenz — hier ziehen wir die Text-Segmente zusammen (dieser Runner
  // wird nur noch für die neutralen Checks vorwissen_check/post_check verwendet).
  const inhaltMarkdown =
    inhalt?.markdown ??
    (inhalt?.segmente ?? []).map((s) => s.markdown).filter((m): m is string => !!m).join('\n\n')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const ergebnisseRef = useMemo(() => ({ current: [] as { teilkompetenz: string; korrekt: boolean }[] }), [])

  const aufgabe = aufgaben[index]

  // Optionen pro Aufgabe einmal mischen (stabil über Re-Renders).
  const optionen = useMemo(() => {
    if (!aufgabe) return [] as { text: string; korrekt: boolean }[]
    const richtige = aufgabe.loesungen.map((t) => ({ text: t, korrekt: true }))
    const falsche = (aufgabe.distraktoren ?? []).map((t) => ({ text: t, korrekt: false }))
    return shuffle([...richtige, ...falsche])
  }, [aufgabe])

  const mehrfach = aufgabe?.antwortformat === 'multiple_choice'

  // Keine Frage vorhanden → direkt fertig (sollte selten vorkommen). Im Effekt,
  // nicht während des Renderings, um React-Warnungen zu vermeiden.
  useEffect(() => {
    if (screen === 'fragen' && !aufgabe) {
      onModulFertig({ korrekt: 0, gesamt: 0, kannGut: [], nochUeben: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, aufgabe])

  if (!aufgabe && screen === 'fragen') return null

  function toggle(i: number) {
    if (submitted) return
    const next = new Set(selected)
    if (mehrfach) {
      next.has(i) ? next.delete(i) : next.add(i)
    } else {
      next.clear(); next.add(i)
    }
    setSelected(next)
  }

  async function submit() {
    if (selected.size === 0 || submitted) return
    const gewaehlt = Array.from(selected).map((i) => optionen[i].text)
    const loesungen = aufgabe.loesungen.map(norm)
    const korrekt =
      gewaehlt.map(norm).every((a) => loesungen.includes(a)) &&
      gewaehlt.length >= loesungen.length
    setSubmitted(true)
    ergebnisseRef.current.push({ teilkompetenz: aufgabe.teilkompetenz, korrekt })

    if (!preview) {
      try {
        await fetch('/api/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleSessionId, aufgabeId: aufgabe.aufgabe_id, antwortWert: gewaehlt }),
        })
      } catch { /* best effort — Diagnose toleriert fehlende Einzelantwort */ }
    }
  }

  function weiter() {
    if (index + 1 < aufgaben.length) {
      setIndex((i) => i + 1)
      setSelected(new Set())
      setSubmitted(false)
      return
    }
    // Fertig: Ergebnis aggregieren.
    const kannGut = new Set<string>()
    const nochUeben = new Set<string>()
    for (const e of ergebnisseRef.current) {
      if (!e.teilkompetenz) continue
      if (e.korrekt) kannGut.add(e.teilkompetenz)
      else nochUeben.add(e.teilkompetenz)
    }
    for (const tk of nochUeben) kannGut.delete(tk)
    onModulFertig({
      korrekt: ergebnisseRef.current.filter((e) => e.korrekt).length,
      gesamt: aufgaben.length,
      kannGut: [...kannGut],
      nochUeben: [...nochUeben],
    })
  }

  // ── Inhalts-Screen (Erklärtext + Kernaussagen) ─────────────────────────────
  if (screen === 'inhalt' && inhalt) {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-xl flex flex-col gap-5">
          {intro && <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{intro}</p>}
          <h1 className="text-2xl font-black">{titel}</h1>
          {inhaltMarkdown && <SimpleMarkdown markdown={inhaltMarkdown} />}
          {inhalt.kernaussagen.length > 0 && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-2">Das Wichtigste</p>
              <ul className="list-disc pl-5 flex flex-col gap-1 text-[15px] text-violet-900">
                {inhalt.kernaussagen.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
          )}
          <button
            onClick={() => setScreen('fragen')}
            className="w-full py-3.5 rounded-xl font-bold text-base text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
          >
            {startLabel}
          </button>
        </div>
      </div>
    )
  }

  // ── Frage-Screen ───────────────────────────────────────────────────────────
  const istKorrekt = submitted && optionen.every((o, i) => o.korrekt === selected.has(i))

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {modus === 'check' ? 'Kurze Einschätzung' : 'Verständnisfrage'}
          </span>
          {aufgaben.length > 1 && (
            <span className="text-xs text-muted-foreground">{index + 1} / {aufgaben.length}</span>
          )}
        </div>

        {modus === 'check' && !submitted && (
          <p className="text-sm text-muted-foreground">Kein Test — das hilft nur einzuschätzen, was du schon weißt.</p>
        )}

        <h2 className="text-lg font-bold">{aufgabe.text}</h2>

        <div className="flex flex-col gap-2.5">
          {optionen.map((o, i) => {
            const gewaehlt = selected.has(i)
            let cls = 'border-border bg-card hover:border-violet-300'
            if (submitted) {
              if (o.korrekt) cls = 'border-green-400 bg-green-50'
              else if (gewaehlt) cls = 'border-red-300 bg-red-50'
              else cls = 'border-border bg-card opacity-70'
            } else if (gewaehlt) {
              cls = 'border-violet-400 bg-violet-50'
            }
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={submitted}
                className={`text-left rounded-xl border px-4 py-3 text-[15px] transition-colors ${cls}`}
              >
                {o.text}
              </button>
            )
          })}
        </div>

        {!submitted && aufgabe.hilfen?.length > 0 && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer select-none">Tipp anzeigen</summary>
            <p className="mt-1">{aufgabe.hilfen[0]}</p>
          </details>
        )}

        {!submitted ? (
          <button
            onClick={submit}
            disabled={selected.size === 0}
            className="w-full py-3.5 rounded-xl font-bold text-base text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
          >
            {mehrfach ? 'Antwort prüfen' : 'Antworten'}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {modus === 'erklaer' ? (
              <p className={`text-sm font-semibold ${istKorrekt ? 'text-green-700' : 'text-amber-700'}`}>
                {istKorrekt ? 'Richtig! 🎉' : 'Noch nicht ganz — schau dir die richtige Lösung oben an.'}
              </p>
            ) : (
              <p className="text-sm font-semibold text-violet-700">Antwort gespeichert. 👍</p>
            )}
            <button
              onClick={weiter}
              className="w-full py-3.5 rounded-xl font-bold text-base text-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
            >
              {index + 1 < aufgaben.length ? 'Weiter →' : 'Fertig →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

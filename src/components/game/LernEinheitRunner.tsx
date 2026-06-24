'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SimpleMarkdown } from './shared/SimpleMarkdown'
import { InlineCheckView } from './InlineChecks'
import type { ModulErgebnis } from './shared/BausteinRunner'
import type { BausteinInhalt, InlineCheck, LernEinheitSegment } from '@/types'

// Block D — interleaved Lern-Einheit: Textblock → Check → Textblock → Check …
// Progressive Reveal: das nächste Segment wird erst freigegeben, wenn der aktuelle
// Check BEANTWORTET ist (nicht: korrekt). Feedback + Lösung zeigt das Check-Widget.
interface Props {
  moduleSessionId: string
  titel: string
  inhalt: BausteinInhalt
  intro?: string
  preview?: boolean
  onModulFertig: (e: ModulErgebnis) => void
}

export function LernEinheitRunner({ moduleSessionId, titel, inhalt, intro, preview, onModulFertig }: Props) {
  const segmente = useMemo<LernEinheitSegment[]>(() => inhalt.segmente ?? [], [inhalt])
  const checkAnzahl = useMemo(() => segmente.filter((s) => s.typ === 'check').length, [segmente])
  const [pos, setPos] = useState(0)
  const [antworten, setAntworten] = useState<Record<string, { korrekt: boolean; teilkompetenz: string }>>({})
  const endeRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [pos])

  const aktiv = segmente[pos]
  const aktivCheckId = aktiv?.typ === 'check' && aktiv.check ? aktiv.check.check_id : null
  // Weiter ist erst freigegeben, wenn ein Text-Segment aktiv ist ODER der aktive Check beantwortet wurde.
  const aktivBeantwortet = aktiv?.typ === 'text' || (aktivCheckId != null && antworten[aktivCheckId] != null)
  const istLetztes = pos >= segmente.length - 1

  async function handleAnswered(check: InlineCheck, korrekt: boolean, wert: unknown) {
    setAntworten((prev) => (prev[check.check_id] ? prev : { ...prev, [check.check_id]: { korrekt, teilkompetenz: check.teilkompetenz } }))
    if (!preview) {
      try {
        await fetch('/api/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleSessionId, aufgabeId: check.check_id, antwortWert: wert }),
        })
      } catch { /* best effort — Diagnose toleriert fehlende Einzelantwort */ }
    }
  }

  function fertig() {
    const eintraege = Object.values(antworten)
    const kannGut = new Set<string>()
    const nochUeben = new Set<string>()
    for (const e of eintraege) {
      if (!e.teilkompetenz) continue
      ;(e.korrekt ? kannGut : nochUeben).add(e.teilkompetenz)
    }
    for (const tk of nochUeben) kannGut.delete(tk)
    onModulFertig({
      korrekt: eintraege.filter((e) => e.korrekt).length,
      gesamt: checkAnzahl,
      kannGut: [...kannGut],
      nochUeben: [...nochUeben],
    })
  }

  if (segmente.length === 0) return null

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-5">
        {intro && <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{intro}</p>}
        <h1 className="text-2xl font-black">{titel}</h1>

        {segmente.slice(0, pos + 1).map((seg, i) => (
          <div key={i}>
            {seg.typ === 'text' && seg.markdown ? (
              <SimpleMarkdown markdown={seg.markdown} />
            ) : seg.typ === 'check' && seg.check ? (
              <InlineCheckView check={seg.check} onAnswered={(k, w) => handleAnswered(seg.check!, k, w)} />
            ) : null}
          </div>
        ))}

        {inhalt.kernaussagen?.length > 0 && istLetztes && aktivBeantwortet && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-2">Das Wichtigste</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[15px] text-violet-900">
              {inhalt.kernaussagen.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </div>
        )}

        {aktivBeantwortet && (
          <button
            onClick={() => (istLetztes ? fertig() : setPos((p) => p + 1))}
            className="w-full py-3.5 rounded-xl font-bold text-base text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
            {istLetztes ? 'Fertig →' : 'Weiter →'}
          </button>
        )}
        <div ref={endeRef} />
      </div>
    </div>
  )
}

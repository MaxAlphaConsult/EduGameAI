'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { InlineCheck, SchaubildQuelle } from '@/types'
import {
  pruefeQuiz, pruefeLueckentext, pruefeZuordnen, pruefeUnterstreichen,
  parsePaare, lueckenStuecke, istMarkierWortKorrekt, sanitizeSvg,
} from '@/lib/game/inline-check'

// Tier-1-Inline-Checks (Block D): reine React-Widgets, KEINE Game-Engine.
// Jedes Widget: Aufgabe zeigen → Antwort annehmen → bei Abgabe Feedback + Lösung
// anzeigen → genau einmal onAnswered(korrekt, wert) melden. Den "Weiter"-Button
// rendert der LernEinheitRunner (erst nach der Antwort).

export interface CheckWidgetProps {
  check: InlineCheck
  onAnswered: (korrekt: boolean, antwortWert: unknown) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Tipp({ hilfen, submitted }: { hilfen: string[]; submitted: boolean }) {
  if (submitted || !hilfen?.length) return null
  return (
    <details className="text-sm text-muted-foreground">
      <summary className="cursor-pointer select-none">Tipp anzeigen</summary>
      <p className="mt-1">{hilfen[0]}</p>
    </details>
  )
}

const btnPrimary = 'w-full py-3 rounded-xl font-bold text-white disabled:opacity-50'
const btnStyle = { background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }

function Feedback({ korrekt, loesung }: { korrekt: boolean; loesung: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${korrekt ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
      <p className="font-semibold mb-0.5">{korrekt ? 'Richtig! 🎉' : 'Noch nicht ganz.'}</p>
      {!korrekt && <p>Richtige Lösung: <span className="font-semibold">{loesung}</span></p>}
    </div>
  )
}

// ── Quiz (single/multiple choice) ──────────────────────────────────────────
function QuizCheck({ check, onAnswered }: CheckWidgetProps) {
  const mehrfach = check.quiz_format === 'multiple_choice'
  const optionen = useMemo(
    () => shuffle([
      ...check.loesungen.map((t) => ({ text: t, korrekt: true })),
      ...check.distraktoren.map((t) => ({ text: t, korrekt: false })),
    ]),
    [check],
  )
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggle(i: number) {
    if (submitted) return
    const next = new Set(selected)
    if (mehrfach) { if (next.has(i)) next.delete(i); else next.add(i) }
    else { next.clear(); next.add(i) }
    setSelected(next)
  }
  function submit() {
    if (submitted || selected.size === 0) return
    const gewaehlt = [...selected].map((i) => optionen[i].text)
    const korrekt = pruefeQuiz(check, gewaehlt)
    setSubmitted(true)
    onAnswered(korrekt, gewaehlt)
  }
  const korrekt = submitted && optionen.every((o, i) => o.korrekt === selected.has(i))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {optionen.map((o, i) => {
          const gewaehlt = selected.has(i)
          let cls = 'border-border bg-card hover:border-violet-300'
          if (submitted) {
            if (o.korrekt) cls = 'border-green-400 bg-green-50'
            else if (gewaehlt) cls = 'border-red-300 bg-red-50'
            else cls = 'border-border bg-card opacity-70'
          } else if (gewaehlt) cls = 'border-violet-400 bg-violet-50'
          return (
            <button key={i} onClick={() => toggle(i)} disabled={submitted}
              className={`text-left rounded-xl border px-4 py-2.5 text-[15px] transition-colors ${cls}`}>
              {o.text}
            </button>
          )
        })}
      </div>
      <Tipp hilfen={check.hilfen} submitted={submitted} />
      {!submitted
        ? <button onClick={submit} disabled={selected.size === 0} className={btnPrimary} style={btnStyle}>{mehrfach ? 'Antwort prüfen' : 'Antworten'}</button>
        : <Feedback korrekt={korrekt} loesung={check.loesungen.join(', ')} />}
    </div>
  )
}

// ── Lückentext ──────────────────────────────────────────────────────────────
function LueckentextCheck({ check, onAnswered }: CheckWidgetProps) {
  const stuecke = useMemo(() => lueckenStuecke(check.text ?? ''), [check])
  const anzahl = Math.max(0, stuecke.length - 1)
  const bank = useMemo(() => shuffle([...check.loesungen, ...check.distraktoren]), [check])
  const [eingaben, setEingaben] = useState<string[]>(() => Array(anzahl).fill(''))
  const [submitted, setSubmitted] = useState(false)

  function setBlank(i: number, v: string) {
    if (submitted) return
    setEingaben((prev) => { const n = [...prev]; n[i] = v; return n })
  }
  function submit() {
    if (submitted || eingaben.some((e) => !e)) return
    setSubmitted(true)
    onAnswered(pruefeLueckentext(check, eingaben), eingaben)
  }
  const korrekt = submitted && pruefeLueckentext(check, eingaben)
  const loesungstext = stuecke.reduce((acc, s, i) => acc + s + (i < anzahl ? `[${check.loesungen[i] ?? ''}]` : ''), '')

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-8">
        {stuecke.map((s, i) => (
          <span key={i}>
            {s}
            {i < anzahl && (
              <select value={eingaben[i]} disabled={submitted} onChange={(e) => setBlank(i, e.target.value)}
                className="mx-1 rounded-lg border border-violet-300 bg-violet-50 px-2 py-1 text-sm font-semibold">
                <option value="">— wählen —</option>
                {bank.map((w, k) => <option key={k} value={w}>{w}</option>)}
              </select>
            )}
          </span>
        ))}
      </p>
      <Tipp hilfen={check.hilfen} submitted={submitted} />
      {!submitted
        ? <button onClick={submit} disabled={eingaben.some((e) => !e)} className={btnPrimary} style={btnStyle}>Antworten</button>
        : <Feedback korrekt={korrekt} loesung={loesungstext} />}
    </div>
  )
}

// ── Zuordnen ──────────────────────────────────────────────────────────────
function ZuordnenCheck({ check, onAnswered }: CheckWidgetProps) {
  const paare = useMemo(() => parsePaare(check.loesungen), [check])
  const rechtsOptionen = useMemo(() => shuffle(paare.map((p) => p.rechts)), [paare])
  const [zuordnung, setZuordnung] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  function setMatch(links: string, rechts: string) {
    if (submitted) return
    setZuordnung((prev) => ({ ...prev, [links]: rechts }))
  }
  const vollstaendig = paare.every((p) => zuordnung[p.links])
  function submit() {
    if (submitted || !vollstaendig) return
    setSubmitted(true)
    onAnswered(pruefeZuordnen(check, zuordnung), zuordnung)
  }
  const korrekt = submitted && pruefeZuordnen(check, zuordnung)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {paare.map((p) => {
          const richtig = submitted && (zuordnung[p.links] ?? '').toLowerCase().trim() === p.rechts.toLowerCase().trim()
          return (
            <div key={p.links} className="flex items-center gap-2">
              <span className="text-[15px] font-semibold flex-1">{p.links}</span>
              <span className="text-muted-foreground">→</span>
              <select value={zuordnung[p.links] ?? ''} disabled={submitted}
                onChange={(e) => setMatch(p.links, e.target.value)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${submitted ? (richtig ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50') : 'border-violet-300 bg-violet-50'}`}>
                <option value="">— zuordnen —</option>
                {rechtsOptionen.map((r, k) => <option key={k} value={r}>{r}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      <Tipp hilfen={check.hilfen} submitted={submitted} />
      {!submitted
        ? <button onClick={submit} disabled={!vollstaendig} className={btnPrimary} style={btnStyle}>Antworten</button>
        : <Feedback korrekt={korrekt} loesung={paare.map((p) => `${p.links} → ${p.rechts}`).join(' · ')} />}
    </div>
  )
}

// ── Im Text unterstreichen ──────────────────────────────────────────────────
function UnterstreichenCheck({ check, onAnswered }: CheckWidgetProps) {
  // Tokenisieren: Wörter klickbar, Whitespace bleibt Text.
  const tokens = useMemo(() => (check.text ?? '').split(/(\s+)/), [check])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggle(i: number) {
    if (submitted) return
    const next = new Set(selected)
    if (next.has(i)) next.delete(i); else next.add(i)
    setSelected(next)
  }
  function submit() {
    if (submitted || selected.size === 0) return
    const woerter = [...selected].map((i) => tokens[i])
    setSubmitted(true)
    onAnswered(pruefeUnterstreichen(check, woerter), woerter)
  }
  const korrekt = submitted && pruefeUnterstreichen(check, [...selected].map((i) => tokens[i]))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-8 rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>
          const gewaehlt = selected.has(i)
          const sollMarkiert = istMarkierWortKorrekt(check, tok)
          let cls = 'cursor-pointer rounded px-0.5 '
          if (submitted) {
            if (sollMarkiert) cls += 'bg-green-200 underline decoration-2'
            else if (gewaehlt) cls += 'bg-red-200 line-through'
          } else if (gewaehlt) cls += 'bg-violet-300 underline decoration-2'
          else cls += 'hover:bg-violet-100'
          return <span key={i} onClick={() => toggle(i)} className={cls}>{tok}</span>
        })}
      </p>
      <Tipp hilfen={check.hilfen} submitted={submitted} />
      {!submitted
        ? <button onClick={submit} disabled={selected.size === 0} className={btnPrimary} style={btnStyle}>Markierung prüfen</button>
        : <Feedback korrekt={korrekt} loesung={check.loesungen.join(', ')} />}
    </div>
  )
}

// ── Schaubild (Mermaid bevorzugt, SVG sanitisiert) ──────────────────────────
function Schaubild({ schaubild }: { schaubild: SchaubildQuelle }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fehler, setFehler] = useState(false)

  useEffect(() => {
    // Nur Mermaid wird via innerHTML eingesetzt (securityLevel:'strict' → sicher).
    // Roh-SVG wird NICHT per innerHTML gerendert, sondern sandboxed als <img> (s.u.).
    if (schaubild.format !== 'mermaid') return
    let aktiv = true
    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
        const id = 'mmd-' + Math.random().toString(36).slice(2)
        const { svg } = await mermaid.render(id, schaubild.quelle)
        if (aktiv && ref.current) ref.current.innerHTML = svg
      } catch {
        if (aktiv) setFehler(true)
      }
    })()
    return () => { aktiv = false }
  }, [schaubild])

  // Roh-SVG (Fallback-Format): als Data-URI in einem <img> rendern. Browser führen
  // in SVG-als-Bild KEINE Skripte aus und laden keine externen Ressourcen → der
  // XSS-Vektor von innerHTML entfällt. sanitizeSvg zusätzlich als Gürtel-und-Hosenträger.
  if (schaubild.format === 'svg') {
    const src = `data:image/svg+xml;utf8,${encodeURIComponent(sanitizeSvg(schaubild.quelle))}`
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Schaubild zum Lerninhalt" className="mx-auto max-w-full rounded-xl border border-violet-100 bg-white p-3" />
  }

  if (fehler) {
    return <pre className="text-xs overflow-x-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">{schaubild.quelle}</pre>
  }
  return <div ref={ref} className="flex justify-center overflow-x-auto rounded-xl border border-violet-100 bg-white p-3 [&_svg]:max-w-full [&_svg]:h-auto" />
}

// ── Text mit Schaubild: Diagramm + Verständnisfrage (Quiz-Mechanik) ─────────
function SchaubildCheck({ check, onAnswered }: CheckWidgetProps) {
  return (
    <div className="flex flex-col gap-3">
      {check.schaubild && <Schaubild schaubild={check.schaubild} />}
      <QuizCheck check={check} onAnswered={onAnswered} />
    </div>
  )
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
export function InlineCheckView({ check, onAnswered }: CheckWidgetProps) {
  const inner = (() => {
    switch (check.typ) {
      case 'quiz': return <QuizCheck check={check} onAnswered={onAnswered} />
      case 'lueckentext': return <LueckentextCheck check={check} onAnswered={onAnswered} />
      case 'zuordnen': return <ZuordnenCheck check={check} onAnswered={onAnswered} />
      case 'unterstreichen': return <UnterstreichenCheck check={check} onAnswered={onAnswered} />
      case 'schaubild': return <SchaubildCheck check={check} onAnswered={onAnswered} />
      default: return null
    }
  })()
  return (
    <div className="rounded-2xl border border-violet-200 bg-white px-5 py-4 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Kurzer Check</p>
      <h3 className="text-base font-bold">{check.frage}</h3>
      {inner}
    </div>
  )
}

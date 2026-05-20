'use client'

import { useState, useTransition } from 'react'
import { UploadZone } from '@/components/playground/UploadZone'
import { LehrkraftCheckPanel } from '@/components/playground/LehrkraftCheckPanel'

type Step = 'upload' | 'metadata' | 'analysing' | 'result' | 'error'

const ANALYSE_SCHRITTE = [
  'Material analysieren', 'Kernaussagen extrahieren', 'Wissensform bestimmen',
  'Lernform bestimmen', 'Wissensstruktur bestimmen', 'Komplexitätsstufe bestimmen',
  'Lernziel formulieren', 'Spielbarkeit prüfen', 'Ampel-Entscheidung',
  'Antwortformat bestimmen', 'Game-Engine wählen', 'Game-Skin wählen',
  'Spieltyp benennen', 'Aufgaben generieren', 'Differenzierung erzeugen',
  'Fehlvorstellungen einbauen', 'Feedbackbausteine erstellen',
  'Fachliche Reduktion prüfen', 'Fachliche Korrektheit prüfen',
  'Sourcemapping erstellen', 'Lehrkraft-Check ausgeben',
]

const FAECHER = ['Biologie', 'Chemie', 'Physik', 'Mathematik', 'Deutsch', 'Geschichte',
  'Geographie', 'Politik', 'Philosophie', 'Englisch', 'Latein', 'Kunst', 'Musik', 'Sport', 'Informatik']
const STUFEN = Array.from({ length: 9 }, (_, i) => `${i + 5}`)
const SCHULFORMEN = ['Gymnasium', 'Realschule', 'Sekundarschule', 'Gesamtschule', 'Berufsschule', 'Grundschule']

interface AnalyseResult {
  gameFlowId: string
  spielIds: string[]
  analyseId: string
}

function getSpielRange(minuten: number): { min: number; max: number } {
  if (minuten <= 10) return { min: 2, max: 4 }
  if (minuten <= 20) return { min: 4, max: 6 }
  if (minuten <= 35) return { min: 6, max: 9 }
  return { min: 8, max: 12 }
}

const STEPS_NAV = ['Material', 'Details', 'KI analysiert', 'Ergebnis']

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E9D5FF',
  boxShadow: '0 2px 24px rgba(124,58,237,0.08)',
  borderRadius: 20,
}

const inputStyle = {
  width: '100%',
  border: '1.5px solid #E9D5FF',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  background: '#FAFAFA',
  color: '#1F1235',
  outline: 'none',
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1F1235' }

const SPIELFORMATE = [
  { id: 'single_choice',   label: 'Single Choice',   emoji: '☑️',  dauer: '1–2 Min',  zweck: 'Prüfen',    zweckFarbe: '#7C3AED' },
  { id: 'multiple_choice', label: 'Multiple Choice', emoji: '✅',  dauer: '2–3 Min',  zweck: 'Prüfen',    zweckFarbe: '#7C3AED' },
  { id: 'lueckentext',     label: 'Lückentext',      emoji: '📝',  dauer: '3–5 Min',  zweck: 'Festigen',  zweckFarbe: '#D97706' },
  { id: 'zuordnung',       label: 'Zuordnung',       emoji: '🔗',  dauer: '3–5 Min',  zweck: 'Festigen',  zweckFarbe: '#D97706' },
  { id: 'reihenfolge',     label: 'Reihenfolge',     emoji: '🔢',  dauer: '3–5 Min',  zweck: 'Festigen',  zweckFarbe: '#D97706' },
  { id: 'hangman',         label: 'Hangman',         emoji: '🔤',  dauer: '3–5 Min',  zweck: 'Vermitteln', zweckFarbe: '#059669' },
  { id: 'space_invaders',  label: 'Space Invaders',  emoji: '🚀',  dauer: '5–8 Min',  zweck: 'Festigen',  zweckFarbe: '#D97706' },
  { id: 'boss_fight',      label: 'Boss Fight',      emoji: '⚔️',  dauer: '5–8 Min',  zweck: 'Prüfen',    zweckFarbe: '#7C3AED' },
  { id: 'sprint_quiz',     label: 'Sprint Quiz',     emoji: '🏃',  dauer: '3–5 Min',  zweck: 'Prüfen',    zweckFarbe: '#7C3AED' },
  { id: 'escape_room',     label: 'Escape Room',     emoji: '🔐',  dauer: '8–12 Min', zweck: 'Festigen',  zweckFarbe: '#D97706' },
]

const ALLE_FORMAT_IDS = SPIELFORMATE.map(f => f.id)

export default function GameErstellenPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [progressSchrittIndex, setProgressSchrittIndex] = useState(0)
  const [analyseResult, setAnalyseResult] = useState<AnalyseResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedFormate, setSelectedFormate] = useState<string[]>(ALLE_FORMAT_IDS)
  const [zeitrahmenInput, setZeitrahmenInput] = useState(15)
  const [anzahlSpiele, setAnzahlSpiele] = useState(4)

  function onZeitrahmenChange(minuten: number) {
    setZeitrahmenInput(minuten)
    const range = getSpielRange(minuten)
    // Aktuellen Wert in die neue Range klemmen
    setAnzahlSpiele(prev => Math.min(Math.max(prev, range.min), range.max))
  }

  function toggleFormat(id: string) {
    setSelectedFormate(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(f => f !== id) : prev
        : [...prev, id]
    )
  }

  const stepIndex = step === 'upload' ? 0 : step === 'metadata' ? 1 : step === 'analysing' ? 2 : step === 'result' ? 3 : 0

  function onFile(f: File) { setFile(f); setStep('metadata') }

  function onSubmitMetadata(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const spielname = (form.elements.namedItem('spielname') as HTMLInputElement).value
    const fach = (form.elements.namedItem('fach') as HTMLSelectElement).value
    const jahrgangsstufe = (form.elements.namedItem('jahrgangsstufe') as HTMLSelectElement).value
    const schulform = (form.elements.namedItem('schulform') as HTMLSelectElement).value
    const lernziel = (form.elements.namedItem('lernziel') as HTMLInputElement).value
    const zeitrahmen = zeitrahmenInput

    // Sofort rendern — außerhalb der Transition
    setStep('analysing')
    setErrorMsg(null)
    setProgressPercent(0)
    setProgressLabel('Upload läuft …')
    setProgressSchrittIndex(0)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('file', file!)
        formData.append('fach', fach)
        formData.append('jahrgangsstufe', jahrgangsstufe)
        formData.append('schulform', schulform)

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}))
          throw new Error(body.error ?? 'Upload fehlgeschlagen')
        }
        const { material } = await uploadRes.json()

        const analyseRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialId: material.id, spielname: spielname || undefined, lernzielLehrkraft: lernziel || undefined, zeitrahmenMinuten: zeitrahmen, erlaubteFormate: selectedFormate, anzahlSpiele }),
        })
        if (!analyseRes.ok) {
          const body = await analyseRes.json().catch(() => ({}))
          throw new Error(body.error ?? 'Analyse fehlgeschlagen')
        }

        const reader = analyseRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const event = JSON.parse(line.slice(6))
            if (event.type === 'progress') {
              setProgressLabel(event.label)
              setProgressPercent(event.percent)
              setProgressSchrittIndex(event.schrittIndex)
            } else if (event.type === 'done') {
              setProgressPercent(100)
              setProgressSchrittIndex(ANALYSE_SCHRITTE.length)
              setAnalyseResult({ gameFlowId: event.gameFlowId, spielIds: event.spielIds, analyseId: event.analyseId })
              setStep('result')
              // Lehrkraft-Validierung asynchron pro Spiel anstoßen (Fire-and-Forget).
              // Jede POST-Anfrage läuft als eigenes Lambda; das LehrkraftCheckPanel
              // pollt anschließend pro Spiel den GET-Endpoint.
              if (Array.isArray(event.spielIds)) {
                for (const spielId of event.spielIds as string[]) {
                  fetch(`/api/games/${spielId}/check`, { method: 'POST' }).catch(() => { /* best effort */ })
                }
              }
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          }
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler')
        setStep('error')
      }
    })
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1F1235' }}>Neues Lernspiel</h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A94' }}>Lade dein Material hoch — der Rest läuft automatisch</p>
      </div>

      {/* Step Progress */}
      {step !== 'error' && (
        <div className="flex items-center gap-0 mb-8">
          {STEPS_NAV.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                  style={{
                    background: i <= stepIndex ? '#7C3AED' : '#E9D5FF',
                    color: i <= stepIndex ? 'white' : '#7A6A94',
                  }}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium whitespace-nowrap"
                  style={{ color: i === stepIndex ? '#7C3AED' : i < stepIndex ? '#1F1235' : '#7A6A94' }}>
                  {s}
                </span>
              </div>
              {i < STEPS_NAV.length - 1 && (
                <div className="flex-1 h-0.5 mx-3" style={{ background: i < stepIndex ? '#7C3AED' : '#E9D5FF' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div style={cardStyle} className="p-8">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#1F1235' }}>Material hochladen</h2>
          <p className="text-sm mb-6" style={{ color: '#7A6A94' }}>Lade ein PDF oder eine Textdatei mit deinem Unterrichtsmaterial hoch.</p>
          <UploadZone onFile={onFile} />
        </div>
      )}

      {/* Step 2: Metadata */}
      {step === 'metadata' && file && (
        <div style={cardStyle} className="p-8">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#1F1235' }}>Details angeben</h2>
          <p className="text-sm mb-6" style={{ color: '#7A6A94' }}>Damit die KI ein passendes Spiel erstellt, brauchen wir noch ein paar Infos.</p>

          {/* File badge */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
            style={{ background: '#F6F1FF', border: '1px solid #E9D5FF' }}>
            <span className="text-xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#1F1235' }}>{file.name}</p>
              <p className="text-xs" style={{ color: '#7A6A94' }}>{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => setStep('upload')}
              className="text-xs font-medium transition-colors"
              style={{ color: '#7C3AED' }}>Ändern</button>
          </div>

          <form onSubmit={onSubmitMetadata} className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>Spielname</label>
              <input name="spielname" type="text" required placeholder="z.B. Fotosynthese – Klasse 9a" style={inputStyle} />
              <p className="text-xs mt-1.5" style={{ color: '#7A6A94' }}>So findest du das Spiel später in deiner Übersicht.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Fach</label>
                <select name="fach" required style={inputStyle}>
                  <option value="">Bitte wählen</option>
                  {FAECHER.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Jahrgangsstufe</label>
                <select name="jahrgangsstufe" required style={inputStyle}>
                  <option value="">Bitte wählen</option>
                  {STUFEN.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Schulform</label>
                <select name="schulform" required style={inputStyle}>
                  <option value="">Bitte wählen</option>
                  {SCHULFORMEN.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Zeitrahmen (Minuten)</label>
              <div className="flex items-center gap-3">
                <input
                  name="zeitrahmen"
                  type="number"
                  value={zeitrahmenInput}
                  onChange={e => onZeitrahmenChange(parseInt(e.target.value) || 15)}
                  min={5} max={90}
                  style={{ ...inputStyle, width: 100 }}
                />
                <span className="text-xs" style={{ color: '#7A6A94' }}>
                  {(() => { const r = getSpielRange(zeitrahmenInput); return `→ ${r.min}–${r.max} Spiele möglich` })()}
                </span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Anzahl Spiele</label>
              <p className="text-xs mb-3" style={{ color: '#7A6A94' }}>
                Jedes Spiel hat 4 Aufgaben in einem anderen Format.
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const { min, max } = getSpielRange(zeitrahmenInput)
                  return Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => {
                    const aktiv = anzahlSpiele === n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnzahlSpiele(n)}
                        className="w-12 h-12 rounded-xl text-sm font-bold transition-all flex-shrink-0"
                        style={{
                          border: aktiv ? '2px solid #7C3AED' : '1.5px solid #E9D5FF',
                          background: aktiv ? '#7C3AED' : '#FAFAFA',
                          color: aktiv ? 'white' : '#7A6A94',
                        }}
                      >
                        {n}
                      </button>
                    )
                  })
                })()}
              </div>
              <p className="text-xs mt-2" style={{ color: '#7A6A94' }}>
                ≈ {anzahlSpiele * 3}–{anzahlSpiele * 5} Min. Spielzeit
              </p>
            </div>

            <div>
              <label style={labelStyle}>
                Eigenes Lernziel <span style={{ color: '#7A6A94', fontWeight: 400 }}>(optional)</span>
              </label>
              <input name="lernziel" type="text" placeholder="Die Schüler können… indem sie…" style={inputStyle} />
              <p className="text-xs mt-1.5" style={{ color: '#7A6A94' }}>Ohne Angabe formuliert die KI ein Lernziel aus dem Material.</p>
            </div>

            <div>
              <label style={labelStyle}>
                Spielformate <span style={{ color: '#7A6A94', fontWeight: 400 }}>(mindestens 1)</span>
              </label>
              <p className="text-xs mb-3" style={{ color: '#7A6A94' }}>
                Die KI wählt nur aus den aktivierten Formaten. Deaktiviere Formate, die du nicht möchtest.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SPIELFORMATE.map(f => {
                  const aktiv = selectedFormate.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFormat(f.id)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                      style={{
                        border: aktiv ? '1.5px solid #7C3AED' : '1.5px solid #E9D5FF',
                        background: aktiv ? '#F6F1FF' : '#FAFAFA',
                      }}
                    >
                      <span className="text-lg w-6 text-center flex-shrink-0">{f.emoji}</span>
                      <span className="font-semibold text-sm flex-1" style={{ color: '#1F1235' }}>{f.label}</span>
                      <span className="text-xs" style={{ color: '#7A6A94' }}>{f.dauer}</span>
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                        style={{ background: `${f.zweckFarbe}18`, color: f.zweckFarbe }}>
                        {f.zweck}
                      </span>
                      <span className="text-base flex-shrink-0">{aktiv ? '✓' : '○'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={isPending}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all mt-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', boxShadow: '0 4px 20px rgba(124,58,237,0.35)', opacity: isPending ? 0.6 : 1 }}>
              {isPending ? 'Wird gestartet…' : '✦ Lernspiel erstellen →'}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Analysing */}
      {step === 'analysing' && (
        <div style={cardStyle} className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
              🤖
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold" style={{ color: '#1F1235' }}>Dein Lernspiel wird gerade gebaut</h2>
              <p className="text-xs" style={{ color: '#7A6A94' }}>{progressLabel || 'Wird vorbereitet …'}</p>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: '#7C3AED' }}>
              {progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="rounded-full h-3 mb-6" style={{ background: '#E9D5FF' }}>
            <div className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }} />
          </div>

          <div className="flex flex-col gap-1">
            {ANALYSE_SCHRITTE.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: i === progressSchrittIndex ? '#F6F1FF' : 'transparent',
                  color: i < progressSchrittIndex ? '#059669' : i === progressSchrittIndex ? '#7C3AED' : '#C4B5FD',
                }}>
                <span className="w-5 text-center flex-shrink-0 text-xs">
                  {i < progressSchrittIndex ? '✓' : i === progressSchrittIndex ? '⟳' : `${i + 1}`}
                </span>
                <span className={i === progressSchrittIndex ? 'font-semibold' : ''}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && analyseResult && (
        <div className="flex flex-col gap-5">
          {/* Erfolgs-Header mit klaren nächsten Schritten */}
          <div className="rounded-3xl p-6"
            style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', border: '1px solid #6EE7B7' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="text-lg font-bold" style={{ color: '#065F46' }}>Dein Lernspiel ist fertig!</p>
                <p className="text-xs" style={{ color: '#047857' }}>
                  {analyseResult.spielIds.length} {analyseResult.spielIds.length === 1 ? 'Modul' : 'Module'}, didaktisch sortiert. Wirf einen Blick rein und gib es deiner Klasse.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href="/spiele"
                className="rounded-2xl px-5 py-3 text-center text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.3)', textDecoration: 'none' }}>
                ▶ Lernspiel ansehen
              </a>
              <a href="/classes"
                className="rounded-2xl px-5 py-3 text-center text-sm font-bold transition-all"
                style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', textDecoration: 'none' }}>
                👥 An Klasse freigeben
              </a>
            </div>
          </div>

          {/* Module-Vorschauliste */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A6A94' }}>
              Module in didaktischer Reihenfolge (leicht → schwer)
            </p>
            <div className="flex flex-col gap-2">
              {analyseResult.spielIds.map((id, i) => (
                <a
                  key={id}
                  href={`/modules/${id}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                  style={{ background: '#F6F1FF', border: '1px solid #E9D5FF' }}
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#7C3AED', color: 'white' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium flex-1" style={{ color: '#1F1235' }}>
                    Modul {i + 1}
                  </span>
                  <span className="text-xs" style={{ color: '#7C3AED' }}>→ Vorschau</span>
                </a>
              ))}
            </div>
          </div>

          <LehrkraftCheckPanel spielId={analyseResult.spielIds[0]} />
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="rounded-2xl p-6" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-sm mb-1" style={{ color: '#991B1B' }}>Fehler beim Erstellen</p>
              <p className="text-sm" style={{ color: '#B91C1C' }}>{errorMsg}</p>
              <button onClick={() => setStep('upload')} className="mt-4 text-sm font-medium"
                style={{ color: '#7C3AED' }}>← Neu versuchen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

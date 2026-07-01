'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UploadZone } from '@/components/playground/UploadZone'
import { LehrkraftCheckPanel } from '@/components/playground/LehrkraftCheckPanel'
import { useGeneration } from '@/lib/generation-context'
import { createClient } from '@/lib/supabase/client'
import { QrCode } from '@/components/qr-code'

type LocalStep = 'upload' | 'metadata'

interface Klasse { id: string; name: string; jahrgangsstufe: string; fach: string; schulform: string | null }

// Drei verständliche Makro-Phasen statt der 21 internen Pipeline-Schritte.
// Der aktive Schritt wird aus dem Fortschritt (percent) abgeleitet, damit die
// Liste NIE „fertig" zeigt, während der Balken noch läuft.
const ANALYSE_SCHRITTE = [
  'Lerngegenstand analysieren',
  'Game-Engine & Aufgabenformat wählen',
  'Aufgaben und Spiele generieren',
]

const SCHULFORMEN = ['Gymnasium', 'Realschule', 'Sekundarschule', 'Gesamtschule', 'Berufsschule', 'Grundschule']

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
  { id: 'memory',          label: 'Memory Match',    emoji: '🃏',  dauer: '3–5 Min',  zweck: 'Festigen',  zweckFarbe: '#D97706' },
  { id: 'study_bird',      label: 'Study Bird',      emoji: '🐦',  dauer: '2–4 Min',  zweck: 'Prüfen',    zweckFarbe: '#7C3AED' },
]

const ALLE_FORMAT_IDS = SPIELFORMATE.map(f => f.id)

export default function GameErstellenPage() {
  const gen = useGeneration()
  const [localStep, setLocalStep] = useState<LocalStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [selectedFormate, setSelectedFormate] = useState<string[]>(ALLE_FORMAT_IDS)
  const [zeitrahmenInput, setZeitrahmenInput] = useState(15)
  const [submitting, setSubmitting] = useState(false)

  // Klassen für „ein Launch" — der fertige LernFlow wird direkt freigegeben.
  const [klassen, setKlassen] = useState<Klasse[]>([])
  const [selectedKlasseId, setSelectedKlasseId] = useState<string>('')
  const [showNeueKlasse, setShowNeueKlasse] = useState(false)
  const [neueKlasse, setNeueKlasse] = useState({ name: '', jahrgangsstufe: '', fach: '', schulform: '' })
  const [klasseError, setKlasseError] = useState<string | null>(null)
  const [creatingKlasse, setCreatingKlasse] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let aktiv = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('classes')
        .select('id, name, jahrgangsstufe, fach, schulform')
        .eq('lehrer_id', user.id)
        .order('erstellt_am', { ascending: false })
      if (!aktiv) return
      const liste = data ?? []
      setKlassen(liste)
      // Keine Klasse vorhanden? Direkt das Anlegen-Panel zeigen.
      if (liste.length === 0) setShowNeueKlasse(true)
      else setSelectedKlasseId((prev) => prev || liste[0].id)
    })()
    return () => { aktiv = false }
  }, [])

  const selectedKlasse = klassen.find((k) => k.id === selectedKlasseId) ?? null

  async function onCreateKlasse() {
    const name = neueKlasse.name.trim()
    const jahrgangsstufe = neueKlasse.jahrgangsstufe.trim()
    const fach = neueKlasse.fach.trim()
    const schulform = neueKlasse.schulform
    if (!name || !jahrgangsstufe || !fach || !schulform) {
      setKlasseError('Bitte Bezeichnung, Jahrgangsstufe, Fach und Schulform ausfüllen.')
      return
    }
    setCreatingKlasse(true)
    setKlasseError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setKlasseError('Nicht eingeloggt.'); setCreatingKlasse(false); return }
    const { data, error } = await supabase
      .from('classes')
      .insert({ name, jahrgangsstufe, fach, schulform, lehrer_id: user.id })
      .select('id, name, jahrgangsstufe, fach, schulform')
      .single()
    setCreatingKlasse(false)
    if (error || !data) { setKlasseError('Klasse konnte nicht angelegt werden.'); return }
    setKlassen((prev) => [data, ...prev])
    setSelectedKlasseId(data.id)
    setShowNeueKlasse(false)
    setNeueKlasse({ name: '', jahrgangsstufe: '', fach: '', schulform: '' })
  }

  // Sichtbarer Step ist eine Funktion aus Context + lokalem Step.
  // Sobald eine Generierung läuft, gewinnt der Context.
  const step: 'upload' | 'metadata' | 'analysing' | 'result' | 'error' =
    gen.status === 'running' ? 'analysing'
    : gen.status === 'done' ? 'result'
    : gen.status === 'error' ? 'error'
    : localStep

  const progressPercent = gen.percent
  const progressLabel = gen.label
  // Aktiver Makro-Schritt direkt aus dem Fortschritt — bleibt so immer synchron
  // zum Balken (0–30 % analysieren, 30–50 % Engine/Format, ab 50 % generieren).
  const macroActive = progressPercent >= 50 ? 2 : progressPercent >= 30 ? 1 : 0
  const alleSchritteFertig = gen.status === 'done'
  const analyseResult = gen.result
  const errorMsg = gen.error

  function onZeitrahmenChange(minuten: number) {
    setZeitrahmenInput(minuten)
  }

  // Spiele sind nur ein motivierender Abschluss (Zugabe) — die Länge des LernFlows
  // ergibt sich aus Lerngegenstand + Umfang. Die Spielanzahl wird daher nicht mehr
  // von der Lehrkraft gewählt, sondern moderat aus dem Zeitrahmen abgeleitet.
  const abgeleiteteSpielanzahl = Math.max(1, Math.round(getSpielRange(zeitrahmenInput).min / 2))

  function toggleFormat(id: string) {
    setSelectedFormate(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(f => f !== id) : prev
        : [...prev, id]
    )
  }

  const stepIndex = step === 'upload' ? 0 : step === 'metadata' ? 1 : step === 'analysing' ? 2 : step === 'result' ? 3 : 0

  function onFile(f: File) { setFile(f); setLocalStep('metadata') }

  function weiter() {
    // Nach Erfolg oder Fehler zurück zur Upload-Ansicht für die nächste Erstellung
    gen.dismiss()
    setFile(null)
    setCopied(false)
    setLocalStep('upload')
  }

  async function onSubmitMetadata(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return
    if (!selectedKlasse) { setKlasseError('Bitte zuerst eine Klasse wählen oder anlegen.'); return }
    const form = e.currentTarget
    const spielname = (form.elements.namedItem('spielname') as HTMLInputElement).value
    const lernziel = (form.elements.namedItem('lernziel') as HTMLInputElement).value

    setSubmitting(true)
    try {
      await gen.start({
        file,
        // Fach, Jahrgangsstufe UND Schulform kommen aus der gewählten Klasse — je eine Eingabe weniger.
        fach: selectedKlasse.fach,
        jahrgangsstufe: selectedKlasse.jahrgangsstufe,
        schulform: selectedKlasse.schulform ?? '',
        spielname,
        lernziel: lernziel || undefined,
        zeitrahmenMinuten: zeitrahmenInput,
        erlaubteFormate: selectedFormate,
        // Kein Lehrkraft-Richtwert mehr: die Länge ergibt sich aus Lerngegenstand +
        // Umfang; ein moderater Spiel-Abschluss wird aus dem Zeitrahmen abgeleitet.
        anzahlSpiele: abgeleiteteSpielanzahl,
        classId: selectedKlasse.id,
      })
    } catch (err) {
      // gen.start setzt selbst den Error-State; nur Pending zurücksetzen
      console.error('[playground]', err)
    } finally {
      setSubmitting(false)
    }
  }

  const isPending = submitting || gen.status === 'running'

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1F1235' }}>Neuer LernFlow</h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A94' }}>Lade dein Material hoch — der Rest läuft automatisch</p>
      </div>

      {/* Step Progress */}
      {step !== 'error' && (
        <div className="flex items-center gap-0 mb-6 md:mb-8">
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
                <span className="hidden sm:inline text-xs font-medium whitespace-nowrap"
                  style={{ color: i === stepIndex ? '#7C3AED' : i < stepIndex ? '#1F1235' : '#7A6A94' }}>
                  {s}
                </span>
              </div>
              {i < STEPS_NAV.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 sm:mx-3" style={{ background: i < stepIndex ? '#7C3AED' : '#E9D5FF' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div style={cardStyle} className="p-5 sm:p-6 md:p-8">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#1F1235' }}>Material hochladen</h2>
          <p className="text-sm mb-6" style={{ color: '#7A6A94' }}>Lade ein PDF oder eine Textdatei mit deinem Unterrichtsmaterial hoch.</p>
          <UploadZone onFile={onFile} />
        </div>
      )}

      {/* Step 2: Metadata */}
      {step === 'metadata' && file && (
        <div style={cardStyle} className="p-5 sm:p-6 md:p-8">
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
            <button type="button" onClick={() => setLocalStep('upload')}
              className="text-xs font-medium transition-colors"
              style={{ color: '#7C3AED' }}>Ändern</button>
          </div>

          <form onSubmit={onSubmitMetadata} className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>Spielname</label>
              <input name="spielname" type="text" required placeholder="z.B. Fotosynthese – Klasse 9a" style={inputStyle} />
              <p className="text-xs mt-1.5" style={{ color: '#7A6A94' }}>So findest du das Spiel später in deiner Übersicht.</p>
            </div>

            {/* Klasse — bestimmt zugleich Fach + Jahrgangsstufe + Schulform UND für wen am Ende freigegeben wird. */}
            <div>
              <label style={labelStyle}>Klasse</label>
              {klassen.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={selectedKlasseId}
                    onChange={(e) => setSelectedKlasseId(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    {klassen.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} · Kl. {k.jahrgangsstufe} · {k.fach}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => { setShowNeueKlasse(true); setKlasseError(null) }}
                    className="text-sm font-semibold px-3 rounded-lg whitespace-nowrap"
                    style={{ background: '#F3EEFF', color: '#7C3AED', border: '1.5px solid #E9D5FF', cursor: 'pointer' }}>
                    + Neue
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => { setShowNeueKlasse(true); setKlasseError(null) }}
                  className="w-full text-sm font-semibold py-3 rounded-lg"
                  style={{ background: '#F3EEFF', color: '#7C3AED', border: '1.5px dashed #C4B5FD', cursor: 'pointer' }}>
                  + Erste Klasse anlegen
                </button>
              )}
              {klasseError && !showNeueKlasse && <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{klasseError}</p>}
              <p className="text-xs mt-1.5" style={{ color: '#7A6A94' }}>
                Bestimmt Fach, Jahrgangsstufe &amp; Schulform — und für welche Klasse der LernFlow am Ende automatisch freigegeben wird.
              </p>

              {/* Pop-up „Neue Klasse anlegen" — öffnet sich auch automatisch, wenn noch keine Klasse existiert. */}
              {showNeueKlasse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: 'rgba(31,18,53,0.45)' }}
                  onClick={() => { if (klassen.length > 0) { setShowNeueKlasse(false); setKlasseError(null) } }}>
                  <div className="w-full max-w-md rounded-2xl p-6"
                    style={{ background: 'white', boxShadow: '0 20px 60px rgba(31,18,53,0.35)' }}
                    onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-base font-black mb-1" style={{ color: '#1F1235' }}>Neue Klasse anlegen</h3>
                    <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
                      Der LernFlow wird nach der Erstellung direkt für diese Klasse freigegeben.
                    </p>
                    <div className="flex flex-col gap-3">
                      <input placeholder="Bezeichnung (z.B. 9a)" value={neueKlasse.name}
                        onChange={(e) => setNeueKlasse((s) => ({ ...s, name: e.target.value }))} style={inputStyle} />
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Jahrgangsstufe (z.B. 9)" value={neueKlasse.jahrgangsstufe}
                          onChange={(e) => setNeueKlasse((s) => ({ ...s, jahrgangsstufe: e.target.value }))} style={inputStyle} />
                        <input placeholder="Fach (z.B. Biologie)" value={neueKlasse.fach}
                          onChange={(e) => setNeueKlasse((s) => ({ ...s, fach: e.target.value }))} style={inputStyle} />
                      </div>
                      <select value={neueKlasse.schulform}
                        onChange={(e) => setNeueKlasse((s) => ({ ...s, schulform: e.target.value }))} style={inputStyle}>
                        <option value="" disabled>Schulform wählen</option>
                        {SCHULFORMEN.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    {klasseError && <p className="text-xs mt-3" style={{ color: '#DC2626' }}>{klasseError}</p>}
                    <div className="flex items-center gap-3 mt-5">
                      <button type="button" onClick={onCreateKlasse} disabled={creatingKlasse}
                        className="flex-1 text-sm font-bold px-4 py-2.5 rounded-lg"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: 'white', border: 'none', cursor: 'pointer', opacity: creatingKlasse ? 0.6 : 1 }}>
                        {creatingKlasse ? 'Anlegen…' : 'Klasse anlegen'}
                      </button>
                      {klassen.length > 0 && (
                        <button type="button" onClick={() => { setShowNeueKlasse(false); setKlasseError(null) }}
                          className="text-sm px-3" style={{ color: '#7A6A94', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Abbrechen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  Richtwert für die Gesamtdauer des LernFlows.
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: '#7A6A94' }}>
                Die KI baut eine didaktische Lernsequenz (Erklären · Vorwissen · Üben · Sichern).
                Länge und Anzahl der Bausteine ergeben sich aus dem Lerngegenstand und dem Umfang
                deines Materials — ein paar Spiele kommen als motivierender Abschluss dazu.
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

            <button type="submit" disabled={isPending || !selectedKlasse}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all mt-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', boxShadow: '0 4px 20px rgba(124,58,237,0.35)', opacity: (isPending || !selectedKlasse) ? 0.6 : 1, cursor: (isPending || !selectedKlasse) ? 'not-allowed' : 'pointer' }}>
              {isPending ? 'Wird gestartet…' : selectedKlasse ? `✦ Erstellen & für ${selectedKlasse.name} freigeben →` : '✦ Zuerst Klasse wählen'}
            </button>
            <p className="text-xs text-center" style={{ color: '#7A6A94' }}>
              Ein Klick: Material analysieren → Lern-Einheit &amp; Spiele bauen → für die Klasse freigeben.
            </p>
          </form>
        </div>
      )}

      {/* Step 3: Analysing */}
      {step === 'analysing' && (
        <div style={cardStyle} className="p-5 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
              🤖
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold" style={{ color: '#1F1235' }}>Dein LernFlow wird gerade gebaut</h2>
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
            {ANALYSE_SCHRITTE.map((s, i) => {
              const fertig = alleSchritteFertig || i < macroActive
              const aktiv = !alleSchritteFertig && i === macroActive
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: aktiv ? '#F6F1FF' : 'transparent',
                    color: fertig ? '#059669' : aktiv ? '#7C3AED' : '#C4B5FD',
                  }}>
                  <span className="w-5 text-center flex-shrink-0 text-xs">
                    {fertig ? '✓' : aktiv ? '⟳' : `${i + 1}`}
                  </span>
                  <span className={aktiv ? 'font-semibold' : ''}>{s}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && analyseResult && (
        <div className="flex flex-col gap-5">
          {/* Erfolgs-Header: fertig UND (bei fehlerfreier Generierung) direkt freigegeben */}
          <div className="rounded-3xl p-6"
            style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', border: '1px solid #6EE7B7' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="text-lg font-bold" style={{ color: '#065F46' }}>
                  {analyseResult.accessCode ? 'Fertig & freigegeben!' : 'Dein LernFlow ist fertig!'}
                </p>
                <p className="text-xs" style={{ color: '#047857' }}>
                  {analyseResult.spielIds.length} {analyseResult.spielIds.length === 1 ? 'Baustein' : 'Bausteine'}, didaktisch sortiert
                  {selectedKlasse ? ` · für Klasse ${selectedKlasse.name}` : ''}.
                </p>
              </div>
            </div>

            {/* Spielcode (wenn im selben Lauf freigegeben) */}
            {analyseResult.accessCode && (
              <div className="rounded-2xl p-4 mb-3 flex flex-col sm:flex-row sm:items-center gap-4"
                style={{ background: '#FFFFFF', border: '1px solid #6EE7B7' }}>
                <QrCode value={typeof window !== 'undefined' ? `${window.location.origin}/spielen` : '/spielen'} size={96} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#047857' }}>Spielcode für die Klasse</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-mono font-black text-2xl tracking-[0.2em] px-3 py-1.5 rounded-lg"
                      style={{ background: '#ECFDF5', color: '#065F46', border: '1.5px solid #6EE7B7' }}>
                      {analyseResult.accessCode}
                    </code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(analyseResult.accessCode!).then(() => setCopied(true)).catch(() => {})}
                      className="text-xs font-semibold px-3 py-2 rounded-xl"
                      style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #6EE7B7', cursor: 'pointer' }}>
                      {copied ? '✓ Kopiert' : '📋 Kopieren'}
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#047857' }}>
                    Schüler öffnen <strong>/spielen</strong> (oder QR), geben diesen Code + ihren persönlichen Tier-Code ein.
                  </p>
                </div>
              </div>
            )}

            {/* Freigabe pausiert/fehlgeschlagen (z.B. Teilfehler bei der Generierung) */}
            {!analyseResult.accessCode && analyseResult.releaseError && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Noch nicht freigegeben</p>
                <p className="text-xs mt-1" style={{ color: '#B45309' }}>{analyseResult.releaseError}</p>
                <Link href="/classes" className="inline-block text-xs font-bold mt-2" style={{ color: '#7C3AED' }}>
                  → In „Klassen“ prüfen und manuell freigeben
                </Link>
              </div>
            )}

            {/* Primärer CTA: Testen */}
            <Link href={`/spiele/${analyseResult.gameFlowId}/preview`}
              target="_blank"
              className="block rounded-2xl px-5 py-4 text-center text-base font-bold transition-all mb-3"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: 'white',
                boxShadow: '0 6px 24px rgba(124,58,237,0.3)',
                textDecoration: 'none',
              }}>
              ▶▶ LernFlow jetzt testen ↗
            </Link>

            {/* Sekundäre Optionen */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/classes"
                className="rounded-2xl px-5 py-3 text-center text-sm font-bold transition-all"
                style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', textDecoration: 'none' }}>
                🔑 Schüler-Codes
              </Link>
              <Link href="/spiele"
                className="rounded-2xl px-5 py-3 text-center text-sm font-bold transition-all"
                style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', textDecoration: 'none' }}>
                📚 Zur Übersicht
              </Link>
            </div>
          </div>

          {/* Module-Vorschauliste */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A6A94' }}>
              Bausteine in didaktischer Reihenfolge (leicht → schwer)
            </p>
            <div className="flex flex-col gap-2">
              {analyseResult.spielIds.map((id, i) => (
                <Link
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
                    Baustein {i + 1}
                  </span>
                  <span className="text-xs" style={{ color: '#7C3AED' }}>→ Vorschau</span>
                </Link>
              ))}
            </div>
          </div>

          <LehrkraftCheckPanel spielId={analyseResult.spielIds[0]} />

          {/* Noch einen LernFlow erstellen */}
          <div className="flex justify-center">
            <button onClick={weiter}
              className="text-sm font-semibold px-5 py-2 rounded-xl"
              style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', cursor: 'pointer' }}>
              ✦ Noch einen LernFlow erstellen
            </button>
          </div>
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
              <button onClick={weiter} className="mt-4 text-sm font-medium"
                style={{ color: '#7C3AED' }}>← Neu versuchen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

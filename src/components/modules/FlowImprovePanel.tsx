'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface NeueAufgabe {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren: string[]
  hilfen: string[]
  teilkompetenz?: string
}

interface Aenderung {
  art: 'aufgabe_ersetzen' | 'aufgabe_ergaenzen' | string
  ziel_aufgabe_id: string | null
  begruendung: string
  neue_aufgabe: NeueAufgabe
}

interface ModulVorschlag {
  modul_id: string
  modul_position: number
  modul_titel: string
  aenderungen: Aenderung[]
}

interface ImproveResult {
  gesamtbegruendung: string
  module_vorschlaege: ModulVorschlag[]
}

interface Props {
  flowId: string
  flowCheckFertig: boolean
}

// Stabiler Key pro Vorschlag (Modul + Index in der Änderungsliste)
function changeKey(modulId: string, idx: number) {
  return `${modulId}::${idx}`
}

export function FlowImprovePanel({ flowId, flowCheckFertig }: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<ImproveResult | null>(null)
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  async function onGenerate() {
    setGenerating(true)
    setError(null)
    setSavedCount(null)
    try {
      const res = await fetch(`/api/flows/${flowId}/improve`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Fehler')
        return
      }
      setResult(body)
      // Standardmäßig alle Vorschläge angenommen
      const init: Record<string, boolean> = {}
      for (const mv of body.module_vorschlaege ?? []) {
        for (let i = 0; i < mv.aenderungen.length; i++) {
          init[changeKey(mv.modul_id, i)] = true
        }
      }
      setAccepted(init)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setGenerating(false)
    }
  }

  // Wendet die akzeptierten Vorschläge an: pro Modul wird die finale
  // aufgaben-Liste zusammengebaut (ersetzen/ergänzen) und an PATCH geschickt.
  async function onApply() {
    if (!result) return
    setApplying(true)
    setError(null)
    try {
      // Aktuelle Aufgaben jedes betroffenen Moduls laden (für sicheres Mergen)
      const modulIds = result.module_vorschlaege
        .filter((mv) => mv.aenderungen.some((_, i) => accepted[changeKey(mv.modul_id, i)]))
        .map((mv) => mv.modul_id)

      if (modulIds.length === 0) {
        setError('Keine Vorschläge ausgewählt.')
        return
      }

      // Fetch current aufgaben for each affected module
      const aktuellByModul: Record<string, NeueAufgabe[]> = {}
      await Promise.all(modulIds.map(async (id) => {
        const res = await fetch(`/api/games/${id}`)
        if (res.ok) {
          const b = await res.json()
          aktuellByModul[id] = (b.aufgaben ?? []) as NeueAufgabe[]
        } else {
          aktuellByModul[id] = []
        }
      }))

      // Pro Modul: angenommene Änderungen anwenden
      const modul_updates = result.module_vorschlaege
        .map((mv) => {
          const acceptedChanges = mv.aenderungen
            .map((a, i) => ({ a, i }))
            .filter(({ i }) => accepted[changeKey(mv.modul_id, i)])
            .map(({ a }) => a)
          if (acceptedChanges.length === 0) return null

          const startAufgaben = aktuellByModul[mv.modul_id] ?? []
          let neueAufgaben = [...startAufgaben]

          for (const a of acceptedChanges) {
            if (a.art === 'aufgabe_ersetzen' && a.ziel_aufgabe_id) {
              const idx = neueAufgaben.findIndex((x) => x.aufgabe_id === a.ziel_aufgabe_id)
              if (idx >= 0) {
                neueAufgaben[idx] = { ...a.neue_aufgabe }
              } else {
                // ziel nicht gefunden → anhängen statt ersetzen
                neueAufgaben.push({ ...a.neue_aufgabe })
              }
            } else if (a.art === 'aufgabe_ergaenzen') {
              neueAufgaben.push({ ...a.neue_aufgabe })
            }
          }

          return { modul_id: mv.modul_id, aufgaben: neueAufgaben }
        })
        .filter(Boolean)

      const res = await fetch(`/api/flows/${flowId}/improve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modul_updates }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? 'Speichern fehlgeschlagen')
        return
      }
      const count = Object.values(accepted).filter(Boolean).length
      setSavedCount(count)
      setResult(null)
      setAccepted({})
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Übernehmen')
    } finally {
      setApplying(false)
    }
  }

  // Vor dem Generieren — Initial-State
  if (!result && !generating && !savedCount) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E9D5FF' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#1F1235' }}>
          ✦ KI-Verbesserungen für den ganzen Flow
        </p>
        <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
          Die KI sieht alle Bausteine + den Lehrkraft-Check und schlägt vor,
          welche Aufgaben in welchem Baustein ergänzt oder ersetzt werden sollen —
          aufeinander abgestimmt, nicht bausteinweise isoliert.
        </p>
        {!flowCheckFertig && (
          <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
            ⚠ Bitte führe erst den Flow-Lehrkraft-Check oben aus. Die Vorschläge basieren auf den Lücken, die er findet.
          </div>
        )}
        <button onClick={onGenerate}
          disabled={!flowCheckFertig || generating}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: flowCheckFertig
              ? 'linear-gradient(135deg, #7C3AED, #A855F7)'
              : '#F3EEFF',
            color: flowCheckFertig ? 'white' : '#C4B5FD',
            border: 'none',
            cursor: flowCheckFertig ? 'pointer' : 'not-allowed',
            boxShadow: flowCheckFertig ? '0 4px 16px rgba(124,58,237,0.25)' : 'none',
          }}>
          {generating ? '⟳ KI denkt nach …' : '✦ Verbesserungen vorschlagen'}
        </button>
      </div>
    )
  }

  // Während KI generiert
  if (generating) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#F6F1FF', border: '1px solid #C4B5FD' }}>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#7C3AED' }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#1F1235' }}>
              KI bereitet Vorschläge vor …
            </p>
            <p className="text-xs" style={{ color: '#5B21B6' }}>
              Sie liest alle Bausteine + den Flow-Check. Das dauert 30–90 Sekunden.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Nach erfolgreichem Speichern
  if (savedCount !== null && !result) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#065F46' }}>
          ✅ {savedCount} {savedCount === 1 ? 'Vorschlag' : 'Vorschläge'} übernommen
        </p>
        <p className="text-xs mb-3" style={{ color: '#047857' }}>
          Die Bausteine sind aktualisiert. Der Flow-Lehrkraft-Check oben wurde
          zurückgesetzt — starte ihn neu, um zu sehen, was sich gebessert hat.
        </p>
        <button onClick={() => setSavedCount(null)}
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', cursor: 'pointer' }}>
          Schließen
        </button>
      </div>
    )
  }

  // Vorschläge da — Auswahl & Übernahme
  if (!result) return null

  const totalChanges = result.module_vorschlaege.reduce((sum, mv) => sum + mv.aenderungen.length, 0)
  const acceptedCount = Object.values(accepted).filter(Boolean).length

  if (totalChanges === 0) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#065F46' }}>
          ✨ Die KI hat keine Verbesserungen vorgeschlagen
        </p>
        <p className="text-xs mb-3" style={{ color: '#047857' }}>
          Der Flow passt didaktisch wie er ist. {result.gesamtbegruendung}
        </p>
        <button onClick={() => setResult(null)}
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', cursor: 'pointer' }}>
          Schließen
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E9D5FF' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ background: '#F6F1FF', borderColor: '#E9D5FF' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#1F1235' }}>
          ✦ KI-Verbesserungsvorschläge für den Flow
        </p>
        <p className="text-xs" style={{ color: '#5B21B6' }}>{result.gesamtbegruendung}</p>
        <div className="rounded-lg px-3 py-2 mt-3 text-xs" style={{ background: '#FFFFFF', border: '1px solid #C4B5FD', color: '#5B21B6' }}>
          <strong>So funktioniert&apos;s:</strong> {totalChanges} Vorschlag/Vorschläge auf {result.module_vorschlaege.length} Baustein(e) verteilt. Hake an, was übernommen werden soll. Mit einem Klick werden alle ausgewählten Änderungen gespeichert.
        </div>
      </div>

      {/* Vorschläge pro Modul */}
      <div className="divide-y">
        {result.module_vorschlaege.map((mv) => (
          <div key={mv.modul_id} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                {mv.modul_position}
              </span>
              <p className="text-sm font-bold flex-1" style={{ color: '#1F1235' }}>{mv.modul_titel}</p>
              <span className="text-xs" style={{ color: '#7A6A94' }}>
                {mv.aenderungen.length} {mv.aenderungen.length === 1 ? 'Vorschlag' : 'Vorschläge'}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {mv.aenderungen.map((a, i) => {
                const key = changeKey(mv.modul_id, i)
                const aktiv = accepted[key] ?? false
                const artLabel = a.art === 'aufgabe_ersetzen'
                  ? `Aufgabe ${a.ziel_aufgabe_id ?? '?'} ersetzen`
                  : 'Neue Aufgabe ergänzen'
                return (
                  <div key={i} className="rounded-xl p-3" style={{ background: '#FAFAFA', border: '1px solid #F3EEFF' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7C3AED' }}>
                          {artLabel}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#7A6A94' }}>{a.begruendung}</p>
                      </div>
                      <label
                        className="flex-shrink-0 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer select-none"
                        style={{
                          background: aktiv ? '#EDE9FE' : '#FFFFFF',
                          color: aktiv ? '#5B21B6' : '#7A6A94',
                          border: aktiv ? '1.5px solid #7C3AED' : '1.5px solid #E9D5FF',
                        }}>
                        <input
                          type="checkbox"
                          checked={aktiv}
                          onChange={() => setAccepted(prev => ({ ...prev, [key]: !prev[key] }))}
                          style={{ accentColor: '#7C3AED' }}
                        />
                        {aktiv ? '✓ Übernommen' : 'Übernehmen'}
                      </label>
                    </div>

                    <div className="rounded-lg p-3 text-sm" style={{ background: '#FFFFFF', border: '1px solid #E9D5FF' }}>
                      <p className="font-medium mb-1" style={{ color: '#1F1235' }}>{a.neue_aufgabe.text}</p>
                      {a.neue_aufgabe.loesungen.length > 0 && (
                        <p className="text-xs mt-1">
                          <span className="font-semibold" style={{ color: '#065F46' }}>Lösung: </span>
                          <span style={{ color: '#065F46' }}>{a.neue_aufgabe.loesungen.join(' / ')}</span>
                        </p>
                      )}
                      {a.neue_aufgabe.distraktoren.length > 0 && (
                        <p className="text-xs mt-0.5">
                          <span className="font-semibold" style={{ color: '#991B1B' }}>Distraktoren: </span>
                          <span style={{ color: '#991B1B' }}>{a.neue_aufgabe.distraktoren.join(' / ')}</span>
                        </p>
                      )}
                      {a.neue_aufgabe.hilfen.length > 0 && (
                        <p className="text-xs mt-0.5">
                          <span className="font-semibold" style={{ color: '#1E40AF' }}>Hilfen: </span>
                          <span style={{ color: '#1E40AF' }}>{a.neue_aufgabe.hilfen.join(' / ')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer mit Save */}
      <div className="px-5 py-4 border-t flex flex-col gap-3" style={{ background: '#FAFAFA', borderColor: '#E9D5FF' }}>
        {error && (
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            ⚠️ {error}
          </div>
        )}
        {acceptedCount === 0 ? (
          <p className="text-xs text-center" style={{ color: '#7A6A94' }}>
            Hake oben mindestens einen Vorschlag an, um ihn zu übernehmen.
          </p>
        ) : (
          <>
            <p className="text-xs text-center" style={{ color: '#7A6A94' }}>
              {acceptedCount} {acceptedCount === 1 ? 'Vorschlag wird' : 'Vorschläge werden'} übernommen. Betroffene Bausteine werden direkt aktualisiert.
            </p>
            <button onClick={onApply} disabled={applying}
              className="w-full rounded-lg px-4 py-3 text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: 'white', border: 'none',
                cursor: applying ? 'not-allowed' : 'pointer',
                opacity: applying ? 0.6 : 1,
                boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
              }}>
              {applying ? '⟳ Wird übernommen …' : `✓ ${acceptedCount} ${acceptedCount === 1 ? 'Vorschlag' : 'Vorschläge'} jetzt übernehmen`}
            </button>
          </>
        )}
        <button onClick={() => { setResult(null); setAccepted({}) }}
          className="text-xs text-center"
          style={{ color: '#7A6A94', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          Abbrechen — keine Änderung übernehmen
        </button>
      </div>
    </div>
  )
}

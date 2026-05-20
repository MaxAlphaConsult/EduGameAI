'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Ursprung = 'original' | 'ki_ergaenzung' | 'didaktisch_reduziert'

interface SourcemapElement {
  aufgabe_id: string
  abschnitt_ref: string
  ursprung: Ursprung
  hinweis?: string
}

interface Sourcemapping {
  abdeckung_lernziel: 'vollstaendig' | 'teilweise' | 'vorbereitend'
  spielfunktion: string
  elemente: SourcemapElement[]
}

interface Reduktion {
  element: string
  original_aussage: string
  reduzierte_form: string
  status: 'zulaessig' | 'problematisch'
  begruendung: string
  transparent_markiert: boolean
}

interface Reduktionen {
  reduktion_vorhanden: boolean
  reduktionen: Reduktion[]
}

interface MaterialAbschnitt {
  id: string
  text: string
  seite?: number
}

interface Aufgabe {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  abschnitt_ref?: string
}

interface Props {
  spielId: string
  aufgaben: Aufgabe[]
  abschnitte: MaterialAbschnitt[]
  sourcemapping: Sourcemapping | null
  reduktionen: Reduktionen | null
}

const URSPRUNG_LABEL: Record<Ursprung, string> = {
  original: 'aus dem Material',
  ki_ergaenzung: 'KI-ergänzt',
  didaktisch_reduziert: 'didaktisch reduziert',
}

const URSPRUNG_STYLE: Record<Ursprung, { bg: string; text: string; border: string; dot: string }> = {
  original: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  ki_ergaenzung: { bg: '#F6F1FF', text: '#5B21B6', border: '#E9D5FF', dot: '#7C3AED' },
  didaktisch_reduziert: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A', dot: '#EAB308' },
}

const ABDECKUNG_LABEL: Record<'vollstaendig' | 'teilweise' | 'vorbereitend', string> = {
  vollstaendig: 'Lernziel vollständig abgedeckt',
  teilweise: 'Lernziel teilweise abgedeckt',
  vorbereitend: 'Vorbereitend — Lernziel noch nicht voll abgedeckt',
}

const ABDECKUNG_STYLE: Record<'vollstaendig' | 'teilweise' | 'vorbereitend', string> = {
  vollstaendig: 'text-green-700 bg-green-50 border-green-200',
  teilweise: 'text-yellow-800 bg-yellow-50 border-yellow-200',
  vorbereitend: 'text-orange-800 bg-orange-50 border-orange-200',
}

export function AufgabenMitQuelle({ spielId, aufgaben, abschnitte, sourcemapping, reduktionen }: Props) {
  const router = useRouter()
  const [offen, setOffen] = useState<string | null>(null)
  const [ladeId, setLadeId] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  async function regenerieren(aufgabeId: string) {
    if (ladeId) return
    setLadeId(aufgabeId)
    setFehler(null)
    try {
      const res = await fetch(`/api/games/${spielId}/aufgaben/${aufgabeId}/regenerate`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Neugenerierung fehlgeschlagen')
      }
      router.refresh()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLadeId(null)
    }
  }

  const sourcemapByAufgabe = new Map<string, SourcemapElement>()
  for (const el of sourcemapping?.elemente ?? []) {
    sourcemapByAufgabe.set(el.aufgabe_id, el)
  }

  const abschnittById = new Map<string, MaterialAbschnitt>()
  for (const a of abschnitte) {
    abschnittById.set(a.id, a)
  }

  // Reduktionen sind nicht pro aufgabe_id — wir ordnen heuristisch über das "element"-Feld zu
  function reduktionFuerAufgabe(aufgabe: Aufgabe): Reduktion | null {
    if (!reduktionen?.reduktion_vorhanden) return null
    return (
      reduktionen.reduktionen.find(r =>
        r.element.toLowerCase().includes(aufgabe.aufgabe_id.toLowerCase())
      ) ?? null
    )
  }

  return (
    <div className="border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Aufgaben ({aufgaben.length})</h2>
        {sourcemapping && (
          <span className={`text-xs px-2.5 py-1 rounded-full border ${ABDECKUNG_STYLE[sourcemapping.abdeckung_lernziel]}`}>
            {ABDECKUNG_LABEL[sourcemapping.abdeckung_lernziel]}
          </span>
        )}
      </div>

      {!sourcemapping && (
        <p className="text-xs text-muted-foreground mb-3">
          Sourcemapping wird noch berechnet — die Quellen werden sichtbar, sobald der Lehrkraft-Check fertig ist.
        </p>
      )}

      {fehler && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{fehler}</p>
      )}

      <div className="flex flex-col gap-2">
        {aufgaben.map((q, i) => {
          const mapping = sourcemapByAufgabe.get(q.aufgabe_id)
          const ursprung: Ursprung = mapping?.ursprung ?? 'original'
          const abschnittRef = mapping?.abschnitt_ref ?? q.abschnitt_ref ?? null
          const abschnitt = abschnittRef ? abschnittById.get(abschnittRef) : null
          const reduktion = reduktionFuerAufgabe(q)
          const istOffen = offen === q.aufgabe_id
          const style = URSPRUNG_STYLE[ursprung]
          const klickbar = Boolean(abschnitt || reduktion || mapping?.hinweis)
          const laedt = ladeId === q.aufgabe_id

          return (
            <div key={q.aufgabe_id} className="rounded-lg overflow-hidden border" style={{ borderColor: '#E5E7EB' }}>
              <div
                role={klickbar ? 'button' : undefined}
                tabIndex={klickbar ? 0 : undefined}
                onClick={() => klickbar && setOffen(istOffen ? null : q.aufgabe_id)}
                onKeyDown={(e) => {
                  if (!klickbar) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setOffen(istOffen ? null : q.aufgabe_id)
                  }
                }}
                className="bg-muted/40 px-4 py-3 hover:bg-muted/60 transition-colors"
                style={{ cursor: klickbar ? 'pointer' : 'default' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-muted-foreground pt-0.5 flex-shrink-0">Q{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{q.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{q.antwortformat}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {q.loesungen.map((l, j) => (
                        <span key={j} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">{l}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {sourcemapping && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5"
                        style={{ background: style.bg, color: style.text, borderColor: style.border }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
                        {URSPRUNG_LABEL[ursprung]}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {abschnittRef && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {abschnittRef}{klickbar && <span className="ml-1">{istOffen ? '▴' : '▾'}</span>}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); regenerieren(q.aufgabe_id) }}
                        disabled={laedt || ladeId !== null}
                        title="Diese Aufgabe neu generieren"
                        className="text-xs px-2 py-0.5 rounded-md border border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {laedt ? '⟳ …' : '🔄 Neu'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {istOffen && klickbar && (
                <div className="border-t bg-white p-4 flex flex-col gap-3">
                  {abschnitt ? (
                    <section>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Originalabschnitt {abschnittRef}
                        {abschnitt.seite ? ` · Seite ${abschnitt.seite}` : ''}
                      </p>
                      <blockquote className="text-sm text-gray-800 border-l-4 border-gray-300 pl-3 py-1 whitespace-pre-wrap">
                        {abschnitt.text}
                      </blockquote>
                    </section>
                  ) : abschnittRef ? (
                    <p className="text-xs text-muted-foreground italic">
                      Materialabschnitt {abschnittRef} ist nicht mehr verfügbar.
                    </p>
                  ) : null}

                  {reduktion && (
                    <section className="rounded-lg p-3"
                      style={{
                        background: reduktion.status === 'zulaessig' ? '#FEF9C3' : '#FEE2E2',
                        border: `1px solid ${reduktion.status === 'zulaessig' ? '#FDE68A' : '#FECACA'}`,
                      }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                        style={{ color: reduktion.status === 'zulaessig' ? '#854D0E' : '#991B1B' }}>
                        Didaktische Reduktion {reduktion.status === 'problematisch' && '⚠️ problematisch'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Im Material</p>
                          <p className="text-gray-900">{reduktion.original_aussage}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Im Spiel</p>
                          <p className="text-gray-900">{reduktion.reduzierte_form}</p>
                        </div>
                      </div>
                      <p className="text-xs mt-2"
                        style={{ color: reduktion.status === 'zulaessig' ? '#854D0E' : '#991B1B' }}>
                        {reduktion.begruendung}
                      </p>
                    </section>
                  )}

                  {mapping?.hinweis && !reduktion && (
                    <section className="rounded-lg p-3 bg-blue-50 border border-blue-100">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-1">
                        Hinweis der KI
                      </p>
                      <p className="text-sm text-blue-900">{mapping.hinweis}</p>
                    </section>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

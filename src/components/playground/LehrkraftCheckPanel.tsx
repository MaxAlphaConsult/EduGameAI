'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Ampel = 'gruen' | 'gelb' | 'rot'
type DimStatus = 'ok' | 'warnung' | 'problem'

interface Dimensionen {
  fachliche_korrektheit: DimStatus
  lernzielpassung: DimStatus
  spielbarkeit_ampel: Ampel
  mvp_tauglichkeit: DimStatus
  game_engine_passung: DimStatus
  regelbasiert_auswertbar: boolean
  ki_call_pro_antwort_vermieden: boolean
  differenzierung: DimStatus
  feedbackqualitaet: DimStatus
  reduktion_markiert: DimStatus
  altersangemessen: DimStatus
  sourcemapping_vollstaendig: DimStatus
  lernpfad_passung?: DimStatus
  lerninhalt_spielerlebnis_balance?: DimStatus
}

interface LehrkraftCheckData {
  gesamtampel: Ampel
  lernziel_original: string
  lernziel_mvp_variante: string | null
  dimensionen: Dimensionen
  lernzielanteile: {
    vollstaendig_abgedeckt: string[]
    teilweise_abgedeckt: string[]
    nicht_abgedeckt: string[]
  }
  hinweise_fuer_lehrkraft: string[]
  spielfunktion: string
  begruendung_anpassungen: string | null
}

interface VerbesserteAufgabe {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren: string[]
  hilfen: string[]
  abschnitt_ref: string
  teilkompetenz: string
  komplexitaetsstufe: number
}

interface Verbesserung {
  aufgabe_id: string
  aenderungen: string[]
  aufgabe_neu: VerbesserteAufgabe
}

interface ImproveResult {
  verbesserungen: Verbesserung[]
  gesamtbegruendung: string
}

interface Props {
  spielId: string
}

const AMPEL_FARBE: Record<Ampel, string> = {
  gruen: 'bg-green-100 text-green-800 border-green-200',
  gelb: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rot: 'bg-red-100 text-red-800 border-red-200',
}
const AMPEL_DOT: Record<Ampel, string> = {
  gruen: 'bg-green-500',
  gelb: 'bg-yellow-400',
  rot: 'bg-red-500',
}
const DIM_FARBE: Record<DimStatus, string> = {
  ok: 'text-green-700',
  warnung: 'text-yellow-700',
  problem: 'text-red-700',
}
const DIM_ICON: Record<DimStatus, string> = { ok: '✅', warnung: '⚠️', problem: '❌' }
const BOOL_ICON = (v: boolean) => v ? '✅' : '❌'

const DIM_LABELS: Record<keyof Dimensionen, string> = {
  fachliche_korrektheit: 'Fachliche Korrektheit',
  lernzielpassung: 'Lernzielpassung',
  spielbarkeit_ampel: 'Spielbarkeit (Ampel)',
  mvp_tauglichkeit: 'MVP-Tauglichkeit',
  game_engine_passung: 'Game-Engine-Passung',
  regelbasiert_auswertbar: 'Regelbasiert auswertbar',
  ki_call_pro_antwort_vermieden: 'Kein KI-Call pro Antwort',
  differenzierung: 'Differenzierung',
  feedbackqualitaet: 'Feedbackqualität',
  reduktion_markiert: 'Reduktion markiert',
  altersangemessen: 'Altersangemessen',
  sourcemapping_vollstaendig: 'Sourcemapping vollständig',
  lernpfad_passung: 'Lernpfad-Passung',
  lerninhalt_spielerlebnis_balance: 'Lerninhalt / Spielerlebnis',
}

const SPIELFUNKTION_LABEL: Record<string, string> = {
  vorbereitung: 'Vorbereitung',
  uebung: 'Übung',
  sicherung: 'Sicherung',
  diagnose: 'Diagnose',
  teilueberpruefung: 'Teilüberprüfung',
}

function hatProbleme(check: LehrkraftCheckData) {
  return check.gesamtampel !== 'gruen' || check.hinweise_fuer_lehrkraft.length > 0
}

export function LehrkraftCheckPanel({ spielId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [freigegeben, setFreigegeben] = useState(false)
  const [check, setCheck] = useState<LehrkraftCheckData | null>(null)
  const [polling, setPolling] = useState(true)

  // Verbesserungs-State
  const [improving, setImproving] = useState(false)
  const [improveResult, setImproveResult] = useState<ImproveResult | null>(null)
  const [originalAufgaben, setOriginalAufgaben] = useState<VerbesserteAufgabe[] | null>(null)
  const [improveError, setImproveError] = useState<string | null>(null)
  const [angenommen, setAngenommen] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!polling) return
    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 60 // ~240 Sekunden, dann aufgeben (Validierung läuft seit Migration 011 in eigenem Lambda mit 5min Timeout)

    // Beim Mount versuchen, die Validierung anzustoßen. Ist idempotent (siehe
    // POST /api/games/[id]/check — falls bereits Check existiert: no-op).
    // So funktioniert das Panel auch, wenn der User direkt auf ein Modul
    // navigiert ohne durch den Playground-Flow zu gehen.
    let triggered = false
    async function triggerOnce() {
      if (triggered) return
      triggered = true
      try {
        await fetch(`/api/games/${spielId}/check`, { method: 'POST' })
      } catch { /* polling übernimmt */ }
    }

    async function poll() {
      if (cancelled) return
      attempts++

      if (attempts > MAX_ATTEMPTS) {
        if (!cancelled) {
          setCheck({
            gesamtampel: 'gelb',
            lernziel_original: '—',
            lernziel_mvp_variante: null,
            dimensionen: {} as Dimensionen,
            lernzielanteile: { vollstaendig_abgedeckt: [], teilweise_abgedeckt: [], nicht_abgedeckt: [] },
            hinweise_fuer_lehrkraft: ['Qualitätsprüfung konnte nicht abgeschlossen werden. Das Spiel ist trotzdem spielbar.'],
            spielfunktion: 'sicherung',
            begruendung_anpassungen: null,
          })
          setPolling(false)
        }
        return
      }

      try {
        const res = await fetch(`/api/games/${spielId}/check`)
        if (cancelled) return
        if (res.status === 202) {
          // Noch kein Check da → einmal versuchen, ihn anzustoßen
          if (attempts === 1) triggerOnce()
          setTimeout(poll, 4000)
          return
        }
        const body = await res.json()
        if (!body.pending && body.check) {
          setCheck(body.check)
          setPolling(false)
          // Server-Component neu rendern, damit Sourcemapping in AufgabenMitQuelle erscheint
          router.refresh()
        } else {
          setTimeout(poll, 4000)
        }
      } catch {
        if (!cancelled) setTimeout(poll, 6000)
      }
    }

    poll()
    return () => { cancelled = true }
  }, [spielId, polling, router])

  function signoff() {
    startTransition(async () => {
      const res = await fetch(`/api/games/${spielId}/signoff`, { method: 'POST' })
      if (res.ok) { setFreigegeben(true); router.refresh() }
    })
  }

  async function startImprovement() {
    setImproving(true)
    setImproveError(null)
    setImproveResult(null)
    setSaved(false)
    try {
      // Original-Aufgaben laden, damit wir beim Speichern mergen können
      const gameRes = await fetch(`/api/games/${spielId}`)
      const gameBody = await gameRes.json()
      if (!gameRes.ok) throw new Error('Spiel konnte nicht geladen werden')
      setOriginalAufgaben(gameBody.aufgaben ?? [])

      const res = await fetch(`/api/games/${spielId}/improve`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Fehler')
      setImproveResult(body)
      const init: Record<string, boolean> = {}
      for (const v of body.verbesserungen) {
        init[v.aufgabe_id] = v.aenderungen.length > 0
      }
      setAngenommen(init)
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setImproving(false)
    }
  }

  async function saveImprovements() {
    if (!improveResult || !originalAufgaben) return
    setSaving(true)
    try {
      // Original-Aufgaben beibehalten, nur angenommene ersetzen
      const aufgabenNeu = originalAufgaben.map(orig => {
        const v = improveResult.verbesserungen.find(v => v.aufgabe_id === orig.aufgabe_id)
        return (v && angenommen[v.aufgabe_id]) ? v.aufgabe_neu : orig
      })

      const res = await fetch(`/api/games/${spielId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aufgaben: aufgabenNeu }),
      })
      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      setSaved(true)
      setImproveResult(null)
      setOriginalAufgaben(null)
      router.refresh()
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : 'Speicherfehler')
    } finally {
      setSaving(false)
    }
  }

  // ── Pending State ───────────────────────────────────────────
  if (!check) {
    return (
      <div className="border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b bg-gray-50 text-gray-600">
          <span className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300 animate-pulse" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Lehrkraft-Check</p>
            <p className="text-xs opacity-70">Qualitätsprüfung läuft im Hintergrund …</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">Die KI prüft gerade die didaktische Qualität des Spiels. Das dauert noch einen Moment.</p>
          <p className="text-xs text-muted-foreground mt-1">Seite wird automatisch aktualisiert.</p>
        </div>
      </div>
    )
  }

  const anzahlAngenommen = Object.values(angenommen).filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      {/* ── Check-Panel ──────────────────────────────────────── */}
      <div className="border rounded-xl overflow-hidden">
        <div className={`flex items-center gap-3 p-4 border-b ${AMPEL_FARBE[check.gesamtampel]}`}>
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${AMPEL_DOT[check.gesamtampel]}`} />
          <div className="flex-1">
            <p className="font-semibold text-sm">Lehrkraft-Check</p>
            <p className="text-xs opacity-80">Spielfunktion: {SPIELFUNKTION_LABEL[check.spielfunktion] ?? check.spielfunktion}</p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Lernziel */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lernziel</h3>
            <p className="text-sm bg-muted/40 rounded-lg p-3">{check.lernziel_original}</p>
            {check.lernziel_mvp_variante && (
              <div className="mt-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <span className="font-medium text-yellow-800">MVP-Variante: </span>
                <span className="text-yellow-900">{check.lernziel_mvp_variante}</span>
                {check.begruendung_anpassungen && (
                  <p className="text-xs text-yellow-700 mt-1">{check.begruendung_anpassungen}</p>
                )}
              </div>
            )}
          </section>

          {/* Dimensionen */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dimensionen</h3>
            <div className="grid grid-cols-1 gap-1">
              {(Object.keys(DIM_LABELS) as (keyof Dimensionen)[]).map((key) => {
                const val = check.dimensionen[key]
                const isAmpel = key === 'spielbarkeit_ampel'
                const isBool = typeof val === 'boolean'
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-muted/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{DIM_LABELS[key]}</span>
                    <span className={`text-sm font-medium ${isBool ? '' : isAmpel ? '' : DIM_FARBE[val as DimStatus]}`}>
                      {isBool
                        ? BOOL_ICON(val as boolean)
                        : isAmpel
                        ? <span className="inline-flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${AMPEL_DOT[val as Ampel]}`} />
                            {val}
                          </span>
                        : `${DIM_ICON[val as DimStatus]} ${val}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Lernzielanteile */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lernzielanteile</h3>
            <div className="flex flex-col gap-1.5">
              {check.lernzielanteile.vollstaendig_abgedeckt.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-green-700">Vollständig ✅</span>
                  <ul className="mt-1 text-sm text-green-900 list-disc list-inside">
                    {check.lernzielanteile.vollstaendig_abgedeckt.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {check.lernzielanteile.teilweise_abgedeckt.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-yellow-700">Teilweise ⚠️</span>
                  <ul className="mt-1 text-sm text-yellow-900 list-disc list-inside">
                    {check.lernzielanteile.teilweise_abgedeckt.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {check.lernzielanteile.nicht_abgedeckt.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-red-700">Nicht abgedeckt ❌</span>
                  <ul className="mt-1 text-sm text-red-900 list-disc list-inside">
                    {check.lernzielanteile.nicht_abgedeckt.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Hinweise */}
          {check.hinweise_fuer_lehrkraft.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Hinweise</h3>
              <ul className="flex flex-col gap-1">
                {check.hinweise_fuer_lehrkraft.map((h, i) => (
                  <li key={i} className="text-sm bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-blue-900">{h}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Aktionen */}
          <div className="pt-2 border-t flex flex-col gap-2">
            {saved && (
              <div className="text-sm text-green-700 font-medium bg-green-50 rounded-lg px-4 py-3">
                ✅ Verbesserungen gespeichert.
              </div>
            )}

            {hatProbleme(check) && !saved && (
              <button
                onClick={startImprovement}
                disabled={improving}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  background: improving ? '#F6F1FF' : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: improving ? '#7C3AED' : 'white',
                  border: improving ? '1.5px solid #E9D5FF' : 'none',
                }}
              >
                {improving
                  ? <><span className="animate-spin">⟳</span> KI analysiert und verbessert …</>
                  : '✦ Verbesserungen vorschlagen'}
              </button>
            )}

            {freigegeben ? (
              <div className="text-sm text-green-700 font-medium bg-green-50 rounded-lg px-4 py-3">
                ✅ Spiel freigegeben — Schüler können jetzt spielen.
              </div>
            ) : (
              <button
                onClick={signoff}
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Freigeben…' : 'Spiel freigeben'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Verbesserungs-Panel ──────────────────────────────── */}
      {improveError && (
        <div className="rounded-xl p-4 text-sm text-red-700 bg-red-50 border border-red-200">
          ⚠️ {improveError}
        </div>
      )}

      {improveResult && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ background: '#F6F1FF' }}>
            <p className="font-semibold text-sm" style={{ color: '#1F1235' }}>
              ✦ KI-Verbesserungsvorschläge
            </p>
            <p className="text-xs mt-1" style={{ color: '#7A6A94' }}>
              {improveResult.gesamtbegruendung}
            </p>
          </div>

          <div className="divide-y">
            {improveResult.verbesserungen.map((v) => {
              const hatAenderungen = v.aenderungen.length > 0
              const aktiv = angenommen[v.aufgabe_id] ?? false
              return (
                <div key={v.aufgabe_id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7C3AED' }}>
                        Aufgabe {v.aufgabe_id}
                      </span>
                      {hatAenderungen ? (
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {v.aenderungen.map((a, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-green-600 mt-1">Keine Änderungen nötig ✅</p>
                      )}
                    </div>
                    {hatAenderungen && (
                      <button
                        onClick={() => setAngenommen(prev => ({ ...prev, [v.aufgabe_id]: !prev[v.aufgabe_id] }))}
                        className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        style={{
                          background: aktiv ? '#7C3AED' : '#F6F1FF',
                          color: aktiv ? 'white' : '#7C3AED',
                          border: '1.5px solid #E9D5FF',
                        }}
                      >
                        {aktiv ? '✓ Übernehmen' : 'Ablehnen'}
                      </button>
                    )}
                  </div>

                  {hatAenderungen && (
                    <div className="rounded-lg p-3 text-sm" style={{ background: '#FAFAFA', border: '1px solid #E9D5FF' }}>
                      <p className="font-medium mb-1" style={{ color: '#1F1235' }}>{v.aufgabe_neu.text}</p>
                      {v.aufgabe_neu.loesungen.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-semibold text-green-700">Lösung(en): </span>
                          <span className="text-xs text-green-900">{v.aufgabe_neu.loesungen.join(' / ')}</span>
                        </div>
                      )}
                      {v.aufgabe_neu.distraktoren.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs font-semibold text-red-600">Distraktoren: </span>
                          <span className="text-xs text-red-800">{v.aufgabe_neu.distraktoren.join(' / ')}</span>
                        </div>
                      )}
                      {v.aufgabe_neu.hilfen.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs font-semibold text-blue-600">Hilfen: </span>
                          <span className="text-xs text-blue-800">{v.aufgabe_neu.hilfen.join(' / ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="p-5 border-t bg-gray-50 flex flex-col gap-2">
            {anzahlAngenommen === 0 ? (
              <p className="text-xs text-center text-muted-foreground">Keine Verbesserung ausgewählt.</p>
            ) : (
              <button
                onClick={saveImprovements}
                disabled={saving}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: 'white',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? 'Wird gespeichert…'
                  : `${anzahlAngenommen} Verbesserung${anzahlAngenommen !== 1 ? 'en' : ''} speichern`}
              </button>
            )}
            <button
              onClick={() => setImproveResult(null)}
              className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

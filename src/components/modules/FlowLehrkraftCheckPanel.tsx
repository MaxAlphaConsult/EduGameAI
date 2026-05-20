'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'

type Ampel = 'gruen' | 'gelb' | 'rot' | string
type Abdeckung = 'vollstaendig' | 'teilweise' | 'nicht_gesichert' | string

interface Modulrolle {
  modul_id: string
  modul_position: number
  titel: string
  rolle: string
  deckt_ab: string[]
}

interface FehlendesTeilziel {
  thema: string
  begruendung: string
  empfohlenes_modul_id: string | null
  empfohlenes_modul_begruendung: string
}

interface UebergreifenderHinweis {
  thema: string
  problem: string
  empfehlung: string
  betroffene_module: string[]
}

interface Redundanz {
  beschreibung: string
  module_ids: string[]
  bewertung: 'sinnvoll_wiederholend' | 'unnoetig' | string
}

interface FlowCheck {
  gesamtampel: Ampel
  lernziel: string
  abdeckung_lernziel: Abdeckung
  gesamteinschaetzung: string
  modulrollen: Modulrolle[]
  abgedeckte_teilziele: string[]
  fehlende_teilziele: FehlendesTeilziel[]
  uebergreifende_hinweise: UebergreifenderHinweis[]
  redundanzen: Redundanz[]
}

interface Props {
  flowId: string
}

type Status = 'idle' | 'pending' | 'fertig' | 'fehler'

const AMPEL_BG: Record<string, string> = { gruen: '#D1FAE5', gelb: '#FEF3C7', rot: '#FEE2E2' }
const AMPEL_FG: Record<string, string> = { gruen: '#065F46', gelb: '#92400E', rot: '#991B1B' }
const AMPEL_DOT: Record<string, string> = { gruen: '#059669', gelb: '#D97706', rot: '#DC2626' }
const AMPEL_LABEL: Record<string, string> = { gruen: 'OK', gelb: 'Hinweise', rot: 'Probleme' }
const ABDECKUNG_LABEL: Record<string, string> = {
  vollstaendig: 'Lernziel vollständig abgedeckt',
  teilweise: 'Lernziel teilweise abgedeckt',
  nicht_gesichert: 'Lernziel noch nicht gesichert',
}

export function FlowLehrkraftCheckPanel({ flowId }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [check, setCheck] = useState<FlowCheck | null>(null)
  const [aktualisiertAm, setAktualisiertAm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/check`, { cache: 'no-store' })
      if (!res.ok) return
      const body = await res.json()
      setStatus(body.status ?? 'idle')
      setCheck(body.check ?? null)
      setAktualisiertAm(body.aktualisiert_am ?? null)
    } catch { /* still */ }
  }, [flowId])

  // Initial laden
  useEffect(() => { loadStatus() }, [loadStatus])

  // Polling während pending
  useEffect(() => {
    if (status !== 'pending') return
    pollingRef.current = setTimeout(() => loadStatus(), 4000)
    return () => { if (pollingRef.current) clearTimeout(pollingRef.current) }
  }, [status, loadStatus])

  async function startCheck(force = false) {
    setStarting(true)
    setError(null)
    setStatus('pending')
    try {
      const res = await fetch(`/api/flows/${flowId}/check${force ? '?force=true' : ''}`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Fehler beim Starten')
        setStatus('fehler')
        return
      }
      // Antwort enthält bereits den fertigen Check (synchron im Lambda)
      if (body.status === 'fertig' && body.check) {
        setCheck(body.check)
        setStatus('fertig')
      } else {
        // weiterpollen
        loadStatus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
      setStatus('fehler')
    } finally {
      setStarting(false)
    }
  }

  // Idle: noch nie ausgeführt
  if (status === 'idle' && !check) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E9D5FF' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#1F1235' }}>
          ✦ Lehrkraft-Check für das ganze Lernspiel
        </p>
        <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
          Die KI prüft alle Module gemeinsam gegen das Lernziel — keine
          isolierten Bewertungen, sondern: passen die Module als Einheit?
        </p>
        <button onClick={() => startCheck(false)}
          disabled={starting}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: 'white', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            opacity: starting ? 0.6 : 1,
          }}>
          {starting ? '⟳ Wird gestartet…' : '✦ Lehrkraft-Check starten'}
        </button>
      </div>
    )
  }

  // Pending
  if (status === 'pending') {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#F6F1FF', border: '1px solid #C4B5FD' }}>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#7C3AED' }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#1F1235' }}>
              Lehrkraft-Check läuft …
            </p>
            <p className="text-xs" style={{ color: '#5B21B6' }}>
              Die KI sieht sich alle Module gemeinsam an. Das dauert 30–90 Sekunden.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fehler
  if (status === 'fehler' && !check) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#991B1B' }}>⚠️ Check fehlgeschlagen</p>
        <p className="text-xs mb-3" style={{ color: '#B91C1C' }}>{error ?? 'Unbekannter Fehler'}</p>
        <button onClick={() => startCheck(true)} disabled={starting}
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: '#FFFFFF', color: '#991B1B', border: '1px solid #FECACA', cursor: 'pointer' }}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Fertig — Check anzeigen
  if (!check) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E9D5FF' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap" style={{
        background: AMPEL_BG[check.gesamtampel] ?? '#F3F4F6',
        borderColor: '#E9D5FF',
      }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: AMPEL_DOT[check.gesamtampel] ?? '#6B7280' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: AMPEL_FG[check.gesamtampel] ?? '#1F1235' }}>
              Lehrkraft-Check · {AMPEL_LABEL[check.gesamtampel] ?? check.gesamtampel}
            </p>
            <p className="text-xs" style={{ color: AMPEL_FG[check.gesamtampel] ?? '#7A6A94', opacity: 0.85 }}>
              {ABDECKUNG_LABEL[check.abdeckung_lernziel] ?? check.abdeckung_lernziel}
            </p>
          </div>
        </div>
        <button onClick={() => startCheck(true)} disabled={starting}
          className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: '#FFFFFF', color: '#5B21B6', border: '1px solid #C4B5FD', cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.6 : 1 }}>
          {starting ? '⟳…' : '🔄 Neu prüfen'}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Lernziel + Gesamteinschätzung */}
        <section>
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#7C3AED' }}>Lernziel</p>
          <p className="text-sm mb-3" style={{ color: '#1F1235' }}>{check.lernziel}</p>
          <p className="text-sm leading-relaxed" style={{ color: '#1F1235' }}>{check.gesamteinschaetzung}</p>
        </section>

        {/* Modulrollen */}
        {check.modulrollen.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#7C3AED' }}>
              Rolle jedes Moduls im Lernspiel
            </p>
            <div className="flex flex-col gap-2">
              {check.modulrollen.map((m) => (
                <div key={m.modul_id} className="rounded-xl p-3" style={{ background: '#FAFAFA', border: '1px solid #F3EEFF' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                      {m.modul_position}
                    </span>
                    <Link href={`/modules/${m.modul_id}`}
                      className="text-sm font-semibold truncate hover:underline"
                      style={{ color: '#1F1235', textDecoration: 'none' }}>
                      {m.titel}
                    </Link>
                    <span className="text-xs ml-auto flex-shrink-0 px-2 py-0.5 rounded-full"
                      style={{ background: '#F6F1FF', color: '#5B21B6' }}>
                      {m.rolle}
                    </span>
                  </div>
                  {m.deckt_ab.length > 0 && (
                    <p className="text-xs" style={{ color: '#7A6A94' }}>
                      <strong>Deckt ab:</strong> {m.deckt_ab.join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Abgedeckte Teilziele */}
        {check.abgedeckte_teilziele.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#059669' }}>
              ✓ Das deckt der Flow ab
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {check.abgedeckte_teilziele.map((t, i) => (
                <li key={i} className="text-xs rounded-full px-2.5 py-1"
                  style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Fehlende Teilziele */}
        {check.fehlende_teilziele.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#92400E' }}>
              ⚠ Diese Lücken hat der Flow
            </p>
            <div className="flex flex-col gap-2">
              {check.fehlende_teilziele.map((f, i) => {
                const empfohlenModul = f.empfohlenes_modul_id
                  ? check.modulrollen.find((m) => m.modul_id === f.empfohlenes_modul_id)
                  : null
                return (
                  <div key={i} className="rounded-xl p-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>{f.thema}</p>
                    <p className="text-xs mb-2" style={{ color: '#B45309' }}>{f.begruendung}</p>
                    <p className="text-xs" style={{ color: '#92400E' }}>
                      <strong>Empfehlung:</strong>{' '}
                      {empfohlenModul
                        ? <>Ergänzen in <Link href={`/modules/${empfohlenModul.modul_id}`} className="underline" style={{ color: '#92400E', textDecoration: 'underline' }}>Modul {empfohlenModul.modul_position} — {empfohlenModul.titel}</Link>. {f.empfohlenes_modul_begruendung}</>
                        : f.empfohlenes_modul_begruendung}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Übergreifende Hinweise */}
        {check.uebergreifende_hinweise.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#5B21B6' }}>
              Übergreifende Hinweise
            </p>
            <div className="flex flex-col gap-2">
              {check.uebergreifende_hinweise.map((h, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: '#F6F1FF', border: '1px solid #C4B5FD' }}>
                  <p className="text-sm font-semibold" style={{ color: '#1F1235' }}>{h.thema}</p>
                  <p className="text-xs mt-1" style={{ color: '#5B21B6' }}>{h.problem}</p>
                  <p className="text-xs mt-1.5" style={{ color: '#1F1235' }}>
                    <strong>Tipp:</strong> {h.empfehlung}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Redundanzen */}
        {check.redundanzen.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#7A6A94' }}>
              Wiederholungen zwischen Modulen
            </p>
            <div className="flex flex-col gap-2">
              {check.redundanzen.map((r, i) => {
                const istSinnvoll = r.bewertung === 'sinnvoll_wiederholend'
                return (
                  <div key={i} className="rounded-xl p-3"
                    style={{
                      background: istSinnvoll ? '#FAFAFA' : '#FFFBEB',
                      border: `1px solid ${istSinnvoll ? '#F3EEFF' : '#FDE68A'}`,
                    }}>
                    <p className="text-sm" style={{ color: '#1F1235' }}>{r.beschreibung}</p>
                    <p className="text-xs mt-1" style={{ color: istSinnvoll ? '#059669' : '#92400E' }}>
                      {istSinnvoll ? '✓ Sinnvolle Wiederholung — festigt das Wissen' : '⚠ Unnötig — könnte ein Modul anderes Lernziel adressieren'}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {aktualisiertAm && (
          <p className="text-xs" style={{ color: '#C4B5FD' }}>
            Zuletzt aktualisiert: {new Date(aktualisiertAm).toLocaleString('de-DE')}
          </p>
        )}
      </div>
    </div>
  )
}

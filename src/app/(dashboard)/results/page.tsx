'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AntwortmusterPanel, type PatternsData } from '@/components/playground/AntwortmusterPanel'
import { generateLehrkraftDiagnosePDF, generateSusRueckmeldungenPDF } from '@/lib/pdf/diagnose'

interface Spiel { id: string; titel: string; status: string; erstellt_am: string }

interface IndividuelleDiagnose {
  code: string
  lernzielstatus: string
  empfehlung: string
  lernpfad_abgeschlossen?: boolean
  sichere_teilkompetenzen?: string[]
  unsichere_teilkompetenzen?: string[]
  fehlvorstellungen?: string[]
  hilfenutzung?: 'selbststaendig' | 'mit_hilfe' | 'trotz_hilfe_unsicher'
  erreichte_komplexitaetsstufe?: number
}

interface SusRueckmeldung {
  code: string
  lernstand_satz: string
  kann_schon_gut: string[]
  noch_ueben: string[]
  naechster_schritt: string
}

interface Foerdergruppe {
  gruppe: string
  beschreibung: string
  codes: string[]
  empfehlung: string
}

interface DiagnoseData {
  ausgabemodus?: 'kompakt' | 'detail'
  klassenueberblick: {
    anzahl_codes: number
    lernziel_erreicht: number
    lernziel_teilweise: number
    lernziel_noch_nicht_gesichert: number
    gesamteinschaetzung: string
    lernziel_original: string
    abdeckungshinweis: string
    lernpfad_abgeschlossen?: number
  }
  kompetenzampel_klasse: { teilkompetenz: string; status: string; einschaetzung: string }[]
  haeufige_fehlvorstellungen: { fehlvorstellung: string; haeufigkeit: number; empfehlung: string; betroffene_aufgaben?: string[] }[]
  empfehlungen_weiterarbeit: {
    plenum: string[]
    vertiefung: string[]
    erweiterung: string[]
    exit_ticket_vorschlag?: string | null
  }
  individuelle_diagnosen: IndividuelleDiagnose[]
  foerdergruppen?: Foerdergruppe[]
  sus_rueckmeldungen?: SusRueckmeldung[]
  daten_hinweise?: string[]
}

const HILFENUTZUNG_LABEL: Record<string, string> = {
  selbststaendig: 'selbstständig gelöst',
  mit_hilfe: 'mit Hilfe gelöst',
  trotz_hilfe_unsicher: 'trotz Hilfe noch unsicher',
}

const HILFENUTZUNG_FARBE: Record<string, string> = {
  selbststaendig: '#059669',
  mit_hilfe: '#D97706',
  trotz_hilfe_unsicher: '#DC2626',
}

const AMPEL_COLORS: Record<string, string> = {
  gruen: '#059669', gelb: '#D97706', rot: '#DC2626',
}
const STATUS_LABEL: Record<string, string> = {
  erreicht: 'Lernziel erreicht',
  teilweise_erreicht: 'Teilweise erreicht',
  noch_nicht_gesichert: 'Noch nicht gesichert',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E9D5FF',
  boxShadow: '0 2px 24px rgba(124,58,237,0.08)',
  borderRadius: 20,
}

export default function ResultsPage() {
  const [spiele, setSpiele] = useState<Spiel[]>([])
  const [selectedSpiel, setSelectedSpiel] = useState<string | null>(null)
  const [diagnose, setDiagnose] = useState<DiagnoseData | null>(null)
  const [patterns, setPatterns] = useState<PatternsData | null>(null)
  const [patternsLoading, setPatternsLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('games')
        .select('id, titel, status, erstellt_am')
        .eq('lehrer_id', user.id)
        .eq('status', 'freigegeben')
        .order('erstellt_am', { ascending: false })
      setSpiele(data ?? [])
    }
    load()
  }, [])

  function onDiagnose(spielId: string) {
    setSelectedSpiel(spielId)
    setDiagnose(null)
    setPatterns(null)
    setError(null)
    setExpandedCode(null)

    // Deterministische Antwortmuster sofort laden — keine KI nötig
    setPatternsLoading(true)
    fetch(`/api/games/${spielId}/answer-patterns`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PatternsData | null) => { if (data) setPatterns(data) })
      .catch(() => { /* still ok — KI-Diagnose ist die Hauptauswertung */ })
      .finally(() => setPatternsLoading(false))

    startTransition(async () => {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spielId, modus: 'kompakt' }),
      })
      if (!res.ok) { setError('Diagnose fehlgeschlagen'); return }
      const data = await res.json()
      setDiagnose(data.diagnose)
    })
  }

  function aktuellerSpielTitel(): string {
    return spiele.find(s => s.id === selectedSpiel)?.titel ?? 'EduGame'
  }

  async function downloadLehrkraftPdf() {
    if (!diagnose) return
    await generateLehrkraftDiagnosePDF({
      spielTitel: aktuellerSpielTitel(),
      ausgabemodus: diagnose.ausgabemodus,
      klassenueberblick: diagnose.klassenueberblick,
      kompetenzampel_klasse: diagnose.kompetenzampel_klasse,
      haeufige_fehlvorstellungen: diagnose.haeufige_fehlvorstellungen,
      empfehlungen_weiterarbeit: diagnose.empfehlungen_weiterarbeit,
      foerdergruppen: diagnose.foerdergruppen,
      individuelle_diagnosen: diagnose.individuelle_diagnosen,
      daten_hinweise: diagnose.daten_hinweise,
    })
  }

  async function downloadSusPdfs() {
    if (!diagnose?.sus_rueckmeldungen || diagnose.sus_rueckmeldungen.length === 0) return
    await generateSusRueckmeldungenPDF({
      spielTitel: aktuellerSpielTitel(),
      lernziel: diagnose.klassenueberblick.lernziel_original,
      rueckmeldungen: diagnose.sus_rueckmeldungen,
    })
  }

  async function ladeDetailmodus() {
    if (!selectedSpiel || detailLoading) return
    setDetailLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spielId: selectedSpiel, modus: 'detail' }),
      })
      if (!res.ok) throw new Error('Detailmodus konnte nicht geladen werden')
      const data = await res.json()
      setDiagnose(data.diagnose)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detailmodus fehlgeschlagen')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1F1235' }}>Auswertungen</h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A94' }}>Lernstandsdiagnose nach Spielende — KI-gestützte Klassenanalyse</p>
      </div>

      {/* Game List */}
      {spiele.length === 0 ? (
        <div style={{ border: '2px dashed #E9D5FF', borderRadius: 20 }} className="p-16 text-center">
          <span className="text-4xl mb-3 block">📊</span>
          <p className="text-sm font-medium" style={{ color: '#7A6A94' }}>Noch keine freigegebenen Spiele mit Schülerantworten</p>
          <p className="text-xs mt-1" style={{ color: '#C4B5FD' }}>Erstelle zuerst ein Spiel und gib es frei</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {spiele.map((s) => (
            <div key={s.id}
              className="flex items-center gap-4 px-5 py-4 transition-all"
              style={{
                background: selectedSpiel === s.id ? '#F6F1FF' : '#FFFFFF',
                border: selectedSpiel === s.id ? '1.5px solid #7C3AED' : '1px solid #E9D5FF',
                borderRadius: 16,
                boxShadow: '0 1px 4px rgba(124,58,237,0.04)',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: '#F3EEFF' }}>🎮</div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: '#1F1235' }}>{s.titel}</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>{new Date(s.erstellt_am).toLocaleDateString('de-DE')}</p>
              </div>
              <button onClick={() => onDiagnose(s.id)} disabled={isPending}
                className="rounded-xl px-4 py-2 text-xs font-bold transition-all"
                style={{
                  background: isPending && selectedSpiel === s.id ? '#E9D5FF' : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: isPending && selectedSpiel === s.id ? '#7A6A94' : 'white',
                  opacity: isPending && selectedSpiel !== s.id ? 0.5 : 1,
                }}>
                {isPending && selectedSpiel === s.id ? 'Analysiert…' : 'Diagnose starten'}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-4 mb-5 text-sm" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Antwortmuster — deterministisch, sofort verfügbar */}
      {selectedSpiel && patternsLoading && !patterns && (
        <div className="rounded-2xl p-4 mb-5 text-sm" style={{ background: '#F6F1FF', border: '1px solid #E9D5FF', color: '#5B21B6' }}>
          Antwortmuster werden geladen …
        </div>
      )}
      {patterns && (
        <div className="mb-5">
          <AntwortmusterPanel data={patterns} />
        </div>
      )}

      {diagnose && (
        <div className="flex flex-col gap-5">
          {/* Klassenüberblick + Modus-Toggle */}
          <div style={cardStyle} className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <h2 className="font-bold" style={{ color: '#1F1235' }}>Klassenüberblick</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: diagnose.ausgabemodus === 'detail' ? '#F3EEFF' : '#F6F1FF',
                    color: '#5B21B6',
                    border: '1px solid #E9D5FF',
                  }}>
                  {diagnose.ausgabemodus === 'detail' ? 'Detail-Diagnose' : 'Kompakt-Diagnose'}
                </span>
                {diagnose.ausgabemodus !== 'detail' && (
                  <button onClick={ladeDetailmodus} disabled={detailLoading}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                    style={{
                      background: detailLoading ? '#F6F1FF' : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                      color: detailLoading ? '#5B21B6' : 'white',
                      border: detailLoading ? '1px solid #E9D5FF' : 'none',
                    }}>
                    {detailLoading ? 'Lädt …' : '✦ Detail-Analyse laden'}
                  </button>
                )}
                <button onClick={downloadLehrkraftPdf}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border"
                  style={{ background: '#FFFFFF', borderColor: '#E9D5FF', color: '#5B21B6' }}>
                  📄 Lehrkraft-PDF
                </button>
                {(diagnose.sus_rueckmeldungen?.length ?? 0) > 0 && (
                  <button onClick={downloadSusPdfs}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border"
                    style={{ background: '#FFFFFF', borderColor: '#E9D5FF', color: '#5B21B6' }}>
                    📄 SuS-PDFs ({diagnose.sus_rueckmeldungen!.length})
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="rounded-2xl p-4" style={{ background: '#D1FAE5', border: '1px solid #6EE7B7' }}>
                <p className="text-2xl font-black" style={{ color: '#065F46' }}>{diagnose.klassenueberblick.lernziel_erreicht}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#059669' }}>Lernziel erreicht</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <p className="text-2xl font-black" style={{ color: '#92400E' }}>{diagnose.klassenueberblick.lernziel_teilweise}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#D97706' }}>Teilweise erreicht</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                <p className="text-2xl font-black" style={{ color: '#991B1B' }}>{diagnose.klassenueberblick.lernziel_noch_nicht_gesichert}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#DC2626' }}>Noch nicht gesichert</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: '#F6F1FF', border: '1px solid #E9D5FF' }}>
              <p className="text-sm" style={{ color: '#1F1235' }}>{diagnose.klassenueberblick.gesamteinschaetzung}</p>
            </div>
            {diagnose.klassenueberblick.abdeckungshinweis && (
              <p className="text-xs mt-2 italic" style={{ color: '#7A6A94' }}>{diagnose.klassenueberblick.abdeckungshinweis}</p>
            )}
          </div>

          {/* Kompetenzampel */}
          {diagnose.kompetenzampel_klasse.length > 0 && (
            <div style={cardStyle} className="p-6">
              <h2 className="font-bold mb-4" style={{ color: '#1F1235' }}>Teilkompetenzen</h2>
              <div className="flex flex-col gap-2">
                {diagnose.kompetenzampel_klasse.map((k, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: '#F3EEFF' }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: AMPEL_COLORS[k.status] ?? '#C4B5FD' }} />
                    <span className="text-sm flex-1" style={{ color: '#1F1235' }}>{k.teilkompetenz}</span>
                    <span className="text-xs" style={{ color: '#7A6A94' }}>{k.einschaetzung}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fehlvorstellungen */}
          {diagnose.haeufige_fehlvorstellungen.length > 0 && (
            <div style={cardStyle} className="p-6">
              <h2 className="font-bold mb-4" style={{ color: '#1F1235' }}>Häufige Fehlvorstellungen</h2>
              <div className="flex flex-col gap-3">
                {diagnose.haeufige_fehlvorstellungen.map((f, i) => (
                  <div key={i} className="rounded-xl px-4 py-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold" style={{ color: '#92400E' }}>{f.fehlvorstellung}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                        style={{ background: '#FDE68A', color: '#92400E' }}>{f.haeufigkeit}×</span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: '#D97706' }}>{f.empfehlung}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empfehlungen */}
          {(diagnose.empfehlungen_weiterarbeit.plenum.length > 0 ||
            diagnose.empfehlungen_weiterarbeit.vertiefung.length > 0 ||
            diagnose.empfehlungen_weiterarbeit.erweiterung.length > 0 ||
            diagnose.empfehlungen_weiterarbeit.exit_ticket_vorschlag) && (
            <div style={cardStyle} className="p-6">
              <h2 className="font-bold mb-4" style={{ color: '#1F1235' }}>Empfehlungen Weiterarbeit</h2>
              {diagnose.empfehlungen_weiterarbeit.plenum.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#7C3AED' }}>Im Plenum</p>
                  <ul className="flex flex-col gap-1.5">
                    {diagnose.empfehlungen_weiterarbeit.plenum.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1F1235' }}>
                        <span style={{ color: '#A855F7' }}>→</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diagnose.empfehlungen_weiterarbeit.vertiefung.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#7C3AED' }}>Vertiefung</p>
                  <ul className="flex flex-col gap-1.5">
                    {diagnose.empfehlungen_weiterarbeit.vertiefung.map((v, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1F1235' }}>
                        <span style={{ color: '#A855F7' }}>→</span> {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diagnose.empfehlungen_weiterarbeit.erweiterung.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#059669' }}>Erweiterung</p>
                  <ul className="flex flex-col gap-1.5">
                    {diagnose.empfehlungen_weiterarbeit.erweiterung.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1F1235' }}>
                        <span style={{ color: '#10B981' }}>↗</span> {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diagnose.empfehlungen_weiterarbeit.exit_ticket_vorschlag && (
                <div className="rounded-xl px-4 py-3 mt-2" style={{ background: '#F6F1FF', border: '1px dashed #C4B5FD' }}>
                  <p className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: '#7C3AED' }}>Exit-Ticket-Vorschlag</p>
                  <p className="text-sm" style={{ color: '#1F1235' }}>{diagnose.empfehlungen_weiterarbeit.exit_ticket_vorschlag}</p>
                </div>
              )}
            </div>
          )}

          {/* Fördergruppen (Detailmodus) */}
          {diagnose.foerdergruppen && diagnose.foerdergruppen.length > 0 && (
            <div style={cardStyle} className="p-6">
              <h2 className="font-bold mb-1" style={{ color: '#1F1235' }}>Fördergruppen</h2>
              <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>Anonym nach Schülercodes — keine Klarnamen.</p>
              <div className="flex flex-col gap-3">
                {diagnose.foerdergruppen.map((g, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#FAFAFA', border: '1px solid #E5E7EB' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-sm px-2 py-0.5 rounded-lg"
                        style={{ background: '#F3EEFF', color: '#5B21B6' }}>Gruppe {g.gruppe}</span>
                      <span className="text-xs font-medium" style={{ color: '#1F1235' }}>{g.beschreibung}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {g.codes.map((c, j) => (
                        <span key={j} className="font-mono text-xs px-1.5 py-0.5 rounded"
                          style={{ background: '#F3EEFF', color: '#5B21B6' }}>{c}</span>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: '#7A6A94' }}>{g.empfehlung}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individuelle Diagnosen */}
          {diagnose.individuelle_diagnosen.length > 0 && (
            <div style={cardStyle} className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold" style={{ color: '#1F1235' }}>
                  Individuelle Diagnosen
                  <span className="ml-2 text-sm font-normal" style={{ color: '#7A6A94' }}>({diagnose.individuelle_diagnosen.length} Codes)</span>
                </h2>
              </div>
              <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
                Klick auf einen Code für Details zu Teilkompetenzen, Hilfenutzung und Fehlvorstellungen.
              </p>
              <div className="flex flex-col gap-1">
                {diagnose.individuelle_diagnosen.map((d, i) => {
                  const statusColor = d.lernzielstatus === 'erreicht' ? '#059669'
                    : d.lernzielstatus === 'teilweise_erreicht' ? '#D97706' : '#DC2626'
                  const istOffen = expandedCode === d.code
                  const hatDetails = Boolean(
                    (d.sichere_teilkompetenzen?.length ?? 0) > 0 ||
                    (d.unsichere_teilkompetenzen?.length ?? 0) > 0 ||
                    (d.fehlvorstellungen?.length ?? 0) > 0 ||
                    d.hilfenutzung ||
                    d.erreichte_komplexitaetsstufe
                  )
                  return (
                    <div key={i} className="rounded-lg overflow-hidden border" style={{ borderColor: '#F3EEFF' }}>
                      <button
                        type="button"
                        onClick={() => hatDetails && setExpandedCode(istOffen ? null : d.code)}
                        className="w-full text-left flex items-start gap-3 px-3 py-2.5 transition-colors"
                        style={{
                          cursor: hatDetails ? 'pointer' : 'default',
                          background: istOffen ? '#FAFAFA' : 'transparent',
                        }}
                      >
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                          style={{ background: '#F3EEFF', color: '#5B21B6' }}>{d.code}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: statusColor }}>
                              {STATUS_LABEL[d.lernzielstatus] ?? d.lernzielstatus}
                            </span>
                            {d.hilfenutzung && (
                              <span className="text-xs font-medium" style={{ color: HILFENUTZUNG_FARBE[d.hilfenutzung] ?? '#7A6A94' }}>
                                · {HILFENUTZUNG_LABEL[d.hilfenutzung] ?? d.hilfenutzung}
                              </span>
                            )}
                            {d.erreichte_komplexitaetsstufe && (
                              <span className="text-xs font-medium" style={{ color: '#7A6A94' }}>
                                · K-Stufe {d.erreichte_komplexitaetsstufe}
                              </span>
                            )}
                          </div>
                          {d.empfehlung && <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>{d.empfehlung}</p>}
                        </div>
                        {hatDetails && (
                          <span className="text-xs" style={{ color: '#7C3AED' }}>{istOffen ? '▴' : '▾'}</span>
                        )}
                      </button>
                      {istOffen && hatDetails && (
                        <div className="bg-white border-t px-4 py-3 flex flex-col gap-2"
                          style={{ borderColor: '#F3EEFF' }}>
                          {(d.sichere_teilkompetenzen?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: '#059669' }}>Sicher</p>
                              <ul className="text-xs flex flex-col gap-0.5" style={{ color: '#1F1235' }}>
                                {d.sichere_teilkompetenzen!.map((k, j) => <li key={j}>✓ {k}</li>)}
                              </ul>
                            </div>
                          )}
                          {(d.unsichere_teilkompetenzen?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: '#D97706' }}>Noch unsicher</p>
                              <ul className="text-xs flex flex-col gap-0.5" style={{ color: '#1F1235' }}>
                                {d.unsichere_teilkompetenzen!.map((k, j) => <li key={j}>○ {k}</li>)}
                              </ul>
                            </div>
                          )}
                          {(d.fehlvorstellungen?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: '#991B1B' }}>Fehlvorstellungen</p>
                              <ul className="text-xs flex flex-col gap-0.5" style={{ color: '#1F1235' }}>
                                {d.fehlvorstellungen!.map((f, j) => <li key={j}>⚠ {f}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SuS-Rückmeldungen (Detailmodus) */}
          {diagnose.sus_rueckmeldungen && diagnose.sus_rueckmeldungen.length > 0 && (
            <div style={cardStyle} className="p-6">
              <h2 className="font-bold mb-1" style={{ color: '#1F1235' }}>Schüler-Rückmeldungen</h2>
              <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
                Motivierende, anonyme Rückmeldungen pro Code — Basis für SuS-PDF.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnose.sus_rueckmeldungen.map((r, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#FAFAFA', border: '1px solid #E5E7EB' }}>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded inline-block mb-2"
                      style={{ background: '#F3EEFF', color: '#5B21B6' }}>{r.code}</span>
                    <p className="text-sm mb-2" style={{ color: '#1F1235' }}>{r.lernstand_satz}</p>
                    {r.kann_schon_gut.length > 0 && (
                      <div className="mb-1.5">
                        <p className="text-xs font-semibold" style={{ color: '#059669' }}>Kannst du schon gut:</p>
                        <ul className="text-xs flex flex-col gap-0.5" style={{ color: '#1F1235' }}>
                          {r.kann_schon_gut.map((k, j) => <li key={j}>· {k}</li>)}
                        </ul>
                      </div>
                    )}
                    {r.noch_ueben.length > 0 && (
                      <div className="mb-1.5">
                        <p className="text-xs font-semibold" style={{ color: '#D97706' }}>Noch üben:</p>
                        <ul className="text-xs flex flex-col gap-0.5" style={{ color: '#1F1235' }}>
                          {r.noch_ueben.map((u, j) => <li key={j}>· {u}</li>)}
                        </ul>
                      </div>
                    )}
                    {r.naechster_schritt && (
                      <p className="text-xs italic mt-1" style={{ color: '#5B21B6' }}>→ {r.naechster_schritt}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daten-Hinweise */}
          {diagnose.daten_hinweise && diagnose.daten_hinweise.length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-xs font-bold mb-1.5" style={{ color: '#92400E' }}>Hinweise zur Datengrundlage</p>
              <ul className="flex flex-col gap-1">
                {diagnose.daten_hinweise.map((h, i) => (
                  <li key={i} className="text-xs" style={{ color: '#92400E' }}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

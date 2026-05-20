'use client'

type Klassifikation = 'loesung' | 'distraktor' | 'sonstige'

interface AntwortVerteilungEintrag {
  wert: string
  anzahl: number
  klassifikation: Klassifikation
  anteil: number
}

interface AufgabenPattern {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren: string[]
  teilnehmer: number
  korrekt: number
  teilweise_korrekt: number
  falsch: number
  korrekt_quote: number
  durchschnittliche_versuche: number
  hilfen_quote: number
  durchschnittliche_zeit_sek: number | null
  antwort_verteilung: AntwortVerteilungEintrag[]
}

interface DifferenzierungsEintrag {
  niveau: string
  anzahl_sessions: number
  abgeschlossen: number
  anteil: number
}

export interface PatternsData {
  spiel_id: string
  anzahl_sessions: number
  anzahl_sessions_abgeschlossen: number
  gesamt_korrekt_quote: number
  aufgaben_patterns: AufgabenPattern[]
  differenzierung_verteilung: DifferenzierungsEintrag[]
}

interface Props {
  data: PatternsData
}

const NIVEAU_LABEL: Record<string, string> = {
  leichter: 'Leichter',
  mittel: 'Mittel',
  schwer: 'Schwer',
  sehr_schwer: 'Sehr schwer',
  basis: 'Basis',
  standard: 'Standard',
  unbekannt: 'Unbekannt',
}

const NIVEAU_FARBE: Record<string, string> = {
  leichter: '#10B981',
  basis: '#10B981',
  mittel: '#7C3AED',
  standard: '#7C3AED',
  schwer: '#D97706',
  sehr_schwer: '#DC2626',
  unbekannt: '#9CA3AF',
}

const KLASS_STYLE: Record<Klassifikation, { bg: string; text: string; border: string; balken: string; icon: string }> = {
  loesung: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', balken: '#10B981', icon: '✓' },
  distraktor: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA', balken: '#DC2626', icon: '✗' },
  sonstige: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', balken: '#9CA3AF', icon: '?' },
}

function formatProzent(quote: number): string {
  return `${Math.round(quote * 100)}%`
}

function formatZeit(sek: number | null): string {
  if (sek == null) return '—'
  if (sek < 60) return `${Math.round(sek)} s`
  const min = Math.floor(sek / 60)
  const rest = Math.round(sek % 60)
  return `${min}:${rest.toString().padStart(2, '0')} min`
}

function korrektQuoteFarbe(quote: number): string {
  if (quote >= 0.75) return '#10B981'
  if (quote >= 0.5) return '#D97706'
  return '#DC2626'
}

export function AntwortmusterPanel({ data }: Props) {
  if (data.anzahl_sessions === 0) {
    return (
      <div className="rounded-2xl p-6 text-center"
        style={{ background: '#FFFFFF', border: '1px solid #E9D5FF', borderRadius: 20 }}>
        <p className="text-sm text-muted-foreground">Noch keine Schülerantworten — sobald Schüler:innen spielen, erscheint hier die Auswertung.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Übersicht */}
      <div className="rounded-2xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E9D5FF', boxShadow: '0 2px 24px rgba(124,58,237,0.08)', borderRadius: 20 }}>
        <h2 className="font-bold mb-4" style={{ color: '#1F1235' }}>Teilnahme &amp; Erfolgsquote</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#1F1235' }}>{data.anzahl_sessions}</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>
              Schüler-Codes ({data.anzahl_sessions_abgeschlossen} abgeschlossen)
            </p>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums" style={{ color: korrektQuoteFarbe(data.gesamt_korrekt_quote) }}>
              {formatProzent(data.gesamt_korrekt_quote)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>Gesamt-Korrektquote</p>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#1F1235' }}>{data.aufgaben_patterns.length}</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>Aufgaben</p>
          </div>
        </div>
      </div>

      {/* Differenzierungsverteilung */}
      {data.differenzierung_verteilung.length > 1 && (
        <div className="rounded-2xl p-6"
          style={{ background: '#FFFFFF', border: '1px solid #E9D5FF', boxShadow: '0 2px 24px rgba(124,58,237,0.08)', borderRadius: 20 }}>
          <h2 className="font-bold mb-1" style={{ color: '#1F1235' }}>Differenzierung</h2>
          <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
            Welches Schwierigkeitsniveau haben die Schüler:innen gewählt?
          </p>
          <div className="flex flex-col gap-2">
            {data.differenzierung_verteilung.map(d => {
              const farbe = NIVEAU_FARBE[d.niveau] ?? '#7C3AED'
              return (
                <div key={d.niveau} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 flex-shrink-0" style={{ color: '#1F1235' }}>
                    {NIVEAU_LABEL[d.niveau] ?? d.niveau}
                  </span>
                  <div className="flex-1 rounded-full h-6 overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <div className="h-full flex items-center px-2 text-xs font-semibold text-white"
                      style={{ width: `${Math.max(d.anteil * 100, 4)}%`, background: farbe }}>
                      {d.anzahl_sessions}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums w-20 text-right flex-shrink-0" style={{ color: '#7A6A94' }}>
                    {d.abgeschlossen}/{d.anzahl_sessions} fertig
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pro-Aufgabe-Patterns */}
      <div className="rounded-2xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E9D5FF', boxShadow: '0 2px 24px rgba(124,58,237,0.08)', borderRadius: 20 }}>
        <h2 className="font-bold mb-1" style={{ color: '#1F1235' }}>Antwortmuster pro Aufgabe</h2>
        <p className="text-xs mb-4" style={{ color: '#7A6A94' }}>
          Welche Antworten wurden gegeben? Distraktoren mit hoher Wahlquote deuten auf Fehlvorstellungen.
        </p>
        <div className="flex flex-col gap-5">
          {data.aufgaben_patterns.map((p, i) => (
            <div key={p.aufgabe_id} className="border-t pt-5 first:border-t-0 first:pt-0" style={{ borderColor: '#F3EEFF' }}>
              {/* Aufgabe-Header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xs font-mono font-bold flex-shrink-0 pt-0.5"
                  style={{ color: '#5B21B6', background: '#F3EEFF', padding: '2px 8px', borderRadius: 6 }}>
                  Q{i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#1F1235' }}>{p.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>
                    {p.antwortformat} · {p.teilnehmer} {p.teilnehmer === 1 ? 'Antwort' : 'Antworten'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black tabular-nums" style={{ color: korrektQuoteFarbe(p.korrekt_quote) }}>
                    {formatProzent(p.korrekt_quote)}
                  </p>
                  <p className="text-xs" style={{ color: '#7A6A94' }}>richtig</p>
                </div>
              </div>

              {/* Antwortverteilung */}
              {p.antwort_verteilung.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {p.antwort_verteilung.map((eintrag, j) => {
                    const style = KLASS_STYLE[eintrag.klassifikation]
                    return (
                      <div key={j} className="flex items-center gap-2.5">
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0"
                          style={{ color: style.balken }}>
                          {style.icon}
                        </span>
                        <div className="flex-1 rounded-md overflow-hidden h-7 relative" style={{ background: '#FAFAFA' }}>
                          <div className="h-full transition-all"
                            style={{ width: `${Math.max(eintrag.anteil * 100, 1)}%`, background: style.bg, borderRight: `2px solid ${style.balken}` }} />
                          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                            <span className="font-medium truncate pr-2" style={{ color: style.text }}>{eintrag.wert}</span>
                            <span className="tabular-nums font-semibold flex-shrink-0" style={{ color: style.text }}>
                              {eintrag.anzahl}× · {formatProzent(eintrag.anteil)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: '#9CA3AF' }}>Keine Antworten</p>
              )}

              {/* Sekundär-Metriken */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: '#7A6A94' }}>
                <span>Ø Versuche: <span className="font-semibold tabular-nums" style={{ color: '#1F1235' }}>{p.durchschnittliche_versuche.toFixed(1)}</span></span>
                <span>Ø Zeit: <span className="font-semibold tabular-nums" style={{ color: '#1F1235' }}>{formatZeit(p.durchschnittliche_zeit_sek)}</span></span>
                <span>Hilfen genutzt: <span className="font-semibold tabular-nums" style={{ color: '#1F1235' }}>{formatProzent(p.hilfen_quote)}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

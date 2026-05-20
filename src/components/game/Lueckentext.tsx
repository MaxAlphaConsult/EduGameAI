'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  text: string
  loesungen: string[]      // in Reihenfolge der Lücken
  distraktoren: string[]   // zusätzliche Wortbank-Einträge
  hilfen: string[]
  feedback: { bei_korrekt: string; bei_falsch: string }
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

// Splittet den Text an `___` (drei Unterstriche) — KI-Konvention für Lücken
function splitTextAnLuecken(text: string): string[] {
  return text.split(/_{2,}/g)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalisiere(wert: string): string {
  return wert.toLowerCase().trim()
}

export function Lueckentext({ text, loesungen, distraktoren, hilfen, feedback, onAntwort }: Props) {
  const textTeile = useMemo(() => splitTextAnLuecken(text), [text])
  const anzahlLuecken = Math.max(textTeile.length - 1, loesungen.length)

  // Wortbank: alle Lösungen + Distraktoren, durchmischt
  const wortbank = useMemo(() => {
    const eintraege = [...loesungen, ...distraktoren].map((w, i) => ({ id: i, wort: w }))
    return shuffle(eintraege)
  }, [loesungen, distraktoren])

  // Zuweisungen: luecke_index → wortbank_id (oder null)
  const [zuweisungen, setZuweisungen] = useState<(number | null)[]>(() => Array(anzahlLuecken).fill(null))
  const [aktiveLuecke, setAktiveLuecke] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [showHilfe, setShowHilfe] = useState(false)
  const [hilfeIndex, setHilfeIndex] = useState(0)

  function wortFuerLuecke(i: number): { wort: string; id: number } | null {
    const id = zuweisungen[i]
    if (id == null) return null
    const e = wortbank.find(w => w.id === id)
    return e ? { wort: e.wort, id: e.id } : null
  }

  function chipBenutzt(id: number): boolean {
    return zuweisungen.includes(id)
  }

  function chipKlick(id: number) {
    if (submitted) return
    // Wenn Chip schon zugewiesen: aus seiner Lücke entfernen
    const bestehendeLuecke = zuweisungen.findIndex(z => z === id)
    if (bestehendeLuecke >= 0) {
      const next = [...zuweisungen]
      next[bestehendeLuecke] = null
      setZuweisungen(next)
      setAktiveLuecke(bestehendeLuecke)
      return
    }
    // Sonst in aktive Lücke setzen — oder nächste leere
    let zielLuecke = aktiveLuecke
    if (zuweisungen[zielLuecke] != null) {
      const naechsteLeere = zuweisungen.findIndex((z, i) => i >= zielLuecke && z == null)
      zielLuecke = naechsteLeere >= 0 ? naechsteLeere : zuweisungen.findIndex(z => z == null)
    }
    if (zielLuecke < 0) return
    const next = [...zuweisungen]
    next[zielLuecke] = id
    setZuweisungen(next)
    // Cursor zur nächsten leeren Lücke springen
    const folgeLeer = next.findIndex((z, i) => i > zielLuecke && z == null)
    setAktiveLuecke(folgeLeer >= 0 ? folgeLeer : zielLuecke)
  }

  function lueckeKlick(i: number) {
    if (submitted) return
    setAktiveLuecke(i)
  }

  function submit() {
    if (zuweisungen.some(z => z == null)) return
    const antworten = zuweisungen.map((_, i) => wortFuerLuecke(i)?.wort ?? '')
    const korrekt = antworten.every((a, i) => normalisiere(a) === normalisiere(loesungen[i] ?? ''))
    setSubmitted(true)
    onAntwort(antworten, korrekt)
  }

  function lueckeAuswertung(i: number): 'richtig' | 'falsch' | 'leer' {
    if (!submitted) return 'leer'
    const w = wortFuerLuecke(i)?.wort
    if (!w) return 'falsch'
    return normalisiere(w) === normalisiere(loesungen[i] ?? '') ? 'richtig' : 'falsch'
  }

  const alleGefuellt = zuweisungen.every(z => z != null)
  const gesamtKorrekt = submitted && zuweisungen.every((_, i) => lueckeAuswertung(i) === 'richtig')

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium text-muted-foreground">
        Ziehe die passenden Begriffe in die Lücken — klick einen Begriff und dann eine Lücke (oder umgekehrt).
      </p>

      {/* Fließtext mit Lücken */}
      <div className="text-base leading-relaxed flex flex-wrap items-center gap-1.5 bg-muted/30 rounded-xl p-4">
        {textTeile.map((stueck, i) => (
          <span key={`stueck-${i}`} className="flex flex-wrap items-center gap-1.5">
            <span>{stueck}</span>
            {i < textTeile.length - 1 && i < anzahlLuecken && (() => {
              const inhalt = wortFuerLuecke(i)
              const auswert = lueckeAuswertung(i)
              const aktiv = !submitted && aktiveLuecke === i
              return (
                <button
                  key={`luecke-${i}`}
                  onClick={() => lueckeKlick(i)}
                  disabled={submitted}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md px-3 py-1 min-w-[80px] border-2 text-sm font-medium transition-all',
                    !submitted && !inhalt && aktiv && 'border-primary bg-primary/10 text-primary',
                    !submitted && !inhalt && !aktiv && 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50',
                    !submitted && inhalt && aktiv && 'border-primary bg-primary/15 text-primary',
                    !submitted && inhalt && !aktiv && 'border-primary/40 bg-primary/5',
                    submitted && auswert === 'richtig' && 'border-green-500 bg-green-50 text-green-800',
                    submitted && auswert === 'falsch' && 'border-red-400 bg-red-50 text-red-800',
                  )}
                  style={{ cursor: submitted ? 'default' : 'pointer' }}
                >
                  {inhalt ? inhalt.wort : '___'}
                </button>
              )
            })()}
          </span>
        ))}
      </div>

      {/* Wortbank */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Wortbank</p>
        <div className="flex flex-wrap gap-2">
          {wortbank.map(({ id, wort }) => {
            const benutzt = chipBenutzt(id)
            // Nach Submit: zeige ob das Wort als Lösung verwendet wurde
            let auswertStil: string | null = null
            if (submitted && benutzt) {
              const zugLuecke = zuweisungen.findIndex(z => z === id)
              auswertStil = lueckeAuswertung(zugLuecke) === 'richtig' ? 'green' : 'red'
            }
            return (
              <button
                key={id}
                onClick={() => chipKlick(id)}
                disabled={submitted}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all border',
                  !submitted && !benutzt && 'bg-white border-border hover:border-primary hover:bg-primary/5',
                  !submitted && benutzt && 'bg-muted text-muted-foreground border-transparent opacity-50 line-through',
                  submitted && !auswertStil && 'bg-muted text-muted-foreground border-transparent opacity-40',
                  submitted && auswertStil === 'green' && 'bg-green-50 text-green-800 border-green-200',
                  submitted && auswertStil === 'red' && 'bg-red-50 text-red-800 border-red-200',
                )}
              >
                {wort}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback nach Abgabe */}
      {submitted && (
        <div className={cn(
          'rounded-xl px-4 py-3 text-sm',
          gesamtKorrekt ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800',
        )}>
          {gesamtKorrekt
            ? (feedback.bei_korrekt || 'Alle Lücken richtig — gut gemacht!')
            : (feedback.bei_falsch || 'Nicht alle Lücken stimmen — richtige Lösungen sind grün markiert.')}
        </div>
      )}

      {/* Hilfen */}
      {!submitted && hilfen.length > 0 && (
        <div>
          {!showHilfe ? (
            <button onClick={() => setShowHilfe(true)}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2">
              Hilfe anzeigen
            </button>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Hilfe {hilfeIndex + 1}/{hilfen.length}</p>
              <p className="text-sm text-blue-900">{hilfen[hilfeIndex]}</p>
              {hilfeIndex < hilfen.length - 1 && (
                <button onClick={() => setHilfeIndex(h => h + 1)}
                  className="text-xs text-blue-600 hover:underline mt-2">
                  Weitere Hilfe
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!submitted && (
        <button
          onClick={submit}
          disabled={!alleGefuellt}
          className="self-start bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {alleGefuellt ? 'Antwort abgeben' : `Noch ${zuweisungen.filter(z => z == null).length} Lücke${zuweisungen.filter(z => z == null).length === 1 ? '' : 'n'}`}
        </button>
      )}
    </div>
  )
}

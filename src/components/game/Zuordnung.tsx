'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Paar {
  links: string
  rechts: string
}

interface Props {
  text: string
  paare: Paar[]
  hilfen: string[]
  feedback: { bei_korrekt: string; bei_falsch: string }
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function Zuordnung({ text, paare, hilfen, feedback, onAntwort }: Props) {
  // Jeder Ziel-Bereich nur EINMAL — auch wenn mehrere linke Elemente darauf passen
  // (many-to-one). Duplikate würden sonst doppelt angezeigt und beim Belegen alle
  // zugleich ausgegraut.
  const [rechtsShuffled] = useState(() => shuffle([...new Set(paare.map((p) => p.rechts))]))
  const [zuordnungen, setZuordnungen] = useState<Record<number, string>>({})
  const [selectedLinks, setSelectedLinks] = useState<number | null>(null)
  const [hinweisRechts, setHinweisRechts] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showHilfe, setShowHilfe] = useState(false)
  const [hilfeIndex, setHilfeIndex] = useState(0)

  function clickLinks(i: number) {
    if (submitted) return
    setSelectedLinks(i === selectedLinks ? null : i)
    setHinweisRechts(false)
  }

  function clickRechts(r: string) {
    if (submitted) return
    if (selectedLinks === null) {
      // Kein linkes Element gewählt — visuellen Hinweis zeigen
      setHinweisRechts(true)
      setTimeout(() => setHinweisRechts(false), 1200)
      return
    }
    setZuordnungen((prev) => ({ ...prev, [selectedLinks]: r }))
    setSelectedLinks(null)
  }

  function removeZuordnung(linksIdx: number) {
    if (submitted) return
    setZuordnungen((prev) => {
      const next = { ...prev }
      delete next[linksIdx]
      return next
    })
  }

  function submit() {
    const antworten = paare.map((_, i) => `${paare[i].links} → ${zuordnungen[i] ?? '?'}`)
    const korrekt = paare.every((p, i) => zuordnungen[i] === p.rechts)
    setSubmitted(true)
    onAntwort(antworten, korrekt)
  }

  const alleZugeordnet = paare.every((_, i) => zuordnungen[i] !== undefined)
  const vergeben = new Set(Object.values(zuordnungen))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium leading-snug">{text}</p>

      {/* Dynamische Anweisung */}
      <div className={cn(
        'text-xs px-3 py-2 rounded-lg text-center font-medium transition-all duration-200',
        selectedLinks !== null
          ? 'bg-primary/10 text-primary border border-primary/20'
          : hinweisRechts
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-muted/60 text-muted-foreground'
      )}>
        {selectedLinks !== null
          ? `"${paare[selectedLinks].links}" ausgewählt → jetzt rechts zuordnen`
          : hinweisRechts
          ? '← Zuerst links ein Element auswählen'
          : '① Links auswählen  →  ② Rechts zuordnen'}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Linke Spalte */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground text-center mb-1">Begriff</p>
          {paare.map((p, i) => {
            const isSelected = selectedLinks === i
            const hasMatch = zuordnungen[i] !== undefined
            const isKorrekt = submitted && zuordnungen[i] === p.rechts
            const isFalsch = submitted && zuordnungen[i] !== undefined && zuordnungen[i] !== p.rechts

            return (
              <button
                key={i}
                onClick={() => clickLinks(i)}
                disabled={submitted}
                className={cn(
                  'text-left px-3 py-2.5 rounded-xl border text-sm transition-all duration-150 min-h-[44px]',
                  !submitted && isSelected && 'border-primary bg-primary/10 font-medium ring-2 ring-primary/30 shadow-sm',
                  !submitted && !isSelected && hasMatch && 'border-primary/40 bg-primary/5',
                  !submitted && !isSelected && !hasMatch && 'border-border hover:border-primary/50 hover:bg-primary/5',
                  submitted && isKorrekt && 'border-green-500 bg-green-50 text-green-900',
                  submitted && isFalsch && 'border-red-400 bg-red-50 text-red-900',
                  submitted && !hasMatch && 'border-border opacity-50',
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span>{p.links}</span>
                  {!submitted && hasMatch && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeZuordnung(i) }}
                      className="text-muted-foreground hover:text-red-500 text-xs flex-shrink-0"
                      title="Zuordnung entfernen"
                    >
                      ✕
                    </button>
                  )}
                  {submitted && (isKorrekt ? <span className="text-green-600 text-xs">✓</span> : isFalsch ? <span className="text-red-500 text-xs">✗</span> : null)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Rechte Spalte */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground text-center mb-1">Zuordnung</p>
          {rechtsShuffled.map((r, i) => {
            // Wiederverwendbar: ein Bereich kann von mehreren linken Elementen belegt
            // werden. „Belegt" ist nur ein dezenter Hinweis, kein Sperren/Ausgrauen.
            const isVergeben = vergeben.has(r)
            const isKorrekt = submitted && paare.some((p, k) => p.rechts === r && zuordnungen[k] === r)
            const isFalsch = submitted && !isKorrekt && Object.values(zuordnungen).includes(r)
            const isClickable = !submitted && selectedLinks !== null

            return (
              <button
                key={i}
                onClick={() => clickRechts(r)}
                disabled={submitted}
                className={cn(
                  'text-left px-3 py-2.5 rounded-xl border text-sm transition-all duration-150 min-h-[44px]',
                  !submitted && selectedLinks === null && 'border-border text-muted-foreground',
                  !submitted && isVergeben && selectedLinks === null && 'bg-primary/5 border-primary/30',
                  isClickable && 'border-dashed border-primary/60 bg-primary/5 hover:bg-primary/10 hover:border-primary cursor-pointer',
                  submitted && isKorrekt && 'border-green-500 bg-green-50 text-green-900',
                  submitted && isFalsch && 'border-red-400 bg-red-50 text-red-900',
                  submitted && !isKorrekt && !isFalsch && 'border-border opacity-50',
                )}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>

      {submitted && (
        <div className={cn(
          'rounded-xl px-4 py-3 text-sm font-medium',
          paare.every((p, i) => zuordnungen[i] === p.rechts)
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        )}>
          {paare.every((p, i) => zuordnungen[i] === p.rechts)
            ? feedback.bei_korrekt || 'Alle Zuordnungen korrekt!'
            : feedback.bei_falsch || 'Einige Zuordnungen waren falsch.'}
        </div>
      )}

      {!submitted && hilfen.length > 0 && (
        <div>
          {!showHilfe ? (
            <button onClick={() => setShowHilfe(true)} className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2">
              Hilfe anzeigen
            </button>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Hilfe {hilfeIndex + 1}/{hilfen.length}</p>
              <p className="text-sm text-blue-900">{hilfen[hilfeIndex]}</p>
              {hilfeIndex < hilfen.length - 1 && (
                <button onClick={() => setHilfeIndex((h) => h + 1)} className="text-xs text-blue-600 hover:underline mt-2">
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
          disabled={!alleZugeordnet}
          className="self-start bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          Abgeben
        </button>
      )}
    </div>
  )
}

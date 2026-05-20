'use client'

import { useState } from 'react'

interface Aufgabe {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
}

interface Props {
  spielId: string
  initialAufgaben: Aufgabe[]
}

export function AufgabenListe({ spielId, initialAufgaben }: Props) {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>(initialAufgaben)
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
      const { aufgabe } = await res.json()
      setAufgaben((prev) => prev.map((a) => (a.aufgabe_id === aufgabeId ? aufgabe : a)))
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLadeId(null)
    }
  }

  return (
    <div className="border rounded-xl p-5">
      <h2 className="font-semibold mb-3">Aufgaben ({aufgaben.length})</h2>
      {fehler && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{fehler}</p>
      )}
      <div className="flex flex-col gap-2">
        {aufgaben.map((q, i) => {
          const laedt = ladeId === q.aufgabe_id
          return (
            <div key={q.aufgabe_id} className="bg-muted/40 rounded-lg px-4 py-3">
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
                <button
                  type="button"
                  onClick={() => regenerieren(q.aufgabe_id)}
                  disabled={laedt || ladeId !== null}
                  title="Diese Aufgabe neu generieren"
                  className="text-xs px-2.5 py-1 rounded-md border border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {laedt ? '⟳ …' : '🔄 Neu'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

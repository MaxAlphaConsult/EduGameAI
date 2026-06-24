import type { GroundingCheckOutput } from '../schemas/pipeline'

// Wendet die Grounding-Verdikte auf die generierten Aufgaben an (Block C, C2).
//
// Politik:
//   * Nicht gegründete Aufgaben werden VERWORFEN …
//   * … aber es bleiben immer mindestens `minKeep` Aufgaben erhalten. Würde das
//     Verwerfen zu wenig übrig lassen, werden die betroffenen Aufgaben nur
//     MARKIERT (besser ein markiertes als ein leeres/kaputtes Modul).
//   * Aufgaben ohne Verdikt gelten als gegründet (konservativ behalten — der
//     Prüfer soll explizit `false` setzen, um zu verwerfen).
//
// Reine Funktion ohne KI/IO → in grounding.test.ts deterministisch testbar.

export interface GroundingHinweis {
  aufgabe_id: string
  problem: string
  elemente: string[]
  verworfen: boolean
}

export interface GroundingReport {
  status: 'ok' | 'warnung' | 'problem'
  geprueft: number
  verworfen: number
  markiert: number
  zusammenfassung: string
  hinweise: GroundingHinweis[]
}

export function applyGrounding<T extends { aufgabe_id: string }>(
  aufgaben: T[],
  check: GroundingCheckOutput,
  minKeep = 1,
): { aufgaben: T[]; report: GroundingReport } {
  const verdict = new Map(check.bewertungen.map((b) => [b.aufgabe_id, b]))
  const istUngegruendet = (a: T) => verdict.get(a.aufgabe_id)?.gegruendet === false

  const gegruendet = aufgaben.filter((a) => !istUngegruendet(a))

  // Nur verwerfen, wenn danach noch genug übrig bleibt.
  const darfVerwerfen = gegruendet.length >= minKeep
  const aufgabenFinal = darfVerwerfen ? gegruendet : aufgaben
  const verworfenIds = new Set(
    darfVerwerfen ? aufgaben.filter(istUngegruendet).map((a) => a.aufgabe_id) : [],
  )

  const hinweise: GroundingHinweis[] = check.bewertungen
    .filter((b) => b.gegruendet === false)
    .map((b) => ({
      aufgabe_id: b.aufgabe_id,
      problem: b.problem ?? 'Nicht eindeutig aus dem Material ableitbar.',
      elemente: b.problematische_elemente,
      verworfen: verworfenIds.has(b.aufgabe_id),
    }))

  const verworfen = hinweise.filter((h) => h.verworfen).length
  const markiert = hinweise.length - verworfen
  const status: GroundingReport['status'] =
    hinweise.length === 0 ? 'ok' : verworfen > 0 ? 'problem' : 'warnung'

  return {
    aufgaben: aufgabenFinal,
    report: {
      status,
      geprueft: aufgaben.length,
      verworfen,
      markiert,
      zusammenfassung: check.zusammenfassung,
      hinweise,
    },
  }
}

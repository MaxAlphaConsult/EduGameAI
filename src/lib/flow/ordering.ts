// Sortier- und Niveau-Logik für GameFlows.
//
// Die didaktische Reihenfolge ergibt sich automatisch aus drei Signalen, die
// pro Modul aus der Analyse + Spielmetadaten verfügbar sind:
//   1. komplexitaetsstufe der zugrundeliegenden Analyse (1–7)
//   2. Gewicht der Denkhandlungen (erkennen < zuordnen < ... < bewerten)
//   3. Engine-Gewicht (wissensabruf < zuordnung_ordnung < ... < reflexion_strategie)
//
// Schüler:innen wählen kein Niveau mehr — das System verteilt es entlang der
// Modul-Position linear von leichter → sehr_schwer.

import type { Differenzierungsniveau } from '@/types'

// ── Denkhandlung → Schwierigkeitsgewicht ─────────────────────────────────────
const DENKHANDLUNG_RANG: Record<string, number> = {
  erkennen_wiedergeben: 1,
  zuordnen_klassifizieren: 2,
  erklaeren_erlaeutern: 3,
  strukturieren_darstellen: 4,
  anwenden_uebertragen: 5,
  analysieren_untersuchen: 6,
  bewerten_beurteilen: 7,
  produzieren_gestalten: 8,
}

// ── Engine → Schwierigkeitsgewicht ───────────────────────────────────────────
const ENGINE_RANG: Record<string, number> = {
  wissensabruf: 1,
  zuordnung_ordnung: 2,
  prozess_ablauf: 3,
  erklaerung_zusammenhang: 4,
  modell_darstellung: 5,
  anwendung_fall: 6,
  fehlerbasiert: 7,
  sprach_produktion: 8,
  argumentation_urteil: 9,
  reflexion_strategie: 10,
}

export interface SortableModule {
  game_id: string
  komplexitaetsstufe?: number | null
  denkhandlungen?: string[] | null
  game_engine?: string | null
}

// Niedrigste Denkhandlung im Modul zählt — die Aufgabe ist nur so leicht wie
// ihre einfachste Denkhandlung. Wir gewichten den Mittelwert leicht mit ein,
// damit ein Modul mit zwei schweren Handlungen vor einem mit einer schweren rückt.
function denkhandlungScore(denkhandlungen?: string[] | null): number {
  if (!denkhandlungen || denkhandlungen.length === 0) return 4
  const ranks = denkhandlungen.map((d) => DENKHANDLUNG_RANG[d] ?? 4)
  const min = Math.min(...ranks)
  const avg = ranks.reduce((s, r) => s + r, 0) / ranks.length
  return min + (avg - min) * 0.3
}

function engineScore(engine?: string | null): number {
  return engine ? ENGINE_RANG[engine] ?? 5 : 5
}

function komplexitaetScore(stufe?: number | null): number {
  return typeof stufe === 'number' && stufe >= 1 && stufe <= 7 ? stufe : 4
}

// Hauptscore: gewichtete Summe. Komplexität dominiert, Denkhandlung verfeinert,
// Engine bricht Gleichstand.
function totalScore(m: SortableModule): number {
  return (
    komplexitaetScore(m.komplexitaetsstufe) * 10 +
    denkhandlungScore(m.denkhandlungen) * 2 +
    engineScore(m.game_engine) * 0.5
  )
}

export function sortiereModule<T extends SortableModule>(module: T[]): T[] {
  return [...module].sort((a, b) => {
    const diff = totalScore(a) - totalScore(b)
    if (diff !== 0) return diff
    // Tiebreaker: deterministisch, damit gleiche Inputs gleiche Outputs liefern
    return a.game_id.localeCompare(b.game_id)
  })
}

// ── Niveau-Verteilung über N Modul-Positionen ────────────────────────────────
// Module 1..N werden linear von leichter bis sehr_schwer verteilt.
// N=1 → ['mittel']; N=2 → ['leichter','mittel']; usw.
const NIVEAU_SKALA: Differenzierungsniveau[] = ['leichter', 'mittel', 'schwer', 'sehr_schwer']

export function niveauFuerPosition(position: number, total: number): Differenzierungsniveau {
  if (total <= 0) return 'mittel'
  if (total === 1) return 'mittel'
  if (total === 2) return position === 0 ? 'leichter' : 'mittel'
  if (total === 3) return (['leichter', 'mittel', 'schwer'] as const)[position] ?? 'mittel'

  // Für N >= 4 linear über die 4-stufige Skala verteilen
  const idx = Math.round((position / (total - 1)) * (NIVEAU_SKALA.length - 1))
  return NIVEAU_SKALA[Math.min(Math.max(idx, 0), NIVEAU_SKALA.length - 1)]
}

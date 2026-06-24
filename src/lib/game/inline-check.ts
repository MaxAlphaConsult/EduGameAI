import type { InlineCheck } from '@/types'

// Reine, deterministische Auswertung der Tier-1-Inline-Checks (Block D).
// Kein React, kein Zufall → in inline-check.test.ts testbar.

const norm = (s: string) => s.toLowerCase().trim()
const stripPunct = (s: string) => s.replace(/[.,;:!?()[\]„""'»«]/g, '')

// --- Quiz (single/multiple choice) ---
export function pruefeQuiz(check: InlineCheck, gewaehlt: string[]): boolean {
  const soll = check.loesungen.map(norm)
  const ist = gewaehlt.map(norm)
  return soll.length === ist.length && soll.every((l) => ist.includes(l))
}

// --- Lückentext ---
// Splittet den Satz an Lücken (3+ Unterstriche). N Lücken → N+1 Textstücke.
export function lueckenStuecke(text: string): string[] {
  return text.split(/_{3,}/)
}
export function lueckenAnzahl(text: string): number {
  return Math.max(0, lueckenStuecke(text).length - 1)
}
export function pruefeLueckentext(check: InlineCheck, eingaben: string[]): boolean {
  if (eingaben.length !== check.loesungen.length) return false
  return check.loesungen.every((l, i) => norm(l) === norm(eingaben[i] ?? ''))
}

// --- Zuordnen ---
export interface ZuordnenPaar { links: string; rechts: string }
export function parsePaare(loesungen: string[]): ZuordnenPaar[] {
  return loesungen
    .map((l) => {
      const idx = l.indexOf('→')
      if (idx === -1) return null
      return { links: l.slice(0, idx).trim(), rechts: l.slice(idx + 1).trim() }
    })
    .filter((p): p is ZuordnenPaar => p !== null && p.links !== '' && p.rechts !== '')
}
export function pruefeZuordnen(check: InlineCheck, zuordnung: Record<string, string>): boolean {
  const paare = parsePaare(check.loesungen)
  return paare.length > 0 && paare.every((p) => norm(zuordnung[p.links] ?? '') === norm(p.rechts))
}

// --- Im Text unterstreichen ---
// Korrekt zu markieren sind alle Wörter, die in einer Lösung vorkommen.
export function korrekteMarkierWoerter(check: InlineCheck): Set<string> {
  return new Set(
    check.loesungen.flatMap((l) => l.split(/\s+/).map((w) => stripPunct(norm(w)))).filter(Boolean),
  )
}
export function pruefeUnterstreichen(check: InlineCheck, gewaehlteWoerter: string[]): boolean {
  const soll = korrekteMarkierWoerter(check)
  const ist = new Set(gewaehlteWoerter.map((w) => stripPunct(norm(w))).filter(Boolean))
  if (soll.size === 0 || soll.size !== ist.size) return false
  for (const w of soll) if (!ist.has(w)) return false
  return true
}

// Wort-Token eines Markier-Textes als korrekt einstufen?
export function istMarkierWortKorrekt(check: InlineCheck, wort: string): boolean {
  return korrekteMarkierWoerter(check).has(stripPunct(norm(wort)))
}

// --- Schaubild: SVG sanitisieren (Defense-in-Depth) ---
// Das Diagramm wird bevorzugt als Mermaid erzeugt (sicher gerendert). Für den
// SVG-Fallback wird der String vor dem Einbetten von aktiven Inhalten befreit:
// <script>/<foreignObject>, on*-Eventhandler und javascript:-URLs.
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

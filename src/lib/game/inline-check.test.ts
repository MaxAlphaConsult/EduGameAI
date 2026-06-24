import { describe, it, expect } from 'vitest'
import {
  pruefeQuiz, pruefeLueckentext, pruefeZuordnen, pruefeUnterstreichen,
  parsePaare, lueckenAnzahl, korrekteMarkierWoerter, sanitizeSvg,
} from './inline-check'
import type { InlineCheck } from '@/types'

function check(partial: Partial<InlineCheck>): InlineCheck {
  return {
    check_id: 'C1', typ: 'quiz', frage: 'f', quiz_format: 'single_choice', text: null, schaubild: null,
    loesungen: [], distraktoren: [], hilfen: [], abschnitt_ref: 'A1',
    teilkompetenz: 'tk', komplexitaetsstufe: 2, ...partial,
  }
}

describe('pruefeQuiz', () => {
  it('single choice: exakt die richtige Antwort', () => {
    const c = check({ loesungen: ['Mitochondrien'] })
    expect(pruefeQuiz(c, ['mitochondrien'])).toBe(true) // case-insensitiv
    expect(pruefeQuiz(c, ['Chloroplasten'])).toBe(false)
    expect(pruefeQuiz(c, [])).toBe(false)
  })
  it('multiple choice: Menge muss exakt stimmen', () => {
    const c = check({ quiz_format: 'multiple_choice', loesungen: ['A', 'B'] })
    expect(pruefeQuiz(c, ['B', 'A'])).toBe(true) // Reihenfolge egal
    expect(pruefeQuiz(c, ['A'])).toBe(false) // unvollständig
    expect(pruefeQuiz(c, ['A', 'B', 'C'])).toBe(false) // zu viel
  })
})

describe('pruefeLueckentext', () => {
  const c = check({ typ: 'lueckentext', quiz_format: null, text: 'Die ___ liefert ___.', loesungen: ['Zellatmung', 'Energie'] })
  it('zählt Lücken korrekt', () => expect(lueckenAnzahl(c.text!)).toBe(2))
  it('akzeptiert korrekte Reihenfolge (case-insensitiv)', () => {
    expect(pruefeLueckentext(c, ['zellatmung', 'energie'])).toBe(true)
  })
  it('lehnt falsche Reihenfolge/Inhalt ab', () => {
    expect(pruefeLueckentext(c, ['Energie', 'Zellatmung'])).toBe(false)
    expect(pruefeLueckentext(c, ['Zellatmung'])).toBe(false)
  })
})

describe('parsePaare / pruefeZuordnen', () => {
  const c = check({ typ: 'zuordnen', quiz_format: null, loesungen: ['Herz → pumpt Blut', 'Lunge → Gasaustausch'] })
  it('parst Paare am Pfeil', () => {
    expect(parsePaare(c.loesungen)).toEqual([
      { links: 'Herz', rechts: 'pumpt Blut' },
      { links: 'Lunge', rechts: 'Gasaustausch' },
    ])
  })
  it('akzeptiert vollständig korrekte Zuordnung', () => {
    expect(pruefeZuordnen(c, { Herz: 'pumpt Blut', Lunge: 'Gasaustausch' })).toBe(true)
  })
  it('lehnt eine falsche Zuordnung ab', () => {
    expect(pruefeZuordnen(c, { Herz: 'Gasaustausch', Lunge: 'pumpt Blut' })).toBe(false)
  })
})

describe('pruefeUnterstreichen', () => {
  const c = check({ typ: 'unterstreichen', quiz_format: null, text: 'Das Herz pumpt das Blut durch den Körper.', loesungen: ['Herz', 'Blut'] })
  it('leitet die korrekten Wörter ab', () => {
    expect(korrekteMarkierWoerter(c)).toEqual(new Set(['herz', 'blut']))
  })
  it('akzeptiert exakt die richtigen Markierungen (Satzzeichen ignoriert)', () => {
    expect(pruefeUnterstreichen(c, ['Herz', 'Blut'])).toBe(true)
    expect(pruefeUnterstreichen(c, ['herz', 'blut.'])).toBe(true)
  })
  it('lehnt zu viele/zu wenige Markierungen ab', () => {
    expect(pruefeUnterstreichen(c, ['Herz'])).toBe(false)
    expect(pruefeUnterstreichen(c, ['Herz', 'Blut', 'Körper'])).toBe(false)
  })
})

describe('sanitizeSvg', () => {
  it('entfernt <script>, Eventhandler und javascript:-URLs', () => {
    const dreckig = `<svg onload="alert(1)"><script>alert(2)</script><a href="javascript:evil()">x</a><rect onclick='hack()' width="10"/></svg>`
    const sauber = sanitizeSvg(dreckig)
    expect(sauber).not.toMatch(/<script/i)
    expect(sauber).not.toMatch(/onload=/i)
    expect(sauber).not.toMatch(/onclick=/i)
    expect(sauber).not.toMatch(/javascript:/i)
  })
  it('behält harmloses SVG-Markup', () => {
    const ok = '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="blue"/></svg>'
    expect(sanitizeSvg(ok)).toContain('<rect')
    expect(sanitizeSvg(ok)).toContain('fill="blue"')
  })
})

import { describe, it, expect } from 'vitest'
import { applyGrounding } from './grounding'
import type { GroundingCheckOutput } from '../schemas/pipeline'

const aufgaben = [
  { aufgabe_id: 'Q1', text: 'a' },
  { aufgabe_id: 'Q2', text: 'b' },
  { aufgabe_id: 'Q3', text: 'c' },
]

function check(parts: GroundingCheckOutput['bewertungen']): GroundingCheckOutput {
  return { bewertungen: parts, zusammenfassung: 'Test' }
}

describe('applyGrounding', () => {
  it('behält alle Aufgaben, wenn alles gegründet ist (status ok)', () => {
    const c = check(aufgaben.map((a) => ({
      aufgabe_id: a.aufgabe_id, gegruendet: true, problematische_elemente: [], problem: null, beleg_abschnitt_ref: 'A1',
    })))
    const { aufgaben: out, report } = applyGrounding(aufgaben, c)
    expect(out).toHaveLength(3)
    expect(report.status).toBe('ok')
    expect(report.verworfen).toBe(0)
    expect(report.markiert).toBe(0)
  })

  it('verwirft eine nicht gegründete Aufgabe und meldet status problem', () => {
    const c = check([
      { aufgabe_id: 'Q1', gegruendet: true, problematische_elemente: [], problem: null, beleg_abschnitt_ref: 'A1' },
      { aufgabe_id: 'Q2', gegruendet: false, problematische_elemente: ['hilfe'], problem: 'Hinweis nennt Material-fremde Zahl', beleg_abschnitt_ref: null },
      { aufgabe_id: 'Q3', gegruendet: true, problematische_elemente: [], problem: null, beleg_abschnitt_ref: 'A2' },
    ])
    const { aufgaben: out, report } = applyGrounding(aufgaben, c)
    expect(out.map((a) => a.aufgabe_id)).toEqual(['Q1', 'Q3'])
    expect(report.status).toBe('problem')
    expect(report.verworfen).toBe(1)
    expect(report.hinweise[0]).toMatchObject({ aufgabe_id: 'Q2', verworfen: true, elemente: ['hilfe'] })
  })

  it('markiert statt verwirft, wenn sonst zu wenig bliebe (minKeep)', () => {
    // Alle drei ungegründet → dürfen nicht alle weg; bei minKeep=1 bleibt alles erhalten, nur markiert.
    const c = check(aufgaben.map((a) => ({
      aufgabe_id: a.aufgabe_id, gegruendet: false, problematische_elemente: ['loesung'], problem: 'nicht belegt', beleg_abschnitt_ref: null,
    })))
    const { aufgaben: out, report } = applyGrounding(aufgaben, c, 1)
    expect(out).toHaveLength(3) // nichts verworfen
    expect(report.verworfen).toBe(0)
    expect(report.markiert).toBe(3)
    expect(report.status).toBe('warnung')
  })

  it('behält Aufgaben ohne Verdikt (konservativ)', () => {
    const c = check([
      { aufgabe_id: 'Q1', gegruendet: false, problematische_elemente: ['frage'], problem: 'x', beleg_abschnitt_ref: null },
    ])
    // Q2/Q3 haben kein Verdikt → gelten als gegründet, bleiben.
    const { aufgaben: out } = applyGrounding(aufgaben, c)
    expect(out.map((a) => a.aufgabe_id)).toEqual(['Q2', 'Q3'])
  })

  it('zählt geprüft korrekt', () => {
    const c = check([{ aufgabe_id: 'Q1', gegruendet: true, problematische_elemente: [], problem: null, beleg_abschnitt_ref: 'A1' }])
    const { report } = applyGrounding(aufgaben, c)
    expect(report.geprueft).toBe(3)
  })
})

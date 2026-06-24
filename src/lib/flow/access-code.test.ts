import { describe, it, expect } from 'vitest'
import { generateAccessCode, normalizeAccessCode, ACCESS_CODE_LENGTH } from './access-code'

describe('generateAccessCode', () => {
  it('liefert genau 8 Ziffern', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode()
      expect(code).toMatch(/^[0-9]{8}$/)
      expect(code).toHaveLength(ACCESS_CODE_LENGTH)
    }
  })

  it('enthält keine personenbezogenen/sprechenden Anteile (rein numerisch)', () => {
    // Datensparsamkeit: kein Thema/Klassenname mehr im Code.
    expect(generateAccessCode()).not.toMatch(/[A-Za-z-]/)
  })

  it('nutzt den vollen Ziffernraum (kein offensichtlicher Bias)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      for (const ch of generateAccessCode()) seen.add(ch)
    }
    // Über 4000 Ziffern müssen alle 10 Werte vorkommen.
    expect(seen).toEqual(new Set('0123456789'.split('')))
  })

  it('kollidiert in der Praxis selten (Zufälligkeit)', () => {
    const codes = new Set<string>()
    const N = 2000
    for (let i = 0; i < N; i++) codes.add(generateAccessCode())
    // Bei 10^8 Raum erwarten wir nahezu keine Kollisionen unter 2000 Codes.
    expect(codes.size).toBeGreaterThan(N - 5)
  })
})

describe('normalizeAccessCode', () => {
  it('entfernt Leerzeichen, Bindestriche und sonstige Zeichen', () => {
    expect(normalizeAccessCode('1234 5678')).toBe('12345678')
    expect(normalizeAccessCode('1234-5678')).toBe('12345678')
    expect(normalizeAccessCode(' ab12cd34 ')).toBe('1234')
  })

  it('kürzt auf maximal 8 Ziffern', () => {
    expect(normalizeAccessCode('123456789012')).toBe('12345678')
  })

  it('ist robust gegen leere/ungültige Eingaben', () => {
    expect(normalizeAccessCode('')).toBe('')
    // @ts-expect-error – Laufzeit-Robustheit gegen null
    expect(normalizeAccessCode(null)).toBe('')
  })
})

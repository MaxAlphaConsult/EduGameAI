import { describe, expect, it } from 'vitest'
import { istUuid } from './ids'

describe('istUuid', () => {
  it('nimmt eine UUID an, auch in Großbuchstaben', () => {
    expect(istUuid('3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b')).toBe(true)
    expect(istUuid('3F2B8C1E-9A4D-4E2F-8B7A-1C2D3E4F5A6B')).toBe(true)
  })

  it.each([
    ['leer', ''],
    ['Zugangscode statt ID', '12345678'],
    ['PostgREST-Parameter angehängt', '3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b&select=code'],
    ['Zahl', 42],
    ['undefined', undefined],
  ])('weist ab: %s', (_name, wert) => {
    expect(istUuid(wert)).toBe(false)
  })
})

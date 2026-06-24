import { describe, it, expect } from 'vitest'
import { config, RATE_LIMITED } from './proxy'

// Sicherheitsnetz: Das Rate-Limiting ist zentral im Proxy gebündelt. Wenn der
// Matcher je so umgebaut wird, dass die Schüler-Endpoints nicht mehr abgedeckt
// sind, fiele die Drosselung still aus (genau die Falle, vor der die Next-Doku
// warnt). Dieser Test schlägt dann an.
describe('Proxy-Abdeckung der Schüler-Endpoints', () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`)

  it('kennt beide ratenlimitierten Schüler-Endpoints', () => {
    expect(Object.keys(RATE_LIMITED).sort()).toEqual([
      '/api/student/lookup',
      '/api/student/start-session',
    ])
  })

  it('der Proxy-Matcher erfasst die ratenlimitierten Pfade', () => {
    for (const path of Object.keys(RATE_LIMITED)) {
      expect(matcher.test(path), `Matcher muss ${path} erfassen`).toBe(true)
    }
  })

  it('erfasst geschützte Dashboard-Routen, aber keine statischen Assets', () => {
    expect(matcher.test('/dashboard')).toBe(true)
    expect(matcher.test('/_next/static/chunks/main.js')).toBe(false)
    expect(matcher.test('/logo.png')).toBe(false)
  })
})

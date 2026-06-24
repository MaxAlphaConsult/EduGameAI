import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit (In-Memory-Fallback)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('erlaubt bis zum Limit und blockt danach', () => {
    const key = `test-block-${Math.random()}`
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true)
    }
    const blocked = rateLimit(key, 5, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })

  it('setzt nach Ablauf des Fensters zurück', () => {
    const key = `test-reset-${Math.random()}`
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000)
    expect(rateLimit(key, 5, 60_000).ok).toBe(false)

    // Fenster verstreichen lassen.
    vi.setSystemTime(1_000_000 + 60_001)
    expect(rateLimit(key, 5, 60_000).ok).toBe(true)
  })

  it('behandelt verschiedene Keys unabhängig', () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`
    for (let i = 0; i < 5; i++) rateLimit(a, 5, 60_000)
    expect(rateLimit(a, 5, 60_000).ok).toBe(false)
    // b hat ein eigenes Kontingent.
    expect(rateLimit(b, 5, 60_000).ok).toBe(true)
  })
})

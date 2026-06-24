import { describe, it, expect } from 'vitest'
import { generateStudentCodes } from './student-code'

describe('generateStudentCodes', () => {
  it('hat das Format TIERNAME-<6 Ziffern>', () => {
    for (const code of generateStudentCodes(30)) {
      expect(code).toMatch(/^[A-ZÄÖÜ]+-\d{6}$/)
    }
  })

  it('liefert die gewünschte Anzahl, alle eindeutig', () => {
    const codes = generateStudentCodes(40)
    expect(codes).toHaveLength(40)
    expect(new Set(codes).size).toBe(40)
  })

  it('streut über viele Codes ohne nennenswerte Kollisionen', () => {
    const codes = generateStudentCodes(200)
    expect(new Set(codes).size).toBe(200)
  })
})

'use client'

import { BausteinRunner, type ModulErgebnis } from './shared/BausteinRunner'
import type { Aufgabe, BausteinInhalt, BausteinTyp } from '@/types'

// Renderer für Diagnose-Bausteine (vorwissen_check, post_check): kurzer,
// unbenoteter Aufgaben-Satz. Erfasst die Antwort, bleibt aber neutral —
// kein Test-Druck, kein „richtig/falsch"-Urteil.
interface Props {
  moduleSessionId: string
  titel: string
  bausteinTyp: BausteinTyp
  bausteinInhalt: BausteinInhalt | null
  aufgaben: Aufgabe[]
  preview?: boolean
  onModulFertig: (ergebnis: ModulErgebnis) => void
}

export function CheckBaustein({ moduleSessionId, titel, bausteinTyp, bausteinInhalt, aufgaben, preview, onModulFertig }: Props) {
  return (
    <BausteinRunner
      moduleSessionId={moduleSessionId}
      titel={titel}
      inhalt={bausteinInhalt}
      aufgaben={aufgaben}
      modus="check"
      preview={preview}
      onModulFertig={onModulFertig}
      startLabel="Los geht's"
      intro={bausteinTyp === 'post_check' ? 'Abschluss-Check' : 'Was weißt du schon?'}
    />
  )
}

'use client'

import { BausteinRunner, type ModulErgebnis } from './shared/BausteinRunner'
import { LernEinheitRunner } from './LernEinheitRunner'
import type { Aufgabe, BausteinInhalt, BausteinTyp } from '@/types'

// Renderer für vermittelnde Bausteine (einstieg, input, erarbeitung, sicherung,
// transfer): Erklärtext + Kernaussagen, dann eine Mini-Verständnisfrage mit
// richtig/falsch-Feedback.
interface Props {
  moduleSessionId: string
  titel: string
  bausteinTyp: BausteinTyp
  bausteinInhalt: BausteinInhalt | null
  aufgaben: Aufgabe[]
  preview?: boolean
  onModulFertig: (ergebnis: ModulErgebnis) => void
}

const INTRO: Partial<Record<BausteinTyp, string>> = {
  einstieg: 'Zum Einstieg',
  input: 'Neuer Lerninhalt',
  erarbeitung: 'Jetzt anwenden',
  sicherung: 'Zusammengefasst',
  transfer: 'Weitergedacht',
}

export function ErklaerBaustein({ moduleSessionId, titel, bausteinTyp, bausteinInhalt, aufgaben, preview, onModulFertig }: Props) {
  // Block D: Neue Bausteine tragen eine interleaved Segment-Sequenz → InteractiveRunner.
  if (bausteinInhalt?.segmente && bausteinInhalt.segmente.length > 0) {
    return (
      <LernEinheitRunner
        moduleSessionId={moduleSessionId}
        titel={titel}
        inhalt={bausteinInhalt}
        intro={INTRO[bausteinTyp]}
        preview={preview}
        onModulFertig={onModulFertig}
      />
    )
  }
  // Alt-Bausteine (Erklärtext am Stück + getrennte Aufgaben) → bestehender Runner.
  return (
    <BausteinRunner
      moduleSessionId={moduleSessionId}
      titel={titel}
      inhalt={bausteinInhalt}
      aufgaben={aufgaben}
      modus="erklaer"
      preview={preview}
      onModulFertig={onModulFertig}
      startLabel="Verstanden — kurze Frage"
      intro={INTRO[bausteinTyp]}
    />
  )
}

'use client'

import { GameEngine } from './GameEngine'
import { ErklaerBaustein } from './ErklaerBaustein'
import { CheckBaustein } from './CheckBaustein'
import type { ModulErgebnis } from './shared/BausteinRunner'
import type { Aufgabe, BausteinInhalt, BausteinTyp } from '@/types'

const CHECK_TYPEN: BausteinTyp[] = ['vorwissen_check', 'post_check']

export interface BausteinViewProps {
  moduleSessionId: string
  titel: string
  gameSkin: string
  niveau: string
  aufgaben: Aufgabe[]
  bausteinTyp: BausteinTyp
  bausteinInhalt: BausteinInhalt | null
  preview?: boolean
  onModulFertig: (ergebnis: ModulErgebnis) => void
}

// Rendert ein Modul je nach Baustein-Typ: Spiel → GameEngine,
// Vorwissen/Post-Check → CheckBaustein, sonst Erklär-Baustein.
export function BausteinView(props: BausteinViewProps) {
  const { moduleSessionId, titel, gameSkin, niveau, aufgaben, bausteinTyp, bausteinInhalt, preview, onModulFertig } = props

  if (bausteinTyp === 'spiel') {
    return (
      <GameEngine
        moduleSessionId={moduleSessionId}
        aufgaben={aufgaben as Parameters<typeof GameEngine>[0]['aufgaben']}
        niveau={niveau}
        gameSkin={gameSkin}
        modulTitel={titel}
        onModulFertig={onModulFertig}
        preview={preview}
      />
    )
  }

  if (CHECK_TYPEN.includes(bausteinTyp)) {
    return (
      <CheckBaustein
        moduleSessionId={moduleSessionId}
        titel={titel}
        bausteinTyp={bausteinTyp}
        bausteinInhalt={bausteinInhalt}
        aufgaben={aufgaben}
        preview={preview}
        onModulFertig={onModulFertig}
      />
    )
  }

  return (
    <ErklaerBaustein
      moduleSessionId={moduleSessionId}
      titel={titel}
      bausteinTyp={bausteinTyp}
      bausteinInhalt={bausteinInhalt}
      aufgaben={aufgaben}
      preview={preview}
      onModulFertig={onModulFertig}
    />
  )
}

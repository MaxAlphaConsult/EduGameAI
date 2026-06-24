'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BausteinView } from '@/components/game/BausteinView'
import type { Aufgabe, BausteinTyp, BausteinInhalt } from '@/types'

interface ModulErgebnis {
  korrekt: number
  gesamt: number
  kannGut: string[]
  nochUeben: string[]
}

export interface PreviewModul {
  id: string
  titel: string
  gameSkin: string
  aufgaben: Aufgabe[]
  bausteinTyp: BausteinTyp
  bausteinInhalt: BausteinInhalt | null
}

interface Props {
  flowId: string
  flowTitel: string
  module: PreviewModul[]
}

type Phase = 'spielt' | 'uebergang' | 'fertig'

export function FlowPreviewClient({ flowId, flowTitel, module }: Props) {
  const [position, setPosition] = useState(0)
  const [phase, setPhase] = useState<Phase>('spielt')
  const [ergebnisse, setErgebnisse] = useState<ModulErgebnis[]>([])
  const [letztesErgebnis, setLetztesErgebnis] = useState<ModulErgebnis | null>(null)
  const [runKey, setRunKey] = useState(0) // remountet GameEngine bei „Nochmal von vorn"

  const aktuellesModul = module[position]
  const gesamtAufgaben = ergebnisse.reduce((sum, e) => sum + e.gesamt, 0)
  const gesamtKorrekt = ergebnisse.reduce((sum, e) => sum + e.korrekt, 0)

  function handleModulFertig(ergebnis: ModulErgebnis) {
    setLetztesErgebnis(ergebnis)
    setErgebnisse((prev) => [...prev, ergebnis])
    setPhase('uebergang')
  }

  function handleWeiter() {
    const naechste = position + 1
    if (naechste >= module.length) {
      setPhase('fertig')
      return
    }
    setPosition(naechste)
    setPhase('spielt')
    setLetztesErgebnis(null)
    setRunKey((k) => k + 1)
  }

  function handleNochmal() {
    setPosition(0)
    setPhase('spielt')
    setErgebnisse([])
    setLetztesErgebnis(null)
    setRunKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F6F1FF' }}>
      {/* Vorschau-Banner */}
      <div className="sticky top-0 z-20" style={{
        background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
        borderBottom: '1px solid #FDE68A',
      }}>
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <span className="text-lg">👁️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#92400E' }}>
              Vorschau: „{flowTitel}" — kompletter Durchlauf
            </p>
            <p className="text-xs" style={{ color: '#B45309' }}>
              Du spielst alle {module.length} Bausteine wie ein Schüler. Antworten fließen NICHT in die Diagnostik.
            </p>
          </div>
          <Link href="/spiele"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: '#FFFFFF', color: '#92400E', border: '1px solid #FDE68A', textDecoration: 'none' }}>
            ✕ Beenden
          </Link>
        </div>
      </div>

      {/* Spielt — aktuelles Modul rendern */}
      {phase === 'spielt' && aktuellesModul && (
        <>
          <div className="border-b bg-white/60 px-4 py-3">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{ color: '#7A6A94' }}>
                  Spiel {position + 1} von {module.length}
                </span>
                <span className="text-xs truncate ml-3 max-w-[60%]" style={{ color: '#7A6A94' }} title={aktuellesModul.titel}>
                  {aktuellesModul.titel}
                </span>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#E9D5FF' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(position / module.length) * 100}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }} />
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-6">
            <div key={`${aktuellesModul.id}-${runKey}`}>
              <BausteinView
                moduleSessionId="preview"
                titel={aktuellesModul.titel}
                gameSkin={aktuellesModul.gameSkin}
                niveau="standard"
                aufgaben={aktuellesModul.aufgaben}
                bausteinTyp={aktuellesModul.bausteinTyp}
                bausteinInhalt={aktuellesModul.bausteinInhalt}
                onModulFertig={handleModulFertig}
                preview
              />
            </div>
          </div>
        </>
      )}

      {/* Übergang zwischen Modulen */}
      {phase === 'uebergang' && letztesErgebnis && (
        <ModulUebergang
          ergebnis={letztesErgebnis}
          position={position + 1}
          gesamt={module.length}
          istLetztes={position + 1 >= module.length}
          onWeiter={handleWeiter}
        />
      )}

      {/* Abschluss-Bildschirm */}
      {phase === 'fertig' && (
        <FertigScreen
          flowId={flowId}
          flowTitel={flowTitel}
          gesamtKorrekt={gesamtKorrekt}
          gesamtAufgaben={gesamtAufgaben}
          anzahlModule={module.length}
          onNochmal={handleNochmal}
        />
      )}
    </div>
  )
}

function ModulUebergang({
  ergebnis, position, gesamt, istLetztes, onWeiter,
}: {
  ergebnis: ModulErgebnis
  position: number
  gesamt: number
  istLetztes: boolean
  onWeiter: () => void
}) {
  const prozent = ergebnis.gesamt > 0 ? Math.round((ergebnis.korrekt / ergebnis.gesamt) * 100) : 0
  const emoji = prozent >= 80 ? '🌟' : prozent >= 50 ? '💪' : '📚'
  const message = prozent >= 80
    ? 'Super! Auf zur nächsten Aufgabe.'
    : prozent >= 50
      ? 'Solide. Du machst Fortschritte.'
      : 'Das war noch knifflig — bleib dran.'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A6A94' }}>
          Spiel {position} von {gesamt} geschafft
        </p>
        <h2 className="text-2xl font-bold" style={{ color: '#1F1235' }}>
          {ergebnis.korrekt} von {ergebnis.gesamt} richtig
        </h2>
        <p className="text-sm mt-1" style={{ color: '#7A6A94' }}>{message}</p>
      </div>

      {(ergebnis.kannGut.length > 0 || ergebnis.nochUeben.length > 0) && (
        <div className="w-full max-w-md text-left flex flex-col gap-3">
          {ergebnis.kannGut.length > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#065F46' }}>Das sitzt schon</p>
              <ul className="flex flex-wrap gap-1.5">
                {ergebnis.kannGut.map((tk) => (
                  <li key={tk} className="text-xs rounded-full px-2.5 py-1"
                    style={{ background: 'white', border: '1px solid #A7F3D0', color: '#065F46' }}>{tk}</li>
                ))}
              </ul>
            </div>
          )}
          {ergebnis.nochUeben.length > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#92400E' }}>Da gibts noch was zu üben</p>
              <ul className="flex flex-wrap gap-1.5">
                {ergebnis.nochUeben.map((tk) => (
                  <li key={tk} className="text-xs rounded-full px-2.5 py-1"
                    style={{ background: 'white', border: '1px solid #FDE68A', color: '#92400E' }}>{tk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onWeiter}
        className="w-full max-w-md py-3.5 rounded-xl font-bold text-base text-white transition-opacity"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', border: 'none', cursor: 'pointer' }}
      >
        {istLetztes ? 'Lernreise abschließen →' : 'Weiter zum nächsten Spiel →'}
      </button>
    </div>
  )
}

function FertigScreen({
  flowId, flowTitel, gesamtKorrekt, gesamtAufgaben, anzahlModule, onNochmal,
}: {
  flowId: string
  flowTitel: string
  gesamtKorrekt: number
  gesamtAufgaben: number
  anzahlModule: number
  onNochmal: () => void
}) {
  const prozent = gesamtAufgaben > 0 ? Math.round((gesamtKorrekt / gesamtAufgaben) * 100) : 0
  const emoji = prozent >= 80 ? '🌟' : prozent >= 50 ? '💪' : '📚'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">{emoji}</div>
      <div>
        <h1 className="text-3xl font-black mb-1" style={{ color: '#1F1235' }}>Geschafft!</h1>
        <p className="text-base" style={{ color: '#7A6A94' }}>
          Du hast alle {anzahlModule} Spiele von „{flowTitel}" abgeschlossen.
        </p>
      </div>
      <div className="rounded-2xl px-6 py-4" style={{ background: '#F6F1FF', border: '1px solid #C4B5FD' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#5B21B6' }}>Dein Gesamtergebnis</p>
        <p className="text-2xl font-black" style={{ color: '#1F1235' }}>{gesamtKorrekt} von {gesamtAufgaben} Aufgaben richtig</p>
        <p className="text-sm mt-1" style={{ color: '#5B21B6' }}>{prozent}% der Aufgaben gelöst</p>
      </div>
      <p className="text-sm max-w-md" style={{ color: '#7A6A94' }}>
        So sieht ein Schüler die Abschluss-Übersicht — die echten Diagnose-Auswertungen findest du dann unter Klassen.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={onNochmal}
          className="text-sm font-bold px-5 py-3 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: 'white', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
          }}>
          🔄 Nochmal von vorn
        </button>
        <Link href={`/spiele`}
          className="text-sm font-bold px-5 py-3 rounded-2xl"
          style={{ background: '#FFFFFF', color: '#1F1235', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
          ← Zurück zu den LernFlows
        </Link>
      </div>
      <p className="text-xs" style={{ color: '#C4B5FD' }}>Flow-ID: {flowId}</p>
    </div>
  )
}

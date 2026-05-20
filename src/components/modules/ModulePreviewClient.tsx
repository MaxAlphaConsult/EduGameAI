'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GameEngine } from '@/components/game/GameEngine'

interface Aufgabe {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren?: string[]
  hilfen?: string[]
  teilkompetenz?: string
}

interface ModulErgebnis {
  korrekt: number
  gesamt: number
  kannGut: string[]
  nochUeben: string[]
}

interface Props {
  modulId: string
  titel: string
  gameSkin: string
  aufgaben: Aufgabe[]
}

export function ModulePreviewClient({ modulId, titel, gameSkin, aufgaben }: Props) {
  const [ergebnis, setErgebnis] = useState<ModulErgebnis | null>(null)
  const [runKey, setRunKey] = useState(0) // erlaubt Neustart durch Remount

  function onNochmal() {
    setErgebnis(null)
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
              Vorschau: „{titel}"
            </p>
            <p className="text-xs" style={{ color: '#B45309' }}>
              Du spielst hier wie ein Schüler. Antworten fließen NICHT in die Diagnostik.
            </p>
          </div>
          <Link href={`/modules/${modulId}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: '#FFFFFF', color: '#92400E', border: '1px solid #FDE68A', textDecoration: 'none' }}>
            ✕ Beenden
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {ergebnis ? (
          <div className="rounded-3xl p-8" style={{
            background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
            border: '1px solid #6EE7B7',
          }}>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#065F46' }}>
              🎉 Modul gespielt!
            </h2>
            <p className="text-sm mb-6" style={{ color: '#047857' }}>
              {ergebnis.korrekt} von {ergebnis.gesamt} Aufgaben richtig.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {ergebnis.kannGut.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #6EE7B7' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#059669' }}>
                    Das kannst du schon gut
                  </p>
                  <ul className="text-sm space-y-1" style={{ color: '#065F46' }}>
                    {ergebnis.kannGut.map((k, i) => <li key={i}>· {k}</li>)}
                  </ul>
                </div>
              )}
              {ergebnis.nochUeben.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #FDE68A' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#D97706' }}>
                    Das solltest du noch üben
                  </p>
                  <ul className="text-sm space-y-1" style={{ color: '#92400E' }}>
                    {ergebnis.nochUeben.map((k, i) => <li key={i}>· {k}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={onNochmal}
                className="text-sm font-bold px-5 py-3 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
                }}>
                🔄 Nochmal testen
              </button>
              <Link href={`/modules/${modulId}`}
                className="text-sm font-bold px-5 py-3 rounded-2xl"
                style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', textDecoration: 'none' }}>
                ← Zurück zum Modul
              </Link>
            </div>
          </div>
        ) : (
          <GameEngine
            key={runKey}
            moduleSessionId="preview"
            aufgaben={aufgaben}
            niveau="standard"
            gameSkin={gameSkin}
            onModulFertig={setErgebnis}
            preview
          />
        )}
      </div>
    </div>
  )
}

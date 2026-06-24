'use client'

import { useState } from 'react'
import { LernEinheitRunner } from '@/components/game/LernEinheitRunner'
import type { BausteinInhalt } from '@/types'

// Dev-Harness für die Tier-1-Inline-Checks (Block D): interleaved Lern-Einheit
// mit allen vier Check-Typen, preview=true (keine API-Calls).
const SAMPLE: BausteinInhalt = {
  kernaussagen: ['Mitochondrien sind die Kraftwerke der Zelle.', 'Die Zellatmung liefert Energie (ATP).'],
  segmente: [
    { typ: 'text', markdown: '## Die Zelle\n\nDie **Zelle** ist die kleinste Einheit des Lebens. In ihr arbeiten verschiedene **Organellen** zusammen.' },
    { typ: 'check', check: { check_id: 'C1', typ: 'quiz', frage: 'Welches Organell ist das „Kraftwerk der Zelle"?', quiz_format: 'single_choice', text: null, schaubild: null, loesungen: ['Mitochondrium'], distraktoren: ['Zellkern', 'Ribosom', 'Vakuole'], hilfen: ['Es produziert die Energie der Zelle.'], abschnitt_ref: 'A1', teilkompetenz: 'organellen', komplexitaetsstufe: 2 } },
    { typ: 'text', markdown: 'In den Mitochondrien läuft die **Zellatmung** ab — dabei wird Energie freigesetzt.' },
    { typ: 'check', check: { check_id: 'C2', typ: 'lueckentext', frage: 'Vervollständige den Satz.', quiz_format: null, text: 'Die Zellatmung findet in den ___ statt und liefert ___.', schaubild: null, loesungen: ['Mitochondrien', 'Energie'], distraktoren: ['Chloroplasten', 'Wasser'], hilfen: [], abschnitt_ref: 'A2', teilkompetenz: 'zellatmung', komplexitaetsstufe: 2 } },
    { typ: 'text', markdown: 'Jedes Organell hat eine **eigene Funktion**.' },
    { typ: 'check', check: { check_id: 'C3', typ: 'zuordnen', frage: 'Ordne die Organellen ihren Funktionen zu.', quiz_format: null, text: null, schaubild: null, loesungen: ['Mitochondrium → Energiegewinnung', 'Zellkern → Steuerzentrale', 'Ribosom → Proteinbau'], distraktoren: [], hilfen: [], abschnitt_ref: 'A1', teilkompetenz: 'funktionen', komplexitaetsstufe: 3 } },
    { typ: 'text', markdown: 'Lies den folgenden Satz genau.' },
    { typ: 'check', check: { check_id: 'C4', typ: 'unterstreichen', frage: 'Unterstreiche die beiden Organellen im Satz.', quiz_format: null, text: 'Das Mitochondrium liefert Energie und der Zellkern steuert die Zelle.', schaubild: null, loesungen: ['Mitochondrium', 'Zellkern'], distraktoren: [], hilfen: [], abschnitt_ref: 'A1', teilkompetenz: 'erkennen', komplexitaetsstufe: 2 } },
    { typ: 'text', markdown: 'Schau dir den Ablauf der Zellatmung an.' },
    { typ: 'check', check: { check_id: 'C5', typ: 'schaubild', frage: 'Was liefert die Zellatmung laut Diagramm?', quiz_format: 'single_choice', text: null, schaubild: { format: 'mermaid', quelle: 'flowchart TD; A[Glucose + Sauerstoff] --> B[Mitochondrium]; B --> C[Energie / ATP]' }, loesungen: ['Energie / ATP'], distraktoren: ['Sauerstoff', 'Glucose', 'Wasser'], hilfen: [], abschnitt_ref: 'A2', teilkompetenz: 'zellatmung-diagramm', komplexitaetsstufe: 2 } },
    { typ: 'text', markdown: 'Super — du hast die wichtigsten Organellen kennengelernt! 🎉' },
  ],
}

export default function LernEinheitTestPage() {
  const [erg, setErg] = useState<{ korrekt: number; gesamt: number } | null>(null)
  const [run, setRun] = useState(0)

  if (erg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-5xl">🎯</div>
        <p className="text-2xl font-black">{erg.korrekt} / {erg.gesamt} Checks richtig</p>
        <button onClick={() => { setErg(null); setRun((r) => r + 1) }}
          className="px-6 py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }}>
          Nochmal 🔁
        </button>
      </div>
    )
  }

  return (
    <LernEinheitRunner
      key={run}
      moduleSessionId="test"
      titel="Die Zelle"
      inhalt={SAMPLE}
      intro="Neuer Lerninhalt"
      preview
      onModulFertig={(e) => setErg({ korrekt: e.korrekt, gesamt: e.gesamt })}
    />
  )
}

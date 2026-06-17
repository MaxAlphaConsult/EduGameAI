'use client'

import { useState } from 'react'
import { GameEngine } from '@/components/game/GameEngine'
import { ALL_THEMES } from '@/lib/game/theme'

// Test-Aufgaben pro Spiel. preview=true, also keine API-Calls.
const TEST_AUFGABEN = {
  multiple_choice: {
    titel: 'Wissen testen — Mehrfachauswahl',
    untertitel: 'Zwei Aufgaben mit unterschiedlichen Themen',
    aufgaben: [
      {
        aufgabe_id: 'mc-1',
        text: 'Welcher Zellbestandteil produziert ATP?',
        antwortformat: 'single_choice',
        loesungen: ['Mitochondrium'],
        distraktoren: ['Zellkern', 'Ribosom', 'Vakuole'],
        hilfen: ['Es wird als „Kraftwerk der Zelle" bezeichnet.'],
        teilkompetenz: 'zell-organellen',
      },
      {
        aufgabe_id: 'mc-2',
        text: 'Welche Sätze beschreiben die Mitose korrekt? (Mehrfachauswahl)',
        antwortformat: 'multiple_choice',
        loesungen: ['Sie führt zu zwei identischen Tochterzellen', 'Sie findet in Körperzellen statt'],
        distraktoren: ['Sie reduziert den Chromosomensatz', 'Sie findet nur in Keimzellen statt'],
        hilfen: ['Denk an Zellteilung im Wachstum.'],
        teilkompetenz: 'mitose',
      },
    ],
  },
  hangman: {
    titel: 'Begriff erraten',
    untertitel: 'Tipp einfach auf der Tastatur',
    aufgaben: [
      {
        aufgabe_id: 'hm-1',
        text: 'Welcher Begriff beschreibt die Energiegewinnung in der Zelle?',
        antwortformat: 'hangman',
        loesungen: ['ZELLATMUNG'],
        distraktoren: [],
        hilfen: ['Sauerstoff ist beteiligt.', 'Findet im Mitochondrium statt.'],
        teilkompetenz: 'energie',
      },
    ],
  },
  memory: {
    titel: 'Memory: Begriff & Definition',
    untertitel: 'Decke die passenden Paare auf',
    aufgaben: [
      {
        aufgabe_id: 'mem-1',
        text: 'Ordne die Zellorganellen ihren Funktionen zu',
        antwortformat: 'memory',
        loesungen: [
          'Mitochondrium → Energiegewinnung',
          'Zellkern → Steuerzentrale',
          'Ribosom → Proteinbiosynthese',
          'Vakuole → Speicher',
        ],
        distraktoren: [],
        hilfen: ['Denk an die Hauptaufgabe jedes Organells.'],
        teilkompetenz: 'organellen-funktionen',
      },
    ],
  },
  study_bird: {
    titel: 'Study Bird — schnell antworten',
    untertitel: '12 Fragen — schaffst du min. die Hälfte?',
    aufgaben: [
      { aufgabe_id: 'sb-1', text: 'Welcher Bestandteil enthält das Erbgut?', antwortformat: 'study_bird', loesungen: ['Zellkern'], distraktoren: ['Mitochondrium'], hilfen: [], teilkompetenz: 'zellkern' },
      { aufgabe_id: 'sb-2', text: 'Was produziert ATP?', antwortformat: 'study_bird', loesungen: ['Mitochondrium'], distraktoren: ['Zellkern'], hilfen: [], teilkompetenz: 'energie' },
      { aufgabe_id: 'sb-3', text: 'Wo werden Proteine hergestellt?', antwortformat: 'study_bird', loesungen: ['Ribosom'], distraktoren: ['Vakuole'], hilfen: [], teilkompetenz: 'proteine' },
      { aufgabe_id: 'sb-4', text: 'Welche Organelle speichert Wasser?', antwortformat: 'study_bird', loesungen: ['Vakuole'], distraktoren: ['Ribosom'], hilfen: [], teilkompetenz: 'speicher' },
      { aufgabe_id: 'sb-5', text: 'Welches Organell hat eine eigene DNA?', antwortformat: 'study_bird', loesungen: ['Mitochondrium'], distraktoren: ['Ribosom'], hilfen: [], teilkompetenz: 'dna' },
      { aufgabe_id: 'sb-6', text: 'Was umgibt die Zelle?', antwortformat: 'study_bird', loesungen: ['Zellmembran'], distraktoren: ['Zellwand'], hilfen: [], teilkompetenz: 'membran' },
      { aufgabe_id: 'sb-7', text: 'Wo findet die Fotosynthese statt?', antwortformat: 'study_bird', loesungen: ['Chloroplast'], distraktoren: ['Mitochondrium'], hilfen: [], teilkompetenz: 'fotosynthese' },
      { aufgabe_id: 'sb-8', text: 'Welches Organell baut Zucker ab?', antwortformat: 'study_bird', loesungen: ['Mitochondrium'], distraktoren: ['Zellkern'], hilfen: [], teilkompetenz: 'abbau' },
      { aufgabe_id: 'sb-9', text: 'Wo werden Lipide gespeichert?', antwortformat: 'study_bird', loesungen: ['ER'], distraktoren: ['Ribosom'], hilfen: [], teilkompetenz: 'lipide' },
      { aufgabe_id: 'sb-10', text: 'Was sortiert und verpackt Proteine?', antwortformat: 'study_bird', loesungen: ['Golgi-Apparat'], distraktoren: ['Lysosom'], hilfen: [], teilkompetenz: 'sortierung' },
      { aufgabe_id: 'sb-11', text: 'Welche Organelle verdaut Zellabfall?', antwortformat: 'study_bird', loesungen: ['Lysosom'], distraktoren: ['Vakuole'], hilfen: [], teilkompetenz: 'verdauung' },
      { aufgabe_id: 'sb-12', text: 'Was steuert alle Zellfunktionen?', antwortformat: 'study_bird', loesungen: ['Zellkern'], distraktoren: ['Mitochondrium'], hilfen: [], teilkompetenz: 'steuerung' },
    ],
  },
  boss_fight: {
    titel: 'Boss Battle — der Wissens-Boss',
    untertitel: 'Wähle deine Attacke',
    aufgaben: [
      {
        aufgabe_id: 'bf-1',
        text: 'Welcher Prozess wandelt Lichtenergie in Glucose um?',
        antwortformat: 'boss_fight',
        loesungen: ['Fotosynthese'],
        distraktoren: ['Zellatmung', 'Glykolyse', 'Mitose'],
        hilfen: [],
        teilkompetenz: 'fotosynthese',
      },
    ],
  },
  millionaer: {
    titel: 'Wer wird Millionär — Biologie',
    untertitel: '10 Fragen, aufsteigende Schwierigkeit. Joker einsetzen oder aussteigen.',
    aufgaben: [
      { aufgabe_id: 'm-1', text: 'Welches Organell produziert die meiste Energie der Zelle?', antwortformat: 'millionaer', loesungen: ['Mitochondrium'], distraktoren: ['Zellkern', 'Vakuole', 'Ribosom'], hilfen: ['Es wird auch „Kraftwerk der Zelle" genannt.'], teilkompetenz: 'energie' },
      { aufgabe_id: 'm-2', text: 'Wo wird das Erbgut der Zelle aufbewahrt?', antwortformat: 'millionaer', loesungen: ['Zellkern'], distraktoren: ['Ribosom', 'Mitochondrium', 'Vakuole'], hilfen: ['Das größte Organell in einer tierischen Zelle.'], teilkompetenz: 'erbgut' },
      { aufgabe_id: 'm-3', text: 'An welchem Organell findet die Translation statt?', antwortformat: 'millionaer', loesungen: ['Ribosom'], distraktoren: ['Zellkern', 'Mitochondrium', 'Lysosom'], hilfen: ['Sehr kleine Strukturen — auch frei im Zytoplasma.'], teilkompetenz: 'translation' },
      { aufgabe_id: 'm-4', text: 'Welches Organell besitzt eine eigene DNA?', antwortformat: 'millionaer', loesungen: ['Mitochondrium'], distraktoren: ['Vakuole', 'Ribosom', 'Golgi-Apparat'], hilfen: ['Hinweis auf eine evolutionäre Herkunft.'], teilkompetenz: 'eigene-dna' },
      { aufgabe_id: 'm-5', text: 'Welcher Wissenschaftler stellte die Endosymbiontentheorie auf?', antwortformat: 'millionaer', loesungen: ['Lynn Margulis'], distraktoren: ['Charles Darwin', 'Gregor Mendel', 'James Watson'], hilfen: ['Amerikanische Biologin, 1960er-Jahre.'], teilkompetenz: 'endosymbiose' },
      { aufgabe_id: 'm-6', text: 'In welcher Phase der Mitose werden die Chromosomen zuerst sichtbar?', antwortformat: 'millionaer', loesungen: ['Prophase'], distraktoren: ['Anaphase', 'Telophase', 'Metaphase'], hilfen: ['Erste Phase der eigentlichen Mitose, nach der Interphase.'], teilkompetenz: 'mitose-phasen' },
      { aufgabe_id: 'm-7', text: 'Welches Enzym entwindet die DNA-Doppelhelix während der Replikation?', antwortformat: 'millionaer', loesungen: ['Helicase'], distraktoren: ['Topoisomerase', 'Primase', 'Ligase'], hilfen: ['Trennt die beiden Stränge wie ein Reißverschluss.'], teilkompetenz: 'replikation' },
      { aufgabe_id: 'm-8', text: 'Welche Stickstoffbase kommt in RNA, aber nicht in DNA vor?', antwortformat: 'millionaer', loesungen: ['Uracil'], distraktoren: ['Thymin', 'Cytosin', 'Adenin'], hilfen: ['Ersetzt Thymin.'], teilkompetenz: 'rna-basen' },
      { aufgabe_id: 'm-9', text: 'Welcher Komplex katalysiert die Verknüpfung von Aminosäuren am Ribosom?', antwortformat: 'millionaer', loesungen: ['Peptidyltransferase'], distraktoren: ['DNA-Polymerase', 'Topoisomerase', 'Reverse Transkriptase'], hilfen: ['Teil der großen ribosomalen Untereinheit.'], teilkompetenz: 'peptidbindung' },
      { aufgabe_id: 'm-10', text: 'Welcher Komplex erkennt das Start-Codon AUG in der Translation?', antwortformat: 'millionaer', loesungen: ['Met-tRNA-eIF2-GTP'], distraktoren: ['RNA-Polymerase II', 'Spliceosom', 'Signalpeptid'], hilfen: ['Initiator-tRNA + Initiationsfaktor + GTP.'], teilkompetenz: 'translation-initiation' },
    ],
  },
  swipe: {
    titel: 'Wahr oder Falsch — schnell entscheiden',
    untertitel: 'Wische die Karten links (falsch) oder rechts (wahr)',
    aufgaben: [
      { aufgabe_id: 'sw-1', text: 'Mitochondrien sind die Kraftwerke der Zelle.', antwortformat: 'swipe', loesungen: ['wahr'], distraktoren: [], hilfen: [], teilkompetenz: 'energie' },
      { aufgabe_id: 'sw-2', text: 'Der Zellkern enthält die Ribosomen.', antwortformat: 'swipe', loesungen: ['falsch'], distraktoren: [], hilfen: [], teilkompetenz: 'zellbau' },
      { aufgabe_id: 'sw-3', text: 'Fotosynthese findet in den Chloroplasten statt.', antwortformat: 'swipe', loesungen: ['wahr'], distraktoren: [], hilfen: [], teilkompetenz: 'fotosynthese' },
      { aufgabe_id: 'sw-4', text: 'Die Zellmembran ist undurchlässig für alle Stoffe.', antwortformat: 'swipe', loesungen: ['falsch'], distraktoren: [], hilfen: [], teilkompetenz: 'membran' },
      { aufgabe_id: 'sw-5', text: 'Ribosomen bestehen aus RNA und Proteinen.', antwortformat: 'swipe', loesungen: ['wahr'], distraktoren: [], hilfen: [], teilkompetenz: 'ribosomen' },
      { aufgabe_id: 'sw-6', text: 'Mitochondrien besitzen keine eigene DNA.', antwortformat: 'swipe', loesungen: ['falsch'], distraktoren: [], hilfen: [], teilkompetenz: 'eigene-dna' },
      { aufgabe_id: 'sw-7', text: 'Bei der Mitose entstehen zwei genetisch identische Tochterzellen.', antwortformat: 'swipe', loesungen: ['wahr'], distraktoren: [], hilfen: [], teilkompetenz: 'mitose' },
      { aufgabe_id: 'sw-8', text: 'Die Meiose findet in Körperzellen statt.', antwortformat: 'swipe', loesungen: ['falsch'], distraktoren: [], hilfen: [], teilkompetenz: 'meiose' },
    ],
  },
  code_cracker: {
    titel: 'Code-Cracker — Knack den Tresor',
    untertitel: '4 Stellen, pro Stelle eine Frage. Falsche Antworten lassen den Tresor nicht öffnen.',
    aufgaben: [
      { aufgabe_id: 'cc-1', text: 'Welche Base paart mit Adenin in DNA?', antwortformat: 'code_cracker', loesungen: ['Thymin'], distraktoren: ['Uracil', 'Guanin', 'Cytosin'], hilfen: [], teilkompetenz: 'basenpaarung' },
      { aufgabe_id: 'cc-2', text: 'Welche Base paart mit Cytosin?', antwortformat: 'code_cracker', loesungen: ['Guanin'], distraktoren: ['Adenin', 'Uracil', 'Thymin'], hilfen: [], teilkompetenz: 'basenpaarung' },
      { aufgabe_id: 'cc-3', text: 'In welcher Phase wird die DNA verdoppelt?', antwortformat: 'code_cracker', loesungen: ['S-Phase'], distraktoren: ['G1-Phase', 'M-Phase', 'G2-Phase'], hilfen: [], teilkompetenz: 'zellzyklus' },
      { aufgabe_id: 'cc-4', text: 'Welches Enzym verknüpft Nukleotide während der Replikation?', antwortformat: 'code_cracker', loesungen: ['DNA-Polymerase'], distraktoren: ['Helicase', 'Ligase', 'Primase'], hilfen: [], teilkompetenz: 'replikation' },
    ],
  },
  sortieren: {
    titel: 'Sortier-Karussell',
    untertitel: 'Sortiere die Begriffe in die richtigen Kategorien',
    aufgaben: [
      {
        aufgabe_id: 'so-1',
        text: 'Ordne die Strukturen den Zelltypen zu',
        antwortformat: 'sortieren',
        loesungen: [
          'Zellwand → Pflanzenzelle',
          'Chloroplast → Pflanzenzelle',
          'Vakuole (groß) → Pflanzenzelle',
          'Lysosom → Tierzelle',
          'Zentriol → Tierzelle',
          'Cholesterin → Tierzelle',
        ],
        distraktoren: [],
        hilfen: [],
        teilkompetenz: 'zelltypen',
      },
    ],
  },
  quiz_tower: {
    titel: 'Quiz-Tower — Bau deinen Turm',
    untertitel: 'Pro richtige Antwort fällt ein Block. Falsch = Turm wackelt.',
    aufgaben: [
      { aufgabe_id: 'qt-1', text: 'Welche Organelle baut Proteine ab?', antwortformat: 'quiz_tower', loesungen: ['Lysosom'], distraktoren: ['Mitochondrium', 'Ribosom', 'Vakuole'], hilfen: [], teilkompetenz: 'lysosom' },
      { aufgabe_id: 'qt-2', text: 'Welches Molekül speichert in Zellen schnell verfügbare Energie?', antwortformat: 'quiz_tower', loesungen: ['ATP'], distraktoren: ['DNA', 'mRNA', 'Glykogen'], hilfen: [], teilkompetenz: 'energie' },
      { aufgabe_id: 'qt-3', text: 'Was passiert in der Anaphase der Mitose?', antwortformat: 'quiz_tower', loesungen: ['Chromatiden trennen sich'], distraktoren: ['Chromosomen kondensieren', 'Kernhülle löst sich', 'Spindel baut sich ab'], hilfen: [], teilkompetenz: 'mitose-phasen' },
      { aufgabe_id: 'qt-4', text: 'Welche Zellbestandteile sind in Prokaryoten nicht vorhanden?', antwortformat: 'quiz_tower', loesungen: ['Zellkern'], distraktoren: ['Ribosomen', 'Zellmembran', 'DNA'], hilfen: [], teilkompetenz: 'prokaryoten' },
      { aufgabe_id: 'qt-5', text: 'In welchem Bereich der Zelle erfolgt die Glykolyse?', antwortformat: 'quiz_tower', loesungen: ['Zytoplasma'], distraktoren: ['Mitochondrium-Matrix', 'Zellkern', 'ER'], hilfen: [], teilkompetenz: 'glykolyse' },
      { aufgabe_id: 'qt-6', text: 'Welches Organell sortiert und verpackt Proteine?', antwortformat: 'quiz_tower', loesungen: ['Golgi-Apparat'], distraktoren: ['Lysosom', 'Ribosom', 'Zellkern'], hilfen: [], teilkompetenz: 'golgi' },
      { aufgabe_id: 'qt-7', text: 'Welche Struktur trennt das Zellinnere von der Umgebung?', antwortformat: 'quiz_tower', loesungen: ['Zellmembran'], distraktoren: ['Zellwand', 'Kernhülle', 'ER-Membran'], hilfen: [], teilkompetenz: 'membran' },
      { aufgabe_id: 'qt-8', text: 'In welcher Mitose-Phase ordnen sich die Chromosomen in der Mitte an?', antwortformat: 'quiz_tower', loesungen: ['Metaphase'], distraktoren: ['Prophase', 'Anaphase', 'Telophase'], hilfen: [], teilkompetenz: 'mitose-phasen' },
    ],
  },
  wort_schlange: {
    titel: 'Wort-Schlange — Begriffe im Gitter',
    untertitel: 'Ziehe eine Linie durch zusammenhängende Buchstaben um Fachbegriffe zu finden',
    aufgaben: [
      { aufgabe_id: 'ws-1', text: 'Finde die Fachbegriffe rund um die Zelle', antwortformat: 'wort_schlange', loesungen: ['ZELLE', 'KERN', 'DNA', 'RNA', 'GEN', 'ATP'], distraktoren: [], hilfen: [], teilkompetenz: 'zellbiologie' },
    ],
  },
  detektiv: {
    titel: 'Detektiv — Indizien sammeln',
    untertitel: 'Untersuche die Hotspots und sammle Indizien',
    aufgaben: [
      { aufgabe_id: 'dt-1', text: 'Welches Organell produziert ATP?', antwortformat: 'detektiv', loesungen: ['Mitochondrium produziert ATP'], distraktoren: ['Vakuole produziert ATP', 'Ribosom produziert ATP', 'Zellkern produziert ATP'], hilfen: [], teilkompetenz: '25@40' },
      { aufgabe_id: 'dt-2', text: 'Was enthält das Erbgut?', antwortformat: 'detektiv', loesungen: ['Zellkern enthält Erbgut'], distraktoren: ['Ribosom enthält Erbgut', 'Mitochondrium enthält Erbgut', 'Vakuole enthält Erbgut'], hilfen: [], teilkompetenz: '55@30' },
      { aufgabe_id: 'dt-3', text: 'Wo werden Proteine zusammengebaut?', antwortformat: 'detektiv', loesungen: ['Ribosomen bauen Proteine'], distraktoren: ['Lysosomen bauen Proteine', 'Vakuolen bauen Proteine', 'Mitochondrien bauen Proteine'], hilfen: [], teilkompetenz: '75@55' },
      { aufgabe_id: 'dt-4', text: 'Was umhüllt eine tierische Zelle?', antwortformat: 'detektiv', loesungen: ['Zellmembran umhüllt Zelle'], distraktoren: ['Zellwand umhüllt Zelle', 'Kernhülle umhüllt Zelle', 'ER umhüllt Zelle'], hilfen: [], teilkompetenz: '45@75' },
    ],
  },
} as const

type SpielKey = keyof typeof TEST_AUFGABEN

const SPIELE: { key: SpielKey; label: string; emoji: string }[] = [
  { key: 'multiple_choice', label: 'Multiple Choice', emoji: '✅' },
  { key: 'hangman',         label: 'Hangman',         emoji: '🔤' },
  { key: 'memory',          label: 'Memory Match',    emoji: '🃏' },
  { key: 'study_bird',      label: 'Study Bird',      emoji: '🐦' },
  { key: 'boss_fight',      label: 'Boss Battle',     emoji: '⚔️' },
  { key: 'millionaer',      label: 'Millionär',       emoji: '💰' },
  { key: 'swipe',           label: 'Swipe',           emoji: '👉' },
  { key: 'code_cracker',    label: 'Code-Cracker',    emoji: '🔐' },
  { key: 'sortieren',       label: 'Sortieren',       emoji: '🧺' },
  { key: 'quiz_tower',      label: 'Quiz-Tower',      emoji: '🗼' },
  { key: 'wort_schlange',   label: 'Wort-Schlange',   emoji: '🐍' },
  { key: 'detektiv',        label: 'Detektiv',        emoji: '🔍' },
]

// Skin-Optionen — gemappt auf die 9 Themes aus theme.ts
const SKIN_OPTIONEN: { skin: string; themeId: string }[] = [
  { skin: 'unterstufe',      themeId: 'kids' },
  { skin: 'mittelstufe',     themeId: 'mission' },
  { skin: 'oberstufe',       themeId: 'analytics' },
  { skin: 'Boss Battle',     themeId: 'boss' },
  { skin: 'Sprint-Bahn',     themeId: 'sprint' },
  { skin: 'Escape Room',     themeId: 'noir' },
  { skin: 'Puzzle-Karte',    themeId: 'neon' },
  { skin: 'Werkstatt-Band',  themeId: 'factory' },
  { skin: 'Fehler-Scanner',  themeId: 'lab' },
]

export default function TestSpielePage() {
  const [spiel, setSpiel] = useState<SpielKey>('multiple_choice')
  const [skinIndex, setSkinIndex] = useState(0)
  const [runKey, setRunKey] = useState(0)
  const [ergebnis, setErgebnis] = useState<{ korrekt: number; gesamt: number } | null>(null)

  const aktuell = TEST_AUFGABEN[spiel]
  const skin = SKIN_OPTIONEN[skinIndex]

  function neustart() {
    setErgebnis(null)
    setRunKey((k) => k + 1)
  }

  function wechseleSpiel(s: SpielKey) {
    setSpiel(s)
    setErgebnis(null)
    setRunKey((k) => k + 1)
  }

  function wechseleSkin(i: number) {
    setSkinIndex(i)
    setErgebnis(null)
    setRunKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toolbar */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex flex-col gap-2"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Spiel</span>
          {SPIELE.map((s) => (
            <button
              key={s.key}
              onClick={() => wechseleSpiel(s.key)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background:
                  spiel === s.key ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: spiel === s.key ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Skin</span>
          {SKIN_OPTIONEN.map((s, i) => {
            const t = ALL_THEMES[s.themeId as keyof typeof ALL_THEMES]
            return (
              <button
                key={s.skin}
                onClick={() => wechseleSkin(i)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: skinIndex === i ? t.accentGradient : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border:
                    skinIndex === i
                      ? '1px solid rgba(255,255,255,0.4)'
                      : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {t.badge} {s.skin}
              </button>
            )
          })}
        </div>
      </div>

      {/* Spiel-Bereich */}
      <div className="flex-1 relative">
        {ergebnis ? (
          <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <div className="text-6xl">{ergebnis.korrekt === ergebnis.gesamt ? '🎉' : '🎯'}</div>
            <div className="text-2xl font-extrabold">
              {ergebnis.korrekt} / {ergebnis.gesamt} richtig
            </div>
            <div className="text-sm text-white/60">
              Skin: {skin.skin} · Spiel: {SPIELE.find((s) => s.key === spiel)?.label}
            </div>
            <button
              onClick={neustart}
              className="mt-4 px-6 py-3 rounded-2xl font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                boxShadow: '0 0 32px rgba(168,85,247,0.4)',
              }}
            >
              Nochmal spielen 🔁
            </button>
          </div>
        ) : (
          <GameEngine
            key={`${spiel}-${skinIndex}-${runKey}`}
            moduleSessionId="test"
            aufgaben={aktuell.aufgaben as unknown as Parameters<typeof GameEngine>[0]['aufgaben']}
            niveau="standard"
            gameSkin={skin.skin}
            modulTitel={aktuell.titel}
            modulUntertitel={aktuell.untertitel}
            onModulFertig={(e) => setErgebnis({ korrekt: e.korrekt, gesamt: e.gesamt })}
            preview
          />
        )}
      </div>
    </div>
  )
}

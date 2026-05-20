/**
 * End-to-End-Test der Claude-Pipeline gegen alle Zod-Schemas.
 *
 * Ausführen:
 *   npm run test:pipeline
 *
 * (.env.local wird automatisch aus dem Worktree oder dem edugame-ai-
 *  Hauptverzeichnis geladen — kein Setup nötig.)
 *
 * Was passiert:
 * 1. Synthetisches Mini-Material (Biologie Kl. 7, Photosynthese) wird durch
 *    alle 7 Pipeline-Schritte geschickt: Analyse → Lernziel → Lernpfad →
 *    Spielmapping → Spielgenerierung → Validierung → Diagnose.
 * 2. Jeder Output wird gegen sein Zod-Schema validiert (das macht callClaude
 *    intern schon — wir loggen hier nur Erfolg/Fehler pro Schritt).
 * 3. Bei Schema-Fehler wird der Schritt und der ZodError ausgegeben, damit
 *    du den Prompt oder das Schema gezielt nachschärfen kannst.
 *
 * Kosten: ~5–8 Sonnet-4.6-Calls, im einstelligen Cent-Bereich pro Lauf.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import {
  analyzeMaterial,
  determineLearningObjective,
  determineLernpfad,
  runSpielMapping,
  generateGame,
  validateAndCheck,
  runDiagnosis,
  PipelineValidationError,
  PipelineJsonError,
  PipelineApiError,
} from '../src/lib/claude/pipeline'

// .env.local laden (Worktree zuerst, sonst aus edugame-ai-Hauptverzeichnis)
// — pipeline.ts liest process.env erst beim API-Call, also reicht das hier.
function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '../../../.env.local'),
    resolve(process.cwd(), '../../../../.env.local'),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
      if (!match) continue
      const [, key, raw] = match
      if (process.env[key]) continue
      process.env[key] = raw.replace(/^["']|["']$/g, '')
    }
    return path
  }
  return null
}
loadEnv()

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY nicht gesetzt — bitte in .env.local hinterlegen.')
  process.exit(1)
}

// ── Synthetisches Mini-Material ────────────────────────────────
const material = {
  fach: 'Biologie',
  jahrgangsstufe: '7',
  schulform: 'Gymnasium',
  bundesland: 'NRW',
  abschnitte: [
    {
      id: 'A1',
      text: 'Photosynthese ist der Prozess, bei dem grüne Pflanzen mithilfe von Sonnenlicht aus Wasser und Kohlenstoffdioxid Glukose und Sauerstoff herstellen. Der Vorgang findet in den Chloroplasten statt, die das grüne Pigment Chlorophyll enthalten.',
    },
    {
      id: 'A2',
      text: 'Die Reaktionsgleichung lautet: 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂. Die Pflanze nimmt Kohlenstoffdioxid über die Spaltöffnungen der Blätter auf, Wasser über die Wurzeln. Die entstandene Glukose wird in Form von Stärke gespeichert oder zum Zellaufbau verwendet.',
    },
    {
      id: 'A3',
      text: 'Ohne Photosynthese gäbe es keinen Sauerstoff in der Atmosphäre und keine Nahrungsgrundlage für Tiere und Menschen. Pflanzen bilden die Basis fast aller Nahrungsketten.',
    },
  ],
}

const materialText = material.abschnitte.map(a => `[${a.id}] ${a.text}`).join('\n\n')
const kontext = {
  fach: material.fach,
  jahrgangsstufe: material.jahrgangsstufe,
  schulform: material.schulform,
  bundesland: material.bundesland,
  zeitrahmenMinuten: 15,
}

// ── Helfer ─────────────────────────────────────────────────────
function logStep(name: string, durationMs: number, summary: string) {
  const sec = (durationMs / 1000).toFixed(1)
  console.log(`✅ ${name}  (${sec}s)`)
  console.log(`   → ${summary}`)
}

function logError(name: string, err: unknown) {
  console.error(`\n❌ ${name} fehlgeschlagen`)
  if (err instanceof PipelineValidationError) {
    console.error(`   Schritt: ${err.schritt}`)
    console.error(`   Zod-Issues:`)
    for (const issue of err.zodError.issues) {
      console.error(`     • ${issue.path.join('.')}: ${issue.message}`)
    }
    console.error(`   Roh-Output (gekürzt):`)
    console.error(`     ${JSON.stringify(err.rawOutput).slice(0, 500)}…`)
  } else if (err instanceof PipelineJsonError) {
    console.error(`   Schritt: ${err.schritt}`)
    console.error(`   Roh-Antwort (kein gültiges JSON):`)
    console.error(`     ${err.rawText.slice(0, 500)}…`)
  } else if (err instanceof PipelineApiError) {
    console.error(`   Schritt: ${err.schritt}`)
    console.error(`   API-Fehler:`, err.cause)
  } else {
    console.error(err)
  }
}

async function timed<T>(name: string, fn: () => Promise<T>, summary: (r: T) => string): Promise<T | null> {
  const t0 = Date.now()
  try {
    const result = await fn()
    logStep(name, Date.now() - t0, summary(result))
    return result
  } catch (err) {
    logError(name, err)
    return null
  }
}

// ── Test-Lauf ──────────────────────────────────────────────────
async function main() {
  console.log('🧪 Pipeline-E2E-Test\n')
  console.log(`Material: ${material.fach} Kl. ${material.jahrgangsstufe} — Photosynthese (3 Abschnitte)\n`)

  // Schritt 1–6
  const analyse = await timed(
    '1. Materialanalyse (Schritte 1–6)',
    () => analyzeMaterial({ materialText, abschnitte: material.abschnitte, kontext }),
    (r) =>
      `Wissensform: ${r.schritt_3_wissensformen['primär']}, ` +
      `Komplexität: ${r.schritt_6_komplexitaet.stufe}, ` +
      `${r.schritt_2_kernaussagen.length} Kernaussagen`,
  )
  if (!analyse) process.exit(1)

  // Schritt 7–10
  const lernziel = await timed(
    '2. Lernziel & Spielbarkeits-Ampel (Schritte 7–10)',
    () => determineLearningObjective({ analyse }),
    (r) =>
      `Ampel: ${r.schritt_9_ampel.farbe}, ` +
      `Format: ${r.schritt_10_antwortformat['primäres_format']}, ` +
      `Lernziel: "${r.schritt_7_lernziel.original.slice(0, 60)}…"`,
  )
  if (!lernziel) process.exit(1)

  // Schritt 11–13 (Lernpfad)
  const lernpfad = await timed(
    '3. Lernpfad (Schritte 11–13)',
    () => determineLernpfad({ analyse, lernziel, kontext }),
    (r) => `Typ: ${r.lernpfad_typ}, ${r.spiele.length} Spielelemente, ${r.empfohlene_phasen.length} Phasen`,
  )
  if (!lernpfad) process.exit(1)

  // Spielmapping
  const spielmapping = await timed(
    '4. Spielmapping (5 Vorschläge)',
    () => runSpielMapping({ analyse, lernziel, lernpfad, kontext }),
    (r) =>
      `Lerngegenstand: "${r.lerngegenstand_kurz.slice(0, 50)}…", ` +
      `gewählter Rang: ${r.ausgewaehlter_vorschlag_rang}`,
  )
  if (!spielmapping) process.exit(1)

  // Schritt 14–16
  const spiel = await timed(
    '5. Spielgenerierung (Schritte 14–16)',
    () => generateGame({ analyse, lernziel, lernpfad, spielmapping, kontext }),
    (r) =>
      `Engine: ${r.schritt_11_game_engine.engine_typ}, ` +
      `Skin: ${r.schritt_12_game_skin.altersstufe}, ` +
      `${r.schritt_14_aufgaben.length} Aufgaben`,
  )
  if (!spiel) process.exit(1)

  // Schritt 17–21
  const check = await timed(
    '6. Validierung & Lehrkraft-Check (Schritte 17–21)',
    () =>
      validateAndCheck({
        analyse,
        lernziel,
        lernpfad,
        spielmapping,
        spiel,
        abschnitte: material.abschnitte,
      }),
    (r) =>
      `Gesamtampel: ${r.schritt_21_lehrkraft_check.gesamtampel}, ` +
      `Hinweise: ${r.schritt_21_lehrkraft_check.hinweise_fuer_lehrkraft.length}`,
  )
  if (!check) process.exit(1)

  // Diagnose mit synthetischen Schülerantworten
  const aufgaben = spiel.schritt_14_aufgaben
  const schuelerErgebnisse = ['fuchs_42', 'eule_17', 'biber_03'].map((code, codeIdx) => ({
    code,
    antworten: aufgaben.map((a, idx) => ({
      aufgabe_id: a.aufgabe_id,
      status: idx + codeIdx < aufgaben.length ? 'korrekt' : 'falsch',
      versuche: 1,
      hilfen_genutzt: 0,
    })),
  }))

  await timed(
    '7. Lernstandsdiagnose (Kompaktmodus)',
    () =>
      runDiagnosis({
        spielMetadaten: {
          titel: 'Photosynthese-Quiz',
          lernziel: lernziel.schritt_7_lernziel.original,
          komplexitaetsstufe: analyse.schritt_6_komplexitaet.stufe,
        },
        aufgabenMetadaten: aufgaben.map((a) => ({
          aufgabe_id: a.aufgabe_id,
          teilkompetenz: a.teilkompetenz,
          komplexitaetsstufe: a.komplexitaetsstufe,
        })),
        schuelerErgebnisse,
        modus: 'kompakt',
      }),
    (r) =>
      `Codes: ${r.klassenueberblick.anzahl_codes}, ` +
      `erreicht: ${r.klassenueberblick.lernziel_erreicht}, ` +
      `teilweise: ${r.klassenueberblick.lernziel_teilweise}`,
  )

  console.log('\n✅ Alle Pipeline-Schritte erfolgreich gegen Zod-Schemas validiert.\n')
}

main().catch((err) => {
  console.error('\n💥 Unerwarteter Fehler:', err)
  process.exit(1)
})

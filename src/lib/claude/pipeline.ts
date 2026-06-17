import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ZodSchema, ZodError } from 'zod'
import {
  AnalyseOutputSchema,
  LernzielOutputSchema,
  LernpfadOutputSchema,
  SpielmappingOutputSchema,
  SpielOutputSchema,
  ValidationOutputSchema,
  DiagnoseOutputSchema,
  ImproveOutputSchema,
  EinzelAufgabeSchema,
  FlowCheckOutputSchema,
  FlowImproveOutputSchema,
  BausteinSequenzOutputSchema,
  InputBausteinOutputSchema,
  type AnalyseOutput,
  type LernzielOutput,
  type LernpfadOutput,
  type SpielmappingOutput,
  type SpielOutput,
  type ValidationOutput,
  type DiagnoseOutput,
  type ImproveOutput,
  type EinzelAufgabe,
  type FlowCheckOutput,
  type FlowImproveOutput,
  type BausteinSequenzOutput,
  type InputBausteinOutput,
} from '../schemas/pipeline'

let _client: Anthropic | null = null
function getClient() {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY ist nicht gesetzt')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

// Fehlertypen für die Pipeline
export class PipelineValidationError extends Error {
  constructor(
    public readonly schritt: string,
    public readonly zodError: ZodError,
    public readonly rawOutput: unknown
  ) {
    super(`Pipeline-Schritt "${schritt}" hat ungültiges JSON zurückgegeben: ${zodError.message}`)
    this.name = 'PipelineValidationError'
  }
}

export class PipelineJsonError extends Error {
  constructor(public readonly schritt: string, public readonly rawText: string) {
    super(`Pipeline-Schritt "${schritt}" hat kein JSON zurückgegeben`)
    this.name = 'PipelineJsonError'
  }
}

export class PipelineApiError extends Error {
  constructor(public readonly schritt: string, cause: unknown) {
    super(`Pipeline-Schritt "${schritt}" fehlgeschlagen`)
    this.name = 'PipelineApiError'
    this.cause = cause
  }
}

// Lädt einen Prompt aus der prompts/-Datei
function loadPrompt(filename: string): string {
  const promptPath = join(process.cwd(), 'prompts', filename)
  return readFileSync(promptPath, 'utf-8')
}

// JSON aus Claude-Antwort extrahieren
function extractJson(text: string, schritt: string): unknown {
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/)
  if (!jsonMatch) throw new PipelineJsonError(schritt, text)
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0])
  } catch {
    throw new PipelineJsonError(schritt, text)
  }
}

// Einzelner typisierter KI-Call mit Zod-Validierung
async function callClaude<T>(
  schritt: string,
  systemPrompt: string,
  userMessage: string,
  schema: ZodSchema<T>,
  maxTokens = 8192
): Promise<T> {
  let response
  try {
    response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      // System-Prompt cachen: alle parallelen generateGame-Calls und Folgegenerierungen
      // innerhalb von 5 min nutzen denselben Prompt — Cache-Hit spart ~85% Input-Tokens
      // und reduziert TTFT um 1-3s pro Call.
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    throw new PipelineApiError(schritt, err)
  }

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const raw = extractJson(text, schritt)

  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new PipelineValidationError(schritt, result.error, raw)
  }

  return result.data
}

// --- Schritt 1–6: Materialanalyse ---------------------------
export async function analyzeMaterial(input: {
  materialText: string
  abschnitte: { id: string; text: string }[]
  kontext: { fach: string; jahrgangsstufe: string; schulform: string }
}): Promise<AnalyseOutput> {
  return callClaude(
    'Materialanalyse (Schritte 1–6)',
    loadPrompt('01_material_analysis.md'),
    JSON.stringify({
      material_text: input.materialText,
      material_abschnitte: input.abschnitte,
      kontext: input.kontext,
    }),
    AnalyseOutputSchema
  )
}

// --- Schritt 7–10: Lernziel & Spielbarkeits-Ampel -----------
export async function determineLearningObjective(input: {
  analyse: AnalyseOutput
  lernzielLehrkraft?: string
}): Promise<LernzielOutput> {
  return callClaude(
    'Lernziel & Spielbarkeit (Schritte 7–10)',
    loadPrompt('02_learning_objective.md'),
    JSON.stringify({
      analyse: input.analyse,
      lernziel_lehrkraft: input.lernzielLehrkraft ?? null,
    }),
    LernzielOutputSchema
  )
}

// Kurzfassung des Lernpfads für downstream Claude-Calls:
// Enthält alle Steuerungsfelder, aber keine ausführlichen Level-Details.
// Verhindert aufgeblähte Inputs bei Spielmapping, Generierung und Validierung.
function lernpfadKurzfassung(lp: LernpfadOutput) {
  return {
    lernpfad_typ: lp.lernpfad_typ,
    lernpfad_beschreibung: lp.lernpfad_beschreibung,
    empfohlene_phasen: lp.empfohlene_phasen,
    empfohlene_spielfunktion: lp.empfohlene_spielfunktion,
    lerninhalt_anteil: lp.lerninhalt_anteil,
    spielerlebnis_anteil: lp.spielerlebnis_anteil,
    begruendung: lp.begruendung,
    besonderheiten: lp.besonderheiten ?? null,
    zeitstrukturplan: lp.zeitstrukturplan,
    spiele: lp.spiele.map(({ level: _lvl, ...s }) => s),
  }
}

// --- Schritt 12–13: Didaktischer Lernpfad -------------------
export async function determineLernpfad(input: {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  kontext: { fach: string; jahrgangsstufe: string; schulform: string; zeitrahmenMinuten?: number }
}): Promise<LernpfadOutput> {
  return callClaude(
    'Lernpfad (Schritte 12–13)',
    loadPrompt('03_lernpfad.md'),
    JSON.stringify({
      analyse: input.analyse,
      lernziel: input.lernziel,
      kontext: {
        fach: input.kontext.fach,
        jahrgangsstufe: input.kontext.jahrgangsstufe,
        schulform: input.kontext.schulform,
        zeitrahmen_minuten: input.kontext.zeitrahmenMinuten ?? null,
      },
    }),
    LernpfadOutputSchema,
    16384
  )
}

// --- LernFlow: Bausteinsequenz planen (Prompt 11) ------------
//
// Leitet aus dem Lernpfad-Archetyp die konkrete, didaktisch geordnete
// Baustein-Sequenz ab. 'spiel' ist nur ein Typ unter mehreren und wird nur
// nach Passung gewählt.
export async function planBausteinSequenz(input: {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  lernpfad: LernpfadOutput
  kontext: { fach: string; jahrgangsstufe: string; schulform: string; zeitrahmenMinuten: number }
}): Promise<BausteinSequenzOutput> {
  return callClaude(
    'Bausteinsequenz planen (LernFlow)',
    loadPrompt('11_baustein_sequenz.md'),
    JSON.stringify({
      analyse: input.analyse,
      lernziel: input.lernziel,
      lernpfad: lernpfadKurzfassung(input.lernpfad),
      kontext: {
        fach: input.kontext.fach,
        jahrgangsstufe: input.kontext.jahrgangsstufe,
        schulform: input.kontext.schulform,
        zeitrahmen_minuten: input.kontext.zeitrahmenMinuten,
      },
    }),
    BausteinSequenzOutputSchema
  )
}

// --- LernFlow: Input-/Erklär-Baustein generieren (Prompt 12) -
//
// Erzeugt den Inhalt EINES Nicht-Spiel-Bausteins: Erklärtext (Markdown) +
// Kernaussagen + genau eine Mini-Verständnisfrage, streng aus dem Material.
export async function generateInputBaustein(input: {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  baustein: {
    baustein_typ: string
    titel: string
    thema: string
    didaktische_funktion: string
  }
  kontext: { fach: string; jahrgangsstufe: string; schulform: string }
}): Promise<InputBausteinOutput> {
  return callClaude(
    'Input-Baustein generieren (LernFlow)',
    loadPrompt('12_input_baustein.md'),
    JSON.stringify({
      analyse: input.analyse,
      lernziel: input.lernziel,
      baustein: input.baustein,
      kontext: input.kontext,
    }),
    InputBausteinOutputSchema
  )
}

// --- Spielmapping: 5 Spielvorschläge -------------------------
export async function runSpielMapping(input: {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  lernpfad: LernpfadOutput
  kontext: { fach: string; jahrgangsstufe: string; schulform: string; zeitrahmenMinuten: number }
  erlaubteFormate?: string[]
}): Promise<SpielmappingOutput> {
  return callClaude(
    'Spielmapping (5 Vorschläge)',
    loadPrompt('03_spielmapping.md'),
    JSON.stringify({
      analyse: input.analyse,
      lernziel: input.lernziel,
      lernpfad: lernpfadKurzfassung(input.lernpfad),
      kontext: {
        fach: input.kontext.fach,
        jahrgangsstufe: input.kontext.jahrgangsstufe,
        schulform: input.kontext.schulform,
        zeitrahmen_minuten: input.kontext.zeitrahmenMinuten,
      },
      erlaubte_formate: input.erlaubteFormate ?? null,
    }),
    SpielmappingOutputSchema
  )
}

// --- Schritt 11–16: Spielgenerierung -------------------------
export async function generateGame(input: {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  lernpfad: LernpfadOutput
  spielmapping: SpielmappingOutput
  kontext: { jahrgangsstufe: string; fach: string; zeitrahmenMinuten: number }
  erlaubteFormate?: string[]
}): Promise<SpielOutput> {
  return callClaude(
    'Spielgenerierung (Schritte 11–16)',
    loadPrompt('04_game_generation.md'),
    JSON.stringify({
      analyse: input.analyse,
      lernziel: input.lernziel,
      lernpfad: lernpfadKurzfassung(input.lernpfad),
      spielmapping: input.spielmapping,
      kontext: {
        jahrgangsstufe: input.kontext.jahrgangsstufe,
        fach: input.kontext.fach,
        zeitrahmen_minuten: input.kontext.zeitrahmenMinuten,
      },
      erlaubte_formate: input.erlaubteFormate ?? null,
    }),
    SpielOutputSchema
  )
}

// --- Schritt 17–21: Validierung & Lehrkraft-Check ------------
export async function validateAndCheck(input: {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  lernpfad: LernpfadOutput
  spielmapping: SpielmappingOutput
  spiel: SpielOutput
  abschnitte: { id: string; text: string }[]
}): Promise<ValidationOutput> {
  return callClaude(
    'Validierung & Lehrkraft-Check (Schritte 17–21)',
    loadPrompt('05_validation_lehrkraft_check.md'),
    JSON.stringify({
      analyse: {
        zusammenfassung: input.analyse.schritt_1_zusammenfassung,
        kernaussagen: input.analyse.schritt_2_kernaussagen,
        wissensstruktur: input.analyse.schritt_5_wissensstruktur,
        komplexitaet: input.analyse.schritt_6_komplexitaet,
      },
      lernziel: input.lernziel,
      lernpfad: lernpfadKurzfassung(input.lernpfad),
      spielmapping: {
        lerngegenstand_kurz: input.spielmapping.lerngegenstand_kurz,
        ausgewaehlter_vorschlag_rang: input.spielmapping.ausgewaehlter_vorschlag_rang,
        auswahlbegruendung: input.spielmapping.auswahlbegruendung,
        ausgewaehlter_vorschlag: input.spielmapping.vorschlaege.find(
          v => v.rang === input.spielmapping.ausgewaehlter_vorschlag_rang
        ) ?? null,
      },
      spiel: input.spiel,
      originalmaterial_abschnitte: input.abschnitte.map(a => ({
        id: a.id,
        text: a.text.slice(0, 300),
      })),
    }),
    ValidationOutputSchema,
    16384
  )
}

// --- Lernstandsdiagnose --------------------------------------
export async function runDiagnosis(input: {
  spielMetadaten: unknown
  aufgabenMetadaten: unknown[]
  schuelerErgebnisse: unknown[]
  modus: 'kompakt' | 'detail'
}): Promise<DiagnoseOutput> {
  return callClaude(
    'Lernstandsdiagnose',
    loadPrompt('06_diagnosis_engine.md'),
    JSON.stringify({
      spiel_metadaten: input.spielMetadaten,
      aufgaben_metadaten: input.aufgabenMetadaten,
      schueler_ergebnisse: input.schuelerErgebnisse,
      ausgabemodus: input.modus,
    }),
    DiagnoseOutputSchema
  )
}

// --- Spielverbesserung (Prompt 07) ----------------------------------
export async function improveGame(input: {
  aufgaben: unknown[]
  check: unknown
  kontext: { lernziel: string; fach: string; jahrgangsstufe: string; zusammenfassung: string }
}): Promise<ImproveOutput> {
  return callClaude(
    'Spielverbesserung',
    loadPrompt('07_game_improvement.md'),
    JSON.stringify({
      aufgaben: input.aufgaben,
      check: input.check,
      kontext: input.kontext,
    }),
    ImproveOutputSchema
  )
}

// --- Einzelne Aufgabe neu generieren (Prompt 08) --------------------
export async function regenerateAufgabe(input: {
  altAufgabe: EinzelAufgabe
  kontext: {
    lernziel: string
    fach: string
    jahrgangsstufe: string
    zusammenfassung: string
    kernaussagen: string[]
  }
}): Promise<EinzelAufgabe> {
  return callClaude(
    'Aufgabe neu generieren',
    loadPrompt('08_aufgabe_regenerieren.md'),
    JSON.stringify({
      alt_aufgabe: input.altAufgabe,
      kontext: input.kontext,
    }),
    EinzelAufgabeSchema
  )
}

// --- Flow-weiter Lehrkraft-Check (Schritt 22) ----------------
//
// Bewertet einen kompletten Flow als didaktische Einheit. Module sehen sich
// gegenseitig, Wissen aus einem Modul gilt als verfügbar für die anderen.
export async function flowLehrkraftCheck(input: {
  lernziel: string
  fach: string
  jahrgangsstufe: string
  schulform: string
  module: Array<{
    modul_id: string
    modul_position: number
    titel: string
    baustein_typ?: string
    spieltyp_didaktisch: string | null
    game_engine: string | null
    erklaer_inhalt?: string | null
    aufgaben: unknown
  }>
}): Promise<FlowCheckOutput> {
  return callClaude(
    'Flow-weiter Lehrkraft-Check (Schritt 22)',
    loadPrompt('09_flow_lehrkraft_check.md'),
    JSON.stringify({
      flow_lernziel: input.lernziel,
      kontext: {
        fach: input.fach,
        jahrgangsstufe: input.jahrgangsstufe,
        schulform: input.schulform,
      },
      module: input.module,
    }),
    FlowCheckOutputSchema,
    12288
  )
}

// --- Flow-weite Verbesserungen (Schritt 23) ------------------
//
// Nimmt den Flow-Check + alle Module entgegen und schlägt vor, in welchem
// Modul welche Änderung gemacht werden soll. Eine Antwort kann mehrere
// Module gleichzeitig betreffen.
export async function flowImprove(input: {
  lernziel: string
  fach: string
  jahrgangsstufe: string
  schulform: string
  flow_check: unknown
  module: Array<{
    modul_id: string
    modul_position: number
    titel: string
    spieltyp_didaktisch: string | null
    game_engine: string | null
    aufgaben: unknown
  }>
}): Promise<FlowImproveOutput> {
  return callClaude(
    'Flow-weite Verbesserungen (Schritt 23)',
    loadPrompt('10_flow_improvements.md'),
    JSON.stringify({
      flow_lernziel: input.lernziel,
      kontext: {
        fach: input.fach,
        jahrgangsstufe: input.jahrgangsstufe,
        schulform: input.schulform,
      },
      flow_check: input.flow_check,
      module: input.module,
    }),
    FlowImproveOutputSchema,
    16384
  )
}

export type ProgressEvent = { label: string; percent: number; schrittIndex: number }

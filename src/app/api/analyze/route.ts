import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeMaterial,
  determineLearningObjective,
  determineLernpfad,
  planBausteinSequenz,
  runSpielMapping,
  PipelineValidationError,
  PipelineJsonError,
  PipelineTruncationError,
  PipelineApiError,
} from '@/lib/claude/pipeline'
import { createClient } from '@/lib/supabase/server'
import type { AnalyseOutput, LernzielOutput, LernpfadOutput, SpielmappingOutput, BausteinSequenzOutput } from '@/lib/schemas/pipeline'

// /api/analyze macht NUR Analyse + Planung + Platzhalter-Module — die eigentliche
// Modul-Generierung läuft danach pro Modul in eigenen Lambdas
// (/api/games/[id]/generate), vom Client orchestriert. So gibt es KEIN
// Aggregat-Zeitlimit mehr (skaliert mit beliebig vielen Bausteinen/Spielen).
export const maxDuration = 300

const enc = new TextEncoder()
function sseEvent(data: Record<string, unknown>) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

// Sicherheitsnetz: knapp unter maxDuration sauber abbrechen statt Hard-Kill,
// falls die PLANUNG bei sehr großem Material doch an die 300s stößt.
const SOFT_DEADLINE_MS = 280_000

class PipelineDeadlineError extends Error {
  constructor() {
    super('Zeitlimit erreicht')
    this.name = 'PipelineDeadlineError'
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await request.json()
  const {
    materialId,
    spielname,
    lernzielLehrkraft,
    zeitrahmenMinuten = 15,
    erlaubteFormate,
    anzahlSpiele = 1,
  } = body
  if (!materialId) return NextResponse.json({ error: 'materialId fehlt' }, { status: 400 })

  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .eq('lehrer_id', user.id)
    .single()

  if (materialError || !material) {
    return NextResponse.json({ error: 'Material nicht gefunden' }, { status: 404 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => controller.enqueue(sseEvent(data))

      // Heartbeat: SSE-Kommentar alle 10s, damit Proxies/Browser die Verbindung
      // nicht wegen Inaktivität kappen.
      const heartbeat = setInterval(() => {
        try { controller.enqueue(enc.encode(`: ping\n\n`)) } catch { /* closed */ }
      }, 10_000)

      const deadlineAt = Date.now() + SOFT_DEADLINE_MS
      const checkDeadline = () => { if (Date.now() > deadlineAt) throw new PipelineDeadlineError() }

      try {
        const kontext = {
          fach: material.fach,
          jahrgangsstufe: material.jahrgangsstufe,
          schulform: material.schulform,
          zeitrahmenMinuten,
        }

        // ── Phase 1: Analyse + Lernziel + Lernpfad ──────────────────────
        send({ type: 'progress', label: 'Material wird analysiert …', percent: 8, schrittIndex: 0 })
        checkDeadline()
        const analyse = await analyzeMaterial({
          materialText: material.extrahierter_text,
          abschnitte: material.abschnitte,
          kontext,
        })

        send({ type: 'progress', label: 'Lernziel wird bestimmt …', percent: 18, schrittIndex: 6 })
        checkDeadline()
        const lernziel = await determineLearningObjective({ analyse, lernzielLehrkraft })

        send({ type: 'progress', label: 'Lernpfad wird bestimmt …', percent: 26, schrittIndex: 10 })
        checkDeadline()
        const lernpfad = await determineLernpfad({ analyse, lernziel, kontext })

        const { data: analyseRow, error: analyseError } = await supabase
          .from('analyses')
          .insert(buildAnalyseRow(materialId, analyse, lernziel, lernpfad))
          .select()
          .single()
        if (analyseError) throw analyseError

        const flowTitel = spielname?.trim() || `Lernreise – ${new Date().toLocaleDateString('de-DE')}`
        const { data: gameFlow, error: gameFlowError } = await supabase
          .from('game_flows')
          .insert({
            lehrer_id: user.id,
            material_id: materialId,
            analyse_id: analyseRow.id,
            titel: flowTitel,
            zeitrahmen_minuten: zeitrahmenMinuten,
            anzahl_spiele: anzahlSpiele,
          })
          .select()
          .single()
        if (gameFlowError) throw gameFlowError

        // ── Phase 2: Lernsequenz planen ─────────────────────────────────
        const erlaubteFormateArray: string[] | undefined = Array.isArray(erlaubteFormate) ? erlaubteFormate : undefined

        send({ type: 'progress', label: 'Lernsequenz wird geplant …', percent: 34, schrittIndex: 11 })
        checkDeadline()
        const sequenz = await planBausteinSequenz({ analyse, lernziel, lernpfad, kontext, gewuenschteSpiele: anzahlSpiele })

        // ── A3: Spielanzahl ist eine HARTE Zielvorgabe ──────────────────
        // Die KI plant die Lern-Einheit (Erklär-/Check-/Übungsbausteine); die
        // Anzahl der Tier-2-Spiele bestimmen WIR deterministisch und hängen sie
        // als motivierenden Abschluss NACH die Lern-Einheit. So stimmt die
        // angezeigte Spielzahl immer mit den tatsächlich erzeugten Spielen überein —
        // unabhängig davon, wo/ob die KI Spiele platziert hätte.
        const zielSpiele = Math.max(0, Math.floor(Number(anzahlSpiele) || 0))
        const geplant = [...sequenz.bausteine].sort((a, b) => a.position - b.position)
        const lernEinheit = geplant.filter((b) => b.baustein_typ !== 'spiel')
        const geplanteSpiele = geplant.filter((b) => b.baustein_typ === 'spiel')
        const spielAbschluss = buildSpielAbschluss(geplanteSpiele, zielSpiele, lernziel)

        // Positionen lückenlos 1..M neu vergeben: Lern-Einheit zuerst, dann Spiele.
        const bausteine = [...lernEinheit, ...spielAbschluss].map((b, i) => ({ ...b, position: i + 1 }))
        // Reconcilte Sequenz wird persistiert — /generate findet darüber je Position
        // denselben Deskriptor (sonst Drift zwischen games-Rows und Sequenz).
        const sequenzFinal: BausteinSequenzOutput = { ...sequenz, bausteine }

        // Spielmapping immer dann, wenn Spiele gewünscht sind (nicht abhängig davon,
        // ob die KI selbst Spiele geplant hat) — die Spiel-Lambdas brauchen es.
        let spielmappingGlobal: SpielmappingOutput | null = null
        if (zielSpiele > 0) {
          send({ type: 'progress', label: 'Spielkonzepte werden entwickelt …', percent: 42, schrittIndex: 12 })
          checkDeadline()
          spielmappingGlobal = await runSpielMapping({
            analyse, lernziel, lernpfad, kontext,
            erlaubteFormate: erlaubteFormateArray,
          })
        }

        // Geplanten Kontext SYNCHRON persistieren — jedes Generierungs-Lambda liest
        // ihn aus analyses.raw_output. (erlaubteFormate mit drin, damit die Lambdas autark sind.)
        const { error: rawErr } = await supabase
          .from('analyses')
          .update({
            raw_output: {
              analyse, lernziel, lernpfad, sequenz: sequenzFinal,
              spielmapping: spielmappingGlobal,
              erlaubteFormate: erlaubteFormateArray ?? null,
            },
          })
          .eq('id', analyseRow.id)
        if (rawErr) throw rawErr

        // ── Platzhalter-Module anlegen (KEINE KI-Calls hier) ────────────
        // Ein games-Row pro Baustein mit gen_status='pending'. Der Client stößt
        // danach pro Modul /api/games/[id]/generate an (eigenes Lambda).
        send({ type: 'progress', label: 'Bausteine werden vorbereitet …', percent: 48, schrittIndex: 13 })
        const placeholderRows = bausteine.map((b) => ({
          analyse_id: analyseRow.id,
          lehrer_id: user.id,
          game_flow_id: gameFlow.id,
          reihenfolge: b.position,
          baustein_typ: b.baustein_typ,
          titel: b.titel,
          spieltyp_didaktisch: b.didaktische_funktion,
          game_engine: null,
          game_skin: b.baustein_typ === 'spiel' ? null : 'analytics',
          aufgaben: [],
          status: 'entwurf',
          gen_status: 'pending',
        }))
        const { data: insertedRows, error: insertErr } = await supabase
          .from('games')
          .insert(placeholderRows)
          .select('id, reihenfolge, baustein_typ')
        if (insertErr) throw insertErr

        // Sequenz steht → anzahl_spiele = Anzahl der Tier-2-Spiele (harte Zielvorgabe).
        // NICHT mehr die Bausteingesamtzahl (die ist über die games-Rows ableitbar) —
        // das hatte „Spiele" und „Bausteine" vermischt (A3).
        await supabase
          .from('game_flows')
          .update({ anzahl_spiele: zielSpiele, sortiert_am: new Date().toISOString() })
          .eq('id', gameFlow.id)

        const modules = (insertedRows ?? [])
          .map((r) => ({
            id: r.id as string,
            position: (r.reihenfolge ?? 0) as number,
            baustein_typ: r.baustein_typ as string,
          }))
          .sort((a, b) => a.position - b.position)

        // Fertig geplant — der Client generiert die Module einzeln weiter.
        send({ type: 'planned', gameFlowId: gameFlow.id, analyseId: analyseRow.id, modules })

      } catch (err) {
        let message = 'Analyse fehlgeschlagen'
        if (err instanceof PipelineDeadlineError) {
          message = 'Die Planung hat das Zeitlimit erreicht — bitte mit kürzerem Material erneut versuchen.'
          console.error('[analyze] PipelineDeadlineError')
        } else if (err instanceof PipelineValidationError) {
          message = `Validierungsfehler: ${err.message}`
          console.error('[analyze] PipelineValidationError', { schritt: err.schritt, zod: err.zodError.issues, raw: err.rawOutput })
        } else if (err instanceof PipelineJsonError) {
          message = `KI hat kein JSON zurückgegeben: ${err.schritt}`
          console.error('[analyze] PipelineJsonError', { schritt: err.schritt, rawText: err.rawText?.slice(0, 2000) })
        } else if (err instanceof PipelineTruncationError) {
          message = `KI-Antwort wurde abgeschnitten (Token-Limit) bei: ${err.schritt} — bitte erneut versuchen`
          console.error('[analyze] PipelineTruncationError', { schritt: err.schritt, maxTokens: err.maxTokens })
        } else if (err instanceof PipelineApiError) {
          const cause = err.cause
          const causeMessage = cause instanceof Error ? cause.message : (typeof cause === 'string' ? cause : JSON.stringify(cause))
          const causeStatus = (cause as { status?: number } | undefined)?.status
          message = `KI-API-Fehler in ${err.schritt}${causeStatus ? ` [${causeStatus}]` : ''}: ${causeMessage ?? 'unbekannt'}`
          console.error('[analyze] PipelineApiError', { schritt: err.schritt, status: causeStatus, cause })
        } else {
          const detail = err instanceof Error ? err.message : JSON.stringify(err)
          message = `Analyse fehlgeschlagen: ${detail}`
          console.error('[analyze]', err)
        }
        send({ type: 'error', message })
      } finally {
        clearInterval(heartbeat)
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

type BausteinDescriptor = BausteinSequenzOutput['bausteine'][number]

// Erzeugt GENAU `ziel` Spiel-Deskriptoren als Abschluss. Nutzt — soweit
// vorhanden — die von der KI geplanten Spiele als Vorlage; fehlen welche (z.B.
// weil der Lernpfad-Archetyp kein Spiel vorsah), werden generische Übungsspiel-
// Deskriptoren aus dem Lernziel abgeleitet. Der konkrete Spielinhalt entsteht
// ohnehin erst später in /generate aus analyse/lernziel/spielmapping — der
// Deskriptor liefert hier nur Titel/Thema/Funktion.
function buildSpielAbschluss(
  geplanteSpiele: BausteinDescriptor[],
  ziel: number,
  l: LernzielOutput,
): BausteinDescriptor[] {
  if (ziel <= 0) return []
  const thema = l.schritt_7_lernziel.komponenten.inhalt || l.schritt_7_lernziel.original
  const out: BausteinDescriptor[] = []
  for (let i = 0; i < ziel; i++) {
    const basis = geplanteSpiele[i]
    out.push({
      position: 0, // wird beim Zusammenbau lückenlos neu vergeben
      baustein_typ: 'spiel',
      titel: basis?.titel ?? `Übungsspiel ${i + 1}`,
      thema: basis?.thema ?? thema,
      didaktische_funktion: basis?.didaktische_funktion ?? 'Üben und Festigen durch Wiederholung',
      bearbeitungszeit_minuten: basis?.bearbeitungszeit_minuten ?? 5,
      begruendung: basis?.begruendung ?? 'Motivierender Übungs-Abschluss zur Festigung des Gelernten.',
    })
  }
  return out
}

function buildAnalyseRow(
  materialId: string,
  a: AnalyseOutput,
  l: LernzielOutput,
  lp: LernpfadOutput,
) {
  return {
    material_id: materialId,
    zusammenfassung: a.schritt_1_zusammenfassung,
    kernaussagen: a.schritt_2_kernaussagen,
    wissensform_primaer: a.schritt_3_wissensformen['primär'],
    wissensform_sekundaer: a.schritt_3_wissensformen['sekundär'],
    lernform_primaer: a.schritt_4_lernform['primär'],
    lernform_sekundaer: a.schritt_4_lernform['sekundär'],
    wissensstruktur: a.schritt_5_wissensstruktur.typ,
    denkhandlungen: a.schritt_5_wissensstruktur.denkhandlungen,
    komplexitaetsstufe: a.schritt_6_komplexitaet.stufe,
    lernziel_original: l.schritt_7_lernziel.original,
    lernziel_mvp_variante: l.schritt_9_ampel.lernziel_mvp_variante,
    spielbarkeit_ampel: l.schritt_9_ampel.farbe,
    spielbarer_anteil: l.schritt_8_spielbarkeit_analyse.spielbarer_anteil,
    nicht_spielbarer_anteil: l.schritt_8_spielbarkeit_analyse.nicht_spielbarer_anteil,
    antwortformat_primaer: l.schritt_10_antwortformat['primäres_format'],
    antwortformat_sekundaer: l.schritt_10_antwortformat['sekundäres_format'],
    spielfunktion: l.schritt_9_ampel.spielfunktion,
    abdeckung: l.schritt_9_ampel.abdeckung,
    lernpfad: lp,
  }
}

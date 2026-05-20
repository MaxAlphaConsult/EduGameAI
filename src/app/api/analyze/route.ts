import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeMaterial,
  determineLearningObjective,
  determineLernpfad,
  runSpielMapping,
  generateGame,
  validateAndCheck,
  PipelineValidationError,
  PipelineJsonError,
  PipelineApiError,
} from '@/lib/claude/pipeline'
import { createClient } from '@/lib/supabase/server'
import { sortiereModule } from '@/lib/flow/ordering'
import type { AnalyseOutput, LernzielOutput, LernpfadOutput, SpielmappingOutput, SpielOutput, ValidationOutput } from '@/lib/schemas/pipeline'

// Vercel: bis zu 5 Minuten für die Multi-Game-Pipeline erlauben
export const maxDuration = 300

const enc = new TextEncoder()
function sseEvent(data: Record<string, unknown>) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
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
      // nicht wegen Inaktivität kappen, während die Pipeline lange läuft.
      const heartbeat = setInterval(() => {
        try { controller.enqueue(enc.encode(`: ping\n\n`)) } catch { /* closed */ }
      }, 10_000)

      try {
        const kontext = {
          fach: material.fach,
          jahrgangsstufe: material.jahrgangsstufe,
          schulform: material.schulform,
          zeitrahmenMinuten,
        }

        // ── Phase 1: Analyse (einmalig) ─────────────────────────────────
        send({ type: 'progress', label: 'Material wird analysiert …', percent: 5, schrittIndex: 0 })
        const analyse = await analyzeMaterial({
          materialText: material.extrahierter_text,
          abschnitte: material.abschnitte,
          kontext,
        })

        send({ type: 'progress', label: 'Lernziel wird bestimmt …', percent: 20, schrittIndex: 6 })
        const lernziel = await determineLearningObjective({ analyse, lernzielLehrkraft })

        send({ type: 'progress', label: 'Lernpfad wird bestimmt …', percent: 32, schrittIndex: 10 })
        const lernpfad = await determineLernpfad({ analyse, lernziel, kontext })

        // Analyse in DB speichern (spielmapping kommt vom ersten Spiel)
        const { data: analyseRow, error: analyseError } = await supabase
          .from('analyses')
          .insert(buildAnalyseRow(materialId, analyse, lernziel, lernpfad))
          .select()
          .single()
        if (analyseError) throw analyseError

        // GameFlow anlegen (war: einheit)
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

        // ── Phase 2: Spielmapping einmal — N× generateGame ──────────────
        const erlaubteFormateArray: string[] | undefined = Array.isArray(erlaubteFormate) ? erlaubteFormate : undefined

        send({ type: 'progress', label: 'Spielkonzepte werden entwickelt …', percent: 42, schrittIndex: 12 })
        const spielmappingGlobal = await runSpielMapping({
          analyse, lernziel, lernpfad, kontext,
          erlaubteFormate: erlaubteFormateArray,
        })

        // 5 Vorschläge aus dem Mapping — für jedes Spiel einen anderen Rang
        const vorschlaege = [...spielmappingGlobal.vorschlaege].sort((a, b) => a.rang - b.rang)

        send({
          type: 'progress',
          label: anzahlSpiele === 1
            ? 'Aufgaben werden generiert …'
            : `${anzahlSpiele} Spiele werden parallel generiert …`,
          percent: 55,
          schrittIndex: 13,
        })

        // Alle Spiele parallel generieren + jeweils direkt validieren — jedes Spiel
        // bekommt einen Lehrkraft-Check, nicht nur das erste. Dank Prompt Caching
        // sind die Folge-Calls (Gen + Validation) deutlich günstiger.
        //
        // Wichtig: jedes Task feuert eigene Progress-Events, damit der Client
        // sieht, dass etwas passiert (sonst Stille für 60-120s).
        // Progress-Verteilung: 55% (Start) → 80% (alle Spiele generiert) → 92% (alle validiert).
        let generated = 0
        let validated = 0
        const sendGameProgress = () => {
          const genShare = generated / anzahlSpiele         // 0..1
          const valShare = validated / anzahlSpiele         // 0..1
          const percent = Math.round(55 + genShare * 25 + valShare * 12)  // 55 → 92
          send({
            type: 'progress',
            label: validated < anzahlSpiele
              ? `Spiel ${generated}/${anzahlSpiele} generiert · Lehrkraft-Check ${validated}/${anzahlSpiele}`
              : `Lehrkraft-Check ${validated}/${anzahlSpiele} fertig`,
            percent,
            schrittIndex: validated < anzahlSpiele ? 13 : 20,
          })
        }

        const spielErgebnisse = await Promise.all(
          Array.from({ length: anzahlSpiele }, async (_, i) => {
            const vorschlag = vorschlaege[i % vorschlaege.length]
            const spielmappingFuerDiesesSpiel: SpielmappingOutput = {
              ...spielmappingGlobal,
              ausgewaehlter_vorschlag_rang: vorschlag.rang,
              auswahlbegruendung: vorschlag.passung_begruendung,
            }

            const spiel = await generateGame({
              analyse, lernziel, lernpfad,
              spielmapping: spielmappingFuerDiesesSpiel,
              kontext,
              erlaubteFormate: erlaubteFormateArray,
            })
            generated++
            sendGameProgress()

            const spielTitel = (i === 0 && spielname?.trim()) ? spielname.trim() : undefined

            const { data: spielRow, error: spielError } = await supabase
              .from('games')
              .insert({
                ...buildSpielRow(analyseRow.id, user.id, spiel, spielmappingFuerDiesesSpiel, spielTitel),
                game_flow_id: gameFlow.id,
                // Reihenfolge wird gleich nach Sortierung gesetzt
              })
              .select()
              .single()
            if (spielError) throw spielError

            // Validierung direkt im selben Task — bricht den Stream nicht ab, wenn sie fehlschlägt
            try {
              const check = await validateAndCheck({
                analyse, lernziel, lernpfad,
                spielmapping: spielmappingFuerDiesesSpiel,
                spiel,
                abschnitte: material.abschnitte,
              })
              await supabase.from('lehrkraft_checks').insert(buildCheckRow(spielRow.id, check))
            } catch (err) {
              console.error(`[analyze] Validierung Spiel ${i + 1} fehlgeschlagen:`, err)
            }
            validated++
            sendGameProgress()

            return { spiel, spielRow }
          })
        )

        // Didaktische Reihenfolge berechnen und persistieren — leicht → schwer.
        // Komplexität pro Spiel = Mittel der Aufgaben-Komplexität (fällt sonst
        // zwischen den Spielen identisch aus, da gleiche Analyse).
        const sortierbar = spielErgebnisse.map(({ spielRow, spiel }) => {
          const stufenAufgaben: number[] = spiel.schritt_14_aufgaben
            .map((a) => a.komplexitaetsstufe as number | undefined)
            .filter((s): s is number => typeof s === 'number')
          const avgStufe = stufenAufgaben.length > 0
            ? stufenAufgaben.reduce((s, v) => s + v, 0) / stufenAufgaben.length
            : analyse.schritt_6_komplexitaet.stufe
          return {
            game_id: spielRow.id as string,
            komplexitaetsstufe: avgStufe,
            denkhandlungen: analyse.schritt_5_wissensstruktur.denkhandlungen,
            game_engine: spielRow.game_engine as string | null,
          }
        })
        const sortiert = sortiereModule(sortierbar)
        await Promise.all(
          sortiert.map((m, idx) =>
            supabase.from('games').update({ reihenfolge: idx + 1 }).eq('id', m.game_id)
          )
        )
        await supabase
          .from('game_flows')
          .update({ sortiert_am: new Date().toISOString() })
          .eq('id', gameFlow.id)

        const spielIds: string[] = sortiert.map((m) => m.game_id)

        send({ type: 'progress', label: 'Ergebnisse werden gespeichert …', percent: 95, schrittIndex: 20 })
        send({ type: 'done', gameFlowId: gameFlow.id, spielIds, analyseId: analyseRow.id })

      } catch (err) {
        let message = 'Analyse fehlgeschlagen'
        if (err instanceof PipelineValidationError) {
          message = `Validierungsfehler: ${err.message}`
          console.error('[analyze] PipelineValidationError', { schritt: err.schritt, zod: err.zodError.issues, raw: err.rawOutput })
        } else if (err instanceof PipelineJsonError) {
          message = `KI hat kein JSON zurückgegeben: ${err.schritt}`
          console.error('[analyze] PipelineJsonError', { schritt: err.schritt, rawText: err.rawText?.slice(0, 2000) })
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

function buildSpielRow(analyseId: string, lehrerId: string, s: SpielOutput, sm: SpielmappingOutput, spielname?: string) {
  const selectedVorschlag = sm.vorschlaege.find(v => v.rang === sm.ausgewaehlter_vorschlag_rang)
  const aufgaben = s.schritt_14_aufgaben.map((q) => ({
    aufgabe_id: q.aufgabe_id,
    text: q.text,
    antwortformat: q.antwortformat,
    loesungen: q.loesungen,
    distraktoren: q.distraktoren,
    hilfen: q.hilfen,
    abschnitt_ref: q.abschnitt_ref,
    teilkompetenz: q.teilkompetenz,
    komplexitaetsstufe: q.komplexitaetsstufe,
  }))

  return {
    analyse_id: analyseId,
    lehrer_id: lehrerId,
    titel: spielname || (selectedVorschlag
      ? `${selectedVorschlag.name} – ${new Date().toLocaleDateString('de-DE')}`
      : `Spiel – ${new Date().toLocaleDateString('de-DE')}`),
    spieltyp_didaktisch: s.schritt_13_spieltyp_didaktisch,
    game_engine: s.schritt_11_game_engine.engine_typ,
    game_skin: s.schritt_12_game_skin.altersstufe,
    aufgaben,
    zeitregelung_sekunden: null,
    zeitdruck_aktiv: false,
    status: 'entwurf',
  }
}

function buildCheckRow(spielId: string, c: ValidationOutput) {
  const check = c.schritt_21_lehrkraft_check
  return {
    spiel_id: spielId,
    gesamtampel: check.gesamtampel,
    lernziel_original: check.lernziel_original,
    lernziel_mvp_variante: check.lernziel_mvp_variante,
    dimensionen: check.dimensionen,
    lernzielanteile: check.lernzielanteile,
    spielfunktion: check.spielfunktion,
    hinweise_fuer_lehrkraft: check.hinweise_fuer_lehrkraft,
    begruendung_anpassungen: check.begruendung_anpassungen,
    sourcemapping: c.schritt_20_sourcemapping,
    reduktionen: c.schritt_17_reduktion,
  }
}

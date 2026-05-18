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
  const anzahlSpieleGeklemmt = Math.min(Math.max(1, Number(anzahlSpiele) || 1), 12)

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

      // Außerhalb try — für Partial-Failure-Cleanup im catch sichtbar
      let einheit: { id: string } | null = null
      let spielIds: string[] = []

      try {
        const kontext = {
          fach: material.fach,
          jahrgangsstufe: material.jahrgangsstufe,
          schulform: material.schulform,
          bundesland: material.bundesland,
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

        send({ type: 'progress', label: 'Lernpfad wird bestimmt …', percent: 32, schrittIndex: 11 })
        const lernpfad = await determineLernpfad({ analyse, lernziel, kontext })

        // Analyse in DB speichern (spielmapping kommt vom ersten Spiel)
        const { data: analyseRow, error: analyseError } = await supabase
          .from('analyses')
          .insert(buildAnalyseRow(materialId, analyse, lernziel, lernpfad))
          .select()
          .single()
        if (analyseError) throw analyseError

        // Einheit anlegen
        const einheitTitel = spielname?.trim() || `Einheit – ${new Date().toLocaleDateString('de-DE')}`
        const { data: einheitData, error: einheitError } = await supabase
          .from('einheiten')
          .insert({
            lehrer_id: user.id,
            material_id: materialId,
            analyse_id: analyseRow.id,
            titel: einheitTitel,
            zeitrahmen_minuten: zeitrahmenMinuten,
            anzahl_spiele: anzahlSpieleGeklemmt,
          })
          .select()
          .single()
        if (einheitError) throw einheitError
        if (!einheitData) throw new Error('Einheit konnte nicht erstellt werden')
        einheit = einheitData
        const einheitId = einheitData.id

        // ── Phase 2: Spielmapping einmal — N× generateGame ──────────────
        const erlaubteFormateArray: string[] | undefined = Array.isArray(erlaubteFormate) ? erlaubteFormate : undefined

        send({ type: 'progress', label: 'Spielkonzepte werden entwickelt …', percent: 42, schrittIndex: 12 })
        const spielmappingGlobal = await runSpielMapping({
          analyse, lernziel, lernpfad, kontext,
          erlaubteFormate: erlaubteFormateArray,
        })

        // 5 Vorschläge aus dem Mapping — für jedes Spiel einen anderen Rang
        const vorschlaege = [...spielmappingGlobal.vorschlaege].sort((a, b) => a.rang - b.rang)

        send({ type: 'progress', label: `0 von ${anzahlSpieleGeklemmt} Spielen generiert …`, percent: 55, schrittIndex: 14 })

        // Max. 3 parallele Claude-Calls — verhindert Rate-Limit-Fehler bei vielen Spielen
        let fertigeSpiele = 0
        const CONCURRENCY = 3
        const aufgaben = Array.from({ length: anzahlSpieleGeklemmt }, (_, i) => {
          const vorschlag = vorschlaege[i % vorschlaege.length]
          const spielmappingFuerDiesesSpiel: SpielmappingOutput = {
            ...spielmappingGlobal,
            ausgewaehlter_vorschlag_rang: vorschlag.rang,
            auswahlbegruendung: vorschlag.passung_begruendung,
          }
          return { spielmapping: spielmappingFuerDiesesSpiel, index: i }
        })

        const spieleGeneriert: { spiel: SpielOutput; spielmapping: SpielmappingOutput; index: number }[] = []
        for (let start = 0; start < aufgaben.length; start += CONCURRENCY) {
          const batch = aufgaben.slice(start, start + CONCURRENCY)
          const batchErgebnisse = await Promise.all(
            batch.map(({ spielmapping: sm, index: i }) =>
              generateGame({ analyse, lernziel, lernpfad, spielmapping: sm, kontext, erlaubteFormate: erlaubteFormateArray })
                .then(spiel => {
                  fertigeSpiele++
                  const pct = 55 + Math.round((fertigeSpiele / anzahlSpieleGeklemmt) * 33)
                  send({ type: 'progress', label: `${fertigeSpiele} von ${anzahlSpieleGeklemmt} Spielen generiert …`, percent: pct, schrittIndex: 14 })
                  return { spiel, spielmapping: sm, index: i }
                })
            )
          )
          spieleGeneriert.push(...batchErgebnisse)
        }

        send({ type: 'progress', label: 'Ergebnisse werden gespeichert …', percent: 88, schrittIndex: 21 })

        let erstesSpielId: string | null = null
        let erstesSpiel: SpielOutput | null = null

        for (const { spiel, spielmapping: sm, index: i } of spieleGeneriert) {
          const spielTitel = (i === 0 && spielname?.trim()) ? spielname.trim() : undefined
          const { data: spielRow, error: spielError } = await supabase
            .from('games')
            .insert({
              ...buildSpielRow(analyseRow.id, user.id, spiel, sm, spielTitel),
              einheit_id: einheitId,
              reihenfolge: i + 1,
            })
            .select()
            .single()
          if (spielError) throw spielError

          spielIds.push(spielRow.id)

          if (i === 0) {
            erstesSpielId = spielRow.id
            erstesSpiel = spiel
          }
        }

        send({ type: 'progress', label: 'Ergebnisse werden gespeichert …', percent: 95, schrittIndex: 21 })
        send({ type: 'done', einheitId: einheitId, spielIds, analyseId: analyseRow.id })

        // Validierung des ersten Spiels — Stream bleibt offen damit Vercel die Funktion nicht killt
        if (erstesSpielId && erstesSpiel) {
          await validateAndCheck({
            analyse,
            lernziel,
            lernpfad,
            spielmapping: spielmappingGlobal,
            spiel: erstesSpiel,
            abschnitte: material.abschnitte,
          }).then((check) => {
            return supabase.from('lehrkraft_checks').insert(buildCheckRow(erstesSpielId!, check))
          }).catch((err) => {
            console.error('[analyze] Validierung fehlgeschlagen:', err)
          })
        }

      } catch (err) {
        // Einheit mit tatsächlich erstellter Spielanzahl updaten (Partial-Failure)
        if (spielIds.length > 0 && einheit) {
          try {
            await supabase
              .from('einheiten')
              .update({ anzahl_spiele: spielIds.length, status: 'fehlerhaft' })
              .eq('id', einheit.id)
          } catch { /* ignore — best-effort cleanup */ }
        }

        let message = 'Analyse fehlgeschlagen'
        if (err instanceof PipelineValidationError) message = `Validierungsfehler: ${err.message}`
        else if (err instanceof PipelineJsonError) message = `KI hat kein JSON zurückgegeben: ${err.schritt}`
        else if (err instanceof PipelineApiError) {
          const cause = err.cause
          const status = (cause as { status?: number })?.status
          const causeMsg = cause instanceof Error ? cause.message : JSON.stringify(cause)
          message = `KI-API Fehler bei "${err.schritt}" (HTTP ${status ?? '?'}): ${causeMsg}`
          console.error('[analyze] PipelineApiError:', err.schritt, cause)
        }
        else {
          const detail = err instanceof Error ? err.message : JSON.stringify(err)
          message = `Analyse fehlgeschlagen: ${detail}`
          console.error('[analyze]', err)
        }
        send({ type: 'error', message })
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
  }
}

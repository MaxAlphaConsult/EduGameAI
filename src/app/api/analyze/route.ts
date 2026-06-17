import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeMaterial,
  determineLearningObjective,
  determineLernpfad,
  planBausteinSequenz,
  generateInputBaustein,
  runSpielMapping,
  generateGame,
  PipelineValidationError,
  PipelineJsonError,
  PipelineApiError,
} from '@/lib/claude/pipeline'
import { createClient } from '@/lib/supabase/server'
import type { AnalyseOutput, LernzielOutput, LernpfadOutput, SpielmappingOutput, SpielOutput, BausteinSequenzOutput, InputBausteinOutput } from '@/lib/schemas/pipeline'
import { normalizeSkin } from '@/lib/game/theme'

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

        // Analyse in DB speichern. raw_output enthält die rohen Pipeline-Outputs,
        // damit die asynchrone Lehrkraft-Validierung später ohne erneutes
        // Pipeline-Setup darauf zugreifen kann (siehe Migration 011).
        // spielmapping wird gleich nach Phase 2 ergänzt.
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

        // ── Phase 2: Lernsequenz planen ─────────────────────────────────
        // Statt nur Spiele zu erzeugen, plant die KI eine didaktische
        // Bausteinsequenz (Einstieg/Vorwissen/Input/Spiel/Sicherung/…).
        // Das Spiel ist nur ein Baustein-Typ und wird nur nach Passung gewählt.
        const erlaubteFormateArray: string[] | undefined = Array.isArray(erlaubteFormate) ? erlaubteFormate : undefined

        send({ type: 'progress', label: 'Lernsequenz wird geplant …', percent: 40, schrittIndex: 11 })
        const sequenz = await planBausteinSequenz({ analyse, lernziel, lernpfad, kontext, gewuenschteSpiele: anzahlSpiele })

        const bausteine = [...sequenz.bausteine].sort((a, b) => a.position - b.position)
        const spielBausteine = bausteine.filter((b) => b.baustein_typ === 'spiel')
        const inputBausteine = bausteine.filter((b) => b.baustein_typ !== 'spiel')

        // Spielmapping nur, wenn die Sequenz überhaupt Spiel-Bausteine enthält.
        let spielmappingGlobal: SpielmappingOutput | null = null
        if (spielBausteine.length > 0) {
          send({ type: 'progress', label: 'Spielkonzepte werden entwickelt …', percent: 48, schrittIndex: 12 })
          spielmappingGlobal = await runSpielMapping({
            analyse, lernziel, lernpfad, kontext,
            erlaubteFormate: erlaubteFormateArray,
          })
        }

        // Pipeline-Inputs für asynchrone Validierung persistieren — fire-and-forget.
        supabase
          .from('analyses')
          .update({ raw_output: { analyse, lernziel, lernpfad, sequenz, spielmapping: spielmappingGlobal } })
          .eq('id', analyseRow.id)
          .then((res) => {
            if (res.error) console.error('[analyze] raw_output-Update fehlgeschlagen:', res.error)
          })

        // reihenfolge = Sequenzposition (didaktisch geplant, nicht mehr nach
        // Komplexität sortiert). Modul-IDs nach Position sammeln.
        const moduleIdByPosition: Record<number, string> = {}
        const baseKontext = { fach: material.fach, jahrgangsstufe: material.jahrgangsstufe, schulform: material.schulform }

        // ── Phase 3a: Nicht-Spiel-Bausteine (Erklär/Input/Check) ────────
        if (inputBausteine.length > 0) {
          send({ type: 'progress', label: 'Lerninhalte werden erstellt …', percent: 58, schrittIndex: 13 })
        }
        await Promise.all(
          inputBausteine.map(async (b) => {
            const inhalt = await generateInputBaustein({
              analyse, lernziel,
              baustein: {
                baustein_typ: b.baustein_typ,
                titel: b.titel,
                thema: b.thema,
                didaktische_funktion: b.didaktische_funktion,
              },
              kontext: baseKontext,
            })
            const { data: row, error } = await supabase
              .from('games')
              .insert({
                ...buildBausteinRow(analyseRow.id, user.id, b, inhalt),
                game_flow_id: gameFlow.id,
                reihenfolge: b.position,
              })
              .select()
              .single()
            if (error) throw error
            moduleIdByPosition[b.position] = row.id as string
          })
        )

        // ── Phase 3b: Spiel-Bausteine (wie bisher, nur bei Passung) ─────
        const vorschlaege = spielmappingGlobal
          ? [...spielmappingGlobal.vorschlaege].sort((a, b) => a.rang - b.rang)
          : []

        let generated = 0
        const sendGameProgress = () => {
          const percent = Math.round(70 + (generated / Math.max(spielBausteine.length, 1)) * 23) // 70 → 93
          send({ type: 'progress', label: `Spiel ${generated}/${spielBausteine.length} fertig`, percent, schrittIndex: 13 })
        }

        if (spielBausteine.length > 0 && spielmappingGlobal) {
          send({
            type: 'progress',
            label: spielBausteine.length === 1 ? 'Spiel wird generiert …' : `${spielBausteine.length} Spiele werden generiert …`,
            percent: 70,
            schrittIndex: 13,
          })
          await Promise.all(
            spielBausteine.map(async (b, i) => {
              const vorschlag = vorschlaege[i % vorschlaege.length]
              const spielmappingFuerDiesesSpiel: SpielmappingOutput = {
                ...spielmappingGlobal!,
                ausgewaehlter_vorschlag_rang: vorschlag.rang,
                auswahlbegruendung: vorschlag.passung_begruendung,
              }
              const spiel = await generateGame({
                analyse, lernziel, lernpfad,
                spielmapping: spielmappingFuerDiesesSpiel,
                kontext,
                erlaubteFormate: erlaubteFormateArray,
              })
              const { data: row, error } = await supabase
                .from('games')
                .insert({
                  ...buildSpielRow(analyseRow.id, user.id, spiel, spielmappingFuerDiesesSpiel, b.titel),
                  game_flow_id: gameFlow.id,
                  reihenfolge: b.position,
                  baustein_typ: 'spiel',
                  // spiel_output: rohes SpielOutput für die asynchrone Validierung
                  spiel_output: spiel,
                })
                .select()
                .single()
              if (error) throw error
              moduleIdByPosition[b.position] = row.id as string
              generated++
              sendGameProgress()
            })
          )
        }

        await supabase
          .from('game_flows')
          .update({ anzahl_spiele: bausteine.length, sortiert_am: new Date().toISOString() })
          .eq('id', gameFlow.id)

        // Alle Modul-IDs in didaktischer Reihenfolge (= Sequenzposition).
        // Das Frontend stößt darüber pro Modul den Check an; Nicht-Spiel-Module
        // werden in der Check-Route sauber als No-op übersprungen.
        const spielIds: string[] = bausteine
          .map((b) => moduleIdByPosition[b.position])
          .filter((id): id is string => Boolean(id))

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
    // KI darf jetzt aus dem vollen Skin-Pool wählen (alle 15 + 3 Basis-Stufen).
    // Wir nehmen skin_name wenn bekannt, sonst fallen wir auf die Altersstufe zurück.
    game_skin: normalizeSkin(s.schritt_12_game_skin.skin_name, s.schritt_12_game_skin.altersstufe),
    aufgaben,
    zeitregelung_sekunden: null,
    zeitdruck_aktiv: false,
    status: 'entwurf',
  }
}

// Baut eine games-Zeile für einen Nicht-Spiel-Baustein (Erklär/Input/Check).
// Der Erklärinhalt liegt in baustein_inhalt; die Mini-Verständnisfrage als
// einzige Aufgabe in aufgaben[] (nutzt die bestehende /api/answers-Logik).
function buildBausteinRow(
  analyseId: string,
  lehrerId: string,
  b: BausteinSequenzOutput['bausteine'][number],
  inhalt: InputBausteinOutput,
) {
  return {
    analyse_id: analyseId,
    lehrer_id: lehrerId,
    titel: inhalt.titel || b.titel,
    spieltyp_didaktisch: b.didaktische_funktion,
    game_engine: null,
    game_skin: 'analytics',
    baustein_typ: b.baustein_typ,
    baustein_inhalt: {
      markdown: inhalt.markdown,
      kernaussagen: inhalt.kernaussagen,
      didaktische_hinweise: inhalt.didaktische_hinweise,
    },
    aufgaben: [inhalt.mini_check],
    zeitregelung_sekunden: null,
    zeitdruck_aktiv: false,
    status: 'entwurf',
  }
}

// buildCheckRow ist nach Migration 011 in /api/games/[gameId]/check umgezogen.

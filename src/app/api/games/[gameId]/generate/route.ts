import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateInputBaustein,
  generateGame,
  groundingCheck,
  PipelineValidationError,
  PipelineJsonError,
  PipelineTruncationError,
  PipelineApiError,
} from '@/lib/claude/pipeline'
import { buildSpielRow, buildBausteinRow, flacheCheckAufgaben } from '@/lib/claude/build-rows'
import { applyGrounding, type GroundingReport } from '@/lib/claude/grounding'
import type {
  AnalyseOutput,
  LernzielOutput,
  LernpfadOutput,
  SpielmappingOutput,
  SpielOutput,
  BausteinSequenzOutput,
} from '@/lib/schemas/pipeline'

export const maxDuration = 300

type RawOutput = {
  analyse: AnalyseOutput
  lernziel: LernzielOutput
  lernpfad: LernpfadOutput
  sequenz: BausteinSequenzOutput
  spielmapping: SpielmappingOutput | null
  erlaubteFormate?: string[] | null
}

// GET /api/games/[gameId]/generate — Status-Polling für ein einzelnes Modul.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data, error } = await supabase
    .from('games')
    .select('gen_status, gen_error')
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
  return NextResponse.json({ gen_status: data.gen_status ?? 'ready', gen_error: data.gen_error ?? null })
}

// POST /api/games/[gameId]/generate — generiert den INHALT eines einzelnen
// Bausteins (Spiel ODER Erklär-/Input-Baustein) in einem eigenen Lambda mit
// eigenem 5-min-Timeout. Lädt den geplanten Kontext aus analyses.raw_output und
// dem zugehörigen Baustein-Deskriptor; ein hängendes Modul blockiert die anderen
// nicht. Idempotent über gen_status.
export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const force = request.nextUrl.searchParams.get('force') === 'true'

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      id, lehrer_id, baustein_typ, reihenfolge, gen_status, analyse_id,
      analyses ( raw_output, materials ( fach, jahrgangsstufe, schulform, abschnitte ) ),
      game_flows ( zeitrahmen_minuten )
    `)
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .single()

  if (gameError || !game) return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })

  // Idempotenz: schon fertig oder gerade in Arbeit → nicht doppelt generieren.
  if (game.gen_status === 'ready' && !force) {
    return NextResponse.json({ ok: true, status: 'already_ready' })
  }
  if (game.gen_status === 'generating' && !force) {
    return NextResponse.json({ ok: true, status: 'in_progress' }, { status: 202 })
  }

  const analyse = Array.isArray(game.analyses) ? game.analyses[0] : game.analyses
  const raw = analyse?.raw_output as RawOutput | undefined
  if (!raw?.sequenz) {
    return NextResponse.json({ error: 'Geplanter Kontext (raw_output) fehlt' }, { status: 400 })
  }
  const material = analyse ? (Array.isArray(analyse.materials) ? analyse.materials[0] : analyse.materials) : null
  const flow = Array.isArray(game.game_flows) ? game.game_flows[0] : game.game_flows

  const reihenfolge = game.reihenfolge as number
  const descriptor = raw.sequenz.bausteine.find((b) => b.position === reihenfolge)
  if (!descriptor) {
    return NextResponse.json({ error: 'Baustein-Deskriptor nicht in der Sequenz gefunden' }, { status: 400 })
  }

  const kontext = {
    fach: material?.fach ?? '',
    jahrgangsstufe: material?.jahrgangsstufe ?? '',
    schulform: material?.schulform ?? '',
    zeitrahmenMinuten: (flow?.zeitrahmen_minuten ?? 15) as number,
  }

  // C1-Grounding-Quelle: die analysierten Abschnitte (Text gekürzt, damit der
  // Prompt schlank bleibt). Fehlen sie (Alt-Material ohne abschnitte), wird der
  // Grounding-Pass übersprungen.
  const abschnitte = Array.isArray(material?.abschnitte)
    ? (material.abschnitte as Array<{ id?: unknown; text?: unknown }>)
        .filter((a) => a && typeof a.id === 'string' && typeof a.text === 'string')
        .map((a) => ({ id: a.id as string, text: (a.text as string).slice(0, 600) }))
    : []

  // C2-Grounding-Gate: prüft die Aufgaben gegen die Quelle, verwirft nicht
  // gegründete (mind. `minKeep` bleiben) und liefert einen Report zum Markieren.
  async function groundeAufgaben<T extends { aufgabe_id: string; text: string; loesungen: string[]; distraktoren: string[]; hilfen: string[]; abschnitt_ref: string }>(
    liste: T[],
    minKeep: number,
  ): Promise<{ aufgaben: T[]; grounding: GroundingReport | null }> {
    if (abschnitte.length === 0 || liste.length === 0) return { aufgaben: liste, grounding: null }
    const check = await groundingCheck({
      aufgaben: liste.map((a) => ({
        aufgabe_id: a.aufgabe_id, text: a.text, loesungen: a.loesungen,
        distraktoren: a.distraktoren, hilfen: a.hilfen, abschnitt_ref: a.abschnitt_ref,
      })),
      abschnitte,
      kontext: { fach: kontext.fach, jahrgangsstufe: kontext.jahrgangsstufe },
    })
    const { aufgaben, report } = applyGrounding(liste, check, minKeep)
    return { aufgaben, grounding: report }
  }

  // 'generating' markieren (optimistisch), damit parallele Aufrufe 202 bekommen.
  await supabase.from('games').update({ gen_status: 'generating', gen_error: null }).eq('id', gameId)

  try {
    if (game.baustein_typ !== 'spiel') {
      // Gesamtsequenz als Kontext → jeder Baustein baut auf die anderen auf,
      // statt Inhalte/Fragen zu wiederholen (Progression). Inkl. Niveau je Baustein.
      const geordnet = [...raw.sequenz.bausteine].sort((a, b) => a.position - b.position)
      // Niveau ableiten, falls die Planung keins gesetzt hat (Position im Verlauf).
      const niveauAusPosition = (pos: number): 'reproduktion' | 'anwendung' | 'transfer' => {
        const frac = geordnet.length > 1 ? (pos - 1) / (geordnet.length - 1) : 0
        return frac <= 0.4 ? 'reproduktion' : frac <= 0.75 ? 'anwendung' : 'transfer'
      }
      const sequenzKontext = geordnet.map((b) => ({
        position: b.position, baustein_typ: b.baustein_typ, titel: b.titel, thema: b.thema,
        niveau: b.niveau ?? niveauAusPosition(b.position),
      }))
      const niveau = descriptor.niveau ?? niveauAusPosition(reihenfolge)
      const inhalt = await generateInputBaustein({
        analyse: raw.analyse,
        lernziel: raw.lernziel,
        baustein: {
          baustein_typ: descriptor.baustein_typ,
          titel: descriptor.titel,
          thema: descriptor.thema,
          didaktische_funktion: descriptor.didaktische_funktion,
        },
        kontext: { fach: kontext.fach, jahrgangsstufe: kontext.jahrgangsstufe, schulform: kontext.schulform },
        position: reihenfolge,
        niveau,
        sequenzKontext,
        abschnitte,
      })
      // C2: Alle Inline-Checks gegen die Quelle prüfen. minKeep = Anzahl Checks,
      // d.h. im Lerntext wird nur MARKIERT — Verwerfen würde die Text/Check-
      // Sequenz zerreißen. Die Markierungen erscheinen im Grounding-Banner.
      const checkAufgaben = flacheCheckAufgaben(inhalt)
      const { grounding } = await groundeAufgaben(checkAufgaben, checkAufgaben.length)
      const row = buildBausteinRow(game.analyse_id as string, user.id, descriptor, inhalt)
      const { error: upErr } = await supabase
        .from('games')
        .update({
          titel: row.titel,
          spieltyp_didaktisch: row.spieltyp_didaktisch,
          game_engine: row.game_engine,
          game_skin: row.game_skin,
          baustein_inhalt: row.baustein_inhalt,
          aufgaben: row.aufgaben,
          grounding,
          gen_status: 'ready',
          gen_error: null,
        })
        .eq('id', gameId)
      if (upErr) throw upErr
    } else {
      if (!raw.spielmapping) {
        throw new Error('Kein Spielmapping im geplanten Kontext (Sequenz ohne Spiel-Bausteine?)')
      }
      // Per-Spiel-Vorschlag reproduzieren: Index dieses Spiel-Bausteins unter allen
      // Spiel-Bausteinen (nach Position) → dieselbe rang-Rotation wie früher im Loop.
      const spielBausteine = raw.sequenz.bausteine
        .filter((b) => b.baustein_typ === 'spiel')
        .sort((a, b) => a.position - b.position)
      const spielIndex = spielBausteine.findIndex((b) => b.position === reihenfolge)
      if (spielIndex === -1) {
        // Sollte nicht passieren (Deskriptor wurde oben gefunden) — lieber laut
        // scheitern (→ gen_error, neu erzeugbar) als still den falschen Vorschlag nehmen.
        throw new Error(`Spiel-Baustein an Position ${reihenfolge} nicht in der Sequenz gefunden`)
      }
      const vorschlaege = [...raw.spielmapping.vorschlaege].sort((a, b) => a.rang - b.rang)
      const vorschlag = vorschlaege[spielIndex % vorschlaege.length]
      const spielmapping: SpielmappingOutput = {
        ...raw.spielmapping,
        ausgewaehlter_vorschlag_rang: vorschlag.rang,
        auswahlbegruendung: vorschlag.passung_begruendung,
      }

      const spiel: SpielOutput = await generateGame({
        analyse: raw.analyse,
        lernziel: raw.lernziel,
        lernpfad: raw.lernpfad,
        spielmapping,
        kontext: { jahrgangsstufe: kontext.jahrgangsstufe, fach: kontext.fach, zeitrahmenMinuten: kontext.zeitrahmenMinuten },
        // Spiel-Bausteine als Single-Choice generieren → werden unten in ein echtes
        // Arcade-Spiel (Space Invaders / Boss Fight / Sprint-Quiz) verwandelt. Damit ist
        // in JEDEM LernFlow Arcade garantiert. Die Vielfalt der Aufgabenformate lebt in
        // den Lern-Einheiten (Quiz/Lücken/Zuordnen/Unterstreichen), nicht in den Spielen.
        erlaubteFormate: ['single_choice'],
        abschnitte,
      })
      // C2: Aufgaben gegen die Quelle prüfen — nicht gegründete verwerfen
      // (mind. 1 Aufgabe bleibt, sonst nur markieren).
      const { aufgaben: gegruendeteAufgaben, grounding } = await groundeAufgaben(spiel.schritt_14_aufgaben, 1)

      // ── Arcade-Garantie (Schüler-Motivation Nr. 1) ──────────────────
      // Spiel-Bausteine mit Single-Choice-Datenform werden als ECHTES Arcade-Spiel
      // gerendert (gleiche Daten, nur eine motivierende Mechanik). So ist in jedem
      // LernFlow tatsächlich Arcade vorhanden — unabhängig davon, was das Spielmapping
      // vorgeschlagen hätte. Zuordnung/Lückentext/Reihenfolge bleiben unangetastet
      // (deren Datenform passt nicht auf ein Arcade-Spiel).
      const ARCADE_ROTATION = ['space_invaders', 'boss_fight', 'sprint_quiz'] as const
      const istSingleChoiceForm =
        gegruendeteAufgaben.length > 0 &&
        gegruendeteAufgaben.every((a) => a.loesungen.length === 1 && a.distraktoren.length >= 1)
      const schonArcade = gegruendeteAufgaben.every((a) =>
        (['space_invaders', 'boss_fight', 'sprint_quiz', 'escape_room', 'study_bird', 'hangman'] as string[]).includes(a.antwortformat),
      )
      const finaleAufgaben = istSingleChoiceForm && !schonArcade
        ? gegruendeteAufgaben.map((a) => ({ ...a, antwortformat: ARCADE_ROTATION[spielIndex % ARCADE_ROTATION.length] }))
        : gegruendeteAufgaben
      const spielFinal: SpielOutput = { ...spiel, schritt_14_aufgaben: finaleAufgaben }
      const row = buildSpielRow(game.analyse_id as string, user.id, spielFinal, spielmapping, descriptor.titel)
      const { error: upErr } = await supabase
        .from('games')
        .update({
          titel: row.titel,
          spieltyp_didaktisch: row.spieltyp_didaktisch,
          game_engine: row.game_engine,
          game_skin: row.game_skin,
          aufgaben: row.aufgaben,
          spiel_output: spielFinal,
          grounding,
          gen_status: 'ready',
          gen_error: null,
        })
        .eq('id', gameId)
      if (upErr) throw upErr
    }

    return NextResponse.json({ ok: true, status: 'ready' })
  } catch (err) {
    const detail =
      err instanceof PipelineValidationError ||
      err instanceof PipelineJsonError ||
      err instanceof PipelineTruncationError ||
      err instanceof PipelineApiError
        ? err.message
        : err instanceof Error ? err.message : String(err)
    console.error(`[generate ${gameId}] Fehler:`, detail)
    await supabase.from('games').update({ gen_status: 'gen_error', gen_error: detail }).eq('id', gameId)
    return NextResponse.json({ error: 'Generierung fehlgeschlagen', detail }, { status: 500 })
  }
}

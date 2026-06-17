import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAndCheck, PipelineValidationError, PipelineJsonError, PipelineApiError } from '@/lib/claude/pipeline'
import type { AnalyseOutput, LernzielOutput, LernpfadOutput, SpielmappingOutput, SpielOutput, ValidationOutput } from '@/lib/schemas/pipeline'

export const maxDuration = 300

// GET /api/games/[gameId]/check
// Polling-Endpoint für das Lehrkraft-Check-Panel. Liefert:
//   - 200 + { pending: false, check } wenn fertig
//   - 202 + { pending: true } wenn noch keine Validierung existiert
export async function GET(_request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data, error } = await supabase
    .from('lehrkraft_checks')
    .select('*')
    .eq('spiel_id', gameId)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ pending: true }, { status: 202 })

  return NextResponse.json({ pending: false, check: data })
}

// POST /api/games/[gameId]/check
// Startet die Validierung für ein einzelnes Spiel. Wird vom Frontend nach
// erfolgreicher Pipeline-Generierung als Fire-and-Forget pro Spiel aufgerufen.
// Jeder Call läuft als eigenes Lambda mit eigenem 5-min-Timeout — eine
// hängende Validierung blockiert nicht die anderen.
//
// Idempotent: falls bereits ein Check existiert, wird er nicht überschrieben.
// Pipeline-Inputs werden aus analyses.raw_output und games.spiel_output
// geladen (siehe Migration 011).
export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  // ?force=true → existierenden Check löschen und neu erstellen
  // (z.B. nachdem Aufgaben durch KI-Verbesserungsvorschläge aktualisiert wurden,
  // damit der Check nicht mehr auf dem alten Stand basiert).
  const force = request.nextUrl.searchParams.get('force') === 'true'

  const { data: existing } = await supabase
    .from('lehrkraft_checks')
    .select('id')
    .eq('spiel_id', gameId)
    .maybeSingle()

  if (existing && !force) return NextResponse.json({ ok: true, status: 'already_exists' })
  if (existing && force) {
    await supabase.from('lehrkraft_checks').delete().eq('id', existing.id)
  }

  // Spiel + Analyse + Material laden
  const { data: spiel, error: spielError } = await supabase
    .from('games')
    .select(`
      id, lehrer_id, spiel_output, analyse_id, baustein_typ,
      analyses(id, raw_output, materials(abschnitte))
    `)
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .single()

  if (spielError || !spiel) return NextResponse.json({ error: 'Spiel nicht gefunden' }, { status: 404 })

  // Nicht-Spiel-Bausteine (Erklär/Input/Check) durchlaufen keinen Spiel-Check.
  if (spiel.baustein_typ && spiel.baustein_typ !== 'spiel') {
    return NextResponse.json({ ok: true, status: 'skipped_non_spiel' })
  }
  if (!spiel.spiel_output) {
    return NextResponse.json({
      error: 'Spiel hat keinen rohen Pipeline-Output. Wurde es vor Migration 011 erstellt?',
    }, { status: 400 })
  }

  const analyse = Array.isArray(spiel.analyses) ? spiel.analyses[0] : spiel.analyses
  if (!analyse?.raw_output) {
    return NextResponse.json({
      error: 'Analyse hat keine rohen Pipeline-Inputs. Wurde sie vor Migration 011 erstellt?',
    }, { status: 400 })
  }

  const raw = analyse.raw_output as {
    analyse: AnalyseOutput
    lernziel: LernzielOutput
    lernpfad: LernpfadOutput
    spielmapping: SpielmappingOutput
  }

  const material = Array.isArray(analyse.materials) ? analyse.materials[0] : analyse.materials
  const abschnitte = (material?.abschnitte ?? []) as { id: string; text: string }[]

  let check: ValidationOutput
  try {
    check = await validateAndCheck({
      analyse: raw.analyse,
      lernziel: raw.lernziel,
      lernpfad: raw.lernpfad,
      spielmapping: raw.spielmapping,
      spiel: spiel.spiel_output as SpielOutput,
      abschnitte,
    })
  } catch (err) {
    if (err instanceof PipelineValidationError || err instanceof PipelineJsonError || err instanceof PipelineApiError) {
      console.error(`[check ${gameId}] Pipeline-Fehler:`, err)
      return NextResponse.json({ error: 'Validierung fehlgeschlagen', detail: err.message }, { status: 500 })
    }
    console.error(`[check ${gameId}] Unerwarteter Fehler:`, err)
    return NextResponse.json({ error: 'Validierung fehlgeschlagen' }, { status: 500 })
  }

  const c = check.schritt_21_lehrkraft_check
  const { error: insertError } = await supabase.from('lehrkraft_checks').insert({
    spiel_id: gameId,
    gesamtampel: c.gesamtampel,
    lernziel_original: c.lernziel_original,
    lernziel_mvp_variante: c.lernziel_mvp_variante,
    dimensionen: c.dimensionen,
    lernzielanteile: c.lernzielanteile,
    spielfunktion: c.spielfunktion,
    hinweise_fuer_lehrkraft: c.hinweise_fuer_lehrkraft,
    begruendung_anpassungen: c.begruendung_anpassungen,
    sourcemapping: check.schritt_20_sourcemapping,
    reduktionen: check.schritt_17_reduktion,
  })

  if (insertError) {
    console.error(`[check ${gameId}] DB-Insert-Fehler:`, insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'created' })
}

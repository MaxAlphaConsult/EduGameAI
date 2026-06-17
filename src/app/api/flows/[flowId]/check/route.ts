import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { flowLehrkraftCheck, PipelineValidationError, PipelineJsonError, PipelineApiError } from '@/lib/claude/pipeline'

export const maxDuration = 300

// GET /api/flows/[flowId]/check
// Liefert den aktuellen Flow-Check-Stand:
//   200 + { status: 'fertig', check }  — Check liegt vor
//   200 + { status: 'pending' }         — Check läuft gerade
//   200 + { status: 'idle' }            — Noch nie ausgeführt
//   200 + { status: 'fehler', error }   — Letzter Lauf ist fehlgeschlagen
export async function GET(_request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data, error } = await supabase
    .from('game_flows')
    .select('flow_check, flow_check_status, flow_check_aktualisiert_am')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Lernspiel nicht gefunden' }, { status: 404 })

  return NextResponse.json({
    status: data.flow_check_status ?? 'idle',
    check: data.flow_check ?? null,
    aktualisiert_am: data.flow_check_aktualisiert_am,
  })
}

// POST /api/flows/[flowId]/check  (?force=true zum Neuberechnen)
// Startet einen Flow-Check: lädt das Flow-Lernziel + alle Module (Aufgaben,
// Engine, Spieltyp) und schickt das an Claude. Speichert das Ergebnis als
// flow_check (jsonb) zurück auf game_flows.
export async function POST(request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const force = request.nextUrl.searchParams.get('force') === 'true'

  // Aktuellen Status holen — wenn bereits 'fertig' und !force, idempotent zurückgeben
  const { data: flow, error: flowErr } = await supabase
    .from('game_flows')
    .select('id, titel, analyse_id, flow_check_status, analyses(raw_output)')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .maybeSingle()

  if (flowErr || !flow) return NextResponse.json({ error: 'Lernspiel nicht gefunden' }, { status: 404 })

  if (flow.flow_check_status === 'fertig' && !force) {
    return NextResponse.json({ status: 'fertig', already_exists: true })
  }
  if (flow.flow_check_status === 'pending' && !force) {
    return NextResponse.json({ status: 'pending', already_running: true })
  }

  // Pipeline-Inputs aus analyses.raw_output ziehen
  const analyse = Array.isArray(flow.analyses) ? flow.analyses[0] : flow.analyses
  const raw = (analyse?.raw_output ?? {}) as {
    lernziel?: { schritt_7_lernziel?: { original?: string } }
    kontext?: { fach?: string; jahrgangsstufe?: string; schulform?: string }
  }
  const lernziel = raw.lernziel?.schritt_7_lernziel?.original ?? flow.titel ?? ''
  const fach = raw.kontext?.fach ?? '—'
  const jahrgangsstufe = raw.kontext?.jahrgangsstufe ?? '—'
  const schulform = raw.kontext?.schulform ?? '—'

  // Module laden
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, titel, spieltyp_didaktisch, game_engine, reihenfolge, aufgaben, baustein_typ, baustein_inhalt')
    .eq('game_flow_id', flowId)
    .eq('lehrer_id', user.id)

  if (gamesErr || !games || games.length === 0) {
    return NextResponse.json({ error: 'Keine Module gefunden — Flow hat keinen Inhalt zum Prüfen.' }, { status: 400 })
  }

  const sortiert = [...games].sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
  const moduleInput = sortiert.map((g, i) => {
    const inhalt = g.baustein_inhalt as { markdown?: string } | null
    return {
      modul_id: g.id,
      modul_position: g.reihenfolge ?? i + 1,
      titel: g.titel ?? `Modul ${i + 1}`,
      baustein_typ: g.baustein_typ ?? 'spiel',
      spieltyp_didaktisch: g.spieltyp_didaktisch ?? null,
      game_engine: g.game_engine ?? null,
      // Bei Erklär-/Input-Bausteinen den Inhalt mitgeben (statt Aufgaben),
      // damit der Check sieht, welches Wissen hier VERMITTELT wird.
      erklaer_inhalt: inhalt?.markdown ?? null,
      aufgaben: g.aufgaben ?? [],
    }
  })

  // Status auf pending
  await supabase
    .from('game_flows')
    .update({ flow_check_status: 'pending', flow_check_aktualisiert_am: new Date().toISOString() })
    .eq('id', flowId)

  // Claude-Call (5-Min-Lambda)
  try {
    const check = await flowLehrkraftCheck({
      lernziel,
      fach,
      jahrgangsstufe,
      schulform,
      module: moduleInput,
    })

    await supabase
      .from('game_flows')
      .update({
        flow_check: check,
        flow_check_status: 'fertig',
        flow_check_aktualisiert_am: new Date().toISOString(),
      })
      .eq('id', flowId)

    return NextResponse.json({ status: 'fertig', check })
  } catch (err) {
    let detail = 'Unbekannter Fehler'
    if (err instanceof PipelineValidationError || err instanceof PipelineJsonError || err instanceof PipelineApiError) {
      detail = err.message
    }
    console.error(`[flow-check ${flowId}]`, err)
    await supabase
      .from('game_flows')
      .update({ flow_check_status: 'fehler', flow_check_aktualisiert_am: new Date().toISOString() })
      .eq('id', flowId)
    return NextResponse.json({ status: 'fehler', error: detail }, { status: 500 })
  }
}

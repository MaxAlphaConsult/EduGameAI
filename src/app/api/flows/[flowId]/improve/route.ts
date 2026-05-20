import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { flowImprove, PipelineValidationError, PipelineJsonError, PipelineApiError } from '@/lib/claude/pipeline'

export const maxDuration = 300

// POST /api/flows/[flowId]/improve
// Generiert KI-Verbesserungs-Vorschläge für den ganzen Flow basierend auf dem
// flow_check. Schreibt nichts in die DB — gibt nur die Vorschläge zurück.
// Die Anwendung (Übernahme ausgewählter Vorschläge) passiert via PATCH.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data: flow, error: flowErr } = await supabase
    .from('game_flows')
    .select('id, titel, flow_check, flow_check_status, analyses(raw_output)')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .maybeSingle()
  if (flowErr || !flow) return NextResponse.json({ error: 'Lernspiel nicht gefunden' }, { status: 404 })

  if (flow.flow_check_status !== 'fertig' || !flow.flow_check) {
    return NextResponse.json({
      error: 'Bitte erst den Flow-Lehrkraft-Check ausführen — die KI braucht ihn als Grundlage für die Vorschläge.',
    }, { status: 400 })
  }

  const analyse = Array.isArray(flow.analyses) ? flow.analyses[0] : flow.analyses
  const raw = (analyse?.raw_output ?? {}) as {
    lernziel?: { schritt_7_lernziel?: { original?: string } }
    kontext?: { fach?: string; jahrgangsstufe?: string; schulform?: string }
  }
  const lernziel = raw.lernziel?.schritt_7_lernziel?.original ?? flow.titel ?? ''
  const fach = raw.kontext?.fach ?? '—'
  const jahrgangsstufe = raw.kontext?.jahrgangsstufe ?? '—'
  const schulform = raw.kontext?.schulform ?? '—'

  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, titel, spieltyp_didaktisch, game_engine, reihenfolge, aufgaben')
    .eq('game_flow_id', flowId)
    .eq('lehrer_id', user.id)

  if (gamesErr || !games || games.length === 0) {
    return NextResponse.json({ error: 'Keine Module zum Verbessern gefunden.' }, { status: 400 })
  }

  const sortiert = [...games].sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
  const moduleInput = sortiert.map((g, i) => ({
    modul_id: g.id,
    modul_position: g.reihenfolge ?? i + 1,
    titel: g.titel ?? `Modul ${i + 1}`,
    spieltyp_didaktisch: g.spieltyp_didaktisch ?? null,
    game_engine: g.game_engine ?? null,
    aufgaben: g.aufgaben ?? [],
  }))

  try {
    const result = await flowImprove({
      lernziel,
      fach,
      jahrgangsstufe,
      schulform,
      flow_check: flow.flow_check,
      module: moduleInput,
    })
    return NextResponse.json(result)
  } catch (err) {
    let detail = 'Unbekannter Fehler'
    if (err instanceof PipelineValidationError || err instanceof PipelineJsonError || err instanceof PipelineApiError) {
      detail = err.message
    }
    console.error(`[flow-improve ${flowId}]`, err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

// PATCH /api/flows/[flowId]/improve
// Wendet die vom Lehrer akzeptierten Änderungen an. Der Client übergibt pro
// Modul die finale neue `aufgaben`-Liste — der Server validiert Ownership
// und schreibt alle Module in einer Schleife (RLS pro Row).
//
// Nach erfolgreichem Schreiben wird der flow_check_status auf 'idle'
// gesetzt, damit der Lehrer einen neuen Check ausführen kann (alte Bewertung
// ist nicht mehr gültig, da Aufgaben sich geändert haben).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  type ModulUpdate = { modul_id: string; aufgaben: unknown[] }
  let body: { modul_updates?: ModulUpdate[] } = {}
  try { body = await request.json() } catch { /* leer ok */ }

  if (!Array.isArray(body.modul_updates) || body.modul_updates.length === 0) {
    return NextResponse.json({ error: 'modul_updates fehlt oder ist leer' }, { status: 400 })
  }

  // Owner-Check über Flow
  const { data: flow } = await supabase
    .from('game_flows')
    .select('id')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .maybeSingle()
  if (!flow) return NextResponse.json({ error: 'Lernspiel nicht gefunden' }, { status: 404 })

  // Pro Modul-Update: RLS-geschützt schreiben
  const updated: string[] = []
  for (const upd of body.modul_updates) {
    if (!upd.modul_id || !Array.isArray(upd.aufgaben)) continue
    const { error, data } = await supabase
      .from('games')
      .update({ aufgaben: upd.aufgaben })
      .eq('id', upd.modul_id)
      .eq('lehrer_id', user.id)
      .eq('game_flow_id', flowId)
      .select('id')
    if (error) {
      console.error(`[flow-improve apply ${upd.modul_id}]`, error)
      return NextResponse.json({ error: `Update für Modul ${upd.modul_id} fehlgeschlagen: ${error.message}` }, { status: 500 })
    }
    if (data && data.length > 0) updated.push(upd.modul_id)
  }

  // Flow-Check als veraltet markieren
  await supabase
    .from('game_flows')
    .update({ flow_check_status: 'idle' })
    .eq('id', flowId)

  return NextResponse.json({ ok: true, updated_module_ids: updated })
}

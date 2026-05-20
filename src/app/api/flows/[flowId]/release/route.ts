import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/flow/access-code'
import { sortiereModule } from '@/lib/flow/ordering'

// POST /api/flows/:flowId/release  body { classId }
// Gibt einen GameFlow für eine Klasse frei und erzeugt einen klassenweiten
// AccessCode. Stellt sicher, dass:
//   - alle Module des Flows in den finalen Reihenfolge-Werten 1..N stehen
//   - alle Module den Status `freigegeben` haben
//   - eine eindeutige access_code-Zeile in flow_releases entsteht
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  let body: { classId?: string } = {}
  try { body = await request.json() } catch { /* leerer body ok */ }
  if (!body.classId) {
    return NextResponse.json({ error: 'classId fehlt' }, { status: 400 })
  }

  // Flow + Module + Klasse parallel laden
  const [
    { data: flow, error: flowErr },
    { data: games, error: gamesErr },
    { data: klasse, error: klasseErr },
  ] = await Promise.all([
    supabase
      .from('game_flows')
      .select('id, titel, lehrer_id, analyse_id')
      .eq('id', flowId)
      .eq('lehrer_id', user.id)
      .single(),
    supabase
      .from('games')
      .select('id, status, reihenfolge, game_engine, aufgaben, analyses(komplexitaetsstufe, denkhandlungen)')
      .eq('game_flow_id', flowId)
      .eq('lehrer_id', user.id),
    supabase
      .from('classes')
      .select('id, name, lehrer_id')
      .eq('id', body.classId)
      .eq('lehrer_id', user.id)
      .single(),
  ])

  if (flowErr || !flow) return NextResponse.json({ error: 'Flow nicht gefunden' }, { status: 404 })
  if (klasseErr || !klasse) return NextResponse.json({ error: 'Klasse nicht gefunden' }, { status: 404 })
  if (gamesErr || !games || games.length === 0) {
    return NextResponse.json({ error: 'Flow enthält keine Module' }, { status: 400 })
  }

  // Defensive Re-Sortierung: falls jemand die Reihenfolge manuell zerschossen
  // hat, oder noch nie sortiert wurde — wir setzen sie hier nochmal sauber.
  const sortierbar = games.map((g) => {
    const analyse = Array.isArray(g.analyses) ? g.analyses[0] : g.analyses
    const aufgaben = (g.aufgaben ?? []) as { komplexitaetsstufe?: number }[]
    const stufen = aufgaben.map((a) => a.komplexitaetsstufe).filter((s): s is number => typeof s === 'number')
    const avgStufe = stufen.length > 0
      ? stufen.reduce((s, v) => s + v, 0) / stufen.length
      : analyse?.komplexitaetsstufe ?? 4
    return {
      game_id: g.id as string,
      komplexitaetsstufe: avgStufe,
      denkhandlungen: analyse?.denkhandlungen as string[] | undefined,
      game_engine: g.game_engine as string | null,
    }
  })
  const sortiert = sortiereModule(sortierbar)

  // Reihenfolge + Status sequenziell schreiben (RLS-sicher)
  for (let i = 0; i < sortiert.length; i++) {
    const { error } = await supabase
      .from('games')
      .update({ reihenfolge: i + 1, status: 'freigegeben' })
      .eq('id', sortiert[i].game_id)
      .eq('lehrer_id', user.id)
    if (error) return NextResponse.json({ error: `Modul-Update fehlgeschlagen: ${error.message}` }, { status: 500 })
  }

  await supabase
    .from('game_flows')
    .update({ status: 'freigegeben', sortiert_am: new Date().toISOString() })
    .eq('id', flowId)

  // Existiert schon ein aktives Release für (flow, klasse)? Dann zurückgeben.
  const { data: existing } = await supabase
    .from('flow_releases')
    .select('id, access_code, status')
    .eq('game_flow_id', flowId)
    .eq('class_id', body.classId)
    .maybeSingle()

  if (existing && existing.status === 'aktiv') {
    return NextResponse.json({
      release: existing,
      flow: { id: flow.id, titel: flow.titel },
      module_anzahl: sortiert.length,
    })
  }

  // Bei archiviertem Release: re-aktivieren mit neuem Code
  // Sonst: neu anlegen, max. 5 Retries bei Code-Kollision
  for (let attempt = 0; attempt < 5; attempt++) {
    const access_code = generateAccessCode({ flowTitel: flow.titel, klassenName: klasse.name })
    if (existing) {
      const { data: updated, error } = await supabase
        .from('flow_releases')
        .update({ access_code, status: 'aktiv', released_at: new Date().toISOString(), archived_at: null })
        .eq('id', existing.id)
        .select()
        .single()
      if (!error && updated) {
        return NextResponse.json({
          release: updated,
          flow: { id: flow.id, titel: flow.titel },
          module_anzahl: sortiert.length,
        })
      }
      if (!error?.message?.includes('access_code')) {
        return NextResponse.json({ error: error?.message ?? 'Release fehlgeschlagen' }, { status: 500 })
      }
    } else {
      const { data: created, error } = await supabase
        .from('flow_releases')
        .insert({ game_flow_id: flowId, class_id: body.classId, access_code, status: 'aktiv' })
        .select()
        .single()
      if (!error && created) {
        return NextResponse.json({
          release: created,
          flow: { id: flow.id, titel: flow.titel },
          module_anzahl: sortiert.length,
        })
      }
      if (!error?.message?.includes('access_code')) {
        return NextResponse.json({ error: error?.message ?? 'Release fehlgeschlagen' }, { status: 500 })
      }
    }
    // Code-Kollision → erneut versuchen
  }

  return NextResponse.json({ error: 'AccessCode-Kollision nach 5 Versuchen' }, { status: 500 })
}

// DELETE /api/flows/:flowId/release  body { releaseId }
// Archiviert ein Release (Code wird invalide, aber Antworten bleiben erhalten).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  await params // nur zur Vereinheitlichung
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { releaseId } = await request.json()
  if (!releaseId) return NextResponse.json({ error: 'releaseId fehlt' }, { status: 400 })

  const { error } = await supabase
    .from('flow_releases')
    .update({ status: 'archiviert', archived_at: new Date().toISOString() })
    .eq('id', releaseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

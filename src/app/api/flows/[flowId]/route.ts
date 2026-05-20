import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/flows/:flowId
// Löscht ein komplettes Lernspiel (Flow + alle Module-Games).
// flow_releases, student_sessions, module_sessions, answers werden via
// ON DELETE CASCADE entlang der FK-Kette automatisch entsorgt. games.game_flow_id
// ist ON DELETE SET NULL — die zugehörigen Module müssen daher explizit
// gelöscht werden, damit keine Waisen-Zeilen liegen bleiben.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  // Owner-Check via SELECT (RLS würde sonst stillschweigend 0 Zeilen liefern)
  const { data: flow, error: flowErr } = await supabase
    .from('game_flows')
    .select('id')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .maybeSingle()
  if (flowErr) return NextResponse.json({ error: flowErr.message }, { status: 500 })
  if (!flow) return NextResponse.json({ error: 'Lernspiel nicht gefunden' }, { status: 404 })

  // 1. Module-Games löschen (FK ist SET NULL, sonst bleiben sie als Waisen liegen)
  const { error: gamesErr } = await supabase
    .from('games')
    .delete()
    .eq('game_flow_id', flowId)
    .eq('lehrer_id', user.id)
  if (gamesErr) return NextResponse.json({ error: `Module löschen fehlgeschlagen: ${gamesErr.message}` }, { status: 500 })

  // 2. Den Flow selbst löschen — .select() zwingt Postgres die gelöschten Zeilen
  // zurückzuliefern. Bei fehlender DELETE-Policy ist `deleted` leer ohne Error
  // (RLS blockiert still), also explizit auf rowcount prüfen.
  const { data: deleted, error: flowDelErr } = await supabase
    .from('game_flows')
    .delete()
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .select('id')
  if (flowDelErr) return NextResponse.json({ error: `Lernspiel löschen fehlgeschlagen: ${flowDelErr.message}` }, { status: 500 })
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({
      error: 'Löschen wurde von der Datenbank blockiert. Wahrscheinlich fehlt die DELETE-Policy auf game_flows — bitte Migration 012_game_flows_delete_policy.sql in Supabase ausführen.',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

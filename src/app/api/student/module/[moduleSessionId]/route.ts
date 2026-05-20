import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/student/module/:moduleSessionId
// Liefert das Game inkl. Aufgaben für das aktuell laufende module_session.
// Wird vom Flow-Player aufgerufen, sobald ein neues Modul startet.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ moduleSessionId: string }> }
) {
  const { moduleSessionId } = await params
  const supabase = await createClient()

  const { data: ms } = await supabase
    .from('module_sessions')
    .select('id, game_id, position, niveau, status, games(id, titel, game_skin, aufgaben, status)')
    .eq('id', moduleSessionId)
    .maybeSingle()

  if (!ms) return NextResponse.json({ error: 'Modul-Session nicht gefunden' }, { status: 404 })

  const game = Array.isArray(ms.games) ? ms.games[0] : ms.games
  if (!game || game.status !== 'freigegeben') {
    return NextResponse.json({ error: 'Spiel nicht freigegeben' }, { status: 403 })
  }

  return NextResponse.json({
    moduleSessionId: ms.id,
    gameId: game.id,
    titel: game.titel,
    gameSkin: game.game_skin,
    aufgaben: game.aufgaben ?? [],
    niveau: ms.niveau,
    position: ms.position,
    status: ms.status,
  })
}

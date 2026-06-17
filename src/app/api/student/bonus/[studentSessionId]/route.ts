import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/student/bonus/:studentSessionId
// Liefert die Spiel-Bausteine des Flows zum freiwilligen Weiterspielen NACH
// Abschluss der Lernreise. Diese Bonus-Runde fließt NICHT in die Diagnose —
// der Player spielt sie im Preview-Modus (kein /api/answers).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentSessionId: string }> }
) {
  const { studentSessionId } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('student_sessions')
    .select('id, flow_release_id')
    .eq('id', studentSessionId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })

  const { data: release } = await supabase
    .from('flow_releases')
    .select('game_flow_id')
    .eq('id', session.flow_release_id)
    .maybeSingle()
  if (!release) return NextResponse.json({ spiele: [] })

  const { data: games } = await supabase
    .from('games')
    .select('id, titel, game_skin, aufgaben, reihenfolge, baustein_typ, status')
    .eq('game_flow_id', release.game_flow_id)
    .eq('baustein_typ', 'spiel')
    .eq('status', 'freigegeben')

  const spiele = (games ?? [])
    .filter((g) => Array.isArray(g.aufgaben) && g.aufgaben.length > 0)
    .sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
    .map((g) => ({
      gameId: g.id,
      titel: g.titel ?? 'Spiel',
      gameSkin: g.game_skin ?? 'mittelstufe',
      aufgaben: g.aufgaben ?? [],
    }))

  return NextResponse.json({ spiele })
}

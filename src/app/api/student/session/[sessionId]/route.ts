import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/student/session/:sessionId
// Vom Flow-Player aufgerufen, um nach Reload/Refresh zu wissen, welches
// Modul gerade aktiv ist. Der Browser kennt nur die studentSessionId aus der
// URL — Re-Authentifizierung ist nicht nötig, da die ID ein hinreichendes
// Geheimnis ist (UUID). Keine sensiblen Daten werden zurückgegeben.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('student_sessions')
    .select(`
      id, aktuelles_modul_index, modul_anzahl, lernpfad_abgeschlossen,
      flow_release_id, code,
      flow_releases(status, game_flow_id)
    `)
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })

  const release = Array.isArray(session.flow_releases) ? session.flow_releases[0] : session.flow_releases
  if (!release || release.status !== 'aktiv') {
    return NextResponse.json({ error: 'Flow ist nicht mehr aktiv' }, { status: 410 })
  }

  if (session.lernpfad_abgeschlossen) {
    return NextResponse.json({
      studentSessionId: session.id,
      aktuelles_modul_index: session.modul_anzahl,
      modul_anzahl: session.modul_anzahl,
      abgeschlossen: true,
      aktuelles_modul: null,
    })
  }

  // Aktuelles Modul = Game an Position aktuelles_modul_index
  const { data: game } = await supabase
    .from('games')
    .select('id, titel, game_skin, reihenfolge')
    .eq('game_flow_id', release.game_flow_id)
    .eq('status', 'freigegeben')
    .order('reihenfolge', { ascending: true })
    .range(session.aktuelles_modul_index, session.aktuelles_modul_index)
    .maybeSingle()

  if (!game) return NextResponse.json({ error: 'Aktuelles Modul nicht gefunden' }, { status: 500 })

  // Module-Session zu diesem Position-Slot finden (sollte existieren)
  const { data: ms } = await supabase
    .from('module_sessions')
    .select('id, niveau')
    .eq('student_session_id', session.id)
    .eq('position', session.aktuelles_modul_index)
    .maybeSingle()

  if (!ms) {
    return NextResponse.json({ error: 'Modul-Session inkonsistent' }, { status: 500 })
  }

  return NextResponse.json({
    studentSessionId: session.id,
    aktuelles_modul_index: session.aktuelles_modul_index,
    modul_anzahl: session.modul_anzahl,
    abgeschlossen: false,
    aktuelles_modul: {
      moduleSessionId: ms.id,
      gameId: game.id,
      gameSkin: game.game_skin,
      titel: game.titel,
      position: session.aktuelles_modul_index,
      niveau: ms.niveau,
    },
  })
}

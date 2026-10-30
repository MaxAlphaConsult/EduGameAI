import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { istUuid } from '@/lib/flow/ids'
import { sitzungLesen } from '@/lib/flow/schueler-db'

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
  if (!istUuid(sessionId)) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })

  const supabase = await createClient()

  const { zeile: session, fehler } = await sitzungLesen(supabase, sessionId)
  if (fehler) {
    console.error('[student/session] schueler_sitzung_lesen', fehler)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
  if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })

  if (session.release_status !== 'aktiv') {
    return NextResponse.json({ error: 'Flow ist nicht mehr aktiv' }, { status: 410 })
  }

  if (session.lernpfad_abgeschlossen) {
    return NextResponse.json({
      studentSessionId: session.student_session_id,
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
    .eq('game_flow_id', session.game_flow_id)
    .eq('status', 'freigegeben')
    .order('reihenfolge', { ascending: true })
    .range(session.aktuelles_modul_index, session.aktuelles_modul_index)
    .maybeSingle()

  if (!game) return NextResponse.json({ error: 'Aktuelles Modul nicht gefunden' }, { status: 500 })

  // Die Modul-Sitzung zur aktuellen Position liefert schueler_sitzung_lesen mit.
  if (!session.modul_sitzung_id || !session.modul_niveau) {
    return NextResponse.json({ error: 'Modul-Session inkonsistent' }, { status: 500 })
  }

  return NextResponse.json({
    studentSessionId: session.student_session_id,
    aktuelles_modul_index: session.aktuelles_modul_index,
    modul_anzahl: session.modul_anzahl,
    abgeschlossen: false,
    aktuelles_modul: {
      moduleSessionId: session.modul_sitzung_id,
      gameId: game.id,
      gameSkin: game.game_skin,
      titel: game.titel,
      position: session.aktuelles_modul_index,
      niveau: session.modul_niveau,
    },
  })
}

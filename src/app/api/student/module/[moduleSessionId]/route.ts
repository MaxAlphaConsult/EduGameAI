import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { istUuid } from '@/lib/flow/ids'
import { modulSitzungLesen } from '@/lib/flow/schueler-db'

// GET /api/student/module/:moduleSessionId
// Liefert das Game inkl. Aufgaben für das aktuell laufende module_session.
// Wird vom Flow-Player aufgerufen, sobald ein neues Modul startet.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ moduleSessionId: string }> }
) {
  const { moduleSessionId } = await params
  if (!istUuid(moduleSessionId)) {
    return NextResponse.json({ error: 'Modul-Session nicht gefunden' }, { status: 404 })
  }

  const supabase = await createClient()

  const { zeile: ms, fehler } = await modulSitzungLesen(supabase, moduleSessionId)
  if (fehler) {
    console.error('[student/module] schueler_modul_lesen', fehler)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
  if (!ms) return NextResponse.json({ error: 'Modul-Session nicht gefunden' }, { status: 404 })

  // games bleibt für anon lesbar, solange freigegeben (Spielinhalt, keine
  // personenbezogenen Daten).
  const { data: game } = await supabase
    .from('games')
    .select('id, titel, game_skin, aufgaben, status, baustein_typ, baustein_inhalt')
    .eq('id', ms.game_id)
    .maybeSingle()

  if (!game || game.status !== 'freigegeben') {
    return NextResponse.json({ error: 'Spiel nicht freigegeben' }, { status: 403 })
  }

  return NextResponse.json({
    moduleSessionId: ms.modul_sitzung_id,
    gameId: game.id,
    titel: game.titel,
    gameSkin: game.game_skin,
    aufgaben: game.aufgaben ?? [],
    bausteinTyp: game.baustein_typ ?? 'spiel',
    bausteinInhalt: game.baustein_inhalt ?? null,
    niveau: ms.niveau,
    position: ms.position,
    status: ms.status,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { niveauFuerPosition } from '@/lib/flow/ordering'

// POST /api/student/next-module  body { studentSessionId, currentModuleSessionId }
// Markiert das aktuelle Modul als abgeschlossen und erstellt — falls noch ein
// weiteres Modul folgt — eine neue module_session. Wenn alle Module durch
// sind, wird student_sessions.lernpfad_abgeschlossen gesetzt und der Flow als
// finished zurückgegeben.
export async function POST(request: NextRequest) {
  try {
    const { studentSessionId, currentModuleSessionId } = await request.json()
    if (!studentSessionId || !currentModuleSessionId) {
      return NextResponse.json({ error: 'studentSessionId und currentModuleSessionId erforderlich' }, { status: 400 })
    }

    const supabase = await createClient()

    // Session + Release laden
    const { data: session } = await supabase
      .from('student_sessions')
      .select('id, flow_release_id, aktuelles_modul_index, modul_anzahl, lernpfad_abgeschlossen, flow_releases(game_flow_id, status)')
      .eq('id', studentSessionId)
      .maybeSingle()

    if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
    if (session.lernpfad_abgeschlossen) {
      return NextResponse.json({ finished: true, naechstes_modul: null })
    }

    const release = Array.isArray(session.flow_releases) ? session.flow_releases[0] : session.flow_releases
    if (!release || release.status !== 'aktiv') {
      return NextResponse.json({ error: 'Flow ist nicht mehr aktiv' }, { status: 410 })
    }

    // Aktuelles module_session abschließen
    await supabase
      .from('module_sessions')
      .update({ status: 'abgeschlossen', abgeschlossen_am: new Date().toISOString() })
      .eq('id', currentModuleSessionId)
      .eq('student_session_id', session.id)

    const naechsterIndex = session.aktuelles_modul_index + 1

    // Flow zu Ende?
    if (naechsterIndex >= session.modul_anzahl) {
      await supabase
        .from('student_sessions')
        .update({
          aktuelles_modul_index: session.modul_anzahl,
          lernpfad_abgeschlossen: true,
          abgeschlossen_am: new Date().toISOString(),
        })
        .eq('id', session.id)

      return NextResponse.json({ finished: true, naechstes_modul: null })
    }

    // Nächstes Modul aus dem Flow laden
    const { data: nextGame } = await supabase
      .from('games')
      .select('id, titel, game_skin, reihenfolge')
      .eq('game_flow_id', release.game_flow_id)
      .eq('status', 'freigegeben')
      .order('reihenfolge', { ascending: true })
      .range(naechsterIndex, naechsterIndex)
      .maybeSingle()

    if (!nextGame) {
      // Konsistenzproblem: Index gültig, aber kein Game — als finished behandeln
      await supabase
        .from('student_sessions')
        .update({ lernpfad_abgeschlossen: true, abgeschlossen_am: new Date().toISOString() })
        .eq('id', session.id)
      return NextResponse.json({ finished: true, naechstes_modul: null })
    }

    const niveau = niveauFuerPosition(naechsterIndex, session.modul_anzahl)

    const { data: ms, error: msErr } = await supabase
      .from('module_sessions')
      .insert({
        student_session_id: session.id,
        game_id: nextGame.id,
        position: naechsterIndex,
        niveau,
        status: 'laufend',
      })
      .select()
      .single()

    if (msErr || !ms) {
      return NextResponse.json({ error: 'Folge-Modul konnte nicht gestartet werden' }, { status: 500 })
    }

    await supabase
      .from('student_sessions')
      .update({ aktuelles_modul_index: naechsterIndex })
      .eq('id', session.id)

    return NextResponse.json({
      finished: false,
      naechstes_modul: {
        moduleSessionId: ms.id,
        gameId: nextGame.id,
        gameSkin: nextGame.game_skin,
        titel: nextGame.titel,
        position: naechsterIndex,
        niveau,
      },
    })
  } catch (err) {
    console.error('[student/next-module]', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { niveauFuerPosition } from '@/lib/flow/ordering'
import { istUuid } from '@/lib/flow/ids'
import { sitzungLesen } from '@/lib/flow/schueler-db'

// POST /api/student/next-module  body { studentSessionId, currentModuleSessionId }
// Markiert das aktuelle Modul als abgeschlossen und erstellt — falls noch ein
// weiteres Modul folgt — eine neue module_session. Wenn alle Module durch
// sind, wird student_sessions.lernpfad_abgeschlossen gesetzt und der Flow als
// finished zurückgegeben.
//
// Das Schreiben übernimmt schueler_modul_weiter (Migration 022) in einer
// Transaktion. Sie prüft, dass das nächste Modul zum Flow gehört und dass die
// übergebene Modul-Sitzung die aktuelle ist.
export async function POST(request: NextRequest) {
  try {
    const { studentSessionId, currentModuleSessionId } = await request.json()
    if (!studentSessionId || !currentModuleSessionId) {
      return NextResponse.json({ error: 'studentSessionId und currentModuleSessionId erforderlich' }, { status: 400 })
    }
    if (!istUuid(studentSessionId) || !istUuid(currentModuleSessionId)) {
      return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
    }

    const supabase = await createClient()

    const { zeile: session, fehler } = await sitzungLesen(supabase, studentSessionId)
    if (fehler) {
      console.error('[student/next-module] schueler_sitzung_lesen', fehler)
      return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
    }
    if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
    if (session.lernpfad_abgeschlossen) {
      return NextResponse.json({ finished: true, naechstes_modul: null })
    }
    if (session.release_status !== 'aktiv') {
      return NextResponse.json({ error: 'Flow ist nicht mehr aktiv' }, { status: 410 })
    }

    const naechsterIndex = session.aktuelles_modul_index + 1

    // Nächstes Modul aus dem Flow laden. Gibt es keins (Flow zu Ende oder
    // Index ohne Game), schließt die Funktion den Lernpfad ab.
    const { data: nextGame } = naechsterIndex < session.modul_anzahl
      ? await supabase
          .from('games')
          .select('id, titel, game_skin, reihenfolge')
          .eq('game_flow_id', session.game_flow_id)
          .eq('status', 'freigegeben')
          .order('reihenfolge', { ascending: true })
          .range(naechsterIndex, naechsterIndex)
          .maybeSingle()
      : { data: null }

    const niveau = niveauFuerPosition(naechsterIndex, session.modul_anzahl)

    const { data: neueModulSitzung, error: weiterErr } = await supabase.rpc('schueler_modul_weiter', {
      p_student_session_id: studentSessionId,
      p_modul_sitzung_id: currentModuleSessionId,
      p_naechstes_game_id: nextGame?.id ?? null,
      p_niveau: niveau,
    })

    if (weiterErr) {
      // PT409: Die übergebene Modul-Sitzung ist nicht mehr die aktuelle,
      // etwa nach einem zweiten Klick auf „Weiter". Bis Migration 024 kam
      // dafür 40001, das PostgREST bis zum Timeout wiederholt.
      if (weiterErr.code === 'PT409' || weiterErr.code === '40001') {
        return NextResponse.json({ error: 'Modul wurde schon abgeschlossen' }, { status: 409 })
      }
      if (weiterErr.code === '55000') {
        return NextResponse.json({ error: 'Flow ist nicht mehr aktiv' }, { status: 410 })
      }
      console.error('[student/next-module] schueler_modul_weiter', weiterErr)
      return NextResponse.json({ error: 'Folge-Modul konnte nicht gestartet werden' }, { status: 500 })
    }

    if (!neueModulSitzung || !nextGame) {
      return NextResponse.json({ finished: true, naechstes_modul: null })
    }

    return NextResponse.json({
      finished: false,
      naechstes_modul: {
        moduleSessionId: neueModulSitzung as string,
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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { niveauFuerPosition } from '@/lib/flow/ordering'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/student/start-session  body { flowReleaseId, studentCode }
// Stufe 2 des Schüler-Logins: validiert den persönlichen Tier-Code gegen die
// Klasse des FlowReleases, erstellt eine student_session und das erste
// module_session. Liefert zurück, was der Flow-Player braucht, um Modul 1 zu
// starten.
//
// Idempotent für denselben (flowReleaseId, studentCode): falls bereits eine
// Session läuft, wird sie zurückgegeben — die Schüler:in landet automatisch
// im aktuellen Modul (keine doppelten Sessions).
// IP-Rate-Limiting läuft zentral im Proxy (src/proxy.ts). Zusätzlich hier eine
// per-Release-Grenze gegen Schülercode-Brute-Force — diese Dimension ist NICHT
// client-kontrollierbar und greift daher auch bei IP-Rotation.
export async function POST(request: NextRequest) {
  try {
    const { flowReleaseId, studentCode } = await request.json()
    if (!flowReleaseId || !studentCode) {
      return NextResponse.json({ error: 'flowReleaseId und studentCode erforderlich' }, { status: 400 })
    }

    const perRelease = rateLimit(`session-release:${flowReleaseId}`, 120, 60_000)
    if (!perRelease.ok) {
      return NextResponse.json(
        { error: 'Zu viele Versuche für diesen Code. Bitte einen Moment warten.' },
        { status: 429, headers: { 'Retry-After': String(perRelease.retryAfterSec) } },
      )
    }

    const supabase = await createClient()
    const code = String(studentCode).trim().toUpperCase()

    // Release + Klasse + Module laden
    const { data: release } = await supabase
      .from('flow_releases')
      .select('id, status, class_id, game_flow_id')
      .eq('id', flowReleaseId)
      .maybeSingle()

    if (!release || release.status !== 'aktiv') {
      return NextResponse.json({ error: 'Flow ist nicht mehr aktiv.' }, { status: 404 })
    }

    // Schülercode über SECURITY-DEFINER-Funktion validieren. Die students-Tabelle
    // ist für anon NICHT lesbar (Migration 019) — die Funktion gibt nur bei
    // korrektem Code eines aktiven Releases ein Ergebnis zurück, kein Tabellen-Abgriff.
    const { data: rows } = await supabase.rpc('validate_student_code', {
      p_flow_release_id: release.id,
      p_code: code,
    })
    const student = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as { student_id: string; student_code: string })
      : null

    if (!student) {
      return NextResponse.json({
        error: 'Schülercode passt nicht zu dieser Klasse. Bitte überprüfe Code und Tippfehler.',
      }, { status: 404 })
    }

    // Module des Flows in sortierter Reihenfolge
    const { data: module, error: moduleErr } = await supabase
      .from('games')
      .select('id, titel, game_skin, reihenfolge')
      .eq('game_flow_id', release.game_flow_id)
      .eq('status', 'freigegeben')
      .order('reihenfolge', { ascending: true })

    if (moduleErr || !module || module.length === 0) {
      return NextResponse.json({ error: 'Flow enthält keine freigegebenen Module.' }, { status: 500 })
    }

    // Existiert schon eine Session für (release, student)?
    const { data: existing } = await supabase
      .from('student_sessions')
      .select('id, aktuelles_modul_index, modul_anzahl, lernpfad_abgeschlossen')
      .eq('flow_release_id', release.id)
      .eq('student_id', student.student_id)
      .maybeSingle()

    if (existing) {
      // Hole das aktuell laufende module_session (falls noch nicht abgeschlossen)
      const aktuellerIndex = existing.lernpfad_abgeschlossen
        ? existing.modul_anzahl
        : existing.aktuelles_modul_index

      const aktuellesModul = module[aktuellerIndex] ?? module[module.length - 1]
      const { data: ms } = await supabase
        .from('module_sessions')
        .select('id, status, niveau')
        .eq('student_session_id', existing.id)
        .eq('position', aktuellerIndex)
        .maybeSingle()

      return NextResponse.json({
        studentSessionId: existing.id,
        student: { id: student.student_id, code: student.student_code },
        flow: { releaseId: release.id, modul_anzahl: existing.modul_anzahl },
        aktuelles_modul: existing.lernpfad_abgeschlossen ? null : {
          moduleSessionId: ms?.id,
          gameId: aktuellesModul.id,
          gameSkin: aktuellesModul.game_skin,
          titel: aktuellesModul.titel,
          position: aktuellerIndex,
          niveau: ms?.niveau ?? niveauFuerPosition(aktuellerIndex, existing.modul_anzahl),
        },
        abgeschlossen: existing.lernpfad_abgeschlossen,
      })
    }

    // Neue Session anlegen
    const { data: session, error: sessionErr } = await supabase
      .from('student_sessions')
      .insert({
        flow_release_id: release.id,
        student_id: student.student_id,
        code: student.student_code,
        aktuelles_modul_index: 0,
        modul_anzahl: module.length,
      })
      .select()
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session konnte nicht angelegt werden.' }, { status: 500 })
    }

    // Erstes module_session anlegen
    const erstesModul = module[0]
    const erstesNiveau = niveauFuerPosition(0, module.length)
    const { data: ms, error: msErr } = await supabase
      .from('module_sessions')
      .insert({
        student_session_id: session.id,
        game_id: erstesModul.id,
        position: 0,
        niveau: erstesNiveau,
        status: 'laufend',
      })
      .select()
      .single()

    if (msErr || !ms) {
      return NextResponse.json({ error: 'Modul-Session konnte nicht angelegt werden.' }, { status: 500 })
    }

    return NextResponse.json({
      studentSessionId: session.id,
      student: { id: student.student_id, code: student.student_code },
      flow: { releaseId: release.id, modul_anzahl: module.length },
      aktuelles_modul: {
        moduleSessionId: ms.id,
        gameId: erstesModul.id,
        gameSkin: erstesModul.game_skin,
        titel: erstesModul.titel,
        position: 0,
        niveau: erstesNiveau,
      },
      abgeschlossen: false,
    })
  } catch (err) {
    console.error('[student/start-session]', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

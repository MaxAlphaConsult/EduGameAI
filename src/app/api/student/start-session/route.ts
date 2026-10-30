import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { niveauFuerPosition } from '@/lib/flow/ordering'
import { rateLimit } from '@/lib/rate-limit'
import { istUuid } from '@/lib/flow/ids'

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
//
// Datenzugriff nur über die Funktionen aus Migration 022: flow_releases,
// student_sessions und module_sessions sind für anon nicht lesbar (023).
export async function POST(request: NextRequest) {
  try {
    const { flowReleaseId, studentCode } = await request.json()
    if (!flowReleaseId || !studentCode) {
      return NextResponse.json({ error: 'flowReleaseId und studentCode erforderlich' }, { status: 400 })
    }

    if (!istUuid(flowReleaseId)) {
      return NextResponse.json({ error: 'Flow ist nicht mehr aktiv.' }, { status: 404 })
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

    const { data: releaseRows, error: releaseErr } = await supabase.rpc('schueler_release_lesen', {
      p_flow_release_id: flowReleaseId,
    })
    if (releaseErr) {
      console.error('[student/start-session] schueler_release_lesen', releaseErr)
      return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
    }
    const release = Array.isArray(releaseRows) && releaseRows.length > 0
      ? (releaseRows[0] as { status: string; game_flow_id: string })
      : null

    if (!release || release.status !== 'aktiv') {
      return NextResponse.json({ error: 'Flow ist nicht mehr aktiv.' }, { status: 404 })
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

    // Prüft den Code, setzt eine bestehende Sitzung fort oder legt Sitzung +
    // erstes Modul an. Leeres Ergebnis heißt: Code passt nicht zur Klasse.
    const { data: sitzungRows, error: sitzungErr } = await supabase.rpc('schueler_sitzung_oeffnen', {
      p_flow_release_id: flowReleaseId,
      p_code: code,
      p_modul_anzahl: module.length,
      p_erstes_game_id: module[0].id,
      p_erstes_niveau: niveauFuerPosition(0, module.length),
    })
    if (sitzungErr) {
      console.error('[student/start-session] schueler_sitzung_oeffnen', sitzungErr)
      return NextResponse.json({ error: 'Session konnte nicht angelegt werden.' }, { status: 500 })
    }
    const sitzung = Array.isArray(sitzungRows) && sitzungRows.length > 0
      ? (sitzungRows[0] as {
          student_session_id: string
          student_id: string
          student_code: string
          aktuelles_modul_index: number
          modul_anzahl: number
          lernpfad_abgeschlossen: boolean
          modul_sitzung_id: string | null
          modul_niveau: string | null
        })
      : null

    if (!sitzung) {
      return NextResponse.json({
        error: 'Schülercode passt nicht zu dieser Klasse. Bitte überprüfe Code und Tippfehler.',
      }, { status: 404 })
    }

    const index = sitzung.aktuelles_modul_index
    const aktuellesModul = module[index] ?? module[module.length - 1]

    return NextResponse.json({
      studentSessionId: sitzung.student_session_id,
      student: { id: sitzung.student_id, code: sitzung.student_code },
      flow: { releaseId: flowReleaseId, modul_anzahl: sitzung.modul_anzahl },
      aktuelles_modul: sitzung.lernpfad_abgeschlossen ? null : {
        moduleSessionId: sitzung.modul_sitzung_id ?? undefined,
        gameId: aktuellesModul.id,
        gameSkin: aktuellesModul.game_skin,
        titel: aktuellesModul.titel,
        position: index,
        niveau: sitzung.modul_niveau ?? niveauFuerPosition(index, sitzung.modul_anzahl),
      },
      abgeschlossen: sitzung.lernpfad_abgeschlossen,
    })
  } catch (err) {
    console.error('[student/start-session]', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

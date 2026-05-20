import { NextRequest, NextResponse } from 'next/server'
import { runDiagnosis } from '@/lib/claude/pipeline'
import { createClient } from '@/lib/supabase/server'

// POST /api/diagnose  body { flowReleaseId? , spielId?, modus? }
// Lehrkraft-Diagnose über die Schülerantworten eines Flows ODER eines
// einzelnen Spiels (Drilldown). Mindestens einer von beiden muss gesetzt sein.
//
// Antworten hängen seit Migration 010 an module_sessions. Wir laden:
//   - für flowReleaseId: alle module_sessions aller student_sessions des Releases
//   - für spielId: alle module_sessions zu diesem Spiel
// und übergeben sie zusammen mit Spiel-/Analyse-Metadaten an die Pipeline.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const body = await request.json()
    const { flowReleaseId, spielId, modus = 'kompakt' } = body

    if (!flowReleaseId && !spielId) {
      return NextResponse.json({ error: 'flowReleaseId oder spielId erforderlich' }, { status: 400 })
    }

    if (flowReleaseId) {
      const { data: release } = await supabase
        .from('flow_releases')
        .select('id, game_flow_id, classes(lehrer_id), game_flows(id, titel, analyses(*))')
        .eq('id', flowReleaseId)
        .maybeSingle()

      const klasse = Array.isArray(release?.classes) ? release?.classes[0] : release?.classes
      if (!release || klasse?.lehrer_id !== user.id) {
        return NextResponse.json({ error: 'Flow-Release nicht gefunden' }, { status: 404 })
      }

      const { data: games } = await supabase
        .from('games')
        .select('id, titel, aufgaben, reihenfolge')
        .eq('game_flow_id', release.game_flow_id)
        .order('reihenfolge', { ascending: true })

      const aufgabenMetadaten = (games ?? []).flatMap((g) => (g.aufgaben ?? []) as object[])

      const { data: studentSessions } = await supabase
        .from('student_sessions')
        .select(`
          id, code, student_id, aktuelles_modul_index, modul_anzahl, lernpfad_abgeschlossen,
          module_sessions(id, game_id, position, niveau, status, answers(*))
        `)
        .eq('flow_release_id', flowReleaseId)

      const flow = Array.isArray(release.game_flows) ? release.game_flows[0] : release.game_flows
      const analyse = flow && (Array.isArray(flow.analyses) ? flow.analyses[0] : flow.analyses)

      const diagnose = await runDiagnosis({
        spielMetadaten: { flow: { id: flow?.id, titel: flow?.titel }, analyse, module: games ?? [] },
        aufgabenMetadaten,
        schuelerErgebnisse: studentSessions ?? [],
        modus,
      })

      return NextResponse.json({ diagnose })
    }

    // Drilldown auf ein einzelnes Spiel
    const { data: spiel } = await supabase
      .from('games')
      .select('*, analyses(*)')
      .eq('id', spielId)
      .eq('lehrer_id', user.id)
      .maybeSingle()

    if (!spiel) return NextResponse.json({ error: 'Spiel nicht gefunden' }, { status: 404 })

    const { data: moduleSessions } = await supabase
      .from('module_sessions')
      .select(`
        id, position, niveau, status, gestartet_am, abgeschlossen_am,
        student_sessions(id, code, student_id),
        answers(*)
      `)
      .eq('game_id', spielId)

    const diagnose = await runDiagnosis({
      spielMetadaten: spiel.analyses,
      aufgabenMetadaten: spiel.aufgaben || [],
      schuelerErgebnisse: moduleSessions ?? [],
      modus,
    })

    return NextResponse.json({ diagnose })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Diagnose fehlgeschlagen' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/flows?classId=…  → alle Flows + ggf. Release-Status für eine Klasse.
// Wird in der Klassen-UI verwendet, um "Flow freigeben"-Auswahl zu bauen.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const classId = request.nextUrl.searchParams.get('classId')

  const { data: flows, error } = await supabase
    .from('game_flows')
    .select(`
      id, titel, status, created_at, anzahl_spiele,
      games(id, titel, status, reihenfolge, spieltyp_didaktisch, game_engine)
    `)
    .eq('lehrer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let releaseMap = new Map<string, { id: string; access_code: string; status: string }>()
  if (classId) {
    const { data: releases } = await supabase
      .from('flow_releases')
      .select('id, game_flow_id, access_code, status')
      .eq('class_id', classId)
    releaseMap = new Map((releases ?? []).map((r) => [r.game_flow_id, r]))
  }

  const result = (flows ?? []).map((f) => {
    const games = (f.games ?? []) as { id: string; titel: string; status: string; reihenfolge: number | null; spieltyp_didaktisch: string; game_engine: string }[]
    games.sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
    const release = releaseMap.get(f.id) ?? null
    const alleFreigegeben = games.length > 0 && games.every((g) => g.status === 'freigegeben')
    return {
      id: f.id,
      titel: f.titel,
      status: f.status,
      created_at: f.created_at,
      anzahl_spiele: f.anzahl_spiele,
      module: games,
      modul_anzahl: games.length,
      alle_module_freigegeben: alleFreigegeben,
      release,
    }
  })

  return NextResponse.json({ flows: result })
}

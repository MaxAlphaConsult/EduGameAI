import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/flows/[flowId]/modules
// Leichtgewichtiger Status-Endpoint für die inkrementelle Generierung: liefert
// pro Baustein nur Status + Metadaten. Der Client (Banner/Flow-Seite) pollt das
// im 4s-Takt und zeigt Module an, sobald sie 'ready' sind.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data, error } = await supabase
    .from('games')
    .select('id, reihenfolge, baustein_typ, gen_status, gen_error, titel, aufgaben')
    .eq('game_flow_id', flowId)
    .eq('lehrer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const modules = (data ?? [])
    .map((m) => ({
      id: m.id as string,
      reihenfolge: (m.reihenfolge ?? 0) as number,
      baustein_typ: m.baustein_typ as string,
      gen_status: (m.gen_status ?? 'ready') as string,
      gen_error: (m.gen_error ?? null) as string | null,
      titel: (m.titel ?? null) as string | null,
      aufgabenCount: Array.isArray(m.aufgaben) ? m.aufgaben.length : 0,
    }))
    .sort((a, b) => a.reihenfolge - b.reihenfolge)

  const total = modules.length
  const ready = modules.filter((m) => m.gen_status === 'ready').length
  const errored = modules.filter((m) => m.gen_status === 'gen_error').length

  return NextResponse.json({
    modules,
    total,
    ready,
    errored,
    allReady: total > 0 && ready === total,
  })
}

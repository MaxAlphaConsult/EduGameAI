import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { FlowPreviewClient, type PreviewModul } from '@/components/modules/FlowPreviewClient'

interface AufgabeRow {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren?: string[]
  hilfen?: string[]
  teilkompetenz?: string
}

interface GameRow {
  id: string
  titel: string | null
  game_skin: string | null
  reihenfolge: number | null
  aufgaben: AufgabeRow[] | null
}

export default async function FlowPreviewPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: flow } = await supabase
    .from('game_flows')
    .select('id, titel, lehrer_id')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .single()
  if (!flow) notFound()

  const { data: games } = await supabase
    .from('games')
    .select('id, titel, game_skin, reihenfolge, aufgaben')
    .eq('game_flow_id', flowId)
    .eq('lehrer_id', user.id)

  const sortiert = (games ?? []) as GameRow[]
  sortiert.sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))

  const module: PreviewModul[] = sortiert
    .map((g) => ({
      id: g.id,
      titel: g.titel ?? 'Modul',
      gameSkin: g.game_skin ?? 'mittelstufe',
      aufgaben: g.aufgaben ?? [],
    }))
    .filter((m) => m.aufgaben.length > 0)

  if (module.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-2xl p-6" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <p className="text-sm font-bold mb-1" style={{ color: '#991B1B' }}>Keine spielbaren Module</p>
          <p className="text-xs mb-3" style={{ color: '#B91C1C' }}>
            Dieses Lernspiel enthält noch keine Module mit Aufgaben.
          </p>
          <Link href="/spiele" className="text-xs font-semibold underline" style={{ color: '#991B1B' }}>
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  return (
    <FlowPreviewClient
      flowId={flowId}
      flowTitel={flow.titel ?? 'Lernspiel'}
      module={module}
    />
  )
}

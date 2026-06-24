import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { FlowLehrkraftCheckPanel } from '@/components/modules/FlowLehrkraftCheckPanel'
import { FlowImprovePanel } from '@/components/modules/FlowImprovePanel'

interface GameRow {
  id: string
  titel: string | null
  status: string | null
  reihenfolge: number | null
  spieltyp_didaktisch: string | null
  game_engine: string | null
  aufgaben: unknown[] | null
}

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  geprueft: 'Geprüft',
  freigegeben: 'Freigegeben',
}
const STATUS_BG: Record<string, string> = {
  entwurf: '#FEF3C7',
  geprueft: '#E0F2FE',
  freigegeben: '#D1FAE5',
}
const STATUS_FG: Record<string, string> = {
  entwurf: '#92400E',
  geprueft: '#075985',
  freigegeben: '#065F46',
}

export default async function FlowDetailPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: flow } = await supabase
    .from('game_flows')
    .select('id, titel, status, created_at, anzahl_spiele, flow_check_status')
    .eq('id', flowId)
    .eq('lehrer_id', user.id)
    .single()
  if (!flow) notFound()

  const { data: gamesRaw } = await supabase
    .from('games')
    .select('id, titel, status, reihenfolge, spieltyp_didaktisch, game_engine, aufgaben')
    .eq('game_flow_id', flowId)
    .eq('lehrer_id', user.id)

  const module = ((gamesRaw ?? []) as GameRow[])
    .sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))

  const totalAufgaben = module.reduce((sum, m) => sum + (m.aufgaben?.length ?? 0), 0)

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/spiele" className="text-sm" style={{ color: '#7A6A94', textDecoration: 'none' }}>← LernFlows</Link>
        <span style={{ color: '#C4B5FD' }}>/</span>
        <span className="text-sm font-medium" style={{ color: '#1F1235' }}>{flow.titel}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1F1235' }}>{flow.titel}</h1>
        <p className="text-sm" style={{ color: '#7A6A94' }}>
          {module.length} {module.length === 1 ? 'Baustein' : 'Bausteine'} · {totalAufgaben} Aufgaben · erstellt {new Date(flow.created_at).toLocaleDateString('de-DE')}
        </p>
      </div>

      {/* Großer CTA: ganzen LernFlow testen */}
      {module.length > 0 && (
        <Link
          href={`/spiele/${flowId}/preview`}
          target="_blank"
          className="block mb-6 rounded-2xl p-5 transition-all hover:scale-[1.005]"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: 'white',
            textDecoration: 'none',
            boxShadow: '0 6px 24px rgba(124,58,237,0.25)',
          }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              ▶▶
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">Ganzen LernFlow testen</p>
              <p className="text-xs" style={{ color: '#E9D5FF' }}>
                Alle {module.length} Bausteine hintereinander, wie ein Schüler.
              </p>
            </div>
            <span className="text-xl flex-shrink-0" style={{ color: '#E9D5FF' }}>↗</span>
          </div>
        </Link>
      )}

      {/* Flow-weiter Lehrkraft-Check */}
      <div className="mb-4">
        <FlowLehrkraftCheckPanel flowId={flowId} />
      </div>

      {/* Flow-weite KI-Verbesserungsvorschläge */}
      <div className="mb-6">
        <FlowImprovePanel flowId={flowId} flowCheckFertig={flow.flow_check_status === 'fertig'} />
      </div>

      {/* Module-Liste */}
      <div className="rounded-2xl p-4" style={{ background: '#FAFAFA', border: '1px solid #E9D5FF' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A6A94' }}>
          Bausteine (didaktische Reihenfolge: leicht → schwer)
        </p>
        <div className="flex flex-col gap-2">
          {module.map((m) => {
            const stat = m.status ?? 'entwurf'
            return (
              <div key={m.id} className="rounded-xl p-3"
                style={{ background: '#FFFFFF', border: '1px solid #F3EEFF' }}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                    {m.reihenfolge ?? '·'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1F1235' }}>
                      {m.titel || m.spieltyp_didaktisch || 'Baustein'}
                    </p>
                    <p className="text-xs" style={{ color: '#7A6A94' }}>
                      {m.spieltyp_didaktisch || m.game_engine || '—'} · {m.aufgaben?.length ?? 0} Aufgaben
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_BG[stat] ?? '#F3F4F6', color: STATUS_FG[stat] ?? '#6B7280' }}>
                    {STATUS_LABEL[stat] ?? stat}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#F3EEFF' }}>
                  <Link href={`/modules/${m.id}`}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: '#7C3AED', color: 'white', textDecoration: 'none' }}>
                    Öffnen & bearbeiten →
                  </Link>
                  {(m.aufgaben?.length ?? 0) > 0 && (
                    <Link href={`/modules/${m.id}/preview`} target="_blank"
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
                      ▶ Testen
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sekundäre Aktion: An Klasse freigeben */}
      <Link href="/classes"
        className="block mt-6 rounded-2xl p-4 text-center text-sm font-bold transition-all"
        style={{ background: '#FFFFFF', color: '#1F1235', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
        👥 An Klasse freigeben
      </Link>
    </div>
  )
}

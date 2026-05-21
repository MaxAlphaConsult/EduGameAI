'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface FlowModule {
  id: string
  titel: string
  status: 'entwurf' | 'geprueft' | 'freigegeben'
  reihenfolge: number | null
  spieltyp_didaktisch: string | null
  game_engine: string | null
}

interface Flow {
  id: string
  titel: string
  status: string
  created_at: string
  anzahl_spiele: number
  module: FlowModule[]
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E9D5FF',
  boxShadow: '0 2px 24px rgba(124,58,237,0.08)',
  borderRadius: 20,
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string; border: string }> = {
  freigegeben: { label: 'Freigegeben', bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' },
  geprueft: { label: 'Geprüft', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  entwurf: { label: 'Entwurf', bg: '#F3EEFF', color: '#7C3AED', border: '#C4B5FD' },
}

export default function SpielePage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadFlows() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('game_flows')
      .select(`
        id, titel, status, created_at, anzahl_spiele,
        games(id, titel, status, reihenfolge, spieltyp_didaktisch, game_engine)
      `)
      .eq('lehrer_id', user.id)
      .order('created_at', { ascending: false })

    const mapped: Flow[] = (data ?? []).map((f) => {
      const games = (f.games ?? []) as FlowModule[]
      games.sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
      return {
        id: f.id,
        titel: f.titel,
        status: f.status,
        created_at: f.created_at,
        anzahl_spiele: f.anzahl_spiele ?? games.length,
        module: games,
      }
    })

    setFlows(mapped)
    setLoading(false)
  }

  useEffect(() => {
    loadFlows()
  }, [])

  async function onDelete(flow: Flow) {
    const bestätigung = confirm(
      `„${flow.titel}" wirklich löschen?\n\nDamit verschwinden auch alle Module und bisherige Schüler-Antworten zu diesem Lernspiel.`
    )
    if (!bestätigung) return
    setDeletingId(flow.id)
    try {
      const res = await fetch(`/api/flows/${flow.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(`Löschen fehlgeschlagen: ${body.error ?? 'Unbekannter Fehler'}`)
        return
      }
      await loadFlows()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1F1235' }}>Lernspiele</h1>
          <p className="text-sm mt-1" style={{ color: '#7A6A94' }}>
            Jedes Lernspiel ist eine Reihe von Modulen, didaktisch von leicht nach schwer sortiert.
          </p>
        </div>
        <Link href="/playground"
          className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.3)', textDecoration: 'none' }}>
          ✦ Neues Lernspiel
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
          ))}
        </div>
      ) : flows.length === 0 ? (
        <div style={{ border: '2px dashed #E9D5FF', borderRadius: 20 }} className="p-16 text-center">
          <span className="text-4xl mb-3 block">🎮</span>
          <p className="text-sm font-medium" style={{ color: '#7A6A94' }}>Noch kein Lernspiel</p>
          <p className="text-xs mt-1" style={{ color: '#C4B5FD' }}>Lade ein Arbeitsblatt hoch — wir bauen daraus dein erstes Lernspiel.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flows.map((flow) => {
            const moduleBereit = flow.module.filter((m) => m.status === 'freigegeben').length
            const isDeleting = deletingId === flow.id
            return (
              <div key={flow.id} style={{ ...cardStyle, borderRadius: 16, opacity: isDeleting ? 0.5 : 1 }} className="p-5 transition-all">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: '#F3EEFF' }}>🎮</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/spiele/${flow.id}`}
                        className="font-semibold text-base truncate hover:underline"
                        style={{ color: '#1F1235', textDecoration: 'none' }}>
                        {flow.titel}
                      </Link>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                        {flow.module.length} {flow.module.length === 1 ? 'Modul' : 'Module'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>
                      Erstellt {new Date(flow.created_at).toLocaleDateString('de-DE')} · {moduleBereit}/{flow.module.length} Module bereit
                    </p>
                  </div>
                </div>

                {/* Modul-Liste in Reihenfolge */}
                {flow.module.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {flow.module.map((m, idx) => {
                      const cfg = STATUS_LABEL[m.status] ?? STATUS_LABEL.entwurf
                      return (
                        <Link key={m.id} href={`/modules/${m.id}`}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, textDecoration: 'none' }}>
                          <span className="font-bold">{idx + 1}.</span>
                          <span>{m.spieltyp_didaktisch || m.game_engine || 'Modul'}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t flex-wrap" style={{ borderColor: '#F3EEFF' }}>
                  <button onClick={() => onDelete(flow)} disabled={isDeleting}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: '#FFFFFF', color: '#DC2626', border: '1px solid #FECACA', cursor: isDeleting ? 'not-allowed' : 'pointer' }}>
                    {isDeleting ? '⟳ Löscht…' : '🗑 Löschen'}
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/spiele/${flow.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ background: '#FFFFFF', color: '#7C3AED', border: '1.5px solid #C4B5FD', textDecoration: 'none' }}>
                      📖 Öffnen
                    </Link>
                    {flow.module.length > 0 && (
                      <Link href={`/spiele/${flow.id}/preview`} target="_blank"
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                        style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
                        ▶ Testen
                      </Link>
                    )}
                    <Link href="/classes"
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ background: '#7C3AED', color: 'white', textDecoration: 'none' }}>
                      → Klasse zuweisen
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

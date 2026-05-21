'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KlassenraumQr } from '@/components/qr-code'

interface FlowItem {
  id: string
  titel: string
  status: string
  anzahl_spiele: number | null
}

interface KlasseItem {
  id: string
  name: string
  jahrgangsstufe: string
  fach: string
}

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  geprueft: 'Geprüft',
  freigegeben: 'Freigegeben',
  archiviert: 'Archiviert',
}
const STATUS_BG: Record<string, string> = {
  entwurf: '#FEF3C7',
  geprueft: '#E0F2FE',
  freigegeben: '#D1FAE5',
  archiviert: '#F3F4F6',
}
const STATUS_FG: Record<string, string> = {
  entwurf: '#92400E',
  geprueft: '#075985',
  freigegeben: '#065F46',
  archiviert: '#6B7280',
}

export default function StartPage() {
  const [flows, setFlows] = useState<FlowItem[]>([])
  const [klassen, setKlassen] = useState<KlasseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [spielenUrl, setSpielenUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpielenUrl(`${window.location.origin}/spielen`)
    }
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [flowsRes, klassenRes] = await Promise.all([
        supabase
          .from('game_flows')
          .select('id, titel, status, anzahl_spiele')
          .eq('lehrer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('classes')
          .select('id, name, jahrgangsstufe, fach')
          .eq('lehrer_id', user.id)
          .order('erstellt_am', { ascending: false })
          .limit(3),
      ])

      setFlows((flowsRes.data ?? []) as FlowItem[])
      setKlassen((klassenRes.data ?? []) as KlasseItem[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">

      {/* Begrüßung */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: '#1F1235' }}>
          Was möchtest du tun?
        </h1>
        <p className="text-sm" style={{ color: '#7A6A94' }}>
          Schön, dass du da bist.
        </p>
      </div>

      {/* Großer CTA */}
      <Link href="/playground"
        className="block mb-8 md:mb-10 rounded-3xl p-5 sm:p-6 md:p-8 transition-all hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
          color: 'white',
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
        }}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            ✦
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold mb-1">Neues Lernspiel erstellen</p>
            <p className="text-sm" style={{ color: '#E9D5FF' }}>
              Material hochladen → in wenigen Minuten ist alles fertig
            </p>
          </div>
          <span className="text-2xl" style={{ color: '#E9D5FF' }}>→</span>
        </div>
      </Link>

      {/* Letzte Lernspiele */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: '#1F1235' }}>
            Deine Lernspiele
          </h2>
          {flows.length > 0 && (
            <Link href="/spiele" className="text-xs font-semibold" style={{ color: '#7C3AED', textDecoration: 'none' }}>
              Alle ansehen →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
            ))}
          </div>
        ) : flows.length === 0 ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ border: '2px dashed #E9D5FF', background: '#FFFFFF' }}>
            <p className="text-2xl mb-2">📚</p>
            <p className="text-sm font-medium" style={{ color: '#1F1235' }}>
              Noch kein Lernspiel
            </p>
            <p className="text-xs mt-1" style={{ color: '#7A6A94' }}>
              Lade oben ein Arbeitsblatt hoch — wir machen den Rest.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {flows.map((f) => (
              <Link key={f.id} href="/spiele"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E9D5FF',
                  boxShadow: '0 1px 8px rgba(124,58,237,0.04)',
                  textDecoration: 'none',
                }}>
                <span className="text-xl flex-shrink-0">📚</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1F1235' }}>
                    {f.titel || 'Unbenanntes Lernspiel'}
                  </p>
                  {f.anzahl_spiele != null && (
                    <p className="text-xs" style={{ color: '#7A6A94' }}>
                      {f.anzahl_spiele} {f.anzahl_spiele === 1 ? 'Modul' : 'Module'}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: STATUS_BG[f.status] ?? '#F3F4F6', color: STATUS_FG[f.status] ?? '#6B7280' }}>
                  {STATUS_LABEL[f.status] ?? f.status}
                </span>
                <span style={{ color: '#C4B5FD' }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Deine Klassen */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: '#1F1235' }}>
            Deine Klassen
          </h2>
          <Link href="/classes" className="text-xs font-semibold" style={{ color: '#7C3AED', textDecoration: 'none' }}>
            {klassen.length > 0 ? 'Alle ansehen →' : 'Klasse anlegen →'}
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
            ))}
          </div>
        ) : klassen.length === 0 ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ border: '2px dashed #E9D5FF', background: '#FFFFFF' }}>
            <p className="text-2xl mb-2">👥</p>
            <p className="text-sm font-medium" style={{ color: '#1F1235' }}>
              Noch keine Klasse
            </p>
            <p className="text-xs mt-1" style={{ color: '#7A6A94' }}>
              Leg eine Klasse an, damit deine Schüler spielen können.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {klassen.map((k) => (
              <Link key={k.id} href="/classes"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E9D5FF',
                  boxShadow: '0 1px 8px rgba(124,58,237,0.04)',
                  textDecoration: 'none',
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                  {k.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1F1235' }}>{k.name}</p>
                  <p className="text-xs" style={{ color: '#7A6A94' }}>Klasse {k.jahrgangsstufe} · {k.fach}</p>
                </div>
                <span style={{ color: '#C4B5FD' }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* QR-Code für die Klasse */}
      <section>
        <h2 className="text-base font-bold mb-3" style={{ color: '#1F1235' }}>
          Im Klassenraum
        </h2>
        {spielenUrl && <KlassenraumQr url={spielenUrl} />}
      </section>

    </div>
  )
}

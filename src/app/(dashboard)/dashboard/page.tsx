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

// ── Farb-Token (konsistent mit dem restlichen Violet-Design) ──────────────────
const C = {
  ink: '#1F1235',
  muted: '#7A6A94',
  soft: '#C4B5FD',
  border: '#E9D5FF',
  tint: '#F3EEFF',
}
const rowStyle = {
  background: '#FFFFFF',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 8px rgba(124,58,237,0.04)',
  textDecoration: 'none',
}

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  sortiert: 'Sortiert',
  geprueft: 'Geprüft',
  freigegeben: 'Freigegeben',
  archiviert: 'Archiviert',
}
const STATUS_BG: Record<string, string> = {
  entwurf: '#FEF3C7',
  sortiert: '#E0F2FE',
  geprueft: '#E0F2FE',
  freigegeben: '#D1FAE5',
  archiviert: '#F3F4F6',
}
const STATUS_FG: Record<string, string> = {
  entwurf: '#92400E',
  sortiert: '#075985',
  geprueft: '#075985',
  freigegeben: '#065F46',
  archiviert: '#6B7280',
}

function tagesgruss(stunde: number): string {
  if (stunde < 11) return 'Guten Morgen'
  if (stunde < 18) return 'Hallo'
  return 'Guten Abend'
}

export default function StartPage() {
  const [name, setName] = useState('')
  const [gruss, setGruss] = useState('Hallo')
  const [flows, setFlows] = useState<FlowItem[]>([])
  const [flowCount, setFlowCount] = useState(0)
  const [freigegebenCount, setFreigegebenCount] = useState(0)
  const [klassen, setKlassen] = useState<KlasseItem[]>([])
  const [klassenCount, setKlassenCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [spielenUrl, setSpielenUrl] = useState('')

  useEffect(() => {
    async function load() {
      // Clientseitig setzen → keine Hydration-Mismatches durch Uhrzeit / window
      setGruss(tagesgruss(new Date().getHours()))
      if (typeof window !== 'undefined') {
        setSpielenUrl(`${window.location.origin}/spielen`)
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [profileRes, flowsRes, freigegebenRes, klassenRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single(),
        supabase
          .from('game_flows')
          .select('id, titel, status, anzahl_spiele', { count: 'exact' })
          .eq('lehrer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('game_flows')
          .select('id', { count: 'exact', head: true })
          .eq('lehrer_id', user.id)
          .eq('status', 'freigegeben'),
        supabase
          .from('classes')
          .select('id, name, jahrgangsstufe, fach', { count: 'exact' })
          .eq('lehrer_id', user.id)
          .order('erstellt_am', { ascending: false })
          .limit(3),
      ])

      if (profileRes.data?.name) setName(profileRes.data.name)
      setFlows((flowsRes.data ?? []) as FlowItem[])
      setFlowCount(flowsRes.count ?? 0)
      setFreigegebenCount(freigegebenRes.count ?? 0)
      setKlassen((klassenRes.data ?? []) as KlasseItem[])
      setKlassenCount(klassenRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const stats = [
    { label: 'LernFlows', value: flowCount, icon: '📚', href: '/spiele' },
    { label: 'Freigegeben', value: freigegebenCount, icon: '✅', href: '/spiele' },
    { label: 'Klassen', value: klassenCount, icon: '👥', href: '/classes' },
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl">

      {/* Begrüßung */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: C.ink }}>
          {gruss}{name ? `, ${name}` : ''} 👋
        </h1>
        <p className="text-sm" style={{ color: C.muted }}>
          Hier ist dein Überblick — leg direkt los oder schau dir an, was läuft.
        </p>
      </div>

      {/* Kennzahlen auf einen Blick */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="rounded-2xl p-3 sm:p-4 transition-all hover:scale-[1.02]"
            style={rowStyle}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base sm:text-lg">{s.icon}</span>
              <span className="text-xs font-semibold truncate" style={{ color: C.muted }}>{s.label}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black leading-none" style={{ color: C.ink }}>
              {loading ? '–' : s.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Großer CTA */}
      <Link href="/playground"
        className="block mb-8 md:mb-10 rounded-3xl p-5 sm:p-6 md:p-7 transition-all hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
          color: 'white',
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
        }}>
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg sm:text-xl font-bold mb-1">Neuen LernFlow erstellen</p>
            <p className="text-sm" style={{ color: '#E9D5FF' }}>
              Material hochladen → in wenigen Minuten ist alles fertig
            </p>
          </div>
          <span className="text-2xl hidden sm:block" style={{ color: '#E9D5FF' }}>→</span>
        </div>
      </Link>

      {/* Zweispaltige Übersicht */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8 md:mb-10">

        {/* Letzte LernFlows */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: C.ink }}>
              Deine LernFlows
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
                <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: C.tint }} />
              ))}
            </div>
          ) : flows.length === 0 ? (
            <div className="rounded-2xl p-6 text-center"
              style={{ border: `2px dashed ${C.border}`, background: '#FFFFFF' }}>
              <p className="text-2xl mb-2">📚</p>
              <p className="text-sm font-medium" style={{ color: C.ink }}>
                Noch kein LernFlow
              </p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>
                Lade oben ein Arbeitsblatt hoch — wir machen den Rest.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {flows.map((f) => (
                <Link key={f.id} href={`/spiele/${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:scale-[1.01]"
                  style={rowStyle}>
                  <span className="text-xl flex-shrink-0">📚</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.ink }}>
                      {f.titel || 'Unbenannter LernFlow'}
                    </p>
                    {f.anzahl_spiele != null && (
                      <p className="text-xs" style={{ color: C.muted }}>
                        {f.anzahl_spiele} {f.anzahl_spiele === 1 ? 'Baustein' : 'Bausteine'}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: STATUS_BG[f.status] ?? '#F3F4F6', color: STATUS_FG[f.status] ?? '#6B7280' }}>
                    {STATUS_LABEL[f.status] ?? f.status}
                  </span>
                  <span style={{ color: C.soft }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Deine Klassen */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: C.ink }}>
              Deine Klassen
            </h2>
            <Link href="/classes" className="text-xs font-semibold" style={{ color: '#7C3AED', textDecoration: 'none' }}>
              {klassen.length > 0 ? 'Alle ansehen →' : 'Klasse anlegen →'}
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: C.tint }} />
              ))}
            </div>
          ) : klassen.length === 0 ? (
            <div className="rounded-2xl p-6 text-center"
              style={{ border: `2px dashed ${C.border}`, background: '#FFFFFF' }}>
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm font-medium" style={{ color: C.ink }}>
                Noch keine Klasse
              </p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>
                Leg eine Klasse an, damit deine Schüler spielen können.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {klassen.map((k) => (
                <Link key={k.id} href="/classes"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:scale-[1.01]"
                  style={rowStyle}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: C.tint, color: '#7C3AED' }}>
                    {k.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.ink }}>{k.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>Klasse {k.jahrgangsstufe} · {k.fach}</p>
                  </div>
                  <span style={{ color: C.soft }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* QR-Code für die Klasse */}
      <section>
        <h2 className="text-base font-bold mb-3" style={{ color: C.ink }}>
          Im Klassenraum
        </h2>
        {spielenUrl && <KlassenraumQr url={spielenUrl} />}
      </section>

    </div>
  )
}

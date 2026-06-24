'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useGeneration } from '@/lib/generation-context'

export function GenerationBanner() {
  const pathname = usePathname()
  const gen = useGeneration()

  // Auf /playground bringt der Banner nichts — die Page hat eine eigene große
  // Progress-Anzeige. Auf allen anderen Dashboard-Seiten wird er angezeigt,
  // damit man jederzeit sieht, dass im Hintergrund noch was läuft.
  if (pathname?.startsWith('/playground')) return null
  if (gen.status === 'idle') return null

  if (gen.status === 'running') {
    return (
      <div className="px-6 pt-4">
        <div className="rounded-2xl px-5 py-3 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, #FFFFFF, #F6F1FF)',
            border: '1px solid #C4B5FD',
            boxShadow: '0 4px 24px rgba(124,58,237,0.12)',
          }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
            <span className="text-base">🤖</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: '#1F1235' }}>
              LernFlow „{gen.spielname || 'wird gebaut'}" wird erstellt
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E9D5FF' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${gen.percent}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }} />
              </div>
              <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: '#7C3AED' }}>
                {gen.percent}%
              </span>
            </div>
            <p className="text-xs mt-1 truncate" style={{ color: '#7A6A94' }}>{gen.label}</p>
          </div>
          <Link href="/playground"
            className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
            Ansehen →
          </Link>
        </div>
      </div>
    )
  }

  if (gen.status === 'done') {
    const modulCount = gen.result?.spielIds.length ?? 0
    const flowId = gen.result?.gameFlowId
    return (
      <div className="px-6 pt-4">
        <div className="rounded-2xl px-5 py-3 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', border: '1px solid #6EE7B7' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            <span className="text-base">✅</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: '#065F46' }}>
              „{gen.spielname || 'LernFlow'}" ist fertig
            </p>
            <p className="text-xs" style={{ color: '#047857' }}>
              {modulCount} {modulCount === 1 ? 'Baustein' : 'Bausteine'} bereit — spiel es einmal durch.
            </p>
          </div>
          {flowId ? (
            <Link href={`/spiele/${flowId}/preview`} target="_blank"
              className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: 'white', textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
              }}>
              ▶▶ Testen ↗
            </Link>
          ) : (
            <Link href="/spiele"
              className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: '#FFFFFF', color: '#065F46', border: '1px solid #6EE7B7', textDecoration: 'none' }}>
              Ansehen →
            </Link>
          )}
          <button onClick={gen.dismiss}
            className="text-xs font-semibold px-2 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'transparent', color: '#047857', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  // error
  return (
    <div className="px-6 pt-4">
      <div className="rounded-2xl px-5 py-3 flex items-start gap-4"
        style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#FEE2E2' }}>
          <span className="text-base">⚠️</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#991B1B' }}>
            Erstellung fehlgeschlagen
          </p>
          <p className="text-xs break-words" style={{ color: '#B91C1C' }}>{gen.error}</p>
        </div>
        <Link href="/playground"
          className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: '#FFFFFF', color: '#991B1B', border: '1px solid #FECACA', textDecoration: 'none' }}>
          Neu starten
        </Link>
        <button onClick={gen.dismiss}
          className="text-xs font-semibold px-2 py-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'transparent', color: '#991B1B', border: 'none', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </div>
  )
}

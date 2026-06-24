'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Pollt den Modul-Status eines Flows und aktualisiert die (server-gerenderte)
// Seite, solange noch Module erzeugt werden. So sieht auch jemand, der direkt
// auf der Flow-Seite landet (nicht über den Banner), wie die Bausteine nach und
// nach fertig werden. Wird nur gerendert, wenn überhaupt etwas aussteht.
export function FlowGenerationPoller({ flowId }: { flowId: string }) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/flows/${flowId}/modules`)
        if (res.ok) {
          const data = await res.json()
          if (cancelled) return
          router.refresh()
          if (data.allReady) return // fertig — nicht weiter pollen
        }
      } catch { /* ignore */ }
      if (!cancelled) timer.current = setTimeout(poll, 4000)
    }
    timer.current = setTimeout(poll, 4000)
    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [flowId, router])

  return null
}

// Erzeugt ein einzelnes Modul neu (z.B. nach einem Generierungs-Fehler).
export function RegenerateModuleButton({ gameId }: { gameId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setBusy(true)
    try {
      await fetch(`/api/games/${gameId}/generate?force=true`, { method: 'POST' })
    } catch { /* ignore */ }
    setBusy(false)
    router.refresh()
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs font-bold px-3 py-1.5 rounded-lg"
      style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', cursor: busy ? 'wait' : 'pointer' }}
    >
      {busy ? 'Wird erzeugt …' : '↻ Erneut erzeugen'}
    </button>
  )
}

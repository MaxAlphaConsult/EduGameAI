'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  spielId: string
  titel: string
  status: string
  flowId: string | null
}

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  geprueft: 'Geprüft',
  freigegeben: 'Freigegeben',
}

export function ModulInfoEdit({ spielId, titel, status, flowId }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [titelInput, setTitelInput] = useState(titel)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSpeichern() {
    if (!titelInput.trim() || titelInput.trim() === titel) {
      setEditing(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${spielId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titel: titelInput.trim() }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? 'Speichern fehlgeschlagen')
        return
      }
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onStatusZurueck() {
    if (!confirm('Status auf „Entwurf" zurücksetzen? Der Baustein muss dann erneut freigegeben werden.')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${spielId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'entwurf' }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? 'Statuswechsel fehlgeschlagen')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onLoeschen() {
    if (!confirm(`Baustein „${titel}" wirklich löschen?\n\nSchüler-Antworten zu diesem Baustein werden mitgelöscht.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${spielId}`, { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? 'Löschen fehlgeschlagen')
        return
      }
      // Zurück zum LernFlow oder zur Liste
      router.push(flowId ? '/spiele' : '/spiele')
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setError(null) }}
        className="text-xs font-semibold px-3 py-1.5 rounded-xl"
        style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', cursor: 'pointer' }}
      >
        ✏️ Bearbeiten
      </button>
    )
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: '#F6F1FF', border: '1px solid #E9D5FF', minWidth: 360 }}>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: '#1F1235' }}>Titel</label>
        <input
          type="text"
          value={titelInput}
          onChange={(e) => setTitelInput(e.target.value)}
          maxLength={200}
          autoFocus
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ border: '1.5px solid #C4B5FD', background: 'white', color: '#1F1235' }}
        />
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onSpeichern}
          disabled={busy}
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: 'white', border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
          }}>
          {busy ? '…' : 'Speichern'}
        </button>
        <button
          onClick={() => { setEditing(false); setTitelInput(titel); setError(null) }}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5"
          style={{ background: 'transparent', color: '#7A6A94', border: 'none', cursor: 'pointer' }}>
          Abbrechen
        </button>
      </div>

      <div className="pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: '#E9D5FF' }}>
        {status === 'freigegeben' && (
          <button
            onClick={onStatusZurueck}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', cursor: 'pointer' }}>
            ↺ Status zurück auf Entwurf
          </button>
        )}
        <button
          onClick={onLoeschen}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl ml-auto"
          style={{ background: '#FFFFFF', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer' }}>
          🗑 Baustein löschen
        </button>
      </div>

      <p className="text-xs" style={{ color: '#7A6A94' }}>
        Aktueller Status: <strong>{STATUS_LABEL[status] ?? status}</strong>
      </p>
    </div>
  )
}

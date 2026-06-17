'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BausteinInhalt, BausteinTyp } from '@/types'

const TYP_OPTIONEN: { value: BausteinTyp; label: string }[] = [
  { value: 'einstieg', label: 'Einstieg' },
  { value: 'vorwissen_check', label: 'Vorwissen-Check' },
  { value: 'input', label: 'Input / Erklärung' },
  { value: 'erarbeitung', label: 'Erarbeitung' },
  { value: 'sicherung', label: 'Sicherung' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'post_check', label: 'Abschluss-Check' },
]

interface Props {
  spielId: string
  bausteinTyp: BausteinTyp
  bausteinInhalt: BausteinInhalt | null
}

// Lehrkraft bearbeitet den Erklär-/Input-Inhalt eines Nicht-Spiel-Bausteins:
// Markdown-Text, Kernaussagen (eine pro Zeile) und Baustein-Typ.
export function BausteinInhaltEdit({ spielId, bausteinTyp, bausteinInhalt }: Props) {
  const router = useRouter()
  const [typ, setTyp] = useState<BausteinTyp>(bausteinTyp)
  const [markdown, setMarkdown] = useState(bausteinInhalt?.markdown ?? '')
  const [kernaussagen, setKernaussagen] = useState((bausteinInhalt?.kernaussagen ?? []).join('\n'))
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  async function speichern() {
    setSaving(true); setFehler(null); setGespeichert(false)
    try {
      const res = await fetch(`/api/games/${spielId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baustein_typ: typ,
          baustein_inhalt: {
            markdown,
            kernaussagen: kernaussagen.split('\n').map((s) => s.trim()).filter(Boolean),
            didaktische_hinweise: bausteinInhalt?.didaktische_hinweise ?? [],
          },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Speichern fehlgeschlagen')
      }
      setGespeichert(true)
      router.refresh()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">Erklär-Inhalt bearbeiten</h2>
        <select
          value={typ}
          onChange={(e) => setTyp(e.target.value as BausteinTyp)}
          className="text-sm rounded-lg border px-2 py-1.5 bg-background"
        >
          {TYP_OPTIONEN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Erklärtext (Markdown)</span>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={10}
          className="w-full rounded-xl border px-3 py-2 text-sm font-mono leading-relaxed bg-background"
          placeholder="Erklärinhalt in kleinen Häppchen …"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Kernaussagen (eine pro Zeile)</span>
        <textarea
          value={kernaussagen}
          onChange={(e) => setKernaussagen(e.target.value)}
          rows={4}
          className="w-full rounded-xl border px-3 py-2 text-sm leading-relaxed bg-background"
          placeholder="Merksatz 1&#10;Merksatz 2"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Die Mini-Verständnisfrage bearbeitest du unten bei den Aufgaben.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={speichern}
          disabled={saving}
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
        >
          {saving ? 'Speichert …' : 'Speichern'}
        </button>
        {gespeichert && <span className="text-xs font-medium text-green-700">Gespeichert ✓</span>}
        {fehler && <span className="text-xs font-medium text-red-600">{fehler}</span>}
      </div>
    </div>
  )
}

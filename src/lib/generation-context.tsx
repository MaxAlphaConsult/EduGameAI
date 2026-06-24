'use client'

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mapLimit } from '@/lib/concurrency'

const ANALYSE_SCHRITTE_COUNT = 21

type Status = 'idle' | 'running' | 'done' | 'error'

export interface GenerationResult {
  gameFlowId: string
  spielIds: string[]
  analyseId: string
  // Block B: Der Flow wird im selben Lauf für die gewählte Klasse freigegeben.
  accessCode: string | null
  releaseError: string | null
  fehlerAnzahl: number
}

export interface GenerationStartParams {
  file: File
  fach: string
  jahrgangsstufe: string
  schulform: string
  spielname: string
  lernziel?: string
  zeitrahmenMinuten: number
  erlaubteFormate: string[]
  anzahlSpiele: number
  // Klasse, für die der fertige LernFlow direkt freigegeben wird (ein Launch).
  classId?: string
}

interface GenerationState {
  status: Status
  percent: number
  label: string
  schrittIndex: number
  result: GenerationResult | null
  error: string | null
  spielname: string
}

interface GenerationContextValue extends GenerationState {
  start: (params: GenerationStartParams) => Promise<void>
  dismiss: () => void
}

const initialState: GenerationState = {
  status: 'idle',
  percent: 0,
  label: '',
  schrittIndex: 0,
  result: null,
  error: null,
  spielname: '',
}

const GenerationContext = createContext<GenerationContextValue | null>(null)

export function useGeneration() {
  const ctx = useContext(GenerationContext)
  if (!ctx) throw new Error('useGeneration must be used within GenerationProvider')
  return ctx
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GenerationState>(initialState)
  // Ref schützt vor parallelem Start (state.status reicht nicht — Stale-Closure).
  const runningRef = useRef(false)

  const start = useCallback(async (params: GenerationStartParams) => {
    if (runningRef.current) {
      throw new Error('Es läuft bereits eine LernFlow-Erstellung — warte bis sie fertig ist.')
    }
    runningRef.current = true

    setState({
      status: 'running',
      percent: 0,
      label: 'Upload läuft …',
      schrittIndex: 0,
      result: null,
      error: null,
      spielname: params.spielname,
    })

    try {
      // Datei zu groß? Früh und freundlich abfangen (Bucket-Limit liegt bei 25 MB).
      const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
      if (params.file.size > MAX_UPLOAD_BYTES) {
        const mb = (params.file.size / 1024 / 1024).toFixed(1)
        throw new Error(`Datei zu groß (${mb} MB). Maximal 20 MB erlaubt.`)
      }

      // Direkt in Supabase Storage laden — am Vercel-Body-Limit (~4,5 MB) vorbei.
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const safeName = params.file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, params.file, { upsert: false })
      if (uploadError) {
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`)
      }

      // Nur noch den Pfad + Metadaten an die Route schicken; sie extrahiert den Text.
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          dateiname: params.file.name,
          fach: params.fach,
          jahrgangsstufe: params.jahrgangsstufe,
          schulform: params.schulform,
        }),
      })
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Upload fehlgeschlagen')
      }
      const { material } = await uploadRes.json()

      const analyseRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: material.id,
          spielname: params.spielname || undefined,
          lernzielLehrkraft: params.lernziel || undefined,
          zeitrahmenMinuten: params.zeitrahmenMinuten,
          erlaubteFormate: params.erlaubteFormate,
          anzahlSpiele: params.anzahlSpiele,
        }),
      })
      if (!analyseRes.ok) {
        const body = await analyseRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Analyse fehlgeschlagen')
      }

      const reader = analyseRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let planned: { gameFlowId: string; analyseId: string; modules: { id: string; position: number; baustein_typ: string }[] } | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))
          if (event.type === 'progress') {
            setState((s) => ({
              ...s,
              label: event.label,
              percent: event.percent,
              schrittIndex: event.schrittIndex,
            }))
          } else if (event.type === 'planned') {
            planned = {
              gameFlowId: event.gameFlowId,
              analyseId: event.analyseId,
              modules: event.modules ?? [],
            }
            setState((s) => ({ ...s, label: 'Bausteine werden erstellt …', percent: 50 }))
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
      }

      // ── Phase 2: Module einzeln generieren (je ein eigenes Lambda) ──────
      if (!planned) throw new Error('Pipeline hat keine Module geplant')
      const p = planned
      const mods = [...p.modules].sort((a, b) => a.position - b.position)
      const total = mods.length
      let fertig = 0
      let fehler = 0
      setState((s) => ({ ...s, label: `Bausteine: 0/${total} …`, percent: 50, schrittIndex: ANALYSE_SCHRITTE_COUNT }))

      // Gedrosselt (2 gleichzeitig) wie der Lehrkraft-Check-Fan-out — pro Modul
      // ein Lambda mit eigenem 5-min-Timeout, also kein Aggregat-Zeitlimit.
      await mapLimit(mods, 2, async (m) => {
        try {
          const res = await fetch(`/api/games/${m.id}/generate`, { method: 'POST' })
          if (!res.ok) fehler++
        } catch {
          fehler++
        }
        fertig++
        setState((s) => ({
          ...s,
          label: `Bausteine: ${fertig}/${total} fertig`,
          percent: 50 + Math.round((fertig / total) * 50),
        }))
      })

      if (fehler >= total) throw new Error('Keiner der Bausteine konnte erzeugt werden')

      const spielIds = mods.map((m) => m.id)

      // ── Phase 3: EIN Launch — Flow direkt für die gewählte Klasse freigeben ──
      // Nur wenn ALLE Bausteine fehlerfrei generiert wurden — sonst würden defekte
      // Module veröffentlicht. Bei Teilfehlern wird NICHT freigegeben; das Ergebnis
      // meldet es, die Lehrkraft kann betroffene Module neu erzeugen und dann freigeben.
      let accessCode: string | null = null
      let releaseError: string | null = null
      if (params.classId && fehler === 0) {
        setState((s) => ({ ...s, label: 'Für die Klasse freigeben …', percent: 100 }))
        try {
          const relRes = await fetch(`/api/flows/${p.gameFlowId}/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: params.classId }),
          })
          const relBody = await relRes.json().catch(() => ({}))
          if (relRes.ok) accessCode = relBody.release?.access_code ?? null
          else releaseError = relBody.error ?? 'Freigabe fehlgeschlagen'
        } catch (err) {
          releaseError = err instanceof Error ? err.message : 'Freigabe fehlgeschlagen'
        }
      } else if (params.classId && fehler > 0) {
        releaseError = `${fehler} von ${total} Bausteinen konnten nicht erzeugt werden — Freigabe pausiert.`
      }

      setState((s) => ({
        ...s,
        status: 'done',
        percent: 100,
        schrittIndex: ANALYSE_SCHRITTE_COUNT,
        result: { gameFlowId: p.gameFlowId, spielIds, analyseId: p.analyseId, accessCode, releaseError, fehlerAnzahl: fehler },
      }))

      // Fire-and-forget Lehrkraft-Validierung pro Modul (Check überspringt Nicht-Spiele).
      for (const id of spielIds) {
        fetch(`/api/games/${id}/check`, { method: 'POST' }).catch(() => { /* best effort */ })
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      }))
    } finally {
      runningRef.current = false
    }
  }, [])

  const dismiss = useCallback(() => {
    if (runningRef.current) return // läuft noch — nicht schließen
    setState(initialState)
  }, [])

  return (
    <GenerationContext.Provider value={{ ...state, start, dismiss }}>
      {children}
    </GenerationContext.Provider>
  )
}

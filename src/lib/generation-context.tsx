'use client'

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

const ANALYSE_SCHRITTE_COUNT = 21

type Status = 'idle' | 'running' | 'done' | 'error'

export interface GenerationResult {
  gameFlowId: string
  spielIds: string[]
  analyseId: string
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
      throw new Error('Es läuft bereits eine Lernspiel-Erstellung — warte bis sie fertig ist.')
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
      const formData = new FormData()
      formData.append('file', params.file)
      formData.append('fach', params.fach)
      formData.append('jahrgangsstufe', params.jahrgangsstufe)
      formData.append('schulform', params.schulform)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
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
          } else if (event.type === 'done') {
            setState((s) => ({
              ...s,
              status: 'done',
              percent: 100,
              schrittIndex: ANALYSE_SCHRITTE_COUNT,
              result: {
                gameFlowId: event.gameFlowId,
                spielIds: event.spielIds,
                analyseId: event.analyseId,
              },
            }))
            // Fire-and-forget Lehrkraft-Validierung pro Spiel
            if (Array.isArray(event.spielIds)) {
              for (const id of event.spielIds as string[]) {
                fetch(`/api/games/${id}/check`, { method: 'POST' }).catch(() => { /* best effort */ })
              }
            }
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
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

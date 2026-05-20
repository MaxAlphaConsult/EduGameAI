'use client'

import { useEffect, useState, useCallback } from 'react'
import { GameEngine } from '@/components/game/GameEngine'
import Link from 'next/link'

type Phase = 'lade-session' | 'lade-modul' | 'spielt' | 'uebergang' | 'fertig' | 'error'

interface AktuellesModul {
  moduleSessionId: string
  gameId: string
  gameSkin: string
  titel: string
  position: number
  niveau: string
}

interface ModulInhalt {
  moduleSessionId: string
  gameId: string
  titel: string
  gameSkin: string
  aufgaben: unknown[]
  niveau: string
  position: number
}

interface ModulErgebnis {
  korrekt: number
  gesamt: number
  kannGut: string[]
  nochUeben: string[]
}

interface FlowState {
  studentSessionId: string
  modul_anzahl: number
  position: number
}

export default function FlowPlayerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('lade-session')
  const [error, setError] = useState<string | null>(null)
  const [aktuell, setAktuell] = useState<AktuellesModul | null>(null)
  const [modulInhalt, setModulInhalt] = useState<ModulInhalt | null>(null)
  const [flowState, setFlowState] = useState<FlowState | null>(null)
  const [letztesErgebnis, setLetztesErgebnis] = useState<ModulErgebnis | null>(null)
  const [gesamtKorrekt, setGesamtKorrekt] = useState(0)
  const [gesamtAufgaben, setGesamtAufgaben] = useState(0)

  // Auflösen des dynamischen Param
  useEffect(() => { params.then(({ sessionId }) => setSessionId(sessionId)) }, [params])

  // 1) Beim Mount: aktuelle Session-Position vom Server holen.
  //    Da wir nur die studentSessionId in der URL haben, fragen wir den
  //    Server, ob die Session existiert und welches Modul gerade dran ist.
  //    Wir nutzen dafür eine kleine Hilfsroute, die das ohne Re-Login auflöst.
  useEffect(() => {
    if (!sessionId) return
    let abort = false
    ;(async () => {
      try {
        const res = await fetch(`/api/student/session/${sessionId}`, { cache: 'no-store' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Session ungültig')
        }
        const data = await res.json()
        if (abort) return
        setFlowState({
          studentSessionId: sessionId,
          modul_anzahl: data.modul_anzahl,
          position: data.aktuelles_modul_index,
        })
        if (data.abgeschlossen || !data.aktuelles_modul) {
          setPhase('fertig')
        } else {
          setAktuell(data.aktuelles_modul)
          setPhase('lade-modul')
        }
      } catch (e) {
        if (abort) return
        setError(e instanceof Error ? e.message : 'Session konnte nicht geladen werden')
        setPhase('error')
      }
    })()
    return () => { abort = true }
  }, [sessionId])

  // 2) Modul-Inhalt laden, sobald aktuelles Modul bekannt ist
  useEffect(() => {
    if (phase !== 'lade-modul' || !aktuell) return
    let abort = false
    ;(async () => {
      try {
        const res = await fetch(`/api/student/module/${aktuell.moduleSessionId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Modul konnte nicht geladen werden')
        const data = await res.json()
        if (abort) return
        setModulInhalt({
          moduleSessionId: data.moduleSessionId,
          gameId: data.gameId,
          titel: data.titel,
          gameSkin: data.gameSkin,
          aufgaben: data.aufgaben,
          niveau: data.niveau,
          position: data.position,
        })
        setPhase('spielt')
      } catch (e) {
        if (abort) return
        setError(e instanceof Error ? e.message : 'Modul-Ladefehler')
        setPhase('error')
      }
    })()
    return () => { abort = true }
  }, [phase, aktuell])

  // Modul fertig → Übergangsseite zeigen
  const handleModulFertig = useCallback((ergebnis: ModulErgebnis) => {
    setLetztesErgebnis(ergebnis)
    setGesamtKorrekt((g) => g + ergebnis.korrekt)
    setGesamtAufgaben((g) => g + ergebnis.gesamt)
    setPhase('uebergang')
  }, [])

  // Weiter im Flow → next-module API rufen
  const handleWeiter = useCallback(async () => {
    if (!flowState || !modulInhalt) return
    setPhase('lade-modul')
    try {
      const res = await fetch('/api/student/next-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentSessionId: flowState.studentSessionId,
          currentModuleSessionId: modulInhalt.moduleSessionId,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Übergang fehlgeschlagen')
      }
      const data = await res.json()
      if (data.finished || !data.naechstes_modul) {
        setPhase('fertig')
        return
      }
      setAktuell(data.naechstes_modul)
      setFlowState((s) => s ? { ...s, position: data.naechstes_modul.position } : s)
      // useEffect lädt den Inhalt
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Übergang fehlgeschlagen')
      setPhase('error')
    }
  }, [flowState, modulInhalt])

  if (!sessionId || phase === 'lade-session') {
    return <CenterMessage emoji="🚀" text="Lade Spiel …" />
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">😕</div>
        <p className="text-base font-semibold">{error}</p>
        <Link href="/spielen" className="rounded-xl px-5 py-3 font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
          Zurück zur Code-Eingabe
        </Link>
      </div>
    )
  }

  if (phase === 'fertig') {
    const prozent = gesamtAufgaben > 0 ? Math.round((gesamtKorrekt / gesamtAufgaben) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">{prozent >= 80 ? '🌟' : prozent >= 50 ? '💪' : '📚'}</div>
        <div>
          <h1 className="text-3xl font-black mb-1">Geschafft!</h1>
          <p className="text-base text-muted-foreground">
            Du hast alle {flowState?.modul_anzahl ?? 0} Spiele dieser Lernreise abgeschlossen.
          </p>
        </div>
        <div className="rounded-2xl border bg-violet-50 border-violet-200 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-1">Dein Gesamtergebnis</p>
          <p className="text-2xl font-black text-violet-900">{gesamtKorrekt} von {gesamtAufgaben} Aufgaben richtig</p>
          <p className="text-sm text-violet-700 mt-1">{prozent}% der Aufgaben gelöst</p>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Deine Lehrkraft kann jetzt sehen, was schon gut sitzt und wo es noch Übung braucht.
        </p>
      </div>
    )
  }

  if (phase === 'uebergang' && letztesErgebnis && flowState) {
    const istLetztes = (aktuell?.position ?? 0) + 1 >= flowState.modul_anzahl
    return (
      <ModulUebergang
        ergebnis={letztesErgebnis}
        position={(aktuell?.position ?? 0) + 1}
        gesamt={flowState.modul_anzahl}
        istLetztes={istLetztes}
        onWeiter={handleWeiter}
      />
    )
  }

  if (phase === 'lade-modul') {
    return <CenterMessage emoji="✨" text="Nächstes Spiel wird vorbereitet …" />
  }

  if (phase === 'spielt' && modulInhalt && flowState) {
    return (
      <div className="min-h-screen bg-background">
        <FlowProgress
          position={modulInhalt.position}
          gesamt={flowState.modul_anzahl}
          titel={modulInhalt.titel}
        />
        <GameEngine
          moduleSessionId={modulInhalt.moduleSessionId}
          aufgaben={modulInhalt.aufgaben as Parameters<typeof GameEngine>[0]['aufgaben']}
          niveau={modulInhalt.niveau}
          gameSkin={modulInhalt.gameSkin}
          onModulFertig={handleModulFertig}
        />
      </div>
    )
  }

  return null
}

function CenterMessage({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="text-5xl animate-pulse">{emoji}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function FlowProgress({ position, gesamt, titel }: { position: number; gesamt: number; titel: string }) {
  const prozent = Math.round(((position) / gesamt) * 100)
  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Spiel {position + 1} von {gesamt}
          </span>
          <span className="text-xs text-muted-foreground truncate ml-3 max-w-[60%]" title={titel}>
            {titel}
          </span>
        </div>
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${prozent}%` }} />
        </div>
      </div>
    </div>
  )
}

function ModulUebergang({
  ergebnis, position, gesamt, istLetztes, onWeiter,
}: {
  ergebnis: ModulErgebnis
  position: number
  gesamt: number
  istLetztes: boolean
  onWeiter: () => void
}) {
  const prozent = ergebnis.gesamt > 0 ? Math.round((ergebnis.korrekt / ergebnis.gesamt) * 100) : 0
  const stark = prozent >= 80, mittel = prozent >= 50
  const emoji = stark ? '🌟' : mittel ? '💪' : '📚'
  const message = stark
    ? 'Super! Auf zur nächsten Aufgabe.'
    : mittel
      ? 'Solide. Du machst Fortschritte.'
      : 'Das war noch knifflig — bleib dran.'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Spiel {position} von {gesamt} geschafft
        </p>
        <h2 className="text-2xl font-bold">{ergebnis.korrekt} von {ergebnis.gesamt} richtig</h2>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>

      {(ergebnis.kannGut.length > 0 || ergebnis.nochUeben.length > 0) && (
        <div className="w-full max-w-md text-left flex flex-col gap-3">
          {ergebnis.kannGut.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800 mb-2">Das sitzt schon</p>
              <ul className="flex flex-wrap gap-1.5">
                {ergebnis.kannGut.map((tk) => (
                  <li key={tk} className="text-xs bg-white border border-green-200 rounded-full px-2.5 py-1 text-green-800">{tk}</li>
                ))}
              </ul>
            </div>
          )}
          {ergebnis.nochUeben.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">Da gibts noch was zu üben</p>
              <ul className="flex flex-wrap gap-1.5">
                {ergebnis.nochUeben.map((tk) => (
                  <li key={tk} className="text-xs bg-white border border-amber-200 rounded-full px-2.5 py-1 text-amber-800">{tk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onWeiter}
        className="w-full max-w-md py-3.5 rounded-xl font-bold text-base text-white transition-opacity"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
      >
        {istLetztes ? 'Lernreise abschließen →' : 'Weiter zum nächsten Spiel →'}
      </button>
    </div>
  )
}

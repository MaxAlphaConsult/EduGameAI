'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'flow' | 'student' | 'error'

interface FlowLookup {
  flowReleaseId: string
  flow: { id: string; titel: string }
  klasse: { id: string; name: string; fach: string; jahrgangsstufe: string }
  modul_anzahl: number
}

export default function SpielerPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('flow')
  const [previousStep, setPreviousStep] = useState<Step>('flow')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [flowLookup, setFlowLookup] = useState<FlowLookup | null>(null)
  const [flowCodeInput, setFlowCodeInput] = useState('')
  const [studentCodeInput, setStudentCodeInput] = useState('')
  const flowInputRef = useRef<HTMLInputElement>(null)
  const studentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'student') setTimeout(() => studentInputRef.current?.focus(), 50)
    else setTimeout(() => flowInputRef.current?.focus(), 50)
  }, [step])

  async function onSubmitFlow(e: React.FormEvent) {
    e.preventDefault()
    if (!flowCodeInput.trim()) return
    setLoading(true)
    setErrorMsg('')
    setPreviousStep('flow')

    const res = await fetch('/api/student/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowCode: flowCodeInput.trim() }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErrorMsg(data.error ?? 'Unbekannter Fehler')
      setStep('error')
      return
    }

    setFlowLookup(data)
    setStep('student')
  }

  async function onSubmitStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!studentCodeInput.trim() || !flowLookup) return
    setLoading(true)
    setErrorMsg('')
    setPreviousStep('student')

    const res = await fetch('/api/student/start-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowReleaseId: flowLookup.flowReleaseId,
        studentCode: studentCodeInput.trim(),
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      setErrorMsg(data.error ?? 'Unbekannter Fehler')
      setStep('error')
      return
    }

    router.push(`/play/${data.studentSessionId}`)
  }

  function onResetAll() {
    setStep('flow')
    setFlowLookup(null)
    setFlowCodeInput('')
    setStudentCodeInput('')
    setErrorMsg('')
  }

  function onBackFromError() {
    setErrorMsg('')
    setStep(previousStep)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 sm:mb-10">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg sm:text-xl"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', boxShadow: '0 0 32px rgba(168,85,247,0.5)' }}>
          E
        </div>
        <div>
          <p className="text-white font-bold text-lg sm:text-xl leading-none">EduGame AI</p>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#C4B5FD' }}>Schüler-Zugang</p>
        </div>
      </div>

      <div className="w-full max-w-md sm:max-w-lg rounded-3xl p-6 sm:p-8"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(196,181,253,0.2)', backdropFilter: 'blur(20px)' }}>

        {/* ── Step 1: Flow-Code ── */}
        {step === 'flow' && (
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎮</div>
              <h1 className="text-2xl font-black text-white mb-2">Bereit zum Spielen?</h1>
              <p style={{ color: '#C4B5FD', fontSize: 15 }}>
                Schritt 1 von 2 — Gib den Spielcode deiner Lehrkraft ein
              </p>
            </div>

            <form onSubmit={onSubmitFlow} className="flex flex-col gap-4">
              <input
                ref={flowInputRef}
                type="text"
                value={flowCodeInput}
                onChange={(e) => setFlowCodeInput(e.target.value.toUpperCase())}
                placeholder="z.B. ZELLE-9A-K42"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full text-center font-mono text-xl font-bold tracking-widest rounded-2xl px-5 py-4 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(196,181,253,0.3)',
                  color: '#FFFFFF',
                  letterSpacing: '0.12em',
                }}
              />

              <button
                type="submit"
                disabled={loading || !flowCodeInput.trim()}
                className="w-full rounded-2xl py-4 font-black text-lg transition-all"
                style={{
                  background: loading || !flowCodeInput.trim()
                    ? 'rgba(124,58,237,0.3)'
                    : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: 'white',
                  boxShadow: loading || !flowCodeInput.trim() ? 'none' : '0 0 32px rgba(168,85,247,0.4)',
                  cursor: loading || !flowCodeInput.trim() ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}>
                {loading ? '⟳ Suche...' : 'Weiter →'}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Keinen Code? Frag deine Lehrkraft.
            </p>
          </>
        )}

        {/* ── Step 2: Schülercode ── */}
        {step === 'student' && flowLookup && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎯</div>
              <h1 className="text-xl font-black text-white mb-2">Spielcode gefunden!</h1>
              <p className="font-bold text-white text-base mb-1">{flowLookup.flow.titel}</p>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mt-1"
                style={{ background: 'rgba(196,181,253,0.15)', border: '1px solid rgba(196,181,253,0.3)' }}>
                <span className="text-sm" style={{ color: '#C4B5FD' }}>
                  Klasse {flowLookup.klasse.jahrgangsstufe}{flowLookup.klasse.name} · {flowLookup.klasse.fach}
                </span>
                <span style={{ color: 'rgba(196,181,253,0.5)' }}>·</span>
                <span className="text-sm" style={{ color: '#C4B5FD' }}>
                  {flowLookup.modul_anzahl} {flowLookup.modul_anzahl === 1 ? 'Spiel' : 'Spiele'}
                </span>
              </div>
            </div>

            <p className="text-center text-sm mb-4" style={{ color: '#C4B5FD' }}>
              Schritt 2 von 2 — Gib jetzt deinen persönlichen Code ein
            </p>

            <form onSubmit={onSubmitStudent} className="flex flex-col gap-4">
              <input
                ref={studentInputRef}
                type="text"
                value={studentCodeInput}
                onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                placeholder="z.B. FUCHS-1234"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full text-center font-mono text-xl font-bold tracking-widest rounded-2xl px-5 py-4 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(196,181,253,0.3)',
                  color: '#FFFFFF',
                  letterSpacing: '0.12em',
                }}
              />

              <button
                type="submit"
                disabled={loading || !studentCodeInput.trim()}
                className="w-full rounded-2xl py-4 font-black text-lg transition-all"
                style={{
                  background: loading || !studentCodeInput.trim()
                    ? 'rgba(124,58,237,0.3)'
                    : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: 'white',
                  boxShadow: loading || !studentCodeInput.trim() ? 'none' : '0 0 32px rgba(168,85,247,0.4)',
                  cursor: loading || !studentCodeInput.trim() ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}>
                {loading ? '⟳ Starte...' : 'Los geht\'s →'}
              </button>
            </form>

            <button onClick={onResetAll}
              className="w-full mt-4 text-sm py-2 rounded-xl transition-all"
              style={{ color: 'rgba(196,181,253,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Anderen Spielcode eingeben
            </button>
          </>
        )}

        {/* ── Fehler ── */}
        {step === 'error' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">😕</div>
              <h1 className="text-xl font-black text-white mb-2">Das hat nicht geklappt</h1>
              <p style={{ color: '#FCA5A5', fontSize: 14 }}>{errorMsg}</p>
            </div>

            <button onClick={onBackFromError}
              className="w-full rounded-2xl py-4 font-black text-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: 'white',
                boxShadow: '0 0 32px rgba(168,85,247,0.4)',
                border: 'none',
                cursor: 'pointer',
              }}>
              Nochmal versuchen
            </button>

            <button onClick={onResetAll}
              className="w-full mt-3 text-sm py-2 rounded-xl transition-all"
              style={{ color: 'rgba(196,181,253,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Zurück zum Anfang
            </button>
          </>
        )}
      </div>

      <p className="mt-8 text-xs" style={{ color: 'rgba(196,181,253,0.3)' }}>
        EduGame AI · Kein Account nötig · DSGVO-konform
      </p>
    </div>
  )
}

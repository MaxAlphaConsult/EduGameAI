'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E9D5FF',
  boxShadow: '0 2px 24px rgba(124,58,237,0.08)',
  borderRadius: 20,
}

const inputStyle = {
  width: '100%',
  border: '1.5px solid #E9D5FF',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  background: '#FAFAFA',
  color: '#1F1235',
  outline: 'none',
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1F1235',
} as const

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SaveButton({ state, label = 'Speichern' }: { state: SaveState; label?: string }) {
  const cfg = {
    idle:   { bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', label, shadow: '0 4px 16px rgba(124,58,237,0.3)' },
    saving: { bg: 'rgba(124,58,237,0.4)', label: 'Speichern…', shadow: 'none' },
    saved:  { bg: 'linear-gradient(135deg,#059669,#10B981)', label: '✓ Gespeichert', shadow: '0 4px 16px rgba(5,150,105,0.3)' },
    error:  { bg: 'linear-gradient(135deg,#DC2626,#EF4444)', label: '✗ Fehler', shadow: 'none' },
  }[state]
  return (
    <button type="submit" disabled={state === 'saving'}
      className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all"
      style={{ background: cfg.bg, color: 'white', border: 'none', cursor: state === 'saving' ? 'not-allowed' : 'pointer', boxShadow: cfg.shadow }}>
      {cfg.label}
    </button>
  )
}

export default function EinstellungenPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [schule, setSchule] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileState, setProfileState] = useState<SaveState>('idle')
  const [emailState, setEmailState] = useState<SaveState>('idle')
  const [passwordState, setPasswordState] = useState<SaveState>('idle')
  const [passwordError, setPasswordError] = useState('')

  const [logoutPending, setLogoutPending] = useState(false)
  const router = useRouter()

  // Profil laden
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      setNewEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, schule')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name ?? '')
        setSchule(profile.schule ?? '')
      }
    }
    load()
  }, [])

  // Profil speichern (Name + Schule)
  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileState('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProfileState('error'); return }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, name, schule, updated_at: new Date().toISOString() })

    setProfileState(error ? 'error' : 'saved')
    if (!error) setTimeout(() => setProfileState('idle'), 2500)
  }

  // E-Mail ändern
  async function onSaveEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim() || newEmail === email) return
    setEmailState('saving')
    const { error } = await createClient().auth.updateUser({ email: newEmail })
    setEmailState(error ? 'error' : 'saved')
    if (!error) {
      setEmail(newEmail)
      setTimeout(() => setEmailState('idle'), 2500)
    }
  }

  // Passwort ändern
  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    if (newPassword.length < 8) { setPasswordError('Mindestens 8 Zeichen'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwörter stimmen nicht überein'); return }
    setPasswordState('saving')
    const { error } = await createClient().auth.updateUser({ password: newPassword })
    setPasswordState(error ? 'error' : 'saved')
    if (!error) {
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordState('idle'), 2500)
    }
  }

  async function onLogout() {
    setLogoutPending(true)
    await createClient().auth.signOut()
    router.push('/login')
  }

  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase()

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1F1235' }}>Einstellungen</h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A94' }}>Profil, Account und Sicherheit verwalten</p>
      </div>

      {/* Avatar + Überblick */}
      <div className="flex items-center gap-5 mb-8 px-6 py-5 rounded-2xl"
        style={{ background: 'linear-gradient(135deg,#7C3AED10,#A855F708)', border: '1px solid #E9D5FF' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: 'white' }}>
          {initials || 'L'}
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: '#1F1235' }}>{name || 'Lehrkraft'}</p>
          {schule && <p className="text-sm" style={{ color: '#7A6A94' }}>{schule}</p>}
          <p className="text-sm" style={{ color: '#7A6A94' }}>{email}</p>
        </div>
      </div>

      {/* ── Profil: Name + Schule ── */}
      <div style={cardStyle} className="p-6 mb-5">
        <h2 className="font-bold mb-5" style={{ color: '#1F1235' }}>Profil</h2>
        <form onSubmit={onSaveProfile} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Vollständiger Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Maria Musterfrau"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Schule</label>
            <input
              type="text"
              value={schule}
              onChange={(e) => setSchule(e.target.value)}
              placeholder="z.B. Gymnasium Musterstadt"
              style={inputStyle}
            />
          </div>
          <div className="flex justify-end">
            <SaveButton state={profileState} />
          </div>
        </form>
      </div>

      {/* ── E-Mail ── */}
      <div style={cardStyle} className="p-6 mb-5">
        <h2 className="font-bold mb-5" style={{ color: '#1F1235' }}>E-Mail-Adresse</h2>
        <form onSubmit={onSaveEmail} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Neue E-Mail</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={inputStyle}
            />
            <p className="text-xs mt-1.5" style={{ color: '#7A6A94' }}>
              Du erhältst eine Bestätigungs-E-Mail an die neue Adresse.
            </p>
          </div>
          <div className="flex justify-end">
            <SaveButton state={emailState} label="E-Mail ändern" />
          </div>
        </form>
      </div>

      {/* ── Passwort ── */}
      <div style={cardStyle} className="p-6 mb-5">
        <h2 className="font-bold mb-5" style={{ color: '#1F1235' }}>Passwort ändern</h2>
        <form onSubmit={onSavePassword} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Neues Passwort</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Wiederholen"
              style={inputStyle}
            />
          </div>
          {passwordError && (
            <p className="text-sm rounded-xl px-4 py-2" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {passwordError}
            </p>
          )}
          <div className="flex justify-end">
            <SaveButton state={passwordState} label="Passwort ändern" />
          </div>
        </form>
      </div>

      {/* ── Abonnement ── */}
      <div style={cardStyle} className="p-6 mb-5">
        <h2 className="font-bold mb-4" style={{ color: '#1F1235' }}>Abonnement</h2>
        <div className="flex items-center justify-between rounded-xl px-5 py-4"
          style={{ background: 'linear-gradient(135deg,#7C3AED08,#A855F705)', border: '1px solid #E9D5FF' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1F1235' }}>Free Plan</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>Bis zu 5 Spiele · 1 Klasse</p>
          </div>
          <span className="rounded-xl px-4 py-2 text-xs font-bold"
            style={{ background: '#EDE9FE', color: '#7C3AED', border: '1px solid #C4B5FD' }}>
            Kostenlos
          </span>
        </div>
        <p className="text-xs mt-3" style={{ color: '#7A6A94' }}>Pro-Plan mit unbegrenzten Spielen kommt bald.</p>
      </div>

      {/* ── Abmelden ── */}
      <div style={cardStyle} className="p-6">
        <h2 className="font-bold mb-4" style={{ color: '#1F1235' }}>Session</h2>
        <button onClick={onLogout} disabled={logoutPending}
          className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all"
          style={{
            background: '#FEF2F2', color: '#DC2626',
            border: '1px solid #FECACA', cursor: 'pointer',
            opacity: logoutPending ? 0.7 : 1,
          }}>
          {logoutPending ? 'Abmelden…' : '← Abmelden'}
        </button>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Start', icon: '🏠' },
  { href: '/spiele', label: 'Lernspiele', icon: '📚' },
  { href: '/classes', label: 'Klassen', icon: '👥' },
]

const bottomItems = [
  { href: '/einstellungen', label: 'Einstellungen', icon: '⚙' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.name) setDisplayName(data.name)
        })
    })
  }, [])

  const avatarInitial = displayName ? displayName[0].toUpperCase() : 'L'
  const label = displayName || 'Lehrkraft'

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F6F1FF' }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col flex-shrink-0 fixed top-0 left-0 h-full z-20"
        style={{ background: '#160B2E', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
              <span className="text-white text-xs font-black">E</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">EduGame AI</p>
              <p className="text-xs mt-0.5" style={{ color: '#7A6A94' }}>Lehrer-Portal</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-4" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-xs font-semibold px-3 mb-2" style={{ color: '#4B3A72', letterSpacing: '0.08em' }}>MENÜ</p>
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
                style={{
                  background: active ? 'linear-gradient(135deg, #7C3AED22, #A855F711)' : 'transparent',
                  color: active ? '#C4B5FD' : '#6B5B8A',
                  border: active ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                }}>
                <span className="text-base w-5 text-center flex-shrink-0 transition-all"
                  style={{ color: active ? '#A855F7' : '#4B3A72' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#A855F7' }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4">
          <div className="mb-2" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          {bottomItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: active ? '#C4B5FD' : '#4B3A72' }}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.1)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white' }}>
              {avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#C4B5FD' }}>{label}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 min-h-screen overflow-auto" style={{ background: '#F6F1FF' }}>
        {children}
      </main>
    </div>
  )
}

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

export interface SortierItem {
  text: string
  kategorie: string
}

interface Props {
  text?: string
  /** Items mit ihrer richtigen Kategorie */
  items: SortierItem[]
  /** Vorgegebene Kategorie-Boxen unten */
  kategorien: string[]
  onAntwort: (antworten: string[], korrekt: boolean) => void
  /** Sekunden pro Item bis es „verfällt" und einen Fehler einbringt. 0 = ohne Timer. */
  zeitProItem?: number
}

interface TileState {
  id: number
  item: SortierItem
  /** Bei der gewählten Kategorie gelandet, oder null wenn noch nicht zugeordnet */
  abgelegt: string | null
  korrekt: boolean | null
}

export function SortierKarussell({
  text = 'Sortiere die Items in die passenden Kategorien',
  items,
  kategorien,
  onAntwort,
  zeitProItem = 0,
}: Props) {
  const theme = useGameTheme()

  // Shuffle der Items einmal beim Mount
  const shuffled = useMemo(() => {
    const list = items.map((it, i) => ({ ...it, _seed: i }))
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list.map((it, i) => ({ id: i, item: it }))
  }, [items])

  const [tiles, setTiles] = useState<TileState[]>(
    shuffled.map(({ id, item }) => ({ id, item, abgelegt: null, korrekt: null })),
  )
  const [aktiverIdx, setAktiverIdx] = useState(0)
  const [fertig, setFertig] = useState(false)
  const [timer, setTimer] = useState(zeitProItem)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const aktivesTile = tiles[aktiverIdx]
  const offenCount = tiles.filter((t) => t.abgelegt === null).length
  const korrektCount = tiles.filter((t) => t.korrekt === true).length

  // Timer pro Item
  useEffect(() => {
    if (!zeitProItem || fertig || !aktivesTile || aktivesTile.abgelegt !== null) return
    setTimer(zeitProItem)
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          // Zeit abgelaufen → falsch markiert, weiter
          ablegen(aktivesTile.id, '__TIMEOUT__')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiverIdx, fertig, zeitProItem])

  function ablegen(tileId: number, kategorie: string) {
    if (fertig) return
    const tile = tiles.find((t) => t.id === tileId)
    if (!tile || tile.abgelegt !== null) return
    const istKorrekt = kategorie === tile.item.kategorie
    if (istKorrekt) {
      burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.5 } })
    }
    setTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, abgelegt: kategorie, korrekt: istKorrekt } : t)),
    )
    // Zum nächsten offenen Tile
    const naechsterIdx = tiles.findIndex((t, idx) => idx > aktiverIdx && t.abgelegt === null)
    if (naechsterIdx !== -1) {
      setAktiverIdx(naechsterIdx)
    } else {
      // Alle durch → beenden
      setFertig(true)
      const alleKorrekt =
        tiles.filter((t) => t.id !== tileId).every((t) => t.korrekt === true) && istKorrekt
      const detail = tiles.map((t) =>
        t.id === tileId
          ? `${t.item.text} → ${kategorie}`
          : `${t.item.text} → ${t.abgelegt ?? '?'}`,
      )
      setTimeout(() => onAntwort(detail, alleKorrekt), 800)
    }
  }

  const status: 'idle' | 'korrekt' | 'falsch' = !fertig
    ? 'idle'
    : korrektCount >= Math.ceil(tiles.length * 0.75)
    ? 'korrekt'
    : 'falsch'

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base font-bold text-center leading-snug" style={{ color: theme.text }}>
        {text}
      </p>

      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Übrig: <span style={{ color: theme.text }}>{offenCount}</span>
        </span>
        {zeitProItem > 0 && !fertig && (
          <span
            className="tabular-nums font-bold"
            style={{
              color: timer <= 3 ? theme.error : theme.warning,
            }}
          >
            ⏱ {timer}s
          </span>
        )}
        <span style={{ color: theme.textMuted }}>
          Richtig: <span style={{ color: theme.success }}>{korrektCount}</span>
        </span>
      </div>

      {/* Aktives Item — fliegt von oben rein */}
      <div className="flex justify-center" style={{ minHeight: 90 }}>
        <AnimatePresence mode="wait">
          {aktivesTile && aktivesTile.abgelegt === null && !fertig && (
            <motion.div
              key={aktivesTile.id}
              initial={{ y: -80, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 120, opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="rounded-2xl px-6 py-4 text-base font-bold text-white text-center shadow-2xl max-w-xs"
              style={{
                background: theme.accentGradient,
                boxShadow: theme.glowAccent,
                border: `2px solid ${theme.border}`,
              }}
            >
              {aktivesTile.item.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Kategorie-Boxen */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(kategorien.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {kategorien.map((kat) => (
          <motion.button
            key={kat}
            onClick={() => aktivesTile && aktivesTile.abgelegt === null && ablegen(aktivesTile.id, kat)}
            disabled={fertig || !aktivesTile || aktivesTile.abgelegt !== null}
            whileHover={!fertig && aktivesTile?.abgelegt === null ? { scale: 1.04, y: -3 } : undefined}
            whileTap={!fertig && aktivesTile?.abgelegt === null ? { scale: 0.95 } : undefined}
            className="rounded-2xl p-4 border-2 text-sm font-bold flex flex-col items-center gap-2 min-h-[100px] justify-center"
            style={{
              background: theme.surface,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <span className="text-xs uppercase tracking-widest opacity-60">Kategorie</span>
            <span className="leading-tight text-center">{kat}</span>
            <span className="text-[10px] opacity-60">
              {tiles.filter((t) => t.abgelegt === kat).length} hier
            </span>
          </motion.button>
        ))}
      </div>

      {/* Visuelle Übersicht aller bisher abgelegten Tiles */}
      {tiles.some((t) => t.abgelegt !== null) && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {tiles
            .filter((t) => t.abgelegt !== null)
            .map((t) => (
              <span
                key={t.id}
                className="text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{
                  background: t.korrekt ? theme.successSoft : theme.errorSoft,
                  color: t.korrekt ? theme.success : theme.error,
                  border: `1px solid ${t.korrekt ? theme.success : theme.error}`,
                }}
              >
                {t.korrekt ? '✓' : '✗'} {t.item.text}
              </span>
            ))}
        </div>
      )}

      <ResultBanner
        status={status}
        detail={fertig ? `${korrektCount} / ${tiles.length} richtig` : undefined}
      />
    </div>
  )
}

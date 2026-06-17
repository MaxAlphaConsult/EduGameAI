'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

interface Props {
  text?: string
  /** Zu findende Wörter (in Großbuchstaben). Werden ins Gitter eingebaut. */
  zuFindende: string[]
  /** Optional: Gitter-Größe (Default 6×6). Muss groß genug für längstes Wort sein. */
  groesse?: number
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'

interface Cell {
  buchstabe: string
  /** Indices der zu findenden Wörter, die diesen Buchstaben enthalten */
  wortIndices: number[]
}

interface PathSegment {
  row: number
  col: number
}

function buildGrid(words: string[], size: number): Cell[][] {
  const grid: (Cell | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
  const wordsUpper = words.map((w) => w.toUpperCase())

  // 4 Richtungen: horizontal-rechts, vertikal-unten, diagonal-rechtsunten, diagonal-rechtsoben
  const directions: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ]

  function tryPlace(word: string, wordIdx: number): boolean {
    const tries = 200
    for (let t = 0; t < tries; t++) {
      const [dr, dc] = directions[Math.floor(Math.random() * directions.length)]
      const minR = dr < 0 ? word.length - 1 : 0
      const maxR = dr > 0 ? size - word.length : size - 1
      const minC = dc < 0 ? word.length - 1 : 0
      const maxC = dc > 0 ? size - word.length : size - 1
      if (minR > maxR || minC > maxC) continue
      const r = minR + Math.floor(Math.random() * (maxR - minR + 1))
      const c = minC + Math.floor(Math.random() * (maxC - minC + 1))
      // Check ob Buchstaben passen
      let kollision = false
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i
        const cc = c + dc * i
        const vorhanden = grid[rr]?.[cc]
        if (vorhanden && vorhanden.buchstabe !== word[i]) {
          kollision = true
          break
        }
      }
      if (kollision) continue
      // Platzieren
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i
        const cc = c + dc * i
        const vorhanden = grid[rr][cc]
        if (vorhanden) {
          vorhanden.wortIndices.push(wordIdx)
        } else {
          grid[rr][cc] = { buchstabe: word[i], wortIndices: [wordIdx] }
        }
      }
      return true
    }
    return false
  }

  wordsUpper.forEach((w, i) => tryPlace(w, i))

  // Leere Zellen mit zufälligen Buchstaben füllen
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = {
          buchstabe: ALPHABET[Math.floor(Math.random() * 26)], // nur A-Z für Filler
          wortIndices: [],
        }
      }
    }
  }
  return grid as Cell[][]
}

export function WortSchlange({
  text = 'Finde die Fachbegriffe — ziehe eine Linie durch die Buchstaben',
  zuFindende,
  groesse,
  onAntwort,
}: Props) {
  const theme = useGameTheme()
  const wordsUpper = useMemo(() => zuFindende.map((w) => w.toUpperCase()), [zuFindende])
  const maxLen = Math.max(...wordsUpper.map((w) => w.length))
  const size = groesse ?? Math.max(6, maxLen + 1)
  const grid = useMemo(() => buildGrid(wordsUpper, size), [wordsUpper, size])

  const [path, setPath] = useState<PathSegment[]>([])
  const [drawing, setDrawing] = useState(false)
  const [gefundene, setGefundene] = useState<Set<string>>(new Set())
  const [fertig, setFertig] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Maus-/Touch-Handling
  const startDraw = useCallback((row: number, col: number) => {
    if (fertig) return
    setDrawing(true)
    setPath([{ row, col }])
  }, [fertig])

  const continueDraw = useCallback(
    (row: number, col: number) => {
      if (!drawing) return
      setPath((prev) => {
        if (prev.length === 0) return [{ row, col }]
        const last = prev[prev.length - 1]
        if (last.row === row && last.col === col) return prev
        // Wenn schon im Pfad: zurückgehen erlauben (letzte Zelle entfernen wenn passend)
        const existingIdx = prev.findIndex((p) => p.row === row && p.col === col)
        if (existingIdx !== -1) {
          // Pfad bis zu dieser Zelle abschneiden
          return prev.slice(0, existingIdx + 1)
        }
        // Adjacency-Check (8-Nachbarschaft)
        const dr = Math.abs(row - last.row)
        const dc = Math.abs(col - last.col)
        if (dr <= 1 && dc <= 1 && (dr + dc) > 0) {
          return [...prev, { row, col }]
        }
        return prev
      })
    },
    [drawing],
  )

  const endDraw = useCallback(() => {
    if (!drawing) return
    setDrawing(false)
    const wort = path.map((p) => grid[p.row][p.col].buchstabe).join('')
    const wortRev = wort.split('').reverse().join('')

    let matched: string | null = null
    for (const w of wordsUpper) {
      if (!gefundene.has(w) && (w === wort || w === wortRev)) {
        matched = w
        break
      }
    }

    if (matched) {
      const next = new Set(gefundene)
      next.add(matched)
      setGefundene(next)
      burstKorrekt({ farbe: theme.success, intensitaet: 'klein', origin: { x: 0.5, y: 0.4 } })

      if (next.size >= wordsUpper.length) {
        setFertig(true)
        burstKorrekt({ farbe: theme.success, intensitaet: 'gross' })
        setTimeout(() => onAntwort([...next], true), 1000)
      }
    }
    setPath([])
  }, [drawing, path, grid, wordsUpper, gefundene, onAntwort, theme.success])

  // Aufgeben-Button
  function aufgeben() {
    if (fertig) return
    setFertig(true)
    onAntwort([...gefundene], gefundene.size >= Math.ceil(wordsUpper.length / 2))
  }

  // Globales mouseup für Drag-Ende
  useEffect(() => {
    function up() { if (drawing) endDraw() }
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [drawing, endDraw])

  // Welche Zellen sind in einem gefundenen Wort?
  const lockedCells = useMemo(() => {
    const set = new Set<string>()
    grid.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (cell.wortIndices.some((i) => gefundene.has(wordsUpper[i]))) {
          set.add(`${rIdx}-${cIdx}`)
        }
      })
    })
    return set
  }, [grid, gefundene, wordsUpper])

  const status: 'idle' | 'korrekt' | 'falsch' = !fertig
    ? 'idle'
    : gefundene.size === wordsUpper.length
    ? 'korrekt'
    : 'falsch'

  return (
    <div className="flex flex-col gap-4 select-none">
      <p className="text-base font-bold text-center leading-snug" style={{ color: theme.text }}>
        {text}
      </p>

      <div className="flex items-center justify-between text-xs font-semibold">
        <span style={{ color: theme.textMuted }}>
          Gefunden: <span style={{ color: theme.success }}>{gefundene.size}</span> / {wordsUpper.length}
        </span>
        {!fertig && (
          <button
            onClick={aufgeben}
            className="text-[10px] uppercase tracking-widest font-bold opacity-60 hover:opacity-100 underline underline-offset-4"
            style={{ color: theme.textMuted }}
          >
            Aufgeben
          </button>
        )}
      </div>

      {/* Gitter */}
      <div
        ref={containerRef}
        className="grid mx-auto gap-1.5 p-3 rounded-2xl border-2"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          background: theme.surfaceAlt,
          borderColor: theme.border,
          width: 'fit-content',
          touchAction: 'none',
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const inPath = path.some((p) => p.row === r && p.col === c)
            const locked = lockedCells.has(`${r}-${c}`)
            const pathIdx = path.findIndex((p) => p.row === r && p.col === c)

            let bg = theme.surface
            let color = theme.text
            let border = theme.border
            if (locked) {
              bg = theme.successSoft
              color = theme.success
              border = theme.success
            } else if (inPath) {
              bg = theme.accent
              color = '#fff'
              border = theme.accent
            }

            return (
              <motion.div
                key={`${r}-${c}`}
                onMouseDown={() => startDraw(r, c)}
                onMouseEnter={() => continueDraw(r, c)}
                onTouchStart={(e) => {
                  e.preventDefault()
                  startDraw(r, c)
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0]
                  const elem = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
                  const dataPos = elem?.getAttribute('data-cell')
                  if (dataPos) {
                    const [rr, cc] = dataPos.split('-').map(Number)
                    continueDraw(rr, cc)
                  }
                }}
                data-cell={`${r}-${c}`}
                whileHover={!fertig ? { scale: 1.06 } : undefined}
                animate={inPath ? { scale: 1.04 } : { scale: 1 }}
                className="flex items-center justify-center rounded-lg font-extrabold cursor-pointer"
                style={{
                  width: 38,
                  height: 38,
                  fontSize: 16,
                  background: bg,
                  color,
                  border: `2px solid ${border}`,
                  userSelect: 'none',
                }}
              >
                {cell.buchstabe}
                {inPath && pathIdx > 0 && (
                  <span
                    className="absolute -translate-y-5 -translate-x-3 text-[9px] opacity-70"
                    style={{ pointerEvents: 'none' }}
                  >
                    {pathIdx + 1}
                  </span>
                )}
              </motion.div>
            )
          }),
        )}
      </div>

      {/* Wort-Liste */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {wordsUpper.map((w) => {
          const found = gefundene.has(w)
          return (
            <motion.span
              key={w}
              animate={found ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: found ? theme.successSoft : theme.surfaceAlt,
                color: found ? theme.success : theme.textMuted,
                border: `1px solid ${found ? theme.success : theme.border}`,
                textDecoration: found ? 'line-through' : undefined,
              }}
            >
              {w}
            </motion.span>
          )
        })}
      </div>

      <AnimatePresence>
        {path.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-bold tabular-nums tracking-widest"
            style={{ color: theme.accent }}
          >
            {path.map((p) => grid[p.row][p.col].buchstabe).join(' ')}
          </motion.div>
        )}
      </AnimatePresence>

      <ResultBanner
        status={status}
        detail={fertig ? `${gefundene.size} / ${wordsUpper.length} gefunden` : undefined}
      />
    </div>
  )
}

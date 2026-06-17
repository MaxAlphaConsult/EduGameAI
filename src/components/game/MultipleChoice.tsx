'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameTheme } from './shared/GameTheme'
import { ResultBanner } from './shared/FeedbackBurst'
import { burstKorrekt } from '@/lib/game/feedback'

interface Option {
  text: string
  isCorrect: boolean
}

interface Props {
  aufgabeId: string
  text: string
  optionen: Option[]
  mehrfach: boolean
  hilfen: string[]
  feedback: { bei_korrekt: string; bei_falsch: string }
  onAntwort: (antworten: string[], korrekt: boolean) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function MultipleChoice({ text, optionen, mehrfach, hilfen, feedback, onAntwort }: Props) {
  const theme = useGameTheme()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [showHilfe, setShowHilfe] = useState(false)
  const [hilfeIndex, setHilfeIndex] = useState(0)

  function toggle(i: number) {
    if (submitted) return
    const next = new Set(selected)
    if (mehrfach) {
      next.has(i) ? next.delete(i) : next.add(i)
    } else {
      next.clear()
      next.add(i)
    }
    setSelected(next)
  }

  function submit() {
    if (selected.size === 0 || submitted) return
    const antworten = Array.from(selected).map((i) => optionen[i].text)
    const korrekt = optionen.every((o, i) => o.isCorrect === selected.has(i))
    setSubmitted(true)
    if (korrekt) {
      burstKorrekt({ farbe: theme.success, intensitaet: mehrfach ? 'normal' : 'klein' })
    }
    onAntwort(antworten, korrekt)
  }

  const korrektNachSubmit = submitted && optionen.every((o, i) => o.isCorrect === selected.has(i))
  const status: 'idle' | 'korrekt' | 'falsch' = !submitted ? 'idle' : korrektNachSubmit ? 'korrekt' : 'falsch'

  return (
    <div className="flex flex-col gap-5">
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-lg font-bold leading-snug"
        style={{ color: theme.text }}
      >
        {text}
      </motion.p>

      {mehrfach && (
        <p className="text-xs -mt-3 font-medium" style={{ color: theme.textMuted }}>
          Mehrere Antworten möglich
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {optionen.map((opt, i) => {
          const isSelected = selected.has(i)
          const showResult = submitted
          const isRight = opt.isCorrect

          let bg = theme.surface
          let border = theme.border
          let color = theme.text
          let glow = 'none'

          if (!submitted) {
            if (isSelected) {
              bg = theme.accentSoft
              border = theme.accent
              glow = theme.glowAccent
            }
          } else {
            if (isSelected && isRight) {
              bg = theme.successSoft
              border = theme.success
              color = theme.success
            } else if (isSelected && !isRight) {
              bg = theme.errorSoft
              border = theme.error
              color = theme.error
            } else if (!isSelected && isRight) {
              bg = theme.successSoft
              border = theme.success
              color = theme.success
            } else {
              bg = theme.surfaceAlt
              border = theme.border
              color = theme.textMuted
            }
          }

          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={submitted}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.25 }}
              whileHover={!submitted ? { scale: 1.02, x: 4 } : undefined}
              whileTap={!submitted ? { scale: 0.98 } : undefined}
              className="group text-left rounded-2xl border-2 transition-colors duration-150 overflow-hidden disabled:cursor-default"
              style={{
                background: bg,
                borderColor: border,
                color,
                boxShadow: glow,
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className="flex items-center justify-center font-extrabold text-sm flex-shrink-0 rounded-xl"
                  style={{
                    width: 36,
                    height: 36,
                    background:
                      submitted && isRight
                        ? theme.success
                        : submitted && isSelected && !isRight
                        ? theme.error
                        : isSelected
                        ? theme.accent
                        : 'transparent',
                    color:
                      (submitted && isRight) || (submitted && isSelected && !isRight) || isSelected
                        ? '#fff'
                        : theme.textMuted,
                    border: `2px solid ${
                      submitted && isRight
                        ? theme.success
                        : submitted && isSelected && !isRight
                        ? theme.error
                        : isSelected
                        ? theme.accent
                        : theme.border
                    }`,
                  }}
                >
                  {submitted && isRight ? '✓' : submitted && isSelected && !isRight ? '✗' : LETTERS[i] ?? '?'}
                </span>
                <span className="text-sm font-semibold leading-snug flex-1">{opt.text}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      <ResultBanner
        status={status}
        detail={korrektNachSubmit ? '+10 XP' : undefined}
        erklaerung={
          !korrektNachSubmit && submitted
            ? feedback.bei_falsch || 'Die richtige Antwort ist farblich markiert.'
            : undefined
        }
      />

      {/* Hilfe */}
      <AnimatePresence>
        {!submitted && hilfen.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!showHilfe ? (
              <button
                type="button"
                onClick={() => setShowHilfe(true)}
                className="text-xs font-semibold underline underline-offset-4 hover:opacity-100 opacity-70"
                style={{ color: theme.textMuted }}
              >
                💡 Hilfe anzeigen
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-2xl px-4 py-3 border"
                style={{
                  background: theme.accentSoft,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: theme.accent }}>
                  Hilfe {hilfeIndex + 1}/{hilfen.length}
                </p>
                <p className="text-sm leading-relaxed">{hilfen[hilfeIndex]}</p>
                {hilfeIndex < hilfen.length - 1 && (
                  <button
                    onClick={() => setHilfeIndex((h) => h + 1)}
                    className="text-xs font-semibold mt-2 underline underline-offset-4"
                    style={{ color: theme.accent }}
                  >
                    Weitere Hilfe →
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!submitted && (
        <motion.button
          type="button"
          onClick={submit}
          disabled={selected.size === 0}
          whileHover={selected.size > 0 ? { scale: 1.02 } : undefined}
          whileTap={selected.size > 0 ? { scale: 0.97 } : undefined}
          className="self-stretch rounded-2xl py-4 font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: theme.accentGradient,
            boxShadow: selected.size > 0 ? theme.glowAccent : 'none',
          }}
        >
          Antwort abgeben →
        </motion.button>
      )}
    </div>
  )
}

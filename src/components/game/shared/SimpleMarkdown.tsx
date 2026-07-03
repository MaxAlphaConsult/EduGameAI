'use client'

import { Fragment, type ReactNode } from 'react'

// Leichter, sicherer Markdown-Renderer für KI-generierte Erklärinhalte.
// Bewusst KEIN dangerouslySetInnerHTML — wir parsen nur eine kleine,
// kontrollierte Teilmenge (Überschriften, Listen, Absätze, **fett**, Tabellen).

function renderInline(text: string, keyBase: string): ReactNode[] {
  // Fett: **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={`${keyBase}-b${i}`}>{p.slice(2, -2)}</strong>
    }
    return <Fragment key={`${keyBase}-t${i}`}>{p}</Fragment>
  })
}

// Zerlegt eine Tabellenzeile „| a | b |" in die Zellen ["a", "b"].
function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((c) => c.trim())
}

const isTableRow = (line: string) => /\|/.test(line) && line.trim().startsWith('|')
const isTableSeparator = (line: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-')

export function SimpleMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let listBuffer: string[] = []
  let paraBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    const items = [...listBuffer]
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 flex flex-col gap-1 text-[15px] leading-relaxed text-foreground/90">
        {items.map((it, i) => <li key={i}>{renderInline(it, `li-${blocks.length}-${i}`)}</li>)}
      </ul>
    )
    listBuffer = []
  }
  const flushPara = () => {
    if (paraBuffer.length === 0) return
    const text = paraBuffer.join(' ')
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[15px] leading-relaxed text-foreground/90">
        {renderInline(text, `p-${blocks.length}`)}
      </p>
    )
    paraBuffer = []
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx]
    const line = raw.trimEnd()
    if (line.trim() === '') { flushList(); flushPara(); continue }

    // Tabelle: Kopfzeile + Trenner (|---|---|) + Datenzeilen
    if (isTableRow(line) && idx + 1 < lines.length && isTableSeparator(lines[idx + 1])) {
      flushList(); flushPara()
      const header = splitRow(line)
      const rows: string[][] = []
      let j = idx + 2
      while (j < lines.length && isTableRow(lines[j].trimEnd())) {
        rows.push(splitRow(lines[j].trimEnd()))
        j++
      }
      const tKey = `tbl-${blocks.length}`
      blocks.push(
        <div key={tKey} className="overflow-x-auto">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr>
                {header.map((h, c) => (
                  <th key={c} className="text-left font-bold border border-violet-200 bg-violet-50 px-3 py-2">
                    {renderInline(h, `${tKey}-h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, r) => (
                <tr key={r}>
                  {cells.map((cell, c) => (
                    <td key={c} className="align-top border border-violet-200 px-3 py-2 text-foreground/90">
                      {renderInline(cell, `${tKey}-r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      idx = j - 1
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushList(); flushPara()
      const level = heading[1].length
      const content = renderInline(heading[2], `h-${blocks.length}`)
      const cls = level === 1
        ? 'text-xl font-black mt-1'
        : level === 2
          ? 'text-lg font-bold mt-1'
          : 'text-base font-semibold'
      blocks.push(<p key={`h-${blocks.length}`} className={cls}>{content}</p>)
      continue
    }

    const listItem = line.match(/^\s*[-*]\s+(.*)$/)
    if (listItem) { flushPara(); listBuffer.push(listItem[1]); continue }

    paraBuffer.push(line.trim())
  }
  flushList(); flushPara()

  return <div className="flex flex-col gap-3">{blocks}</div>
}

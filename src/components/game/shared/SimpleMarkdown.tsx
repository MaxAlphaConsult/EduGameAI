'use client'

import { Fragment, type ReactNode } from 'react'

// Leichter, sicherer Markdown-Renderer für KI-generierte Erklärinhalte.
// Bewusst KEIN dangerouslySetInnerHTML — wir parsen nur eine kleine,
// kontrollierte Teilmenge (Überschriften, Listen, Absätze, **fett**).

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

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.trim() === '') { flushList(); flushPara(); continue }

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

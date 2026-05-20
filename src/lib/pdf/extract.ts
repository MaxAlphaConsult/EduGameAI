import { extractText as extractPdfText } from 'unpdf'
import mammoth from 'mammoth'
import { MaterialAbschnitt } from '@/types'

export type UnterstuetzesFormat = 'pdf' | 'docx' | 'txt'

export class UnsupportedFormatError extends Error {
  constructor(public dateiname: string) {
    super(`Format nicht unterstützt: ${dateiname}`)
    this.name = 'UnsupportedFormatError'
  }
}

export class LeererInhaltError extends Error {
  constructor() {
    super('Aus der Datei konnte kein lesbarer Text extrahiert werden')
    this.name = 'LeererInhaltError'
  }
}

export function formatAusDateiname(dateiname: string): UnterstuetzesFormat | null {
  const lower = dateiname.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.txt')) return 'txt'
  return null
}

interface ExtraktionsErgebnis {
  fullText: string
  abschnitte: MaterialAbschnitt[]
}

function abschnittsLogik(fullText: string): MaterialAbschnitt[] {
  return fullText
    .split(/\n{2,}/)
    .map((t) => t.replace(/\n/g, ' ').trim())
    .filter((t) => t.length > 100)
    .map((text, i) => ({ id: `A${i + 1}`, text }))
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { text: pages } = await extractPdfText(new Uint8Array(buffer))
  return pages.join('\n\n')
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

function extractTxt(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

export async function extractTextFromFile(
  buffer: Buffer,
  dateiname: string
): Promise<ExtraktionsErgebnis> {
  const format = formatAusDateiname(dateiname)
  if (!format) throw new UnsupportedFormatError(dateiname)

  let fullText = ''
  if (format === 'pdf') fullText = await extractPdf(buffer)
  else if (format === 'docx') fullText = await extractDocx(buffer)
  else fullText = extractTxt(buffer)

  const trimmed = fullText.trim()
  if (trimmed.length < 50) throw new LeererInhaltError()

  return { fullText, abschnitte: abschnittsLogik(fullText) }
}

// Backwards compatibility — falls noch von irgendwo aufgerufen
export async function extractTextFromPDF(buffer: Buffer): Promise<ExtraktionsErgebnis> {
  return extractTextFromFile(buffer, 'datei.pdf')
}

import { NextRequest, NextResponse } from 'next/server'
import {
  extractTextFromFile,
  formatAusDateiname,
  LeererInhaltError,
  UnsupportedFormatError,
} from '@/lib/pdf/extract'
import { createClient } from '@/lib/supabase/server'

const MAX_DATEIGROESSE_BYTES = 20 * 1024 * 1024 // 20 MB
const MIN_DATEIGROESSE_BYTES = 16

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fach = formData.get('fach') as string
    const jahrgangsstufe = formData.get('jahrgangsstufe') as string
    const schulform = formData.get('schulform') as string
    const bundesland = formData.get('bundesland') as string

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei ausgewählt' }, { status: 400 })
    }

    if (file.size < MIN_DATEIGROESSE_BYTES) {
      return NextResponse.json({ error: 'Die Datei ist leer oder zu klein' }, { status: 400 })
    }

    if (file.size > MAX_DATEIGROESSE_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1)
      return NextResponse.json(
        { error: `Datei zu groß (${mb} MB). Maximal 20 MB erlaubt.` },
        { status: 413 }
      )
    }

    if (!formatAusDateiname(file.name)) {
      return NextResponse.json(
        { error: 'Format nicht unterstützt. Erlaubt: PDF, DOCX, TXT.' },
        { status: 415 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let fullText: string
    let abschnitte
    try {
      const ergebnis = await extractTextFromFile(buffer, file.name)
      fullText = ergebnis.fullText
      abschnitte = ergebnis.abschnitte
    } catch (err) {
      if (err instanceof LeererInhaltError) {
        return NextResponse.json(
          { error: 'Aus der Datei konnte kein Text gelesen werden. Ist es eine gescannte PDF ohne Text-Layer?' },
          { status: 422 }
        )
      }
      if (err instanceof UnsupportedFormatError) {
        return NextResponse.json(
          { error: 'Format nicht unterstützt. Erlaubt: PDF, DOCX, TXT.' },
          { status: 415 }
        )
      }
      throw err
    }

    const { data: material, error } = await supabase
      .from('materials')
      .insert({
        lehrer_id: user.id,
        dateiname: file.name,
        extrahierter_text: fullText,
        abschnitte,
        fach,
        jahrgangsstufe,
        schulform,
        bundesland,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ material })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload error]', msg)
    return NextResponse.json({ error: `Upload fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}

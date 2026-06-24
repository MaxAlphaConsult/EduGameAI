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
const BUCKET = 'materials'

// Der Browser lädt die Datei direkt in den Storage-Bucket (am Vercel-Body-Limit von
// ~4,5 MB vorbei) und schickt hier nur noch den Pfad als JSON. Wir laden die Datei
// serverseitig, extrahieren den Text und löschen die Datei danach wieder.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const { path, dateiname, fach, jahrgangsstufe, schulform } = await request.json()

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Kein Upload-Pfad übergeben' }, { status: 400 })
    }
    // Defense-in-Depth: Pfad muss im eigenen Ordner liegen (RLS erzwingt das zusätzlich).
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Ungültiger Upload-Pfad' }, { status: 403 })
    }
    if (!dateiname || typeof dateiname !== 'string' || !formatAusDateiname(dateiname)) {
      return NextResponse.json(
        { error: 'Format nicht unterstützt. Erlaubt: PDF, DOCX, TXT.' },
        { status: 415 }
      )
    }

    // Datei aus dem Storage laden (Server↔Supabase, kein Vercel-Body-Limit).
    const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(path)
    if (downloadError || !blob) {
      return NextResponse.json({ error: 'Hochgeladene Datei nicht gefunden' }, { status: 404 })
    }
    const buffer = Buffer.from(await blob.arrayBuffer())

    // Datei wird nur zur Extraktion gebraucht — danach (auch bei Fehlern) wieder entfernen.
    const cleanup = () => supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {})

    if (buffer.length < MIN_DATEIGROESSE_BYTES) {
      await cleanup()
      return NextResponse.json({ error: 'Die Datei ist leer oder zu klein' }, { status: 400 })
    }
    if (buffer.length > MAX_DATEIGROESSE_BYTES) {
      await cleanup()
      const mb = (buffer.length / 1024 / 1024).toFixed(1)
      return NextResponse.json(
        { error: `Datei zu groß (${mb} MB). Maximal 20 MB erlaubt.` },
        { status: 413 }
      )
    }

    let fullText: string
    let abschnitte
    try {
      const ergebnis = await extractTextFromFile(buffer, dateiname)
      fullText = ergebnis.fullText
      abschnitte = ergebnis.abschnitte
    } catch (err) {
      await cleanup()
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
        dateiname,
        extrahierter_text: fullText,
        abschnitte,
        fach,
        jahrgangsstufe,
        schulform,
      })
      .select()
      .single()

    // Storage-Datei wird nicht mehr gebraucht — unabhängig vom DB-Ergebnis aufräumen.
    await cleanup()

    if (error) throw error

    return NextResponse.json({ material })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload error]', msg)
    return NextResponse.json({ error: `Upload fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}

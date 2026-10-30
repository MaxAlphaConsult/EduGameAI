import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeAccessCode, ACCESS_CODE_LENGTH } from '@/lib/flow/access-code'

// POST /api/student/lookup  body { flowCode }
// Stufe 1 des Schüler-Logins: validiert den Flow-Code und gibt Flow-Titel +
// Klasseninfo zurück. Erstellt noch KEINE Session.
// Rate-Limiting läuft zentral im Proxy (siehe src/proxy.ts).
export async function POST(request: NextRequest) {
  try {
    const { flowCode } = await request.json()
    if (!flowCode || typeof flowCode !== 'string') {
      return NextResponse.json({ error: 'Kein Flow-Code angegeben' }, { status: 400 })
    }

    const supabase = await createClient()
    // Code ist ein reiner 8-stelliger Zahlencode — Eingabe normalisieren
    // (Leerzeichen/Bindestriche entfernen). Falsche Länge gar nicht erst abfragen.
    const code = normalizeAccessCode(flowCode)
    if (code.length !== ACCESS_CODE_LENGTH) {
      return NextResponse.json({ error: 'Flow-Code nicht gefunden oder nicht mehr aktiv.' }, { status: 404 })
    }

    // Über die Funktion aus Migration 022: flow_releases ist für anon nicht
    // lesbar, die Funktion liefert nur den einen Treffer zum Code.
    const { data: rows, error } = await supabase.rpc('schueler_flow_suchen', { p_access_code: code })
    if (error) {
      console.error('[student/lookup] schueler_flow_suchen', error)
      return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
    }
    const treffer = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as {
          flow_release_id: string
          flow_id: string
          flow_titel: string
          klasse_id: string
          klasse_name: string
          jahrgangsstufe: string | null
          fach: string | null
          modul_anzahl: number
          spiel_anzahl: number
        })
      : null

    if (!treffer) {
      return NextResponse.json({ error: 'Flow-Code nicht gefunden oder nicht mehr aktiv.' }, { status: 404 })
    }

    return NextResponse.json({
      flowReleaseId: treffer.flow_release_id,
      flow: { id: treffer.flow_id, titel: treffer.flow_titel },
      klasse: {
        id: treffer.klasse_id,
        name: treffer.klasse_name,
        jahrgangsstufe: treffer.jahrgangsstufe,
        fach: treffer.fach,
      },
      modul_anzahl: treffer.modul_anzahl ?? 0,
      spiel_anzahl: treffer.spiel_anzahl ?? 0,
    })
  } catch (err) {
    console.error('[student/lookup]', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

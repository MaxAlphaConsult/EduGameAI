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

    const { data: release } = await supabase
      .from('flow_releases')
      .select(`
        id, status, access_code,
        game_flows(id, titel),
        classes(id, name, jahrgangsstufe, fach)
      `)
      .eq('access_code', code)
      .eq('status', 'aktiv')
      .maybeSingle()

    if (!release) {
      return NextResponse.json({ error: 'Flow-Code nicht gefunden oder nicht mehr aktiv.' }, { status: 404 })
    }

    const flow = Array.isArray(release.game_flows) ? release.game_flows[0] : release.game_flows
    const klasse = Array.isArray(release.classes) ? release.classes[0] : release.classes

    if (!flow || !klasse) {
      return NextResponse.json({ error: 'Flow-Daten unvollständig' }, { status: 500 })
    }

    // Anzahl Schritte (alle Bausteine) + davon Spiele — getrennt, damit die UI
    // nicht mehr alle Bausteine als „Spiele" labelt (A3).
    const [{ count: schritte }, { count: spiele }] = await Promise.all([
      supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .eq('game_flow_id', flow.id)
        .eq('status', 'freigegeben'),
      supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .eq('game_flow_id', flow.id)
        .eq('status', 'freigegeben')
        .eq('baustein_typ', 'spiel'),
    ])

    return NextResponse.json({
      flowReleaseId: release.id,
      flow: { id: flow.id, titel: flow.titel },
      klasse,
      modul_anzahl: schritte ?? 0,
      spiel_anzahl: spiele ?? 0,
    })
  } catch (err) {
    console.error('[student/lookup]', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

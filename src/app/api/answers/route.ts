import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { istUuid } from '@/lib/flow/ids'
import { modulSitzungLesen } from '@/lib/flow/schueler-db'

// POST /api/answers  body { moduleSessionId, aufgabeId, antwortWert, ... }
// Schülerantwort speichern + regelbasiert auswerten.
// Antworten hängen seit Migration 010 an module_session_id (statt session_id).
// Lesen und Speichern laufen über die Funktionen aus Migration 022; anon darf
// module_sessions und answers nicht direkt anfassen (023).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      moduleSessionId,
      aufgabeId,
      antwortWert,
      versuche = 1,
      helfenGenutzt = 0,
      bearbeitungszeitSekunden = null,
      abgebrochen = false,
    } = body

    if (!moduleSessionId || !aufgabeId || antwortWert === undefined) {
      return NextResponse.json({ error: 'moduleSessionId, aufgabeId und antwortWert erforderlich' }, { status: 400 })
    }

    if (!istUuid(moduleSessionId)) {
      return NextResponse.json({ error: 'Modul-Session nicht gefunden' }, { status: 404 })
    }

    // Modul-Session + Spiel laden um Lösungen zu prüfen
    const { zeile: ms, fehler } = await modulSitzungLesen(supabase, moduleSessionId)
    if (fehler) throw fehler
    if (!ms) return NextResponse.json({ error: 'Modul-Session nicht gefunden' }, { status: 404 })

    const { data: spiel } = await supabase
      .from('games')
      .select('aufgaben, status')
      .eq('id', ms.game_id)
      .maybeSingle()
    if (!spiel || spiel.status !== 'freigegeben') {
      return NextResponse.json({ error: 'Spiel nicht verfügbar' }, { status: 403 })
    }

    // Aufgabe aus dem Spiel suchen
    const aufgaben = (spiel.aufgaben ?? []) as Array<{
      aufgabe_id: string
      antwortformat?: string
      loesungen: string[]
      teilloesungen?: string[]
      feedbackbausteine?: { bei_korrekt: string; bei_falsch: string }
    }>
    const aufgabe = aufgaben.find((a) => a.aufgabe_id === aufgabeId)

    // Regelbasierte Auswertung
    let status: 'korrekt' | 'teilweise_korrekt' | 'falsch' = 'falsch'
    let ausgeloestes_feedback = ''

    if (aufgabe) {
      const norm = (s: string) => s.toLowerCase().trim()
      const antworten = Array.isArray(antwortWert) ? antwortWert.map(String) : [String(antwortWert)]
      const loesungen = aufgabe.loesungen.map(norm)
      const teilloesungen = (aufgabe.teilloesungen ?? []).map(norm)
      const format = aufgabe.antwortformat ?? ''

      // Positions-abhängige Formate: Antwort[i] muss === Lösung[i]
      const positionsAbhaengig = format === 'lueckentext' || format === 'reihenfolge'

      const antwortenNorm = antworten.map(norm)

      let alleKorrekt: boolean
      let teilrichtig: number
      if (positionsAbhaengig) {
        const minLen = Math.min(antwortenNorm.length, loesungen.length)
        const richtigeAnzahl = Array.from({ length: minLen }).filter((_, i) => antwortenNorm[i] === loesungen[i]).length
        alleKorrekt = antwortenNorm.length === loesungen.length && richtigeAnzahl === loesungen.length
        teilrichtig = richtigeAnzahl
      } else {
        alleKorrekt = antwortenNorm.every(a => loesungen.includes(a)) && antwortenNorm.length >= loesungen.length
        teilrichtig = antwortenNorm.filter(a => loesungen.includes(a)).length
      }

      const irgendeineTeil = antwortenNorm.some(a => teilloesungen.includes(a))

      if (alleKorrekt) {
        status = 'korrekt'
        ausgeloestes_feedback = aufgabe.feedbackbausteine?.bei_korrekt ?? ''
      } else if (irgendeineTeil || (positionsAbhaengig && teilrichtig > 0 && teilrichtig < loesungen.length)) {
        status = 'teilweise_korrekt'
        ausgeloestes_feedback = aufgabe.feedbackbausteine?.bei_falsch ?? ''
      } else {
        status = 'falsch'
        ausgeloestes_feedback = aufgabe.feedbackbausteine?.bei_falsch ?? ''
      }
    }

    const { data: antwortId, error } = await supabase.rpc('schueler_antwort_speichern', {
      p_modul_sitzung_id: moduleSessionId,
      p_aufgabe_id: String(aufgabeId),
      p_antwort_wert: JSON.stringify(antwortWert),
      p_status: status,
      p_versuche: versuche,
      p_hilfen_genutzt: helfenGenutzt,
      p_bearbeitungszeit_sekunden: bearbeitungszeitSekunden,
      p_ausgeloestes_feedback: ausgeloestes_feedback,
      p_abgebrochen: abgebrochen,
    })

    if (error) throw error

    // Bis Migration 022 kam hier die ganze Zeile zurück; die Clients lesen nur
    // status und feedback.
    return NextResponse.json({ antwort: { id: antwortId }, status, feedback: ausgeloestes_feedback })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Antwort konnte nicht gespeichert werden' }, { status: 500 })
  }
}

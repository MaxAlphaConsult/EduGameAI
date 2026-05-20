import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Schülerantwort speichern + regelbasiert auswerten
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      sessionId,
      aufgabeId,
      antwortWert,
      versuche = 1,
      helfenGenutzt = 0,
      bearbeitungszeitSekunden = null,
      abgebrochen = false,
    } = body

    if (!sessionId || !aufgabeId || antwortWert === undefined) {
      return NextResponse.json({ error: 'sessionId, aufgabeId und antwortWert erforderlich' }, { status: 400 })
    }

    // Session + Spiel laden um Lösungen zu prüfen
    const { data: session } = await supabase
      .from('student_sessions')
      .select('id, spiel_id, differenzierungsniveau')
      .eq('id', sessionId)
      .single()

    if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })

    const { data: spiel } = await supabase
      .from('games')
      .select('aufgaben, status')
      .eq('id', session.spiel_id)
      .single()

    if (!spiel || spiel.status !== 'freigegeben') {
      return NextResponse.json({ error: 'Spiel nicht verfügbar' }, { status: 403 })
    }

    // Aufgabe aus dem Spiel suchen
    const aufgaben = (spiel?.aufgaben ?? []) as Array<{
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

    const { data: antwort, error } = await supabase
      .from('answers')
      .insert({
        session_id: sessionId,
        aufgabe_id: aufgabeId,
        antwort_wert: JSON.stringify(antwortWert),
        status,
        versuche,
        hilfen_genutzt: helfenGenutzt,
        bearbeitungszeit_sekunden: bearbeitungszeitSekunden,
        ausgeloestes_feedback,
        abgebrochen,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ antwort, status, feedback: ausgeloestes_feedback })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Antwort konnte nicht gespeichert werden' }, { status: 500 })
  }
}

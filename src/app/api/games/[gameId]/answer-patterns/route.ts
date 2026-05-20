import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AufgabeRow {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren?: string[]
}

interface AnswerRow {
  session_id: string
  aufgabe_id: string
  antwort_wert: string | null
  status: 'korrekt' | 'teilweise_korrekt' | 'falsch' | 'nicht_bearbeitet'
  versuche: number | null
  hilfen_genutzt: number | null
  bearbeitungszeit_sekunden: number | null
}

interface SessionRow {
  id: string
  differenzierungsniveau: string | null
  lernpfad_abgeschlossen: boolean | null
}

type Klassifikation = 'loesung' | 'distraktor' | 'sonstige'

interface AntwortVerteilungEintrag {
  wert: string
  anzahl: number
  klassifikation: Klassifikation
  anteil: number
}

interface AufgabenPattern {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren: string[]
  teilnehmer: number
  korrekt: number
  teilweise_korrekt: number
  falsch: number
  korrekt_quote: number
  durchschnittliche_versuche: number
  hilfen_quote: number
  durchschnittliche_zeit_sek: number | null
  antwort_verteilung: AntwortVerteilungEintrag[]
}

interface DifferenzierungsEintrag {
  niveau: string
  anzahl_sessions: number
  abgeschlossen: number
  anteil: number
}

interface PatternsResponse {
  spiel_id: string
  anzahl_sessions: number
  anzahl_sessions_abgeschlossen: number
  gesamt_korrekt_quote: number
  aufgaben_patterns: AufgabenPattern[]
  differenzierung_verteilung: DifferenzierungsEintrag[]
}

function normalisiere(wert: string): string {
  return wert.toLowerCase().trim()
}

function parseAntwort(rohwert: string | null): string[] {
  if (rohwert == null) return []
  try {
    const parsed = JSON.parse(rohwert)
    if (Array.isArray(parsed)) return parsed.map(String)
    return [String(parsed)]
  } catch {
    return [String(rohwert)]
  }
}

function klassifiziere(
  wert: string,
  loesungenNorm: Set<string>,
  distraktorenNorm: Set<string>,
): Klassifikation {
  const n = normalisiere(wert)
  if (loesungenNorm.has(n)) return 'loesung'
  if (distraktorenNorm.has(n)) return 'distraktor'
  return 'sonstige'
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data: spiel, error: spielError } = await supabase
    .from('games')
    .select('id, aufgaben')
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .single()

  if (spielError || !spiel) {
    return NextResponse.json({ error: 'Spiel nicht gefunden' }, { status: 404 })
  }

  const aufgaben = (spiel.aufgaben ?? []) as AufgabeRow[]

  const { data: sessions } = await supabase
    .from('student_sessions')
    .select('id, differenzierungsniveau, lernpfad_abgeschlossen')
    .eq('spiel_id', gameId)

  const sessionRows = (sessions ?? []) as SessionRow[]
  const sessionIds = sessionRows.map(s => s.id)

  const { data: answers } = sessionIds.length
    ? await supabase
        .from('answers')
        .select('session_id, aufgabe_id, antwort_wert, status, versuche, hilfen_genutzt, bearbeitungszeit_sekunden')
        .in('session_id', sessionIds)
    : { data: [] }

  const answerRows = (answers ?? []) as AnswerRow[]

  // ── Pro Aufgabe aggregieren ──────────────────────────────────
  const aufgabenPatterns: AufgabenPattern[] = aufgaben.map(aufgabe => {
    const loesungenNorm = new Set(aufgabe.loesungen.map(normalisiere))
    const distraktorenNorm = new Set((aufgabe.distraktoren ?? []).map(normalisiere))

    const fuerAufgabe = answerRows.filter(a => a.aufgabe_id === aufgabe.aufgabe_id)
    const teilnehmer = fuerAufgabe.length

    const korrekt = fuerAufgabe.filter(a => a.status === 'korrekt').length
    const teilweise_korrekt = fuerAufgabe.filter(a => a.status === 'teilweise_korrekt').length
    const falsch = fuerAufgabe.filter(a => a.status === 'falsch').length

    const versucheSumme = fuerAufgabe.reduce((s, a) => s + (a.versuche ?? 1), 0)
    const hilfenAnzahl = fuerAufgabe.filter(a => (a.hilfen_genutzt ?? 0) > 0).length
    const zeitWerte = fuerAufgabe
      .map(a => a.bearbeitungszeit_sekunden)
      .filter((x): x is number => typeof x === 'number')
    const zeitSumme = zeitWerte.reduce((s, x) => s + x, 0)

    // Antworten zählen — pro normalisiertem Wert
    const zaehler = new Map<string, { wert: string; anzahl: number; klassifikation: Klassifikation }>()
    for (const a of fuerAufgabe) {
      const werte = parseAntwort(a.antwort_wert)
      for (const w of werte) {
        const key = normalisiere(w)
        const bestehend = zaehler.get(key)
        if (bestehend) {
          bestehend.anzahl += 1
        } else {
          zaehler.set(key, {
            wert: w,
            anzahl: 1,
            klassifikation: klassifiziere(w, loesungenNorm, distraktorenNorm),
          })
        }
      }
    }

    const gesamtAntworten = Array.from(zaehler.values()).reduce((s, e) => s + e.anzahl, 0)

    const antwort_verteilung: AntwortVerteilungEintrag[] = Array.from(zaehler.values())
      .map(e => ({
        wert: e.wert,
        anzahl: e.anzahl,
        klassifikation: e.klassifikation,
        anteil: gesamtAntworten > 0 ? e.anzahl / gesamtAntworten : 0,
      }))
      .sort((a, b) => b.anzahl - a.anzahl)

    return {
      aufgabe_id: aufgabe.aufgabe_id,
      text: aufgabe.text,
      antwortformat: aufgabe.antwortformat,
      loesungen: aufgabe.loesungen,
      distraktoren: aufgabe.distraktoren ?? [],
      teilnehmer,
      korrekt,
      teilweise_korrekt,
      falsch,
      korrekt_quote: teilnehmer > 0 ? korrekt / teilnehmer : 0,
      durchschnittliche_versuche: teilnehmer > 0 ? versucheSumme / teilnehmer : 0,
      hilfen_quote: teilnehmer > 0 ? hilfenAnzahl / teilnehmer : 0,
      durchschnittliche_zeit_sek: zeitWerte.length > 0 ? zeitSumme / zeitWerte.length : null,
      antwort_verteilung,
    }
  })

  // ── Differenzierungs-Verteilung ──────────────────────────────
  const differenzierungZaehler = new Map<string, { anzahl: number; abgeschlossen: number }>()
  for (const s of sessionRows) {
    const niveau = s.differenzierungsniveau ?? 'unbekannt'
    const eintrag = differenzierungZaehler.get(niveau) ?? { anzahl: 0, abgeschlossen: 0 }
    eintrag.anzahl += 1
    if (s.lernpfad_abgeschlossen) eintrag.abgeschlossen += 1
    differenzierungZaehler.set(niveau, eintrag)
  }

  const differenzierung_verteilung: DifferenzierungsEintrag[] = Array.from(differenzierungZaehler.entries())
    .map(([niveau, v]) => ({
      niveau,
      anzahl_sessions: v.anzahl,
      abgeschlossen: v.abgeschlossen,
      anteil: sessionRows.length > 0 ? v.anzahl / sessionRows.length : 0,
    }))
    .sort((a, b) => b.anzahl_sessions - a.anzahl_sessions)

  const gesamtTeilnehmer = aufgabenPatterns.reduce((s, p) => s + p.teilnehmer, 0)
  const gesamtKorrekt = aufgabenPatterns.reduce((s, p) => s + p.korrekt, 0)

  const response: PatternsResponse = {
    spiel_id: gameId,
    anzahl_sessions: sessionRows.length,
    anzahl_sessions_abgeschlossen: sessionRows.filter(s => s.lernpfad_abgeschlossen).length,
    gesamt_korrekt_quote: gesamtTeilnehmer > 0 ? gesamtKorrekt / gesamtTeilnehmer : 0,
    aufgaben_patterns: aufgabenPatterns,
    differenzierung_verteilung,
  }

  return NextResponse.json(response)
}

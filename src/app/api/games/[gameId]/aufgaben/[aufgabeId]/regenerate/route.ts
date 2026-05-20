import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateAufgabe } from '@/lib/claude/pipeline'
import { EinzelAufgabeSchema, type EinzelAufgabe } from '@/lib/schemas/pipeline'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string; aufgabeId: string }> }
) {
  const { gameId, aufgabeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data: spiel, error: spielError } = await supabase
    .from('games')
    .select('*, analyses(*, materials(fach, jahrgangsstufe))')
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .single()

  if (spielError || !spiel) {
    return NextResponse.json({ error: 'Spiel nicht gefunden' }, { status: 404 })
  }

  const aufgabenArr = (spiel.aufgaben ?? []) as unknown[]
  const altAufgabeRaw = aufgabenArr.find(
    (a) => typeof a === 'object' && a !== null && (a as { aufgabe_id?: string }).aufgabe_id === aufgabeId
  )

  if (!altAufgabeRaw) {
    return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })
  }

  const parsed = EinzelAufgabeSchema.safeParse(altAufgabeRaw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Alte Aufgabe ist nicht im erwarteten Format' },
      { status: 422 }
    )
  }

  const analyse = spiel.analyses
  const material = analyse?.materials

  try {
    const neueAufgabe = await regenerateAufgabe({
      altAufgabe: parsed.data,
      kontext: {
        lernziel: analyse?.lernziel_original ?? '',
        fach: material?.fach ?? '',
        jahrgangsstufe: material?.jahrgangsstufe ?? '',
        zusammenfassung: analyse?.zusammenfassung ?? '',
        kernaussagen: (analyse?.kernaussagen ?? []) as string[],
      },
    })

    // aufgabe_id muss gleich bleiben (Prompt-Anforderung), aber zur Sicherheit erzwingen
    const aktualisierteAufgabe: EinzelAufgabe = { ...neueAufgabe, aufgabe_id: aufgabeId }

    const neueAufgaben = aufgabenArr.map((a) => {
      if (typeof a === 'object' && a !== null && (a as { aufgabe_id?: string }).aufgabe_id === aufgabeId) {
        return aktualisierteAufgabe
      }
      return a
    })

    const { error: updateError } = await supabase
      .from('games')
      .update({ aufgaben: neueAufgaben })
      .eq('id', gameId)
      .eq('lehrer_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ aufgabe: aktualisierteAufgabe })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'KI-Fehler'
    console.error('[regenerate-aufgabe]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

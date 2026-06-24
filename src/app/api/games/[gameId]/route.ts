import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BausteinInhaltPatchSchema, AufgabenPatchSchema } from '@/lib/schemas/pipeline'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data, error } = await supabase
    .from('games')
    .select('aufgaben')
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Spiel nicht gefunden' }, { status: 404 })
  return NextResponse.json({ aufgaben: data.aufgaben ?? [] })
}

// PATCH /api/games/:gameId
// Erlaubt das Aktualisieren von { aufgaben?, titel?, status? }. Jedes Feld ist
// optional; nicht-übergebene Felder bleiben unverändert.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (body.aufgaben !== undefined) {
    const parsed = AufgabenPatchSchema.safeParse(body.aufgaben)
    if (!parsed.success) {
      return NextResponse.json({ error: 'aufgaben ungültig (Array mit aufgabe_id je Eintrag, max. 200)' }, { status: 400 })
    }
    updates.aufgaben = parsed.data
  }

  if (body.titel !== undefined) {
    if (typeof body.titel !== 'string' || body.titel.trim().length === 0) {
      return NextResponse.json({ error: 'titel muss ein nicht-leerer String sein' }, { status: 400 })
    }
    updates.titel = body.titel.trim().slice(0, 200)
  }

  if (body.status !== undefined) {
    const erlaubt = ['entwurf', 'geprueft', 'freigegeben']
    if (!erlaubt.includes(body.status)) {
      return NextResponse.json({ error: `status muss einer von ${erlaubt.join(', ')} sein` }, { status: 400 })
    }
    updates.status = body.status
  }

  // LernFlow: Lehrkraft darf den Baustein-Typ ändern (z.B. Spiel → Erklär-Baustein).
  if (body.baustein_typ !== undefined) {
    const erlaubt = ['einstieg', 'vorwissen_check', 'input', 'erarbeitung', 'spiel', 'sicherung', 'transfer', 'post_check']
    if (!erlaubt.includes(body.baustein_typ)) {
      return NextResponse.json({ error: `baustein_typ muss einer von ${erlaubt.join(', ')} sein` }, { status: 400 })
    }
    updates.baustein_typ = body.baustein_typ
  }

  // LernFlow: Erklär-/Input-Inhalt bearbeiten. Unterstützt die Alt-Form (markdown)
  // UND die neue interleaved Form (segmente, Block D). `segmente` werden — falls
  // mitgeschickt — unverändert erhalten, damit das Bearbeiten der Kernaussagen die
  // Lern-Einheit nicht zerstört.
  if (body.baustein_inhalt !== undefined) {
    if (body.baustein_inhalt === null) {
      updates.baustein_inhalt = null
    } else {
      // Gegen die Generierungs-Schemas validieren (M1) — verhindert, dass per Hand
      // kaputte Segmente/Inhalte gespeichert werden, die beim Schüler rendern.
      const parsed = BausteinInhaltPatchSchema.safeParse(body.baustein_inhalt)
      if (!parsed.success) {
        return NextResponse.json({ error: 'baustein_inhalt ungültig (markdown oder segmente erforderlich)' }, { status: 400 })
      }
      const bi = parsed.data
      updates.baustein_inhalt = {
        ...(bi.segmente ? { segmente: bi.segmente } : {}),
        ...(bi.markdown !== undefined ? { markdown: bi.markdown } : {}),
        kernaussagen: bi.kernaussagen ?? [],
        didaktische_hinweise: bi.didaktische_hinweise ?? [],
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Kein Feld zum Aktualisieren übergeben' }, { status: 400 })
  }

  const { error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
    .eq('lehrer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/games/:gameId
// Löscht ein einzelnes Modul aus seinem LernFlow. lehrkraft_checks +
// module_sessions cascaden via FK. Aktualisiert anschließend
// game_flows.anzahl_spiele, damit die Übersicht stimmt.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  // Eigentum prüfen + Flow-ID merken für Counter-Update
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('id, game_flow_id')
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .maybeSingle()
  if (gameErr) return NextResponse.json({ error: gameErr.message }, { status: 500 })
  if (!game) return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })

  const { data: deleted, error: delErr } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
    .eq('lehrer_id', user.id)
    .select('id')
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: 'Löschen wurde blockiert (RLS).' }, { status: 500 })
  }

  // Flow-Counter aktualisieren (best effort — Fehler hier sind kosmetisch)
  if (game.game_flow_id) {
    const { count } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('game_flow_id', game.game_flow_id)
    await supabase
      .from('game_flows')
      .update({ anzahl_spiele: count ?? 0 })
      .eq('id', game.game_flow_id)
  }

  return NextResponse.json({ ok: true })
}

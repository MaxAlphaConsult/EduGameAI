import type { SupabaseClient } from '@supabase/supabase-js'

// Typisierte Aufrufe der Schüler-Funktionen aus Migration 022. Die Schüler-
// Routen laufen als `anon` und dürfen student_sessions, module_sessions und
// flow_releases nicht direkt lesen (Migration 023); jeder Zugriff geht über
// diese Funktionen, die nur die eine Zeile zur bekannten ID liefern.
//
// Rückgabe `{ fehler }` heißt: Die Datenbank hat geantwortet, aber mit einem
// Fehler. `{ zeile: null }` heißt: Es gibt die Zeile nicht. Beides ergibt in
// der Route einen anderen Statuscode (500 gegen 404).

export interface SchuelerSitzung {
  student_session_id: string
  flow_release_id: string
  release_status: string
  game_flow_id: string
  aktuelles_modul_index: number
  modul_anzahl: number
  lernpfad_abgeschlossen: boolean
  modul_sitzung_id: string | null
  modul_niveau: string | null
}

export interface SchuelerModulSitzung {
  modul_sitzung_id: string
  game_id: string
  position: number
  niveau: string
  status: string
}

type Ergebnis<T> = { zeile: T | null; fehler?: undefined } | { zeile?: undefined; fehler: unknown }

async function ersteZeile<T>(
  supabase: SupabaseClient,
  funktion: string,
  argumente: Record<string, unknown>,
): Promise<Ergebnis<T>> {
  const { data, error } = await supabase.rpc(funktion, argumente)
  if (error) return { fehler: error }
  return { zeile: Array.isArray(data) && data.length > 0 ? (data[0] as T) : null }
}

export function sitzungLesen(supabase: SupabaseClient, studentSessionId: string) {
  return ersteZeile<SchuelerSitzung>(supabase, 'schueler_sitzung_lesen', {
    p_student_session_id: studentSessionId,
  })
}

export function modulSitzungLesen(supabase: SupabaseClient, modulSitzungId: string) {
  return ersteZeile<SchuelerModulSitzung>(supabase, 'schueler_modul_lesen', {
    p_modul_sitzung_id: modulSitzungId,
  })
}

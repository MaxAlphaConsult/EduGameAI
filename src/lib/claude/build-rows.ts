// Gemeinsame Zeilen-Builder für games-Inserts/Updates.
//
// Liegen bewusst hier (nicht in einer Route), damit /api/analyze (Platzhalter)
// UND /api/games/[id]/generate (Befüllung) exakt dieselbe Aufgaben-Map,
// normalizeSkin-Logik und baustein_inhalt-Form nutzen — kein Drift.
import { normalizeSkin } from '@/lib/game/theme'
import type {
  SpielmappingOutput,
  SpielOutput,
  BausteinSequenzOutput,
  InputBausteinOutput,
} from '@/lib/schemas/pipeline'

export function buildSpielRow(
  analyseId: string,
  lehrerId: string,
  s: SpielOutput,
  sm: SpielmappingOutput,
  spielname?: string,
) {
  const selectedVorschlag = sm.vorschlaege.find((v) => v.rang === sm.ausgewaehlter_vorschlag_rang)
  const aufgaben = s.schritt_14_aufgaben.map((q) => ({
    aufgabe_id: q.aufgabe_id,
    text: q.text,
    antwortformat: q.antwortformat,
    loesungen: q.loesungen,
    distraktoren: q.distraktoren,
    hilfen: q.hilfen,
    abschnitt_ref: q.abschnitt_ref,
    teilkompetenz: q.teilkompetenz,
    komplexitaetsstufe: q.komplexitaetsstufe,
  }))

  return {
    analyse_id: analyseId,
    lehrer_id: lehrerId,
    titel: spielname || (selectedVorschlag
      ? `${selectedVorschlag.name} – ${new Date().toLocaleDateString('de-DE')}`
      : `Spiel – ${new Date().toLocaleDateString('de-DE')}`),
    spieltyp_didaktisch: s.schritt_13_spieltyp_didaktisch,
    game_engine: s.schritt_11_game_engine.engine_typ,
    // KI darf aus dem vollen Skin-Pool wählen (alle 15 + 3 Basis-Stufen):
    // skin_name wenn bekannt, sonst Rückfall auf die Altersstufe.
    game_skin: normalizeSkin(s.schritt_12_game_skin.skin_name, s.schritt_12_game_skin.altersstufe),
    aufgaben,
    zeitregelung_sekunden: null,
    zeitdruck_aktiv: false,
    status: 'entwurf',
  }
}

// Baut eine games-Zeile für einen Nicht-Spiel-Baustein (Erklär/Input/Check).
// Der Erklärinhalt liegt in baustein_inhalt; die Mini-Verständnisfrage als
// einzige Aufgabe in aufgaben[] (nutzt die bestehende /api/answers-Logik).
export function buildBausteinRow(
  analyseId: string,
  lehrerId: string,
  b: BausteinSequenzOutput['bausteine'][number],
  inhalt: InputBausteinOutput,
) {
  return {
    analyse_id: analyseId,
    lehrer_id: lehrerId,
    titel: inhalt.titel || b.titel,
    spieltyp_didaktisch: b.didaktische_funktion,
    game_engine: null,
    game_skin: 'analytics',
    baustein_typ: b.baustein_typ,
    baustein_inhalt: {
      markdown: inhalt.markdown,
      kernaussagen: inhalt.kernaussagen,
      didaktische_hinweise: inhalt.didaktische_hinweise,
    },
    aufgaben: [inhalt.mini_check],
    zeitregelung_sekunden: null,
    zeitdruck_aktiv: false,
    status: 'entwurf',
  }
}

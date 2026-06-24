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
  LernEinheitOutput,
} from '@/lib/schemas/pipeline'

// Flacht die Inline-Checks einer Lern-Einheit zu Aufgaben-Zeilen ab. Liegt
// bewusst zentral, damit /api/answers, Diagnose UND der Grounding-Pass exakt
// dieselben aufgabe_ids/Felder sehen.
export function flacheCheckAufgaben(inhalt: LernEinheitOutput) {
  return inhalt.segmente
    .filter((s) => s.typ === 'check' && s.check)
    .map((s) => {
      const c = s.check!
      const antwortformat =
        c.typ === 'quiz' || c.typ === 'schaubild' ? (c.quiz_format ?? 'single_choice')
        : c.typ === 'lueckentext' ? 'lueckentext'
        : c.typ === 'zuordnen' ? 'zuordnung'
        : 'unterstreichen'
      return {
        aufgabe_id: c.check_id,
        text: c.frage,
        antwortformat,
        loesungen: c.loesungen,
        distraktoren: c.distraktoren,
        hilfen: c.hilfen,
        abschnitt_ref: c.abschnitt_ref,
        teilkompetenz: c.teilkompetenz,
        komplexitaetsstufe: c.komplexitaetsstufe,
      }
    })
}

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
  inhalt: LernEinheitOutput,
) {
  return {
    analyse_id: analyseId,
    lehrer_id: lehrerId,
    titel: inhalt.titel || b.titel,
    spieltyp_didaktisch: b.didaktische_funktion,
    game_engine: null,
    game_skin: 'analytics',
    baustein_typ: b.baustein_typ,
    // Block D: interleaved Sequenz (Text + Checks). `aufgaben` enthält die Checks
    // flach für Answers/Diagnose/Grounding — dieselben aufgabe_ids wie in segmente.
    baustein_inhalt: {
      segmente: inhalt.segmente,
      kernaussagen: inhalt.kernaussagen,
      didaktische_hinweise: inhalt.didaktische_hinweise,
    },
    aufgaben: flacheCheckAufgaben(inhalt),
    zeitregelung_sekunden: null,
    zeitdruck_aktiv: false,
    status: 'entwurf',
  }
}

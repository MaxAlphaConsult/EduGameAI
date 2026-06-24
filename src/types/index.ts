// ============================================================
// EduGame AI — Core TypeScript Types
// Entspricht dem Datenmodell aus EDUGAME_AI_TODO.md Abschnitt 23
// ============================================================

// --- Enums ---------------------------------------------------

export type Wissensform =
  | 'faktenwissen'
  | 'begriffswissen'
  | 'konzeptuelles_wissen'
  | 'prozedurales_wissen'
  | 'strategisches_wissen'
  | 'metakognitives_wissen'
  | 'sprachliches_wissen'
  | 'interpretatives_wissen'
  | 'bewertungs_urteilswissen'

export type Lernform =
  | 'wiederholendes_lernen'
  | 'verstehendes_lernen'
  | 'anwendungsorientiertes_lernen'
  | 'entdeckendes_lernen'
  | 'fehlerbasiertes_lernen'
  | 'problemloesendes_lernen'
  | 'sprachproduktives_lernen'
  | 'reflexives_lernen'

export type Wissensstruktur =
  | 'begriffswissen'
  | 'kategorien_ordnungswissen'
  | 'prozesswissen'
  | 'ursache_wirkungs_wissen'
  | 'vergleichswissen'
  | 'argumentationswissen'
  | 'quellen_text_interpretationswissen'
  | 'regel_systemwissen'
  | 'prozedurales_wissen'
  | 'sprachliches_produktionswissen'
  | 'modell_darstellungswissen'
  | 'bewertungs_urteilswissen'

export type Denkhandlung =
  | 'erkennen_wiedergeben'
  | 'zuordnen_klassifizieren'
  | 'erklaeren_erlaeutern'
  | 'strukturieren_darstellen'
  | 'anwenden_uebertragen'
  | 'analysieren_untersuchen'
  | 'bewerten_beurteilen'
  | 'produzieren_gestalten'

export type Komplexitaetsstufe = 1 | 2 | 3 | 4 | 5 | 6 | 7

// 4-stufige Skala: leichter / mittel / schwer / sehr_schwer
export type Differenzierungsniveau = 'leichter' | 'mittel' | 'schwer' | 'sehr_schwer'

export type Antwortformat =
  | 'single_choice'
  | 'multiple_choice'
  | 'zuordnung'
  | 'reihenfolge'
  | 'hangman'
  | 'space_invaders'
  | 'boss_fight'
  | 'sprint_quiz'
  | 'escape_room'
  | 'lueckentext'
  | 'memory'
  | 'study_bird'
  | 'millionaer'
  | 'swipe'
  | 'code_cracker'
  | 'sortieren'
  | 'quiz_tower'
  | 'wort_schlange'
  | 'detektiv'
  // Tier-1-Inline-Check (Block D) — kein Spiel-Template, reines React-Widget.
  | 'unterstreichen'

export type SpielbarkeitsAmpel = 'gruen' | 'gelb' | 'rot'

export type Spielfunktion =
  | 'vorbereitung'
  | 'uebung'
  | 'sicherung'
  | 'diagnose'
  | 'teilueberpruefung'

export type Ursprung = 'original' | 'ki_ergaenzung' | 'didaktisch_reduziert'

export type LernzielStatus = 'erreicht' | 'teilweise_erreicht' | 'noch_nicht_gesichert'

export type Ampelfarbe = 'gruen' | 'gelb' | 'rot'

// Didaktische Spieltypen (Game-Engines nach Passung, nicht Attraktivität)
export type GameEngine =
  | 'wissensabruf'
  | 'zuordnung_ordnung'
  | 'prozess_ablauf'
  | 'erklaerung_zusammenhang'
  | 'anwendung_fall'
  | 'fehlerbasiert'
  | 'modell_darstellung'
  | 'sprach_produktion'
  | 'argumentation_urteil'
  | 'reflexion_strategie'

// Visuelle Spieloberfläche je Altersstufe
export type GameSkin = 'unterstufe' | 'mittelstufe' | 'oberstufe'

// --- LernFlow-Bausteine (Migration 014) ----------------------
// Ein Modul ist ein typisierter Baustein. 'spiel' ist nur ein Typ unter mehreren.
export type BausteinTyp =
  | 'einstieg'
  | 'vorwissen_check'
  | 'input'
  | 'erarbeitung'
  | 'spiel'
  | 'sicherung'
  | 'transfer'
  | 'post_check'

// --- Tier-1-Inline-Checks (Block D) --------------------------
// Reine React-Widgets (KEINE Game-Engine). Werden interleaved IN die Lern-
// Einheit eingebettet. Einheitliche Aufgaben-Felder (loesungen/distraktoren/
// hilfen/abschnitt_ref), damit Checks 1:1 in `aufgaben` (für /api/answers +
// Diagnose) und in den Grounding-Pass übernommen werden können.
export type InlineCheckTyp = 'quiz' | 'lueckentext' | 'zuordnen' | 'unterstreichen' | 'schaubild'

// 'Text mit Schaubild': ein Diagramm — bewusst als Mermaid (deklarativ, verlässlich)
// oder sanitisiertes SVG, NIE als KI-Rastergrafik (vermeidet fachlich falsche Bilder).
export interface SchaubildQuelle {
  format: 'mermaid' | 'svg'
  quelle: string
}

export interface InlineCheck {
  check_id: string
  typ: InlineCheckTyp
  frage: string
  // 'quiz' und 'schaubild' → single/multiple_choice; sonst null.
  quiz_format: 'single_choice' | 'multiple_choice' | null
  // 'lueckentext' → Satz mit ___-Lücken; 'unterstreichen' → Text zum Markieren; sonst null.
  text: string | null
  // Nur 'schaubild': das anzuzeigende Diagramm. Sonst null.
  schaubild: SchaubildQuelle | null
  loesungen: string[]
  distraktoren: string[]
  hilfen: string[]
  abschnitt_ref: string
  teilkompetenz: string
  komplexitaetsstufe: Komplexitaetsstufe
}

// Ein Segment der Lern-Einheit: entweder ein Erklär-Textblock ODER ein Check.
export type LernEinheitSegment =
  | { typ: 'text'; markdown: string; check?: null }
  | { typ: 'check'; check: InlineCheck; markdown?: null }

// Inhalt für Nicht-Spiel-Bausteine (Erklär-/Input). Bei 'spiel' = null.
export interface BausteinInhalt {
  // Alt-Form (vor Block D): Erklärtext am Stück + getrennte `aufgaben`.
  markdown?: string
  // Neu (Block D): interleaved Sequenz aus Text- und Check-Segmenten.
  segmente?: LernEinheitSegment[]
  kernaussagen: string[]
  didaktische_hinweise?: string[]
}

// --- Spielmapping Types --------------------------------------

export type SpielvorschlagTyp =
  | 'beste_didaktische_passung'
  | 'alternative_mechanik'
  | 'staerker_motivierend'
  | 'diagnostisch_stark'
  | 'differenzierung_transfer'

export type SpielvorschlagRang = 1 | 2 | 3 | 4 | 5

export interface Spielvorschlag {
  rang: SpielvorschlagRang
  typ: SpielvorschlagTyp
  name: string
  didaktischer_spieltyp: string
  game_engine: Antwortformat
  game_skin_konzept: string
  game_skin_mvp: GameSkin
  antwortformate: Antwortformat[]
  passung_begruendung: string
  mvp_ampel: SpielbarkeitsAmpel
  regelbasiert_auswertbar: boolean
  differenzierung_moeglichkeiten: string
  typische_fehler_fehlvorstellungen: string[]
  feedbacklogik: string
  spielfunktion: Spielfunktion
}

export interface SpielmappingOutput {
  lerngegenstand_kurz: string
  vorschlaege: Spielvorschlag[]
  ausgewaehlter_vorschlag_rang: SpielvorschlagRang
  auswahlbegruendung: string
}

// --- Core Data Models ----------------------------------------

export interface MaterialAbschnitt {
  id: string          // z.B. "A1", "A2"
  text: string
  seite?: number
}

export interface Material {
  id: string
  lehrer_id: string
  datei_url: string
  dateiname: string
  extrahierter_text: string
  abschnitte: MaterialAbschnitt[]
  fach: string
  jahrgangsstufe: string
  schulform: string
  upload_datum: string
}

export interface Analyse {
  id: string
  material_id: string
  zusammenfassung: string
  kernaussagen: {
    aussage: string
    abschnitt_ref: string
    wichtigkeit: 'primaer' | 'sekundaer'
  }[]
  wissensform_primaer: Wissensform
  wissensform_sekundaer: Wissensform[]
  lernform_primaer: Lernform
  lernform_sekundaer: Lernform | null
  wissensstruktur: Wissensstruktur
  denkhandlungen: Denkhandlung[]
  komplexitaetsstufe: Komplexitaetsstufe
  lernziel_original: string
  lernziel_mvp_variante: string | null
  spielbarkeit_ampel: SpielbarkeitsAmpel
  spielbarer_anteil: string
  nicht_spielbarer_anteil: string | null
  antwortformat_primaer: Antwortformat
  antwortformat_sekundaer: Antwortformat | null
  spielfunktion: Spielfunktion
  abdeckung: {
    vollstaendig: string[]
    teilweise: string[]
    nicht_abgedeckt: string[]
  }
}

interface DifferenzierungsStufe {
  text_variante: string | null
  hilfen: string[]
  distraktoren: string[]
}

export interface Aufgabe {
  aufgabe_id: string
  text: string
  antwortformat: Antwortformat
  loesungen: string[]
  distraktoren: string[]
  hilfen: string[]
  abschnitt_ref: string
  teilkompetenz: string
  komplexitaetsstufe: Komplexitaetsstufe
  // Legacy-Felder (bleiben für rückwärtskompatible DB-Einträge)
  differenzierungen?: {
    leichter?: DifferenzierungsStufe
    mittel?: DifferenzierungsStufe
    schwer?: DifferenzierungsStufe
    sehr_schwer?: DifferenzierungsStufe
  }
  fehlvorstellungen?: unknown[]
}

export interface Spiel {
  id: string
  analyse_id: string
  lehrer_id: string
  game_flow_id: string | null
  reihenfolge: number | null
  titel: string
  spieltyp_didaktisch: string
  game_engine: GameEngine
  game_skin: GameSkin
  // LernFlow-Baustein-Typ (Migration 014). Alt-Module ohne Wert = 'spiel'.
  baustein_typ: BausteinTyp
  // Erklär-/Input-Inhalt für Nicht-Spiel-Bausteine; bei 'spiel' = null.
  baustein_inhalt: BausteinInhalt | null
  aufgaben: Aufgabe[]
  zeitregelung_sekunden: number | null
  zeitdruck_aktiv: boolean
  status: 'entwurf' | 'geprueft' | 'freigegeben'
  erstellt_am: string
}

export interface LehrkraftCheck {
  id: string
  spiel_id: string
  gesamtampel: SpielbarkeitsAmpel
  lernziel_original: string
  lernziel_mvp_variante: string | null
  dimensionen: {
    fachliche_korrektheit: 'ok' | 'warnung' | 'problem'
    lernzielpassung: 'ok' | 'warnung' | 'problem'
    spielbarkeit_ampel: SpielbarkeitsAmpel
    mvp_tauglichkeit: 'ok' | 'warnung' | 'problem'
    game_engine_passung: 'ok' | 'warnung' | 'problem'
    regelbasiert_auswertbar: boolean
    ki_call_pro_antwort_vermieden: boolean
    differenzierung: 'ok' | 'warnung' | 'problem'
    feedbackqualitaet: 'ok' | 'warnung' | 'problem'
    reduktion_markiert: 'ok' | 'warnung' | 'problem'
    altersangemessen: 'ok' | 'warnung' | 'problem'
    sourcemapping_vollstaendig: 'ok' | 'warnung' | 'problem'
  }
  lernzielanteile: {
    vollstaendig: string[]
    teilweise: string[]
    nicht_abgedeckt: string[]
  }
  spielfunktion: Spielfunktion
  hinweise_fuer_lehrkraft: string[]
  begruendung_anpassungen: string | null
  signoff_lehrkraft: boolean
  erstellt_am: string
}

// --- GameFlow-Modell (Migration 010) ------------------------

export interface GameFlow {
  id: string
  lehrer_id: string
  material_id: string
  analyse_id: string | null
  titel: string
  zeitrahmen_minuten: number
  anzahl_spiele: number
  status: 'entwurf' | 'sortiert' | 'freigegeben'
  sortiert_am: string | null
  created_at: string
}

export interface FlowRelease {
  id: string
  game_flow_id: string
  class_id: string
  access_code: string
  status: 'aktiv' | 'archiviert'
  released_at: string
  archived_at: string | null
}

export interface StudentSession {
  id: string
  flow_release_id: string
  student_id: string | null
  code: string
  aktuelles_modul_index: number
  modul_anzahl: number
  lernpfad_abgeschlossen: boolean
  gestartet_am: string
  abgeschlossen_am: string | null
}

export interface ModuleSession {
  id: string
  student_session_id: string
  game_id: string
  position: number
  niveau: Differenzierungsniveau
  status: 'laufend' | 'abgeschlossen'
  gestartet_am: string
  abgeschlossen_am: string | null
}

export interface Antwort {
  id: string
  module_session_id: string
  aufgabe_id: string
  antwort_wert: string
  status: 'korrekt' | 'teilweise_korrekt' | 'falsch' | 'nicht_bearbeitet'
  versuche: number
  hilfen_genutzt: number
  bearbeitungszeit_sekunden: number | null
  ausgeloestes_feedback: string | null
  abgebrochen: boolean
}

export interface Klasse {
  id: string
  lehrer_id: string
  name: string
  jahrgangsstufe: string
  fach: string
  erstellt_am: string
}

// --- Diagnosis Types -----------------------------------------

export interface DiagnoseKompakt {
  auswertung_id: string
  sitzungs_id: string
  ausgabemodus: 'kompakt' | 'detail'
  klassenueberblick: {
    anzahl_codes: number
    lernpfad_abgeschlossen: number
    lernziel_erreicht: number
    lernziel_teilweise: number
    lernziel_noch_nicht_gesichert: number
    gesamteinschaetzung: string
    lernziel_original: string
    lernziel_mvp_variante: string | null
    abdeckungshinweis: string
  }
  kompetenzampel_klasse: { teilkompetenz: string; status: Ampelfarbe; einschaetzung: string }[]
  haeufige_fehlvorstellungen: {
    fehlvorstellung: string
    haeufigkeit: number
    betroffene_aufgaben: string[]
    empfehlung: string
  }[]
  empfehlungen_weiterarbeit: {
    plenum: string[]
    vertiefung: string[]
    erweiterung: string[]
    exit_ticket_vorschlag: string | null
  }
  foerdergruppen: {
    gruppe: string
    beschreibung: string
    codes: string[]
    empfehlung: string
  }[]
  individuelle_diagnosen: {
    code: string
    lernzielstatus: LernzielStatus
    lernpfad_abgeschlossen: boolean
    sichere_teilkompetenzen: string[]
    unsichere_teilkompetenzen: string[]
    fehlvorstellungen: string[]
    hilfenutzung: 'selbststaendig' | 'mit_hilfe' | 'trotz_hilfe_unsicher'
    erreichte_komplexitaetsstufe: number
    empfehlung: string
  }[]
  sus_rueckmeldungen: {
    code: string
    lernstand_satz: string
    kann_schon_gut: string[]
    noch_ueben: string[]
    naechster_schritt: string
  }[]
  daten_hinweise: string[]
  pdf_export: {
    lehrkraft_pdf_bereit: boolean
    sus_pdfs_bereit: boolean
    anzahl_sus_pdfs: number
  }
}

export interface DiagnoseDetail extends DiagnoseKompakt {
  kompetenzmatrix: {
    teilkompetenz: string
    codes_sicher: string[]
    codes_teilweise: string[]
    codes_unsicher: string[]
  }[]
  hilfenutzungsanalyse: {
    selbststaendig: number
    mit_hilfe: number
    trotz_hilfe_unsicher: number
    auswertung: string
  }
  komplexitaetsanalyse: {
    stufe: number
    bezeichnung: string
    anteil_erreicht: number
    einschaetzung: string
  }[]
  fehlvorstellungsanalyse: {
    fehlvorstellung: string
    aufgaben: string[]
    codes: string[]
    empfehlung: string
  }[]
  lernpfad_verlaufsanalyse: string
  unterrichtsimpulse: string[]
}

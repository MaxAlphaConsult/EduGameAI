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
  titel: string
  spieltyp_didaktisch: string
  game_engine: GameEngine
  game_skin: GameSkin
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

export interface SchuelerSession {
  id: string
  spiel_id: string
  code: string              // Tiername + Zufallscode, kein Klarname
  differenzierungsniveau: Differenzierungsniveau
  gestartet_am: string
  abgeschlossen_am: string | null
  lernpfad_abgeschlossen: boolean
}

export interface Antwort {
  id: string
  session_id: string
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

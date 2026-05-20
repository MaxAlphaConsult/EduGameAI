import { z } from 'zod'

// ============================================================
// Zod-Schemas für alle 6 Pipeline-Schritte
// Jeder Schema entspricht exakt dem Output-Format des jeweiligen Prompts
// ============================================================

// --- Gemeinsame Felder ---------------------------------------

const WissensformSchema = z.enum([
  'faktenwissen',
  'begriffswissen',
  'konzeptuelles_wissen',
  'prozedurales_wissen',
  'strategisches_wissen',
  'metakognitives_wissen',
  'sprachliches_wissen',
  'interpretatives_wissen',
  'bewertungs_urteilswissen',
])

const LernformSchema = z.enum([
  'wiederholendes_lernen',
  'verstehendes_lernen',
  'anwendungsorientiertes_lernen',
  'entdeckendes_lernen',
  'fehlerbasiertes_lernen',
  'problemloesendes_lernen',
  'sprachproduktives_lernen',
  'reflexives_lernen',
])

const WissensstrukturSchema = z.enum([
  'begriffswissen',
  'kategorien_ordnungswissen',
  'prozesswissen',
  'ursache_wirkungs_wissen',
  'vergleichswissen',
  'argumentationswissen',
  'quellen_text_interpretationswissen',
  'regel_systemwissen',
  'prozedurales_wissen',
  'sprachliches_produktionswissen',
  'modell_darstellungswissen',
  'bewertungs_urteilswissen',
])

const DenkhandlungSchema = z.enum([
  'erkennen_wiedergeben',
  'zuordnen_klassifizieren',
  'erklaeren_erlaeutern',
  'strukturieren_darstellen',
  'anwenden_uebertragen',
  'analysieren_untersuchen',
  'bewerten_beurteilen',
  'produzieren_gestalten',
])

const KomplexitaetsstufeSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7),
])

// Alle implementierten Templates inkl. neuer Skins (boss_fight, sprint_quiz, escape_room)
const AntwortformatSchema = z.enum([
  'single_choice',
  'multiple_choice',
  'zuordnung',
  'reihenfolge',
  'hangman',
  'space_invaders',
  'boss_fight',
  'sprint_quiz',
  'escape_room',
])

const AmpelSchema = z.enum(['gruen', 'gelb', 'rot'])

const SpielbarkeitsAmpelSchema = AmpelSchema

const SpielreihefunktionSchema = z.enum([
  'vorbereitung', 'uebung', 'sicherung', 'diagnose', 'teilueberpruefung',
])

const UrsprungSchema = z.enum(['original', 'ki_ergaenzung', 'didaktisch_reduziert'])

const DifferenzierungsniveauSchema = z.enum(['leichter', 'mittel', 'schwer', 'sehr_schwer'])

// --- Schema 1: Materialanalyse (Prompt 01, Schritte 1–6) -----

export const AnalyseOutputSchema = z.object({
  analyse_id: z.string(),
  material_id: z.string(),
  schritt_1_zusammenfassung: z.string().min(1),
  schritt_2_kernaussagen: z.array(z.object({
    aussage: z.string().min(1),
    abschnitt_ref: z.string().min(1),
    wichtigkeit: z.enum(['primär', 'sekundär']),
  })).min(1),
  schritt_3_wissensformen: z.object({
    primär: WissensformSchema,
    sekundär: z.array(WissensformSchema),
    begruendung: z.string(),
  }),
  schritt_4_lernform: z.object({
    primär: LernformSchema,
    sekundär: z.union([LernformSchema, z.null()]),
    begruendung: z.string(),
  }),
  schritt_5_wissensstruktur: z.object({
    typ: WissensstrukturSchema,
    denkhandlungen: z.array(DenkhandlungSchema).min(1),
    begruendung: z.string(),
  }),
  schritt_6_komplexitaet: z.object({
    stufe: KomplexitaetsstufeSchema,
    stufe_bezeichnung: z.string().min(1),
    differenzierungsrahmen: z.object({
      leichter: z.string(),
      mittel: z.string(),
      schwer: z.string(),
      sehr_schwer: z.string(),
    }),
    begruendung: z.string(),
  }),
  anmerkungen: z.string().optional(),
})

export type AnalyseOutput = z.infer<typeof AnalyseOutputSchema>

// --- Schema 2: Lernziel & Spielbarkeit (Prompt 02, Schritte 7–10) ---

export const LernzielOutputSchema = z.object({
  schritt_7_lernziel: z.object({
    original: z.string().min(1),
    komponenten: z.object({
      inhalt: z.string(),
      denkhandlung: z.string(),
      kriterium: z.string(),
      produkt_antwortformat: z.string(),
    }),
    vollstaendig: z.boolean(),
    anmerkungen_zum_lernziel: z.string().optional(),
  }),
  schritt_8_spielbarkeit_analyse: z.object({
    geeignet: z.enum(['voll', 'eingeschränkt', 'nicht_geeignet']),
    begruendung: z.string(),
    spielbarer_anteil: z.string(),
    nicht_spielbarer_anteil: z.union([z.string(), z.null()]),
  }),
  schritt_9_ampel: z.object({
    farbe: SpielbarkeitsAmpelSchema,
    problem_der_spielbarkeit: z.union([z.string(), z.null()]),
    lernziel_mvp_variante: z.union([z.string(), z.null()]),
    begruendung_anpassung: z.union([z.string(), z.null()]),
    spielfunktion: SpielreihefunktionSchema,
    regelbasiert_auswertbar: z.boolean(),
    abdeckung: z.object({
      vollstaendig: z.array(z.string()),
      teilweise: z.array(z.string()),
      nicht_abgedeckt: z.array(z.string()),
    }),
  }),
  schritt_10_antwortformat: z.object({
    primäres_format: AntwortformatSchema,
    sekundäres_format: z.union([AntwortformatSchema, z.null()]),
    begruendung: z.string(),
    ki_bewertung_pro_antwort: z.boolean(),
  }),
})

export type LernzielOutput = z.infer<typeof LernzielOutputSchema>

// --- Schema 3: Lernpfad (Prompt 03) --------------------------

const LernpfadTypSchema = z.enum([
  'POE',
  'Prozess',
  'Sprachaufbau',
  'Vokabel',
  'Kriterien_Urteil',
  'Text_Deutung',
  'Verfahren_Anwendung',
])

const LernpfadLevelSchema = z.object({
  level_nr: z.number().int().positive(),
  spiel_nr: z.number().int().positive(),
  bearbeitungszeit_minuten: z.number().positive(),
  didaktische_funktion: z.string().min(1),
  lerninhalt: z.string().min(1),
  komplexitaetsstufe: z.string().min(1),
  aufgabenformat: z.string().min(1),
  game_engine: z.string().min(1),
  game_skin: z.string().min(1),
  differenzierung: z.string().min(1),
  feedbacklogik: z.string().min(1),
  diagnostischer_wert: z.string().min(1),
  beitrag_lernziel: z.string().min(1),
})

const LernpfadSpielSchema = z.object({
  spiel_nr: z.number().int().positive(),
  titel: z.string().min(1),
  funktion: z.string().min(1),
  level: z.array(LernpfadLevelSchema).min(1),
})

const ZeitstrukturplanSchema = z.object({
  gesamtzeit_minuten: z.number().positive(),
  anzahl_spiele: z.number().int().positive(),
  anzahl_level: z.number().int().positive(),
  begruendung_umfang: z.string().min(1),
  abdeckung_hinweis: z.union([z.string(), z.null()]),
})

export const LernpfadOutputSchema = z.object({
  lernpfad_typ: LernpfadTypSchema,
  lernpfad_beschreibung: z.string().min(1),
  empfohlene_phasen: z.array(z.enum(['kennenlernen', 'vertiefen', 'pruefen'])).min(1),
  empfohlene_spielfunktion: SpielreihefunktionSchema,
  lerninhalt_anteil: z.number().min(50).max(90),
  spielerlebnis_anteil: z.number().min(10).max(50),
  begruendung: z.string().min(1),
  besonderheiten: z.union([z.string(), z.null()]).optional(),
  zeitstrukturplan: ZeitstrukturplanSchema,
  spiele: z.array(LernpfadSpielSchema).min(1),
})

export type LernpfadOutput = z.infer<typeof LernpfadOutputSchema>

// --- Schema 5: Spielmapping (Prompt 04) ----------------------

const SpielvorschlagTypSchema = z.enum([
  'beste_didaktische_passung',
  'alternative_mechanik',
  'staerker_motivierend',
  'diagnostisch_stark',
  'differenzierung_transfer',
])

const SpielvorschlagRangSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
])

const SpielvorschlagSchema = z.object({
  rang: SpielvorschlagRangSchema,
  typ: SpielvorschlagTypSchema,
  name: z.string().min(1),
  didaktischer_spieltyp: z.string().min(1),
  game_engine: AntwortformatSchema,
  game_skin_konzept: z.string().min(1),
  game_skin_mvp: z.enum(['unterstufe', 'mittelstufe', 'oberstufe']),
  antwortformate: z.array(AntwortformatSchema).min(1),
  passung_begruendung: z.string().min(1),
  mvp_ampel: AmpelSchema,
  regelbasiert_auswertbar: z.boolean(),
  differenzierung_moeglichkeiten: z.string(),
  typische_fehler_fehlvorstellungen: z.array(z.string()),
  feedbacklogik: z.string().min(1),
  spielfunktion: SpielreihefunktionSchema,
})

export const SpielmappingOutputSchema = z.object({
  lerngegenstand_kurz: z.string().min(1),
  vorschlaege: z.array(SpielvorschlagSchema).length(5),
  ausgewaehlter_vorschlag_rang: SpielvorschlagRangSchema,
  auswahlbegruendung: z.string().min(1),
})

export type SpielmappingOutput = z.infer<typeof SpielmappingOutputSchema>

// --- Schema 4: Spielgenerierung (Prompt 04, Schritte 11–16) --

const DifferenzierungsStufeSchema = z.object({
  aufgabentext_variante: z.union([z.string(), z.null()]),
  hilfen: z.array(z.string()),
  distraktoren: z.array(z.string()),
})

export const SpielOutputSchema = z.object({
  schritt_11_game_engine: z.object({
    engine_typ: z.string().min(1),
    begruendung: z.string(),
  }),
  schritt_12_game_skin: z.object({
    skin_name: z.string().min(1),
    altersstufe: z.enum(['unterstufe', 'mittelstufe', 'oberstufe']),
    beschreibung: z.string(),
  }),
  schritt_13_spieltyp_didaktisch: z.string().min(1),
  schritt_14_aufgaben: z.array(z.object({
    aufgabe_id: z.string().min(1),
    text: z.string().min(1),
    antwortformat: AntwortformatSchema,
    loesungen: z.array(z.string()).min(1),
    distraktoren: z.array(z.string()),
    hilfen: z.array(z.string()),
    abschnitt_ref: z.string().min(1),
    teilkompetenz: z.string().min(1),
    komplexitaetsstufe: KomplexitaetsstufeSchema,
  })).min(1),
  schritt_15_differenzierung: z.array(z.unknown()),
  schritt_16_fehlvorstellungen: z.array(z.unknown()),
})

export type SpielOutput = z.infer<typeof SpielOutputSchema>

// --- Schema: Spielverbesserung (Prompt 07) ---------------------------

export const EinzelAufgabeSchema = z.object({
  aufgabe_id: z.string().min(1),
  text: z.string().min(1),
  antwortformat: AntwortformatSchema,
  loesungen: z.array(z.string()).min(1),
  distraktoren: z.array(z.string()),
  hilfen: z.array(z.string()),
  abschnitt_ref: z.string().min(1),
  teilkompetenz: z.string().min(1),
  komplexitaetsstufe: KomplexitaetsstufeSchema,
})

export type EinzelAufgabe = z.infer<typeof EinzelAufgabeSchema>

const VerbesserteAufgabeSchema = EinzelAufgabeSchema

export const ImproveOutputSchema = z.object({
  verbesserungen: z.array(z.object({
    aufgabe_id: z.string().min(1),
    aenderungen: z.array(z.string()),
    aufgabe_neu: VerbesserteAufgabeSchema,
  })).min(1),
  gesamtbegruendung: z.string().min(1),
})

export type ImproveOutput = z.infer<typeof ImproveOutputSchema>

// --- Schema 4: Validierung & Lehrkraft-Check (Prompt 04, Schritte 17–21) ---

const CheckDimensionSchema = z.enum(['ok', 'warnung', 'problem'])

export const ValidationOutputSchema = z.object({
  schritt_17_reduktion: z.object({
    reduktion_vorhanden: z.boolean(),
    reduktionen: z.array(z.object({
      element: z.string(),
      original_aussage: z.string(),
      reduzierte_form: z.string(),
      status: z.enum(['zulaessig', 'problematisch']),
      begruendung: z.string(),
      transparent_markiert: z.boolean(),
    })),
  }),
  schritt_18_korrektheit: z.object({
    gesamtstatus: z.enum(['alle_korrekt', 'einzelprobleme', 'grundlegende_probleme']),
    probleme: z.array(z.object({
      aufgabe_id: z.string(),
      problem: z.string(),
      empfehlung: z.string(),
    })),
  }),
  schritt_20_sourcemapping: z.object({
    abdeckung_lernziel: z.enum(['vollstaendig', 'teilweise', 'vorbereitend']),
    spielfunktion: SpielreihefunktionSchema,
    elemente: z.array(z.object({
      aufgabe_id: z.string(),
      abschnitt_ref: z.string(),
      ursprung: UrsprungSchema,
      hinweis: z.string().optional(),
    })),
  }),
  schritt_21_lehrkraft_check: z.object({
    gesamtampel: AmpelSchema,
    lernziel_original: z.string().min(1),
    lernziel_mvp_variante: z.union([z.string(), z.null()]),
    dimensionen: z.object({
      fachliche_korrektheit: CheckDimensionSchema,
      lernzielpassung: CheckDimensionSchema,
      spielbarkeit_ampel: SpielbarkeitsAmpelSchema,
      mvp_tauglichkeit: CheckDimensionSchema,
      game_engine_passung: CheckDimensionSchema,
      regelbasiert_auswertbar: z.boolean(),
      ki_call_pro_antwort_vermieden: z.boolean(),
      differenzierung: CheckDimensionSchema,
      feedbackqualitaet: CheckDimensionSchema,
      reduktion_markiert: CheckDimensionSchema,
      altersangemessen: CheckDimensionSchema,
      sourcemapping_vollstaendig: CheckDimensionSchema,
      lernpfad_passung: CheckDimensionSchema,
      lerninhalt_spielerlebnis_balance: CheckDimensionSchema,
    }),
    lernzielanteile: z.object({
      vollstaendig_abgedeckt: z.array(z.string()),
      teilweise_abgedeckt: z.array(z.string()),
      nicht_abgedeckt: z.array(z.string()),
    }),
    hinweise_fuer_lehrkraft: z.array(z.string()),
    spielfunktion: SpielreihefunktionSchema,
    begruendung_anpassungen: z.union([z.string(), z.null()]),
  }),
})

export type ValidationOutput = z.infer<typeof ValidationOutputSchema>

// --- Schema 5: Lernstandsdiagnose (Prompt 05) ----------------

export const DiagnoseOutputSchema = z.object({
  auswertung_id: z.string(),
  sitzungs_id: z.string(),
  ausgabemodus: z.enum(['kompakt', 'detail']),
  klassenueberblick: z.object({
    anzahl_codes: z.number().int().nonnegative(),
    lernpfad_abgeschlossen: z.number().int().nonnegative(),
    lernziel_erreicht: z.number().int().nonnegative(),
    lernziel_teilweise: z.number().int().nonnegative(),
    lernziel_noch_nicht_gesichert: z.number().int().nonnegative(),
    gesamteinschaetzung: z.string(),
    lernziel_original: z.string(),
    lernziel_mvp_variante: z.union([z.string(), z.null()]),
    abdeckungshinweis: z.string(),
  }),
  kompetenzampel_klasse: z.array(z.object({
    teilkompetenz: z.string(),
    status: AmpelSchema,
    einschaetzung: z.string(),
  })),
  haeufige_fehlvorstellungen: z.array(z.object({
    fehlvorstellung: z.string(),
    haeufigkeit: z.number().int().nonnegative(),
    betroffene_aufgaben: z.array(z.string()),
    empfehlung: z.string(),
  })),
  empfehlungen_weiterarbeit: z.object({
    plenum: z.array(z.string()),
    vertiefung: z.array(z.string()),
    erweiterung: z.array(z.string()),
    exit_ticket_vorschlag: z.union([z.string(), z.null()]).optional(),
  }),
  foerdergruppen: z.array(z.object({
    gruppe: z.string(),
    beschreibung: z.string(),
    codes: z.array(z.string()),
    empfehlung: z.string(),
  })),
  individuelle_diagnosen: z.array(z.object({
    code: z.string(),
    lernzielstatus: z.enum(['erreicht', 'teilweise_erreicht', 'noch_nicht_gesichert']),
    lernpfad_abgeschlossen: z.boolean(),
    sichere_teilkompetenzen: z.array(z.string()),
    unsichere_teilkompetenzen: z.array(z.string()),
    fehlvorstellungen: z.array(z.string()),
    hilfenutzung: z.enum(['selbststaendig', 'mit_hilfe', 'trotz_hilfe_unsicher']),
    erreichte_komplexitaetsstufe: z.number().int().min(1).max(7),
    empfehlung: z.string(),
  })),
  sus_rueckmeldungen: z.array(z.object({
    code: z.string(),
    lernstand_satz: z.string(),
    kann_schon_gut: z.array(z.string()),
    noch_ueben: z.array(z.string()),
    naechster_schritt: z.string(),
  })),
  daten_hinweise: z.array(z.string()),
  pdf_export: z.object({
    lehrkraft_pdf_bereit: z.boolean(),
    sus_pdfs_bereit: z.boolean(),
    anzahl_sus_pdfs: z.number().int().nonnegative(),
  }),
})

export type DiagnoseOutput = z.infer<typeof DiagnoseOutputSchema>

// Vorab exportierte Schemas für externe Nutzung
export {
  WissensformSchema,
  LernformSchema,
  WissensstrukturSchema,
  DenkhandlungSchema,
  KomplexitaetsstufeSchema,
  AntwortformatSchema,
  AmpelSchema,
  SpielbarkeitsAmpelSchema,
  SpielreihefunktionSchema,
  UrsprungSchema,
  DifferenzierungsniveauSchema,
}

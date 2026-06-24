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

// Alle implementierten Templates inkl. neuer Skins (boss_fight, sprint_quiz, escape_room, lueckentext, memory)
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
  'lueckentext',
  'memory',
  'study_bird',
  'millionaer',
  'swipe',
  'code_cracker',
  'sortieren',
  'quiz_tower',
  'wort_schlange',
  'detektiv',
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

// --- Schema 6: LernFlow-Bausteinsequenz (Prompt 11) ----------
//
// Plant aus dem Lernpfad-Archetyp die konkrete, didaktisch geordnete
// Baustein-Sequenz. 'spiel' ist nur ein Typ unter mehreren — die KI entscheidet
// nach Passung, wo (ob) ein Spiel sitzt.

const BausteinTypSchema = z.enum([
  'einstieg',
  'vorwissen_check',
  'input',
  'erarbeitung',
  'spiel',
  'sicherung',
  'transfer',
  'post_check',
])

export const BausteinSequenzOutputSchema = z.object({
  lernpfad_typ: LernpfadTypSchema,
  begruendung_sequenz: z.string().min(1),
  bausteine: z.array(z.object({
    position: z.number().int().positive(),
    baustein_typ: BausteinTypSchema,
    titel: z.string().min(1),
    thema: z.string().min(1),
    didaktische_funktion: z.string().min(1),
    bearbeitungszeit_minuten: z.number().positive(),
    // Bei 'spiel': kurze Begründung der Passung; sonst Rolle im Lernbogen.
    begruendung: z.string().min(1),
  })).min(1),
})

export type BausteinSequenzOutput = z.infer<typeof BausteinSequenzOutputSchema>

// --- Schema 7: Input-/Erklär-Baustein (Prompt 12) ------------
//
// Erklär-Häppchen streng aus dem Material + Kernaussagen + genau eine
// Mini-Verständnisfrage (nutzt bestehende Aufgaben-/Answers-Logik).

const MiniCheckAufgabeSchema = z.object({
  aufgabe_id: z.string().min(1),
  text: z.string().min(1),
  antwortformat: z.enum(['single_choice', 'multiple_choice']),
  loesungen: z.array(z.string()).min(1),
  distraktoren: z.array(z.string()),
  hilfen: z.array(z.string()),
  abschnitt_ref: z.string().min(1),
  teilkompetenz: z.string().min(1),
  komplexitaetsstufe: KomplexitaetsstufeSchema,
})

export const InputBausteinOutputSchema = z.object({
  titel: z.string().min(1),
  markdown: z.string().min(1),
  kernaussagen: z.array(z.string().min(1)).min(1),
  didaktische_hinweise: z.array(z.string()),
  mini_check: MiniCheckAufgabeSchema,
})

export type InputBausteinOutput = z.infer<typeof InputBausteinOutputSchema>

// --- Schema 7b: Lern-Einheit mit interleaved Inline-Checks (Prompt 12, Block D) ---
//
// Eine Lern-Einheit ist eine geordnete Sequenz aus Text- und Check-Segmenten:
// Textblock → Check → Textblock → Check → … Die Checks sind Tier-1-Widgets
// (KEINE Game-Engine). Einheitliche Aufgaben-Felder, damit jeder Check 1:1 in
// `aufgaben` (Answers/Diagnose) und in den Grounding-Pass übernommen werden kann.
const InlineCheckSchema = z.object({
  check_id: z.string().min(1),
  typ: z.enum(['quiz', 'lueckentext', 'zuordnen', 'unterstreichen', 'schaubild']),
  // Aufgabenstellung des Checks.
  frage: z.string().min(1),
  // Bei typ='quiz' und 'schaubild' relevant (sonst null).
  quiz_format: z.union([z.enum(['single_choice', 'multiple_choice']), z.null()]),
  // 'lueckentext': Satz mit ___-Lücken; 'unterstreichen': der zu markierende Text; sonst null.
  text: z.union([z.string(), z.null()]),
  // Nur 'schaubild': Diagramm als Mermaid (bevorzugt) oder sanitisiertes SVG — KEINE Rastergrafik.
  schaubild: z.union([
    z.object({ format: z.enum(['mermaid', 'svg']), quelle: z.string().min(1) }),
    z.null(),
  ]),
  // 'lueckentext': Lückenfüller in Reihenfolge; 'zuordnen': Paare "Begriff → Zuordnung";
  // 'unterstreichen': die korrekt zu markierenden Textstellen; 'quiz': richtige Option(en).
  loesungen: z.array(z.string().min(1)).min(1),
  distraktoren: z.array(z.string()),
  hilfen: z.array(z.string()),
  abschnitt_ref: z.string().min(1),
  teilkompetenz: z.string().min(1),
  komplexitaetsstufe: KomplexitaetsstufeSchema,
})

export const LernEinheitSegmentSchema = z.object({
  typ: z.enum(['text', 'check']),
  markdown: z.union([z.string(), z.null()]), // bei typ='text'
  check: z.union([InlineCheckSchema, z.null()]), // bei typ='check'
})

export const LernEinheitOutputSchema = z.object({
  titel: z.string().min(1),
  segmente: z.array(LernEinheitSegmentSchema).min(1),
  kernaussagen: z.array(z.string().min(1)).min(1),
  didaktische_hinweise: z.array(z.string()),
})

export type LernEinheitOutput = z.infer<typeof LernEinheitOutputSchema>

// Validierung für den BEARBEITEN-Pfad (PATCH /api/games/[id]). Akzeptiert die
// Alt-Form (markdown) ODER die neue Segment-Form; verhindert, dass per Hand/CSRF
// kaputte Inhalte gespeichert werden, die später beim Schüler rendern (M1,
// Defense-in-Depth gegenüber der Generierungs-Validierung). Caps gegen Aufblähen.
export const BausteinInhaltPatchSchema = z.object({
  markdown: z.string().max(20000).optional(),
  segmente: z.array(LernEinheitSegmentSchema).max(40).optional(),
  kernaussagen: z.array(z.string()).max(20).optional(),
  didaktische_hinweise: z.array(z.string()).max(20).optional(),
}).refine((v) => v.markdown !== undefined || (v.segmente !== undefined && v.segmente.length > 0), {
  message: 'baustein_inhalt braucht markdown oder segmente',
})

// Lockere Validierung für PATCH-aufgaben: jede Aufgabe braucht eine ID; weitere
// Felder bleiben erlaubt (Spiel- wie Inline-Check-Aufgaben haben unterschiedliche Formate).
export const AufgabePatchSchema = z.object({ aufgabe_id: z.string().min(1) }).passthrough()
export const AufgabenPatchSchema = z.array(AufgabePatchSchema).max(200)

// --- Schema: Grounding-Check (Prompt 13, Block C) ------------
//
// Zweiter Pass: prüft je Aufgabe, ob sie (inkl. Lösungen, Distraktoren und
// besonders Hilfen) aus dem Quellmaterial ableitbar ist — NICHT aus
// Modell-Weltwissen. Bewusst ohne z.unknown(), damit Structured Outputs nutzbar
// ist (garantiert schema-konformes JSON).
const GroundingElementSchema = z.enum(['frage', 'loesung', 'distraktor', 'hilfe'])

export const GroundingCheckOutputSchema = z.object({
  bewertungen: z.array(z.object({
    aufgabe_id: z.string().min(1),
    // true = vollständig aus dem Material belegbar; false = enthält Material-fremde
    // oder widersprüchliche Anteile.
    gegruendet: z.boolean(),
    problematische_elemente: z.array(GroundingElementSchema),
    problem: z.union([z.string(), z.null()]),
    // Abschnitt, der die Aufgabe belegt (korrigierter Ref), falls bestimmbar.
    beleg_abschnitt_ref: z.union([z.string(), z.null()]),
  })),
  zusammenfassung: z.string().min(1),
})

export type GroundingCheckOutput = z.infer<typeof GroundingCheckOutputSchema>

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

// --- Schema 7: Flow-weiter Lehrkraft-Check (Prompt 09) -------
//
// Im Unterschied zum Pro-Modul-Check (Schema ValidationOutputSchema) wird hier
// der gesamte Flow gegen das eine Flow-Lernziel bewertet. Lücken, Redundanzen
// und Modulrollen werden aggregiert betrachtet — Wissen, das ein Modul aufbaut
// und ein anderes nur abruft, gilt im Flow als abgedeckt.
export const FlowCheckOutputSchema = z.object({
  gesamtampel: AmpelSchema,
  lernziel: z.string().min(1),
  abdeckung_lernziel: z.enum(['vollstaendig', 'teilweise', 'nicht_gesichert']),
  gesamteinschaetzung: z.string().min(1),

  // Welche Rolle spielt jedes Modul im Flow?
  modulrollen: z.array(z.object({
    modul_id: z.string(),
    modul_position: z.number().int(),
    titel: z.string(),
    rolle: z.string().min(1), // z.B. "Begriffe einführen", "Anwendung trainieren", "Sicherung"
    deckt_ab: z.array(z.string()), // Teilziele/Themen, die dieses Modul abdeckt
  })),

  // Was deckt der Flow als Ganzes ab? (positiv)
  abgedeckte_teilziele: z.array(z.string()),

  // Was fehlt im Flow? (echte Lücken — kein Modul deckt das ab)
  fehlende_teilziele: z.array(z.object({
    thema: z.string().min(1),
    begruendung: z.string().min(1),
    // KI-Vorschlag: in welchem Modul ließe sich das ergänzen, und warum?
    empfohlenes_modul_id: z.union([z.string(), z.null()]),
    empfohlenes_modul_begruendung: z.string().min(1),
  })),

  // Übergreifende Hinweise — Punkte, die mehrere Module oder den Übergang betreffen
  uebergreifende_hinweise: z.array(z.object({
    thema: z.string().min(1),
    problem: z.string().min(1),
    empfehlung: z.string().min(1),
    betroffene_module: z.array(z.string()),
  })),

  // Redundanzen: Mehrere Module decken dieselbe Sache ab (kann gewollt sein,
  // aber soll markiert werden, damit die Lehrkraft entscheiden kann).
  redundanzen: z.array(z.object({
    beschreibung: z.string().min(1),
    module_ids: z.array(z.string()),
    bewertung: z.enum(['sinnvoll_wiederholend', 'unnoetig']),
  })),
})

export type FlowCheckOutput = z.infer<typeof FlowCheckOutputSchema>

// --- Schema 8: Flow-weite Verbesserungs-Vorschläge (Prompt 10) -
//
// Im Unterschied zum Pro-Modul-Improve denkt die KI hier flow-weit: sie sieht
// alle Module + den Flow-Check und entscheidet, in welchem Modul welche
// Änderung am besten platziert ist. Eine einzelne KI-Antwort kann Vorschläge
// für mehrere Module enthalten.
const FlowNeueAufgabeSchema = z.object({
  aufgabe_id: z.string().min(1),
  text: z.string().min(1),
  antwortformat: z.string().min(1),
  loesungen: z.array(z.string()),
  distraktoren: z.array(z.string()),
  hilfen: z.array(z.string()),
  teilkompetenz: z.string().optional(),
})

const FlowAenderungSchema = z.object({
  // 'aufgabe_ersetzen': eine bestehende Aufgabe wird durch eine bessere ersetzt
  // 'aufgabe_ergaenzen': eine zusätzliche Aufgabe wird angehängt
  art: z.enum(['aufgabe_ersetzen', 'aufgabe_ergaenzen']),
  // Welche bestehende Aufgabe ersetzt wird (null bei 'ergaenzen')
  ziel_aufgabe_id: z.union([z.string(), z.null()]),
  begruendung: z.string().min(1), // mit Bezug zum Flow-Lernziel / -Check
  neue_aufgabe: FlowNeueAufgabeSchema,
})

export const FlowImproveOutputSchema = z.object({
  gesamtbegruendung: z.string().min(1),
  module_vorschlaege: z.array(z.object({
    modul_id: z.string().min(1),
    modul_position: z.number().int(),
    modul_titel: z.string(),
    aenderungen: z.array(FlowAenderungSchema),
  })),
})

export type FlowImproveOutput = z.infer<typeof FlowImproveOutputSchema>

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
  BausteinTypSchema,
}

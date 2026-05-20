# Prompt 03 — Spielmapping (5 Spielvorschläge)

## Zweck
Dieser Prompt übersetzt das didaktische Analyseergebnis (Schritte 1–10) in konkrete Spielvorschläge.
Das Spielmapping wählt nicht nach Attraktivität, sondern nach didaktischer Passung.

## Rolle
Du bist ein erfahrener Spieldesigner mit fundierter Fachdidaktik. Du kennst alle 15 implementierten
Spielvorlagen und wählst situationsgerecht aus. Fachliche Korrektheit und Auswertbarkeit haben Vorrang.

---

## Input-Format

```json
{
  "analyse": "<vollständiges JSON-Objekt aus Prompt 01>",
  "lernziel": "<vollständiges JSON-Objekt aus Prompt 02>",
  "lernpfad": "<vollständiges JSON-Objekt aus Prompt 03 Lernpfad>",
  "kontext": {
    "fach": "<z.B. Biologie>",
    "jahrgangsstufe": "<z.B. 9>",
    "schulform": "<z.B. Gymnasium>",
    "zeitrahmen_minuten": 15
  }
}
```

**Nutze `lernpfad.lernpfad_typ` und `lernpfad.empfohlene_spielfunktion` als primären Auswahlfilter:**
Der Lernpfad-Typ bestimmt, aus welchem Phasen-Pool (Kennenlernen / Vertiefen / Prüfen) du auswählst.
Überschreibe die Spielfunktion aus Prompt 02 durch `lernpfad.empfohlene_spielfunktion`, wenn diese präziser ist.

---

## Die 15 Spielvorlagen nach Phase

### Phase KENNENLERNEN — Vorwissen aktivieren, Neugier wecken, erste Begegnung mit Stoff

| ID | Name | Didaktischer Spieltyp | Game-Engine | Game-Skin | Ampel-Default |
|----|------|-----------------------|-------------|-----------|---------------|
| K1 | Hypothesen-Jagd | Fehleranalyse / Hypothesenbildung | `single_choice` | Detective Room | gelb |
| K2 | Begriff-Radar | Begriffswissen entdecken | `hangman` | Radar-Scanner | gruen |
| K3 | Erstes Ordnen | Erste Kategorisierung / Strukturierung | `reihenfolge` | Puzzle-Karte | gruen |
| K4 | Zuordnungs-Einstieg | Erstzuordnung Begriff ↔ Beispiel | `zuordnung` | Entdeckerkarte | gruen |
| K5 | Story-Einstieg | Entscheidungspfad / Fallkonfrontation | `single_choice` | Story-Fork | gelb |

**Regeln für KENNENLERNEN:**
- Hilfen sind großzügig vorhanden (3 Stufen)
- Feedback ist immer erklärend — SuS sollen durch Fehler lernen
- Fehlvorstellungen aus dem Alltag aktiv als Distraktoren einbauen
- Zeitdruck verboten

---

### Phase VERTIEFEN — Anwenden, Festigen, Fehler korrigieren

| ID | Name | Didaktischer Spieltyp | Game-Engine | Game-Skin | Ampel-Default |
|----|------|-----------------------|-------------|-----------|---------------|
| V1 | Sortierband | Kategorisierung nach Kriterien | `zuordnung` | Werkstatt-Band | gruen |
| V2 | Prozess-Kette | Prozessdarstellung / Ablaufmodell | `reihenfolge` | Flow-Kette | gruen |
| V3 | Begriff-Schmied | Wissensabruf Fachbegriff | `hangman` | Werkzeugkasten | gruen |
| V4 | Fehler-Detektor | Fehleranalyse / Fehler erkennen | `multiple_choice` | Fehler-Scanner | gruen |
| V5 | Kriterien-Waage | Kriterienanwendung / Pro-Contra | `zuordnung` | Waage | gruen |
| V6 | Begriffe-im-Satz | Begriffswissen im Kontext / Definition füllen | `lueckentext` | Werkzeugkasten | gruen |

**Regeln für VERTIEFEN:**
- Mittel-Hilfen (1–2 Stufen)
- Feedback ist korrektiv und kriterial
- Distraktoren sind typische Fehlvorstellungen der Zielgruppe (keine absurden Falschantworten)
- Differenzierung über Anzahl Kategorien / Elemente / Schwierigkeitsgrad der Distraktoren

---

### Phase PRÜFEN — Abruf, Diagnose, kein Netz

| ID | Name | Didaktischer Spieltyp | Game-Engine | Game-Skin | Ampel-Default |
|----|------|-----------------------|-------------|-----------|---------------|
| P1 | Boss Fight | Wissensabruf unter Druck | `boss_fight` | Boss Battle | gruen |
| P2 | Space Race | Wissensabruf / Treffsicherheit | `space_invaders` | Space Invaders | gruen |
| P3 | Sprint-Quiz | Schnellabruf / Timed Recall | `sprint_quiz` | Sprint-Bahn | gruen |
| P4 | Escape-Kette | Verketteter Wissensabruf | `escape_room` | Escape Room | gruen |
| P5 | Wissens-Gauntlet | Gemischter Abruf aller Teilkompetenzen | `multiple_choice` | Arena | gruen |

**Regeln für PRÜFEN:**
- Keine Hilfen
- Feedback nur richtig/falsch — keine Erklärungen im Prüf-Modus
- Zeitdruck erlaubt (sprint_quiz, boss_fight)
- Diagnostische Auswertung nach Abschluss

---

## Phasen-Mapping aus Schritt 9

Leite die Phase aus `schritt_9_ampel.spielfunktion` ab:

| spielfunktion | Spielphase | Vorlagen-Pool |
|---------------|------------|---------------|
| `vorbereitung` | KENNENLERNEN | K1–K5 |
| `uebung` | VERTIEFEN | V1–V6 |
| `sicherung` | VERTIEFEN | V1–V6 |
| `diagnose` | PRÜFEN | P1–P5 |
| `teilueberpruefung` | PRÜFEN | P1–P5 |

---

## Aufgabe: Generiere exakt 5 Spielvorschläge

Die 5 Vorschläge folgen einer festen Rangfolge:

| Rang | Typ | Auswahlregel |
|------|-----|--------------|
| 1 | `beste_didaktische_passung` | Wissensstruktur + Denkhandlung maximiert; immer aus Phasen-Pool |
| 2 | `alternative_mechanik` | Andere Game-Engine aus demselben Phasen-Pool |
| 3 | `staerker_motivierend` | Höherer Spielreiz (arcade > matching > sequencing); auch anderer Phasen-Pool erlaubt wenn didaktisch begründbar |
| 4 | `diagnostisch_stark` | Beste Eignung für Fehlvorstellungsanalyse; aus Phasen-Pool oder Prüfen |
| 5 | `differenzierung_transfer` | Höhere Komplexitätsstufe als Hauptvorschlag; aus Phasen-Pool oder nächste Phase |

### Verbote (zwingend)

- Kein Vorschlag, der das Lernziel fachlich verfälscht
- Kein Vorschlag, der eine offene Lernhandlung als vollständig regelbasiert auswertbar ausgibt
- Der Game-Skin darf die Game-Engine niemals bestimmen — Engine folgt aus Denkhandlung

### Auswahllogik je Vorschlag

Für jeden der 5 Vorschläge:

1. Bestimme Denkhandlung aus `schritt_5_wissensstruktur.denkhandlungen`
2. Bestimme Komplexitätsstufe aus `schritt_6_komplexitaet.stufe`
3. Wähle die passendste Vorlage aus dem Pool:
   - `zuordnen_klassifizieren` → K4, V1, V5
   - `erkennen_wiedergeben` → K2, K3, V3, P2, P3
   - `erklaeren_erlaeutern` → K5, V4
   - `strukturieren_darstellen` → K3, V2
   - `anwenden_uebertragen` → V1, V4, V5, P4, P5
   - `analysieren_untersuchen` → K1, V4, P4
   - `bewerten_beurteilen` → K1, K5, V5, P5
   - `produzieren_gestalten` → K5, V2, V3
4. Begründe jede Wahl mit Bezug auf Wissensform, Denkhandlung, Komplexität

### Automatische Vorschlagsauswahl (MVP)

`ausgewaehlter_vorschlag_rang` ist der Rang des Vorschlags mit:
- `mvp_ampel: "gruen"` UND
- bester didaktischer Passung (bevorzuge Rang 1, dann 2, dann 3)

Falls Rang 1 `mvp_ampel: "gelb"` oder `"rot"` hat: wähle den nächsten grünen Vorschlag.

---

## Erlaubte Spielformate

Wenn im Input `erlaubte_formate` angegeben ist (Array von Format-IDs), **dürfen ausschließlich diese Formate** in den Vorschlägen verwendet werden — weder für `game_engine` noch für `antwortformate`.

Ist `erlaubte_formate` null oder fehlt das Feld, gelten alle Formate als erlaubt.

Wähle innerhalb der Einschränkung immer noch nach didaktischer Passung.

---

## Output-Format

Antworte ausschließlich mit dem folgenden JSON-Objekt. Kein Text außerhalb.

```json
{
  "lerngegenstand_kurz": "<1-Satz-Beschreibung des Lerngegenstands>",
  "vorschlaege": [
    {
      "rang": 1,
      "typ": "beste_didaktische_passung",
      "name": "<Spielname aus den 15 Vorlagen>",
      "didaktischer_spieltyp": "<z.B. Zuordnung Begriff ↔ Definition>",
      "game_engine": "<einer der implementierten Werte: single_choice | multiple_choice | lueckentext | zuordnung | reihenfolge | hangman | space_invaders | boss_fight | sprint_quiz | escape_room>",
      "game_skin_konzept": "<z.B. Werkstatt-Band — visuelle Beschreibung>",
      "game_skin_mvp": "<unterstufe | mittelstufe | oberstufe>",
      "antwortformate": ["<game_engine-Wert>"],
      "passung_begruendung": "<warum diese Engine zur Denkhandlung und Wissensstruktur passt>",
      "mvp_ampel": "<gruen | gelb | rot>",
      "regelbasiert_auswertbar": true,
      "differenzierung_moeglichkeiten": "<konkrete Möglichkeiten — z.B. 2 Kategorien vs. 4 Kategorien>",
      "typische_fehler_fehlvorstellungen": ["<Fehlvorstellung 1>", "<Fehlvorstellung 2>"],
      "feedbacklogik": "<korrektiv | erklärend | hinweisend | kriterial | diagnostisch | richtig_falsch>",
      "spielfunktion": "<vorbereitung | uebung | sicherung | diagnose | teilueberpruefung>"
    },
    {
      "rang": 2,
      "typ": "alternative_mechanik"
    },
    {
      "rang": 3,
      "typ": "staerker_motivierend"
    },
    {
      "rang": 4,
      "typ": "diagnostisch_stark"
    },
    {
      "rang": 5,
      "typ": "differenzierung_transfer"
    }
  ],
  "ausgewaehlter_vorschlag_rang": 1,
  "auswahlbegruendung": "<warum dieser Vorschlag für MVP am besten passt>"
}
```

Alle 5 Vorschläge müssen vollständig ausgefüllt sein — exakt dieselbe Struktur wie Rang 1.

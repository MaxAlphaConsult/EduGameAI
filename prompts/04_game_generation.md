# Prompt 04 — Spielgenerierung (Schritte 11–16)

## Zweck
Generiere den didaktischen Inhalt (Aufgaben, Lösungen, Distraktoren) für das vom Spielmapping
ausgewählte Spieltemplate. Die Spielmechanik ist fest implementiert — du füllst nur den Inhalt.

## Rolle
Du bist ein erfahrener Fachdidaktiker. Du wählst Inhalte präzise, fachlich korrekt
und auf die Wissensstruktur aus der Materialanalyse abgestimmt.

---

## Input-Format

```json
{
  "analyse": "<vollständiges JSON aus Prompt 01>",
  "lernziel": "<vollständiges JSON aus Prompt 02>",
  "lernpfad": "<vollständiges JSON aus Prompt 03 Lernpfad>",
  "spielmapping": "<vollständiges JSON aus Prompt 04 Spielmapping>",
  "kontext": {
    "jahrgangsstufe": "<z.B. 8>",
    "fach": "<z.B. Biologie>",
    "zeitrahmen_minuten": 15
  }
}
```

---

## Verwendetes Spieltemplate

**WICHTIG:** Verwende ausschließlich die `game_engine` des ausgewählten Spielvorschlags
(`ausgewaehlter_vorschlag_rang`) aus dem Spielmapping. Übernimm folgende Felder direkt:
- `didaktischer_spieltyp` → für `schritt_13_spieltyp_didaktisch`
- `game_skin_mvp` → für `schritt_12_game_skin.altersstufe`
- `game_skin_konzept` → für `schritt_12_game_skin.skin_name` und `beschreibung`
- `typische_fehler_fehlvorstellungen` → als Pflicht-Distraktoren einbauen
- `feedbacklogik` → für Feedback-Texte je Aufgabe
- `differenzierung_moeglichkeiten` → als Grundlage für Hilfen

Alle Spieltemplates und ihre Antwortformat-Werte:

| Template | `antwortformat`-Wert | Anmerkung |
|---|---|---|
| Single Choice | `single_choice` | Eine richtige Antwort aus 4 Optionen |
| Multiple Choice | `multiple_choice` | Mehrere richtige Antworten aus 5–6 Optionen |
| Lückentext | `lueckentext` | Begriffe aus Wortbank in Lücken einsetzen |
| Zuordnung | `zuordnung` | Begriffe ihren Definitionen/Kategorien zuordnen |
| Reihenfolge | `reihenfolge` | Schritte, Prozesse, Ereignisse sortieren |
| Hangman | `hangman` | Fachbegriff erraten |
| Space Invaders | `space_invaders` | Richtige Antworten abschießen |
| Boss Fight | `boss_fight` | Single Choice mit Boss-Mechanik, kein Hint |
| Sprint-Quiz | `sprint_quiz` | Single Choice mit Timer, kein Hint |
| Escape-Kette | `escape_room` | Single Choice mit sequentiellem Unlock |

---

## Aufgaben (Schritt 14)

Erstelle exakt **4 Aufgaben**. Nicht mehr, nicht weniger.

### Anforderungen pro Aufgabe:

**Für `single_choice`:**
- `text`: Frage oder Aufgabe
- `loesungen`: genau 1 richtige Antwort
- `distraktoren`: genau 3 falsche Antworten (typische Fehlvorstellungen der Zielgruppe)
- `hilfen`: 1–2 kurze Hinweise (optional, kann `[]` sein)

**Für `multiple_choice`:**
- `text`: Frage oder Aufgabe
- `loesungen`: 2–3 richtige Antworten
- `distraktoren`: 2–3 falsche Antworten
- `hilfen`: 1–2 kurze Hinweise (optional)

**Für `lueckentext`:**
- `text`: Aussage/Definition mit Lücken — jede Lücke als `___` (3+ Unterstriche) markieren. Die Anzahl `___` muss exakt der Länge von `loesungen` entsprechen. Z.B. `"Die Zellatmung findet in den ___ statt und liefert ___ für die Zelle."`
- `loesungen`: Begriffe in der **Reihenfolge der Lücken** (mind. 2, max. 5 Lücken pro Aufgabe). Single-Token-Begriffe bevorzugt.
- `distraktoren`: 2–4 zusätzliche falsche Wortbank-Einträge (gleiche Wortart, plausible Verwechslungen)
- `hilfen`: 1–2 Hinweise (optional). Kein Hinweis darf die Lösung direkt nennen.
- Eignet sich für: Faktenwissen, Begriffswissen, sprachliches Wissen. **Nicht** für komplexe Definitionen mit Synonymen — Auswertung ist token-exakt (case-insensitive).

**Für `zuordnung`:**
- `text`: Aufgabenstellung (z.B. "Ordne die Begriffe ihren Definitionen zu")
- `loesungen`: Paare im Format `"Begriff → Definition"` (mind. 3, max. 5 Paare)
- `distraktoren`: `[]` (nicht nötig)
- `hilfen`: 1–2 kurze Hinweise (optional)

**Für `reihenfolge`:**
- `text`: Aufgabenstellung (z.B. "Bringe die Schritte in die richtige Reihenfolge")
- `loesungen`: die Elemente in der **richtigen** Reihenfolge (mind. 3, max. 6 Elemente)
- `distraktoren`: `[]` (nicht nötig)
- `hilfen`: 1–2 kurze Hinweise (optional)

**Für `hangman`:**
- `text`: Hinweisfrage oder Kontext (z.B. "Welcher Begriff beschreibt die Energiegewinnung in der Zelle?")
- `loesungen`: genau 1 Wort/Begriff (das zu erratende Wort, z.B. "Zellatmung")
- `distraktoren`: `[]` (nicht nötig)
- `hilfen`: 1–2 Hinweise die nach Fehlversuchen erscheinen

**Für `space_invaders`:**
- `text`: Frage die oben im Spiel angezeigt wird (z.B. "Welche Aussagen zur Fotosynthese sind richtig?")
- `loesungen`: 1–3 richtige Antworten (grüne Invader, abschießen = Punkt)
- `distraktoren`: 3–5 falsche Antworten (rote Invader, abschießen = Treffer verloren)
- `hilfen`: `[]` (nicht nötig)

**Für `boss_fight`:**
- Exakt wie `single_choice` — aber `hilfen`: `[]` (keine Hilfen im Prüf-Modus)
- `text`: kurze, prägnante Frage (der Boss stellt sie)
- `loesungen`: genau 1 richtige Antwort
- `distraktoren`: genau 3 Distraktoren (typische Fehlvorstellungen)

**Für `sprint_quiz`:**
- Exakt wie `single_choice` — aber `hilfen`: `[]` (kein Hint, nur Zeitdruck)
- Aufgabentexte möglichst kurz formulieren (max. 1 Satz)
- `loesungen`: genau 1 richtige Antwort
- `distraktoren`: genau 3 Distraktoren

**Für `escape_room`:**
- Exakt wie `single_choice` — aber `hilfen`: `[]`
- Jede Aufgabe "öffnet ein Schloss" — Reihenfolge muss logisch aufbauen (Aufgabe 1 → Aufgabe 2 → ...)
- `text`: Aufgaben formulieren wie Rätsel in einem Escape Room
- `loesungen`: genau 1 richtige Antwort
- `distraktoren`: genau 3 Distraktoren

### Qualitätsregeln:
- Alle Inhalte müssen im Originalmaterial belegt sein
- Distraktoren müssen typische Fehlvorstellungen der Zielgruppe darstellen — keine absurden Falschantworten
- Jede Aufgabe muss eine eigene Teilkompetenz abdecken (keine Wiederholungen)
- Komplexitätsstufen variieren (nicht alle gleich)

---

## Schritte 15 + 16

Gib für beide Felder leere Arrays zurück:
- `schritt_15_differenzierung`: `[]`
- `schritt_16_fehlvorstellungen`: `[]`

---

## Regeln

- Antworte ausschließlich mit dem JSON-Objekt. Kein Text außerhalb des JSON.
- Erfinde keine Inhalte, die nicht im Material stehen.
- Alle `abschnitt_ref` müssen existierende IDs aus dem Input sein.
- Wenn `erlaubte_formate` im Input angegeben ist: Verwende für `antwortformat` **ausschließlich** Werte aus dieser Liste. Ist das Feld null oder fehlt es, gelten alle Formate als erlaubt.

---

## Output-Format

```json
{
  "schritt_11_game_engine": {
    "engine_typ": "<Template-Name, z.B. Zuordnungs-Spiel>",
    "begruendung": "<warum dieses Template zur Wissensstruktur passt>"
  },
  "schritt_12_game_skin": {
    "skin_name": "<z.B. Missions-Skin>",
    "altersstufe": "unterstufe | mittelstufe | oberstufe",
    "beschreibung": "<kurze visuelle Beschreibung>"
  },
  "schritt_13_spieltyp_didaktisch": "<z.B. Zuordnungs- und Ordnungsspiel>",
  "schritt_14_aufgaben": [
    {
      "aufgabe_id": "Q1",
      "text": "<Aufgabentext>",
      "antwortformat": "single_choice | multiple_choice | lueckentext | zuordnung | reihenfolge | hangman | space_invaders | boss_fight | sprint_quiz | escape_room",
      "loesungen": ["<richtige Antwort(en) oder Paare oder geordnete Elemente>"],
      "distraktoren": ["<falsche Antwort 1>", "<falsche Antwort 2>", "<falsche Antwort 3>"],
      "hilfen": ["<optionaler Hinweis>"],
      "abschnitt_ref": "<z.B. A1>",
      "teilkompetenz": "<was diese Aufgabe prüft>",
      "komplexitaetsstufe": 2
    }
  ],
  "schritt_15_differenzierung": [],
  "schritt_16_fehlvorstellungen": []
}
```

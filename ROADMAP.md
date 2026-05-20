# EduGame AI — Produkt-Roadmap

_Stand: 2026-05-03 | Basis: Original-Roadmap + didaktische Produktlogik-Prüfung_

---

## Phase 0 — Validierung ✅ (Woche 1–2)

**Ziel: 50+ Lehrer-Anmeldungen auf der Waitlist**

- [x] Landing Page mit eingebettetem Demo-Spiel
- [x] Waitlist für Lehrer (Formspree-Integration)
- [x] Demo-Hub (5 Spieltypen, `demo.html`)
- [x] Demo-Lernstunde 3-Phasen-Flow (`demo-spiel.html`)

---

## Phase 1 — Concierge MVP (Woche 3–5)

**Ziel: Verstehen, was Lehrer wirklich brauchen — ohne viel Code**

- [ ] 5–10 Lehrer von Waitlist direkt kontaktieren
- [ ] Material von Lehrern entgegennehmen (PDF, Text)
- [ ] 21-Schritt-Analyse **manuell** mit Claude API durchführen (Prompt-Dokument nutzen)
- [ ] Ergebnis als HTML-Spiel zurückschicken + Lehrkraft-Check als PDF
- [ ] Feedback dokumentieren: Was ist gut? Was fehlt? Welche Spieltypen kommen an?
- [ ] Klarheit, welche 2–3 Spieltypen am meisten Wert liefern
- [ ] Prompt-Dokument für alle 21 Analyse-Schritte finalisieren (Grundlage für Phase 2)

> **Warum manuell:** Bevor die Pipeline automatisiert wird, muss klar sein, dass der Output gut genug ist. Schlechte Prompt-Logik wird durch Automatisierung nur schneller schlecht.

---

## Phase 2 — Core Loop (Woche 6–11)

**Ziel: Erster selbstständiger Lehrer-Durchlauf — von Datei zu spielbarem Spiel**

### Auth & Grundstruktur
- [ ] Lehrer-Auth (E-Mail + Passwort, Social Login)
- [ ] Playground / Workspace für Lehrer
- [ ] Klassen anlegen
- [ ] Schüler-Accounts generieren (Tiername + Zufallspasswort, kein echter Name)
- [ ] Schüler-Login per Link (kein Account nötig)

### Didaktischer Kern — 21-Schritt-Analyse-Pipeline ⭐
- [ ] PDF-Upload + Text-Extraktion (pdf-parse oder äquivalent)
- [ ] Analyse-Pipeline als strukturierte Claude-API-Chain (21 Schritte, JSON-Output):
  - Schritt 1–5: Fachliche Aussagen, Wissensform, Lernform, Wissensstruktur + Denkhandlung, Komplexitätsstufe
  - Schritt 6–8: Lernziel formulieren/prüfen, Spielbarkeit prüfen, MVP-Lernzielvariante erstellen (falls nötig)
  - Schritt 9–12: Antwortformat, Game-Engine, Game-Skin, Spieltyp bestimmen
  - Schritt 13–16: Aufgaben + Lösungen + Distraktoren + Differenzierung generieren
  - Schritt 17–20: Fehlvorstellungen einbauen, Feedbackbausteine, fachliche Reduktion + Korrektheit prüfen
  - Schritt 21: Sourcemapping + Lehrkraft-Check ausgeben
- [ ] Wissensformen als Datenmodell (9 Typen: Faktenwissen, Begriffswissen, konzeptuelles, prozedurales, strategisches, metakognitives, sprachliches, interpretatives, Bewertungswissen)
- [ ] Lernformen als Datenmodell (8 Typen: wiederholend, verstehend, anwendungsorientiert, entdeckend, fehlerbasiert, problemlösend, sprachproduktiv, reflexiv)
- [ ] Wissensstrukturen + Denkhandlungen als Datenmodell (12 Strukturtypen)
- [ ] Komplexitätsstufen 1–7 als Datenmodell (Reproduktion bis Produktion)

### Spielbarkeits-Ampel ⭐
- [ ] Spielbarkeits-Ampel implementieren (🟢 direkt spielbar / 🟡 reduziert / 🔴 nur vorbereitend)
- [ ] Bei 🟡 / 🔴: automatisch MVP-Lernzielvariante generieren + Begründung ausgeben
- [ ] Ampel prominent in der UI anzeigen (kein verstecktes Detail)

### Sourcemapping ⭐
- [ ] Material-Abschnitte beim Parsing durchnummerieren und referenzierbar machen
- [ ] Jede Aufgabe trägt Referenz auf Materialabschnitt
- [ ] Markierung: Inhalt aus Original / KI-ergänzt / didaktisch reduziert

### Spielgenerierung (2 Spieltypen für MVP)
- [ ] Spieltyp 1: Zuordnungsspiel / Drag & Drop (deckt Kategorien-, Ordnungs-, Begriffswissen ab)
- [ ] Spieltyp 2: Multiple Choice / Single Choice (deckt Faktenwissen, Reproduktion ab)
- [ ] Distraktoren generieren: typische Fehlvorstellungen abbilden, fachlich plausibel, diagnostisch nutzbar
- [ ] Differenzierung: leicht / mittel / schwer pro Spiel
- [ ] Regelbasierte Auswertung (kein KI-Call pro Schülerantwort)
- [ ] Feedbackbausteine: richtig / falsch / Teillösung / Fehlvorstellung benennen

### Lehrkraft-Check ⭐
- [ ] Lehrkraft-Check-UI-Komponente nach jeder Generierung:
  - Ampelstatus (🟢/🟡/🔴) prominent
  - Ursprüngliches Lernziel vs. MVP-Lernzielvariante
  - Vollständig / teilweise / nicht abgedeckte Lernzielanteile
  - Fachliche Korrektheit, Quellenrückverfolgung, regelbasierte Auswertbarkeit
  - Hinweis: Spiel ist Übung / Sicherung / Diagnose / Teilüberprüfung
- [ ] AI-Gegenprüfung: zweiter KI-Pass prüft fachliche Korrektheit des Outputs

### Auswertung (Kompaktmodus / Basic)
- [ ] Ergebnis-Screen für Schüler (motivierende Sprache, kein defizitorientiertes Vokabular)
- [ ] Datenprüfung vor Auswertung: prüfen ob genug Daten für valide Diagnose vorliegen
- [ ] Lernzielstatus pro Schülercode: erreicht / teilweise / noch nicht gesichert
- [ ] Kompetenzampel Klasse: welche Teilkompetenzen sicher / unsicher
- [ ] Häufigste Fehlvorstellungen in der Klasse (max. 3–5)
- [ ] Empfehlungen für Weiterarbeit (Plenum, Vertiefung, Erweiterung)
- [ ] Individuelle Kurzdiagnose pro Code (tabellarisch, kompakt)
- [ ] Schülergerechte Rückmeldung pro Code (kurz, motivierend, handlungsorientiert)
- [ ] Zeitregelung je Aufgabe und je Spiel (optional, konfigurierbar)

> 📐 **Prompt-Referenz:** `prompts/05_diagnosis_engine.md` (Kompaktmodus)

---

## Phase 3 — Spielerlebnis ausbauen (Woche 12–18)

**Ziel: Vollständiges Spielerlebnis für Schüler**

### Weitere Spieltypen
- [ ] Spieltyp 3: Sortierung / Reihenfolge (Prozesswissen, Timeline)
- [ ] Spieltyp 4: Space Shooter (Wissensabruf, Reaktionsspiel)
- [ ] Spieltyp 5: Memory Matrix (Begriff ↔ Definition)
- [ ] Spieltyp 6: Boss Fight (Quiz-Phase, Wissensabruf unter Druck)

### 4-Phasen-Struktur pro Modul
- [ ] Aktivierung (Vorwissen, Hypothesen, Problemfrage)
- [ ] Input (Wissen einführen, erkunden)
- [ ] Üben (Anwenden, festigen, Hilfekarten verfügbar)
- [ ] Quiz/Transfer (Abrufen, ohne Hilfe)

### Hilfekarten (3 Stufen)
- [ ] Stufe 1: kleiner Hinweis
- [ ] Stufe 2: konkreter Hinweis
- [ ] Stufe 3: fast die Antwort
- [ ] Hilfenutzung wird getrackt (fließt später in Lernstil-Analyse ein)

### Adaptives Leistungssystem
- [ ] 3 Versionen pro Modul: Basis / Standard / Erweitert
- [ ] Start: alle auf Standard → Einstufung nach erstem Quiz + Hilfenutzung
- [ ] Schüler sehen eigenes Level nicht (kein Stigma)
- [ ] Punkte level-relativ → Rangliste bleibt fair

### Antwortformat-Erweiterung
- [ ] Satzbaustein-Erklärung (geführte Erklärung statt Freitext)
- [ ] Ursache-Folge-Kette
- [ ] Pro-Contra-Sortierung
- [ ] Kriterienzuordnung
- [ ] Fehler markieren

> ⚠️ **Kein Freitext + KI-Bewertung in dieser Phase.** Offene Formate werden in geführte überführt (freie Begründung → Satzbaustein, freie Interpretation → Beleg-Zuordnung). KI-Bewertung pro Schülerantwort kommt erst in Phase 6.

### Wiederholungsmodul
- [ ] Nach Quiz: KI generiert persönliches Wiederholungsmodul für schwache Bereiche
- [ ] Basiert auf Antwortmuster-Analyse (welche Fehler, welche Distraktoren)

---

## Phase 4 — Lehrer-Power (Woche 19–24)

**Ziel: Lehrer hat volle Kontrolle über Qualität**

### KI-Assistent im Modul-Editor
- [ ] Chat-basierter Assistent im Editor
- [ ] Beispiel-Prompts: „Erkläre einfacher", „Kürze auf 30 Min"
- [ ] Lehrer kann einzelne Aufgaben neu generieren lassen
- [ ] Lehrer kann Distraktoren neu generieren lassen

### Lehrkraft-Check ausbauen (auf volle Tiefe)
- [ ] Fachliche Korrektheit, Lernzielpassung, Spielbarkeit, MVP-Tauglichkeit
- [ ] Game-Engine-Passung, Antwortanalyse, regelbasierte Auswertbarkeit
- [ ] Differenzierung, Feedbackqualität, fachliche Reduktion, Altersangemessenheit
- [ ] Sourcemapping-Vollständigkeit
- [ ] Lehrkraft kann einzelne Check-Punkte bestätigen (Checkbox-Signoff)
- [ ] Farbliche Akzentuierung: klare Hinweise wo Lehrkraft nacharbeiten sollte

### PDF-Export ⭐ (NEU)
- [ ] Lehrkraft-PDF: vollständige Diagnoseübersicht (Klasse + Individuen, nur Codes, kein Klarname)
- [ ] SuS-PDF: ein PDF pro Code mit individueller, schülergerechter Rückmeldung
- [ ] SuS-PDF enthält: Lernstand, „Das kannst du schon gut", „Das solltest du noch üben", „Dein nächster Schritt"
- [ ] SuS-PDF enthält KEINE Klassenvergleiche, Ranglisten, Ampelfarben oder Infos über andere Codes
- [ ] PDF-Ausgabe direkt speicherbar, druckbar, digital verteilbar
- [ ] DSGVO-konform: nur anonyme Codes, keine sensiblen Daten

### Zeitanpassung
- [ ] Zeitdauer pro Einheit einstellbar
- [ ] Zeitdruck alters- und schwierigkeitsabhängig anpassbar
- [ ] Zeitdruck für inklusive Settings deaktivierbar

### Schulinterner Lernplan
- [ ] Upload eines schulinternen Lernplans als optionale Datengrundlage
- [ ] Zuordnung von Material zu schulinternem Lernplan

---

## Phase 5 — Gamification & Motivation (Woche 25–28)

**Ziel: Schüler kommen freiwillig wieder**

- [ ] Tier-Avatar-System (Baby → Jugend → Erwachsen → Experte, wächst mit Fortschritt)
- [ ] Levelsystem + Abzeichen pro Modul
- [ ] Klassen-Rangliste (Tiernamen sichtbar, echte Namen nur für Lehrer)
- [ ] Ab Klasse 9/10: alternative Pseudonyme (Planeten, Persönlichkeiten — Lehrer genehmigt)
- [ ] Escape Room als Spieltyp (gut für Gamification-Phase)

---

## Phase 6 — Analytics & KI-Intelligenz (Woche 29–34)

**Ziel: Lehrer versteht jeden Schüler auf einen Blick**

### Detailmodus Diagnose (Erweiterung von Phase 2 Kompaktmodus)
- [ ] Detaillierte Kompetenzmatrix pro Code
- [ ] Hilfenutzungsanalyse (selbstständig / mit Hilfe / trotz Hilfe unsicher)
- [ ] Komplexitätsanalyse: welche Stufen wurden gemeistert?
- [ ] Fehlvorstellungsanalyse: Cluster und Häufigkeiten
- [ ] Lernpfad- und Spielverlaufsanalyse
- [ ] Förder- und Erweiterungsgruppen (Gruppe A/B/C, anonym nach Codes)
- [ ] Konkrete Unterrichtsimpulse

> 📐 **Prompt-Referenz:** `prompts/05_diagnosis_engine.md` (Detailmodus) → maps to Premium-Tier

### Analytics
- [ ] Klassen-Heatmap (was verstanden, wo hakt es)
- [ ] Antwortmuster-Analyse: Verwechslungspaare erkennen
- [ ] Unterscheidung: fachlicher Fehler / Konzentrationsfehler / Missverständnis / systematische Fehlvorstellung
- [ ] Lernstil-Analyse pro Schüler (nach 3–4 Modulen: welches Aufgabenformat nachhaltig am besten?)
- [ ] Kompetenzprofil pro Schüler (welche Wissensformen / Denkhandlungen erreicht?)
- [ ] Empfehlungen für Wiederholung, Vertiefung oder Transfer

### Interpretationsfragen mit KI-Bewertung (erst hier)
- [ ] Freitext-Antworten für Oberstufe (Philosophie, Deutsch, Geschichte, Politik)
- [ ] KI-Bewertung nach vorgegebenen Kriterien (nicht als einzig richtige Deutung)
- [ ] Lehrer kann KI-Bewertung überschreiben
- [ ] Nur als optionale Funktion, nicht als Standard

---

## Phase 7 — Monetarisierung & Wachstum (Woche 35–38)

**Ziel: Erste zahlende Kunden**

- [ ] Free-Plan mit Limits (1 Klasse, 2 Module/Monat, 5 Spieltypen, Wasserzeichen)
- [ ] Starter: 20€/Monat (3 Klassen, 10 Module, alle Spieltypen)
- [ ] Pro: 35€/Monat (unbegrenzt, + Lernstil-Analyse)
- [ ] Schule: 299€/Monat (Kollegium, Priorität-Support)
- [ ] Stripe-Integration + Upgrade-Flows
- [ ] PLG-Mechanismus: Lehrer teilt Demo-Spiel als Link → Schüler spielen ohne Login → Lehrer sieht Ergebnisse → Upgrade
- [ ] Empfehlungslogik: Lehrer empfiehlt Kollegin → Bonus-Freimonate

---

## Phase 8 — Skalierung (Woche 39+)

**Ziel: Fertiges Produkt, skalierbar**

- [ ] Restliche 14 Spieltypen (Tower Defense, Timeline Runner, Equation Balancer, Detective Room, Word Factory, Map Navigator, Virus Simulator, Debate Arena, Speed Builder, Rhythm Game, Market Sim, Code Breaker, Story Fork, Lab Simulator)
- [ ] NotebookLM Podcast-Integration
- [ ] Schul-Lizenzen + Admin-Dashboard
- [ ] API für Bildungsträger
- [ ] Stufe 2: Komplette Unterrichtsstunde als generierbare Pipeline (Aktivierung → Sicherung)
- [ ] Fachspezifische Lernschemata (POE für Biologie, EIS für Mathe, Textanalyse für Deutsch)

---

## Technischer Stack

| Bereich | Technologie |
|---|---|
| Frontend | Next.js 14 |
| Backend / DB | Supabase (EU, DSGVO-konform) |
| KI | Claude API (Sonnet 4.6 für Analyse, Haiku für Aufgabengenerierung) |
| Hosting | Vercel |
| Spiele | Canvas / WebGL, Drag & Drop API |
| Zahlung | Stripe |
| PDF-Parsing | pdf-parse oder Apache Tika |

---

## Kernprinzipien (nicht verhandelbar)

1. **Didaktik vor Gamification** — Spielmechanik folgt Lernziel, nicht umgekehrt
2. **Keine KI-Bewertung pro Schülerantwort im MVP** — regelbasierte Auswertung als Standard
3. **Transparenz für Lehrkräfte** — Spielbarkeits-Ampel und Lehrkraft-Check sind Pflicht, kein Extra
4. **Sourcemapping** — jede Aufgabe muss auf ihr Ursprungsmaterial zurückführbar sein
5. **Fachliche Korrektheit vor Vollständigkeit** — lieber 2 perfekte Spieltypen als 20 halbfertige
6. **DSGVO by Design** — keine echten Schülernamen, keine E-Mails für Minderjährige

---

---

## KI-Prompt-Architektur

Die 21-Schritt-Pipeline ist in 5 separate System-Prompt-Dateien aufgeteilt:

| Datei | Inhalt | Schritte |
|---|---|---|
| `prompts/01_material_analysis.md` | Materialanalyse → Wissensform, Lernform, Komplexität | 1–6 |
| `prompts/02_learning_objective.md` | Lernziel, Spielbarkeits-Ampel, Antwortformat | 7–10 |
| `prompts/03_game_generation.md` | Game-Engine, Skin, Aufgaben, Distraktoren, Differenzierung | 11–16 |
| `prompts/04_validation_lehrkraft_check.md` | Reduktion, Korrektheit, Sourcemapping, Lehrkraft-Check | 17–21 |
| `prompts/05_diagnosis_engine.md` | Lernstandsdiagnose, Kompakt- und Detailmodus, PDF-Export | – |

> Jeder Prompt gibt strukturiertes JSON zurück und wird sequentiell aufgerufen.
> Kompaktmodus = Basic-Tier | Detailmodus = Premium-Tier

---

_Referenz-Dateien: `EDUGAME_AI_TODO.md` (detaillierte P0–P3 Aufgaben), `prompts/` (KI-System-Prompts), `demo.html`, `demo-spiel.html`_

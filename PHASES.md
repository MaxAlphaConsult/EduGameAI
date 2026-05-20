# EduGame AI — Phasenplan

_Stand: 2026-05-20 | Basis: aktueller Code-Stand auf `claude/musing-austin-66838d`_

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Fertig |
| 🔧 | Vorhanden, muss korrigiert werden |
| ⬜ | Noch nicht gebaut |
| 🔴 | Kritisch — blockiert alles Folgende |
| 🟡 | Wichtig — bald nötig |
| 🟢 | Gut — kann warten |

---

## Phase 0 — Fundament reparieren
**Was diese Phase macht:** Das bestehende Scaffold (Next.js + Supabase + Claude) auf ein professionelles Niveau bringen, bevor irgendetwas neues gebaut wird.

### Typen & Datenmodell
- ✅ `Differenzierungsniveau` 4-stufig (`leichter | mittel | schwer | sehr_schwer`)
- ✅ `GameEngine` Enum
- ✅ `GameSkin` Enum (`unterstufe | mittelstufe | oberstufe`)
- ✅ `KLP`-Datenmodell
- ✅ `DiagnoseDetail`-Typ

### Pipeline & Laufzeit-Validierung
- ✅ Pipeline-Funktionen typisiert — kein `unknown` mehr als Rückgabe
- ✅ Zod v4 installiert
- ✅ Zod-Schemas für alle Pipeline-Schritte (`src/lib/schemas/pipeline.ts`)
- ✅ Pipeline-Output zur Laufzeit gegen Zod validiert (`callClaude` mit `safeParse`)
- ✅ Fehler-Handling: `PipelineValidationError`, `PipelineJsonError`, `PipelineApiError`

### Prompt-Dateien
- ✅ Pipeline auf 7 Prompts erweitert (Material → Lernziel → Lernpfad → Spielmapping → Spielgenerierung → Validierung → Verbesserung → Diagnose)
- ⬜ End-to-End-Test der Prompts gegen Schemas mit echtem Material (1× manuell durchlaufen lassen)

### Git & Deployment
- ✅ GitHub Repo `EduGameAI` angelegt, Remote verbunden
- ✅ Push-Workflow etabliert, Feature-Branches in Verwendung (`claude/*`)
- ✅ Branch-Strategie im `README.md` dokumentiert
- ⬜ Vercel mit GitHub Repo verbinden (Auto-Deploy bei jedem Push auf `main`)

---

## Phase 1 — MVP: Datei zu Spiel
**Was diese Phase macht:** Der Kernloop. Lehrkraft lädt Material hoch → KI analysiert didaktisch in 21 Schritten → generiert spielbares Modul → Lehrkraft prüft + gibt frei → Schüler spielen → Auswertung erscheint.

### 1.1 Datei-Upload
- ✅ Upload-Interface (Drag & Drop)
- ✅ PDF-Parsing via `unpdf` (`src/lib/pdf/extract.ts`)
- ✅ Materialabschnitte nummeriert (Grundlage Sourcemapping)
- 🔧 Unterstützte Formate: nur PDF im MVP, DOCX/TXT noch nicht
- ⬜ Fehlerbehandlung: leere/unlesbare/zu große Datei sauber abfangen

### 1.2 KI-Analyse (21 Schritte)
- ✅ Schritte 1–6: Materialanalyse (`analyzeMaterial`)
- ✅ Schritte 7–10: Lernziel + Spielbarkeits-Ampel (`determineLearningObjective`)
- ✅ Schritte 11–13: Lernpfad + Spielmapping
- ✅ Schritte 14–16: Spielgenerierung
- ✅ Schritte 17–21: Validierung & Lehrkraft-Check
- ✅ Reihenfolge erzwungen durch Pipeline-Komposition

### 1.3 Spielgenerierung
- ✅ Spielkomponenten: MultipleChoice, Zuordnung, Reihenfolge, Hangman, SpaceInvaders, SprintQuiz, BossFight, EscapeRoom
- ✅ Differenzierungsstufen je Aufgabe
- ✅ Feedbackbausteine vorab generiert (kein KI-Call pro Antwort)
- ✅ Lehrkraft wählt Spielformate + Anzahl Spiele beim Erstellen
- ⬜ Zeitregelung-UI für Lehrkraft (konfigurierbar an/aus)
- ⬜ Button "Fragen neu generieren" (Einzelaufgabe)

### 1.4 Lehrkraft-Check UI
- ✅ Check-Panel mit allen 13 Dimensionen (`LehrkraftCheckPanel`)
- ✅ Spielbarkeits-Ampel sichtbar
- ✅ Ursprüngliches Lernziel + MVP-Variante
- ✅ KI-Verbesserungsvorschläge (`improve`-Endpoint)
- ✅ Signoff-Button

### 1.5 Schüler-Session
- ✅ Schüler-Login via Code (`/api/student/lookup`)
- ✅ Spiel-Interface für alle 8 Spieltypen
- ✅ Regelbasierte Auswertung
- ✅ Lernzettel-PDF am Ende des Spiels
- ⬜ Ergebnis-Screen mit konkretem Feedback pro Aufgabe

### 1.6 Auswertung Lehrkraft
- ✅ Diagnose-API (`/api/diagnose`)
- ✅ Klassendiagnose mit Kompakt-/Detailmodus
- ⬜ UI für Klassenübersicht polishen (häufigste Fehler hervorheben)
- ⬜ Individuelle Kurzdiagnose pro Schülercode anzeigen

### 1.7 Authentifizierung
- ✅ Lehrkraft-Login via Supabase Auth (`/api/auth/callback`)
- ✅ Klassen anlegen (`/dashboard/classes`)
- ⬜ Schüler-Codes drucken/PDF-Export

---

## Phase 2 — MVP+: Qualität & Tiefe
**Was diese Phase macht:** MVP für echte Lehrkräfte benutzbar machen. Mehr Spieltypen, KLP-Abgleich, Sourcemapping im UI, bessere Auswertung, Oberstufen-Formate.

### Spieltypen erweitern
- 🟡 ⬜ `Lückentext mit Wortbank`
- 🟡 ⬜ `Fehler markieren`
- 🟡 ⬜ `Modell beschriften`
- 🟢 ⬜ `Satzbaustein-Erklärung`
- 🟢 ⬜ `Pro-Contra-Sortierung`
- 🟢 ⬜ `Ursache-Folge-Kette`
- 🟢 ⬜ Button "Distraktoren neu generieren"

### KLP-Integration (Basispaket)
- 🟡 ⬜ Bundesland / Schulform / Jahrgangsstufe / Fach auswählen
- 🟡 ⬜ Analyse prüft Material gegen KLP-Kompetenzbereiche
- 🟡 ⬜ KLP-Abdeckung in % im Lehrkraft-Check anzeigen
- 🟡 ⬜ Kompetenzbezogenes Feedback für Schüler
- 🟢 ⬜ NRW als Pilot-Bundesland vollständig modellieren

### Sourcemapping UI
- 🟡 ⬜ Klick auf Aufgabe → zeigt Originalstelle im Material
- 🟡 ⬜ Markierung: original / KI-ergänzt / didaktisch reduziert
- 🟡 ⬜ Markierung welcher Lernzielanteil nicht vollständig abgebildet wird

### Auswertung vertiefen
- 🟡 ⬜ Antwortmuster-Analyse: welcher Distraktor wie oft gewählt
- 🟡 ⬜ Differenzierung: wer hat welches Level gespielt
- 🟡 ⬜ Lernstil-Hinweis nach 3–4 Modulen
- 🟢 ⬜ Detailmodus für Lehrkraft (Kompetenzmatrix, Fehlvorstellungsanalyse)

### Oberstufe
- 🟡 ⬜ Geführte Interpretation (Beleg-Zuordnung, Deutungshypothesen)
- 🟡 ⬜ Argumentationsstruktur, Pro-Contra-Gewichtung
- 🟡 ⬜ Oberstufen-Skin: Skilltrees, Cases, Analyseoptik
- 🟡 ⬜ Fächer: Philosophie, Deutsch/Textanalyse, Geschichte, Politik

### Free-Version & Upgrade-Flow
- 🟡 ⬜ Free-Limits implementieren (1 Klasse, 2 Module/Monat, Wasserzeichen)
- 🟡 ⬜ Upgrade-Flow zu Basic / Pro / School
- 🟢 ⬜ Demo-Teilen als Growth-Mechanik (Link ohne Login spielbar)

### PDF-Export
- ✅ Lernzettel-PDF für SuS am Spielende
- 🟢 ⬜ Lehrkraft-PDF (Klassendiagnose, anonyme Codes)
- 🟢 ⬜ SuS-PDF (individuell, motivierend, 1 pro Code)

---

## Phase 3 — Stufe 2: Komplette Unterrichtsstunde
**Was diese Phase macht:** Aus Unterrichtsmaterial wird nicht nur ein Spiel, sondern eine vollständige didaktisch strukturierte Unterrichtsstunde generiert.

- 🟢 ⬜ Unterrichtsstunden-Struktur als generierbare Pipeline
  - Aktivierung (Vorwissen, Hypothesen, Problemfrage)
  - Input (interaktive Wissensvermittlung)
  - Erarbeitung (Übungen, Anwendungsaufgaben)
  - Diagnose (KI verfolgt Antwortverhalten)
  - Sicherung (individuelles Feedback, Wiederholungsmodul)
- 🟢 ⬜ Lernweg-Logik: didaktisch sinnvolle Reihenfolge der Module
- 🟢 ⬜ Fachspezifische Lernschemata wählbar:
  - Biologie: POE-Schema (Predict – Observe – Explain)
  - Mathe: EIS-Schema (Enaktiv – Ikonisch – Symbolisch)
  - Deutsch: Textanalyse-Schema
- 🟢 ⬜ Schulinternen Lernplan hochladen und als Datengrundlage verwenden
- 🟢 ⬜ Abgleich Material ↔ KLP ↔ schulinterner Lernplan

---

## Phase 4 — Skalierung & Wachstum

### Gamification
- 🟢 ⬜ Tier-Avatar: startet als Jungtier → wächst (Baby → Jugend → Erwachsen → Experte)
- 🟢 ⬜ Abzeichen pro Modul
- 🟢 ⬜ Klassen-Rangliste (Tier-Namen, keine Klarnamen)
- 🟢 ⬜ Alterspezifische Skins

### Weitere Spieltypen (aus den 20)
- 🟢 ⬜ Doodle Jump, Tower Defense
- 🟢 ⬜ Memory Matrix, Timeline Runner, Equation Balancer, Detective Room
- 🟢 ⬜ Word Factory, Map Navigator, Virus Simulator, Debate Arena
- 🟢 ⬜ Speed Builder, Rhythm Game, Market Sim, Code Breaker, Story Fork, Lab Simulator

### PLG & Monetarisierung
- 🟢 ⬜ Stripe-Integration (Abo, Upgrade, Rechnungen)
- 🟢 ⬜ Empfehlungslogik (Lehrkraft → Kollegin → Bonus)
- 🟢 ⬜ Schulträger-Plan (mehrere Schulen, Admin-Dashboard)

### Schülerprofil-Analyse (langfristig)
- 🟢 ⬜ Welches Aufgabenformat funktioniert für diesen Schüler am besten?
- 🟢 ⬜ Profilverteilung / Rollenlogik
- 🟢 ⬜ LMS-Export (Moodle, IServ) — wenn Nachfrage vorhanden

---

## Offene strategische Entscheidungen

| Frage | Status |
|-------|--------|
| Welche KLP-Datenquellen? (öffentliche API, manuelle Daten, NRW als Pilot) | ⬜ offen |
| Welches Modell für die Pipeline? (Sonnet 4.6 vs. Haiku für Kostenkontrolle) | ⬜ Sonnet 4.6 in Pipeline gesetzt — Kostencheck steht aus |
| Wie regelbasierte Auswertung technisch? (JSON-Matching, Vektor-Ähnlichkeit) | ✅ JSON-Matching im Einsatz |
| DSGVO-Schüler-Sessions: Token-Lebensdauer, Speicherort, Löschlogik | ⬜ offen |
| Lehrkraft-Check: nur informativ oder manuell bestätigbar (Signoff)? | ✅ Signoff implementiert |
| Demo-Teilen: wie Missbrauch verhindern? | ⬜ offen |
| Ab wann LMS-Export (Moodle, IServ)? P2 oder P3? | ⬜ offen |
| Wie viele Spieltypen realistisch für MVP? | ✅ 8 implementiert |

---

## Kritischer Pfad — was bis zum freigabefähigen MVP fehlt

```
1. Phase 0 abschließen          → ✅ bis auf Vercel + Prompt-E2E-Test
2. Datei-Upload + PDF-Parsing   → ✅
3. 21-Schritt-Pipeline (Zod)    → ✅
4. Spielbarkeits-Ampel          → ✅
5. 2–3 Antwortformate           → ✅ (8 vorhanden)
6. Sourcemapping-Grundstruktur  → ✅ Datenmodell, ⬜ UI
7. Lehrkraft-Check UI           → ✅
8. Schüler-Session + Auswertung → ✅ Loop läuft, UI-Politur offen
```

---

_Nächster Schritt: Vercel verbinden + Prompts E2E mit echtem Material testen → MVP-Politur in Phase 1.5/1.6._

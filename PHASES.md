# EduGame AI — Phasenplan

_Stand: 2026-05-05 | Basis: vollständige didaktische und technische Bestandsaufnahme_

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
**Was diese Phase macht:** Das bestehende Scaffold (Next.js + Supabase + Claude) auf ein professionelles Niveau bringen, bevor irgendetwas neues gebaut wird. Fehler jetzt sind später zehnmal teurer.

### Typen & Datenmodell
- 🔧 `Differenzierungsniveau` auf 4 Stufen korrigieren (`leichter | mittel | schwer | sehr_schwer`)
- ⬜ `GameEngine` Enum anlegen (welche Spielmechanik)
- ⬜ `GameSkin` Enum anlegen (welcher visuelle Stil je Altersgruppe)
- ⬜ `DiagnoseDetail`-Typ anlegen (Detailmodus der Auswertung)

### Pipeline & Laufzeit-Validierung
- 🔧 Pipeline-Funktionen typisieren — kein `unknown` mehr als Rückgabe
- ⬜ Zod installieren und Schemas für alle 5 Pipeline-Schritte definieren
- ⬜ Jeden Pipeline-Output zur Laufzeit gegen Zod-Schema validieren
- ⬜ Fehler-Handling in der Pipeline (was passiert wenn Schritt 3 von 21 fehlschlägt?)

### Prompt-Dateien prüfen
- ⬜ `01_material_analysis.md` — deckt Schritte 1–6 vollständig ab?
- ⬜ `02_learning_objective.md` — Lernziel + Spielbarkeits-Ampel korrekt?
- ⬜ `03_game_generation.md` — Engine-Skin-Trennung, Differenzierung, Distraktoren?
- ⬜ `04_validation_lehrkraft_check.md` — alle 13 Check-Dimensionen vorhanden?
- ⬜ `05_diagnosis_engine.md` — Kompakt- und Detailmodus, DSGVO-Sprache?
- ⬜ Alle 5 Prompts gegen Zod-Schemas testen (einmal manuell durchlaufen)

### Git & Deployment
- ✅ GitHub Repo `EduGameAI` angelegt
- ✅ Remote verbunden (`https://github.com/maxcraftbase/EduGameAI.git`)
- ⬜ Ersten Push auf `main` durchführen
- ⬜ Vercel mit GitHub Repo verbinden (Auto-Deploy bei jedem Push auf `main`)
- ⬜ Branch-Strategie festlegen: Features immer in eigenen Branches, nie direkt auf `main`

---

## Phase 1 — MVP: Datei zu Spiel
**Was diese Phase macht:** Das Kernprodukt. Lehrkraft lädt Unterrichtsmaterial hoch → KI analysiert es didaktisch korrekt in 21 Schritten → generiert ein spielbares Modul → Lehrkraft prüft und gibt frei → Schüler spielen → Auswertung erscheint. Kein anderes Feature ist wichtiger als dieser Loop.

### 1.1 Datei-Upload
- 🔴 ⬜ Upload-Interface bauen (Drag & Drop + Datei-Dialog)
- 🔴 ⬜ Unterstützte Formate: PDF, DOCX, TXT
- 🔴 ⬜ PDF-Parsing: Text + Seitenstruktur extrahieren
- 🔴 ⬜ Materialabschnitte automatisch nummerieren (Grundlage für Sourcemapping)
- ⬜ Fehlerbehandlung: leere Datei, nicht lesbar, zu groß

### 1.2 KI-Analyse (21 Schritte)
- 🔴 ⬜ Schritte 1–6: Materialanalyse (Kernaussagen, Wissensform, Lernform, Wissensstruktur, Denkhandlung, Komplexitätsstufe)
- 🔴 ⬜ Schritte 7–10: Lernziel formulieren + Spielbarkeits-Ampel (Grün / Gelb / Rot)
- 🔴 ⬜ Bei Gelb/Rot: MVP-Lernzielvariante transparent ausgeben
- 🔴 ⬜ Schritte 11–13: Game-Engine + Game-Skin + didaktischen Spieltyp auswählen
- 🔴 ⬜ Schritte 14–16: Aufgaben + Differenzierung + Fehlvorstellungen generieren
- 🔴 ⬜ Schritte 17–19: Fachliche Reduktion + Korrektheit prüfen
- 🔴 ⬜ Schritt 20: Sourcemapping erstellen (jede Aufgabe → Materialabschnitt)
- 🔴 ⬜ Schritt 21: Lehrkraft-Check mit Ampellogik ausgeben
- ⬜ Reihenfolge erzwingen: System darf Schritt 14 nicht erreichen ohne Schritte 1–13

### 1.3 Spielgenerierung
- 🔴 ⬜ Mindestens 2 vollständige Spieltypen für MVP:
  - `Multiple Choice` (Single + Multi)
  - `Zuordnung / Drag & Drop`
- ⬜ 3 Schwierigkeitsstufen je Spiel (leichter / mittel / schwer)
- ⬜ Feedbackbausteine vorbereitet generieren (kein KI-Call pro Schülerantwort)
- ⬜ Zeitregelung: konfigurierbar, an/aus
- ⬜ Button "Fragen neu generieren" (Einzelaufgabe)

### 1.4 Lehrkraft-Check UI
- 🔴 ⬜ Check-Panel mit farblicher Akzentuierung (alle 13 Dimensionen)
- ⬜ Spielbarkeits-Ampel sichtbar (Grün / Gelb / Rot + Erklärung)
- ⬜ Ursprüngliches Lernziel + MVP-Variante nebeneinander
- ⬜ Lernzielanteile: vollständig / teilweise / nicht abgedeckt
- ⬜ Signoff-Button (Lehrkraft bestätigt Spiel)

### 1.5 Schüler-Session
- 🔴 ⬜ Schüler-Login ohne Account: Tier-Name + Code (DSGVO-konform)
- ⬜ Spiel-Interface für Schüler (mindestens 2 Spieltypen spielbar)
- ⬜ Regelbasierte Auswertung (kein KI-Call pro Antwort)
- ⬜ Ergebnis-Screen für Schüler (was war richtig, was falsch, Feedback)

### 1.6 Auswertung Lehrkraft
- ⬜ Klassenübersicht: wie viele haben Lernziel erreicht / teilweise / nicht gesichert
- ⬜ Häufigste Fehler und Fehlvorstellungen
- ⬜ Individuelle Kurzdiagnose pro Schülercode
- ⬜ Schülergerechte Rückmeldung (motivierend, ohne Ampelfarbe)

### 1.7 Authentifizierung
- ⬜ Lehrkraft-Login (E-Mail + Passwort via Supabase Auth)
- ⬜ Klasse anlegen, Schüler-Codes generieren und drucken

---

## Phase 2 — MVP+: Qualität & Tiefe
**Was diese Phase macht:** Den MVP für echte Lehrkräfte benutzbar machen. Mehr Spieltypen, Sourcemapping im UI, bessere Auswertung, Oberstufen-Formate.

### Spieltypen erweitern
- 🟡 ⬜ `Lückentext mit Wortbank`
- 🟡 ⬜ `Reihenfolge / Sortierung`
- 🟡 ⬜ `Fehler markieren`
- 🟡 ⬜ `Modell beschriften`
- 🟢 ⬜ `Satzbaustein-Erklärung`
- 🟢 ⬜ `Pro-Contra-Sortierung`
- 🟢 ⬜ `Ursache-Folge-Kette`
- 🟢 ⬜ Button "Distraktoren neu generieren"

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
- 🟢 ⬜ Lehrkraft-PDF (Klassendiagnose, anonyme Codes)
- 🟢 ⬜ SuS-PDF (individuell, motivierend, 1 pro Code)

---

## Phase 3 — Stufe 2: Komplette Unterrichtsstunde
**Was diese Phase macht:** Aus Unterrichtsmaterial wird nicht nur ein Spiel, sondern eine vollständige didaktisch strukturierte Unterrichtsstunde generiert — mit Aktivierung, Input, Erarbeitung, Diagnose und Sicherung.

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

---

## Phase 4 — Skalierung & Wachstum
**Was diese Phase macht:** Das Produkt für den Massenmarkt fit machen — mehr Spieltypen, Gamification, Schulträger-Lizenzen, technische Skalierung.

### Gamification
- 🟢 ⬜ Tier-Avatar: startet als Jungtier → wächst (Baby → Jugend → Erwachsen → Experte)
- 🟢 ⬜ Abzeichen pro Modul
- 🟢 ⬜ Klassen-Rangliste (Tier-Namen, keine Klarnamen)
- 🟢 ⬜ Alterspezifische Skins (Unterstufe: Tiere; Oberstufe: Skilltrees)

### Weitere Spieltypen (aus den 20)
- 🟢 ⬜ Space Shooter, Doodle Jump, Boss Fight, Escape Room, Tower Defense
- 🟢 ⬜ Memory Matrix, Timeline Runner, Equation Balancer, Detective Room
- 🟢 ⬜ Word Factory, Map Navigator, Virus Simulator, Debate Arena
- 🟢 ⬜ Speed Builder, Rhythm Game, Market Sim, Code Breaker, Story Fork, Lab Simulator

### PLG & Monetarisierung
- 🟢 ⬜ Stripe-Integration (Abo, Upgrade, Rechnungen)
- 🟢 ⬜ Empfehlungslogik (Lehrkraft → Kollegin → Bonus)
- 🟢 ⬜ Schulträger-Plan (mehrere Schulen, Admin-Dashboard)

### Schülerprofil-Analyse (langfristig)
- 🟢 ⬜ Welches Aufgabenformat funktioniert für diesen Schüler am besten?
- 🟢 ⬜ Profilverteilung / Rollenlogik (Verlosung von Schülerprofilen)
- 🟢 ⬜ LMS-Export (Moodle, IServ) — wenn Nachfrage vorhanden

---

## Offene strategische Entscheidungen

Diese Punkte müssen bewusst entschieden werden, bevor die Umsetzung sinnvoll ist:

| Frage | Status |
|-------|--------|
| Welches Modell für die Pipeline? (Claude Sonnet 4.6 vs. Haiku für Kostenkontrolle) | ⬜ offen |
| Wie regelbasierte Auswertung technisch? (JSON-Matching, Vektor-Ähnlichkeit) | ⬜ offen |
| DSGVO-Schüler-Sessions: Token-Lebensdauer, Speicherort, Löschlogik | ⬜ offen |
| Lehrkraft-Check: nur informativ oder manuell bestätigbar (Signoff)? | ⬜ offen |
| Demo-Teilen: wie Missbrauch verhindern? | ⬜ offen |
| Ab wann LMS-Export (Moodle, IServ)? P2 oder P3? | ⬜ offen |
| Wie viele Spieltypen realistisch für MVP? (Empfehlung: 2–3) | ⬜ offen |

---

## Kritischer Pfad — ohne das kein MVP

```
1. Phase 0 abschließen          → Fundament ist solid
2. Datei-Upload + PDF-Parsing   → Kein Input ohne das
3. 21-Schritt-Pipeline (Zod)    → Keine didaktische Korrektheit ohne das
4. Spielbarkeits-Ampel          → Keine Transparenz ohne das
5. 2–3 Antwortformate           → Kein spielbares Spiel ohne das
6. Sourcemapping-Grundstruktur  → Kein Lehrkraft-Vertrauen ohne das
7. Lehrkraft-Check UI           → Keine Freigabe ohne das
8. Schüler-Session + Auswertung → Kein geschlossener Loop ohne das
```

---

_Nächster Schritt: Phase 0 abschließen — Typen korrigieren, Zod installieren, Prompts prüfen._

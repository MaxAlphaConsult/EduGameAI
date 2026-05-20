# EduGame AI – Produkt-TODO & Roadmap

_Erstellt: 2026-05-03 | Basis: Vollständige Bestandsaufnahme gegen fachliche und didaktische Produktlogik_

---

## Bestandsaufnahme (Stand: 2026-05-03)

| Bereich | Status | Dateien / Fundstelle |
|---|---|---|
| Landing Page / Marketing | ✅ vorhanden | `index.html` |
| Preismodell / Tiers | ✅ vorhanden | `index.html` (Free / Starter / Pro / School) |
| Demo-Spielhub (5 Spieltypen) | ✅ vorhanden | `demo.html` |
| Demo-Lernstunde (3-Phasen-Flow) | ✅ vorhanden | `demo-spiel.html` |
| 20 Spieltypen benannt | ✅ vorhanden | `index.html` (nur Namen/Beschreibungen) |
| Richtig/Falsch-Feedback in Demos | ✅ vorhanden | `demo.html`, `demo-spiel.html` |
| Ergebnis-/Auswertungsscreen (Schüler) | ✅ vorhanden | `demo.html`, `demo-spiel.html` |
| Zeitelemente in einzelnen Spielen | ✅ vorhanden | True/False in `demo.html` |
| Lückentext mit Wortbank | ✅ vorhanden | `demo-spiel.html` |
| Interaktive Zell-Diagramme (SVG) | ✅ vorhanden | `demo-spiel.html` |
| Hints / Hilfe-Toggle | ✅ vorhanden | `demo-spiel.html` |
| Adaptive Schwierigkeit (Konzept) | ✅ Konzept | `index.html` (nur erwähnt) |
| Vercel-Deployment | ✅ aktiv | `.vercel/project.json` |
| Datei-Upload (Implementierung) | ❌ fehlt | – |
| KI-Analyse des Unterrichtsmaterials | ❌ fehlt | – |
| Didaktischer 21-Schritt-Prozess | ❌ fehlt | – |
| Wissensformen-Modell | ❌ fehlt | – |
| Lernformen-Modell | ❌ fehlt | – |
| Wissensstruktur & Denkhandlungen | ❌ fehlt | – |
| Komplexitätsstufen (7-stufig) | ❌ fehlt | – |
| Lernziel-Formulierung / -Prüfung | ❌ fehlt | – |
| MVP-Lernzielvariante | ❌ fehlt | – |
| Spielbarkeits-Ampel | ❌ fehlt | – |
| Game-Engine vs. Game-Skin (Trennung) | ❌ fehlt | – |
| Distraktoren-Logik | ❌ fehlt | – |
| Typische Fehler & Fehlvorstellungen | ❌ fehlt | – |
| Antwortformate (systematische Klassifikation) | ❌ fehlt | – |
| Didaktische Spieltypen-Klassifikation | ❌ fehlt | – |
| Sourcemapping | ❌ fehlt | – |
| Lehrkraft-Check mit Ampellogik | ❌ fehlt | – |
| Schulinterner Lernplan-Upload | ❌ fehlt | – |
| Fachliche Reduktion (explizite Prüfung) | ❌ fehlt | – |
| Schülerprofil-Analyse | ❌ fehlt | – |
| Feedback-Typen (kriteriell, metakognitiv, diagnostisch) | ❌ fehlt | – |
| Backend / API | ❌ fehlt | – |
| Prompt-Logik / Generator-Logik | ❌ fehlt | – |
| Datenmodell / Datenbankschema | ❌ fehlt | – |
| Lehrer-Dashboard | ❌ fehlt | – |
| Schüler-Session ohne Account | ❌ fehlt | – |
| Zeitregelung (konfigurierbar) | ❌ fehlt | – |
| Product-Led-Growth-Mechanik | ⚠️ teilweise | `index.html` (Preisseite, aber keine Demo-Sharing-Logik) |
| Auswertung für Lehrkraft (strukturiert) | ⚠️ teilweise | Teacher Note in Demos, aber kein echtes Dashboard |

---

## P-Stufen-Legende

| Stufe | Bedeutung |
|---|---|
| **P0** | Zwingend für MVP – ohne das kein lauffähiges Produkt |
| **P1** | Wichtig direkt nach MVP / Stufe 1 |
| **P2** | Mittelfristig (Stufe 2 / Add-on) |
| **P3** | Langfristig / optional / strategisch |

---

## Abschnitt 1 – MVP / Stufe 1: Datei zu Spiel

### 1.1 Datei-Upload & Material-Eingabe

- [ ] **P0** – Upload-Interface für PDF, DOCX, TXT bauen (Drag & Drop + Datei-Dialog)
- [ ] **P0** – Datei-Parsing: Text aus PDF extrahieren (z. B. via pdf-parse oder Tika)
- [ ] **P0** – Fehlerhandling: was passiert bei nicht-lesbaren oder leeren Dateien?
- [ ] **P1** – Upload zusätzlicher Materialien (mehrere Dateien, Bilder, URLs)
- [ ] **P2** – Upload eines schulinternen Lernplans als zusätzliche Datengrundlage
- [ ] **P2** – Zuordnung von Material zu schulinternem Lernplan

### 1.2 KI-Analyse des Unterrichtsmaterials

- [ ] **P0** – Prompt-Pipeline aufbauen: Material → KI-Analyse
- [ ] **P0** – Schritt 1: Zentrale fachliche Aussagen aus Material extrahieren
- [ ] **P0** – Schritt 2: Wissensform bestimmen (aus 9 Formen – siehe Abschnitt 4)
- [ ] **P0** – Schritt 3: Lernform bestimmen (aus 8 Formen – siehe Abschnitt 5)
- [ ] **P0** – Schritt 4: Wissensstruktur und Denkhandlung gemeinsam bestimmen (12 Strukturtypen – siehe Abschnitt 6)
- [ ] **P0** – Schritt 5: Komplexitätsstufe bestimmen (7-stufige Skala – siehe Abschnitt 7)
- [ ] **P0** – Schritt 6: Lernziel formulieren oder prüfen (Inhalt + Denkhandlung + Kriterium + Antwortformat)
- [ ] **P0** – Schritt 7: Prüfen, ob Lernziel durch ein Spiel im MVP erfüllbar ist (Spielbarkeits-Check)
- [ ] **P0** – Schritt 8: Falls Lernziel nicht direkt spielbar → MVP-Lernzielvariante erstellen und Anpassung transparent ausweisen
- [ ] **P0** – Schritt 9: Antwortformat bestimmen (aus MVP-geeigneter Liste – siehe Abschnitt 10)
- [ ] **P0** – Schritt 10: Passende Game-Engine auswählen (nach didaktischer Passung, nicht Spaßfaktor)
- [ ] **P0** – Schritt 11: Passenden Game-Skin auswählen (altersgerecht)
- [ ] **P0** – Schritt 12: Didaktischen Spieltyp bestimmen (10 Typen – siehe Abschnitt 11)
- [ ] **P0** – Schritt 13: Aufgabenlogik erzeugen (Aufgaben + Lösungen + Distraktoren)
- [ ] **P0** – Schritt 14: Differenzierung erzeugen (leicht / mittel / schwer / sehr schwer)
- [ ] **P0** – Schritt 15: Typische Fehler und Fehlvorstellungen einbauen
- [ ] **P0** – Schritt 16: Feedbackbausteine erstellen (regelbasiert vorbereitet)
- [ ] **P0** – Schritt 17: Fachliche Reduktion prüfen (darf nicht fachlich falsch werden)
- [ ] **P0** – Schritt 18: Fachliche Korrektheit prüfen
- [ ] **P0** – Schritt 19: Sourcemapping erstellen (jede Aufgabe → Materialabschnitt)
- [ ] **P0** – Schritt 20: Lehrkraft-Check mit Ampellogik ausgeben

> **Technische Folgeaufgabe:** Diese 20 Schritte als sequentielle Prompt-Chain oder LLM-Pipeline implementieren. Jeder Schritt sollte sein Ergebnis als strukturiertes JSON zurückgeben, das in den nächsten Schritt eingespeist wird.

### 1.3 Spielgenerierung

- [ ] **P0** – Spielgenerierungs-Engine: aus Aufgaben/Lösungen/Distraktoren ein spielbares Modul erzeugen
- [ ] **P0** – Mindestens 1 spielbarer Spieltyp für MVP (Empfehlung: Multiple Choice / Zuordnung)
- [ ] **P0** – Differenzierung: 3 Schwierigkeitsstufen pro Spiel generieren
- [ ] **P0** – Feedbackbausteine: richtig / falsch / Teillösung / typischer Fehler
- [ ] **P1** – Button „Fragen neu generieren" (Neugenerierung einzelner Aufgaben)
- [ ] **P1** – Button „Distraktoren neu generieren"
- [ ] **P1** – Weitere Spieltypen schrittweise ergänzen (Priorität nach didaktischer Passung)

### 1.4 Auswertung und Ergebnis

- [ ] **P0** – Regelbasierte Auswertung der Schülerantworten (kein KI-Call pro Antwort im MVP)
- [ ] **P0** – Ergebnis-Screen für Schüler (Punkte, Fehler, Feedback)
- [ ] **P0** – Einfache Antwortmuster-Erkennung: welche Fehler wurden wie oft gemacht?
- [ ] **P1** – Strukturierte Auswertung für Lehrkraft (Klassenübersicht, häufigste Fehler)
- [ ] **P1** – Unterscheidung: fachlicher Fehler / Konzentrationsfehler / Fehlvorstellung / Missverständnis

### 1.5 Zeitregelung

- [ ] **P0** – Zeitregelung je Aufgabe (optional, konfigurierbar)
- [ ] **P0** – Zeitregelung je Spiel (optional)
- [ ] **P1** – Zeitbonus-Mechanik
- [ ] **P1** – Zeitdruck alters- und schwierigkeitsabhängig anpassen
- [ ] **P2** – Zeitdruck für inklusive Settings deaktivierbar

---

## Abschnitt 2 – Stufe 2 / Add-on: Komplette Unterrichtsstunde

> Hinweis: `demo-spiel.html` zeigt bereits visuell, wie eine 3-Phasen-Lernstunde aussehen könnte. Das ist ein gutes Referenzmodell. Noch nicht als generierbare Struktur vorhanden.

- [ ] **P2** – Struktur einer kompletten Unterrichtsstunde als generierbare Pipeline
  - Aktivierung / Einstieg
  - Vorwissen aktivieren
  - Hypothesen bilden
  - Problemfrage
  - Input
  - Interaktive Erarbeitung
  - Anwendung
  - Übungen
  - Transferaufgaben
  - Diagnose
  - Sicherung
  - Individuelles Feedback
  - Konkrete Lernhinweise
  - Empfehlungen für SuS
  - Auswertung für Lehrkraft
- [ ] **P2** – Lernweg-Logik: didaktisch sinnvolle Reihenfolge der Spielmodule innerhalb einer Stunde
- [ ] **P2** – Fachspezifische Lernschemata als Grundlage wählbar (z. B. POE für Biologie, EIS für Mathe, Textanalyse für Deutsch)
- [ ] **P3** – Allgemeines Lernprinzip (Aktivierung → Input → Anwendung → Diagnose → Sicherung) als Standardstruktur

---

## Abschnitt 3 – Didaktischer Kern (Prozesslogik)

> **Kritisch für MVP:** Der 21-Schritt-Analyseprozess ist das Herzstück des Systems. Derzeit fehlt er vollständig als implementierte Logik.

- [ ] **P0** – 21-Schritt-Prozess als dokumentierte Prompt-Chain definieren (als separate Datei `DIDACTIC_PIPELINE.md` oder als Systemkonstante im Backend)
- [ ] **P0** – Reihenfolge der Schritte erzwingen: System darf nicht zur Aufgabengenerierung springen, ohne Wissensform, Lernform, Denkhandlung, Lernziel und Spielbarkeit geprüft zu haben
- [ ] **P0** – Jeder Schritt gibt strukturiertes Zwischenergebnis zurück (JSON-Schema definieren)
- [ ] **P0** – Schritt 17–20 (fachliche Reduktion, Korrektheit, Sourcemapping, Lehrkraft-Check) dürfen nicht übersprungen werden

---

## Abschnitt 4 – Wissensformen

> **Fehlt vollständig** als Datenmodell und Klassifikationslogik.

Zu implementieren als Enum / Klassifikationslogik:

- [ ] **P0** – Faktenwissen
- [ ] **P0** – Begriffswissen
- [ ] **P0** – Konzeptuelles Wissen
- [ ] **P0** – Prozedurales Wissen
- [ ] **P0** – Strategisches Wissen
- [ ] **P1** – Metakognitives Wissen
- [ ] **P1** – Sprachliches Wissen
- [ ] **P1** – Interpretatives Wissen
- [ ] **P1** – Bewertungs- und Urteilswissen

> **Technische Folgeaufgabe:** Als Enum-Konstante im Backend-Datenmodell anlegen. Im Analyse-Prompt als Ausgabefeld mit Definitionen und Beispielen hinterlegen.

---

## Abschnitt 5 – Lernformen

> **Fehlt vollständig** als Klassifikation.

- [ ] **P0** – Wiederholendes Lernen
- [ ] **P0** – Verstehendes Lernen
- [ ] **P0** – Anwendungsorientiertes Lernen
- [ ] **P1** – Entdeckendes Lernen
- [ ] **P1** – Fehlerbasiertes Lernen
- [ ] **P1** – Problemlösendes Lernen
- [ ] **P2** – Sprachproduktives Lernen
- [ ] **P2** – Reflexives Lernen

> **Technische Folgeaufgabe:** Als Enum im Datenmodell. Im Analyse-Prompt als Ausgabefeld.

---

## Abschnitt 6 – Wissensstruktur und Denkhandlungen

> **Fehlt vollständig.** 12 Strukturtypen mit zugehörigen Denkhandlungen müssen als Klassifikation ins System.

- [ ] **P0** – Begriffswissen (erkennen/wiedergeben, zuordnen/klassifizieren, erklären/erläutern)
- [ ] **P0** – Kategorien- und Ordnungswissen (zuordnen/klassifizieren, strukturieren/darstellen)
- [ ] **P0** – Prozesswissen (strukturieren/darstellen, erklären/erläutern, anwenden/übertragen)
- [ ] **P0** – Ursache-Wirkungs-Wissen (erklären/erläutern, analysieren/untersuchen, anwenden/übertragen)
- [ ] **P0** – Vergleichswissen (analysieren/untersuchen, strukturieren/darstellen, bewerten/beurteilen)
- [ ] **P1** – Argumentationswissen (analysieren/untersuchen, bewerten/beurteilen, produzieren/gestalten)
- [ ] **P1** – Quellen-, Text- und Interpretationswissen (analysieren/untersuchen, erklären/erläutern, bewerten/beurteilen)
- [ ] **P0** – Regel- und Systemwissen (erkennen/wiedergeben, anwenden/übertragen, analysieren/untersuchen)
- [ ] **P0** – Prozedurales Wissen / Verfahren (strukturieren/darstellen, anwenden/übertragen, produzieren/gestalten)
- [ ] **P2** – Sprachliches Produktionswissen (produzieren/gestalten, strukturieren/darstellen, erklären/erläutern)
- [ ] **P1** – Modell- und Darstellungswissen (strukturieren/darstellen, erklären/erläutern, analysieren/untersuchen)
- [ ] **P1** – Bewertungs- und Urteilswissen (analysieren/untersuchen, bewerten/beurteilen, erklären/erläutern)

> **Technische Folgeaufgabe:** Als verschachteltes Datenmodell (Strukturtyp → Denkhandlungen) anlegen. Im Analyse-Prompt mit Definitionen und Mapping zur Spielauswahl hinterlegen.

---

## Abschnitt 7 – Komplexitätsstufen

> **Fehlt** als sauberes Modell. Landing Page erwähnt adaptive Schwierigkeit, aber ohne didaktische Grundlage.

- [ ] **P0** – Stufe 1: Reproduktion (erkennen, benennen, wiedergeben) → einfache SC/MC, Begriffe zuordnen
- [ ] **P0** – Stufe 2: Reorganisation (ordnen, zuordnen, strukturieren) → Sortierung, Zuordnung, Drag & Drop
- [ ] **P0** – Stufe 3: Verstehen und Erklären (Zusammenhänge erklären) → Lückentext, Satzbaustein, Ursache-Folge
- [ ] **P0** – Stufe 4: Anwendung und Transfer (Wissen auf neue Situationen) → Fallentscheidung, Anwendungsaufgaben
- [ ] **P1** – Stufe 5: Analyse und Problemlösen (Strukturen untersuchen, Fehler erkennen, Lösungen entwickeln)
- [ ] **P1** – Stufe 6: Bewertung und Reflexion (Kriterien anwenden, begründet urteilen, reflektieren)
- [ ] **P2** – Stufe 7: Produktion und Gestaltung (eigene fachliche Produkte erstellen)

Differenzierung innerhalb jeder Stufe:
- [ ] **P0** – „Leichter": mehr Hilfen, weniger Elemente, klarere Struktur, stärkere Führung
- [ ] **P0** – „Mittel": teilweise Hilfen, strukturierte Aufgaben
- [ ] **P0** – „Schwer": weniger Hilfen, mehr Begründung, höhere Eigenständigkeit
- [ ] **P1** – „Sehr schwer": Transfer, Fehleranalyse, Modellkritik oder Erweiterung

> **Technische Folgeaufgabe:** Komplexitätsstufe als Pflichtfeld im Aufgaben-Datenmodell. Generierungs-Prompt erhält Stufe + Differenzierungsgrad als Parameter.

---

## Abschnitt 8 – Lernziel-Logik

> **Fehlt vollständig.**

- [ ] **P0** – System generiert Lernziel aus Analyse (Inhalt + Denkhandlung + Kriterium + Antwortformat)
- [ ] **P0** – System prüft hochgeladenes Lernziel (falls Lehrkraft eines liefert) auf Vollständigkeit
- [ ] **P0** – System prüft, ob Lernziel für MVP spielbar ist (Spielbarkeits-Check)
- [ ] **P0** – Bei nicht direkt spielbarem Lernziel: MVP-Lernzielvariante generieren
- [ ] **P0** – Ursprüngliches Lernziel immer sichtbar lassen (nicht überschreiben)
- [ ] **P0** – Anpassung transparent ausweisen (was wurde geändert und warum)
- [ ] **P0** – Markieren, welche Lernzielanteile vollständig / teilweise / nicht abgedeckt werden
- [ ] **P0** – Spielbares Antwortprodukt benennen (z. B. „Kriterienzuordnung + Fallentscheidung")

---

## Abschnitt 9 – Spielbarkeits-Ampel

> **Fehlt vollständig.** Kritisch für didaktische Korrektheit und Lehrkraft-Vertrauen.

- [ ] **P0** – Spielbarkeits-Ampel implementieren:
  - 🟢 Grün: Lernziel direkt MVP-tauglich spielbar, Auswertung regelbasiert möglich
  - 🟡 Gelb: teilweise spielbar, Reduktion oder stärkere Führung nötig, Auswertung überwiegend regelbasiert
  - 🔴 Rot: im MVP nicht vollständig sinnvoll spielbar, nur als vorbereitendes oder stark reduziertes Teilspiel umsetzbar
- [ ] **P0** – Bei Gelb oder Rot: strukturierte Ausgabe generieren:
  - Ursprüngliches Lernziel
  - Problem der Spielbarkeit
  - Spielbarer Anteil
  - Nicht vollständig spielbarer Anteil
  - Angepasste MVP-Lernzielvariante
  - Begründung der Anpassung
  - Hinweis, welcher Teil nicht vollständig geprüft wird
  - Hinweis, ob Auswertung regelbasiert möglich ist
- [ ] **P0** – Spielbarkeits-Ampel als UI-Komponente im Lehrkraft-Check sichtbar machen

> **Technische Folgeaufgabe:** Spielbarkeits-Logik als Entscheidungsbaum implementieren. Eingabe: Wissensform + Lernform + Denkhandlung + Komplexitätsstufe. Ausgabe: Ampelfarbe + strukturiertes Ergebnisobjekt.

---

## Abschnitt 10 – Antwortformate und Auswertungslogik

> **Teilweise vorhanden** in Demo-HTML-Dateien, aber nicht als systematische Klassifikation oder Datenmodell.

### MVP-geeignete Formate (implementieren):
- [ ] **P0** – Single Choice
- [ ] **P0** – Multiple Choice
- [ ] **P0** – Zuordnung (Drag & Drop, Klick-Zuordnung)
- [ ] **P0** – Reihenfolge / Sortierung
- [ ] **P0** – Lückentext mit festen Begriffen (Wortbank)
- [ ] **P0** – Fehler markieren
- [ ] **P0** – Modell beschriften (bereits in Demo-SVGs sichtbar)
- [ ] **P1** – Satzbaustein-Erklärung (geführte Erklärung)
- [ ] **P1** – Einfache Fallentscheidung mit klaren Kriterien
- [ ] **P1** – Kriterienzuordnung
- [ ] **P1** – Pro-Contra-Sortierung
- [ ] **P1** – Ursache-Folge-Kette
- [ ] **P2** – Bild-Begriff-Zuordnung
- [ ] **P2** – Textstelle-Beleg-Zuordnung
- [ ] **P2** – Deutungshypothese mit vorgegebenem Beleg

### Nicht im MVP (explizit blockieren / mit Warnung versehen):
- [ ] **P0** – Systemregel definieren: freie Langantworten → im MVP in geführtes Format überführen
- [ ] **P0** – Systemregel: kein KI-Call pro Schülerantwort im Standard-MVP

### Überführungsregeln (offene → geführte Formate):
- [ ] **P1** – Freies Begründen → Satzbaustein-Begründung
- [ ] **P1** – Freies Bewerten → Fallentscheidung mit Kriterien
- [ ] **P1** – Freie Interpretation → Textstelle-Beleg-Zuordnung + Deutungshypothesen
- [ ] **P1** – Komplexe Argumentation → Pro-Contra-Sortierung
- [ ] **P1** – Freie Erklärung → Lückentext mit Fachbegriffen + Satzbaustein
- [ ] **P1** – Eigene Darstellung → Modell beschriften / Fehler im Modell markieren
- [ ] **P1** – Ursache-Wirkungs-Erklärung → Ursache-Folge-Kette
- [ ] **P1** – Offener Vergleich → Kriterienmatrix mit vorgegebenen Vergleichsmerkmalen

> **Technische Folgeaufgabe:** Antwortformat als Pflichtfeld im Aufgaben-Datenmodell. Überführungsregeln als Mapping-Tabelle im Prompt-System hinterlegen.

---

## Abschnitt 11 – Didaktische Spieltypen

> **Fehlt als Klassifikation.** Die 20 Spielnamen in `index.html` sind reine Namen ohne didaktische Einordnung.

- [ ] **P0** – Wissensabruf-Spiele (z. B. Space Shooter, Hangman) → Stufen 1–2, Faktenwissen, Begriffswissen
- [ ] **P0** – Zuordnungs- und Ordnungsspiele (z. B. Sortierband, Memory Matrix, Timeline Runner) → Stufen 2–3
- [ ] **P0** – Prozess- und Ablaufspiele (z. B. Timeline Runner, Golgi Steps) → Prozesswissen, Stufe 3
- [ ] **P1** – Erklär- und Zusammenhangsspiele → **NUR** in geführten Varianten (Satzbaustein, Lückentext, Ursache-Folge) im MVP
- [ ] **P1** – Anwendungs- und Fallspiele (z. B. Story Fork, Market Sim) → Stufe 4
- [ ] **P1** – Fehlerbasierte Spiele (z. B. „Finde den Fehler im Modell") → Stufen 4–5
- [ ] **P1** – Modell- und Darstellungsspiele (z. B. Lab Simulator, Equation Balancer) → Modell- und Darstellungswissen
- [ ] **P2** – Sprach- und Produktionsspiele → nur in stark geführter Form im MVP
- [ ] **P2** – Argumentations- und Urteilsspiele (z. B. Debate Arena) → **nur** als vorbereitende / stark geführte Variante im MVP, Pro-Contra-Sortierung
- [ ] **P2** – Reflexions- und Strategie-Spiele → MVP-Tauglichkeit immer prüfen

> **Wichtiger Hinweis für Spielentwicklung:** Argumentations-, Urteils-, Interpretations- und Reflexionsspiele müssen im MVP immer als vorbereitende, stark geführte oder teilprüfende Variante umgesetzt werden. Keine freien Antworten.

---

## Abschnitt 12 – Game-Engine vs. Game-Skin (Trennung)

> **Fehlt als explizites Systemmodell.** Derzeit sind Demos als monolithische HTML-Blöcke gebaut.

- [ ] **P0** – Game-Engine und Game-Skin sauber trennen:
  - Game-Engine = Aufgaben- und Interaktionslogik (bleibt didaktisch begründet)
  - Game-Skin = altersgerechte visuelle Oberfläche (austauschbar)
- [ ] **P0** – Skin-Auswahl nach Altersstufe:
  - Unterstufe (Kl. 1–6): Tiere, Figuren, Welten, Wachstum, Abenteuer
  - Mittelstufe (Kl. 7–10): Missionen, Level, Sammelsysteme
  - Oberstufe (Kl. 11–13): Skilltrees, Cases, Strategie-/Analyseoptik
- [ ] **P1** – Spielmechaniken jenseits Quiz:
  - Ausweichen / Links-Rechts-Entscheidung
  - Abschießen / Treffen
  - Schnell auswählen
  - Sortieren unter Zeitdruck
  - Drag & Drop
  - Fehler markieren
  - Karten ordnen
  - Skilltree-Fortschritt
  - Level-Systeme
  - Reaktionsspiele
  - Entscheidungswege
- [ ] **P0** – Spielmechanik wird nach didaktischer Passung gewählt, nicht nur nach Spaßfaktor (Systemregel dokumentieren)

---

## Abschnitt 13 – Schwierigkeit und Distraktoren

> **Fehlt als systematische Logik.**

- [ ] **P0** – Distraktoren generieren, die typische Fehlvorstellungen abbilden
- [ ] **P0** – Distraktoren müssen fachlich plausibel sein (nicht offensichtlich falsch)
- [ ] **P0** – Distraktoren dürfen keine falschen Lernspuren verstärken
- [ ] **P0** – Distraktoren sollen für Diagnose nutzbar sein (welche Fehlvorstellung steckt dahinter?)
- [ ] **P0** – Auf höheren Levels: Distraktoren dürfen nicht zu offensichtlich sein
- [ ] **P0** – Typische Fehler und Fehlvorstellungen aus dem Material extrahieren und im Spiel einbauen
- [ ] **P1** – Distraktor-Analyse: welcher Distraktor wurde wie oft gewählt → diagnostische Auswertung

---

## Abschnitt 14 – Feedbacklogik

> **Teilweise vorhanden:** `demo.html` und `demo-spiel.html` haben Richtig/Falsch-Feedback und Hint-Toggles. Komplexere Feedback-Typen fehlen.

- [ ] **P0** – Richtig/Falsch-Feedback (vorhanden, als Systemelement formalisieren)
- [ ] **P0** – Korrektives Feedback (was ist die richtige Antwort?)
- [ ] **P0** – Erklärendes Feedback (warum ist das richtig/falsch?)
- [ ] **P0** – Hinweisendes Feedback (Hint-System, bereits in Demo vorhanden → formalisieren)
- [ ] **P1** – Kriteriales Feedback (Antwort passt zu Kriterium X, nicht zu Kriterium Y)
- [ ] **P1** – Diagnostisches Feedback (welche Fehlvorstellung zeigt diese Antwort?)
- [ ] **P2** – Metakognitives Feedback (wie lernst du am besten?)
- [ ] **P2** – Adaptives Feedback (Feedback passt sich an Lernstand an)
- [ ] **P2** – Motivierendes Feedback (Gamification-Elemente)

Wichtige Systemregeln für Feedback:
- [ ] **P0** – Regel implementieren: Bei geführten Urteils-/Interpretationsaufgaben → Feedback bewertet nur Passung zu vorgegebenen Kriterien, Belegen oder Bausteinen (nicht als einzig richtige Deutung)
- [ ] **P0** – Regel implementieren: Feedback besteht im MVP aus vorbereiteten Feedbackbausteinen (kein KI-Call pro Antwort)
- [ ] **P0** – Fehler-Feedback: Fehlvorstellung benennen + kurze fachliche Erklärung

---

## Abschnitt 15 – Sourcemapping / Quellenrückverfolgung

> **Fehlt vollständig.**

- [ ] **P0** – Jede Aufgabe trägt Referenz auf Materialabschnitt (z. B. Seite, Absatz-ID, Satz-Offset)
- [ ] **P0** – Jede Lösung trägt Referenz auf Materialabschnitt
- [ ] **P0** – Jede fachliche Kernaussage trägt Referenz auf Ursprung im Originalmaterial
- [ ] **P0** – Markierung: Inhalt aus Originalmaterial (Quelle) vs. vom System ergänzt (KI-Ergänzung) vs. didaktisch reduziert
- [ ] **P1** – UI: Klick auf Aufgabe / Lösung → zeigt direkten Ursprung im Originalmaterial
- [ ] **P1** – Markierung, ob Lernzielanteile nicht vollständig abgebildet wurden
- [ ] **P1** – Markierung, ob Spiel Vorbereitung / Übung / Sicherung / Diagnose / Teilüberprüfung ist

> **Technische Folgeaufgabe:** Sourcemapping-Struktur als Datenmodell definieren: `{ aufgabe_id, material_abschnitt_ref, ursprung: "original" | "ki_ergaenzung" | "reduziert", lernzielanteil_status: "voll" | "teilweise" | "nicht" }`. Im Material-Parsing-Schritt werden Abschnitte durchnummeriert und referenzierbar gemacht.

---

## Abschnitt 16 – Lehrkraft-Check mit Ampellogik

> **Fehlt vollständig.** Demo-Dateien haben nur einen minimalen „Teacher Note"-Text.

- [ ] **P0** – Lehrkraft-Check als Pflichtausgabe nach jeder Spielgenerierung implementieren
- [ ] **P0** – Check enthält:
  - Fachliche Korrektheit (✅/⚠️/❌)
  - Lernzielpassung (✅/⚠️/❌)
  - Spielbarkeit des Lernziels (Ampel: 🟢/🟡/🔴)
  - MVP-Tauglichkeit (✅/⚠️/❌)
  - Game-Engine-Passung (✅/⚠️/❌)
  - Regelbasierte Auswertbarkeit (✅/⚠️/❌)
  - KI-Einzelprüfung der Schülerantworten vermieden (✅/⚠️/❌)
  - Differenzierung vorhanden (✅/⚠️/❌)
  - Feedbackqualität (✅/⚠️/❌)
  - Fachliche Reduktion ausgewiesen (✅/⚠️/❌)
  - Altersangemessenheit (✅/⚠️/❌)
  - Sourcemapping vorhanden (✅/⚠️/❌)
- [ ] **P0** – Check enthält immer:
  - Ursprüngliches Lernziel
  - Verwendete MVP-Lernzielvariante (falls vorhanden)
  - Spielbarkeitsstatus: 🟢 Grün / 🟡 Gelb / 🔴 Rot
  - Vollständig abgedeckte Lernzielanteile
  - Teilweise abgedeckte Lernzielanteile
  - Nicht abgedeckte Lernzielanteile
  - Begründung möglicher Anpassungen
  - Hinweis: Spiel ist Vorbereitung / Übung / Sicherung / Diagnose / Teilüberprüfung
  - Hinweis: Auswertung regelbasiert möglich (ja/nein/teilweise)
- [ ] **P0** – AI-Gegenprüfung der Inhalte: Zweiter KI-Pass prüft fachliche Korrektheit und Lernzielpassung
- [ ] **P0** – Ampellogik Spielbarkeit:
  - 🟢: Lernziel vollständig im MVP abbildbar, Auswertung regelbasiert
  - 🟡: Lernziel teilweise abbildbar, Reduktion/stärkere Führung nötig
  - 🔴: Lernziel im MVP nicht vollständig spielbar, nur vorbereitend oder stark reduziert
- [ ] **P1** – Lehrkraft-Check-UI-Komponente: farbliche Akzentuierung, klare Hinweise, wo Lehrkraft prüfen oder nacharbeiten sollte
- [ ] **P1** – Lehrkraft kann einzelne Check-Punkte bestätigen oder bearbeiten

> **Technische Folgeaufgabe:** Lehrkraft-Check als separates Datenmodell + UI-Komponente. Check wird nach Generierung als strukturiertes JSON ausgegeben und in eigenem UI-Panel dargestellt. Nicht als Fließtext.

---

## Abschnitt 18 – Fachliche Reduktion

> **Fehlt als explizite Prüflogik.**

- [ ] **P0** – Systemregel: Reduktion darf nicht fachlich falsch werden
- [ ] **P0** – Systemregel: Reduktion darf zentrale fachliche Aussagen nicht verändern
- [ ] **P0** – Systemregel: Reduktion muss altersangemessen sein
- [ ] **P0** – Reduktion muss im Sourcemapping sichtbar sein (Markierung „didaktisch reduziert")
- [ ] **P0** – Reduktion muss im Lehrkraft-Check sichtbar sein
- [ ] **P0** – Reduktion muss didaktisch begründet sein (nicht nur aus technischen/Kostengründen)
- [ ] **P0** – Falls Reduktion aus technischen/Kostengründen nötig: muss transparent ausgewiesen werden

---

## Abschnitt 19 – Schülerprofil-Analyse

> **Fehlt vollständig.** Für MVP nur als einfache Antwortmusteranalyse vorgesehen.

- [ ] **P1** – Einfache Antwortmusteranalyse: welche Fehler, wie oft, welcher Distraktor
- [ ] **P1** – Lernfortschrittsanzeige für Schüler
- [ ] **P2** – Kompetenzprofil: welche Wissensformen / Denkhandlungen wurden erreicht?
- [ ] **P2** – Empfehlungen für Wiederholung, Vertiefung oder Transfer
- [ ] **P2** – Unterscheidung: fachlicher Fehler / Konzentrationsfehler / Missverständnis / systematische Fehlvorstellung
- [ ] **P3** – Langfristig: Welches Aufgabenformat funktioniert für diesen Schüler am besten?
- [ ] **P3** – Profilverteilung / Rollenlogik für Unterrichtssettings (z. B. Verlosung von Schülerprofilen)

---

## Abschnitt 20 – Höhere Klassen / Oberstufe

> **Teilweise konzipiert** (Preisstufen und Spielnamen erwähnen keine spezifische Oberstufe). Fachspezifische Anforderungen fehlen.

- [ ] **P1** – Aufgabenformate für Oberstufe: kein simples Richtig/Falsch als Standard
- [ ] **P1** – Fächer: Philosophie, Deutsch/Textanalyse, Geschichte, Politik explizit berücksichtigen
- [ ] **P1** – Geführte Interpretation (Beleg-Zuordnung, Deutungshypothesen)
- [ ] **P1** – Kriterienentscheidung, Argumentationsstruktur, Pro-Contra-Gewichtung
- [ ] **P1** – Keine freie KI-Bewertung als Standard im MVP
- [ ] **P2** – Oberstufen-Skin: Skilltrees, Cases, Strategie-/Analyseoptik

---

## Abschnitt 21 – Product-Led-Growth & Free-Version

> **Preismodell vorhanden** in `index.html`. Technische Umsetzung fehlt. Growth-Mechanik fehlt.

- [ ] **P0** – Free-Version mit konkreten Limits implementieren:
  - 1 Klasse
  - 2 Module/Monat
  - 5 Spieltypen
  - Wasserzeichen auf generierten Spielen
  - Eingeschränkte Auswertung
  - Keine Schülerprofilanalyse
- [ ] **P0** – Upgrade-Flow auf Basic / Pro / School / Schulträger
- [ ] **P1** – Demo-Spiel-Teilen als Growth-Mechanik: Lehrkraft kann Demo-Spiel als Link teilen (ohne Login spielbar)
- [ ] **P1** – Aha-Moment für Lehrkraft optimieren: schnell und einfach von Datei zu erstem Spiel
- [ ] **P2** – Schulträger-Plan: mehrere Schulen, Admin-Dashboard
- [ ] **P2** – Empfehlungslogik: Lehrkraft empfiehlt Kollegin → Bonus-Freemonate

---

## Abschnitt 22 – Backend, API und technische Infrastruktur

> **Fehlt vollständig.** Derzeit nur statische Frontend-Demo.

- [ ] **P0** – Backend-Framework wählen und aufsetzen (Empfehlung: Next.js API Routes oder FastAPI)
- [ ] **P0** – KI-Integration: Anthropic API (Claude) oder OpenAI einbinden
- [ ] **P0** – Datei-Upload-Endpoint
- [ ] **P0** – PDF-Parsing-Service
- [ ] **P0** – Analyse-Pipeline-Endpoint (21-Schritt-Prozess)
- [ ] **P0** – Spielgenerierungs-Endpoint
- [ ] **P0** – Auswertungs-Endpoint (regelbasiert)
- [ ] **P0** – Lehrkraft-Check-Endpoint
- [ ] **P0** – Datenbank-Schema definieren und aufsetzen (Supabase empfohlen, da bereits verknüpft)
- [ ] **P0** – Authentifizierung: Lehrkraft-Login (E-Mail + Passwort, Social Login)
- [ ] **P0** – Schüler-Session ohne Login (Tier-Name + Code-System, wie in Landing Page beschrieben)
- [ ] **P1** – Sourcemapping-Datenbankstruktur
- [ ] **P1** – Antwortmuster-Speicherung für Auswertung

---

## Abschnitt 23 – Datenmodelle (Kernobjekte)

> **Fehlt vollständig.**

- [ ] **P0** – `Material` { id, datei_url, extrahierter_text, abschnitte[], fach, klasse, upload_datum }
- [ ] **P0** – `Analyse` { material_id, wissensformen[], lernformen[], wissensstrukturen[], komplexitätsstufe, lernziel_original, lernziel_mvp_variante, spielbarkeitsstatus }
- [ ] **P0** – `Spiel` { id, analyse_id, spieltyp, game_engine, game_skin, aufgaben[], differenzierungen[], zeitregelung }
- [ ] **P0** – `Aufgabe` { id, spiel_id, text, antwortformat, lösungen[], distraktoren[], fehlvorstellungen[], sourcemapping_ref, komplexitätsstufe, feedbackbausteine[] }
- [ ] **P0** – `LehrkraftCheck` { spiel_id, ampelfarbe, lernziel_original, lernziel_mvp, abgedeckte_anteile[], teilabgedeckte_anteile[], nicht_abgedeckte_anteile[], fachliche_korrektheit, quellenrückverfolgung }
- [ ] **P0** – `Schüler-Session` { id, tier_name, code, spiel_id, antworten[], ergebnis }
- [ ] **P1** – `SchulinternerLernplan` { schule_id, upload_url, zugeordnete_kompetenzen[] }

---

## Abschnitt 24 – UI-Komponenten (fehlend)

> `demo.html` und `demo-spiel.html` sind Prototypen, keine wiederverwendbaren Komponenten.

- [ ] **P0** – Upload-Komponente (Drag & Drop, Datei-Dialog, Fortschrittsanzeige)
- [ ] **P0** – Analyse-Fortschritts-Anzeige (21 Schritte sichtbar für Lehrkraft)
- [ ] **P0** – Lernziel-Karte (original + MVP-Variante + Ampel)
- [ ] **P0** – Spielbarkeitsstatus-Komponente (Ampel-Anzeige)
- [ ] **P0** – Lehrkraft-Check-Panel (strukturierter Check mit farblicher Akzentuierung)
- [ ] **P0** – Spiel-Vorschau und Release-Button
- [ ] **P0** – Ergebnis-Dashboard für Lehrkraft (Klassen-Auswertung)
- [ ] **P1** – Sourcemapping-Viewer (Klick auf Aufgabe → Materialstelle)
- [ ] **P1** – Differenzierungs-Editor (Schwierigkeitsstufen einstellen)

---

## Abschnitt 25 – Offene Fragen und Prüfpunkte

Diese Punkte müssen strategisch entschieden werden, bevor sie umgesetzt werden können:

- [ ] **Offen** – Welches AI-Modell wird für die Analyse-Pipeline verwendet? (Claude Sonnet 4.6 vs. Haiku für Kostengründe)
- [ ] **Offen** – Wie wird die regelbasierte Auswertung technisch umgesetzt? (JSON-Matching, Vektor-Ähnlichkeit für Satzbausteine?)
- [ ] **Offen** – Wie werden Schüler-Sessions ohne Login sicher und DSGVO-konform implementiert?
- [ ] **Offen** – Wie wird der Demo-Teilen-Link so gestaltet, dass er als Growth-Mechanik funktioniert, aber nicht missbraucht werden kann?
- [ ] **Offen** – Ab wann lohnt sich ein LMS-Export (Moodle, IServ)? Als P2 oder P3?
- [ ] **Offen** – Wie viele Spieltypen sind realistisch für den MVP vollständig generierbar? (Empfehlung: 2–3 für MVP, nicht 20)
- [ ] **Offen** – Soll der Lehrkraft-Check manuell bestätigbar sein (Checkbox-Signoff) oder nur informativ?

---

## Zusammenfassung: Kritische Pfade für MVP

Die folgenden Punkte sind absolut notwendig, bevor ein echter MVP lauffähig ist:

1. **Datei-Upload + PDF-Parsing** (Abschnitt 1.1) – ohne das kein Input
2. **21-Schritt-Analyse-Pipeline** (Abschnitt 3) – ohne das keine didaktische Korrektheit
3. **Wissensformen + Lernformen + Wissensstrukturen als Datenmodell** (Abschnitte 4–6) – ohne das kann keine sinnvolle Spielauswahl getroffen werden
4. **Lernziel-Logik + Spielbarkeits-Ampel** (Abschnitte 8–9) – ohne das werden falsche Erwartungen geweckt
5. **Mindestens 3 Antwortformate + regelbasierte Auswertung** (Abschnitt 10) – ohne das kein auswertbares Spiel
6. **Sourcemapping-Grundstruktur** (Abschnitt 15) – ohne das kein Lehrkraft-Vertrauen
7. **Lehrkraft-Check mit Ampellogik** (Abschnitt 16) – ohne das fehlt die zentrale Transparenz
8. **Backend + Datenmodell** (Abschnitte 22–23) – ohne das bleibt alles Demo

**Was bewusst später kommt (nicht im MVP):**
- Schülerprofil-Analyse (Abschnitt 19) – nur einfache Antwortmuster im MVP
- Komplette Unterrichtsstunde / Stufe 2 (Abschnitt 2) – erst wenn MVP stabil
- Alle 20 Spieltypen (nur 2–3 für MVP)
- Oberstufen-spezifische Formate (Abschnitt 20) – P1 nach erstem Feedback
- Schulinterner Lernplan – P2

---

_Letzte Änderung: 2026-05-03 – Erstellt auf Basis vollständiger Bestandsaufnahme gegen didaktische Produktlogik_

---
name: edugame-design
description: Verbindliche Gestaltungsregeln für die Oberflächen von EduGame AI – Lehrkraft-Bereich (Dashboard, LernFlows, Klassen), Schüler-Lernmodus (Lern-Einheiten, Checks, Player) und das Spielfenster, in dem die Spiele laufen. Verwenden, sobald eine Seite, Komponente, Farbe, Schriftgröße, ein Feedback-Zustand oder ein neues Spiel gebaut oder geändert wird.
---

# EduGame AI – Oberflächen-Design

Visuelle Referenz (Mockups aller Regeln hier): https://claude.ai/artifact/VyD3QyvbRToMx3CLPK45ic

## Das Prinzip: drei Ebenen

| Ebene | Wo | Charakter |
|---|---|---|
| **App-Oberfläche** | Lehrkraft-Bereich: `/dashboard`, `/spiele`, `/classes`, `/modules`, `/einstellungen` | ruhig, aufgeräumt, arbeitsorientiert |
| **Lernmodus** | Schüler-Player: Lern-Einheiten, Inline-Checks, Übergänge, Ergebnis | ruhig, groß, tablet-tauglich |
| **Spielfenster** | Spiele (`GameEngine` + Spielkomponenten) | eigene Themes, Effekte, Spannung – aber **innerhalb eines Fensters** der App |

Regel: Die App-Oberfläche und der Lernmodus teilen ein Farbsystem. Nur das Innere des Spielfensters darf davon abweichen. Rahmen, Navigation und „Beenden“ gehören immer zur App.

---

## Warum diese Farbwahl

Die Farben sind nicht nach Geschmack gewählt, sondern nach dem, was Lesbarkeit und Lernen am Bildschirm nachweislich unterstützt. Wer davon abweichen will, muss gegen diese Gründe argumentieren.

1. **Dunkle Schrift auf hellem Grund.** Studien zur Darstellungspolarität (u. a. Buchner & Baumgartner 2007; Piepenbrock, Mayr, Mund & Buchner 2013) zeigen: Positive Polarität wird schneller und genauer gelesen als helle Schrift auf dunklem Grund – auch bei Kindern und auf Tablets bei Tageslicht. Darum ist der Lern- und Arbeitsbereich hell, ein Dark Mode ist kein Ziel.
2. **Fast-Weiß statt Reinweiß.** `#FAF8FF` blendet bei voller Bildschirmhelligkeit weniger als `#FFFFFF`, ohne Kontrast zu kosten: Text `#1F1235` erreicht darauf 17,6:1. Der leichte Violettstich verbindet die Fläche mit der Marke.
3. **Kontrast ist gemessen, nicht geschätzt.** Jede Textfarbe erfüllt WCAG 2.1 AA (≥ 4,5:1), die meisten deutlich mehr. Das hilft allen, besonders Kindern mit Sehschwäche, an spiegelnden oder schlecht kalibrierten Schul-Tablets und bei Sonnenlicht im Klassenraum. Gleichzeitig ist WCAG die Grundlage der Barrierefreiheits-Anforderungen öffentlicher Träger (BITV), also ein Argument gegenüber Schulen.
4. **Violett als einziger Akzent.** `#7C3AED` ist kräftig genug für weiße Schrift (5,7:1), hebt sich im Ed-Tech-Umfeld vom üblichen Blau ab und bleibt für die häufigen Rot-Grün-Sehschwächen gut erkennbar. Weil es pro Bildschirm nur einen Akzent gibt, zieht er den Blick auf den nächsten Schritt (Isolationseffekt): Wenn alles bunt ist, hebt sich nichts mehr ab.
5. **Kein Rot für Schülerantworten.** Rot ist in Leistungssituationen mit Vermeidungsverhalten verknüpft (Elliot et al. 2007; die Befundlage ist gemischt, das Vorsichtsprinzip spricht trotzdem dagegen). Bernstein sagt „schau noch mal hin“ statt „versagt“ und passt zur Diagnose-Sprache des Kernmodells („noch nicht gesichert“). Rot bleibt für technische Fehler reserviert und behält so seine Warnwirkung.
6. **Farbe nie allein.** Etwa 8 % der Jungen und 0,5 % der Mädchen haben eine Farbsehschwäche – in einer Klasse mit 28 Kindern statistisch ein bis zwei. Deshalb tragen richtig/noch nicht/Status immer Symbol und Wort; Grün und Bernstein unterscheiden sich zusätzlich in Form und Text.
7. **Ruhe beim Lernen, Spannung beim Spielen.** Visuell überladene Umgebungen lenken nachweislich ab und senken den Lernerfolg (Fisher, Godwin & Seltman 2014, Klassenraum-Dekoration; „seductive details“ in der Cognitive-Load-Forschung). Darum ist der Lernmodus reizarm und Effekte leben nur im Spielfenster. Der gleichbleibende App-Rahmen um das Spiel gibt Orientierung: Kinder wissen jederzeit, wo sie im LernFlow sind und wie sie herauskommen.
8. **Ein System für Lehrkraft und Schüler.** Dieselben Farben im Dashboard und im Player machen das Produkt als Einheit erkennbar und vereinfachen Entwicklung und Pflege: weniger Sonderfälle, weniger Kontrastfehler.

Was die Forschung **nicht** hergibt: „Blau macht ruhig, Gelb kreativ“ und ähnliche Farbpsychologie ist schwach belegt. Die Begründung oben stützt sich auf Lesbarkeit, Kontrast, Barrierefreiheit und Aufmerksamkeit, nicht auf Stimmungswirkungen einzelner Farbtöne.

---

## 1. Farbsystem (App + Lernmodus)

Kontrast gemessen gegen den jeweiligen Hintergrund. Ziel: Text ≥ 4,5:1, große Schrift (≥ 24 px) ≥ 3:1.

| Token | Hex | Verwendung | Kontrast |
|---|---|---|---|
| `bg` | `#FAF8FF` | Seitenhintergrund | – |
| `surface` | `#FFFFFF` | Karten, Listen, Tabellen, Seitenleiste | – |
| `border` | `#E4DCF5` | Kartenrahmen | – |
| `divider` | `#F1ECFA` | Trennlinien in Listen | – |
| `tint` | `#F3EEFF` | aktiver Menüpunkt, Avatare, PIN-Chip | – |
| `ink` | `#1F1235` | Text, Überschriften | 17,6:1 |
| `ink-2` | `#3F3557` | Menütext, sekundäre Buttons | ~11:1 |
| `muted` | `#5B4F73` | Metazeilen, Hinweise, Labels | 7,5:1 |
| `primary` | `#7C3AED` | Primär-Button, Auswahl, Fortschritt, Fokus | 5,7:1 (weiß darauf) |
| `primary-ink` | `#5B21B6` / `#6D28D9` | Links, Text auf `tint` | ≥ 6:1 |
| `success` | `#047857` auf `#ECFDF5` | richtig, freigegeben, erledigt | 5,3:1 |
| `attention` | `#B45309` auf `#FFFBEB` (Text dunkler: `#92400E`) | „noch nicht richtig“, Lernstand-Hinweis | 4,9:1 |
| `danger` | `#B91C1C` auf `#FEF2F2` | **nur** technische Fehler (Erzeugung fehlgeschlagen, Löschen) | 5,9:1 |

**Migration:** `globals.css` nutzt noch `--background: #F6F1FF` und `--muted-foreground: #7A6A94`. `#7A6A94` erreicht auf `#F6F1FF` nur 4,4:1 und ist für Text **nicht mehr zu verwenden** → `#5B4F73`. Neue Komponenten nutzen die Werte oben; bei Berührung alter Dateien mitziehen. Ziel ist, die Tokens als CSS-Variablen in `globals.css` zu führen und keine Hex-Werte in Komponenten zu streuen.

**Verläufe:** `linear-gradient(135deg, #7C3AED, #A855F7)` nur noch für Logo-Marke und Marketing/Präsentationen, **nicht** für Buttons, Karten oder Banner in der App. Primär-Buttons sind einfarbig `#7C3AED`.

---

## 2. Schrift

Schrift ist Inter (bereits über `next/font` in `src/app/layout.tsx`). Zahlen in Tabellen/Fortschritt: `tabular-nums`. PINs/Codes: Monospace (`ui-monospace, Menlo, monospace`).

| Rolle | App (Desktop) | Lernmodus (Tablet) |
|---|---|---|
| Seitentitel | 30 px / 700 | – |
| Abschnittstitel | 18 px / 700 | – |
| Frage | – | 22 px / 600, Zeilenhöhe 30 |
| Fließtext | 15–16 px | 20 px, Zeilenhöhe 32 |
| Antwortoption | – | 19 px |
| Meta/Label | 14 px, `muted` | 16 px, `muted` |
| Kleinste Größe | **13 px** (nur Status-Pills) | **16 px** |

Keine `text-[10px]`/`text-xs`-Labels mit Opacity. Lernspalte max. **720 px** breit (≈ 65 Zeichen).

---

## 3. Komponenten

**Buttons**
- Primär: `#7C3AED`, weiße Schrift, 600, Radius 12, Höhe 48 (App-Kopf), 40 (in Listen), 60 (Lernmodus „Weiter“).
- Sekundär: weiß, Rahmen `#D9CEF0`, Text `ink-2`.
- Tertiär/Link: nur Text `#6D28D9`, 600.
- Pro Bildschirm **ein** Primär-Button: der nächste Schritt.
- Deaktiviert: `#B9A8DE` Hintergrund, kein Hover.

**Karten & Listen**: `surface`, 1 px `border`, Radius 16, kein Schatten oder höchstens `0 4px 16px rgba(31,18,53,0.06)`. Listenzeilen getrennt durch `divider`, Padding 14–18 × 20–22. Kein `hover:scale`.

**Status-Pills**: immer **Wort + Farbe**, nie Farbe allein: `Prüfen` (tint/`#5B21B6`), `Freigegeben` (success), `Lernstand` (attention), `Fehler` (danger), `Entwurf` (grau `#F3F4F6`/`#374151`). Radius 999, 13 px / 700.

**Icons**: `lucide-react`, Strichstärke 2, 18–20 px, Farbe `currentColor`. **Keine Emojis** in der App-Oberfläche oder im Lernmodus (auch nicht in Überschriften, Leerzuständen, Begrüßung).

**Navigation (Lehrkraft)**: helle Seitenleiste (`surface`, rechter Rand `border`), Menüpunkte 44 px hoch, aktiv = `tint` + `#5B21B6`. Einträge: Start, LernFlows, Klassen; Einstellungen unten.

**Leerzustände**: statt „Noch nichts da“ eine Schrittfolge mit Handlung (Klasse anlegen → LernFlow erstellen → prüfen & freigeben).

---

## 4. Feedback im Lernmodus

| Zustand | Rahmen / Fläche | Zusatz |
|---|---|---|
| neutral | 2 px `#E4DCF5` / weiß | – |
| ausgewählt | 2 px `#7C3AED` / `#F3EEFF` | – |
| richtig | 2 px `#047857` / `#ECFDF5`, Text `#064E3B` | Häkchen-Icon + Wort „Richtig“ |
| noch nicht richtig | 2 px `#B45309` / `#FFFBEB`, Text `#78350F` | Pfeil-zurück-Icon + Wort „Noch nicht“ |
| übrige nach Antwort | 2 px `#EDE7FA`, Text `muted` | – |

- **Nie Rot** für Schülerantworten. Rot ist technischen Fehlern vorbehalten.
- Feedback-Text erklärt kurz das Warum aus dem Material; ermutigend, keine Wörter wie „falsch“, „schlecht“, „versagt“ (siehe Diagnose-Sprache im didaktischen Kernmodell).
- Antwortflächen ≥ **56 px** hoch, 12 px Abstand.
- Hintergrund im Lernmodus ist `bg` ohne Effekte: keine Sterne, Partikel, Verläufe hinter Text.

---

## 5. Lehrkraft-Dashboard: Prinzipien

1. Oben steht, was **jetzt Aufmerksamkeit braucht** („Zu erledigen“: prüfen, Lernstand-Auffälligkeit, fehlgeschlagene Erzeugung), jeweils mit einer Aktion.
2. Danach **„Läuft gerade“**: pro freigegebenem LernFlow PIN, Fortschritt (fertig / dabei / nicht gestartet, in Worten und Balken), Aktion.
3. Danach kompakte Listen (zuletzt bearbeitet, Klassen). Keine Kennzahl-Kacheln ohne Handlung.
4. Freigabe-Logik: erst prüfen, dann PIN (Produktentscheidung Okt. 2026). Die Oberfläche darf nichts als „live“ zeigen, was nicht geprüft ist.
5. Nur anonyme Schülercodes anzeigen, keine Namen.

---

## 6. Das Spielfenster

Spiele dürfen anders aussehen. Sie laufen aber **in einem Fenster innerhalb der App**, nicht als komplette Übernahme des Bildschirms.

```
┌──────────────────────────────────────────────────────────┐
│ App-Leiste (Lernmodus-Farben, bg/surface)                │
│ ‹ Zurück   Fotosynthese · Baustein 5 von 8   ▓▓▓░░  Pause │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │ Spielfenster (Radius 24, overflow hidden)          │  │
│  │  Theme-Hintergrund + BackgroundEffect NUR hier     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ GameHUD (Fortschritt, XP, Streak, Leben)     │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │        Spielinhalt (eigene Mechanik/Optik)         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Der Rahmen gehört der App**
- Die App-Leiste über dem Fenster zeigt LernFlow-Titel, Baustein-Position, Gesamtfortschritt und Zurück/Pause. Sie nutzt die App-Farben (Abschnitt 1), nie das Spiel-Theme.
- Das Fenster: Abstand 16–24 px zum Rand, Radius 24, `overflow: hidden`, dezenter Rahmen. Auf dem Smartphone darf es randlos werden, die App-Leiste bleibt.
- `GameThemeProvider` und `BackgroundEffect` werden auf das Fenster begrenzt, nicht auf `min-h-screen`/`body`.
- Ergebnis-/Übergangsscreens zwischen Bausteinen (`uebergang`, `fertig`) sind Lernmodus, nicht Spiel-Theme.

**Innen ist das Spiel frei, mit diesen Grenzen**
- Farben **nur** aus `useGameTheme()` (`src/lib/game/theme.ts`), keine fest verdrahteten Hex-Werte in Spielkomponenten. Neue Themes: alle Felder von `GameTheme` füllen.
- Text ≥ 4,5:1 auch im Theme. Fragen und Antworten stehen auf einer **soliden** Fläche (`theme.surface`, bei dunklen Themes mind. 85 % deckend), nie direkt auf Effekten oder Bildern.
- Fragetext ≥ 20 px, Antwort-/Tippflächen ≥ 56 px (Tablet).
- Richtig/falsch auch im Spiel mit Symbol oder Wort, nicht nur Farbe; Fehler kosten kein Leben im Retry (bestehende Engine-Regel).
- Kein Blinken schneller als 3× pro Sekunde; `prefers-reduced-motion` respektieren (Konfetti, Partikel, Shake reduzieren).
- Emojis sind im Spielinneren erlaubt (Badges, Figuren), sofern sie nichts allein bedeuten.
- Sound (falls vorhanden) startet nie automatisch laut und ist im Rahmen stummschaltbar.

---

## 7. Nicht tun

- Verläufe auf Buttons/Karten/Bannern der App
- `hover:scale`, Glow-Schatten in der App-Oberfläche
- Emojis außerhalb des Spielfensters
- Farbe als einziges Unterscheidungsmerkmal
- `#7A6A94` als Textfarbe, Text unter 13 px (App) bzw. 16 px (Lernmodus)
- Spiel-Themes, die den ganzen Bildschirm inkl. Navigation einfärben

## 8. Checkliste vor Abschluss einer UI-Änderung

- [ ] Welche Ebene ist es (App / Lernmodus / Spielfenster)? Farben passend gewählt?
- [ ] Alle Texte ≥ 4,5:1 gegen ihren Hintergrund
- [ ] Mindestgrößen eingehalten (Schrift, Tippflächen)
- [ ] Zustände mit Wort/Symbol, nicht nur Farbe
- [ ] Höchstens ein Primär-Button pro Bildschirm
- [ ] Bei 768 px (Tablet hoch) und 390 px (Phone) geprüft, nichts läuft horizontal über
- [ ] Spiel: Rahmen und Zurück/Pause bleiben App, Theme nur im Fenster

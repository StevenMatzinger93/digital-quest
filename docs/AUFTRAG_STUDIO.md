# Auftrag: Digital Quest Studio

**Auftraggeber:** Steven Matzinger
**Repository:** `StevenMatzinger93/digital-quest`
**Branch:** `wip/studio`
**Erstellt:** 14.10.2026

---

## 1. Was gebaut wird

Ein **Schaltungssimulator als eigenständiges Werkzeug** neben dem Lernspiel —
kein Spiel, keine Kapitel, keine Coins, keine Avatare. Freies Bauen, Simulieren
und Messen.

Vorbild für den Funktionsumfang ist TINA-TI, Vorbild für Oszilloskop und
Anzeigen ist CircuitJS1 (Falstad). Beides wird **nicht** nachgebaut, sondern als
Messlatte verwendet.

### Zielbild

Die erste Fassung ist fertig, wenn Steven mit seinen Lernenden eine
**funktionierende Digitaluhr** bauen kann und es Freude macht.

Das ist kein ausgedachtes Ziel: „Digitale Uhr" ist ein Kapitel in Stevens
Lehrmittel (`Digitaltechnik zeitabhängige Vorgänge V3`, unter „Asynchrone
Zähler").

### Umfang

| Dabei | Nicht dabei |
|---|---|
| Gleichstrom | Leiterplattenentwurf |
| Zeitbereich | VHDL |
| Wechselstrom mit Bode-Diagramm | Mikrocontroller-Emulation |
| Halbleiter bis Operationsverstärker (später) | Rauschanalyse |
| Digitaltechnik bis Zähler | Monte-Carlo |
| Multimeter und Oszilloskop | Mehrsprachigkeit |

---

## 2. Entscheidungen, die bereits getroffen sind

**Diese Liste existiert, damit du nicht nachfragen musst.** Wo hier etwas steht,
gilt es. Wo etwas fehlt, entscheidest du selbst, trägst die Entscheidung in
`docs/ENTSCHEIDUNGEN_STUDIO.md` ein und arbeitest weiter.

| Frage | Entscheidung |
|---|---|
| Ort | **Eigener Einstieg im selben Repository.** Dritter Einstieg neben Portal und Labor. Teilt `engine.js`, `circuit-ui.js`, `editor.js`; eigene Oberfläche. |
| Name | **Digital Quest Studio**, Pfad `/studio` |
| Aussehen | **Entwurf vom 14.10.2026** (siehe Abschnitt 4) |
| Zugang | **Frei und offline.** Kein Konto, keine Anmeldung, keine Datenbank. Schaltungen als Datei. |
| Zähler | **Fertiges Bauteil, das sich aufklappen lässt** in Flipflops und Gatter |
| Operationsverstärker | **Später**, eigener Auftrag. Nicht in diesem Auftrag. |
| ngspice | **Nicht jetzt.** Eigener Rechenkern. Die Schnittstelle wird aber so gebaut, dass ein Wechsel später möglich ist. |
| Git | **Nur `wip/…`-Branches.** Push auf `wip/studio` erlaubt und erwünscht. **Niemals nach `main`** — jeder Push auf main deployt die Live-Seite. |
| Sprache | Deutsch, Schweizer Schreibweise. Echte Umlaute ä/ö/ü, ß wird immer zu ss. Bezeichner, IDs, CSS-Klassen bleiben ASCII. |
| Rechenkern | Eigener (`engine.js`), erweitert. Kein externer Löser. |
| .exe | Letzte Stufe, Tauri bevorzugt (kleiner als Electron) |

---

## 3. Was schon da ist — und nicht neu gebaut wird

Lies **zuerst** `CLAUDE.md` und `docs/STAND.md`. Kurzfassung:

| Datei | Was sie kann |
|---|---|
| `dev/src/engine.js` | Knotenanalyse mit Norton-Ersatz, stückweise lineare Dioden/LEDs, Logikgatter (5-V-Logik), Kondensator mit Rückwärts-Euler, Multimeter (V/A/Ω/V~ mit AVG und TRMS), Wechselspannungsquelle (Sinus/Rechteck/Dreieck), Zeitsimulation. **Kein DOM.** |
| `dev/src/circuit-ui.js` | Ansichtsneutraler Interaktionskern: Bauteil hinzufügen, bewegen, drehen, löschen, Leitung ziehen, ID-Vergabe. Wird von Editor **und** Werkbank genutzt. |
| `dev/src/editor.js` | SVG-Schaltplan-Renderer, Raster 20 px, IEC/DIN-Symbolik, Live-Anzeige. Nutzt aus der Engine nur `fmt`, `PARTS`, `LED_COLORS` — **der Löser ist bereits sauber getrennt.** |
| `dev/src/bench.js` | 2,5D-Werkbank mit Multimeter- und Oszilloskop-Fronten |
| `dev/src/visuals.js` | KV-Diagramm, Bode-Darstellung, Mini-Schaltungen |

**Bauteile in der Engine:** Batterie, Wechselspannungsquelle, Widerstand,
Kondensator, Diode, LED, Z-Diode, NPN-Transistor, Potentiometer, Motor, Lampe,
Schalter, Taster, Taktgeber, Siebensegmentanzeige, Pegelschalter, Logikanzeige,
Amperemeter.

**Flipflops gibt es bereits** (`engine.js` Zeile 53–55): `dff`, `jkff`, `tff` —
mit Pins, Dateneingängen und Schaltfunktion, Übernahme bei steigender Flanke.

**Das Oszilloskop kann bereits** drei Kanäle inklusive MATH = CH1 − CH2,
AC-Kopplung je Kanal, Uss, Mittelwert, Periode und Frequenz des gemessenen
Signals.

---

## 4. Aussehen

Die Vorlage ist der Entwurf vom 14.10.2026 (Claude-Design-Leinwand
„Digitaltechnik-Simulator Oberfläche", drei Artboards). Steven hat ihn freigegeben.

**Farben** — aus Stevens eigener „FlipFlop Lernwelt", mit abgedunkeltem Blau für
Text, weil das Original auf Weiss zu kontrastarm ist:

```
--bg:        #f6fbfc   Hintergrund
--karte:     #ffffff   Karten, Zeichenfläche
--rand:      #e2eef0   Trennlinien
--dunkel:    #0f2d3a   Text, Schaltzeichen, Menüleiste
--grau:      #5b6b73   Nebentext
--hellblau:  #4fc3f7   Akzent als Fläche
--blau-text: #0b6e94   Akzent als Text und Linie
--gut:       #22b573   Signal HIGH, Erfolg
--gut-text:  #11864f   Grün als Text
--schlecht:  #e2574c   Fehler als Fläche
--sch-text:  #b23a30   Rot als Text
```

**Schrift:** IBM Plex Sans für die Oberfläche, IBM Plex Mono für Tabellen,
Messwerte und Signalnamen — damit Nullen und Einsen untereinander stehen.
Fallback-Kette angeben. Offline-Fassung: Schriften einbetten oder auf
`system-ui`/`monospace` zurückfallen; **keine Netzabhängigkeit in der
Offline-Fassung.**

**Aufbau des Hauptfensters:**

```
┌──────────────────────────────────────────────────────┐
│ Menüleiste (dunkel)                                  │
├──────────────────────────────────────────────────────┤
│ Werkzeugleiste: Simulation · Schritt · Takt · Werkzeuge │
├──────────┬──────────────────────────┬────────────────┤
│ Bauteile │                          │ Eigenschaften  │
│ Gatter   │     Zeichenfläche        │ des gewählten  │
│ Flipflops│     (Raster)             │ Bauteils       │
│ Zähler   │                          │ + Analysetabelle│
│ Anzeigen │                          │                │
├──────────┴──────────────────────────┴────────────────┤
│ Zeitverlauf (fest, nicht als separates Fenster)      │
├──────────────────────────────────────────────────────┤
│ Statusleiste                                         │
└──────────────────────────────────────────────────────┘
```

Bei Telefonbreite stapeln sich die Spalten. Mindest-Klickfläche 44 px.
Kontrast mindestens 4,5:1 für Text.

---

## 5. Regeln der Zusammenarbeit

### Arbeitsweise

- **Stufe für Stufe.** Eine Stufe gilt nur als fertig, wenn ihr
  Abnahmekriterium nachweislich erfüllt ist. Nicht wenn der Code „fertig
  aussieht".
- **Erst der Test, dann der Code** — bei allem, was rechnet. Eine falsche
  Vorzeichenkonvention fällt sonst drei Stufen später auf.
- **Nach jeder Stufe:** `git commit`, Push auf `wip/studio`, Eintrag in
  `docs/FORTSCHRITT_STUDIO.md`.
- **Nicht fragen, sondern entscheiden und notieren.** Was Abschnitt 2 nicht
  regelt, entscheidest du; die Entscheidung kommt nach
  `docs/ENTSCHEIDUNGEN_STUDIO.md` mit einer Zeile Begründung.
- **Nach drei vergeblichen Anläufen:** in `docs/FRAGEN_STUDIO.md` notieren,
  Stufe überspringen, mit der nächsten weitermachen, die ohne sie auskommt.

### Was nie passieren darf

- **Kein Push nach `main`.** Jeder Push dorthin deployt die Live-Seite.
- **Generierte Dateien nie von Hand ändern:** `index.html` im Wurzelverzeichnis,
  `web/`, `worker/gen/`. Die kommen aus `node build.js`.
- **Bestehendes Spiel nicht beschädigen.** Änderungen an `engine.js`,
  `circuit-ui.js` und `editor.js` sind erlaubt und nötig, aber alle
  bestehenden Tests müssen danach weiterhin grün sein.
- **Keine Bauteiltypen erfinden.** Jeder neue Typ braucht ein Datenblatt in
  `dev/src/content/datasheets.js`, sonst meldet der Validator einen Fehler.
- **Jeder neue Menüpunkt** braucht einen Eintrag in
  `dev/src/wegweiser_data.js` — ebenfalls Validator-Pflicht.

### Testkette — nach jeder Stufe vollständig

```
cd dev
node test_engine.js       # Engine-Tests
node tests/kern.js        # NEU: Rechenkern gegen handgerechnete Sollwerte
node validate.js          # muss "OK — keine Fehler" melden
node build.js             # erzeugt index.html, web/, worker/gen/
node tests/smoke.js       # Browser-Durchlauf (Playwright)
node tests/tasks.js       # jede Aufgabe weiterhin lösbar
node tests/studio.js      # NEU: Browser-Durchlauf der Studio-Oberfläche
```

Einrichtung auf einer neuen Maschine:

```
cd dev
npm install
npx playwright install chromium
```

---

## 6. Die Architekturregel

**Die Netzliste ist eine dokumentierte Schnittstelle, nicht ein Zufall.**

Heute ist der Löser bereits gut getrennt: Der Editor benutzt aus der Engine nur
`fmt`, `PARTS` und `LED_COLORS`; das Rechenergebnis kommt über `setSim` von
aussen. Diese Grenze wird in Stufe 0 festgeschrieben.

Das hat zwei Gründe. Erstens: Wenn später Operationsverstärker und genauer
Frequenzgang nötig werden, kann ngspice als WebAssembly dahintergesetzt werden,
ohne Editor, Werkbank oder Inhalte anzufassen. Zweitens, und wichtiger: Eine
Schnittstelle mit eigener Testsammlung zeigt sofort, wenn der eigene Kern
irgendwo falsch rechnet.

Konkret in Stufe 0:

- `docs/SCHNITTSTELLE_RECHENKERN.md` beschreibt Netzlistenformat, Aufrufe und
  Rückgabewerte vollständig.
- `dev/tests/kern.js` ist die Konformitätsprüfung: Schaltungen mit **von Hand
  nachgerechneten** Sollwerten, Rechenweg als Kommentar. Jeder Rechenkern — der
  eigene heute, ein anderer morgen — muss sie bestehen.
- Jede neue Bauteilart der folgenden Stufen ergänzt `kern.js` um ihre Fälle.

---

## 7. Die Stufen

### Stufe 0 — Grundgerüst und Schnittstelle

Branch `wip/studio` anlegen. Neuen Einstieg aufbauen:

- `dev/studio/` als Quellordner (`index.template.html`, `studio.css`,
  `studio.js` und was sonst nötig ist), Aufbau analog zu `dev/portal/`
- `build.js` erweitern: erzeugt `web/studio/index.html` (gehostet) und
  `studio.html` im Wurzelverzeichnis (eine Datei, offline, ohne Konto)
- Der Service Worker (`web/sw.js`) nimmt `/studio/` mit auf
- Oberfläche nach Abschnitt 4, zunächst nur mit den Bauteilen, die die Engine
  heute schon kennt
- Bedienung über den bestehenden `circuit-ui.js`, Darstellung über `editor.js`

Dazu die Schnittstelle nach Abschnitt 6: `docs/SCHNITTSTELLE_RECHENKERN.md` und
`dev/tests/kern.js`.

**Abnahme**
- `node build.js` und `node validate.js` laufen durch
- `studio.html` öffnet sich ohne Netz, Bauteile lassen sich setzen, verdrahten,
  drehen und löschen
- Spannungsteiler aus Batterie und zwei Widerständen: Werte stimmen
- `node tests/kern.js` enthält mindestens zwölf Schaltungen mit handgerechneten
  Sollwerten, alle bestanden, Toleranz 1e-9 — darunter Spannungsteiler,
  Parallelschaltung, Stromquelle, unabgeglichene Wheatstone-Brücke, zwei
  Quellen in einer Masche, drei Zweige an einem Knoten
- Alle bestehenden Tests weiterhin grün

---

### Stufe 1 — Laufende Simulation und neues Oszilloskop

Die grösste sichtbare Verbesserung, und ohne Risiko für den Rechenkern.
**Steven hat Falstads Oszilloskop ausdrücklich als Vorbild genannt.**

**Laufende Simulation.** Bisher rechnet die Engine auf Anforderung. Neu läuft
eine Schleife mit fester Schrittweite und einstellbarem Zeitfaktor (Echtzeit,
Zeitlupe, Zeitraffer), gesteuert über die Werkzeugleiste: Start, Pause,
Einzelschritt, Zurücksetzen. Die Schleife läuft über `requestAnimationFrame`,
die Rechenschrittweite ist davon **entkoppelt** (fester `dt`, mehrere
Rechenschritte pro Bild, Obergrenze gegen Aufschaukeln bei langsamen Geräten).

**Oszilloskop-Fenster.** Mehrere, frei platzierbar und in der Grösse
veränderbar, jedes mit eigenen Kanälen. Ein Signal wird hinzugefügt, indem man
im Schaltplan auf einen Anschluss oder ein Bauteil klickt. Die Kurve schreibt
fortlaufend mit, solange die Simulation läuft.

**Automatische Skalierung.** Zeitbasis und Amplitude stellen sich selbst ein, zu
Hand umschaltbar. Messcursor zum Ablesen von Zeit- und Spannungsdifferenz.

Das bestehende Oszilloskop in `bench.js` bleibt unangetastet — es gehört zum
Spiel. Das neue ist eine eigene Komponente, die auch das Spiel später übernehmen
könnte.

**Abnahme**
- RC-Glied an Rechteckquelle: Lade- und Entladekurve läuft im Fenster sichtbar
  mit, ohne dass von Hand skaliert werden muss
- Zwei Oszilloskop-Fenster gleichzeitig auf verschiedenen Signalen
- Zeitfaktor umschalten ändert sichtbar die Geschwindigkeit, nicht die Kurvenform
- Messcursor liefert für das RC-Glied eine Zeitkonstante, die auf 2 % mit
  `tau = R·C` übereinstimmt
- `tests/studio.js` prüft im Browser, dass die Schleife läuft und zwei Fenster
  unabhängig arbeiten

---

### Stufe 2 — Spule

Ein Bauteil nach bekanntem Muster: Ersatzschaltung mit Rückwärts-Euler, genau wie
der Kondensator, an derselben Stelle in `engine.js`.

**Abnahme**
- RL-Glied: gemessene Zeitkonstante stimmt auf 1 % mit `tau = L/R`
- Schwingkreis aus L und C: gemessene Frequenz stimmt auf 1 % mit
  `f = 1/(2π·√(LC))`
- Beide Fälle in `tests/kern.js`
- Datenblatt-Eintrag in `datasheets.js` vorhanden (Validator)

---

### Stufe 3 — Digitalteil vervollständigen

Was Steven im Unterricht braucht und heute fehlt:

- **RS-Flipflop** und **JK-MS-Flipflop** ergänzen (D, T, JK gibt es)
- **preSet** und **preClear** an allen Flipflops, Vorrang vor dem Takt
- **Steuerungsart** je Flipflop einstellbar: taktzustandsgesteuert,
  taktflankengesteuert positiv, taktflankengesteuert negativ. Heute übernimmt
  alles bei steigender Flanke.
- **Gatter prüfen und vervollständigen:** UND, ODER, NICHT, NAND, NOR, XOR,
  XNOR, jeweils mit einstellbarer Eingangszahl
- Schaltzeichen nach IEC/DIN, Takteingang mit Dreieck, negative Flanke mit Kreis

**Abnahme**
- Je Flipflop-Typ ein Test über alle Eingangskombinationen gegen die Tabelle aus
  Stevens Lehrmittel, in `tests/kern.js`
- preSet und preClear setzen den Ausgang unabhängig vom Takt
- Ein JK mit negativer Flanke verhält sich im Zeitverlauf spiegelbildlich zu
  einem mit positiver Flanke — als automatischer Vergleichstest
- Alle Gatter mit Wahrheitstabelle geprüft

---

### Stufe 4 — Zähler

Zähler als **fertige Bauteile, die sich aufklappen lassen**. Didaktisch ist das
der Kern: erst die Funktion, dann der Aufbau.

- Asynchroner Dualzähler
- Synchroner Dualzähler
- Synchroner Dezimalzähler (BCD)
- Johnson-Zähler
- Modulo-n-Zähler mit einstellbarem n
- BCD-zu-Siebensegment-Dekoder

**Aufklappen:** Doppelklick ersetzt den Kasten auf der Zeichenfläche durch seine
innere Schaltung aus Flipflops und Gattern, verdrahtet und an derselben Stelle.
Der umgekehrte Weg muss nicht gehen.

**Abnahme**
- BCD-Zähler zählt 0 bis 9 und springt auf 0
- Modulo-n mit n = 6 zählt 0 bis 5
- **Automatischer Vergleichstest:** Ein aufgeklappter asynchroner Zähler liefert
  über 64 Takte exakt dieselbe Ausgangsfolge wie der Kasten
- Datenblätter für alle neuen Typen

---

### Stufe 5 — Zeitverlaufsdiagramm und Bauteil-Inspektor

**Zeitverlaufsdiagramm** als feste Leiste unten im Fenster (nicht als Oszilloskop-
Fenster): digitale Signale untereinander, zeitlich ausgerichtet, dazu eine Zeile
mit dem Zählerstand als Zahl. Signale per Klick hinzufügen und umordnen.

**Bauteil-Inspektor** rechts, nach dem Entwurf:
- Funktion und Schaltzeichen
- **Analysetabelle** (Wahrheitstabelle), aktive Zeile hervorgehoben
- **Ansteuertabelle** mit Don't-Care als X
- **Zustandsfolgediagramm**

Die Begriffe stammen aus Stevens Lehrmittel und seiner „FlipFlop Lernwelt" —
sie werden genau so verwendet.

**Abnahme**
- Zeitverlauf zeigt für den asynchronen Zähler Takt, Q1, Q2, Q3 und den
  Zählerstand, zeitlich korrekt ausgerichtet
- Die Laufzeit des asynchronen Zählers ist im Diagramm sichtbar: die Flanken
  der höheren Stufen kommen später
- Inspektor zeigt für das JK-Flipflop Analyse- und Ansteuertabelle, die aktive
  Zeile ist hervorgehoben

---

### Stufe 6 — Digitaluhr: die Abnahme des Zielbilds

Die vollständige Schaltung als mitgeliefertes Beispiel: Taktgenerator 1 Hz,
Sekundenzähler (Einer 0–9, Zehner 0–5), BCD-Dekoder, zwei
Siebensegmentanzeigen. Erweiterbar auf Minuten.

**Abnahme**
- Die Uhr läuft und zählt sichtbar in Echtzeit
- Die Zehnerstelle springt nach 59 auf 00
- Als Beispieldatei mitgeliefert und über ein Menü „Beispiele" ladbar
- **Stevens Prüfung:** Er baut sie in unter fünfzehn Minuten aus der
  Bauteilleiste nach

---

### Stufe 7 — Wechselstromanalyse

Komplexe Knotenanalyse um den Arbeitspunkt, als **eigener Rechenweg** neben
Gleichstrom und Zeitbereich — dieselbe Netzliste, anderer Löser.

Darstellung als Bode-Diagramm: Verstärkung in dB und Phase in Grad über der
Frequenz, logarithmische Achse.

**Abnahme**
- RC-Tiefpass: −3 dB bei `fg = 1/(2π·R·C)` auf 1 % genau, Abfall 20 dB pro
  Dekade, Phase −45° bei `fg`
- RLC-Schwingkreis: Resonanzfrequenz und Güte stimmen mit der Rechnung
- Beide in `tests/kern.js`

---

### Stufe 8 — Speichern, Laden, Beispiele

- Eigenes Dateiformat (JSON, versioniert, lesbar)
- Speichern und Laden über Datei, Ziehen und Ablegen
- Export des Schaltplans als PNG und SVG
- Beispielsammlung: Digitaluhr, RC-Glied, Schwingkreis, Zähler, Logikschaltungen

**Abnahme**
- Speichern, Laden, Vergleich: identische Schaltung
- Eine 2025 gespeicherte Datei lässt sich nach einer Formatänderung noch öffnen
  (Versionsfeld wird ausgewertet)
- Funktioniert in der Offline-Fassung ohne Server

---

### Stufe 9 — Windows-Programm

`studio.html` als `.exe` verpacken. **Tauri bevorzugt** (wenige MB gegenüber
etwa 150 MB bei Electron). Falls die Rust-Werkzeugkette auf Laptop 3 Probleme
macht, Electron als Rückfallweg, und das in `ENTSCHEIDUNGEN_STUDIO.md` vermerken.

**Abnahme**
- Startet unter Windows ohne Installation und ohne Netz
- Schaltungen lassen sich öffnen und speichern
- Grösse und Startzeit in `FORTSCHRITT_STUDIO.md` notiert

---

## 8. Was Steven prüfen muss

Diese Dinge kann kein Test ersetzen — bitte in `FORTSCHRITT_STUDIO.md` jeweils
ausdrücklich zur Prüfung anmelden:

- **Nach Stufe 1:** Fühlt sich das Oszilloskop besser an als Falstads?
- **Nach Stufe 3:** Stimmen die Flipflop-Tabellen mit dem Lehrmittel überein?
- **Nach Stufe 5:** Sind Analyse- und Ansteuertabelle so, wie er sie unterrichtet?
- **Nach Stufe 6:** Die Digitaluhr in unter fünfzehn Minuten nachbauen.
- **Laufend:** Fachbegriffe. Steven unterrichtet das — wo ein Begriff schief ist,
  merkt er es sofort.

---

## 9. Reihenfolge und Begründung

Stufe 0 bis 6 bilden eine Kette auf das Zielbild zu; jede Stufe baut auf der
vorigen auf. Stufe 1 steht so weit vorn, weil ohne brauchbares Oszilloskop gar
nicht zu beurteilen ist, ob der Zeitbereich stimmt — und weil es die
Verbesserung ist, die Steven am deutlichsten sieht.

Stufe 7 bis 9 sind unabhängig voneinander und können in jeder Reihenfolge
kommen.

Der Operationsverstärker ist bewusst nicht dabei. Er verlangt echte
nichtlineare Modelle und damit Newton-Raphson im Löser. Das wird ein eigener
Auftrag, und dann wird mit Messdaten entschieden, ob der eigene Kern erweitert
oder ngspice dahintergesetzt wird. Deshalb die Schnittstelle aus Abschnitt 6.

# Fortschritt – Digital Quest Studio

Branch `wip/studio` (nie `main`). Auftrag: `docs/AUFTRAG_STUDIO.md`. Entscheidungen: `docs/ENTSCHEIDUNGEN_STUDIO.md`. Schnittstelle des Rechenkerns: `docs/SCHNITTSTELLE_RECHENKERN.md`.
Offene Fragen (`docs/FRAGEN_STUDIO.md`): keine, keine Stufe musste übersprungen werden.

Testkette nach jeder Stufe (`cd dev`): `node test_engine.js` · `node tests/kern.js` · `node validate.js` · `node build.js` · `node tests/smoke.js` · `node tests/tasks.js` · `node tests/studio.js` (Filter: `--stufe=0 … 6`)

| Stufe | Stand | Nachweis |
|---|---|---|
| 0 Grundgerüst und Schnittstelle | **fertig** | `studio.html` öffnet ohne Netz (Test zählt Netzzugriffe: 0), Bauteile setzen/verdrahten/drehen/löschen, Spannungsteiler stimmt; `tests/kern.js` hat 16 Gleichstrom- und Zeitbereichsfälle mit handgerechneten Sollwerten (Toleranz 1e-9 relativ), darunter Teiler, Parallelschaltung, Stromquelle, unabgeglichene Wheatstone-Brücke, zwei Quellen in einer Masche, drei Zweige an einem Knoten |
| 1 Laufende Simulation, Oszilloskop | **fertig** | feste Schrittweite aus dem Aufbau, Zeitfaktor Auto/Zeitlupe/Zeitraffer; zwei Oszilloskop-Fenster unabhängig; Auto-Zeitbasis und Auto-Amplitude; Messcursor: «τ bestimmen» liefert R·C = 1 ms auf 2 % (`tests/studio.js`) |
| 2 Spule | **fertig** | RL: τ = L/R auf 1 % (gemessen bei 63,2 %), Rückwärts-Euler-Folge auf 1e-9; Schwingkreis f = 1/(2π√(LC)) auf 1 %; Datenblatt vorhanden; alles in `tests/kern.js` |
| 3 Digitalteil | **fertig** | RS- und JK-MS-Flipflop, preSet/preClear mit Vorrang, Steuerungsart je Flipflop (↑ ↓ Taktzustand), Gatter mit 2 … 8 Eingängen; Tabellen für alle Typen, Spiegelbild-Vergleich JK ↓ gegen ↑ in `tests/kern.js` (54 Fälle) |
| 4 Zähler | **fertig** | asynchron, synchron, BCD, Johnson, Modulo-n (n einstellbar), Doppelklick klappt auf; aufgeklappt = Kasten über 64 Takte für 11 Varianten (`tests/studio.js`); BCD 0 … 9, Modulo 6 0 … 5 in `tests/kern.js` |
| 5 Zeitverlauf und Inspektor | **fertig** | feste Leiste mit Pegelzeilen und Zählerstand-Zeilen, Laufzeit je Stufe 20 ns messbar im Diagramm (Q1 +20 ns, Q2 +40 ns, Q3 +60 ns nach der Taktflanke); Inspektor mit Analyse-, Ansteuertabelle (X) und Zustandsfolgediagramm |
| 6 Digitaluhr | **fertig** | Beispiel im Menü «Beispiele»; zählt in Echtzeit, 59 → 00 geprüft, zwei Minuten ohne ungültige Anzeige |

Grösse `studio.html`: rund 240 KB (eine Datei, ohne Schrift- oder Netzabhängigkeit).

## Zur Prüfung durch Steven angemeldet

**Nach Stufe 1 – Oszilloskop:** Fühlt sich das Oszilloskop besser an als Falstads? Bedienung: Werkzeug «Messen», Anschluss anklicken; Fenster an der Titelleiste ziehen, an der Ecke vergrössern; «↔ Cursor» hält die Anzeige an; «τ bestimmen» setzt die Cursor selbst. Beispiel «RC-Glied» zeigt es sofort.

**Nach Stufe 3 – Flipflop-Tabellen:** Stimmen Analyse- und Ansteuertabellen mit dem Lehrmittel überein? Die Tabellen sind Standardtabellen (D, T, JK, RS, JK-MS), berechnet aus den Engine-Definitionen. Beim Vergleichen besonders prüfen:
- preSet (PS) und preClear (PC) sind hier **aktiv bei 1** (nicht bei 0 wie bei manchen TTL-Bausteinen); **beide gleichzeitig = unzulässiger Zustand** (seit Nacht-Paket 1: Q und Q̄ beide 1, rot markiert, im Klartext erklärt).
- RS-Flipflop: Standard taktzustandsgesteuert (übernimmt solange C = 1); S = R = 1 gibt eine Störung und der Zustand bleibt.
- JK-MS: Master nimmt J/K bei C = 1 auf (mit «1s-Catching»), Ausgang wechselt bei C 1 → 0.
- XOR und XNOR mit mehr als zwei Eingängen: ungerade bzw. gerade Zahl von Einsen (Parität).

**Nach Stufe 5 – Analyse- und Ansteuertabelle, Zustandsfolgediagramm:** Sind sie so, wie Steven sie unterrichtet? Die Ansteuertabelle für Zähler ist für **JK-Flipflops** gerechnet (J und K je Bit mit X). Falls das Lehrmittel T- oder D-Flipflops zeigt, ist das eine kleine Änderung in `dev/studio/inspector.js`.

**Nach Stufe 6 – Digitaluhr:** Die Uhr in unter fünfzehn Minuten aus der Bauteilleiste nachbauen. Stückliste: 1 Taktgeber (1 Hz), Dezimalzähler (BCD), Modulo-n-Zähler (n = 6, Taktflanke fallend), 2 BCD-7-Segment-Decoder, 2 Siebensegmentanzeigen, 1 Masse; 24 Leitungen (Takt → Einer; Q3 des Einers → Zehner; Q0 … Q3 → A … D, Zehner Q0 … Q2 → A … C, D an Masse; je sieben Segmente). Der Test baut sie nicht per Hand nach – die Zeit kann nur Steven messen.

**Laufend – Fachbegriffe:** Taktzustandssteuerung, Taktflankensteuerung, preSet/preClear, Analysetabelle, Ansteuertabelle, Zustandsfolgediagramm, Zählerstand. Wo ein Begriff schief ist: Texte in `dev/studio/inspector.js` (FUNKTION), `dev/studio/studio.js` (Beschriftungen), Datenblätter in `dev/src/content/datasheets.js`.

## Bekannte Grenzen (bewusst)

- Gatter haben keine Laufzeit; nur Flipflops und Zähler (`tpd`, Standard 20 ns). Die Laufzeit gilt in der Zeitsimulation, im Arbeitspunkt (Schalter umlegen im Stillstand) wirken Flipflops sofort.
- Quellen werden zum Beginn des Rechenschritts ausgewertet (Eigenschaft der Engine seit dem Spiel); bei dt = τ/100 ist das 1 % Verschiebung der Flanke.
- Die Zeichenfläche misst 2400 × 1500; Zoom und Verschieben wie im Labor.

---

# Zusammenfassung Nachtauftrag (14./15.10.2026)

Branch `wip/studio`, nichts nach `main`. Testkette zum Schluss: `test_engine` 174 ok · `tests/kern.js` 57 Schaltungen / 782 Prüfwerte · `validate.js` 0 Fehler · `tests/studio.js` 181 Prüfungen · `tests/smoke.js` und `tests/tasks.js` (341 Durchläufe) grün auf einer Momentaufnahme des Standes.
Smoke- und Aufgabentest liefen wegen ihrer Dauer (rund 15 Minuten) auf Momentaufnahmen nach Paket 1, 4, 7 und 11, nicht nach jedem Paket einzeln; der Stand nach Paket 11 enthält alle früheren Änderungen. **Die Pakete sind in zwei Commits zusammengefasst, nicht je Paket einzeln.**

## Pakete

| Paket | Stand |
|---|---|
| 1a preSet/preClear zugleich | **fertig** (unzulässiger Zustand, beide Ausgänge 1, markiert, Klartext; Test über alle Kombinationen je Flipflop-Typ) |
| 1b Laufzeit sichtbar | **fertig** (Zoom bis 1 ns/Div, «Laufzeit überhöht» ×10³, ×10⁶, ×10⁷, rot gekennzeichnet). **Einschränkung:** bei 1 Hz und ×10⁶ liegen die Stufen nur 2 Bildpunkte auseinander (Bild 10 s auf 1000 Punkte), «ohne Zoom erkennbar» ist knapp erfüllt; ×10⁷ (20 Punkte) ist deutlich |
| 2 Wechselstromanalyse (Stufe 7) | **fertig** (RC-Tiefpass −3 dB, −20 dB je Dekade, −45° auf 1 %; RLC Resonanz 1 %, Güte 1 %; Bode-Fenster) |
| 3 Editorgrundlagen | **fertig** (Rückgängig 200 Schritte, byteweise geprüft über 50 Zufallsschritte; Zwischenspeichern mit Wiederherstellung; Tastatur) |
| 4 Schieberegler | **fertig** (Zeitkonstante folgt dem Regler auf 2 %) |
| 5 Stufe 8 und Export | **fertig** (Dateien mit Formatversion, ältere Formate, SVG/PNG, Druck-PDF A4, Stückliste; SVG mit strengem XML-Parser geprüft) |
| 6 Robustheit und Leistung | **fertig** (misst, ein echter Fehler behoben) |
| 7 Überlastung sichtbar | **fertig** |
| 8 Wahrheitstabelle und KV | **fertig** (13 bekannte Schaltungen, Minimalform gegen unabhängige Berechnung) |
| 9 Ausdruck ⇄ Schaltung | **fertig** (16 Gleichungen inkl. De Morgan, Hin- und Rückweg über die Wahrheitstabelle) |
| 10 Beamer-Modus | **fertig** (benannt wie im Portal) |
| 11 Aufgabe stellen | **fertig, zur Prüfung durch Steven angemeldet** |
| 12 Bedienungsanleitung | **fertig** (`docs/ANLEITUNG_STUDIO.md`) |

Kein Paket wurde übersprungen, `docs/FRAGEN_STUDIO.md` gibt es nicht.

## Robustheitslauf (`docs/ROBUSTHEIT_STUDIO.md`)

2 553 Durchläufe mit Startzahl 20261015 und 2 553 mit Startzahl 7, je 28 gezielt pathologische Fälle: **keine Ausnahme, keine NaN oder Unendlich, `Gleichungssystem nicht lösbar` trat nie auf.** Gefunden und behoben: Schwingende Schaltungen (kein stabiler Zustand) machten einzelne Bilder über 130 ms lang. Offen: Die Engine selbst bleibt bei Schwingungen bei bis zu 400 Iterationen je Schritt (betrifft das Spiel; dort nichts geändert); schwebende Teile und offene Eingänge bleiben ohne Meldung.

## Leistung (`docs/LEISTUNG_STUDIO.md`)

**Flüssig bis etwa 50 Bauteile:** reine Logik bis 50, reine Analogschaltung bis 100, gemischt bis 25 (Chromium ohne Grafikkarte; mit «U-Werte» halbiert sich die Grenze). Gemessen wurde nicht auf Telefon und Tablet.

## Was Steven prüfen muss

- **Paket 1a:** Stimmt die Darstellung des unzulässigen Zustands (beide Ausgänge 1, rot «verboten», Hinweiskasten) mit dem, was er im Unterricht zeigt?
- **Paket 1b:** Reicht ×10⁶ (siehe Einschränkung), oder soll ×10⁷ der Standardvorschlag sein?
- **Paket 8/9:** Stimmt die Schreibweise auf dem Bildschirm (Überstreichung, « v », Klammern wie `e1 ( e2 v e3 )`) mit dem Lehrmittel? Texte in `dev/studio/bool.js` (`fmtHtml`).
- **Paket 10:** Beamer-Modus an einem echten Beamer ansehen (F9).
- **Paket 11, der wichtigste Punkt:** passt der Ablauf zu seinem Unterricht? Zwei Dateien (Aufgabe, Lösung); die verborgenen Werte sind **verschleiert, nicht verschlüsselt**; Eingabe der Werte mit 5 % Toleranz im Aufgabenfenster; Störungsarten Leitung unterbrechen, falscher Wert, vertauschte Anschlüsse.
- **Paket 12:** Anleitung gegenlesen, besonders Fachbegriffe.
- Weiter offen aus dem ersten Auftrag: Digitaluhr in unter 15 Minuten nachbauen, Flipflop-Tabellen gegen das Lehrmittel.

## Entscheidungen, die ich selbst getroffen habe

Alle in `docs/ENTSCHEIDUNGEN_STUDIO.md` unter «Nacht 14./15.10.2026». Die wichtigsten: «Beamer» statt «Vorführ-Modus» (der Vorführ-Modus des Spiels ist eine automatische Messvorführung); `maxIter` 150 und Zeitbudget je Schritt in der Studio-Schleife; XOR-Verschleierung der verborgenen Werte statt Verschlüsselung; keine Zwischenspeicherung während einer Aufgabe; Ausdrucksminimierung über `DQVisuals.minimize` aus dem Spiel; Zugabe ×10⁷ bei der Laufzeit-Überhöhung.

## Bekannte Schwächen

- Die Testkette `tests/studio.js` hat zeitabhängige Stellen (Doppelklick-Erkennung, Neuzeichnen bei laufender Simulation); ich habe Wiederholungen und Wartezeiten eingebaut und den Lauf mehrfach wiederholt, ein seltenes Flackern kann nicht ausgeschlossen werden.
- Zeichnet die Bildschleife schwere Schaltungen, kann ein Bild bis rund 100 ms dauern (ein Rechenschritt ist nicht unterbrechbar).


# Auftrag «Freier bauen und zeichnen» (`docs/AUFTRAG_BAUEN.md`, 15.10.2026)

| Paket | Stand |
|---|---|
| 1 Knotenpunkte | **fertig** – Bauteil `node` (Studio), Leitung auf Leitung (Klick, Wegziehen, Alt + Klick, Rechtsklick), Vorschaupunkt, Verschieben, Löschen mit Zusammenführen, Rückgängig und Datei ohne Zutun; Test `tests/studio.js --stufe=g` (25 Prüfungen) |
| 2 Anzeigen auffindbar | **fertig** – Kontextmenü, Hinweise in leeren Anzeigen, «Alle digitalen Signale aufnehmen», Knöpfe im Eigenschaftenfeld, Zeitverlauf klappt auf, Überlappend / Untereinander im Oszilloskop und im Zeitverlauf; Test `--stufe=h` (35 Prüfungen) |

| 3 Beispiel für jedes Bauteil | **fertig** (Textelement siehe unten) – 41 Beispiele in sechs Gruppen wie die Bauteilleiste (`studio/beispiele.js`, `examples.js`), Vorführung, Hinweis oben; Test `--stufe=i` |
| 4 Gitternetz | **fertig** – aus / Punkte / Linien, Rasterweite 10 / 20 / 40 / 100, Taste G, Beamer und Druck ohne, Export auf Wunsch, bleibt gespeichert; `studio/ansicht.js`; Test `--stufe=j` |

| 6 Text, Linien, Rahmen, Farbe | **fertig, vor Paket 5 gebaut** (Paket 5 baut laut Auftrag darauf auf) – fünf Elementarten in eigener Ebene (`studio/zeichnen.js`), Griffe, Palette und freie Farbe, Vorne/Hinten, Ein-/Ausblenden, Export, Druck, Datei, Rückgängig; die Beispiele nutzen es für ihren erklärenden Satz; Test `--stufe=k` |

| 5 Zeichnungsrahmen und A4-Druck | **fertig** (nach Paket 6) – Rahmen A4 hoch/quer, A3 quer in wirklicher Grösse mit Massstab, Schriftfeld, Bauteile ausserhalb markiert und nicht im Druck; Druckdialog nach Anhang A.1; mehrseitig: Schaltung, Wahrheitstabelle, Ausdruck (Tabelle, KV, ausgeklammert), KV-Diagramm mit Gruppen, Oszilloskop, Zeitverlauf, Stückliste; Fassung Lösung und Aufgabe; Export mit Rahmen; `studio/blatt.js`, `studio/druck.js`; Test `--stufe=l` (45 Prüfungen, darunter echtes PDF mit `page.pdf`) |

**Fund beim Bauen von Paket 2:** Die Statusleiste verdeckte den **gesamten Zeitverlauf**. Die ausgeblendete Schieberegler-Leiste (Nachtpaket 4) ist ein Gitterkind, das nicht angezeigt wird; dadurch rutschten Hauptfenster, Zeitverlauf und Statusleiste um eine Gitterzeile nach oben und der Zeitverlauf lag bei 1440 × 900 unter der Statusleiste (Bildschirmzeilen 864–1094). Das erklärt Stevens Eindruck, der Zeitverlauf gehe nicht. Behoben mit festen Gitterzeilen (`studio.css`). Die Browser-Tests hatten das nicht bemerkt, weil sie die Leiste nur per Skript ansprachen; Paket 2 klickt jetzt wirklich auf `#tlAuto`.

**Leitungsführung (Folge von Paket 3):** Beim Bauen der Beispiele fiel auf, dass der Editor Leitungen zwischen zwei Spalten (z. B. Zähler → Dekoder, zwei Eingänge desselben Gatters) auf dieselbe senkrechte Bahn legte. Wer das Bild sieht, kann nicht mehr erkennen, was verbunden ist. Im Studio versetzt der Editor jetzt Leitungen **verschiedener Netze** seitlich (in Schritten von 8 Einheiten), wenn sie sonst auf einem Stück übereinander oder aneinanderstossend liefen; die zuerst gezeichnete bleibt, und es werden mehrere Reihenfolgen probiert. Ein Test (`Editor.routeClashes`) verlangt bei jedem der 41 Beispiele null Überschneidungen. Im Spiel ändert sich nichts.

**Fund:** Nach «Aufgabe stellen → Schliessen» stand unter jedem senkrechten Bauteil der Text «null» (`Editor.mask` war `null` statt undefiniert). Behoben.

**Zu Paket 5 (Abweichungen vom Entwurf, siehe auch ENTSCHEIDUNGEN):** «PDF erzeugen» öffnet den Druckdialog des Browsers («Als PDF speichern»), statt selbst eine PDF-Datei zu schreiben: Die Seiten sind vektorielle HTML-/SVG-Seiten in 96-dpi-Massen mit `@page`-Grösse, Chromium und Firefox erzeugen daraus das PDF (im Test mit `page.pdf`: 2 Seiten, richtige Blattgrösse). Die KV-Gruppenbezeichnungen stehen unter dem Raster (mit Muster der Strichart), nicht rechts daneben, weil neben der 300 Einheiten breiten Tabelle auf A4 hoch nur 346 Einheiten bleiben.

## Korrektur Druckseiten (15.10.2026, `docs/KORREKTUR_DRUCK.md`)
1. **Inhalt füllt die Seite:** Seite 1: Schaltung wächst bis auf 5 % Rand (auch vergrössernd). Folgeseiten: `fillPage` misst den Inhalt in natürlicher Breite (nebeneinander oder Tabelle über KV untereinander, mehrere Breiten) und skaliert ihn als Ganzes, bis der Inhaltsbereich gefüllt ist (3 % Reserve). Obergrenze keine.
2. **Titel = Name, Formel nur rechts oben:** kein Rückgriff mehr auf den Dateinamen; leer bleibt leer. Langer Titel bricht im Schriftfeld auf zwei Zeilen um.
3. **Erklärender Satz** kommt aus dem Beschreibungsfeld (Dialog «Schriftfeld bearbeiten»); leer = kein Text.
4. **A4 hoch bleibt Voreinstellung.**
**Grenze:** Eine sehr breite, flache Schaltung (z. B. das Probebeispiel, ca. 2 : 1) füllt auf A4 hoch die Breite, nicht die Höhe; das Seitenverhältnis bleibt erhalten, darüber und darunter bleibt Weiss. A4 quer füllt solche Schaltungen besser.

## Auftrag «Bedienung» (15.10.2026)
Gebaut in der Reihenfolge des Auftrags; ein gemeinsamer Teststand (`tests/studio.js` 419 Prüfungen, Stufen `m` bis `r` neu).
1. **Kein Modus** (`--stufe=m`): Bauen/Messen-Umschaltung und Zielwahl entfernt; Klick wählt nur aus; Wege in die Anzeigen einzeln geprüft (Rechtsklick auf Anschluss/Bauteil, Eigenschaftenfeld, Menü «Anzeigen»); 20 Klicks öffnen kein Fenster.
2. **Maus** (`--stufe=n`): Rad zoomt zum Zeiger, rechte/mittlere Taste schiebt, Rechtsklick ohne Ziehen = Menü (Schwelle 4 Punkte), Auswahlrahmen, Verschieben einer Auswahl, Umschalt, Cursorformen, Rückgängig.
3. **Platz** (`--stufe=o`): Bauteilleiste oben mit Registerkarten, kompakte Köpfe, Zeitverlauf ohne Signale zu, Eigenschaftenfeld einklappbar, Zustand gemerkt (`dqstudio_ui_v1`); gemessen bei 1366 × 768: Zeichenfläche 80,7 % der Fensterhöhe.
4. **In Leitung einfügen** (`--stufe=p`): Zweipole aus Leiste (Klick, Ziehen) und vorhandene unverdrahtete Zweipole; Marke, Ausrichtung, Rückgängig; Netzliste +1 Knoten, I = 8,491 mA.
5. **Spannungen und Ströme** (`--stufe=q`): Knöpfe U und I, Menü, Tasten; Teiler 10 V / 1 k / 3 k zeigt 7,5 V; Digitaluhr ohne Überdeckungen.
6. **Mehrfach setzen** (`--stufe=r`): Bauteil am Zeiger, R, Esc.
**Funde:** (a) Das Aufgabenfenster verdeckte Bauteile → rechts. (b) Neuzeichnen beim Ziehen aus der Leiste verlor die Ablage → Marke direkt im SVG. (c) Eine ältere Prüfung (Druck) und mehrere Aufbauten der Browser-Tests mussten auf die neue Leiste (Registerkarte, Klick, Setzen) umgestellt werden, nicht abgeschaltet.
**Zu prüfen durch Steven:** 80-%-Vorgabe wurde über Höhe erreicht, nicht über das Eigenschaftenfeld; Zeitverlauf ist ohne Signale komplett zu; sieben statt fünf Registerkarten; die Texte vieler Werkzeugknöpfe sind unter 1700 Punkten Breite nur noch Symbole (Tooltips bleiben).

## Nachtlauf 2 (16./17.10.2026, `docs/NACHTLAUF_2.md`)

### Block 1 – Rückstände: **fertig** (16.10.2026)
- **1a Hänger im Rechenkern:** Ursache waren schwingende Zufallsschaltungen, die in der Engine bis zu 400 Iterationen je Schritt rechneten (`tests/robust.js` fand drei Fälle über 3 s, Startzahl 20261015). `engine.js` erkennt jetzt einen Grenzzyklus (diskreter Zustand wiederholt sich) und bricht sofort ab; im Zeitbereich schaltet dann je Schritt ein Gatter, damit die Schwingung sichtbar wird. Ergebnis: `tests/robust.js` mit Startzahl 20261015 und 7 **ohne Hänger** (längster Durchlauf 181 bzw. 207 ms statt 4,3 s, keine Befunde). Neuer Test `T9 Ringoszillator` in `tests/kern.js` (sechs Zustände, ein Bit je Schritt, Periode 6, `UNSTABLE`); im Studio-Simulator 154 Flanken an U1 in 30 Bildern. `robust.js` nennt bei Hängern jetzt die Zeit je Stufe.
- **1b AV und A:** Inspektor (Analysetabelle Eingänge | AV | A, Ansteuertabelle AV | A | Eingänge, Funktionstext D-Flipflop) und Datenblatt (D, T) umgestellt; Test in `tests/studio.js` prüft Tabellenköpfe und dass kein Qₙ/Q⁺ mehr vorkommt. Druck und Zeitverlauf haben keine solchen Tabellenköpfe (geprüft). Zähler-Tabellen unverändert (siehe ENTSCHEIDUNGEN).
- **1c Spiel-Testkette auf dem Endstand:** `node tests/smoke.js` Browser-Durchlauf OK; `node tests/tasks.js` 341 Durchläufe, alle Aufgaben in Schaltplan und Werkbank lösbar. `test_engine.js` 174 ok, `tests/kern.js` 58 Schaltungen / 826 Prüfwerte, `validate.js` OK, `tests/studio.js` 421 Prüfungen, 0 Fehler. Nichts rot.

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

### Block 2 – Lernpfad: Gerüst und Prüfmaschine: **fertig** (16.10.2026)
- **Gebaut:** Menü «Lernpfad» im Hauptmenü, Überlagerung mit Stationsliste (Zustände gesperrt / offen / in Arbeit / bestanden), Station mit Einführung und Aufgabenliste, Arbeitsfläche je Prüfart (`studio/pfad/ui.js`); Daten je Station in `studio/pfad/st_*.js`, Kern und Prüfmaschine ohne DOM in `studio/pfad/kern.js`, Rechenhilfen für Tabellen und Musterschaltungen in `pfad/bausteine.js`. Schaltungsaufgaben wechseln in den Editor: Bauteilleiste nur mit den freigeschalteten Teilen, Aufgabenfenster mit «Prüfen» / «Lösung zeigen» / «Zurück zur Station», Eingänge und Anzeigen gesperrt.
- **Die sieben Prüfarten** (`tabelle`, `ausdruck`, `schaltung`, `nand`, `ics`, `kv`, `folge`) einzeln getestet (`node tests/pfad.js`): richtig, falsch mit Begründung, Randfälle; dazu Fragen, Protokoll (Laborstation, nicht geprüft), Vergleich.
- **Fortschritt:** Browserspeicher (try/catch), Ausgeben und Einlesen als Datei (`*.fortschritt.dqstudio.json`, Version 1), Freigabe durch die Lehrperson als Datei. Browsertest `node tests/pfad_browser.js` (47 Prüfungen): Neuladen behält den Stand, Ausgeben und Einlesen ergibt denselben Stand, kaputte und fremde Dateien werden abgelehnt, Station abschliessen.
- **A5 (Die acht Gatter)** als Muster: 24 Aufgaben (je Gatter Tabelle, Ausdruck, Schaltung).
- Siehe `ENTSCHEIDUNGEN_STUDIO.md` «Lernpfad» und `FRAGEN_STUDIO.md`.
- Testkette: `test_engine` 174 ok, `tests/kern.js` 826 ok, `validate.js` OK, `tests/studio.js` 421 ok, `tests/pfad.js`, `tests/pfad_browser.js`, `tests/smoke.js` OK, `tests/tasks.js` 341 Durchläufe OK.

### Block 3 – Teil A vollständig: **fertig** (16.10.2026)
Stationen A1 bis A13 (Zahlensysteme, Laborstation A2, Beschaltungsregeln, Symbolik, Gatter, positive/negative Logik, DNF/KNF, Boolesche Algebra mit 18 Vereinfachungen, normierte Schaltungen, KV-Diagramm mit 13 Funktionen, Codes und Codewandler, Parität/Hamming, Datenkoordination). Neu in der Oberfläche: KV-Arbeitsfläche (Felder wählen, Päckchen bilden und entfernen, Päckchen über den Rand, Don't-Care), Zuordnung mit Symbolen und Auswahlfeldern, Messprotokoll mit Selbstbestätigung und Drucken, Fehlersuche in vorgegebenen Schaltungen (nur Eingänge und Anzeigen gesperrt).
**Fachliche Prüfung gegen unabhängige Rechnung** (`node tests/pfad.js`, 800 Prüfungen): Quine-McCluskey gegen Brute Force (alle Funktionen mit 1 bis 3 Variablen, 600 Zufallsfunktionen mit 4 und 40 mit 5 Variablen, auch mit Don't-Care); A1 mit `parseInt`; A5 gegen die Simulation der Gatter; A6 gegen die Gatterdefinitionen der Engine; A8 gegen JavaScript-Operatoren; jede Vereinfachungsaufgabe wird wirklich kürzer; A11 (Ziffer = Wort − 3, Gray ändert ein Bit); A12 (Hamming: jede der 112 Einzelbitstörungen ergibt ihre Positionsnummer als Syndrom); A13 (Addierer, Subtrahierer, Komparator mit allen 256 Kombinationen, Multiplexer, Demultiplexer) mit gewöhnlicher Arithmetik gegen die Engine.
Browsertests: `tests/pfad_browser2.js` (28 Prüfungen: KV, Symbole, Zahlentabelle, Fragen, Messprotokoll mit Neuladen, Fehlersuche).
**Nicht von Steven stammend:** die 18 Vereinfachungen, die 13 KV-Funktionen, das Förderband-Szenario und alle Texte sind meine eigenen Beispiele (`FRAGEN_STUDIO.md`, Punkte 1 bis 5). Alte DIN-Norm (A4) fehlt bewusst.

### Block 4 – Teil B vollständig: **fertig** (16.10.2026)
Stationen B1 bis B13: NOR-Flipflop, NOR-AND-Flipflop, Steuerungsarten, T-, D-, RS-, JK-Flipflop (mit JK-Master-Slave und 1s-Catching), asynchroner Dualzähler (mit Siebensegmentanzeige), **Digitaluhr** (B9), synchroner Dual- und Dezimalzähler, Modulo-n und Johnson, Speicher. Zustandsfolgediagramme werden von Hand gezeichnet; «Abgeben» zeigt das Diagramm der Software zum Vergleich (nicht bewertet).
**Prüfmaschine erweitert:** `folge` mit `abfolge` (Eingänge nacheinander), ohne Takt, Takteingang als Pegelschalter oder Taktgeber, Siebensegmentanzeigen als Ziffer gelesen, Bauteileigenschaften prüfbar.
**B9 als Abnahme:** Die Musterlösung der Uhr (Taktgeber, sieben T-Flipflops, zwei UND zum Zurücksetzen, zwei Dekoder, zwei Anzeigen) besteht 62 Takte (0 bis 59, 0, 1) in `tests/pfad.js` und im Browser (`tests/pfad_browser3.js`); der Test stellt sicher, dass alle ihre Bauteile mit A1 bis B8 freigeschaltet sind. Ein Durchlauf über alle 26 Stationen nacheinander (jede öffnet sich erst, wenn die vorige bestanden ist) besteht mit den Musterlösungen.
**Fund beim Bauen der Uhr (Rechenkern):** Beim Rücksetzen einer Ripple-Stufe per preClear zählte die nächste Stufe fälschlich mit (die Engine hat keine Gatterlaufzeit). Regel in `engine.js` ergänzt (Takt im selben Zeitpunkt wie das Wegfallen von preSet/preClear zählt nicht), Regressionstest in `tests/kern.js`; gilt auch im Spiel, dessen Tests grün bleiben. Details in `ENTSCHEIDUNGEN_STUDIO.md` und `FRAGEN_STUDIO.md` (Punkt 7).
**Messungen für die Prüffragen:** Laufzeit asynchron 20/40/60 ns, synchron 20 ns für alle Bits, Frequenzhalbierung 8 Hz → 4 Hz, mit der Studio-Simulation nachgemessen.
Testkette auf dem Stand dieses Blocks: `test_engine` 174 ok, `tests/kern.js` 918 Prüfwerte ok (59 Schaltungen), `validate.js` OK, `validate_exam.js` OK, `tests/pfad.js` 800 ok, `pfad_browser` 47, `pfad_browser2` 28, `pfad_browser3` 16, `robust.js` (Startzahlen 20261015 und 7) keine Befunde, `tests/studio.js` 421 ok, `smoke.js` OK, `tasks.js` 341 Durchläufe OK, `test_api` 115, `test_exam_api` 89, `test_avatar` 842.

### Block 5 – Bereit für den Betrieb im Netz: **fertig** (16.10.2026)
- **Offline:** `web/sw.js` nahm `/studio/` schon auf (Seite und Manifest); neu: Beim Erscheinen einer neueren Fassung zeigt das Studio eine Leiste «Neuere Fassung verfügbar … Jetzt neu laden / Später» (`studio/netz.js`, `controllerchange` des Service Workers; beim ersten Besuch keine Meldung). Test (`node tests/netz.js`, 37 Prüfungen) über einen lokalen Server: erster Besuch, dann **Netz abgeschaltet**, Seite neu laden: Studio öffnet sich aus dem Cache, die Simulation rechnet, der Lernpfad mit 26 Stationen öffnet sich; danach ändert sich `sw.js` → Hinweisleiste, nach dem Neuladen liefert der Service Worker die neue Fassung und der alte Cache ist gelöscht.
- **Dateidialoge:** `S.saveFile` / `S.openFile` nutzen `showSaveFilePicker` / `showOpenFilePicker`, wo es sie gibt (Chrome, Edge); «Speichern» schreibt danach in dieselbe Datei, neu «Speichern unter …». Abbruch: nichts. Fehler oder keine API: der bisherige Weg (Download, Dateiauswahl des Browsers), ohne Meldung. Gilt für Schaltungen und für Lernpfad (Fortschritt und Freigabe). Getestet mit **Ersatz-Dialogen** (Aufruf, Dateiname, Dateityp, Schreiben, direktes Überschreiben, Abbruch, Fehler → Download) und im Rückfallweg (echter Download, echte Dateiauswahl). **Nicht geprüft:** die echten Betriebssystem-Dialoge von Chrome und Edge (lassen sich nicht automatisch bedienen) – bitte einmal von Hand ansehen.
- **Als App installierbar:** `web/studio/manifest.webmanifest` (Name «Digital Quest Studio», eigenes Fenster, Symbole 192, 512 und SVG aus `dev/assets/icon.svg`, `id` ergänzt). Chromium nimmt das Manifest ohne Fehler an und meldet keine Installierbarkeitsfehler (`Page.getAppManifest`, `Page.getInstallabilityErrors`). Im Menü Hilfe erscheint «Als App installieren …», wenn der Browser es anbietet.
- **Tragbare Fassung:** `studio.html` bleibt eine Datei ohne alles; der Build legt sie zusätzlich in `dist/` ab, dazu `dist/LIESMICH.txt` (zwei Sätze).
- Die bestehenden Browsertests des Studios schalten die Systemdialoge ab (sie prüfen den Rückfallweg, den es für andere Browser weiter gibt); `tests/studio.js` 421 ok.

## Schlussbericht Nachtlauf 2 (16.10.2026)

### Stand der Blöcke
| Block | Stand |
|---|---|
| 1 Rückstände (Rechenkern-Hänger, AV/A, Spiel-Testkette) | **fertig** |
| 2 Lernpfad: Gerüst und Prüfmaschine | **fertig** |
| 3 Teil A (A1 bis A13) | **fertig** |
| 4 Teil B (B1 bis B13) | **fertig** |
| 5 Betrieb im Netz | **fertig** (echte Systemdialoge nicht automatisch geprüft, siehe unten) |
| 6 Abschluss | Testkette siehe unten; Schlussbericht = dieser Abschnitt |

Der Lauf blieb nirgends stehen; nichts musste wegen drei vergeblicher Anläufe zurückgestellt werden (`FRAGEN_STUDIO.md` enthält nur Fragen an Steven, keine hängenden Punkte).

### Lernpfad, Station für Station
«Freigegeben» heisst hier: Musterlösung wird angenommen, eine falsche wird mit Begründung abgelehnt, die Bauteile der Musterlösung sind freigeschaltet, und die Zahlen sind gegen eine unabhängige Rechnung geprüft (letzte Spalte). **Keine Station ist an der unabhängigen Prüfung gescheitert.** Zwei Stationen sind es nur eingeschränkt: A2 (Laborstation, bewusst nicht geprüft) und A4 (Zuordnung von Schaltzeichen: keine Rechnung möglich, die Zuordnung ist von mir nach der Norm gesetzt).

| Station | Titel | Aufgaben (Pflicht) | Prüfarten | unabhängige Prüfung |
|---|---|---|---|---|
| A1 | Zahlensysteme | 5 (5) | tabelle, fragen | parseInt |
| A2 | Logikfamilien TTL und CMOS (Labor) | 3 (3) | protokoll | – (Laborstation, nicht geprüft) |
| A3 | Beschaltungsregeln | 4 (4) | fragen, schaltung | Verhalten der Engine (Fehler werden erkannt) |
| A4 | Symbolik | 3 (3) | tabelle, fragen | – (Zuordnungen nach der Norm, keine Rechnung) |
| A5 | Die acht Gatter | 24 (24) | tabelle, ausdruck, schaltung | Simulation der Gatter |
| A6 | Positive und negative Logik | 5 (5) | tabelle, fragen, schaltung | Gatterdefinitionen der Engine |
| A7 | DNF und KNF | 8 (5) | tabelle, ausdruck, schaltung, fragen | Simulation, kanonische Formen |
| A8 | Boolesche Algebra | 26 (24) | tabelle, fragen, ausdruck | JavaScript-Operatoren, Brute Force |
| A9 | Normierte Schaltungen | 7 (7) | nand, ics, fragen | Parser, Engine (Verhalten) |
| A10 | KV-Diagramm | 15 (8) | kv, schaltung | Quine-McCluskey gegen Brute Force |
| A11 | Code und Codewandler | 9 (7) | tabelle, kv, schaltung | Definition, Brute Force |
| A12 | Kontrollinstanzen | 8 (5) | tabelle, schaltung, fragen | 112 Einzelbitstörungen (Hamming), Parität |
| A13 | Datenkoordination | 14 (13) | tabelle, schaltung, fragen | Arithmetik gegen Engine (alle Kombinationen) |
| B1 | NOR-Flipflop | 6 (6) | tabelle, vergleich, folge, fragen | NOR-Flipflop in der Engine nachgeschaltet |
| B2 | NOR-AND-Flipflop | 3 (3) | tabelle, folge, fragen | getaktetes Flipflop in der Engine |
| B3 | Steuerungsarten | 5 (5) | fragen, folge | Verhalten der Engine (Takt, preSet/preClear) |
| B4 | T-Flipflop | 6 (6) | tabelle, vergleich, folge, fragen | Lehrbuch gegen Engine, Frequenz gemessen |
| B5 | D-Flipflop | 6 (6) | tabelle, vergleich, folge, fragen | Lehrbuch gegen Engine |
| B6 | RS-Flipflop | 5 (5) | tabelle, vergleich, folge, fragen | Lehrbuch gegen Engine |
| B7 | JK-Flipflop | 7 (7) | tabelle, vergleich, folge, fragen | Lehrbuch gegen Engine, Master-Slave |
| B8 | Asynchroner Dualzähler | 5 (4) | tabelle, folge, fragen | Laufzeit gemessen (20/40/60 ns) |
| B9 | Digitale Uhr | 4 (2) | folge, fragen | 62 Takte in der Engine, Bauteile bis B8 |
| B10 | Synchroner Dualzähler | 4 (4) | tabelle, fragen, folge | T = AV xor A, Laufzeit gemessen |
| B11 | Synchroner Dezimalzähler | 6 (6) | tabelle, fragen, kv, folge | Folgetabelle, Brute Force (KV) |
| B12 | Spezial- und Johnson-Zähler | 6 (5) | folge, tabelle, fragen | Johnson-Folge, Modulo-Folgen in der Engine |
| B13 | Speicher | 3 (3) | tabelle, fragen | 2^n, Bit/Byte gerechnet |


Zusammen 197 Aufgaben, davon 25 Prüffragen-Aufgaben mit 95 Einzelfragen. **Die Inhalte der Prüffragen sind von mir geschrieben und nicht gegengerechnet** (Ausnahmen: die Fragen mit Zahlen, die im Test gemessen oder gerechnet werden: Laufzeiten, Frequenz, Speichergrössen, Adressleitungen). Steven soll sie lesen.

### Was Steven prüfen muss, nach Dringlichkeit
1. **Rechenkern (Spiel und Studio):** Zwei Änderungen in `engine.js` (Grenzzyklus-Abbruch; Takt zählt nicht beim Wegfallen von preClear im selben Zeitpunkt). Alle Tests des Spiels sind grün, aber die zweite Regel ist eine Modellentscheidung (`FRAGEN_STUDIO.md` Punkt 7).
2. **Aufgabentexte und Beispiele:** alle Aufgaben sind aus der Beschreibung abgeleitet und von mir formuliert; die 18 Vereinfachungen (A8), 13 KV-Funktionen (A10), das Förderband (A7) und die Prüffragen sind **meine Beispiele**, nicht seine Serien (`FRAGEN_STUDIO.md` Punkte 1 bis 5).
3. **Minterm-Nummerierung** («m4-Schreibweise»): e1 = niedrigstes Bit (`FRAGEN_STUDIO.md` Punkt 2).
4. **Pflicht und freiwillig:** nach seinen Hinweisen (A8 Nr. 12 und 18, A10 Nr. 7 bis 13) und von mir zusätzlich: A7 Mehrheitsentscheid, A11 Gray, A12 Hamming, A13 4-Bit-Komparator, B8 Abwärtszähler, B9 Teilaufgaben, B12 Modulo 12 freiwillig. Reihenfolge der Stationen wie im Auftrag.
5. **Alte DIN-Norm (A4)** fehlt; **NOR-Flipflop e1/e2** (B1, B2: e1 = Setzen); **Aufbau der Digitaluhr** (asynchron mit preClear).
6. **Rückmeldungstexte:** Sie sagen, was falsch ist («Bei e1 = 1, e2 = 0 zeigt die Anzeige eine 1, verlangt ist 0», «Die Zeile für … stimmt nicht»). Ob sie helfen oder bevormunden, kann nur er beurteilen.
7. **Laborstation A2:** Messprotokoll mit Datenblattwerten (7400, 4027), Kennlinien (7400, 74LS00, 74HC00, 4011) und Auswertung zum Eintragen, Speichern, Drucken. Ob es den Zettel wirklich ersetzen kann, entscheidet er.
8. **Systemdialoge** zum Öffnen und Speichern einmal von Hand in Chrome und Edge ansehen; die Schaltung und der Lernpfad-Fortschritt sollten sich dort als `*.dqstudio.json` speichern und wieder öffnen lassen.
9. **Sichtprüfung der Oberfläche:** KV-Arbeitsfläche (Päckchen bilden), Symbole in A4, die Aufgabenfenster im Editor.

### Selbst getroffene Entscheidungen
Alle in `ENTSCHEIDUNGEN_STUDIO.md` (Abschnitte «Nachtlauf 2», «Lernpfad», «Lernpfad Teil B», «Betrieb im Netz»); die wichtigsten: Stationen als Daten, zehn Prüfarten, Quine-McCluskey als eigene Rechnung mit Brute-Force-Gegenprobe, Freigabe durch die Lehrperson als Datei, Digitaluhr asynchron, Zustandsfolgediagramme von Hand mit Vergleich.

### Offene Fragen
`docs/FRAGEN_STUDIO.md` (10 Punkte).

### Zusatzpunkte
Beide umgesetzt, siehe Abschnitt «Zusatzpunkte» weiter unten: **Leistung** (Logik 50 → 100 Bauteile flüssig, gemischt 25 → 50) und **Lernpfad Stufe 2** (Fortschritt im Leitstand). Zur Stufe 2 gehört der Hinweis: Steven hat Stufe 1 noch nicht gesehen, der Auftrag wollte Stufe 2 erst danach; sie liegt nur auf dem Branch.

### Endstand Testkette (frischer Auszug des letzten Commits, nichts parallel)
`test_engine` 174 ok · `tests/kern.js` 60 Schaltungen, 924 Prüfwerte ok · `validate.js` OK · `validate_exam.js` OK · `tests/pfad.js` 809 ok · `robust.js` (beide Startzahlen) keine Befunde · `tests/studio.js` 421 ok · `pfad_browser` 47, `pfad_browser2` 28, `pfad_browser3` 16, `pfad_portal` 35 · `tests/netz.js` 37 · `smoke.js` OK · `tasks.js` 341 Durchläufe OK · `test_api` 128 · `test_exam_api` 89 · `test_avatar` 842 · `tests/portal.js` OK · `tests/avatar.js` 29. Einmal ist `tests/studio.js` unter Last (parallel laufende Messung) an einer Zeitkonstanten-Prüfung (2 %) gescheitert und lief allein und im Endlauf grün: zeitabhängig, kein Befund.

## Zusatzpunkte «Wenn Zeit übrig bleibt» (16.10.2026)

### 1. Leistungsgrenze angehoben (`docs/LEISTUNG_STUDIO.md`)
Engpass gefunden (Profiler: 50 % Gauss-Löser, 22 % Aufbau der dichten Matrix bei Logikschaltungen) und die einfachste Verbesserung umgesetzt: dünn besetztes Gleichungssystem (`solveSparse` in `engine.js`; reine Analogschaltungen behalten den dichten Weg). Flüssig bis jetzt **100 Bauteile reine Logik** (vorher 50), **50 gemischt** (vorher 25); mit «U-Werte» Logik 100 (vorher 25). Rechenzeit je Schritt bei 100 Logik-Bauteilen 1,5 → 0,3 ms. Alle Tests unverändert grün; ein beim Bauen entdeckter Fehler (Bauteil mit beiden Anschlüssen am selben Knoten) hat einen neuen Kern-Test.

### 2. Lernpfad Stufe 2: Anbindung an das Portal
Umgesetzt, weil mehr als zwei Stunden übrig waren. Angemeldete Lernende (Portal → Studio unter `/studio/`) bekommen ihren Lernpfad-Fortschritt auf den Server gespiegelt (Quest `dqpfad`); im **Leitstand** erscheint je Klasse ein Panel «Lernpfad Digitaltechnik»: Matrix Person × 26 Stationen, Klick auf ein Feld zeigt die Aufgaben dieser Person, Klick auf eine Stationsnummer die Aufgaben der ganzen Klasse. Zwei Geräte desselben Kontos werden zusammengeführt, Konten werden nie gemischt, ohne Anmeldung bleibt alles wie bisher. Tests: `test_api.js` (13 neue Prüfungen: Speichern, Bereinigung, Rechte, 409, Grösse), `tests/pfad.js` (Zusammenführen mit 200 Zufallspaaren, Zusammenfassung), `tests/pfad_portal.js` (35 Prüfungen im Browser mit echtem Worker-Code: Rückfrage bei Übernahme, Server-Stand, zweites Gerät, Konflikt, anderes Konto, Leitstand, fremde Lehrperson). Entscheidungen in `ENTSCHEIDUNGEN_STUDIO.md`. **Steven hat das Muster noch nicht gesehen** (der Auftrag wollte es erst nach Stufe 1 sehen): Es ist auf dem Branch, nicht auf `main`.

## Originalaufgaben eingesetzt (16.10.2026)
- **A7** Förderband mit der Wahrheitstabelle aus dem Lehrmittel (Wortlaut), DNF, KNF, beide Schaltungen; **A8** Aufgabe 1 (Förderband-Übung) und 2 bis 17 (die sechzehn Ausdrücke mit Hinweisen auf den didaktischen Kniff), Aufgabe 18 als Zusatzübung, 12 und 18 freiwillig; **A10** die 14 KV-Aufgaben plus Sonderaufgaben 11, 12, 13, 7 bis 13 freiwillig. Eigene Beispiele nur noch als freiwillige «Zusatz (eigene Übung)».
- **Prüfung:** gleichwertig mit dem Original, Termzahl und Buchstabenzahl nicht grösser als die JSON-Vorgabe. `tests/pfad.js` (1045 Prüfungen) prüft je Aufgabe: Ausdruck und Minterme wie im JSON, eigene Minimalform = JSON (alle 16 + 14 Aufgaben stimmen überein, **keine Abweichung**), die Minimalform aus dem JSON wird angenommen, der Originalausdruck und die kanonische Form werden als «richtig, aber nicht minimiert» abgelehnt, KV: alle Primimplikanten als Päckchen und ausgeschriebene Einsen werden abgelehnt. **Aufgabe 6: vier gleichwertige Minimalformen werden aufgezählt (4, wie im JSON) und alle vier angenommen.**
- **Stellenwertigkeit** (d höchstwertig, a niederwertigst, Feldnummer = d·8 + c·4 + b·2 + a) steht in `P.KONV.buchstaben`; die KV-Diagramme zeigen jetzt a bis d (statt e1 bis e4), auch in A11 und B11; 5 und 6 Eingänge als zwei beziehungsweise vier Diagramme. Test: `d'cb'a'` ist Feld 4.
- **Konventionen an einer Stelle:** siehe `ENTSCHEIDUNGEN_STUDIO.md` (Buchstaben, NOR-Setzeingang, preClear-Regel als `E.RULES`).
- Offene Punkte neu: `FRAGEN_STUDIO.md` 11 bis 15 (Wortlaut Aufgabe 18, Grossbuchstaben in Aufgabe 11, Nummerierung im JSON der Algebra, KV-Anordnung für 5/6 Eingänge, A9-Originale fehlen).
- **Testkette nach den Originalaufgaben** (frischer Auszug des Commits 046435c): `test_engine` 174, `kern` 924 Prüfwerte, `validate` und `validate_exam` OK, `tests/pfad.js` 1045, `robust.js` beide Startzahlen ohne Befund, `tests/studio.js` 421, `pfad_browser` 47, `pfad_browser2` 33, `pfad_browser3` 16, `pfad_portal` 35, `netz` 37, `smoke` OK, `tasks` 341, `test_api` 128, `test_exam_api` 89, `test_avatar` 842, `portal` OK, `avatar` 29: alles grün.

## A9 und B1 aus den Nachträgen (16.10.2026)
- **A9:** nur noch Stevens zwei Aufgaben (Nur NAND mit erlaubtem 3-fach-NAND für `A = e1·e2·(e3+e4)·e5`; 74HC02 + 74HC08 für `A1 = NICHT(A+C)·B`). Tests: Funktion über alle 32 beziehungsweise 8 Kombinationen, Bauteilprüfung (richtige Funktion mit UND/ODER, mit 4-fach-NAND, mit fünf NOR, mit 3-fach-NOR wird abgelehnt; eine andere richtige Lösung nur aus vier NOR wird angenommen).
- **B1:** `norSetzen = e2` bestätigt, Tabellen und Spaltenreihenfolge gegen die belegten Werte geprüft und angeglichen; unzulässiger Zustand entfällt (e1 gewinnt). Auch B2 folgt derselben Regel. `tests/pfad.js` 1043 Prüfungen.
- `FRAGEN_STUDIO.md`: Punkte 6 und 15 gestrichen, neu 16 (A9 weitere Ausdrücke) und 17 (B1 Ansteuertabelle nicht belegt).
- Testkette nach A9/B1: alle Läufe grün (Engine 174, Kern 924, Validatoren, `pfad` 1043, `robust`, `studio` 421, `pfad_browser` 47/33/16, `pfad_portal` 35, `netz` 37, `smoke`, `tasks`, API 128/89/842, Portal, Avatar 29). Ein Browsertest (`pfad_browser3`) hatte noch die alte Verdrahtung des NOR-Flipflops (e1 setzte) und wurde auf die belegte Konvention (e2 setzt) umgestellt; danach grün.

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
- preSet (PS) und preClear (PC) sind hier **aktiv bei 1** (nicht bei 0 wie bei manchen TTL-Bausteinen); bei beiden gleichzeitig gewinnt preClear.
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

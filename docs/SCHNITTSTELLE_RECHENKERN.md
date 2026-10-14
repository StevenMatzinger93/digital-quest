# Schnittstelle des Rechenkerns

Stand: 14.10.2026 (Studio, Stufe 0). Gilt für `dev/src/engine.js` (`window.DQEngine`) und für jeden Kern, der später
daneben oder dahinter gesetzt wird (z. B. ngspice als WebAssembly). Editor, Werkbank, Spiel und Studio sprechen nur diese
Schnittstelle an – nie Interna des Lösers.

Die Konformitätsprüfung ist `dev/tests/kern.js`: Schaltungen mit von Hand nachgerechneten Sollwerten. Ein Kern ist
brauchbar, wenn er alle besteht (Toleranz 1e-9 relativ). Jede neue Bauteilart ergänzt `kern.js` um ihre Fälle.

## 1. Netzliste = das Layout

Die Netzliste ist ein JSON-Objekt, keine Klasse. Der Editor erzeugt sie, der Kern liest sie.

```json
{
  "parts": [ { "id": "R1", "type": "resistor", "value": 1000, "props": { "pmax": 0.25 }, "x": 0, "y": 0, "rot": 0 } ],
  "wires": [ { "from": "B1.p", "to": "R1.a" } ]
}
```

| Feld | Bedeutung |
|---|---|
| `parts[].id` | eindeutig (`R1`, `B1`, `FF3` …). Präfix je Typ steht in `PARTS[type].prefix`. |
| `parts[].type` | Bauteiltyp, Schlüssel in `PARTS` (Pins, Standardwerte, Einheit) |
| `parts[].value` | Hauptwert (Ω, V, F, H, Hz …); überschreibt `props.value` |
| `parts[].props` | weitere Eigenschaften (`ri`, `imax`, `closed`, `freq`, `shape` …); fehlende Werte kommen aus `PARTS[type].props` |
| `parts[].x/y/rot` | nur Darstellung, der Kern ignoriert sie |
| `wires[]` | verbindet zwei Anschlüsse `Id.pin`; Leitungen haben keinen Widerstand, jede Gruppe verbundener Anschlüsse ist ein Knoten |

**Bezugspunkt:** Masse-Symbol (`ground`, Pin `g`); fehlt es, ist der Minuspol der ersten Quelle (`battery`, `acsource`) 0 V.

**Quellen** haben immer einen Innenwiderstand `ri` (Norton-Ersatz). Es gibt keine idealen Quellen. Eine Stromquelle ist eine
Spannungsquelle mit sehr grossem `ri` (I = U / `ri`).

## 2. Aufrufe

Alle Funktionen sind synchron und ohne Nebenwirkung auf das Layout (der Kern kopiert, was er verändert).

| Aufruf | Zweck |
|---|---|
| `buildNetlist(layout) → net` | Knoten bilden. `net.pinNode['R1.a']` = Knotenname (`'0'` = Bezug), `net.nodes`, `net.parts[]` (`id`, `type`, `props`, `n` = Pin → Knoten), `net.refPin`. Wirft `Error` bei doppelter ID oder unbekanntem Anschluss. |
| `newState() → state` | Zustand ohne Vorgeschichte (Kondensatorspannungen `vC`, Spulenströme `iL`, Flipflops `ff`, Dioden, Gatter, Zeit `t`, durchgebrannte Bauteile `burnt`). Der Zustand gehört dem Aufrufer und wird von `step` fortgeschrieben. |
| `step(net, state, opts) → res` | Ein Rechenschritt. `opts.dt` = Zeitschritt in s; **ohne `dt` wird der Gleichstrom-Arbeitspunkt gerechnet** (Kondensator offen, Spule kurzgeschlossen). Bei jedem Schritt mit `dt` wird `state.t += dt`. |
| `simulate(layout, {dt, tEnd, probes, events, settle}) → {samples, state}` | Zeitreihe für einzelne Messpunkte (Oszilloskop-Rechenweg des Spiels). |
| `acMeasure(layout, {a, b}) → {dc, rms, avg, peak, pp, …}` | Kennwerte über Perioden der langsamsten Wechselquelle. |
| `measure(layout, {mode, a, b}) → {value, unit, display}` | Multimeter V, A, Ω, V~. |
| `acSolve(layout, f, {source}) → {pin(pin) → [Re, Im], nodeV}` | Wechselstromanalyse bei einer Frequenz: komplexe Knotenanalyse um den Arbeitspunkt, Reiz 1 V an `source` (Standard: erste Wechselspannungsquelle), andere Quellen sind Kurzschlüsse über `ri`. |
| `acSweep(layout, {a, b?}, {fmin, fmax, points, source}) → {freqs, mag, db, phase, re, im}` | Frequenzgang U(a, b) je 1 V Reiz, logarithmisch geteilt; Phase in Grad. |
| `runTask(task, layout, answers)` | Aufgabenprüfung des Spiels (nicht Teil der Kernschnittstelle des Studios). |

### Rückgabe von `step` (`res`)

| Feld | Bedeutung |
|---|---|
| `res.nodeV[knoten]` | Knotenspannung in V gegen den Bezug (`res.nodeV[net.pinNode['R1.a']]`) |
| `res.parts[id].v` | Spannung am Bauteil, Zweipole a→b (Quellen p→n, Z-Diode a→k, Transistor c→e) |
| `res.parts[id].i` | Strom durch das Bauteil, Zweipole a→b; **Quellen: aus dem Pluspol heraus**, positiv = liefert |
| `res.parts[id].pin[pin]` | Strom je Anschluss in das Bauteil hinein gerechnet negativ, heraus positiv (Stromfluss-Anzeige) |
| `res.parts[id].p` | Leistung in W (U·I) |
| `res.parts[id].on / .out / .q / .brightness / .seg` | digitale und optische Zustände (LED leuchtet, Gatterausgang, Flipflop-Q, 7-Segment-Muster) |
| `res.faults[]` | Störungen `{code, part, …}` (`SHORT`, `OVERLOAD`, `UNSTABLE`, `OUTPUT_CLASH` …) |
| `res.t` | Zeit nach dem Schritt |

Einheiten: V, A, Ω, F, H, s, Hz, W. Vorzeichen der Zweipole: Strom fliesst im Bauteil von a nach b, wenn `v = V(a) − V(b)` positiv ist.

## 3. Verhalten, auf das man sich verlassen darf

- **Gleichstrom:** exakte Knotenanalyse (Gauss mit Pivotsuche). Linear ohne Näherung; Abweichung von der Handrechnung nur durch Rundung.
- **Dioden, LED, Z-Diode, Transistor:** stückweise linear (U_F + r_s), Arbeitsbereich iterativ gesucht. Die Prüfwerte in `kern.js` setzen genau dieses Modell voraus.
- **Kondensator und Spule:** Rückwärts-Euler. Die Folge der Werte ist in geschlossener Form bekannt und wird von `kern.js` bis auf 1e-9 verlangt (nicht nur die Exponentialfunktion).
- **Digital:** 5-V-Logik, Schwelle 2,5 V, Ausgang 25 Ω Norton. Gatter werden einzeln nachgeführt; Flipflops übernehmen auf Flanken, die zwischen zwei Rechenschritten liegen.
- **Parasitärleitwert:** der eigene Kern legt jeden Knoten mit 1e-9 S an Masse (Rechenhilfe gegen singuläre Matrizen). Für die Konformitätsprüfung wird er mit `E.setGmin(1e-16)` abgesenkt, weil sonst die Handrechnung auf 1e-9 nicht erreichbar ist. Ein anderer Kern braucht diese Hilfe nicht.

## 4. Adapter für die Konformitätsprüfung

`tests/kern.js` spricht den Kern über zwei Funktionen an. Ein anderer Kern implementiert nur diese:

```js
dc(layout)                         // → { node(pin), i(id), v(id), part(id) } im Gleichstrom-Arbeitspunkt
transient(layout, { dt, n })       // → [ { t, node(pin), i(id), v(id) } … ] für Schritt 0 (Arbeitspunkt) bis n
ac(layout, {a, b?}, f)            // → { re, im, mag, db, phase } bei der Frequenz f, Reiz 1 V an der ersten Wechselspannungsquelle
session(layout)                    // → { set(id, prop, wert), eval(dt?) → Ansicht } für Digitaltechnik (Eingänge setzen, Takt, Zeit)
```

Aufruf: `node tests/kern.js`. Exit-Code 1 bei der ersten Abweichung. Andere Kerne: `require('./tests/kern.js').run(meinAdapter)`.

## 5. Erweiterungen

Neue Bauteilarten tragen sich in `PARTS` ein (Pins, Standardwerte), erhalten ein Datenblatt in `dev/src/content/datasheets.js`
und mindestens einen Fall in `tests/kern.js` – Gleichstrom (`cases`) oder Zeitbereich (`transient`). Ein Fall nennt Schaltung,
Rechenweg als Kommentar und die Sollwerte.

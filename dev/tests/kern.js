// Konformitaetspruefung des Rechenkerns: node tests/kern.js
// Schaltungen mit VON HAND nachgerechneten Sollwerten (Rechenweg je Fall als Kommentar). Jeder Rechenkern – der eigene heute,
// ein anderer morgen (z. B. ngspice als WebAssembly) – muss sie bestehen. Schnittstelle: docs/SCHNITTSTELLE_RECHENKERN.md.
//
// Toleranz 1e-9 relativ (plus 1e-15 absolut). Dafuer laeuft der eigene Kern ohne Parasitaerleitwert (E.setGmin(1e-16)):
// Gmin (Standard 1e-9 S je Knoten) ist ein Rechenhilfsmittel des eigenen Kerns, kein Teil der Schaltung.
// Quellen haben immer einen Innenwiderstand ri (Norton-Ersatz); er steht in jeder Rechnung, es gibt keine idealen Quellen.
// Stromquelle = Spannungsquelle mit sehr grossem ri (Norton-Aequivalent): I = U / ri.
//
// Erweiterung: Jede neue Bauteilart ergaenzt `cases` (Gleichstrom) bzw. `transient` (Zeitbereich) um ihre Faelle.
const E = require('../src/engine.js');
const TOL = 1e-9, ABS = 1e-15;
const near = (got, want) => Math.abs(got - want) <= TOL * Math.abs(want) + ABS;
const P = (id, type, props) => Object.assign({ id, type, x: 0, y: 0, rot: 0 }, props ? { props } : {});
const W = (a, b) => ({ from: a, to: b });

/* ---------- Adapter: der eigene Kern hinter der Kernschnittstelle ----------
 * dc(layout)                    → { node(pin) → Spannung gegen Bezugspunkt, i(id) → Strom, v(id) → Spannung, part(id) → Rohwerte }
 * transient(layout, {dt, n, probes}) → Liste der Zeilen { t, node(pin), i(id), v(id) } nach 0, 1 … n Schritten (Schritt 0 = Arbeitspunkt)
 * Ein anderer Kern implementiert nur diese zwei Funktionen. */
const Kern = {
  name: 'eigener Kern (engine.js)',
  setup() { this.oldGmin = E.setGmin(1e-16); },
  teardown() { E.setGmin(this.oldGmin); },
  _view(net, res, t) {
    return { t, faults: res.faults, node: pin => res.nodeV[net.pinNode[pin]], i: id => res.parts[id].i, v: id => res.parts[id].v, part: id => res.parts[id], res };
  },
  /* session(layout) → { set(id, prop, wert), eval(dt?) → Ansicht }: Schaltung bedienen und rechnen (Digitaltechnik: Eingaenge setzen, Takt, Zeit) */
  session(layout) {
    const net = E.buildNetlist(layout), st = E.newState(), self = this; let t = 0;
    E.step(net, st, { noGroundFault: true });
    return {
      set(id, prop, val) { net.byId[id].props[prop] = val; },
      eval(dt) { const r = E.step(net, st, dt ? { dt, noGroundFault: true } : { noGroundFault: true }); if (dt) t += dt; return self._view(net, r, t); }
    };
  },
  /* ac(layout, probe {a, b?}, f) → { re, im, mag, db, phase }: Wechselstromanalyse bei einer Frequenz, Reiz 1 V an der ersten Wechselspannungsquelle */
  ac(layout, probe, f) { const r = E.acSolve(layout, f), a = r.pin(probe.a), b = probe.b ? r.pin(probe.b) : [0, 0], re = a[0] - b[0], im = a[1] - b[1]; return { re, im, mag: Math.hypot(re, im), db: 20 * Math.log10(Math.hypot(re, im)), phase: Math.atan2(im, re) * 180 / Math.PI }; },
  dc(layout) { const net = E.buildNetlist(layout), res = E.step(net, E.newState(), {}); return this._view(net, res, 0); },
  transient(layout, o) {
    const net = E.buildNetlist(layout), st = E.newState(), rows = [];
    rows.push(this._view(net, E.step(net, st, {}), 0));
    for (let k = 1; k <= o.n; k++) rows.push(this._view(net, E.step(net, st, { dt: o.dt }), k * o.dt));
    return rows;
  }
};

/* ---------- Gleichstromfaelle ----------
 * node: Spannung am Anschluss gegen den Bezugspunkt (ohne Masse-Symbol: Minuspol der ersten Quelle), i: Strom durch das Bauteil
 * (Zweipole a→b, Quellen: aus dem Pluspol heraus), v: Spannung a→b bzw. p→n am Bauteil. */
const cases = [
  { name: '01 Spannungsteiler',
    // B1 9 V (ri 1 Ω) → R1 1 kΩ → R2 2 kΩ → B1.n. Reihenschaltung: Rges = 1 + 1000 + 2000 = 3001 Ω, I = 9/3001.
    // R1.a = 9 − I·ri, R1.b = I·R2 = 18000/3001.
    layout: { parts: [P('B1', 'battery', { value: 9, ri: 1 }), P('R1', 'resistor', { value: 1000 }), P('R2', 'resistor', { value: 2000 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')] },
    node: { 'R1.a': 9 - 9 / 3001, 'R1.b': 18000 / 3001, 'R2.b': 0 }, i: { R1: 9 / 3001, R2: 9 / 3001, B1: 9 / 3001 }, v: { R1: 9000 / 3001, R2: 18000 / 3001 } },

  { name: '02 Parallelschaltung',
    // B1 12 V (ri 1 Ω) mit R1 100 Ω ∥ R2 300 Ω. Rp = 100·300/400 = 75 Ω, I = 12/(1 + 75) = 12/76, U = I·Rp = 900/76.
    layout: { parts: [P('B1', 'battery', { value: 12, ri: 1 }), P('R1', 'resistor', { value: 100 }), P('R2', 'resistor', { value: 300 })],
      wires: [W('B1.p', 'R1.a'), W('B1.p', 'R2.a'), W('R1.b', 'B1.n'), W('R2.b', 'B1.n')] },
    node: { 'R1.a': 900 / 76 }, i: { B1: 12 / 76, R1: 9 / 76, R2: 3 / 76 }, v: { R1: 900 / 76, R2: 900 / 76 } },

  { name: '03 Stromquelle (Norton, 1 mA)',
    // B1 1000 V mit ri = 1 MΩ ist eine Stromquelle I = U/ri = 1 mA. Last R1 2 kΩ ∥ R2 3 kΩ = 1,2 kΩ.
    // Knotenspannung U = I / (1/ri + 1/Rp) = 1000·1200/(1 000 000 + 1200); Zweigstroeme U/R1, U/R2.
    layout: { parts: [P('B1', 'battery', { value: 1000, ri: 1e6, imax: 1 }), P('R1', 'resistor', { value: 2000 }), P('R2', 'resistor', { value: 3000 })],
      wires: [W('B1.p', 'R1.a'), W('B1.p', 'R2.a'), W('R1.b', 'B1.n'), W('R2.b', 'B1.n')] },
    node: { 'R1.a': 1000 * 1200 / 1001200 }, i: { R1: 1000 * 1200 / 1001200 / 2000, R2: 1000 * 1200 / 1001200 / 3000 }, v: { R1: 1000 * 1200 / 1001200 } },

  { name: '04 Wheatstone-Bruecke, unabgeglichen',
    // B1 10 V (ri 1 Ω); T = Pluspol, L = Mitte links, R = Mitte rechts, 0 = Minuspol.
    // R1 100 Ω (T–L), R2 200 Ω (L–0), R3 300 Ω (T–R), R4 150 Ω (R–0), Rg 1 kΩ (L–R). R1/R2 ≠ R3/R4 → Brueckenstrom ≠ 0.
    // Knotengleichungen (Leitwerte in S):  T: (1 + 1/100 + 1/300)·T − L/100 − R/300 = 10
    //                                       L: −T/100 + (1/100 + 1/200 + 1/1000)·L − R/1000 = 0
    //                                       R: −T/300 − L/1000 + (1/300 + 1/150 + 1/1000)·R = 0
    // Loesung (exakt als Bruch, von Hand per Elimination): T = 157500/15839, L = 102000/15839, R = 57000/15839.
    // Brueckenstrom Rg: (L − R)/1000 = 45000/15839/1000.
    layout: { parts: [P('B1', 'battery', { value: 10, ri: 1 }), P('R1', 'resistor', { value: 100 }), P('R2', 'resistor', { value: 200 }),
      P('R3', 'resistor', { value: 300 }), P('R4', 'resistor', { value: 150 }), P('R5', 'resistor', { value: 1000 })],
      wires: [W('B1.p', 'R1.a'), W('B1.p', 'R3.a'), W('R1.b', 'R2.a'), W('R1.b', 'R5.a'), W('R3.b', 'R4.a'), W('R3.b', 'R5.b'), W('R2.b', 'B1.n'), W('R4.b', 'B1.n')] },
    node: { 'R1.a': 157500 / 15839, 'R1.b': 102000 / 15839, 'R3.b': 57000 / 15839 }, i: { R5: 45000 / 15839 / 1000, R1: (157500 - 102000) / 15839 / 100 }, v: { R5: 45000 / 15839 } },

  { name: '05 Zwei Quellen in einer Masche',
    // B1 10 V (ri 1) und B2 4 V (ri 1) gegeneinander, dazwischen R1 100 Ω. Masche: I = (10 − 4)/(1 + 100 + 1) = 6/102.
    // R1.a = 10 − I·1, R1.b = 4 + I·1 (B2 wird in den Pluspol hinein durchflossen).
    layout: { parts: [P('B1', 'battery', { value: 10, ri: 1 }), P('R1', 'resistor', { value: 100 }), P('B2', 'battery', { value: 4, ri: 1 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'B2.p'), W('B2.n', 'B1.n')] },
    node: { 'R1.a': 10 - 6 / 102, 'R1.b': 4 + 6 / 102 }, i: { R1: 6 / 102, B1: 6 / 102, B2: -6 / 102 }, v: { R1: 600 / 102 } },

  { name: '06 Drei Zweige an einem Knoten',
    // B1 12 V (ri 1) → R0 50 Ω → Knoten N → R1 100 Ω, R2 200 Ω, R3 400 Ω gegen B1.n.
    // Rp = 1/(1/100 + 1/200 + 1/400) = 400/7 Ω, I0 = 12/(1 + 50 + 400/7) = 84/757, U_N = I0·Rp = 4800/757.
    // Zweigstroeme U_N/100 = 48/757, U_N/200 = 24/757, U_N/400 = 12/757 (Summe 84/757 = I0, Knotenregel).
    layout: { parts: [P('B1', 'battery', { value: 12, ri: 1 }), P('R0', 'resistor', { value: 50 }), P('R1', 'resistor', { value: 100 }),
      P('R2', 'resistor', { value: 200 }), P('R3', 'resistor', { value: 400 })],
      wires: [W('B1.p', 'R0.a'), W('R0.b', 'R1.a'), W('R0.b', 'R2.a'), W('R0.b', 'R3.a'), W('R1.b', 'B1.n'), W('R2.b', 'B1.n'), W('R3.b', 'B1.n')] },
    node: { 'R1.a': 4800 / 757, 'R0.a': 12 - 84 / 757 }, i: { R0: 84 / 757, R1: 48 / 757, R2: 24 / 757, R3: 12 / 757 }, v: { R0: 50 * 84 / 757 } },

  { name: '07 Reihen-Parallel-Schaltung',
    // B1 6 V (ri 1) → R1 220 Ω → (R2 330 Ω ∥ R3 470 Ω). Rp = 330·470/800 = 193,875 Ω. Rges = 1 + 220 + 193,875 = 414,875 Ω.
    // I = 6/414,875, U(Rp) = I·193,875.
    layout: { parts: [P('B1', 'battery', { value: 6, ri: 1 }), P('R1', 'resistor', { value: 220 }), P('R2', 'resistor', { value: 330 }), P('R3', 'resistor', { value: 470 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R1.b', 'R3.a'), W('R2.b', 'B1.n'), W('R3.b', 'B1.n')] },
    node: { 'R1.b': 6 / 414.875 * 193.875 }, i: { R1: 6 / 414.875, R2: 6 / 414.875 * 193.875 / 330, R3: 6 / 414.875 * 193.875 / 470 }, v: { R2: 6 / 414.875 * 193.875 } },

  { name: '08 Zwei Quellen parallel (Millman)',
    // B1 12 V (ri 1 Ω) und B2 6 V (ri 2 Ω) parallel auf R1 10 Ω. Millman: U = (12/1 + 6/2)/(1/1 + 1/2 + 1/10) = 15/1,6 = 9,375 V.
    // Strom B1 = (12 − 9,375)/1 = 2,625 A, B2 = (6 − 9,375)/2 = −1,6875 A (wird geladen), R1 = 0,9375 A (Knotenregel: 2,625 − 1,6875).
    layout: { parts: [P('B1', 'battery', { value: 12, ri: 1 }), P('B2', 'battery', { value: 6, ri: 2 }), P('R1', 'resistor', { value: 10 })],
      wires: [W('B1.p', 'B2.p'), W('B1.p', 'R1.a'), W('B1.n', 'B2.n'), W('B1.n', 'R1.b')] },
    node: { 'R1.a': 9.375 }, i: { B1: 2.625, B2: -1.6875, R1: 0.9375 }, v: { R1: 9.375 } },

  { name: '09 Potentiometer belastet',
    // B1 10 V (ri 1), P1 10 kΩ bei pos 0,25: Raw = 2500 Ω, Rwb = 7500 Ω; Last R1 10 kΩ zwischen Schleifer und b.
    // Rwb ∥ R1 = 7500·10000/17500 = 30000/7 Ω. Rges = 1 + 2500 + 30000/7 = (7 + 17500 + 30000)/7 = 47507/7 Ω.
    // I = 10·7/47507 = 70/47507, U_w = I·30000/7 = 300000/47507.
    layout: { parts: [P('B1', 'battery', { value: 10, ri: 1 }), P('P1', 'pot', { value: 10000, pos: 0.25 }), P('R1', 'resistor', { value: 10000 })],
      wires: [W('B1.p', 'P1.a'), W('P1.b', 'B1.n'), W('P1.w', 'R1.a'), W('R1.b', 'B1.n')] },
    node: { 'P1.w': 300000 / 47507, 'P1.a': 10 - 70 / 47507 }, i: { B1: 70 / 47507, R1: 300000 / 47507 / 10000 }, v: { R1: 300000 / 47507 } },

  { name: '10 Diode in Durchlassrichtung (stückweise linear)',
    // B1 5 V (ri 1), R1 1 kΩ, Diode U_F 0,7 V, r_s 1 Ω. Durchlass: I = (5 − 0,7)/(1 + 1000 + 1) = 4,3/1002. Anode = 0,7 + I·r_s.
    layout: { parts: [P('B1', 'battery', { value: 5, ri: 1 }), P('R1', 'resistor', { value: 1000 }), P('V1', 'diode', { vf: 0.7, rs: 1 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'V1.a'), W('V1.k', 'B1.n')] },
    node: { 'V1.a': 0.7 + 4.3 / 1002, 'R1.b': 0.7 + 4.3 / 1002 }, i: { V1: 4.3 / 1002, R1: 4.3 / 1002 }, v: { V1: 0.7 + 4.3 / 1002 } },

  { name: '11 LED rot mit Vorwiderstand',
    // B1 5 V (ri 1), R1 330 Ω, LED rot (U_F 1,8 V, r_s 10 Ω): I = (5 − 1,8)/(1 + 330 + 10) = 3,2/341.
    layout: { parts: [P('B1', 'battery', { value: 5, ri: 1 }), P('R1', 'resistor', { value: 330 }), P('D1', 'led', { color: 'rot', rs: 10 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] },
    node: { 'D1.a': 1.8 + 3.2 / 341 * 10 }, i: { D1: 3.2 / 341, R1: 3.2 / 341 }, v: { R1: 3.2 / 341 * 330 } },

  { name: '12 Strommesser in Reihe (0,1 Ω Shunt)',
    // B1 10 V (ri 1), R1 99 Ω, Strommesser A1 (Shunt 0,1 Ω): I = 10/(1 + 99 + 0,1) = 10/100,1. Spannung am Messer = I·0,1.
    layout: { parts: [P('B1', 'battery', { value: 10, ri: 1 }), P('R1', 'resistor', { value: 99 }), P('A1', 'ammeter')],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'A1.a'), W('A1.b', 'B1.n')] },
    node: { 'A1.a': 10 / 100.1 * 0.1 }, i: { A1: 10 / 100.1, R1: 10 / 100.1 }, v: { A1: 10 / 100.1 * 0.1 } },

  { name: '13 Symmetrische Versorgung mit Masse-Symbol',
    // B1 5 V und B2 5 V (je ri 1) in Reihe, Mittelpunkt M an Masse GND1; Last R1 100 Ω von B1.p nach B2.n.
    // Masche: I = 10/(1 + 100 + 1) = 10/102. Gegen Masse: R1.a = +(5 − I·1), R1.b = −(5 − I·1).
    layout: { parts: [P('B1', 'battery', { value: 5, ri: 1 }), P('B2', 'battery', { value: 5, ri: 1 }), P('GND1', 'ground'), P('R1', 'resistor', { value: 100 })],
      wires: [W('B1.n', 'B2.p'), W('B1.n', 'GND1.g'), W('B1.p', 'R1.a'), W('R1.b', 'B2.n')] },
    node: { 'R1.a': 5 - 10 / 102, 'R1.b': -(5 - 10 / 102), 'B1.n': 0 }, i: { R1: 10 / 102 }, v: { R1: 1000 / 102 } },

  { name: '14 UND-Gatter belastet (5-V-Logik, 25 Ω Ausgang)',
    // E1 und E2 auf 1, UND-Gatter U1, Last R1 975 Ω gegen Masse. Ausgang: Norton 5 V / 25 Ω gegen 975 Ω → U = 5·975/(25 + 975) = 4,875 V.
    // Gattereingang: 5 V ueber 25 Ω, Eingang offen (G_OPEN 1e-12 S): U = 5/(1 + 25·1e-12) – bis auf 2,5e-11 relativ 5 V.
    layout: { parts: [P('E1', 'logicin', { closed: true }), P('E2', 'logicin', { closed: true }), P('U1', 'and'), P('R1', 'resistor', { value: 975 }), P('GND1', 'ground')],
      wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'R1.a'), W('R1.b', 'GND1.g')] },
    node: { 'U1.out': 4.875, 'U1.in1': 5 / (1 + 25e-12) }, i: { R1: 4.875 / 975 }, v: { R1: 4.875 }, out: { U1: true } },

  { name: '15 NAND-Gatter mit einer 0 am Eingang',
    // E1 = 1, E2 = 0 → NAND = 1, Ausgang belastet mit 975 Ω wie oben: 4,875 V. Eingang E2 liegt auf 0 V.
    layout: { parts: [P('E1', 'logicin', { closed: true }), P('E2', 'logicin', { closed: false }), P('U1', 'nand'), P('R1', 'resistor', { value: 975 }), P('GND1', 'ground')],
      wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'R1.a'), W('R1.b', 'GND1.g')] },
    node: { 'U1.out': 4.875, 'U1.in2': 0 }, i: { R1: 4.875 / 975 }, out: { U1: true } }
];

/* ---------- Zeitbereich ----------
 * Rueckwaerts-Euler ist in geschlossener Form loesbar; der Kern muss GENAU diese Folge liefern (nicht nur die Exponentialfunktion).
 * RC: Q = (Vs, R = ri + R1, C). Je Schritt: v(n) = (v(n−1) + a·Vs)/(1 + a) mit a = dt/(R·C)  →  v(n) = Vs·(1 − (1/(1 + a))^n). */
const transient = [
  { name: 'T1 RC-Aufladung (Rückwärts-Euler, geschlossene Form)',
    // B1 5 V (ri 1) → R1 1 kΩ → C1 10 µF → B1.n. R = 1001 Ω, C = 10 µF, dt = 1 ms: a = 1e-3/(1001·1e-5) = 1e-3/0,01001.
    layout: { parts: [P('B1', 'battery', { value: 5, ri: 1 }), P('R1', 'resistor', { value: 1000 }), P('C1', 'capacitor', { value: 1e-5 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'B1.n')] },
    dt: 1e-3, n: 100,
    check(rows) {
      const a = 1e-3 / (1001 * 1e-5), out = [];
      [1, 2, 10, 50, 100].forEach(k => {
        const want = 5 * (1 - Math.pow(1 / (1 + a), k));
        out.push({ what: 'v(C1) nach ' + k + ' Schritten', got: rows[k].v('C1'), want });
        out.push({ what: 'i(R1) nach ' + k + ' Schritten', got: rows[k].i('R1'), want: (5 - want) / 1001 });
      });
      return out;
    } }
,
  { name: 'T2 RL-Aufbau (Rückwärts-Euler, geschlossene Form)',
    // B1 10 V (ri 1) → R1 99 Ω → L1 10 mH → B1.n. R = 100 Ω, L = 10 mH, τ = L/R = 100 µs, dt = 10 µs: a = dt·R/L = 0,1.
    // Je Schritt L·(i(n) − i(n−1))/dt = U − R·i(n)  →  i(n) = (i(n−1) + a·U/R)/(1 + a) = U/R·(1 − (1/(1 + a))^n).
    layout: { parts: [P('B1', 'battery', { value: 10, ri: 1 }), P('R1', 'resistor', { value: 99 }), P('L1', 'inductor', { value: 10e-3 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'L1.a'), W('L1.b', 'B1.n')] },
    dt: 1e-5, n: 60,
    check(rows) {
      const a = 1e-5 * 100 / 10e-3, out = [];
      [1, 2, 10, 30, 60].forEach(k => {
        const i = 0.1 * (1 - Math.pow(1 / (1 + a), k));
        out.push({ what: 'i(L1) nach ' + k + ' Schritten', got: rows[k].i('L1'), want: i });
        out.push({ what: 'u(L1) nach ' + k + ' Schritten', got: rows[k].v('L1'), want: 10 - 100 * i });
      });
      return out;
    } },

  { name: 'T2b RL: gemessene Zeitkonstante (63,2 % von I∞) auf 1 % gleich L/R',
    // Gleiche Schaltung, dt = τ/200 = 0,5 µs. i(t) erreicht (1 − 1/e)·I∞ nach τ = L/R = 100 µs (Rückwärts-Euler weicht bei dt = τ/200 um 0,25 % ab).
    layout: { parts: [P('B1', 'battery', { value: 10, ri: 1 }), P('R1', 'resistor', { value: 99 }), P('L1', 'inductor', { value: 10e-3 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'L1.a'), W('L1.b', 'B1.n')] },
    dt: 5e-7, n: 1000,
    check(rows) {
      const target = 0.1 * (1 - Math.exp(-1)); let tc = NaN;
      for (let k = 1; k < rows.length; k++) { const a = rows[k - 1].i('L1') - target, b = rows[k].i('L1') - target; if (a < 0 && b >= 0) { tc = rows[k - 1].t + (-a) / (b - a) * 5e-7; break; } }
      return [{ what: 'τ gemessen = ' + (tc * 1e6).toFixed(2) + ' µs, L/R = 100 µs', got: tc, want: 1e-4, rel: 0.01 }];
    } },

  { name: 'T1b RC: gemessene Zeitkonstante (63,2 %) auf 1 % gleich R·C',
    // R = ri + R1 = 1001 Ω, C = 1 µF → τ = 1,001 ms, dt = τ/200 ≈ 5 µs.
    layout: { parts: [P('B1', 'battery', { value: 5, ri: 1 }), P('R1', 'resistor', { value: 1000 }), P('C1', 'capacitor', { value: 1e-6 })],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'B1.n')] },
    dt: 5e-6, n: 1000,
    check(rows) {
      const target = 5 * (1 - Math.exp(-1)); let tc = NaN;
      for (let k = 1; k < rows.length; k++) { const a = rows[k - 1].v('C1') - target, b = rows[k].v('C1') - target; if (a < 0 && b >= 0) { tc = rows[k - 1].t + (-a) / (b - a) * 5e-6; break; } }
      return [{ what: 'τ gemessen = ' + (tc * 1e3).toFixed(4) + ' ms, R·C = 1,001 ms', got: tc, want: 1.001e-3, rel: 0.01 }];
    } },

  { name: 'T3 Reihenschwingkreis: Frequenz f = 1/(2π√(LC)) auf 1 %',
    // B1 5 V (ri 0,05) → L1 10 mH → C1 10 µF → B1.n. ω0 = 1/√(LC) = 1/√(1e-7) = 3162,28 rad/s, f0 = 503,29 Hz, T0 = 1,98692 ms.
    // Dämpfung klein (ζ = ri/2·√(C/L) ≈ 8e-4). Sprungantwort uC(t) = U·(1 − cos ω0 t): aufsteigende Durchgänge durch U liegen genau eine Periode auseinander.
    layout: { parts: [P('B1', 'battery', { value: 5, ri: 0.05 }), P('L1', 'inductor', { value: 10e-3 }), P('C1', 'capacitor', { value: 1e-5 })],
      wires: [W('B1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'B1.n')] },
    dt: 2e-6, n: 2500,
    check(rows) {
      const ups = []; // aufsteigende Durchgänge von uC durch 5 V (Mittellage), linear interpoliert
      for (let k = 1; k < rows.length; k++) { const a = rows[k - 1].v('C1') - 5, b = rows[k].v('C1') - 5; if (a < 0 && b >= 0) ups.push(rows[k - 1].t + (-a) / (b - a) * (rows[k].t - rows[k - 1].t)); }
      const T = ups.length > 2 ? (ups[ups.length - 1] - ups[0]) / (ups.length - 1) : NaN, f = 1 / T, f0 = 1 / (2 * Math.PI * Math.sqrt(10e-3 * 1e-5));
      return [{ what: 'Schwingfrequenz (' + ups.length + ' Durchgänge, f = ' + f.toFixed(2) + ' Hz, f0 = ' + f0.toFixed(2) + ' Hz)', got: f, want: f0, rel: 0.01 }];
    } },
  { name: 'T9 Ringoszillator aus drei NICHT-Gattern schwingt (Periode 6 Gatterlaufzeiten)',
    // Ohne stabilen Arbeitspunkt schaltet je Zeitschritt genau ein Gatter (Laufzeit = ein Schritt). Handgerechnet für drei NICHT im Ring: der Kreis hat
    // sechs Zustände (100 101 001 011 010 110), je Schritt kippt genau ein Bit, nach sechs Schritten ist der Anfang wieder da. Die Phase hängt vom
    // Zustand nach dem Arbeitspunkt ab und wird nicht verlangt. Außerdem muss UNSTABLE gemeldet werden.
    layout: { parts: [P('U1', 'not'), P('U2', 'not'), P('U3', 'not')], wires: [W('U1.out', 'U2.in'), W('U2.out', 'U3.in'), W('U3.out', 'U1.in')] },
    dt: 1e-9, n: 24,
    check(rows) {
      const bits = k => ['U1', 'U2', 'U3'].map(id => rows[k].part(id).out ? 1 : 0), val = k => bits(k).join(''), out = [];
      for (let k = 2; k <= 24; k++) out.push({ what: 'Schritt ' + k + ': genau ein Gatter kippt', got: bits(k).filter((b, j) => b !== bits(k - 1)[j]).length, want: 1 });
      for (let k = 7; k <= 24; k++) out.push({ what: 'Schritt ' + k + ': Periode 6', got: Number('0b' + val(k)), want: Number('0b' + val(k - 6)) });
      out.push({ what: 'sechs verschiedene Zustände in sechs Schritten', got: new Set([7, 8, 9, 10, 11, 12].map(val)).size, want: 6 });
      out.push({ what: 'Zustände 000 und 111 kommen nicht vor', got: [7, 8, 9, 10, 11, 12].filter(k => val(k) === '000' || val(k) === '111').length, want: 0 });
      out.push({ what: 'meldet UNSTABLE', got: rows[24].faults.some(f => f.code === 'UNSTABLE') ? 1 : 0, want: 1 });
      return out;
    } }
];

/* ---------- Wechselstromanalyse (Stufe 7) ----------
 * Quelle G1 mit ri = 0,05 Ω (Reiz 1 V). Alle Sollwerte mit der Gesamtimpedanz einschliesslich ri. */
const acCases = [
  { name: 'A1 RC-Tiefpass: H(jω) = 1/(1 + jωRC) bis 1e-9',
    // R = 1 kΩ + ri 0,05 Ω = 1000,05 Ω, C = 100 nF. H = 1/(1 + jωτ) mit τ = 1000,05·1e-7. Betrag 1/√(1+(ωτ)²), Phase −atan(ωτ).
    layout: { parts: [P('G1', 'acsource', { value: 1, ri: 0.05 }), P('R1', 'resistor', { value: 1000 }), P('C1', 'capacitor', { value: 1e-7 })], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] },
    check(kern) {
      const tau = 1000.05 * 1e-7, out = [];
      [10, 500, 1591.5494, 10000, 100000].forEach(f => { const h = kern.ac(this.layout, { a: 'C1.a', b: 'C1.b' }, f), wt = 2 * Math.PI * f * tau;
        out.push({ what: '|H| bei ' + f + ' Hz', got: h.mag, want: 1 / Math.sqrt(1 + wt * wt) }); out.push({ what: 'Phase bei ' + f + ' Hz', got: h.phase, want: -Math.atan(wt) * 180 / Math.PI, abs: 1e-7 }); });
      return out;
    } },
  { name: 'A2 RC-Tiefpass: −3 dB bei fg = 1/(2πRC) auf 1 %, −20 dB je Dekade, Phase −45° bei fg',
    layout: { parts: [P('G1', 'acsource', { value: 1, ri: 0.05 }), P('R1', 'resistor', { value: 1000 }), P('C1', 'capacitor', { value: 1e-7 })], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] },
    // fg = 1/(2π·1000·100 nF) = 1591,55 Hz. Abfall: bei 10·fg und 100·fg ≈ −20,04 dB bzw. −40,00 dB (Steigung −20 dB/Dekade).
    check(kern) {
      const fg = 1 / (2 * Math.PI * 1000 * 1e-7), out = [], at = f => kern.ac(this.layout, { a: 'C1.a', b: 'C1.b' }, f);
      // −3 dB-Frequenz suchen (Halbierung der Betragsgleichung)
      let lo = fg / 4, hi = fg * 4; for (let k = 0; k < 60; k++) { const m = Math.sqrt(lo * hi); if (at(m).db > -3.0103) lo = m; else hi = m; }
      out.push({ what: '−3 dB bei ' + lo.toFixed(2) + ' Hz, fg = ' + fg.toFixed(2) + ' Hz', got: lo, want: fg, rel: 0.01 });
      const d1 = at(10 * fg).db, d2 = at(100 * fg).db; out.push({ what: 'Abfall 10·fg → 100·fg = ' + (d2 - d1).toFixed(3) + ' dB/Dekade', got: d2 - d1, want: -20, rel: 0.01 });
      out.push({ what: 'Phase bei fg = ' + at(fg).phase.toFixed(3) + '°', got: at(fg).phase, want: -45, rel: 0.01 });
      return out;
    } },
  { name: 'A3 RLC-Reihenschwingkreis: Resonanzfrequenz und Güte',
    // R = 10 Ω (+ ri 0,05), L = 10 mH, C = 10 µF; Ausgang an R. f0 = 1/(2π√(LC)) = 503,29 Hz; Rges = 10,05 Ω; Q = (1/Rges)·√(L/C) = 3,1466;
    // Bandbreite zwischen den −3-dB-Punkten Δf = f0/Q. Bei f0 ist H = R/Rges = 0,99502.
    layout: { parts: [P('G1', 'acsource', { value: 1, ri: 0.05 }), P('L1', 'inductor', { value: 10e-3 }), P('C1', 'capacitor', { value: 1e-5 }), P('R1', 'resistor', { value: 10 })],
      wires: [W('G1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n')] },
    check(kern) {
      const f0 = 1 / (2 * Math.PI * Math.sqrt(10e-3 * 1e-5)), Q = Math.sqrt(10e-3 / 1e-5) / 10.05, at = f => kern.ac(this.layout, { a: 'R1.a', b: 'R1.b' }, f), out = [];
      let best = f0 * 0.5, bm = 0; for (let f = f0 * 0.5; f < f0 * 1.5; f *= 1.0005) { const m = at(f).mag; if (m > bm) { bm = m; best = f; } }
      out.push({ what: 'Resonanzfrequenz ' + best.toFixed(2) + ' Hz, f0 = ' + f0.toFixed(2) + ' Hz', got: best, want: f0, rel: 0.01 });
      out.push({ what: 'Betrag bei f0 = R/Rges', got: at(f0).mag, want: 10 / 10.05, rel: 1e-6 });
      const inside = f => at(f).mag > bm / Math.SQRT2, edge = (outer, inner) => { for (let k = 0; k < 80; k++) { const m = (outer + inner) / 2; if (inside(m)) inner = m; else outer = m; } return (outer + inner) / 2; };
      const fl = edge(f0 * 0.5, f0), fu = edge(f0 * 2, f0), Qm = f0 / (fu - fl);
      out.push({ what: 'Güte aus der Bandbreite Q = ' + Qm.toFixed(3) + ', Rechnung ' + Q.toFixed(3), got: Qm, want: Q, rel: 0.01 });
      out.push({ what: 'Phase bei f0 = 0°', got: Math.abs(at(f0).phase), want: 0, abs: 0.05 });
      return out;
    } }
];

/* ---------- Digitaltechnik (Stufe 3) ----------
 * Wahrheits- und Folgetabellen als Literale (Standardtabellen der Digitaltechnik, nicht aus der Engine abgeleitet).
 * Jeder Fall: layout + steps; Schritt = { set: [[id, prop, wert]…], dt?, expect: { 'U1.out': true … } }. Quelle fuer Pegel: Pegelschalter E1…, Takt EC, preSet EP, preClear EQ. */
const digital = [];
const lin = (id, closed) => P(id, 'logicin', { closed: !!closed });
// Gatter: Tabellen nach Index = Eingangsbits, in1 = hoechstwertiges Bit
const GATE_TABLE = {
  2: { and: '0001', or: '0111', nand: '1110', nor: '1000', xor: '0110', xnor: '1001' },
  3: { and: '00000001', or: '01111111', nand: '11111110', nor: '10000000', xor: '01101001', xnor: '10010110' },
  4: { xor: '0110100110010110', nand: '1111111111111110', nor: '1000000000000000' }
};
Object.keys(GATE_TABLE).forEach(n => Object.keys(GATE_TABLE[n]).forEach(type => {
  n = +n; const tab = GATE_TABLE[n][type], parts = [P('U1', type, { inputs: n })], wires = [];
  for (let k = 1; k <= n; k++) { parts.push(lin('E' + k)); wires.push(W('E' + k + '.out', 'U1.in' + k)); }
  const steps = [];
  for (let i = 0; i < (1 << n); i++) {
    const set = []; for (let k = 1; k <= n; k++) set.push(['E' + k, 'closed', !!((i >> (n - k)) & 1)]);
    steps.push({ set, expect: { 'U1.out': tab[i] === '1' } });
  }
  digital.push({ name: 'D ' + type.toUpperCase() + ' mit ' + n + ' Eingängen: Wahrheitstabelle (' + (1 << n) + ' Zeilen)', layout: { parts, wires }, steps });
}));
{ // NICHT
  const steps = [{ set: [['E1', 'closed', false]], expect: { 'U1.out': true } }, { set: [['E1', 'closed', true]], expect: { 'U1.out': false } }];
  digital.push({ name: 'D NICHT: Wahrheitstabelle', layout: { parts: [P('U1', 'not'), lin('E1')], wires: [W('E1.out', 'U1.in')] }, steps });
}
// Flipflops: Tabelle aus Zeilen [Eingaenge…, Q vorher, Q nachher]; Q vorher wird ueber preSet/preClear hergestellt (testet beide mit)
function ffCase(name, type, trig, insPins, table, edge) {
  const parts = [P('FF1', type, { trig })], wires = [W('EC.out', 'FF1.C'), W('EP.out', 'FF1.PS'), W('EQ.out', 'FF1.PC')];
  parts.push(lin('EC', edge === 'neg' || trig === 'level' ? false : false), lin('EP'), lin('EQ'));
  insPins.forEach((pin, k) => { parts.push(lin('I' + k)); wires.push(W('I' + k + '.out', 'FF1.' + pin)); });
  const steps = [];
  table.forEach((row, ri) => {
    const ins = row.slice(0, insPins.length), q0 = row[insPins.length], q1 = row[insPins.length + 1];
    // Ausgangszustand: Takt 0 (bzw. 1 bei fallender Flanke), Eingaenge neutral, preSet/preClear setzen Q
    const idle = trig === 'neg' || type === 'jkms' ? true : false;
    steps.push({ set: [['EC', 'closed', idle], ...insPins.map((p, k) => ['I' + k, 'closed', false]), ['EP', 'closed', q0], ['EQ', 'closed', !q0]] });
    steps.push({ set: [['EP', 'closed', false], ['EQ', 'closed', false]], expect: { 'FF1.q': q0 } });
    steps.push({ set: insPins.map((p, k) => ['I' + k, 'closed', !!ins[k]]) });
    if (trig === 'level') steps.push({ set: [['EC', 'closed', true]], expect: { 'FF1.q': q1 } }, { set: [['EC', 'closed', false]], expect: { 'FF1.q': q1 } });
    else if (idle) steps.push({ set: [['EC', 'closed', false]], expect: { 'FF1.q': q1 } }, { set: [['EC', 'closed', true]], expect: { 'FF1.q': q1 } }); // C: 1 → 0 uebernimmt
    else steps.push({ set: [['EC', 'closed', true]], expect: { 'FF1.q': q1 } }, { set: [['EC', 'closed', false]], expect: { 'FF1.q': q1 } }); // C: 0 → 1 uebernimmt, Rueckflanke aendert nichts
  });
  digital.push({ name: name, layout: { parts, wires }, steps });
}
const T = true, F = false;
ffCase('D D-Flipflop (steigende Flanke): Q+ = D', 'dff', 'pos', ['D'], [[F, F, F], [T, F, T], [F, T, F], [T, T, T]]);
ffCase('D T-Flipflop (steigende Flanke): T=0 halten, T=1 kippen', 'tff', 'pos', ['T'], [[F, F, F], [F, T, T], [T, F, T], [T, T, F]]);
ffCase('D JK-Flipflop (steigende Flanke): 00 halten, 01 zurück, 10 setzen, 11 kippen', 'jkff', 'pos',
  ['J', 'K'], [[F, F, F, F], [F, F, T, T], [F, T, F, F], [F, T, T, F], [T, F, F, T], [T, F, T, T], [T, T, F, T], [T, T, T, F]]);
ffCase('D JK-Flipflop (fallende Flanke): gleiche Tabelle bei C 1 → 0', 'jkff', 'neg',
  ['J', 'K'], [[F, F, F, F], [F, F, T, T], [F, T, F, F], [F, T, T, F], [T, F, F, T], [T, F, T, T], [T, T, F, T], [T, T, T, F]]);
ffCase('D D-Flipflop (taktzustandsgesteuert): Q+ = D solange C = 1', 'dff', 'level', ['D'], [[F, F, F], [T, F, T], [F, T, F], [T, T, T]]);
ffCase('D RS-Flipflop (taktzustandsgesteuert): 00 halten, 01 zurück, 10 setzen', 'rsff', 'level',
  ['S', 'R'], [[F, F, F, F], [F, F, T, T], [F, T, F, F], [F, T, T, F], [T, F, F, T], [T, F, T, T]]);
ffCase('D JK-MS-Flipflop (Slave bei fallender Flanke): Tabelle wie JK', 'jkms', 'ms',
  ['J', 'K'], [[F, F, F, F], [F, F, T, T], [F, T, F, F], [F, T, T, F], [T, F, F, T], [T, F, T, T], [T, T, F, T], [T, T, T, F]]);
digital.push({ name: 'D preSet/preClear setzen Q unabhängig vom Takt (Vorrang vor C, beide zugleich = unzulässig)',
  layout: { parts: [P('FF1', 'dff'), lin('EC'), lin('ED', true), lin('EP'), lin('EQ')], wires: [W('EC.out', 'FF1.C'), W('ED.out', 'FF1.D'), W('EP.out', 'FF1.PS'), W('EQ.out', 'FF1.PC')] },
  steps: [
    { set: [['EP', 'closed', true]], expect: { 'FF1.q': true } },                         // preSet ohne Takt
    { set: [['EC', 'closed', true]], expect: { 'FF1.q': true } },                          // Takt mit D = 1 bei gesetztem preSet: bleibt 1
    { set: [['EP', 'closed', false], ['EQ', 'closed', true]], expect: { 'FF1.q': false } }, // preClear ohne Takt
    { set: [['EC', 'closed', false]], expect: { 'FF1.q': false } },
    { set: [['EC', 'closed', true]], expect: { 'FF1.q': false } },                         // steigende Flanke bei gedrücktem preClear: Takt wird übergangen
    { set: [['EQ', 'closed', false], ['EC', 'closed', false]], expect: { 'FF1.q': false } },
    { set: [['EC', 'closed', true]], expect: { 'FF1.q': true } },                          // jetzt übernimmt der Takt D = 1
    { set: [['EP', 'closed', true], ['EQ', 'closed', true]], expect: { 'FF1.forbidden': true } }   // beide aktiv: unzulässig, markiert
  ] });

// Zähler (Stufe 4): Takt EC am Pegelschalter, Zählerstand nach jeder steigenden Flanke (Literal-Folgen)
function ctrCase(name, type, props, expectSeq, bitsOf) {
  const steps = [];
  expectSeq.forEach(n => { steps.push({ set: [['EC', 'closed', true]], expect: { 'Z1.count': n } }, { set: [['EC', 'closed', false]], expect: { 'Z1.count': n } }); });
  digital.push({ name: name, layout: { parts: [P('Z1', type, props), lin('EC')], wires: [W('EC.out', 'Z1.C')] }, steps });
}
ctrCase('D Dezimalzähler (BCD) zählt 0 bis 9 und springt auf 0', 'ctr_bcd', {}, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2]);
ctrCase('D Modulo-6-Zähler zählt 0 bis 5', 'ctr_mod', { modn: 6 }, [1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]);
ctrCase('D Modulo-10-Zähler (4 Bit) zählt 0 bis 9', 'ctr_mod', { modn: 10 }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
ctrCase('D Asynchroner Dualzähler 3 Bit aufwärts', 'ctr_async', { bits: 3 }, [1, 2, 3, 4, 5, 6, 7, 0, 1]);
ctrCase('D Asynchroner Dualzähler 3 Bit abwärts', 'ctr_async', { bits: 3, dir: 'down' }, [7, 6, 5, 4, 3, 2, 1, 0, 7]);
ctrCase('D Synchroner Dualzähler 4 Bit aufwärts (16 Zustände, dann 0)', 'ctr_sync', { bits: 4 }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1]);
ctrCase('D Johnson-Zähler 4 Bit (8 Zustände)', 'ctr_johnson', { bits: 4 }, [1, 2, 3, 4, 5, 6, 7, 0, 1]);
digital.push({ name: 'D Zähler: Rückstellen R setzt auf 0, unabhängig vom Takt',
  layout: { parts: [P('Z1', 'ctr_bcd', {}), lin('EC'), lin('ER')], wires: [W('EC.out', 'Z1.C'), W('ER.out', 'Z1.R')] },
  steps: [{ set: [['EC', 'closed', true]], expect: { 'Z1.count': 1 } }, { set: [['EC', 'closed', false]] }, { set: [['EC', 'closed', true]], expect: { 'Z1.count': 2 } },
    { set: [['ER', 'closed', true]], expect: { 'Z1.count': 0 } }, { set: [['EC', 'closed', false]] }, { set: [['EC', 'closed', true]], expect: { 'Z1.count': 0 } },
    { set: [['ER', 'closed', false], ['EC', 'closed', false]], expect: { 'Z1.count': 0 } }, { set: [['EC', 'closed', true]], expect: { 'Z1.count': 1 } }] });
digital.push({ name: 'D Zähler mit fallender Taktflanke zählt bei C 1 → 0',
  layout: { parts: [P('Z1', 'ctr_bcd', { trig: 'neg' }), lin('EC', true)], wires: [W('EC.out', 'Z1.C')] },
  steps: [{ set: [['EC', 'closed', false]], expect: { 'Z1.count': 1 } }, { set: [['EC', 'closed', true]], expect: { 'Z1.count': 1 } }, { set: [['EC', 'closed', false]], expect: { 'Z1.count': 2 } }] });

/* preSet/preClear: alle Kombinationen aus PS, PC, Takt und Dateneingang je Flipflop-Typ. Beide gleichzeitig = unzulaessig: Q und /Q beide 1, gemeldet (FF_RS, why async).
 * Verlassen: bleibt nur PS, gilt Q = 1; bleibt nur PC, gilt Q = 0. */
function asyncCheck(kern, chk) {
  const types = { dff: ['D'], tff: ['T'], jkff: ['J', 'K'], rsff: ['S', 'R'], jkms: ['J', 'K'] };
  Object.keys(types).forEach(type => {
    const ins = types[type], name = 'D preSet/preClear-Kombinationen ' + type;
    for (let ps = 0; ps < 2; ps++) for (let pc = 0; pc < 2; pc++) for (let clk = 0; clk < 2; clk++) for (let dv = 0; dv < 2; dv++) {
      const parts = [P('FF1', type), lin('EC'), lin('EP'), lin('EQ')], wires = [W('EC.out', 'FF1.C'), W('EP.out', 'FF1.PS'), W('EQ.out', 'FF1.PC')];
      ins.forEach((pin, k) => { parts.push(lin('I' + k)); wires.push(W('I' + k + '.out', 'FF1.' + pin)); });
      const s = kern.session({ parts, wires });
      ins.forEach((pin, k) => s.set('I' + k, 'closed', !!dv));
      s.eval(); s.set('EC', 'closed', !!clk); s.set('EP', 'closed', !!ps); s.set('EQ', 'closed', !!pc); s.eval(); const v = s.eval();
      const tag = ' [PS=' + ps + ' PC=' + pc + ' C=' + clk + ' Dat=' + dv + ']', flagged = v.faults.some(f => f.code === 'FF_RS' && f.why === 'async');
      chk(name, 'unzulässig gemeldet nur bei PS und PC' + tag, flagged, !!(ps && pc));
      if (ps && pc) { chk(name, 'Q = 1' + tag, v.node('FF1.Q') > 2.5, true); chk(name, '/Q = 1' + tag, v.node('FF1.Qn') > 2.5, true); chk(name, 'Bauteil als verboten markiert' + tag, !!v.part('FF1').forbidden, true);
        s.set('EC', 'closed', false); s.set('EQ', 'closed', false); const a = s.eval(); chk(name, 'nach Wegnahme von PC: Q = 1' + tag, a.part('FF1').q, true); chk(name, 'nicht mehr gemeldet' + tag, a.faults.some(f => f.why === 'async'), false);
        const s2 = kern.session({ parts, wires }); s2.set('EP', 'closed', true); s2.set('EQ', 'closed', true); s2.eval(); s2.set('EP', 'closed', false); const b = s2.eval(); chk(name, 'nach Wegnahme von PS: Q = 0' + tag, b.part('FF1').q, false); }
      else if (ps) chk(name, 'nur preSet: Q = 1' + tag, v.part('FF1').q, true);
      else if (pc) chk(name, 'nur preClear: Q = 0' + tag, v.part('FF1').q, false);
    }
  });
  // RS-Flipflop: S = R = 1 wird genauso markiert (eine Darstellung)
  const rs = kern.session({ parts: [P('FF1', 'rsff'), lin('EC', true), lin('S', true), lin('R', true)], wires: [W('EC.out', 'FF1.C'), W('S.out', 'FF1.S'), W('R.out', 'FF1.R')] });
  rs.eval(); const r = rs.eval();
  chk('D RS verboten', 'S = R = 1 markiert wie der unzulässige preSet/preClear-Zustand', !!r.part('FF1').forbidden && r.faults.some(f => f.code === 'FF_RS' && f.why === 'rs'), true);
}

function runDigital(kern, c, chk, log) {
  const sess = kern.session(c.layout); let before = 0;
  c.steps.forEach((st, k) => {
    (st.set || []).forEach(x => sess.set(x[0], x[1], x[2]));
    const v = sess.eval(st.dt);
    Object.keys(st.expect || {}).forEach(key => { const [id, what] = key.split('.'); chk(c.name, 'Schritt ' + (k + 1) + ' ' + key, v.part(id)[what], st.expect[key]); });
  });
}
/* Spiegelbild-Vergleich: JK mit fallender Flanke an /CLK verhaelt sich wie JK mit steigender Flanke an CLK (gleiche J/K-Folge, 200 Takthalbperioden) */
function mirrorCheck(kern, chk) {
  const name = 'D JK fallende Flanke ≙ steigende Flanke (Spiegelbild im Zeitverlauf)';
  const layout = { parts: [P('EC', 'logicin'), P('N1', 'not'), lin('J'), lin('K'), P('FA', 'jkff', { trig: 'pos' }), P('FB', 'jkff', { trig: 'neg' })],
    wires: [W('EC.out', 'FA.C'), W('EC.out', 'N1.in'), W('N1.out', 'FB.C'), W('J.out', 'FA.J'), W('J.out', 'FB.J'), W('K.out', 'FA.K'), W('K.out', 'FB.K')] };
  const s = kern.session(layout); let seed = 7, ok = true, first = null;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  s.eval();
  for (let k = 0; k < 200; k++) {
    s.set('J', 'closed', rnd() < 0.5); s.set('K', 'closed', rnd() < 0.5); s.eval();
    s.set('EC', 'closed', k % 2 === 0); const v = s.eval();
    if (v.part('FA').q !== v.part('FB').q && ok) { ok = false; first = k; }
  }
  chk(name, 'Q gleich in allen 200 Halbperioden' + (first !== null ? ' (erste Abweichung bei ' + first + ')' : ''), ok, true);
}

function run(kern, log) {
  log = log || console.log;
  let ok = 0, bad = 0;
  const fail = (name, what, got, want) => { bad++; log('  ✗ ' + name + ' – ' + what + ': ' + got + ' statt ' + want); };
  const chk = (name, what, got, want, rel) => { if (typeof want === 'boolean' ? got === want : rel ? Math.abs(got - want) <= rel * Math.abs(want) : near(got, want)) ok++; else fail(name, what, got, want); };
  kern.setup && kern.setup();
  try {
    cases.forEach(c => {
      let r; try { r = kern.dc(c.layout); } catch (e) { fail(c.name, 'Rechnung', e.message, 'Ergebnis'); return; }
      const before = bad;
      Object.keys(c.node || {}).forEach(k => chk(c.name, 'U(' + k + ')', r.node(k), c.node[k]));
      Object.keys(c.i || {}).forEach(k => chk(c.name, 'I(' + k + ')', r.i(k), c.i[k]));
      Object.keys(c.v || {}).forEach(k => chk(c.name, 'U über ' + k, r.v(k), c.v[k]));
      Object.keys(c.out || {}).forEach(k => chk(c.name, 'Ausgang ' + k, r.part(k).out, c.out[k]));
      log((bad === before ? '  ✓ ' : '  ✗ ') + c.name);
    });
    acCases.forEach(c => {
      if (!kern.ac) { log('  – ' + c.name + ' (Kern ohne ac)'); return; }
      const before = bad; let xs; try { xs = c.check(kern); } catch (e) { fail(c.name, 'Rechnung', e.message, 'Ergebnis'); return; }
      xs.forEach(x => { if (x.abs !== undefined && !x.rel) { if (Math.abs(x.got - x.want) <= x.abs) ok++; else fail(c.name, x.what, x.got, x.want); } else chk(c.name, x.what, x.got, x.want, x.rel); });
      log((bad === before ? '  ✓ ' : '  ✗ ') + c.name);
    });
    digital.forEach(c => {
      const before = bad;
      try { runDigital(kern, c, chk, log); } catch (e) { fail(c.name, 'Rechnung', e.message, 'Ergebnis'); }
      log((bad === before ? '  ✓ ' : '  ✗ ') + c.name);
    });
    { const before = bad; asyncCheck(kern, chk); log((bad === before ? '  ✓ ' : '  ✗ ') + 'D preSet/preClear alle Kombinationen je Flipflop-Typ'); }
    { const before = bad; mirrorCheck(kern, chk); log((bad === before ? '  ✓ ' : '  ✗ ') + 'D JK fallende Flanke ≙ steigende Flanke (Spiegelbild im Zeitverlauf)'); }
    transient.forEach(c => {
      let rows; try { rows = kern.transient(c.layout, { dt: c.dt, n: c.n }); } catch (e) { fail(c.name, 'Rechnung', e.message, 'Ergebnis'); return; }
      const before = bad;
      c.check(rows).forEach(x => chk(c.name, x.what, x.got, x.want, x.rel));
      log((bad === before ? '  ✓ ' : '  ✗ ') + c.name);
    });
  } finally { kern.teardown && kern.teardown(); }
  return { ok, bad, cases: cases.length + transient.length + acCases.length + digital.length + 1 };
}

module.exports = { cases, transient, digital, run, Kern, near, TOL, P, W };
if (require.main === module) {
  console.log('Rechenkern-Konformität: ' + Kern.name + ', Toleranz ' + TOL + ' relativ');
  const r = run(Kern);
  console.log('Kern-Tests: ' + r.cases + ' Schaltungen, ' + r.ok + ' Prüfwerte ok, ' + r.bad + ' Fehler');
  process.exit(r.bad ? 1 : 0);
}

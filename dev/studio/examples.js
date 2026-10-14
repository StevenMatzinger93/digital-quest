/* Digital Quest Studio – Beispiele (Stufe 6, Menü «Beispiele»)
 * Mitgelieferte Schaltungen. Jedes Beispiel: {id, name, text, build() → {layout, scopes?, timing?, run?}}.
 * Die Digitaluhr ist das Zielbild des Studios: Taktgeber 1 Hz, Sekundenzähler (Einer 0–9, Zehner 0–5), BCD-Dekoder, zwei Siebensegmentanzeigen. */
(function (root) {
  'use strict';
  var S = root.Studio, E = root.DQEngine;
  var W = function (a, b) { return { from: a, to: b }; };
  function part(id, type, x, y, props, value) { var p = { id: id, type: type, x: x, y: y, rot: 0 }; if (props) p.props = props; if (value !== undefined) p.value = value; return p; }

  /* Digitaluhr: Sekunden 00 … 59. Der Zehnerzähler zählt bei der fallenden Flanke von Q3 des Einerzählers (9 → 0). */
  function digitaluhr() {
    var parts = [
      part('CLK1', 'clock', 200, 300, { freq: 1 }),
      part('Z1', 'ctr_bcd', 460, 300), part('Z2', 'ctr_mod', 460, 560, { modn: 6, trig: 'neg' }),
      part('IC1', 'dec7', 760, 300), part('IC2', 'dec7', 760, 560),
      part('AZ1', 'seg7', 1060, 300), part('AZ2', 'seg7', 1060, 560),
      part('GND1', 'ground', 620, 700)
    ], wires = [W('CLK1.out', 'Z1.C'), W('Z1.Q3', 'Z2.C'), W('GND1.g', 'IC2.D')];
    ['A', 'B', 'C', 'D'].forEach(function (p, k) { wires.push(W('Z1.Q' + k, 'IC1.' + p)); });
    ['A', 'B', 'C'].forEach(function (p, k) { wires.push(W('Z2.Q' + k, 'IC2.' + p)); });
    'abcdefg'.split('').forEach(function (s) { wires.push(W('IC1.' + s, 'AZ1.' + s)); wires.push(W('IC2.' + s, 'AZ2.' + s)); });
    return { layout: { parts: parts, wires: wires },
      timing: { rows: [{ kind: 'dig', a: 'CLK1.out' }], buses: [{ label: 'Einer', bits: [0, 1, 2, 3].map(function (k) { return { kind: 'dig', a: 'Z1.Q' + k }; }) }, { label: 'Zehner', bits: [0, 1, 2].map(function (k) { return { kind: 'dig', a: 'Z2.Q' + k }; }) }] } };
  }
  function rcGlied() {
    return { layout: { parts: [part('G1', 'acsource', 240, 300, { freq: 50, shape: 'square', ri: 0.05 }, 5), part('R1', 'resistor', 520, 200, null, 1000), part('C1', 'capacitor', 800, 300, null, 1e-6), part('GND1', 'ground', 520, 440)],
      wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n'), W('G1.n', 'GND1.g')].map(function (w) { return w; }) },
      scopes: [{ channels: [{ kind: 'node', a: 'R1.b' }, { kind: 'node', a: 'G1.p' }] }] };
  }
  function schwingkreis() {
    return { layout: { parts: [part('B1', 'battery', 240, 300, { ri: 0.05 }, 5), part('L1', 'inductor', 520, 200, null, 10e-3), part('C1', 'capacitor', 800, 300, null, 10e-6), part('GND1', 'ground', 520, 440)],
      wires: [W('B1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'B1.n'), W('B1.n', 'GND1.g')] },
      scopes: [{ channels: [{ kind: 'node', a: 'C1.a' }], span: 0.01 }] };
  }
  function teiler() {
    return { layout: { parts: [part('B1', 'battery', 240, 300, null, 9), part('R1', 'resistor', 520, 200, null, 1000), part('R2', 'resistor', 800, 300, null, 2000), part('GND1', 'ground', 520, 440)],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n'), W('B1.n', 'GND1.g')] }, run: false };
  }
  /* Asynchroner 4-Bit-Zähler aus Flipflops (aufgeklappt) bei 1 MHz: im Zeitverlauf kommen die Flanken der höheren Stufen später */
  function asyncZaehler() {
    var C = root.DQStudioCounters, ex = C.expansion('ctr_async', { bits: 4 }), parts = [part('CLK1', 'clock', 200, 300, { freq: 1e6 }), part('GND1', 'ground', 200, 460)], wires = [];
    var id = {}; ex.parts.forEach(function (p, i) { id[p.key] = 'FF' + (i + 1); parts.push(part(id[p.key], p.type, 420 + p.x + 280, 300 + p.y + 120, p.props)); });
    var ren = function (pin) { var a = pin.split('.'); return id[a[0]] + '.' + a[1]; };
    ex.wires.forEach(function (w) { wires.push(W(ren(w[0]), ren(w[1]))); });
    wires.push(W('CLK1.out', ren(ex.map.C)));
    return { layout: { parts: parts, wires: wires }, timing: { auto: true } };
  }
  function logik() {
    return { layout: { parts: [part('E1', 'logicin', 240, 260), part('E2', 'logicin', 240, 360), part('U1', 'xor', 520, 310), part('U2', 'and', 520, 460), part('L1', 'logicled', 800, 310), part('L2', 'logicled', 800, 460), part('GND1', 'ground', 240, 520)],
      wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('E1.out', 'U2.in1'), W('E2.out', 'U2.in2'), W('U1.out', 'L1.in'), W('U2.out', 'L2.in')] }, run: false };
  }

  function tiefpass() {
    return { layout: { parts: [part('G1', 'acsource', 240, 300, { freq: 1000, shape: 'sine', ri: 0.05 }, 1), part('R1', 'resistor', 520, 200, null, 1000), part('C1', 'capacitor', 800, 300, null, 1e-7), part('GND1', 'ground', 520, 440)],
      wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n'), W('G1.n', 'GND1.g')] },
      bode: [{ channels: [{ a: 'C1.a' }] }], run: false };
  }
  function rlc() {
    return { layout: { parts: [part('G1', 'acsource', 240, 300, { freq: 500, shape: 'sine', ri: 0.05 }, 1), part('L1', 'inductor', 480, 200, null, 10e-3), part('C1', 'capacitor', 720, 200, null, 10e-6), part('R1', 'resistor', 900, 300, null, 10), part('GND1', 'ground', 520, 440)],
      wires: [W('G1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n'), W('G1.n', 'GND1.g')] },
      bode: [{ channels: [{ a: 'R1.a' }] }], run: false };
  }
  var LIST = [
    { id: 'uhr', name: 'Digitaluhr (Sekunden 00 – 59)', text: 'Taktgeber 1 Hz, Einer (0–9) und Zehner (0–5), BCD-Dekoder, zwei Siebensegmentanzeigen.', build: digitaluhr },
    { id: 'zaehler', name: 'Asynchroner Zähler mit Zeitverlauf', text: '4 Bit aus Flipflops bei 1 MHz: Die höheren Stufen schalten mit Laufzeit später.', build: asyncZaehler },
    { id: 'rc', name: 'RC-Glied an Rechteckquelle', text: 'Lade- und Entladekurve im Oszilloskop; «τ bestimmen» liefert R·C = 1 ms.', build: rcGlied },
    { id: 'tiefpass', name: 'RC-Tiefpass: Bode-Diagramm', text: '−3 dB bei fg = 1/(2π·R·C) = 1,59 kHz, −20 dB je Dekade, Phase −45° bei fg.', build: tiefpass },
    { id: 'rlc', name: 'Reihenschwingkreis: Resonanzkurve', text: 'Resonanz bei 503 Hz, Güte Q ≈ 3,1 (Bandpass über R).', build: rlc },
    { id: 'lc', name: 'Schwingkreis aus L und C', text: 'Sprungantwort einer Reihenschaltung: f = 1 / (2π·√(L·C)) = 503 Hz.', build: schwingkreis },
    { id: 'teiler', name: 'Spannungsteiler', text: '9 V an 1 kΩ und 2 kΩ: Bauteil anklicken zeigt Spannung und Strom.', build: teiler },
    { id: 'logik', name: 'Halbaddierer (XOR und UND)', text: 'Pegelschalter links anklicken: Summe (XOR) und Übertrag (UND).', build: logik }
  ];
  S.examples = LIST;
  S.loadExample = function (id) {
    var ex = LIST.filter(function (e) { return e.id === id; })[0]; if (!ex) return false;
    var b = ex.build(); S.loadLayout(b.layout, { scopes: b.scopes, timing: b.timing, bode: b.bode, run: b.run }); return true;
  };
  S.initExamples = function () {
    S.setMenu('bsp', LIST.map(function (e) { return { label: e.name, act: function () { S.loadExample(e.id); } }; }));
  };
  S.digitaluhr = digitaluhr;
})(window);

/* Digital Quest – Pruefungspool (Zertifikat): Aufgabenvorlagen mit Parametern. Format: src/exam_core.js.
 * Diese Datei wird NICHT ins Spiel eingebaut – nur in den Worker (worker/gen/exam_bundle.js) und in den Validator
 * (validate_exam.js). Der Browser bekommt je Pruefung nur die oeffentliche Fassung der gezogenen Aufgaben.
 * Grundstufe G01–G11 (Kapitel 1–10), Profi-Stufe P01–P10 (Kapitel 11–15). Theoriefragen: build.js (aus den Lektionen). */
(function (root) {
  'use strict';
  var W = root.W, LG = root.LG, T = root.defExamTask;
  function P(id, type, x, y, rot, value, props) { var p = { id: id, type: type, x: x, y: y, rot: rot || 0 }; if (value !== undefined && value !== null) p.value = value; if (props) p.props = props; return p; }
  function lay(parts, wires) { return { parts: parts, wires: wires || [] }; }
  function plus(l, parts, wires) { return { parts: l.parts.concat(parts || []), wires: l.wires.concat(wires || []) }; }
  function named(name, l) { return { name: name, parts: l.parts, wires: l.wires }; }
  var E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  function e12(r) { var best = 10, d = Infinity; for (var e = 0; e <= 6; e++) E12.forEach(function (m) { var v = m * Math.pow(10, e - 1); if (Math.abs(Math.log(v / r)) < d) { d = Math.abs(Math.log(v / r)); best = v; } }); return +best.toPrecision(3); }
  function de(x, n) { return String(+(+x).toFixed(n === undefined ? 2 : n)).replace('.', ','); }
  function ohm(r) { return r >= 1000 ? de(r / 1000, 2) + ' kΩ' : de(r, 1) + ' Ω'; }
  var VF = { rot: 1.8, gelb: 2.0, gruen: 2.1, blau: 3.0 }, FARBE = { rot: 'rote', gelb: 'gelbe', gruen: 'gruene', blau: 'blaue' };
  function on(v) { return { closed: !!v }; }
  /* Taktfolge an E1: n Takte (steigende + fallende Flanke), danach expect */
  function clocks(n, expect, extra) { var s = []; for (var i = 0; i < n; i++) { s.push({ set: { E1: on(1) } }); s.push({ set: { E1: on(0) } }); } s[s.length - 1].expect = expect; return { name: n + ' Takt' + (n > 1 ? 'e' : ''), steps: (extra || []).concat(s) }; }

  /* ===================== GRUNDSTUFE ===================== */

  T({ id: 'G01', level: 'grund', ch: 1, diff: 1, tags: ['bauteil.led', 'elektro.dimensionieren'], params: { U: [5, 9, 12], farbe: ['rot', 'gelb', 'gruen', 'blau'] },
    build: function (p) {
      var start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('D1', 'led', 500, 300, 90, null, { color: p.farbe })]);
      var r = e12((p.U - VF[p.farbe]) / 0.015), wires = [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')];
      return { title: 'LED an ' + p.U + ' V', palette: ['resistor'], need: { resistor: 1 }, start: start,
        brief: 'Schliesse die <b>' + FARBE[p.farbe] + ' LED</b> an die Quelle mit <b>' + p.U + ' V</b> an. Waehle den <b>Vorwiderstand</b> so, dass 10–20 mA fliessen. Miss danach die Spannung an der LED und den Strom.',
        ref: plus(start, [P('R1', 'resistor', 300, 200, 0, r)], wires),
        tests: [{ name: 'Betrieb', expect: [{ sel: 'D1', on: true, i: [0.01, 0.02] }, { noFault: true }] }],
        hidden: [{ name: 'Reserve', set: { B1: { value: +(p.U * 1.1).toFixed(2) } }, expect: [{ sel: 'D1', on: true }, { noFault: true }] }],
        measure: [{ id: 'uled', ask: 'Spannung an der LED', unit: 'V', mode: 'V', a: 'D1.a', b: 'D1.k', tol: 0.03 }, { id: 'i', ask: 'Strom durch die LED', unit: 'mA', truth: { sel: 'D1', q: 'i' }, tol: 0.03 }],
        wrong: [named('Vorwiderstand viel zu klein', plus(start, [P('R1', 'resistor', 300, 200, 0, 10)], wires)), named('Vorwiderstand zu gross', plus(start, [P('R1', 'resistor', 300, 200, 0, r * 5)], wires)),
          named('LED verpolt', plus(start, [P('R1', 'resistor', 300, 200, 0, r)], [W('B1.p', 'R1.a'), W('R1.b', 'D1.k'), W('D1.a', 'B1.n')]))] };
    } });

  T({ id: 'G02', level: 'grund', ch: 2, diff: 1, tags: ['elektro.spannungsteiler'], params: { U: [9, 12, 24], k: [2, 3, 4], R2: [1000, 2200, 4700] },
    build: function (p) {
      var ua = p.U / p.k, start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('R2', 'resistor', 480, 380, 90, p.R2)], [W('R2.b', 'B1.n')]);
      var wires = [W('B1.p', 'R1.a'), W('R1.b', 'R2.a')], r1 = p.R2 * (p.k - 1);
      return { title: 'Spannungsteiler auf ' + de(ua) + ' V', palette: ['resistor'], need: { resistor: 2 }, limit: { resistor: 2 }, start: start,
        brief: 'Ergaenze den <b>Spannungsteiler</b>: An R2 (' + ohm(p.R2) + ') sollen <b>' + de(ua) + ' V</b> liegen (±3 %), die Quelle liefert ' + p.U + ' V. Setze <b>einen</b> Widerstand R1 ein und miss den Strom durch R2.',
        ref: plus(start, [P('R1', 'resistor', 480, 220, 90, r1)], wires),
        tests: [{ name: 'Teilspannung', expect: [{ a: 'R2.a', b: 'R2.b', v: [ua * 0.97, ua * 1.03] }, { noFault: true }] }],
        hidden: [{ name: 'Doppelte Speisung', set: { B1: { value: 2 * p.U } }, expect: [{ a: 'R2.a', b: 'R2.b', v: [2 * ua * 0.97, 2 * ua * 1.03] }] }],
        measure: [{ id: 'i', ask: 'Strom durch R2', unit: 'mA', truth: { sel: 'R2', q: 'i' }, tol: 0.03 }],
        wrong: [named('R1 falsch gewaehlt', plus(start, [P('R1', 'resistor', 480, 220, 90, p.R2 * (p.k === 2 ? 2 : 1))], wires)), named('R1 parallel statt in Reihe', plus(start, [P('R1', 'resistor', 620, 380, 90, r1)], [W('B1.p', 'R2.a'), W('R1.a', 'R2.a'), W('R1.b', 'R2.b')]))] };
    } });

  T({ id: 'G03', level: 'grund', ch: 2, diff: 2, tags: ['elektro.parallelschaltung', 'elektro.kirchhoff'], params: { U: [5, 6], R1: [1000, 2200], n: [2, 3, 5] },
    build: function (p) {
      var i1 = p.U / p.R1, ig = p.n * i1, r2 = p.R1 / (p.n - 1);
      var start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('A1', 'ammeter', 300, 200, 0), P('R1', 'resistor', 460, 300, 90, p.R1)], [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n')]);
      var wires = [W('R2.a', 'R1.a'), W('R2.b', 'R1.b')];
      return { title: 'Gesamtstrom ' + de(ig * 1000, 1) + ' mA', palette: ['resistor'], need: { resistor: 2 }, limit: { resistor: 2 }, start: start,
        brief: 'Durch R1 (' + ohm(p.R1) + ') fliessen an ' + p.U + ' V ' + de(i1 * 1000, 2) + ' mA. Schalte <b>einen Widerstand R2 parallel</b>, sodass der Strommesser A1 <b>' + de(ig * 1000, 1) + ' mA</b> zeigt (±3 %). Trage den Strom durch R2 und den Gesamtwiderstand ein.',
        ref: plus(start, [P('R2', 'resistor', 620, 300, 90, +r2.toPrecision(4))], wires),
        tests: [{ name: 'Gesamtstrom', expect: [{ sel: 'A1', i: [ig * 0.97, ig * 1.03] }, { noFault: true }] }],
        hidden: [{ name: 'R1 unveraendert', expect: [{ sel: 'R1', i: [i1 * 0.98, i1 * 1.02] }] }],
        measure: [{ id: 'i2', ask: 'Strom durch R2', unit: 'mA', truth: { sel: 'R2', q: 'i' }, tol: 0.03 }, { id: 'rg', ask: 'Gesamtwiderstand (berechnet)', unit: 'Ω', value: p.R1 / p.n, tol: 0.03 }],
        wrong: [named('R2 = R1', plus(start, [P('R2', 'resistor', 620, 300, 90, p.n === 2 ? p.R1 * 2 : p.R1)], wires)), named('R2 in Reihe', { parts: start.parts.concat([P('R2', 'resistor', 620, 300, 90, +r2.toPrecision(4))]), wires: [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n'), W('R2.a', 'R1.b')] })] };
    } });

  T({ id: 'G04', level: 'grund', ch: 3, diff: 2, tags: ['elektro.gleichrichter', 'bauteil.diode'], params: { U: [10, 12, 15], f: [50, 100] },
    build: function (p) {
      var dc = (p.U - 0.7) / Math.PI;
      var start = lay([P('G1', 'acsource', 160, 300, 0, p.U, { freq: p.f, shape: 'sine', offset: 0 }), P('R1', 'resistor', 520, 300, 90, 1000)], [W('R1.b', 'G1.n')]);
      return { title: 'Einweggleichrichter', palette: ['diode'], need: { diode: 1 }, limit: { diode: 1 }, start: start,
        brief: 'Der Generator liefert eine Sinusspannung mit <b>Û = ' + p.U + ' V</b> und ' + p.f + ' Hz. Baue mit <b>einer Diode</b> einen Einweggleichrichter: R1.a soll nur <b>positive</b> Halbwellen bekommen. Miss den Gleichanteil und den Scheitelwert an R1.',
        ref: plus(start, [P('V1', 'diode', 340, 200, 0)], [W('G1.p', 'V1.a'), W('V1.k', 'R1.a')]),
        tests: [{ name: 'Einweg', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [dc * 0.9, dc * 1.1] }, { noFault: true }] }],
        hidden: [{ name: 'Scheitel', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'peak', range: [(p.U - 0.9) * 0.97, p.U - 0.5] }] }],
        measure: [{ id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.05 }, { id: 'up', ask: 'Scheitelwert an R1 (Oszilloskop)', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.05 }],
        wrong: [named('Diode verkehrt', plus(start, [P('V1', 'diode', 340, 200, 180)], [W('G1.p', 'V1.k'), W('V1.a', 'R1.a')])), named('Diode parallel zu R1', plus(start, [P('V1', 'diode', 640, 300, 90)], [W('G1.p', 'R1.a'), W('V1.a', 'R1.a'), W('V1.k', 'R1.b')]))] };
    } });

  T({ id: 'G05', level: 'grund', ch: 4, diff: 1, tags: ['messen.spannung', 'messen.strom'], params: { U: [9, 12, 24], R1: [470, 1000], R2: [1000, 2200], R3: [2200, 4700] },
    build: function (p) {
      var start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('S1', 'switch', 300, 200, 0, null, { closed: false }), P('R1', 'resistor', 440, 200, 0, p.R1), P('R2', 'resistor', 560, 300, 90, p.R2), P('R3', 'resistor', 700, 300, 90, p.R3)],
        [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'R2.a'), W('R2.a', 'R3.a'), W('R2.b', 'B1.n'), W('R3.b', 'R2.b')]);
      var ref = JSON.parse(JSON.stringify(start)); ref.parts[1].props.closed = true;
      var m = { S1: { closed: true } };
      return { title: 'Messen in der gemischten Schaltung', palette: [], start: start, ref: ref,
        brief: 'R1 liegt in Reihe zur Parallelschaltung aus R2 und R3. <b>Schalte S1 ein</b> und miss: die Spannung an R1, die Spannung an R2 und den Strom durch R3. Rechne den Gesamtstrom aus deinen Messwerten.',
        tests: [{ name: 'Eingeschaltet', expect: [{ sel: 'R1', i: [p.U / (p.R1 + p.R2 * p.R3 / (p.R2 + p.R3)) * 0.98, p.U / (p.R1 + p.R2 * p.R3 / (p.R2 + p.R3)) * 1.02] }, { noFault: true }] }],
        measure: [{ id: 'u1', ask: 'Spannung an R1', unit: 'V', truth: { sel: 'R1', q: 'v' }, set: m, tol: 0.03 }, { id: 'u2', ask: 'Spannung an R2', unit: 'V', truth: { sel: 'R2', q: 'v' }, set: m, tol: 0.03 },
          { id: 'i3', ask: 'Strom durch R3', unit: 'mA', truth: { sel: 'R3', q: 'i' }, set: m, tol: 0.03 }, { id: 'ig', ask: 'Gesamtstrom', unit: 'mA', truth: { sel: 'R1', q: 'i' }, set: m, tol: 0.03 }],
        wrong: [] };
    } });

  T({ id: 'G06', level: 'grund', ch: 5, diff: 1, tags: ['digital.bcd', 'digital.7segment', 'digital.binaer'], params: { z: [[3, 6, 9], [2, 5, 8], [4, 7, 1], [6, 9, 0]], dual: ['1011', '1101', '0110', '1110', '1001'] },
    build: function (p) {
      var ins = [1, 2, 3, 4].map(function (i) { return P('E' + i, 'logicin', 180, 200 + 40 * i, 0); });
      var start = lay([P('GND1', 'ground', 120, 520, 0), P('IC1', 'dec7', 380, 300, 0), P('AZ1', 'seg7', 600, 300, 0)].concat(ins));
      var wires = ['A', 'B', 'C', 'D'].map(function (k, i) { return W('E' + (i + 1) + '.out', 'IC1.' + k); }).concat('abcdefg'.split('').map(function (s) { return W('IC1.' + s, 'AZ1.' + s); }));
      var t = function (n) { var set = {}; [0, 1, 2, 3].forEach(function (i) { set['E' + (i + 1)] = on(n >> i & 1); }); return { name: 'Zahl ' + n, set: set, expect: [{ sel: 'AZ1', digit: n }] }; };
      var bad = wires.map(function (w) { return w.from === 'E1.out' ? W('E1.out', 'IC1.D') : w.from === 'E4.out' ? W('E4.out', 'IC1.A') : w; });
      return { title: 'BCD-Anzeige verdrahten', palette: [], start: start, ref: plus(start, [], wires),
        brief: 'Verdrahte die Pegelschalter mit dem BCD-Decoder IC1 und den Decoder mit der 7-Segment-Anzeige: <b>E1 ist das niederwertigste Bit</b> (Eingang A), E4 das hoechstwertige (D). Die Anzeige muss jede eingestellte Ziffer richtig zeigen. Rechne ausserdem die Dualzahl <b>' + p.dual + '</b> ins Dezimalsystem um.',
        tests: [t(p.z[0]), t(p.z[1])], hidden: [t(p.z[2]), t(7 - (p.z[0] % 2))],
        measure: [{ id: 'dez', ask: 'Dualzahl ' + p.dual + ' dezimal', unit: '', value: parseInt(p.dual, 2), tol: 0, abs: 0.01 }],
        wrong: [named('Bitreihenfolge vertauscht', plus(start, [], bad))] };
    } });

  var G07 = [
    { txt: 'A = (E1 ∧ E2) ∨ E3', f: function (b) { return (b[0] & b[1]) | b[2]; }, g: [['U1', 'and', ['E1', 'E2']], ['U2', 'or', ['U1', 'E3']]], w: [['U1', 'or', ['E1', 'E2']], ['U2', 'and', ['U1', 'E3']]] },
    { txt: 'A = (E1 ∨ E2) ∧ ¬E3', f: function (b) { return (b[0] | b[1]) & (1 - b[2]); }, g: [['U1', 'or', ['E1', 'E2']], ['U2', 'not', ['E3']], ['U3', 'and', ['U1', 'U2']]], w: [['U1', 'or', ['E1', 'E2']], ['U3', 'and', ['U1', 'E3']]] },
    { txt: 'A = ¬(E1 ∧ E2) ∧ E3', f: function (b) { return (1 - (b[0] & b[1])) & b[2]; }, g: [['U1', 'and', ['E1', 'E2']], ['U2', 'not', ['U1']], ['U3', 'and', ['U2', 'E3']]], w: [['U1', 'and', ['E1', 'E2']], ['U3', 'and', ['U1', 'E3']]] },
    { txt: 'A = (E1 ∧ ¬E2) ∨ (E2 ∧ E3)', f: function (b) { return (b[0] & (1 - b[1])) | (b[1] & b[2]); }, g: [['U1', 'not', ['E2']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], w: [['U2', 'and', ['E1', 'E2']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]] },
    { txt: 'A = ¬E1 ∨ (E2 ∧ E3)', f: function (b) { return (1 - b[0]) | (b[1] & b[2]); }, g: [['U1', 'not', ['E1']], ['U2', 'and', ['E2', 'E3']], ['U3', 'or', ['U1', 'U2']]], w: [['U2', 'and', ['E2', 'E3']], ['U3', 'or', ['E1', 'U2']]] }
  ];
  function last(g) { return g[g.length - 1][0]; }
  T({ id: 'G07', level: 'grund', ch: 6, diff: 1, tags: ['digital.gatter', 'digital.wahrheitstabelle'], params: { v: [0, 1, 2, 3, 4] },
    build: function (p) {
      var v = G07[p.v], ref = LG.net(3, v.g, { L1: last(v.g) }), tt = LG.truth(3, v.f);
      return { title: 'Schaltung aus der Gleichung', palette: ['and', 'or', 'not'], limit: { gates: 4 }, start: LG.io(3), ref: ref, bench: LG.bench(ref),
        brief: 'Baue die Schaltung zur Gleichung <b>' + v.txt + '</b> aus Grundgattern. L1 zeigt A.<p class="limit">Erlaubt: hoechstens <b>4</b> Gatter.</p>',
        tests: tt.filter(function (_, i) { return i % 2 === 0; }), hidden: tt.filter(function (_, i) { return i % 2 === 1; }), measure: [],
        wrong: [named('Verknuepfung verwechselt', LG.net(3, v.w, { L1: last(v.w) }))] };
    } });

  var G08 = {
    UND: { n: 2, f: function (b) { return b[0] & b[1]; }, g: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['U1', 'U1']]], lim: 2 },
    ODER: { n: 2, f: function (b) { return b[0] | b[1]; }, g: [['U1', 'nand', ['E1', 'E1']], ['U2', 'nand', ['E2', 'E2']], ['U3', 'nand', ['U1', 'U2']]], lim: 3 },
    NOR: { n: 2, f: function (b) { return 1 - (b[0] | b[1]); }, g: [['U1', 'nand', ['E1', 'E1']], ['U2', 'nand', ['E2', 'E2']], ['U3', 'nand', ['U1', 'U2']], ['U4', 'nand', ['U3', 'U3']]], lim: 4 },
    XOR: { n: 2, f: function (b) { return b[0] ^ b[1]; }, g: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['E1', 'U1']], ['U3', 'nand', ['E2', 'U1']], ['U4', 'nand', ['U2', 'U3']]], lim: 4 }
  };
  T({ id: 'G08', level: 'grund', ch: 7, diff: 2, tags: ['digital.nand', 'digital.normiert', 'digital.demorgan'], params: { ziel: ['UND', 'ODER', 'NOR', 'XOR'] },
    build: function (p) {
      var v = G08[p.ziel], ref = LG.net(2, v.g, { L1: last(v.g) }), one = [['U1', 'nand', ['E1', 'E2']]];
      return { title: p.ziel + ' nur aus NAND', palette: ['nand'], limit: { gates: v.lim }, start: LG.io(2), ref: ref, bench: LG.bench(ref),
        brief: 'Baue die Funktion <b>' + p.ziel + '</b> (E1, E2 → L1) <b>nur aus NAND-Gattern</b>.' + LG.table(2, v.f) + '<p class="limit">Erlaubt: hoechstens <b>' + v.lim + '</b> NAND-Gatter.</p>',
        tests: LG.truth(2, v.f), hidden: [], measure: [], wrong: [named('ein einzelnes NAND', LG.net(2, one, { L1: 'U1' }))] };
    } });

  var G09 = [
    { m: [3, 5, 6, 7], pal: ['and', 'or', 'not'], lim: 5, g: [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U1', 'U2']], ['U5', 'or', ['U4', 'U3']]] },
    { m: [1, 2, 4, 7], pal: ['and', 'or', 'not', 'xor'], lim: 2, g: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']]] },
    { m: [4, 5, 6], pal: ['and', 'or', 'not', 'nand'], lim: 2, g: [['U1', 'nand', ['E1', 'E2']], ['U2', 'and', ['U1', 'E3']]] },
    { m: [1, 3, 6, 7], pal: ['and', 'or', 'not'], lim: 4, g: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]] },
    { m: [0, 1, 2, 3, 7], pal: ['and', 'or', 'not'], lim: 3, g: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'E2']], ['U3', 'or', ['U1', 'U2']]] }
  ];
  T({ id: 'G09', level: 'grund', ch: 8, diff: 3, tags: ['digital.kv', 'digital.vereinfachen', 'digital.entwurf'], params: { v: [0, 1, 2, 3, 4] },
    build: function (p) {
      var v = G09[p.v], f = LG.sigma(v.m), ref = LG.net(3, v.g, { L1: last(v.g) });
      var w = [['U1', 'and', ['E1', 'E2']], ['U2', 'or', ['U1', 'E3']]];
      return { title: 'Von der Wahrheitstabelle zur Schaltung', palette: v.pal, limit: { gates: v.lim }, start: LG.io(3), ref: ref, bench: LG.bench(ref),
        brief: 'Entwirf die Schaltung zu dieser Wahrheitstabelle und <b>vereinfache</b> sie (KV-Diagramm oder Boolesche Algebra). L1 zeigt A.' + LG.table(3, f) + '<p class="limit">Erlaubt: hoechstens <b>' + v.lim + '</b> Gatter.</p>',
        tests: LG.truth(3, f), hidden: [], measure: [], wrong: [named('nicht die verlangte Funktion', LG.net(3, w, { L1: 'U2' }))] };
    } });

  var G10 = {
    halb: { n: 2, outs: ['S', 'C'], txt: 'den <b>Halbaddierer</b>: L1 = Summe S, L2 = Uebertrag C', f: function (b) { return [b[0] ^ b[1], b[0] & b[1]]; }, pal: ['and', 'or', 'xor', 'not'], lim: 2,
      g: [['U1', 'xor', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]], o: { L1: 'U1', L2: 'U2' }, w: [['U1', 'or', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]] },
    voll: { n: 3, outs: ['S', 'C'], txt: 'den <b>Volladdierer</b> (E1 + E2 + E3): L1 = Summe S, L2 = Uebertrag C', f: function (b) { var s = b[0] + b[1] + b[2]; return [s & 1, s >> 1]; }, pal: ['and', 'or', 'xor', 'not'], lim: 5,
      g: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']], ['U4', 'and', ['U1', 'E3']], ['U5', 'or', ['U3', 'U4']]], o: { L1: 'U2', L2: 'U5' },
      w: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']]] },
    komp: { n: 2, outs: ['A=B', 'A>B'], txt: 'den <b>1-Bit-Komparator</b> (A = E2, B = E1): L1 leuchtet bei A = B, L2 bei A &gt; B', f: function (b) { return [b[0] === b[1] ? 1 : 0, b[1] & (1 - b[0])]; }, pal: ['and', 'or', 'xor', 'xnor', 'not'], lim: 3,
      g: [['U1', 'xnor', ['E1', 'E2']], ['U2', 'not', ['E1']], ['U3', 'and', ['E2', 'U2']]], o: { L1: 'U1', L2: 'U3' }, w: [['U1', 'xor', ['E1', 'E2']], ['U2', 'not', ['E1']], ['U3', 'and', ['E2', 'U2']]] }
  };
  T({ id: 'G10', level: 'grund', ch: 9, diff: 3, tags: ['digital.addierer', 'digital.komparator'], params: { art: ['halb', 'voll', 'komp'] },
    build: function (p) {
      var v = G10[p.art], ref = LG.net(v.n, v.g, v.o), wo = {}; Object.keys(v.o).forEach(function (k) { wo[k] = v.w.some(function (g) { return g[0] === v.o[k]; }) ? v.o[k] : last(v.w); });
      return { title: p.art === 'komp' ? 'Komparator' : p.art === 'halb' ? 'Halbaddierer' : 'Volladdierer', palette: v.pal, limit: { gates: v.lim }, start: LG.io(v.n, ['L1', 'L2']), ref: ref, bench: LG.bench(ref),
        brief: 'Baue ' + v.txt + '.' + LG.table(v.n, v.f, { outs: v.outs }) + '<p class="limit">Erlaubt: hoechstens <b>' + v.lim + '</b> Gatter.</p>',
        tests: LG.truth(v.n, v.f, { outs: ['L1', 'L2'] }), hidden: [], measure: [], wrong: [named('ein Ausgang falsch', LG.net(v.n, v.w, wo))] };
    } });

  var G11 = {
    mux: { outs: ['Y'], leds: ['L1'], txt: 'einen <b>Multiplexer 2:1</b>: E3 = Auswahl S. Bei S = 0 zeigt L1 den Eingang E1, bei S = 1 den Eingang E2', f: function (b) { return b[2] ? b[1] : b[0]; }, lim: 4,
      g: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], o: { L1: 'U4' }, w: [['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], wo: { L1: 'U4' } },
    demux: { outs: ['Y0', 'Y1'], leds: ['L1', 'L2'], txt: 'einen <b>Demultiplexer 1:2</b>: E1 = Daten, E2 = Auswahl S. Bei S = 0 geht E1 auf L1 (Y0), bei S = 1 auf L2 (Y1); der andere Ausgang ist 0', n: 2, f: function (b) { return [b[0] & (1 - b[1]), b[0] & b[1]]; }, lim: 3,
      g: [['U1', 'not', ['E2']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E1', 'E2']]], o: { L1: 'U2', L2: 'U3' }, w: [['U2', 'and', ['E1', 'E2']], ['U3', 'and', ['E1', 'E2']]], wo: { L1: 'U2', L2: 'U3' } }
  };
  T({ id: 'G11', level: 'grund', ch: 10, diff: 2, tags: ['digital.multiplexer', 'digital.demultiplexer'], params: { art: ['mux', 'demux'] },
    build: function (p) {
      var v = G11[p.art], n = v.n || 3, ref = LG.net(n, v.g, v.o);
      return { title: p.art === 'mux' ? 'Multiplexer 2:1' : 'Demultiplexer 1:2', palette: ['and', 'or', 'not'], limit: { gates: v.lim }, start: LG.io(n, v.leds), ref: ref, bench: LG.bench(ref),
        brief: 'Baue ' + v.txt + '.' + LG.table(n, v.f, { outs: v.outs }) + '<p class="limit">Erlaubt: hoechstens <b>' + v.lim + '</b> Gatter.</p>',
        tests: LG.truth(n, v.f, { outs: v.leds }), hidden: [], measure: [], wrong: [named('Auswahl nicht invertiert', LG.net(n, v.w, v.wo))] };
    } });

  /* ===================== PROFI-STUFE ===================== */

  T({ id: 'P01', level: 'profi', ch: 11, diff: 1, tags: ['elektro.zeitkonstante', 'elektro.rc'], params: { U: [5, 10], C: [47e-6, 100e-6], tau: [0.5, 1, 2.2] },
    build: function (p) {
      var r = p.tau / p.C, start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('C1', 'capacitor', 520, 300, 90, p.C)], [W('C1.b', 'B1.n')]);
      var wires = [W('B1.p', 'R1.a'), W('R1.b', 'C1.a')], u1 = p.U * (1 - Math.exp(-1)), u3 = p.U * (1 - Math.exp(-3));
      return { title: 'Zeitkonstante ' + de(p.tau, 1) + ' s', palette: ['resistor'], need: { resistor: 1 }, limit: { resistor: 1 }, start: start,
        brief: 'Der Kondensator C1 (' + de(p.C * 1e6, 0) + ' µF) soll ueber einen Widerstand an ' + p.U + ' V geladen werden. Waehle den <b>Ladewiderstand</b> so, dass die Zeitkonstante <b>τ = ' + de(p.tau, 1) + ' s</b> betraegt (±5 %). Trage den Widerstand und die Spannung nach 1 τ ein.',
        ref: plus(start, [P('R1', 'resistor', 340, 200, 0, +r.toPrecision(4))], wires),
        tests: [{ name: 'Ladekurve', steps: [{ name: 'nach 1 τ', run: p.tau, dt: p.tau / 400, expect: [{ sel: 'C1', v: [u1 * 0.96, u1 * 1.04] }, { noFault: true }] }] }],
        hidden: [{ name: 'Ladekurve lang', steps: [{ name: 'nach 3 τ', run: 3 * p.tau, dt: p.tau / 200, expect: [{ sel: 'C1', v: [u3 * 0.975, u3 * 1.02] }] }] }],
        measure: [{ id: 'r', ask: 'Ladewiderstand (berechnet)', unit: 'kΩ', value: r, tol: 0.05 }, { id: 'u', ask: 'Spannung an C1 nach 1 τ', unit: 'V', value: u1, tol: 0.05 }],
        wrong: [named('R um Faktor 10 zu klein', plus(start, [P('R1', 'resistor', 340, 200, 0, +(r / 10).toPrecision(4))], wires)), named('R doppelt so gross', plus(start, [P('R1', 'resistor', 340, 200, 0, +(r * 2).toPrecision(4))], wires))] };
    } });

  T({ id: 'P02', level: 'profi', ch: 14, diff: 2, tags: ['elektro.filter', 'elektro.grenzfrequenz'], params: { fg: [159, 338, 723], C: [100e-9, 220e-9, 470e-9] },
    build: function (p) {
      var r = 1 / (2 * Math.PI * p.fg * p.C), ue = 10 / Math.SQRT2;
      var start = lay([P('G1', 'acsource', 160, 300, 0, 10, { freq: p.fg, shape: 'sine', offset: 0 }), P('C1', 'capacitor', 520, 300, 90, p.C)], [W('C1.b', 'G1.n')]);
      var wires = [W('G1.p', 'R1.a'), W('R1.b', 'C1.a')];
      return { title: 'Tiefpass mit f_g = ' + p.fg + ' Hz', palette: ['resistor'], need: { resistor: 1 }, limit: { resistor: 1 }, start: start,
        brief: 'Baue mit C1 (' + de(p.C * 1e9, 0) + ' nF) einen <b>RC-Tiefpass</b> mit der Grenzfrequenz <b>f_g = ' + p.fg + ' Hz</b>. Ausgang ist die Spannung an C1. Der Generator liefert Û = 10 V. Miss die Ausgangsspannung (V~) bei f_g.',
        ref: plus(start, [P('R1', 'resistor', 340, 200, 0, +r.toPrecision(4))], wires),
        tests: [{ name: 'Bei f_g', set: { G1: { freq: p.fg } }, expect: [{ a: 'C1.a', b: 'C1.b', ac: 'rms', range: [ue * 0.68, ue * 0.735] }, { noFault: true }] }],
        hidden: [{ name: 'Bei 10 · f_g', set: { G1: { freq: 10 * p.fg } }, expect: [{ a: 'C1.a', b: 'C1.b', ac: 'rms', range: [ue * 0.085, ue * 0.115] }] }],
        measure: [{ id: 'ua', ask: 'U_a bei f_g (V~, TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'C1.b', tol: 0.04, set: { G1: { freq: p.fg } } }, { id: 'r', ask: 'Widerstand (berechnet)', unit: 'kΩ', value: r, tol: 0.05 }],
        wrong: [named('R um Faktor 2π daneben', plus(start, [P('R1', 'resistor', 340, 200, 0, +(1 / (p.fg * p.C)).toPrecision(4))], wires)), named('R und C vertauscht (Hochpass)', { parts: start.parts.concat([P('R1', 'resistor', 340, 200, 0, +r.toPrecision(4))]), wires: [W('C1.b', 'G1.n'), W('G1.p', 'C1.a'), W('R1.a', 'C1.a'), W('R1.b', 'G1.n')] })] };
    } });

  T({ id: 'P03', level: 'profi', ch: 14, diff: 2, tags: ['elektro.filter', 'elektro.grenzfrequenz'], params: { fg: [100, 200, 500], R: [1000, 2200, 4700] },
    build: function (p) {
      var c = 1 / (2 * Math.PI * p.fg * p.R), ue = 10 / Math.SQRT2;
      var start = lay([P('G1', 'acsource', 160, 300, 0, 10, { freq: p.fg, shape: 'sine', offset: 0 }), P('R1', 'resistor', 520, 300, 90, p.R)], [W('R1.b', 'G1.n')]);
      var wires = [W('G1.p', 'C1.a'), W('C1.b', 'R1.a')];
      return { title: 'Hochpass mit f_g = ' + p.fg + ' Hz', palette: ['capacitor'], need: { capacitor: 1 }, limit: { capacitor: 1 }, start: start,
        brief: 'Baue mit R1 (' + ohm(p.R) + ') einen <b>RC-Hochpass</b> mit der Grenzfrequenz <b>f_g = ' + p.fg + ' Hz</b>. Ausgang ist die Spannung an R1. Der Generator liefert Û = 10 V. Miss die Ausgangsspannung (V~) bei f_g.',
        ref: plus(start, [P('C1', 'capacitor', 340, 200, 0, +c.toPrecision(4))], wires),
        tests: [{ name: 'Bei f_g', set: { G1: { freq: p.fg } }, expect: [{ a: 'R1.a', b: 'R1.b', ac: 'rms', range: [ue * 0.68, ue * 0.735] }, { noFault: true }] }],
        hidden: [{ name: 'Bei f_g / 10', set: { G1: { freq: p.fg / 10 } }, expect: [{ a: 'R1.a', b: 'R1.b', ac: 'rms', range: [ue * 0.085, ue * 0.115] }] }],
        measure: [{ id: 'ua', ask: 'U_a bei f_g (V~, TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.04, set: { G1: { freq: p.fg } } }, { id: 'c', ask: 'Kapazitaet (berechnet)', unit: 'nF', value: c, tol: 0.05 }],
        wrong: [named('C zehnmal zu gross', plus(start, [P('C1', 'capacitor', 340, 200, 0, +(c * 10).toPrecision(4))], wires))] };
    } });

  T({ id: 'P04', level: 'profi', ch: 12, diff: 1, tags: ['digital.zaehler', 'digital.flipflop'], params: { dir: ['vor', 'rueck'] },
    build: function (p) {
      var start = lay([P('E1', 'logicin', 160, 200, 0), P('E2', 'logicin', 160, 360, 0, null, { closed: true }), P('GND1', 'ground', 120, 560, 0), P('FF1', 'tff', 320, 260, 0), P('FF2', 'tff', 490, 260, 0), P('L1', 'logicled', 860, 230, 0), P('L2', 'logicled', 860, 340, 0)]);
      var w = function (q) { return [W('E2.out', 'FF1.T'), W('E1.out', 'FF1.C'), W('FF1.Q', 'L1.in'), W('E2.out', 'FF2.T'), W('FF1.' + q, 'FF2.C'), W('FF2.Q', 'L2.in')]; };
      var seq = p.dir === 'vor' ? [1, 2, 3, 0, 1] : [3, 2, 1, 0, 3], ex = function (n) { return [{ sel: 'L1', on: !!(n & 1) }, { sel: 'L2', on: !!(n & 2) }]; };
      return { title: '2-Bit-' + (p.dir === 'vor' ? 'Vorwaerts' : 'Rueckwaerts') + 'zaehler', palette: [], start: start, ref: plus(start, [], w(p.dir === 'vor' ? 'Qn' : 'Q')),
        brief: 'Verdrahte die zwei T-Flipflops zu einem <b>asynchronen 2-Bit-' + (p.dir === 'vor' ? 'Vorwaertszaehler' : 'Rueckwaertszaehler') + '</b>: E1 = Takt, E2 (fest 1) an beide T-Eingaenge, L1 = Wertigkeit 1, L2 = Wertigkeit 2. Die Flipflops schalten bei <b>steigender</b> Flanke. Zaehlfolge ab 0: <b>' + seq.slice(0, 4).join(' → ') + '</b>.',
        tests: [clocks(1, ex(seq[0])), clocks(2, ex(seq[1]))], hidden: [clocks(3, ex(seq[2])), clocks(4, ex(seq[3])), clocks(5, ex(seq[4]))], measure: [],
        wrong: [named('falsche Zaehlrichtung', plus(start, [], w(p.dir === 'vor' ? 'Q' : 'Qn'))), named('beide Stufen am selben Takt', plus(start, [], [W('E2.out', 'FF1.T'), W('E1.out', 'FF1.C'), W('FF1.Q', 'L1.in'), W('E2.out', 'FF2.T'), W('E1.out', 'FF2.C'), W('FF2.Q', 'L2.in')]))] };
    } });

  T({ id: 'P05', level: 'profi', ch: 12, diff: 2, tags: ['digital.schieberegister', 'digital.flipflop'], params: { muster: [[1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 1, 0], [1, 0, 0, 1]] },
    build: function (p) {
      var start = lay([P('E1', 'logicin', 160, 200, 0), P('E2', 'logicin', 160, 360, 0), P('GND1', 'ground', 120, 560, 0), P('L1', 'logicled', 860, 200, 0), P('L2', 'logicled', 860, 300, 0), P('L3', 'logicled', 860, 400, 0)]);
      var ffs = [P('FF1', 'dff', 320, 300, 0), P('FF2', 'dff', 480, 300, 0), P('FF3', 'dff', 640, 300, 0)];
      var wires = [W('E2.out', 'FF1.D'), W('FF1.Q', 'FF2.D'), W('FF2.Q', 'FF3.D'), W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('E1.out', 'FF3.C'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in'), W('FF3.Q', 'L3.in')];
      var run = function (n) { // n Bits einschieben, danach Stand pruefen
        var s = [], reg = [0, 0, 0];
        for (var i = 0; i < n; i++) { s.push({ set: { E2: on(p.muster[i]), E1: on(0) } }); s.push({ set: { E1: on(1) } }); reg = [p.muster[i], reg[0], reg[1]]; }
        s.push({ name: 'nach ' + n + ' Takten', set: { E1: on(0) }, expect: [{ sel: 'L1', on: !!reg[0] }, { sel: 'L2', on: !!reg[1] }, { sel: 'L3', on: !!reg[2] }] });
        return { name: n + ' Bit eingeschoben', steps: s };
      };
      return { title: '3-Bit-Schieberegister', palette: ['dff'], need: { dff: 3 }, limit: { dff: 3 }, start: start, ref: plus(start, ffs, wires),
        brief: 'Baue aus <b>drei D-Flipflops</b> ein Schieberegister: E1 = gemeinsamer Takt, E2 = Dateneingang. Mit jeder steigenden Flanke wandert das Bit eine Stufe weiter: L1 = erste Stufe, L2 = zweite, L3 = dritte.',
        tests: [run(1), run(2)], hidden: [run(3), run(4)], measure: [],
        wrong: [named('Stufen nicht verkettet', plus(start, ffs, [W('E2.out', 'FF1.D'), W('E2.out', 'FF2.D'), W('E2.out', 'FF3.D'), W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('E1.out', 'FF3.C'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in'), W('FF3.Q', 'L3.in')]))] };
    } });

  T({ id: 'P06', level: 'profi', ch: 13, diff: 1, tags: ['bauteil.zdiode', 'elektro.stabilisierung'], params: { vz: [5.1, 5.6, 6.2], RL: [470, 1000] },
    build: function (p) {
      var start = lay([P('B1', 'battery', 160, 300, 0, 10), P('Z1', 'zener', 480, 300, 270, null, { vz: p.vz }), P('R2', 'resistor', 620, 300, 90, p.RL)], [W('Z1.a', 'B1.n'), W('R2.a', 'Z1.k'), W('R2.b', 'Z1.a')]);
      var wires = [W('B1.p', 'R1.a'), W('R1.b', 'Z1.k')], rng = [p.vz - 0.12, p.vz + 0.4];
      var lo = Math.pow(12 - p.vz, 2) / 0.24, hi = (9 - p.vz) / (p.vz / p.RL + 0.003), rv = Math.round((lo + hi) / 2); // zwischen Verlustleistung (12 V) und Mindeststrom (9 V)
      return { title: 'Stabilisierung mit Z-Diode ' + de(p.vz, 1) + ' V', palette: ['resistor'], need: { resistor: 2 }, limit: { resistor: 2 }, start: start,
        brief: 'Die Last R2 (' + ohm(p.RL) + ') soll aus einer Speisung von <b>9 V bis 12 V</b> stabil rund <b>' + de(p.vz, 1) + ' V</b> bekommen (' + de(rng[0], 2) + ' … ' + de(rng[1], 2) + ' V). Waehle den <b>Vorwiderstand</b> – nichts darf ueberlastet werden. Miss die Lastspannung bei 10 V.',
        ref: plus(start, [P('R1', 'resistor', 320, 200, 0, rv)], wires),
        tests: [{ name: '9 V', set: { B1: { value: 9 } }, expect: [{ sel: 'R2', v: rng }, { noFault: true }] }, { name: '12 V', set: { B1: { value: 12 } }, expect: [{ sel: 'R2', v: rng }, { noFault: true }] }],
        hidden: [{ name: '10,5 V', set: { B1: { value: 10.5 } }, expect: [{ sel: 'R2', v: rng }, { noFault: true }] }],
        measure: [{ id: 'u', ask: 'Lastspannung bei 10 V', unit: 'V', truth: { sel: 'R2', q: 'v' }, tol: 0.03 }],
        wrong: [named('R_V zu gross', plus(start, [P('R1', 'resistor', 320, 200, 0, 1000)], wires)), named('R_V zu klein (Ueberlast)', plus(start, [P('R1', 'resistor', 320, 200, 0, 22)], wires))] };
    } });

  var P07 = { lampe: { type: 'lamp', id: 'H1', name: 'die Lampe H1', U: 9, i: [0.13, 0.16] }, motor: { type: 'motor', id: 'M1', name: 'den Motor M1', U: 6, i: [0.26, 0.31] } };
  T({ id: 'P07', level: 'profi', ch: 13, diff: 2, tags: ['bauteil.transistor', 'elektro.schalten'], params: { last: ['lampe', 'motor'] },
    build: function (p) {
      var v = P07[p.last], start = lay([P('E1', 'logicin', 160, 380, 0), P('GND1', 'ground', 480, 540, 0), P('B1', 'battery', 700, 300, 0, v.U), P(v.id, v.type, 580, 240, 90)], [W('B1.p', v.id + '.a'), W('B1.n', 'GND1.g')]);
      var parts = function (rb) { return [P('Q1', 'npn', 480, 380, 0), P('R1', 'resistor', 320, 380, 0, rb)]; }, wires = [W('Q1.e', 'GND1.g'), W(v.id + '.b', 'Q1.c'), W('E1.out', 'R1.a'), W('R1.b', 'Q1.b')];
      return { title: 'Transistor schaltet ' + (p.last === 'lampe' ? 'die Lampe' : 'den Motor'), palette: ['npn', 'resistor'], need: { npn: 1, resistor: 1 }, limit: { npn: 1, resistor: 1 }, start: start,
        brief: 'Der Logikausgang E1 (5 V) soll ' + v.name + ' an ' + v.U + ' V schalten. Setze einen <b>NPN-Transistor</b> als Schalter ein und dimensioniere den <b>Basiswiderstand</b>: Bei E1 = 1 muss der Transistor in <b>Saettigung</b> sein, der Basisstrom soll aber hoechstens 10 mA betragen. Miss U_CE im eingeschalteten Zustand.',
        ref: plus(start, parts(1000), wires),
        tests: [{ name: 'Schalten', steps: [{ name: 'E1 = 1', set: { E1: on(1) }, expect: [{ sel: 'Q1', state: 'sat' }, { sel: v.id, i: v.i }, { noFault: true }] }, { name: 'E1 = 0', set: { E1: on(0) }, expect: [{ sel: v.id, i: [0, 0.00001] }] }] }],
        hidden: [{ name: 'Basisstrom', set: { E1: on(1) }, expect: [{ sel: 'R1', i: [0.0005, 0.01] }] }],
        measure: [{ id: 'uce', ask: 'U_CE bei E1 = 1', unit: 'V', mode: 'V', a: 'Q1.c', b: 'Q1.e', tol: 0.1, abs: 0.03, set: { E1: { closed: true } } }],
        wrong: [named('Basiswiderstand viel zu gross', plus(start, parts(100000), wires)), named('Basis ohne Widerstand-Reserve (33 Ω)', plus(start, parts(33), wires))] };
    } });

  var P08 = {
    aus: { txt: 'AUS hat Vorrang', f: 'Q = (EIN ∨ Q) ∧ ¬AUS', g: function () { return { parts: [P('U1', 'or', 360, 220, 0), P('U2', 'not', 360, 400, 0), P('U3', 'and', 540, 260, 0)], wires: [W('E1.out', 'U1.in1'), W('U3.out', 'U1.in2'), W('E2.out', 'U2.in'), W('U1.out', 'U3.in1'), W('U2.out', 'U3.in2'), W('U3.out', 'L1.in')] }; }, both: false },
    ein: { txt: 'EIN hat Vorrang', f: 'Q = EIN ∨ (Q ∧ ¬AUS)', g: function () { return { parts: [P('U1', 'not', 360, 400, 0), P('U2', 'and', 480, 320, 0), P('U3', 'or', 620, 240, 0)], wires: [W('E2.out', 'U1.in'), W('U3.out', 'U2.in1'), W('U1.out', 'U2.in2'), W('E1.out', 'U3.in1'), W('U2.out', 'U3.in2'), W('U3.out', 'L1.in')] }; }, both: true }
  };
  T({ id: 'P08', level: 'profi', ch: 15, diff: 3, tags: ['steuerung.selbsthaltung', 'digital.speicher'], params: { vorrang: ['aus', 'ein'] },
    build: function (p) {
      var v = P08[p.vorrang], o = P08[p.vorrang === 'aus' ? 'ein' : 'aus'], start = lay([P('E1', 'logicin', 160, 200, 0), P('E2', 'logicin', 160, 400, 0), P('GND1', 'ground', 120, 560, 0), P('L1', 'logicled', 860, 240, 0)]);
      var g = v.g(), w = o.g(), L = function (x) { return [{ sel: 'L1', on: !!x }]; };
      return { title: 'Selbsthaltung – ' + v.txt, palette: ['and', 'or', 'not'], limit: { gates: 3 }, start: start, ref: plus(start, g.parts, g.wires),
        brief: 'Baue eine <b>Selbsthaltung</b> aus Gattern: E1 = Taster EIN, E2 = Taster AUS, L1 = Schuetz Q. Ein kurzer Impuls auf EIN schaltet ein, Q haelt sich selbst; AUS schaltet ab. Werden beide gleichzeitig gedrueckt, gilt: <b>' + v.txt + '</b>.<p class="limit">Erlaubt: hoechstens <b>3</b> Gatter.</p>',
        tests: [{ name: 'Ein und halten', steps: [{ name: 'Ruhe', set: { E1: on(0), E2: on(0) }, expect: L(0) }, { name: 'EIN gedrueckt', set: { E1: on(1) }, expect: L(1) }, { name: 'EIN losgelassen', set: { E1: on(0) }, expect: L(1).concat([{ noFault: true }]) }] },
          { name: 'Aus', steps: [{ set: { E1: on(1), E2: on(0) } }, { set: { E1: on(0) } }, { name: 'AUS gedrueckt', set: { E2: on(1) }, expect: L(0) }, { name: 'AUS losgelassen', set: { E2: on(0) }, expect: L(0) }] }],
        hidden: [{ name: 'Beide gedrueckt', steps: [{ set: { E1: on(0), E2: on(0) } }, { name: 'EIN und AUS', set: { E1: on(1), E2: on(1) }, expect: L(v.both) }, { name: 'nur AUS bleibt', set: { E1: on(0) }, expect: L(0) }] },
          { name: 'Beide aus dem Betrieb', steps: [{ set: { E1: on(1), E2: on(0) } }, { set: { E1: on(0) } }, { name: 'EIN und AUS', set: { E1: on(1), E2: on(1) }, expect: L(v.both) }] }],
        measure: [], wrong: [named('falscher Vorrang', plus(start, w.parts, w.wires)), named('ohne Rueckfuehrung', plus(start, [P('U2', 'not', 360, 400, 0), P('U3', 'and', 540, 260, 0)], [W('E1.out', 'U3.in1'), W('E2.out', 'U2.in'), W('U2.out', 'U3.in2'), W('U3.out', 'L1.in')]))] };
    } });

  T({ id: 'P09', level: 'profi', ch: 15, diff: 2, tags: ['antrieb.treiber', 'sicherheit.nothalt', 'digital.und'], params: { U: [6, 9], nothalt: ['E2', 'E3'] },
    build: function (p) {
      var frei = p.nothalt === 'E2' ? 'E3' : 'E2';
      var start = lay([P('E1', 'logicin', 140, 180, 0), P('E2', 'logicin', 140, 280, 0), P('E3', 'logicin', 140, 380, 0), P('GND1', 'ground', 620, 560, 0), P('B1', 'battery', 840, 300, 0, p.U), P('M1', 'motor', 720, 240, 90)], [W('B1.p', 'M1.a'), W('B1.n', 'GND1.g')]);
      var parts = [P('U1', 'not', 280, 480, 0), P('U2', 'and', 320, 220, 0), P('U3', 'and', 440, 300, 0), P('R1', 'resistor', 520, 400, 0, 680), P('Q1', 'npn', 620, 400, 0)];
      var wires = [W(p.nothalt + '.out', 'U1.in'), W('E1.out', 'U2.in1'), W(frei + '.out', 'U2.in2'), W('U2.out', 'U3.in1'), W('U1.out', 'U3.in2'), W('U3.out', 'R1.a'), W('R1.b', 'Q1.b'), W('Q1.e', 'GND1.g'), W('M1.b', 'Q1.c')];
      var im = p.U / 20, S = function (a, b, c) { var s = { E1: on(a) }; s[frei] = on(b); s[p.nothalt] = on(c); return s; };
      var run = [{ sel: 'M1', i: [im * 0.9, im * 1.02] }], stop = [{ sel: 'M1', i: [0, 0.0001] }];
      return { title: 'Antrieb mit Freigabe und Not-Halt', palette: ['and', 'or', 'not', 'npn', 'resistor'], need: { npn: 1, resistor: 1 }, limit: { gates: 3, npn: 1 }, start: start, ref: plus(start, parts, wires),
        brief: 'Der Motor M1 (' + p.U + ' V) darf nur laufen, wenn <b>Start E1 = 1</b> und <b>Freigabe ' + frei + ' = 1</b> sind und der <b>Not-Halt ' + p.nothalt + ' nicht</b> ausgeloest ist (' + p.nothalt + ' = 1 heisst: Not-Halt gedrueckt). Die Logik steuert einen NPN-Transistor mit Basiswiderstand, der den Motor gegen Masse schaltet.<p class="limit">Erlaubt: hoechstens <b>3</b> Gatter, ein Transistor.</p>',
        tests: [{ name: 'Betrieb', steps: [{ name: 'Start + Freigabe', set: S(1, 1, 0), expect: run.concat([{ sel: 'Q1', state: 'sat' }, { noFault: true }]) }, { name: 'Not-Halt', set: S(1, 1, 1), expect: stop }] },
          { name: 'Ohne Freigabe', set: S(1, 0, 0), expect: stop }],
        hidden: [{ name: 'Ohne Start', set: S(0, 1, 0), expect: stop }, { name: 'Alles aus', set: S(0, 0, 0), expect: stop }, { name: 'Nur Not-Halt', set: S(0, 0, 1), expect: stop }, { name: 'Start + Not-Halt', set: S(1, 0, 1), expect: stop }],
        measure: [{ id: 'im', ask: 'Motorstrom im Betrieb', unit: 'mA', truth: { sel: 'M1', q: 'i' }, tol: 0.04, set: S(1, 1, 0) }],
        wrong: [named('Not-Halt nicht invertiert', plus(start, parts.filter(function (x) { return x.id !== 'U1'; }), wires.filter(function (w) { return w.to !== 'U1.in' && w.from !== 'U1.out'; }).concat([W(p.nothalt + '.out', 'U3.in2')]))),
          named('Freigabe vergessen', plus(start, parts.filter(function (x) { return x.id !== 'U2'; }), wires.filter(function (w) { return w.to.indexOf('U2.') && w.from !== 'U2.out'; }).concat([W('E1.out', 'U3.in1')])))] };
    } });

  T({ id: 'P10', level: 'profi', ch: 12, diff: 3, tags: ['digital.synchron', 'digital.zaehler'], params: { dir: ['vor', 'rueck'] },
    build: function (p) {
      var start = lay([P('E1', 'logicin', 160, 200, 0), P('GND1', 'ground', 120, 560, 0), P('L1', 'logicled', 860, 230, 0), P('L2', 'logicled', 860, 340, 0)]);
      var gate = p.dir === 'vor' ? 'xor' : 'xnor';
      var parts = function (g) { return [P('FF1', 'dff', 340, 220, 0), P('FF2', 'dff', 620, 360, 0), P('U1', g, 470, 380, 0)]; };
      var wires = [W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('FF1.Qn', 'FF1.D'), W('FF1.Q', 'U1.in1'), W('FF2.Q', 'U1.in2'), W('U1.out', 'FF2.D'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in')];
      var seq = p.dir === 'vor' ? [1, 2, 3, 0, 1] : [3, 2, 1, 0, 3], ex = function (n) { return [{ sel: 'L1', on: !!(n & 1) }, { sel: 'L2', on: !!(n & 2) }]; };
      return { title: 'Synchroner 2-Bit-Zaehler', palette: ['dff', 'xor', 'xnor', 'not', 'and', 'or'], need: { dff: 2 }, limit: { dff: 2, gates: 2 }, start: start, ref: plus(start, parts(gate), wires),
        brief: 'Entwirf einen <b>synchronen 2-Bit-' + (p.dir === 'vor' ? 'Vorwaertszaehler' : 'Rueckwaertszaehler') + '</b> aus zwei D-Flipflops: <b>beide</b> Flipflops haengen am Takt E1, die D-Eingaenge bekommen ihre Werte aus einer Logik. L1 = Wertigkeit 1, L2 = Wertigkeit 2. Zaehlfolge ab 0: <b>' + seq.slice(0, 4).join(' → ') + '</b>.<p class="limit">Erlaubt: zwei D-Flipflops, hoechstens <b>2</b> Gatter.</p>',
        tests: [clocks(1, ex(seq[0])), clocks(2, ex(seq[1]))], hidden: [clocks(3, ex(seq[2])), clocks(4, ex(seq[3])), clocks(5, ex(seq[4]))], measure: [],
        wrong: [named('falsche Zaehlrichtung', plus(start, parts(p.dir === 'vor' ? 'xnor' : 'xor'), wires))] };
    } });
})(typeof window !== 'undefined' ? window : globalThis);

/* Digital Quest Studio – Beispiele je Bauteil (Auftrag «Bauen», Paket 3)
 * Je Bauteil der Leiste eine kleine, lauffähige Schaltung. Gliederung wie die Bauteilleiste: Logik · Flip-Flops · Zähler · Anzeigen · Analog · Anwendungen.
 * Jedes Beispiel: {cat, id, name, text (ein erklärender Satz), build() → {layout, timing?, scopes?, bode?, run?}, demo?: {every, seq}}.
 * demo = Vorführung: Pegelschalter, Schalter und Regler laufen reihum durch ihre Zustände, bis jemand selbst etwas anfasst
 * (damit «läuft sofort» auch bei Schaltungen gilt, deren Eingänge sonst stillstehen). Zahlen sind Schleiferstellungen: {'P1.pos': 0.2}.
 * Aufgeräumt: Leitungen laufen gerade oder mit genau einem Knick, nichts verläuft übereinander. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E;
  var W = function (a, b) { return { from: a, to: b }; };
  function P(id, type, x, y, props, value, rot) { var p = { id: id, type: type, x: x, y: y, rot: rot || 0 }; if (props) p.props = props; if (value !== undefined && value !== null) p.value = value; return p; }
  var GND = function (x, y) { return P('GND1', 'ground', x, y); };
  var defs = [];
  function def(cat, id, name, text, build, extra) { var d = { cat: cat, id: id, name: name, text: text, build: build }; if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; }); defs.push(d); return d; }
  var SEQ2 = [{ E1: false, E2: false }, { E1: true, E2: false }, { E1: false, E2: true }, { E1: true, E2: true }]; // Eingänge e1, e2 als Zahl durchzählen (e1 niederwertig)
  var SEQ3 = []; for (var k3 = 0; k3 < 8; k3++) SEQ3.push({ E1: !!(k3 & 1), E2: !!(k3 & 2), E3: !!(k3 & 4) });

  /* ======================= Logik ======================= */
  var GATES = [
    ['and', 'UND', 'Der Ausgang ist nur 1, wenn beide Eingänge 1 sind.'], ['or', 'ODER', 'Der Ausgang ist 1, wenn mindestens ein Eingang 1 ist.'],
    ['nand', 'NAND', 'NICHT-UND: Der Ausgang ist nur 0, wenn beide Eingänge 1 sind.'], ['nor', 'NOR', 'NICHT-ODER: Der Ausgang ist nur 1, wenn beide Eingänge 0 sind.'],
    ['xor', 'XOR', 'Exklusiv-ODER: Der Ausgang ist 1, wenn die Eingänge verschieden sind.'], ['xnor', 'XNOR', 'Äquivalenz: Der Ausgang ist 1, wenn die Eingänge gleich sind.']
  ];
  /* ODER und UND zusätzlich mit 3 Eingängen zeigt die Eingangszahl; hier die Grundform mit zwei */
  GATES.forEach(function (g) {
    def('Logik', 'g_' + g[0], g[1] + '-Gatter', g[2] + ' Die Eingänge schalten von selbst durch; ein Klick auf einen Pegelschalter übernimmt.', function () {
      return { layout: { parts: [P('E1', 'logicin', 260, 240), P('E2', 'logicin', 260, 360), P('U1', g[0], 520, 300), P('L1', 'logicled', 780, 300), GND(260, 480)],
        wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'L1.in')] }, timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'E2.out' }, { kind: 'dig', a: 'U1.out' }] } };
    }, { demo: { every: 1, seq: SEQ2 }, gate: g[0] });
  });
  def('Logik', 'g_not', 'NICHT-Glied (Inverter)', 'Der Ausgang ist immer das Gegenteil des Eingangs. Der Eingang schaltet von selbst um; ein Klick übernimmt.', function () {
    return { layout: { parts: [P('E1', 'logicin', 260, 300), P('U1', 'not', 520, 300), P('L1', 'logicled', 780, 300), GND(260, 440)], wires: [W('E1.out', 'U1.in'), W('U1.out', 'L1.in')] },
      timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'U1.out' }] } };
  }, { demo: { every: 1.4, seq: [{ E1: false }, { E1: true }] }, gate: 'not' });
  def('Logik', 'g_zus', 'Zusammengesetzt: A = e1 ( e2 v e3 )', 'ODER, dann UND: Der Ausgang ist 1, wenn e1 = 1 ist und e2 oder e3 gleichzeitig 1 ist (Ausklammern: e1e2 v e1e3).', function () {
    return { layout: { parts: [P('E1', 'logicin', 240, 200), P('E2', 'logicin', 240, 320), P('E3', 'logicin', 240, 440), P('U1', 'or', 560, 380), P('U2', 'and', 820, 300), P('L1', 'logicled', 1040, 300), GND(240, 560)],
      wires: [W('E2.out', 'U1.in1'), W('E3.out', 'U1.in2'), W('U1.out', 'U2.in2'), W('E1.out', 'U2.in1'), W('U2.out', 'L1.in')] },
      timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'E2.out' }, { kind: 'dig', a: 'E3.out' }, { kind: 'dig', a: 'L1.in' }] } };
  }, { demo: { every: 0.8, seq: SEQ3 } });
  def('Logik', 'g_demorgan', 'De Morgan: NICHT(e1 e2) = NICHT e1 v NICHT e2', 'Oben ein NAND, unten zwei Inverter und ein ODER – beide Lampen leuchten immer gleich. Die Punkte auf den senkrechten Leitungen sind Abzweige.', function () {
    var N = function (id, x, y) { return P(id, 'node', x, y); };
    return { layout: { parts: [P('E1', 'logicin', 240, 320), P('E2', 'logicin', 240, 440), N('K1', 340, 320), N('K2', 340, 220), N('K3', 340, 540), N('K4', 400, 440), N('K5', 400, 260), N('K6', 400, 640),
      P('U1', 'nand', 560, 240), P('U2', 'not', 560, 540), P('U3', 'not', 560, 640), P('U4', 'or', 800, 590), P('L1', 'logicled', 800, 240), P('L2', 'logicled', 1000, 590), GND(240, 560)],
      wires: [W('E1.out', 'K1.p'), W('K1.p', 'K2.p'), W('K1.p', 'K3.p'), W('K2.p', 'U1.in1'), W('K3.p', 'U2.in'), W('E2.out', 'K4.p'), W('K4.p', 'K5.p'), W('K4.p', 'K6.p'), W('K5.p', 'U1.in2'), W('K6.p', 'U3.in'),
        W('U2.out', 'U4.in1'), W('U3.out', 'U4.in2'), W('U1.out', 'L1.in'), W('U4.out', 'L2.in')] },
      timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'E2.out' }, { kind: 'dig', a: 'L1.in' }, { kind: 'dig', a: 'L2.in' }] } };
  }, { demo: { every: 1, seq: SEQ2 } });
  def('Logik', 'g_halb', 'Halbaddierer (XOR und UND)', 'Summe (XOR) und Übertrag (UND) zweier Bits – die Eingänge schalten von selbst durch. Die Punkte sind Abzweige der beiden senkrechten Eingangsleitungen.', function () {
    var N = function (id, x, y) { return P(id, 'node', x, y); };
    return { layout: { parts: [P('E1', 'logicin', 240, 260), P('E2', 'logicin', 240, 380), N('K1', 340, 260), N('K2', 340, 280), N('K3', 340, 460), N('K4', 400, 380), N('K5', 400, 320), N('K6', 400, 500),
      P('U1', 'xor', 560, 300), P('U2', 'and', 560, 480), P('L1', 'logicled', 800, 300), P('L2', 'logicled', 800, 480), GND(240, 580)],
      wires: [W('E1.out', 'K1.p'), W('K1.p', 'K2.p'), W('K2.p', 'K3.p'), W('K2.p', 'U1.in1'), W('K3.p', 'U2.in1'), W('E2.out', 'K4.p'), W('K4.p', 'K5.p'), W('K4.p', 'K6.p'), W('K5.p', 'U1.in2'), W('K6.p', 'U2.in2'), W('U1.out', 'L1.in'), W('U2.out', 'L2.in')] },
      timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'E2.out' }, { kind: 'dig', a: 'L1.in' }, { kind: 'dig', a: 'L2.in' }] } };
  }, { demo: { every: 1, seq: SEQ2 } });

  /* ======================= Flip-Flops ======================= */
  /* Takt unten links, Dateneingänge oben links, preSet (E3) von oben, preClear (E4) von unten, Q und Q̄ auf Lampen */
  function ffExample(type, ins, sym, tfreq) {
    var three = ins.length === 2 && ins[0] !== 'D' && ins[0] !== 'T', fy = three ? { a: 280, c: 300, b: 320 } : { a: 280, c: 320 };
    var parts = [P('FF1', type, 560, 300, null), P('CLK1', 'clock', 240, three ? 300 : 380, { freq: tfreq }), P('L1', 'logicled', 800, 280), P('L2', 'logicled', 800, 360),
      P('E3', 'logicin', 400, 160), P('E4', 'logicin', 400, 440), GND(240, 520)];
    var wires = [W('CLK1.out', 'FF1.C'), W('FF1.Q', 'L1.in'), W('FF1.Qn', 'L2.in'), W('E3.out', 'FF1.PS'), W('E4.out', 'FF1.PC')];
    if (three) { parts.push(P('E1', 'logicin', 240, 180), P('E2', 'logicin', 240, 420)); wires.push(W('E1.out', 'FF1.' + ins[0]), W('E2.out', 'FF1.' + ins[1])); }
    else { parts.push(P('E1', 'logicin', 240, 220, ins[0] === 'T' ? { closed: true } : null)); wires.push(W('E1.out', 'FF1.' + ins[0])); }
    return { layout: { parts: parts, wires: wires }, timing: { rows: [{ kind: 'dig', a: 'CLK1.out' }, { kind: 'dig', a: 'E1.out' }].concat(three ? [{ kind: 'dig', a: 'E2.out' }] : []).concat([{ kind: 'dig', a: 'FF1.Q' }]) } };
  }
  var T_SLOW = [{ E1: false }, { E1: true }, { E1: true }, { E1: false }];
  def('Flip-Flops', 'ff_rs', 'RS-Flipflop', 'S = 1 setzt Q auf 1, R = 1 setzt auf 0, S = R = 0 speichert. Solange C = 1 ist, folgt Q den Eingängen. preSet und preClear (oben und unten) wirken sofort.', function () { return ffExample('rsff', ['S', 'R'], 'rs', 2); },
    { demo: { every: 1.2, seq: [{ E1: true, E2: false }, { E1: false, E2: false }, { E1: false, E2: true }, { E1: false, E2: false }] } });
  def('Flip-Flops', 'ff_d', 'D-Flipflop', 'Bei der steigenden Flanke an C übernimmt Q den Wert von D und behält ihn bis zur nächsten Flanke.', function () { return ffExample('dff', ['D']); },
    { demo: { every: 1.3, seq: [{ E1: true }, { E1: false }] } });
  def('Flip-Flops', 'ff_t', 'T-Flipflop', 'Mit T = 1 kippt Q bei jeder steigenden Flanke: Der Ausgang hat die halbe Taktfrequenz.', function () { return ffExample('tff', ['T']); },
    { demo: { every: 2.4, seq: [{ E1: true }, { E1: true }] } });
  def('Flip-Flops', 'ff_jk', 'JK-Flipflop', 'J = 1 setzt, K = 1 setzt zurück, J = K = 1 kippt, J = K = 0 speichert – jeweils bei der steigenden Flanke an C.', function () { return ffExample('jkff', ['J', 'K']); },
    { demo: { every: 1.2, seq: [{ E1: true, E2: false }, { E1: true, E2: true }, { E1: false, E2: true }, { E1: false, E2: false }] } });
  def('Flip-Flops', 'ff_jkms', 'JK-Master-Slave-Flipflop', 'Der Master nimmt J und K bei C = 1 auf, der Ausgang ändert sich erst bei der fallenden Flanke an C.', function () { return ffExample('jkms', ['J', 'K']); },
    { demo: { every: 1.2, seq: [{ E1: true, E2: false }, { E1: true, E2: true }, { E1: false, E2: true }, { E1: false, E2: false }] } });
  def('Flip-Flops', 'ff_knoten', 'Knotenpunkt: Takt auf vier Flipflops', 'Eine durchgehende Taktleitung mit Abzweigen (Punkt = verbunden): Alle vier T-Flipflops hängen am selben Takt und teilen nacheinander durch 2; oben die gemeinsame 1 für T.', function () {
    var parts = [P('CLK1', 'clock', 240, 460, { freq: 8 }), P('E1', 'logicin', 240, 240, { closed: true }), GND(240, 580)], wires = [];
    for (var i = 0; i < 4; i++) {
      var x = 480 + i * 240, n = i + 1;
      parts.push(P('FF' + n, 'tff', x, 360), P('KT' + n, 'node', x - 60, 240), P('KC' + n, 'node', x - 60, 460), P('L' + n, 'logicled', x + 120, 340));
      wires.push(W(i === 0 ? 'E1.out' : 'KT' + i + '.p', 'KT' + n + '.p'), W('KT' + n + '.p', 'FF' + n + '.T'), W(i === 0 ? 'CLK1.out' : 'KC' + i + '.p', 'KC' + n + '.p'), W('KC' + n + '.p', 'FF' + n + '.C'), W('FF' + n + '.Q', 'L' + n + '.in'));
    }
    return { layout: { parts: parts, wires: wires }, timing: { rows: [{ kind: 'dig', a: 'CLK1.out' }, { kind: 'dig', a: 'FF1.Q' }, { kind: 'dig', a: 'FF2.Q' }, { kind: 'dig', a: 'FF3.Q' }, { kind: 'dig', a: 'FF4.Q' }] } };
  });

  /* ======================= Zähler ======================= */
  /* Takt und Rückstellen links, Zähler Mitte, Lampen in einer Reihe darunter: Q0 ganz rechts, höchstes Bit links (so liest man die Zahl); Leitungen knicken einmal und kreuzen sich nicht */
  function ctrExample(type, props, freq) {
    var def0 = E.PARTS[type], nb = E.ctrBitCount(def0, Object.assign({}, def0.props, props || {}));
    var parts = [P('CLK1', 'clock', 240, 300, { freq: freq }), P('E1', 'logicin', 240, 420), P('Z1', type, 560, 300, props || null), GND(240, 540)], wires = [W('CLK1.out', 'Z1.C'), W('E1.out', 'Z1.R')];
    for (var i = 0; i < nb; i++) { var bx = 660 + 60 * (nb - 1 - i); parts.push(P('L' + (i + 1), 'logicled', bx, 520, null, null, 90)); wires.push(W('Z1.Q' + i, 'L' + (i + 1) + '.in')); }
    return { layout: { parts: parts, wires: wires }, timing: { auto: true } };
  }
  def('Zähler', 'z_async', 'Asynchroner Dualzähler', 'Jede Stufe taktet die nächste (Ripple-Zähler): Die Lampen zeigen die Zahl in Dualform, die Spur Q3 hat 1/16 der Taktfrequenz.', function () { return ctrExample('ctr_async', { bits: 4 }, 4); });
  def('Zähler', 'z_sync', 'Synchroner Dualzähler', 'Alle Stufen bekommen denselben Takt und schalten gemeinsam – hier abwärts zählend.', function () { return ctrExample('ctr_sync', { bits: 4, dir: 'down' }, 4); });
  def('Zähler', 'z_bcd', 'Dezimalzähler (BCD)', 'Zählt 0 bis 9 und springt dann auf 0 zurück – der Zählerstand 10 kommt nicht vor.', function () { return ctrExample('ctr_bcd', null, 4); });
  def('Zähler', 'z_johnson', 'Johnson-Zähler', 'Die Einsen wandern von unten nach oben ein und wieder hinaus: 8 Zustände mit 4 Flipflops, es ändert sich immer nur ein Bit.', function () { return ctrExample('ctr_johnson', { bits: 4 }, 4); });
  def('Zähler', 'z_mod', 'Modulo-6-Zähler', 'Zählt 0 bis 5 und beginnt dann von vorn (Modulus n = 6, einstellbar).', function () { return ctrExample('ctr_mod', { modn: 6 }, 4); });

  /* ======================= Anzeigen ======================= */
  def('Anzeigen', 'a_seg7', 'Siebensegmentanzeige mit BCD-Dekoder', 'Der Dezimalzähler liefert BCD, der Dekoder macht daraus die sieben Segmente a bis g – die Ziffern 0 bis 9 erscheinen.', function () {
    var parts = [P('CLK1', 'clock', 200, 300, { freq: 2 }), P('Z1', 'ctr_bcd', 460, 300), P('IC1', 'dec7', 760, 300), P('AZ1', 'seg7', 1060, 300), GND(200, 440)], wires = [W('CLK1.out', 'Z1.C')];
    ['A', 'B', 'C', 'D'].forEach(function (p, k) { wires.push(W('Z1.Q' + k, 'IC1.' + p)); });
    'abcdefg'.split('').forEach(function (s) { wires.push(W('IC1.' + s, 'AZ1.' + s)); });
    return { layout: { parts: parts, wires: wires }, timing: { rows: [{ kind: 'dig', a: 'CLK1.out' }], buses: [{ label: 'Ziffer', bits: [0, 1, 2, 3].map(function (k) { return { kind: 'dig', a: 'Z1.Q' + k }; }) }] } };
  });
  def('Anzeigen', 'a_led', 'Logikanzeige und Pegelschalter', 'Der Pegelschalter gibt 0 oder 1 vor, die Logikanzeige leuchtet bei 1. Der Taktgeber darunter schaltet selbst im Sekundentakt.', function () {
    return { layout: { parts: [P('E1', 'logicin', 280, 240), P('L1', 'logicled', 640, 240), P('CLK1', 'clock', 280, 400, { freq: 1 }), P('L2', 'logicled', 640, 400), GND(280, 520)], wires: [W('E1.out', 'L1.in'), W('CLK1.out', 'L2.in')] },
      timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'CLK1.out' }] } };
  }, { demo: { every: 1.4, seq: [{ E1: false }, { E1: true }] } });

  /* ======================= Analog ======================= */
  def('Analog', 'n_teiler', 'Spannungsteiler', 'Zwei Widerstände teilen die Spannung im Verhältnis ihrer Werte: 9 V an 1 kΩ und 2 kΩ ergibt 6 V an R2. Der Schalter schaltet von selbst; ein Klick auf ein Bauteil zeigt Spannung und Strom.', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, null, 9), P('S1', 'switch', 520, 200, { closed: true }), P('R1', 'resistor', 800, 320, null, 1000, 90), P('R2', 'resistor', 800, 480, null, 2000, 90), GND(240, 480)],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n'), W('B1.n', 'GND1.g')] } };
  }, { demo: { every: 1.4, seq: [{ S1: false }, { S1: true }] } });
  def('Analog', 'n_pot', 'Potentiometer als Spannungsteiler', 'Der Schleifer teilt die Spannung stufenlos: Je weiter er nach oben geht, desto grösser wird die Spannung an der Last. Der Regler läuft von selbst.', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, null, 9), P('P1', 'pot', 520, 320, { pos: 0.5 }, 10000, 270), P('R1', 'resistor', 780, 420, null, 10000, 90), GND(240, 520)],
      wires: [W('B1.p', 'P1.b'), W('P1.a', 'B1.n'), W('P1.w', 'R1.a'), W('R1.b', 'B1.n'), W('B1.n', 'GND1.g')] }, scopes: [{ channels: [{ kind: 'node', a: 'R1.a' }], span: 10 }] };
  }, { demo: { every: 0.7, seq: [{ 'P1.pos': 0.1 }, { 'P1.pos': 0.3 }, { 'P1.pos': 0.5 }, { 'P1.pos': 0.7 }, { 'P1.pos': 0.9 }, { 'P1.pos': 0.7 }, { 'P1.pos': 0.5 }, { 'P1.pos': 0.3 }] } });
  def('Analog', 'n_lampe', 'Schalter und Lampe', 'Der Schalter schliesst den Stromkreis: Nur bei geschlossenem Schalter fliesst Strom und die Lampe leuchtet.', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, null, 9), P('S1', 'switch', 520, 200), P('H1', 'lamp', 800, 320, null, 60, 90), GND(240, 480)], wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n'), W('B1.n', 'GND1.g')] } };
  }, { demo: { every: 1.4, seq: [{ S1: true }, { S1: false }] } });
  def('Analog', 'n_taster', 'Taster und Motor', 'Der Taster schliesst nur, solange er gedrückt wird; der Motor läuft dann und dreht sich mit dem Strom.', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, null, 9), P('S1', 'button', 520, 200), P('M1', 'motor', 800, 320, null, 20, 90), GND(240, 480)], wires: [W('B1.p', 'S1.a'), W('S1.b', 'M1.a'), W('M1.b', 'B1.n'), W('B1.n', 'GND1.g')] } };
  }, { demo: { every: 1.4, seq: [{ S1: true }, { S1: false }] } });
  def('Analog', 'n_amp', 'Strommessung mit dem Amperemeter', 'Ein Strommesser gehört in Reihe in den Stromkreis: Er zeigt den Strom, den auch der Widerstand führt (I = U / R).', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, null, 9), P('S1', 'switch', 520, 200, { closed: true }), P('A1', 'ammeter', 800, 200), P('R1', 'resistor', 1040, 320, null, 470, 90), GND(240, 480)],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n'), W('B1.n', 'GND1.g')] } };
  }, { demo: { every: 1.4, seq: [{ S1: false }, { S1: true }] } });
  def('Analog', 'n_led', 'LED mit Vorwiderstand', 'Der Vorwiderstand begrenzt den Strom: (9 V − 2 V) / 330 Ω ≈ 21 mA. Ohne ihn brennt die LED durch.', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, null, 9), P('S1', 'switch', 520, 200, { closed: true }), P('R1', 'resistor', 800, 200, null, 330), P('D1', 'led', 1040, 320, { color: 'rot' }, null, 90), GND(240, 480)],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n'), W('B1.n', 'GND1.g')] } };
  }, { demo: { every: 1.4, seq: [{ S1: false }, { S1: true }] } });
  def('Analog', 'n_rc', 'RC-Glied an Rechteckquelle', 'Lade- und Entladekurve des Kondensators im Oszilloskop; «τ bestimmen» liefert R · C = 1 ms.', function () {
    return { layout: { parts: [P('G1', 'acsource', 240, 320, { freq: 50, shape: 'square', ri: 0.05 }, 5), P('R1', 'resistor', 520, 200, null, 1000), P('C1', 'capacitor', 800, 320, null, 1e-6, 90), GND(240, 480)],
      wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n'), W('G1.n', 'GND1.g')] }, scopes: [{ channels: [{ kind: 'node', a: 'R1.b' }, { kind: 'node', a: 'G1.p' }] }] };
  });
  def('Analog', 'n_rl', 'RL-Glied an Rechteckquelle', 'Die Spule lässt den Strom nur langsam ansteigen: Die Spannung an L springt auf 5 V und fällt dann mit τ = L / R = 100 µs ab.', function () {
    return { layout: { parts: [P('G1', 'acsource', 240, 320, { freq: 500, shape: 'square', ri: 0.05 }, 5), P('R1', 'resistor', 520, 200, null, 100), P('L1', 'inductor', 800, 320, null, 10e-3, 90), GND(240, 480)],
      wires: [W('G1.p', 'R1.a'), W('R1.b', 'L1.a'), W('L1.b', 'G1.n'), W('G1.n', 'GND1.g')] }, scopes: [{ channels: [{ kind: 'node', a: 'R1.b' }, { kind: 'node', a: 'G1.p' }], span: 0.005 }] };
  });
  def('Analog', 'n_lc', 'Schwingkreis aus L und C', 'Sprungantwort einer Reihenschaltung: Die Spannung am Kondensator schwingt mit f = 1 / (2π · √(L · C)) = 503 Hz.', function () {
    return { layout: { parts: [P('B1', 'battery', 240, 320, { ri: 0.05 }, 5), P('L1', 'inductor', 520, 200, null, 10e-3), P('C1', 'capacitor', 800, 320, null, 10e-6, 90), GND(240, 480)],
      wires: [W('B1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'B1.n'), W('B1.n', 'GND1.g')] }, scopes: [{ channels: [{ kind: 'node', a: 'C1.a' }], span: 0.01 }] };
  });
  def('Analog', 'n_diode', 'Diode als Halbwellen-Gleichrichter', 'Die Diode lässt nur die positive Halbwelle durch: Am Widerstand steht ein pulsierender Gleichstrom (abzüglich 0,7 V Durchlassspannung).', function () {
    return { layout: { parts: [P('G1', 'acsource', 240, 320, { freq: 50, shape: 'sine', ri: 0.05 }, 5), P('D1', 'diode', 520, 200), P('R1', 'resistor', 800, 320, null, 1000, 90), GND(240, 480)],
      wires: [W('G1.p', 'D1.a'), W('D1.k', 'R1.a'), W('R1.b', 'G1.n'), W('G1.n', 'GND1.g')] }, scopes: [{ channels: [{ kind: 'node', a: 'G1.p' }, { kind: 'node', a: 'R1.a' }], span: 0.05 }] };
  });
  def('Analog', 'n_zener', 'Z-Diode als Begrenzer', 'Die Z-Diode begrenzt die Spannung nach oben auf ihre Z-Spannung (5,1 V) und nach unten auf −0,7 V; der Rest fällt am Vorwiderstand ab.', function () {
    return { layout: { parts: [P('G1', 'acsource', 240, 320, { freq: 50, shape: 'sine', ri: 0.05 }, 10), P('R1', 'resistor', 520, 200, null, 1000), P('Z1', 'zener', 800, 320, { vz: 5.1 }, null, 270), GND(240, 480)],
      wires: [W('G1.p', 'R1.a'), W('R1.b', 'Z1.k'), W('Z1.a', 'G1.n'), W('G1.n', 'GND1.g')] }, scopes: [{ channels: [{ kind: 'node', a: 'G1.p' }, { kind: 'node', a: 'R1.b' }], span: 0.05 }] };
  });
  def('Analog', 'n_npn', 'Transistor als Schalter', 'Ein kleiner Basisstrom (über R1) schaltet den grossen Kollektorstrom durch die Lampe: Der Transistor ist hier ein elektronischer Schalter.', function () {
    return { layout: { parts: [P('B1', 'battery', 200, 360, null, 9), P('S1', 'switch', 440, 240), P('R1', 'resistor', 640, 240, null, 4700), P('Q1', 'npn', 820, 360), P('H1', 'lamp', 960, 200, null, 60, 90), GND(200, 520)],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'Q1.b'), W('B1.p', 'H1.a'), W('H1.b', 'Q1.c'), W('Q1.e', 'B1.n'), W('B1.n', 'GND1.g')] } };
  }, { demo: { every: 1.4, seq: [{ S1: true }, { S1: false }] } });

  /* ======================= Anwendungen ======================= */
  def('Anwendungen', 'x_lauflicht', 'Lauflicht mit Johnson-Zähler', 'Ein Johnson-Zähler steuert vier Lampen: Die Leuchtreihe wandert in 8 Schritten hinein und wieder hinaus (0001, 0011, 0111, 1111, 1110 …) – es ändert sich immer nur eine Lampe.', function () { return ctrExample('ctr_johnson', { bits: 4 }, 3); });
  def('Anwendungen', 'x_schloss', 'Codeschloss', 'Das Schloss öffnet (Lampe leuchtet) nur bei der Kombination e1 = 1, e2 = 0, e3 = 1 – alle anderen Eingaben bleiben zu: A = e1 NICHT e2 e3.', function () {
    return { layout: { parts: [P('E1', 'logicin', 240, 200), P('E2', 'logicin', 240, 320), P('E3', 'logicin', 240, 440), P('N1', 'not', 480, 320), P('U1', 'and', 760, 320, { inputs: 3 }), P('L1', 'logicled', 980, 320), GND(240, 560)],
      wires: [W('E1.out', 'U1.in1'), W('E2.out', 'N1.in'), W('N1.out', 'U1.in2'), W('E3.out', 'U1.in3'), W('U1.out', 'L1.in')] },
      timing: { rows: [{ kind: 'dig', a: 'E1.out' }, { kind: 'dig', a: 'E2.out' }, { kind: 'dig', a: 'E3.out' }, { kind: 'dig', a: 'L1.in' }] } };
  }, { demo: { every: 0.8, seq: SEQ3 } });

  S.exampleDefs = defs;
})(window);

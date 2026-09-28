/* Kapitel 2 – Reihen- und Parallelschaltung
 * Quelle: Praktische Elektronik, Kap. 2.2–2.7 und 3 (Aufgaben 2–6, 8, 9, 11): Reihen- und Parallelschaltung, Kirchhoff,
 * Spannungsteiler, belasteter Spannungsteiler, reale Spannungsquelle. Werte teils an 0,25-W-Widerstaende angepasst. */
(function () {
  'use strict';

  defChapter({
    id: 2, title: 'Reihen- und Parallelschaltung',
    intro: 'Mehrere Widerstaende – wie teilen sich Strom und Spannung auf? Du baust Reihen- und Parallelschaltungen, Spannungsteiler und entlarvst eine Quelle, die nicht haelt, was sie verspricht.',
    sequence: ['T2A', '2.1', '2.2', '2.3', '2.4', '2.5', 'T2B', '2.6', '2.7', '2.8', '2.9', '2.10']
  });

  var bat = function (v, props) { var b = { id: 'B1', type: 'battery', value: v, x: 160, y: 300, rot: 0 }; if (props) b.props = props; return b; };
  var R = function (id, v, x, y, rot) { return { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; };
  var bB1 = { id: 'B1', x: 240, y: 460, rot: 0 };
  /* Reihe aus Widerstaenden an der Quelle (Schema: waagrecht oben, Rueckleitung zum Minuspol) */
  function chain(u, vals, withBat) {
    var parts = vals.map(function (v, i) { return R('R' + (i + 1), v, 280 + 120 * i, 200); }), wires = [];
    for (var i = 1; i < vals.length; i++) wires.push(W('R' + i + '.b', 'R' + (i + 1) + '.a'));
    if (withBat !== false) { parts.unshift(bat(u)); wires.unshift(W('B1.p', 'R1.a')); wires.push(W('R' + vals.length + '.b', 'B1.n')); }
    return { parts: parts, wires: wires };
  }
  var benchChain = function (n, withBat) {
    var p = []; for (var i = 0; i < n; i++) p.push({ id: 'R' + (i + 1), x: 400 + 150 * i, y: 290, rot: 0 });
    if (withBat !== false) p.unshift(bB1); return { parts: p };
  };
  /* Widerstaende parallel an der Quelle (Schema: senkrecht nebeneinander) */
  function para(u, vals, withBat) {
    var parts = vals.map(function (v, i) { return R('R' + (i + 1), v, 360 + 120 * i, 300, 90); }), wires = [];
    for (var i = 1; i < vals.length; i++) { wires.push(W('R' + i + '.a', 'R' + (i + 1) + '.a')); wires.push(W('R' + i + '.b', 'R' + (i + 1) + '.b')); }
    if (withBat !== false) { parts.unshift(bat(u)); wires.unshift(W('B1.p', 'R1.a')); wires.push(W('R1.b', 'B1.n')); }
    return { parts: parts, wires: wires };
  }
  var benchPara = function (n, withBat) {
    var p = []; for (var i = 0; i < n; i++) p.push({ id: 'R' + (i + 1), x: 460 + 130 * i, y: 380, rot: 90 });
    if (withBat !== false) p.unshift(bB1); return { parts: p };
  };
  var named = function (name, l) { l.name = name; return l; };

  /* ================= Theorie A ================= */
  defTheory({
    id: 'T2A', ch: 2, title: 'Die Reihenschaltung', tags: ['elektro.reihenschaltung', 'elektro.kirchhoff'],
    lesson:
      '<p>In der <b>Reihenschaltung</b> liegen die Bauteile hintereinander – es gibt nur <i>einen</i> Weg fuer den Strom.</p>' +
      '<ul><li>Der <b>Strom ist ueberall gleich gross</b>: I = I<sub>1</sub> = I<sub>2</sub> = …</li>' +
      '<li>Die Widerstaende addieren sich: <b>R<sub>ges</sub> = R<sub>1</sub> + R<sub>2</sub> + …</b></li>' +
      '<li>Die Spannungen addieren sich zur Quellenspannung (<b>Maschenregel</b>, 2. Kirchhoffsches Gesetz): U = U<sub>1</sub> + U<sub>2</sub> + …</li>' +
      '<li>Die Spannung teilt sich <b>im Verhaeltnis der Widerstaende</b> auf: Am groesseren Widerstand liegt die groessere Spannung.</li></ul>' +
      '<div class="formula">U<sub>1</sub> = U · R<sub>1</sub> / R<sub>ges</sub></div>' +
      '<p>Faellt ein Bauteil der Reihe aus (Unterbrechung), fliesst <i>nirgends</i> mehr Strom – wie bei einer alten Lichterkette.</p>',
    questions: [
      { q: 'Wie verhaelt sich der Strom in einer Reihenschaltung?', options: ['Er ist an jeder Stelle gleich gross', 'Er wird nach jedem Widerstand kleiner', 'Er teilt sich auf die Widerstaende auf', 'Er ist am groessten Widerstand am groessten'], correct: 0, explain: 'Es gibt nur einen Weg – was hineinfliesst, fliesst auch wieder hinaus.' },
      { q: '1 kΩ, 100 Ω, 220 Ω und 470 Ω liegen in Reihe. Wie gross ist der Gesamtwiderstand?', options: ['79 Ω', '790 Ω', '1,79 kΩ', '17,9 kΩ'], correct: 2,
        explain: 'R_ges = 1000 + 100 + 220 + 470 = 1790 Ω.', verify: { layout: chain(10, [1000, 100, 220, 470], false), mode: 'R', a: 'R1.a', b: 'R4.b' } },
      { q: 'Diese Reihe liegt an 10 V. Welche Spannung liegt am 1-kΩ-Widerstand?', options: ['1 V', '2,5 V', '5,59 V', '10 V'], correct: 2,
        explain: 'U₁ = 10 V · 1000 Ω / 1790 Ω ≈ 5,59 V.', verify: { layout: chain(10, [1000, 100, 220, 470]), mode: 'V', a: 'R1.a', b: 'R1.b' } },
      { q: 'Was sagt die Maschenregel?', options: ['Die Summe der Teilstroeme ist null', 'Die Summe der Teilspannungen ergibt die Quellenspannung', 'Alle Spannungen sind gleich', 'Die Spannung ist am Anfang der Reihe am groessten'], correct: 1, explain: 'U = U₁ + U₂ + … – die Quellenspannung verteilt sich auf die Bauteile.' },
      { q: 'In einer Lichterkette (Reihe) brennt eine Lampe durch. Was passiert?', options: ['Nur diese Lampe ist dunkel', 'Alle Lampen gehen aus', 'Die anderen leuchten heller', 'Nichts'], correct: 1, explain: 'Die Unterbrechung trennt den einzigen Stromweg.' }
    ]
  });

  /* ================= Aufgaben 1–5 ================= */
  defTask({
    id: '2.1', ch: 2, title: 'Vier gleiche Widerstaende', tags: ['elektro.reihenschaltung', 'messen.spannung'],
    story: 'Aus einer 10-V-Versorgung sollen vier gleich grosse Teilspannungen entstehen.',
    brief: 'Schalte <b>vier Widerstaende von je 1 kΩ in Reihe</b> an die 10-V-Quelle. Miss die Spannung an R1 und den Strom.',
    learn: 'Gleiche Widerstaende in Reihe teilen die Spannung gleichmaessig.',
    take: 'Vier gleiche Widerstaende – vier gleiche Teilspannungen: 10 V / 4 = 2,5 V.',
    hint: 'Hole viermal einen Widerstand (Standard 1 kΩ) und verbinde sie hintereinander: R1.b mit R2.a usw.',
    hint2: 'B1.+ → R1 → R2 → R3 → R4 → B1.–',
    palette: ['resistor'], need: { resistor: 4 },
    start: { parts: [bat(10)], wires: [] }, ref: chain(10, [1000, 1000, 1000, 1000]),
    bench: benchChain(4),
    wrong: [named('R4 parallel statt in Reihe', { parts: chain(10, [1000, 1000, 1000, 1000]).parts, wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'R3.a'), W('R3.b', 'B1.n'), W('R4.a', 'R3.a'), W('R4.b', 'R3.b')] })],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@resistor', v: [2.45, 2.55] }, { noFault: true }] }],
    measure: [
      { id: 'u1', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'i', ask: 'Strom im Kreis', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 }
    ]
  });

  var mixed = chain(10, [1000, 100, 220, 470]);
  defTask({
    id: '2.2', ch: 2, title: 'Die Spannung teilt sich auf', tags: ['elektro.reihenschaltung', 'messen.spannung', 'elektro.kirchhoff'],
    story: 'Im Pruefprotokoll fehlen alle Spannungen der Widerstandskette. Ohne Messwerte keine Freigabe.',
    brief: 'Miss die Spannungen an <b>R1, R2, R3 und R4</b> und den <b>Strom</b>. Pruefe: Ergibt die Summe der Teilspannungen die 10 V der Quelle?',
    learn: 'Maschenregel: U = U₁ + U₂ + U₃ + U₄.',
    take: 'Die Spannung teilt sich proportional zu den Widerstaenden auf – am grossen Widerstand liegt viel Spannung.',
    hint: 'V⎓ waehlen, jeweils rot an .a und schwarz an .b des Widerstands.',
    hint2: 'Rechnung zur Kontrolle: I = 10 V / 1790 Ω ≈ 5,59 mA; U₁ = 1 kΩ · I ≈ 5,59 V.',
    palette: [], start: mixed, ref: mixed, bench: benchChain(4),
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'u1', ask: 'U1 an R1 (1 kΩ)', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'u2', ask: 'U2 an R2 (100 Ω)', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 },
      { id: 'u3', ask: 'U3 an R3 (220 Ω)', unit: 'V', mode: 'V', a: 'R3.a', b: 'R3.b', tol: 0.03 },
      { id: 'u4', ask: 'U4 an R4 (470 Ω)', unit: 'V', mode: 'V', a: 'R4.a', b: 'R4.b', tol: 0.03 },
      { id: 'i', ask: 'Strom im Kreis', unit: 'mA', truth: { sel: 'R3', q: 'i' }, tol: 0.03 }
    ]
  });

  var chainNoBat = chain(0, [1000, 100, 220, 470], false);
  defTask({
    id: '2.3', ch: 2, title: 'Gesamtwiderstand messen', tags: ['elektro.reihenschaltung', 'messen.widerstand'],
    story: 'Die Widerstandskette liegt ausgebaut auf dem Tisch. Stimmt der Gesamtwert mit der Rechnung ueberein?',
    brief: 'Miss mit dem Ohmmeter den <b>Gesamtwiderstand</b> der Kette (von R1.a bis R4.b) und zur Kontrolle den Widerstand von R4.',
    learn: 'In Reihe addieren sich die Widerstaende.',
    take: 'R_ges = R₁ + R₂ + R₃ + R₄ – gemessen ohne Spannung, direkt an den Enden der Kette.',
    hint: 'Ω waehlen, rote Spitze an R1.a, schwarze an R4.b.',
    hint2: 'Erwartet: 1000 + 100 + 220 + 470 = 1790 Ω = 1,79 kΩ.',
    palette: [], start: chainNoBat, ref: chainNoBat, bench: benchChain(4, false),
    tests: [{ name: 'Kette', expect: [{ noFault: true }] }],
    measure: [
      { id: 'rges', ask: 'Gesamtwiderstand R1.a → R4.b', unit: 'kΩ', mode: 'R', a: 'R1.a', b: 'R4.b', tol: 0.03 },
      { id: 'r4', ask: 'Widerstand R4', unit: 'Ω', mode: 'R', a: 'R4.a', b: 'R4.b', tol: 0.03 }
    ]
  });

  var lamps = function (series) {
    var p = [bat(9), { id: 'H1', type: 'lamp', x: 340, y: 200, rot: 0 }, { id: 'H2', type: 'lamp', x: 520, y: 300, rot: 90 }];
    return series ? { parts: p, wires: [W('B1.p', 'H1.a'), W('H1.b', 'H2.a'), W('H2.b', 'B1.n')] }
      : { parts: p, wires: [W('B1.p', 'H1.a'), W('H1.b', 'B1.n'), W('B1.p', 'H2.a'), W('H2.b', 'B1.n')] };
  };
  defTask({
    id: '2.4', ch: 2, title: 'Zwei Lampen in Reihe', tags: ['elektro.reihenschaltung', 'bauteil.lampe'],
    story: 'Fuer die Nachtbeleuchtung sollen zwei Lampen an der 9-V-Batterie haengen – bewusst gedaempft.',
    brief: 'Schalte eine <b>zweite Lampe H2 in Reihe</b> zu H1. Beobachte die Helligkeit und miss die Spannung an H1.',
    learn: 'Zwei gleiche Verbraucher in Reihe teilen sich die Spannung.',
    take: 'In Reihe bekommt jede Lampe nur die halbe Spannung – und leuchtet deutlich schwaecher (P = U² / R: ein Viertel).',
    hint: 'Der Strom soll zuerst durch H1, dann durch H2 fliessen.',
    hint2: 'B1.+ → H1 → H2 → B1.–',
    palette: ['lamp'], need: { lamp: 2 },
    start: { parts: [bat(9), { id: 'H1', type: 'lamp', x: 340, y: 200, rot: 0 }], wires: [] }, ref: lamps(true),
    bench: { parts: [bB1, { id: 'H1', x: 500, y: 290, rot: 0 }, { id: 'H2', x: 760, y: 440, rot: 0 }] },
    wrong: [named('Lampen parallel', lamps(false))],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@lamp', i: [0.07, 0.08] }, { noFault: true }] }],
    measure: [{ id: 'u1', ask: 'Spannung an H1', unit: 'V', mode: 'V', a: 'H1.a', b: 'H1.b', tol: 0.03 }]
  });

  var div15 = function (r1, r2) { return { parts: [bat(15), R('R1', r1, 360, 240, 90), R('R2', r2, 360, 380, 90)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')] }; };
  defTask({
    id: '2.5', ch: 2, title: 'Spannungsteiler auslegen', tags: ['elektro.spannungsteiler', 'elektro.dimensionieren'],
    story: 'Ein Sensoreingang vertraegt hoechstens 5 V – die Versorgung liefert aber 15 V.',
    brief: 'Baue einen <b>Spannungsteiler</b> aus R1 (oben, am Pluspol) und R2 (unten, am Minuspol), sodass an <b>R2 genau 5 V (±2 %)</b> liegen. Beide Widerstaende hoechstens 100 kΩ. Miss U2.',
    learn: 'Spannungsteiler: U₂ = U · R₂ / (R₁ + R₂).',
    take: 'Das Verhaeltnis der Widerstaende bestimmt die Teilspannung – nicht ihr absoluter Wert.',
    hint: 'Fuer 5 V von 15 V muss R₂ ein Drittel des Gesamtwiderstands sein.',
    hint2: 'Zum Beispiel R1 = 2 kΩ und R2 = 1 kΩ (oder 20 kΩ und 10 kΩ).',
    palette: ['resistor'], need: { resistor: 2 },
    start: { parts: [bat(15)], wires: [] }, ref: div15(2000, 1000),
    bench: { parts: [bB1, { id: 'R1', x: 560, y: 300, rot: 90 }, { id: 'R2', x: 720, y: 480, rot: 90 }] },
    wrong: [named('gleiche Widerstaende (7,5 V)', div15(1000, 1000)), named('R1 und R2 vertauscht (10 V)', div15(1000, 2000))],
    tests: [{ name: 'Teiler', expect: [{ a: 'R2.a', b: 'R2.b', v: [4.9, 5.1] }, { noFault: true }] }],
    measure: [{ id: 'u2', ask: 'Spannung U2 an R2', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 }]
  });

  /* ================= Theorie B ================= */
  var par2 = para(0, [1000, 1000], false);
  defTheory({
    id: 'T2B', ch: 2, title: 'Parallelschaltung, Knotenregel, Spannungsteiler', tags: ['elektro.parallelschaltung', 'elektro.kirchhoff', 'elektro.spannungsteiler', 'elektro.quelle'],
    lesson:
      '<p>In der <b>Parallelschaltung</b> liegen alle Bauteile an <i>denselben zwei Punkten</i>:</p>' +
      '<ul><li>An allen liegt <b>dieselbe Spannung</b>.</li>' +
      '<li>Die Teilstroeme addieren sich zum Gesamtstrom (<b>Knotenregel</b>, 1. Kirchhoffsches Gesetz): I = I₁ + I₂ + …</li>' +
      '<li>Der Strom teilt sich <b>umgekehrt proportional</b> zu den Widerstaenden – durch den kleinen Widerstand fliesst viel.</li>' +
      '<li>Der Gesamtwiderstand ist <b>kleiner als der kleinste</b> Einzelwiderstand. Fuer zwei: R = R₁ · R₂ / (R₁ + R₂); allgemein ueber die Leitwerte G = 1/R (Siemens): 1/R = 1/R₁ + 1/R₂ + …</li></ul>' +
      '<p><b>Spannungsteiler:</b> U₂ = U · R₂ / (R₁ + R₂). Haengst du eine Last R<sub>L</sub> parallel zu R₂, wird der untere Teil kleiner (R₂ ∥ R<sub>L</sub>) – U₂ <b>sinkt</b>. Je kleiner R<sub>L</sub>, desto staerker.</p>' +
      '<p><b>Reale Quelle:</b> Jede Quelle hat einen <b>Innenwiderstand R<sub>i</sub></b>. Ohne Last misst du die Leerlaufspannung U₀, unter Last sinkt die Klemmenspannung: R<sub>i</sub> = (U₀ − U<sub>Last</sub>) / I.</p>',
    questions: [
      { q: 'Zwei Widerstaende von je 1 kΩ sind parallel geschaltet. Gesamtwiderstand?', options: ['250 Ω', '500 Ω', '1 kΩ', '2 kΩ'], correct: 1,
        explain: 'R = 1 kΩ · 1 kΩ / 2 kΩ = 500 Ω – bei gleichen Widerstaenden die Haelfte.', verify: { layout: par2, mode: 'R', a: 'R1.a', b: 'R1.b' } },
      { q: 'In einen Knoten fliessen 30 mA hinein, ein Zweig fuehrt 10 mA ab. Wie viel fliesst im zweiten Abzweig?', options: ['10 mA', '20 mA', '30 mA', '40 mA'], correct: 1, explain: 'Knotenregel: Zufluss = Abfluss, also 30 mA − 10 mA = 20 mA.' },
      { q: '15 V, R1 = 2 kΩ oben, R2 = 1 kΩ unten. Welche Spannung liegt an R2?', options: ['3 V', '5 V', '7,5 V', '10 V'], correct: 1,
        explain: 'U₂ = 15 V · 1 kΩ / 3 kΩ = 5 V.', verify: { layout: div15(2000, 1000), mode: 'V', a: 'R2.a', b: 'R2.b' } },
      { q: 'Was passiert mit U₂, wenn eine Last parallel zu R₂ angeschlossen wird?', options: ['U₂ steigt', 'U₂ sinkt', 'U₂ bleibt gleich', 'U₂ wird negativ'], correct: 1, explain: 'R₂ ∥ R_L ist kleiner als R₂ – der untere Teil des Teilers bekommt weniger Spannung.' },
      { q: 'Leerlauf 10 V, unter Last 9,1 V bei 9 mA. Wie gross ist der Innenwiderstand?', options: ['1 Ω', '10 Ω', '100 Ω', '1 kΩ'], correct: 2, explain: 'R_i = (10 V − 9,1 V) / 0,009 A = 100 Ω.' }
    ]
  });

  /* ================= Aufgaben 6–10 ================= */
  defTask({
    id: '2.6', ch: 2, title: 'Zwei Wege fuer den Strom', tags: ['elektro.parallelschaltung', 'messen.strom', 'elektro.kirchhoff'],
    story: 'Die Heizung im Pruefstand hat zwei gleiche Heizwiderstaende, die gemeinsam an 10 V haengen.',
    brief: 'Schalte <b>zwei Widerstaende von 1 kΩ parallel</b> an die 10-V-Quelle. Miss den Strom durch R1 und den <b>Gesamtstrom</b> aus der Quelle.',
    learn: 'Knotenregel: Die Teilstroeme addieren sich zum Gesamtstrom.',
    take: 'Parallel liegen alle Zweige an derselben Spannung, die Stroeme addieren sich: 10 mA + 10 mA = 20 mA.',
    hint: 'Beide Widerstaende bekommen oben dieselbe Verbindung zu B1.+ und unten zu B1.–.',
    hint2: 'Fuer den Gesamtstrom die Leitung direkt am Pluspol (B1.+) auftrennen und dort messen.',
    palette: ['resistor', 'ammeter'], need: { resistor: 2 },
    start: { parts: [bat(10)], wires: [] }, ref: para(10, [1000, 1000]), bench: benchPara(2),
    wrong: [named('in Reihe statt parallel', chain(10, [1000, 1000]))],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@resistor', i: [0.0098, 0.0102] }, { sel: 'B1', i: [0.0195, 0.0205] }, { noFault: true }] }],
    measure: [
      { id: 'i1', ask: 'Strom durch R1', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 },
      { id: 'iges', ask: 'Gesamtstrom aus der Quelle', unit: 'mA', truth: { sel: 'B1', q: 'i' }, tol: 0.03 }
    ]
  });

  var p5 = para(5, [10000, 220]);
  defTask({
    id: '2.7', ch: 2, title: 'Wer bekommt den Strom?', tags: ['elektro.parallelschaltung', 'messen.strom'],
    story: 'Ein hochohmiger Sensor (10 kΩ) und ein Lastwiderstand (220 Ω) haengen parallel an 5 V.',
    brief: 'Miss die Stroeme durch <b>R1 (10 kΩ)</b> und <b>R2 (220 Ω)</b>, die Spannung an R1 und den Gesamtstrom.',
    learn: 'Der Strom teilt sich umgekehrt proportional zu den Widerstaenden auf.',
    take: 'Durch den kleinen Widerstand fliesst fast der ganze Strom – der grosse Widerstand „merkt“ man kaum.',
    hint: 'Fuer jeden Zweigstrom die Leitung genau in diesem Zweig auftrennen.',
    hint2: 'Kontrolle: I₁ = 5 V / 10 kΩ = 0,5 mA, I₂ = 5 V / 220 Ω ≈ 22,7 mA.',
    palette: ['ammeter'], start: p5, ref: p5, bench: benchPara(2),
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'u', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'i1', ask: 'Strom durch R1', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 },
      { id: 'i2', ask: 'Strom durch R2', unit: 'mA', truth: { sel: 'R2', q: 'i' }, tol: 0.03 },
      { id: 'iges', ask: 'Gesamtstrom', unit: 'mA', truth: { sel: 'B1', q: 'i' }, tol: 0.03 }
    ]
  });

  var p4 = para(0, [1000, 220, 100, 10000], false);
  defTask({
    id: '2.8', ch: 2, title: 'Kleiner als der kleinste', tags: ['elektro.parallelschaltung', 'messen.widerstand'],
    story: 'Vier Widerstaende sind parallel verloetet. Welcher Gesamtwiderstand ergibt sich?',
    brief: 'Miss den <b>Gesamtwiderstand</b> der Parallelschaltung (1 kΩ, 220 Ω, 100 Ω, 10 kΩ) und zum Vergleich den kleinsten Einzelwiderstand R3.',
    learn: 'Parallel ist der Gesamtwiderstand kleiner als der kleinste Einzelwiderstand.',
    take: 'Jeder zusaetzliche Zweig ist ein weiterer Weg – der Gesamtwiderstand sinkt: 1/R = 1/R₁ + 1/R₂ + …',
    hint: 'Ω waehlen und an die gemeinsamen Anschluesse oben (R1.a) und unten (R1.b) gehen.',
    hint2: 'Rechnung: G = 1 mS + 4,55 mS + 10 mS + 0,1 mS = 15,65 mS → R ≈ 63,9 Ω.',
    palette: [], start: p4, ref: p4, bench: benchPara(4, false),
    tests: [{ name: 'Netzwerk', expect: [{ noFault: true }] }],
    measure: [
      { id: 'rges', ask: 'Gesamtwiderstand', unit: 'Ω', mode: 'R', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'r3', ask: 'Kleinster Einzelwiderstand R3 (100 Ω) – gemessen in der Schaltung', unit: 'Ω', mode: 'R', a: 'R3.a', b: 'R3.b', tol: 0.03 }
    ]
  });

  var loaded = function (rl, series) {
    var l = { parts: [bat(10), R('R1', 10000, 360, 240, 90), R('R2', 10000, 360, 380, 90)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')] };
    if (rl) { l.parts.push(R('R3', rl, 500, 380, 90)); l.wires = l.wires.concat(series ? [] : [W('R3.a', 'R2.a'), W('R3.b', 'R2.b')]); }
    if (rl && series) l.wires = [W('B1.p', 'R1.a'), W('R1.b', 'R3.a'), W('R3.b', 'R2.a'), W('R2.b', 'B1.n')];
    return l;
  };
  defTask({
    id: '2.9', ch: 2, title: 'Der belastete Spannungsteiler', tags: ['elektro.spannungsteiler', 'messen.spannung'],
    story: 'Der Teiler liefert im Leerlauf saubere 5 V. Kaum ist der Verbraucher angeschlossen, stimmt nichts mehr.',
    brief: 'Schliesse eine <b>Last R3 = 10 kΩ parallel zu R2</b> an. Miss U2 <b>mit</b> Last. Wie viel ist davon noch uebrig?',
    learn: 'Eine Last parallel zu R₂ senkt die Teilspannung.',
    take: 'R₂ ∥ R_L = 5 kΩ statt 10 kΩ – aus 5 V werden 3,33 V. Abhilfe: niederohmigerer Teiler oder hochohmigere Last.',
    hint: 'Miss U2 zuerst ohne Last (5 V), dann baue R3 ein: oben an R2.a, unten an R2.b.',
    hint2: 'Rechnung: R₂ ∥ R₃ = 5 kΩ; U₂ = 10 V · 5 kΩ / 15 kΩ ≈ 3,33 V.',
    palette: ['resistor'], need: { resistor: 3 },
    start: loaded(0), ref: loaded(10000),
    bench: { parts: [bB1, { id: 'R1', x: 540, y: 300, rot: 90 }, { id: 'R2', x: 680, y: 480, rot: 90 }, { id: 'R3', x: 840, y: 480, rot: 90 }] },
    wrong: [named('Last parallel zu R1 statt zu R2', { parts: loaded(10000).parts, wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n'), W('R3.a', 'R1.a'), W('R3.b', 'R1.b')] })],
    tests: [{ name: 'belastet', expect: [{ a: 'R2.a', b: 'R2.b', v: [3.2, 3.45] }, { noFault: true }] }],
    measure: [{ id: 'u2', ask: 'U2 mit Last', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 }]
  });

  var realSrc = function (closed) {
    return { parts: [bat(10, { ri: 100 }), { id: 'S1', type: 'switch', props: { closed: closed }, x: 300, y: 200, rot: 0 }, R('R1', 1000, 480, 300, 90)],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'B1.n')] };
  };
  defTask({
    id: '2.10', ch: 2, title: 'Die schwache Quelle', tags: ['elektro.quelle', 'messen.spannung', 'elektro.ohm'],
    story: 'Die Pruefquelle zeigt im Leerlauf 10 V. Unter Last bricht sie ein. Wie gross ist ihr Innenwiderstand?',
    brief: 'Miss die <b>Leerlaufspannung</b> (S1 offen) und die <b>Klemmenspannung unter Last</b> (S1 geschlossen, Last 1 kΩ). Berechne daraus den <b>Innenwiderstand</b> der Quelle.',
    learn: 'Jede reale Quelle hat einen Innenwiderstand: R_i = (U₀ − U_Last) / I.',
    take: 'Je mehr Strom du entnimmst, desto mehr Spannung „bleibt in der Quelle“ haengen – die Klemmenspannung sinkt.',
    hint: 'Miss an B1.+ und B1.– einmal mit offenem und einmal mit geschlossenem Schalter. Der Strom unter Last ist I = U_Last / 1 kΩ.',
    hint2: 'Beispiel: U₀ = 10 V, U_Last = 9,09 V → I = 9,09 mA → R_i = 0,91 V / 9,09 mA ≈ 100 Ω.',
    palette: [], start: realSrc(false), ref: realSrc(false),
    bench: { parts: [bB1, { id: 'S1', x: 520, y: 290, rot: 0 }, { id: 'R1', x: 760, y: 440, rot: 90 }] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'u0', ask: 'Leerlaufspannung U₀ (S1 offen)', unit: 'V', mode: 'V', a: 'B1.p', b: 'B1.n', tol: 0.03, set: { S1: { closed: false } } },
      { id: 'ul', ask: 'Klemmenspannung unter Last (S1 zu)', unit: 'V', mode: 'V', a: 'B1.p', b: 'B1.n', tol: 0.03, set: { S1: { closed: true } } },
      { id: 'ri', ask: 'Innenwiderstand R_i (berechnet)', unit: 'Ω', value: 100, tol: 0.08 }
    ]
  });
})();

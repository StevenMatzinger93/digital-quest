/* Kapitel 13 – Praktische Elektronik: Diode, Z-Diode, Transistor
 * Quelle: Praktische Elektronik Kap. 6 (Halbleiterdioden, Si-Diode, Gleichrichter, Z-Diode an Gleichspannung, Aufgabe 23
 * Kennlinie, Aufgabe 24 Z-Diodenstabilisierung 10 V ± 20 %, R_L 500 Ω … 2 kΩ), Kap. 7 (Bipolarer Transistor, Transistor als
 * Schalter, als Verstaerker). */
(function () {
  'use strict';
  defChapter({
    id: 13, title: 'Diode, Z-Diode und Transistor',
    intro: 'Halbleiter in der Praxis: Dioden lassen Strom nur in eine Richtung, Z-Dioden halten Spannungen fest, Transistoren schalten grosse Lasten mit kleinen Steuerströmen – die Brücke von der Logik zur Leistung.',
    sequence: ['T13A', '13.1', '13.2', '13.3', '13.4', '13.5', 'T13B', '13.6', '13.7', '13.8', '13.9', '13.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  var B = function (v, x, y) { return { id: 'B1', type: 'battery', value: v, x: x || 160, y: y || 300, rot: 0 }; };
  var R = function (id, v, x, y, rot) { return { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; };
  var bB1 = { id: 'B1', x: 240, y: 460, rot: 0 };

  defTheory({
    id: 'T13A', ch: 13, title: 'Diode und Z-Diode', tags: ['bauteil.diode', 'bauteil.zdiode'],
    merksatz: 'Die Diode leitet ab etwa 0,7 V in Durchlassrichtung und sperrt umgekehrt; die Z-Diode wird in Sperrrichtung betrieben, hält ab U_Z die Spannung fest und braucht dafür immer einen Vorwiderstand.',
    visual: { type: 'circuit', caption: 'Z-Diode in Sperrrichtung mit Vorwiderstand: Unter 5,1 V sperrt sie – die ganze Spannung liegt an ihr. Darüber bricht sie durch und hält ihre Spannung fest, der Rest fällt an R1 ab.',
      layout: { parts: [{ id: 'B1', type: 'battery', value: 8, x: 160, y: 300 }, { id: 'R1', type: 'resistor', value: 470, x: 320, y: 200 }, { id: 'Z1', type: 'zener', x: 480, y: 300, rot: 270 }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'Z1.k'), W('Z1.a', 'B1.n')] },
      bench: { parts: [{ id: 'B1', x: 240, y: 460 }, { id: 'R1', x: 500, y: 290 }, { id: 'Z1', x: 740, y: 460, rot: 270 }] },
      sliders: [{ part: 'B1', prop: 'value', label: 'Speisespannung', min: 1, max: 12, step: 0.5, unit: 'V' }],
      readouts: [{ label: 'U an Z1', sel: 'Z1', q: 'v' }, { label: 'I', sel: 'R1', q: 'i' }, { label: 'U an R1', sel: 'R1', q: 'v' }] },
    lesson:
      '<p>Eine <b>Diode</b> leitet in <b>Durchlassrichtung</b> (Anode + , Kathode −, am Ring erkennbar) ab ihrer Schleusenspannung: Silizium ca. <b>0,7 V</b>, Germanium ca. 0,3 V. Darüber steigt der Strom steil an, die Spannung an der Diode bleibt fast gleich. In <b>Sperrrichtung</b> fliesst praktisch kein Strom – die ganze Spannung liegt an der Diode.</p>' +
      '<p>Die <b>Z-Diode</b> wird in Sperrrichtung betrieben. Ab der <b>Z-Spannung U<sub>Z</sub></b> bricht sie gezielt durch und hält die Spannung fast konstant – egal, wie viel Strom fliesst. Sie braucht immer einen <b>Vorwiderstand R<sub>V</sub></b>, der den Strom begrenzt.</p>' +
      '<p><b>Stabilisierung:</b> R<sub>V</sub> muss so klein sein, dass bei kleinster Eingangsspannung und grösster Last noch ein Z-Strom fliesst: R<sub>V</sub> ≤ (U<sub>e,min</sub> − U<sub>Z</sub>) / (I<sub>L,max</sub> + I<sub>Z,min</sub>). Und so gross, dass bei höchster Spannung die Z-Diode nicht überlastet wird.</p>' +
      '<p>Nachteile der einfachen Z-Stabilisierung: höhere Speisespannung nötig, nur Standardwerte für U<sub>Z</sub>, geringe Belastbarkeit, nicht ganz ideal (U<sub>Z</sub> steigt leicht mit dem Strom).</p>',
    questions: [
      { q: 'Wie gross ist die Schleusenspannung einer Siliziumdiode?', options: ['0,3 V', '0,7 V', '1,8 V', '5,1 V'], correct: 1, explain: 'Silizium ca. 0,7 V.' },
      { q: 'Woran erkennt man die Kathode einer Diode?', options: ['Am längeren Bein', 'Am Ring auf dem Gehäuse', 'An der Farbe', 'Gar nicht'], correct: 1, explain: 'Der Ring markiert die Kathode.' },
      { q: 'In welcher Richtung wird eine Z-Diode zur Stabilisierung betrieben?', options: ['Durchlassrichtung', 'Sperrrichtung', 'Egal', 'Wechselnd'], correct: 1, explain: 'Im Durchbruch in Sperrrichtung hält sie U_Z.' },
      { q: 'Warum braucht eine Z-Diode einen Vorwiderstand?', options: ['Damit sie leuchtet', 'Damit der Strom begrenzt wird', 'Damit sie sperrt', 'Braucht sie nicht'], correct: 1, explain: 'Ohne R_V würde der Strom im Durchbruch unbegrenzt steigen.' },
      { q: '12 V, R_V = 470 Ω, U_Z = 5,1 V, keine Last. Wie gross ist I_Z (ungefähr)?', options: ['5 mA', '15 mA', '25 mA', '50 mA'], correct: 1, explain: 'I = (12 V − 5,1 V) / 470 Ω ≈ 14,7 mA.' }
    ]
  });

  var dio = function (rev) { return { parts: [B(5), R('R1', 1000, 320, 200), { id: 'V1', type: 'diode', x: 480, y: 300, rot: rev ? 270 : 90 }],
    wires: rev ? [W('B1.p', 'R1.a'), W('R1.b', 'V1.k'), W('V1.a', 'B1.n')] : [W('B1.p', 'R1.a'), W('R1.b', 'V1.a'), W('V1.k', 'B1.n')] }; };
  var bDio = { parts: [bB1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'V1', x: 760, y: 460, rot: 90 }] };
  defTask({
    id: '13.1', ch: 13, title: 'Durchlassrichtung', tags: ['bauteil.diode', 'messen.spannung'],
    story: 'Die Werkstatt hat einen Sack voller unbeschrifteter Dioden. Eine Messung zeigt, wie sie sich verhalten.',
    brief: 'Die Diode V1 ist in <b>Durchlassrichtung</b> eingebaut. Miss die Spannung an der Diode, die Spannung an R1 und den Strom.',
    learn: 'In Durchlassrichtung fällt an einer Si-Diode ca. 0,7 V ab.', take: 'Der Rest der Spannung liegt am Widerstand – er bestimmt den Strom: (5 V − 0,7 V) / 1 kΩ ≈ 4,3 mA.',
    hint: 'V⎓ an V1.a und V1.k.', hint2: 'Strom: Leitung aufteilen und A⎓ einsetzen – oder U_R1 / 1 kΩ.',
    palette: [], start: dio(false), ref: dio(false), bench: bDio,
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'ud', ask: 'Spannung an der Diode', unit: 'V', mode: 'V', a: 'V1.a', b: 'V1.k', tol: 0.03 },
      { id: 'ur', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'i', ask: 'Strom', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 }
    ]
  });
  defTask({
    id: '13.2', ch: 13, title: 'Sperrrichtung', tags: ['bauteil.diode', 'messen.spannung'],
    story: 'Jetzt umgekehrt eingebaut – was passiert?',
    brief: 'V1 ist in <b>Sperrrichtung</b> eingebaut. Miss die Spannung an der Diode und an R1.',
    learn: 'In Sperrrichtung liegt die ganze Spannung an der Diode.', take: 'Kein Strom → kein Spannungsabfall an R1 → 5 V an der Diode.',
    hint: 'Rot an V1.k, schwarz an V1.a (so misst du positiv).', hint2: 'Erwartet 5 V und 0 V.',
    palette: [], start: dio(true), ref: dio(true), bench: bDio,
    tests: [{ name: 'Anlage', expect: [{ sel: 'V1', i: [0, 1e-6] }] }],
    measure: [
      { id: 'ud', ask: 'Spannung an der Diode (Kathode gegen Anode)', unit: 'V', mode: 'V', a: 'V1.k', b: 'V1.a', tol: 0.03 },
      { id: 'ur', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03, abs: 0.02 }
    ]
  });
  defTask({
    id: '13.3', ch: 13, title: 'Die Kennlinie', tags: ['bauteil.diode', 'messen.spannung'],
    story: 'Wie stark hängt die Diodenspannung vom Strom ab? Der Werkstattchef behauptet: „Fast gar nicht.“',
    brief: 'Miss die Diodenspannung bei <b>2 V</b> und bei <b>10 V</b> Speisespannung (Wert der Quelle B1 im Panel ändern – hier ist sie freigegeben).',
    learn: 'Oberhalb der Schleusenspannung steigt der Strom steil, die Spannung kaum.', take: 'Fünfmal mehr Strom, aber nur wenige hundertstel Volt mehr an der Diode.',
    hint: 'Batterie anklicken, Spannung ändern, Enter.', hint2: 'Strom bei 2 V ≈ 1,3 mA, bei 10 V ≈ 9,3 mA.',
    palette: ['battery'], need: { battery: 1 },
    start: { parts: [R('R1', 1000, 320, 200), { id: 'V1', type: 'diode', x: 480, y: 300, rot: 90 }], wires: [W('R1.b', 'V1.a')] },
    ref: dio(false), bench: bDio,
    tests: [{ name: 'Anlage', expect: [{ sel: 'V1', on: true }] }],
    measure: [
      { id: 'u2', ask: 'Diodenspannung bei 2 V', unit: 'V', mode: 'V', a: 'V1.a', b: 'V1.k', tol: 0.03, set: { B1: { value: 2 } } },
      { id: 'u10', ask: 'Diodenspannung bei 10 V', unit: 'V', mode: 'V', a: 'V1.a', b: 'V1.k', tol: 0.03, set: { B1: { value: 10 } } }
    ]
  });

  var zlim = function (rev) { return { parts: [B(12), R('R1', 470, 320, 200), { id: 'Z1', type: 'zener', x: 480, y: 300, rot: rev ? 90 : 270 }],
    wires: rev ? [W('B1.p', 'R1.a'), W('R1.b', 'Z1.a'), W('Z1.k', 'B1.n')] : [W('B1.p', 'R1.a'), W('R1.b', 'Z1.k'), W('Z1.a', 'B1.n')] }; };
  defTask({
    id: '13.4', ch: 13, title: 'Die Z-Diode begrenzt', tags: ['bauteil.zdiode', 'elektro.stabilisierung'],
    story: 'Ein Sensoreingang verträgt höchstens 5,5 V. Die Versorgung hat 12 V.',
    brief: 'Setze die <b>Z-Diode (5,1 V)</b> hinter den Vorwiderstand R1 – richtig gepolt: <b>Kathode Richtung Plus</b>. Miss die Spannung an der Z-Diode und den Strom.',
    learn: 'Z-Diode in Sperrrichtung: hält U_Z.', take: 'Am Vorwiderstand liegt der Rest: 12 V − 5,1 V ≈ 6,9 V.',
    hint: 'R1.b → Z1.k, Z1.a → B1.–.', hint2: 'Falsch herum eingebaut leitet sie wie eine normale Diode: nur 0,7 V.',
    palette: ['zener'], need: { zener: 1 }, start: { parts: [B(12), R('R1', 470, 320, 200)], wires: [W('B1.p', 'R1.a')] }, ref: zlim(false),
    bench: { parts: [bB1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'Z1', x: 760, y: 460, rot: 270 }] },
    wrong: [named('Z-Diode falsch gepolt', zlim(true))],
    tests: [{ name: 'Begrenzung', expect: [{ sel: 'Z1', v: [5.1, 5.35] }, { noFault: true }] }],
    measure: [{ id: 'uz', ask: 'Spannung an der Z-Diode', unit: 'V', mode: 'V', a: 'Z1.k', b: 'Z1.a', tol: 0.03 }, { id: 'iz', ask: 'Strom durch die Z-Diode', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.04 }]
  });

  var stab = function (rv) {
    var z = { id: 'Z1', type: 'zener', props: { vz: 5.6 }, x: 480, y: 300, rot: 270 };
    return { parts: [B(10), R('R1', rv, 320, 200), z, R('R2', 500, 620, 300, 90)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'Z1.k'), W('Z1.a', 'B1.n'), W('R2.a', 'Z1.k'), W('R2.b', 'Z1.a')] };
  };
  var stabStart = (function () { var l = stab(180); l.parts = l.parts.filter(function (p) { return p.id !== 'R1'; }); l.wires = l.wires.filter(function (w) { return w.from !== 'B1.p' && w.to !== 'Z1.k' || w.from === 'R2.a'; }); return l; })();
  defTask({
    id: '13.5', ch: 13, title: 'Stabilisierung dimensionieren', tags: ['bauteil.zdiode', 'elektro.stabilisierung', 'elektro.dimensionieren'],
    story: 'Aus dem Praktikum: Die Speisung schwankt zwischen 8 V und 12 V (10 V ± 20 %), die Last ist 500 Ω, die Ausgangsspannung soll mit einer 5,6-V-Z-Diode stabil bleiben.',
    brief: 'Wähle den <b>Vorwiderstand</b> so, dass die Last (R2 = 500 Ω) bei <b>8 V und bei 12 V</b> Speisung zwischen 5,5 V und 5,95 V bekommt – und nichts überlastet wird.',
    learn: 'R_V ≤ (U_e,min − U_Z) / (I_L + I_Z,min); bei U_e,max darf nichts überlastet werden.', take: 'Bei 8 V braucht die Last 11,2 mA plus etwas Z-Strom: R_V ≤ 2,4 V / 12 mA ≈ 200 Ω → 180 Ω.',
    hint: 'Last-Strom: 5,6 V / 500 Ω = 11,2 mA. Bei 8 V bleiben 2,4 V für R_V.', hint2: 'R_V = 180 Ω: bei 12 V fliessen 36 mA, 24 mA davon durch die Z-Diode (0,13 W) – passt.',
    palette: ['resistor'], need: { resistor: 2 }, start: stabStart, ref: stab(180),
    bench: { parts: [bB1, { id: 'R1', x: 480, y: 290, rot: 0 }, { id: 'Z1', x: 680, y: 460, rot: 270 }, { id: 'R2', x: 840, y: 460, rot: 90 }] },
    wrong: [named('R_V zu gross (470 Ω)', stab(470)), named('R_V zu klein (47 Ω, Überlast)', stab(47))],
    tests: [
      { name: '8 V', set: { B1: { value: 8 } }, expect: [{ sel: 'R2', v: [5.5, 5.95] }, { noFault: true }] },
      { name: '12 V', set: { B1: { value: 12 } }, expect: [{ sel: 'R2', v: [5.5, 5.95] }, { noFault: true }] }]
  });

  defTheory({
    id: 'T13B', ch: 13, title: 'Der Transistor', tags: ['bauteil.transistor', 'elektro.schalten'],
    merksatz: 'Ein kleiner Basisstrom steuert einen grossen Kollektorstrom (I_C = β · I_B); als Schalter wird der Transistor übersteuert, bis er in Sättigung geht (U_CE ≈ 0,2 V) – Emitter und Logik-Masse verbinden.',
    visual: { type: 'circuit', caption: 'Der Basiswiderstand bestimmt den Basisstrom: Gross → wenig Basisstrom, der Transistor sperrt oder arbeitet aktiv (I_C = β · I_B, LED schwach). Klein → Sättigung, die LED leuchtet voll – der Transistor als Schalter.',
      layout: { parts: [{ id: 'B1', type: 'battery', value: 9, x: 700, y: 320 }, { id: 'R1', type: 'resistor', value: 220000, x: 320, y: 380 }, { id: 'Q1', type: 'npn', x: 480, y: 380 }, { id: 'R2', type: 'resistor', value: 390, x: 580, y: 160, rot: 90 }, { id: 'D1', type: 'led', props: { color: 'gruen' }, x: 580, y: 260, rot: 90 }],
        wires: [W('B1.p', 'R1.a'), W('R1.b', 'Q1.b'), W('B1.p', 'R2.a'), W('R2.b', 'D1.a'), W('D1.k', 'Q1.c'), W('Q1.e', 'B1.n')] },
      bench: { parts: [{ id: 'B1', x: 830, y: 540 }, { id: 'R1', x: 360, y: 420 }, { id: 'Q1', x: 580, y: 460 }, { id: 'R2', x: 620, y: 170, rot: 90 }, { id: 'D1', x: 760, y: 300, rot: 90 }] },
      sliders: [{ part: 'R1', prop: 'value', label: 'Basiswiderstand R1', min: 4700, max: 2200000, log: true, unit: 'Ω', round: 2 }],
      readouts: [{ label: 'I_B', sel: 'R1', q: 'i' }, { label: 'I_C', sel: 'D1', q: 'i' }, { label: 'Arbeitsbereich', sel: 'Q1', q: 'state' }] },
    lesson:
      '<p>Der <b>NPN-Transistor</b> hat drei Anschlüsse: <b>Basis</b>, <b>Kollektor</b>, <b>Emitter</b>. Ein kleiner <b>Basisstrom I<sub>B</sub></b> steuert einen grossen <b>Kollektorstrom I<sub>C</sub></b>. Die Basis-Emitter-Strecke verhält sich wie eine Diode (U<sub>BE</sub> ≈ 0,7 V).</p>' +
      '<p>Drei Arbeitsbereiche: <b>gesperrt</b> (I<sub>B</sub> = 0 → I<sub>C</sub> = 0), <b>aktiv</b> (I<sub>C</sub> = β · I<sub>B</sub>, Verstärker), <b>Sättigung</b> (der Transistor ist voll durchgeschaltet, U<sub>CE</sub> ≈ 0,2 V, I<sub>C</sub> bestimmt nur noch die Last).</p>' +
      '<p><b>Transistor als Schalter:</b> Basis über einen <b>Basiswiderstand R<sub>B</sub></b> ansteuern und <b>übersteuern</b> – I<sub>B</sub> deutlich grösser als I<sub>C</sub> / β, damit er sicher in Sättigung geht:</p>' +
      '<div class="formula">R<sub>B</sub> ≤ (U<sub>st</sub> − 0,7 V) / (ü · I<sub>C</sub> / β)</div>' +
      '<p>Emitter und Logik-Masse müssen verbunden sein – sonst hat die Steuerspannung keinen Bezug. So schaltet ein Logikausgang (wenige mA) eine Lampe, einen Motor oder ein Relais.</p>',
    questions: [
      { q: 'Wie heissen die Anschlüsse eines Bipolartransistors?', options: ['Anode, Kathode, Gate', 'Basis, Kollektor, Emitter', 'Source, Drain, Gate', 'Plus, Minus, Mitte'], correct: 1, explain: 'B, C, E.' },
      { q: 'β = 100, I_B = 0,1 mA, aktiver Bereich. I_C = ?', options: ['0,1 mA', '1 mA', '10 mA', '100 mA'], correct: 2, explain: 'I_C = β · I_B = 100 · 0,1 mA = 10 mA.' },
      { q: 'Wie gross ist U_CE in der Sättigung?', options: ['ca. 0,2 V', 'ca. 0,7 V', 'halbe Speisung', 'volle Speisung'], correct: 0, explain: 'Voll durchgeschaltet bleibt nur die Sättigungsspannung.' },
      { q: 'Warum steuert man einen Schalttransistor mit mehr Basisstrom als nötig an?', options: ['Damit er schneller altert', 'Damit er sicher in Sättigung geht', 'Damit er sperrt', 'Damit β steigt'], correct: 1, explain: 'Übersteuern sichert den voll durchgeschalteten Zustand trotz Exemplarstreuung.' },
      { q: 'Die Lampe am Kollektor braucht 150 mA, β = 100. Mindestbasisstrom?', options: ['0,15 mA', '1,5 mA', '15 mA', '150 mA'], correct: 1, explain: 'I_B = I_C / β = 1,5 mA – zur Sicherheit etwa doppelt so viel.' }
    ]
  });

  /* Transistorschalter: E1 (Logik) → R1 → Q1.b; Last zwischen B1.+ und Q1.c; Emitter an B1.– = GND */
  function sw(o) {
    var parts = [{ id: 'E1', type: 'logicin', x: 160, y: 380, rot: 0 }, { id: 'GND1', type: 'ground', x: 480, y: 540, rot: 0 }, B(9, 700, 300)].concat(o.load), wires = o.loadWires.concat([W('B1.n', 'GND1.g')]);
    if (o.q) { parts.push({ id: 'Q1', type: 'npn', x: 480, y: 380, rot: 0 }); wires.push(W('Q1.e', 'GND1.g')); wires = wires.concat(o.qWires); }
    if (o.rb) { parts.push(R('R1', o.rb, 320, 380)); wires.push(W(o.not ? 'U1.out' : 'E1.out', 'R1.a'), W('R1.b', 'Q1.b')); }
    if (o.not) { parts.push({ id: 'U1', type: 'not', x: 240, y: 460, rot: 0 }); wires.push(W('E1.out', 'U1.in')); }
    return { parts: parts, wires: wires };
  }
  var lampLoad = { load: [{ id: 'H1', type: 'lamp', x: 580, y: 240, rot: 90 }], loadWires: [W('B1.p', 'H1.a')], qWires: [W('H1.b', 'Q1.c')] };
  var ledLoad = { load: [R('R2', 390, 580, 180, 90), { id: 'D1', type: 'led', props: { color: 'gruen' }, x: 580, y: 280, rot: 90 }], loadWires: [W('B1.p', 'R2.a'), W('R2.b', 'D1.a')], qWires: [W('D1.k', 'Q1.c')] };
  var mk = function (base, extra) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; }); Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return sw(o); };
  var bSw = { parts: [{ id: 'E1', x: 190, y: 420, rot: 0 }, { id: 'GND1', x: 560, y: 690, rot: 0 }, { id: 'B1', x: 830, y: 560, rot: 0 }, { id: 'Q1', x: 560, y: 450, rot: 0 }, { id: 'R1', x: 380, y: 420, rot: 0 },
    { id: 'H1', x: 600, y: 230, rot: 90 }, { id: 'R2', x: 600, y: 170, rot: 90 }, { id: 'D1', x: 740, y: 310, rot: 90 }, { id: 'U1', x: 280, y: 580, rot: 0 }] };
  var benchFor = function (l) { var have = {}; l.parts.forEach(function (p) { have[p.id] = 1; }); return { parts: bSw.parts.filter(function (p) { return have[p.id]; }) }; };
  var onOff = function (sel, onAt1) { return [
    { name: 'E1 = 1', set: { E1: { closed: true } }, expect: [{ sel: sel, on: onAt1 }, { noFault: true }] },
    { name: 'E1 = 0', set: { E1: { closed: false } }, expect: [{ sel: sel, on: !onAt1 }] }]; };

  var ledRef = mk(ledLoad, { q: true, rb: 10000 });
  defTask({
    id: '13.6', ch: 13, title: 'Logik schaltet LED', tags: ['bauteil.transistor', 'elektro.schalten'],
    story: 'Ein Logikausgang soll eine Signal-LED an 9 V schalten. Direkt geht das nicht – die Pegel passen nicht.',
    brief: 'Setze einen <b>NPN-Transistor</b> ein: E1 über einen <b>Basiswiderstand (10 kΩ)</b> an die Basis, die LED-Kathode an den Kollektor, Emitter an Masse.',
    learn: 'Der Transistor verbindet zwei Welten: 5-V-Logik steuert eine 9-V-Last.', take: 'Wenige hundert µA Basisstrom schalten 17 mA LED-Strom.',
    hint: 'E1.out → R1 → Q1.b; D1.k → Q1.c; Q1.e liegt schon an Masse.', hint2: 'I_B = (5 V − 0,7 V) / 10 kΩ ≈ 0,43 mA – genug für 43 mA.',
    palette: ['npn', 'resistor'], need: { npn: 1, resistor: 2 }, start: mk(ledLoad, {}), ref: ledRef, bench: benchFor(ledRef),
    tests: [{ name: 'Schalten', steps: onOff('D1', true) }]
  });
  var lampRef = mk(lampLoad, { q: true, rb: 1000 });
  defTask({
    id: '13.7', ch: 13, title: 'Die Lampe schalten', tags: ['bauteil.transistor', 'elektro.schalten', 'elektro.dimensionieren'],
    story: 'Jetzt eine richtige Last: eine 9-V-Lampe mit 150 mA. Der Kollege nimmt wieder 100 kΩ als Basiswiderstand – die Lampe glimmt nur.',
    brief: 'Dimensioniere den <b>Basiswiderstand</b> so, dass der Transistor bei E1 = 1 sicher in <b>Sättigung</b> geht und die Lampe voll leuchtet.',
    learn: 'R_B ≤ (U_st − 0,7 V) / (ü · I_C / β).', take: 'Mit 100 kΩ fliessen nur 43 µA → I_C = 4,3 mA. Mit 1 kΩ sind es 4,3 mA Basisstrom – mehr als genug.',
    hint: 'I_C = 150 mA, β = 100 → I_B mindestens 1,5 mA, mit Übersteuerung ca. 3 mA.', hint2: 'R_B = 4,3 V / 3 mA ≈ 1,4 kΩ → 1 kΩ.',
    palette: ['npn', 'resistor'], need: { npn: 1, resistor: 1 }, start: mk(lampLoad, {}), ref: lampRef, bench: benchFor(lampRef),
    wrong: [named('100 kΩ (aktiv, glimmt)', mk(lampLoad, { q: true, rb: 100000 }))],
    tests: [{ name: 'Schalten', steps: [
      { name: 'E1 = 1', set: { E1: { closed: true } }, expect: [{ sel: 'Q1', state: 'sat' }, { sel: 'H1', i: [0.13, 0.16] }, { noFault: true }] },
      { name: 'E1 = 0', set: { E1: { closed: false } }, expect: [{ sel: 'H1', i: [0, 1e-5] }] }] }]
  });
  var meas = (function () { var l = mk(lampLoad, { q: true, rb: 1000 }); l.parts.forEach(function (p) { if (p.id === 'E1') p.props = { closed: true }; }); return l; })();
  defTask({
    id: '13.8', ch: 13, title: 'Messen am Schalttransistor', tags: ['bauteil.transistor', 'messen.spannung'],
    story: 'Die Prüfanweisung verlangt Messwerte am durchgeschalteten Transistor.',
    brief: 'E1 = 1, die Lampe leuchtet. Miss <b>U<sub>BE</sub></b>, <b>U<sub>CE</sub></b> und den <b>Kollektorstrom</b>.',
    learn: 'Durchgeschaltet: U_BE ≈ 0,7 V, U_CE ≈ 0,2 V.', take: 'Fast die ganze Speisespannung liegt an der Lampe – der Transistor verheizt kaum Leistung.',
    hint: 'U_BE: rot an Q1.b, schwarz an Q1.e. U_CE: rot an Q1.c.', hint2: 'Kollektorstrom: Leitung zwischen Lampe und Kollektor lösen und A⎓ einsetzen.',
    palette: [], start: meas, ref: meas, bench: benchFor(meas),
    tests: [{ name: 'Anlage', expect: [{ sel: 'Q1', state: 'sat' }] }],
    measure: [
      { id: 'ube', ask: 'U_BE', unit: 'V', mode: 'V', a: 'Q1.b', b: 'Q1.e', tol: 0.03 },
      { id: 'uce', ask: 'U_CE', unit: 'V', mode: 'V', a: 'Q1.c', b: 'Q1.e', tol: 0.05 },
      { id: 'ic', ask: 'Kollektorstrom', unit: 'mA', truth: { sel: 'Q1', q: 'i', pin: 'c' }, tol: 0.03 }
    ]
  });

  var amp = { parts: [B(9), R('R1', 470000, 320, 200), R('R2', 1000, 520, 200, 90), { id: 'Q1', type: 'npn', x: 480, y: 340, rot: 0 }],
    wires: [W('B1.p', 'R1.a'), W('R1.b', 'Q1.b'), W('B1.p', 'R2.a'), W('R2.b', 'Q1.c'), W('Q1.e', 'B1.n')] };
  defTask({
    id: '13.9', ch: 13, title: 'Die Stromverstärkung', tags: ['bauteil.transistor', 'elektro.verstaerker', 'messen.strom'],
    story: 'Wie gross ist die Stromverstärkung β dieses Transistors? Das Datenblatt ist verloren.',
    brief: 'Der Transistor arbeitet im <b>aktiven Bereich</b> (R<sub>B</sub> = 470 kΩ). Miss Basisstrom und Kollektorstrom und berechne <b>β = I<sub>C</sub> / I<sub>B</sub></b>.',
    learn: 'Im aktiven Bereich gilt I_C = β · I_B.', take: 'Ein paar µA an der Basis – ein paar mA am Kollektor: Das ist Verstärkung.',
    hint: 'I_B misst man in der Basisleitung (µA-Bereich!), I_C in der Kollektorleitung.', hint2: 'I_B ≈ 17,7 µA, I_C ≈ 1,77 mA → β = 100.',
    palette: [], start: amp, ref: amp, bench: { parts: [bB1, { id: 'R1', x: 480, y: 290, rot: 0 }, { id: 'R2', x: 760, y: 260, rot: 90 }, { id: 'Q1', x: 700, y: 480, rot: 0 }] },
    tests: [{ name: 'aktiv', expect: [{ sel: 'Q1', state: 'on' }] }],
    measure: [
      { id: 'ib', ask: 'Basisstrom', unit: 'µA', truth: { sel: 'Q1', q: 'ib', pin: 'b' }, tol: 0.04 },
      { id: 'ic', ask: 'Kollektorstrom', unit: 'mA', truth: { sel: 'Q1', q: 'i', pin: 'c' }, tol: 0.04 },
      { id: 'beta', ask: 'Stromverstärkung β (berechnet)', unit: '', value: 100, tol: 0.05 }
    ]
  });
  var dusk = mk(lampLoad, { q: true, rb: 1000, not: true });
  defTask({
    id: '13.10', ch: 13, title: 'Der Dämmerungsschalter', tags: ['bauteil.transistor', 'digital.nicht', 'elektro.schalten'],
    story: 'Der Lichtsensor (E1) meldet 1 bei Tageslicht. Die Hofbeleuchtung soll nur im Dunkeln brennen.',
    brief: 'Baue den <b>Dämmerungsschalter</b>: Die Lampe H1 soll leuchten, wenn E1 = 0 ist. Du brauchst einen Inverter, einen Basiswiderstand und einen Transistor.',
    learn: 'Logik entscheidet, der Transistor schaltet die Leistung.', take: 'NICHT + Transistor: Sensor 0 → Lampe an.',
    hint: 'E1 → NICHT → R_B → Basis.', hint2: 'E1.out → U1.in, U1.out → R1 (1 kΩ) → Q1.b, H1.b → Q1.c.',
    palette: ['npn', 'resistor', 'not'], need: { npn: 1, not: 1, resistor: 1 }, start: mk(lampLoad, {}), ref: dusk, bench: benchFor(dusk),
    wrong: [named('ohne Inverter (Licht am Tag)', lampRef)],
    tests: [{ name: 'Tag und Nacht', steps: [
      { name: 'dunkel (E1 = 0)', set: { E1: { closed: false } }, expect: [{ sel: 'H1', i: [0.13, 0.16] }, { noFault: true }] },
      { name: 'hell (E1 = 1)', set: { E1: { closed: true } }, expect: [{ sel: 'H1', i: [0, 1e-5] }] }] }]
  });
})();

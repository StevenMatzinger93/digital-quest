/* Kapitel 12 – Flipflops und Zaehler
 * Quelle: Digitaltechnik zeitabhaengige Vorgaenge (NOR-Flip-Flop mit Analyse-/Ansteuertabelle, NOR-AND-Flip-Flop,
 * Steuerungsarten, T-, D-, R-S-, J-K-Flip-Flop, asynchrone Zaehler, synchrone Zaehler, Johnson-Zaehler). */
(function () {
  'use strict';
  defChapter({
    id: 12, title: 'Flipflops und Zaehler',
    intro: 'Schaltungen mit Gedaechtnis: Ein Flipflop merkt sich ein Bit, mehrere Flipflops zaehlen. Den Takt gibst du selbst mit einem Pegelschalter – Schritt fuer Schritt, wie im Praktikum.',
    sequence: ['T12A', '12.1', '12.2', '12.3', '12.4', '12.5', 'T12B', '12.6', '12.7', '12.8', '12.9', '12.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  var G = { id: 'GND1', type: 'ground', x: 120, y: 560, rot: 0 };
  var E = function (i, x, y, on) { var e = { id: 'E' + i, type: 'logicin', x: x || 160, y: y, rot: 0 }; if (on) e.props = { closed: true }; return e; };
  var L = function (i, x, y) { return { id: 'L' + i, type: 'logicled', x: x || 860, y: y, rot: 0 }; };
  var P = function (id, type, x, y) { return { id: id, type: type, x: x, y: y, rot: 0 }; };
  /* Takt per Pegelschalter: n Pulse (0 → 1 → 0), optional mit Erwartung nach dem letzten Puls */
  function pulses(key, n, expect) { var s = []; for (var k = 0; k < n; k++) s.push({ set: (function () { var o = {}; o[key] = { closed: true }; return o; })() }, { set: (function () { var o = {}; o[key] = { closed: false }; return o; })() }); if (expect) s[s.length - 1].expect = expect; return s; }
  var on = function (id, v) { return { sel: id, on: !!v }; };

  defTheory({
    id: 'T12A', ch: 12, title: 'Das Flipflop – ein Bit Gedaechtnis', tags: ['digital.flipflop', 'digital.speicher'],
    lesson:
      '<p>Zwei <b>NOR-Gatter</b>, deren Ausgaenge jeweils auf einen Eingang des anderen zurueckgefuehrt sind, bilden das <b>RS-Flipflop</b>. S = 1 <b>setzt</b> (Q = 1), R = 1 <b>setzt zurueck</b> (Q = 0), S = R = 0 <b>speichert</b> den letzten Zustand. S = R = 1 ist der <b>verbotene Zustand</b> (Q und Q̄ beide 0).</p>' +
      '<p>Die <b>Analysetabelle</b> zeigt den neuen Zustand A abhaengig vom alten Zustand A<sub>V</sub>; die <b>Ansteuertabelle</b> sagt, welche Eingaenge noetig sind, um von A<sub>V</sub> nach A zu kommen (X = egal).</p>' +
      '<p><b>Steuerungsarten:</b> <i>Zustandsgesteuert</i> – der Takteingang C gibt die Eingaenge frei, solange C = 1 ist (getaktetes RS mit UND-Gattern davor). <i>Flankengesteuert</i> – nur im Moment der steigenden Taktflanke (0 → 1) wird uebernommen.</p>' +
      '<p><b>D-Flipflop:</b> uebernimmt D bei der Taktflanke. <b>T-Flipflop:</b> kippt bei jeder Flanke, wenn T = 1 (Frequenzteiler durch 2). <b>JK-Flipflop:</b> J = 1 setzt, K = 1 setzt zurueck, J = K = 1 kippt, J = K = 0 speichert.</p>',
    questions: [
      { q: 'RS-Flipflop: Was passiert bei S = 0 und R = 0?', options: ['Q = 0', 'Q = 1', 'Q behaelt seinen Zustand', 'verbotener Zustand'], correct: 2, explain: 'Keine Ansteuerung – das Flipflop speichert.' },
      { q: 'Welche Kombination ist beim NOR-RS-Flipflop verboten?', options: ['S = 0, R = 0', 'S = 1, R = 0', 'S = 0, R = 1', 'S = 1, R = 1'], correct: 3, explain: 'Beide Ausgaenge werden 0 – Q und Q̄ sind nicht mehr invers.' },
      { q: 'Wann uebernimmt ein flankengesteuertes D-Flipflop den Eingang D?', options: ['Solange C = 1', 'Bei der steigenden Flanke an C', 'Wenn D sich aendert', 'Immer'], correct: 1, explain: 'Nur im Moment 0 → 1 am Takteingang.' },
      { q: 'Was macht ein T-Flipflop mit T = 1 bei jeder Taktflanke?', options: ['Nichts', 'Es kippt', 'Es setzt', 'Es setzt zurueck'], correct: 1, explain: 'Toggle – dadurch halbiert es die Taktfrequenz.' },
      { q: 'JK-Flipflop, J = 1, K = 1, Taktflanke. Was passiert?', options: ['Q = 1', 'Q = 0', 'Q kippt', 'verboten'], correct: 2, explain: 'Beim JK-Flipflop ist 1/1 nicht verboten, sondern kippt.' }
    ]
  });

  /* 12.1 RS aus NOR: E1 = S, E2 = R, L1 = Q, L2 = /Q */
  var rsStart = { parts: [E(1, 160, 200), E(2, 160, 400), G, L(1, 700, 220), L(2, 700, 380)], wires: [] };
  var rs = { parts: rsStart.parts.concat([P('U1', 'nor', 420, 220), P('U2', 'nor', 420, 380)]),
    wires: [W('E2.out', 'U1.in1'), W('U2.out', 'U1.in2'), W('E1.out', 'U2.in2'), W('U1.out', 'U2.in1'), W('U1.out', 'L1.in'), W('U2.out', 'L2.in')] };
  var rsBench = { parts: [{ id: 'E1', x: 190, y: 250, rot: 0 }, { id: 'E2', x: 190, y: 520, rot: 0 }, { id: 'GND1', x: 190, y: 690, rot: 0 }, { id: 'U1', x: 500, y: 260, rot: 0 }, { id: 'U2', x: 500, y: 500, rot: 0 }, { id: 'L1', x: 840, y: 260, rot: 0 }, { id: 'L2', x: 840, y: 500, rot: 0 }] };
  defTask({
    id: '12.1', ch: 12, title: 'Das NOR-Flipflop', tags: ['digital.flipflop', 'digital.nor', 'digital.speicher'],
    story: 'Ein Stoermelder soll sich merken, dass eine Stoerung da war – auch wenn sie wieder verschwindet. Erst die Quittierung loescht die Meldung.',
    brief: 'Baue aus <b>zwei NOR-Gattern</b> ein RS-Flipflop: E1 = S (Setzen), E2 = R (Ruecksetzen), L1 = Q, L2 = Q̄. Die Rueckkopplung: U1 = NOR(R, Q̄), U2 = NOR(S, Q).',
    learn: 'Rueckkopplung erzeugt Gedaechtnis.', take: 'S kurz auf 1: Q = 1 – und es bleibt 1, bis R kommt. Mit der Zeitlupe siehst du, wie die Gatter nacheinander umschalten.',
    hint: 'Jeder NOR-Ausgang geht auf einen Eingang des anderen NOR.', hint2: 'E2 → U1.in1, U2.out → U1.in2, U1.out → U2.in1, E1 → U2.in2; U1 → L1, U2 → L2.',
    palette: ['nor', 'nand', 'and', 'or', 'not'], need: { nor: 2 }, start: rsStart, ref: rs, bench: rsBench,
    tests: [{ name: 'Speichern', steps: [
      { name: 'Setzen', set: { E1: { closed: true } }, expect: [on('L1', 1), on('L2', 0)] },
      { name: 'Speichern (S wieder 0)', set: { E1: { closed: false } }, expect: [on('L1', 1), on('L2', 0)] },
      { name: 'Ruecksetzen', set: { E2: { closed: true } }, expect: [on('L1', 0), on('L2', 1)] },
      { name: 'Speichern (R wieder 0)', set: { E2: { closed: false } }, expect: [on('L1', 0), on('L2', 1), { noFault: true }] }] }]
  });

  var dStart = { parts: [E(1, 160, 200), E(2, 160, 360), G, L(1, 700, 220)], wires: [] };
  var dRef = { parts: dStart.parts.concat([P('FF1', 'dff', 420, 240)]), wires: [W('E1.out', 'FF1.D'), W('E2.out', 'FF1.C'), W('FF1.Q', 'L1.in')] };
  var bFF = function (ids) { var p = [{ id: 'E1', x: 190, y: 250, rot: 0 }, { id: 'E2', x: 190, y: 420, rot: 0 }, { id: 'E3', x: 190, y: 590, rot: 0 }, { id: 'GND1', x: 190, y: 700, rot: 0 }, { id: 'L1', x: 850, y: 260, rot: 0 }, { id: 'L2', x: 850, y: 420, rot: 0 }, { id: 'L3', x: 850, y: 580, rot: 0 }];
    (ids || ['FF1']).forEach(function (id, i) { p.push({ id: id, x: 480, y: 260 + 170 * i, rot: 0 }); });
    return function (layout) { var have = {}; layout.parts.forEach(function (q) { have[q.id] = 1; }); return { parts: p.filter(function (q) { return have[q.id]; }) }; }; };
  defTask({
    id: '12.2', ch: 12, title: 'Das D-Flipflop', tags: ['digital.flipflop', 'digital.flanke'],
    story: 'Ein Messwert (E1) soll genau im Moment des Taktes (E2) festgehalten werden – egal, was danach passiert.',
    brief: 'Setze ein <b>D-Flipflop</b> ein: E1 → D, E2 → C (Takt), Q → L1. Probiere: D aendern ohne Takt – nichts passiert. Takt 0 → 1 – Q uebernimmt D.',
    learn: 'Flankensteuerung: uebernommen wird nur bei 0 → 1.', take: 'Das D-Flipflop ist die Grundzelle jedes Registers und Speichers.',
    hint: 'E1.out → FF1.D, E2.out → FF1.C, FF1.Q → L1.', hint2: 'Pegelschalter E2 ist der Takt: 0 → 1 schalten.',
    palette: ['dff', 'jkff', 'tff'], need: { dff: 1 }, start: dStart, ref: dRef, bench: bFF(['FF1'])(dRef),
    tests: [{ name: 'Flanke', steps: [
      { name: 'D = 1 ohne Takt', set: { E1: { closed: true } }, expect: [on('L1', 0)] },
      { name: 'Taktflanke', set: { E2: { closed: true } }, expect: [on('L1', 1)] },
      { name: 'D = 0, Takt bleibt 1', set: { E1: { closed: false } }, expect: [on('L1', 1)] },
      { name: 'Takt 0', set: { E2: { closed: false } }, expect: [on('L1', 1)] },
      { name: 'neue Flanke', set: { E2: { closed: true } }, expect: [on('L1', 0), { noFault: true }] }] }]
  });

  var tStart = { parts: [E(1, 160, 200), E(2, 160, 360, true), G, L(1, 700, 220)], wires: [] };
  var tRef = { parts: tStart.parts.concat([P('FF1', 'tff', 420, 240)]), wires: [W('E2.out', 'FF1.T'), W('E1.out', 'FF1.C'), W('FF1.Q', 'L1.in')] };
  defTask({
    id: '12.3', ch: 12, title: 'Der Frequenzteiler', tags: ['digital.flipflop', 'digital.takt'],
    story: 'Ein Taktsignal ist doppelt so schnell wie gebraucht. Ein T-Flipflop halbiert es.',
    brief: 'Baue einen <b>Frequenzteiler durch 2</b> mit einem T-Flipflop: E1 = Takt → C, E2 (fest 1) → T, Q → L1. Gib mehrere Takte und beobachte L1.',
    learn: 'T = 1: Das Flipflop kippt bei jeder steigenden Flanke.', take: 'Zwei Takte am Eingang – ein Takt am Ausgang: f_aus = f_ein / 2.',
    hint: 'E1.out → FF1.C, E2.out → FF1.T, FF1.Q → L1.', hint2: 'Nach dem 1. Takt leuchtet L1, nach dem 2. nicht mehr, nach dem 3. wieder.',
    palette: ['tff', 'dff', 'jkff'], need: { tff: 1 }, start: tStart, ref: tRef, bench: bFF(['FF1'])(tRef),
    tests: [1, 2, 3].map(function (n) { return { name: n + ' Takt(e)', steps: pulses('E1', n, [on('L1', n % 2)]) }; })
  });

  var jkStart = { parts: [E(1, 160, 180), E(2, 160, 300), E(3, 160, 420), G, L(1, 700, 240)], wires: [] };
  var jkRef = { parts: jkStart.parts.concat([P('FF1', 'jkff', 420, 260)]), wires: [W('E1.out', 'FF1.J'), W('E2.out', 'FF1.K'), W('E3.out', 'FF1.C'), W('FF1.Q', 'L1.in')] };
  var jk = function (j, k) { return { E1: { closed: !!j }, E2: { closed: !!k } }; };
  defTask({
    id: '12.4', ch: 12, title: 'Das JK-Flipflop', tags: ['digital.flipflop', 'digital.flanke'],
    story: 'Das Universal-Flipflop: setzen, ruecksetzen, kippen, speichern – alles mit einem Baustein.',
    brief: 'Setze ein <b>JK-Flipflop</b> ein: E1 → J, E2 → K, E3 → C (Takt), Q → L1. Pruefe alle vier Betriebsarten.',
    learn: 'JK: 10 setzt, 01 setzt zurueck, 11 kippt, 00 speichert.', take: 'Beim JK gibt es keinen verbotenen Zustand – 11 kippt.',
    hint: 'Erst J/K einstellen, dann einen Takt geben.', hint2: 'E1 → FF1.J, E2 → FF1.K, E3 → FF1.C, FF1.Q → L1.',
    palette: ['jkff', 'dff', 'tff'], need: { jkff: 1 }, start: jkStart, ref: jkRef, bench: bFF(['FF1'])(jkRef),
    tests: [{ name: 'Betriebsarten', steps: [
      { name: 'J=1 K=0 setzt', set: jk(1, 0) }].concat(pulses('E3', 1, [on('L1', 1)]),
      [{ name: 'J=0 K=1', set: jk(0, 1) }], pulses('E3', 1, [on('L1', 0)]),
      [{ name: 'J=1 K=1 kippt', set: jk(1, 1) }], pulses('E3', 1, [on('L1', 1)]), pulses('E3', 1, [on('L1', 0)]),
      [{ name: 'J=0 K=0 speichert', set: jk(0, 0) }], pulses('E3', 2, [on('L1', 0)])) }]
  });

  /* 12.5 getaktetes RS (zustandsgesteuert): U3 = S·C, U4 = R·C vor dem NOR-Latch */
  var gStart = { parts: [E(1, 160, 180), E(2, 160, 440), E(3, 160, 310), G, L(1, 820, 220)], wires: [] };
  var gRef = { parts: gStart.parts.concat([P('U1', 'nor', 600, 220), P('U2', 'nor', 600, 400), P('U3', 'and', 380, 400), P('U4', 'and', 380, 220)]),
    wires: [W('E1.out', 'U3.in1'), W('E3.out', 'U3.in2'), W('E2.out', 'U4.in1'), W('E3.out', 'U4.in2'), W('U4.out', 'U1.in1'), W('U2.out', 'U1.in2'), W('U3.out', 'U2.in2'), W('U1.out', 'U2.in1'), W('U1.out', 'L1.in')] };
  defTask({
    id: '12.5', ch: 12, title: 'Das getaktete RS-Flipflop', tags: ['digital.flipflop', 'digital.steuerungsart'],
    story: 'S und R duerfen nur wirken, solange die Freigabe C aktiv ist – sonst stoeren kurze Spitzen den Speicher.',
    brief: 'Baue ein <b>zustandsgesteuertes RS-Flipflop</b>: Vor das NOR-Flipflop je ein UND, das S (E1) bzw. R (E2) mit der Freigabe C (E3) verknuepft. L1 = Q.',
    learn: 'Zustandsgesteuert: Die Eingaenge wirken, solange C = 1.', take: 'Mit C = 0 ist das Flipflop gegen S und R gesperrt.',
    hint: 'U3 = S·C setzt, U4 = R·C setzt zurueck; dahinter das NOR-Flipflop aus 12.1.', hint2: 'U4.out → U1.in1, U2.out → U1.in2, U3.out → U2.in2, U1.out → U2.in1, U1.out → L1.',
    palette: ['nor', 'and', 'or', 'not', 'nand'], need: { nor: 2, and: 2 }, start: gStart, ref: gRef,
    bench: { parts: [{ id: 'E1', x: 190, y: 220, rot: 0 }, { id: 'E3', x: 190, y: 400, rot: 0 }, { id: 'E2', x: 190, y: 580, rot: 0 }, { id: 'GND1', x: 190, y: 700, rot: 0 }, { id: 'U3', x: 420, y: 500, rot: 0 }, { id: 'U4', x: 420, y: 250, rot: 0 }, { id: 'U1', x: 640, y: 250, rot: 0 }, { id: 'U2', x: 640, y: 500, rot: 0 }, { id: 'L1', x: 850, y: 250, rot: 0 }] },
    tests: [{ name: 'Freigabe', steps: [
      { name: 'Ruecksetzen mit C', set: { E2: { closed: true }, E3: { closed: true } }, expect: [on('L1', 0)] },
      { name: 'C = 0, R = 0', set: { E2: { closed: false }, E3: { closed: false } } },
      { name: 'S = 1 ohne Freigabe', set: { E1: { closed: true } }, expect: [on('L1', 0)] },
      { name: 'Freigabe C = 1', set: { E3: { closed: true } }, expect: [on('L1', 1)] },
      { name: 'alles 0: speichert', set: { E1: { closed: false }, E3: { closed: false } }, expect: [on('L1', 1), { noFault: true }] }] }]
  });

  defTheory({
    id: 'T12B', ch: 12, title: 'Zaehler', tags: ['digital.zaehler', 'digital.flipflop'],
    lesson:
      '<p>Mehrere T-Flipflops (T = 1) hintereinander bilden einen <b>Dualzaehler</b>: Jede Stufe teilt die Frequenz durch 2 und stellt ein Bit dar (FF1 = Bit 0 = Wert 1, FF2 = Bit 1 = Wert 2 …).</p>' +
      '<p><b>Asynchroner Zaehler</b> (Ripple Counter): Nur FF1 bekommt den Takt, jede weitere Stufe wird vom <b>Q̄-Ausgang</b> der vorherigen getaktet (steigende Flanke an Q̄ = fallende an Q → Aufwaertszaehler). Einfach, aber die Stufen schalten nacheinander – kurze falsche Zwischenwerte.</p>' +
      '<p><b>Synchroner Zaehler:</b> Alle Flipflops haengen am <b>selben Takt</b>. Die Logik an J/K bestimmt, wer kippt: FF1 immer (J = K = 1), FF2 wenn Q1 = 1, FF3 wenn Q1·Q2 = 1 … Alle Stufen schalten gleichzeitig.</p>' +
      '<p>Ein n-Bit-Zaehler zaehlt von 0 bis 2ⁿ − 1 und beginnt dann von vorn. Ein <b>BCD-Zaehler</b> springt nach 9 auf 0 zurueck.</p>' +
      '<p><b>Johnson-Zaehler:</b> Schieberegister, dessen invertierter letzter Ausgang auf den Eingang zurueckgefuehrt ist. 2 Stufen: 00 → 10 → 11 → 01 → 00 – pro Takt aendert sich genau ein Bit.</p>',
    questions: [
      { q: 'Bis zu welcher Zahl zaehlt ein 3-Bit-Dualzaehler?', options: ['3', '6', '7', '8'], correct: 2, explain: '2³ − 1 = 7, dann wieder 0.' },
      { q: 'Woher bekommt beim asynchronen Aufwaertszaehler das zweite Flipflop seinen Takt?', options: ['Vom gemeinsamen Takt', 'Vom Q̄-Ausgang der ersten Stufe', 'Von J', 'Gar nicht'], correct: 1, explain: 'Die Stufen takten sich nacheinander – daher „asynchron“.' },
      { q: 'Was ist der Vorteil des synchronen Zaehlers?', options: ['Weniger Flipflops', 'Alle Stufen schalten gleichzeitig', 'Er braucht keinen Takt', 'Er zaehlt rueckwaerts'], correct: 1, explain: 'Kein Durchlaufen der Stufen – keine falschen Zwischenwerte.' },
      { q: 'Wann kippt beim synchronen 2-Bit-Zaehler das zweite JK-Flipflop?', options: ['Bei jedem Takt', 'Wenn Q1 = 1', 'Wenn Q1 = 0', 'Nie'], correct: 1, explain: 'J2 = K2 = Q1.' },
      { q: 'Wie viele Zustaende durchlaeuft ein 2-stufiger Johnson-Zaehler?', options: ['2', '3', '4', '8'], correct: 2, explain: '00, 10, 11, 01 – vier Zustaende (2·n).' }
    ]
  });

  function counter(n, withLeds, sync) {
    var parts = [E(1, 160, 200), E(2, 160, 360, true), G], wires = [];
    for (var i = 1; i <= n; i++) {
      parts.push(P('FF' + i, sync ? 'jkff' : 'tff', 320 + 170 * (i - 1), 260));
      if (withLeds !== false) parts.push(L(i, 860, 120 + 110 * i));
    }
    return { parts: parts, wires: wires };
  }
  function asyncWires(n, l) {
    for (var i = 1; i <= n; i++) { l.wires.push(W('E2.out', 'FF' + i + '.T'), W(i === 1 ? 'E1.out' : 'FF' + (i - 1) + '.Qn', 'FF' + i + '.C')); if (l.parts.some(function (p) { return p.id === 'L' + i; })) l.wires.push(W('FF' + i + '.Q', 'L' + i + '.in')); }
    return l;
  }
  var cntExpect = function (n, v) { var e = []; for (var i = 1; i <= n; i++) e.push(on('L' + i, v >> (i - 1) & 1)); return e; };
  var cntBench = function (n) { var p = [{ id: 'E1', x: 190, y: 250, rot: 0 }, { id: 'E2', x: 190, y: 450, rot: 0 }, { id: 'GND1', x: 190, y: 690, rot: 0 }];
    for (var i = 1; i <= n; i++) { p.push({ id: 'FF' + i, x: 400 + 140 * (i - 1) * (n > 2 ? 1 : 1.3), y: 260 + (i % 2) * 180, rot: 0 }, { id: 'L' + i, x: 860, y: 160 + 140 * (i - 1), rot: 0 }); } return { parts: p }; };

  var c2s = counter(2); var c2 = asyncWires(2, counter(2));
  defTask({
    id: '12.6', ch: 12, title: 'Der asynchrone Zaehler', tags: ['digital.zaehler', 'digital.flipflop'],
    story: 'Der Pakete-Zaehler: Jede Lichtschrankenunterbrechung (E1) ist ein Takt. Zwei Bits genuegen fuer den Anfang.',
    brief: 'Baue einen <b>2-Bit-Dualzaehler</b> aus zwei T-Flipflops: T beider Stufen an E2 (fest 1), FF1 getaktet von E1, FF2 getaktet von <b>Q̄ von FF1</b>. L1 = Q1 (Wert 1), L2 = Q2 (Wert 2).',
    learn: 'Asynchron: Jede Stufe taktet die naechste.', take: 'Nach 1, 2, 3 Takten zeigen die LEDs 01, 10, 11 – nach dem 4. wieder 00.',
    hint: 'E1 → FF1.C, FF1.Qn → FF2.C, E2 → FF1.T und FF2.T, Q-Ausgaenge an die LEDs.', hint2: 'Q̄ statt Q, damit aufwaerts gezaehlt wird.',
    palette: ['tff', 'jkff', 'dff'], need: { tff: 2 }, start: c2s, ref: c2, bench: cntBench(2),
    wrong: [named('FF2 vom Q statt Q̄ getaktet (zaehlt rueckwaerts)', (function () { var l = asyncWires(2, counter(2)); l.wires = l.wires.map(function (w) { return w.from === 'FF1.Qn' ? W('FF1.Q', w.to) : w; }); return l; })())],
    tests: [1, 2, 3, 4].map(function (k) { return { name: k + ' Takte', steps: pulses('E1', k, cntExpect(2, k % 4)) }; })
  });

  var c3s = counter(3); var c3 = asyncWires(3, counter(3));
  defTask({
    id: '12.7', ch: 12, title: 'Bis sieben zaehlen', tags: ['digital.zaehler', 'digital.flipflop'],
    story: 'Die Kisten fassen 7 Flaschen. Der Zaehler soll bis 7 zaehlen und dann wieder bei 0 beginnen.',
    brief: 'Erweitere auf einen <b>3-Bit-Zaehler</b> (drei T-Flipflops, L1 … L3). Pruefe nach 5 und nach 8 Takten.',
    learn: 'n Stufen → 2ⁿ Zustaende.', take: '3 Bit: 0 … 7. Nach 8 Takten steht der Zaehler wieder auf 0.',
    hint: 'Die dritte Stufe wird von FF2.Qn getaktet.', hint2: 'E1 → FF1.C, FF1.Qn → FF2.C, FF2.Qn → FF3.C; alle T an E2.',
    palette: ['tff', 'jkff', 'dff'], need: { tff: 3 }, start: c3s, ref: c3, bench: cntBench(3),
    tests: [5, 8].map(function (k) { return { name: k + ' Takte', steps: pulses('E1', k, cntExpect(3, k % 8)) }; })
  });

  var disp = function (wired) {
    var l = counter(3, false); asyncWires(3, l);
    l.parts.push({ id: 'IC1', type: 'dec7', x: 700, y: 330, rot: 0 }, { id: 'AZ1', type: 'seg7', x: 880, y: 330, rot: 0 });
    l.wires.push(W('IC1.D', 'GND1.g'));
    'abcdefg'.split('').forEach(function (k) { l.wires.push(W('IC1.' + k, 'AZ1.' + k)); });
    if (wired) l.wires.push(W('FF1.Q', 'IC1.A'), W('FF2.Q', 'IC1.B'), W('FF3.Q', 'IC1.C'));
    return l;
  };
  var dispBench = { parts: [{ id: 'E1', x: 190, y: 250, rot: 0 }, { id: 'E2', x: 190, y: 450, rot: 0 }, { id: 'GND1', x: 190, y: 690, rot: 0 },
    { id: 'FF1', x: 400, y: 200, rot: 0 }, { id: 'FF2', x: 400, y: 380, rot: 0 }, { id: 'FF3', x: 400, y: 560, rot: 0 }, { id: 'IC1', x: 640, y: 420, rot: 0 }, { id: 'AZ1', x: 840, y: 420, rot: 0 }] };
  defTask({
    id: '12.8', ch: 12, title: 'Zaehler mit Anzeige', tags: ['digital.zaehler', 'digital.7segment'],
    story: 'Der Zaehler laeuft, aber niemand kann Bitmuster lesen. Er soll auf die Ziffernanzeige.',
    brief: 'Verbinde die Zaehlerausgaenge mit dem Decoder: <b>Q1 → A (1), Q2 → B (2), Q3 → C (4)</b>. D liegt schon an Masse. Gib Takte und beobachte die Ziffer.',
    learn: 'Zaehler + Decoder + Anzeige = digitaler Zaehler.', take: 'Die Q-Ausgaenge sind die Dualzahl – der Decoder macht die Ziffer daraus.',
    hint: 'FF1.Q → IC1.A, FF2.Q → IC1.B, FF3.Q → IC1.C.', hint2: 'Nach 6 Takten zeigt die Anzeige 6.',
    palette: [], start: disp(false), ref: disp(true), bench: dispBench,
    tests: [3, 6, 7].map(function (k) { return { name: k + ' Takte', steps: pulses('E1', k, [{ sel: 'AZ1', digit: k }]) }; })
  });

  var syncRef = (function () { var l = counter(2, true, true);
    l.wires.push(W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('E2.out', 'FF1.J'), W('E2.out', 'FF1.K'), W('FF1.Q', 'FF2.J'), W('FF1.Q', 'FF2.K'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in')); return l; })();
  defTask({
    id: '12.9', ch: 12, title: 'Der synchrone Zaehler', tags: ['digital.zaehler', 'digital.synchron'],
    story: 'Der asynchrone Zaehler erzeugt kurze falsche Zwischenwerte – fuer die Steuerung eines Roboters zu riskant.',
    brief: 'Baue einen <b>synchronen 2-Bit-Zaehler</b> mit zwei JK-Flipflops: Beide C am selben Takt E1. FF1: J = K = 1 (E2). FF2: J = K = Q1. L1 = Q1, L2 = Q2.',
    learn: 'Synchron: gemeinsamer Takt, die J/K-Logik entscheidet, wer kippt.', take: 'FF2 kippt nur, wenn Q1 = 1 – genau beim Uebertrag.',
    hint: 'E1 an beide C, E2 an J und K von FF1, FF1.Q an J und K von FF2.', hint2: 'Dieselbe Zaehlfolge wie asynchron: 00, 01, 10, 11, 00.',
    palette: ['jkff', 'tff', 'dff', 'and'], need: { jkff: 2 }, start: counter(2, true, true), ref: syncRef, bench: cntBench(2),
    tests: [1, 2, 3, 4].map(function (k) { return { name: k + ' Takte', steps: pulses('E1', k, cntExpect(2, k % 4)) }; })
  });

  var johnStart = { parts: [E(1, 160, 200), G, L(1, 860, 220), L(2, 860, 380)], wires: [] };
  var john = { parts: johnStart.parts.concat([P('FF1', 'dff', 400, 240), P('FF2', 'dff', 620, 240)]),
    wires: [W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('FF2.Qn', 'FF1.D'), W('FF1.Q', 'FF2.D'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in')] };
  var jSeq = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  defTask({
    id: '12.10', ch: 12, title: 'Der Johnson-Zaehler', tags: ['digital.zaehler', 'digital.schieberegister'],
    story: 'Ein Schrittmotor braucht eine Taktfolge, bei der sich pro Schritt nur ein Signal aendert.',
    brief: 'Baue einen <b>2-stufigen Johnson-Zaehler</b> aus zwei D-Flipflops am gemeinsamen Takt E1: D1 = Q̄2, D2 = Q1. L1 = Q1, L2 = Q2. Folge: 00 → 10 → 11 → 01 → 00.',
    learn: 'Schieberegister mit invertierter Rueckfuehrung.', take: 'Pro Takt aendert sich genau ein Ausgang – ideal fuer Schrittmotoren und stoerarme Steuerungen.',
    hint: 'Der invertierte Ausgang von FF2 geht zurueck auf D von FF1.', hint2: 'FF2.Qn → FF1.D, FF1.Q → FF2.D, E1 → beide C.',
    palette: ['dff', 'not', 'jkff', 'tff'], need: { dff: 2 }, start: johnStart, ref: john, bench: bFF(['FF1', 'FF2'])(john),
    tests: [1, 2, 3, 4].map(function (k) { return { name: k + ' Takte', steps: pulses('E1', k, [on('L1', jSeq[k][0]), on('L2', jSeq[k][1])]) }; })
  });
})();

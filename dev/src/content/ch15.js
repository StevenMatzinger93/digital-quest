/* Kapitel 15 – Anwendungsprojekt Antriebsstation (Profi-Boss)
 * Quelle: Brems-/Antriebssystem TP1410 (Bauteile und Blockbild, Motordaten, Drehrichtung/Drehzahl, Hochlauf-/Bremsrampen,
 * Belastung, Sicherheit/Not-Halt). Umgesetzt mit den vorhandenen Bauteilen: Motor (Nenndaten 6 V / 0,3 A, im Simulator als
 * Wicklungswiderstand 20 Ω, Drehzahl proportional zum Strom), NPN-Treiber, Freilaufdiode, Logik fuer Start/Stopp/Not-Halt,
 * Zaehler fuer die Drehzahlmessung. */
(function () {
  'use strict';
  defChapter({
    id: 15, title: 'Anwendungsprojekt Antriebsstation',
    intro: 'Alles kommt zusammen: Logik entscheidet, der Transistor schaltet die Leistung, der Motor dreht – und du misst wie an einer echten Anlage. Am Ende steht die Profi-Prüfung: eine komplette Antriebsstation mit Start, Stopp und Not-Halt.',
    sequence: ['T15A', '15.1', '15.2', '15.3', '15.4', '15.5', 'T15B', '15.6', '15.7', '15.8', '15.9', '15.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var P = function (id, type, x, y, rot, props) { var p = { id: id, type: type, x: x, y: y, rot: rot || 0 }; if (props) p.props = props; return p; };
  var Rz = function (id, v, x, y, rot, props) { var p = P(id, 'resistor', x, y, rot, props); p.value = v; return p; };
  var on = function (id, v) { return { sel: id, on: !!v }; };
  var mot = function (a, b) { return { sel: 'M1', i: [a, b] }; };
  /* Werkbank-Lagen fuer alle Aufbauten dieses Kapitels (nur vorhandene IDs werden uebernommen) */
  var BENCH = {
    E1: [170, 300], E2: [170, 440], E3: [170, 580], GND1: [620, 690], U1: [330, 250], U2: [330, 410], U3: [480, 330],
    R1: [340, 300, 0], R2: [480, 420, 0], C1: [400, 540, 90], Q1: [640, 460, 0], M1: [640, 210, 90], V1: [800, 210, 270],
    B1: [820, 580, 0], L1: [810, 400, 0], S1: [480, 290, 0], CLK1: [190, 200, 0], U4: [360, 200, 0],
    FF1: [400, 340, 0], FF2: [400, 500, 0], FF3: [400, 660, 0], IC1: [640, 440, 0], AZ1: [840, 440, 0]
  };
  var benchOf = function (l, over) { return { parts: l.parts.map(function (p) { var b = (over && over[p.id]) || BENCH[p.id]; return { id: p.id, x: b[0], y: b[1], rot: b[2] || 0 }; }) }; };

  defTheory({
    id: 'T15A', ch: 15, title: 'Die Antriebsstation', tags: ['antrieb.motor', 'antrieb.treiber', 'elektro.leistung'],
    merksatz: 'Eine Antriebsstation liest sich als Blockbild Bedienung → Steuerung → Leistungsteil → Motor mit Messpunkten dazwischen; Motordaten stehen auf dem Typenschild, P = U · I, die Drehzahl folgt der Spannung.',
    visual: [{ type: 'block', caption: 'Blockbild der Antriebsstation: Signale laufen von der Bedienung über die Steuerung zum Leistungsteil und zum Motor; der Impulsgeber meldet die Drehzahl zurück. An jedem Übergang liegt ein Messpunkt (MP).',
      svg: '<svg class="blockbild" viewBox="0 0 700 230" role="img" aria-label="Blockbild Antriebsstation">' +
        '<defs><marker id="bbA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="bb-arrow"/></marker></defs>' +
        [['Bedienung', 'Start · Stopp · Not-Halt', 20], ['Steuerung', 'Logik (Selbsthaltung)', 190], ['Leistungsteil', 'Transistor · Freilaufdiode', 360], ['Motor', '6 V · 0,3 A', 530]].map(function (b) {
          return '<g><rect class="bb-box" x="' + b[2] + '" y="40" width="150" height="70" rx="10"/><text class="bb-t" x="' + (b[2] + 75) + '" y="70">' + b[0] + '</text><text class="bb-s" x="' + (b[2] + 75) + '" y="92">' + b[1] + '</text></g>'; }).join('') +
        [170, 340, 510].map(function (x, i) { return '<path class="bb-line" d="M' + x + ' 75H' + (x + 20) + '" marker-end="url(#bbA)"/><circle class="bb-mp" cx="' + (x + 10) + '" cy="125" r="11"/><text class="bb-mpt" x="' + (x + 10) + '" y="129">MP' + (i + 1) + '</text><path class="bb-dash" d="M' + (x + 10) + ' 114V80"/>'; }).join('') +
        '<path class="bb-line" d="M605 110V180H265V114" marker-end="url(#bbA)"/><rect class="bb-box small" x="355" y="162" width="160" height="36" rx="8"/><text class="bb-s" x="435" y="185">Impulsgeber (Drehzahl)</text></svg>' },
      { type: 'circuit', caption: 'Der Leistungsteil als echte Schaltung: E1 (Signal der Steuerung) schaltet über R1 den Transistor, der den Motor an 6 V legt; V1 ist die Freilaufdiode. E1 anklicken.',
        layout: { parts: [{ id: 'E1', type: 'logicin', x: 160, y: 380 }, { id: 'GND1', type: 'ground', x: 480, y: 540 }, { id: 'B1', type: 'battery', value: 6, x: 760, y: 320 }, { id: 'M1', type: 'motor', x: 580, y: 240, rot: 90 }, { id: 'Q1', type: 'npn', x: 480, y: 380 }, { id: 'R1', type: 'resistor', value: 470, x: 300, y: 380 }, { id: 'V1', type: 'diode', x: 660, y: 240, rot: 270 }],
          wires: [W('B1.n', 'GND1.g'), W('B1.p', 'M1.a'), W('M1.b', 'Q1.c'), W('Q1.e', 'GND1.g'), W('E1.out', 'R1.a'), W('R1.b', 'Q1.b'), W('V1.k', 'M1.a'), W('V1.a', 'M1.b')] },
        bench: { parts: [{ id: 'E1', x: 170, y: 300 }, { id: 'R1', x: 340, y: 300 }, { id: 'Q1', x: 640, y: 460 }, { id: 'M1', x: 640, y: 210, rot: 90 }, { id: 'V1', x: 800, y: 210, rot: 270 }, { id: 'B1', x: 820, y: 580 }, { id: 'GND1', x: 620, y: 690 }] },
        readouts: [{ label: 'Motorstrom', sel: 'M1', q: 'i' }, { label: 'Drehzahl', sel: 'M1', q: 'speed' }, { label: 'Transistor', sel: 'Q1', q: 'state' }] }],
    lesson:
      '<p>Eine <b>Antriebsstation</b> (z. B. ein Förderband- oder Bremsenprüfstand) lässt sich immer als <b>Blockbild</b> lesen: <b>Bedienung und Sensoren</b> (Taster, Not-Halt, Impulsgeber) → <b>Steuerung</b> (Logik) → <b>Leistungsteil</b> (Transistor als Treiber) → <b>Motor</b>. Dazu kommen die <b>Messpunkte</b>, an denen du prüfst, ob jeder Block seine Aufgabe erfüllt.</p>' +
      '<p><b>Motordaten</b> stehen auf dem Typenschild: Nennspannung, Nennstrom, Nennleistung, Nenndrehzahl. Die aufgenommene Leistung ist <b>P = U · I</b>. Beim Gleichstrommotor steigt die <b>Drehzahl mit der Spannung</b>; die <b>Drehrichtung</b> kehrt man durch <b>Umpolen</b> um. (Im Simulator wird der Motor vereinfacht als Wicklungswiderstand 20 Ω nachgebildet, Nenndaten 6 V / 0,3 A – die Drehzahl folgt dem Strom.)</p>' +
      '<p>Ein Logikausgang liefert nur wenige mA. Der <b>Transistor als Treiber</b> schaltet den Motorstrom; der Basiswiderstand wird so gewählt, dass er sicher in <b>Sättigung</b> geht. Die Verlustleistung am Transistor ist <b>P<sub>V</sub> = U<sub>CE</sub> · I<sub>C</sub></b> – klein, solange er ganz durchgeschaltet ist.</p>' +
      '<p>Die Motorwicklung ist eine Spule: Beim Abschalten erzeugt sie eine hohe <b>Abschaltspannung</b>, die den Transistor zerstören kann. Die <b>Freilaufdiode</b> liegt deshalb <b>parallel zum Motor, Kathode an Plus</b> – im Betrieb sperrt sie, beim Abschalten führt sie den Strom im Kreis. Falsch herum eingebaut schliesst sie die Versorgung über den Transistor kurz.</p>' +
      '<p><b>Hochlauframpe (Sanftanlauf):</b> Ein RC-Glied an der Basis lässt den Basisstrom langsam steigen – der Motor läuft sanft hoch statt mit vollem Anlaufstrom zu starten. Das schont Mechanik und Versorgung.</p>',
    questions: [
      { q: 'Ein Motor nimmt bei 6 V einen Strom von 0,3 A auf. Wie gross ist die Leistung?', options: ['0,05 W', '1,8 W', '6,3 W', '20 W'], correct: 1, explain: 'P = U · I = 6 V · 0,3 A = 1,8 W.' },
      { q: 'Wie kehrt man die Drehrichtung eines Gleichstrommotors um?', options: ['Höhere Spannung', 'Umpolen der Anschlüsse', 'Freilaufdiode entfernen', 'Gar nicht'], correct: 1, explain: 'Umpolen kehrt die Stromrichtung und damit die Drehrichtung um.' },
      { q: 'Wozu dient die Freilaufdiode am Motor?', options: ['Sie erhöht die Drehzahl', 'Sie schützt den Transistor vor der Abschaltspannung', 'Sie zeigt an, dass der Motor läuft', 'Sie ersetzt den Basiswiderstand'], correct: 1, explain: 'Beim Abschalten führt sie den Wicklungsstrom im Kreis – keine Spannungsspitze am Transistor.' },
      { q: 'Wie wird die Freilaufdiode eingebaut?', options: ['In Reihe zum Motor', 'Parallel zum Motor, Kathode an Plus', 'Parallel zum Motor, Anode an Plus', 'Zwischen Basis und Emitter'], correct: 1, explain: 'Im Betrieb in Sperrrichtung – sie wirkt nur beim Abschalten.' },
      { q: 'Wie gross ist die Verlustleistung am Transistor bei U_CE = 0,5 V und I_C = 0,28 A?', options: ['0,14 W', '0,5 W', '1,4 W', '2,8 W'], correct: 0, explain: 'P_V = U_CE · I_C = 0,5 V · 0,28 A = 0,14 W.' }
    ]
  });

  /* 15.1 Motor direkt an 6 V mit Schalter */
  var direct = function (closed, wired) {
    var l = { parts: [P('B1', 'battery', 160, 300), P('S1', 'switch', 340, 200, 0, { closed: closed }), P('M1', 'motor', 520, 300, 90)], wires: [] };
    l.parts[0].value = 6;
    if (wired) l.wires.push(W('B1.p', 'S1.a'), W('S1.b', 'M1.a'), W('M1.b', 'B1.n'));
    return l;
  };
  var bDirect = { B1: [240, 460], S1: [480, 290], M1: [760, 440, 90] };
  defTask({
    id: '15.1', ch: 15, title: 'Der Motor am Prüfplatz', tags: ['antrieb.motor', 'messen.spannung', 'messen.strom', 'elektro.leistung'],
    story: 'Der Antriebsmotor der Station kommt frisch aus dem Lager. Bevor er eingebaut wird, prüfst du ihn am Prüfplatz: Läuft er, und stimmen die Daten mit dem Typenschild (6 V, 0,3 A) überein?',
    brief: 'Schliesse den Motor M1 über den Schalter S1 an die Quelle (6 V) an und schalte ein. Miss die <b>Motorspannung</b> und den <b>Motorstrom</b> und berechne die <b>Leistung</b>.',
    learn: 'P = U · I – Leistung aus zwei Messungen.', take: 'Rund 6 V und 0,3 A → knapp 1,8 W. Der Motor läuft mit Nenndrehzahl.',
    hint: 'B1.+ → S1 → M1 → B1.–, dann S1 schliessen.', hint2: 'Strom: eine Leitung am Motor lösen und A⎓ in die Lücke. P = U · I.',
    palette: [], start: direct(false, false), ref: direct(true, true), bench: benchOf(direct(false, false), bDirect),
    tests: [{ name: 'Motor läuft', expect: [mot(0.28, 0.31), { noFault: true }] }],
    measure: [
      { id: 'u', ask: 'Spannung am Motor', unit: 'V', mode: 'V', a: 'M1.a', b: 'M1.b', tol: 0.03 },
      { id: 'i', ask: 'Motorstrom', unit: 'mA', truth: { sel: 'M1', q: 'i' }, tol: 0.03 },
      { id: 'p', ask: 'Leistung (berechnet)', unit: 'W', value: 1.791, tol: 0.04 }
    ]
  });

  /* 15.2 Drehzahl ueber die Spannung: halbe Drehzahl */
  var half = function (v) {
    var l = { parts: [P('S1', 'switch', 340, 200, 0, { closed: true }), P('M1', 'motor', 520, 300, 90)], wires: [W('S1.b', 'M1.a')] };
    if (v) { l.parts.unshift(P('B1', 'battery', 160, 300)); l.parts[0].value = v; l.wires.push(W('B1.p', 'S1.a'), W('M1.b', 'B1.n')); }
    return l;
  };
  defTask({
    id: '15.2', ch: 15, title: 'Halbe Kraft voraus', tags: ['antrieb.motor', 'antrieb.drehzahl'],
    story: 'Zum Einrichten der Station soll der Motor nur mit halber Drehzahl laufen. Die Werkmeisterin: „Beim Gleichstrommotor regelst du die Drehzahl über die Spannung.“',
    brief: 'Hole eine <b>Spannungsquelle</b> und stelle sie so ein, dass der Motor mit <b>halber Nenndrehzahl</b> läuft (halber Nennstrom, ca. 0,15 A). Notiere die eingestellte Spannung und den gemessenen Strom.',
    learn: 'Drehzahl ~ Spannung.', take: 'Halbe Spannung (3 V) → halber Strom → halbe Drehzahl. Die Leistung sinkt dabei auf ein Viertel.',
    hint: 'Quelle anklicken und die Spannung im Panel einstellen.', hint2: '3 V: 3 V / 20 Ω = 0,15 A.',
    palette: ['battery'], need: { battery: 1 }, start: half(0), ref: half(3), bench: benchOf(half(3), bDirect),
    wrong: [named('volle Spannung 6 V', half(6)), named('zu wenig: 1,5 V', half(1.5))],
    tests: [{ name: 'halbe Drehzahl', expect: [mot(0.14, 0.16), { noFault: true }] }],
    measure: [
      { id: 'u', ask: 'Eingestellte Spannung', unit: 'V', mode: 'V', a: 'M1.a', b: 'M1.b', tol: 0.03 },
      { id: 'i', ask: 'Motorstrom', unit: 'mA', truth: { sel: 'M1', q: 'i' }, tol: 0.03 }
    ]
  });

  /* Treiber: E1 → R1 → Q1.b; B1.+ → M1 → Q1.c; Q1.e, B1.– an Masse; V1 Freilaufdiode ueber M1 */
  function drv(o) {
    o = o || {};
    var l = { parts: [P('E1', 'logicin', 160, 380, 0, o.e1 ? { closed: true } : null), P('GND1', 'ground', 480, 540), P('B1', 'battery', 760, 320), P('M1', 'motor', 580, 240, 90), P('Q1', 'npn', 480, 380)],
      wires: [W('B1.n', 'GND1.g'), W('B1.p', 'M1.a'), W('M1.b', 'Q1.c'), W('Q1.e', 'GND1.g')] };
    l.parts[2].value = 6;
    l.parts.push(Rz('R1', 470, 300, 380, 0, o.defect ? { defect: true } : null)); l.wires.push(W('E1.out', 'R1.a'));
    if (o.ramp) { l.parts.push(Rz('R2', 470, 400, 380), P('C1', 'capacitor', 360, 460, 90)); l.parts[l.parts.length - 1].value = 2200e-6; l.wires.push(W('R1.b', 'R2.a'), W('R2.b', 'Q1.b'), W('R1.b', 'C1.a'), W('C1.b', 'GND1.g')); }
    else if (o.base !== false) l.wires.push(W('R1.b', 'Q1.b'));
    if (o.diode) { l.parts.push(P('V1', 'diode', 660, 240, o.diode === 'rev' ? 90 : 270)); l.wires.push(o.diode === 'rev' ? W('V1.a', 'M1.a') : W('V1.k', 'M1.a'), o.diode === 'rev' ? W('V1.k', 'M1.b') : W('V1.a', 'M1.b')); }
    return l;
  }
  var switching = [
    { name: 'E1 = 1', set: { E1: { closed: true } }, expect: [mot(0.26, 0.3), { sel: 'Q1', state: 'sat' }, { noFault: true }] },
    { name: 'E1 = 0', set: { E1: { closed: false } }, expect: [mot(0, 1e-4)] }];
  var drvRef = drv({ diode: true });
  defTask({
    id: '15.3', ch: 15, title: 'Treiber mit Freilaufdiode', tags: ['antrieb.treiber', 'bauteil.transistor', 'bauteil.diode'],
    story: 'Die Steuerung soll den Motor über einen Transistor schalten. Der Treiber ist aufgebaut – aber der Elektroniker im Team warnt: „Ohne Freilaufdiode ist der Transistor nach ein paar Schaltspielen tot.“',
    brief: 'Setze die <b>Freilaufdiode V1</b> parallel zum Motor ein: <b>Kathode an Plus (M1.a), Anode an den Kollektor-Anschluss (M1.b)</b>. Schalte dann mit E1 ein und aus.',
    learn: 'Freilaufdiode: parallel zur Wicklung, im Betrieb gesperrt.', take: 'Richtig gepolt ändert die Diode im Betrieb nichts – sie schützt nur beim Abschalten. Falsch gepolt schliesst sie die Quelle über den Transistor kurz.',
    hint: 'V1.k → M1.a, V1.a → M1.b.', hint2: 'Der Ring der Diode (Kathode) zeigt zum Pluspol.',
    palette: ['diode'], need: { diode: 1 }, start: drv(), ref: drvRef, bench: benchOf(drvRef),
    wrong: [named('Diode falsch gepolt (Kurzschluss über den Transistor)', drv({ diode: 'rev' }))],
    tests: [{ name: 'Schalten', steps: switching }]
  });

  var ramp = drv({ diode: true, ramp: true });
  var rampStart = drv({ diode: true, base: false });
  defTask({
    id: '15.4', ch: 15, title: 'Sanftanlauf', tags: ['antrieb.rampe', 'elektro.rcglied', 'bauteil.transistor'],
    story: 'Beim harten Einschalten ruckt das Förderband, und die Pakete fallen um. Gewünscht ist eine <b>Hochlauframpe</b>: Der Motor soll in etwa einer Sekunde sanft auf volle Drehzahl kommen.',
    brief: 'Baue zwischen R1 und der Basis ein <b>RC-Glied</b>: R1.b → <b>R2 (470 Ω)</b> → Q1.b, und am Punkt R1.b einen <b>Kondensator C1 (2200 µF)</b> gegen Masse. Beim Einschalten lädt C1 langsam auf – der Basisstrom und damit der Motorstrom steigen allmählich.',
    learn: 'RC an der Basis → Rampe statt Sprung.', take: 'Nach 0,1 s steht der Motor noch, nach 0,4 s läuft er mit etwa halber Drehzahl, nach gut einer Sekunde mit voller.',
    hint: 'R1.b → R2.a, R2.b → Q1.b, R1.b → C1.a, C1.b → Masse.', hint2: 'τ ≈ 2200 µF · (470 Ω ∥ 520 Ω) ≈ 0,5 s.',
    palette: ['resistor', 'capacitor'], need: { resistor: 2, capacitor: 1 }, start: rampStart, ref: ramp, bench: benchOf(ramp),
    wrong: [named('ohne Kondensator (harter Start)', drv({ diode: true }))],
    tests: [{ name: 'Hochlauf', steps: [
      { name: 'nach 0,1 s', set: { E1: { closed: true } }, run: 0.1, expect: [mot(0, 0.01)] },
      { name: 'nach 0,4 s', run: 0.3, expect: [mot(0.05, 0.22)] },
      { name: 'nach 2 s', run: 1.6, expect: [mot(0.26, 0.3), { sel: 'Q1', state: 'sat' }, { noFault: true }] }] }]
  });

  var run = drv({ diode: true, e1: true });
  defTask({
    id: '15.5', ch: 15, title: 'Leistungsbilanz', tags: ['elektro.leistung', 'messen.spannung', 'messen.strom', 'antrieb.treiber'],
    story: 'Für die Dokumentation der Station braucht es eine Leistungsbilanz: Wie viel Leistung geht in den Motor, wie viel wird im Transistor verheizt?',
    brief: 'Der Motor läuft (E1 = 1). Miss <b>U<sub>M</sub></b>, den <b>Motorstrom</b> und <b>U<sub>CE</sub></b>. Berechne die <b>Motorleistung</b> und die <b>Verlustleistung am Transistor</b>.',
    learn: 'P_M = U_M · I, P_V = U_CE · I.', take: 'Rund 1,5 W gehen in den Motor, nur etwa 0,13 W in den Transistor – ein durchgeschalteter Transistor ist ein guter Schalter.',
    hint: 'U_M: rot an M1.a, schwarz an M1.b. U_CE: rot an Q1.c, schwarz an Q1.e.', hint2: 'Strom: Leitung zwischen M1.b und Q1.c lösen, A⎓ dazwischen.',
    palette: [], start: run, ref: run, bench: benchOf(run),
    tests: [{ name: 'Betrieb', expect: [{ sel: 'Q1', state: 'sat' }, { noFault: true }] }],
    measure: [
      { id: 'um', ask: 'U_M (Spannung am Motor)', unit: 'V', mode: 'V', a: 'M1.a', b: 'M1.b', tol: 0.03 },
      { id: 'i', ask: 'Motorstrom', unit: 'mA', truth: { sel: 'M1', q: 'i' }, tol: 0.03 },
      { id: 'uce', ask: 'U_CE', unit: 'V', mode: 'V', a: 'Q1.c', b: 'Q1.e', tol: 0.05 },
      { id: 'pm', ask: 'Motorleistung P_M (berechnet)', unit: 'W', value: 1.518, tol: 0.05 },
      { id: 'pv', ask: 'Verlustleistung am Transistor P_V (berechnet)', unit: 'W', value: 0.131, tol: 0.08 }
    ]
  });

  defTheory({
    id: 'T15B', ch: 15, title: 'Steuerung und Sicherheit', tags: ['steuerung.selbsthaltung', 'sicherheit.nothalt', 'messen.drehzahl'],
    merksatz: 'Selbsthaltung Q = (Start ∨ Q) ∧ Stopp mit Öffnern für Stopp und Not-Halt ist drahtbruchsicher und stoppdominant; der Not-Halt löscht die Selbsthaltung, ein Wiederanlauf braucht einen neuen Start.',
    visual: { type: 'circuit', toggleView: false, caption: 'Selbsthaltung mit Not-Halt: E1 = Start (Taster), E2 = Stopp und E3 = Not-Halt (Öffner, in Ruhe 1), L1 = Motor EIN. Start kurz anklicken und wieder lösen – L1 bleibt an. Not-Halt löscht die Selbsthaltung: Nach dem Entriegeln bleibt L1 aus.',
      layout: { parts: [{ id: 'GND1', type: 'ground', x: 120, y: 560 }, { id: 'E1', type: 'logicin', x: 160, y: 160 }, { id: 'E2', type: 'logicin', props: { closed: true }, x: 160, y: 280 }, { id: 'E3', type: 'logicin', props: { closed: true }, x: 160, y: 400 },
        { id: 'L1', type: 'logicled', props: { color: 'gruen' }, x: 860, y: 300 }, { id: 'U1', type: 'or', x: 340, y: 180 }, { id: 'U2', type: 'and', x: 500, y: 260 }, { id: 'U3', type: 'and', x: 660, y: 300 }],
        wires: [W('E1.out', 'U1.in1'), W('U1.out', 'U2.in1'), W('E2.out', 'U2.in2'), W('U2.out', 'U3.in1'), W('E3.out', 'U3.in2'), W('U3.out', 'U1.in2'), W('U3.out', 'L1.in')] } },
    lesson:
      '<p><b>Start/Stopp mit Selbsthaltung:</b> Der Start-Taster wird nur kurz gedrückt. Damit der Motor weiterläuft, führt man den Ausgang zurück auf den Eingang – er <b>hält sich selbst</b>:</p>' +
      '<div class="formula">Q = (Start ∨ Q) ∧ Stopp</div>' +
      '<p>Der <b>Stopp-Taster ist ein Öffner</b> (im Ruhezustand 1). Das ist <b>drahtbruchsicher</b>: Reisst die Leitung, ist das Signal 0 – die Anlage stoppt, statt unkontrollierbar weiterzulaufen. Werden Start und Stopp gleichzeitig gedrückt, gewinnt Stopp (<b>stoppdominant</b>).</p>' +
      '<p>Der <b>Not-Halt</b> ist ebenfalls ein Öffner und <b>übersteuert alles</b>. Wichtig: Nach dem Entriegeln darf die Anlage <b>nicht von selbst wieder anlaufen</b> – der Not-Halt muss deshalb die Selbsthaltung löschen, nicht nur den Ausgang sperren. Erst ein neuer Start setzt die Anlage wieder in Gang.</p>' +
      '<p><b>Drehzahlmessung:</b> Ein Impulsgeber (Lochscheibe + Lichtschranke) liefert pro Umdrehung eine feste Zahl Impulse. Ein Zähler zählt nur während der <b>Torzeit</b> (UND-Verknüpfung von Impulsen und Tor). Drehzahl = Impulse / (Torzeit · Impulse pro Umdrehung), mal 60 für 1/min.</p>' +
      '<p><b>Fehlersuche an der Anlage:</b> Den Signalweg vom Taster bis zum Motor Block für Block verfolgen und an jedem Übergang messen. Liegt an einem Bauteil die volle Spannung, aber es fliesst kein Strom, ist es unterbrochen.</p>',
    questions: [
      { q: 'Warum ist der Stopp-Taster ein Öffner?', options: ['Weil er billiger ist', 'Drahtbruchsicher: Leitungsbruch wirkt wie Stopp', 'Damit der Motor schneller startet', 'Das ist egal'], correct: 1, explain: 'Ein Bruch der Leitung ergibt 0 = Stopp.' },
      { q: 'Was bewirkt die Selbsthaltung?', options: ['Der Motor läuft nur, solange Start gedrückt ist', 'Der Motor läuft nach dem Loslassen von Start weiter', 'Der Motor läuft rückwärts', 'Sie ersetzt den Not-Halt'], correct: 1, explain: 'Der Ausgang hält sich über die Rückführung selbst.' },
      { q: 'Der Not-Halt wird entriegelt. Was darf NICHT passieren?', options: ['Die Anlage bleibt stehen', 'Die Anlage läuft von selbst wieder an', 'Man muss Start drücken', 'Die Betriebs-LED bleibt aus'], correct: 1, explain: 'Kein selbsttätiger Wiederanlauf – erst ein neuer Start.' },
      { q: 'Ein Impulsgeber liefert 1 Impuls pro Umdrehung. In 0,5 s Torzeit werden 5 Impulse gezählt. Drehzahl?', options: ['5 1/min', '10 1/min', '300 1/min', '600 1/min'], correct: 3, explain: '5 / 0,5 s = 10 1/s = 600 1/min.' },
      { q: 'Start und Stopp werden gleichzeitig gedrückt. Was macht Q = (Start ∨ Q) ∧ Stopp?', options: ['Motor läuft', 'Motor steht (stoppdominant)', 'Motor wechselt die Richtung', 'Unbestimmt'], correct: 1, explain: 'Gedrückter Öffner = 0, das UND sperrt.' }
    ]
  });

  /* Selbsthaltung am Experimentierboard: E1 Start (Schliesser), E2 Stopp (Oeffner, Ruhe = 1), E3 Not-Halt (Oeffner), L1 = Motor EIN */
  function ctl(o) {
    o = o || {};
    var l = { parts: [P('GND1', 'ground', 120, 560), P('E1', 'logicin', 160, 160), P('E2', 'logicin', 160, 280, 0, { closed: true }), P('L1', 'logicled', 860, 300, 0, { color: 'gruen' })], wires: [] };
    if (o.nh) l.parts.push(P('E3', 'logicin', 160, 400, 0, { closed: true }));
    if (o.gates) {
      l.parts.push(P('U1', 'or', 340, 180), P('U2', 'and', 500, 260));
      l.wires.push(W('E1.out', 'U1.in1'), W('U1.out', 'U2.in1'), W('E2.out', 'U2.in2'));
      if (o.nh === 'ok') { l.parts.push(P('U3', 'and', 660, 300)); l.wires.push(W('U2.out', 'U3.in1'), W('E3.out', 'U3.in2'), W('U3.out', 'U1.in2'), W('U3.out', 'L1.in')); }
      else if (o.nh === 'out') { l.parts.push(P('U3', 'and', 660, 300)); l.wires.push(W('U2.out', 'U3.in1'), W('E3.out', 'U3.in2'), W('U2.out', 'U1.in2'), W('U3.out', 'L1.in')); }
      else if (o.noHold) l.wires.push(W('U2.out', 'L1.in'), W('E1.out', 'U1.in2'));
      else l.wires.push(W('U2.out', 'U1.in2'), W('U2.out', 'L1.in'));
    }
    return l;
  }
  var holdSeq = function (sel, onV) { return [
    { name: 'Ruhe', expect: [on(sel, 0)] },
    { name: 'Start drücken', set: { E1: { closed: true } }, expect: [on(sel, 1)] },
    { name: 'Start loslassen', set: { E1: { closed: false } }, expect: [on(sel, 1)] },
    { name: 'Stopp drücken', set: { E2: { closed: false } }, expect: [on(sel, 0)] },
    { name: 'Stopp loslassen', set: { E2: { closed: true } }, expect: [on(sel, 0)] },
    { name: 'Start und Stopp gleichzeitig', set: { E1: { closed: true }, E2: { closed: false } }, expect: [on(sel, 0)] },
    { name: 'beide loslassen', set: { E1: { closed: false }, E2: { closed: true } }, expect: [on(sel, 0), { noFault: true }] }]; };
  var bCtl = { E1: [170, 220], E2: [170, 380], E3: [170, 540], GND1: [170, 690], U1: [360, 240], U2: [520, 330], U3: [680, 380], L1: [860, 380] };
  var holdRef = ctl({ gates: true });
  defTask({
    id: '15.6', ch: 15, title: 'Start und Stopp mit Selbsthaltung', tags: ['steuerung.selbsthaltung', 'digital.speicher', 'digital.und', 'digital.oder'],
    story: 'Die Station bekommt ein Bedienpult: ein grüner Start-Taster (E1, Schliesser) und ein roter Stopp-Taster (E2, <b>Öffner</b> – in Ruhe 1). Der Motor soll nach einem kurzen Druck auf Start weiterlaufen.',
    brief: 'Baue die <b>Selbsthaltung</b> Q = (E1 ∨ Q) ∧ E2. L1 steht für „Motor EIN“. Stopp gewinnt, wenn beide gedrückt sind.<p class="limit">Erlaubt: höchstens <b>2</b> Gatter.</p>',
    learn: 'Rückführung = Gedächtnis.', take: 'Das ODER hält den Zustand, das UND mit dem Öffner löscht ihn – stoppdominant und drahtbruchsicher.',
    hint: 'E1 und der Ausgang ins ODER, dessen Ausgang mit E2 ins UND.', hint2: 'E1 → U1.in1, U2.out → U1.in2, U1.out → U2.in1, E2 → U2.in2, U2.out → L1.',
    palette: ['and', 'or', 'not', 'nand', 'nor'], limit: { gates: 2 }, start: ctl(), ref: holdRef, bench: benchOf(holdRef, bCtl),
    wrong: [named('ohne Rückführung (Tippbetrieb)', ctl({ gates: true, noHold: true }))],
    tests: [{ name: 'Bedienung', steps: holdSeq('L1') }]
  });

  var nhRef = ctl({ gates: true, nh: 'ok' });
  var nhStart = ctl({ gates: true, nh: true });
  var nhSeq = holdSeq('L1').concat([
    { name: 'Start', set: { E1: { closed: true } }, expect: [on('L1', 1)] },
    { name: 'Start los, Not-Halt', set: { E1: { closed: false }, E3: { closed: false } }, expect: [on('L1', 0)] },
    { name: 'Start bei Not-Halt', set: { E1: { closed: true } }, expect: [on('L1', 0)] },
    { name: 'Start los, Not-Halt entriegelt', set: { E1: { closed: false }, E3: { closed: true } }, expect: [on('L1', 0)] },
    { name: 'neuer Start', set: { E1: { closed: true } }, expect: [on('L1', 1), { noFault: true }] }]);
  defTask({
    id: '15.7', ch: 15, title: 'Not-Halt', tags: ['sicherheit.nothalt', 'steuerung.selbsthaltung', 'digital.und'],
    story: 'Die Sicherheitsfachkraft nimmt die Station ab: „Wo ist der Not-Halt? Und nach dem Entriegeln darf nichts von selbst anlaufen!“',
    brief: 'Ergänze den <b>Not-Halt E3</b> (Öffner, in Ruhe 1). Er muss den Motor sofort abschalten, Start sperren und die <b>Selbsthaltung löschen</b>: Nach dem Entriegeln bleibt L1 aus, bis wieder Start gedrückt wird.<p class="limit">Erlaubt: höchstens <b>3</b> Gatter.</p>',
    learn: 'Not-Halt in die Selbsthaltung, nicht nur an den Ausgang.', take: 'Liegt der Not-Halt hinter der Rückführung, läuft der Motor nach dem Entriegeln von selbst wieder an – gefährlich.',
    hint: 'Ein drittes UND zwischen U2 und dem Ausgang – und die Rückführung von dessen Ausgang nehmen.', hint2: 'U2.out → U3.in1, E3 → U3.in2, U3.out → U1.in2 und → L1 (die alten Leitungen von U2.out löschen).',
    palette: ['and', 'or', 'not', 'nand', 'nor'], limit: { gates: 3 }, start: nhStart, ref: nhRef, bench: benchOf(nhRef, bCtl),
    wrong: [named('Not-Halt nur am Ausgang (Wiederanlauf!)', ctl({ gates: true, nh: 'out' }))],
    tests: [{ name: 'Sicherheit', steps: nhSeq }]
  });

  /* 15.8 Drehzahlmessung: Impulsgeber CLK1 (1 Impuls je Umdrehung) → Tor (UND mit E1) → 3-Bit-Zaehler → Decoder → Anzeige */
  function tacho(gate) {
    var l = { parts: [P('CLK1', 'clock', 160, 180, 0, { freq: 10 }), P('E1', 'logicin', 160, 320), P('E2', 'logicin', 160, 460, 0, { closed: true }), P('GND1', 'ground', 120, 560),
      P('FF1', 'tff', 420, 200), P('FF2', 'tff', 420, 340), P('FF3', 'tff', 420, 480), P('IC1', 'dec7', 660, 330), P('AZ1', 'seg7', 860, 330)],
      wires: [W('FF1.Qn', 'FF2.C'), W('FF2.Qn', 'FF3.C'), W('E2.out', 'FF1.T'), W('E2.out', 'FF2.T'), W('E2.out', 'FF3.T'), W('FF1.Q', 'IC1.A'), W('FF2.Q', 'IC1.B'), W('FF3.Q', 'IC1.C'), W('IC1.D', 'GND1.g')] };
    'abcdefg'.split('').forEach(function (k) { l.wires.push(W('IC1.' + k, 'AZ1.' + k)); });
    if (gate === 'and') { l.parts.push(P('U1', 'and', 300, 240)); l.wires.push(W('CLK1.out', 'U1.in1'), W('E1.out', 'U1.in2'), W('U1.out', 'FF1.C')); }
    if (gate === 'direct') l.wires.push(W('CLK1.out', 'FF1.C'));
    return l;
  }
  var tachoRef = tacho('and');
  var bTacho = { CLK1: [180, 200], E1: [180, 360], E2: [180, 520], GND1: [180, 690], U1: [340, 250], FF1: [500, 200], FF2: [500, 380], FF3: [500, 560], IC1: [680, 420], AZ1: [850, 420] };
  defTask({
    id: '15.8', ch: 15, title: 'Drehzahlmessung', tags: ['messen.drehzahl', 'digital.zaehler', 'digital.und'],
    story: 'Die Motorwelle trägt eine Lochscheibe mit einem Loch – die Lichtschranke CLK1 liefert <b>einen Impuls pro Umdrehung</b>. Ein Zähler mit Anzeige steht bereit, zählt aber ohne Pause.',
    brief: 'Baue ein <b>Tor</b>: Die Impulse sollen nur dann an FF1.C gelangen, wenn die Torzeit E1 = 1 ist. Schalte das Tor für <b>0,5 s</b> ein (Prüfung) und lies die Anzeige ab. Berechne die Drehzahl.',
    learn: 'Frequenzzähler = UND-Tor + Zähler.', take: '5 Impulse in 0,5 s = 10 Umdrehungen pro Sekunde = 600 1/min.',
    hint: 'CLK1.out und E1.out an ein UND, dessen Ausgang an FF1.C.', hint2: 'n = Impulse / Torzeit · 60 s/min.',
    palette: ['and', 'or', 'not'], need: { and: 1 }, limit: { gates: 1 }, start: tacho(), ref: tachoRef, bench: benchOf(tachoRef, bTacho),
    wrong: [named('ohne Tor (zählt dauernd)', tacho('direct'))],
    tests: [{ name: 'Torzeit 0,5 s', steps: [
      { name: 'Tor zu', run: 0.3, expect: [{ sel: 'AZ1', digit: 0 }] },
      { name: 'Tor offen 0,5 s', set: { E1: { closed: true } }, run: 0.5, expect: [{ sel: 'AZ1', digit: 5 }] },
      { name: 'Tor wieder zu', set: { E1: { closed: false } }, run: 0.5, expect: [{ sel: 'AZ1', digit: 5 }, { noFault: true }] }] }],
    measure: [
      { id: 'n', ask: 'Impulse in 0,5 s (Anzeige)', unit: '', value: 5, tol: 0.01 },
      { id: 'rpm', ask: 'Drehzahl in 1/min (berechnet)', unit: '1/min', value: 600, tol: 0.03 }
    ]
  });

  /* 15.9 Fehlersuche: Basiswiderstand unterbrochen */
  var broken = drv({ diode: true, e1: true, defect: true });
  var fixed = (function () {
    var l = clone(broken);
    l.wires = l.wires.filter(function (w) { return w.from.indexOf('R1.') !== 0 && w.to.indexOf('R1.') !== 0; });
    l.parts.push(Rz('R2', 470, 300, 300)); l.wires.push(W('E1.out', 'R2.a'), W('R2.b', 'Q1.b'));
    return l;
  })();
  defTask({
    id: '15.9', ch: 15, title: 'Die Station steht', tags: ['elektro.fehlersuche', 'messen.spannung', 'antrieb.treiber'],
    story: 'Montagmorgen: E1 steht auf 1, aber der Motor dreht nicht. Die Sicherung ist ganz, von aussen sieht man nichts. „Block für Block messen“, sagt die Werkmeisterin.',
    brief: 'Finde das <b>defekte Bauteil</b> durch Spannungsmessung entlang des Signalwegs (E1 → R1 → Basis → Kollektor → Motor) und ersetze es: neues Bauteil aus der Palette an seine Stelle verdrahten (das defekte bleibt liegen). Notiere die Spannung, die du am defekten Bauteil gemessen hast.',
    learn: 'Volle Spannung über einem Bauteil, kein Strom → Unterbrechung.', take: 'Am Basiswiderstand lagen 4,3 V, U_BE war 0 V: Der Widerstand war unterbrochen, der Transistor bekam keinen Basisstrom.',
    hint: 'Miss U an R1, dann U_BE, dann U_CE.', hint2: 'R1 ist unterbrochen. Neuer Widerstand 470 Ω: E1.out → R2 → Q1.b, die Leitungen an R1 löschen.',
    palette: ['resistor'], need: { resistor: 2 }, start: broken, ref: fixed, bench: benchOf(fixed, { R2: [340, 170, 0] }),
    wrong: [named('defekter Widerstand noch im Kreis', (function () { var l = clone(fixed); l.wires = broken.wires; return l; })())],
    tests: [{ name: 'repariert', steps: [
      { name: 'E1 = 1', set: { E1: { closed: true } }, expect: [mot(0.26, 0.3), { noFault: true }] },
      { name: 'E1 = 0', set: { E1: { closed: false } }, expect: [mot(0, 1e-4)] }] }],
    measure: [{ id: 'ud', ask: 'Spannung am defekten Bauteil (vor der Reparatur)', unit: 'V', value: 4.3, tol: 0.05 }]
  });

  /* 15.10 BOSS: Antriebsstation komplett */
  function station(o) {
    o = o || {};
    var l = { parts: [P('E1', 'logicin', 160, 160), P('E2', 'logicin', 160, 260, 0, { closed: true }), P('E3', 'logicin', 160, 360, 0, { closed: true }), P('GND1', 'ground', 120, 560),
      P('B1', 'battery', 1000, 320), P('M1', 'motor', 820, 240, 90), P('L1', 'logicled', 620, 520, 0, { color: 'gruen' })],
      wires: [W('B1.n', 'GND1.g'), W('B1.p', 'M1.a')] };
    l.parts[4].value = 6;
    if (!o.built) return l;
    l.parts.push(P('U1', 'or', 320, 180), P('U2', 'and', 460, 260), P('U3', 'and', 600, 320), Rz('R1', 470, 700, 400), P('Q1', 'npn', 820, 400), P('V1', 'diode', 900, 240, o.diode === 'rev' ? 90 : 270));
    l.wires.push(W('E1.out', 'U1.in1'), W('U1.out', 'U2.in1'), W('E2.out', 'U2.in2'), W('U2.out', 'U3.in1'), W('E3.out', 'U3.in2'),
      W(o.nhOut ? 'U2.out' : 'U3.out', 'U1.in2'), W('U3.out', 'L1.in'), W('U3.out', 'R1.a'), W('R1.b', 'Q1.b'), W('Q1.e', 'GND1.g'), W('M1.b', 'Q1.c'),
      o.diode === 'rev' ? W('V1.a', 'M1.a') : W('V1.k', 'M1.a'), o.diode === 'rev' ? W('V1.k', 'M1.b') : W('V1.a', 'M1.b'));
    return l;
  }
  var bossRef = station({ built: true });
  var bStation = { E1: [150, 170], E2: [150, 310], E3: [150, 450], GND1: [470, 690], U1: [320, 210], U2: [320, 370], U3: [480, 300], R1: [480, 460, 0],
    Q1: [650, 480, 0], M1: [650, 220, 90], V1: [810, 220, 270], L1: [810, 400, 0], B1: [820, 610, 0] };
  var M_ON = [mot(0.26, 0.3), { sel: 'Q1', state: 'sat' }, on('L1', 1)], M_OFF = [mot(0, 1e-4), on('L1', 0)];
  defTask({
    id: '15.10', ch: 15, title: 'BOSS: Die Antriebsstation', tags: ['antrieb.station', 'steuerung.selbsthaltung', 'sicherheit.nothalt', 'antrieb.treiber', 'antrieb.boss'], boss: true,
    story: 'Die Abnahme der Antriebsstation. Die Werkmeisterin und die Sicherheitsfachkraft stehen daneben: „Das ist deine Profi-Prüfung. Start, Stopp, Not-Halt, Treiber mit Schutz – alles muss sitzen.“',
    brief: 'Baue die komplette Station: <b>Selbsthaltung</b> mit Start E1 und Stopp E2 (Öffner), <b>Not-Halt E3</b> (Öffner, löscht die Selbsthaltung), Betriebsanzeige <b>L1</b>, <b>Transistor-Treiber</b> (Basiswiderstand 470 Ω) für den Motor M1 an 6 V und die <b>Freilaufdiode</b>. Geprüfte Abläufe: Start, Halten, Stopp, stoppdominant, Not-Halt ohne Wiederanlauf.<p class="limit">Erlaubt: höchstens <b>3</b> Gatter.</p>',
    learn: 'Steuerung + Leistungsteil + Schutz = Anlage.', take: 'Ein Signal (U3) steuert Anzeige und Treiber zugleich; der Not-Halt sitzt in der Selbsthaltung, die Diode schützt den Transistor.',
    hint: 'Erst die Logik aus 15.7 (U1 ODER, U2 UND, U3 UND), dann U3.out → L1 und → R1 → Q1.b, Q1.c an M1.b, Q1.e an Masse.', hint2: 'Freilaufdiode: V1.k → M1.a, V1.a → M1.b.',
    palette: ['and', 'or', 'not', 'nand', 'nor', 'npn', 'resistor', 'diode'], need: { npn: 1, resistor: 1, diode: 1 }, limit: { gates: 3 },
    start: station(), ref: bossRef, bench: benchOf(bossRef, bStation),
    wrong: [named('Freilaufdiode falsch gepolt', station({ built: true, diode: 'rev' })), named('Not-Halt nur am Ausgang (Wiederanlauf!)', station({ built: true, nhOut: true }))],
    tests: [{ name: 'Abnahme', steps: [
      { name: 'Ruhe', expect: M_OFF },
      { name: 'Start drücken', set: { E1: { closed: true } }, expect: M_ON.concat([{ noFault: true }]) },
      { name: 'Start loslassen', set: { E1: { closed: false } }, expect: M_ON },
      { name: 'Stopp', set: { E2: { closed: false } }, expect: M_OFF },
      { name: 'Stopp loslassen', set: { E2: { closed: true } }, expect: M_OFF },
      { name: 'Start und Stopp gleichzeitig', set: { E1: { closed: true }, E2: { closed: false } }, expect: M_OFF },
      { name: 'Start (Stopp los)', set: { E2: { closed: true } }, expect: M_ON },
      { name: 'Not-Halt', set: { E1: { closed: false }, E3: { closed: false } }, expect: M_OFF },
      { name: 'Start bei Not-Halt', set: { E1: { closed: true } }, expect: M_OFF },
      { name: 'Not-Halt entriegelt', set: { E1: { closed: false }, E3: { closed: true } }, expect: M_OFF },
      { name: 'neuer Start', set: { E1: { closed: true } }, expect: M_ON.concat([{ noFault: true }]) }] }]
  });
})();

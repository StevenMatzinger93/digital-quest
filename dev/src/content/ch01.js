/* Kapitel 1 – Stromkreis und Ohmsches Gesetz
 * Quelle: Praktische Elektronik (Kap. 2.1 Ohmsches Gesetz, Aufgabe 1), Willkommen in der Digitaltechnik (Auftrag 3: Fehlersuche LED),
 * Messtechnik Erweiterung (Grundbegriffe). Inhalte sinngemaess uebernommen, Werte an Laborbauteile angepasst. */
(function () {
  'use strict';

  defChapter({
    id: 1, title: 'Stromkreis und Ohmsches Gesetz',
    intro: 'Willkommen im Labor. Hier lernst du den geschlossenen Stromkreis kennen, misst Spannung und Strom wie in der Werkstatt und rechnest mit dem Ohmschen Gesetz.',
    sequence: ['T1A', '1.1', '1.2', '1.3', '1.4', '1.5', 'T1B', '1.6', '1.7', '1.8', '1.9', '1.10']
  });

  var bat = function (v) { return { id: 'B1', type: 'battery', value: v, x: 160, y: 300, rot: 0 }; };
  var bat9 = bat(9), bat10 = bat(10);
  var bB1 = { id: 'B1', x: 260, y: 460, rot: 0 };

  /* ================= Theorie A ================= */
  var lampCircuit = function (closed) {
    return { parts: [bat9, { id: 'S1', type: 'switch', props: { closed: closed } }, { id: 'H1', type: 'lamp' }],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n')] };
  };
  defTheory({
    id: 'T1A', ch: 1, title: 'Der Stromkreis', tags: ['elektro.stromkreis', 'elektro.grundgroessen', 'messen.multimeter'],
    merksatz: 'Strom fliesst nur im geschlossenen Kreis – Spannung liegt zwischen zwei Punkten, Strom ist überall in der Reihe gleich; zwei Schalter in Reihe wirken als UND, parallel als ODER.',
    visual: { type: 'circuit', caption: 'Schalter S1 anklicken: Der Kreis schliesst sich, die Punkte zeigen den Strom (technische Richtung + → −), die Lampe leuchtet. Offen fliesst nirgends Strom.',
      layout: { parts: [{ id: 'B1', type: 'battery', value: 9, x: 160, y: 300 }, { id: 'S1', type: 'switch', x: 320, y: 200 }, { id: 'H1', type: 'lamp', x: 480, y: 300, rot: 90 }], wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n')] },
      bench: { parts: [{ id: 'B1', x: 240, y: 460 }, { id: 'S1', x: 480, y: 290 }, { id: 'H1', x: 740, y: 460, rot: 90 }] },
      readouts: [{ label: 'Strom I', sel: 'H1', q: 'i' }, { label: 'Leistung P', sel: 'H1', q: 'p' }] },
    lesson:
      '<p>Ein <b>Stromkreis</b> besteht mindestens aus einer <b>Quelle</b> (Batterie, Netzgerät), einem <b>Verbraucher</b> (Lampe, Widerstand, LED) und einem <b>geschlossenen Leiterweg</b> hin und zurück. Ein <b>Schalter</b> öffnet oder schliesst diesen Weg.</p>' +
      '<p><b>Spannung U</b> (Volt, V) ist der Antrieb für die Ladungen. Sie liegt immer <i>zwischen zwei Punkten</i> an – zum Beispiel zwischen Plus- und Minuspol der Batterie.</p>' +
      '<p><b>Strom I</b> (Ampere, A) ist die Ladung, die pro Sekunde durch den Leiter fliesst. Er fliesst nur, wenn der Kreis <i>geschlossen</i> ist – und dann durch jedes Bauteil einer Reihe gleich stark.</p>' +
      '<p>Zwei Schalter <b>in Reihe</b>: Die Lampe leuchtet nur, wenn <i>beide</i> geschlossen sind (UND). Zwei Schalter <b>parallel</b>: Es genügt <i>einer</i> (ODER).</p>' +
      '<p><b>Messen:</b> Das Voltmeter kommt <i>parallel</i> an die zwei Punkte, zwischen denen du die Spannung wissen willst. Das Amperemeter kommt <i>in Reihe</i> – dazu wird der Kreis aufgetrennt und das Messgerät in die Lücke gesetzt.</p>',
    questions: [
      { q: 'Was braucht ein Stromkreis mindestens?', options: ['Eine Quelle und einen Schalter', 'Eine Quelle, einen Verbraucher und einen geschlossenen Leiterweg', 'Einen Verbraucher und ein Messgerät', 'Zwei Leitungen und einen Schalter'], correct: 1, explain: 'Ohne Quelle kein Antrieb, ohne Verbraucher nichts, das die Energie nutzt, ohne geschlossenen Weg kein Strom.' },
      { q: 'Zwei Schalter liegen in Reihe mit einer Lampe. Wann leuchtet die Lampe?', options: ['Wenn mindestens ein Schalter zu ist', 'Nur wenn beide Schalter zu sind', 'Immer', 'Nur wenn beide offen sind'], correct: 1, explain: 'In Reihe muss der Strom durch beide Schalter – jeder offene Schalter unterbricht den Kreis (UND-Funktion).' },
      { q: 'Batterie 9 V, Schalter offen, Lampe. Welche Spannung misst du über dem offenen Schalter?', options: ['0 V', '4,5 V', '9 V', '18 V'], correct: 2,
        explain: 'Es fliesst kein Strom, an der Lampe fällt nichts ab – die ganze Quellenspannung liegt über der Unterbrechung.', verify: { layout: lampCircuit(false), mode: 'V', a: 'S1.a', b: 'S1.b' } },
      { q: 'Wie schliesst du ein Amperemeter an?', options: ['Parallel zum Verbraucher', 'In Reihe: Kreis auftrennen, Messgerät in die Lücke', 'Direkt an die Batteriepole', 'Gar nicht – Strom kann man nur rechnen'], correct: 1, explain: 'Der Strom muss durch das Messgerät fliessen. Direkt an die Batterie wäre ein Kurzschluss.' },
      { q: 'Die Lampe (60 Ω) hängt über den geschlossenen Schalter an 9 V. Welcher Strom fliesst?', options: ['15 mA', '150 mA', '540 mA', '1,5 A'], correct: 1,
        explain: 'I = U / R = 9 V / 60 Ω = 0,15 A = 150 mA.', verifyTruth: { layout: lampCircuit(true), sel: 'H1', q: 'i' } }
    ]
  });

  /* ================= Aufgaben 1–5 ================= */
  defTask({
    id: '1.1', ch: 1, title: 'Licht an!', tags: ['elektro.stromkreis', 'elektro.schalter'],
    story: 'Die Notbeleuchtung im Labor ist tot. Nur die Batterie liegt noch auf dem Tisch.',
    brief: 'Baue einen geschlossenen Stromkreis aus Batterie, <b>Schalter</b> und <b>Lampe</b>. Die Lampe soll nur leuchten, wenn der Schalter geschlossen ist.',
    learn: 'Strom fliesst nur in einem geschlossenen Kreis.',
    take: 'Ein Schalter unterbricht den Stromkreis – offen heisst: kein Strom.',
    hint: 'Verbinde + der Batterie mit dem Schalter, den Schalter mit der Lampe und die Lampe zurück mit –.',
    hint2: 'Reihenfolge: B1.+ → S1 → H1 → B1.–',
    palette: ['switch', 'lamp'], need: { switch: 1, lamp: 1 },
    start: { parts: [bat9], wires: [] },
    ref: { parts: [bat9, { id: 'S1', type: 'switch', x: 300, y: 200, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n')] },
    bench: { parts: [bB1, { id: 'S1', x: 520, y: 290, rot: 0 }, { id: 'H1', x: 780, y: 460, rot: 0 }] },
    wrong: [
      { name: 'Schalter nicht im Kreis', parts: [bat9, { id: 'S1', type: 'switch', x: 300, y: 120, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
        wires: [W('B1.p', 'H1.a'), W('H1.b', 'B1.n')] }
    ],
    tests: [
      { name: 'Schalter zu', set: { '@switch': { closed: true } }, expect: [{ sel: '@lamp', i: [0.05, 1] }, { noFault: true }] },
      { name: 'Schalter offen', set: { '@switch': { closed: false } }, expect: [{ sel: '@lamp', i: [0, 1e-4] }] }
    ]
  });

  var serRef = { parts: [bat9, { id: 'S1', type: 'switch', x: 300, y: 200, rot: 0 }, { id: 'S2', type: 'switch', x: 440, y: 200, rot: 0 }, { id: 'H1', type: 'lamp', x: 580, y: 300, rot: 90 }],
    wires: [W('B1.p', 'S1.a'), W('S1.b', 'S2.a'), W('S2.b', 'H1.a'), W('H1.b', 'B1.n')] };
  var parRef = { parts: [bat9, { id: 'S1', type: 'switch', x: 320, y: 160, rot: 0 }, { id: 'S2', type: 'switch', x: 320, y: 260, rot: 0 }, { id: 'H1', type: 'lamp', x: 560, y: 300, rot: 90 }],
    wires: [W('B1.p', 'S1.a'), W('B1.p', 'S2.a'), W('S1.b', 'H1.a'), W('S2.b', 'H1.a'), W('H1.b', 'B1.n')] };
  var two = function (a, b) { return { S1: { closed: a }, S2: { closed: b } }; };
  var on = [{ sel: 'H1', i: [0.05, 1] }], off = [{ sel: 'H1', i: [0, 1e-4] }];

  defTask({
    id: '1.2', ch: 1, title: 'Sicherheitsschaltung', tags: ['elektro.stromkreis', 'elektro.schalter', 'elektro.reihenschaltung', 'digital.und'],
    story: 'Die Presse im Nachbarraum darf nur anlaufen, wenn die Schutztür zu ist <i>und</i> jemand den Startschalter betätigt.',
    brief: 'Baue eine Schaltung mit <b>zwei Schaltern</b> und einer Lampe (als Anzeige „Presse läuft“). Die Lampe darf nur leuchten, wenn <b>S1 und S2</b> geschlossen sind.',
    learn: 'Schalter in Reihe wirken wie eine UND-Verknüpfung.',
    take: 'In Reihe muss der Strom durch jeden Schalter – ein einziger offener Schalter unterbricht alles.',
    hint: 'Der Strom soll erst durch S1, dann durch S2 und dann durch die Lampe fliessen.',
    hint2: 'B1.+ → S1 → S2 → H1 → B1.–',
    palette: ['switch', 'lamp'], need: { switch: 2, lamp: 1 },
    start: { parts: [bat9], wires: [] }, ref: serRef,
    bench: { parts: [bB1, { id: 'S1', x: 440, y: 290, rot: 0 }, { id: 'S2', x: 620, y: 290, rot: 0 }, { id: 'H1', x: 800, y: 460, rot: 0 }] },
    wrong: [{ name: 'parallel statt in Reihe', parts: parRef.parts, wires: parRef.wires }],
    tests: [
      { name: 'beide zu', set: two(true, true), expect: on.concat([{ noFault: true }]) },
      { name: 'nur S1 zu', set: two(true, false), expect: off },
      { name: 'nur S2 zu', set: two(false, true), expect: off },
      { name: 'beide offen', set: two(false, false), expect: off }
    ]
  });

  defTask({
    id: '1.3', ch: 1, title: 'Zwei Lichtschalter', tags: ['elektro.stromkreis', 'elektro.schalter', 'elektro.parallelschaltung', 'digital.oder'],
    story: 'Der Gang hat zwei Eingänge. Das Licht soll von jedem Eingang aus eingeschaltet werden können.',
    brief: 'Baue die Schaltung so, dass die Lampe leuchtet, wenn <b>S1 oder S2</b> (oder beide) geschlossen sind.',
    learn: 'Parallele Schalter wirken wie eine ODER-Verknüpfung.',
    take: 'Parallel gibt es mehrere Wege – ein geschlossener Weg genügt.',
    hint: 'Beide Schalter bekommen denselben Anfang (B1.+) und dasselbe Ende (Lampe).',
    hint2: 'B1.+ → S1.a und S2.a; S1.b und S2.b → H1.a; H1.b → B1.–',
    palette: ['switch', 'lamp'], need: { switch: 2, lamp: 1 },
    start: { parts: [bat9], wires: [] }, ref: parRef,
    bench: { parts: [bB1, { id: 'S1', x: 500, y: 230, rot: 0 }, { id: 'S2', x: 500, y: 370, rot: 0 }, { id: 'H1', x: 780, y: 470, rot: 0 }] },
    wrong: [{ name: 'in Reihe statt parallel', parts: serRef.parts, wires: serRef.wires }],
    tests: [
      { name: 'nur S1 zu', set: two(true, false), expect: on.concat([{ noFault: true }]) },
      { name: 'nur S2 zu', set: two(false, true), expect: on },
      { name: 'beide zu', set: two(true, true), expect: on },
      { name: 'beide offen', set: two(false, false), expect: off }
    ]
  });

  var lampOn = { parts: [bat9, { id: 'S1', type: 'switch', props: { closed: true }, x: 300, y: 200, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
    wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n')] };
  defTask({
    id: '1.4', ch: 1, title: 'Wo liegt die Spannung?', tags: ['messen.spannung', 'elektro.stromkreis'],
    story: 'Die Werkmeisterin will wissen, ob du Spannung richtig misst: „Rot auf Plus, Schwarz auf Minus – und immer parallel.“',
    brief: 'Die Lampe leuchtet. Miss mit dem Multimeter (V⎓) die Spannung an der <b>Batterie</b>, an der <b>Lampe</b> und am <b>geschlossenen Schalter</b>. Trage die Werte ins Protokoll ein.',
    learn: 'Spannung misst man parallel zwischen zwei Punkten.',
    take: 'Am geschlossenen Schalter liegt praktisch keine Spannung – die ganze Quellenspannung fällt am Verbraucher ab.',
    hint: 'Multimeter auf V⎓, rote Spitze an den einen Anschluss, schwarze an den anderen.',
    hint2: 'Batterie: B1.+ und B1.–; Lampe: H1.a und H1.b; Schalter: S1.a und S1.b.',
    palette: [], start: lampOn, ref: lampOn,
    bench: { parts: [bB1, { id: 'S1', x: 520, y: 290, rot: 0 }, { id: 'H1', x: 780, y: 460, rot: 0 }] },
    tests: [{ name: 'Anlage', expect: [{ sel: 'H1', i: [0.1, 0.2] }, { noFault: true }] }],
    measure: [
      { id: 'uq', ask: 'Spannung an der Batterie B1', unit: 'V', mode: 'V', a: 'B1.p', b: 'B1.n', tol: 0.03 },
      { id: 'uh', ask: 'Spannung an der Lampe H1', unit: 'V', mode: 'V', a: 'H1.a', b: 'H1.b', tol: 0.03 },
      { id: 'us', ask: 'Spannung am geschlossenen Schalter S1', unit: 'V', mode: 'V', a: 'S1.a', b: 'S1.b', tol: 0.03, abs: 0.02 }
    ]
  });

  var rLamp = { parts: [bat9, { id: 'R1', type: 'resistor', value: 220, x: 300, y: 200, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
    wires: [W('B1.p', 'R1.a'), W('R1.b', 'H1.a'), W('H1.b', 'B1.n')] };
  defTask({
    id: '1.5', ch: 1, title: 'Strom messen', tags: ['messen.strom', 'elektro.reihenschaltung'],
    story: 'Die Kontrolllampe glimmt nur schwach. Wie viel Strom fliesst eigentlich?',
    brief: 'Miss den <b>Strom</b> im Kreis. Dazu musst du den Kreis <b>auftrennen</b> (eine Leitung anklicken und löschen) und das Multimeter im Bereich A⎓ in die Lücke setzen. Miss ausserdem die Spannung am Widerstand R1.',
    learn: 'Strom misst man in Reihe – der Kreis wird aufgetrennt.',
    take: 'In einer Reihe fliesst überall derselbe Strom – egal, wo du den Kreis auftrennst.',
    hint: 'Leitung anklicken, Entf drücken. Dann A⎓ wählen und die Spitzen an die beiden freien Anschlüsse setzen.',
    hint2: 'Nach dem Messen die Lücke wieder mit einer Leitung schliessen.',
    palette: [], start: rLamp, ref: rLamp,
    bench: { parts: [bB1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'H1', x: 780, y: 460, rot: 0 }] },
    tests: [{ name: 'Anlage geschlossen', expect: [{ sel: 'H1', i: [0.02, 0.05] }, { noFault: true }] }],
    measure: [
      { id: 'i', ask: 'Strom im Kreis', unit: 'mA', truth: { sel: 'H1', q: 'i' }, tol: 0.03 },
      { id: 'ur', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  /* ================= Theorie B ================= */
  var ohm = function (u, r) { return { parts: [bat(u), { id: 'R1', type: 'resistor', value: r }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'B1.n')] }; };
  defTheory({
    id: 'T1B', ch: 1, title: 'Ohmsches Gesetz und Vorwiderstand', tags: ['elektro.ohm', 'bauteil.led', 'elektro.leistung'],
    merksatz: 'U = R · I: Doppelte Spannung, doppelter Strom; doppelter Widerstand, halber Strom. Eine LED braucht einen Vorwiderstand R = (U_B − U_F) / I, sonst brennt sie durch.',
    visual: { type: 'circuit', caption: 'Den Vorwiderstand verkleinern: Der Strom steigt, die LED wird heller – unter etwa 240 Ω fliessen mehr als 30 mA und sie brennt durch. „Neu starten“ setzt eine neue LED ein.',
      layout: { parts: [{ id: 'B1', type: 'battery', value: 9, x: 160, y: 300 }, { id: 'R1', type: 'resistor', value: 470, x: 320, y: 200 }, { id: 'D1', type: 'led', x: 480, y: 300, rot: 90 }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] },
      bench: { parts: [{ id: 'B1', x: 240, y: 460 }, { id: 'R1', x: 500, y: 290 }, { id: 'D1', x: 740, y: 460, rot: 90 }] },
      sliders: [{ part: 'R1', prop: 'value', label: 'Vorwiderstand R1', min: 150, max: 4700, log: true, unit: 'Ω', round: 2 }],
      readouts: [{ label: 'I', sel: 'D1', q: 'i' }, { label: 'U an R1', sel: 'R1', q: 'v' }, { label: 'Helligkeit', sel: 'D1', q: 'brightness' }] },
    lesson:
      '<p>Der <b>Widerstand R</b> (Ohm, Ω) bremst den Strom. Spannung, Strom und Widerstand hängen fest zusammen – das <b>Ohmsche Gesetz</b>:</p>' +
      '<div class="formula">U = R · I &nbsp;&nbsp; I = U / R &nbsp;&nbsp; R = U / I</div>' +
      '<p>Doppelte Spannung am gleichen Widerstand → doppelter Strom. Doppelter Widerstand bei gleicher Spannung → halber Strom.</p>' +
      '<p><b>Leistung:</b> P = U · I (Watt, W). Ein Widerstand wird warm; überschreitet P seine Belastbarkeit (hier 0,25 W), wird er zu heiss.</p>' +
      '<p><b>LED und Vorwiderstand:</b> Eine LED leitet ab ihrer Flussspannung U<sub>F</sub> (rot ≈ 1,8 V, grün ≈ 2,1 V, blau ≈ 3 V) und begrenzt den Strom selbst kaum. Deshalb braucht sie einen <b>Vorwiderstand</b>, der die restliche Spannung „aufnimmt“:</p>' +
      '<div class="formula">R<sub>V</sub> = (U<sub>B</sub> − U<sub>F</sub>) / I<sub>LED</sub></div>' +
      '<p>Üblich sind 10–20 mA. Die LED hat eine Richtung: Strom nur von der <b>Anode</b> (+, langes Bein) zur <b>Kathode</b> (−, abgeflachte Seite).</p>',
    questions: [
      { q: 'An 10 V liegt ein Widerstand von 470 Ω. Welcher Strom fliesst?', options: ['2,13 mA', '21,3 mA', '47 mA', '4,7 A'], correct: 1,
        explain: 'I = 10 V / 470 Ω ≈ 0,0213 A = 21,3 mA.', verifyTruth: { layout: ohm(10, 470), sel: 'R1', q: 'i' } },
      { q: 'Bei 10 V sollen genau 10 mA fliessen. Wie gross muss R sein?', options: ['100 Ω', '1 kΩ', '10 kΩ', '0,1 Ω'], correct: 1, explain: 'R = U / I = 10 V / 0,01 A = 1000 Ω.' },
      { q: 'Rote LED (U_F = 1,8 V) an 9 V, gewünscht 20 mA. Welcher Vorwiderstand?', options: ['90 Ω', '360 Ω', '450 Ω', '1,8 kΩ'], correct: 1, explain: 'R = (9 V − 1,8 V) / 0,02 A = 360 Ω.' },
      { q: 'Was passiert, wenn du eine LED ohne Vorwiderstand direkt an 9 V anschliesst?', options: ['Sie leuchtet besonders schön', 'Nichts, sie sperrt', 'Der Strom wird sehr gross – sie brennt durch', 'Die Batterie lädt sich auf'], correct: 2, explain: 'Oberhalb von U_F begrenzt fast nur der kleine Bahnwiderstand den Strom.' },
      { q: 'Welche Leistung setzt ein 1-kΩ-Widerstand an 10 V um?', options: ['0,01 W', '0,1 W', '1 W', '10 W'], correct: 1, explain: 'P = U² / R = 100 V² / 1000 Ω = 0,1 W.' }
    ]
  });

  /* ================= Aufgaben 6–10 ================= */
  var rOnly = function (r, u) { return { parts: [bat(u || 10), { id: 'R1', type: 'resistor', value: r, x: 400, y: 300, rot: 90 }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'B1.n')] }; };
  var rOnlyWrong = function (name, r) { var l = rOnly(r); l.name = name; return l; };
  defTask({
    id: '1.6', ch: 1, title: 'Das Ohmsche Gesetz nachmessen', tags: ['elektro.ohm', 'messen.strom'],
    story: 'Im Laborbuch steht: „10 V an 470 Ω ergibt 21,28 mA.“ Stimmt das auch in echt?',
    brief: 'Schliesse einen <b>Widerstand von 470 Ω</b> an die 10-V-Quelle an. Miss den Strom mit dem Multimeter und trage ihn ein.',
    learn: 'I = U / R – und die Messung bestätigt die Rechnung.',
    take: 'Messwert und Rechnung dürfen nur wenig auseinanderliegen – sonst stimmt etwas mit dem Aufbau oder der Messung nicht.',
    hint: 'Widerstand aus der Palette holen, Wert im Feld „Widerstand“ auf 470 setzen.',
    hint2: 'Für die Strommessung eine Leitung lösen und das Multimeter (A⎓) in die Lücke setzen – oder einen Strommesser in Reihe einbauen.',
    palette: ['resistor', 'ammeter'], need: { resistor: 1 },
    start: { parts: [bat10], wires: [] }, ref: rOnly(470),
    bench: { parts: [bB1, { id: 'R1', x: 620, y: 380, rot: 90 }] },
    wrong: [rOnlyWrong('1 kΩ statt 470 Ω', 1000), rOnlyWrong('47 Ω statt 470 Ω', 47)],
    tests: [{ name: 'Betrieb', expect: [{ sel: 'R1', i: [0.0205, 0.022] }, { noFault: true }] }],
    measure: [{ id: 'i', ask: 'Strom durch R1', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 }]
  });

  defTask({
    id: '1.7', ch: 1, title: 'Genau 10 mA', tags: ['elektro.ohm', 'elektro.dimensionieren'],
    story: 'Ein Sensor verlangt einen Messstrom von genau 10 mA. Die Quelle liefert 10 V.',
    brief: 'Wähle einen Widerstand so, dass <b>10 mA (±5 %)</b> fliessen. Miss den Strom zur Kontrolle.',
    learn: 'R = U / I – das Ohmsche Gesetz umgestellt.',
    take: 'Mit dem Ohmschen Gesetz dimensionierst du Bauteile, bevor du sie einbaust.',
    hint: 'Rechne R = U / I mit I = 0,01 A.',
    hint2: 'R = 10 V / 0,01 A = 1000 Ω = 1 kΩ.',
    palette: ['resistor', 'ammeter'], need: { resistor: 1 },
    start: { parts: [bat10], wires: [] }, ref: rOnly(1000),
    bench: { parts: [bB1, { id: 'R1', x: 620, y: 380, rot: 90 }] },
    wrong: [rOnlyWrong('470 Ω – zu viel Strom', 470), rOnlyWrong('10 kΩ – zu wenig Strom', 10000)],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@resistor', i: [0.0095, 0.0105] }, { noFault: true }] }],
    measure: [{ id: 'i', ask: 'Strom im Kreis', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 }]
  });

  var led = { id: 'D1', type: 'led', props: { color: 'rot' }, x: 500, y: 300, rot: 90 };
  var ledRef = function (r, rev) {
    return { parts: [bat9, led, { id: 'R1', type: 'resistor', value: r, x: 300, y: 200, rot: 0 }],
      wires: rev ? [W('B1.p', 'R1.a'), W('R1.b', 'D1.k'), W('D1.a', 'B1.n')] : [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] };
  };
  var ledWrong = function (name, r, rev) { var l = ledRef(r, rev); l.name = name; return l; };
  defTask({
    id: '1.8', ch: 1, title: 'Die LED überlebt', tags: ['elektro.ohm', 'bauteil.led', 'messen.spannung'],
    story: 'Der Werkstattleiter hat drei LEDs verbraucht. „Die gehen einfach kaputt!“, schimpft er.',
    brief: 'Schliesse die rote LED an die 9-V-Batterie an. Wähle einen <b>Vorwiderstand</b>, sodass 10–20 mA fliessen. Miss danach die Spannung an der LED.',
    learn: 'Eine LED braucht einen Vorwiderstand: R = (U<sub>B</sub> − U<sub>F</sub>) / I.',
    take: 'Ohne Vorwiderstand ist der Strom nur durch die Leitungen begrenzt – die LED brennt durch.',
    hint: 'Rote LED: U<sub>F</sub> ≈ 1,8 V. Am Widerstand bleiben 9 V − 1,8 V = 7,2 V.',
    hint2: 'Für 15 mA: R = 7,2 V / 0,015 A = 480 Ω → nächster Normwert 470 Ω.',
    palette: ['resistor'], need: { resistor: 1 },
    start: { parts: [bat9, led], wires: [] }, ref: ledRef(470),
    bench: { parts: [bB1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'D1', x: 780, y: 460, rot: 0 }] },
    wrong: [ledWrong('zu kleiner Widerstand', 100), ledWrong('zu grosser Widerstand', 10000), ledWrong('LED verpolt', 470, true)],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@led', on: true, i: [0.010, 0.020] }, { noFault: true }] }],
    measure: [{ id: 'uled', ask: 'Spannung an der LED', unit: 'V', mode: 'V', a: 'D1.a', b: 'D1.k', tol: 0.03 }]
  });

  var rMeas = function (closed) {
    return { parts: [bat9, { id: 'S1', type: 'switch', props: { closed: closed }, x: 300, y: 200, rot: 0 }, { id: 'R1', type: 'resistor', value: 1000, x: 500, y: 200, rot: 0 },
      { id: 'H1', type: 'lamp', x: 640, y: 300, rot: 90 }],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'H1.a'), W('H1.b', 'B1.n')] };
  };
  defTask({
    id: '1.9', ch: 1, title: 'Nur spannungsfrei!', tags: ['messen.widerstand', 'messen.sicherheit'],
    story: '„Widerstand messen? Zuerst freischalten!“ – das steht gross über jedem Messplatz.',
    brief: 'Miss den <b>Widerstand von R1</b> mit dem Ohmmeter (Ω). Die Anlage läuft noch – schalte sie zuerst <b>spannungsfrei</b> (Schalter öffnen).',
    learn: 'Widerstand misst man nur im spannungsfreien Zustand.',
    take: 'Das Ohmmeter schickt selbst einen Prüfstrom. Eine fremde Spannung verfälscht das Ergebnis oder beschädigt das Gerät.',
    hint: 'Versuch es ruhig zuerst mit geschlossenem Schalter – das Multimeter meldet einen Fehler.',
    hint2: 'Schalter S1 anklicken (öffnen), dann Ω wählen und die Spitzen an R1.a und R1.b setzen.',
    palette: [], start: rMeas(true), ref: rMeas(false),
    bench: { parts: [bB1, { id: 'S1', x: 460, y: 290, rot: 0 }, { id: 'R1', x: 660, y: 290, rot: 0 }, { id: 'H1', x: 800, y: 470, rot: 0 }] },
    tests: [{ name: 'Anlage spannungsfrei', expect: [{ sel: 'H1', i: [0, 1e-6] }] }],
    measure: [{ id: 'r', ask: 'Widerstand von R1', unit: 'kΩ', mode: 'R', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  defTask({
    id: '1.10', ch: 1, title: 'Die LED bleibt dunkel', tags: ['bauteil.led', 'elektro.fehlersuche'],
    story: 'Ein Kollege hat die Anzeige-LED eingebaut – sie leuchtet nicht. „Kaputt“, sagt er. Die Werkmeisterin sagt: „Prüfen, nicht raten.“',
    brief: 'Finde den Fehler und behebe ihn, sodass die LED mit 10–20 mA leuchtet. Die Bauteile bleiben, nur die <b>Verdrahtung</b> darfst du ändern.',
    learn: 'Eine LED leitet nur in eine Richtung: von der Anode (+) zur Kathode (−).',
    take: 'Erst messen, dann tauschen: Liegt an der LED eine negative Spannung, ist sie verpolt – nicht defekt.',
    hint: 'Miss die Spannung an der LED (rot an D1.a, schwarz an D1.k). Was bedeutet ein negativer Wert?',
    hint2: 'Anode D1.a muss Richtung Pluspol (über R1), Kathode D1.k zum Minuspol.',
    palette: [], start: ledRef(470, true), ref: ledRef(470),
    bench: { parts: [bB1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'D1', x: 780, y: 460, rot: 0 }] },
    wrong: [ledWrong('weiterhin verpolt', 470, true)],
    tests: [{ name: 'Betrieb', expect: [{ sel: 'D1', on: true, i: [0.010, 0.020] }, { noFault: true }] }]
  });
})();

/* BEISPIELKAPITEL – zeigt das Aufgabenformat. Wird ersetzt, sobald die Themenliste vorliegt (docs/THEMEN.md). */
(function () {
  'use strict';

  defChapter({
    id: 1, title: 'Beispiel: Der erste Stromkreis',
    intro: 'Willkommen im Labor. Bevor wir die grossen Anlagen reparieren, baust du deinen ersten Stromkreis – und misst nach, ob die Rechnung stimmt.',
    sequence: ['T1A', '1.1', '1.2', 'T1B', '1.3']
  });

  var bat9 = { id: 'B1', type: 'battery', value: 9, x: 160, y: 300, rot: 0 };

  defTask({
    id: '1.1', ch: 1, title: 'Licht an!', tags: ['elektro.stromkreis', 'elektro.schalter'],
    story: 'Die Notbeleuchtung im Labor ist tot. Nur die Batterie liegt noch auf dem Tisch.',
    brief: 'Baue einen geschlossenen Stromkreis aus Batterie, <b>Schalter</b> und <b>Lampe</b>. Die Lampe soll nur leuchten, wenn der Schalter geschlossen ist.',
    learn: 'Strom fliesst nur in einem geschlossenen Kreis.',
    take: 'Ein Schalter unterbricht den Stromkreis – offen heisst: kein Strom.',
    hint: 'Verbinde + der Batterie mit dem Schalter, den Schalter mit der Lampe und die Lampe zurueck mit –.',
    hint2: 'Reihenfolge: B1.+ → S1 → H1 → B1.–',
    palette: ['switch', 'lamp'],
    need: { switch: 1, lamp: 1 },
    start: { parts: [bat9], wires: [] },
    ref: { parts: [bat9, { id: 'S1', type: 'switch', x: 300, y: 200, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n')] },
    wrong: [
      { name: 'Schalter nicht im Kreis', parts: [bat9, { id: 'S1', type: 'switch', x: 300, y: 120, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
        wires: [W('B1.p', 'H1.a'), W('H1.b', 'B1.n')] }
    ],
    tests: [
      { name: 'Schalter zu', set: { '@switch': { closed: true } }, expect: [{ sel: '@lamp', i: [0.05, 1] }, { noFault: true }] },
      { name: 'Schalter offen', set: { '@switch': { closed: false } }, expect: [{ sel: '@lamp', i: [0, 1e-4] }] }
    ]
  });

  var led = { id: 'D1', type: 'led', props: { color: 'rot' }, x: 500, y: 300, rot: 90 };
  defTask({
    id: '1.2', ch: 1, title: 'Die LED ueberlebt', tags: ['elektro.ohm', 'bauteil.led', 'messen.spannung'],
    story: 'Der Werkstattleiter hat drei LEDs verbraucht. „Die gehen einfach kaputt!“, schimpft er.',
    brief: 'Schliesse die rote LED an die 9-V-Batterie an. Waehle einen <b>Vorwiderstand</b>, sodass 10–20 mA fliessen. Miss danach die Spannung an der LED.',
    learn: 'Eine LED braucht einen Vorwiderstand: R = (U<sub>B</sub> − U<sub>F</sub>) / I.',
    take: 'Ohne Vorwiderstand ist der Strom nur durch die Leitungen begrenzt – die LED brennt durch.',
    hint: 'Rote LED: U<sub>F</sub> ≈ 1,8 V. Am Widerstand bleiben 9 V − 1,8 V = 7,2 V.',
    hint2: 'Fuer 15 mA: R = 7,2 V / 0,015 A = 480 Ω → naechster Normwert 470 Ω.',
    palette: ['resistor'],
    need: { resistor: 1 },
    start: { parts: [bat9, led], wires: [] },
    ref: { parts: [bat9, led, { id: 'R1', type: 'resistor', value: 470, x: 300, y: 200, rot: 0 }],
      wires: [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] },
    wrong: [
      { name: 'zu kleiner Widerstand', parts: [bat9, led, { id: 'R1', type: 'resistor', value: 100, x: 300, y: 200, rot: 0 }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] },
      { name: 'zu grosser Widerstand', parts: [bat9, led, { id: 'R1', type: 'resistor', value: 10000, x: 300, y: 200, rot: 0 }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] },
      { name: 'LED verpolt', parts: [bat9, led, { id: 'R1', type: 'resistor', value: 470, x: 300, y: 200, rot: 0 }], wires: [W('B1.p', 'R1.a'), W('R1.b', 'D1.k'), W('D1.a', 'B1.n')] }
    ],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@led', on: true, i: [0.010, 0.020] }, { noFault: true }] }],
    measure: [{ id: 'uled', ask: 'Spannung an der LED', unit: 'V', mode: 'V', a: 'D1.a', b: 'D1.k', tol: 0.03 }]
  });

  var divider = {
    parts: [{ id: 'B1', type: 'battery', value: 12, x: 160, y: 300, rot: 0 },
      { id: 'R1', type: 'resistor', value: 1000, x: 340, y: 200, rot: 0 },
      { id: 'R2', type: 'resistor', value: 2000, x: 500, y: 300, rot: 90 }],
    wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')]
  };
  defTask({
    id: '1.3', ch: 1, title: 'Messen wie ein Profi', tags: ['messen.strom', 'messen.spannung', 'elektro.reihenschaltung'],
    story: 'Die Pruefprotokolle fehlen. Ohne Messwerte gibt der Werkmeister die Anlage nicht frei.',
    brief: 'Miss mit dem Multimeter den <b>Strom</b> im Kreis und die <b>Spannung an R2</b>. Trage beide Werte ins Protokoll ein.',
    learn: 'Spannung misst man parallel, Strom in Reihe.',
    take: 'Fuer die Strommessung muss der Kreis aufgetrennt und das Messgeraet hineingeschaltet werden.',
    hint: 'Strommessung: Loese eine Leitung und setze die Messspitzen in die Luecke (Bereich A).',
    hint2: 'Oder setze einen Strommesser (Bauteil) in Reihe ein.',
    palette: ['ammeter'],
    start: divider, ref: divider,
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'i', ask: 'Strom im Kreis', unit: 'mA', truth: { sel: 'R1', q: 'i' }, tol: 0.03 },
      { id: 'u2', ask: 'Spannung an R2', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 }
    ]
  });
})();

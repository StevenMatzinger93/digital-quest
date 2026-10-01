/* Kapitel 6 – Grundgatter
 * Quelle: Digitaltechnik stationaere Vorgaenge Kap. 3.3 (nie Ausgang gegen Ausgang, keine offenen Eingaenge), Kap. 4
 * (Symbolik, Trennstufe, NOT, AND, NAND, OR, NOR, EXOR, EXNOR mit Wahrheitstabelle, Ausdruck, Postulaten; Uebung Foerderband). */
(function () {
  'use strict';
  defChapter({
    id: 6, title: 'Grundgatter',
    intro: 'UND, ODER, NICHT – und ihre Verwandten NAND, NOR, XOR, XNOR. Du baust jedes Gatter am Experimentierboard auf, prüfst seine Wahrheitstabelle und lernst, warum man Ausgänge nie zusammenschaltet.',
    sequence: ['T6A', '6.1', '6.2', '6.3', '6.4', '6.5', 'T6B', '6.6', '6.7', '6.8', '6.9', '6.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  function gateTask(o) { // Standardaufgabe: n Eingaenge, Ausgang L1, Loesung per LG.net
    var ref = LG.net(o.n, o.gates, { L1: o.gates[o.gates.length - 1][0] });
    defTask({
      id: o.id, ch: 6, title: o.title, tags: o.tags, story: o.story,
      brief: o.brief + (o.table === false ? '' : LG.table(o.n, o.f)),
      learn: o.learn, take: o.take, hint: o.hint, hint2: o.hint2,
      palette: o.palette, need: o.need || {}, limit: o.limit,
      start: LG.io(o.n), ref: ref, bench: LG.bench(ref),
      wrong: (o.wrong || []).map(function (w) { return named(w[0], LG.net(o.n, w[1], { L1: w[1][w[1].length - 1][0] })); }),
      tests: LG.truth(o.n, o.f)
    });
  }

  defTheory({
    id: 'T6A', ch: 6, title: 'UND, ODER, NICHT', tags: ['digital.gatter', 'digital.und', 'digital.oder', 'digital.nicht'],
    merksatz: 'UND liefert 1 nur bei lauter Einsen, ODER bei mindestens einer 1, NICHT kehrt um; unbenutzte Eingänge festlegen und nie Ausgang gegen Ausgang schalten.',
    visual: { type: 'circuit', toggleView: false, caption: 'Pegelschalter E1 und E2 anklicken: L1 = E1 UND E2, L2 = E1 ODER E2, L3 = NICHT E1. Probiere alle vier Kombinationen.',
      layout: LG.net(2, [['U1', 'and', ['E1', 'E2']], ['U2', 'or', ['E1', 'E2']], ['U3', 'not', ['E1']]], { L1: 'U1', L2: 'U2', L3: 'U3' }) },
    lesson:
      '<p>Ein <b>Gatter</b> verknüpft logische Eingänge (0/1) zu einem Ausgang. Seine Funktion beschreibt die <b>Wahrheitstabelle</b>: jede Eingangskombination mit dem zugehörigen Ausgang.</p>' +
      '<table class="tt"><tr><th>Gatter</th><th>Symbol (DIN)</th><th>Ausdruck</th><th>Ausgang = 1, wenn …</th></tr>' +
      '<tr><td>UND (AND)</td><td>&amp;</td><td>a = e1 ∧ e2 = e1·e2</td><td>alle Eingänge 1</td></tr>' +
      '<tr><td>ODER (OR)</td><td>≥1</td><td>a = e1 ∨ e2 = e1 + e2</td><td>mindestens ein Eingang 1</td></tr>' +
      '<tr><td>NICHT (NOT)</td><td>1 mit Kreis</td><td>a = ē</td><td>der Eingang 0 ist</td></tr></table>' +
      '<p><b>Postulate:</b> 1 ∧ e = e · 0 ∧ e = 0 · e ∧ e = e · e ∧ ē = 0 · 1 ∨ e = 1 · 0 ∨ e = e · e ∨ ē = 1.</p>' +
      '<p><b>Beschaltungsregeln:</b> Keine offenen Eingänge (undefinierter Pegel) – unbenutzte Eingänge fest auf 0 oder 1 legen. Und <b>nie Ausgang gegen Ausgang</b>: Treiben zwei Ausgänge verschiedene Pegel auf dieselbe Leitung, fliesst ein grosser Ausgleichsstrom und die Bausteine gehen kaputt.</p>',
    questions: [
      { q: 'Wann liefert ein UND-Gatter mit zwei Eingängen eine 1?', options: ['Wenn ein Eingang 1 ist', 'Wenn beide Eingänge 1 sind', 'Wenn beide 0 sind', 'Wenn die Eingänge verschieden sind'], correct: 1, explain: 'UND: alle Eingänge müssen 1 sein.' },
      { q: 'Welches Symbol steht im DIN-Kasten des ODER-Gatters?', options: ['&', '≥1', '=1', '1'], correct: 1, explain: '≥1: mindestens ein Eingang muss 1 sein.' },
      { q: 'Was ergibt e ∧ ē?', options: ['e', 'ē', '0', '1'], correct: 2, explain: 'Etwas kann nicht gleichzeitig 1 und 0 sein – das UND ist immer 0.' },
      { q: 'Was ergibt 0 ∨ e?', options: ['0', '1', 'e', 'ē'], correct: 2, explain: 'Eine 0 am ODER ändert nichts – der Ausgang folgt e.' },
      { q: 'Warum darf man zwei Gatter-Ausgänge nicht direkt verbinden?', options: ['Weil dann nichts leuchtet', 'Weil bei verschiedenen Pegeln ein grosser Ausgleichsstrom fliesst', 'Weil das Signal zu schwach wird', 'Das ist erlaubt'], correct: 1, explain: 'Ein Ausgang zieht nach 5 V, der andere nach 0 V – Kurzschluss zwischen den Ausgangsstufen.' }
    ]
  });

  gateTask({ id: '6.1', n: 2, title: 'Das UND-Gatter', tags: ['digital.und', 'digital.gatter'], f: function (b) { return b[0] & b[1]; },
    story: 'Die Stanzmaschine darf nur stanzen, wenn beide Hände auf den Zweihandtastern liegen.',
    brief: 'Baue mit einem <b>UND-Gatter</b> die Zweihandsicherung: L1 soll nur leuchten, wenn E1 <b>und</b> E2 auf 1 stehen. Prüfe alle vier Kombinationen.',
    learn: 'UND: nur wenn alle Eingänge 1 sind, ist der Ausgang 1.', take: 'a = e1 ∧ e2 – die Zweihandsicherung ist ein UND.',
    hint: 'E1.out → U1.in1, E2.out → U1.in2, U1.out → L1.in.', hint2: 'Das UND-Gatter liegt als Chip 74HC08 auf dem Board.',
    palette: ['and'], need: { and: 1 }, gates: [['U1', 'and', ['E1', 'E2']]], wrong: [['ODER statt UND', [['U1', 'or', ['E1', 'E2']]]]] });

  gateTask({ id: '6.2', n: 2, title: 'Das ODER-Gatter', tags: ['digital.oder', 'digital.gatter'], f: function (b) { return b[0] | b[1]; },
    story: 'Die Hupe soll ertönen, wenn die Tür offen ist oder das Fenster.',
    brief: 'Baue mit einem <b>ODER-Gatter</b> die Warnung: L1 leuchtet, sobald E1 <b>oder</b> E2 (oder beide) auf 1 stehen.',
    learn: 'ODER: mindestens ein Eingang 1 → Ausgang 1.', take: 'a = e1 ∨ e2.',
    hint: 'Gleiche Verdrahtung wie beim UND, nur mit dem ODER-Chip (74HC32).', hint2: 'E1 → in1, E2 → in2, out → L1.',
    palette: ['or'], need: { or: 1 }, gates: [['U1', 'or', ['E1', 'E2']]], wrong: [['UND statt ODER', [['U1', 'and', ['E1', 'E2']]]]] });

  gateTask({ id: '6.3', n: 1, title: 'Das NICHT-Gatter', tags: ['digital.nicht', 'digital.gatter'], f: function (b) { return 1 - b[0]; },
    story: 'Die Kontrolllampe „Band steht“ soll leuchten, solange der Motor-Schalter aus ist.',
    brief: 'Baue mit einem <b>NICHT-Gatter</b> (Inverter) die Anzeige: L1 leuchtet, wenn E1 = 0.',
    learn: 'NICHT kehrt um: aus 0 wird 1 und umgekehrt.', take: 'a = ē – der Kreis am Symbol bedeutet Negation.',
    hint: 'E1.out → U1.in, U1.out → L1.in.', hint2: 'Der Inverter-Chip heisst 74HC04.',
    palette: ['not'], need: { not: 1 }, gates: [['U1', 'not', ['E1']]] });

  var inhib = LG.net(2, [['U1', 'not', ['E2']], ['U2', 'and', ['E1', 'U1']]], { L1: 'U2' });
  var fInh = function (b) { return b[0] & (1 - b[1]); };
  defTask({
    id: '6.4', ch: 6, title: 'Wahrheitstabelle aufnehmen', tags: ['digital.wahrheitstabelle', 'digital.gatter'],
    story: 'Eine fremde Schaltung auf dem Board. Was macht sie? Die Werkmeisterin: „Nicht raten – alle Kombinationen durchschalten.“',
    brief: 'Schalte E1 und E2 durch alle vier Kombinationen und notiere den Ausgang L1 (0 oder 1) im Protokoll.',
    learn: 'Die Wahrheitstabelle beschreibt eine Schaltung vollständig.', take: 'Diese Schaltung ist eine Sperre (Inhibition): a = e1 ∧ ē2 – E2 verbietet E1.',
    hint: 'Pegelschalter anklicken, Anzeige ablesen, nächste Kombination.', hint2: 'Nur bei E1 = 1 und E2 = 0 leuchtet L1.',
    palette: [], start: inhib, ref: inhib, bench: LG.bench(inhib),
    tests: [{ name: 'Schaltung', expect: [{ noFault: true }] }],
    measure: [[0, 0], [0, 1], [1, 0], [1, 1]].map(function (c) { return { id: 'a' + c[0] + c[1], ask: 'L1 bei E2 = ' + c[0] + ', E1 = ' + c[1], unit: '', value: fInh([c[1], c[0]]), tol: 0, abs: 0.1 }; })
  });

  var clash = LG.io(2); clash.wires = [W('E1.out', 'L1.in'), W('E2.out', 'L1.in')];
  var orFix = LG.net(2, [['U1', 'or', ['E1', 'E2']]], { L1: 'U1' });
  defTask({
    id: '6.5', ch: 6, title: 'Nie Ausgang gegen Ausgang', tags: ['digital.beschaltung', 'digital.oder', 'elektro.fehlersuche'],
    story: 'Ein Kollege hat zwei Pegelschalter direkt auf die Anzeige gelegt. Bei E1 = 1 und E2 = 0 wird der Baustein heiss.',
    brief: 'Schalte einmal E1 = 1, E2 = 0 und beobachte die Diagnose. Behebe den Fehler: Die Anzeige soll leuchten, wenn E1 <b>oder</b> E2 auf 1 steht – ohne dass je zwei Ausgänge gegeneinander arbeiten.',
    learn: 'Signale verknüpft man mit Gattern, nicht durch Zusammenschalten.', take: 'Direkt verbunden kämpfen zwei Ausgänge gegeneinander: ~100 mA Ausgleichsstrom. Ein ODER-Gatter löst das sauber.',
    hint: 'Lösche die beiden Leitungen zu L1 und setze ein ODER dazwischen.', hint2: 'E1 → U1.in1, E2 → U1.in2, U1.out → L1.',
    palette: ['or'], need: { or: 1 }, start: clash, ref: orFix, bench: LG.bench(orFix),
    wrong: [named('Ausgänge noch verbunden', clash)],
    tests: LG.truth(2, function (b) { return b[0] | b[1]; }).map(function (t) { t.expect.push({ noFault: true }); return t; })
  });

  defTheory({
    id: 'T6B', ch: 6, title: 'NAND, NOR, XOR, XNOR', tags: ['digital.nand', 'digital.nor', 'digital.xor', 'digital.gatter'],
    merksatz: 'NAND und NOR sind die negierten Grundgatter und als Universalgatter Basis für alles; XOR ist 1 bei verschiedenen, XNOR bei gleichen Eingängen (1-Bit-Vergleicher).',
    visual: { type: 'circuit', toggleView: false, caption: 'Dieselben Eingänge an vier Gattern: L1 NAND, L2 NOR, L3 XOR, L4 XNOR. XOR leuchtet nur, wenn E1 und E2 verschieden sind, XNOR nur, wenn sie gleich sind.',
      layout: LG.net(2, [['U1', 'nand', ['E1', 'E2']], ['U2', 'nor', ['E1', 'E2']], ['U3', 'xor', ['E1', 'E2']], ['U4', 'xnor', ['E1', 'E2']]], { L1: 'U1', L2: 'U2', L3: 'U3', L4: 'U4' }) },
    lesson:
      '<p><b>NAND</b> = NICHT-UND: a = ¬(e1 ∧ e2) – nur bei 1/1 ist der Ausgang 0. <b>NOR</b> = NICHT-ODER: a = ¬(e1 ∨ e2) – nur bei 0/0 ist der Ausgang 1. Im Symbol steht der Negationskreis am Ausgang.</p>' +
      '<p><b>XOR</b> (Antivalenz, =1): a = e1·ē2 ∨ ē1·e2 – Ausgang 1, wenn die Eingänge <i>verschieden</i> sind. <b>XNOR</b> (Äquivalenz): Ausgang 1, wenn die Eingänge <i>gleich</i> sind – ein 1-Bit-Vergleicher.</p>' +
      '<p>Postulate XOR: 0 ⊕ e = e · 1 ⊕ e = ē · e ⊕ e = 0 · e ⊕ ē = 1. Mit XOR lässt sich also ein Signal wahlweise durchlassen oder invertieren.</p>' +
      '<p>NAND und NOR heissen <b>Universalgatter</b>: Aus ihnen allein lässt sich jede andere Funktion aufbauen (Kapitel 7).</p>' +
      '<p><b>Positive Logik</b>: High = 1. Bei negativer Logik wäre Low = 1 – ein UND wird dann zum ODER. In diesem Kurs gilt positive Logik.</p>',
    questions: [
      { q: 'Wann ist der Ausgang eines NAND-Gatters 0?', options: ['Wenn ein Eingang 0 ist', 'Nur wenn beide Eingänge 1 sind', 'Wenn beide 0 sind', 'Nie'], correct: 1, explain: 'NAND ist das invertierte UND.' },
      { q: 'Wann ist der Ausgang eines NOR-Gatters 1?', options: ['Nur wenn beide Eingänge 0 sind', 'Wenn ein Eingang 1 ist', 'Wenn beide 1 sind', 'Immer'], correct: 0, explain: 'NOR ist das invertierte ODER.' },
      { q: 'Welches Gatter liefert 1, wenn die beiden Eingänge verschieden sind?', options: ['UND', 'ODER', 'XOR', 'XNOR'], correct: 2, explain: 'XOR = Antivalenz: verschieden → 1.' },
      { q: 'Was ergibt 1 ⊕ e (XOR mit 1)?', options: ['0', '1', 'e', 'ē'], correct: 3, explain: 'XOR mit 1 invertiert das Signal.' },
      { q: 'Warum heissen NAND und NOR Universalgatter?', options: ['Sie sind am billigsten', 'Aus ihnen allein lässt sich jede Logikfunktion bauen', 'Sie haben mehr Eingänge', 'Sie funktionieren mit jeder Spannung'], correct: 1, explain: 'NICHT, UND und ODER lassen sich nur aus NAND (oder nur aus NOR) zusammensetzen.' }
    ]
  });

  gateTask({ id: '6.6', n: 2, title: 'Das NAND-Gatter', tags: ['digital.nand', 'digital.gatter'], f: function (b) { return 1 - (b[0] & b[1]); },
    story: 'Die Störmeldung „Nicht beide Pumpen bereit“ soll leuchten, ausser beide sind bereit.',
    brief: 'Baue die Meldung mit einem <b>NAND-Gatter</b>: L1 leuchtet, ausser E1 und E2 sind beide 1.',
    learn: 'NAND = NICHT-UND.', take: 'a = ¬(e1 ∧ e2): nur 1/1 ergibt 0.',
    hint: 'NAND-Chip 74HC00.', hint2: 'E1 → in1, E2 → in2, out → L1.',
    palette: ['nand'], need: { nand: 1 }, gates: [['U1', 'nand', ['E1', 'E2']]], wrong: [['UND statt NAND', [['U1', 'and', ['E1', 'E2']]]]] });
  gateTask({ id: '6.7', n: 2, title: 'Das NOR-Gatter', tags: ['digital.nor', 'digital.gatter'], f: function (b) { return 1 - (b[0] | b[1]); },
    story: 'Die Anzeige „Alles ruhig“ leuchtet nur, wenn weder Sensor 1 noch Sensor 2 anspricht.',
    brief: 'Baue die Ruhe-Anzeige mit einem <b>NOR-Gatter</b>.',
    learn: 'NOR = NICHT-ODER.', take: 'a = ¬(e1 ∨ e2): nur 0/0 ergibt 1.',
    hint: 'NOR-Chip 74HC02.', hint2: 'E1 → in1, E2 → in2, out → L1.',
    palette: ['nor'], need: { nor: 1 }, gates: [['U1', 'nor', ['E1', 'E2']]], wrong: [['ODER statt NOR', [['U1', 'or', ['E1', 'E2']]]]] });
  gateTask({ id: '6.8', n: 2, title: 'Die Treppenhausschaltung', tags: ['digital.xor', 'digital.gatter'], f: function (b) { return b[0] ^ b[1]; },
    story: 'Unten und oben an der Treppe ein Schalter. Jeder soll das Licht umschalten können – egal, wie der andere steht.',
    brief: 'Baue die Wechselschaltung mit einem <b>XOR-Gatter</b>. Prüfe: Jedes Umlegen eines Schalters wechselt den Zustand von L1.',
    learn: 'XOR: verschiedene Eingänge → 1.', take: 'Jede Änderung eines Eingangs kehrt den XOR-Ausgang um – genau die Wechselschaltung.',
    hint: 'XOR-Chip 74HC86.', hint2: 'E1 → in1, E2 → in2, out → L1.',
    palette: ['xor'], need: { xor: 1 }, gates: [['U1', 'xor', ['E1', 'E2']]], wrong: [['ODER statt XOR', [['U1', 'or', ['E1', 'E2']]]]] });
  gateTask({ id: '6.9', n: 2, title: 'Sind beide gleich?', tags: ['digital.xnor', 'digital.vergleicher'], f: function (b) { return b[0] === b[1] ? 1 : 0; },
    story: 'Zwei Endschalter müssen immer gleich stehen. Stimmt etwas nicht, soll die Gut-Anzeige erlöschen.',
    brief: 'Baue einen <b>1-Bit-Vergleicher</b> mit dem XNOR-Gatter: L1 leuchtet, wenn E1 und E2 gleich sind.',
    learn: 'XNOR (Äquivalenz): gleiche Eingänge → 1.', take: 'Das XNOR ist der einfachste Vergleicher.',
    hint: 'XNOR-Chip 74HC7266.', hint2: 'E1 → in1, E2 → in2, out → L1.',
    palette: ['xnor', 'xor'], need: {}, gates: [['U1', 'xnor', ['E1', 'E2']]], wrong: [['XOR statt XNOR', [['U1', 'xor', ['E1', 'E2']]]]] });
  gateTask({ id: '6.10', n: 3, title: 'Die Alarmanlage', tags: ['digital.gatter', 'digital.entwurf'], f: function (b) { return (b[0] | b[1]) & b[2]; },
    story: 'Die Alarmanlage: Türkontakt (E1) oder Fensterkontakt (E2) lösen aus – aber nur, wenn die Anlage scharf geschaltet ist (E3).',
    brief: 'Baue die Alarmanlage aus Grundgattern: <b>A = (E1 ∨ E2) ∧ E3</b>.',
    learn: 'Mehrere Gatter hintereinander ergeben zusammengesetzte Funktionen.', take: 'Klammern zuerst: erst ODER, dann UND.',
    hint: 'U1 = ODER aus E1 und E2, U2 = UND aus U1 und E3.', hint2: 'U1.out → U2.in1, E3.out → U2.in2, U2.out → L1.',
    palette: ['and', 'or', 'not'], need: {}, gates: [['U1', 'or', ['E1', 'E2']], ['U2', 'and', ['U1', 'E3']]],
    wrong: [['ohne Scharfschaltung', [['U1', 'or', ['E1', 'E2']]]]] });
})();

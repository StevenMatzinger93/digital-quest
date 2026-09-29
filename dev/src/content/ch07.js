/* Kapitel 7 – Boolesche Algebra
 * Quelle: Digitaltechnik stationaere Vorgaenge Kap. 5 (Kommutativ-, Assoziativ-, Distributivgesetze, De Morgan, Uebungsserie,
 * normierte Schaltungen), Zusammenfassung Gesetze der Booleschen Algebra (inkl. Bindungsregel, Absorption). */
(function () {
  'use strict';
  defChapter({
    id: 7, title: 'Boolesche Algebra',
    intro: 'Rechnen mit 0 und 1: Mit den Gesetzen der Booleschen Algebra machst du Schaltungen kleiner – und baust aus einem einzigen Gattertyp jede beliebige Funktion.',
    sequence: ['T7A', '7.1', '7.2', '7.3', '7.4', '7.5', 'T7B', '7.6', '7.7', '7.8', '7.9', '7.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  function algTask(o) {
    var ref = LG.net(o.n, o.gates, { L1: o.gates.length ? o.gates[o.gates.length - 1][0] : o.src });
    defTask({
      id: o.id, ch: 7, title: o.title, tags: o.tags, story: o.story,
      brief: o.brief + (o.limit ? '<p class="limit">Erlaubt: hoechstens <b>' + o.limit.gates + '</b> Gatter' + (o.only ? ' – nur ' + o.only : '') + '.</p>' : '') + LG.table(o.n, o.f),
      learn: o.learn, take: o.take, hint: o.hint, hint2: o.hint2,
      palette: o.palette, need: o.need || {}, limit: o.limit,
      start: LG.io(o.n), ref: ref, bench: LG.bench(ref),
      wrong: (o.wrong || []).map(function (w) { return named(w[0], LG.net(o.n, w[1], { L1: w[1].length ? w[1][w[1].length - 1][0] : w[2] })); }),
      tests: LG.truth(o.n, o.f)
    });
  }

  defTheory({
    id: 'T7A', ch: 7, title: 'Gesetze der Booleschen Algebra', tags: ['digital.boolesche_algebra'],
    visual: { type: 'circuit', toggleView: false, caption: 'Absorptionsgesetz live bewiesen: L1 = E1 ∧ (E1 ∨ E2) mit zwei Gattern, L2 = E1 ganz ohne Gatter. Bei jeder Eingangskombination leuchten beide gleich.',
      layout: LG.net(2, [['U1', 'or', ['E1', 'E2']], ['U2', 'and', ['E1', 'U1']]], { L1: 'U2', L2: 'E1' }) },
    lesson:
      '<p>Mit 0 und 1 laesst sich rechnen wie mit Zahlen – nach eigenen Gesetzen. <b>Bindungsregel:</b> UND bindet staerker als ODER (wie · vor +).</p>' +
      '<table class="tt"><tr><th>Gesetz</th><th>ODER</th><th>UND</th></tr>' +
      '<tr><td>Kommutativ (vertauschen)</td><td>e1 ∨ e2 = e2 ∨ e1</td><td>e1·e2 = e2·e1</td></tr>' +
      '<tr><td>Assoziativ (verbinden)</td><td>(e1 ∨ e2) ∨ e3 = e1 ∨ (e2 ∨ e3)</td><td>(e1·e2)·e3 = e1·(e2·e3)</td></tr>' +
      '<tr><td>Distributiv (ausklammern)</td><td>e1 ∨ e2·e3 = (e1 ∨ e2)(e1 ∨ e3)</td><td>e1(e2 ∨ e3) = e1·e2 ∨ e1·e3</td></tr></table>' +
      '<p>Dazu die <b>Postulate</b> aus Kapitel 6 (e ∨ ē = 1, e·ē = 0, e ∨ 1 = 1, e·0 = 0 …) und die <b>Absorption</b>: e1 ∨ e1·e2 = e1 · e1(e1 ∨ e2) = e1 · e1 ∨ ē1·e2 = e1 ∨ e2.</p>' +
      '<p><b>Vereinfachen</b> heisst: dieselbe Wahrheitstabelle mit weniger Gattern. Beispiel: e1·e2 ∨ e1·ē2 = e1·(e2 ∨ ē2) = e1·1 = e1 – kein einziges Gatter noetig.</p>' +
      '<p>Assoziativ bedeutet praktisch: Ein UND mit drei Eingaengen baust du aus zwei UND mit je zwei Eingaengen.</p>',
    questions: [
      { q: 'Was ist nach der Bindungsregel mit e1 ∨ e2·e3 gemeint?', options: ['(e1 ∨ e2)·e3', 'e1 ∨ (e2·e3)', 'e1·e2 ∨ e3', 'Das ist nicht eindeutig'], correct: 1, explain: 'UND bindet staerker – zuerst e2·e3, dann ODER.' },
      { q: 'Vereinfache e1·e2 ∨ e1·e3.', options: ['e1 ∨ e2·e3', 'e1·(e2 ∨ e3)', 'e2·e3', 'e1'], correct: 1, explain: 'e1 ausklammern (Distributivgesetz).' },
      { q: 'Was ergibt e1 ∨ e1·e2 (Absorption)?', options: ['e1', 'e2', 'e1·e2', '1'], correct: 0, explain: 'Ist e1 = 1, ist alles 1; ist e1 = 0, ist auch e1·e2 = 0 – also bleibt e1.' },
      { q: 'Vereinfache e1·e2 ∨ e1·ē2.', options: ['e2', 'e1', '1', 'e1·e2'], correct: 1, explain: 'e1·(e2 ∨ ē2) = e1·1 = e1.' },
      { q: 'Wie viele UND-Gatter mit zwei Eingaengen brauchst du fuer e1·e2·e3·e4?', options: ['1', '2', '3', '4'], correct: 2, explain: 'Assoziativ: ((e1·e2)·e3)·e4 – drei Gatter.' }
    ]
  });

  algTask({ id: '7.1', n: 3, title: 'Drei Bedingungen', tags: ['digital.boolesche_algebra', 'digital.und'], f: function (b) { return b[0] & b[1] & b[2]; },
    story: 'Die Presse startet nur, wenn Schutztuer zu (E1), Werkstueck eingelegt (E2) und Start gedrueckt (E3).',
    brief: 'Baue <b>A = E1 · E2 · E3</b>. Es gibt nur UND-Gatter mit zwei Eingaengen.',
    learn: 'Assoziativgesetz: (e1·e2)·e3 = e1·(e2·e3).', take: 'Zwei Zweier-UND ergeben ein Dreier-UND – egal, welche beiden zuerst.',
    hint: 'Erst E1 und E2 verunden, das Ergebnis mit E3.', hint2: 'U1 = E1·E2, U2 = U1·E3.',
    palette: ['and'], limit: { gates: 2 }, gates: [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['U1', 'E3']]], wrong: [['E3 vergessen', [['U1', 'and', ['E1', 'E2']]]]] });

  algTask({ id: '7.2', n: 3, title: 'Ausklammern spart Gatter', tags: ['digital.boolesche_algebra', 'digital.vereinfachen'], f: function (b) { return (b[0] & b[1]) | (b[0] & b[2]); },
    story: 'Der Entwurf aus dem Buero: A = E1·E2 ∨ E1·E3 – drei Gatter. Der Einkauf fragt, ob es billiger geht.',
    brief: 'Baue <b>A = E1·E2 ∨ E1·E3</b> mit nur zwei Gattern.', limit: { gates: 2 },
    learn: 'Distributivgesetz: e1·e2 ∨ e1·e3 = e1·(e2 ∨ e3).', take: 'Ausklammern spart ein Gatter – gleiche Wahrheitstabelle, weniger Bauteile.',
    hint: 'Was haben beide Terme gemeinsam?', hint2: 'U1 = E2 ∨ E3, U2 = E1 · U1.',
    palette: ['and', 'or'], gates: [['U1', 'or', ['E2', 'E3']], ['U2', 'and', ['E1', 'U1']]] });

  algTask({ id: '7.3', n: 2, title: 'De Morgan I', tags: ['digital.demorgan', 'digital.boolesche_algebra'], f: function (b) { return 1 - (b[0] & b[1]); },
    story: 'Kein NAND-Chip mehr im Lager. Es gibt nur ODER- und NICHT-Gatter.',
    brief: 'Baue <b>A = ¬(E1 · E2)</b> nur mit <b>ODER und NICHT</b>.', limit: { gates: 3 }, only: 'ODER und NICHT',
    learn: 'De Morgan: ¬(e1·e2) = ē1 ∨ ē2.', take: 'Negation ueber den ganzen Term: UND wird zu ODER, jede Variable wird negiert.',
    hint: 'Beide Eingaenge einzeln invertieren, dann verodern.', hint2: 'U1 = ¬E1, U2 = ¬E2, U3 = U1 ∨ U2.',
    palette: ['or', 'not'], gates: [['U1', 'not', ['E1']], ['U2', 'not', ['E2']], ['U3', 'or', ['U1', 'U2']]],
    wrong: [['nur ein Eingang invertiert', [['U1', 'not', ['E1']], ['U3', 'or', ['U1', 'E2']]]]] });

  algTask({ id: '7.4', n: 2, title: 'De Morgan II', tags: ['digital.demorgan', 'digital.boolesche_algebra'], f: function (b) { return 1 - (b[0] | b[1]); },
    story: 'Jetzt fehlt der NOR-Chip. Im Lager: UND und NICHT.',
    brief: 'Baue <b>A = ¬(E1 ∨ E2)</b> nur mit <b>UND und NICHT</b>.', limit: { gates: 3 }, only: 'UND und NICHT',
    learn: 'De Morgan: ¬(e1 ∨ e2) = ē1 · ē2.', take: 'Auch umgekehrt: ODER wird zu UND, jede Variable wird negiert.',
    hint: 'Beide Eingaenge invertieren, dann verunden.', hint2: 'U1 = ¬E1, U2 = ¬E2, U3 = U1 · U2.',
    palette: ['and', 'not'], gates: [['U1', 'not', ['E1']], ['U2', 'not', ['E2']], ['U3', 'and', ['U1', 'U2']]] });

  algTask({ id: '7.5', n: 2, title: 'Die Nullgatter-Loesung', tags: ['digital.vereinfachen', 'digital.boolesche_algebra'], f: function (b) { return b[0]; },
    story: 'Im alten Schaltplan steht A = E1·E2 ∨ E1·Ē2. Der Chef fragt: „Wie viele Gatter brauchen wir dafuer?“',
    brief: 'Vereinfache <b>A = E1·E2 ∨ E1·Ē2</b> so weit wie moeglich und baue das Ergebnis auf.', limit: { gates: 0 },
    learn: 'e2 ∨ ē2 = 1 – eine Variable, die in beiden Zustaenden vorkommt, faellt weg.', take: 'Manchmal braucht es gar kein Gatter: A = E1.',
    hint: 'Klammere E1 aus. Was ergibt E2 ∨ Ē2?', hint2: 'A = E1 – eine Leitung von E1 zu L1 genuegt.',
    palette: ['and', 'or', 'not'], gates: [], src: 'E1', wrong: [['E2 durchgeschaltet', [], 'E2']] });

  defTheory({
    id: 'T7B', ch: 7, title: 'De Morgan und normierte Schaltungen', tags: ['digital.demorgan', 'digital.nand', 'digital.nor'],
    visual: { type: 'circuit', toggleView: false, caption: 'De Morgan: L1 = ¬(E1 ∧ E2) mit einem NAND, L2 = ¬E1 ∨ ¬E2 aus zwei Invertern und einem ODER. Gleiche Wahrheitstabelle – probiere alle Kombinationen.',
      layout: LG.net(2, [['U1', 'nand', ['E1', 'E2']], ['U2', 'not', ['E1']], ['U3', 'not', ['E2']], ['U4', 'or', ['U2', 'U3']]], { L1: 'U1', L2: 'U4' }) },
    lesson:
      '<p><b>De Morgan:</b> Eine Negation ueber einem ganzen Term wird aufgeteilt, indem man UND und ODER vertauscht und jede Variable negiert:</p>' +
      '<div class="formula">¬(e1·e2) = ē1 ∨ ē2 &nbsp;&nbsp; ¬(e1 ∨ e2) = ē1·ē2</div>' +
      '<p><b>Normierte Schaltungen</b> bestehen aus nur einem Gattertyp – praktisch, weil man dann nur einen Chip lagern muss.</p>' +
      '<ul><li><b>NICHT aus NAND:</b> beide Eingaenge verbinden: ¬(e·e) = ē.</li>' +
      '<li><b>UND aus NAND:</b> NAND und dahinter ein NAND als Inverter.</li>' +
      '<li><b>ODER aus NAND:</b> beide Eingaenge invertieren (NAND als Inverter), dann NAND: ¬(ē1·ē2) = e1 ∨ e2.</li>' +
      '<li><b>ODER aus NOR:</b> NOR und dahinter ein NOR als Inverter.</li></ul>' +
      '<p>Ein <b>XOR aus vier NAND</b>: N1 = ¬(e1·e2), dann N2 = ¬(e1·N1), N3 = ¬(e2·N1), a = ¬(N2·N3).</p>',
    questions: [
      { q: 'Was ist ¬(e1 ∨ e2) nach De Morgan?', options: ['ē1 ∨ ē2', 'ē1 · ē2', 'e1 · e2', '¬e1 ∨ e2'], correct: 1, explain: 'ODER wird zu UND, jede Variable negiert.' },
      { q: 'Wie wird ein NAND zum Inverter?', options: ['Einen Eingang auf 0 legen', 'Beide Eingaenge verbinden', 'Den Ausgang auf 1 legen', 'Geht nicht'], correct: 1, explain: '¬(e·e) = ē.' },
      { q: 'Wie viele NAND braucht ein ODER?', options: ['1', '2', '3', '4'], correct: 2, explain: 'Zwei als Inverter fuer die Eingaenge, eines fuer die Verknuepfung.' },
      { q: 'Wie viele NAND braucht ein UND?', options: ['1', '2', '3', '4'], correct: 1, explain: 'NAND plus NAND als Inverter.' },
      { q: 'Warum baut man Schaltungen nur aus NAND?', options: ['NAND ist schneller als alle anderen', 'Ein einziger Chiptyp genuegt fuer jede Funktion', 'NAND braucht keine Versorgung', 'Weil UND verboten ist'], correct: 1, explain: 'NAND ist ein Universalgatter – weniger Lagerhaltung, einheitliche Technik.' }
    ]
  });

  var nandOnly = { limit: { gates: 1 } };
  algTask({ id: '7.6', n: 1, title: 'NICHT aus NAND', tags: ['digital.nand', 'digital.normiert'], f: function (b) { return 1 - b[0]; },
    story: 'Auf der Platine ist noch ein NAND frei. Gebraucht wird ein Inverter.',
    brief: 'Baue einen <b>Inverter nur aus einem NAND</b>.', limit: nandOnly.limit, only: 'NAND',
    learn: '¬(e·e) = ē.', take: 'Beide Eingaenge an dasselbe Signal – das NAND invertiert.',
    hint: 'Verbinde E1 mit beiden Eingaengen.', hint2: 'E1 → U1.in1 und E1 → U1.in2.',
    palette: ['nand'], gates: [['U1', 'nand', ['E1', 'E1']]] });
  algTask({ id: '7.7', n: 2, title: 'UND aus NAND', tags: ['digital.nand', 'digital.normiert'], f: function (b) { return b[0] & b[1]; },
    story: 'Nur NAND im Lager – gebraucht wird ein UND.',
    brief: 'Baue <b>A = E1 · E2</b> nur aus NAND-Gattern.', limit: { gates: 2 }, only: 'NAND',
    learn: 'UND = NAND + Inverter.', take: 'Das zweite NAND hebt die Negation des ersten wieder auf.',
    hint: 'Ein NAND verknuepft, ein zweites invertiert.', hint2: 'U1 = NAND(E1, E2), U2 = NAND(U1, U1).',
    palette: ['nand'], gates: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['U1', 'U1']]], wrong: [['nur ein NAND', [['U1', 'nand', ['E1', 'E2']]]]] });
  algTask({ id: '7.8', n: 2, title: 'ODER aus NAND', tags: ['digital.nand', 'digital.normiert', 'digital.demorgan'], f: function (b) { return b[0] | b[1]; },
    story: 'Die naechste Bestellung: ein ODER. Wieder nur NAND.',
    brief: 'Baue <b>A = E1 ∨ E2</b> nur aus NAND-Gattern.', limit: { gates: 3 }, only: 'NAND',
    learn: 'De Morgan: e1 ∨ e2 = ¬(ē1 · ē2).', take: 'Eingaenge invertieren und NAND – das ist ein ODER.',
    hint: 'Zwei NAND als Inverter fuer E1 und E2, dann ein NAND.', hint2: 'U1 = NAND(E1,E1), U2 = NAND(E2,E2), U3 = NAND(U1,U2).',
    palette: ['nand'], gates: [['U1', 'nand', ['E1', 'E1']], ['U2', 'nand', ['E2', 'E2']], ['U3', 'nand', ['U1', 'U2']]] });
  algTask({ id: '7.9', n: 2, title: 'XOR aus vier NAND', tags: ['digital.nand', 'digital.normiert', 'digital.xor'], f: function (b) { return b[0] ^ b[1]; },
    story: 'Die Profiaufgabe der Werkmeisterin: „Ein XOR. Nur NAND. Hoechstens vier.“',
    brief: 'Baue <b>A = E1 ⊕ E2</b> aus hoechstens vier NAND-Gattern.', limit: { gates: 4 }, only: 'NAND',
    learn: 'Das klassische XOR aus vier NAND.', take: 'N1 = ¬(e1·e2); dann ¬(e1·N1) und ¬(e2·N1); zum Schluss NAND beider.',
    hint: 'Das erste NAND verknuepft E1 und E2; sein Ausgang geht in zwei weitere NAND.', hint2: 'U1 = NAND(E1,E2), U2 = NAND(E1,U1), U3 = NAND(E2,U1), U4 = NAND(U2,U3).',
    palette: ['nand'], gates: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['E1', 'U1']], ['U3', 'nand', ['E2', 'U1']], ['U4', 'nand', ['U2', 'U3']]] });
  algTask({ id: '7.10', n: 2, title: 'ODER aus NOR', tags: ['digital.nor', 'digital.normiert'], f: function (b) { return b[0] | b[1]; },
    story: 'Ein anderes Lager, ein anderer Chip: nur NOR.',
    brief: 'Baue <b>A = E1 ∨ E2</b> nur aus NOR-Gattern.', limit: { gates: 2 }, only: 'NOR',
    learn: 'ODER = NOR + Inverter.', take: 'Ein NOR mit verbundenen Eingaengen ist ein Inverter.',
    hint: 'NOR verknuepft, zweites NOR invertiert.', hint2: 'U1 = NOR(E1,E2), U2 = NOR(U1,U1).',
    palette: ['nor'], gates: [['U1', 'nor', ['E1', 'E2']], ['U2', 'nor', ['U1', 'U1']]], wrong: [['nur ein NOR', [['U1', 'nor', ['E1', 'E2']]]]] });
})();

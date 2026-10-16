/* Lernpfad Station A9 – Normierte Schaltungen: nur NAND, und mit festen ICs (74HC00 = vier NAND, 74HC02 = vier NOR, 74HC08 = vier UND). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var N = function (id, type, ins) { return [id, type, ins]; };
  var IC = '74HC00 = vier NAND mit zwei Eingängen, 74HC02 = vier NOR, 74HC08 = vier UND';
  var xorNand = P.netz({ n: 2, gatter: [N('U1', 'nand', ['E1', 'E2']), N('U2', 'nand', ['E1', 'U1']), N('U3', 'nand', ['E2', 'U1']), N('U4', 'nand', ['U2', 'U3'])], aus: { L1: 'U4' } });
  P.station({
    id: 'A9', teil: 'A', nr: 9, titel: 'Normierte Schaltungen', kurz: 'Nur NAND – und mit den Gattern aus festen ICs',
    einfuehrung: '<p>In der Praxis kauft man keine einzelnen Gatter, sondern <b>ICs</b> mit mehreren gleichen Gattern: Ein <b>74HC00</b> enthält vier NAND mit je zwei Eingängen, ein <b>74HC02</b> vier NOR, ein <b>74HC08</b> vier UND. Je weniger verschiedene ICs, desto billiger die Platine.</p><p>Das <b>NAND</b> ist ein <b>Universalgatter</b>: Mit NAND allein lässt sich jede Schaltung bauen (ebenso mit NOR allein). Du baust die Grundgatter aus NAND nach und löst dann Aufgaben mit einer festen Zahl von Gattern.</p><p>Wichtig: Bei einem IC darf man die Gatter nicht beliebig vermehren – was im IC fehlt, fehlt.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A9.1', titel: 'NICHT nur aus NAND', art: 'nand', n: 1, ausgaenge: 1, f: function (e) { return 1 - e[0]; }, start: P.startNetz(1, 1), min: { nand: 1 },
        muster: P.netz({ n: 1, gatter: [N('U1', 'nand', ['E1', 'E1'])], aus: { L1: 'U1' } }), text: '<p>Baue ein <b>NICHT</b> (L1 = /e1) nur mit NAND-Gattern.</p>', hilfe: 'Was passiert, wenn du beide Eingänge eines NAND mit demselben Signal verbindest?' },
      { id: 'A9.2', titel: 'UND nur aus NAND', art: 'nand', n: 2, ausgaenge: 1, f: function (e) { return e[0] & e[1]; }, start: P.startNetz(2, 1), min: { nand: 2 },
        muster: P.netz({ n: 2, gatter: [N('U1', 'nand', ['E1', 'E2']), N('U2', 'nand', ['U1', 'U1'])], aus: { L1: 'U2' } }), text: '<p>Baue ein <b>UND</b> nur mit NAND-Gattern.</p>', hilfe: 'NAND ist ein UND mit nachgeschaltetem NICHT. Wie hebst du das NICHT wieder auf?' },
      { id: 'A9.3', titel: 'ODER nur aus NAND', art: 'nand', n: 2, ausgaenge: 1, f: function (e) { return e[0] | e[1]; }, start: P.startNetz(2, 1), min: { nand: 3 },
        muster: P.netz({ n: 2, gatter: [N('U1', 'nand', ['E1', 'E1']), N('U2', 'nand', ['E2', 'E2']), N('U3', 'nand', ['U1', 'U2'])], aus: { L1: 'U3' } }), text: '<p>Baue ein <b>ODER</b> nur mit NAND-Gattern.</p>', hilfe: 'De Morgan: e1 v e2 = /( /e1 /e2 ). Das ist ein NAND von zwei invertierten Eingängen.' },
      { id: 'A9.4', titel: 'Ausdruck nur mit NAND', art: 'nand', n: 3, ausgaenge: 1, f: function (e) { return (e[0] & e[1]) | (1 - e[2]); }, start: P.startNetz(3, 1), min: { nand: 2 },
        muster: P.netz({ n: 3, gatter: [N('U1', 'nand', ['E1', 'E2']), N('U2', 'nand', ['U1', 'E3'])], aus: { L1: 'U2' } }), text: '<p>Baue <b>A = e1e2 v /e3</b> nur mit NAND. Du brauchst weniger Gatter, als du denkst.</p>', hilfe: 'Schreibe A mit zwei Überstreichungen und wende De Morgan auf die untere an: A = /( /(e1e2) · e3 ).' },
      { id: 'A9.5', titel: 'XOR mit einem 74HC00', art: 'ics', n: 2, ausgaenge: 1, f: function (e) { return e[0] ^ e[1]; }, nur: ['nand'], limit: { nand: 4 }, maxEingaenge: 2, limitText: 'ein 74HC00 hat vier NAND mit zwei Eingängen', start: P.startNetz(2, 1), muster: xorNand,
        text: '<p>Baue ein <b>XOR</b> aus höchstens <b>vier NAND</b> mit je zwei Eingängen – das ist genau ein 74HC00. (' + IC + ')</p>', hilfe: 'Das erste NAND bekommt e1 und e2. Sein Ausgang geht zusätzlich an zwei weitere NAND, die je einen Eingang dazunehmen. Ein viertes NAND führt beide zusammen.' },
      { id: 'A9.6', titel: 'XOR mit 74HC02 und 74HC08', art: 'ics', n: 2, ausgaenge: 1, f: function (e) { return e[0] ^ e[1]; }, nur: ['nor', 'and'], limit: { nor: 4, and: 4 }, maxEingaenge: 2, limitText: 'je ein 74HC02 (vier NOR) und ein 74HC08 (vier UND), alle mit zwei Eingängen', start: P.startNetz(2, 1),
        muster: P.netz({ n: 2, gatter: [N('U1', 'nor', ['E1', 'E2']), N('U2', 'and', ['E1', 'E2']), N('U3', 'nor', ['U1', 'U2'])], aus: { L1: 'U3' } }),
        text: '<p>Baue ein <b>XOR</b> mit <b>je einem 74HC02 und einem 74HC08</b>: höchstens vier NOR und vier UND, jeweils mit zwei Eingängen. Andere Gatter sind nicht erlaubt. (' + IC + ')</p>', hilfe: 'XOR = (e1 v e2) und nicht (e1 e2). Das ODER ohne Negation gibt es hier nicht – aber NOR und UND. Wie kommst du mit NOR(e1,e2) und UND(e1,e2) auf XOR?' },
      { id: 'A9.7', titel: 'Prüffragen Universalgatter', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Wie viele NAND braucht man mindestens für ein ODER?', opt: ['1', '2', '3', '4'], richtig: 2, erkl: 'Zwei NAND als Inverter für die Eingänge, ein drittes als Verknüpfung.' },
        { q: 'Welche Gatter sind Universalgatter (jede Funktion lässt sich nur damit bauen)?', opt: ['UND und ODER', 'NAND und NOR', 'XOR und XNOR', 'NICHT'], richtig: 1, erkl: 'Mit NAND allein oder NOR allein lässt sich NICHT, UND und ODER bilden, damit alles.' },
        { q: 'Wie viele NAND-Gatter enthält ein 74HC00?', opt: ['2', '4', '6', '8'], richtig: 1, erkl: 'Vier NAND mit je zwei Eingängen im 14-poligen Gehäuse.' },
        { q: 'Ein NAND mit zusammengeschalteten Eingängen verhält sich wie ein …', opt: ['UND', 'ODER', 'NICHT', 'XOR'], richtig: 2, erkl: '/(e1 e1) = /e1.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

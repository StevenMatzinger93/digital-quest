/* Lernpfad Station A9 – Normierte Schaltungen: Stevens Originalaufgaben (docs/aufgaben/A9_ORIGINAL.md). Keine eigenen Beispiele mehr.
 * Aufgabe 1: A = e1·e2·(e3 + e4)·e5 nur mit NAND (das Lehrmittel erlaubt dazu ein NAND mit drei Eingängen, SN7410). Aufgabe 2: A1 = NICHT(A + C)·B mit je einem 74HC02 und 74HC08
 * (höchstens vier NOR und vier UND, jeweils mit zwei Eingängen). Aufgabe 2 hat im Lehrmittel nur diesen einen Ausdruck belegt (FRAGEN_STUDIO.md). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var N = function (id, type, ins, props) { return [id, type, ins, props]; };
  var f1 = function (e) { return e[0] & e[1] & (e[2] | e[3]) & e[4]; };
  var f2 = function (e) { return (1 - (e[0] | e[2])) & e[1]; };          // A = E1, B = E2, C = E3
  // Muster 1: UND(e1, e2) = NAND(NAND(e1,e2)) doppelt negiert; ODER(e3, e4) = NAND(NICHT e3, NICHT e4); A = NICHT(NAND3(UND12, ODER34, e5))
  var m1 = P.netz({ n: 5, gatter: [N('U1', 'nand', ['E1', 'E2']), N('U2', 'nand', ['U1', 'U1']), N('U3', 'nand', ['E3', 'E3']), N('U4', 'nand', ['E4', 'E4']), N('U5', 'nand', ['U3', 'U4']),
    N('U6', 'nand', ['U2', 'U5', 'E5'], { inputs: 3 }), N('U7', 'nand', ['U6', 'U6'])], aus: { L1: 'U7' } });
  // Muster 2: A1 = NOR(A, C) · B
  var m2 = P.netz({ n: 3, gatter: [N('U1', 'nor', ['E1', 'E3']), N('U2', 'and', ['U1', 'E2'])], aus: { L1: 'U2' } });
  P.station({
    id: 'A9', teil: 'A', nr: 9, titel: 'Normierte Schaltungen', kurz: 'Nur NAND – und mit den Gattern aus festen ICs (Stevens Originalaufgaben)',
    einfuehrung: '<p>Oftmals werden in der Praxis nicht alle Eingänge eines fertigen ICs benützt. Dann werden Teile der booleschen Ausdrücke so verändert, dass die bereits benützten ICs verwendet werden können. Dies wird aus Kosten- sowie Platzgründen angewendet.</p><p>Ein <b>74HC00</b> enthält vier NAND mit je zwei Eingängen, ein <b>74HC02</b> vier NOR, ein <b>74HC08</b> vier UND. Das <b>NAND</b> ist ein <b>Universalgatter</b>: Mit NAND allein lässt sich jede Schaltung bauen. Bei einem IC darf man die Gatter nicht beliebig vermehren – was im IC fehlt, fehlt.</p>',
    verweis: 'Aufgaben aus Stevens Lehrmittel «Digitaltechnik stationäre Vorgänge». Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A9.1', titel: 'Aufgabe 1: Nur NAND', art: 'nand', n: 5, ausgaenge: 1, f: f1, nur: ['nand'], maxEingaenge: 3, start: P.startNetz(5, 1), muster: m1,
        text: '<p>Du hast nur <b>NAND</b> ICs zur Verfügung. Wandle die folgende Schaltung um:</p><p class="pf-gegeben">A = e1 · e2 · (e3 + e4) · e5</p><p>Die Schaltung besteht aus einem UND für e1 und e2, einem ODER für e3 und e4, einem zweiten UND für deren Ausgänge und einem dritten UND mit e5. <b>Erlaubt sind nur NAND-Gatter. Wie im Lehrmittel darfst du auch ein NAND mit drei Eingängen verwenden</b> (SN7410, Eigenschaftenfeld: Eingänge = 3); alle anderen Gatter haben zwei Eingänge. Andere Gattertypen sind nicht erlaubt.</p><p>E1 bis E5 sind e1 bis e5, die Anzeige L1 ist A.</p>', hilfe: 'UND und ODER lassen sich aus NAND bauen (De Morgan): ein UND ist ein NAND mit nachgeschaltetem NAND, dessen Eingänge verbunden sind; e3 + e4 = NAND(/e3, /e4).' },
      { id: 'A9.2', titel: 'Aufgabe 2: Mit gegebenen ICs (74HC02 und 74HC08)', art: 'ics', n: 3, ausgaenge: 1, f: f2, nur: ['nor', 'and'], limit: { nor: 4, and: 4 }, maxEingaenge: 2, limitText: 'je ein 74HC02 = vier NOR und ein 74HC08 = vier UND, alle mit zwei Eingängen', start: P.startNetz(3, 1), muster: m2,
        text: '<p>Zur Verfügung stehen je ein IC <b>74HC02</b> und ein <b>74HC08</b>. Folgender Ausdruck muss dabei erfüllt sein:</p><p class="pf-gegeben">A1 = NICHT(A + C) · B</p><p>Der 74HC02 enthält vier NOR mit je zwei Eingängen, der 74HC08 vier UND mit je zwei Eingängen: Du darfst also <b>höchstens vier NOR und vier UND</b> verwenden, andere Gattertypen nicht. E1 = A, E2 = B, E3 = C, die Anzeige L1 ist A1.</p>', hilfe: 'NICHT(A + C) ist genau ein NOR.' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Lernpfad Station B1 – NOR-Flipflop. Eingänge e1 und e2; welcher setzt, steht in P.KONV.norSetzen (konventionen.js, FRAGEN_STUDIO.md Punkt 6).
 * Tabellen aus der Folgefunktion des RS-Flipflops (P.FF.rs); die Schaltung aus zwei NOR wird von der Prüfmaschine über das Verhalten geprüft. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  // Konvention aus dem Lehrmittel (docs/aufgaben/B1_NOR_FLIPFLOP.md, belegt): e2 setzt, e1 setzt zurück; bei e1 = e2 = 1 gewinnt e1, der Ausgang wird 0.
  // Welcher Eingang setzt, steht in P.KONV.norSetzen (konventionen.js); Rücksetzen hat bei beiden Eingängen = 1 Vorrang.
  var SZ = P.KONV.norSetzen === 'e2' ? 1 : 0, sN = SZ ? 'e2' : 'e1', rN = SZ ? 'e1' : 'e2', SI = sN.toUpperCase(), RI = rN.toUpperCase();
  var nextNor = function (q, e) { var s = e[SZ], r = e[1 - SZ]; return r ? 0 : s ? 1 : q; };       // e = [e1, e2]; Rücksetzen gewinnt
  var nextSR = function (q, e) { return e[0] && e[1] ? 'X' : (e[0] ? 1 : e[1] ? 0 : q); };       // e = [Setzen, Rücksetzen]; die gemeinsame 1 wird in der Ansteuertabelle nicht benutzt
  var ENN = [sN, rN];                                                                            // Spaltenreihenfolge wie im Lehrmittel: Setzeingang (e2) vor Rücksetzeingang (e1)
  var X = ['X', 'x', '-'];
  // Wahrheitstabelle: e2 | e1 | AV | A (AV steht in der Mitte)
  var wt = { kopf: ENN.concat(['AV', 'A']), zeilen: [] };
  for (var k = 0; k < 8; k++) { var e = [k >> 2 & 1, k >> 1 & 1], av = k & 1; wt.zeilen.push([String(e[0]), String(e[1]), String(av), { a: String(e[1] ? 0 : e[0] ? 1 : av), typ: 'bit' }]); }
  // Analysetabelle: e2 | e1 | A (A ist 0, 1 oder AV)
  var OPT = ['0', '1', 'AV'];
  var an = { kopf: ENN.concat(['A']), zeilen: [[0, 0], [0, 1], [1, 0], [1, 1]].map(function (e) { return [String(e[0]), String(e[1]), { a: e[1] ? '0' : e[0] ? '1' : 'AV', typ: 'wahl', opt: OPT }]; }) };
  // Ansteuertabelle: AV | A | e2 | e1; X wo beide Werte erlaubt sind. Die Werte der Zeilen stehen nicht im Lehrmittel-Auszug: übliche Tabelle (11 nicht benutzt); X ist überall zulässig, wo die Gleichung mit gemeinsamer 1 es hergibt.
  var u = P.ffUebergang(ENN, nextSR), ans = { kopf: ['AV', 'A'].concat(ENN), zeilen: u.map(function (r) {
    return [String(r.av), String(r.a)].concat(r.v.map(function (x, i) { var mit = {}; [0, 1].forEach(function (a) { [0, 1].forEach(function (b) { var q = nextNor(r.av, SZ ? [b, a] : [a, b]); if (q === r.a) mit[i ? b : a] = 1; }); }); return { a: x === 'X' ? X : (mit[0] && mit[1] ? [x, 'X', 'x', '-'] : x), typ: 'bit' }; })); }) };
  var nor = P.raster({ teile: [['E1', 'logicin'], ['E2', 'logicin'], ['U1', 'nor'], ['U2', 'nor'], ['L1', 'logicled'], ['L2', 'logicled'], ['GND1', 'ground']], zeilen: 3,
    leitungen: [[RI, 'U1.in1'], ['U2.out', 'U1.in2'], [SI, 'U2.in1'], ['U1.out', 'U2.in2'], ['U1', 'L1'], ['U2', 'L2']] });
  var Sch = function (s, r, q) { var set = {}; set[SI] = s; set[RI] = r; return { set: set, erwartet: [q, 1 - q] }; };
  var falsch = P.raster({ teile: [['E1', 'logicin'], ['E2', 'logicin'], ['U1', 'nor'], ['U2', 'nor'], ['L1', 'logicled'], ['L2', 'logicled'], ['GND1', 'ground']], zeilen: 3,   // Rückführung fehlt
    leitungen: [[RI, 'U1.in1'], [SI, 'U1.in2'], [SI, 'U2.in1'], [RI, 'U2.in2'], ['U1', 'L1'], ['U2', 'L2']] });
  P.station({
    id: 'B1', teil: 'B', nr: 1, titel: 'NOR-Flipflop', kurz: 'Das einfachste Speicherelement aus zwei NOR-Gattern',
    einfuehrung: '<p>Bisher hing der Ausgang einer Schaltung nur von den <b>jetzigen</b> Eingängen ab (kombinatorische Logik). Ein <b>Flipflop</b> dagegen hat ein <b>Gedächtnis</b>: Sein Ausgang hängt auch davon ab, was vorher war. Möglich wird das durch eine <b>Rückkopplung</b>: Der Ausgang jedes Gatters führt zu einem Eingang des anderen.</p><p>Das <b>NOR-Flipflop</b> besteht aus zwei NOR-Gattern. Zwei Eingänge: <b>' + sN + '</b> (Setzen, S: macht Q = 1) und <b>' + rN + '</b> (Rücksetzen, R: macht Q = 0). Sind beide 0, hält das Flipflop seinen Zustand. Sind beide 1, <b>gewinnt ' + rN + '</b>: der Ausgang wird 0.</p><p><b>Schreibweise:</b> <b>AV</b> = Ausgang vorher, <b>A</b> = Ausgang danach. Die <b>Wahrheitstabelle</b> (Spalten e2, e1, AV, A) zeigt A für jede Kombination, die <b>Analysetabelle</b> (e2, e1, A) fasst zusammen, wann A dem alten Wert AV entspricht, die <b>Ansteuertabelle</b> fragt umgekehrt, welche Eingänge einen Übergang AV → A bewirken. Das <b>Zustandsfolgediagramm</b> zeigt die Übergänge als Pfeile.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B1.1', titel: 'Wahrheitstabelle', art: 'tabelle', kopf: wt.kopf, zeilen: wt.zeilen, text: '<p>Fülle die <b>Wahrheitstabelle</b> aus: Was zeigt der Ausgang A <b>danach</b> (AV = Ausgang vorher)?</p><p>' + sN + ' setzt (A = 1), ' + rN + ' setzt zurück (A = 0). Sind beide 1, gewinnt ' + rN + '.</p>' },
      { id: 'B1.2', titel: 'Analysetabelle', art: 'tabelle', kopf: an.kopf, zeilen: an.zeilen, text: '<p>Fülle die <b>Analysetabelle</b> aus: Zu jeder Kombination von e2 und e1 der Ausgang A. Wählst du <b>AV</b>, heisst das: A behält den alten Wert.</p>' },
      { id: 'B1.3', titel: 'Ansteuertabelle', art: 'tabelle', kopf: ans.kopf, zeilen: ans.zeilen, text: '<p>Fülle die <b>Ansteuertabelle</b> aus: Welche Werte brauchen e2 und e1 für den Übergang von AV nach A? Wo es egal ist: <b>X</b>.</p>', hilfe: 'Bei AV = 0, A = 0: Es darf nicht gesetzt werden (' + sN + ' = 0); ob zurückgesetzt wird, ist egal (X).' },
      { id: 'B1.4', titel: 'Zustandsfolgediagramm', art: 'vergleich', text: '<p>Zeichne das Zustandsfolgediagramm des NOR-Flipflops auf Papier: zwei Zustände (Q = 0, Q = 1) und vier Pfeile, beschriftet mit e2 e1 aus der Ansteuertabelle. Notiere kurz, was dir auffällt, und gib ab; die Software zeigt dir ihr Diagramm zum Vergleich (bewertet wird nicht).</p>', zeigeMuster: '<p>So sieht das Diagramm aus:</p>' + P.svgZustand(ENN, nextSR) },
      { id: 'B1.5', titel: 'Schaltung aus zwei NOR bauen', art: 'folge', lesen: ['L1', 'L2'], nur: ['nor'], limit: { nor: 2 }, min: { nor: 2 }, start: P.startNetz(2, 2), muster: nor, falsch: falsch,
        schritte: [Sch(1, 0, 1), Sch(0, 0, 1), Sch(0, 1, 0), Sch(0, 0, 0), Sch(1, 0, 1), Sch(0, 0, 1), { set: (function () { var o = {}; o[SI] = 1; o[RI] = 1; return o; })(), erwartet: [0, 'X'], name: 'beide Eingänge 1: ' + rN + ' gewinnt, Q wird 0' }],
        text: '<p>Baue das Flipflop aus <b>genau zwei NOR-Gattern</b>: <b>' + SI + '</b> = Setzen (S), <b>' + RI + '</b> = Rücksetzen (R); <b>L1</b> zeigt Q, <b>L2</b> zeigt Q̄. Das obere NOR (Ausgang A = Q) bekommt e1, das untere e2; der Ausgang jedes NOR geht an einen Eingang des anderen. Probiere es aus: Setzen, loslassen, Rücksetzen, loslassen – und beide Eingänge auf 1: Dann gewinnt ' + rN + ' (Q = 0).</p>', hilfe: 'NOR 1 bekommt R und den Ausgang von NOR 2, NOR 2 bekommt S und den Ausgang von NOR 1. Q ist der Ausgang von NOR 1.' },
      { id: 'B1.6', titel: 'Prüffragen NOR-Flipflop', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Was bewirkt die Rückkopplung im Flipflop?', opt: ['Sie macht es schneller', 'Sie speichert den Zustand', 'Sie verhindert Störungen', 'Sie erzeugt den Takt'], richtig: 1, erkl: 'Jedes Gatter hält durch den anderen seinen Ausgang fest.' },
        { q: 'Beide Eingänge e1, e2 sind 0. Was zeigt der Ausgang?', opt: ['0', '1', 'Den alten Wert (AV)', 'Das ist nicht erlaubt'], richtig: 2, erkl: 'Ruhezustand: Das Flipflop speichert.' },
        { q: 'e2 = 1, e1 = 0. Welcher Wert hat A danach?', opt: ['0', '1', 'AV', 'Das ist nicht erlaubt'], richtig: 1, erkl: 'Der Setzeingang macht Q = 1.' },
        { q: 'e1 = 1 und e2 = 1 zugleich. Was zeigt A?', opt: ['0 (e1 gewinnt)', '1 (e2 gewinnt)', 'Den alten Wert', 'Unbestimmt'], richtig: 0, erkl: 'Das obere NOR bekommt e1 = 1: Sein Ausgang A ist 0, e1 gewinnt.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

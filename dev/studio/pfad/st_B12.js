/* Lernpfad Station B12 – Spezialzähler und Johnson-Zähler. Modulo n frei wählbar: asynchrone Dualzähler, die bei Erreichen von n über preClear zurückgesetzt werden;
 * Johnson-Zähler als Schieberegister aus D-Flipflops mit invertierter Rückkopplung. Die Folgen werden gerechnet (Takt mod n beziehungsweise Schieben). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var st = function (n) { return P.startNetz(0, n, [{ id: 'C', type: 'logicin', x: 200, y: 80, rot: 0 }, { id: 'H', type: 'logicin', x: 200, y: 180, rot: 0, props: { konst: true, closed: true } }]); };
  var mod = function (id, n, bits, pflicht) {
    var soll = []; for (var i = 1; i <= 2 * n + 1; i++) soll.push(i % n);
    var lesen = []; for (var b = bits; b >= 1; b--) lesen.push('L' + b);
    var ohne = P.rippleZaehler(bits, n); ohne.wires = ohne.wires.filter(function (w) { return !/\.PC$/.test(w.to); }); // falsch: ohne Rücksetzen zählt er bis 2^n
    return { id: id, falsch: ohne, titel: 'Modulo-' + n + '-Zähler bauen', pflicht: pflicht !== false, art: 'folge', takt: 'C', lesen: lesen, soll: soll, start: st(bits), muster: P.rippleZaehler(bits, n), min: { tff: bits }, limit: { tff: bits },
      text: '<p>Baue einen Zähler, der von <b>0 bis ' + (n - 1) + '</b> zählt und dann wieder auf 0 springt (<b>Modulo ' + n + '</b>): ' + bits + ' T-Flipflops als asynchroner Dualzähler (T an <b>H</b>, fest 1), dazu ein <b>UND</b>, das den Zählerstand <b>' + n + '</b> erkennt (die Bits von ' + n + ' = ' + P.dual(n, bits) + ', die 1 sind) und alle Stufen über <b>preClear</b> zurücksetzt. <b>L1 …</b> zeigen Q0 …, Q0 = niedrigstes Bit.</p>', hilfe: 'Beim Zählerstand ' + n + ' sind genau die Bits gesetzt, die in ' + P.dual(n, bits) + ' eine 1 haben. Diese Q gehen an das UND.' };
  };
  var joh = P.raster({ teile: [['C', 'logicin'], ['FF1', 'dff'], ['FF2', 'dff'], ['FF3', 'dff'], ['FF4', 'dff'], ['L1', 'logicled'], ['L2', 'logicled'], ['L3', 'logicled'], ['L4', 'logicled']], zeilen: 5,
    leitungen: [['C', 'FF1.C'], ['C', 'FF2.C'], ['C', 'FF3.C'], ['C', 'FF4.C'], ['FF4.Qn', 'FF1.D'], ['FF1.Q', 'FF2.D'], ['FF2.Q', 'FF3.D'], ['FF3.Q', 'FF4.D'], ['FF1.Q', 'L1'], ['FF2.Q', 'L2'], ['FF3.Q', 'L3'], ['FF4.Q', 'L4']] });
  // Johnson-4-Bit: Schieben nach links, vorn kommt Q̄ des letzten: Q3Q2Q1Q0 = 0000 → 0001 → 0011 → 0111 → 1111 → 1110 → 1100 → 1000 → 0000
  var jf = [], q = [0, 0, 0, 0]; for (var i = 0; i < 9; i++) { q = [1 - q[3], q[0], q[1], q[2]]; jf.push(q[3] * 8 + q[2] * 4 + q[1] * 2 + q[0]); }
  var jt = { kopf: ['Takt', 'Q3', 'Q2', 'Q1', 'Q0'], zeilen: [] };
  var s = [0, 0, 0, 0]; jt.zeilen.push(['0', '0', '0', '0', '0']);
  for (var t = 1; t <= 9; t++) { s = [1 - s[3], s[0], s[1], s[2]]; jt.zeilen.push([String(t), { a: String(s[3]), typ: 'bit' }, { a: String(s[2]), typ: 'bit' }, { a: String(s[1]), typ: 'bit' }, { a: String(s[0]), typ: 'bit' }]); } // s = [Q0, Q1, Q2, Q3]
  P.station({
    id: 'B12', teil: 'B', nr: 12, titel: 'Spezial- und Johnson-Zähler', kurz: 'Modulo n frei wählbar, Johnson-Zähler',
    einfuehrung: '<p>Nicht jeder Zähler zählt bis 2<sup>n</sup>. Ein <b>Modulo-n-Zähler</b> zählt von 0 bis n − 1 und springt dann auf 0. Die einfachste Bauweise: ein Dualzähler mit so vielen Stufen, dass n hineinpasst, und ein <b>UND</b>, das den Zählerstand <b>n</b> erkennt und alle Stufen über <b>preClear</b> auf 0 setzt. Der Zählerstand n selbst ist nur ganz kurz da.</p><p>Der <b>Johnson-Zähler</b> ist ein <b>Schieberegister</b> aus D-Flipflops, in dem der <b>negierte</b> Ausgang des letzten Flipflops an den Eingang des ersten zurückgeführt wird. Mit n Flipflops hat er <b>2n Zustände</b>, und von einem Zustand zum nächsten ändert sich <b>nur ein Bit</b>. Dadurch braucht man zum Dekodieren jedes Zustands nur ein UND mit zwei Eingängen.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      mod('B12.1', 6, 3), mod('B12.2', 3, 2), mod('B12.3', 12, 4, false),
      { id: 'B12.4', titel: 'Johnson-Zählfolge', art: 'tabelle', kopf: jt.kopf, zeilen: jt.zeilen, text: '<p>Ein 4-Bit-<b>Johnson-Zähler</b> startet bei 0000. Bei jedem Takt schieben alle Bits eine Stelle nach links (Q0 → Q1 → Q2 → Q3), vorn kommt das <b>Gegenteil von Q3</b> hinein. Schreibe die Zustände für neun Takte auf. Nach wie vielen Takten wiederholt sich die Folge?</p>' },
      { id: 'B12.5', titel: 'Johnson-Zähler bauen', art: 'folge', takt: 'C', lesen: ['L4', 'L3', 'L2', 'L1'], soll: jf, start: P.startNetz(0, 4, [{ id: 'C', type: 'logicin', x: 200, y: 80, rot: 0 }]), muster: joh, min: { dff: 4 }, limit: { dff: 4 },
        text: '<p>Baue den 4-Bit-Johnson-Zähler aus vier <b>D-Flipflops</b>: Q0 → D1, Q1 → D2, Q2 → D3 und <b>Q̄3 → D0</b>. Alle C am Takt <b>C</b>. <b>L1 bis L4</b> zeigen Q0 bis Q3.</p>', hilfe: 'Die Rückkopplung geht von Q̄ des letzten an D des ersten Flipflops.' },
      { id: 'B12.6', titel: 'Prüffragen Spezialzähler', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Wie viele Zustände hat ein Johnson-Zähler mit 5 Flipflops?', opt: ['5', '10', '25', '32'], richtig: 1, erkl: '2 · n Zustände.' },
        { q: 'Wie viele Flipflops braucht man mindestens für einen Modulo-12-Zähler?', opt: ['3', '4', '5', '12'], richtig: 1, erkl: '2³ = 8 reicht nicht, 2⁴ = 16 reicht.' },
        { q: 'Bei welchem Zählerstand wird ein Modulo-6-Zähler (Dualzähler mit preClear) zurückgesetzt?', opt: ['5', '6', '7', '3'], richtig: 1, erkl: 'Beim Erreichen von 6 = 110: Q1 und Q2 sind 1.' },
        { q: 'Wie viele Bits ändern sich beim Johnson-Zähler von einem Zustand zum nächsten?', opt: ['Eines', 'Zwei', 'Alle', 'Das ist verschieden'], richtig: 0, erkl: 'Das macht ihn störsicher und das Dekodieren einfach.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Lernpfad Station B10 – Synchroner Dualzähler: alle Flipflops haben denselben Takt; die T-Eingänge kommen aus den tieferen Stufen. Die Übergangstabelle rechnet T aus AV und A (T = AV xor A). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var st = P.startNetz(0, 3, [{ id: 'C', type: 'logicin', x: 200, y: 80, rot: 0 }, { id: 'H', type: 'logicin', x: 200, y: 180, rot: 0, props: { konst: true, closed: true } }]);
  var tab = { kopf: ['Q2', 'Q1', 'Q0', 'T2', 'T1', 'T0'], zeilen: [] };
  for (var s = 0; s < 8; s++) { var n = (s + 1) % 8, t = s ^ n; tab.zeilen.push([String(s >> 2 & 1), String(s >> 1 & 1), String(s & 1), { a: String(t >> 2 & 1), typ: 'bit' }, { a: String(t >> 1 & 1), typ: 'bit' }, { a: String(t & 1), typ: 'bit' }]); }
  var muster = P.raster({ teile: [['C', 'logicin'], P.EIN1('H'), ['FF1', 'tff'], ['FF2', 'tff'], ['FF3', 'tff'], ['U1', 'and'], ['L1', 'logicled'], ['L2', 'logicled'], ['L3', 'logicled']], zeilen: 4,
    leitungen: [['C', 'FF1.C'], ['C', 'FF2.C'], ['C', 'FF3.C'], ['H', 'FF1.T'], ['FF1.Q', 'FF2.T'], ['FF1.Q', 'U1.in1'], ['FF2.Q', 'U1.in2'], ['U1', 'FF3.T'], ['FF1.Q', 'L1'], ['FF2.Q', 'L2'], ['FF3.Q', 'L3']] });
  var soll = []; for (var i = 1; i <= 9; i++) soll.push(i % 8);
  P.station({
    id: 'B10', teil: 'B', nr: 10, titel: 'Synchroner Dualzähler', kurz: 'Alle Stufen am selben Takt – ohne Zwischenzustände',
    einfuehrung: '<p>Beim asynchronen Zähler (B8) addieren sich die Laufzeiten der Stufen, und beim Umschalten erscheinen falsche Zwischenzustände. Der <b>synchrone Zähler</b> vermeidet das: <b>Alle</b> Flipflops bekommen <b>denselben Takt</b> und schalten zugleich. Damit die richtigen Stufen kippen, werden ihre T-Eingänge so beschaltet, dass sie nur dann 1 sind, wenn die Stufe wirklich kippen muss.</p><p>Beim Dualzähler kippt eine Stufe, wenn <b>alle tieferen Stufen 1</b> sind. Die Ansteuertabelle sagt es dir: Aus dem Übergang von Zählerstand AV nach A ergibt sich T = AV <b>XOR</b> A für jedes Bit.</p><p>Der Preis: mehr Gatter. Der Gewinn: höhere Taktfrequenz und saubere Übergänge.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B10.1', titel: 'Ansteuertabelle des 3-Bit-Zählers', art: 'tabelle', kopf: tab.kopf, zeilen: tab.zeilen, text: '<p>Zu jedem Zählerstand Q2 Q1 Q0 (vor dem Takt) gehört der nächste Zählerstand (+1, nach 7 kommt 0). Welche T-Eingänge (T2 T1 T0) müssen 1 sein, damit die richtigen Stufen kippen? Ein Bit kippt, wenn es sich von AV nach A ändert.</p>', hilfe: 'T ist 1, wenn sich das Bit ändert: T = AV XOR A. Stufe 0 ändert sich immer.' },
      { id: 'B10.2', titel: 'Welche T-Eingänge?', art: 'fragen', text: '<p>Lies die Gleichungen aus der Tabelle ab.</p>', fragen: [
        { q: 'T0 ist …', opt: ['immer 1', 'Q0', 'Q0 UND Q1', 'immer 0'], richtig: 0, erkl: 'Das niedrigste Bit kippt bei jedem Takt.' },
        { q: 'T1 ist …', opt: ['immer 1', 'Q0', 'Q0 UND Q1', 'Q2'], richtig: 1, erkl: 'Q1 kippt, wenn Q0 = 1 ist.' },
        { q: 'T2 ist …', opt: ['Q0', 'Q1', 'Q0 UND Q1', 'Q0 ODER Q1'], richtig: 2, erkl: 'Q2 kippt nur, wenn beide tieferen Stufen 1 sind.' }] },
      { id: 'B10.3', titel: '3-Bit-Synchronzähler bauen', art: 'folge', takt: 'C', lesen: ['L3', 'L2', 'L1'], soll: soll, start: st, muster: muster, min: { tff: 3, and: 1 }, limit: { tff: 3 },
        text: '<p>Baue den <b>synchronen</b> 3-Bit-Zähler aus drei T-Flipflops und einem UND. <b>Alle drei C-Eingänge</b> hängen direkt am Takt <b>C</b>. Die T-Eingänge nach deiner Tabelle: T0 = H (fest 1), T1 = Q0, T2 = Q0 UND Q1. <b>L1, L2, L3</b> zeigen Q0, Q1, Q2.</p>', hilfe: 'Der Takt geht an alle drei Flipflops, nicht von Stufe zu Stufe.' },
      { id: 'B10.4', titel: 'Synchron gegen asynchron im Zeitverlauf', art: 'fragen', text: '<p>Setze beide Zähler (B8 und B10) mit einem Taktgeber von 1 MHz auf, öffne den Zeitverlauf und vergleiche den Übergang 7 → 0 (Laufzeit je Flipflop 20 ns).</p>', fragen: [
        { q: 'Wann sind beim synchronen Zähler alle Bits endgültig gekippt?', opt: ['20 ns nach dem Takt (alle zugleich)', '20, 40 und 60 ns', '60 ns nach dem Takt', 'Gar nicht'], richtig: 0, erkl: 'Alle Flipflops bekommen denselben Takt und schalten mit derselben Laufzeit.' },
        { q: 'Welche Zwischenzustände erscheinen beim synchronen Zähler beim Übergang 7 → 0?', opt: ['110 und 100', 'Keine', '011 und 001', '101'], richtig: 1, erkl: 'Alle Bits fallen gleichzeitig von 111 auf 000.' },
        { q: 'Was ist der Preis des synchronen Zählers?', opt: ['Er zählt langsamer', 'Zusätzliche Gatter für die T-Eingänge', 'Er braucht mehr Takte', 'Er kann nicht zurücksetzen'], richtig: 1, erkl: 'Die UND-Gatter für T2, T3 … kosten Bauteile und etwas Laufzeit.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

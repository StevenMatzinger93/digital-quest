/* Lernpfad Station B11 – Synchroner Dezimalzähler (BCD) mit D-Flipflops. Folgetabelle und Ansteuergleichungen werden aus «nächster Zählerstand = (n + 1) mod 10» gerechnet,
 * die KV-Aufgaben haben die Zustände 10 bis 15 als Don't-Care. Eingänge der KV-Aufgaben: e1 = Q0 (niedrigstes Bit) … e4 = Q3. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var next = function (n) { return (n + 1) % 10; };
  var tab = { kopf: ['Q3', 'Q2', 'Q1', 'Q0', 'D3', 'D2', 'D1', 'D0'], zeilen: [] };
  for (var n = 0; n <= 9; n++) { var m = next(n), row = [n >> 3 & 1, n >> 2 & 1, n >> 1 & 1, n & 1].map(String); [3, 2, 1, 0].forEach(function (b) { row.push({ a: String(m >> b & 1), typ: 'bit' }); }); tab.zeilen.push(row); }
  var dc = [10, 11, 12, 13, 14, 15];
  var kvs = [3, 2, 1].map(function (b) {
    var ones = []; for (var k = 0; k <= 9; k++) if (next(k) >> b & 1) ones.push(k);
    return { id: 'B11.' + (6 - b), titel: 'KV-Diagramm für D' + b, art: 'kv', n: 4, ones: ones, dc: dc, text: '<p>Der D-Eingang <b>D' + b + '</b> muss beim nächsten Takt 1 sein in den Zählerständen <b>m(' + ones.join(', ') + ')</b> (Q0 = e1, Q1 = e2, Q2 = e3, Q3 = e4). Die Zählerstände 10 bis 15 kommen nie vor: <b>d(' + dc.join(', ') + ')</b>. Päckchen einzeichnen, Minimalform angeben.</p>' };
  });
  // Muster: D0 = /Q0, D1 = Q1 xor (Q0 /Q3), D2 = Q2 xor (Q1 Q0), D3 = Q3 /Q0 v Q2 Q1 Q0
  var muster = P.raster({ teile: [['C', 'logicin'], ['FF1', 'dff'], ['FF2', 'dff'], ['FF3', 'dff'], ['FF4', 'dff'], ['G1', 'not'], ['G2', 'not'], ['G3', 'and'], ['G4', 'xor'], ['G5', 'and'], ['G6', 'xor'], ['G7', 'and'], ['G8', 'and'], ['G9', 'or'], ['L1', 'logicled'], ['L2', 'logicled'], ['L3', 'logicled'], ['L4', 'logicled']], zeilen: 6,
    leitungen: [['C', 'FF1.C'], ['C', 'FF2.C'], ['C', 'FF3.C'], ['C', 'FF4.C'], ['FF1.Q', 'G1.in'], ['G1', 'FF1.D'], ['FF4.Q', 'G2.in'], ['FF1.Q', 'G3.in1'], ['G2', 'G3.in2'], ['FF2.Q', 'G4.in1'], ['G3', 'G4.in2'], ['G4', 'FF2.D'],
      ['FF1.Q', 'G5.in1'], ['FF2.Q', 'G5.in2'], ['FF3.Q', 'G6.in1'], ['G5', 'G6.in2'], ['G6', 'FF3.D'], ['FF4.Q', 'G7.in1'], ['G1', 'G7.in2'], ['FF3.Q', 'G8.in1'], ['G5', 'G8.in2'], ['G7', 'G9.in1'], ['G8', 'G9.in2'], ['G9', 'FF4.D'],
      ['FF1.Q', 'L1'], ['FF2.Q', 'L2'], ['FF3.Q', 'L3'], ['FF4.Q', 'L4']] });
  var soll = []; for (var i = 1; i <= 12; i++) soll.push(i % 10);
  P.station({
    id: 'B11', teil: 'B', nr: 11, titel: 'Synchroner Dezimalzähler', kurz: 'BCD-Zähler 0 bis 9, Rücksetzung bei 10',
    einfuehrung: '<p>Der <b>Dezimalzähler</b> (BCD-Zähler) zählt von 0 bis 9 und springt dann auf 0. Vier Flipflops sind nötig, sechs der sechzehn möglichen Zustände (10 bis 15) werden nie gebraucht – sie sind <b>Don\'t-Care</b>.</p><p>Als <b>synchroner</b> Zähler mit <b>D-Flipflops</b> geht es so: Die Aufgabe jedes D-Eingangs ist der <b>nächste Zustand</b> seines Bits. Aus der Folgetabelle (Zählerstand → nächster Zählerstand) liest du für jedes D eine Tabelle ab, vereinfachst sie mit dem KV-Diagramm (die Don\'t-Care helfen!) und baust die Gatter davor. Alle vier Flipflops bekommen denselben Takt.</p><p>Die Gleichungen darfst du selbst herleiten oder aus den KV-Diagrammen nehmen; als Kontrolle: D0 = /Q0.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B11.1', titel: 'Folgetabelle', art: 'tabelle', kopf: tab.kopf, zeilen: tab.zeilen, text: '<p>Zu jedem Zählerstand Q3 Q2 Q1 Q0 (0 bis 9) der <b>nächste</b> Zählerstand, der am D-Eingang anliegen muss: D3 D2 D1 D0. Nach der 9 kommt wieder 0.</p>' },
      { id: 'B11.2', titel: 'D0 bestimmen', art: 'fragen', text: '<p>Lies D0 aus der Tabelle ab.</p>', fragen: [{ q: 'D0 ist …', opt: ['immer 1', 'Q0', '/Q0 (Q0 negiert)', 'Q1'], richtig: 2, erkl: 'Das niedrigste Bit kippt bei jedem Takt: Der nächste Wert ist das Gegenteil des jetzigen.' }] }
    ].concat(kvs, [
      { id: 'B11.6', titel: 'Dezimalzähler bauen', art: 'folge', takt: 'C', lesen: ['L4', 'L3', 'L2', 'L1'], soll: soll, start: P.startNetz(0, 4, [{ id: 'C', type: 'logicin', x: 200, y: 80, rot: 0 }]), muster: muster, min: { dff: 4 }, limit: { dff: 4 },
        text: '<p>Baue den synchronen Dezimalzähler aus <b>vier D-Flipflops</b> und Gattern. Alle vier C-Eingänge am Takt <b>C</b>. <b>L1 bis L4</b> zeigen Q0 bis Q3. Die Software gibt zwölf Takte: 1, 2, … 9, 0, 1, 2.</p>', hilfe: 'Jedes D bekommt seine vereinfachte Gleichung aus dem KV-Diagramm. Die Q der Flipflops führen zu den Gattern zurück.' }
    ])
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Lernpfad Station B9 – Digitale Uhr: Sekundenzähler 0 bis 59 mit zwei Siebensegmentanzeigen, selbst gebaut. Die Abnahme des ganzen Pfades:
 * Wer A1 bis B8 durchgearbeitet hat, hat alle nötigen Bauteile freigeschaltet (diese Station schaltet nichts Neues frei, der Test prüft das). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var seg = function (i) { return 'abcdefg'.split('').map(function (c) { return ['IC' + i + '.' + c, 'AZ' + i + '.' + c]; }); };
  var einer = [['CLK1', 'clock'], P.EIN1('H'), ['FF1', 'tff'], ['FF2', 'tff'], ['FF3', 'tff'], ['FF4', 'tff'], ['U1', 'and'], ['L1', 'logicled'], ['L2', 'logicled'], ['L3', 'logicled'], ['L4', 'logicled']];
  var einerW = [['CLK1', 'FF1.C'], ['FF1.Qn', 'FF2.C'], ['FF2.Qn', 'FF3.C'], ['FF3.Qn', 'FF4.C'], ['H', 'FF1.T'], ['H', 'FF2.T'], ['H', 'FF3.T'], ['H', 'FF4.T'], ['FF2.Q', 'U1.in1'], ['FF4.Q', 'U1.in2'], ['U1', 'FF1.PC'], ['U1', 'FF2.PC'], ['U1', 'FF3.PC'], ['U1', 'FF4.PC'],
    ['FF1.Q', 'L1'], ['FF2.Q', 'L2'], ['FF3.Q', 'L3'], ['FF4.Q', 'L4']];
  var zehner = [['CLK1', 'logicin'], P.EIN1('H'), ['FF1', 'tff', { trig: 'neg' }], ['FF2', 'tff'], ['FF3', 'tff'], ['U1', 'and'], ['L1', 'logicled'], ['L2', 'logicled'], ['L3', 'logicled']];
  var zehnerW = [['CLK1', 'FF1.C'], ['FF1.Qn', 'FF2.C'], ['FF2.Qn', 'FF3.C'], ['H', 'FF1.T'], ['H', 'FF2.T'], ['H', 'FF3.T'], ['FF2.Q', 'U1.in1'], ['FF3.Q', 'U1.in2'], ['U1', 'FF1.PC'], ['U1', 'FF2.PC'], ['U1', 'FF3.PC'], ['FF1.Q', 'L1'], ['FF2.Q', 'L2'], ['FF3.Q', 'L3']];
  // Uhr: Einer FF1–FF4, Zehner FF5–FF7; der Übertrag ist die fallende Flanke von Q3 der Einer (Zehner-FF5 mit fallender Flanke)
  var uhrT = [['CLK1', 'clock'], P.EIN1('H'), P.EIN0('Z'), ['FF1', 'tff'], ['FF2', 'tff'], ['FF3', 'tff'], ['FF4', 'tff'], ['U1', 'and'], ['FF5', 'tff', { trig: 'neg' }], ['FF6', 'tff'], ['FF7', 'tff'], ['U2', 'and'], ['IC1', 'dec7'], ['IC2', 'dec7'], ['AZ1', 'seg7'], ['AZ2', 'seg7']];
  var uhrW = [['CLK1', 'FF1.C'], ['FF1.Qn', 'FF2.C'], ['FF2.Qn', 'FF3.C'], ['FF3.Qn', 'FF4.C'], ['FF4.Q', 'FF5.C'], ['FF5.Qn', 'FF6.C'], ['FF6.Qn', 'FF7.C']];
  for (var i = 1; i <= 7; i++) uhrW.push(['H', 'FF' + i + '.T']);
  uhrW.push(['FF2.Q', 'U1.in1'], ['FF4.Q', 'U1.in2'], ['FF6.Q', 'U2.in1'], ['FF7.Q', 'U2.in2']);
  for (i = 1; i <= 4; i++) uhrW.push(['U1', 'FF' + i + '.PC']); for (i = 5; i <= 7; i++) uhrW.push(['U2', 'FF' + i + '.PC']);
  uhrW.push(['FF1.Q', 'IC1.A'], ['FF2.Q', 'IC1.B'], ['FF3.Q', 'IC1.C'], ['FF4.Q', 'IC1.D'], ['FF5.Q', 'IC2.A'], ['FF6.Q', 'IC2.B'], ['FF7.Q', 'IC2.C'], ['Z', 'IC2.D']);
  seg(1).concat(seg(2)).forEach(function (w) { uhrW.push(w); });
  var uhr = P.raster({ teile: uhrT, leitungen: uhrW, zeilen: 6 });
  var start0 = function (extra) { return P.startNetz(0, 0, extra); };
  var H = { id: 'H', type: 'logicin', x: 200, y: 80, rot: 0, props: { konst: true, closed: true } }, Z = { id: 'Z', type: 'logicin', x: 200, y: 180, rot: 0, props: { konst: true, closed: false } };
  var zaehle = function (n, f) { var o = []; for (var k = 1; k <= n; k++) o.push({ takte: 1, erwartet: f(k) }); return o; };
  P.station({
    id: 'B9', teil: 'B', nr: 9, titel: 'Digitale Uhr', kurz: 'Abnahme: Sekundenzähler 0 bis 59 mit zwei Anzeigen',
    einfuehrung: '<p>Jetzt wird alles zusammengesetzt. Eine <b>Sekundenuhr</b> zählt Taktimpulse von 0 bis 59 und beginnt dann von vorn. Sie besteht aus:</p><ul><li>einem <b>Taktgeber</b> mit 1 Hz;</li><li>einer <b>Einerstelle</b>, die von 0 bis 9 zählt und dann auf 0 zurückspringt (<b>Dezimalzähler</b>: ein Dualzähler, der beim Erreichen von 10 mit <b>preClear</b> zurückgesetzt wird);</li><li>einer <b>Zehnerstelle</b>, die von 0 bis 5 zählt und bei 6 zurückspringt; sie wird vom <b>Übertrag</b> der Einerstelle getaktet (die Einer springen von 9 auf 0: Q3 fällt);</li><li>für jede Stelle einem <b>Dekoder</b> und einer <b>Siebensegmentanzeige</b>.</li></ul><p>Das sind alles Teile, die du schon kennst. Du brauchst nur noch den Plan. Zwei Teilaufgaben helfen dir beim Üben, die Abnahme ist die ganze Uhr.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B9.1', titel: 'Teilaufgabe: Einerstelle 0 bis 9', pflicht: false, art: 'folge', takt: 'CLK1', lesen: ['L4', 'L3', 'L2', 'L1'], schritte: zaehle(11, function (k) { return [(k % 10) >> 3 & 1, (k % 10) >> 2 & 1, (k % 10) >> 1 & 1, (k % 10) & 1]; }), start: start0([H]), muster: P.raster({ teile: einer, leitungen: einerW, zeilen: 6 }), min: { tff: 4 },
        text: '<p><b>Teilaufgabe.</b> Baue einen Zähler, der von 0 bis 9 zählt und dann auf 0 zurückspringt: vier T-Flipflops (Ripple), ein <b>UND</b> erkennt den Zählerstand 10 (Q1 und Q3) und setzt alle vier über <b>preClear</b> zurück. Der Takt ist ein <b>Taktgeber</b> (er heisst CLK1). <b>L1 bis L4</b> zeigen Q0 bis Q3. Die Software taktet selbst (der Taktgeber wird dafür von Hand bedient).</p>', hilfe: 'Der Zählerstand 10 = 1010: Q1 = 1 und Q3 = 1 kommt vorher nie vor.' },
      { id: 'B9.2', titel: 'Teilaufgabe: Zehnerstelle 0 bis 5', pflicht: false, art: 'folge', takt: 'CLK1', lesen: ['L3', 'L2', 'L1'], schritte: zaehle(7, function (k) { return [(k % 6) >> 2 & 1, (k % 6) >> 1 & 1, (k % 6) & 1]; }), start: start0([H]), muster: P.raster({ teile: zehner, leitungen: zehnerW, zeilen: 5 }), min: { tff: 3 }, takt0: true,
        text: '<p><b>Teilaufgabe.</b> Baue einen Zähler, der von 0 bis 5 zählt und bei 6 zurückspringt: drei T-Flipflops, ein UND erkennt 6 (Q1 und Q2) und setzt zurück. Der Takteingang heisst hier <b>CLK1</b> (ein Pegelschalter oder ein Taktgeber). Das erste Flipflop soll auf die <b>fallende</b> Flanke reagieren – so wird es später vom Übertrag der Einerstelle getaktet. <b>L1 bis L3</b> zeigen Q0 bis Q2.</p><p>Hinweis: Hier genügt als Takt ein Pegelschalter mit dem Namen <b>CLK1</b>; das Programm taktet ihn selbst.</p>', hilfe: 'Der Zählerstand 6 = 110. Die fallende Flanke stellst du im Eigenschaftenfeld des ersten Flipflops ein.' },
      { id: 'B9.3', titel: 'Die Digitaluhr', art: 'folge', takt: 'CLK1', lesen: ['AZ2', 'AZ1'], schritte: zaehle(62, function (k) { var s = k % 60; return [Math.floor(s / 10), s % 10]; }), start: start0([H, Z]), muster: uhr, min: { tff: 7, dec7: 2, seg7: 2, clock: 1 },
        text: '<p><b>Abnahme.</b> Baue die Sekundenuhr: ein <b>Taktgeber</b> (heisst <b>CLK1</b>, 1 Hz), sieben T-Flipflops (vier für die Einer, drei für die Zehner), zwei UND zum Zurücksetzen, zwei <b>BCD-7-Segment-Dekoder</b> und zwei <b>Siebensegmentanzeigen</b>. Die <b>zuerst gesetzte</b> Anzeige (AZ1) ist die <b>Einerstelle</b>, die zweite (AZ2) die <b>Zehnerstelle</b>. Die festen Pegelschalter <b>H</b> (immer 1, für die T-Eingänge) und <b>Z</b> (immer 0, für den vierten Eingang D des Zehner-Dekoders) sind schon da. Die Software gibt 62 Takte und liest nach jedem Takt beide Anzeigen: 1, 2, …, 59, 0, 1.</p><p>Probiere sie zuerst im Studio aus (Taktgeber auf 10 Hz, dann sieht man sie schneller laufen).</p>', hilfe: 'Zuerst die Einerstelle (B9.1), dann die Zehnerstelle (B9.2), dann der Übertrag: Q3 der Einer taktet die Zehner (fallende Flanke). Dekoder-Ausgänge a bis g an die gleichnamigen Segmente.' },
      { id: 'B9.4', titel: 'Prüffragen Digitaluhr', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Warum zählt die Zehnerstelle nur bis 5?', opt: ['Weil 60 Sekunden eine Minute sind', 'Weil es nur fünf Flipflops gibt', 'Weil 6 nicht dargestellt werden kann', 'Zufall'], richtig: 0, erkl: 'Nach 59 Sekunden beginnt die Zählung wieder bei 0.' },
        { q: 'Woran erkennt die Einerstelle den Zählerstand 10 für das Zurücksetzen?', opt: ['Q0 und Q1 sind 1', 'Q1 und Q3 sind 1', 'Q2 und Q3 sind 1', 'Alle Q sind 1'], richtig: 1, erkl: '10 = 1010: Q3 und Q1 sind 1, und das kommt in 0 bis 9 vorher nie vor.' },
        { q: 'Wie taktet die Einerstelle die Zehnerstelle?', opt: ['Mit der steigenden Flanke von Q0', 'Mit der fallenden Flanke von Q3 (Übertrag beim Sprung von 9 auf 0)', 'Gar nicht', 'Mit dem Takt der Uhr'], richtig: 1, erkl: 'Q3 geht nur beim Sprung von 9 auf 0 von 1 nach 0.' },
        { q: 'Wie viele Flipflops braucht die Sekundenuhr mindestens (mit dieser Bauweise)?', opt: ['6', '7', '8', '10'], richtig: 1, erkl: 'Vier für die Einer (0 bis 9) und drei für die Zehner (0 bis 5).' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

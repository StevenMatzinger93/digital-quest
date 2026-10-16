/* Lernpfad Station B5 – D-Flipflop. */
(function (root) {
  'use strict';
  var P = root.DQPfad, N = function (id, type, ins, props, pins) { return [id, type, ins, props, pins]; };
  // Frequenzteiler: Q̄ an D zurückgekoppelt (von Hand verdrahtet, weil das Bauteil sich selbst speist)
  var Pt = function (id, type, x, y) { return { id: id, type: type, x: x, y: y, rot: 0 }; };
  var teiler = { parts: [Pt('C', 'logicin', 200, 100), Pt('FF1', 'dff', 520, 160), Pt('L1', 'logicled', 900, 120), Pt('L2', 'logicled', 900, 240), Pt('GND1', 'ground', 200, 260)],
    wires: [{ from: 'C.out', to: 'FF1.C' }, { from: 'FF1.Qn', to: 'FF1.D' }, { from: 'FF1.Q', to: 'L1.in' }, { from: 'FF1.Qn', to: 'L2.in' }] };
  P.ffStation({
    id: 'B5', nr: 5, titel: 'D-Flipflop', kurz: 'Daten übernehmen – das Zwischenspeicher-Flipflop', typ: 'dff', ein: ['D'], next: P.FF.d,
    plan: [{ set: { E1: 1 }, takte: 1 }, { set: { E1: 0 }, takte: 1 }, { set: { E1: 1 }, takte: 2 }, { set: { E1: 0 }, takte: 1 }, { takte: 2 }],
    einfuehrung: '<p>Das <b>D-Flipflop</b> («Data») ist das einfachste Speicherelement: Bei der aktiven Taktflanke übernimmt es den Wert von D und hält ihn bis zur nächsten Flanke. Q folgt also D – aber nur im Takt, und mit einer Taktperiode Verzögerung.</p><p>Das D-Flipflop ist der Baustein von Registern, Schieberegistern und vielen Zählern.</p>',
    analyseHilfe: 'Der Ausgang danach ist immer gleich D, egal wie er vorher war.',
    extra: [
      { titel: 'Frequenzteiler aus einem D-Flipflop', art: 'folge', takt: 'C', lesen: ['L1', 'L2'], start: P.startNetz(0, 2, [{ id: 'C', type: 'logicin', x: 200, y: 100, rot: 0 }]), gesperrt: ['C', 'L1', 'L2', 'GND1'], muster: teiler, min: { dff: 1 },
        schritte: [1, 0, 1, 0, 1, 0].map(function (q) { return { takte: 1, erwartet: [q, 1 - q] }; }),
        text: '<p>Aus einem D-Flipflop wird ein <b>Frequenzteiler 2:1</b>, wenn der Eingang D dauernd den <b>negierten Ausgang Q̄</b> bekommt. Baue es: ein D-Flipflop, <b>C</b> an den Takt, <b>Q̄ an D</b>, <b>L1</b> zeigt Q und <b>L2</b> zeigt Q̄.</p>', hilfe: 'Bei jeder Flanke wird D = Q̄ übernommen: Q kippt. So wird das D-Flipflop zum T-Flipflop mit T = 1.' }
    ],
    fragen: [
      { q: 'Bei welchem Wert von D wird Q bei der nächsten aktiven Taktflanke 1?', opt: ['D = 0', 'D = 1', 'Nie', 'Immer'], richtig: 1, erkl: 'Q übernimmt D.' },
      { q: 'D ändert sich zwischen zwei Taktflanken mehrmals. Was übernimmt das flankengesteuerte D-Flipflop?', opt: ['Den ersten Wert', 'Den Wert im Moment der Flanke', 'Den letzten Wert vor der Flanke, egal wann', 'Nichts'], richtig: 1, erkl: 'Nur im Moment der aktiven Flanke wird gelesen.' },
      { q: 'Wie viele Takte braucht ein Datenwert am D-Eingang, bis er am Ausgang Q erscheint?', opt: ['0 (sofort)', '1', '2', 'Kommt auf D an'], richtig: 1, erkl: 'Mit der nächsten aktiven Flanke.' }]
  });
})(typeof window !== 'undefined' ? window : globalThis);

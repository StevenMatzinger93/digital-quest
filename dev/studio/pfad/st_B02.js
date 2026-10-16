/* Lernpfad Station B2 – NOR-AND-Flipflop: das NOR-Flipflop mit zwei UND-Gattern vor den Eingängen, die der Takt C freigibt (taktzustandsgesteuert). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var next = function (q, e) { return e[0] ? P.FF.rs(q, [e[1], e[2]]) : q; };          // e = [C, e1, e2]
  var an = P.ffAnalyse(['C', 'e1', 'e2'], next);
  var muster = P.raster({ teile: [['E1', 'logicin'], ['E2', 'logicin'], ['C', 'logicin'], ['U1', 'and'], ['U2', 'and'], ['U3', 'nor'], ['U4', 'nor'], ['L1', 'logicled'], ['L2', 'logicled'], ['GND1', 'ground']], zeilen: 4,
    leitungen: [['E1', 'U1.in1'], ['C', 'U1.in2'], ['E2', 'U2.in1'], ['C', 'U2.in2'], ['U2', 'U3.in1'], ['U4.out', 'U3.in2'], ['U1', 'U4.in1'], ['U3.out', 'U4.in2'], ['U3', 'L1'], ['U4', 'L2']] });
  var falsch = JSON.parse(JSON.stringify(muster)); falsch.wires = falsch.wires.filter(function (w) { return !(w.from === 'C.out' && w.to === 'U2.in2'); }); falsch.wires.push({ from: 'E1.out', to: 'U2.in2' }); // R wird nicht vom Takt gesperrt
  var st = P.startNetz(2, 2, [{ id: 'C', type: 'logicin', x: 200, y: 380, rot: 0 }]);
  P.station({
    id: 'B2', teil: 'B', nr: 2, titel: 'NOR-AND-Flipflop', kurz: 'Das getaktete NOR-Flipflop',
    einfuehrung: '<p>Das NOR-Flipflop aus B1 reagiert sofort auf jede Änderung von e1 und e2. Oft soll es aber nur zu bestimmten Zeiten übernehmen. Dafür kommt vor jeden Eingang ein <b>UND-Gatter</b>, das den <b>Takt C</b> als zweiten Eingang hat:</p><ul><li><b>C = 0:</b> Beide UND liefern 0, die Eingänge des NOR-Flipflops sind in Ruhe: Das Flipflop <b>speichert</b>.</li><li><b>C = 1:</b> Die UND geben e1 und e2 frei: Es verhält sich wie das NOR-Flipflop aus B1.</li></ul><p>Das ist ein <b>taktzustandsgesteuertes</b> Flipflop: Es folgt den Eingängen, solange C = 1 ist.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B2.1', titel: 'Analysetabelle mit Takt', art: 'tabelle', kopf: an.kopf, zeilen: an.zeilen, text: '<p>Fülle die Analysetabelle des getakteten Flipflops aus: Zu jeder Kombination von C, e1, e2 und AV der Ausgang A. Bei C = 0 ändert sich nichts. Bei C = 1, e1 = 1, e2 = 1 schreibst du <b>X</b> (unzulässig).</p>' },
      { id: 'B2.2', titel: 'NOR-AND-Flipflop bauen', art: 'folge', lesen: ['L1', 'L2'], takt: 'C', nur: ['nor', 'and'], limit: { nor: 2, and: 2 }, min: { nor: 2, and: 2 }, start: st, muster: muster, falsch: falsch,
        schritte: [{ set: { E1: 1, E2: 0 }, takte: 1, erwartet: [1, 0], name: 'C = 1 mit S = 1: Q wird 1' }, { set: { E1: 0, E2: 1 }, erwartet: [1, 0], name: 'R = 1 bei C = 0: Q bleibt' }, { takte: 1, erwartet: [0, 1], name: 'C = 1 mit R = 1: Q wird 0' },
          { set: { E1: 1, E2: 0 }, erwartet: [0, 1], name: 'S = 1 bei C = 0: Q bleibt' }, { takte: 1, erwartet: [1, 0], name: 'C = 1 mit S = 1: Q wird 1' }],
        text: '<p>Baue das Flipflop: zwei <b>UND</b> (e1 mit C, e2 mit C) vor einem NOR-Flipflop aus zwei <b>NOR</b>. <b>E1</b> = S, <b>E2</b> = R, <b>C</b> = Takt; <b>L1</b> zeigt Q, <b>L2</b> zeigt Q̄. Nur UND und NOR sind erlaubt, von jedem höchstens zwei.</p>', hilfe: 'Die UND-Ausgänge sind die Eingänge des NOR-Flipflops aus B1: UND mit e2 geht an NOR 1, UND mit e1 an NOR 2.' },
      { id: 'B2.3', titel: 'Prüffragen getaktetes Flipflop', art: 'fragen', text: '<p>Drei kurze Fragen.</p>', fragen: [
        { q: 'Was tun die beiden UND-Gatter vor dem NOR-Flipflop?', opt: ['Sie invertieren e1 und e2', 'Sie geben e1 und e2 nur bei C = 1 frei', 'Sie speichern', 'Sie erzeugen den Takt'], richtig: 1, erkl: 'Bei C = 0 liefern sie 0: Das NOR-Flipflop sieht keine Eingänge.' },
        { q: 'C = 0, e1 = 1, e2 = 0. Was zeigt Q?', opt: ['Q = 1', 'Q = 0', 'Den alten Wert', 'Unzulässig'], richtig: 2, erkl: 'Ohne Takt ändert sich nichts.' },
        { q: 'Ändert sich e1 von 0 nach 1, während C = 1 ist (Taktzustand). Was passiert mit Q?', opt: ['Nichts', 'Q folgt sofort', 'Q kippt erst bei der nächsten Flanke', 'Unzulässig'], richtig: 1, erkl: 'Taktzustandssteuerung: Solange C = 1, wirken die Eingänge sofort. Das ist der Unterschied zur Flankensteuerung (B3).' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

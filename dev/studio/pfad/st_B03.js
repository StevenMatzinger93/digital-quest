/* Lernpfad Station B3 – Steuerungsarten: Taktzustand gegen Taktflanke, positiv und negativ, preSet und preClear. Alles am D-Flipflop; die Prüfmaschine setzt die Eingänge
 * der Reihe nach (Taktzustand und Flanke lassen sich nur so unterscheiden: D ändert sich, während C = 1 ist) und liest Q. Ab hier stehen alle Flipflop-Bauteile zur Verfügung. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var start = P.startNetz(3, 1, [{ id: 'C', type: 'logicin', x: 200, y: 480, rot: 0 }]);   // E1 = D, E2 = preSet, E3 = preClear, C = Takt, L1 = Q
  function muster(trig) { return P.netz({ n: 3, eingaenge: ['C'], gatter: [['FF1', 'dff', ['E1', 'C', 'E2', 'E3'], { trig: trig }, ['D', 'C', 'PS', 'PC']]], aus: { L1: 'FF1.Q' } }); }
  var S = function (set, erw, name) { return { abfolge: [{ set: set }], erwartet: [erw], name: name }; };
  var FALSCH = { level: 'pos', pos: 'neg', neg: 'level' }; // die falsche Steuerungsart: Der Test muss sie erkennen
  function folge(id, titel, text, trig, schritte, hilfe) {
    var a = { id: id, titel: titel, art: 'folge', lesen: ['L1'], schritte: schritte, start: start, muster: muster(trig), min: { dff: 1 }, text: text, hilfe: hilfe }; if (id !== 'B3.5') a.falsch = muster(FALSCH[trig]); return a;
  }
  var bau = '<p>Setze ein <b>D-Flipflop</b>: <b>E1</b> an D, <b>C</b> an C (Takt), <b>E2</b> an preSet (PS), <b>E3</b> an preClear (PC); <b>L1</b> zeigt Q. Stelle im Eigenschaftenfeld die <b>Steuerungsart</b> ein. Probiere es im Zeitverlauf aus (Rechtsklick auf Anschluss → «Zeitverlauf»), dann lass prüfen.</p>';
  P.station({
    id: 'B3', teil: 'B', nr: 3, titel: 'Steuerungsarten', kurz: 'Taktzustand, Taktflanke, preSet und preClear',
    einfuehrung: '<p>Ein getaktetes Flipflop übernimmt seine Eingänge nicht immer, sondern nur, wenn der <b>Takt</b> C es erlaubt. Es gibt zwei Arten:</p><ul><li><b>Taktzustandssteuerung:</b> Solange C = 1 ist (positiv) beziehungsweise C = 0 (negativ), folgt das Flipflop den Eingängen. Ändert sich D, während C = 1 ist, ändert sich auch Q.</li><li><b>Taktflankensteuerung:</b> Nur im <b>Moment</b> des Wechsels von C wird gelesen: bei der <b>steigenden</b> Flanke (0 → 1, positiv) oder der <b>fallenden</b> (1 → 0, negativ). Danach sind die Eingänge egal, bis zur nächsten Flanke.</li></ul><p>Dazu kommen die <b>asynchronen</b> Eingänge <b>preSet</b> (Q sofort auf 1) und <b>preClear</b> (Q sofort auf 0): Sie wirken ohne Takt und haben Vorrang.</p><p>Ab dieser Station stehen dir alle Flipflop-Bauteile zur Verfügung.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: ['dff', 'tff', 'jkff', 'rsff', 'jkms'], auto: true,
    aufgaben: [
      { id: 'B3.1', titel: 'Prüffragen Steuerungsarten', art: 'fragen', text: '<p>Fünf kurze Fragen.</p>', fragen: [
        { q: 'Ein taktzustandsgesteuertes D-Flipflop (C = 1 aktiv): D ändert sich, während C = 1 ist. Was passiert mit Q?', opt: ['Q bleibt', 'Q folgt D', 'Q kippt', 'Q wird 0'], richtig: 1, erkl: 'Solange der Takt aktiv ist, ist das Flipflop «durchsichtig».' },
        { q: 'Ein flankengesteuertes D-Flipflop (steigende Flanke): D ändert sich, während C = 1 ist. Was passiert mit Q?', opt: ['Q folgt D', 'Q bleibt, bis zur nächsten steigenden Flanke', 'Q wird 1', 'Q wird 0'], richtig: 1, erkl: 'Gelesen wird nur im Moment der Flanke.' },
        { q: 'Bei der negativen Flankensteuerung reagiert das Flipflop auf …', opt: ['0 → 1', '1 → 0', 'C = 1', 'C = 0'], richtig: 1, erkl: 'Negativ heisst: fallende Flanke.' },
        { q: 'preSet setzt Q …', opt: ['bei der nächsten Taktflanke auf 1', 'sofort auf 1, ohne Takt', 'auf D', 'auf Q̄'], richtig: 1, erkl: 'preSet und preClear sind asynchron: Sie wirken unabhängig vom Takt.' },
        { q: 'Welche Steuerung eignet sich für Zähler und Schieberegister, in denen sich Ausgänge zurückkoppeln?', opt: ['Taktzustandssteuerung', 'Taktflankensteuerung', 'Keine', 'Nur preSet'], richtig: 1, erkl: 'Bei Taktzustand würde ein geänderter Ausgang während C = 1 sofort wieder durchlaufen (Rennen).' }] },
      folge('B3.2', 'Taktzustandssteuerung (C = 1)', bau + '<p><b>Steuerungsart:</b> Taktzustand (C = 1).</p>', 'level', [
        S({ E1: 1, C: 1 }, 1, 'C = 1 mit D = 1'), S({ E1: 0 }, 0, 'D → 0 bei C = 1 (Q folgt)'), S({ C: 0 }, 0, 'C → 0'), S({ E1: 1 }, 0, 'D → 1 bei C = 0 (Q bleibt)'), S({ C: 1 }, 1, 'C → 1 (Q übernimmt D)')], 'Bei Taktzustandssteuerung folgt Q dem Eingang D, solange C = 1 ist.'),
      folge('B3.3', 'Steigende Flanke (positiv)', bau + '<p><b>Steuerungsart:</b> Flanke steigend ↑.</p>', 'pos', [
        S({ E1: 1, C: 1 }, 1, 'steigende Flanke mit D = 1'), S({ E1: 0 }, 1, 'D → 0 bei C = 1 (Q bleibt)'), S({ C: 0 }, 1, 'fallende Flanke (nichts)'), S({ C: 1 }, 0, 'steigende Flanke mit D = 0')], 'Q ändert sich nur im Moment des Wechsels von C: 0 → 1.'),
      folge('B3.4', 'Fallende Flanke (negativ)', bau + '<p><b>Steuerungsart:</b> Flanke fallend ↓.</p>', 'neg', [
        S({ E1: 1, C: 1 }, 0, 'steigende Flanke (nichts)'), S({ C: 0 }, 1, 'fallende Flanke mit D = 1'), S({ E1: 0 }, 1, 'D → 0 bei C = 0 (Q bleibt)'), S({ C: 1 }, 1, 'steigende Flanke (nichts)'), S({ C: 0 }, 0, 'fallende Flanke mit D = 0')], 'Q ändert sich nur im Moment des Wechsels von C: 1 → 0.'),
      folge('B3.5', 'preSet und preClear', bau + '<p>Hier prüft die Software die asynchronen Eingänge. Die Steuerungsart ist egal (nimm steigende Flanke).</p>', 'pos', [
        S({ E2: 1 }, 1, 'preSet = 1: Q sofort 1'), S({ E2: 0 }, 1, 'preSet wieder 0: Q bleibt'), S({ E3: 1 }, 0, 'preClear = 1: Q sofort 0'), S({ E3: 0 }, 0, 'preClear wieder 0: Q bleibt'),
        { abfolge: [{ set: { E1: 1 } }, { set: { E3: 1 } }, { set: { C: 1 } }], erwartet: [0], name: 'preClear = 1 und steigende Flanke mit D = 1: preClear hat Vorrang' }], 'preSet und preClear brauchen keinen Takt und gehen dem Takt vor.')
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

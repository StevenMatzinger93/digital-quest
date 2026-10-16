/* Lernpfad Station B7 – JK-Flipflop. Dazu das JK-Master-Slave-Flipflop und das Problem des «1s-Catching». */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var start = P.startNetz(2, 1, [{ id: 'C', type: 'logicin', x: 200, y: 380, rot: 0 }]);   // E1 = J, E2 = K, C = Takt, L1 = Q
  function ms(typ) { return P.netz({ n: 2, eingaenge: ['C'], gatter: [['FF1', typ, ['E1', 'E2', 'C'], null, ['J', 'K', 'C']]], aus: { L1: 'FF1.Q' } }); }
  P.ffStation({
    id: 'B7', nr: 7, titel: 'JK-Flipflop', kurz: 'Das Universal-Flipflop, JK-Master-Slave und 1s-Catching', typ: 'jkff', ein: ['J', 'K'], next: P.FF.jk,
    plan: [{ set: { E1: 1, E2: 0 }, takte: 1 }, { set: { E1: 0 }, takte: 1 }, { set: { E2: 1 }, takte: 1 }, { set: { E2: 0 }, takte: 2 }, { set: { E1: 1, E2: 1 }, takte: 1 }, { takte: 1 }, { takte: 1 }, { set: { E1: 0, E2: 0 }, takte: 2 }],
    einfuehrung: '<p>Das <b>JK-Flipflop</b> ist das vielseitigste: <b>J</b> setzt, <b>K</b> setzt zurück, <b>J = K = 0</b> hält, und <b>J = K = 1 kippt</b> (statt des unzulässigen Zustands beim RS-Flipflop). Es lässt sich durch Verdrahtung zu jedem anderen Flipflop machen: Mit J = K = T wird es zum T-Flipflop.</p><p>Ist ein JK-Flipflop <b>taktzustandsgesteuert</b> und J = K = 1, kippt es, solange C = 1 ist, immer wieder (es «rennt»). Darum gibt es das <b>JK-Master-Slave-Flipflop</b>: Zwei Flipflops hintereinander, der <b>Master</b> nimmt die Eingänge bei C = 1 auf, der <b>Slave</b> übernimmt sie erst bei der <b>fallenden</b> Flanke von C. So kippt es höchstens einmal pro Takt. Sein Nachteil ist das <b>1s-Catching</b> (siehe unten).</p>',
    analyseHilfe: 'J = 1, K = 0 setzt. J = 0, K = 1 setzt zurück. J = K = 1 kippt. J = K = 0 hält.',
    extra: [
      { titel: 'JK-Master-Slave: Ausgang ändert bei fallender Flanke', art: 'folge', lesen: ['L1'], start: start, muster: ms('jkms'), min: { jkms: 1 }, falsch: ms('jkff'),
        schritte: [{ abfolge: [{ set: { E1: 1, E2: 1 } }, { set: { C: 1 } }], erwartet: [0], name: 'C = 1 mit J = K = 1 (Master nimmt auf, Q noch alt)' }, { abfolge: [{ set: { C: 0 } }], erwartet: [1], name: 'fallende Flanke: Slave übernimmt, Q kippt' },
          { abfolge: [{ set: { C: 1 } }], erwartet: [1], name: 'C = 1 (Q noch alt)' }, { abfolge: [{ set: { C: 0 } }], erwartet: [0], name: 'fallende Flanke: Q kippt zurück' }],
        text: '<p>Setze ein <b>JK-MS-Flipflop</b>: <b>E1</b> an J, <b>E2</b> an K, <b>C</b> an C, <b>L1</b> zeigt Q. Bei J = K = 1 darf sich Q nur bei der <b>fallenden</b> Flanke von C ändern, nicht, wenn C auf 1 geht.</p>', hilfe: 'Verwende das Bauteil «JK-MS-Flipflop» (nicht das normale JK).' },
      { titel: '1s-Catching zeigen', art: 'folge', lesen: ['L1'], start: start, muster: ms('jkms'), min: { jkms: 1 }, falsch: ms('jkff'),
        schritte: [{ abfolge: [{ set: { C: 1 } }, { set: { E1: 1 } }, { set: { E1: 0 } }, { set: { C: 0 } }], erwartet: [1], name: 'C = 1, J kurz auf 1 und wieder 0, dann C = 0: der Slave übernimmt die «gefangene» 1' }],
        text: '<p><b>1s-Catching</b>: Der Master merkt sich <b>jede</b> 1 an J, die er bei C = 1 sieht – auch einen kurzen Störimpuls, der schon wieder weg ist. Bei der fallenden Flanke wird sie an den Ausgang weitergegeben.</p><p>Verwende dasselbe Bauteil wie in der Aufgabe davor (JK-MS-Flipflop) und zeige den Effekt: Ausgangslage Q = 0, J = 0, K = 0, C = 0. Setze C auf 1, schalte J <b>kurz auf 1 und gleich wieder auf 0</b> und nimm C auf 0. Q sollte jetzt <b>1</b> sein, obwohl J am Ende der Taktzeit 0 war. Ein normales flankengesteuertes JK-Flipflop würde das nicht tun – die Software prüft das mit.</p>', hilfe: 'Der Master reagiert auf J = 1, solange C = 1 ist, und hält es fest.' }
    ],
    fragen: [
      { q: 'Wie verhält sich ein JK-Flipflop bei J = 1 und K = 1?', opt: ['Es setzt Q', 'Es setzt Q zurück', 'Es kippt Q', 'Es hält Q'], richtig: 2, erkl: 'J = K = 1 kippt, anders als beim RS-Flipflop ist die Eingabe zulässig.' },
      { q: 'Wie wird aus einem JK-Flipflop ein T-Flipflop?', opt: ['J und K verbinden und T nennen', 'J auf 1, K auf 0', 'K auf 1, J offen', 'Gar nicht'], richtig: 0, erkl: 'J = K = T: Bei T = 1 kippt es, bei T = 0 hält es.' },
      { q: 'Wozu dient das Master-Slave-Prinzip?', opt: ['Es macht das Flipflop schneller', 'Es verhindert das mehrfache Kippen während eines Takts (Rennen)', 'Es spart Gatter', 'Es setzt den Zustand zurück'], richtig: 1, erkl: 'Der Ausgang ändert sich erst nach dem Takt (fallende Flanke), nie mitten im aktiven Takt.' },
      { q: 'Was ist das 1s-Catching?', opt: ['Der Master merkt sich eine kurze Störung an J oder K während C = 1', 'Das Flipflop fängt Daten zu spät', 'Der Ausgang hängt an 1', 'Ein Kurzschluss'], richtig: 0, erkl: 'Auch ein kurzer Impuls bei aktivem Takt wird gefangen und beim Takt-Ende ausgegeben.' }]
  });
})(typeof window !== 'undefined' ? window : globalThis);

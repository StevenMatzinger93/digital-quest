/* Lernpfad Station B6 – RS-Flipflop (getaktet, Bauteil «RS-Flipflop») mit dem unzulässigen Zustand S = R = 1. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  P.ffStation({
    id: 'B6', nr: 6, titel: 'RS-Flipflop', kurz: 'Setzen, Rücksetzen – und der unzulässige Zustand', typ: 'rsff', ein: ['S', 'R'], next: P.FF.rs, unzulaessig: true,
    plan: [{ set: { E1: 1, E2: 0 }, takte: 1 }, { set: { E1: 0 }, takte: 1 }, { set: { E2: 1 }, takte: 1 }, { set: { E2: 0 }, takte: 2 }, { set: { E1: 1 }, takte: 1 }, { set: { E1: 0, E2: 1 }, takte: 1 }],
    einfuehrung: '<p>Das <b>RS-Flipflop</b> hat zwei Eingänge: <b>S</b> (Set, setzt Q auf 1) und <b>R</b> (Reset, setzt Q auf 0). Bei S = R = 0 bleibt der Zustand. Bei <b>S = R = 1</b> ist der Zustand <b>unzulässig</b>: Die Schaltung soll gleichzeitig setzen und rücksetzen. Bei der NOR-Schaltung sind dann beide Ausgänge 0, und was nach dem Loslassen geschieht, hängt davon ab, welcher Eingang zuerst zurückgeht – das ist Zufall. Diese Eingabe vermeidet man.</p><p>Das Bauteil im Studio meldet die Eingabe S = R = 1 als <b>Störung</b>.</p>',
    analyseHilfe: 'S = 1 setzt, R = 1 setzt zurück, beide 0 halten. Bei S = R = 1 schreibst du X.',
    fragen: [
      { q: 'Welche Eingangskombination ist beim RS-Flipflop unzulässig?', opt: ['S = 0, R = 0', 'S = 1, R = 0', 'S = 0, R = 1', 'S = 1, R = 1'], richtig: 3, erkl: 'Setzen und Rücksetzen gleichzeitig.' },
      { q: 'Beim NOR-Flipflop liefert S = R = 1 …', opt: ['Q = 1, Q̄ = 0', 'Q = 0, Q̄ = 1', 'Q = 0 und Q̄ = 0 – kein Gegenstück', 'Q = 1 und Q̄ = 1'], richtig: 2, erkl: 'Jedes NOR sieht eine 1 an einem Eingang: Beide Ausgänge werden 0.' },
      { q: 'Was folgt aus dem unzulässigen Zustand nach dem Loslassen beider Eingänge zugleich?', opt: ['Q = 1', 'Q = 0', 'Unbestimmt', 'Q kippt'], richtig: 2, erkl: 'Beide Gatter versuchen gleichzeitig zu kippen: Das Ergebnis hängt von kleinsten Laufzeitunterschieden ab.' },
      { q: 'Was bewirken S = 0 und R = 0?', opt: ['Q wird 0', 'Q wird 1', 'Der Zustand bleibt', 'Unzulässig'], richtig: 2, erkl: 'Beide Eingänge in Ruhe: Speichern.' }]
  });
})(typeof window !== 'undefined' ? window : globalThis);

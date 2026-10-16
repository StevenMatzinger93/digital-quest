/* Lernpfad Station A6 – Positive und negative Logik. Die Dualität wird gerechnet (f_neg(e) = NICHT f(NICHT e)) und mit den Gatter-Tabellen verglichen; nichts ist von Hand eingetippt. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var G = { 'Trennstufe': [1, function (e) { return e[0]; }], 'NICHT': [1, function (e) { return 1 - e[0]; }], 'UND': [2, function (e) { return e[0] & e[1]; }], 'NAND': [2, function (e) { return 1 - (e[0] & e[1]); }],
    'ODER': [2, function (e) { return e[0] | e[1]; }], 'NOR': [2, function (e) { return 1 - (e[0] | e[1]); }], 'XOR': [2, function (e) { return e[0] ^ e[1]; }], 'XNOR': [2, function (e) { return 1 - (e[0] ^ e[1]); }] };
  function tabOf(n, f) { var t = []; for (var k = 0; k < (1 << n); k++) { var e = []; for (var i = 0; i < n; i++) e.push(k >> i & 1); t.push(f(e)); } return t.join(''); }
  function dual(name) { var n = G[name][0], f = G[name][1]; return function (e) { return 1 - f(e.map(function (x) { return 1 - x; })); }; } // negative Logik: alle Pegel gelesen als 1 − Wert
  function nameDer(n, f) { var t = tabOf(n, f); return Object.keys(G).filter(function (k) { return G[k][0] === n && tabOf(n, G[k][1]) === t; })[0]; }
  var NAMEN = Object.keys(G), REIHE = ['UND', 'ODER', 'NAND', 'NOR', 'XOR', 'NICHT', 'XNOR', 'Trennstufe'];
  var zuord = { kopf: ['In positiver Logik (H = 1) ist es ein …', 'In negativer Logik (H = 0) ist dasselbe Bauteil ein …'], zeilen: REIHE.map(function (n) { return [n, { a: nameDer(G[n][0], dual(n)), typ: 'wahl', opt: NAMEN }]; }) };
  // Pegeltabelle: dasselbe Bauteil, einmal H = 1 und einmal H = 0 gelesen
  function pegel(name) {
    var f = G[name][1], zeilen = []; for (var k = 0; k < 4; k++) { var e = [k >> 1 & 1, k & 1], h = function (v) { return v ? 'H' : 'L'; };
      zeilen.push([h(e[0]), h(e[1]), h(f(e)), { a: String(f(e)), typ: 'bit' }, { a: String(1 - f(e)), typ: 'bit' }]); }
    return { kopf: ['e1 (Pegel)', 'e2 (Pegel)', 'A (Pegel)', 'A in positiver Logik', 'A in negativer Logik'], zeilen: zeilen };
  }
  var pu = pegel('UND'), px = pegel('XOR');
  var gate1 = { 'e': 'UND' }, dualOf = function (n) { return nameDer(G[n][0], dual(n)); };
  P.station({
    id: 'A6', teil: 'A', nr: 6, titel: 'Positive und negative Logik', kurz: 'H = 1 oder H = 0 – dasselbe Bauteil, zwei Lesarten',
    einfuehrung: '<p>Ein Gatter kennt nur zwei Spannungspegel: <b>H</b> (hoch) und <b>L</b> (tief). Ob H eine 1 oder eine 0 bedeutet, ist Vereinbarung:</p><ul><li><b>positive Logik:</b> H = 1, L = 0</li><li><b>negative Logik:</b> H = 0, L = 1</li></ul><p>Das Bauteil bleibt dasselbe, nur die Lesart ändert sich. Ein Gatter, das in positiver Logik ein UND ist, ist in negativer Logik ein <b>ODER</b> (und umgekehrt). Die Regel: Man vertauscht in der Wahrheitstabelle alle 0 und 1, am Eingang <b>und</b> am Ausgang.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A6.1', titel: 'Zuordnung: positive und negative Logik', art: 'tabelle', text: '<p>Ein Bauteil arbeitet in positiver Logik als das links genannte Gatter. Was ist es in negativer Logik?</p>', kopf: zuord.kopf, zeilen: zuord.zeilen, hilfe: 'Tabelle aufschreiben, überall 0 und 1 vertauschen, dann das Gatter mit dieser Tabelle suchen.' },
      { id: 'A6.2', titel: 'Pegeltabelle lesen (Bauteil 1)', art: 'tabelle', text: '<p>Ein Gatter wurde im Labor ausgemessen. Die Pegel stehen links. Schreibe den Ausgang A einmal in <b>positiver</b> und einmal in <b>negativer</b> Logik (nur A, die Eingänge liest du gleich mit). Dann weisst du, welches Gatter es in der jeweiligen Lesart ist.</p>', kopf: pu.kopf, zeilen: pu.zeilen },
      { id: 'A6.3', titel: 'Welches Gatter ist Bauteil 1?', art: 'fragen', text: '<p>Aus der Tabelle der Aufgabe A6.2:</p>', fragen: [
        { q: 'In positiver Logik ist Bauteil 1 ein …', opt: NAMEN, richtig: NAMEN.indexOf('UND'), erkl: 'Nur bei H H gibt es H: UND.' },
        { q: 'In negativer Logik ist Bauteil 1 ein …', opt: NAMEN, richtig: NAMEN.indexOf(dualOf('UND')), erkl: 'Alle Pegel umgedeutet: Der Ausgang ist 1 (also L), sobald mindestens ein Eingang 1 (also L) ist: ODER.' }] },
      { id: 'A6.4', titel: 'Pegeltabelle lesen (Bauteil 2)', art: 'tabelle', text: '<p>Dasselbe mit einem zweiten, anderen Bauteil.</p>', kopf: px.kopf, zeilen: px.zeilen },
      { id: 'A6.5', titel: 'Schaltung für negative Logik bauen', art: 'schaltung', n: 2, ausgaenge: 1, f: dual('UND'), min: (function () { var m = {}; m[{ ODER: 'or', UND: 'and', NAND: 'nand', NOR: 'nor', XOR: 'xor', XNOR: 'xnor', NICHT: 'not' }[dualOf('UND')]] = 1; return m; })(), start: P.startNetz(2, 1),
        text: '<p>In einem Gerät gilt <b>negative Logik</b> (H = 0). Dort soll an der Anzeige L1 ein <b>UND</b> von E1 und E2 entstehen. Die Pegelschalter und die Anzeige sind hier in positiver Logik beschriftet; du baust das Bauteil, das <b>physisch</b> die richtigen Pegel liefert. Welches Gatter brauchst du?</p><p>Tipp: Rechne die UND-Tabelle in negative Logik um und baue dann das Gatter mit dieser Tabelle.</p>', hilfe: 'Die Pegelschalter und die Anzeige lesen H als 1. Gesucht ist die Funktion, die du an diesen Pegeln bauen musst.' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

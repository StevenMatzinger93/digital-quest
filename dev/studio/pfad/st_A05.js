/* Lernpfad Station A5 – Die acht Gatter (Teil A, stationäre Vorgänge). Muster für alle Stationen: nur Daten, die Oberfläche zeichnet ui.js.
 * Je Gatter drei Aufgaben: Wahrheitstabelle ausfüllen, booleschen Ausdruck angeben, Schaltung bauen und prüfen lassen. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  // Name, Typ im Studio, Anzahl Eingänge, Funktion (e → 0/1), Ausdruck in Stevens Schreibweise (ODER = v, UND nebeneinander, NICHT = Überstreichung, getippt /), Satz zur Funktion
  var GATTER = [
    ['Trennstufe', null, 1, function (e) { return e[0]; }, 'e1', 'Die Trennstufe (Treiber) gibt den Eingang unverändert weiter, sie verstärkt nur das Signal. Der Ausgang ist 1, wenn der Eingang 1 ist.'],
    ['NICHT', 'not', 1, function (e) { return 1 - e[0]; }, '/e1', 'Der Ausgang ist das Gegenteil des Eingangs.'],
    ['UND', 'and', 2, function (e) { return e[0] & e[1]; }, 'e1e2', 'Der Ausgang ist nur 1, wenn beide Eingänge 1 sind.'],
    ['NAND', 'nand', 2, function (e) { return 1 - (e[0] & e[1]); }, '/(e1e2)', 'Der Ausgang ist nur 0, wenn beide Eingänge 1 sind – ein UND mit nachgeschaltetem NICHT.'],
    ['ODER', 'or', 2, function (e) { return e[0] | e[1]; }, 'e1 v e2', 'Der Ausgang ist 1, wenn mindestens ein Eingang 1 ist.'],
    ['NOR', 'nor', 2, function (e) { return 1 - (e[0] | e[1]); }, '/(e1 v e2)', 'Der Ausgang ist nur 1, wenn beide Eingänge 0 sind – ein ODER mit nachgeschaltetem NICHT.'],
    ['XOR', 'xor', 2, function (e) { return e[0] ^ e[1]; }, 'e1/e2 v /e1e2', 'Der Ausgang ist 1, wenn die Eingänge verschieden sind (Antivalenz).'],
    ['XNOR', 'xnor', 2, function (e) { return 1 - (e[0] ^ e[1]); }, 'e1e2 v /e1/e2', 'Der Ausgang ist 1, wenn die Eingänge gleich sind (Äquivalenz).']
  ];
  var aufgaben = [], nr = 0;
  GATTER.forEach(function (g) {
    var name = g[0], typ = g[1], n = g[2], f = g[3], ref = g[4], satz = g[5], kopf = [], zeilen = [], i, k;
    for (i = 1; i <= n; i++) kopf.push('e' + i); kopf.push('A');
    for (k = 0; k < (1 << n); k++) { var e = []; for (i = 0; i < n; i++) e.push(k >> (n - 1 - i) & 1); // Tabelle wie im Arbeitsblatt: e1 links, zählt von oben nach unten dual hoch
      zeilen.push(e.map(String).concat([{ a: String(f(e)), typ: 'bit' }])); }
    aufgaben.push({ id: 'A5.' + (++nr), titel: name + ': Wahrheitstabelle', art: 'tabelle',
      text: '<p>' + satz + '</p><p>Fülle die Spalte <b>A</b> aus (0 oder 1).</p>', kopf: kopf, zeilen: zeilen });
    aufgaben.push({ id: 'A5.' + (++nr), titel: name + ': Boolescher Ausdruck', art: 'ausdruck', n: n, ref: ref, nurGleich: true,
      text: '<p>Gib den booleschen Ausdruck für das ' + name + (typ ? '-Gatter' : '') + ' an. <b>ODER</b> schreibst du <b>v</b>, <b>UND</b> durch Nebeneinanderstellen (<code>e1e2</code>), <b>NICHT</b> mit einem Schrägstrich vor dem Glied (<code>/e1</code>); der Strich wird als Überstreichung dargestellt. UND geht vor ODER.</p>',
      hilfe: 'Lies den Ausdruck aus deiner Wahrheitstabelle ab: Jede Zeile mit A = 1 ist ein UND-Glied, alle Glieder sind mit ODER verbunden.' });
    var muster = typ ? P.netz({ n: n, gatter: [['U1', typ, n === 1 ? ['E1'] : ['E1', 'E2']]], aus: { L1: 'U1' } })
      : P.netz({ n: 1, gatter: [['U1', 'not', ['E1']], ['U2', 'not', ['U1']]], aus: { L1: 'U2' } });
    var soll = []; for (k = 0; k < (1 << n); k++) { var ee = []; for (i = 0; i < n; i++) ee.push(k >> i & 1); soll.push([f(ee)]); }
    aufgaben.push({ id: 'A5.' + (++nr), titel: name + ': Schaltung bauen', art: 'schaltung', n: n, ausgaenge: 1, soll: soll,
      min: typ ? (function () { var m = {}; m[typ] = 1; return m; })() : { gates: 1 },
      start: P.startNetz(n, 1),
      text: '<p>Baue ' + (typ ? 'ein <b>' + name + '</b>-Gatter' : 'eine <b>Trennstufe</b> (zwei NICHT-Glieder hintereinander)') + ' zwischen ' + (n === 1 ? 'den Pegelschalter <b>E1</b>' : 'die Pegelschalter <b>E1</b> und <b>E2</b>') + ' und die Logikanzeige <b>L1</b>. Schalte die Eingänge durch und lass die Schaltung dann prüfen.</p><p>Jeder Eingang eines Gatters muss angeschlossen sein.</p>',
      hilfe: 'Bauteil in der Leiste anklicken, auf die Fläche setzen, dann von Anschluss zu Anschluss eine Leitung ziehen.', muster: muster });
  });
  P.station({
    id: 'A5', teil: 'A', nr: 5, titel: 'Die acht Gatter', kurz: 'Trennstufe, NICHT, UND, NAND, ODER, NOR, XOR, XNOR',
    einfuehrung: '<p>Alle digitalen Schaltungen bestehen aus wenigen Grundbausteinen, den <b>Gattern</b>. Zu jedem Gatter gehören drei Beschreibungen, und du lernst sie hier alle drei: die <b>Wahrheitstabelle</b> (was kommt heraus?), der <b>boolesche Ausdruck</b> (wie schreibt man das auf?) und die <b>Schaltung</b> (wie baut man es?).</p><p>Pro Gatter drei Aufgaben. Die Wahrheitstabelle füllst du ein, den Ausdruck tippst du ein, die Schaltung baust du im Editor, und die Software rechnet nach.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: ['logicin', 'logicled', 'ground', 'node', 'not', 'and', 'or', 'nand', 'nor', 'xor', 'xnor'], auto: true,
    aufgaben: aufgaben
  });
})(typeof window !== 'undefined' ? window : globalThis);

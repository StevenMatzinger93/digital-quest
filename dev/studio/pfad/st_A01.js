/* Lernpfad Station A1 – Zahlensysteme. Die Tabellen werden aus den Zahlen gerechnet (P.dual, P.hex), nicht von Hand abgetippt. */
(function (root) {
  'use strict';
  var P = root.DQPfad, D = P.dual, H = P.hex;
  function tab(kopf, werte, gegeben, stellen) { // gegeben: 'dez' | 'dual' | 'hex'; die anderen beiden Spalten sind auszufüllen
    var zeilen = werte.map(function (v) {
      var z = { dez: String(v), dual: D(v, stellen), hex: H(v) }, a = { dez: { a: String(v), typ: 'dez' }, dual: { a: D(v, stellen), typ: 'bin' }, hex: { a: H(v), typ: 'hex' } };
      return ['dez', 'dual', 'hex'].map(function (k) { return k === gegeben ? z[k] : a[k]; });
    });
    return { kopf: kopf, zeilen: zeilen };
  }
  var K = ['Dezimal', 'Dual', 'Hexadezimal'], t1 = tab(K, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 'dez', 4), t2 = tab(K, [45, 100, 129, 255, 16, 170, 127, 204], 'dual', 8),
    t3 = tab(K, [31, 60, 165, 255, 128, 183], 'hex', 8), t4 = tab(K, [37, 100, 200, 77, 1000, 4095], 'dez', 0);
  P.station({
    id: 'A1', teil: 'A', nr: 1, titel: 'Zahlensysteme', kurz: 'Dezimal, Dual, Hexadezimal – ohne Rechner',
    einfuehrung: '<p>Ein Computer kennt nur zwei Zustände: aus (0) und ein (1). Alle Zahlen werden deshalb im <b>Dualsystem</b> geschrieben. Weil lange Dualzahlen unlesbar sind, fasst man je vier Stellen zu einer <b>Hexadezimalziffer</b> (0 bis 9, A bis F) zusammen.</p>' +
      '<p>Wertigkeiten im Dualsystem von rechts nach links: 1, 2, 4, 8, 16, 32, 64, 128 … Die Dualzahl <code>1011</code> ist also 8 + 2 + 1 = 11. Von Dezimal nach Dual geht es mit fortgesetzter Division durch 2 (die Reste von unten nach oben lesen) oder durch Abziehen der grössten Zweierpotenz.</p><p><b>Ohne Taschenrechner.</b> Führende Nullen darfst du weglassen oder hinschreiben.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A1.1', titel: 'Dezimal 0 bis 15', art: 'tabelle', text: '<p>Fülle die Tabelle aus: Dual (vierstellig) und Hexadezimal zu jeder Dezimalzahl von 0 bis 15.</p>', kopf: t1.kopf, zeilen: t1.zeilen, hilfe: 'Wertigkeiten 8 – 4 – 2 – 1: Welche davon brauchst du, um die Zahl zusammenzusetzen?' },
      { id: 'A1.2', titel: 'Dual nach Dezimal und Hex', art: 'tabelle', text: '<p>Die Dualzahlen sind achtstellig (ein Byte). Gib Dezimal und Hexadezimal an. Tipp: Teile die acht Stellen in zwei Vierergruppen, jede Gruppe ist eine Hexadezimalziffer.</p>', kopf: t2.kopf, zeilen: t2.zeilen, hilfe: 'Zuerst die zwei Vierergruppen einzeln in Hex umwandeln, dann zusammensetzen.' },
      { id: 'A1.3', titel: 'Hex nach Dezimal und Dual', art: 'tabelle', text: '<p>Gegeben ist die Hexadezimalzahl. Jede Ziffer wird zu vier Dualstellen. Dezimal: erste Ziffer mal 16 plus zweite Ziffer.</p>', kopf: t3.kopf, zeilen: t3.zeilen, hilfe: 'A = 10, B = 11, C = 12, D = 13, E = 14, F = 15.' },
      { id: 'A1.4', titel: 'Grössere Zahlen', art: 'tabelle', text: '<p>Dezimal nach Dual und Hex, jetzt mit mehr als einem Byte. Die Zahl 4095 hat einen besonderen Grund, in Hex so auszusehen, wie sie aussieht.</p>', kopf: t4.kopf, zeilen: t4.zeilen, hilfe: 'Fortgesetzte Division durch 2: die Reste von unten nach oben lesen. Oder durch 16 dividieren für Hex.' },
      { id: 'A1.5', titel: 'Prüffragen Zahlensysteme', art: 'fragen', text: '<p>Fünf kurze Fragen.</p>', fragen: [
        { q: 'Wie viele verschiedene Werte kann ein Wort aus 4 Bit annehmen?', opt: ['8', '15', '16', '32'], richtig: 2, erkl: '4 Bit sind 2⁴ = 16 Kombinationen (0 bis 15).' },
        { q: 'Welches ist der grösste Wert, den ein Byte (8 Bit) darstellen kann?', opt: ['127', '255', '256', '1023'], richtig: 1, erkl: 'Acht Einsen sind 128 + 64 + … + 1 = 255.' },
        { q: 'Wie viele Dualstellen entsprechen einer Hexadezimalziffer?', opt: ['2', '3', '4', '8'], richtig: 2, erkl: 'Eine Hexadezimalziffer hat 16 Werte, das sind genau 4 Bit.' },
        { q: 'Welche Dezimalzahl ist die Dualzahl 1000?', opt: ['4', '8', '10', '1000'], richtig: 1, erkl: 'Die einzige Eins hat die Wertigkeit 8.' },
        { q: 'Welche Ziffern gibt es im Hexadezimalsystem?', opt: ['0 bis 9', '0 bis 9 und A bis F', '0 bis 7', '0 und 1'], richtig: 1, erkl: 'Sechzehn Ziffern: 0 bis 9 und A bis F.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Lernpfad Station A11 – Code und Codewandler: BCD, 3-Exzess, Gray. Pflicht: Codewandler 3-Exzess nach BCD (Wahrheitstabelle, vier KV-Diagramme mit Don't-Care, Schaltung).
 * Eingänge der Schaltung: E1 = Wertigkeit 1 … E4 = Wertigkeit 8; Ausgänge L1 = Wertigkeit 1 … L4 = Wertigkeit 8. Tabellen: höchste Wertigkeit links.
 * Alles wird aus der Definition gerechnet: 3-Exzess-Wort w ist gültig für 3 ≤ w ≤ 12, die Ziffer ist w − 3; sonst Don't-Care. */
(function (root) {
  'use strict';
  var P = root.DQPfad, D = P.dual;
  var bcd = function (w) { return w >= 3 && w <= 12 ? w - 3 : 'X'; };
  // Aufgabe 1: Codetabelle 0…9
  var codes = { kopf: ['Dezimal', 'BCD', '3-Exzess', 'Gray'], zeilen: [] };
  for (var d = 0; d <= 9; d++) codes.zeilen.push([String(d), { a: D(d, 4), typ: 'bin' }, { a: D(d + 3, 4), typ: 'bin' }, { a: D(P.gray(d), 4), typ: 'bin' }]);
  // Aufgabe 2: Wahrheitstabelle 3-Exzess → BCD. Tabelle: Wort w = [d c b a] (MSB zuerst); Ausgänge A4 … A1
  var wt = P.wahrheit({ ein: ['d', 'c', 'b', 'a'], aus: ['A4', 'A3', 'A2', 'A1'], f: function (e) { var v = bcd(P.wertMSB(e)); return v === 'X' ? ['X', 'X', 'X', 'X'] : [v >> 3 & 1, v >> 2 & 1, v >> 1 & 1, v & 1]; } });
  // Soll für die Schaltung (e1 = Bit 0): Ausgang j = Bit j der Ziffer
  var sollF = function (e) { var v = bcd(P.wertLSB(e)); return v === 'X' ? ['X', 'X', 'X', 'X'] : [v & 1, v >> 1 & 1, v >> 2 & 1, v >> 3 & 1]; };
  var kvs = [1, 2, 4, 8].map(function (wert, j) {
    var ones = P.einsen(4, sollF, j), dc = P.dcs(4, sollF, j);
    return { id: 'A11.' + (3 + j), titel: 'KV-Diagramm für A' + wert, art: 'kv', n: 4, ones: ones, dc: dc, buchstaben: P.KONV.buchstaben.slice(0, 4),
      text: '<p>Der Codewandler 3-Exzess → BCD hat für das Ausgangsbit <b>A' + wert + '</b> (Wertigkeit ' + wert + ') die Einsen <b>m(' + ones.join(', ') + ')</b>. Die Codewörter 0, 1, 2 und 13, 14, 15 kommen im 3-Exzess-Code nicht vor: Das sind die <b>Don\'t-Care</b> <b>d(' + dc.join(', ') + ')</b>. Zeichne die Päckchen (X darfst du dazunehmen) und gib die Minimalform an. a ist das niedrigste, d das höchste Bit des Codeworts.</p>',
      hilfe: 'Ein X darfst du in ein Päckchen aufnehmen, wenn es dadurch grösser wird. Musst du aber nicht.' };
  });
  var gr = P.wahrheit({ ein: ['b3', 'b2', 'b1', 'b0'], aus: ['g3', 'g2', 'g1', 'g0'], f: function (e) { var g = P.gray(P.wertMSB(e)); return [g >> 3 & 1, g >> 2 & 1, g >> 1 & 1, g & 1]; } });
  var xo = function (a, b) { return a ^ b; };
  P.station({
    id: 'A11', teil: 'A', nr: 11, titel: 'Code und Codewandler', kurz: 'BCD, 3-Exzess, Gray – und ein Codewandler selbst gebaut',
    einfuehrung: '<p>Zahlen lassen sich auf viele Arten als Bitmuster schreiben – das sind <b>Codes</b>:</p><ul><li><b>BCD</b> (binary coded decimal): Jede Dezimalziffer wird einzeln als Dualzahl mit 4 Bit geschrieben. 57 ist 0101 0111.</li><li><b>3-Exzess:</b> wie BCD, aber zur Ziffer wird 3 addiert (Ziffer 0 = 0011). Praktisch beim Rechnen, weil der Übertrag bei der Addition von selbst entsteht.</li><li><b>Gray-Code:</b> Von einem Wert zum nächsten ändert sich <b>immer nur ein Bit</b>. Wichtig für Positionsgeber, weil beim Umschalten nie ein falscher Zwischenwert gelesen wird.</li></ul><p>Ein <b>Codewandler</b> ist eine Schaltung, die ein Codewort in ein anderes übersetzt. Du baust den Wandler 3-Exzess → BCD: Tabelle, Vereinfachung mit dem KV-Diagramm (die unmöglichen Codewörter sind Don\'t-Care) und Schaltung.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A11.1', titel: 'Codetabelle 0 bis 9', art: 'tabelle', kopf: codes.kopf, zeilen: codes.zeilen, text: '<p>Fülle BCD, 3-Exzess und Gray (alle vierstellig) für die Dezimalziffern 0 bis 9 aus.</p>', hilfe: 'BCD = die Dualzahl. 3-Exzess: Ziffer plus 3, dann dual. Gray: Das höchste Bit bleibt, jedes weitere Bit = Dualbit XOR das Dualbit links davon.' },
      { id: 'A11.2', titel: 'Wahrheitstabelle 3-Exzess → BCD', art: 'tabelle', kopf: wt.kopf, zeilen: wt.zeilen,
        text: '<p>Eingang ist ein Codewort im <b>3-Exzess-Code</b> (d c b a, d hat die Wertigkeit 8), Ausgang ist die Ziffer als <b>BCD</b> (A4 A3 A2 A1). Für Codewörter, die im 3-Exzess nicht vorkommen (0000 bis 0010 und 1101 bis 1111), schreibst du <b>X</b> (beliebig).</p>', hilfe: 'Codewort 0011 ist die Ziffer 0, also BCD 0000. Codewort 1100 ist die Ziffer 9, also BCD 1001.' }
    ].concat(kvs, [
      { id: 'A11.7', titel: 'Schaltung 3-Exzess → BCD', art: 'schaltung', n: 4, ausgaenge: 4, soll: P.sollAus(4, sollF), start: P.startNetz(4, 4),
        muster: P.netzMinimal(4, [1, 2, 4, 8].map(function (w, j) { return { ones: P.einsen(4, sollF, j), dc: P.dcs(4, sollF, j) }; })),
        text: '<p>Baue den Codewandler <b>3-Exzess → BCD</b>. Die Eingänge E1 bis E4 sind das Codewort (E1 = Wertigkeit 1, E4 = Wertigkeit 8), die Anzeigen L1 bis L4 die BCD-Ziffer (L1 = Wertigkeit 1, L4 = Wertigkeit 8). Bei den Codewörtern 0 bis 2 und 13 bis 15 darf die Anzeige zeigen, was sie will. Nimm die Minimalformen aus den KV-Diagrammen.</p>', hilfe: 'Vier Ausgänge, vier Schaltungen: Gemeinsame NICHT-Glieder für e1 bis e4 darfst du von allen Ausgängen aus benutzen.' },
      { id: 'A11.8', titel: 'Dual → Gray: Tabelle', pflicht: false, art: 'tabelle', kopf: gr.kopf, zeilen: gr.zeilen, text: '<p><b>Freiwillig.</b> Wandle vierstellige Dualzahlen (b3 b2 b1 b0) in Gray-Code (g3 g2 g1 g0) um. Prüfe: Zwischen zwei aufeinanderfolgenden Zeilen ändert sich in der Gray-Spalte genau ein Bit.</p>' },
      { id: 'A11.9', titel: 'Dual → Gray: Schaltung', pflicht: false, art: 'schaltung', n: 4, ausgaenge: 4, soll: P.sollAus(4, function (e) { var g = P.gray(P.wertLSB(e)); return [g & 1, g >> 1 & 1, g >> 2 & 1, g >> 3 & 1]; }), start: P.startNetz(4, 4),
        muster: P.netz({ n: 4, gatter: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['E2', 'E3']], ['U3', 'xor', ['E3', 'E4']]], aus: { L1: 'U1', L2: 'U2', L3: 'U3', L4: 'E4' } }),
        text: '<p><b>Freiwillig.</b> Baue den Wandler Dual → Gray: E1 bis E4 sind b0 bis b3, die Anzeigen L1 bis L4 g0 bis g3. Mit XOR-Gattern geht es sehr einfach.</p>', hilfe: 'g3 = b3, und jedes weitere Gray-Bit ist b(i) XOR b(i+1).' }
    ])
  });
})(typeof window !== 'undefined' ? window : globalThis);

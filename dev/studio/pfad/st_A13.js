/* Lernpfad Station A13 – Datenkoordination: Multiplexer, Demultiplexer, Komparator, Halbaddierer, Volladdierer, Vollsubtrahierer – je bauen und prüfen lassen.
 * Eingänge der Schaltungen: E1, E2 … in der Reihenfolge, die in der Aufgabe steht. Die Tabellen und Soll-Werte werden aus je EINER Funktion gerechnet;
 * der Test rechnet Addition, Subtraktion, Vergleich und Auswahl mit gewöhnlicher Arithmetik gegen die Musterschaltungen nach (nicht gegen die Funktionen). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var N = function (id, type, ins, props) { return [id, type, ins, props]; };
  var mux2 = function (d0, d1, s) { return s ? d1 : d0; };
  var T = P.wahrheit({ ein: ['S', 'D1', 'D0'], aus: ['A'], f: function (e) { return [mux2(e[2], e[1], e[0])]; } });          // Tabelle: S links
  var half = function (a, b) { return [a ^ b, a & b]; }, full = function (a, b, c) { return [a ^ b ^ c, (a & b) | ((a ^ b) & c)]; };
  var sub = function (a, b, c) { return [a ^ b ^ c, ((1 - a) & b) | ((1 - (a ^ b)) & c)]; };
  var kom1 = function (a, b) { return [a & (1 - b), (a === b) ? 1 : 0, (1 - a) & b]; };
  var tHalf = P.wahrheit({ ein: ['a', 'b'], aus: ['S', 'C'], f: function (e) { return half(e[0], e[1]); } });
  var tFull = P.wahrheit({ ein: ['a', 'b', 'c(ein)'], aus: ['S', 'C(aus)'], f: function (e) { return full(e[0], e[1], e[2]); } });
  var tSub = P.wahrheit({ ein: ['a', 'b', 'B(ein)'], aus: ['D', 'B(aus)'], f: function (e) { return sub(e[0], e[1], e[2]); } });
  var tKom = P.wahrheit({ ein: ['a', 'b'], aus: ['a > b', 'a = b', 'a < b'], f: function (e) { return kom1(e[0], e[1]); } });
  // Musterschaltungen
  var mMux2 = P.netz({ n: 3, gatter: [N('U1', 'not', ['E3']), N('U2', 'and', ['U1', 'E1']), N('U3', 'and', ['E3', 'E2']), N('U4', 'or', ['U2', 'U3'])], aus: { L1: 'U4' } });
  var mMux4 = P.netz({ n: 6, gatter: [N('U1', 'not', ['E5']), N('U2', 'not', ['E6']),
    N('U3', 'and', ['E1', 'U1', 'U2'], { inputs: 3 }), N('U4', 'and', ['E2', 'E5', 'U2'], { inputs: 3 }), N('U5', 'and', ['E3', 'U1', 'E6'], { inputs: 3 }), N('U6', 'and', ['E4', 'E5', 'E6'], { inputs: 3 }), N('U7', 'or', ['U3', 'U4', 'U5', 'U6'], { inputs: 4 })], aus: { L1: 'U7' } });
  var mDemux = P.netz({ n: 3, gatter: [N('U1', 'not', ['E2']), N('U2', 'not', ['E3']), N('U3', 'and', ['E1', 'U1', 'U2'], { inputs: 3 }), N('U4', 'and', ['E1', 'E2', 'U2'], { inputs: 3 }), N('U5', 'and', ['E1', 'U1', 'E3'], { inputs: 3 }), N('U6', 'and', ['E1', 'E2', 'E3'], { inputs: 3 })], aus: { L1: 'U3', L2: 'U4', L3: 'U5', L4: 'U6' } });
  var mKom1 = P.netz({ n: 2, gatter: [N('U1', 'not', ['E2']), N('U2', 'and', ['E1', 'U1']), N('U3', 'xnor', ['E1', 'E2']), N('U4', 'not', ['E1']), N('U5', 'and', ['U4', 'E2'])], aus: { L1: 'U2', L2: 'U3', L3: 'U5' } });
  var mKom4 = P.netz({ n: 8, gatter: [N('N5', 'not', ['E5']), N('N6', 'not', ['E6']), N('N7', 'not', ['E7']), N('N8', 'not', ['E8']), N('X0', 'xnor', ['E1', 'E5']), N('X1', 'xnor', ['E2', 'E6']), N('X2', 'xnor', ['E3', 'E7']), N('X3', 'xnor', ['E4', 'E8']),
    N('G0', 'and', ['E1', 'N5']), N('G1', 'and', ['E2', 'N6']), N('G2', 'and', ['E3', 'N7']), N('G3', 'and', ['E4', 'N8']), N('T1', 'and', ['X3', 'G2']), N('T2', 'and', ['X3', 'X2', 'G1'], { inputs: 3 }), N('T3', 'and', ['X3', 'X2', 'X1', 'G0'], { inputs: 4 }),
    N('GT', 'or', ['G3', 'T1', 'T2', 'T3'], { inputs: 4 }), N('EQ', 'and', ['X0', 'X1', 'X2', 'X3'], { inputs: 4 }), N('LT', 'nor', ['GT', 'EQ'])], aus: { L1: 'GT', L2: 'EQ', L3: 'LT' } });
  var mHalf = P.netz({ n: 2, gatter: [N('U1', 'xor', ['E1', 'E2']), N('U2', 'and', ['E1', 'E2'])], aus: { L1: 'U1', L2: 'U2' } });
  var mFull = P.netz({ n: 3, gatter: [N('U1', 'xor', ['E1', 'E2']), N('U2', 'xor', ['U1', 'E3']), N('U3', 'and', ['E1', 'E2']), N('U4', 'and', ['U1', 'E3']), N('U5', 'or', ['U3', 'U4'])], aus: { L1: 'U2', L2: 'U5' } });
  var mSub = P.netz({ n: 3, gatter: [N('U1', 'xor', ['E1', 'E2']), N('U2', 'xor', ['U1', 'E3']), N('U3', 'not', ['E1']), N('U4', 'and', ['U3', 'E2']), N('U5', 'not', ['U1']), N('U6', 'and', ['U5', 'E3']), N('U7', 'or', ['U4', 'U6'])], aus: { L1: 'U2', L2: 'U7' } });
  P.A13_MUSTER = { mux2: mMux2, mux4: mMux4, demux: mDemux, kom1: mKom1, kom4: mKom4, half: mHalf, full: mFull, sub: mSub }; // für den Test
  P.station({
    id: 'A13', teil: 'A', nr: 13, titel: 'Datenkoordination', kurz: 'Multiplexer, Demultiplexer, Komparator, Addierer, Subtrahierer',
    einfuehrung: '<p>Hier entstehen die Bausteine, mit denen ein Rechner Daten verteilt und verarbeitet:</p><ul><li>Der <b>Multiplexer</b> wählt mit Steuereingängen einen von mehreren Dateneingängen aus und leitet ihn zum Ausgang. Der <b>Demultiplexer</b> macht das Umgekehrte: Er verteilt einen Eingang auf einen von mehreren Ausgängen.</li><li>Der <b>Komparator</b> vergleicht zwei Zahlen: grösser, gleich, kleiner.</li><li>Der <b>Halbaddierer</b> addiert zwei Bit (Summe S und Übertrag C). Der <b>Volladdierer</b> nimmt zusätzlich den Übertrag der Stelle davor (c<sub>ein</sub>) – so lassen sich mehrstellige Zahlen addieren. Der <b>Vollsubtrahierer</b> rechnet entsprechend mit einem Borger.</li></ul><p>Jeden Baustein baust du, die Software schaltet alle Eingangskombinationen durch und vergleicht.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A13.1', titel: 'Multiplexer 2:1: Tabelle', art: 'tabelle', kopf: T.kopf, zeilen: T.zeilen, text: '<p>Ein Multiplexer mit zwei Dateneingängen D0, D1 und einem Steuereingang S: Bei <b>S = 0</b> erscheint D0 am Ausgang A, bei <b>S = 1</b> erscheint D1. Fülle die Tabelle aus.</p>' },
      { id: 'A13.2', titel: 'Multiplexer 2:1 bauen', art: 'schaltung', n: 3, ausgaenge: 1, f: function (e) { return [mux2(e[0], e[1], e[2])]; }, start: P.startNetz(3, 1), muster: mMux2,
        text: '<p>Baue den Multiplexer 2:1. <b>E1 = D0</b>, <b>E2 = D1</b>, <b>E3 = S</b>, Anzeige L1 = A.</p>', hilfe: 'A = /S D0 v S D1: Zwei UND-Gatter, von denen immer nur eines freigegeben ist, dann ein ODER.' },
      { id: 'A13.3', titel: 'Multiplexer 4:1 bauen', art: 'schaltung', n: 6, ausgaenge: 1, f: function (e) { var s = e[4] + 2 * e[5]; return [e[s]]; }, start: P.startNetz(6, 1), muster: mMux4,
        text: '<p>Baue einen Multiplexer 4:1. <b>E1 bis E4 = D0 bis D3</b> (Daten), <b>E5 = S0</b> (niedrige Steuerstelle), <b>E6 = S1</b> (hohe Steuerstelle). Die Nummer des gewählten Eingangs ist S1 S0 als Dualzahl. Anzeige L1 = A.</p>', hilfe: 'Vier UND-Gatter mit drei Eingängen (ein Dateneingang und die zwei Steuerleitungen, passend invertiert), ein ODER mit vier Eingängen. Die Eingangszahl steht im Eigenschaftenfeld.' },
      { id: 'A13.4', titel: 'Demultiplexer 1:4 bauen', art: 'schaltung', n: 3, ausgaenge: 4, f: function (e) { var s = e[1] + 2 * e[2]; return [0, 1, 2, 3].map(function (k) { return k === s ? e[0] : 0; }); }, start: P.startNetz(3, 4), muster: mDemux,
        text: '<p>Baue einen Demultiplexer 1:4. <b>E1 = D</b> (Daten), <b>E2 = S0</b>, <b>E3 = S1</b>. Die Anzeigen <b>L1 bis L4 = Y0 bis Y3</b>: Der Ausgang, dessen Nummer S1 S0 ist, bekommt D, alle anderen sind 0.</p>', hilfe: 'Vier UND-Gatter: D und die Steuerleitungen so invertiert, dass genau eine Kombination durchlässt.' },
      { id: 'A13.5', titel: 'Komparator 1 Bit: Tabelle', art: 'tabelle', kopf: tKom.kopf, zeilen: tKom.zeilen, text: '<p>Der 1-Bit-Komparator vergleicht a und b und meldet auf drei Ausgängen: a grösser b, a gleich b, a kleiner b. Fülle die Tabelle aus.</p>' },
      { id: 'A13.6', titel: 'Komparator 1 Bit bauen', art: 'schaltung', n: 2, ausgaenge: 3, f: function (e) { return kom1(e[0], e[1]); }, start: P.startNetz(2, 3), muster: mKom1,
        text: '<p>Baue den 1-Bit-Komparator. <b>E1 = a</b>, <b>E2 = b</b>, <b>L1 = (a &gt; b)</b>, <b>L2 = (a = b)</b>, <b>L3 = (a &lt; b)</b>.</p>', hilfe: 'a > b heisst: a = 1 und b = 0. a = b ist das XNOR.' },
      { id: 'A13.7', titel: '4-Bit-Komparator bauen', pflicht: false, art: 'schaltung', n: 8, ausgaenge: 3, f: function (e) { var a = P.wertLSB(e.slice(0, 4)), b = P.wertLSB(e.slice(4)); return [a > b ? 1 : 0, a === b ? 1 : 0, a < b ? 1 : 0]; }, start: P.startNetz(8, 3), muster: mKom4,
        text: '<p><b>Freiwillig.</b> Baue einen Komparator für zwei vierstellige Zahlen. <b>E1 bis E4 = A0 bis A3</b>, <b>E5 bis E8 = B0 bis B3</b> (A3 und B3 sind die höchsten Stellen). <b>L1 = (A &gt; B)</b>, <b>L2 = (A = B)</b>, <b>L3 = (A &lt; B)</b>. Die Software schaltet alle 256 Kombinationen durch.</p>', hilfe: 'Beginne bei der höchsten Stelle: Ist sie verschieden, entscheidet sie. Sind beide gleich, entscheidet die nächste. A = B, wenn alle vier Stellen gleich sind (XNOR je Stelle, dann UND). A < B ist «weder grösser noch gleich».' },
      { id: 'A13.8', titel: 'Halbaddierer: Tabelle', art: 'tabelle', kopf: tHalf.kopf, zeilen: tHalf.zeilen, text: '<p>Der <b>Halbaddierer</b> addiert zwei Bit a und b: S ist die Summenstelle, C der Übertrag (Carry). 1 + 1 ergibt dual 10: S = 0, C = 1. Fülle die Tabelle aus.</p>' },
      { id: 'A13.9', titel: 'Halbaddierer bauen', art: 'schaltung', n: 2, ausgaenge: 2, f: function (e) { return half(e[0], e[1]); }, start: P.startNetz(2, 2), muster: mHalf, text: '<p>Baue den Halbaddierer: <b>E1 = a</b>, <b>E2 = b</b>, <b>L1 = S</b>, <b>L2 = C</b>.</p>', hilfe: 'S ist ein XOR, C ein UND.' },
      { id: 'A13.10', titel: 'Volladdierer: Tabelle', art: 'tabelle', kopf: tFull.kopf, zeilen: tFull.zeilen, text: '<p>Der <b>Volladdierer</b> addiert drei Bit: a, b und den Übertrag der Stelle davor (c<sub>ein</sub>). Ausgänge: Summe S und Übertrag C<sub>aus</sub> für die nächste Stelle. Fülle die Tabelle aus (a + b + c<sub>ein</sub> als Dualzahl: höhere Stelle = C<sub>aus</sub>).</p>' },
      { id: 'A13.11', titel: 'Volladdierer bauen', art: 'schaltung', n: 3, ausgaenge: 2, f: function (e) { return full(e[0], e[1], e[2]); }, start: P.startNetz(3, 2), muster: mFull, text: '<p>Baue den Volladdierer: <b>E1 = a</b>, <b>E2 = b</b>, <b>E3 = c<sub>ein</sub></b>, <b>L1 = S</b>, <b>L2 = C<sub>aus</sub></b>.</p>', hilfe: 'Zwei Halbaddierer hintereinander, die beiden Überträge mit ODER verbunden.' },
      { id: 'A13.12', titel: 'Vollsubtrahierer: Tabelle', art: 'tabelle', kopf: tSub.kopf, zeilen: tSub.zeilen, text: '<p>Der <b>Vollsubtrahierer</b> rechnet a − b − B<sub>ein</sub> (B<sub>ein</sub> = Borger von der Stelle davor). Ausgänge: Differenz D und Borger B<sub>aus</sub> für die nächste Stelle. Es muss immer gelten: a − b − B<sub>ein</sub> = D − 2 · B<sub>aus</sub>.</p>' },
      { id: 'A13.13', titel: 'Vollsubtrahierer bauen', art: 'schaltung', n: 3, ausgaenge: 2, f: function (e) { return sub(e[0], e[1], e[2]); }, start: P.startNetz(3, 2), muster: mSub, text: '<p>Baue den Vollsubtrahierer: <b>E1 = a</b>, <b>E2 = b</b>, <b>E3 = B<sub>ein</sub></b>, <b>L1 = D</b>, <b>L2 = B<sub>aus</sub></b>.</p>', hilfe: 'Die Differenz D ist dieselbe Dreier-Kette aus XOR wie beim Addierer. Der Borger entsteht, wenn a kleiner ist als b + B(ein).' },
      { id: 'A13.14', titel: 'Prüffragen Datenkoordination', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Wie viele Steuereingänge braucht ein Multiplexer mit 8 Dateneingängen?', opt: ['2', '3', '4', '8'], richtig: 1, erkl: '2³ = 8: Drei Steuerbits wählen einen von acht Eingängen.' },
        { q: 'Aus wie vielen Halbaddierern (plus einem ODER) besteht ein Volladdierer?', opt: ['1', '2', '3', '4'], richtig: 1, erkl: 'Der erste addiert a und b, der zweite addiert den Übertrag von davor.' },
        { q: 'Welches Gatter liefert die Summenstelle des Halbaddierers?', opt: ['UND', 'ODER', 'XOR', 'NAND'], richtig: 2, erkl: '0+0 = 0, 0+1 = 1, 1+0 = 1, 1+1 = 0 (mit Übertrag): das ist XOR.' },
        { q: 'Ein Demultiplexer 1:4 hat …', opt: ['1 Dateneingang, 2 Steuereingänge, 4 Ausgänge', '4 Dateneingänge, 1 Ausgang', '2 Dateneingänge, 4 Ausgänge', '1 Dateneingang, 4 Steuereingänge'], richtig: 0, erkl: 'Zwei Steuerbits unterscheiden die vier Ausgänge.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

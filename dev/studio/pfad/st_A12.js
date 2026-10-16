/* Lernpfad Station A12 – Kontrollinstanzen: Paritätsbit erzeugen und auswerten (gerade Parität), Hamming-Code als Zusatz (freiwillig).
 * Alles aus der Definition gerechnet: P = e1 XOR e2 XOR e3 macht die Gesamtzahl der Einsen gerade; der Auswerter meldet F = 1, wenn die Zahl der Einsen ungerade ist.
 * Hamming(7,4): p1 = d1 ⊕ d2 ⊕ d4, p2 = d1 ⊕ d3 ⊕ d4, p3 = d2 ⊕ d3 ⊕ d4 (Test: jede Einzelbitstörung hat ein eindeutiges Syndrom). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var par = function (e) { return e.reduce(function (a, b) { return a ^ b; }, 0); };
  var pe = P.wahrheit({ ein: ['e1', 'e2', 'e3'], aus: ['P'], f: function (e) { return [par(e)]; } });
  var pw = P.wahrheit({ ein: ['e1', 'e2', 'e3', 'P'], aus: ['F'], f: function (e) { return [par(e)]; } });
  var h = P.wahrheit({ ein: ['d1', 'd2', 'd3', 'd4'], aus: ['p1', 'p2', 'p3'], f: function (e) { return [e[0] ^ e[1] ^ e[3], e[0] ^ e[2] ^ e[3], e[1] ^ e[2] ^ e[3]]; } });
  var N = function (id, type, ins, props) { return [id, type, ins, props]; };
  P.station({
    id: 'A12', teil: 'A', nr: 12, titel: 'Kontrollinstanzen', kurz: 'Paritätsbit erzeugen und prüfen; Hamming-Code als Zusatz',
    einfuehrung: '<p>Beim Übertragen oder Speichern kann ein Bit kippen. Ein <b>Paritätsbit</b> erkennt das: Der <b>Sender</b> hängt an jedes Datenwort ein Bit an, das die Zahl der Einsen <b>gerade</b> macht («gerade Parität»). Der <b>Empfänger</b> zählt die Einsen nach: Ist die Zahl ungerade, ist etwas schiefgegangen.</p><p>Die Schaltung dafür ist eine Kette aus <b>XOR</b>-Gattern: XOR ist 1, wenn die Zahl der Einsen ungerade ist.</p><p>Ein einzelner Bitfehler wird erkannt, zwei Fehler gleichzeitig nicht. Der <b>Hamming-Code</b> (freiwillig) geht weiter: Mit drei Prüfbits zu vier Datenbits erkennt er nicht nur den Fehler, sondern auch <b>welches</b> Bit kippte – und kann es korrigieren.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A12.1', titel: 'Paritätsbit erzeugen: Tabelle', art: 'tabelle', kopf: pe.kopf, zeilen: pe.zeilen, text: '<p>Dreibit-Datenwort e1 e2 e3. Das Paritätsbit P soll die Gesamtzahl der Einsen (Daten <b>und</b> P) <b>gerade</b> machen. Fülle die Spalte P aus.</p>', hilfe: 'Zähle die Einsen in e1 e2 e3: Ungerade Zahl → P = 1, gerade Zahl → P = 0.' },
      { id: 'A12.2', titel: 'Paritätsersteller bauen', art: 'schaltung', n: 3, ausgaenge: 1, f: function (e) { return [par(e)]; }, start: P.startNetz(3, 1),
        muster: P.netz({ n: 3, gatter: [N('U1', 'xor', ['E1', 'E2']), N('U2', 'xor', ['U1', 'E3'])], aus: { L1: 'U2' } }), text: '<p>Baue den <b>Paritätsersteller</b> für drei Datenbits E1, E2, E3. Die Anzeige L1 ist das Paritätsbit P.</p>', hilfe: 'XOR hat 1 am Ausgang bei ungerader Zahl von Einsen. Zwei XOR hintereinander reichen.' },
      { id: 'A12.3', titel: 'Paritätsauswerter: Tabelle', art: 'tabelle', kopf: pw.kopf, zeilen: pw.zeilen, text: '<p>Der Empfänger bekommt die drei Datenbits und das Paritätsbit P. Der Fehlerausgang <b>F</b> soll 1 sein, wenn die Zahl der Einsen in allen vier Bits <b>ungerade</b> ist (also ein Fehler vorliegt).</p>' },
      { id: 'A12.4', titel: 'Paritätsauswerter bauen', art: 'schaltung', n: 4, ausgaenge: 1, f: function (e) { return [par(e)]; }, start: P.startNetz(4, 1),
        muster: P.netz({ n: 4, gatter: [N('U1', 'xor', ['E1', 'E2']), N('U2', 'xor', ['E3', 'E4']), N('U3', 'xor', ['U1', 'U2'])], aus: { L1: 'U3' } }), text: '<p>Baue den <b>Paritätsauswerter</b>: E1, E2, E3 sind die Datenbits, E4 ist das Paritätsbit P. Die Anzeige L1 ist der Fehlerausgang F.</p>' },
      { id: 'A12.5', titel: 'Prüffragen Parität', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Ein Paritätsbit erkennt …', opt: ['jeden Fehler', 'jeden einzelnen Bitfehler', 'nur Fehler im Paritätsbit', 'keinen Fehler'], richtig: 1, erkl: 'Ein gekipptes Bit ändert die Zahl der Einsen um eins: gerade wird ungerade.' },
        { q: 'Zwei Bits kippen gleichzeitig. Was meldet der Paritätsauswerter?', opt: ['Fehler', 'keinen Fehler', 'er fällt aus', 'er korrigiert'], richtig: 1, erkl: 'Die Zahl der Einsen ändert sich um 2, 0 oder −2 und bleibt gerade: Der Fehler bleibt unbemerkt.' },
        { q: 'Welches Gatter eignet sich für die Paritätsbildung?', opt: ['UND', 'ODER', 'XOR', 'NAND'], richtig: 2, erkl: 'XOR zählt die Einsen modulo 2.' },
        { q: 'Das Datenwort 1011 hat (gerade Parität) das Paritätsbit …', opt: ['0', '1'], richtig: 1, erkl: 'Drei Einsen sind ungerade: Das Paritätsbit 1 macht vier daraus.' }] },
      { id: 'A12.6', titel: 'Hamming(7,4): Prüfbits', pflicht: false, art: 'tabelle', kopf: h.kopf, zeilen: h.zeilen,
        text: '<p><b>Freiwillig.</b> Vier Datenbits d1 d2 d3 d4 bekommen drei Prüfbits: <b>p1 = d1 ⊕ d2 ⊕ d4</b>, <b>p2 = d1 ⊕ d3 ⊕ d4</b>, <b>p3 = d2 ⊕ d3 ⊕ d4</b> (⊕ = XOR). Fülle die Tabelle aus.</p>' },
      { id: 'A12.7', titel: 'Hamming(7,4): Sender bauen', pflicht: false, art: 'schaltung', n: 4, ausgaenge: 3, f: function (e) { return [e[0] ^ e[1] ^ e[3], e[0] ^ e[2] ^ e[3], e[1] ^ e[2] ^ e[3]]; }, start: P.startNetz(4, 3),
        muster: P.netz({ n: 4, gatter: [N('U1', 'xor', ['E1', 'E2', 'E4'], { inputs: 3 }), N('U2', 'xor', ['E1', 'E3', 'E4'], { inputs: 3 }), N('U3', 'xor', ['E2', 'E3', 'E4'], { inputs: 3 })], aus: { L1: 'U1', L2: 'U2', L3: 'U3' } }),
        text: '<p><b>Freiwillig.</b> Baue die Prüfbit-Erzeugung des Hamming-Senders: E1 bis E4 sind d1 bis d4, die Anzeigen L1 bis L3 sind p1 bis p3. Ein XOR-Gatter hat auch drei Eingänge (Eigenschaftenfeld).</p>' },
      { id: 'A12.8', titel: 'Prüffragen Hamming', pflicht: false, art: 'fragen', text: '<p><b>Freiwillig.</b></p>', fragen: [
        { q: 'Wie viele Prüfbits braucht der Hamming-Code für vier Datenbits?', opt: ['1', '2', '3', '4'], richtig: 2, erkl: 'Drei Prüfbits unterscheiden sieben Fehlerstellen und «kein Fehler» (2³ = 8 Zustände).' },
        { q: 'Was kann der Hamming-Code, was ein Paritätsbit nicht kann?', opt: ['Zwei Fehler erkennen', 'Die Stelle eines einzelnen Fehlers finden und das Bit korrigieren', 'Daten verschlüsseln', 'Daten komprimieren'], richtig: 1, erkl: 'Die drei Prüfergebnisse ergeben zusammen die Nummer des gekippten Bits.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

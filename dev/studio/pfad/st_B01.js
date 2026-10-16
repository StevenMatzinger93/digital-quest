/* Lernpfad Station B1 – NOR-Flipflop. Eingänge wie im Lehrmittel e1 und e2; hier e1 = Setzen (S), e2 = Rücksetzen (R) – siehe docs/FRAGEN_STUDIO.md.
 * Tabellen aus der Folgefunktion des RS-Flipflops (P.FF.rs); die Schaltung aus zwei NOR wird von der Prüfmaschine über das Verhalten geprüft. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var EIN = ['e1', 'e2'], an = P.ffAnalyse(EIN, P.FF.rs), ans = P.ffAnsteuer(EIN, P.FF.rs);
  var OPT = ['0', '1', 'AV', 'unzulässig'];
  var wt = { kopf: ['e1', 'e2', 'A'], zeilen: [['0', '0', { a: 'AV', typ: 'wahl', opt: OPT }], ['0', '1', { a: '0', typ: 'wahl', opt: OPT }], ['1', '0', { a: '1', typ: 'wahl', opt: OPT }], ['1', '1', { a: 'unzulässig', typ: 'wahl', opt: OPT }]] };
  var nor = P.raster({ teile: [['E1', 'logicin'], ['E2', 'logicin'], ['U1', 'nor'], ['U2', 'nor'], ['L1', 'logicled'], ['L2', 'logicled'], ['GND1', 'ground']], zeilen: 3,
    leitungen: [['E2', 'U1.in1'], ['U2.out', 'U1.in2'], ['E1', 'U2.in1'], ['U1.out', 'U2.in2'], ['U1', 'L1'], ['U2', 'L2']] });
  var Sch = function (s, r, q) { return { set: { E1: s, E2: r }, erwartet: [q, 1 - q] }; };
  var falsch = P.raster({ teile: [['E1', 'logicin'], ['E2', 'logicin'], ['U1', 'nor'], ['U2', 'nor'], ['L1', 'logicled'], ['L2', 'logicled'], ['GND1', 'ground']], zeilen: 3,   // Rückführung fehlt
    leitungen: [['E2', 'U1.in1'], ['E1', 'U1.in2'], ['E1', 'U2.in1'], ['E2', 'U2.in2'], ['U1', 'L1'], ['U2', 'L2']] });
  P.station({
    id: 'B1', teil: 'B', nr: 1, titel: 'NOR-Flipflop', kurz: 'Das einfachste Speicherelement aus zwei NOR-Gattern',
    einfuehrung: '<p>Bisher hing der Ausgang einer Schaltung nur von den <b>jetzigen</b> Eingängen ab (kombinatorische Logik). Ein <b>Flipflop</b> dagegen hat ein <b>Gedächtnis</b>: Sein Ausgang hängt auch davon ab, was vorher war. Möglich wird das durch eine <b>Rückkopplung</b>: Der Ausgang jedes Gatters führt zu einem Eingang des anderen.</p><p>Das <b>NOR-Flipflop</b> besteht aus zwei NOR-Gattern. Zwei Eingänge: <b>e1</b> (Setzen, S: macht Q = 1) und <b>e2</b> (Rücksetzen, R: macht Q = 0). Sind beide 0, hält das Flipflop seinen Zustand. Beide 1 ist unzulässig.</p><p><b>Schreibweise:</b> <b>AV</b> = Ausgang vorher, <b>A</b> = Ausgang danach. Die <b>Wahrheitstabelle</b> zeigt A in Abhängigkeit von e1 und e2 (mit AV als Wert «hält»), die <b>Analysetabelle</b> führt AV als zusätzliche Spalte, die <b>Ansteuertabelle</b> fragt umgekehrt, welche Eingänge einen Übergang AV → A bewirken. Das <b>Zustandsfolgediagramm</b> zeigt die Übergänge als Pfeile.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B1.1', titel: 'Wahrheitstabelle', art: 'tabelle', kopf: wt.kopf, zeilen: wt.zeilen, text: '<p>Wähle für jede Eingangskombination, was der Ausgang A <b>danach</b> zeigt: <b>0</b>, <b>1</b>, <b>AV</b> (hält den alten Wert) oder <b>unzulässig</b>.</p><p>e1 setzt (Q = 1), e2 setzt zurück (Q = 0).</p>' },
      { id: 'B1.2', titel: 'Analysetabelle', art: 'tabelle', kopf: an.kopf, zeilen: an.zeilen, text: '<p>Fülle die <b>Analysetabelle</b> aus: Zu jeder Kombination von e1, e2 und AV der Ausgang A. Für den unzulässigen Fall schreibst du <b>X</b>.</p>' },
      { id: 'B1.3', titel: 'Ansteuertabelle', art: 'tabelle', kopf: ans.kopf, zeilen: ans.zeilen, text: '<p>Fülle die <b>Ansteuertabelle</b> aus: Welche Werte brauchen e1 und e2 für den Übergang von AV nach A? Wo es egal ist: <b>X</b>.</p>', hilfe: 'Bei AV = 0, A = 0: Es darf nicht gesetzt werden (e1 = 0), zurücksetzen ist egal.' },
      { id: 'B1.4', titel: 'Zustandsfolgediagramm', art: 'vergleich', text: '<p>Zeichne das Zustandsfolgediagramm des NOR-Flipflops auf Papier: zwei Zustände (Q = 0, Q = 1) und vier Pfeile, beschriftet mit e1 e2 aus der Ansteuertabelle. Notiere kurz, was dir auffällt, und gib ab; die Software zeigt dir ihr Diagramm zum Vergleich (bewertet wird nicht).</p>', zeigeMuster: '<p>So sieht das Diagramm aus:</p>' + P.svgZustand(EIN, P.FF.rs) },
      { id: 'B1.5', titel: 'Schaltung aus zwei NOR bauen', art: 'folge', lesen: ['L1', 'L2'], nur: ['nor'], limit: { nor: 2 }, min: { nor: 2 }, start: P.startNetz(2, 2), muster: nor, falsch: falsch,
        schritte: [Sch(1, 0, 1), Sch(0, 0, 1), Sch(0, 1, 0), Sch(0, 0, 0), Sch(1, 0, 1), Sch(0, 0, 1)],
        text: '<p>Baue das Flipflop aus <b>genau zwei NOR-Gattern</b>: <b>E1</b> = Setzen (S), <b>E2</b> = Rücksetzen (R); <b>L1</b> zeigt Q, <b>L2</b> zeigt Q̄. Der Ausgang jedes NOR geht an einen Eingang des anderen. Probiere es aus: Setzen, loslassen, Rücksetzen, loslassen.</p>', hilfe: 'NOR 1 bekommt R und den Ausgang von NOR 2, NOR 2 bekommt S und den Ausgang von NOR 1. Q ist der Ausgang von NOR 1.' },
      { id: 'B1.6', titel: 'Prüffragen NOR-Flipflop', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Was bewirkt die Rückkopplung im Flipflop?', opt: ['Sie macht es schneller', 'Sie speichert den Zustand', 'Sie verhindert Störungen', 'Sie erzeugt den Takt'], richtig: 1, erkl: 'Jedes Gatter hält durch den anderen seinen Ausgang fest.' },
        { q: 'Beide Eingänge e1, e2 sind 0. Was zeigt der Ausgang?', opt: ['0', '1', 'Den alten Wert (AV)', 'Unzulässig'], richtig: 2, erkl: 'Ruhezustand: Das Flipflop speichert.' },
        { q: 'e1 = 1, e2 = 0. Welcher Wert hat A danach?', opt: ['0', '1', 'AV', 'Unzulässig'], richtig: 1, erkl: 'e1 setzt.' },
        { q: 'Welche Eingabe ist beim NOR-Flipflop verboten?', opt: ['e1 = 0, e2 = 0', 'e1 = 1, e2 = 1', 'e1 = 1, e2 = 0', 'e1 = 0, e2 = 1'], richtig: 1, erkl: 'Gleichzeitig setzen und rücksetzen.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

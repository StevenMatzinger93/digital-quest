/* Lernpfad Station A7 – DNF und KNF. Förderband mit zwei Tastern; die Tabelle wird aus der Aufgabe gerechnet, beide Normalformen und beide Schaltungen
 * aus der Tabelle (kanonisch). Freiwillig: Mehrheitsentscheid mit drei Tastern. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var fb = function (e) { return e[0] ^ e[1]; };                               // Band läuft, wenn genau ein Taster gedrückt ist
  var mj = function (e) { return (e[0] + e[1] + e[2]) >= 2 ? 1 : 0; };          // Mehrheit: mindestens zwei von drei
  var w2 = P.wahrheit({ ein: ['e1', 'e2'], aus: ['A'], f: function (e) { return [fb(e)]; } }), ones2 = P.einsen(2, function (e) { return [fb(e)]; });
  var ones3 = P.einsen(3, function (e) { return [mj(e)]; });
  var w3 = P.wahrheit({ ein: ['e1', 'e2', 'e3'], aus: ['A'], f: function (e) { return [mj(e)]; } });
  P.station({
    id: 'A7', teil: 'A', nr: 7, titel: 'DNF und KNF', kurz: 'Aus der Wahrheitstabelle zur Schaltung – auf zwei Wegen',
    einfuehrung: '<p>Aus jeder Wahrheitstabelle lässt sich ein Ausdruck gewinnen, ganz mechanisch:</p><ul><li><b>Disjunktive Normalform (DNF):</b> für jede Zeile mit <b>A = 1</b> ein UND-Glied, in dem <b>alle</b> Eingänge vorkommen (Eingang 1 → e, Eingang 0 → überstrichen). Alle Glieder werden mit ODER verbunden.</li><li><b>Konjunktive Normalform (KNF):</b> für jede Zeile mit <b>A = 0</b> eine ODER-Klammer, in der <b>alle</b> Eingänge vorkommen, aber umgekehrt (Eingang 0 → e, Eingang 1 → überstrichen). Alle Klammern werden mit UND verbunden.</li></ul><p>Beide Formen beschreiben dieselbe Funktion. Du baust beide Schaltungen und die Software prüft, dass sie dasselbe tun.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A7.1', titel: 'Förderband: Wahrheitstabelle', art: 'tabelle', kopf: w2.kopf, zeilen: w2.zeilen,
        text: '<p><b>Förderband.</b> Ein Band wird von zwei Tastern bedient: e1 = Taster links, e2 = Taster rechts (gedrückt = 1). Das Band (A) soll nur laufen, wenn <b>genau ein</b> Taster gedrückt ist – damit niemand mit beiden Händen gleichzeitig am Band hantiert. Fülle die Wahrheitstabelle aus.</p>' },
      { id: 'A7.2', titel: 'Förderband: disjunktive Normalform', art: 'ausdruck', n: 2, ones: ones2, form: 'dnf',
        text: '<p>Schreibe die <b>DNF</b> des Förderbands: ein UND-Glied je Zeile mit A = 1, alle Glieder mit ODER.</p>', hilfe: 'Zeile e1 = 1, e2 = 0 wird zu e1/e2 (NICHT mit dem Schrägstrich).' },
      { id: 'A7.3', titel: 'Förderband: konjunktive Normalform', art: 'ausdruck', n: 2, ones: ones2, form: 'knf',
        text: '<p>Schreibe die <b>KNF</b> des Förderbands: eine ODER-Klammer je Zeile mit A = 0, die Klammern mit UND verbunden. Eingang 0 → e, Eingang 1 → überstrichen.</p>', hilfe: 'Zeile e1 = 0, e2 = 0 wird zur Klammer (e1 v e2).' },
      { id: 'A7.4', titel: 'Förderband: beide Schaltungen bauen', art: 'schaltung', n: 2, ausgaenge: 2, f: function (e) { var x = fb(e); return [x, x]; }, getrennt: true, start: P.startNetz(2, 2), muster: P.netzDNFundKNF(2, ones2),
        text: '<p>Baue <b>beide</b> Schaltungen: Die Anzeige <b>L1</b> hängt an der Schaltung der DNF, die Anzeige <b>L2</b> an der Schaltung der KNF. Beide Schaltungen haben ihre eigenen Gatter, nur die Pegelschalter sind gemeinsam. Beide Anzeigen müssen bei jeder Taster-Stellung dasselbe zeigen.</p>', hilfe: 'DNF: UND-Gatter für die Glieder, ein ODER dahinter. KNF: ODER-Gatter für die Klammern, ein UND dahinter. NICHT-Glieder für die überstrichenen Eingänge.' },
      { id: 'A7.5', titel: 'Prüffragen Normalformen', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Eine Wahrheitstabelle mit drei Eingängen hat fünf Zeilen mit A = 1. Wie viele Glieder hat die DNF?', opt: ['3', '5', '8', '3 × 5'], richtig: 1, erkl: 'Ein Glied je Zeile mit A = 1.' },
        { q: 'Dieselbe Tabelle: Wie viele Klammern hat die KNF?', opt: ['3', '5', '8', '2'], richtig: 0, erkl: 'Eine Klammer je Zeile mit A = 0: 8 − 5 = 3.' },
        { q: 'Welche Form verwendet man, wenn es nur wenige Zeilen mit A = 1 gibt?', opt: ['DNF', 'KNF', 'Beide brauchen gleich viel', 'Keine'], richtig: 0, erkl: 'Die DNF hat ein Glied je Eins – bei wenigen Einsen wird sie kurz.' },
        { q: 'Was haben DNF und KNF derselben Funktion gemeinsam?', opt: ['Die Zahl der Glieder', 'Sie beschreiben dieselbe Wahrheitstabelle', 'Die Zahl der NICHT-Glieder', 'Nichts'], richtig: 1, erkl: 'Beide sind nur verschiedene Schreibweisen derselben Funktion.' }] },
      { id: 'A7.6', titel: 'Mehrheitsentscheid: Tabelle', pflicht: false, art: 'tabelle', kopf: w3.kopf, zeilen: w3.zeilen,
        text: '<p><b>Freiwillig.</b> Drei Taster entscheiden: Die Lampe A leuchtet, wenn <b>mindestens zwei</b> Taster gedrückt sind. Fülle die Wahrheitstabelle aus.</p>' },
      { id: 'A7.7', titel: 'Mehrheitsentscheid: DNF', pflicht: false, art: 'ausdruck', n: 3, ones: ones3, form: 'dnf', text: '<p><b>Freiwillig.</b> Schreibe die DNF des Mehrheitsentscheids.</p>' },
      { id: 'A7.8', titel: 'Mehrheitsentscheid: KNF', pflicht: false, art: 'ausdruck', n: 3, ones: ones3, form: 'knf', text: '<p><b>Freiwillig.</b> Schreibe die KNF des Mehrheitsentscheids.</p>' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

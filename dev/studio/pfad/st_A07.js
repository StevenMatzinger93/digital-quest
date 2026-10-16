/* Lernpfad Station A7 – DNF und KNF: Förderband-Aufgabe aus Stevens Lehrmittel (docs/aufgaben/AUFGABEN_ORIGINAL.md, Wortlaut). Eingänge E1 (niederwertig) und E2, Ausgang A.
 * Die Zusatzaufgabe «Mehrheitsentscheid» ist EIGEN (nicht aus Stevens Serie) und ausdrücklich freiwillig. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var tab = [[0, 0, 0, 0], [1, 0, 1, 1], [2, 1, 0, 1], [3, 1, 1, 1]]; // Dez, E2, E1, A
  var ones2 = [1, 2, 3];
  var tabelleHtml = '<table class="itab" style="width:auto;font-family:var(--font-ui)"><thead><tr><th>Dez</th><th>E2</th><th>E1</th><th>A</th></tr></thead><tbody>' + tab.map(function (r) { return '<tr>' + r.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  var mj = function (e) { return (e[0] + e[1] + e[2]) >= 2 ? 1 : 0; };
  var w3 = P.wahrheit({ ein: ['e1', 'e2', 'e3'], aus: ['A'], f: function (e) { return [mj(e)]; } }), ones3 = P.einsen(3, function (e) { return [mj(e)]; });
  var aufg = '<p><b>Aufgabe.</b> Ein Förderband (A) kann durch die Taster E1 bzw. E2 in Bewegung gesetzt werden. Beim Loslassen hält das Band wieder an.</p><p>Erstelle die Schaltung bzw. den logischen Ausdruck für die unten aufgeführte Wahrheitstabelle für die beiden Möglichkeiten DNF und KNF.</p>' + tabelleHtml;
  P.station({
    id: 'A7', teil: 'A', nr: 7, titel: 'DNF und KNF', kurz: 'Förderband: aus der Wahrheitstabelle zur Schaltung – auf zwei Wegen',
    einfuehrung: '<p>Aus jeder Wahrheitstabelle lässt sich ein Ausdruck gewinnen, ganz mechanisch. So steht es im Lehrmittel:</p><ol><li><b>DNF</b> – Schaltung nach <b>positiver Logik</b> am Ausgang: Wenn A = 1, die Eingänge «verunden» und den Term mit jeder weiteren Möglichkeit «verodern».</li><li><b>KNF</b> – Schaltung nach <b>negativer Logik</b> am Ausgang: Wenn A = 0, die Eingänge «verodern» und jeden weiteren Ausgangsterm «verunden» (Klammern setzen). Zudem werden alle Eingänge negiert.</li></ol><p>Beide Formen beschreiben dieselbe Funktion. In der Übungsserie der Booleschen Algebra (A8, Aufgabe 1) zeigst du das durch Vereinfachen der DNF.</p><p>Schreibweise: ODER = <code>v</code> (auch <code>+</code>), UND = Nebeneinanderstellen (auch <code>*</code>), NICHT = Überstreichung (getippt <code>/e1</code>, <code>e1\'</code> oder <code>n(e1)</code>). In der Wahrheitstabelle ist E1 das niederwertige Bit (Dez = E2·2 + E1).</p>',
    verweis: 'Aufgabe aus Stevens Lehrmittel «Digitaltechnik stationäre Vorgänge». Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A7.1', titel: 'Förderband: DNF', art: 'ausdruck', n: 2, ones: ones2, form: 'dnf', text: aufg + '<p><b>a)</b> Gib den Ausdruck als <b>DNF</b> an.</p>', hilfe: 'Eine Zeile mit A = 1 wird ein UND-Glied (Eingang 0 → überstrichen), alle Glieder mit ODER. Die Zeile Dez 1 (E2 = 0, E1 = 1) heisst E1 · /E2.' },
      { id: 'A7.2', titel: 'Förderband: KNF', art: 'ausdruck', n: 2, ones: ones2, form: 'knf', text: aufg + '<p><b>b)</b> Gib den Ausdruck als <b>KNF</b> an.</p>', hilfe: 'Nur die Zeile Dez 0 hat A = 0. Eingang 0 → e (nicht überstrichen), Eingang 1 → überstrichen.' },
      { id: 'A7.3', titel: 'Förderband: beide Schaltungen bauen', art: 'schaltung', n: 2, ausgaenge: 2, f: function (e) { var x = e[0] | e[1]; return [x, x]; }, getrennt: true, start: P.startNetz(2, 2), muster: P.netzDNFundKNF(2, ones2),
        text: aufg + '<p><b>c)</b> Baue <b>beide</b> Schaltungen: <b>L1</b> hängt an der Schaltung der DNF, <b>L2</b> an der der KNF. Beide Schaltungen haben ihre eigenen Gatter, nur die Pegelschalter E1 und E2 sind gemeinsam. Die Software prüft, dass beide Anzeigen bei jeder Taster-Stellung dasselbe zeigen wie die Tabelle.</p>', hilfe: 'DNF: UND-Gatter für die Glieder (NICHT-Glieder für überstrichene Eingänge), ein ODER dahinter. KNF: ein ODER mit den Eingängen.' },
      { id: 'A7.4', titel: 'Prüffragen Normalformen', art: 'fragen', text: '<p>Vier kurze Fragen.</p>', fragen: [
        { q: 'Eine Wahrheitstabelle mit drei Eingängen hat fünf Zeilen mit A = 1. Wie viele Glieder hat die DNF?', opt: ['3', '5', '8', '3 × 5'], richtig: 1, erkl: 'Ein Glied je Zeile mit A = 1.' },
        { q: 'Dieselbe Tabelle: Wie viele Klammern hat die KNF?', opt: ['3', '5', '8', '2'], richtig: 0, erkl: 'Eine Klammer je Zeile mit A = 0: 8 − 5 = 3.' },
        { q: 'Welche Form verwendet man, wenn es nur wenige Zeilen mit A = 1 gibt?', opt: ['DNF', 'KNF', 'Beide brauchen gleich viel', 'Keine'], richtig: 0, erkl: 'Die DNF hat ein Glied je Eins – bei wenigen Einsen wird sie kurz.' },
        { q: 'Was haben DNF und KNF derselben Funktion gemeinsam?', opt: ['Die Zahl der Glieder', 'Sie beschreiben dieselbe Wahrheitstabelle', 'Die Zahl der NICHT-Glieder', 'Nichts'], richtig: 1, erkl: 'Beide sind nur verschiedene Schreibweisen derselben Funktion.' }] },
      { id: 'A7.5', titel: 'Zusatz (eigene Übung, nicht aus der Serie): Mehrheitsentscheid, Tabelle', pflicht: false, art: 'tabelle', kopf: w3.kopf, zeilen: w3.zeilen,
        text: '<p><b>Freiwillige Zusatzaufgabe, nicht aus Stevens Serie.</b> Drei Taster entscheiden: Die Lampe A leuchtet, wenn <b>mindestens zwei</b> Taster gedrückt sind. Fülle die Wahrheitstabelle aus.</p>' },
      { id: 'A7.6', titel: 'Zusatz (eigene Übung): Mehrheitsentscheid, DNF', pflicht: false, art: 'ausdruck', n: 3, ones: ones3, form: 'dnf', text: '<p><b>Freiwillige Zusatzaufgabe, nicht aus Stevens Serie.</b> Schreibe die DNF des Mehrheitsentscheids.</p>' },
      { id: 'A7.7', titel: 'Zusatz (eigene Übung): Mehrheitsentscheid, KNF', pflicht: false, art: 'ausdruck', n: 3, ones: ones3, form: 'knf', text: '<p><b>Freiwillige Zusatzaufgabe, nicht aus Stevens Serie.</b> Schreibe die KNF des Mehrheitsentscheids.</p>' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

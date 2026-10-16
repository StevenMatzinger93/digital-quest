/* Lernpfad Station A8 – Übungsserie Boolesche Algebra: Stevens Originalaufgaben (docs/aufgaben/boolesche_algebra.json, Wortlaut in AUFGABEN_ORIGINAL.md).
 * Aufgabe 1 = Förderband-Übung aus A7, 2 bis 17 die sechzehn Ausdrücke, 18 = Zusatzübung KNF/DNF; 12 und 18 sind freiwillig.
 * Geprüft wird nie gegen eine aufgeschriebene Lösung, sondern: logisch gleichwertig mit dem Originalausdruck UND Termzahl und Buchstabenzahl nicht grösser als in der JSON-Vorgabe.
 * Danach als ausdrücklich freiwillige Zusatzaufgaben (eigene Übung): die Gesetze mit Wahrheitstabellen nachweisen. */
(function (root) {
  'use strict';
  var P = root.DQPfad, ALG = P.serie('algebra');
  var HINWEIS = {
    3: 'Bei dieser Aufgabe kommen alle vier Kombinationen von e1 und e2 vor.',
    7: 'Was ergibt 1 + e2?', 9: 'Die Faktoren widersprechen einander: Was ergibt ein Produkt, das einen Faktor e und /e enthält?',
    10: 'Absorption: e1 + e1 · irgendetwas.', 15: 'De Morgan auf die ganze Klammer anwenden.', 16: 'De Morgan auf die ganze Klammer anwenden, dann ausmultiplizieren.'
  };
  var GESETZE = 'Bei deinem Ausbildner kannst du eine Zusammenfassung der Gesetze abholen. Nützlich: Absorption (e1 + e1·e2 = e1), e + /e = 1, e · /e = 0, Ausklammern, De Morgan.';
  var as = [];
  as.push({ id: 'A8.1', titel: 'Aufgabe 1: Förderband – DNF und KNF sind dasselbe', art: 'ausdruck', n: 2, gegeben: '/e2 e1 + e2 /e1 + e2 e1', erwartet: { terme: 2, buchstaben: 2 },
    text: '<p>Aufgabe 1 der Serie ist die Förderband-Übung aus A7: Die <b>DNF</b> des Förderbands lautet <b>E1·/E2 + /E1·E2 + E1·E2</b>, die <b>KNF</b> <b>(E2 + E1)</b>. Beweise, dass beide dasselbe ergeben, indem du die DNF <b>vereinfachst</b>.</p><p class="hint">Vereinfache so weit wie möglich; das Ergebnis muss gleichwertig sein und darf nicht länger sein als die KNF.</p>', hilfe: GESETZE });
  ALG.forEach(function (r) {
    var n = r.variablen.length, fw = r.nr === 12;
    as.push({ id: 'A8.' + r.nr, titel: 'Aufgabe ' + r.nr + (fw ? ' (freiwillig)' : ''), pflicht: !fw, art: 'ausdruck', n: n, gegeben: r.ausdruck, erwartet: { terme: r.terme, buchstaben: r.buchstaben },
      text: '<p>' + (fw ? '<b>Freiwillig.</b> ' : '') + 'Vereinfachen Sie folgenden Ausdruck. Das Ergebnis muss mit dem Ausdruck gleichwertig sein und höchstens so viele Terme und Buchstaben haben wie die Minimalform (eine andere, gleich kurze Lösung ist richtig).</p>' + (HINWEIS[r.nr] ? '<p class="hint">' + HINWEIS[r.nr] + '</p>' : ''), hilfe: GESETZE });
  });
  // Aufgabe 18: Zusatzübung KNF/DNF – der Wortlaut liegt nicht vor (FRAGEN_STUDIO.md): hier DNF und KNF der Funktion aus Aufgabe 12
  var f12 = ALG.filter(function (r) { return r.nr === 12; })[0];
  as.push({ id: 'A8.18a', titel: 'Aufgabe 18 (freiwillig): Zusatzübung DNF', pflicht: false, art: 'ausdruck', n: 3, ones: f12.minterme, form: 'dnf', text: '<p><b>Freiwillig.</b> Zusatzübung KNF / DNF (Wortlaut siehe FRAGEN_STUDIO.md): Gib für die Funktion aus Aufgabe 12 die <b>DNF</b> an. Tipp: Die Wahrheitstabelle von Aufgabe 12 kannst du aus dem Ausdruck ausrechnen.</p>' });
  as.push({ id: 'A8.18b', titel: 'Aufgabe 18 (freiwillig): Zusatzübung KNF', pflicht: false, art: 'ausdruck', n: 3, ones: f12.minterme, form: 'knf', text: '<p><b>Freiwillig.</b> Zusatzübung KNF / DNF: Gib für dieselbe Funktion die <b>KNF</b> an.</p>' });
  // Zusatz: Gesetze nachweisen (eigene Übung)
  function nachweis(id, titel, ein, spalten, text) {
    var fs = spalten.map(function (sp) { return P.formel(sp); }), w = P.wahrheit({ ein: ein, aus: spalten, f: function (e) { return fs.map(function (f) { return f(e); }); } });
    return { id: id, titel: 'Zusatz (eigene Übung): ' + titel, pflicht: false, art: 'tabelle', kopf: w.kopf, zeilen: w.zeilen, text: '<p><b>Freiwillige Zusatzaufgabe, nicht aus Stevens Serie.</b></p>' + text };
  }
  as.push(
    nachweis('A8.21', 'Kommutativgesetz', ['e1', 'e2'], ['e1e2', 'e2e1', 'e1 v e2', 'e2 v e1'], '<p><b>Kommutativgesetz:</b> Die Reihenfolge der Eingänge spielt keine Rolle. Rechne die vier Spalten aus.</p>'),
    nachweis('A8.22', 'Assoziativgesetz', ['e1', 'e2', 'e3'], ['(e1e2)e3', 'e1(e2e3)'], '<p><b>Assoziativgesetz:</b> Bei UND darf man die Klammern verschieben. Rechne beide Seiten aus.</p>'),
    nachweis('A8.23', 'Distributivgesetz (UND über ODER)', ['e1', 'e2', 'e3'], ['e1(e2 v e3)', 'e1e2 v e1e3'], '<p><b>Distributivgesetz:</b> Ausmultiplizieren. Rechne beide Seiten aus.</p>'),
    nachweis('A8.24', 'Distributivgesetz (ODER über UND)', ['e1', 'e2', 'e3'], ['e1 v e2e3', '(e1 v e2)(e1 v e3)'], '<p>In der Schaltalgebra gilt das Distributivgesetz auch andersherum. Rechne beide Seiten aus.</p>'),
    nachweis('A8.25', 'De Morgan (1)', ['e1', 'e2'], ['/(e1e2)', '/e1 v /e2'], '<p><b>De Morgan:</b> Das Gegenteil eines UND ist ein ODER der Gegenteile.</p>'),
    nachweis('A8.26', 'De Morgan (2)', ['e1', 'e2'], ['/(e1 v e2)', '/e1/e2'], '<p>Das Gegenteil eines ODER ist ein UND der Gegenteile.</p>'),
    nachweis('A8.27', 'Absorption', ['e1', 'e2'], ['e1 v e1e2', 'e1(e1 v e2)'], '<p><b>Absorption:</b> Rechne beide Spalten aus und vergleiche mit e1.</p>')
  );
  P.station({
    id: 'A8', teil: 'A', nr: 8, titel: 'Boolesche Algebra', kurz: 'Übungsserie: 16 Ausdrücke vereinfachen (Stevens Originalaufgaben)',
    einfuehrung: '<p>Mit den <b>Gesetzen der Booleschen Algebra</b> lassen sich Ausdrücke umformen und vereinfachen – das spart Gatter. Die Übungsserie hat 18 Aufgaben: Aufgabe 1 ist die Förderband-Übung aus A7, 2 bis 17 sind Ausdrücke zum Vereinfachen, 18 ist eine Zusatzübung. <b>Aufgaben 12 und 18 sind freiwillig.</b></p><p>Schreibweise wie im Lehrmittel: <b>ODER</b> = <code>v</code> (oder <code>+</code>), <b>UND</b> = Nebeneinanderstellen (oder <code>·</code>, <code>*</code>), <b>NICHT</b> = Überstreichung (getippt <code>/e1</code>, <code>e1\'</code> oder <code>n(…)</code> für eine ganze Klammer). UND geht vor ODER.</p><p>Die Software vergleicht deine Lösung nie mit einer aufgeschriebenen, sondern prüft, ob sie <b>gleichwertig</b> ist <b>und</b> nicht mehr Terme und Buchstaben hat als die Minimalform. Wer nur umschreibt, ohne zu kürzen, besteht die zweite Prüfung nicht.</p><p>Am Ende der Station stehen freiwillige Zusatzaufgaben (eigene Übung), mit denen du die Gesetze mit Wahrheitstabellen nachweisen kannst.</p>',
    verweis: 'Aufgaben aus Stevens Lehrmittel «Digitaltechnik stationäre Vorgänge». Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: as
  });
})(typeof window !== 'undefined' ? window : globalThis);

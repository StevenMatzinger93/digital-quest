/* Lernpfad Station A8 – Boolesche Algebra. Gesetze mit Wahrheitstabellen nachweisen (die Spalten rechnet der Parser aus den Ausdrücken),
 * danach die Übungsserie: 18 Ausdrücke vereinfachen, Nr. 12 und 18 freiwillig. Die Ausdrücke sind hier SELBST gewählt (Stevens Serie liegt nicht vor, docs/FRAGEN_STUDIO.md);
 * der Test prüft, dass jeder wirklich kürzer wird, und rechnet die Minimalform unabhängig (Brute Force). */
(function (root) {
  'use strict';
  var P = root.DQPfad, T = [];
  function nachweis(id, titel, ein, spalten, text, extra) {
    var fs = spalten.map(P.formel), w = P.wahrheit({ ein: ein, aus: spalten.map(function (s) { return s; }), f: function (e) { return fs.map(function (f) { return f(e); }); } });
    var a = { id: id, titel: titel, art: 'tabelle', kopf: w.kopf, zeilen: w.zeilen, text: text }; if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; }); return a;
  }
  var as = [
    nachweis('A8.1', 'Kommutativgesetz', ['e1', 'e2'], ['e1e2', 'e2e1', 'e1 v e2', 'e2 v e1'], '<p><b>Kommutativgesetz:</b> Die Reihenfolge der Eingänge spielt keine Rolle. Rechne die vier Spalten aus. Was fällt dir auf?</p>'),
    nachweis('A8.2', 'Assoziativgesetz', ['e1', 'e2', 'e3'], ['(e1e2)e3', 'e1(e2e3)'], '<p><b>Assoziativgesetz:</b> Bei UND-Verknüpfungen darf man die Klammern verschieben. Rechne beide Seiten aus und vergleiche.</p>'),
    nachweis('A8.3', 'Distributivgesetz (UND über ODER)', ['e1', 'e2', 'e3'], ['e1(e2 v e3)', 'e1e2 v e1e3'], '<p><b>Distributivgesetz:</b> Ausmultiplizieren wie in der Algebra. Rechne beide Seiten aus.</p>'),
    nachweis('A8.4', 'Distributivgesetz (ODER über UND)', ['e1', 'e2', 'e3'], ['e1 v e2e3', '(e1 v e2)(e1 v e3)'], '<p>In der Schaltalgebra gilt das Distributivgesetz auch andersherum (anders als in der gewöhnlichen Algebra!). Rechne beide Seiten aus.</p>'),
    nachweis('A8.5', 'De Morgan (1)', ['e1', 'e2'], ['/(e1e2)', '/e1 v /e2'], '<p><b>De Morgan:</b> Das Gegenteil eines UND ist ein ODER der Gegenteile. Rechne beide Seiten aus.</p>'),
    nachweis('A8.6', 'De Morgan (2)', ['e1', 'e2'], ['/(e1 v e2)', '/e1/e2'], '<p>Das Gegenteil eines ODER ist ein UND der Gegenteile. Rechne beide Seiten aus.</p>'),
    nachweis('A8.7', 'Absorption', ['e1', 'e2'], ['e1 v e1e2', 'e1(e1 v e2)'], '<p><b>Absorption:</b> Ein Glied, das e1 enthält, wird von e1 «aufgesaugt». Rechne beide Spalten aus und vergleiche mit der Spalte e1.</p>'),
    { id: 'A8.8', titel: 'Prüffragen Gesetze', art: 'fragen', text: '<p>Fünf Fragen zu den Gesetzen.</p>', fragen: [
      { q: 'Was ergibt e1 v /e1?', opt: ['0', '1', 'e1', '/e1'], richtig: 1, erkl: 'Einer der beiden Teile ist immer 1.' },
      { q: 'Was ergibt e1 /e1?', opt: ['0', '1', 'e1', '/e1'], richtig: 0, erkl: 'Beide können nie gleichzeitig 1 sein.' },
      { q: 'Wie lautet De Morgan für /(e1 e2)?', opt: ['/e1 /e2', '/e1 v /e2', 'e1 v e2', '/e1 e2'], richtig: 1, erkl: 'Das Gegenteil eines UND ist ein ODER der Gegenteile.' },
      { q: 'Was ergibt e1 v e1 e2 (Absorption)?', opt: ['e1', 'e2', 'e1 e2', '1'], richtig: 0, erkl: 'Ist e1 = 1, so ist das Ergebnis 1; ist e1 = 0, so auch e1e2 = 0.' },
      { q: 'Was ergibt e1 (e1 v e2)?', opt: ['e1 v e2', 'e2', 'e1', 'e1 e2'], richtig: 2, erkl: 'Ausmultipliziert: e1e1 v e1e2 = e1 v e1e2 = e1.' }] }
  ];
  // Übungsserie: [gegeben, freiwillig?]
  var SERIE = [
    ['e1e2 v e1/e2'], ['e1 v e1e2'], ['e1 (e1 v e2)'], ['/e1e2 v e1e2'], ['(e1 v e2)(e1 v /e2)'], ['e1 v /e1e2'], ['e1 (/e1 v e2)'], ['e1e2e3 v e1e2/e3'], ['/(e1e2) e1'],
    ['e1/e2 v e1e2 v /e1e2'], ['e1e2 v /e1e3 v e2e3'], ['e1e2e3 v e1e2/e3 v e1/e2e3 v /e1e2e3', true], ['/(e1 v e2) v /(e1e2)'], ['/(e1e2) /(e1 v e3)'], ['(e1 v e2)(e1 v e3)'],
    ['e1e2e3e4 v e1e2e3/e4'], ['/e1e2/e3 v /e1e2e3 v e1e2/e3 v e1e2e3'], ['e1e2 v /e1e3 v e2e3 v e1e4 v /e1/e3e4', true]
  ];
  SERIE.forEach(function (s, i) {
    var n = Math.max.apply(null, (s[0].match(/e(\d)/g) || []).map(function (x) { return +x.slice(1); }));
    as.push({ id: 'A8.' + (9 + i), titel: 'Vereinfachen Nr. ' + (i + 1), pflicht: !s[1], art: 'ausdruck', n: n, gegeben: s[0],
      text: '<p>' + (s[1] ? '<b>Freiwillig.</b> ' : '') + 'Vereinfache den Ausdruck so weit wie möglich. Er soll am Ende gleichwertig sein, aber weniger Buchstaben haben. Das Ergebnis darfst du ausgeklammert oder ausmultipliziert schreiben.</p>', hilfe: 'Nützliche Regeln: Absorption (e1 v e1e2 = e1), e v /e = 1, e /e = 0, Ausklammern (e1e2 v e1/e2 = e1 (e2 v /e2) = e1), De Morgan.' });
  });
  P.station({
    id: 'A8', teil: 'A', nr: 8, titel: 'Boolesche Algebra', kurz: 'Gesetze nachweisen, Ausdrücke vereinfachen',
    einfuehrung: '<p>Mit den <b>Gesetzen der Booleschen Algebra</b> lassen sich Ausdrücke umformen und vereinfachen – das spart Gatter. Du weist zuerst die wichtigsten Gesetze mit Wahrheitstabellen nach: Zwei Ausdrücke sind gleich, wenn ihre Spalten in jeder Zeile gleich sind. Danach vereinfachst du 18 Ausdrücke; Nummer 12 und 18 sind freiwillig.</p><p>Schreibweise wie im Lehrmittel: <b>ODER</b> = <code>v</code>, <b>UND</b> = Nebeneinanderstellen, <b>NICHT</b> = Überstreichung (getippt mit <code>/</code>). UND geht vor ODER.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: as
  });
})(typeof window !== 'undefined' ? window : globalThis);

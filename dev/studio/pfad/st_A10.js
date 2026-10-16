/* Lernpfad Station A10 – KV-Diagramm. 13 Funktionen mit vier Eingängen in Minterm-Schreibweise «A = m(…)», Nr. 7 bis 13 freiwillig (Nr. 11 bis 13 mit Don't-Care).
 * Die Funktionen sind HIER gewählt (Stevens Serie liegt nicht vor, docs/FRAGEN_STUDIO.md). Minterm k: e1 = niedrigstes Bit; die kleine Zahl im Diagramm ist die Feldnummer k.
 * Päckchen und Minimalform prüft die Software gegen Quine-McCluskey. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var SERIE = [
    [[1, 3, 5, 7]], [[0, 1, 2, 3, 8, 9, 10, 11]], [[5, 7, 13, 15]], [[0, 2, 8, 10]], [[0, 1, 4, 5, 12, 13]], [[3, 5, 7, 11, 13, 15]],
    [[0, 2, 3, 5, 7, 8, 10, 11]], [[1, 2, 3, 6, 7, 9, 11, 14]], [[0, 1, 3, 4, 5, 7, 12, 13, 15]], [[2, 3, 4, 5, 6, 7, 10, 11, 14, 15]],
    [[1, 5, 6, 7, 9], [3, 13]], [[0, 2, 6, 8, 10], [4, 12]], [[1, 3, 5, 9, 13], [7, 15]]
  ];
  function mText(a) { return 'A = m(' + a.ones.join(', ') + ')' + (a.dc && a.dc.length ? ', Don\'t-Care: d(' + a.dc.join(', ') + ')' : ''); }
  var as = SERIE.map(function (s, i) {
    var fw = i >= 6, a = { id: 'A10.' + (i + 1), titel: 'KV-Diagramm Nr. ' + (i + 1), pflicht: !fw, art: 'kv', n: 4, ones: s[0], dc: s[1] || [] };
    a.text = '<p>' + (fw ? '<b>Freiwillig.</b> ' : '') + '<b>' + mText(a) + '</b></p><p>Das Diagramm zeigt die Funktion: 1 = Ausgang 1, 0 = Ausgang 0' + (a.dc.length ? ', X = beliebig (darf zu einem Päckchen dazugenommen werden, muss aber nicht)' : '') + '. Zeichne die <b>Päckchen</b> ein (so wenige und so gross wie möglich) und gib die <b>Minimalform</b> an.</p>';
    a.hilfe = 'Päckchen haben 1, 2, 4, 8 oder 16 Felder. Variablen, die sich im Päckchen ändern, fallen weg. Auch über den Rand des Diagramms darf ein Päckchen gehen.';
    return a;
  });
  [5, 6].forEach(function (nr, j) {
    var s = SERIE[nr - 1], f = function (e) { var k = P.wertLSB(e); return s[0].indexOf(k) >= 0 ? 1 : 0; };
    as.push({ id: 'A10.' + (14 + j), titel: 'Schaltung zu Nr. ' + nr, art: 'schaltung', n: 4, ausgaenge: 1, f: f, start: P.startNetz(4, 1),
      text: '<p>Baue die Schaltung zur Minimalform von <b>Nr. ' + nr + '</b> (A = m(' + s[0].join(', ') + ')): mit UND-Gattern für die Päckchen, einem ODER dahinter und NICHT-Gliedern für die überstrichenen Eingänge.</p>', hilfe: 'Die Minimalform hat ein UND-Glied je Päckchen.' });
  });
  P.station({
    id: 'A10', teil: 'A', nr: 10, titel: 'KV-Diagramm', kurz: 'Vereinfachen mit dem Karnaugh-Veitch-Diagramm',
    einfuehrung: '<p>Das <b>KV-Diagramm</b> zeigt die Wahrheitstabelle als Feld, in dem benachbarte Felder sich in nur einer Variablen unterscheiden. Dadurch lassen sich Einsen zu <b>Päckchen</b> zusammenfassen, und jedes Päckchen wird zu einem einzigen UND-Glied:</p><ul><li>Päckchen aus <b>1, 2, 4, 8 oder 16</b> benachbarten Einsen (Rechteck, auch über den Rand);</li><li>möglichst <b>grosse</b> Päckchen und möglichst <b>wenige</b>;</li><li>Variablen, die sich im Päckchen ändern, <b>fallen weg</b>;</li><li>Felder mit <b>X</b> (Don\'t-Care) darfst du dazunehmen, wenn das Päckchen dadurch grösser wird.</li></ul><p>Die Funktionen sind in <b>Minterm-Schreibweise</b> gegeben: <code>A = m(1, 3, 5)</code> heisst, der Ausgang ist 1 in den Zeilen 1, 3 und 5. Die Zeilennummer ist die Dualzahl der Eingänge mit <b>e1 als niedrigster Stelle</b>; diese Nummer steht klein in jedem Feld.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: as
  });
})(typeof window !== 'undefined' ? window : globalThis);

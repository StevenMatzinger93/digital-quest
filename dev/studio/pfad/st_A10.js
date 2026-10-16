/* Lernpfad Station A10 – Übungsserie KV-Diagramm: Stevens Originalaufgaben (docs/aufgaben/kv_diagramm.json, Wortlaut in AUFGABEN_ORIGINAL.md).
 * Stellenwertigkeit aus dem Lehrmittel: d'cb'a' = 0100, also ist d das höchstwertige und a das niederwertigste Bit; Feldnummer = d·8 + c·4 + b·2 + a. Mit 5 und 6 Eingängen zwei beziehungsweise vier Diagramme.
 * Geprüft wird nie gegen eine aufgeschriebene Lösung: Päckchen gültig, so gross wie möglich, so wenige wie möglich, Termzahl und Buchstabenzahl wie in der JSON-Vorgabe; Aufgabe 6 hat vier gleichwertige Minimalformen und alle werden angenommen.
 * Aufgaben 7 bis 13 sind freiwillig. Die selbst erfundenen Schaltungsaufgaben am Ende sind eine eigene, freiwillige Zusatzübung. */
(function (root) {
  'use strict';
  var P = root.DQPfad, KV = P.serie('kv'), BU = P.KONV.buchstaben;   // Stellenwertigkeit: konventionen.js
  var HILFE = 'Päckchen haben 1, 2, 4, 8, 16 … Felder. Variablen, die sich im Päckchen ändern, fallen weg. Auch über den Rand des Diagramms darf ein Päckchen gehen. X darfst du dazunehmen, musst es aber nicht.';
  function mText(r) {
    var n = r.eingaenge, m = (n === 4 ? 'Z = m4(' : 'Z = Σ m' + n + '(') + r.einsen.join(',') + ')';
    return m + (r.egal.length ? ' + X(' + r.egal.join(',') + ')' : '');
  }
  var as = [];
  function add(x) { as.push(x); }
  KV.filter(function (r) { return r.nr <= 10; }).forEach(function (r) { add(einzel(r)); });
  function einzel(r) {
    var n = r.eingaenge, fw = r.nr >= 7 && r.nr <= 13, vier = r.gleichwertige_loesungen > 1;
    return { id: 'A10.' + r.nr, titel: 'Aufgabe ' + r.nr + (fw ? ' (freiwillig)' : ''), pflicht: !fw, art: 'kv', n: n, ones: r.einsen, dc: r.egal, buchstaben: P.KONV.buchstaben.slice(0, n), erwartet: { terme: r.terme, buchstaben: r.buchstaben },
      text: '<p>' + (fw ? '<b>Freiwillig.</b> ' : '') + 'Vereinfachen Sie folgenden Ausdruck mit einem KV-Diagramm:</p><p class="pf-gegeben">' + mText(r) + '</p><p>Zeichne die Päckchen ein und gib die Minimalform an (<code>a\'</code> bedeutet NICHT a, Beispiel <code>d\'a\' + c\'b</code>).' + (vier ? ' <b>Diese Aufgabe hat mehrere gleich kurze Lösungen; jede davon ist richtig.</b>' : '') + '</p>', hilfe: HILFE };
  }
  // Sonderaufgaben 11 bis 13 (kein m-Ausdruck), alle freiwillig
  var ref11 = "BCD' + BCD + AB'C' + A'B'C'", r11 = P.refOf({ ref: ref11, n: 4, buchstaben: 'ABCD' });
  add({ id: 'A10.11a', titel: 'Aufgabe 11a (freiwillig): algebraisch vereinfachen', pflicht: false, art: 'ausdruck', n: 4, buchstaben: 'ABCD', gegeben: ref11, erwartet: { terme: 2, buchstaben: 4 },
    text: '<p><b>Freiwillig.</b> Gegeben: <b>Z = BCD\' + BCD + AB\'C\' + A\'B\'C\'</b>. a) Vereinfachen Sie algebraisch.</p>', hilfe: 'Ausklammern: BC(D\' + D) und B\'C\'(A + A\').' });
  add({ id: 'A10.11b', titel: 'Aufgabe 11b (freiwillig): mit KV-Diagramm', pflicht: false, art: 'kv', n: 4, ones: r11.ones, dc: [], buchstaben: 'ABCD', erwartet: { terme: 2, buchstaben: 4 },
    text: '<p><b>Freiwillig.</b> b) Vereinfachen Sie denselben Ausdruck mittels KV-Diagramm. (Im Diagramm ist A das niederwertigste Bit und D das höchstwertige, wie bei a, b, c, d.)</p>', hilfe: HILFE });
  var ref12a = "a'bc + ab'c + abc' + abc", ref12b = "cba' + cb'a' + cb'a + cba' + cba";
  [[ref12a, 'a', 3, 6], [ref12b, 'b', 1, 1]].forEach(function (x) {
    var r = P.refOf({ ref: x[0], n: 3, buchstaben: BU.slice(0, 3) });
    add({ id: 'A10.12' + x[1], titel: 'Aufgabe 12' + x[1] + ' (freiwillig)', pflicht: false, art: 'kv', n: 3, ones: r.ones, dc: [], buchstaben: BU.slice(0, 3), erwartet: { terme: x[2], buchstaben: x[3] },
      text: '<p><b>Freiwillig.</b> Vereinfachung mittels KV-Diagramm: <b>' + x[1] + ') ' + x[0].replace(/'/g, '\'') + '</b></p>', hilfe: HILFE });
  });
  // 13: Beweisen Sie a'bc + ab'c + abc' + abc = ab + ac + bc = (a + b)(b + c)(c + a)
  var f13 = ["a'bc + ab'c + abc' + abc", 'ab + ac + bc', '(a + b)(b + c)(c + a)'], fs13 = f13.map(function (t) { return P.formel(t, BU.slice(0, 3)); });
  var w13 = P.wahrheit({ ein: ['a', 'b', 'c'], aus: f13, f: function (e) { var x = [e[2], e[1], e[0]]; return fs13.map(function (f) { return f(x); }); } }); // e = [a, b, c] von links; formel erwartet e[0] = a (niederwertig)
  add({ id: 'A10.13a', titel: 'Aufgabe 13a (freiwillig): Beweisen Sie – Wahrheitstabelle', pflicht: false, art: 'tabelle', kopf: w13.kopf, zeilen: w13.zeilen, text: '<p><b>Freiwillig.</b> Beweisen Sie: <b>a\'bc + ab\'c + abc\' + abc = ab + ac + bc = (a + b)(b + c)(c + a)</b>. Rechne dazu die drei Ausdrücke in der Wahrheitstabelle aus: Sind die drei Spalten in jeder Zeile gleich, sind die Ausdrücke gleich.</p>' });
  add({ id: 'A10.13b', titel: 'Aufgabe 13b (freiwillig): Produktform', pflicht: false, art: 'ausdruck', n: 3, buchstaben: BU.slice(0, 3), ref: ref12a, form: 'pos', maxBuchstaben: 6, muster: '(a + b)(b + c)(c + a)', text: '<p><b>Freiwillig.</b> Gib den Ausdruck von Aufgabe 12a als <b>Produkt von Summen</b> an (UND von ODER-Klammern, höchstens sechs Buchstaben).</p>', hilfe: 'Aus der Summenform ab + ac + bc ergibt sich (a + b)(b + c)(c + a).' });
  KV.filter(function (r) { return r.nr >= 14; }).forEach(function (r) { add(einzel(r)); });
  // Eigene, freiwillige Zusatzübung: Schaltung zur Minimalform
  [1, 3].forEach(function (nr, j) {
    var r = KV.filter(function (x) { return x.nr === nr; })[0], f = function (e) { return r.einsen.indexOf(P.wertLSB(e)) >= 0 ? 1 : 0; };
    add({ id: 'A10.' + (20 + j), titel: 'Zusatz (eigene Übung): Schaltung zu Aufgabe ' + nr, pflicht: false, art: 'schaltung', n: 4, ausgaenge: 1, f: f, start: P.startNetz(4, 1),
      text: '<p><b>Freiwillige Zusatzaufgabe, nicht aus Stevens Serie.</b> Baue die Schaltung zur Minimalform von Aufgabe ' + nr + ' (' + mText(r) + '). E1 bis E4 sind a bis d (E1 = a, das niederwertigste Bit), L1 ist Z.</p>' });
  });
  P.station({
    id: 'A10', teil: 'A', nr: 10, titel: 'KV-Diagramm', kurz: 'Übungsserie: 14 Aufgaben mit KV-Diagrammen (Stevens Originalaufgaben)',
    einfuehrung: '<p>Das <b>KV-Diagramm</b> zeigt die Wahrheitstabelle als Feld, in dem benachbarte Felder sich in nur einer Variablen unterscheiden. Einsen lassen sich zu <b>Päckchen</b> zusammenfassen, und jedes Päckchen wird zu einem einzigen UND-Glied:</p><ul><li>Päckchen aus <b>1, 2, 4, 8, 16 …</b> benachbarten Einsen (Rechteck, auch über den Rand);</li><li>möglichst <b>grosse</b> Päckchen und möglichst <b>wenige</b>;</li><li>Variablen, die sich im Päckchen ändern, <b>fallen weg</b>;</li><li>Felder mit <b>X</b> darfst du dazunehmen, wenn das Päckchen dadurch grösser wird.</li></ul>' +
      '<p><b>Erklärungen (aus dem Lehrmittel):</b> <code>a\'</code> bedeutet NICHT a. <code>d\'cb\'a\'</code> bedeutet 0100. <code>m4</code> bedeutet 4 Eingänge: a, b, c, d. Beispiel: <code>Z = m4(0,5,8,9) + X(1,6)</code> – die Zahlen hinter <code>m4</code> entsprechen einer 1 im entsprechenden Feld, die Zahlen hinter dem <code>X</code> einem X.</p><p>Aus <code>d\'cb\'a\' = 0100</code> folgt: <b>d ist das höchstwertige, a das niederwertigste Bit</b>; Feldnummer = d·8 + c·4 + b·2 + a. Die Nummer steht klein in jedem Feld. Bei <b>5 Eingängen</b> gibt es zwei Diagramme (e = 0 und e = 1), bei <b>6 Eingängen</b> vier (f e = 00, 01, 10, 11); Päckchen dürfen sich über die Diagramme erstrecken, die Felder tragen dieselbe Nummer wie in der Aufgabe.</p><p><b>Aufgaben 7 bis 13 sind freiwillig.</b> Die Software prüft nicht gegen eine aufgeschriebene Lösung: Sie prüft, ob die Päckchen gültig, so gross und so wenige wie möglich sind und ob dein Ausdruck gleichwertig ist und nicht mehr Terme und Buchstaben hat als die Minimalform. Gibt es mehrere gleich kurze Lösungen (Aufgabe 6), ist jede richtig.</p>',
    verweis: 'Aufgaben aus Stevens Lehrmittel «Digitaltechnik stationäre Vorgänge». Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: as
  });
})(typeof window !== 'undefined' ? window : globalThis);

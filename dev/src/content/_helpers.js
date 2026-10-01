/* Digital Quest – Inhalts-Helfer. Alle Inhalte registrieren sich in window.DQ. */
(function (root) {
  'use strict';
  var DQ = root.DQ = root.DQ || { chapters: [], tasks: [], theories: [], byId: {} };

  /* Kapitel: sequence legt die Reihenfolge fest, z. B. ['T1A','1.1','1.2',…,'T1B',…]
   * after (optional): Station, nach der die erste Station dieses Kapitels offen ist (statt der letzten Station des Vorkapitels) */
  root.defChapter = function (c) {
    if (!c.id || !c.title || !c.sequence) throw new Error('defChapter: id, title, sequence nötig');
    c.stage = c.stage || (c.id <= 10 ? 'grund' : 'profi');
    DQ.chapters.push(c); return c;
  };

  /* Aufgabe
   * id ('1.1'), ch, title, story, brief, learn, take, hint, hint2, tags[]
   * palette: erlaubte Bauteiltypen; start / ref: Layouts {parts, wires}; wrong: [{name, parts, wires}]
   * need, tests, measure: siehe engine.js runTask
   * bench (optional): Werkbank-Layout {parts:[{id, x, y, rot}]} – eigene Lage je Bauteil-ID aus start/ref (siehe bench.js)
   * measureUX (optional): 'legacy' (Standard: Klick auf die Buchse setzt die Messspitze) | 'drag' (Werkbank: Spitzen ziehen,
   *   eigener Oszilloskop-Tastkopf, Messbereich von Hand waehlen – Schema-Ansicht bleibt beim Klick)
   * boss: true fuer Abschlussaufgabe */
  root.defTask = function (t) {
    ['id', 'ch', 'title', 'brief', 'start', 'ref'].forEach(function (k) { if (t[k] === undefined) throw new Error('defTask ' + t.id + ': ' + k + ' fehlt'); });
    t.kind = 'task';
    t.palette = t.palette || [];
    t.tests = t.tests || []; t.measure = t.measure || []; t.wrong = t.wrong || []; t.tags = t.tags || [];
    t.measureUX = t.measureUX || 'legacy';
    if (t.measureUX !== 'legacy' && t.measureUX !== 'drag') throw new Error('defTask ' + t.id + ': measureUX muss legacy oder drag sein');
    DQ.tasks.push(t); DQ.byId[t.id] = t; return t;
  };

  /* Mess-Aufgabe (Uebungswerkstatt): fertige, gesperrte Schaltung – nichts bauen, nur messen.
   * Wie defTask, aber palette = [] und ref = start (Topologie und Werte fix); measure ist Pflicht. */
  root.defMessaufgabe = function (t) {
    if (!t.start || !t.measure || !t.measure.length) throw new Error('defMessaufgabe ' + t.id + ': start und measure nötig');
    t.palette = []; t.ref = t.start; t.messOnly = true;
    return root.defTask(t);
  };

  /* Theorie-Auftrag: Lektion (HTML) + Fragen; bestanden ab 80 %
   * merksatz (empfohlen): ein bis zwei Saetze „Das Wichtigste in Kuerze“, erscheinen als Box am Ende der Lektion
   * visual (optional): Bild/Animation {type:'circuit'|'block'|…} oder Liste davon – siehe src/visuals.js und CLAUDE.md
   * question: {q, options[], correct, explain, verify?:{layout, mode, a, b} | verifyTruth?:{layout, sel, q}} */
  root.defTheory = function (t) {
    ['id', 'ch', 'title', 'lesson', 'questions'].forEach(function (k) { if (t[k] === undefined) throw new Error('defTheory ' + t.id + ': ' + k + ' fehlt'); });
    t.kind = 'theory'; t.pass = t.pass || 0.8; t.tags = t.tags || [];
    DQ.theories.push(t); DQ.byId[t.id] = t; return t;
  };

  /* Kurzschreibweise fuer Leitungen */
  root.W = function (from, to) { return { from: from, to: to }; };
})(typeof window !== 'undefined' ? window : globalThis);

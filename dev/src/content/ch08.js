/* Kapitel 8 – Schaltungsentwurf und KV-Diagramm
 * Quelle: Digitaltechnik stationaere Vorgaenge Kap. 4.3.1 (Foerderband: Schaltung aus Wahrheitstabelle, DNF/KNF), Kap. 6
 * (KV-Diagramm, Uebungsserie Σm4(…) + X(…), a = niederwertigstes Bit), Pruefung KV-Diagramme. */
(function () {
  'use strict';
  defChapter({
    id: 8, title: 'Schaltungsentwurf und KV-Diagramm',
    intro: 'Vom Auftrag zur Schaltung: Wahrheitstabelle aufstellen, Ausdruck ablesen, mit dem KV-Diagramm vereinfachen – und die kleinste Schaltung bauen, die das Verlangte leistet.',
    sequence: ['T8A', '8.1', '8.2', '8.3', '8.4', '8.5', 'T8B', '8.6', '8.7', '8.8', '8.9', '8.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  function designTask(o) {
    var outSrc = o.gates.length ? o.gates[o.gates.length - 1][0] : o.src;
    var ref = LG.net(o.n, o.gates, { L1: outSrc });
    defTask({
      id: o.id, ch: 8, title: o.title, tags: o.tags, story: o.story,
      brief: o.brief + (o.limit ? '<p class="limit">Erlaubt: hoechstens <b>' + o.limit.gates + '</b> Gatter.</p>' : '') + LG.table(o.n, o.f, { dc: o.dc }) + (o.dc ? '<p class="dim small">X = beliebig (kommt nie vor) – darf fuer die Vereinfachung als 0 oder 1 genutzt werden.</p>' : ''),
      learn: o.learn, take: o.take, hint: o.hint, hint2: o.hint2,
      palette: o.palette || ['and', 'or', 'not'], need: {}, limit: o.limit,
      start: LG.io(o.n), ref: ref, bench: LG.bench(ref),
      wrong: (o.wrong || []).map(function (w) { return named(w[0], LG.net(o.n, w[1], { L1: w[1].length ? w[1][w[1].length - 1][0] : w[2] })); }),
      tests: LG.truth(o.n, o.f, { dc: o.dc })
    });
  }

  defTheory({
    id: 'T8A', ch: 8, title: 'Von der Wahrheitstabelle zur Schaltung', tags: ['digital.entwurf', 'digital.dnf'],
    merksatz: 'Von der Aufgabe zur Wahrheitstabelle, daraus DNF (Minterme der Einsen verodern) oder KNF, vereinfachen, bauen und alle Kombinationen pruefen.',
    visual: [{ type: 'kmap', vars: 2, minterms: [1, 2], caption: 'Die Tabelle von A = 1 bei den Kombinationen 1 und 2 als Feld: Die Einsen liegen nicht benachbart – es bleiben zwei Terme (disjunktive Normalform).' },
      { type: 'circuit', toggleView: false, caption: 'Daraus gebaut: A = (ē1 · e2) ∨ (e1 · ē2) – je UND-Gatter ein Term, das ODER sammelt. Klicke die Eingaenge durch und vergleiche mit der Tabelle.',
        layout: LG.net(2, [['U1', 'not', ['E1']], ['U2', 'not', ['E2']], ['U3', 'and', ['U1', 'E2']], ['U4', 'and', ['E1', 'U2']], ['U5', 'or', ['U3', 'U4']]], { L1: 'U5' }) }],
    lesson:
      '<p><b>Vorgehen:</b> 1. Aufgabe verstehen, Ein- und Ausgaenge festlegen. 2. <b>Wahrheitstabelle</b> aufstellen. 3. Logischen Ausdruck ablesen. 4. Vereinfachen. 5. Schaltung bauen und mit allen Kombinationen pruefen.</p>' +
      '<p><b>DNF</b> (disjunktive Normalform, positive Logik): Fuer jede Zeile mit <b>A = 1</b> die Eingaenge verunden (Eingang 0 → negiert) – das ist ein <b>Minterm</b>. Alle Minterme verodern.</p>' +
      '<p><b>KNF</b> (konjunktive Normalform): Fuer jede Zeile mit <b>A = 0</b> die negierten Eingaenge verodern, alle Klammern verunden.</p>' +
      '<p>Beispiel Foerderband (A = 1 bei 01, 10, 11): DNF = ē2·e1 ∨ e2·ē1 ∨ e2·e1, KNF = (e1 ∨ e2). Beide vereinfachen sich zu <b>A = e1 ∨ e2</b>.</p>' +
      '<p>Die Zeilen werden dezimal nummeriert: E1 ist die niederwertigste Stelle. Eine Funktion schreibt man kurz als <b>Σm(…)</b> – die Liste der Zeilen mit A = 1.</p>',
    questions: [
      { q: 'Welche Zeilen der Wahrheitstabelle verwendet die DNF?', options: ['Alle', 'Die mit A = 1', 'Die mit A = 0', 'Nur die erste'], correct: 1, explain: 'DNF: jede 1-Zeile wird ein Minterm.' },
      { q: 'Wie lautet der Minterm fuer die Zeile E2 = 1, E1 = 0?', options: ['e2 · e1', 'e2 · ē1', 'ē2 · e1', 'e2 ∨ ē1'], correct: 1, explain: 'Verunden, Eingang 0 wird negiert.' },
      { q: 'Wie viele Zeilen hat die Wahrheitstabelle mit 3 Eingaengen?', options: ['3', '6', '8', '9'], correct: 2, explain: '2³ = 8 Kombinationen.' },
      { q: 'Welche Zeilennummer hat E3 = 1, E2 = 0, E1 = 1?', options: ['3', '5', '6', '101'], correct: 1, explain: '4 + 1 = 5.' },
      { q: 'Die DNF liefert A = ē2·e1 ∨ e2·ē1. Welches Gatter ist das?', options: ['UND', 'ODER', 'XOR', 'NOR'], correct: 2, explain: 'Genau ein Eingang 1 → Antivalenz (XOR).' }
    ]
  });

  designTask({ id: '8.1', n: 2, title: 'Das Foerderband', tags: ['digital.entwurf', 'digital.dnf'], f: LG.sigma([1, 2, 3]),
    story: 'Ein Foerderband (A) kann mit dem Taster E1 oder dem Taster E2 in Bewegung gesetzt werden. Beim Loslassen haelt es wieder an.',
    brief: 'Setze die Wahrheitstabelle als Schaltung um. Lies die DNF ab und vereinfache so weit wie moeglich.',
    learn: 'Aus der Tabelle ablesen, dann vereinfachen.', take: 'Die lange DNF (drei Minterme) und die kurze KNF ergeben dasselbe: A = E1 ∨ E2.',
    hint: 'Welche Zeilen sind 1? Faellt dir ein einzelnes Gatter mit dieser Tabelle ein?', hint2: 'A = E1 ∨ E2 – ein ODER genuegt.',
    palette: ['and', 'or', 'not'], gates: [['U1', 'or', ['E1', 'E2']]], wrong: [['UND', [['U1', 'and', ['E1', 'E2']]]]] });

  designTask({ id: '8.2', n: 2, title: 'XOR ohne XOR', tags: ['digital.entwurf', 'digital.dnf', 'digital.xor'], f: LG.sigma([1, 2]),
    story: 'Das XOR-Chip ist ausverkauft. Die Funktion wird trotzdem gebraucht.',
    brief: 'Baue die Tabelle nur mit <b>UND, ODER, NICHT</b> – direkt aus der DNF.', limit: { gates: 5 },
    learn: 'Jede Funktion laesst sich aus UND, ODER, NICHT bauen – die DNF zeigt wie.', take: 'A = ē2·e1 ∨ e2·ē1: zwei Minterme, zwei Inverter, ein ODER.',
    hint: 'Zwei Minterme: E1 und nicht E2; E2 und nicht E1.', hint2: 'U1 = ¬E1, U2 = ¬E2, U3 = E1·U2, U4 = E2·U1, U5 = U3 ∨ U4.',
    gates: [['U1', 'not', ['E1']], ['U2', 'not', ['E2']], ['U3', 'and', ['E1', 'U2']], ['U4', 'and', ['E2', 'U1']], ['U5', 'or', ['U3', 'U4']]],
    wrong: [['ODER statt XOR', [['U1', 'or', ['E1', 'E2']]]]] });

  designTask({ id: '8.3', n: 3, title: 'Zwei von drei', tags: ['digital.entwurf', 'digital.vereinfachen'], f: LG.sigma([3, 5, 6, 7]),
    story: 'Drei Temperatursensoren. Damit ein einzelner defekter Sensor keinen Fehlalarm ausloest, soll der Alarm erst kommen, wenn mindestens zwei ansprechen.',
    brief: 'Baue die <b>Mehrheitsschaltung</b> (2 von 3).', limit: { gates: 5 },
    learn: 'Vereinfachte DNF: A = e1·e2 ∨ e1·e3 ∨ e2·e3.', take: 'Die Minterm-Zeile 111 wird von jedem Paar abgedeckt – sie braucht keinen eigenen Term.',
    hint: 'Welche Paare muessen gleichzeitig 1 sein?', hint2: 'U1 = E1·E2, U2 = E1·E3, U3 = E2·E3, U4 = U1 ∨ U2, U5 = U4 ∨ U3.',
    gates: [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U1', 'U2']], ['U5', 'or', ['U4', 'U3']]],
    wrong: [['nur zwei Paare', [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['E1', 'E3']], ['U4', 'or', ['U1', 'U2']]]]] });

  var given = LG.net(3, [['U1', 'and', ['E2', 'E3']], ['U2', 'or', ['E1', 'U1']]], { L1: 'U2' });
  var fGiven = function (b) { return b[0] | (b[1] & b[2]); };
  defTask({
    id: '8.4', ch: 8, title: 'Tabelle einer fremden Schaltung', tags: ['digital.wahrheitstabelle', 'digital.entwurf'],
    story: 'Die Dokumentation einer alten Steuerung fehlt. Nur die Schaltung ist noch da.',
    brief: 'Nimm die Wahrheitstabelle auf: Schalte alle acht Kombinationen und trage die <b>Zeilennummern</b> ein, bei denen L1 leuchtet – als Anzahl und als Summe der Nummern.',
    learn: 'Messen statt raten: jede Kombination durchschalten.', take: 'A = E1 ∨ E2·E3 = Σm(1, 3, 5, 6, 7).',
    hint: 'Zeilennummer = E3·4 + E2·2 + E1·1.', hint2: 'L1 leuchtet bei 1, 3, 5, 6, 7 → Anzahl 5, Summe 22.',
    palette: [], start: given, ref: given, bench: LG.bench(given),
    tests: [{ name: 'Schaltung', expect: [{ noFault: true }] }],
    measure: [
      { id: 'n', ask: 'Anzahl Zeilen mit A = 1', unit: '', value: [0, 1, 2, 3, 4, 5, 6, 7].filter(function (k) { return fGiven(LG.bits(3, k)); }).length, tol: 0, abs: 0.1 },
      { id: 's', ask: 'Summe der Zeilennummern mit A = 1', unit: '', value: [0, 1, 2, 3, 4, 5, 6, 7].filter(function (k) { return fGiven(LG.bits(3, k)); }).reduce(function (a, b) { return a + b; }, 0), tol: 0, abs: 0.1 }
    ]
  });

  designTask({ id: '8.5', n: 3, title: 'Das Garagentor', tags: ['digital.entwurf', 'digital.knf'], f: function (b) { return (1 - b[0]) & (b[1] | b[2]); },
    story: 'Das Tor soll oeffnen, wenn der Handsender (E2) oder der Innentaster (E3) betaetigt wird – aber nie, solange die Lichtschranke (E1) unterbrochen ist.',
    brief: 'Entwirf die Schaltung: <b>A = Ē1 · (E2 ∨ E3)</b>. Pruefe die Tabelle vollstaendig.', limit: { gates: 3 },
    learn: 'Sicherheitsbedingungen werden mit UND und einer Negation eingebunden.', take: 'Die Lichtschranke sperrt alles – das ist die Aufgabe des Ē1 im UND.',
    hint: 'Erst die Ausloeser verodern, dann mit der invertierten Lichtschranke verunden.', hint2: 'U1 = ¬E1, U2 = E2 ∨ E3, U3 = U1 · U2.',
    gates: [['U1', 'not', ['E1']], ['U2', 'or', ['E2', 'E3']], ['U3', 'and', ['U1', 'U2']]],
    wrong: [['Lichtschranke nicht invertiert', [['U2', 'or', ['E2', 'E3']], ['U3', 'and', ['E1', 'U2']]]]] });

  defTheory({
    id: 'T8B', ch: 8, title: 'Das KV-Diagramm', tags: ['digital.kv', 'digital.vereinfachen'],
    merksatz: 'Im KV-Diagramm unterscheiden sich Nachbarfelder in genau einer Variablen; moeglichst grosse Paeckchen aus 2, 4 oder 8 Einsen (auch ueber den Rand, X darf mit) ergeben die kuerzesten Terme.',
    visual: { type: 'kmap', vars: 3, minterms: [1, 3, 5, 7], caption: 'Das Beispiel aus dem Text: alle Einsen haben e1 = 1 → ein Paeckchen aus vier Feldern, A = e1. Klicke eigene Einsen und X ein und lass die Paeckchen bilden.' },
    lesson:
      '<p>Das <b>KV-Diagramm</b> (Karnaugh-Veitch) ist die Wahrheitstabelle als Feld, so angeordnet, dass sich <b>benachbarte Felder in genau einer Variablen unterscheiden</b> (Gray-Code-Reihenfolge 0, 1, 3, 2). Auch der gegenueberliegende Rand ist benachbart.</p>' +
      '<table class="tt"><tr><th></th><th>ē2 ē1</th><th>ē2 e1</th><th>e2 e1</th><th>e2 ē1</th></tr><tr><th>ē3</th><td>0</td><td>1</td><td>3</td><td>2</td></tr><tr><th>e3</th><td>4</td><td>5</td><td>7</td><td>6</td></tr></table>' +
      '<p><b>Vorgehen:</b> Einsen eintragen, dann moeglichst <b>grosse Paeckchen</b> aus 1, 2, 4 oder 8 benachbarten Einsen bilden (Rechtecke, auch ueber den Rand). Jedes Paeckchen ergibt einen Term – die Variablen, die sich im Paeckchen aendern, fallen weg. Alle Terme verodern.</p>' +
      '<p>Ein Paeckchen aus 2 Feldern spart 1 Variable, aus 4 Feldern 2, aus 8 Feldern 3. <b>X</b> (don\'t care) sind Kombinationen, die nie vorkommen – sie duerfen mit ins Paeckchen, wenn es dadurch groesser wird.</p>' +
      '<p>Beispiel Σm3(1, 3, 5, 7): alle Einsen haben e1 = 1 → ein Paeckchen aus 4 Feldern → <b>A = e1</b>.</p>',
    questions: [
      { q: 'Wie unterscheiden sich benachbarte Felder im KV-Diagramm?', options: ['In allen Variablen', 'In genau einer Variablen', 'In zwei Variablen', 'Gar nicht'], correct: 1, explain: 'Deshalb kann man sie zusammenfassen: Die eine Variable faellt weg.' },
      { q: 'Wie viele Felder darf ein Paeckchen haben?', options: ['Beliebig viele', '1, 2, 4, 8 …', '3, 6, 9 …', 'Nur 2'], correct: 1, explain: 'Nur Zweierpotenzen – rechteckig angeordnet.' },
      { q: 'Wie viele Variablen fallen bei einem Paeckchen aus 4 Feldern weg?', options: ['1', '2', '3', '4'], correct: 1, explain: '4 = 2² → zwei Variablen fallen weg.' },
      { q: 'Was bedeutet ein X im KV-Diagramm?', options: ['Fehler', 'Die Kombination kommt nie vor – beliebig nutzbar', 'Immer 1', 'Immer 0'], correct: 1, explain: 'Don\'t care: darf als 0 oder 1 verwendet werden, wenn es das Paeckchen vergroessert.' },
      { q: 'Die Einsen liegen bei Σm3(0, 2, 4, 6). Ergebnis?', options: ['A = e1', 'A = ē1', 'A = e3', 'A = ē2'], correct: 1, explain: 'In allen vier Feldern ist e1 = 0 → A = ē1.' }
    ]
  });

  designTask({ id: '8.6', n: 3, title: 'Das grosse Paeckchen', tags: ['digital.kv', 'digital.vereinfachen'], f: LG.sigma([1, 3, 5, 7]),
    story: 'Die DNF hat vier Minterme mit je drei Variablen. Geht es kleiner?',
    brief: 'Vereinfache <b>Σm3(1, 3, 5, 7)</b> mit dem KV-Diagramm und baue das Ergebnis.', limit: { gates: 0 },
    learn: 'Vier benachbarte Einsen → zwei Variablen fallen weg.', take: 'Alle Einsen haben E1 = 1 – A = E1, ganz ohne Gatter.',
    hint: 'Welche Variable ist in allen vier 1-Zeilen gleich?', hint2: 'A = E1 → E1.out direkt an L1.',
    gates: [], src: 'E1', wrong: [['E3 statt E1', [], 'E3']] });

  designTask({ id: '8.7', n: 3, title: 'Randfelder', tags: ['digital.kv', 'digital.vereinfachen'], f: LG.sigma([0, 2, 4, 6]),
    story: 'Im KV-Diagramm liegen die Einsen ganz links und ganz rechts. Gehoeren sie zusammen?',
    brief: 'Vereinfache <b>Σm3(0, 2, 4, 6)</b> und baue das Ergebnis.', limit: { gates: 1 },
    learn: 'Linker und rechter Rand sind benachbart.', take: 'Die vier Randfelder bilden ein Paeckchen: A = Ē1.',
    hint: 'In welchem Eingang sind alle 1-Zeilen gleich?', hint2: 'A = ¬E1 – ein Inverter.',
    gates: [['U1', 'not', ['E1']]], wrong: [['E1 statt Ē1', [], 'E1']] });

  designTask({ id: '8.8', n: 3, title: 'Zwei Paeckchen', tags: ['digital.kv', 'digital.vereinfachen'], f: LG.sigma([2, 3, 5, 6, 7]),
    story: 'Fuenf Einsen im Diagramm – wie viele Gatter braucht es wirklich?',
    brief: 'Vereinfache <b>Σm3(2, 3, 5, 6, 7)</b> und baue mit hoechstens zwei Gattern.', limit: { gates: 2 },
    learn: 'Ueberlappende Paeckchen sind erlaubt und oft noetig.', take: 'Paeckchen 2, 3, 6, 7 → E2; Paeckchen 5, 7 → E1·E3. A = E2 ∨ E1·E3.',
    hint: 'Ein Viererpaeckchen und ein Zweierpaeckchen.', hint2: 'U1 = E1·E3, U2 = E2 ∨ U1.',
    gates: [['U1', 'and', ['E1', 'E3']], ['U2', 'or', ['E2', 'U1']]], wrong: [['nur E2', [], 'E2']] });

  designTask({ id: '8.9', n: 4, title: 'Don\'t care nutzen', tags: ['digital.kv', 'digital.dontcare'], f: LG.sigma([5, 7]), dc: [1, 3, 8, 9, 10, 11],
    story: 'Aus der Uebungsserie: Z = Σm4(5, 7) + X(1, 3, 8, 9, 10, 11). Die X-Kombinationen kommen in der Anlage nie vor.',
    brief: 'Vereinfache mit Hilfe der X-Felder und baue mit hoechstens zwei Gattern. (Die X-Zeilen werden nicht geprueft.)', limit: { gates: 2 },
    learn: 'X-Felder vergroessern Paeckchen.', take: 'Mit X(1, 3): Paeckchen 1, 3, 5, 7 → Z = E1 · Ē4.',
    hint: 'Nimm die X-Felder 1 und 3 zu den Einsen 5 und 7 dazu. Was ist in allen vier gleich?', hint2: 'E1 = 1 und E4 = 0 → U1 = ¬E4, U2 = E1·U1.',
    gates: [['U1', 'not', ['E4']], ['U2', 'and', ['E1', 'U1']]], wrong: [['E1 allein', [], 'E1']] });

  designTask({ id: '8.10', n: 4, title: 'Die grosse Vereinfachung', tags: ['digital.kv', 'digital.vereinfachen'], f: LG.sigma([0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15]),
    story: 'Aus der Uebungsserie: Z = Σm4(0 … 7, 9, 11, 12 … 15). Vierzehn Einsen!',
    brief: 'Vereinfache und baue mit hoechstens drei Gattern. Tipp: Oft ist es einfacher, die <b>Nullen</b> zu betrachten.', limit: { gates: 3 },
    learn: 'Achter-Paeckchen sparen drei Variablen.', take: 'Z = Ē4 ∨ E3 ∨ E1 – nur die Zeilen 8 und 10 sind 0.',
    hint: 'Null ist Z nur bei 8 und 10: E4 = 1, E3 = 0, E1 = 0.', hint2: 'U1 = ¬E4, U2 = U1 ∨ E3, U3 = U2 ∨ E1.',
    gates: [['U1', 'not', ['E4']], ['U2', 'or', ['U1', 'E3']], ['U3', 'or', ['U2', 'E1']]],
    wrong: [['E4 nicht invertiert', [['U2', 'or', ['E4', 'E3']], ['U3', 'or', ['U2', 'E1']]]]] });
})();

/* Lernpfad Station A3 – Beschaltungsregeln: nie Ausgang gegen Ausgang, keine offenen Eingänge. Kurze Prüffragen, dazu Schaltungen, in denen der Fehler zu finden ist. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var Pt = function (id, type, x, y, props) { var p = { id: id, type: type, x: x, y: y, rot: 0 }; if (props) p.props = props; return p; };
  var W = function (a, b) { return { from: a, to: b }; };
  var GND = Pt('GND1', 'ground', 200, 360);
  // Fehler 1: zwei Gatterausgänge sind auf dieselbe Anzeige geschaltet
  var f1 = { parts: [Pt('E1', 'logicin', 200, 80), Pt('E2', 'logicin', 200, 200), Pt('U1', 'nand', 520, 100), Pt('U2', 'nor', 520, 220), Pt('L1', 'logicled', 900, 160), GND],
    wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('E1.out', 'U2.in1'), W('E2.out', 'U2.in2'), W('U1.out', 'L1.in'), W('U2.out', 'L1.in')] };
  // Fehler 2: ein Eingang des UND ist offen
  var f2 = { parts: [Pt('E1', 'logicin', 200, 80), Pt('E2', 'logicin', 200, 200), Pt('U1', 'and', 520, 140), Pt('L1', 'logicled', 900, 140), GND], wires: [W('E1.out', 'U1.in1'), W('U1.out', 'L1.in')] };
  // Fehler 3: drittes Eingangsbein des UND ist offen (das Gatter hat drei Eingänge, gebraucht werden zwei)
  var f3 = { parts: [Pt('E1', 'logicin', 200, 80), Pt('E2', 'logicin', 200, 200), Pt('U1', 'and', 520, 140, { inputs: 3 }), Pt('L1', 'logicled', 900, 140), GND], wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'L1.in')] };
  var pal = ['logicin', 'logicled', 'ground', 'node', 'and', 'nand', 'nor'], fix = ['E1', 'E2', 'L1', 'GND1'];
  P.station({
    id: 'A3', teil: 'A', nr: 3, titel: 'Beschaltungsregeln', kurz: 'Nie Ausgang gegen Ausgang, keine offenen Eingänge',
    einfuehrung: '<p>Zwei Regeln, die du nie verletzen darfst:</p><ol><li><b>Nie Ausgang gegen Ausgang.</b> Gibt ein Ausgang 1 und der andere 0, fliesst ein grosser Strom zwischen den beiden. Das ist ein Kurzschluss und kann die Bausteine zerstören.</li><li><b>Keine offenen Eingänge.</b> Ein offener Eingang hat keinen sicheren Pegel: Er fängt Störungen ein, und bei CMOS-Bausteinen kann er den Baustein überhitzen. Nicht gebrauchte Eingänge legt man auf 0 oder 1 oder verbindet sie mit einem benutzten Eingang.</li></ol>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: pal, auto: true,
    aufgaben: [
      { id: 'A3.1', titel: 'Prüffragen Beschaltung', art: 'fragen', text: '<p>Sechs kurze Fragen zu den beiden Regeln.</p>', fragen: [
        { q: 'Zwei Gatterausgänge werden direkt miteinander verbunden. Was ist die Gefahr?', opt: ['Keine, das ist normal', 'Hoher Kurzschlussstrom, wenn einer 1 und der andere 0 liefert', 'Die Schaltung wird langsamer', 'Der Eingang wird zerstört'], richtig: 1, erkl: 'Ein Ausgang zieht nach oben, der andere nach unten: Der Strom fliesst nur durch die beiden Ausgänge.' },
        { q: 'Was macht man mit einem nicht gebrauchten Eingang eines UND-Gatters?', opt: ['Offen lassen', 'Auf 1 legen oder mit einem benutzten Eingang verbinden', 'Auf 0 legen', 'Mit dem Ausgang verbinden'], richtig: 1, erkl: 'Beim UND ändert eine 1 nichts (e · 1 = e). Eine 0 würde den Ausgang immer auf 0 zwingen.' },
        { q: 'Was macht man mit einem nicht gebrauchten Eingang eines ODER-Gatters?', opt: ['Auf 0 legen oder mit einem benutzten Eingang verbinden', 'Auf 1 legen', 'Offen lassen', 'Mit dem Ausgang verbinden'], richtig: 0, erkl: 'Beim ODER ändert eine 0 nichts (e v 0 = e). Eine 1 würde den Ausgang immer auf 1 zwingen.' },
        { q: 'Ein Eingang bleibt offen. Welche Aussage stimmt?', opt: ['Er ist immer 0', 'Er ist immer 1', 'Sein Pegel ist nicht sicher: Er kann Störungen einfangen', 'Er zählt nicht zur Schaltung'], richtig: 2, erkl: 'Offene Eingänge «schweben». Bei TTL werden sie meist als 1 gelesen, bei CMOS ist der Pegel unbestimmt – verlassen darf man sich auf keines von beiden.' },
        { q: 'Wie schliesst man zwei Ausgänge richtig an dieselbe Leitung an?', opt: ['Gar nicht, dazu braucht man besondere Bausteine (Open-Collector oder Tri-State)', 'Mit einem Draht', 'Mit einem Widerstand von 0 Ω', 'Über einen Kondensator'], richtig: 0, erkl: 'Nur Ausgänge, die abschalten können oder offen sind, dürfen eine Leitung teilen.' },
        { q: 'Ein Gatter mit drei Eingängen wird nur mit zwei Signalen gebraucht. Das dritte Bein …', opt: ['darf offen bleiben', 'wird so angeschlossen, dass es die Funktion nicht verändert', 'wird abgeschnitten', 'wird mit der Masse und dem Ausgang verbunden'], richtig: 1, erkl: 'Beim UND mit 1 oder einem anderen Eingang, beim ODER mit 0 oder einem anderen Eingang.' }] },
      { id: 'A3.2', titel: 'Fehler suchen 1: Ausgang gegen Ausgang', art: 'schaltung', n: 2, ausgaenge: 1, f: function (e) { return 1 - (e[0] & e[1]); }, start: f1, gesperrt: fix, palette: pal,
        text: '<p>Diese Schaltung soll ein <b>NAND</b> sein: Die Anzeige L1 soll nur 0 zeigen, wenn beide Schalter 1 sind. Sie arbeitet aber nicht richtig. <b>Finde den Fehler und behebe ihn</b> (Bauteile oder Leitungen löschen, neu ziehen), dann prüfen.</p>', hilfe: 'Schau dir an, wohin die beiden Gatterausgänge laufen.',
        muster: { parts: [Pt('E1', 'logicin', 200, 80), Pt('E2', 'logicin', 200, 200), Pt('U1', 'nand', 520, 100), Pt('L1', 'logicled', 900, 160), GND], wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'L1.in')] },
        falsch: f1 },
      { id: 'A3.3', titel: 'Fehler suchen 2: offener Eingang', art: 'schaltung', n: 2, ausgaenge: 1, f: function (e) { return e[0] & e[1]; }, start: f2, gesperrt: fix, palette: pal,
        text: '<p>Diese Schaltung soll ein <b>UND</b> von E1 und E2 sein. Die Anzeige verhält sich merkwürdig. <b>Finde den Fehler und behebe ihn.</b></p>', hilfe: 'Zähle die Leitungen an den Eingängen des UND-Gatters.',
        muster: { parts: [Pt('E1', 'logicin', 200, 80), Pt('E2', 'logicin', 200, 200), Pt('U1', 'and', 520, 140), Pt('L1', 'logicled', 900, 140), GND], wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'L1.in')] }, falsch: f2 },
      { id: 'A3.4', titel: 'Fehler suchen 3: überzähliges Eingangsbein', art: 'schaltung', n: 2, ausgaenge: 1, f: function (e) { return e[0] & e[1]; }, start: f3, gesperrt: fix, palette: pal,
        text: '<p>Das UND-Gatter hat drei Eingänge, gebraucht werden aber nur zwei. Das dritte Bein ist offen. <b>Mach die Schaltung vorschriftsgemäss</b>, ohne die Funktion zu verändern. Du kannst das dritte Bein anschliessen oder die Eingangszahl des Gatters ändern (Eigenschaftenfeld).</p>', hilfe: 'Auf welchen Pegel muss ein ungebrauchter UND-Eingang gelegt werden, damit er nichts verändert?',
        muster: { parts: [Pt('E1', 'logicin', 200, 80), Pt('E2', 'logicin', 200, 200), Pt('U1', 'and', 520, 140, { inputs: 3 }), Pt('L1', 'logicled', 900, 140), GND], wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('E2.out', 'U1.in3'), W('U1.out', 'L1.in')] }, falsch: f3 }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

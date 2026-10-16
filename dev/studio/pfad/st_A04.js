/* Lernpfad Station A4 – Symbolik: Gatter in neuer Norm (Rechteck mit Zeichen) und in US-Darstellung erkennen.
 * Die alte DIN-Norm fehlt bewusst (siehe docs/FRAGEN_STUDIO.md): Ohne Stevens Arbeitsblatt ist nicht gesichert, welche Zeichen er dafür verlangt. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var NAMEN = ['Trennstufe', 'NICHT', 'UND', 'NAND', 'ODER', 'NOR', 'XOR', 'XNOR'];
  var NORM = { 'Trennstufe': ['1', false], 'NICHT': ['1', true], 'UND': ['&', false], 'NAND': ['&', true], 'ODER': ['≥1', false], 'NOR': ['≥1', true], 'XOR': ['=1', false], 'XNOR': ['=1', true] };
  var US = { 'Trennstufe': ['buf', false, false], 'NICHT': ['not', true, false], 'UND': ['and', false, false], 'NAND': ['and', true, false], 'ODER': ['or', false, false], 'NOR': ['or', true, false], 'XOR': ['or', false, true], 'XNOR': ['or', true, true] };
  var REIHE = ['UND', 'NOR', 'Trennstufe', 'XNOR', 'NICHT', 'ODER', 'XOR', 'NAND']; // gemischt, nicht in der Reihenfolge der Station A5
  function zuordnung(art) {
    return { kopf: ['Symbol', 'Gatter'], zeilen: REIHE.map(function (n) { return [{ html: art === 'norm' ? P.svgNorm(NORM[n][0], NORM[n][1]) : P.svgUS(US[n][0], US[n][1], US[n][2]), t: 'Symbol' }, { a: n, typ: 'wahl', opt: NAMEN }]; }) };
  }
  var z1 = zuordnung('norm'), z2 = zuordnung('us');
  P.station({
    id: 'A4', teil: 'A', nr: 4, titel: 'Symbolik', kurz: 'Schaltzeichen: neue Norm und US-Darstellung',
    einfuehrung: '<p>In Schaltplänen begegnen dir zwei Zeichensysteme. Nach der <b>neuen Norm</b> (DIN EN 60617-12) ist jedes Gatter ein <b>Rechteck</b>, und ein Zeichen im Rechteck sagt, was es tut: <b>&amp;</b> (UND), <b>≥1</b> (ODER: mindestens ein Eingang ist 1), <b>=1</b> (XOR: genau ein Eingang ist 1) und <b>1</b> (Trennstufe). Ein <b>Kreis</b> am Ausgang bedeutet «negiert».</p><p>Die <b>US-Darstellung</b> (ANSI) unterscheidet die Gatter durch ihre Form: das UND hat einen geraden Rücken und einen runden Bauch, das ODER ist spitz geschwungen, das XOR hat einen zusätzlichen Bogen davor. Auch dort steht ein Kreis für die Negation.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik». Die alte DIN-Norm ist hier noch nicht enthalten.', schaltet: [], auto: true,
    aufgaben: [
      { id: 'A4.1', titel: 'Neue Norm: Gatter erkennen', art: 'tabelle', text: '<p>Wähle zu jedem Symbol nach neuer Norm das richtige Gatter.</p>', kopf: z1.kopf, zeilen: z1.zeilen, hilfe: 'Das Zeichen im Rechteck verrät die Funktion, der Kreis am Ausgang die Negation.' },
      { id: 'A4.2', titel: 'US-Darstellung: Gatter erkennen', art: 'tabelle', text: '<p>Wähle zu jedem Symbol in US-Darstellung das richtige Gatter.</p>', kopf: z2.kopf, zeilen: z2.zeilen, hilfe: 'Zuerst die Grundform (gerader Rücken = UND, geschwungen = ODER, Dreieck = Trennstufe oder NICHT), dann Kreis und Zusatzbogen.' },
      { id: 'A4.3', titel: 'Prüffragen Symbole', art: 'fragen', text: '<p>Fünf kurze Fragen.</p>', fragen: [
        { q: 'Welches Zeichen steht im Rechteck eines UND-Gatters (neue Norm)?', opt: ['≥1', '&', '=1', '1'], richtig: 1, erkl: '«&» heisst: alle Eingänge müssen 1 sein.' },
        { q: 'Was bedeutet «≥1» im Rechteck?', opt: ['Alle Eingänge sind 1', 'Mindestens ein Eingang ist 1', 'Genau ein Eingang ist 1', 'Der Ausgang ist negiert'], richtig: 1, erkl: '«≥1» ist das ODER: Der Ausgang ist 1, wenn mindestens ein Eingang 1 ist.' },
        { q: 'Was bedeutet «=1» im Rechteck?', opt: ['Genau ein Eingang ist 1 (XOR)', 'Der Eingang ist 1', 'Alle Eingänge sind gleich', 'Das Gatter ist ein NICHT'], richtig: 0, erkl: '«=1» ist die Antivalenz: Der Ausgang ist 1, wenn die Eingänge verschieden sind.' },
        { q: 'Was bedeutet ein kleiner Kreis an einem Ein- oder Ausgang?', opt: ['Der Anschluss ist offen', 'Negation (Inversion)', 'Der Anschluss ist die Masse', 'Ein Kondensator'], richtig: 1, erkl: 'Der Kreis negiert das Signal an dieser Stelle.' },
        { q: 'Welches Gatter ist ein Rechteck mit «&» und einem Kreis am Ausgang?', opt: ['UND', 'NOR', 'NAND', 'XNOR'], richtig: 2, erkl: 'UND mit negiertem Ausgang ist NICHT-UND: NAND.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

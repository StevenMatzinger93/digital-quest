/* Lernpfad Station B4 – T-Flipflop. Folgefunktion aus dem Lehrbuch (T = 1 kippt, T = 0 hält); die Tabellen und die Prüffolge werden daraus gerechnet. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  P.ffStation({
    id: 'B4', nr: 4, titel: 'T-Flipflop', kurz: 'Kippen bei T = 1 – Frequenzhalbierung', typ: 'tff', ein: ['T'], next: P.FF.t,
    plan: [{ set: { E1: 1 }, takte: 1 }, { takte: 1 }, { takte: 1 }, { set: { E1: 0 }, takte: 2 }, { set: { E1: 1 }, takte: 1 }, { takte: 3 }],
    einfuehrung: '<p>Das <b>T-Flipflop</b> («Toggle») hat einen Eingang T und den Takt C. Ist <b>T = 1</b>, <b>kippt</b> der Ausgang bei jeder aktiven Taktflanke (aus 0 wird 1, aus 1 wird 0). Ist <b>T = 0</b>, bleibt er, wie er ist.</p><p>Mit T = 1 kippt Q bei jeder Flanke, also nur bei jeder <b>zweiten</b> in dieselbe Richtung: Die Ausgangsfrequenz ist <b>halb so gross</b> wie die Taktfrequenz. Darum ist das T-Flipflop der Grundbaustein von Zählern.</p><p>Notation wie im Lehrmittel: <b>AV</b> ist der Ausgang <b>vor</b> der Taktflanke, <b>A</b> der Ausgang <b>danach</b>.</p>',
    analyseHilfe: 'T = 0 hält den Zustand, T = 1 kippt ihn.',
    extra: [
      { titel: 'Frequenzhalbierung im Zeitverlauf', art: 'fragen', text: '<p>Setze ein T-Flipflop mit <b>T = 1</b> (Pegelschalter auf 1) und einem <b>Taktgeber</b> von <b>8 Hz</b> (Eigenschaft Frequenz). Öffne den Zeitverlauf mit dem Takt und Q (Rechtsklick auf die Anschlüsse → «Zeitverlauf»), lass einige Sekunden laufen und lies die Periode von Q ab. Beantworte dann:</p>', fragen: [
        { q: 'Der Takt hat 8 Hz. Welche Frequenz hat Q?', opt: ['16 Hz', '8 Hz', '4 Hz', '2 Hz'], richtig: 2, erkl: 'Q kippt bei jeder steigenden Flanke: Eine volle Periode von Q braucht zwei Taktperioden. 8 Hz / 2 = 4 Hz.' },
        { q: 'Zwei T-Flipflops hintereinander (Q des ersten taktet das zweite), beide mit T = 1, Takt 8 Hz. Welche Frequenz hat Q des zweiten?', opt: ['4 Hz', '2 Hz', '1 Hz', '16 Hz'], richtig: 1, erkl: 'Je Stufe wird halbiert: 8 → 4 → 2 Hz.' },
        { q: 'Wie viele Takte braucht ein T-Flipflop mit T = 1, bis Q wieder denselben Wert hat?', opt: ['1', '2', '3', '4'], richtig: 1, erkl: 'Zweimal kippen führt zurück zum Anfang.' }] }
    ],
    fragen: [
      { q: 'Was macht ein T-Flipflop bei T = 1 an der aktiven Taktflanke?', opt: ['Q wird 0', 'Q wird 1', 'Q kippt', 'Q bleibt'], richtig: 2, erkl: 'Das ist der Sinn des «Toggle».' },
      { q: 'Was macht ein T-Flipflop bei T = 0?', opt: ['Q bleibt', 'Q kippt', 'Q wird 0', 'Q wird 1'], richtig: 0, erkl: 'Ohne T geschieht nichts, der Zustand wird gehalten.' },
      { q: 'In der Ansteuertabelle steht für AV = 1, A = 1 (halten) bei T:', opt: ['1', '0', 'X', 'Q'], richtig: 1, erkl: 'Gehalten wird bei T = 0.' }]
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Kapitel 5 – Zahlensysteme
 * Quelle: Zahlensysteme Umrechnung (Stellenwertsystem, Dezimal→Binaer per Division mit Rest, Fremdsystem→Dezimal, verwandte
 * Systeme 2/8/16, Horner-Schema), Digitaltechnik stationaere Vorgaenge Kap. 2 (Bin – Hex – Dez, Bitbreite, MSB/LSB),
 * Kap. 7.1 (BCD-Code). Umgesetzt am Experimentierboard: Pegelschalter = Bits, Logikanzeigen = Bitreihe. */
(function () {
  'use strict';

  defChapter({
    id: 5, title: 'Zahlensysteme',
    intro: 'Computer kennen nur 0 und 1. Am Experimentierboard stellst du Zahlen mit Pegelschaltern ein, liest Bitmuster an Logikanzeigen ab und bringst eine 7-Segment-Anzeige zum Zaehlen.',
    sequence: ['T5A', '5.1', '5.2', '5.3', '5.4', '5.5', 'T5B', '5.6', '5.7', '5.8', '5.9', '5.10']
  });

  /* Bitreihe: n Pegelschalter (E1 = Bit 0, rechts) mit n Logikanzeigen darueber, MSB links. value = eingestellte Zahl, wired = verdrahtet */
  function row(n, value, wired, ledsWired) {
    var parts = [{ id: 'GND1', type: 'ground', x: 120 + 100 * n, y: 440, rot: 0 }], wires = [];
    for (var b = 0; b < n; b++) {
      var x = 120 + 100 * (n - 1 - b);
      var e = { id: 'E' + (b + 1), type: 'logicin', x: x, y: 420, rot: 270 };
      if (value >> b & 1) e.props = { closed: true };
      parts.push(e, { id: 'L' + (b + 1), type: 'logicled', x: x, y: 200, rot: 270 });
      if (wired !== false && (ledsWired === undefined || ledsWired)) wires.push(W('E' + (b + 1) + '.out', 'L' + (b + 1) + '.in'));
    }
    return { parts: parts, wires: wires };
  }
  function benchRow(n) {
    var p = [{ id: 'GND1', x: 170 + 120 * n, y: 640, rot: 0 }], s = n > 6 ? 105 : 120;
    for (var b = 0; b < n; b++) { var x = 180 + s * (n - 1 - b); p.push({ id: 'E' + (b + 1), x: x, y: 470, rot: 270 }, { id: 'L' + (b + 1), x: x, y: 230, rot: 270 }); }
    return { parts: p };
  }
  function ledsShow(n, value) { var e = []; for (var b = 0; b < n; b++) e.push({ sel: 'L' + (b + 1), on: !!(value >> b & 1) }); return e; }
  var named = function (name, l) { l.name = name; return l; };

  /* BCD-Anzeige: 4 Pegelschalter → Decoder → 7-Segment */
  function bcdBoard(value, outWired) {
    var parts = [{ id: 'GND1', type: 'ground', x: 120, y: 520, rot: 0 }, { id: 'IC1', type: 'dec7', x: 380, y: 300, rot: 0 }, { id: 'AZ1', type: 'seg7', x: 600, y: 300, rot: 0 }], wires = [];
    ['A', 'B', 'C', 'D'].forEach(function (k, i) {
      var e = { id: 'E' + (i + 1), type: 'logicin', x: 180, y: 240 + 40 * i, rot: 0 }; if (value >> i & 1) e.props = { closed: true };
      parts.push(e); wires.push(W('E' + (i + 1) + '.out', 'IC1.' + k));
    });
    if (outWired !== false) 'abcdefg'.split('').forEach(function (k) { wires.push(W('IC1.' + k, 'AZ1.' + k)); });
    return { parts: parts, wires: wires };
  }
  var bcdBench = { parts: [{ id: 'GND1', x: 170, y: 690, rot: 0 }, { id: 'E1', x: 190, y: 250, rot: 0 }, { id: 'E2', x: 190, y: 350, rot: 0 }, { id: 'E3', x: 190, y: 450, rot: 0 }, { id: 'E4', x: 190, y: 550, rot: 0 },
    { id: 'IC1', x: 470, y: 400, rot: 0 }, { id: 'AZ1', x: 740, y: 400, rot: 0 }] };
  var setBits = function (n, v) { var s = {}; for (var b = 0; b < n; b++) s['E' + (b + 1)] = { closed: !!(v >> b & 1) }; return s; };

  /* ================= Theorie A ================= */
  defTheory({
    id: 'T5A', ch: 5, title: 'Stellenwertsystem und Dualzahlen', tags: ['digital.zahlensysteme', 'digital.binaer'],
    merksatz: 'Im Stellenwertsystem zaehlt Ziffer mal Basis hoch Stelle; dual gibt es nur 0 und 1, mit n Bit die Zahlen 0 bis 2ⁿ − 1 – dezimal nach dual durch fortgesetztes Halbieren, Reste von unten lesen.',
    visual: { type: 'numberSteps', mode: 'divide', value: 43, base: 2, caption: 'Dezimal → dual: immer durch 2 teilen, die Reste von unten nach oben lesen. Zum Schluss die Probe mit den Wertigkeiten.' },
    lesson:
      '<p>In einem <b>Stellenwertsystem</b> haengt der Wert einer Ziffer von ihrer Stelle ab: <b>Wert = Ziffer · Basis<sup>Stelle</sup></b>, gelesen von rechts (Stelle 0) nach links. Die Basis bestimmt die Ziffern: dezimal (Basis 10) 0–9, dual/binaer (Basis 2) nur 0 und 1.</p>' +
      '<div class="formula">125₁₀ = 1·10² + 2·10¹ + 5·10⁰</div>' +
      '<p>Ein <b>Bit</b> ist eine Binaerstelle. Die <b>Bitbreite</b> ist die Anzahl Stellen. Das Bit ganz rechts ist das <b>niederwertigste Bit</b> (LSB, Wert 2⁰ = 1), das ganz links das <b>hoechstwertige</b> (MSB). Mit n Bits lassen sich die Zahlen 0 … 2ⁿ − 1 darstellen (4 Bit: 0 … 15).</p>' +
      '<p><b>Binaer → dezimal:</b> Stellenwerte der Einsen addieren: 110001₂ = 32 + 16 + 1 = 49.</p>' +
      '<p><b>Dezimal → binaer:</b> fortlaufend durch 2 teilen, die Reste von unten nach oben lesen: 49 : 2 = 24 R1, 24 : 2 = 12 R0, 12 : 2 = 6 R0, 6 : 2 = 3 R0, 3 : 2 = 1 R1, 1 : 2 = 0 R1 → 110001₂.</p>' +
      '<p>Im Labor ist ein Bit eine <b>Spannung</b>: 0 V (Low, 0) oder 5 V (High, 1). Ein Pegelschalter erzeugt den Pegel, eine Logikanzeige macht ihn sichtbar.</p>',
    questions: [
      { q: 'Welche Dezimalzahl ist 1010₂?', options: ['5', '10', '12', '20'], correct: 1, explain: '8 + 2 = 10.' },
      { q: 'Wie lautet 49₁₀ im Dualsystem?', options: ['100011', '110001', '101001', '111000'], correct: 1, explain: '32 + 16 + 1 = 49 → 110001₂.' },
      { q: 'Welche groesste Zahl kann eine 4-Bit-Dualzahl darstellen?', options: ['4', '8', '15', '16'], correct: 2, explain: '2⁴ − 1 = 15 (1111₂).' },
      { q: 'Welchen Stellenwert hat das MSB einer 8-Bit-Zahl?', options: ['8', '64', '128', '256'], correct: 2, explain: 'Stelle 7 → 2⁷ = 128.' },
      { q: 'Welche Spannung entspricht bei 5-V-Logik einer 1?', options: ['0 V', 'ca. 1 V', 'ca. 2,5 V', 'ca. 5 V'], correct: 3, explain: 'High = nahe der Versorgungsspannung, Low = nahe 0 V; die Schwelle liegt bei 2,5 V.' }
    ]
  });

  /* ================= Aufgaben 1–5 ================= */
  defTask({
    id: '5.1', ch: 5, title: 'Die erste Dualzahl', tags: ['digital.binaer', 'digital.pegel'],
    story: 'Das Experimentierboard liegt bereit: vier Pegelschalter, vier Logikanzeigen. Die Laborassistenz sagt: „Zeig mir die Fuenf.“',
    brief: 'Stelle mit den Pegelschaltern die Zahl <b>5</b> ein. E1 ist das niederwertigste Bit (ganz rechts, Wert 1), E4 das hoechstwertige (Wert 8).',
    learn: 'Jedes Bit hat einen Stellenwert: 8 – 4 – 2 – 1.',
    take: '5 = 4 + 1 → 0101₂: E3 und E1 auf 1.',
    hint: 'Welche Stellenwerte (8, 4, 2, 1) ergeben zusammen 5?',
    hint2: '4 + 1 = 5 → E3 = 1, E1 = 1, die anderen 0. Pegelschalter anklicken schaltet um.',
    palette: [], start: row(4, 0), ref: row(4, 5), bench: benchRow(4),
    wrong: [named('Bitreihenfolge verkehrt (1010)', row(4, 10))],
    tests: [{ name: 'Anzeige', expect: ledsShow(4, 5).concat([{ noFault: true }]) }]
  });

  defTask({
    id: '5.2', ch: 5, title: 'Bitmuster lesen', tags: ['digital.binaer', 'digital.zahlensysteme'],
    story: 'Ein Sensor meldet seinen Zaehlerstand als Bitmuster auf vier Anzeigen.',
    brief: 'Lies das Bitmuster an den Logikanzeigen ab und trage die <b>Dezimalzahl</b> ein. Miss zur Kontrolle den <b>Pegel</b> am hoechstwertigen Bit (E4 gegen Masse).',
    learn: 'Binaer → dezimal: Stellenwerte der Einsen addieren.',
    take: '1011₂ = 8 + 2 + 1 = 11. Eine 1 ist im Labor eine Spannung von ca. 5 V.',
    hint: 'Leuchtet eine Anzeige, ist das Bit 1. Von rechts: 1, 2, 4, 8.',
    hint2: 'V⎓, rote Spitze an E4.out, schwarze an GND1.',
    palette: [], start: row(4, 11), ref: row(4, 11), bench: benchRow(4),
    tests: [{ name: 'Muster', expect: ledsShow(4, 11) }],
    measure: [
      { id: 'dez', ask: 'Angezeigte Zahl (dezimal)', unit: '', value: 11, tol: 0.001 },
      { id: 'u', ask: 'Pegel am MSB (E4 gegen Masse)', unit: 'V', mode: 'V', a: 'E4.out', b: 'GND1.g', tol: 0.03 }
    ]
  });

  defTask({
    id: '5.3', ch: 5, title: 'Division mit Rest', tags: ['digital.binaer', 'digital.zahlensysteme'],
    story: 'Die Maschine soll 13 Teile zaehlen. Die Steuerung braucht die Zahl als Bitmuster.',
    brief: 'Rechne <b>13</b> ins Dualsystem um (fortlaufend durch 2 teilen) und stelle das Ergebnis mit den Pegelschaltern ein.',
    learn: 'Dezimal → binaer: durch 2 teilen, Reste von unten nach oben lesen.',
    take: '13 : 2 = 6 R1, 6 : 2 = 3 R0, 3 : 2 = 1 R1, 1 : 2 = 0 R1 → 1101₂.',
    hint: 'Der erste Rest ist das niederwertigste Bit (E1).',
    hint2: '1101₂: E4 = 1, E3 = 1, E2 = 0, E1 = 1.',
    palette: [], start: row(4, 0), ref: row(4, 13), bench: benchRow(4),
    wrong: [named('Reste falsch herum gelesen (1011)', row(4, 11))],
    tests: [{ name: 'Anzeige', expect: ledsShow(4, 13) }]
  });

  defTask({
    id: '5.4', ch: 5, title: 'Die Anzeige verdrahten', tags: ['digital.bcd', 'digital.7segment'],
    story: 'Die 7-Segment-Anzeige ist montiert, aber nicht angeschlossen. Der Decoder uebersetzt die Dualzahl in Segmente.',
    brief: 'Verbinde die Ausgaenge <b>a … g</b> des BCD-Decoders IC1 mit den gleichnamigen Eingaengen der 7-Segment-Anzeige AZ1. Die Anzeige soll die eingestellte Zahl richtig zeigen – pruefe mit 7 und 9.',
    learn: 'Ein Decoder wandelt einen Binaercode in ein anderes Muster um – hier BCD in 7 Segmente.',
    take: 'Jedes Segment hat seinen Buchstaben: a oben, dann im Uhrzeigersinn b … f, g in der Mitte.',
    hint: 'IC1.a → AZ1.a, IC1.b → AZ1.b … bis g.',
    hint2: 'Zum Testen die Pegelschalter umlegen: 0111 = 7, 1001 = 9.',
    palette: [], start: bcdBoard(7, false), ref: bcdBoard(7), bench: bcdBench,
    wrong: [named('b und c vertauscht', { parts: bcdBoard(7).parts, wires: bcdBoard(7, false).wires.concat('adefg'.split('').map(function (k) { return W('IC1.' + k, 'AZ1.' + k); }), [W('IC1.b', 'AZ1.c'), W('IC1.c', 'AZ1.b')]) })],
    tests: [
      { name: 'Sieben', set: setBits(4, 7), expect: [{ sel: 'AZ1', digit: 7 }] },
      { name: 'Neun', set: setBits(4, 9), expect: [{ sel: 'AZ1', digit: 9 }] },
      { name: 'Zwei', set: setBits(4, 2), expect: [{ sel: 'AZ1', digit: 2 }] }
    ]
  });

  defTask({
    id: '5.5', ch: 5, title: 'High und Low messen', tags: ['digital.pegel', 'messen.spannung'],
    story: 'Die Werkmeisterin fragt: „Woher weisst du, dass eine 1 wirklich eine 1 ist?“ – „Messen!“',
    brief: 'Das Board zeigt 1001₂. Miss die Pegel an <b>E4</b> (Bit = 1) und <b>E3</b> (Bit = 0) gegen Masse und am Eingang der Logikanzeige <b>L1</b>.',
    learn: 'Logische Zustaende sind Spannungsbereiche: Low nahe 0 V, High nahe 5 V.',
    take: 'Die Logikanzeige vergleicht die Spannung mit der Schwelle (2,5 V) – darueber leuchtet sie.',
    hint: 'Schwarze Spitze bleibt an GND1.g, rote wandert.',
    hint2: 'Erwartet ca. 5 V, 0 V und 5 V.',
    palette: [], start: row(4, 9), ref: row(4, 9), bench: benchRow(4),
    tests: [{ name: 'Muster', expect: ledsShow(4, 9) }],
    measure: [
      { id: 'h', ask: 'Pegel an E4 (Bit = 1)', unit: 'V', mode: 'V', a: 'E4.out', b: 'GND1.g', tol: 0.03 },
      { id: 'l', ask: 'Pegel an E3 (Bit = 0)', unit: 'V', mode: 'V', a: 'E3.out', b: 'GND1.g', tol: 0.03, abs: 0.05 },
      { id: 'l1', ask: 'Spannung am Eingang von L1', unit: 'V', mode: 'V', a: 'L1.in', b: 'GND1.g', tol: 0.03 }
    ]
  });

  /* ================= Theorie B ================= */
  defTheory({
    id: 'T5B', ch: 5, title: 'Hexadezimal, BCD und Horner-Schema', tags: ['digital.hex', 'digital.bcd', 'digital.zahlensysteme'],
    merksatz: 'Eine Hex-Ziffer entspricht vier Bit (0–9, A–F); das Horner-Schema rechnet jedes Fremdsystem von links nach dezimal um; BCD codiert jede Dezimalziffer einzeln mit vier Bit.',
    visual: { type: 'numberSteps', mode: 'bases', value: 173, caption: 'Dieselbe Zahl in BCD (jede Dezimalziffer 4 Bit) und hexadezimal (jede Hex-Ziffer 4 Bit), dann mit dem Horner-Schema zurueck: mal 16, plus naechste Ziffer.' },
    lesson:
      '<p>Das <b>Hexadezimalsystem</b> (Basis 16) hat die Ziffern 0–9 und A–F (A = 10 … F = 15). Weil 2⁴ = 16, entspricht <b>genau eine Hex-Ziffer vier Bits</b> (einem Nibble). Umrechnen binaer ↔ hex heisst: in Vierergruppen von rechts aufteilen.</p>' +
      '<div class="formula">1011 0110₂ = B6₁₆ = 182₁₀</div>' +
      '<p>Genauso ist das <b>Oktalsystem</b> (Basis 8 = 2³) mit Dreiergruppen verwandt: 110 001₂ = 61₈.</p>' +
      '<p><b>Horner-Schema</b> (Fremdsystem → dezimal): von links beginnen, Zwischenergebnis mal Basis plus naechste Ziffer. 110001₂: 1 → 1·2+1 = 3 → 6 → 12 → 24 → 24·2+1 = 49.</p>' +
      '<p><b>BCD-Code</b> (Binary Coded Decimal): jede Dezimalziffer einzeln mit 4 Bit. 59 → 0101 1001. Die Kombinationen 1010 … 1111 sind in BCD <b>ungueltig</b> – ein BCD-Decoder zeigt dann nichts an. BCD passt direkt zu 7-Segment-Anzeigen.</p>',
    questions: [
      { q: 'Welche Dezimalzahl ist EF₁₆?', options: ['215', '239', '254', '255'], correct: 1, explain: '14·16 + 15 = 239.' },
      { q: 'Wie lautet 1111₂ hexadezimal?', options: ['E', 'F', '10', '15'], correct: 1, explain: '1111₂ = 15 = F.' },
      { q: 'Wie viele Bits entsprechen einer Hex-Ziffer?', options: ['2', '3', '4', '8'], correct: 2, explain: '16 = 2⁴ – eine Hex-Ziffer ist ein Nibble.' },
      { q: 'Wie wird die Dezimalzahl 59 im BCD-Code dargestellt?', options: ['0011 1011', '0101 1001', '0111 0011', '1001 0101'], correct: 1, explain: '5 → 0101, 9 → 1001.' },
      { q: 'Was zeigt ein BCD-7-Segment-Decoder bei der Eingabe 1100₂?', options: ['12', 'C', 'Nichts – ungueltiger BCD-Code', '0'], correct: 2, explain: 'BCD kennt nur 0000 … 1001. 1100 ist ungueltig, die Anzeige bleibt dunkel.' }
    ]
  });

  /* ================= Aufgaben 6–10 ================= */
  defTask({
    id: '5.6', ch: 5, title: 'Eine Hex-Ziffer', tags: ['digital.hex', 'digital.binaer'],
    story: 'Im Datenblatt steht die Adresse als „C“. Die Anzeige erwartet das Bitmuster.',
    brief: 'Stelle die Hex-Ziffer <b>C</b> mit den vier Pegelschaltern ein und trage ihren Dezimalwert ein.',
    learn: 'Eine Hex-Ziffer = 4 Bit.',
    take: 'C₁₆ = 12₁₀ = 1100₂.',
    hint: 'A = 10, B = 11, C = 12 …',
    hint2: '12 = 8 + 4 → E4 = 1, E3 = 1.',
    palette: [], start: row(4, 0), ref: row(4, 12), bench: benchRow(4),
    wrong: [named('B statt C (1011)', row(4, 11))],
    tests: [{ name: 'Anzeige', expect: ledsShow(4, 12) }],
    measure: [{ id: 'dez', ask: 'C₁₆ als Dezimalzahl', unit: '', value: 12, tol: 0.001 }]
  });

  defTask({
    id: '5.7', ch: 5, title: 'Ein ganzes Byte', tags: ['digital.hex', 'digital.binaer'],
    story: 'Ein Byte, acht Bits: Das Pruefprogramm sendet den Wert 2D₁₆. Stell ihn nach.',
    brief: 'Stelle <b>2D₁₆</b> auf den acht Pegelschaltern ein (E8 = MSB links, E1 = LSB rechts) und trage den Dezimalwert ein.',
    learn: 'Jede Hex-Ziffer ergibt eine Vierergruppe: 2 → 0010, D → 1101.',
    take: '2D₁₆ = 0010 1101₂ = 32 + 8 + 4 + 1 = 45.',
    hint: 'Linke Hex-Ziffer (2) → obere vier Bits E8…E5, rechte (D) → untere vier Bits E4…E1.',
    hint2: '0010 1101: E6, E4, E3 und E1 auf 1.',
    palette: [], start: row(8, 0), ref: row(8, 45), bench: benchRow(8),
    wrong: [named('Nibbles vertauscht (D2)', row(8, 0xD2))],
    tests: [{ name: 'Anzeige', expect: ledsShow(8, 45) }],
    measure: [{ id: 'dez', ask: '2D₁₆ als Dezimalzahl', unit: '', value: 45, tol: 0.001 }]
  });

  defTask({
    id: '5.8', ch: 5, title: 'Ungueltiger BCD-Code', tags: ['digital.bcd', 'digital.7segment'],
    story: 'Die Anzeige bleibt manchmal dunkel. Ein Kollege vermutet einen Wackelkontakt.',
    brief: 'Verdrahte die Pegelschalter mit den Decoder-Eingaengen (<b>E1 → A (1), E2 → B (2), E3 → C (4), E4 → D (8)</b>). Probiere danach 3, 8 und 12 aus.',
    learn: 'BCD kennt nur 0 … 9 – ab 1010₂ bleibt die Anzeige dunkel.',
    take: 'Kein Wackelkontakt: 12 ist im BCD-Code ungueltig. Zweistellige Zahlen brauchen zwei Ziffern (zwei Decoder).',
    hint: 'Die Wertigkeiten stehen am Decoder: 1, 2, 4, 8.',
    hint2: 'E1.out → IC1.A, E2.out → IC1.B, E3.out → IC1.C, E4.out → IC1.D.',
    palette: [],
    start: { parts: bcdBoard(0).parts, wires: 'abcdefg'.split('').map(function (k) { return W('IC1.' + k, 'AZ1.' + k); }) }, ref: bcdBoard(0), bench: bcdBench,
    wrong: [named('Wertigkeiten verdreht (E1 → D)', { parts: bcdBoard(0).parts, wires: [W('E1.out', 'IC1.D'), W('E2.out', 'IC1.C'), W('E3.out', 'IC1.B'), W('E4.out', 'IC1.A')].concat('abcdefg'.split('').map(function (k) { return W('IC1.' + k, 'AZ1.' + k); })) })],
    tests: [
      { name: 'Drei', set: setBits(4, 3), expect: [{ sel: 'AZ1', digit: 3 }] },
      { name: 'Acht', set: setBits(4, 8), expect: [{ sel: 'AZ1', digit: 8 }] },
      { name: 'Zwoelf', set: setBits(4, 12), expect: [{ sel: 'AZ1', on: false }] }
    ]
  });

  defTask({
    id: '5.9', ch: 5, title: 'Verwandte Systeme', tags: ['digital.hex', 'digital.zahlensysteme'],
    story: 'Im Speicherauszug steht 1011 0110. Der Techniker will den Wert dezimal – und die hohe Hex-Ziffer.',
    brief: 'Lies das Byte auf den Anzeigen ab. Trage den <b>Dezimalwert</b> ein und den Wert der <b>oberen Hex-Ziffer</b> (als Dezimalzahl, A = 10 … F = 15).',
    learn: 'Vierergruppen machen aus Binaer im Kopf Hex.',
    take: '1011 0110₂ = B6₁₆ = 11·16 + 6 = 182.',
    hint: 'Teile in 1011 | 0110 auf.',
    hint2: '1011 = 11 = B, 0110 = 6 → B6₁₆ = 182₁₀.',
    palette: [], start: row(8, 182), ref: row(8, 182), bench: benchRow(8),
    tests: [{ name: 'Muster', expect: ledsShow(8, 182) }],
    measure: [
      { id: 'dez', ask: 'Byte als Dezimalzahl', unit: '', value: 182, tol: 0.001 },
      { id: 'hi', ask: 'Obere Hex-Ziffer (Wert 0–15)', unit: '', value: 11, tol: 0.001 }
    ]
  });

  defTask({
    id: '5.10', ch: 5, title: 'Horner am Board', tags: ['digital.binaer', 'digital.zahlensysteme'],
    story: 'Das Beispiel aus dem Unterricht: 49. Jetzt mit sechs echten Bits.',
    brief: 'Rechne <b>49</b> in eine 6-Bit-Dualzahl um und stelle sie ein. Kontrolliere mit dem Horner-Schema.',
    learn: 'Horner: von links, mal 2 plus naechstes Bit.',
    take: '110001₂: 1 → 3 → 6 → 12 → 24 → 49.',
    hint: '49 = 32 + 16 + 1.',
    hint2: 'E6 = 1, E5 = 1, E1 = 1, der Rest 0.',
    palette: [], start: row(6, 0), ref: row(6, 49), bench: benchRow(6),
    wrong: [named('100011 (35)', row(6, 35))],
    tests: [{ name: 'Anzeige', expect: ledsShow(6, 49) }]
  });
})();

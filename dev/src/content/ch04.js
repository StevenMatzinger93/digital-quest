/* Kapitel 4 – Messtechnik
 * Quelle: Messtechnik Erweiterung (Kap. 1 Grundbegriffe, 2 Messgeraete, 3 Messkategorien, 5 Genauigkeit/Messfehler inkl.
 * Systemfehler, 6 Messaufgaben), Willkommen in der Digitaltechnik (Auftrag 3: systematische Fehlersuche). */
(function () {
  'use strict';

  defChapter({
    id: 4, title: 'Messtechnik',
    intro: 'Ein Messgeraet zeigt immer eine Zahl – aber stimmt sie? Du lernst Messbereiche, Potentiale, Eigenverbrauch und Messfehler kennen und findest einen Defekt, den man nicht sieht.',
    sequence: ['T4A', '4.1', '4.2', '4.3', '4.4', '4.5', 'T4B', '4.6', '4.7', '4.8', '4.9', '4.10']
  });

  var bat = function (v) { return { id: 'B1', type: 'battery', value: v, x: 160, y: 300, rot: 0 }; };
  var R = function (id, v, x, y, rot) { return { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; };
  var bB1 = { id: 'B1', x: 240, y: 460, rot: 0 };
  var named = function (name, l) { l.name = name; return l; };
  var divider = function (u, r1, r2) { return { parts: [bat(u), R('R1', r1, 360, 240, 90), R('R2', r2, 360, 380, 90)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')] }; };
  var bDiv = { parts: [bB1, { id: 'R1', x: 560, y: 300, rot: 90 }, { id: 'R2', x: 720, y: 480, rot: 90 }] };

  /* ================= Theorie A ================= */
  defTheory({
    id: 'T4A', ch: 4, title: 'Messen, Pruefen, Messgeraete', tags: ['messen.grundbegriffe', 'messen.geraete', 'messen.sicherheit'],
    lesson:
      '<p><b>Messen</b> heisst, eine physikalische Groesse als Zahlenwert zu erfassen (z. B. 8,02 V). <b>Pruefen</b> stellt nur fest, ob etwas vorhanden ist oder nicht (Spannung ja/nein) – ohne Zahlenwert.</p>' +
      '<p><b>Kalibrieren</b>: vergleichen, wie weit die Anzeige vom wahren Wert abweicht. <b>Justieren</b>: die Anzeige nachstellen, damit die Abweichung wieder klein ist. <b>Eichen</b>: amtliche Pruefung, ob das Geraet in der Eichfehlergrenze liegt.</p>' +
      '<p><b>Messgeraete:</b> Das <b>Drehspulmesswerk</b> zeigt bei DC den linearen Mittelwert, bei AC (mit Gleichrichter) den Gleichrichtwert. Das <b>Dreheisenmesswerk</b> zeigt bei AC den Effektivwert. Das <b>Digitalmultimeter</b> misst Spannung, Strom und Widerstand – je nach Bauart als AVG, RMS oder TRMS. Die <b>Strommesszange</b> misst ueber das Magnetfeld, ohne den Kreis aufzutrennen.</p>' +
      '<p><b>Potential</b> ist die Spannung eines Punktes gegen einen festen Bezugspunkt (Masse ⏚, 0 V). Eine Spannung ist die Differenz zweier Potentiale.</p>' +
      '<p><b>Messkategorien</b> sagen, wo ein Geraet eingesetzt werden darf: <b>CAT I</b> Geraete ohne Netzverbindung (Batterie, Schutzkleinspannung) · <b>CAT II</b> Geraete am Stecker · <b>CAT III</b> Gebaeudeinstallation (Steckdosen, Verteiler, fest angeschlossene Geraete) · <b>CAT IV</b> Quelle der Installation (Hausanschluss, Zaehler).</p>',
    questions: [
      { q: 'Ein Spannungspruefer zeigt „Spannung vorhanden“ ohne Zahlenwert. Das ist …', options: ['Messen', 'Pruefen', 'Kalibrieren', 'Eichen'], correct: 1, explain: 'Pruefen kennt nur zwei Zustaende – vorhanden oder nicht.' },
      { q: 'Die amtliche Pruefung, ob ein Messgeraet in der Fehlergrenze liegt, heisst …', options: ['Justieren', 'Kalibrieren', 'Eichen', 'Pruefen'], correct: 2, explain: 'Eichen macht eine staatliche Eichbehoerde.' },
      { q: 'Wie misst eine Strommesszange den Strom?', options: ['Sie trennt den Kreis auf', 'Ueber das Magnetfeld um den Leiter', 'Ueber einen Nebenwiderstand im Geraet', 'Gar nicht, nur Spannung'], correct: 1, explain: 'Das Magnetfeld des Leiters induziert in der Zange einen proportionalen Strom.' },
      { q: 'In welcher Messkategorie misst du an einer Steckdose der Gebaeudeinstallation?', options: ['CAT I', 'CAT II', 'CAT III', 'Keine'], correct: 2, explain: 'Steckdosen, Verteiler und fest angeschlossene Verbraucher gehoeren zu CAT III.' },
      { q: 'Ein Punkt hat das Potential 10 V, ein anderer 6 V (gegen Masse). Welche Spannung liegt dazwischen?', options: ['4 V', '6 V', '10 V', '16 V'], correct: 0, explain: 'Spannung = Potentialdifferenz: 10 V − 6 V = 4 V.' }
    ]
  });

  /* ================= Aufgaben 1–5 ================= */
  var lamp = function (closed) {
    return { parts: [bat(9), { id: 'S1', type: 'switch', props: { closed: closed }, x: 300, y: 200, rot: 0 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }],
      wires: [W('B1.p', 'S1.a'), W('S1.b', 'H1.a'), W('H1.b', 'B1.n')] };
  };
  defTask({
    id: '4.1', ch: 4, title: 'Wo lauert die Spannung?', tags: ['messen.spannung', 'messen.sicherheit'],
    story: '„Lampe aus, also alles spannungsfrei“ – sagt der Neue. Die Werkmeisterin reicht ihm schweigend das Multimeter.',
    brief: 'Die Lampe ist aus, der Schalter offen. Miss die Spannung <b>am offenen Schalter</b> und <b>an der Lampe</b>.',
    learn: 'Ein offener Schalter hat die volle Spannung ueber sich.',
    take: '„Aus“ heisst nicht „spannungsfrei“: Am offenen Kontakt liegt die ganze Quellenspannung an.',
    hint: 'V⎓, rote Spitze an S1.a, schwarze an S1.b.',
    hint2: 'Es fliesst kein Strom → an der Lampe faellt nichts ab → alles liegt am Schalter.',
    palette: [], start: lamp(false), ref: lamp(false),
    bench: { parts: [bB1, { id: 'S1', x: 520, y: 290, rot: 0 }, { id: 'H1', x: 780, y: 460, rot: 0 }] },
    tests: [{ name: 'Anlage aus', expect: [{ sel: 'H1', i: [0, 1e-6] }] }],
    measure: [
      { id: 'us', ask: 'Spannung am offenen Schalter S1', unit: 'V', mode: 'V', a: 'S1.a', b: 'S1.b', tol: 0.03 },
      { id: 'uh', ask: 'Spannung an der Lampe H1', unit: 'V', mode: 'V', a: 'H1.a', b: 'H1.b', tol: 0.03, abs: 0.02 }
    ]
  });

  var small = divider(10, 100000, 100);
  defTask({
    id: '4.2', ch: 4, title: 'Kleine Spannungen', tags: ['messen.spannung', 'messen.messbereich'],
    story: 'Ein Shunt-Widerstand liefert nur wenige Millivolt. Reicht die Aufloesung des Multimeters?',
    brief: 'Miss die Spannung an <b>R2 (100 Ω)</b> und an <b>R1 (100 kΩ)</b>. Achte auf die Einheit, die das Multimeter anzeigt.',
    learn: 'Das Multimeter waehlt den Messbereich automatisch – kleine Spannungen in mV mit feinerer Aufloesung.',
    take: 'Im 600-mV-Bereich zeigt das Geraet 0,1 mV Aufloesung, im 6-V-Bereich nur 1 mV. Einheit immer mitlesen!',
    hint: 'Die Anzeige springt auf mV – trage den Wert in mV ein.',
    hint2: 'U₂ = 10 V · 100 Ω / 100,1 kΩ ≈ 10 mV.',
    palette: [], start: small, ref: small, bench: bDiv,
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'u2', ask: 'Spannung an R2', unit: 'mV', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 },
      { id: 'u1', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  var amm = function (mode) {
    var p = [bat(9), { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 90 }];
    if (!mode) return { parts: p, wires: [W('B1.p', 'H1.a'), W('H1.b', 'B1.n')] };
    p.push({ id: 'A1', type: 'ammeter', x: 300, y: 200, rot: 0 });
    return mode === 'series' ? { parts: p, wires: [W('B1.p', 'A1.a'), W('A1.b', 'H1.a'), W('H1.b', 'B1.n')] }
      : { parts: p, wires: [W('B1.p', 'H1.a'), W('H1.b', 'B1.n'), W('A1.a', 'H1.a'), W('A1.b', 'H1.b')] };
  };
  defTask({
    id: '4.3', ch: 4, title: 'Fest eingebauter Strommesser', tags: ['messen.strom', 'messen.geraete'],
    story: 'Die Pruefstation soll den Lampenstrom dauernd anzeigen – ohne dass jemand mit dem Multimeter danebensteht.',
    brief: 'Baue den <b>Strommesser A1</b> fest in den Lampenkreis ein und lies den Strom ab.',
    learn: 'Ein Strommesser gehoert immer in Reihe.',
    take: 'Parallel zur Lampe wuerde der Strommesser (fast 0 Ω) einen Kurzschluss bilden.',
    hint: 'Leitung B1.+ → H1 loesen, A1 dazwischen setzen.',
    hint2: 'B1.+ → A1.a, A1.b → H1.a.',
    palette: ['ammeter'], need: { ammeter: 1 },
    start: amm(), ref: amm('series'),
    bench: { parts: [bB1, { id: 'A1', x: 520, y: 290, rot: 0 }, { id: 'H1', x: 780, y: 460, rot: 0 }] },
    wrong: [named('Strommesser parallel zur Lampe', amm('parallel'))],
    tests: [{ name: 'Betrieb', expect: [{ sel: '@ammeter', i: [0.14, 0.16] }, { sel: 'H1', i: [0.14, 0.16] }, { noFault: true }] }],
    measure: [{ id: 'i', ask: 'Anzeige des Strommessers A1', unit: 'mA', truth: { sel: 'A1', q: 'i' }, tol: 0.03 }]
  });

  var pot = { parts: [bat(12), R('R1', 1000, 300, 200), R('R2', 2000, 440, 200), R('R3', 3000, 580, 300, 90), { id: 'GND1', type: 'ground', x: 160, y: 420, rot: 0 }],
    wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'R3.a'), W('R3.b', 'B1.n'), W('B1.n', 'GND1.g')] };
  defTask({
    id: '4.4', ch: 4, title: 'Potentiale gegen Masse', tags: ['messen.spannung', 'messen.potential'],
    story: 'Im Schaltplan stehen an jedem Knoten Spannungswerte – gemessen gegen Masse. Pruefe sie nach.',
    brief: 'Miss die <b>Potentiale</b> (gegen Masse ⏚) am Knoten zwischen R1 und R2 und am Knoten zwischen R2 und R3. Miss dann die <b>Spannung an R2</b>.',
    learn: 'Potential = Spannung gegen Masse; Spannung = Potentialdifferenz.',
    take: 'Schwarze Spitze an Masse lassen, mit Rot von Knoten zu Knoten wandern – so misst man Potentiale.',
    hint: 'Schwarze Spitze an GND1, rote an R1.b bzw. R2.b.',
    hint2: 'Erwartet 10 V und 6 V → U₂ = 10 V − 6 V = 4 V.',
    palette: [], start: pot, ref: pot,
    bench: { parts: [bB1, { id: 'R1', x: 420, y: 290, rot: 0 }, { id: 'R2', x: 620, y: 290, rot: 0 }, { id: 'R3', x: 800, y: 460, rot: 90 }, { id: 'GND1', x: 240, y: 640, rot: 0 }] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'p1', ask: 'Potential zwischen R1 und R2', unit: 'V', mode: 'V', a: 'R1.b', b: 'GND1.g', tol: 0.03 },
      { id: 'p2', ask: 'Potential zwischen R2 und R3', unit: 'V', mode: 'V', a: 'R2.b', b: 'GND1.g', tol: 0.03 },
      { id: 'u2', ask: 'Spannung an R2', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 }
    ]
  });

  var clk = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 100 }, x: 200, y: 300, rot: 0 }, R('R1', 1000, 420, 300, 90), { id: 'GND1', type: 'ground', x: 420, y: 440, rot: 0 }],
    wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'GND1.g')] };
  defTask({
    id: '4.5', ch: 4, title: 'Ein Taktsignal messen', tags: ['messen.trms', 'messen.oszilloskop', 'digital.pegel'],
    story: 'Ein digitales Taktsignal springt zwischen 0 und 5 V. Was zeigen die verschiedenen Messbereiche?',
    brief: 'Der Taktgeber (100 Hz) treibt R1. Miss an R1: den Mittelwert (<b>V⎓</b>), den Wechselanteil (<b>V~</b> mit AVG und mit TRMS) und den <b>Spitze-Spitze-Wert</b> mit dem Oszilloskop.',
    learn: 'Ein Rechtecksignal 0…5 V ist eine Mischgroesse: Gleichanteil + Wechselanteil.',
    take: 'V⎓ zeigt den halben Pegel (Tastgrad 50 %), V~ nur den Wechselanteil – und das AVG-Geraet liegt wieder 11 % daneben.',
    hint: 'Erst V⎓, dann V~ (Verfahren umschalten), zum Schluss Oszilloskop mit Zeitbasis 50 ms.',
    hint2: 'Durch den Ausgangswiderstand des Taktgebers ist der High-Pegel an R1 knapp unter 5 V.',
    palette: [], start: clk, ref: clk,
    bench: { parts: [{ id: 'CLK1', x: 300, y: 380, rot: 0 }, { id: 'R1', x: 600, y: 400, rot: 90 }, { id: 'GND1', x: 600, y: 620, rot: 0 }] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'Anzeige V⎓ (Mittelwert)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'trms', ask: 'Anzeige V~ mit TRMS', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'avg', ask: 'Anzeige V~ mit AVG', unit: 'V', mode: 'VAC', meterType: 'avg', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert (Oszilloskop)', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  /* ================= Theorie B ================= */
  defTheory({
    id: 'T4B', ch: 4, title: 'Genauigkeit und Messfehler', tags: ['messen.genauigkeit', 'messen.systemfehler'],
    lesson:
      '<p><b>Analoge Geraete:</b> Die Genauigkeit (z. B. 0,5 %) bezieht sich auf den <b>Messbereich-Endwert</b>. Bereich 20 V, 0,5 % → ±0,1 V – egal ob 15 V oder 2 V angezeigt werden. Deshalb im kleinsten passenden Bereich messen.</p>' +
      '<p><b>Digitale Geraete:</b> Die Genauigkeit bezieht sich auf den <b>angezeigten Wert</b> plus einige <b>Digit</b> (die letzte Stelle). Beispiel 15,0 V, ±(0,5 % + 1 Digit): 0,075 V + 0,1 V = ±0,175 V.</p>' +
      '<p><b>Fehlerarten:</b> Selbstverschuldet (falsche Skala, Parallaxe beim schraegen Ablesen), Anzeigefehler (Fertigung, Reibung), Einflussfehler (Feuchtigkeit, Fremdfelder) und <b>Systemfehler</b> durch den <b>Eigenverbrauch</b> des Messgeraets.</p>' +
      '<p><b>Eigenverbrauch:</b> Ein Voltmeter hat 10 MΩ Innenwiderstand – an einer hochohmigen Schaltung belastet es den Messpunkt merklich. Ein Amperemeter hat einen kleinen Innenwiderstand, an dem Spannung abfaellt.</p>' +
      '<p><b>Spannungsrichtige Messung:</b> Voltmeter direkt am Verbraucher, Amperemeter davor – das Amperemeter misst den Voltmeterstrom mit (schlecht bei <i>grossen</i> Widerstaenden). <b>Stromrichtige Messung:</b> Voltmeter ueber Amperemeter und Verbraucher – es misst die Spannung am Amperemeter mit (schlecht bei <i>kleinen</i> Widerstaenden).</p>',
    questions: [
      { q: 'Analoges Geraet, Bereich 20 V, Genauigkeit 0,5 %. Wie gross ist der moegliche Fehler?', options: ['±0,01 V', '±0,075 V', '±0,1 V', '±1 V'], correct: 2, explain: '0,5 % vom Endwert 20 V = 0,1 V.' },
      { q: 'Digital, Anzeige 15,0 V, ±(0,5 % + 1 Digit). Maximaler Fehler?', options: ['±0,075 V', '±0,1 V', '±0,175 V', '±0,5 V'], correct: 2, explain: '0,5 % von 15,0 V = 0,075 V, 1 Digit = 0,1 V → zusammen 0,175 V.' },
      { q: '10 V an zwei Widerstaenden von je 10 MΩ. Was zeigt das Multimeter (10 MΩ) an R2?', options: ['5,00 V', '4,50 V', '3,33 V', '0 V'], correct: 2,
        explain: 'R2 ∥ 10 MΩ = 5 MΩ → U = 10 V · 5 / 15 ≈ 3,33 V. Das Messgeraet belastet den Teiler.', verify: { layout: divider(10, 10e6, 10e6), mode: 'V', a: 'R2.a', b: 'R2.b' } },
      { q: 'Bei der spannungsrichtigen Messung misst das Amperemeter …', options: ['nur den Verbraucherstrom', 'den Verbraucherstrom plus den Voltmeterstrom', 'die Spannung am Voltmeter', 'gar nichts'], correct: 1, explain: 'Das Voltmeter haengt hinter dem Amperemeter – sein Strom fliesst durch das Amperemeter.' },
      { q: 'Wann ist die spannungsrichtige Messung ungeeignet?', options: ['Bei sehr kleinen Widerstaenden', 'Bei sehr grossen Widerstaenden', 'Bei Wechselspannung', 'Nie'], correct: 1, explain: 'Bei grossen Widerstaenden ist der Voltmeterstrom im Vergleich gross – der Fehler wird gross.' }
    ]
  });

  /* ================= Aufgaben 6–10 ================= */
  var hi = divider(10, 10e6, 10e6);
  defTask({
    id: '4.6', ch: 4, title: 'Das Voltmeter belastet', tags: ['messen.systemfehler', 'messen.spannung', 'elektro.spannungsteiler'],
    story: 'Rechnerisch liegen an R2 genau 5 V. Das Multimeter zeigt etwas anderes. Ist es kaputt?',
    brief: 'Miss U2 am hochohmigen Teiler (2 × 10 MΩ). Trage den <b>angezeigten</b> Wert ein und den <b>unbelasteten</b> Wert, den die Schaltung ohne Messgeraet haette.',
    learn: 'Das Voltmeter (10 MΩ) liegt parallel zum Messobjekt und veraendert die Schaltung.',
    take: 'Messen veraendert, was man misst – bei hochohmigen Schaltungen stark. R2 ∥ 10 MΩ = 5 MΩ → 3,33 V statt 5 V.',
    hint: 'Die Anzeige ist korrekt – sie zeigt die Spannung der belasteten Schaltung.',
    hint2: 'Unbelastet: 10 V · 10 MΩ / 20 MΩ = 5 V.',
    palette: [], start: hi, ref: hi, bench: bDiv,
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'um', ask: 'Angezeigte Spannung an R2', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', tol: 0.03 },
      { id: 'u0', ask: 'Spannung an R2 ohne Messgeraet (berechnet)', unit: 'V', value: 5, tol: 0.02 }
    ]
  });

  var sr = { parts: [bat(10), { id: 'A1', type: 'ammeter', x: 300, y: 200, rot: 0 }, R('R1', 10e6, 480, 300, 90)], wires: [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n')] };
  defTask({
    id: '4.7', ch: 4, title: 'Spannungsrichtig gemessen', tags: ['messen.systemfehler', 'messen.strom'],
    story: 'Der Strommesser A1 zeigt den Strom durch den 10-MΩ-Widerstand. Sobald jemand die Spannung misst, springt die Anzeige.',
    brief: 'Lies A1 ab (Tooltip oder Anzeige auf der Werkbank). Miss dann mit dem Multimeter die Spannung an <b>R1</b> und lies A1 <b>waehrend</b> dieser Messung erneut ab.',
    learn: 'Spannungsrichtige Schaltung: Das Amperemeter misst den Voltmeterstrom mit.',
    take: 'An 10 MΩ fliesst genau so viel Strom durch das Voltmeter wie durch R1 – der Strommesser zeigt das Doppelte.',
    hint: 'Ohne Voltmeter: I = 10 V / 10 MΩ = 1 µA.',
    hint2: 'Mit Voltmeter parallel zu R1: R1 ∥ 10 MΩ = 5 MΩ → 2 µA.',
    palette: [], start: sr, ref: sr,
    bench: { parts: [bB1, { id: 'A1', x: 520, y: 290, rot: 0 }, { id: 'R1', x: 780, y: 440, rot: 90 }] },
    tests: [{ name: 'Anlage', expect: [{ sel: 'A1', i: [0.95e-6, 1.05e-6] }] }],
    measure: [
      { id: 'i0', ask: 'Anzeige A1 ohne Voltmeter', unit: 'µA', value: 1e-6, tol: 0.05 },
      { id: 'u', ask: 'Spannung an R1', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'i1', ask: 'Anzeige A1 waehrend der Spannungsmessung', unit: 'µA', value: 2e-6, tol: 0.05 }
    ]
  });

  var inCirc = { parts: [R('R1', 1000, 360, 300, 90), R('R2', 1000, 480, 300, 90)], wires: [W('R1.a', 'R2.a'), W('R1.b', 'R2.b')] };
  defTask({
    id: '4.8', ch: 4, title: 'Der falsche Widerstand', tags: ['messen.widerstand', 'elektro.parallelschaltung'],
    story: 'R1 soll 1 kΩ haben. In der Platine gemessen zeigt das Ohmmeter nur 500 Ω. Falsch bestueckt?',
    brief: 'Miss R1 zuerst <b>in der Schaltung</b>. Trenne ihn dann einseitig heraus (eine Leitung loeschen) und miss seinen <b>wahren Wert</b>. Die Schaltung darf am Schluss wieder verbunden sein.',
    learn: 'Parallelpfade verfaelschen die Widerstandsmessung in der Schaltung.',
    take: 'Das Ohmmeter misst alles, was zwischen seinen Spitzen liegt. Zum Ausmessen ein Bauteil mindestens einseitig freilegen.',
    hint: 'R2 liegt parallel zu R1 – das Ohmmeter misst R1 ∥ R2.',
    hint2: 'Leitung R1.a–R2.a loeschen, R1 messen, Leitung wieder ziehen.',
    palette: [], start: inCirc, ref: inCirc,
    bench: { parts: [{ id: 'R1', x: 480, y: 400, rot: 90 }, { id: 'R2', x: 640, y: 400, rot: 90 }] },
    tests: [{ name: 'Schaltung', expect: [{ noFault: true }] }],
    measure: [
      { id: 'rin', ask: 'Anzeige in der Schaltung', unit: 'Ω', value: 500, tol: 0.03 },
      { id: 'rtrue', ask: 'Wahrer Wert von R1 (freigelegt)', unit: 'Ω', value: 1000, tol: 0.03 }
    ]
  });

  var gen = function (props) { return { id: 'G1', type: 'acsource', value: 10, props: Object.assign({ freq: 50, shape: 'sine', offset: 0 }, props), x: 160, y: 300, rot: 0 }; };
  var tri = { parts: [gen({ shape: 'triangle', offset: 3 }), R('R1', 1000, 420, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  defTask({
    id: '4.9', ch: 4, title: 'Welches Messgeraet?', tags: ['messen.trms', 'messen.geraete', 'elektro.effektivwert'],
    story: 'Ein Sensor liefert ein Dreieck mit Gleichanteil. Drei Kollegen, drei Messwerte – wer hat recht?',
    brief: 'Miss an R1: <b>V⎓</b>, <b>V~ mit AVG</b> und <b>V~ mit TRMS</b>. Berechne den gesamten Effektivwert (AC + DC).',
    learn: 'AVG stimmt nur beim Sinus; V~ zeigt nur den Wechselanteil; der Gleichanteil kommt quadratisch dazu.',
    take: 'Fuer beliebige Kurven mit Gleichanteil: TRMS fuer den Wechselanteil, V⎓ fuer den Gleichanteil, U = √(U_DC² + U_AC²).',
    hint: 'Dreieck Û = 10 V: TRMS ≈ 5,77 V, AVG ≈ 5,55 V; Gleichanteil 3 V.',
    hint2: 'U = √(3² + 5,77²) V ≈ 6,51 V.',
    palette: [], start: tri, ref: tri,
    bench: { parts: [{ id: 'G1', x: 250, y: 460, rot: 0 }, { id: 'R1', x: 700, y: 440, rot: 90 }] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'V⎓ (Gleichanteil)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'avg', ask: 'V~ mit AVG', unit: 'V', mode: 'VAC', meterType: 'avg', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'trms', ask: 'V~ mit TRMS', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'uges', ask: 'Gesamter Effektivwert (berechnet)', unit: 'V', value: Math.sqrt(9 + 100 / 3), tol: 0.03 }
    ]
  });

  var L = function (id, x, y, rot, defect) { var l = { id: id, type: 'lamp', x: x, y: y, rot: rot || 0 }; if (defect) l.props = { defect: true }; return l; };
  var chainStart = { parts: [bat(9), L('H1', 300, 200), L('H2', 440, 200, 0, true), L('H3', 580, 300, 90)],
    wires: [W('B1.p', 'H1.a'), W('H1.b', 'H2.a'), W('H2.b', 'H3.a'), W('H3.b', 'B1.n')] };
  var chainFixed = { parts: chainStart.parts.concat([L('H4', 440, 100)]), wires: [W('B1.p', 'H1.a'), W('H1.b', 'H4.a'), W('H4.b', 'H3.a'), W('H3.b', 'B1.n')] };
  defTask({
    id: '4.10', ch: 4, title: 'Die Lichterkette ist tot', tags: ['elektro.fehlersuche', 'messen.spannung', 'elektro.reihenschaltung'],
    story: 'Drei Lampen in Reihe, alle dunkel. Von aussen sieht man nichts. „Pruefen, nicht raten“, sagt die Werkmeisterin wieder.',
    brief: 'Finde die <b>defekte Lampe</b> durch Spannungsmessung und ersetze sie: neue Lampe aus der Palette an ihre Stelle verdrahten (die defekte bleibt liegen). Notiere die Spannung, die du an der defekten Lampe gemessen hast.',
    learn: 'In einer unterbrochenen Reihe liegt die ganze Spannung an der Unterbrechung.',
    take: 'Systematische Fehlersuche: Spannung an jedem Bauteil messen – wo die volle Quellenspannung anliegt, ist der Kreis offen.',
    hint: 'Miss nacheinander an H1, H2 und H3. An intakten Lampen fliesst kein Strom → 0 V.',
    hint2: 'An H2 liegen 9 V → H2 ist unterbrochen. Neue Lampe H4 holen, H1.b → H4.a und H4.b → H3.a, die Leitungen an H2 loeschen.',
    palette: ['lamp'], need: { lamp: 4 },
    start: chainStart, ref: chainFixed,
    bench: { parts: [bB1, { id: 'H1', x: 420, y: 290, rot: 0 }, { id: 'H2', x: 620, y: 290, rot: 0 }, { id: 'H3', x: 800, y: 470, rot: 90 }, { id: 'H4', x: 620, y: 150, rot: 0 }] },
    wrong: [named('defekte Lampe noch im Kreis', { parts: chainFixed.parts, wires: chainStart.wires })],
    tests: [{ name: 'repariert', expect: [{ sel: 'H1', i: [0.045, 0.055] }, { sel: 'H3', i: [0.045, 0.055] }, { sel: 'H4', i: [0.045, 0.055] }, { noFault: true }] }],
    measure: [{ id: 'ud', ask: 'Spannung an der defekten Lampe (vor der Reparatur)', unit: 'V', value: 9, tol: 0.03 }]
  });
})();

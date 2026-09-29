/* Kapitel 14 – Elektrotechnik-Vertiefung: RC-Filter und Frequenzgang
 * Quelle: ET Kurs AU Zusatz (CR-Hochpass und RC-Tiefpass 1./2. Ordnung, RC-Bandpass, RC-Bandsperre; Verstaerkung in dB,
 * Messung 1 Hz … 10 kHz, 20 dB/Dekade bzw. 40 dB/Dekade), Messtechnik Erweiterung (Kurvenformen, Frequenzerhoehung). */
(function () {
  'use strict';
  defChapter({
    id: 14, title: 'RC-Filter und Frequenzgang',
    intro: 'Wie verhaelt sich eine Schaltung bei verschiedenen Frequenzen? Du drehst am Funktionsgenerator, misst Ein- und Ausgang und findest Grenzfrequenz, Daempfung in dB und die Wirkung von Filtern hoeherer Ordnung.',
    sequence: ['T14A', '14.1', '14.2', '14.3', '14.4', '14.5', 'T14B', '14.6', '14.7', '14.8', '14.9', '14.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  var gen = function (props, id, x, y, v) { return { id: id || 'G1', type: 'acsource', value: v === undefined ? 10 : v, props: Object.assign({ freq: 50, shape: 'sine', offset: 0 }, props || {}), x: x || 160, y: y || 300, rot: 0 }; };
  var R = function (id, v, x, y, rot) { return { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; };
  var C = function (id, v, x, y, rot) { return { id: id, type: 'capacitor', value: v, x: x, y: y, rot: rot === undefined ? 90 : rot }; };
  var UE = 10 / Math.SQRT2; // Effektivwert des Eingangs (Û = 10 V)
  var bG1 = { id: 'G1', x: 250, y: 460, rot: 0 };
  var lp = function (r, c, props) { return { parts: [gen(props), R('R1', r, 320, 200), C('C1', c, 480, 300)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] }; };
  var hp = function (r, c, props) { return { parts: [gen(props), C('C1', c, 320, 200, 0), R('R1', r, 480, 300, 90)], wires: [W('G1.p', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n')] }; };
  var bLP = { parts: [bG1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'C1', x: 760, y: 460, rot: 90 }] };
  var bHP = { parts: [bG1, { id: 'C1', x: 520, y: 290, rot: 0 }, { id: 'R1', x: 760, y: 460, rot: 90 }] };
  var at = function (f) { return { G1: { freq: f } }; };
  var fg = function (r, c) { return 1 / (2 * Math.PI * r * c); };

  defTheory({
    id: 'T14A', ch: 14, title: 'Frequenzgang und Dezibel', tags: ['elektro.filter', 'elektro.frequenzgang', 'elektro.db'],
    lesson:
      '<p>Der <b>Frequenzgang</b> zeigt, wie stark eine Schaltung ein Signal abhaengig von der Frequenz durchlaesst. Man misst Eingang U<sub>e</sub> und Ausgang U<sub>a</sub> bei vielen Frequenzen (z. B. 1 Hz … 10 kHz) und traegt das Verhaeltnis auf – die Frequenzachse logarithmisch.</p>' +
      '<p>Die <b>Verstaerkung</b> gibt man in <b>Dezibel</b> an:</p><div class="formula">A = 20 · log<sub>10</sub>(U<sub>a</sub> / U<sub>e</sub>) dB</div>' +
      '<p>0 dB = unveraendert, −3 dB ≈ 70,7 %, −6 dB ≈ 50 %, −20 dB = 10 %, −40 dB = 1 %.</p>' +
      '<p><b>RC-Tiefpass 1. Ordnung</b> (R in Reihe, C gegen Masse): Unterhalb der Grenzfrequenz f<sub>g</sub> = 1/(2πRC) laesst er fast alles durch, bei f<sub>g</sub> −3 dB, darueber faellt er mit <b>20 dB pro Dekade</b> (zehnfache Frequenz → ein Zehntel der Spannung). Der <b>CR-Hochpass</b> verhaelt sich spiegelbildlich.</p>' +
      '<p>Wichtig beim Messen: Die Eingangsamplitude waehrend der ganzen Messreihe kontrollieren (hier fest Û = 10 V, U<sub>e</sub> = 7,07 V effektiv).</p>',
    questions: [
      { q: 'U_a / U_e = 0,1. Wie viel dB sind das?', options: ['−1 dB', '−10 dB', '−20 dB', '−40 dB'], correct: 2, explain: '20 · log(0,1) = −20 dB.' },
      { q: 'Was bedeutet −3 dB?', options: ['Halbe Spannung', 'Etwa 70,7 % der Spannung', 'Ein Zehntel', 'Doppelte Spannung'], correct: 1, explain: '20 · log(0,707) ≈ −3 dB – die Grenzfrequenz.' },
      { q: 'Grenzfrequenz bei R = 1 kΩ, C = 1 µF?', options: ['15,9 Hz', '159 Hz', '1,59 kHz', '15,9 kHz'], correct: 1, explain: 'f_g = 1/(2π · 1000 Ω · 1 µF) ≈ 159 Hz.' },
      { q: 'Wie stark faellt ein Tiefpass 1. Ordnung oberhalb von f_g ab?', options: ['3 dB pro Dekade', '6 dB pro Dekade', '20 dB pro Dekade', '40 dB pro Dekade'], correct: 2, explain: 'Zehnfache Frequenz → ein Zehntel → −20 dB.' },
      { q: 'Welche Achse ist beim Frequenzgang logarithmisch?', options: ['Keine', 'Die Frequenzachse', 'Nur die Spannungsachse', 'Die Zeitachse'], correct: 1, explain: 'Frequenzen von 1 Hz bis 10 kHz passen nur logarithmisch sinnvoll auf ein Blatt (die Verstaerkung in dB ist ebenfalls logarithmisch).' }
    ]
  });

  var lp1 = lp(1000, 1e-6);
  defTask({
    id: '14.1', ch: 14, title: 'Frequenzgang des Tiefpasses', tags: ['elektro.filter', 'elektro.frequenzgang', 'messen.wechselspannung'],
    story: 'Der Tiefpass aus dem Praktikum (1 kΩ, 1 µF) soll ausgemessen werden – wie im Laborprotokoll.',
    brief: 'Miss die Ausgangsspannung (C1.a gegen G1.–, V~) bei <b>50 Hz</b>, <b>159 Hz</b> und <b>1590 Hz</b>. Die Frequenz stellst du am Generator G1 ein.',
    learn: 'Unter f_g fast alles, bei f_g 70,7 %, bei 10 · f_g nur noch 10 %.', take: 'Bei 1590 Hz (= 10 · f_g) bleiben 0,7 V von 7,07 V – −20 dB.',
    hint: 'Generator anklicken, Frequenz aendern, Enter – dann neu messen.', hint2: 'Erwartet ca. 6,7 V, 5,0 V und 0,7 V.',
    palette: [], start: lp1, ref: lp1, bench: bLP,
    tests: [{ name: 'Filter', expect: [{ noFault: true }] }],
    measure: [50, 159, 1590].map(function (f) { return { id: 'u' + f, ask: 'U_a bei ' + f + ' Hz', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'G1.n', tol: 0.04, set: at(f) }; })
  });

  defTask({
    id: '14.2', ch: 14, title: 'Die Grenzfrequenz finden', tags: ['elektro.filter', 'elektro.grenzfrequenz'],
    story: 'Die Werte auf dem Kondensator sind abgerieben. Die Grenzfrequenz laesst sich trotzdem messen.',
    brief: 'Stelle den Generator auf die Frequenz ein, bei der die Ausgangsspannung auf <b>70,7 %</b> des Eingangs (≈ 5,0 V) gesunken ist. Trage die gefundene Grenzfrequenz ein.',
    learn: 'Grenzfrequenz = Frequenz bei −3 dB.', take: 'Mit 2,2 kΩ und 470 nF: f_g ≈ 154 Hz.',
    hint: 'Frequenz erhoehen, bis die Anzeige ca. 5,0 V zeigt.', hint2: 'f_g = 1/(2π · 2,2 kΩ · 470 nF) ≈ 154 Hz.',
    palette: [], start: lp(2200, 470e-9), ref: lp(2200, 470e-9, { freq: 154 }), bench: bLP,
    tests: [{ name: 'bei f_g', expect: [{ a: 'C1.a', b: 'G1.n', ac: 'rms', range: [UE * 0.68, UE * 0.735] }] }],
    measure: [{ id: 'fg', ask: 'Grenzfrequenz', unit: 'Hz', value: fg(2200, 470e-9), tol: 0.06 }]
  });

  var hp1 = hp(1000, 1e-6);
  defTask({
    id: '14.3', ch: 14, title: 'Frequenzgang des Hochpasses', tags: ['elektro.filter', 'elektro.frequenzgang'],
    story: 'Spiegelbildlich: der CR-Hochpass mit denselben Bauteilen.',
    brief: 'Miss die Ausgangsspannung (R1.a gegen G1.–, V~) bei <b>15,9 Hz</b>, <b>159 Hz</b> und <b>1590 Hz</b>.',
    learn: 'Hochpass: tiefe Frequenzen werden gedaempft, hohe passieren.', take: 'Bei f_g/10 bleiben 10 %, bei f_g 70,7 %, bei 10 · f_g fast alles.',
    hint: 'Gleiches Vorgehen wie beim Tiefpass.', hint2: 'Erwartet ca. 0,7 V, 5,0 V und 7,0 V.',
    palette: [], start: hp1, ref: hp1, bench: bHP,
    tests: [{ name: 'Filter', expect: [{ noFault: true }] }],
    measure: [15.9, 159, 1590].map(function (f) { return { id: 'u' + Math.round(f), ask: 'U_a bei ' + f + ' Hz', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'G1.n', tol: 0.05, set: at(f) }; })
  });

  var ratio = 1 / Math.sqrt(1 + 100);
  defTask({
    id: '14.4', ch: 14, title: 'Rechnen in dB', tags: ['elektro.db', 'elektro.frequenzgang'],
    story: 'Im Datenblatt stehen Daempfungen in dB. Uebersetze deine Messung in diese Sprache.',
    brief: 'Stelle G1 auf <b>1590 Hz</b> (10 · f_g des Tiefpasses), miss U<sub>a</sub>, berechne das Verhaeltnis U<sub>a</sub>/U<sub>e</sub> und die Verstaerkung in dB (U<sub>e</sub> = 7,07 V).',
    learn: 'A = 20 · log(U_a/U_e).', take: 'Ein Zehntel der Spannung = −20 dB – typisch fuer eine Dekade ueber f_g bei 1. Ordnung.',
    hint: 'U_a/U_e ≈ 0,7 V / 7,07 V.', hint2: '20 · log(0,0995) ≈ −20 dB.',
    palette: [], start: lp1, ref: lp(1000, 1e-6, { freq: 1590 }), bench: bLP,
    tests: [{ name: '10 · f_g', expect: [{ a: 'C1.a', b: 'G1.n', ac: 'rms', range: [0.6, 0.8] }] }],
    measure: [
      { id: 'ua', ask: 'U_a bei 1590 Hz', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'G1.n', tol: 0.05 },
      { id: 'v', ask: 'Verhaeltnis U_a/U_e', unit: '', value: ratio, tol: 0.05 },
      { id: 'db', ask: 'Verstaerkung in dB', unit: '', value: 20 * Math.log10(ratio), tol: 0.03 }
    ]
  });

  var lp2 = function (second) {
    var l = lp(1000, 1e-6);
    if (second) { l.parts.push(R('R2', 10000, 600, 200), C('C2', 100e-9, 720, 300)); l.wires.push(W('C1.a', 'R2.a'), W('R2.b', 'C2.a'), W('C2.b', 'G1.n')); }
    return l;
  };
  defTask({
    id: '14.5', ch: 14, title: 'Tiefpass 2. Ordnung', tags: ['elektro.filter', 'elektro.ordnung'],
    story: 'Der Tiefpass daempft den Stoerer bei 1,6 kHz nur auf 10 %. Gefordert sind unter 2 %.',
    brief: 'Haenge eine <b>zweite RC-Stufe</b> an (R2 = 10 kΩ, C2 = 100 nF – hochohmiger, damit sie die erste kaum belastet). Gemessen wird an C2 gegen G1.–: bei 50 Hz sollen mindestens 6 V durchkommen, bei 1590 Hz hoechstens 0,15 V.',
    learn: '2. Ordnung: 40 dB pro Dekade.', take: 'Zwei Stufen multiplizieren die Daempfung: bei 10 · f_g ≈ 1 % statt 10 %.',
    hint: 'C1.a → R2 → Knoten → C2 → G1.–.', hint2: 'Die zweite Stufe hat dieselbe Grenzfrequenz (10 kΩ · 100 nF = 1 ms).',
    palette: ['resistor', 'capacitor'], need: { resistor: 2, capacitor: 2 }, start: lp2(false), ref: lp2(true),
    bench: { parts: [bG1, { id: 'R1', x: 440, y: 290, rot: 0 }, { id: 'C1', x: 600, y: 470, rot: 90 }, { id: 'R2', x: 720, y: 290, rot: 0 }, { id: 'C2', x: 860, y: 470, rot: 90 }] },
    tests: [
      { name: '50 Hz', set: at(50), expect: [{ a: 'C2.a', b: 'G1.n', ac: 'rms', range: [6.0, 7.1] }] },
      { name: '1590 Hz', set: at(1590), expect: [{ a: 'C2.a', b: 'G1.n', ac: 'rms', range: [0, 0.15] }] }]
  });

  defTheory({
    id: 'T14B', ch: 14, title: 'Bandpass, Bandsperre, Signalformung', tags: ['elektro.filter', 'elektro.rc'],
    lesson:
      '<p>Ein <b>Bandpass</b> entsteht aus Hochpass und Tiefpass hintereinander: Er laesst nur einen Frequenzbereich um die <b>Mittenfrequenz</b> durch. Eine <b>Bandsperre</b> unterdrueckt einen Bereich. Ein RC-Bandpass aus je einer Stufe ist ein Filter 1. Ordnung auf beiden Seiten.</p>' +
      '<p>RC-Glieder <b>formen Signale</b>: Ist τ viel kleiner als die Periodendauer, wirkt ein Hochpass als <b>Differenzierglied</b> – aus einem Rechteck werden Nadelimpulse an den Flanken. Ist τ viel groesser, wirkt ein Tiefpass als <b>Integrierglied</b> – aus einem Rechteck wird ein Dreieck, bei sehr grossem τ nahezu der Mittelwert (so wird aus einem Taktsignal eine Gleichspannung).</p>' +
      '<p><b>Anwendungen:</b> Stoerungen ausfiltern (Brumm, Schaltspitzen), Signale aufbereiten, aus PWM eine analoge Spannung gewinnen.</p>',
    questions: [
      { q: 'Woraus besteht ein einfacher RC-Bandpass?', options: ['Zwei Tiefpaessen', 'Hochpass und Tiefpass hintereinander', 'Zwei Hochpaessen', 'Nur einem Kondensator'], correct: 1, explain: 'Der Hochpass nimmt die tiefen, der Tiefpass die hohen Frequenzen weg.' },
      { q: 'Was macht ein Differenzierglied (τ ≪ T) aus einem Rechteck?', options: ['Ein Dreieck', 'Nadelimpulse an den Flanken', 'Einen Sinus', 'Gleichspannung'], correct: 1, explain: 'Nur die schnellen Flanken kommen durch den Hochpass.' },
      { q: 'Was macht ein Integrierglied (τ ≫ T) aus einem Rechteck?', options: ['Nadelimpulse', 'Ein flaches Dreieck um den Mittelwert', 'Ein doppelt so hohes Rechteck', 'Nichts'], correct: 1, explain: 'Der Kondensator laedt und entlaedt sich nur wenig – fast linear.' },
      { q: 'Wie gewinnt man aus einem Taktsignal 0 … 5 V eine Gleichspannung?', options: ['Mit einem Hochpass', 'Mit einem Tiefpass (großes τ)', 'Mit einer Z-Diode', 'Gar nicht'], correct: 1, explain: 'Der Tiefpass mittelt – uebrig bleibt ca. 2,5 V.' },
      { q: 'Welche Ordnung hat ein RC-Bandpass aus einem Hoch- und einem Tiefpass je auf einer Seite?', options: ['0', '1', '2', '4'], correct: 1, explain: 'Jede Flanke kommt von einer RC-Stufe: 20 dB pro Dekade.' }
    ]
  });

  var bp = function (withLP) {
    var l = hp(1000, 1e-6);
    if (withLP) { l.parts.push(R('R2', 10000, 600, 200), C('C2', 10e-9, 720, 300)); l.wires.push(W('R1.a', 'R2.a'), W('R2.b', 'C2.a'), W('C2.b', 'G1.n')); }
    return l;
  };
  defTask({
    id: '14.6', ch: 14, title: 'Der Bandpass', tags: ['elektro.filter', 'elektro.bandpass'],
    story: 'Ein Tonsignal um 1 kHz soll durch – Brummen (50 Hz) und Rauschen (20 kHz) nicht.',
    brief: 'Haenge an den Hochpass (f_g ≈ 159 Hz) einen <b>Tiefpass</b> an (R2 = 10 kΩ, C2 = 10 nF, f_g ≈ 1,6 kHz). Gemessen an C2 gegen G1.–: bei 50 Hz und 20 kHz wenig, im Durchlassbereich (500 Hz) viel.',
    learn: 'Hochpass + Tiefpass = Bandpass.', take: 'Zwischen den beiden Grenzfrequenzen liegt der Durchlassbereich.',
    hint: 'R1.a (Ausgang Hochpass) → R2 → Knoten → C2 → G1.–.', hint2: 'Die Tiefpass-Stufe ist hochohmiger, damit sie den Hochpass wenig belastet.',
    palette: ['resistor', 'capacitor'], need: { resistor: 2, capacitor: 2 }, start: bp(false), ref: bp(true),
    bench: { parts: [bG1, { id: 'C1', x: 440, y: 290, rot: 0 }, { id: 'R1', x: 600, y: 470, rot: 90 }, { id: 'R2', x: 720, y: 290, rot: 0 }, { id: 'C2', x: 860, y: 470, rot: 90 }] },
    tests: [
      { name: '50 Hz', set: at(50), expect: [{ a: 'C2.a', b: 'G1.n', ac: 'rms', range: [0, 2.6] }] },
      { name: '500 Hz', set: at(500), expect: [{ a: 'C2.a', b: 'G1.n', ac: 'rms', range: [5.2, 7.1] }] },
      { name: '20 kHz', set: at(20000), expect: [{ a: 'C2.a', b: 'G1.n', ac: 'rms', range: [0, 0.8] }] }]
  });

  var pwm = function (withC) {
    var l = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 1000 }, x: 200, y: 300, rot: 0 }, { id: 'GND1', type: 'ground', x: 480, y: 460, rot: 0 }, R('R1', 10000, 360, 300)], wires: [W('CLK1.out', 'R1.a')] };
    if (withC) { l.parts.push(C('C1', 10e-6, 480, 380)); l.wires.push(W('R1.b', 'C1.a'), W('C1.b', 'GND1.g')); }
    return l;
  };
  defTask({
    id: '14.7', ch: 14, title: 'Aus Takt wird Gleichspannung', tags: ['elektro.filter', 'elektro.integrierglied', 'digital.takt'],
    story: 'Ein Mikrocontroller kann nur 0 und 5 V ausgeben. Fuer den Sollwert eines Antriebs braucht es aber eine ruhige Gleichspannung.',
    brief: 'Glaette das 1-kHz-Taktsignal mit einem <b>Tiefpass</b> (R1 = 10 kΩ ist da, ergaenze C1 = 10 µF gegen Masse). An C1 soll ca. 2,4 V mit weniger als 0,1 V Welligkeit anliegen.',
    learn: 'Tiefpass mit τ ≫ T mittelt: U ≈ Tastgrad · 5 V.', take: 'τ = 0,1 s, T = 1 ms: aus dem Rechteck wird eine fast glatte Gleichspannung – das Prinzip der PWM-Analogausgabe.',
    hint: 'R1.b → C1.a, C1.b → GND1.', hint2: 'Mittelwert eines 50-%-Takts mit 5 V: 2,5 V (etwas weniger wegen des Ausgangswiderstands).',
    palette: ['capacitor', 'resistor'], need: { capacitor: 1 }, start: pwm(false), ref: pwm(true),
    bench: { parts: [{ id: 'CLK1', x: 280, y: 380, rot: 0 }, { id: 'R1', x: 520, y: 380, rot: 0 }, { id: 'C1', x: 720, y: 480, rot: 90 }, { id: 'GND1', x: 720, y: 680, rot: 0 }] },
    tests: [{ name: 'geglaettet', expect: [{ a: 'C1.a', b: 'GND1.g', ac: 'dc', range: [2.2, 2.6] }, { a: 'C1.a', b: 'GND1.g', ac: 'pp', range: [0, 0.1] }] }],
    measure: [{ id: 'u', ask: 'Gleichspannung an C1', unit: 'V', mode: 'AC', q: 'dc', a: 'C1.a', b: 'GND1.g', tol: 0.04 }]
  });

  var diff = hp(1000, 100e-9, { shape: 'square' });
  defTask({
    id: '14.8', ch: 14, title: 'Das Differenzierglied', tags: ['elektro.differenzierglied', 'messen.oszilloskop'],
    story: 'Aus einem Rechtecksignal sollen kurze Impulse an jeder Flanke entstehen – zum Beispiel als Ausloeser fuer einen Zaehler.',
    brief: 'Der Hochpass (100 nF, 1 kΩ, τ = 0,1 ms) liegt an einem <b>Rechteck ±10 V, 50 Hz</b>. Schau dir U<sub>a</sub> am Oszilloskop an (Zeitbasis 20 ms) und miss den Spitze-Spitze-Wert.',
    learn: 'τ ≪ T: Der Hochpass laesst nur die Flanken durch.', take: 'Jede Flanke springt um 20 V – daher Nadeln bis ±20 V, dazwischen 0 V.',
    hint: 'Messspitzen an R1.a und G1.n, dann Aufnahme.', hint2: 'Spitze-Spitze ≈ 40 V.',
    palette: [], start: diff, ref: diff, bench: bHP,
    tests: [{ name: 'Nadeln', expect: [{ a: 'R1.a', b: 'G1.n', ac: 'pp', range: [30, 41] }] }],
    measure: [{ id: 'pp', ask: 'Spitze-Spitze-Wert U_a', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'G1.n', tol: 0.08 }]
  });

  var integ = lp(10000, 10e-6, { shape: 'square' });
  defTask({
    id: '14.9', ch: 14, title: 'Das Integrierglied', tags: ['elektro.integrierglied', 'messen.oszilloskop'],
    story: 'Umgekehrt: Aus dem Rechteck soll ein Dreieck werden – die Grundlage vieler Signalgeneratoren.',
    brief: 'Der Tiefpass (10 kΩ, 10 µF, τ = 0,1 s) liegt am <b>Rechteck ±10 V, 50 Hz</b>. Miss am Ausgang den Spitze-Spitze-Wert und schau dir die Kurvenform an.',
    learn: 'τ ≫ T: Der Tiefpass integriert – fast lineare Rampen.', take: 'Pro Halbwelle laedt C mit ≈ 1 mA · 10 ms / 10 µF = 1 V → ein Dreieck mit ca. 1 V Spitze-Spitze.',
    hint: 'Messspitzen an C1.a und G1.n.', hint2: 'Erwartet ca. 1 V Spitze-Spitze.',
    palette: [], start: integ, ref: integ, bench: bLP,
    tests: [{ name: 'Dreieck', expect: [{ a: 'C1.a', b: 'G1.n', ac: 'pp', range: [0.7, 1.3] }] }],
    measure: [{ id: 'pp', ask: 'Spitze-Spitze-Wert U_a', unit: 'V', mode: 'AC', q: 'pp', a: 'C1.a', b: 'G1.n', tol: 0.08 }]
  });

  /* 14.10 Nutzsignal 50 Hz (Û 5 V) + Stoerung 5 kHz (Û 1 V) in Reihe; Tiefpass waehlen */
  var noisy = function (r, c) {
    var l = { parts: [gen({}, 'G1', 160, 240, 5), gen({ freq: 5000 }, 'G2', 160, 400, 1)], wires: [W('G1.n', 'G2.p')] };
    if (r) { l.parts.push(R('R1', r, 360, 200), C('C1', c, 520, 320)); l.wires.push(W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G2.n')); }
    return l;
  };
  defTask({
    id: '14.10', ch: 14, title: 'Den Stoerer ausfiltern', tags: ['elektro.filter', 'elektro.dimensionieren'],
    story: 'Einem 50-Hz-Messsignal (Û = 5 V) ist eine 5-kHz-Stoerung (Û = 1 V) ueberlagert – z. B. vom Frequenzumrichter nebenan.',
    brief: 'Entwirf einen <b>RC-Tiefpass</b> zwischen G1.+ und G2.–, der die Stoerung deutlich daempft, das Nutzsignal aber kaum: Am Kondensator soll der Spitze-Spitze-Wert zwischen 9,3 V und 10,3 V liegen (ohne Filter: 12 V).',
    learn: 'f_g zwischen Nutz- und Stoerfrequenz legen.', take: 'Mit f_g ≈ 500 Hz: 50 Hz kommen fast ganz, 5 kHz nur zu 10 % durch.',
    hint: 'Waehle R und C so, dass f_g = 1/(2πRC) bei einigen hundert Hz liegt.', hint2: 'z. B. R = 1 kΩ, C = 330 nF → f_g ≈ 480 Hz.',
    palette: ['resistor', 'capacitor'], need: { resistor: 1, capacitor: 1 }, start: noisy(), ref: noisy(1000, 330e-9),
    bench: { parts: [{ id: 'G1', x: 250, y: 280, rot: 0 }, { id: 'G2', x: 250, y: 560, rot: 0 }, { id: 'R1', x: 560, y: 260, rot: 0 }, { id: 'C1', x: 780, y: 440, rot: 90 }] },
    wrong: [named('f_g viel zu hoch (100 Ω, 10 nF)', noisy(100, 10e-9)), named('f_g zu tief (10 kΩ, 10 µF)', noisy(10000, 10e-6))],
    tests: [{ name: 'gefiltert', expect: [{ a: 'C1.a', b: 'C1.b', ac: 'pp', range: [9.3, 10.3] }, { noFault: true }] }]
  });
})();

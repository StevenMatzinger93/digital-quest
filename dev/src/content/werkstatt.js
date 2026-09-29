/* Uebungswerkstatt – freie Messuebungen ausserhalb der 15 Kapitel (Plan: docs/PLAN_KLASSEN_ZUWEISUNG.md, Baustein 3)
 * Fertige, gesperrte Schaltungen: nichts bauen, nur messen (Multimeter und Oszilloskop). defMessaufgabe = defTask mit
 * palette [] und ref = start. Zaehlt nicht in den Kapitel-Fortschritt, alles ist offen; Dozenten koennen die Werkstatt
 * (id 'W') oder einzelne Stationen wie Kapitel zuweisen. Ergaenzt Kapitel 3 (AVG/RMS/TRMS) und 14 (Frequenzgang). */
(function () {
  'use strict';
  DQ.workshop = {
    id: 'W', title: 'Uebungswerkstatt', kind: 'workshop',
    intro: 'Fertige Schaltungen, nur messen: Oszilloskop ablesen, Scheitel-, Spitze-Spitze- und Effektivwerte, Gleichanteil, Periodendauer. Frei ueben, so oft du willst – zaehlt nicht zum Kapitel-Fortschritt.',
    sequence: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10']
  };
  var gen = function (props, v, x, y) { return { id: 'G1', type: 'acsource', value: v, props: Object.assign({ freq: 50, shape: 'sine', offset: 0 }, props || {}), x: x || 160, y: y || 300, rot: 0 }; };
  var R = function (id, v, x, y, rot) { return { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; };
  var bG1 = { id: 'G1', x: 250, y: 460, rot: 0 };
  var SCOPE = 'Multimeter-Spitzen setzen (rot, dann schwarz) – das Oszilloskop nutzt dieselben Spitzen. Zeitbasis waehlen, „Aufnahme“ (Werkbank: RUN); unter dem Bild stehen max und min.';
  var tags = function (t) { return ['werkstatt', 'messen.oszilloskop'].concat(t || []); };
  var ok = [{ name: 'Aufbau', expect: [{ noFault: true }] }];

  var div = { parts: [gen({}, 12), R('R1', 1000, 340, 200), R('R2', 2000, 500, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'G1.n')] };
  defMessaufgabe({
    id: 'W1', ch: 'W', title: 'Teilspannung am Sinus', tags: tags(['elektro.spannungsteiler', 'messen.wechselspannung']),
    story: 'Ein Sinus vom Generator liegt an einem Spannungsteiler. Wie gross ist die Wechselspannung an R2?',
    brief: 'Miss an <b>R2</b> mit dem Oszilloskop den <b>Scheitelwert</b> und den <b>Spitze-Spitze-Wert</b>, mit dem Multimeter (V~) den <b>Effektivwert</b>.',
    learn: 'Der Teiler teilt auch Wechselspannung im Verhaeltnis der Widerstaende.', take: 'Û an R2 = 2/3 · 12 V = 8 V, U_ss = 16 V, U = Û / √2 ≈ 5,66 V.',
    hint: SCOPE, hint2: 'Spitzen an R2.a und R2.b.',
    start: div, bench: { parts: [bG1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'R2', x: 760, y: 460, rot: 90 }] }, tests: ok,
    measure: [
      { id: 'up', ask: 'Scheitelwert Û an R2', unit: 'V', mode: 'AC', q: 'peak', a: 'R2.a', b: 'R2.b', tol: 0.03 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert U_ss an R2', unit: 'V', mode: 'AC', q: 'pp', a: 'R2.a', b: 'R2.b', tol: 0.03 },
      { id: 'u', ask: 'Effektivwert an R2 (V~)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R2.a', b: 'R2.b', tol: 0.03 }]
  });

  var sq = { parts: [gen({ shape: 'square', offset: 2, freq: 100 }, 4), R('R1', 1000, 480, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  var bR = { parts: [bG1, { id: 'R1', x: 700, y: 460, rot: 90 }] };
  defMessaufgabe({
    id: 'W2', ch: 'W', title: 'Rechteck mit Gleichanteil', tags: tags(['elektro.mischspannung']),
    story: 'Der Generator liefert ein Rechteck, das nicht symmetrisch um 0 V liegt.',
    brief: 'Miss am Oszilloskop den <b>hoechsten Wert</b> und den <b>Spitze-Spitze-Wert</b>, mit V⎓ den <b>Gleichanteil</b>.',
    learn: 'Gleichanteil = Mittelwert; das Signal pendelt um ihn.', take: 'Ein Rechteck ±4 V um 2 V: von −2 V bis 6 V, U_ss = 8 V, Gleichanteil 2 V.',
    hint: SCOPE, hint2: 'Zeitbasis 20 ms zeigt zwei Perioden.',
    start: sq, bench: bR, tests: ok,
    measure: [
      { id: 'max', ask: 'Hoechster Wert (max)', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert U_ss', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'udc', ask: 'Gleichanteil (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  var tri = { parts: [gen({ shape: 'triangle' }, 10), R('R1', 1000, 480, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  defMessaufgabe({
    id: 'W3', ch: 'W', title: 'Dreieck: AVG oder TRMS?', tags: tags(['messen.wechselspannung', 'messen.trms']),
    story: 'Zwei Multimeter zeigen am selben Dreiecksignal verschiedene Werte. Welches hat recht?',
    brief: 'Miss am Dreieck (Û = 10 V) mit V~ einmal im Verfahren <b>AVG</b> und einmal <b>TRMS</b> (Umschalter unter dem Multimeter). Lies am Oszilloskop U<sub>ss</sub> ab.',
    learn: 'Nur TRMS zeigt bei jeder Kurvenform den echten Effektivwert.', take: 'Dreieck: U = Û / √3 ≈ 5,77 V (TRMS). AVG rechnet mit dem Sinus-Formfaktor und zeigt 5,55 V – falsch.',
    hint: 'V~ waehlen, dann AVG bzw. TRMS.', hint2: 'U_ss am Oszilloskop: 20 V.',
    start: tri, bench: bR, tests: ok,
    measure: [
      { id: 'avg', ask: 'Anzeige V~ mit AVG', unit: 'V', mode: 'VAC', meterType: 'avg', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'trms', ask: 'Anzeige V~ mit TRMS', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert U_ss', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  var per = { parts: [gen({ freq: 200 }, 6), R('R1', 1000, 480, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  defMessaufgabe({
    id: 'W4', ch: 'W', title: 'Periodendauer ablesen', tags: tags(['elektro.frequenz']),
    story: 'Im Labor steht nicht immer ein Generator mit Anzeige daneben – oft ist das Oszilloskop die einzige Quelle fuer die Frequenz. Uebe das Ablesen und vergleiche danach mit dem Generator.',
    brief: 'Waehle die Zeitbasis <b>10 ms</b> (ganze Bildbreite) und zaehle, wie viele Perioden auf dem Bild sind. Bestimme die <b>Periodendauer T</b>, daraus die <b>Frequenz</b>, und lies den Scheitelwert ab.',
    learn: 'f = 1 / T.', take: 'Zwei volle Perioden auf 10 ms: T = 5 ms, f = 200 Hz.',
    hint: SCOPE, hint2: 'Perioden zaehlen: von einem Nulldurchgang nach oben bis zum naechsten.',
    start: per, bench: bR, tests: ok,
    measure: [
      { id: 't', ask: 'Periodendauer T', unit: 'ms', value: 0.005, tol: 0.05 },
      { id: 'f', ask: 'Frequenz f (berechnet)', unit: 'Hz', value: 200, tol: 0.05 },
      { id: 'up', ask: 'Scheitelwert Û', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  var hw = { parts: [gen({}, 10), { id: 'V1', type: 'diode', x: 340, y: 200, rot: 0 }, R('R1', 1000, 500, 300, 90)], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
  defMessaufgabe({
    id: 'W5', ch: 'W', title: 'Einweggleichrichter', tags: tags(['bauteil.diode', 'elektro.gleichrichter']),
    story: 'Nach der Diode bleibt vom Sinus nur die obere Haelfte uebrig.',
    brief: 'Schau dir die Spannung an <b>R1</b> am Oszilloskop an. Miss den <b>Scheitelwert</b> und mit V⎓ den <b>Gleichanteil</b> (arithmetischer Mittelwert).',
    learn: 'Einweggleichrichtung: nur eine Halbwelle, Mittelwert ≈ Û / π.', take: 'Û an R1 ≈ 10 V − 0,7 V = 9,3 V, Mittelwert ≈ 2,8 V (etwas weniger als 9,3 V / π wegen der Schleusenspannung).',
    hint: SCOPE, hint2: 'Die Diode „frisst“ die Schleusenspannung.',
    start: hw, bench: { parts: [bG1, { id: 'V1', x: 480, y: 290, rot: 0 }, { id: 'R1', x: 740, y: 460, rot: 90 }] }, tests: ok,
    measure: [
      { id: 'up', ask: 'Scheitelwert an R1', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.04 }]
  });

  var lp = { parts: [gen({ freq: 159 }, 10), R('R1', 1000, 340, 200), { id: 'C1', type: 'capacitor', value: 1e-6, x: 500, y: 300, rot: 90 }], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] };
  defMessaufgabe({
    id: 'W6', ch: 'W', title: 'Tiefpass an der Grenzfrequenz', tags: tags(['elektro.filter', 'elektro.grenzfrequenz']),
    story: 'Ein RC-Tiefpass (1 kΩ, 1 µF) wird genau bei seiner Grenzfrequenz betrieben.',
    brief: 'Miss den Scheitelwert am <b>Eingang</b> (G1) und am <b>Ausgang</b> (C1) und berechne das Verhaeltnis U<sub>a</sub> / U<sub>e</sub>.',
    learn: 'Bei f_g ist U_a / U_e = 1/√2 ≈ 0,707 (−3 dB).', take: 'f_g = 1 / (2π · 1 kΩ · 1 µF) ≈ 159 Hz – dort kommt noch 70,7 % der Spannung an.',
    hint: SCOPE, hint2: 'Eingang: Spitzen an G1.p und G1.n; Ausgang: an C1.a und C1.b.',
    start: lp, bench: { parts: [bG1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'C1', x: 760, y: 460, rot: 90 }] }, tests: ok,
    measure: [
      { id: 'ue', ask: 'Scheitelwert am Eingang', unit: 'V', mode: 'AC', q: 'peak', a: 'G1.p', b: 'G1.n', tol: 0.03 },
      { id: 'ua', ask: 'Scheitelwert am Ausgang', unit: 'V', mode: 'AC', q: 'peak', a: 'C1.a', b: 'C1.b', tol: 0.03 },
      { id: 'v', ask: 'Verhaeltnis U_a / U_e (berechnet)', unit: '', value: Math.SQRT1_2, tol: 0.03 }]
  });

  var hp = { parts: [gen({ freq: 1000, offset: 5 }, 3), { id: 'C1', type: 'capacitor', value: 10e-6, x: 340, y: 200, rot: 0 }, R('R1', 1000, 500, 300, 90)], wires: [W('G1.p', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n')] };
  defMessaufgabe({
    id: 'W7', ch: 'W', title: 'Der Kondensator sperrt Gleichspannung', tags: tags(['elektro.filter', 'elektro.mischspannung']),
    story: 'Ein Sensorsignal (1 kHz) sitzt auf 5 V Gleichspannung. Der Verstaerker danach soll nur den Wechselanteil sehen.',
    brief: 'Miss den <b>Gleichanteil</b> am Generator und an <b>R1</b> (hinter dem Kondensator), dazu U<sub>ss</sub> an R1.',
    learn: 'Ein Koppelkondensator trennt Gleich- von Wechselanteil.', take: 'Am Generator 5 V Gleichanteil, an R1 praktisch 0 V – der Wechselanteil (U_ss 6 V) kommt ungeschwaecht durch.',
    hint: SCOPE, hint2: 'Gleichanteil: V⎓ zeigt bei schneller Wechselspannung den Mittelwert.',
    start: hp, bench: { parts: [bG1, { id: 'C1', x: 520, y: 290, rot: 0 }, { id: 'R1', x: 760, y: 460, rot: 90 }] }, tests: ok,
    measure: [
      { id: 'dcg', ask: 'Gleichanteil am Generator', unit: 'V', mode: 'AC', q: 'dc', a: 'G1.p', b: 'G1.n', tol: 0.03 },
      { id: 'dcr', ask: 'Gleichanteil an R1', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.05, abs: 0.1 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert an R1', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  var mix = { parts: [{ id: 'B1', type: 'battery', value: 6, x: 160, y: 420, rot: 0 }, gen({}, 4, 160, 220), R('R1', 1000, 480, 300, 90)], wires: [W('B1.p', 'G1.n'), W('G1.p', 'R1.a'), W('R1.b', 'B1.n')] };
  defMessaufgabe({
    id: 'W8', ch: 'W', title: 'Mischspannung', tags: tags(['elektro.mischspannung', 'messen.wechselspannung']),
    story: 'Batterie und Generator liegen in Reihe – an R1 liegt eine Mischspannung.',
    brief: 'Miss an R1 mit <b>V⎓</b> den Gleichanteil, mit <b>V~</b> (TRMS) den Wechselanteil und am Oszilloskop den <b>hoechsten Wert</b>.',
    learn: 'V⎓ misst den Gleich-, V~ nur den Wechselanteil (AC-gekoppelt).', take: 'Gleichanteil 6 V, Wechselanteil 4 V / √2 ≈ 2,83 V, Maximum 6 V + 4 V = 10 V.',
    hint: SCOPE, hint2: 'V~ ist AC-gekoppelt – der Gleichanteil faellt heraus.',
    start: mix, bench: { parts: [{ id: 'B1', x: 250, y: 560, rot: 0 }, { id: 'G1', x: 250, y: 300, rot: 0 }, { id: 'R1', x: 700, y: 440, rot: 90 }] }, tests: ok,
    measure: [
      { id: 'udc', ask: 'Gleichanteil (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'uac', ask: 'Wechselanteil (V~, TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'max', ask: 'Hoechster Wert (Oszilloskop)', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  var clip = { parts: [gen({}, 12), R('R1', 470, 340, 200), { id: 'Z1', type: 'zener', x: 500, y: 300, rot: 270 }], wires: [W('G1.p', 'R1.a'), W('R1.b', 'Z1.k'), W('Z1.a', 'G1.n')] };
  defMessaufgabe({
    id: 'W9', ch: 'W', title: 'Die Z-Diode kappt den Sinus', tags: tags(['bauteil.zdiode', 'elektro.begrenzer']),
    story: 'Ein Eingang vertraegt hoechstens 5,5 V. Die Z-Diode (5,1 V) soll die Spitzen abschneiden.',
    brief: 'Schau dir die Spannung an der <b>Z-Diode</b> am Oszilloskop an (Zeitbasis 20 ms). Miss den <b>hoechsten Wert</b> und U<sub>ss</sub>.',
    learn: 'Oben begrenzt die Z-Spannung, unten die Durchlassspannung.', take: 'Oben ca. 5,2 V (U_Z), unten ca. −0,7 V (Durchlassrichtung) – U_ss ≈ 5,9 V statt 24 V.',
    hint: SCOPE, hint2: 'Spitzen an Z1.k (rot) und Z1.a (schwarz).',
    start: clip, bench: { parts: [bG1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'Z1', x: 760, y: 460, rot: 270 }] }, tests: ok,
    measure: [
      { id: 'max', ask: 'Hoechster Wert an Z1', unit: 'V', mode: 'AC', q: 'peak', a: 'Z1.k', b: 'Z1.a', tol: 0.04 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert an Z1', unit: 'V', mode: 'AC', q: 'pp', a: 'Z1.k', b: 'Z1.a', tol: 0.04 }]
  });

  var clk = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 500 }, x: 180, y: 300, rot: 0 }, { id: 'GND1', type: 'ground', x: 480, y: 460, rot: 0 }, R('R1', 1000, 480, 340, 90)], wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'GND1.g')] };
  defMessaufgabe({
    id: 'W10', ch: 'W', title: 'Taktsignal vermessen', tags: tags(['digital.takt']),
    story: 'Ein Taktgeber soll einen Zaehler antreiben. Stimmen Pegel und Tastverhaeltnis?',
    brief: 'Miss am Lastwiderstand R1 gegen Masse den <b>High-Pegel</b> (Oszilloskop) und mit V⎓ den <b>Mittelwert</b>. Bestimme bei Zeitbasis <b>5 ms</b> die <b>Periodendauer</b>.',
    learn: 'Mittelwert eines Rechtecks = Tastgrad · High-Pegel.', take: 'High ≈ 4,9 V (der Ausgangswiderstand kostet etwas), Mittelwert die Haelfte (Tastgrad 50 %), T = 2 ms bei 500 Hz.',
    hint: 'Spitzen an R1.a (rot) und GND1 (schwarz).', hint2: 'Auf 5 ms passen 2,5 Perioden.',
    start: clk, bench: { parts: [{ id: 'CLK1', x: 250, y: 380, rot: 0 }, { id: 'R1', x: 620, y: 380, rot: 90 }, { id: 'GND1', x: 620, y: 620, rot: 0 }] }, tests: ok,
    measure: [
      { id: 'high', ask: 'High-Pegel', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'GND1.g', tol: 0.03 },
      { id: 'mean', ask: 'Mittelwert (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'GND1.g', tol: 0.04 },
      { id: 't', ask: 'Periodendauer T', unit: 'ms', value: 0.002, tol: 0.05 }]
  });
})();

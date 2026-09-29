/* Kapitel 11 – Zeitabhaengige Vorgaenge I: RC-Glied und Taktgeber (Beginn Profi-Stufe)
 * Quelle: Praktische Elektronik Kap. 4 (Kondensator im Gleichspannungskreis, Aufgaben 12/13: 10 kΩ · 100 µF, τ = 1 s,
 * I_max = U0/R), Gleich- & Wechselgroessen (nicht periodische Vorgaenge: Laden C), ET Kurs AU Zusatz (RC-Tief-/Hochpass),
 * Digitaltechnik zeitabhaengige Vorgaenge (Takt als Grundlage fuer Flipflops und Zaehler). */
(function () {
  'use strict';
  defChapter({
    id: 11, title: 'RC-Glied und Taktgeber',
    intro: 'Jetzt kommt die Zeit ins Spiel: Kondensatoren laden und entladen sich, Taktgeber lassen LEDs blinken. Du misst Ladekurven am Oszilloskop und baust Verzoegerungen, Glaettungen und einfache Filter.',
    sequence: ['T11A', '11.1', '11.2', '11.3', '11.4', '11.5', 'T11B', '11.6', '11.7', '11.8', '11.9', '11.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  var B = function (v) { return { id: 'B1', type: 'battery', value: v, x: 160, y: 300, rot: 0 }; };
  var R = function (id, v, x, y, rot) { return { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; };
  var C = function (id, v, x, y, rot) { return { id: id, type: 'capacitor', value: v, x: x, y: y, rot: rot === undefined ? 90 : rot }; };
  var GND = function (x, y) { return { id: 'GND1', type: 'ground', x: x || 160, y: y || 460, rot: 0 }; };
  var bB1 = { id: 'B1', x: 240, y: 460, rot: 0 };

  defTheory({
    id: 'T11A', ch: 11, title: 'Laden und Entladen', tags: ['elektro.kondensator', 'elektro.zeitkonstante'],
    visual: { type: 'circuit', slow: true, caption: 'Der Taktgeber schaltet alle 2 s zwischen 5 V und 0 V um: Der Kondensator laedt sich ueber R1 auf und entlaedt sich wieder – nach τ = R · C ≈ 0,47 s sind 63 % erreicht, nach 5 τ ist er praktisch voll.',
      layout: { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 0.25 }, x: 180, y: 300 }, { id: 'GND1', type: 'ground', x: 480, y: 460 }, { id: 'R1', type: 'resistor', value: 10000, x: 340, y: 300 }, { id: 'C1', type: 'capacitor', value: 47e-6, x: 480, y: 380, rot: 90 }],
        wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'GND1.g')] },
      bench: { parts: [{ id: 'CLK1', x: 230, y: 380 }, { id: 'R1', x: 480, y: 380 }, { id: 'C1', x: 720, y: 460, rot: 90 }, { id: 'GND1', x: 720, y: 660 }] },
      readouts: [{ label: 'U an C1', sel: 'C1', q: 'v' }, { label: 'Ladestrom', sel: 'R1', q: 'i' }],
      scope: { a: 'C1.a', b: 'GND1.g', span: 8, label: 'U an C1' } },
    lesson:
      '<p>Ein <b>Kondensator</b> speichert Ladung. Ueber einen Widerstand geladen, steigt seine Spannung nicht sprunghaft, sondern <b>e-foermig</b>: Am Anfang fliesst der groesste Strom I<sub>max</sub> = U₀ / R, dann baut der Kondensator eine Gegenspannung auf – der Strom wird kleiner, das Laden langsamer.</p>' +
      '<div class="formula">τ = R · C &nbsp;&nbsp; u<sub>C</sub>(t) = U₀ · (1 − e<sup>−t/τ</sup>)</div>' +
      '<p>Nach <b>1 τ</b> ist der Kondensator auf <b>63 %</b> geladen, nach <b>5 τ</b> praktisch voll (99 %). Beim <b>Entladen</b> ueber einen Widerstand faellt die Spannung nach 1 τ auf <b>37 %</b>.</p>' +
      '<p>Beispiel aus dem Labor: 10 kΩ · 100 µF = 1 s. An 5 V ist I<sub>max</sub> = 5 V / 10 kΩ = 0,5 mA.</p>' +
      '<p>Im <b>Gleichstrom-Arbeitspunkt</b> (nach langer Zeit) sperrt der Kondensator: Es fliesst kein Strom mehr.</p>' +
      '<p>Am Oszilloskop siehst du den Verlauf ab dem Einschalten: Zeitbasis passend waehlen (etwa 5 τ ueber die Bildbreite).</p>',
    questions: [
      { q: 'Wie gross ist τ bei R = 10 kΩ und C = 100 µF?', options: ['0,1 s', '1 s', '10 s', '100 s'], correct: 1, explain: 'τ = 10 000 Ω · 0,0001 F = 1 s.' },
      { q: 'Auf wie viel Prozent ist ein Kondensator nach 1 τ geladen?', options: ['37 %', '50 %', '63 %', '100 %'], correct: 2, explain: '1 − e⁻¹ ≈ 0,63.' },
      { q: 'Nach wie vielen τ gilt ein Kondensator als voll geladen?', options: ['1', '2', '5', '100'], correct: 2, explain: 'Nach 5 τ sind 99 % erreicht.' },
      { q: 'Wann fliesst beim Laden der groesste Strom?', options: ['Ganz am Anfang', 'Nach 1 τ', 'Am Ende', 'Immer gleich'], correct: 0, explain: 'Am Anfang liegt die ganze Spannung am Widerstand: I = U₀ / R.' },
      { q: 'Ein voll geladener Kondensator (10 V) entlaedt sich ueber R. Welche Spannung hat er nach 1 τ?', options: ['0 V', '3,7 V', '5 V', '6,3 V'], correct: 1, explain: 'e⁻¹ ≈ 0,37 → 3,7 V.' }
    ]
  });

  var charge = function (r) { return { parts: [B(5), { id: 'S1', type: 'switch', x: 300, y: 200, rot: 0 }, R('R1', r, 440, 200), C('C1', 100e-6, 580, 300)],
    wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'B1.n')] }; };
  var bCharge = { parts: [bB1, { id: 'S1', x: 440, y: 290, rot: 0 }, { id: 'R1', x: 620, y: 290, rot: 0 }, { id: 'C1', x: 800, y: 460, rot: 90 }] };
  defTask({
    id: '11.1', ch: 11, title: 'Der Kondensator laedt', tags: ['elektro.kondensator', 'elektro.zeitkonstante', 'messen.oszilloskop'],
    story: 'Das Laborbuch sagt: 10 kΩ und 100 µF an 5 V – nach einer Sekunde 63 %. Pruefe es nach.',
    brief: 'Baue die Ladeschaltung: Batterie (5 V) → Schalter → <b>R = 10 kΩ</b> → <b>C = 100 µF</b> → zurueck. Schliesse den Schalter und beobachte die Ladekurve (Messspitzen an C1, Oszilloskop, Zeitbasis 5 s). Trage τ und den Anfangsstrom ein.',
    learn: 'τ = R·C, I_max = U₀/R.', take: 'Nach 1 s (= 1 τ) liegen 3,16 V am Kondensator, nach 5 s fast 5 V.',
    hint: 'Kondensatorwert im Panel: 100u (µF).', hint2: 'τ = 10 kΩ · 100 µF = 1 s; I_max = 5 V / 10 kΩ = 0,5 mA.',
    palette: ['switch', 'resistor', 'capacitor'], need: { switch: 1, resistor: 1, capacitor: 1 },
    start: { parts: [B(5)], wires: [] }, ref: charge(10000), bench: bCharge,
    wrong: [named('1 kΩ statt 10 kΩ (zu schnell)', charge(1000))],
    tests: [{ name: 'Laden', steps: [
      { name: 'offen', set: { S1: { closed: false } }, expect: [{ sel: 'C1', v: [0, 0.01] }] },
      { name: 'nach 1 s', set: { S1: { closed: true } }, run: 1, expect: [{ sel: 'C1', v: [3.0, 3.35] }] },
      { name: 'nach 5 s', run: 4, expect: [{ sel: 'C1', v: [4.9, 5.05] }] }] }],
    measure: [{ id: 'tau', ask: 'Zeitkonstante τ', unit: 's', value: 1, tol: 0.03 }, { id: 'imax', ask: 'Anfangsstrom I_max', unit: 'mA', value: 0.5e-3, tol: 0.03 }]
  });

  var rc2 = { parts: [B(5), R('R1', 22000, 360, 200), C('C1', 47e-6, 520, 300)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'B1.n')] };
  defTask({
    id: '11.2', ch: 11, title: 'τ am Oszilloskop', tags: ['elektro.zeitkonstante', 'messen.oszilloskop'],
    story: 'Die Werte auf den Bauteilen sind kaum lesbar. Die Zeitkonstante laesst sich aber messen.',
    brief: 'Nimm die Ladekurve an C1 mit dem Oszilloskop auf (Messspitzen an C1.a und C1.b, Zeitbasis 5 s). Bestimme <b>τ</b> (Zeit bis 63 %) und die Spannung nach einer Zeitkonstante.',
    learn: 'τ liest man bei 63 % des Endwerts ab.', take: '22 kΩ · 47 µF = 1,03 s – die Kurve erreicht 3,16 V nach gut einer Sekunde.',
    hint: '63 % von 5 V sind 3,16 V. Bei welcher Zeit schneidet die Kurve diesen Wert? Ein Kaestchen = 1/10 der Zeitbasis.', hint2: 'τ = R·C = 22 kΩ · 47 µF ≈ 1,03 s.',
    palette: [], start: rc2, ref: rc2, bench: { parts: [bB1, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'C1', x: 760, y: 460, rot: 90 }] },
    tests: [{ name: 'Ladekurve', steps: [{ run: 1.034, expect: [{ sel: 'C1', v: [3.0, 3.3] }] }] }],
    measure: [{ id: 'tau', ask: 'Zeitkonstante τ (abgelesen)', unit: 's', value: 1.034, tol: 0.1 }, { id: 'u', ask: 'Spannung nach 1 τ', unit: 'V', value: 5 * (1 - Math.exp(-1)), tol: 0.05 }]
  });

  var dis = function (withR2) {
    var l = charge(1000); if (withR2) { l.parts.push(R('R2', 10000, 720, 300, 90)); l.wires.push(W('R2.a', 'C1.a'), W('R2.b', 'C1.b')); } return l;
  };
  defTask({
    id: '11.3', ch: 11, title: 'Entladen', tags: ['elektro.kondensator', 'elektro.zeitkonstante'],
    story: 'Beim Ausschalten soll der Kondensator sich nicht ewig halten – aus Sicherheitsgruenden braucht er einen Entladewiderstand.',
    brief: 'Schalte einen <b>Entladewiderstand R2 = 10 kΩ</b> parallel zu C1. Nach dem Oeffnen des Schalters soll die Spannung mit τ = R2 · C = 1 s abklingen.',
    learn: 'Entladen: u(t) = U₀ · e^(−t/τ).', take: 'Nach 1 τ bleiben 37 % – nach 5 τ ist der Kondensator praktisch leer.',
    hint: 'R2 oben an C1.a, unten an C1.b.', hint2: 'Beim Laden teilt sich die Spannung (R1 : R2) – C laedt auf 10/11 · 5 V ≈ 4,55 V.',
    palette: ['resistor'], need: { resistor: 2 }, start: dis(false), ref: dis(true),
    bench: { parts: [bB1, { id: 'S1', x: 440, y: 290, rot: 0 }, { id: 'R1', x: 620, y: 290, rot: 0 }, { id: 'C1', x: 700, y: 480, rot: 90 }, { id: 'R2', x: 860, y: 480, rot: 90 }] },
    tests: [{ name: 'Laden und Entladen', steps: [
      { name: 'laden', set: { S1: { closed: true } }, run: 2, expect: [{ sel: 'C1', v: [4.4, 4.6] }] },
      { name: '1 s nach dem Ausschalten', set: { S1: { closed: false } }, run: 1, expect: [{ sel: 'C1', v: [1.5, 1.8] }] }] }]
  });

  var blink = function (f, r, withClock) {
    var l = { parts: [GND(560, 460), R('R1', r || 150, 380, 300), { id: 'D1', type: 'led', props: { color: 'gruen' }, x: 560, y: 380, rot: 90 }], wires: [W('R1.b', 'D1.a'), W('D1.k', 'GND1.g')] };
    if (withClock !== false) { l.parts.push({ id: 'CLK1', type: 'clock', props: { freq: f }, x: 200, y: 300, rot: 0 }); l.wires.push(W('CLK1.out', 'R1.a')); }
    return l;
  };
  var bBlink = { parts: [{ id: 'CLK1', x: 260, y: 380, rot: 0 }, { id: 'R1', x: 500, y: 380, rot: 0 }, { id: 'D1', x: 740, y: 480, rot: 90 }, { id: 'GND1', x: 740, y: 680, rot: 0 }] };
  var blinkStart = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 2 }, x: 200, y: 300, rot: 0 }, GND(560, 460)], wires: [] };
  defTask({
    id: '11.4', ch: 11, title: 'Die Blinkleuchte', tags: ['digital.takt', 'bauteil.led'],
    story: 'Die Warnleuchte an der Rampe soll zweimal pro Sekunde blinken. Der Taktgeber ist schon da.',
    brief: 'Schliesse eine gruene LED mit <b>Vorwiderstand</b> an den Taktgeber (2 Hz) an. Der Taktgeber liefert 5 V (High) bzw. 0 V (Low); die LED soll mit 10–20 mA leuchten.',
    learn: 'Ein Taktgeber liefert eine Rechteckspannung: T = 1/f, High und Low je halb so lang.', take: 'Bei 2 Hz ist die LED 0,25 s an und 0,25 s aus.',
    hint: 'LED-Kathode an Masse (GND1). Vorwiderstand fuer ca. 17 mA: (5 V − 2,1 V) / 0,017 A ≈ 170 Ω.', hint2: 'CLK1.out → R1 (150 Ω) → D1.a, D1.k → GND1.g.',
    palette: ['resistor', 'led'], need: { resistor: 1, led: 1 }, start: blinkStart, ref: blink(2, 150), bench: bBlink,
    wrong: [named('ohne Vorwiderstand', { parts: blink(2).parts.filter(function (p) { return p.id !== 'R1'; }), wires: [W('CLK1.out', 'D1.a'), W('D1.k', 'GND1.g')] })],
    tests: [{ name: 'Takt', steps: [
      { name: '0,1 s', run: 0.1, expect: [{ sel: 'D1', on: true, i: [0.01, 0.02] }] },
      { name: '0,4 s', run: 0.3, expect: [{ sel: 'D1', on: false }] },
      { name: '0,7 s', run: 0.3, expect: [{ sel: 'D1', on: true }, { noFault: true }] }] }]
  });

  defTask({
    id: '11.5', ch: 11, title: 'Takt einstellen', tags: ['digital.takt', 'elektro.frequenz'],
    story: 'Die Norm verlangt fuer diese Warnleuchte 5 Hz. Der alte Taktgeber ist ausgebaut.',
    brief: 'Setze einen neuen <b>Taktgeber</b> ein und stelle <b>5 Hz</b> ein. Berechne die Periodendauer.',
    learn: 'f = 1 / T.', take: '5 Hz → T = 0,2 s: 0,1 s an, 0,1 s aus.',
    hint: 'Taktgeber aus der Palette, im Panel Frequenz 5.', hint2: 'CLK1.out → R1.a.',
    palette: ['clock'], need: { clock: 1 }, start: blink(5, 150, false), ref: blink(5, 150), bench: bBlink,
    wrong: [named('1 Hz', blink(1, 150)), named('10 Hz', blink(10, 150))],
    tests: [{ name: '5 Hz', steps: [
      { name: '0,05 s', run: 0.05, expect: [{ sel: 'D1', on: true }] },
      { name: '0,15 s', run: 0.1, expect: [{ sel: 'D1', on: false }] },
      { name: '0,25 s', run: 0.1, expect: [{ sel: 'D1', on: true }] }] }],
    measure: [{ id: 't', ask: 'Periodendauer T', unit: 'ms', value: 0.2, tol: 0.02 }]
  });

  defTheory({
    id: 'T11B', ch: 11, title: 'RC-Glieder in Schaltungen', tags: ['elektro.rc', 'elektro.filter', 'digital.takt'],
    visual: { type: 'circuit', caption: 'Dasselbe RC-Glied an einem 5-Hz-Takt: Mit kleinem C folgt die Spannung dem Rechteck fast sofort, mit grossem C wird daraus ein flaches Dreieck um den Mittelwert (Integrierglied).',
      layout: { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 5 }, x: 180, y: 300 }, { id: 'GND1', type: 'ground', x: 480, y: 460 }, { id: 'R1', type: 'resistor', value: 10000, x: 340, y: 300 }, { id: 'C1', type: 'capacitor', value: 4.7e-6, x: 480, y: 380, rot: 90 }],
        wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'GND1.g')] },
      bench: { parts: [{ id: 'CLK1', x: 230, y: 380 }, { id: 'R1', x: 480, y: 380 }, { id: 'C1', x: 720, y: 460, rot: 90 }, { id: 'GND1', x: 720, y: 660 }] },
      sliders: [{ part: 'C1', prop: 'value', label: 'Kapazitaet C1', min: 1e-7, max: 1e-4, log: true, unit: 'F', round: 2 }],
      scope: { a: 'C1.a', b: 'GND1.g', span: 0.6, label: 'U an C1' } },
    lesson:
      '<p><b>Verzoegerung:</b> Ein RC-Glied vor einem Logikeingang verzoegert das Einschalten: Der Eingang sieht erst eine 1, wenn u<sub>C</sub> die Schaltschwelle (2,5 V bei 5 V) erreicht – nach t = τ · ln 2 ≈ 0,69 τ.</p>' +
      '<p><b>Glaettung:</b> Ein grosser Kondensator parallel zur Last nach dem Gleichrichter (Ladekondensator) wird in den Spannungsspitzen geladen und versorgt die Last dazwischen. Uebrig bleibt eine kleine <b>Brummspannung</b> – je groesser C, desto kleiner.</p>' +
      '<p><b>Tiefpass</b> (R in Reihe, C gegen Masse): laesst tiefe Frequenzen durch, daempft hohe. <b>Hochpass</b> (C in Reihe, R gegen Masse): umgekehrt. Grenzfrequenz:</p>' +
      '<div class="formula">f<sub>g</sub> = 1 / (2·π·R·C)</div>' +
      '<p>Bei f<sub>g</sub> ist die Ausgangsspannung auf 70,7 % gesunken (−3 dB).</p>' +
      '<p><b>Taktgeber</b> liefern Rechteckspannung mit Frequenz f und Periodendauer T = 1/f. Mit einem Inverter erhaelt man das Gegentaktsignal – zwei LEDs blinken abwechselnd.</p>',
    questions: [
      { q: 'Nach welcher Zeit schaltet ein Logikeingang hinter einem RC-Glied (τ = 1 s) auf 1?', options: ['0,1 s', '0,69 s', '1 s', '5 s'], correct: 1, explain: 'Die Schwelle 2,5 V ist bei 50 % erreicht: t = τ · ln 2 ≈ 0,69 s.' },
      { q: 'Wie verkleinert man die Brummspannung eines Gleichrichters?', options: ['Kleineren Ladekondensator', 'Groesseren Ladekondensator', 'Kleineren Lastwiderstand', 'Gar nicht'], correct: 1, explain: 'Ein groesserer Kondensator verliert zwischen den Spitzen weniger Spannung.' },
      { q: 'Grenzfrequenz bei R = 1 kΩ, C = 10 µF?', options: ['1,6 Hz', '15,9 Hz', '159 Hz', '1,59 kHz'], correct: 1, explain: 'f_g = 1 / (2π · 1000 · 0,00001) ≈ 15,9 Hz.' },
      { q: 'Welches Filter laesst tiefe Frequenzen durch?', options: ['Hochpass', 'Tiefpass', 'Bandsperre', 'Keines'], correct: 1, explain: 'Tiefpass: tiefe Frequenzen passieren.' },
      { q: 'Auf wie viel Prozent ist die Ausgangsspannung bei der Grenzfrequenz gesunken?', options: ['50 %', '63 %', '70,7 %', '90 %'], correct: 2, explain: '1/√2 ≈ 0,707 – das sind −3 dB.' }
    ]
  });

  var delay = function (withC) {
    var l = { parts: [{ id: 'E1', type: 'logicin', x: 160, y: 200, rot: 0 }, GND(160, 460), R('R1', 10000, 360, 200), { id: 'L1', type: 'logicled', x: 700, y: 200, rot: 0 }], wires: [W('E1.out', 'R1.a'), W('R1.b', 'L1.in')] };
    if (withC) { l.parts.push(C('C1', 100e-6, 520, 300)); l.wires.push(W('R1.b', 'C1.a'), W('C1.b', 'GND1.g')); }
    return l;
  };
  var delayStart = { parts: delay(false).parts.filter(function (p) { return p.id !== 'R1'; }), wires: [] };
  defTask({
    id: '11.6', ch: 11, title: 'Einschaltverzoegerung', tags: ['elektro.rc', 'digital.pegel', 'elektro.zeitkonstante'],
    story: 'Die Anzeige „Anlage bereit“ soll erst leuchten, wenn nach dem Einschalten alles eingeschwungen ist – etwa 0,7 s spaeter.',
    brief: 'Baue ein <b>RC-Glied</b> (R = 10 kΩ, C = 100 µF gegen Masse) zwischen Pegelschalter E1 und Logikanzeige L1. Nach dem Umschalten auf 1 soll L1 erst nach etwa 0,7 s leuchten.',
    learn: 'RC-Glied als Verzoegerung: Schaltschwelle bei 0,69 τ.', take: 'Die Logikanzeige schaltet bei 2,5 V – der Kondensator braucht dafuer 0,69 · 1 s.',
    hint: 'E1 → R1 → Knoten → L1; vom Knoten C1 gegen Masse.', hint2: 'E1.out → R1.a, R1.b → L1.in und C1.a, C1.b → GND1.g.',
    palette: ['resistor', 'capacitor'], need: { resistor: 1, capacitor: 1 }, start: delayStart, ref: delay(true),
    bench: { parts: [{ id: 'E1', x: 200, y: 300, rot: 0 }, { id: 'R1', x: 440, y: 300, rot: 0 }, { id: 'C1', x: 640, y: 480, rot: 90 }, { id: 'L1', x: 820, y: 300, rot: 0 }, { id: 'GND1', x: 640, y: 680, rot: 0 }] },
    wrong: [named('ohne Kondensator (sofort)', delay(false))],
    tests: [{ name: 'Verzoegerung', steps: [
      { name: '0,4 s nach Ein', set: { E1: { closed: true } }, run: 0.4, expect: [{ sel: 'L1', on: false }] },
      { name: '1 s nach Ein', run: 0.6, expect: [{ sel: 'L1', on: true }, { noFault: true }] }] }]
  });

  var gen = function (props) { return { id: 'G1', type: 'acsource', value: 10, props: Object.assign({ freq: 50, shape: 'sine', offset: 0 }, props || {}), x: 160, y: 300, rot: 0 }; };
  var smooth = function (withC) {
    var l = { parts: [gen(), { id: 'V1', type: 'diode', x: 300, y: 200, rot: 0 }, R('R1', 1000, 480, 300, 90)], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
    if (withC) { l.parts.push(C('C1', 470e-6, 620, 300)); l.wires.push(W('C1.a', 'R1.a'), W('C1.b', 'R1.b')); }
    return l;
  };
  defTask({
    id: '11.7', ch: 11, title: 'Der Ladekondensator', tags: ['elektro.gleichrichter', 'elektro.kondensator', 'messen.oszilloskop'],
    story: 'Der Einweggleichrichter liefert nur Buckel. Die Elektronik dahinter braucht aber eine ruhige Gleichspannung.',
    brief: 'Setze einen <b>Ladekondensator 470 µF</b> parallel zu R1. Pruefe am Oszilloskop: Die Spannung soll nahe am Scheitelwert liegen und nur wenig schwanken (Brummspannung unter 1,2 V).',
    learn: 'Der Kondensator ueberbrueckt die Luecken zwischen den Halbwellen.', take: 'Aus 2,8 V Mittelwert werden fast 9 V – mit kleiner Brummspannung.',
    hint: 'C1 oben an R1.a, unten an R1.b.', hint2: 'Oszilloskop mit Zeitbasis 50 ms: fast gerade Linie mit kleinen Zacken.',
    palette: ['capacitor'], need: { capacitor: 1 }, start: smooth(false), ref: smooth(true),
    bench: { parts: [{ id: 'G1', x: 250, y: 460, rot: 0 }, { id: 'V1', x: 480, y: 290, rot: 0 }, { id: 'R1', x: 660, y: 460, rot: 90 }, { id: 'C1', x: 820, y: 460, rot: 90 }] },
    tests: [{ name: 'geglaettet', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [8.2, 9.4] }, { a: 'R1.a', b: 'R1.b', ac: 'pp', range: [0, 1.2] }, { noFault: true }] }],
    measure: [{ id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.04 }, { id: 'upp', ask: 'Brummspannung (Spitze-Spitze)', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.15 }]
  });

  var lowpass = function (hp) {
    return hp ? { parts: [gen(), C('C1', 10e-6, 320, 200, 0), R('R1', 1000, 480, 300, 90)], wires: [W('G1.p', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n')] }
      : { parts: [gen(), R('R1', 1000, 320, 200), C('C1', 10e-6, 480, 300)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] };
  };
  defTask({
    id: '11.8', ch: 11, title: 'Der Tiefpass', tags: ['elektro.filter', 'elektro.rc', 'messen.wechselspannung'],
    story: 'Ein Sensorsignal ist von 50-Hz-Brumm ueberlagert. Ein RC-Tiefpass soll daempfen.',
    brief: 'Baue einen <b>RC-Tiefpass</b>: R1 = 1 kΩ in Reihe, C1 = 10 µF gegen den Rueckleiter. Miss die Ausgangsspannung am Knoten zwischen R1 und C1 gegen den Rueckleiter G1.– (V~ TRMS).',
    learn: 'Tiefpass: f_g = 1/(2πRC) = 15,9 Hz – 50 Hz liegen weit darueber.', take: 'Bei 50 Hz bleiben nur rund 30 % uebrig (7,07 V → 2,1 V).',
    hint: 'G1.+ → R1 → Knoten → C1 → G1.–. Gemessen wird an C1.', hint2: 'U_a/U_e = 1/√(1 + (f/f_g)²) = 1/√(1 + 9,9) ≈ 0,30.',
    palette: ['resistor', 'capacitor'], need: { resistor: 1, capacitor: 1 }, start: { parts: [gen()], wires: [] }, ref: lowpass(false),
    bench: { parts: [{ id: 'G1', x: 250, y: 460, rot: 0 }, { id: 'R1', x: 520, y: 290, rot: 0 }, { id: 'C1', x: 760, y: 460, rot: 90 }] },
    wrong: [named('Hochpass statt Tiefpass', lowpass(true))],
    tests: [{ name: '50 Hz', expect: [{ a: 'C1.a', b: 'G1.n', ac: 'rms', range: [1.9, 2.4] }] }],
    measure: [{ id: 'ua', ask: 'Ausgangsspannung (C1.a gegen G1.–, V~)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'G1.n', tol: 0.04 }]
  });
  defTask({
    id: '11.9', ch: 11, title: 'Der Hochpass', tags: ['elektro.filter', 'elektro.rc', 'messen.wechselspannung'],
    story: 'Jetzt umgekehrt: Ein Gleichanteil soll weg, das 50-Hz-Signal soll bleiben.',
    brief: 'Baue einen <b>RC-Hochpass</b>: C1 = 10 µF in Reihe, R1 = 1 kΩ gegen den Rueckleiter. Miss die Ausgangsspannung am Knoten zwischen C1 und R1 gegen den Rueckleiter G1.– (V~ TRMS).',
    learn: 'Hochpass: laesst Frequenzen weit ueber f_g fast ungedaempft durch.', take: 'Bei 50 Hz (≈ 3 · f_g) kommen 95 % durch: 7,07 V → 6,7 V.',
    hint: 'Nur die Reihenfolge von R und C tauschen.', hint2: 'G1.+ → C1 → Knoten → R1 → G1.–. Gemessen an R1.',
    palette: ['resistor', 'capacitor'], need: { resistor: 1, capacitor: 1 }, start: { parts: [gen()], wires: [] }, ref: lowpass(true),
    bench: { parts: [{ id: 'G1', x: 250, y: 460, rot: 0 }, { id: 'C1', x: 520, y: 290, rot: 0 }, { id: 'R1', x: 760, y: 460, rot: 90 }] },
    wrong: [named('Tiefpass statt Hochpass', lowpass(false))],
    tests: [{ name: '50 Hz', expect: [{ a: 'R1.a', b: 'G1.n', ac: 'rms', range: [6.4, 7.0] }] }],
    measure: [{ id: 'ua', ask: 'Ausgangsspannung (R1.a gegen G1.–, V~)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'G1.n', tol: 0.04 }]
  });

  var alt = function (withNot) {
    var l = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 1 }, x: 160, y: 200, rot: 0 }, GND(160, 460), R('R1', 150, 400, 160), R('R2', 150, 400, 320),
      { id: 'D1', type: 'led', props: { color: 'rot' }, x: 560, y: 160, rot: 0 }, { id: 'D2', type: 'led', props: { color: 'gelb' }, x: 560, y: 320, rot: 0 }],
      wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'GND1.g'), W('R2.b', 'D2.a'), W('D2.k', 'GND1.g')] };
    if (withNot) { l.parts.push({ id: 'U1', type: 'not', x: 280, y: 320, rot: 0 }); l.wires.push(W('CLK1.out', 'U1.in'), W('U1.out', 'R2.a')); }
    else l.wires.push(W('CLK1.out', 'R2.a'));
    return l;
  };
  var altStart = { parts: alt(true).parts.filter(function (p) { return p.id !== 'U1'; }), wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'GND1.g'), W('R2.b', 'D2.a'), W('D2.k', 'GND1.g')] };
  defTask({
    id: '11.10', ch: 11, title: 'Der Wechselblinker', tags: ['digital.takt', 'digital.nicht'],
    story: 'Am Bahnuebergang blinken zwei Lampen abwechselnd. Rot ist angeschlossen – Gelb soll genau dann leuchten, wenn Rot aus ist.',
    brief: 'Steuere D2 (gelb) ueber R2 so an, dass sie im <b>Gegentakt</b> zu D1 blinkt.',
    learn: 'Ein Inverter erzeugt das Gegentaktsignal.', take: 'CLK und ¬CLK: immer genau eine LED an.',
    hint: 'Zwischen Taktgeber und R2 gehoert ein NICHT-Gatter.', hint2: 'CLK1.out → U1.in, U1.out → R2.a.',
    palette: ['not', 'and', 'or'], need: { not: 1 }, start: altStart, ref: alt(true),
    bench: { parts: [{ id: 'CLK1', x: 240, y: 260, rot: 0 }, { id: 'GND1', x: 240, y: 680, rot: 0 }, { id: 'R1', x: 560, y: 200, rot: 0 }, { id: 'R2', x: 560, y: 440, rot: 0 }, { id: 'D1', x: 790, y: 200, rot: 0 }, { id: 'D2', x: 790, y: 440, rot: 0 }, { id: 'U1', x: 380, y: 440, rot: 0 }] },
    wrong: [named('beide im Gleichtakt', alt(false))],
    tests: [{ name: 'Gegentakt', steps: [
      { name: '0,2 s', run: 0.2, expect: [{ sel: 'D1', on: true }, { sel: 'D2', on: false }] },
      { name: '0,7 s', run: 0.5, expect: [{ sel: 'D1', on: false }, { sel: 'D2', on: true }, { noFault: true }] }] }]
  });
})();

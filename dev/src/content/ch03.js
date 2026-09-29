/* Kapitel 3 – Gleich- und Wechselgroessen
 * Quelle: Gleich- & Wechselgroessen (Gleich-/Wechselgroessen, Periode, Frequenz, linearer Mittelwert, Gleichrichtwert,
 * Effektivwert bei Sinus/Dreieck/Rechteck, harmonische Schwingung), Messtechnik Erweiterung (Kap. 4 AVG/RMS/TRMS,
 * Kap. 6.3/6.4/6.6 Kurvenformen, DC-Anteil, Gleichrichterschaltungen). */
(function () {
  'use strict';

  defChapter({
    id: 3, title: 'Gleich- und Wechselgroessen',
    intro: 'Der Funktionsgenerator liefert Sinus, Rechteck und Dreieck. Du misst Scheitelwert, Mittelwert und Effektivwert – und findest heraus, warum ein billiges Multimeter bei Rechteckspannung luegt.',
    sequence: ['T3A', '3.1', '3.2', '3.3', '3.4', '3.5', 'T3B', '3.6', '3.7', '3.8', '3.9', '3.10']
  });

  var gen = function (props) { return { id: 'G1', type: 'acsource', value: 10, props: Object.assign({ freq: 50, shape: 'sine', offset: 0 }, props || {}), x: 160, y: 300, rot: 0 }; };
  var R1 = { id: 'R1', type: 'resistor', value: 1000, x: 420, y: 300, rot: 90 };
  var bG1 = { id: 'G1', x: 250, y: 460, rot: 0 }, bR1 = { id: 'R1', x: 700, y: 440, rot: 90 };
  var genR = function (props) { return { parts: [gen(props), R1], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] }; };
  var named = function (name, l) { l.name = name; return l; };

  /* ================= Theorie A ================= */
  defTheory({
    id: 'T3A', ch: 3, title: 'Gleich- und Wechselgroessen', tags: ['elektro.wechselgroessen', 'elektro.frequenz'],
    visual: { type: 'circuit', slow: true, caption: 'Eine Wechselspannung aendert laufend Richtung und Groesse – die Punkte pendeln hin und her. Stell Kurvenform und Frequenz ein und lies am Oszilloskop Scheitelwert und Periodendauer ab (Bildbreite 2 s).',
      layout: { parts: [{ id: 'G1', type: 'acsource', value: 5, props: { freq: 1, shape: 'sine', offset: 0 }, x: 160, y: 300 }, { id: 'R1', type: 'resistor', value: 1000, x: 440, y: 300, rot: 90 }], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] },
      bench: { parts: [{ id: 'G1', x: 250, y: 440 }, { id: 'R1', x: 640, y: 440, rot: 90 }] },
      sliders: [{ part: 'G1', prop: 'shape', label: 'Kurvenform', choices: [{ value: 'sine', label: 'Sinus' }, { value: 'square', label: 'Rechteck' }, { value: 'triangle', label: 'Dreieck' }] },
        { part: 'G1', prop: 'freq', label: 'Frequenz', min: 0.5, max: 4, step: 0.5, unit: 'Hz' }],
      scope: { a: 'R1.a', b: 'R1.b', span: 2, label: 'U an R1' } },
    lesson:
      '<p><b>Gleichgroessen</b> (Gleichspannung, Gleichstrom) sind ueber die Zeit konstant – wie bei der Batterie.</p>' +
      '<p><b>Wechselgroessen</b> aendern sich mit der Zeit. Wiederholt sich der Verlauf immer gleich, ist sie <b>periodisch</b> mit der <b>Periodendauer T</b>. Die <b>Frequenz</b> f gibt an, wie viele Perioden pro Sekunde ablaufen:</p>' +
      '<div class="formula">f = 1 / T &nbsp;&nbsp; [Hz = 1/s]</div>' +
      '<p>Nicht periodisch ist z. B. das einmalige Laden eines Kondensators.</p>' +
      '<p>Der <b>lineare Mittelwert</b> ist der Gleichanteil U<sub>DC</sub> – die Flaeche ueber der Nulllinie minus die Flaeche darunter, geteilt durch T. Bei einer <b>reinen Wechselgroesse</b> ist er <b>0 V</b>. Ist er ungleich null, spricht man von einer <b>Mischgroesse</b> (Wechselanteil + Gleichanteil).</p>' +
      '<p>Die Sinusform heisst <b>harmonische Schwingung</b> – so sieht die Netzspannung aus:</p>' +
      '<div class="formula">u(t) = Û · sin(ω·t + φ) + U<sub>DC</sub> &nbsp;&nbsp; ω = 2·π·f</div>' +
      '<p><b>Û</b> ist der Scheitelwert (Spitze), <b>U<sub>ss</sub></b> der Spitze-Spitze-Wert (bei reinem Sinus 2·Û), φ der Nullphasenwinkel. Am <b>Oszilloskop</b> siehst du den Verlauf direkt; ein Multimeter auf V⎓ zeigt bei schneller Wechselspannung nur den Mittelwert.</p>',
    questions: [
      { q: 'Eine Wechselspannung hat die Periodendauer T = 20 ms. Wie gross ist die Frequenz?', options: ['20 Hz', '50 Hz', '200 Hz', '500 Hz'], correct: 1, explain: 'f = 1 / T = 1 / 0,02 s = 50 Hz.' },
      { q: 'Welchen linearen Mittelwert hat eine reine Sinusspannung mit Û = 10 V?', options: ['0 V', '6,37 V', '7,07 V', '10 V'], correct: 0, explain: 'Die positive und die negative Halbwelle sind gleich gross – sie heben sich auf.' },
      { q: 'Ein Sinus hat Û = 10 V. Wie gross ist der Spitze-Spitze-Wert U_ss?', options: ['5 V', '10 V', '14,1 V', '20 V'], correct: 3, explain: 'Von −10 V bis +10 V sind es 20 V.' },
      { q: 'Was ist eine Mischgroesse?', options: ['Eine Wechselgroesse mit Gleichanteil ≠ 0', 'Eine Spannung aus zwei Batterien', 'Ein Rechteck mit 50 % Tastgrad', 'Eine Spannung ohne Frequenz'], correct: 0, explain: 'Mischgroesse = Wechselanteil + Gleichanteil; ihr linearer Mittelwert ist nicht null.' },
      { q: 'Wie gross ist die Kreisfrequenz ω bei 50 Hz?', options: ['50 1/s', '100 1/s', '314 1/s', '3140 1/s'], correct: 2, explain: 'ω = 2 · π · 50 Hz ≈ 314 1/s.' }
    ]
  });

  /* ================= Aufgaben 1–5 ================= */
  defTask({
    id: '3.1', ch: 3, title: 'Der Funktionsgenerator', tags: ['elektro.wechselgroessen', 'messen.oszilloskop'],
    story: 'Neues Geraet im Labor: ein Funktionsgenerator. Die Werkmeisterin will sehen, ob du ihn ablesen kannst.',
    brief: 'Schliesse den Widerstand R1 (1 kΩ) an den Funktionsgenerator an (Sinus, Û = 10 V, 50 Hz). Nimm die Spannung an R1 mit dem <b>Oszilloskop</b> auf und lies den <b>Scheitelwert Û</b> und den <b>Spitze-Spitze-Wert U<sub>ss</sub></b> ab.',
    learn: 'Am Oszilloskop liest du Scheitelwert und Spitze-Spitze-Wert direkt ab.',
    take: 'U_ss = 2 · Û bei einer reinen Wechselspannung.',
    hint: 'Multimeter auf V⎓, Spitzen an R1.a (rot) und R1.b (schwarz) – das Oszilloskop nutzt dieselben Spitzen. Zeitbasis 50 ms, dann „Aufnahme“ (auf der Werkbank: RUN).',
    hint2: 'Unter dem Bild stehen max und min. Û = max, U_ss = max − min.',
    palette: [], need: {},
    start: { parts: [gen(), R1], wires: [] }, ref: genR(),
    bench: { parts: [bG1, bR1] },
    tests: [{ name: 'Anschluss', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'peak', range: [9.8, 10.2] }, { noFault: true }] }],
    measure: [
      { id: 'up', ask: 'Scheitelwert Û an R1', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert U_ss an R1', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  defTask({
    id: '3.2', ch: 3, title: 'Das Multimeter zeigt null?', tags: ['elektro.wechselgroessen', 'elektro.mittelwert', 'messen.spannung'],
    story: 'Ein Lernender meldet: „Am Widerstand liegt keine Spannung, das Multimeter zeigt 0 V.“ Das Oszilloskop sagt etwas anderes.',
    brief: 'Miss an R1 mit dem Multimeter auf <b>V⎓</b> (Gleichspannung) und mit dem Oszilloskop. Trage den angezeigten <b>Gleichanteil</b> und den <b>Spitze-Spitze-Wert</b> ein.',
    learn: 'V⎓ zeigt den linearen Mittelwert – bei reiner Wechselspannung 0 V.',
    take: 'Eine reine Wechselgroesse hat den Mittelwert null. Fuer Wechselspannung braucht es den Bereich V~ oder das Oszilloskop.',
    hint: 'V⎓ waehlen, Spitzen an R1.a und R1.b. Danach „Aufnahme“ am Oszilloskop.',
    hint2: 'Das Multimeter mittelt ueber viele Perioden – positive und negative Halbwelle heben sich auf.',
    palette: [], start: genR(), ref: genR(), bench: { parts: [bG1, bR1] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'Anzeige V⎓ an R1 (Gleichanteil)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03, abs: 0.1 },
      { id: 'upp', ask: 'Spitze-Spitze-Wert U_ss (Oszilloskop)', unit: 'V', mode: 'AC', q: 'pp', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  defTask({
    id: '3.3', ch: 3, title: 'Mischgroesse einstellen', tags: ['elektro.wechselgroessen', 'elektro.mittelwert'],
    story: 'Ein Sensor braucht eine Sinusspannung, die um 5 V herum schwingt – nie ganz auf null.',
    brief: 'Hole den Funktionsgenerator, schliesse ihn an R1 an und stelle einen <b>Gleichanteil von 5 V</b> ein (Sinus, Û = 10 V). Miss den Mittelwert mit V⎓.',
    learn: 'Mischgroesse = Wechselanteil + Gleichanteil.',
    take: 'Der Gleichanteil verschiebt die Kurve nach oben – V⎓ zeigt genau diesen Anteil.',
    hint: 'Im Eigenschaften-Panel des Generators gibt es das Feld „Gleichanteil“.',
    hint2: 'Gleichanteil 5 → Enter. Die Kurve laeuft dann von −5 V bis +15 V.',
    palette: ['acsource'], need: { acsource: 1 },
    start: { parts: [R1], wires: [] }, ref: genR({ offset: 5 }),
    bench: { parts: [bG1, bR1] },
    wrong: [named('ohne Gleichanteil', genR())],
    tests: [{ name: 'Mischgroesse', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [4.9, 5.1] }, { a: 'R1.a', b: 'R1.b', ac: 'pp', range: [19.5, 20.5] }, { noFault: true }] }],
    measure: [{ id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 }]
  });

  var half = { parts: [gen(), R1, { id: 'V1', type: 'diode', x: 290, y: 200, rot: 0 }], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
  defTask({
    id: '3.4', ch: 3, title: 'Einweggleichrichter', tags: ['bauteil.diode', 'elektro.gleichrichter', 'elektro.mittelwert'],
    story: 'Aus der Wechselspannung soll eine Spannung werden, die nur noch in eine Richtung zeigt.',
    brief: 'Setze eine <b>Diode</b> zwischen Generator und R1, sodass nur die positiven Halbwellen durchkommen. Miss an R1 den <b>Gleichanteil</b> (V⎓) und den <b>Scheitelwert</b> (Oszilloskop).',
    learn: 'Eine Diode laesst den Strom nur in eine Richtung durch – der Einweggleichrichter.',
    take: 'Nur jede zweite Halbwelle kommt durch: der Gleichanteil ist ≈ (Û − U_F) / π – deutlich kleiner als Û.',
    hint: 'Die Anode (V1.a) an den Generator (G1.+), die Kathode (V1.k) an R1.',
    hint2: 'Erwartet: Û an R1 ≈ 10 V − 0,7 V ≈ 9,3 V, Gleichanteil ≈ 2,8 V.',
    palette: ['diode'], need: { diode: 1 },
    start: genR(), ref: half,
    bench: { parts: [bG1, { id: 'V1', x: 480, y: 290, rot: 0 }, bR1] },
    wrong: [named('Diode verkehrt (negative Halbwellen)', { parts: half.parts, wires: [W('G1.p', 'V1.k'), W('V1.a', 'R1.a'), W('R1.b', 'G1.n')] })],
    tests: [{ name: 'gleichgerichtet', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [2.6, 3.1] }, { noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.04 },
      { id: 'up', ask: 'Scheitelwert an R1 (Oszilloskop)', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  var d = function (id, x, y, rot) { return { id: id, type: 'diode', x: x, y: y, rot: rot }; };
  var bridge = { parts: [gen(), R1, d('V1', 280, 200, 0), d('V2', 280, 400, 0), d('V3', 540, 200, 180), d('V4', 540, 400, 180)],
    wires: [W('G1.p', 'V1.a'), W('G1.p', 'V3.k'), W('G1.n', 'V2.a'), W('G1.n', 'V4.k'), W('V1.k', 'R1.a'), W('V2.k', 'R1.a'), W('V3.a', 'R1.b'), W('V4.a', 'R1.b')] };
  defTask({
    id: '3.5', ch: 3, title: 'Brueckengleichrichter', tags: ['bauteil.diode', 'elektro.gleichrichter', 'elektro.mittelwert'],
    story: 'Der Einweggleichrichter verschenkt die Haelfte. Mit vier Dioden geht es besser.',
    brief: 'Baue einen <b>Brueckengleichrichter</b> (Graetz-Bruecke) aus vier Dioden: Durch R1 soll in <b>beiden</b> Halbwellen Strom in dieselbe Richtung fliessen (R1.a positiv). Miss den Gleichanteil an R1.',
    learn: 'Die Graetz-Bruecke nutzt beide Halbwellen.',
    take: 'Zweiweg-Gleichrichtung: etwa doppelter Gleichanteil wie beim Einweggleichrichter – dafuer zwei Diodenspannungen Verlust.',
    hint: 'R1.a bekommt die Kathoden von zwei Dioden (deren Anoden an G1.+ und G1.–). R1.b bekommt die Anoden der anderen zwei (deren Kathoden an G1.+ und G1.–).',
    hint2: 'V1: G1.+ → R1.a · V2: G1.– → R1.a · V3: R1.b → G1.+ · V4: R1.b → G1.– (jeweils Anode → Kathode).',
    palette: ['diode'], need: { diode: 4 },
    start: genR(), ref: bridge,
    bench: { parts: [bG1, { id: 'V1', x: 470, y: 250, rot: 0 }, { id: 'V2', x: 470, y: 620, rot: 0 }, { id: 'V3', x: 700, y: 250, rot: 180 }, { id: 'V4', x: 700, y: 620, rot: 180 }, { id: 'R1', x: 860, y: 440, rot: 90 }] },
    wrong: [named('nur Einweg (eine Diode)', half)],
    tests: [{ name: 'Zweiweg', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [4.9, 5.9] }, { noFault: true }] }],
    measure: [{ id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.04 }]
  });

  /* ================= Theorie B ================= */
  defTheory({
    id: 'T3B', ch: 3, title: 'Gleichrichtwert, Effektivwert, AVG und TRMS', tags: ['elektro.effektivwert', 'messen.trms', 'elektro.gleichrichtwert'],
    visual: { type: 'circuit', flow: false, caption: 'Gleicher Scheitelwert, andere Kurvenform: Das TRMS-Multimeter zeigt immer den echten Effektivwert, das AVG-Geraet rechnet mit dem Sinus-Formfaktor – beim Sinus stimmen beide, bei Rechteck und Dreieck nicht.',
      layout: { parts: [{ id: 'G1', type: 'acsource', value: 10, props: { freq: 50, shape: 'sine', offset: 0 }, x: 160, y: 300 }, { id: 'R1', type: 'resistor', value: 1000, x: 440, y: 300, rot: 90 }], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] },
      bench: { parts: [{ id: 'G1', x: 250, y: 440 }, { id: 'R1', x: 640, y: 440, rot: 90 }] },
      sliders: [{ part: 'G1', prop: 'shape', label: 'Kurvenform', choices: [{ value: 'sine', label: 'Sinus' }, { value: 'square', label: 'Rechteck' }, { value: 'triangle', label: 'Dreieck' }] }],
      readouts: [{ label: 'Scheitelwert', a: 'R1.a', b: 'R1.b', ac: 'peak' }, { label: 'TRMS', a: 'R1.a', b: 'R1.b', ac: 'rms' }, { label: 'AVG-Anzeige', a: 'R1.a', b: 'R1.b', ac: 'avg' }],
      scope: { a: 'R1.a', b: 'R1.b', span: 0.04, label: 'U an R1' } },
    lesson:
      '<p>Der <b>Gleichrichtwert</b> |Ū| (engl. average, AVG) ist der Mittelwert des <i>Betrags</i> – alle Halbwellen nach oben geklappt. Beim Sinus: <b>|Ū| = 2·Û/π ≈ 0,637·Û</b>.</p>' +
      '<p>Der <b>Effektivwert</b> (RMS, root mean square) ist die Gleichspannung, die an einem Widerstand <i>dieselbe Leistung</i> umsetzt. Die 230 V im Haushalt sind ein Effektivwert.</p>' +
      '<div class="formula">Sinus: U = Û/√2 &nbsp; Dreieck: U = Û/√3 &nbsp; Rechteck (±Û): U = Û</div>' +
      '<p>Leistung am Widerstand mit Effektivwerten: <b>P = U² / R</b>.</p>' +
      '<p><b>Wie Multimeter messen:</b> Ein <b>AVG-Geraet</b> misst den Gleichrichtwert und multipliziert mit dem <b>Formfaktor 1,11</b> (= Effektivwert/Gleichrichtwert beim Sinus). Beim Sinus stimmt das – bei Rechteck zeigt es 11 % zu viel, beim Dreieck 4 % zu wenig, bei verzerrten Kurven bis 40 % daneben. Ein <b>TRMS-Geraet</b> („true RMS“) rechnet den echten Effektivwert und stimmt bei jeder Kurvenform.</p>' +
      '<p>V~ misst nur den <b>Wechselanteil</b>. Bei einer Mischgroesse gilt fuer den gesamten Effektivwert: U<sub>ges</sub> = √(U<sub>DC</sub>² + U<sub>AC</sub>²).</p>',
    questions: [
      { q: 'Ein Sinus hat Û = 10 V. Wie gross ist der Effektivwert?', options: ['5 V', '6,37 V', '7,07 V', '10 V'], correct: 2, explain: 'U = Û / √2 = 10 V / 1,414 ≈ 7,07 V.' },
      { q: 'Wie gross ist der Gleichrichtwert dieses Sinus?', options: ['3,18 V', '6,37 V', '7,07 V', '10 V'], correct: 1, explain: '|Ū| = 2 · Û / π = 20 V / 3,14 ≈ 6,37 V.' },
      { q: 'Ein AVG-Multimeter misst ein Rechteck ±10 V. Was zeigt es an?', options: ['7,07 V', '9,0 V', '10,0 V', '11,1 V'], correct: 3, explain: 'Gleichrichtwert 10 V × Formfaktor 1,11 = 11,1 V – 11 % zu viel, denn der echte Effektivwert ist 10 V.' },
      { q: 'Welches Messgeraet zeigt bei einer beliebigen Kurvenform den richtigen Effektivwert?', options: ['Drehspulgeraet', 'AVG-Multimeter', 'TRMS-Multimeter', 'Jedes Multimeter auf V⎓'], correct: 2, explain: 'Nur TRMS berechnet den echten quadratischen Mittelwert.' },
      { q: 'Welche Leistung setzt eine Sinusspannung Û = 10 V an 1 kΩ um?', options: ['10 mW', '50 mW', '70,7 mW', '100 mW'], correct: 1, explain: 'P = U² / R = (7,07 V)² / 1000 Ω = 50 mW.' }
    ]
  });

  /* ================= Aufgaben 6–10 ================= */
  defTask({
    id: '3.6', ch: 3, title: 'Der Effektivwert', tags: ['elektro.effektivwert', 'messen.wechselspannung', 'elektro.leistung'],
    story: 'Wie warm wird R1 an der Wechselspannung? Dafuer zaehlt der Effektivwert, nicht der Scheitelwert.',
    brief: 'Miss an R1 die Wechselspannung mit dem Multimeter auf <b>V~ (TRMS)</b>. Berechne daraus die <b>Leistung</b> in R1 (1 kΩ).',
    learn: 'Der Effektivwert ist die gleichwertige Gleichspannung fuer die Leistung: P = U² / R.',
    take: 'Beim Sinus ist der Effektivwert Û/√2 – mit ihm rechnest du wie mit Gleichspannung.',
    hint: 'V~ waehlen, Verfahren „Echt-Effektivwert (TRMS)“, Spitzen an R1.',
    hint2: 'U ≈ 7,07 V → P = (7,07 V)² / 1000 Ω ≈ 0,05 W = 50 mW.',
    palette: [], start: genR(), ref: genR(), bench: { parts: [bG1, bR1] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'ueff', ask: 'Effektivwert an R1 (V~ TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'p', ask: 'Leistung in R1 (berechnet)', unit: 'mW', value: 0.05, tol: 0.05 }
    ]
  });

  var sq = genR({ shape: 'square' });
  defTask({
    id: '3.7', ch: 3, title: 'Das Multimeter luegt', tags: ['messen.trms', 'elektro.effektivwert', 'messen.wechselspannung'],
    story: 'Zwei Multimeter, zwei Anzeigen – am selben Rechtecksignal. Welches hat recht?',
    brief: 'Der Generator liefert ein <b>Rechteck ±10 V</b>. Miss die Spannung an R1 auf V~ einmal mit dem Verfahren <b>Mittelwert (AVG)</b> und einmal mit <b>Echt-Effektivwert (TRMS)</b>.',
    learn: 'AVG-Geraete rechnen mit dem Sinus-Formfaktor 1,11 – bei anderen Kurvenformen zeigen sie falsch.',
    take: 'Rechteck ±10 V: TRMS zeigt 10 V (richtig), AVG zeigt 11,1 V (11 % zu viel).',
    hint: 'Im Multimeter-Panel unter „V~ misst“ zwischen AVG und TRMS umschalten.',
    hint2: 'Der Gleichrichtwert eines Rechtecks ist 10 V; das AVG-Geraet multipliziert mit 1,11.',
    palette: [], start: sq, ref: sq, bench: { parts: [bG1, bR1] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'avg', ask: 'Anzeige V~ mit AVG-Verfahren', unit: 'V', mode: 'VAC', meterType: 'avg', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'trms', ask: 'Anzeige V~ mit TRMS-Verfahren', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  defTask({
    id: '3.8', ch: 3, title: 'Dreieck einstellen', tags: ['messen.trms', 'elektro.effektivwert', 'elektro.wechselgroessen'],
    story: 'Fuer einen Test braucht es eine Dreieckspannung. Kontrolliere, ob der Generator richtig eingestellt ist.',
    brief: 'Hole den Funktionsgenerator, schliesse ihn an R1 an und stelle die Kurvenform <b>Dreieck</b> ein (Û = 10 V). Miss auf V~ mit <b>TRMS</b> und mit <b>AVG</b>.',
    learn: 'Dreieck: U_eff = Û/√3 ≈ 0,577 · Û.',
    take: 'Beim Dreieck zeigt das AVG-Geraet etwa 4 % zu wenig (5,55 V statt 5,77 V).',
    hint: 'Im Eigenschaften-Panel „Kurvenform: Dreieck“ waehlen.',
    hint2: 'TRMS ≈ 10 V / 1,732 ≈ 5,77 V.',
    palette: ['acsource'], need: { acsource: 1 },
    start: { parts: [R1], wires: [] }, ref: genR({ shape: 'triangle' }),
    bench: { parts: [bG1, bR1] },
    wrong: [named('Sinus statt Dreieck', genR()), named('Rechteck statt Dreieck', genR({ shape: 'square' }))],
    tests: [{ name: 'Dreieck', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'rms', range: [5.6, 5.95] }, { noFault: true }] }],
    measure: [
      { id: 'trms', ask: 'Anzeige V~ mit TRMS', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'avg', ask: 'Anzeige V~ mit AVG', unit: 'V', mode: 'VAC', meterType: 'avg', a: 'R1.a', b: 'R1.b', tol: 0.03 }
    ]
  });

  var twoLamps = function (u) {
    var l = { parts: [gen(), { id: 'H1', type: 'lamp', x: 300, y: 300, rot: 90 }, { id: 'H2', type: 'lamp', x: 620, y: 300, rot: 90 }], wires: [W('G1.p', 'H1.a'), W('H1.b', 'G1.n')] };
    if (u) { l.parts.push({ id: 'B1', type: 'battery', value: u, x: 480, y: 300, rot: 0 }); l.wires.push(W('B1.p', 'H2.a'), W('H2.b', 'B1.n')); }
    return l;
  };
  defTask({
    id: '3.9', ch: 3, title: 'Gleich hell', tags: ['elektro.effektivwert', 'elektro.leistung'],
    story: 'Was bedeutet „Effektivwert“ eigentlich? Die Werkmeisterin stellt zwei gleiche Lampen auf den Tisch.',
    brief: 'H1 haengt an der Sinusspannung Û = 10 V. Schliesse H2 an eine <b>Gleichspannungsquelle</b> an und stelle deren Spannung so ein, dass H2 <b>gleich viel Leistung</b> bekommt wie H1 (±2 %).',
    learn: 'Der Effektivwert ist die Gleichspannung mit derselben Waermewirkung.',
    take: 'Û = 10 V wirkt an der Lampe wie 7,07 V Gleichspannung – genau das bedeutet Effektivwert.',
    hint: 'Welche Gleichspannung setzt an 60 Ω dieselbe Leistung um wie ein Sinus mit Û = 10 V?',
    hint2: 'U = Û / √2 ≈ 7,07 V – Quelle holen, Spannung auf 7.07 setzen, an H2 anschliessen.',
    palette: ['battery'], need: { battery: 1 },
    start: twoLamps(0), ref: twoLamps(7.07),
    bench: { parts: [bG1, { id: 'H1', x: 480, y: 330, rot: 90 }, { id: 'B1', x: 660, y: 520, rot: 0 }, { id: 'H2', x: 860, y: 330, rot: 90 }] },
    wrong: [named('Scheitelwert statt Effektivwert (10 V)', twoLamps(10)), named('Gleichrichtwert (6,37 V)', twoLamps(6.37))],
    tests: [{ name: 'gleiche Leistung', expect: [{ sel: 'H2', v: [6.93, 7.21] }, { noFault: true }] }]
  });

  var mix = genR({ offset: 5 });
  defTask({
    id: '3.10', ch: 3, title: 'Gleich- und Wechselanteil', tags: ['messen.trms', 'elektro.effektivwert', 'elektro.mittelwert'],
    story: 'Am Ausgang eines Sensors liegt ein Sinus mit Gleichanteil. Wie gross ist der gesamte Effektivwert?',
    brief: 'Miss an R1 den <b>Gleichanteil</b> (V⎓) und den <b>Wechselanteil</b> (V~ TRMS). Berechne daraus den <b>gesamten Effektivwert</b> U = √(U<sub>DC</sub>² + U<sub>AC</sub>²).',
    learn: 'V~ misst nur den Wechselanteil – der Gleichanteil kommt quadratisch dazu.',
    take: 'Fuer Mischgroessen braucht es beide Messungen (oder ein TRMS-Geraet mit AC+DC).',
    hint: 'Erst V⎓, dann V~ (TRMS) an R1.',
    hint2: 'U_DC ≈ 5 V, U_AC ≈ 7,07 V → U = √(25 + 50) V ≈ 8,66 V.',
    palette: [], start: mix, ref: mix, bench: { parts: [bG1, bR1] },
    tests: [{ name: 'Anlage', expect: [{ noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'Gleichanteil U_DC (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'uac', ask: 'Wechselanteil U_AC (V~ TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'uges', ask: 'Gesamter Effektivwert (berechnet)', unit: 'V', value: Math.sqrt(25 + 50), tol: 0.03 }
    ]
  });
})();

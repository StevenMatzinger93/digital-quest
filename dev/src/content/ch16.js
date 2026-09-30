/* Kapitel 16 – Messtechnik-Erweiterung (Vertiefung zu Kapitel 3 und 4)
 * Quelle (nur fachlich, keine Bilder): Messtechnik Erweiterung (Kap. 2.1/2.2 Drehspul-/Dreheisenmesswerk, 2.3 Sinnbilder,
 * 2.5 Strommesszange, 3 Messkategorien, 5 Genauigkeit/Systemfehler, 6 Messaufgaben). Alle Bilder sind eigene SVG-Zeichnungen.
 * Alle Aufgaben nutzen die neue Werkbank-Bedienung (measureUX 'drag': Spitzen ziehen, eigener Tastkopf, Messbereich von Hand).
 * Plan: docs/PLAN_MESSTECHNIK_ERWEITERUNG.md, Teil B. */
(function () {
  'use strict';

  defChapter({
    id: 16, title: 'Messtechnik-Erweiterung', after: '4.10',
    intro: 'Analoge Messwerke, Sinnbilder auf dem Skalenfeld, Messkategorien und die genaue Rechnung mit Messfehlern. Auf der Werkbank ziehst du die Messspitzen selbst an die Buchsen, schliesst den Tastkopf des Oszilloskops an und waehlst den Messbereich von Hand.',
    sequence: ['T16A', 'T16B', 'T16C']
  });

  var DRAG = 'drag';
  var gen = function (props, v) { return { id: 'G1', type: 'acsource', value: v || 10, props: Object.assign({ freq: 50, shape: 'sine', offset: 0 }, props || {}), x: 160, y: 300, rot: 0 }; };
  var R = function (id, v, x, y, rot, props) { var p = { id: id, type: 'resistor', value: v, x: x, y: y, rot: rot || 0 }; if (props) p.props = props; return p; };
  var d = function (id, x, y, rot) { return { id: id, type: 'diode', x: x, y: y, rot: rot }; };
  var bG1 = { id: 'G1', x: 240, y: 470, rot: 0 };
  var named = function (name, l) { l.name = name; return l; };
  /* Anzeige eines 2000-Count-Multimeters mit Fehlerangabe ±(p % + n Digit) im Bereich range: groesster Fehler */
  var digitalErr = function (value, range, pct, digits) { return value * pct / 100 + digits * Math.pow(10, Math.floor(Math.log10(range / 2000))); };

  /* ===== eigene Bilder (SVG, Digital-Quest-Stil: dunkler Grund, Bernstein, Cyan) ===== */
  var SVG = function (w, h, inner) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" style="max-width:100%;height:auto;display:block;margin:0 auto;font-family:Inter,sans-serif"><rect width="' + w + '" height="' + h + '" rx="12" fill="#14171b"/>' + inner + '</svg>'; };
  var scale = function (cx, cy, r, ang, label) { // Skalenbogen mit Zeiger
    var ticks = ''; for (var i = 0; i <= 10; i++) { var a = (-60 + 12 * i) * Math.PI / 180; ticks += 'M' + (cx + Math.sin(a) * r).toFixed(1) + ' ' + (cy - Math.cos(a) * r).toFixed(1) + 'L' + (cx + Math.sin(a) * (r - (i % 5 ? 6 : 11))).toFixed(1) + ' ' + (cy - Math.cos(a) * (r - (i % 5 ? 6 : 11))).toFixed(1); }
    var b = ang * Math.PI / 180;
    return '<path d="M' + (cx - Math.sin(60 * Math.PI / 180) * r).toFixed(1) + ' ' + (cy - Math.cos(60 * Math.PI / 180) * r).toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + (cx + Math.sin(60 * Math.PI / 180) * r).toFixed(1) + ' ' + (cy - Math.cos(60 * Math.PI / 180) * r).toFixed(1) + '" fill="none" stroke="#e8e8e8" stroke-width="2"/>' +
      '<path d="' + ticks + '" stroke="#e8e8e8" stroke-width="1.5"/><text x="' + (cx - r + 4) + '" y="' + (cy - r * 0.35) + '" fill="#9aa" font-size="11">0</text><text x="' + (cx + r - 22) + '" y="' + (cy - r * 0.35) + '" fill="#9aa" font-size="11">' + label + '</text>' +
      '<path d="M' + cx + ' ' + cy + 'L' + (cx + Math.sin(b) * (r - 2)).toFixed(1) + ' ' + (cy - Math.cos(b) * (r - 2)).toFixed(1) + '" stroke="#ff3333" stroke-width="2.5" stroke-linecap="round"/>';
  };
  var IMG_DREHSPUL = SVG(700, 300,
    '<text x="20" y="30" fill="#ffb000" font-size="15" font-weight="700">Drehspulmesswerk</text>' +
    // Dauermagnet (Stator): zwei Polschuhe
    '<path d="M110 120h70v110h-70z" fill="#c62828" opacity=".85"/><text x="128" y="185" fill="#fff" font-size="26" font-weight="800">N</text>' +
    '<path d="M330 120h70v110h-70z" fill="#1e88e5" opacity=".85"/><text x="347" y="185" fill="#fff" font-size="26" font-weight="800">S</text>' +
    '<path d="M110 120C110 60 400 60 400 120" fill="none" stroke="#7a7f85" stroke-width="18"/><text x="150" y="255" fill="#9aa" font-size="11">Dauermagnet (Stator)</text>' +
    // Weicheisenkern und drehbare Spule (Rotor)
    '<circle cx="255" cy="175" r="44" fill="#4a5058"/><rect x="215" y="128" width="80" height="94" rx="6" fill="none" stroke="#e0b400" stroke-width="7" transform="rotate(-25 255 175)"/>' +
    '<text x="150" y="275" fill="#e0b400" font-size="11">drehbare Spule (Rotor) mit Zeiger, Spiralfeder als Gegenkraft</text>' +
    // Spiralfeder
    '<path d="M255 175m0 0c10 0 14-8 8-14s-16-2-16 6 12 12 20 6" fill="none" stroke="#cfd2d4" stroke-width="1.6"/>' +
    scale(255, 175, 150, 30, 'I') +
    '<text x="470" y="130" fill="#e8e8e8" font-size="12">Strom durch die Spule →</text><text x="470" y="148" fill="#e8e8e8" font-size="12">Magnetfeld → Drehmoment,</text><text x="470" y="166" fill="#e8e8e8" font-size="12">Feder haelt dagegen.</text>' +
    '<text x="470" y="200" fill="#1ec8e0" font-size="12" font-weight="700">DC: linearer Mittelwert</text><text x="470" y="218" fill="#1ec8e0" font-size="12" font-weight="700">AC: Gleichrichtwert</text><text x="470" y="236" fill="#9aa" font-size="11">(mit Gleichrichter, Skala × 1,11)</text>');
  var IMG_DREHEISEN = SVG(700, 300,
    '<text x="20" y="30" fill="#ffb000" font-size="15" font-weight="700">Dreheisenmesswerk</text>' +
    // feste Spule (Stator)
    '<rect x="150" y="110" width="210" height="120" rx="10" fill="none" stroke="#e0b400" stroke-width="9" stroke-dasharray="14 5"/><text x="150" y="255" fill="#e0b400" font-size="11">feste Spule (Stator), vom Messstrom durchflossen</text>' +
    // zwei Weicheisenplaettchen: fest und beweglich (stossen sich ab)
    '<path d="M200 130v80h14v-80z" fill="#8d9296"/><text x="150" y="275" fill="#9aa" font-size="11">graues Plaettchen fest, helles beweglich mit Zeiger – sie stossen sich ab</text>' +
    '<path d="M262 132v78h14v-78z" fill="#cfd2d4" transform="rotate(-18 255 172)"/>' +
    '<path d="M222 172h30" stroke="#ff8c00" stroke-width="2"/>' +
    scale(255, 172, 150, 40, 'I') +
    '<text x="470" y="130" fill="#e8e8e8" font-size="12">Beide Plaettchen werden</text><text x="470" y="148" fill="#e8e8e8" font-size="12">gleichsinnig magnetisiert</text><text x="470" y="166" fill="#e8e8e8" font-size="12">und stossen sich ab –</text><text x="470" y="184" fill="#e8e8e8" font-size="12">egal, in welche Richtung</text><text x="470" y="202" fill="#e8e8e8" font-size="12">der Strom fliesst.</text>' +
    '<text x="470" y="236" fill="#1ec8e0" font-size="12" font-weight="700">AC und DC: Effektivwert</text><text x="470" y="254" fill="#9aa" font-size="11">(Kraft ~ I², Skala nicht linear)</text>');
  var IMG_ZANGE = SVG(560, 220,
    '<text x="20" y="30" fill="#ffb000" font-size="15" font-weight="700">Strommesszange</text>' +
    '<path d="M60 130h440" stroke="#2a6fdb" stroke-width="10" stroke-linecap="round"/><text x="60" y="118" fill="#9aa" font-size="11">Leiter (nicht aufgetrennt)</text>' +
    '<circle cx="280" cy="130" r="48" fill="none" stroke="#3a3f47" stroke-width="18"/><circle cx="280" cy="130" r="48" fill="none" stroke="#e0b400" stroke-width="4" stroke-dasharray="6 6"/>' +
    '<path d="M280 178v40h60v-60" fill="none" stroke="#3a3f47" stroke-width="18" stroke-linecap="round"/>' +
    '<rect x="330" y="150" width="70" height="30" rx="4" fill="#b9c6a2"/><text x="338" y="171" fill="#1b2413" font-size="13" font-family="monospace" font-weight="700">2.34 A</text>' +
    '<circle cx="280" cy="130" r="70" fill="none" stroke="#1ec8e0" stroke-width="1.2" stroke-dasharray="3 5"/><circle cx="280" cy="130" r="90" fill="none" stroke="#1ec8e0" stroke-width="1" stroke-dasharray="3 7" opacity=".6"/>' +
    '<text x="380" y="70" fill="#1ec8e0" font-size="12">Magnetfeld um den Leiter</text><text x="380" y="88" fill="#e8e8e8" font-size="12">induziert in der Zangenspule</text><text x="380" y="106" fill="#e8e8e8" font-size="12">einen proportionalen Strom.</text>');
  var sym = function (x, y, inner, label) { return '<g transform="translate(' + x + ' ' + y + ')"><rect x="0" y="0" width="124" height="64" rx="6" fill="#1e2228" stroke="#3a3f47"/><g transform="translate(62 26)" fill="none" stroke="#e8e8e8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g><text x="62" y="58" fill="#9aa" font-size="8.5" text-anchor="middle">' + label + '</text></g>'; };
  var IMG_SINNBILDER = SVG(700, 260,
    '<text x="20" y="26" fill="#ffb000" font-size="15" font-weight="700">Sinnbilder auf dem Skalenfeld</text>' +
    sym(20, 40, '<path d="M-10 10V-10M10 10V-10M-14 10h28"/>', 'Gebrauchslage senkrecht') +
    sym(152, 40, '<path d="M-14 6h28M-8 6V-4h16v10"/>', 'Gebrauchslage waagrecht') +
    sym(284, 40, '<path d="M-14 8h26M-14 8l20-14"/><text x="-2" y="-6" fill="#e8e8e8" font-size="8" stroke="none">60°</text>', 'Gebrauchslage schraeg 60°') +
    sym(416, 40, '<path d="M0-13l4 9 9 1-6.5 6 1.5 9-8-4.5-8 4.5 1.5-9-6.5-6 9-1z"/><text x="0" y="3" fill="#e8e8e8" font-size="8" text-anchor="middle" stroke="none">2</text>', 'Pruefspannung 2 kV') +
    sym(548, 40, '<text x="0" y="5" fill="#e8e8e8" font-size="15" font-weight="700" text-anchor="middle" stroke="none">1,5</text>', 'Genauigkeitsklasse 1,5 %') +
    sym(20, 130, '<path d="M-12 8a12 12 0 0 1 24 0"/><path d="M-12 8v-6M12 8v-6"/><path d="M0 8v-14" stroke="#ff3333"/>', 'Drehspulmesswerk') +
    sym(152, 130, '<path d="M-12 8a12 12 0 0 1 24 0"/><path d="M-6 8v-10h4v10M2 8v-10h4v10"/>', 'Dreheisenmesswerk') +
    sym(284, 130, '<path d="M-12 0h24"/>', 'Gleichstrom (DC)') +
    sym(416, 130, '<path d="M-12 0c3-8 6-8 9 0s6 8 9 0 6-8 6 0"/>', 'Wechselstrom (AC)') +
    sym(548, 130, '<path d="M-12 0h24M-12-6h24" stroke-dasharray="3 2"/><path d="M-12 6h24"/>', 'Gleich- und Wechselstrom') +
    '<text x="20" y="232" fill="#9aa" font-size="11">Weitere Sinnbilder: Gleichrichter (Diodenzeichen), Isolationsklasse II (Doppelquadrat), Nullpunktkorrektur (Schraube).</text>');

  /* ================= Theorie A – Analoge Messwerke ================= */
  defTheory({
    id: 'T16A', ch: 16, title: 'Analoge Messwerke', tags: ['messen.geraete', 'elektro.gleichrichtwert', 'elektro.effektivwert'],
    visual: [
      { type: 'block', svg: IMG_DREHSPUL, caption: 'Drehspulmesswerk: Dauermagnet aussen, die Spule dreht sich im Feld. Der Zeiger folgt dem Mittelwert des Stroms.' },
      { type: 'block', svg: IMG_DREHEISEN, caption: 'Dreheisenmesswerk: feste Spule, zwei Eisenplaettchen stossen sich ab – die Kraft haengt vom Quadrat des Stroms ab, der Zeiger zeigt den Effektivwert.' },
      { type: 'circuit', view: 'bench', caption: 'Werkstatt-Aufbau: Derselbe Strom durch R1, einmal als Sinus, einmal als Rechteck. Vergleiche, was ein Drehspulgeraet mit Gleichrichter (AVG-Anzeige) und ein Dreheisengeraet (Effektivwert) anzeigen wuerden – und den Gleichanteil, den ein Drehspulgeraet ohne Gleichrichter zeigt.',
        layout: { parts: [gen(), R('R1', 1000, 440, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] },
        bench: { parts: [{ id: 'G1', x: 250, y: 440 }, { id: 'R1', x: 640, y: 440, rot: 90 }] },
        sliders: [{ part: 'G1', prop: 'shape', label: 'Kurvenform', choices: [{ value: 'sine', label: 'Sinus' }, { value: 'square', label: 'Rechteck' }, { value: 'triangle', label: 'Dreieck' }] }, { part: 'G1', prop: 'offset', label: 'Gleichanteil', min: 0, max: 5, step: 0.5, unit: 'V' }],
        readouts: [{ label: 'Drehspul ohne Gleichrichter (Mittelwert)', a: 'R1.a', b: 'R1.b', ac: 'dc' }, { label: 'Drehspul mit Gleichrichter (AVG-Anzeige)', a: 'R1.a', b: 'R1.b', ac: 'avg' }, { label: 'Dreheisen / TRMS (Effektivwert des Wechselanteils)', a: 'R1.a', b: 'R1.b', ac: 'rms' }],
        scope: { a: 'R1.a', b: 'R1.b', span: 0.04, label: 'U an R1' } },
      { type: 'block', svg: IMG_ZANGE, caption: 'Strommesszange: misst ohne Auftrennen des Kreises ueber das Magnetfeld des Leiters.' }
    ],
    lesson:
      '<p>Vor dem Digitalmultimeter gab es das <b>Zeigerinstrument</b> – und in Schaltschraenken, an Netzgeraeten und in vielen Pruefstaenden haengt es noch heute. Zwei Messwerke musst du kennen, weil sie <i>unterschiedlich</i> auf Wechselgroessen reagieren.</p>' +
      '{{visual}}' +
      '<p><b>Drehspulmesswerk.</b> Ein Dauermagnet (Stator) umgibt eine drehbar gelagerte Spule (Rotor). Fliesst der Messstrom durch die Spule, entsteht ein Drehmoment, das der Spiralfeder entgegenwirkt; Zeiger und Spule bleiben dort stehen, wo Magnetkraft und Federkraft gleich gross sind. Der Ausschlag ist <b>proportional zum Strom</b>, die Skala linear. Gebaut ist es fuer <b>Strom</b>; mit einem Vorwiderstand wird daraus ein Spannungsmesser. Weil das Drehmoment mit der Stromrichtung das Vorzeichen wechselt, zeigt es bei Wechselstrom den <b>linearen Mittelwert</b> – bei reinem Wechselstrom also 0. Erst ein eingebauter <b>Gleichrichter</b> macht daraus ein Wechselstrominstrument: Es zeigt dann den <b>Gleichrichtwert</b>, und die Skala ist mit dem Formfaktor 1,11 auf den Sinus-Effektivwert umgerechnet (das AVG-Prinzip aus Theorie 3B).</p>' +
      '{{visual:2}}' +
      '<p><b>Dreheisenmesswerk.</b> Hier steht die Spule fest (Stator), im Inneren sitzen zwei <b>Weicheisenplaettchen</b> – eines fest, eines drehbar mit dem Zeiger. Der Strom magnetisiert beide gleichsinnig, sie stossen sich ab. Die Kraft haengt vom <b>Quadrat</b> des Stroms ab, darum ist die Richtung egal: Das Dreheisenmesswerk misst Gleich- <i>und</i> Wechselstrom und zeigt bei Wechselstrom den <b>Effektivwert</b> – unabhaengig von der Kurvenform, wie ein TRMS-Geraet. Die Skala ist dafuer nicht linear (unten gedraengt) und das Messwerk ist robust, aber weniger empfindlich.</p>' +
      '{{visual:3}}' +
      '<p>Merke dir die Zuordnung, sie erklaert die Tabelle „Messfehler nach Instrumentenwahl“: <b>Drehspul + Gleichrichter = AVG-Verhalten</b> (beim Sinus richtig, beim Rechteck ≈ 11 % zu viel, beim Dreieck ≈ 4 % zu wenig, bei Mischspannung falsch), <b>Dreheisen = Effektivwert</b> (immer richtig, auch mit Gleichanteil).</p>' +
      '{{visual:4}}' +
      '<p><b>Strommesszange.</b> Sie misst Strom, <i>ohne den Kreis aufzutrennen</i>: Die Zange umschliesst den Leiter; dessen Magnetfeld induziert in der Zangenspule einen proportionalen Strom, den das Geraet auswertet (Wechselstrom ueber Induktion, Gleichstrom mit Hall-Sensor). Wichtig: nur <b>einen</b> Leiter umschliessen – bei Hin- und Rueckleiter zusammen heben sich die Felder auf, die Zange zeigt 0.</p>',
    questions: [
      { q: 'Was zeigt ein Drehspulmesswerk ohne Gleichrichter bei einem reinen Sinusstrom?', options: ['den Effektivwert', 'den Gleichrichtwert', 'den Scheitelwert', '0 – den linearen Mittelwert'], correct: 3, explain: 'Das Drehmoment wechselt mit der Stromrichtung das Vorzeichen; im Mittel bleibt der Zeiger bei 0.' },
      { q: 'Warum zeigt das Dreheisenmesswerk bei Wechselstrom den Effektivwert?', options: ['Es hat einen eingebauten Gleichrichter', 'Die Abstosskraft der Plaettchen haengt vom Quadrat des Stroms ab', 'Die Spule ist drehbar gelagert', 'Es misst nur Gleichstrom'], correct: 1, explain: 'Kraft ~ I²: Die Richtung spielt keine Rolle, der Mittelwert des Quadrats ist der Effektivwert.' },
      { q: 'Ein Drehspulgeraet mit Gleichrichter (Skala fuer Sinus) misst ein Rechteck ±10 V. Was zeigt es ungefaehr?', options: ['7,1 V', '10,0 V', '11,1 V', '0 V'], correct: 2, explain: 'Gleichrichtwert 10 V × Formfaktor 1,11 – wie ein AVG-Multimeter, 11 % zu viel.' },
      { q: 'Wozu dient die Spiralfeder im Drehspulmesswerk?', options: ['Sie leitet den Strom zur Spule und liefert die Gegenkraft zum Drehmoment', 'Sie gleicht die Temperatur aus', 'Sie richtet den Strom gleich', 'Sie haelt den Dauermagneten'], correct: 0, explain: 'Der Zeiger steht dort, wo Federmoment und magnetisches Drehmoment gleich gross sind.' },
      { q: 'Eine Strommesszange umschliesst ein Kabel mit Hin- und Rueckleiter. Was zeigt sie?', options: ['den doppelten Strom', 'den Strom eines Leiters', 'praktisch 0', 'den Effektivwert der Spannung'], correct: 2, explain: 'Die Magnetfelder von Hin- und Rueckleiter heben sich auf – immer nur einen Leiter umschliessen.' }
    ]
  });

  /* ================= Aufgaben 1–3 ================= */
  var load = { parts: [{ id: 'B1', type: 'battery', value: 230, props: { ri: 0.01, imax: 40 }, x: 160, y: 300, rot: 0 }, R('R1', 10, 440, 300, 90, { pmax: 6000 })], wires: [W('B1.p', 'R1.a'), W('R1.b', 'B1.n')] };
  var I1 = 230 / 10.01;

  var err = { parts: [{ id: 'B1', type: 'battery', value: 9, x: 160, y: 300, rot: 0 }, { id: 'S1', type: 'switch', x: 320, y: 200, rot: 0, props: { closed: false } }, R('R1', 10, 480, 300, 90, { pmax: 10 }),
    { id: 'S2', type: 'switch', x: 320, y: 420, rot: 0, props: { closed: false } }, R('R3', 10e6, 620, 220, 90), R('R2', 10e6, 620, 380, 90)],
    wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'B1.n'), W('B1.p', 'S2.a'), W('S2.b', 'R3.a'), W('R3.b', 'R2.a'), W('R2.b', 'B1.n')] };

  var wave = { parts: [gen(), R('R1', 1000, 440, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  var bWave = { parts: [bG1, { id: 'R1', x: 660, y: 450, rot: 90 }] };
  var M = function (id, ask, q, shape, extra) { // Ablesung an R1 fuer eine Kurvenform: q 'avg' (V~ AVG) | 'rms' (V~ TRMS) | 'dc' | 'peak' (Oszilloskop)
    var m = { id: id, ask: ask, unit: 'V', a: 'R1.a', b: 'R1.b', tol: 0.04, set: { G1: Object.assign({ shape: shape }, extra || {}) } };
    if (q === 'avg' || q === 'rms') { m.mode = 'VAC'; m.meterType = q === 'avg' ? 'avg' : 'trms'; } else { m.mode = 'AC'; m.q = q; }
    return m;
  };

  /* ================= Theorie B – Sinnbilder und Messkategorien ================= */
  defTheory({
    id: 'T16B', ch: 16, title: 'Sinnbilder und Messkategorien', tags: ['messen.geraete', 'messen.sicherheit'],
    visual: [
      { type: 'block', svg: IMG_SINNBILDER, caption: 'Die wichtigsten Sinnbilder, wie sie klein auf dem Skalenfeld eines Zeigerinstruments stehen (eigene Zeichnung).' },
      { type: 'circuit', view: 'bench', caption: 'Werkstatt-Aufbau zur Messkategorie: Ein batteriebetriebener Kreis (CAT I) – hier reicht jedes Multimeter. Miss die Spannung: die Werte sind klein, aber die Regel „Messgeraet muss zur Anlage passen“ gilt immer.',
        layout: { parts: [{ id: 'B1', type: 'battery', value: 12, x: 160, y: 300 }, { id: 'S1', type: 'switch', x: 320, y: 200, props: { closed: true } }, R('R1', 100, 480, 300, 90, { pmax: 2 })], wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'B1.n')] },
        bench: { parts: [{ id: 'B1', x: 240, y: 470 }, { id: 'S1', x: 470, y: 250 }, { id: 'R1', x: 700, y: 450, rot: 90 }] },
        readouts: [{ label: 'U an R1', a: 'R1.a', b: 'R1.b' }, { label: 'I durch R1', sel: 'R1', q: 'i' }] }
    ],
    lesson:
      '<p>Auf dem Skalenfeld eines Zeigerinstruments stehen kleine <b>Sinnbilder</b>. Sie sagen dir, wie das Geraet gebaut ist, wie es liegen muss und wie genau es ist – lies sie, bevor du misst.</p>' +
      '{{visual}}' +
      '<table class="tt"><tr><th>Sinnbild</th><th>Bedeutung</th><th>Folge fuers Messen</th></tr>' +
      '<tr><td>Gebrauchslage senkrecht / waagrecht / 60°</td><td>Lage, fuer die das Messwerk justiert ist</td><td>Falsche Lage → Anzeigefehler durch Lagerreibung und Schwerkraft</td></tr>' +
      '<tr><td>Stern mit Zahl (z. B. 2)</td><td>Pruefspannung der Isolation in kV</td><td>Bis zu dieser Spannung ist das Gehaeuse sicher isoliert</td></tr>' +
      '<tr><td>Zahl 0,5 / 1,5 / 2,5</td><td>Genauigkeitsklasse in % vom Skalenendwert</td><td>Fehler ist ueber die ganze Skala gleich gross – oben ablesen!</td></tr>' +
      '<tr><td>Drehspul- / Dreheisen-Symbol</td><td>Art des Messwerks</td><td>Drehspul: Mittelwert (mit Gleichrichter AVG), Dreheisen: Effektivwert</td></tr>' +
      '<tr><td>—, ~, ≃</td><td>Gleichstrom, Wechselstrom, beides</td><td>Nie ein DC-Instrument an Wechselstrom (zeigt 0 und kann Schaden nehmen)</td></tr></table>' +
      '<p><b>Messkategorien (CAT).</b> Sie sagen, <i>wo im Niederspannungsnetz</i> (AC bis 1000 V, DC bis 1500 V) ein Messgeraet eingesetzt werden darf. Je naeher an der Einspeisung, desto hoeher die moegliche Kurzschlussenergie und desto gefaehrlicher ein Fehler – Stossspannungen aus dem Netz sind dort am groessten. Das Geraet muss fuer die Kategorie des Messorts ausgelegt sein.</p>' +
      '<table class="tt"><tr><th>Kategorie</th><th>Einsatzgebiet</th><th>Beispiele</th></tr>' +
      '<tr><td><b>CAT I</b></td><td>Stromkreise ohne direkte Netzverbindung</td><td>Batteriegeraete, Schutzkleinspannung, Elektronik am Netzgeraet – unser Labor</td></tr>' +
      '<tr><td><b>CAT II</b></td><td>Verbraucher am Stecker</td><td>Haushaltsgeraete, tragbare Elektrogeraete, Steckernetzteile</td></tr>' +
      '<tr><td><b>CAT III</b></td><td>Gebaeudeinstallation, fest angeschlossene Verbraucher</td><td>Steckdosen, Verteiler und Schaltschraenke, Backofen, fest eingebaute Motoren</td></tr>' +
      '<tr><td><b>CAT IV</b></td><td>Quelle der Niederspannungsinstallation</td><td>Hausanschluss, Zaehler, Freileitung, Hauptverteiler</td></tr></table>' +
      '<p>Unser Werkbank-Multimeter traegt „600 V CAT III“: gut fuer die Gebaeudeinstallation bis 600 V, nicht fuer den Hausanschluss (CAT IV). Fuer die Batterie- und Generatorversuche im Labor (CAT I) ist es mehr als ausreichend. Wichtig ist neben der Kategorie immer die <b>Spannung</b>: Ein CAT-III-300-V-Geraet darf nicht an 400 V zwischen zwei Aussenleitern.</p>' +
      '{{visual:2}}',
    questions: [
      { q: 'Ein Zeigerinstrument traegt die Zahl 1,5 auf dem Skalenfeld. Was bedeutet sie?', options: ['1,5 kV Pruefspannung', 'Genauigkeitsklasse: ±1,5 % vom Skalenendwert', '1,5 A Nennstrom', 'Innenwiderstand 1,5 kΩ'], correct: 1, explain: 'Die Klasse gibt den Fehler in Prozent vom Endwert an – ueber die ganze Skala gleich gross.' },
      { q: 'Was sagt der Stern mit der Zahl 2?', options: ['Klasse 2', '2 kV Pruefspannung der Isolation', '2 Messwerke', 'Gebrauchslage 2 (schraeg)'], correct: 1, explain: 'Der Stern steht fuer die Pruefspannung in Kilovolt.' },
      { q: 'Wo misst du in Messkategorie CAT IV?', options: ['An einer Batterie', 'An einem Haushaltsgeraet am Stecker', 'An der Steckdose', 'Am Hausanschluss oder Zaehler'], correct: 3, explain: 'CAT IV ist die Quelle der Niederspannungsinstallation: Hausanschluss, Zaehler, Freileitung.' },
      { q: 'Welcher Kategorie gehoeren die Laborversuche mit Batterie und Funktionsgenerator an?', options: ['CAT I', 'CAT II', 'CAT III', 'CAT IV'], correct: 0, explain: 'Stromkreise ohne direkte Netzverbindung sind CAT I.' },
      { q: 'Ein Instrument ist fuer Gebrauchslage waagrecht justiert. Du haeltst es senkrecht. Was passiert?', options: ['Nichts, die Lage spielt keine Rolle', 'Ein Anzeigefehler durch Lagerreibung und Schwerkraft', 'Es misst den Effektivwert statt des Mittelwerts', 'Die Sicherung loest aus'], correct: 1, explain: 'Die Gebrauchslage gehoert zu den Anzeigefehlern – sie ist Teil der Genauigkeitsangabe.' }
    ]
  });

  /* ================= Aufgaben 4–5 ================= */
  var mixL = { parts: [gen({ offset: 3 }, 5), R('R1', 1000, 440, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  var rmsSine = 5 / Math.SQRT2, rmsSq = 5;

  var lp = { parts: [gen(), R('R1', 10000, 320, 200, 0), { id: 'C1', type: 'capacitor', value: 100e-9, x: 480, y: 300, rot: 90 }], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] };
  var F = function (id, f) { return { id: id, ask: 'U_a TRMS bei ' + (f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz'), unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'C1.b', tol: 0.05, set: { G1: { freq: f } } }; };

  /* ================= Theorie C – Genauigkeit vertieft ================= */
  var pMeas = { parts: [{ id: 'B1', type: 'battery', value: 12, x: 160, y: 300 }, { id: 'A1', type: 'ammeter', x: 320, y: 200 }, R('R1', 1000, 480, 300, 90)], wires: [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n')] };
  defTheory({
    id: 'T16C', ch: 16, title: 'Genauigkeit vertieft', tags: ['messen.genauigkeit', 'messen.systemfehler'],
    visual: [
      { type: 'numberSteps', caption: 'Rechenweg fuer analoge und digitale Genauigkeit – Schritt fuer Schritt.', steps: [
        { text: 'Analog: Klasse 0,5, Skalenendwert 20 V, Zeiger bei 15 V. Der Fehler bezieht sich auf den Endwert.', rows: [{ label: 'Endwert', cells: ['20', 'V'] }, { label: 'Klasse', cells: ['0,5', '%'] }] },
        { text: 'Fehler = 20 V · 0,5 / 100 = ±0,1 V – gleich gross, egal wo der Zeiger steht.', rows: [{ label: 'Fehler', cells: ['±0,1', 'V'], hl: [0] }, { label: 'Bereich', cells: ['14,9', '…', '15,1', 'V'] }] },
        { text: 'Digital: Anzeige 15,0 V, Angabe ±(0,5 % + 1 Digit). Erster Anteil: Prozent vom Anzeigewert.', rows: [{ label: '0,5 % von 15,0 V', cells: ['0,075', 'V'], hl: [0] }] },
        { text: 'Zweiter Anteil: 1 Digit = eine Stelle der letzten Anzeigeziffer, hier 0,1 V.', rows: [{ label: '1 Digit', cells: ['0,1', 'V'], hl: [0] }] },
        { text: 'Beide Anteile addieren: ±0,175 V. Der wahre Wert liegt zwischen 14,825 V und 15,175 V.', rows: [{ label: 'Fehler gesamt', cells: ['±0,175', 'V'], hl: [0] }, { label: 'Bereich', cells: ['14,825', '…', '15,175', 'V'] }] }
      ] },
      { type: 'circuit', view: 'bench', caption: 'Werkstatt-Aufbau zum Systemfehler: Das Amperemeter A1 liegt in Reihe; wird die Spannung parallel zu R1 gemessen, fliesst der Voltmeterstrom zusaetzlich durch A1. Zieh an R1 – je groesser R1, desto groesser der Anteil des Voltmeterstroms (10 MΩ).',
        layout: pMeas, bench: { parts: [{ id: 'B1', x: 240, y: 470 }, { id: 'A1', x: 480, y: 280 }, { id: 'R1', x: 720, y: 460, rot: 90 }] },
        sliders: [{ part: 'R1', prop: 'value', label: 'R1', min: 1000, max: 10e6, log: true, unit: 'Ω', round: 2 }],
        readouts: [{ label: 'A1 (Strom durch R1 + Voltmeter)', sel: 'A1', q: 'i' }, { label: 'Strom durch R1 allein', sel: 'R1', q: 'i' }, { label: 'U an R1 (Voltmeter parallel)', a: 'R1.a', b: 'R1.b' }] }
    ],
    lesson:
      '<p>Jede Messung hat einen Fehler. In Theorie 4B hast du die Arten kennengelernt – hier rechnen wir sie <b>genau</b> aus, so wie es Datenblaetter verlangen.</p>' +
      '<p><b>Analoge Geraete</b> geben eine <b>Genauigkeitsklasse</b> in Prozent an. Sie bezieht sich auf den <b>Skalenendwert</b>, nicht auf den Anzeigewert:</p>' +
      '<div class="formula">Fehler = Klasse (%) · Endwert / 100</div>' +
      '<p>Beispiel: Klasse 0,5, Endwert 20 V → ±0,1 V. Bei 15 V Anzeige sind das 0,67 %, bei 2 V Anzeige aber schon 5 %! Darum den Messbereich so waehlen, dass der Zeiger <b>im oberen Drittel</b> steht.</p>' +
      '{{visual}}' +
      '<p><b>Digitale Geraete</b> haben zwei Fehleranteile: einen Anteil in Prozent <b>vom Anzeigewert</b> und den <b>Digit-Fehler</b> – die letzte Stelle kann um eins daneben liegen, weil das Geraet runden muss:</p>' +
      '<div class="formula">Fehler = Anzeige · p / 100 + n · (Wert der letzten Stelle)</div>' +
      '<p>Beispiel: 15,0 V bei ±(0,5 % + 1 Digit) → 0,075 V + 0,1 V = <b>±0,175 V</b>. Der Digit-Fehler haengt vom <b>Messbereich</b> ab: im 20-V-Bereich (Anzeige 15,00 V) ist 1 Digit nur 0,01 V, im 600-V-Bereich (Anzeige 15,0 V) 0,1 V. Auch beim Digitalgeraet lohnt sich also der <b>kleinste passende Bereich</b> – genau das uebst du mit der Bereichswahl auf der Werkbank. Zu klein gewaehlt zeigt das Geraet <b>OL</b>.</p>' +
      '<p><b>Systemfehler durch Eigenverbrauch.</b> Das Voltmeter hat einen Innenwiderstand (unser Multimeter 10 MΩ), das Amperemeter einen Shunt (0,1 Ω). Soll die <b>Leistung</b> P = U·I an einem Verbraucher bestimmt werden, liegen beide gleichzeitig in der Schaltung:</p>' +
      '<ul><li><b>Spannungsrichtig</b> (Voltmeter direkt am Verbraucher, Amperemeter davor): U stimmt, aber das Amperemeter misst den Voltmeterstrom U/10 MΩ mit. Bei 12 V sind das 1,2 µA – bei einem 1-kΩ-Verbraucher (12 mA) egal, bei 10 MΩ (1,2 µA) ein Fehler von 100 %.</li>' +
      '<li><b>Stromrichtig</b> (Amperemeter direkt am Verbraucher, Voltmeter ueber beide): I stimmt, aber das Voltmeter misst den Spannungsabfall am Shunt mit (I · 0,1 Ω). Bei 1 A sind das 0,1 V – bei 10 Ω Verbraucher 1 % Fehler.</li></ul>' +
      '<p>Faustregel: <b>kleine Widerstaende spannungsrichtig, grosse Widerstaende stromrichtig</b> messen – oder den Eigenverbrauch herausrechnen.</p>' +
      '{{visual:2}}',
    questions: [
      { q: 'Analoges Voltmeter, Klasse 1,5, Endwert 300 V, Zeiger bei 230 V. Groesster Fehler?', options: ['±1,15 V', '±3,45 V', '±4,5 V', '±15 V'], correct: 2, explain: '1,5 % vom Endwert 300 V = 4,5 V – unabhaengig vom Anzeigewert.' },
      { q: 'Digitales Voltmeter, Anzeige 230,0 V, ±(0,5 % + 1 Digit). Groesster Fehler?', options: ['±1,15 V', '±1,25 V', '±2,3 V', '±0,1 V'], correct: 1, explain: '0,5 % von 230 V = 1,15 V, dazu 1 Digit = 0,1 V → 1,25 V.' },
      { q: 'Warum soll der Zeiger eines analogen Instruments im oberen Drittel stehen?', options: ['Weil die Skala dort feiner ist', 'Weil der Klassenfehler absolut gleich bleibt und relativ kleiner wird', 'Weil das Messwerk sonst zu warm wird', 'Weil unten der Gleichrichter nicht arbeitet'], correct: 1, explain: '±0,1 V sind bei 15 V nur 0,67 %, bei 2 V aber 5 %.' },
      { q: 'Welche Rolle spielt der Messbereich beim Digit-Fehler?', options: ['Keine', 'Im kleineren Bereich ist 1 Digit weniger wert – der Fehler sinkt', 'Im kleineren Bereich ist der Fehler groesser', 'Der Digit-Fehler gilt nur bei AUTO'], correct: 1, explain: '20-V-Bereich: 1 Digit = 0,01 V; 600-V-Bereich: 1 Digit = 0,1 V.' },
      { q: 'Spannungsrichtige Leistungsmessung an 10 MΩ mit einem 10-MΩ-Voltmeter: Was misst das Amperemeter?', options: ['Nur den Verbraucherstrom', 'Den doppelten Verbraucherstrom (Voltmeterstrom kommt dazu)', 'Nichts', 'Den Strom des Shunts'], correct: 1, explain: 'Voltmeter und Verbraucher sind gleich gross – beide Stroeme sind gleich, das Amperemeter zeigt das Doppelte.' }
    ]
  });

  /* ================= Aufgaben 6–8 ================= */
  var half = { parts: [gen(), d('V1', 280, 200, 0), R('R1', 1000, 460, 300, 90)], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
  var bHalf = { parts: [bG1, { id: 'V1', x: 480, y: 260, rot: 0 }, { id: 'R1', x: 700, y: 450, rot: 90 }] };

  var bridgeC = { parts: [gen(), d('V1', 280, 200, 0), d('V2', 280, 400, 0), d('V3', 540, 200, 180), d('V4', 540, 400, 180), R('R1', 1000, 640, 300, 90),
    { id: 'S1', type: 'switch', x: 760, y: 200, rot: 0, props: { closed: false } }, { id: 'C1', type: 'capacitor', value: 10e-6, x: 840, y: 300, rot: 90 }],
    wires: [W('G1.p', 'V1.a'), W('G1.p', 'V3.k'), W('G1.n', 'V2.a'), W('G1.n', 'V4.k'), W('V1.k', 'R1.a'), W('V2.k', 'R1.a'), W('V3.a', 'R1.b'), W('V4.a', 'R1.b'), W('R1.a', 'S1.a'), W('S1.b', 'C1.a'), W('C1.b', 'R1.b')] };
  var bBridge = { parts: [bG1, { id: 'V1', x: 430, y: 250, rot: 0 }, { id: 'V2', x: 430, y: 640, rot: 0 }, { id: 'V3', x: 600, y: 250, rot: 180 }, { id: 'V4', x: 600, y: 640, rot: 180 }, { id: 'R1', x: 730, y: 450, rot: 90 }, { id: 'S1', x: 850, y: 250, rot: 0 }, { id: 'C1', x: 850, y: 450, rot: 90 }] };
  var B = function (id, ask, q, withC, tol) { var m = { id: id, ask: ask, unit: 'V', a: 'R1.a', b: 'R1.b', tol: tol || 0.05, set: { S1: { closed: !!withC } } }; if (q === 'rms') { m.mode = 'VAC'; m.meterType = 'trms'; } else { m.mode = 'AC'; m.q = q; } return m; };

  var shunt = { parts: [gen(), d('V1', 280, 200, 0), d('V2', 280, 400, 0), d('V3', 540, 200, 180), d('V4', 540, 400, 180), R('R1', 1000, 640, 260, 90), R('R2', 10, 640, 400, 90)],
    wires: [W('G1.p', 'V1.a'), W('G1.p', 'V3.k'), W('G1.n', 'V2.a'), W('G1.n', 'V4.k'), W('V1.k', 'R1.a'), W('V2.k', 'R1.a'), W('R1.b', 'R2.a'), W('V3.a', 'R2.b'), W('V4.a', 'R2.b')] };
  var bShunt = { parts: [bG1, { id: 'V1', x: 450, y: 250, rot: 0 }, { id: 'V2', x: 450, y: 640, rot: 0 }, { id: 'V3', x: 640, y: 250, rot: 180 }, { id: 'V4', x: 640, y: 640, rot: 180 }, { id: 'R1', x: 800, y: 340, rot: 90 }, { id: 'R2', x: 800, y: 560, rot: 90 }] };

  /* Rechenwerte, die von der Simulation abhaengen: einmal beim Laden aus der Engine holen (gleiche Zahlen wie die Messungen) */
  var ROOT = typeof window !== "undefined" ? window : globalThis, E = ROOT.DQEngine, DQR = ROOT.DQ;
  if (E && E.acMeasure && DQR.byId['16.6']) {
    var h = E.acMeasure(half, { a: 'R1.a', b: 'R1.b' }), s = E.acMeasure(shunt, { a: 'R2.a', b: 'R2.b' });
    DQR.byId["16.6"].measure.forEach(function (m) { if (m.value === 'rms2') m.value = Math.sqrt(h.dc * h.dc + h.rms * h.rms); });
    DQR.byId["16.8"].measure.forEach(function (m) { if (m.value === 'idc') m.value = s.dc / 10; if (m.value === 'ipk') m.value = s.peak / 10; });
  }
})();

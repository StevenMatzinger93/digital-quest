/* Kapitel 16 – Messtechnik-Erweiterung (Vertiefung zu Kapitel 3 und 4)
 * Quelle (nur fachlich, keine Bilder): Messtechnik Erweiterung (Kap. 2.1/2.2 Drehspul-/Dreheisenmesswerk, 2.3 Sinnbilder,
 * 2.5 Strommesszange, 3 Messkategorien, 5 Genauigkeit/Systemfehler, 6 Messaufgaben). Alle Bilder sind eigene SVG-Zeichnungen.
 * Alle Aufgaben nutzen die neue Werkbank-Bedienung (measureUX 'drag': Spitzen ziehen, eigener Tastkopf, Messbereich von Hand).
 * Plan: docs/PLAN_MESSTECHNIK_ERWEITERUNG.md, Teil B. */
(function () {
  'use strict';

  defChapter({
    id: 16, title: 'Messtechnik-Erweiterung', after: '4.10',
    intro: 'Analoge Messwerke, Sinnbilder auf dem Skalenfeld, Messkategorien und die genaue Rechnung mit Messfehlern. Auf der Werkbank ziehst du die Messspitzen selbst an die Buchsen, schliesst den Tastkopf des Oszilloskops an und wählst den Messbereich von Hand.',
    sequence: ['T16A', '16.1', '16.2', '16.3', 'T16B', '16.4', '16.5', 'T16C', '16.6', '16.7', '16.8', '16.9']
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
    '<text x="470" y="130" fill="#e8e8e8" font-size="12">Strom durch die Spule →</text><text x="470" y="148" fill="#e8e8e8" font-size="12">Magnetfeld → Drehmoment,</text><text x="470" y="166" fill="#e8e8e8" font-size="12">Feder hält dagegen.</text>' +
    '<text x="470" y="200" fill="#1ec8e0" font-size="12" font-weight="700">DC: linearer Mittelwert</text><text x="470" y="218" fill="#1ec8e0" font-size="12" font-weight="700">AC: Gleichrichtwert</text><text x="470" y="236" fill="#9aa" font-size="11">(mit Gleichrichter, Skala × 1,11)</text>');
  var IMG_DREHEISEN = SVG(700, 300,
    '<text x="20" y="30" fill="#ffb000" font-size="15" font-weight="700">Dreheisenmesswerk</text>' +
    // feste Spule (Stator)
    '<rect x="150" y="110" width="210" height="120" rx="10" fill="none" stroke="#e0b400" stroke-width="9" stroke-dasharray="14 5"/><text x="150" y="255" fill="#e0b400" font-size="11">feste Spule (Stator), vom Messstrom durchflossen</text>' +
    // zwei Weicheisenplaettchen: fest und beweglich (stossen sich ab)
    '<path d="M200 130v80h14v-80z" fill="#8d9296"/><text x="150" y="275" fill="#9aa" font-size="11">graues Plättchen fest, helles beweglich mit Zeiger – sie stossen sich ab</text>' +
    '<path d="M262 132v78h14v-78z" fill="#cfd2d4" transform="rotate(-18 255 172)"/>' +
    '<path d="M222 172h30" stroke="#ff8c00" stroke-width="2"/>' +
    scale(255, 172, 150, 40, 'I') +
    '<text x="470" y="130" fill="#e8e8e8" font-size="12">Beide Plättchen werden</text><text x="470" y="148" fill="#e8e8e8" font-size="12">gleichsinnig magnetisiert</text><text x="470" y="166" fill="#e8e8e8" font-size="12">und stossen sich ab –</text><text x="470" y="184" fill="#e8e8e8" font-size="12">egal, in welche Richtung</text><text x="470" y="202" fill="#e8e8e8" font-size="12">der Strom fliesst.</text>' +
    '<text x="470" y="236" fill="#1ec8e0" font-size="12" font-weight="700">AC und DC: Effektivwert</text><text x="470" y="254" fill="#9aa" font-size="11">(Kraft ~ I², Skala nicht linear)</text>');
  // Strommesszange (Feedback 01.10.2026): Zange quer zum Leiter in leichter Perspektive, Magnetfeld als koaxiale Ellipsen um den Leiter,
  // Strompfeil, genau ein Leiter in der Zange; rechts das Gegenbeispiel Hin- und Rückleiter zusammen → 0.
  var IMG_ZANGE = SVG(700, 250,
    '<defs><linearGradient id="zgBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset="1" stop-color="#23272c"/></linearGradient>' +
    '<linearGradient id="zgJaw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e969e"/><stop offset=".5" stop-color="#d7dce0"/><stop offset="1" stop-color="#5d6469"/></linearGradient></defs>' +
    '<text x="20" y="28" fill="#ffb000" font-size="15" font-weight="700">Strommesszange – Strom messen ohne Auftrennen</text>' +
    // Leiter mit Strompfeil
    '<path d="M40 128h420" stroke="#2a6fdb" stroke-width="11" stroke-linecap="round"/><path d="M40 124h420" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
    '<path d="M330 118l26 10-26 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><text x="300" y="104" fill="#e8e8e8" font-size="12" font-weight="700">I</text>' +
    '<text x="44" y="112" fill="#9aa" font-size="11">nur ein Leiter – nicht aufgetrennt</text>' +
    // Magnetfeld: koaxiale Ellipsen quer zum Leiter (Feldlinien liegen in Ebenen senkrecht zum Leiter)
    '<ellipse cx="200" cy="128" rx="13" ry="60" fill="none" stroke="#1ec8e0" stroke-width="1.3" stroke-dasharray="4 5"/>' +
    '<ellipse cx="200" cy="128" rx="18" ry="82" fill="none" stroke="#1ec8e0" stroke-width="1.1" stroke-dasharray="3 6" opacity=".6"/>' +
    '<path d="M213 68l-6-7M213 68l-8 2" fill="none" stroke="#1ec8e0" stroke-width="1.3"/><text x="222" y="60" fill="#1ec8e0" font-size="11">Magnetfeld B um den Leiter</text>' +
    // Zange: Backen als Ring quer zum Leiter (Ellipse), Gelenk unten, Griff mit Anzeige
    '<ellipse cx="200" cy="128" rx="11" ry="46" fill="none" stroke="url(#zgJaw)" stroke-width="13"/><ellipse cx="200" cy="128" rx="11" ry="46" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1"/>' +
    '<path d="M200 82q3-3 6 0" fill="none" stroke="#111" stroke-width="2"/>' + // Backenspalt oben
    '<rect x="186" y="170" width="28" height="18" rx="3" fill="#3a3f47" stroke="#111"/>' +
    '<path d="M188 188q12 46 12 52h22q-6-6 8-52z" fill="url(#zgBody)" stroke="#111"/>' +
    '<rect x="150" y="160" width="36" height="22" rx="4" fill="#b9c6a2" stroke="#1b2413"/><text x="155" y="175" fill="#1b2413" font-size="11" font-family="monospace" font-weight="700">2.34A</text>' +
    '<text x="110" y="206" fill="#e8e8e8" font-size="12">Das Feld des Leiters induziert in der</text><text x="110" y="222" fill="#e8e8e8" font-size="12">Zangenspule einen proportionalen Strom</text><text x="110" y="238" fill="#9aa" font-size="11">(Wechselstrom: Induktion · Gleichstrom: Hall-Sensor).</text>' +
    // Gegenbeispiel rechts: Hin- und Rueckleiter zusammen in der Zange → Felder heben sich auf
    '<g transform="translate(500 0)"><text x="20" y="104" fill="#9aa" font-size="11">Hin- und Rückleiter zusammen:</text>' +
    '<path d="M20 122h160" stroke="#2a6fdb" stroke-width="8" stroke-linecap="round"/><path d="M20 136h160" stroke="#8a4a12" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M120 118l12 4-12 4" fill="none" stroke="#fff" stroke-width="2"/><path d="M80 132l-12 4 12 4" fill="none" stroke="#fff" stroke-width="2"/>' +
    '<ellipse cx="100" cy="129" rx="9" ry="34" fill="none" stroke="url(#zgJaw)" stroke-width="10"/>' +
    '<rect x="88" y="166" width="24" height="14" rx="3" fill="#3a3f47" stroke="#111"/><path d="M90 180q10 30 10 36h14q-4-6 6-36z" fill="url(#zgBody)" stroke="#111"/>' +
    '<rect x="118" y="160" width="40" height="20" rx="4" fill="#b9c6a2" stroke="#1b2413"/><text x="124" y="174" fill="#1b2413" font-size="11" font-family="monospace" font-weight="700">0.00A</text>' +
    '<text x="20" y="206" fill="#e8e8e8" font-size="12">Die Felder heben sich auf – Anzeige 0.</text></g>');
  var sym = function (x, y, inner, label) { return '<g transform="translate(' + x + ' ' + y + ')"><rect x="0" y="0" width="124" height="64" rx="6" fill="#1e2228" stroke="#3a3f47"/><g transform="translate(62 26)" fill="none" stroke="#e8e8e8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g><text x="62" y="58" fill="#9aa" font-size="8.5" text-anchor="middle">' + label + '</text></g>'; };
  var IMG_SINNBILDER = SVG(700, 260,
    '<text x="20" y="26" fill="#ffb000" font-size="15" font-weight="700">Sinnbilder auf dem Skalenfeld</text>' +
    sym(20, 40, '<path d="M-10 10V-10M10 10V-10M-14 10h28"/>', 'Gebrauchslage senkrecht') +
    sym(152, 40, '<path d="M-14 6h28M-8 6V-4h16v10"/>', 'Gebrauchslage waagrecht') +
    sym(284, 40, '<path d="M-14 8h26M-14 8l20-14"/><text x="-2" y="-6" fill="#e8e8e8" font-size="8" stroke="none">60°</text>', 'Gebrauchslage schräg 60°') +
    sym(416, 40, '<path d="M0-13l4 9 9 1-6.5 6 1.5 9-8-4.5-8 4.5 1.5-9-6.5-6 9-1z"/><text x="0" y="3" fill="#e8e8e8" font-size="8" text-anchor="middle" stroke="none">2</text>', 'Prüfspannung 2 kV') +
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
    merksatz: 'Drehspulmesswerk: Drehmoment ~ I, lineare Skala, zeigt den Mittelwert (mit Gleichrichter den Gleichrichtwert, AVG); Dreheisenmesswerk: Kraft ~ I², gestauchte Skala, zeigt bei AC und DC den Effektivwert.',
    visual: [
      { type: 'block', svg: IMG_DREHSPUL, caption: 'Drehspulmesswerk: Dauermagnet aussen, die Spule dreht sich im Feld. Der Zeiger folgt dem Mittelwert des Stroms.' },
      { type: 'block', svg: IMG_DREHEISEN, collapsed: 'Bild einblenden: Dreheisenmesswerk', caption: 'Dreheisenmesswerk: feste Spule, zwei Eisenplättchen stossen sich ab – die Kraft hängt vom Quadrat des Stroms ab, der Zeiger zeigt den Effektivwert.' },
      { type: 'meterwork', imax: 10, signal: 'dc', caption: 'Beide Messwerke am selben Strom: Regler ziehen und die Zeiger vergleichen (linear gegen quadratisch). Dämpfung ausschalten und „Sprung“ drücken – der Zeiger schwingt über. Bei Wechselstrom läuft oben der Momentanwert, die Zeiger pendeln sich auf Gleichrichtwert × 1,11 (Drehspul mit Gleichrichter) bzw. Effektivwert (Dreheisen) ein – das AVG-Prinzip aus Theorie 3B.',
        predict: { q: 'Der Generator liefert eine <b>Dreieckspannung</b> mit Î = 10 mA Spitzenstrom. Welches Instrument zeigt den <b>höheren</b> Wert an?', options: ['Drehspulmesswerk mit Gleichrichter (AVG-Skala)', 'Dreheisenmesswerk (Effektivwert)', 'Beide zeigen dasselbe'], correct: 1, signal: 'triangle',
          explain: 'Beim Dreieck ist der Gleichrichtwert 0,5·Î, mit Formfaktor 1,11 zeigt die AVG-Skala 5,55 mA; der echte Effektivwert ist Î/√3 = 5,77 mA. Das Dreheisenwerk misst ihn direkt – nur beim Sinus stimmen beide überein.' } },
      { type: 'circuit', view: 'bench', collapsed: 'Werkstatt-Aufbau einblenden: Sinus, Rechteck, Dreieck am Multimeter', caption: 'Werkstatt-Aufbau: Derselbe Strom durch R1, einmal als Sinus, einmal als Rechteck. Vergleiche, was ein Drehspulgerät mit Gleichrichter (AVG-Anzeige) und ein Dreheisengerät (Effektivwert) anzeigen würden – und den Gleichanteil, den ein Drehspulgerät ohne Gleichrichter zeigt.',
        layout: { parts: [gen(), R('R1', 1000, 440, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] },
        bench: { parts: [{ id: 'G1', x: 250, y: 440 }, { id: 'R1', x: 640, y: 440, rot: 90 }] },
        sliders: [{ part: 'G1', prop: 'shape', label: 'Kurvenform', choices: [{ value: 'sine', label: 'Sinus' }, { value: 'square', label: 'Rechteck' }, { value: 'triangle', label: 'Dreieck' }] }, { part: 'G1', prop: 'offset', label: 'Gleichanteil', min: 0, max: 5, step: 0.5, unit: 'V' }],
        readouts: [{ label: 'Drehspul ohne Gleichrichter (Mittelwert)', a: 'R1.a', b: 'R1.b', ac: 'dc' }, { label: 'Drehspul mit Gleichrichter (AVG-Anzeige)', a: 'R1.a', b: 'R1.b', ac: 'avg' }, { label: 'Dreheisen / TRMS (Effektivwert des Wechselanteils)', a: 'R1.a', b: 'R1.b', ac: 'rms' }],
        scope: { a: 'R1.a', b: 'R1.b', span: 0.04, label: 'U an R1' } },
      { type: 'block', svg: IMG_ZANGE, collapsed: 'Bild einblenden: Strommesszange', caption: 'Strommesszange: misst ohne Auftrennen über das Magnetfeld des Leiters – links ein Leiter, rechts Hin- und Rückleiter zusammen (Anzeige 0).' }
    ],
    lesson:
      '<p>Vor dem Digitalmultimeter gab es das <b>Zeigerinstrument</b> – in Schaltschränken und an Netzgeräten hängt es noch heute. Zwei Messwerke musst du kennen, weil sie bei Wechselgrössen <i>Verschiedenes</i> anzeigen.</p>' +
      '{{visual}}' +
      '<p><b>Drehspulmesswerk.</b> Ein Dauermagnet steht fest, eine Spule dreht sich darin gegen eine Spiralfeder. Das Antriebsmoment ist <b>proportional zum Strom</b> (M = k₁ · I), das Federmoment proportional zum Winkel (M = D · φ). Wo beide gleich sind, steht der Zeiger: φ = (k₁/D) · I – <b>lineare Skala</b>. Bei Wechselstrom wechselt das Moment mit der Stromrichtung, der Zeiger zeigt den <b>Mittelwert</b> (reiner Wechselstrom: 0). Erst ein eingebauter <b>Gleichrichter</b> macht ein Wechselstrominstrument daraus: Es zeigt den Gleichrichtwert, die Skala ist mit dem Formfaktor 1,11 auf den Sinus umgerechnet – das AVG-Prinzip aus Theorie 3B.</p>' +
      '{{visual:2}}' +
      '<p><b>Dreheisenmesswerk.</b> Die Spule steht fest, zwei <b>Weicheisenplättchen</b> werden vom Strom gleichsinnig magnetisiert und stossen sich ab. Beide Magnetisierungen wachsen mit I, die Kraft also mit <b>I²</b> (M = k₂ · I²): φ = (k₂/D) · I² – <b>unten gestauchte Skala</b>. Weil I² nie negativ wird, ist die Stromrichtung egal, und der Mittelwert von I² ist das Quadrat des Effektivwerts: Das Dreheisenwerk zeigt bei Gleich- und Wechselstrom den <b>Effektivwert</b>, bei jeder Kurvenform – wie ein TRMS-Gerät. Robust, aber weniger empfindlich.</p>' +
      '{{visual:3}}' +
      '<p><b>Dämpfung.</b> Feder und träge Masse bilden einen Schwinger – ohne Bremse würde der Zeiger überschwingen und pendeln. Drehspulwerke bremsen mit Wirbelströmen im Aluminiumrahmen der Spule, Dreheisenwerke mit einer Luft- oder Ölkammer. Probier in der Animation „ohne Dämpfung“ und „Sprung“.</p>' +
      '<p><b>Merke die Zuordnung</b> – sie erklärt die Tabelle „Messfehler nach Instrumentenwahl“: <b>Drehspul + Gleichrichter = AVG-Verhalten</b> (Sinus richtig, Rechteck ≈ 11 % zu viel, Dreieck ≈ 4 % zu wenig, Mischspannung falsch), <b>Dreheisen = Effektivwert</b> (immer richtig, auch mit Gleichanteil).</p>' +
      '{{visual:4}}' +
      '<p><b>Strommesszange.</b> Sie misst Strom, <i>ohne den Kreis aufzutrennen</i>: Das Magnetfeld des umschlossenen Leiters induziert in der Zangenspule einen proportionalen Strom (Gleichstrom: Hall-Sensor). Nur <b>einen</b> Leiter umschliessen – bei Hin- und Rückleiter zusammen heben sich die Felder auf, die Zange zeigt 0.</p>' +
      '{{visual:5}}' +
      '<details class="zusatz"><summary>Zusatz: Frequenzgrenzen</summary>' +
      '<p>Das Drehspul-Gleichrichterinstrument begrenzt der <b>Gleichrichter</b>: Die Dioden werden mit steigender Frequenz träge, und die Skalenkorrektur mit dem Formfaktor stimmt nur für den Sinus – brauchbar bis einige hundert Hertz, höchstens wenige Kilohertz. Das Dreheisenwerk verliert bei höherer Frequenz durch <b>Wirbelströme im Eisen</b> und die Induktivität der Spule an Anzeige – ein Instrument für 16⅔ bis einige hundert Hertz (Netzfrequenz). Genau das untersuchst du in <b>Aufgabe 16.5 „Frequenz erhöhen“</b>: Multimeter (AVG/TRMS) laufen mit der Frequenz aus dem spezifizierten Bereich, das Oszilloskop zeigt weiter richtig.</p></details>' +
      '<details class="zusatz"><summary>Zusatz: Vergleichstabelle (Eigenverbrauch, Frequenzbereich, Einsatz)</summary>' +
      '<table class="tt"><tr><th></th><th>Drehspulmesswerk</th><th>Dreheisenmesswerk</th></tr>' +
      '<tr><td>Skala</td><td>linear (φ ~ I)</td><td>quadratisch, unten gestaucht (φ ~ I²)</td></tr>' +
      '<tr><td>Anzeige bei AC</td><td>Mittelwert; mit Gleichrichter Gleichrichtwert × 1,11 (nur Sinus richtig)</td><td>Effektivwert, jede Kurvenform</td></tr>' +
      '<tr><td>Eigenverbrauch für Vollausschlag</td><td>klein: etwa 50 µA … 1 mA, ca. 0,1 V</td><td>gross: etwa 0,1 … 1 A bzw. 1 … 3 W (kräftige Spule)</td></tr>' +
      '<tr><td>Frequenzbereich</td><td>DC; mit Gleichrichter bis einige 100 Hz … wenige kHz</td><td>DC und 16⅔ … einige 100 Hz (Netzfrequenz)</td></tr>' +
      '<tr><td>Dämpfung</td><td>Wirbelstrom im Spulenrahmen</td><td>Luft- oder Ölkammer</td></tr>' +
      '<tr><td>Typischer Einsatz</td><td>Vielfachmessgerät, empfindliche Gleichstrommessungen, Mittelwertanzeige</td><td>Schaltschrank- und Netzinstrumente (Effektivwert von Netzstrom/-spannung), robust</td></tr></table></details>',
    questions: [
      { q: 'Was zeigt ein Drehspulmesswerk ohne Gleichrichter bei einem reinen Sinusstrom?', options: ['den Effektivwert', 'den Gleichrichtwert', 'den Scheitelwert', '0 – den linearen Mittelwert'], correct: 3, explain: 'Das Drehmoment wechselt mit der Stromrichtung das Vorzeichen; im Mittel bleibt der Zeiger bei 0.' },
      { q: 'Warum zeigt das Dreheisenmesswerk bei Wechselstrom den Effektivwert?', options: ['Es hat einen eingebauten Gleichrichter', 'Die Abstosskraft der Plättchen hängt vom Quadrat des Stroms ab', 'Die Spule ist drehbar gelagert', 'Es misst nur Gleichstrom'], correct: 1, explain: 'Kraft ~ I²: Die Richtung spielt keine Rolle, der Mittelwert des Quadrats ist der Effektivwert.' },
      { q: 'Ein Drehspulgerät mit Gleichrichter (Skala für Sinus) misst ein Rechteck ±10 V. Was zeigt es ungefähr?', options: ['7,1 V', '10,0 V', '11,1 V', '0 V'], correct: 2, explain: 'Gleichrichtwert 10 V × Formfaktor 1,11 – wie ein AVG-Multimeter, 11 % zu viel.' },
      { q: 'Warum ist die Skala des Dreheisenmesswerks unten gestaucht?', options: ['Weil die Feder unten weicher ist', 'Weil das Antriebsmoment mit I² wächst und die Feder mit φ – also φ ~ I²', 'Weil der Gleichrichter kleine Ströme schluckt', 'Damit man den Nullpunkt besser sieht'], correct: 1, explain: 'Drehmoment-Balance k₂·I² = D·φ: Bei halbem Strom nur ein Viertel des Ausschlags – die ersten Skalenteile rücken zusammen.' },
      { q: 'Eine Strommesszange umschliesst ein Kabel mit Hin- und Rückleiter. Was zeigt sie?', options: ['den doppelten Strom', 'den Strom eines Leiters', 'praktisch 0', 'den Effektivwert der Spannung'], correct: 2, explain: 'Die Magnetfelder von Hin- und Rückleiter heben sich auf – immer nur einen Leiter umschliessen.' }
    ]
  });

  /* ================= Aufgaben 1–3 ================= */
  var load = { parts: [{ id: 'B1', type: 'battery', value: 230, props: { ri: 0.01, imax: 40 }, x: 160, y: 300, rot: 0 }, R('R1', 10, 440, 300, 90, { pmax: 6000 })], wires: [W('B1.p', 'R1.a'), W('R1.b', 'B1.n')] };
  var I1 = 230 / 10.01;
  defTask({
    id: '16.1', ch: 16, title: 'Datenblatt und Systemfehler', tags: ['messen.genauigkeit', 'messen.systemfehler', 'elektro.ohm'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Ein Heizwiderstand von 10 Ω hängt an 230 V. Die Werkmeisterin will wissen, was das Multimeter misst – und wie genau.',
    brief: 'Miss die Spannung an R1 mit dem Multimeter (<b>Bereich 600 V</b> von Hand wählen). Berechne aus Datenblattwerten: Strom I = U/R und Leistung P = U·I. Bestimme den grössten Fehler eines <b>digitalen</b> Voltmeters mit ±(0,5 % + 1 Digit) im 600-V-Bereich (Auflösung 0,1 V) und eines <b>analogen</b> Voltmeters der Klasse 1,5 mit Skalenendwert 300 V. Warum darfst du den Strom hier nicht mit dem 10-A-Bereich messen?',
    learn: 'Datenblattwerte rechnen: Prozent vom Anzeigewert + Digit (digital) gegen Prozent vom Skalenendwert (analog).',
    take: 'Digital: 0,5 % von 230 V + 0,1 V = 1,25 V. Analog Klasse 1,5 bei 300 V Endwert: 4,5 V – unabhängig vom Anzeigewert. Und: 23 A sprengen den 10-A-Bereich (Sicherung!).',
    hint: 'Rote Spitze auf R1.a, schwarze auf R1.b ziehen, V⎓ und Bereich 600V. Ein zu kleiner Bereich zeigt OL.',
    hint2: 'I = 230 V / 10 Ω ≈ 23 A; P = 230 V · 23 A ≈ 5,3 kW. Digital: 230 · 0,005 + 0,1 = 1,25 V. Analog: 300 · 0,015 = 4,5 V.',
    palette: [], start: load, ref: load,
    bench: { parts: [{ id: 'B1', x: 240, y: 470 }, { id: 'R1', x: 620, y: 460, rot: 90 }] },
    tests: [{ name: 'Anlage', expect: [{ sel: 'R1', i: [22.5, 23.5] }, { noFault: true }] }],
    measure: [
      { id: 'u', ask: 'Spannung an R1 (V⎓, Bereich 600 V)', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.02 },
      { id: 'i', ask: 'Strom I = U / R (berechnet)', unit: 'A', value: I1, tol: 0.03 },
      { id: 'p', ask: 'Leistung P = U · I (berechnet)', unit: 'W', value: 230 * 10 / 10.01 * I1, tol: 0.04 },
      { id: 'ed', ask: 'Grösster Fehler digital ±(0,5 % + 1 Digit) bei 230 V', unit: 'V', value: digitalErr(230, 600, 0.5, 1), tol: 0.05 },
      { id: 'ea', ask: 'Grösster Fehler analog Klasse 1,5, Endwert 300 V', unit: 'V', value: 4.5, tol: 0.05 }
    ]
  });

  var err = { parts: [{ id: 'B1', type: 'battery', value: 9, x: 160, y: 300, rot: 0 }, { id: 'S1', type: 'switch', x: 320, y: 200, rot: 0, props: { closed: false } }, R('R1', 10, 480, 300, 90, { pmax: 10 }),
    { id: 'S2', type: 'switch', x: 320, y: 420, rot: 0, props: { closed: false } }, R('R3', 10e6, 620, 220, 90), R('R2', 10e6, 620, 380, 90)],
    wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'B1.n'), W('B1.p', 'S2.a'), W('S2.b', 'R3.a'), W('R3.b', 'R2.a'), W('R2.b', 'B1.n')] };
  defTask({
    id: '16.2', ch: 16, title: 'Spannungs- und Strommessfehler', tags: ['messen.systemfehler', 'messen.spannung', 'messen.strom'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Zwei Schaltungen, ein Multimeter: ein kleiner Widerstand (10 Ω) und ein hochohmiger Spannungsteiler (2 × 10 MΩ). Wo fälscht das Messgerät, und wie stark?',
    brief: 'Schliesse <b>S1</b> (Zweig mit R1 = 10 Ω): miss die Spannung an R1 und den Strom durch R1 (Leitung auftrennen, Amperemeter in Reihe, Bereich 10 A). Öffne S1, schliesse <b>S2</b> (Teiler R3–R2, je 10 MΩ): miss die Spannung an R2. Berechne für beide Zweige die Werte <b>ohne</b> Messfehler (an R2 liegt rechnerisch die Hälfte von 9 V) und die Abweichung in Prozent bei R2.',
    learn: 'Das Voltmeter (10 MΩ) belastet hochohmige Schaltungen, der Amperemeter-Shunt (0,1 Ω) stört niederohmige.',
    take: 'Bei 10 Ω stimmt die Spannung, der Shunt kostet 1 % Strom. Im 10-MΩ-Teiler zeigt das Voltmeter statt 4,5 V nur 3 V – 33 % Fehler, weil es selbst 10 MΩ hat. Spannungsrichtig für kleine, stromrichtig für grosse Widerstände.',
    hint: 'Schalter auf der Werkbank anklicken. Spitzen an R1.a/R1.b bzw. R2.a/R2.b ziehen, Bereich 20 V.',
    hint2: 'R2 (10 MΩ) parallel zum Voltmeter (10 MΩ) ergibt 5 MΩ; der Teiler wird 10 MΩ : 5 MΩ – an R2 liegen nur noch 3 V statt 4,5 V. Abweichung: (4,5 − 3) / 4,5 = 33 %.',
    palette: [], start: err, ref: err,
    bench: { parts: [{ id: 'B1', x: 220, y: 470 }, { id: 'S1', x: 450, y: 230 }, { id: 'R1', x: 680, y: 230, rot: 0 }, { id: 'S2', x: 450, y: 640 }, { id: 'R3', x: 640, y: 640, rot: 0 }, { id: 'R2', x: 820, y: 640, rot: 0 }] },
    tests: [{ name: 'R1 am Netz', set: { S1: { closed: true }, S2: { closed: false } }, expect: [{ sel: 'R1', i: [0.88, 0.91] }, { noFault: true }] },
      { name: 'Teiler am Netz', set: { S1: { closed: false }, S2: { closed: true } }, expect: [{ sel: 'R2', v: [4.4, 4.6] }, { noFault: true }] }],
    measure: [
      { id: 'u1', ask: 'Spannung an R1 (S1 zu)', unit: 'V', mode: 'V', a: 'R1.a', b: 'R1.b', set: { S1: { closed: true }, S2: { closed: false } }, tol: 0.03 },
      { id: 'i1', ask: 'Strom durch R1 (S1 zu, Amperemeter in Reihe)', unit: 'mA', mode: 'A', a: 'R1.a', b: 'R1.b', truth: { sel: 'R1', q: 'i' }, set: { S1: { closed: true }, S2: { closed: false } }, tol: 0.04 },
      { id: 'i1c', ask: 'Strom durch R1 ohne Messfehler (berechnet)', unit: 'mA', value: 9 / 10.05, tol: 0.03 },
      { id: 'u2', ask: 'Spannung an R2 angezeigt (S2 zu)', unit: 'V', mode: 'V', a: 'R2.a', b: 'R2.b', set: { S1: { closed: false }, S2: { closed: true } }, tol: 0.03 },
      { id: 'u2c', ask: 'Spannung an R2 ohne Messfehler (berechnet)', unit: 'V', value: 4.5, tol: 0.02 },
      { id: 'dev', ask: 'Abweichung an R2 in Prozent', unit: '%', value: 100 / 3, tol: 0.06 }
    ]
  });

  var wave = { parts: [gen(), R('R1', 1000, 440, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  var bWave = { parts: [bG1, { id: 'R1', x: 660, y: 450, rot: 90 }] };
  var M = function (id, ask, q, shape, extra) { // Ablesung an R1 fuer eine Kurvenform: q 'avg' (V~ AVG) | 'rms' (V~ TRMS) | 'dc' | 'peak' (Oszilloskop)
    var m = { id: id, ask: ask, unit: 'V', a: 'R1.a', b: 'R1.b', tol: 0.04, set: { G1: Object.assign({ shape: shape }, extra || {}) } };
    if (q === 'avg' || q === 'rms') { m.mode = 'VAC'; m.meterType = q === 'avg' ? 'avg' : 'trms'; } else { m.mode = 'AC'; m.q = q; }
    return m;
  };
  defTask({
    id: '16.3', ch: 16, title: 'Kurvenformen im Instrumentenvergleich', tags: ['messen.trms', 'elektro.effektivwert', 'messen.oszilloskop'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Dieselbe Spannung, drei Geräte, drei Kurvenformen: Füll die Vergleichstabelle aus dem Lehrgang – mit echten Messungen.',
    brief: 'Der Generator liefert Û = 10 V, 50 Hz. Miss an R1 für <b>Sinus, Rechteck und Dreieck</b> (Kurvenform im Eigenschaften-Panel umstellen): die Anzeige eines <b>AVG-Multimeters</b> (V~, Verfahren AVG), eines <b>TRMS-Multimeters</b> (V~, TRMS) und den <b>Scheitelwert</b> mit dem Oszilloskop (Tastkopf an R1). Bereich 20 V.',
    learn: 'AVG stimmt nur beim Sinus; TRMS und Oszilloskop zeigen bei jeder Kurvenform das Richtige.',
    take: 'Rechteck: AVG 11,1 V statt 10 V (+11 %). Dreieck: AVG 5,55 V statt 5,77 V (−4 %). Sinus: beide 7,07 V.',
    hint: 'V~ wählen, unter dem Panel zwischen „Mittelwert (AVG)“ und „Echt-Effektivwert (TRMS)“ umschalten. Für Û den Tastkopf ziehen und RUN drücken.',
    hint2: 'Sinus 7,07 V · Rechteck TRMS 10 V, AVG 11,1 V · Dreieck TRMS 5,77 V, AVG 5,55 V. Û ist immer 10 V.',
    palette: [], start: wave, ref: wave, bench: bWave,
    tests: [{ name: 'Anlage', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'peak', range: [9.8, 10.2] }, { noFault: true }] }],
    measure: [
      M('s_avg', 'Sinus: AVG-Gerät (V~ AVG)', 'avg', 'sine'), M('s_rms', 'Sinus: TRMS-Gerät (V~ TRMS)', 'rms', 'sine'), M('s_pk', 'Sinus: Û am Oszilloskop', 'peak', 'sine'),
      M('q_avg', 'Rechteck: AVG-Gerät', 'avg', 'square'), M('q_rms', 'Rechteck: TRMS-Gerät', 'rms', 'square'), M('q_pk', 'Rechteck: Û am Oszilloskop', 'peak', 'square'),
      M('t_avg', 'Dreieck: AVG-Gerät', 'avg', 'triangle'), M('t_rms', 'Dreieck: TRMS-Gerät', 'rms', 'triangle'), M('t_pk', 'Dreieck: Û am Oszilloskop', 'peak', 'triangle')
    ]
  });

  /* ================= Theorie B – Sinnbilder und Messkategorien ================= */
  defTheory({
    id: 'T16B', ch: 16, title: 'Sinnbilder und Messkategorien', tags: ['messen.geraete', 'messen.sicherheit'],
    merksatz: 'Die Sinnbilder auf dem Skalenfeld nennen Gebrauchslage, Prüfspannung, Klasse und Messwerk; die Messkategorie CAT I–IV muss zum Messort passen – je näher an der Einspeisung, desto höher.',
    visual: [
      { type: 'block', svg: IMG_SINNBILDER, caption: 'Die wichtigsten Sinnbilder, wie sie klein auf dem Skalenfeld eines Zeigerinstruments stehen (eigene Zeichnung).' },
      { type: 'circuit', view: 'bench', caption: 'Werkstatt-Aufbau zur Messkategorie: Ein batteriebetriebener Kreis (CAT I) – hier reicht jedes Multimeter. Miss die Spannung: die Werte sind klein, aber die Regel „Messgerät muss zur Anlage passen“ gilt immer.',
        layout: { parts: [{ id: 'B1', type: 'battery', value: 12, x: 160, y: 300 }, { id: 'S1', type: 'switch', x: 320, y: 200, props: { closed: true } }, R('R1', 100, 480, 300, 90, { pmax: 2 })], wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'B1.n')] },
        bench: { parts: [{ id: 'B1', x: 240, y: 470 }, { id: 'S1', x: 470, y: 250 }, { id: 'R1', x: 700, y: 450, rot: 90 }] },
        readouts: [{ label: 'U an R1', a: 'R1.a', b: 'R1.b' }, { label: 'I durch R1', sel: 'R1', q: 'i' }] }
    ],
    lesson:
      '<p>Auf dem Skalenfeld eines Zeigerinstruments stehen kleine <b>Sinnbilder</b>. Sie sagen dir, wie das Gerät gebaut ist, wie es liegen muss und wie genau es ist – lies sie, bevor du misst.</p>' +
      '{{visual}}' +
      '<table class="tt"><tr><th>Sinnbild</th><th>Bedeutung</th><th>Folge fürs Messen</th></tr>' +
      '<tr><td>Gebrauchslage senkrecht / waagrecht / 60°</td><td>Lage, für die das Messwerk justiert ist</td><td>Falsche Lage → Anzeigefehler durch Lagerreibung und Schwerkraft</td></tr>' +
      '<tr><td>Stern mit Zahl (z. B. 2)</td><td>Prüfspannung der Isolation in kV</td><td>Bis zu dieser Spannung ist das Gehäuse sicher isoliert</td></tr>' +
      '<tr><td>Zahl 0,5 / 1,5 / 2,5</td><td>Genauigkeitsklasse in % vom Skalenendwert</td><td>Fehler ist über die ganze Skala gleich gross – oben ablesen!</td></tr>' +
      '<tr><td>Drehspul- / Dreheisen-Symbol</td><td>Art des Messwerks</td><td>Drehspul: Mittelwert (mit Gleichrichter AVG), Dreheisen: Effektivwert</td></tr>' +
      '<tr><td>—, ~, ≃</td><td>Gleichstrom, Wechselstrom, beides</td><td>Nie ein DC-Instrument an Wechselstrom (zeigt 0 und kann Schaden nehmen)</td></tr></table>' +
      '<p><b>Messkategorien (CAT).</b> Sie sagen, <i>wo im Niederspannungsnetz</i> (AC bis 1000 V, DC bis 1500 V) ein Messgerät eingesetzt werden darf. Je näher an der Einspeisung, desto höher die mögliche Kurzschlussenergie und desto gefährlicher ein Fehler – Stossspannungen aus dem Netz sind dort am grössten. Das Gerät muss für die Kategorie des Messorts ausgelegt sein.</p>' +
      '<table class="tt"><tr><th>Kategorie</th><th>Einsatzgebiet</th><th>Beispiele</th></tr>' +
      '<tr><td><b>CAT I</b></td><td>Stromkreise ohne direkte Netzverbindung</td><td>Batteriegeräte, Schutzkleinspannung, Elektronik am Netzgerät – unser Labor</td></tr>' +
      '<tr><td><b>CAT II</b></td><td>Verbraucher am Stecker</td><td>Haushaltsgeräte, tragbare Elektrogeräte, Steckernetzteile</td></tr>' +
      '<tr><td><b>CAT III</b></td><td>Gebäudeinstallation, fest angeschlossene Verbraucher</td><td>Steckdosen, Verteiler und Schaltschränke, Backofen, fest eingebaute Motoren</td></tr>' +
      '<tr><td><b>CAT IV</b></td><td>Quelle der Niederspannungsinstallation</td><td>Hausanschluss, Zähler, Freileitung, Hauptverteiler</td></tr></table>' +
      '<p>Unser Werkbank-Multimeter trägt „600 V CAT III“: gut für die Gebäudeinstallation bis 600 V, nicht für den Hausanschluss (CAT IV). Für die Batterie- und Generatorversuche im Labor (CAT I) ist es mehr als ausreichend. Wichtig ist neben der Kategorie immer die <b>Spannung</b>: Ein CAT-III-300-V-Gerät darf nicht an 400 V zwischen zwei Aussenleitern.</p>' +
      '{{visual:2}}',
    questions: [
      { q: 'Ein Zeigerinstrument trägt die Zahl 1,5 auf dem Skalenfeld. Was bedeutet sie?', options: ['1,5 kV Prüfspannung', 'Genauigkeitsklasse: ±1,5 % vom Skalenendwert', '1,5 A Nennstrom', 'Innenwiderstand 1,5 kΩ'], correct: 1, explain: 'Die Klasse gibt den Fehler in Prozent vom Endwert an – über die ganze Skala gleich gross.' },
      { q: 'Was sagt der Stern mit der Zahl 2?', options: ['Klasse 2', '2 kV Prüfspannung der Isolation', '2 Messwerke', 'Gebrauchslage 2 (schräg)'], correct: 1, explain: 'Der Stern steht für die Prüfspannung in Kilovolt.' },
      { q: 'Wo misst du in Messkategorie CAT IV?', options: ['An einer Batterie', 'An einem Haushaltsgerät am Stecker', 'An der Steckdose', 'Am Hausanschluss oder Zähler'], correct: 3, explain: 'CAT IV ist die Quelle der Niederspannungsinstallation: Hausanschluss, Zähler, Freileitung.' },
      { q: 'Welcher Kategorie gehören die Laborversuche mit Batterie und Funktionsgenerator an?', options: ['CAT I', 'CAT II', 'CAT III', 'CAT IV'], correct: 0, explain: 'Stromkreise ohne direkte Netzverbindung sind CAT I.' },
      { q: 'Ein Instrument ist für Gebrauchslage waagrecht justiert. Du hältst es senkrecht. Was passiert?', options: ['Nichts, die Lage spielt keine Rolle', 'Ein Anzeigefehler durch Lagerreibung und Schwerkraft', 'Es misst den Effektivwert statt des Mittelwerts', 'Die Sicherung löst aus'], correct: 1, explain: 'Die Gebrauchslage gehört zu den Anzeigefehlern – sie ist Teil der Genauigkeitsangabe.' }
    ]
  });

  /* ================= Aufgaben 4–5 ================= */
  var mixL = { parts: [gen({ offset: 3 }, 5), R('R1', 1000, 440, 300, 90)], wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] };
  var rmsSine = 5 / Math.SQRT2, rmsSq = 5;
  defTask({
    id: '16.4', ch: 16, title: 'Wechselgrösse mit Gleichanteil', tags: ['messen.trms', 'elektro.mittelwert', 'elektro.effektivwert'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Aus einem Sensorverstärker kommt ein Sinus, der auf einem Gleichanteil reitet. Welches Gerät zeigt hier was?',
    brief: 'Der Generator liefert Û = 5 V mit <b>3 V Gleichanteil</b>. Miss an R1 mit <b>V⎓</b> (zeigt den Gleichanteil), <b>V~ AVG</b> und <b>V~ TRMS</b> (Wechselanteil) und lies am Oszilloskop den <b>höchsten Wert</b> ab. Berechne den <b>gesamten Effektivwert</b> √(U<sub>DC</sub>² + U<sub>AC</sub>²) – das zeigt nur ein TRMS-Gerät mit AC+DC-Kopplung. Stell danach auf <b>Rechteck</b> um und miss den TRMS-Wechselanteil erneut.',
    learn: 'V~ ist AC-gekoppelt: Der Gleichanteil fällt weg. Nur TRMS mit AC+DC zeigt den wahren Effektivwert einer Mischgrösse.',
    take: 'Sinus + 3 V: U_DC = 3 V, U_AC = 3,54 V → U_ges = 4,64 V. AVG und TRMS stimmen beim Sinus noch überein; beim Rechteck zeigt AVG wieder zu viel.',
    hint: 'V⎓ mit Bereich 20 V zeigt bei schneller Wechselspannung den Mittelwert. Für Û den Tastkopf ziehen und RUN.',
    hint2: 'Höchster Wert = 3 V + 5 V = 8 V. U_ges = √(3² + 3,54²) V = 4,64 V. Rechteck TRMS = 5 V (Û).',
    palette: [], start: mixL, ref: mixL, bench: bWave,
    tests: [{ name: 'Anlage', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [2.9, 3.1] }, { noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'Gleichanteil U_DC (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      M('avg', 'Wechselanteil AVG-Gerät (V~ AVG)', 'avg', 'sine', { offset: 3 }), M('rms', 'Wechselanteil TRMS-Gerät (V~ TRMS)', 'rms', 'sine', { offset: 3 }),
      { id: 'pk', ask: 'Höchster Wert am Oszilloskop', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'ges', ask: 'Gesamter Effektivwert (berechnet)', unit: 'V', value: Math.sqrt(9 + rmsSine * rmsSine), tol: 0.03 },
      M('q_rms', 'Rechteck + 3 V: Wechselanteil TRMS', 'rms', 'square', { offset: 3 })
    ]
  });

  var lp = { parts: [gen(), R('R1', 10000, 320, 200, 0), { id: 'C1', type: 'capacitor', value: 100e-9, x: 480, y: 300, rot: 90 }], wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n')] };
  var F = function (id, f) { return { id: id, ask: 'U_a TRMS bei ' + (f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz'), unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'C1.b', tol: 0.05, set: { G1: { freq: f } } }; };
  defTask({
    id: '16.5', ch: 16, title: 'Frequenz erhöhen', tags: ['elektro.frequenz', 'elektro.filter', 'messen.oszilloskop'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Wie weit kannst du die Frequenz drehen, bis die Geräte nichts Sinnvolles mehr zeigen?',
    brief: 'Am RC-Glied (R1 = 10 kΩ, C1 = 100 nF, f<sub>g</sub> ≈ 159 Hz) miss die Ausgangsspannung an C1 mit <b>V~ TRMS</b> bei <b>50 Hz, 159 Hz, 1 kHz und 10 kHz</b> (Frequenz am Generator umstellen). Lies bei 1 kHz zusätzlich den <b>Scheitelwert</b> am Oszilloskop ab (Zeitbasis 5 ms). Was zeigt <b>V⎓</b> bei jeder Frequenz?',
    learn: 'Ein Multimeter mittelt über viele Perioden – der Gleichanteil bleibt 0, der Wechselanteil folgt dem Frequenzgang. Das Oszilloskop zeigt den Verlauf bis in den MHz-Bereich.',
    take: 'Mit steigender Frequenz sinkt U_a am Tiefpass: 50 Hz ≈ 6,7 V, f_g ≈ 5 V, 1 kHz ≈ 1,1 V, 10 kHz ≈ 0,11 V. Reale Multimeter sind meist nur bis 1 kHz (AVG) bzw. einige kHz (TRMS) spezifiziert – darüber hilft nur das Oszilloskop.',
    hint: 'Frequenz im Eigenschaften-Panel von G1 eintippen (z. B. 1k). Spitzen an C1.a und C1.b, Bereich 20 V; bei 10 kHz auf 2 V wechseln.',
    hint2: 'U_a = U_e / √(1 + (f/f_g)²) mit U_e = 7,07 V. Bei 10 kHz sind es rund 112 mV – im 20-V-Bereich nur noch 0,11 V, im 2-V-Bereich 0,112 V.',
    palette: [], start: lp, ref: lp,
    bench: { parts: [bG1, { id: 'R1', x: 480, y: 260, rot: 0 }, { id: 'C1', x: 700, y: 450, rot: 90 }] },
    tests: [{ name: 'Tiefpass', expect: [{ a: 'C1.a', b: 'C1.b', ac: 'rms', range: [6.4, 7.0] }, { noFault: true }] }],
    measure: [F('f50', 50), F('f159', 159), F('f1k', 1000), F('f10k', 10000),
      { id: 'pk1k', ask: 'Scheitelwert bei 1 kHz (Oszilloskop)', unit: 'V', mode: 'AC', q: 'peak', a: 'C1.a', b: 'C1.b', tol: 0.06, set: { G1: { freq: 1000 } } },
      { id: 'dc', ask: 'V⎓ bei 1 kHz (Gleichanteil)', unit: 'V', mode: 'AC', q: 'dc', a: 'C1.a', b: 'C1.b', tol: 0.5, abs: 0.05, set: { G1: { freq: 1000 } } }]
  });

  /* ================= Theorie C – Genauigkeit vertieft ================= */
  var pMeas = { parts: [{ id: 'B1', type: 'battery', value: 12, x: 160, y: 300 }, { id: 'A1', type: 'ammeter', x: 320, y: 200 }, R('R1', 1000, 480, 300, 90)], wires: [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n')] };
  defTheory({
    id: 'T16C', ch: 16, title: 'Genauigkeit vertieft', tags: ['messen.genauigkeit', 'messen.systemfehler'],
    merksatz: 'Analog: Fehler = Klasse · Endwert (oben ablesen!); digital: Prozent vom Anzeigewert plus Digit, deshalb kleinsten passenden Bereich wählen; Eigenverbrauch der Geräte ist ein Systemfehler.',
    visual: [
      { type: 'numberSteps', caption: 'Rechenweg für analoge und digitale Genauigkeit – Schritt für Schritt.', steps: [
        { text: 'Analog: Klasse 0,5, Skalenendwert 20 V, Zeiger bei 15 V. Der Fehler bezieht sich auf den Endwert.', rows: [{ label: 'Endwert', cells: ['20', 'V'] }, { label: 'Klasse', cells: ['0,5', '%'] }] },
        { text: 'Fehler = 20 V · 0,5 / 100 = ±0,1 V – gleich gross, egal wo der Zeiger steht.', rows: [{ label: 'Fehler', cells: ['±0,1', 'V'], hl: [0] }, { label: 'Bereich', cells: ['14,9', '…', '15,1', 'V'] }] },
        { text: 'Digital: Anzeige 15,0 V, Angabe ±(0,5 % + 1 Digit). Erster Anteil: Prozent vom Anzeigewert.', rows: [{ label: '0,5 % von 15,0 V', cells: ['0,075', 'V'], hl: [0] }] },
        { text: 'Zweiter Anteil: 1 Digit = eine Stelle der letzten Anzeigeziffer, hier 0,1 V.', rows: [{ label: '1 Digit', cells: ['0,1', 'V'], hl: [0] }] },
        { text: 'Beide Anteile addieren: ±0,175 V. Der wahre Wert liegt zwischen 14,825 V und 15,175 V.', rows: [{ label: 'Fehler gesamt', cells: ['±0,175', 'V'], hl: [0] }, { label: 'Bereich', cells: ['14,825', '…', '15,175', 'V'] }] }
      ] },
      { type: 'worked', caption: 'Drei Musterbeispiele: Das erste ist vollständig vorgerechnet, im zweiten rechnest du einen Schritt selbst, im dritten zwei. Komma oder Punkt, Toleranz 2 %.', examples: [
        { title: 'Analog, Klasse', given: [{ label: 'Instrument', value: 'Klasse 1,5' }, { label: 'Endwert', value: '300 V' }, { label: 'Zeiger', value: '230 V' }],
          result: 'Der wahre Wert liegt zwischen 225,5 V und 234,5 V.',
          steps: [
            { text: 'Der Klassenfehler bezieht sich auf den <b>Endwert</b>, nicht auf den Zeigerstand.', label: 'absoluter Fehler', expr: '1,5 % · 300 V', value: 4.5, digits: 1, unit: 'V' },
            { text: 'Wie viel ist das vom abgelesenen Wert? Absoluten Fehler durch den Anzeigewert teilen.', label: 'relativer Fehler', expr: '4,5 V / 230 V', value: 1.96, unit: '%' },
            { text: 'Unteres und oberes Ende des Bereichs, in dem der wahre Wert liegt.', label: 'Bereich', expr: '230 V ∓ 4,5 V', value: 225.5, digits: 1, unit: 'V … 234,5 V' }
          ] },
        { title: 'Digital, % + Digit', given: [{ label: 'Anzeige', value: '12,50 V' }, { label: 'Angabe', value: '±(0,8 % + 2 Digit)' }, { label: 'Bereich', value: '20 V (Auflösung 0,01 V)' }],
          result: 'Gesamtfehler ±0,12 V, das sind 0,96 % vom Anzeigewert.',
          steps: [
            { text: 'Erster Anteil: Prozent <b>vom Anzeigewert</b>.', label: 'Prozentanteil', expr: '0,8 % · 12,50 V', value: 0.1, unit: 'V' },
            { text: 'Zweiter Anteil: 2 Digit. Ein Digit ist der Wert der letzten Anzeigestelle – hier 0,01 V.', label: 'Digitanteil', expr: '2 · 0,01 V', value: 0.02, unit: 'V' },
            { text: 'Jetzt du: Beide Anteile addieren.', label: 'Fehler gesamt', expr: '0,1 V + 0,02 V', value: 0.12, unit: 'V', input: true, help: 'Prozentanteil und Digitanteil zusammenzählen.', solution: 'beide Anteile addiert' }
          ] },
        { title: 'Systemfehler, stromrichtig', given: [{ label: 'Verbraucher', value: 'R = 10 Ω, I = 1 A' }, { label: 'Amperemeter-Shunt', value: '0,1 Ω' }, { label: 'Voltmeter', value: 'über Verbraucher UND Amperemeter' }],
          result: 'Das Voltmeter zeigt 10,1 V statt 10 V – die Leistung wird um 1 % zu gross bestimmt (10,1 W statt 10 W).',
          steps: [
            { text: 'Spannung am Verbraucher selbst (das wäre der richtige Wert).', label: 'U am Verbraucher', expr: '10 Ω · 1 A', value: 10, digits: 1, unit: 'V' },
            { text: 'Jetzt du: Welche Spannung fällt am Shunt des Amperemeters ab? Der ganze Strom fliesst hindurch.', label: 'U am Shunt', expr: '0,1 Ω · 1 A', value: 0.1, unit: 'V', input: true, help: 'Ohmsches Gesetz: U = R · I mit dem Shunt-Widerstand.', solution: 'U = 0,1 Ω · 1 A' },
            { text: 'Das Voltmeter misst beides zusammen.', label: 'Voltmeter zeigt', expr: '10 V + 0,1 V', value: 10.1, digits: 1, unit: 'V' },
            { text: 'Jetzt du: Um wie viel Prozent ist die Anzeige zu gross (bezogen auf den wahren Wert)?', label: 'relativer Fehler', expr: '0,1 V / 10 V', value: 1, digits: 1, unit: '%', input: true, help: 'Fehler durch wahren Wert, mal 100.', solution: '0,1 / 10 = 0,01 = 1 %' }
          ] }
      ] },
      { type: 'circuit', view: 'bench', caption: 'Werkstatt-Aufbau zum Systemfehler: Das Amperemeter A1 liegt in Reihe; wird die Spannung parallel zu R1 gemessen, fliesst der Voltmeterstrom zusätzlich durch A1. Zieh an R1 – je grösser R1, desto grösser der Anteil des Voltmeterstroms (10 MΩ).',
        layout: pMeas, bench: { parts: [{ id: 'B1', x: 240, y: 470 }, { id: 'A1', x: 480, y: 280 }, { id: 'R1', x: 720, y: 460, rot: 90 }] },
        sliders: [{ part: 'R1', prop: 'value', label: 'R1', min: 1000, max: 10e6, log: true, unit: 'Ω', round: 2 }],
        readouts: [{ label: 'A1 (Strom durch R1 + Voltmeter)', sel: 'A1', q: 'i' }, { label: 'Strom durch R1 allein', sel: 'R1', q: 'i' }, { label: 'U an R1 (Voltmeter parallel)', a: 'R1.a', b: 'R1.b' }] }
    ],
    lesson:
      '<p>Jede Messung hat einen Fehler. In Theorie 4B hast du die Arten kennengelernt – hier rechnen wir sie <b>genau</b> aus, so wie es Datenblätter verlangen.</p>' +
      '<p><b>Analoge Geräte</b> geben eine <b>Genauigkeitsklasse</b> in Prozent an. Sie bezieht sich auf den <b>Skalenendwert</b>, nicht auf den Anzeigewert:</p>' +
      '<div class="formula">Fehler = Klasse (%) · Endwert / 100</div>' +
      '<p>Beispiel: Klasse 0,5, Endwert 20 V → ±0,1 V. Bei 15 V Anzeige sind das 0,67 %, bei 2 V Anzeige aber schon 5 %! Darum den Messbereich so wählen, dass der Zeiger <b>im oberen Drittel</b> steht.</p>' +
      '{{visual}}' +
      '<p><b>Digitale Geräte</b> haben zwei Fehleranteile: einen Anteil in Prozent <b>vom Anzeigewert</b> und den <b>Digit-Fehler</b> – die letzte Stelle kann um eins daneben liegen, weil das Gerät runden muss:</p>' +
      '<div class="formula">Fehler = Anzeige · p / 100 + n · (Wert der letzten Stelle)</div>' +
      '<p>Beispiel: 15,0 V bei ±(0,5 % + 1 Digit) → 0,075 V + 0,1 V = <b>±0,175 V</b>. Der Digit-Fehler hängt vom <b>Messbereich</b> ab: im 20-V-Bereich (Anzeige 15,00 V) ist 1 Digit nur 0,01 V, im 600-V-Bereich (Anzeige 15,0 V) 0,1 V. Auch beim Digitalgerät lohnt sich also der <b>kleinste passende Bereich</b> – genau das übst du mit der Bereichswahl auf der Werkbank. Zu klein gewählt zeigt das Gerät <b>OL</b>.</p>' +
      '<p><b>Systemfehler durch Eigenverbrauch.</b> Das Voltmeter hat einen Innenwiderstand (unser Multimeter 10 MΩ), das Amperemeter einen Shunt (0,1 Ω). Soll die <b>Leistung</b> P = U·I an einem Verbraucher bestimmt werden, liegen beide gleichzeitig in der Schaltung:</p>' +
      '<ul><li><b>Spannungsrichtig</b> (Voltmeter direkt am Verbraucher, Amperemeter davor): U stimmt, aber das Amperemeter misst den Voltmeterstrom U/10 MΩ mit. Bei 12 V sind das 1,2 µA – bei einem 1-kΩ-Verbraucher (12 mA) egal, bei 10 MΩ (1,2 µA) ein Fehler von 100 %.</li>' +
      '<li><b>Stromrichtig</b> (Amperemeter direkt am Verbraucher, Voltmeter über beide): I stimmt, aber das Voltmeter misst den Spannungsabfall am Shunt mit (I · 0,1 Ω). Bei 1 A sind das 0,1 V – bei 10 Ω Verbraucher 1 % Fehler.</li></ul>' +
      '<p>Faustregel: <b>kleine Widerstände spannungsrichtig, grosse Widerstände stromrichtig</b> messen – oder den Eigenverbrauch herausrechnen.</p>' +
      '<h3>Rechne mit</h3><p>Drei Beispiele in steigender Selbstständigkeit: Zuerst schaust du zu, dann rechnest du einen Schritt, dann zwei. Das Rechenfeld akzeptiert Komma oder Punkt; der Taschenrechner in der Kopfzeile hilft.</p>' +
      '{{visual:2}}' +
      '<p><b>Grenzfall unten an der Skala.</b> Der absolute Klassenfehler bleibt über die ganze Skala gleich – am unteren Skalenende wird er deshalb relativ riesig: Ein Amperemeter der Klasse 2,5 mit Endwert 100 mA hat immer ±2,5 mA Fehler. Zeigt es 4 mA, sind das ±62,5 % – der Messwert ist praktisch wertlos. Bei 80 mA sind es nur ±3,1 %. Darum: Messbereich wechseln, sobald der Zeiger im unteren Drittel steht.</p>' +
      '{{visual:3}}',
    questions: [
      { q: 'Analoges Voltmeter, Klasse 1,5, Endwert 300 V, Zeiger bei 230 V. Grösster Fehler?', options: ['±1,15 V', '±3,45 V', '±4,5 V', '±15 V'], correct: 2, explain: '1,5 % vom Endwert 300 V = 4,5 V – unabhängig vom Anzeigewert.' },
      { q: 'Digitales Voltmeter, Anzeige 230,0 V, ±(0,5 % + 1 Digit). Grösster Fehler?', options: ['±1,15 V', '±1,25 V', '±2,3 V', '±0,1 V'], correct: 1, explain: '0,5 % von 230 V = 1,15 V, dazu 1 Digit = 0,1 V → 1,25 V.' },
      { q: 'Warum soll der Zeiger eines analogen Instruments im oberen Drittel stehen?', options: ['Weil die Skala dort feiner ist', 'Weil der Klassenfehler absolut gleich bleibt und relativ kleiner wird', 'Weil das Messwerk sonst zu warm wird', 'Weil unten der Gleichrichter nicht arbeitet'], correct: 1, explain: '±0,1 V sind bei 15 V nur 0,67 %, bei 2 V aber 5 %.' },
      { q: 'Welche Rolle spielt der Messbereich beim Digit-Fehler?', options: ['Keine', 'Im kleineren Bereich ist 1 Digit weniger wert – der Fehler sinkt', 'Im kleineren Bereich ist der Fehler grösser', 'Der Digit-Fehler gilt nur bei AUTO'], correct: 1, explain: '20-V-Bereich: 1 Digit = 0,01 V; 600-V-Bereich: 1 Digit = 0,1 V.' },
      { q: 'Analoges Amperemeter, Klasse 2,5, Endwert 100 mA, Zeiger bei 4 mA. Wie gross ist der relative Fehler der Ablesung?', options: ['±2,5 %', '±6,25 %', '±62,5 %', '±0,1 %'], correct: 2, explain: 'Absoluter Fehler 2,5 % · 100 mA = ±2,5 mA, bezogen auf 4 mA sind das ±62,5 %. Am unteren Skalenende ist ein analoges Instrument fast unbrauchbar – Bereich wechseln.' },
      { q: 'Spannungsrichtige Leistungsmessung an 10 MΩ mit einem 10-MΩ-Voltmeter: Was misst das Amperemeter?', options: ['Nur den Verbraucherstrom', 'Den doppelten Verbraucherstrom (Voltmeterstrom kommt dazu)', 'Nichts', 'Den Strom des Shunts'], correct: 1, explain: 'Voltmeter und Verbraucher sind gleich gross – beide Ströme sind gleich, das Amperemeter zeigt das Doppelte.' }
    ]
  });

  /* ================= Aufgaben 6–8 ================= */
  var half = { parts: [gen(), d('V1', 280, 200, 0), R('R1', 1000, 460, 300, 90)], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
  var bHalf = { parts: [bG1, { id: 'V1', x: 480, y: 260, rot: 0 }, { id: 'R1', x: 700, y: 450, rot: 90 }] };
  defTask({
    id: '16.6', ch: 16, title: 'Einweggleichrichter – Instrumentenvergleich', tags: ['elektro.gleichrichter', 'messen.trms', 'elektro.mittelwert'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Die Gleichrichterschaltung aus Kapitel 3 – jetzt mit der Frage: Welches Gerät zeigt hier was, und was ist der wahre Effektivwert?',
    brief: 'Miss an R1 (Einweggleichrichter, Û = 10 V): <b>V⎓</b> (Gleichanteil), <b>V~ AVG</b> und <b>V~ TRMS</b> (Wechselanteil) sowie den <b>Scheitelwert</b> mit dem Oszilloskop. Berechne den <b>gesamten Effektivwert</b> √(U<sub>DC</sub>² + U<sub>AC</sub>²). Bereich 20 V.',
    learn: 'Eine gleichgerichtete Spannung ist eine Mischgrösse: Gleichanteil plus kräftiger Wechselanteil.',
    take: 'U_DC ≈ 2,8 V, U_AC (TRMS) ≈ 3,6 V, Û ≈ 9,3 V; U_ges ≈ 4,6 V. AVG und TRMS liegen hier zufällig nahe beieinander (3,58 V zu 3,56 V) – der Formfaktor der Einweg-Halbwelle ist fast der des Sinus; beim Rechteck würde AVG daneben liegen.',
    hint: 'Alle Messungen an R1.a (rot/Tastkopf) gegen R1.b (schwarz/Erdungsclip).',
    hint2: 'Wechselanteil der Einweg-Halbwelle: TRMS ≈ 3,56 V, AVG-Gerät ≈ 3,58 V. Gesamt: √(2,84² + 3,56²) ≈ 4,55 V.',
    palette: [], start: half, ref: half, bench: bHalf,
    tests: [{ name: 'gleichgerichtet', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [2.6, 3.1] }, { noFault: true }] }],
    measure: [
      { id: 'dc', ask: 'Gleichanteil (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.04 },
      { id: 'avg', ask: 'Wechselanteil AVG-Gerät (V~ AVG)', unit: 'V', mode: 'VAC', meterType: 'avg', a: 'R1.a', b: 'R1.b', tol: 0.04 },
      { id: 'rms', ask: 'Wechselanteil TRMS-Gerät (V~ TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.04 },
      { id: 'pk', ask: 'Scheitelwert (Oszilloskop)', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.03 },
      { id: 'ges', ask: 'Gesamter Effektivwert (berechnet)', unit: 'V', value: 'rms2', tol: 0.05 }
    ]
  });

  var bridgeC = { parts: [gen(), d('V1', 280, 200, 0), d('V2', 280, 400, 0), d('V3', 540, 200, 180), d('V4', 540, 400, 180), R('R1', 1000, 640, 300, 90),
    { id: 'S1', type: 'switch', x: 760, y: 200, rot: 0, props: { closed: false } }, { id: 'C1', type: 'capacitor', value: 10e-6, x: 840, y: 300, rot: 90 }],
    wires: [W('G1.p', 'V1.a'), W('G1.p', 'V3.k'), W('G1.n', 'V2.a'), W('G1.n', 'V4.k'), W('V1.k', 'R1.a'), W('V2.k', 'R1.a'), W('V3.a', 'R1.b'), W('V4.a', 'R1.b'), W('R1.a', 'S1.a'), W('S1.b', 'C1.a'), W('C1.b', 'R1.b')] };
  var bBridge = { parts: [bG1, { id: 'V1', x: 430, y: 250, rot: 0 }, { id: 'V2', x: 430, y: 640, rot: 0 }, { id: 'V3', x: 600, y: 250, rot: 180 }, { id: 'V4', x: 600, y: 640, rot: 180 }, { id: 'R1', x: 730, y: 450, rot: 90 }, { id: 'S1', x: 850, y: 250, rot: 0 }, { id: 'C1', x: 850, y: 450, rot: 90 }] };
  var B = function (id, ask, q, withC, tol) { var m = { id: id, ask: ask, unit: 'V', a: 'R1.a', b: 'R1.b', tol: tol || 0.05, set: { S1: { closed: !!withC } } }; if (q === 'rms') { m.mode = 'VAC'; m.meterType = 'trms'; } else { m.mode = 'AC'; m.q = q; } return m; };
  defTask({
    id: '16.7', ch: 16, title: 'Brückengleichrichter mit und ohne Ladekondensator', tags: ['elektro.gleichrichter', 'elektro.kondensator', 'messen.trms'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Erst die nackte Brücke, dann mit Ladekondensator: Die Zahlen auf den Geräten verändern sich drastisch.',
    brief: 'Miss an R1 <b>ohne</b> Kondensator (S1 offen) und <b>mit</b> Kondensator (S1 geschlossen): jeweils <b>V⎓</b> (Gleichanteil), <b>V~ TRMS</b> (Restwelligkeit) und den <b>Scheitelwert</b> am Oszilloskop (Zeitbasis 50 ms). Bereich 20 V.',
    learn: 'Der Ladekondensator hebt den Gleichanteil Richtung Scheitelwert und drückt die Restwelligkeit.',
    setupNote: '<b>Alternative wie am echten Labortisch – potentialfrei messen:</b> Sind Generator und Oszilloskop beide geerdet, darf der Erdungsclip nicht an R1.b (das würde eine Diode kurzschliessen). Dann: Erdungsclip an G1.–, CH1 an R1.a, CH2 an R1.b und am Gerät <b>MATH</b> einschalten. CH1 und CH2 zeigen je eine Halbwelle, MATH = CH1 − CH2 zeigt die Spannung an R1 – die Zweiweg-Kurve mit 10 ms Periode.',
    take: 'Ohne C: U_DC ≈ 5,0 V, U_AC ≈ 3,0 V, Û ≈ 8,6 V. Mit C (10 µF an 1 kΩ, τ = 10 ms): U_DC ≈ 6,7 V, U_AC nur noch ≈ 1,3 V – ein grösserer Kondensator würde den Gleichanteil weiter Richtung Û heben. Weiter mit 16.9: So wird daraus eine glatte Gleichspannung.',
    hint: 'S1 auf der Werkbank anklicken. Tastkopf an R1.a, Erdungsclip an R1.b.',
    hint2: 'Mit Kondensator sieht das Oszilloskop eine Sägezahn-Welligkeit oben am Scheitelwert – das ist die Restwelligkeit, die V~ TRMS misst.',
    palette: [], start: bridgeC, ref: bridgeC, bench: bBridge,
    tests: [{ name: 'ohne C', set: { S1: { closed: false } }, expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [4.9, 5.9] }, { noFault: true }] },
      { name: 'mit C', set: { S1: { closed: true } }, expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [6.2, 8.6] }, { noFault: true }] }],
    measure: [B('dc0', 'Ohne C: Gleichanteil (V⎓)', 'dc', false), B('ac0', 'Ohne C: Restwelligkeit (V~ TRMS)', 'rms', false), B('pk0', 'Ohne C: Scheitelwert (Oszilloskop)', 'peak', false, 0.04),
      B('dc1', 'Mit C: Gleichanteil (V⎓)', 'dc', true), B('ac1', 'Mit C: Restwelligkeit (V~ TRMS)', 'rms', true, 0.08), B('pk1', 'Mit C: Scheitelwert (Oszilloskop)', 'peak', true, 0.04)]
  });

  var shunt = { parts: [gen(), d('V1', 280, 200, 0), d('V2', 280, 400, 0), d('V3', 540, 200, 180), d('V4', 540, 400, 180), R('R1', 1000, 640, 260, 90), R('R2', 10, 640, 400, 90)],
    wires: [W('G1.p', 'V1.a'), W('G1.p', 'V3.k'), W('G1.n', 'V2.a'), W('G1.n', 'V4.k'), W('V1.k', 'R1.a'), W('V2.k', 'R1.a'), W('R1.b', 'R2.a'), W('V3.a', 'R2.b'), W('V4.a', 'R2.b')] };
  var bShunt = { parts: [bG1, { id: 'V1', x: 450, y: 250, rot: 0 }, { id: 'V2', x: 450, y: 640, rot: 0 }, { id: 'V3', x: 640, y: 250, rot: 180 }, { id: 'V4', x: 640, y: 640, rot: 180 }, { id: 'R1', x: 800, y: 340, rot: 90 }, { id: 'R2', x: 800, y: 560, rot: 90 }] };
  defTask({
    id: '16.8', ch: 16, title: 'Strommessung am Gleichrichter', tags: ['messen.strom', 'messen.systemfehler', 'elektro.gleichrichter'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Wie misst man den pulsierenden Strom hinter dem Gleichrichter? Mit einem Mess-Shunt – so, wie es das Amperemeter innen auch macht.',
    brief: 'In Reihe zur Last R1 (1 kΩ) liegt der <b>Mess-Shunt R2 = 10 Ω</b>. Miss an R2 den <b>Gleichanteil</b> (V⎓) und den <b>Wechselanteil</b> (V~ TRMS) und rechne beide mit I = U / 10 Ω in Ströme um. Bestimme mit dem Oszilloskop den <b>Spitzenstrom</b>. Berechne den <b>Systemfehler</b>: Um wie viel Prozent verkleinert der Shunt den Laststrom gegenüber der Schaltung ohne Shunt?',
    learn: 'Strommessung = Spannungsmessung an einem kleinen bekannten Widerstand. Der Shunt selbst ist ein Systemfehler.',
    take: 'U_DC am Shunt ≈ 50 mV → I_DC ≈ 5,0 mA; Spitzenstrom ≈ 8,5 mA. 10 Ω zu 1 kΩ: der Strom sinkt um rund 1 % – der Eigenverbrauch des Amperemeters (0,1 Ω) wäre nur 0,01 %.',
    hint: 'Spitzen an R2.a (rot) und R2.b (schwarz), Bereich 200 mV für den Gleichanteil. Die Frage nach dem Systemfehler: Widerstand mit / ohne Shunt vergleichen.',
    hint2: 'I_DC = 50 mV / 10 Ω = 5,0 mA. Systemfehler = 10 Ω / (1000 Ω + 10 Ω) ≈ 0,99 %.',
    palette: [], start: shunt, ref: shunt, bench: bShunt,
    tests: [{ name: 'Brücke', expect: [{ a: 'R2.a', b: 'R2.b', ac: 'dc', range: [0.045, 0.062] }, { noFault: true }] }],
    measure: [
      { id: 'udc', ask: 'Gleichanteil am Shunt R2 (V⎓, Bereich 200 mV)', unit: 'mV', mode: 'AC', q: 'dc', a: 'R2.a', b: 'R2.b', tol: 0.05 },
      { id: 'idc', ask: 'Gleichanteil des Stroms I = U / 10 Ω (berechnet)', unit: 'mA', value: 'idc', tol: 0.06 },
      { id: 'uac', ask: 'Wechselanteil am Shunt (V~ TRMS)', unit: 'mV', mode: 'VAC', meterType: 'trms', a: 'R2.a', b: 'R2.b', tol: 0.06 },
      { id: 'ipk', ask: 'Spitzenstrom aus dem Scheitelwert am Shunt (berechnet)', unit: 'mA', value: 'ipk', tol: 0.06 },
      { id: 'sys', ask: 'Systemfehler durch den Shunt (Strom um … % kleiner)', unit: '%', value: 100 * 10 / 1010, tol: 0.08 }
    ]
  });

  /* ===== 16.9 Glättung (Auftrag 06.10.2026, K1/K2): drei Ladekondensatoren mit je einem Schalter, Zusatzlast R2 über S4 ===== */
  var sw = function (id, x, y, rot) { return { id: id, type: 'switch', x: x, y: y, rot: rot, props: { closed: false } }; };
  var cap = function (id, v, x, y, rot) { return { id: id, type: 'capacitor', value: v, x: x, y: y, rot: rot }; };
  var smooth = { parts: [gen(), d('V1', 240, 200, 0), d('V2', 240, 400, 0), d('V3', 460, 200, 180), d('V4', 460, 400, 180), R('R1', 1000, 560, 300, 90),
    sw('S1', 650, 160, 90), cap('C1', 10e-6, 650, 300, 90), sw('S2', 730, 160, 90), cap('C2', 100e-6, 730, 300, 90), sw('S3', 810, 160, 90), cap('C3', 470e-6, 810, 300, 90),
    sw('S4', 890, 160, 90), R('R2', 1000, 890, 300, 90)],
    wires: [W('G1.p', 'V1.a'), W('G1.p', 'V3.k'), W('G1.n', 'V2.a'), W('G1.n', 'V4.k'), W('V1.k', 'R1.a'), W('V2.k', 'R1.a'), W('V3.a', 'R1.b'), W('V4.a', 'R1.b'),
      W('R1.a', 'S1.a'), W('S1.b', 'C1.a'), W('C1.b', 'R1.b'), W('R1.a', 'S2.a'), W('S2.b', 'C2.a'), W('C2.b', 'R1.b'), W('R1.a', 'S3.a'), W('S3.b', 'C3.a'), W('C3.b', 'R1.b'),
      W('R1.a', 'S4.a'), W('S4.b', 'R2.a'), W('R2.b', 'R1.b')] };
  var bSmooth = { parts: [{ id: 'G1', x: 210, y: 470, rot: 0 }, { id: 'V1', x: 350, y: 230, rot: 0 }, { id: 'V2', x: 350, y: 650, rot: 0 }, { id: 'V3', x: 510, y: 230, rot: 180 }, { id: 'V4', x: 510, y: 650, rot: 180 }, { id: 'R1', x: 580, y: 450, rot: 90 },
    { id: 'S1', x: 680, y: 190, rot: 90 }, { id: 'C1', x: 680, y: 345, rot: 90 }, { id: 'S2', x: 772, y: 190, rot: 90 }, { id: 'C2', x: 772, y: 345, rot: 90 }, { id: 'S3', x: 864, y: 190, rot: 90 }, { id: 'C3', x: 864, y: 345, rot: 90 },
    { id: 'S4', x: 956, y: 190, rot: 90 }, { id: 'R2', x: 956, y: 345, rot: 90 }] };
  /* Schalterstellungen je Messwert: gelistete Schalter zu, alle anderen offen */
  var SW = function (closed) { var s = {}; ['S1', 'S2', 'S3', 'S4'].forEach(function (id) { s[id] = { closed: closed.indexOf(id) >= 0 }; }); return s; };
  var G9 = function (id, ask, q, closed, tol, unit) { return { id: id, ask: ask, unit: unit || 'V', mode: 'AC', q: q, a: 'R1.a', b: 'R1.b', tol: tol || 0.06, set: SW(closed) }; };
  defTask({
    id: '16.9', ch: 16, title: 'Glättung: Wie gross muss der Ladekondensator sein?', tags: ['elektro.gleichrichter', 'elektro.kondensator', 'messen.oszilloskop', 'elektro.zeitkonstante'], measureUX: DRAG, rangeUX: 'manual',
    story: 'Aus den Buckeln der Brücke soll eine ruhige Gleichspannung werden. Dafür liegen drei Ladekondensatoren bereit, jeder mit eigenem Schalter – welcher reicht?',
    brief: 'Schliesse nacheinander <b>nur einen</b> Kondensator (S1 = 10 µF, S2 = 100 µF, S3 = 470 µF) und miss an R1 jeweils den <b>Gleichanteil</b> und die <b>Welligkeit U<sub>ss</sub></b> (Spitze-Spitze am Oszilloskop, Zeitbasis 50 ms). Berechne <b>τ = R · C</b> für jeden Kondensator und die Welligkeit nach der Faustformel <b>ΔU ≈ I / (2 · f · C)</b> mit I = U<sub>DC</sub> / R und f = 50 Hz. Dann: Welcher der drei Kondensatoren hält die Welligkeit unter <b>0,5 V</b>? Zum Schluss: Schliesse mit dem 470-µF-Kondensator zusätzlich S4 (R2 parallel zu R1, Last halbiert) und miss die Welligkeit erneut.',
    learn: 'Glättung braucht τ = R · C viel grösser als der Buckelabstand von 10 ms – und je mehr Strom die Last zieht, desto grösser die Welligkeit.',
    take: 'Glättung braucht τ = R · C viel grösser als 10 ms. 10 µF: Sägezahn (U_ss ≈ 4,1 V), 100 µF: leichte Welle (≈ 0,7 V), 470 µF: fast Gleichspannung (≈ 0,16 V). Die Faustformel ΔU ≈ I / (2 · f · C) gilt erst für τ ≫ 10 ms und liegt etwas zu hoch. Mit halber Last (500 Ω) verdoppelt sich der Strom und damit ungefähr die Welligkeit.',
    hint: 'Immer nur einen Schalter schliessen (auf der Werkbank anklicken), die anderen offen lassen. Tastkopf an R1.a, Erdungsclip an R1.b, Bildbreite 50 ms. Die Welligkeit U_ss steht unter der Kurve; bei kleiner Welligkeit AC-Kopplung einschalten (Taste DC/AC), dann füllt die Welle den Schirm.',
    hint2: 'Erwartet: 10 µF ≈ 4,1 V, 100 µF ≈ 0,7 V, 470 µF ≈ 0,16 V Welligkeit. Mehrere Schalter gleichzeitig zu sind erlaubt – die Kapazitäten addieren sich (S2 + S3 = 570 µF). Faustformel: I = U_DC / R1, ΔU = I / (2 · 50 Hz · C).',
    setupNote: '<b>Welligkeit sichtbar machen:</b> Bei der Standard-Kopplung DC ist eine geglättete Spannung (z. B. 8,4 V) fast eine gerade Linie – das ist richtig. Schalte am Oszilloskop die Kopplung von CH1 auf <b>AC</b> (Taste DC/AC neben CH1): Der Gleichanteil wird abgezogen und die Skala vergrössert, U_ss liest du unter der Kurve ab.',
    palette: [], start: smooth, ref: smooth, bench: bSmooth, demo: 'pp2',
    tests: [{ name: 'ohne Kondensator', set: SW([]), expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [4.9, 5.9] }, { noFault: true }] },
      { name: '470 µF', set: SW(['S3']), expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [8.0, 8.6] }, { noFault: true }] }],
    measure: [
      G9('dc1', '10 µF (S1): Gleichanteil (V⎓)', 'dc', ['S1']), G9('pp1', '10 µF (S1): Welligkeit U_ss (Oszilloskop)', 'pp', ['S1']),
      G9('dc2', '100 µF (S2): Gleichanteil (V⎓)', 'dc', ['S2']), G9('pp2', '100 µF (S2): Welligkeit U_ss (Oszilloskop)', 'pp', ['S2'], 0.08),
      G9('dc3', '470 µF (S3): Gleichanteil (V⎓)', 'dc', ['S3']), G9('pp3', '470 µF (S3): Welligkeit U_ss (Oszilloskop)', 'pp', ['S3'], 0.1),
      { id: 'tau1', ask: 'Zeitkonstante τ = R1 · C1 (berechnet)', unit: 'ms', value: 'tau1', tol: 0.03 },
      { id: 'tau2', ask: 'Zeitkonstante τ = R1 · C2 (berechnet)', unit: 'ms', value: 'tau2', tol: 0.03 },
      { id: 'tau3', ask: 'Zeitkonstante τ = R1 · C3 (berechnet)', unit: 'ms', value: 'tau3', tol: 0.03 },
      { id: 'du2', ask: '100 µF: Welligkeit nach der Faustformel ΔU ≈ I / (2·f·C) (berechnet)', unit: 'V', value: 'du2', tol: 0.06 },
      { id: 'du3', ask: '470 µF: Welligkeit nach der Faustformel ΔU ≈ I / (2·f·C) (berechnet)', unit: 'V', value: 'du3', tol: 0.06 },
      { id: 'cmin', ask: 'Welcher Kondensator hält U_ss unter 0,5 V? (Wert in µF eintragen)', unit: 'µF', value: 'cmin', tol: 0.05 },
      G9('pp4', '470 µF (S3) und halbe Last (S4 zu): Welligkeit U_ss (Oszilloskop)', 'pp', ['S3', 'S4'], 0.1)
    ]
  });

  /* Rechenwerte, die von der Simulation abhaengen: einmal beim Laden aus der Engine holen (gleiche Zahlen wie die Messungen) */
  var ROOT = typeof window !== "undefined" ? window : globalThis, E = ROOT.DQEngine, DQR = ROOT.DQ;
  if (E && E.acMeasure) {
    var h = E.acMeasure(half, { a: 'R1.a', b: 'R1.b' }), s = E.acMeasure(shunt, { a: 'R2.a', b: 'R2.b' });
    DQR.byId["16.6"].measure.forEach(function (m) { if (m.value === 'rms2') m.value = Math.sqrt(h.dc * h.dc + h.rms * h.rms); });
    DQR.byId["16.8"].measure.forEach(function (m) { if (m.value === 'idc') m.value = s.dc / 10; if (m.value === 'ipk') m.value = s.peak / 10; });
    // 16.9: τ aus R1·C, Faustformel aus dem gemessenen Gleichanteil, kleinster Kondensator mit U_ss < 0,5 V aus der Messreihe
    var lay9 = function (closed) { var l = E.clone(smooth); l.parts.forEach(function (p) { if (/^S\d$/.test(p.id)) p.props = { closed: closed.indexOf(p.id) >= 0 }; }); return l; };
    var r1 = smooth.parts.filter(function (p) { return p.id === 'R1'; })[0].value, cv = function (id) { return smooth.parts.filter(function (p) { return p.id === id; })[0].value; };
    var a2 = E.acMeasure(lay9(['S2']), { a: 'R1.a', b: 'R1.b' }), a3 = E.acMeasure(lay9(['S3']), { a: 'R1.a', b: 'R1.b' }), a1 = E.acMeasure(lay9(['S1']), { a: 'R1.a', b: 'R1.b' });
    var cmin = [['S1', 10, a1], ['S2', 100, a2], ['S3', 470, a3]].filter(function (x) { return x[2].max - x[2].min < 0.5; })[0];
    DQR.byId["16.9"].measure.forEach(function (m) {
      if (m.value === 'tau1') m.value = r1 * cv('C1'); if (m.value === 'tau2') m.value = r1 * cv('C2'); if (m.value === 'tau3') m.value = r1 * cv('C3'); // in Sekunden, die Einheit ms skaliert die Engine
      if (m.value === 'du2') m.value = a2.dc / r1 / (2 * 50 * cv('C2')); if (m.value === 'du3') m.value = a3.dc / r1 / (2 * 50 * cv('C3')); if (m.value === 'cmin') m.value = (cmin ? cmin[1] : 470) * 1e-6;
    });
  }
})();

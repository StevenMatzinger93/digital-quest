/* Digital Quest – Werkbank-Ansicht (window.DQBench)
 * 2.5D, fester Blickwinkel: Laborunterlage auf dem Tisch, leicht geneigt (Szene in y gestaucht),
 * Bauteile als Praktikums-Steckbausteine mit 4-mm-Buchsen, Verbindungen als Laborkabel mit Bananensteckern.
 * Nur Renderer: Zustand und Bedienlogik liegen im Kern (circuit-ui.js, Raum 'bench'), die Werkbank macht
 * Hit-Testing und rechnet Bildschirm → Werkbank-Koordinaten um. Gleiche data-Attribute wie im Schema
 * (data-part, data-pin, data-wire). Unsichtbar wird nicht gezeichnet, erst beim Einblenden (fit).
 * Messgeraete stehen rechts auf der Unterlage (Frontansicht, nicht gestaucht): Multimeter mit Drehschalter (data-dial),
 * LCD, Buchsen und Messkabeln zu den Pruefspitzen; Oszilloskop mit Bildschirm und RUN-Taste (data-scope).
 * Die App setzt bench.meter = {mode, text, fuse, sub} und bench.scope = {pts:[[0..1, 0..1]], info}.
 * bench.dragUX (Aufgaben mit measureUX 'drag'): Messspitzen liegen geparkt vor dem Geraet und werden per Ziehen an einen
 * Anschluss gefuehrt (pointerdown auf der Spitze, ziehen, loslassen ueber einer Buchse); ohne Treffer faellt die Spitze
 * zurueck auf den Parkplatz. Das Oszilloskop hat dann einen eigenen Tastkopf (core.scopeProbes). Ohne dragUX gilt das
 * bisherige Verhalten (Klick auf die Buchse setzt die Spitze, Oszilloskop nutzt die Multimeter-Spitzen). */
(function (root) {
  'use strict';
  var E = root.DQEngine, Circuit = root.DQCircuit, Ed = root.DQEditor;
  var S = Circuit.SPACES.bench, W = S.w, H = S.h, K = 0.8; // K: Neigung der Tischflaeche (Stauchung in y)

  /* Buchsen je Bauteil (unrotiert, Werkbank-Einheiten) und Groesse des Bausteins [breite, hoehe] */
  var TWO = { a: [-45, 0], b: [45, 0] };
  var GEO = {
    battery: { p: [-32, 38], n: [32, 38] }, acsource: { p: [-32, 38], n: [32, 38] }, ground: { g: [0, -8] },
    resistor: TWO, lamp: TWO, switch: TWO, button: TWO, capacitor: TWO, ammeter: TWO,
    led: { a: [-45, 0], k: [45, 0] }, diode: { a: [-45, 0], k: [45, 0] },
    pot: { a: [-50, -8], b: [50, -8], w: [0, 32] }, clock: { out: [48, 0] },
    not: { in: [-50, 0], out: [50, 0] },
    logicin: { out: [45, 0] }, logicled: { in: [-35, 0] },
    zener: { a: [-45, 0], k: [45, 0] }, motor: { a: [-55, 34], b: [55, 34] },
    npn: { b: [-50, 0], c: [35, -38], e: [35, 38] },
    dff: { D: [-60, -30], C: [-60, 30], Q: [60, -24], Qn: [60, 24] },
    tff: { T: [-60, -30], C: [-60, 30], Q: [60, -24], Qn: [60, 24] },
    jkff: { J: [-60, -32], C: [-60, 0], K: [-60, 32], Q: [60, -24], Qn: [60, 24] },
    seg7: {}, dec7: { A: [-72, -66], B: [-72, -44], C: [-72, -22], D: [-72, 0] }
  };
  'abcdefg'.split('').forEach(function (k, i) { GEO.seg7[k] = [-62, -66 + 22 * i]; GEO.dec7[k] = [72, -66 + 22 * i]; });
  var SIZE = { logicin: [112, 78], logicled: [92, 70], motor: [150, 110], npn: [130, 110], dff: [150, 110], tff: [150, 110], jkff: [150, 110], seg7: [150, 176], dec7: [176, 180],
    battery: [150, 112], acsource: [150, 112], ground: [60, 70], pot: [130, 94], clock: [124, 80], lamp: [130, 70], ammeter: [130, 72] };
  ['and', 'or', 'nand', 'nor', 'xor', 'xnor'].forEach(function (g) { GEO[g] = { in1: [-50, -22], in2: [-50, 22], out: [50, 0] }; });
  var CHIP = { and: '7408', or: '7432', nand: '7400', nor: '7402', xor: '7486', xnor: '7266', not: '7404' };
  var FFCHIP = { dff: '74HC74', jkff: '74HC107', tff: 'T-FF' };
  var SEGP = ['M-8-20h16', 'M10-18v16', 'M10 2v16', 'M-8 20h16', 'M-10 2v16', 'M-10-18v16', 'M-8 0h16'];
  function size(type) { return SIZE[type] || (CHIP[type] ? [130, 92] : [130, 64]); }

  function rotPt(p, rot) {
    var x = p[0], y = p[1];
    switch (((rot || 0) % 360 + 360) % 360) { case 90: return [-y, x]; case 180: return [-x, -y]; case 270: return [y, -x]; default: return [x, y]; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Farbringe (4 Ringe, Toleranz Gold) */
  var RING = ['#111', '#7b3f00', '#d32f2f', '#f57c00', '#fbc02d', '#2e7d32', '#1565c0', '#7b1fa2', '#8a8a8a', '#f5f5f5'];
  function bands(v) {
    if (!(v > 0)) return [RING[0], RING[0], RING[0]];
    var e = Math.floor(Math.log10(v)) - 1, m = Math.round(v / Math.pow(10, e));
    if (m >= 100) { m = 10; e++; }
    var mul = e >= 0 && e <= 9 ? RING[e] : e === -1 ? '#c9a227' : '#c0c0c0';
    return [RING[Math.floor(m / 10)], RING[m % 10], mul];
  }
  function val(p) { var d = E.PARTS[p.type], q = p.props || {}; return p.value !== undefined ? p.value : (q.value !== undefined ? q.value : d.props.value); }

  /* 4-mm-Buchse: farbiger Isolierring mit Glanz, Messinghuelse, Bohrung */
  /* Trefferflächen (Buchse, Spitzengriff, Drehschalter) mindestens 12 px Radius auf dem Bildschirm – HIT skaliert die Radien,
   * sobald ein Bildschirm-Pixel mehr als eine Werkbank-Einheit abdeckt (Handy, weit herausgezoomt). Wird in render() gesetzt. */
  var HIT = 1;
  function socket(xy, ring) {
    return '<g transform="translate(' + xy[0] + ' ' + xy[1] + ')"><circle r="11.5" cy="1.8" fill="rgba(0,0,0,.35)"/>' +
      '<circle r="10.5" fill="' + (ring || '#262626') + '" stroke="rgba(0,0,0,.65)"/><circle r="10.5" fill="url(#bRingShine)"/>' +
      '<circle r="6.2" fill="url(#bBrass)" stroke="rgba(60,40,0,.6)" stroke-width=".8"/><circle r="2.9" fill="#050505"/><circle r="1" cx="-.9" cy="-.9" fill="#4a4a4a"/></g>';
  }
  function screw(x, y, a) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ')"><circle r="3.8" fill="url(#bMetal)" stroke="rgba(0,0,0,.55)" stroke-width=".7"/><path d="M-2.6 0H2.6" stroke="#3b3b3b" stroke-width="1.1"/></g>';
  }
  /* Draht vom Bauteil zur Buchse, mit Loetpunkt an der Buchse */
  function lead(x0, x1, y) {
    y = y || 0;
    return '<path class="blead" d="M' + x0 + ' ' + y + 'H' + x1 + '"/><path class="bleadhi" d="M' + x0 + ' ' + (y - 0.8) + 'H' + x1 + '"/>' +
      '<circle cx="' + x0 + '" cy="' + y + '" r="2.4" fill="#cfd2d4" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>';
  }
  function shadowEl(cx, cy, rx, ry) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="rgba(0,0,0,.28)" filter="url(#bSoft2)"/>'; }
  /* Lage des aufgedruckten Schaltzeichens [x, y, Massstab] auf dem Baustein */
  function symSpot(type, w, h) {
    if (type === 'battery' || type === 'acsource') return [0, 38, 0.2];
    if (type === 'ground') return null;
    if (CHIP[type]) return [0, -36, 0.17];
    if (FFCHIP[type]) return [-40, -42, 0.15];
    if (type === 'seg7' || type === 'dec7' || type === 'logicled' || type === 'logicin') return null;
    if (type === 'npn') return [-44, -40, 0.15];
    if (type === 'motor') return [-58, -40, 0.15];
    if (type === 'clock') return [36, -30, 0.15];
    return [-w / 2 + 22, -h / 2 + 14, 0.17];
  }

  /* Bauteil-Illustration um den Ursprung, unrotiert. r = Simulationsergebnis, hot = Stoerungscode des Bauteils (beides optional) */
  function illus(p, r, hot) {
    var q = p.props || {}, sz = size(p.type), w = sz[0], h = sz[1], g = GEO[p.type], s = '';
    r = r || {};
    // Baustein: Kunststoffoberseite mit Fase, Schrauben, aufgedrucktes Schaltzeichen
    s += '<rect class="bblock" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="9"/>' +
      '<rect class="bbevel" x="' + (-w / 2 + 3) + '" y="' + (-h / 2 + 3) + '" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="7"/>' +
      '<rect class="bgloss" x="' + (-w / 2 + 4) + '" y="' + (-h / 2 + 4) + '" width="' + (w - 8) + '" height="' + Math.min(14, h / 4) + '" rx="6"/>';
    s += screw(-w / 2 + 8, -h / 2 + 8, 20) + screw(w / 2 - 8, -h / 2 + 8, 70) + screw(-w / 2 + 8, h / 2 - 8, 110) + screw(w / 2 - 8, h / 2 - 8, 160);
    var sp = symSpot(p.type, w, h);
    if (sp) s += '<g class="bsym" transform="translate(' + sp[0] + ' ' + sp[1] + ') scale(' + sp[2] + ')">' + Ed.symbol({ type: p.type, props: { closed: q.closed, color: q.color } }) + '</g>';
    // Buchsen
    Object.keys(g).forEach(function (pin) {
      var ring = p.type === 'battery' || p.type === 'acsource' ? (pin === 'p' ? '#c62828' : '#1a1a1a') : p.type === 'ground' ? 'url(#bGY)' : null;
      s += socket(g[pin], ring);
    });
    if (hot) s += '<circle r="' + (Math.min(w, h) / 2 + 6) + '" fill="#ff5a1f" opacity=".55" filter="url(#bBlur)"/>'; // Hitze (Kurzschluss, Ueberlast)
    switch (p.type) {
      case 'resistor': // Kohleschichtwiderstand: Knochenform, Farbringe, Zylinder-Schattierung
        var bd = bands(val(p)), body = 'M-24-6Q-24-9.5-20-9.5H-16Q-13-7.5-10-7.5H10Q13-7.5 16-9.5H20Q24-9.5 24-6V6Q24 9.5 20 9.5H16Q13 7.5 10 7.5H-10Q-13 7.5-16 9.5H-20Q-24 9.5-24 6Z';
        s += lead(-34, -23) + lead(34, 23) + shadowEl(2, 11, 25, 3.5) +
          '<path d="' + body + '" fill="' + (hot ? '#7a4a28' : 'url(#bResBody)') + '" stroke="rgba(60,40,10,.45)" stroke-width=".8"/>' +
          '<rect x="-19.5" y="-9.5" width="4" height="19" fill="' + bd[0] + '"/><rect x="-8" y="-7.5" width="3.5" height="15" fill="' + bd[1] + '"/>' +
          '<rect x="-1" y="-7.5" width="3.5" height="15" fill="' + bd[2] + '"/><rect x="15.5" y="-9.5" width="4" height="19" fill="#c9a227"/>' +
          '<path d="' + body + '" fill="url(#bCyl)"/>'; break;
      case 'led': case 'diode':
        if (p.type === 'diode') { // 1N4007: schwarzer Koerper, silberner Ring an der Kathode
          s += lead(-34, -17) + lead(34, 17) + shadowEl(2, 9, 18, 3) +
            '<rect x="-17" y="-7" width="34" height="14" rx="3" fill="#1b1b1b"/><rect x="8" y="-7" width="4.5" height="14" fill="#d8d8d8"/>' +
            '<text class="bpart-tiny" x="-3" y="2.5">4007</text><rect x="-17" y="-7" width="34" height="14" rx="3" fill="url(#bCyl)"/>';
        } else { // 5-mm-LED von schraeg oben: Beinchen, Kragen mit Abflachung an der Kathode, Linse mit Reflektor
          var col = (E.LED_COLORS[q.color || 'rot'] || {}).rgb || '#f33', b = r.burnt ? 0 : (r.brightness || 0);
          if (r.burnt) col = '#3b2b25';
          s += lead(-34, -9) + '<path class="blead" d="M34 0H9"/>' + shadowEl(3, 10, 13, 4) +
            (b > 0.02 ? '<circle r="' + (24 + 44 * b) + '" fill="' + col + '" opacity="' + (0.3 + 0.5 * b).toFixed(2) + '" filter="url(#bBlur)"/>' : '') +
            '<path d="M-12.5 0A12.5 12.5 0 1 1 10.5 6.8V-6.8A12.5 12.5 0 0 1-12.5 0Z" fill="' + col + '" opacity=".8" stroke="rgba(0,0,0,.45)"/>' +
            '<circle r="9.8" fill="' + col + '" opacity="' + (0.5 + 0.5 * b).toFixed(2) + '"/><circle r="9.8" fill="url(#bLens)"/>' +
            '<path d="M-3-1.5h6v3h-6z" fill="rgba(0,0,0,.35)"/><path d="M-1 1.5l-1.5 3M1 1.5l1.5 3" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>' +
            (b > 0.05 ? '<circle r="' + (2.5 + 4 * b).toFixed(1) + '" fill="#fff" opacity="' + (0.4 + 0.6 * b).toFixed(2) + '" filter="url(#bSoft)"/>' : '') +
            (r.burnt ? '<path d="M-6-6L-1 0L-4 3M2-7L1-1L6 4" fill="none" stroke="#111" stroke-width="1.5"/>' : '<ellipse cx="-4" cy="-4.5" rx="3.6" ry="2.3" fill="rgba(255,255,255,.75)" transform="rotate(-30 -4 -4.5)"/>') +
            '<text class="bprint" x="-45" y="-17">+</text><text class="bprint" x="45" y="-17">−</text>';
        }
        break;
      case 'lamp': // Gluehlampe in E10-Fassung: Sechskant, Gewinde, Glaskolben, Wendel
        var gl = r.burnt ? 0 : Math.min(1, Math.abs(r.p || 0) / ((q.pnom) || 1.35));
        s += lead(-34, -22) + lead(34, 22) + shadowEl(3, 6, 23, 16) +
          '<path d="M22 0L11 19H-11L-22 0L-11-19H11Z" fill="url(#bMetal)" stroke="rgba(0,0,0,.55)"/>' +
          '<circle r="17" fill="#8d9296" stroke="rgba(0,0,0,.4)"/><circle r="15.5" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/><circle r="14" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>' +
          (gl > 0.02 ? '<circle r="' + (26 + 44 * gl) + '" fill="#ffc940" opacity="' + (0.15 + 0.3 * gl).toFixed(2) + '" filter="url(#bBlur)"/><circle r="' + (20 + 26 * gl) + '" fill="url(#bGlow)" opacity="' + Math.min(0.9, 0.3 + 0.6 * gl).toFixed(2) + '"/>' : '') +
          '<circle r="13" fill="' + (r.burnt ? 'rgba(70,64,58,.75)' : gl > 0.02 ? 'rgba(255,214,120,' + (0.35 + 0.6 * gl).toFixed(2) + ')' : 'rgba(225,235,242,.45)') + '" stroke="rgba(255,255,255,.6)"/>' +
          '<path d="M-5 7V-1M5 7V-1" stroke="#888" stroke-width="1.1"/>' +
          '<path d="' + (r.burnt ? 'M-5-1l1.2-2 1.2 2 1-1.5M1.5-2l1.2 2 1.2-2 1.1 2' : 'M-5-1l1.2-2 1.2 2 1.2-2 1.2 2 1.2-2 1.2 2 1.2-2 1.1 2') + '" fill="none" stroke="' + (gl > 0.05 ? '#fff6d0' : '#5d5d5d') + '" stroke-width="1.3"' + (gl > 0.05 ? ' filter="url(#bSoft)"' : '') + '/>' +
          '<path d="M-9-6A11 11 0 0 1-2-10.5" stroke="rgba(255,255,255,.85)" stroke-width="2.2" fill="none" stroke-linecap="round"/>'; break;
      case 'switch': // Kippschalter: Sechskantmutter, Gewindehuelse, Hebel mit Kugel und Schatten
        var on = !!q.closed, dx = on ? 1 : -1;
        s += lead(-34, -17) + lead(34, 17) + '<rect x="-18" y="-15" width="36" height="30" rx="3" fill="#232323" stroke="#000"/><rect x="-16" y="-13" width="32" height="7" rx="2" fill="rgba(255,255,255,.08)"/>' +
          '<text class="bprint" x="-26" y="-20">0</text><text class="bprint" x="26" y="-20">I</text>' +
          '<path d="M10 0L5 8.7H-5L-10 0L-5-8.7H5Z" fill="url(#bMetal)" stroke="rgba(0,0,0,.6)"/><circle r="6" fill="#b9bdc0" stroke="rgba(0,0,0,.45)"/>' +
          '<path d="M' + (dx * 2) + ' 4L' + (dx * 25) + ' 7" stroke="rgba(0,0,0,.35)" stroke-width="6" stroke-linecap="round"/>' +
          '<path d="M0-3.2L' + (dx * 22) + '-2.2V2.2L0 3.2Z" fill="url(#bMetalV)" stroke="rgba(0,0,0,.45)" stroke-width=".7"/>' +
          '<circle cx="' + (dx * 23) + '" r="4.8" fill="url(#bMetal)" stroke="rgba(0,0,0,.5)"/>'; break;
      case 'button': // Drucktaster: Sockel mit Ring, rote Kappe (gedrueckt: tiefer und dunkler)
        var pr = !!q.closed;
        s += lead(-34, -17) + lead(34, 17) + '<rect x="-17" y="-17" width="34" height="34" rx="4" fill="#232323" stroke="#000"/>' +
          '<circle r="13" fill="#3a3a3a" stroke="rgba(0,0,0,.6)"/><circle r="13" fill="url(#bRingShine)"/>' +
          '<circle r="' + (pr ? 8.5 : 10.5) + '" cy="' + (pr ? 1 : -1) + '" fill="' + (pr ? '#8e1717' : 'url(#bRedCap)') + '" stroke="rgba(0,0,0,.5)"/>' +
          (pr ? '' : '<ellipse cx="-3.5" cy="-5" rx="4" ry="2.3" fill="rgba(255,255,255,.45)"/>'); break;
      case 'capacitor': // Elko liegend: Becher mit Schrumpfschlauch, Minus-Streifen, Aluminium-Boden
        s += lead(-34, -21) + lead(34, 21) + shadowEl(2, 12, 22, 4) +
          '<rect x="-21" y="-12" width="42" height="24" rx="4" fill="#27498a"/><rect x="9" y="-12" width="8" height="24" fill="#a9b6cf"/>' +
          '<text class="bpart-tiny w" x="-5" y="3">' + esc(Ed.fmtVal(val(p))) + 'F</text><text class="bpart-tiny" x="13" y="3">−</text>' +
          '<rect x="17" y="-12" width="4" height="24" rx="1.5" fill="url(#bMetalV)"/><rect x="-21" y="-12" width="42" height="24" rx="4" fill="url(#bCyl)"/>'; break;
      case 'ammeter': // Einbau-Messinstrument mit Digitalanzeige
        s += lead(-34, -29) + lead(34, 29) + '<rect x="-29" y="-25" width="58" height="46" rx="4" fill="#1d1d1d" stroke="#000"/>' +
          '<rect x="-25" y="-21" width="50" height="23" rx="2" fill="#b9c6a2"/><rect x="-25" y="-21" width="50" height="6" fill="rgba(255,255,255,.2)"/>' +
          '<text class="blcd" y="-5">' + (r.i !== undefined ? esc(E.fmt(Math.abs(r.i), 'A')) : '- - -') + '</text><text class="bchip" y="15">A</text>' +
          screw(-24, 15, 30) + screw(24, 15, 80); break;
      case 'pot': // Drehpotentiometer: Rippenknopf mit Zeiger, Skala
        var ang = -135 + 270 * (q.pos !== undefined ? q.pos : 0.5), ticks = '';
        for (var ti = 0; ti <= 10; ti++) { var ta = (-135 + 27 * ti) * Math.PI / 180; ticks += 'M' + (Math.sin(ta) * 23).toFixed(1) + ' ' + (-8 - Math.cos(ta) * 23).toFixed(1) + 'L' + (Math.sin(ta) * 26).toFixed(1) + ' ' + (-8 - Math.cos(ta) * 26).toFixed(1); }
        var ribs = ''; for (var ri = 0; ri < 18; ri++) { var ra = ri * 20 * Math.PI / 180; ribs += 'M' + (Math.sin(ra) * 15.5).toFixed(1) + ' ' + (-8 - Math.cos(ra) * 15.5).toFixed(1) + 'L' + (Math.sin(ra) * 19).toFixed(1) + ' ' + (-8 - Math.cos(ra) * 19).toFixed(1); }
        s += lead(-40, -25, -8) + lead(40, 25, -8) + '<path class="blead" d="M0 22V11"/>' + '<path d="' + ticks + '" stroke="#3d464d" stroke-width="1.3"/>' + shadowEl(3, -2, 20, 17) +
          '<circle cy="-8" r="19" fill="#262626" stroke="#000"/><path d="' + ribs + '" stroke="#444" stroke-width="1.5"/><circle cy="-8" r="13" fill="url(#bMetal)" stroke="rgba(0,0,0,.4)"/>' +
          '<path transform="translate(0 -8) rotate(' + ang + ')" d="M0-2V-13" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>'; break;
      case 'clock': // Taktgeber-Platine: Quarz, Takt-LED, Beschriftung
        s += lead(26, 38) + '<rect x="-48" y="-27" width="74" height="54" rx="4" fill="#1f5130" stroke="#0e2a18"/>' +
          '<path d="M-40 12H-30V-6H-18V12H-6V-6H6" fill="none" stroke="#e8c33a" stroke-width="1.8"/>' +
          '<rect x="-40" y="-21" width="22" height="10" rx="5" fill="url(#bMetalV)" stroke="rgba(0,0,0,.4)"/><text class="bpart-tiny w" x="4" y="-13">' + esc(Ed.fmtVal(q.freq || 1)) + 'Hz</text>' +
          '<circle cx="17" cy="-15" r="4.5" fill="' + (r.high ? '#39ff14' : '#243024') + '"' + (r.high ? ' filter="url(#bSoft)"' : '') + '/><text class="bpart-tiny w" x="-12" y="22">TAKT</text>'; break;
      case 'ground':
        s += '<path d="M0 12V18M-11 18H11M-7 23H7M-3 28H3" fill="none" stroke="#2b2b2b" stroke-width="2"/>'; break;
      case 'logicin': // Pegelschalter des Experimentierboards: Schiebeschalter 0/1 mit Pegel-LED
        var hiL = !!q.closed;
        s += lead(34, 18) + '<rect x="-44" y="-24" width="62" height="40" rx="5" fill="#1f2a36" stroke="#000"/>' +
          '<rect x="-38" y="-9" width="50" height="16" rx="8" fill="#0d1116" stroke="#000"/>' +
          '<rect x="' + (hiL ? -6 : -36) + '" y="-11" width="22" height="20" rx="4" fill="url(#bMetalV)" stroke="rgba(0,0,0,.5)"/>' +
          '<text class="bprint w" x="-30" y="-14">0</text><text class="bprint w" x="6" y="-14">1</text>' +
          '<circle cx="4" cy="-30" r="4.5" fill="' + (hiL ? '#ff3b30' : '#3a1c1c') + '"' + (hiL ? ' filter="url(#bSoft)"' : '') + '/>' +
          '<text class="bpart-tiny" x="-30" y="30">PEGEL</text>'; break;
      case 'logicled': // Logikanzeige: LED mit eingebautem Vorwiderstand gegen Masse
        var onL = !!r.on, colL = (E.LED_COLORS[q.color || 'rot'] || {}).rgb || '#ff3b30';
        s += lead(-24, -12) + (onL ? '<circle r="30" fill="' + colL + '" opacity=".5" filter="url(#bBlur)"/>' : '') +
          '<circle r="12" fill="' + colL + '" opacity=".8" stroke="rgba(0,0,0,.45)"/><circle r="9.5" fill="' + colL + '" opacity="' + (onL ? 1 : 0.35) + '"/><circle r="9.5" fill="url(#bLens)"/>' +
          (onL ? '<circle r="4" fill="#fff" opacity=".8" filter="url(#bSoft)"/>' : '') +
          '<text class="bpart-tiny" x="16" y="26">⏚ intern</text>'; break;
      case 'zener': // Z-Diode: orange Glaskoerper mit Kathodenring und Aufdruck
        s += lead(-34, -17) + lead(34, 17) + shadowEl(2, 9, 18, 3) + '<rect x="-17" y="-7" width="34" height="14" rx="6" fill="#d9772b" opacity=".92"/>' +
          '<rect x="8" y="-7" width="4.5" height="14" fill="#1b1b1b"/><text class="bpart-tiny" x="-3" y="2.5">Z' + esc(String(q.vz || 5.1).replace('.', 'V')) + '</text>' +
          '<rect x="-17" y="-7" width="34" height="14" rx="6" fill="url(#bCyl)"/>'; break;
      case 'motor': // Gleichstrommotor mit Luefterrad (dreht je nach Strom)
        var sp = r.speed || 0;
        s += '<path class="blead" d="M-55 24V10H-26M55 24V10H26"/>' + shadowEl(4, 4, 34, 30) +
          '<rect x="-34" y="-30" width="68" height="44" rx="6" fill="#5c6670" stroke="#20262b"/><rect x="-34" y="-30" width="68" height="44" rx="6" fill="url(#bCylV)"/>' +
          '<circle cy="-8" r="26" fill="rgba(20,20,20,.35)"/>' +
          '<g class="bspin" data-spin="' + sp.toFixed(3) + '" transform="translate(0 -8)"><g>' +
          [0, 72, 144, 216, 288].map(function (a) { return '<path transform="rotate(' + a + ')" d="M0-4C8-8 14-20 6-24C0-26-4-14 0-4Z" fill="#e0b400" stroke="rgba(0,0,0,.4)"/>'; }).join('') +
          '<circle r="5" fill="url(#bMetal)"/></g></g><text class="bpart-tiny w" y="22">M · ' + esc(Ed.valueText(p)) + '</text>'; break;
      case 'npn': // Transistor im TO-92-Gehaeuse mit drei Beinchen
        s += '<path class="blead" d="M-40 0H-14M35-28V-14H6M35 28V14H6"/>' + shadowEl(2, 6, 18, 16) +
          '<path d="M-14-16H10A16 16 0 0 1 10 16H-14Z" fill="#1b1b1b" stroke="#000"/><path d="M-14-16H10A16 16 0 0 1 22-10" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2"/>' +
          '<text class="bpart-tiny" x="-1" y="1.5">BC547</text>' +
          '<text class="bprint" x="-50" y="-18">B</text><text class="bprint" x="52" y="-42">C</text><text class="bprint" x="52" y="44">E</text>' +
          (r.state && r.state !== 'off' ? '<circle cx="-22" cy="-24" r="3.5" fill="' + (r.state === 'sat' ? '#39ff14' : '#ffb000') + '" filter="url(#bSoft)"/>' : ''); break;
      case 'seg7': // 7-Segment-Anzeige (gemeinsame Kathode intern auf Masse)
        s += '<rect x="-38" y="-72" width="96" height="140" rx="6" fill="#141414" stroke="#000"/>' +
          '<g transform="translate(10 -4) scale(2.3)">' + SEGP.map(function (d, i) { var o = r.seg && r.seg[i]; return (o ? '<path d="' + d + '" stroke="#ff3b30" stroke-width="9" stroke-linecap="round" opacity=".3"/>' : '') + '<path d="' + d + '" stroke="' + (o ? '#ff5a4f' : '#2b1414') + '" stroke-width="4.6" stroke-linecap="round"/>'; }).join('') + '</g>' +
          'abcdefg'.split('').map(function (k, i) { return '<text class="bprint w" x="-46" y="' + (-62 + 22 * i) + '">' + k + '</text>'; }).join(''); break;
      case 'dec7': // BCD-7-Segment-Decoder 4511 (DIP-16)
        var pins16 = ''; for (var j = 0; j < 8; j++) pins16 += '<rect x="-30" y="' + (-58 + j * 15) + '" width="7" height="5" fill="url(#bMetalV)"/><rect x="23" y="' + (-58 + j * 15) + '" width="7" height="5" fill="url(#bMetalV)"/>';
        s += ['A', 'B', 'C', 'D'].map(function (k, i) { return lead(-62, -30, -66 + 22 * i) + '<text class="bprint" x="-72" y="' + (-78 + 22 * i + 24) + '">' + ['1', '2', '4', '8'][i] + '</text>'; }).join('') +
          'abcdefg'.split('').map(function (k, i) { return lead(62, 30, -66 + 22 * i); }).join('') + pins16 +
          '<rect x="-24" y="-66" width="48" height="126" rx="3" fill="#1a1a1a" stroke="#000"/><path d="M-6-66A6 6 0 0 0 6-66" fill="#2c2c2c"/>' +
          '<text class="bchip" transform="rotate(90)" x="-4" y="3">HC4511</text>'; break;
      case 'battery': // 9-V-Block: Kontaktseite mit Druckknoepfen, Banderole, Clip mit rot/schwarzen Litzen
        s += shadowEl(4, -14, 64, 34) + '<rect x="-62" y="-48" width="124" height="62" rx="6" fill="#161616"/>' +
          '<rect x="-36" y="-48" width="98" height="62" fill="url(#bBatWrap)"/><rect x="-36" y="-48" width="98" height="62" fill="url(#bCylV)"/>' +
          '<text class="bbig" x="13" y="-12">' + esc(Ed.valueText(p).replace(' ', '')) + '</text><text class="bpart-tiny w" x="13" y="3">ALKALINE · DQ POWER</text>' +
          '<path d="M-36-48V14" stroke="#c9a227" stroke-width="2"/>' +
          '<circle cx="-50" cy="-32" r="6.5" fill="url(#bMetal)" stroke="rgba(0,0,0,.5)"/><circle cx="-50" cy="-32" r="3" fill="#777"/>' +
          '<path d="M-50-7l6 3.5v7l-6 3.5-6-3.5v-7z" fill="url(#bMetal)" stroke="rgba(0,0,0,.5)"/>' +
          '<path d="M-50-26C-72-10-52 22-32 28" fill="none" stroke="#b71c1c" stroke-width="3.4"/><path d="M-50-26C-72-10-52 22-32 28" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>' +
          '<path d="M-50 7C-38 26 10 16 32 28" fill="none" stroke="#111" stroke-width="3.4"/><path d="M-50 7C-38 26 10 16 32 28" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1"/>' +
          '<text class="bprint red" x="-32" y="58">+</text><text class="bprint" x="32" y="58">−</text>'; break;
      case 'acsource': // kleiner Funktionsgenerator
        var wf = { square: 'M-46-22h7v-12h8v12h8v-12h8', triangle: 'M-46-22l6-12 6 12 6-12 6 12 3-6' }[q.shape] || 'M-46-28c3-9 6-9 8 0s5 9 8 0 6-9 8 0 5 9 8 0';
        s += shadowEl(4, -14, 64, 34) + '<rect x="-62" y="-50" width="124" height="68" rx="6" fill="#2a2f36" stroke="#000"/><rect x="-62" y="-50" width="124" height="10" rx="6" fill="rgba(255,255,255,.07)"/>' +
          '<rect x="-54" y="-42" width="80" height="34" rx="3" fill="#0d1a12" stroke="#000"/><rect x="-54" y="-42" width="80" height="12" fill="rgba(255,255,255,.05)"/>' +
          '<path d="' + wf + '" fill="none" stroke="#39ff14" stroke-width="1.6"/><text class="bgen" x="-8" y="-14">' + esc(Ed.fmtVal(val(p))) + 'V ' + esc(Ed.fmtVal(q.freq || 50)) + 'Hz</text>' +
          '<circle cx="44" cy="-26" r="12" fill="#1b1b1b" stroke="#000"/><circle cx="44" cy="-26" r="9" fill="url(#bMetal)"/><path d="M44-26l5-6" stroke="#222" stroke-width="2.5"/>' +
          '<rect x="-52" y="-2" width="12" height="7" rx="2" fill="#555"/><rect x="-36" y="-2" width="12" height="7" rx="2" fill="#555"/><rect x="-20" y="-2" width="12" height="7" rx="2" fill="#3a6"/>' +
          '<text class="bpart-tiny w" x="36" y="6">DQ-FG1</text>' +
          '<path d="M-52 18C-50 26-40 28-32 28M52 18C50 26 40 28 32 28" fill="none" stroke="#666" stroke-width="2"/>' +
          '<text class="bprint red" x="-32" y="58">+</text><text class="bprint" x="32" y="58">−</text>'; break;
      default:
        if (FFCHIP[p.type]) { // Flipflop-IC mit Q-Anzeige
          var fins = p.type === 'jkff' ? [['J', -32], ['C', 0], ['K', 32]] : [[p.type === 'dff' ? 'D' : 'T', -30], ['C', 30]], qOn = !!r.q, pinsF = '';
          for (var f2 = 0; f2 < 7; f2++) pinsF += '<rect x="' + (-33 + f2 * 10) + '" y="-26" width="5" height="7" rx="1" fill="url(#bMetalV)"/><rect x="' + (-33 + f2 * 10) + '" y="19" width="5" height="7" rx="1" fill="url(#bMetalV)"/>';
          s += fins.map(function (fi) { return lead(-50, -36, fi[1]) + '<text class="bprint" x="-44" y="' + (fi[1] - 12) + '">' + fi[0] + '</text>'; }).join('') + lead(50, 36, -24) + lead(50, 36, 24) +
            '<text class="bprint" x="44" y="-36">Q</text><text class="bprint" x="44" y="42">/Q</text>' + shadowEl(3, 4, 38, 22) + pinsF +
            '<rect x="-36" y="-20" width="72" height="40" rx="2" fill="#1a1a1a" stroke="#000"/><path d="M-36-5A5 5 0 0 1-36 5" fill="#2c2c2c"/>' +
            '<text class="bchip" y="4">' + FFCHIP[p.type] + '</text>' +
            '<circle cx="48" cy="-46" r="4.5" fill="' + (qOn ? '#39ff14' : '#243024') + '"' + (qOn ? ' filter="url(#bSoft)"' : '') + '/>';
          break;
        }
        if (CHIP[p.type]) { // DIP-14 im Sockel: Kerbe, Pin-1-Punkt, Beinchen, Typenbezeichnung
          var two = p.type !== 'not', pins = '';
          for (var i = 0; i < 7; i++) pins += '<rect x="' + (-33 + i * 10) + '" y="-24" width="5" height="7" rx="1" fill="url(#bMetalV)"/><rect x="' + (-33 + i * 10) + '" y="17" width="5" height="7" rx="1" fill="url(#bMetalV)"/>';
          s += (two ? lead(-40, -36, -22) + lead(-40, -36, 22) : lead(-40, -36)) + lead(40, 36) + shadowEl(3, 4, 38, 20) + pins +
            '<rect x="-36" y="-18" width="72" height="36" rx="2" fill="#1a1a1a" stroke="#000"/><rect x="-36" y="-18" width="72" height="6" fill="rgba(255,255,255,.07)"/>' +
            '<path d="M-36-5A5 5 0 0 1-36 5" fill="#2c2c2c" stroke="#000" stroke-width=".6"/><circle cx="-29" cy="11" r="1.8" fill="#333"/>' +
            '<text class="bchip" y="2">74HC' + CHIP[p.type].slice(2) + '</text><text class="bpart-tiny g" y="12">DQ</text>' +
            (r.out !== undefined ? '<circle cx="46" cy="-30" r="4" fill="' + (r.out ? '#39ff14' : '#243024') + '"' + (r.out ? ' filter="url(#bSoft)"' : '') + '/>' : '');
        }
    }
    if (r.burnt && p.type !== 'led' && p.type !== 'lamp') s += '<path d="M-14-12l8 4 2-8 6 10 6-6 2 12M-12 10l9-3" fill="none" stroke="#222" stroke-width="3"/><circle r="15" fill="rgba(40,30,20,.35)"/>';
    return s;
  }

  /* Kabelfarbe: Pluspol rot, Minuspol/Masse schwarz, sonst nach Reihenfolge */
  var CABLE = ['#2a6fdb', '#e0b400', '#2f9e44', '#8e44ad', '#e67e22'];
  function cableColor(w, i, byId) {
    function kind(pid) { var s = pid.split('.'), p = byId[s[0]]; if (!p) return ''; return p.type === 'battery' || p.type === 'acsource' ? s[1] : p.type === 'ground' ? 'n' : ''; }
    var k = kind(w.from) || kind(w.to);
    return k === 'p' ? '#d32f2f' : k === 'n' ? '#1e1e1e' : CABLE[i % CABLE.length];
  }
  function cablePath(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], sag = Math.min(110, 18 + Math.sqrt(dx * dx + dy * dy) * 0.22);
    return 'M' + a[0] + ' ' + a[1] + 'C' + (a[0] + dx * 0.15) + ' ' + (a[1] + sag) + ' ' + (b[0] - dx * 0.15) + ' ' + (b[1] + sag) + ' ' + b[0] + ' ' + b[1];
  }
  /* Bananenstecker von oben: Griffhuelse mit Rippen, stapelbare Buchse oben drauf */
  function plug(xy, col) {
    var x = xy[0], y = xy[1];
    return '<g transform="translate(' + x + ' ' + y + ')"><circle r="10" cy="2" fill="rgba(0,0,0,.35)"/><circle r="9.5" fill="' + col + '" stroke="rgba(0,0,0,.7)" stroke-width="1.3"/>' +
      '<circle r="7.2" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/><circle r="9.5" fill="url(#bRingShine)"/>' +
      '<circle r="3.6" cy="-1" fill="url(#bBrass)" stroke="rgba(0,0,0,.4)" stroke-width=".6"/><circle r="1.4" cy="-1" fill="#111"/></g>';
  }

  /* Strom in jeder Leitung: je Knoten Spannbaum ueber die Leitungen, Einspeisung je Anschluss = Strom aus dem Bauteil
   * (res.parts[id].pin); von den Blaettern her aufsummiert. Ergebnis: Strom je Leitung in Richtung from → to (A). */
  function wireCurrents(L, res) {
    var inj = {}, adj = {}, cur = L.wires.map(function () { return 0; });
    if (!res) return cur;
    L.parts.forEach(function (p) { var pr = res.parts[p.id]; if (pr && pr.pin) Object.keys(pr.pin).forEach(function (k) { inj[p.id + '.' + k] = pr.pin[k]; }); });
    L.wires.forEach(function (w, i) { (adj[w.from] = adj[w.from] || []).push([w.to, i, 1]); (adj[w.to] = adj[w.to] || []).push([w.from, i, -1]); });
    var seen = {};
    Object.keys(adj).forEach(function (root) {
      if (seen[root]) return;
      var order = [], parent = {}, queue = [root]; seen[root] = true;
      while (queue.length) { var v = queue.shift(); order.push(v); adj[v].forEach(function (e) { if (!seen[e[0]]) { seen[e[0]] = true; parent[e[0]] = [v, e[1], e[2]]; queue.push(e[0]); } }); }
      var flow = {}; // Strom, den ein Anschluss (mit seinem Teilbaum) Richtung Elternteil abgibt
      for (var k = order.length - 1; k > 0; k--) {
        var v2 = order[k], f = (inj[v2] || 0) + (flow[v2] || 0), pa = parent[v2];
        flow[pa[0]] = (flow[pa[0]] || 0) + f;
        cur[pa[1]] = pa[2] === 1 ? -f : f; // Leitung from→to: Richtung Kind→Elternteil ist to→from, wenn das Kind am to-Ende haengt
      }
    });
    return cur;
  }

  /* ---------- Messgeraete ----------
   * Lage in Werkbank-Koordinaten (Mitte); gezeichnet in Frontansicht (Gruppe mit scale(1, 1/K)). */
  var DEV = { meter: { x: 1085, y: 255 }, scope: { x: 1060, y: 610 } };
  var DIAL = [['OFF', -110, 'OFF'], ['V', -66, 'V⎓'], ['VAC', -22, 'V~'], ['A', 22, 'A⎓'], ['AAC', 66, 'A~'], ['R', 110, 'Ω']];
  function devXY(dev, lx, ly) { return [DEV[dev].x + lx, DEV[dev].y + ly / K]; } // Geraete-Koordinate → Werkbank
  function meterSvg(m) {
    var s = '<g class="bdev" data-dev="meter" transform="translate(' + DEV.meter.x + ' ' + DEV.meter.y + ') scale(1 ' + (1 / K) + ')">' +
      '<ellipse cx="6" cy="124" rx="74" ry="9" fill="rgba(0,0,0,.35)" filter="url(#bSoft2)"/>' +
      '<rect x="-75" y="-120" width="150" height="240" rx="16" fill="url(#bHolster)" stroke="#7a5a00" stroke-width="2"/>' +
      '<path d="M-68-112h20M48-112h20M-68 112h20M48 112h20" stroke="rgba(0,0,0,.18)" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="-64" y="-108" width="128" height="216" rx="10" fill="#2b2d31" stroke="#1a1b1d"/><rect x="-64" y="-108" width="128" height="20" rx="10" fill="rgba(255,255,255,.05)"/>' +
      '<text class="bdevtxt" y="-95">DQ-6000 TRMS</text>' +
      '<rect x="-56" y="-90" width="112" height="46" rx="5" fill="#15171a"/>' +
      '<rect x="-54" y="-88" width="108" height="42" rx="4" fill="' + (m.mode === 'OFF' ? '#8d977e' : '#b9c6a2') + '"/><path d="M-52-86L20-86L-10-48H-52Z" fill="rgba(255,255,255,.12)"/>' +
      '<text class="bmlcd" x="48" y="-58">' + esc(m.mode === 'OFF' ? '' : m.text) + '</text><text class="bmsub" x="-50" y="-78">' + esc(m.sub || '') + '</text>' +
      (m.mode !== 'OFF' ? '<text class="bmsub" x="-50" y="-50">' + esc(m.range ? 'MAN ' + m.range : 'AUTO') + '</text><path d="M34-84h12v6h-12zM46-82h1.5v2H46z" fill="none" stroke="#2f3a24" stroke-width=".9"/>' : '') +
      '<circle cy="10" r="46" fill="none" stroke="#3a3c40" stroke-width="1"/><circle cy="10" r="38" fill="#101010" stroke="#555" stroke-width="2"/><circle cy="10" r="38" fill="url(#bRingShine)"/>';
    DIAL.forEach(function (d) {
      var a = d[1] * Math.PI / 180, lx = Math.sin(a) * 52, ly = 10 - Math.cos(a) * 52;
      s += '<g data-dial="' + d[0] + '" class="bdial' + (m.mode === d[0] ? ' on' : '') + '"><circle class="bdialhit" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="' + (13 * HIT).toFixed(1) + '"/>' +
        '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '">' + d[2] + '</text></g>';
    });
    var cur = DIAL.filter(function (d) { return d[0] === m.mode; })[0] || DIAL[0];
    s += '<g transform="translate(0 10) rotate(' + cur[1] + ')"><rect x="-9" y="-30" width="18" height="60" rx="8" fill="#3a3a3a" stroke="#000"/><path d="M0-28V-12" stroke="#ffb000" stroke-width="4" stroke-linecap="round"/></g>';
    [['A', -40, '#c62828'], ['COM', 0, '#1a1a1a'], ['VΩ', 40, '#c62828']].forEach(function (j) {
      s += socket([j[1], 88], j[2]) + '<text class="bdevtxt" x="' + j[1] + '" y="112">' + j[0] + '</text>';
    });
    if (m.ranges) { // Bereichswahl (measureUX 'drag'): Tastenreihe unter dem Drehschalter, wie die zweite Bank eines Handmultimeters
      var n = m.ranges.length, bw = Math.min(22, 118 / n), x0 = -(n * bw) / 2;
      m.ranges.forEach(function (r, i) {
        s += '<g data-range="' + r.value + '" class="brange' + (r.on ? ' on' : '') + '"><rect x="' + (x0 + i * bw + 1).toFixed(1) + '" y="60" width="' + (bw - 2).toFixed(1) + '" height="13" rx="2.5"/>' +
          '<text x="' + (x0 + i * bw + bw / 2).toFixed(1) + '" y="69.5">' + esc(r.label) + '</text></g>';
      });
    } else s += '<text class="bdevtxt small" x="-40" y="72">10A MAX</text><text class="bdevtxt small" x="40" y="72">600V CAT III</text>';
    if (m.fuse) s += '<text class="bdevwarn" y="-34">Sicherung!</text>';
    return s + '</g>';
  }
  function scopeSvg(sc, own) { // own: eigener Tastkopf (measureUX 'drag')
    var s = '<g class="bdev" data-dev="scope" transform="translate(' + DEV.scope.x + ' ' + DEV.scope.y + ') scale(1 ' + (1 / K) + ')">' +
      '<ellipse cx="6" cy="80" rx="120" ry="9" fill="rgba(0,0,0,.35)" filter="url(#bSoft2)"/>' +
      '<rect x="-122" y="-76" width="244" height="152" rx="10" fill="url(#bScopeBody)" stroke="#1d232b" stroke-width="2"/><rect x="-122" y="-76" width="244" height="14" rx="10" fill="rgba(255,255,255,.08)"/>' +
      '<text class="bdevtxt small" x="-35" y="-67">DQ-SCOPE · 20 MHz</text>' +
      '<rect x="-114" y="-68" width="158" height="120" rx="6" fill="#1a1f25"/><rect x="-110" y="-64" width="150" height="112" rx="4" fill="#07110c"/>';
    for (var i = 1; i < 10; i++) s += '<path d="M' + (-110 + i * 15) + ' -64V48" class="bscgrid"/>';
    for (i = 1; i < 8; i++) s += '<path d="M-110 ' + (-64 + i * 14) + 'H40" class="bscgrid"/>';
    var tr = function (pts, cls) { return pts && pts.length ? '<polyline class="' + cls + '" points="' + pts.map(function (p) { return (-110 + p[0] * 150).toFixed(1) + ',' + (48 - p[1] * 112).toFixed(1); }).join(' ') + '"/>' : ''; };
    if (sc) { if (!sc.ch || sc.ch[1] !== false) s += tr(sc.pts, 'bsctrace'); if (!sc.ch || sc.ch[2] !== false) s += tr(sc.pts2, 'bsctrace bsctrace2'); if (sc.ch && sc.ch[3]) s += tr(sc.pts3, 'bsctrace bsctrace3'); }
    var ch = (sc && sc.ch) || { 1: true, 2: true };
    s += '<text class="bscinfo" x="-105" y="44">' + esc(sc && sc.info ? sc.info : own ? 'CH1: Tastkopf anschliessen · RUN' : 'CH1 = Messspitzen · RUN') + '</text>' +
      (own ? '<g data-scope="ch1" class="bscch' + (ch[1] !== false ? ' on' : '') + '"><rect x="-110" y="54" width="30" height="12" rx="3"/><circle cx="-103" cy="60" r="2.6" class="bscled1"/><text x="-90" y="63">CH1</text></g>' +
             '<g data-scope="ch2" class="bscch' + (ch[2] !== false ? ' on' : '') + '"><rect x="-76" y="54" width="30" height="12" rx="3"/><circle cx="-69" cy="60" r="2.6" class="bscled2"/><text x="-56" y="63">CH2</text></g>' +
             '<g data-scope="math" class="bscch' + (ch[3] ? ' on' : '') + '"><title>MATH = CH1 − CH2 (Differenz, potentialfrei)</title><rect x="-42" y="54" width="36" height="12" rx="3"/><circle cx="-35" cy="60" r="2.6" class="bscled3"/><text x="-19" y="63">MATH</text></g>' : '') +
      '<path d="M-110-64L-30-64L-95 48H-110Z" fill="rgba(255,255,255,.04)"/>' +
      '<circle cx="70" cy="-44" r="13" fill="#1b1b1b"/><circle cx="70" cy="-44" r="11" fill="url(#bMetal)" stroke="#000"/><path d="M70-44l0-9" stroke="#222" stroke-width="2"/>' +
      '<circle cx="102" cy="-44" r="13" fill="#1b1b1b"/><circle cx="102" cy="-44" r="11" fill="url(#bMetal)" stroke="#000"/><path d="M102-44l6-6" stroke="#222" stroke-width="2"/>' +
      '<rect x="56" y="-14" width="12" height="6" rx="1.5" fill="#666"/><rect x="72" y="-14" width="12" height="6" rx="1.5" fill="#666"/><rect x="88" y="-14" width="12" height="6" rx="1.5" fill="#666"/><rect x="104" y="-14" width="12" height="6" rx="1.5" fill="#c9a227"/>' +
      '<text class="bdevtxt" x="70" y="-24">Y</text><text class="bdevtxt" x="102" y="-24">X</text>' +
      '<g data-scope="run" class="bscrun"><rect x="56" y="0" width="58" height="24" rx="5"/><text x="85" y="16">RUN</text></g>' +
      socket([85, 50], '#1a1a1a') + '<text class="bdevtxt" x="60" y="54">CH1</text>' + (own ? socket([110, 50], '#1a1a1a') + '<text class="bdevtxt" x="122" y="66">CH2</text>' : '');
    return s + '</g>';
  }
  /* Parkplaetze der Messspitzen (Werkbank-Koordinaten): Multimeter rot/schwarz vor dem Geraet, Tastkopf und Erdungsclip vor dem Oszilloskop */
  var PARK = { a: function () { return devXY('meter', -54, 200); }, b: function () { return devXY('meter', -2, 200); },
    tip: function () { return devXY('scope', -70, 118); }, gnd: function () { return devXY('scope', -14, 118); }, tip2: function () { return devXY('scope', 42, 118); } };
  Bench.PARK = PARK;
  function probeSvg(tip, col, park, which, grab) { // Pruefspitze: Metallspitze am Anschluss, Fingerschutz, Griff schraeg nach oben rechts
    var x = tip[0], y = tip[1];
    return '<g class="bprobe' + (park ? ' parked' : '') + (grab ? ' grab' : '') + '"' + (which ? ' data-probe="' + which + '"' : '') + '>' +
      (grab ? '<circle class="bprobehit" cx="' + (x + 22) + '" cy="' + (y - 44) + '" r="' + (30 * HIT).toFixed(1) + '"/>' : '') +
      '<g pointer-events="none">' + // nur der Griff (bprobehit) ist greifbar – der Spitzenkoerper darf keine Buchsen verdecken
      '<path d="M' + x + ' ' + y + 'l17 -32" stroke="#d0d4d6" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M' + (x + 12) + ' ' + (y - 27) + 'l10 -5" stroke="' + col + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + (x + 16) + ' ' + (y - 30) + 'l22 -40" stroke="' + col + '" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M' + (x + 15) + ' ' + (y - 33) + 'l20 -36" stroke="rgba(255,255,255,.3)" stroke-width="2" stroke-linecap="round"/></g></g>';
  }

  /* Farbverlaeufe, Muster und Filter der Werkbank – gemeinsam fuer den Renderer und die freistehenden Bilder (icon) */
  var DEFS = '<defs>' +
      '<linearGradient id="bBlock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ebef"/><stop offset=".55" stop-color="#cbd3d9"/><stop offset="1" stop-color="#b0bbc3"/></linearGradient>' +
      '<linearGradient id="bSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e99a1"/><stop offset="1" stop-color="#6b757c"/></linearGradient>' +
      '<linearGradient id="bResBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecd9b8"/><stop offset="1" stop-color="#c7aa7c"/></linearGradient>' +
      '<linearGradient id="bCyl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
      '<linearGradient id="bCylV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
      '<linearGradient id="bBatWrap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f4fa8"/><stop offset=".6" stop-color="#2f6fd6"/><stop offset="1" stop-color="#244f9e"/></linearGradient>' +
      '<linearGradient id="bMetalV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f2f2"/><stop offset=".5" stop-color="#a4aaaf"/><stop offset="1" stop-color="#666b6f"/></linearGradient>' +
      '<linearGradient id="bHolster" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc928"/><stop offset=".5" stop-color="#f2b705"/><stop offset="1" stop-color="#c99600"/></linearGradient>' +
      '<linearGradient id="bScopeBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#48546a"/><stop offset="1" stop-color="#2f3847"/></linearGradient>' +
      '<radialGradient id="bBrass" cx=".35" cy=".35"><stop offset="0" stop-color="#fff1b8"/><stop offset=".6" stop-color="#c9a227"/><stop offset="1" stop-color="#7a5e10"/></radialGradient>' +
      '<radialGradient id="bMetal" cx=".35" cy=".35"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".7" stop-color="#9da3a8"/><stop offset="1" stop-color="#5d6266"/></radialGradient>' +
      '<radialGradient id="bRedCap" cx=".35" cy=".35"><stop offset="0" stop-color="#ff7a6e"/><stop offset=".6" stop-color="#d32f2f"/><stop offset="1" stop-color="#8e1717"/></radialGradient>' +
      '<radialGradient id="bLens" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>' +
      '<radialGradient id="bRingShine" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>' +
      '<radialGradient id="bGlow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffcf4a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="bVignette" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>' +
      '<pattern id="bGY" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#2e9d44"/><rect width="3" height="6" fill="#e3c21b"/></pattern>' +
      '<pattern id="bMat" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="#35645a"/>' +
        '<path d="M50 0H0V50" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1.5"/><path d="M25 0V50M0 25H50" stroke="rgba(255,255,255,.03)" stroke-width="1"/>' +
        '<circle cx="12" cy="37" r=".8" fill="rgba(0,0,0,.18)"/><circle cx="38" cy="14" r=".7" fill="rgba(255,255,255,.06)"/></pattern>' +
      '<pattern id="bGrain" width="420" height="90" patternUnits="userSpaceOnUse"><rect width="420" height="90" fill="url(#bWood)"/>' +
        '<path d="M0 12C80 6 160 20 240 12S380 4 420 12M0 34C90 40 170 28 260 36S370 42 420 34M0 58C70 52 150 64 230 56S360 50 420 58M0 80C100 86 190 74 280 82S380 88 420 80" fill="none" stroke="rgba(60,35,15,.22)" stroke-width="1.6"/>' +
        '<path d="M0 22C110 18 200 28 300 22S400 18 420 22M0 70C120 74 220 64 320 70S400 74 420 70" fill="none" stroke="rgba(255,230,190,.08)" stroke-width="2.5"/>' +
        '<ellipse cx="300" cy="46" rx="14" ry="5" fill="none" stroke="rgba(60,35,15,.25)" stroke-width="1.2"/></pattern>' +
      '<linearGradient id="bWood" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#8b6a47"/><stop offset=".5" stop-color="#a07c55"/><stop offset="1" stop-color="#7d5e3e"/></linearGradient>' +
      '<linearGradient id="bEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4c2f"/><stop offset="1" stop-color="#3e2a18"/></linearGradient>' +
      '<filter id="bShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="5" dy="10" stdDeviation="5" flood-color="#000" flood-opacity=".45"/></filter>' +
      '<filter id="bCable" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="2" dy="6" stdDeviation="3" flood-color="#000" flood-opacity=".4"/></filter>' +
      '<filter id="bBlur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="9"/></filter>' +
      '<filter id="bSoft" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="1.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="bSoft2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>' +
      '</defs>';

  /* Freistehendes Werkbank-Bild eines Bauteiltyps als eigenes <svg> (Datenblatt, spaeter Theorie-Bilder): dieselbe Illustration
   * wie auf dem Tisch (illus), ohne Simulationswerte, mit Seitenkante und Tischneigung K. Bringt eigene <defs> mit eindeutigen
   * IDs mit – Verlaeufe aus der ausgeblendeten Werkbank wuerden sonst nicht gezeichnet. */
  var iconSeq = 0;
  function icon(type, props, value) {
    var sz = size(type), w = sz[0], h = sz[1], pad = 16, n = 'i' + (++iconSeq);
    var p = { type: type, props: props || {} }; if (value !== undefined) p.value = value;
    var body = '<g transform="translate(' + (w / 2 + pad) + ' ' + ((h / 2 + pad) * K) + ') scale(1 ' + K + ')">' +
      '<rect class="bside" x="' + (-w / 2) + '" y="' + (-h / 2 + 10) + '" width="' + w + '" height="' + h + '" rx="9" style="fill:url(#bSide)"/>' +
      '<g filter="url(#bShadow)">' + illus(p).replace('class="bblock"', 'class="bblock" style="fill:url(#bBlock)"') + '</g></g>';
    var out = nsIds(DEFS + body, n);
    return '<svg class="benchicon" viewBox="0 0 ' + (w + 2 * pad) + ' ' + ((h + 2 * pad + 10) * K) + '" aria-hidden="true">' + out + '</svg>';
  }

  /* Jede Werkbank-Instanz bekommt ein eigenes Praefix fuer alle Verlaufs-, Muster- und Filter-IDs (w1bBrass, w2bBrass …):
   * Spiel-Werkbank, Tutorial-Werkbank und Mini-Schaltungen der Theorie stehen gleichzeitig im Dokument – bei gleichen IDs
   * loest der Browser url(#bBrass) auf die erste (evtl. ausgeblendete) Definition auf und die Illustration wird flach/schwarz. */
  var benchSeq = 0;
  function nsIds(html, n) { return html.replace(/(id="|url\(#|href="#)b([A-Z])/g, '$1' + n + 'b$2'); }
  function Bench(svg, opts) {
    this.svg = svg; this.opts = opts || {}; this.ns = 'w' + (++benchSeq);
    this.core = this.opts.core || new Circuit(this.opts);
    this.sim = null; this.showVolt = false; this.mouse = [0, 0]; this.dirty = true;
    this.meter = { mode: 'OFF', text: 'OFF' }; this.scope = null; this.refMark = null; this.showFlow = false; this._anim = 0; this._phase = 0;
    this.dragUX = false; this._grab = null; this._snap = null; // Ziehen der Messspitzen (measureUX 'drag')
    this.view = [0, 0, W, W * 0.62]; // gleiches Seitenverhaeltnis wie das Schema (1000 × 620), damit die Flaeche gleich gross bleibt
    svg.setAttribute('viewBox', this.view.join(' '));
    this.core.attach(this);
    this._bind();
  }
  Bench.GEO = GEO; Bench.K = K; Bench.illus = illus; Bench.DEV = DEV; Bench.wireCurrents = wireCurrents; Bench.icon = icon;

  Bench.prototype._hidden = function () { return !this.svg.getClientRects().length; };
  Bench.prototype.pinPos = function (part, pin) {
    var q = this.core.pos(part, 'bench'), o = rotPt(GEO[part.type][pin], q.rot);
    return [q.x + o[0], q.y + o[1]];
  };
  /* Ansicht auf die Bausteine und die im bench-Layout vorgesehenen Plaetze einpassen (Bildschirm = Werkbank mit y · K) */
  Bench.prototype.fit = function () {
    if (this._hidden()) { this.dirty = true; return; }
    var self = this, core = this.core, x0 = 400, y0 = 240, x1 = 800, y1 = 520;
    var q = core.layout.parts.map(function (p) { return core.pos(p, 'bench'); });
    if (!this.opts.tight) q.push({ x: DEV.meter.x + 20, y: DEV.meter.y - 100 }, { x: DEV.scope.x + 60, y: DEV.scope.y + 60 }); // Messgeraete immer im Bild (nicht in der Mini-Schaltung)
    if (!this.opts.tight) Object.keys(core.benchHints).forEach(function (id) { q.push(core.benchHints[id]); });
    if (q.length) {
      x0 = Math.min.apply(null, q.map(function (p) { return p.x; })); x1 = Math.max.apply(null, q.map(function (p) { return p.x; }));
      y0 = Math.min.apply(null, q.map(function (p) { return p.y; })); y1 = Math.max.apply(null, q.map(function (p) { return p.y; }));
    }
    var box = this.svg.getBoundingClientRect(), small = box.width && box.width < 600;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 * K + 10;
    var tight = this.opts.tight, w = Math.max(tight ? 300 : small ? 440 : 760, x1 - x0 + (tight ? 220 : small ? 220 : 340)), h = Math.max(tight ? 200 : small ? 260 : 420, (y1 - y0) * K + (tight ? 190 : small ? 200 : 300));
    var ar = box.width && box.height ? box.width / box.height : W / (H * K);
    if (w / h < ar) w = h * ar; else h = w / ar;
    this.view = [cx - w / 2, cy - h / 2, w, h];
    this.svg.setAttribute('viewBox', this.view.join(' '));
    this.dirty = true; this.render();
  };
  Bench.prototype.setSim = function (sim) { this.sim = sim; this.render(); };
  /* Neues Bauteil in der Mitte des sichtbaren Ausschnitts */
  Bench.prototype.addPart = function (type) {
    var v = this.view, p = this.core.addPart(type, v[0] + v[2] / 2, (v[1] + v[3] / 2) / K, 'bench'), sz = size(type);
    if (p.bench.x - sz[0] / 2 < v[0] || p.bench.x + sz[0] / 2 > v[0] + v[2] || (p.bench.y - sz[1] / 2) * K < v[1] || (p.bench.y + sz[1] / 2) * K > v[1] + v[3]) this.fit();
    return p;
  };
  Bench.prototype.removeSelected = function () { return this.core.removeSelected(); };
  Bench.prototype.rotateSelected = function () { this.core.rotateSelected('bench'); };
  Bench.prototype.key = function (ev) { this.core.key(ev); };

  /* Bildschirm → Werkbank-Koordinaten (ueber die gestauchte Szene) */
  Bench.prototype._pt = function (ev) {
    var sc = this.svg.querySelector('.bscene') || this.svg, m = sc.getScreenCTM(); if (!m) return [0, 0];
    var pt = this.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var r = pt.matrixTransform(m.inverse()); return [r.x, r.y];
  };
  Bench.prototype._bind = function () {
    var self = this, svg = this.svg, core = this.core;
    svg.addEventListener('pointerdown', function (ev) {
      var pr = self.dragUX && ev.target.closest('[data-probe]');
      if (pr) { // Messspitze greifen: ab jetzt folgt sie dem Zeiger
        ev.preventDefault(); ev.stopPropagation();
        var w = pr.dataset.probe, xy0 = self._pt(ev);
        self._snap = null; self._grab = { which: w, id: ev.pointerId }; svg.classList.add('probing');
        core.dragProbeTo(w, xy0);
        try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ }
        return;
      }
      var dv = ev.target.closest('[data-dial],[data-range],[data-scope],[data-dev]');
      if (dv) { // Messgeraete: Drehschalter, Bereichstasten, RUN-Taste; Gehaeuse selbst ohne Wirkung
        ev.preventDefault();
        if (dv.dataset.dial && self.opts.onDial) self.opts.onDial(dv.dataset.dial);
        if (dv.dataset.range && self.opts.onRange) self.opts.onRange(dv.dataset.range);
        if (dv.dataset.scope && self.opts.onScope) self.opts.onScope(dv.dataset.scope); // 'run' | 'ch1' | 'ch2'
        return;
      }
      if (ev.isPrimary !== false) touches = {}; // neue Geste: haengengebliebene Zeiger vergessen
      if (ev.pointerType === 'touch') touches[ev.pointerId] = [ev.clientX, ev.clientY]; // Zoom nur mit zwei Fingern, nie mit der Maus
      if (Object.keys(touches).length === 2) { // zweiter Finger: Zoom statt Bedienung
        pan = null; if (core.drag) { core.drag = null; }
        var tp = Object.keys(touches).map(function (k) { return touches[k]; });
        pinch = { d: Math.hypot(tp[0][0] - tp[1][0], tp[0][1] - tp[1][1]), view: self.view.slice(), c: [(tp[0][0] + tp[1][0]) / 2, (tp[0][1] + tp[1][1]) / 2] };
        return;
      }
      var t = ev.target.closest('[data-pin],[data-part],[data-wire]'), xy = self._pt(ev);
      if (t && t.dataset.pin) { ev.preventDefault(); if (self.dragUX) core.connectPin(t.dataset.pin); else core.clickPin(t.dataset.pin); return; } // dragUX: Klick verbindet immer, Spitzen werden gezogen
      if (t && t.dataset.wire !== undefined) { core.clickWire(+t.dataset.wire); return; }
      if (t && t.dataset.part) { if (core.pressPart(t.dataset.part, xy, 'bench')) svg.setPointerCapture(ev.pointerId); return; }
      // leere Tischflaeche: Ziehen verschiebt den Ausschnitt, ein Klick hebt die Auswahl auf (Mini-Schaltung: fester Ausschnitt)
      if (self.opts.tight) return;
      pan = { x: ev.clientX, y: ev.clientY, view: self.view.slice(), moved: false };
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ }
    });
    svg.addEventListener('pointermove', function (ev) {
      if (self._grab) { if (ev.pointerId === self._grab.id) core.dragProbeTo(self._grab.which, self._pt(ev)); return; }
      if (touches[ev.pointerId]) touches[ev.pointerId] = [ev.clientX, ev.clientY];
      if (pinch && Object.keys(touches).length === 2) {
        var tp = Object.keys(touches).map(function (k) { return touches[k]; }), d = Math.hypot(tp[0][0] - tp[1][0], tp[0][1] - tp[1][1]);
        if (d > 10) { self.view = pinch.view.slice(); self.zoomAt(pinch.d / d, pinch.c[0], pinch.c[1]); }
        return;
      }
      if (pan) {
        var dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) pan.moved = true;
        if (pan.moved) { var f = pan.view[2] / (svg.getBoundingClientRect().width || 1); self.setView([pan.view[0] - dx * f, pan.view[1] - dy * f, pan.view[2], pan.view[3]]); }
        return;
      }
      var xy = self._pt(ev); self.mouse = xy;
      if (core.drag) core.dragTo(xy);
      else if (core.wireStart) self.render();
    });
    function up(ev) {
      if (self._grab) { // Spitze losgelassen: Buchse unter dem Zeiger? sonst zurueck auf den Parkplatz
        var g = self._grab; self._grab = null; svg.classList.remove('probing');
        var xy = self._pt(ev), hitPin = self.pinAt(xy, 26 * HIT);
        if (hitPin) core.dropProbe(g.which, hitPin);
        else { self._snapBack(g.which, xy); core.dropProbe(g.which, null); }
        return;
      }
      delete touches[ev.pointerId];
      if (pinch) { if (Object.keys(touches).length < 2) pinch = null; return; }
      if (pan) { var wasPan = pan.moved; pan = null; if (!wasPan) core.clickEmpty(); return; }
      core.release();
    }
    var pan = null, pinch = null, touches = {};
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', function (ev) { // Strg/⌘ + Mausrad: zur Mausposition hin zoomen; ohne Taste scrollt die Seite weiter (Feedback: „Werkbank rauf und runter“)
      if (self.opts.tight || !(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      self.zoomAt(Math.exp(ev.deltaY * 0.0015), ev.clientX, ev.clientY);
    }, { passive: false });
  };
  /* Naechste Buchse zu xy (Werkbank-Koordinaten) innerhalb r, sonst null */
  Bench.prototype.pinAt = function (xy, r) {
    var best = null, bd = r * r, self = this;
    this.core.layout.parts.forEach(function (p) {
      Object.keys(GEO[p.type]).forEach(function (pin) {
        var q = self.pinPos(p, pin), d = (q[0] - xy[0]) * (q[0] - xy[0]) + (q[1] - xy[1]) * (q[1] - xy[1]);
        if (d < bd) { bd = d; best = p.id + '.' + pin; }
      });
    });
    return best;
  };
  /* Spitze faellt in ~0,25 s vom Loslasspunkt zurueck auf den Parkplatz */
  Bench.prototype._snapBack = function (which, from) {
    var self = this, park = PARK[which](), t0 = performance.now(), D = 250;
    this._snap = { which: which, from: from, to: park, t0: t0 };
    function tick(now) {
      var s = self._snap; if (!s || s.t0 !== t0) return;
      var k = Math.min(1, (now - t0) / D), e = 1 - (1 - k) * (1 - k);
      s.pos = [s.from[0] + (s.to[0] - s.from[0]) * e, s.from[1] + (s.to[1] - s.from[1]) * e - Math.sin(k * Math.PI) * 30];
      if (k < 1) { self.render(); requestAnimationFrame(tick); } else { self._snap = null; self.render(); }
    }
    requestAnimationFrame(tick);
  };
  /* Ausschnitt setzen (Bildschirm-Koordinaten der Szene), in sinnvollen Grenzen */
  Bench.prototype.setView = function (v) {
    var w = Math.max(360, Math.min(2600, v[2])), h = v[3] * w / v[2];
    var x = Math.max(-600, Math.min(W + 600 - w, v[0])), y = Math.max(-500, Math.min(H * K + 300 - h, v[1]));
    this.view = [x, y, w, h];
    this.svg.setAttribute('viewBox', this.view.join(' '));
    this.render();
  };
  /* Zoomen um Faktor f (>1 = weiter weg) mit festem Punkt unter dem Zeiger (Client-Koordinaten) */
  Bench.prototype.zoomAt = function (f, cx, cy) {
    var box = this.svg.getBoundingClientRect(), v = this.view; if (!box.width) return;
    var px = v[0] + (cx - box.left) / box.width * v[2], py = v[1] + (cy - box.top) / box.height * v[3];
    var w = Math.max(360, Math.min(2600, v[2] * f)), k = w / v[2];
    this.setView([px - (px - v[0]) * k, py - (py - v[1]) * k, w, v[3] * k]);
  };

  Bench.prototype.render = function () {
    if (this._hidden()) { this.dirty = true; return; }
    this.dirty = false;
    var self = this, core = this.core, L = core.layout, res = this.sim && this.sim.res, pinNode = this.sim && this.sim.pinNode;
    var vmax = 0; if (res) Object.keys(res.nodeV).forEach(function (n) { vmax = Math.max(vmax, res.nodeV[n]); });
    var hot = {}; ((res && res.faults) || []).forEach(function (f) { if (f.part && /SHORT|OVERLOAD/.test(f.code)) hot[f.part] = f.code; if (f.code === 'OUTPUT_CLASH') f.parts.forEach(function (id) { hot[id] = f.code; }); });
    function nodeV(pid) { return res && pinNode && pinNode[pid] !== undefined ? res.nodeV[pinNode[pid]] || 0 : undefined; }
    function wcol(pid) { var v = self.showVolt ? nodeV(pid) : undefined; return v === undefined ? null : Ed.voltColor(v, vmax); }
    var byId = {}; L.parts.forEach(function (p) { byId[p.id] = p; });
    var wi = this.showFlow ? wireCurrents(L, res) : [];
    var used = {}; L.wires.forEach(function (w) { used[w.from] = (used[w.from] || 0) + 1; used[w.to] = (used[w.to] || 0) + 1; });
    function pp(pid) { var s = pid.split('.'); return byId[s[0]] ? self.pinPos(byId[s[0]], s[1]) : [0, 0]; }
    var boxW = this.svg.getBoundingClientRect().width || 0; HIT = boxW && boxW < 600 ? Math.max(1, (this.view[2] / boxW) * 12 / 14) : 1; // nur auf kleinen Bildschirmen (Handy): Buchsen ≥ 24 px, sonst stören grosse Kreise dichte Logik-Layouts
    var h = [];
    h.push(DEFS);
    // Tisch (Holz mit Maserung) und Tischkante vorne
    h.push('<rect class="btable" x="-2000" y="-2000" width="' + (W + 4000) + '" height="' + (2000 + H * K + 20) + '" fill="url(#bGrain)"/>' +
      '<rect x="-2000" y="' + (H * K + 20) + '" width="' + (W + 4000) + '" height="28" fill="url(#bEdge)"/><path d="M-2000 ' + (H * K + 20.5) + 'H' + (W + 2000) + '" stroke="rgba(255,220,170,.25)" stroke-width="1.5"/>' +
      '<rect x="-2000" y="' + (H * K + 48) + '" width="' + (W + 4000) + '" height="2000" fill="#1b1612"/>');
    h.push('<g class="bscene" transform="scale(1 ' + K + ')">');
    var rl = ''; for (var rx = 50; rx < W; rx += 10) rl += 'M' + rx + ' 8V' + (rx % 100 === 0 ? 22 : rx % 50 === 0 ? 17 : 13);
    h.push('<rect x="6" y="10" width="' + W + '" height="' + H + '" rx="14" fill="rgba(0,0,0,.35)" filter="url(#bSoft2)"/>' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="14" fill="url(#bMat)" stroke="#23443c" stroke-width="3"/>' +
      '<rect x="10" y="10" width="' + (W - 20) + '" height="' + (H - 20) + '" rx="10" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1.5" stroke-dasharray="2 6"/>' +
      '<path d="' + rl + '" stroke="rgba(255,255,255,.25)" stroke-width="1.2"/>' +
      '<text class="bmatprint" x="24" y="' + (H - 22) + '">DIGITAL QUEST · LABOR · ESD</text>' +
      '<g transform="translate(' + (W - 30) + ' ' + (H - 28) + ')"><circle r="9" fill="url(#bMetal)" stroke="rgba(0,0,0,.5)"/><circle r="4" fill="#8a8f93"/></g>');
    // Bausteine
    L.parts.forEach(function (p) {
      var q = core.pos(p, 'bench'), r = res && res.parts[p.id], sel = core.sel === p.id, sz = size(p.type), rot = q.rot || 0;
      var hw = (rot % 180 ? sz[1] : sz[0]) / 2, hh = (rot % 180 ? sz[0] : sz[1]) / 2, vt = Ed.valueText(p);
      var tip = Ed.partTip(p, r);
      h.push('<g class="bpart' + (sel ? ' selected' : '') + (core.locked[p.id] ? ' locked' : '') + '" data-part="' + p.id + '" transform="translate(' + q.x + ' ' + q.y + ')">' +
        '<title>' + esc(tip) + '</title>' +
        '<rect class="bside" x="' + (-hw) + '" y="' + (-hh + 10) + '" width="' + (2 * hw) + '" height="' + (2 * hh) + '" rx="9"/>' +
        '<g filter="url(#bShadow)" transform="rotate(' + rot + ')">' + illus(p, r, hot[p.id]) + '</g>' +
        (hot[p.id] ? '<g class="bsmoke" transform="scale(1 ' + (1 / K) + ')"><path d="M-8 ' + (-hh * K) + 'c-8-14 8-22 0-36s8-22 0-34"/><path d="M8 ' + (-hh * K) + 'c8-12-6-20 2-32s-6-18 2-28"/></g>' : '') +
        (sel ? '<rect class="bsel" x="' + (-hw - 7) + '" y="' + (-hh - 7) + '" width="' + (2 * hw + 14) + '" height="' + (2 * hh + 14) + '" rx="12"/>' : '') +
        '<g transform="scale(1 ' + (1 / K) + ')"><text class="blbl" y="' + ((-hh - 9) * K) + '">' + esc(p.id) + (vt ? ' · ' + esc(vt) : '') + '</text></g>' +
        '</g>');
    });
    // Laborkabel
    L.wires.forEach(function (w, i) {
      var a = pp(w.from), b = pp(w.to), d = cablePath(a, b), col = wcol(w.from) || cableColor(w, i, byId), sel = core.sel === 'w:' + i, iw = wi[i] || 0;
      h.push('<g data-wire="' + i + '" class="bwire' + (sel ? ' selected' : '') + '"><path class="bwirehit" d="' + d + '"/>' +
        '<g filter="url(#bCable)">' + (sel ? '<path d="' + d + '" fill="none" stroke="#ffb000" stroke-width="14" stroke-linecap="round" opacity=".8"/>' : '') +
        '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="8" stroke-linecap="round"/>' +
        '<path class="bcore" data-i="' + iw.toExponential(3) + '" d="' + d + '" fill="none" stroke="' + col + '" stroke-width="5.5" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5" transform="translate(-1 -1.5)"/>' +
        plug(a, col) + plug(b, col) + '</g></g>');
    });
    // Stromfluss: Punkte (werden animiert) und Stromwert an jedem Kabel
    if (this.showFlow) {
      h.push('<g class="bflow" pointer-events="none"></g>');
      L.wires.forEach(function (w, i) {
        if (Math.abs(wi[i] || 0) < 1e-6) return;
        var a = pp(w.from), b = pp(w.to), dx = b[0] - a[0], dy = b[1] - a[1], sag = Math.min(110, 18 + Math.sqrt(dx * dx + dy * dy) * 0.22);
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag * 0.75;
        h.push('<g transform="translate(' + mx + ' ' + my + ') scale(1 ' + (1 / K) + ')" pointer-events="none"><text class="bilabel">' + E.fmt(Math.abs(wi[i]), 'A') + '</text></g>');
      });
    }
    // Buchsen (Klickflaechen, oben)
    L.parts.forEach(function (p) {
      Object.keys(GEO[p.type]).forEach(function (pin) {
        var pid = p.id + '.' + pin, xy = self.pinPos(p, pin), v = nodeV(pid), col = wcol(pid);
        h.push('<g data-pin="' + pid + '"><circle class="bpinhit" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (14 * HIT).toFixed(1) + '"><title>' + pid + (v !== undefined ? ' – ' + E.fmt(v, 'V') + ' gegen ' + ((self.sim && self.sim.ref) || 'den Bezugspunkt') : '') + (self.refMark === pid ? ' – Bezugspunkt 0 V (Oszilloskop ohne Erdungsclip misst hiergegen)' : '') + '</title></circle>' +
          '<circle class="bpin' + (core.wireStart === pid ? ' active' : '') + (used[pid] ? ' used' : '') + '" cx="' + xy[0] + '" cy="' + xy[1] + '" r="12"' + (col ? ' style="stroke:' + col + '"' : '') + '/></g>');
        if (col && pin !== 'g' && used[pid]) h.push('<g transform="translate(' + (xy[0] + 12) + ' ' + (xy[1] - 14) + ') scale(1 ' + (1 / K) + ')"><text class="bvlabel">' + E.fmt(v, 'V') + '</text></g>');
        if (self.refMark === pid) h.push('<g class="brefmark" transform="translate(' + (xy[0] - 14) + ' ' + (xy[1] + 22) + ') scale(1 ' + (1 / K) + ')" pointer-events="none"><text>⏚ 0 V</text></g>'); // G1: Bezugspunkt sichtbar, solange ohne Erdungsclip gemessen wird
      });
    });
    // Kabel im Entstehen
    if (core.wireStart && byId[core.wireStart.split('.')[0]]) {
      var a = pp(core.wireStart);
      h.push('<path class="bwire pending" d="' + cablePath(a, this.mouse) + '"/>');
    }
    // Messgeraete mit Messkabeln: rot aus VΩ (bzw. A im Strombereich), schwarz aus COM; nicht gesetzte Spitzen liegen vor dem Geraet.
    // dragUX: Spitzen sind greifbar (data-probe), waehrend des Ziehens haengt die Spitze am Zeiger; dazu Tastkopf und Erdungsclip des Oszilloskops (CH1)
    h.push(scopeSvg(this.scope, this.dragUX), meterSvg(this.meter));
    var dg = core.dragProbe, sn = this._snap, drag = this.dragUX;
    var cables = [['a', '#d32f2f', devXY('meter', this.meter.mode === 'A' ? -40 : 40, 88)], ['b', '#1e1e1e', devXY('meter', 0, 88)]];
    if (drag) cables.push(['tip', '#e6b400', devXY('scope', 85, 50)], ['gnd', '#1e1e1e', devXY('scope', 85, 50)], ['tip2', '#38bdf8', devXY('scope', 110, 50)]); // CH2: blauer Tastkopf, gemeinsamer Erdungsclip
    cables.forEach(function (k) {
      var which = k[0], scopeP = which === 'tip' || which === 'gnd' || which === 'tip2', pid = scopeP ? core.scopeProbes[which] : core.probes[which], set = pid && byId[pid.split('.')[0]];
      var tip = dg && dg.which === which ? [dg.x, dg.y] : sn && sn.which === which && sn.pos ? sn.pos : set ? pp(pid) : drag ? PARK[which]() : devXY('meter', (which === 'a' ? -34 : 18) - 20, 200);
      var jack = k[2], grip = [tip[0] + 38, tip[1] - 70];
      h.push('<g class="bmcable' + (scopeP ? ' bscable' : '') + '" filter="url(#bCable)" pointer-events="none"><path d="' + cablePath(jack, grip) + '" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="' + cablePath(jack, grip) + '" fill="none" stroke="' + k[1] + '" stroke-width="4" stroke-linecap="round"/>' + plug(jack, k[1]) + '</g>');
      h.push('<g class="bprobelayer"' + (drag ? '' : ' pointer-events="none"') + ' filter="url(#bCable)">' + probeSvg(tip, k[1], !set && !(dg && dg.which === which), drag ? which : null, drag) + '</g>');
    });
    h.push('</g>');
    h.push('<rect x="' + this.view[0] + '" y="' + this.view[1] + '" width="' + this.view[2] + '" height="' + this.view[3] + '" fill="url(#bVignette)" pointer-events="none"/>');
    // Fuellungen der Bausteinbloecke inline (nicht per CSS), damit sie das Instanz-Praefix mitbekommen
    this.svg.innerHTML = nsIds(h.join('').replace(/class="bblock"/g, 'class="bblock" style="fill:url(#bBlock)"').replace(/class="bside"/g, 'class="bside" style="fill:url(#bSide)"'), this.ns);
    this._animSetup();
  };
  /* Animationen ohne Neuzeichnen: wandernde Punkte auf den Kabeln (technische Stromrichtung, Tempo ~ log(Strom)),
   * drehende Motoren. Laeuft nur, solange es etwas zu bewegen gibt. */
  Bench.prototype._animSetup = function () {
    var self = this, svg = this.svg;
    if (!this._phase) this._phase = 0;
    var flows = [], spins = [];
    if (this.showFlow) {
      var layer = svg.querySelector('.bflow');
      svg.querySelectorAll('.bcore').forEach(function (p) {
        var i = parseFloat(p.getAttribute('data-i')); if (!(Math.abs(i) >= 1e-6)) return;
        var len = p.getTotalLength(), n = Math.max(2, Math.round(len / 36)), dots = [];
        for (var k = 0; k < n; k++) { var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '3.2'); c.setAttribute('class', 'bdot'); layer.appendChild(c); dots.push(c); }
        flows.push({ p: p, len: len, dots: dots, dir: i > 0 ? 1 : -1, v: 25 + 30 * Math.log10(1 + Math.abs(i) / 1e-4) });
      });
    }
    svg.querySelectorAll('.bspin').forEach(function (g) { var v = parseFloat(g.getAttribute('data-spin')); if (Math.abs(v) > 0.02) spins.push({ g: g.firstChild, v: v }); });
    this._flows = flows; this._spins = spins;
    if ((flows.length || spins.length) && !this._anim) {
      var last = performance.now();
      var tick = function (now) {
        var dt = Math.min(0.1, (now - last) / 1000); last = now; self._phase += dt;
        if ((!self._flows.length && !self._spins.length) || !svg.getClientRects().length) { self._anim = 0; return; } // nichts zu tun oder ausgeblendet
        self._flows.forEach(function (f) {
          var gap = f.len / f.dots.length, off = (self._phase * f.v) % gap;
          f.dots.forEach(function (c, k) {
            var d = (k * gap + off) % f.len; if (f.dir < 0) d = f.len - d;
            var pt = f.p.getPointAtLength(d); c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1));
          });
        });
        self._spins.forEach(function (sp) { sp.g.setAttribute('transform', 'rotate(' + ((self._phase * 720 * sp.v) % 360).toFixed(1) + ')'); });
        self._anim = requestAnimationFrame(tick);
      };
      this._anim = requestAnimationFrame(tick);
    }
  };

  root.DQBench = Bench;
})(typeof window !== 'undefined' ? window : globalThis);

/* Digital Quest – Schaltplan-Editor (window.DQEditor)
 * SVG, Raster 20 px, Bauteile nach IEC/DIN-Symbolik. Live-Simulation: Die App uebergibt
 * nach jeder Aenderung das Ergebnis (setSim), der Editor zeichnet Leuchten, Spannungsfarben, Schaeden.
 * Werkzeuge: 'wire' (Anschluss → Anschluss verbinden) und 'probe' (Messspitzen setzen). */
(function (root) {
  'use strict';
  var E = root.DQEngine, Circuit = root.DQCircuit;
  var GRID = 20;
  function SW() { return Circuit.SPACES.schema.w; } function SH() { return Circuit.SPACES.schema.h; } // Zeichenflaeche (Spiel 1000 × 620, Studio gross – circuit-ui.js SPACES.schema)
  var TWO = { a: [-40, 0], b: [40, 0] };
  var GEO = {
    ground: { g: [0, -20] }, battery: { p: [0, -40], n: [0, 40] }, acsource: { p: [0, -40], n: [0, 40] },
    resistor: TWO, lamp: TWO, switch: TWO, button: TWO, capacitor: TWO, inductor: TWO, ammeter: TWO,
    led: { a: [-40, 0], k: [40, 0] }, diode: { a: [-40, 0], k: [40, 0] },
    pot: { a: [-40, 0], b: [40, 0], w: [0, 40] }, clock: { out: [40, 0] },
    not: { in: [-40, 0], out: [40, 0] },
    logicin: { out: [40, 0] }, logicled: { in: [-40, 0] },
    zener: { a: [-40, 0], k: [40, 0] }, motor: TWO,
    npn: { b: [-40, 0], c: [20, -40], e: [20, 40] },
    dff: { D: [-40, -20], C: [-40, 20], Q: [40, -20], Qn: [40, 20] },
    tff: { T: [-40, -20], C: [-40, 20], Q: [40, -20], Qn: [40, 20] },
    jkff: { J: [-40, -20], C: [-40, 0], K: [-40, 20], Q: [40, -20], Qn: [40, 20] },
    jkms: { J: [-40, -20], C: [-40, 0], K: [-40, 20], Q: [40, -20], Qn: [40, 20] },
    rsff: { S: [-40, -20], C: [-40, 0], R: [-40, 20], Q: [40, -20], Qn: [40, 20] },
    seg7: {}, dec7: { A: [-40, -60], B: [-40, -40], C: [-40, -20], D: [-40, 0] }
  };
  'abcdefg'.split('').forEach(function (k, i) { GEO.seg7[k] = [-40, -60 + 20 * i]; GEO.dec7[k] = [40, -60 + 20 * i]; });
  ['and', 'or', 'nand', 'nor', 'xor', 'xnor'].forEach(function (g) { GEO[g] = { in1: [-40, -20], in2: [-40, 20], out: [40, 0] }; });
  /* Dynamische Geometrie: Gatter mit einstellbarer Eingangszahl, Flipflops mit preSet/preClear (nur wenn Editor.extra.async, Studio) und Bausteine des Studios
   * (Editor.DYNGEO[type] = function (part) → {pin: [x, y]}, z. B. Zaehler) */
  var DYNGEO = {}, EXTRA = { async: false };
  function gateInputs(p) { var q = p.props || {}; return Math.max(2, Math.min(8, Math.round(q.inputs || 2))); }
  function slots(n) { var k = Math.floor(n / 2), a = []; for (var i = -k; i <= k; i++) { if (i === 0 && n % 2 === 0) continue; a.push(i * 20); } return a; }
  function geoOf(p) {
    var f = DYNGEO[p.type]; if (f) return f(p);
    if (E.PARTS[p.type] && E.PARTS[p.type].multi) {
      var n = gateInputs(p), ys = slots(n), g = { out: [40, 0] }; ys.forEach(function (y, i) { g['in' + (i + 1)] = [-40, y]; }); return g;
    }
    var base = GEO[p.type];
    if (EXTRA.async && E.PARTS[p.type] && E.PARTS[p.type].ffAsync) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; }); o.PS = [0, -60]; o.PC = [0, 60]; return o; }
    return base;
  }
  Object.keys(E.PARTS).forEach(function (t) {
    if (!E.PARTS[t].ctr) return;
    DYNGEO[t] = function (p) {
      var nb = E.ctrBitCount(E.PARTS[t], Object.assign({}, E.PARTS[t].props, p.props || {})), ys = slots(nb), g = { C: [-40, -20], R: [-40, 20] };
      ys.forEach(function (y, i) { g['Q' + i] = [40, y]; }); return g;
    };
  });
  function ctrHalf(p) { var nb = E.ctrBitCount(E.PARTS[p.type], Object.assign({}, E.PARTS[p.type].props, p.props || {})); return Math.max(30, 20 * Math.floor(nb / 2) + 10); }
  var CTR_TXT = { async: 'ASYNC', sync: 'SYNC', bcd: 'BCD', johnson: 'JOHNSON', mod: 'MOD' };
  var GATE_SIGN = { and: '&amp;', nand: '&amp;', or: '≥1', nor: '≥1', xor: '=1', xnor: '=1', not: '1' };
  var FF_SIGN = { dff: ['1D', 'C1'], tff: ['1T', 'C1'], jkff: ['1J', 'C1', '1K'], rsff: ['1S', 'C1', '1R'], jkms: ['1J', 'C1', '1K'] };
  /* 7-Segment: Segment-Pfade a…g in einem Feld von 24 × 40 um den Ursprung */
  var SEGP = ['M-8-20h16', 'M10-18v16', 'M10 2v16', 'M-8 20h16', 'M-10 2v16', 'M-10-18v16', 'M-8 0h16'];

  function rotPt(p, rot) {
    var x = p[0], y = p[1];
    switch (((rot || 0) % 360 + 360) % 360) { case 90: return [-y, x]; case 180: return [-x, -y]; case 270: return [y, -x]; default: return [x, y]; }
  }
  function pinPos(part, pin) { var o = rotPt(geoOf(part)[pin], part.rot); return [part.x + o[0], part.y + o[1]]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function fmtVal(v) { // 4700 -> '4.7k', 1e-4 -> '100µ'
    var pre = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    if (!v) return '0';
    for (var i = 0; i < pre.length; i++) if (Math.abs(v) >= pre[i][0] * 0.9999) return String(+(v / pre[i][0]).toPrecision(3)) + pre[i][1];
    return String(v);
  }
  function valueText(p) {
    var d = E.PARTS[p.type], q = p.props || {}, v = p.value !== undefined ? p.value : (q.value !== undefined ? q.value : d.props.value);
    switch (p.type) {
      case 'battery': return fmtVal(v) + ' V';
      case 'switch': return q.closed ? 'zu' : 'offen'; // Stellung ausschreiben (Feedback 01.10.2026: „bei Schaltern kommt nur Strom, wenn sie unbetätigt sind“)
      case 'button': return q.closed ? 'gedrückt' : '';
      case 'acsource': return 'Û ' + fmtVal(v) + ' V ' + ({ square: '⊓', triangle: '△' }[q.shape] || '∿') + ' ' + fmtVal(q.freq || d.props.freq) + ' Hz';
      case 'resistor': case 'pot': case 'lamp': return fmtVal(v) + ' Ω';
      case 'capacitor': return fmtVal(v) + 'F';
      case 'inductor': return fmtVal(v) + 'H';
      case 'clock': return fmtVal(q.freq || d.props.freq) + ' Hz';
      case 'zener': return 'U_Z ' + fmtVal(q.vz || d.props.vz) + ' V';
      case 'motor': return fmtVal(v) + ' Ω';
      case 'npn': return 'β ' + (q.beta || d.props.beta);
      case 'logicin': return q.closed ? '1' : '0';
      case 'dff': case 'tff': case 'jkff': case 'rsff': return ({ pos: '↑ Flanke', neg: '↓ Flanke', level: 'Pegel' })[q.trig || d.props.trig] || '';
      case 'jkms': return '↓ (MS)';
      case 'ctr_async': case 'ctr_sync': return (q.bits || 4) + ' Bit ' + ((q.dir || 'up') === 'down' ? '↓' : '↑');
      case 'ctr_johnson': return (q.bits || 4) + ' Bit';
      case 'ctr_bcd': return '0 … 9';
      case 'ctr_mod': return '0 … ' + ((q.modn || 6) - 1);
      case 'and': case 'or': case 'nand': case 'nor': case 'xor': case 'xnor': return (q.inputs || 2) > 2 ? q.inputs + ' Eingänge' : '';
      case 'led': return q.color || d.props.color;
      default: return '';
    }
  }

  /* Symbol um den Ursprung, unrotiert. r = Simulationsergebnis des Bauteils (optional) */
  function symbol(p, r) {
    var q = p.props || {}, s = '', c = 'class="sym"';
    r = r || {};
    switch (p.type) {
      case 'resistor':
        s = '<path ' + c + ' d="M-40 0H-22M22 0H40"/><rect ' + c + ' x="-22" y="-8" width="44" height="16" rx="1"/>'; break;
      case 'pot':
        s = '<path ' + c + ' d="M-40 0H-22M22 0H40M0 40V14"/><rect ' + c + ' x="-22" y="-8" width="44" height="16"/><path class="sym fillsym" d="M0 10l-5 8h10z"/>'; break;
      case 'lamp':
        var gl = r.burnt ? 0 : Math.min(1, Math.abs(r.p || 0) / ((q.pnom) || 1.35));
        s = (gl > 0.02 ? '<circle r="' + (16 + 18 * gl) + '" fill="url(#glowAmber)" opacity="' + gl.toFixed(2) + '"/>' : '') +
          '<path ' + c + ' d="M-40 0H-14M14 0H40"/><circle ' + c + ' r="14"/><path ' + c + ' d="M-10-10L10 10M-10 10L10-10"/>'; break;
      case 'switch': case 'button':
        var closed = !!q.closed;
        s = '<path ' + c + ' d="M-40 0H-16M16 0H40"/><circle class="sym fillsym" cx="-16" r="3"/><circle ' + c + ' cx="16" r="3"/>' +
          '<path class="sym lever" d="M-16 0L' + (closed ? '16 0' : '14 -16') + '"/>' +
          (p.type === 'button' ? '<path ' + c + ' d="M' + (closed ? '0 0V-18M-8-18H8' : '-1-8V-24M-9-24H7') + '"/>' : '') +
          '<rect class="hit" x="-22" y="-26" width="44" height="34"/>'; break;
      case 'led': case 'diode':
        var col = p.type === 'led' ? (E.LED_COLORS[q.color || 'rot'] || {}).rgb : null;
        var b = r.burnt ? 0 : (r.brightness || 0);
        s = (col && b > 0.02 ? '<circle r="' + (14 + 20 * b) + '" fill="' + col + '" opacity="' + (0.25 + 0.5 * b).toFixed(2) + '" filter="url(#blur)"/>' : '') +
          '<path ' + c + ' d="M-40 0H-12M12 0H40"/><path class="sym ' + (col ? 'ledbody' : 'fillsym') + '" d="M-12-12L12 0L-12 12Z" style="' + (col ? 'fill:' + col + ';fill-opacity:' + (0.25 + 0.75 * b).toFixed(2) : '') + '"/><path ' + c + ' d="M12-12V12"/>' +
          (col ? '<path class="sym thin" d="M2-16l8-10M10-14l8-10"/><path class="sym fillsym" d="M10-26l-4 1 3 3zM18-24l-4 1 3 3z"/>' : ''); break;
      case 'capacitor':
        s = '<path ' + c + ' d="M-40 0H-5M5 0H40M-5-14V14M5-14V14"/>'; break;
      case 'inductor': // Spule: vier Halbkreise
        s = '<path ' + c + ' d="M-40 0H-24a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0H40"/>'; break;
      case 'ammeter':
        s = '<path ' + c + ' d="M-40 0H-14M14 0H40"/><circle ' + c + ' r="14"/><text class="symtxt" y="5">A</text>'; break;
      case 'battery':
        s = '<path ' + c + ' d="M0-40V-6M0 6V40"/><path class="sym thick" d="M-16-6H16"/><path class="sym thick2" d="M-8 6H8"/><text class="plus" x="12" y="-14">+</text>'; break;
      case 'ground':
        s = '<path ' + c + ' d="M0-20V0M-14 0H14M-9 6H9M-4 12H4"/>'; break;
      case 'acsource':
        s = '<path ' + c + ' d="M0-40V-16M0 16V40"/><circle ' + c + ' r="16"/><path class="sym thin" d="M-10 0C-6-10-2-10 0 0S6 10 10 0"/><text class="plus" x="12" y="-20">+</text>'; break;
      case 'logicin': // Pegelschalter: Schiebeschalter mit Pegelanzeige
        var hi1 = !!q.closed;
        s = '<rect ' + c + ' x="-22" y="-16" width="44" height="32" rx="4"/><text class="symtxt small" x="-12" y="-4">0</text><text class="symtxt small" x="12" y="-4">1</text>' +
          '<rect class="sym fillsym" x="' + (hi1 ? 2 : -16) + '" y="2" width="14" height="8" rx="2"/><path ' + c + ' d="M22 0H40"/>' +
          '<rect class="hit" x="-22" y="-16" width="44" height="32"/>'; break;
      case 'logicled': // Logikanzeige: LED mit Bezug auf Masse
        var on1 = r.on;
        s = '<path ' + c + ' d="M-40 0H-12"/><circle r="12" class="' + (on1 ? 'lamp-on' : 'sym') + '"/><path class="sym thin" d="M-6-6L6 0L-6 6ZM6-6V6"/><path class="sym thin" d="M0 12V20M-6 20H6M-3 24H3"/>'; break;
      case 'zener':
        s = '<path ' + c + ' d="M-40 0H-12M12 0H40"/><path class="sym fillsym" d="M-12-12L12 0L-12 12Z"/><path ' + c + ' d="M6-16L12-12V12L18 16"/>'; break;
      case 'motor':
        s = '<path ' + c + ' d="M-40 0H-16M16 0H40"/><circle ' + c + ' r="16"/><text class="symtxt" y="6">M</text>'; break;
      case 'npn': // NPN: Kreis, Basisbalken, Kollektor, Emitter mit Pfeil nach aussen
        s = '<circle ' + c + ' cx="4" r="22"/><path ' + c + ' d="M-40 0H-6M-6-14V14M-6-6L20-28V-40M-6 6L20 28V40"/><path class="sym fillsym" d="M20 28L10 26L15 19Z"/>'; break;
      case 'seg7': // 7-Segment-Anzeige: leuchtende Segmente nach Simulation
        s = '<rect ' + c + ' x="-26" y="-70" width="56" height="140" rx="3"/>';
        'abcdefg'.split('').forEach(function (k, i) { s += '<path ' + c + ' d="M-40 ' + (-60 + 20 * i) + 'H-26"/><text class="symtxt small" x="-20" y="' + (-56 + 20 * i) + '">' + k + '</text>'; });
        s += '<g transform="translate(10 0) scale(1.1)">' + SEGP.map(function (d, i) { return '<path d="' + d + '" class="seg' + (r.seg && r.seg[i] ? ' on' : '') + '"/>'; }).join('') + '</g>'; break;
      case 'dec7': // BCD-Decoder: Eingaenge 1/2/4/8, Ausgaenge a…g
        s = '<rect ' + c + ' x="-26" y="-70" width="52" height="140" rx="2"/><text class="symtxt small" y="-52">BCD</text><text class="symtxt small" y="-38">/7SEG</text>';
        ['1', '2', '4', '8'].forEach(function (k, i) { s += '<path ' + c + ' d="M-40 ' + (-60 + 20 * i) + 'H-26"/><text class="symtxt small" x="-18" y="' + (-56 + 20 * i) + '">' + k + '</text>'; });
        'abcdefg'.split('').forEach(function (k, i) { s += '<path ' + c + ' d="M26 ' + (-60 + 20 * i) + 'H40"/><text class="symtxt small" x="18" y="' + (-56 + 20 * i) + '">' + k + '</text>'; });
        break;
      case 'clock':
        var hi = r.high;
        s = '<rect ' + c + ' x="-22" y="-18" width="44" height="36" rx="3"/><path class="sym thin" d="M-14 8H-7V-8H0V8H7V-8H14"/><path ' + c + ' d="M22 0H40"/>' +
          '<circle cx="15" cy="-12" r="3" class="' + (hi ? 'lamp-on' : 'lamp-off') + '"/>'; break;
      default:
        if (E.PARTS[p.type].ctr) { // Zaehlerbaustein: Kasten mit Zaehlerstand, Takt (Dreieck, bei fallender Flanke mit Kreis), Rueckstellen R, Ausgaenge Q0 …
          var cdef = E.PARTS[p.type], cq = Object.assign({}, cdef.props, q), cnb = E.ctrBitCount(cdef, cq), cgh = ctrHalf(p), cys = slots(cnb);
          s = '<rect ' + c + ' x="-26" y="' + (-cgh) + '" width="52" height="' + (2 * cgh) + '" rx="2"/>' +
            '<text class="symtxt small" y="' + (-cgh + 12) + '">' + CTR_TXT[cdef.ctr] + (cdef.ctr === 'mod' ? ' ' + cq.modn : '') + '</text>' +
            '<path ' + c + ' d="M-40-20H-26M-40 20H-26"/><text class="symtxt small" x="-15" y="-16">C</text><text class="symtxt small" x="-16" y="24">R</text>';
          if (cq.trig === 'neg') s += '<circle class="sym thin" cx="-30" cy="-20" r="3.5" style="fill:var(--karte, #fff)"/>';
          s += '<path class="sym thin" d="M-26-25L-20-20L-26-15"/>';
          cys.forEach(function (y, i) { s += '<path ' + c + ' d="M26 ' + y + 'H40"/><text class="symtxt small" x="14" y="' + (y + 4) + '">Q' + i + '</text>'; });
          if (r.count !== undefined) s += '<text class="symtxt" y="6" style="font-size:20px">' + r.count + '</text>';
          break;
        }
        if (FF_SIGN[p.type]) { // Flipflop: Kasten mit Abhaengigkeitsnotation, Takteingang: Dreieck = Flanke, Kreis davor = fallend, ohne Dreieck = Taktzustand
          var fs = FF_SIGN[p.type], three = p.type === 'jkff' || p.type === 'rsff' || p.type === 'jkms', fy = three ? [-20, 0, 20] : [-20, 20], qv = r.q;
          var trig = p.type === 'jkms' ? 'ms' : q.trig || E.PARTS[p.type].props.trig || 'pos', cy = three ? 0 : 20;
          s = '<rect ' + c + ' x="-26" y="-36" width="52" height="72" rx="2"/>';
          fy.forEach(function (y, k) { s += '<path ' + c + ' d="M-40 ' + y + 'H-26"/><text class="symtxt small" x="-14" y="' + (y + 4) + '">' + fs[k] + '</text>'; });
          if (trig === 'pos' || trig === 'neg') s += '<path class="sym thin" d="M-26 ' + (cy - 5) + 'L-20 ' + cy + 'L-26 ' + (cy + 5) + '"/>';
          if (trig === 'neg') s += '<circle class="sym thin" cx="-30" cy="' + cy + '" r="3.5" style="fill:var(--karte, #fff)"/>';
          if (trig === 'ms') s += '<text class="symtxt small" x="6" y="-26">MS</text><path class="sym thin" d="M16-24h6v4"/>';
          if (EXTRA.async && E.PARTS[p.type].ffAsync) s += '<path ' + c + ' d="M0-36V-60M0 36V60"/><text class="symtxt small" x="10" y="-42">PS</text><text class="symtxt small" x="10" y="52">PC</text>';
          if (r.forbidden) s += '<rect class="forbid" x="-30" y="-40" width="60" height="80" rx="4"/><text class="forbidtxt" x="0" y="-46">verboten</text>'; // unzulaessiger Zustand (preSet+preClear, S = R = 1)
          s += '<path ' + c + ' d="M26-20H40M31 20H40"/><circle ' + c + ' cx="28.5" cy="20" r="2.5"/>' +
            (qv !== undefined ? '<circle cx="34" cy="-30" r="3" class="' + (qv ? 'lamp-on' : 'lamp-off') + '"/>' : '');
          break;
        }
        if (GATE_SIGN[p.type]) {
          var inv = /^n|not|xnor/.test(p.type), gn = p.type === 'not' ? 1 : gateInputs(p), gys = gn === 1 ? [0] : slots(gn), gh = gn === 1 ? 30 : 20 * Math.floor(gn / 2) + 10;
          s = '<rect ' + c + ' x="-22" y="' + (-gh) + '" width="44" height="' + (2 * gh) + '" rx="2"/><text class="symtxt" y="6">' + GATE_SIGN[p.type] + '</text>' +
            gys.map(function (y) { return '<path ' + c + ' d="M-40 ' + y + 'H-22"/>'; }).join('') +
            (inv ? '<circle ' + c + ' cx="27" r="5"/><path ' + c + ' d="M32 0H40"/>' : '<path ' + c + ' d="M22 0H40"/>') +
            (r.out !== undefined ? '<circle cx="34" cy="-10" r="3" class="' + (r.out ? 'lamp-on' : 'lamp-off') + '"/>' : '');
        }
    }
    if (r.burnt) s += '<path class="burnt" d="M-16-16L16 16M-16 16L16-16"/>';
    return s;
  }

  function labels(p) { // Beschriftung neben senkrechten, ueber/unter waagrechten Bauteilen
    if (p.type === 'seg7' || p.type === 'dec7') return '<text class="lbl" y="-78">' + esc(p.id) + '</text>';
    if (E.PARTS[p.type].ctr) return '<text class="lbl" y="' + (-ctrHalf(p) - 8) + '">' + esc(p.id) + '</text><text class="val" y="' + (ctrHalf(p) + 16) + '">' + esc(valueText(p)) + '</text>';
    var vert = (p.type === 'battery' || p.type === 'ground' || p.type === 'acsource') ? (p.rot || 0) % 180 === 0 : (p.rot || 0) % 180 === 90;
    var mk = Editor.mask && Editor.mask(p), v = esc(mk !== undefined ? mk : valueText(p)); // Studio: verborgene Werte als «?»
    if (vert) return '<text class="lbl" x="24" y="-4" text-anchor="start">' + esc(p.id) + '</text><text class="val" x="24" y="12" text-anchor="start">' + v + '</text>';
    var big = GATE_SIGN[p.type] || FF_SIGN[p.type] || p.type === 'npn', up = big ? -44 : -24, dn = big ? 52 : 30;
    if (GATE_SIGN[p.type] && p.type !== 'not' && gateInputs(p) > 2) { var gk = 20 * Math.floor(gateInputs(p) / 2) + 10; up = -gk - 14; dn = gk + 22; }
    if (FF_SIGN[p.type] && EXTRA.async) { up = -68; dn = 76; }
    return '<text class="lbl" y="' + up + '">' + esc(p.id) + '</text><text class="val" y="' + dn + '">' + v + '</text>';
  }
  /* Tooltip eines Bauteils mit Simulationswerten (auch fuer die Werkbank) */
  function partTip(p, r) {
    var tip = p.id + ' – ' + E.PARTS[p.type].label + (valueText(p) ? ' ' + valueText(p) : '');
    if (r && r.v !== undefined) tip += '\nU = ' + E.fmt(Math.abs(r.v), 'V');
    if (r && r.i !== undefined) tip += '\nI = ' + E.fmt(Math.abs(r.i), 'A');
    if (r && r.p !== undefined && Math.abs(r.p) > 1e-9) tip += '\nP = ' + E.fmt(Math.abs(r.p), 'W');
    if (r && r.burnt) tip += '\nDEFEKT';
    return tip;
  }
  /* Freistehendes Schaltzeichen eines Bauteiltyps als eigenes <svg> (Datenblatt, Palette, spaeter Theorie-Bilder).
   * Dieselbe Zeichenlogik wie im Schaltplan (symbol), ohne Simulationswerte. opt: {pins: true → Anschlusskuerzel anschreiben} */
  function icon(type, props, opt) {
    opt = opt || {};
    var g = GEO[type] || {}, x0 = -46, y0 = -46, x1 = 46, y1 = 46;
    Object.keys(g).forEach(function (k) { x0 = Math.min(x0, g[k][0] - 16); x1 = Math.max(x1, g[k][0] + 16); y0 = Math.min(y0, g[k][1] - 26); y1 = Math.max(y1, g[k][1] + 26); });
    var s = symbol({ type: type, props: props || {} });
    if (opt.pins) Object.keys(g).forEach(function (k) {
      var x = g[k][0], y = g[k][1], side = Math.abs(x) >= Math.abs(y) ? (x < 0 ? -1 : 1) : 0;
      s += '<circle class="pin" cx="' + x + '" cy="' + y + '" r="3.5"/><text class="icopin" x="' + (x + (side ? side * 6 : 7)) + '" y="' + (y - (side ? 7 : -4)) + '" text-anchor="' + (side < 0 ? 'end' : 'start') + '">' + esc(k) + '</text>';
    });
    return '<svg class="symicon" viewBox="' + x0 + ' ' + y0 + ' ' + (x1 - x0) + ' ' + (y1 - y0) + '" aria-hidden="true"><g>' + s + '</g></svg>';
  }
  function voltColor(v, vmax) {
    var t = vmax > 0 ? Math.max(0, Math.min(1, v / vmax)) : 0; // 0 V blau → max rot
    var h = 220 - 220 * t; return 'hsl(' + h.toFixed(0) + ',85%,58%)';
  }

  function Editor(svg, opts) {
    this.svg = svg; this.opts = opts || {};
    this.core = this.opts.core || new Circuit(this.opts); // Zustand + Bedienlogik (circuit-ui.js); geteilt, falls uebergeben
    this.sim = null; this.refMark = null; this.showVolt = false; this.mouse = [0, 0];
    svg.setAttribute('viewBox', '0 0 ' + SW() + ' ' + SH());
    this.view = [0, 0, SW(), SH()];
    this.core.attach(this);
    this._bind();
  }
  /* L4 (05.10.2026): Ausschnitt setzen (begrenzt), zur Zeigerposition zoomen – dieselbe Bedienung wie die Werkbank
   * (Strg/⌘ + Rad, zwei Finger, Ziehen auf leerer Fläche); Doppeltipp auf ein Bauteil zoomt heran, auf leere Fläche passt ein. */
  Editor.prototype.setView = function (v) {
    var w = Math.max(160, Math.min(SW() * 1.6, v[2])), h = v[3] * w / v[2];
    var x = Math.max(-300, Math.min(SW() + 300 - w, v[0])), y = Math.max(-300, Math.min(SH() + 300 - h, v[1]));
    this.view = [x, y, w, h]; this.svg.setAttribute('viewBox', this.view.join(' ')); this.render();
  };
  Editor.prototype.zoomAt = function (f, cx, cy) {
    var box = this.svg.getBoundingClientRect(), v = this.view; if (!box.width) return;
    var px = v[0] + (cx - box.left) / box.width * v[2], py = v[1] + (cy - box.top) / box.height * v[3];
    var w = Math.max(160, Math.min(SW() * 1.6, v[2] * f)), k = w / v[2];
    this.setView([px - (px - v[0]) * k, py - (py - v[1]) * k, w, v[3] * k]);
  };
  Editor.prototype.zoomTo = function (part) { // Doppeltipp auf ein Bauteil: halber Ausschnitt um das Bauteil
    var v = this.view, w = Math.max(160, Math.min(v[2], 360)), h = w * v[3] / v[2];
    this.setView([part.x - w / 2, part.y - h / 2, w, h]);
  };
  Editor.DYNGEO = DYNGEO; Editor.extra = EXTRA; Editor.geoOf = geoOf; Editor.GEO = GEO; Editor.pinPos = pinPos; Editor.symbol = symbol; Editor.fmtVal = fmtVal; Editor.valueText = valueText; Editor.partTip = partTip; Editor.voltColor = voltColor; Editor.icon = icon;
  // Zustand liegt im Kern; die bisherigen Eigenschaften bleiben fuer app.js erhalten
  ['layout', 'locked', 'sel', 'wireStart', 'tool', 'probes', 'drag'].forEach(function (k) {
    Object.defineProperty(Editor.prototype, k, { get: function () { return this.core[k]; }, set: function (v) { this.core[k] = v; } });
  });

  Editor.prototype.load = function (layout, lockedIds, bench) { this.core.load(layout, lockedIds, bench); this.fit(); };
  /* Ansicht auf die Bauteile einpassen (mind. 640 × 400, Rand 140) – nur beim Laden und auf Wunsch, nie waehrend des Ziehens */
  Editor.prototype.fit = function () {
    var ps = this.layout.parts, x0 = 300, y0 = 200, x1 = 700, y1 = 420;
    if (ps.length) { x0 = Math.min.apply(null, ps.map(function (p) { return p.x; })); x1 = Math.max.apply(null, ps.map(function (p) { return p.x; }));
      y0 = Math.min.apply(null, ps.map(function (p) { return p.y; })); y1 = Math.max.apply(null, ps.map(function (p) { return p.y; })); }
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, box = this.svg.getBoundingClientRect(), small = box.width && box.width < 600, tight = this.opts.tight; // tight: Mini-Schaltung, knapp um die Bauteile
    var w = Math.max(tight ? 240 : small ? 380 : 640, x1 - x0 + (tight ? 150 : small ? 160 : 280)), h = Math.max(tight ? 160 : small ? 240 : 400, y1 - y0 + (tight ? 150 : small ? 160 : 280)),  ar = box.width && box.height ? box.width / box.height : SW() / SH();
    if (w / h < ar) w = h * ar; else h = w / ar;
    this.view = [Math.max(0, Math.min(SW() - w, cx - w / 2)), Math.max(0, Math.min(SH() - h, cy - h / 2)), Math.min(w, SW()), Math.min(h, SH())];
    this.svg.setAttribute('viewBox', this.view.join(' '));
    this.render();
  };
  Editor.prototype.part = function (id) { return this.core.part(id); };
  Editor.prototype.changed = function (kind) { this.core.changed(kind); };
  Editor.prototype.setSim = function (sim) { this.sim = sim; this.render(); };

  Editor.prototype.nextId = function (type) { return this.core.nextId(type); };
  /* Neues Bauteil in der Mitte des sichtbaren Ausschnitts */
  Editor.prototype.addPart = function (type) {
    var v = this.view || [0, 0, SW(), SH()], p = this.core.addPart(type, v[0] + v[2] / 2, v[1] + v[3] / 2);
    if (p.x - 50 < v[0] || p.x + 50 > v[0] + v[2] || p.y - 50 < v[1] || p.y + 50 > v[1] + v[3]) this.fit(); // neues Bauteil ausserhalb des Ausschnitts: einpassen
    return p;
  };
  Editor.prototype.removeSelected = function () { return this.core.removeSelected(); };
  Editor.prototype.rotateSelected = function () { this.core.rotateSelected('schema'); };

  Editor.prototype._pt = function (ev) {
    var pt = this.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = this.svg.getScreenCTM(); if (!m) return [0, 0];
    var r = pt.matrixTransform(m.inverse()); return [r.x, r.y];
  };
  /* Nur Hit-Testing und Koordinaten-Umrechnung – die Bedienlogik steckt im Kern */
  Editor.prototype._bind = function () {
    var self = this, svg = this.svg, core = this.core, pan = null, pinch = null, touches = {}, lastTap = { t: 0, x: 0, y: 0 };
    function dblAt(ev) { // Doppeltipp/Doppelklick: Bauteil → heranzoomen, leere Fläche → einpassen
      var t = ev.target.closest('[data-part]'), p = t && core.part(t.dataset.part);
      if (p && self.opts.onDouble && self.opts.onDouble(p)) return; // Studio: Zaehler aufklappen
      if (p) self.zoomTo(p); else self.fit();
    }
    svg.addEventListener('pointerdown', function (ev) {
      if (self.opts.tight) { /* Mini-Schaltung: kein Zoom, die Lektion scrollt */ }
      else {
        if (ev.isPrimary !== false) touches = {};
        if (ev.pointerType === 'touch') touches[ev.pointerId] = [ev.clientX, ev.clientY];
        if (Object.keys(touches).length === 2) { pan = null; if (core.drag) core.drag = null; var tp = Object.keys(touches).map(function (k) { return touches[k]; }); pinch = { d: Math.hypot(tp[0][0] - tp[1][0], tp[0][1] - tp[1][1]), view: self.view.slice(), c: [(tp[0][0] + tp[1][0]) / 2, (tp[0][1] + tp[1][1]) / 2] }; return; }
        if (!ev.target.closest('[data-pin],[data-wire]')) { // Doppeltipp/Doppelklick selbst erkennen – der Browser liefert nach dem Neuzeichnen kein dblclick
          var now = performance.now(); if (now - lastTap.t < 350 && Math.abs(ev.clientX - lastTap.x) < 24 && Math.abs(ev.clientY - lastTap.y) < 24) { lastTap.t = 0; dblAt(ev); return; } lastTap = { t: now, x: ev.clientX, y: ev.clientY };
        }
      }
      var t = ev.target.closest('[data-pin],[data-part],[data-wire]'), xy = self._pt(ev);
      if (t && t.dataset.pin) { ev.preventDefault(); core.clickPin(t.dataset.pin); return; }
      if (t && t.dataset.wire !== undefined) { core.clickWire(+t.dataset.wire); return; }
      if (t && t.dataset.part) { if (core.pressPart(t.dataset.part, xy)) svg.setPointerCapture(ev.pointerId); return; }
      if (self.opts.tight) { core.clickEmpty(); return; }
      pan = { x: ev.clientX, y: ev.clientY, view: self.view.slice(), moved: false }; // leere Fläche: Ziehen verschiebt, Klick hebt die Auswahl auf
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ }
    });
    svg.addEventListener('pointermove', function (ev) {
      if (touches[ev.pointerId]) touches[ev.pointerId] = [ev.clientX, ev.clientY];
      if (pinch && Object.keys(touches).length === 2) { var tp = Object.keys(touches).map(function (k) { return touches[k]; }), d = Math.hypot(tp[0][0] - tp[1][0], tp[0][1] - tp[1][1]); if (d > 10) { self.view = pinch.view.slice(); self.zoomAt(pinch.d / d, pinch.c[0], pinch.c[1]); } return; }
      if (pan) { var dx = ev.clientX - pan.x, dy = ev.clientY - pan.y; if (Math.abs(dx) + Math.abs(dy) > 5) pan.moved = true; if (pan.moved) { var f = pan.view[2] / (svg.getBoundingClientRect().width || 1); self.setView([pan.view[0] - dx * f, pan.view[1] - dy * f, pan.view[2], pan.view[3]]); } return; }
      var xy = self._pt(ev); self.mouse = xy;
      if (core.drag) core.dragTo(xy);
      else if (core.wireStart) self.render();
    });
    function up(ev) {
      delete touches[ev.pointerId];
      if (pinch) { if (Object.keys(touches).length < 2) pinch = null; return; }
      if (pan) { var wasPan = pan.moved; pan = null; if (!wasPan) core.clickEmpty(); return; }
      core.release();
    }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', function (ev) { if (self.opts.tight || !(ev.ctrlKey || ev.metaKey)) return; ev.preventDefault(); self.zoomAt(Math.exp(ev.deltaY * 0.0015), ev.clientX, ev.clientY); }, { passive: false });
    svg.addEventListener('dblclick', function (ev) { if (self.opts.tight) return; ev.preventDefault(); dblAt(ev); });
  };
  Editor.prototype.key = function (ev) { this.core.key(ev); };

  Editor.prototype.render = function () {
    if (!this.svg.getClientRects().length) return; // ausgeblendet (Werkbank aktiv): nicht zeichnen, beim Einblenden zeichnet fit()
    var self = this, L = this.layout, sim = this.sim, res = sim && sim.res, pinNode = sim && sim.pinNode;
    var boxW = this.svg.getBoundingClientRect().width || 0, hit = boxW && boxW < 600 && this.view ? Math.max(1, (this.view[2] / boxW) * 12 / 11) : 1; // nur auf kleinen Bildschirmen (Handy): Anschlüsse ≥ 24 px
    var vmax = 0; if (res) Object.keys(res.nodeV).forEach(function (n) { vmax = Math.max(vmax, res.nodeV[n]); });
    var byId = {}; L.parts.forEach(function (p) { byId[p.id] = p; });
    var pinWireCount = {}; L.wires.forEach(function (w) { pinWireCount[w.from] = (pinWireCount[w.from] || 0) + 1; pinWireCount[w.to] = (pinWireCount[w.to] || 0) + 1; });
    function pp(pid) { var s = pid.split('.'); return byId[s[0]] ? pinPos(byId[s[0]], s[1]) : [0, 0]; }
    function dir(pid) { var s = pid.split('.'), p = byId[s[0]]; if (!p) return [0, 0]; var o = rotPt(geoOf(p)[s[1]], p.rot); return [Math.sign(o[0]), Math.abs(o[0]) >= Math.abs(o[1]) ? 0 : Math.sign(o[1])]; }
    function route(fa, fb) { // kurzer Stummel aus jedem Anschluss heraus, dazwischen rechtwinklig
      var a = pp(fa), b = pp(fb), da = dir(fa), db = dir(fb);
      if (da[1] !== 0) da[0] = 0; if (db[1] !== 0) db[0] = 0;
      var sa = [a[0] + da[0] * 20, a[1] + da[1] * 20], sb = [b[0] + db[0] * 20, b[1] + db[1] * 20];
      if (a[0] === b[0] || a[1] === b[1]) return 'M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1];
      function sg(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
      function pen(c) { // Umwege bestrafen: erstes Segment gegen die Austrittsrichtung, letztes gegen die Eintrittsrichtung
        var s1 = [sg(c[0] - sa[0]), sg(c[1] - sa[1])], s2 = [sg(sb[0] - c[0]), sg(sb[1] - c[1])];
        return (s1[0] === -da[0] && s1[0] !== 0 ? 1 : 0) + (s1[1] === -da[1] && s1[1] !== 0 ? 1 : 0) +
          (s2[0] === db[0] && s2[0] !== 0 ? 1 : 0) + (s2[1] === db[1] && s2[1] !== 0 ? 1 : 0);
      }
      var hFirst = pen([sb[0], sa[1]]) <= pen([sa[0], sb[1]]);
      var mid = hFirst ? 'H' + sb[0] + 'V' + sb[1] : 'V' + sb[1] + 'H' + sb[0];
      return 'M' + a[0] + ' ' + a[1] + 'L' + sa[0] + ' ' + sa[1] + mid + 'L' + b[0] + ' ' + b[1];
    }
    function wcol(pid) {
      if (!res || !pinNode) return null;
      var own = self.opts.wireColor && self.opts.wireColor(pid, res, pinNode); if (own) return own; // Studio: Logikleitungen nach Pegel faerben
      if (!self.showVolt) return null;
      var n = pinNode[pid]; return n === undefined ? null : voltColor(res.nodeV[n] || 0, vmax);
    }
    function faultMark(p) { var ft = self.opts.faultOf && self.opts.faultOf(p.id); return ft ? '<rect class="faultmark" x="-46" y="-36" width="92" height="72" rx="6"/><text class="faulttxt" y="-42">' + esc(ft) + '</text>' : ''; } // Studio: Bauteil mit Meldung markieren
    var h = [];
    h.push('<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" class="griddot"/></pattern>' +
      '<radialGradient id="glowAmber"><stop offset="0" stop-color="#ffcf4a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>' +
      '<filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6"/></filter></defs>');
    h.push('<rect width="' + SW() + '" height="' + SH() + '" fill="url(#grid)"/>');
    // Leitungen
    var wi = self.showFlow && root.DQBench ? root.DQBench.wireCurrents(L, res) : [];
    L.wires.forEach(function (w, i) {
      var col = wcol(w.from), d = route(w.from, w.to), iw = wi[i] || 0;
      h.push('<g data-wire="' + i + '"><path class="wirehit" d="' + d + '"/><path class="wire bcore' + (self.sel === 'w:' + i ? ' selected' : '') + '" data-i="' + iw.toExponential(3) + '" d="' + d + '"' + (col ? ' style="stroke:' + col + '"' : '') + '/></g>');
    });
    // Bauteile
    L.parts.forEach(function (p) {
      var r = res && res.parts[p.id], sel = self.sel === p.id || !!(self.opts.selected && self.opts.selected(p.id));
      var tip = partTip(p, r);
      h.push('<g class="part' + (sel ? ' selected' : '') + (self.locked[p.id] ? ' locked' : '') + '" data-part="' + p.id + '" transform="translate(' + p.x + ' ' + p.y + ')">' +
        '<title>' + esc(tip) + '</title><rect class="hit" x="-44" y="-34" width="88" height="68"/>' +
        '<g transform="rotate(' + (p.rot || 0) + ')">' + symbol(p, r) + '</g>' +
        labels(p) + faultMark(p) + '</g>');
    });
    if (self.showFlow) h.push('<g class="bflow" pointer-events="none"></g>');
    // Anschluesse
    L.parts.forEach(function (p) {
      Object.keys(geoOf(p)).forEach(function (pin) {
        var pid = p.id + '.' + pin, xy = pinPos(p, pin), col = wcol(pid);
        var cls = 'pin' + (self.wireStart === pid ? ' active' : '') + (pinWireCount[pid] ? ' used' : '') + (pinWireCount[pid] > 1 ? ' junction' : '');
        h.push('<g data-pin="' + pid + '"><circle class="pinhit" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (11 * hit).toFixed(1) + '"/><circle class="' + cls + '" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (pinWireCount[pid] > 1 ? 5 : 4) + '"' + (col ? ' style="fill:' + col + '"' : '') + '><title>' + pid + (res && pinNode && pinNode[pid] !== undefined ? ' – ' + E.fmt(res.nodeV[pinNode[pid]] || 0, 'V') + ' gegen Masse' : '') + '</title></circle></g>');
        if (self.showVolt && res && pinNode && pinNode[pid] !== undefined && pin !== 'g')
          h.push('<text class="vlabel" x="' + (xy[0] + 6) + '" y="' + (xy[1] - 6) + '">' + E.fmt(res.nodeV[pinNode[pid]] || 0, 'V') + '</text>');
        if (self.refMark === pid) h.push('<text class="refmark" x="' + (xy[0] - 8) + '" y="' + (xy[1] + 18) + '">⏚ 0 V<title>Bezugspunkt 0 V – ohne schwarze Spitze misst das Oszilloskop hiergegen</title></text>'); // G1
      });
    });
    // Leitung im Entstehen
    if (this.wireStart && byId[this.wireStart.split('.')[0]]) {
      var a = pp(this.wireStart);
      h.push('<path class="wire pending" d="M' + a[0] + ' ' + a[1] + 'H' + this.mouse[0] + 'V' + this.mouse[1] + '"/>');
    }
    // Messspitzen
    [['a', 'probe-red', '+'], ['b', 'probe-black', 'COM']].forEach(function (k) {
      var pid = self.probes[k[0]]; if (!pid || !byId[pid.split('.')[0]]) return;
      var xy = pp(pid);
      h.push('<g class="probe ' + k[1] + '" pointer-events="none"><path d="M' + xy[0] + ' ' + xy[1] + 'l14 -30"/><circle cx="' + (xy[0] + 14) + '" cy="' + (xy[1] - 36) + '" r="9"/><text x="' + (xy[0] + 14) + '" y="' + (xy[1] - 32) + '">' + (k[0] === 'a' ? '+' : '−') + '</text></g>');
    });
    this.svg.innerHTML = h.join('');
    if (root.DQBench) root.DQBench.prototype._animSetup.call(this); // Stromfluss-Punkte wie auf der Werkbank
  };

  root.DQEditor = Editor;
})(typeof window !== 'undefined' ? window : globalThis);

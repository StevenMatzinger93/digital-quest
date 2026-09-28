/* Digital Quest – Werkbank-Ansicht (window.DQBench)
 * 2.5D, fester Blickwinkel: Laborunterlage auf dem Tisch, leicht geneigt (Szene in y gestaucht),
 * Bauteile als Praktikums-Steckbausteine mit 4-mm-Buchsen, Verbindungen als Laborkabel mit Bananensteckern.
 * Nur Renderer: Zustand und Bedienlogik liegen im Kern (circuit-ui.js, Raum 'bench'), die Werkbank macht
 * Hit-Testing und rechnet Bildschirm → Werkbank-Koordinaten um. Gleiche data-Attribute wie im Schema
 * (data-part, data-pin, data-wire). Unsichtbar wird nicht gezeichnet, erst beim Einblenden (fit). */
(function (root) {
  'use strict';
  var E = root.DQEngine, Circuit = root.DQCircuit, Ed = root.DQEditor;
  var S = Circuit.SPACES.bench, W = S.w, H = S.h, K = 0.8; // K: Neigung der Tischflaeche (Stauchung in y)

  /* Buchsen je Bauteil (unrotiert, Werkbank-Einheiten) und Groesse des Bausteins [breite, hoehe] */
  var TWO = { a: [-45, 0], b: [45, 0] };
  var GEO = {
    battery: { p: [-32, 38], n: [32, 38] }, ground: { g: [0, -8] },
    resistor: TWO, lamp: TWO, switch: TWO, button: TWO, capacitor: TWO, ammeter: TWO,
    led: { a: [-45, 0], k: [45, 0] }, diode: { a: [-45, 0], k: [45, 0] },
    pot: { a: [-50, -8], b: [50, -8], w: [0, 32] }, clock: { out: [48, 0] },
    not: { in: [-50, 0], out: [50, 0] }
  };
  var SIZE = { battery: [150, 112], ground: [60, 70], pot: [130, 94], clock: [124, 80], lamp: [130, 70], ammeter: [130, 72] };
  ['and', 'or', 'nand', 'nor', 'xor'].forEach(function (g) { GEO[g] = { in1: [-50, -22], in2: [-50, 22], out: [50, 0] }; });
  var CHIP = { and: '7408', or: '7432', nand: '7400', nor: '7402', xor: '7486', not: '7404' };
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

  function socket(xy, ring) {
    return '<g transform="translate(' + xy[0] + ' ' + xy[1] + ')"><circle r="10" fill="' + (ring || '#262626') + '" stroke="rgba(0,0,0,.55)"/><circle r="6" fill="url(#bBrass)"/><circle r="2.6" fill="#0b0b0b"/></g>';
  }
  function lead(x0, x1, y) { return '<path class="blead" d="M' + x0 + ' ' + (y || 0) + 'H' + x1 + '"/>'; }

  /* Bauteil-Illustration um den Ursprung, unrotiert. r = Simulationsergebnis (optional) */
  function illus(p, r) {
    var q = p.props || {}, sz = size(p.type), w = sz[0], h = sz[1], g = GEO[p.type], s = '';
    r = r || {};
    // Baustein
    s += '<rect class="bblock" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="9"/>' +
      '<rect class="bbevel" x="' + (-w / 2 + 3) + '" y="' + (-h / 2 + 3) + '" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="7"/>';
    // Buchsen
    Object.keys(g).forEach(function (pin) {
      var ring = p.type === 'battery' ? (pin === 'p' ? '#c62828' : '#1a1a1a') : p.type === 'ground' ? '#2e9d44' : null;
      s += socket(g[pin], ring);
    });
    switch (p.type) {
      case 'resistor':
        var bd = bands(val(p));
        s += lead(-35, -26) + lead(26, 35) + '<rect x="-26" y="-8" width="52" height="16" rx="8" fill="url(#bResBody)" stroke="rgba(0,0,0,.35)"/>' +
          '<rect x="-17" y="-8" width="4" height="16" fill="' + bd[0] + '"/><rect x="-9" y="-8" width="4" height="16" fill="' + bd[1] + '"/>' +
          '<rect x="-1" y="-8" width="4" height="16" fill="' + bd[2] + '"/><rect x="13" y="-8" width="4" height="16" fill="#c9a227"/>' +
          '<rect x="-24" y="-6" width="48" height="3" rx="1.5" fill="rgba(255,255,255,.35)"/>'; break;
      case 'led': case 'diode':
        if (p.type === 'diode') {
          s += lead(-35, -18) + lead(18, 35) + '<rect x="-18" y="-7" width="36" height="14" rx="3" fill="#1b1b1b" stroke="#000"/><rect x="9" y="-7" width="4" height="14" fill="#cfcfcf"/>';
        } else {
          var col = (E.LED_COLORS[q.color || 'rot'] || {}).rgb || '#f33', b = r.burnt ? 0 : (r.brightness || 0);
          s += lead(-35, -8) + lead(8, 35) +
            (b > 0.02 ? '<circle r="' + (22 + 40 * b) + '" fill="' + col + '" opacity="' + (0.3 + 0.5 * b).toFixed(2) + '" filter="url(#bBlur)"/>' : '') +
            '<path d="M-12 0A12 12 0 1 1 10 6.6V-6.6A12 12 0 0 1-12 0Z" fill="' + col + '" opacity=".75" stroke="rgba(0,0,0,.4)"/>' +
            '<circle r="9.5" fill="' + col + '" opacity="' + (0.45 + 0.55 * b).toFixed(2) + '"/>' +
            '<ellipse cx="-3.5" cy="-4" rx="3.5" ry="2.4" fill="rgba(255,255,255,.7)"/>' +
            '<text class="bprint" x="-45" y="-17">+</text>';
        }
        break;
      case 'lamp':
        var gl = r.burnt ? 0 : Math.min(1, Math.abs(r.p || 0) / ((q.pnom) || 1.35));
        s += lead(-35, -21) + lead(21, 35) +
          '<circle r="21" fill="url(#bMetal)" stroke="rgba(0,0,0,.5)"/>' +
          (gl > 0.02 ? '<circle r="' + (30 + 60 * gl) + '" fill="#ffc940" opacity="' + (0.25 + 0.45 * gl).toFixed(2) + '" filter="url(#bBlur)"/><circle r="' + (24 + 40 * gl) + '" fill="url(#bGlow)" opacity="' + Math.min(1, 0.3 + gl).toFixed(2) + '"/>' : '') +
          '<circle r="15" fill="' + (gl > 0.02 ? 'rgba(255,214,120,' + (0.35 + 0.6 * gl).toFixed(2) + ')' : 'rgba(230,240,245,.35)') + '" stroke="rgba(255,255,255,.55)"/>' +
          '<path d="M-7 3L-4-3L-1 3L2-3L5 3" fill="none" stroke="' + (gl > 0.05 ? '#fff6d0' : '#6d6d6d') + '" stroke-width="1.4"/>' +
          '<ellipse cx="-5" cy="-6" rx="4" ry="2.5" fill="rgba(255,255,255,.6)"/>'; break;
      case 'switch':
        var on = !!q.closed;
        s += lead(-35, -16) + lead(16, 35) + '<rect x="-17" y="-14" width="34" height="28" rx="3" fill="#2a2a2a" stroke="#000"/>' +
          '<text class="bprint" x="-24" y="-20">0</text><text class="bprint" x="24" y="-20">I</text>' +
          '<circle r="9" fill="url(#bMetal)" stroke="rgba(0,0,0,.5)"/>' +
          '<path d="M0 0L' + (on ? '22' : '-22') + ' 0" stroke="#d9d9d9" stroke-width="6" stroke-linecap="round"/>' +
          '<circle cx="' + (on ? 22 : -22) + '" r="4.5" fill="#f0f0f0" stroke="#777"/>'; break;
      case 'button':
        var pr = !!q.closed;
        s += lead(-35, -16) + lead(16, 35) + '<rect x="-16" y="-16" width="32" height="32" rx="4" fill="#2a2a2a" stroke="#000"/>' +
          '<circle r="' + (pr ? 9 : 11) + '" fill="' + (pr ? '#9e1b1b' : '#d32f2f') + '" stroke="rgba(0,0,0,.5)"/>' +
          (pr ? '' : '<ellipse cx="-3" cy="-4" rx="4" ry="2.4" fill="rgba(255,255,255,.4)"/>'); break;
      case 'capacitor':
        s += lead(-35, -20) + lead(20, 35) + '<rect x="-20" y="-12" width="40" height="24" rx="5" fill="#27498a" stroke="rgba(0,0,0,.4)"/>' +
          '<rect x="10" y="-12" width="6" height="24" fill="#aab4c8"/><rect x="-18" y="-9" width="36" height="4" rx="2" fill="rgba(255,255,255,.25)"/>'; break;
      case 'ammeter':
        s += lead(-35, -28) + lead(28, 35) + '<rect x="-28" y="-26" width="56" height="44" rx="4" fill="#1d1d1d"/><rect x="-24" y="-22" width="48" height="30" rx="2" fill="#f3f0e6"/>' +
          '<path d="M-17 2A20 20 0 0 1 17 2" fill="none" stroke="#333" stroke-width="1"/><path d="M0 6L-9-12" stroke="#c62828" stroke-width="1.5"/><text class="bprint dark" y="15">A</text>'; break;
      case 'pot':
        var ang = -135 + 270 * (q.pos !== undefined ? q.pos : 0.5);
        s += lead(-40, -24, -8) + lead(24, 40, -8) + '<path class="blead" d="M0 22V10"/>' +
          '<circle cy="-8" r="19" fill="#2a2a2a" stroke="#000"/><circle cy="-8" r="13" fill="url(#bMetal)"/>' +
          '<path transform="translate(0 -8) rotate(' + ang + ')" d="M0 0V-12" stroke="#111" stroke-width="3" stroke-linecap="round"/>'; break;
      case 'clock':
        s += lead(24, 38) + '<rect x="-46" y="-26" width="70" height="52" rx="4" fill="#232323" stroke="#000"/>' +
          '<path d="M-36 10H-26V-8H-14V10H-2V-8H10" fill="none" stroke="#ffb000" stroke-width="2"/>' +
          '<circle cx="16" cy="-14" r="4" fill="' + (r.high ? '#39ff14' : '#243024') + '"' + (r.high ? ' filter="url(#bSoft)"' : '') + '/>'; break;
      case 'ground':
        s += '<path d="M0 12V18M-11 18H11M-7 23H7M-3 28H3" fill="none" stroke="#2b2b2b" stroke-width="2"/>'; break;
      case 'battery':
        s += '<rect x="-62" y="-48" width="124" height="60" rx="6" fill="#1c1c1c" stroke="#000"/>' +
          '<rect x="-38" y="-48" width="100" height="60" fill="#2f6fd6"/><rect x="-38" y="-48" width="100" height="8" fill="rgba(255,255,255,.18)"/>' +
          '<text class="bbig" x="12" y="-10">' + esc(Ed.valueText(p).replace(' ', '')) + '</text>' +
          '<circle cx="-52" cy="-32" r="6" fill="url(#bMetal)"/><path d="M-52-6l5 3v6l-5 3-5-3v-6z" fill="url(#bMetal)"/>' +
          '<path d="M-52-26C-70-10-50 20-32 28" fill="none" stroke="#c62828" stroke-width="3"/><path d="M-52 6C-40 24 10 16 32 28" fill="none" stroke="#111" stroke-width="3"/>' +
          '<text class="bprint red" x="-32" y="56">+</text><text class="bprint" x="32" y="56">−</text>'; break;
      default:
        if (CHIP[p.type]) {
          var two = p.type !== 'not', pins = '';
          for (var i = 0; i < 7; i++) pins += '<rect x="' + (-33 + i * 10) + '" y="-24" width="5" height="6" fill="#bdbdbd"/><rect x="' + (-33 + i * 10) + '" y="18" width="5" height="6" fill="#bdbdbd"/>';
          s += (two ? lead(-40, -36, -22) + lead(-40, -36, 22) : lead(-40, -36)) + lead(36, 40) + pins +
            '<rect x="-36" y="-18" width="72" height="36" rx="2" fill="#1a1a1a" stroke="#000"/><circle cx="-28" r="3" fill="#2c2c2c"/>' +
            '<text class="bchip" y="4">' + CHIP[p.type] + '</text>' +
            (r.out !== undefined ? '<circle cx="46" cy="-30" r="4" fill="' + (r.out ? '#39ff14' : '#243024') + '"' + (r.out ? ' filter="url(#bSoft)"' : '') + '/>' : '');
        }
    }
    if (r.burnt) s += '<path d="M-14-12l8 4 2-8 6 10 6-6 2 12M-12 10l9-3" fill="none" stroke="#222" stroke-width="3"/><circle r="15" fill="rgba(40,30,20,.35)"/>';
    return s;
  }

  /* Kabelfarbe: Pluspol rot, Minuspol/Masse schwarz, sonst nach Reihenfolge */
  var CABLE = ['#2a6fdb', '#e0b400', '#2f9e44', '#8e44ad', '#e67e22'];
  function cableColor(w, i, byId) {
    function kind(pid) { var s = pid.split('.'), p = byId[s[0]]; if (!p) return ''; return p.type === 'battery' ? s[1] : p.type === 'ground' ? 'n' : ''; }
    var k = kind(w.from) || kind(w.to);
    return k === 'p' ? '#d32f2f' : k === 'n' ? '#1e1e1e' : CABLE[i % CABLE.length];
  }
  function cablePath(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], sag = Math.min(110, 18 + Math.sqrt(dx * dx + dy * dy) * 0.22);
    return 'M' + a[0] + ' ' + a[1] + 'C' + (a[0] + dx * 0.15) + ' ' + (a[1] + sag) + ' ' + (b[0] - dx * 0.15) + ' ' + (b[1] + sag) + ' ' + b[0] + ' ' + b[1];
  }
  function plug(xy, col) {
    return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="9" fill="' + col + '" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/><circle cx="' + (xy[0] - 2.5) + '" cy="' + (xy[1] - 3) + '" r="3" fill="rgba(255,255,255,.3)"/>';
  }

  function Bench(svg, opts) {
    this.svg = svg; this.opts = opts || {};
    this.core = this.opts.core || new Circuit(this.opts);
    this.sim = null; this.mouse = [0, 0]; this.dirty = true;
    this.view = [0, 0, W, W * 0.62]; // gleiches Seitenverhaeltnis wie das Schema (1000 × 620), damit die Flaeche gleich gross bleibt
    svg.setAttribute('viewBox', this.view.join(' '));
    this.core.attach(this);
    this._bind();
  }
  Bench.GEO = GEO; Bench.K = K; Bench.illus = illus;

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
    Object.keys(core.benchHints).forEach(function (id) { q.push(core.benchHints[id]); });
    if (q.length) {
      x0 = Math.min.apply(null, q.map(function (p) { return p.x; })); x1 = Math.max.apply(null, q.map(function (p) { return p.x; }));
      y0 = Math.min.apply(null, q.map(function (p) { return p.y; })); y1 = Math.max.apply(null, q.map(function (p) { return p.y; }));
    }
    var box = this.svg.getBoundingClientRect(), small = box.width && box.width < 600;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 * K + 10;
    var w = Math.max(small ? 440 : 760, x1 - x0 + (small ? 220 : 340)), h = Math.max(small ? 260 : 420, (y1 - y0) * K + (small ? 200 : 300));
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
      var t = ev.target.closest('[data-pin],[data-part],[data-wire]'), xy = self._pt(ev);
      if (t && t.dataset.pin) { ev.preventDefault(); core.clickPin(t.dataset.pin); return; }
      if (t && t.dataset.wire !== undefined) { core.clickWire(+t.dataset.wire); return; }
      if (t && t.dataset.part) { if (core.pressPart(t.dataset.part, xy, 'bench')) svg.setPointerCapture(ev.pointerId); return; }
      core.clickEmpty();
    });
    svg.addEventListener('pointermove', function (ev) {
      var xy = self._pt(ev); self.mouse = xy;
      if (core.drag) core.dragTo(xy);
      else if (core.wireStart) self.render();
    });
    function up() { core.release(); }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  };

  Bench.prototype.render = function () {
    if (this._hidden()) { this.dirty = true; return; }
    this.dirty = false;
    var self = this, core = this.core, L = core.layout, res = this.sim && this.sim.res;
    var byId = {}; L.parts.forEach(function (p) { byId[p.id] = p; });
    var used = {}; L.wires.forEach(function (w) { used[w.from] = (used[w.from] || 0) + 1; used[w.to] = (used[w.to] || 0) + 1; });
    function pp(pid) { var s = pid.split('.'); return byId[s[0]] ? self.pinPos(byId[s[0]], s[1]) : [0, 0]; }
    var h = [];
    h.push('<defs>' +
      '<linearGradient id="bBlock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe5ea"/><stop offset="1" stop-color="#b3bec7"/></linearGradient>' +
      '<linearGradient id="bResBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecd9b8"/><stop offset="1" stop-color="#c7aa7c"/></linearGradient>' +
      '<radialGradient id="bBrass" cx=".35" cy=".35"><stop offset="0" stop-color="#fff1b8"/><stop offset=".6" stop-color="#c9a227"/><stop offset="1" stop-color="#7a5e10"/></radialGradient>' +
      '<radialGradient id="bMetal" cx=".35" cy=".35"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".7" stop-color="#9da3a8"/><stop offset="1" stop-color="#5d6266"/></radialGradient>' +
      '<radialGradient id="bGlow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffcf4a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>' +
      '<pattern id="bMat" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="#35645a"/><path d="M50 0H0V50" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1.5"/></pattern>' +
      '<linearGradient id="bWood" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#8b6a47"/><stop offset=".5" stop-color="#a07c55"/><stop offset="1" stop-color="#7d5e3e"/></linearGradient>' +
      '<filter id="bShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="5" dy="10" stdDeviation="5" flood-color="#000" flood-opacity=".45"/></filter>' +
      '<filter id="bCable" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="2" dy="6" stdDeviation="3" flood-color="#000" flood-opacity=".4"/></filter>' +
      '<filter id="bBlur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="9"/></filter>' +
      '<filter id="bSoft" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="1.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>');
    // Tisch (Holz) und Tischkante vorne, darauf die Laborunterlage
    h.push('<rect class="btable" x="-2000" y="-2000" width="' + (W + 4000) + '" height="' + (2000 + H * K + 20) + '" fill="url(#bWood)"/>' +
      '<rect x="-2000" y="' + (H * K + 20) + '" width="' + (W + 4000) + '" height="26" fill="#5a4129"/><rect x="-2000" y="' + (H * K + 46) + '" width="' + (W + 4000) + '" height="2000" fill="#1b1612"/>');
    h.push('<g class="bscene" transform="scale(1 ' + K + ')">');
    h.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="14" fill="url(#bMat)" stroke="#23443c" stroke-width="3"/>');
    // Bausteine
    L.parts.forEach(function (p) {
      var q = core.pos(p, 'bench'), r = res && res.parts[p.id], sel = core.sel === p.id, sz = size(p.type), rot = q.rot || 0;
      var hw = (rot % 180 ? sz[1] : sz[0]) / 2, hh = (rot % 180 ? sz[0] : sz[1]) / 2, vt = Ed.valueText(p);
      var tip = p.id + ' – ' + E.PARTS[p.type].label + (vt ? ' ' + vt : '');
      h.push('<g class="bpart' + (sel ? ' selected' : '') + (core.locked[p.id] ? ' locked' : '') + '" data-part="' + p.id + '" transform="translate(' + q.x + ' ' + q.y + ')">' +
        '<title>' + esc(tip) + '</title>' +
        '<g filter="url(#bShadow)" transform="rotate(' + rot + ')">' + illus(p, r) + '</g>' +
        (sel ? '<rect class="bsel" x="' + (-hw - 7) + '" y="' + (-hh - 7) + '" width="' + (2 * hw + 14) + '" height="' + (2 * hh + 14) + '" rx="12"/>' : '') +
        '<g transform="scale(1 ' + (1 / K) + ')"><text class="blbl" y="' + ((-hh - 9) * K) + '">' + esc(p.id) + (vt ? ' · ' + esc(vt) : '') + '</text></g>' +
        '</g>');
    });
    // Laborkabel
    L.wires.forEach(function (w, i) {
      var a = pp(w.from), b = pp(w.to), d = cablePath(a, b), col = cableColor(w, i, byId), sel = core.sel === 'w:' + i;
      h.push('<g data-wire="' + i + '" class="bwire' + (sel ? ' selected' : '') + '"><path class="bwirehit" d="' + d + '"/>' +
        '<g filter="url(#bCable)">' + (sel ? '<path d="' + d + '" fill="none" stroke="#ffb000" stroke-width="14" stroke-linecap="round" opacity=".8"/>' : '') +
        '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="5.5" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5" transform="translate(-1 -1.5)"/>' +
        plug(a, col) + plug(b, col) + '</g></g>');
    });
    // Buchsen (Klickflaechen, oben)
    L.parts.forEach(function (p) {
      Object.keys(GEO[p.type]).forEach(function (pin) {
        var pid = p.id + '.' + pin, xy = self.pinPos(p, pin);
        h.push('<g data-pin="' + pid + '"><circle class="bpinhit" cx="' + xy[0] + '" cy="' + xy[1] + '" r="14"/>' +
          '<circle class="bpin' + (core.wireStart === pid ? ' active' : '') + (used[pid] ? ' used' : '') + '" cx="' + xy[0] + '" cy="' + xy[1] + '" r="12"><title>' + pid + '</title></circle></g>');
      });
    });
    // Kabel im Entstehen
    if (core.wireStart && byId[core.wireStart.split('.')[0]]) {
      var a = pp(core.wireStart);
      h.push('<path class="bwire pending" d="' + cablePath(a, this.mouse) + '"/>');
    }
    // Messspitzen (einfach; Multimeter auf der Werkbank folgt in Phase 4)
    [['a', '#d32f2f'], ['b', '#1e1e1e']].forEach(function (k) {
      var pid = core.probes[k[0]]; if (!pid || !byId[pid.split('.')[0]]) return;
      var xy = pp(pid);
      h.push('<g class="bprobe" filter="url(#bCable)"><path d="M' + xy[0] + ' ' + xy[1] + 'l18 -34" stroke="#bbb" stroke-width="3"/>' +
        '<path d="M' + (xy[0] + 16) + ' ' + (xy[1] - 30) + 'l22 -40" stroke="' + k[1] + '" stroke-width="11" stroke-linecap="round"/></g>');
    });
    h.push('</g>');
    this.svg.innerHTML = h.join('');
  };

  root.DQBench = Bench;
})(typeof window !== 'undefined' ? window : globalThis);

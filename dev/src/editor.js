/* Digital Quest – Schaltplan-Editor (window.DQEditor)
 * SVG, Raster 20 px, Bauteile nach IEC/DIN-Symbolik. Live-Simulation: Die App uebergibt
 * nach jeder Aenderung das Ergebnis (setSim), der Editor zeichnet Leuchten, Spannungsfarben, Schaeden.
 * Werkzeuge: 'wire' (Anschluss → Anschluss verbinden) und 'probe' (Messspitzen setzen). */
(function (root) {
  'use strict';
  var E = root.DQEngine;
  var GRID = 20, W = 1000, H = 620;
  var TWO = { a: [-40, 0], b: [40, 0] };
  var GEO = {
    ground: { g: [0, -20] }, battery: { p: [0, -40], n: [0, 40] },
    resistor: TWO, lamp: TWO, switch: TWO, button: TWO, capacitor: TWO, ammeter: TWO,
    led: { a: [-40, 0], k: [40, 0] }, diode: { a: [-40, 0], k: [40, 0] },
    pot: { a: [-40, 0], b: [40, 0], w: [0, 40] }, clock: { out: [40, 0] },
    not: { in: [-40, 0], out: [40, 0] }
  };
  ['and', 'or', 'nand', 'nor', 'xor'].forEach(function (g) { GEO[g] = { in1: [-40, -20], in2: [-40, 20], out: [40, 0] }; });
  var GATE_SIGN = { and: '&amp;', nand: '&amp;', or: '≥1', nor: '≥1', xor: '=1', not: '1' };

  function rotPt(p, rot) {
    var x = p[0], y = p[1];
    switch (((rot || 0) % 360 + 360) % 360) { case 90: return [-y, x]; case 180: return [-x, -y]; case 270: return [y, -x]; default: return [x, y]; }
  }
  function pinPos(part, pin) { var o = rotPt(GEO[part.type][pin], part.rot); return [part.x + o[0], part.y + o[1]]; }
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
      case 'resistor': case 'pot': case 'lamp': return fmtVal(v) + ' Ω';
      case 'capacitor': return fmtVal(v) + 'F';
      case 'clock': return fmtVal(q.freq || d.props.freq) + ' Hz';
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
      case 'ammeter':
        s = '<path ' + c + ' d="M-40 0H-14M14 0H40"/><circle ' + c + ' r="14"/><text class="symtxt" y="5">A</text>'; break;
      case 'battery':
        s = '<path ' + c + ' d="M0-40V-6M0 6V40"/><path class="sym thick" d="M-16-6H16"/><path class="sym thick2" d="M-8 6H8"/><text class="plus" x="12" y="-14">+</text>'; break;
      case 'ground':
        s = '<path ' + c + ' d="M0-20V0M-14 0H14M-9 6H9M-4 12H4"/>'; break;
      case 'clock':
        var hi = r.high;
        s = '<rect ' + c + ' x="-22" y="-18" width="44" height="36" rx="3"/><path class="sym thin" d="M-14 8H-7V-8H0V8H7V-8H14"/><path ' + c + ' d="M22 0H40"/>' +
          '<circle cx="15" cy="-12" r="3" class="' + (hi ? 'lamp-on' : 'lamp-off') + '"/>'; break;
      default:
        if (GATE_SIGN[p.type]) {
          var inv = /^n|not/.test(p.type), two = p.type !== 'not';
          s = '<rect ' + c + ' x="-22" y="-30" width="44" height="60" rx="2"/><text class="symtxt" y="6">' + GATE_SIGN[p.type] + '</text>' +
            (two ? '<path ' + c + ' d="M-40-20H-22M-40 20H-22"/>' : '<path ' + c + ' d="M-40 0H-22"/>') +
            (inv ? '<circle ' + c + ' cx="27" r="5"/><path ' + c + ' d="M32 0H40"/>' : '<path ' + c + ' d="M22 0H40"/>') +
            (r.out !== undefined ? '<circle cx="34" cy="-10" r="3" class="' + (r.out ? 'lamp-on' : 'lamp-off') + '"/>' : '');
        }
    }
    if (r.burnt) s += '<path class="burnt" d="M-16-16L16 16M-16 16L16-16"/>';
    return s;
  }

  function labels(p) { // Beschriftung neben senkrechten, ueber/unter waagrechten Bauteilen
    var vert = (p.type === 'battery' || p.type === 'ground') ? (p.rot || 0) % 180 === 0 : (p.rot || 0) % 180 === 90;
    var v = esc(valueText(p));
    if (vert) return '<text class="lbl" x="24" y="-4" text-anchor="start">' + esc(p.id) + '</text><text class="val" x="24" y="12" text-anchor="start">' + v + '</text>';
    var up = GATE_SIGN[p.type] ? -38 : -24, dn = GATE_SIGN[p.type] ? 48 : 30;
    return '<text class="lbl" y="' + up + '">' + esc(p.id) + '</text><text class="val" y="' + dn + '">' + v + '</text>';
  }
  function voltColor(v, vmax) {
    var t = vmax > 0 ? Math.max(0, Math.min(1, v / vmax)) : 0; // 0 V blau → max rot
    var h = 220 - 220 * t; return 'hsl(' + h.toFixed(0) + ',85%,58%)';
  }

  function Editor(svg, opts) {
    this.svg = svg; this.opts = opts || {};
    this.layout = { parts: [], wires: [] }; this.locked = {};
    this.sel = null; this.wireStart = null; this.tool = 'wire';
    this.probes = { a: null, b: null }; this.sim = null; this.showVolt = false;
    this.mouse = [0, 0]; this.drag = null;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    this._bind();
  }
  Editor.GEO = GEO; Editor.pinPos = pinPos; Editor.symbol = symbol; Editor.fmtVal = fmtVal;

  Editor.prototype.load = function (layout, lockedIds) {
    this.layout = E.clone(layout); this.locked = {};
    (lockedIds || []).forEach(function (id) { this.locked[id] = true; }, this);
    this.sel = null; this.wireStart = null; this.probes = { a: null, b: null };
    this.fit();
  };
  /* Ansicht auf die Bauteile einpassen (mind. 640 × 400, Rand 140) – nur beim Laden und auf Wunsch, nie waehrend des Ziehens */
  Editor.prototype.fit = function () {
    var ps = this.layout.parts, x0 = 300, y0 = 200, x1 = 700, y1 = 420;
    if (ps.length) { x0 = Math.min.apply(null, ps.map(function (p) { return p.x; })); x1 = Math.max.apply(null, ps.map(function (p) { return p.x; }));
      y0 = Math.min.apply(null, ps.map(function (p) { return p.y; })); y1 = Math.max.apply(null, ps.map(function (p) { return p.y; })); }
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, box = this.svg.getBoundingClientRect(), small = box.width && box.width < 600;
    var w = Math.max(small ? 380 : 640, x1 - x0 + (small ? 160 : 280)), h = Math.max(small ? 240 : 400, y1 - y0 + (small ? 160 : 280)),  ar = box.width && box.height ? box.width / box.height : W / H;
    if (w / h < ar) w = h * ar; else h = w / ar;
    this.view = [Math.max(0, Math.min(W - w, cx - w / 2)), Math.max(0, Math.min(H - h, cy - h / 2)), Math.min(w, W), Math.min(h, H)];
    this.svg.setAttribute('viewBox', this.view.join(' '));
    this.render();
  };
  Editor.prototype.part = function (id) { return this.layout.parts.filter(function (p) { return p.id === id; })[0]; };
  Editor.prototype.changed = function (kind) { this.render(); if (this.opts.onChange) this.opts.onChange(kind || 'edit'); };
  Editor.prototype.setSim = function (sim) { this.sim = sim; this.render(); };

  Editor.prototype.nextId = function (type) {
    var pre = E.PARTS[type].prefix, used = {}, n = 1;
    this.layout.parts.forEach(function (p) { used[p.id] = true; });
    while (used[pre + n]) n++; return pre + n;
  };
  Editor.prototype.addPart = function (type) {
    var id = this.nextId(type), parts = this.layout.parts, v = this.view || [0, 0, W, H], cx0 = Math.round((v[0] + v[2] / 2) / GRID) * GRID, cy0 = Math.round((v[1] + v[3] / 2) / GRID) * GRID, x = cx0, y = cy0, ring = 0, k = 0;
    function free(x, y) { return parts.every(function (p) { return Math.abs(p.x - x) > 90 || Math.abs(p.y - y) > 70; }); }
    while (!free(x, y) && ring < 12) { // spiralfoermig freien Platz suchen
      k++; var ang = k * 0.9; ring = Math.floor(k / 7) + 1;
      x = Math.round((cx0 + Math.cos(ang) * 120 * ring) / GRID) * GRID; y = Math.round((cy0 + Math.sin(ang) * 90 * ring) / GRID) * GRID;
      x = Math.max(60, Math.min(W - 60, x)); y = Math.max(60, Math.min(H - 60, y));
    }
    var p = { id: id, type: type, x: x, y: y, rot: type === 'battery' || type === 'ground' ? 0 : 0, props: {} };
    parts.push(p); this.sel = id; this.changed('add');
    return p;
  };
  Editor.prototype.removeSelected = function () {
    var s = this.sel; if (!s) return false;
    if (s.indexOf('w:') === 0) { this.layout.wires.splice(+s.slice(2), 1); }
    else {
      if (this.locked[s]) { if (this.opts.onMessage) this.opts.onMessage('Dieses Bauteil gehoert zur Aufgabe und bleibt.'); return false; }
      this.layout.parts = this.layout.parts.filter(function (p) { return p.id !== s; });
      this.layout.wires = this.layout.wires.filter(function (w) { return w.from.split('.')[0] !== s && w.to.split('.')[0] !== s; });
      ['a', 'b'].forEach(function (k) { if (this.probes[k] && this.probes[k].split('.')[0] === s) this.probes[k] = null; }, this);
    }
    this.sel = null; this.changed('delete'); return true;
  };
  Editor.prototype.rotateSelected = function () {
    var p = this.sel && this.part(this.sel); if (!p) return;
    p.rot = ((p.rot || 0) + 90) % 360; this.changed('rotate');
  };

  Editor.prototype._pt = function (ev) {
    var pt = this.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = this.svg.getScreenCTM(); if (!m) return [0, 0];
    var r = pt.matrixTransform(m.inverse()); return [r.x, r.y];
  };
  Editor.prototype._bind = function () {
    var self = this, svg = this.svg;
    svg.addEventListener('pointerdown', function (ev) {
      var t = ev.target.closest('[data-pin],[data-part],[data-wire]'), xy = self._pt(ev);
      if (t && t.dataset.pin) {
        ev.preventDefault();
        var pin = t.dataset.pin;
        if (self.tool === 'probe') { if (self.opts.onProbe) self.opts.onProbe(pin); return; }
        if (!self.wireStart) { self.wireStart = pin; self.render(); return; }
        if (self.wireStart !== pin) {
          var a = self.wireStart, dup = self.layout.wires.some(function (w) { return (w.from === a && w.to === pin) || (w.from === pin && w.to === a); });
          if (!dup) self.layout.wires.push({ from: a, to: pin });
          self.wireStart = null; self.changed('wire'); return;
        }
        self.wireStart = null; self.render(); return;
      }
      if (t && t.dataset.wire !== undefined) { self.sel = 'w:' + t.dataset.wire; self.wireStart = null; self.render(); if (self.opts.onSelect) self.opts.onSelect(null); return; }
      if (t && t.dataset.part) {
        var p = self.part(t.dataset.part); self.sel = p.id; self.wireStart = null;
        self.drag = { id: p.id, ox: xy[0] - p.x, oy: xy[1] - p.y, sx: xy[0], sy: xy[1], moved: false };
        if (p.type === 'button') { p.props = p.props || {}; p.props.closed = true; self.changed('toggle'); }
        svg.setPointerCapture(ev.pointerId); self.render(); if (self.opts.onSelect) self.opts.onSelect(p);
        return;
      }
      self.sel = null; self.wireStart = null; self.render(); if (self.opts.onSelect) self.opts.onSelect(null);
    });
    svg.addEventListener('pointermove', function (ev) {
      var xy = self._pt(ev); self.mouse = xy;
      if (self.drag) {
        var d = self.drag, p = self.part(d.id);
        if (Math.abs(xy[0] - d.sx) + Math.abs(xy[1] - d.sy) > 6) d.moved = true;
        if (d.moved) {
          var nx = Math.round((xy[0] - d.ox) / GRID) * GRID, ny = Math.round((xy[1] - d.oy) / GRID) * GRID;
          nx = Math.max(40, Math.min(W - 40, nx)); ny = Math.max(40, Math.min(H - 40, ny));
          if (nx !== p.x || ny !== p.y) { p.x = nx; p.y = ny; self.render(); }
        }
      } else if (self.wireStart) self.render();
    });
    function up() {
      var d = self.drag; self.drag = null; if (!d) return;
      var p = self.part(d.id); if (!p) return;
      if (p.type === 'button') { p.props.closed = false; self.changed('toggle'); return; }
      if (!d.moved && p.type === 'switch') { p.props = p.props || {}; p.props.closed = !p.props.closed; self.changed('toggle'); return; }
      if (d.moved) self.changed('move');
    }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  };
  Editor.prototype.key = function (ev) {
    if (ev.key === 'Delete' || ev.key === 'Backspace') { if (this.removeSelected()) ev.preventDefault(); }
    else if (ev.key === 'r' || ev.key === 'R') this.rotateSelected();
    else if (ev.key === 'Escape') { this.wireStart = null; this.sel = null; this.render(); }
  };

  Editor.prototype.render = function () {
    var self = this, L = this.layout, sim = this.sim, res = sim && sim.res, pinNode = sim && sim.pinNode;
    var vmax = 0; if (res) Object.keys(res.nodeV).forEach(function (n) { vmax = Math.max(vmax, res.nodeV[n]); });
    var byId = {}; L.parts.forEach(function (p) { byId[p.id] = p; });
    var pinWireCount = {}; L.wires.forEach(function (w) { pinWireCount[w.from] = (pinWireCount[w.from] || 0) + 1; pinWireCount[w.to] = (pinWireCount[w.to] || 0) + 1; });
    function pp(pid) { var s = pid.split('.'); return byId[s[0]] ? pinPos(byId[s[0]], s[1]) : [0, 0]; }
    function dir(pid) { var s = pid.split('.'), p = byId[s[0]]; if (!p) return [0, 0]; var o = rotPt(GEO[p.type][s[1]], p.rot); return [Math.sign(o[0]), Math.abs(o[0]) >= Math.abs(o[1]) ? 0 : Math.sign(o[1])]; }
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
      if (!self.showVolt || !res || !pinNode) return null;
      var n = pinNode[pid]; return n === undefined ? null : voltColor(res.nodeV[n] || 0, vmax);
    }
    var h = [];
    h.push('<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" class="griddot"/></pattern>' +
      '<radialGradient id="glowAmber"><stop offset="0" stop-color="#ffcf4a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>' +
      '<filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6"/></filter></defs>');
    h.push('<rect width="' + W + '" height="' + H + '" fill="url(#grid)"/>');
    // Leitungen
    L.wires.forEach(function (w, i) {
      var col = wcol(w.from), d = route(w.from, w.to);
      h.push('<g data-wire="' + i + '"><path class="wirehit" d="' + d + '"/><path class="wire' + (self.sel === 'w:' + i ? ' selected' : '') + '" d="' + d + '"' + (col ? ' style="stroke:' + col + '"' : '') + '/></g>');
    });
    // Bauteile
    L.parts.forEach(function (p) {
      var r = res && res.parts[p.id], sel = self.sel === p.id;
      var tip = p.id + ' – ' + E.PARTS[p.type].label + (valueText(p) ? ' ' + valueText(p) : '');
      if (r && r.v !== undefined) tip += '\nU = ' + E.fmt(Math.abs(r.v), 'V');
      if (r && r.i !== undefined) tip += '\nI = ' + E.fmt(Math.abs(r.i), 'A');
      if (r && r.p !== undefined && Math.abs(r.p) > 1e-9) tip += '\nP = ' + E.fmt(Math.abs(r.p), 'W');
      if (r && r.burnt) tip += '\nDEFEKT';
      h.push('<g class="part' + (sel ? ' selected' : '') + (self.locked[p.id] ? ' locked' : '') + '" data-part="' + p.id + '" transform="translate(' + p.x + ' ' + p.y + ')">' +
        '<title>' + esc(tip) + '</title><rect class="hit" x="-44" y="-34" width="88" height="68"/>' +
        '<g transform="rotate(' + (p.rot || 0) + ')">' + symbol(p, r) + '</g>' +
        labels(p) + '</g>');
    });
    // Anschluesse
    L.parts.forEach(function (p) {
      Object.keys(GEO[p.type]).forEach(function (pin) {
        var pid = p.id + '.' + pin, xy = pinPos(p, pin), col = wcol(pid);
        var cls = 'pin' + (self.wireStart === pid ? ' active' : '') + (pinWireCount[pid] ? ' used' : '') + (pinWireCount[pid] > 1 ? ' junction' : '');
        h.push('<g data-pin="' + pid + '"><circle class="pinhit" cx="' + xy[0] + '" cy="' + xy[1] + '" r="11"/><circle class="' + cls + '" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (pinWireCount[pid] > 1 ? 5 : 4) + '"' + (col ? ' style="fill:' + col + '"' : '') + '><title>' + pid + (res && pinNode && pinNode[pid] !== undefined ? ' – ' + E.fmt(res.nodeV[pinNode[pid]] || 0, 'V') + ' gegen Masse' : '') + '</title></circle></g>');
        if (self.showVolt && res && pinNode && pinNode[pid] !== undefined && pin !== 'g')
          h.push('<text class="vlabel" x="' + (xy[0] + 6) + '" y="' + (xy[1] - 6) + '">' + E.fmt(res.nodeV[pinNode[pid]] || 0, 'V') + '</text>');
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
      h.push('<g class="probe ' + k[1] + '"><path d="M' + xy[0] + ' ' + xy[1] + 'l14 -30"/><circle cx="' + (xy[0] + 14) + '" cy="' + (xy[1] - 36) + '" r="9"/><text x="' + (xy[0] + 14) + '" y="' + (xy[1] - 32) + '">' + (k[0] === 'a' ? '+' : '−') + '</text></g>');
    });
    this.svg.innerHTML = h.join('');
  };

  root.DQEditor = Editor;
})(typeof window !== 'undefined' ? window : globalThis);

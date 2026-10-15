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
    ground: { g: [0, -20] }, node: { p: [0, 0] }, battery: { p: [0, -40], n: [0, 40] }, acsource: { p: [0, -40], n: [0, 40] },
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
  var DYNGEO = {}, EXTRA = { async: false, nodes: false, mouse: false, grid: { mode: 'dots', size: 20 } }; // nodes: Knotenpunkte auf Leitungen (nur Studio)
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
  /* Leitungsweg als Punktfolge: kurzer Stummel aus jedem Anschluss heraus, dazwischen rechtwinklig (Knotenpunkte haben keine Richtung).
   * jog verschiebt das mittlere Stueck seitlich (Kanaltrennung, s. routeAll); null, wenn dort kein Platz ist. */
  function routePts(a, b, da, db, jog) {
    da = da.slice(); db = db.slice();
    if (da[1] !== 0) da[0] = 0; if (db[1] !== 0) db[0] = 0;
    var sa = [a[0] + da[0] * 20, a[1] + da[1] * 20], sb = [b[0] + db[0] * 20, b[1] + db[1] * 20];
    if (a[0] === b[0] || a[1] === b[1]) return jog ? null : [a, b];
    function sg(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
    function pen(c) { // Umwege bestrafen: erstes Segment gegen die Austrittsrichtung, letztes gegen die Eintrittsrichtung
      var s1 = [sg(c[0] - sa[0]), sg(c[1] - sa[1])], s2 = [sg(sb[0] - c[0]), sg(sb[1] - c[1])];
      return (s1[0] === -da[0] && s1[0] !== 0 ? 1 : 0) + (s1[1] === -da[1] && s1[1] !== 0 ? 1 : 0) +
        (s2[0] === db[0] && s2[0] !== 0 ? 1 : 0) + (s2[1] === db[1] && s2[1] !== 0 ? 1 : 0);
    }
    var hFirst = pen([sb[0], sa[1]]) <= pen([sa[0], sb[1]]);
    if (!jog) return [a, sa, hFirst ? [sb[0], sa[1]] : [sa[0], sb[1]], sb, b];
    var k = hFirst ? 0 : 1, X = sb[k] + jog, lo = Math.min(sa[k], sb[k]), hi = Math.max(sa[k], sb[k]);
    if (hi - lo < 12 || X < lo + 4 || X > hi - 4) return null;
    var pts = hFirst ? [a, sa, [X, sa[1]], [X, sb[1]], sb, b] : [a, sa, [sa[0], X], [sb[0], X], sb, b];
    return pts.filter(function (q, n) { return n === 0 || q[0] !== pts[n - 1][0] || q[1] !== pts[n - 1][1]; });
  }
  /* Zwei Leitungen verschiedener Netze duerfen nicht auf einem Stueck uebereinander oder aneinanderstossend verlaufen (sonst sieht man nicht, was verbunden ist) */
  function clash(p, q) {
    for (var i = 0; i + 1 < p.length; i++) for (var j = 0; j + 1 < q.length; j++) {
      var s0 = p[i], s1 = p[i + 1], t0 = q[j], t1 = q[j + 1], sv = s0[0] === s1[0], tv = t0[0] === t1[0];
      if ((s0[0] === s1[0] && s0[1] === s1[1]) || (t0[0] === t1[0] && t0[1] === t1[1])) continue;
      if (sv !== tv) continue;
      var c = sv ? 0 : 1, d = sv ? 1 : 0; if (Math.abs(s0[c] - t0[c]) > 3) continue;
      if (Math.min(Math.max(s0[d], s1[d]), Math.max(t0[d], t1[d])) - Math.max(Math.min(s0[d], s1[d]), Math.min(t0[d], t1[d])) >= 0) return true;
    }
    return false;
  }
  var JOGS = [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40];
  var ROUTES = { sig: null, polys: [] };
  /* Alle Leitungswege des Layouts. Studio (Editor.extra.nodes): Leitungen verschiedener Netze, die dieselbe senkrechte oder waagrechte Bahn
   * bekaemen, werden seitlich versetzt – die zuerst gezeichnete Leitung bleibt, wo sie ist. Spiel: wie bisher ein Weg je Leitung. */
  function routeAll(layout) {
    var sig = JSON.stringify([layout.parts.map(function (p) { return [p.id, p.type, p.x, p.y, p.rot || 0, p.props && (p.props.inputs || p.props.bits || p.props.modn)]; }), layout.wires.map(function (w) { return [w.from, w.to]; }), EXTRA.nodes ? 1 : 0]);
    if (ROUTES.sig === sig) return ROUTES.polys;
    var byId = {}; layout.parts.forEach(function (p) { byId[p.id] = p; });
    var parent = {}, find = function (x) { if (parent[x] === undefined) parent[x] = x; while (parent[x] !== x) x = parent[x]; return x; };
    layout.wires.forEach(function (w) { var a = find(w.from), b = find(w.to); if (a !== b) parent[a] = b; });
    function end(pid) { var t = pid.split('.'), p = byId[t[0]]; if (!p || !geoOf(p)[t[1]]) return null; var o = rotPt(geoOf(p)[t[1]], p.rot); return { xy: [p.x + o[0], p.y + o[1]], d: [Math.sign(o[0]), Math.abs(o[0]) >= Math.abs(o[1]) ? 0 : Math.sign(o[1])] }; }
    var ends = layout.wires.map(function (w) { return { a: end(w.from), b: end(w.to), net: find(w.from) }; });
    function build(order) { // Leitungen in dieser Reihenfolge verlegen; Rueckgabe {polys, bad = Zahl der verbliebenen Ueberschneidungen}
      var polys = [], placed = [], bad = 0;
      order.forEach(function (i) {
        var e = ends[i], pts = null; if (!e.a || !e.b) { polys[i] = []; return; }
        for (var k = 0; k < (EXTRA.nodes ? JOGS.length : 1); k++) {
          var c = routePts(e.a.xy, e.b.xy, e.a.d, e.b.d, JOGS[k]); if (!c) continue;
          if (k === 0) pts = c; // Grundweg, falls nichts anderes frei ist
          if (!placed.some(function (o) { return o.net !== e.net && clash(o.pts, c); })) { pts = c; break; }
        }
        if (placed.some(function (o) { return o.net !== e.net && clash(o.pts, pts); })) bad++;
        polys[i] = pts; placed.push({ net: e.net, pts: pts });
      });
      return { polys: polys, bad: bad };
    }
    var idx = layout.wires.map(function (w, i) { return i; }), best = build(idx);
    if (EXTRA.nodes && best.bad) { // andere Reihenfolgen probieren (rueckwaerts, nach Zielhoehe sortiert), die beste behalten
      [idx.slice().reverse(), idx.slice().sort(function (p, q) { return (ends[q].b ? ends[q].b.xy[1] : 0) - (ends[p].b ? ends[p].b.xy[1] : 0); }), idx.slice().sort(function (p, q) { return (ends[p].b ? ends[p].b.xy[1] : 0) - (ends[q].b ? ends[q].b.xy[1] : 0); })].forEach(function (o) {
        if (best.bad) { var t = build(o); if (t.bad < best.bad) best = t; }
      });
    }
    var polys = best.polys;
    ROUTES = { sig: sig, polys: polys }; return polys;
  }
  /* Paare von Leitungen verschiedener Netze, die auf einem Stueck uebereinander laufen (Test «aufgeraeumt») */
  function routeClashes(layout) {
    var polys = routeAll(layout), parent = {}, find = function (x) { if (parent[x] === undefined) parent[x] = x; while (parent[x] !== x) x = parent[x]; return x; }, out = [];
    layout.wires.forEach(function (w) { var a = find(w.from), b = find(w.to); if (a !== b) parent[a] = b; });
    for (var i = 0; i < polys.length; i++) for (var j = i + 1; j < polys.length; j++) if (find(layout.wires[i].from) !== find(layout.wires[j].from) && clash(polys[i], polys[j])) out.push([i, j]);
    return out;
  }
  /* Punktfolge der Leitung w im Layout (fuer Treffer auf der Leitung und Knotenpunkte) */
  function wirePoly(layout, w) { var i = layout.wires.indexOf(w); return i < 0 ? [] : routeAll(layout)[i] || []; }
  /* Naechster Punkt auf den Leitungen zu xy: {i, xy (auf dem Raster der Leitung), dist} oder null ausserhalb des Fangradius.
   * Nahe an einem Anschluss (Stummel) gilt kein Fang – dort wirkt der Anschluss. */
  function snapWire(layout, xy, radius, skip) {
    var best = null, g = 20;
    layout.wires.forEach(function (w, i) {
      if (skip === i) return;
      var pts = wirePoly(layout, w);
      for (var k = 0; k + 1 < pts.length; k++) {
        var a = pts[k], b = pts[k + 1], hor = a[1] === b[1], ver = a[0] === b[0]; if (!hor && !ver) continue;
        var lo = hor ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]), hi = hor ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
        var t = hor ? xy[0] : xy[1], c = Math.max(lo, Math.min(hi, t)), q = hor ? [c, a[1]] : [a[0], c];
        var gc = Math.round(c / g) * g; if (gc >= lo && gc <= hi) q = hor ? [gc, a[1]] : [a[0], gc];
        var dd = Math.hypot(q[0] - xy[0], q[1] - xy[1]);
        if (dd <= radius && (!best || dd < best.dist)) best = { i: i, xy: q, dist: dd, hor: hor };
      }
    });
    if (best) { var b0 = best, near = layout.parts.some(function (p) { return Object.keys(geoOf(p)).some(function (pin) { var pp = pinPos(p, pin); return Math.hypot(pp[0] - b0.xy[0], pp[1] - b0.xy[1]) < 8; }); }); if (near) best = null; }
    return best;
  }
  /* Messwerte im Schaltplan: je Knoten die Spannung gegen den Bezugspunkt, je Bauteil der Strom. Die Beschriftungen weichen einander und den
   * Bauteilkoerpern aus (Kandidatenplaetze rund um den Anschluss, dann immer weiter aussen). Klasse vlabel = Spannung, ilabel = Strom. */
  function shortFmt(v, u) { return E.fmt(v, u).replace(/(\.\d*?)0+(?= )/, '$1').replace(/\.(?= )/, ''); } // 7.500 V → 7.5 V, 10.000 V → 10 V
  function measureLabels(self, L, res, pinNode, pinWireCount, byId) {
    var occ = [], out = [], H = 13, ref = self.refMark ? pinNode[self.refMark] : undefined;
    L.parts.forEach(function (p) {
      if (p.type === 'node') return;
      var xs = [], ys = []; Object.keys(geoOf(p)).forEach(function (k) { var q = pinPos(p, k); xs.push(q[0]); ys.push(q[1]); });
      var hx = Math.max(22, (Math.max.apply(null, xs) - Math.min.apply(null, xs)) / 2 - 10), hy = Math.max(16, (Math.max.apply(null, ys) - Math.min.apply(null, ys)) / 2 - 10);
      occ.push([p.x - hx, p.y - hy, p.x + hx, p.y + hy]);
    });
    if (self.refMark && byId[self.refMark.split('.')[0]]) { var rq = self.refMark.split('.'), rxy = pinPos(byId[rq[0]], rq[1]); occ.push([rxy[0] - 10, rxy[1] + 5, rxy[0] + 52, rxy[1] + 23]); } // «⏚ 0 V» bleibt frei
    function hit(r) { return occ.some(function (o) { return r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]; }); }
    function put(cls, txt, cands) {
      var w = txt.length * 6.7 + 6, r = null, k, c;
      for (k = 0; k < cands.length && !r; k++) { c = cands[k](w); var q = [c[0], c[1], c[0] + w, c[1] + H]; if (!hit(q)) r = q; }
      for (var ring = 1; ring <= 40 && !r; ring++) for (k = 0; k < 8 && !r; k++) { var ang = k * Math.PI / 4, base = cands[0](w); var q2 = [base[0] + Math.cos(ang) * 12 * ring, base[1] + Math.sin(ang) * 10 * ring]; q2 = [q2[0], q2[1], q2[0] + w, q2[1] + H]; if (!hit(q2)) r = q2; }
      if (!r) return; occ.push(r); out.push('<text class="' + cls + '" x="' + (r[0] + 3).toFixed(1) + '" y="' + (r[1] + H - 3).toFixed(1) + '">' + txt + '</text>');
    }
    if (self.showVolt) {
      var done = {}, nodes = {};
      var add = function (pid, xy) { var n = pinNode[pid]; if (n === undefined) return; (nodes[n] = nodes[n] || []).push({ pid: pid, xy: xy, used: pinWireCount[pid] || 0 }); };
      L.parts.forEach(function (p) { if (p.type === 'node') add(p.id + '.p', [p.x, p.y]); else Object.keys(geoOf(p)).forEach(function (k) { if (k !== 'g') add(p.id + '.' + k, pinPos(p, k)); }); });
      Object.keys(nodes).forEach(function (n) {
        var a = nodes[n]; if (String(n) === String(ref) || !a.some(function (x) { return x.used; })) return;
        var an = a.filter(function (x) { return x.used; })[0], ax = an.xy[0], ay = an.xy[1];
        put('vlabel', shortFmt(res.nodeV[n] || 0, 'V'), [function () { return [ax + 6, ay - 19]; }, function () { return [ax + 6, ay + 6]; }, function (w) { return [ax - 6 - w, ay - 19]; }, function (w) { return [ax - 6 - w, ay + 6]; }, function (w) { return [ax - w / 2, ay - 26]; }, function (w) { return [ax - w / 2, ay + 12]; }]);
      });
    }
    if (self.showAmp) L.parts.forEach(function (p) {
      var r = res.parts[p.id], d = E.PARTS[p.type]; if (!r || !d || p.type === 'ground' || p.type === 'node' || d.logic || d.ff || d.ctr || d.digital || typeof r.i !== 'number' || !isFinite(r.i)) return;
      var b = occ.filter(function (o) { return o[0] <= p.x && o[2] >= p.x && o[1] <= p.y && o[3] >= p.y; })[0] || [p.x - 22, p.y - 16, p.x + 22, p.y + 16];
      put('ilabel', shortFmt(Math.abs(r.i), 'A'), [function (w) { return [p.x - w / 2, b[3] + 2]; }, function (w) { return [p.x - w / 2, b[1] - H - 2]; }, function (w) { return [b[2] + 2, p.y - H / 2]; }, function (w) { return [b[0] - w - 2, p.y - H / 2]; }]);
    });
    return out.join('');
  }
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
      case 'node': // Verbindungspunkt: ausgefuellter Punkt (IEC/DIN: Punkt = verbunden)
        s = '<circle class="nodedot" r="3.6"/><rect class="hit nodehit" x="-9" y="-9" width="18" height="18"/>'; break;
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

  function labels(p, selected) { // Beschriftung neben senkrechten, ueber/unter waagrechten Bauteilen
    if (p.type === 'node') return selected ? '<text class="lbl" x="8" y="-8" text-anchor="start">' + esc(p.id) + '</text>' : '';
    if (p.type === 'seg7' || p.type === 'dec7') return '<text class="lbl" y="-78">' + esc(p.id) + '</text>';
    if (E.PARTS[p.type].ctr) return '<text class="lbl" y="' + (-ctrHalf(p) - 8) + '">' + esc(p.id) + '</text><text class="val" y="' + (ctrHalf(p) + 16) + '">' + esc(valueText(p)) + '</text>';
    var vert = (p.type === 'battery' || p.type === 'ground' || p.type === 'acsource') ? (p.rot || 0) % 180 === 0 : (p.rot || 0) % 180 === 90;
    var mk = Editor.mask && Editor.mask(p), v = esc(mk != null ? mk : valueText(p)); // Studio: verborgene Werte als «?»
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
    this.sim = null; this.snap = null; this.refMark = null; this.showVolt = false; this.showAmp = false; this.mouse = [0, 0];
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
  Editor.DYNGEO = DYNGEO; Editor.extra = EXTRA; Editor.geoOf = geoOf; Editor.GEO = GEO; Editor.pinPos = pinPos; Editor.symbol = symbol; Editor.fmtVal = fmtVal; Editor.valueText = valueText; Editor.partTip = partTip; Editor.voltColor = voltColor; Editor.icon = icon; Editor.wirePoly = wirePoly; Editor.routeClashes = routeClashes; Editor.snapWire = snapWire;
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
    var inset = box.width && this.insetRight ? Math.min(this.insetRight, box.width * 0.6) : 0; // rechts frei halten (Oszilloskop-Fenster eines Beispiels)
    if (inset) ar = (box.width - inset) / box.height;
    if (w / h < ar) w = h * ar; else h = w / ar;
    var wFull = inset ? w * box.width / (box.width - inset) : w;
    this.view = [Math.max(0, Math.min(SW() - wFull, cx - w / 2)), Math.max(0, Math.min(SH() - h, cy - h / 2)), Math.min(wFull, SW()), Math.min(h, SH())];
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
    var self = this, svg = this.svg, core = this.core, pan = null, pinch = null, wirePress = null, gdrag = null, mq = null, touches = {}, lastTap = { t: 0, x: 0, y: 0 };
    function dblAt(ev) { // Doppeltipp/Doppelklick: Bauteil → heranzoomen, leere Fläche → einpassen
      var dr = ev.target.closest('[data-draw]'); if (dr && Editor.drawDouble) { Editor.drawDouble(dr.dataset.draw); return; }
      var t = ev.target.closest('[data-part]'), p = t && core.part(t.dataset.part);
      if (p && self.opts.onDouble && self.opts.onDouble(p)) return; // Studio: Zaehler aufklappen
      if (p) self.zoomTo(p); else self.fit();
    }
    svg.addEventListener('pointerdown', function (ev) {
      var mouseM = EXTRA.mouse && ev.pointerType === 'mouse' && !self.opts.tight; // Studio: Maussteuerung wie in CAD-Programmen
      if (mouseM && (ev.button === 2 || ev.button === 1)) { // rechte/mittlere Taste gehalten: Zeichenflaeche schieben; rechts ohne Ziehen = Kontextmenue beim Loslassen
        ev.preventDefault(); pan = { x: ev.clientX, y: ev.clientY, view: self.view.slice(), moved: false, button: ev.button, target: ev.target };
        if (ev.button === 2) self._rightUntil = Infinity;
        try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } return;
      }
      if (ev.pointerType === 'mouse' && ev.button !== 0) return; // Rechtsklick: nur das Kontextmenue (Studio)
      if (mouseM && self.opts.armed && self.opts.armed()) { ev.preventDefault(); self.opts.onPlace(self._pt(ev), ev); return; } // Bauteil haengt am Zeiger: Klick setzt es
      if (self.opts.tight) { /* Mini-Schaltung: kein Zoom, die Lektion scrollt */ }
      else {
        if (ev.isPrimary !== false) touches = {};
        if (ev.pointerType === 'touch') touches[ev.pointerId] = [ev.clientX, ev.clientY];
        if (Object.keys(touches).length === 2) { pan = null; if (core.drag) core.drag = null; var tp = Object.keys(touches).map(function (k) { return touches[k]; }); pinch = { d: Math.hypot(tp[0][0] - tp[1][0], tp[0][1] - tp[1][1]), view: self.view.slice(), c: [(tp[0][0] + tp[1][0]) / 2, (tp[0][1] + tp[1][1]) / 2] }; return; }
        if (!ev.target.closest('[data-pin],[data-wire]')) { // Doppeltipp/Doppelklick selbst erkennen – der Browser liefert nach dem Neuzeichnen kein dblclick
          var now = performance.now(); if (now - lastTap.t < 350 && Math.abs(ev.clientX - lastTap.x) < 24 && Math.abs(ev.clientY - lastTap.y) < 24) { lastTap.t = 0; dblAt(ev); return; } lastTap = { t: now, x: ev.clientX, y: ev.clientY };
        }
      }
      var t = ev.target.closest('[data-pin],[data-handle],[data-draw],[data-sheet],[data-part],[data-wire]'), xy = self._pt(ev);
      if (t && t.dataset.pin) { ev.preventDefault(); core.clickPin(t.dataset.pin); return; }
      if (t && t.dataset.handle !== undefined && Editor.drawHandlePress && Editor.drawHandlePress(self, t.dataset.handle, xy)) { ev.preventDefault(); try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } return; }
      if (t && t.dataset.draw !== undefined && core.tool === 'wire' && Editor.drawPress && Editor.drawPress(self, t.dataset.draw, xy)) { ev.preventDefault(); try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } return; }
      if (t && t.dataset.sheet !== undefined && core.tool === 'wire' && Editor.sheetPress && Editor.sheetPress(self, xy)) { ev.preventDefault(); try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } return; }
      if (t && (t.dataset.sheet !== undefined)) t = null;
      if (t && t.dataset.draw !== undefined) t = null; // Messen-Werkzeug: Zeichenelemente sind nicht anklickbar
      if (t && t.dataset.wire !== undefined) {
        var wi = +t.dataset.wire, sn = !core.opts.readonly && core.tool === 'wire' && EXTRA.nodes ? Editor.snapWire(core.layout, xy, 12, -1) : null;
        if (sn && sn.i !== wi) sn = null;
        if (sn && core.wireStart) { // Leitung auf einer Leitung beenden: dort entsteht ein Knotenpunkt
          var w0 = core.layout.wires[wi], st = core.wireStart; self.snap = null;
          if (w0.from === st || w0.to === st) { core.wireStart = null; core.clickWire(wi); return; }
          var np = core.splitWire(wi, sn.xy, true); core.wireStart = st; core.connectPin(np); return;
        }
        if (sn && ev.altKey) { var n2 = core.splitWire(wi, sn.xy); core.wireStart = n2; core.redraw(); return; } // Alt + Klick: Knoten setzen und von dort weiterziehen
        core.clickWire(wi);
        if (sn) { wirePress = { i: wi, x: ev.clientX, y: ev.clientY, xy: sn.xy }; try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } }
        return;
      }
      if (t && t.dataset.part) {
        var tp0 = core.part(t.dataset.part);
        if (tp0 && tp0.type === 'node' && core.wireStart) { core.clickPin(tp0.id + '.p'); return; } // Leitung an einem Knoten beenden
        var gids = EXTRA.mouse && !core.opts.readonly && self.opts.selectedIds ? self.opts.selectedIds() : [];
        if (gids.length > 1 && gids.indexOf(t.dataset.part) >= 0) { // Teil einer Mehrfachauswahl: die ganze Auswahl verschieben
          gdrag = { id: t.dataset.part, sx: xy[0], sy: xy[1], moved: false, orig: gids.map(function (id) { var q = core.part(id); return q && { id: id, x: q.x, y: q.y }; }).filter(Boolean) };
          try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } return;
        }
        if (core.pressPart(t.dataset.part, xy)) svg.setPointerCapture(ev.pointerId); return;
      }
      if (self.opts.tight) { core.clickEmpty(); return; }
      if (mouseM) { // leere Flaeche, linke Taste: Auswahlrahmen
        mq = { x0: xy[0], y0: xy[1], cx: ev.clientX, cy: ev.clientY, moved: false, add: ev.shiftKey };
        try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ } return;
      }
      pan = { x: ev.clientX, y: ev.clientY, view: self.view.slice(), moved: false }; // leere Fläche: Ziehen verschiebt, Klick hebt die Auswahl auf
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture weiter */ }
    });
    svg.addEventListener('pointermove', function (ev) {
      if (touches[ev.pointerId]) touches[ev.pointerId] = [ev.clientX, ev.clientY];
      if (pinch && Object.keys(touches).length === 2) { var tp = Object.keys(touches).map(function (k) { return touches[k]; }), d = Math.hypot(tp[0][0] - tp[1][0], tp[0][1] - tp[1][1]); if (d > 10) { self.view = pinch.view.slice(); self.zoomAt(pinch.d / d, pinch.c[0], pinch.c[1]); } return; }
      if (EXTRA.mouse) self.mouse = self._pt(ev);
      if (mq) { if (Math.hypot(ev.clientX - mq.cx, ev.clientY - mq.cy) > 4) mq.moved = true; if (mq.moved) { var q2 = self._pt(ev); self.marquee = { x0: Math.min(mq.x0, q2[0]), y0: Math.min(mq.y0, q2[1]), x1: Math.max(mq.x0, q2[0]), y1: Math.max(mq.y0, q2[1]) }; self.render(); } return; }
      if (gdrag) { // Auswahl verschieben: alle um dasselbe Rasterstueck, zusammen im Zeichenbereich gehalten
        var xg = self._pt(ev), spc = Circuit.SPACES.schema, g = spc.grid, ddx = Math.round((xg[0] - gdrag.sx) / g) * g, ddy = Math.round((xg[1] - gdrag.sy) / g) * g;
        if (Math.abs(xg[0] - gdrag.sx) + Math.abs(xg[1] - gdrag.sy) > 6) gdrag.moved = true;
        if (gdrag.moved) {
          gdrag.orig.forEach(function (o) { ddx = Math.max(spc.edge - o.x, Math.min(spc.w - spc.edge - o.x, ddx)); ddy = Math.max(spc.edge - o.y, Math.min(spc.h - spc.edge - o.y, ddy)); });
          gdrag.orig.forEach(function (o) { var q = core.part(o.id); q.x = o.x + ddx; q.y = o.y + ddy; }); self.render();
        } return;
      }
      if (pan) { var dx = ev.clientX - pan.x, dy = ev.clientY - pan.y; if (pan.button === 2 ? Math.hypot(dx, dy) > 4 : Math.abs(dx) + Math.abs(dy) > 5) { if (!pan.moved) svg.classList.add('panning'); pan.moved = true; } if (pan.moved) { var f = pan.view[2] / (svg.getBoundingClientRect().width || 1); self.setView([pan.view[0] - dx * f, pan.view[1] - dy * f, pan.view[2], pan.view[3]]); } return; }
      var xy = self._pt(ev); self.mouse = xy;
      if (self.ddrag) { Editor.drawMove(self, xy); return; }
      if (self.sdrag) { Editor.sheetMove(self, xy); return; }
      if (wirePress) { // Ziehen von einer Leitung weg: dort einen Knotenpunkt setzen und die neue Leitung beginnen
        if (Math.abs(ev.clientX - wirePress.x) + Math.abs(ev.clientY - wirePress.y) > 6) { var wp = wirePress; wirePress = null; var np = core.splitWire(wp.i, wp.xy); core.wireStart = np; core.sel = null; self.render(); }
        return;
      }
      if (core.drag) { core.dragTo(xy); if (self.opts.onDragMove && core.drag) self.opts.onDragMove(core.drag.id); }
      else if (core.wireStart || (core.tool === 'wire' && ev.altKey)) {
        var sn = core.opts.readonly || !EXTRA.nodes ? null : Editor.snapWire(core.layout, xy, 12, -1);
        self.snap = sn; self.render();
      } else if (self.snap) { self.snap = null; self.render(); }
    });
    function up(ev) {
      delete touches[ev.pointerId];
      if (pinch) { if (Object.keys(touches).length < 2) pinch = null; return; }
      if (self.ddrag) { Editor.drawRelease(self); return; }
      if (self.sdrag) { Editor.sheetRelease(self); return; }
      if (wirePress) { wirePress = null; return; }
      if (mq) { var m0 = mq; mq = null; var mr = self.marquee; self.marquee = null; if (!m0.moved) { if (!m0.add) core.clickEmpty(); else self.render(); return; }
        var ids = core.layout.parts.filter(function (q) { return q.x >= mr.x0 && q.x <= mr.x1 && q.y >= mr.y0 && q.y <= mr.y1; }).map(function (q) { return q.id; });
        if (self.opts.onMarquee) self.opts.onMarquee(ids, m0.add); else self.render(); return; }
      if (gdrag) { var gd = gdrag; gdrag = null; if (gd.moved) core.changed('move'); else { core.pressPart(gd.id, [gd.sx, gd.sy]); core.release(); } return; }
      if (pan) {
        var wasPan = pan.moved, pb = pan.button, ptg = pan.target; pan = null; svg.classList.remove('panning');
        if (pb === 2) { self._rightUntil = performance.now() + 150; if (!wasPan && self.opts.onContext) self.opts.onContext({ target: ptg, clientX: ev.clientX, clientY: ev.clientY, preventDefault: function () { } }); return; }
        if (pb === 1) return;
        if (!wasPan) core.clickEmpty(); return;
      }
      var d0 = core.drag, np0 = d0 && !d0.moved && core.part(d0.id);
      core.release();
      if (d0 && d0.moved && self.opts.onMoved) self.opts.onMoved(d0.id); // Studio: Bauteil auf eine Leitung gezogen
      if (np0 && np0.type === 'node') core.clickPin(np0.id + '.p'); // Knoten angeklickt (nicht gezogen): Leitung beginnen
    }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', function (ev) { if (self.opts.tight || !(ev.ctrlKey || ev.metaKey || EXTRA.mouse)) return; ev.preventDefault(); var dy = Math.max(-300, Math.min(300, ev.deltaY * (ev.deltaMode === 1 ? 33 : 1))); self.zoomAt(Math.exp(dy * 0.0015), ev.clientX, ev.clientY); }, { passive: false }); // Studio: das Mausrad allein zoomt, zum Zeiger hin
    Editor.prototype.rightActive = function () { return performance.now() < (this._rightUntil || 0); };
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
    var polys = routeAll(L);
    function route(i) { return polys[i] && polys[i].length ? 'M' + polys[i].map(function (q) { return q[0] + ' ' + q[1]; }).join('L') : ''; }
    function wcol(pid) {
      if (!res || !pinNode) return null;
      var own = self.opts.wireColor && self.opts.wireColor(pid, res, pinNode); if (own) return own; // Studio: Logikleitungen nach Pegel faerben
      if (!self.showVolt) return null;
      var n = pinNode[pid]; return n === undefined ? null : voltColor(res.nodeV[n] || 0, vmax);
    }
    function faultMark(p) { var ft = self.opts.faultOf && self.opts.faultOf(p.id); return ft ? '<rect class="faultmark" x="-46" y="-36" width="92" height="72" rx="6"/><text class="faulttxt" y="-42">' + esc(ft) + '</text>' : ''; } // Studio: Bauteil mit Meldung markieren
    var h = [];
    var gm = EXTRA.grid.mode, gs = EXTRA.grid.size || 20; // Gitternetz (Studio: aus, Punkte, Linien; Spiel: Punkte)
    h.push('<defs>' + (gm === 'lines' ? '<pattern id="grid" width="' + gs + '" height="' + gs + '" patternUnits="userSpaceOnUse"><path d="M' + gs + ' 0H0V' + gs + '" class="gridline" fill="none"/></pattern>' : '<pattern id="grid" width="' + gs + '" height="' + gs + '" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" class="griddot"/></pattern>') +
      '<radialGradient id="glowAmber"><stop offset="0" stop-color="#ffcf4a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>' +
      '<filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6"/></filter></defs>');
    if (gm !== 'off') h.push('<rect class="gridrect" width="' + SW() + '" height="' + SH() + '" fill="url(#grid)"/>');
    if (Editor.sheetLayer && L.sheet) h.push(Editor.sheetLayer(L)); // Zeichnungsrahmen (Studio): Druckbereich unter allem
    // Leitungen
    var wi = self.showFlow && root.DQBench ? root.DQBench.wireCurrents(L, res) : [];
    L.wires.forEach(function (w, i) {
      var col = wcol(w.from), d = route(i), iw = wi[i] || 0;
      h.push('<g data-wire="' + i + '"><path class="wirehit" d="' + d + '"/><path class="wire bcore' + (self.sel === 'w:' + i ? ' selected' : '') + '" data-i="' + iw.toExponential(3) + '" d="' + d + '"' + (col ? ' style="stroke:' + col + '"' : '') + '/></g>');
    });
    // Bauteile
    L.parts.forEach(function (p) {
      var r = res && res.parts[p.id], sel = self.sel === p.id || !!(self.opts.selected && self.opts.selected(p.id));
      var tip = partTip(p, r);
      h.push('<g class="part' + (sel ? ' selected' : '') + (self.locked[p.id] ? ' locked' : '') + '" data-part="' + p.id + '" transform="translate(' + p.x + ' ' + p.y + ')">' +
        '<title>' + esc(tip) + '</title><rect class="hit" x="-44" y="-34" width="88" height="68"/>' +
        '<g transform="rotate(' + (p.rot || 0) + ')">' + symbol(p, r) + '</g>' +
        labels(p, sel) + faultMark(p) + '</g>');
    });
    if (Editor.sheetMarks && L.sheet) h.push(Editor.sheetMarks(L)); // Bauteile ausserhalb des Druckbereichs markieren
    if (Editor.drawLayer && L.draw && L.draw.length) h.push(Editor.drawLayer(L, self.sel, !self.opts.tight)); // Zeichenelemente (Studio): eigene Ebene ueber den Bauteilen
    if (self.showFlow) h.push('<g class="bflow" pointer-events="none"></g>');
    // Anschluesse
    L.parts.forEach(function (p) {
      if (p.type === 'node') return; // Knoten: der Punkt selbst ist das Bauteil (Klick = Leitung beginnen/beenden, Ziehen = verschieben)
      Object.keys(geoOf(p)).forEach(function (pin) {
        var pid = p.id + '.' + pin, xy = pinPos(p, pin), col = wcol(pid);
        var cls = 'pin' + (self.wireStart === pid ? ' active' : '') + (pinWireCount[pid] ? ' used' : '') + (pinWireCount[pid] > 1 ? ' junction' : '');
        h.push('<g data-pin="' + pid + '"><circle class="pinhit" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (11 * hit).toFixed(1) + '"/><circle class="' + cls + '" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (pinWireCount[pid] > 1 ? 5 : 4) + '"' + (col ? ' style="fill:' + col + '"' : '') + '><title>' + pid + (res && pinNode && pinNode[pid] !== undefined ? ' – ' + E.fmt(res.nodeV[pinNode[pid]] || 0, 'V') + ' gegen Masse' : '') + '</title></circle></g>');
        if (self.refMark === pid) h.push('<text class="refmark" x="' + (xy[0] - 8) + '" y="' + (xy[1] + 18) + '">⏚ 0 V<title>Bezugspunkt 0 V – ohne schwarze Spitze misst das Oszilloskop hiergegen</title></text>'); // G1
      });
    });
    if ((self.showVolt || self.showAmp) && res && pinNode) h.push(measureLabels(self, L, res, pinNode, pinWireCount, byId)); // Spannung je Knoten, Strom je Bauteil (Studio), ueberdeckungsfrei
    if (this.snap) h.push('<circle class="snapdot" cx="' + this.snap.xy[0] + '" cy="' + this.snap.xy[1] + '" r="6" pointer-events="none"/>'); // Vorschau: hier entsteht ein Knotenpunkt
    // Leitung im Entstehen
    if (this.wireStart && byId[this.wireStart.split('.')[0]]) {
      var a = pp(this.wireStart), e = this.snap ? this.snap.xy : this.mouse;
      h.push('<path class="wire pending" d="M' + a[0] + ' ' + a[1] + 'H' + e[0] + 'V' + e[1] + '"/>');
    }
    // Messspitzen
    [['a', 'probe-red', '+'], ['b', 'probe-black', 'COM']].forEach(function (k) {
      var pid = self.probes[k[0]]; if (!pid || !byId[pid.split('.')[0]]) return;
      var xy = pp(pid);
      h.push('<g class="probe ' + k[1] + '" pointer-events="none"><path d="M' + xy[0] + ' ' + xy[1] + 'l14 -30"/><circle cx="' + (xy[0] + 14) + '" cy="' + (xy[1] - 36) + '" r="9"/><text x="' + (xy[0] + 14) + '" y="' + (xy[1] - 32) + '">' + (k[0] === 'a' ? '+' : '−') + '</text></g>');
    });
    if (this.marquee) { var mq2 = this.marquee; h.push('<rect class="marquee" x="' + mq2.x0 + '" y="' + mq2.y0 + '" width="' + (mq2.x1 - mq2.x0) + '" height="' + (mq2.y1 - mq2.y0) + '" pointer-events="none"/>'); }
    if (this.ghost) { var gh = this.ghost, ghp = { id: '', type: gh.type, props: {}, rot: gh.rot || 0 }; h.push('<g class="ghost" pointer-events="none" transform="translate(' + gh.x + ' ' + gh.y + ')"><g transform="rotate(' + ghp.rot + ')">' + symbol(ghp, null) + '</g></g>'); } // Bauteil am Zeiger (Studio)
    if (this.insertMark) h.push('<circle class="insmark" cx="' + this.insertMark[0] + '" cy="' + this.insertMark[1] + '" r="9" pointer-events="none"/>'); // Stelle auf einer Leitung, wo das Bauteil eingefuegt wird
    this.svg.innerHTML = h.join('');
    if (root.DQBench) root.DQBench.prototype._animSetup.call(this); // Stromfluss-Punkte wie auf der Werkbank
  };

  root.DQEditor = Editor;
})(typeof window !== 'undefined' ? window : globalThis);

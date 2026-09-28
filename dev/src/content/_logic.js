/* Digital Quest – Helfer fuer Logik-Aufgaben am Experimentierboard (window.LG)
 * Konvention wie in den Unterlagen: E1 = a = niederwertigstes Bit. Kombination k: E_i = Bit (i−1) von k.
 *   LG.io(n, outs)          Startaufbau: Pegelschalter E1…En, Logikanzeigen L1…, Masse (Schema + Werkbank-Lage)
 *   LG.net(n, gates, outs)  Loesung: gates = [[id, typ, [Quellen]]], Quelle 'E1' | 'U1'; outs = { L1: 'U3' }
 *   LG.truth(n, f, opt)     Tests fuer alle Kombinationen; f(bits) → 0/1 bzw. Array fuer mehrere Ausgaenge; opt.dc = Don't-Cares
 *   LG.table(n, f, opt)     Wahrheitstabelle als HTML fuer den Auftragstext
 *   LG.bench(layout)        Werkbank-Lagen passend zu io/net */
(function (root) {
  'use strict';
  var IN_PIN = function (type, k) { return type === 'not' ? 'in' : (k === 0 ? 'in1' : 'in2'); };
  function bits(n, k) { var b = []; for (var i = 0; i < n; i++) b.push(k >> i & 1); return b; }

  function io(n, outs) {
    outs = outs || ['L1'];
    var parts = [{ id: 'GND1', type: 'ground', x: 120, y: 160 + 100 * n, rot: 0 }];
    for (var i = 1; i <= n; i++) parts.push({ id: 'E' + i, type: 'logicin', x: 160, y: 60 + 100 * i, rot: 0 });
    outs.forEach(function (id, j) { parts.push({ id: id, type: 'logicled', x: 860, y: 160 + 100 * j, rot: 0 }); });
    return { parts: parts, wires: [] };
  }
  function depthOf(gates) {
    var d = {};
    function dep(id) {
      if (/^E/.test(id)) return 0;
      if (d[id] !== undefined) return d[id];
      var g = gates.filter(function (x) { return x[0] === id; })[0];
      d[id] = 1 + Math.max.apply(null, g[2].map(dep)); return d[id];
    }
    gates.forEach(function (g) { dep(g[0]); });
    return d;
  }
  function net(n, gates, outs, extra) {
    var l = io(n, Object.keys(outs)), d = depthOf(gates), col = {};
    gates.forEach(function (g) {
      var c = d[g[0]], k = col[c] = (col[c] || 0) + 1;
      l.parts.push({ id: g[0], type: g[1], x: 180 + 150 * c, y: 60 + 110 * k, rot: 0 });
      g[2].forEach(function (src, j) { l.wires.push(W(src + '.out', g[0] + '.' + IN_PIN(g[1], j))); });
    });
    Object.keys(outs).forEach(function (L) { l.wires.push(W(outs[L] + '.out', L + '.in')); });
    if (extra) l.wires = l.wires.concat(extra);
    return l;
  }
  function bench(layout) {
    var p = [], d = {}, col = {}, gates = layout.parts.filter(function (x) { return /^U/.test(x.id); });
    gates.forEach(function (g) { d[g.id] = Math.round((g.x - 180) / 150); });
    layout.parts.forEach(function (q) {
      if (q.type === 'ground') p.push({ id: q.id, x: 180, y: 700, rot: 0 });
      else if (q.type === 'logicin') p.push({ id: q.id, x: 180, y: 90 + 125 * (+q.id.slice(1)), rot: 0 });
      else if (q.type === 'logicled') p.push({ id: q.id, x: 860, y: 230 + 120 * (+q.id.slice(1) - 1), rot: 0 });
      else if (/^U/.test(q.id)) { var c = d[q.id], k = col[c] = (col[c] || 0) + 1; p.push({ id: q.id, x: 230 + 140 * c, y: 90 + 130 * k, rot: 0 }); }
    });
    return { parts: p };
  }
  function truth(n, f, opt) {
    opt = opt || {}; var tests = [], outs = opt.outs || ['L1'];
    for (var k = 0; k < (1 << n); k++) {
      if (opt.dc && opt.dc.indexOf(k) >= 0) continue;
      var b = bits(n, k), set = {}, r = f(b), exp = [];
      b.forEach(function (v, i) { set['E' + (i + 1)] = { closed: !!v }; });
      (Array.isArray(r) ? r : [r]).forEach(function (v, j) { exp.push({ sel: outs[j], on: !!v }); });
      if (!tests.length) exp.push({ noFault: true });
      tests.push({ name: b.slice().reverse().map(function (v, i) { return 'E' + (n - i) + '=' + v; }).join(' '), set: set, expect: exp });
    }
    return tests;
  }
  function table(n, f, opt) {
    opt = opt || {}; var outs = opt.outs || ['A'], h = '<table class="tt"><tr>';
    for (var i = n; i >= 1; i--) h += '<th>E' + i + '</th>';
    outs.forEach(function (o) { h += '<th class="o">' + o + '</th>'; }); h += '</tr>';
    for (var k = 0; k < (1 << n); k++) {
      var b = bits(n, k), r = f(b); h += '<tr>';
      for (var j = n - 1; j >= 0; j--) h += '<td>' + b[j] + '</td>';
      (Array.isArray(r) ? r : [r]).forEach(function (v) { h += '<td class="o">' + (opt.dc && opt.dc.indexOf(k) >= 0 ? 'X' : v ? 1 : 0) + '</td>'; });
      h += '</tr>';
    }
    return h + '</table>';
  }
  /* Minterm-Funktion: 1 bei den genannten Kombinationen */
  function sigma(list) { return function (b) { var k = 0; b.forEach(function (v, i) { k += v << i; }); return list.indexOf(k) >= 0 ? 1 : 0; }; }
  root.LG = { io: io, net: net, bench: bench, truth: truth, table: table, sigma: sigma, bits: bits };
})(typeof window !== 'undefined' ? window : globalThis);

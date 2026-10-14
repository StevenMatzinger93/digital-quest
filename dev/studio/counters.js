/* Digital Quest Studio – Zähler aufklappen (Stufe 4)
 * Die Zählerbausteine der Engine (ctr_async, ctr_sync, ctr_bcd, ctr_johnson, ctr_mod) sind fertige Kästen. expansion() beschreibt ihre
 * innere Schaltung aus D-Flipflops und Gattern; Studio.expandCounter() ersetzt den Kasten an derselben Stelle durch diese Schaltung, die
 * Leitungen an den Anschlüssen des Kastens werden auf die inneren Anschlüsse umgelegt (der umgekehrte Weg gibt es nicht).
 * Kein DOM in expansion() und minimize() – laeuft auch in Node (Vergleichstest in tests/studio.js). */
(function (root) {
  'use strict';
  var E = root.DQEngine;

  /* ---------- Quine-McCluskey: minimale Summe von Produkttermen ----------
   * ones/dcs: Listen von Zahlen (Minterme / Don't-Cares) über nv Variablen. Gibt [{mask, val}] – mask 1 = Variable kommt im Term vor, val = ihr Wert. */
  function minimize(nv, ones, dcs) {
    var full = (1 << nv) - 1; if (!ones.length) return [];
    var cur = {}; ones.concat(dcs).forEach(function (m) { cur[full + ':' + m] = { mask: full, val: m, used: false }; });
    var primes = [];
    for (;;) {
      var keys = Object.keys(cur), next = {}, any = false;
      keys.forEach(function (k) { cur[k].used = false; });
      for (var i = 0; i < keys.length; i++) for (var j = i + 1; j < keys.length; j++) {
        var a = cur[keys[i]], b = cur[keys[j]]; if (a.mask !== b.mask) continue;
        var d = a.val ^ b.val; if (d && !(d & (d - 1))) { a.used = b.used = true; var m = a.mask & ~d, v = a.val & m; next[m + ':' + v] = { mask: m, val: v, used: false }; any = true; }
      }
      keys.forEach(function (k) { if (!cur[k].used) primes.push(cur[k]); });
      if (!any) break; cur = next;
    }
    var seen = {}; primes = primes.filter(function (p) { var k = p.mask + ':' + p.val; if (seen[k]) return false; seen[k] = 1; return true; });
    function covers(p, m) { return (m & p.mask) === p.val; }
    var left = ones.slice(), chosen = [];
    while (left.length) { // wesentliche Primimplikanten zuerst, dann gierig nach Abdeckung
      var ess = null;
      for (var li = 0; li < left.length && !ess; li++) { var cs = primes.filter(function (p) { return covers(p, left[li]); }); if (cs.length === 1) ess = cs[0]; }
      var pick = ess || primes.slice().sort(function (x, y) { return left.filter(function (m) { return covers(y, m); }).length - left.filter(function (m) { return covers(x, m); }).length; })[0];
      chosen.push(pick); left = left.filter(function (m) { return !covers(pick, m); });
    }
    return chosen;
  }

  /* ---------- Innenschaltung ----------
   * Rueckgabe: { parts:[{key, type, x, y, props}], wires:[[a, b]], map:{C, R, Q0…} } mit lokalen Schluesseln 'f0', 'g3' …, Anschluesse 'f0.Q'.
   * Koordinaten relativ zur Mitte des Kastens (Vielfache von 20). */
  function expansion(type, props) {
    var d = E.PARTS[type], q = Object.assign({}, d.props, props || {}), nb = E.ctrBitCount(d, q), kind = d.ctr, up = q.dir !== 'down';
    var parts = [], wires = [], map = {}, ng = 0, tops = {};
    var X = function (k) { return Math.round((k - (nb - 1) / 2) * 160 / 20) * 20; };
    function ff(k) { parts.push({ key: 'f' + k, type: 'dff', x: X(k), y: 0, props: { trig: kind === 'async' && k > 0 ? 'pos' : q.trig || 'pos', tpd: q.tpd } }); }
    function gate(kk, type2, inputs) { // Gatter ueber Bit kk stapeln
      var g = 'g' + (ng++); tops[kk] = (tops[kk] || 0) + 1;
      parts.push({ key: g, type: type2, x: X(kk), y: -140 - 120 * (tops[kk] - 1), props: inputs > 2 ? { inputs: inputs } : {} }); return g;
    }
    function tie(a, b) { wires.push([a, b]); }
    function andOf(kk, lits) { if (lits.length === 1) return lits[0]; var g = gate(kk, 'and', lits.length); lits.forEach(function (l, i) { tie(l, g + '.in' + (i + 1)); }); return g + '.out'; }
    function orOf(kk, sigs) {
      if (sigs.length === 1) return sigs[0];
      while (sigs.length > 8) { var head = sigs.splice(0, 8); sigs.unshift(orOf(kk, head)); }
      var g = gate(kk, 'or', sigs.length); sigs.forEach(function (l, i) { tie(l, g + '.in' + (i + 1)); }); return g + '.out';
    }
    var Q = function (k) { return 'f' + k + '.Q'; }, N = function (k) { return 'f' + k + '.Qn'; };
    for (var k = 0; k < nb; k++) ff(k);
    for (k = 1; k < nb; k++) { tie('f0.PC', 'f' + k + '.PC'); }
    map.R = 'f0.PC'; map.C = 'f0.C';
    for (k = 0; k < nb; k++) map['Q' + k] = Q(k);
    if (kind === 'async') {
      for (k = 0; k < nb; k++) { tie(N(k), 'f' + k + '.D'); if (k > 0) tie(up ? N(k - 1) : Q(k - 1), 'f' + k + '.C'); }
    } else {
      for (k = 1; k < nb; k++) tie('f0.C', 'f' + k + '.C');
      if (kind === 'sync') {
        tie(N(0), 'f0.D'); // Bit 0 kippt immer
        for (k = 1; k < nb; k++) { var lits = []; for (var j = 0; j < k; j++) lits.push(up ? Q(j) : N(j)); var carry = andOf(k, lits), x = gate(k, 'xor', 2); tie(Q(k), x + '.in1'); tie(carry, x + '.in2'); tie(x + '.out', 'f' + k + '.D'); }
      } else if (kind === 'bcd') { // D0 = /Q0 · D1 = Q1 ⊕ (Q0 ∧ /Q3) · D2 = Q2 ⊕ (Q0 ∧ Q1) · D3 = Q0 Q1 Q2 ∨ Q3 /Q0
        tie(N(0), 'f0.D');
        var c1 = andOf(1, [Q(0), N(3)]), x1 = gate(1, 'xor', 2); tie(Q(1), x1 + '.in1'); tie(c1, x1 + '.in2'); tie(x1 + '.out', 'f1.D');
        var c2 = andOf(2, [Q(0), Q(1)]), x2 = gate(2, 'xor', 2); tie(Q(2), x2 + '.in1'); tie(c2, x2 + '.in2'); tie(x2 + '.out', 'f2.D');
        var a3 = andOf(3, [Q(0), Q(1), Q(2)]), b3 = andOf(3, [Q(3), N(0)]), o3 = orOf(3, [a3, b3]); tie(o3, 'f3.D');
      } else if (kind === 'johnson') {
        tie(N(nb - 1), 'f0.D'); for (k = 1; k < nb; k++) tie(Q(k - 1), 'f' + k + '.D');
      } else { // mod: naechster Zustand je Bit als minimale Summe, unbenutzte Zustaende sind Don't-Care
        var m = Math.max(2, Math.round(q.modn || 6)), dcs = []; for (var s = m; s < (1 << nb); s++) dcs.push(s);
        for (k = 0; k < nb; k++) {
          var ones = []; for (s = 0; s < m; s++) if ((((s + 1) % m) >> k) & 1) ones.push(s);
          if (!ones.length) continue; // Bit bleibt 0: D offen (= 0)
          var terms = minimize(nb, ones, dcs), sigs = [];
          if (terms.length === 1 && terms[0].mask === 0) { var hi = gate(k, 'or', 2); parts[parts.length - 1].type = 'logicin'; parts[parts.length - 1].props = { closed: true }; tie(hi + '.out', 'f' + k + '.D'); continue; } // Konstante 1 (Pegelschalter)
          terms.forEach(function (t) { var l = []; for (var b = 0; b < nb; b++) if (t.mask & (1 << b)) l.push((t.val >> b) & 1 ? Q(b) : N(b)); sigs.push(andOf(k, l)); });
          tie(orOf(k, sigs), 'f' + k + '.D');
        }
      }
    }
    return { parts: parts, wires: wires, map: map };
  }

  var api = { minimize: minimize, expansion: expansion };
  root.DQStudioCounters = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* ---------- Studio: Aufklappen ---------- */
  var S = root.Studio; if (!S) return;
  var $ = function (s) { return document.querySelector(s); };
  function snap(v) { return Math.round(v / 20) * 20; }
  S.expandCounter = function (part) {
    var core = S.core, d = E.PARTS[part.type]; if (!d || !d.ctr) return false;
    var ex = expansion(part.type, part.props), W = root.DQCircuit.SPACES.schema;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ex.parts.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    var dx = Math.max(100 - x0, Math.min(snap(part.x), W.w - 100 - x1)), dy = Math.max(100 - y0, Math.min(snap(part.y), W.h - 100 - y1));
    var idMap = {};
    // Kasten und seine Leitungen herausnehmen, innere Teile mit neuen Nummern einsetzen
    var old = core.layout.wires.filter(function (w) { return w.from.split('.')[0] === part.id || w.to.split('.')[0] === part.id; });
    core.layout.wires = core.layout.wires.filter(function (w) { return old.indexOf(w) < 0; });
    core.layout.parts = core.layout.parts.filter(function (p) { return p.id !== part.id; });
    ex.parts.forEach(function (p) {
      var id = core.nextId(p.type), np = { id: id, type: p.type, x: snap(dx + p.x), y: snap(dy + p.y), rot: 0, props: Object.assign({}, p.props) };
      core.layout.parts.push(np); idMap[p.key] = id;
    });
    function ren(pin) { var a = pin.split('.'); return idMap[a[0]] + '.' + a[1]; }
    ex.wires.forEach(function (w) { core.layout.wires.push({ from: ren(w[0]), to: ren(w[1]) }); });
    old.forEach(function (w) {
      var f = w.from.split('.'), t = w.to.split('.');
      var nf = f[0] === part.id ? ren(ex.map[f[1]] || ex.map.C) : w.from, nt = t[0] === part.id ? ren(ex.map[t[1]] || ex.map.C) : w.to;
      if (nf !== nt) core.layout.wires.push({ from: nf, to: nt });
    });
    core.sel = null; core.changed('delete');
    S.ed.fit();
    return true;
  };
  S.inspectorExtra = (function (prev) { return function (p) {
    var h = prev ? prev(p) : '';
    if (E.PARTS[p.type].ctr) h += '<p><button class="tb" data-act="expand" title="Kasten durch Flipflops und Gatter ersetzen (nicht rückgängig)">▤ Aufklappen</button></p><p class="hint">Doppelklick auf den Baustein klappt ihn ebenfalls auf: Flipflops und Gatter, verdrahtet, an derselben Stelle.</p>';
    return h;
  }; })(S.inspectorExtra);
  S.initFns.push(function () {
    $('#inspector').addEventListener('click', function (ev) { var b = ev.target.closest('[data-act="expand"]'); if (b && S.selected()) S.expandCounter(S.selected()); });
  });
})(typeof window !== 'undefined' ? window : globalThis);

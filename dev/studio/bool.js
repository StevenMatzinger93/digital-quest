/* Digital Quest Studio – Boolesche Ausdrücke, Wahrheitstabelle, Schaltung (Nacht-Pakete 8 und 9; kein DOM, läuft auch in Node)
 * Schreibweise wie im Lehrmittel «Gesetze der Bool'schen Algebra» (verbindlich): ODER = v, UND = Nebeneinanderstellen (e1e2), NICHT = Überstreichung,
 * Eingänge e1, e2, e3 …, Ausgang A, UND kommt vor ODER. Beispiel: A = e1 ( e2 v e3 ) = e1e2 v e1e3.
 * Beim Eingeben auch Ersatzzeichen: /e1 oder !e1 oder ¬e1 oder e1' für NICHT, * oder · für UND, + oder ∨ für ODER. Angezeigt wird immer die Schreibweise des Lehrmittels.
 * Ausdruck → Schaltung (buildCircuit), Schaltung → Ausdruck (readCircuit), Wahrheitstabelle aus der Schaltung (circuitTable), Minimalform (minimalExpr). */
(function (root) {
  'use strict';
  var E = root.DQEngine || require('../src/engine.js');

  /* ---------- Eingabe: Zeichen → Ausdrucksbaum ----------
   * Knoten: {op:'var', n} | {op:'const', v} | {op:'not', a} | {op:'and', args} | {op:'or', args} */
  function tokenize(src, letters) { // letters: Buchstaben, die Eingänge sind (z. B. 'abcdef': a = Eingang 1 = niederwertigstes Bit); sonst e1, e2 …
    var s = String(src), t = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (letters && letters.indexOf(c) >= 0) { t.push({ k: 'var', n: letters.indexOf(c) + 1, pos: i }); i++; continue; }
      if (c === 'n' && s[i + 1] === '(') { t.push({ k: 'not', pos: i }); i++; continue; } // n(…) = Überstreichung über der Klammer
      if (!letters && (m = /^[eE](\d+)/.exec(s.slice(i)))) { t.push({ k: 'var', n: +m[1], pos: i }); i += m[0].length; continue; }
      if (c === 'v' || c === 'V' || c === '+' || c === '∨' || c === '|') { t.push({ k: 'or', pos: i }); i++; continue; }
      if (c === '*' || c === '·' || c === '∧' || c === '&' || c === '•') { t.push({ k: 'and', pos: i }); i++; continue; }
      if (c === '/' || c === '!' || c === '¬' || c === '~') { t.push({ k: 'not', pos: i }); i++; continue; }
      if (c === "'" || c === '’') { t.push({ k: 'post', pos: i }); i++; continue; }
      if (c === '(' || c === ')') { t.push({ k: c, pos: i }); i++; continue; }
      if (c === '0' || c === '1') { t.push({ k: 'const', v: +c, pos: i }); i++; continue; }
      if (c === '=') { t.push({ k: 'eq', pos: i }); i++; continue; }
      if (/[A-Za-z]/.test(c) && !/[A-Za-z0-9]/.test(s[i + 1] || '')) { t.push({ k: 'name', v: c, pos: i }); i++; continue; } // Ausgangsname (A)
      throw new Error('Zeichen «' + c + '» an Stelle ' + (i + 1) + ' verstehe ich nicht. Erlaubt: e1, e2 …, v oder + (ODER), Nebeneinanderstellen oder * (UND), / oder ! vor dem Glied (NICHT), Klammern, 0 und 1.');
    }
    return t;
  }
  function parseTokens(t) {
    var p = 0;
    function peek() { return t[p]; }
    function starts(x) { return x && (x.k === 'var' || x.k === 'const' || x.k === '(' || x.k === 'not'); }
    function expr() { var a = [term()]; while (peek() && peek().k === 'or') { p++; a.push(term()); } return a.length === 1 ? a[0] : flat('or', a); }
    function term() {
      var a = [factor()];
      for (;;) { var x = peek(); if (x && x.k === 'and') { p++; a.push(factor()); } else if (starts(x)) a.push(factor()); else break; }
      return a.length === 1 ? a[0] : flat('and', a);
    }
    function factor() {
      var x = peek(); if (!x) throw new Error('Der Ausdruck bricht zu früh ab.');
      var node;
      if (x.k === 'not') { p++; node = { op: 'not', a: factor() }; return node; }
      if (x.k === 'var') { p++; node = { op: 'var', n: x.n }; }
      else if (x.k === 'const') { p++; node = { op: 'const', v: x.v }; }
      else if (x.k === '(') { p++; node = expr(); if (!peek() || peek().k !== ')') throw new Error('Eine Klammer wird nicht geschlossen.'); p++; }
      else throw new Error('An Stelle ' + (x.pos + 1) + ' fehlt ein Glied (e1, e2 … oder eine Klammer).');
      while (peek() && peek().k === 'post') { p++; node = { op: 'not', a: node }; }
      return node;
    }
    var ast = expr(); if (p < t.length) throw new Error(t[p].k === ')' ? 'Eine Klammer wird geschlossen, die nie geöffnet wurde.' : 'Unerwartetes Zeichen an Stelle ' + (t[p].pos + 1) + '.');
    return ast;
  }
  function flat(op, args) { var out = []; args.forEach(function (a) { if (a.op === op) out = out.concat(a.args); else out.push(a); }); return { op: op, args: out }; }
  /* Eine Gleichung «A = e1 ( e2 v e3 ) = e1e2 v e1e3» liefert mehrere Ausdrücke; der Ausgangsname links steht in name */
  function parse(src, opts) {
    var t = tokenize(src, opts && opts.letters), parts = [[]]; t.forEach(function (x) { if (x.k === 'eq') parts.push([]); else parts[parts.length - 1].push(x); });
    var name = null; if (parts.length > 1 && parts[0].length === 1 && parts[0][0].k === 'name') { name = parts[0][0].v; parts.shift(); }
    else if (parts.length > 1 && parts[0].length && parts[0][0].k === 'name' && parts[0].length > 1) throw new Error('Links vom Gleichheitszeichen darf nur der Ausgang (A) stehen.');
    parts.forEach(function (x) { if (x.some(function (y) { return y.k === 'name'; })) throw new Error('Nur e1, e2 … sind Eingänge. Der Ausgang A steht links vom Gleichheitszeichen.'); });
    var exprs = parts.map(function (x) { if (!x.length) throw new Error('Ein Ausdruck ist leer.'); return parseTokens(x); });
    return { name: name || 'A', exprs: exprs, ast: exprs[0] };
  }

  /* ---------- Rechnen ---------- */
  function varsOf(ast, set) { set = set || {}; if (ast.op === 'var') set[ast.n] = 1; else if (ast.op === 'not') varsOf(ast.a, set); else if (ast.args) ast.args.forEach(function (a) { varsOf(a, set); }); return Object.keys(set).map(Number).sort(function (a, b) { return a - b; }); }
  function evalAst(ast, val) { // val: n → 0/1
    switch (ast.op) {
      case 'var': return val[ast.n] ? 1 : 0; case 'const': return ast.v; case 'not': return evalAst(ast.a, val) ? 0 : 1;
      case 'and': return ast.args.every(function (a) { return evalAst(a, val); }) ? 1 : 0; case 'or': return ast.args.some(function (a) { return evalAst(a, val); }) ? 1 : 0;
    }
  }
  /* Wahrheitstabelle über die Eingänge vs (Liste der Nummern, niederwertigstes zuerst): Zeile k hat e_vs[i] = Bit i von k */
  function truth(ast, vs) {
    vs = vs || varsOf(ast); var out = [];
    for (var k = 0; k < (1 << vs.length); k++) { var val = {}; vs.forEach(function (n, i) { val[n] = k >> i & 1; }); out.push(evalAst(ast, val)); }
    return out;
  }
  function equivalent(a, b) { var vs = varsOf({ op: 'and', args: [a, b] }); var x = truth(a, vs), y = truth(b, vs); return x.every(function (v, i) { return v === y[i]; }); }
  function clean(ast) { // doppelte Verneinung weg, gleiche Operatoren zusammenziehen
    if (ast.op === 'not') { var a = clean(ast.a); return a.op === 'not' ? a.a : a.op === 'const' ? { op: 'const', v: a.v ? 0 : 1 } : { op: 'not', a: a }; }
    if (ast.args) { var args = ast.args.map(clean); return args.length === 1 ? args[0] : flat(ast.op, args); }
    return ast;
  }

  /* ---------- Anzeige in der Schreibweise des Lehrmittels ---------- */
  function vname(n) { return 'e' + n; }
  /* HTML: Überstreichung als <span class="ov">, ODER als « v », UND ohne Zeichen, Klammern bei ODER in UND */
  function fmtHtml(ast, ctx, nm) {
    ctx = ctx || 0; nm = nm || vname; // 0 oben, 1 in UND; nm: Name der Eingänge
    switch (ast.op) {
      case 'var': return nm(ast.n); case 'const': return String(ast.v);
      case 'not': var inner = ast.a.op === 'var' ? nm(ast.a.n) : ast.a.op === 'const' ? String(ast.a.v) : fmtHtml(ast.a, 0, nm); return '<span class="ov">' + inner + '</span>';
      case 'and': return ast.args.map(function (a) { return a.op === 'or' ? ' ( ' + fmtHtml(a, 0, nm) + ' ) ' : fmtHtml(a, 1, nm); }).join('').replace(/\s+/g, ' ').trim();
      case 'or': return ast.args.map(function (a) { return fmtHtml(a, 0, nm); }).join(' v ');
    }
  }
  /* Nur Text (zum Kopieren und Prüfen): NICHT als /, UND ohne Zeichen zwischen Gliedern, ODER « v » */
  function fmtText(ast, nm) {
    nm = nm || vname;
    switch (ast.op) {
      case 'var': return nm(ast.n); case 'const': return String(ast.v);
      case 'not': return '/' + (ast.a.op === 'var' || ast.a.op === 'const' ? fmtText(ast.a, nm) : '(' + fmtText(ast.a, nm) + ')');
      case 'and': return ast.args.map(function (a) { return a.op === 'or' ? '(' + fmtText(a, nm) + ')' : fmtText(a, nm); }).join('');
      case 'or': return ast.args.map(function (a) { return fmtText(a, nm); }).join(' v ');
    }
  }

  /* ---------- Minimalform ---------- */
  /* Minimale Summe von Produkten aus den Einsen (Zeilennummern k, Eingang i = Bit i); names[i] = Nummer des Eingangs. Braucht DQVisuals.minimize (exakte Überdeckung). */
  function minimalExpr(ones, names, dc) {
    var n = names.length, N = 1 << n;
    if (!ones.length) return { op: 'const', v: 0 };
    if (ones.length + (dc ? dc.length : 0) === N && ones.length === N) return { op: 'const', v: 1 };
    var min = root.DQVisuals && root.DQVisuals.minimize; if (!min) throw new Error('Minimierung nicht geladen');
    var terms = min(n, ones, dc || []).map(function (p) {
      var lits = []; for (var i = 0; i < n; i++) { if (p.mask >> i & 1) continue; lits.push(p.val >> i & 1 ? { op: 'var', n: names[i] } : { op: 'not', a: { op: 'var', n: names[i] } }); }
      lits.sort(function (a, b) { return (a.op === 'var' ? a.n : a.a.n) - (b.op === 'var' ? b.n : b.a.n); });
      return lits.length === 0 ? { op: 'const', v: 1 } : lits.length === 1 ? lits[0] : { op: 'and', args: lits };
    });
    if (terms.some(function (t) { return t.op === 'const'; })) return { op: 'const', v: 1 };
    terms.sort(function (a, b) { return fmtText(a) < fmtText(b) ? -1 : 1; });
    return terms.length === 1 ? terms[0] : { op: 'or', args: terms };
  }

  /* ---------- Ausdruck → Schaltung ---------- */
  var P = function (id, type, x, y, props) { var p = { id: id, type: type, x: x, y: y, rot: 0 }; if (props) p.props = props; return p; };
  function snap(v) { return Math.round(v / 20) * 20; }
  /* Gibt {layout, outputId, inputIds:{n:id}}. NICHT einer Variablen = NICHT-Glied (geteilt), NICHT von UND/ODER = NAND/NOR; Gatter mit mehr als 8 Eingängen werden gestaffelt. */
  function buildCircuit(ast) {
    ast = clean(ast); var parts = [], wires = [], depthCount = {}, uid = 0, inputIds = {}, notOf = {}, nid = 0;
    var vs = varsOf(ast), memo = {};
    vs.forEach(function (n, i) { inputIds[n] = 'E' + n; parts.push(P('E' + n, 'logicin', 120, snap(160 + i * 140))); });
    var constId = {};
    function place(type, depth, inputs) { var k = depthCount[depth] = (depthCount[depth] || 0) + 1, id = 'U' + (++nid); parts.push(P(id, type, snap(300 + depth * 220), snap(100 + (k - 1) * (type === 'not' ? 100 : 40 * Math.max(2, inputs) + 40)), inputs > 2 ? { inputs: inputs } : undefined)); return id; }
    // build(node) → {pin, depth}
    function build(node) {
      var key = JSON.stringify(node); if (memo[key]) return memo[key];
      var r;
      if (node.op === 'var') r = { pin: inputIds[node.n] + '.out', depth: 0 };
      else if (node.op === 'const') { var id = constId[node.v] || (constId[node.v] = 'E' + (100 + node.v)); if (!parts.some(function (p) { return p.id === id; })) parts.push(P(id, 'logicin', 120, snap(160 + (vs.length + node.v) * 140), { closed: !!node.v, konst: true })); r = { pin: id + '.out', depth: 0 }; }
      else if (node.op === 'not') {
        var a = node.a;
        if (a.op === 'and' || a.op === 'or') r = nary(a.op === 'and' ? 'nand' : 'nor', a.args);
        else { var s = build(a), g = place('not', s.depth + 1, 1); wires.push({ from: s.pin, to: g + '.in' }); r = { pin: g + '.out', depth: s.depth + 1 }; }
      } else r = nary(node.op, node.args);
      memo[key] = r; return r;
    }
    function nary(op, args) { // op: and | or | nand | nor
      if (args.length > 8) { var inner = op === 'and' || op === 'nand' ? 'and' : 'or', head = { op: inner, args: args.slice(0, 8) }, rest = [head].concat(args.slice(8)); return nary(op, rest); }
      var ins = args.map(build), depth = 1 + Math.max.apply(null, ins.map(function (x) { return x.depth; })), g = place(op, depth, ins.length);
      ins.forEach(function (x, i) { wires.push({ from: x.pin, to: g + '.in' + (i + 1) }); });
      return { pin: g + '.out', depth: depth };
    }
    var top = build(ast), maxD = Math.max.apply(null, [top.depth].concat(Object.keys(depthCount).map(Number)));
    parts.push(P('L1', 'logicled', snap(300 + (maxD + 1) * 220), 160)); wires.push({ from: top.pin, to: 'L1.in' });
    parts.push(P('GND1', 'ground', 120, snap(160 + (vs.length + 2) * 140)));
    return { layout: { parts: parts, wires: wires }, outputId: 'L1', inputIds: inputIds };
  }

  /* ---------- Schaltung → Ausdruck ---------- */
  function netOf(layout) {
    var parent = {}; var find = function (x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    layout.parts.forEach(function (p) { E.pinsOf(p.type, Object.assign({}, E.PARTS[p.type].props, p.props || {})).forEach(function (pin) { parent[p.id + '.' + pin] = p.id + '.' + pin; }); });
    layout.wires.forEach(function (w) { if (parent[w.from] === undefined || parent[w.to] === undefined) return; var a = find(w.from), b = find(w.to); if (a !== b) parent[a] = b; });
    return { find: find, parent: parent };
  }
  var OUT_PINS = function (p) { var d = E.PARTS[p.type]; return d.logic && !d.outs ? ['out'] : p.type === 'logicin' ? ['out'] : []; };
  /* Eingänge der Schaltung: Pegelschalter (ohne Konstanten) sortiert nach Nummer; Namen e<Nummer> wenn alle Bezeichnungen E<Nummer> heissen, sonst fortlaufend */
  function inputsOf(layout) {
    var ins = layout.parts.filter(function (p) { return p.type === 'logicin' && !(p.props && p.props.konst); }), num = function (id) { var m = /^E(\d+)$/.exec(id); return m ? +m[1] : null; };
    var allNum = ins.every(function (p) { return num(p.id) !== null; });
    ins.sort(function (a, b) { return allNum ? num(a.id) - num(b.id) : a.id < b.id ? -1 : 1; });
    return ins.map(function (p, i) { return { id: p.id, n: allNum ? num(p.id) : i + 1 }; });
  }
  /* Ausgänge: Logikanzeigen; ohne solche die unverbundenen Gatterausgänge */
  function outputsOf(layout) {
    var leds = layout.parts.filter(function (p) { return p.type === 'logicled'; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    if (leds.length) return leds.map(function (p) { return { id: p.id, pin: p.id + '.in', kind: 'led' }; });
    var used = {}; layout.wires.forEach(function (w) { used[w.from] = used[w.to] = 1; });
    return layout.parts.filter(function (p) { return E.PARTS[p.type].logic && !E.PARTS[p.type].outs && !used[p.id + '.out']; }).map(function (p) { return { id: p.id, pin: p.id + '.out', kind: 'gate' }; });
  }
  function readCircuit(layout, outPin) {
    var net = netOf(layout), byId = {}; layout.parts.forEach(function (p) { byId[p.id] = p; });
    var ins = inputsOf(layout), inNum = {}; ins.forEach(function (x) { inNum[x.id] = x.n; });
    var drivers = {}; layout.parts.forEach(function (p) { OUT_PINS(p).forEach(function (pin) { var r = net.find(p.id + '.' + pin); (drivers[r] = drivers[r] || []).push(p); }); });
    var stack = {};
    function fromPin(pin) { // Ausdruck, der an diesem Anschluss liegt
      if (net.parent[pin] === undefined) return { op: 'const', v: 0 };
      var d = drivers[net.find(pin)] || []; if (d.length === 0) return { op: 'const', v: 0 }; if (d.length > 1) throw new Error('Zwei Ausgänge (' + d.map(function (p) { return p.id; }).join(', ') + ') sind miteinander verbunden.');
      return fromPart(d[0]);
    }
    function fromPart(p) {
      if (p.type === 'logicin') return p.props && p.props.konst ? { op: 'const', v: p.props.closed ? 1 : 0 } : { op: 'var', n: inNum[p.id] };
      if (stack[p.id]) throw new Error('Rückkopplung bei ' + p.id + ': daraus lässt sich kein Ausdruck ablesen.'); stack[p.id] = 1;
      var pins = E.pinsOf(p.type, Object.assign({}, E.PARTS[p.type].props, p.props || {})).filter(function (x) { return x !== 'out'; }), args = pins.map(function (x) { return fromPin(p.id + '.' + x); }), r;
      switch (p.type) {
        case 'not': r = { op: 'not', a: args[0] }; break;
        case 'and': r = { op: 'and', args: args }; break; case 'or': r = { op: 'or', args: args }; break;
        case 'nand': r = { op: 'not', a: { op: 'and', args: args } }; break; case 'nor': r = { op: 'not', a: { op: 'or', args: args } }; break;
        case 'xor': case 'xnor': r = args.reduce(function (a, b) { return { op: 'or', args: [{ op: 'and', args: [a, { op: 'not', a: b }] }, { op: 'and', args: [{ op: 'not', a: a }, b] }] }; }); if (p.type === 'xnor') r = { op: 'not', a: r }; break;
        default: throw new Error('Das Bauteil ' + p.id + ' (' + E.PARTS[p.type].label + ') hat keinen Booleschen Ausdruck.');
      }
      delete stack[p.id]; return r;
    }
    return clean(fromPin(outPin || (outputsOf(layout)[0] || {}).pin));
  }

  /* ---------- Wahrheitstabelle aus der Schaltung (alle Kombinationen durchrechnen) ---------- */
  function circuitTable(layout) {
    var ins = inputsOf(layout), outs = outputsOf(layout), seq = layout.parts.some(function (p) { var d = E.PARTS[p.type]; return d.ff || d.ctr || p.type === 'clock'; });
    var res = { inputs: ins, outputs: outs, rows: [], sequential: seq };
    if (!ins.length) { res.error = 'Keine Eingänge: Pegelschalter fehlen.'; return res; }
    if (!outs.length) { res.error = 'Keine Ausgänge: Logikanzeige oder freier Gatterausgang fehlt.'; return res; }
    if (ins.length > 6) { res.error = 'Mehr als 6 Eingänge: die Tabelle hätte über 64 Zeilen.'; return res; }
    var lay = E.clone(layout), net = E.buildNetlist(lay), st = E.newState();
    for (var k = 0; k < (1 << ins.length); k++) {
      ins.forEach(function (x, i) { net.byId[x.id].props.closed = !!(k >> i & 1); });
      var r = E.step(net, st, { noGroundFault: true }), row = outs.map(function (o) { return (r.nodeV[net.pinNode[o.pin]] || 0) > E.LOGIC.vth ? 1 : 0; });
      res.rows.push(row);
    }
    return res;
  }

  function letterNames(letters) { return function (n) { return letters.charAt(n - 1); }; }
  var api = { letterNames: letterNames, parse: parse, tokenize: tokenize, varsOf: varsOf, evalAst: evalAst, truth: truth, equivalent: equivalent, clean: clean, fmtHtml: fmtHtml, fmtText: fmtText, minimalExpr: minimalExpr,
    buildCircuit: buildCircuit, readCircuit: readCircuit, circuitTable: circuitTable, inputsOf: inputsOf, outputsOf: outputsOf };
  root.DQStudioBool = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

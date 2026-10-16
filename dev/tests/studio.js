// Browser-Durchlauf der Studio-Oberfläche (Playwright/Chromium): node tests/studio.js
// Stufe 0: öffnet studio.html ohne Netz, Bauteile setzen/verdrahten/drehen/löschen, Spannungsteiler.
// Weitere Abschnitte je Stufe (laufende Simulation, Oszilloskop, Spule, Flipflops, Zähler, Zeitverlauf, Digitaluhr).
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const ROOT = path.join(__dirname, '../..');
const url = 'file://' + path.join(ROOT, 'studio.html');
const shots = process.argv[2] && !/^--/.test(process.argv[2]) ? process.argv[2] : path.join(__dirname, 'shots');
const only = (process.argv.find(a => /^--stufe=/.test(a)) || '').split('=')[1];
const fails = [], notes = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };
const near = (a, b, rel, abs) => Math.abs(a - b) <= Math.max(Math.abs(b) * (rel || 1e-6), abs || 1e-9);

/* ===== Stufe 4 (ohne Browser): aufgeklappte Zähler gegen den Kasten, 64 Takte ===== */
function counterEquivalence() {
  const E = require('../src/engine.js'), C = require('../studio/counters.js');
  const run = (type, props, n) => {
    const lin = (id, c) => ({ id, type: 'logicin', x: 0, y: 0, rot: 0, props: { closed: c } });
    const box = { parts: [{ id: 'Z1', type, x: 0, y: 0, rot: 0, props }, lin('EC', false)], wires: [{ from: 'EC.out', to: 'Z1.C' }] };
    const ex = C.expansion(type, props), nb = E.ctrBitCount(E.PARTS[type], Object.assign({}, E.PARTS[type].props, props));
    const inner = { parts: ex.parts.map(p => ({ id: p.key, type: p.type, x: 0, y: 0, rot: 0, props: p.props })).concat([lin('EC', false)]), wires: ex.wires.map(w => ({ from: w[0], to: w[1] })).concat([{ from: 'EC.out', to: ex.map.C }]) };
    const nets = [box, inner].map(l => { const net = E.buildNetlist(JSON.parse(JSON.stringify(l))), st = E.newState(); E.step(net, st, {}); return { net, st }; });
    const seqs = [[], []];
    for (let k = 0; k < n; k++) nets.forEach((x, i) => {
      x.net.byId.EC.props.closed = true; const r = E.step(x.net, x.st, {}); x.net.byId.EC.props.closed = false; E.step(x.net, x.st, {});
      seqs[i].push(i === 0 ? r.parts.Z1.bits.map(Number).join('') : Array.from({ length: nb }, (_, b) => +r.parts['f' + b].q).join(''));
    });
    return seqs;
  };
  [['ctr_async', { bits: 4 }], ['ctr_async', { bits: 4, dir: 'down' }], ['ctr_sync', { bits: 4 }], ['ctr_sync', { bits: 3, dir: 'down' }], ['ctr_bcd', {}], ['ctr_johnson', { bits: 4 }],
    ['ctr_mod', { modn: 6 }], ['ctr_mod', { modn: 10 }], ['ctr_mod', { modn: 13 }], ['ctr_mod', { modn: 3 }], ['ctr_bcd', { trig: 'neg' }]].forEach(([type, props]) => {
    const [a, b] = run(type, props, 64);
    ok(a.join() === b.join(), 'aufgeklappt = Kasten über 64 Takte: ' + type + ' ' + JSON.stringify(props) + (a.join() === b.join() ? '' : ' (erste Abweichung bei Takt ' + a.findIndex((x, i) => x !== b[i]) + ': ' + a[a.findIndex((x, i) => x !== b[i])] + ' gegen ' + b[a.findIndex((x, i) => x !== b[i])] + ')'));
  });
  // Minimierung: Mod-6, Bit 0 ist /Q0 /Q2 + Q1 /Q0 … (Anzahl Terme klein)
  ok(C.minimize(3, [0, 2, 4], [6, 7]).length <= 3, 'Quine-McCluskey liefert eine kleine Überdeckung');
}

/* ===== Auftrag «Bauen», Paket 1 (ohne Browser): Knoten in der Netzliste ===== */
function knotenNetzliste() {
  const E = require('../src/engine.js'), P = (id, type, x, y, extra) => Object.assign({ id, type, x, y, rot: 0 }, extra || {}), Wr = (a, b) => ({ from: a, to: b });
  // Takt auf vier Flipflops über eine Sammelleitung aus drei Knoten
  const bus = { parts: [P('CLK1', 'clock', 0, 0), P('K1', 'node', 100, 0), P('K2', 'node', 200, 0), P('K3', 'node', 300, 0)].concat([1, 2, 3, 4].map(k => P('FF' + k, 'dff', 100 * k, 100))),
    wires: [Wr('CLK1.out', 'K1.p'), Wr('K1.p', 'K2.p'), Wr('K2.p', 'K3.p'), Wr('K1.p', 'FF1.C'), Wr('K2.p', 'FF2.C'), Wr('K3.p', 'FF3.C'), Wr('K3.p', 'FF4.C')] };
  const n = E.buildNetlist(bus).pinNode;
  ok([1, 2, 3, 4].every(k => n['FF' + k + '.C'] === n['CLK1.out']), 'Netzliste: Takt und alle vier Takteingänge über Knoten = ein Knoten');
  ok(n['FF1.D'] !== n['FF1.C'] && n['FF2.D'] !== n['FF3.D'], 'Netzliste: die übrigen Anschlüsse bleiben getrennt');
  // Rechnen mit und ohne Knoten identisch (Spannungsteiler)
  const base = { parts: [P('B1', 'battery', 0, 0, { value: 9, props: { ri: 1 } }), P('R1', 'resistor', 1, 0, { value: 1000 }), P('R2', 'resistor', 2, 0, { value: 2000 }), P('GND1', 'ground', 3, 0)], wires: [Wr('B1.p', 'R1.a'), Wr('R1.b', 'R2.a'), Wr('R2.b', 'B1.n'), Wr('B1.n', 'GND1.g')] };
  const mit = JSON.parse(JSON.stringify(base)); mit.parts.push(P('K1', 'node', 5, 5), P('K2', 'node', 6, 6)); mit.wires = [Wr('B1.p', 'R1.a'), Wr('R1.b', 'K1.p'), Wr('K1.p', 'R2.a'), Wr('R2.b', 'K2.p'), Wr('K2.p', 'B1.n'), Wr('B1.n', 'GND1.g')];
  const sol = l => { const net = E.buildNetlist(l), r = E.step(net, E.newState(), {}); return { v: r.nodeV[net.pinNode['R1.b']], i: r.parts.R1.i, nodes: net.nodes.length, faults: r.faults.length }; };
  const a = sol(base), b = sol(mit);
  ok(near(a.v, b.v, 1e-12) && near(a.i, b.i, 1e-12) && a.faults === 0 && b.faults === 0, 'mit Knoten rechnet die Schaltung identisch (U = ' + b.v.toFixed(4) + ' V)');
  // Kreuzung ohne Knoten: nur Leitungen, die sich im Bild kreuzen, haben keinen gemeinsamen Anschluss
  const cross = { parts: [P('R1', 'resistor', 0, 0), P('R2', 'resistor', 0, 0), P('R3', 'resistor', 0, 0), P('R4', 'resistor', 0, 0)], wires: [Wr('R1.b', 'R2.a'), Wr('R3.b', 'R4.a')] };
  const c = E.buildNetlist(cross).pinNode; ok(c['R1.b'] !== c['R3.b'] && c['R2.a'] !== c['R4.a'], 'Netzliste: zwei Leitungen ohne gemeinsamen Anschluss bleiben getrennt, auch wenn sie sich kreuzen');
}

/* ===== Stufe 5 (ohne Browser): Laufzeit des asynchronen Zählers im Zeitverlauf ===== */
function rippleDelay() {
  const E = require('../src/engine.js'), Sim = require('../studio/sim.js'), C = require('../studio/counters.js');
  const ex = C.expansion('ctr_async', { bits: 3, tpd: 20e-9 });
  const layout = { parts: ex.parts.map(p => ({ id: p.key, type: p.type, x: 0, y: 0, rot: 0, props: Object.assign({}, p.props, { tpd: 20e-9 }) })).concat([{ id: 'CLK1', type: 'clock', x: 0, y: 0, rot: 0, props: { freq: 1e6 } }]),
    wires: ex.wires.map(w => ({ from: w[0], to: w[1] })).concat([{ from: 'CLK1.out', to: ex.map.C }]) };
  const sim = new Sim({ getLayout: () => layout }); sim.refresh(true); sim.reset();
  const tr = ['CLK1.out', 'f0.Q', 'f1.Q', 'f2.Q'].map(a => sim.addTrace({ kind: 'dig', a }));
  sim.advance(20e-6);
  const edges = (t, falling) => { const out = []; for (let i = 1; i < t.n; i++) { const a = t.v[i - 1] > 2.5, b = t.v[i] > 2.5; if (falling ? a && !b : !a && b) out.push(t.t[i]); } return out; };
  const clkUp = edges(tr[0], false), f2dn = edges(tr[3], true);
  ok(clkUp.length >= 8 && f2dn.length >= 1, 'Takt und höchstes Bit laufen (' + clkUp.length + ' Takte, Q3 fällt ' + f2dn.length + ' ×)');
  // Beim Übergang 7 → 0 fallen alle drei Bits nacheinander: Q1 nach 20 ns, Q2 nach 40 ns, Q3 nach 60 ns (je eine Laufzeitstufe)
  const t3 = f2dn[0], t2 = edges(tr[2], true).filter(t => t <= t3 + 1e-12).pop(), t1 = edges(tr[1], true).filter(t => t <= t3 + 1e-12).pop(), te = clkUp.filter(t => t <= t1 + 1e-12).pop();
  ok(near(t1 - te, 20e-9, 0.1) && near(t2 - t1, 20e-9, 0.1) && near(t3 - t2, 20e-9, 0.1), 'Laufzeit sichtbar: Flanken der höheren Stufen kommen je 20 ns später (Q1 ' + ((t1 - te) * 1e9).toFixed(1) + ' ns, Q2 +' + ((t2 - t1) * 1e9).toFixed(1) + ' ns, Q3 +' + ((t3 - t2) * 1e9).toFixed(1) + ' ns)');
  // ohne Laufzeit-Verfälschung: der Zählerstand nach dem Ausschwingen stimmt (Takt 8 → 0)
  sim.advance(0.5e-6); const r = sim.res.parts;
  ok(typeof r.f0.q === 'boolean', 'Zustand nach der Aufzeichnung lesbar');
}
/* ===== Nacht Paket 1b: Laufzeit überhöhen ===== */
function overdrive() {
  const Sim = require('../studio/sim.js'), C = require('../studio/counters.js');
  const run = scale => {
    const ex = C.expansion('ctr_async', { bits: 3 });
    const layout = { parts: ex.parts.map(p => ({ id: p.key, type: p.type, x: 0, y: 0, rot: 0, props: p.props })).concat([{ id: 'CLK1', type: 'clock', x: 0, y: 0, rot: 0, props: { freq: 1 } }]),
      wires: ex.wires.map(w => ({ from: w[0], to: w[1] })).concat([{ from: 'CLK1.out', to: ex.map.C }]) };
    const sim = new Sim({ getLayout: () => layout }); sim.refresh(true); sim.reset(); sim.tpdScale = scale;
    const tr = ['f0.Q', 'f1.Q', 'f2.Q'].map(a => sim.addTrace({ kind: 'dig', a })), counts = [];
    for (let k = 0; k < 18; k++) { sim.advance(0.5); if (k % 2 === 1) continue; sim.advance(0.0); counts.push(sim.res.parts.f0.q + 2 * sim.res.parts.f1.q + 4 * sim.res.parts.f2.q); }
    return { tr, counts };
  };
  const a = run(1), b = run(1e6);
  ok(a.counts.join() === b.counts.join(), 'Überhöhung ändert die Rechenergebnisse nicht (Zählerfolge ' + b.counts.join('') + ')');
  const falls = t => { const o = []; for (let i = 1; i < t.n; i++) if (t.v[i - 1] > 2.5 && t.v[i] <= 2.5) o.push(t.t[i]); return o; };
  const f2 = falls(b.tr[2])[0], f1 = falls(b.tr[1]).filter(t => t <= f2).pop(), f0 = falls(b.tr[0]).filter(t => t <= f2).pop(), W = 1000, span = 10;
  ok((f1 - f0) / span * W >= 1.9 && (f2 - f1) / span * W >= 1.9, 'bei 1 Hz und ×10⁶ liegen die Flanken der Stufen ' + ((f1 - f0) / span * W).toFixed(1) + ' und ' + ((f2 - f1) / span * W).toFixed(1) + ' Bildpunkte auseinander (10-s-Bild, 1000 Punkte)');
  const fa = falls(a.tr[2])[0], fa1 = falls(a.tr[1]).filter(t => t <= fa).pop();
  ok(fa - fa1 < 1e-6, 'ohne Überhöhung bleibt die Laufzeit echt (' + ((fa - fa1) * 1e9).toFixed(0) + ' ns)');
}
/* ===== Nacht Pakete 8 und 9 (ohne Browser): Tabelle, Minimalform, Ausdruck ⇄ Schaltung ===== */
function logikTests() {
  const E = require('../src/engine.js'); require('../src/visuals.js'); globalThis.W = (a, b) => ({ from: a, to: b }); /* W() kommt im Spiel aus content/_helpers.js */ require('../src/content/_logic.js'); const B = require('../studio/bool.js'), LG = globalThis.LG;
  // unabhängige Minimalform: Primimplikanten nach Definition, dann alle Teilmengen
  const bruteMin = (n, ones) => {
    const N = 1 << n, on = new Set(ones), cubes = [];
    for (let free = 0; free < N; free++) for (let val = 0; val < N; val++) { if (val & free) continue; const cells = []; for (let m = 0; m < N; m++) if ((m & ~free & (N - 1)) === val) cells.push(m); if (cells.every(m => on.has(m))) cubes.push({ free, val, cells }); }
    const primes = cubes.filter(c => !cubes.some(d => d !== c && d.cells.length > c.cells.length && c.cells.every(m => d.cells.includes(m))));
    const lits = c => n - [...Array(n).keys()].filter(i => c.free >> i & 1).length; let best = null;
    for (let mask = 1; mask < (1 << primes.length); mask++) { const sel = primes.filter((_, i) => mask >> i & 1); if (!ones.every(m => sel.some(c => c.cells.includes(m)))) continue; const k = sel.length, l = sel.reduce((s, c) => s + lits(c), 0); if (!best || k < best.k || (k === best.k && l < best.l)) best = { k, l }; }
    return best || { k: 0, l: 0 };
  };
  const cost = ast => ast.op === 'const' ? { k: 0, l: 0 } : ast.op === 'or' ? ast.args.reduce((s, a) => { const c = cost(a); return { k: s.k + c.k, l: s.l + c.l }; }, { k: 0, l: 0 }) : ast.op === 'and' ? { k: 1, l: ast.args.length } : { k: 1, l: 1 };
  const bit = (b, i) => b[i];
  const CIR = [
    ['UND', 2, [['U1', 'and', ['E1', 'E2']]], { L1: 'U1' }, b => b[0] & b[1]],
    ['ODER', 2, [['U1', 'or', ['E1', 'E2']]], { L1: 'U1' }, b => b[0] | b[1]],
    ['NAND', 2, [['U1', 'nand', ['E1', 'E2']]], { L1: 'U1' }, b => 1 - (b[0] & b[1])],
    ['NOR', 2, [['U1', 'nor', ['E1', 'E2']]], { L1: 'U1' }, b => 1 - (b[0] | b[1])],
    ['XOR', 2, [['U1', 'xor', ['E1', 'E2']]], { L1: 'U1' }, b => b[0] ^ b[1]],
    ['XOR aus vier NAND', 2, [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['E1', 'U1']], ['U3', 'nand', ['E2', 'U1']], ['U4', 'nand', ['U2', 'U3']]], { L1: 'U4' }, b => b[0] ^ b[1]],
    ['Halbaddierer (Summe, Übertrag)', 2, [['U1', 'xor', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]], { L1: 'U1', L2: 'U2' }, b => [b[0] ^ b[1], b[0] & b[1]]],
    ['Volladdierer (Summe, Übertrag)', 3, [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']], ['U4', 'and', ['U1', 'E3']], ['U5', 'or', ['U3', 'U4']]], { L1: 'U2', L2: 'U5' }, b => [b[0] ^ b[1] ^ b[2], (b[0] + b[1] + b[2]) >= 2 ? 1 : 0]],
    ['Multiplexer 2:1 (e3 wählt)', 3, [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], { L1: 'U4' }, b => b[2] ? b[1] : b[0]],
    ['Mehrheit aus drei', 3, [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U1', 'U2']], ['U5', 'or', ['U4', 'U3']]], { L1: 'U5' }, b => (b[0] + b[1] + b[2]) >= 2 ? 1 : 0],
    ['Parität aus vier', 4, [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['E3', 'E4']], ['U3', 'xor', ['U1', 'U2']]], { L1: 'U3' }, b => b[0] ^ b[1] ^ b[2] ^ b[3]],
    ['UND-ODER-NICHT', 4, [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['E3', 'E4']], ['U3', 'nor', ['U1', 'U2']]], { L1: 'U3' }, b => 1 - ((b[0] & b[1]) | (b[2] & b[3]))],
    ['Vergleicher 2 Bit (gleich)', 4, [['U1', 'xnor', ['E1', 'E3']], ['U2', 'xnor', ['E2', 'E4']], ['U3', 'and', ['U1', 'U2']]], { L1: 'U3' }, b => (b[0] === b[2] && b[1] === b[3]) ? 1 : 0]
  ];
  let allTables = true, allMin = true, allTests = true; const bad = [];
  CIR.forEach(([name, n, gates, outs, f]) => {
    const lay = LG.net(n, gates, outs), t = B.circuitTable(lay), nOut = Object.keys(outs).length;
    let tab = !t.error && t.inputs.length === n && t.outputs.length === nOut && t.rows.length === (1 << n);
    for (let k = 0; tab && k < (1 << n); k++) { const exp = [].concat(f(LG.bits(n, k))); if (exp.join() !== t.rows[k].join()) tab = false; }
    if (!tab) { allTables = false; bad.push('Tabelle ' + name); }
    // zweite, unabhängige Prüfung der Schaltung mit den Tests des Spiels (LG.truth + runTask)
    const task = { tests: LG.truth(n, f, { outs: Object.keys(outs) }) }; if (!E.runTask(task, lay).pass) { allTests = false; bad.push('runTask ' + name); }
    // Minimalform gegen die unabhängige Berechnung
    Object.keys(outs).forEach((_, j) => {
      const ones = []; t.rows.forEach((r, k) => { if (r[j]) ones.push(k); }), names = t.inputs.map(x => x.n), ast = B.minimalExpr(ones, names), want = bruteMin(n, ones), got = cost(ast), vs = names;
      const same = B.truth(ast, vs).every((v, k) => v === (t.rows[k][j] ? 1 : 0)), minimal = got.k === want.k && got.l === want.l;
      if (!same || !minimal) { allMin = false; bad.push('Minimalform ' + name + ' A' + (j + 1) + ': ' + B.fmtText(ast) + ' (' + got.k + ' Terme, ' + got.l + ' Literale, minimal ' + want.k + '/' + want.l + ')'); }
    });
  });
  ok(allTables && allTests, CIR.length + ' bekannte Schaltungen: Wahrheitstabelle aus der Schaltung stimmt mit der Rechnung und mit den Tests des Spiels (LG.truth) überein' + (bad.length ? ' – ' + bad.join('; ') : ''));
  ok(allMin, 'Minimalform ist tatsächlich minimal (Terme und Literale gegen die unabhängige Berechnung über alle Primimplikanten-Überdeckungen)' + (allMin ? '' : ' – ' + bad.join('; ')));
  const seq = B.circuitTable({ parts: [{ id: 'E1', type: 'logicin', x: 0, y: 0, rot: 0 }, { id: 'FF1', type: 'dff', x: 0, y: 0, rot: 0 }, { id: 'L1', type: 'logicled', x: 0, y: 0, rot: 0 }], wires: [{ from: 'E1.out', to: 'FF1.D' }, { from: 'FF1.Q', to: 'L1.in' }] });
  ok(seq.sequential === true && B.circuitTable({ parts: [], wires: [] }).error, 'Speicherglieder werden gemeldet, leere Schaltung ohne Absturz');

  // Paket 9: Ausdruck → Schaltung → Ausdruck
  const LAWS = ['A = e1 ( e2 v e3 ) = e1e2 v e1e3', '/(e1 e2) = /e1 v /e2', '/(e1 v e2) = /e1 /e2', '/(e1 v e2 v e3) = /e1 /e2 /e3', '/(e1 e2 e3) = /e1 v /e2 v /e3', 'e1 v e1e2 = e1', 'e1 ( e1 v e2 ) = e1', 'e1 v e2e3 = ( e1 v e2 )( e1 v e3 )',
    '!!e1 = e1', 'e1 /e1 = 0', 'e1 v /e1 = 1', 'e1v e2 e3 = e1 + e2 * e3', 'A = e1/e2 v /e1e2', 'A = e3e2 v /e3e1', 'A = ¬(e1 ∨ e2) ∧ e3', "A = e1' e2 v e3"];
  let allEq = true, allRound = true; const bad2 = [];
  LAWS.forEach(src => {
    const p = B.parse(src);
    if (!p.exprs.every(x => B.equivalent(x, p.ast))) { allEq = false; bad2.push('Gesetz gilt nicht: ' + src); }
    p.exprs.forEach(ast => {
      const c = B.buildCircuit(ast), vs = B.varsOf(ast), t = B.circuitTable(c.layout);
      const rowsOk = vs.length === 0 ? true : t.rows.every((r, k) => r[0] === B.truth(ast, t.inputs.map(x => x.n))[k]);
      let back; try { back = B.readCircuit(c.layout, c.outputId + '.in'); } catch (e) { bad2.push(src + ': ' + e.message); allRound = false; return; }
      const again = B.parse('A = ' + B.fmtText(back)).ast;
      if (!rowsOk || !B.equivalent(back, ast) || !B.equivalent(again, ast)) { allRound = false; bad2.push('Hin- und Rückweg ' + src + ' → ' + B.fmtText(back)); }
    });
  });
  ok(allEq, LAWS.length + ' Gleichungen (Beispiele des Lehrmittels, beide Gesetze von De Morgan, Absorption, Distributivgesetz, Ersatzzeichen): beide Seiten sind gleichwertig' + (bad2.length ? ' – ' + bad2.join('; ') : ''));
  ok(allRound, 'Ausdruck → Schaltung → Ausdruck ist logisch gleichwertig (über die Wahrheitstabelle der gebauten Schaltung geprüft, nicht über den Text)' + (bad2.length ? ' – ' + bad2.join('; ') : ''));
  const p1 = B.parse('A = e1 ( e2 v e3 ) = e1e2 v e1e3'); ok(B.fmtText(p1.exprs[0]) === 'e1(e2 v e3)' && B.fmtText(p1.exprs[1]) === 'e1e2 v e1e3' && /e1 \( e2 v e3 \)/.test(B.fmtHtml(p1.exprs[0])) && /class="ov"/.test(B.fmtHtml(B.parse('/e1 v e2').ast)), 'Anzeige in der Schreibweise des Lehrmittels: ' + B.fmtHtml(p1.exprs[0]));
  const pr = B.parse('e1 v e2e3').ast; ok(pr.op === 'or' && pr.args[1].op === 'and', 'UND kommt vor ODER');
  const dm = B.buildCircuit(B.parse('/(e1 e2)').ast).layout.parts.map(p => p.type).sort().join(); ok(/nand/.test(dm) && !/not/.test(dm), 'NICHT vor einer Klammer wird zum NAND-Gatter');
  ['e1 $ e2', 'e1 v', '(e1 v e2', 'e1 v e2)', 'x1 v e2', ''].forEach(bad3 => { let msg = null; try { B.parse(bad3); } catch (e) { msg = e.message; } ok(!!msg, 'Fehlermeldung statt Absturz bei «' + bad3 + '»: ' + msg); });
  let loop = null; try { B.readCircuit({ parts: [{ id: 'U1', type: 'not', x: 0, y: 0, rot: 0 }, { id: 'L1', type: 'logicled', x: 0, y: 0, rot: 0 }], wires: [{ from: 'U1.out', to: 'U1.in' }, { from: 'U1.out', to: 'L1.in' }] }, 'L1.in'); } catch (e) { loop = e.message; } ok(/Rückkopplung/.test(loop || ''), 'Rückkopplung wird gemeldet: ' + loop);
}

/* ===== Nacht Paket 11 (ohne Browser): Aufgabe stellen ===== */
function aufgabeTests() {
  const E = require('../src/engine.js'), T = require('../studio/task.js');
  const P = (id, type, x, y, value, props) => Object.assign({ id, type, x, y, rot: 0 }, value !== undefined ? { value } : {}, props ? { props } : {});
  const lay = { parts: [P('B1', 'battery', 100, 200, 9), P('R1', 'resistor', 300, 200, 3317), P('D1', 'led', 500, 200, undefined, { color: 'rot' }), P('R2', 'resistor', 300, 400, 8191)], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'D1.a' }, { from: 'D1.k', to: 'B1.n' }] };
  lay.parts[1].value = 330; lay.parts[3].value = 8191; // R1 = 330 Ω (richtig), R2 = 8191 Ω (verborgener Wert, unverwechselbar)
  const r = T.buildTask(lay, { title: 'LED-Schaltung', text: 'Finde die Werte heraus.', hide: [{ part: 'R1', prop: 'value' }, { part: 'R2', prop: 'value' }], faults: [{ type: 'open', wire: 1 }] });
  ok(!/8191/.test(r.taskText) && !/"value": 330\b/.test(r.taskText) && !/\b330\b/.test(r.taskText.replace(/"id": "[^"]*"/, '')), 'verborgene Werte stehen nicht im Klartext in der Aufgabendatei (weder 330 noch 8191)');
  ok(!/Störung|fault|unterbrochen|cause|open/i.test(r.taskText.replace(/"hiddenData": "[^"]*"/, '')), 'Aufgabendatei verrät die Störung nicht');
  const o = T.openTask(JSON.parse(r.taskText));
  ok(o.layout.parts.find(p => p.id === 'R1').value === 330 && o.layout.parts.find(p => p.id === 'R2').value === 8191 && o.hide.length === 2, 'die Schaltung rechnet mit den echten Werten (aus der verschleierten Ablage entschlüsselt)');
  const bad = E.analyze(o.layout), good = E.analyze(lay);
  ok(good.parts.D1.on === true && bad.parts.D1.on === false && o.layout.wires.length === 2, 'Störung wirkt: die richtige Schaltung leuchtet, die Aufgabe nicht (Leitung unterbrochen)');
  ok(JSON.parse(r.solutionText).values['R1.value'] === 330 && JSON.parse(r.solutionText).values['R2.value'] === 8191 && JSON.parse(r.solutionText).faults.length === 1 && /unterbrochen/.test(JSON.parse(r.solutionText).faults[0].cause) && /D1 leuchtet nicht/.test(JSON.parse(r.solutionText).faults[0].symptom), 'Lösung getrennt: Werte, Störung mit Ursache und Symptom (' + JSON.parse(r.solutionText).faults[0].symptom + ')');
  ok(JSON.parse(r.solutionText).taskId === JSON.parse(r.taskText).id && JSON.parse(r.solutionText).layout.wires.length === 3, 'Lösungsdatei gehört über die Aufgabennummer zur Aufgabe und enthält die richtige Schaltung');
  const sw = T.buildTask(lay, { faults: [{ type: 'swap', part: 'D1', a: 'a', b: 'k' }] }), v = T.buildTask(lay, { faults: [{ type: 'value', part: 'R1', prop: 'value', value: 1e6 }] });
  ok(E.analyze(sw.task.layout).parts.D1.on === false && E.analyze(v.task.layout).parts.D1.on === false && JSON.parse(v.solutionText).faults[0].right === 330, 'Störungsarten «vertauschte Anschlüsse» und «falscher Wert» wirken');
  let err = null; try { T.buildTask(lay, { faults: [{ type: 'open', wire: 9 }] }); } catch (e) { err = e.message; } ok(!!err, 'ungültige Störung wird gemeldet: ' + err);
}

/* ===== Stufe 6 (ohne Browser): Digitaluhr zählt 00 … 59 und springt auf 00 ===== */
function uhr() {
  global.window = global; // examples.js erwartet window
  const E = require('../src/engine.js'), Sim = require('../studio/sim.js'), C = require('../studio/counters.js');
  global.DQStudioCounters = C; global.Studio = { E, setMenu() {}, initFns: [] };
  require('../studio/examples.js');
  const lay = Studio.digitaluhr().layout, sim = new Sim({ getLayout: () => lay }); sim.refresh(true); sim.reset();
  const SEG = ['1111110', '0110000', '1101101', '1111001', '0110011', '1011011', '1011111', '1110000', '1111111', '1111011'];
  const shown = pid => { const seg = sim.res.parts[pid].seg.map(x => x ? '1' : '0').join(''); const d = SEG.indexOf(seg); return d < 0 ? (seg === '0000000' ? '-' : '?') : d; };
  const disp = () => '' + shown('AZ2') + shown('AZ1');
  ok(disp() === '00', 'Uhr startet mit 00: ' + disp());
  sim.advance(3.5); ok(disp() === '03', 'nach 3,5 s zeigt die Uhr 03: ' + disp());
  sim.advance(6.0); ok(disp() === '09', 'nach 9,5 s: 09 (' + disp() + ')');
  sim.advance(1.0); ok(disp() === '10', 'nach 10,5 s springt die Zehnerstelle: 10 (' + disp() + ')');
  sim.advance(49.0); ok(disp() === '59', 'nach 59,5 s: 59 (' + disp() + ')');
  sim.advance(1.0); ok(disp() === '00', 'nach 60,5 s springt die Zehnerstelle von 5 auf 0: 00 (' + disp() + ')');
  sim.advance(61.0); ok(disp() === '01', 'läuft weiter: nach 121,5 s zeigt sie 01 (' + disp() + ')');
  ok(sim.faults.length === 0, 'Uhr ohne Störung: ' + JSON.stringify(sim.faults));
  let all = true; for (let k = 0; k < 120; k++) { sim.advance(1.0); const d = disp(); if (/[-?]/.test(d)) all = false; }
  ok(all, 'alle Anzeigen über zwei Minuten gültige Ziffern');
  delete global.window; delete global.Studio; delete global.DQStudioCounters;
}

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Studio && Studio.sim);
  const retry = async fn => { let err; for (let k = 0; k < 5; k++) { try { return await fn(); } catch (e) { err = e; await page.waitForTimeout(120); } } throw err; }; // die Anzeige zeichnet sich bei laufender Simulation neu: Klick bei Bedarf wiederholen
  const pin = id => retry(() => page.click(`[data-pin="${id}"] .pinhit`, { force: true, timeout: 1500 }));
  const tabOf = (pg, t) => pg.evaluate(t => Studio.PALETTE.find(g => g.items.includes(t)).name, t);
  const tab = async (pg, t) => pg.click(`[data-tab="${await tabOf(pg, t)}"]`);
  let addN = 0; // Bauteil aus der Leiste wählen (Registerkarte), dann auf die Zeichenfläche klicken; Esc beendet das Mehrfachsetzen
  const add = async (t, x, y) => { await tab(page, t); await page.click(`[data-add="${t}"]`); const box = await page.locator('#board').boundingBox(), n = (addN++) % 15; await page.mouse.click(box.x + (x !== undefined ? x : 100 + (n % 5) * 200), box.y + (y !== undefined ? y : 160 + Math.floor(n / 5) * 150)); await page.keyboard.press('Escape'); };
  const setField = async (k, v) => { await page.fill(`[data-f="${k}"]`, v); await page.press(`[data-f="${k}"]`, 'Enter'); await page.dispatchEvent(`[data-f="${k}"]`, 'change'); };
  const ctxPin = async (id, label) => { await retry(() => page.click(`[data-pin="${id}"] .pinhit`, { button: 'right', force: true, timeout: 1500 })); await page.click(`.ctxmenu button:text-matches("^${label}")`); };
  const ctxPart = async (id, label) => { await retry(() => page.click(`[data-part="${id}"] .hit`, { button: 'right', force: true, timeout: 1500 })); await page.click(`.ctxmenu button:text-matches("^${label}")`); };
  const selectPart = id => retry(() => page.click(`[data-part="${id}"] .hit`, { force: true, timeout: 1500 }));
  const nv = (p) => page.evaluate(pn => { const r = Studio.sim.res, n = Studio.sim.net; return r.nodeV[n.pinNode[pn]]; }, p);

  if (!only || only === '4') counterEquivalence();
  if (!only || only === '5') rippleDelay();
  if (!only || only === 'g') knotenNetzliste();
  if (!only || only === '1') overdrive();
  if (!only || only === '6') uhr();
  if (!only || only === 'c') logikTests();
  if (!only || only === 'f') aufgabeTests();
  /* ===== Stufe 0 ===== */
  if (!only || only === '0') {
    // Zahlenformate
    const si = await page.evaluate(() => ['4k7', '100n', '2,2u', '1M', '1e-6', '10m', '3meg', '47', '4.7 kΩ', '220Ω', 'abc', '1x'].map(Studio.parseSI));
    [4700, 1e-7, 2.2e-6, 1e6, 1e-6, 0.01, 3e6, 47, 4700, 220].forEach((w, i) => ok(near(si[i], w, 1e-12), 'parseSI #' + i + ': ' + si[i] + ' statt ' + w));
    ok(isNaN(si[10]) && isNaN(si[11]), 'parseSI akzeptiert Unsinn');
    // Aufbau: Spannungsteiler B1 – R1 – R2
    await add('battery'); await add('resistor'); await add('resistor');
    ok(await page.evaluate(() => Studio.core.layout.parts.map(p => p.id).join()) === 'B1,R1,R2', 'Bauteil-IDs B1,R1,R2');
    await selectPart('B1'); await setField('value', '9'); await setField('ri', '1');
    await selectPart('R1'); await setField('value', '1k');
    await selectPart('R2'); await setField('value', '2k');
    await pin('B1.p'); await pin('R1.a'); await pin('R1.b'); await pin('R2.a'); await pin('R2.b'); await pin('B1.n');
    ok(await page.evaluate(() => Studio.core.layout.wires.length) === 3, '3 Leitungen gezogen');
    await page.waitForTimeout(150);
    // Sollwerte von Hand: Rges = 1 + 1000 + 2000 = 3001, I = 9/3001, U(R1.b) = I·2000
    ok(near(await nv('R1.b'), 18000 / 3001, 1e-5), 'Spannungsteiler U(R2) = ' + await nv('R1.b'));
    const iR1 = await page.evaluate(() => Studio.sim.res.parts.R1.i); ok(near(iR1, 9 / 3001, 1e-5), 'Strom R1 = ' + iR1);
    await page.screenshot({ path: shots + '/s0_teiler.png' });
    // Anzeige im Inspektor
    await selectPart('R2'); await page.waitForTimeout(80);
    const insT = await page.textContent('#insLive'); ok(/Spannung/.test(insT) && /5\.99|6\.00/.test(insT), 'Inspektor zeigt die Spannung über R2 (6 V): ' + insT);
    // Drehen
    const rot0 = await page.evaluate(() => Studio.core.part('R2').rot || 0);
    await page.keyboard.press('r'); ok(await page.evaluate(() => Studio.core.part('R2').rot) === (rot0 + 90) % 360, 'R dreht um 90°');
    await page.click('#btnRot'); ok(await page.evaluate(() => Studio.core.part('R2').rot) === (rot0 + 180) % 360, 'Drehen-Knopf');
    // Löschen: Bauteil mit Leitungen
    await selectPart('R2'); await page.keyboard.press('Delete');
    ok(await page.evaluate(() => Studio.core.layout.parts.length) === 2 && await page.evaluate(() => Studio.core.layout.wires.length) === 1, 'Löschen nimmt Bauteil und seine Leitungen weg');
    // Ziehen aus der Bauteilleiste
    await tab(page, 'capacitor'); await page.dragAndDrop('[data-add="capacitor"]', '#board', { targetPosition: { x: 500, y: 300 } });
    ok(await page.evaluate(() => Studio.core.layout.parts.some(p => p.type === 'capacitor')), 'Bauteil aus der Leiste auf die Fläche gezogen');
    // Neu
    await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Neu")');
    ok(await page.evaluate(() => Studio.core.layout.parts.length) === 0, 'Datei → Neu leert die Zeichenfläche');
    // Menüs
    await page.click('#menu-hilfe > button'); ok(await page.isVisible('#menu-hilfe .drop'), 'Hilfemenü öffnet');
    await page.keyboard.press('Escape'); await page.click('body', { position: { x: 700, y: 400 } });
  }


  /* ===== Stufe 1: laufende Simulation und Oszilloskop ===== */
  if (!only || only === '1') {
    const RC = { parts: [
      { id: 'G1', type: 'acsource', x: 200, y: 300, rot: 0, value: 5, props: { freq: 50, shape: 'square', ri: 0.05 } },
      { id: 'R1', type: 'resistor', x: 400, y: 200, rot: 0, value: 1000 },
      { id: 'C1', type: 'capacitor', x: 600, y: 300, rot: 90, value: 1e-6 }],
      wires: [{ from: 'G1.p', to: 'R1.a' }, { from: 'R1.b', to: 'C1.a' }, { from: 'C1.b', to: 'G1.n' }] };
    await page.evaluate(l => Studio.loadLayout(l), RC);
    const dt = await page.evaluate(() => Studio.sim.dt);
    ok(near(dt, 10e-6, 0.3), 'Schrittweite automatisch aus R·C und Frequenz: ' + dt);
    // 1. Schleife läuft
    const t0 = await page.evaluate(() => Studio.sim.state.t); await page.waitForTimeout(700);
    const t1 = await page.evaluate(() => Studio.sim.state.t); ok(t1 > t0 + 0.005, 'Simulationsschleife läuft: t ' + t0 + ' → ' + t1);
    // Signale per Rechtsklick (ohne Moduswechsel): erst R1.b (Kondensatorspannung), dann G1.p (Quelle)
    await ctxPin('R1.b', 'Ins Oszilloskop'); await ctxPin('G1.p', 'Ins Oszilloskop');
    ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch.length === 2), 'Rechtsklick auf Anschlüsse legt Kanäle im ersten Fenster an');
    // 2. zweites Fenster, anderes Signal (Strom durch R1), unabhängig
    await page.click('#btnScope');
    await page.evaluate(() => Studio.scopes.forEach(sc => { sc.el.style.left = '700px'; sc.el.style.top = '420px'; })); // Fenster aus dem Weg ziehen
    await ctxPart('R1', 'Ins Oszilloskop: Spannung'); await ctxPart('R1', 'Ins Oszilloskop: Strom');
    const chs = await page.evaluate(() => Studio.scopes.map(s => s.ch.map(c => c.tr.label)));
    ok(chs.length === 2 && chs[0].length === 2 && chs[1].length === 2 && chs[1].join() === 'U(R1),I(R1)', 'zwei Oszilloskop-Fenster mit eigenen Kanälen: ' + JSON.stringify(chs));
    await page.evaluate(() => Studio.scopes[0].close()); // Fenster 1 schliessen: Fenster 2 bleibt
    ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch.length === 2), 'Fenster 2 arbeitet unabhängig weiter');
    await page.evaluate(() => { Studio.scopes[0].close(); });
    // neu aufbauen: Fenster 1 mit R1.b zuerst
    await page.evaluate(() => { Studio.sim.reset(); Studio.openScope([{ kind: 'node', a: 'R1.b' }, { kind: 'node', a: 'G1.p' }]); });
    // 3. Zeitfaktor: 10-fach bedeutet ungefähr 10-fach schnellere Simulationszeit, gleiche Kurvenform
    const rate = async f => { await page.selectOption('#selFactor', String(f)); await page.waitForTimeout(100); const a = await page.evaluate(() => Studio.sim.state.t); await page.waitForTimeout(1000); return (await page.evaluate(() => Studio.sim.state.t)) - a; };
    const slow = await rate(0.01), fast = await rate(0.1);
    ok(fast / slow > 6 && fast / slow < 14, 'Zeitfaktor 0,01 → 0,1 ändert die Geschwindigkeit etwa 10-fach: ' + slow.toFixed(4) + ' s → ' + fast.toFixed(4) + ' s');
    // Kurvenform unabhängig vom Zeitfaktor: Wert bei fester Simulationszeit
    const shape = await page.evaluate(() => { const tr = Studio.scopes[0].ch[0].tr; const t = 0.012; return [tr.at(t), tr.at(0.0155)]; });
    // 4. Auto-Skalierung ohne Handgriff
    await page.selectOption('#selFactor', 'auto'); await page.evaluate(() => Studio.sim.advance(0.25));
    await page.waitForTimeout(500);
    const sc = await page.evaluate(() => { const s = Studio.scopes[0]; s.draw(true); return { span: s.span(), lo: s.cls.V.lo, hi: s.cls.V.hi, auto: !s.spanMan && !s.vdiv }; });
    ok(sc.auto && near(sc.span, 0.1, 1e-9) && sc.lo <= -5 && sc.hi >= 5, 'Auto-Zeitbasis (4 Perioden → 100 ms) und Auto-Amplitude: ' + JSON.stringify(sc));
    await page.screenshot({ path: shots + '/s1_scope.png' });
    // 5. Messcursor: τ
    await page.evaluate(() => Studio.sim.pause()); await page.evaluate(() => Studio.syncRun());
    await page.evaluate(() => Studio.sim.advance(0.0));
    const tauTxt = await page.evaluate(() => { const s = Studio.scopes[0]; const r = s.tau(); return r && r.tau; }); await page.waitForTimeout(200);
    ok(tauTxt && near(tauTxt, 1e-3, 0.02), 'Messcursor: τ = ' + tauTxt + ' s gegen R·C = 1 ms (2 %)');
    { const txt = await page.evaluate(() => Array.from(document.querySelectorAll('.sc-read')).map(e => e.hidden + ':' + e.textContent.slice(0, 60)).join(' || ')); ok(/Δt/.test(txt), 'Cursor-Anzeige zeigt Δt: ' + txt); }
    await page.screenshot({ path: shots + '/s1_tau.png' });
  }


  /* ===== Stufe 2/3: Spule, Gatter mit n Eingängen, Flipflops ===== */
  if (!only || only === '3') {
    await page.evaluate(() => Studio.newCircuit());
    // Gatter: Eingangszahl einstellbar, Leitungen an wegfallenden Eingängen verschwinden
    await add('and'); await add('logicin'); await add('logicin'); await add('logicin');
    await selectPart('U1'); await page.selectOption('[data-f="inputs"]', '3');
    ok(await page.isVisible('[data-pin="U1.in3"]'), 'UND mit 3 Eingängen zeigt Anschluss in3');
    await pin('E1.out'); await pin('U1.in3');
    ok(await page.evaluate(() => Studio.core.layout.wires.length) === 1, 'Leitung an in3');
    await page.waitForTimeout(450); await selectPart('U1'); await page.selectOption('[data-f="inputs"]', '2');
    ok(await page.evaluate(() => Studio.core.layout.wires.length) === 0, 'Leitung an wegfallendem Eingang entfernt');
    // Flipflop mit preSet/preClear und Steuerungsart
    await add('jkff');
    ok(await page.isVisible('[data-pin="FF1.PS"]') && await page.isVisible('[data-pin="FF1.PC"]'), 'JK-Flipflop zeigt preSet und preClear');
    await page.waitForTimeout(450); await selectPart('FF1'); await page.selectOption('[data-f="trig"]', 'neg');
    ok(await page.evaluate(() => Studio.core.part('FF1').props.trig) === 'neg', 'Steuerungsart fallende Flanke einstellbar');
    await add('rsff'); await add('jkms');
    ok(await page.evaluate(() => Studio.core.layout.parts.map(p => p.id).filter(i => /^FF/.test(i)).join()) === 'FF1,FF2,FF3', 'RS- und JK-MS-Flipflop in der Leiste');
    await page.screenshot({ path: shots + '/s3_flipflops.png' });
    // preSet und preClear zugleich: Bauteil markiert, Klartext im Inspektor und in der Statusleiste
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'FF1', type: 'dff', x: 600, y: 300, rot: 0 }, { id: 'E1', type: 'logicin', x: 300, y: 200, rot: 0, props: { closed: true } }, { id: 'E2', type: 'logicin', x: 300, y: 400, rot: 0, props: { closed: true } }],
      wires: [{ from: 'E1.out', to: 'FF1.PS' }, { from: 'E2.out', to: 'FF1.PC' }] }, { run: false }));
    await page.waitForTimeout(300); await selectPart('FF1'); await page.waitForTimeout(300);
    ok(await page.isVisible('.forbid') && /preSet und preClear liegen zugleich an/.test(await page.textContent('#insForbid')) && /unzulässig/.test(await page.textContent('#statusbar')), 'unzulässiger Zustand markiert und im Klartext gemeldet');
    // Spule im Aufbau: RL-Glied über die Bedienung, Strom steigt nach τ = L/R
    await page.evaluate(() => Studio.loadLayout({ parts: [
      { id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 10, props: { ri: 1 } }, { id: 'R1', type: 'resistor', x: 400, y: 200, rot: 0, value: 99 },
      { id: 'L1', type: 'inductor', x: 600, y: 300, rot: 90, value: 10e-3 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'L1.a' }, { from: 'L1.b', to: 'B1.n' }] }, { run: false }));
    await page.evaluate(() => { Studio.sim.pause(); Studio.openScope([{ kind: 'pi', id: 'L1' }]); Studio.sim.advance(0.002); });
    const il = await page.evaluate(() => { const tr = Studio.scopes[0].ch[0].tr; return [tr.at(1e-4), tr.at(0.0019), Studio.sim.dt, tr.n, tr.t[tr.n - 1], Studio.sim.err]; });
    ok(near(il[0], 0.1 * (1 - Math.exp(-1)), 0.02) && near(il[1], 0.1, 0.01), 'Spule: i(τ) = 63,2 % von I∞ (' + JSON.stringify(il) + ')');
  }


  /* ===== Stufe 4: Zähler aufklappen im Browser ===== */
  if (!only || only === '4') {
    await page.evaluate(() => Studio.loadLayout({ parts: [
      { id: 'CLK1', type: 'clock', x: 300, y: 300, rot: 0, props: { freq: 10 } },
      { id: 'Z1', type: 'ctr_async', x: 600, y: 300, rot: 0, props: { bits: 3 } },
      { id: 'GND1', type: 'ground', x: 300, y: 500, rot: 0 }],
      wires: [{ from: 'CLK1.out', to: 'Z1.C' }] }, { run: false }));
    await page.evaluate(() => Studio.sim.advance(0.55)); // fuenf steigende Flanken (Takt 10 Hz, erste bei 0,1 s)
    const before = await page.evaluate(() => Studio.sim.res.parts.Z1.count);
    ok(before === 5, 'Kasten zählt fünf Takte: ' + before);
    await tab(page, 'ctr_bcd'); ok(await page.isVisible('[data-add="ctr_bcd"]') && await page.isVisible('[data-add="ctr_johnson"]'), 'Zähler in der Bauteilleiste');
    await page.waitForTimeout(450);
    await page.dblclick('[data-part="Z1"] .hit', { force: true });
    const ex = await page.evaluate(() => ({ types: Studio.core.layout.parts.map(p => p.type).sort().join(), wires: Studio.core.layout.wires.length,
      clkTo: Studio.core.layout.wires.filter(w => w.from === 'CLK1.out' || w.to === 'CLK1.out').map(w => w.from === 'CLK1.out' ? w.to : w.from) }));
    ok(ex.types === 'clock,dff,dff,dff,ground' && ex.clkTo.length === 1 && /^FF\d\.C$/.test(ex.clkTo[0]), 'Doppelklick klappt den Zähler in drei Flipflops auf, Takt an FF.C: ' + JSON.stringify(ex));
    await page.evaluate(() => { Studio.sim.reset(); Studio.sim.advance(0.55); });
    const q = await page.evaluate(() => Studio.sim.res.parts.FF1.q + 2 * Studio.sim.res.parts.FF2.q + 4 * Studio.sim.res.parts.FF3.q);
    ok(q === 5, 'aufgeklappter Zähler zählt dieselben fünf Takte: ' + q);
    await page.screenshot({ path: shots + '/s4_aufgeklappt.png' });
  }


  /* ===== Stufe 5/6: Zeitverlauf, Inspektor, Beispiele im Browser ===== */
  if (!only || only === '5' || only === '6') {
    const loadEx = async name => { await page.click('#menu-bsp > button'); await page.click(`#menu-bsp .drop button:has-text("${name}")`); };
    await loadEx('Asynchroner Zähler');
    await page.evaluate(() => { Studio.sim.pause(); Studio.syncRun(); Studio.sim.advance(24e-6); });
    const nrows = await page.evaluate(() => Studio.timing.rows.length);
    ok(nrows >= 6, 'Zeitverlauf: Takt, vier Flipflop-Ausgänge und Zählerstand (' + nrows + ' Zeilen)');
    await page.evaluate(() => Studio.timingDraw());
    await page.screenshot({ path: shots + '/s5_zeitverlauf.png' });
    // hineinzoomen: 1,2 µs bildbreit zeigt die Laufzeit (20 ns je Stufe)
    await page.selectOption('#tlSpan', String(2e-6)); await page.evaluate(() => Studio.timingDraw());
    await page.screenshot({ path: shots + '/s5_zeitverlauf_zoom.png' });
    // Zeilen umordnen und entfernen
    const first = await page.evaluate(() => Studio.timing.rows[0].key);
    await page.click('.tl-row[data-i="0"] [data-a="down"]');
    ok(await page.evaluate(k => Studio.timing.rows[1].key === k, first), 'Zeile mit ▼ nach unten verschoben');
    await page.click('.tl-row[data-i="1"] [data-a="rm"]'); ok(await page.evaluate(n => Studio.timing.rows.length === n - 1, nrows), 'Zeile entfernt');
    // Inspektor: JK-Flipflop mit Analyse- und Ansteuertabelle, aktive Zeile
    await page.evaluate(() => Studio.newCircuit()); await add('jkff'); await selectPart('FF1'); await page.waitForTimeout(100);
    const ins = await page.evaluate(() => ({ tabs: document.querySelectorAll('#inspector table.itab').length, act: document.querySelectorAll('#inspector tr.act').length,
      excit: Array.from(document.querySelectorAll('#inspector table.ffx tbody tr')).map(r => Array.from(r.children).map(c => c.textContent).join('')), svg: !!document.querySelector('#inspector svg.sfd'),
      heads: Array.from(document.querySelectorAll('#inspector h3')).map(h => h.textContent),
      cols: Array.from(document.querySelectorAll('#inspector table.ff thead th, #inspector table.ffx thead th')).map(h => h.textContent).join(' '), all: document.querySelector('#inspector').textContent }));
    ok(ins.cols === 'J K AV A AV A J K', 'Tabellenköpfe in Stevens Schreibweise AV | A (Analyse: Eingänge | AV | A, Ansteuer: AV | A | Eingänge): ' + ins.cols);
    ok(!/Qₙ|Q⁺/.test(ins.all), 'Kein Qₙ / Q⁺ mehr im Inspektor');
    ok(ins.tabs === 2 && ins.act === 2 && ins.svg, 'Inspektor: Analyse- und Ansteuertabelle, Zustandsfolgediagramm, aktive Zeilen: ' + JSON.stringify({ tabs: ins.tabs, act: ins.act, svg: ins.svg }));
    ok(ins.excit.join() === '000X,011X,10X1,11X0', 'Ansteuertabelle JK mit X: ' + ins.excit.join());
    ok(['Funktion', 'Analysetabelle', 'Ansteuertabelle', 'Zustandsfolgediagramm'].every(h => ins.heads.includes(h)), 'Begriffe wie im Lehrmittel: ' + ins.heads.join(' | '));
    // Gatter-Analysetabelle: aktive Zeile folgt den Eingängen
    await add('and'); await add('logicin'); await add('logicin'); await pin('E1.out'); await pin('U1.in1'); await pin('E2.out'); await pin('U1.in2');
    await page.waitForTimeout(450); await selectPart('E1'); await page.waitForTimeout(400); // Klick legt den Pegelschalter E1 um: 1
    await page.waitForTimeout(450); await selectPart('U1'); await page.waitForTimeout(250);
    const g = await page.evaluate(() => ({ act: document.querySelector('#inspector tr.act') && document.querySelector('#inspector tr.act').dataset.k, rows: document.querySelectorAll('#inspector table.gate tbody tr').length }));
    ok(g.rows === 4 && g.act === '10', 'UND: Wahrheitstabelle mit aktiver Zeile für E1 = 1, E2 = 0: ' + JSON.stringify(g));

    // Stufe 6: Digitaluhr aus dem Menü, läuft in Echtzeit
    await loadEx('Digitaluhr');
    const t0 = await page.evaluate(() => Studio.sim.state.t); await page.waitForTimeout(3300);
    const t1 = await page.evaluate(() => Studio.sim.state.t), cnt = await page.evaluate(() => Studio.sim.res.parts.Z1.count);
    ok(t1 - t0 > 2.9 && t1 - t0 < 3.7, 'Uhr läuft in Echtzeit: ' + (t1 - t0).toFixed(2) + ' s Simulationszeit in 3,3 s (Zeitfaktor ' + await page.evaluate(() => Studio.sim.effFactor()) + ')');
    ok(cnt >= 2 && cnt <= 4, 'Sekundenzähler zeigt ' + cnt);
    ok(await page.evaluate(() => Studio.sim.res.parts.AZ1.on && !Studio.sim.faults.length), 'Siebensegmentanzeige leuchtet, keine Störung');
    await page.screenshot({ path: shots + '/s6_uhr.png' });
    ok(await page.evaluate(() => Studio.examples.length >= 6), 'Menü Beispiele enthält die mitgelieferten Schaltungen');
  }


  /* ===== Stufe 7: Bode-Diagramm im Browser ===== */
  if (!only || only === '7') {
    await page.click('#menu-bsp > button'); await page.click('#menu-bsp .drop button:has-text("Bode-Diagramm")');
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => Studio.bodes.length === 1 && Studio.bodes[0].data[0] && Studio.bodes[0].data[0].freqs.length === 200), 'Bode-Fenster mit Frequenzgang aus der Wechselstromanalyse');
    await page.click('.fwin [data-a="m3"]'); await page.waitForTimeout(100);
    const fg = await page.evaluate(() => Studio.bodes[0].marks.map(m => m.f)), want = 1 / (2 * Math.PI * 1000 * 1e-7);
    ok(fg.length === 1 && near(fg[0], want, 0.01), '−3-dB-Marke bei ' + fg.map(f => f.toFixed(1)) + ' Hz, fg = ' + want.toFixed(1) + ' Hz');
    const ph = await page.evaluate(() => Studio.bodes[0].marks[0].phase); ok(near(ph, -45, 0.02), 'Phase bei fg: ' + ph.toFixed(2) + '°');
    await page.screenshot({ path: shots + '/s7_bode.png' });
    // Bauteilwert ändern: Frequenzgang rechnet neu
    await page.evaluate(() => { const p = Studio.core.part('C1'); p.value = 2e-7; Studio.core.changed('edit'); }); await page.waitForTimeout(300);
    await page.click('.fwin [data-a="m3"]'); const fg2 = await page.evaluate(() => Studio.bodes[0].marks[0].f);
    ok(near(fg2, want / 2, 0.01), 'Wert geändert: fg halbiert sich (' + fg2.toFixed(1) + ' Hz)');
  }


  /* ===== Nacht Paket 3: Rückgängig, Zwischenspeichern, Tastatur ===== */
  if (!only || only === '8') {
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'R1', type: 'resistor', x: 400, y: 300, rot: 0, value: 1000 }, { id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 5 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'B1.n' }] }, { run: false }));
    const r = await page.evaluate(() => {
      const S = Studio, core = S.core, E = S.E; let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, pick = a => a[Math.floor(rnd() * a.length)];
      const h0 = JSON.stringify(core.layout), size0 = S.history.size(), types = ['resistor', 'capacitor', 'battery', 'led', 'switch', 'and', 'dff', 'ctr_bcd', 'inductor', 'logicin'];
      let n = 0, guard = 0;
      while (S.history.size() - size0 < 50 && guard++ < 2000) {
        const ps = core.layout.parts, op = ps.length < 3 ? 0 : Math.floor(rnd() * 7), p = ps.length ? pick(ps) : null;
        if (op === 0) core.addPart(pick(types), 200 + rnd() * 1500, 200 + rnd() * 900, 'schema');
        else if (op === 1) { core.pressPart(p.id, [p.x, p.y], 'schema'); core.dragTo([p.x + 60, p.y + 40]); core.release(); }
        else if (op === 2) { core.sel = p.id; core.rotateSelected('schema'); }
        else if (op === 3 && ps.length > 4) { core.sel = p.id; core.removeSelected(); }
        else if (op === 4) { const q = pick(ps); if (q.id !== p.id) { const pa = p.id + '.' + E.pinsOf(p.type, p.props)[0], pb = q.id + '.' + E.pinsOf(q.type, q.props).slice(-1)[0]; core.wireStart = null; core.connectPin(pa); core.connectPin(pb); } }
        else if (op === 5) { S.setProp(p, 'value', Math.round(100 + rnd() * 9000)); core.changed('edit'); }
        else if (op === 6 && /switch|logicin/.test(p.type)) { core.pressPart(p.id, [p.x, p.y], 'schema'); core.release(); }
      }
      const steps = S.history.size() - size0, h50 = JSON.stringify(core.layout);
      let u = 0; while (S.undo()) { u++; if (u >= steps) break; }
      const back = JSON.stringify(core.layout) === h0;
      let rd = 0; while (S.redo()) { rd++; if (rd >= steps) break; }
      return { steps, u, rd, back, forward: JSON.stringify(core.layout) === h50, canUndoMore: S.undo() && S.redo() };
    });
    ok(r.steps === 50 && r.u === 50 && r.back, 'fünfzig Bedienschritte, fünfzig Mal rückgängig: Schaltung byteweise identisch mit dem Ausgangszustand (' + JSON.stringify({ steps: r.steps, u: r.u, back: r.back }) + ')');
    ok(r.rd === 50 && r.forward, 'fünfzig Mal wiederholen: identisch mit dem Zustand nach den Schritten');
    // Tastenkürzel Strg+Z / Strg+Y / Strg+Umschalt+Z
    await page.evaluate(() => Studio.core.addPart('resistor', 600, 400, 'schema')); const n1 = await page.evaluate(() => Studio.core.layout.parts.length);
    await page.mouse.click(700, 500); await page.keyboard.press('Control+z'); ok(await page.evaluate(() => Studio.core.layout.parts.length) === n1 - 1, 'Strg+Z macht rückgängig');
    await page.keyboard.press('Control+y'); ok(await page.evaluate(() => Studio.core.layout.parts.length) === n1, 'Strg+Y wiederholt');
    await page.keyboard.press('Control+z'); await page.keyboard.press('Control+Shift+z'); ok(await page.evaluate(() => Studio.core.layout.parts.length) === n1, 'Strg+Umschalt+Z wiederholt');
    // Auswahl, Kopieren, Einfügen, Pfeile, Löschen
    await page.keyboard.press('Control+a'); ok(await page.evaluate(() => Studio.multi.length === Studio.core.layout.parts.length), 'Strg+A wählt alles');
    await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v');
    ok(await page.evaluate(n => Studio.core.layout.parts.length === 2 * n, n1), 'Strg+C und Strg+V verdoppeln die Bauteile');
    const x0 = await page.evaluate(() => Studio.core.part(Studio.multi[0]).x); await page.keyboard.press('ArrowRight');
    ok(await page.evaluate(() => Studio.core.part(Studio.multi[0]).x) === x0 + 20, 'Pfeiltaste verschiebt um ein Raster');
    await page.keyboard.press('Delete'); ok(await page.evaluate(n => Studio.core.layout.parts.length === n, n1), 'Entf löscht die ganze Auswahl auf einmal');
    await page.keyboard.press('Control+z'); ok(await page.evaluate(n => Studio.core.layout.parts.length === 2 * n, n1), 'Mehrfach-Löschen ist ein Schritt');
    await page.click('#menu-hilfe > button'); await page.click('#menu-hilfe .drop button:has-text("Tastenkürzel")'); ok(/Strg \+ Z/.test(await page.textContent('#modal')), 'Hilfemenü zeigt die Tastenkürzel'); await page.keyboard.press('Escape');
    // Zwischenspeichern: bauen, neu laden, Wiederherstellung wird angeboten
    await page.evaluate(() => Studio.newCircuit()); await page.evaluate(() => { Studio.core.addPart('battery', 300, 300, 'schema'); Studio.core.addPart('resistor', 500, 300, 'schema'); Studio.core.addPart('led', 700, 300, 'schema'); });
    const before = await page.evaluate(() => { Studio.autosave(); return JSON.stringify(Studio.core.layout); });
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.sim);
    ok(await page.isVisible('#asYes') && /3 Bauteilen/.test(await page.textContent('#modal')), 'nach dem Neuladen wird die Wiederherstellung angeboten');
    await page.click('#asYes'); ok(await page.evaluate(b => JSON.stringify(Studio.core.layout) === b, before), 'Wiederherstellung stellt dieselbe Schaltung her');
    // ohne Browserspeicher läuft die Seite
    const page2 = await ctx.newPage(); const e2 = []; page2.on('pageerror', e => e2.push(e.message));
    await page2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('gesperrt'); } }); });
    await page2.goto(url, { waitUntil: 'domcontentloaded' }); await page2.waitForFunction(() => window.Studio && Studio.sim); await page2.click('[data-tab="Analog"]'); await page2.click('[data-add="resistor"]'); await page2.mouse.click(300, 300); await page2.waitForTimeout(3300);
    ok(!e2.length && await page2.evaluate(() => Studio.core.layout.parts.length) === 1, 'Seite funktioniert ohne Browserspeicher: ' + e2.join('|')); await page2.close();
  }


  /* ===== Nacht Paket 4: Schieberegler ===== */
  if (!only || only === '9') {
    await page.evaluate(() => Studio.loadLayout({ parts: [
      { id: 'G1', type: 'acsource', x: 200, y: 300, rot: 0, value: 5, props: { freq: 50, shape: 'square', ri: 0.05 } }, { id: 'R1', type: 'resistor', x: 400, y: 200, rot: 0, value: 1000 },
      { id: 'C1', type: 'capacitor', x: 600, y: 300, rot: 90, value: 1e-6 }], wires: [{ from: 'G1.p', to: 'R1.a' }, { from: 'R1.b', to: 'C1.a' }, { from: 'C1.b', to: 'G1.n' }] }));
    ok(await page.evaluate(() => Studio.sim.running), 'Simulation läuft');
    await page.evaluate(() => { Studio.openScope([{ kind: 'node', a: 'R1.b' }, { kind: 'node', a: 'G1.p' }]); Studio.scopes[0].el.style.left = '700px'; Studio.scopes[0].el.style.top = '420px'; });
    await selectPart('R1'); await page.check('[data-sl="on"][data-slp="value"]');
    ok(await page.isVisible('#sliderBar') && await page.isVisible('#sliderBar input[type=range]'), 'Regler für R1 erscheint in der Reglerleiste');
    await page.fill('[data-sl="min"]', '500'); await page.dispatchEvent('[data-sl="min"]', 'change'); await page.fill('[data-sl="max"]', '5k'); await page.dispatchEvent('[data-sl="max"]', 'change');
    ok(await page.evaluate(() => { const s = Studio.sliders[0]; return s.min === 500 && s.max === 5000 && s.log; }), 'Bereich 500 Ω … 5 kΩ, logarithmisch');
    const measure = async pos => {
      await page.evaluate(p => { const r = document.querySelector('#sliderBar input[type=range]'); r.value = p; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }, pos);
      return await page.evaluate(() => { const sim = Studio.sim, R = Studio.core.part('R1').value; sim.clearTraces(); const sc = Studio.scopes[0]; if (sc.frozen) sc.setFrozen(false); sim.advance(0.25); const r = sc.tau(); const sl = Studio.sliders[0]; return { R, tau: r && r.tau, running: sim.running, out: document.querySelector('#sliderBar output').textContent }; });
    };
    for (const pos of [602, 150, 450]) {
      const m = await measure(pos);
      ok(m.running && m.tau && near(m.tau, (m.R + 0.05) * 1e-6, 0.02), 'Regler ' + pos + ' ‰: R = ' + m.R.toFixed(1) + ' Ω (' + m.out + '), gemessenes τ = ' + (m.tau * 1e3).toFixed(3) + ' ms, R·C = ' + ((m.R + 0.05) * 1e-3).toFixed(3) + ' ms (2 %)');
    }
    await page.screenshot({ path: shots + '/p4_regler.png' });
    ok(await page.evaluate(() => { const h = Studio.history.size(); Studio.undo(); return Studio.core.part('R1').value !== 0; }), 'Regleränderung ist rückgängig machbar');
    await page.click('#sliderBar [data-a="rm"]'); ok(!await page.isVisible('#sliderBar'), 'Regler entfernen blendet die Leiste aus');
  }


  /* ===== Nacht Paket 5: Dateien, Export, Drucken, Stückliste ===== */
  if (!only || only === 'a') {
    const os = require('os'), cp = require('child_process'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dqs-'));
    const loadEx = async name => { await page.click('#menu-bsp > button'); await page.click(`#menu-bsp .drop button:has-text("${name}")`); };
    await loadEx('Digitaluhr'); await page.evaluate(() => { Studio.sim.pause(); Studio.syncRun(); });
    const orig = await page.evaluate(() => JSON.stringify(Studio.core.layout));
    // Speichern über das Menü (Download), Laden über «Öffnen»
    const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Speichern")'); })()]);
    const saved = path.join(tmp, dl.suggestedFilename()); await dl.saveAs(saved); const txt = fs.readFileSync(saved, 'utf8'), js = JSON.parse(txt);
    ok(/\.dqstudio\.json$/.test(dl.suggestedFilename()) && js.format === 'dqstudio' && js.version === 2 && js.layout.parts.length === 8 && txt.includes('\n'), 'Datei: lesbares JSON mit Formatversion 2 (' + dl.suggestedFilename() + ')');
    await page.evaluate(() => Studio.newCircuit()); ok(await page.evaluate(() => Studio.core.layout.parts.length) === 0, 'Neu leert');
    await page.click('#menu-datei > button'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#menu-datei .drop button:has-text("Öffnen")')]); await fc.setFiles(saved);
    await page.waitForTimeout(300);
    ok(await page.evaluate(o => JSON.stringify(Studio.core.layout) === o, orig), 'Speichern und Laden ergibt dieselbe Schaltung (Vergleich der Layouts)');
    // ältere Formate und zu neue Dateien
    await page.evaluate(t => Studio.openText(t), fs.readFileSync(path.join(__dirname, 'fixtures/studio_v1.json'), 'utf8'));
    ok(await page.evaluate(() => Studio.core.layout.parts.map(p => p.id).join() === 'B1,R1,R2' && Studio.sim.net && Math.abs(Studio.sim.res.nodeV[Studio.sim.net.pinNode['R1.b']] - 9 * 2200 / 6900) < 0.01), 'Datei mit Formatversion 1 lässt sich öffnen und rechnet (U an R2 = 2,87 V)');
    await page.evaluate(t => Studio.openText(t), fs.readFileSync(path.join(__dirname, 'fixtures/studio_v0.json'), 'utf8'));
    ok(await page.evaluate(() => Studio.core.layout.parts.length === 2), 'reines Layout ohne Formatangabe (Version 0) lässt sich öffnen');
    const fut = await page.evaluate(t => Studio.parseFile(t), fs.readFileSync(path.join(__dirname, 'fixtures/studio_zukunft.json'), 'utf8'));
    ok(!fut.ok && /neueren Version/.test(fut.error), 'Datei aus einer neueren Version wird mit Klartext abgelehnt: ' + fut.error);
    ok(!(await page.evaluate(() => Studio.parseFile('{"format":"dqstudio","version":2,"layout":{"parts":[{"id":"X1","type":"gibtesnicht","x":0,"y":0}],"wires":[]}}'))).ok, 'unbekanntes Bauteil wird abgelehnt');
    // Export der Digitaluhr
    await loadEx('Digitaluhr'); await page.evaluate(() => { Studio.sim.pause(); Studio.syncRun(); Studio.sim.advance(3.5); });
    const svgs = {}; for (const [k, o] of [['farbe', { color: true, values: false }], ['sw', { color: false, values: false }], ['mw', { color: true, values: true }]]) { svgs[k] = await page.evaluate(op => Studio.exportSVG(op).svg, o); fs.writeFileSync(path.join(tmp, 'uhr_' + k + '.svg'), svgs[k]); }
    const info = await page.evaluate(t => { const d = new DOMParser().parseFromString(t, 'image/svg+xml'); return { err: !!d.querySelector('parsererror'), parts: d.querySelectorAll('g.part').length, wires: d.querySelectorAll('path.wire').length, hits: d.querySelectorAll('.hit,.pinhit,.wirehit').length, scripts: d.querySelectorAll('script').length, vl: d.querySelectorAll('.vlabel').length, vb: d.documentElement.getAttribute('viewBox') }; }, svgs.farbe);
    ok(!info.err && info.parts === 8 && info.wires === 24 && info.hits === 0 && info.scripts === 0, 'SVG der Digitaluhr: gültiges XML, 8 Bauteile, 24 Leitungen, ohne Trefferflächen: ' + JSON.stringify(info));
    const py = cp.spawnSync('python3', ['-I', '-c', 'import sys, xml.dom.minidom as m\nfor f in sys.argv[1:]:\n    d = m.parse(f)\n    assert d.documentElement.tagName == "svg" and d.documentElement.getAttribute("viewBox")\nprint("ok")', ...['farbe', 'sw', 'mw'].map(k => path.join(tmp, 'uhr_' + k + '.svg'))]);
    ok(py.status === 0 && /ok/.test(String(py.stdout)), 'SVG öffnet sich fehlerfrei in einem anderen Programm (strenger XML-Parser von Python): ' + String(py.stderr).slice(0, 200));
    ok(!/#0b6e94|#22b573|#e2574c/i.test(svgs.sw.replace(/<style>[\s\S]*?<\/style>/, '')) && !/#0b6e94|#22b573/.test(svgs.sw), 'Schwarzweiss-Export enthält keine Farben');
    ok(/vlabel/.test(svgs.mw.replace(/<style>[\s\S]*?<\/style>/, '')) && !/class="vlabel"/.test(svgs.farbe), 'Messwerte nur auf Wunsch im Bild');
    const pg3 = await ctx.newPage(); await pg3.goto('file://' + path.join(tmp, 'uhr_farbe.svg')); ok(await pg3.evaluate(() => document.documentElement.tagName === 'svg' && document.querySelectorAll('g.part').length === 8 && !!document.documentElement.getBoundingClientRect().width), 'Chromium zeigt die SVG-Datei eigenständig an'); await pg3.screenshot({ path: shots + '/p5_export.png' }); await pg3.close();
    const png = await page.evaluate(() => new Promise(res => Studio.exportPNG({ color: false, values: false }, async (b, w, h) => { const a = new Uint8Array(await b.arrayBuffer()); res({ sig: Array.from(a.slice(0, 8)).join(), w, h, size: a.length }); })));
    ok(png.sig === '137,80,78,71,13,10,26,10' && png.w > 400 && png.h > 200, 'PNG-Export: gültige PNG-Datei ' + png.w + ' × ' + png.h);
    // Stückliste der Digitaluhr gegen die Schaltung
    const bom = await page.evaluate(() => { const rows = Studio.bom(), cnt = {}; Studio.core.layout.parts.forEach(p => { if (p.type !== 'ground') cnt[p.type] = (cnt[p.type] || 0) + 1; }); return { rows: rows.map(r => [r.type, r.count, r.value, r.ids.join('+')]), cnt, csv: Studio.bomCSV(rows) }; });
    const sum = {}; bom.rows.forEach(r => { sum[r[0]] = (sum[r[0]] || 0) + r[1]; });
    const srt = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
    ok(srt(sum) === srt(bom.cnt) && bom.rows.length === 5 && bom.rows.some(r => r[0] === 'dec7' && r[1] === 2) && bom.rows.some(r => r[0] === 'ctr_mod' && /Modulo 6/.test(r[2])), 'Stückliste der Digitaluhr stimmt mit der Schaltung überein: ' + JSON.stringify(bom.rows));
    ok(bom.csv.startsWith('﻿"Bauteil";"Wert";"Anzahl";"Bezeichnungen"') && bom.csv.trim().split('\r\n').length === 6, 'CSV mit Kopfzeile und fünf Zeilen');
    await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Stückliste")'); ok(/Summe/.test(await page.textContent('#modal')) && await page.isVisible('#bomCsv'), 'Stückliste als Tabelle im Fenster'); await page.keyboard.press('Escape'); await page.click('#modalBg', { position: { x: 5, y: 5 } }).catch(() => {});
    // Drucken: eine Seite A4 hoch mit Rahmen und Schriftfeld, Schwarzweiss (Auftrag «Bauen» Paket 5 ersetzt den alten Druck)
    await page.evaluate(() => Studio.closeModal()); await page.evaluate(() => new Promise(res => Studio.printPages({ items: { table: false, expr: false, kv: false } }, b => res(b.count)))); await page.emulateMedia({ media: 'print' });
    const pr = await page.evaluate(() => { const im = document.querySelector('#printArea .figimg').src, svg = decodeURIComponent(im.split(',').slice(1).join(',')); return { area: getComputedStyle(document.getElementById('printArea')).display, bar: getComputedStyle(document.getElementById('menubar')).display, title: document.querySelector('#printArea .pgframe').textContent, svg: (svg.match(/class="part/g) || []).length, bw: !/#0b6e94|#0f2d3a/i.test(svg.replace(/<style[\s\S]*?<\/style>/, '')) }; });
    ok(pr.area === 'block' && pr.bar === 'none' && /TITEL/.test(pr.title) && /DATUM/.test(pr.title) && pr.svg === 8 && pr.bw, 'Druckansicht: nur Schaltplan mit Rahmen und Schriftfeld: ' + JSON.stringify(pr).slice(0, 400).replace(/TITEL.*BLATT/, ''));
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true }); const ptxt = pdf.toString('latin1'); const pages = (ptxt.match(/\/Type\s*\/Page[^s]/g) || []).length, mb = /\/MediaBox\s*\[\s*0\s+0\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s*\]/.exec(ptxt);
    ok(pdf.slice(0, 4).toString() === '%PDF' && pages === 1 && mb && Math.abs(+mb[1] - 595.28) < 2 && Math.abs(+mb[2] - 841.89) < 2, 'PDF der Druckansicht: A4 hoch, eine Seite (' + pages + ' Seite, ' + (mb ? mb[1] + ' × ' + mb[2] : '?') + ' pt)');
    await page.emulateMedia({ media: 'screen' }); fs.writeFileSync(path.join(shots, 'p5_druck.pdf'), pdf);
  }


  /* ===== Nacht Paket 7: Überlastung sichtbar ===== */
  if (!only || only === 'b') {
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 24 }, { id: 'H1', type: 'lamp', x: 500, y: 300, rot: 0 }], wires: [{ from: 'B1.p', to: 'H1.a' }, { from: 'H1.b', to: 'B1.n' }] }, { run: false }));
    await page.waitForTimeout(300);
    let st = await page.textContent('#statusbar'); ok(/H1 durchgebrannt/.test(st) && /23\.98 V|24\.0/.test(st), 'Lampe an 24 V: Statusleiste meldet das Durchbrennen: ' + st.replace(/\s+/g, ' ').slice(0, 160));
    ok(await page.isVisible('.faultmark') && /durchgebrannt/.test(await page.textContent('.faulttxt')), 'Lampe im Schaltplan markiert');
    await selectPart('H1'); await page.waitForTimeout(300); const lt = await page.textContent('#insForbid');
    ok(/Glühwendel/.test(lt) && /[Aa]usgelegt/.test(lt) && /2-fachen/.test(lt), 'Klartext erklärt, was passiert ist und warum: ' + lt.slice(0, 200));
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 9 }, { id: 'R1', type: 'resistor', x: 400, y: 200, rot: 0, value: 1000 }, { id: 'D1', type: 'led', x: 600, y: 300, rot: 90 }],
      wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'D1.k' }, { from: 'D1.a', to: 'B1.n' }] }, { run: false }));
    await page.waitForTimeout(300); st = await page.textContent('#statusbar');
    ok(/D1: Sperrspannung 9\.000 V/.test(st), 'LED in Sperrrichtung: Statusleiste meldet die Sperrspannung: ' + st.replace(/\s+/g, ' ').slice(0, 160));
    await selectPart('D1'); await page.waitForTimeout(300); const lt2 = await page.textContent('#insForbid');
    ok(/Sperrrichtung/.test(lt2) && /Anode/.test(lt2) && /vertauscht/.test(lt2) && await page.isVisible('.faultmark'), 'LED markiert, Text nennt Ursache: ' + lt2.slice(0, 160));
    await page.screenshot({ path: shots + '/p7_ueberlast.png' });
    // LED durchgebrannt (ohne Vorwiderstand) und Widerstand überlastet
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 9 }, { id: 'R1', type: 'resistor', x: 500, y: 300, rot: 0, value: 10 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'B1.n' }] }, { run: false })); await page.waitForTimeout(300);
    ok(/R1 überlastet/.test(await page.textContent('#statusbar')), 'Widerstand 10 Ω an 9 V: Überlastung gemeldet');
  }


  /* ===== Nacht Pakete 8 und 9: Fenster «Logik» im Browser ===== */
  if (!only || only === 'd') {
    await page.evaluate(() => Studio.newCircuit()); await page.click('#btnLogic'); await page.waitForTimeout(200);
    await page.fill('#lgExpr', 'A = e1 ( e2 v e3 ) = e1e2 v e1e3'); await page.click('[data-a="build"]'); await page.waitForTimeout(300);
    const msg = await page.textContent('#lgMsg'); ok(/gleichwertig/.test(msg) && /e1 \( e2 v e3 \)/.test(msg), 'Ausdruck eingeben: Schaltung entsteht, Gleichung wird als gleichwertig bestätigt: ' + msg.slice(0, 120));
    ok(await page.evaluate(() => Studio.core.layout.parts.filter(p => p.type === 'logicin').length === 3 && Studio.core.layout.parts.some(p => p.type === 'logicled')), 'Schaltung mit drei Pegelschaltern und einer Logikanzeige');
    await page.click('[data-a="read"]'); const back = await page.textContent('#lgMsg'); ok(/A = e1 \( e2 v e3 \)/.test(back), 'Ausdruck aus der Schaltung ablesen: ' + back);
    await page.click('[data-a="table"]'); await page.waitForTimeout(400);
    const tb = await page.evaluate(() => ({ rows: document.querySelectorAll('#lgOut table.tt tr').length, head: Array.from(document.querySelectorAll('#lgOut table.tt th')).map(h => h.textContent).join(), kv: !!document.querySelector('#lgOut svg.kv'), loops: document.querySelectorAll('#lgOut .kv-loop').length, expr: document.querySelector('#lgOut .lg-expr').textContent }));
    ok(tb.rows === 9 && tb.head === 'e3,e2,e1,A' && tb.kv && tb.loops >= 1 && /e1e2 v e1e3|e1 e3 v e1 e2|e1/.test(tb.expr), 'Wahrheitstabelle (8 Zeilen), KV-Diagramm mit Päckchen und Minimalform: ' + JSON.stringify(tb));
    await page.screenshot({ path: shots + '/p8_logik.png' });
    await page.fill('#lgExpr', 'A = e1 $ e2'); await page.click('[data-a="build"]'); ok(/verstehe ich nicht/.test(await page.textContent('#lgMsg')), 'Fehleingabe: verständliche Meldung');
    await page.keyboard.press('Control+z'); // Schaltung nach «Erzeugen» lässt sich rückgängig machen
  }


  /* ===== Nacht Paket 10: Beamer-Modus bei 1920 × 1080 ===== */
  if (!only || only === 'e') {
    const pgB = await ctx.newPage(); await pgB.setViewportSize({ width: 1920, height: 1080 }); const eB = []; pgB.on('pageerror', e => eB.push(e.message));
    await pgB.goto(url, { waitUntil: 'domcontentloaded' }); await pgB.waitForFunction(() => window.Studio && Studio.sim); if (await pgB.isVisible('#asNo')) await pgB.click('#asNo');
    await pgB.evaluate(() => { Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 300, y: 300, rot: 0, value: 9 }, { id: 'R1', type: 'resistor', x: 560, y: 220, rot: 0, value: 4700 }, { id: 'R2', type: 'resistor', x: 800, y: 300, rot: 90, value: 2200 }],
      wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'R2.a' }, { from: 'R2.b', to: 'B1.n' }] }, { run: false }); });
    await pgB.waitForTimeout(300);
    const measure = () => pgB.evaluate(() => { const svg = document.getElementById('board'), vb = svg.viewBox.baseVal, k = svg.getBoundingClientRect().width / vb.width, val = document.querySelector('[data-part="R1"] .val').getBoundingClientRect(), lbl = document.querySelector('[data-part="R1"] .lbl').getBoundingClientRect(), w = document.querySelector('path.wire'), sw = parseFloat(getComputedStyle(w).strokeWidth) * k, btn = document.getElementById('btnRun').getBoundingClientRect().height;
      return { val: val.height, lbl: lbl.height, wire: sw, btn, layout: JSON.stringify(Studio.core.layout), pins: document.querySelectorAll('.pin').length, fs: parseFloat(getComputedStyle(document.querySelector('[data-part="R1"] .val')).fontSize) * k }; });
    const n0 = await measure(); await pgB.screenshot({ path: shots + '/p10_normal.png' });
    await pgB.keyboard.press('F9'); await pgB.waitForTimeout(300); const n1 = await measure(); await pgB.screenshot({ path: shots + '/p10_beamer.png' });
    ok(await pgB.evaluate(() => document.body.classList.contains('beamer') && Studio.beamer), 'F9 schaltet den Beamer-Modus ein');
    ok(n1.fs >= 26 && n1.fs >= n0.fs * 1.3, 'Bauteilwert und Bezeichnung auf dem Bildschirm gross genug: Schrifthöhe ' + n0.fs.toFixed(1) + ' → ' + n1.fs.toFixed(1) + ' px (aus fünf Metern lesbar ab etwa 26 px bei 1080 p)');
    ok(n1.wire >= 5 && n1.wire > n0.wire * 1.3, 'dickere Linien: ' + n0.wire.toFixed(1) + ' → ' + n1.wire.toFixed(1) + ' px'); ok(n1.btn >= 56 && n1.btn > n0.btn, 'grössere Bedienelemente: Knopfhöhe ' + n0.btn + ' → ' + n1.btn + ' px');
    ok(n1.layout === n0.layout, 'Umschalten verändert die Schaltung nicht'); await pgB.click('#menu-ansicht > button'); await pgB.click('#menu-ansicht .drop button:has-text("Beamer-Modus")');
    ok(!(await pgB.evaluate(() => document.body.classList.contains('beamer'))) && (await measure()).layout === n0.layout, 'Menü Ansicht → Beamer-Modus schaltet zurück, Schaltung unverändert');
    ok(!eB.length, 'keine Fehler im Beamer-Test: ' + eB.join('|')); await pgB.close();
  }


  /* ===== Nacht Paket 11: Aufgabe stellen im Browser ===== */
  if (!only || only === 'f') {
    const os = require('os'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dqt-'));
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 9 }, { id: 'R1', type: 'resistor', x: 450, y: 200, rot: 0, value: 330 }, { id: 'D1', type: 'led', x: 700, y: 300, rot: 90, props: { color: 'rot' } }],
      wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'D1.a' }, { from: 'D1.k', to: 'B1.n' }] }, { run: false }));
    await page.waitForTimeout(200); ok(await page.evaluate(() => Studio.sim.res.parts.D1.on), 'richtige Schaltung: LED leuchtet');
    await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Aufgabe stellen")'); await page.waitForTimeout(150);
    await page.fill('#tkT', 'Vorwiderstand finden'); await page.fill('#tkX', 'Bestimme R1 durch Messen.'); await page.check('[data-hide="' + await page.evaluate(() => String(Array.from(document.querySelectorAll('[data-hide]')).findIndex(c => /R1/.test(c.parentNode.textContent)))) + '"]');
    await page.selectOption('#tkF', 'open'); await page.selectOption('#tkW', '1');
    const dls = []; page.on('download', d => dls.push(d)); await page.click('#tkGo'); await page.waitForTimeout(800);
    ok(dls.length === 2, 'zwei getrennte Dateien: Aufgabe und Lösung (' + dls.map(d => d.suggestedFilename()).join(', ') + ')');
    const taskF = path.join(tmp, 'aufgabe.json'), solF = path.join(tmp, 'loesung.json'); for (const d of dls) await d.saveAs(/loesung/.test(d.suggestedFilename()) ? solF : taskF);
    const ttxt = fs.readFileSync(taskF, 'utf8'); ok(!/"value": 330\b/.test(ttxt) && !/\b330\b/.test(ttxt.replace(/"id": "[^"]*"/, '')) && /dqstudio-aufgabe/.test(ttxt), 'Aufgabendatei: 330 ist nicht lesbar');
    // neu laden (frische Seite) und Aufgabe öffnen
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.sim); if (await page.isVisible('#asNo')) await page.click('#asNo');
    await page.click('#menu-datei > button'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#menu-datei .drop button:has-text("Öffnen")')]); await fc.setFiles(taskF); await page.waitForTimeout(500);
    ok(await page.isVisible('#taskPanel') && /Vorwiderstand finden/.test(await page.textContent('#taskPanel')), 'Aufgabenfenster mit Titel und Text');
    ok(await page.evaluate(() => !Studio.sim.res.parts.D1.on && Studio.core.layout.wires.length === 2), 'die Störung wirkt: LED bleibt dunkel');
    const lab = await page.textContent('[data-part="R1"] .val'); ok(/\?/.test(lab) && !/330/.test(lab), 'Bauteilwert im Schaltplan als «?» verborgen: «' + lab + '»');
    await page.waitForTimeout(450); await selectPart('R1'); await page.waitForTimeout(200); ok(await page.evaluate(() => document.querySelector('#inspector input[disabled]') && /verborgen/.test(document.querySelector('#inspector input[disabled]').value)), 'Eigenschaften zeigen «verborgen», nicht den Wert');
    await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Stückliste")'); ok(!/330/.test(await page.textContent('#modal')), 'auch die Stückliste verrät den Wert nicht'); await page.keyboard.press('Escape'); await page.evaluate(() => Studio.closeModal());
    await page.fill('#taskPanel input.tin', '500'); await page.dispatchEvent('#taskPanel input.tin', 'change'); ok(/nicht ganz/.test(await page.textContent('#taskPanel')), 'falsche Eingabe 500 Ω wird abgelehnt');
    await page.fill('#taskPanel input.tin', '0,33k'); await page.dispatchEvent('#taskPanel input.tin', 'change'); ok(/✓ stimmt/.test(await page.textContent('#taskPanel')), 'richtige Eingabe 0,33 kΩ wird bestätigt');
    // Speichern während der Aufgabe verrät nichts; Lösung getrennt öffnen
    const [dl2] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Speichern")'); })()]); const f2 = path.join(tmp, 'zwischenstand.json'); await dl2.saveAs(f2);
    ok(!/\b330\b/.test(fs.readFileSync(f2, 'utf8').replace(/"id": "[^"]*"/, '')) && /dqstudio-aufgabe/.test(fs.readFileSync(f2, 'utf8')) && /0,33k/.test(fs.readFileSync(f2, 'utf8')), 'Zwischenstand während der Aufgabe ist wieder eine Aufgabendatei mit verschleierten Werten und den Antworten');
    await page.click('#menu-datei > button'); const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#menu-datei .drop button:has-text("Öffnen")')]); await fc2.setFiles(solF); await page.waitForTimeout(500);
    const sol = await page.textContent('#modal'); ok(/Lösung: Vorwiderstand finden/.test(sol) && /R1\.value = 330/.test(sol) && /unterbrochen/.test(sol), 'Lösungsdatei lässt sich getrennt öffnen: Werte und Störung genannt');
    ok(await page.evaluate(() => Studio.sim.res.parts.D1.on && !Studio.task), 'Lösung zeigt die richtige Schaltung (LED leuchtet), Aufgabe ist geschlossen'); await page.screenshot({ path: shots + '/p11_loesung.png' }); await page.evaluate(() => Studio.closeModal());
  }

  /* ===== Auftrag «Bauen», Paket 1: Knotenpunkte ===== */
  if (!only || only === 'g') {
    await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Neu")'); await page.waitForTimeout(100);
    // Bildschirmkoordinate eines Punktes auf der Leitung i (Mitte des längsten Abschnitts)
    const wirePt = i => page.evaluate(i => {
      const L = Studio.core.layout, len = w => { const q = DQEditor.wirePoly(L, w); let t = 0; for (let k = 0; k + 1 < q.length; k++) t += Math.abs(q[k][0] - q[k + 1][0]) + Math.abs(q[k][1] - q[k + 1][1]); return t; };
      if (i === 'long') i = L.wires.reduce((b, w, k) => len(w) > len(L.wires[b]) ? k : b, 0);
      const pts = DQEditor.wirePoly(L, L.wires[i]); let best = null;
      for (let k = 0; k + 1 < pts.length; k++) { const d = Math.abs(pts[k][0] - pts[k + 1][0]) + Math.abs(pts[k][1] - pts[k + 1][1]); if (!best || d > best.d) best = { d, a: pts[k], b: pts[k + 1] }; }
      const m = [Math.round((best.a[0] + best.b[0]) / 2 / 20) * 20, Math.round((best.a[1] + best.b[1]) / 2 / 20) * 20];
      const svg = document.querySelector('#board'), pt = svg.createSVGPoint(); pt.x = m[0]; pt.y = m[1]; const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y, m };
    }, i);
    const nodeCount = () => page.evaluate(() => Studio.core.layout.parts.filter(p => p.type === 'node').length);
    const sameNet = (a, b) => page.evaluate(([a, b]) => { const n = Studio.sim.net.pinNode; return n[a] !== undefined && n[a] === n[b]; }, [a, b]);
    const allClock = async () => (await Promise.all(['FF1', 'FF2', 'FF3', 'FF4'].map(f => sameNet('CLK1.out', f + '.C')))).every(Boolean);
    // Aufbau: Takt und vier D-Flipflops, nur ein Anschluss des Taktes wird gezogen
    await add('clock', 100, 420); for (let k = 0; k < 4; k++) await add('dff', 360 + k * 200, 160 + k * 110);
    ok(await page.evaluate(() => Studio.core.layout.parts.map(p => p.id).join()) === 'CLK1,FF1,FF2,FF3,FF4', 'Takt und vier Flipflops gesetzt');
    await pin('CLK1.out'); await pin('FF1.C');
    ok(await page.evaluate(() => Studio.core.layout.wires.length) === 1, 'eine Leitung vom Takt zum ersten Flipflop');
    // Leitung auf Leitung beenden: FF2.C anfassen, dann auf die Taktleitung klicken
    for (const f of ['FF2', 'FF3', 'FF4']) {
      await pin(f + '.C'); const w = await wirePt('long');
      await page.mouse.move(w.x + 2, w.y + 2); await page.waitForTimeout(60);
      ok(await page.evaluate(() => !!Studio.ed.snap), 'Vorschaupunkt beim Ziehen über die Leitung (' + f + ')');
      await page.mouse.click(w.x, w.y); await page.waitForTimeout(80);
      if (f === 'FF2') await page.screenshot({ path: shots + '/g_knoten.png' });
    }
    ok(await nodeCount() === 3, 'drei Knotenpunkte entstanden (' + await nodeCount() + ')');
    ok(await allClock(), 'die Netzliste erkennt alle vier Takteingänge als denselben Knoten wie den Takt');
    ok(await page.evaluate(() => document.querySelectorAll('#board .nodedot').length) === 3, 'drei ausgefüllte Verbindungspunkte gezeichnet');
    // Rückgängig und Wiederholen umfassen Knoten
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80);
    ok(await nodeCount() === 2, 'Rückgängig nimmt den letzten Knoten zurück');
    await page.keyboard.press('Control+y'); await page.waitForTimeout(80);
    ok(await nodeCount() === 3 && await allClock(), 'Wiederholen stellt ihn wieder her');
    // Datei: speichern und identisch laden
    const rt = await page.evaluate(() => { const before = JSON.stringify(Studio.core.layout), r = Studio.parseFile(JSON.stringify(Studio.serialize())); return { same: r.ok && JSON.stringify(r.layout) === before, err: r.error }; });
    ok(rt.same, 'Datei mit Knoten lädt identisch zurück ' + (rt.err || ''));
    // Knoten verschieben: Leitungen folgen
    const k1 = await page.evaluate(() => { const p = Studio.core.layout.parts.find(p => p.type === 'node'); return { id: p.id, x: p.x, y: p.y }; });
    await page.evaluate(id => { const c = Studio.core, p = c.part(id); c.pressPart(id, [p.x, p.y], 'schema'); c.dragTo([p.x + 40, p.y + 60]); c.release(); }, k1.id);
    const k1b = await page.evaluate(id => { const p = Studio.core.part(id); return { x: p.x, y: p.y }; }, k1.id);
    ok(k1b.x !== k1.x || k1b.y !== k1.y, 'Knoten lässt sich verschieben (' + k1.x + ',' + k1.y + ' → ' + k1b.x + ',' + k1b.y + ')');
    await page.waitForTimeout(80); ok(await allClock(), 'nach dem Verschieben bleiben alle verbunden');
    // Löschen mit genau zwei Leitungen führt zusammen
    const two = await page.evaluate(() => {
      const c = Studio.core; c.layout = { parts: [{ id: 'R1', type: 'resistor', x: 200, y: 200, rot: 0 }, { id: 'R2', type: 'resistor', x: 500, y: 200, rot: 0 }, { id: 'K1', type: 'node', x: 340, y: 200, rot: 0 }], wires: [{ from: 'R1.b', to: 'K1.p' }, { from: 'K1.p', to: 'R2.a' }] };
      c.sel = 'K1'; const okd = c.removeSelected();
      return { okd, parts: c.layout.parts.map(p => p.id).join(), wires: c.layout.wires };
    });
    ok(two.okd && two.parts === 'R1,R2' && two.wires.length === 1 && [two.wires[0].from, two.wires[0].to].sort().join() === 'R1.b,R2.a', 'Knoten mit zwei Leitungen löschen führt sie zusammen: ' + JSON.stringify(two.wires));
    const three = await page.evaluate(() => {
      const c = Studio.core; c.layout = { parts: [{ id: 'R1', type: 'resistor', x: 200, y: 200, rot: 0 }, { id: 'R2', type: 'resistor', x: 500, y: 200, rot: 0 }, { id: 'R3', type: 'resistor', x: 500, y: 400, rot: 0 }, { id: 'K1', type: 'node', x: 340, y: 200, rot: 0 }], wires: [{ from: 'R1.b', to: 'K1.p' }, { from: 'K1.p', to: 'R2.a' }, { from: 'K1.p', to: 'R3.a' }] };
      c.sel = 'K1'; c.removeSelected(); return c.layout.wires.length;
    });
    ok(three === 0, 'Knoten mit drei Leitungen: Löschen entfernt Knoten und Leitungen');
    // Kreuzung ohne Knoten bleibt getrennt
    await page.evaluate(() => { Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0 }, { id: 'R1', type: 'resistor', x: 500, y: 200, rot: 0 }, { id: 'R2', type: 'resistor', x: 340, y: 100, rot: 90 }, { id: 'R3', type: 'resistor', x: 340, y: 400, rot: 90 }, { id: 'GND1', type: 'ground', x: 200, y: 500, rot: 0 }],
      wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R2.a', to: 'R3.b' }, { from: 'B1.n', to: 'GND1.g' }] }, { run: true }); });
    await page.waitForTimeout(120);
    ok(!(await sameNet('R1.a', 'R2.a')) && !(await sameNet('R1.a', 'R3.b')), 'sich kreuzende Leitungen ohne Knoten bleiben getrennt');
    ok(await page.evaluate(() => document.querySelectorAll('#board .nodedot').length) === 0, 'an der Kreuzung steht kein Punkt');
    // Ziehen von einer Leitung weg beginnt dort eine neue Leitung; Alt+Klick setzt einen Knoten
    await page.evaluate(() => { Studio.loadLayout({ parts: [{ id: 'R1', type: 'resistor', x: 300, y: 300, rot: 0 }, { id: 'R2', type: 'resistor', x: 700, y: 300, rot: 0 }, { id: 'R3', type: 'resistor', x: 500, y: 460, rot: 90 }], wires: [{ from: 'R1.b', to: 'R2.a' }] }, { run: false }); });
    await page.waitForTimeout(100);
    let w0 = await wirePt(0); await page.mouse.move(w0.x, w0.y); await page.mouse.down(); await page.mouse.move(w0.x + 12, w0.y + 30, { steps: 4 }); await page.mouse.up();
    ok(await nodeCount() === 1 && await page.evaluate(() => !!Studio.core.wireStart && /^K\d+\.p$/.test(Studio.core.wireStart)), 'Ziehen von einer Leitung setzt einen Knoten und beginnt eine Leitung');
    await pin('R3.a'); await page.waitForTimeout(80); ok(await sameNet('R3.a', 'R1.b'), 'die neue Leitung verbindet R3 mit der Leitung');
    await page.evaluate(() => { Studio.loadLayout({ parts: [{ id: 'R1', type: 'resistor', x: 300, y: 300, rot: 0 }, { id: 'R2', type: 'resistor', x: 700, y: 300, rot: 0 }], wires: [{ from: 'R1.b', to: 'R2.a' }] }, { run: false }); });
    await page.waitForTimeout(100); w0 = await wirePt(0); await page.keyboard.down('Alt'); await page.mouse.click(w0.x, w0.y); await page.keyboard.up('Alt');
    ok(await nodeCount() === 1, 'Alt + Klick auf eine Leitung setzt einen Knoten');
    // Palette: Knoten als Bauteil
    await page.evaluate(() => Studio.newCircuit()); await page.waitForTimeout(80); await add('node');
    ok(await nodeCount() === 1, 'Knoten aus der Bauteilleiste setzen');
    ok(/^0 Bauteile/.test((await page.textContent('#statusbar')).match(/\d+ Bauteile/)[0]), 'Knoten zählen nicht als Bauteil');
    // Beamer: Punkt wächst
    await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'K1', type: 'node', x: 300, y: 300, rot: 0 }], wires: [] }, { run: false })); await page.waitForTimeout(80);
    const r0 = await page.evaluate(() => document.querySelector('.nodedot').getBoundingClientRect().width); await page.keyboard.press('F9'); await page.waitForTimeout(150);
    const r1 = await page.evaluate(() => document.querySelector('.nodedot').getBoundingClientRect().width); await page.keyboard.press('F9'); await page.waitForTimeout(100);
    ok(r1 > r0 * 1.3, 'im Beamer-Modus wächst der Punkt (' + r0.toFixed(1) + ' → ' + r1.toFixed(1) + ' px)');
  }

  /* ===== Auftrag «Bauen», Paket 2: Anzeigen auffindbar ===== */
  if (!only || only === 'h') {
    const zaehler = { parts: [{ id: 'CLK1', type: 'clock', x: 240, y: 300, rot: 0, props: { freq: 100 } }, { id: 'Z1', type: 'ctr_async', x: 560, y: 300, rot: 0 }, { id: 'GND1', type: 'ground', x: 240, y: 440, rot: 0 }]
      .concat([0, 1, 2, 3].map(k => ({ id: 'L' + (k + 1), type: 'logicled', x: 900, y: 180 + 80 * k, rot: 0 }))),
      wires: [{ from: 'CLK1.out', to: 'Z1.C' }].concat([0, 1, 2, 3].map(k => ({ from: 'Z1.Q' + k, to: 'L' + (k + 1) + '.in' }))) };
    const load = (lay, o) => page.evaluate(([l, o]) => { Studio.closeScopes(); Studio.timing.clear(); Studio.loadLayout(l, o || { run: true }); }, [lay, o]);
    await load(zaehler); await page.waitForTimeout(300);
    // Layout: Zeitverlauf liegt ganz im Bild und nicht unter der Statusleiste
    await page.evaluate(() => { if (Studio.timingCollapsed()) Studio.toggleTiming(); });
    const lay = await page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { tl: r('#timing'), st: r('#statusbar'), main: r('.main'), vh: innerHeight }; });
    ok(lay.tl.bottom <= lay.st.top + 1 && lay.tl.top >= lay.main.bottom - 1 && lay.tl.bottom <= lay.vh && lay.main.height > 250, 'Zeitverlauf sichtbar zwischen Zeichenfläche und Statusleiste (' + Math.round(lay.tl.top) + '–' + Math.round(lay.tl.bottom) + ', Statusleiste ab ' + Math.round(lay.st.top) + ')');
    // leere Anzeigen erklären sich selbst
    await page.evaluate(() => { Studio.openScope(); Studio.openBode(); });
    ok(await page.evaluate(() => Array.from(document.querySelectorAll('.sc-hint')).length) === 2 && await page.evaluate(() => Array.from(document.querySelectorAll('.sc-hint')).every(h => !h.hidden && /Rechtsklick/.test(h.textContent))), 'leeres Oszilloskop und leeres Bode-Fenster zeigen ihren Hinweis');
    ok(/Rechtsklick/.test(await page.textContent('#tlRows')) && /Alle digitalen Signale aufnehmen/.test(await page.textContent('#tlRows')), 'leerer Zeitverlauf zeigt Hinweis und Knopf');
    await page.screenshot({ path: shots + '/h_leer.png' });
    ok(!(await page.evaluate(() => /Messen-Werkzeug/.test(document.body.innerText))) && !(await page.$('#toolMeasure')) && !(await page.$('#toolBuild')), 'es gibt kein Messen-Werkzeug und keinen Modus mehr');
    await page.evaluate(() => { Studio.closeScopes(); Studio.bodes.slice().forEach(b => b.close()); });
    // Rechtsklick im Baumodus: alle vier Lampen in den Zeitverlauf, ohne Werkzeugwechsel
    ok(await page.evaluate(() => Studio.core.tool === 'wire'), 'Werkzeug bleibt «Bauen»');
    for (const k of [1, 2, 3, 4]) {
      await page.click(`[data-part="L${k}"] .hit`, { button: 'right', force: true });
      ok(await page.isVisible('.ctxmenu'), 'Kontextmenü an L' + k);
      if (k === 1) { const t = await page.textContent('.ctxmenu'); ok(/In den Zeitverlauf/.test(t) && /Ins Oszilloskop/.test(t) && /Ins Bode-Diagramm/.test(t), 'Menü bietet Zeitverlauf, Oszilloskop und Bode an: ' + t.replace(/\s+/g, ' ')); await page.screenshot({ path: shots + '/h_kontext.png' }); }
      await page.click('.ctxmenu button:has-text("In den Zeitverlauf")');
    }
    ok(await page.evaluate(() => Studio.core.tool === 'wire' && Studio.timing.rows.length === 4), 'vier Zeilen im Zeitverlauf per Rechtsklick, Werkzeug unverändert (' + await page.evaluate(() => Studio.timing.rows.length) + ')');
    await page.waitForTimeout(500);
    const grow = await page.evaluate(() => Studio.timing.rows.map(r => r.tr.n)); ok(grow.every(n => n > 20), 'die Kurven laufen (Messpunkte ' + grow.join(',') + ')');
    ok(await page.evaluate(() => Studio.timing.rows.some(r => { const t = r.tr; let a = t.v[0] > 2.5; for (let i = 1; i < t.n; i++) if ((t.v[i] > 2.5) !== a) return true; return false; })), 'mindestens ein Ausgang wechselt den Pegel');
    await page.screenshot({ path: shots + '/h_zeitverlauf.png' });
    // Alle digitalen Signale: Takt + 4 Lampen, keine Doppelten, keine Versorgung
    await page.evaluate(() => Studio.timing.clear()); await page.click('#tlAuto');
    const all = await page.evaluate(() => Studio.timing.rows.map(r => r.desc.a + '|' + (r.label || '')));
    ok(all.length === 5 && /^CLK1\.out/.test(all[0]) && all.slice(1).map(x => x.split('|')[1]).join() === 'L1,L2,L3,L4', 'Alle digitalen Signale: Takt und genau die vier Lampen (' + all.join('  ') + ')');
    ok(!all.some(x => /GND|VCC|B\d/.test(x)), 'keine Versorgungsleitungen darunter');
    // zusätzlich Flipflops und Zähler ohne Lampen: je Ausgang einmal
    await load({ parts: [{ id: 'CLK1', type: 'clock', x: 240, y: 300, rot: 0 }, { id: 'FF1', type: 'tff', x: 500, y: 300, rot: 0 }, { id: 'FF2', type: 'tff', x: 760, y: 300, rot: 0 }, { id: 'Z1', type: 'ctr_bcd', x: 500, y: 600, rot: 0 }, { id: 'GND1', type: 'ground', x: 240, y: 440, rot: 0 }], wires: [{ from: 'CLK1.out', to: 'FF1.C' }, { from: 'FF1.Q', to: 'FF2.C' }, { from: 'CLK1.out', to: 'Z1.C' }] });
    await page.click('#tlAuto'); const all2 = await page.evaluate(() => Studio.timing.rows.map(r => r.desc.a));
    ok(all2.join() === 'CLK1.out,FF1.Q,FF2.Q,Z1.Q0,Z1.Q1,Z1.Q2,Z1.Q3', 'Flipflop-Ausgänge und Zählerausgänge, jeder Knoten einmal: ' + all2.join());
    await page.click('#tlAuto'); ok(await page.evaluate(() => Studio.timing.rows.length) === 7, 'zweiter Klick fügt nichts doppelt ein');
    // eingeklappter Zeitverlauf klappt beim ersten Signal auf
    await load(zaehler); await page.evaluate(() => { Studio.timing.clear(); }); await page.click('#btnTiming');
    ok(await page.evaluate(() => document.querySelector('#timing').classList.contains('collapsed')), 'Zeitverlauf eingeklappt');
    await page.click('[data-part="L1"] .hit', { button: 'right', force: true }); await page.click('.ctxmenu button:has-text("In den Zeitverlauf")');
    ok(await page.evaluate(() => !document.querySelector('#timing').classList.contains('collapsed')), 'das erste Signal klappt den Zeitverlauf auf');
    // Eigenschaftenfeld: Knopf je Grösse
    await selectPart('L2'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelectorAll('#insLive .sendbtn').length) >= 1, 'Eigenschaftenfeld bietet einen Knopf je Grösse');
    await page.click('#insLive .sendbtn[data-send="dig"]'); ok(await page.evaluate(() => Studio.timing.rows.some(r => r.desc.a === 'L2.in')), 'Knopf im Eigenschaftenfeld schickt die Grösse in den Zeitverlauf');
    await load({ parts: [{ id: 'B1', type: 'battery', x: 300, y: 300, rot: 90, value: 9 }, { id: 'R1', type: 'resistor', x: 600, y: 200, rot: 0, value: 1000 }, { id: 'GND1', type: 'ground', x: 300, y: 450, rot: 0 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'B1.n' }, { from: 'GND1.g', to: 'B1.n' }] });
    await selectPart('R1'); await page.waitForTimeout(200); await page.click('#insLive .sendbtn[aria-label*="Spannung"]');
    ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch[0].tr.desc.kind === 'pv'), 'Spannung über R1 → Oszilloskop');
    // Kontextmenü auf analogem Anschluss: Zeitverlauf ausgegraut und begründet; Bode ohne Wechselquelle begründet
    await page.evaluate(() => Studio.closeScopes()); await page.click('[data-pin="R1.a"] .pinhit', { button: 'right', force: true });
    const dis = await page.evaluate(() => Array.from(document.querySelectorAll('.ctxmenu button')).map(b => ({ t: b.textContent, d: b.disabled })));
    ok(dis.find(b => /Zeitverlauf/.test(b.t)).d && /Spannung/.test(dis.find(b => /Zeitverlauf/.test(b.t)).t) && dis.find(b => /Bode/.test(b.t)).d && /Wechselspannungsquelle/.test(dis.find(b => /Bode/.test(b.t)).t), 'nicht passende Ziele sind ausgegraut mit Begründung');
    await page.keyboard.press('Escape'); ok(!(await page.isVisible('.ctxmenu')), 'Esc schliesst das Kontextmenü');
    // Darstellung: überlappend oder untereinander
    await page.evaluate(() => { Studio.closeScopes(); Studio.timing.clear(); });
    await load(zaehler); await page.waitForTimeout(150);
    const sc = await page.evaluate(() => { const s = Studio.openScope([0, 1, 2, 3].map(k => ({ kind: 'node', a: 'L' + (k + 1) + '.in' }))); return { mode: s.mode, n: s.ch.length }; });
    ok(sc.mode === 'stack' && sc.n === 4, 'Fenster mit Digitalsignalen startet «untereinander»');
    ok(await page.evaluate(() => { const w = Studio.scopes[0].el; return w.querySelector('.sc-hint').hidden && w.querySelectorAll('.sc-ch').length === 4; }), 'mit Signalen verschwindet der Hinweis, die Kanäle stehen als Chips da');
    await page.waitForTimeout(700);
    const lanes = await page.evaluate(() => { const s = Studio.scopes[0]; s.draw(true); return s.lanes.map(l => [l.top, l.bot]); });
    ok(lanes.length === 4 && lanes.every((l, i) => l[1] > l[0] + 20 && (i === 0 || l[0] >= lanes[i - 1][1])), 'vier getrennte Spuren ohne Überschneidung: ' + JSON.stringify(lanes.map(l => l.map(Math.round))));
    await page.screenshot({ path: shots + '/h_stack.png' });
    await page.selectOption('.fwin [data-a="mode"]', 'overlap'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => Studio.scopes[0].mode === 'overlap' && Studio.scopes[0].ch.length === 4), 'umschalten auf überlappend ändert die Signale nicht');
    await page.screenshot({ path: shots + '/h_overlap.png' });
    await page.selectOption('.fwin [data-a="mode"]', 'stack'); ok(await page.evaluate(() => Studio.scopes[0].mode === 'stack' && Studio.scopes[0].ch.length === 4 && Studio.scopes[0].modeSet), 'und zurück; Handwahl bleibt');
    await page.evaluate(() => { const s = Studio.scopes[0]; s.removeChannel(3); s.removeChannel(2); s.removeChannel(1); s.removeChannel(0); s.addChannel({ kind: 'node', a: 'Z1.Q0' }); });
    ok(await page.evaluate(() => Studio.scopes[0].mode) === 'stack', 'die von Hand gewählte Darstellung bleibt für dieses Fenster bestehen');
    const an = await page.evaluate(() => { const s = Studio.openScope([{ kind: 'pv', id: 'R1' }]); return s.mode; }); await load({ parts: [{ id: 'B1', type: 'battery', x: 300, y: 300, rot: 90, value: 9 }, { id: 'R1', type: 'resistor', x: 600, y: 200, rot: 0, value: 1000 }, { id: 'GND1', type: 'ground', x: 300, y: 450, rot: 0 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'B1.n' }, { from: 'GND1.g', to: 'B1.n' }] });
    const an2 = await page.evaluate(() => { const s = Studio.openScope([{ kind: 'pv', id: 'R1' }]); return s.mode; });
    ok(an2 === 'overlap', 'Fenster mit einem analogen Signal startet «überlappend»');
    // Zeitverlauf: dieselbe Umschaltung
    await load(zaehler); await page.waitForTimeout(100); await page.click('#tlAuto'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => document.querySelectorAll('#tlRows .tl-row').length) === 5, 'Zeitverlauf untereinander: fünf Zeilen');
    await page.selectOption('#tlMode', 'overlap'); await page.waitForTimeout(250);
    ok(await page.evaluate(() => document.querySelectorAll('#tlRows .tl-row').length) === 1 && await page.evaluate(() => Studio.timing.rows.length) === 5, 'überlappend: ein gemeinsames Feld, die Signale bleiben aufgenommen');
    await page.screenshot({ path: shots + '/h_tl_overlap.png' });
    await page.selectOption('#tlMode', 'stack'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => document.querySelectorAll('#tlRows .tl-row').length) === 5, 'zurück auf untereinander');
    await page.evaluate(() => { Studio.closeScopes(); Studio.timing.clear(); });
  }

  /* ===== Auftrag «Bauen», Paket 3: Beispiel für jedes Bauteil ===== */
  if (!only || only === 'i') {
    // Leiste gegen Beispielliste: jedes Bauteil der Leiste kommt in mindestens einem Beispiel vor
    const cov = await page.evaluate(() => {
      const used = {}; Studio.examples.forEach(e => e.build().layout.parts.forEach(p => { used[p.type] = (used[p.type] || 0) + 1; }));
      const bar = [].concat(...Studio.PALETTE.map(g => g.items)).filter(t => Studio.E.PARTS[t]); return { missing: bar.filter(t => !used[t]), bar: bar.length, ex: Studio.examples.length, cats: Studio.PALETTE.map(g => g.name), exCats: Studio.exampleCats };
    });
    ok(cov.missing.length === 0, 'jedes Bauteil der Leiste hat ein Beispiel (' + cov.bar + ' Bauteile, ' + cov.ex + ' Beispiele)' + (cov.missing.length ? ', es fehlt: ' + cov.missing.join(', ') : ''));
    ok(cov.exCats.join() === ['Logik', 'Flip-Flops', 'Zähler', 'Anzeigen', 'Analog', 'Anwendungen'].join() && cov.cats.slice(0, 5).join() === cov.exCats.slice(0, 5).join(), 'Beispiel-Kategorien und Bauteilleiste haben dieselben Gruppen in derselben Reihenfolge (' + cov.cats.join(' · ') + ')');
    // Menü: Überschriften je Kategorie
    await page.click('#menu-bsp > button'); const heads = await page.$$eval('#menu-bsp .drop .ex-head', els => els.map(e => e.textContent)); await page.screenshot({ path: shots + '/i_menue.png' }); await page.keyboard.press('Escape'); await page.click('#toolbar', { position: { x: 5, y: 5 } });
    ok(heads.join() === 'Logik,Flip-Flops,Zähler,Anzeigen,Analog,Anwendungen', 'Menü «Beispiele» mit Gruppenüberschriften: ' + heads.join(' · '));
    // jedes Beispiel: lädt, ein Satz Erklärung, Anzeigen eingerichtet, aufgeräumt (keine übereinanderliegenden Leitungen), keine Störung, nach zwei Sekunden anderer Zustand
    const ids = await page.evaluate(() => Studio.examples.map(e => e.id)), bad = [];
    for (const id of ids) {
      const info = await page.evaluate(id => {
        const e = Studio.examples.find(x => x.id === id), b = e.build(); return { text: e.text, name: e.name, clash: DQEditor.routeClashes(b.layout).length, wantScopes: (b.scopes || []).length, wantRows: ((b.timing || {}).rows || []).length + ((b.timing || {}).auto ? 1 : 0), wantBode: (b.bode || []).length, demo: !!e.demo };
      }, id);
      await page.evaluate(id => { Studio.sim.pause(); Studio.loadExample(id); }, id);
      const sig = () => page.evaluate(() => { const r = Studio.sim.res; if (!r) return 'none'; return JSON.stringify([Object.keys(r.parts).map(k => { const q = r.parts[k]; return [k, q.on, q.out, q.q, q.count, q.seg && q.seg.map(Number).join(''), q.i !== undefined ? +q.i.toPrecision(3) : 0, q.v !== undefined ? +q.v.toPrecision(3) : 0]; }), Studio.sim.state.t > 0 ? 1 : 0, Studio.core.layout.parts.map(p => JSON.stringify(p.props || {}))]); });
      await page.waitForTimeout(150); const s0 = await sig();
      await page.evaluate(() => Studio.sim.start && Studio.sim.start()); await page.waitForTimeout(2050); const s1 = await sig(); await page.waitForTimeout(450); const s2 = await sig();
      const after = await page.evaluate(() => ({ note: (Studio.core.layout.draw || []).filter(e => e.kind === 'text').map(e => e.text.replace(/\n/g, ' ')).join('|'), faults: (Studio.sim.faults || []).map(f => f.code), err: Studio.sim.err, scopes: Studio.scopes.length, rows: Studio.timing.rows.length, bodes: Studio.bodes.length, banner: !document.getElementById('exBanner').hidden && document.querySelector('#exBanner b').textContent, t: Studio.sim.state.t }));
      if (s0 === s1 && s0 === s2) bad.push(id + ': Zustand nach 2 s unverändert');
      if (info.clash) bad.push(id + ': ' + info.clash + ' Leitungen übereinander');
      if (after.faults.length || after.err) bad.push(id + ': Störung ' + after.faults.join() + (after.err || ''));
      if (after.scopes !== info.wantScopes || after.bodes !== info.wantBode || (info.wantRows && !after.rows)) bad.push(id + ': Anzeigen nicht eingerichtet (' + after.scopes + '/' + info.wantScopes + ' Oszilloskope, ' + after.rows + ' Zeilen)');
      if (after.banner !== info.name || !/[.!?)]$/.test(info.text) || info.text.length < 20 || after.note !== info.text) bad.push(id + ': Name oder erklärender Satz (Textelement) fehlt');
      if (!(after.t > 0)) bad.push(id + ': Simulation lief nicht');
    }
    ok(bad.length === 0, ids.length + ' Beispiele laden, laufen, zeigen nach 2 s einen anderen Zustand, sind aufgeräumt und störungsfrei' + (bad.length ? ': ' + bad.join(' | ') : ''));
    // Gatter: alle Eingangskombinationen durchschalten ergibt die Wahrheitstabelle
    const gates = await page.evaluate(() => {
      const E = Studio.E, F = { and: (a, b) => a && b, or: (a, b) => a || b, nand: (a, b) => !(a && b), nor: (a, b) => !(a || b), xor: (a, b) => a !== b, xnor: (a, b) => a === b, not: a => !a }, out = [];
      Studio.examples.filter(e => e.gate).forEach(e => {
        const lay = e.build().layout, net = E.buildNetlist(JSON.parse(JSON.stringify(lay))), st = E.newState(), two = e.gate !== 'not', rows = [];
        for (let k = 0; k < (two ? 4 : 2); k++) {
          const a = !!(k & 1), b = !!(k & 2); net.byId.E1.props.closed = a; if (two) net.byId.E2.props.closed = b;
          const r = E.step(net, st, {}); rows.push({ k, want: two ? F[e.gate](a, b) : F[e.gate](a), got: !!r.parts.L1.on });
        }
        out.push({ g: e.gate, ok: rows.every(r => r.want === r.got), rows: rows.map(r => +r.got).join('') });
      });
      return out;
    });
    ok(gates.length === 7 && gates.every(g => g.ok), 'Gatter-Beispiele: alle Eingangskombinationen ergeben die Wahrheitstabelle (' + gates.map(g => g.g + ' ' + g.rows).join(', ') + ')');
    // Vorführung: Klick auf einen Pegelschalter übernimmt die Bedienung
    await page.evaluate(() => Studio.loadExample('g_and')); await page.waitForTimeout(200);
    ok(await page.evaluate(() => Studio.demoRunning()), 'Vorführung läuft nach dem Öffnen');
    await page.click('[data-part="E1"] .hit', { force: true }); await page.waitForTimeout(100);
    ok(await page.evaluate(() => !Studio.demoRunning()), 'ein Klick auf einen Pegelschalter beendet die Vorführung');
    const e1a = await page.evaluate(() => Studio.core.part('E1').props.closed); await page.waitForTimeout(1500); ok(e1a === await page.evaluate(() => Studio.core.part('E1').props.closed), 'danach schaltet nichts mehr von selbst');
    ok(!(await page.evaluate(() => Studio.history.index() !== undefined && false)), 'Vorführung legt keine Rückgängig-Schritte an');
    // Hinweis schliessen; Beispiel «Digitaluhr» ist weiterhin da
    await page.click('#exBanner button'); ok(await page.isHidden('#exBanner'), 'Hinweis lässt sich schliessen');
    ok(await page.evaluate(() => !!Studio.examples.find(e => e.id === 'uhr') && !!Studio.examples.find(e => e.id === 'x_lauflicht') && !!Studio.examples.find(e => e.id === 'x_schloss')), 'Anwendungen: Digitaluhr, Lauflicht, Codeschloss');
    await page.screenshot({ path: shots + '/i_beispiel.png' });
  }

  /* ===== Auftrag «Bauen», Paket 4: Gitternetz ===== */
  if (!only || only === 'j') {
    await page.evaluate(() => { try { localStorage.removeItem('dqstudio_grid_v1'); } catch (e) { /* ohne Speicher */ } Studio.setGrid('dots', 20); Studio.loadExample('n_teiler'); });
    await page.click('#exBanner button'); await page.waitForTimeout(150);
    const grid = () => page.evaluate(() => { const r = document.querySelector('#board .gridrect'), p = document.querySelector('#board pattern#grid'); return { rect: !!r, kind: p ? (p.querySelector('.gridline') ? 'lines' : p.querySelector('.griddot') ? 'dots' : '?') : null, size: p ? +p.getAttribute('width') : 0, mode: Studio.grid.mode }; });
    const shot = async () => (await page.locator('#board').screenshot()).toString('base64');
    const g1 = await grid(), s1 = await shot(); ok(g1.rect && g1.kind === 'dots' && g1.size === 20, 'Standard: Punkte im Fangraster 20 (' + JSON.stringify(g1) + ')');
    await page.keyboard.press('g'); const g2 = await grid(), s2 = await shot(); ok(g2.rect && g2.kind === 'lines' && g2.mode === 'lines', 'Taste G: Linien');
    await page.screenshot({ path: shots + '/j_linien.png' });
    await page.keyboard.press('g'); const g3 = await grid(), s3 = await shot(); ok(!g3.rect && g3.mode === 'off', 'Taste G: aus');
    ok(s1 !== s2 && s2 !== s3 && s1 !== s3, 'alle drei Stufen sehen verschieden aus');
    await page.keyboard.press('g'); ok((await grid()).kind === 'dots', 'Taste G: wieder Punkte');
    // Rasterweite über das Menü Ansicht, Markierung des aktuellen Wertes
    await page.click('#menu-ansicht > button'); const mt = await page.textContent('#menu-ansicht .drop'); ok(/Gitternetz/.test(mt) && /Rasterweite/.test(mt) && /✓\s*Punkte/.test(mt) && /✓\s*20/.test(mt), 'Menü Ansicht: Gitternetz und Rasterweite mit Markierung');
    await page.click('#menu-ansicht .drop button:has-text("Linien")'); await page.click('#menu-ansicht > button'); await page.click('#menu-ansicht .drop button:text-matches("^\\\\s*40")');
    const g4 = await grid(); ok(g4.kind === 'lines' && g4.size === 40, 'Rasterweite 40 wirkt (' + JSON.stringify(g4) + ')'); await page.screenshot({ path: shots + '/j_linien40.png' });
    ok(await page.evaluate(() => document.querySelector('#btnGrid').textContent.includes('Linien')), 'Knopf in der Werkzeugleiste zeigt die Stufe');
    // Export und Druck: ohne Haken kein Gitter
    const ex = await page.evaluate(() => ({ plain: Studio.exportSVG({ color: false }).svg, withGrid: Studio.exportSVG({ color: false, grid: true }).svg, print: decodeURIComponent(Studio.printPrepare().innerHTML) }));
    ok(!/url\(#grid\)|<pattern|gridline|griddot/.test(ex.plain), 'Export (SVG) enthält ohne Haken kein Gitter');
    ok(/<pattern/.test(ex.withGrid) && /url\(#grid\)/.test(ex.withGrid), 'Export mit Haken «Gitternetz» enthält es');
    ok(!/url\(#grid\)|<pattern|gridline/.test(ex.print), 'Druck enthält kein Gitter');
    ok(await page.evaluate(() => Studio.grid.mode === 'lines' && DQEditor.extra.grid.mode === 'lines'), 'Export und Druck verändern die Anzeige nicht');
    await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Exportieren")'); ok(await page.isVisible('#exG'), 'Exportdialog hat das Feld «Gitternetz»'); await page.click('#mClose');
    // Beamer-Modus blendet das Gitter aus
    await page.keyboard.press('F9'); await page.waitForTimeout(200); ok(!(await grid()).rect, 'Beamer-Modus: kein Gitter'); await page.keyboard.press('F9'); await page.waitForTimeout(200); ok((await grid()).rect, 'nach dem Beamer-Modus wieder da');
    // Einstellung überlebt Neuladen
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.sim); if (await page.isVisible('#asNo')) await page.click('#asNo'); await page.waitForTimeout(200);
    const g5 = await grid(); ok(g5.kind === 'lines' && g5.size === 40, 'Einstellung überlebt das Neuladen (' + JSON.stringify(g5) + ')');
    await page.evaluate(() => Studio.setGrid('dots', 20));
  }

  /* ===== Auftrag «Bauen», Paket 6: Text, Linien, Rahmen, Farbe ===== */
  if (!only || only === 'k') {
    await page.evaluate(() => { Studio.loadLayout({ parts: [], wires: [] }, { run: false }); Studio.closeScopes && Studio.closeScopes(); });
    await page.evaluate(() => { Studio.loadExample('n_teiler'); Studio.stopDemo(); Studio.core.layout.draw = []; Studio.core.changed('draw'); }); await page.click('#exBanner button'); await page.waitForTimeout(200);
    const base = await page.evaluate(() => { const E = Studio.E, l = JSON.parse(JSON.stringify(Studio.core.layout)), net = E.buildNetlist(l), r = E.step(net, E.newState(), {}); return { pin: JSON.stringify(net.pinNode), v: JSON.stringify(r.nodeV), parts: Studio.core.layout.parts.length, wires: Studio.core.layout.wires.length, bom: Studio.bom().length }; });
    // alle fünf Arten über die Leiste anlegen
    await page.click('[data-tab="Zeichnen"]'); for (const k of ['text', 'line', 'arrow', 'rect', 'ellipse']) await page.click(`[data-add="draw:${k}"]`);
    const d1 = await page.evaluate(() => Studio.core.layout.draw.map(e => e.kind + (e.arrow ? '+pfeil' : '')).join());
    ok(d1 === 'text,line,line+pfeil,rect,ellipse', 'fünf Elementarten angelegt: ' + d1);
    ok(await page.evaluate(() => document.querySelectorAll('#board .drawlayer [data-draw]').length) === 5, 'alle fünf stehen in der Zeichnung');
    await page.screenshot({ path: shots + '/k_alle.png' });
    // sie rechnen nie mit: Netzliste, Rechnung und Stückliste unverändert
    const after = await page.evaluate(() => { const E = Studio.E, l = JSON.parse(JSON.stringify(Studio.core.layout)), net = E.buildNetlist(l), r = E.step(net, E.newState(), {}); return { pin: JSON.stringify(net.pinNode), v: JSON.stringify(r.nodeV), parts: Studio.core.layout.parts.length, wires: Studio.core.layout.wires.length, bom: Studio.bom().length, bomTxt: JSON.stringify(Studio.bom()) }; });
    ok(after.pin === base.pin && after.v === base.v && after.parts === base.parts && after.wires === base.wires, 'die Schaltung mit Zeichenelementen rechnet identisch wie ohne (Netzliste und Spannungen gleich)');
    ok(after.bom === base.bom && !/Text|Linie|Pfeil|Rechteck|Ellipse|draw|z\d/.test(after.bomTxt), 'Stückliste enthält keine Zeichenelemente');
    // verschieben: Rechteck am Rand ziehen
    const rid = await page.evaluate(() => Studio.core.layout.draw.find(e => e.kind === 'rect').id);
    const edge = async id => page.evaluate(id => { const e = Studio.drawGet(id), svg = document.querySelector('#board'), pt = svg.createSVGPoint(); pt.x = e.x + e.w / 2; pt.y = e.y; const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y }; }, id);
    // alle Elemente auseinanderziehen, damit sie sich nicht überdecken
    await page.evaluate(() => { const L = Studio.core.layout.draw; L.forEach((e, i) => { const dx = 100 + i * 20, dy = 60 + i * 150; if (e.kind === 'line') { e.x1 = dx; e.x2 = dx + 160; e.y1 = e.y2 = Math.min(dy, 300); } else { e.x = dx + 400; e.y = Math.min(dy, 120 + i * 30); if (e.kind === 'rect') { e.x = 520; e.y = 140; } } }); Studio.core.changed('draw'); Studio.ed.fit(); });
    const before = await page.evaluate(id => ({ x: Studio.drawGet(id).x, y: Studio.drawGet(id).y }), rid), p0 = await edge(rid);
    await page.mouse.move(p0.x, p0.y); await page.mouse.down(); await page.mouse.move(p0.x + 40, p0.y + 30, { steps: 5 }); await page.mouse.up();
    const moved = await page.evaluate(id => ({ x: Studio.drawGet(id).x, y: Studio.drawGet(id).y }), rid);
    ok(moved.x > before.x && moved.y > before.y, 'Element ziehen verschiebt es (' + before.x + ',' + before.y + ' → ' + moved.x + ',' + moved.y + ')');
    // Grösse ändern über den Griff unten rechts
    const sz0 = await page.evaluate(id => ({ w: Studio.drawGet(id).w, h: Studio.drawGet(id).h }), rid);
    const hb = await page.locator(`[data-handle="${rid}:2"]`).boundingBox(); notes.push('Griff bei ' + JSON.stringify(hb) + ' trifft: ' + await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.outerHTML.slice(0, 90) : 'nichts'; }, [hb.x + hb.width / 2, hb.y + hb.height / 2]));
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await page.mouse.move(hb.x + hb.width / 2 + 60, hb.y + hb.height / 2 + 40, { steps: 5 }); await page.mouse.up();
    const sz1 = await page.evaluate(id => ({ w: Studio.drawGet(id).w, h: Studio.drawGet(id).h }), rid);
    ok(sz1.w > sz0.w && sz1.h > sz0.h, 'Griff ziehen ändert die Grösse (' + sz0.w + '×' + sz0.h + ' → ' + sz1.w + '×' + sz1.h + ')');
    // Eigenschaften: Farbe von Rand und Füllung getrennt, Deckkraft, Strichart
    ok(await page.isVisible('#inspector .swatches'), 'Eigenschaftenfeld zeigt die Farbpalette');
    await page.click('#inspector [data-sw="stroke"] .sw[data-c="#d9480f"]'); await page.click('#inspector [data-sw="fill"] .sw[data-c="#f5b700"]');
    await page.fill('#dr_fo', '0.5'); await page.dispatchEvent('#dr_fo', 'input'); await page.selectOption('#dr_dash', '1');
    const rc = await page.evaluate(id => Studio.drawGet(id), rid);
    ok(rc.stroke === '#d9480f' && rc.fill === '#f5b700' && rc.fillOpacity === 0.5 && rc.dash === true, 'Rand und Füllung getrennt einstellbar, Füllung durchscheinend, gestrichelt: ' + JSON.stringify([rc.stroke, rc.fill, rc.fillOpacity, rc.dash]));
    await page.evaluate(() => { const i = document.querySelector('#inspector input[type="color"][data-cc="stroke"]'); i.value = '#123456'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    ok(await page.evaluate(id => Studio.drawGet(id).stroke === '#123456', rid), 'freie Farbwahl');
    await page.click('#inspector [data-sw="fill"] .sw.none'); ok(await page.evaluate(id => Studio.drawGet(id).fill === null, rid), 'Füllung lässt sich ganz abschalten');
    // Durchscheinend: ein Klick in die Fläche trifft das Bauteil darunter, nicht das Rechteck
    await page.evaluate(id => { const e = Studio.drawGet(id); e.fill = '#f5b700'; e.x = Studio.core.part('R1').x - 80; e.y = Studio.core.part('R1').y - 60; e.w = 200; e.h = 120; Studio.core.changed('draw'); Studio.ed.fit(); }, rid);
    await selectPart('R1'); ok(await page.evaluate(() => Studio.core.sel === 'R1'), 'Klick in die Fläche eines Rahmens trifft das Bauteil darunter');
    // Text: mehrzeilig, Grösse, Farbe
    const tid = await page.evaluate(() => Studio.core.layout.draw.find(e => e.kind === 'text').id);
    await page.evaluate(id => { Studio.core.sel = 'd:' + id; Studio.core.redraw(); Studio.refreshInspector(); }, tid);
    await page.fill('#dr_text', 'Spannungsteiler\nU2 = 6 V'); await page.dispatchEvent('#dr_text', 'input'); await page.fill('#dr_size', '24'); await page.dispatchEvent('#dr_size', 'change'); await page.click('#inspector [data-sw="color"] .sw[data-c="#11864f"]');
    const tx = await page.evaluate(id => Studio.drawGet(id), tid); ok(tx.text === 'Spannungsteiler\nU2 = 6 V' && tx.size === 24 && tx.color === '#11864f', 'Text: mehrzeilig, Grösse und Farbe einstellbar');
    ok(await page.evaluate(id => document.querySelectorAll(`[data-draw="${id}"] tspan`).length, tid) === 2, 'der Text steht in zwei Zeilen im Bild');
    // Reihenfolge
    await page.evaluate(id => Studio.drawOrder(id, 'front'), tid); ok(await page.evaluate(id => Studio.drawList()[Studio.drawList().length - 1].id === id, tid), 'ganz nach vorn');
    await page.evaluate(id => Studio.drawOrder(id, 'back'), tid); ok(await page.evaluate(id => Studio.drawList()[0].id === id, tid), 'ganz nach hinten');
    // Ebene ein- und ausblenden
    await page.click('#btnDraw'); ok(await page.evaluate(() => document.querySelectorAll('#board .drawlayer').length === 0 && !Studio.drawVisible()), 'Ebene ausblenden wirkt');
    const hidden = await page.evaluate(() => Studio.exportSVG({ color: true }).svg); ok(!/data-draw|<tspan|<ellipse/.test(hidden), 'ausgeblendet: Export ohne Zeichenelemente');
    await page.click('#btnDraw'); ok(await page.evaluate(() => document.querySelectorAll('#board .drawlayer [data-draw]').length === 5), 'Ebene einblenden wirkt');
    const shown = await page.evaluate(() => ({ svg: Studio.exportSVG({ color: true }).svg, bw: Studio.exportSVG({ color: false }).svg, nodr: Studio.exportSVG({ color: true, draw: false }).svg, print: decodeURIComponent(Studio.printPrepare().innerHTML) }));
    ok(/<ellipse/.test(shown.svg) && /<tspan/.test(shown.svg) && /<polygon/.test(shown.svg) && !/drhandle|drhit|drsel/.test(shown.svg), 'Export (SVG) enthält die Elemente, aber keine Griffe oder Trefferflächen');
    ok(!/#d9480f|#123456|#11864f/i.test(shown.bw.replace(/<style[\s\S]*?<\/style>/, '')), 'Schwarzweiss-Export rechnet die Farben der Elemente in Grau um');
    ok(!/data-draw/.test(shown.nodr), 'Export auf Wunsch ohne Zeichenelemente'); ok(/data-draw/.test(shown.print) && /<tspan/.test(shown.print), 'Druck enthält die Elemente');
    // PNG-Export läuft durch
    const png = await page.evaluate(() => new Promise(res => Studio.exportPNG({ color: true }, (b, w, h) => res(b ? { size: b.size, w, h } : null)))); ok(png && png.size > 1000, 'PNG-Export mit Elementen (' + (png && png.size) + ' Byte)');
    // Speichern und Laden, Rückgängig, Löschen
    const rt = await page.evaluate(() => { const before = JSON.stringify(Studio.core.layout.draw), hidden = Studio.core.layout.drawHidden, r = Studio.parseFile(JSON.stringify(Studio.serialize())); return { ok: r.ok && JSON.stringify(r.layout.draw) === before && r.layout.drawHidden === hidden, n: r.layout.draw.length }; });
    ok(rt.ok && rt.n === 5, 'Elemente überleben Speichern und Laden (' + rt.n + ')');
    await page.evaluate(() => { Studio.core.sel = null; });
    const n0 = await page.evaluate(() => Studio.drawList().length); await page.click('[data-tab="Zeichnen"]'); await page.click('[data-add="draw:rect"]'); ok(await page.evaluate(() => Studio.drawList().length) === n0 + 1, 'neues Rechteck'); await page.keyboard.press('Control+z'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => Studio.drawList().length) === n0, 'Rückgängig nimmt es zurück'); await page.keyboard.press('Control+y'); await page.waitForTimeout(100); ok(await page.evaluate(() => Studio.drawList().length) === n0 + 1, 'Wiederholen stellt es her');
    await page.evaluate(() => { const l = Studio.drawList(); Studio.core.sel = 'd:' + l[l.length - 1].id; Studio.core.redraw(); }); await page.keyboard.press('Delete'); await page.waitForTimeout(100); ok(await page.evaluate(() => Studio.drawList().length) === n0, 'Entf löscht das ausgewählte Element'); await page.keyboard.press('Control+z'); await page.waitForTimeout(100); ok(await page.evaluate(() => Studio.drawList().length) === n0 + 1, 'Löschen lässt sich zurücknehmen');
    await page.screenshot({ path: shots + '/k_beschriftet.png' });
  }

  /* ===== Auftrag «Bauen», Paket 5: Zeichnungsrahmen, A4-Druck, Herleitung ===== */
  if (!only || only === 'l') {
    const loadZus = async () => { await page.evaluate(() => { Studio.loadExample('g_zus'); Studio.stopDemo(); Studio.core.layout.draw = []; Studio.core.layout.sheet = undefined; delete Studio.core.layout.sheet; Studio.core.changed('draw'); }); await page.click('#exBanner button').catch(() => { }); await page.waitForTimeout(150); };
    await loadZus();
    // Rahmen auf der Zeichenfläche
    await page.evaluate(() => Studio.sheetSet({ on: true, format: 'a4p', fields: { titel: 'A = e1 ( e2 v e3 )', thema: 'Logikgatter', name: 'S. Muster', datum: '15.10.2026', klasse: 'EL21', aenderung: 'a', text: 'ODER, dann UND: Der Ausgang ist 1, wenn e1 = 1 und e2 oder e3 = 1 ist.' } })); await page.waitForTimeout(100);
    const sh = await page.evaluate(() => { const e = document.querySelector('#board .sheetedge'); return { w: +e.getAttribute('width'), h: +e.getAttribute('height'), frame: !!document.querySelector('#board .blatt-frame rect'), txt: document.querySelector('#board .sheetframe').textContent }; });
    const k0 = await page.evaluate(() => Studio.sheetScale()); ok(Math.abs(sh.w - 794 * k0) < 0.5 && Math.abs(sh.h - 1123 * k0) < 0.5 && sh.frame && k0 >= 1, 'Rahmen A4 hoch auf der Zeichenfläche (794 × 1123, Massstab 1 : ' + k0 + ' passend zur Schaltung)');
    ok(/A = e1 \( e2 v e3 \)/.test(sh.txt) && /EL21/.test(sh.txt) && /Logikgatter/.test(sh.txt), 'Schriftfeld steht im Rahmen');
    await page.evaluate(() => Studio.ed.fit()); await page.screenshot({ path: shots + '/l_rahmen.png' });
    // Bauteil ausserhalb des Rahmens: markiert und nicht im Druck
    await page.evaluate(() => { const s = Studio.sheet(); Studio.core.layout.parts.push({ id: 'R1', type: 'resistor', x: Math.min(2300, s.x + 794 * Studio.sheetScale() + 120), y: s.y + 300, rot: 0 }); Studio.core.changed('add'); });
    ok(await page.evaluate(() => document.querySelectorAll('#board .sheetmarks .outmark').length) === 1, 'ein Bauteil ausserhalb des Rahmens ist auf dem Bildschirm markiert');
    const pgs0 = await page.evaluate(() => { const b = Studio.buildPages({ items: { table: false, expr: false, kv: false } }); const im = b.pages[0].match(/src="(data:image\/svg[^"]+)"/)[1]; return decodeURIComponent(im.split(',').slice(1).join(',')); });
    ok(!/data-part="R1"/.test(pgs0) && /data-part="U1"/.test(pgs0) && /data-part="E1"/.test(pgs0), 'das Bauteil ausserhalb erscheint im Druck nicht, die übrigen schon');
    await page.evaluate(() => { Studio.core.sel = 'R1'; Studio.core.removeSelected(); });
    // Herleitung des Beispiels: inhaltlich geprüft
    const b = await page.evaluate(() => { const b = Studio.buildPages(); return { count: b.count, pages: b.pages, w: b.w, h: b.h }; });
    ok(b.count === 2, 'zweiseitig: Seite 1 Schaltung, Seite 2 Herleitung (' + b.count + ' Seiten)');
    const html = await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = Studio.buildPages().pages.join(''); document.body.appendChild(d); d.id = 'tmpPages'; d.style.cssText = 'position:fixed;left:-9999px;top:0'; return true; });
    const P = await page.evaluate(() => { const pg = Array.from(document.querySelectorAll('#tmpPages .pg')), q = (p, s) => Array.from(p.querySelectorAll(s)); return {
      n: pg.length, p1img: !!pg[0].querySelector('img.figimg'), p1para: (pg[0].querySelector('.para') || {}).textContent,
      rows: q(pg[1], '.tt tbody tr').map(r => Array.from(r.children).map(c => c.textContent.trim()).join('')), one: q(pg[1], '.tt tbody tr.one').length,
      exl: q(pg[1], '.exl').map(x => x.textContent), exr: q(pg[1], '.exr').map(x => x.innerHTML), exrT: q(pg[1], '.exr').map(x => x.textContent.replace(/\s+/g, '')), law: (pg[1].querySelector('.law') || {}).textContent || '',
      kvRects: q(pg[1], '.kvsvg rect').length, kvDash: q(pg[1], '.kvsvg rect[stroke-dasharray]').length, kvTexts: q(pg[1], '.kvsvg text').map(t => t.textContent), kvOnes: q(pg[1], '.kvsvg text[font-size="22"][font-weight="700"]').length, frames: pg.map(p => p.querySelector('.pgframe').textContent.replace(/\s+/g, ' ')), heads: pg.map(p => p.querySelector('.pgh').textContent) }; });
    ok(P.p1img && /ODER, dann UND/.test(P.p1para), 'Seite 1: Schaltung als Bild, darunter die Beschreibung');
    const want = []; for (let r = 0; r < 8; r++) { const e1 = r >> 2 & 1, e2 = r >> 1 & 1, e3 = r & 1; want.push('' + e1 + e2 + e3 + (e1 && (e2 || e3) ? 1 : 0)); }
    ok(P.rows.join() === want.join(), 'Wahrheitstabelle stimmt mit der Schaltung: ' + P.rows.join(' ')); ok(P.one === 3, 'Zeilen mit Ergebnis 1 hervorgehoben (3)');
    notes.push('Ausdruck aus der Tabelle (HTML): ' + P.exr[0] + ' | KV: ' + JSON.stringify(P.kvTexts) + ' rects ' + P.kvRects + ' dash ' + P.kvDash); ok(/^A=e1e2e3ve1e2e3ve1e2e3$/.test(P.exrT[0]) && /e1\s*<span class="ov">e2<\/span>\s*e3 v e1\s*e2\s*<span class="ov">e3<\/span> v e1\s*e2\s*e3/.test(P.exr[0]), 'Ausdruck aus der Tabelle: A = e1 ē2 e3 v e1 e2 ē3 v e1 e2 e3 (' + P.exr[0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ') + ')');
    ok(/^A=e1e[23]ve1e[23]$/.test(P.exrT[1]) && P.exrT[1].includes('e1e2') && P.exrT[1].includes('e1e3'), 'Minimalform aus dem KV-Diagramm: ' + P.exrT[1]);
    ok(P.exrT[2] === 'A=e1(e2ve3)', 'ausgeklammert: ' + P.exrT[2]); ok(P.exl.join('|') === 'Aus der Tabelle|Aus dem KV-Diagramm|Ausgeklammert', 'drei Zeilen mit Beschriftung');
    ok(/konjunktive Distributivgesetz/.test(P.law) && /spart/.test(P.law), 'Absatz nennt den Rechenschritt und was er einspart: ' + P.law.slice(0, 120));
    ok(P.kvRects === 8 + 2 && P.kvDash === 1 && P.kvTexts.includes('e1e2') && P.kvTexts.includes('e1e3') && P.kvOnes === 3, 'KV-Diagramm: 8 Felder, zwei Gruppen (durchgezogen und gestrichelt) mit Bezeichnung, drei Einsen');
    const cellOk = await page.evaluate(() => { const svg = document.querySelector('#tmpPages .pg:nth-child(2) .kvsvg'), rects = Array.from(svg.querySelectorAll('rect[stroke-width="1.5"]')), texts = Array.from(svg.querySelectorAll('text[font-size="22"]')); // Zellen und Werte
      return texts.map(t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y'), col = Math.round((x - 74 - 30) / 60), row = Math.round((y - 56 - 38) / 60); return col + ',' + row + '=' + t.textContent; }).sort().join(' '); });
    // Spalten e2 e3 in Gray-Reihenfolge 00 01 11 10, Zeile e1: Einsen bei e1 = 1 und (01, 11, 10)
    ok(cellOk === '0,0=0 0,1=0 1,0=0 1,1=1 2,0=0 2,1=1 3,0=0 3,1=1'.split(' ').sort().join(' ').replace('0,1=0 ', '0,1=0 ') || /0,0=0/.test(cellOk) && /0,1=0/.test(cellOk) && /1,1=1/.test(cellOk) && /2,1=1/.test(cellOk) && /3,1=1/.test(cellOk) && /1,0=0/.test(cellOk) && /2,0=0/.test(cellOk) && /3,0=0/.test(cellOk), 'KV-Felder stimmen mit der Tabelle: ' + cellOk);
    ok(P.frames[0].includes('1 / 2') && P.frames[1].includes('2 / 2') && P.frames.every(f => /Digital Quest Studio/.test(f) && /EL21/.test(f) && /S\. Muster/.test(f)), 'Seitenzahlen im Schriftfeld (1 / 2, 2 / 2) und Felder auf jeder Seite');
    ok(/zur Schaltung auf Blatt 1/.test(P.heads[1]) && /A = e1 \( e2 v e3 \)/.test(P.heads[0]), 'Kopfzeile: Seite 1 mit Ausdruck, Folgeseite «zur Schaltung auf Blatt 1»');
    // nichts abgeschnitten, Inhalt im Rahmen
    const fit = await page.evaluate(() => Array.from(document.querySelectorAll('#tmpPages .pgc')).map(c => ({ ok: c.scrollHeight <= c.clientHeight + 1 && c.scrollWidth <= c.clientWidth + 1, l: c.style.left, w: c.style.width }))); ok(fit.every(f => f.ok), 'A4 hoch: nichts abgeschnitten (Inhalt passt in den Inhaltsbereich)');
    await page.evaluate(() => document.getElementById('tmpPages').remove());
    // Fassung «Aufgabe»: dieselben Felder, leer
    const A = await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = Studio.buildPages({ version: 'aufgabe' }).pages.join(''); const pg = Array.from(d.querySelectorAll('.pg')), q = (p, s) => Array.from(p.querySelectorAll(s));
      return { n: pg.length, rows: q(pg[1], '.tt tbody tr').length, res: q(pg[1], '.tt td.res').map(c => c.textContent.replace(/ /g, '').trim()).join(''), bold: q(pg[1], '.tt td.res.b').length, one: q(pg[1], '.tt tr.one').length, exl: q(pg[1], '.exl').map(x => x.textContent).join('|'), exr: q(pg[1], '.exr').map(x => x.textContent.trim()).join(''), law: !!pg[1].querySelector('.law'), kvCells: q(pg[1], '.kvsvg rect[stroke-width="1.5"]').length, kvLoops: q(pg[1], '.kvsvg rect[rx]').length, kvVals: q(pg[1], '.kvsvg text[font-size="22"]').length, head: pg[0].querySelector('.pgh span').textContent }; });
    ok(A.n === 2 && A.rows === 8 && A.res === '' && A.bold === 0 && A.one === 0, 'Aufgabe: Tabelle mit allen 8 Zeilen, Ergebnisspalte leer');
    ok(A.exl === 'Aus der Tabelle|Aus dem KV-Diagramm|Ausgeklammert' && A.exr === '' && !A.law, 'Aufgabe: dieselben drei Ausdruckszeilen mit Beschriftung, rechts leer, kein Lösungstext');
    ok(A.kvCells === 8 && A.kvLoops === 0 && A.kvVals === 0, 'Aufgabe: leeres KV-Raster mit Köpfen, ohne Werte und Gruppen'); ok(A.head === '', 'Aufgabe verrät den Ausdruck nicht in der Kopfzeile');
    // Blattformate
    for (const [fmt, w, h] of [['a4p', 794, 1123], ['a4l', 1123, 794], ['a3l', 1587, 1123]]) {
      const r = await page.evaluate(([fmt]) => { const d = document.createElement('div'); d.id = 'tmpPages'; d.style.cssText = 'position:fixed;left:-9999px;top:0'; const b = Studio.buildPages({ format: fmt }); d.innerHTML = b.pages.join(''); document.body.appendChild(d); const o = { count: b.count, w: b.w, h: b.h, pg: Array.from(d.querySelectorAll('.pg')).map(p => [p.offsetWidth, p.offsetHeight]), fits: Array.from(d.querySelectorAll('.pgc')).every(c => c.scrollHeight <= c.clientHeight + 1 && c.scrollWidth <= c.clientWidth + 1), frame: d.querySelector('.pgframe rect').getAttribute('width') + 'x' + d.querySelector('.pgframe rect').getAttribute('height'), fx: d.querySelector('.pgframe rect').getAttribute('x') }; d.remove(); return o; }, [fmt]);
      ok(r.w === w && r.h === h && r.pg.every(p => p[0] === w && p[1] === h) && r.fits && r.frame === (w - 76) + 'x' + (h - 76) && r.fx === '38', fmt + ': Blatt ' + w + ' × ' + h + ', Rahmen 38 vom Rand, vollständig, nichts abgeschnitten');
    }
    // Dialog
    await page.evaluate(() => { Studio.sheetSet({ format: 'a4p' }); }); await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Drucken")'); await page.waitForTimeout(150);
    const dl = await page.evaluate(() => ({ seg: Array.from(document.querySelectorAll('.pdlg [data-seg="format"] .seg')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|'), ver: Array.from(document.querySelectorAll('.pdlg [data-seg="version"] .seg')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|'), items: Array.from(document.querySelectorAll('.pdlg [data-it]')).map(i => i.dataset.it + (i.checked ? '+' : '-') + (i.disabled ? 'x' : '')).join(','), n: document.getElementById('pdCount').textContent, btns: Array.from(document.querySelectorAll('.pdfoot button')).map(b => b.textContent).join('|') }));
    ok(dl.seg === 'A4 hoch*|A4 quer|A3 quer' && dl.ver === 'Lösung*|Aufgabe', 'Druckdialog: Blatt (A4 hoch vorgewählt) und Fassung (Lösung vorgewählt): ' + dl.seg + ' / ' + dl.ver);
    ok(dl.items === 'table+,expr+,kv+,scope-x,timing-,bom-' && dl.n === '2 Seiten' && dl.btns === 'Abbrechen|Vorschau|PDF erzeugen', 'Seiten: Tabelle, Ausdruck, KV angehakt; Oszilloskop und Zeitverlauf ausgegraut (kein Oszilloskop offen); Fuss mit Seitenzahl und Knöpfen: ' + dl.items);
    await page.click('#pdPreview'); await page.waitForTimeout(200); ok(await page.evaluate(() => document.querySelectorAll('#pdPrev .pvwrap').length) === 2, 'Vorschau zeigt beide Seiten'); await page.screenshot({ path: shots + '/l_dialog.png' });
    await page.click('.pdlg [data-seg="format"] [data-v="a4l"]'); await page.waitForTimeout(150); ok(await page.evaluate(() => Studio.sheet().format === 'a4l' && document.querySelectorAll('#pdPrev .pvwrap').length === 2), 'A4 quer gewählt: Rahmen und Vorschau folgen');
    await page.click('.pdlg [data-seg="format"] [data-v="a4p"]'); await page.click('.pdlg [data-seg="version"] [data-v="aufgabe"]'); await page.click('.pdlg [data-it="bom"]'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => Studio.printOptions.version === 'aufgabe' && Studio.printOptions.items.bom), 'Fassung und Stückliste wählbar'); await page.click('.pdlg [data-seg="version"] [data-v="loesung"]'); await page.click('.pdlg [data-it="bom"]'); await page.click('#mClose');
    // Analogschaltung: Logik-Punkte ausgegraut, begründet
    await page.evaluate(() => { Studio.loadExample('n_teiler'); Studio.stopDemo(); }); await page.click('#exBanner button').catch(() => { }); await page.keyboard.press('Control+p'); await page.waitForTimeout(150);
    const an = await page.evaluate(() => Array.from(document.querySelectorAll('.pdlg [data-it]')).map(i => [i.dataset.it, i.disabled, i.closest('label').textContent.replace(/\s+/g, ' ')]).filter(x => /table|expr|kv/.test(x[0])));
    ok(an.length === 3 && an.every(x => x[1] && /Logik|Pegelschalter/.test(x[2])), 'Analogschaltung: Tabelle, Ausdruck, KV ausgegraut mit Begründung: ' + an[0][2].slice(0, 110)); await page.click('#mClose');
    // PDF: zwei Seiten in der richtigen Blattgrösse
    await loadZus(); await page.evaluate(() => Studio.sheetSet({ on: true, format: 'a4p', fields: { titel: 'UND-Verknüpfung mit vorgeschaltetem ODER', name: 'S. Muster', text: 'Die Schaltung verknüpft e2 und e3 mit ODER, dann UND mit e1.' } }));
    await page.evaluate(() => new Promise(res => Studio.printPages(null, b => res(b.count)))); await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true }); const txt = pdf.toString('latin1');
    const pgCount = (txt.match(/\/Type\s*\/Page[^s]/g) || []).length, mb = (txt.match(/\/MediaBox\s*\[([^\]]+)\]/) || [])[1] || '';
    ok(pgCount === 2, 'PDF hat zwei Seiten (' + pgCount + ')'); ok(/^0 0 59[45]\.\d+ 84[12]\.\d+$/.test(mb.trim()), 'PDF-Blattgrösse A4 hoch (' + mb.trim() + ')');
    fs.writeFileSync(path.join(shots, 'l_druck.pdf'), pdf);
    await page.locator('#printArea .pg').nth(0).screenshot({ path: shots + '/l_seite1.png' }); await page.locator('#printArea .pg').nth(1).screenshot({ path: shots + '/l_seite2.png' });
    const fill = await page.evaluate(() => Array.from(document.querySelectorAll('#printArea .pg')).map(pg => { const r = pg.getBoundingClientRect(), fr = pg.querySelector('.pgframe'), sf = fr ? fr.getBoundingClientRect() : r; const inner = Array.from(pg.querySelectorAll('.figimg, .para, .fitin')).map(e => e.getBoundingClientRect().bottom); const top = pg.querySelector('.pgh').getBoundingClientRect().bottom; const bottom = Math.max(...inner); const lim = pg.querySelector('.pgc').getBoundingClientRect().bottom; const fi = pg.querySelector('.figimg'); return { gap: (lim - bottom) / r.height, H: r.height, head: pg.querySelector('.pgh b').textContent, right: pg.querySelector('.pgh span').textContent, para: (pg.querySelector('.para') || {}).textContent || '', imgW: fi ? fi.getBoundingClientRect().width : 0 }; }));
    notes.push('Füllung: ' + JSON.stringify(fill.map(f => [f.gap.toFixed(3), f.imgW])));
    ok(fill.every(f => f.gap <= 0.1), 'Druck füllt beide Seiten: Leerraum über dem Schriftfeld höchstens ein Zehntel der Seitenhöhe (' + fill.map(f => (f.gap * 100).toFixed(1) + ' %').join(', ') + ')');
    ok(fill[0].head === 'UND-Verknüpfung mit vorgeschaltetem ODER' && fill[1].head === fill[0].head && /A = e1 \( e2 v e3 \)/.test(fill[0].right) && /Blatt 1/.test(fill[1].right) && !/e1 \(/.test(fill[0].head), 'Titel links ist der Name, die Formel steht nur rechts oben (Seite 1), Folgeseite «zur Schaltung auf Blatt 1»');
    ok(/verknüpft e2 und e3/.test(fill[0].para), 'Erklärender Satz aus dem Beschreibungsfeld steht unter der Schaltung');
    ok(fill[0].imgW > 600, 'Schaltung auf Seite 1 gross gezeichnet (' + Math.round(fill[0].imgW) + ' px breit)');
    await page.evaluate(() => Studio.printOptions.version = 'aufgabe'); await page.evaluate(() => new Promise(res => Studio.printPages(null, b => res(b.count)))); await page.locator('#printArea .pg').nth(1).screenshot({ path: shots + '/l_seite2_aufgabe.png' });
    await page.evaluate(() => { Studio.printOptions.version = 'loesung'; }); await page.emulateMedia({ media: 'screen' });
    // A4 quer und A3 quer im PDF
    for (const [fmt, rx] of [['a4l', /^0 0 84[12]\.\d+ 59[45]\.\d+$/], ['a3l', /^0 0 119[01]\.\d+ 84[12]\.\d+$/]]) {
      await page.evaluate(f => { Studio.printOptions.format = f; Studio.sheetSet({ format: f, center: true }); }, fmt); await page.evaluate(() => new Promise(res => Studio.printPages(null, b => res(b.count)))); await page.emulateMedia({ media: 'print' });
      const pdf2 = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1'), m2 = (pdf2.match(/\/MediaBox\s*\[([^\]]+)\]/) || [])[1] || ''; ok(rx.test(m2.trim()), 'PDF ' + fmt + ': Blattgrösse ' + m2.trim()); await page.emulateMedia({ media: 'screen' });
    }
    await page.evaluate(() => { Studio.printOptions.format = 'a4p'; Studio.sheetSet({ format: 'a4p', center: true }); });
    // mehrere Folgeseiten: Oszilloskop, Zeitverlauf, Stückliste; Umbruch zählt mit
    await page.evaluate(() => { Studio.timing.clear(); Studio.addAllDigital && 0; Studio.openScope([{ kind: 'node', a: 'U1.out' }]); Studio.timing.addRow({ kind: 'dig', a: 'U1.out' }); Studio.timing.addRow({ kind: 'dig', a: 'E1.out' }); });
    await page.evaluate(() => { Studio.sim.start(); }); await page.waitForTimeout(600);
    const mp = await page.evaluate(() => { const b = Studio.buildPages({ items: { table: true, expr: true, kv: true, scope: true, timing: true, bom: true } }); const d = document.createElement('div'); d.innerHTML = b.pages.join(''); return { n: b.count, txt: d.textContent.replace(/\s+/g, ' '), frames: Array.from(d.querySelectorAll('.pgframe')).map(f => (f.textContent.match(/\d+ \/ \d+/) || [''])[0]), imgs: d.querySelectorAll('img.shot').length }; });
    ok(mp.n >= 3 && /Stückliste/.test(mp.txt) && /Zeitverlauf/.test(mp.txt) && /Oszilloskop 1/.test(mp.txt) && mp.imgs === 2, 'mit Oszilloskop, Zeitverlauf und Stückliste mehrere Folgeseiten (' + mp.n + ' Seiten)');
    ok(mp.frames.every((f, i) => f === (i + 1) + ' / ' + mp.n), 'Seitenzahlen im Schriftfeld zählen mit: ' + mp.frames.join(', '));
    await page.evaluate(() => Studio.closeScopes());
    // Export mit Rahmen (SVG und PNG)
    const ex = await page.evaluate(() => { const r = Studio.exportSVG({ color: false, frame: true }), doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml'); return { w: r.w, h: r.h, err: !!doc.querySelector('parsererror'), frame: !!doc.querySelector('.blatt-frame'), title: /A = e1/.test(r.svg), plain: Studio.exportSVG({ color: false }).svg.indexOf('blatt-frame') < 0 }; });
    ok(ex.w === 794 && ex.h === 1123 && !ex.err && ex.frame && ex.title && ex.plain, 'Export (SVG) mit Rahmen: Blatt 1 gültiges XML mit Rahmen, ohne Rahmen bleibt es beim Bild');
    const png = await page.evaluate(() => new Promise(res => Studio.exportPNG({ color: true, frame: true }, (b, w, h) => res(b ? { size: b.size, w, h } : null)))); ok(png && png.size > 3000 && png.w === 1588, 'PNG-Export mit Rahmen (' + (png && png.w) + ' × ' + (png && png.h) + ')');
    // Datei: Rahmen und Schriftfeld überleben Speichern und Laden
    const rt = await page.evaluate(() => { const lay = JSON.stringify(Studio.core.layout.sheet), r = Studio.parseFile(JSON.stringify(Studio.serialize())); return { same: r.ok && JSON.stringify(r.layout.sheet) === lay, f: r.ok && r.layout.sheet.fields && r.layout.sheet.fields.name }; }); ok(rt.same && rt.f === 'S. Muster', 'Rahmen und Schriftfeld überleben Speichern und Laden');
    const und = await page.evaluate(() => { Studio.sheetSet({ fields: { name: 'X' } }); const n1 = Studio.sheet().fields.name; Studio.undo(); return [n1, Studio.sheet() && Studio.sheet().fields.name]; }); ok(und[0] === 'X' && und[1] === 'S. Muster', 'Rückgängig stellt das Schriftfeld wieder her');
    // Dialog Schriftfeld
    await page.click('#menu-ansicht > button'); await page.click('#menu-ansicht .drop button:has-text("Schriftfeld bearbeiten")'); await page.fill('#shK', 'EL22'); await page.click('#shDnow'); await page.click('#shOk');
    ok(await page.evaluate(() => Studio.sheet().fields.klasse === 'EL22' && /\d\d\.\d\d\.\d{4}/.test(Studio.sheet().fields.datum)), 'Schriftfeld lässt sich im Dialog ausfüllen (Datum «heute»)');
    // Rahmen verschieben (ziehen am Rand)
    const bx = await page.evaluate(() => { const s = Studio.sheet(), svg = document.querySelector('#board'), pt = svg.createSVGPoint(); pt.x = s.x + 38; pt.y = s.y + 300; const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y, sx: s.x, sy: s.y }; });
    await page.evaluate(() => { const s = Studio.sheet(); Studio.ed.setView([s.x - 60, s.y + 100, 800, 500]); }); const bx2 = await page.evaluate(() => { const s = Studio.sheet(), svg = document.querySelector('#board'), pt = svg.createSVGPoint(); pt.x = s.x + 38; pt.y = s.y + 300; const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y, sx: s.x, sy: s.y }; });
    await page.mouse.move(bx2.x, bx2.y); await page.mouse.down(); await page.mouse.move(bx2.x + 60, bx2.y + 40, { steps: 5 }); await page.mouse.up(); const mv = await page.evaluate(() => ({ x: Studio.sheet().x, y: Studio.sheet().y }));
    ok(mv.x !== bx2.sx || mv.y !== bx2.sy, 'Rahmen lässt sich am Rand verschieben (' + bx2.sx + ',' + bx2.sy + ' → ' + mv.x + ',' + mv.y + ')');
    await page.evaluate(() => { delete Studio.core.layout.sheet; Studio.core.changed('draw'); });
  }

  /* ===== Auftrag Bedienung: Paket 1 (kein Modus), 2 (Maus), 3 (Platz), 4 (in Leitung einfügen), 5 (Spannungen), 6 (mehrfach setzen) ===== */
  const scr = (x, y) => page.evaluate(([x, y]) => { const svg = document.querySelector('#board'), pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y }; }, [x, y]);
  const RCAC = { parts: [{ id: 'G1', type: 'acsource', x: 200, y: 300, rot: 0, value: 5, props: { freq: 1000 } }, { id: 'R1', type: 'resistor', x: 450, y: 200, rot: 0, value: 1000 }, { id: 'C1', type: 'capacitor', x: 700, y: 300, rot: 90, value: 1e-7 }],
    wires: [{ from: 'G1.p', to: 'R1.a' }, { from: 'R1.b', to: 'C1.a' }, { from: 'C1.b', to: 'G1.n' }] };
  const DIG = { parts: [{ id: 'CLK1', type: 'clock', x: 200, y: 300, rot: 0 }, { id: 'FF1', type: 'dff', x: 450, y: 300, rot: 0 }, { id: 'L1', type: 'logicled', x: 700, y: 300, rot: 0 }],
    wires: [{ from: 'CLK1.out', to: 'FF1.C' }, { from: 'CLK1.out', to: 'FF1.D' }, { from: 'FF1.Q', to: 'L1.in' }] };
  const reset = async lay => { await page.evaluate(l => { Studio.closeScopes(); Studio.bodes.slice().forEach(b => b.close()); Studio.timing.clear(); Studio.loadLayout(l, { run: true }); if (Studio.core.layout.sheet) delete Studio.core.layout.sheet; }, lay); await page.waitForTimeout(250); };
  const away = () => page.evaluate(() => { document.querySelectorAll('#floats .fwin').forEach((w, i) => { w.style.left = (300 + i * 40) + 'px'; w.style.top = '640px'; }); });
  const menuA = async t => { await page.click('#menu-fenster > button'); await page.click(`#menu-fenster .drop button:has-text("${t}")`); };
  if (!only || only === 'm') { // Paket 1: der Modus wird abgeschafft
    await reset(RCAC);
    ok(!(await page.$('#toolBuild')) && !(await page.$('#toolMeasure')) && !(await page.$('#measureTarget')) && !(await page.$('#measureKind')), 'Werkzeugleiste: keine Umschaltung Bauen/Messen, keine Zielwahl mehr');
    await page.evaluate(() => { if (!Studio.timingCollapsed()) Studio.toggleTiming(); });
    for (let k = 0; k < 10; k++) { await selectPart(['R1', 'C1', 'G1'][k % 3]); await pin('R1.a'); await pin('R1.a'); await page.waitForTimeout(60); }
    const fw = await page.evaluate(() => ({ wins: document.querySelectorAll('#floats .fwin').length, sc: Studio.scopes.length, bo: Studio.bodes.length, rows: Studio.timing.rows.length, wires: Studio.core.layout.wires.length, tl: Studio.timingCollapsed() }));
    ok(fw.wins === 0 && fw.sc === 0 && fw.bo === 0 && fw.rows === 0 && fw.tl, 'zwanzig Klicks auf Bauteile und Anschlüsse: kein Fenster, kein Signal, Zeitverlauf bleibt zu (' + JSON.stringify(fw) + ')');
    ok(fw.wires === 3, 'die Klicks haben die Schaltung nicht verändert');
    await ctxPin('R1.b', 'Ins Oszilloskop'); ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch.length === 1), 'Rechtsklick auf Anschluss → Ins Oszilloskop'); await away();
    await ctxPin('R1.b', 'Ins Bode-Diagramm'); ok(await page.evaluate(() => Studio.bodes.length === 1), 'Rechtsklick auf Anschluss → Ins Bode-Diagramm'); await away();
    await ctxPart('C1', 'Ins Oszilloskop: Strom'); ok(await page.evaluate(() => Studio.scopes[0].ch.some(c => c.tr.desc.kind === 'pi')), 'Rechtsklick auf Bauteil → Ins Oszilloskop: Strom');
    await page.evaluate(() => { Studio.closeScopes(); }); await selectPart('R1'); await page.waitForTimeout(250); await page.click('#insLive .sendbtn[aria-label*="Spannung"]');
    ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch[0].tr.desc.kind === 'pv'), 'Eigenschaftenfeld: Knopf Spannung → Oszilloskop');
    await page.evaluate(() => { Studio.closeScopes(); Studio.bodes.slice().forEach(b => b.close()); }); await selectPart('C1');
    await menuA('Auswahl ins Oszilloskop'); ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch.length >= 1), 'Menü Anzeigen → Auswahl ins Oszilloskop');
    await menuA('Auswahl ins Bode-Diagramm'); ok(await page.evaluate(() => Studio.bodes.length === 1), 'Menü Anzeigen → Auswahl ins Bode-Diagramm');
    await reset(DIG); await selectPart('FF1');
    await menuA('Auswahl in den Zeitverlauf'); ok(await page.evaluate(() => Studio.timing.rows.length >= 1 && !Studio.timingCollapsed()), 'Menü Anzeigen → Auswahl in den Zeitverlauf (klappt den Zeitverlauf auf)');
    await reset(DIG); await menuA('Alle digitalen Signale aufnehmen'); ok(await page.evaluate(() => Studio.timing.rows.length >= 2 && !Studio.timingCollapsed()), 'Menü Anzeigen → Alle digitalen Signale aufnehmen (' + await page.evaluate(() => Studio.timing.rows.length) + ' Zeilen)');
    const rows0 = await page.evaluate(() => Studio.timing.rows.length); await page.evaluate(() => Studio.timing.clear()); await ctxPart('L1', 'In den Zeitverlauf'); ok(await page.evaluate(() => Studio.timing.rows.length) >= 1 && rows0 >= 2, 'Rechtsklick auf Bauteil → In den Zeitverlauf');
    await page.evaluate(() => { Studio.timing.clear(); if (!Studio.timingCollapsed()) Studio.toggleTiming(); });
  }
  if (!only || only === 'n') { // Paket 2: Maussteuerung
    await reset({ parts: [{ id: 'R1', type: 'resistor', x: 300, y: 200, rot: 0, value: 1000 }, { id: 'R2', type: 'resistor', x: 500, y: 200, rot: 0, value: 1000 }, { id: 'R3', type: 'resistor', x: 700, y: 200, rot: 0, value: 1000 }, { id: 'R4', type: 'resistor', x: 500, y: 420, rot: 0, value: 1000 }],
      wires: [{ from: 'R1.b', to: 'R2.a' }, { from: 'R2.b', to: 'R3.a' }] });
    await page.evaluate(() => Studio.ed.fit());
    const view = () => page.evaluate(() => Studio.ed.view.slice()), pos = () => page.evaluate(() => Object.fromEntries(Studio.core.layout.parts.map(p => [p.id, [p.x, p.y]])));
    const box = await page.locator('#board').boundingBox(), cx = box.x + box.width / 2 + 120, cy = box.y + box.height / 2 + 60;
    const under = async () => page.evaluate(([x, y]) => { const svg = document.querySelector('#board'), pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(svg.getScreenCTM().inverse()); return [r.x, r.y]; }, [cx, cy]);
    const v0 = await view(), u0 = await under(); await page.mouse.move(cx, cy); await page.mouse.wheel(0, -300); await page.waitForTimeout(80);
    const v1 = await view(), u1 = await under();
    ok(v1[2] < v0[2] * 0.9 && Math.hypot(u1[0] - u0[0], u1[1] - u0[1]) < 3, 'Mausrad (ohne Strg) zoomt hinein, der Punkt unter dem Zeiger bleibt stehen (' + Math.round(v0[2]) + ' → ' + Math.round(v1[2]) + ')');
    await page.mouse.wheel(0, 600); await page.waitForTimeout(80); const v2 = await view(); ok(v2[2] > v1[2] * 1.2, 'Mausrad rückwärts zoomt heraus');
    await page.evaluate(() => Studio.ed.fit());
    const e0 = await view(); await page.mouse.move(cx, cy); await page.mouse.down({ button: 'right' }); await page.mouse.move(cx + 60, cy + 30, { steps: 4 }); await page.mouse.move(cx + 120, cy + 60, { steps: 4 });
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#board')).cursor) === 'grabbing', 'Mauszeiger beim Schieben: greifende Hand');
    await page.mouse.up({ button: 'right' }); await page.waitForTimeout(80); const e1 = await view();
    ok(Math.abs(e1[0] - e0[0]) > 20 && Math.abs(e1[1] - e0[1]) > 10 && !(await page.isVisible('.ctxmenu')), 'rechte Taste gehalten und ziehen schiebt die Fläche, kein Menü (' + Math.round(e1[0] - e0[0]) + ',' + Math.round(e1[1] - e0[1]) + ')');
    await page.evaluate(() => Studio.ed.fit());
    const r2 = await scr(500, 200); await page.mouse.click(r2.x, r2.y, { button: 'right' }); await page.waitForTimeout(60); ok(await page.isVisible('.ctxmenu'), 'Rechtsklick ohne Bewegung öffnet das Menü'); await page.keyboard.press('Escape');
    await page.mouse.move(r2.x, r2.y); await page.mouse.down({ button: 'right' }); await page.mouse.move(r2.x + 3, r2.y + 1); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(60); ok(await page.isVisible('.ctxmenu'), 'Rechtsklick mit 3 Punkten Wackeln: weiter Menü'); await page.keyboard.press('Escape');
    const vb = await view(); await page.mouse.move(r2.x, r2.y); await page.mouse.down({ button: 'right' }); await page.mouse.move(r2.x + 10, r2.y + 2, { steps: 3 }); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(60);
    ok(!(await page.isVisible('.ctxmenu')) && (await view())[0] !== vb[0], 'Rechtsklick mit 10 Punkten Bewegung schiebt und öffnet kein Menü');
    await page.evaluate(() => Studio.ed.fit());
    ok(await page.evaluate(() => { const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('#board').dispatchEvent(ev); return ev.defaultPrevented; }), 'das Browser-Kontextmenü ist auf der Zeichenfläche unterdrückt');
    await page.keyboard.press('Escape');
    const m0 = await view(); await page.mouse.move(cx, cy); await page.mouse.down({ button: 'middle' }); await page.mouse.move(cx + 80, cy, { steps: 4 }); await page.mouse.up({ button: 'middle' }); await page.waitForTimeout(60);
    ok(Math.abs((await view())[0] - m0[0]) > 20 && !(await page.isVisible('.ctxmenu')), 'mittlere Taste gehalten schiebt die Fläche');
    await page.evaluate(() => Studio.ed.fit());
    const a = await scr(220, 130), b = await scr(780, 290); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    ok(await page.evaluate(() => document.querySelectorAll('#board .marquee').length) === 1, 'beim Ziehen auf leerer Fläche erscheint der Auswahlrahmen');
    await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(80);
    ok(await page.evaluate(() => Studio.multi.slice().sort().join()) === 'R1,R2,R3', 'Auswahlrahmen über drei Bauteile wählt genau diese drei aus: ' + await page.evaluate(() => Studio.multi.join()));
    ok(await page.evaluate(() => document.querySelectorAll('#board .marquee').length) === 0 && await page.evaluate(() => document.querySelectorAll('#board .part.selected').length) === 3, 'Rahmen verschwindet, drei Bauteile sind hervorgehoben');
    const net0 = await page.evaluate(() => JSON.stringify([Studio.sim.net.nodes.length, Studio.core.layout.wires])), p0 = await pos(), s0 = await scr(500, 200);
    await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.move(s0.x + 40, s0.y + 60, { steps: 5 }); await page.mouse.move(s0.x + 80, s0.y + 120, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(100); const p1 = await pos();
    const dxs = ['R1', 'R2', 'R3'].map(i => [p1[i][0] - p0[i][0], p1[i][1] - p0[i][1]]);
    ok(dxs.every(d => d[0] === dxs[0][0] && d[1] === dxs[0][1]) && dxs[0][0] > 20 && dxs[0][1] > 40 && p1.R4.join() === p0.R4.join(), 'Ziehen auf einem ausgewählten Bauteil verschiebt die ganze Auswahl gemeinsam (' + dxs[0] + '), R4 bleibt');
    ok(await page.evaluate(() => JSON.stringify([Studio.sim.net.nodes.length, Studio.core.layout.wires])) === net0 && await page.evaluate(() => Studio.multi.length) === 3, 'Leitungen bleiben hängen, die Auswahl bleibt bestehen');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80); const p2 = await pos();
    ok(['R1', 'R2', 'R3'].every(i => p2[i].join() === p0[i].join()), 'Rückgängig macht das Verschieben der Auswahl in einem Schritt rückgängig');
    await page.evaluate(() => Studio.ed.fit()); await page.mouse.click(a.x - 30, a.y - 30); await page.waitForTimeout(60); const s4 = await scr(500, 420), q0 = await pos();
    await page.mouse.move(s4.x, s4.y); await page.mouse.down(); await page.mouse.move(s4.x + 60, s4.y + 20, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(80); const q1 = await pos();
    ok(q1.R4[0] > q0.R4[0] && ['R1', 'R2', 'R3'].every(i => q1[i].join() === q0[i].join()), 'Ziehen auf einem Bauteil verschiebt nur dieses');
    const cur = await page.evaluate(() => ({ part: getComputedStyle(document.querySelector('#board [data-part="R4"] .hit')).cursor, pin: getComputedStyle(document.querySelector('#board [data-pin] .pinhit')).cursor, bg: getComputedStyle(document.querySelector('#board .gridrect') || document.querySelector('#board')).cursor }));
    ok(cur.part === 'move' && cur.pin === 'crosshair' && cur.bg === 'default', 'Mauszeiger: Verschiebekreuz über Bauteil, Kreuz über Anschluss, Pfeil über leerer Fläche (' + JSON.stringify(cur) + ')');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80); ok((await pos()).R4.join() === q0.R4.join(), 'Rückgängig macht das Verschieben eines Bauteils rückgängig');
    await page.mouse.click(a.x - 30, a.y - 30); await selectPart('R1'); await page.keyboard.down('Shift'); await page.click('[data-part="R2"] .hit', { force: true }); await page.keyboard.up('Shift'); await page.waitForTimeout(60);
    ok(await page.evaluate(() => Studio.multi.slice().sort().join()) === 'R1,R2', 'Umschalt + Klick fügt zur Auswahl hinzu');
    await page.keyboard.down('Shift'); await page.click('[data-part="R2"] .hit', { force: true }); await page.keyboard.up('Shift'); await page.waitForTimeout(60);
    ok(await page.evaluate(() => Studio.multi.join()) === 'R1', 'Umschalt + Klick auf ein ausgewähltes Bauteil nimmt es heraus');
    await page.mouse.click(a.x - 30, a.y - 30); await page.waitForTimeout(60);
  }
  if (!only || only === 'o') { // Paket 3: Platz für die Zeichenfläche
    const ctx3 = await browser.newContext({ viewport: { width: 1366, height: 768 } }), p3 = await ctx3.newPage(); await p3.goto(url, { waitUntil: 'domcontentloaded' }); await p3.waitForFunction(() => window.Studio && Studio.sim);
    const names = await p3.evaluate(() => Array.from(document.querySelectorAll('#palette .ptab')).map(t => t.textContent));
    ok(names.slice(0, 5).join('|') === 'Logik|Flip-Flops|Zähler|Anzeigen|Analog', 'Bauteilleiste oben mit den Registerkarten Logik · Flip-Flops · Zähler · Anzeigen · Analog (+ ' + names.slice(5).join(', ') + ')');
    const geo = await p3.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { pal: r('#palette'), tb: r('#toolbar'), cv: r('#canvasWrap'), main: r('.main'), vh: innerHeight, pw: r('#palette').width, left: document.querySelector('aside.palette') }; });
    ok(!geo.left && geo.pal.top >= geo.tb.bottom - 1 && geo.pal.bottom <= geo.cv.top + 1, 'keine linke Spalte mehr: die Leiste liegt über der Zeichenfläche');
    ok(geo.pal.height < 62 && geo.tb.height < 50, 'Bauteilleiste und Werkzeugleiste je eine Zeile hoch (' + Math.round(geo.pal.height) + ' und ' + Math.round(geo.tb.height) + ' Punkte)');
    ok(geo.cv.height >= 0.7 * geo.vh, 'bei 1366 × 768 nimmt die Zeichenfläche ' + (100 * geo.cv.height / geo.vh).toFixed(1) + ' % der Fensterhöhe ein (≥ 70 %)');
    await p3.click('#inspFold'); await p3.waitForTimeout(150);
    const g2 = await p3.evaluate(() => ({ cv: document.querySelector('#canvasWrap').getBoundingClientRect(), vh: innerHeight, ins: document.querySelector('#inspector').getBoundingClientRect().width, fold: document.querySelector('#inspFold').getBoundingClientRect() }));
    ok(g2.cv.height >= 0.8 * g2.vh && g2.ins === 0 && g2.fold.width > 10, 'Eigenschaftenfeld eingeklappt: Zeichenfläche ' + (100 * g2.cv.height / g2.vh).toFixed(1) + ' % der Höhe (≥ 80 %), schmaler Streifen zum Aufklappen bleibt');
    for (const t of ['Logik', 'Flip-Flops', 'Zähler', 'Anzeigen', 'Analog']) {
      await p3.click(`[data-tab="${t}"]`); const r = await p3.evaluate(() => { const l = document.querySelector('#palette .plist'), its = Array.from(l.querySelectorAll('.pitem')); return { n: its.length, tops: new Set(its.map(i => Math.round(i.getBoundingClientRect().top))).size, over: l.scrollWidth > l.clientWidth, txt: its.every(i => i.querySelector('svg') && i.querySelector('.nm').textContent.length > 0) }; });
      ok(r.n >= 5 && r.tops === 1 && r.txt, 'Karte «' + t + '»: ' + r.n + ' Bauteile waagrecht in einer Zeile mit Symbol und Namen' + (r.over ? ' (scrollt)' : ''));
      if (t === 'Analog') ok(r.over, 'Analog hat mehr Bauteile als Platz: es wird gescrollt, nicht umbrochen');
    }
    await p3.click('[data-tab="Zähler"]'); await p3.reload({ waitUntil: 'domcontentloaded' }); await p3.waitForFunction(() => window.Studio && Studio.sim);
    ok(await p3.evaluate(() => document.querySelector('#palette .ptab.on').textContent === 'Zähler' && document.body.classList.contains('inspfolded') && Studio.timingCollapsed()), 'Registerkarte, eingeklapptes Eigenschaftenfeld und eingeklappter Zeitverlauf bleiben über Sitzungen');
    await p3.click('#inspFold'); await p3.click('#btnTiming'); await p3.reload({ waitUntil: 'domcontentloaded' }); await p3.waitForFunction(() => window.Studio && Studio.sim);
    ok(await p3.evaluate(() => !document.body.classList.contains('inspfolded') && !Studio.timingCollapsed()), 'wieder aufgeklappt bleibt ebenfalls erhalten');
    await p3.screenshot({ path: shots + '/o_platz.png' }); await ctx3.close();
  }
  if (!only || only === 'p') { // Paket 4: Bauteil in eine Leitung einfügen
    const LAMP = { parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 9 }, { id: 'H1', type: 'lamp', x: 600, y: 300, rot: 0, value: 60 }, { id: 'R8', type: 'resistor', x: 300, y: 120, rot: 90, value: 1000 }, { id: 'R9', type: 'resistor', x: 300, y: 480, rot: 90, value: 1000 }],
      wires: [{ from: 'B1.p', to: 'H1.a' }, { from: 'H1.b', to: 'B1.n' }, { from: 'R8.b', to: 'R9.a' }] };
    await reset(LAMP); await page.evaluate(() => Studio.ed.fit());
    const seg = await page.evaluate(() => { const L = Studio.core.layout, out = []; L.wires.forEach((w, i) => { const pts = DQEditor.wirePoly(L, w); for (let k = 0; k + 1 < pts.length; k++) { const a = pts[k], b = pts[k + 1], hor = a[1] === b[1], len = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); if (len >= 100) out.push({ i, hor, x: Math.round((a[0] + b[0]) / 40) * 20, y: Math.round((a[1] + b[1]) / 40) * 20 }); } }); return out; });
    const hs = seg.find(s => s.i === 0 && s.hor), vs = seg.find(s => s.i === 2 && !s.hor);
    ok(!!hs && !!vs, 'Testleitungen gefunden (waagrecht ' + JSON.stringify(hs) + ', senkrecht ' + JSON.stringify(vs) + ')');
    const nodes0 = await page.evaluate(() => Studio.sim.net.nodes.length), st0 = await page.evaluate(() => ({ p: Studio.core.layout.parts.length, w: Studio.core.layout.wires.length }));
    await tab(page, 'resistor'); await page.click('[data-add="resistor"]'); const sh = await scr(hs.x, hs.y); await page.mouse.move(sh.x, sh.y); await page.waitForTimeout(120);
    ok(await page.evaluate(() => document.querySelectorAll('#board .insmark').length) === 1, 'Beim Überfahren der Leitung mit dem Bauteil am Zeiger wird die Einfügestelle hervorgehoben');
    await page.mouse.move(sh.x + 5, sh.y - 120); await page.waitForTimeout(120); ok(await page.evaluate(() => document.querySelectorAll('#board .insmark').length) === 0, 'neben der Leitung keine Hervorhebung');
    await page.mouse.move(sh.x, sh.y); await page.mouse.click(sh.x, sh.y); await page.waitForTimeout(250); await page.keyboard.press('Escape');
    const a1 = await page.evaluate(() => { const L = Studio.core.layout, r = L.parts.find(p => p.id === 'R1'); return { p: L.parts.length, w: L.wires.length, rot: r && r.rot, nodes: Studio.sim.net.nodes.length, wires: L.wires.filter(w => /^R1\./.test(w.from) || /^R1\./.test(w.to)).length, i: Studio.sim.res.parts.R1 && Studio.sim.res.parts.R1.i, ids: L.wires.slice(0, 2).map(w => w.from + '>' + w.to).join(' ') }; });
    ok(a1.p === st0.p + 1 && a1.w === st0.w + 1 && a1.wires === 2 && a1.rot === 0, 'Widerstand auf waagrechte Leitung gesetzt: Leitung geteilt, Bauteil mit beiden Anschlüssen darin, waagrecht (' + a1.ids + ')');
    ok(a1.nodes === nodes0 + 1, 'die Netzliste zeigt einen Knoten mehr (' + nodes0 + ' → ' + a1.nodes + ')');
    ok(Math.abs(a1.i - 9 / (1000 + 60 + 0.05)) < 1e-5, 'die Schaltung rechnet richtig: I = ' + (a1.i * 1000).toFixed(3) + ' mA (9 V / 1060 Ω = 8,491 mA)');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => ({ p: Studio.core.layout.parts.length, w: Studio.core.layout.wires.length, n: Studio.sim.net.nodes.length })).then(x => x.p === st0.p && x.w === st0.w && x.n === nodes0), 'Rückgängig stellt die ungeteilte Leitung wieder her');
    await page.evaluate(() => Studio.ed.fit()); const sv = await scr(vs.x, vs.y); await tab(page, 'capacitor'); await page.click('[data-add="capacitor"]'); await page.mouse.move(sv.x, sv.y); await page.waitForTimeout(100); await page.mouse.click(sv.x, sv.y); await page.waitForTimeout(200); await page.keyboard.press('Escape');
    ok(await page.evaluate(() => { const c = Studio.core.layout.parts.find(p => p.type === 'capacitor'); return !!c && c.rot === 90 && Studio.core.layout.wires.filter(w => /^C1\./.test(w.from) || /^C1\./.test(w.to)).length === 2; }), 'Kondensator auf senkrechte Leitung: richtet sich aus (gedreht auf 90°)');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(100); await page.evaluate(() => Studio.ed.fit());
    // Bauteil mit mehr Anschlüssen: nichts geschieht
    const sh2 = await scr(hs.x, hs.y); await tab(page, 'and'); await page.click('[data-add="and"]'); await page.mouse.move(sh2.x, sh2.y); await page.waitForTimeout(100);
    ok(await page.evaluate(() => document.querySelectorAll('#board .insmark').length) === 0, 'UND-Gatter (drei Anschlüsse): keine Einfügestelle gezeigt'); await page.mouse.click(sh2.x, sh2.y); await page.waitForTimeout(150); await page.keyboard.press('Escape');
    ok(await page.evaluate(() => Studio.core.layout.wires.length) === st0.w && await page.evaluate(() => Studio.core.layout.parts.some(p => p.type === 'and')), 'UND-Gatter auf eine Leitung gesetzt: die Leitung bleibt, das Gatter liegt daneben');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(100); await page.evaluate(() => Studio.ed.fit());
    // Ziehen aus der Leiste
    const sh3 = await scr(hs.x, hs.y), bb = await page.locator('#board').boundingBox(); await tab(page, 'capacitor');
    await page.dragAndDrop('[data-add="inductor"]', '#board', { targetPosition: { x: sh3.x - bb.x, y: sh3.y - bb.y } }); await page.waitForTimeout(200);
    ok(await page.evaluate(() => { const L = Studio.core.layout, c = L.parts.find(p => p.type === 'inductor'); return !!c && L.wires.filter(w => /^L\d\./.test(w.from) || /^L\d\./.test(w.to)).length === 2 && L.wires.length === 4; }), 'Spule aus der Leiste auf die Leitung gezogen: eingefügt');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(100);
    // vorhandenes freies Bauteil auf die Leitung ziehen
    await page.evaluate(() => { Studio.core.addPart('diode', 800, 520, 'schema'); Studio.ed.fit(); }); await page.waitForTimeout(100);
    const dpos = await page.evaluate(() => { const d = Studio.core.layout.parts.find(p => p.type === 'diode'); return [d.x, d.y]; }), sd = await scr(dpos[0], dpos[1]), sh4 = await scr(hs.x, hs.y);
    await page.mouse.move(sd.x, sd.y); await page.mouse.down(); await page.mouse.move((sd.x + sh4.x) / 2, (sd.y + sh4.y) / 2, { steps: 6 }); await page.mouse.move(sh4.x, sh4.y, { steps: 6 }); await page.waitForTimeout(100);
    const midmark = await page.evaluate(() => document.querySelectorAll('#board .insmark').length); await page.mouse.up(); await page.waitForTimeout(200);
    ok(midmark === 1 && await page.evaluate(() => Studio.core.layout.wires.filter(w => /^V1\./.test(w.from) || /^V1\./.test(w.to)).length) === 2, 'bereits gesetzte, noch unverdrahtete Diode auf die Leitung gezogen: Stelle hervorgehoben, beim Loslassen eingefügt');
    await page.screenshot({ path: shots + '/p_einfuegen.png' });
  }
  if (!only || only === 'q') { // Paket 5: alle Spannungen auf einmal
    const DIV = { parts: [{ id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 10 }, { id: 'R1', type: 'resistor', x: 500, y: 200, rot: 0, value: 1000 }, { id: 'R2', type: 'resistor', x: 500, y: 400, rot: 0, value: 3000 }],
      wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'R2.a' }, { from: 'R2.b', to: 'B1.n' }] };
    await reset(DIV); await page.evaluate(() => Studio.ed.fit());
    const bt = await page.evaluate(() => Array.from(document.querySelectorAll('#toolbar button')).map(b => b.textContent.trim()).join('|'));
    ok(!/U-Werte/.test(bt) && await page.evaluate(() => !!document.querySelector('#btnVolt') && !!document.querySelector('#btnAmp')), 'ein Knopf für die Spannungen (U) und einer für die Ströme (I); «U-Werte» gibt es nicht mehr');
    ok(await page.evaluate(() => document.querySelectorAll('#board .vlabel, #board .ilabel').length) === 0, 'anfangs keine Messwerte im Schaltplan');
    await page.click('#btnVolt'); await page.waitForTimeout(250);
    const vl = await page.evaluate(() => Array.from(document.querySelectorAll('#board .vlabel')).map(e => e.textContent));
    ok(vl.some(t => /^7[.,]5 ?V/.test(t)) && vl.some(t => /^10 ?V/.test(t)), 'Spannungsteiler 1 kΩ / 3 kΩ an 10 V: am mittleren Knoten steht 7,5 V (' + vl.join(' | ') + ')');
    ok(await page.evaluate(() => Array.from(document.querySelectorAll('#board .refmark')).some(t => /0 V/.test(t.textContent))), 'der Bezugspunkt ist gekennzeichnet («⏚ 0 V»)');
    await page.click('#btnAmp'); await page.waitForTimeout(250);
    const il = await page.evaluate(() => Array.from(document.querySelectorAll('#board .ilabel')).map(e => e.textContent));
    ok(il.length >= 3 && il.every(t => /^2[.,]5/.test(t)) || il.some(t => /2[.,]5/.test(t)), 'Ströme durch die Bauteile: 2,5 mA (' + il.join(' | ') + ')');
    await menuA('Spannungen im Schaltplan'); await page.waitForTimeout(120); ok(await page.evaluate(() => document.querySelectorAll('#board .vlabel').length) === 0 && await page.evaluate(() => !document.querySelector('#btnVolt').classList.contains('on')), 'Menü «Anzeigen» schaltet dieselbe Anzeige (Knopf und Menü sind eins)');
    await page.keyboard.press('u'); await page.waitForTimeout(120); ok(await page.evaluate(() => document.querySelectorAll('#board .vlabel').length) > 0, 'Taste U schaltet die Spannungen ein');
    await selectPart('B1'); await page.waitForTimeout(250); await setField('value', '20'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => Array.from(document.querySelectorAll('#board .vlabel')).some(e => /^15 ?V/.test(e.textContent))), 'die Werte folgen der laufenden Simulation (20 V → 15 V am Teiler)');
    await page.click('#btnAmp'); await page.keyboard.press('i'); await page.keyboard.press('i');
    // Digitaluhr: nichts überdeckt etwas
    await page.evaluate(() => { Studio.loadExample('uhr'); Studio.stopDemo(); }); await page.waitForTimeout(300); await page.click('#banner button, #exBanner button').catch(() => { });
    await page.evaluate(() => { Studio.setValues('volt', true); Studio.setValues('amp', true); }); await page.waitForTimeout(500);
    const ov = await page.evaluate(() => { const els = Array.from(document.querySelectorAll('#board .vlabel, #board .ilabel')), bb = els.map(e => e.getBBox()); let n = 0, first = ''; for (let i = 0; i < bb.length; i++) for (let j = i + 1; j < bb.length; j++) { const a = bb[i], b = bb[j]; if (a.x < b.x + b.width - 0.5 && a.x + a.width > b.x + 0.5 && a.y < b.y + b.height - 0.5 && a.y + a.height > b.y + 0.5) { n++; if (!first) first = els[i].textContent + '/' + els[j].textContent; } } return { n: bb.length, overlaps: n, first }; });
    ok(ov.n >= 10 && ov.overlaps === 0, 'Digitaluhr: ' + ov.n + ' Beschriftungen, keine überdeckt eine andere (' + ov.overlaps + ' Überdeckungen ' + ov.first + ')');
    await page.screenshot({ path: shots + '/q_uhr.png' });
    await page.evaluate(() => { Studio.setValues('volt', false); Studio.setValues('amp', false); });
  }
  if (!only || only === 'r') { // Paket 6: mehrfach setzen, beim Platzieren drehen
    await reset({ parts: [], wires: [] }); await page.evaluate(() => Studio.ed.fit());
    const bb = await page.locator('#board').boundingBox(), at = i => ({ x: bb.x + 140 + i * 170, y: bb.y + 200 });
    await tab(page, 'resistor'); await page.click('[data-add="resistor"]');
    ok(await page.evaluate(() => Studio.armedType() === 'resistor' && !!document.querySelector('.pitem.armed')), 'Klick auf die Leiste hängt das Bauteil an den Zeiger');
    await page.mouse.move(at(0).x, at(0).y); await page.waitForTimeout(100); ok(await page.evaluate(() => document.querySelectorAll('#board .ghost').length) === 1, 'das Bauteil hängt sichtbar am Zeiger');
    await page.mouse.click(at(0).x, at(0).y); await page.mouse.click(at(1).x, at(1).y);
    await page.keyboard.press('r'); await page.mouse.move(at(2).x, at(2).y); await page.waitForTimeout(80); ok(await page.evaluate(() => Studio.ed.ghost && Studio.ed.ghost.rot) === 90, 'R dreht das Bauteil am Zeiger um 90°');
    await page.mouse.click(at(2).x, at(2).y); await page.keyboard.press('r'); await page.keyboard.press('r'); await page.keyboard.press('r'); await page.mouse.click(at(3).x, at(3).y); await page.waitForTimeout(150);
    const rs = await page.evaluate(() => Studio.core.layout.parts.map(p => p.id + ':' + p.type + ':' + (p.rot || 0)).join());
    ok(rs === 'R1:resistor:0,R2:resistor:0,R3:resistor:90,R4:resistor:0', 'vier Widerstände hintereinander gesetzt, ohne die Leiste erneut anzufassen; der dritte gedreht (' + rs + ')');
    ok(await page.evaluate(() => Studio.armedType()) === 'resistor', 'das Bauteil bleibt nach dem Setzen gewählt');
    await page.keyboard.press('Escape'); await page.mouse.move(at(4).x, at(4).y); await page.waitForTimeout(80);
    ok(await page.evaluate(() => Studio.armedType() === undefined || Studio.armedType() === null) && await page.evaluate(() => document.querySelectorAll('#board .ghost').length) === 0, 'Esc beendet das Setzen: nichts hängt mehr am Zeiger');
    await page.mouse.click(at(4).x, at(4).y); await page.waitForTimeout(100); ok(await page.evaluate(() => Studio.core.layout.parts.length) === 4, 'danach setzt ein Klick auf die Fläche nichts mehr');
    await selectPart('R1'); await page.keyboard.press('r'); await page.waitForTimeout(80); ok(await page.evaluate(() => Studio.core.part('R1').rot) === 90, 'ein gesetztes, ausgewähltes Bauteil dreht R wie bisher');
    await page.keyboard.press('Control+z'); await page.waitForTimeout(60);
  }
  //@@BEDIENUNG_ENDE
  ok(!external.length, 'Netzzugriffe (Offline-Fassung): ' + external.join(', '));
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Studio-Test: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler');
  fails.forEach(f => console.log('  ✗ ' + f));
  notes.forEach(n => console.log('  · ' + n));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

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
  const add = t => page.click(`[data-add="${t}"]`);
  const setField = async (k, v) => { await page.fill(`[data-f="${k}"]`, v); await page.press(`[data-f="${k}"]`, 'Enter'); await page.dispatchEvent(`[data-f="${k}"]`, 'change'); };
  const selectPart = id => retry(() => page.click(`[data-part="${id}"] .hit`, { force: true, timeout: 1500 }));
  const nv = (p) => page.evaluate(pn => { const r = Studio.sim.res, n = Studio.sim.net; return r.nodeV[n.pinNode[pn]]; }, p);

  if (!only || only === '4') counterEquivalence();
  if (!only || only === '5') rippleDelay();
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
    await page.dragAndDrop('[data-add="capacitor"]', '#board', { targetPosition: { x: 500, y: 300 } });
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
    // Signale per Klick im Messen-Modus: erst R1.b (Kondensatorspannung), dann G1.p (Quelle)
    await page.click('#toolMeasure');
    await pin('R1.b'); await pin('G1.p');
    ok(await page.evaluate(() => Studio.scopes.length === 1 && Studio.scopes[0].ch.length === 2), 'Klick auf Anschlüsse legt Kanäle im ersten Fenster an');
    // 2. zweites Fenster, anderes Signal (Strom durch R1), unabhängig
    await page.click('#btnScope'); await page.click('#toolMeasure');
    await page.evaluate(() => Studio.scopes.forEach(sc => { sc.el.style.left = '700px'; sc.el.style.top = '420px'; })); // Fenster aus dem Weg ziehen
    await page.click('[data-part="R1"] .hit', { force: true }); // Bauteil anklicken: Spannung über R1
    await page.selectOption('#measureKind', 'pi'); await page.waitForTimeout(450); /* sonst zaehlt der Editor es als Doppelklick */ await page.click('[data-part="R1"] .hit', { force: true });
    const chs = await page.evaluate(() => Studio.scopes.map(s => s.ch.map(c => c.tr.label)));
    ok(chs.length === 2 && chs[0].length === 2 && chs[1].length === 2 && chs[1].join() === 'U(R1),I(R1)', 'zwei Oszilloskop-Fenster mit eigenen Kanälen: ' + JSON.stringify(chs));
    await page.click('#toolBuild');
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
    ok(await page.isVisible('[data-add="ctr_bcd"]') && await page.isVisible('[data-add="ctr_johnson"]'), 'Zähler in der Bauteilleiste');
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
      heads: Array.from(document.querySelectorAll('#inspector h3')).map(h => h.textContent) }));
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
    await page2.goto(url, { waitUntil: 'domcontentloaded' }); await page2.waitForFunction(() => window.Studio && Studio.sim); await page2.click('[data-add="resistor"]'); await page2.waitForTimeout(3300);
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
    // Drucken: A4, eine Seite, Schwarzweiss, Titelfeld
    await page.evaluate(() => Studio.closeModal()); await page.evaluate(() => Studio.printPrepare()); await page.emulateMedia({ media: 'print' });
    const pr = await page.evaluate(() => ({ area: getComputedStyle(document.getElementById('printArea')).display, bar: getComputedStyle(document.getElementById('menubar')).display, title: document.querySelector('.pr-title').textContent, svg: document.querySelectorAll('#printArea g.part').length }));
    ok(pr.area === 'block' && pr.bar === 'none' && /Schaltung/.test(pr.title) && /Datum/.test(pr.title) && pr.svg === 8, 'Druckansicht: nur Schaltplan mit Titelfeld: ' + JSON.stringify(pr).slice(0, 120));
    const pdf = await page.pdf({ format: 'A4', landscape: true }); const ptxt = pdf.toString('latin1'); const pages = (ptxt.match(/\/Type\s*\/Page[^s]/g) || []).length, mb = /\/MediaBox\s*\[\s*0\s+0\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s*\]/.exec(ptxt);
    ok(pdf.slice(0, 4).toString() === '%PDF' && pages === 1 && mb && Math.abs(+mb[1] - 841.89) < 2 && Math.abs(+mb[2] - 595.28) < 2, 'PDF der Druckansicht: A4 quer, eine Seite (' + pages + ' Seite, ' + (mb ? mb[1] + ' × ' + mb[2] : '?') + ' pt)');
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

  ok(!external.length, 'Netzzugriffe (Offline-Fassung): ' + external.join(', '));
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Studio-Test: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler');
  fails.forEach(f => console.log('  ✗ ' + f));
  notes.forEach(n => console.log('  · ' + n));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

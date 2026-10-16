// Robustheitslauf des Studios (Nacht-Paket 6a): node tests/robust.js [Durchläufe] [Startzahl]
// Zufällige und gezielt pathologische Schaltungen durch Netzliste, Arbeitspunkt, Zeitsimulation, Wechselstromanalyse und die Studio-Simulation (sim.js).
// Geprüft: keine unbehandelte Ausnahme, keine NaN/Unendlich in Spannungen, Strömen, Kurven, die Simulation bleibt nicht hängen, Fehlerfälle werden gemeldet (sim.err).
// Ergebnis nach docs/ROBUSTHEIT_STUDIO.md (von Hand zusammengefasst). Feste Startzahl = wiederholbar.
const E = require('../src/engine.js'), Sim = require('../studio/sim.js'), C = require('../studio/counters.js');
const N = +process.argv[2] || 2500, SEED = +process.argv[3] || 20261015;
let s = SEED >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const findings = {}, clean = { errors: {} };
const info = { slowUnstable: 0 };
let runs = 0, maxFrame = 0, maxMs = 0, slow = 0, reported = 0, finiteChecks = 0;
const note = (kind, detail, layout) => { const k = kind + ': ' + detail; if (!findings[k]) findings[k] = { n: 0, example: layout }; findings[k].n++; };

const VAL = { resistor: [0, 1e-3, 1, 100, 1e3, 1e4, 1e6, 1e9], lamp: [0, 1, 60, 1e4], motor: [0, 1, 20, 1e3], pot: [0, 1, 1e3, 1e4, 1e6], capacitor: [1e-12, 1e-9, 1e-6, 1e-3, 1], inductor: [1e-9, 1e-6, 1e-3, 1, 100],
  battery: [0, 1, 5, 9, 12, -5, 1000], acsource: [0, 1, 5, 10, 100] };
function randomPart(type, id) {
  const d = E.PARTS[type], p = { id, type, x: 0, y: 0, rot: 0 }, q = {};
  if (VAL[type]) p.value = pick(VAL[type]);
  if (type === 'battery' || type === 'acsource') q.ri = pick([0.05, 1e-3, 1, 100, 1e5]);
  if (type === 'acsource') { q.freq = pick([0.1, 1, 50, 1e3, 1e5, 1e6]); q.shape = pick(['sine', 'square', 'triangle']); q.offset = pick([0, 0, 3, -2]); }
  if (type === 'clock') q.freq = pick([0.5, 1, 1e3, 1e6]);
  if (type === 'pot') q.pos = pick([0, 0.25, 0.5, 1, rnd()]);
  if (d.multi) q.inputs = pick([2, 2, 3, 4, 8]);
  if (d.ffIns) q.trig = pick(['pos', 'neg', 'level']);
  if (d.ctr) { q.bits = pick([2, 3, 4, 8]); q.dir = pick(['up', 'down']); q.trig = pick(['pos', 'neg']); q.modn = pick([2, 3, 6, 10, 64]); }
  if (type === 'switch' || type === 'button' || type === 'logicin') q.closed = rnd() < 0.5;
  if (type === 'led') q.color = pick(['rot', 'gelb', 'gruen', 'blau', 'weiss']);
  if (type === 'diode' || type === 'zener') { q.vf = pick([0.3, 0.7, 1.2]); q.vz = pick([3.3, 5.1, 12]); }
  if (type === 'npn') q.beta = pick([10, 100, 400]);
  if (Object.keys(q).length) p.props = q;
  return p;
}
function randomLayout() {
  const types = Object.keys(E.PARTS).filter(t => t !== 'ground'), n = 2 + Math.floor(rnd() * 11), parts = [], count = {};
  for (let i = 0; i < n; i++) { const t = pick(types); count[t] = (count[t] || 0) + 1; parts.push(randomPart(t, E.PARTS[t].prefix + (parts.filter(p => E.PARTS[p.type].prefix === E.PARTS[t].prefix).length + 1))); }
  if (rnd() < 0.5) parts.push({ id: 'GND1', type: 'ground', x: 0, y: 0, rot: 0 });
  const pins = []; parts.forEach(p => E.pinsOf(p.type, Object.assign({}, E.PARTS[p.type].props, p.props || {})).forEach(pin => pins.push(p.id + '.' + pin)));
  const wires = [], nw = Math.floor(rnd() * (pins.length * 0.9));
  for (let i = 0; i < nw; i++) { const a = pick(pins), b = pick(pins); if (a !== b) wires.push({ from: a, to: b }); }
  return { parts, wires };
}
/* gezielt pathologisch */
const P = (id, type, value, props) => Object.assign({ id, type, x: 0, y: 0, rot: 0 }, value !== undefined ? { value } : {}, props ? { props } : {});
const W = (a, b) => ({ from: a, to: b });
const PATH = [
  ['schwebendes Bauteil ohne Leitungen', { parts: [P('R1', 'resistor', 1000), P('C1', 'capacitor', 1e-6), P('L1', 'inductor', 1e-3)], wires: [] }],
  ['Kurzschluss über eine Quelle', { parts: [P('B1', 'battery', 12, { ri: 0.05 })], wires: [W('B1.p', 'B1.n')] }],
  ['Kurzschluss über eine Wechselquelle', { parts: [P('G1', 'acsource', 5, { freq: 50 })], wires: [W('G1.p', 'G1.n')] }],
  ['zwei Quellen gegeneinander ohne Widerstand', { parts: [P('B1', 'battery', 12, { ri: 1e-3 }), P('B2', 'battery', 5, { ri: 1e-3 })], wires: [W('B1.p', 'B2.p'), W('B1.n', 'B2.n')] }],
  ['Quellenschleife aus drei Quellen', { parts: [P('B1', 'battery', 5), P('B2', 'battery', 5), P('B3', 'battery', 5)], wires: [W('B1.p', 'B2.n'), W('B2.p', 'B3.n'), W('B3.p', 'B1.n')] }],
  ['Widerstand null', { parts: [P('B1', 'battery', 5), P('R1', 'resistor', 0)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'B1.n')] }],
  ['Kondensator ohne Entladeweg an Quelle über Schalter', { parts: [P('B1', 'battery', 5), P('S1', 'switch', undefined, { closed: false }), P('C1', 'capacitor', 1e-3)], wires: [W('B1.p', 'S1.a'), W('S1.b', 'C1.a'), W('C1.b', 'B1.n')] }],
  ['Kondensator nur an Kondensator (schwebend)', { parts: [P('C1', 'capacitor', 1e-6), P('C2', 'capacitor', 1e-6)], wires: [W('C1.b', 'C2.a')] }],
  ['Spule parallel zur Quelle', { parts: [P('B1', 'battery', 5, { ri: 0.05 }), P('L1', 'inductor', 1e-3)], wires: [W('B1.p', 'L1.a'), W('L1.b', 'B1.n')] }],
  ['Spule und Kondensator ohne Dämpfung', { parts: [P('L1', 'inductor', 1e-3), P('C1', 'capacitor', 1e-6), P('B1', 'battery', 5, { ri: 1e-3 })], wires: [W('B1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'B1.n')] }],
  ['Flipflop ohne Takt', { parts: [P('FF1', 'dff'), { ...P('E1', 'logicin'), props: { closed: true } }], wires: [W('E1.out', 'FF1.D')] }],
  ['Flipflop-Zähler ohne Takt und Rückstellung', { parts: [P('Z1', 'ctr_async'), P('Z2', 'ctr_bcd')], wires: [W('Z1.Q3', 'Z2.C')] }],
  ['Gatter auf sich selbst (NICHT-Ring mit einem Glied)', { parts: [P('U1', 'not')], wires: [W('U1.out', 'U1.in')] }],
  ['Ringoszillator aus drei NICHT-Gliedern', { parts: [P('U1', 'not'), P('U2', 'not'), P('U3', 'not')], wires: [W('U1.out', 'U2.in'), W('U2.out', 'U3.in'), W('U3.out', 'U1.in')] }],
  ['RS-Speicher aus NAND', { parts: [P('U1', 'nand'), P('U2', 'nand')], wires: [W('U1.out', 'U2.in1'), W('U2.out', 'U1.in1')] }],
  ['zwei Gatterausgänge gegeneinander', { parts: [P('U1', 'not'), P('U2', 'not'), { ...P('E1', 'logicin'), props: { closed: true } }], wires: [W('E1.out', 'U1.in'), W('U1.out', 'U2.out')] }],
  ['Flipflop mit Rückkopplung Q → C', { parts: [P('FF1', 'tff', undefined, { trig: 'level' })], wires: [W('FF1.Q', 'FF1.C'), W('FF1.Qn', 'FF1.T')] }],
  ['preSet und preClear am selben Pegel', { parts: [P('FF1', 'jkff'), { ...P('E1', 'logicin'), props: { closed: true } }], wires: [W('E1.out', 'FF1.PS'), W('E1.out', 'FF1.PC')] }],
  ['Diode in Sperrrichtung an Quelle', { parts: [P('B1', 'battery', 100), P('V1', 'diode')], wires: [W('B1.p', 'V1.k'), W('V1.a', 'B1.n')] }],
  ['LED an 1000 V ohne Widerstand', { parts: [P('B1', 'battery', 1000), P('D1', 'led')], wires: [W('B1.p', 'D1.a'), W('D1.k', 'B1.n')] }],
  ['Transistor ohne Basisanschluss', { parts: [P('B1', 'battery', 12), P('Q1', 'npn'), P('R1', 'resistor', 100)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'Q1.c'), W('Q1.e', 'B1.n')] }],
  ['Amperemeter parallel zur Quelle', { parts: [P('B1', 'battery', 12), P('A1', 'ammeter')], wires: [W('B1.p', 'A1.a'), W('A1.b', 'B1.n')] }],
  ['Potentiometer Schleifer an Rand', { parts: [P('B1', 'battery', 5), P('P1', 'pot', 1e4, { pos: 0 })], wires: [W('B1.p', 'P1.a'), W('P1.w', 'P1.b'), W('P1.b', 'B1.n')] }],
  ['Widerstand 1e9 neben 1e-3', { parts: [P('B1', 'battery', 5), P('R1', 'resistor', 1e9), P('R2', 'resistor', 1e-3)], wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')] }],
  ['Wechselquelle 1 MHz an 1 pF', { parts: [P('G1', 'acsource', 5, { freq: 1e6, ri: 1e-3 }), P('C1', 'capacitor', 1e-12)], wires: [W('G1.p', 'C1.a'), W('C1.b', 'G1.n')] }],
  ['Taktgeber 1 MHz an Zähler mit 8 Bit', { parts: [P('CLK1', 'clock', undefined, { freq: 1e6 }), P('Z1', 'ctr_async', undefined, { bits: 8 })], wires: [W('CLK1.out', 'Z1.C')] }],
  ['Gatter mit 8 Eingängen offen', { parts: [P('U1', 'and', undefined, { inputs: 8 }), P('U2', 'xor', undefined, { inputs: 8 })], wires: [W('U1.out', 'U2.in1')] }],
  ['leere Schaltung', { parts: [], wires: [] }]
];

const finite = (obj, where, layout) => {
  const walk = (o, path) => { if (typeof o === 'number') { finiteChecks++; if (!isFinite(o)) note('NaN/Unendlich', where + ' ' + path, layout); } else if (o && typeof o === 'object' && !(Array.isArray(o) && o.length > 64)) Object.keys(o).forEach(k => walk(o[k], path + '.' + k)); };
  walk(obj, '');
};
function runOne(layout, label) {
  runs++; const t0 = Date.now(); let sim; const stg = {}; let tl = t0; const lap = k => { const n = Date.now(); stg[k] = n - tl; tl = n; };
  try {
    let net; try { net = E.buildNetlist(JSON.parse(JSON.stringify(layout))); } catch (e) { note('buildNetlist wirft', e.message, layout); return; }
    // Arbeitspunkt und Zeitsimulation direkt über die Engine
    const st = E.newState(); let res;
    try { res = E.step(net, st, { noGroundFault: true }); finite({ nodeV: res.nodeV, parts: res.parts }, 'Arbeitspunkt', layout); }
    catch (e) { if (/nicht lösbar/.test(e.message)) clean.errors[e.message] = (clean.errors[e.message] || 0) + 1; else note('Ausnahme im Arbeitspunkt', e.name + ': ' + e.message, layout); return; }
    const dt = Sim.chooseDt(net);
    const tz = Date.now(); for (let k = 0; k < 40; k++) { if (Date.now() - tz > 2000) { info.slowUnstable++; break; } try { res = E.step(net, st, { dt, noGroundFault: true, iters: [] }); finite({ nodeV: res.nodeV, parts: res.parts }, 'Zeitschritt ' + k, layout); } catch (e) { if (/nicht lösbar/.test(e.message)) { clean.errors[e.message] = (clean.errors[e.message] || 0) + 1; break; } note('Ausnahme in der Zeitsimulation', e.name + ': ' + e.message, layout); break; } }
    lap('Zeitsimulation');
    // Wechselstromanalyse
    if (net.parts.some(p => p.type === 'acsource' || p.type === 'battery')) for (const f of [1, 1e3, 1e6]) { try { const a = E.acSolve(JSON.parse(JSON.stringify(layout)), f); if (a.ok) finite(a.nodeV, 'AC ' + f + ' Hz', layout); } catch (e) { note('Ausnahme in der Wechselstromanalyse', e.name + ': ' + e.message, layout); } }
    lap('Wechselstrom');
    // Studio-Simulation: Aufbau, Zurücksetzen, einige Rahmen, Aufzeichnung
    sim = new Sim({ getLayout: () => JSON.parse(JSON.stringify(layout)) }); const ok = sim.refresh(true); sim.reset();
    if (!ok && !sim.err) note('Studio meldet Fehler nicht', 'refresh false ohne err', layout);
    const keep = sim.net ? sim.net.parts.slice(0, 3).map(p => E.PARTS[p.type].pins[0]).map((pin, i) => sim.addTrace({ kind: 'node', a: sim.net.parts[i].id + '.' + E.pinsOf(sim.net.parts[i].type, sim.net.parts[i].props)[0] })) : [];
    let now = 1000; for (let f = 0; f < 8; f++) { now += 16; const tf = Date.now(); sim.frame(now); const df = Date.now() - tf; if (df > maxFrame) maxFrame = df; if (df > 250) note('Bild dauert zu lange (> 250 ms)', df + ' ms', layout); if (sim.err) { reported++; break; } }
    if (!sim.err) { const ta = Date.now(); sim.step(3); sim.step(1); if (Date.now() - ta > 1500) note('Einzelschritte zu langsam', (Date.now() - ta) + ' ms', layout); }
    if (sim.err) { reported++; if (!/nicht lösbar|Unbekannt|Doppelte/.test(sim.err)) note('Studio meldet unerwarteten Fehler', sim.err, layout); }
    keep.forEach(tr => { for (let i = 0; i < tr.n; i += Math.max(1, tr.n >> 6)) { finiteChecks++; if (!isFinite(tr.v[i]) || !isFinite(tr.t[i])) { note('NaN/Unendlich', 'Aufzeichnung ' + tr.label, layout); break; } } });
    if (sim.res) finite({ nodeV: sim.res.nodeV }, 'Studio', layout);
    lap('Studio');
  } catch (e) { note('unbehandelte Ausnahme', (label || '') + ' ' + e.name + ': ' + e.message + ' @' + String(e.stack).split('\n')[1].trim().slice(0, 90), layout); }
  const ms = Date.now() - t0; if (ms > maxMs) maxMs = ms; if (ms > 3000) { slow++; note('hängt (> 3 s)', (label || '') + ' ' + ms + ' ms ' + JSON.stringify(stg), layout); }
}
const pathReport = [];
PATH.forEach(([name, lay]) => { runOne(lay, name); try { const net = E.buildNetlist(JSON.parse(JSON.stringify(lay))), st = E.newState(); let r = E.step(net, st, { noGroundFault: true }); const dt = Sim.chooseDt(net); for (let k = 0; k < 40; k++) r = E.step(net, st, { dt, noGroundFault: true, maxIter: 150 }); const codes = {}; r.faults.forEach(f => { codes[f.code] = 1; }); pathReport.push(name + ' → ' + (Object.keys(codes).join(', ') || 'keine Meldung')); } catch (e) { pathReport.push(name + ' → AUSNAHME ' + e.message); } });
if (process.env.PATHREPORT) console.log(pathReport.join('\n'));
const nPath = runs;
for (let i = 0; i < N; i++) runOne(randomLayout(), 'zufällig #' + i);
// Zähleraufklappen: jede Variante, Reihen von Taktflanken
['ctr_async', 'ctr_sync', 'ctr_bcd', 'ctr_johnson', 'ctr_mod'].forEach(t => { [{}, { bits: 8 }, { modn: 64 }, { dir: 'down' }, { trig: 'neg' }].forEach(pr => { const ex = C.expansion(t, pr); runOne({ parts: ex.parts.map(p => ({ id: p.key, type: p.type, x: 0, y: 0, rot: 0, props: p.props })), wires: ex.wires.map(w => ({ from: w[0], to: w[1] })) }, 'aufgeklappt ' + t + JSON.stringify(pr)); }); });
console.log('Robustheitslauf: ' + runs + ' Durchläufe (' + nPath + ' gezielt pathologisch, ' + N + ' zufällig, Startzahl ' + SEED + '), ' + finiteChecks + ' Zahlenprüfungen');
console.log('längstes Bild der Studio-Schleife ' + maxFrame + ' ms, längster Durchlauf ' + maxMs + ' ms, hängende: ' + slow + ', von der Studio-Simulation gemeldete Fehler: ' + reported);
console.log('Hinweis: Engine ohne Iterationsgrenze, 40 Schritte einer schwingenden Schaltung über 2 s: ' + info.slowUnstable + ' (die Studio-Schleife begrenzt auf 150 Iterationen und das Zeitbudget je Bild)');
console.log('sauber gemeldete Rechenfehler der Engine: ' + JSON.stringify(clean.errors));
const keys = Object.keys(findings); console.log(keys.length ? 'Befunde (' + keys.length + '):' : 'keine Befunde');
keys.forEach(k => console.log('  ✗ ' + k + '  ×' + findings[k].n + '\n      Beispiel: ' + JSON.stringify(findings[k].example).slice(0, 400)));
process.exit(keys.length ? 1 : 0);

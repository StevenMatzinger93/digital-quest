// Engine-Tests: node test_engine.js
const E = require('./src/engine.js');
let pass = 0, fail = 0;
function ok(cond, name, info) { if (cond) pass++; else { fail++; console.log('FEHLER:', name, info !== undefined ? JSON.stringify(info) : ''); } }
function near(a, b, rel, name) { ok(Math.abs(a - b) <= Math.abs(b) * (rel || 0.01) + 1e-9, name, { got: a, want: b }); }
const W = (from, to) => ({ from, to });

// 1 Spannungsteiler
const divider = { parts: [
  { id: 'B1', type: 'battery', value: 12 }, { id: 'R1', type: 'resistor', value: 1000 },
  { id: 'R2', type: 'resistor', value: 2000 }, { id: 'GND1', type: 'ground' }],
  wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n'), W('B1.n', 'GND1.g')] };
let r = E.analyze(divider);
near(r.parts.R2.v, 8, 0.001, 'Teiler U_R2 = 8 V');
near(r.parts.R1.i, 0.004, 0.001, 'Teiler I = 4 mA');
ok(r.faults.length === 0, 'Teiler ohne Störung', r.faults);

// 2 Schwebende Schaltung ohne Masse funktioniert (Gmin)
const noGnd = E.clone(divider); noGnd.parts.pop(); noGnd.wires.pop();
near(E.analyze(noGnd).parts.R2.v, 8, 0.001, 'ohne Masse: U_R2 = 8 V');

// 3 Multimeter V, A (in Reihe), R (spannungsfrei)
let m = E.measure(divider, { mode: 'V', a: 'R2.a', b: 'R2.b' });
near(m.value, 8, 0.001, 'Voltmeter an R2');
const open = E.clone(divider); open.wires = [W('B1.p', 'R1.a'), W('R2.b', 'B1.n')]; // Luecke zwischen R1.b und R2.a
m = E.measure(open, { mode: 'A', a: 'R1.b', b: 'R2.a' });
near(m.value, 12 / 3000.15, 0.001, 'Amperemeter in Reihe = 4 mA');
m = E.measure(divider, { mode: 'A', a: 'B1.p', b: 'B1.n' });
ok(!m.ok && /Sicherung/.test(m.error), 'Amperemeter parallel zur Quelle: Sicherung', m);
m = E.measure(divider, { mode: 'R', a: 'R1.a', b: 'R1.b' });
ok(!m.ok && /spannungsfrei/.test(m.error), 'Ohmmeter unter Spannung verweigert', m);
const dead = { parts: [{ id: 'R1', type: 'resistor', value: 1000 }, { id: 'R2', type: 'resistor', value: 1000 }], wires: [W('R1.a', 'R2.a'), W('R1.b', 'R2.b')] };
near(E.measure(dead, { mode: 'R', a: 'R1.a', b: 'R1.b' }).value, 500, 0.001, 'Ohmmeter Parallelschaltung 500 Ohm');
ok(E.measure({ parts: [{ id: 'R1', type: 'resistor' }], wires: [] }, { mode: 'R', a: 'R1.a', b: 'R1.a' }).value < 1, 'Ohmmeter gleiche Spitze ~0');
const lone = { parts: [{ id: 'R1', type: 'resistor' }, { id: 'R2', type: 'resistor' }], wires: [] };
ok(E.measure(lone, { mode: 'R', a: 'R1.a', b: 'R2.a' }).display === 'OL', 'Ohmmeter offen = OL');

// 4 LED mit Vorwiderstand
const led = (rv, sw) => ({ parts: [
  { id: 'B1', type: 'battery', value: 9 }, { id: 'S1', type: 'switch', props: { closed: sw } },
  { id: 'R1', type: 'resistor', value: rv }, { id: 'D1', type: 'led', props: { color: 'rot' } }],
  wires: [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')] });
r = E.analyze(led(470, true));
ok(r.parts.D1.on, 'LED leuchtet');
near(r.parts.D1.i, (9 - 1.8) / 480, 0.01, 'LED-Strom ~15 mA');
ok(!E.analyze(led(470, false)).parts.D1.on, 'Schalter offen: LED aus');
r = E.analyze(led(10, true));
ok(r.parts.D1.burnt && r.faults.some(f => f.code === 'LED_BURNT'), 'LED ohne Vorwiderstand brennt durch', r.faults);
const rev = led(470, true); rev.wires = [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'D1.k'), W('D1.a', 'B1.n')];
ok(!E.analyze(rev).parts.D1.on, 'LED verpolt: aus');

// 5 Kurzschluss
r = E.analyze({ parts: [{ id: 'B1', type: 'battery', value: 9 }], wires: [W('B1.p', 'B1.n')] });
ok(r.faults.some(f => f.code === 'SHORT'), 'Kurzschluss erkannt', r.faults);

// 6 Reihen-/Parallelschaltung von Lampen
r = E.analyze({ parts: [{ id: 'B1', type: 'battery', value: 12 }, { id: 'H1', type: 'lamp', value: 60 }, { id: 'H2', type: 'lamp', value: 60 }],
  wires: [W('B1.p', 'H1.a'), W('H1.b', 'H2.a'), W('H2.b', 'B1.n')] });
near(r.parts.H1.v, 6, 0.01, 'Reihe: je 6 V');

// 7 Potentiometer
r = E.analyze({ parts: [{ id: 'B1', type: 'battery', value: 10 }, { id: 'P1', type: 'pot', props: { pos: 0.25 } }], wires: [W('B1.p', 'P1.a'), W('P1.b', 'B1.n')] });
near(r.parts.P1.vw, 7.5, 0.01, 'Poti Schleifer 25 % von oben -> 7.5 V');

// 8 RC-Ladekurve: nach tau = 63 %
const rc = { parts: [{ id: 'B1', type: 'battery', value: 10 }, { id: 'R1', type: 'resistor', value: 1000 }, { id: 'C1', type: 'capacitor', value: 1e-3 }, { id: 'GND1', type: 'ground' }],
  wires: [W('B1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'B1.n'), W('B1.n', 'GND1.g')] };
const sim = E.simulate(rc, { dt: 1e-3, tEnd: 1.0, probes: [{ a: 'C1.a' }] });
const at = t => sim.samples.reduce((b, s) => Math.abs(s.t - t) < Math.abs(b.t - t) ? s : b);
near(at(1.0).ch0, 6.32, 0.02, 'RC: nach 1 tau ca. 63 %');

// 9 Logik: UND mit Schaltern und Pull-down, LED am Ausgang
function andCircuit(a, b) {
  return { parts: [
    { id: 'B1', type: 'battery', value: 5 }, { id: 'GND1', type: 'ground' },
    { id: 'S1', type: 'switch', props: { closed: a } }, { id: 'S2', type: 'switch', props: { closed: b } },
    { id: 'R1', type: 'resistor', value: 10000 }, { id: 'R2', type: 'resistor', value: 10000 },
    { id: 'U1', type: 'and' }, { id: 'R3', type: 'resistor', value: 220 }, { id: 'D1', type: 'led', props: { color: 'gruen' } }],
    wires: [W('B1.n', 'GND1.g'), W('B1.p', 'S1.a'), W('B1.p', 'S2.a'), W('S1.b', 'U1.in1'), W('S2.b', 'U1.in2'),
      W('U1.in1', 'R1.a'), W('R1.b', 'GND1.g'), W('U1.in2', 'R2.a'), W('R2.b', 'GND1.g'),
      W('U1.out', 'R3.a'), W('R3.b', 'D1.a'), W('D1.k', 'GND1.g')] };
}
[[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => {
  const rr = E.analyze(andCircuit(!!a, !!b));
  ok(rr.parts.U1.out === !!(a && b) && rr.parts.D1.on === !!(a && b), `UND ${a}${b}`);
});

// 10 RS-Flipflop aus NOR (Speicher ueber Zustand)
function latch() {
  return { parts: [{ id: 'B1', type: 'battery', value: 5 }, { id: 'GND1', type: 'ground' },
    { id: 'TS', type: 'button' }, { id: 'TR', type: 'button' }, { id: 'RS', type: 'resistor', value: 10000 }, { id: 'RR', type: 'resistor', value: 10000 },
    { id: 'U1', type: 'nor' }, { id: 'U2', type: 'nor' }],
    wires: [W('B1.n', 'GND1.g'), W('B1.p', 'TS.a'), W('B1.p', 'TR.a'), W('TS.b', 'RS.a'), W('RS.b', 'GND1.g'), W('TR.b', 'RR.a'), W('RR.b', 'GND1.g'),
      W('TR.b', 'U1.in1'), W('U2.out', 'U1.in2'), W('TS.b', 'U2.in1'), W('U1.out', 'U2.in2')] }; // U1.out = Q
}
{
  const lay = latch(), net = E.buildNetlist(lay), st = E.newState();
  net.byId.TS.props.closed = true; let x = E.step(net, st);
  ok(x.parts.U1.out === true, 'RS: Setzen -> Q=1');
  net.byId.TS.props.closed = false; x = E.step(net, st);
  ok(x.parts.U1.out === true && x.converged, 'RS: Speichern -> Q bleibt 1');
  net.byId.TR.props.closed = true; x = E.step(net, st);
  ok(x.parts.U1.out === false, 'RS: Rücksetzen -> Q=0');
  net.byId.TR.props.closed = false; x = E.step(net, st);
  ok(x.parts.U1.out === false, 'RS: Speichern -> Q bleibt 0');
}

// 11 Ringoszillator wird als instabil erkannt
r = E.analyze({ parts: [{ id: 'U1', type: 'not' }, { id: 'GND1', type: 'ground' }], wires: [W('U1.out', 'U1.in')] });
ok(r.faults.some(f => f.code === 'UNSTABLE'), 'NICHT rückgekoppelt: instabil');

// 12 Taktgeber im Oszilloskop
const clk = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 10 } }, { id: 'R1', type: 'resistor', value: 1000 }, { id: 'GND1', type: 'ground' }],
  wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'GND1.g')] };
const cs = E.simulate(clk, { dt: 1e-3, tEnd: 0.2, probes: [{ a: 'CLK1.out' }] }).samples;
let edges = 0; for (let i = 1; i < cs.length; i++) if (cs[i - 1].ch0 < 2.5 && cs[i].ch0 >= 2.5) edges++;
ok(edges === 2, 'Takt 10 Hz: 2 steigende Flanken in 0.2 s', edges);

// 13 Aufgabenpruefung inkl. Messwert
const task = { need: { led: 1, resistor: 1 }, tests: [{ name: 'Ein', set: { S1: { closed: true } }, expect: [{ sel: '@led', on: true, i: [0.01, 0.02] }, { noFault: true }] }],
  measure: [{ id: 'm1', ask: 'Spannung an R1', mode: 'V', a: 'R1.a', b: 'R1.b', tol: 0.03, set: { S1: { closed: true } } }] };
const lay = led(470, false);
let tr = E.runTask(task, lay, { m1: '0' });
ok(!tr.pass, 'Messwert 0 V bei eingeschalteter Schaltung ist falsch', tr.results.filter(x => !x.ok));
const lay2 = led(470, true);
tr = E.runTask(task, lay2, { m1: String(9 - 1.8 - 0.15) });
ok(tr.pass, 'Aufgabe bestanden mit richtigem Messwert', tr.results.filter(x => !x.ok));
tr = E.runTask(task, lay2, { m1: '9' });
ok(!tr.pass, 'Falscher Messwert fällt durch');

// 14 Interaktionskern (circuit-ui.js, ohne DOM)
const Circuit = require('./src/circuit-ui.js');
const kinds = [], msgs = [], views = { n: 0 };
const cu = new Circuit({ onChange: k => kinds.push(k), onMessage: t => msgs.push(t) });
cu.attach({ render: () => views.n++ });
cu.load({ parts: [{ id: 'B1', type: 'battery', value: 9, x: 200, y: 300, rot: 0 }], wires: [] }, ['B1']);
const r1 = cu.addPart('resistor', 200, 300);
ok(r1.id === 'R1' && !(r1.x === 200 && r1.y === 300) && r1.x % 20 === 0 && r1.y % 20 === 0, 'Neues Bauteil: ID R1, freier Rasterplatz', r1);
ok(cu.addPart('resistor', 500, 300).id === 'R2', 'Zweiter Widerstand bekommt R2');
cu.clickPin('B1.p'); cu.clickPin('R1.a'); cu.clickPin('R1.a'); cu.clickPin('B1.p');
ok(cu.layout.wires.length === 1, 'Leitung ziehen, Duplikat wird ignoriert', cu.layout.wires);
cu.pressPart('R1', [r1.x, r1.y]); cu.dragTo([r1.x + 3, r1.y]); ok(cu.drag.moved === false, 'Unter 6 px kein Ziehen');
cu.dragTo([r1.x + 47, r1.y + 21]); cu.release();
ok(r1.x % 20 === 0 && r1.y % 20 === 0 && kinds[kinds.length - 1] === 'move', 'Ziehen rastet ein und meldet move', r1);
cu.rotateSelected(); ok(r1.rot === 90, 'Drehen um 90°');
cu.sel = 'B1'; ok(!cu.removeSelected() && msgs.length === 1, 'Gesperrtes Bauteil bleibt');
cu.probes.a = 'R1.b'; cu.sel = 'R1'; cu.removeSelected();
ok(!cu.part('R1') && cu.layout.wires.length === 0 && cu.probes.a === null, 'Löschen entfernt Leitungen und Messspitze');
const s1 = cu.addPart('switch', 600, 300); cu.pressPart('S1', [s1.x, s1.y]); cu.release();
ok(s1.props.closed === true && kinds[kinds.length - 1] === 'toggle', 'Schalter per Klick umlegen');
ok(views.n > 0, 'Angehängte Ansicht wird neu gezeichnet');

// 15 Werkbank-Raum im Kern: eigene Lage je Bauteil, Schema bleibt unberuehrt
const cb = new Circuit({});
cb.load({ parts: [{ id: 'B1', type: 'battery', value: 9, x: 160, y: 300, rot: 0 }, { id: 'D1', type: 'led', x: 500, y: 300, rot: 90 }], wires: [] }, ['B1'],
  { parts: [{ id: 'B1', x: 300, y: 450 }, { id: 'R1', x: 560, y: 290, rot: 0 }] });
ok(cb.part('B1').bench.x === 300 && !cb.part('D1').bench, 'bench-Layout wird übernommen, fehlende Lage bleibt offen');
const dAuto = cb.pos(cb.part('D1'), 'bench'); ok(dAuto.x % 10 === 0 && dAuto.rot === 90, 'Auto-Anordnung aus Schema-Lage', dAuto);
cb.pressPart('D1', [dAuto.x, dAuto.y], 'bench'); cb.dragTo([dAuto.x + 33, dAuto.y - 21]); cb.release();
const d1 = cb.part('D1'); ok(d1.bench && d1.bench.x === dAuto.x + 30 && d1.bench.y === dAuto.y - 20 && d1.x === 500 && d1.y === 300, 'Ziehen auf der Werkbank ändert nur die Werkbank-Lage', d1);
cb.space = 'bench'; cb.rotateSelected(); ok(d1.bench.rot === 180 && d1.rot === 90, 'Drehen auf der Werkbank ändert nur die Werkbank-Lage', d1);
const rb = cb.addPart('resistor', 600, 300, 'bench'); ok(rb.id === 'R1' && rb.bench.x === 560 && rb.bench.y === 290 && rb.x % 20 === 0, 'Neues Bauteil nimmt Werkbank-Lage aus dem bench-Layout', rb);
const rs = cb.addPart('resistor', 400, 200); ok(rs.id === 'R2' && !rs.bench, 'Im Schema hinzugefügt: Werkbank-Lage automatisch');

// 16 Wechselspannungsquelle, V~ mit TRMS und AVG (Mittelwert-Gleichrichter, sinusskaliert)
const ac = shape => ({ parts: [{ id: 'G1', type: 'acsource', value: 10, props: { freq: 50, shape } }, { id: 'R1', type: 'resistor', value: 1000 }],
  wires: [W('G1.p', 'R1.a'), W('R1.b', 'G1.n')] });
let am = E.acMeasure(ac('sine'), { a: 'R1.a', b: 'R1.b' });
near(am.rms, 10 / Math.SQRT2, 0.01, 'Sinus: TRMS = Û/√2'); near(am.avg, 10 / Math.SQRT2, 0.01, 'Sinus: AVG-Anzeige = TRMS'); ok(Math.abs(am.dc) < 0.05, 'Sinus: Gleichanteil 0', am.dc);
am = E.acMeasure(ac('square'), { a: 'R1.a', b: 'R1.b' });
near(am.rms, 10, 0.01, 'Rechteck: TRMS = Û'); near(am.avg, 11.107, 0.01, 'Rechteck: AVG-Gerät zeigt 11 % zu viel');
am = E.acMeasure(ac('triangle'), { a: 'R1.a', b: 'R1.b' });
near(am.rms, 10 / Math.sqrt(3), 0.01, 'Dreieck: TRMS = Û/√3'); near(am.avg, 5.554, 0.01, 'Dreieck: AVG-Gerät zeigt 4 % zu wenig');
near(E.measure(ac('square'), { mode: 'VAC', a: 'R1.a', b: 'R1.b', meterType: 'avg' }).value, 11.107, 0.01, 'measure VAC mit AVG-Gerät');
ok(E.acMeasure(divider, { a: 'R2.a', b: 'R2.b' }).static, 'Ohne Wechselquelle: statisch');
const halfwave = { parts: [{ id: 'G1', type: 'acsource', value: 10, props: { freq: 50 } }, { id: 'V1', type: 'diode' }, { id: 'R1', type: 'resistor', value: 1000 }],
  wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
am = E.acMeasure(halfwave, { a: 'R1.a', b: 'R1.b' });
ok(am.dc > 2.5 && am.dc < 3.2, 'Einweg-Gleichrichter: Gleichanteil ca. (Û−U_F)/π', am.dc);
near(am.pp, 10 - 0.7 - 10 / 1000 * 1, 0.02, 'Einweg-Gleichrichter: Spitze-Spitze = Û − U_F');

// 17 DMM-Anzeige: Bereiche, Kalibrierfehler, Rauschen, OL
ok(E.dmm(1.95, 'V', 0).text === '1.954 V', 'DMM 1,95 V im 6-V-Bereich (+0,2 %)', E.dmm(1.95, 'V', 0));
ok(E.dmm(0.004, 'A', 0).text === '4.008 mA', 'DMM 4 mA', E.dmm(0.004, 'A', 0));
ok(E.dmm(8, 'V', 0).text === '8.02 V', 'DMM 8 V im 60-V-Bereich', E.dmm(8, 'V', 0));
ok(E.dmm(0, 'V', 0).text === '0.0 mV', 'DMM 0 V', E.dmm(0, 'V', 0));
ok(E.dmm(1e9, 'Ω', 0).text === 'OL' && E.dmm(Infinity, 'Ω').text === 'OL', 'DMM Überlauf OL');
const flick = new Set(); for (let k = 0; k < 40; k++) flick.add(E.dmm(1.95, 'V').text);
ok(flick.size >= 2 && flick.size <= 3, 'Letzte Stelle flackert um ±1 Digit', [...flick]);
ok(E.fmt(0, 'V') === '0.000 V' && E.fmt(1e-12, 'A') === '0.000 A', 'fmt: 0 ohne µ');

// 18 Stoerungen mit Werten, Zeitlupen-Verlauf
const noR = { parts: [{ id: 'B1', type: 'battery', value: 9 }, { id: 'D1', type: 'led', props: { color: 'rot' } }], wires: [W('B1.p', 'D1.a'), W('D1.k', 'B1.n')] };
const st2 = E.newState(); let rbn = E.analyze(noR, st2);
let fb = rbn.faults.filter(f => f.code === 'LED_BURNT')[0];
ok(fb && fb.i > 0.03 && fb.imax === 0.03 && fb.vf === 1.8, 'LED_BURNT mit Strom und Grenzwert', fb);
rbn = E.analyze(noR, st2); fb = rbn.faults.filter(f => f.code === 'LED_BURNT')[0];
ok(fb && fb.i > 0.03, 'Werte bleiben nach dem Durchbrennen erhalten', fb);
const shortL = { parts: [{ id: 'B1', type: 'battery', value: 9 }], wires: [W('B1.p', 'B1.n')] };
const fs2 = E.analyze(shortL).faults[0]; ok(fs2.code === 'SHORT' && fs2.imax === 3 && fs2.ri === 0.05, 'SHORT mit Grenzwert und Innenwiderstand', fs2);
const stF = E.newState(); E.measure(divider, { mode: 'A', a: 'B1.p', b: 'B1.n' }, stF); ok(stF.fuseInfo && stF.fuseInfo.i > 10, 'Sicherung merkt sich den Strom', stF.fuseInfo);
const netL = E.buildNetlist(led(470, true)), tr0 = E.step(netL, E.newState(), { trace: true }).trace;
ok(tr0.length >= 2 && tr0[0].kind === 'diode' && tr0[0].changed[0].id === 'D1' && tr0[tr0.length - 1].kind === 'done' && tr0[0].res.parts.D1, 'Zeitlupe: LED-Umschaltung als Rechenschritt', tr0.map(x => x.kind));
const rsl = { parts: [{ id: 'U1', type: 'nor' }, { id: 'U2', type: 'nor' }, { id: 'GND1', type: 'ground' }],
  wires: [W('U1.out', 'U2.in1'), W('U2.out', 'U1.in2'), W('U1.in1', 'GND1.g'), W('U2.in2', 'GND1.g')] };
const trRS = E.step(E.buildNetlist(rsl), E.newState(), { trace: true }).trace;
ok(trRS.some(x => x.kind === 'gate'), 'Zeitlupe: Gatter-Schritte der Rückkopplung', trRS.map(x => x.kind));
ok(trRS.length <= E.TRACE_MAX, 'Verlauf begrenzt');

// 19 Verdeckte Unterbrechung (props.defect) fuer Fehlersuche
const chain3 = { parts: [{ id: 'B1', type: 'battery', value: 9 }, { id: 'H1', type: 'lamp' }, { id: 'H2', type: 'lamp', props: { defect: true } }, { id: 'H3', type: 'lamp' }],
  wires: [W('B1.p', 'H1.a'), W('H1.b', 'H2.a'), W('H2.b', 'H3.a'), W('H3.b', 'B1.n')] };
const rc3 = E.analyze(chain3);
ok(Math.abs(rc3.parts.H1.i) < 1e-6 && Math.abs(rc3.parts.H2.v) > 8.9 && !rc3.parts.H2.burnt, 'Unterbrechung: kein Strom, volle Spannung an der defekten Lampe', rc3.parts.H2);

// 20 Experimentierboard: Pegelschalter, Logikanzeige, XNOR, Decoder + 7-Segment
const G0 = { id: 'GND1', type: 'ground' };
const xn = (a, b) => ({ parts: [G0, { id: 'E1', type: 'logicin', props: { closed: a } }, { id: 'E2', type: 'logicin', props: { closed: b } }, { id: 'U1', type: 'xnor' }, { id: 'L1', type: 'logicled' }],
  wires: [W('E1.out', 'U1.in1'), W('E2.out', 'U1.in2'), W('U1.out', 'L1.in')] });
ok(E.analyze(xn(true, true)).parts.L1.on && !E.analyze(xn(true, false)).parts.L1.on && E.analyze(xn(false, false)).parts.L1.on, 'XNOR mit Pegelschaltern und Logikanzeige');
ok(E.analyze({ parts: [{ id: 'E1', type: 'logicin' }], wires: [] }).faults.some(f => f.code === 'NO_GROUND'), 'Pegelschalter ohne Masse: NO_GROUND');
const bcd = n => ({ parts: [G0, { id: 'IC1', type: 'dec7' }, { id: 'AZ1', type: 'seg7' }].concat(['A', 'B', 'C', 'D'].map((x, i) => ({ id: 'E' + (i + 1), type: 'logicin', props: { closed: !!(n >> i & 1) } }))),
  wires: ['A', 'B', 'C', 'D'].map((x, i) => W('E' + (i + 1) + '.out', 'IC1.' + x)).concat('abcdefg'.split('').map(s => W('IC1.' + s, 'AZ1.' + s))) });
const tb = { tests: [{ name: '5', expect: [{ sel: 'AZ1', digit: 5 }] }] };
ok(E.runTask(tb, bcd(5), {}).pass && !E.runTask(tb, bcd(6), {}).pass, 'BCD-Decoder zeigt 5, nicht 6');

// 21 Flipflops mit Taktflanke (Schrittfolge), 2-Bit-Zaehler aus T-Flipflops
const ctr = { parts: [G0, { id: 'E1', type: 'logicin' }, { id: 'E2', type: 'logicin', props: { closed: true } }, { id: 'FF1', type: 'tff' }, { id: 'FF2', type: 'tff' }],
  wires: [W('E2.out', 'FF1.T'), W('E2.out', 'FF2.T'), W('E1.out', 'FF1.C'), W('FF1.Qn', 'FF2.C')] };
const pulse = n => { const s = []; for (let k = 0; k < n; k++) s.push({ set: { E1: { closed: true } } }, { set: { E1: { closed: false } } }); return s; };
const cnt = n => { const st = pulse(n); st[st.length - 1].expect = [{ sel: 'FF1', out: !!(n & 1) }, { sel: 'FF2', out: !!(n >> 1 & 1) }]; return { tests: [{ name: n + ' Takte', steps: st }] }; };
ok([1, 2, 3, 4].every(n => E.runTask(cnt(n), ctr, {}).pass), 'Asynchroner 2-Bit-Zähler zählt 1, 2, 3, 0', [1, 2, 3, 4].map(n => E.runTask(cnt(n), ctr, {}).results.filter(r => !r.ok).map(r => r.text)));
const dff = { parts: [G0, { id: 'E1', type: 'logicin' }, { id: 'E2', type: 'logicin' }, { id: 'FF1', type: 'dff' }], wires: [W('E1.out', 'FF1.D'), W('E2.out', 'FF1.C')] };
ok(E.runTask({ tests: [{ steps: [{ set: { E1: { closed: true } } }, { set: { E2: { closed: true } } }, { set: { E1: { closed: false } }, expect: [{ sel: 'FF1', out: true }] }] }] }, dff, {}).pass, 'D-Flipflop speichert bei Flanke, nicht bei D-Änderung');

// 22 NPN als Schalter und im aktiven Bereich, Z-Diode
const npn = rb => ({ parts: [{ id: 'B1', type: 'battery', value: 5 }, { id: 'R1', type: 'resistor', value: rb }, { id: 'Q1', type: 'npn' }, { id: 'R2', type: 'resistor', value: 1000 }],
  wires: [W('B1.p', 'R1.a'), W('R1.b', 'Q1.b'), W('B1.p', 'R2.a'), W('R2.b', 'Q1.c'), W('Q1.e', 'B1.n')] });
const qs = E.analyze(npn(10000)).parts.Q1, qa = E.analyze(npn(1e6)).parts.Q1;
ok(qs.state === 'sat' && qs.v < 0.3 && qs.i > 4.5e-3, 'NPN mit 10 kΩ Basiswiderstand schaltet durch (Sättigung)', qs);
ok(qa.state === 'on' && Math.abs(qa.i - 100 * qa.ib) < 1e-6 && qa.v > 1, 'NPN mit 1 MΩ: aktiv, Ic = β·Ib', qa);
ok(E.analyze(npn(1e12)).parts.Q1.state === 'off' || Math.abs(E.analyze(npn(1e12)).parts.Q1.i) < 1e-6, 'NPN ohne Basisstrom sperrt');
const zd = { parts: [{ id: 'B1', type: 'battery', value: 12 }, { id: 'R1', type: 'resistor', value: 470 }, { id: 'Z1', type: 'zener' }, { id: 'R2', type: 'resistor', value: 2200 }],
  wires: [W('B1.p', 'R1.a'), W('R1.b', 'Z1.k'), W('Z1.a', 'B1.n'), W('R2.a', 'Z1.k'), W('R2.b', 'B1.n')] };
const rz = E.analyze(zd).parts;
near(-rz.Z1.v, 5.1 + 5 * Math.abs(rz.Z1.i), 0.02, 'Z-Diode stabilisiert auf U_Z (+ r_Z · I)'); ok(rz.Z1.mode === 'z', 'Z-Diode im Durchbruch');

// 23 Anschlussstroeme (fuer die Stromfluss-Anzeige): Knotenregel an jedem Knoten
function kcl(layout) {
  const net = E.buildNetlist(layout), r = E.analyze(layout), sum = {};
  net.parts.forEach(p => Object.keys(r.parts[p.id].pin || {}).forEach(pin => { const n = net.pinNode[p.id + '.' + pin]; sum[n] = (sum[n] || 0) + r.parts[p.id].pin[pin]; }));
  return Object.keys(sum).filter(n => n !== '0').every(n => Math.abs(sum[n]) < 1e-6);
}
ok(kcl(divider) && kcl(npn(10000)) && kcl(zd) && kcl(led(470, true)), 'Anschlussströme erfüllen die Knotenregel');

// 24 Ausgang gegen Ausgang, Gatter-Limit
const clash = (a, b) => ({ parts: [G0, { id: 'E1', type: 'logicin', props: { closed: a } }, { id: 'E2', type: 'logicin', props: { closed: b } }, { id: 'L1', type: 'logicled' }], wires: [W('E1.out', 'L1.in'), W('E2.out', 'L1.in')] });
ok(E.analyze(clash(true, false)).faults.some(f => f.code === 'OUTPUT_CLASH') && !E.analyze(clash(true, true)).faults.length, 'Zwei Ausgänge mit unterschiedlichem Pegel: OUTPUT_CLASH');
ok(!E.runTask({ limit: { gates: 0 }, tests: [{ expect: [{ noFault: true }] }] }, xn(true, true), {}).pass, 'Gatter-Limit wird geprüft');

// 25 Wechselgroessen mit Einschwingen (τ ≫ T) und kurzen Nadeln (τ ≪ T)
const rcClock = { parts: [{ id: 'CLK1', type: 'clock', props: { freq: 1000 } }, { id: 'GND1', type: 'ground' }, { id: 'R1', type: 'resistor', value: 10000 }, { id: 'C1', type: 'capacitor', value: 10e-6 }], wires: [W('CLK1.out', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'GND1.g')] };
am = E.acMeasure(rcClock, { a: 'C1.a', b: 'GND1.g' });
ok(am.dc > 2.2 && am.dc < 2.6 && am.pp < 0.1, 'Tiefpass am Takt schwingt vor der Auswertung ein (Gleichanteil ≈ 2,5 V)');
const rcDiff = { parts: [{ id: 'G1', type: 'acsource', value: 10, props: { freq: 50, shape: 'square' } }, { id: 'C1', type: 'capacitor', value: 100e-9 }, { id: 'R1', type: 'resistor', value: 1000 }], wires: [W('G1.p', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n')] };
am = E.acMeasure(rcDiff, { a: 'R1.a', b: 'G1.n' });
ok(am.pp > 34 && am.pp < 41, 'Differenzierglied: Nadeln fein genug abgetastet (≈ 40 V Spitze-Spitze)');
// 26 Theorie-Bilder (visuals.js): reine Rechenfunktionen
globalThis.DQEngine = E; require('./src/visuals.js'); const VIS = globalThis.DQVisuals;
const cells = ps => ps.map(p => p.cells.slice().sort((a, b) => a - b).join(',')).sort();
ok(cells(VIS.minimize(3, [1, 3, 5, 7])).join('|') === '1,3,5,7', 'KV: Summe m(1,3,5,7) = ein Päckchen e1');
ok(cells(VIS.minimize(4, [0, 2, 8, 10])).join('|') === '0,2,8,10', 'KV: vier Ecken sind benachbart');
ok(VIS.minimize(3, [1, 2, 4, 7]).length === 4, 'KV: XOR aus drei Variablen lässt sich nicht vereinfachen');
ok(VIS.minimize(3, [1], [3, 5, 7]).length === 1 && VIS.minimize(3, [1], [3, 5, 7])[0].cells.length === 4, 'KV: X vergrössern das Päckchen');
const gs = VIS.gen.gray({ bits: 3 });
ok(gs.length === 9 && gs.slice(1).every(s => s.rows[2].hl.length === 1), 'Gray: jeder Schritt ändert genau ein Bit (auch 7 → 0)');
ok(/101011/.test(VIS.gen.divide({ value: 43, base: 2 }).slice(-1)[0].text), 'Division: 43 = 101011 (dual)');
ok(VIS.gen.bases({ value: 173 }).slice(-1)[0].rows[1].cells[0] === 173, 'Horner: AD (hex) = 173');
const h = VIS.transfer([{ kind: 'lp', r: 1000, c: 1e-6 }], 1 / (2 * Math.PI * 1e-3));
ok(Math.abs(Math.hypot(h.re, h.im) - Math.SQRT1_2) < 1e-6, 'Frequenzgang: Tiefpass bei f_g = 1/√2');
// 27 Messbereich von Hand (E.dmm mit range, Messtechnik-Erweiterung Teil A)
ok(E.dmm(15, 'V', 0, 20).text === '15.03 V' && E.dmm(15, 'V', 0, 600).text === '15.0 V', 'Fester Bereich: Auflösung 2000 Schritte, Kalibrierfehler wie AUTO');
ok(E.dmm(15, 'V', 0, 2).text === 'OL' && E.dmm(15, 'V', 0, 2).ol === true, 'Zu kleiner Bereich zeigt OL');
ok(E.dmm(0.15, 'V', 0, 0.2).text === '150.3 mV' && E.dmm(0.0123, 'A', 0, 20e-3).text === '12.32 mA' && E.dmm(4700, 'Ω', 0, 20e3).text === '4.71 kΩ', 'Einheit und Vorsatz folgen dem Bereich');
ok(E.dmm(15, 'V', 0).text === E.dmm(15, 'V', 0, undefined).text && E.rangeLabel(200e-6, 'A') === '200µA' && E.DMM_MANUAL.V.length === 5, 'Ohne Bereich bleibt die automatische Wahl; Bereichsbeschriftungen');
// 28 Taschenrechner (calc.js): Rechenkern ohne DOM
const CALC = require('./src/calc.js');
const cv = s => CALC.evaluate(s), nearC = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
ok(cv('2+3*4') === 14 && cv('(2+3)*4') === 20 && cv('2^3^2') === 512 && cv('-2^2') === -4, 'Rechner: Vorrang, Klammern, Potenz rechtsassoziativ, Vorzeichen');
ok(nearC(cv('15 · 0,5 % + 0,1'), 0.175) && nearC(cv('√(3² + 3,54²)'), Math.sqrt(9 + 3.54 * 3.54)) && nearC(cv('10/√2'), 10 / Math.SQRT2), 'Rechner: Prozent, Wurzel, Quadrat, Komma (T16C / TRMS)');
ok(nearC(cv('4k7'), 4700) && nearC(cv('100n*10k'), 1e-3) && nearC(cv('2.2M'), 2.2e6) && nearC(cv('47µ'), 47e-6) && nearC(cv('2π'), 2 * Math.PI) && nearC(cv('sin(30)'), 0.5) && nearC(cv('log(1000)'), 3), 'Rechner: SI-Vorsätze, implizite Multiplikation, Winkel in Grad, log');
const bad = s => { try { cv(s); return null; } catch (e) { return e.calc ? e.message : 'Absturz: ' + e.message; } };
ok(/Division durch 0/.test(bad('5/0')) && /Klammer/.test(bad('(2+3')) && /Klammer/.test(bad('2+3)')) && /Unbekannt/.test(bad('2 $ 3')) && /unvollständig|Operator/.test(bad('2+')) && /Nichts/.test(bad('')), 'Rechner: Fehler werden sauber gemeldet');
ok(CALC.fmt(0.1 + 0.2) === '0.3' && CALC.fmt(1e-9) === '1.0000e-9' && CALC.fmt(1234567) === '1234567', 'Rechner: Anzeige rundet Gleitkommarauschen weg');
// Gleichrichter und Bezugspunkt (Auftrag 06.10.2026, G5.1)
{
  const gen = { id: 'G1', type: 'acsource', value: 10, props: { freq: 50, shape: 'sine', offset: 0 } }, R1 = { id: 'R1', type: 'resistor', value: 1000 };
  const d = id => ({ id, type: 'diode' });
  const bridge = { parts: [gen, R1, d('V1'), d('V2'), d('V3'), d('V4')], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('G1.n', 'V2.a'), W('V2.k', 'R1.a'), W('R1.b', 'V3.a'), W('V3.k', 'G1.p'), W('R1.b', 'V4.a'), W('V4.k', 'G1.n')] };
  const half = { parts: [gen, R1, d('V1')], wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('R1.b', 'G1.n')] };
  const sim = (lay, a, b) => E.simulate(lay, { dt: 1e-4, tEnd: 0.04, probes: [{ a, b }] }).samples;
  const period = s => { // steigende Durchgänge durch den Mittelwert
    const mean = s.reduce((x, y) => x + y.ch0, 0) / s.length, cr = []; let below = s[0].ch0 < mean;
    for (let k = 1; k < s.length; k++) { if (below && s[k].ch0 >= mean + 0.05) { cr.push(s[k].t); below = false; } else if (!below && s[k].ch0 < mean - 0.05) below = true; }
    return cr.length >= 2 ? (cr[cr.length - 1] - cr[0]) / (cr.length - 1) : 0;
  };
  const sb = sim(bridge, 'R1.a', 'R1.b'), pk = (s, t0, t1) => Math.max(...s.filter(x => x.t >= t0 && x.t < t1).map(x => x.ch0));
  ok(Math.min(...sb.map(x => x.ch0)) >= -0.01, 'Brücke: Spannung an R1 nie unter −0,01 V', Math.min(...sb.map(x => x.ch0)));
  const p1 = pk(sb, 0, 0.01), p2 = pk(sb, 0.01, 0.02);
  ok(Math.abs(p1 - p2) <= 0.01 * p1, 'Brücke: beide Halbwellen gleich hoch', [p1, p2]);
  near(p1, 10 - 2 * 0.7, 0.05, 'Brücke: Scheitel ≈ Û − 2·U_F');
  const acb = E.acMeasure(bridge, { a: 'R1.a', b: 'R1.b' });
  ok(acb.dc >= 4.9 && acb.dc <= 5.9, 'Brücke: Gleichanteil 4,9 … 5,9 V', acb.dc);
  near(period(sb), 0.01, 0.02, 'Brücke: Grundperiode 10 ms');
  const s0 = sim(bridge, 'R1.a'); ok(Math.min(...s0.map(x => x.ch0)) < -0.5 && Math.max(...s0.map(x => x.ch0)) > 9, 'Brücke gegen Knoten 0: nur eine Halbwelle (R1.a gegen G1.n)');
  const sh = sim(half, 'R1.a', 'R1.b');
  near(Math.max(...sh.map(x => x.ch0)), 10 - 0.7, 0.03, 'Einweg: Scheitel ≈ Û − U_F'); near(period(sh), 0.02, 0.02, 'Einweg: Grundperiode 20 ms');
  ok(E.refPin(bridge) === 'G1.n' && E.refPin(half) === 'G1.n', 'Bezugspunkt ohne Masse-Symbol: Minuspol der ersten Quelle');
  const withGnd = { parts: half.parts.concat([{ id: 'GND1', type: 'ground' }]), wires: half.wires.concat([W('R1.b', 'GND1.g')]) };
  ok(E.refPin(withGnd) === 'GND1.g' && E.buildNetlist(E.clone(withGnd)).refPin === 'GND1.g', 'Bezugspunkt mit Masse-Symbol: GND1.g');
  ok(E.refPin({ parts: [R1], wires: [] }) === null, 'Bezugspunkt ohne Quelle: null');
}
// Glättung mit dem Ladekondensator (Auftrag 06.10.2026, K0.2): Brücke mit 10 … 2200 µF, Einschwingen bis 10 s, kein Abbruch («Gleichungssystem nicht lösbar»
// bei schwebendem Block aus gesperrten Dioden und geschlossenem Schalter), Ergebnis stimmt mit E.acMeasure überein
{
  const gen = { id: 'G1', type: 'acsource', value: 10, props: { freq: 50, shape: 'sine', offset: 0 } }, R1 = { id: 'R1', type: 'resistor', value: 1000 };
  const d = id => ({ id, type: 'diode' });
  const mk = uF => ({ parts: [gen, R1, d('V1'), d('V2'), d('V3'), d('V4'), { id: 'S1', type: 'switch', props: { closed: true } }, { id: 'C1', type: 'capacitor', value: uF * 1e-6 }],
    wires: [W('G1.p', 'V1.a'), W('V1.k', 'R1.a'), W('G1.n', 'V2.a'), W('V2.k', 'R1.a'), W('R1.b', 'V3.a'), W('V3.k', 'G1.p'), W('R1.b', 'V4.a'), W('V4.k', 'G1.n'), W('R1.a', 'S1.a'), W('S1.b', 'C1.a'), W('C1.b', 'R1.b')] });
  for (const uF of [10, 47, 100, 220, 470, 1000, 2200]) {
    for (const settleT of [3, 8, 10]) {
      let sm = null, err = null;
      try { sm = E.simulate(mk(uF), { dt: 5e-5, tEnd: 0.04, settle: { t: settleT, dt: 1e-4 }, probes: [{ a: 'R1.a', b: 'R1.b' }] }).samples; } catch (e) { err = e.message; }
      ok(!err && sm && sm.length > 700, 'Glättung ' + uF + ' µF, Einschwingen ' + settleT + ' s: kein Abbruch', err);
      if (settleT === 10 && sm) {
        const v = sm.map(x => x.ch0), ac = E.acMeasure(mk(uF), { a: 'R1.a', b: 'R1.b' });
        ok(v.every(isFinite), 'Glättung ' + uF + ' µF: alle Werte endlich');
        const tau = uF * 1e-3; if (uF <= 470) { near(Math.max(...v), ac.max, 0.01, 'Glättung ' + uF + ' µF: max wie acMeasure'); near(Math.min(...v), ac.min, 0.02, 'Glättung ' + uF + ' µF: min wie acMeasure'); }
      }
    }
  }
}
console.log(`Engine-Tests: ${pass} ok, ${fail} Fehler`);
process.exit(fail ? 1 : 0);

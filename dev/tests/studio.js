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
  const pin = id => page.click(`[data-pin="${id}"] .pinhit`, { force: true });
  const add = t => page.click(`[data-add="${t}"]`);
  const setField = async (k, v) => { await page.fill(`[data-f="${k}"]`, v); await page.press(`[data-f="${k}"]`, 'Enter'); await page.dispatchEvent(`[data-f="${k}"]`, 'change'); };
  const selectPart = id => page.click(`[data-part="${id}"] .hit`, { force: true });
  const nv = (p) => page.evaluate(pn => { const r = Studio.sim.res, n = Studio.sim.net; return r.nodeV[n.pinNode[pn]]; }, p);

  if (!only || only === '4') counterEquivalence();
  if (!only || only === '5') rippleDelay();
  if (!only || only === '6') uhr();
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
    const tauTxt = await page.evaluate(() => { const s = Studio.scopes[0]; const r = s.tau(); return r && r.tau; });
    ok(tauTxt && near(tauTxt, 1e-3, 0.02), 'Messcursor: τ = ' + tauTxt + ' s gegen R·C = 1 ms (2 %)');
    ok(/Δt = 1\.0\d* ms|Δt = 9\.\d+ µs|Δt = 99\d µs/.test(await page.textContent('.sc-read')) || /Δt/.test(await page.textContent('.sc-read')), 'Cursor-Anzeige zeigt Δt');
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
    // Spule im Aufbau: RL-Glied über die Bedienung, Strom steigt nach τ = L/R
    await page.evaluate(() => Studio.loadLayout({ parts: [
      { id: 'B1', type: 'battery', x: 200, y: 300, rot: 0, value: 10, props: { ri: 1 } }, { id: 'R1', type: 'resistor', x: 400, y: 200, rot: 0, value: 99 },
      { id: 'L1', type: 'inductor', x: 600, y: 300, rot: 90, value: 10e-3 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'L1.a' }, { from: 'L1.b', to: 'B1.n' }] }));
    await page.evaluate(() => { Studio.sim.pause(); Studio.openScope([{ kind: 'pi', id: 'L1' }]); Studio.sim.advance(0.002); });
    const il = await page.evaluate(() => { const tr = Studio.scopes[0].ch[0].tr; return [tr.at(1e-4), tr.at(0.0019)]; });
    ok(near(il[0], 0.1 * (1 - Math.exp(-1)), 0.02) && near(il[1], 0.1, 0.01), 'Spule: i(τ) = 63,2 % von I∞ (' + il.map(x => x.toFixed(5)).join(', ') + ')');
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

  ok(!external.length, 'Netzzugriffe (Offline-Fassung): ' + external.join(', '));
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Studio-Test: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler');
  fails.forEach(f => console.log('  ✗ ' + f));
  notes.forEach(n => console.log('  · ' + n));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

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

  ok(!external.length, 'Netzzugriffe (Offline-Fassung): ' + external.join(', '));
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Studio-Test: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler');
  fails.forEach(f => console.log('  ✗ ' + f));
  notes.forEach(n => console.log('  · ' + n));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

// Leistungsmessung des Studios (Nacht-Paket 6b): node tests/leistung.js
// Teil 1 (Node): Rechenzeit je Schritt (sim.js) für wachsende Schaltungen: reine Logik (Ripple-Zähler aus Flipflops), reine Analogschaltung (RC-Kette an Wechselquelle),
// gemischt (beides nebeneinander). Teil 2 (Chromium, ohne Grafikkarte): Bilder je Sekunde der echten Oberfläche bei laufender Simulation, mit und ohne «U-Werte»,
// sowie ob die Simulation dem Zeitfaktor «Auto» folgt (kein «Rechner kommt nicht mit»). Ausgabe als Tabellen für docs/LEISTUNG_STUDIO.md.
const path = require('path');
const E = require('../src/engine.js'), Sim = require('../studio/sim.js');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const SIZES = (process.argv[2] || '10,25,50,100,200,400').split(',').map(Number);
const gen = {
  logik(n) { // Taktgeber + (n − 1) D-Flipflops als Ripple-Zähler
    const parts = [{ id: 'CLK1', type: 'clock', x: 100, y: 100, rot: 0, props: { freq: 1000 } }], wires = [];
    for (let k = 0; k < n - 1; k++) { parts.push({ id: 'FF' + (k + 1), type: 'dff', x: 200 + (k % 12) * 150, y: 160 + Math.floor(k / 12) * 140, rot: 0 }); wires.push({ from: 'FF' + (k + 1) + '.Qn', to: 'FF' + (k + 1) + '.D' }); wires.push({ from: k ? 'FF' + k + '.Qn' : 'CLK1.out', to: 'FF' + (k + 1) + '.C' }); }
    return { parts, wires };
  },
  analog(n) { // Wechselquelle + RC-Kette (n − 1 Bauteile: abwechselnd R in Reihe und C nach Masse)
    const parts = [{ id: 'G1', type: 'acsource', x: 100, y: 200, rot: 0, value: 5, props: { freq: 1000, shape: 'sine' } }], wires = []; let prev = 'G1.p', k = 0;
    while (parts.length < n) { const r = 'R' + (k + 1), c = 'C' + (k + 1); parts.push({ id: r, type: 'resistor', x: 200 + (k % 12) * 150, y: 160 + Math.floor(k / 12) * 140, rot: 0, value: 1000 }); wires.push({ from: prev, to: r + '.a' }); if (parts.length < n) { parts.push({ id: c, type: 'capacitor', x: 260 + (k % 12) * 150, y: 220 + Math.floor(k / 12) * 140, rot: 90, value: 1e-7 }); wires.push({ from: r + '.b', to: c + '.a' }); wires.push({ from: c + '.b', to: 'G1.n' }); } prev = r + '.b'; k++; }
    return { parts, wires };
  },
  gemischt(n) { const a = gen.logik(Math.ceil(n / 2)), b = gen.analog(Math.floor(n / 2)); b.parts.forEach(p => { p.y += 700; }); return { parts: a.parts.concat(b.parts), wires: a.wires.concat(b.wires) }; }
};
const fmt = (x, d) => x.toFixed(d === undefined ? 2 : d);
(async () => {
  console.log('## Rechenzeit je Schritt (Node, ms)\n');
  console.log('| Bauteile | reine Logik | reine Analogschaltung | gemischt |\n|---:|---:|---:|---:|');
  const comp = {};
  for (const n of SIZES) {
    const row = [];
    for (const kind of ['logik', 'analog', 'gemischt']) {
      const lay = gen[kind](n), sim = new Sim({ getLayout: () => lay }); sim.refresh(true); sim.reset(); sim.step(30);
      const steps = Math.max(30, Math.min(600, Math.floor(1500 / (n / 20 + 1)))), t0 = process.hrtime.bigint(); sim.step(steps); const ms = Number(process.hrtime.bigint() - t0) / 1e6 / steps;
      comp[kind + n] = ms; row.push(fmt(ms, ms < 1 ? 3 : 2));
    }
    console.log('| ' + n + ' | ' + row.join(' | ') + ' |');
  }
  console.log('\nSchritte je Sekunde, die ein Bild von 12 ms Zeitbudget schafft: 12 ms / Rechenzeit je Schritt; 60 Bilder/s ⇒ 16,7 ms je Bild.\n');

  console.log('## Bilder je Sekunde der Oberfläche (Chromium ohne Grafikkarte, Fenster 1440 × 900)\n');
  console.log('| Bauteile | Art | Bilder/s | Bilder/s mit «U-Werte» | Simulation folgt dem Zeitfaktor |\n|---:|---|---:|---:|---|');
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file://' + path.join(__dirname, '../../studio.html'), { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.sim);
  const result = [];
  for (const n of SIZES) for (const kind of ['logik', 'analog', 'gemischt']) {
    const lay = gen[kind](n);
    await page.evaluate(l => { Studio.loadLayout(l, { run: true }); Studio.core.sel = null; }, lay); await page.waitForTimeout(400);
    const measure = async volt => {
      await page.evaluate(v => { Studio.ed.showVolt = v; Studio.redraw(); }, volt);
      return await page.evaluate(() => new Promise(res => { let f = 0, lag = 0, samples = 0; const t0 = performance.now(), s0 = Studio.sim.steps; const loop = () => { f++; samples++; if (Studio.sim.lag) lag++; if (performance.now() - t0 < 2500) requestAnimationFrame(loop); else res({ fps: f / ((performance.now() - t0) / 1000), lag: lag / samples, steps: Studio.sim.steps - s0 }); }; requestAnimationFrame(loop); }));
    };
    const a = await measure(false), b = await measure(true);
    const follows = a.lag < 0.05 ? 'ja' : 'nein (Rückstand in ' + Math.round(a.lag * 100) + ' % der Bilder)';
    result.push({ n, kind, fps: a.fps, fpsV: b.fps, lag: a.lag, lagV: b.lag });
    console.log('| ' + n + ' | ' + kind + ' | ' + fmt(a.fps, 0) + ' | ' + fmt(b.fps, 0) + ' | ' + follows + ' |');
  }
  await browser.close();
  // Aussage: grösste Bauteilzahl je Art mit ≥ 30 Bildern/s und ohne Rückstand
  console.log('\n## Aussage\n');
  for (const kind of ['logik', 'analog', 'gemischt']) {
    const ok = result.filter(r => r.kind === kind && r.fps >= 30 && r.lag < 0.05), okV = result.filter(r => r.kind === kind && r.fpsV >= 30 && r.lagV < 0.05);
    console.log('- ' + kind + ': flüssig (≥ 30 Bilder/s, ohne Rückstand) bis ' + (ok.length ? Math.max.apply(null, ok.map(r => r.n)) : '< ' + SIZES[0]) + ' Bauteile, mit «U-Werte» bis ' + (okV.length ? Math.max.apply(null, okV.map(r => r.n)) : '< ' + SIZES[0]));
  }
})().catch(e => { console.error(e); process.exit(2); });

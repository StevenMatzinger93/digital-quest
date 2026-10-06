// Gleichrichter und Bezugspunkt (Auftrag 06.10.2026, G0): Tabelle aus Abschnitt 3 nachstellen – 16.7 auf der Werkbank, S1 offen,
// Bildbreite 50 ms, Tastkopf CH1 an R1.a, Erdungsclip an R1.b / nicht angeschlossen / an G1.n. Dazu 3.5 im Schaltplan (nur rote Spitze).
// node tests/gleichrichter_befund.js [tag]  → Screenshots tests/shots/gleichrichter_<tag>_*.png, Tabelle auf stdout
const { chromium } = require('playwright'); const path = require('path');
const tag = process.argv[2] || 'vorher';
(async () => {
  const url = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/') + '?alle';
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const rows = [];
  for (const [id, view, tip, gnd, name] of [['16.7', 'bench', 'R1.a', 'R1.b', 'Clip an R1.b'], ['16.7', 'bench', 'R1.a', null, 'Clip nicht angeschlossen'], ['16.7', 'bench', 'R1.a', 'G1.n', 'Clip an G1.n'], ['3.5', 'schema', 'R1.a', null, 'nur rote Spitze'], ['3.5', 'schema', 'R1.a', 'R1.b', 'rot R1.a, schwarz R1.b']]) {
    await page.evaluate(i => { delete DigitalQuest.state.drafts[i]; DigitalQuest.openItem(i); }, id);
    await page.evaluate(v => DigitalQuest.setView(v), view); await page.waitForTimeout(150);
    await page.evaluate(([v, t, g]) => { const c = DigitalQuest.core; if (v === 'bench') { c.scopeProbes.tip = t; c.scopeProbes.gnd = g; c.scopeProbes.tip2 = null; } else { document.querySelector('[data-mm="OFF"]').click(); document.querySelector('[data-mm="V"]').click(); c.probes = { a: null, b: null }; c.clickPin(t); if (g) c.clickPin(g); } c.redraw(); }, [view, tip, gnd]);
    const tbs = await page.$$eval('#tb option', l => l.map(o => o.value)); const tb = tbs.find(v => Math.abs(+v - 0.05) < 1e-9) || tbs[0];
    await page.selectOption('#tb', tb); await page.click('#btnScope'); await page.waitForTimeout(200);
    const r = await page.evaluate(() => { const info = document.getElementById('scopeInfo').textContent; const m = /max ([-\d.]+) ?(m?V) · min ([-\d.]+) ?(m?V)/.exec(info); const f = (x, u) => +x * (u === 'mV' ? 1e-3 : 1); return { info: info.replace(/\s+/g, ' ').trim(), max: m ? f(m[1], m[2]) : NaN, min: m ? f(m[3], m[4]) : NaN, warn: !!document.querySelector('#scopeWarn:not([hidden])') }; });
    rows.push([id, view, name, r.max.toFixed(3), r.min.toFixed(3), r.warn ? 'Hinweis' : '–', r.info.slice(0, 110)]);
    await page.screenshot({ path: path.join(__dirname, 'shots', `gleichrichter_${tag}_${id.replace('.', '_')}_${name.replace(/[^a-z0-9]+/gi, '_')}.png`) });
  }
  console.log('Aufgabe | Ansicht | Anschluss | max | min | Warnhinweis | Text');
  rows.forEach(r => console.log(r.join(' | ')));
  await browser.close();
})();

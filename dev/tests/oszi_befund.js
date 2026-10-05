// Paket O – Reproduktion: Sinus-Aufgaben × alle Bildbreiten, Kennwerte (max/min) gegen E.acMeasure, Punkte der Werkbank-Kurve
// node tests/oszi_befund.js [tag]  → Screenshots tests/shots/oszi_<tag>_<aufgabe>_<tb>.png, Tabelle auf stdout
const { chromium } = require('playwright'); const path = require('path');
const tag = process.argv[2] || 'vorher';
(async () => {
  const url = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/') + '?alle';
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const tbs = await page.$$eval('#tb option', l => l.map(o => o.value));
  const rows = [];
  for (const [id, a, b] of [['W1', 'R2.a', 'R2.b'], ['W4', null, null], ['W6', null, null], ['W7', null, null], ['16.3', 'R1.a', 'R1.b'], ['16.5', 'C1.a', 'C1.b']]) {
    await page.evaluate(i => { delete DigitalQuest.state.drafts[i]; DigitalQuest.openItem(i); DigitalQuest.setView('bench'); }, id); await page.waitForTimeout(150);
    const probe = await page.evaluate(([a, b]) => { const t = window.DQ.byId[DigitalQuest.view ? location.hash.split('/')[2] : ''] ; return null; }, [a, b]);
    // Tastkopf: erster AC-Messwert der Aufgabe
    const pins = await page.evaluate(() => { const id = decodeURIComponent(location.hash.split('/')[2]); const t = window.DQ.byId[id]; const m = (t.measure || []).find(m => m.mode === 'AC' || m.mode === 'VAC' || m.mode === 'V'); return m ? [m.a, m.b] : null; });
    if (!pins) { console.log(id, 'kein Messpunkt'); continue; }
    await page.evaluate(p => { const c = DigitalQuest.core; c.scopeProbes.tip = p[0]; c.scopeProbes.gnd = p[1] || null; c.redraw(); }, pins);
    const ref = await page.evaluate(p => { const E = DigitalQuest.engine, r = E.acMeasure(DigitalQuest.core.layout, { a: p[0], b: p[1] || undefined }); return { peak: r.peak, dc: r.dc, pp: r.pp }; }, pins);
    for (const tb of tbs) {
      await page.selectOption('#tb', tb); await page.click('#btnScope'); await page.waitForTimeout(150);
      const r = await page.evaluate(() => { const info = document.getElementById('scopeInfo').textContent, tr = document.querySelector('#bench .bsctrace'); const pts = tr ? tr.getAttribute('points').split(' ').length : 0; const m = /max ([-\d.]+) ?(m?V) · min ([-\d.]+) ?(m?V)/.exec(info); return { info, pts, max: m ? +m[1] * (m[2] === 'mV' ? 1e-3 : 1) : NaN, min: m ? +m[3] * (m[4] === 'mV' ? 1e-3 : 1) : NaN }; });
      const dev = Math.max(Math.abs(r.max - (ref.dc + ref.pp / 2)), Math.abs(r.min - (ref.dc - ref.pp / 2)));
      rows.push([id, tb + ' s', r.max.toFixed(3), r.min.toFixed(3), (ref.dc + ref.pp / 2).toFixed(3), (ref.dc - ref.pp / 2).toFixed(3), (100 * dev / Math.max(1e-9, ref.pp)).toFixed(2) + ' %', r.pts, /zu klein|Periode/.test(r.info) ? 'Hinweis' : '']);
      if (id === 'W1' || id === '16.5') await page.screenshot({ path: path.join(__dirname, 'shots', `oszi_${tag}_${id.replace('.', '_')}_${tb}.png`) });
    }
  }
  console.log('Aufgabe | Bildbreite | max | min | soll max | soll min | Abw. (% von Uss) | Punkte Werkbank | Hinweis');
  rows.forEach(r => console.log(r.join(' | ')));
  // Multimeter: V~ AVG/TRMS und V⎓ gegen E.acMeasure
  const mm = [];
  for (const id of ['W1', 'W4', '16.3', '16.5']) {
    await page.evaluate(i => { delete DigitalQuest.state.drafts[i]; DigitalQuest.openItem(i); DigitalQuest.setView('schema'); }, id); await page.waitForTimeout(100);
    const pins = await page.evaluate(() => { const id = decodeURIComponent(location.hash.split('/')[2]); const t = window.DQ.byId[id]; const m = (t.measure || []).find(m => m.mode === 'VAC' || m.mode === 'AC' || m.mode === 'V'); return m ? [m.a, m.b] : null; });
    if (!pins) continue;
    for (const [mode, mt, key] of [['VAC', 'trms', 'rms'], ['VAC', 'avg', 'avg'], ['V', 'trms', 'dc']]) {
      await page.click('[data-mm="OFF"]'); await page.click(`[data-mm="${mode}"]`); await page.click(`[data-mt="${mt}"]`);
      await page.evaluate(p => { const c = DigitalQuest.core; c.probes = { a: null, b: null }; c.clickPin(p[0]); c.clickPin(p[1]); }, pins); await page.waitForTimeout(150);
      const got = await page.evaluate(() => DigitalQuest.parseVal ? document.getElementById('lcd').textContent : document.getElementById('lcd').textContent);
      const want = await page.evaluate(([p, k]) => { const E = DigitalQuest.engine, r = E.acMeasure(DigitalQuest.core.layout, { a: p[0], b: p[1] }); return r[k]; }, [pins, key]);
      mm.push([id, mode + ' ' + mt.toUpperCase(), got.trim(), (+want).toFixed(4)]);
    }
  }
  console.log('\nMultimeter | Messart | Anzeige | E.acMeasure');
  mm.forEach(r => console.log(r.join(' | ')));
  await browser.close();
})();

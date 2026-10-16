// Testlauf 2 (3.4): Screenshots der T3C-Mini-Schaltungen (Brücke, Glättung) und des Halbwellen-Bilds – beide Themes, Desktop und 390 px.
// Aufruf: node tests/testlauf2_t3c.js vorher|nachher  → tests/shots/testlauf2/t3c_<tag>_<theme>_<breite>.png
// Prüft zusätzlich im Schaltplan der Mini-Schaltung, ob sich Leitungen kreuzen oder überlagern (Segmente aus den SVG-Pfaden).
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const tag = process.argv[2] || 'nachher', SH = path.join(__dirname, 'shots', 'testlauf2'); fs.mkdirSync(SH, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', '..', 'index.html').replace(/\\/g, '/');
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const theme of ['dark', 'light']) for (const vp of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.evaluate(t => { DigitalQuest.state.settings.tourAsked = true; DigitalQuest.state.settings.theme = t; document.documentElement.dataset.theme = t; DigitalQuest.openItem('T3C'); }, theme);
    await p.waitForTimeout(600);
    const minis = await p.$$('.mini'); // Mini-Schaltungen der Lektion
    const fig = await p.$('.hw-paths');
    const first = minis[0];
    if (first) { await first.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await first.screenshot({ path: path.join(SH, `t3c_${tag}_${theme}_${vp.width}_bruecke.png`) }); }
    if (fig) { await fig.scrollIntoViewIfNeeded(); await fig.screenshot({ path: path.join(SH, `t3c_${tag}_${theme}_${vp.width}_halbwellen.png`) }); }
    if (minis[1]) { await minis[1].scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await minis[1].screenshot({ path: path.join(SH, `t3c_${tag}_${theme}_${vp.width}_glaettung.png`) }); }
    // Kreuzungen/Überlagerungen der Leitungen in den Schaltplan-SVGs der Mini-Schaltungen
    const geo = await p.evaluate(() => [...document.querySelectorAll('svg')].filter(s => s.querySelector('path.wire')).map(s => [...s.querySelectorAll('path.wire')].map(w => w.getAttribute('d'))));
    const segs = d => { const pts = []; let x = 0, y = 0; const re = /([MLHV])\s*(-?[\d.]+)(?:[ ,](-?[\d.]+))?/g; let m; while ((m = re.exec(d))) { if (m[1] === 'M' || m[1] === 'L') { x = +m[2]; y = +m[3]; } else if (m[1] === 'H') x = +m[2]; else y = +m[2]; pts.push([x, y]); } const s = []; for (let i = 1; i < pts.length; i++) if (pts[i][0] !== pts[i - 1][0] || pts[i][1] !== pts[i - 1][1]) s.push([pts[i - 1], pts[i]]); return s; };
    const probs = geo.map((ws, k) => { const all = ws.map((d, i) => segs(d).map(sg => ({ i, sg }))).flat(); let cross = 0, overlap = 0;
      for (let a = 0; a < all.length; a++) for (let c = a + 1; c < all.length; c++) { if (all[a].i === all[c].i) continue; const [[x1, y1], [x2, y2]] = all[a].sg, [[x3, y3], [x4, y4]] = all[c].sg;
        const hA = y1 === y2, hC = y3 === y4, inR = (v, p, q) => v > Math.min(p, q) && v < Math.max(p, q);
        if (hA !== hC) { const [h, v] = hA ? [all[a].sg, all[c].sg] : [all[c].sg, all[a].sg]; if (inR(v[0][0], h[0][0], h[1][0]) && inR(h[0][1], v[0][1], v[1][1])) cross++; }
        else if (hA && y1 === y3 && Math.min(Math.max(x1, x2), Math.max(x3, x4)) - Math.max(Math.min(x1, x2), Math.min(x3, x4)) > 0) overlap++;
        else if (!hA && x1 === x3 && Math.min(Math.max(y1, y2), Math.max(y3, y4)) - Math.max(Math.min(y1, y2), Math.min(y3, y4)) > 0) overlap++; }
      return { schaltung: k + 1, leitungen: ws.length, kreuzungen: cross, ueberlagerungen: overlap }; });
    out.push({ theme, breite: vp.width, minis: minis.length, halbwellenBild: !!fig, probs, fehler: errs });
    await p.close();
  }
  await b.close(); console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });

// Betrieb im Netz (Nachtlauf 2, Block 5): node tests/netz.js
// Offline nach dem ersten Besuch (Service Worker, Netz abgeschaltet), Manifest und Installierbarkeit (Chromium meldet keine Fehler), Hinweis auf eine neuere Fassung,
// Dateidialoge des Systems (File System Access API: mit Ersatz-Dialogen geprüft, denn die echten Dialoge des Betriebssystems lassen sich nicht automatisch bedienen) und der Rückfallweg,
// dist/ mit LIESMICH.txt.
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const ROOT = path.join(__dirname, '../..'), WEB = path.join(ROOT, 'web'), shots = path.join(__dirname, 'shots');
const fails = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fails.push(m); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function copy(src, dst) { fs.mkdirSync(dst, { recursive: true }); fs.readdirSync(src, { withFileTypes: true }).forEach(e => e.isDirectory() ? copy(path.join(src, e.name), path.join(dst, e.name)) : fs.copyFileSync(path.join(src, e.name), path.join(dst, e.name))); }
function serve(dir) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nicht gefunden'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(fs.readFileSync(f));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: 'http://127.0.0.1:' + srv.address().port, close: () => srv.close() })));
}
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'netz-')), site = path.join(tmp, 'site'); copy(WEB, site);
  const srv = await serve(site), browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'allow', acceptDownloads: true }), page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  const studio = async () => { await page.waitForFunction(() => window.Studio && Studio.sim && Studio.pfad); await page.waitForTimeout(200); if (await page.locator('#asNo').count()) await page.click('#asNo'); }; // «Schaltung wiederherstellen?» nach dem Neuladen wegklicken

  // 1. Erster Besuch: Service Worker installiert und übernimmt, ohne Hinweis auf «neuere Fassung»
  await page.goto(srv.url + '/studio/', { waitUntil: 'domcontentloaded' }); await studio();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  ok(await page.locator('#updBar').count() === 0, 'erster Besuch: kein Hinweis auf eine neuere Fassung');
  ok(await page.evaluate(async () => !!(await caches.match('/studio/')) && !!(await caches.match('/studio/index.html')) && !!(await caches.match('/studio/manifest.webmanifest'))), 'das Studio liegt im Cache (Seite und Manifest)');

  // 2. Manifest und Installierbarkeit
  const cdp = await ctx.newCDPSession(page); await cdp.send('Page.enable');
  const mf = await cdp.send('Page.getAppManifest'); ok(!(mf.errors || []).length, 'Manifest wird angenommen, Fehler: ' + JSON.stringify(mf.errors));
  const man = JSON.parse(mf.data || '{}'); ok(man.name === 'Digital Quest Studio' && man.display === 'standalone' && new URL(man.start_url, mf.url).pathname === '/studio/' && (man.icons || []).length >= 2, 'Manifest: Name «Digital Quest Studio», eigenes Fenster, Symbole: ' + JSON.stringify({ n: man.name, d: man.display, s: man.start_url, i: (man.icons || []).length }));
  for (const ic of man.icons || []) { const r = await page.evaluate(async u => (await fetch(u)).status, ic.src.replace(/^https?:\/\/[^/]+/, '')); ok(r === 200, 'Symbol ' + ic.src + ' erreichbar'); }
  const ins = await cdp.send('Page.getInstallabilityErrors'); ok(!(ins.installabilityErrors || []).length, 'Chromium meldet keine Installierbarkeitsfehler: ' + JSON.stringify(ins.installabilityErrors));

  // 3. Offline nach dem ersten Besuch
  await ctx.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }); await studio();
  ok(await page.title() === 'Digital Quest Studio' || /Studio/.test(await page.title()), 'ohne Netz: das Studio öffnet sich aus dem Cache (Titel ' + await page.title() + ')');
  await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'B1', type: 'battery', x: 200, y: 200, rot: 0, value: 9 }, { id: 'R1', type: 'resistor', x: 400, y: 200, rot: 0, value: 1000 }, { id: 'GND1', type: 'ground', x: 200, y: 400, rot: 0 }], wires: [{ from: 'B1.p', to: 'R1.a' }, { from: 'R1.b', to: 'B1.n' }] }, { run: true })); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!Studio.sim.res && Math.abs(Studio.sim.res.parts.R1.i - 9 / 1000.05) < 1e-4), 'ohne Netz: die Simulation rechnet (R1 führt ' + (await page.evaluate(() => Studio.sim.res.parts.R1.i * 1000)).toFixed(3) + ' mA)');
  await page.evaluate(() => Studio.pfad.open('liste')); await page.waitForSelector('.pf-card'); ok(await page.locator('.pf-card').count() === 26, 'ohne Netz: der Lernpfad mit 26 Stationen öffnet sich'); await page.evaluate(() => Studio.pfad.close());
  const off = await page.evaluate(async () => { try { await fetch('/api/x'); return 'erreicht'; } catch (e) { return 'kein Netz'; } }); ok(off === 'kein Netz', 'das Netz ist tatsächlich aus');
  await page.screenshot({ path: shots + '/netz_offline.png' }); await ctx.setOffline(false);

  // 4. Neuere Fassung: sw.js ändert sich → Hinweis, nicht stillschweigend der alte Stand
  const swp = path.join(site, 'sw.js'), sw = fs.readFileSync(swp, 'utf8'); fs.writeFileSync(swp, sw.replace(/dquest-[0-9a-f]+/, 'dquest-neuefassung1') + '\n// neue Fassung\n');
  fs.appendFileSync(path.join(site, 'studio', 'index.html'), '\n<!-- neue Fassung -->');
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); await page.waitForSelector('#updBar', { timeout: 15000 });
  ok(/Neuere Fassung/.test(await page.textContent('#updBar')) && /alte/.test(await page.textContent('#updBar')), 'neuere Fassung: Leiste mit Hinweis (' + (await page.textContent('#updBar')).trim().slice(0, 60) + ' …)'); await page.screenshot({ path: shots + '/netz_update.png' });
  await page.click('#updBar [data-a="later"]'); ok(await page.locator('#updBar').count() === 0, '«Später» schliesst die Leiste');
  await page.reload({ waitUntil: 'domcontentloaded' }); await studio(); ok((await page.evaluate(() => fetch('/studio/').then(r => r.text()))).includes('neue Fassung') && await page.evaluate(async () => (await caches.keys()).join()) === 'dquest-neuefassung1', 'nach dem Neuladen liefert der Service Worker die neue Fassung (Cache dquest-neuefassung1, der alte ist gelöscht)');
  ok(await page.locator('#updBar').count() === 0, 'nach dem Neuladen kein weiterer Hinweis');

  // 5. Dateidialoge: mit Ersatz-Dialogen (Chromium-API ersetzt, Aufruf und Schreiben werden geprüft)
  const downloads = []; page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.evaluate(() => {
    window.__fsa = { saves: [], opens: 0, files: {}, last: null, fail: null };
    window.showSaveFilePicker = async o => { if (__fsa.fail === 'abort') { const e = new Error('abgebrochen'); e.name = 'AbortError'; throw e; } if (__fsa.fail === 'fehler') { const e = new Error('nicht erlaubt'); e.name = 'SecurityError'; throw e; }
      __fsa.saves.push({ name: o.suggestedName, types: JSON.stringify(o.types) }); const h = { name: o.suggestedName, writes: [], createWritable: async () => ({ write: async t => { h.writes.push(t); }, close: async () => { } }) }; __fsa.last = h; return h; };
    window.showOpenFilePicker = async o => { __fsa.opens++; return [{ name: 'x.dqstudio.json', getFile: async () => new File([__fsa.content || '{}'], 'x.dqstudio.json') }]; };
  });
  ok(await page.evaluate(() => Studio.fsa()), 'Dateiauswahl des Systems erkannt (Ersatz-Dialoge sind da)');
  await page.evaluate(() => Studio.loadLayout({ parts: [{ id: 'R1', type: 'resistor', x: 200, y: 200, rot: 0, value: 4700 }, { id: 'R2', type: 'resistor', x: 400, y: 200, rot: 0, value: 100 }], wires: [{ from: 'R1.b', to: 'R2.a' }] }, { run: false }));
  await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Speichern")'); await page.waitForTimeout(150);
  let f = await page.evaluate(() => ({ n: __fsa.saves.length, name: __fsa.saves[0] && __fsa.saves[0].name, w: __fsa.last && __fsa.last.writes.length, t: __fsa.last && __fsa.last.writes[0], types: __fsa.saves[0] && __fsa.saves[0].types }));
  ok(f.n === 1 && /\.dqstudio\.json$/.test(f.name) && f.w === 1, 'Speichern öffnet die Dateiauswahl des Systems und schreibt die Datei: ' + JSON.stringify({ n: f.n, name: f.name, w: f.w }));
  const saved = JSON.parse(f.t); ok(saved.format === 'dqstudio' && saved.layout.parts.length === 2, 'die Datei enthält die Schaltung (Format dqstudio, 2 Bauteile)'); ok(/application\/json/.test(f.types) && /\.json/.test(f.types), 'Dateityp .json angeboten');
  ok(!downloads.length, 'kein Download-Ordner-Weg, solange die Dateiauswahl des Systems da ist');
  await page.keyboard.press('Control+s'); await page.waitForTimeout(150); f = await page.evaluate(() => ({ n: __fsa.saves.length, w: __fsa.last.writes.length })); ok(f.n === 1 && f.w === 2, 'zweites Speichern (Strg+S) schreibt direkt in dieselbe Datei, ohne neue Auswahl: ' + JSON.stringify(f));
  await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Speichern unter")'); await page.waitForTimeout(150); ok(await page.evaluate(() => __fsa.saves.length) === 2, '«Speichern unter …» fragt immer nach');
  await page.evaluate(() => { __fsa.fail = 'abort'; }); const n0 = await page.evaluate(() => __fsa.saves.length); await page.evaluate(() => Studio.saveAs()); await page.waitForTimeout(150);
  ok(!downloads.length && !(await page.locator('#modalBg.open').count()) && await page.evaluate(() => __fsa.saves.length) === n0, 'Abbrechen in der Dateiauswahl: keine Meldung, kein Download');
  await page.evaluate(() => { __fsa.fail = 'fehler'; }); await page.evaluate(() => Studio.saveAs()); await page.waitForTimeout(400); ok(downloads.length === 1 && /\.dqstudio\.json$/.test(downloads[0]), 'Fehler der Dateiauswahl: Rückfall auf den Download ohne Fehlermeldung (' + downloads.join() + ')'); await page.evaluate(() => { __fsa.fail = null; });
  await page.evaluate(() => { __fsa.content = JSON.stringify({ format: 'dqstudio', version: 2, name: 'Geladen', layout: { parts: [{ id: 'R9', type: 'resistor', x: 100, y: 100, rot: 0, value: 220 }], wires: [] } }); Studio.newCircuit(); });
  await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Öffnen")'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => __fsa.opens === 1 && Studio.core.layout.parts.length === 1 && Studio.core.layout.parts[0].id === 'R9' && Studio.name === 'Geladen'), 'Öffnen über die Dateiauswahl des Systems lädt die Schaltung');
  // Lernpfad: Fortschritt ausgeben und einlesen mit der Dateiauswahl des Systems
  await page.evaluate(() => { Studio.pfad.open('liste'); }); await page.waitForSelector('.pf-card'); const s0 = await page.evaluate(() => JSON.stringify(Studio.pfad.stand()));
  await page.click('[data-a="export"]'); await page.waitForTimeout(150); const ex = await page.evaluate(() => ({ n: __fsa.saves.length, name: __fsa.saves[__fsa.saves.length - 1].name, t: __fsa.last.writes[0] }));
  ok(/fortschritt\.dqstudio\.json$/.test(ex.name) && JSON.parse(ex.t).format === 'dqstudio-lernpfad', 'Lernpfad: Fortschritt ausgeben über die Dateiauswahl des Systems (' + ex.name + ')');
  await page.evaluate(t => { __fsa.content = t; Studio.pfad.setStand(DQPfad.neuerStand()); }, ex.t); await page.click('[data-a="import"]'); await page.waitForSelector('#modalBg.open'); ok(await page.evaluate(() => JSON.stringify(Studio.pfad.stand())) === s0, 'Lernpfad: Einlesen über die Dateiauswahl des Systems ergibt denselben Stand'); await page.evaluate(() => { Studio.closeModal(); Studio.pfad.close(); });

  // 6. Rückfallweg: ohne die API bleibt es beim Download und bei der Dateiauswahl des Browsers
  await page.evaluate(() => { window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; Studio.loadLayout({ parts: [{ id: 'R1', type: 'resistor', x: 200, y: 200, rot: 0, value: 330 }], wires: [] }, { run: false }); });
  ok(await page.evaluate(() => !Studio.fsa()), 'ohne die API: keine Dateiauswahl des Systems');
  const before = downloads.length, dl = page.waitForEvent('download'); await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Speichern")'); const d = await dl; ok(downloads.length === before + 1 && /\.dqstudio\.json$/.test(d.suggestedFilename()), 'Rückfall: Speichern lädt die Datei herunter (' + d.suggestedFilename() + ')');
  const dp = path.join(tmp, 'rueck.json'); await d.saveAs(dp); ok(JSON.parse(fs.readFileSync(dp, 'utf8')).layout.parts[0].value === 330, 'Rückfall: die heruntergeladene Datei enthält die Schaltung');
  const fc = page.waitForEvent('filechooser'); await page.click('#menu-datei > button'); await page.click('#menu-datei .drop button:has-text("Öffnen")'); await (await fc).setFiles(dp); await page.waitForTimeout(250); ok(await page.evaluate(() => Studio.core.layout.parts[0].value) === 330, 'Rückfall: Öffnen über die Dateiauswahl des Browsers');
  ok(!(await page.locator('#modalBg.open').count()), 'Rückfall: keine Fehlermeldung, kein Hinweis');

  // 7. dist/
  const dist = path.join(ROOT, 'dist'); ok(fs.existsSync(path.join(dist, 'studio.html')) && fs.statSync(path.join(dist, 'studio.html')).size > 200000, 'dist/studio.html ist da'); const lm = fs.readFileSync(path.join(dist, 'LIESMICH.txt'), 'utf8');
  ok(/Doppelklick/.test(lm) && /kein Internet/.test(lm) && /speicherst/.test(lm), 'dist/LIESMICH.txt erklärt das Öffnen und das Speichern'); ok(lm.split(/[.!?]\s/).filter(x => x.trim()).length <= 5, 'LIESMICH.txt ist kurz (zwei Sätze plus Titel)');
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close(); srv.close();
  console.log('Netz-Test: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler'); fails.forEach(x => console.log('  ✗ ' + x)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

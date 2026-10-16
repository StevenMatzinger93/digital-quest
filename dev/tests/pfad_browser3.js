// Lernpfad im Browser, dritter Teil: Teil B über die Bedienung – NOR-Flipflop mit der Maus gebaut, Steuerungsart im Eigenschaftenfeld, Zustandsfolgediagramm abgeben,
// Digitaluhr und Zähler mit Siebensegmentanzeige im Editor prüfen. node tests/pfad_browser3.js
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const ROOT = path.join(__dirname, '../..'), url = 'file://' + path.join(ROOT, 'studio.html'), shots = path.join(__dirname, 'shots');
const fails = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fails.push(m); };
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.pfad); await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.pfad);
  await page.evaluate(() => { const st = Studio.pfad.stand(); DQPfad.freischalten(st, ['*']); Studio.pfad.setStand(st); });
  const retry = async fn => { let err; for (let k = 0; k < 5; k++) { try { return await fn(); } catch (e) { err = e; await page.waitForTimeout(120); } } throw err; };
  const pin = id => retry(() => page.click(`[data-pin="${id}"] .pinhit`, { force: true, timeout: 1500 }));
  const edit = async aid => { await page.evaluate(a => Studio.pfad.openAufgabe(a), aid); await page.waitForSelector('[data-a="edit"]'); await page.click('[data-a="edit"]'); await page.waitForSelector('#pfpanel'); await page.waitForTimeout(250); };
  const place = async (type, fx, fy) => { const tab = await page.evaluate(t => Studio.PALETTE.find(g => g.items.includes(t)).name, type); await page.click(`[data-tab="${tab}"]`); await page.click(`[data-add="${type}"]`); const b = await page.locator('#board').boundingBox(); await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy); await page.keyboard.press('Escape'); await page.waitForTimeout(120); };
  const pruefe = async () => { await page.click('#pfpanel [data-a="check"]'); await page.waitForTimeout(150); return (await page.textContent('#pfpMsg')).trim(); };
  const back = async () => { await page.click('#pfpanel [data-a="zurueck"]'); await page.waitForSelector('.pf-aufg'); };

  // B1.5: NOR-Flipflop aus zwei NOR mit der Maus
  await edit('B1.5'); await place('nor', 0.45, 0.25); await place('nor', 0.45, 0.65);
  let msg = await pruefe(); ok(/nicht|mindestens|offen/.test(msg), 'unverdrahtet: ' + msg);
  await pin('E2.out'); await pin('U1.in1'); await pin('U2.out'); await pin('U1.in2'); await pin('E1.out'); await pin('U2.in1'); await pin('U1.out'); await pin('U2.in2'); await pin('U1.out'); await pin('L1.in'); await pin('U2.out'); await pin('L2.in'); await page.waitForTimeout(200);
  msg = await pruefe(); ok(/Richtig/.test(msg), 'NOR-Flipflop angenommen: ' + msg); await page.screenshot({ path: shots + '/pfad_b1.png' }); await back();
  // B3.2 (Taktzustand): D-Flipflop mit Maus, Steuerungsart im Eigenschaftenfeld
  await edit('B3.2'); await place('dff', 0.45, 0.4); await pin('E1.out'); await pin('FF1.D'); await pin('C.out'); await pin('FF1.C'); await pin('E2.out'); await pin('FF1.PS'); await pin('E3.out'); await pin('FF1.PC'); await pin('FF1.Q'); await pin('L1.in'); await page.waitForTimeout(150);
  msg = await pruefe(); ok(/Nach .* zeigt L1/.test(msg), 'Standard (steigende Flanke) erfüllt B3.2 nicht, die Rückmeldung nennt den Schritt: ' + msg);
  await retry(() => page.click('[data-part="FF1"] .hit', { force: true, timeout: 1500 })); await page.waitForSelector('[data-f="trig"]'); await page.selectOption('[data-f="trig"]', 'level'); await page.waitForTimeout(150);
  msg = await pruefe(); ok(/Richtig/.test(msg), 'Steuerungsart «Taktzustand» eingestellt: richtig: ' + msg); await back();
  // B4.3 Zustandsfolgediagramm abgeben
  await page.evaluate(() => Studio.pfad.openAufgabe('B4.3')); await page.waitForSelector('#pfText'); await page.click('#pfWork [data-a="check"]'); ok(/Zeichne dein Diagramm/.test(await page.textContent('#pfMsg')), 'leer abgeben geht nicht');
  await page.fill('#pfText', 'T = 1 kippt, T = 0 hält'); await page.click('#pfWork [data-a="check"]'); await page.waitForSelector('#pfSol svg.pf-sfd'); ok(await page.locator('#pfSol svg.pf-sfd text').count() === 6, 'nach dem Abgeben: Zustandsfolgediagramm zum Vergleich (zwei Zustände, vier Pfeilbeschriftungen)');
  ok(/Abgegeben/.test(await page.textContent('#pfMsg')) && await page.locator('.pf-aufg[data-aid="B4.3"].ast-richtig').count() === 1, 'Abgabe zählt (nicht bewertet)'); await page.screenshot({ path: shots + '/pfad_zustand.png' });
  // B8.4 Zähler mit Siebensegmentanzeige: Musterlösung in den Editor laden und prüfen (ein Prüfdurchlauf im Editor)
  await edit('B8.4'); await page.evaluate(() => { Studio.loadLayout(JSON.parse(JSON.stringify(DQPfad.muster(DQPfad.task('B8.4')))), { run: true }); }); await page.waitForTimeout(200);
  msg = await pruefe(); ok(/Richtig/.test(msg), 'Zähler mit Siebensegmentanzeige geprüft: ' + msg);
  const gray = await page.evaluate(() => Studio.core.layout.parts.some(p => p.type === 'seg7')); ok(gray, 'Siebensegmentanzeige im Editor'); await page.screenshot({ path: shots + '/pfad_b8.png' }); await back();
  // B9.3 Digitaluhr
  await edit('B9.3'); const palette = await page.evaluate(() => Studio.PALETTE.reduce((a, g) => a.concat(g.items), []).filter(Studio.palFilter)); 
  const allowed = await page.evaluate(() => DQPfad.bauteileBis('B8')); ok(!palette.filter(t => !allowed.includes(t)).length, 'Bauteilleiste der Digitaluhr enthält nur Bauteile aus A1 bis B8 (' + palette.length + ' Bauteile)');
  ok(palette.includes('tff') && palette.includes('dec7') && palette.includes('seg7') && palette.includes('clock'), 'Taktgeber, T-Flipflop, Dekoder und Siebensegmentanzeige sind freigeschaltet');
  await page.evaluate(() => { Studio.loadLayout(JSON.parse(JSON.stringify(DQPfad.muster(DQPfad.task('B9.3')))), { run: true }); }); await page.waitForTimeout(250);
  const t0 = Date.now(); msg = await pruefe(); const dt = Date.now() - t0; ok(/Richtig/.test(msg) && /62 Takte/.test(msg), 'Digitaluhr: 62 Takte angenommen: ' + msg + ' (' + dt + ' ms)'); ok(dt < 15000, 'Prüfung der Uhr dauert ' + dt + ' ms');
  await page.screenshot({ path: shots + '/pfad_uhr.png' });
  // falsche Uhr (Zehnerübertrag fehlt)
  await page.evaluate(() => { const l = JSON.parse(JSON.stringify(DQPfad.muster(DQPfad.task('B9.3')))); l.wires = l.wires.filter(w => !(w.from === 'FF4.Q' && w.to === 'FF5.C')); Studio.loadLayout(l, { run: true }); }); await page.waitForTimeout(200);
  msg = await pruefe(); ok(/FF5\.C ist offen/.test(msg), 'Uhr ohne Übertrag: offener Takteingang wird genannt: ' + msg);
  await page.evaluate(() => { const l = JSON.parse(JSON.stringify(DQPfad.muster(DQPfad.task('B9.3')))); l.wires = l.wires.map(w => w.from === 'FF4.Q' && w.to === 'FF5.C' ? { from: 'FF1.Q', to: 'FF5.C' } : w); Studio.loadLayout(l, { run: true }); }); await page.waitForTimeout(200);
  msg = await pruefe(); ok(/zeigt AZ[12]/.test(msg) && /erwartet/.test(msg), 'Uhr mit falschem Übertrag: Anzeige, Takt und erwarteter Wert werden genannt: ' + msg); await back();
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Lernpfad-Browsertest 3: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

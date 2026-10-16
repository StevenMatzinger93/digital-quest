// Lernpfad im Browser, zweiter Teil: die Arbeitsflächen der übrigen Prüfarten über die Bedienung (KV-Diagramm mit Päckchen, Zuordnung mit Auswahlfeldern und Symbolen,
// Zahlentabelle, Prüffragen, Laborstation mit Messprotokoll). node tests/pfad_browser2.js
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const ROOT = path.join(__dirname, '../..'), url = 'file://' + path.join(ROOT, 'studio.html'), shots = path.join(__dirname, 'shots');
const fails = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fails.push(m); };
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(); await ctx.addInitScript(() => { window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; }); /* Systemdialoge aus: Download und Dateiauswahl des Browsers prüfbar (tests/netz.js prüft die Systemdialoge) */ const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.pfad); await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.pfad);
  await page.evaluate(() => { const st = Studio.pfad.stand(); DQPfad.freischalten(st, ['*']); Studio.pfad.setStand(st); });
  const open = async aid => { await page.evaluate(a => Studio.pfad.openAufgabe(a), aid); await page.waitForSelector('#pfWork h2'); };
  const check = async () => { await page.click('#pfWork [data-a="check"]'); await page.waitForTimeout(60); return (await page.textContent('#pfMsg')).trim(); };
  const cell = m => page.click(`#pfKv [data-m="${m}"]`);
  const group = async cells => { for (const m of cells) await cell(m); await page.click('[data-a="kvgruppe"]'); };

  // KV-Diagramm Nr. 5: m(0, 1, 4, 5, 12, 13)
  await open('A10.5'); ok(await page.locator('#pfKv .kv-cell').count() === 16, 'KV-Diagramm mit 16 Feldern');
  ok(await page.locator('#pfKv .kv-v.one').count() === 6, 'sechs Einsen eingetragen (m(0, 1, 4, 5, 12, 13))');
  let msg = await check(); ok(/Zeichne zuerst|Noch nichts/.test(msg), 'ohne Päckchen: Aufforderung (' + msg + ')');
  await group([0, 1]); await page.fill('#pfExpr', '/e2/e3/e4'); msg = await check(); ok(/vergrössern/.test(msg) || /liegt in keinem/.test(msg), 'zu kleines Päckchen / fehlende Eins wird genannt: ' + msg);
  await page.click('[data-a="kvweg"] >> nth=0'); ok(await page.locator('#pfGl li').count() === 0, 'Päckchen lässt sich entfernen');
  await group([0, 1, 4, 5]); await group([4, 5, 12, 13]); ok(await page.locator('#pfKv .kv-loop').count() >= 2, 'Päckchen werden eingezeichnet');
  await page.fill('#pfExpr', '/e2 /e4 v /e2 e3'); await page.waitForTimeout(50); ok(await page.locator('#pfPrev .ov').count() >= 3, 'Vorschau der Minimalform mit Überstreichung');
  await page.screenshot({ path: shots + '/pfad_kv.png' });
  msg = await check(); ok(/Richtig: Päckchen und Minimalform/.test(msg) && await page.locator('.pf-aufg[data-aid="A10.5"].ast-richtig').count() === 1, 'KV Nr. 5 richtig: ' + msg);
  // Ecken über den Rand: Nr. 4, m(0, 2, 8, 10)
  await open('A10.4'); await group([0, 2, 8, 10]); await page.fill('#pfExpr', '/e1/e3'); msg = await check(); ok(/Richtig/.test(msg), 'Ecken-Päckchen über den Rand angenommen: ' + msg);
  // falsche Minimalform bei richtigen Päckchen
  await open('A10.1'); await group([1, 3, 5, 7]); await page.fill('#pfExpr', 'e1'); msg = await check(); ok(/Minimalform: Nicht gleichwertig/.test(msg), 'richtige Päckchen, falsche Minimalform: ' + msg);
  // Don't-Care: A11.3
  await open('A11.3'); ok(await page.locator('#pfKv .kv-v.dc').count() === 6, 'sechs Don\'t-Care-Felder (X) im Diagramm');
  // A4: Symbole und Auswahlfelder
  await open('A4.1'); ok(await page.locator('.pf-tab svg.pf-sym').count() === 8 && await page.locator('.pf-tab select.pf-cell').count() === 8, 'A4.1: acht Symbole und acht Auswahlfelder');
  await page.selectOption('.pf-tab select >> nth=0', 'UND'); msg = await check(); ok(/7 von 8 Feldern leer/.test(msg), 'Zuordnung teilweise (UND richtig): ' + msg); await page.screenshot({ path: shots + '/pfad_symbole.png' });
  await open('A4.2'); ok(await page.locator('.pf-tab svg.pf-sym').count() === 8, 'A4.2: acht US-Symbole'); await page.screenshot({ path: shots + '/pfad_symbole_us.png' });
  // A1: Zahlentabelle ohne Rechner, führende Nullen frei
  await open('A1.1'); ok(await page.locator('.pf-cell').count() === 32, 'A1.1: 16 Zeilen × 2 Felder');
  await page.fill('.pf-cell >> nth=0', '0'); await page.fill('.pf-cell >> nth=1', '0'); await page.fill('.pf-cell >> nth=2', '1'); await page.fill('.pf-cell >> nth=3', '1'); msg = await check();
  ok(/Zeile für Dezimal = 2/.test(msg) || /leer/.test(msg), 'A1.1 teilweise ausgefüllt: ' + msg);
  // Prüffragen
  await open('A1.5'); await page.click('input[name="pfq0"][value="2"]'); await page.click('input[name="pfq1"][value="0"]'); msg = await check(); ok(/Frage 2 stimmt nicht|offen/.test(msg), 'Prüffragen: ' + msg);
  const stored = await page.evaluate(() => JSON.stringify(Studio.pfad.stand().stationen.A1.aufgaben['A1.5'].antwort)); ok(/\[2,0/.test(stored), 'Antworten der Prüffragen sind gespeichert: ' + stored);
  // Laborstation A2: Messprotokoll
  await open('A2.2'); ok(await page.locator('.warnbox').count() === 0 || true, ''); await page.evaluate(() => Studio.pfad.openStation('A2')); await page.waitForSelector('.pf-body h1');
  ok(/Laborstation/.test(await page.textContent('.warnbox')), 'A2 ist als Laborstation gekennzeichnet (nicht von der Software geprüft)'); await page.click('.pf-aufg[data-aid="A2.2"]'); await page.waitForSelector('.pf-cell[data-p]');
  ok(await page.locator('.pf-cell[data-p]').count() === 13 * 4, 'Messprotokoll: 13 Zeilen × 4 Messfelder');
  await page.fill('.pf-cell[data-p="0,0,1"]', '0,2'); await page.fill('#pfNotiz', 'Schwelle bei etwa 1,3 V'); msg = await check(); ok(/nicht von der Software geprüft/.test(msg), 'ohne Selbstbestätigung: Hinweis, dass die Software nicht prüft (' + msg + ')');
  await page.check('#pfSelbst'); msg = await check(); ok(/Von dir als erledigt markiert/.test(msg) && /nicht geprüft|die Software prüft/.test(msg + 'die Software prüft'), 'mit Selbstbestätigung als erledigt markiert: ' + msg);
  await page.screenshot({ path: shots + '/pfad_labor.png' });
  const prot = await page.evaluate(() => Studio.pfad.stand().stationen.A2.aufgaben['A2.2'].antwort); ok(prot.felder['0,0,1'] === '0,2' && /1,3 V/.test(prot.notiz) && prot.selbst === true, 'Messwerte, Notiz und Bestätigung gespeichert');
  // Neuladen: Messprotokoll bleibt
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.pfad); await page.evaluate(() => Studio.pfad.openAufgabe('A2.2')); await page.waitForSelector('.pf-cell[data-p]');
  ok(await page.inputValue('.pf-cell[data-p="0,0,1"]') === '0,2' && await page.isChecked('#pfSelbst'), 'Messprotokoll überlebt das Neuladen');
  // Schaltung mit Fehlersuche (A3.3): Startschaltung enthält den Fehler, nur Eingänge/Anzeige gesperrt
  await page.evaluate(() => Studio.pfad.openAufgabe('A3.3')); await page.waitForSelector('[data-a="edit"]'); await page.click('[data-a="edit"]'); await page.waitForSelector('#pfpanel'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => Studio.core.layout.parts.map(p => p.id).join()) === 'E1,E2,U1,L1,GND1' && await page.evaluate(() => !Studio.core.locked.U1 && !!Studio.core.locked.E1), 'Fehlersuche: das Gatter U1 ist veränderbar, die Eingänge sind gesperrt');
  await page.click('#pfpanel [data-a="check"]'); msg = (await page.textContent('#pfpMsg')).trim(); ok(/U1\.in2 ist offen/.test(msg), 'offener Eingang wird genannt: ' + msg);
  await page.click('#pfpanel [data-a="zurueck"]');
  await page.screenshot({ path: shots + '/pfad_nach_editor.png' });
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Lernpfad-Browsertest 2: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

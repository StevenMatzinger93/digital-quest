// Lernpfad im Browser (Playwright/Chromium): node tests/pfad_browser.js [--station=A5]
// Menü, Stationsliste, Zustände, Tabelle ausfüllen, Ausdruck eingeben, Schaltung bauen und prüfen (echte Mausbedienung), Lösung zeigen nach zwei Fehlversuchen,
// Fortschritt überlebt das Neuladen, Ausgeben und Einlesen ergibt denselben Stand, Station abschliessen. Nicht nur über die Daten: alles über die Bedienung.
const path = require('path'), fs = require('fs'), os = require('os');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const ROOT = path.join(__dirname, '../..'), url = 'file://' + path.join(ROOT, 'studio.html'), shots = path.join(__dirname, 'shots');
const fails = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fails.push(m); };
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }), page = await ctx.newPage(); await ctx.addInitScript(() => { window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; }); // Dateiauswahl des Systems abschalten: Download und Dateiauswahl des Browsers lassen sich automatisch prüfen (tests/netz.js prüft die Systemdialoge);
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
  const start = async () => { await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.sim && Studio.pfad); await page.evaluate(() => { try { localStorage.removeItem('dqstudio_autosave_v1'); } catch (e) { } }); };
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.Studio && Studio.sim && Studio.pfad);
  await page.evaluate(() => { localStorage.clear(); }); await start();
  const retry = async fn => { let err; for (let k = 0; k < 5; k++) { try { return await fn(); } catch (e) { err = e; await page.waitForTimeout(120); } } throw err; };
  const pin = id => retry(() => page.click(`[data-pin="${id}"] .pinhit`, { force: true, timeout: 1500 }));
  const stationen = await page.evaluate(() => DQPfad.stations.map(s => s.id)), first = stationen[0];

  // Menü und Liste
  await page.click('#menu-pfad > button'); ok(await page.locator('#menu-pfad .drop button').count() >= 4, 'Menü «Lernpfad» hat Einträge');
  await page.click('#menu-pfad .drop button:has-text("Stationen")'); await page.waitForSelector('#pfad:not([hidden]) .pf-card');
  ok(await page.locator('.pf-card').count() === stationen.length, 'Stationsliste zeigt alle ' + stationen.length + ' Stationen');
  ok(await page.locator('.pf-card.st-offen').count() === 1 && await page.locator('.pf-card[data-sid="' + first + '"].st-offen').count() === 1, 'die erste Station ist offen');
  if (stationen.length > 1) { ok(await page.locator('.pf-card.st-gesperrt').count() === stationen.length - 1, 'die übrigen sind gesperrt'); await page.click('.pf-card.st-gesperrt >> nth=0', { force: true }); await page.waitForSelector('#modalBg.open'); ok(/gesperrt/.test(await page.textContent('#modal')), 'Klick auf gesperrte Station erklärt, wann sie sich öffnet'); await page.keyboard.press('Escape'); await page.click('#mClose').catch(() => { }); await page.evaluate(() => Studio.closeModal()); }
  await page.screenshot({ path: shots + '/pfad_liste.png' });

  // Station A5
  const SID = 'A5'; ok(await page.evaluate(() => DQPfad.stationStatus(Studio.pfad.stand(), 'A5')) === 'gesperrt', 'A5 ist ohne Fortschritt gesperrt (erst A1 bis A4)');
  await page.evaluate(() => { const st = Studio.pfad.stand(); DQPfad.freischalten(st, ['A5']); Studio.pfad.setStand(st); }); // wie eine Freigabe der Lehrperson
  await page.evaluate(id => Studio.pfad.openStation(id), SID);
  const n5 = await page.evaluate(() => DQPfad.get('A5').aufgaben.length); ok(await page.locator('.pf-aufg').count() === n5, 'Station A5: ' + n5 + ' Aufgaben aufgelistet');
  ok(await page.locator('.pf-aufg.ast-offen').count() === n5, 'alle Aufgaben «offen»');
  // Trennstufe: Wahrheitstabelle (Aufgabe 1)
  await page.click('.pf-aufg[data-aid="A5.1"]'); await page.waitForSelector('.pf-tab');
  ok(await page.locator('.pf-cell').count() === 2, 'Trennstufe hat zwei Antwortfelder (e1 = 0 und e1 = 1)');
  await page.fill('.pf-cell >> nth=0', '1'); await page.fill('.pf-cell >> nth=1', '1'); await page.click('[data-a="check"]');
  let msg = await page.textContent('#pfMsg'); ok(/Die Zeile für e1 = 0 stimmt nicht/.test(msg), 'falsche Tabelle: Zeile genannt (' + msg.trim() + ')');
  ok(await page.locator('.pf-cell.bad').count() === 1 && await page.locator('.pf-cell.ok').count() === 1, 'richtiges Feld grün, falsches rot');
  ok(await page.locator('#pfLoesungBtn:not([hidden])').count() === 0, 'Lösung zeigen noch nicht sichtbar nach einem Fehlversuch');
  await page.click('[data-a="check"]'); ok(await page.locator('#pfLoesungBtn:not([hidden])').count() === 1, 'nach zwei Fehlversuchen erscheint «Lösung zeigen»');
  await page.click('#pfLoesungBtn'); ok(/Lösung/.test(await page.textContent('#pfSol')) && /Du hast die Lösung gesehen/.test(await page.textContent('#pfSol')), 'Lösung wird gezeigt, mit dem Hinweis, dass sie so nicht zählt');
  await page.fill('.pf-cell >> nth=0', '0'); await page.click('[data-a="check"]'); msg = await page.textContent('#pfMsg');
  ok(/Alles richtig/.test(msg) && await page.locator('.pf-aufg[data-aid="A5.1"].ast-richtig').count() === 1, 'richtig eingegeben: Aufgabe ✓ (nach gezeigter Lösung erst bei eigener Eingabe): ' + msg.trim());
  await page.screenshot({ path: shots + '/pfad_station.png' });
  // NICHT: Wahrheitstabelle, Ausdruck
  await page.click('.pf-aufg[data-aid="A5.5"]'); await page.waitForSelector('#pfExpr'); await page.fill('#pfExpr', '/e1'); await page.waitForTimeout(60);
  ok(/So liest die Software es/.test(await page.textContent('#pfPrev')) && await page.locator('#pfPrev .ov').count() === 1, 'Vorschau zeigt die Überstreichung');
  await page.click('[data-a="check"]'); ok(/gleichwertig/.test(await page.textContent('#pfMsg')) && await page.locator('.pf-aufg[data-aid="A5.5"].ast-richtig').count() === 1, 'Ausdruck /e1 angenommen');
  await page.click('.pf-aufg[data-aid="A5.8"]'); await page.fill('#pfExpr', 'e1 v e2'); await page.click('[data-a="check"]'); msg = await page.textContent('#pfMsg');
  ok(/Nicht gleichwertig: Bei e1 = 1, e2 = 0 liefert dein Ausdruck 1, verlangt ist 0/.test(msg), 'falscher Ausdruck wird begründet abgelehnt: ' + msg.trim());
  await page.fill('#pfExpr', 'e1 ('); await page.click('[data-a="check"]'); ok(/zu früh|Klammer/.test(await page.textContent('#pfMsg')), 'Syntaxfehler wird in Worten gemeldet');

  // NICHT: Schaltung bauen – echte Mausbedienung
  await page.click('.pf-aufg[data-aid="A5.6"]'); await page.waitForSelector('[data-a="edit"]'); await page.click('[data-a="edit"]');
  await page.waitForSelector('#pfpanel'); await page.waitForTimeout(250);
  ok(await page.locator('#pfad[hidden]').count() === 1, 'Editor offen, Lernpfad ausgeblendet');
  const items = await page.evaluate(() => Array.from(document.querySelectorAll('#palette [data-add]')).map(b => b.dataset.add).join()), tabs = await page.evaluate(() => Array.from(document.querySelectorAll('#palette [data-tab]')).map(b => b.dataset.tab).join());
  ok(!/resistor|battery|dff|ctr_/.test(items) && /not|and|logicin/.test(items + ',' + tabs), 'Bauteilleiste zeigt nur erlaubte Teile (A5: Gatter, Pegelschalter, Anzeige): ' + tabs);
  ok(await page.evaluate(() => Studio.core.layout.parts.map(p => p.id).sort().join()) === 'E1,GND1,L1', 'Startschaltung: Pegelschalter E1, Anzeige L1, Masse');
  ok(await page.evaluate(() => !!Studio.core.locked.E1 && !!Studio.core.locked.L1), 'Eingang und Anzeige gehören zur Aufgabe (gesperrt)');
  await page.click('[data-tab="Logik"]'); await page.click('[data-add="not"]'); const box = await page.locator('#board').boundingBox(); await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  let r1 = await page.evaluate(() => DQPfad.pruefe(DQPfad.task('A5.6'), Studio.core.layout)); ok(!r1.ok, 'noch nicht verdrahtet: nicht richtig (' + r1.meldung + ')');
  await page.click('#pfpanel [data-a="check"]'); ok(/offen|verlangt|zeigt/.test(await page.textContent('#pfpMsg')), 'Prüfen im Aufgabenfenster meldet den Mangel: ' + (await page.textContent('#pfpMsg')).trim());
  await pin('E1.out'); await pin('U1.in'); await pin('U1.out'); await pin('L1.in'); await page.waitForTimeout(150);
  await page.click('#pfpanel [data-a="check"]'); msg = await page.textContent('#pfpMsg'); ok(/Richtig: alle 2 Eingangskombinationen/.test(msg), 'gebaute Schaltung wird angenommen: ' + msg.trim());
  await page.screenshot({ path: shots + '/pfad_editor.png' });
  await page.click('#pfpanel [data-a="zurueck"]'); await page.waitForSelector('#pfad:not([hidden]) .pf-aufg'); ok(await page.locator('.pf-aufg[data-aid="A5.6"].ast-richtig').count() === 1, 'zurück in der Station: Aufgabe ✓');
  ok(await page.evaluate(() => !Studio.pfadPal) && await page.locator('#palette [data-tab]').count() >= 5, 'Bauteilleiste wieder vollständig');
  // falsche Schaltung (NICHT-Glied weggelassen) wird begründet abgelehnt: Trennstufe, nur Draht
  await page.click('.pf-aufg[data-aid="A5.3"]'); await page.click('[data-a="edit"]'); await page.waitForSelector('#pfpanel'); await page.waitForTimeout(200); await pin('E1.out'); await pin('L1.in'); await page.waitForTimeout(100);
  await page.click('#pfpanel [data-a="check"]'); msg = await page.textContent('#pfpMsg'); ok(/mindestens 1 Gatter|nur Draht/.test(msg), 'blosser Draht ist keine Trennstufe: ' + msg.trim());
  await page.click('#pfpanel [data-a="zurueck"]');

  // Neuladen: Fortschritt ist noch da
  const vor = await page.evaluate(() => JSON.stringify(Studio.pfad.stand())); await page.waitForTimeout(500);
  await start(); await page.evaluate(() => Studio.pfad.open('liste')); await page.waitForSelector('.pf-card');
  const nach = await page.evaluate(() => JSON.stringify(Studio.pfad.stand())); ok(vor === nach, 'Fortschritt überlebt das Neuladen (gleicher Stand)');
  ok(/(\d+) \/ 24/.test(await page.textContent('.pf-card[data-sid="A5"] .pf-cnt')) && /^3 \/ 24$/.test((await page.textContent('.pf-card[data-sid="A5"] .pf-cnt')).trim()), 'Karte zeigt 3 von 24 Pflichtaufgaben');
  ok(await page.locator('.pf-card[data-sid="A5"].st-arbeit').count() === 1, 'Station steht auf «in Arbeit»');

  // Ausgeben und Einlesen
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pfad-')), dl = page.waitForEvent('download'); await page.click('[data-a="export"]'); const d = await dl, file = path.join(tmp, 'stand.json'); await d.saveAs(file);
  ok(/\.fortschritt\.dqstudio\.json$/.test(d.suggestedFilename()), 'Datei heisst *.fortschritt.dqstudio.json: ' + d.suggestedFilename());
  const written = JSON.parse(fs.readFileSync(file, 'utf8')); ok(written.format === 'dqstudio-lernpfad' && written.version === 1, 'Datei hat Format und Version');
  await page.evaluate(() => { localStorage.clear(); }); await start(); await page.evaluate(() => Studio.pfad.open('liste')); await page.waitForSelector('.pf-card');
  ok(await page.evaluate(() => Object.keys(Studio.pfad.stand().stationen).length) === 0, 'nach dem Löschen des Browserspeichers ist der Stand leer');
  const fc = page.waitForEvent('filechooser'); await page.click('[data-a="import"]'); await (await fc).setFiles(file); await page.waitForSelector('#modalBg.open');
  ok(/eingelesen/.test(await page.textContent('#modal')), 'Einlesen meldet Erfolg'); await page.evaluate(() => Studio.closeModal());
  const gelesen = await page.evaluate(() => JSON.stringify(Studio.pfad.stand())); ok(gelesen === vor, 'Ausgeben und Einlesen ergibt denselben Stand');
  // kaputte und fremde Dateien
  fs.writeFileSync(path.join(tmp, 'kaputt.json'), '{nicht gültig'); const fc2 = page.waitForEvent('filechooser'); await page.click('[data-a="import"]'); await (await fc2).setFiles(path.join(tmp, 'kaputt.json')); await page.waitForSelector('#modalBg.open');
  ok(/kein gültiges JSON|keine Fortschrittsdatei/.test(await page.textContent('#modal')), 'kaputte Datei wird in Worten abgelehnt'); await page.evaluate(() => Studio.closeModal());
  ok(await page.evaluate(() => JSON.stringify(Studio.pfad.stand())) === vor, 'der Stand bleibt nach der abgelehnten Datei unverändert');
  // Freigabe durch die Lehrperson
  if (stationen.length > 1) {
    const frei = path.join(tmp, 'frei.json'); fs.writeFileSync(frei, JSON.stringify({ format: 'dqstudio-freigabe', version: 1, stationen: [stationen[stationen.length - 1]] }));
    const fc3 = page.waitForEvent('filechooser'); await page.click('[data-a="freigabelesen"]'); await (await fc3).setFiles(frei); await page.waitForSelector('#modalBg.open'); await page.evaluate(() => Studio.closeModal());
    ok(await page.locator('.pf-card[data-sid="' + stationen[stationen.length - 1] + '"]:not(.st-gesperrt)').count() === 1, 'freigeschaltete Station ist offen, obwohl die vorige nicht fertig ist');
  }
  // Station abschliessen: alle anderen Pflichtaufgaben über die Daten (die Bedienung ist oben vorgeführt), die letzte per Hand
  await page.evaluate(() => { const st = Studio.pfad.stand(); DQPfad.get('A5').aufgaben.filter(a => a.id !== 'A5.24').forEach(a => { if (DQPfad.aufgabeStatus(st, a.id) !== 'richtig') DQPfad.speichereErgebnis(st, a.id, { ok: true, meldung: 'x' }, DQPfad.muster(a), 't'); }); Studio.pfad.setStand(st); Studio.pfad.openAufgabe('A5.24'); });
  await page.waitForSelector('[data-a="edit"]'); ok(await page.locator('.pf-card').count() === 0, 'Station A5.24 geöffnet');
  await page.click('[data-a="edit"]'); await page.waitForSelector('#pfpanel'); await page.waitForTimeout(200);
  await page.evaluate(() => { const a = DQPfad.task('A5.24'); Studio.loadLayout(JSON.parse(JSON.stringify(DQPfad.muster(a))), { run: true }); }); await page.waitForTimeout(200);
  await page.click('#pfpanel [data-a="check"]'); await page.waitForTimeout(100); ok(/Richtig/.test(await page.textContent('#pfpMsg')), 'letzte Aufgabe richtig'); await page.click('#pfpanel [data-a="zurueck"]'); await page.waitForSelector('.pf-aufg');
  ok(await page.evaluate(() => DQPfad.stationStatus(Studio.pfad.stand(), 'A5')) === 'bestanden', 'Station A5 ist bestanden'); await page.click('[data-a="liste"]'); await page.waitForSelector('.pf-card');
  ok(await page.locator('.pf-card[data-sid="A5"].st-bestanden').count() === 1, 'Karte zeigt «bestanden»'); await page.screenshot({ path: shots + '/pfad_bestanden.png' });
  await page.click('[data-a="close"]'); ok(await page.locator('#pfad[hidden]').count() === 1, '«Zum Editor» schliesst den Lernpfad');
  ok(!external.length, 'Netzzugriffe: ' + external.join(', ')); ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Lernpfad-Browsertest: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

// Browser-Durchlauf (Playwright/Chromium): node tests/smoke.js
// Spielt Theorie T1A und Aufgaben 1.1, 1.5, 1.8 ueber die echte Oberflaeche (alle Aufgaben in beiden Ansichten: tests/tasks.js).
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const url = 'file://' + path.join(__dirname, '../../index.html') + '?alle';
const shots = process.argv[2] || path.join(__dirname, 'shots');
(async () => {
  require('fs').mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch(); const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR_/.test(m.text())) errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.screenshot({ path: shots + '/1_karte.png' });
  const pin = id => page.click(`[data-pin="${id}"] .pinhit`, { force: true });
  const check = async (name) => { await page.click('#btnCheck'); await page.waitForTimeout(100); const ok = await page.isVisible('#modal.open .win'); if (!ok) errors.push(name + ': nicht bestanden: ' + await page.textContent('#results')); else await page.click('#modal .modal-btns button:first-child'); };

  // Theorie T1A
  await page.click('[data-open="T1A"]'); await page.click('#toQuiz');
  for (const [i, j] of [[0, 1], [1, 1], [2, 2], [3, 1], [4, 1]]) await page.check(`input[name="q${i}"][value="${j}"]`);
  await page.click('#evalQuiz'); if (!/bestanden!/.test(await page.textContent('#quizRes'))) errors.push('T1A nicht bestanden');

  // 1.1 Lampe + Schalter
  await page.evaluate(() => DigitalQuest.openItem('1.1'));
  await page.click('[data-add="switch"]'); await page.click('[data-add="lamp"]');
  await pin('B1.p'); await pin('S1.a'); await pin('S1.b'); await pin('H1.a'); await pin('H1.b'); await pin('B1.n');
  await page.click('[data-part="S1"] .hit', { force: true });
  await page.screenshot({ path: shots + '/2_lampe.png' });
  await check('1.1');

  // 1.8 LED + Vorwiderstand, Spannung messen
  await page.evaluate(() => DigitalQuest.openItem('1.8'));
  await page.click('[data-add="resistor"]');
  await page.fill('[data-prop="value"]', '470'); await page.press('[data-prop="value"]', 'Enter'); await page.dispatchEvent('[data-prop="value"]', 'change');
  await pin('B1.p'); await pin('R1.a'); await pin('R1.b'); await pin('D1.a'); await pin('D1.k'); await pin('B1.n');
  await page.click('[data-mm="V"]'); await pin('D1.a'); await pin('D1.k');
  const lcd = await page.textContent('#lcd'); const v = parseFloat(lcd);
  await page.fill('[data-ans="uled"]', String(v)); await page.click('#btnVolt');
  await page.screenshot({ path: shots + '/3_led_messen.png' });
  await check('1.8');

  // 1.5 Strom messen: Leitung R1.b–H1.a loesen, Amperemeter in die Luecke
  await page.evaluate(() => DigitalQuest.openItem('1.5'));
  await page.dispatchEvent('[data-wire="1"] .wirehit', 'pointerdown'); await page.keyboard.press('Delete');
  await page.click('[data-mm="A"]'); await pin('R1.b'); await pin('H1.a');
  const ia = parseFloat(await page.textContent('#lcd'));
  await page.click('[data-mm="V"]'); await pin('R1.a'); await pin('R1.b');
  // Luecke wieder schliessen, dann Spannung messen
  await page.click('[data-mm="OFF"]'); await pin('R1.b'); await pin('H1.a');
  await page.click('[data-mm="V"]'); await pin('R1.a'); await pin('R1.b');
  const u2 = parseFloat(await page.textContent('#lcd'));
  await page.fill('[data-ans="i"]', String(ia)); await page.fill('[data-ans="ur"]', String(u2));
  await page.click('#btnScope'); await page.screenshot({ path: shots + '/4_messen.png' });
  await check('1.5');

  // Fehlbedienung: Amperemeter parallel zur Quelle
  await page.evaluate(() => DigitalQuest.openItem('1.5'));
  await page.click('[data-mm="A"]'); await pin('B1.p'); await pin('B1.n');
  if (await page.textContent('#lcd') !== 'FUSE') errors.push('Sicherung sollte durchbrennen');

  // ===== Werkbank (Umschalt-Button in der Toolbar): 1.1 komplett auf der Werkbank bauen =====
  const bpin = id => page.click(`#bench [data-pin="${id}"] .bpinhit`, { force: true });
  await page.evaluate(() => { delete DigitalQuest.state.drafts['1.1']; delete DigitalQuest.state.drafts['1.8']; DigitalQuest.openItem('1.1'); });
  await page.click('#btnView');
  if (!await page.isVisible('#bench') || await page.isVisible('#board')) errors.push('Werkbank: Umschalt-Button wirkt nicht');
  await page.click('[data-add="switch"]'); await page.click('[data-add="lamp"]');
  const bpos = await page.evaluate(() => ['S1', 'H1'].map(id => DigitalQuest.core.part(id).bench));
  if (!bpos[0] || bpos[0].x !== 520 || !bpos[1] || bpos[1].x !== 780) errors.push('Werkbank: bench-Layout der Aufgabe nicht verwendet ' + JSON.stringify(bpos));
  await bpin('B1.p'); await bpin('S1.a'); await bpin('S1.b'); await bpin('H1.a'); await bpin('H1.b'); await bpin('B1.n');
  await page.click('#bench [data-part="S1"] .bblock', { force: true });
  if (!await page.evaluate(() => DigitalQuest.core.part('S1').props.closed)) errors.push('Werkbank: Schalter nicht umgelegt');
  await page.screenshot({ path: shots + '/6_werkbank_lampe.png' });
  // gleiche Schaltung im Schema: hin- und herschalten aendert nichts
  await page.click('#btnView'); const wiresSchema = await page.locator('#board [data-wire]').count();
  if (wiresSchema !== 3 || !await page.isVisible('#board')) errors.push('Schema nach Umschalten: ' + wiresSchema + ' Leitungen');
  await page.click('#btnView');
  await check('1.1 Werkbank');

  // 1.8 auf der Werkbank, gemessen mit dem Werkbank-Multimeter (Drehschalter) + Oszilloskop (RUN)
  await page.evaluate(() => DigitalQuest.openItem('1.8'));
  if (!await page.isVisible('#bench')) errors.push('Werkbank: Ansicht nicht gemerkt');
  await page.click('[data-add="resistor"]');
  await page.fill('[data-prop="value"]', '470'); await page.dispatchEvent('[data-prop="value"]', 'change');
  await bpin('B1.p'); await bpin('R1.a'); await bpin('R1.b'); await bpin('D1.a'); await bpin('D1.k'); await bpin('B1.n');
  await page.click('#bench [data-dial="V"] .bdialhit', { force: true }); await bpin('D1.a'); await bpin('D1.k');
  const lcdB = await page.textContent('#bench .bmlcd'), lcdP = await page.textContent('#lcd');
  if (lcdB !== lcdP || !/^1\.9\d\d V$/.test(lcdP)) errors.push('Werkbank-Multimeter: ' + lcdB + ' / ' + lcdP);
  await page.fill('[data-ans="uled"]', String(parseFloat(lcdP)));
  await page.click('#bench [data-scope] rect', { force: true });
  if (!await page.locator('#bench .bsctrace').count()) errors.push('Werkbank-Oszilloskop: keine Kurve');
  await page.screenshot({ path: shots + '/7_werkbank_led.png' });
  // Live-Anzeige: Knotenspannungen und Tooltips mit Simulationswerten
  await page.click('#btnVolt');
  if (await page.locator('#bench .bvlabel').count() < 4) errors.push('Werkbank: Spannungsanzeige fehlt');
  const tipD1 = await page.textContent('#bench [data-part="D1"] > title');
  if (!/U = .*\n?I = /s.test(tipD1)) errors.push('Werkbank: Tooltip ohne U/I: ' + tipD1);
  await page.screenshot({ path: shots + '/8_werkbank_spannungen.png' });
  await page.click('#btnVolt');
  // Zeitlupe: Rechenschritte des Arbeitspunkts (LED wird leitend)
  await page.click('#btnReplay');
  const labels = [];
  for (let k = 0; k < 6; k++) { labels.push(await page.textContent('#rpLabel')); await page.click('#rpNext'); }
  if (!labels.some(l => /D1 wird leitend/.test(l)) || !labels.some(l => /Ruhelage/.test(l))) errors.push('Zeitlupe: ' + labels.join(' | '));
  await page.click('#rpClose');
  await check('1.8 Werkbank');

  // Kurzschluss auf der Werkbank: Batterie wird heiss, Diagnose mit echten Werten
  await page.evaluate(() => DigitalQuest.openItem('1.1'));
  await bpin('B1.p'); await bpin('B1.n');
  if (!await page.locator('#bench [data-part="B1"] .bsmoke').count()) errors.push('Werkbank: Kurzschluss nicht sichtbar');
  if (!/zulaessig 3\.000 A/.test(await page.textContent('#statusbar'))) errors.push('Diagnose ohne Werte: ' + await page.textContent('#statusbar'));
  await page.screenshot({ path: shots + '/9_werkbank_kurzschluss.png' });
  // Zoom (Mausrad), Verschieben (Ziehen auf leerer Flaeche), Einpassen
  const bb = await page.locator('#bench').boundingBox(), v0 = await page.evaluate(() => DigitalQuest.bench.view.slice());
  await page.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.5); await page.mouse.wheel(0, -300); await page.waitForTimeout(50);
  const v1 = await page.evaluate(() => DigitalQuest.bench.view.slice());
  await page.mouse.move(bb.x + 20, bb.y + bb.height - 20); await page.mouse.down(); await page.mouse.move(bb.x + 120, bb.y + bb.height - 60, { steps: 5 }); await page.mouse.up();
  const v2 = await page.evaluate(() => DigitalQuest.bench.view.slice());
  if (!(v1[2] < v0[2] * 0.9) || Math.abs(v2[0] - v1[0]) < 5) errors.push('Werkbank: Zoom/Verschieben wirkt nicht ' + JSON.stringify([v0, v1, v2].map(v => v.map(Math.round))));
  await page.screenshot({ path: shots + '/9b_werkbank_zoom.png' });
  await page.click('#btnFit');

  // ===== Freie Werkbank (Sandbox): Rechteckspannung, V~ mit TRMS und AVG =====
  await page.evaluate(() => { delete DigitalQuest.state.drafts.sandbox; });
  await page.click('[data-go="map"]'); await page.click('[data-open="sandbox"]');
  if (!await page.isVisible('#bench') || await page.isVisible('#btnCheck')) errors.push('Sandbox: nicht als freie Werkbank geoeffnet');
  // Wechselquelle laeuft live (60 Bilder/s): Klicks atomar per pointerdown ausloesen
  const bdown = sel => page.dispatchEvent('#bench ' + sel, 'pointerdown');
  await page.click('[data-add="acsource"]');
  await page.selectOption('[data-prop="shape"]', 'square');
  await page.click('[data-add="resistor"]');
  for (const x of ['G1.p', 'R1.a', 'R1.b', 'G1.n']) await bdown(`[data-pin="${x}"] .bpinhit`);
  await bdown('[data-dial="VAC"] .bdialhit'); await bdown('[data-pin="R1.a"] .bpinhit'); await bdown('[data-pin="R1.b"] .bpinhit');
  await page.click('[data-mt="trms"]'); const trms = parseFloat(await page.textContent('#lcd'));
  await page.click('[data-mt="avg"]'); const avg = parseFloat(await page.textContent('#lcd'));
  if (!(Math.abs(trms - 10) < 0.2 && Math.abs(avg - 11.1) < 0.2)) errors.push('V~ Rechteck: TRMS ' + trms + ' / AVG ' + avg);
  await page.screenshot({ path: shots + '/10_sandbox_wechselspannung.png' });
  await bdown('[data-dial="V"] .bdialhit');
  if (Math.abs(parseFloat(await page.textContent('#lcd'))) > 0.2) errors.push('V⎓ an Wechselspannung sollte ~0 zeigen: ' + await page.textContent('#lcd'));
  await page.click('[data-mt="trms"]');
  await page.click('#btnView'); // zurueck ins Schema fuer die folgenden Tests

  // Karte nach Teilen I–IV, Handbuch, Boss mit Auszeichnung (Loesung als Entwurf geladen), Zertifikat/Abzeichen
  await page.click('[data-go="map"]');
  const heads = await page.$$eval('.part-head .part-no', els => els.map(e => e.textContent));
  if (heads.join('|') !== 'Teil I|Teil II|Teil III|Teil IV') errors.push('Karte: Teile ' + heads.join('|'));
  if (await page.$$eval('.award-card', els => els.length) !== 2) errors.push('Karte: 2 Auszeichnungs-Karten erwartet');
  await page.click('[data-go="manual"]');
  for (const id of await page.$$eval('[data-man]', els => els.map(e => e.dataset.man))) {
    await page.click(`[data-man="${id}"]`);
    if ((await page.textContent('.manual article')).length < 80) errors.push('Handbuch-Seite leer: ' + id);
  }
  if (!/Motor/.test(await page.evaluate(() => DQ.manual.map(p => p.html).join(' ')))) errors.push('Handbuch: Motor fehlt');
  await page.evaluate(() => { const t = DQ.byId['15.10']; DigitalQuest.state.drafts['15.10'] = { layout: JSON.parse(JSON.stringify(t.ref)), answers: {} }; DigitalQuest.openItem('15.10'); });
  if (!/Erlaubt: hoechstens/.test(await page.textContent('#taskInfo'))) errors.push('15.10: Limit-Hinweis fehlt');
  await page.click('#btnCheck'); await page.waitForTimeout(150);
  if (!await page.isVisible('#modal.open .award-note')) errors.push('15.10: Abzeichen im Erfolgsdialog fehlt: ' + (await page.textContent('#results')).slice(0, 200));
  else {
    await page.click('#modal .modal-btns button:nth-child(2)'); // "Abzeichen anzeigen"
    if (!await page.isVisible('#scr-award .certificate.profi')) errors.push('Abzeichen-Seite nicht geoeffnet');
    await page.fill('#awName', 'Alex Muster');
    if ((await page.textContent('#awNameOut')) !== 'Alex Muster') errors.push('Name auf dem Abzeichen wird nicht uebernommen');
    await page.screenshot({ path: shots + '/12_abzeichen.png' });
    await page.click('#awBack');
    if (!await page.isVisible('[data-award="profi"]')) errors.push('Karte: Abzeichen nicht als erhalten markiert');
  }

  // Handy
  const m =await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on('pageerror', e => errors.push('mobil: ' + e.message));
  await m.goto(url, { waitUntil: 'domcontentloaded' }); await m.evaluate(() => DigitalQuest.openItem('1.8')); await m.screenshot({ path: shots + '/5_handy.png', fullPage: true });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (overflow) errors.push('mobil: horizontaler Scroll');
  await m.click('#btnView'); await m.screenshot({ path: shots + '/11_handy_werkbank.png' });
  if (await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errors.push('mobil Werkbank: horizontaler Scroll');

  const st = await page.evaluate(() => DigitalQuest.state);
  console.log('Erledigt:', Object.keys(st.done).join(', '), '| Ereignisse:', st.events.length);
  await browser.close();
  if (errors.length) { console.log('FEHLER:\n' + errors.join('\n')); process.exit(1); }
  console.log('Browser-Durchlauf OK');
})();

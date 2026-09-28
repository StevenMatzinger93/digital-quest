// Browser-Durchlauf (Playwright/Chromium): node tests/smoke.js
// Spielt Theorie T1A und Aufgaben 1.1–1.3 ueber die echte Oberflaeche.
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const url = 'file://' + path.join(__dirname, '../../index.html') + '?alle';
const shots = process.argv[2] || path.join(__dirname, 'shots');
(async () => {
  require('fs').mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch(); const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR_/.test(m.text())) errors.push(m.text()); });
  await page.goto(url); await page.screenshot({ path: shots + '/1_karte.png' });
  const pin = id => page.click(`[data-pin="${id}"] .pinhit`, { force: true });
  const check = async (name) => { await page.click('#btnCheck'); await page.waitForTimeout(100); const ok = await page.isVisible('#modal.open .win'); if (!ok) errors.push(name + ': nicht bestanden: ' + await page.textContent('#results')); else await page.click('#modal .modal-btns button:first-child'); };

  // Theorie T1A
  await page.click('[data-open="T1A"]'); await page.click('#toQuiz');
  for (const [i, j] of [[0, 1], [1, 2], [2, 2], [3, 0], [4, 2]]) await page.check(`input[name="q${i}"][value="${j}"]`);
  await page.click('#evalQuiz'); if (!/bestanden!/.test(await page.textContent('#quizRes'))) errors.push('T1A nicht bestanden');

  // 1.1 Lampe + Schalter
  await page.evaluate(() => DigitalQuest.openItem('1.1'));
  await page.click('[data-add="switch"]'); await page.click('[data-add="lamp"]');
  await pin('B1.p'); await pin('S1.a'); await pin('S1.b'); await pin('H1.a'); await pin('H1.b'); await pin('B1.n');
  await page.click('[data-part="S1"] .hit', { force: true });
  await page.screenshot({ path: shots + '/2_lampe.png' });
  await check('1.1');

  // 1.2 LED + Vorwiderstand, Spannung messen
  await page.evaluate(() => DigitalQuest.openItem('1.2'));
  await page.click('[data-add="resistor"]');
  await page.fill('[data-prop="value"]', '470'); await page.press('[data-prop="value"]', 'Enter'); await page.dispatchEvent('[data-prop="value"]', 'change');
  await pin('B1.p'); await pin('R1.a'); await pin('R1.b'); await pin('D1.a'); await pin('D1.k'); await pin('B1.n');
  await page.click('[data-mm="V"]'); await pin('D1.a'); await pin('D1.k');
  const lcd = await page.textContent('#lcd'); const v = parseFloat(lcd);
  await page.fill('[data-ans="uled"]', String(v)); await page.click('#btnVolt');
  await page.screenshot({ path: shots + '/3_led_messen.png' });
  await check('1.2');

  // 1.3 Strom messen: Leitung R1.b–R2.a loesen, Amperemeter in die Luecke
  await page.evaluate(() => DigitalQuest.openItem('1.3'));
  await page.dispatchEvent('[data-wire="1"] .wirehit', 'pointerdown'); await page.keyboard.press('Delete');
  await page.click('[data-mm="A"]'); await pin('R1.b'); await pin('R2.a');
  const ia = parseFloat(await page.textContent('#lcd'));
  await page.click('[data-mm="V"]'); await pin('R2.a'); await pin('R2.b');
  // Luecke wieder schliessen, dann Spannung messen
  await page.click('[data-mm="OFF"]'); await pin('R1.b'); await pin('R2.a');
  await page.click('[data-mm="V"]'); await pin('R2.a'); await pin('R2.b');
  const u2 = parseFloat(await page.textContent('#lcd'));
  await page.fill('[data-ans="i"]', String(ia)); await page.fill('[data-ans="u2"]', String(u2));
  await page.click('#btnScope'); await page.screenshot({ path: shots + '/4_messen.png' });
  await check('1.3');

  // Fehlbedienung: Amperemeter parallel zur Quelle
  await page.evaluate(() => DigitalQuest.openItem('1.3'));
  await page.click('[data-mm="A"]'); await pin('B1.p'); await pin('B1.n');
  if (await page.textContent('#lcd') !== 'FUSE') errors.push('Sicherung sollte durchbrennen');

  // Handy
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on('pageerror', e => errors.push('mobil: ' + e.message));
  await m.goto(url); await m.evaluate(() => DigitalQuest.openItem('1.2')); await m.screenshot({ path: shots + '/5_handy.png', fullPage: true });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (overflow) errors.push('mobil: horizontaler Scroll');

  const st = await page.evaluate(() => DigitalQuest.state);
  console.log('Erledigt:', Object.keys(st.done).join(', '), '| Ereignisse:', st.events.length);
  await browser.close();
  if (errors.length) { console.log('FEHLER:\n' + errors.join('\n')); process.exit(1); }
  console.log('Browser-Durchlauf OK');
})();

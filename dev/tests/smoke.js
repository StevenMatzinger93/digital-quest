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
  if (heads.join('|') !== 'Teil I|Teil II|Teil III|Teil IV|Frei ueben') errors.push('Karte: Teile ' + heads.join('|'));
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

  // Bauteil-Datenblatt: Palette (sofort), platziertes Bauteil (Verweilen) in Schema und Werkbank, Knopf im Panel, Handbuch
  const sheetOk = async (type, label, needText) => {
    const s = await page.evaluate(() => { const el = document.getElementById('dsPop'); return el && !el.hidden ? { type: el.dataset.type, txt: el.textContent, sym: !!el.querySelector('svg.symicon'), bench: !!el.querySelector('svg.benchicon') } : null; });
    if (!s) { errors.push('Datenblatt ' + label + ': nicht sichtbar'); return; }
    if (s.type !== type || !s.sym || !s.bench || !s.txt.includes(needText)) errors.push('Datenblatt ' + label + ': ' + JSON.stringify({ type: s.type, sym: s.sym, bench: s.bench, text: s.txt.slice(0, 60) }));
  };
  const dwell = async sel => { const b = await page.locator(sel).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.move(b.x + b.width / 2 + 2, b.y + b.height / 2 + 1); await page.waitForTimeout(1000); };
  await page.evaluate(() => { DigitalQuest.openItem('1.8'); DigitalQuest.setView('schema'); });
  await page.hover('[data-add="resistor"]'); await page.waitForTimeout(350);
  await sheetOk('resistor', 'Palette', 'Hoechstleistung');
  await page.mouse.move(5, 890); await page.waitForTimeout(400);
  if (await page.isVisible('#dsPop')) errors.push('Datenblatt schliesst nach dem Wegfahren nicht');
  await dwell('#board [data-part="D1"]'); await sheetOk('led', 'Schaltplan D1', 'Anode');
  await page.mouse.move(5, 890); await page.waitForTimeout(400);
  await page.evaluate(() => DigitalQuest.setView('bench'));
  await dwell('#bench [data-part="B1"]'); await sheetOk('battery', 'Werkbank B1', 'Kurzschluss');
  await page.mouse.move(5, 890); await page.waitForTimeout(400); await page.evaluate(() => DigitalQuest.setView('schema'));
  await page.click('#board [data-part="D1"] .hit', { force: true }); await page.click('#dsBtn');
  await sheetOk('led', 'Knopf im Panel', 'Hoechststrom');
  await page.keyboard.press('Escape'); if (await page.isVisible('#dsPop')) errors.push('Datenblatt schliesst nicht mit Esc');
  await page.click('[data-go="manual"]'); await page.click('[data-man="datenblaetter"]');
  const cards = await page.$$eval('.ds-card', els => els.map(e => !!e.querySelector('svg.symicon') && !!e.querySelector('svg.benchicon')));
  const nTypes = await page.evaluate(() => Object.keys(DigitalQuest.engine.PARTS).length);
  if (cards.length !== nTypes || cards.includes(false)) errors.push('Handbuch Datenblaetter: ' + cards.length + ' von ' + nTypes + ' mit beiden Bildern');
  await page.screenshot({ path: shots + '/14_datenblaetter.png' });

  // Einzeldatei ohne Konto: kein Dozentenmodus, keine Code-Eingabe, kein Konto-Chip; Sterne beim Loesen
  const tctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), tp = await tctx.newPage();
  tp.on('pageerror', e => errors.push('Einzeldatei: ' + e.message));
  await tp.goto(url.replace('?alle', ''), { waitUntil: 'domcontentloaded' });
  if (!await tp.isDisabled('[data-open="12.5"]')) errors.push('Einzeldatei: 12.5 sollte gesperrt sein');
  if (await tp.isVisible('#modeTag') || await tp.isVisible('#acctChip') || await tp.isVisible('#jump')) errors.push('Einzeldatei: Dozentenmodus/Konto-Chip sichtbar');
  await tp.click('[data-go="settings"]');
  if (await tp.$('#tCode')) errors.push('Einzeldatei: Code-Eingabe fuer den Dozentenmodus ist noch da');
  await tp.evaluate(() => { localStorage.setItem('digitalquest_state_v1', JSON.stringify({ version: 1, profile: { id: 'x' }, done: { '1.1': true }, events: [{ t: 5, type: 'task_done', id: '1.1', tries: 2, hints: 0 }], settings: { teacher: true } })); });
  await tp.reload({ waitUntil: 'domcontentloaded' });
  const old = await tp.evaluate(() => ({ di: DigitalQuest.state.doneInfo['1.1'], t: DigitalQuest.state.settings.teacher, dr: typeof DigitalQuest.state.drafts }));
  if (!old.di || old.di.stars !== 2 || old.di.at !== 5 || old.t || old.dr !== 'object') errors.push('Einzeldatei: alter Spielstand nicht sauber uebernommen: ' + JSON.stringify(old));
  if (await tp.isVisible('#modeTag')) errors.push('Einzeldatei: alter Dozentenmodus (settings.teacher) wirkt noch');
  await tctx.close();

  // Theorie-Bilder: alle 30 Lektionen – jeder Baustein rendert und reagiert (Mini-Schaltung: Klick aendert die Schaltung, Zeit laeuft mit)
  for (const id of await page.evaluate(() => DQ.theories.map(t => t.id))) {
    await page.evaluate(i => DigitalQuest.openItem(i), id); await page.waitForTimeout(250);
    const kinds = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.lesson-visual'), el => (el.className.match(/visual-(\w+)/) || [])[1]));
    if (!kinds.length) { errors.push(id + ': kein Bild in der Lektion'); continue; }
    for (let k = 0; k < kinds.length; k++) {
      const sel = '.lesson-visual:nth-of-type(' + (k + 1) + ')', vis = (await page.$$('.lesson-visual'))[k], t = kinds[k], tag = id + ' Bild ' + (k + 1) + ' (' + t + ')';
      if (!(await vis.evaluate(el => el.querySelector('.visual-body') && el.querySelector('.visual-body').innerHTML.length > 50))) { errors.push(tag + ': leer'); continue; }
      if (t === 'circuit') {
        const ci = await page.evaluate(() => DigitalQuest.visuals.slice(0).map(v => !!(v && v.core)));
        const idx = ci.slice(0, k + 1).filter(Boolean).length - 1;
        const toggle = await page.evaluate(i => { const v = DigitalQuest.visuals.filter(x => x && x.core)[i]; const p = v.core.layout.parts.find(q => ['switch', 'logicin'].includes(q.type)); return p ? p.id : null; }, idx);
        if (!(await page.evaluate(i => !!DigitalQuest.visuals.filter(x => x && x.core)[i].sim(), idx))) errors.push(tag + ': keine Simulation');
        if (toggle) {
          const before = await page.evaluate(([i, p]) => !!(DigitalQuest.visuals.filter(x => x && x.core)[i].core.part(p).props || {}).closed, [idx, toggle]);
          // echter Mausklick wie eine Person; Position frisch holen (Schaltungen mit Zeitverhalten zeichnen jedes Bild neu)
          const bb = await vis.evaluate((el, p) => { el.scrollIntoView({ block: 'center' }); const h = el.querySelector('.mini-svg:not([style*="none"]) [data-part="' + p + '"]'); if (!h) return null; const r = h.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, toggle);
          if (!bb) errors.push(tag + ': Schalter ' + toggle + ' nicht sichtbar'); else await page.mouse.click(bb.x, bb.y);
          const after = await page.evaluate(([i, p]) => !!(DigitalQuest.visuals.filter(x => x && x.core)[i].core.part(p).props || {}).closed, [idx, toggle]);
          if (before === after) errors.push(tag + ': Klick auf ' + toggle + ' wirkt nicht');
        }
        const dyn = await page.evaluate(i => DigitalQuest.visuals.filter(x => x && x.core)[i].core.layout.parts.some(p => ['clock', 'capacitor', 'acsource'].includes(p.type)), idx);
        if (dyn) { const t0 = await page.evaluate(i => DigitalQuest.visuals.filter(x => x && x.core)[i].time(), idx); await page.waitForTimeout(600); const t1 = await page.evaluate(i => DigitalQuest.visuals.filter(x => x && x.core)[i].time(), idx);
          if (!(t1 > t0 + 0.2 && isFinite(t1))) errors.push(tag + ': Zeit laeuft nicht (' + t0 + ' → ' + t1 + ')'); }

      } else if (t === 'numberSteps') {
        const a = await vis.$eval('.ns-pos', el => el.textContent); await vis.$eval('[data-ns="1"]', el => el.click()); const b = await vis.$eval('.ns-pos', el => el.textContent);
        if (a === b) errors.push(tag + ': ▶ wirkt nicht');
      } else if (t === 'kmap') {
        await vis.$eval('[data-kv="g"]', el => el.click()); if (!/=/.test(await vis.$eval('.kv-term', el => el.textContent))) errors.push(tag + ': kein Term');
      } else if (t === 'bode') {
        const a = await vis.$eval('.bode-ro', el => el.textContent); await vis.$eval('input', el => { el.value = +el.min + 0.3 * (el.max - el.min); el.dispatchEvent(new Event('input')); });
        if (a === await vis.$eval('.bode-ro', el => el.textContent)) errors.push(tag + ': Regler wirkt nicht');
      } else if (t === 'block') {
        if (!(await vis.$('svg'))) errors.push(tag + ': kein SVG');
      }
    }
  }
  await page.screenshot({ path: shots + '/17_theorie_bild.png' });

  // Portal-Version des Spiels (web/labor/) gegen den echten Worker-Code mit D1-Nachbau (tests/apiroute.js), ohne Cloudflare:
  // Dozentenmodus am Konto, Spielstand-Abgleich, Vorgaben auf der Karte, Live-Challenge, offline
  {
    const { attachSite, SITE } = require('./apiroute.js');
    const actx = await browser.newContext({ viewport: { width: 1300, height: 900 } }), site = await attachSite(actx), R = site.env.DB.raw;
    const tid = await site.addUser('frau.keller', 'lehrerin-1', 'teacher'), cid = site.addClass('EL 1a', tid, 'ABC234'), sid = await site.addUser('blitz', 'geheim1', 'student', cid);
    const sid2 = await site.addUser('funke', 'geheim2', 'student', cid);
    const ap = await actx.newPage(); ap.on('pageerror', e => errors.push('Konto: ' + e.message));
    const call = (pg, method, path, body) => pg.evaluate(async a => { const r = await fetch('/api/' + a.path, { method: a.method, headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: a.body ? JSON.stringify(a.body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; }, { method, path, body });
    const login = async (pg, u, p) => { await pg.goto(SITE + '/impressum.html'); const r = await call(pg, 'POST', 'login', { username: u, password: p }); if (r.status !== 200) errors.push('Konto: Anmeldung ' + u + ' → ' + r.status + ' ' + JSON.stringify(r.data)); };
    const lab = async (pg, q) => { await pg.goto(SITE + '/labor/' + (q || ''), { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.DigitalQuest && DigitalQuest.account.ready); await pg.evaluate(() => DigitalQuest.account.ready); await pg.waitForTimeout(150); };
    const srv = id => { const r = R.prepare("SELECT state, summary FROM progress WHERE user_id = ? AND quest = 'dq'").get(id); return r ? { state: JSON.parse(r.state), summary: JSON.parse(r.summary) } : null; };

    // nicht angemeldet: Chip „Anmelden“, alles wie lokal
    await lab(ap);
    if (!/Anmelden/.test(await ap.textContent('#acctChip')) || await ap.isVisible('#modeTag') || !await ap.isDisabled('[data-open="12.5"]')) errors.push('Konto: ohne Anmeldung falscher Zustand');
    // Dozenten-Konto = Dozentenmodus
    await login(ap, 'frau.keller', 'lehrerin-1'); await lab(ap);
    if (!await ap.isVisible('#modeTag')) errors.push('Konto: Dozenten-Konto schaltet den Dozentenmodus nicht ein');
    if (!/frau\.keller/.test(await ap.textContent('#acctChip'))) errors.push('Konto: Chip zeigt den Benutzernamen nicht');
    if (await ap.isDisabled('[data-open="15.10"]')) errors.push('Dozent: 15.10 nicht offen');
    await ap.selectOption('#jump', '12.5');
    if (!/Aufgabe 12\.5/.test(await ap.textContent('#taskInfo .crumb'))) errors.push('Dozent: Sprung zu 12.5 fehlgeschlagen');
    await ap.click('[data-go="map"]'); await ap.screenshot({ path: shots + '/13_dozent_karte.png' });
    await ap.click('.map-actions [data-open="sandbox"]');
    const pal = await ap.$$eval('[data-add]', els => els.map(e => e.dataset.add));
    if (!['motor', 'npn', 'dec7', 'acsource', 'jkff'].every(k => pal.includes(k))) errors.push('Dozent: Werkbank ohne alle Bauteile: ' + pal.join(','));
    await lab(ap, '?frei=1'); if (!/Freie Werkbank/.test(await ap.textContent('#taskInfo h2'))) errors.push('Portal: ?frei=1 oeffnet die Freie Werkbank nicht');
    // Vorgaben: Kapitel 2 fuer die Klasse, W3 fuer eine Person
    const v1 = await call(ap, 'POST', 'assignments', { targets: [{ type: 'kapitel', id: '2' }], classId: cid, due: '2099-12-31' });
    const v2 = await call(ap, 'POST', 'assignments', { targets: [{ type: 'aufgabe', id: 'W3' }], studentIds: [sid] });
    if (v1.status > 201 || v2.status > 201) errors.push('Konto: Vorgaben anlegen → ' + v1.status + '/' + v2.status + ' ' + JSON.stringify(v2.data));
    // Abmelden im Portal: Dozentenmodus aus, lokaler Stand leer
    await ap.goto(SITE + '/'); await ap.waitForSelector('#userBtn:visible'); await ap.click('#userBtn'); await ap.click('#logoutBtn'); await ap.waitForSelector('#loginBtn:visible');
    await lab(ap);
    if (await ap.isVisible('#modeTag') || !await ap.isDisabled('[data-open="12.5"]')) errors.push('Konto: Abmelden schaltet den Dozentenmodus nicht aus');
    // Lernende: Browser-Spielstand ohne Besitzer → Frage, dann ins Konto
    await ap.evaluate(() => { localStorage.removeItem('dquest_sync_dq'); localStorage.setItem('digitalquest_state_v1', JSON.stringify({ version: 1, profile: { id: 'p-1', vorname: 'Bea', nachname: 'Blitz', pseudonym: '' }, done: { '1.1': true }, events: [], settings: { theme: 'dark' } })); });
    await login(ap, 'blitz', 'geheim1');
    await ap.goto(SITE + '/labor/', { waitUntil: 'domcontentloaded' });
    await ap.waitForSelector('#modal.open'); if (!/ins Konto uebernehmen/.test(await ap.textContent('#modal'))) errors.push('Konto: Frage zum Browser-Spielstand fehlt');
    await ap.click('#modal .modal-btns button:last-child'); await ap.waitForTimeout(500);
    let sv = srv(sid);
    if (!sv || !sv.state.done['1.1']) errors.push('Konto: uebernommener Stand nicht auf dem Server');
    else if (sv.state.profile.vorname || sv.state.profile.nachname) errors.push('Konto: Name liegt auf dem Server');
    if (await ap.evaluate(() => DigitalQuest.state.profile.vorname) !== 'Bea') errors.push('Konto: Name lokal verloren');
    await ap.waitForSelector('.vg-box');
    if (await ap.$$eval('.vg-box li', l => l.length) !== 2) errors.push('Konto: Karte zeigt nicht beide Vorgaben');
    if (await ap.isDisabled('[data-open="2.5"]')) errors.push('Konto: zugewiesenes Kapitel 2 ist nicht offen');
    if (!await ap.isDisabled('[data-open="3.1"]')) errors.push('Konto: nicht zugewiesenes Kapitel 3 sollte gesperrt sein');
    await ap.screenshot({ path: shots + '/15_vorgaben_karte.png' });
    // Werkstatt-Vorgabe W3 loesen → Stand, Sterne und Kurzfassung auf dem Server
    await ap.click('.chapter.workshop [data-open="W3"]');
    const ex = await ap.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId.W3, DQ.byId.W3.ref));
    for (const k of Object.keys(ex)) await ap.fill(`[data-ans="${k}"]`, String(ex[k]));
    await ap.click('#btnCheck'); await ap.waitForSelector('#modal.open .win');
    if (await ap.$$eval('#modal .stars-win .star.on', l => l.length) !== 3) errors.push('Sterne: 3 Sterne im Erfolgsdialog erwartet');
    await ap.click('#modal .modal-btns button:first-child');
    await ap.waitForTimeout(3600);
    sv = srv(sid);
    if (!sv.state.done.W3 || (sv.state.doneInfo.W3 || {}).stars !== 3) errors.push('Konto: W3 mit 3 Sternen nicht auf dem Server');
    if (!sv.summary.done.includes('W3') || sv.summary.tasks !== 2) errors.push('Konto: Kurzfassung falsch: ' + JSON.stringify(sv.summary));
    if (!await ap.isVisible('.vg-box li.vg-done')) errors.push('Konto: erledigte Vorgabe nicht markiert');
    // Zweites Geraet war weiter: beim Laden gilt der Konto-Stand
    const st2 = Object.assign({}, sv.state, { done: Object.assign({}, sv.state.done, { T1A: true, '1.2': true }) });
    R.prepare("UPDATE progress SET state = ?, updated_at = updated_at + 5000 WHERE user_id = ?").run(JSON.stringify(st2), sid);
    await lab(ap);
    if (!await ap.evaluate(() => DigitalQuest.state.done['1.2'] && DigitalQuest.state.done.W3)) errors.push('Konto: weiterer Stand vom Server nicht uebernommen');
    // Anderes Konto am selben PC: Staende werden nie gemischt
    await login(ap, 'funke', 'geheim2'); await lab(ap);
    if (await ap.evaluate(() => Object.keys(DigitalQuest.state.done).length)) errors.push('Konto: Stand eines anderen Kontos uebernommen');
    if (await ap.$$eval('.vg-box li', l => l.length) !== 1) errors.push('Konto: funke sollte nur die Klassen-Vorgabe sehen');

    // Leitstand: Schuelerdetail zeigt W3 mit 3 Sternen
    const bctx = await browser.newContext({ viewport: { width: 1300, height: 900 } }); await attachSite(bctx, site.env);
    const bp = await bctx.newPage(); bp.on('pageerror', e => errors.push('Leitstand: ' + e.message));
    await login(bp, 'frau.keller', 'lehrerin-1');
    await bp.goto(SITE + '/#/leitstand/schueler/' + sid); await bp.waitForSelector('[data-task="W3"]');
    if (!/\bs3\b/.test(await bp.getAttribute('[data-task="W3"]', 'class'))) errors.push('Leitstand: W3 nicht als 3 Sterne markiert');
    await bp.click('[data-task="W3"]'); await bp.waitForSelector('#stCircuit svg'); await bp.screenshot({ path: shots + '/16_leitstand_schueler.png' });

    // Live-Challenge Stoerungsjagd: Lobby → Start → fehlerhafter Aufbau auf dem Tisch → beheben → Punkte und Rangliste
    const bug = await bp.evaluate(async () => (await (await fetch('/data/dq_live.json')).json()).bugs.filter(b => b.task === '1.8')[0]);
    if (!bug) errors.push('Live: kein Stoerungsszenario zu 1.8');
    else {
      const c = await call(bp, 'POST', 'challenges', { mode: 'bug', taskId: '1.8', bugId: bug.id, duration: 300, classId: cid, title: 'Test' });
      await login(ap, 'blitz', 'geheim1');
      const j = await call(ap, 'POST', 'live/join', { code: c.data.code }); if (j.status !== 200) errors.push('Live: Beitritt → ' + j.status);
      await ap.goto(SITE + '/labor/?live=' + c.data.id, { waitUntil: 'domcontentloaded' });
      await ap.waitForFunction(() => /Warte auf den Start/.test((document.querySelector('#liveOverlay') || {}).textContent || ''));
      await ap.screenshot({ path: shots + '/18_live_lobby.png' });
      await call(bp, 'POST', 'challenges/' + c.data.id + '/start', {});
      await ap.waitForSelector('.live-note', { timeout: 8000 });
      if (!/STOERUNGSMELDUNG/.test(await ap.textContent('.live-note')) || !/Nicht erfüllt/.test(await ap.textContent('.live-note'))) errors.push('Live: Stoerungsmeldung fehlt');
      const same = await ap.evaluate(() => JSON.stringify(DigitalQuest.editor.layout.wires.length) === JSON.stringify(DQ.byId['1.8'].wrong[0].wires.length));
      if (!same) errors.push('Live: fehlerhafter Aufbau liegt nicht auf dem Tisch');
      await ap.click('#btnCheck'); await ap.waitForTimeout(400);
      if (await ap.isVisible('#modal.open .win')) errors.push('Live: fehlerhafter Aufbau besteht die Pruefung');
      await ap.screenshot({ path: shots + '/19_live_stoerung.png' });
      // beheben: Musterloesung einsetzen (die Bedienung selbst prueft tests/tasks.js), Messwerte eintragen
      await ap.evaluate(() => { const t = DQ.byId['1.8']; DigitalQuest.editor.load(t.ref, t.start.parts.map(p => p.id), t.bench); });
      const ex8 = await ap.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId['1.8'], DQ.byId['1.8'].ref));
      for (const k of Object.keys(ex8)) await ap.fill(`[data-ans="${k}"]`, String(ex8[k]));
      await ap.click('#btnCheck'); await ap.waitForSelector('#modal.open .win');
      await ap.waitForFunction(() => /Punkte/.test((document.querySelector('#livePts') || {}).textContent || '') && /\+\d+/.test(document.querySelector('#livePts').textContent), null, { timeout: 8000 }).catch(() => errors.push('Live: Punkte kommen nicht an'));
      const row = R.prepare('SELECT attempts, points, solved_at, code FROM challenge_players WHERE challenge_id = ? AND user_id = ?').get(c.data.id, sid);
      if (!row || !row.solved_at || row.attempts !== 2 || !(row.points > 0) || !row.code || !JSON.parse(row.code).layout) errors.push('Live: Ergebnis auf dem Server falsch: ' + JSON.stringify(row && { a: row.attempts, p: row.points }));
      if (await ap.evaluate(() => !!DigitalQuest.state.done['1.8'] || !!DigitalQuest.state.drafts['1.8'])) errors.push('Live: Challenge hat den Spielstand veraendert');
      await ap.click('#modal .modal-btns button:last-child'); await ap.waitForSelector('#liveOverlay .podium');
      await ap.screenshot({ path: shots + '/20_live_rang.png' });
      // Beamer zeigt die Loesung als Schaltung
      await bp.goto(SITE + '/#/live/' + c.data.id); await bp.waitForTimeout(1500); await bp.screenshot({ path: shots + '/21_live_beamer.png' });
    }
    await bctx.close(); await actx.close();

    // Ohne Verbindung zum Server: Chip „offline“, Spiel laeuft lokal weiter
    const octx = await browser.newContext(); await attachSite(octx); await octx.route(SITE + '/api/**', r => r.abort());
    const op = await octx.newPage(); op.on('pageerror', e => errors.push('offline: ' + e.message));
    await op.goto(SITE + '/labor/', { waitUntil: 'domcontentloaded' }); await op.waitForTimeout(400);
    if (!/offline/.test(await op.textContent('#acctChip'))) errors.push('offline: Chip zeigt nicht „offline“');
    await op.click('[data-open="T1A"]'); if (!await op.isVisible('#toQuiz')) errors.push('offline: Spiel nicht spielbar');
    await octx.close();
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

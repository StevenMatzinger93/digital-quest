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

  // Theorie T1A – mit Merksatz-Box und Vorlesen-Knopf (Web Speech API in Chromium vorhanden; ohne Stimmen darf kein Fehler entstehen)
  await page.click('[data-open="T1A"]');
  if (!/Wichtigste in Kürze/.test(await page.textContent('#scr-theory .merksatz')) || (await page.textContent('#scr-theory .merksatz p')).length < 40) errors.push('T1A: Merksatz-Box fehlt');
  if (await page.evaluate(() => 'speechSynthesis' in window)) {
    if (!await page.$('#thRead')) errors.push('T1A: Vorlesen-Knopf fehlt');
    else { await page.click('#thRead'); await page.waitForTimeout(150); await page.click('#thRead'); if (!/Vorlesen/.test(await page.textContent('#thRead'))) errors.push('T1A: Vorlesen stoppt nicht beim zweiten Klick'); }
  }
  await page.click('#toQuiz');
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
  // Messspitze/Tastkopf ziehen (Standard fuer alle Aufgaben seit 01.10.2026) – atomar per PointerEvents, wie tests/tasks.js
  const bdrag = (which, pid) => page.evaluate(([which, pid]) => {
    const pr = document.querySelector('#bench [data-probe="' + which + '"] .bprobehit'), pin = document.querySelector('#bench [data-pin="' + pid + '"] .bpinhit'), svg = document.getElementById('bench');
    if (!pr || !pin) return 'fehlt: ' + (pr ? pid : which);
    const a = pr.getBoundingClientRect(), b = pin.getBoundingClientRect();
    const ev = (t, x, y) => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 });
    pr.dispatchEvent(ev('pointerdown', a.left + a.width / 2, a.top + a.height / 2)); svg.dispatchEvent(ev('pointermove', (a.left + b.left) / 2, (a.top + b.top) / 2));
    svg.dispatchEvent(ev('pointermove', b.left + b.width / 2, b.top + b.height / 2)); svg.dispatchEvent(ev('pointerup', b.left + b.width / 2, b.top + b.height / 2));
    const set = which === 'tip' || which === 'gnd' ? DigitalQuest.core.scopeProbes[which] : DigitalQuest.core.probes[which]; return set === pid ? 'ok' : 'liegt nicht an ' + pid;
  }, [which, pid]).then(r => { if (r !== 'ok') errors.push('Werkbank ziehen ' + which + '→' + pid + ': ' + r); });
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
  await page.click('#bench [data-dial="V"] .bdialhit', { force: true }); await bdrag('a', 'D1.a'); await bdrag('b', 'D1.k');
  const lcdB = await page.textContent('#bench .bmlcd'), lcdP = await page.textContent('#lcd');
  if (lcdB !== lcdP || !/^1\.9\d\d V$/.test(lcdP)) errors.push('Werkbank-Multimeter: ' + lcdB + ' / ' + lcdP);
  await page.fill('[data-ans="uled"]', String(parseFloat(lcdP)));
  await bdrag('tip', 'D1.a'); await bdrag('gnd', 'D1.k'); await page.click('#bench [data-scope] rect', { force: true });
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
  if (!/zulässig 3\.000 A/.test(await page.textContent('#statusbar'))) errors.push('Diagnose ohne Werte: ' + await page.textContent('#statusbar'));
  await page.screenshot({ path: shots + '/9_werkbank_kurzschluss.png' });
  // Zoom (Mausrad), Verschieben (Ziehen auf leerer Flaeche), Einpassen
  const bb = await page.locator('#bench').boundingBox(), v0 = await page.evaluate(() => DigitalQuest.bench.view.slice());
  await page.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.5); await page.mouse.wheel(0, -300); await page.waitForTimeout(50);
  if (JSON.stringify(await page.evaluate(() => DigitalQuest.bench.view.slice())) !== JSON.stringify(v0)) errors.push('Werkbank: Mausrad ohne Strg darf nicht zoomen (Seite soll scrollen)');
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control'); await page.waitForTimeout(50);
  const v1 = await page.evaluate(() => DigitalQuest.bench.view.slice());
  await page.mouse.move(bb.x + 20, bb.y + bb.height - 20); await page.mouse.down(); await page.mouse.move(bb.x + 120, bb.y + bb.height - 60, { steps: 5 }); await page.mouse.up();
  const v2 = await page.evaluate(() => DigitalQuest.bench.view.slice());
  if (!(v1[2] < v0[2] * 0.9) || Math.abs(v2[0] - v1[0]) < 5) errors.push('Werkbank: Zoom/Verschieben wirkt nicht ' + JSON.stringify([v0, v1, v2].map(v => v.map(Math.round))));
  await page.screenshot({ path: shots + '/9b_werkbank_zoom.png' });
  await page.click('#btnFit');

  // ===== Freie Werkbank (Sandbox): Rechteckspannung, V~ mit TRMS und AVG =====
  await page.evaluate(() => { delete DigitalQuest.state.drafts.sandbox; });
  await page.click('[data-go="map"]'); await page.click('[data-open="sandbox"]');
  if (!await page.isVisible('#bench') || await page.isVisible('#btnCheck')) errors.push('Sandbox: nicht als freie Werkbank geöffnet');
  // Wechselquelle laeuft live (60 Bilder/s): Klicks atomar per pointerdown ausloesen
  const bdown = sel => page.dispatchEvent('#bench ' + sel, 'pointerdown');
  await page.click('[data-add="acsource"]');
  await page.selectOption('[data-prop="shape"]', 'square');
  await page.click('[data-add="resistor"]');
  for (const x of ['G1.p', 'R1.a', 'R1.b', 'G1.n']) await bdown(`[data-pin="${x}"] .bpinhit`);
  await bdown('[data-dial="VAC"] .bdialhit'); await bdrag('a', 'R1.a'); await bdrag('b', 'R1.b');
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
  if (heads.join('|') !== 'Teil I|Teil II|Teil III|Teil IV|Teil V|Frei üben') errors.push('Karte: Teile ' + heads.join('|'));
  if (await page.$$eval('.award-card', els => els.length) !== 2) errors.push('Karte: 2 Auszeichnungs-Karten erwartet');
  await page.click('[data-go="manual"]');
  for (const id of await page.$$eval('[data-man]', els => els.map(e => e.dataset.man))) {
    await page.click(`[data-man="${id}"]`);
    if ((await page.textContent('.manual article')).length < 80) errors.push('Handbuch-Seite leer: ' + id);
  }
  if (!/Motor/.test(await page.evaluate(() => DQ.manual.map(p => p.html).join(' ')))) errors.push('Handbuch: Motor fehlt');
  await page.evaluate(() => { const t = DQ.byId['15.10']; DigitalQuest.state.drafts['15.10'] = { layout: JSON.parse(JSON.stringify(t.ref)), answers: {} }; DigitalQuest.openItem('15.10'); });
  if (!/Erlaubt: höchstens/.test(await page.textContent('#taskInfo'))) errors.push('15.10: Limit-Hinweis fehlt');
  await page.click('#btnCheck'); await page.waitForTimeout(150);
  if (!await page.isVisible('#modal.open .award-note')) errors.push('15.10: Abzeichen im Erfolgsdialog fehlt: ' + (await page.textContent('#results')).slice(0, 200));
  else {
    await page.click('#modal .modal-btns button:nth-child(2)'); // "Abzeichen anzeigen"
    if (!await page.isVisible('#scr-award .certificate.profi')) errors.push('Abzeichen-Seite nicht geöffnet');
    await page.fill('#awName', 'Alex Muster');
    if ((await page.textContent('#awNameOut')) !== 'Alex Muster') errors.push('Name auf dem Abzeichen wird nicht übernommen');
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
  await sheetOk('resistor', 'Palette', 'Höchstleistung');
  await page.mouse.move(5, 890); await page.waitForTimeout(400);
  if (await page.isVisible('#dsPop')) errors.push('Datenblatt schliesst nach dem Wegfahren nicht');
  await dwell('#board [data-part="D1"]'); await sheetOk('led', 'Schaltplan D1', 'Anode');
  await page.mouse.move(5, 890); await page.waitForTimeout(400);
  await page.evaluate(() => DigitalQuest.setView('bench'));
  await dwell('#bench [data-part="B1"]'); await sheetOk('battery', 'Werkbank B1', 'Kurzschluss');
  await page.mouse.move(5, 890); await page.waitForTimeout(400); await page.evaluate(() => DigitalQuest.setView('schema'));
  await page.click('#board [data-part="D1"] .hit', { force: true }); await page.click('#dsBtn');
  await sheetOk('led', 'Knopf im Panel', 'Höchststrom');
  await page.keyboard.press('Escape'); if (await page.isVisible('#dsPop')) errors.push('Datenblatt schliesst nicht mit Esc');
  await page.click('[data-go="manual"]'); await page.click('[data-man="datenblaetter"]');
  const cards = await page.$$eval('.ds-card', els => els.map(e => !!e.querySelector('svg.symicon') && !!e.querySelector('svg.benchicon')));
  const nTypes = await page.evaluate(() => Object.keys(DigitalQuest.engine.PARTS).length);
  if (cards.length !== nTypes || cards.includes(false)) errors.push('Handbuch Datenblätter: ' + cards.length + ' von ' + nTypes + ' mit beiden Bildern');
  await page.screenshot({ path: shots + '/14_datenblaetter.png' });

  // Einzeldatei ohne Konto: kein Dozentenmodus, keine Code-Eingabe, kein Konto-Chip; Sterne beim Loesen
  const tctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), tp = await tctx.newPage();
  tp.on('pageerror', e => errors.push('Einzeldatei: ' + e.message));
  await tp.goto(url.replace('?alle', ''), { waitUntil: 'domcontentloaded' });
  if (!await tp.isDisabled('[data-open="12.5"]')) errors.push('Einzeldatei: 12.5 sollte gesperrt sein');
  if (await tp.isVisible('#modeTag') || await tp.isVisible('#acctChip') || await tp.isVisible('#jump')) errors.push('Einzeldatei: Dozentenmodus/Konto-Chip sichtbar');
  await tp.click('[data-go="settings"]');
  if (await tp.$('#tCode')) errors.push('Einzeldatei: Code-Eingabe für den Dozentenmodus ist noch da');
  await tp.evaluate(() => { localStorage.setItem('digitalquest_state_v1', JSON.stringify({ version: 1, profile: { id: 'x' }, done: { '1.1': true }, events: [{ t: 5, type: 'task_done', id: '1.1', tries: 2, hints: 0 }], settings: { teacher: true } })); });
  await tp.reload({ waitUntil: 'domcontentloaded' });
  const old = await tp.evaluate(() => ({ di: DigitalQuest.state.doneInfo['1.1'], t: DigitalQuest.state.settings.teacher, dr: typeof DigitalQuest.state.drafts }));
  if (!old.di || old.di.stars !== 2 || old.di.at !== 5 || old.t || old.dr !== 'object') errors.push('Einzeldatei: alter Spielstand nicht sauber übernommen: ' + JSON.stringify(old));
  if (await tp.isVisible('#modeTag')) errors.push('Einzeldatei: alter Dozentenmodus (settings.teacher) wirkt noch');
  await tctx.close();

  // Theorie-Bilder: alle 30 Lektionen – jeder Baustein rendert und reagiert (Mini-Schaltung: Klick aendert die Schaltung, Zeit laeuft mit)
  for (const id of await page.evaluate(() => DQ.theories.map(t => t.id))) {
    await page.evaluate(i => DigitalQuest.openItem(i), id); await page.waitForTimeout(250);
    const kinds = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.lesson-visual'), el => (el.className.match(/visual-(\w+)/) || [])[1]));
    if (!kinds.length) { errors.push(id + ': kein Bild in der Lektion'); continue; }
    for (let k = 0; k < kinds.length; k++) {
      const sel = '.lesson-visual:nth-of-type(' + (k + 1) + ')', vis = (await page.$$('.lesson-visual'))[k], t = kinds[k], tag = id + ' Bild ' + (k + 1) + ' (' + t + ')';
      if (await vis.evaluate(el => el.classList.contains('collapsed') && !!el.querySelector('.visual-show'))) continue; // eingeklappt („Bild einblenden“): erst auf Knopfdruck
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
          if (!(t1 > t0 + 0.2 && isFinite(t1))) errors.push(tag + ': Zeit läuft nicht (' + t0 + ' → ' + t1 + ')'); }

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
    await lab(ap, '?frei=1'); if (!/Freie Werkbank/.test(await ap.textContent('#taskInfo h2'))) errors.push('Portal: ?frei=1 öffnet die Freie Werkbank nicht');
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
    await ap.waitForSelector('#modal.open'); if (!/ins Konto übernehmen/.test(await ap.textContent('#modal'))) errors.push('Konto: Frage zum Browser-Spielstand fehlt');
    await ap.click('#modal .modal-btns button:last-child'); await ap.waitForTimeout(500);
    let sv = srv(sid);
    if (!sv || !sv.state.done['1.1']) errors.push('Konto: übernommener Stand nicht auf dem Server');
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
    if (!await ap.evaluate(() => DigitalQuest.state.done['1.2'] && DigitalQuest.state.done.W3)) errors.push('Konto: weiterer Stand vom Server nicht übernommen');
    // Anderes Konto am selben PC: Staende werden nie gemischt
    await login(ap, 'funke', 'geheim2'); await lab(ap);
    if (await ap.evaluate(() => Object.keys(DigitalQuest.state.done).length)) errors.push('Konto: Stand eines anderen Kontos übernommen');
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
    if (!bug) errors.push('Live: kein Störungsszenario zu 1.8');
    else {
      const c = await call(bp, 'POST', 'challenges', { mode: 'bug', taskId: '1.8', bugId: bug.id, duration: 300, classId: cid, title: 'Test' });
      await login(ap, 'blitz', 'geheim1');
      const j = await call(ap, 'POST', 'live/join', { code: c.data.code }); if (j.status !== 200) errors.push('Live: Beitritt → ' + j.status);
      await ap.goto(SITE + '/labor/?live=' + c.data.id, { waitUntil: 'domcontentloaded' });
      await ap.waitForFunction(() => /Warte auf den Start/.test((document.querySelector('#liveOverlay') || {}).textContent || ''));
      await ap.screenshot({ path: shots + '/18_live_lobby.png' });
      await call(bp, 'POST', 'challenges/' + c.data.id + '/start', {});
      await ap.waitForSelector('.live-note', { timeout: 8000 });
      if (!/STÖRUNGSMELDUNG/.test(await ap.textContent('.live-note')) || !/Nicht erfüllt/.test(await ap.textContent('.live-note'))) errors.push('Live: Störungsmeldung fehlt');
      const same = await ap.evaluate(() => JSON.stringify(DigitalQuest.editor.layout.wires.length) === JSON.stringify(DQ.byId['1.8'].wrong[0].wires.length));
      if (!same) errors.push('Live: fehlerhafter Aufbau liegt nicht auf dem Tisch');
      await ap.click('#btnCheck'); await ap.waitForTimeout(400);
      if (await ap.isVisible('#modal.open .win')) errors.push('Live: fehlerhafter Aufbau besteht die Prüfung');
      await ap.screenshot({ path: shots + '/19_live_stoerung.png' });
      // beheben: Musterloesung einsetzen (die Bedienung selbst prueft tests/tasks.js), Messwerte eintragen
      await ap.evaluate(() => { const t = DQ.byId['1.8']; DigitalQuest.editor.load(t.ref, t.start.parts.map(p => p.id), t.bench); });
      const ex8 = await ap.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId['1.8'], DQ.byId['1.8'].ref));
      for (const k of Object.keys(ex8)) await ap.fill(`[data-ans="${k}"]`, String(ex8[k]));
      await ap.click('#btnCheck'); await ap.waitForSelector('#modal.open .win');
      await ap.waitForFunction(() => /Punkte/.test((document.querySelector('#livePts') || {}).textContent || '') && /\+\d+/.test(document.querySelector('#livePts').textContent), null, { timeout: 8000 }).catch(() => errors.push('Live: Punkte kommen nicht an'));
      const row = R.prepare('SELECT attempts, points, solved_at, code FROM challenge_players WHERE challenge_id = ? AND user_id = ?').get(c.data.id, sid);
      if (!row || !row.solved_at || row.attempts !== 2 || !(row.points > 0) || !row.code || !JSON.parse(row.code).layout) errors.push('Live: Ergebnis auf dem Server falsch: ' + JSON.stringify(row && { a: row.attempts, p: row.points }));
      if (await ap.evaluate(() => !!DigitalQuest.state.done['1.8'] || !!DigitalQuest.state.drafts['1.8'])) errors.push('Live: Challenge hat den Spielstand verändert');
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

  // Messwerk-Animation in T16A: Vorhersage-Frage schaltet das Widget frei, Regler bewegt die Zeiger (linear vs. quadratisch)
  {
    const tp = await browser.newPage({ viewport: { width: 1440, height: 900 } }); tp.on('pageerror', e => errors.push('Messwerk: ' + e.message));
    await tp.goto(url, { waitUntil: 'domcontentloaded' }); await tp.evaluate(() => DigitalQuest.openItem('T16A')); await tp.waitForSelector('.visual-meterwork');
    if (!await tp.$eval('.visual-meterwork .mw', e => e.hidden)) errors.push('Messwerk: Widget schon vor der Vorhersage sichtbar');
    if (await tp.evaluate(() => { const i = DigitalQuest.visuals.find(x => x && x.angles); return !i || i.playing; })) errors.push('T16A: Animation fehlt oder läuft vor der ersten Bedienung');
    await tp.click('.visual-meterwork [data-mwp="0"]'); await tp.waitForTimeout(100);
    if (!/Nicht ganz/.test(await tp.textContent('.visual-meterwork .mw-expl')) || await tp.$eval('.visual-meterwork .mw', e => e.hidden)) errors.push('Messwerk: Vorhersage-Antwort schaltet das Widget nicht frei');
    const ang = async () => tp.$$eval('.visual-meterwork .mw-needle', l => l.map(n => parseFloat(n.getAttribute('transform').slice(7))));
    // Phase 5: kein Autostart, Zusatzbloecke zu, nur zwei Bilder sichtbar, „Bild einblenden“, Tempo wirkt messbar, Pause haelt an
    if (await tp.$$eval('.lesson details.zusatz', l => l.length) !== 2 || await tp.$$eval('.lesson details.zusatz[open]', l => l.length)) errors.push('T16A: zwei geschlossene Zusatzblöcke erwartet');
    await tp.click('.lesson details.zusatz summary'); if (!await tp.$('.lesson details.zusatz[open]') || !/Aufgabe 16\.5/.test(await tp.textContent('.lesson details.zusatz[open]'))) errors.push('T16A: Zusatzblock klappt nicht auf');
    if (await tp.$$eval('.visual:not(.collapsed)', l => l.length) > 2 || await tp.$$eval('.visual.collapsed .visual-show', l => l.length) !== 3) errors.push('T16A: mehr als zwei sichtbare Bilder oder Einblenden-Knöpfe fehlen (' + await tp.$$eval('.visual:not(.collapsed)', l => l.length) + '/' + await tp.$$eval('.visual.collapsed .visual-show', l => l.length) + ')');
    await tp.click('.visual.collapsed .visual-show'); if (!await tp.$('.visual-block:not(.collapsed) svg')) errors.push('T16A: „Bild einblenden“ zeigt das Bild nicht');
    const tAt = () => tp.evaluate(() => DigitalQuest.visuals.find(x => x && x.angles).state.t);
    const playing = () => tp.evaluate(() => DigitalQuest.visuals.find(x => x && x.angles).playing);
    await tp.selectOption('.visual-meterwork [data-pb="speed"]', '0.25'); if (!await playing()) await tp.click('.visual-meterwork [data-pb="play"]'); await tp.waitForTimeout(600); const t1 = await tAt(); await tp.waitForTimeout(600); const slow = (await tAt()) - t1;
    await tp.selectOption('.visual-meterwork [data-pb="speed"]', '1'); await tp.waitForTimeout(600); const t2 = await tAt(); await tp.waitForTimeout(600); const fast = (await tAt()) - t2;
    if (!(fast > slow * 2.5)) errors.push('T16A: Tempo-Regler wirkt nicht messbar (0,25×: ' + slow.toFixed(2) + ' s, 1×: ' + fast.toFixed(2) + ' s)');
    await tp.click('.visual-meterwork [data-pb="play"]'); const tp1 = await tAt(); await tp.waitForTimeout(500); if (Math.abs((await tAt()) - tp1) > 1e-9) errors.push('T16A: Pause hält die Animation nicht an');
    await tp.click('.visual-meterwork [data-pb="step"]'); if (!((await tAt()) > tp1 + 0.2)) errors.push('T16A: Einzelschritt bewegt die Zeit nicht');
    if (await tp.evaluate(() => DigitalQuest.state.settings.animSpeed) !== 1) errors.push('T16A: Tempo wird nicht in den Einstellungen gemerkt');
    const settled = async () => { for (let k = 0; k < 40; k++) { const p = await ang(); await tp.waitForTimeout(200); const q = await ang(); if (Math.abs(p[0] - q[0]) < 0.3 && Math.abs(p[1] - q[1]) < 0.3 && k > 4) return q; } return ang(); };
    await tp.selectOption('.visual-meterwork [data-mw="signal"]', 'dc'); await tp.$eval('.visual-meterwork [data-mw="amp"]', e => { e.value = '1'; e.dispatchEvent(new Event('input')); });
    const a1 = await settled();
    await tp.$eval('.visual-meterwork [data-mw="amp"]', e => { e.value = '0.5'; e.dispatchEvent(new Event('input')); });
    const a2 = await settled();
    if (!(a1[0] > 35 && a1[1] > 35)) errors.push('Messwerk: Vollausschlag nicht erreicht: ' + a1.join('/'));
    if (!(a2[0] < a1[0] - 30 && a2[1] < a2[0] - 10)) errors.push('Messwerk: halber Strom – Drehspul sollte halb, Dreheisen ein Viertel zeigen: ' + a2.join('/'));
    const mat = await tp.evaluate(() => [...document.querySelectorAll('.visual-meterwork .mw-face')].map(svg => {
      const ids = new Set(); svg.querySelectorAll('*').forEach(el => { for (const a of ['fill', 'filter', 'stroke']) { const m = /url\(#([\w-]+)\)/.exec(el.getAttribute(a) || ''); if (m) ids.add(m[1]); } });
      return { grads: svg.querySelectorAll('defs radialGradient, defs linearGradient').length, refs: ids.size, missing: [...ids].filter(id => !svg.querySelector('#' + id)), dup: [...ids].filter(id => document.querySelectorAll('#' + id).length !== 1),
        windings: (svg.querySelector('.mw-coil path, .mw-plate') ? 1 : 0), shadow: !!svg.querySelector('.mw-needle [filter]') };
    }));
    mat.forEach((m, k) => { if (m.grads < 8 || m.refs < 8) errors.push('Messwerk ' + k + ': zu wenig Materialien (' + m.grads + ' Verläufe, ' + m.refs + ' Referenzen)'); if (m.missing.length || m.dup.length) errors.push('Messwerk ' + k + ': Referenzen fehlen/doppelt: ' + m.missing.concat(m.dup).join(',')); if (!m.windings || !m.shadow) errors.push('Messwerk ' + k + ': Wicklung oder Zeigerschatten fehlt'); });
    await tp.evaluate(() => document.querySelector('.visual-meterwork .mw-faces').scrollIntoView()); await tp.waitForTimeout(300);
    await tp.screenshot({ path: shots + '/24_messwerk.png' });
    await tp.close();
  }

  // Musterbeispiele (worked) in T16C: Schritte erscheinen nacheinander, Eingabe wird gegen den Sollwert geprueft
  {
    const tp = await browser.newPage({ viewport: { width: 1440, height: 900 } }); tp.on('pageerror', e => errors.push('Worked: ' + e.message));
    await tp.goto(url, { waitUntil: 'domcontentloaded' }); await tp.evaluate(() => DigitalQuest.openItem('T16C')); await tp.waitForSelector('.visual-worked');
    if (await tp.$$eval('.visual-worked .wk-step', l => l.length) !== 1) errors.push('Worked: Beispiel 1 sollte mit einem Schritt beginnen');
    await tp.click('.visual-worked [data-wk="next"]'); await tp.click('.visual-worked [data-wk="next"]');
    if (!/Weiter zu Beispiel 2/.test(await tp.textContent('.visual-worked .wk-done'))) errors.push('Worked: Beispiel 1 nicht abgeschlossen');
    await tp.click('.visual-worked [data-wk-tab="1"]'); await tp.click('.visual-worked [data-wk="next"]'); await tp.click('.visual-worked [data-wk="next"]');
    if (!await tp.$('.visual-worked .wk-step.input input')) errors.push('Worked: Beispiel 2 zeigt kein Eingabefeld');
    if (!await tp.$eval('.visual-worked [data-wk="next"]', b => b.disabled)) errors.push('Worked: Weiter-Knopf müsste bis zur richtigen Eingabe gesperrt sein');
    await tp.fill('.visual-worked .wk-step.input input', '0,5'); await tp.click('.visual-worked [data-wk="check"]');
    if (!/stimmt noch nicht/.test(await tp.textContent('.visual-worked .wk-fb'))) errors.push('Worked: falsche Eingabe nicht erkannt');
    await tp.fill('.visual-worked .wk-step.input input', '0,12'); await tp.click('.visual-worked [data-wk="check"]');
    if (!/Richtig/.test(await tp.textContent('.visual-worked .wk-fb')) || !/0,96 %/.test(await tp.textContent('.visual-worked .wk-done'))) errors.push('Worked: richtige Eingabe nicht angenommen');
    await tp.screenshot({ path: shots + '/25_worked.png' });
    await tp.close();
  }

  // Werkbank-Tutorial: ueber die Kopfzeile, Uebungsaufbau mit echter Werkbank bedienen (Spitzen ziehen, Messart, Bereich/OL, Tastkopf, RUN), zurueck zur Karte
  {
    const tp = await browser.newPage({ viewport: { width: 1440, height: 900 } }); tp.on('pageerror', e => errors.push('Tutorial: ' + e.message));
    await tp.goto(url.replace('?alle', ''), { waitUntil: 'domcontentloaded' });
    await tp.click('[data-go="tutorial"]'); await tp.waitForSelector('#tbench [data-probe="a"]');
    if (!await tp.isVisible('#scr-tutorial.active') || await tp.$$eval('.tut-steps li', l => l.length) !== 7) errors.push('Tutorial: Screen oder Schrittliste fehlt');
    const box = sel => tp.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    const drag = async (w, pin) => { const a = await box(`#tbench [data-probe="${w}"] .bprobehit`), q = await box(`#tbench [data-pin="${pin}"] .bpinhit`); await tp.mouse.move(a[0], a[1]); await tp.mouse.down(); await tp.mouse.move(q[0], q[1], { steps: 6 }); await tp.mouse.up(); };
    const tap = async sel => { const q = await box(sel); if (!q) throw new Error('Tutorial: fehlt ' + sel); await tp.mouse.click(q[0], q[1]); await tp.waitForTimeout(80); };
    await drag('a', 'R1.a'); await drag('b', 'R1.b'); await tap('#tbench [data-dial="V"] .bdialhit');
    await tap('#tbench [data-range="2"] rect'); if (!/OL/.test(await tp.textContent('#tutLcd'))) errors.push('Tutorial: 2-V-Bereich zeigt kein OL');
    await tap('#tbench [data-range="20"] rect'); if (!/^9\.\d+ V$/.test((await tp.textContent('#tutLcd')).trim())) errors.push('Tutorial: 20-V-Bereich liest nicht 9 V: ' + await tp.textContent('#tutLcd'));
    await drag('tip', 'R2.a'); await drag('gnd', 'R2.b'); await tap('#tbench [data-scope="run"] rect'); await tp.waitForTimeout(250);
    if (!await tp.$('#tbench .bsctrace') || !/R2\.a/.test(await tp.textContent('#tutScope'))) errors.push('Tutorial: Oszilloskop zeigt keine Kurve');
    const done = await tp.$$eval('.tut-steps li.done', l => l.map(x => x.dataset.step));
    if (done.length !== 7) errors.push('Tutorial: nicht alle Schritte abgehakt: ' + done.join(','));
    await tp.screenshot({ path: shots + '/22_tutorial.png' });
    // Verlaeufe/Filter der Tutorial-Werkbank: jede url(#…)-Referenz zeigt auf eine Definition im SELBEN SVG, und die IDs kommen im Dokument nur einmal vor
    const refs = await tp.evaluate(() => {
      const svg = document.querySelector('#tbench'), ids = new Set(), missing = [], dup = [];
      svg.querySelectorAll('*').forEach(el => { for (const a of ['fill', 'filter', 'stroke', 'style']) { const v = el.getAttribute(a); if (!v) continue; const m = /url\(#([\w-]+)\)/.exec(v); if (m) ids.add(m[1]); } });
      ids.forEach(id => { if (!svg.querySelector('#' + id)) missing.push(id); if (document.querySelectorAll('#' + id).length !== 1) dup.push(id); });
      return { n: ids.size, missing, dup, sample: [...ids].slice(0, 3) };
    });
    if (refs.n < 8) errors.push('Tutorial: kaum Verlaufs-Referenzen gefunden (' + refs.n + ')');
    if (refs.missing.length) errors.push('Tutorial: hängende Verlaufs-Referenzen: ' + refs.missing.join(','));
    if (refs.dup.length) errors.push('Tutorial: Verlaufs-IDs mehrfach im Dokument: ' + refs.dup.join(','));
    await tp.click('#tutMap'); if (!await tp.isVisible('#scr-map.active')) errors.push('Tutorial: Zurück zur Karte wirkt nicht');
    // Hinweis-Link in der ersten drag-Aufgabe
    await tp.evaluate(() => DigitalQuest.openItem('16.1')); if (!await tp.$('#taskInfo .tut-link [data-go="tutorial"]')) errors.push('16.1: Link zum Tutorial fehlt');
    await tp.click('#taskInfo .tut-link a'); if (!await tp.isVisible('#scr-tutorial.active')) errors.push('16.1: Link öffnet das Tutorial nicht');
    await tp.close();
  }

  // Taschenrechner: Kopfzeile, Tastatur-Eingabe, Ergebnis, Fehleranzeige, Verlauf, schliessen; Kontext-Knopf im Messprotokoll
  {
    await page.evaluate(() => { DigitalQuest.openItem('T1A'); });
    await page.click('#btnCalc'); if (!await page.isVisible('#calc .calc-box')) errors.push('Rechner: öffnet nicht über die Kopfzeile');
    await page.keyboard.type('15*0.5%+0.1'); await page.keyboard.press('Enter');
    if ((await page.textContent('#calcOut')).trim() !== '= 0.175') errors.push('Rechner: 15*0.5%+0.1 → ' + await page.textContent('#calcOut'));
    await page.click('#calc [data-k="C"]'); await page.click('#calc [data-k="√"]'); await page.keyboard.type('3²+3.54²)'); await page.click('#calc [data-k="="]');
    if (!/^= 4\.64/.test((await page.textContent('#calcOut')).trim())) errors.push('Rechner: Wurzel per Tasten → ' + await page.textContent('#calcOut'));
    await page.fill('#calcIn', '5/0'); await page.keyboard.press('Enter'); if (!/Division durch 0/.test(await page.textContent('#calcOut'))) errors.push('Rechner: Division durch 0 ohne Meldung');
    await page.fill('#calcIn', '(2+3'); await page.keyboard.press('Enter'); if (!/Klammer/.test(await page.textContent('#calcOut'))) errors.push('Rechner: fehlende Klammer ohne Meldung');
    if (await page.$$eval('#calc .calc-hist li', l => l.length) !== 2) errors.push('Rechner: Verlauf zeigt nicht die zwei gültigen Rechnungen');
    await page.keyboard.press('Escape'); if (await page.isVisible('#calc .calc-box')) errors.push('Rechner: Esc schliesst nicht');
    if (!await page.isVisible('#scr-theory.active')) errors.push('Rechner: Bildschirm dahinter wurde gewechselt');
    await page.evaluate(() => DigitalQuest.openItem('16.1')); await page.click('#taskInfo [data-calc]'); if (!await page.isVisible('#calc .calc-box')) errors.push('Rechner: Knopf im Messprotokoll öffnet nicht');
    await page.screenshot({ path: shots + '/23_rechner.png' });
    await page.click('#calc .calc-back'); if (await page.isVisible('#calc .calc-box')) errors.push('Rechner: Klick daneben schliesst nicht');
    // Lesbarkeit in BEIDEN Themes: Tasten, Eingabefeld und Funktionsknoepfe muessen sich vom (festen dunklen) Bedienfeld abheben
    const contrast = async () => page.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
      const bad = [];
      for (const sel of ['#calc .calc-keys button[data-k="7"]', '#calc .calc-keys button.op', '#calc .calc-keys button.fn', '#calc .calc-keys button.eq', '#calc .calc-in', '#calc .calc-fn button', '#calc .calc-head b', '#calc .calc-head .small', '#calc .calc-x']) {
        const el = document.querySelector(sel); if (!el) { bad.push(sel + ' fehlt'); continue; }
        let bg = getComputedStyle(el).backgroundColor, p = el; while (p && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { p = p.parentElement; bg = getComputedStyle(p).backgroundColor; }
        const r = ratio(getComputedStyle(el).color, bg); if (r < 3) bad.push(sel + ' Kontrast ' + r.toFixed(1));
      }
      return bad;
    });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => { DigitalQuest.state.settings.theme = t; document.documentElement.dataset.theme = t; }, theme);
      await page.click('#btnCalc'); await page.waitForTimeout(50);
      const bad = await contrast(); if (bad.length) errors.push('Rechner (' + theme + '): schlecht lesbar – ' + bad.join(', '));
      await page.screenshot({ path: shots + '/23_rechner_' + theme + '.png' });
      await page.keyboard.press('Escape');
    }
  }

  // Phase 1 (Feedback 01.10.2026): Logo-Link, Zurueck-Navigation per Adresse, Zurueck-Knopf, Toleranz-Hinweis, Oszilloskop gross, Fusszeile
  {
    const np = await browser.newPage({ viewport: { width: 1440, height: 900 } }); np.on('pageerror', e => errors.push('Phase1: ' + e.message));
    await np.goto(url, { waitUntil: 'domcontentloaded' });
    if (await np.$eval('#brand', a => a.tagName) !== 'A') errors.push('Logo ist kein Link');
    await np.evaluate(() => DigitalQuest.openItem('1.1')); await np.waitForTimeout(100);
    if (await np.evaluate(() => location.hash) !== '#/aufgabe/1.1') errors.push('Adresse nach Aufgabe: ' + await np.evaluate(() => location.hash));
    if (!await np.$('#taskInfo [data-back]')) errors.push('Zurück-Knopf in der Aufgabe fehlt');
    await np.goBack(); await np.waitForTimeout(150);
    if (!await np.isVisible('#scr-map.active')) errors.push('Browser-Zurück führt nicht zur Karte');
    await np.evaluate(() => DigitalQuest.openItem('T1A')); await np.waitForTimeout(100);
    if (await np.evaluate(() => location.hash) !== '#/theorie/T1A' || !await np.$('#scr-theory [data-back]')) errors.push('Theorie: Adresse oder Zurück-Knopf fehlt');
    await np.click('#scr-theory [data-back]'); if (!await np.isVisible('#scr-map.active')) errors.push('Zurück-Knopf der Theorie wirkt nicht');
    await np.evaluate(() => DigitalQuest.openItem('16.4')); await np.click('#brand'); if (!await np.isVisible('#scr-map.active')) errors.push('Logo-Klick führt nicht zur Karte');
    await np.goto(url + '#/aufgabe/1.8', { waitUntil: 'domcontentloaded' }); await np.waitForTimeout(200);
    if (!await np.isVisible('#scr-task.active') || !/1\.8/.test(await np.textContent('#taskInfo .crumb'))) errors.push('Start-Adresse #/aufgabe/1.8 öffnet die Aufgabe nicht');
    if (await np.$$eval('#taskInfo .protocol .tol', l => l.length) < 1 || !/Toleranz ±\d+ %/.test(await np.textContent('#taskInfo .protocol'))) errors.push('Toleranz-Hinweis im Protokoll fehlt');
    if (!/Stellenzahl/.test(await np.textContent('#taskInfo .proto-note'))) errors.push('Rundungshinweis im Protokollkopf fehlt');
    if (await np.$$eval('.lab-foot a', l => l.map(a => a.textContent).join()) !== 'Impressum,Datenschutz') errors.push('Fusszeile im Labor fehlt');
    // Rechner: Zurueck schliesst zuerst den Rechner, der Bildschirm bleibt
    await np.click('#btnCalc'); await np.waitForTimeout(50); await np.goBack(); await np.waitForTimeout(150);
    if (await np.isVisible('#calc .calc-box') || !await np.isVisible('#scr-task.active')) errors.push('Zurück bei offenem Rechner: Rechner sollte zugehen, Aufgabe bleiben');
    // Oszilloskop gross: ohne Aufnahme Hinweis, mit Aufnahme Kurve + Kennwerte
    await np.click('#btnScopeBig'); if (!await np.isVisible('#scopeBig .sb-box') || !/Noch keine Aufnahme/.test(await np.textContent('#scopeBig'))) errors.push('Oszilloskop gross ohne Aufnahme: Hinweis fehlt');
    await np.keyboard.press('Escape'); if (await np.isVisible('#scopeBig .sb-box')) errors.push('Oszilloskop gross: Esc schliesst nicht');
    await np.evaluate(() => DigitalQuest.openItem('W1')); await np.evaluate(() => DigitalQuest.setView('schema')); await np.waitForTimeout(100);
    await np.click('[data-mm="V"]'); await np.evaluate(() => { const c = DigitalQuest.core; c.clickPin('R2.a'); c.clickPin('R2.b'); }); await np.click('#btnScope'); await np.waitForTimeout(200);
    await np.click('#btnScopeBig'); await np.waitForTimeout(100);
    if (!await np.$('#sbCanvas') || !/Uss/.test(await np.textContent('#scopeBig')) || !/Quelle f/.test(await np.textContent('#scopeBig'))) errors.push('Oszilloskop gross: Kurve oder Kennwerte fehlen');
    await np.screenshot({ path: shots + '/26_scope_gross.png' });
    await np.click('#scopeBig .sb-back', { position: { x: 5, y: 5 } }); if (await np.isVisible('#scopeBig .sb-box')) errors.push('Oszilloskop gross: Klick daneben schliesst nicht');
    await np.close();
  }

  // Phase 4: konkrete Mess-Hilfen, Einstellungs-Box, Schalterstellung, Bildbreite je Aufgabe, Ziehen auch im Altbestand
  {
    const tp = await browser.newPage({ viewport: { width: 1440, height: 900 } }); tp.on('pageerror', e => errors.push('Phase4: ' + e.message));
    await tp.goto(url, { waitUntil: 'domcontentloaded' });
    const warn = () => tp.textContent('#mmWarn');
    // 16.2: Einstellungs-Box mit Messart, Spitzen, Bereich; Schalterstellung im Label
    await tp.evaluate(() => { delete DigitalQuest.state.drafts['16.2']; DigitalQuest.openItem('16.2'); DigitalQuest.setView('schema'); });
    const setup = await tp.textContent('#taskInfo .setup');
    if (!/V⎓/.test(setup) || !/A⎓/.test(setup) || !/Bereich 20 ?V/.test(setup) || !/S1 zu, S2 offen/.test(setup) || !/Rechenwert/.test(setup)) errors.push('Phase4: Einstellungs-Box 16.2 unvollständig: ' + setup.slice(0, 200));
    if (!/S1\s*·?\s*offen/.test(await tp.textContent('#board [data-part="S1"]'))) errors.push('Phase4: Schalterstellung fehlt im Label');
    await tp.evaluate(() => { DigitalQuest.core.part('S1').props.closed = true; DigitalQuest.core.changed('toggle'); }); await tp.waitForTimeout(100);
    if (!/S1\s*·?\s*zu/.test(await tp.textContent('#board [data-part="S1"]'))) errors.push('Phase4: Schalterstellung „zu“ fehlt im Label');
    // Meldungen: nur eine Spitze, Spitzen vertauscht, Ω unter Spannung, V~ an Gleichspannung, OL mit Vorschlag, Bereich zu gross
    await tp.click('[data-mm="V"]'); await tp.evaluate(() => DigitalQuest.core.clickPin('R1.a'));
    if (!/schwarze \(COM\) Spitze/.test(await warn())) errors.push('Phase4: Hinweis „zweite Spitze“ fehlt: ' + await warn());
    await tp.evaluate(() => { DigitalQuest.core.clickPin('R1.b'); });
    await tp.evaluate(() => { const c = DigitalQuest.core; c.probes = { a: 'R1.b', b: 'R1.a' }; c.redraw(); }); await tp.evaluate(() => DigitalQuest.setProbe && 0);
    await tp.click('[data-mm="OFF"]'); await tp.click('[data-mm="V"]'); await tp.evaluate(() => DigitalQuest.core.clickPin('R1.b')); await tp.evaluate(() => DigitalQuest.core.clickPin('R1.a'));
    if (!/vertauscht/.test(await warn())) errors.push('Phase4: Hinweis „Spitzen vertauscht“ fehlt: ' + await warn() + ' / ' + await tp.textContent('#lcd'));
    await tp.click('[data-mm="VAC"]'); if (!/Wähle V⎓/.test(await warn())) errors.push('Phase4: Hinweis „V~ an Gleichspannung“ fehlt: ' + await warn());
    await tp.click('[data-mm="R"]'); if (!/spannungsfrei/.test(await warn()) || !/Leitung löschen|Schalter öffnen/.test(await warn())) errors.push('Phase4: Ω-Hinweis nicht konkret: ' + await warn());
    await tp.click('[data-mm="V"]'); await tp.click('#mmRange [data-rg="2"]'); if (!/Bereich zu klein/.test(await warn()) || !/nimm 20 ?V/.test(await warn())) errors.push('Phase4: OL-Hinweis ohne Vorschlag: ' + await warn());
    await tp.click('#mmRange [data-rg="600"]'); if (!/Bereich zu gross/.test(await warn()) || !/nimm 20 ?V/.test(await warn())) errors.push('Phase4: Hinweis „Bereich zu gross“ fehlt: ' + await warn());
    // Sicherung: A⎓ parallel zur Quelle
    await tp.click('[data-mm="A"]'); await tp.click('#mmRange [data-rg="AUTO"]'); await tp.evaluate(() => { DigitalQuest.core.clickPin('B1.p'); DigitalQuest.core.clickPin('B1.n'); }); await tp.waitForTimeout(100);
    if (!/in Reihe/.test(await warn()) || !/Leitung löschen/.test(await warn())) errors.push('Phase4: FUSE-Hinweis nicht konkret: ' + await warn());
    // V⎓ an reiner Wechselspannung (W1)
    await tp.evaluate(() => DigitalQuest.openItem('W1')); await tp.click('[data-mm="V"]'); await tp.evaluate(() => { DigitalQuest.core.clickPin('R2.a'); DigitalQuest.core.clickPin('R2.b'); }); await tp.waitForTimeout(100);
    if (!/Wechselspannung/.test(await warn()) || !/V~/.test(await warn())) errors.push('Phase4: Hinweis „V⎓ an Wechselspannung“ fehlt: ' + await warn());
    // Bildbreite je Aufgabe: W1 (50 Hz) → 50 ms, 11.2 (Ladekurve) → längster Ausschnitt
    if (await tp.$eval('#tb', s => s.value) !== '0.05') errors.push('Phase4: Bildbreite für 50 Hz nicht 50 ms: ' + await tp.$eval('#tb', s => s.value));
    await tp.evaluate(() => DigitalQuest.openItem('11.2')); if (await tp.$eval('#tb', s => +s.value) < 1) errors.push('Phase4: Bildbreite für die Ladekurve zu kurz');
    // Oszilloskop ohne Tastkopf: konkreter Hinweis; Altbestand (1.5) auf der Werkbank: Spitzen ziehbar, keine Bereichstasten
    await tp.evaluate(() => DigitalQuest.openItem('1.5')); await tp.evaluate(() => DigitalQuest.setView('bench')); await tp.waitForTimeout(150);
    if (!await tp.$('#bench [data-probe="a"]') || await tp.$('#bench [data-range]') || !await tp.$eval('#mmRange', e => e.hidden)) errors.push('Phase4: Altbestand – Spitzen nicht ziehbar oder Bereichstasten sichtbar');
    await tp.click('#btnScope'); if (!/Erdungsclip an Masse/.test(await tp.textContent('#scopeInfo'))) errors.push('Phase4: Tastkopf-Hinweis nicht konkret: ' + await tp.textContent('#scopeInfo'));
    await tp.screenshot({ path: shots + '/29_einstellungsbox.png' });
    await tp.close();
  }

  // Phase 6: Vorführ-Modus – läuft vollständig durch, Entwurf bleibt unverändert, Pause hält die Spitze an, Abbrechen stellt alles wieder her, zählt wie ein Tipp
  {
    const tp = await browser.newPage({ viewport: { width: 1440, height: 900 } }); tp.on('pageerror', e => errors.push('Phase6: ' + e.message));
    await tp.goto(url, { waitUntil: 'domcontentloaded' });
    await tp.evaluate(() => { delete DigitalQuest.state.drafts['1.4']; DigitalQuest.openItem('1.4'); DigitalQuest.setView('bench'); }); await tp.waitForTimeout(150);
    if (!await tp.$('#btnDemo')) errors.push('Phase6: Knopf „Vorführen“ fehlt');
    await tp.fill('[data-ans="uq"]', '9'); await tp.waitForTimeout(50);
    const draft0 = await tp.evaluate(() => JSON.stringify(DigitalQuest.state.drafts['1.4']));
    await tp.click('#btnDemo'); await tp.waitForTimeout(100);
    if (!await tp.evaluate(() => !!DigitalQuest.demo)) errors.push('Phase6: Vorführung startet nicht');
    // Pause: Spitze bleibt stehen
    await tp.selectOption('#demoBar [data-pb="speed"]', '0.25'); await tp.waitForTimeout(400);
    await tp.click('#demoBar [data-pb="play"]'); await tp.waitForTimeout(100);
    const px = await tp.evaluate(() => JSON.stringify([DigitalQuest.demo.i, DigitalQuest.demo.p, DigitalQuest.core.dragProbe && DigitalQuest.core.dragProbe.x]));
    await tp.waitForTimeout(400);
    if (px !== await tp.evaluate(() => JSON.stringify([DigitalQuest.demo.i, DigitalQuest.demo.p, DigitalQuest.core.dragProbe && DigitalQuest.core.dragProbe.x]))) errors.push('Phase6: Pause hält die Vorführung nicht an');
    await tp.click('#demoBar [data-pb="step"]'); if (await tp.evaluate(() => DigitalQuest.demo.i) < 1) errors.push('Phase6: Einzelschritt geht nicht weiter');
    // Abbrechen: alles zurueck
    await tp.click('#demoStop'); await tp.waitForTimeout(100);
    if (await tp.evaluate(() => !!DigitalQuest.demo) || await tp.evaluate(() => DigitalQuest.core.probes.a) || await tp.$eval('#lcd', e => e.textContent.trim()) !== 'OFF') errors.push('Phase6: Abbrechen stellt Spitzen/Messgerät nicht zurück');
    if (draft0 !== await tp.evaluate(() => JSON.stringify(DigitalQuest.state.drafts['1.4']))) errors.push('Phase6: Entwurf nach Abbruch verändert');
    // vollstaendiger Durchlauf mit Tempo 1×
    await tp.click('#btnDemo'); await tp.selectOption('#demoBar [data-pb="speed"]', '1');
    let sawValue = false, sawRw = false;
    for (let k = 0; k < 120; k++) { await tp.waitForTimeout(250); const st = await tp.evaluate(() => ({ on: !!DigitalQuest.demo, lcd: document.getElementById('lcd').textContent, txt: (document.getElementById('demoText') || {}).textContent || '', rw: (document.getElementById('demoRw') || {}).textContent || '' })); if (/\d/.test(st.lcd) && st.lcd !== 'OFF') sawValue = true; if (/Rechenweg|Sollwert/.test(st.txt) && st.rw.length > 3) sawRw = true; if (!st.on) break; }
    if (await tp.evaluate(() => !!DigitalQuest.demo)) errors.push('Phase6: Vorführung endet nicht');
    if (!sawValue || !sawRw) errors.push('Phase6: Anzeige (' + sawValue + ') oder Rechenweg (' + sawRw + ') nicht gezeigt');
    if (draft0 !== await tp.evaluate(() => JSON.stringify(DigitalQuest.state.drafts['1.4']))) errors.push('Phase6: Entwurf nach der Vorführung verändert');
    if (!/zählt wie ein Tipp/.test(await tp.textContent('#demoBox'))) errors.push('Phase6: Hinweis „zählt wie ein Tipp“ fehlt');
    const evs = await tp.evaluate(() => DigitalQuest.state.events.filter(e => /^demo_/.test(e.type)).map(e => e.type).join(','));
    if (!/demo_view/.test(evs) || !/demo_done/.test(evs)) errors.push('Phase6: Ereignisse fehlen: ' + evs);
    await tp.screenshot({ path: shots + '/30_vorfuehren.png' });
    await tp.close();
  }

  // Phase 3: Teilwertung pro Messwert, Sollwert aufdecken nach 2 Fehlversuchen, Lösungsansicht nach 2 gescheiterten Prüfungen, 1 Stern
  {
    const tp = await browser.newPage({ viewport: { width: 1440, height: 900 } }); tp.on('pageerror', e => errors.push('Phase3: ' + e.message));
    await tp.goto(url, { waitUntil: 'domcontentloaded' }); await tp.evaluate(() => DigitalQuest.openItem('1.4')); await tp.waitForTimeout(100);
    const soll = await tp.evaluate(() => { const t = DigitalQuest.state && DigitalQuest.engine ? null : null; const E = DigitalQuest.engine, tk = Object.values(DigitalQuest).find(x => x && x.byId) ; return null; });
    const ex = await tp.evaluate(() => { const E = DigitalQuest.engine, t = window.DQ.byId['1.4']; return E.expectedAnswers(t, t.ref); });
    const ids = Object.keys(ex); if (ids.length < 2) errors.push('Phase3: 1.4 hat zu wenige Messwerte');
    if (await tp.$$eval('#taskInfo .protocol .mst', l => l.length) !== ids.length) errors.push('Phase3: Statuszeichen je Messwert fehlen');
    // erster Wert richtig, zweiter zweimal falsch → ✓ bleibt stehen, ✗ zählt, nach 2 Fehlern „Sollwert aufdecken“
    await tp.fill('[data-ans="' + ids[0] + '"]', String(ex[ids[0]])); await tp.fill('[data-ans="' + ids[1] + '"]', '99.9');
    await tp.click('#btnCheck'); await tp.waitForTimeout(100);
    if (!/1 von/.test(await tp.textContent('#protoCount'))) errors.push('Phase3: Zähler nach erster Prüfung: ' + await tp.textContent('#protoCount'));
    if (!await tp.$('#taskInfo label.m-ok') || !await tp.$('#taskInfo label.m-bad')) errors.push('Phase3: Status ✓/✗ nicht gesetzt');
    if (await tp.$('[data-reveal]')) errors.push('Phase3: Aufdecken schon nach einem Fehlversuch');
    if (await tp.$('#btnSol')) errors.push('Phase3: Lösung schon nach einer gescheiterten Prüfung');
    await tp.fill('[data-ans="' + ids[1] + '"]', '88.8'); await tp.click('#btnCheck'); await tp.waitForTimeout(100);
    if (!await tp.$('[data-reveal="' + ids[1] + '"]')) errors.push('Phase3: „Sollwert aufdecken“ fehlt nach zwei Fehlversuchen');
    if (!await tp.$('#btnSol')) errors.push('Phase3: „Lösung ansehen“ fehlt nach zwei gescheiterten Prüfungen');
    await tp.click('#btnSol'); await tp.waitForTimeout(300);
    if (!await tp.isVisible('#solView') || !await tp.$('#solCircuit .mini-stage svg') || !/Sollwerte/.test(await tp.textContent('#solView')) || !/Rechenweg/.test(await tp.textContent('#solView'))) errors.push('Phase3: Lösungsansicht unvollständig');
    if (!await tp.isVisible('#scr-task.active') || await tp.evaluate(() => !!DigitalQuest.state.done['1.4'])) errors.push('Phase3: Lösung ansehen hat die Station freigeschaltet');
    await tp.screenshot({ path: shots + '/27_loesung.png' });
    await tp.click('[data-reveal="' + ids[1] + '"]'); await tp.waitForTimeout(100);
    if (!/Aufgedeckt/.test(await tp.textContent('[data-rv="' + ids[1] + '"]')) || !await tp.$eval('[data-ans="' + ids[1] + '"]', i => i.disabled)) errors.push('Phase3: Aufdecken zeigt Sollwert nicht oder sperrt das Feld nicht');
    for (const id of ids.slice(2)) await tp.fill('[data-ans="' + id + '"]', String(ex[id]));
    await tp.click('#btnCheck'); await tp.waitForTimeout(200);
    if (!await tp.evaluate(() => !!DigitalQuest.state.done['1.4'])) errors.push('Phase3: Station mit aufgedecktem Wert nicht abgeschlossen');
    const di = await tp.evaluate(() => DigitalQuest.state.doneInfo['1.4']);
    if (!di || di.stars !== 1 || !di.solution || di.revealed !== 1) errors.push('Phase3: doneInfo falsch: ' + JSON.stringify(di));
    if (await tp.$$eval('#modal .stars-win .star.on', l => l.length) !== 1) errors.push('Phase3: Erfolgsmeldung zeigt nicht genau 1 Stern');
    const ev = await tp.evaluate(() => DigitalQuest.state.events.filter(e => e.type === 'solution_view' || e.type === 'value_reveal').map(e => e.type));
    if (ev.indexOf('solution_view') < 0 || ev.indexOf('value_reveal') < 0) errors.push('Phase3: Ereignisse solution_view/value_reveal fehlen');
    await tp.screenshot({ path: shots + '/28_teilwertung.png' });
    await tp.close();
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

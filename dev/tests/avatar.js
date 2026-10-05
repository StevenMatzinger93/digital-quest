// Avatare und Coins (Paket A): Oberfläche im Browser (Playwright/Chromium) gegen den echten Worker-Code mit D1-Nachbau: node tests/avatar.js
// Garderobe (#/avatar): Tier, Farbe, Kauf, Sperren mit Hinweis, Speichern; Konto-Chip; Menüpunkt für alle Rollen; Handy 390 px;
// Klassenliste mit Avatar/Platzhalter; Live-Challenge: Lobby, Rangliste und Podest mit Tier.
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const { attachSite, SITE } = require('./apiroute.js');
const shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
let pass = 0, failN = 0;
const ok = (c, m, info) => { if (c) pass++; else { failN++; console.log('FEHLER', m, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } };
(async () => {
  const browser = await chromium.launch(), errors = [];
  const watch = (pg, tag) => { pg.on('pageerror', e => errors.push(tag + ': ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(tag + ' console: ' + m.text()); }); };
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const { env, addUser, addClass } = await attachSite(ctx);
  const tid = await addUser('frau.ohm', 'lehrer-pw-1', 'teacher');
  const cid = addClass('EL 2b', tid, 'AVAT22');
  const sid = await addUser('OhmFuchs7', 'schueler1', 'student', cid), sid2 = await addUser('Luchs', 'schueler1', 'student', cid);
  const login = async (pg, u, pw) => { await pg.goto(SITE + '/'); await pg.waitForSelector('#loginBtn:visible'); await pg.click('#loginBtn'); await pg.fill('#lgUser', u); await pg.fill('#lgPw', pw); await pg.click('#loginForm .term-go'); await pg.waitForSelector('#userBtn:visible'); };
  const p = await ctx.newPage(); watch(p, 'Garderobe');
  // Spielstand mit Coins: 5 Aufgaben (3★), Boss 10.10, zwei Theorien → 5·60 + 60 + 120 + 2·30 = 540
  await login(p, 'OhmFuchs7', 'schueler1');
  const state = { done: { '1.1': true, '1.2': true, '1.3': true, '1.4': true, '1.5': true, '10.10': true, T1A: true, T1B: true }, doneInfo: { '1.1': { stars: 3 }, '1.2': { stars: 3 }, '1.3': { stars: 3 }, '1.4': { stars: 3 }, '1.5': { stars: 3 }, '10.10': { stars: 3 } }, theory: { T1A: { best: 1 }, T1B: { best: 1 } }, drafts: {} };
  const put = await p.evaluate(async st => { const r = await fetch('/api/progress/dq', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ state: st, summary: { tasks: 6 }, base: 0, force: true }) }); return r.status; }, state);
  ok(put === 200, 'Spielstand gespeichert', put);
  // Menüpunkt und Seite
  ok(await p.$eval('#topnav', n => n.textContent.includes('Avatar & Coins')), 'Menüpunkt „Avatar & Coins“ für Lernende');
  await p.goto(SITE + '/#/avatar'); await p.waitForSelector('.av-page');
  ok(await p.locator('.av-pick').count() === 8, '8 Tiere zur Auswahl');
  ok(await p.$eval('#avBal', e => e.textContent) === '540', 'Stand 540 Coins aus dem Spielstand', await p.$eval('#avBal', e => e.textContent));
  ok(await p.locator('.av-coll').count() === 5 && /5\/40/.test(await p.$eval('.av-colls', e => e.textContent)), 'Kollektionen mit Fortschritt (5/40 Elektrotechnik)');
  ok(await p.locator('.av-item[data-item="aura_blitz"]').count() === 0, 'Sudden-Death-Teile ausgeblendet');
  await p.click('.av-pick[data-animal="eule"]'); await p.click('.av-col[data-color="#6b3fa0"]');
  ok(await p.locator('.av-pick.on[data-animal="eule"]').count() === 1, 'Tier gewählt');
  // gesperrt mit Hinweis (Bauhelm: Boss-Lösung muss gespeichert sein → Server lehnt ab), Hoodie 5/7
  const hoodie = await p.getAttribute('.av-item[data-item="scl_hoodie"]', 'title');
  ok(await p.locator('.av-item.locked[data-item="scl_hoodie"]').count() === 1 && /5\/7/.test(hoodie) && /Elektrotechnik/.test(hoodie), 'Hoodie gesperrt mit Fortschritt 5/7: ' + hoodie);
  ok(/Final Boss 15.10/.test(await p.getAttribute('.av-item[data-item="kette_gold"]', 'title')) && await p.locator('.av-item.locked[data-item="bauhelm"]').count() === 0, 'Goldkette: Bedingungstext Final Boss; Bauhelm nach Boss 10.10 offen (Server prüft die Lösung beim Kauf)');
  await p.click('.av-item[data-item="scl_hoodie"]'); await p.waitForSelector('.toast:not([hidden])');
  ok(/gesperrt/.test(await p.$eval('.toast', t => t.textContent)), 'Klick auf gesperrtes Teil: Hinweis statt Kauf');
  await p.click('.av-item[data-item="bauhelm"]'); await p.click('#dlgActions button:has-text("Kaufen")'); await p.waitForTimeout(300);
  ok(/Boss-Lösungen|Tests/.test(await p.$eval('.toast', t => t.textContent)) && await p.$eval('#avBal', e => e.textContent) === '540', 'Bauhelm: Server verlangt die gespeicherte Boss-Lösung, kein Abzug');
  // Kauf: T-Shirt rot (40) → 500, anziehen, speichern
  await p.click('.av-item[data-item="tshirt_rot"]'); await p.click('#dlgActions button:has-text("Kaufen")');
  await p.waitForSelector('.av-item.on[data-item="tshirt_rot"]');
  ok(await p.$eval('#avBal', e => e.textContent) === '500', 'nach dem Kauf: 500 Coins');
  await p.click('.av-item[data-item="kappe_rot"]'); await p.click('#dlgActions button:has-text("Kaufen")'); await p.waitForSelector('.av-item.on[data-item="kappe_rot"]');
  await p.click('#avSave'); await p.waitForSelector('#avMsg:has-text("Gespeichert")');
  const av = env.DB.raw.prepare('SELECT animal, color, equip FROM avatars WHERE user_id = ?').get(sid);
  ok(av && av.animal === 'eule' && av.color === '#6b3fa0' && JSON.parse(av.equip).oberteil === 'tshirt_rot' && JSON.parse(av.equip).kopf === 'kappe_rot', 'Garderobe speichert Tier, Farbe, T-Shirt und Kappe', av);
  ok(await p.locator('#userName .av svg').count() === 1, 'Avatar im Konto-Chip nach dem Speichern');
  await p.screenshot({ path: shots + '/avatar_garderobe.png' });
  // Filter
  await p.selectOption('#avfSet', 'messen'); await p.waitForTimeout(50);
  ok(await p.locator('.av-item').count() > 0 && await p.locator('.av-item[data-item="tshirt_rot"]').count() === 0, 'Filter Kollektion Messtechnik');
  await p.selectOption('#avfSet', 'alle'); await p.selectOption('#avfRar', 'mythisch'); await p.waitForTimeout(50);
  ok(await p.evaluate(() => [...document.querySelectorAll('.av-item:not(.r-mythisch)')].every(b => window.SPSQAvatar.item(b.dataset.item).shop === 'monat')) && await p.locator('.av-item.r-mythisch').count() > 3, 'Filter Seltenheit mythisch (nur das Schaufenster bleibt daneben)');
  await p.selectOption('#avfRar', 'alle');
  // Handy 390 px: eine Spalte, keine horizontale Verschiebung, Trefferflächen ≥ 36 px
  await p.setViewportSize({ width: 390, height: 844 }); await p.goto(SITE + '/#/avatar'); await p.waitForSelector('.av-page'); await p.waitForTimeout(100);
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, cols: getComputedStyle(document.querySelector('.av-grid')).gridTemplateColumns.split(' ').length,
    pick: document.querySelector('.av-pick').getBoundingClientRect().height, col: document.querySelector('.av-col').getBoundingClientRect().width, pose: document.querySelector('[data-pose]').getBoundingClientRect().height }));
  ok(m.sw <= m.cw + 1 && m.cols === 1 && m.pick >= 36 && m.col >= 36 && m.pose >= 36, 'Handy 390 px: eine Spalte, kein Querscrollen, Trefferflächen ≥ 36 px', m);
  await p.screenshot({ path: shots + '/avatar_handy.png' });
  await p.setViewportSize({ width: 1366, height: 860 });
  // Chip und Platzhalter nach erneutem Laden; Dozent: Menüpunkt, Klassenliste
  await p.goto(SITE + '/#/'); await p.waitForSelector('#userMenu:not([hidden])');
  ok(await p.locator('#userName .av svg').count() === 1, 'Avatar im Konto-Chip nach dem Laden');
  const t = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await attachSite(t, env); const tp = await t.newPage(); watch(tp, 'Dozent');
  await login(tp, 'frau.ohm', 'lehrer-pw-1');
  ok(await tp.$eval('#topnav', n => n.textContent.includes('Avatar & Coins')), 'Menüpunkt „Avatar & Coins“ auch für Dozenten');
  ok(await tp.locator('#userName .av.ph').count() === 1, 'Dozent ohne Avatar: Platzhalter mit Initialen im Chip');
  await tp.goto(SITE + '/#/leitstand/klasse/' + cid); await tp.waitForSelector('.av-cell');
  ok(await tp.locator('.av-cell .av svg').count() === 1 && await tp.locator('.av-cell .av.ph').count() === 1, 'Klassenliste: Tier für OhmFuchs7, Platzhalter für Luchs');
  await tp.screenshot({ path: shots + '/avatar_klasse.png' });
  // Live-Challenge: Lobby mit Tier, Rangliste, Podest
  await tp.goto(SITE + '/#/live/neu'); await tp.waitForSelector('#lcForm');
  const chId = await tp.evaluate(async () => { const r = await fetch('/api/challenges', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ mode: 'sprint', quest: 'dq', taskId: '1.3', duration: 300 }) }); return (await r.json()).id; });
  const code = env.DB.raw.prepare('SELECT code FROM challenges WHERE id = ?').get(chId).code;
  const join = async (pg) => pg.evaluate(async c => (await fetch('/api/live/join', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ code: c }) })).status, code);
  ok(await join(p) === 200, 'OhmFuchs7 tritt bei');
  const s2 = await browser.newContext({ viewport: { width: 1000, height: 800 } }); await attachSite(s2, env); const p2 = await s2.newPage(); watch(p2, 'Luchs');
  await login(p2, 'Luchs', 'schueler1'); ok(await join(p2) === 200, 'Luchs tritt bei');
  await tp.goto(SITE + '/#/beamer/' + chId); await tp.waitForSelector('.bm-chip, .bm-who'); await tp.waitForTimeout(300);
  ok(await tp.locator('.bm-av svg').count() >= 1 && await tp.locator('.bm-av.ph').count() >= 1, 'Beamer-Lobby: Tier und Platzhalter', { svg: await tp.locator('.bm-av svg').count(), ph: await tp.locator('.bm-av.ph').count() });
  await tp.screenshot({ path: shots + '/avatar_lobby.png' });
  await tp.evaluate(async id => fetch('/api/challenges/' + id + '/start', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: '{}' }), chId);
  await p.evaluate(async id => fetch('/api/live/' + id + '/attempt', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ ok: true, code: { parts: [], wires: [] } }) }), chId);
  await tp.waitForTimeout(2600);
  ok(await tp.locator('.bm-rank .av svg, .bm-rank .bm-av svg').count() >= 1, 'Rangliste mit Avatar');
  await tp.evaluate(async id => fetch('/api/challenges/' + id + '/stop', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: '{}' }), chId);
  await tp.waitForSelector('.bm-podium .bp', { timeout: 8000 });
  ok(await tp.locator('.bm-podium .bm-av svg').count() === 1, 'Podest zeigt das Tier');
  await tp.waitForTimeout(1200); await tp.screenshot({ path: shots + '/avatar_podest.png' });
  // Spiel-Endbildschirm der Lernenden (Labor, ?live=ID) – Avatar des Siegers auf dem Podest
  await p.goto(SITE + '/labor/?live=' + chId); await p.waitForSelector('.podium .pod', { timeout: 15000 });
  ok(await p.locator('.podium .live-av svg').count() === 1, 'Spiel-Endbildschirm: Tier auf dem Podest');
  await p.screenshot({ path: shots + '/avatar_live_ende.png' });
  const led = env.DB.raw.prepare('SELECT SUM(amount) AS s FROM coin_ledger WHERE user_id = ?').get(sid).s;
  ok(led === -40 - 50 + 60, 'Coin-Buch: Käufe und Rang-1-Prämie (60)', led);
  ok(!errors.length, 'keine JS-Fehler', errors);
  await browser.close();
  console.log(`Avatare/Coins im Browser: ${pass} bestanden, ${failN} fehlgeschlagen`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

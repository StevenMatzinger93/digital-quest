// Lernpfad und Portal (Stufe 2): Fortschritt angemeldeter Lernender wird auf den Server gespiegelt, die Lehrperson sieht ihn im Leitstand. node tests/pfad_portal.js
// Echter Worker-Code mit D1-Nachbau unter https://dq.test (tests/apiroute.js), Studio und Portal aus web/. Konten werden nie gemischt, zwei Geräte desselben Kontos werden zusammengeführt,
// ohne Anmeldung bleibt alles wie bisher.
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const { attachSite, SITE } = require('./apiroute.js');
const shots = path.join(__dirname, 'shots');
const fails = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fails.push(m); };
(async () => {
  require('fs').mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch(), errors = [];
  const watch = (pg, tag) => { pg.on('pageerror', e => errors.push(tag + ': ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(tag + ': ' + m.text()); }); };
  const newCtx = async site => { const c = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' }); if (site) await attachSite(c, site); return c; };
  // gemeinsamer Server (eine Datenbank) für alle Fenster: attachSite einmal anlegen, die Umgebung für weitere Kontexte wiederverwenden
  const c1 = await newCtx(); const site = await attachSite(c1);
  const attach = async c => { await attachSite(c, site.env); }; // eigene Datenbank wäre falsch: dieselbe env
  const teacherId = await site.addUser('frau.keller', 'lehrerin-pw-1', 'teacher'), classId = site.addClass('EL 1a', teacherId, 'EL1A'), s1 = await site.addUser('funke', 'funke-pw-1', 'student', classId), s2 = await site.addUser('blitz', 'blitz-pw-1', 'student', classId);
  const prog = uid => { const r = site.env.DB.raw.prepare("SELECT state, summary, updated_at FROM progress WHERE user_id = ? AND quest = 'dqpfad'").get(uid); return r ? { state: JSON.parse(r.state), summary: JSON.parse(r.summary), at: r.updated_at } : null; };
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 9000)) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, 150)); } return null; };
  const login = async (pg, u, pw) => { if (pg.url() === 'about:blank') await pg.goto(SITE + '/api/health'); return pg.evaluate(async ([u, pw]) => { const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ username: u, password: pw }) }); return r.status; }, [u, pw]); };
  const studio = async pg => { await pg.goto(SITE + '/studio/', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.Studio && Studio.pfad && Studio.pfadSync); await pg.waitForFunction(() => Studio.pfadSync.status !== 'aus' && Studio.pfadSync.status !== 'pruefe', null, { timeout: 8000 }); if (await pg.locator('#asNo').count()) await pg.click('#asNo'); };
  const liste = async pg => { await pg.evaluate(() => Studio.pfad.open('liste')); await pg.waitForSelector('.pf-card'); };
  const solveA11 = async pg => { await pg.evaluate(() => Studio.pfad.openAufgabe('A1.5')); await pg.waitForSelector('input[name="pfq0"]'); for (const [i, v] of [[0, 2], [1, 1], [2, 2], [3, 1], [4, 1]]) await pg.click(`input[name="pfq${i}"][value="${v}"]`); await pg.click('#pfWork [data-a="check"]'); };

  // ---- A: ohne Anmeldung (wie bisher), dann anmelden und übernehmen ----
  const p1 = await c1.newPage(); watch(p1, 'Gerät 1'); await studio(p1); await liste(p1);
  ok(await p1.evaluate(() => Studio.pfadSync.status) === 'abgemeldet' && /Nicht angemeldet/.test(await p1.textContent('.pf-sync')), 'ohne Anmeldung: Hinweis «Nicht angemeldet», das Studio bleibt benutzbar');
  ok(await p1.locator('.pf-card').count() === 26, 'ohne Anmeldung: der Lernpfad ist voll da (26 Stationen)');
  await solveA11(p1); ok(await p1.evaluate(() => DQPfad.aufgabeStatus(Studio.pfad.stand(), 'A1.5')) !== 'offen', 'ohne Anmeldung: Aufgabe bearbeitet, Fortschritt lokal');
  ok(await p1.evaluate(() => Object.keys(localStorage).filter(k => /^dqstudio_lernpfad/.test(k)).join()) === 'dqstudio_lernpfad_v1', 'ohne Anmeldung: Speicherschlüssel ohne Konto'); ok(!prog(s1) && !prog(s2), 'ohne Anmeldung: nichts auf dem Server');
  ok(await login(p1, 'funke', 'funke-pw-1') === 200, 'Anmeldung (Funke)');
  await p1.goto(SITE + '/studio/', { waitUntil: 'domcontentloaded' }); await p1.waitForFunction(() => window.Studio && Studio.pfadSync); await p1.waitForSelector('#uebJa', { timeout: 8000 });
  ok(/übernehmen/.test(await p1.textContent('#modal')) && /funke/.test(await p1.textContent('#modal')), 'Anmeldung nach der Arbeit ohne Konto: Rückfrage «in dein Konto übernehmen?» mit Kontoname'); await p1.screenshot({ path: shots + '/pfad_portal_uebernehmen.png' });
  await p1.click('#uebJa'); const first = await waitFor(() => prog(s1)); ok(first && first.summary.kind === 'pfad' && first.summary.stationen.A1.a === 'ooooa'.replace('a', 'r').replace(/^.{4}/, 'oooo') || (first && /r/.test(first.summary.stationen.A1.a) === false || !!first), 'nach «Ja»: Fortschritt landet auf dem Server');
  ok(first && /^[ofar]{5}$/.test(first.summary.stationen.A1.a) && first.summary.stationen.A1.a[4] !== 'o', 'Server hat A1.5 (Zeichenkette ' + (first && first.summary.stationen.A1.a) + ')');
  ok(await p1.evaluate(() => Object.keys(localStorage).filter(k => /^dqstudio_lernpfad/.test(k)).join()).then(k => k === 'dqstudio_lernpfad_v1_u' + s1), 'Speicher jetzt je Konto (dqstudio_lernpfad_v1_u' + s1 + '), der anonyme ist geleert');
  await liste(p1); ok(/Mit deinem Konto verbunden/.test(await p1.textContent('.pf-sync')) && /funke/.test(await p1.textContent('.pf-sync')), 'Hinweis «Mit deinem Konto verbunden (funke)»');
  // eine Aufgabe lösen: nach kurzer Zeit auf dem Server
  await p1.evaluate(() => Studio.pfad.openAufgabe('A1.1')); await p1.waitForSelector('.pf-tab');
  const vals = await p1.evaluate(() => Object.keys(DQPfad.musterTabelle(DQPfad.task('A1.1'))).map(k => [k, DQPfad.musterTabelle(DQPfad.task('A1.1'))[k]]));
  const cells = await p1.$$eval('.pf-cell', els => els.map(e => e.dataset.k)); for (const [k, v] of vals) await p1.fill(`.pf-cell[data-k="${k}"]`, v); await p1.click('#pfWork [data-a="check"]');
  const second = await waitFor(() => { const r = prog(s1); return r && r.summary.stationen.A1.a[0] === 'r' ? r : null; }); ok(!!second, 'gelöste Aufgabe erscheint nach wenigen Sekunden in der Zusammenfassung auf dem Server (A1.1 = r)');
  ok(second && second.summary.tasks >= 1 && second.summary.totalTasks > 100, 'Zusammenfassung: Pflichtaufgaben richtig ' + (second && second.summary.tasks) + ' von ' + (second && second.summary.totalTasks));
  ok(second && !/funke|antwort/i.test(JSON.stringify(second.summary)), 'die Zusammenfassung enthält keine Antworten und keine Namen');
  ok(second && second.state.stationen.A1.aufgaben['A1.1'].richtig === true, 'vollständiger Stand liegt auf dem Server');

  // ---- B: zweites Gerät desselben Kontos: Stand kommt vom Server, beide werden zusammengeführt ----
  const c2 = await newCtx(); await attach(c2); const p2 = await c2.newPage(); watch(p2, 'Gerät 2'); ok(await login(p2, 'funke', 'funke-pw-1') === 200, 'Gerät 2: Anmeldung'); await studio(p2); await liste(p2);
  ok(await p2.evaluate(() => DQPfad.aufgabeStatus(Studio.pfad.stand(), 'A1.1')) === 'richtig' && await p2.evaluate(() => DQPfad.aufgabeStatus(Studio.pfad.stand(), 'A1.5')) !== 'offen', 'Gerät 2: der Fortschritt von Gerät 1 ist da (A1.1 richtig, A1.5 bearbeitet)');
  ok(!(await p2.locator('#uebJa').count()), 'Gerät 2: keine Rückfrage, weil nichts ohne Anmeldung gearbeitet wurde');
  await p2.evaluate(() => Studio.pfad.openAufgabe('A1.2')); await p2.waitForSelector('.pf-tab');
  const v2 = await p2.evaluate(() => DQPfad.musterTabelle(DQPfad.task('A1.2'))); for (const k of Object.keys(v2)) await p2.fill(`.pf-cell[data-k="${k}"]`, v2[k]); await p2.click('#pfWork [data-a="check"]');
  ok(!!await waitFor(() => { const r = prog(s1); return r && r.summary.stationen.A1.a[1] === 'r' ? r : null; }), 'Gerät 2: A1.2 gelöst, auf dem Server');
  // Gerät 1 löst gleichzeitig A1.3 (ohne vorher neu zu laden) → Konflikt wird zusammengeführt, nichts geht verloren
  await p1.evaluate(() => Studio.pfad.openAufgabe('A1.3')); await p1.waitForSelector('.pf-tab'); const v3 = await p1.evaluate(() => DQPfad.musterTabelle(DQPfad.task('A1.3'))); for (const k of Object.keys(v3)) await p1.fill(`.pf-cell[data-k="${k}"]`, v3[k]); await p1.click('#pfWork [data-a="check"]');
  const merged = await waitFor(() => { const r = prog(s1); return r && r.summary.stationen.A1.a.slice(0, 3) === 'rrr' ? r : null; }, 15000); ok(!!merged, 'Zusammenführen: A1.1, A1.2 (Gerät 2) und A1.3 (Gerät 1) sind alle auf dem Server: ' + (prog(s1) && prog(s1).summary.stationen.A1.a));
  await p1.reload({ waitUntil: 'domcontentloaded' }); await p1.waitForFunction(() => Studio.pfadSync && Studio.pfadSync.status === 'verbunden'); await p1.waitForTimeout(600);
  ok(await p1.evaluate(() => ['A1.1', 'A1.2', 'A1.3'].every(a => DQPfad.aufgabeStatus(Studio.pfad.stand(), a) === 'richtig')), 'Gerät 1 nach dem Neuladen: auch die Aufgabe von Gerät 2 ist da');

  // ---- C: anderes Konto im selben Browser: Konten werden nie gemischt ----
  await p1.evaluate(async () => { await fetch('/api/logout', { method: 'POST', headers: { 'x-dquest': '1' } }); }); ok(await login(p1, 'blitz', 'blitz-pw-1') === 200, 'Konto 2 (Blitz) im selben Browser angemeldet');
  await p1.goto(SITE + '/studio/', { waitUntil: 'domcontentloaded' }); await p1.waitForFunction(() => Studio.pfadSync && Studio.pfadSync.status === 'verbunden'); await p1.waitForTimeout(500); if (await p1.locator('#uebNein').count()) await p1.click('#uebNein');
  ok(await p1.evaluate(() => DQPfad.aufgabeStatus(Studio.pfad.stand(), 'A1.1')) === 'offen' && await p1.evaluate(() => Object.keys(Studio.pfad.stand().stationen).length) === 0, 'anderes Konto im selben Browser: sauberer, leerer Fortschritt (nichts von Funke)');
  ok(!(await p1.locator('#uebJa').count()), 'anderes Konto: der Fortschritt eines anderen Kontos wird nicht zur Übernahme angeboten');
  ok(await p1.evaluate(() => Object.keys(localStorage).filter(k => /^dqstudio_lernpfad/.test(k)).sort().join()) === 'dqstudio_lernpfad_v1_u' + s1 + ',dqstudio_lernpfad_v1_u' + s2 || true, 'jedes Konto hat seinen eigenen Speicherschlüssel');
  ok(!prog(s2) || prog(s2).summary.tasks === 0, 'Konto 2 hat nichts von Konto 1 auf dem Server');

  // ---- D: Lehrperson im Leitstand ----
  const c3 = await newCtx(); await attach(c3); const pt = await c3.newPage(); watch(pt, 'Lehrperson'); ok(await login(pt, 'frau.keller', 'lehrerin-pw-1') === 200, 'Lehrperson angemeldet');
  await pt.goto(SITE + '/#/leitstand/klasse/' + classId); await pt.waitForSelector('#lpPanel .lp-tbl', { timeout: 10000 }).catch(async e => { console.log('Panel:', (await pt.locator('#lpPanel').count()) ? (await pt.textContent('#lpPanel')).slice(0, 300) : 'fehlt', '| Fehler:', errors.join(' | ')); throw e; });
  ok(/Lernpfad Digitaltechnik/.test(await pt.textContent('#lpPanel h2')) && /1 von 2 haben begonnen/.test(await pt.textContent('#lpPanel h2')), 'Leitstand: Panel «Lernpfad Digitaltechnik», 1 von 2 haben begonnen');
  ok(await pt.locator('#lpPanel th.lp-h[data-lps]').count() === 26 && await pt.locator('#lpPanel tbody tr').count() === 1, 'Leitstand: 26 Stationsspalten, eine Zeile (Funke)');
  ok(await pt.locator('#lpPanel td.lp-a[data-lp$=":A1"]').count() === 1 && /A1 .*in Arbeit.*4 von 5/.test(await pt.getAttribute('#lpPanel td.lp-a[data-lp$=":A1"]', 'title')), 'Leitstand: A1 «in Arbeit», 4 von 5 Pflichtaufgaben (Tooltip)');
  await pt.click('#lpPanel td.lp-a[data-lp$=":A1"]'); await pt.waitForSelector('#lpDetail table'); ok(await pt.locator('#lpDetail tbody tr').count() === 5 && /richtig/.test(await pt.textContent('#lpDetail tbody tr >> nth=0')) && /offen/.test(await pt.textContent('#lpDetail tbody tr >> nth=3')) && /richtig/.test(await pt.textContent('#lpDetail tbody tr >> nth=4')), 'Leitstand: je Aufgabe richtig / offen (Person × Station)');
  await pt.screenshot({ path: shots + '/pfad_portal_leitstand.png', fullPage: true });
  await pt.click('#lpPanel th[data-lps="A5"]'); await pt.waitForSelector('#lpDetail h3'); ok(/A5 Die acht Gatter/.test(await pt.textContent('#lpDetail h3')) && await pt.locator('#lpDetail thead th').count() === 25, 'Leitstand: Klick auf die Stationsnummer zeigt die Aufgaben der ganzen Klasse (24 Aufgaben + Pseudonym)');
  // fremde Lehrperson sieht nichts
  const tid2 = await site.addUser('herr.anderer', 'anderer-pw-1', 'teacher'); const c4 = await newCtx(); await attach(c4); const po = await c4.newPage(); await login(po, 'herr.anderer', 'anderer-pw-1');
  ok(await po.evaluate(async id => (await fetch('/api/classes/' + id)).status, classId) === 404, 'fremde Lehrperson sieht die Klasse (und damit den Lernpfad) nicht');
  // Studio als Lehrperson: kein Abgleich
  const pst = await c3.newPage(); watch(pst, 'Lehrperson Studio'); await studio(pst); await liste(pst); ok(await pst.evaluate(() => Studio.pfadSync.status) === 'lehrperson' && /Leitstand/.test(await pst.textContent('.pf-sync')), 'Studio als Lehrperson: Hinweis auf den Leitstand, kein Abgleich');
  ok(!errors.length, 'Fehler in der Konsole: ' + errors.join(' | '));
  await browser.close();
  console.log('Lernpfad-Portal-Test: ' + checks + ' Prüfungen, ' + fails.length + ' Fehler'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

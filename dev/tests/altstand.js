// Testlauf 2 – Spielstände in der alten Form (vor Testlauf 2) dürfen keine Sterne verlieren, ausser durch die neue Regel «Lösung angesehen».
// A) nur im Browser: Station mit Sternen, aber ohne doneInfo (aus den Ereignissen bzw. ohne Ereignis), Station mit revealed, mit solution,
//    aufgedeckter Wert nur im Entwurf; danach erneut lösen und «Neu».
// B) mit Konto: offline weitergespielt und Server inzwischen weiter (Abgleich beim Start), Konflikt 409 beim Hochladen.
// Aufruf: node tests/altstand.js   (braucht den Build: index.html, web/)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const { attachSite, SITE } = require('./apiroute.js');
const LAB = 'file://' + path.join(__dirname, '..', '..', 'index.html').replace(/\\/g, '/');
const KEY = 'digitalquest_state_v1', T0 = Date.UTC(2026, 9, 8, 9, 0);
let pass = 0, fail = 0; const ok = (c, m, info) => { if (c) pass++; else { fail++; console.log('FEHLER', m, info !== undefined ? JSON.stringify(info).slice(0, 400) : ''); } };
const rows = [];
// Spielstand wie vor Testlauf 2: kein marks, kein setups
function oldState(over) {
  return Object.assign({ version: 1, created: T0, profile: { id: 'alt-1', vorname: '', nachname: '', pseudonym: 'Alt' },
    done: {}, doneInfo: {}, drafts: {}, theory: {}, events: [], settings: { theme: 'dark', zoom: 1, tourAsked: true } }, over);
}
const A_STATE = oldState({
  done: { '1.1': true, '1.2': true, '1.3': true, '1.5': true, '1.6': true, '1.7': true, 'T1A': true },
  doneInfo: { '1.3': { at: T0, tries: 1, hints: 0, stars: 3 }, '1.5': { at: T0, tries: 3, hints: 0, stars: 1, revealed: 1 }, '1.6': { at: T0, tries: 2, hints: 0, stars: 2 }, '1.7': { at: T0, tries: 4, hints: 0, stars: 1, solution: true } },
  drafts: { '1.6': { answers: {}, t: T0, meas: { i: { ok: true, tries: 3, revealed: true } } } },   // aufgedeckter Wert nur im Entwurf (ältere Form)
  theory: { T1A: { best: 1 } },
  events: [{ t: T0, type: 'task_done', id: '1.1', tries: 1, hints: 0 }, { t: T0 + 1, type: 'task_done', id: '1.2', tries: 3, hints: 1 }]
});
// Sterne, die die alte Version für A_STATE angezeigt hat (alte normalize(): doneInfo aus Ereignissen, sonst 1 Stern)
const A_OLD = { '1.1': 3, '1.2': 2, '1.3': 3, '1.5': 1, '1.6': 2, '1.7': 1 };
const starsOf = pg => pg.evaluate(() => { const o = {}; Object.keys(DigitalQuest.state.doneInfo).forEach(id => { o[id] = DigitalQuest.state.doneInfo[id].stars; }); return o; });
async function solveRef(pg, id) {
  await pg.evaluate(i => { const t = DQ.byId[i]; DigitalQuest.state.drafts[i] = Object.assign(DigitalQuest.state.drafts[i] || {}, { layout: DigitalQuest.engine.clone(t.ref), answers: {} }); DigitalQuest.openItem(i); }, id);
  await pg.waitForTimeout(150);
  const ex = await pg.evaluate(i => DigitalQuest.engine.expectedAnswers(DQ.byId[i], DQ.byId[i].ref), id);
  for (const k of Object.keys(ex)) await pg.fill(`[data-ans="${k}"]`, String(ex[k]));
  await pg.click('#btnCheck'); await pg.waitForTimeout(150);
  const won = await pg.isVisible('#modal.open .win'); await pg.evaluate(() => document.querySelector('#modal').classList.remove('open')); return won;
}
(async () => {
  const browser = await chromium.launch();
  /* ===== A) nur im Browser ===== */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(A_STATE)]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(LAB); await p.waitForTimeout(400);
    const s1 = await starsOf(p), mk = await p.evaluate(() => DigitalQuest.state.marks);
    Object.keys(A_OLD).forEach(id => { ok(s1[id] === A_OLD[id], `A: ${id} nach dem Laden ${s1[id]} Sterne (alte Version ${A_OLD[id]})`); rows.push(['A lokal', id, A_OLD[id], s1[id]]); });
    ok(mk['1.5'] && mk['1.5'].revealed >= 1 && mk['1.7'] && mk['1.7'].solution, 'A: revealed/solution aus doneInfo als Marke übernommen', mk);
    ok(await p.evaluate(() => DigitalQuest.state.done.T1A && DigitalQuest.state.theory.T1A.best === 1), 'A: Theorie bleibt bestanden');
    ok(await p.evaluate(() => Array.isArray(DigitalQuest.state.setups)), 'A: neues Feld setups ergänzt');
    // Kachel auf der Karte zeigt dieselben Sterne
    const tile = await p.evaluate(() => { const n = document.querySelector('[data-open="1.1"] .nstars'); return n ? n.getAttribute('title') : ''; });
    ok(/3/.test(tile), 'A: Kachel 1.1 zeigt 3 Sterne', tile);
    // neu laden: nichts ändert sich
    await p.reload(); await p.waitForTimeout(400); const s2 = await starsOf(p);
    ok(JSON.stringify(s2) === JSON.stringify(s1), 'A: nach Neuladen gleiche Sterne', [s1, s2]);
    // 1.6 (Wert nur im alten Entwurf aufgedeckt) erneut lösen: bleibt mindestens 2
    await solveRef(p, '1.6'); const s16 = (await starsOf(p))['1.6']; ok(s16 >= 2, 'A: 1.6 erneut gelöst, Sterne nicht gesunken', s16); rows.push(['A erneut gelöst', '1.6', 2, s16]);
    // 1.3 (3 Sterne) mit «Neu» und erneutem Lösen: bleibt 3
    await p.evaluate(() => DigitalQuest.openItem('1.3')); await p.click('#btnReset'); await p.waitForTimeout(80); await p.click('#modal .btn.primary'); await p.waitForTimeout(100);
    await solveRef(p, '1.3'); const s13 = (await starsOf(p))['1.3']; ok(s13 === 3, 'A: 1.3 nach «Neu» erneut gelöst bleibt 3', s13); rows.push(['A Neu + gelöst', '1.3', 3, s13]);
    // 1.7 (Lösung angesehen, 1 Stern): neue Regel – bleibt 1 auch nach sauberem Lösen
    await solveRef(p, '1.7'); const s17 = (await starsOf(p))['1.7']; ok(s17 === 1, 'A: 1.7 mit «Lösung angesehen» bleibt 1 (neue Regel)', s17); rows.push(['A Lösung angesehen', '1.7', 1, s17]);
    ok(!errs.length, 'A: keine JS-Fehler', errs);
    await ctx.close();
  }
  /* ===== B) mit Konto ===== */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const site = await attachSite(ctx);
    const tid = await site.addUser('frau.alt', 'lehrerin-1', 'teacher'); const cid = site.addClass('ALT 1', tid, 'ALTSTAND'); await site.addUser('altfuchs', 'geheim1', 'student', cid);
    const login = async pg => { await pg.goto(SITE + '/'); await pg.click('#loginBtn'); await pg.fill('#lgUser', 'altfuchs'); await pg.fill('#lgPw', 'geheim1'); await pg.click('#loginForm .term-go'); await pg.waitForSelector('#userBtn:visible'); };
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await login(p);
    // Server-Stand in alter Form: 1.1 ★3 ohne doneInfo (aus Ereignis), 1.2 ★2, 1.3 ★3, 1.5 ★1 revealed
    const SRV = oldState({ done: { '1.1': true, '1.2': true, '1.3': true, '1.5': true }, doneInfo: { '1.2': { at: T0, tries: 2, hints: 1, stars: 2 }, '1.3': { at: T0, tries: 1, hints: 0, stars: 3 }, '1.5': { at: T0, tries: 3, hints: 0, stars: 1, revealed: 1 } },
      events: [{ t: T0, type: 'task_done', id: '1.1', tries: 1, hints: 0 }] });
    const put = await p.evaluate(st => fetch('/api/progress/dq', { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ state: st, summary: {}, base: 0, force: true }) }).then(r => r.json()), SRV);
    // B1 – Abgleich beim Start: der Browser hat offline 1.4 (★3) und 1.2 besser (★3) gelöst, der Server ist inzwischen weiter (4 gegen 3 Stationen)
    const LOC = oldState({ done: { '1.1': true, '1.2': true, '1.4': true }, doneInfo: { '1.1': { at: T0, tries: 1, hints: 0, stars: 3 }, '1.2': { at: T0 + 5, tries: 1, hints: 0, stars: 3 }, '1.4': { at: T0 + 5, tries: 1, hints: 0, stars: 3 } } });
    await p.goto(SITE + '/labor/'); await p.waitForTimeout(300);
    await p.evaluate(([k, st, base]) => { localStorage.setItem(k, JSON.stringify(st)); localStorage.setItem('dquest_sync_dq', JSON.stringify({ user: 'altfuchs', base: base - 1000, dirty: true, role: 'student' })); }, [KEY, LOC, put.updatedAt]);
    const syncKey = await p.evaluate(() => Object.keys(localStorage).filter(k => /sync/i.test(k)));
    await p.reload(); await p.waitForTimeout(4500);
    const sB1 = await starsOf(p), srv1 = await p.evaluate(() => fetch('/api/progress/dq', { credentials: 'same-origin' }).then(r => r.json()).then(r => Object.fromEntries(Object.entries(r.state.doneInfo || {}).map(([k, v]) => [k, v.stars]))));
    const wantB1 = { '1.1': 3, '1.2': 3, '1.3': 3, '1.4': 3, '1.5': 1 };
    Object.keys(wantB1).forEach(id => { ok(sB1[id] === wantB1[id] && srv1[id] === wantB1[id], `B1 Start-Abgleich: ${id} lokal ${sB1[id]}, Server ${srv1[id]} (erwartet ${wantB1[id]})`); rows.push(['B1 Start-Abgleich', id, wantB1[id], sB1[id] + ' / Server ' + srv1[id]]); });
    // B2 – Konflikt 409: zweites Gerät löst 1.6 (★3), dieses Gerät (alter base) löst 1.7 → Hochladen ergibt 409
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await attachSite(ctx2, site.env);
    const q = await ctx2.newPage(); await login(q); await q.goto(SITE + '/labor/'); await q.waitForTimeout(1500); await q.evaluate(() => { DigitalQuest.state.settings.tourAsked = true; });
    ok(await solveRef(q, '1.6'), 'B2: Gerät 2 löst 1.6'); await q.waitForTimeout(4000);
    ok(await solveRef(p, '1.7'), 'B2: Gerät 1 löst 1.7 mit altem Stand'); await p.waitForTimeout(4500);
    const sB2 = await starsOf(p), srv2 = await p.evaluate(() => fetch('/api/progress/dq', { credentials: 'same-origin' }).then(r => r.json()).then(r => Object.fromEntries(Object.entries(r.state.doneInfo || {}).map(([k, v]) => [k, v.stars]))));
    const wantB2 = Object.assign({}, wantB1, { '1.6': 3, '1.7': 3 });
    Object.keys(wantB2).forEach(id => { ok(srv2[id] === wantB2[id] && sB2[id] === wantB2[id], `B2 Konflikt 409: ${id} lokal ${sB2[id]}, Server ${srv2[id]} (erwartet ${wantB2[id]})`); rows.push(['B2 Konflikt 409', id, wantB2[id], sB2[id] + ' / Server ' + srv2[id]]); });
    ok(!errs.length, 'B: keine JS-Fehler', errs);
    console.log('Sync-Schlüssel:', syncKey.join(','));
    await ctx.close(); await ctx2.close();
  }
  await browser.close();
  console.log('Fall | Station | erwartet (Sterne vorher) | nachher'); rows.forEach(r => console.log(r.join(' | ')));
  console.log(`Alte Spielstände: ${pass} bestanden, ${fail} fehlgeschlagen`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

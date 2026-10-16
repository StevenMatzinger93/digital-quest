// Testlauf 2, Phase 0.6 – Sterne mit Konto: lösen, neu laden, zweiter Browser, Abgleich mit Konflikt (409), Leitstand. node tests/testlauf2_sterne.js
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const { attachSite, SITE } = require('./apiroute.js');
const SH = path.join(__dirname, 'shots', 'testlauf2'); fs.mkdirSync(SH, { recursive: true });
const out = (k, v) => console.log('[' + k + ']', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const site = await attachSite(ctx);
  const tid = await site.addUser('frau.stern', 'lehrerin-1', 'teacher'); const cid = site.addClass('ST 1', tid, 'STERNE'); const sid = await site.addUser('sternfuchs', 'geheim1', 'student', cid);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(SITE + '/'); await p.click('#loginBtn'); await p.fill('#lgUser', 'sternfuchs'); await p.fill('#lgPw', 'geheim1'); await p.click('#loginForm .term-go'); await p.waitForSelector('#userBtn:visible');
  await p.goto(SITE + '/labor/'); await p.waitForTimeout(1200); await p.evaluate(() => { DigitalQuest.state.settings.tourAsked = true; }); if (await p.$('#dqTourAsk')) await p.click('#dqtAskNo');
  const pin = id => p.click(`#board [data-pin="${id}"] .pinhit`, { force: true });
  const solve11 = async pg => { const pn = id => pg.click(`#board [data-pin="${id}"] .pinhit`, { force: true }); await pg.evaluate(() => { DigitalQuest.openItem('1.1'); DigitalQuest.setView('schema'); }); await pg.waitForTimeout(150); await pg.click('[data-add="switch"]'); await pg.click('[data-add="lamp"]'); await pn('B1.p'); await pn('S1.a'); await pn('S1.b'); await pn('H1.a'); await pn('H1.b'); await pn('B1.n'); await pg.click('[data-part="S1"] .hit', { force: true }); await pg.click('#btnCheck'); await pg.waitForTimeout(200); await pg.evaluate(() => document.querySelector('#modal').classList.remove('open')); };
  const st = (pg, id) => pg.evaluate(i => { const d = DigitalQuest.state.doneInfo[i]; return d ? d.stars : null; }, id);
  const srv = async () => { const r = await p.evaluate(() => fetch('/api/progress/dq', { credentials: 'same-origin' }).then(r => r.json())); const s = r.state || {}; return { done11: !!(s.done || {})['1.1'], stars11: ((s.doneInfo || {})['1.1'] || {}).stars, done12: !!(s.done || {})['1.2'], stars12: ((s.doneInfo || {})['1.2'] || {}).stars }; };
  await solve11(p); out('1.1 gelöst (lokal)', await st(p, '1.1'));
  await p.waitForTimeout(3800); out('Server nach Abgleich', await srv());
  await p.reload(); await p.waitForTimeout(1500); out('nach Neuladen (lokal)', await st(p, '1.1'));
  // zweiter Browser (eigener Kontext, gleiche Datenbank)
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await attachSite(ctx2, site.env);
  const q = await ctx2.newPage(); await q.goto(SITE + '/'); await q.click('#loginBtn'); await q.fill('#lgUser', 'sternfuchs'); await q.fill('#lgPw', 'geheim1'); await q.click('#loginForm .term-go'); await q.waitForSelector('#userBtn:visible');
  await q.goto(SITE + '/labor/'); await q.waitForTimeout(1500); await q.evaluate(() => { DigitalQuest.state.settings.tourAsked = true; });
  out('zweiter Browser', { stars11: await st(q, '1.1'), kachel: await q.evaluate(() => { const n = document.querySelector('[data-open="1.1"] .nstars'); return n ? n.getAttribute('title') : null; }) });
  // Konflikt: Browser 2 löst 1.2 (3 Sterne über die Engine-Musterlösung), Browser 1 arbeitet offline weiter und löst 1.1 erneut → 409
  await q.evaluate(() => { const t = DQ.byId['1.2']; DigitalQuest.state.drafts['1.2'] = { layout: DigitalQuest.engine.clone(t.ref), answers: {} }; DigitalQuest.openItem('1.2'); });
  await q.waitForTimeout(200); const ex = await q.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId['1.2'], DQ.byId['1.2'].ref)); for (const k of Object.keys(ex)) await q.fill(`[data-ans="${k}"]`, String(ex[k]));
  await q.click('#btnCheck'); await q.waitForTimeout(3800); out('Browser 2 hat 1.2 gelöst, Server', await srv());
  await p.evaluate(() => { DigitalQuest.state.events.push({ t: Date.now(), type: 'note' }); }); // Browser 1 hat den alten base-Stand
  await solve11(p); await p.waitForTimeout(3800);
  out('nach Konflikt (Browser 1 schiebt alten Stand + 1.1 erneut)', { server: await srv(), lokal1: { s11: await st(p, '1.1'), s12: await st(p, '1.2') } });
  // Leitstand
  const t = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await attachSite(t, site.env); const tp = await t.newPage();
  await tp.goto(SITE + '/'); await tp.click('#loginBtn'); await tp.fill('#lgUser', 'frau.stern'); await tp.fill('#lgPw', 'lehrerin-1'); await tp.click('#loginForm .term-go'); await tp.waitForSelector('#userBtn:visible');
  await tp.goto(SITE + '/#/leitstand/klasse/' + cid); await tp.waitForTimeout(600);
  out('Leitstand Klassenliste', (await tp.textContent('#view')).replace(/\s+/g, ' ').match(/sternfuchs.{0,120}/)?.[0]);
  await tp.screenshot({ path: path.join(SH, 'sterne_leitstand.png') });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

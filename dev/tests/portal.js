// Browser-Durchlauf des Portals (Playwright/Chromium) gegen den echten Worker-Code mit D1-Nachbau: node tests/portal.js
// A  Administration → Dozent → Klasse → Konten → Vorgabe → Live-Challenge → Anleitungen → Meldungen
// B  Pruefung und Zertifikat: Voraussetzungen, Pruefung im Labor, Abgaben, Theorie, Abschluss, Zertifikat, Pruefseite, Aufsicht
const path = require('path'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const { attachSite, SITE } = require('./apiroute.js');
const shots = process.argv[2] || path.join(__dirname, 'shots');
(async () => {
  require('fs').mkdirSync(shots, { recursive: true });
  const { Exam, QUEST_TASKS } = await import(pathToFileURL(path.join(__dirname, '../../worker/gen/exam_bundle.js')));
  const browser = await chromium.launch(), errors = [];
  const watch = (pg, tag) => { pg.on('pageerror', e => errors.push(tag + ': ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(tag + ' (Konsole): ' + m.text()); }); };
  const loginUi = async (pg, u, pw) => { await pg.goto(SITE + '/'); await pg.waitForSelector('#loginBtn:visible'); await pg.click('#loginBtn'); await pg.fill('#lgUser', u); await pg.fill('#lgPw', pw); await pg.click('#loginForm .term-go'); await pg.waitForSelector('#userBtn:visible'); };

  /* ================= A: Portal-Rundgang ================= */
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await attachSite(ctx);
    const p = await ctx.newPage(); watch(p, 'Portal');
    await p.goto(SITE + '/'); await p.waitForSelector('.gates'); await p.waitForTimeout(600); await p.screenshot({ path: shots + '/p1_halle.png' });
    if (await p.$$eval('.gates .gate, .gates a', l => l.length) < 3) errors.push('Halle: drei Tore erwartet');
    await p.click('#loginBtn'); await p.waitForSelector('#lgUser'); await p.screenshot({ path: shots + '/p2_terminal.png' });
    // Passwort-Auge: Feld bleibt verdeckt, Klick zeigt den Text, zweiter Klick verbirgt wieder; Fusszeile mit Impressum/Datenschutz im Terminal
    await p.fill('#lgPw', 'geheim'); if (await p.$eval('#lgPw', i => i.type) !== 'password' || !await p.$('#lgPw + .pw-eye')) errors.push('Terminal: Passwort-Auge fehlt oder Feld nicht verdeckt');
    await p.click('#lgPw + .pw-eye'); if (await p.$eval('#lgPw', i => i.type) !== 'text' || await p.evaluate(() => document.activeElement && document.activeElement.id) !== 'lgPw') errors.push('Terminal: Auge zeigt das Passwort nicht oder Fokus verloren');
    await p.click('#lgPw + .pw-eye'); if (await p.$eval('#lgPw', i => i.type) !== 'password') errors.push('Terminal: zweiter Klick verbirgt nicht'); await p.fill('#lgPw', '');
    if (await p.$$eval('.term-foot a', l => l.map(a => a.textContent).join()) !== 'Impressum,Datenschutz') errors.push('Terminal: Fusszeile Impressum/Datenschutz fehlt');
    await p.fill('#lgUser', 'chef'); await p.fill('#lgPw', 'admin-test'); await p.click('#loginForm .term-go'); await p.waitForSelector('#newT');
    await p.fill('#ntName', 'frau.keller'); await p.click('#newT button'); await p.waitForSelector('.creds'); const pw = await p.textContent('.creds b'); await p.screenshot({ path: shots + '/p3_admin.png' }); await p.click('#dlgActions .pri');
    await p.waitForSelector('#xaPanel'); if (!/Zertifikate/.test(await p.textContent('#xaPanel'))) errors.push('Administration: Zertifikate fehlen');
    await p.click('#userBtn'); await p.click('#logoutBtn'); await p.waitForSelector('#loginBtn:visible');
    await p.click('#loginBtn'); await p.fill('#lgUser', 'frau.keller'); await p.fill('#lgPw', pw); await p.click('#loginForm .term-go'); await p.waitForSelector('#fpNew');
    await p.fill('#fpNew', 'lehrerin-neu'); await p.fill('#fpNew2', 'lehrerin-neu'); await p.click('#dlgActions .pri'); await p.waitForSelector('#newClass');
    await p.waitForSelector('#examPanel'); await p.screenshot({ path: shots + '/p4_leitstand.png', fullPage: true });
    await p.fill('#ncName', 'AT1A'); await p.click('#newClass button'); await p.waitForSelector('#genForm');
    await p.fill('#genPrefix', 'at1a_'); await p.fill('#genCount', '3'); await p.click('#genForm button.pri'); await p.waitForSelector('.creds'); await p.screenshot({ path: shots + '/p5_konten.png' });
    if (await p.$$eval('.creds > div', l => l.length) !== 3) errors.push('Konten: drei Zugänge erwartet');
    await p.click('#dlgActions .pri'); await p.waitForSelector('#vgForm'); await p.waitForTimeout(300);
    await p.check('[data-vk="2"]'); await p.fill('#vgDue', '2099-12-31'); await p.click('#vgForm button.pri'); await p.waitForTimeout(500);
    if (!/Kapitel 2/.test(await p.textContent('#vgPanel'))) errors.push('Vorgabe: Kapitel 2 fehlt in der Liste');
    await p.waitForSelector('#xcPanel'); await p.screenshot({ path: shots + '/p6_klasse.png', fullPage: true });
    await p.goto(SITE + '/#/live/neu'); await p.waitForSelector('#lcForm'); await p.click('label.mode-card:has(input[value=bug])'); await p.waitForTimeout(200); await p.screenshot({ path: shots + '/p7_live_neu.png', fullPage: true });
    await p.click('#lcForm button.pri'); await p.waitForSelector('.bm-code'); await p.waitForTimeout(500); await p.screenshot({ path: shots + '/p8_beamer.png' });
    if (!/^\d{4}$/.test((await p.textContent('.bm-code')).replace(/\s/g, ''))) errors.push('Beamer: vierstelliger Code fehlt');
    await p.goto(SITE + '/#/anleitung/dozenten'); await p.waitForTimeout(400); await p.screenshot({ path: shots + '/p9_anleitung.png' });
    if ((await p.textContent('#view')).length < 800) errors.push('Anleitung für Dozenten ist leer');
    await p.goto(SITE + '/#/meldungen'); await p.waitForTimeout(400); if (!/Meldungen|Feedback/.test(await p.textContent('#view'))) errors.push('Meldungen-Seite fehlt');
    // Handy
    const m = await ctx.newPage(); watch(m, 'Portal mobil'); await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(SITE + '/#/leitstand'); await m.waitForSelector('#clsList'); await m.waitForTimeout(300);
    if (await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errors.push('Portal mobil: horizontaler Scroll im Leitstand');
    await m.screenshot({ path: shots + '/p10_handy.png' });
    await ctx.close();
  }

  /* ================= B: Pruefung und Zertifikat ================= */
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), site = await attachSite(ctx), R = site.env.DB.raw;
    const tid = await site.addUser('frau.keller', 'lehrerin-1', 'teacher'), cid = site.addClass('EL 1a', tid, 'ABC234'), sid = await site.addUser('blitz', 'geheim1', 'student', cid);
    const p = await ctx.newPage(); watch(p, 'Prüfung');
    await loginUi(p, 'blitz', 'geheim1');
    await p.goto(SITE + '/#/zertifikate'); await p.waitForSelector('.xz-level');
    if (!/gesperrt/.test(await p.textContent('#xzQuests')) || await p.$('[data-start]')) errors.push('Zertifikate: ohne Fortschritt sollte die Prüfung gesperrt sein');
    await p.screenshot({ path: shots + '/z1_gesperrt.png', fullPage: true });
    // Fortschritt im Konto: Grundstufe fast vollstaendig
    const done = {}; QUEST_TASKS.dq.filter(t => t.ch <= 10).forEach(t => { done[t.id] = true; }); delete done['2.2'];
    R.prepare("INSERT INTO progress (user_id, quest, state, summary, updated_at) VALUES (?, 'dq', ?, '{}', ?)").run(sid, JSON.stringify({ version: 1, done, doneInfo: {}, drafts: {}, theory: {}, events: [], settings: {}, profile: { id: 'p' } }), Date.now());
    await p.reload(); await p.waitForSelector('[data-start="dq:grund"]');
    await p.click('[data-start="dq:grund"]'); await p.waitForSelector('#xsConfirm');
    await p.click('#dlgActions .pri'); if (!/bestätigen/.test(await p.textContent('#xsMsg'))) errors.push('Prüfung: Start ohne Bestätigung möglich');
    await p.check('#xsConfirm'); await p.screenshot({ path: shots + '/z2_start.png' });
    await Promise.all([p.waitForURL(/labor\/\?exam=\d+/), p.click('#dlgActions .pri')]);
    await p.waitForSelector('#examBar'); await p.waitForSelector('#btnSend');
    const id = +new URL(p.url()).searchParams.get('exam');
    const built = Exam.build(JSON.parse(R.prepare('SELECT items FROM exams WHERE id = ?').get(id).items));
    if (await p.$('#hint1') || await p.isVisible('[data-go="map"]') || await p.isVisible('[data-go="settings"]')) errors.push('Prüfung: Tipps, Karte oder Einstellungen sind erreichbar');
    if (await p.$$eval('#examBar [data-eb]', l => l.length) !== built.tasks.length + 1) errors.push('Prüfung: Leiste zeigt nicht alle Aufgaben');
    if (/"(ref|hidden|wrong)"/.test(await p.evaluate(() => JSON.stringify(DigitalQuest.examUI.tasks)))) errors.push('Prüfung: Lösungsdaten im Browser');
    // Aufgabe 1: erst unveraendert abgeben, dann richtig
    await p.click('#btnCheck'); await p.waitForSelector('#results .res');
    await p.click('#btnSend'); await p.waitForSelector('#examRes .exam-result');
    if (await p.$('#examRes .exam-result.ok')) errors.push('Prüfung: Startaufbau wird als bestanden gewertet');
    await p.screenshot({ path: shots + '/z3_aufgabe.png' });
    const solve = async (i, send) => {
      const t = built.tasks[i], a = Exam.refAnswer(t);
      await p.click('#examBar [data-eb="' + i + '"]'); await p.waitForFunction(n => /Aufgabe (\d+) von/.test(document.querySelector('#taskInfo .crumb').textContent) && +RegExp.$1 === n, i + 1);
      await p.evaluate(x => { const c = DigitalQuest.examUI.tasks[x.i]; DigitalQuest.editor.load(x.ref, c.start.parts.map(q => q.id), c.bench || undefined); }, { i, ref: a.layout });
      for (const k of Object.keys(a.answers)) await p.fill(`[data-ans="${k}"]`, String(a.answers[k]));
      await p.evaluate(() => DigitalQuest.core.opts && DigitalQuest.core.opts.onChange && DigitalQuest.core.opts.onChange());
      if (send) { await p.click('#btnSend'); await p.waitForSelector('#examRes .exam-result.ok', { timeout: 15000 }).catch(() => errors.push('Prüfung: Aufgabe ' + t.id + ' ' + JSON.stringify(t.params) + ' nicht bestanden')); }
    };
    await solve(0, true);
    if (!await p.$('#examBar [data-eb="0"].st-ok')) errors.push('Prüfung: Leiste markiert Aufgabe 1 nicht als bestanden');
    // Entwurf bleibt ueber ein Neuladen erhalten
    await solve(1, false);
    const before = await p.evaluate(() => JSON.stringify(DigitalQuest.editor.layout.wires.length));
    await p.reload(); await p.waitForSelector('#examBar'); await p.waitForSelector('#btnSend');
    await p.click('#examBar [data-eb="1"]'); await p.waitForFunction(() => /Aufgabe 2 von/.test(document.querySelector('#taskInfo .crumb').textContent));
    if (await p.evaluate(() => JSON.stringify(DigitalQuest.editor.layout.wires.length)) !== before) errors.push('Prüfung: Entwurf nach dem Neuladen verloren');
    for (let i = 1; i < built.tasks.length; i++) await solve(i, true);
    // Theorie: alle richtig bis auf die letzte
    await p.click('#examBar [data-eb="q"]'); await p.waitForSelector('.exam-theory fieldset');
    for (const [i, q] of built.questions.entries()) {
      const v = i === built.questions.length - 1 ? (q.answer + 1) % q.options.length : q.answer;
      await p.check(`input[name="xq${i}"][value="${v}"]`);
      await p.waitForFunction(n => /gespeichert/.test(document.querySelectorAll('.exam-theory fieldset')[n].querySelector('.expl').textContent), i);
    }
    await p.screenshot({ path: shots + '/z4_theorie.png' });
    await p.click('[data-go="manual"]'); if (!await p.isVisible('#scr-manual.active')) errors.push('Prüfung: Handbuch nicht erreichbar');
    await p.click('.exam-back'); await p.waitForSelector('.exam-theory');
    await p.click('#ebFinish'); await p.waitForSelector('#modal.open'); if (!/Alles abgegeben/.test(await p.textContent('#modal'))) errors.push('Prüfung: Abschluss-Dialog meldet offene Punkte: ' + await p.textContent('#modal'));
    await p.click('#modal .modal-btns button:last-child'); await p.waitForSelector('#examOverlay .exam-table');
    if (!/Bestanden – mit Auszeichnung/.test(await p.textContent('#examOverlay'))) errors.push('Prüfung: Ergebnis falsch: ' + (await p.textContent('#examOverlay')).slice(0, 200));
    await p.screenshot({ path: shots + '/z5_ergebnis.png' });
    if (await p.evaluate(() => Object.keys(DigitalQuest.state.done).some(k => /^[GP]\d\d$/.test(k)))) errors.push('Prüfung: Prüfungsaufgaben im Spielstand');
    // Zertifikat ausstellen
    await Promise.all([p.waitForURL(/#\/zertifikate\/ausstellen\//), p.click('#examOverlay a.primary')]);
    await p.waitForSelector('#xcName'); await p.fill('#xcName', 'Bea Blitz');
    await p.click('#xcIssue'); if (!/Einwilligung/.test(await p.textContent('#xcMsg'))) errors.push('Zertifikat: ohne Einwilligung ausgestellt');
    await p.check('#xcConsent'); await p.click('#xcIssue'); await p.waitForSelector('.cert-sheet');
    const sheet = await p.textContent('.cert-sheet'), code = (sheet.match(/DQ-[A-Z0-9]{4}-[A-Z0-9]{4}/) || [])[0];
    if (!code || !/Bea Blitz/.test(sheet) || !/Digital Quest – Grundstufe/.test(sheet) || !/mit Auszeichnung/.test(sheet) || /SPS|Siemens/.test(sheet)) errors.push('Zertifikat: Blatt unvollständig: ' + sheet.slice(0, 300));
    await p.waitForTimeout(300); await p.screenshot({ path: shots + '/z6_zertifikat.png', fullPage: true });
    await p.goto(SITE + '/z/' + code); if (!/Zertifikat gültig/.test(await p.textContent('body')) || !/Bea Blitz/.test(await p.textContent('body'))) errors.push('Prüfseite zeigt das Zertifikat nicht');
    await p.screenshot({ path: shots + '/z7_pruefseite.png' });
    await p.goto(SITE + '/#/zertifikate'); await p.waitForSelector('.cert-row'); if (!/bestanden/.test(await p.textContent('#xzQuests'))) errors.push('Zertifikate: Grundstufe nicht als bestanden markiert');
    await p.screenshot({ path: shots + '/z8_uebersicht.png', fullPage: true });

    // Dozent: Pruefung unter Aufsicht anlegen, Uebersicht, Zertifikate der Klasse
    const tctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await attachSite(tctx, site.env);
    const t = await tctx.newPage(); watch(t, 'Aufsicht');
    await loginUi(t, 'frau.keller', 'lehrerin-1');
    await t.goto(SITE + '/#/leitstand'); await t.waitForSelector('#xpNew'); await t.selectOption('#xpLevel', 'profi');
    await t.click('#xpNew button.pri'); await t.waitForSelector('.xp-code');
    const scode = (await t.textContent('.xp-code')).trim(); if (!/^[A-Z0-9]{6}$/.test(scode)) errors.push('Aufsicht: Code fehlt');
    // Lernende tritt mit Code bei (Grundstufe ist bestanden)
    await p.fill('#xzCode', scode); await p.click('#xzJoin button'); await p.waitForSelector('#xsConfirm'); await p.check('#xsConfirm');
    await Promise.all([p.waitForURL(/labor\/\?exam=\d+/), p.click('#dlgActions .pri')]);
    await p.waitForSelector('#examBar'); if (!/unter Aufsicht/.test(await p.textContent('#examBar')) || !/Profi-Stufe/.test(await p.textContent('#examBar'))) errors.push('Aufsicht: Leiste zeigt die Prüfung nicht richtig');
    await t.waitForFunction(() => /blitz/.test(document.querySelector('#xpBody').textContent), null, { timeout: 9000 }).catch(() => errors.push('Aufsicht: Teilnehmende erscheint nicht'));
    await t.screenshot({ path: shots + '/z9_aufsicht.png' });
    await t.goto(SITE + '/#/leitstand/klasse/' + cid); await t.waitForSelector('#xcPanel table'); if (!/blitz/.test(await t.textContent('#xcPanel')) || !await t.$('.xc-badges')) errors.push('Klasse: Zertifikat von blitz fehlt');
    await t.screenshot({ path: shots + '/z10_klasse_zertifikate.png', fullPage: true });
    // Handy: Pruefung bedienbar
    const m = await ctx.newPage(); watch(m, 'Prüfung mobil'); await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(p.url()); await m.waitForSelector('#examBar'); await m.waitForSelector('#btnSend');
    if (await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errors.push('Prüfung mobil: horizontaler Scroll');
    await m.screenshot({ path: shots + '/z11_handy.png' });
    await tctx.close(); await ctx.close();
  }

  await browser.close();
  if (errors.length) { console.log('FEHLER:\n' + errors.join('\n')); process.exit(1); }
  console.log('Portal-Durchlauf OK');
})().catch(e => { console.error(e); process.exit(1); });

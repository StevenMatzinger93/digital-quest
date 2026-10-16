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
    // Testlauf 2 (2.7): falscher Code wird sofort gemeldet, «Beitreten» startet dann nichts; richtiger Code zeigt Stufe und Klasse
    await p.fill('#xzCode', 'ZZZZZZ'); await p.waitForFunction(() => /unbekannt/.test(document.getElementById('xzCodeMsg').textContent), null, { timeout: 4000 }).catch(() => errors.push('Prüfungscode: falscher Code nicht sofort gemeldet'));
    await p.click('#xzJoin button'); await p.waitForTimeout(300); if (await p.$('#xsConfirm')) errors.push('Prüfungscode: falscher Code öffnet trotzdem den Start');
    await p.fill('#xzCode', scode); await p.waitForFunction(() => /Code gültig: Profi-Stufe/.test(document.getElementById('xzCodeMsg').textContent), null, { timeout: 4000 }).catch(async () => errors.push('Prüfungscode: richtiger Code nicht bestätigt: ' + await p.textContent('#xzCodeMsg')));
    // Lernende tritt mit Code bei (Grundstufe ist bestanden)
    await p.click('#xzJoin button'); await p.waitForSelector('#xsConfirm'); await p.check('#xsConfirm');
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

  /* ================= C: Wegweiser (Auftrag 06.10.2026) ================= */
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); const { addUser, addClass } = await attachSite(ctx);
    const tid = await addUser('frau.weg', 'lehrerin-1', 'teacher'); const cid = addClass('WW 1', tid, 'WEGWEI'); await addUser('wegfuchs', 'geheim1', 'student', cid);
    const p = await ctx.newPage(); watch(p, 'Wegweiser');
    const cards = async () => p.$$eval('.ww-card', l => l.map(c => c.dataset.id));
    const has = (l, id) => l.includes(id);
    // ohne Konto: Menüpunkt nach Halle, Knopf in der Halle, erste Frage genau einmal
    await p.goto(SITE + '/'); await p.waitForSelector('.gates'); await p.waitForTimeout(400);
    const nav0 = await p.$$eval('#topnav a', l => l.map(a => a.textContent));
    if (nav0[1] !== 'Wegweiser') errors.push('Wegweiser: Menüpunkt nicht direkt nach Halle: ' + nav0.join(','));
    if (!await p.$('.ww-quick a[href="#/wegweiser"]')) errors.push('Wegweiser: Knopf in der Halle fehlt');
    await p.waitForTimeout(600);
    if (!await p.$('#dqTourAsk')) errors.push('Wegweiser: erste Frage erscheint nicht');
    else { await p.click('#dqtAskNo'); await p.goto(SITE + '/#/anleitung'); await p.waitForTimeout(200); await p.goto(SITE + '/#/'); await p.waitForTimeout(900); if (await p.$('#dqTourAsk')) errors.push('Wegweiser: Frage erscheint nach «Nein danke» erneut'); }
    await p.goto(SITE + '/#/wegweiser'); await p.waitForSelector('.ww-page'); await p.screenshot({ path: shots + '/p11_wegweiser_gast.png', fullPage: true });
    if (!/^Hier findest du alle Bereiche von DigitalQuest und wofür du sie brauchst\./.test((await p.textContent('.ww-page .lead')).trim())) errors.push('Wegweiser: Untertitel nicht nach Testlauf 2 (3.5): ' + await p.textContent('.ww-page .lead'));
    let c = await cards();
    if (!has(c, 'anmelden') || !has(c, 'halle') || !has(c, 'tor-labor') || !has(c, 'karte') || !has(c, 'oszilloskop')) errors.push('Wegweiser Gast: Karten fehlen: ' + c.join(','));
    if (has(c, 'leitstand') || has(c, 'admin') || has(c, 'live')) errors.push('Wegweiser Gast: Dozenten-/Admin-/Lernenden-Karten sichtbar');
    if (await p.$$eval('.ww-card.locked .ww-lock', l => l.length) < 3) errors.push('Wegweiser Gast: «nach dem Anmelden» fehlt bei Konto-Funktionen');
    if (!/Konto\?|Wie bekomme ich ein Konto/.test(await p.textContent('.ww-wege'))) errors.push('Wegweiser Gast: Häufige Wege ohne Konto-Frage');
    // Suche filtert
    await p.fill('#wwSearch', 'Oszilloskop'); await p.waitForTimeout(150); c = await cards();
    if (!has(c, 'oszilloskop') || has(c, 'halle') || c.length > 5) errors.push('Wegweiser: Suche filtert nicht: ' + c.join(','));
    await p.fill('#wwSearch', ''); await p.waitForTimeout(150);
    // jeder «Öffnen»-Link mit Portal-Adresse führt zu einer Seite mit Inhalt
    const hrefs = await p.$$eval('a.ww-open[href^="#/"]', l => [...new Set(l.map(a => a.getAttribute('href')))]);
    for (const h of hrefs) { await p.goto(SITE + '/' + h); await p.waitForTimeout(250); const txt = (await p.textContent('#view')).trim(); if (txt.length < 20 && !/login|code/.test(h)) errors.push('Wegweiser: Link ' + h + ' führt zu leerer Seite'); }
    const labs = await p.evaluate(() => [...document.querySelectorAll('a.ww-open[href^="labor/"]')].length);
    // Rundgang Portal: läuft bis zum Ende, Tastatur, Esc beendet
    await p.goto(SITE + '/#/wegweiser'); await p.waitForSelector('#wwTourPortal'); await p.click('#wwTourPortal'); await p.waitForTimeout(200);
    if (!await p.isVisible('#dqTour .dqt-card')) errors.push('Wegweiser: Rundgang startet nicht');
    else {
      const total = +((await p.textContent('#dqtStep')).match(/von (\d+)/) || [])[1];
      if (!(total >= 6)) errors.push('Wegweiser: Rundgang hat zu wenige Schritte: ' + total);
      if (!/Halle/.test(await p.textContent('#dqtTitle'))) errors.push('Wegweiser: erster Schritt ist nicht die Halle');
      await p.screenshot({ path: shots + '/p12_rundgang.png' });
      for (let i = 1; i < total; i++) await p.keyboard.press('ArrowRight');
      if (!/Fertig/.test(await p.textContent('#dqtNext'))) errors.push('Wegweiser: letzter Schritt zeigt nicht «Fertig»');
      await p.keyboard.press('Enter'); await p.waitForTimeout(100);
      if (await p.isVisible('#dqTour .dqt-card')) errors.push('Wegweiser: Rundgang endet nicht mit Fertig');
      await p.click('#wwTourPortal'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      if (await p.isVisible('#dqTour .dqt-card')) errors.push('Wegweiser: Esc beendet den Rundgang nicht');
    }
    // Lernende
    await loginUi(p, 'wegfuchs', 'geheim1'); await p.goto(SITE + '/#/wegweiser'); await p.waitForSelector('.ww-page'); c = await cards();
    if (!has(c, 'live') || !has(c, 'zertifikate') || !has(c, 'avatar') || !has(c, 'konto') || has(c, 'leitstand') || has(c, 'anmelden') || has(c, 'admin')) errors.push('Wegweiser Lernende: falsche Karten: ' + c.join(','));
    if (await p.$('.ww-card.locked')) errors.push('Wegweiser Lernende: gesperrte Karten sichtbar');
    if (!/Vorgaben/.test(await p.textContent('.ww-wege'))) errors.push('Wegweiser Lernende: Häufiger Weg «Vorgaben» fehlt');
    await p.screenshot({ path: shots + '/p13_wegweiser_lernende.png', fullPage: true });
    await p.click('#logoutBtn').catch(() => {}); await p.evaluate(() => fetch('/api/logout', { method: 'POST', headers: { 'x-dquest': '1', 'content-type': 'application/json' }, body: '{}' }));
    // Dozentin
    await loginUi(p, 'frau.weg', 'lehrerin-1'); await p.goto(SITE + '/#/wegweiser'); await p.waitForSelector('.ww-page'); c = await cards();
    if (!has(c, 'leitstand') || !has(c, 'meldungen') || !has(c, 'zertifikate') || has(c, 'live') || has(c, 'admin')) errors.push('Wegweiser Dozent: falsche Karten: ' + c.join(','));
    if (!/Klasse an/.test(await p.textContent('.ww-wege'))) errors.push('Wegweiser Dozent: Häufiger Weg «Klasse anlegen» fehlt');
    await p.evaluate(() => fetch('/api/logout', { method: 'POST', headers: { 'x-dquest': '1', 'content-type': 'application/json' }, body: '{}' }));
    // Admin
    await loginUi(p, 'chef', 'admin-test'); await p.goto(SITE + '/#/wegweiser'); await p.waitForSelector('.ww-page'); c = await cards();
    if (!has(c, 'admin') || !has(c, 'leitstand') || has(c, 'zertifikate') || has(c, 'live')) errors.push('Wegweiser Admin: falsche Karten: ' + c.join(','));
    // Handy 390 px
    const m = await ctx.newPage(); watch(m, 'Wegweiser mobil'); await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(SITE + '/#/wegweiser'); await m.waitForSelector('.ww-page'); await m.waitForTimeout(300);
    if (await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errors.push('Wegweiser mobil: horizontaler Scroll');
    if (await m.$$eval('.ww-cards', l => l.some(g => getComputedStyle(g).gridTemplateColumns.split(' ').length > 1))) errors.push('Wegweiser mobil: mehr als eine Spalte');
    await m.click('#wwTourPortal'); await m.waitForTimeout(200);
    if (!await m.isVisible('#dqTour .dqt-card')) errors.push('Wegweiser mobil: Rundgang startet nicht (Menü eingeklappt → Karten)');
    await m.keyboard.press('Escape'); await m.screenshot({ path: shots + '/p14_wegweiser_handy.png' });
    await ctx.close();
  }

  /* ================= D: Station zurücksetzen (Leitstand, Auftrag 16.10.2026) ================= */
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); const site = await attachSite(ctx), R = site.env.DB.raw;
    const tA = await site.addUser('frau.reset', 'lehrerin-1', 'teacher'), tB = await site.addUser('herr.andere', 'lehrer-2', 'teacher');
    const cA = site.addClass('RS 1', tA, 'RESET1'); site.addClass('RS 2', tB, 'RESET2');
    const sid = await site.addUser('resetfuchs', 'geheim1', 'student', cA);
    const T0 = Date.now() - 86400000;
    const st0 = { version: 1, created: T0, profile: { id: 'r1' }, done: { '1.1': true, '1.6': true, T1A: true }, doneInfo: { '1.1': { at: T0, tries: 1, hints: 0, stars: 3 }, '1.6': { at: T0, tries: 4, hints: 0, stars: 1, solution: true } },
      marks: { '1.6': { solution: true, t: T0 } }, drafts: { '1.6': { layout: { parts: [], wires: [] }, answers: { i: '21' }, t: T0, sol: true } }, theory: { T1A: { best: 1 } }, events: [], settings: { theme: 'dark' } };
    R.prepare('INSERT INTO progress (user_id, quest, state, summary, updated_at) VALUES (?, ?, ?, ?, ?)').run(sid, 'dq', JSON.stringify(st0), JSON.stringify({ done: ['1.1', '1.6', 'T1A'] }), T0);
    const state = () => JSON.parse(R.prepare('SELECT state FROM progress WHERE user_id = ?').get(sid).state);
    const p = await ctx.newPage(); watch(p, 'Station zurücksetzen');
    const post = (pg, station) => pg.evaluate(([id, s]) => fetch('/api/students/' + id + '/progress/dq/reset', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: JSON.stringify({ station: s }) }).then(r => r.status), [sid, station]);
    // Lehrperson der eigenen Klasse: Knopf in der Detailansicht, mit Rückfrage
    await loginUi(p, 'frau.reset', 'lehrerin-1'); await p.goto(SITE + '/#/leitstand/schueler/' + sid); await p.waitForSelector('[data-task="1.6"]');
    await p.click('[data-task="1.6"]'); await p.waitForSelector('#dlgActions');
    const btns = await p.$$eval('#dlgActions button', l => l.map(b => b.textContent));
    if (!btns.includes('Station zurücksetzen')) errors.push('Reset: Knopf «Station zurücksetzen» fehlt: ' + btns.join(','));
    else {
      await p.click('#dlgActions button.dan'); await p.waitForSelector('#dlgTitle'); await p.waitForTimeout(100);
      if (!/Station zurücksetzen\?/.test(await p.textContent('#dlgTitle'))) errors.push('Reset: keine Rückfrage');
      if (!/Sterne und Coins dieser Station werden entfernt und können durch erneutes Lösen wieder verdient werden\./.test(await p.textContent('#dlgBody'))) errors.push('Reset: Rückfrage nennt die Folgen für Sterne und Coins nicht');
      await p.click('#dlgActions button:has-text("Abbrechen")'); await p.waitForTimeout(150);
      if (!state().done['1.6']) errors.push('Reset: «Abbrechen» hat trotzdem zurückgesetzt');
      await p.click('[data-task="1.6"]'); await p.waitForSelector('#dlgActions button.dan'); await p.click('#dlgActions button.dan'); await p.waitForTimeout(100);
      await p.click('#dlgActions button:has-text("Zurücksetzen")'); await p.waitForTimeout(400);
      const s1 = state(), ev = (s1.events || []).find(e => e.type === 'station_reset' && e.id === '1.6');
      if (s1.done['1.6'] || s1.doneInfo['1.6'] || (s1.marks || {})['1.6'] || (s1.drafts || {})['1.6'] || !(s1.resets || {})['1.6']) errors.push('Reset 1.6: Stand nicht zurückgesetzt: ' + JSON.stringify({ done: s1.done, marks: s1.marks, resets: s1.resets }));
      if (!ev || ev.by !== 'frau.reset') errors.push('Reset: Ereignis station_reset fehlt oder ohne Lehrperson');
      if (!s1.done['1.1'] || s1.doneInfo['1.1'].stars !== 3) errors.push('Reset: andere Station verändert');
      if (!/1\.6 zurückgesetzt/.test(await p.textContent('#toast').catch(() => ''))) errors.push('Reset: keine Bestätigung');
      if (await p.$eval('[data-task="1.6"]', b => /s\d/.test(b.className))) errors.push('Reset: Detailansicht zeigt 1.6 noch als gelöst');
    }
    // Theorie-Station
    await p.click('[data-th="T1A"]'); await p.waitForSelector('#dlgActions button.dan'); await p.click('#dlgActions button.dan'); await p.waitForTimeout(100); await p.click('#dlgActions button:has-text("Zurücksetzen")'); await p.waitForTimeout(400);
    if (state().done.T1A || state().theory.T1A) errors.push('Reset: Theorie T1A nicht zurückgesetzt');
    await p.screenshot({ path: shots + '/p15_station_reset.png' });
    await p.evaluate(() => fetch('/api/logout', { method: 'POST', headers: { 'x-dquest': '1', 'content-type': 'application/json' }, body: '{}' }));
    // Lehrperson einer anderen Klasse und Lernende: nicht erlaubt; Admin: erlaubt
    await loginUi(p, 'herr.andere', 'lehrer-2'); if (await post(p, '1.1') !== 404) errors.push('Reset: Lehrperson einer anderen Klasse darf zurücksetzen');
    await p.evaluate(() => fetch('/api/logout', { method: 'POST', headers: { 'x-dquest': '1', 'content-type': 'application/json' }, body: '{}' }));
    await loginUi(p, 'resetfuchs', 'geheim1'); if (await post(p, '1.1') !== 403) errors.push('Reset: Lernende dürfen zurücksetzen');
    // Gerät der lernenden Person war offline und hat 1.6 noch als gelöst: Abgleich bringt die Station nicht zurück, neue Lösung zählt wieder
    const sy = await p.evaluate(() => fetch('/api/progress/dq', { credentials: 'same-origin' }).then(r => r.json()));
    const old = Object.assign({}, st0, { done: Object.assign({}, st0.done, { '1.2': true }), doneInfo: Object.assign({}, st0.doneInfo, { '1.2': { at: Date.now(), tries: 1, hints: 0, stars: 3 } }) });
    await p.goto(SITE + '/labor/'); await p.waitForTimeout(300);
    await p.evaluate(([st, base]) => { localStorage.setItem('digitalquest_state_v1', JSON.stringify(st)); localStorage.setItem('dquest_sync_dq', JSON.stringify({ user: 'resetfuchs', base: base - 1, dirty: true, role: 'student' })); }, [old, sy.updatedAt]);
    await p.reload(); await p.waitForTimeout(4500);
    const loc = await p.evaluate(() => ({ d16: !!DigitalQuest.state.done['1.6'], m16: !!(DigitalQuest.state.marks || {})['1.6'], d12: !!DigitalQuest.state.done['1.2'] })), s2 = state();
    if (loc.d16 || loc.m16 || s2.done['1.6']) errors.push('Reset: Gerät mit altem Stand bringt 1.6 zurück: ' + JSON.stringify(loc));
    if (!loc.d12 || !s2.done['1.2']) errors.push('Reset: Fortschritt des Geräts (1.2) geht beim Abgleich verloren');
    await p.evaluate(() => fetch('/api/logout', { method: 'POST', headers: { 'x-dquest': '1', 'content-type': 'application/json' }, body: '{}' }));
    await loginUi(p, 'chef', 'admin-test'); if (await post(p, '1.1') !== 200 || state().done['1.1']) errors.push('Reset: Admin darf nicht zurücksetzen');
    await ctx.close();
  }

  await browser.close();
  if (errors.length) { console.log('FEHLER:\n' + errors.join('\n')); process.exit(1); }
  console.log('Portal-Durchlauf OK');
})().catch(e => { console.error(e); process.exit(1); });

// Testlauf 2 (Auftrag 16.10.2026), Phase 0 – Reproduktionen im Browser (Labor-Einzeldatei): node tests/testlauf2_befund.js
// Screenshots in tests/shots/testlauf2/. Druckt je Meldung den Befund.
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const url = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/') + '?alle';
const SH = path.join(__dirname, 'shots', 'testlauf2'); fs.mkdirSync(SH, { recursive: true });
const out = (k, v) => console.log('[' + k + ']', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const browser = await chromium.launch();
  const newPage = async (vp) => { const p = await browser.newPage({ viewport: vp || { width: 1440, height: 900 } }); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.evaluate(() => { DigitalQuest.state.settings.tourAsked = true; }); await p.waitForTimeout(200); if (await p.$('#dqTourAsk')) await p.click('#dqtAskNo'); return p; };
  const res = p => p.evaluate(() => [...document.querySelectorAll('#results li')].map(l => l.textContent.trim()).join(' | '));
  const stars = (p, id) => p.evaluate(i => { const d = DigitalQuest.state.doneInfo[i]; return d ? { stars: d.stars, solution: !!d.solution, revealed: d.revealed || 0, tries: d.tries } : null; }, id);

  if (!process.argv.includes('--rest')) {
  // ===== 1 · 1.6 Strommessung =====
  for (const variant of ['A1 in Reihe', 'Multimeter in der Lücke']) {
    for (const val of ['21,3', '21', '0,0213']) {
      const p = await newPage(); const pin = id => p.click(`#board [data-pin="${id}"] .pinhit`, { force: true });
      await p.evaluate(() => { delete DigitalQuest.state.drafts['1.6']; DigitalQuest.openItem('1.6'); DigitalQuest.setView('schema'); }); await p.waitForTimeout(150);
      await p.click('[data-add="resistor"]'); await p.fill('[data-prop="value"]', '470'); await p.press('[data-prop="value"]', 'Enter'); await p.dispatchEvent('[data-prop="value"]', 'change');
      await pin('B1.p'); await pin('R1.a');
      if (variant === 'A1 in Reihe') { await p.click('[data-add="ammeter"]'); await pin('R1.b'); await pin('A1.a'); await pin('A1.b'); await pin('B1.n'); }
      else { await p.click('[data-mm="A"]'); await pin('R1.b'); await pin('B1.n'); }
      await p.waitForTimeout(150); const lcd = (await p.textContent('#lcd')).trim();
      await p.fill('[data-ans="i"]', val); await p.click('#btnCheck'); await p.waitForTimeout(150);
      const won = await p.isVisible('#modal.open .win');
      out('1.6 Schaltplan · ' + variant + ' · Eingabe ' + val, { anzeige: lcd, bestanden: won, ergebnis: await res(p) });
      if (val === '21,3') await p.screenshot({ path: path.join(SH, '1_6_' + (variant[0] === 'A' ? 'A1' : 'luecke') + '.png') });
      await p.close();
    }
  }
  { // Werkbank: Multimeter in der Lücke (Spitzen über den Kern gesetzt wie beim Ziehen)
    const p = await newPage();
    await p.evaluate(() => { delete DigitalQuest.state.drafts['1.6']; DigitalQuest.openItem('1.6'); }); await p.waitForTimeout(150);
    await p.evaluate(() => { const L = DigitalQuest.core.layout; L.parts.push({ id: 'R1', type: 'resistor', value: 470, x: 400, y: 300, rot: 90, props: {}, bench: { x: 620, y: 380, rot: 90 } }); L.wires.push({ from: 'B1.p', to: 'R1.a' }); DigitalQuest.core.changed('add'); DigitalQuest.setView('bench'); });
    await p.click('[data-mm="A"]'); await p.evaluate(() => { const c = DigitalQuest.core; c.probes = { a: 'R1.b', b: 'B1.n' }; c.changed('probe'); }); await p.waitForTimeout(200);
    const lcd = (await p.textContent('#lcd')).trim(); await p.fill('[data-ans="i"]', '21,3'); await p.click('#btnCheck'); await p.waitForTimeout(150);
    out('1.6 Werkbank · Multimeter in der Lücke · 21,3', { anzeige: lcd, bestanden: await p.isVisible('#modal.open .win'), ergebnis: await res(p) });
    await p.screenshot({ path: path.join(SH, '1_6_werkbank_luecke.png') }); await p.close();
  }

  // ===== 2 · 2.1 Löschen =====
  {
    const p = await newPage(); const pin = id => p.click(`#board [data-pin="${id}"] .pinhit`, { force: true });
    await p.evaluate(() => { delete DigitalQuest.state.drafts['2.1']; DigitalQuest.openItem('2.1'); DigitalQuest.setView('bench'); }); await p.waitForTimeout(150);
    for (let k = 0; k < 6; k++) { await p.click('[data-add="resistor"]'); await p.waitForTimeout(60); }
    const placed = await p.evaluate(() => DigitalQuest.core.layout.parts.filter(q => q.type === 'resistor').map(q => q.id + '@' + (q.bench ? q.bench.x + ',' + q.bench.y : '-')));
    // R5 per Taste Entf, R6 per Knopf «Löschen»
    await p.evaluate(() => { DigitalQuest.core.sel = 'R5'; }); await p.keyboard.press('Delete'); await p.waitForTimeout(80);
    await p.evaluate(() => { DigitalQuest.core.sel = 'R6'; }); await p.click('#btnDel'); await p.waitForTimeout(80);
    await p.evaluate(() => DigitalQuest.setView('schema')); await p.waitForTimeout(100);
    for (const [a, b] of [['B1.p', 'R1.a'], ['R1.b', 'R2.a'], ['R2.b', 'R3.a'], ['R3.b', 'R4.a'], ['R4.b', 'B1.n']]) { await pin(a); await pin(b); }
    const after = await p.evaluate(() => { const L = DigitalQuest.core.layout; return { parts: L.parts.map(q => q.id), wires: L.wires.map(w => w.from + '-' + w.to), probes: DigitalQuest.core.probes }; });
    const ex = await p.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId['2.1'], DigitalQuest.core.layout));
    for (const k of Object.keys(ex)) await p.fill(`[data-ans="${k}"]`, String(ex[k]).replace('.', ','));
    await p.click('#btnCheck'); await p.waitForTimeout(150);
    out('2.1 sechs Widerstände, R5 (Entf) und R6 (Knopf) gelöscht', { gesetzt: placed, nachLoeschen: after, bestanden: await p.isVisible('#modal.open .win'), ergebnis: await res(p), fehler: p.errs });
    await p.screenshot({ path: path.join(SH, '2_1_loeschen.png') }); await p.close();
  }
  { // 2.1 mit gestapelten (nicht sichtbaren) Widerständen: 10 × Palette auf der Werkbank, dann nur 4 verdrahten
    const p = await newPage(); const pin = id => p.click(`#board [data-pin="${id}"] .pinhit`, { force: true });
    await p.evaluate(() => { delete DigitalQuest.state.drafts['2.1']; DigitalQuest.openItem('2.1'); DigitalQuest.setView('bench'); }); await p.waitForTimeout(150);
    for (let k = 0; k < 10; k++) { await p.click('[data-add="resistor"]'); await p.waitForTimeout(40); }
    await p.evaluate(() => DigitalQuest.setView('schema')); await p.waitForTimeout(100);
    for (const [a, b] of [['B1.p', 'R1.a'], ['R1.b', 'R2.a'], ['R2.b', 'R3.a'], ['R3.b', 'R4.a'], ['R4.b', 'B1.n']]) { await pin(a); await pin(b); }
    await p.click('#btnCheck'); await p.waitForTimeout(150);
    out('2.1 zehn Widerstände gesetzt, vier verdrahtet', { ergebnis: (await res(p)).slice(0, 400) });
    await p.close();
  }

  // ===== 5 · 16.8 Lösung ansehen → Neu → volle Sterne =====
  {
    const p = await newPage();
    await p.evaluate(() => { delete DigitalQuest.state.drafts['16.8']; delete DigitalQuest.state.done['16.8']; delete DigitalQuest.state.doneInfo['16.8']; DigitalQuest.openItem('16.8'); }); await p.waitForTimeout(200);
    await p.click('#btnCheck'); await p.waitForTimeout(80); await p.click('#btnCheck'); await p.waitForTimeout(150);
    const solBtn = !!(await p.$('#btnSol')); if (solBtn) { await p.click('#btnSol'); await p.waitForTimeout(150); }
    const fill = async () => { const ex = await p.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId['16.8'], DQ.byId['16.8'].ref)); for (const k of Object.keys(ex)) await p.fill(`[data-ans="${k}"]`, String(ex[k])); await p.click('#btnCheck'); await p.waitForTimeout(150); };
    await fill(); const s1 = await stars(p, '16.8'); await p.evaluate(() => { const m = document.querySelector('#modal'); if (m) m.classList.remove('open'); });
    await p.click('#btnReset'); await p.waitForTimeout(80); await p.click('#modal .btn.primary'); await p.waitForTimeout(150);
    await fill(); const s2 = await stars(p, '16.8');
    const sum = await p.evaluate(() => DigitalQuest.summary ? DigitalQuest.summary() : null);
    out('16.8 nach Lösungsansicht', { loesungsKnopf: solBtn, ersterDurchgang: s1, nachNeuUndNochmal: s2, punkte: sum && sum.points });
    await p.close();
  }
  { // ohne Messprotokoll: 1.1 mit Lösungsansicht
    const p = await newPage(); const pin = id => p.click(`#board [data-pin="${id}"] .pinhit`, { force: true });
    await p.evaluate(() => { delete DigitalQuest.state.drafts['1.1']; delete DigitalQuest.state.done['1.1']; delete DigitalQuest.state.doneInfo['1.1']; DigitalQuest.openItem('1.1'); }); await p.waitForTimeout(150);
    await p.click('#btnCheck'); await p.waitForTimeout(80); await p.click('#btnCheck'); await p.waitForTimeout(150);
    if (await p.$('#btnSol')) { await p.click('#btnSol'); await p.waitForTimeout(150); }
    const build = async () => { await p.click('[data-add="switch"]'); await p.click('[data-add="lamp"]'); await pin('B1.p'); await pin('S1.a'); await pin('S1.b'); await pin('H1.a'); await pin('H1.b'); await pin('B1.n'); await p.click('[data-part="S1"] .hit', { force: true }); await p.click('#btnCheck'); await p.waitForTimeout(150); };
    await build(); const s1 = await stars(p, '1.1'); await p.evaluate(() => { document.querySelector('#modal').classList.remove('open'); });
    await p.click('#btnReset'); await p.waitForTimeout(80); await p.click('#modal .btn.primary'); await p.waitForTimeout(150);
    await build(); const s2 = await stars(p, '1.1');
    out('1.1 (ohne Protokoll) nach Lösungsansicht', { ersterDurchgang: s1, nachNeu: s2 });
    await p.close();
  }

  // ===== 6 · Sterne nach Neuladen (Einzeldatei) =====
  {
    const p = await newPage(); const pin = id => p.click(`#board [data-pin="${id}"] .pinhit`, { force: true });
    await p.evaluate(() => { delete DigitalQuest.state.drafts['1.1']; delete DigitalQuest.state.done['1.1']; delete DigitalQuest.state.doneInfo['1.1']; DigitalQuest.openItem('1.1'); }); await p.waitForTimeout(150);
    await p.click('[data-add="switch"]'); await p.click('[data-add="lamp"]'); await pin('B1.p'); await pin('S1.a'); await pin('S1.b'); await pin('H1.a'); await pin('H1.b'); await pin('B1.n'); await p.click('[data-part="S1"] .hit', { force: true });
    await p.click('#btnCheck'); await p.waitForTimeout(800);
    const a = await stars(p, '1.1'); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(400); const b = await stars(p, '1.1');
    const tile = await p.evaluate(() => { const n = document.querySelector('[data-open="1.1"] .nstars'); return n ? n.getAttribute('title') : null; });
    out('Sterne 1.1 Einzeldatei: gelöst / nach Neuladen / Kachel', { a, b, tile });
    // Messaufgabe mit mehreren Prüfungen: Werte einzeln korrigiert
    await p.evaluate(() => { delete DigitalQuest.state.drafts['W1']; delete DigitalQuest.state.done['W1']; delete DigitalQuest.state.doneInfo['W1']; DigitalQuest.openItem('W1'); }); await p.waitForTimeout(150);
    const ex = await p.evaluate(() => DigitalQuest.engine.expectedAnswers(DQ.byId.W1, DQ.byId.W1.ref)); const ks = Object.keys(ex);
    await p.fill(`[data-ans="${ks[0]}"]`, String(ex[ks[0]])); await p.click('#btnCheck'); await p.waitForTimeout(100);
    for (const k of ks) await p.fill(`[data-ans="${k}"]`, String(ex[k])); await p.click('#btnCheck'); await p.waitForTimeout(150);
    out('Sterne W1 (zuerst ein Wert, dann alle)', await stars(p, 'W1'));
    await p.close();
  }

  // ===== 7 · Freie Werkbank: Stapeln und Statuszeile =====
  {
    const p = await newPage();
    await p.evaluate(() => { delete DigitalQuest.state.drafts.sandbox; DigitalQuest.openItem('sandbox'); DigitalQuest.setView('bench'); }); await p.waitForTimeout(200);
    const st0 = (await p.textContent('#statusbar')).trim();
    for (let k = 0; k < 63; k++) { await p.click('[data-add="switch"]'); }
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const ps = DigitalQuest.core.layout.parts.filter(q => q.type === 'switch'); const key = q => q.bench ? q.bench.x + ',' + q.bench.y : '?'; const pos = {}; ps.forEach(q => { pos[key(q)] = (pos[key(q)] || 0) + 1; }); const top = Object.entries(pos).sort((a, b) => b[1] - a[1]).slice(0, 3); return { anzahl: ps.length, letzteId: ps[ps.length - 1].id, orte: Object.keys(pos).length, haeufigsterOrt: top }; });
    const st1 = (await p.textContent('#statusbar')).trim();
    out('Freie Werkbank 63 × Schalter', Object.assign(r, { statusLeer: st0, statusMitSchaltern: st1 }));
    await p.screenshot({ path: path.join(SH, 'freie_werkbank_63.png') }); await p.close();
  }

  // ===== 8 · W1 nach einer Oszilloskop-Aufgabe =====
  {
    const p = await newPage();
    await p.evaluate(() => { DigitalQuest.openItem('16.7'); DigitalQuest.setView('bench'); const c = DigitalQuest.core; c.scopeProbes.tip = 'R1.a'; c.scopeProbes.gnd = 'G1.n'; c.scopeProbes.tip2 = 'R1.b'; c.redraw(); }); await p.waitForTimeout(150);
    await p.selectOption('#tb', '0.1'); await p.click('#btnScope'); await p.waitForTimeout(250);
    await p.click('#scopeCh [data-ch="3"]'); await p.click('#scopeCpl [data-cpl="1"]'); await p.click('#scopeCh [data-ch="2"]'); await p.waitForTimeout(200);
    const vorher = await p.evaluate(() => ({ tb: document.getElementById('tb').value, info: document.getElementById('scopeInfo').textContent.slice(0, 80), cpl: document.querySelector('#scopeCpl [data-cpl="1"]').textContent, math: document.querySelector('#scopeCh [data-ch="3"]').classList.contains('on'), ch2: document.querySelector('#scopeCh [data-ch="2"]').classList.contains('on') }));
    await p.evaluate(() => { DigitalQuest.openItem('W1'); DigitalQuest.setView('bench'); }); await p.waitForTimeout(250);
    const nachher = await p.evaluate(() => ({ tb: document.getElementById('tb').value, info: document.getElementById('scopeInfo').textContent.slice(0, 80), cpl: document.querySelector('#scopeCpl [data-cpl="1"]').textContent, math: document.querySelector('#scopeCh [data-ch="3"]').classList.contains('on'), ch2: document.querySelector('#scopeCh [data-ch="2"]').classList.contains('on'), sonden: DigitalQuest.core.scopeProbes, schirm: (DigitalQuest.bench && DigitalQuest.bench.scope) ? 'Kurve vom Vorgänger' : 'leer' }));
    out('W1 nach 16.7 (Oszilloskop geändert)', { vorher, nachher });
    await p.screenshot({ path: path.join(SH, 'w1_nach_16_7.png') }); await p.close();
  }

  }
  // ===== 9 · Handbuch: Seite «undefined» =====
  {
    const p = await newPage(); const found = [];
    await p.click('[data-go="manual"]'); await p.waitForTimeout(150);
    const pages = await p.$$eval('#scr-manual nav [data-man]', l => l.map(b => b.dataset.man));
    for (const id of pages) {
      await p.click(`#scr-manual nav [data-man="${id}"]`); await p.waitForTimeout(60);
      const links = await p.$$eval('#scr-manual article a, #scr-manual article [data-ww-go], #scr-manual article [data-go], #scr-manual article [data-man]', l => l.map(a => a.outerHTML.slice(0, 140)));
      if (/undefined/.test(await p.textContent('#scr-manual'))) found.push('Seite ' + id + ' enthält «undefined»');
      for (let i = 0; i < links.length; i++) {
        const els = await p.$$('#scr-manual article a, #scr-manual article [data-ww-go], #scr-manual article [data-go], #scr-manual article [data-man]'); if (!els[i]) continue;
        const href = await els[i].getAttribute('href'); if (href && /^https?:/.test(href)) continue;
        await els[i].click().catch(() => {}); await p.waitForTimeout(120);
        const txt = await p.evaluate(() => document.body.innerText); if (/undefined/.test(txt)) found.push(id + ' → ' + links[i] + ' → «undefined» (' + (await p.evaluate(() => location.hash)) + ')');
        await p.keyboard.press('Escape'); await p.evaluate(() => { if (window.DQCalc && DQCalc.isOpen) DQCalc.close(); }); await p.click('[data-go="manual"]').catch(() => {}); await p.waitForTimeout(80); await p.click(`#scr-manual nav [data-man="${id}"]`).catch(() => {}); await p.waitForTimeout(40);
      }
    }
    // Hash-Adressen, die in der App vorkommen
    for (const h of ['#/handbuch/werkstatt', '#/handbuch/undefined', '#werkstatt', '#/werkstatt']) { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(150); const txt = await p.evaluate(() => document.querySelector('.screen.active') ? document.querySelector('.screen.active').innerText.slice(0, 200) : ''); if (/undefined/.test(txt)) found.push(h + ' → «undefined»'); }
    out('Handbuch «undefined»', found.length ? found : 'nicht gefunden');
    await p.close();
  }

  // ===== 10 · Taschenrechner ziehen =====
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await newPage(vp);
    await p.click('#btnCalc'); await p.waitForTimeout(150);
    const box = await p.$eval('.calc-box', e => { const r = e.getBoundingClientRect(); return [r.x, r.y]; });
    const head = await p.$eval('.calc-head', e => { const r = e.getBoundingClientRect(); return [r.x + 30, r.y + 10]; });
    await p.mouse.move(head[0], head[1]); await p.mouse.down(); await p.mouse.move(head[0] - 150, head[1] + 120, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(100);
    const box2 = await p.$eval('.calc-box', e => { const r = e.getBoundingClientRect(); return [r.x, r.y]; });
    out('Taschenrechner ziehen ' + vp.width + ' px', { vorher: box.map(Math.round), nachher: box2.map(Math.round), verschoben: Math.abs(box2[0] - box[0]) > 5 });
    await p.close();
  }

  // ===== 11 · Pop-up an der Palette (7.3) =====
  {
    const p = await newPage();
    await p.evaluate(() => { delete DigitalQuest.state.drafts['7.3']; DigitalQuest.openItem('7.3'); DigitalQuest.setView('schema'); }); await p.waitForTimeout(200);
    const btns = await p.$$eval('#palette .palbtn', l => l.map(b => { const r = b.getBoundingClientRect(); return { t: b.dataset.add, x: r.x, y: r.y, w: r.width, h: r.height }; }));
    const b0 = btns[0], b1 = btns[1];
    await p.mouse.move(b0.x + b0.w / 2, b0.y + b0.h / 2); await p.waitForTimeout(300);
    const pop = await p.evaluate(() => { const e = document.getElementById('dsPop'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), pe: getComputedStyle(e).pointerEvents }; });
    const coversNext = pop && b1 && b1.x + b1.w / 2 > pop.x && b1.x + b1.w / 2 < pop.x + pop.w && b1.y + b1.h / 2 > pop.y && b1.y + b1.h / 2 < pop.y + pop.h;
    const boardTop = await p.$eval('#board', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 3, r.y + 60]; });
    const overBoard = pop && boardTop[0] > pop.x && boardTop[0] < pop.x + pop.w && boardTop[1] > pop.y && boardTop[1] < pop.y + pop.h;
    out('7.3 Palette-Pop-up', { palette: btns.map(b => b.t).join(','), popup: pop, verdecktNaechstenKnopf: !!coversNext, verdecktArbeitsflaeche: !!overBoard, verzoegerungMs: 120 });
    await p.screenshot({ path: path.join(SH, '7_3_popup.png') }); await p.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

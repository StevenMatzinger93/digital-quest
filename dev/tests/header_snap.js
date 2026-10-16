// Kopfzeilen (Testlauf 2, Phase 4): gemeinsamer Baustein src/header.css in allen Bereichen – Gleichheit der Masse/Schrift/Rahmen
// und Bildvergleich gegen tests/baseline/header/*.png (beide Themes, Desktop 1440 px und Handy 390 px).
// Bereiche: Portal (Gast), Labor-Karte, Aufgabe, Übungswerkstatt, Freie Werkbank, Live-Challenge (body.live-mode), Prüfung (body.exam-mode).
// Aufruf: node tests/header_snap.js [--update]   (--update schreibt neue Referenzbilder, nach bewusster Stiländerung)
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), BASE = path.join(__dirname, 'baseline', 'header'), UPDATE = process.argv.includes('--update');
fs.mkdirSync(BASE, { recursive: true });
const LAB = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'), PORTAL = 'file://' + path.join(ROOT, 'web', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FEHLER ' + m); } };
const AREAS = [
  { id: 'portal', url: PORTAL, prep: null },
  { id: 'karte', url: LAB, prep: () => { location.hash = '#/karte'; } },
  { id: 'aufgabe', url: LAB, prep: () => DigitalQuest.openItem('1.1') },
  { id: 'werkstatt', url: LAB, prep: () => DigitalQuest.openItem('W1') },
  { id: 'freie_werkbank', url: LAB, prep: () => DigitalQuest.openItem('sandbox') },
  { id: 'live', url: LAB, prep: () => { DigitalQuest.openItem('1.1'); document.body.classList.add('live-mode'); } },
  { id: 'pruefung', url: LAB, prep: () => { DigitalQuest.openItem('1.1'); document.body.classList.add('exam-mode'); } }
];
// Kennwerte der Kopfzeile: gleiche Höhe, Schrift, Abstände, Knopfstil, Logo-Position
const METRICS = () => {
  const h = document.querySelector('header.dq-hdr'); if (!h) return null;
  const cs = e => e ? getComputedStyle(e) : null, r = e => e ? e.getBoundingClientRect() : null;
  const brand = h.querySelector('.dq-brand'), logo = brand && brand.querySelector('svg'), nav = h.querySelector('.dq-nav'), navBtn = nav && [...nav.children].find(x => x.offsetParent && !x.classList.contains('active'));
  const hb = [...h.querySelectorAll('.dq-hbtn')].filter(x => x.offsetParent), chip = [...h.querySelectorAll('.dq-chip')].find(x => x.offsetParent);
  return { height: Math.round(r(h).height), bg: cs(h).backgroundImage, line: cs(h).borderBottomColor, font: cs(h).fontFamily.split(',')[0],
    brand: brand ? { left: Math.round(r(brand).left), font: cs(brand).fontSize + ' ' + cs(brand).fontWeight + ' ' + cs(brand).letterSpacing, logo: logo ? Math.round(r(logo).width) : 0 } : null,
    nav: navBtn ? { font: cs(navBtn).fontSize + ' ' + cs(navBtn).fontWeight, h: Math.round(r(navBtn).height), color: cs(navBtn).color } : null,
    hbtn: hb.map(b => ({ id: b.id, border: cs(b).borderTopColor, w: Math.round(r(b).width), h: Math.round(r(b).height), radius: cs(b).borderTopLeftRadius })),
    chip: chip ? { border: cs(chip).borderTopColor, h: Math.round(r(chip).height), radius: cs(chip).borderTopLeftRadius, font: cs(chip).fontSize } : null };
};
(async () => {
  const browser = await chromium.launch(); const errors = []; const rows = [];
  for (const theme of ['dark', 'light']) for (const vp of [{ width: 1440, height: 800 }, { width: 390, height: 844 }]) for (const a of AREAS) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 }); page.on('pageerror', e => errors.push(a.id + ': ' + e.message));
    await page.goto(a.url, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(250);
    await page.evaluate(t => { try { if (window.DigitalQuest) { DigitalQuest.state.settings.tourAsked = true; DigitalQuest.state.settings.theme = t; } document.documentElement.dataset.theme = t; document.querySelectorAll('#dqTourAsk,#dqTour').forEach(e => e.remove()); } catch (e) { /* Portal ohne Labor */ } }, theme);
    if (a.prep) await page.evaluate(a.prep); await page.waitForTimeout(200);
    await page.evaluate(() => { const s = document.getElementById('saveInd'); if (s) s.textContent = ''; const n = document.getElementById('netLed'); if (n) n.className = 'net-led'; });   // wechselnde Anzeigen neutral
    const m = await page.evaluate(METRICS); rows.push({ theme, w: vp.width, area: a.id, m });
    ok(!!m, a.id + ' ' + theme + ' ' + vp.width + ': Kopfzeile mit dem gemeinsamen Baustein (.dq-hdr)');
    if (m) {
      const el = await page.$('header.dq-hdr'), buf = await el.screenshot(), file = path.join(BASE, `${a.id}_${theme}_${vp.width}.png`);
      if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, buf); ok(true, 'Referenzbild ' + path.basename(file) + ' geschrieben'); }
      else {
        const diff = await page.evaluate(async ([x0, y0]) => {
          const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + src; });
          const [x, y] = await Promise.all([load(x0), load(y0)]); if (x.width !== y.width || x.height !== y.height) return 1;
          const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
          const p = px(x), q = px(y); let bad = 0; for (let k = 0; k < p.length; k += 4) if (Math.abs(p[k] - q[k]) + Math.abs(p[k + 1] - q[k + 1]) + Math.abs(p[k + 2] - q[k + 2]) > 60) bad++;
          return bad / (p.length / 4);
        }, [buf.toString('base64'), fs.readFileSync(file).toString('base64')]);
        ok(diff < 0.01, `Schnappschuss ${a.id} ${theme} ${vp.width}: ${(diff * 100).toFixed(2)} % abweichend`);
      }
      // Phase 4.2: Wegweiser- und Rechner-Knopf haben denselben Rahmen wie die übrigen Knöpfe der Kopfzeile, nie hell auf dunkel
      const borders = m.hbtn.map(b => b.border).concat(m.chip ? [m.chip.border] : []);
      const light = c => { const v = (c.match(/\d+/g) || []).slice(0, 3).map(Number); return v.length === 3 && v[0] + v[1] + v[2] > 450; };
      if (a.id !== 'portal') ok(m.hbtn.length === 2 && new Set(m.hbtn.map(b => b.border)).size === 1 && !borders.some(light), `${a.id} ${theme} ${vp.width}: Rahmen Wegweiser/Rechner gleich und nicht hell (${borders.join(' / ')})`);
    }
    await page.close();
  }
  // Gleichheit über alle Bereiche je Theme und Breite (Höhe, Hintergrund, Schrift, Logo, Navigation, Werkzeug-Knöpfe, Chip)
  for (const theme of ['dark', 'light']) for (const w of [1440, 390]) {
    const g = rows.filter(r => r.theme === theme && r.w === w && r.m), same = (f, label) => { const v = new Set(g.map(r => JSON.stringify(f(r.m))).filter(x => x !== 'null' && x !== undefined)); ok(v.size <= 1, `${theme} ${w}: ${label} gleich in allen Bereichen – ${[...v].join(' | ')}`); };
    same(m => m.height, 'Höhe'); same(m => m.bg, 'Hintergrund'); same(m => m.line, 'Trennlinie'); same(m => m.font, 'Schrift');
    same(m => m.brand && [m.brand.left, m.brand.font, m.brand.logo], 'Logo-Position und Schriftzug');
    same(m => m.nav && [m.nav.font, m.nav.h, m.nav.color], 'Navigation (Schrift, Höhe, Farbe)');
    same(m => m.chip && [m.chip.h, m.chip.radius, m.chip.font], 'Benutzer-Chip');
    same(m => m.hbtn.length ? [m.hbtn[0].w, m.hbtn[0].h, m.hbtn[0].radius] : null, 'Werkzeug-Knöpfe');
  }
  // Prüfung und Live-Challenge: bewusste Unterschiede (Navigation reduziert) bleiben
  const ex = rows.find(r => r.area === 'pruefung' && r.w === 1440), lv = rows.find(r => r.area === 'live' && r.w === 1440);
  ok(ex && lv, 'Prüfung und Live-Challenge gemessen');
  ok(!errors.length, 'keine JS-Fehler ' + errors.join(' | '));
  await browser.close();
  console.log(`Kopfzeilen: ${pass} bestanden, ${fail} fehlgeschlagen`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

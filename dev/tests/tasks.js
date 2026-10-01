// Jede Aufgabe in beiden Ansichten loesbar? node tests/tasks.js [id, z. B. 2.5, Kapitel, z. B. 2., oder Praefix, z. B. W* fuer die Uebungswerkstatt]
// Loest jede Aufgabe aus DQ.tasks einmal im Schaltplan und einmal auf der Werkbank – nur ueber die echte Bedienung:
// Bauteile aus der Palette, Werte im Eigenschaften-Panel, Leitungen per Klick auf Anschluesse, ueberzaehlige
// Leitungen anklicken + Entf, Messwerte mit dem Multimeter der jeweiligen Ansicht (Schema: Panel, Werkbank: Drehschalter),
// dann „Pruefen“. Vorlage ist die Referenzloesung (ref). Messungen ueber truth werden echt gemessen: Strom durch
// Auftrennen einer Leitung am Bauteil und Amperemeter in der Luecke, Spannung parallel zum Bauteil.
// Zusaetzlich: Bauteilkatalog – jedes Bauteil in beiden Ansichten hinzufuegen, alle Anschluesse anklicken, drehen,
// jede Eigenschaft im Panel einstellen.
// Aufgaben mit measureUX 'drag' werden auf der Werkbank mit gezogenen Messspitzen gemessen (Pointer-Drag von der
// Parkposition zur Buchse). Abschnitt „Bedienung“ (node tests/tasks.js bedienung): Ziehen, Fehlwurf, Klick ohne Wirkung,
// Oszilloskop-Tastkopf (Hinweis ohne Anschluss, Kurve mit Anschluss), OL bei zu kleinem Messbereich.
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const url = 'file://' + path.join(__dirname, '../../index.html') + '?alle';
const only = process.argv[2];
const PRE = { p: 1e-12, n: 1e-9, 'µ': 1e-6, u: 1e-6, m: 1e-3, '': 1, k: 1e3, M: 1e6 };
/* Klick wie mit der Maus, aber atomar im Browser (robust bei Live-Schleife mit 60 Bildern/s): Mitte des Elements
 * bestimmen, pruefen, dass dort wirklich dieses Element (bzw. sein data-Traeger) obenauf liegt, dann pointerdown/up. */
async function atomicClick(page, sel, key) {
  const r = await page.evaluate(([sel, key]) => {
    const el = document.querySelector(sel); if (!el) return 'fehlt: ' + sel;
    const q = el.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
    const svg = el.closest('svg'), box = svg ? svg.getBoundingClientRect() : null;
    if (box && (x < box.left || x > box.right || y < box.top || y > box.bottom)) return 'ausserhalb des Ausschnitts: ' + sel;
    const t = document.elementFromPoint(x, y); if (!t) return 'nichts getroffen: ' + sel;
    const want = key ? el.closest('[' + key + ']') : el, got = key ? t.closest('[' + key + ']') : t;
    if (key && (!got || got.getAttribute(key) !== want.getAttribute(key))) return 'verdeckt (' + (got ? key + '=' + got.getAttribute(key) : t.tagName + '.' + t.getAttribute('class')) + '): ' + sel;
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    const host = t.closest('svg') || document.body; // nach dem Neuzeichnen haengt t nicht mehr im Dokument (echte Maus: Pointer Capture am SVG)
    t.dispatchEvent(new PointerEvent('pointerdown', o)); (t.isConnected ? t : host).dispatchEvent(new PointerEvent('pointerup', o));
    return 'ok';
  }, [sel, key]);
  if (r !== 'ok') throw new Error(r);
}
/* Messspitze ziehen wie mit der Maus, atomar im Browser: pointerdown auf der geparkten Spitze (data-probe), pointermove
 * ueber der Buchse, pointerup dort – Ziel ist die Buchse unter dem Zeiger (Hit-Test der Werkbank). */
async function atomicDrag(page, which, pid) {
  const r = await page.evaluate(([which, pid]) => {
    const pr = document.querySelector('#bench [data-probe="' + which + '"] .bprobehit'), pin = document.querySelector('#bench [data-pin="' + pid + '"] .bpinhit'), svg = document.getElementById('bench');
    if (!pr) return 'Spitze fehlt: ' + which; if (!pin) return 'Buchse fehlt: ' + pid;
    const a = pr.getBoundingClientRect(), b = pin.getBoundingClientRect();
    const ev = (t, x, y) => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 });
    pr.dispatchEvent(ev('pointerdown', a.left + a.width / 2, a.top + a.height / 2));
    svg.dispatchEvent(ev('pointermove', (a.left + b.left) / 2, (a.top + b.top) / 2));
    svg.dispatchEvent(ev('pointermove', b.left + b.width / 2, b.top + b.height / 2));
    svg.dispatchEvent(ev('pointerup', b.left + b.width / 2, b.top + b.height / 2));
    const set = which === 'tip' || which === 'gnd' ? DigitalQuest.core.scopeProbes[which] : DigitalQuest.core.probes[which];
    return set === pid ? 'ok' : 'Spitze ' + which + ' liegt nicht an ' + pid + ' (' + set + ')';
  }, [which, pid]);
  if (r !== 'ok') throw new Error(r);
}
function lcdValue(txt) { // "4.008 mA" -> 0.004008 (Basiseinheit)
  const m = String(txt).trim().match(/^(-?[\d.]+)\s*([pnµumkM]?)/); return m ? +m[1] * PRE[m[2]] : NaN;
}

(async () => {
  const browser = await chromium.launch(); const errors = []; let runs = 0;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push('JS: ' + e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const tasks = await page.evaluate(() => window.DQ.tasks.map(t => ({ id: t.id, start: t.start, ref: t.ref, measure: t.measure, measureUX: t.measureUX, unitScale: DigitalQuest.engine.UNIT_SCALE,
    expected: DigitalQuest.engine.expectedAnswers(t, t.ref) })));

  for (const t of tasks.filter(x => only !== 'katalog' && only !== 'bedienung' && (!only || x.id === only || ((only.endsWith('.') && x.id.startsWith(only)) || (only.endsWith('*') && x.id.startsWith(only.slice(0, -1))))))) for (const view of ['schema', 'bench']) {
    const tag = t.id + ' [' + (view === 'bench' ? 'Werkbank' : 'Schaltplan') + ']', fail = m => errors.push(tag + ': ' + m);
    const svg = view === 'bench' ? '#bench' : '#board', hit = view === 'bench' ? '.bpinhit' : '.pinhit', whit = view === 'bench' ? '.bwirehit' : '.wirehit';
    const pin = id => atomicClick(page, `${svg} [data-pin="${id}"] ${hit}`, 'data-pin');
    runs++;
    try {
      await page.evaluate(([id, v]) => { delete DigitalQuest.state.drafts[id]; DigitalQuest.state.settings.view = v; DigitalQuest.openItem(id); DigitalQuest.setView(v); }, [t.id, view]);
      // 1. fehlende Bauteile aus der Palette, Eigenschaften im Panel setzen
      const startIds = new Set(t.start.parts.map(p => p.id)), map = {};
      const setProps = async (pid, props) => { // Werte so eintippen, wie eine Person es tut (100n, 4.7k)
        for (const [k, v] of Object.entries(props)) {
          if (k === 'closed') { if (v) await page.click('#tgl', { timeout: 3000 }); continue; }
          const sel = `#inspector [data-prop="${k}"]`;
          if (!await page.$(sel)) { fail(pid + ': Eigenschaft „' + k + '“ ist im Panel nicht einstellbar'); continue; }
          const tagName = await page.$eval(sel, el => el.tagName + (el.type ? ':' + el.type : ''));
          if (tagName.startsWith('SELECT')) await page.selectOption(sel, String(v));
          else if (tagName === 'INPUT:range') await page.$eval(sel, (el, x) => { el.value = x; el.dispatchEvent(new Event('input')); }, String(v));
          else {
            const txt = typeof v === 'number' && k !== 'offset' ? await page.evaluate(x => DQEditor.fmtVal(x), v) : String(v);
            await page.fill(sel, txt); await page.dispatchEvent(sel, 'change');
            if (await page.$eval(sel, el => el.classList.contains('bad'))) fail(pid + ': Eingabe „' + txt + '“ für ' + k + ' wird nicht angenommen');
          }
        }
      };
      for (const rp of t.ref.parts.filter(p => !startIds.has(p.id))) {
        await page.click(`[data-add="${rp.type}"]`, { timeout: 3000 });
        map[rp.id] = await page.evaluate(() => DigitalQuest.core.sel);
        const props = Object.assign({}, rp.props || {}); if (rp.value !== undefined) props.value = rp.value;
        await setProps(map[rp.id], props);
      }
      // Generatoren/Taktgeber aus dem Start, die in der Loesung anders eingestellt sind: anklicken und im Panel einstellen
      for (const rp of t.ref.parts.filter(p => startIds.has(p.id) && (p.type === 'acsource' || p.type === 'clock'))) {
        const sp = t.start.parts.find(p => p.id === rp.id), diff = {};
        Object.entries(rp.props || {}).forEach(([k, v]) => { if ((sp.props || {})[k] !== v) diff[k] = v; });
        if (rp.value !== undefined && rp.value !== sp.value) diff.value = rp.value;
        if (!Object.keys(diff).length) continue;
        await atomicClick(page, `${svg} [data-part="${rp.id}"] ${view === 'bench' ? '.bblock' : '.hit'}`, 'data-part');
        await setProps(rp.id, diff);
      }
      // Startbauteile, deren Schalterstellung in der Loesung anders ist: anklicken (Schalter/Taster schalten per Klick)
      for (const rp of t.ref.parts.filter(p => startIds.has(p.id))) {
        const sp = t.start.parts.find(p => p.id === rp.id);
        if (!!(rp.props || {}).closed !== !!(sp.props || {}).closed && (rp.type === 'switch' || rp.type === 'logicin'))
          await atomicClick(page, `${svg} [data-part="${rp.id}"] ${view === 'bench' ? '.bblock' : '.hit'}`, 'data-part');
      }
      const idOf = pid => { const [a, b] = pid.split('.'); return (map[a] || a) + '.' + b; };
      const key = w => [w.from, w.to].sort().join('|');
      const want = new Set(t.ref.wires.map(w => key({ from: idOf(w.from), to: idOf(w.to) })));
      // 2. Leitungen, die nicht zur Loesung gehoeren, anklicken und loeschen
      for (let guard = 0; guard < 50; guard++) {
        const idx = await page.evaluate(ws => DigitalQuest.core.layout.wires.findIndex(w => !ws.includes([w.from, w.to].sort().join('|'))), [...want]);
        if (idx < 0) break;
        await page.dispatchEvent(`${svg} [data-wire="${idx}"] ${whit}`, 'pointerdown'); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('Delete');
      }
      // 3. fehlende Leitungen: Anschluss anklicken, dann Ziel-Anschluss
      const have = new Set(await page.evaluate(() => DigitalQuest.core.layout.wires.map(w => [w.from, w.to].sort().join('|'))));
      for (const w of t.ref.wires) {
        const a = idOf(w.from), b = idOf(w.to);
        if (have.has([a, b].sort().join('|'))) continue;
        await pin(a); await pin(b); have.add([a, b].sort().join('|'));
      }
      const got = new Set(await page.evaluate(() => DigitalQuest.core.layout.wires.map(w => [w.from, w.to].sort().join('|'))));
      if (got.size !== want.size || [...want].some(k => !got.has(k))) fail('Leitungen nach dem Bauen weichen ab');
      // 4. Messprotokoll: mit dem Multimeter der Ansicht messen
      const dial = async mode => { if (view === 'bench') await atomicClick(page, `#bench [data-dial="${mode}"] .bdialhit`, 'data-dial'); else await page.click(`[data-mm="${mode}"]`); };
      const drag = view === 'bench' && t.measureUX === 'drag'; // neue Messtechnik-Aufgaben: Spitzen ziehen statt klicken
      const readMeter = async (m, mode, a, b) => {
        await dial(mode);
        if (drag) { await atomicDrag(page, 'a', a); await atomicDrag(page, 'b', b); } else { await pin(a); await pin(b); }
        const both = await page.evaluate(() => [document.getElementById('lcd').textContent, (document.querySelector('#bench .bmlcd') || {}).textContent]); // gleiches Bild
        const lcd = both[0], base = lcdValue(lcd);
        if (view === 'bench' && both[1] !== lcd) fail(m.id + ': Werkbank-Multimeter zeigt anderen Wert als das Panel (' + both[1] + ' / ' + lcd + ')');
        await dial('OFF');
        if (!isFinite(base)) { fail(m.id + ': Anzeige „' + lcd + '“ nicht ablesbar'); return NaN; }
        return Math.abs(base);
      };
      for (const m of t.measure) {
        let v = t.expected[m.id], base = NaN;
        if (m.set || m.value !== undefined || m.mode === 'AC') { /* veraenderter Zustand, Rechenwert oder Oszilloskop-Ablesung: Sollwert */ }
        else if (m.mode && m.a) {
          if (m.mode === 'VAC') await page.click(`[data-mt="${m.meterType === 'avg' ? 'avg' : 'trms'}"]`);
          base = await readMeter(m, m.mode, idOf(m.a), idOf(m.b));
        }
        else if (m.truth) {
          const part = idOf(m.truth.sel + '.x').split('.')[0];
          const pins = await page.evaluate(id => { const p = DigitalQuest.core.part(id); return p ? DigitalQuest.engine.PARTS[p.type].pins : []; }, part);
          if (m.truth.q === 'v') base = await readMeter(m, 'V', part + '.' + pins[0], part + '.' + pins[1]);
          else { // Strom wie im Labor: alle Leitungen an einem Anschluss des Bauteils loesen, deren Gegenseiten
            // untereinander verbinden, Amperemeter zwischen Anschluss und diesen Knoten, danach wieder anschliessen
            const plan = await page.evaluate(([id, pins]) => {
              const ws = DigitalQuest.core.layout.wires, best = pins.map(pn => id + '.' + pn).map(pid => ({ pid, other: ws.filter(w => w.from === pid || w.to === pid).map(w => w.from === pid ? w.to : w.from) }))
                .filter(x => x.other.length).sort((a, b) => a.other.length - b.other.length)[0];
              return best || null;
            }, [part, m.truth.pin ? [m.truth.pin] : pins]);
            if (!plan) fail(m.id + ': keine Leitung an ' + part + ' zum Auftrennen');
            else {
              for (let g = 0; g < 20; g++) { // alle Leitungen am Anschluss loeschen
                const wi = await page.evaluate(pid => DigitalQuest.core.layout.wires.findIndex(w => w.from === pid || w.to === pid), plan.pid);
                if (wi < 0) break;
                await page.dispatchEvent(`${svg} [data-wire="${wi}"] ${whit}`, 'pointerdown'); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('Delete');
              }
              for (const o of plan.other.slice(1)) { await pin(plan.other[0]); await pin(o); } // Gegenseiten bleiben verbunden
              base = await readMeter(m, 'A', plan.pid, plan.other[0]);
              await pin(plan.pid); await pin(plan.other[0]);
            }
          }
        }
        if (isFinite(base)) v = +(base / (t.unitScale[m.unit] || 1)).toPrecision(4);
        await page.fill(`[data-ans="${m.id}"]`, String(v));
      }
      // 5. Pruefen
      await page.click('#btnCheck', { force: true }); await page.waitForTimeout(120);
      if (await page.isVisible('#modal.open .win')) await page.click('#modal .modal-btns button:first-child');
      else fail('nicht bestanden: ' + (await page.textContent('#results')).replace(/\s+/g, ' ').slice(0, 300));
    } catch (e) { fail('Bedienung gescheitert: ' + e.message.split('\n')[0]); await page.screenshot({ path: path.join(__dirname, 'shots', 'fehler_' + t.id + '_' + view + '.png') }); }
  }
  // ===== Bauteilkatalog in beiden Ansichten (Freie Werkbank mit ?alle) =====
  const catalog = await page.evaluate(() => Object.keys(DigitalQuest.engine.PARTS).map(k => ({ type: k, pins: DigitalQuest.engine.PARTS[k].pins })));
  const FIELDS = { battery: ['value'], resistor: ['value'], lamp: ['value'], pot: ['value', 'pos'], capacitor: ['value'], clock: ['freq'], led: ['color'], acsource: ['value', 'freq', 'shape', 'offset'], switch: [], zener: ['vz'], npn: ['beta'], motor: ['value'] };
  // ===== Bedienung der Messgeraete (measureUX 'drag'): Ziehen, Tastkopf, Messbereich =====
  if (!only || only === 'bedienung') {
    const tag = 'Bedienung [Werkbank]', fail = m => errors.push(tag + ': ' + m);
    try {
      const id = await page.evaluate(() => { const t = window.DQ.tasks.find(x => x.measureUX === 'drag' && x.start.parts.some(p => p.type === 'battery' || p.type === 'acsource') && x.ref.wires.length) || window.DQ.byId['1.4'];
        t.measureUX = 'drag'; delete DigitalQuest.state.drafts[t.id]; DigitalQuest.openItem(t.id); DigitalQuest.setView('bench'); return t.id; });
      const ref = await page.evaluate(i => window.DQ.byId[i].ref, id), src = ref.parts.find(p => p.type === 'battery' || p.type === 'acsource');
      for (const w of ref.wires) { await atomicClick(page, `#bench [data-pin="${w.from}"] .bpinhit`, 'data-pin'); await atomicClick(page, `#bench [data-pin="${w.to}"] .bpinhit`, 'data-pin'); }
      const box = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel);
      // Klick auf eine Buchse setzt keine Spitze mehr (er beginnt eine Leitung)
      await atomicClick(page, '#bench [data-dial="V"] .bdialhit', 'data-dial');
      await atomicClick(page, `#bench [data-pin="${src.id}.p"] .bpinhit`, 'data-pin');
      if (await page.evaluate(() => DigitalQuest.core.probes.a || DigitalQuest.core.probes.b)) fail('Klick auf die Buchse setzt die Spitze – bei drag darf nur Ziehen wirken');
      await page.keyboard.press('Escape');
      // echtes Ziehen mit der Maus (kein dispatchEvent): rot auf +, dann Fehlwurf mit schwarz
      const a = await box('#bench [data-probe="a"] .bprobehit'), q = await box(`#bench [data-pin="${src.id}.p"] .bpinhit`);
      await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move((a[0] + q[0]) / 2, (a[1] + q[1]) / 2, { steps: 4 });
      if (!await page.evaluate(() => DigitalQuest.core.dragProbe && DigitalQuest.core.dragProbe.which === 'a')) fail('während des Ziehens hängt die Spitze nicht am Zeiger');
      await page.mouse.move(q[0], q[1], { steps: 4 }); await page.mouse.up();
      if (await page.evaluate(() => DigitalQuest.core.probes.a) !== src.id + '.p') fail('rote Spitze liegt nach dem Ziehen nicht an ' + src.id + '.p');
      const bb = await box('#bench [data-probe="b"] .bprobehit');
      await page.mouse.move(bb[0], bb[1]); await page.mouse.down(); await page.mouse.move(bb[0] - 250, bb[1] - 150, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(350);
      if (await page.evaluate(() => DigitalQuest.core.probes.b)) fail('Fehlwurf setzt die schwarze Spitze');
      if (!await page.evaluate(() => document.querySelector('#bench [data-probe="b"]').classList.contains('parked'))) fail('nach dem Fehlwurf liegt die Spitze nicht geparkt');
      await atomicDrag(page, 'b', src.id + '.n');
      // Messbereich: AUTO liest, 200 mV zeigt OL (Quelle ≥ 5 V), passender Bereich liest wieder
      const auto = await page.textContent('#lcd'); if (!isFinite(lcdValue(auto))) fail('AUTO zeigt keinen Wert: ' + auto);
      await atomicClick(page, '#bench [data-range="0.2"] rect', 'data-range');
      if (!/OL/.test(await page.textContent('#lcd')) || !/OL/.test(await page.evaluate(() => document.querySelector('#bench .bmlcd').textContent))) fail('200 mV bei einer Quellenspannung zeigt kein OL');
      if (!/Bereich/.test(await page.textContent('#mmWarn'))) fail('OL ohne Hinweis auf den Bereich');
      // kleinster passender Bereich (die Aufgabe kann 9 V oder 230 V liefern) liest wie AUTO
      const rg = await page.evaluate(v => [...document.querySelectorAll('#mmRange [data-rg]')].map(x => +x.dataset.rg).filter(x => x > v).sort((x, y) => x - y)[0], lcdValue(auto));
      await page.click(`#mmRange [data-rg="${rg}"]`);
      const man = await page.textContent('#lcd'); if (!isFinite(lcdValue(man)) || Math.abs(lcdValue(man) - lcdValue(auto)) > 0.05 * lcdValue(auto) + 0.02) fail(rg + '-V-Bereich liest anders als AUTO: ' + man + ' / ' + auto);
      if (!/MAN /.test(await page.evaluate(() => [...document.querySelectorAll('#bench .bmsub')].map(t => t.textContent).join('/')))) fail('LCD zeigt den Handbereich nicht');
      // Oszilloskop: ohne Tastkopf Hinweis, mit Tastkopf Kurve; Multimeter bleibt unabhaengig
      await atomicClick(page, '#bench [data-scope="run"] rect', 'data-scope');
      if (!/Tastkopf/.test(await page.textContent('#scopeInfo')) || !/Tastkopf/.test(await page.evaluate(() => document.querySelector('#bench .bscinfo').textContent))) fail('Oszilloskop ohne Tastkopf zeigt keinen Hinweis');
      if (await page.$('#bench .bsctrace')) fail('Oszilloskop zeichnet ohne Tastkopf eine Kurve');
      await atomicDrag(page, 'tip', src.id + '.p'); await atomicDrag(page, 'gnd', src.id + '.n');
      await atomicClick(page, '#bench [data-scope="run"] rect', 'data-scope'); await page.waitForTimeout(150);
      if (!await page.$('#bench .bsctrace') || !/Kanal: / .test(await page.textContent('#scopeInfo'))) fail('Oszilloskop mit Tastkopf zeigt keine Kurve');
      if (await page.evaluate(() => DigitalQuest.core.probes.a) !== src.id + '.p') fail('Tastkopf hat die Multimeter-Spitze verstellt');
      // Altbestand unveraendert: Klick setzt die Spitze, keine Bereichstasten, kein Tastkopf
      await page.evaluate(() => { DigitalQuest.openItem('1.5'); DigitalQuest.setView('bench'); }); // 1.5 ist Altbestand (legacy)
      await atomicClick(page, '#bench [data-dial="V"] .bdialhit', 'data-dial'); await atomicClick(page, '#bench [data-pin="B1.p"] .bpinhit', 'data-pin');
      if (await page.evaluate(() => DigitalQuest.core.probes.a) !== 'B1.p') fail('Altbestand: Klick setzt die Spitze nicht mehr');
      if (await page.$('#bench [data-range]') || await page.$('#bench [data-probe]')) fail('Altbestand: Bereichstasten oder greifbare Spitzen sichtbar');
    } catch (e) { fail('gescheitert: ' + e.message.split('\n')[0]); await page.screenshot({ path: path.join(__dirname, 'shots', 'fehler_bedienung.png') }); }
    runs++;
  }
  if (!only || only === 'katalog') for (const view of ['schema', 'bench']) {
    const svg = view === 'bench' ? '#bench' : '#board', hit = view === 'bench' ? '.bpinhit' : '.pinhit';
    await page.evaluate(v => { delete DigitalQuest.state.drafts.sandbox; DigitalQuest.openItem('sandbox'); DigitalQuest.setView(v); }, view);
    for (const c of catalog) {
      const tag = 'Katalog ' + c.type + ' [' + (view === 'bench' ? 'Werkbank' : 'Schaltplan') + ']';
      try {
        await page.click(`[data-add="${c.type}"]`, { timeout: 3000 });
        const id = await page.evaluate(() => DigitalQuest.core.sel);
        for (const f of FIELDS[c.type] || []) if (!await page.$(`#inspector [data-prop="${f}"]`)) errors.push(tag + ': Eigenschaft ' + f + ' fehlt im Panel');
        for (const r of [0, 1]) { // unrotiert und um 90° gedreht: jeder Anschluss sichtbar und obenauf, Klick startet eine Leitung
          for (const pn of c.pins) {
            const pid = id + '.' + pn;
            const top = await page.evaluate(([sv, h, p]) => { // atomar im Browser: was liegt genau unter der Anschluss-Mitte?
              const el = document.querySelector(sv + ' [data-pin="' + p + '"] ' + h); if (!el) return 'fehlt'; el.scrollIntoView({ block: 'center', inline: 'center' }); // wie eine Person: erst hinscrollen
              const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, box = document.querySelector(sv).getBoundingClientRect();
              if (x < box.left || x > box.right || y < box.top || y > box.bottom) return 'ausserhalb';
              const t = document.elementFromPoint(x, y), g = t && t.closest('[data-pin]');
              if (!g) return 'verdeckt von ' + (t ? t.tagName + (t.id ? '#' + t.id : '') + '.' + (t.getAttribute('class') || '') + ' in ' + ((t.closest('[id]') || {}).id || '-') : 'nichts'); if (g.dataset.pin !== p) return 'verdeckt von ' + g.dataset.pin;
              t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
              return DigitalQuest.core.wireStart === p ? 'ok' : 'Klick ohne Wirkung';
            }, [svg, hit, pid]);
            if (top !== 'ok') errors.push(tag + (r ? ' gedreht' : '') + ': Anschluss ' + pn + ' – ' + top);
            await page.keyboard.press('Escape');
          }
          await page.evaluate(i => { DigitalQuest.core.sel = i; }, id); await page.click('#btnRot');
        }
        await page.evaluate(i => { DigitalQuest.core.sel = i; DigitalQuest.core.removeSelected(); }, id); // naechstes Bauteil auf leerem Tisch
      } catch (e) { errors.push(tag + ': ' + e.message.split('\n')[0]); }
    }
    runs++;
  }
  await browser.close();
  console.log(`${runs} Durchläufe (Aufgaben × Schaltplan + Werkbank, Bauteilkatalog × 2)`);
  if (errors.length) { console.log('FEHLER:\n' + errors.join('\n')); process.exit(1); }
  console.log('Alle Aufgaben in beiden Ansichten lösbar');
})();

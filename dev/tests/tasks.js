// Jede Aufgabe in beiden Ansichten loesbar? node tests/tasks.js [id, z. B. 2.5, oder Kapitel, z. B. 2.]
// Loest jede Aufgabe aus DQ.tasks einmal im Schaltplan und einmal auf der Werkbank – nur ueber die echte Bedienung:
// Bauteile aus der Palette, Werte im Eigenschaften-Panel, Leitungen per Klick auf Anschluesse, ueberzaehlige
// Leitungen anklicken + Entf, Messwerte mit dem Multimeter der jeweiligen Ansicht (Schema: Panel, Werkbank: Drehschalter),
// dann „Pruefen“. Vorlage ist die Referenzloesung (ref). Messungen ueber truth werden echt gemessen: Strom durch
// Auftrennen einer Leitung am Bauteil und Amperemeter in der Luecke, Spannung parallel zum Bauteil.
// Zusaetzlich: Bauteilkatalog – jedes Bauteil in beiden Ansichten hinzufuegen, alle Anschluesse anklicken, drehen,
// jede Eigenschaft im Panel einstellen.
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
function lcdValue(txt) { // "4.008 mA" -> 0.004008 (Basiseinheit)
  const m = String(txt).trim().match(/^(-?[\d.]+)\s*([pnµumkM]?)/); return m ? +m[1] * PRE[m[2]] : NaN;
}

(async () => {
  const browser = await chromium.launch(); const errors = []; let runs = 0;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push('JS: ' + e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const tasks = await page.evaluate(() => window.DQ.tasks.map(t => ({ id: t.id, start: t.start, ref: t.ref, measure: t.measure, unitScale: DigitalQuest.engine.UNIT_SCALE,
    expected: DigitalQuest.engine.expectedAnswers(t, t.ref) })));

  for (const t of tasks.filter(x => only !== 'katalog' && (!only || x.id === only || (only.endsWith('.') && x.id.startsWith(only))))) for (const view of ['schema', 'bench']) {
    const tag = t.id + ' [' + (view === 'bench' ? 'Werkbank' : 'Schaltplan') + ']', fail = m => errors.push(tag + ': ' + m);
    const svg = view === 'bench' ? '#bench' : '#board', hit = view === 'bench' ? '.bpinhit' : '.pinhit', whit = view === 'bench' ? '.bwirehit' : '.wirehit';
    const pin = id => atomicClick(page, `${svg} [data-pin="${id}"] ${hit}`, 'data-pin');
    runs++;
    try {
      await page.evaluate(([id, v]) => { delete DigitalQuest.state.drafts[id]; DigitalQuest.state.settings.view = v; DigitalQuest.openItem(id); DigitalQuest.setView(v); }, [t.id, view]);
      // 1. fehlende Bauteile aus der Palette, Eigenschaften im Panel setzen
      const startIds = new Set(t.start.parts.map(p => p.id)), map = {};
      for (const rp of t.ref.parts.filter(p => !startIds.has(p.id))) {
        await page.click(`[data-add="${rp.type}"]`, { timeout: 3000 });
        map[rp.id] = await page.evaluate(() => DigitalQuest.core.sel);
        const props = Object.assign({}, rp.props || {}); if (rp.value !== undefined) props.value = rp.value;
        for (const [k, v] of Object.entries(props)) {
          if (k === 'closed') { if (v) await page.click('#tgl', { timeout: 3000 }); continue; }
          const sel = `#inspector [data-prop="${k}"]`;
          if (!await page.$(sel)) { fail(map[rp.id] + ': Eigenschaft „' + k + '“ ist im Panel nicht einstellbar'); continue; }
          const tagName = await page.$eval(sel, el => el.tagName + (el.type ? ':' + el.type : ''));
          if (tagName.startsWith('SELECT')) await page.selectOption(sel, String(v));
          else if (tagName === 'INPUT:range') await page.$eval(sel, (el, x) => { el.value = x; el.dispatchEvent(new Event('input')); }, String(v));
          else { await page.fill(sel, String(v)); await page.dispatchEvent(sel, 'change'); }
        }
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
      const readMeter = async (m, mode, a, b) => {
        await dial(mode); await pin(a); await pin(b);
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
            }, [part, pins]);
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
      await page.click('#btnCheck'); await page.waitForTimeout(80);
      if (await page.isVisible('#modal.open .win')) await page.click('#modal .modal-btns button:first-child');
      else fail('nicht bestanden: ' + (await page.textContent('#results')).replace(/\s+/g, ' ').slice(0, 300));
    } catch (e) { fail('Bedienung gescheitert: ' + e.message.split('\n')[0]); await page.screenshot({ path: path.join(__dirname, 'shots', 'fehler_' + t.id + '_' + view + '.png') }); }
  }
  // ===== Bauteilkatalog in beiden Ansichten (Freie Werkbank mit ?alle) =====
  const catalog = await page.evaluate(() => Object.keys(DigitalQuest.engine.PARTS).map(k => ({ type: k, pins: DigitalQuest.engine.PARTS[k].pins })));
  const FIELDS = { battery: ['value'], resistor: ['value'], lamp: ['value'], pot: ['value', 'pos'], capacitor: ['value'], clock: ['freq'], led: ['color'], acsource: ['value', 'freq', 'shape', 'offset'], switch: [], zener: ['vz'], npn: ['beta'], motor: ['value'] };
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
              const el = document.querySelector(sv + ' [data-pin="' + p + '"] ' + h); if (!el) return 'fehlt';
              const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, box = document.querySelector(sv).getBoundingClientRect();
              if (x < box.left || x > box.right || y < box.top || y > box.bottom) return 'ausserhalb';
              const t = document.elementFromPoint(x, y), g = t && t.closest('[data-pin]');
              if (!g) return 'verdeckt'; if (g.dataset.pin !== p) return 'verdeckt von ' + g.dataset.pin;
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
  console.log(`${runs} Durchlaeufe (Aufgaben × Schaltplan + Werkbank, Bauteilkatalog × 2)`);
  if (errors.length) { console.log('FEHLER:\n' + errors.join('\n')); process.exit(1); }
  console.log('Alle Aufgaben in beiden Ansichten loesbar');
})();

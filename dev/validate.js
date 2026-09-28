// Inhalts-Validator: node validate.js  → muss "OK — keine Fehler" ausgeben
const path = require('path'), fs = require('fs');
const E = require('./src/engine.js');
require('./src/content/_helpers.js');
const dir = path.join(__dirname, 'src/content');
fs.readdirSync(dir).filter(f => f !== '_helpers.js' && f.endsWith('.js')).sort().forEach(f => require(path.join(dir, f)));
const DQ = globalThis.DQ;
const errors = [], warnings = [];
const err = (id, m) => errors.push(`[${id}] ${m}`), warn = (id, m) => warnings.push(`[${id}] ${m}`);

function num(str) { // "8 V" / "4 mA" / "0,5 V" -> Basiseinheit
  const m = String(str).replace(',', '.').match(/(-?[\d.]+)\s*(m|µ|k|M)?/); if (!m) return NaN;
  return +m[1] * ({ m: 1e-3, 'µ': 1e-6, k: 1e3, M: 1e6 }[m[2]] || 1);
}
function types(l) { return new Set(l.parts.map(p => p.type)); }

// Kapitel
const seen = new Set();
DQ.chapters.forEach(c => c.sequence.forEach(id => {
  if (!DQ.byId[id]) err('Kap ' + c.id, 'Sequenz verweist auf fehlendes ' + id);
  if (seen.has(id)) err('Kap ' + c.id, 'doppelt in Sequenz: ' + id); seen.add(id);
}));
[...DQ.tasks, ...DQ.theories].forEach(x => { if (!seen.has(x.id)) warn(x.id, 'in keiner Kapitel-Sequenz'); });

// Aufgaben
DQ.tasks.forEach(t => {
  if (!t.tags.length) warn(t.id, 'keine Kompetenz-Tags');
  ['story', 'learn', 'take', 'hint', 'hint2'].forEach(k => { if (!t[k]) warn(t.id, k + ' fehlt'); });
  if (!t.tests.length && !t.measure.length) err(t.id, 'weder tests noch measure');
  try { E.buildNetlist(t.start); E.buildNetlist(t.ref); } catch (e) { err(t.id, 'Layout: ' + e.message); return; }
  const allowed = new Set([...types(t.start), ...t.palette]);
  types(t.ref).forEach(ty => { if (!allowed.has(ty)) err(t.id, 'Referenz nutzt ' + ty + ', das weder im Start noch in der Palette ist'); });
  t.ref.parts.forEach(p => { if (p.x === undefined || p.y === undefined) warn(t.id, p.id + ' ohne Position'); });
  let ans;
  try { ans = E.expectedAnswers(t, t.ref); } catch (e) { err(t.id, 'Sollwerte: ' + e.message); return; }
  const r = E.runTask(t, t.ref, ans);
  if (!r.pass) err(t.id, 'Referenz besteht nicht: ' + r.results.filter(x => !x.ok).map(x => x.text + ' ' + JSON.stringify(x.info || '')).join(' | '));
  if (E.runTask(t, t.start, {}).pass) err(t.id, 'Startzustand besteht bereits');
  t.wrong.forEach(w => {
    try { if (E.runTask(t, w, ans).pass) err(t.id, 'Fehlloesung besteht: ' + w.name); }
    catch (e) { err(t.id, 'Fehlloesung ' + w.name + ': ' + e.message); }
  });
});

// Theorien
DQ.theories.forEach(th => {
  if (th.questions.length !== 5) warn(th.id, th.questions.length + ' statt 5 Fragen');
  th.questions.forEach((q, i) => {
    const id = th.id + ' F' + (i + 1);
    if (!(q.correct >= 0 && q.correct < q.options.length)) err(id, 'correct ausserhalb');
    if (new Set(q.options).size !== q.options.length) err(id, 'doppelte Antwort');
    if (!q.explain) warn(id, 'Erklaerung fehlt');
    let want;
    if (q.verify) want = E.measure(q.verify.layout, q.verify).value;
    if (q.verifyTruth) want = Math.abs(E.analyze(q.verifyTruth.layout).parts[q.verifyTruth.sel][q.verifyTruth.q]);
    if (want !== undefined) {
      const got = num(q.options[q.correct]);
      if (!(Math.abs(got - want) <= Math.abs(want) * 0.02)) err(id, `richtige Antwort ${q.options[q.correct]} passt nicht zur Engine (${E.fmt(want, '')})`);
      q.options.forEach((o, j) => { if (j !== q.correct && Math.abs(num(o) - want) <= Math.abs(want) * 0.02) err(id, 'Distraktor ebenfalls richtig: ' + o); });
    }
  });
});

warnings.forEach(w => console.log('Warnung', w));
errors.forEach(e => console.log('FEHLER ', e));
console.log(`${DQ.chapters.length} Kapitel, ${DQ.tasks.length} Aufgaben, ${DQ.theories.length} Theorien`);
console.log(errors.length ? `${errors.length} Fehler, ${warnings.length} Warnungen` : `OK — keine Fehler (${warnings.length} Warnungen)`);
process.exit(errors.length ? 1 : 0);

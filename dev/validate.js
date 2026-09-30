// Inhalts-Validator: node validate.js  → muss "OK — keine Fehler" ausgeben
const path = require('path'), fs = require('fs');
const E = require('./src/engine.js');
globalThis.DQEngine = E; require('./src/visuals.js'); const V = globalThis.DQVisuals;
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
// Uebungswerkstatt: eigener Bereich ausserhalb der 15 Kapitel, nur Mess-Aufgaben (defMessaufgabe)
if (DQ.workshop) DQ.workshop.sequence.forEach(id => {
  const t = DQ.byId[id];
  if (!t) { err('Werkstatt', 'Sequenz verweist auf fehlendes ' + id); return; }
  if (seen.has(id)) err('Werkstatt', 'doppelt: ' + id); seen.add(id);
  if (!t.messOnly) err(id, 'Werkstatt-Stationen muessen Mess-Aufgaben sein (defMessaufgabe)');
  if (t.ch !== DQ.workshop.id) err(id, 'ch muss ' + DQ.workshop.id + ' sein');
});
DQ.tasks.filter(t => t.messOnly).forEach(t => {
  if (t.palette.length || t.ref !== t.start) err(t.id, 'Mess-Aufgabe: keine Palette, Loesung = Startaufbau');
  try { const ex = E.expectedAnswers(t, t.ref); t.measure.forEach(m => { if (!isFinite(ex[m.id])) err(t.id, 'Messung ' + m.id + ' ohne Sollwert'); }); } catch (e) { err(t.id, 'Sollwerte: ' + e.message); }
});
[...DQ.tasks, ...DQ.theories].forEach(x => { if (!seen.has(x.id)) warn(x.id, 'in keiner Kapitel-Sequenz'); });

// Theorie-Bilder (visual): Typ bekannt, Pflichtfelder je Typ, Platzhalter passen zur Anzahl
DQ.theories.forEach(th => {
  const list = V.listOf(th.visual);
  if (!list.length && !th.visualNone) err(th.id, 'kein visual – entweder Bild/Animation oder visualNone: "Grund" angeben');
  list.forEach((v, i) => V.check(v, E).forEach(m => err(th.id, 'visual' + (list.length > 1 ? ' ' + (i + 1) : '') + ': ' + m)));
  const ph = (th.lesson.match(/{{visual(?::(d+))?}}/g) || []).length;
  if (ph > list.length) err(th.id, 'mehr {{visual}}-Platzhalter als Bilder');
});

// Bauteil-Datenblaetter: jeder Engine-Typ hat ein vollstaendiges Datenblatt, Werte kommen aus der Engine
const DS = DQ.datasheets || {};
Object.keys(E.PARTS).forEach(type => {
  const t = DS[type], d = E.PARTS[type], id = 'Datenblatt ' + type;
  if (!t) { err(id, 'fehlt in content/datasheets.js'); return; }
  if (!t.funktion) err(id, 'Funktionstext fehlt');
  d.pins.forEach(p => { if (!(t.anschluesse || {})[p]) err(id, 'Anschluss ' + p + ' ohne Text'); });
  Object.keys(t.anschluesse || {}).forEach(p => { if (!d.pins.includes(p)) err(id, 'Anschluss ' + p + ' gibt es in E.PARTS nicht'); });
  (t.grenzen || []).forEach(g => { if (!(g.key in d.props)) err(id, 'Grenze ' + g.key + ' nicht in E.PARTS.props'); if (!g.text) err(id, 'Grenze ' + g.key + ' ohne Text'); });
  (t.kennwerte || []).forEach(k => { if (!(k in d.props)) err(id, 'Kennwert ' + k + ' nicht in E.PARTS.props'); });
  try {
    const m = DQ.datasheet(type, E);
    [...m.grenzen, ...m.kennwerte].forEach(r => { if (/NaN|undefined|Infinity/.test(String(r.value))) err(id, r.label + ': Wert ' + r.value); });
  } catch (e) { err(id, e.message); }
});
Object.keys(DS).forEach(type => { if (!E.PARTS[type]) err('Datenblatt ' + type, 'Bauteiltyp gibt es in der Engine nicht'); });
{ // Grenzwerte werden live gelesen: Engine-Wert aendern → Datenblatt zieht mit
  const old = E.PARTS.led.props.imax; E.PARTS.led.props.imax = 0.05;
  const shown = DQ.datasheet('led', E).grenzen.find(r => r.key === 'imax');
  if (!shown || !/^50 mA$/.test(shown.value)) err('Datenblatt led', 'Grenzwert nicht live aus E.PARTS gelesen: ' + (shown && shown.value));
  E.PARTS.led.props.imax = old;
}

// Teile der Karte und Auszeichnungen
DQ.chapters.forEach(c => {
  const n = (DQ.parts || []).filter(p => p.chapters.includes(c.id)).length;
  if (n !== 1) err('Kap ' + c.id, n ? 'in mehreren Teilen' : 'in keinem Teil (DQ.parts)');
});
(DQ.parts || []).forEach(p => {
  p.chapters.forEach(id => { if (!DQ.chapters.some(c => c.id === id)) err('Teil ' + p.no, 'Kapitel ' + id + ' fehlt'); });
  if (p.award) {
    const a = (DQ.awards || {})[p.award];
    if (!a) err('Teil ' + p.no, 'Auszeichnung ' + p.award + ' fehlt');
    else if (!DQ.byId[a.boss] || !DQ.byId[a.boss].boss) err('Auszeichnung ' + a.id, 'Boss-Aufgabe ' + a.boss + ' fehlt oder ist nicht als boss markiert');
  }
});

// Aufgaben
DQ.tasks.forEach(t => {
  if (!t.tags.length) warn(t.id, 'keine Kompetenz-Tags');
  ['story', 'learn', 'take', 'hint', 'hint2'].forEach(k => { if (!t[k]) warn(t.id, k + ' fehlt'); });
  if (!t.tests.length && !t.measure.length) err(t.id, 'weder tests noch measure');
  try { E.buildNetlist(t.start); E.buildNetlist(t.ref); } catch (e) { err(t.id, 'Layout: ' + e.message); return; }
  const allowed = new Set([...types(t.start), ...t.palette]);
  types(t.ref).forEach(ty => { if (!allowed.has(ty)) err(t.id, 'Referenz nutzt ' + ty + ', das weder im Start noch in der Palette ist'); });
  t.ref.parts.forEach(p => { if (p.x === undefined || p.y === undefined) warn(t.id, p.id + ' ohne Position'); });
  if (t.bench) { // Werkbank-Layout: nur IDs aus start/ref, keine Doppelten, gueltige Lage; Startbauteile vollstaendig
    const ids = new Set([...t.start.parts, ...t.ref.parts].map(p => p.id)), bseen = new Set();
    (t.bench.parts || []).forEach(b => {
      if (!ids.has(b.id)) err(t.id, 'bench: ' + b.id + ' gibt es weder in start noch in ref');
      if (bseen.has(b.id)) err(t.id, 'bench: ' + b.id + ' doppelt'); bseen.add(b.id);
      if (!(isFinite(b.x) && isFinite(b.y))) err(t.id, 'bench: ' + b.id + ' ohne x/y');
      if (b.rot !== undefined && [0, 90, 180, 270].indexOf(b.rot) < 0) err(t.id, 'bench: ' + b.id + ' rot muss 0/90/180/270 sein');
    });
    t.start.parts.forEach(p => { if (!bseen.has(p.id)) warn(t.id, 'bench: Startbauteil ' + p.id + ' ohne Werkbank-Lage (Auto-Anordnung)'); });
  }
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
  if (!th.merksatz) warn(th.id, 'merksatz fehlt (Empfehlung: ein bis zwei Saetze „Das Wichtigste in Kuerze“)');
  else if (th.merksatz.length > 400) warn(th.id, 'merksatz ist lang (' + th.merksatz.length + ' Zeichen) – gedacht sind ein bis zwei Saetze');
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

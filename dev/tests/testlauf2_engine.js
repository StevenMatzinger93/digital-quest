// Testlauf 2 (Auftrag 16.10.2026), Phase 0 – Reproduktionen ohne Browser: node tests/testlauf2_engine.js
// 1 Verteilung der richtigen Antworten in den Theorie-Kontrollen
// 2 Strommessung mit dem Multimeter in der Lücke: welche Aufgaben scheitern, wenn statt eines Strommessers die Leitung offen ist
// 3 Spannungsteiler 2.5 in Varianten
// 4 3.5 Periodendauer: Sollwert, Einheit, Rechenweg
require('../src/engine.js'); require('../src/content/_helpers.js');
const fs = require('fs'), path = require('path');
fs.readdirSync(path.join(__dirname, '../src/content')).filter(f => f.endsWith('.js') && f !== '_helpers.js' && f !== 'manual.js').sort().forEach(f => require('../src/content/' + f));
const DQ = globalThis.DQ, E = require('../src/engine.js');
const W = (a, b) => ({ from: a, to: b });

console.log('=== 1 Richtige Antwort je Position (Theorie-Kontrollen) ===');
const pos = [0, 0, 0, 0, 0]; let n = 0; const skew = [];
DQ.theories.forEach(th => { const c = [0, 0, 0, 0, 0]; th.questions.forEach(q => { pos[q.correct]++; c[q.correct]++; n++; }); const mx = Math.max(...c); if (mx > 3) skew.push(th.id + ' (' + c.slice(0, 4).join('/') + ')'); });
console.log('Fragen', n, '· A', pos[0], '· B', pos[1], '· C', pos[2], '· D', pos[3], '· B-Anteil', Math.round(100 * pos[1] / n) + ' %');
console.log('Theorien mit mehr als 3 von 5 gleichen Positionen:', skew.length, skew.join(', '));
console.log('T8B correct:', DQ.byId.T8B.questions.map(q => q.correct).join(','));

console.log('\n=== 2 Strommessung: Multimeter in der Lücke statt Strommesser ===');
// Für jede Aufgabe mit einer Strommessung (measure mode A/AAC oder truth q 'i'): Referenz nehmen, eine Leitung am gemessenen Bauteil entfernen
// (= Lücke, in der das Multimeter stecken würde) und runTask mit dem richtigen Messwert laufen lassen.
const rows = [];
DQ.tasks.forEach(t => {
  const ms = (t.measure || []).filter(m => m.mode === 'A' || m.mode === 'AAC' || (m.truth && m.truth.q === 'i'));
  if (!ms.length || !t.ref) return;
  const sel = ms[0].truth ? ms[0].truth.sel : (ms[0].a || '').split('.')[0];
  const ex = E.expectedAnswers(t, t.ref), ans = {}; Object.keys(ex).forEach(k => ans[k] = ex[k]);
  const ok0 = E.runTask(t, t.ref, ans).pass;
  const hasAmm = t.ref.parts.some(p => p.type === 'ammeter');
  // Lücke: erste Leitung, die am gemessenen Bauteil hängt (bzw. am Strommesser, falls die Referenz einen hat)
  const tgt = hasAmm ? t.ref.parts.find(p => p.type === 'ammeter').id : sel;
  const wi = t.ref.wires.findIndex(w => w.from.split('.')[0] === tgt || w.to.split('.')[0] === tgt);
  if (wi < 0) return;
  const gap = E.clone(t.ref); const cut = gap.wires.splice(wi, 1)[0];
  const r = E.runTask(t, gap, ans), bad = r.results.filter(x => !x.ok).map(x => x.text.slice(0, 60));
  const txt = [t.hint, t.hint2, t.brief, typeof t.setup === 'string' ? t.setup : ''].join(' ');
  rows.push({ id: t.id, title: t.title, ok0, gapPass: r.pass, needAmm: !!(t.need && t.need.ammeter), refAmm: hasAmm, luecke: /Lücke/.test(txt), cut: cut.from + '–' + cut.to, bad: bad.slice(0, 2).join(' | ') });
});
console.log('Aufgabe | Referenz besteht | mit Lücke (Multimeter) besteht | need ammeter | Referenz mit A | Text «Lücke» | getrennte Leitung | was scheitert');
rows.forEach(r => console.log([r.id, r.ok0, r.gapPass, r.needAmm, r.refAmm, r.luecke, r.cut, r.bad].join(' | ')));
console.log('Betroffen (scheitert mit Lücke):', rows.filter(r => !r.gapPass).map(r => r.id).join(', '));

console.log('\n=== 3 Spannungsteiler 2.5 ===');
const t25 = DQ.byId['2.5'];
const div = (r1, r2, swap) => { const b = t25.start.parts[0]; const R1 = { id: 'R1', type: 'resistor', value: swap ? r2 : r1, x: 0, y: 0 }, R2 = { id: 'R2', type: 'resistor', value: swap ? r1 : r2, x: 0, y: 0 };
  // swap: R2 sitzt oben (am Pluspol), R1 unten – Teiler elektrisch richtig, nur die Namen vertauscht
  return swap ? { parts: [b, R1, R2], wires: [W('B1.p', 'R2.a'), W('R2.b', 'R1.a'), W('R1.b', 'B1.n')] } : { parts: [b, R1, R2], wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')] }; };
for (const [name, r1, r2, swap] of [['2 k / 1 k', 2000, 1000], ['Namen vertauscht (R2 oben = 2 k)', 2000, 1000, true], ['20 k / 10 k', 20000, 10000], ['E12 22 k / 12 k', 22000, 12000], ['E12 18 k / 8,2 k', 18000, 8200], ['E12 33 k / 15 k', 33000, 15000], ['E12 2,7 k / 1,5 k', 2700, 1500], ['E12 6,8 k / 3,3 k', 6800, 3300], ['E12 15 k / 8,2 k', 15000, 8200], ['E12 3,9 k / 2,2 k', 3900, 2200], ['E12 47 k / 22 k', 47000, 22000], ['E12 56 k / 27 k', 56000, 27000]]) {
  const L = div(r1, r2, swap), lo = swap ? 'R1' : 'R2';
  const u = E.measure(L, { mode: 'V', a: lo + '.a', b: lo + '.b' }).value, uR2 = E.measure(L, { mode: 'V', a: 'R2.a', b: 'R2.b' }).value;
  const r = E.runTask(t25, L, { u2: +u.toFixed(3) });
  console.log(name.padEnd(36), 'U unten', u.toFixed(3), 'V · U an R2', uR2.toFixed(3), 'V · Abw.', (100 * (u / 5 - 1)).toFixed(1) + ' % ·', r.pass ? 'besteht' : 'scheitert: ' + r.results.filter(x => !x.ok).map(x => x.text).join(' | '));
}

console.log('\n=== 4 3.5 Periodendauer ===');
const t35 = DQ.byId['3.5'];
console.log('measure tper:', JSON.stringify(t35.measure.find(m => m.id === 'tper')));
console.log('expectedAnswers:', JSON.stringify(E.expectedAnswers(t35, t35.ref)));
console.log('Rechenweg tper:', JSON.stringify(t35.rechenweg && t35.rechenweg.tper));
const ex35 = E.expectedAnswers(t35, t35.ref);
for (const v of ['10', '0,01', '0.01', '10,0', '20']) { const a = Object.assign({}, ex35, { tper: v }); const r = E.runTask(t35, t35.ref, a); console.log('tper =', v.padEnd(5), '→', r.results.filter(x => x.info && x.info.mid === 'tper').map(x => (x.ok ? 'richtig' : 'falsch') + ' (' + x.text + ')').join('')); }

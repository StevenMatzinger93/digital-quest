// Glättung (Auftrag 06.10.2026, K0): Tabelle aus Abschnitt 2 mit der Engine nachrechnen und den Abbruch «Gleichungssystem nicht lösbar» nachstellen.
// node tests/glaettung_befund.js
require('../src/engine.js'); require('../src/content/_helpers.js');
const fs = require('fs'), path = require('path');
fs.readdirSync(path.join(__dirname, '../src/content')).filter(f => f.endsWith('.js') && f !== '_helpers.js' && f !== 'manual.js').sort().forEach(f => require('../src/content/' + f));
const DQ = globalThis.DQ, E = require('../src/engine.js');
const base = E.clone(DQ.byId['16.7'].ref);
const withC = (uF, rl) => { const l = E.clone(base); l.parts.forEach(p => { if (p.id === 'S1') { p.props = p.props || {}; p.props.closed = !!uF; } if (p.id === 'C1' && uF) p.value = uF * 1e-6; if (p.id === 'R1' && rl) p.value = rl; }); return l; };
const SOLL = { 0: [8.58, 0, 5.0, 3.0], 10: [8.581, 4.477, 6.654, 1.302], 47: [8.573, 7.215, 7.916, 0.410], 100: [8.553, 7.860, 8.210, 0.208], 220: [8.505, 8.179, 8.343, 0.098], 470: [8.459, 8.304, 8.382, 0.046], 1000: [8.429, 8.356, 8.393, null] };
console.log('C µF | τ ms | max | min | Uss | DC | TRMS(AC) | Faustformel | Auftrag max/min/DC/TRMS | Abw.');
for (const uF of [0, 10, 47, 100, 220, 470, 1000]) {
  const r = E.acMeasure(withC(uF), { a: 'R1.a', b: 'R1.b' }), ac = E.measure(withC(uF), { mode: 'VAC', a: 'R1.a', b: 'R1.b', meterType: 'trms' });
  const trms = ac && isFinite(ac.value) ? ac.value : NaN, I = r.dc / 1000, dU = uF ? I / (2 * 50 * uF * 1e-6) : NaN, s = SOLL[uF];
  const dev = [r.max - s[0], r.min - s[1], r.dc - s[2], s[3] === null ? 0 : trms - s[3]].map(x => Math.abs(x));
  console.log([uF || 'ohne', uF ? uF * 1e-3 * 1 : '–', r.max.toFixed(3), r.min.toFixed(3), (r.max - r.min).toFixed(3), r.dc.toFixed(3), isFinite(trms) ? trms.toFixed(3) : '–', isFinite(dU) ? dU.toFixed(2) : '–', s.join('/'), Math.max(...dev) < 0.01 ? 'ok' : 'ABWEICHUNG ' + dev.map(x => x.toFixed(3)).join(',')].join(' | '));
}
// Engine-Fehler aus Abschnitt 3.5 nachstellen
function tryRun(uF, o) { try { const s = E.simulate(withC(uF), o).samples; return 'ok (' + s.length + ' Werte, max ' + Math.max(...s.map(x => x.ch0)).toFixed(3) + ')'; } catch (e) { return 'FEHLER: ' + e.message; } }
console.log('\nAbbruch nachstellen (Brücke, Probe R1.a–R1.b):');
for (const [uF, o] of [[1000, { dt: 5e-5, tEnd: 0.04, settle: { t: 8, dt: 1e-4 } }], [1000, { dt: 5e-5, tEnd: 0.04, settle: { t: 5, dt: 1e-4 } }], [1000, { dt: 1e-3, tEnd: 0.1 }], [1000, { dt: 2e-5, tEnd: 0.1 }], [470, { dt: 5e-5, tEnd: 0.04, settle: { t: 8, dt: 1e-4 } }], [10, { dt: 5e-5, tEnd: 0.04, settle: { t: 8, dt: 1e-4 } }]])
  console.log(uF + ' µF dt ' + o.dt + ' tEnd ' + o.tEnd + (o.settle ? ' settle ' + o.settle.t + ' s / ' + o.settle.dt : '') + ' → ' + tryRun(uF, o));

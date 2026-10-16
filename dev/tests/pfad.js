// Prüfmaschine und Stationen des Lernpfads (Nachtlauf 2): node tests/pfad.js
// 1. Quine-McCluskey des Lernpfads gegen eine völlig andere Rechnung (alle Würfel aufzählen, alle Teilmengen durchprobieren)
// 2. Die sieben Prüfarten einzeln (richtig, falsch mit Begründung, Randfälle) plus Fragen, Protokoll, Vergleich
// 3. Fortschritt: Zustände, Freischaltung, Ausgeben und Einlesen
// 4. Jede Station: Musterlösung wird angenommen, eine falsche abgelehnt; Bauteile der Musterlösung sind freigeschaltet; Daten vollständig
// 5. Fachlich: Tabellen, Ausdrücke und Minimalformen gegen die Engine bzw. die Brute-Force-Rechnung, nicht gegen die Eingabe des Autors
const fs = require('fs'), path = require('path');
const E = require('../src/engine.js'), B = require('../studio/bool.js');
const P = require('../studio/pfad/kern.js'); require('../studio/pfad/konventionen.js'); require('../studio/pfad/bausteine.js');
fs.readdirSync(path.join(__dirname, '../studio/pfad')).filter(f => /^st_.*\.js$/.test(f)).sort().forEach(f => require('../studio/pfad/' + f));

let ok = 0, bad = 0; const fails = [];
function chk(name, cond, detail) { if (cond) ok++; else { bad++; fails.push(name + (detail !== undefined ? ' – ' + detail : '')); } }
const clone = o => JSON.parse(JSON.stringify(o));
const filter = process.argv[2] || '';
const section = (t) => { if (!filter || t.toLowerCase().includes(filter.toLowerCase())) return true; return false; };

/* ---------- 1. Quine-McCluskey gegen Brute Force ---------- */
function popc(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
function bruteMin(n, ones, dc) {
  const N = 1 << n, on = new Set(ones), okc = new Set(ones.concat(dc)), cubes = [];
  for (let mask = 0; mask < N; mask++) for (let val = 0; val < N; val++) {
    if (val & mask) continue; const cells = []; for (let m = 0; m < N; m++) if ((m & ~mask) === val) cells.push(m);
    if (cells.every(c => okc.has(c)) && cells.some(c => on.has(c))) cubes.push({ mask, val, cells, lits: n - popc(mask) });
  }
  const primes = cubes.filter(a => !cubes.some(b => b !== a && b.cells.length > a.cells.length && a.cells.every(c => b.cells.includes(c))));
  if (!ones.length) return { terms: 0, lits: 0 };
  let best = null, minLits = Infinity;
  for (let sz = 1; sz <= primes.length && best === null; sz++) { // erst kleinste Anzahl, dann wenigste Buchstaben
    const idx = []; (function comb(start) { if (idx.length === sz) { const ch = idx.map(i => primes[i]); if (ones.every(o => ch.some(p => p.cells.includes(o)))) { const l = ch.reduce((s, p) => s + p.lits, 0); if (!best || l < best.lits) best = { terms: sz, lits: l }; } return; } for (let i = start; i < primes.length; i++) { idx.push(i); comb(i + 1); idx.pop(); } })(0);
  }
  for (let sz = 1; sz <= primes.length; sz++) { // kleinste Buchstabenzahl überhaupt (jede Anzahl)
    const idx = []; (function comb(start) { if (idx.length === sz) { const ch = idx.map(i => primes[i]); if (ones.every(o => ch.some(p => p.cells.includes(o)))) minLits = Math.min(minLits, ch.reduce((s, p) => s + p.lits, 0)); return; } for (let i = start; i < primes.length; i++) { idx.push(i); comb(i + 1); idx.pop(); } })(0);
  }
  best.minLits = minLits; best.primes = primes.length; return best;
}
if (section('qmc')) {
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const cases = [];
  for (let n = 1; n <= 3; n++) for (let f = 0; f < (1 << (1 << n)); f++) { const ones = []; for (let k = 0; k < (1 << n); k++) if (f >> k & 1) ones.push(k); cases.push({ n, ones, dc: [] }); }
  for (let i = 0; i < 600; i++) { const n = 4, ones = [], dc = []; for (let k = 0; k < 16; k++) { const r = rnd(); if (r < 0.4) ones.push(k); else if (r < 0.5 && i % 3 === 0) dc.push(k); } cases.push({ n, ones, dc }); }
  for (let i = 0; i < 40; i++) { const n = 5, ones = [], dc = []; for (let k = 0; k < 32; k++) { const r = rnd(); if (r < 0.35) ones.push(k); else if (r < 0.45 && i % 2) dc.push(k); } cases.push({ n, ones, dc }); }
  let wrong = 0, first = '';
  cases.forEach(c => {
    const a = P.minimal(c.n, c.ones, c.dc), b = c.ones.length === (1 << c.n) || (c.ones.length && c.ones.length + c.dc.length === (1 << c.n)) ? { terms: 1, lits: 0, minLits: 0 } : bruteMin(c.n, c.ones, c.dc);
    const good = a.nTerms === b.terms && a.nLits === b.lits && (a.minLits === undefined || a.minLits === b.minLits || !c.ones.length || a.konst);
    if (!good) { wrong++; if (!first) first = JSON.stringify(c) + ' QMC ' + a.nTerms + '/' + a.nLits + '/' + a.minLits + ' brute ' + JSON.stringify(b); }
    // der Ausdruck der Minimalform muss die Funktion selbst erfüllen (nicht nur gleich gross sein)
    const ast = P.minimalAst(a); for (let k = 0; k < (1 << c.n); k++) { if (c.dc.includes(k)) continue; const v = {}; for (let i = 0; i < c.n; i++) v[i + 1] = k >> i & 1; if (B.evalAst(ast, v) !== (c.ones.includes(k) ? 1 : 0)) { wrong++; if (!first) first = 'Funktion falsch ' + JSON.stringify(c); break; } }
  });
  chk('QMC gegen Brute Force (' + cases.length + ' Funktionen mit 1 bis 5 Variablen, auch mit Don\'t-Care)', wrong === 0, first);
}

/* ---------- 2. Prüfarten ---------- */
const N2 = (id, type, ins) => [id, type, ins];
if (section('art')) {
  // tabelle
  const tab = { art: 'tabelle', kopf: ['e1', 'e2', 'A'], zeilen: [['0', '0', { a: '0', typ: 'bit' }], ['0', '1', { a: '1', typ: 'bit' }], ['1', '0', { a: '1', typ: 'bit' }], ['1', '1', { a: '1', typ: 'bit' }]] };
  chk('tabelle: richtig', P.pruefeTabelle(tab, { '0,2': '0', '1,2': '1', '2,2': '1', '3,2': '1' }).ok);
  let r = P.pruefeTabelle(tab, { '0,2': '0', '1,2': '1', '2,2': '0', '3,2': '1' });
  chk('tabelle: falsches Feld abgelehnt und Zeile benannt', !r.ok && /e1 = 1, e2 = 0/.test(r.meldung), r.meldung);
  r = P.pruefeTabelle(tab, { '0,2': '0' }); chk('tabelle: leere Felder gezählt', !r.ok && /3 von 4/.test(r.meldung), r.meldung);
  const num = { art: 'tabelle', kopf: ['Dezimal', 'Dual', 'Hex'], zeilen: [['10', { a: '1010', typ: 'bin' }, { a: 'A', typ: 'hex' }], ['3', { a: '0011', typ: 'bin' }, { a: '3', typ: 'hex' }]] };
  chk('tabelle: Dual mit oder ohne führende Nullen, Hex gross oder klein', P.pruefeTabelle(num, { '0,1': '01010', '0,2': 'a', '1,1': '11', '1,2': '03' }).ok);
  chk('tabelle: Ausdruck-Zelle prüft Gleichwertigkeit', P.pruefeTabelle({ art: 'tabelle', kopf: ['Gatter', 'Ausdruck'], zeilen: [['NAND', { a: '/(e1e2)', typ: 'ausdr', n: 2 }]] }, { '0,1': '/e1 v /e2' }).ok);
  // ausdruck
  const aus = { art: 'ausdruck', n: 3, ref: 'e1e2 v e1/e2 v e1e3' };
  chk('ausdruck: Minimalform angenommen', P.pruefeAusdruck(aus, 'e1').ok, P.pruefeAusdruck(aus, 'e1').meldung);
  r = P.pruefeAusdruck(aus, 'e1e2 v e1/e2'); chk('ausdruck: gleichwertig, aber nicht minimal abgelehnt', !r.ok && r.gleich && /Buchstaben/.test(r.meldung), r.meldung);
  r = P.pruefeAusdruck(aus, 'e1 v e2'); chk('ausdruck: nicht gleichwertig, Gegenbeispiel genannt', !r.ok && /Bei e1 = 0, e2 = 1, e3 = 0 liefert dein Ausdruck 1, verlangt ist 0/.test(r.meldung), r.meldung);
  r = P.pruefeAusdruck(aus, 'e1 ('); chk('ausdruck: Syntaxfehler in Worten', !r.ok && !/undefined/.test(r.meldung), r.meldung);
  r = P.pruefeAusdruck(aus, 'e1 e5'); chk('ausdruck: unbekannter Eingang', !r.ok && /e5/.test(r.meldung), r.meldung);
  chk('ausdruck: ausgeklammerte Form mit weniger Buchstaben angenommen', P.pruefeAusdruck({ art: 'ausdruck', n: 3, ref: 'e1e2 v e1e3' }, 'e1(e2 v e3)').ok);
  const dn = { art: 'ausdruck', n: 2, ones: [1, 2], form: 'dnf' };
  chk('ausdruck: DNF kanonisch angenommen', P.pruefeAusdruck(dn, '/e1e2 v e1/e2').ok, P.pruefeAusdruck(dn, '/e1e2 v e1/e2').meldung);
  chk('ausdruck: DNF verlangt, Kurzform abgelehnt', !P.pruefeAusdruck({ art: 'ausdruck', n: 2, ones: [1, 3], form: 'dnf' }, 'e1').ok);
  chk('ausdruck: KNF kanonisch angenommen (Nullen von e1 v e2: Zeile 0)', P.pruefeAusdruck({ art: 'ausdruck', n: 2, ones: [1, 2, 3], form: 'knf' }, '(e1 v e2)').ok, P.pruefeAusdruck({ art: 'ausdruck', n: 2, ones: [1, 2, 3], form: 'knf' }, '(e1 v e2)').meldung);
  chk('ausdruck: KNF mit falscher Klammerzahl abgelehnt', !P.pruefeAusdruck({ art: 'ausdruck', n: 2, ones: [3], form: 'knf' }, '(e1 v e2)(e1 v /e2)').ok);
  // schaltung
  const xorNetz = P.netz({ n: 2, gatter: [N2('U1', 'xor', ['E1', 'E2'])], aus: { L1: 'U1' } });
  const sch = { art: 'schaltung', n: 2, ausgaenge: 1, f: e => e[0] ^ e[1] };
  chk('schaltung: richtig', P.pruefeSchaltung(sch, xorNetz).ok, P.pruefeSchaltung(sch, xorNetz).meldung);
  r = P.pruefeSchaltung(sch, P.netz({ n: 2, gatter: [N2('U1', 'or', ['E1', 'E2'])], aus: { L1: 'U1' } })); chk('schaltung: falsche Funktion abgelehnt mit Zeile', !r.ok && /Bei e1 = 1, e2 = 1 zeigt die Anzeige eine 1, verlangt ist 0/.test(r.meldung), r.meldung);
  const offen = clone(xorNetz); offen.wires = offen.wires.filter(w => w.to !== 'U1.in2'); r = P.pruefeSchaltung(sch, offen); chk('schaltung: offener Eingang genannt', !r.ok && /U1\.in2.*offen/.test(r.meldung), r.meldung);
  r = P.pruefeSchaltung(sch, P.startNetz(2, 1)); chk('schaltung: leere Vorlage abgelehnt', !r.ok, r.meldung);
  const ohneE = clone(xorNetz); ohneE.parts = ohneE.parts.filter(p => p.id !== 'E2'); ohneE.wires = ohneE.wires.filter(w => !/E2/.test(w.from)); r = P.pruefeSchaltung(sch, ohneE); chk('schaltung: fehlender Pegelschalter genannt', !r.ok && /E2/.test(r.meldung), r.meldung);
  const klash = clone(xorNetz); klash.parts.push({ id: 'U2', type: 'not', x: 0, y: 0, rot: 0 }, { id: 'U3', type: 'not', x: 0, y: 0, rot: 0 }); klash.wires.push({ from: 'E1.out', to: 'U2.in' }, { from: 'E2.out', to: 'U3.in' }, { from: 'U2.out', to: 'U3.out' });
  r = P.pruefeSchaltung(sch, klash); chk('schaltung: Ausgang gegen Ausgang gemeldet', !r.ok && /Ausgang gegen Ausgang/.test(r.meldung), r.meldung);
  chk('schaltung: Don\'t-Care in der Soll-Tabelle wird nicht verlangt', P.pruefeSchaltung({ art: 'schaltung', n: 2, ausgaenge: 1, soll: [[0], [1], ['X'], [1]] }, P.netz({ n: 2, gatter: [N2('U1', 'or', ['E1', 'E2'])], aus: { L1: 'U1' } })).ok);
  // nand
  const nandXor = P.netz({ n: 2, gatter: [N2('U1', 'nand', ['E1', 'E2']), N2('U2', 'nand', ['E1', 'U1']), N2('U3', 'nand', ['E2', 'U1']), N2('U4', 'nand', ['U2', 'U3'])], aus: { L1: 'U4' } });
  const nandA = { art: 'nand', n: 2, ausgaenge: 1, f: e => e[0] ^ e[1] };
  chk('nand: XOR nur aus NAND angenommen', P.pruefeSchaltung(nandA, nandXor).ok, P.pruefeSchaltung(nandA, nandXor).meldung);
  r = P.pruefeSchaltung(nandA, xorNetz); chk('nand: XOR-Gatter abgelehnt, weil nicht NAND', !r.ok && /nur NAND erlaubt/.test(r.meldung), r.meldung);
  r = P.pruefeSchaltung(nandA, P.netz({ n: 2, gatter: [N2('U1', 'nand', ['E1', 'E2']), N2('U2', 'not', ['U1'])], aus: { L1: 'U2' } })); chk('nand: richtige Funktion, aber NICHT-Glied nicht erlaubt', !r.ok && /NICHT/.test(r.meldung), r.meldung);
  // ics
  const icA = { art: 'ics', n: 2, ausgaenge: 1, f: e => e[0] ^ e[1], limit: { nand: 4 }, nur: ['nand'] };
  chk('ics: höchstens 4 NAND angenommen (ein 74HC00)', P.pruefeSchaltung(icA, nandXor).ok);
  const fuenf = clone(nandXor); fuenf.parts.push({ id: 'U5', type: 'nand', x: 0, y: 0, rot: 0 }); fuenf.wires.push({ from: 'E1.out', to: 'U5.in1' }, { from: 'E2.out', to: 'U5.in2' });
  r = P.pruefeSchaltung(icA, fuenf); chk('ics: fünftes Gatter abgelehnt mit Zahl', !r.ok && /5 verbaut, erlaubt sind höchstens 4/.test(r.meldung), r.meldung);
  chk('ics: Gatterzahl insgesamt (gates)', !P.pruefeSchaltung({ art: 'ics', n: 2, ausgaenge: 1, f: e => e[0] ^ e[1], limit: { gates: 3 } }, nandXor).ok);
  // kv
  const kv = { art: 'kv', n: 3, ones: [3, 5, 7, 6] }; // e1e2 (k=3,7), e1e3 (5,7), e2e3 (6,7)  -> e1 e2 = bits 0,1 -> k=3 → e1=1,e2=1,e3=0 …
  const kvm = P.musterKV(kv);
  chk('kv: Muster angenommen', P.pruefeKV(kv, kvm).ok, P.pruefeKV(kv, kvm).meldung);
  r = P.pruefeKV(kv, { gruppen: [[3, 7], [5, 7]], ausdruck: kvm.ausdruck }); chk('kv: fehlende Eins genannt', !r.ok && /Feld 6/.test(r.meldung), r.meldung);
  r = P.pruefeKV(kv, { gruppen: [[3], [5, 7], [6, 7], [3, 7]], ausdruck: kvm.ausdruck }); chk('kv: zu kleines Päckchen abgelehnt (lässt sich vergrössern)', !r.ok && /vergrössern/.test(r.meldung), r.meldung);
  r = P.pruefeKV(kv, { gruppen: [[3, 7], [5, 7], [6, 7, 2, 3]], ausdruck: '' }); chk('kv: Päckchen mit Nullen abgelehnt', !r.ok && /enthält eine 0/.test(r.meldung), r.meldung);
  r = P.pruefeKV(kv, { gruppen: [[3, 5, 7], [6]], ausdruck: '' }); chk('kv: unzulässige Form (drei Felder)', !r.ok && /gültiges Päckchen/.test(r.meldung), r.meldung);
  r = P.pruefeKV(kv, { gruppen: [[3, 7], [5, 7], [6, 7], [5, 7]], ausdruck: kvm.ausdruck }); chk('kv: überzähliges Päckchen abgelehnt', !r.ok && /weniger Päckchen/.test(r.meldung), r.meldung);
  r = P.pruefeKV(kv, { gruppen: kvm.gruppen, ausdruck: 'e1e2 v e1e3' }); chk('kv: Päckchen richtig, Minimalform falsch → Ausdruck beanstandet', !r.ok && /Minimalform/.test(r.meldung), r.meldung);
  chk('kv: Don\'t-Care darf ins Päckchen', P.pruefeKV({ art: 'kv', n: 2, ones: [3], dc: [1] }, { gruppen: [[1, 3]], ausdruck: 'e1' }).ok, P.pruefeKV({ art: 'kv', n: 2, ones: [3], dc: [1] }, { gruppen: [[1, 3]], ausdruck: 'e1' }).meldung);
  chk('kv: Päckchen über den Rand (Ecken) angenommen', P.pruefeKV({ art: 'kv', n: 4, ones: [0, 2, 8, 10] }, { gruppen: [[0, 2, 8, 10]], ausdruck: '/e1/e3' }).ok, P.pruefeKV({ art: 'kv', n: 4, ones: [0, 2, 8, 10] }, { gruppen: [[0, 2, 8, 10]], ausdruck: '/e1/e3' }).meldung);
  // folge: 3-Bit-Aufwärtszähler aus drei T-Flipflops (Ripple, Takt an FF1, Q des einen taktet den nächsten)
  const zaehler = { parts: [{ id: 'C', type: 'logicin', x: 0, y: 0, rot: 0 }, { id: 'FF1', type: 'tff', x: 0, y: 0, rot: 0 }, { id: 'FF2', type: 'tff', x: 0, y: 0, rot: 0 }, { id: 'FF3', type: 'tff', x: 0, y: 0, rot: 0 }, { id: 'H', type: 'logicin', x: 0, y: 0, rot: 0, props: { konst: true, closed: true } },
    { id: 'L1', type: 'logicled', x: 0, y: 0, rot: 0 }, { id: 'L2', type: 'logicled', x: 0, y: 0, rot: 0 }, { id: 'L3', type: 'logicled', x: 0, y: 0, rot: 0 }, { id: 'GND1', type: 'ground', x: 0, y: 0, rot: 0 }],
    wires: [{ from: 'C.out', to: 'FF1.C' }, { from: 'H.out', to: 'FF1.T' }, { from: 'H.out', to: 'FF2.T' }, { from: 'H.out', to: 'FF3.T' }, { from: 'FF1.Qn', to: 'FF2.C' }, { from: 'FF2.Qn', to: 'FF3.C' }, { from: 'FF1.Q', to: 'L1.in' }, { from: 'FF2.Q', to: 'L2.in' }, { from: 'FF3.Q', to: 'L3.in' }] };
  const fo = { art: 'folge', takt: 'C', lesen: ['L3', 'L2', 'L1'], soll: [1, 2, 3, 4, 5, 6, 7, 0, 1] };
  chk('folge: Dualzähler zählt 1 bis 7, 0, 1 – angenommen', P.pruefeFolge(fo, zaehler).ok, P.pruefeFolge(fo, zaehler).meldung);
  const falschZ = clone(zaehler); falschZ.wires = falschZ.wires.map(w => w.from === 'FF2.Qn' ? { from: 'FF2.Q', to: w.to } : w);
  r = P.pruefeFolge(fo, falschZ); chk('folge: falsch verdrahteter Zähler abgelehnt mit Takt und Wert', !r.ok && /Nach dem \d+\. Takt/.test(r.meldung) && /erwartet ist/.test(r.meldung), r.meldung);
  chk('folge: erlaubt auch Schritte mit gesetzten Eingängen und mehreren Takten', P.pruefeFolge({ art: 'folge', takt: 'C', lesen: ['L3', 'L2', 'L1'], schritte: [{ takte: 3, erwartet: [0, 1, 1] }, { takte: 4, erwartet: [1, 1, 1] }] }, zaehler).ok);
  r = P.pruefeFolge(fo, { parts: [{ id: 'L1', type: 'logicled', x: 0, y: 0, rot: 0 }], wires: [] }); chk('folge: fehlender Takteingang genannt', !r.ok && /Takteingang C/.test(r.meldung), r.meldung);
  // fragen, protokoll, vergleich
  const fr = { art: 'fragen', fragen: [{ q: 'a', opt: ['x', 'y'], richtig: 1, erkl: 'weil' }, { q: 'b', opt: ['x', 'y', 'z'], richtig: [0, 2] }] };
  chk('fragen: richtig', P.pruefeFragen(fr, [1, [0, 2]]).ok); r = P.pruefeFragen(fr, [0, [0, 2]]); chk('fragen: falsche Frage genannt mit Erklärung', !r.ok && /Frage 1.*weil/.test(r.meldung), r.meldung);
  chk('fragen: offene Fragen gezählt', /1 Fragen offen/.test(P.pruefeFragen(fr, [1]).meldung));
  chk('protokoll: nur mit Selbstbestätigung, und die Software sagt, dass sie es nicht prüft', !P.pruefeProtokoll({}, {}).ok && /nicht von der Software/.test(P.pruefeProtokoll({}, {}).meldung) && P.pruefeProtokoll({}, { selbst: true }).ok);
  chk('vergleich: erst nach Abgabe', !P.pruefeVergleich({}, {}).ok && P.pruefeVergleich({}, { text: 'ok' }).ok);
  // Dispatch
  chk('pruefe(): unbekannte Art wirft', (() => { try { P.pruefe({ art: 'xyz' }, null); return false; } catch (e) { return true; } })());
}

/* ---------- 3. Fortschritt ---------- */
if (section('stand')) {
  const ids = P.stations.map(s => s.id), s0 = ids[0], s1 = ids[1];
  let st = P.neuerStand();
  chk('Stand: erste Station offen, zweite gesperrt', P.stationStatus(st, s0) === 'offen' && (ids.length < 2 || P.stationStatus(st, s1) === 'gesperrt'), P.stationStatus(st, s0) + '/' + P.stationStatus(st, s1));
  const first = P.get(s0).aufgaben[0];
  P.speichereAntwort(st, first.id, { '0,0': '1' }, 't1'); chk('Stand: Antwort gespeichert → «in Arbeit»', P.aufgabeStatus(st, first.id) === 'arbeit' && P.stationStatus(st, s0) === 'arbeit');
  P.speichereErgebnis(st, first.id, { ok: false, meldung: 'x' }, { a: 1 }, 't2'); chk('Stand: falsche Prüfung → «falsch»', P.aufgabeStatus(st, first.id) === 'falsch' && !P.loesungFrei(st, first.id));
  P.speichereErgebnis(st, first.id, { ok: false, meldung: 'y' }, { a: 2 }, 't3'); chk('Stand: Lösung zeigen erst nach zwei Fehlversuchen', P.loesungFrei(st, first.id));
  P.speichereErgebnis(st, first.id, { ok: true, meldung: 'z' }, { a: 3 }, 't4'); chk('Stand: richtig, Lösung zeigen entfällt', P.aufgabeStatus(st, first.id) === 'richtig' && !P.loesungFrei(st, first.id));
  P.speichereErgebnis(st, first.id, { ok: false, meldung: 'w' }, { a: 4 }, 't5'); chk('Stand: richtig bleibt richtig, auch wenn später ein anderer Versuch falsch ist', P.aufgabeStatus(st, first.id) === 'richtig');
  // Station abschliessen: alle Pflichtaufgaben richtig
  P.get(s0).aufgaben.filter(P.pflicht).forEach(a => P.speichereErgebnis(st, a.id, { ok: true, meldung: '' }, null, 't'));
  chk('Stand: alle Pflichtaufgaben richtig → bestanden', P.stationStatus(st, s0) === 'bestanden');
  if (ids.length > 1) chk('Stand: die nächste Station öffnet sich', P.stationStatus(st, s1) === 'offen');
  // freiwillige zählen nicht mit
  const fw = P.stations.filter(s => s.aufgaben.some(a => a.pflicht === false))[0];
  if (fw) { let t = P.neuerStand(); P.freischalten(t, [fw.id]); fw.aufgaben.filter(P.pflicht).forEach(a => P.speichereErgebnis(t, a.id, { ok: true }, null, 't')); chk('Stand: freiwillige Aufgaben zählen nicht mit (' + fw.id + ')', P.stationStatus(t, fw.id) === 'bestanden'); }
  // Freischaltung durch die Lehrperson
  if (ids.length > 3) { let t = P.neuerStand(); P.freischalten(t, [ids[3]]); chk('Freigabe: Station ohne Fortschritt freischaltbar', P.stationStatus(t, ids[3]) === 'offen' && P.stationStatus(t, ids[2]) === 'gesperrt'); }
  const fd = P.freigabeLesen(P.freigabeDatei([s0, 'GIBTSNICHT'], 'z')); chk('Freigabe: Datei gelesen, unbekannte Station verworfen', fd.ok && fd.ids.join() === s0, JSON.stringify(fd));
  chk('Freigabe: fremde Datei abgelehnt', !P.freigabeLesen('{"format":"x"}').ok && !P.freigabeLesen('kein json').ok && !P.freigabeLesen(JSON.stringify({ format: P.FREIGABE, version: 9 })).ok);
  // Ausgeben und Einlesen
  P.speichereAntwort(st, P.get(s0).aufgaben[1].id, { text: 'Entwurf mit «Umlauten» ä ö ü' }, 'tx'); P.freischalten(st, [ids[ids.length - 1]]);
  const txt = P.exportiere(st, '2026-10-16'), back = P.importiere(txt);
  chk('Ausgeben und Einlesen ergibt denselben Stand', back.ok && JSON.stringify(back.stand) === JSON.stringify(st), back.error);
  chk('Einlesen: neue Version, fremde und kaputte Dateien abgelehnt', !P.importiere(JSON.stringify({ format: P.FORMAT, version: 99, stand: st })).ok && !P.importiere('{"format":"anderes"}').ok && !P.importiere('{kaputt').ok && !P.importiere(JSON.stringify({ format: P.FORMAT, version: 1, stand: {} })).ok);
  const fremd = JSON.parse(txt); fremd.stand.stationen.ZZ9 = { aufgaben: {} }; chk('Einlesen: unbekannte Stationen werden verworfen', !('ZZ9' in P.importiere(JSON.stringify(fremd)).stand.stationen));
}

/* ---------- 3b. Der ganze Pfad von vorn bis hinten ---------- */
if (section('pfad')) {
  const st = P.neuerStand(), ids = P.stations.map(s => s.id); let ok1 = true, fehler = '';
  ids.forEach((id, i) => {
    const vor = P.stationStatus(st, id); if (vor !== 'offen') { ok1 = false; fehler += ' ' + id + ' war «' + vor + '» statt offen;'; }
    if (i + 1 < ids.length && P.stationStatus(st, ids[i + 1]) !== 'gesperrt') { ok1 = false; fehler += ' ' + ids[i + 1] + ' war nicht gesperrt;'; }
    P.get(id).aufgaben.filter(P.pflicht).forEach(a => { const r = P.pruefe(a, P.muster(a)); P.speichereErgebnis(st, a.id, r, P.muster(a), 't'); if (!r.ok) { ok1 = false; fehler += ' ' + a.id + ' ' + r.meldung + ';'; } });
    if (P.stationStatus(st, id) !== 'bestanden') { ok1 = false; fehler += ' ' + id + ' nicht bestanden;'; }
  });
  chk('Der ganze Pfad: ' + ids.length + ' Stationen nacheinander, jede öffnet sich erst, wenn die vorige bestanden ist; alle bestehen mit der Musterlösung' + fehler, ok1);
  chk('Der ganze Pfad: Fortschritt nach dem Durchlauf übersteht Ausgeben und Einlesen', JSON.stringify(P.importiere(P.exportiere(st, 'z')).stand) === JSON.stringify(st));
  chk('Der ganze Pfad: 26 Stationen A1 bis A13 und B1 bis B13', ids.length === 26 && ids.slice(0, 13).join() === 'A1,A2,A3,A4,A5,A6,A7,A8,A9,A10,A11,A12,A13' && ids.slice(13).join() === 'B1,B2,B3,B4,B5,B6,B7,B8,B9,B10,B11,B12,B13', ids.join());
  const lab = P.stations.filter(s => s.auto === false).map(s => s.id); chk('Laborstationen sind gekennzeichnet (nur A2)', lab.join() === 'A2', lab.join());
}

/* ---------- 3c. Stufe 2: Zusammenführen und Zusammenfassung (Anbindung an das Portal) ---------- */
if (section('portal')) {
  let seed = 424242; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const alle = []; P.stations.forEach(s => s.aufgaben.forEach(a => alle.push(a.id)));
  const zufall = () => { const st = P.neuerStand(); alle.forEach(aid => { const r = rnd(); if (r < 0.15) P.speichereErgebnis(st, aid, { ok: true, meldung: 'r' }, { x: aid }, 't' + Math.floor(rnd() * 9)); else if (r < 0.3) { P.speichereErgebnis(st, aid, { ok: false, meldung: 'f' }, { y: aid }, 't'); if (rnd() < 0.5) P.speichereErgebnis(st, aid, { ok: false, meldung: 'f' }, { y: aid }, 't'); } else if (r < 0.4) P.speichereAntwort(st, aid, { z: aid }, 't'); if (rnd() < 0.05) P.markiereGezeigt(st, aid, 't'); }); if (rnd() < 0.5) P.freischalten(st, ['A' + (1 + Math.floor(rnd() * 13))]); st.geaendert = '2026-10-16T' + String(10 + Math.floor(rnd() * 9)).padStart(2, '0') + ':00:00Z'; return st; };
  let verloren = 0, nichtIdem = 0, nichtKomm = 0, veraendert = 0, stationVerloren = 0;
  for (let n = 0; n < 200; n++) {
    const a = zufall(), b = zufall(), sa = JSON.stringify(a), sb = JSON.stringify(b), m = P.zusammen(a, b), m2 = P.zusammen(b, a);
    if (JSON.stringify(a) !== sa || JSON.stringify(b) !== sb) veraendert++;
    alle.forEach(aid => { const ra = P.aufgabeStatus(a, aid) === 'richtig', rb = P.aufgabeStatus(b, aid) === 'richtig', rm = P.aufgabeStatus(m, aid) === 'richtig'; if ((ra || rb) !== rm) verloren++; if (P.aufgabeStatus(m, aid) !== P.aufgabeStatus(m2, aid)) nichtKomm++; const ea = P.eintrag(a, aid), eb = P.eintrag(b, aid), em = P.eintrag(m, aid); if ((ea && ea.gezeigt || eb && eb.gezeigt) && !(em && em.gezeigt)) verloren++; if (em && em.versuche < Math.max(ea ? ea.versuche : 0, eb ? eb.versuche : 0)) verloren++; });
    P.stations.forEach(s => { if ((P.stationFertig(a, s.id) || P.stationFertig(b, s.id)) && !P.stationFertig(m, s.id)) stationVerloren++; });
    if (JSON.stringify(P.zusammen(m, m)) !== JSON.stringify(m)) nichtIdem++;
  }
  chk('Zusammenführen (200 Zufallspaare): richtig, «gezeigt» und Versuche gehen nie verloren, keine Station fällt zurück', verloren === 0 && stationVerloren === 0, verloren + '/' + stationVerloren);
  chk('Zusammenführen: gleiche Aufgabenzustände in beiden Reihenfolgen, wiederholtes Zusammenführen ändert nichts, die Eingaben bleiben unverändert', nichtKomm === 0 && nichtIdem === 0 && veraendert === 0, nichtKomm + '/' + nichtIdem + '/' + veraendert);
  const x = P.neuerStand(), y = P.neuerStand(); P.speichereErgebnis(x, 'A1.1', { ok: true }, { a: 1 }, 't'); P.speichereErgebnis(y, 'A1.2', { ok: true }, { a: 2 }, 't'); P.freischalten(x, ['A4']); P.freischalten(y, ['A7']);
  const xy = P.zusammen(x, y); chk('Zusammenführen: zwei Geräte mit verschiedenem Fortschritt ergeben die Vereinigung (A1.1 und A1.2 richtig, Freigaben A4 und A7)', P.aufgabeStatus(xy, 'A1.1') === 'richtig' && P.aufgabeStatus(xy, 'A1.2') === 'richtig' && xy.frei.join() === 'A4,A7');
  // Zusammenfassung
  const full = P.neuerStand(); P.stations.forEach(s => s.aufgaben.forEach(a => P.speichereErgebnis(full, a.id, { ok: true, meldung: 'ok' }, P.muster(a), 't')));
  const z = P.zusammenfassung(full), zs = JSON.stringify(z);
  chk('Zusammenfassung: 26 Stationen, alle «b», Aufgabenzeichenkette so lang wie die Aufgabenliste, Summen stimmen', Object.keys(z.stationen).length === 26 && P.stations.every(s => z.stationen[s.id].s === 'b' && z.stationen[s.id].a === 'r'.repeat(s.aufgaben.length) && z.stationen[s.id].r === z.stationen[s.id].p) && z.tasks === z.totalTasks && z.stations === 26, zs.slice(0, 120));
  chk('Zusammenfassung: klein (' + zs.length + ' Zeichen), enthält keine Antworten und keine Namen', zs.length < 6000 && !/antwort|meldung|vorname|nachname/i.test(zs));
  const leer = P.zusammenfassung(P.neuerStand()); chk('Zusammenfassung: leerer Stand → A1 offen, alle übrigen offen, 0 Aufgaben', leer.tasks === 0 && leer.stations === 0 && leer.stationen.A1.s === 'o' && /^o+$/.test(leer.stationen.A1.a));
  const mid = P.neuerStand(); P.speichereErgebnis(mid, 'A1.1', { ok: true }, {}, 't'); P.speichereErgebnis(mid, 'A1.2', { ok: false }, {}, 't'); P.speichereAntwort(mid, 'A1.3', { a: 1 }, 't'); const zm = P.zusammenfassung(mid).stationen.A1; chk('Zusammenfassung: in Arbeit, Zeichenkette r f a o o', zm.s === 'a' && zm.a === 'rfaoo' && zm.r === 1 && zm.p === 5, JSON.stringify(zm));
  // Stand für den Server
  const fs2 = P.fuerServer(full), sz = JSON.stringify(full).length, sz2 = JSON.stringify(fs2).length;
  chk('Stand für den Server: gelöste Schaltungsaufgaben behalten kein Layout (' + sz + ' → ' + sz2 + ' Zeichen), der Rest bleibt', sz2 < sz && JSON.stringify(full) === JSON.stringify(full) && P.aufgabeStatus(fs2, 'A5.3') === 'richtig' && P.eintrag(fs2, 'A5.3').antwort === null && P.eintrag(fs2, 'A5.2').antwort === P.eintrag(full, 'A5.2').antwort && sz2 < 700000);
  const halb = P.neuerStand(); P.speichereAntwort(halb, 'A5.3', P.muster(P.task('A5.3')), 't'); chk('Stand für den Server: Layout einer noch nicht gelösten Aufgabe bleibt erhalten', P.eintrag(P.fuerServer(halb), 'A5.3').antwort && P.eintrag(P.fuerServer(halb), 'A5.3').antwort.parts.length > 0);
}


/* ---------- 5b. Stevens Originalserien (docs/aufgaben): Vorgaben, gleichwertige Minimalformen, Stellenwertigkeit ---------- */
if (section('original')) {
  const rev = (ones, n) => ones.map(k => { let r = 0; for (let i = 0; i < n; i++) if (k >> i & 1) r |= 1 << (n - 1 - i); return r; }).sort((x, y) => x - y); // JSON der Booleschen Algebra nummeriert e1 als höchstes Bit, das Studio als niedrigstes: gleiche Funktion, andere Nummern
  const J = n => require('../../docs/aufgaben/' + n + '.json'), ALG = J('boolesche_algebra'), KV = J('kv_diagramm'), a8 = P.get('A8'), a10 = P.get('A10');
  // A8: jede Aufgabe der Serie, gegen die JSON-Vorgabe
  ALG.forEach(r => {
    const a = a8.aufgaben.find(x => x.id === 'A8.' + r.nr), n = r.variablen.length, ref = P.refOf(a), m = P.minimal(ref.n, ref.ones, ref.dc), nm = P.namen(a);
    chk('A8 Aufgabe ' + r.nr + ': Ausdruck wie im JSON, Minterme des JSON = gerechnete Minterme (' + r.minterme.join(',') + ')', a.gegeben === r.ausdruck && rev(ref.ones, n).join() === r.minterme.join() && ref.n === n, rev(ref.ones, n).join() + ' (JSON: e1 = höchstes Bit)');
    chk('A8 Aufgabe ' + r.nr + ': eigene Minimalform hat ' + m.nTerms + ' Terme und ' + m.nLits + ' Buchstaben, JSON ' + r.terme + ' / ' + r.buchstaben, m.nTerms === r.terme && m.nLits === r.buchstaben && a.erwartet.terme === r.terme && a.erwartet.buchstaben === r.buchstaben);
    chk('A8 Aufgabe ' + r.nr + ': die Minimalform aus dem JSON (' + r.minimalform + ') wird angenommen', P.pruefe(a, r.minimalform).ok, P.pruefe(a, r.minimalform).meldung);
    chk('A8 Aufgabe ' + r.nr + ': Pflicht ' + (r.nr !== 12), (a.pflicht !== false) === (r.nr !== 12));
    // richtig, aber nicht minimiert: der Originalausdruck selbst und die kanonische Summenform
    const g = P.litCount(B.clean(B.parse(a.gegeben).ast)), kan = ref.ones.map(k => { const s = []; for (let i = 0; i < n; i++) s.push((k >> i & 1 ? '' : '/') + 'e' + (i + 1)); return s.join(''); }).join(' v ') || '0', kl = ref.ones.length * n;
    if (g > r.buchstaben) { const x = P.pruefe(a, a.gegeben); chk('A8 Aufgabe ' + r.nr + ': der Originalausdruck (' + g + ' Buchstaben) ist richtig, aber nicht minimiert → abgelehnt', !x.ok && /Gleichwertig/.test(x.meldung) && /nicht einfach genug/.test(x.meldung), x.meldung); }
    if (kl > r.buchstaben) { const x = P.pruefe(a, kan); chk('A8 Aufgabe ' + r.nr + ': die kanonische Form (' + kl + ' Buchstaben) ist richtig, aber nicht minimiert → abgelehnt', !x.ok, x.meldung); }
    if (n >= 2) { const x = P.pruefe(a, r.minimalform.replace(/e1/, 'e1 v e1 e2 v e2 e2')); } // nur Aufruf: darf nicht abstürzen
  });
  chk('A8 Aufgabe 1 (Förderband-Übung): Vereinfachen der DNF auf e1 v e2; die DNF selbst wird abgelehnt', P.pruefe(a8.aufgaben.find(a => a.id === 'A8.1'), 'e2 v e1').ok && !P.pruefe(a8.aufgaben.find(a => a.id === 'A8.1'), '/e2e1 v e2/e1 v e2e1').ok);
  chk('A8 Aufgabe 18 (Zusatzübung KNF/DNF) und Aufgabe 12 sind freiwillig, alle anderen Aufgaben 1 bis 17 Pflicht', ['A8.12', 'A8.18a', 'A8.18b'].every(id => a8.aufgaben.find(a => a.id === id).pflicht === false) && a8.aufgaben.filter(a => /^A8\.\d+$/.test(a.id) && +a.id.slice(3) <= 17 && +a.id.slice(3) !== 12).every(a => a.pflicht !== false));
  chk('A8 Zusatzübung (Gesetze nachweisen) ist freiwillig und als eigene Übung gekennzeichnet', a8.aufgaben.filter(a => +a.id.slice(3) >= 21).every(a => a.pflicht === false && /Zusatz \(eigene Übung\)/.test(a.titel)));
  // A10: alle Aufgaben der Serie gegen die JSON-Vorgabe
  const covers = (n, ones, dc) => { // alle Überdeckungen mit kleinster Termzahl und kleinster Buchstabenzahl (aus den Primimplikanten, durch Aufzählen aller Teilmengen)
    const m = P.minimal(n, ones, dc), pr = m.primes, cells = p => { const o = []; for (let k = 0; k < (1 << n); k++) if ((k & ~p.mask & ((1 << n) - 1)) === p.val) o.push(k); return o; }, out = [];
    const idx = []; (function comb(start) { if (idx.length === m.nTerms) { const ch = idx.map(i => pr[i]); if (ones.every(o => ch.some(p => cells(p).includes(o))) && ch.reduce((s, p) => s + n - popc(p.mask), 0) === m.nLits) out.push(ch); return; } for (let i = start; i < pr.length; i++) { idx.push(i); comb(i + 1); idx.pop(); } })(0);
    return { m, out, cells };
  };
  KV.forEach(r => {
    const a = a10.aufgaben.find(x => x.id === 'A10.' + r.nr), n = r.eingaenge, nm = P.namen(a), m = P.minimal(n, r.einsen, r.egal);
    chk('A10 Aufgabe ' + r.nr + ': Einsen und X wie im JSON, Buchstaben ' + a.buchstaben + ' (a niederwertigstes Bit)', a.ones.join() === r.einsen.join() && a.dc.join() === r.egal.join() && a.n === n && a.buchstaben === 'abcdef'.slice(0, n) && r.variablen.join('') === 'abcdef'.slice(0, n).split('').reverse().join(''));
    chk('A10 Aufgabe ' + r.nr + ': eigene Minimalform ' + m.nTerms + ' Terme / ' + m.nLits + ' Buchstaben = JSON ' + r.terme + ' / ' + r.buchstaben, m.nTerms === r.terme && m.nLits === r.buchstaben);
    const cv = covers(n, r.einsen, r.egal); chk('A10 Aufgabe ' + r.nr + ': ' + cv.out.length + ' gleichwertige Minimalform(en), JSON sagt ' + r.gleichwertige_loesungen, cv.out.length === r.gleichwertige_loesungen);
    // jede gleichwertige Minimalform wird mit ihren Päckchen angenommen; die Form aus dem JSON ebenfalls (als Ausdruck)
    cv.out.forEach((ch, i) => { const groups = ch.map(p => cv.cells(p)), expr = ch.map(p => B.fmtText(P.termAst(n, p), nm)).join(' v '); const x = P.pruefeKV(a, { gruppen: groups, ausdruck: expr }); chk('A10 Aufgabe ' + r.nr + ': Minimalform ' + (i + 1) + ' von ' + cv.out.length + ' (' + expr + ') wird angenommen', x.ok, x.meldung); });
    chk('A10 Aufgabe ' + r.nr + ': Ausdruck aus dem JSON (' + r.minimalform + ') mit passenden Päckchen angenommen', cv.out.some(ch => P.pruefeKV(a, { gruppen: ch.map(p => cv.cells(p)), ausdruck: r.minimalform }).ok));
    // richtig, aber nicht minimiert: alle Primimplikanten als Päckchen (zu viele), kanonische Summe als Ausdruck
    if (m.primes.length > m.nTerms) { const x = P.pruefeKV(a, { gruppen: m.primes.map(p => cv.cells(p)), ausdruck: B.fmtText(P.minimalAst(m), nm) }); chk('A10 Aufgabe ' + r.nr + ': alle Primimplikanten als Päckchen (nicht minimiert) → abgelehnt', !x.ok, x.meldung); }
    const kan = r.einsen.map(k => { const s = []; for (let i = 0; i < n; i++) s.push((k >> i & 1 ? '' : '/') + 'abcdef'[i]); return s.join(''); }).join(' v '), kl = r.einsen.length * n;
    if (kl > r.buchstaben) { const x = P.pruefeKV(a, { gruppen: m.terms.map(p => cv.cells(p)), ausdruck: kan }); chk('A10 Aufgabe ' + r.nr + ': richtige Päckchen, aber die Einsen einzeln ausgeschrieben (' + kl + ' Buchstaben) → abgelehnt', !x.ok && /Minimalform/.test(x.meldung), x.meldung); }
    chk('A10 Aufgabe ' + r.nr + ': Pflicht ' + !(r.nr >= 7 && r.nr <= 10), (a.pflicht !== false) === !(r.nr >= 7 && r.nr <= 10));
  });
  { // Aufgabe 6 ausdrücklich: vier verschiedene Minimalformen, alle angenommen
    const a = a10.aufgaben.find(x => x.id === 'A10.6'), cv = covers(4, a.ones, a.dc), formen = cv.out.map(ch => ch.map(p => B.fmtText(P.termAst(4, p), P.namen(a))).sort().join(' v '));
    chk('A10 Aufgabe 6: genau vier verschiedene gleichwertige Minimalformen (' + formen.length + ': ' + formen.join(' | ') + ')', cv.out.length === 4 && new Set(formen).size === 4);
    chk('A10 Aufgabe 6: alle vier werden angenommen, mit je 3 Termen und 6 Buchstaben', cv.out.every(ch => ch.length === 3 && P.pruefeKV(a, { gruppen: ch.map(p => cv.cells(p)), ausdruck: ch.map(p => B.fmtText(P.termAst(4, p), P.namen(a))).join(' v ') }).ok));
    const aus = P.pruefe(a10.aufgaben.find(x => x.id === 'A10.6'), { gruppen: [], ausdruck: "d'a' + c'b + cb'" }); chk('A10 Aufgabe 6: der Ausdruck aus dem JSON ohne Päckchen wird nicht angenommen (Päckchen fehlen)', !aus.ok);
  }
  { // Stellenwertigkeit: d'cb'a' = 0100 = Feld 4, Feldnummer = d·8 + c·4 + b·2 + a
    const a = a10.aufgaben.find(x => x.id === 'A10.1'), v = B.parse("d'cb'a'", { letters: 'abcdef' }).ast; let k4 = -1; for (let k = 0; k < 16; k++) { const o = {}; for (let i = 0; i < 4; i++) o[i + 1] = k >> i & 1; if (B.evalAst(v, o)) k4 = k; }
    chk("Stellenwertigkeit: d'cb'a' ist das Feld 4 (0100), d höchstwertig, a niederwertigst", k4 === 4);
    const ab = P.refOf({ ref: "d'cb'a' + dcba", n: 4, buchstaben: 'abcdef' }); chk('Stellenwertigkeit: d·8 + c·4 + b·2 + a: Feld 15 ist dcba, Feld 8 ist dc\'b\'a\'', ab.ones.join() === '4,15' && P.refOf({ ref: "dc'b'a'", n: 4, buchstaben: 'abcdef' }).ones.join() === '8');
    chk('Stellenwertigkeit: in der Serie 5 mit m4(5,7) + X(…) bedeutet 5 = d\'cb\'a (0101) und 7 = d\'cba (0111)', P.refOf({ ref: "d'cb'a + d'cba", n: 4, buchstaben: 'abcdef' }).ones.join() === '5,7');
  }
  // Sonderaufgaben 11 bis 13
  ['A10.11a', 'A10.11b', 'A10.12a', 'A10.12b', 'A10.13a', 'A10.13b'].forEach(id => chk('A10 ' + id + ' ist freiwillig', a10.aufgaben.find(a => a.id === id).pflicht === false));
  chk('A10 Aufgabe 11: BCD\' + BCD + AB\'C\' + A\'B\'C\' = BC + B\'C\' (2 Terme, 4 Buchstaben)', (() => { const a = a10.aufgaben.find(x => x.id === 'A10.11a'); return P.pruefe(a, "BC + B'C'").ok && !P.pruefe(a, "BCD' + BCD + B'C'").ok; })());
  chk('A10 Aufgabe 12a: Mehrheit ab + ac + bc (6 Buchstaben); 12b: c', P.pruefeAusdruck(a10.aufgaben.find(x => x.id === 'A10.12a'), 'ab + ac + bc').ok && P.pruefeAusdruck(a10.aufgaben.find(x => x.id === 'A10.12b'), 'c').ok && !P.pruefeAusdruck(a10.aufgaben.find(x => x.id === 'A10.12b'), "cb + cb'").ok);
  chk('A10 Aufgabe 13b: (a + b)(b + c)(c + a) wird als Produktform angenommen, ab + ac + bc nicht', P.pruefe(a10.aufgaben.find(x => x.id === 'A10.13b'), '(a + b)(b + c)(c + a)').ok && !P.pruefe(a10.aufgaben.find(x => x.id === 'A10.13b'), 'ab + ac + bc').ok);
  const w = a10.aufgaben.find(x => x.id === 'A10.13a'); chk('A10 Aufgabe 13a: die drei Ausdrücke sind in jeder Zeile gleich', w.zeilen.every(r => { const v = [r[3], r[4], r[5]].map(c => [].concat(c.a)[0]); return v[0] === v[1] && v[1] === v[2]; }));
  chk('A10 Zusatz (eigene Übung) ist freiwillig und gekennzeichnet', a10.aufgaben.filter(a => +a.id.slice(4) >= 20).every(a => a.pflicht === false && /eigene Übung/.test(a.titel)));
}

/* ---------- 4. Stationen ---------- */
const GRUND = ['logicin', 'logicled', 'ground', 'node'];
function mutiere(a, muster) { // eine bewusst falsche Antwort zur Musterlösung
  switch (a.art) {
    case 'tabelle': { const m = Object.assign({}, muster), k = Object.keys(m)[0]; m[k] = m[k] === '1' ? '0' : m[k] === '0' ? '1' : m[k] + '9'; return m; }
    case 'ausdruck': return muster.indexOf('/') === 0 || /^\(/.test(muster) ? 'e1' + (a.n > 1 ? ' v e2' : '') + ' v ' + (a.n > 2 ? 'e3' : 'e1') + ' v 1' : '/(' + muster + ')';
    case 'schaltung': case 'nand': case 'ics': case 'folge': { const l = clone(muster); l.wires.pop(); return l; }
    case 'kv': return { gruppen: muster.gruppen.slice(1), ausdruck: muster.ausdruck };
    case 'fragen': return muster.map((x, i) => i === 0 ? (Array.isArray(x) ? [] .concat(x.length > 1 ? x.slice(1) : [99]) : (x + 1) % 3 + (x === 2 ? 0 : 0)) : x);
    case 'protokoll': return {};
    case 'vergleich': return {};
  }
}
if (section('station')) {
  P.pruefeDaten().forEach(p => chk('Stationsdaten: ' + p, false));
  chk('Stationsdaten vollständig (Feldnamen, Prüfarten, ss statt ß)', true);
  P.stations.forEach(s => {
    let nGeprueft = 0, nFalsch = 0;
    s.aufgaben.forEach(a => {
      const m = P.muster(a);
      const r = P.pruefe(a, m); chk(s.id + ' ' + a.id + ' ' + a.titel + ': Musterlösung wird angenommen', r.ok, r.meldung); nGeprueft++;
      const f = a.falsch !== undefined ? a.falsch : mutiere(a, m);
      if (f !== undefined) { let r2; try { r2 = P.pruefe(a, f); } catch (e) { r2 = { ok: false, meldung: 'Ausnahme ' + e.message }; } chk(s.id + ' ' + a.id + ': falsche Lösung wird abgelehnt', !r2.ok && r2.meldung && !/Ausnahme|undefined|NaN/.test(r2.meldung), r2.meldung); nFalsch++; if (r2.meldung && /undefined|NaN/.test(r2.meldung)) chk(a.id + ' Rückmeldung ohne undefined', false, r2.meldung); }
      // Bauteile der Musterlösung sind bis zu dieser Station freigeschaltet
      if (['schaltung', 'nand', 'ics', 'folge'].includes(a.art)) {
        const pal = P.palette(a).concat(GRUND), fremd = Object.keys(P.zaehle(m)).filter(t => !pal.includes(t));
        chk(s.id + ' ' + a.id + ': Bauteile der Musterlösung sind freigeschaltet', !fremd.length, 'fehlt: ' + fremd.join(','));
      }
    });
    chk(s.id + ': Pflichtaufgaben vorhanden und jede Aufgabe hat eine Prüfung', s.aufgaben.filter(P.pflicht).length > 0 && nGeprueft === s.aufgaben.length);
  });
}

/* ---------- 5. Fachlich: A5 gegen die Engine ---------- */
if (section('fachlich')) {
  const a5 = P.get('A5');
  if (a5) {
    const typ = { 'Trennstufe': null, 'NICHT': 'not', 'UND': 'and', 'NAND': 'nand', 'ODER': 'or', 'NOR': 'nor', 'XOR': 'xor', 'XNOR': 'xnor' };
    a5.aufgaben.forEach(a => {
      const name = a.titel.split(':')[0], t = typ[name], n = a.n || (a.kopf ? a.kopf.length - 1 : 2);
      // Engine-Tabelle des Gatters (aus der Simulation, nicht aus der Eingabe)
      const lay = t ? P.netz({ n, gatter: [['U1', t, n === 1 ? ['E1'] : ['E1', 'E2']]], aus: { L1: 'U1' } }) : P.netz({ n: 1, gatter: [['U1', 'not', ['E1']], ['U2', 'not', ['U1']]], aus: { L1: 'U2' } });
      const tab = B.circuitTable(lay); // Zeile k: e1 = Bit 0
      if (a.art === 'tabelle') {
        a.zeilen.forEach((row, r) => { let k = 0; for (let i = 0; i < n; i++) if (row[i] === '1') k |= 1 << i; chk('A5 ' + a.id + ' Tabellenzeile ' + r + ' stimmt mit der Simulation überein', String(tab.rows[k][0]) === row[n].a, 'Sim ' + tab.rows[k][0] + ' Tabelle ' + row[n].a); });
      } else if (a.art === 'ausdruck') {
        const ast = B.parse(a.ref).ast; let allOk = true; for (let k = 0; k < (1 << n); k++) { const v = {}; for (let i = 0; i < n; i++) v[i + 1] = k >> i & 1; if (B.evalAst(ast, v) !== tab.rows[k][0]) allOk = false; }
        chk('A5 ' + a.id + ' Ausdruck ' + a.ref + ' entspricht der Simulation', allOk);
      } else if (a.art === 'schaltung') {
        chk('A5 ' + a.id + ' Soll-Tabelle entspricht der Simulation des Gatters', a.soll.every((r, k) => r[0] === tab.rows[k][0]));
      }
    });
  }
  // A1: Zahlensysteme mit parseInt nachgerechnet (nicht mit den Funktionen, die die Tabelle gebaut haben)
  const a1 = P.get('A1');
  if (a1) a1.aufgaben.filter(a => a.art === 'tabelle').forEach(a => a.zeilen.forEach((row, r) => {
    const val = c => P.isAns(c) ? [].concat(c.a)[0] : c, d = parseInt(val(row[0]), 10), dual = val(row[1]), hex = val(row[2]);
    const dz = Number.isFinite(d) ? d : null, ok1 = parseInt(dual, 2) === parseInt(hex, 16) && (dz === null || dz === parseInt(dual, 2)) && (dual === String(parseInt(dual, 2).toString(2)).padStart(dual.length, '0'));
    chk('A1 ' + a.id + ' Zeile ' + (r + 1) + ': Dezimal, Dual und Hex stimmen überein (parseInt)', ok1, d + ' / ' + dual + ' / ' + hex);
  }));
  // A6: negative Logik aus den Gatterdefinitionen der Engine: f_neg(e) = NICHT f(NICHT e) muss die genannte Funktion sein
  const a6 = P.get('A6');
  if (a6) {
    const TY = { 'Trennstufe': e => e[0], 'NICHT': e => !e[0], 'UND': e => e.every(Boolean), 'NAND': e => !e.every(Boolean), 'ODER': e => e.some(Boolean), 'NOR': e => !e.some(Boolean), 'XOR': e => e.filter(Boolean).length === 1, 'XNOR': e => e.filter(Boolean).length !== 1 };
    const eng = { 'NICHT': 'not', 'UND': 'and', 'NAND': 'nand', 'ODER': 'or', 'NOR': 'nor', 'XOR': 'xor', 'XNOR': 'xnor' };
    Object.keys(eng).forEach(n => chk('A6 Gatterdefinition «' + n + '» stimmt mit der Engine überein', [0, 1, 2, 3].every(k => { const e = [!!(k & 1), !!(k >> 1 & 1)], inp = n === 'NICHT' ? [e[0]] : e; return !!TY[n](inp) === !!E.PARTS[eng[n]].logic(inp); })));
    a6.aufgaben.find(a => a.id === 'A6.1').zeilen.forEach(row => { const pos = row[0], neg = [].concat(row[1].a)[0], n = pos === 'NICHT' || pos === 'Trennstufe' ? 1 : 2;
      let same = true; for (let k = 0; k < (1 << n); k++) { const e = Array.from({ length: n }, (_, i) => !!(k >> i & 1)); if (!TY[pos](e.map(x => !x)) !== !!TY[neg](e)) same = false; }
      chk('A6.1 ' + pos + ' → ' + neg + ': NICHT f(NICHT e) = ' + neg + ' (Engine-Definition)', same); });
  }
  // A7, A8, A9: Soll-Tabellen gegen gewöhnliche Rechnung beziehungsweise gegen den Parser
  const a7 = P.get('A7');
  if (a7) {
    // Stevens Förderband: Tabelle Dez, E2, E1, A = 0, 1, 1, 1; Lösung DNF = n(E2)*E1 + E2*n(E1) + E2*E1, KNF = (E2 + E1)
    const t1 = a7.aufgaben.find(a => a.id === 'A7.1'), t2 = a7.aufgaben.find(a => a.id === 'A7.2');
    chk('A7 Förderband: Tabelle aus dem Lehrmittel (A = 1 ausser bei E1 = E2 = 0): Einsen ' + t1.ones.join(), t1.ones.join() === '1,2,3' && t2.ones.join() === '1,2,3');
    chk('A7 Förderband: die DNF des Lehrmittels (n(E2)*E1 + E2*n(E1) + E2*E1) wird angenommen', P.pruefe(t1, 'n(E2)*E1 + E2*n(E1) + E2*E1').ok, P.pruefe(t1, 'n(E2)*E1 + E2*n(E1) + E2*E1').meldung);
    chk('A7 Förderband: die KNF des Lehrmittels (E2 + E1) wird angenommen', P.pruefe(t2, '(E2 + E1)').ok, P.pruefe(t2, '(E2 + E1)').meldung);
    chk('A7 Förderband: eine richtige, aber nicht kanonische Form (nur E1 + E2 als DNF) wird abgelehnt', !P.pruefe(t1, 'E1 + E2').ok && !P.pruefe(t2, '(E1 + E2)(E1 + /E2)').ok);
    const m = a7.aufgaben.find(a => a.id === 'A7.5'); chk('A7.5 Mehrheit (Zusatz): A = 1 bei mindestens zwei Einsen', m.zeilen.every(r => +[].concat(r[3].a)[0] === (+r[0] + +r[1] + +r[2] >= 2 ? 1 : 0)));
    chk('A7 Zusatzaufgaben sind freiwillig und als eigene Übung gekennzeichnet', ['A7.5', 'A7.6', 'A7.7'].every(id => { const x = a7.aufgaben.find(a => a.id === id); return x.pflicht === false && /Zusatz|nicht aus Stevens/.test(x.titel + x.text); })); }
  const a8 = P.get('A8');
  if (a8) {
    const J = { 'A8.21': [(a, b) => a & b, (a, b) => b & a, (a, b) => a | b, (a, b) => b | a], 'A8.22': [(a, b, c) => (a & b) & c, (a, b, c) => a & (b & c)], 'A8.23': [(a, b, c) => a & (b | c), (a, b, c) => (a & b) | (a & c)],
      'A8.24': [(a, b, c) => a | (b & c), (a, b, c) => (a | b) & (a | c)], 'A8.25': [(a, b) => 1 - (a & b), (a, b) => (1 - a) | (1 - b)], 'A8.26': [(a, b) => 1 - (a | b), (a, b) => (1 - a) & (1 - b)], 'A8.27': [(a, b) => a | (a & b), (a, b) => a & (a | b)] };
    Object.keys(J).forEach(id => { const t = a8.aufgaben.find(a => a.id === id), n = t.kopf.length - J[id].length; chk('A8 ' + id + ' ' + t.titel + ': alle Spalten gegen JavaScript-Operatoren', t.zeilen.every(r => J[id].every((f, j) => +[].concat(r[n + j].a)[0] === f.apply(null, r.slice(0, n).map(Number))))); });
    ['A8.21', 'A8.22', 'A8.23', 'A8.24', 'A8.25', 'A8.26', 'A8.27'].slice(1).forEach(id => { const t = a8.aufgaben.find(a => a.id === id), n = t.kopf.length - 2; chk('A8 ' + id + ': beide Seiten des Gesetzes sind in jeder Zeile gleich', t.zeilen.every(r => [].concat(r[n].a)[0] === [].concat(r[n + 1].a)[0] || id === 'A8.27')); });
  }
  const a9 = P.get('A9');
  if (a9) {
    // Stevens Originalaufgaben (docs/aufgaben/A9_ORIGINAL.md): A = e1·e2·(e3+e4)·e5 nur mit NAND (auch NAND mit drei Eingängen); A1 = n(A+C)·B mit höchstens vier NOR und vier UND
    const t1 = a9.aufgaben.find(x => x.id === 'A9.1'), t2 = a9.aufgaben.find(x => x.id === 'A9.2');
    chk('A9 enthält genau die zwei Originalaufgaben (keine eigenen Beispiele mehr)', a9.aufgaben.length === 2 && a9.aufgaben.every(a => a.pflicht !== false));
    const r1 = P.refOf({ ref: 'e1*e2*(e3+e4)*e5', n: 5 }), r2 = P.refOf({ ref: 'n(e1+e3)*e2', n: 3 });
    chk('A9.1 Soll-Funktion = e1·e2·(e3+e4)·e5 über alle 32 Eingangskombinationen', P.sollOf(t1).every((row, k) => row[0] === (r1.ones.indexOf(k) >= 0 ? 1 : 0)) && r1.ones.length === 3, r1.ones.join());
    chk('A9.2 Soll-Funktion = n(A+C)·B über alle 8 Eingangskombinationen (A = E1, B = E2, C = E3)', P.sollOf(t2).every((row, k) => row[0] === (r2.ones.indexOf(k) >= 0 ? 1 : 0)) && r2.ones.join() === '2', r2.ones.join());
    chk('A9.1 Musterlösung: nur NAND, davon eines mit drei Eingängen, kein anderer Gattertyp', (() => { const c = P.zaehle(t1.muster); return Object.keys(c).every(k => ['nand', 'logicin', 'logicled', 'ground'].includes(k)) && t1.muster.parts.some(p => p.type === 'nand' && p.props && p.props.inputs === 3); })());
    const mit = (lay, typ, id, ins, aus) => { const l = JSON.parse(JSON.stringify(lay)); l.parts.push({ id, type: typ, x: 0, y: 0, rot: 0 }); return l; };
    // falsche Gattertypen werden abgelehnt (auch bei richtiger Funktion)
    const mitAnd = P.netz({ n: 5, gatter: [['U1', 'and', ['E1', 'E2']], ['U2', 'or', ['E3', 'E4']], ['U3', 'and', ['U1', 'U2']], ['U4', 'and', ['U3', 'E5']]], aus: { L1: 'U4' } });
    let x = P.pruefe(t1, mitAnd); chk('A9.1 richtige Funktion mit UND und ODER wird abgelehnt (nur NAND erlaubt)', !x.ok && /nur NAND erlaubt/.test(x.meldung), x.meldung);
    const vier = P.netz({ n: 5, gatter: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['U1', 'U1']], ['U3', 'nand', ['E3', 'E3']], ['U4', 'nand', ['E4', 'E4']], ['U5', 'nand', ['U3', 'U4']], ['U6', 'nand', ['U2', 'U5', 'E5', 'E5'], { inputs: 4 }], ['U7', 'nand', ['U6', 'U6']]], aus: { L1: 'U7' } });
    x = P.pruefe(t1, vier); chk('A9.1 ein NAND mit vier Eingängen wird abgelehnt (das Lehrmittel erlaubt drei)', !x.ok && /mehr als 3 Eingänge/.test(x.meldung), x.meldung);
    const falschF = P.netz({ n: 5, gatter: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['U1', 'U1']], ['U3', 'nand', ['U2', 'E5']], ['U4', 'nand', ['U3', 'U3']]], aus: { L1: 'U4' } });
    x = P.pruefe(t1, falschF); chk('A9.1 nur NAND, aber falsche Funktion (e3 und e4 fehlen) wird mit Zeile abgelehnt', !x.ok && /Bei e1 = 1, e2 = 1, e3 = 0, e4 = 0, e5 = 1 zeigt/.test(x.meldung), x.meldung);
    // Aufgabe 2
    const mitOr = P.netz({ n: 3, gatter: [['U1', 'or', ['E1', 'E3']], ['U2', 'not', ['U1']], ['U3', 'and', ['U2', 'E2']]], aus: { L1: 'U3' } });
    x = P.pruefe(t2, mitOr); chk('A9.2 richtige Funktion mit ODER und NICHT wird abgelehnt (nur NOR und UND)', !x.ok && /nur NOR und UND erlaubt/.test(x.meldung), x.meldung);
    const fuenf = P.netz({ n: 3, gatter: [['U1', 'nor', ['E1', 'E3']], ['U2', 'and', ['U1', 'E2']], ['U3', 'nor', ['E1', 'E1']], ['U4', 'nor', ['E2', 'E2']], ['U5', 'nor', ['E3', 'E3']], ['U6', 'nor', ['U3', 'U4']]], aus: { L1: 'U2' } });
    x = P.pruefe(t2, fuenf); chk('A9.2 fünf NOR werden abgelehnt (ein 74HC02 hat vier)', !x.ok && /NOR: 5 verbaut, erlaubt sind höchstens 4/.test(x.meldung), x.meldung);
    const nor3 = JSON.parse(JSON.stringify(t2.muster)); nor3.parts.find(p => p.id === 'U1').props = { inputs: 3 }; nor3.wires.push({ from: 'E2.out', to: 'U1.in3' });
    x = P.pruefe(t2, nor3); chk('A9.2 ein NOR mit drei Eingängen wird abgelehnt (der IC hat Zweifach-Gatter)', !x.ok && /mehr als 2 Eingänge/.test(x.meldung), x.meldung);
    const viernor = P.netz({ n: 3, gatter: [['U1', 'nor', ['E1', 'E3']], ['U2', 'nor', ['U1', 'U1']], ['U3', 'nor', ['E2', 'E2']], ['U4', 'nor', ['U2', 'U3']]], aus: { L1: 'U4' } }); // NOR(ODER(A,C), NICHT B): vier NOR
    x = P.pruefe(t2, viernor); chk('A9.2 eine andere richtige Lösung nur aus NOR (n(A+C)·B = NOR(A+C, NICHT B) mit vier NOR) wird angenommen', x.ok, x.meldung);
  }
  // A13: Musterschaltungen gegen gewöhnliche Arithmetik (durch die Engine gerechnet)
  if (P.A13_MUSTER) {
    const M = P.A13_MUSTER, tab = l => B.circuitTable(l).rows, bitsOf = (k, n) => Array.from({ length: n }, (_, i) => k >> i & 1);
    let good = true; tab(M.half).forEach((r, k) => { const [a, b] = bitsOf(k, 2); if (a + b !== r[0] + 2 * r[1]) good = false; }); chk('A13 Halbaddierer: a + b = S + 2·C (Engine)', good);
    good = true; tab(M.full).forEach((r, k) => { const [a, b, c] = bitsOf(k, 3); if (a + b + c !== r[0] + 2 * r[1]) good = false; }); chk('A13 Volladdierer: a + b + c = S + 2·Caus (Engine)', good);
    good = true; tab(M.sub).forEach((r, k) => { const [a, b, c] = bitsOf(k, 3); if (a - b - c !== r[0] - 2 * r[1]) good = false; }); chk('A13 Vollsubtrahierer: a − b − Bein = D − 2·Baus (Engine)', good);
    good = true; tab(M.kom1).forEach((r, k) => { const [a, b] = bitsOf(k, 2); if (r[0] !== +(a > b) || r[1] !== +(a === b) || r[2] !== +(a < b)) good = false; }); chk('A13 Komparator 1 Bit gegen > = < (Engine)', good);
    const t4 = (function () { const net = E.buildNetlist(JSON.parse(JSON.stringify(M.kom4))), st = E.newState(), rows = []; for (let k = 0; k < 256; k++) { for (let i = 0; i < 8; i++) net.byId['E' + (i + 1)].props.closed = !!(k >> i & 1); const r = E.step(net, st, { noGroundFault: true }); rows.push(['L1', 'L2', 'L3'].map(id => (r.nodeV[net.pinNode[id + '.in']] || 0) > E.LOGIC.vth ? 1 : 0)); } return rows; })();
    good = t4.every((r, k) => { const a = k & 15, b = k >> 4; return r[0] === +(a > b) && r[1] === +(a === b) && r[2] === +(a < b); }); chk('A13 Komparator 4 Bit: alle 256 Kombinationen gegen a > b, a = b, a < b (Engine)', good);
    good = true; tab(M.mux2).forEach((r, k) => { const [d0, d1, s] = bitsOf(k, 3); if (r[0] !== (s ? d1 : d0)) good = false; }); chk('A13 Multiplexer 2:1 wählt D[S] (Engine)', good);
    good = true; tab(M.mux4).forEach((r, k) => { const bits = bitsOf(k, 6), sel = bits[4] + 2 * bits[5]; if (r[0] !== bits[sel]) good = false; }); chk('A13 Multiplexer 4:1 wählt D[S1S0] (Engine, 64 Kombinationen)', good);
    good = true; tab(M.demux).forEach((r, k) => { const [d, s0, s1] = bitsOf(k, 3), sel = s0 + 2 * s1; r.forEach((v, y) => { if (v !== (y === sel ? d : 0)) good = false; }); }); chk('A13 Demultiplexer 1:4 verteilt D auf Y[S1S0] (Engine)', good);
  }
  // A12: Paritätstabellen und Hamming(7,4) unabhängig nachgerechnet
  const a12 = P.get('A12');
  if (a12) {
    const val = c => P.isAns(c) ? +[].concat(c.a)[0] : +c;
    a12.aufgaben.find(a => a.id === 'A12.1').zeilen.forEach((r, i) => chk('A12.1 Zeile ' + (i + 1) + ': gerade Parität (Summe der Einsen gerade)', (val(r[0]) + val(r[1]) + val(r[2]) + val(r[3])) % 2 === 0));
    a12.aufgaben.find(a => a.id === 'A12.3').zeilen.forEach((r, i) => chk('A12.3 Zeile ' + (i + 1) + ': Fehler genau bei ungerader Einsenzahl', val(r[4]) === (val(r[0]) + val(r[1]) + val(r[2]) + val(r[3])) % 2));
    let allSyn = true, nSyn = 0;
    a12.aufgaben.find(a => a.id === 'A12.6').zeilen.forEach(r => {
      const d = [val(r[0]), val(r[1]), val(r[2]), val(r[3])], pp = [val(r[4]), val(r[5]), val(r[6])];
      const cw = [pp[0], pp[1], d[0], pp[2], d[1], d[2], d[3]]; // Positionen 1 bis 7
      const syn = w => (w[0] ^ w[2] ^ w[4] ^ w[6]) | ((w[1] ^ w[2] ^ w[5] ^ w[6]) << 1) | ((w[3] ^ w[4] ^ w[5] ^ w[6]) << 2);
      if (syn(cw) !== 0) allSyn = false;
      for (let i = 0; i < 7; i++) { const w = cw.slice(); w[i] ^= 1; nSyn++; if (syn(w) !== i + 1) allSyn = false; }
    });
    chk('A12.6 Hamming(7,4): fehlerfrei Syndrom 0, jedes gekippte Bit ergibt seine Positionsnummer (' + nSyn + ' Fehlerfälle)', allSyn && nSyn === 112);
  }
  // A11: Codes unabhängig (Definition: 3-Exzess = Ziffer + 3; Gray ändert pro Schritt genau ein Bit)
  const a11 = P.get('A11');
  if (a11) {
    const t = a11.aufgaben.find(a => a.id === 'A11.1'), val = c => P.isAns(c) ? [].concat(c.a)[0] : c;
    t.zeilen.forEach((r, i) => { const dz = +val(r[0]); chk('A11.1 Zeile ' + (i + 1) + ': BCD und 3-Exzess', parseInt(val(r[1]), 2) === dz && parseInt(val(r[2]), 2) === dz + 3); });
    const g = t.zeilen.map(r => parseInt(val(r[3]), 2)); chk('A11.1 Gray-Folge: zwischen zwei Zeilen kippt genau ein Bit', g.slice(1).every((x, i) => { const dd = x ^ g[i]; return dd && !(dd & (dd - 1)); }));
    const w = a11.aufgaben.find(a => a.id === 'A11.2').zeilen; let ok2 = true;
    w.forEach(r => { const word = parseInt(r.slice(0, 4).join(''), 2), out = r.slice(4).map(c => [].concat(c.a)[0]); if (word >= 3 && word <= 12) { if (parseInt(out.join(''), 2) !== word - 3) ok2 = false; } else if (!out.every(x => x === 'X')) ok2 = false; });
    chk('A11.2 Wandlertabelle: gültige Wörter ergeben Ziffer = Wort − 3, die übrigen sechs sind X', ok2 && w.length === 16);
  }
  // ---- Teil B ----
  // Folgefunktionen aus dem Lehrbuch gegen das Verhalten der Engine (alle Zustände × Eingangskombinationen)
  { const FFT = { dff: ['d', 1], tff: ['t', 1], jkff: ['jk', 2], rsff: ['rs', 2] };
    Object.keys(FFT).forEach(t => { const [m, n] = FFT[t]; let good = true;
      for (let q = 0; q < 2; q++) for (let k = 0; k < (1 << n); k++) { const e = Array.from({ length: n }, (_, i) => k >> (n - 1 - i) & 1), want = P.FF[m](q, e); if (want === 'X') continue; const got = E.PARTS[t].ff(!!q, e.map(Boolean)) ? 1 : 0; if (got !== want) good = false; }
      chk('B Folgefunktion ' + t + ' (Lehrbuch) = Engine für alle Zustände und Eingänge', good); }); }
  // B1: belegt aus dem Lehrmittel (docs/aufgaben/B1_NOR_FLIPFLOP.md): e2 setzt, e1 setzt zurück, bei e1 = e2 = 1 gewinnt e1. Spalten: Wahrheitstabelle e2 | e1 | AV | A, Analysetabelle e2 | e1 | A, Ansteuertabelle AV | A | e2 | e1
  const b1 = P.get('B1');
  if (b1) {
    const val = c => P.isAns(c) ? [].concat(c.a)[0] : c, DOC = ['000', '011', '100', '110'].length && [[0, 0, 0, 0], [0, 0, 1, 1], [0, 1, 0, 0], [0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 1, 1], [1, 1, 0, 0], [1, 1, 1, 0]]; // Tabelle aus dem Lehrmittel
    chk('B1 Konvention: P.KONV.norSetzen = e2 (belegt)', P.KONV.norSetzen === 'e2');
    const t1 = b1.aufgaben.find(a => a.id === 'B1.1'), t2 = b1.aufgaben.find(a => a.id === 'B1.2'), t3 = b1.aufgaben.find(a => a.id === 'B1.3');
    chk('B1.1 Spaltenreihenfolge wie im Lehrmittel: e2 | e1 | AV | A', t1.kopf.join('|') === 'e2|e1|AV|A', t1.kopf.join('|'));
    chk('B1.2 Spaltenreihenfolge: e2 | e1 | A (ohne AV)', t2.kopf.join('|') === 'e2|e1|A', t2.kopf.join('|'));
    chk('B1.3 Spaltenreihenfolge: AV | A | e2 | e1 (AV und A vorn)', t3.kopf.join('|') === 'AV|A|e2|e1', t3.kopf.join('|'));
    chk('B1.1 Wahrheitstabelle stimmt Zeile für Zeile mit dem Lehrmittel überein', t1.zeilen.length === 8 && t1.zeilen.every((r, i) => [+r[0], +r[1], +r[2], +val(r[3])].join() === DOC[i].join()), JSON.stringify(t1.zeilen.map(r => [r[0], r[1], r[2], val(r[3])].join(''))));
    chk('B1.2 Analysetabelle: 00 → AV, 01 → 0 (Reset), 10 → 1 (Set), 11 → 0 (e1 gewinnt)', t2.zeilen.map(r => val(r[2])).join() === 'AV,0,1,0');
    // Verkürzt gelesen im Lehrmittel: 00 speichern, 01 Reset, 10 Set, 11 Reset
    // Engine: zwei NOR über Kreuz, e1 am oberen Gatter (Ausgang A)
    const lay = P.raster({ teile: [['E1', 'logicin'], ['E2', 'logicin'], ['U1', 'nor'], ['U2', 'nor'], ['L1', 'logicled'], ['L2', 'logicled']], leitungen: [['E1', 'U1.in1'], ['U2.out', 'U1.in2'], ['E2', 'U2.in1'], ['U1.out', 'U2.in2'], ['U1', 'L1'], ['U2', 'L2']] });
    const net = E.buildNetlist(JSON.parse(JSON.stringify(lay))), st = E.newState(), step = () => E.step(net, st, { noGroundFault: true });
    const Q = () => (step().nodeV[net.pinNode['L1.in']] || 0) > E.LOGIC.vth ? 1 : 0, setIn = (e2, e1) => { net.byId.E2.props.closed = !!e2; net.byId.E1.props.closed = !!e1; };
    const anwenden = (av, e2, e1) => { setIn(av, !av); step(); setIn(0, 0); step(); setIn(e2, e1); return Q(); };
    chk('B1 Engine: das NOR-Flipflop aus zwei NOR liefert die Wahrheitstabelle des Lehrmittels in allen 8 Zeilen', DOC.every(r => anwenden(r[2], r[0], r[1]) === r[3]), DOC.map(r => anwenden(r[2], r[0], r[1])).join(''));
    // Ansteuertabelle: die üblichen Werte (0 / 1 / X) bewirken den Übergang für jede erlaubte Eingabe (11 nicht benutzt)
    let ok3 = true; t3.zeilen.forEach(r => { const av = +r[0], a = +r[1], std = [r[2], r[3]].map(c => { const v = [].concat(c.a)[0]; return v; });
      [0, 1].forEach(e2 => [0, 1].forEach(e1 => { if (e2 && e1) return; const passt = (std[0] === 'X' || std[0] === String(e2)) && (std[1] === 'X' || std[1] === String(e1)); if (passt && anwenden(av, e2, e1) !== a) ok3 = false; })); });
    chk('B1.3 Ansteuertabelle: jede Eingabe, die zu den Werten der Tabelle passt (X = beides), bewirkt den Übergang AV → A in der Engine', ok3);
    chk('B1.3 Ansteuertabelle: AV A e2 e1 = 0 0 | 0 X, 0 1 | 1 0, 1 0 | 0 1, 1 1 | X 0 (übliche Werte, 11 nicht benutzt)', t3.zeilen.map(r => [r[0], r[1], [].concat(r[2].a)[0], [].concat(r[3].a)[0]].join('')).join() === '000X,0110,1001,11X0', t3.zeilen.map(r => [r[0], r[1], [].concat(r[2].a)[0], [].concat(r[3].a)[0]].join('')).join());
    chk('B1.5 beide Eingänge 1: e1 gewinnt, Q = 0 (Schritt in der Prüffolge)', b1.aufgaben.find(a => a.id === 'B1.5').schritte.some(x => x.set && x.set.E1 === 1 && x.set.E2 === 1 && x.erwartet[0] === 0));
  }
  // B2: das getaktete Flipflop in der Engine
  const b2 = P.get('B2');
  if (b2) { const SZ2 = P.KONV.norSetzen === 'e2' ? 1 : 0; const m = b2.aufgaben.find(a => a.id === 'B2.2').muster, net = E.buildNetlist(JSON.parse(JSON.stringify(m))), st = E.newState(); let good = true;
    const run = (e1, e2, c) => { net.byId.E1.props.closed = !!e1; net.byId.E2.props.closed = !!e2; net.byId.C.props.closed = !!c; const r = E.step(net, st, { noGroundFault: true }); return (r.nodeV[net.pinNode['L1.in']] || 0) > E.LOGIC.vth ? 1 : 0; };
    b2.aufgaben.find(a => a.id === 'B2.1').zeilen.forEach(r => { const val = c => P.isAns(c) ? [].concat(c.a)[0] : c, c = +r[0], e2 = +r[1], e1 = +r[2], av = +r[3], a = val(r[4]), s = SZ2 ? e2 : e1, rr = SZ2 ? e1 : e2; if (a === 'X') return; (SZ2 ? run(av ? 0 : 1, av ? 1 : 0, 1) : run(av ? 1 : 0, av ? 0 : 1, 1)); run(0, 0, 0); const q = run(e1, e2, c); if (q !== +a) good = false; });
    chk('B2.1 Analysetabelle des NOR-AND-Flipflops: jede zulässige Zeile in der Engine nachgeschaltet', good); }
  // B8 und B10: Laufzeit im Zeitverlauf (Studio-Simulation, 20 ns je Flipflop) – die Antworten der Prüffragen
  { const Sim = require('../studio/sim.js');
    const mitTakt = lay => { const l = JSON.parse(JSON.stringify(lay)); const c = l.parts.find(p => p.id === 'C'); c.type = 'clock'; c.props = { freq: 1e6 }; return l; };
    const zeiten = lay => { const sim = new Sim({ getLayout: () => lay }); sim.refresh(true); sim.reset(); const tr = ['C', 'FF1', 'FF2', 'FF3'].map((id, i) => sim.addTrace({ kind: 'dig', a: i === 0 ? 'C.out' : id + '.Q' })); sim.advance(20e-6);
      const ed = (t, fall) => { const o = []; for (let i = 1; i < t.n; i++) { const a = t.v[i - 1] > 2.5, b = t.v[i] > 2.5; if (fall ? a && !b : !a && b) o.push(t.t[i]); } return o; };
      const up = ed(tr[0], false), f3 = ed(tr[3], true); if (!f3.length) return null; const t3 = f3[0], t2 = ed(tr[2], true).filter(t => t <= t3 + 1e-12).pop(), t1 = ed(tr[1], true).filter(t => t <= t3 + 1e-12).pop(), te = up.filter(t => t <= t1 + 1e-12).pop();
      return { a: t1 - te, b: t2 - te, c: t3 - te }; };
    const asyn = zeiten(mitTakt(P.rippleZaehler(3))), b10 = P.get('B10'), syn = b10 && zeiten(mitTakt(b10.aufgaben.find(a => a.id === 'B10.3').muster));
    chk('B8.5 asynchron: Q0, Q1, Q2 fallen nach 20, 40, 60 ns (gemessen ' + (asyn ? [asyn.a, asyn.b, asyn.c].map(x => (x * 1e9).toFixed(1)).join(', ') : '–') + ' ns)', !!asyn && Math.abs(asyn.a - 20e-9) < 3e-9 && Math.abs(asyn.b - 40e-9) < 3e-9 && Math.abs(asyn.c - 60e-9) < 3e-9);
    if (syn) chk('B10.4 synchron: alle Bits fallen zugleich nach 20 ns (gemessen ' + [syn.a, syn.b, syn.c].map(x => (x * 1e9).toFixed(1)).join(', ') + ' ns)', Math.abs(syn.a - 20e-9) < 3e-9 && Math.abs(syn.b - 20e-9) < 3e-9 && Math.abs(syn.c - 20e-9) < 3e-9);
    // B4: Frequenzhalbierung gemessen: Takt 8 Hz → Q 4 Hz
    const lt = { parts: [{ id: 'CLK1', type: 'clock', x: 0, y: 0, rot: 0, props: { freq: 8 } }, { id: 'H', type: 'logicin', x: 0, y: 0, rot: 0, props: { konst: true, closed: true } }, { id: 'FF1', type: 'tff', x: 0, y: 0, rot: 0 }], wires: [{ from: 'CLK1.out', to: 'FF1.C' }, { from: 'H.out', to: 'FF1.T' }] };
    const sim = new Sim({ getLayout: () => lt }); sim.refresh(true); sim.reset(); const tq = sim.addTrace({ kind: 'dig', a: 'FF1.Q' }); sim.advance(2); let ups = 0; for (let i = 1; i < tq.n; i++) if (tq.v[i - 1] <= 2.5 && tq.v[i] > 2.5) ups++;
    chk('B4 Frequenzhalbierung gemessen: Takt 8 Hz, in 2 s steigt Q ' + ups + '-mal (= 4 Hz)', ups === 8); }
  // B10: Ansteuertabelle T = AV xor A, B11: Folgetabelle (n + 1) mod 10, B12: Johnson, B13: Zahlen
  const b10 = P.get('B10'); if (b10) b10.aufgaben.find(a => a.id === 'B10.1').zeilen.forEach(r => { const s = +r[0] * 4 + +r[1] * 2 + +r[2], n2 = (s + 1) % 8, t = [].concat(r.slice(3)).map(c => +[].concat(c.a)[0]).reduce((a, b) => a * 2 + b, 0); chk('B10.1 Zustand ' + s + ': T = AV xor A', t === (s ^ n2)); });
  const b11 = P.get('B11'); if (b11) b11.aufgaben.find(a => a.id === 'B11.1').zeilen.forEach(r => { const n = parseInt(r.slice(0, 4).join(''), 2), d = parseInt(r.slice(4).map(c => [].concat(c.a)[0]).join(''), 2); chk('B11.1 Zustand ' + n + ' → nächster Zustand ' + ((n + 1) % 10), d === (n + 1) % 10); });
  const b12 = P.get('B12'); if (b12) { const z = b12.aufgaben.find(a => a.id === 'B12.4').zeilen, ints = z.map(r => parseInt(r.slice(1).map(c => P.isAns(c) ? [].concat(c.a)[0] : c).join(''), 2)); chk('B12.4 Johnson: 0, 1, 3, 7, 15, 14, 12, 8, 0, 1 – genau ein Bit je Schritt', ints.join() === '0,1,3,7,15,14,12,8,0,1' && ints.slice(1).every((x, i) => { const d = x ^ ints[i]; return d && !(d & (d - 1)); })); }
  const b13 = P.get('B13'); if (b13) b13.aufgaben.find(a => a.id === 'B13.1').zeilen.forEach(r => { const w = +r[0], b = +r[1], v = c => +[].concat(c.a)[0]; chk('B13.1 ' + w + ' × ' + b + ': 2^Adressleitungen = Wörter, Bit = Wörter · Breite, Byte = Bit / 8', Math.pow(2, v(r[2])) === w && v(r[3]) === w * b && v(r[4]) === w * b / 8); });
  // B9 (Abnahme): alle Bauteile der Uhr sind spätestens bis B8 freigeschaltet
  const b9 = P.get('B9'); if (b9) { const bis8 = P.bauteileBis('B8'), uhr = b9.aufgaben.find(a => a.id === 'B9.3'), tp = Object.keys(P.zaehle(uhr.muster)).filter(t => !['logicin', 'logicled', 'ground', 'node'].includes(t)); const fehlt = tp.filter(t => !bis8.includes(t));
    chk('B9 Digitaluhr: Bauteile der Musterlösung (' + tp.join(', ') + ') sind mit A1 bis B8 freigeschaltet' + (fehlt.length ? ' – fehlt: ' + fehlt.join(', ') : ''), !fehlt.length && b9.schaltet.length === 0); }
  // Vereinfachungsaufgaben: der gegebene Ausdruck ist wirklich länger als die Minimalform (sonst gäbe es nichts zu vereinfachen)
  P.stations.forEach(s => s.aufgaben.forEach(a => { if (a.art === 'ausdruck' && a.gegeben) { const r = P.refOf(a), m = P.minimal(r.n, r.ones, r.dc), g = P.litCount(B.clean(B.parse(a.gegeben, a.buchstaben ? { letters: a.buchstaben } : undefined).ast)); chk(s.id + ' ' + a.id + ': «' + a.gegeben + '» hat ' + g + ' Buchstaben, Minimalform ' + m.minLits + ' – es gibt etwas zu vereinfachen', g > m.minLits); } }));
  // Alle Aufgaben mit Ausdruck/KV: die hinterlegte Minimalform gegen Brute Force
  P.stations.forEach(s => s.aufgaben.forEach(a => {
    if (a.art === 'ausdruck' && !a.nurGleich && !a.form) { const r = P.refOf(a), b = bruteMin(r.n, r.ones, r.dc), m = P.minimal(r.n, r.ones, r.dc); chk(s.id + ' ' + a.id + ': Minimalform stimmt mit Brute Force überein', m.nTerms === b.terms && m.nLits === b.lits, 'QMC ' + m.nTerms + '/' + m.nLits + ' brute ' + b.terms + '/' + b.lits); }
    if (a.art === 'kv' && a.n <= 4) { const b = bruteMin(a.n, a.ones, a.dc || []), m = P.minimal(a.n, a.ones, a.dc || []); chk(s.id + ' ' + a.id + ': KV-Minimalform stimmt mit Brute Force überein', m.nTerms === b.terms && m.nLits === b.lits, 'QMC ' + m.nTerms + '/' + m.nLits + ' brute ' + b.terms + '/' + b.lits); }
  }));
}

console.log('Lernpfad: ' + P.stations.length + ' Stationen, ' + P.stations.reduce((s, x) => s + x.aufgaben.length, 0) + ' Aufgaben; ' + ok + ' Prüfungen ok, ' + bad + ' Fehler');
fails.slice(0, 40).forEach(f => console.log('  ✗ ' + f));
process.exit(bad ? 1 : 0);

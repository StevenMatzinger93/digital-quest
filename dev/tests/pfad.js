// Prüfmaschine und Stationen des Lernpfads (Nachtlauf 2): node tests/pfad.js
// 1. Quine-McCluskey des Lernpfads gegen eine völlig andere Rechnung (alle Würfel aufzählen, alle Teilmengen durchprobieren)
// 2. Die sieben Prüfarten einzeln (richtig, falsch mit Begründung, Randfälle) plus Fragen, Protokoll, Vergleich
// 3. Fortschritt: Zustände, Freischaltung, Ausgeben und Einlesen
// 4. Jede Station: Musterlösung wird angenommen, eine falsche abgelehnt; Bauteile der Musterlösung sind freigeschaltet; Daten vollständig
// 5. Fachlich: Tabellen, Ausdrücke und Minimalformen gegen die Engine bzw. die Brute-Force-Rechnung, nicht gegen die Eingabe des Autors
const fs = require('fs'), path = require('path');
const E = require('../src/engine.js'), B = require('../studio/bool.js');
const P = require('../studio/pfad/kern.js'); require('../studio/pfad/bausteine.js');
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
  if (a7) { const t = a7.aufgaben.find(a => a.id === 'A7.1'); chk('A7.1 Förderband: A = 1 genau bei einem gedrückten Taster', t.zeilen.every(r => +[].concat(r[2].a)[0] === (+r[0] + +r[1] === 1 ? 1 : 0)));
    const m = a7.aufgaben.find(a => a.id === 'A7.6'); chk('A7.6 Mehrheit: A = 1 bei mindestens zwei Einsen', m.zeilen.every(r => +[].concat(r[3].a)[0] === (+r[0] + +r[1] + +r[2] >= 2 ? 1 : 0))); }
  const a8 = P.get('A8');
  if (a8) {
    const J = { 'A8.1': [(a, b) => a & b, (a, b) => b & a, (a, b) => a | b, (a, b) => b | a], 'A8.2': [(a, b, c) => (a & b) & c, (a, b, c) => a & (b & c)], 'A8.3': [(a, b, c) => a & (b | c), (a, b, c) => (a & b) | (a & c)],
      'A8.4': [(a, b, c) => a | (b & c), (a, b, c) => (a | b) & (a | c)], 'A8.5': [(a, b) => 1 - (a & b), (a, b) => (1 - a) | (1 - b)], 'A8.6': [(a, b) => 1 - (a | b), (a, b) => (1 - a) & (1 - b)], 'A8.7': [(a, b) => a | (a & b), (a, b) => a & (a | b)] };
    Object.keys(J).forEach(id => { const t = a8.aufgaben.find(a => a.id === id), n = t.kopf.length - J[id].length; chk('A8 ' + id + ' ' + t.titel + ': alle Spalten gegen JavaScript-Operatoren', t.zeilen.every(r => J[id].every((f, j) => +[].concat(r[n + j].a)[0] === f.apply(null, r.slice(0, n).map(Number))))); });
    ['A8.1', 'A8.2', 'A8.3', 'A8.4', 'A8.5', 'A8.6', 'A8.7'].slice(1).forEach(id => { const t = a8.aufgaben.find(a => a.id === id), n = t.kopf.length - 2; chk('A8 ' + id + ': beide Seiten des Gesetzes sind in jeder Zeile gleich', t.zeilen.every(r => [].concat(r[n].a)[0] === [].concat(r[n + 1].a)[0] || id === 'A8.7')); });
  }
  const a9 = P.get('A9');
  if (a9) { const REF = { 'A9.1': '/e1', 'A9.2': 'e1e2', 'A9.3': 'e1 v e2', 'A9.4': 'e1e2 v /e3', 'A9.5': 'e1/e2 v /e1e2', 'A9.6': 'e1/e2 v /e1e2' };
    Object.keys(REF).forEach(id => { const a = a9.aufgaben.find(x => x.id === id), r = P.refOf({ ref: REF[id], n: a.n }), so = P.sollOf(a); chk('A9 ' + id + ': Soll-Funktion entspricht dem Ausdruck ' + REF[id], so.every((row, k) => (r.ones.indexOf(k) >= 0 ? 1 : 0) === row[0])); }); }
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
  // Vereinfachungsaufgaben: der gegebene Ausdruck ist wirklich länger als die Minimalform (sonst gäbe es nichts zu vereinfachen)
  P.stations.forEach(s => s.aufgaben.forEach(a => { if (a.art === 'ausdruck' && a.gegeben) { const r = P.refOf(a), m = P.minimal(r.n, r.ones, r.dc), g = P.litCount(B.clean(B.parse(a.gegeben).ast)); chk(s.id + ' ' + a.id + ': «' + a.gegeben + '» hat ' + g + ' Buchstaben, Minimalform ' + m.minLits + ' – es gibt etwas zu vereinfachen', g > m.minLits); } }));
  // Alle Aufgaben mit Ausdruck/KV: die hinterlegte Minimalform gegen Brute Force
  P.stations.forEach(s => s.aufgaben.forEach(a => {
    if (a.art === 'ausdruck' && !a.nurGleich && !a.form) { const r = P.refOf(a), b = bruteMin(r.n, r.ones, r.dc), m = P.minimal(r.n, r.ones, r.dc); chk(s.id + ' ' + a.id + ': Minimalform stimmt mit Brute Force überein', m.nTerms === b.terms && m.nLits === b.lits, 'QMC ' + m.nTerms + '/' + m.nLits + ' brute ' + b.terms + '/' + b.lits); }
    if (a.art === 'kv') { const b = bruteMin(a.n, a.ones, a.dc || []), m = P.minimal(a.n, a.ones, a.dc || []); chk(s.id + ' ' + a.id + ': KV-Minimalform stimmt mit Brute Force überein', m.nTerms === b.terms && m.nLits === b.lits, 'QMC ' + m.nTerms + '/' + m.nLits + ' brute ' + b.terms + '/' + b.lits); }
  }));
}

console.log('Lernpfad: ' + P.stations.length + ' Stationen, ' + P.stations.reduce((s, x) => s + x.aufgaben.length, 0) + ' Aufgaben; ' + ok + ' Prüfungen ok, ' + bad + ' Fehler');
fails.slice(0, 40).forEach(f => console.log('  ✗ ' + f));
process.exit(bad ? 1 : 0);

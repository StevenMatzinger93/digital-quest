/* Digital Quest Studio – Lernpfad Digitaltechnik: Kern und Prüfmaschine (Nachtlauf 2, Block 2; kein DOM, läuft auch in Node)
 * Stationen und Aufgaben liegen als DATEN in studio/pfad/st_*.js (Format Version 1, siehe unten); die Oberfläche (ui.js) zeichnet alle Stationen gleich.
 *
 * Station:  {id:'A5', teil:'A', nr:5, titel, kurz, einfuehrung (HTML), verweis?, schaltet:[Bauteiltypen, die ab hier dazukommen], auto:true|false, aufgaben:[…]}
 * Aufgabe:  {id:'A5.1', titel, text (HTML), pflicht (Standard true), art, …Felder der Art…, hilfe?}
 *
 * Die sieben Prüfarten (art):
 *   tabelle   Feld für Feld gegen die berechnete Lösung     kopf, zeilen (Zelle: fest oder {a:'Lösung', typ})
 *   ausdruck  logische Gleichwertigkeit + Terme/Buchstaben  ref | (n, ones, dc), form?
 *   schaltung alle Eingangskombinationen durchschalten      n, ausgaenge, f | soll, nur?, limit?
 *   nand      Schaltung mit erlaubten Typen (nur)            wie schaltung, nur Pflicht
 *   ics       Schaltung mit höchstens so vielen Gattern je Typ wie schaltung, limit Pflicht
 *   kv        Päckchen gegen Quine-McCluskey                  n, ones, dc
 *   folge     Ausgangsfolge über n Takte gegen die Sollfolge  start, takt, lesen, schritte | soll
 * Dazu ohne Rechnung: fragen (Auswahlfragen, werden geprüft), protokoll (Laborstation, Lernende bestätigen selbst), vergleich (Lernende geben ab, die Software zeigt das Muster).
 * Alle Rückmeldungen sagen, WAS falsch ist, nicht nur dass. */
(function (root) {
  'use strict';
  var E = root.DQEngine || require('../../src/engine.js');
  var B = root.DQStudioBool || require('../bool.js');
  var P = root.DQPfad = root.DQPfad || {};
  P.VERSION = 1; P.FORMAT = 'dqstudio-lernpfad'; P.FREIGABE = 'dqstudio-freigabe';
  P.ARTEN = ['tabelle', 'ausdruck', 'schaltung', 'nand', 'ics', 'kv', 'folge', 'fragen', 'protokoll', 'vergleich'];
  P.AUTO = ['tabelle', 'ausdruck', 'schaltung', 'nand', 'ics', 'kv', 'folge', 'fragen']; // werden von der Software geprüft
  P.stations = P.stations || [];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function popcount(x) { var c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

  /* ---------- Stationen sammeln ---------- */
  P.station = function (def) {
    if (P.stations.some(function (s) { return s.id === def.id; })) throw new Error('Station ' + def.id + ' doppelt');
    P.stations.push(def); P.stations.sort(function (a, b) { return (a.teil === b.teil ? 0 : a.teil < b.teil ? -1 : 1) || a.nr - b.nr; });
    return def;
  };
  P.get = function (id) { return P.stations.filter(function (s) { return s.id === id; })[0] || null; };
  P.task = function (aid) { var sid = String(aid).split('.')[0], s = P.get(sid); return s ? (s.aufgaben.filter(function (a) { return a.id === aid; })[0] || null) : null; };
  P.pflicht = function (a) { return a.pflicht !== false; };
  /* Bauteile, die in den Aufgaben einer Station zur Verfügung stehen: alles, was bis dahin freigeschaltet wurde */
  P.bauteileBis = function (sid) {
    var out = [], seen = {};
    for (var i = 0; i < P.stations.length; i++) { (P.stations[i].schaltet || []).forEach(function (t) { if (!seen[t]) { seen[t] = 1; out.push(t); } }); if (P.stations[i].id === sid) break; }
    return out;
  };
  P.palette = function (a) { var sid = a.id.split('.')[0]; return (a.palette || P.bauteileBis(sid)).slice(); };

  /* ---------- Quine-McCluskey (eigene Rechnung, unabhängig von DQVisuals.minimize) ----------
   * Minterm k: Eingang i (e_{i+1}) = Bit i von k (e1 niederwertig, wie KV-Diagramm und Wahrheitstabelle des Studios).
   * Implikant {mask, val}: Bits in mask fallen weg (Strich), val gibt die übrigen Bits an. */
  function qmcPrimes(n, ones, dc) {
    var cur = {}, res = [], list = ones.concat(dc || []);
    list.forEach(function (m) { cur['0,' + m] = { mask: 0, val: m }; });
    for (;;) {
      var items = Object.keys(cur).map(function (k) { return cur[k]; }), next = {}, used = {};
      if (!items.length) break;
      items.forEach(function (a, i) { for (var j = i + 1; j < items.length; j++) { var b = items[j]; if (a.mask !== b.mask) continue; var d = a.val ^ b.val; if (d && !(d & (d - 1))) { var q = { mask: a.mask | d, val: a.val & ~d }; next[q.mask + ',' + q.val] = q; used[a.mask + ',' + a.val] = used[b.mask + ',' + b.val] = 1; } } });
      items.forEach(function (a) { if (!used[a.mask + ',' + a.val]) res.push(a); });
      cur = next;
    }
    return res.filter(function (p) { return cellsOf(n, p).some(function (c) { return ones.indexOf(c) >= 0; }); });
  }
  function cellsOf(n, p) { var out = []; for (var m = 0; m < (1 << n); m++) if ((m & ~p.mask & ((1 << n) - 1)) === p.val) out.push(m); return out; }
  function litsOf(n, p) { return n - popcount(p.mask); }
  /* Beste Überdeckung der Einsen durch Primimplikanten. cost(chosen) → Zahl; kleinster Wert gewinnt. */
  function bestCover(n, ones, primes, cost) {
    var best = null, bestC = Infinity, cov = primes.map(function (p) { return cellsOf(n, p); });
    (function go(chosen, covered) {
      var next = -1; for (var i = 0; i < ones.length; i++) if (!covered[ones[i]]) { next = ones[i]; break; }
      if (next < 0) { var c = cost(chosen); if (c < bestC) { bestC = c; best = chosen.slice(); } return; }
      if (cost(chosen) >= bestC) return;
      primes.forEach(function (p, pi) {
        if (cov[pi].indexOf(next) < 0) return;
        var cc = Object.assign({}, covered); cov[pi].forEach(function (m) { cc[m] = 1; }); chosen.push(p); go(chosen, cc); chosen.pop();
      });
    })([], {});
    return best || [];
  }
  /* Minimalform: kleinste Zahl Terme, dann wenigste Buchstaben; dazu die kleinste Buchstabenzahl überhaupt (eine ausgeklammerte Form kann kürzer sein, wird aber nicht verlangt) */
  P.minimal = function (n, ones, dc) {
    ones = (ones || []).slice().sort(function (a, b) { return a - b; }); dc = (dc || []).filter(function (m) { return ones.indexOf(m) < 0; });
    var N = 1 << n, r = { n: n, ones: ones, dc: dc };
    if (!ones.length) { r.terms = []; r.nTerms = 0; r.nLits = 0; r.konst = 0; r.primes = []; return r; }
    var primes = qmcPrimes(n, ones, dc); r.primes = primes;
    var all = ones.length === N || primes.some(function (p) { return popcount(p.mask) === n; });
    if (all) { r.terms = [{ mask: N - 1, val: 0 }]; r.nTerms = 1; r.nLits = 0; r.konst = 1; return r; }
    r.terms = bestCover(n, ones, primes, function (ch) { return ch.length * 1000 + ch.reduce(function (s, p) { return s + litsOf(n, p); }, 0); });
    r.nTerms = r.terms.length; r.nLits = r.terms.reduce(function (s, p) { return s + litsOf(n, p); }, 0);
    r.minLits = bestCover(n, ones, primes, function (ch) { return ch.reduce(function (s, p) { return s + litsOf(n, p); }, 0); }).reduce(function (s, p) { return s + litsOf(n, p); }, 0);
    return r;
  };
  P.termAst = function (n, p) {
    var lits = []; for (var i = 0; i < n; i++) { if (p.mask >> i & 1) continue; lits.push(p.val >> i & 1 ? { op: 'var', n: i + 1 } : { op: 'not', a: { op: 'var', n: i + 1 } }); }
    return lits.length === 0 ? { op: 'const', v: 1 } : lits.length === 1 ? lits[0] : { op: 'and', args: lits };
  };
  P.minimalAst = function (m) {
    if (m.konst === 1) return { op: 'const', v: 1 }; if (!m.terms.length) return { op: 'const', v: 0 };
    var ts = m.terms.map(function (p) { return P.termAst(m.n, p); }).sort(function (a, b) { return B.fmtText(a) < B.fmtText(b) ? -1 : 1; });
    return ts.length === 1 ? ts[0] : { op: 'or', args: ts };
  };
  P.minimalText = function (n, ones, dc) { return B.fmtText(P.minimalAst(P.minimal(n, ones, dc))); };

  /* ---------- Ausdrücke ---------- */
  function litCount(ast) { if (ast.op === 'var') return 1; if (ast.op === 'const') return 0; if (ast.op === 'not') return litCount(ast.a); return ast.args.reduce(function (s, a) { return s + litCount(a); }, 0); }
  function isLit(a) { return a.op === 'var' || (a.op === 'not' && a.a.op === 'var'); }
  function isProduct(a) { return isLit(a) || (a.op === 'and' && a.args.every(isLit)); }
  function isSum(a) { return isLit(a) || (a.op === 'or' && a.args.every(isLit)); }
  function isSop(a) { return isProduct(a) || (a.op === 'or' && a.args.every(isProduct)); }
  function isPos(a) { return isSum(a) || (a.op === 'and' && a.args.every(isSum)); }
  function termCount(a) { return a.op === 'or' ? a.args.length : 1; }
  P.litCount = litCount; P.isSop = isSop; P.isPos = isPos;
  function eName(i) { return 'e' + (i + 1); }
  function kText(n, k) { var s = []; for (var i = 0; i < n; i++) s.push(eName(i) + ' = ' + (k >> i & 1)); return s.join(', '); }
  P.kText = kText;
  function evalK(ast, n, k) { var v = {}; for (var i = 0; i < n; i++) v[i + 1] = k >> i & 1; return B.evalAst(ast, v); }
  /* Wahrheitswerte der Aufgabe: ref (Text) oder n + ones */
  function refOf(a) {
    if (a.ref || a.gegeben) { var p = B.parse(a.ref || a.gegeben), vs = B.varsOf(p.exprs[0]), n = a.n || (vs.length ? Math.max.apply(null, vs) : 1), ones = []; for (var k = 0; k < (1 << n); k++) if (evalK(p.exprs[0], n, k)) ones.push(k); return { n: n, ones: ones, dc: a.dc || [] }; }
    return { n: a.n, ones: a.ones || [], dc: a.dc || [] };
  }
  P.refOf = refOf;
  function ok(msg, extra) { return Object.assign({ ok: true, meldung: msg || 'Richtig.' }, extra || {}); }
  function bad(msg, extra) { return Object.assign({ ok: false, meldung: msg }, extra || {}); }

  /* kanonische Form: jeder Term enthält alle Variablen genau einmal */
  function kanonischDnf(ast, n) { var ts = ast.op === 'or' ? ast.args : [ast]; return ts.every(function (t) { var ls = t.op === 'and' ? t.args : [t]; if (!ls.every(isLit)) return false; var seen = {}; ls.forEach(function (l) { seen[l.op === 'var' ? l.n : l.a.n] = (seen[l.op === 'var' ? l.n : l.a.n] || 0) + 1; }); for (var i = 1; i <= n; i++) if (seen[i] !== 1) return false; return true; }); }
  function kanonischKnf(ast, n) { var fs = ast.op === 'and' ? ast.args : [ast]; return fs.every(function (t) { var ls = t.op === 'or' ? t.args : [t]; if (!ls.every(isLit)) return false; var seen = {}; ls.forEach(function (l) { seen[l.op === 'var' ? l.n : l.a.n] = (seen[l.op === 'var' ? l.n : l.a.n] || 0) + 1; }); for (var i = 1; i <= n; i++) if (seen[i] !== 1) return false; return true; }); }

  /* ---------- Prüfart ausdruck ---------- */
  P.pruefeAusdruck = function (a, text) {
    var r = refOf(a), n = r.n, p;
    if (!String(text || '').trim()) return bad('Noch nichts eingegeben.');
    try { p = B.parse(text); } catch (e) { return bad(e.message); }
    var ast = B.clean(p.exprs[p.exprs.length - 1]), vs = B.varsOf(ast);
    var big = vs.filter(function (v) { return v > n; }); if (big.length) return bad('e' + big[0] + ' gibt es in dieser Aufgabe nicht (nur e1 bis e' + n + ').');
    for (var k = 0; k < (1 << n); k++) {
      if (r.dc.indexOf(k) >= 0) continue; var want = r.ones.indexOf(k) >= 0 ? 1 : 0, got = evalK(ast, n, k);
      if (got !== want) return bad('Nicht gleichwertig: Bei ' + kText(n, k) + ' liefert dein Ausdruck ' + got + ', verlangt ist ' + want + '.');
    }
    var forms = a.form;
    if (forms === 'dnf' && !(isSop(ast) && kanonischDnf(ast, n))) return bad('Gleichwertig – aber verlangt ist die disjunktive Normalform: ODER von UND-Gliedern, in jedem Glied kommen alle Eingänge vor (e1 bis e' + n + ').');
    if (forms === 'dnf' && termCount(ast) !== r.ones.length) return bad('Die disjunktive Normalform hat je Zeile mit Ausgang 1 genau ein Glied (hier ' + r.ones.length + '), du hast ' + termCount(ast) + '.');
    if (forms === 'knf') {
      if (!(isPos(ast) && kanonischKnf(ast, n))) return bad('Gleichwertig – aber verlangt ist die konjunktive Normalform: UND von ODER-Klammern, in jeder Klammer kommen alle Eingänge vor (e1 bis e' + n + ').');
      var zeros = (1 << n) - r.ones.length - r.dc.length; if (ast.op === 'and' ? ast.args.length !== zeros : zeros !== 1) return bad('Die konjunktive Normalform hat je Zeile mit Ausgang 0 genau eine Klammer (hier ' + zeros + ').');
    }
    if (a.nurGleich || forms) return ok('Richtig: gleichwertig' + (forms ? ' und in der verlangten Form.' : '.'));
    var m = P.minimal(n, r.ones, r.dc), lits = litCount(ast), sop = isSop(ast), terms = termCount(ast);
    if (lits > m.minLits) return bad('Gleichwertig – aber noch nicht einfach genug: ' + lits + ' Buchstaben, es geht mit höchstens ' + m.nLits + '.', { gleich: true });
    if (sop && terms > m.nTerms) return bad('Gleichwertig – aber noch nicht einfach genug: ' + terms + ' Glieder, es geht mit ' + m.nTerms + '.', { gleich: true });
    return ok('Richtig: gleichwertig und einfach genug (' + lits + ' Buchstaben' + (sop ? ', ' + terms + ' Glied' + (terms === 1 ? '' : 'er') : '') + ').');
  };

  /* ---------- Prüfart tabelle ---------- */
  function normZelle(v, typ) {
    var s = String(v == null ? '' : v).trim();
    if (typ === 'bin') return s.replace(/[\s_]/g, '').replace(/^0b/i, '').replace(/^0+(?=.)/, '');
    if (typ === 'hex') return s.replace(/\s/g, '').replace(/^0x/i, '').toUpperCase().replace(/^0+(?=.)/, '');
    if (typ === 'dez') return s.replace(/\s/g, '').replace(/^\+/, '').replace(/^0+(?=.)/, '');
    if (typ === 'bit') return s.replace(/\s/g, '');
    return s.replace(/\s+/g, ' ').toLowerCase().replace(/\u00df/g, 'ss');
  }
  P.normZelle = normZelle;
  function isAns(c) { return !!c && typeof c === 'object' && c.a !== undefined; } // Antwortfeld; andere Objekte ({html, t}) sind feste Zellen mit Bild
  P.isAns = isAns;
  function zeilenName(a, r) {
    var row = a.zeilen[r], g = [];
    row.forEach(function (c, i) { if (!isAns(c)) g.push((a.kopf[i] ? a.kopf[i] + ' = ' : '') + (c && typeof c === 'object' ? c.t || '' : c)); });
    return g.length ? g.join(', ') : 'Zeile ' + (r + 1);
  }
  /* antwort: {'r,c': text}; Sonderfall typ 'ausdr': Zellenlösung ist ein Ausdruck, geprüft auf Gleichwertigkeit */
  P.pruefeTabelle = function (a, antwort) {
    antwort = antwort || {}; var falsch = [], leer = 0, richtig = 0, gesamt = 0;
    a.zeilen.forEach(function (row, r) {
      row.forEach(function (c, ci) {
        if (!isAns(c)) return; gesamt++;
        var key = r + ',' + ci, got = antwort[key]; if (got == null || String(got).trim() === '') { leer++; return; }
        var good;
        if (c.typ === 'ausdr') { var res = P.pruefeAusdruck({ ref: c.a, n: c.n, nurGleich: true }, got); good = res.ok; }
        else { var alts = [].concat(c.a); good = alts.some(function (x) { return normZelle(x, c.typ) === normZelle(got, c.typ); }); }
        if (good) richtig++; else falsch.push({ r: r, c: ci });
      });
    });
    var res = { felder: { gesamt: gesamt, richtig: richtig, leer: leer, falsch: falsch }, falsch: falsch };
    if (!falsch.length && !leer) return ok('Alles richtig – ' + gesamt + ' von ' + gesamt + ' Feldern.', res);
    if (falsch.length) {
      var f = falsch[0], col = a.kopf[f.c] || ('Spalte ' + (f.c + 1)), more = falsch.length - 1;
      return bad('Die Zeile für ' + zeilenName(a, f.r) + ' stimmt nicht (Spalte «' + col + '»)' + (more ? ' – und ' + more + ' weitere' + (more === 1 ? 's' : '') + ' Feld' + (more === 1 ? '' : 'er') : '') + '.' + (leer ? ' Ausserdem sind ' + leer + ' Felder noch leer.' : ''), res);
    }
    return bad('Es sind noch ' + leer + ' von ' + gesamt + ' Feldern leer.', res);
  };
  P.musterTabelle = function (a) { var m = {}; a.zeilen.forEach(function (row, r) { row.forEach(function (c, ci) { if (isAns(c)) m[r + ',' + ci] = [].concat(c.a)[0]; }); }); return m; };

  /* ---------- Schaltungen ---------- */
  var GRUND = { logicin: 1, logicled: 1, ground: 1, node: 1 };
  P.zaehle = function (layout) { var c = {}; layout.parts.forEach(function (p) { c[p.type] = (c[p.type] || 0) + 1; }); return c; };
  function gateParts(layout) { return layout.parts.filter(function (p) { var d = E.PARTS[p.type]; return d && d.logic && !GRUND[p.type]; }); }
  function offeneEingaenge(layout) {
    var used = {}, out = []; layout.wires.forEach(function (w) { used[w.from] = used[w.to] = 1; });
    layout.parts.forEach(function (p) {
      var d = E.PARTS[p.type]; if (!d || !(d.logic || d.ff || d.ctr) || p.type === 'logicin') return;
      var pins = E.pinsOf(p.type, Object.assign({}, d.props, p.props || {})), outs = d.ff ? ['Q', 'Qn'] : d.ctr ? ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] : (d.outs || ['out']);
      pins.forEach(function (pin) { if (outs.indexOf(pin) >= 0) return; if (d.ffAsync && d.ffAsync.indexOf(pin) >= 0) return; if (!used[p.id + '.' + pin]) out.push(p.id + '.' + pin); });
    });
    return out;
  }
  P.offeneEingaenge = offeneEingaenge;
  /* Soll-Tabelle aus f (e → 0/1 oder Liste) oder soll; Zeile k: e_{i+1} = Bit i. X = beliebig */
  function sollOf(a) {
    if (a.soll) return a.soll.map(function (r) { return [].concat(r); });
    var rows = []; for (var k = 0; k < (1 << a.n); k++) { var e = []; for (var i = 0; i < a.n; i++) e.push(k >> i & 1); var r = a.f(e); rows.push([].concat(r).map(function (x) { return x === 'X' ? 'X' : x ? 1 : 0; })); }
    return rows;
  }
  P.sollOf = sollOf;
  /* Aufbau prüfen: erlaubte Typen (nur), Zahl der Bauteile je Typ (limit), Mindestzahl (min), Gatter mit höchstens maxEingaenge Eingängen, keine offenen Eingänge. Gibt den Text des ersten Mangels oder null. */
  function strukturPruefen(a, layout) {
    var nur = a.nur || (a.art === 'nand' ? ['nand'] : null), limit = a.limit || null, cnt = P.zaehle(layout);
    if (nur) { var fremd = Object.keys(cnt).filter(function (t) { return !GRUND[t] && nur.indexOf(t) < 0; }); if (fremd.length) return 'Hier sind nur ' + nur.map(typName).join(' und ') + ' erlaubt – ' + typName(fremd[0]) + ' ist nicht dabei.'; }
    if (limit) {
      var gates = gateParts(layout).length;
      for (var t in limit) { var have = t === 'gates' ? gates : (cnt[t] || 0); if (have > limit[t]) return (t === 'gates' ? 'Gatter' : typName(t)) + ': ' + have + ' verbaut, erlaubt sind höchstens ' + limit[t] + (a.limitText ? ' (' + a.limitText + ')' : '') + '.'; }
    }
    if (a.min) for (var mt in a.min) { var hv = mt === 'gates' ? gateParts(layout).length : (cnt[mt] || 0); if (hv < a.min[mt]) return (mt === 'gates' ? 'Die Schaltung braucht mindestens ' + a.min[mt] + ' Gatter' : 'Die Aufgabe verlangt mindestens ' + a.min[mt] + ' × ' + typName(mt)) + (mt === 'gates' ? ' – nur Draht von e1 zur Anzeige zählt nicht.' : '.'); }
    if (a.maxEingaenge) { var breit = layout.parts.filter(function (p) { var d = E.PARTS[p.type]; return d && d.logic && d.multi && ((p.props && p.props.inputs) || d.props.inputs || 2) > a.maxEingaenge; })[0]; if (breit) return 'Das Gatter ' + breit.id + ' hat mehr als ' + a.maxEingaenge + ' Eingänge – hier sind nur Gatter mit höchstens ' + a.maxEingaenge + ' Eingängen erlaubt (wie im IC).'; }
    var offen = offeneEingaenge(layout); if (offen.length && a.offeneOk !== true) return 'Der Eingang ' + offen[0] + ' ist offen. Offene Eingänge gibt es nicht: Jeden Eingang an einen Ausgang oder einen Pegelschalter anschliessen.';
    if (a.props) for (var i = 0; i < a.props.length; i++) { var pr = a.props[i], teil = layout.parts.filter(function (p) { return p.id === pr.id; })[0]; var wert = teil ? (teil.props && teil.props[pr.k] !== undefined ? teil.props[pr.k] : E.PARTS[teil.type].props[pr.k]) : undefined; if (teil && wert !== pr.v) return 'Bei ' + pr.id + ' ist «' + (pr.name || pr.k) + '» falsch eingestellt (' + (pr.zeige ? pr.zeige(wert) : wert) + ').'; }
    return null;
  }
  P.pruefeSchaltung = function (a, layout) {
    var n = a.n, nur = a.nur || (a.art === 'nand' ? ['nand'] : null);
    if (!layout || !layout.parts || !layout.parts.length) return bad('Die Zeichenfläche ist leer.');
    var ins = B.inputsOf(layout), want = []; for (var i = 1; i <= n; i++) want.push('E' + i);
    var haveIds = ins.map(function (x) { return x.id; });
    var miss = want.filter(function (id) { return haveIds.indexOf(id) < 0; });
    if (miss.length) return bad('Es fehlt der Pegelschalter ' + miss[0] + ' (die Aufgabe hat die Eingänge e1 bis e' + n + ').');
    if (ins.length > n) return bad('Es gibt mehr Pegelschalter als Eingänge in der Aufgabe (e1 bis e' + n + ').');
    var leds = layout.parts.filter(function (p) { return p.type === 'logicled'; }).sort(function (x, y) { return x.id < y.id ? -1 : 1; }), nOut = a.ausgaenge || 1;
    if (leds.length < nOut) return bad('Es fehlt eine Logikanzeige für den Ausgang' + (nOut > 1 ? ' (verlangt: ' + nOut + ')' : '') + '.');
    if (leds.length > nOut) return bad('Es gibt mehr Logikanzeigen als Ausgänge (verlangt: ' + nOut + ').');
    var sm = strukturPruefen(a, layout); if (sm) return bad(sm);
    // Funktion: alle Eingangskombinationen durchschalten
    var lay = clone(layout), net, st = E.newState(), faults = {};
    try { net = E.buildNetlist(lay); } catch (e) { return bad('Die Schaltung lässt sich nicht berechnen: ' + e.message); }
    if (a.getrennt && nOut > 1) { // jede Anzeige hat ihre eigene Schaltung: kein Gatter gehört zu zwei Ausgängen
      var kegel = leds.map(function (l) { return kegelOf(layout, l.id); });
      for (var x = 0; x < kegel.length; x++) for (var y = x + 1; y < kegel.length; y++) { var gem = Object.keys(kegel[x]).filter(function (g) { return kegel[y][g]; }); if (gem.length) return bad('Die Schaltungen für ' + leds[x].id + ' und ' + leds[y].id + ' teilen sich das Gatter ' + gem[0] + '. Hier sollen zwei getrennte Schaltungen entstehen.'); }
    }
    var soll = sollOf(a), idx = want.map(function (id) { return id; }), first = null;
    for (var k = 0; k < (1 << n); k++) {
      idx.forEach(function (id, i) { net.byId[id].props.closed = !!(k >> i & 1); });
      var r; try { r = E.step(net, st, { noGroundFault: true }); } catch (e) { return bad('Die Schaltung lässt sich nicht berechnen: ' + e.message); }
      r.faults.forEach(function (f) { faults[f.code] = f; });
      for (var j = 0; j < nOut && !first; j++) {
        var v = (r.nodeV[net.pinNode[leds[j].id + '.in']] || 0) > E.LOGIC.vth ? 1 : 0, sv = soll[k][j];
        if (sv !== 'X' && v !== sv) first = bad('Bei ' + kText(n, k) + ' zeigt ' + (nOut > 1 ? leds[j].id : 'die Anzeige') + ' eine ' + v + ', verlangt ist ' + sv + '.', { zeile: k });
      }
    }
    if (faults.OUTPUT_CLASH) return bad('Zwei Ausgänge sind gegeneinander geschaltet (' + (faults.OUTPUT_CLASH.parts || []).join(', ') + '). Nie Ausgang gegen Ausgang.');
    if (first) return first;
    if (faults.UNSTABLE) return bad('Die Schaltung hat eine Rückkopplung ohne stabilen Zustand.');
    if (a.gleich) { /* mehrere Ausgänge müssen übereinstimmen: schon durch gleiche Soll-Spalten erzwungen */ }
    return ok('Richtig: alle ' + (1 << n) + ' Eingangskombinationen liefern den verlangten Ausgang' + (nur ? ' (nur ' + nur.map(typName).join(', ') + ')' : '') + '.');
  };
  /* Alle Gatter, die zum Anschluss <led>.in gehören (rückwärts über die Leitungen) */
  function kegelOf(layout, ledId) {
    var parent = {}, find = function (x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    layout.parts.forEach(function (p) { E.pinsOf(p.type, Object.assign({}, E.PARTS[p.type].props, p.props || {})).forEach(function (pin) { parent[p.id + '.' + pin] = p.id + '.' + pin; }); });
    layout.wires.forEach(function (w) { if (parent[w.from] === undefined || parent[w.to] === undefined) return; var a = find(w.from), b = find(w.to); if (a !== b) parent[a] = b; });
    var byId = {}; layout.parts.forEach(function (p) { byId[p.id] = p; }); var seen = {}, out = {};
    (function walk(pin) {
      var root = find(pin); if (seen[root]) return; seen[root] = 1;
      layout.parts.forEach(function (p) { var d = E.PARTS[p.type]; if (!d || !d.logic || GRUND[p.type]) return; var o = p.id + '.out'; if (parent[o] !== undefined && find(o) === root) { out[p.id] = 1; E.pinsOf(p.type, Object.assign({}, d.props, p.props || {})).forEach(function (x) { if (x !== 'out') walk(p.id + '.' + x); }); } });
    })(ledId + '.in');
    return out;
  }
  function typName(t) { var d = E.PARTS[t]; return d ? d.label.replace(/-Glied|-Gatter/, '') : t; }
  P.typName = typName;

  /* ---------- Prüfart kv ---------- */
  function cubeOf(n, cells) {
    var and = (1 << n) - 1, or = 0; cells.forEach(function (c) { and &= c; or |= c; });
    var mask = and ^ or, p = { mask: mask, val: and & ~mask }, all = cellsOf(n, p);
    if (all.length !== cells.length || !all.every(function (c) { return cells.indexOf(c) >= 0; })) return null;
    return p;
  }
  /* antwort: {gruppen:[[Felder]], ausdruck:'e1e2 v …'}; Felder = Minterme (Nummer wie im Diagramm angezeigt) */
  P.pruefeKV = function (a, antwort) {
    antwort = antwort || {}; var n = a.n, ones = a.ones, dc = a.dc || [], gr = (antwort.gruppen || []).map(function (g) { return g.slice().sort(function (x, y) { return x - y; }); });
    if (!gr.length && !String(antwort.ausdruck || '').trim()) return bad('Noch nichts eingetragen.');
    if (a.gruppen !== false) {
      if (!gr.length) return bad('Zeichne zuerst die Päckchen ein.');
      var m = P.minimal(n, ones, dc), cubes = [], i;
      for (i = 0; i < gr.length; i++) {
        var g = gr[i], c = cubeOf(n, g);
        if (!c || (g.length & (g.length - 1))) return bad('Päckchen ' + (i + 1) + ' ist kein gültiges Päckchen: Es müssen 1, 2, 4, 8 … benachbarte Felder in einem Rechteck sein (auch über den Rand des Diagramms).');
        var nul = g.filter(function (x) { return ones.indexOf(x) < 0 && dc.indexOf(x) < 0; }); if (nul.length) return bad('Päckchen ' + (i + 1) + ' enthält eine 0 (Feld ' + nul[0] + '). Nur Einsen' + (dc.length ? ' und X' : '') + ' dürfen hinein.');
        cubes.push(c);
      }
      var offen = ones.filter(function (o) { return !gr.some(function (g) { return g.indexOf(o) >= 0; }); }); if (offen.length) return bad('Die 1 in Feld ' + offen[0] + ' liegt in keinem Päckchen.');
      for (i = 0; i < gr.length; i++) { var cc = cubes[i], bigger = m.primes.some(function (p) { return p.mask !== cc.mask && (p.mask & cc.mask) === cc.mask && (cc.val & ~p.mask) === p.val; }); if (bigger) return bad('Päckchen ' + (i + 1) + ' lässt sich noch vergrössern (immer die grösstmögliche Gruppe bilden).'); }
      if (gr.length > m.nTerms) return bad('Es geht mit weniger Päckchen: ' + gr.length + ' eingezeichnet, ' + m.nTerms + ' reichen.');
      var lits = cubes.reduce(function (s, p) { return s + litsOf(n, p); }, 0); if (lits > m.nLits) return bad('Mit denselben ' + gr.length + ' Päckchen geht es einfacher: andere Päckchen wählen (zählt ' + lits + ' Buchstaben, Ziel ' + m.nLits + ').');
    }
    if (a.ausdruck !== false) { var r = P.pruefeAusdruck({ n: n, ones: ones, dc: dc }, antwort.ausdruck); if (!r.ok) return bad((a.gruppen !== false ? 'Päckchen stimmen. ' : '') + 'Minimalform: ' + r.meldung); }
    return ok('Richtig: Päckchen und Minimalform stimmen.');
  };
  P.musterKV = function (a) { var m = P.minimal(a.n, a.ones, a.dc || []); return { gruppen: m.terms.map(function (p) { return cellsOf(a.n, p); }), ausdruck: B.fmtText(P.minimalAst(m)) }; };

  /* ---------- Prüfart folge ---------- */
  /* start: Layout mit Pegelschaltern (E…), Takteingang (a.takt, ein Pegelschalter) und Logikanzeigen; schritte: [{set:{E1:1}, takte:n, erwartet:[…Werte von lesen…]}]
   * oder zaehlfolge: soll:[Zahlen] (lesen höchstwertig zuerst, je ein Takt). Takt = Pegel 1 dann 0 am Eingang a.takt. */
  function folgeSchritte(a) {
    if (a.schritte) return a.schritte;
    return (a.soll || []).map(function (z) { var e = []; for (var i = a.lesen.length - 1; i >= 0; i--) e.push(z >> i & 1); return { takte: 1, erwartet: a.lesen.map(function (x, j) { return z >> (a.lesen.length - 1 - j) & 1; }) }; });
  }
  P.folgeSchritte = folgeSchritte;
  /* Siebensegmentanzeige als Ziffer lesen: Segmentmuster a bis g, 'X' wenn es keine Ziffer ist */
  var SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function ziffer(on) { var m = 'abcdefg'.split('').filter(function (c) { return on[c]; }).join(''); for (var d in SEG) if (SEG[d] === m) return +d; return 'X'; }
  P.SEGMENTE = SEG;
  /* Schritt = {set:{E1:1}, takte:n, erwartet:[…]} oder {abfolge:[{set:{…}}, …], erwartet:[…]} (Eingänge nacheinander setzen, nach jedem Schritt rechnen).
   * takt (optional): Pegelschalter oder Taktgeber, den die Software von Hand taktet. lesen: Logikanzeigen (Wert 0/1) oder Siebensegmentanzeigen (Ziffer 0 bis 9, X = keine Ziffer). */
  P.pruefeFolge = function (a, layout) {
    if (!layout || !layout.parts || !layout.parts.length) return bad('Die Zeichenfläche ist leer.');
    var lay = clone(layout), net, st = E.newState(), clk = a.takt, byId = {}; lay.parts.forEach(function (p) { byId[p.id] = p; });
    if (clk) {
      if (!byId[clk] || (byId[clk].type !== 'logicin' && byId[clk].type !== 'clock')) return bad('Der Takteingang ' + clk + ' (Pegelschalter oder Taktgeber) fehlt.');
      if (byId[clk].type === 'clock') { byId[clk].type = 'logicin'; byId[clk].props = { closed: false }; } // die Software taktet von Hand: derselbe Anschluss out
    }
    var miss = (a.lesen || []).filter(function (id) { return !byId[id] || (byId[id].type !== 'logicled' && byId[id].type !== 'seg7'); }); if (miss.length) return bad('Die Anzeige ' + miss[0] + ' fehlt (Logikanzeige oder Siebensegmentanzeige).');
    var sm = strukturPruefen(a, layout); if (sm) return bad(sm);
    try { net = E.buildNetlist(lay); } catch (e) { return bad('Die Schaltung lässt sich nicht berechnen: ' + e.message); }
    function setIn(id, v) { if (net.byId[id]) net.byId[id].props.closed = !!v; }
    function run() { return E.step(net, st, { noGroundFault: true }); }
    function lv(r, pin) { return (r.nodeV[net.pinNode[pin]] || 0) > E.LOGIC.vth; }
    function read(r) { return a.lesen.map(function (id) { if (byId[id].type === 'seg7') { var on = {}; 'abcdefg'.split('').forEach(function (c) { on[c] = lv(r, id + '.' + c); }); return ziffer(on); } return lv(r, id + '.in') ? 1 : 0; }); }
    Object.keys(byId).forEach(function (id) { if (byId[id].type === 'logicin' && !(byId[id].props && byId[id].props.konst)) setIn(id, false); });
    (a.vorher || []).forEach(function (v) { Object.keys(v.set || {}).forEach(function (id) { setIn(id, v.set[id]); }); run(); });
    var r, schritte = folgeSchritte(a), takteSumme = 0;
    try { r = run(); } catch (e) { return bad('Die Schaltung lässt sich nicht berechnen: ' + e.message); }
    for (var s = 0; s < schritte.length; s++) {
      var sc = schritte[s], was = '';
      try {
        (sc.abfolge || []).forEach(function (x) { Object.keys(x.set || {}).forEach(function (id) { setIn(id, x.set[id]); }); r = run(); });
        Object.keys(sc.set || {}).forEach(function (id) { setIn(id, sc.set[id]); }); if (sc.set) r = run();
        for (var t = 0; t < (sc.takte || 0); t++) { setIn(clk, true); r = run(); setIn(clk, false); r = run(); takteSumme++; }
      } catch (e) { return bad('Die Schaltung lässt sich nicht berechnen: ' + e.message); }
      var got = read(r), want = sc.erwartet, nm = a.lesen;
      for (var j = 0; j < want.length; j++) if (want[j] !== 'X' && got[j] !== want[j]) {
        var wo = sc.name ? sc.name : (takteSumme && !sc.abfolge ? 'dem ' + takteSumme + '. Takt' : 'Schritt ' + (s + 1));
        return bad('Nach ' + wo + (sc.set ? ' (mit ' + Object.keys(sc.set).map(function (id) { return id + ' = ' + (sc.set[id] ? 1 : 0); }).join(', ') + ')' : '') + ' zeigt ' + nm[j] + ' ' + (byId[nm[j]].type === 'seg7' ? 'die Ziffer ' + (got[j] === 'X' ? '(keine gültige Ziffer)' : got[j]) : 'eine ' + got[j]) + ', erwartet ist ' + want[j] + '. Gelesen ' + got.join(' ') + ', soll ' + want.join(' ') + '.', { schritt: s });
      }
    }
    return ok('Richtig: die Ausgangsfolge stimmt über alle ' + schritte.length + ' Schritte' + (takteSumme ? ' (' + takteSumme + ' Takte)' : '') + '.');
  };

  /* ---------- Fragen, Protokoll, Vergleich ---------- */
  P.pruefeFragen = function (a, antwort) {
    antwort = antwort || []; var falsch = [], leer = 0;
    a.fragen.forEach(function (q, i) {
      var g = antwort[i]; if (g == null || g === '' || (Array.isArray(g) && !g.length)) { leer++; return; }
      var want = [].concat(q.richtig).sort(), got = [].concat(g).map(Number).sort(); if (want.join() !== got.join()) falsch.push(i);
    });
    if (leer) return bad('Es sind noch ' + leer + ' Fragen offen.', { falsch: falsch });
    if (falsch.length) return bad('Frage ' + (falsch[0] + 1) + ' stimmt nicht' + (falsch.length > 1 ? ' (und ' + (falsch.length - 1) + ' weitere)' : '') + (a.fragen[falsch[0]].erkl ? ': ' + a.fragen[falsch[0]].erkl : '.'), { falsch: falsch });
    return ok('Alle ' + a.fragen.length + ' Fragen richtig.');
  };
  P.pruefeProtokoll = function (a, antwort) { return antwort && antwort.selbst ? ok('Von dir als erledigt markiert (die Software prüft diese Station nicht).') : bad('Diese Station wird nicht von der Software geprüft: Führe die Messung durch und markiere sie dann selbst als erledigt.'); };
  P.pruefeVergleich = function (a, antwort) { return antwort && String(antwort.text || '').trim() ? ok('Abgegeben. Vergleiche dein Diagramm mit dem Diagramm der Software (es wird nicht bewertet).') : bad('Zeichne dein Diagramm auf Papier, schreibe unten kurz auf, was du gefunden hast, und gib es dann ab.'); };

  /* ---------- Ein Aufruf für alle Arten ---------- */
  P.pruefe = function (a, antwort) {
    switch (a.art) {
      case 'tabelle': return P.pruefeTabelle(a, antwort);
      case 'ausdruck': return P.pruefeAusdruck(a, antwort);
      case 'schaltung': case 'nand': case 'ics': return P.pruefeSchaltung(a, antwort);
      case 'kv': return P.pruefeKV(a, antwort);
      case 'folge': return P.pruefeFolge(a, antwort);
      case 'fragen': return P.pruefeFragen(a, antwort);
      case 'protokoll': return P.pruefeProtokoll(a, antwort);
      case 'vergleich': return P.pruefeVergleich(a, antwort);
    }
    throw new Error('Unbekannte Prüfart ' + a.art);
  };
  /* Musterlösung im Format der Antwort */
  P.muster = function (a) {
    if (a.muster !== undefined) return a.muster;
    switch (a.art) {
      case 'tabelle': return P.musterTabelle(a);
      case 'ausdruck': var r = refOf(a); return a.form === 'dnf' ? dnfText(r) : a.form === 'knf' ? knfText(r) : P.minimalText(r.n, r.ones, r.dc);
      case 'kv': return P.musterKV(a);
      case 'fragen': return a.fragen.map(function (q) { return q.richtig; });
      case 'schaltung': // ohne eigene Musterlösung: Minimalform als UND-ODER-Schaltung (nur wenn nichts anderes verlangt ist)
        if (!P.netzMinimal || a.nur || a.limit) return null;
        var so = sollOf(a), defs = []; for (var j = 0; j < (a.ausgaenge || 1); j++) { var on = [], dd = []; so.forEach(function (row, k) { if (row[j] === 1) on.push(k); else if (row[j] === 'X') dd.push(k); }); defs.push({ ones: on, dc: dd }); }
        return P.netzMinimal(a.n, defs);
      case 'protokoll': return { selbst: true };
      case 'vergleich': return { text: 'abgegeben' };
    }
    return null;
  };
  function dnfText(r) { return r.ones.map(function (k) { var s = []; for (var i = 0; i < r.n; i++) s.push((k >> i & 1 ? '' : '/') + 'e' + (i + 1)); return s.join(''); }).join(' v ') || '0'; }
  function knfText(r) { var zs = []; for (var k = 0; k < (1 << r.n); k++) if (r.ones.indexOf(k) < 0 && r.dc.indexOf(k) < 0) zs.push(k); return zs.map(function (k) { var s = []; for (var i = 0; i < r.n; i++) s.push((k >> i & 1 ? '/' : '') + 'e' + (i + 1)); return '(' + s.join(' v ') + ')'; }).join('') || '1'; }

  /* ---------- Schaltungen aus einer Beschreibung (Musterlösungen, Startvorlagen) ----------
   * netz({n, gatter:[['U1','nand',['E1','E2']], …], aus:{L1:'U3'}}) – Gatterliste, Eingänge E1…En, Ausgänge L1…; Positionen nach Tiefe. Quellen: 'E1' = E1.out, 'U1' = U1.out, 'U1.out2' (anderer Anschluss) wörtlich. */
  P.netz = function (d) {
    var parts = [], wires = [], depth = {}, col = {}, n = d.n, i;
    function pin(src) { return src.indexOf('.') >= 0 ? src : src + '.out'; }
    function dOf(id) { return depth[id]; }
    for (i = 1; i <= n; i++) depth['E' + i] = 0;
    (d.eingaenge || []).forEach(function (id) { depth[id] = 0; });
    var left = d.gatter.slice(), guard = 0;
    while (left.length && guard++ < 100) left = left.filter(function (g) { var src = g[2].map(function (s) { return s.split('.')[0]; }); if (src.every(function (s) { return depth[s] !== undefined; })) { depth[g[0]] = 1 + Math.max.apply(null, src.map(dOf)); return false; } return true; });
    if (left.length) throw new Error('Rückkopplung oder fehlende Quelle in netz(): ' + left.map(function (g) { return g[0]; }).join(','));
    function place(id, type, dp, props, extra) { col[dp] = (col[dp] || 0) + 1; var p = { id: id, type: type, x: 240 + dp * 220, y: 100 + (col[dp] - 1) * 100, rot: 0 }; if (props) p.props = props; if (extra) Object.assign(p, extra); parts.push(p); return p; }
    for (i = 1; i <= n; i++) place('E' + i, 'logicin', 0);
    (d.eingaenge || []).forEach(function (id) { place(id, 'logicin', 0); });
    d.gatter.forEach(function (g) { place(g[0], g[1], depth[g[0]], g[3]); });
    var maxD = Math.max.apply(null, Object.keys(depth).map(function (k) { return depth[k]; }));
    Object.keys(d.aus || {}).forEach(function (l) { place(l, 'logicled', maxD + 1); wires.push({ from: pin(d.aus[l]), to: l + '.in' }); });
    d.gatter.forEach(function (g) { var pins = E.pinsOf(g[1], Object.assign({}, E.PARTS[g[1]].props, g[3] || {})), ins = pins.filter(function (x) { return x !== 'out'; }); if (g[4]) ins = g[4]; g[2].forEach(function (src, k) { wires.push({ from: pin(src), to: g[0] + '.' + ins[k] }); }); });
    parts.push({ id: 'GND1', type: 'ground', x: 240, y: 100 + (col[0] || 0) * 100 + 40, rot: 0 });
    return { parts: parts, wires: wires };
  };
  /* Startvorlage: Pegelschalter E1…En, Logikanzeigen L1…Lm, Masse – nichts verdrahtet */
  P.startNetz = function (n, m, extra) {
    var parts = [], i; for (i = 1; i <= n; i++) parts.push({ id: 'E' + i, type: 'logicin', x: 200, y: 80 + (i - 1) * 100, rot: 0 });
    for (i = 1; i <= m; i++) parts.push({ id: 'L' + i, type: 'logicled', x: 900, y: 80 + (i - 1) * 100, rot: 0 });
    parts.push({ id: 'GND1', type: 'ground', x: 200, y: 80 + n * 100, rot: 0 });
    (extra || []).forEach(function (p) { parts.push(p); });
    return { parts: parts, wires: [] };
  };

  /* ---------- Fortschritt (reine Funktionen auf einem Stand-Objekt) ---------- */
  P.neuerStand = function () { return { format: P.FORMAT, version: P.VERSION, geaendert: null, frei: [], stationen: {} }; };
  P.eintrag = function (stand, aid, anlegen) {
    var sid = String(aid).split('.')[0], s = stand.stationen[sid]; if (!s) { if (!anlegen) return null; s = stand.stationen[sid] = { aufgaben: {} }; }
    var e = s.aufgaben[aid]; if (!e && anlegen) e = s.aufgaben[aid] = { versuche: 0, richtig: false, gezeigt: false, antwort: null, letzte: null };
    return e || null;
  };
  /* Antwort speichern (ohne zu prüfen): Entwurf bleibt beim Neuladen */
  P.speichereAntwort = function (stand, aid, antwort, zeit) { var e = P.eintrag(stand, aid, true); e.antwort = antwort; stand.geaendert = zeit || null; return stand; };
  /* Prüfergebnis eintragen: richtig bleibt richtig (die erste richtige Antwort zählt) */
  P.speichereErgebnis = function (stand, aid, res, antwort, zeit) {
    var e = P.eintrag(stand, aid, true); e.versuche++; e.letzte = res.ok ? 'richtig' : 'falsch'; e.antwort = antwort; e.meldung = res.meldung;
    if (res.ok) { e.richtig = true; if (!e.at) e.at = zeit || null; } else e.falschSeit = (e.falschSeit || 0) + 1;
    if (res.ok) e.falschSeit = 0; stand.geaendert = zeit || null; return stand;
  };
  P.markiereGezeigt = function (stand, aid, zeit) { P.eintrag(stand, aid, true).gezeigt = true; stand.geaendert = zeit || null; return stand; };
  /* Lösung zeigen gibt es nach zwei Fehlversuchen in Folge (oder zwei insgesamt ohne richtige Antwort) */
  P.loesungFrei = function (stand, aid) { var e = P.eintrag(stand, aid); return !!e && !e.richtig && e.falschSeit >= 2; };
  P.aufgabeStatus = function (stand, aid) {
    var e = P.eintrag(stand, aid); if (!e) return 'offen'; if (e.richtig) return 'richtig'; if (e.letzte === 'falsch') return 'falsch';
    return e.antwort != null && e.antwort !== '' ? 'arbeit' : 'offen';
  };
  P.stationFertig = function (stand, sid) { var s = P.get(sid); return !!s && s.aufgaben.filter(P.pflicht).every(function (a) { return P.aufgabeStatus(stand, a.id) === 'richtig'; }); };
  P.istFrei = function (stand, sid) {
    if ((stand.frei || []).indexOf(sid) >= 0 || (stand.frei || []).indexOf('*') >= 0) return true;
    var i = P.stations.map(function (s) { return s.id; }).indexOf(sid); if (i <= 0) return i === 0;
    return P.stationFertig(stand, P.stations[i - 1].id);
  };
  /* gesperrt | offen | arbeit | bestanden */
  P.stationStatus = function (stand, sid) {
    if (P.stationFertig(stand, sid)) return 'bestanden';
    if (!P.istFrei(stand, sid)) return 'gesperrt';
    var s = P.get(sid); return s.aufgaben.some(function (a) { return P.aufgabeStatus(stand, a.id) !== 'offen'; }) ? 'arbeit' : 'offen';
  };
  P.zaehlung = function (stand, sid) { var s = P.get(sid), pf = s.aufgaben.filter(P.pflicht); return { pflicht: pf.length, richtig: pf.filter(function (a) { return P.aufgabeStatus(stand, a.id) === 'richtig'; }).length, alle: s.aufgaben.length }; };
  P.exportiere = function (stand, zeit) { return JSON.stringify({ format: P.FORMAT, version: P.VERSION, exportiert: zeit || null, stand: stand }, null, 1); };
  P.importiere = function (text) {
    var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Das ist keine Fortschrittsdatei (kein gültiges JSON).' }; }
    if (!o || o.format !== P.FORMAT) return { ok: false, error: 'Das ist keine Fortschrittsdatei des Lernpfads.' };
    if (o.version > P.VERSION) return { ok: false, error: 'Die Datei stammt aus einer neueren Version des Studios.' };
    var st = o.stand; if (!st || typeof st.stationen !== 'object') return { ok: false, error: 'Die Fortschrittsdatei ist beschädigt.' };
    var neu = P.neuerStand(); neu.geaendert = st.geaendert || null; neu.frei = (st.frei || []).filter(function (x) { return typeof x === 'string'; });
    Object.keys(st.stationen).forEach(function (sid) { if (P.get(sid)) neu.stationen[sid] = st.stationen[sid]; });
    return { ok: true, stand: neu };
  };
  P.freigabeDatei = function (ids, zeit) { return JSON.stringify({ format: P.FREIGABE, version: 1, erstellt: zeit || null, stationen: ids }, null, 1); };
  P.freigabeLesen = function (text) {
    var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Das ist keine Freigabedatei (kein gültiges JSON).' }; }
    if (!o || o.format !== P.FREIGABE) return { ok: false, error: 'Das ist keine Freigabedatei des Lernpfads.' };
    if (o.version > 1) return { ok: false, error: 'Die Datei stammt aus einer neueren Version des Studios.' };
    return { ok: true, ids: (o.stationen || []).filter(function (x) { return x === '*' || P.get(x); }) };
  };
  P.freischalten = function (stand, ids) { ids.forEach(function (id) { if ((stand.frei || []).indexOf(id) < 0) stand.frei.push(id); }); return stand; };

  /* ---------- Prüfung der Stationsdaten (Validator, auch für die Tests) ---------- */
  P.pruefeDaten = function () {
    var probs = [], ids = {};
    P.stations.forEach(function (s) {
      ['id', 'teil', 'nr', 'titel', 'einfuehrung', 'aufgaben'].forEach(function (k) { if (s[k] === undefined) probs.push(s.id + ': Feld ' + k + ' fehlt'); });
      if (s.aufgaben && !s.aufgaben.length) probs.push(s.id + ': keine Aufgaben');
      (s.aufgaben || []).forEach(function (a) {
        if (ids[a.id]) probs.push('Aufgabe ' + a.id + ' doppelt'); ids[a.id] = 1;
        if (a.id.split('.')[0] !== s.id) probs.push(a.id + ' gehört nicht zu ' + s.id);
        if (P.ARTEN.indexOf(a.art) < 0) probs.push(a.id + ': Prüfart ' + a.art + ' unbekannt');
        if (!a.titel || !a.text) probs.push(a.id + ': Titel oder Text fehlt');
        if (a.art === 'ics' && !a.limit) probs.push(a.id + ': ics braucht limit'); if (a.art === 'nand' && !(a.nur || true)) probs.push(a.id + ': nand braucht nur');
        if (/\u00df/.test(JSON.stringify(a)) || /\u00df/.test(s.einfuehrung || '')) probs.push(a.id + ': sz statt ss');
      });
      if (!P.AUTO.some(function (x) { return s.aufgaben.some(function (a) { return a.art === x; }); }) && s.auto !== false) probs.push(s.id + ': keine automatisch geprüfte Aufgabe, aber nicht als Laborstation gekennzeichnet (auto: false)');
    });
    return probs;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);

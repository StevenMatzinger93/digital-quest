/* Lernpfad: Bausteine für die Stationsdaten (Nachtlauf 2). Die Stationen beschreiben nur, WAS gilt; Tabellen, Soll-Werte und Musterschaltungen
 * werden daraus gerechnet, nicht von Hand abgetippt. Schreibweise: Eingang e1 = niederwertigstes Bit eines Minterms (wie KV-Diagramm und Prüfmaschine),
 * Tabellen zeigen aber e1 links und zählen wie im Arbeitsblatt von oben nach unten dual hoch (e1 = höchste Stelle der Zeilennummer). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  /* Ausdruck (Text, Schreibweise des Lehrmittels) → Funktion e → 0/1 mit e = [e1, e2, …]; gerechnet vom Parser, nicht von Hand */
  P.formel = function (text) { var B = root.DQStudioBool, ast = B.clean(B.parse(text).exprs[0]); return function (e) { var v = {}; e.forEach(function (x, i) { v[i + 1] = x; }); return B.evalAst(ast, v); }; };
  P.wertMSB = function (e) { var v = 0; e.forEach(function (x) { v = v * 2 + x; }); return v; };            // e = [höchstes Bit … niedrigstes]
  P.wertLSB = function (e) { var v = 0; e.forEach(function (x, i) { v += x << i; }); return v; };            // e = [niedrigstes Bit … höchstes] (e1 = Bit 0)
  /* Wahrheitstabelle als Tabellenaufgabe: ein = Namen der Eingänge links, aus = Namen der Ausgänge (auszufüllen), f(e) → Liste der Ausgänge (0/1/'X'), e = [e1, e2, …] */
  P.wahrheit = function (o) {
    var n = o.ein.length, kopf = o.ein.concat(o.aus), zeilen = [], k, i;
    for (k = 0; k < (1 << n); k++) {
      var e = []; for (i = 0; i < n; i++) e.push(k >> (n - 1 - i) & 1);
      var r = [].concat(o.f(e)), row = e.map(String);
      r.forEach(function (v) { row.push({ a: v === 'X' ? ['X', 'x', '-', '×'] : String(v ? 1 : 0), typ: 'bit' }); });
      zeilen.push(row);
    }
    return { kopf: kopf, zeilen: zeilen };
  };
  /* Soll-Tabelle für die Prüfmaschine (Zeile k: e_{i+1} = Bit i von k) aus derselben Funktion */
  P.sollAus = function (n, f) {
    var rows = []; for (var k = 0; k < (1 << n); k++) { var e = []; for (var i = 0; i < n; i++) e.push(k >> i & 1); rows.push([].concat(f(e)).map(function (v) { return v === 'X' ? 'X' : v ? 1 : 0; })); }
    return rows;
  };
  P.einsen = function (n, f, j) { var o = []; for (var k = 0; k < (1 << n); k++) { var e = []; for (var i = 0; i < n; i++) e.push(k >> i & 1); if ([].concat(f(e))[j || 0] === 1) o.push(k); } return o; };
  P.dcs = function (n, f, j) { var o = []; for (var k = 0; k < (1 << n); k++) { var e = []; for (var i = 0; i < n; i++) e.push(k >> i & 1); if ([].concat(f(e))[j || 0] === 'X') o.push(k); } return o; };

  /* Musterschaltungen aus Termen: term = Liste von Buchstaben {i (0 = e1), neg}. SOP: UND-Glieder, ODER; POS: ODER-Klammern, UND. NICHT-Glieder werden geteilt. */
  function bau(n, outs, pos) {
    var g = [], uid = 0, nots = {};
    function gate(type, srcs, props) { var id = 'U' + (++uid); g.push([id, type, srcs, props]); return id; }
    function lit(l) { var e = 'E' + (l.i + 1); if (!l.neg) return e; if (!nots[l.i]) nots[l.i] = gate('not', [e]); return nots[l.i]; }
    var aus = {};
    outs.forEach(function (terms, j) {
      var ids = terms.map(function (t) { var src = t.map(lit); return src.length === 1 ? src[0] : gate(pos ? 'or' : 'and', src, { inputs: src.length }); });
      aus['L' + (j + 1)] = ids.length === 1 ? ids[0] : gate(pos ? 'and' : 'or', ids, { inputs: ids.length });
    });
    return P.netz({ n: n, gatter: g, aus: aus });
  }
  P.netzSOP = function (n, outs) { return bau(n, outs, false); };
  P.netzPOS = function (n, outs) { return bau(n, outs, true); };
  P.cubeTerm = function (n, c) { var t = []; for (var i = 0; i < n; i++) { if (c.mask >> i & 1) continue; t.push({ i: i, neg: !(c.val >> i & 1) }); } return t; };
  /* Minimalform → Schaltung (je Ausgang ones/dc) */
  P.netzMinimal = function (n, defs) { return P.netzSOP(n, defs.map(function (d) { return P.minimal(n, d.ones, d.dc || []).terms.map(function (c) { return P.cubeTerm(n, c); }); })); };
  /* kanonische Formen aus den Einsen bzw. Nullen */
  P.netzDNF = function (n, ones) { return P.netzSOP(n, [ones.map(function (k) { var t = []; for (var i = 0; i < n; i++) t.push({ i: i, neg: !(k >> i & 1) }); return t; })]); };
  P.netzKNF = function (n, ones) { var zs = []; for (var k = 0; k < (1 << n); k++) if (ones.indexOf(k) < 0) zs.push(k); return P.netzPOS(n, [zs.map(function (k) { var t = []; for (var i = 0; i < n; i++) t.push({ i: i, neg: !!(k >> i & 1) }); return t; })]); };
  /* Zwei Ausgänge in einem Layout: L1 = DNF-Schaltung, L2 = KNF-Schaltung (gemeinsame Eingänge) */
  P.netzDNFundKNF = function (n, ones) {
    var a = P.netzDNF(n, ones), b = P.netzKNF(n, ones), ren = {}, uid = a.parts.filter(function (p) { return /^U\d+$/.test(p.id); }).length;
    b.parts.forEach(function (p) { if (/^U\d+$/.test(p.id)) ren[p.id] = 'U' + (++uid); else if (p.id === 'L1') ren[p.id] = 'L2'; });
    var r = function (x) { var id = x.split('.')[0]; return (ren[id] || id) + x.slice(id.length); };
    b.parts.forEach(function (p) { if (/^U\d+$/.test(p.id) || p.id === 'L1') { var q = JSON.parse(JSON.stringify(p)); q.id = ren[p.id]; q.y += 320; a.parts.push(q); } });
    b.wires.forEach(function (w) { a.wires.push({ from: r(w.from), to: r(w.to) }); });
    var leds = a.parts.filter(function (p) { return p.id === 'L2'; }); // Anzeige nach rechts: gleiche Spalte wie L1
    return a;
  };
  /* Bild eines Gatters für Tabellenzellen (neue Norm, Rechteck mit Zeichen) und US-Form: kleine SVG-Zeichnungen */
  P.svgNorm = function (qual, neg) { return '<svg viewBox="0 0 70 44" width="70" height="44" class="pf-sym" role="img" aria-label="Gatter nach neuer Norm, Zeichen ' + qual + (neg ? ', Ausgang negiert' : '') + '"><rect x="14" y="6" width="34" height="32" fill="none" stroke="currentColor" stroke-width="2"/><text x="31" y="28" text-anchor="middle" font-size="16" font-family="sans-serif" fill="currentColor">' + qual + '</text><path d="M2 15H14M2 29H14" stroke="currentColor" stroke-width="2"/>' + (neg ? '<circle cx="52" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M56 22H68" stroke="currentColor" stroke-width="2"/>' : '<path d="M48 22H68" stroke="currentColor" stroke-width="2"/>') + '</svg>'; };
  var US = {
    and: 'M12 6H28A16 16 0 0 1 28 38H12Z', or: 'M12 6Q34 6 50 22Q34 38 12 38Q22 22 12 6Z', buf: 'M14 6L46 22L14 38Z', not: 'M14 6L44 22L14 38Z'
  };
  P.svgUS = function (art, neg, xor) {
    var body = US[art], bubble = neg ? '<circle cx="' + (art === 'not' ? 48 : art === 'and' ? 48 : 54) + '" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' : '';
    var out = neg ? (art === 'not' || art === 'and' ? 52 : 58) : (art === 'and' ? 44 : art === 'or' ? 50 : 46);
    return '<svg viewBox="0 0 72 44" width="72" height="44" class="pf-sym" role="img" aria-label="Gatter in US-Darstellung"><path d="' + body + '" fill="none" stroke="currentColor" stroke-width="2"/>' + (xor ? '<path d="M6 6Q16 22 6 38" fill="none" stroke="currentColor" stroke-width="2"/>' : '') + bubble +
      (art === 'buf' || art === 'not' ? '<path d="M2 22H14" stroke="currentColor" stroke-width="2"/>' : '<path d="M2 15H' + (xor ? 12 : 14) + 'M2 29H' + (xor ? 12 : 14) + '" stroke="currentColor" stroke-width="2"/>') + '<path d="M' + out + ' 22H70" stroke="currentColor" stroke-width="2"/></svg>';
  };

  /* ---------- Flipflops nach Lehrbuch (Teil B) ----------
   * Ein Flipflop wird durch seine Folgefunktion next(AV, e) beschrieben (e = Liste der Eingangswerte, Ergebnis 0, 1 oder 'X' für unzulässig). Daraus entstehen
   * Analysetabelle, Ansteuertabelle, Zustandsfolgediagramm und Soll-Folgen für die Prüfmaschine. Die Tests vergleichen next() mit dem Verhalten der Engine. */
  var X = ['X', 'x', '-', 'verboten'];
  P.ffAnalyse = function (ein, next) { // Zeilen: Eingänge (hochzählend), dann AV; Antwort A
    var n = ein.length, zeilen = [];
    for (var k = 0; k < (1 << (n + 1)); k++) { var av = k & 1, e = []; for (var i = 0; i < n; i++) e.push(k >> (n - i) & 1); var a = next(av, e); zeilen.push(e.map(String).concat([String(av), { a: a === 'X' ? X : String(a), typ: 'bit' }])); }
    return { kopf: ein.concat(['AV', 'A']), zeilen: zeilen };
  };
  /* Ansteuertabelle: zu jedem Übergang AV → A die nötigen Eingangswerte (0, 1 oder X = beliebig) */
  P.ffUebergang = function (ein, next) {
    var n = ein.length, out = [];
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (t) {
      var sets = ein.map(function () { return {}; });
      for (var k = 0; k < (1 << n); k++) { var e = []; for (var i = 0; i < n; i++) e.push(k >> (n - 1 - i) & 1); if (next(t[0], e) === t[1]) e.forEach(function (v, i) { sets[i][v] = 1; }); }
      out.push({ av: t[0], a: t[1], v: sets.map(function (st) { return st[0] && st[1] ? 'X' : st[1] ? '1' : '0'; }) });
    });
    return out;
  };
  P.ffAnsteuer = function (ein, next) {
    var u = P.ffUebergang(ein, next);
    return { kopf: ['AV', 'A'].concat(ein), zeilen: u.map(function (r) { return [String(r.av), String(r.a)].concat(r.v.map(function (x) { return { a: x === 'X' ? X : x, typ: 'bit' }; })); }) };
  };
  /* Zustandsfolgediagramm als SVG (zwei Zustände, Pfeile beschriftet mit den Eingängen der Ansteuertabelle) */
  P.svgZustand = function (ein, next) {
    var u = P.ffUebergang(ein, next), lab = function (r) { return ein.join(' ') + ' = ' + r.v.join(' '); }, t = function (x, y, s) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="12" font-family="sans-serif" fill="currentColor">' + s + '</text>'; };
    var s = '<svg viewBox="0 0 280 150" width="320" class="pf-sfd" role="img" aria-label="Zustandsfolgediagramm"><defs><marker id="pfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs><g fill="none" stroke="currentColor" stroke-width="1.6">';
    s += '<circle cx="70" cy="78" r="22"/><circle cx="210" cy="78" r="22"/><path d="M90 66C115 48 165 48 190 66" marker-end="url(#pfa)"/><path d="M190 90C165 108 115 108 90 90" marker-end="url(#pfa)"/><path d="M58 58C40 22 82 22 76 56" marker-end="url(#pfa)"/><path d="M198 58C180 22 222 22 216 56" marker-end="url(#pfa)"/></g>';
    return s + t(70, 83, '0') + t(210, 83, '1') + t(140, 42, lab(u[1])) + t(140, 124, lab(u[2])) + t(62, 16, lab(u[0])) + t(202, 16, lab(u[3])) + '</svg>';
  };
  /* Soll-Folge für die Prüfmaschine: plan = [{set:{E1:1}, takte:n}] → Schritte mit erwartet [Q, Q̄]; ein Taktimpuls wendet next(AV, Eingänge) an; Eingangsnamen in ein (Reihenfolge wie next) */
  P.ffSchritte = function (ein, next, plan, q0) {
    var q = q0 ? 1 : 0, cur = {}; ein.forEach(function (n, i) { cur['E' + (i + 1)] = 0; }); // Eingänge der Prüfschaltung heissen E1, E2 … in der Reihenfolge von ein
    return plan.map(function (p) {
      Object.keys(p.set || {}).forEach(function (k) { cur[k] = p.set[k] ? 1 : 0; });
      for (var t = 0; t < (p.takte || 0); t++) { var nq = next(q, ein.map(function (n, i) { return cur['E' + (i + 1)]; })); if (nq !== 'X') q = nq; }
      var st = { erwartet: [q, 1 - q] }; if (p.set) st.set = p.set; if (p.takte) st.takte = p.takte; if (p.name) st.name = p.name; return st;
    });
  };
  P.FF = {
    rs: function (q, e) { return e[0] && e[1] ? 'X' : e[0] ? 1 : e[1] ? 0 : q; },       // e = [S, R]
    d: function (q, e) { return e[0]; },
    t: function (q, e) { return e[0] ? 1 - q : q; },
    jk: function (q, e) { return e[0] && e[1] ? 1 - q : e[0] ? 1 : e[1] ? 0 : q; }       // e = [J, K]
  };

  /* Standard-Station für ein einzelnes Flipflop (T, D, RS, JK): Analysetabelle, Ansteuertabelle, Zustandsfolgediagramm (von Hand, die Software zeigt das Muster),
   * Schaltung mit dem Bauteil bauen und über Takte prüfen. def: {id, nr, titel, kurz, einfuehrung, typ (Bauteil), ein (Namen der Eingänge, Reihenfolge wie next), next,
   * plan (Schritte für die Prüfung), props? (Eigenschaften des Bauteils, z. B. {trig:'pos'}), extra:[weitere Aufgaben], fragen:[…], schaltet:[…]} */
  P.ffStation = function (d) {
    var id = d.id, n = d.ein.length, aufg = [], nr = 0, q = function () { return id + '.' + (++nr); };
    var an = P.ffAnalyse(d.ein, d.next), ans = P.ffAnsteuer(d.ein, d.next), pins = d.ein.concat(['C']);
    var start = P.startNetz(n, 2, [{ id: 'C', type: 'logicin', x: 200, y: 80 + n * 100 + 100, rot: 0 }]);
    var srcs = d.ein.map(function (x, i) { return 'E' + (i + 1); }).concat(['C']);
    var muster = P.netz({ n: n, eingaenge: ['C'], gatter: [['FF1', d.typ, srcs, d.props || null, pins]], aus: { L1: 'FF1.Q', L2: 'FF1.Qn' } });
    aufg.push({ id: q(), titel: 'Analysetabelle', art: 'tabelle', kopf: an.kopf, zeilen: an.zeilen, text: d.analyseText || '<p>Fülle die <b>Analysetabelle</b> aus: Bei welchem Eingang und welchem Zustand <b>vor</b> der Taktflanke (<b>AV</b>) hat der Ausgang <b>danach</b> (<b>A</b>) welchen Wert?' + (d.unzulaessig ? ' Für den unzulässigen Fall schreibst du <b>X</b>.' : '') + '</p>', hilfe: d.analyseHilfe });
    aufg.push({ id: q(), titel: 'Ansteuertabelle', art: 'tabelle', kopf: ans.kopf, zeilen: ans.zeilen, text: '<p>Die <b>Ansteuertabelle</b> fragt umgekehrt: Der Zustand soll von <b>AV</b> nach <b>A</b> wechseln – welche Eingangswerte braucht es dafür? Wo es egal ist, schreibst du <b>X</b> (beliebig).</p>', hilfe: 'Schau dir in der Analysetabelle alle Zeilen an, die zu diesem Übergang führen. Ist ein Eingang darin einmal 0 und einmal 1, ist er egal: X.' });
    aufg.push({ id: q(), titel: 'Zustandsfolgediagramm', art: 'vergleich', text: '<p>Zeichne das <b>Zustandsfolgediagramm</b> des Flipflops auf Papier: zwei Kreise für Q = 0 und Q = 1, vier Pfeile für die vier Übergänge, jeder beschriftet mit den Eingangswerten aus der Ansteuertabelle. Schreibe dann kurz auf, was dir aufgefallen ist, und gib ab. Die Software zeigt dir danach das Diagramm zum Vergleich; bewertet wird nicht.</p>', zeigeMuster: '<p>So sieht das Diagramm aus:</p>' + P.svgZustand(d.ein, d.next) });
    aufg.push({ id: q(), titel: 'Schaltung bauen und prüfen', art: 'folge', takt: 'C', lesen: ['L1', 'L2'], schritte: P.ffSchritte(d.ein, d.next, d.plan), start: start, muster: muster, min: (function () { var m = {}; m[d.typ] = 1; return m; })(),
      text: d.bauText || '<p>Baue die Schaltung: Setze ein <b>' + P.FFNAMEN[d.typ] + '</b> und verbinde es mit den Pegelschaltern ' + d.ein.map(function (x, i) { return '<b>E' + (i + 1) + '</b> (' + x + ')'; }).join(', ') + ' und <b>C</b> (Takt). Die Anzeige <b>L1</b> zeigt Q, <b>L2</b> zeigt Q̄. Die Software schaltet die Eingänge, gibt Takte und liest die Anzeigen.</p>', hilfe: 'Q und Q̄ sind die zwei Ausgänge des Bauteils. Du kannst die Schaltung selbst ausprobieren: Eingänge setzen, C auf 1 und wieder auf 0.' });
    (d.extra || []).forEach(function (x) { x.id = q(); aufg.push(x); });
    if (d.fragen) aufg.push({ id: q(), titel: 'Prüffragen ' + d.titel, art: 'fragen', text: '<p>Kurze Fragen.</p>', fragen: d.fragen });
    return P.station({ id: id, teil: 'B', nr: d.nr, titel: d.titel, kurz: d.kurz, einfuehrung: d.einfuehrung, verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: d.schaltet || [], auto: true, aufgaben: aufg });
  };
  P.FFNAMEN = { tff: 'T-Flipflop', dff: 'D-Flipflop', rsff: 'RS-Flipflop', jkff: 'JK-Flipflop', jkms: 'JK-Master-Slave-Flipflop' };

  /* Schaltung mit Rückkopplung (Zähler, Speicher) aus Teileliste und Leitungsliste; Positionen automatisch im Raster. teile: [[id, typ, props?], …], leitungen: [[von, nach], …].
   * 'E1' und 'L1' dürfen in den Leitungen ohne Anschlussnamen stehen (E1 = E1.out, L1 = L1.in), 'H' ist ein Pegelschalter fest auf 1, 'Z' fest auf 0. */
  P.raster = function (d) {
    var zeilen = d.zeilen || 5, parts = [], k = 0, col = {};
    d.teile.forEach(function (t) {
      var typ = t[1], x = 200 + Math.floor(k / zeilen) * 230, y = 80 + (k % zeilen) * 110; k++;
      var p = { id: t[0], type: typ, x: x, y: y, rot: 0 }; if (t[2]) p.props = t[2]; parts.push(p);
    });
    var pinOf = function (s, nach) { if (s.indexOf('.') >= 0) return s; var p = parts.filter(function (x) { return x.id === s; })[0]; return p && p.type === 'logicled' ? s + '.in' : s + '.out'; };
    return { parts: parts, wires: d.leitungen.map(function (w) { return { from: pinOf(w[0]), to: pinOf(w[1]) }; }) };
  };
  P.EIN1 = function (id) { return [id || 'H', 'logicin', { konst: true, closed: true }]; };   // fest 1
  P.EIN0 = function (id) { return [id || 'Z', 'logicin', { konst: true, closed: false }]; };  // fest 0
  P.pegel = function (id, konst) { return { id: id, type: 'logicin', x: 200, y: 460, rot: 0, props: konst === undefined ? undefined : { konst: true, closed: !!konst } }; };
  /* Asynchroner Dualzähler mit n Stufen aus T-Flipflops; modul < 2^n: bei Erreichen von modul werden alle Stufen über preClear zurückgesetzt (UND der gesetzten Bits). aufwaerts false: Q statt Q̄ taktet die nächste Stufe */
  P.rippleZaehler = function (n, modul, aufwaerts) {
    var teile = [['C', 'logicin'], P.EIN1('H')], leit = [], i; aufwaerts = aufwaerts !== false;
    for (i = 0; i < n; i++) { teile.push(['FF' + (i + 1), 'tff']); teile.push(['L' + (i + 1), 'logicled']); }
    for (i = 0; i < n; i++) { leit.push(['H', 'FF' + (i + 1) + '.T']); leit.push(['FF' + (i + 1) + '.Q', 'L' + (i + 1)]); leit.push(i === 0 ? ['C', 'FF1.C'] : ['FF' + i + '.' + (aufwaerts ? 'Qn' : 'Q'), 'FF' + (i + 1) + '.C']); }
    if (modul && modul < (1 << n)) { var bits = []; for (i = 0; i < n; i++) if (modul >> i & 1) bits.push('FF' + (i + 1) + '.Q'); teile.push(['U1', 'and', { inputs: Math.max(2, bits.length) }]); bits.forEach(function (b, k) { leit.push([b, 'U1.in' + (k + 1)]); }); for (i = 0; i < n; i++) leit.push(['U1', 'FF' + (i + 1) + '.PC']); }
    return P.raster({ teile: teile, leitungen: leit, zeilen: n + 2 });
  };
  /* Dezimal ↔ Dual ↔ Hex für die Zahlensysteme */
  P.dual = function (v, stellen) { var s = v.toString(2); while (s.length < (stellen || 0)) s = '0' + s; return s; };
  P.hex = function (v) { return v.toString(16).toUpperCase(); };
  P.gray = function (v) { return v ^ (v >> 1); };
})(typeof window !== 'undefined' ? window : globalThis);

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
    var body = US[art === 'buf' || art === 'not' ? art : art], bubble = neg ? '<circle cx="' + (art === 'not' ? 48 : art === 'and' ? 56 : 54) + '" cy="22" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' : '';
    var out = neg ? (art === 'not' ? 52 : art === 'and' ? 60 : 58) : (art === 'and' ? 56 : art === 'or' ? 50 : 46);
    return '<svg viewBox="0 0 72 44" width="72" height="44" class="pf-sym" role="img" aria-label="Gatter in US-Darstellung"><path d="' + body + '" fill="none" stroke="currentColor" stroke-width="2"/>' + (xor ? '<path d="M6 6Q16 22 6 38" fill="none" stroke="currentColor" stroke-width="2"/>' : '') + bubble +
      (art === 'buf' || art === 'not' ? '<path d="M2 22H14" stroke="currentColor" stroke-width="2"/>' : '<path d="M2 15H' + (xor ? 12 : 14) + 'M2 29H' + (xor ? 12 : 14) + '" stroke="currentColor" stroke-width="2"/>') + '<path d="M' + out + ' 22H70" stroke="currentColor" stroke-width="2"/></svg>';
  };
  /* Dezimal ↔ Dual ↔ Hex für die Zahlensysteme */
  P.dual = function (v, stellen) { var s = v.toString(2); while (s.length < (stellen || 0)) s = '0' + s; return s; };
  P.hex = function (v) { return v.toString(16).toUpperCase(); };
  P.gray = function (v) { return v ^ (v >> 1); };
})(typeof window !== 'undefined' ? window : globalThis);

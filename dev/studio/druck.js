/* Digital Quest Studio – Drucken: Rahmen, Schriftfeld, mehrseitig mit Herleitung (Auftrag «Bauen», Paket 5, Entwurf Anhang A)
 * Seite 1 ist immer die Schaltung im Zeichnungsrahmen. Für die Folgeseiten wird ausgewählt, was mitgedruckt wird: Wahrheitstabelle, Boolescher Ausdruck mit
 * Minimalform, KV-Diagramm mit Gruppen, Oszilloskop-Kurven, Zeitverlauf, Stückliste. Zwei Fassungen: «Lösung» (alles ausgefüllt) und «Aufgabe»
 * (Tabelle, Ausdruck und KV-Diagramm als leere Vordrucke). Passt nicht alles auf eine Seite, wird umbrochen; das Schriftfeld zählt die Seiten («2 / 3»).
 * «PDF erzeugen» öffnet den Druckdialog des Browsers; dort Ziel «Als PDF speichern» wählen (die Blattgrösse steht im Druckauftrag). */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E, B = root.DQStudioBool, V = root.DQVisuals;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var SH = S.SHEET, F = SH.FORMATS, M = SH.M;
  S.printOptions = { format: 'a4p', frame: true, version: 'loesung', grid: false, items: { table: true, expr: true, kv: true, scope: false, timing: false, bom: false } };

  /* ---------- Ist die Schaltung eine reine Logikschaltung? ---------- */
  var LOGIC_TYPES = { logicin: 1, logicled: 1, not: 1, and: 1, or: 1, nand: 1, nor: 1, xor: 1, xnor: 1, node: 1, ground: 1 };
  var OUT_NAMES = ['A', 'B', 'C', 'D', 'F', 'G', 'H'];
  /* {ok, why} oder {ok:true, ins, outs, n, rows (je Eingangskombination k, e1 = niederwertigstes Bit), exprs, tableWhy?, kvWhy?} */
  S.logicInfo = function (layout) {
    layout = layout || S.core.layout; if (!layout.parts.length) return { ok: false, why: 'Die Schaltung ist leer.' };
    var bad = layout.parts.filter(function (p) { return !LOGIC_TYPES[p.type]; });
    if (bad.length) {
      var seq = bad.some(function (p) { var d = E.PARTS[p.type]; return d.ff || d.ctr || p.type === 'clock'; });
      return { ok: false, why: seq ? 'Die Schaltung enthält Takt, Flipflops oder Zähler: Tabelle, Ausdruck und KV-Diagramm gibt es nur für reine Logikschaltungen ohne Speicher.' : 'Die Schaltung enthält Bauteile, die keine Logik sind (' + bad.slice(0, 3).map(function (p) { return p.id; }).join(', ') + (bad.length > 3 ? ' …' : '') + '): Tabelle, Ausdruck und KV-Diagramm gibt es nur für reine Logikschaltungen aus Pegelschaltern, Gattern und Logikanzeigen.' };
    }
    var ins = B.inputsOf(layout), outs = B.outputsOf(layout);
    if (!ins.length) return { ok: false, why: 'Es fehlen Pegelschalter als Eingänge.' };
    if (!outs.length) return { ok: false, why: 'Es fehlt eine Logikanzeige (oder ein freier Gatterausgang) als Ausgang.' };
    var exprs; try { exprs = outs.map(function (o) { return B.readCircuit(layout, o.pin); }); } catch (e) { return { ok: false, why: e.message }; }
    var t = B.circuitTable(layout); if (t.error) return { ok: false, why: t.error };
    var n = ins.length, r = { ok: true, ins: ins, outs: outs, n: n, rows: t.rows, exprs: exprs, names: outs.map(function (o, i) { return OUT_NAMES[i] || 'A' + (i + 1); }) };
    if (n > 5) r.tableWhy = 'Mehr als 5 Eingänge: die Tabelle hätte über 32 Zeilen und passt nicht auf ein Blatt.';
    if (n > 4) r.kvWhy = 'Das KV-Diagramm gibt es bis 4 Eingänge.'; else if (n < 2) r.kvWhy = 'Das KV-Diagramm braucht mindestens 2 Eingänge.';
    return r;
  };

  /* ---------- Herleitung: Tabelle, Minimalform, Ausklammern ---------- */
  var lit = function (n, neg) { var v = { op: 'var', n: n }; return neg ? { op: 'not', a: v } : v; };
  function rowBits(n, r) { var e = []; for (var i = 0; i < n; i++) e.push(r >> (n - 1 - i) & 1); return e; } // Tabellenzeile r: e1 ganz links = höchstes Bit
  function kOf(e) { var k = 0; e.forEach(function (b, i) { k |= b << i; }); return k; }
  function sopFromOnes(info, ones) { // kanonische Summe von Produkten aus den Einsen, Zeilen in Tabellenreihenfolge
    if (!ones.length) return { op: 'const', v: 0 }; if (ones.length === 1 << info.n) return { op: 'const', v: 1 };
    var terms = ones.map(function (e) { var lits = e.map(function (b, i) { return lit(info.ins[i].n, !b); }); return lits.length === 1 ? lits[0] : { op: 'and', args: lits }; });
    return terms.length === 1 ? terms[0] : { op: 'or', args: terms };
  }
  function termsOf(ast) { // Summe von Produkten → Liste von Literallisten
    var ts = ast.op === 'or' ? ast.args : [ast];
    return ts.map(function (t) { var ls = t.op === 'and' ? t.args : [t]; return ls.map(function (l) { return l.op === 'not' ? { n: l.a.n, neg: true } : { n: l.n, neg: false }; }); });
  }
  function litAst(l) { return lit(l.n, l.neg); }
  function andOf(a) { return a.length === 1 ? a[0] : { op: 'and', args: a }; }
  function orOf(a) { return a.length === 1 ? a[0] : { op: 'or', args: a }; }
  /* Ausklammern: häufigstes Literal vor die Klammer, rekursiv. {ast, steps:[{lit, before, after}]} */
  function factorOut(terms, steps) {
    if (terms.length === 1) return andOf(terms[0].map(litAst));
    var cnt = {}; terms.forEach(function (t) { t.forEach(function (l) { var k = l.n + (l.neg ? 'n' : 'p'); cnt[k] = (cnt[k] || 0) + 1; }); });
    var best = null; Object.keys(cnt).forEach(function (k) { if (cnt[k] >= 2 && (!best || cnt[k] > cnt[best] || (cnt[k] === cnt[best] && (+k.slice(0, -1) < +best.slice(0, -1))))) best = k; });
    if (!best) return orOf(terms.map(function (t) { return andOf(t.map(litAst)); }));
    var bn = +best.slice(0, -1), bneg = best.slice(-1) === 'n', has = function (t) { return t.some(function (l) { return l.n === bn && l.neg === bneg; }); };
    var withL = terms.filter(has), rest = terms.filter(function (t) { return !has(t); });
    var inner = withL.map(function (t) { return t.filter(function (l) { return !(l.n === bn && l.neg === bneg); }); }), L = lit(bn, bneg), grp;
    if (inner.some(function (t) { return !t.length; })) grp = L; // L v L·x = L (Absorption)
    else { var sub = factorOut(inner, steps); grp = { op: 'and', args: [L].concat(sub.op === 'and' && false ? sub.args : [sub]) }; }
    steps.push({ lit: L, before: orOf(withL.map(function (t) { return andOf(t.map(litAst)); })), after: grp });
    var rr = rest.length ? factorOut(rest, steps) : null; return rr ? { op: 'or', args: [grp, rr] } : grp;
  }
  function gateCount(a) { switch (a.op) { case 'var': case 'const': return 0; case 'not': return gateCount(a.a); default: return (a.args.length >= 2 ? 1 : 0) + a.args.reduce(function (s, x) { return s + gateCount(x); }, 0); } }
  S.factorOut = function (ast) { if (ast.op === 'const') return { ast: ast, steps: [] }; var steps = []; return { ast: factorOut(termsOf(ast), steps), steps: steps }; };
  var H = function (ast) { return B.fmtHtml(ast); };

  /* Alles zur Herleitung eines Ausgangs o: {ones (Zeilenbits), canon, minimal, factored, steps, groups, kvOnes} */
  function derive(info, o) {
    var n = info.n, rows = [], onesBits = [], onesK = [];
    for (var r = 0; r < 1 << n; r++) { var e = rowBits(n, r), k = kOf(e), v = info.rows[k][o]; rows.push({ e: e, v: v }); if (v) { onesBits.push(e); onesK.push(k); } }
    var names = info.ins.map(function (x) { return x.n; }), canon = sopFromOnes(info, onesBits), minimal = B.minimalExpr(onesK, names, []);
    var fac = S.factorOut(minimal), groups = n >= 2 && n <= 4 && onesK.length && onesK.length < 1 << n ? V.minimize(n, onesK, []) : [];
    return { rows: rows, canon: canon, minimal: minimal, factored: fac.ast, steps: fac.steps, groups: groups, onesK: onesK };
  }
  function lawText(info, d) {
    if (d.minimal.op === 'const') return 'Der Ausgang ist konstant ' + d.minimal.v + ': Alle Eingangskombinationen ergeben dasselbe Ergebnis, die Schaltung lässt sich durch eine feste ' + d.minimal.v + ' ersetzen.';
    if (!d.steps.length) return 'Die Minimalform lässt sich nicht weiter ausklammern: Sie ist schon die kürzeste Schreibweise (' + gateCount(d.minimal) + ' Gatter).';
    var s = d.steps[d.steps.length - 1], g0 = gateCount(d.minimal), g1 = gateCount(d.factored), lits = d.steps.map(function (x) { return H(x.lit); });
    return 'Benutzter Rechenschritt: Ausklammern von ' + lits.join(' und ') + ' – das <b>konjunktive Distributivgesetz</b> (' + H(s.before) + ' = ' + H(s.after) + '). ' +
      (g0 > g1 ? 'Es spart ' + (g0 - g1) + (g0 - g1 === 1 ? ' Gatter' : ' Gatter') + ': Statt ' + g0 + ' Gattern (UND und ODER) braucht die Schaltung nur noch ' + g1 + '.' : 'Die Anzahl der Gatter bleibt gleich, die Form ist aber übersichtlicher.');
  }

  /* ---------- Bausteine der Folgeseiten (HTML und SVG) ---------- */
  function truthTable(info, ds, blank) {
    var h = '<table class="tt"><thead><tr>' + info.ins.map(function (x) { return '<th>e' + x.n + '</th>'; }).join('') + info.names.map(function (nm) { return '<th class="out">' + esc(nm) + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var r = 0; r < 1 << info.n; r++) {
      var e = ds[0].rows[r].e, one = !blank && ds.some(function (d) { return d.rows[r].v; });
      h += '<tr' + (one ? ' class="one"' : '') + '>' + e.map(function (b) { return '<td>' + b + '</td>'; }).join('') + ds.map(function (d) { return '<td class="res' + (!blank && d.rows[r].v ? ' b' : '') + '">' + (blank ? '&nbsp;' : d.rows[r].v) + '</td>'; }).join('') + '</tr>';
    }
    return h + '</tbody></table>';
  }
  var GRAYS = { 1: [0, 1], 2: [0, 1, 3, 2] };
  /* KV-Diagramm: Zeilen = die ersten Eingänge, Spalten = die übrigen (Gray-Code); {svg, w, h} */
  function kvSVG(info, d, name, blank) {
    var n = info.n, rv = n === 2 ? 1 : n === 3 ? 1 : 2, cv = n - rv, R = 1 << rv, C = 1 << cv, cs = 60, ox = 74, oy = 56, gr = GRAYS[rv] || [0, 1], gc = GRAYS[cv] || [0, 1];
    var cellK = function (r, c) { var e = new Array(n), rc = gr[r], cc = gc[c], i; for (i = 0; i < rv; i++) e[i] = rc >> (rv - 1 - i) & 1; for (i = 0; i < cv; i++) e[rv + i] = cc >> (cv - 1 - i) & 1; return kOf(e); };
    var code = function (v, bits) { var s = ''; for (var i = bits - 1; i >= 0; i--) s += v >> i & 1; return s; };
    var ones = {}; d.onesK.forEach(function (k) { ones[k] = 1; });
    var nm = function (i) { return 'e' + info.ins[i].n; }, rvn = [], cvn = []; for (var i = 0; i < rv; i++) rvn.push(nm(i)); for (i = 0; i < cv; i++) cvn.push(nm(rv + i));
    var mono = 'font-family="\'DejaVu Sans Mono\', Consolas, monospace"', s = '';
    s += '<text x="' + (ox + C * cs / 2) + '" y="14" font-size="12" fill="#444" text-anchor="middle" font-family="sans-serif">' + esc(cvn.join(' ')) + '</text>';
    for (var c = 0; c < C; c++) s += '<text x="' + (ox + c * cs + cs / 2) + '" y="' + (oy - 10) + '" font-size="15" text-anchor="middle" ' + mono + '>' + code(gc[c], cv) + '</text>';
    for (var r = 0; r < R; r++) s += '<text x="' + (ox - 10) + '" y="' + (oy + r * cs + cs / 2 + 5) + '" font-size="15" text-anchor="end" ' + mono + '>' + code(gr[r], rv) + '</text>';
    s += '<text transform="translate(14 ' + (oy + R * cs / 2) + ') rotate(-90)" font-size="12" fill="#444" text-anchor="middle" font-family="sans-serif">' + esc(rvn.join(' ')) + '</text>';
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      var k = cellK(r, c), v = ones[k] ? 1 : 0;
      s += '<rect x="' + (ox + c * cs) + '" y="' + (oy + r * cs) + '" width="' + cs + '" height="' + cs + '" fill="none" stroke="#000" stroke-width="1.5"/>' + (blank ? '' : '<text x="' + (ox + c * cs + cs / 2) + '" y="' + (oy + r * cs + cs / 2 + 8) + '" font-size="22" text-anchor="middle" ' + mono + (v ? ' font-weight="700"' : ' fill="#666"') + '>' + v + '</text>');
    }
    var labels = [];
    if (!blank) d.groups.forEach(function (p, gi) { // Gruppe: abgerundete Rechtecke, verschiedene Strichart (nicht nur Farbe)
      var rows = {}, cols = {}; for (var rr = 0; rr < R; rr++) for (var cc = 0; cc < C; cc++) if (p.cells.indexOf(cellK(rr, cc)) >= 0) { rows[rr] = 1; cols[cc] = 1; }
      var runs = function (set) { var ks = Object.keys(set).map(Number).sort(function (a, b) { return a - b; }), out = [], cur = null; ks.forEach(function (x) { if (cur && x === cur[1] + 1) cur[1] = x; else { cur = [x, x]; out.push(cur); } }); return out; };
      var dash = gi % 2 ? ' stroke-dasharray="7 5"' : '', ins = 6 + 3 * (gi % 3), cx0 = 1e9, cx1 = -1;
      runs(rows).forEach(function (rs) { runs(cols).forEach(function (cs2) { s += '<rect x="' + (ox + cs2[0] * cs + ins) + '" y="' + (oy + rs[0] * cs + ins) + '" width="' + ((cs2[1] - cs2[0] + 1) * cs - 2 * ins) + '" height="' + ((rs[1] - rs[0] + 1) * cs - 2 * ins) + '" rx="14" fill="none" stroke="#000" stroke-width="2"' + dash + '/>'; cx0 = Math.min(cx0, cs2[0]); cx1 = Math.max(cx1, cs2[1]); }); });
      var t = []; for (var i2 = 0; i2 < n; i2++) { if (p.mask >> i2 & 1) continue; t.push(p.val >> i2 & 1 ? nm(i2) : 'ē' + info.ins[i2].n); }
      labels.push({ x: ox + (cx0 + cx1 + 1) * cs / 2, txt: t.join('') || '1', dash: !!dash });
    });
    // Bezeichnungen der Gruppen unter dem Raster, nahe bei der Gruppe, ohne sich zu überdecken (Zeile für Zeile)
    labels.sort(function (a, b) { return a.x - b.x; }); var rowEnd = [], base = oy + R * cs + 22;
    labels.forEach(function (l) { var w = 28 + l.txt.length * 9.5, x0 = l.x - w / 2, lv = 0; while (rowEnd[lv] !== undefined && x0 < rowEnd[lv] + 8) lv++; x0 = Math.max(ox, x0); rowEnd[lv] = x0 + w; var y = base + lv * 20;
      s += '<path d="M' + x0 + ' ' + (y - 5) + 'h22" stroke="#000" stroke-width="2"' + (l.dash ? ' stroke-dasharray="6 4"' : '') + '/><text x="' + (x0 + 28) + '" y="' + y + '" font-size="15" ' + mono + '>' + esc(l.txt) + '</text>'; });
    var w = ox + C * cs + 20, hgt = oy + R * cs + 14 + (labels.length ? 24 + 20 * rowEnd.length : 0);
    return { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + hgt + '" viewBox="0 0 ' + w + ' ' + hgt + '" class="kvsvg">' + s + '</svg>', w: w, h: hgt };
  }
  function exprLines(info, d, name, blank) {
    var row = function (l, r, b) { return '<div class="ex' + (b ? ' last' : '') + '"><div class="exl">' + l + '</div><div class="exr">' + (blank ? '' : r) + '</div></div>'; };
    return '<div class="exs">' + row('Aus der Tabelle', esc(name) + ' = ' + H(d.canon)) + row('Aus dem KV-Diagramm', esc(name) + ' = ' + H(d.minimal)) + row('Ausgeklammert', '<b>' + esc(name) + ' = ' + H(d.factored) + '</b>', true) + '</div>';
  }

  /* ---------- Bilder von Oszilloskop und Zeitverlauf (so wie sie gerade stehen) ---------- */
  function scopeImages() {
    return S.scopes.filter(function (sc) { return sc.ch.length; }).map(function (sc) { sc.draw(true); return { url: sc.cv.toDataURL('image/png'), w: sc.cv.clientWidth || 560, h: sc.cv.clientHeight || 300, title: 'Oszilloskop ' + sc.id + ': ' + sc.ch.map(function (c) { return c.tr.label; }).join(', ') }; });
  }
  function timingImage() {
    var rows = S.timing.rows; if (!rows.length) return null; if (S.timingDraw) S.timingDraw();
    var cvs = Array.prototype.slice.call(document.querySelectorAll('#tlRows .tl-cv')), labs = Array.prototype.slice.call(document.querySelectorAll('#tlRows .tl-row')); if (!cvs.length) return null;
    var lw = 150, W = Math.max.apply(null, cvs.map(function (c) { return c.width; })) + Math.round(lw * (root.devicePixelRatio || 1)), dpr = root.devicePixelRatio || 1, y = 0, H = cvs.reduce(function (s, c) { return s + c.height; }, 0);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.font = (12 * dpr) + 'px monospace'; ctx.fillStyle = '#000'; ctx.textBaseline = 'middle';
    cvs.forEach(function (c, i) { var nm = labs[i] ? (labs[i].querySelector('.tl-nm') || {}).textContent || '' : ''; ctx.fillText(nm.slice(0, 20), 6 * dpr, y + c.height / 2); ctx.drawImage(c, Math.round(lw * dpr), y); ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(0, y + c.height - .5); ctx.lineTo(W, y + c.height - .5); ctx.stroke(); y += c.height; });
    return { url: cv.toDataURL('image/png'), w: W / dpr, h: H / dpr };
  }

  /* ---------- Seiten aufbauen ---------- */
  function wrapText(t, n) { var out = [], line = ''; String(t || '').split(/\s+/).forEach(function (w) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }); if (line) out.push(line); return out; }
  function figureImage(opts, region) { // Schaltung innerhalb des Rahmens als Bild
    var r = S.exportSVG({ color: false, values: false, grid: opts.grid, draw: opts.draw !== false, region: region });
    return { url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg), w: r.w, h: r.h, svg: r.svg };
  }
  /* Folgeseiten: Blöcke {h, html} nacheinander auf Seiten verteilen; ein Block wird nie zerschnitten, nur Stücklistenzeilen laufen über */
  function paginate(blocks, H0) {
    var pages = [[]], used = 0;
    blocks.forEach(function (b) {
      if (b.rows) { // Tabelle mit Zeilen: so viele wie passen, Rest auf der nächsten Seite mit Kopf
        var rows = b.rows.slice(), first = true;
        while (rows.length) {
          var avail = H0 - used - (first ? b.head : b.head) - 8, fit = Math.floor(avail / b.rh);
          if (fit < Math.min(4, rows.length)) { pages.push([]); used = 0; continue; }
          var take = rows.splice(0, Math.min(fit, rows.length)); pages[pages.length - 1].push({ h: b.head + take.length * b.rh + 8, html: b.build(take, first) }); used += b.head + take.length * b.rh + 8; first = false;
          if (rows.length) { pages.push([]); used = 0; }
        }
        return;
      }
      if (used + b.h > H0 && used > 0) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(b); used += b.h;
    });
    return pages;
  }

  /* Folgeseite füllen: Inhalt in natürlicher Breite messen und gemeinsam (Schrift, Tabelle, KV) so skalieren, dass er den Inhaltsbereich füllt */
  function fillPage(html, Wn, cw, availH) {
    var m = document.createElement('div'); document.body.appendChild(m); var best = null;
    [[Wn, false], [Wn, true], [600, true], [520, true], [460, true], [420, true]].forEach(function (c) {
      var W = Math.min(c[0], Wn); m.style.cssText = 'position:absolute;left:-99999px;top:0;display:flow-root;width:' + W + 'px'; m.className = c[1] ? 'fitin stack' : 'fitin'; m.innerHTML = html;
      if (m.scrollWidth > W + 1) return; // passt in dieser Breite nicht
      var k = Math.min(cw / W, availH * 0.97 / Math.max(m.offsetHeight, 1)); if (!best || k > best.k) best = { k: k, W: W, stack: c[1] };
    }); m.remove();
    if (!best) best = { k: 1, W: Wn, stack: false };
    var k = Math.max(0.01, best.k);
    return '<div class="fitbox" style="height:' + availH + 'px"><div class="fitin' + (best.stack ? ' stack' : '') + '" style="width:' + best.W + 'px;margin-left:' + Math.max(0, Math.round((cw - best.W * k) / 2)) + 'px;transform:scale(' + k.toFixed(4) + ')">' + html + '</div></div>';
  }

  /* Alle Seiten: [{html}] plus {format, count}; opts siehe S.printOptions */
  S.buildPages = function (o) {
    var opts = Object.assign({}, S.printOptions, o || {}); opts.items = Object.assign({}, S.printOptions.items, (o || {}).items || {});
    var fmt = opts.format, f = F[fmt], fields = S.sheetFields(), info = S.logicInfo(), aufgabe = opts.version === 'aufgabe', frame = opts.frame;
    var cl = frame ? M.contentLeft : 48, ct = frame ? M.contentLeft : 48, cw = f.w - 2 * cl, ch = f.h - ct - (frame ? M.contentBottom : 56), headH = 44;
    var region = S.sheetContent(); // nur was im Inhaltsbereich des Rahmens liegt
    // --- Seite 1: Schaltung
    var fig = figureImage(opts, region), para = wrapText(fields.text, 60), paraH = para.length ? para.length * 19 + 14 : 0, availH = ch - headH - paraH - 10;
    var sc = Math.min((cw - 2) * 0.95 / fig.w, availH * 0.95 / fig.h), iw = Math.round(fig.w * sc), ih = Math.round(fig.h * sc); // füllt den Inhaltsbereich bis auf etwa 5 % Rand, auch vergrössernd
    var head1 = info.ok && !aufgabe && info.outs.length ? H(S.factorOut(derive(info, 0).minimal).ast) : '';
    if (info.ok && !aufgabe) head1 = info.names[0] + ' = ' + head1;
    var p1 = '<div class="fig" style="height:' + availH + 'px"><img class="figimg" alt="Schaltung" style="width:' + iw + 'px;height:' + ih + 'px" src="' + fig.url + '"></div>' + (para.length ? '<p class="para">' + para.map(esc).join('<br>') + '</p>' : '');
    var pages = [{ headRight: head1, html: p1, info: 'schaltung' }];
    // --- Folgeseiten
    var blocks = [], it = opts.items, ds = null, Wn = Math.min(cw, 700); // natürliche Breite der Folgeseiten, danach als Ganzes auf die Seite skaliert
    var wantLogic = it.table || it.expr || it.kv;
    if (wantLogic && info.ok) {
      ds = info.outs.map(function (o, i) { return derive(info, i); });
      var tableOn = it.table && !info.tableWhy, kvOn = it.kv && !info.kvWhy, tHtml = tableOn ? truthTable(info, ds, aufgabe) : '', tH = tableOn ? 24 * ((1 << info.n) + 1) + 6 : 0;
      var kvs = kvOn ? ds.map(function (d, i) { return kvSVG(info, d, info.names[i], aufgabe); }) : [], kH = kvs.reduce(function (s, k) { return s + k.h + 14; }, 0);
      blocks.push({ h: 38, html: '<h2 class="hl">Herleitung</h2>' });
      if (tableOn || kvOn) blocks.push({ h: Math.max(tH, kH) + 10, html: '<div class="side">' + (tableOn ? '<div class="sideL">' + tHtml + '</div>' : '') + (kvOn ? '<div class="sideR">' + kvs.map(function (k, i) { return (info.outs.length > 1 ? '<div class="kvn">' + esc(info.names[i]) + '</div>' : '') + k.svg; }).join('') + '</div>' : '') + '</div>' });
      if (it.expr) ds.forEach(function (d, i) { blocks.push({ h: 118 + (aufgabe ? 0 : Math.ceil(lawText(info, d).replace(/<[^>]+>/g, '').length / 80) * 20 + 20), html: exprLines(info, d, info.names[i], aufgabe) + (aufgabe ? '' : '<p class="law">' + lawText(info, d) + '</p>') }); });
    }
    if (it.scope) scopeImages().forEach(function (im) { var s2 = Math.min(1, Wn / im.w, 360 / im.h), w2 = Math.round(im.w * s2), h2 = Math.round(im.h * s2); blocks.push({ h: h2 + 40, html: '<h3 class="hl3">' + esc(im.title) + '</h3><img class="shot" style="width:' + w2 + 'px;height:' + h2 + 'px" src="' + im.url + '" alt="Oszilloskop">' }); });
    if (it.timing) { var tm = timingImage(); if (tm) { var s3 = Math.min(1, Wn / tm.w, 520 / tm.h), w3 = Math.round(tm.w * s3), h3 = Math.round(tm.h * s3); blocks.push({ h: h3 + 40, html: '<h3 class="hl3">Zeitverlauf</h3><img class="shot" style="width:' + w3 + 'px;height:' + h3 + 'px" src="' + tm.url + '" alt="Zeitverlauf">' }); } }
    if (it.bom) { var rows = S.bom(); if (rows.length) blocks.push({ rows: rows, head: 70, rh: 26, build: function (take, first) { return (first ? '<h3 class="hl3">Stückliste</h3>' : '<h3 class="hl3">Stückliste (Fortsetzung)</h3>') + '<table class="tt bom"><thead><tr><th>Bauteil</th><th>Wert</th><th>Anzahl</th><th>Bezeichnungen</th></tr></thead><tbody>' + take.map(function (r) { return '<tr><td class="l">' + esc(r.label) + '</td><td class="l">' + esc(r.value) + '</td><td>' + r.count + '</td><td class="l">' + esc(r.ids.join(', ')) + '</td></tr>'; }).join('') + '</tbody></table>'; } }); }
    if (blocks.length) paginate(blocks, ch - headH - 6).forEach(function (pg) { if (pg.length) pages.push({ headRight: 'zur Schaltung auf Blatt 1', html: pg.map(function (b) { return b.html; }).join(''), info: 'folge' }); });
    var foll = ch - headH - 6;
    pages.forEach(function (p) { if (p.info === 'folge') p.html = fillPage(p.html, Wn, cw, foll); });
    var N = pages.length, title = esc(fields.titel);
    var out = pages.map(function (p, i) {
      var fr = frame ? '<svg class="pgframe" xmlns="http://www.w3.org/2000/svg" width="' + f.w + '" height="' + f.h + '" viewBox="0 0 ' + f.w + ' ' + f.h + '">' + S.frameSVG(fmt, fields, i + 1, N) + '</svg>' : '';
      return '<section class="pg" style="width:' + f.w + 'px;height:' + f.h + 'px">' + fr + '<div class="pgc" style="left:' + cl + 'px;top:' + ct + 'px;width:' + cw + 'px;height:' + ch + 'px"><header class="pgh"><b>' + title + '</b><span>' + (p.headRight || '') + '</span></header>' + p.html + '</div>' + (frame ? '' : '<div class="pgno">Seite ' + (i + 1) + ' / ' + N + '</div>') + '</section>';
    });
    return { pages: out, count: N, format: fmt, css: f.css, info: info, opts: opts, w: f.w, h: f.h };
  };

  /* ---------- Export von Blatt 1 (Rahmen, Schriftfeld, Schaltung) als SVG ---------- */
  S.exportSheetSVG = function (opts) {
    var fmt = S.sheetOn() ? S.sheet().format : S.printOptions.format, f = F[fmt], fields = S.sheetFields(), ns = 'http://www.w3.org/2000/svg';
    var r = S.exportSVG(Object.assign({}, opts, { frame: false, region: S.sheetContent() })), cw = f.w - 2 * M.contentLeft, ch = f.h - M.contentLeft - M.contentBottom, headH = 44, para = wrapText(fields.text, 60), paraH = para.length ? para.length * 19 + 14 : 0, availH = ch - headH - paraH - 10;
    var sc = Math.min((cw - 2) * 0.95 / r.w, availH * 0.95 / r.h), iw = r.w * sc, ih = r.h * sc, xs = M.contentLeft + (cw - iw) / 2, ys = M.contentLeft + headH + (availH - ih) / 2;
    var doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml').documentElement, vb = doc.getAttribute('viewBox'), inner = Array.prototype.map.call(doc.childNodes, function (n) { return new XMLSerializer().serializeToString(n); }).join('');
    var title = S.textSVG({ x: M.contentLeft, y: M.contentLeft, text: fields.titel, size: 19, color: '#000', bold: true });
    var svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="' + ns + '" width="' + f.w + '" height="' + f.h + '" viewBox="0 0 ' + f.w + ' ' + f.h + '"><title>' + esc(S.name) + '</title><rect width="' + f.w + '" height="' + f.h + '" fill="#fff"/>' + S.frameSVG(fmt, fields, 1, 1) + title +
      '<path d="M' + M.contentLeft + ' ' + (M.contentLeft + 32) + 'H' + (f.w - M.contentLeft) + '" stroke="#000" stroke-width="1"/><svg x="' + xs.toFixed(1) + '" y="' + ys.toFixed(1) + '" width="' + iw.toFixed(1) + '" height="' + ih.toFixed(1) + '" viewBox="' + vb + '">' + inner + '</svg>' +
      (para.length ? S.textSVG({ x: M.contentLeft, y: M.contentLeft + headH + availH + 6, text: para.join('\n'), size: 13, color: '#000' }) : '') + '</svg>\n';
    return { svg: svg, w: f.w, h: f.h };
  };

  /* ---------- Druckdialog (Anhang A.1) ---------- */
  var printStyle = function (f) { return '@page { size: ' + f.css + '; margin: 0; }'; };
  S.printPages = function (opts, done) {
    var b = S.buildPages(opts), area = $('#printArea') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'printArea' })), st = $('#printPageStyle') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'printPageStyle' }));
    area.innerHTML = b.pages.join(''); st.textContent = printStyle(F[b.format]);
    var imgs = Array.prototype.slice.call(area.querySelectorAll('img')), wait = Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () { }) : Promise.resolve(); }));
    wait.then(function () { if (done) done(b); else root.print(); });
    return b;
  };
  S._derive = derive;
  S.printPrepare = function () { var o = S.buildPages({ items: { table: false, expr: false, kv: false } }), area = $('#printArea') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'printArea' })); area.innerHTML = o.pages.join(''); return area; };
  S.print = function () { S.printDialog(); };
  S.printDialog = function () {
    var po = S.printOptions, info = S.logicInfo(), sc = S.scopes.filter(function (s) { return s.ch.length; }).length, tm = S.timing.rows.length, parts = S.core.layout.parts.length;
    if (S.sheetOn()) po.format = S.sheet().format;
    var fname = esc(S.name || 'Schaltung');
    var disabled = { table: info.ok ? (info.tableWhy || '') : info.why, expr: info.ok ? '' : info.why, kv: info.ok ? (info.kvWhy || '') : info.why, scope: sc ? '' : 'Kein Oszilloskop mit Signal geöffnet.', timing: tm ? '' : 'Der Zeitverlauf ist leer.', bom: parts ? '' : 'Die Schaltung ist leer.' };
    var LAB = { table: 'Wahrheitstabelle', expr: 'Boolescher Ausdruck und Minimalform', kv: 'KV-Diagramm mit Gruppen', scope: 'Oszilloskop-Kurven', timing: 'Zeitverlauf', bom: 'Stückliste' };
    var seg = function (name, list, cur) { return '<div class="segbtns" data-seg="' + name + '">' + list.map(function (x) { return '<button type="button" class="seg' + (cur === x[0] ? ' on' : '') + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; };
    var h = '<div class="pdlg"><div class="pdh"><h2>Drucken</h2><span class="pdfile">' + fname + '</span></div>' +
      '<div class="pds"><h3>Blatt</h3>' + seg('format', [['a4p', 'A4 hoch'], ['a4l', 'A4 quer'], ['a3l', 'A3 quer']], po.format) + '<label class="chk"><input type="checkbox" id="pdFrame"' + (po.frame ? ' checked' : '') + '> Zeichnungsrahmen und Schriftfeld drucken</label><label class="chk"><input type="checkbox" id="pdGrid"' + (po.grid ? ' checked' : '') + '> Gitternetz mitdrucken</label></div>' +
      '<div class="pds"><h3>Seiten</h3><div class="pdrow on"><span class="pdn">1</span><div><b>Schaltung</b><small>Immer dabei</small></div></div>' +
      '<div class="pdrow"><span class="pdn">2</span><div><b>Herleitung – auswählen, was dazu kommt</b><div class="pdchk">' + ['table', 'expr', 'kv', 'scope', 'timing', 'bom'].map(function (k) { return '<label class="chk' + (disabled[k] ? ' off' : '') + '"><input type="checkbox" data-it="' + k + '"' + (po.items[k] ? ' checked' : '') + (disabled[k] ? ' disabled' : '') + '> ' + LAB[k] + (disabled[k] ? '<small>' + esc(disabled[k]) + '</small>' : '') + '</label>'; }).join('') + '</div></div></div>' +
      '<p class="pdinfo">ⓘ Passt nicht alles auf eine Seite, wird umbrochen. Die Reihenfolge ist die der Liste.</p></div>' +
      '<div class="pds"><h3>Fassung</h3>' + seg('version', [['loesung', 'Lösung'], ['aufgabe', 'Aufgabe']], po.version) + '<p class="hint">Bei «Aufgabe» bleiben Tabelle, Ausdruck und KV-Diagramm leer zum Ausfüllen von Hand.</p></div>' +
      '<div class="pdprev" id="pdPrev" hidden></div><div class="pdfoot"><span id="pdCount"></span><span class="pdbtns"><button class="tb" id="mClose">Abbrechen</button><button class="tb" id="pdPreview">Vorschau</button><button class="tb run" id="pdGo">PDF erzeugen</button></span></div></div>';
    S.openModal(h); $('#modal').classList.add('wide');
    function count() { if (!$('#pdCount')) return null; try { var b = S.buildPages(); $('#pdCount').textContent = b.count + (b.count === 1 ? ' Seite' : ' Seiten'); return b; } catch (e) { $('#pdCount').textContent = 'Fehler: ' + e.message; return null; } }
    function preview() {
      var b = count(), box = $('#pdPrev'); if (!b || !box) return; var k = 500 / b.w;
      box.innerHTML = b.pages.map(function (p, i) { return '<div class="pvwrap" style="width:' + Math.round(b.w * k) + 'px;height:' + Math.round(b.h * k) + 'px"><div class="pvpg" style="transform:scale(' + k + ')">' + p + '</div></div>'; }).join(''); box.hidden = false;
    }
    count();
    $('#modal').onclick = function (ev) {
      if (!$('.pdlg')) return;
      var sb = ev.target.closest('.seg'); if (sb) { var g = sb.closest('[data-seg]').dataset.seg; po[g] = sb.dataset.v; Array.prototype.forEach.call(sb.parentNode.children, function (x) { x.classList.toggle('on', x === sb); }); if (g === 'format' && S.sheetOn()) S.sheetSet({ format: po.format, center: false }); count(); if (!$('#pdPrev').hidden) preview(); return; }
      if (ev.target.id === 'pdPreview') { preview(); return; }
      if (ev.target.id === 'pdGo') { S.closeModal(); S.printPages(null); }
    };
    $('#modal').onchange = function (ev) {
      if (!$('.pdlg')) return; var t = ev.target; if (t.id === 'pdFrame') po.frame = t.checked; else if (t.id === 'pdGrid') po.grid = t.checked; else if (t.dataset.it) po.items[t.dataset.it] = t.checked; count(); if (!$('#pdPrev').hidden) preview();
    };
  };
  S.initFns.push(function () {
    document.addEventListener('keydown', function (ev) { if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.key.toLowerCase() === 'p') { ev.preventDefault(); ev.stopImmediatePropagation(); S.printDialog(); } }, true);
  });
})(window);

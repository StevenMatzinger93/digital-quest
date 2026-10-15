/* Digital Quest Studio – Zeichnungsrahmen und Schriftfeld (Auftrag «Bauen», Paket 5)
 * Der Rahmen ist ein Blatt in wirklicher Grösse (96 dpi: A4 hoch 794 × 1123, A4 quer 1123 × 794, A3 quer 1587 × 1123) auf der Zeichenfläche:
 *   Blattrand → 38 → Rahmenlinie (2) → 20 → Inhalt; unten im Rahmen das Schriftfeld (Höhe 112); der Inhalt endet 170 über dem Blattrand.
 * Was ausserhalb des Inhaltsbereichs liegt, kommt nicht in den Druck: Der Bereich ausserhalb ist getönt, Bauteile dort sind markiert.
 * Zur Schaltung gehörig (wird mitgespeichert): layout.sheet = {on, format, x, y, fields:{titel, thema, name, datum, klasse, aenderung, text}}.
 * Das Schriftfeld nutzt dieselbe Textdarstellung wie die Zeichenelemente (S.textSVG). */
(function (root) {
  'use strict';
  var S = root.Studio, Editor = root.DQEditor, E = S.E;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var FORMATS = { a4p: { label: 'A4 hoch', w: 794, h: 1123, css: 'A4 portrait' }, a4l: { label: 'A4 quer', w: 1123, h: 794, css: 'A4 landscape' }, a3l: { label: 'A3 quer', w: 1587, h: 1123, css: 'A3 landscape' } };
  var M = { edge: 38, frameLine: 2, gap: 20, title: 112, contentBottom: 170, contentLeft: 58 };
  S.SHEET = { FORMATS: FORMATS, M: M };
  var snap = function (v) { return Math.round(v / 20) * 20; };

  /* ---------- Daten ---------- */
  S.sheet = function () { return S.core.layout.sheet || null; };
  S.sheetOn = function () { var s = S.sheet(); return !!(s && s.on); };
  S.sheetFields = function () { var s = S.sheet() || {}, f = s.fields || {}; return { titel: f.titel || S.name || '', thema: f.thema || '', name: f.name || '', datum: f.datum || '', klasse: f.klasse || '', aenderung: f.aenderung || '', text: f.text || '' }; };
  /* Schaltungsrahmen (Ausdehnung aller Bauteile und Zeichenelemente), für die Mitte des Blattes */
  function contentBox() {
    var L = S.core.layout, xs = [], ys = [];
    L.parts.forEach(function (p) { xs.push(p.x - 50, p.x + 50); ys.push(p.y - 45, p.y + 45); });
    (L.draw || []).forEach(function (e) { if (e.kind === 'line') { xs.push(e.x1, e.x2); ys.push(e.y1, e.y2); } else { xs.push(e.x, e.x + (e.w || 100)); ys.push(e.y, e.y + (e.h || 30)); } });
    if (!xs.length) return null; return { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
  }
  S.sheetSet = function (patch, quiet) {
    var L = S.core.layout, s = L.sheet || (L.sheet = { on: false, format: 'a4p', x: 0, y: 0, fields: {} }), fresh = !L.sheet.placed;
    Object.keys(patch).forEach(function (k) { if (k === 'center') return; if (k === 'fields') s.fields = Object.assign({}, s.fields || {}, patch.fields); else s[k] = patch[k]; });
    if (s.on && (fresh || patch.center)) S.sheetCenter(true);
    if (!quiet) S.core.changed('draw');
    S.sheetSync(); return s;
  };
  /* Der Rahmen steht auf der Zeichenfläche im Massstab sheet.scale (1 = wirkliche Grösse, 1,25 = ein Blatt deckt 25 % mehr Zeichenfläche ab, gedruckt wird entsprechend kleiner).
   * «Um die Schaltung legen» wählt den kleinsten Massstab, bei dem die Schaltung hineinpasst (soweit das Blatt auf die Zeichenfläche passt) und legt das Blatt in die Mitte. */
  var SCALES = [1, 1.25, 1.5, 1.75, 2];
  S.sheetScale = function () { var s = S.sheet(); return s && s.scale > 0 ? s.scale : 1; };
  S.sheetCenter = function (quiet) {
    var s = S.sheet(); if (!s) return; var f = FORMATS[s.format], cb = contentBox(), sp = root.DQCircuit.SPACES.schema;
    var inW = f.w - 2 * M.contentLeft, inH = f.h - M.contentLeft - M.contentBottom, bw = cb ? cb.x1 - cb.x0 : 0, bh = cb ? cb.y1 - cb.y0 : 0, pick = 1, fitsCanvas = function (c) { return f.w * c <= sp.w && f.h * c <= sp.h; };
    for (var i = 0; i < SCALES.length; i++) { if (!fitsCanvas(SCALES[i])) break; pick = SCALES[i]; if (bw <= inW * SCALES[i] && bh <= inH * SCALES[i]) break; }
    s.scale = pick;
    var cx = cb ? (cb.x0 + cb.x1) / 2 : sp.w / 2, cy = cb ? (cb.y0 + cb.y1) / 2 : sp.h / 2;
    s.x = snap(Math.max(0, Math.min(sp.w - f.w * pick, cx - (M.contentLeft + inW / 2) * pick))); s.y = snap(Math.max(0, Math.min(sp.h - f.h * pick, cy - (M.contentLeft + inH / 2) * pick))); s.placed = true;
    if (!quiet) { S.core.changed('draw'); }
  };
  function clampSheet() { var s = S.sheet(), f = FORMATS[s.format], k = S.sheetScale(), sp = root.DQCircuit.SPACES.schema; s.x = Math.max(0, Math.min(sp.w - f.w * k, s.x)); s.y = Math.max(0, Math.min(sp.h - f.h * k, s.y)); }
  /* Inhaltsbereich des Blattes in Zeichenflächen-Koordinaten */
  S.sheetContent = function () { var s = S.sheet(); if (!s || !s.on) return null; var f = FORMATS[s.format], k = S.sheetScale(); return { x: s.x + M.contentLeft * k, y: s.y + M.contentLeft * k, w: (f.w - 2 * M.contentLeft) * k, h: (f.h - M.contentLeft - M.contentBottom) * k }; };
  /* liegt der Mittelpunkt (px, py) im Inhaltsbereich? Ohne Rahmen: alles drin */
  S.sheetInside = function (px, py) { var c = S.sheetContent(); return !c || (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h); };

  /* ---------- Rahmen und Schriftfeld als SVG (Ursprung = linke obere Ecke des Blattes); Blatt n von N ---------- */
  S.frameSVG = function (fmt, fields, page, pages, opts) {
    opts = opts || {}; var f = FORMATS[fmt], x0 = M.edge, y0 = M.edge, w = f.w - 2 * M.edge, h = f.h - 2 * M.edge, ty = f.h - M.edge - M.title, tw = w;
    var colR = 170, colL = Math.round((tw - colR) / 2), c1 = x0 + colL, c2 = x0 + tw - colR, col = opts.color || '#000', gray = opts.gray || '#666';
    var T = function (x, y, txt, o) { return S.textSVG({ x: x, y: y, text: txt, size: o.size, color: o.color || col, bold: o.bold }); }; // gleiche Textdarstellung wie die Zeichenelemente
    function label(x, y, t) { return '<text x="' + x + '" y="' + y + '" font-size="9.5" letter-spacing="0.8" fill="' + gray + '" font-family="\'Noto Sans\', \'Segoe UI\', Arial, sans-serif">' + esc(t.toUpperCase()) + '</text>'; }
    function value(x, y, t, o) { return t ? T(x, y - (o && o.size ? o.size : 12), t, o || { size: 12 }) : ''; }
    var s = '<g class="blatt-frame" fill="none" stroke="' + col + '"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" stroke-width="' + M.frameLine + '"/>' +
      '<path d="M' + x0 + ' ' + ty + 'H' + (x0 + tw) + 'M' + c1 + ' ' + ty + 'V' + (ty + M.title) + 'M' + c2 + ' ' + ty + 'V' + (ty + M.title) + '" stroke-width="1.2"/>' +
      '<path d="M' + (c1 + (c2 - c1) / 2) + ' ' + ty + 'V' + (ty + M.title) + 'M' + c1 + ' ' + (ty + M.title / 2) + 'H' + c2 + '" stroke-width="0.8" stroke="' + gray + '"/></g>';
    // links: Titel (fett, 13,5) und Thema
    s += label(x0 + 12, ty + 18, 'Titel') + value(x0 + 12, ty + 40, fields.titel, { size: 13.5, bold: true }) + label(x0 + 12, ty + 66, 'Thema') + value(x0 + 12, ty + 88, fields.thema, { size: 12 });
    // Mitte: Name, Datum, Klasse, Änderung als 2 × 2
    var mx = c1 + 12, mx2 = c1 + (c2 - c1) / 2 + 12;
    s += label(mx, ty + 18, 'Name') + value(mx, ty + 40, fields.name) + label(mx2, ty + 18, 'Datum') + value(mx2, ty + 40, fields.datum) +
      label(mx, ty + 18 + M.title / 2, 'Klasse') + value(mx, ty + 40 + M.title / 2, fields.klasse) + label(mx2, ty + 18 + M.title / 2, 'Änderung') + value(mx2, ty + 40 + M.title / 2, fields.aenderung);
    // rechts: Blatt n / N gross in Monospace, darunter klein das Zeichen und «Digital Quest Studio»
    s += label(c2 + 12, ty + 18, 'Blatt') + '<text x="' + (c2 + 12) + '" y="' + (ty + 58) + '" font-size="28" font-family="\'DejaVu Sans Mono\', Consolas, monospace" fill="' + col + '" font-weight="700">' + esc(page + ' / ' + pages) + '</text>' +
      '<path d="M' + (c2 + 12) + ' ' + (ty + 90) + 'h6l2-6 4 12 2-6h8" fill="none" stroke="' + col + '" stroke-width="1.6"/><text x="' + (c2 + 44) + '" y="' + (ty + 94) + '" font-size="9.5" fill="' + gray + '" font-family="\'Noto Sans\', Arial, sans-serif">Digital Quest Studio</text>';
    return s;
  };

  /* ---------- Darstellung auf der Zeichenfläche ---------- */
  Editor.sheetLayer = function (layout) {
    var sh = layout.sheet; if (!sh || !sh.on) return '';
    var f = FORMATS[sh.format] || FORMATS.a4p, sp = root.DQCircuit.SPACES.schema, k = sh.scale > 0 ? sh.scale : 1, cx = sh.x + M.contentLeft * k, cy = sh.y + M.contentLeft * k, cw = (f.w - 2 * M.contentLeft) * k, ch = (f.h - M.contentLeft - M.contentBottom) * k;
    var fields = S.sheetFields();
    var h = '<g class="sheetlayer"><path class="sheetout" fill-rule="evenodd" d="M0 0H' + sp.w + 'V' + sp.h + 'H0ZM' + cx + ' ' + cy + 'h' + cw + 'v' + ch + 'h-' + cw + 'Z" pointer-events="none"/>' +
      '<rect class="sheetedge" x="' + sh.x + '" y="' + sh.y + '" width="' + f.w * k + '" height="' + f.h * k + '" fill="none" pointer-events="none"/>' +
      '<g transform="translate(' + sh.x + ' ' + sh.y + ') scale(' + k + ')" class="sheetframe" pointer-events="none">' + S.frameSVG(sh.format, fields, 1, '·', { color: '#35505c', gray: '#7d8d94' }) + '</g>' +
      '<rect class="sheethit" data-sheet="1" x="' + (sh.x + (M.edge - 7) * k) + '" y="' + (sh.y + (M.edge - 7) * k) + '" width="' + ((f.w - 2 * M.edge + 14) * k) + '" height="' + ((f.h - 2 * M.edge + 14) * k) + '" fill="none" stroke="transparent" stroke-width="14"/>' +
      '<text class="sheetlbl" x="' + (sh.x + M.edge * k) + '" y="' + (sh.y + M.edge * k - 8) + '">' + esc(f.label) + (k !== 1 ? ' (Massstab 1 : ' + k + ')' : '') + ' – Druckbereich, am Rand ziehen zum Verschieben</text></g>';
    return h;
  };
  /* Markierung für Bauteile und Zeichenelemente ausserhalb des Inhaltsbereichs */
  Editor.sheetMarks = function (layout) {
    var sh = layout.sheet; if (!sh || !sh.on) return ''; var h = '';
    layout.parts.forEach(function (p) { if (!S.sheetInside(p.x, p.y)) h += '<g transform="translate(' + p.x + ' ' + p.y + ')" pointer-events="none"><rect class="outmark" x="-50" y="-40" width="100" height="80" rx="6"/><text class="outtxt" y="-46">ausserhalb</text></g>'; });
    (layout.draw || []).forEach(function (e) { var b = e.kind === 'line' ? { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2 } : e.kind === 'text' ? { x: e.x + 20, y: e.y + 10 } : { x: e.x + e.w / 2, y: e.y + e.h / 2 }; if (!S.sheetInside(b.x, b.y)) h += '<text class="outtxt" x="' + b.x + '" y="' + (b.y - 14) + '" pointer-events="none">ausserhalb</text>'; });
    return h ? '<g class="sheetmarks">' + h + '</g>' : '';
  };
  Editor.sheetPress = function (ed, xy) { var s = ed.core.layout.sheet; if (!s) return false; ed.sdrag = { sx: xy[0], sy: xy[1], x: s.x, y: s.y, moved: false }; ed.core.sel = null; ed.core.wireStart = null; ed.core.redraw(); return true; };
  Editor.sheetMove = function (ed, xy) {
    var d = ed.sdrag, s = ed.core.layout.sheet; if (!d || !s) return false; var dx = xy[0] - d.sx, dy = xy[1] - d.sy; if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return true; d.moved = true;
    var f = FORMATS[s.format], k = s.scale > 0 ? s.scale : 1, sp = root.DQCircuit.SPACES.schema; s.x = Math.max(0, Math.min(sp.w - f.w * k, snap(d.x + dx))); s.y = Math.max(0, Math.min(sp.h - f.h * k, snap(d.y + dy))); ed.render(); return true;
  };
  Editor.sheetRelease = function (ed) { var d = ed.sdrag; ed.sdrag = null; if (d && d.moved) ed.core.changed('draw'); return !!d; };

  /* ---------- Schriftfeld bearbeiten ---------- */
  S.sheetDialog = function () {
    var f = S.sheetFields(), s = S.sheet(), fmt = s ? s.format : 'a4p', fld = function (id, l, v, ph) { return '<div class="field wide"><label for="' + id + '">' + l + '</label><input id="' + id + '" class="tin" style="width:100%" type="text" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>'; };
    S.openModal('<h2>Zeichnungsrahmen und Schriftfeld</h2><div class="field"><label for="shF">Blatt</label><select id="shF"><option value="off"' + (S.sheetOn() ? '' : ' selected') + '>kein Rahmen</option>' + Object.keys(FORMATS).map(function (k) { return '<option value="' + k + '"' + (S.sheetOn() && fmt === k ? ' selected' : '') + '>' + FORMATS[k].label + '</option>'; }).join('') + '</select></div><div class="field"><label for="shS">Massstab des Rahmens</label><select id="shS"><option value="auto">passend zur Schaltung</option>' + [1, 1.25, 1.5, 1.75, 2].map(function (k) { return '<option value="' + k + '"' + (s && s.scale === k ? ' selected' : '') + '>1 : ' + String(k).replace('.', ',') + (k === 1 ? ' (wirkliche Grösse)' : '') + '</option>'; }).join('') + '</select></div>' +
      fld('shT', 'Titel der Schaltung', f.titel) + fld('shTh', 'Thema', f.thema) + '<div class="field wide"><div class="two">' + '<div><label for="shN">Name</label><input id="shN" class="tin" style="width:100%" value="' + esc(f.name) + '"></div>' +
      '<div><label for="shD">Datum <button class="tl-btn" id="shDnow" type="button">heute</button></label><input id="shD" class="tin" style="width:100%" value="' + esc(f.datum) + '"></div>' + '<div><label for="shK">Klasse</label><input id="shK" class="tin" style="width:100%" value="' + esc(f.klasse) + '"></div>' +
      '<div><label for="shA">Änderungsstand</label><input id="shA" class="tin" style="width:100%" value="' + esc(f.aenderung) + '"></div></div></div>' +
      '<div class="field wide"><label for="shB">Beschreibung unter der Schaltung (Blatt 1, ein bis zwei Sätze)</label><textarea id="shB" rows="3">' + esc(f.text) + '</textarea></div>' +
      '<p class="hint">Felder dürfen leer bleiben. Der Rahmen zeigt den Druckbereich in wirklicher Grösse; was ausserhalb liegt, kommt nicht in den Druck.</p><p><button class="tb run" id="shOk">Übernehmen</button> <button class="tb" id="mClose">Abbrechen</button></p>');
    $('#shDnow').onclick = function () { var d = new Date(); $('#shD').value = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
    $('#shOk').onclick = function () {
      var v = $('#shF').value, fields = { titel: $('#shT').value, thema: $('#shTh').value, name: $('#shN').value, datum: $('#shD').value, klasse: $('#shK').value, aenderung: $('#shA').value, text: $('#shB').value };
      if (fields.titel === (S.name || '')) fields.titel = ''; // Standard: Name der Schaltung
      var sc = $('#shS').value;
      if (v === 'off') S.sheetSet({ on: false, fields: fields });
      else if (sc === 'auto') S.sheetSet({ on: true, format: v, fields: fields, center: true });
      else { S.sheetSet({ on: true, format: v, fields: fields, scale: +sc, center: false }); clampSheet(); S.core.changed('draw'); }
      S.closeModal(); S.redraw();
    };
  };

  /* ---------- Einbau: Menü Ansicht, Zeigerbehandlung, Datei ---------- */
  S.sheetSync = function () { if (S.gridApply) S.gridApply(); };
  S.initFns.push(function () {
    var prev = S.extraViewItems; S.extraViewItems = function () {
      var on = S.sheetOn(), fmt = on ? S.sheet().format : null, mark = function (b, t) { return (b ? '✓ ' : ' ') + t; };
      return (prev ? prev() : []).concat([{ head: 'Zeichnungsrahmen' }, { label: mark(!on, 'kein Rahmen'), act: function () { S.sheetSet({ on: false }); } }].concat(Object.keys(FORMATS).map(function (k) { return { label: mark(on && fmt === k, FORMATS[k].label), act: function () { S.sheetSet({ on: true, format: k, center: !on || fmt !== k }); } }; }),
        [{ label: 'Rahmen um die Schaltung legen', act: function () { if (!S.sheetOn()) S.sheetSet({ on: true }); else S.sheetCenter(); } }, { label: 'Schriftfeld bearbeiten …', act: function () { S.sheetDialog(); } }]));
    };
    if (S.gridApply) S.gridApply();
  });
})(window);

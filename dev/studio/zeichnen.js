/* Digital Quest Studio – Zeichenelemente: Text, Linie, Pfeil, Rechteck, Ellipse (Auftrag «Bauen», Paket 6)
 * Beschriftungen, Hervorhebungen und Gruppierungen für Unterrichtsunterlagen. Die Elemente liegen in einer eigenen Ebene (layout.draw, Reihenfolge = vorne/hinten),
 * haben keine elektrische Bedeutung und kommen nie in Netzliste, Rechnung oder Stückliste vor. Die Ebene lässt sich gemeinsam aus- und einblenden
 * (layout.drawHidden). Rückgängig, Speichern und Laden laufen über das Layout wie bei allen Bauteilen.
 * Elemente: {id, kind:'text', x, y, text, size, color, bold}
 *           {id, kind:'line', x1, y1, x2, y2, color, width, dash, arrow}
 *           {id, kind:'rect'|'ellipse', x, y, w, h, stroke, strokeWidth, fill, fillOpacity, dash}
 * Gezeichnet wird nur mit Darstellungsattributen (kein CSS), damit Export und Druck dasselbe Bild liefern. */
(function (root) {
  'use strict';
  var S = root.Studio, Editor = root.DQEditor, E = S.E;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var COLORS = [['#0f2d3a', 'Dunkel'], ['#5b6b73', 'Grau'], ['#0b6e94', 'Blau'], ['#4fc3f7', 'Hellblau'], ['#11864f', 'Grün'], ['#f5b700', 'Gelb'], ['#d9480f', 'Orange'], ['#d64541', 'Rot'], ['#7b3fb5', 'Violett'], ['#ffffff', 'Weiss']];
  var LABEL = { text: 'Text', line: 'Linie', arrow: 'Pfeil', rect: 'Rechteck', ellipse: 'Ellipse' };
  S.DRAW_COLORS = COLORS;
  var SNAP = 10;
  var snap = function (v) { return Math.round(v / SNAP) * SNAP; };

  /* ---------- Daten ---------- */
  function list(create) { var L = S.core.layout; if (!L.draw && create) L.draw = []; return L.draw || []; }
  function get(id) { return list().filter(function (e) { return e.id === id; })[0]; }
  function nextId() { var used = {}; list().forEach(function (e) { used[e.id] = 1; }); var n = 1; while (used['z' + n]) n++; return 'z' + n; }
  var DEFAULTS = {
    text: function (x, y) { return { kind: 'text', x: x, y: y, text: 'Text', size: 18, color: '#0f2d3a', bold: false }; },
    line: function (x, y) { return { kind: 'line', x1: x, y1: y, x2: x + 160, y2: y, color: '#0f2d3a', width: 2.5, dash: false, arrow: false }; },
    arrow: function (x, y) { return { kind: 'line', x1: x, y1: y, x2: x + 160, y2: y, color: '#0f2d3a', width: 2.5, dash: false, arrow: true }; },
    rect: function (x, y) { return { kind: 'rect', x: x, y: y, w: 200, h: 120, stroke: '#0b6e94', strokeWidth: 2, fill: '#4fc3f7', fillOpacity: 0.15, dash: false }; },
    ellipse: function (x, y) { return { kind: 'ellipse', x: x, y: y, w: 200, h: 120, stroke: '#0b6e94', strokeWidth: 2, fill: '#4fc3f7', fillOpacity: 0.15, dash: false }; }
  };
  /* kind: text | line | arrow | rect | ellipse; Rückgabe das neue Element (ausgewählt) */
  S.drawAdd = function (kind, x, y) {
    var core = S.core, v = S.ed.view || [0, 0, 1000, 620];
    if (x === undefined) { x = v[0] + v[2] / 2 - 100; y = v[1] + v[3] / 2 - 40; }
    var el = DEFAULTS[kind](snap(x), snap(y)); el.id = nextId(); list(true).push(el);
    core.sel = 'd:' + el.id; core.wireStart = null; S.multi = []; core.changed('draw'); S.refreshInspector(); return el;
  };
  S.drawGet = get; S.drawList = list;
  S.drawUpdate = function (id, patch, quiet) { var e = get(id); if (!e) return null; Object.keys(patch).forEach(function (k) { e[k] = patch[k]; }); if (!quiet) S.core.changed('draw'); else S.ed.render(); return e; };
  /* Reihenfolge: 'front' | 'back' | 'fwd' | 'bwd' */
  S.drawOrder = function (id, where) {
    var a = list(), i = a.findIndex(function (e) { return e.id === id; }); if (i < 0) return false; var e = a.splice(i, 1)[0];
    var j = where === 'front' ? a.length : where === 'back' ? 0 : where === 'fwd' ? Math.min(a.length, i + 1) : Math.max(0, i - 1);
    a.splice(j, 0, e); S.core.changed('draw'); return true;
  };
  S.drawVisible = function () { return !S.core.layout.drawHidden; };
  S.setDrawVisible = function (on) { if (on) delete S.core.layout.drawHidden; else S.core.layout.drawHidden = true; S.core.changed('draw'); syncToggle(); };
  function syncToggle() { var b = $('#btnDraw'); if (b) { var on = S.drawVisible(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.title = 'Zeichenelemente (Text, Linien, Rahmen) ' + (on ? 'ausblenden' : 'einblenden'); b.textContent = '✎ Zeichnung: ' + (on ? 'ein' : 'aus'); } }
  S.drawSync = syncToggle;

  /* ---------- Darstellung ---------- */
  function textLines(e) { return String(e.text == null ? '' : e.text).split('\n'); }
  /* Rahmen des Textes (Näherung für Trefferfläche und Auswahlrahmen); Textdarstellung nutzt auch das Schriftfeld (Paket 5) */
  function textBox(e) { var ls = textLines(e), size = +e.size || 18, w = Math.max.apply(null, ls.map(function (l) { return l.length; })) * size * (e.bold ? 0.62 : 0.58); return { x: e.x, y: e.y, w: Math.max(12, w), h: ls.length * size * 1.25 }; }
  S.textSVG = function (e, extra) {
    var size = +e.size || 18, ls = textLines(e);
    return '<text x="' + e.x + '" y="' + (e.y + size) + '" font-size="' + size + '" font-family="\'Noto Sans\', \'Segoe UI\', Arial, sans-serif" fill="' + esc(e.color || '#0f2d3a') + '"' + (e.bold ? ' font-weight="700"' : '') + (extra || '') + ' xml:space="preserve">' +
      ls.map(function (l, i) { return '<tspan x="' + e.x + '"' + (i ? ' dy="' + (size * 1.25).toFixed(1) + '"' : '') + '>' + esc(l || ' ') + '</tspan>'; }).join('') + '</text>';
  };
  function bboxOf(e) {
    if (e.kind === 'text') return textBox(e);
    if (e.kind === 'line') return { x: Math.min(e.x1, e.x2), y: Math.min(e.y1, e.y2), w: Math.abs(e.x2 - e.x1), h: Math.abs(e.y2 - e.y1) };
    return { x: e.x, y: e.y, w: e.w, h: e.h };
  }
  function arrowHead(e) { // Pfeilspitze am Ende (x2, y2)
    var w = +e.width || 2.5, len = 9 + w * 2.6, ang = Math.atan2(e.y2 - e.y1, e.x2 - e.x1), a1 = ang + 2.75, a2 = ang - 2.75;
    var p = [[e.x2, e.y2], [e.x2 + Math.cos(a1) * len, e.y2 + Math.sin(a1) * len], [e.x2 + Math.cos(a2) * len, e.y2 + Math.sin(a2) * len]];
    return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
  }
  function dashAttr(e) { return e.dash ? ' stroke-dasharray="' + (Math.max(4, (e.width || e.strokeWidth || 2) * 3)).toFixed(1) + ' ' + (Math.max(3, (e.width || e.strokeWidth || 2) * 2.2)).toFixed(1) + '"' : ''; }
  function shapeSVG(e, sel) {
    var c = '';
    switch (e.kind) {
      case 'text': var b = textBox(e); c = '<rect class="drhit" x="' + (b.x - 3) + '" y="' + (b.y - 3) + '" width="' + (b.w + 6) + '" height="' + (b.h + 6) + '" fill="transparent"/>' + S.textSVG(e); break;
      case 'line':
        c = '<line class="drhit" x1="' + e.x1 + '" y1="' + e.y1 + '" x2="' + e.x2 + '" y2="' + e.y2 + '" stroke="transparent" stroke-width="16"/>' +
          '<line x1="' + e.x1 + '" y1="' + e.y1 + '" x2="' + e.x2 + '" y2="' + e.y2 + '" stroke="' + esc(e.color) + '" stroke-width="' + e.width + '" stroke-linecap="round"' + dashAttr(e) + '/>' +
          (e.arrow ? '<polygon points="' + arrowHead(e) + '" fill="' + esc(e.color) + '" stroke="' + esc(e.color) + '" stroke-width="1" stroke-linejoin="round"/>' : ''); break;
      case 'rect':
        c = '<rect class="drhit" x="' + e.x + '" y="' + e.y + '" width="' + e.w + '" height="' + e.h + '" fill="none" stroke="transparent" stroke-width="14"/>' +
          '<rect x="' + e.x + '" y="' + e.y + '" width="' + e.w + '" height="' + e.h + '" rx="3" fill="' + esc(e.fill || 'none') + '" fill-opacity="' + (e.fill ? e.fillOpacity : 0) + '" stroke="' + esc(e.stroke) + '" stroke-width="' + e.strokeWidth + '"' + dashAttr(e) + ' pointer-events="none"/>'; break;
      case 'ellipse':
        c = '<ellipse class="drhit" cx="' + (e.x + e.w / 2) + '" cy="' + (e.y + e.h / 2) + '" rx="' + e.w / 2 + '" ry="' + e.h / 2 + '" fill="none" stroke="transparent" stroke-width="14"/>' +
          '<ellipse cx="' + (e.x + e.w / 2) + '" cy="' + (e.y + e.h / 2) + '" rx="' + e.w / 2 + '" ry="' + e.h / 2 + '" fill="' + esc(e.fill || 'none') + '" fill-opacity="' + (e.fill ? e.fillOpacity : 0) + '" stroke="' + esc(e.stroke) + '" stroke-width="' + e.strokeWidth + '"' + dashAttr(e) + ' pointer-events="none"/>'; break;
    }
    return '<g class="dr dr-' + e.kind + (sel ? ' selected' : '') + '" data-draw="' + esc(e.id) + '">' + c + '</g>';
  }
  function handlesOf(e) { // Griffe: Eckpunkte (Rechteck, Ellipse) oder Endpunkte (Linie)
    if (e.kind === 'line') return [[e.x1, e.y1], [e.x2, e.y2]];
    if (e.kind === 'rect' || e.kind === 'ellipse') return [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [e.x, e.y + e.h]];
    return [];
  }
  /* Die ganze Ebene als SVG-Text (vom Editor in render() eingefügt) */
  Editor.drawLayer = function (layout, sel, interactive) {
    if (layout.drawHidden || !layout.draw || !layout.draw.length) return '';
    var h = '<g class="drawlayer">';
    layout.draw.forEach(function (e) { h += shapeSVG(e, sel === 'd:' + e.id); });
    if (interactive && sel && String(sel).indexOf('d:') === 0) {
      var e = layout.draw.filter(function (x) { return 'd:' + x.id === sel; })[0];
      if (e) {
        var b = bboxOf(e); h += '<rect class="drsel" x="' + (b.x - 4) + '" y="' + (b.y - 4) + '" width="' + (b.w + 8) + '" height="' + (b.h + 8) + '" pointer-events="none"/>';
        handlesOf(e).forEach(function (p, i) { h += '<circle class="drhandle" data-handle="' + e.id + ':' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="6.5"/>'; });
      }
    }
    return h + '</g>';
  };

  /* ---------- Bedienung (Ziehen und Verändern); der Editor ruft diese Funktionen aus seiner Zeigerbehandlung ---------- */
  Editor.drawPress = function (ed, id, xy) {
    var e = get(id); if (!e) return false; var core = ed.core;
    core.sel = 'd:' + id; core.wireStart = null; S.multi = []; core.redraw(); core.opts.onSelect && core.opts.onSelect(null); S.refreshInspector();
    ed.ddrag = { id: id, mode: 'move', sx: xy[0], sy: xy[1], base: JSON.parse(JSON.stringify(e)), moved: false }; return true;
  };
  Editor.drawHandlePress = function (ed, spec, xy) {
    var a = spec.split(':'), e = get(a[0]); if (!e) return false;
    ed.ddrag = { id: a[0], mode: 'handle', idx: +a[1], sx: xy[0], sy: xy[1], base: JSON.parse(JSON.stringify(e)), moved: false }; return true;
  };
  Editor.drawMove = function (ed, xy) {
    var d = ed.ddrag; if (!d) return false; var e = get(d.id); if (!e) return false;
    var dx = xy[0] - d.sx, dy = xy[1] - d.sy; if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return true; d.moved = true;
    var b = d.base;
    if (d.mode === 'move') {
      var mx = snap(dx), my = snap(dy);
      if (e.kind === 'line') { e.x1 = b.x1 + mx; e.y1 = b.y1 + my; e.x2 = b.x2 + mx; e.y2 = b.y2 + my; } else { e.x = b.x + mx; e.y = b.y + my; }
    } else if (e.kind === 'line') {
      var px = snap(xy[0]), py = snap(xy[1]), ox = d.idx === 0 ? b.x2 : b.x1, oy = d.idx === 0 ? b.y2 : b.y1;
      if (Math.abs(px - ox) <= 10) px = ox; else if (Math.abs(py - oy) <= 10) py = oy; // fast waagrecht oder senkrecht: einrasten
      if (d.idx === 0) { e.x1 = px; e.y1 = py; } else { e.x2 = px; e.y2 = py; }
    } else { // Rechteck, Ellipse: gegenüberliegende Ecke bleibt stehen
      var cx = [b.x, b.x + b.w, b.x + b.w, b.x], cy = [b.y, b.y, b.y + b.h, b.y + b.h], opp = (d.idx + 2) % 4, fx = cx[opp], fy = cy[opp], qx = snap(xy[0]), qy = snap(xy[1]);
      if (Math.abs(qx - fx) < 10) qx = fx + (qx >= fx ? 10 : -10); if (Math.abs(qy - fy) < 10) qy = fy + (qy >= fy ? 10 : -10);
      e.x = Math.min(fx, qx); e.y = Math.min(fy, qy); e.w = Math.abs(qx - fx); e.h = Math.abs(qy - fy);
    }
    ed.render(); return true;
  };
  Editor.drawDouble = function (id) { var e = get(id); if (!e) return; S.core.sel = 'd:' + id; S.core.redraw(); S.refreshInspector(); var f = document.querySelector('#inspector textarea, #inspector input[type="text"]'); if (f) { f.focus(); if (f.select) f.select(); } };
  Editor.drawRelease = function (ed) {
    var d = ed.ddrag; ed.ddrag = null; if (!d) return false;
    if (d.moved) ed.core.changed('draw'); return true;
  };

  /* ---------- Eigenschaften (rechtes Feld) ---------- */
  function swatches(name, cur, none) {
    return '<div class="swatches" data-sw="' + name + '">' + (none ? '<button class="sw none' + (!cur ? ' on' : '') + '" data-c="" title="keine Füllung" aria-label="keine Füllung">∅</button>' : '') +
      COLORS.map(function (c) { return '<button class="sw' + (cur && cur.toLowerCase() === c[0] ? ' on' : '') + '" data-c="' + c[0] + '" style="background:' + c[0] + '" title="' + c[1] + '" aria-label="' + c[1] + '"></button>'; }).join('') +
      '<label class="swfree" title="freie Farbe"><input type="color" data-cc="' + name + '" value="' + (cur && /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#808080') + '"></label></div>';
  }
  S.drawInspector = function (id) {
    var e = get(id); if (!e) return null; var name = e.kind === 'line' ? (e.arrow ? 'Pfeil' : 'Linie') : LABEL[e.kind], h = '<h2>' + name + '</h2><p class="sub">Zeichenelement – wird nie simuliert und steht nicht in der Stückliste.</p>';
    function num(k, l, u, v) { return '<div class="field"><label for="dr_' + k + '">' + l + '</label><span><input id="dr_' + k + '" data-dk="' + k + '" type="text" inputmode="decimal" value="' + esc(v) + '"><span class="unit">' + (u || '') + '</span></span></div>'; }
    if (e.kind === 'text') {
      h += '<div class="field wide"><label for="dr_text">Text (mehrzeilig)</label><textarea id="dr_text" data-dk="text" rows="4">' + esc(e.text) + '</textarea></div>' + num('size', 'Grösse', 'px', e.size) +
        '<div class="field"><label for="dr_bold">Fett</label><input id="dr_bold" data-dk="bold" type="checkbox"' + (e.bold ? ' checked' : '') + ' style="width:28px;height:28px"></div><h3>Farbe</h3>' + swatches('color', e.color);
    } else if (e.kind === 'line') {
      h += num('width', 'Stärke', 'px', e.width) + '<div class="field"><label for="dr_dash">Strichart</label><select id="dr_dash" data-dk="dash"><option value="0"' + (e.dash ? '' : ' selected') + '>durchgezogen</option><option value="1"' + (e.dash ? ' selected' : '') + '>gestrichelt</option></select></div>' +
        '<div class="field"><label for="dr_arrow">Pfeilspitze</label><input id="dr_arrow" data-dk="arrow" type="checkbox"' + (e.arrow ? ' checked' : '') + ' style="width:28px;height:28px"></div><h3>Farbe</h3>' + swatches('color', e.color);
    } else {
      h += num('strokeWidth', 'Randstärke', 'px', e.strokeWidth) + '<div class="field"><label for="dr_dash">Strichart</label><select id="dr_dash" data-dk="dash"><option value="0"' + (e.dash ? '' : ' selected') + '>durchgezogen</option><option value="1"' + (e.dash ? ' selected' : '') + '>gestrichelt</option></select></div>' +
        '<h3>Rand</h3>' + swatches('stroke', e.stroke) + '<h3>Füllung</h3>' + swatches('fill', e.fill, true) +
        '<div class="field wide"><label for="dr_fo">Deckkraft der Füllung: <span class="mono" id="dr_fov">' + Math.round((e.fillOpacity == null ? 1 : e.fillOpacity) * 100) + ' %</span></label><input id="dr_fo" data-dk="fillOpacity" type="range" min="0.05" max="1" step="0.05" value="' + (e.fillOpacity == null ? 1 : e.fillOpacity) + '"></div>';
    }
    h += '<h3>Ebene</h3><div class="draworder"><button class="tb" data-ord="front">Ganz nach vorn</button><button class="tb" data-ord="fwd">Eins nach vorn</button><button class="tb" data-ord="bwd">Eins zurück</button><button class="tb" data-ord="back">Ganz nach hinten</button></div>' +
      '<p class="hint">Verschieben: Element ziehen. Grösse: Griffe an den Ecken bzw. Enden ziehen. Entf löscht.</p>';
    return h;
  };
  S.bindDrawInspector = function (el, id) {
    function apply(k, v) { var p = {}; p[k] = v; S.drawUpdate(id, p); }
    Array.prototype.forEach.call(el.querySelectorAll('[data-dk]'), function (i) {
      var k = i.dataset.dk, ev = i.tagName === 'TEXTAREA' || i.type === 'range' || i.type === 'checkbox' || i.tagName === 'SELECT' ? 'input' : 'change';
      i.addEventListener(ev, function () {
        if (k === 'bold' || k === 'arrow') apply(k, i.checked);
        else if (k === 'dash') apply(k, i.value === '1');
        else if (k === 'text') { S.drawUpdate(id, { text: i.value }, true); S.core.changed('draw'); }
        else if (k === 'fillOpacity') { var o = $('#dr_fov', el); if (o) o.textContent = Math.round(+i.value * 100) + ' %'; apply(k, +i.value); }
        else { var v = S.parseSI(i.value); if (!(v > 0)) { i.classList.add('bad'); return; } i.classList.remove('bad'); apply(k, k === 'size' ? Math.min(200, v) : Math.min(40, v)); }
      });
    });
    el.addEventListener('click', function (ev) {
      var sw = ev.target.closest('.sw'), ord = ev.target.closest('[data-ord]');
      if (sw) { var box = sw.closest('[data-sw]'), k = box.dataset.sw, c = sw.dataset.c; apply(k, c || null); Array.prototype.forEach.call(box.querySelectorAll('.sw'), function (b) { b.classList.toggle('on', b === sw); }); return; }
      if (ord) S.drawOrder(id, ord.dataset.ord);
    });
    el.addEventListener('input', function (ev) { var cc = ev.target.closest('[data-cc]'); if (cc) apply(cc.dataset.cc, cc.value); });
  };

  /* ---------- Einbau: Bauteilleiste, Menü, Schalter ---------- */
  S.DRAW_ITEMS = [['draw:text', 'Text'], ['draw:line', 'Linie'], ['draw:arrow', 'Pfeil'], ['draw:rect', 'Rechteck'], ['draw:ellipse', 'Ellipse']];
  S.drawIcon = function (t) {
    var i = '<svg class="symicon" viewBox="-46 -30 92 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">';
    switch (t) {
      case 'draw:text': i += '</g><text x="0" y="12" text-anchor="middle" font-size="34" font-weight="700" fill="currentColor" font-family="sans-serif">Aa</text><g>'; break;
      case 'draw:line': i += '<path d="M-34 14L34 -14"/>'; break;
      case 'draw:arrow': i += '<path d="M-34 14L30 -12"/><path d="M30 -12l-12 1M30 -12l-5 11"/>'; break;
      case 'draw:rect': i += '<rect x="-32" y="-18" width="64" height="36" rx="3" fill="rgba(79,195,247,.25)"/>'; break;
      case 'draw:ellipse': i += '<ellipse cx="0" cy="0" rx="32" ry="19" fill="rgba(79,195,247,.25)"/>'; break;
    }
    return i + '</g></svg>';
  };
  S.initFns.push(function () {
    var b = document.createElement('button'); b.className = 'tb'; b.id = 'btnDraw'; b.addEventListener('click', function () { S.setDrawVisible(!S.drawVisible()); });
    var ref = $('#btnGrid') || $('#btnFit'); if (ref) ref.parentNode.insertBefore(b, ref.nextSibling); syncToggle();
    var prev = S.extraViewItems; S.extraViewItems = function () { return (prev ? prev() : []).concat([{ head: 'Zeichnung' }, { label: (S.drawVisible() ? '✓ ' : ' ') + 'Zeichenelemente anzeigen', act: function () { S.setDrawVisible(!S.drawVisible()); } }]); };
    if (S.gridApply) S.gridApply();
  });
  S.onLoad = (function (prev) { return function (o) { if (prev) prev(o); syncToggle(); }; })(S.onLoad);
  var prevRedo = S.redo, prevUndo = S.undo; // Umschalter nach Rückgängig nachziehen
  S.undo = function () { var r = prevUndo(); syncToggle(); return r; }; S.redo = function () { var r = prevRedo(); syncToggle(); return r; };
})(window);

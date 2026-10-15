/* Digital Quest Studio – Dateien, Export, Drucken, Stückliste (Stufe 8 und Nacht-Paket 5)
 * Dateiformat: JSON, versioniert, lesbar (Endung .dqstudio.json). Version 2 ist die aktuelle; Version 1 (flach: parts/wires oben) und reine Layouts
 * werden beim Öffnen umgewandelt, neuere Versionen mit klarer Meldung abgelehnt. Export als SVG und PNG (Farbe oder Schwarzweiss, mit oder ohne Messwerte),
 * Drucken auf A4 (Schwarzweiss, Titelfeld), Stückliste als Tabelle und CSV. Alles im Browser, ohne Server. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E, Editor = root.DQEditor;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var FORMAT = 'dqstudio', VERSION = 2;
  S.name = 'Schaltung';

  /* ---------- Datei: Aufbau, Prüfung, Umwandlung ---------- */
  S.serialize = function () {
    return { format: FORMAT, version: VERSION, name: S.name, saved: new Date().toISOString(), generator: 'Digital Quest Studio ' + S.version, layout: E.clone(S.core.layout),
      sliders: (S.sliders || []).map(function (s) { return { part: s.part, prop: s.prop, min: s.min, max: s.max, log: s.log, step: s.step }; }) };
  };
  /* Rückgabe {ok, layout, name, sliders, from} oder {ok:false, error} */
  S.parseFile = function (text) {
    var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Die Datei ist keine gültige Studio-Datei (kein JSON).' }; }
    if (!o || typeof o !== 'object') return { ok: false, error: 'Die Datei ist keine Studio-Datei.' };
    var ver = o.format === FORMAT ? o.version : (o.parts ? (o.dqstudio || 0) : undefined);
    if (ver === undefined) return { ok: false, error: 'Die Datei ist keine Studio-Datei.' };
    if (ver > VERSION) return { ok: false, error: 'Die Datei stammt aus einer neueren Version des Studios (Dateiformat ' + ver + ', dieses Studio kennt bis ' + VERSION + ').' };
    var layout = ver >= 2 ? o.layout : { parts: o.parts, wires: o.wires };   // Version 0 und 1: flach
    if (!layout || !Array.isArray(layout.parts) || !Array.isArray(layout.wires || [])) return { ok: false, error: 'Die Schaltung in der Datei ist unvollständig.' };
    layout = { parts: layout.parts, wires: layout.wires || [] };
    var ids = {};
    for (var i = 0; i < layout.parts.length; i++) {
      var p = layout.parts[i]; if (!p || !E.PARTS[p.type]) return { ok: false, error: 'Unbekanntes Bauteil «' + (p && p.type) + '» in der Datei.' };
      if (ids[p.id]) return { ok: false, error: 'Bauteil-Nummer ' + p.id + ' kommt doppelt vor.' }; ids[p.id] = 1;
      p.x = +p.x || 0; p.y = +p.y || 0; p.rot = +p.rot || 0;
    }
    return { ok: true, layout: layout, name: typeof o.name === 'string' && o.name ? o.name : 'Schaltung', sliders: Array.isArray(o.sliders) ? o.sliders : [], from: ver };
  };
  S.openText = function (text, run) {
    var r = S.parseFile(text); if (!r.ok) { S.openModal('<h2>Datei lässt sich nicht öffnen</h2><p>' + esc(r.error) + '</p><p><button class="tb" id="mClose">Schliessen</button></p>'); return r; }
    S.loadLayout(r.layout, { run: run === undefined ? false : run }); S.name = r.name; S.updateTitle();
    r.sliders.forEach(function (s) { var sl = S.addSlider(s.part, s.prop, s); if (sl) { sl.min = s.min; sl.max = s.max; sl.log = !!s.log; sl.step = s.step || 0; } });
    return r;
  };
  S.updateTitle = function () { document.title = S.name + ' – Digital Quest Studio'; var t = $('#verTag'); if (t) t.textContent = S.name; };

  function download(name, blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  function fileBase() { return (S.name || 'Schaltung').replace(/[^A-Za-z0-9ÄÖÜäöü_\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Schaltung'; }
  S.save = function () { var txt = JSON.stringify(S.serialize(), null, 1); download(fileBase() + '.dqstudio.json', new Blob([txt], { type: 'application/json' })); return txt; };
  S.openDialog = function () { var inp = $('#fileIn'); inp.value = ''; inp.click(); };
  S.setName = function () {
    S.openModal('<h2>Name der Schaltung</h2><p><input class="tin" id="nmIn" style="width:100%" maxlength="60" value="' + esc(S.name) + '"></p><p><button class="tb run" id="nmOk">Übernehmen</button></p>');
    var go = function () { var v = $('#nmIn').value.trim(); if (v) S.name = v; S.updateTitle(); S.closeModal(); }; $('#nmOk').onclick = go; $('#nmIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); $('#nmIn').focus();
  };

  /* ---------- Stückliste ---------- */
  function bomValue(p) {
    if (S.isHidden && S.isHidden(p.id, 'value')) return '?'; // verborgener Wert einer Aufgabe
    var q = p.props || {}, d = E.PARTS[p.type], v = S.getProp(p, 'value'), f = Editor.fmtVal;
    switch (p.type) {
      case 'resistor': case 'pot': case 'lamp': case 'motor': return f(v) + ' Ω';
      case 'capacitor': return f(v) + ' F'; case 'inductor': return f(v) + ' H';
      case 'battery': return f(v) + ' V'; case 'acsource': return 'Û ' + f(v) + ' V, ' + f(S.getProp(p, 'freq')) + ' Hz, ' + ({ sine: 'Sinus', square: 'Rechteck', triangle: 'Dreieck' }[S.getProp(p, 'shape')] || '');
      case 'clock': return f(S.getProp(p, 'freq')) + ' Hz'; case 'led': return ({ rot: 'rot', gelb: 'gelb', gruen: 'grün', blau: 'blau', weiss: 'weiss' }[S.getProp(p, 'color')] || '');
      case 'zener': return 'U_Z ' + f(S.getProp(p, 'vz')) + ' V'; case 'diode': return 'U_F ' + f(S.getProp(p, 'vf')) + ' V';
      case 'npn': return 'β ' + S.getProp(p, 'beta');
      case 'ctr_mod': return 'Modulo ' + S.getProp(p, 'modn'); case 'ctr_async': case 'ctr_sync': case 'ctr_johnson': return S.getProp(p, 'bits') + ' Bit' + (S.getProp(p, 'dir') === 'down' ? ', abwärts' : '');
      case 'dff': case 'tff': case 'jkff': case 'rsff': return ({ pos: 'Flanke steigend', neg: 'Flanke fallend', level: 'Taktzustand' }[S.getProp(p, 'trig')] || '');
      case 'and': case 'or': case 'nand': case 'nor': case 'xor': case 'xnor': return S.getProp(p, 'inputs') + ' Eingänge';
    }
    return '';
  }
  S.bom = function (layout) {
    var groups = {}, order = [];
    (layout || S.core.layout).parts.forEach(function (p) {
      if (p.type === 'ground' || p.type === 'node') return; var val = bomValue(p), key = p.type + '|' + val;
      if (!groups[key]) { groups[key] = { type: p.type, label: E.PARTS[p.type].label, value: val, count: 0, ids: [] }; order.push(key); }
      groups[key].count++; groups[key].ids.push(p.id);
    });
    return order.map(function (k) { return groups[k]; }).sort(function (a, b) { return a.label < b.label ? -1 : a.label > b.label ? 1 : a.value < b.value ? -1 : 1; });
  };
  S.bomCSV = function (rows) {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    return '﻿' + ['Bauteil', 'Wert', 'Anzahl', 'Bezeichnungen'].map(q).join(';') + '\r\n' + rows.map(function (r) { return [q(r.label), q(r.value), r.count, q(r.ids.join(', '))].join(';'); }).join('\r\n') + '\r\n';
  };
  S.showBom = function () {
    var rows = S.bom(), total = rows.reduce(function (s, r) { return s + r.count; }, 0);
    S.openModal('<h2>Stückliste: ' + esc(S.name) + '</h2>' + (rows.length ? '<table class="itab" style="font-family:var(--font-ui);font-size:14px"><thead><tr><th>Bauteil</th><th>Wert</th><th>Anzahl</th><th>Bezeichnungen</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td style="text-align:left">' + esc(r.label) + '</td><td style="text-align:left">' + esc(r.value) + '</td><td>' + r.count + '</td><td style="text-align:left">' + esc(r.ids.join(', ')) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td colspan="2" style="text-align:right"><b>Summe</b></td><td><b>' + total + '</b></td><td></td></tr></tfoot></table>' : '<p>Die Schaltung ist leer.</p>') +
      '<p><button class="tb" id="bomCsv">Als CSV speichern</button> <button class="tb" id="mClose">Schliessen</button></p>');
    $('#bomCsv').onclick = function () { download(fileBase() + '_Stueckliste.csv', new Blob([S.bomCSV(rows)], { type: 'text/csv;charset=utf-8' })); };
  };

  /* ---------- Export als SVG / PNG ---------- */
  var CSS_COLOR = '.sym{fill:none;stroke:#0f2d3a;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.sym.fillsym{fill:#0f2d3a}.sym.thin{stroke-width:1.5}.sym.thick{stroke-width:4}.sym.thick2{stroke-width:7}.sym.lever{stroke:#0b6e94;stroke-width:3}' +
    '.symtxt{fill:#0f2d3a;font:700 16px monospace;text-anchor:middle}.symtxt.small{font-size:10px}.plus{fill:#b23a30;font:700 16px monospace}.lbl{fill:#5b6b73;font:600 12px monospace;text-anchor:middle}.val{fill:#0b6e94;font:12px monospace;text-anchor:middle}' +
    '.wire{fill:none;stroke:#0b6e94;stroke-width:2.6;stroke-linejoin:round}.pin{fill:#fff;stroke:#5b6b73;stroke-width:1.5}.pin.used{fill:#0b6e94;stroke:#0b6e94}.pin.junction{fill:#0b6e94}.vlabel{fill:#0b6e94;font:11px monospace;paint-order:stroke;stroke:#fff;stroke-width:3px}' +
    '.burnt{stroke:#e2574c;stroke-width:3.5;fill:none}.lamp-on{fill:#22b573}.lamp-off{fill:#cdd9dc}.seg{fill:none;stroke:#d9e4e7;stroke-width:4;stroke-linecap:round}.seg.on{stroke:#e2574c}.forbid{fill:rgba(226,87,76,.12);stroke:#e2574c;stroke-width:3;stroke-dasharray:6 3}.forbidtxt{fill:#b23a30;font:700 11px monospace;text-anchor:middle}';
  var CSS_BW = '.sym{fill:none;stroke:#000;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.sym.fillsym{fill:#000}.sym.thin{stroke-width:1.5}.sym.thick{stroke-width:4}.sym.thick2{stroke-width:7}.sym.lever{stroke:#000;stroke-width:3}.ledbody{fill:#fff!important;fill-opacity:1!important}' +
    '.symtxt{fill:#000;font:700 16px monospace;text-anchor:middle}.symtxt.small{font-size:10px}.plus{fill:#000;font:700 16px monospace}.lbl{fill:#000;font:600 12px monospace;text-anchor:middle}.val{fill:#000;font:12px monospace;text-anchor:middle}' +
    '.wire{fill:none;stroke:#000!important;stroke-width:2.2;stroke-linejoin:round}.pin{fill:#fff!important;stroke:#000;stroke-width:1.5}.pin.used{fill:#000!important;stroke:#000}.pin.junction{fill:#000!important}.vlabel{fill:#000;font:11px monospace;paint-order:stroke;stroke:#fff;stroke-width:3px}' +
    '.burnt{stroke:#000;stroke-width:3.5;fill:none}.lamp-on{fill:#bbb}.lamp-off{fill:#fff;stroke:#000}.seg{fill:none;stroke:#ddd;stroke-width:4;stroke-linecap:round}.seg.on{stroke:#000}.forbid{fill:none;stroke:#000;stroke-width:3;stroke-dasharray:6 3}.forbidtxt{fill:#000;font:700 11px monospace;text-anchor:middle}circle[fill="url(#glowAmber)"],circle[filter]{display:none}';
  /* opts: {color: true|false, values: true|false (Messwerte = Spannungen an den Anschlüssen)}; gibt {svg, w, h} */
  S.exportSVG = function (opts) {
    opts = opts || {}; var color = opts.color !== false, core = S.core, ed = S.ed;
    var keep = { sel: core.sel, multi: S.multi, volt: ed.showVolt, logic: S.logicColors, ws: core.wireStart };
    core.sel = null; S.multi = []; core.wireStart = null; ed.showVolt = !!opts.values; S.logicColors = color;
    S.redraw(); ed.render();
    var live = ed.svg, ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('xmlns', ns); svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    var g = document.createElementNS(ns, 'g'); Array.prototype.slice.call(live.childNodes).forEach(function (n) { g.appendChild(n.cloneNode(true)); }); svg.appendChild(g);
    core.sel = keep.sel; S.multi = keep.multi; core.wireStart = keep.ws; ed.showVolt = keep.volt; S.logicColors = keep.logic; S.redraw();
    // Gitter, Trefferflächen, Tooltips und Messspitzen entfernen
    var drop = g.querySelectorAll('rect.hit, circle.pinhit, path.wirehit, title, g.probe, pattern');
    Array.prototype.forEach.call(drop, function (n) { n.parentNode && n.parentNode.removeChild(n); });
    Array.prototype.forEach.call(g.querySelectorAll('rect[fill^="url(#grid)"]'), function (n) { n.remove(); });
    if (!opts.values) Array.prototype.forEach.call(g.querySelectorAll('.vlabel'), function (n) { n.remove(); });
    // Ausdehnung messen
    var host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden'; var probe = svg.cloneNode(true); host.appendChild(probe); document.body.appendChild(host);
    var bb = probe.firstChild.getBBox(); host.remove();
    var m = 28, x = Math.floor(bb.x - m), y = Math.floor(bb.y - m), w = Math.ceil(bb.width + 2 * m), h = Math.ceil(bb.height + 2 * m);
    if (!(w > 2 * m)) { x = 0; y = 0; w = 200; h = 120; }
    svg.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h); svg.setAttribute('width', w); svg.setAttribute('height', h);
    var title = document.createElementNS(ns, 'title'); title.textContent = S.name; svg.insertBefore(title, g);
    var style = document.createElementNS(ns, 'style'); style.textContent = color ? CSS_COLOR : CSS_BW; svg.insertBefore(style, g);
    var bg = document.createElementNS(ns, 'rect'); bg.setAttribute('x', x); bg.setAttribute('y', y); bg.setAttribute('width', w); bg.setAttribute('height', h); bg.setAttribute('fill', '#fff'); svg.insertBefore(bg, g);
    return { svg: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg) + '\n', w: w, h: h };
  };
  S.exportPNG = function (opts, cb) {
    var r = S.exportSVG(opts), scale = opts && opts.scale || 2, img = new Image();
    img.onload = function () { var c = document.createElement('canvas'); c.width = Math.round(r.w * scale); c.height = Math.round(r.h * scale); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(function (b) { cb(b, c.width, c.height); }, 'image/png'); };
    img.onerror = function () { cb(null); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg);
  };
  S.exportDialog = function () {
    S.openModal('<h2>Exportieren</h2><div class="field"><label>Format</label><select id="exF"><option value="svg">SVG (für Word, verlustfrei)</option><option value="png">PNG (2-fache Auflösung)</option></select></div>' +
      '<div class="field"><label>Farbe</label><select id="exC"><option value="1">in Farbe</option><option value="0">Schwarzweiss</option></select></div>' +
      '<div class="field"><label>Messwerte</label><select id="exV"><option value="0">ohne Messwerte</option><option value="1">mit Spannungen an den Anschlüssen</option></select></div>' +
      '<p class="hint">Die Bauteilwerte (1k, 100n …) stehen immer im Bild. Der Export zeigt den Stand der Simulation im Moment des Klicks.</p><p><button class="tb run" id="exGo">Exportieren</button> <button class="tb" id="mClose">Abbrechen</button></p>');
    $('#exGo').onclick = function () {
      var o = { color: $('#exC').value === '1', values: $('#exV').value === '1' }, f = $('#exF').value, tag = (o.color ? '' : '_sw') + (o.values ? '_mw' : '');
      if (f === 'svg') download(fileBase() + tag + '.svg', new Blob([S.exportSVG(o).svg], { type: 'image/svg+xml' }));
      else S.exportPNG(o, function (b) { if (b) download(fileBase() + tag + '.png', b); });
      S.closeModal();
    };
  };

  /* ---------- Drucken (A4, Schwarzweiss, Titelfeld) ---------- */
  S.printPrepare = function () {
    var r = S.exportSVG({ color: false, values: false }), area = $('#printArea') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'printArea' }));
    var d = new Date(), date = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    area.innerHTML = '<div class="pr-frame"><div class="pr-fig">' + r.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/ width="\d+" height="\d+"/, ' class="pr-svg"') + '</div>' +
      '<table class="pr-title"><tr><td class="pr-l">Schaltung</td><td class="pr-v">' + esc(S.name) + '</td><td class="pr-l">Datum</td><td class="pr-v">' + date + '</td><td class="pr-l">Name</td><td class="pr-v">&nbsp;</td></tr></table></div>';
    return area;
  };
  S.print = function () { S.printPrepare(); root.print(); };

  /* ---------- Einbau: Menü, Ziehen und Ablegen ---------- */
  S.initFns.push(function () {
    var inp = document.createElement('input'); inp.type = 'file'; inp.id = 'fileIn'; inp.accept = '.json,.dqstudio,application/json'; inp.hidden = true; document.body.appendChild(inp);
    inp.addEventListener('change', function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { S.openText(String(rd.result)); }; rd.readAsText(f); });
    S.setMenu('datei', [{ label: 'Neu', act: function () { S.newCircuit(); S.name = 'Schaltung'; S.updateTitle(); } }, { label: 'Öffnen …', act: function () { S.openDialog(); } }, { label: 'Speichern', key: 'Strg+S', act: function () { S.save(); } }, { label: 'Name …', act: function () { S.setName(); } }, { label: 'Aufgabe stellen …', act: function () { S.taskDialog(); } },
      { sep: 1 }, { label: 'Exportieren (SVG, PNG) …', act: function () { S.exportDialog(); } }, { label: 'Drucken …', key: 'Strg+P', act: function () { S.print(); } }, { label: 'Stückliste …', act: function () { S.showBom(); } }, { sep: 1 }, { label: 'Schaltung einpassen', act: function () { S.ed.fit(); } }]);
    document.addEventListener('keydown', function (ev) {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return; var k = ev.key.toLowerCase();
      if (k === 's') { ev.preventDefault(); S.save(); } else if (k === 'p') { ev.preventDefault(); S.print(); } else if (k === 'o') { ev.preventDefault(); S.openDialog(); }
    });
    var board = S.ed.svg;
    board.addEventListener('drop', function (ev) {
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (!f) return; ev.preventDefault(); ev.stopImmediatePropagation();
      var rd = new FileReader(); rd.onload = function () { S.openText(String(rd.result)); }; rd.readAsText(f);
    }, true);
    S.updateTitle();
  });
  S.FORMAT_VERSION = VERSION;
})(window);

/* Digital Quest Studio – Schieberegler für Bauteilwerte (Nacht-Paket 4)
 * Ein Bauteilwert bekommt einen Regler mit einstellbarem Bereich (linear oder logarithmisch, optional mit Schrittweite). Die Regler stehen gesammelt in einer
 * eigenen Leiste unter der Werkzeugleiste. Ziehen wirkt sofort, die Simulation läuft weiter (Zustand von Kondensatoren und Flipflops bleibt);
 * als Rückgängig-Schritt zählt erst das Loslassen. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E, Editor = root.DQEditor;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var list = S.sliders = [];

  function fieldOf(type, prop) { return (S.FIELDS[type] || []).filter(function (f) { return f.k === prop; })[0]; }
  function numericFields(type) { return (S.FIELDS[type] || []).filter(function (f) { return !f.kind && f.k !== 'tpd' && f.k !== 'modn'; }); }
  function posToValue(sl, pos) {
    var t = pos / 1000, v = sl.log ? sl.min * Math.pow(sl.max / sl.min, t) : sl.min + (sl.max - sl.min) * t;
    if (sl.step > 0) v = sl.min + Math.round((v - sl.min) / sl.step) * sl.step;
    return Math.max(sl.min, Math.min(sl.max, v));
  }
  function valueToPos(sl, v) { var t = sl.log ? Math.log(v / sl.min) / Math.log(sl.max / sl.min) : (v - sl.min) / (sl.max - sl.min); return Math.round(Math.max(0, Math.min(1, t)) * 1000); }
  function find(id, prop) { return list.filter(function (s) { return s.part === id && s.prop === prop; })[0]; }

  /* Regler anlegen/ändern/entfernen */
  S.addSlider = function (id, prop, cfg) {
    var p = S.core.part(id); if (!p) return null; var f = fieldOf(p.type, prop), cur = S.getProp(p, prop); if (!f || !(cur > 0 || prop === 'offset')) cur = cur || 1;
    var ex = find(id, prop); if (ex) return ex;
    var log = !cfg || cfg.log === undefined ? /^(value|freq|vz)$/.test(prop) && p.type !== 'battery' && p.type !== 'acsource' || prop === 'freq' : cfg.log;
    var sl = { part: id, prop: prop, min: cfg && cfg.min || (log ? cur / 10 : 0), max: cfg && cfg.max || (log ? cur * 10 : cur * 2 || 1), log: !!log, step: cfg && cfg.step || 0, label: (f && f.l) || prop, unit: (f && f.u) || '' };
    list.push(sl); render(); return sl;
  };
  S.removeSlider = function (id, prop) { var i = list.indexOf(find(id, prop)); if (i >= 0) list.splice(i, 1); render(); };
  S.setSliderValue = function (id, prop, v, final) {
    var p = S.core.part(id); if (!p) return; S.setProp(p, prop, v);
    S.sim.refresh(false); if (S.onCircuitChange) S.onCircuitChange(); S.redraw();
    if (final && S.onEdit) S.onEdit('edit');
  };
  function prune() { var before = list.length; for (var i = list.length - 1; i >= 0; i--) if (!S.core.part(list[i].part)) list.splice(i, 1); if (list.length !== before) render(); }

  /* ---------- Leiste ---------- */
  function render() {
    var bar = $('#sliderBar'); if (!bar) return; bar.hidden = !list.length;
    bar.innerHTML = list.map(function (sl, i) {
      var p = S.core.part(sl.part); if (!p) return ''; var v = S.getProp(p, sl.prop);
      return '<div class="sl" data-i="' + i + '"><label for="slr' + i + '"><b>' + esc(sl.part) + '</b> ' + esc(sl.label) + '</label><input id="slr' + i + '" type="range" min="0" max="1000" step="1" value="' + valueToPos(sl, v) + '" aria-label="' + esc(sl.part + ' ' + sl.label) + '">' +
        '<output class="mono">' + esc(Editor.fmtVal(v)) + ' ' + esc(sl.unit) + '</output><button data-a="rm" title="Regler entfernen" aria-label="Regler entfernen">×</button></div>';
    }).join('');
  }
  S.initFns.push(function () {
    var bar = $('#sliderBar');
    bar.addEventListener('input', function (ev) {
      var row = ev.target.closest('.sl'); if (!row || ev.target.type !== 'range') return; var sl = list[+row.dataset.i], v = posToValue(sl, +ev.target.value);
      S.setSliderValue(sl.part, sl.prop, v, false); $('output', row).textContent = Editor.fmtVal(v) + ' ' + sl.unit;
    });
    bar.addEventListener('change', function (ev) { var row = ev.target.closest('.sl'); if (!row) return; var sl = list[+row.dataset.i]; if (S.onEdit) S.onEdit('edit'); S.renderInspectorLive && S.renderInspectorLive(); });
    bar.addEventListener('click', function (ev) { var b = ev.target.closest('[data-a="rm"]'); if (b) { var sl = list[+b.closest('.sl').dataset.i]; S.removeSlider(sl.part, sl.prop); S.refreshInspector && S.refreshInspector(); } });
    $('#inspector').addEventListener('change', function (ev) {
      var t = ev.target; if (!t.dataset || !t.dataset.sl) return; var id = S.selected() && S.selected().id; if (!id) return; var prop = t.dataset.slp;
      if (t.dataset.sl === 'on') { if (t.checked) S.addSlider(id, prop); else S.removeSlider(id, prop); S.refreshInspector(); return; }
      var sl = find(id, prop); if (!sl) return;
      if (t.dataset.sl === 'log') sl.log = t.checked; else { var v = S.parseSI(t.value); if (t.dataset.sl === 'min' && v > 0 || t.dataset.sl === 'min' && !sl.log) sl.min = v; if (t.dataset.sl === 'max' && v > 0) sl.max = v; if (t.dataset.sl === 'step' && v >= 0) sl.step = v; }
      if (sl.log && sl.min <= 0) sl.min = 1e-12; if (sl.max <= sl.min) sl.max = sl.min * 10; render(); S.refreshInspector();
    });
  });
  var prevStructure = S.onStructure; S.onStructure = function () { if (prevStructure) prevStructure(); prune(); };
  S.onLoad = (function (prev) { return function (o) { list.length = 0; render(); if (prev) prev(o); }; })(S.onLoad);

  /* ---------- Eigenschaftenfeld: Regler je Wert einschalten ---------- */
  S.inspectorExtra = (function (prev) { return function (p) {
    var h = prev ? prev(p) : '', fs = numericFields(p.type); if (!fs.length) return h;
    h += '<h3>Schieberegler</h3>';
    fs.forEach(function (f) {
      var sl = find(p.id, f.k);
      h += '<div class="field wide slcfg"><label><input type="checkbox" data-sl="on" data-slp="' + f.k + '"' + (sl ? ' checked' : '') + '> Regler für «' + esc(f.l) + '»</label></div>';
      if (sl) h += '<div class="slrow"><label>von <input class="tin" data-sl="min" data-slp="' + f.k + '" value="' + esc(Editor.fmtVal(sl.min)) + '"></label><label>bis <input class="tin" data-sl="max" data-slp="' + f.k + '" value="' + esc(Editor.fmtVal(sl.max)) + '"></label>' +
        '<label><input type="checkbox" data-sl="log" data-slp="' + f.k + '"' + (sl.log ? ' checked' : '') + '> logarithmisch</label><label>Schritt <input class="tin" data-sl="step" data-slp="' + f.k + '" value="' + (sl.step ? esc(Editor.fmtVal(sl.step)) : '0') + '" title="0 = stufenlos"></label></div>';
    });
    return h;
  }; })(S.inspectorExtra);
})(window);

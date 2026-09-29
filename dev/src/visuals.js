/* Digital Quest – Bild/Animation in Theorie-Lektionen (window.DQVisuals), Plan: docs/PLAN_THEORIE_ANIMATIONEN.md
 * defTheory({ …, visual: {type, …} | [{type, …}, …] }) – je type ein Baustein:
 *   circuit      Mini-Schaltung (mini.js: derselbe Renderer und dieselbe Engine wie im Labor)
 *   numberSteps  Zahlen-Schritt-Widget (Phase C)
 *   kmap         KV-Diagramm (Phase C)
 *   bode         Frequenzgang (Phase D)
 *   block        Blockbild als fertiges Inline-SVG
 * Gemeinsam: caption (Bildunterschrift, HTML). Einsetzen in die Lektion: Platzhalter {{visual}} (bzw. {{visual:2}} …),
 * sonst nach dem ersten Absatz. DQVisuals.check(v, E) liefert Fehlertexte fuer den Validator (ohne DOM). */
(function (root) {
  'use strict';
  var TYPES = {};

  /* type: { mount(el, v) → {destroy}?, check(v, E) → [fehler] } */
  function register(type, def) { TYPES[type] = def; }

  function mount(el, v) {
    var t = TYPES[v.type];
    if (!t || !t.mount) { el.innerHTML = '<p class="dim small">Bild „' + v.type + '“ ist noch nicht verfuegbar.</p>'; return null; }
    el.classList.add('visual', 'visual-' + v.type);
    var body = document.createElement('div'); body.className = 'visual-body'; el.appendChild(body);
    if (v.caption) { var cap = document.createElement('p'); cap.className = 'visual-cap'; cap.innerHTML = v.caption; el.appendChild(cap); }
    return t.mount(body, v);
  }
  function check(v, E) {
    if (!v || typeof v !== 'object') return ['visual ist kein Objekt'];
    var t = TYPES[v.type];
    if (!t) return ['unbekannter visual.type „' + v.type + '“ (erlaubt: ' + Object.keys(TYPES).join(', ') + ')'];
    try { return t.check ? t.check(v, E) : []; } catch (e) { return ['Fehler beim Pruefen: ' + e.message]; }
  }
  /* Lektion + Bilder: HTML mit Platzhaltern, danach mountAll(container, list) */
  function lessonHtml(lesson, list) {
    var used = {}, slot = function (i) { used[i] = true; return '<div class="lesson-visual" data-vi="' + i + '"></div>'; };
    var marks = String(lesson).match(/\{\{visual:(\d+)\}\}/g) || [];
    marks.forEach(function (m) { used[+m.slice(9, -2) - 1] = true; }); // nummerierte zuerst reservieren
    var html = String(lesson).replace(/\{\{visual(?::(\d+))?\}\}/g, function (m, k) {
      if (k) return slot(+k - 1);
      var i = 0; while (used[i]) i++; return slot(i); // {{visual}}: kleinstes freies Bild
    });
    list.forEach(function (v, i) { // uebrige Bilder: das erste nach dem ersten Absatz, weitere ans Ende
      if (used[i]) return;
      var at = html.indexOf('</p>'), s = slot(i);
      html = i === 0 && at >= 0 ? html.slice(0, at + 4) + s + html.slice(at + 4) : html + s;
    });
    return html;
  }
  function mountAll(root2, list) {
    return Array.prototype.map.call(root2.querySelectorAll('.lesson-visual'), function (el) { var v = list[+el.dataset.vi]; return v ? mount(el, v) : null; });
  }
  function listOf(visual) { return visual ? [].concat(visual) : []; }

  /* ---------- circuit: Mini-Schaltung ---------- */
  register('circuit', {
    mount: function (el, v) { return root.DQMini.mount(el, v); },
    check: function (v, E) {
      var err = [], L = v.layout;
      if (!L || !Array.isArray(L.parts) || !Array.isArray(L.wires)) return ['circuit: layout {parts, wires} fehlt'];
      try { E.buildNetlist(L); } catch (e) { err.push('circuit: Layout ungueltig: ' + e.message); }
      var ids = {}; L.parts.forEach(function (p) { ids[p.id] = p; });
      ((v.bench && v.bench.parts) || []).forEach(function (b) { if (!ids[b.id]) err.push('circuit: bench-id ' + b.id + ' nicht im Layout'); });
      (v.sliders || []).forEach(function (s) {
        var p = ids[s.part]; if (!p) { err.push('circuit: Regler fuer unbekanntes Bauteil ' + s.part); return; }
        if (s.prop !== 'value' && !(s.prop in (E.PARTS[p.type].props || {}))) err.push('circuit: ' + p.type + ' hat keine Eigenschaft ' + s.prop);
        if (!(s.max > s.min) || (s.log && !(s.min > 0))) err.push('circuit: Regler ' + s.part + ' mit ungueltigem Bereich');
      });
      (v.readouts || []).forEach(function (x) { if (x.sel && !ids[x.sel]) err.push('circuit: Anzeige fuer unbekanntes Bauteil ' + x.sel); if (x.a && !ids[x.a.split('.')[0]]) err.push('circuit: Anzeige an unbekanntem Anschluss ' + x.a); });
      if (v.scope && (!v.scope.a || !ids[v.scope.a.split('.')[0]])) err.push('circuit: Oszilloskop-Anschluss fehlt/unbekannt');
      return err;
    }
  });

  /* ---------- block: fertiges Inline-SVG (Blockbild) ---------- */
  register('block', {
    mount: function (el, v) { el.innerHTML = v.svg; return null; },
    check: function (v) { return /^\s*<svg[\s>]/.test(v.svg || '') ? [] : ['block: svg (Inline-SVG) fehlt']; }
  });

  root.DQVisuals = { register: register, mount: mount, mountAll: mountAll, lessonHtml: lessonHtml, check: check, listOf: listOf, types: function () { return Object.keys(TYPES); } };
})(typeof window !== 'undefined' ? window : globalThis);

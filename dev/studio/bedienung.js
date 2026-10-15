/* Digital Quest Studio – Bedienung (Auftrag «Bedienung», Paket 3, 4, 6)
 * - Oberflächenzustand über Sitzungen (gewählte Registerkarte, eingeklapptes Eigenschaftenfeld und Zeitverlauf)
 * - Bauteil mehrfach setzen: ein Klick auf die Leiste hängt das Bauteil an den Zeiger, jeder Klick auf die Fläche setzt es, R dreht, Esc beendet
 * - Bauteil in eine Leitung einfügen (Zweipole): Fangstelle wird hervorgehoben, die Leitung teilt sich, das Bauteil richtet sich nach ihr aus */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E, Editor = root.DQEditor;
  var $ = function (s) { return document.querySelector(s); };

  /* ---------- Zustand über Sitzungen ---------- */
  var KEY = 'dqstudio_ui_v1', ui = {};
  function load() { try { ui = JSON.parse(root.localStorage.getItem(KEY)) || {}; } catch (e) { ui = {}; } }
  S.uiGet = function (k, d) { return ui[k] === undefined ? d : ui[k]; };
  S.uiSet = function (k, v) { ui[k] = v; try { root.localStorage.setItem(KEY, JSON.stringify(ui)); } catch (e) { /* ohne Speicher weiter */ } };
  load();

  /* ---------- Bauteil in eine Leitung einfügen ---------- */
  function twoPole(type) { var d = E.PARTS[type]; return !!d && type !== 'ground' && type !== 'node' && d.pins && d.pins.length === 2 && !!Editor.GEO[type]; }
  var RADIUS = 16;
  function wireSnap(xy) { return Editor.extra.nodes ? Editor.snapWire(S.core.layout, xy, RADIUS, -1) : null; }
  /* Drehung, bei der die zwei Anschlüsse auf der Leitungsrichtung liegen */
  function rotFor(type, hor) {
    var g = Editor.GEO[type], ks = Object.keys(g), a = g[ks[0]], b = g[ks[1]], axisHor = Math.abs(a[0] - b[0]) >= Math.abs(a[1] - b[1]);
    return axisHor === hor ? 0 : 90;
  }
  /* Teilt Leitung sn.i und hängt das Bauteil (Typ oder vorhandenes Bauteil) mit beiden Anschlüssen hinein */
  function insertInto(sn, type, existing) {
    var core = S.core, L = core.layout, w = L.wires[sn.i]; if (!w) return null;
    var p = existing || { id: core.nextId(type), type: type, x: 0, y: 0, rot: 0, props: {} }, g = Editor.GEO[p.type], ks = Object.keys(g);
    p.x = Math.round(sn.xy[0] / 20) * 20; p.y = Math.round(sn.xy[1] / 20) * 20; p.rot = rotFor(p.type, sn.hor);
    delete p.bench; if (!existing) L.parts.push(p);
    var P = ks.map(function (k) { return Editor.pinPos(p, k); }), at = function (pin) { var q = L.parts.filter(function (x) { return x.id === pin.split('.')[0]; })[0]; return q ? Editor.pinPos(q, pin.split('.')[1]) : [0, 0]; };
    var F = at(w.from), T = at(w.to), d = function (u, v) { return Math.hypot(u[0] - v[0], u[1] - v[1]); };
    var straight = d(P[0], F) + d(P[1], T) <= d(P[1], F) + d(P[0], T), pf = p.id + '.' + ks[straight ? 0 : 1], pt = p.id + '.' + ks[straight ? 1 : 0], to = w.to;
    w.to = pf; L.wires.splice(sn.i + 1, 0, { from: pt, to: to });
    core.sel = p.id; core.wireStart = null; S.multi = []; core.changed('add'); S.ed.insertMark = null;
    return p;
  }
  /* Einfügemarke direkt im SVG setzen (ohne neu zu zeichnen: beim Ziehen aus der Leiste darf das Ziel der Ablage nicht ersetzt werden) */
  S.setInsertMark = function (m) {
    var ed = S.ed, svg = ed.svg, el = svg.querySelector('.insmark'); ed.insertMark = m;
    if (!m) { if (el) el.remove(); return; }
    if (!el) { el = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); el.setAttribute('class', 'insmark'); el.setAttribute('r', '9'); el.setAttribute('pointer-events', 'none'); svg.appendChild(el); }
    el.setAttribute('cx', m[0]); el.setAttribute('cy', m[1]);
  };
  S.insertAt = function (type, xy) { var sn = twoPole(type) ? wireSnap(xy) : null; return sn ? insertInto(sn, type) : null; };

  /* ---------- Bauteil am Zeiger ---------- */
  var armed = null, raf = 0, last = null;
  S.armedType = function () { return armed && armed.type; };
  function refresh() { raf = 0; var ed = S.ed; if (armed && last) { var g = 20, x = Math.round(last[0] / g) * g, y = Math.round(last[1] / g) * g, sn = twoPole(armed.type) ? wireSnap(last) : null; ed.ghost = { type: armed.type, rot: sn ? rotFor(armed.type, sn.hor) : armed.rot, x: sn ? sn.xy[0] : x, y: sn ? sn.xy[1] : y }; ed.insertMark = sn ? sn.xy : null; } else { ed.ghost = null; } ed.render(); }
  function sched() { if (!raf) raf = root.requestAnimationFrame(refresh); }
  S.arm = function (type) {
    if (armed && armed.type === type) { S.disarm(); return; }
    armed = { type: type, rot: 0 }; S.ed.svg.classList.add('armed'); S.rebuildPalette();
    var d = E.PARTS[type]; S.core.opts.onMessage && S.core.opts.onMessage(d.label + ': auf die Zeichenfläche klicken – R dreht, Esc beendet.'); sched();
  };
  S.disarm = function () { if (!armed) return; armed = null; last = null; S.ed.svg.classList.remove('armed'); S.ed.ghost = null; S.ed.insertMark = null; S.rebuildPalette(); S.ed.render(); };
  S.placePart = function (type, xy, rot) {
    var core = S.core, p = S.insertAt(type, xy);
    if (p) return p;
    p = core.addPart(type, xy[0], xy[1], 'schema', rot || 0); return p;
  };
  S.rotateArmed = function () { if (!armed) return false; armed.rot = (armed.rot + 90) % 360; sched(); return true; };

  S.initFns.push(function () {
    var ed = S.ed, svg = ed.svg, core = S.core;
    ed.opts.armed = function () { return armed; };
    ed.opts.onPlace = function (xy) { if (armed) { var p = S.placePart(armed.type, xy, armed.rot); if (p) { last = xy; sched(); } } };
    svg.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'touch') return; last = ed._pt(ev); if (armed) sched(); }, true);
    svg.addEventListener('pointerleave', function () { if (armed) { last = null; sched(); } });
    document.addEventListener('keydown', function (ev) {
      if (!armed || ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test((ev.target || {}).tagName || '')) return;
      if (ev.key === 'r' || ev.key === 'R') { S.rotateArmed(); ev.preventDefault(); ev.stopImmediatePropagation(); }
      else if (ev.key === 'Escape') { S.disarm(); ev.preventDefault(); ev.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('keydown', function (ev) { // U und I: Spannungen und Ströme im Schaltplan
      if (ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test((ev.target || {}).tagName || '')) return;
      if (ev.key === 'u' || ev.key === 'U') S.setValues('volt', !ed.showVolt); else if (ev.key === 'i' || ev.key === 'I') S.setValues('amp', !ed.showAmp);
    });
    // Ziehen aus der Leiste: Fangstelle zeigen und beim Loslassen einfügen
    svg.addEventListener('dragover', function (ev) { var sn = wireSnap(ed._pt(ev)); S.setInsertMark(sn ? sn.xy : null); });
    svg.addEventListener('dragleave', function () { S.setInsertMark(null); });
    // vorhandenes, noch unverdrahtetes Bauteil auf eine Leitung ziehen
    var free = function (id) { var p = core.part(id); return p && twoPole(p.type) && !core.layout.wires.some(function (w) { return w.from.split('.')[0] === id || w.to.split('.')[0] === id; }); };
    ed.opts.onDragMove = function (id) { var m = null; if (free(id)) { var p = core.part(id), sn = wireSnap([p.x, p.y]); m = sn ? sn.xy : null; } if ((m && !ed.insertMark) || (!m && ed.insertMark) || (m && ed.insertMark && (m[0] !== ed.insertMark[0] || m[1] !== ed.insertMark[1]))) { ed.insertMark = m; ed.render(); } };
    ed.opts.onMoved = function (id) { ed.insertMark = null; if (!free(id)) { ed.render(); return; } var p = core.part(id), sn = wireSnap([p.x, p.y]); if (sn) insertInto(sn, p.type, p); else ed.render(); };

    var ll = S.loadLayout; S.loadLayout = function () { S.disarm(); return ll.apply(this, arguments); }; // beim Laden hängt nichts mehr am Zeiger
    // Registerkarte und eingeklappte Teile aus der letzten Sitzung
    var tab = S.uiGet('tab'); if (tab) S.setPaletteTab(tab);
    var fold = $('#inspFold'); if (fold) {
      var apply = function (c, save) { document.body.classList.toggle('inspfolded', c); fold.setAttribute('aria-expanded', String(!c)); fold.textContent = c ? '‹' : '›'; fold.title = c ? 'Eigenschaftenfeld aufklappen' : 'Eigenschaftenfeld einklappen'; if (save) S.uiSet('inspFolded', c); setTimeout(function () { ed.render(); }, 0); };
      fold.addEventListener('click', function () { apply(!document.body.classList.contains('inspfolded'), true); });
      if (S.uiGet('inspFolded', false)) apply(true, false);
      S.foldInspector = function (c) { apply(!!c, true); };
    }
    if (S.toggleTiming) {
      S.onTimingToggle = function (c) { S.uiSet('timingCollapsed', c); };
      if (S.uiGet('timingCollapsed', true) && !S.timingCollapsed()) S.toggleTiming(); // ohne Signale eingeklappt: die Fläche gehört dem Schaltplan
    }
  });
})(window);

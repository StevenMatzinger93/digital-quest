/* Digital Quest – Interaktionskern (window.DQCircuit)
 * Ansichtsneutrale Bedienlogik ueber dem Schaltungszustand: Bauteil hinzufuegen/bewegen/drehen/loeschen,
 * Leitung ziehen, Messspitzen, Auswahl, ID-Vergabe. Kein DOM, kein Rendering – Renderer (editor.js,
 * spaeter bench.js) machen das Hit-Testing selbst und melden abstrakte Ereignisse in Modellkoordinaten
 * (Raster 20, Flaeche 1000 × 620). Nach jeder Aenderung werden alle angehaengten Ansichten neu gezeichnet.
 * App-Rueckmeldungen: opts.onChange(kind), onSelect(part|null), onProbe(pin), onMessage(text). */
(function (root) {
  'use strict';
  var E = root.DQEngine;
  var GRID = 20, W = 1000, H = 620;

  function Circuit(opts) {
    this.opts = opts || {}; this.views = [];
    this.layout = { parts: [], wires: [] }; this.locked = {};
    this.sel = null; this.wireStart = null; this.tool = 'wire';
    this.probes = { a: null, b: null }; this.drag = null;
  }
  Circuit.GRID = GRID; Circuit.W = W; Circuit.H = H;

  /* Ansichten: Objekte mit render() */
  Circuit.prototype.attach = function (view) { if (this.views.indexOf(view) < 0) this.views.push(view); };
  Circuit.prototype.redraw = function () { this.views.forEach(function (v) { v.render(); }); };
  Circuit.prototype.changed = function (kind) { this.redraw(); if (this.opts.onChange) this.opts.onChange(kind || 'edit'); };
  Circuit.prototype._select = function (p) { if (this.opts.onSelect) this.opts.onSelect(p); };

  Circuit.prototype.load = function (layout, lockedIds) {
    this.layout = E.clone(layout); this.locked = {};
    (lockedIds || []).forEach(function (id) { this.locked[id] = true; }, this);
    this.sel = null; this.wireStart = null; this.probes = { a: null, b: null };
  };
  Circuit.prototype.part = function (id) { return this.layout.parts.filter(function (p) { return p.id === id; })[0]; };

  Circuit.prototype.nextId = function (type) {
    var pre = E.PARTS[type].prefix, used = {}, n = 1;
    this.layout.parts.forEach(function (p) { used[p.id] = true; });
    while (used[pre + n]) n++; return pre + n;
  };
  /* Neues Bauteil moeglichst nahe (cx, cy) auf freiem Platz */
  Circuit.prototype.addPart = function (type, cx, cy) {
    var id = this.nextId(type), parts = this.layout.parts, cx0 = Math.round(cx / GRID) * GRID, cy0 = Math.round(cy / GRID) * GRID, x = cx0, y = cy0, ring = 0, k = 0;
    function free(x, y) { return parts.every(function (p) { return Math.abs(p.x - x) > 90 || Math.abs(p.y - y) > 70; }); }
    while (!free(x, y) && ring < 12) { // spiralfoermig freien Platz suchen
      k++; var ang = k * 0.9; ring = Math.floor(k / 7) + 1;
      x = Math.round((cx0 + Math.cos(ang) * 120 * ring) / GRID) * GRID; y = Math.round((cy0 + Math.sin(ang) * 90 * ring) / GRID) * GRID;
      x = Math.max(60, Math.min(W - 60, x)); y = Math.max(60, Math.min(H - 60, y));
    }
    var p = { id: id, type: type, x: x, y: y, rot: 0, props: {} };
    parts.push(p); this.sel = id; this.changed('add');
    return p;
  };
  Circuit.prototype.removeSelected = function () {
    var s = this.sel; if (!s) return false;
    if (s.indexOf('w:') === 0) { this.layout.wires.splice(+s.slice(2), 1); }
    else {
      if (this.locked[s]) { if (this.opts.onMessage) this.opts.onMessage('Dieses Bauteil gehoert zur Aufgabe und bleibt.'); return false; }
      this.layout.parts = this.layout.parts.filter(function (p) { return p.id !== s; });
      this.layout.wires = this.layout.wires.filter(function (w) { return w.from.split('.')[0] !== s && w.to.split('.')[0] !== s; });
      ['a', 'b'].forEach(function (k) { if (this.probes[k] && this.probes[k].split('.')[0] === s) this.probes[k] = null; }, this);
    }
    this.sel = null; this.changed('delete'); return true;
  };
  Circuit.prototype.rotateSelected = function () {
    var p = this.sel && this.part(this.sel); if (!p) return;
    p.rot = ((p.rot || 0) + 90) % 360; this.changed('rotate');
  };

  /* Ereignisse der Ansichten (Hit-Testing macht der Renderer) */
  Circuit.prototype.clickPin = function (pin) { // Werkzeug 'wire': Anschluss → Anschluss verbinden, 'probe': Messspitze setzen
    if (this.tool === 'probe') { if (this.opts.onProbe) this.opts.onProbe(pin); return; }
    if (!this.wireStart) { this.wireStart = pin; this.redraw(); return; }
    if (this.wireStart !== pin) {
      var a = this.wireStart, dup = this.layout.wires.some(function (w) { return (w.from === a && w.to === pin) || (w.from === pin && w.to === a); });
      if (!dup) this.layout.wires.push({ from: a, to: pin });
      this.wireStart = null; this.changed('wire'); return;
    }
    this.wireStart = null; this.redraw();
  };
  Circuit.prototype.clickWire = function (i) { this.sel = 'w:' + i; this.wireStart = null; this.redraw(); this._select(null); };
  Circuit.prototype.clickEmpty = function () { this.sel = null; this.wireStart = null; this.redraw(); this._select(null); };
  /* Bauteil angefasst bei xy (Modellkoordinaten): auswaehlen, Ziehen vorbereiten, Taster druecken */
  Circuit.prototype.pressPart = function (id, xy) {
    var p = this.part(id); if (!p) return null;
    this.sel = p.id; this.wireStart = null;
    this.drag = { id: p.id, ox: xy[0] - p.x, oy: xy[1] - p.y, sx: xy[0], sy: xy[1], moved: false };
    if (p.type === 'button') { p.props = p.props || {}; p.props.closed = true; this.changed('toggle'); }
    this.redraw(); this._select(p);
    return p;
  };
  /* Zeiger bewegt: ab 6 px gilt es als Ziehen, Position auf Raster und Flaeche begrenzt */
  Circuit.prototype.dragTo = function (xy) {
    var d = this.drag; if (!d) return false;
    var p = this.part(d.id); if (!p) return false;
    if (Math.abs(xy[0] - d.sx) + Math.abs(xy[1] - d.sy) > 6) d.moved = true;
    if (!d.moved) return false;
    var nx = Math.round((xy[0] - d.ox) / GRID) * GRID, ny = Math.round((xy[1] - d.oy) / GRID) * GRID;
    nx = Math.max(40, Math.min(W - 40, nx)); ny = Math.max(40, Math.min(H - 40, ny));
    if (nx !== p.x || ny !== p.y) { p.x = nx; p.y = ny; this.redraw(); }
    return true;
  };
  /* Zeiger losgelassen: Taster loesen, Schalter umlegen (nur ohne Ziehen), sonst Verschiebung melden */
  Circuit.prototype.release = function () {
    var d = this.drag; this.drag = null; if (!d) return;
    var p = this.part(d.id); if (!p) return;
    if (p.type === 'button') { p.props.closed = false; this.changed('toggle'); return; }
    if (!d.moved && p.type === 'switch') { p.props = p.props || {}; p.props.closed = !p.props.closed; this.changed('toggle'); return; }
    if (d.moved) this.changed('move');
  };
  Circuit.prototype.cancel = function () { this.wireStart = null; this.sel = null; this.redraw(); };
  Circuit.prototype.key = function (ev) {
    if (ev.key === 'Delete' || ev.key === 'Backspace') { if (this.removeSelected()) ev.preventDefault(); }
    else if (ev.key === 'r' || ev.key === 'R') this.rotateSelected();
    else if (ev.key === 'Escape') this.cancel();
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Circuit;
  root.DQCircuit = Circuit;
})(typeof window !== 'undefined' ? window : globalThis);

/* Digital Quest – Interaktionskern (window.DQCircuit)
 * Ansichtsneutrale Bedienlogik ueber dem Schaltungszustand: Bauteil hinzufuegen/bewegen/drehen/loeschen,
 * Leitung ziehen, Messspitzen, Auswahl, ID-Vergabe. Kein DOM, kein Rendering – Renderer (editor.js,
 * bench.js) machen das Hit-Testing selbst und melden abstrakte Ereignisse in Modellkoordinaten ihres Raums.
 * Nach jeder Aenderung werden alle angehaengten Ansichten neu gezeichnet.
 * Zwei Koordinatenraeume: 'schema' (p.x, p.y, p.rot; Raster 20, 1000 × 620) und 'bench' (p.bench = {x, y, rot};
 * Raster 10, 1200 × 760). Topologie (Leitungen) ist fuer beide gleich. Fehlt p.bench, gilt eine
 * Auto-Anordnung aus der Schema-Lage (Uebergangsloesung); gespeichert wird p.bench erst beim Verschieben/Drehen.
 * App-Rueckmeldungen: opts.onChange(kind), onSelect(part|null), onProbe(pin), onMessage(text). */
(function (root) {
  'use strict';
  var E = root.DQEngine;
  var SPACES = {
    schema: { grid: 20, w: 1000, h: 620, edge: 40, clamp: 60, free: [90, 70], step: [120, 90] },
    bench: { grid: 10, w: 1200, h: 760, edge: 70, clamp: 90, free: [130, 100], step: [150, 110],
      reserved: [[1000, 90, 1180, 420], [930, 500, 1190, 710]] } // Multimeter und Oszilloskop (bench.js) – dort keine neuen Bauteile ablegen
  };

  function Circuit(opts) {
    this.opts = opts || {}; this.views = []; this.space = 'schema';
    this.layout = { parts: [], wires: [] }; this.locked = {}; this.benchHints = {};
    this.sel = null; this.wireStart = null; this.tool = 'wire';
    this.probes = { a: null, b: null }; this.drag = null;
  }
  Circuit.SPACES = SPACES; Circuit.GRID = SPACES.schema.grid; Circuit.W = SPACES.schema.w; Circuit.H = SPACES.schema.h;

  /* Werkbank-Lage ohne eigenes bench-Layout: Schema-Lage gestreckt und aufs Werkbank-Raster gesetzt */
  function autoBench(p) {
    var g = SPACES.bench.grid;
    return { x: Math.round((p.x * 1.1 + 50) / g) * g, y: Math.round((p.y * 1.1 + 40) / g) * g, rot: p.rot || 0 };
  }
  Circuit.autoBench = autoBench;
  /* Lage eines Bauteils im Raum (nur lesen) */
  Circuit.prototype.pos = function (p, space) { return (space || 'schema') === 'bench' ? (p.bench || autoBench(p)) : p; };
  /* Lage zum Veraendern – legt p.bench bei Bedarf an */
  Circuit.prototype._own = function (p, space) {
    if ((space || 'schema') !== 'bench') return p;
    if (!p.bench) p.bench = autoBench(p);
    return p.bench;
  };

  /* Ansichten: Objekte mit render() */
  Circuit.prototype.attach = function (view) { if (this.views.indexOf(view) < 0) this.views.push(view); };
  Circuit.prototype.redraw = function () { this.views.forEach(function (v) { v.render(); }); };
  Circuit.prototype.changed = function (kind) { this.redraw(); if (this.opts.onChange) this.opts.onChange(kind || 'edit'); };
  Circuit.prototype._select = function (p) { if (this.opts.onSelect) this.opts.onSelect(p); };

  /* bench: optionales Werkbank-Layout der Aufgabe {parts:[{id,x,y,rot}]} – gilt fuer vorhandene Bauteile
   * ohne eigene Werkbank-Lage und fuer spaeter hinzugefuegte Bauteile mit derselben ID */
  Circuit.prototype.load = function (layout, lockedIds, bench) {
    this.layout = E.clone(layout); this.locked = {}; this.benchHints = {};
    (lockedIds || []).forEach(function (id) { this.locked[id] = true; }, this);
    ((bench && bench.parts) || []).forEach(function (b) { this.benchHints[b.id] = { x: b.x, y: b.y, rot: b.rot || 0 }; }, this);
    this.layout.parts.forEach(function (p) { var h = this.benchHints[p.id]; if (!p.bench && h) p.bench = E.clone(h); }, this);
    this.sel = null; this.wireStart = null; this.probes = { a: null, b: null };
  };
  Circuit.prototype.part = function (id) { return this.layout.parts.filter(function (p) { return p.id === id; })[0]; };

  Circuit.prototype.nextId = function (type) {
    var pre = E.PARTS[type].prefix, used = {}, n = 1;
    this.layout.parts.forEach(function (p) { used[p.id] = true; });
    while (used[pre + n]) n++; return pre + n;
  };
  /* Freien Rasterplatz nahe (cx, cy) im Raum suchen, spiralfoermig */
  /* Halbe Abmessungen je Bauteiltyp [x, y] fuer die Platzsuche (unrotiert), je Ansicht */
  var HALF = {
    schema: { _: [45, 35], battery: [30, 45], acsource: [30, 45], dec7: [45, 80], seg7: [45, 80], dff: [45, 45], jkff: [45, 45], tff: [45, 45], npn: [40, 45], pot: [45, 45] },
    bench: { _: [65, 32], battery: [75, 56], acsource: [75, 56], dec7: [88, 90], seg7: [75, 88], dff: [75, 55], jkff: [75, 55], tff: [75, 55], npn: [65, 55], motor: [75, 55],
      lamp: [65, 35], pot: [65, 47], clock: [62, 40], logicin: [56, 39], logicled: [46, 35], ground: [30, 35], and: [65, 46], or: [65, 46], nand: [65, 46], nor: [65, 46], xor: [65, 46], xnor: [65, 46], not: [65, 46] }
  };
  function half(type, space, rot) { var t = HALF[space], h = t[type] || t._; return (rot || 0) % 180 ? [h[1], h[0]] : h; }
  Circuit.half = half;
  Circuit.prototype._place = function (cx, cy, space, type) {
    var S = SPACES[space], self = this, g = S.grid, cx0 = Math.round(cx / g) * g, cy0 = Math.round(cy / g) * g, x = cx0, y = cy0, ring = 0, k = 0;
    var me = half(type, space, 0);
    function free(x, y) { // kein Ueberlappen mit reservierten Flaechen oder anderen Bauteilen (echte Abmessungen + Abstand)
      var off = (S.reserved || []).some(function (r) { return x > r[0] - me[0] && x < r[2] + me[0] && y > r[1] - me[1] && y < r[3] + me[1]; });
      return !off && self.layout.parts.every(function (p) { var q = self.pos(p, space), o = half(p.type, space, q.rot); return Math.abs(q.x - x) > me[0] + o[0] + 12 || Math.abs(q.y - y) > me[1] + o[1] + 12; });
    }
    while (!free(x, y) && ring < 12) {
      k++; var ang = k * 0.9; ring = Math.floor(k / 7) + 1;
      x = Math.round((cx0 + Math.cos(ang) * S.step[0] * ring) / g) * g; y = Math.round((cy0 + Math.sin(ang) * S.step[1] * ring) / g) * g;
      x = Math.max(S.clamp, Math.min(S.w - S.clamp, x)); y = Math.max(S.clamp, Math.min(S.h - S.clamp, y));
    }
    return [x, y];
  };
  /* Neues Bauteil moeglichst nahe (cx, cy) im Raum der aufrufenden Ansicht. Auf der Werkbank bekommt es
   * zusaetzlich einen freien Platz im Schema (Mitte der vorhandenen Bauteile). */
  Circuit.prototype.addPart = function (type, cx, cy, space) {
    space = space || 'schema';
    var id = this.nextId(type), p = { id: id, type: type, x: 0, y: 0, rot: 0, props: {} }, xy;
    if (space === 'bench') {
      var ps = this.layout.parts, sx = 500, sy = 310;
      if (ps.length) { sx = ps.reduce(function (s, q) { return s + q.x; }, 0) / ps.length; sy = ps.reduce(function (s, q) { return s + q.y; }, 0) / ps.length; }
      xy = this._place(sx, sy, 'schema', type); p.x = xy[0]; p.y = xy[1];
      xy = this.benchHints[id] ? [this.benchHints[id].x, this.benchHints[id].y] : this._place(cx, cy, 'bench', type);
      p.bench = { x: xy[0], y: xy[1], rot: this.benchHints[id] ? this.benchHints[id].rot : 0 };
    } else {
      xy = this._place(cx, cy, 'schema', type); p.x = xy[0]; p.y = xy[1];
      if (this.benchHints[id]) p.bench = E.clone(this.benchHints[id]);
    }
    this.layout.parts.push(p); this.sel = id; this.changed('add');
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
  /* Drehen im Raum (Standard: aktive Ansicht) – Schema- und Werkbank-Lage sind unabhaengig */
  Circuit.prototype.rotateSelected = function (space) {
    var p = this.sel && this.part(this.sel); if (!p) return;
    var q = this._own(p, space || this.space);
    q.rot = ((q.rot || 0) + 90) % 360; this.changed('rotate');
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
  /* Bauteil angefasst bei xy (Modellkoordinaten des Raums): auswaehlen, Ziehen vorbereiten, Taster druecken */
  Circuit.prototype.pressPart = function (id, xy, space) {
    var p = this.part(id); if (!p) return null;
    space = space || 'schema';
    var q = this.pos(p, space);
    this.sel = p.id; this.wireStart = null;
    this.drag = { id: p.id, space: space, ox: xy[0] - q.x, oy: xy[1] - q.y, sx: xy[0], sy: xy[1], moved: false };
    if (p.type === 'button') { p.props = p.props || {}; p.props.closed = true; this.changed('toggle'); }
    this.redraw(); this._select(p);
    return p;
  };
  /* Zeiger bewegt: ab 6 Einheiten gilt es als Ziehen, Position auf Raster und Flaeche des Raums begrenzt */
  Circuit.prototype.dragTo = function (xy) {
    var d = this.drag; if (!d) return false;
    var p = this.part(d.id); if (!p) return false;
    if (Math.abs(xy[0] - d.sx) + Math.abs(xy[1] - d.sy) > 6) d.moved = true;
    if (!d.moved) return false;
    var S = SPACES[d.space], g = S.grid;
    var nx = Math.round((xy[0] - d.ox) / g) * g, ny = Math.round((xy[1] - d.oy) / g) * g;
    nx = Math.max(S.edge, Math.min(S.w - S.edge, nx)); ny = Math.max(S.edge, Math.min(S.h - S.edge, ny));
    var q = this.pos(p, d.space);
    if (nx !== q.x || ny !== q.y) { q = this._own(p, d.space); q.x = nx; q.y = ny; this.redraw(); }
    return true;
  };
  /* Zeiger losgelassen: Taster loesen, Schalter umlegen (nur ohne Ziehen), sonst Verschiebung melden */
  Circuit.prototype.release = function () {
    var d = this.drag; this.drag = null; if (!d) return;
    var p = this.part(d.id); if (!p) return;
    if (p.type === 'button') { p.props.closed = false; this.changed('toggle'); return; }
    if (!d.moved && (p.type === 'switch' || p.type === 'logicin')) { p.props = p.props || {}; p.props.closed = !p.props.closed; this.changed('toggle'); return; }
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

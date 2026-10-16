/* Digital Quest Studio – Editorgrundlagen (Nacht-Paket 3)
 * Rückgängig/Wiederholen (Zustandsliste der Schaltung, 200 Schritte), automatisches Zwischenspeichern im Browser (immer in try/catch, die
 * Seite läuft auch ohne), Tastaturbedienung: Entf, R, Esc, Strg+A, Strg+C/V, Pfeiltasten, Umschalt+Klick für Mehrfachauswahl.
 * Rückgängig gilt für alles, was die Schaltung ändert: setzen, bewegen, drehen, löschen, Leitung ziehen und löschen, Werte, Aufklappen, Laden. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E, Circuit = root.DQCircuit;
  var $ = function (s) { return document.querySelector(s); };
  var hist = [], at = -1, MAX = 200, restoring = false, lastSaved = '', ready = false;
  S.multi = [];
  var ser = function () { return JSON.stringify(S.core.layout); };

  /* ---------- Rückgängig / Wiederholen ---------- */
  function record() { var s = ser(); if (at >= 0 && hist[at] === s) return; hist.splice(at + 1); hist.push(s); if (hist.length > MAX) hist.shift(); at = hist.length - 1; }
  function restore(str) {
    var core = S.core; restoring = true;
    try { core.layout = JSON.parse(str); core.sel = null; core.wireStart = null; S.multi = []; core.changed('undo'); } finally { restoring = false; }
  }
  S.undo = function () { if (at <= 0) return false; at--; restore(hist[at]); return true; };
  S.redo = function () { if (at >= hist.length - 1) return false; at++; restore(hist[at]); return true; };
  S.history = { size: function () { return hist.length; }, index: function () { return at; }, reset: function () { hist = []; at = -1; record(); } };
  S.onEdit = function (kind) { if (restoring || kind === 'demo') return; if (S.stopDemo) S.stopDemo(); record(); }; // 'demo' = Vorführung eines Beispiels: kein Rückgängig-Schritt

  /* ---------- Auswahl, Kopieren, Einfügen ---------- */
  function selIds() { return S.multi.length ? S.multi.slice() : (S.core.sel && S.core.part(S.core.sel) ? [S.core.sel] : []); }
  S.selectAll = function () { S.multi = S.core.layout.parts.map(function (p) { return p.id; }); S.core.sel = null; S.ed.render(); S.redraw(); };
  S.selectedIds = selIds;
  /* Auswahl setzen (Auswahlrahmen): kein Bauteil = nichts gewählt, eines = normal gewählt (Eigenschaften), mehrere = Mehrfachauswahl */
  S.setSelection = function (ids, add) {
    var core = S.core, cur = add ? selIds() : []; ids = cur.concat(ids.filter(function (i) { return cur.indexOf(i) < 0; }));
    if (!ids.length) { core.clickEmpty(); return; }
    S.keepMulti = true;
    try { if (ids.length === 1) { S.multi = []; core.sel = ids[0]; core.redraw(); core._select(core.part(ids[0])); } else { S.multi = ids; core.sel = null; core.wireStart = null; core.redraw(); core._select(null); S.multi = ids; core.redraw(); } } finally { S.keepMulti = false; }
  };
  S.copy = function () {
    var ids = selIds(); if (!ids.length) return 0; var set = {}; ids.forEach(function (i) { set[i] = 1; });
    S.clip = { parts: S.core.layout.parts.filter(function (p) { return set[p.id]; }).map(E.clone), wires: S.core.layout.wires.filter(function (w) { return set[w.from.split('.')[0]] && set[w.to.split('.')[0]]; }).map(E.clone) };
    return ids.length;
  };
  S.paste = function () {
    var clip = S.clip, core = S.core; if (!clip || !clip.parts.length) return 0;
    var map = {}, sp = Circuit.SPACES.schema;
    clip.parts.forEach(function (p) { var q = E.clone(p); q.id = core.nextId(p.type); q.x = Math.min(sp.w - 60, p.x + 40); q.y = Math.min(sp.h - 60, p.y + 40); delete q.bench; core.layout.parts.push(q); map[p.id] = q.id; });
    var ren = function (pin) { var a = pin.split('.'); return map[a[0]] + '.' + a[1]; };
    clip.wires.forEach(function (w) { core.layout.wires.push({ from: ren(w.from), to: ren(w.to) }); });
    clip.parts.forEach(function (p) { p.x += 40; p.y += 40; }); // nächstes Einfügen wieder versetzt
    S.multi = Object.keys(map).map(function (k) { return map[k]; }); core.sel = null; core.changed('add'); return S.multi.length;
  };
  S.deleteSelected = function () {
    var ids = selIds(), core = S.core; if (ids.length < 2) { core.removeSelected(); return; }
    var set = {}; ids.forEach(function (i) { if (!core.locked[i]) set[i] = 1; });
    core.layout.parts = core.layout.parts.filter(function (p) { return !set[p.id]; });
    core.layout.wires = core.layout.wires.filter(function (w) { return !set[w.from.split('.')[0]] && !set[w.to.split('.')[0]]; });
    S.multi = []; core.sel = null; core.changed('delete');
  };
  S.nudge = function (dx, dy) {
    var ids = selIds(), core = S.core, sp = Circuit.SPACES.schema; if (!ids.length) return false;
    ids.forEach(function (id) { var p = core.part(id); p.x = Math.max(sp.edge, Math.min(sp.w - sp.edge, p.x + dx)); p.y = Math.max(sp.edge, Math.min(sp.h - sp.edge, p.y + dy)); });
    core.changed('move'); core.redraw(); return true;
  };

  /* ---------- Zwischenspeichern ---------- */
  var KEY = 'dqstudio_autosave_v1';
  function store(fn) { try { return fn(root.localStorage); } catch (e) { return undefined; } }
  S.autosave = function () {
    if (!ready || S.task || S.pfadAktiv) return false; var s = ser(); // während einer Aufgabe nicht zwischenspeichern: die verborgenen Werte stünden im Klartext im Browserspeicher
    if (s === lastSaved) return false;
    var lay = S.core.layout;
    if (!lay.parts.length) { store(function (l) { l.removeItem(KEY); }); lastSaved = s; return true; }
    var ok = store(function (l) { l.setItem(KEY, JSON.stringify({ t: Date.now(), layout: lay })); return true; });
    if (ok) lastSaved = s; return !!ok;
  };
  S.hasAutosave = function () { var raw = store(function (l) { return l.getItem(KEY); }); if (!raw) return null; try { var o = JSON.parse(raw); return o && o.layout && o.layout.parts && o.layout.parts.length ? o : null; } catch (e) { return null; } };
  function offerRestore() {
    var o = S.hasAutosave(); if (!o) { ready = true; return; }
    var when = new Date(o.t).toLocaleString('de-CH');
    S.openModal('<h2>Schaltung wiederherstellen?</h2><p>Beim letzten Mal ist eine Schaltung mit <b>' + o.layout.parts.length + ' Bauteilen</b> automatisch gesichert worden (' + when + ').</p><p><button class="tb run" id="asYes">Wiederherstellen</button> <button class="tb" id="asNo">Verwerfen</button></p>');
    $('#asYes').onclick = function () { S.closeModal(); S.loadLayout(o.layout, { run: false }); lastSaved = ser(); ready = true; };
    $('#asNo').onclick = function () { S.closeModal(); store(function (l) { l.removeItem(KEY); }); ready = true; };
  }

  /* ---------- Tastatur ---------- */
  function inField(el) { return el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== 'range' && el.type !== 'checkbox'; }
  S.initFns.push(function () {
    S.history.reset();
    S.ed.opts.selected = function (id) { return S.multi.indexOf(id) >= 0; };
    S.ed.opts.selectedIds = function () { return S.multi.slice(); }; S.ed.opts.onMarquee = function (ids, add) { S.setSelection(ids, add); };
    document.addEventListener('keydown', function (ev) {
      if (inField(ev.target) || ev.altKey) return;
      var k = ev.key, ctrl = ev.ctrlKey || ev.metaKey, done = false;
      if (ctrl) {
        if (k === 'z' || k === 'Z') done = ev.shiftKey ? S.redo() || true : S.undo() || true;
        else if (k === 'y' || k === 'Y') done = S.redo() || true;
        else if (k === 'a' || k === 'A') { S.selectAll(); done = true; }
        else if (k === 'c' || k === 'C') { S.copy(); done = true; }
        else if (k === 'v' || k === 'V') { S.paste(); done = true; }
      } else if ((k === 'Delete' || k === 'Backspace') && S.multi.length > 1) { S.deleteSelected(); done = true; }
      else if (k === 'Escape') { if (S.multi.length) { S.multi = []; S.ed.render(); } }
      else if (/^Arrow(Left|Right|Up|Down)$/.test(k) && !ev.target.closest('select,summary')) { var g = Circuit.SPACES.schema.grid; done = S.nudge(k === 'ArrowLeft' ? -g : k === 'ArrowRight' ? g : 0, k === 'ArrowUp' ? -g : k === 'ArrowDown' ? g : 0); }
      if (done) { ev.preventDefault(); ev.stopImmediatePropagation(); }
    }, true);
    // Umschalt+Klick: Bauteil zur Auswahl hinzufügen oder herausnehmen
    S.ed.svg.addEventListener('pointerdown', function (ev) {
      if (!ev.shiftKey) return; var t = ev.target.closest('[data-part]'); if (!t) return;
      var id = t.dataset.part, cur = S.multi.length ? S.multi : (S.core.sel && S.core.part(S.core.sel) ? [S.core.sel] : []);
      S.multi = cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]); S.core.sel = null; S.ed.render();
      ev.stopImmediatePropagation(); ev.preventDefault();
    }, true);
    setInterval(S.autosave, 3000);
    root.addEventListener('beforeunload', function () { S.autosave(); });
    offerRestore();
  });
  S.onSelectHook = function (p) { if (p && S.multi.length && S.multi.indexOf(p.id) < 0) S.multi = []; if (!p && S.multi.length && !S.keepMulti) S.multi = []; };
  S.shortcuts = [['G', 'Gitternetz umschalten: aus, Punkte, Linien'], ['Alt + Klick auf eine Leitung', 'Knotenpunkt setzen und von dort weiterziehen'], ['Strg + Z', 'Rückgängig (bis 200 Schritte)'], ['Strg + Y  oder  Strg + Umschalt + Z', 'Wiederholen'], ['Entf', 'Auswahl löschen'], ['R', 'Bauteil drehen'], ['Esc', 'Abbrechen, Auswahl aufheben'],
    ['Strg + A', 'Alles auswählen'], ['Umschalt + Klick', 'Bauteil zur Auswahl hinzufügen'], ['Strg + C  /  Strg + V', 'Kopieren und Einfügen (versetzt)'], ['Pfeiltasten', 'Auswahl um ein Raster verschieben'],
    ['Leertaste', 'Simulation starten und anhalten'], ['F9', 'Beamer-Modus ein und aus'], ['Strg + S  /  Strg + O  /  Strg + P', 'Speichern, Öffnen, Drucken'], ['U  /  I', 'Spannungen  /  Ströme im Schaltplan zeigen'], ['Bauteil am Zeiger: R / Esc', 'drehen / Setzen beenden'], ['Mausrad', 'Zoomen, zum Zeiger hin (Touch: zwei Finger)'], ['Rechte Taste gehalten und ziehen  /  mittlere Taste', 'Zeichenfläche schieben'], ['Rechtsklick ohne Ziehen', 'Menü: Signal in eine Anzeige'], ['Linke Taste auf leerer Fläche ziehen', 'Auswahlrahmen'], ['Ziehen auf einem ausgewählten Bauteil', 'ganze Auswahl verschieben'], ['Doppelklick auf leere Fläche', 'Schaltung einpassen'], ['Doppelklick auf einen Zähler', 'Zähler aufklappen']];
})(window);

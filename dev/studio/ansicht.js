/* Digital Quest Studio – Ansicht-Menü, Gitternetz (Auftrag «Bauen», Paket 4)
 * Gitternetz in drei Stufen (aus, Punkte, Linien), Rasterweite einstellbar (Standard 20 = Fangraster), Taste G schaltet um.
 * Die Wahl bleibt über Sitzungen erhalten (Browserspeicher, in try/catch – ohne Speicher läuft alles trotzdem). Im Beamer-Modus und beim Drucken
 * ist das Gitter aus, im Export nur auf Wunsch. */
(function (root) {
  'use strict';
  var S = root.Studio, Editor = root.DQEditor, KEY = 'dqstudio_grid_v1';
  var MODES = ['off', 'dots', 'lines'], LABEL = { off: 'aus', dots: 'Punkte', lines: 'Linien' }, SIZES = [10, 20, 40, 100];
  S.grid = { mode: 'dots', size: 20 };
  function store(fn) { try { return fn(root.localStorage); } catch (e) { return undefined; } }
  function load() {
    var raw = store(function (l) { return l.getItem(KEY); }); if (!raw) return;
    try { var o = JSON.parse(raw); if (MODES.indexOf(o.mode) >= 0) S.grid.mode = o.mode; if (SIZES.indexOf(o.size) >= 0) S.grid.size = o.size; } catch (e) { /* kaputter Eintrag: Standard */ }
  }
  /* Was gerade gezeichnet wird: im Beamer-Modus nie */
  function apply() {
    Editor.extra.grid = { mode: S.beamer ? 'off' : S.grid.mode, size: S.grid.size };
    var b = document.getElementById('btnGrid'); if (b) { b.classList.toggle('on', S.grid.mode !== 'off'); b.setAttribute('aria-pressed', S.grid.mode !== 'off'); b.title = 'Gitternetz: ' + LABEL[S.grid.mode] + ' (Taste G schaltet um)'; b.innerHTML = '▦<span class="lb"> Gitter: ' + LABEL[S.grid.mode] + '</span>'; }
    S.ed.render(); menu();
  }
  S.setGrid = function (mode, size) {
    if (mode && MODES.indexOf(mode) >= 0) S.grid.mode = mode; if (size && SIZES.indexOf(size) >= 0) S.grid.size = size;
    store(function (l) { l.setItem(KEY, JSON.stringify(S.grid)); }); apply();
  };
  S.cycleGrid = function () { S.setGrid(MODES[(MODES.indexOf(S.grid.mode) + 1) % MODES.length]); };
  S.gridApply = apply;

  function menu() {
    var mark = function (on, t) { return (on ? '✓ ' : ' ') + t; }, items = [
      { label: 'Beamer-Modus', key: 'F9', act: function () { S.setBeamer(!S.beamer); } }, { label: 'Schaltung einpassen', act: function () { S.ed.fit(); } },
      { head: 'Gitternetz' }].concat(MODES.map(function (m) { return { label: mark(S.grid.mode === m, LABEL[m]), key: m === 'off' ? 'G' : '', act: function () { S.setGrid(m); } }; }),
      [{ head: 'Rasterweite' }], SIZES.map(function (z) { return { label: mark(S.grid.size === z, z + (z === 20 ? ' (wie Fangraster)' : '')), act: function () { S.setGrid(null, z); } }; }));
    if (S.extraViewItems) items = items.concat(S.extraViewItems());
    S.setMenu('ansicht', items);
  }
  S.initFns.push(function () {
    load();
    var bar = document.querySelector('#btnFit'); if (bar && !document.getElementById('btnGrid')) { var b = document.createElement('button'); b.className = 'tb'; b.id = 'btnGrid'; b.addEventListener('click', function () { S.cycleGrid(); }); bar.parentNode.insertBefore(b, bar.nextSibling); }
    document.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test((ev.target || {}).tagName || '')) return;
      if (ev.key === 'g' || ev.key === 'G') { ev.preventDefault(); S.cycleGrid(); }
    });
    apply();
  });
})(window);

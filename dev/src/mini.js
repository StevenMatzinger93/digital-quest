/* Digital Quest – Mini-Schaltung (window.DQMini) fuer Theorie-Lektionen (Plan: docs/PLAN_THEORIE_ANIMATIONEN.md, Phase A)
 * Kein eigenes Zeichensystem: derselbe Interaktionskern (DQCircuit, readonly), derselbe Renderer (DQEditor/DQBench,
 * opts.tight) und dieselbe Engine (E.step, bei Kondensator/Takt/Wechselquelle als Zeitschleife) wie im Labor.
 * Ohne Palette, Pruefung und Messprotokoll; bedienbar sind nur Schalter, Taster und Pegelschalter (Klick).
 *
 * DQMini.mount(el, spec) → { destroy(), core, sim() }
 *   spec.layout   {parts, wires}  (Pflicht) – wie in defTask
 *   spec.bench    {parts:[{id,x,y,rot}]} – Werkbank-Lage (optional; sonst Auto-Anordnung)
 *   spec.view     'schema' (Standard) | 'bench';  spec.toggleView: Umschalter Schaltplan/Werkbank anbieten (Standard ja)
 *   spec.flow     Stromfluss-Punkte an (Standard ja);  spec.volt: Spannungsfarben
 *   spec.sliders  [{part, prop ('value' oder Eigenschaft), label, min, max, step, unit, log, round}] – Schieberegler;
 *                 mit choices:[{value, label}] stattdessen ein Auswahlfeld (z. B. Kurvenform)
 *   spec.readouts [{label, sel, q ('v'|'i'|'p'|'brightness'|'out'|'on'|'speed'|'state'), unit}] oder {label, a, b} (Spannung zwischen Anschluessen)
 *                 oder {label, a, b, ac:'rms'|'avg'|'dc'|'pp'|'peak'} (Wechselgroesse ueber E.acMeasure; avg = Anzeige AVG-Multimeter)
 *   spec.scope    {a, b, span (s), label} – laufendes Oszilloskop (Spannung a gegen b)
 *   spec.slow     Zeitlupen-Umschalter (1× / 0,1×) fuer Schaltungen mit Zeitverhalten
 *   spec.height   Hoehe der Zeichenflaeche in px (Standard 260) */
(function (root) {
  'use strict';
  var E = root.DQEngine, Circuit = root.DQCircuit, Editor = root.DQEditor, Bench = root.DQBench;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DYN = { capacitor: 1, clock: 1, acsource: 1 };

  function mount(el, spec) {
    spec = spec || {};
    var viewMode = spec.view === 'bench' ? 'bench' : 'schema', h = spec.height || 260, dead = false;
    el.classList.add('mini');
    el.innerHTML = '<div class="mini-stage" style="height:' + h + 'px"><svg class="mini-svg mini-schema"></svg><svg class="mini-svg mini-bench"></svg></div>' +
      '<div class="mini-bar"></div>' + (spec.scope ? '<canvas class="mini-scope"></canvas>' : '') + '<div class="mini-ctl"></div>';
    var stage = el.querySelector('.mini-stage'), svgS = el.querySelector('.mini-schema'), svgB = el.querySelector('.mini-bench');
    var bar = el.querySelector('.mini-bar'), ctl = el.querySelector('.mini-ctl'), cv = el.querySelector('.mini-scope');

    var live = { net: null, state: E.newState(), res: null, dynamic: false, raf: 0, last: 0, speed: 1, t: 0, trace: [] };
    var core = new Circuit({ readonly: true, onChange: function () { rebuild(false); } });
    var ed = new Editor(svgS, { core: core, tight: true }), be = new Bench(svgB, { core: core, tight: true });
    var ids = spec.layout.parts.map(function (p) { return p.id; });
    ed.load(spec.layout, ids, spec.bench);
    ed.showFlow = be.showFlow = spec.flow !== false; ed.showVolt = be.showVolt = !!spec.volt;

    function show(mode) {
      viewMode = mode; core.space = mode;
      svgS.style.display = mode === 'schema' ? '' : 'none'; svgB.style.display = mode === 'bench' ? '' : 'none';
      (mode === 'bench' ? be : ed).fit();
      var b = bar.querySelector('[data-mv]'); if (b) b.textContent = mode === 'bench' ? '⊞ Schaltplan' : '▣ Werkbank';
    }
    function fmtR(r, x) {
      if (x.ac) { var m = live.ac && live.ac[x.a + '|' + x.b]; return m && m.ok ? E.fmt(m[x.ac], 'V') : '–'; }
      if (!r) return '–';
      if (x.a) { var v = r.nodeV[live.net.pinNode[x.a]] - (x.b ? r.nodeV[live.net.pinNode[x.b]] : 0); return E.fmt(v, 'V'); }
      var p = r.parts[x.sel]; if (!p) return '–';
      if (x.q === 'on') return p.on ? 'leuchtet' : 'aus';
      if (x.q === 'out') return p.out ? '1' : '0';
      if (x.q === 'brightness') return Math.round(100 * (p.brightness || 0)) + ' %';
      if (x.q === 'state') return { off: 'gesperrt', on: 'aktiv', sat: 'Sättigung' }[p.state] || '–';
      if (x.q === 'speed') return Math.round(100 * Math.abs(p.speed || 0)) + ' %';
      if (p.burnt) return 'DEFEKT';
      var v2 = Math.abs(p[x.q || 'v'] || 0); return E.fmt(v2, x.unit || ({ v: 'V', i: 'A', p: 'W' }[x.q || 'v']));
    }
    function renderReadouts() {
      var ro = ctl.querySelector('.mini-ro'); if (!ro) return;
      ro.innerHTML = (spec.readouts || []).map(function (x) { return '<span><b>' + esc(x.label) + '</b> <span class="mono">' + esc(fmtR(live.res, x)) + '</span></span>'; }).join('');
    }
    function drawScope() {
      if (!cv) return;
      var w = cv.width = cv.clientWidth * (root.devicePixelRatio || 1), hh = cv.height = cv.clientHeight * (root.devicePixelRatio || 1), c = cv.getContext('2d');
      c.fillStyle = '#07090a'; c.fillRect(0, 0, w, hh);
      c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1;
      for (var i = 1; i < 10; i++) { c.beginPath(); c.moveTo(w * i / 10, 0); c.lineTo(w * i / 10, hh); c.stroke(); }
      for (i = 1; i < 6; i++) { c.beginPath(); c.moveTo(0, hh * i / 6); c.lineTo(w, hh * i / 6); c.stroke(); }
      var tr = live.trace; if (!tr.length) return;
      var span = spec.scope.span || 0.1, t1 = tr[tr.length - 1][0], t0 = t1 - span, vs = tr.map(function (p) { return p[1]; });
      var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), lo = Math.min(0, mn), hi = Math.max(0.5, mx), pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
      c.strokeStyle = 'rgba(255,255,255,.25)'; var y0 = hh - (0 - lo) / (hi - lo) * hh; c.beginPath(); c.moveTo(0, y0); c.lineTo(w, y0); c.stroke();
      c.strokeStyle = '#ffb000'; c.lineWidth = 2 * (root.devicePixelRatio || 1); c.beginPath();
      tr.forEach(function (p, k) { var x = (p[0] - t0) / span * w, y = hh - (p[1] - lo) / (hi - lo) * hh; if (k) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
      c.fillStyle = '#8a8a8a'; c.font = (11 * (root.devicePixelRatio || 1)) + 'px monospace';
      c.fillText((spec.scope.label || 'U') + ' · max ' + E.fmt(mx, 'V') + ' · min ' + E.fmt(mn, 'V') + ' · ' + E.fmt(span, 's') + ' Bildbreite', 6, 14 * (root.devicePixelRatio || 1));
    }
    function tick(dt) {
      if (!live.net) return;
      var r = E.step(live.net, live.state, { dt: live.dynamic && dt > 0 ? dt : null });
      live.res = r; live.t = live.state.t || 0;
      if (spec.scope) trace(r);
      var sim = { res: r, pinNode: live.net.pinNode };
      ed.setSim(sim); be.setSim(sim); renderReadouts(); drawScope();
    }
    /* Neu aufbauen nach Klick/Regler – Zustand (Kondensatorladung, Flipflops, defekte Bauteile) bleibt erhalten */
    function rebuild(fresh) {
      if (fresh) { live.state = E.newState(); live.trace = []; }
      try { live.net = E.buildNetlist(core.layout); } catch (e) { live.net = null; bar.querySelector('.mini-err').textContent = e.message; return; }
      live.dynamic = live.net.parts.some(function (p) { return DYN[p.type]; });
      live.ac = {}; // Wechselgroessen einmal je Aenderung (E.acMeasure simuliert einige Perioden)
      (spec.readouts || []).forEach(function (x) { if (x.ac && !live.ac[x.a + '|' + x.b]) live.ac[x.a + '|' + x.b] = E.acMeasure(core.layout, { a: x.a, b: x.b }); });
      tick(0);
      if (live.dynamic && !live.raf) loop();
    }
    function loop() {
      live.last = performance.now();
      var f = function (now) {
        if (dead || !el.isConnected) { live.raf = 0; return; } // Lektion verlassen: Schleife endet von selbst
        var dt = Math.max(0, Math.min(0.05, (now - live.last) / 1000)) * live.speed; live.last = now; // erstes Bild kann vor dem Start liegen: nie negativ
        // schnelle Signale fein genug rechnen: hoechstens 1/40 der kleinsten Periode je Schritt
        var fmax = 0; live.net.parts.forEach(function (p) { if ((p.type === 'clock' || p.type === 'acsource') && p.props.freq) fmax = Math.max(fmax, p.props.freq); });
        var n = fmax ? Math.max(1, Math.min(400, Math.ceil(dt * fmax * 40))) : 1;
        if (!dt) { live.raf = requestAnimationFrame(f); return; }
        for (var k = 0; k < n - 1; k++) { var rk = E.step(live.net, live.state, { dt: dt / n }); if (spec.scope) trace(rk); }
        tick(dt / n);
        live.raf = requestAnimationFrame(f);
      };
      live.raf = requestAnimationFrame(f);
    }
    function trace(r) { // Oszilloskop: Spannung a gegen b mitschreiben, nur die letzte Bildbreite behalten
      var a = live.net.pinNode[spec.scope.a], b = spec.scope.b ? live.net.pinNode[spec.scope.b] : undefined, span = spec.scope.span || 0.1;
      live.trace.push([live.state.t || 0, (r.nodeV[a] || 0) - (b !== undefined ? r.nodeV[b] || 0 : 0)]);
      while (live.trace.length > 2 && live.trace[0][0] < (live.state.t || 0) - span) live.trace.shift();
    }

    /* Leiste: Zuruecksetzen, Ansicht, Zeitlupe */
    bar.innerHTML = '<button class="btn small" data-mr title="Schaltung in den Anfangszustand">↺ Neu starten</button>' +
      (spec.toggleView !== false ? '<button class="btn small" data-mv></button>' : '') +
      (spec.slow ? '<label class="mini-slow"><input type="checkbox" data-ms> Zeitlupe (0,1×)</label>' : '') +
      '<span class="mini-hint dim small">' + (core.layout.parts.some(function (p) { return p.type === 'switch' || p.type === 'button' || p.type === 'logicin'; }) ? 'Schalter und Taster anklicken' : '') + '</span><span class="mini-err small"></span>';
    bar.querySelector('[data-mr]').onclick = function () { ed.load(spec.layout, ids, spec.bench); show(viewMode); rebuild(true); buildSliders(); };
    if (bar.querySelector('[data-mv]')) bar.querySelector('[data-mv]').onclick = function () { show(viewMode === 'bench' ? 'schema' : 'bench'); };
    if (bar.querySelector('[data-ms]')) bar.querySelector('[data-ms]').onchange = function () { live.speed = this.checked ? 0.1 : 1; };

    /* Schieberegler und Messwerte */
    function buildSliders() {
      var h2 = (spec.sliders || []).map(function (s, i) {
        var p = core.part(s.part), cur = s.prop === 'value' ? p.value : (p.props || {})[s.prop];
        if (cur === undefined) cur = s.prop === 'value' ? E.PARTS[p.type].props.value : E.PARTS[p.type].props[s.prop];
        if (s.choices) return '<label class="mini-sl"><span>' + esc(s.label) + '</span><select data-sl="' + i + '">' + s.choices.map(function (c) { return '<option value="' + esc(c.value) + '"' + (String(c.value) === String(cur) ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select><b></b></label>';
        var pos = s.log ? Math.log10(cur) : cur, mn = s.log ? Math.log10(s.min) : s.min, mx = s.log ? Math.log10(s.max) : s.max;
        return '<label class="mini-sl"><span>' + esc(s.label) + '</span><input type="range" data-sl="' + i + '" min="' + mn + '" max="' + mx + '" step="' + (s.log ? 0.01 : s.step || (s.max - s.min) / 100) + '" value="' + pos + '"><b class="mono" data-slv="' + i + '">' + esc(fmtS(s, cur)) + '</b></label>';
      }).join('') + ((spec.readouts || []).length ? '<div class="mini-ro"></div>' : '');
      ctl.innerHTML = h2;
      Array.prototype.forEach.call(ctl.querySelectorAll('[data-sl]'), function (inp) {
        inp.oninput = inp.onchange = function () {
          var s = spec.sliders[+inp.dataset.sl], p = core.part(s.part), v = s.choices ? inp.value : s.log ? Math.pow(10, +inp.value) : +inp.value;
          if (s.choices) { p.props = p.props || {}; p.props[s.prop] = v; live.trace = []; rebuild(false); ed.render(); be.render(); return; }
          if (s.round) v = +v.toPrecision(s.round);
          if (s.prop === 'value') p.value = v; else { p.props = p.props || {}; p.props[s.prop] = v; }
          ctl.querySelector('[data-slv="' + inp.dataset.sl + '"]').textContent = fmtS(s, v);
          rebuild(false); ed.render(); be.render();
        };
      });
      renderReadouts();
    }
    function fmtS(s, v) { return s.unit ? E.fmt(v, s.unit).replace(/\.?0+ /, ' ') : String(+(+v).toPrecision(3)); }

    buildSliders(); show(viewMode); rebuild(true);
    return {
      core: core, sim: function () { return live.res; }, time: function () { return live.state.t || 0; },
      destroy: function () { dead = true; if (live.raf) cancelAnimationFrame(live.raf); el.innerHTML = ''; },
      fit: function () { show(viewMode); } // nach Grössenänderung (Overlay «gross anzeigen») neu einpassen
    };
  }
  root.DQMini = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);

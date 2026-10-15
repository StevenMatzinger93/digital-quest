/* Digital Quest Studio – Zeitverlaufsdiagramm (Stufe 5)
 * Feste Leiste unten im Fenster (kein Oszilloskop-Fenster): digitale Signale untereinander, zeitlich ausgerichtet, dazu Zeilen mit dem
 * Zählerstand als Zahl (Bus aus markierten Zeilen, unterstes Bit zuerst). Signale per Klick hinzufügen (Werkzeug «Messen») und mit ▲ ▼ umordnen.
 * Die Laufzeit der Flipflops steht im Bild: Die Aufzeichnung enthält die Zwischenloesungen je Rechenschritt (sim.js), Stufe k einen Durchgang spaeter. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var rows = [], collapsed = false, spanMan = null, frozen = null, autoSpan = null, autoAt = -1e9, version = -1, lastDraw = 0;
  var ROW_H = root.matchMedia && root.matchMedia('(pointer: coarse)').matches ? 44 : 32; // Zeilenhoehe: Touch 44 px
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var SPANS = []; (function () { for (var e = -8; e <= 3; e++) [1, 2, 5].forEach(function (m) { SPANS.push(m * Math.pow(10, e)); }); })();

  /* ---------- Zeilen ---------- */
  /* Signalzeile: tr = Aufzeichnung (Pegel). Zaehlerstand-Zeile (bus): bits = Liste von Aufzeichnungen, niederwertigstes zuerst; oder tr vom Typ cnt (Zahl). */
  function addRow(desc, label) {
    var key = JSON.stringify(desc); if (rows.some(function (r) { return r.key === key; })) return null;
    var r = { key: key, desc: desc, tr: S.sim.addTrace(desc), mark: false, label: label || null }; rows.push(r); renderRows(); if (collapsed) S.toggleTiming(); // das erste Signal klappt einen eingeklappten Zeitverlauf auf
    return r;
  }
  function addBus(label, descs) {
    var r = { key: 'bus:' + descs.map(JSON.stringify).join('|'), bus: true, bits: descs.map(function (d) { return S.sim.addTrace(d); }), mark: false, label: label || 'Zählerstand' };
    rows.push(r); renderRows(); if (collapsed) S.toggleTiming(); return r;
  }
  function removeRow(i) {
    var r = rows.splice(i, 1)[0]; if (!r) return; if (r.tr) S.sim.removeTrace(r.tr); (r.bits || []).forEach(function (t) { S.sim.removeTrace(t); }); renderRows();
  }
  function clearRows() { while (rows.length) removeRow(0); }
  function labelOf(r) { return r.label || r.tr.label.replace(/^U\((.*)\)$/, '$1'); }
  S.timing = { rows: rows, addRow: addRow, addBus: addBus, clear: clearRows, estSpan: function () { return span(true); } };

  /* Standardzeilen: Takt, alle Flipflop-Ausgaenge Q, Zaehlerausgaenge; dazu der Zaehlerstand aus allen Q (in Bauteilreihenfolge) */
  function autoRows() {
    var net = S.sim.net; if (!net) return; var qs = [];
    var num = function (id) { return +(id.match(/\d+/) || [0])[0]; };
    net.parts.filter(function (p) { return p.type === 'clock'; }).sort(function (a, b) { return num(a.id) - num(b.id); }).forEach(function (p) { addRow({ kind: 'dig', a: p.id + '.out' }); });
    var ffs = net.parts.filter(function (p) { return E.PARTS[p.type].ff; }).sort(function (a, b) { return num(a.id) - num(b.id); });
    ffs.forEach(function (p) { var d = { kind: 'dig', a: p.id + '.Q' }; addRow(d); qs.push(d); });
    net.parts.filter(function (p) { return E.PARTS[p.type].ctr; }).forEach(function (p) {
      var nb = E.ctrBitCount(E.PARTS[p.type], p.props), bits = []; for (var k = 0; k < nb; k++) { var d = { kind: 'dig', a: p.id + '.Q' + k }; addRow(d); bits.push(d); }
      addBus('Zählerstand ' + p.id, bits);
    });
    if (ffs.length >= 2) addBus('Zählerstand', qs);
  }
  S.timing.auto = autoRows;

  /* ---------- Darstellung ---------- */
  var PAL = ['#11864f', '#d9480f', '#0b6e94', '#7b3fb5', '#b8860b', '#c2255c', '#2b6cb0', '#6b7a00'], entries = [], tlMode = 'stack', tlModeSet = false;
  var isDig = function (r) { return !!r.tr && r.desc.kind !== 'cnt'; };
  /* Darstellung: untereinander (je Signal eine Zeile) oder überlappend (alle Digitalsignale in einem Feld, Zähler-Zahlen bleiben eigene Zeilen) */
  function renderRows() {
    var box = $('#tlRows'); if (!box) return;
    var ov = tlMode === 'overlap' && rows.some(isDig), first = true; entries = [];
    box.innerHTML = rows.map(function (r, i) {
      if (ov && isDig(r)) {
        if (!first) return ''; first = false;
        var members = rows.filter(isDig); members.forEach(function (m, k) { m.color = PAL[k % PAL.length]; }); entries.push({ ov: true, rs: members });
        return '<div class="tl-row ov" data-i="ov"><div class="tl-lab ov">' + members.map(function (m) { return '<span class="sc-ch"><i style="background:' + m.color + '"></i><span class="tl-nm" title="' + esc(labelOf(m)) + '">' + esc(labelOf(m)) + '</span><button data-a="rmov" data-k="' + rows.indexOf(m) + '" aria-label="Signal entfernen" title="Signal entfernen">×</button></span>'; }).join('') + '</div><canvas class="tl-cv"></canvas></div>';
      }
      entries.push({ r: r });
      return '<div class="tl-row" data-i="' + i + '"><div class="tl-lab"><input type="checkbox" data-a="mark" ' + (r.mark ? 'checked' : '') + ' aria-label="Zeile markieren" title="Markieren für «Zählerstand aus Markierten»"><span class="tl-nm" title="' + esc(labelOf(r)) + '">' + esc(labelOf(r)) + '</span>' +
        '<button data-a="up" title="nach oben" aria-label="nach oben">▲</button><button data-a="down" title="nach unten" aria-label="nach unten">▼</button><button data-a="rm" title="Zeile entfernen" aria-label="Zeile entfernen">×</button></div><canvas class="tl-cv"></canvas></div>';
    }).join('') || '<div class="tl-empty hint">' + S.hintHTML('timing') + '</div>';
    version = -1;
  }
  S.timing.setMode = function (m, byUser) { tlMode = m; if (byUser) tlModeSet = true; var sel = $('#tlMode'); if (sel) sel.value = m; renderRows(); };
  function span(forceNow) {
    if (spanMan) return spanMan;
    var now = performance.now();
    if (forceNow || now - autoAt > 400 || autoSpan === null) {
      autoAt = now; var best = 0;
      rows.forEach(function (r) { var trs = r.tr ? [r.tr] : r.bits; trs.forEach(function (t) { var p = S.estPeriod && S.estPeriod(t); if (p) best = Math.max(best, p); }); });
      var want = best ? 1.25 * best : (S.sim.span || Math.max(S.sim.state.t * 1.1, 20 * S.sim.dt));
      var sn = SPANS.filter(function (x) { return x >= want * 0.9999; })[0] || SPANS[SPANS.length - 1]; autoSpan = sn;
    }
    return autoSpan;
  }
  function levelAt(tr, t) { var v = tr.at(t); return isNaN(v) ? null : v > E.LOGIC.vth; }

  function draw() {
    var wrap = $('#tlRows'); if (!wrap) return;
    var sim = S.sim, sp = span(), tEnd = frozen !== null ? frozen : sim.state.t, t0 = tEnd > sp ? tEnd - sp : 0, t1 = t0 + sp;
    var dpr = root.devicePixelRatio || 1, font = getComputedStyle(document.body).getPropertyValue('--font-mono');
    var cvs = wrap.querySelectorAll('.tl-cv');
    entries.forEach(function (en, i) {
      var cv = cvs[i]; if (!cv) return; var W = Math.max(50, cv.clientWidth), H = en.ov ? Math.max(ROW_H * 2, 24 * en.rs.length) : ROW_H, r = en.r;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr) || cv.style.height !== H + 'px') { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; cv.parentNode.style.height = H + 'px'; }
      var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var px = function (t) { return (t - t0) / sp * W; };
      ctx.strokeStyle = '#e2eef0'; ctx.lineWidth = 1; for (var g = 0; g <= 10; g++) { var gx = Math.round(g * W / 10) + .5; ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      ctx.font = '12px ' + font;
      if (en.ov) { ctx.fillStyle = '#5b6b73'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText('1', 3, 2); ctx.textBaseline = 'bottom'; ctx.fillText('0', 3, H - 2); en.rs.forEach(function (m) { drawDigital(ctx, m.tr, t0, t1, W, H, px, m.color); }); }
      else if (r.tr && r.desc.kind !== 'cnt') drawDigital(ctx, r.tr, t0, t1, W, H, px);
      else drawBus(ctx, r, t0, t1, W, H, px);
    });
    // Zeitachse
    var ax = $('#tlAxis'); if (ax) {
      var W2 = Math.max(50, ax.clientWidth); if (ax.width !== Math.round(W2 * dpr)) { ax.width = Math.round(W2 * dpr); ax.height = Math.round(20 * dpr); ax.style.height = '20px'; }
      var c2 = ax.getContext('2d'); c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W2, 20); c2.font = '11px ' + font; c2.fillStyle = '#5b6b73'; c2.textBaseline = 'top';
      for (var k = 0; k <= 10; k += 2) { var x = k * W2 / 10; c2.textAlign = k === 0 ? 'left' : k === 10 ? 'right' : 'center'; c2.fillText(S.fmtT(t0 + sp * k / 10), x, 3); }
    }
    var sel = $('#tlSpan'); if (sel && !spanMan && document.activeElement !== sel) sel.options[0].textContent = 'Zeit: Auto (' + S.fmtT(sp / 10) + '/Div)';
    version = sim.version;
  }
  /* Pegelverlauf als Treppe: Flanken genau zu den aufgezeichneten Zeiten (Flipflop-Laufzeit sichtbar) */
  function drawDigital(ctx, tr, t0, t1, W, H, px, color) {
    var a = Math.max(0, tr.lower(t0) - 1), b = Math.min(tr.n, tr.lower(t1 + 1e-15) + 1); if (b <= a) return;
    var hi = 6, lo = H - 6, lvl = tr.v[a] > E.LOGIC.vth, segs = [[t0, lvl]];
    for (var i = a + 1; i < b; i++) { var L = tr.v[i] > E.LOGIC.vth; if (L !== lvl) { segs.push([tr.t[i], L]); lvl = L; } }
    ctx.lineWidth = 2; ctx.lineJoin = 'miter';
    ctx.beginPath();
    segs.forEach(function (sg, k) { var x = px(Math.max(sg[0], t0)), y = sg[1] ? hi : lo; if (k === 0) ctx.moveTo(x, y); else { ctx.lineTo(x, segs[k - 1][1] ? hi : lo); ctx.lineTo(x, y); } });
    ctx.lineTo(px(Math.min(t1, tr.t[b - 1])), segs[segs.length - 1][1] ? hi : lo);
    ctx.strokeStyle = color || '#11864f'; ctx.stroke();
  }
  /* Zahlenband: Wert aus den Bits (oder Zaehlerstand-Aufzeichnung); jede Aenderung beginnt ein neues Feld */
  function drawBus(ctx, r, t0, t1, W, H, px) {
    var changes = [], trs = r.bits || [r.tr], i;
    trs.forEach(function (tr) { var a = Math.max(0, tr.lower(t0) - 1), b = Math.min(tr.n, tr.lower(t1 + 1e-15) + 1), last = null; for (i = a; i < b; i++) { var L = r.bits ? tr.v[i] > E.LOGIC.vth : tr.v[i]; if (L !== last) { changes.push(tr.t[i]); last = L; } } });
    changes.push(t0); changes.sort(function (x, y) { return x - y; });
    var times = changes.filter(function (t, k) { return k === 0 || t - changes[k - 1] > 1e-15; }).filter(function (t) { return t >= t0 && t <= t1; });
    if (!times.length) times = [t0];
    function valAt(t) { // Wert kurz nach t (Flanke bei t gehoert schon zum neuen Wert)
      if (!r.bits) { var tr = r.tr, j = tr.lower(t + 1e-15); j = Math.min(j, tr.n - 1); return j < 0 ? null : (tr.t[j] <= t + 1e-15 ? tr.v[j] : tr.v[Math.max(0, j - 1)]); }
      var n = 0; for (var k = 0; k < r.bits.length; k++) { var tr2 = r.bits[k], j2 = tr2.lower(t + 1e-15); if (j2 >= tr2.n || tr2.t[j2] > t + 1e-15) j2--; if (j2 < 0) return null; if (tr2.v[j2] > E.LOGIC.vth) n += Math.pow(2, k); } return n;
    }
    var tend = Math.min(t1, Math.max(t0, (trs[0].n ? trs[0].t[trs[0].n - 1] : t0)));
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (var s = 0; s < times.length; s++) {
      var ta = times[s], tb = s + 1 < times.length ? times[s + 1] : tend, xa = px(ta), xb = px(tb), v = valAt(ta); if (v === null || xb - xa < 0.5) continue;
      ctx.strokeStyle = '#0b6e94'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(79,195,247,.14)';
      var x1 = xa + 1.5, x2 = Math.max(xa + 3, xb - 1.5); ctx.beginPath(); ctx.moveTo(x1 + 3, 6); ctx.lineTo(x2 - 3, 6); ctx.lineTo(x2, H / 2); ctx.lineTo(x2 - 3, H - 6); ctx.lineTo(x1 + 3, H - 6); ctx.lineTo(x1, H / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      var txt = String(v); if (x2 - x1 > ctx.measureText(txt).width + 10) { ctx.fillStyle = '#0f2d3a'; ctx.fillText(txt, (x1 + x2) / 2, H / 2 + 1); }
    }
  }

  /* ---------- Aufbau der Leiste ---------- */
  S.initTiming = function () {
    var el = $('#timing');
    el.innerHTML = '<div class="th"><b>Zeitverlauf</b><span class="hint" id="tlHint"></span><span class="sp" style="flex:1"></span>' +
      '<button class="tl-btn" id="tlAuto" title="Taktgeber, Logikanzeigen, Flipflop-Ausgänge und Zählerausgänge der Schaltung einfügen – jedes Signal einmal">Alle digitalen Signale aufnehmen</button>' +
      '<button class="tl-btn" id="tlBus" title="Markierte Zeilen zu einer Zahl zusammenfassen: oberste markierte Zeile = niederwertigstes Bit">Zählerstand aus Markierten</button>' +
      '<select class="tl-btn" id="tlTpd" title="Laufzeit der Flipflops für die Darstellung strecken. Nur zum Zeigen: die echten Laufzeiten sind Nanosekunden."><option value="1">Laufzeit: echt</option><option value="1000">Laufzeit überhöht ×10³</option><option value="1000000">Laufzeit überhöht ×10⁶</option><option value="10000000">Laufzeit überhöht ×10⁷</option></select>' +
      '<span class="tl-warn" id="tlWarn" hidden>⚠ Laufzeit überhöht – keine echten Werte</span>' +
      '<select class="tl-btn" id="tlMode" title="Untereinander: jedes Signal in einer eigenen Zeile. Überlappend: alle Digitalsignale in einem Feld, in verschiedenen Farben."><option value="stack">Untereinander</option><option value="overlap">Überlappend</option></select>' +
      '<select class="tl-btn" id="tlSpan" title="Dauer des Bildes"></select>' +
      '<button class="tl-btn" id="tlFreeze" title="Anzeige anhalten, die Simulation läuft weiter">⏸ Anhalten</button>' +
      '<button class="tl-btn" id="tlClear" title="Alle Zeilen entfernen">Leeren</button></div>' +
      '<div class="tl-body"><div id="tlRows" class="tl-rows"></div><div class="tl-axisrow"><span></span><canvas id="tlAxis"></canvas></div></div>';
    $('#tlSpan').innerHTML = '<option value="auto">Zeit: Auto</option>' + SPANS.map(function (s) { return '<option value="' + s + '">' + S.fmtT(s / 10) + '/Div</option>'; }).join('');
    $('#tlMode').addEventListener('change', function () { S.timing.setMode(this.value, true); });
    $('#tlSpan').addEventListener('change', function () { spanMan = this.value === 'auto' ? null : +this.value; version = -1; });
    $('#tlTpd').addEventListener('change', function () { S.sim.tpdScale = +this.value; var w = $('#tlWarn'); w.hidden = S.sim.tpdScale === 1; w.textContent = '⚠ Laufzeit überhöht ×' + (S.sim.tpdScale === 1e3 ? '10³' : S.sim.tpdScale === 1e6 ? '10⁶' : '10⁷') + ' – keine echten Werte'; $('#timing').classList.toggle('overdrive', S.sim.tpdScale !== 1); S.sim.version++; });
    $('#tlAuto').addEventListener('click', function () { var r = S.addAllDigital(); $('#tlHint').textContent = r.found ? '' : 'Keine digitalen Signale gefunden.'; });
    $('#tlClear').addEventListener('click', function () { clearRows(); });
    $('#tlFreeze').addEventListener('click', function () { frozen = frozen === null ? S.sim.state.t : null; this.textContent = frozen === null ? '⏸ Anhalten' : '▶ Weiter'; this.classList.toggle('on', frozen !== null); version = -1; });
    $('#tlBus').addEventListener('click', function () {
      var marked = rows.filter(function (r) { return r.mark && r.tr && r.desc.kind !== 'cnt'; }); if (marked.length < 2) { $('#tlHint').textContent = 'Mindestens zwei Zeilen markieren.'; return; }
      $('#tlHint').textContent = ''; addBus('Zählerstand', marked.map(function (r) { return r.desc; })); rows.forEach(function (r) { r.mark = false; }); renderRows();
    });
    $('#tlRows').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-a]'), row = ev.target.closest('.tl-row'); if (!b || !row) return; var i = +row.dataset.i, a = b.dataset.a;
      if (a === 'rmov') { removeRow(+b.dataset.k); return; }
      if (a === 'mark') { rows[i].mark = b.checked; return; }
      if (a === 'rm') removeRow(i);
      else if (a === 'up' && i > 0) { rows.splice(i - 1, 0, rows.splice(i, 1)[0]); renderRows(); }
      else if (a === 'down' && i < rows.length - 1) { rows.splice(i + 1, 0, rows.splice(i, 1)[0]); renderRows(); }
    });
    renderRows();
  };
  S.toggleTiming = function () {
    collapsed = !collapsed; var el = $('#timing'); el.classList.toggle('collapsed', collapsed); $('#btnTiming').classList.toggle('on', !collapsed); version = -1;
  };
  S.timingFrame = function (now) {
    if (collapsed || now - lastDraw < 50) return; lastDraw = now;
    if (frozen === null && version === S.sim.version) return; if (frozen !== null && version !== -1) return;
    draw();
  };
  S.timingDraw = draw;
  /* Messen-Werkzeug: digitale Anschluesse gehen in den Zeitverlauf (Ziel einstellbar) */
  var prevPin = S.measurePin, prevPart = S.measurePart;
  S.measureTarget = function () { var t = $('#measureTarget'); return t ? t.value : 'auto'; };
  S.measurePin = function (pin) {
    var net = S.sim.net, node = net && net.pinNode[pin], dig = node !== undefined && S.digitalNodes[node], tg = S.measureTarget();
    if (tg === 'timing' || (tg === 'auto' && dig)) { addRow({ kind: 'dig', a: pin }); if (collapsed) S.toggleTiming(); } else if (prevPin) prevPin(pin);
  };
  S.measurePart = function (p) {
    var d = E.PARTS[p.type], tg = S.measureTarget();
    if ((tg === 'timing' || (tg === 'auto' && (d.ff || d.ctr || d.logic))) && (d.ff || d.logic || d.ctr || p.type === 'clock' || p.type === 'logicin')) {
      var outs = d.ff ? ['Q'] : d.ctr ? E.pinsOf(p.type, p.props).filter(function (x) { return /^Q/.test(x); }) : p.type === 'clock' || p.type === 'logicin' ? ['out'] : d.outs || ['out'];
      outs.forEach(function (pin) { addRow({ kind: 'dig', a: p.id + '.' + pin }); }); if (collapsed) S.toggleTiming();
    } else if (prevPart) prevPart(p);
  };
  S.onLoad = (function (prev) { return function (o) { clearRows(); frozen = null; autoSpan = null; spanMan = null; var sp = $('#tlSpan'); if (sp) sp.value = 'auto'; var fb = $('#tlFreeze'); if (fb) { fb.textContent = '⏸ Anhalten'; fb.classList.remove('on'); } if (prev) prev(o); var t = o.timing; if (t) { (t.rows || []).forEach(function (d) { addRow(d); }); (t.buses || []).forEach(function (b) { addBus(b.label, b.bits); }); } if (t && t.auto) autoRows(); }; })(S.onLoad);
  S.onReset = (function (prev) { return function () { if (prev) prev(); autoSpan = null; frozen = null; version = -1; }; })(S.onReset);
})(window);

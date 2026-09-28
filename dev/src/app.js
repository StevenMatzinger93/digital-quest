/* Digital Quest – Spielsteuerung (window.DigitalQuest) */
(function () {
  'use strict';
  var E = window.DQEngine, DQ = window.DQ, Editor = window.DQEditor, Circuit = window.DQCircuit, Bench = window.DQBench;
  var KEY = 'digitalquest_state_v1';
  var UNLOCK_ALL = /[?&]alle\b/.test(location.search);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ================= Speicherstand =================
   * Vorbereitung Buehler Quest: Personen-ID als UUID, Vor-/Nachname getrennt, Ereignisliste mit Zeitstempel. */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function fresh() {
    return { version: 1, created: Date.now(), profile: { id: uuid(), vorname: '', nachname: '', pseudonym: '' },
      done: {}, drafts: {}, theory: {}, events: [], settings: { theme: 'dark', zoom: 1 } };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  if (!S.profile || !S.profile.id) S.profile = fresh().profile;
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(S)); indicator('Gespeichert', 'ok'); }
      catch (e) { indicator('Nicht gespeichert!', 'err'); }
    }, 250);
  }
  function indicator(t, cls) { var el = $('#saveInd'); if (el) { el.textContent = t; el.className = cls; } }
  function log(type, data) {
    var ev = { t: Date.now(), type: type }; for (var k in data) ev[k] = data[k];
    S.events.push(ev); if (S.events.length > 5000) S.events.splice(0, S.events.length - 5000); save();
  }

  /* ================= Reihenfolge / Freischaltung ================= */
  var ORDER = []; DQ.chapters.forEach(function (c) { c.sequence.forEach(function (id) { ORDER.push(id); }); });
  function unlocked(id) { var i = ORDER.indexOf(id); return UNLOCK_ALL || i <= 0 || !!S.done[ORDER[i - 1]]; }
  function nextOf(id) { var i = ORDER.indexOf(id); return ORDER[i + 1]; }

  /* ================= Navigation ================= */
  function show(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'scr-' + name); });
    $$('[data-go]').forEach(function (b) { b.classList.toggle('active', b.dataset.go === name); });
    current.screen = name;
    if (name !== 'task') stopLoop();
    window.scrollTo(0, 0);
  }
  var current = { screen: 'map' };

  /* ================= Modal ================= */
  function modal(html, buttons) {
    var m = $('#modal');
    m.innerHTML = '<div class="modal-box">' + html + '<div class="modal-btns"></div></div>';
    (buttons || [{ label: 'OK' }]).forEach(function (b) {
      var el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label;
      el.onclick = function () { m.classList.remove('open'); if (b.action) b.action(); };
      $('.modal-btns', m).appendChild(el);
    });
    m.classList.add('open');
  }

  /* ================= Karte ================= */
  var ICON = {
    theory: '<svg viewBox="0 0 24 24"><path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-4a3 3 0 0 0-3 3"/></svg>',
    task: '<svg viewBox="0 0 24 24"><path d="M2 12h5l2-5 3 10 2-5h8"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>'
  };
  function renderMap() {
    var total = ORDER.length, done = ORDER.filter(function (id) { return S.done[id]; }).length;
    var h = '<div class="map-head"><div><h1>Laborkarte</h1><p class="dim">Baue, miss, verstehe. Jede Station schaltet die naechste frei.</p></div>' +
      '<div class="progress"><div class="bar"><i style="width:' + (100 * done / Math.max(1, total)).toFixed(1) + '%"></i></div><span>' + done + ' / ' + total + '</span></div></div>';
    DQ.chapters.forEach(function (c) {
      h += '<section class="chapter"><header><span class="chno">Kapitel ' + c.id + '</span><h2>' + esc(c.title) + '</h2><p>' + esc(c.intro || '') + '</p></header><div class="nodes">';
      c.sequence.forEach(function (id) {
        var it = DQ.byId[id], open = unlocked(id), ok = S.done[id];
        h += '<button class="node ' + it.kind + (ok ? ' done' : '') + (open ? '' : ' locked') + (it.boss ? ' boss' : '') + '" data-open="' + id + '"' + (open ? '' : ' disabled') + '>' +
          '<span class="ic">' + (ok ? ICON.ok : open ? ICON[it.kind] : ICON.lock) + '</span><span class="nid">' + (it.kind === 'theory' ? 'Theorie ' + id.slice(1) : 'Aufgabe ' + id) + '</span><span class="nt">' + esc(it.title) + '</span></button>';
      });
      h += '</div></section>';
    });
    $('#scr-map').innerHTML = h;
    $$('[data-open]', $('#scr-map')).forEach(function (b) { b.onclick = function () { openItem(b.dataset.open); }; });
  }
  function openItem(id) { var it = DQ.byId[id]; if (!it) return; if (it.kind === 'theory') openTheory(it); else openTask(it); }

  /* ================= Aufgabe ================= */
  /* Ein Schaltungszustand (core), zwei Darstellungen: Schema (ed) und Werkbank (bench) */
  var core = null, ed = null, bench = null, viewMode = /[?&]werkbank\b/.test(location.search) ? 'bench' : 'schema', live = { net: null, state: E.newState(), dynamic: false, raf: 0, last: 0, res: null };
  var meter = { mode: 'OFF', a: null, b: null, next: 'a' };

  function parseVal(str) {
    var m = String(str).trim().replace(',', '.').replace('µ', 'u').match(/^(\d*\.?\d+)\s*([pnumkKM]?)(\d*)\s*[A-Za-zΩ]*$/);
    if (!m) return NaN;
    var mult = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6 }[m[2]] || 1;
    var num = m[3] ? parseFloat(m[1] + '.' + m[3]) : parseFloat(m[1]); // 4k7 = 4.7k
    return num * mult;
  }

  function openTask(t) {
    show('task');
    current.task = t; current.started = Date.now(); current.hints = 0; current.tries = 0;
    var draft = S.drafts[t.id];
    var layout = draft && draft.layout ? draft.layout : t.start;
    var lockedIds = t.start.parts.map(function (p) { return p.id; });
    live.state = E.newState();
    meter = { mode: 'OFF', a: null, b: null, next: 'a' };
    renderTaskPanels(t, draft);
    if (!ed) {
      core = new Circuit({
        onChange: function () { persistDraft(); rebuild(); renderInspector(); },
        onSelect: function () { renderInspector(); },
        onProbe: setProbe,
        onMessage: function (m) { status([{ cls: 'info', text: m }]); }
      });
      ed = new Editor($('#board'), { core: core });
      bench = new Bench($('#bench'), { core: core });
      setView(viewMode);
    }
    ed.showVolt = bench.showVolt = false; $('#btnVolt').classList.remove('on');
    ed.load(layout, lockedIds, t.bench); bench.fit();
    setMeterMode('OFF');
    rebuild(); renderInspector();
    log('task_open', { id: t.id });
  }

  function renderTaskPanels(t, draft) {
    var ch = DQ.chapters.filter(function (c) { return c.id === t.ch; })[0];
    var h = '<div class="crumb">Kapitel ' + t.ch + ' · Aufgabe ' + t.id + (t.boss ? ' · <b class="boss-tag">BOSS</b>' : '') + '</div>' +
      '<h2>' + esc(t.title) + '</h2>' +
      (t.story ? '<p class="story">' + t.story + '</p>' : '') +
      '<div class="brief">' + t.brief + '</div>' +
      (t.learn ? '<div class="learn"><b>Lernziel</b> ' + t.learn + '</div>' : '') +
      '<div class="hints"><button class="btn small" id="hint1">Tipp 1</button><button class="btn small" id="hint2">Tipp 2</button></div><div id="hintBox"></div>';
    if (t.measure.length) {
      h += '<div class="protocol"><h3>Messprotokoll</h3>';
      t.measure.forEach(function (m) {
        var v = draft && draft.answers && draft.answers[m.id] !== undefined ? draft.answers[m.id] : '';
        h += '<label><span>' + esc(m.ask) + '</span><input inputmode="decimal" data-ans="' + m.id + '" value="' + esc(v) + '" placeholder="Messwert"><em>' + esc(m.unit || '') + '</em></label>';
      });
      h += '</div>';
    }
    h += '<button class="btn primary big" id="btnCheck">Pruefen</button><div id="results"></div>';
    $('#taskInfo').innerHTML = h;
    $('#hint1').onclick = function () { current.hints = Math.max(current.hints, 1); $('#hintBox').innerHTML = '<div class="hint">' + t.hint + '</div>'; };
    $('#hint2').onclick = function () { current.hints = 2; $('#hintBox').innerHTML = '<div class="hint">' + t.hint + '</div><div class="hint">' + t.hint2 + '</div>'; };
    $$('[data-ans]').forEach(function (inp) { inp.oninput = persistDraft; });
    $('#btnCheck').onclick = check;
    // Bauteil-Palette
    var pal = '';
    t.palette.forEach(function (type) {
      pal += '<button class="palbtn" data-add="' + type + '" title="' + esc(E.PARTS[type].label) + ' hinzufuegen"><svg viewBox="-46 -46 92 92"><g>' + Editor.symbol({ type: type, props: {} }) + '</g></svg><span>' + esc(E.PARTS[type].label) + '</span></button>';
    });
    $('#palette').innerHTML = pal || '<span class="dim small">Keine neuen Bauteile – nur messen.</span>';
    $$('[data-add]').forEach(function (b) { b.onclick = function () { view().addPart(b.dataset.add); renderInspector(); }; });
    void ch;
  }

  function answers() { var a = {}; $$('[data-ans]').forEach(function (i) { a[i.dataset.ans] = i.value; }); return a; }
  function persistDraft() {
    if (!current.task || !ed) return;
    S.drafts[current.task.id] = { layout: ed.layout, answers: answers(), t: Date.now() }; save();
  }

  function rebuild() {
    try { live.net = E.buildNetlist(ed.layout); live.err = null; }
    catch (e) { live.net = null; live.err = e.message; }
    live.dynamic = !!live.net && live.net.parts.some(function (p) { return p.type === 'capacitor' || p.type === 'clock'; });
    tick(0);
    if (live.dynamic) startLoop(); else stopLoop();
  }
  function startLoop() {
    if (live.raf) return;
    live.last = performance.now();
    var f = function (now) {
      var dt = Math.min(0.05, (now - live.last) / 1000); live.last = now;
      tick(dt); live.raf = requestAnimationFrame(f);
    };
    live.raf = requestAnimationFrame(f);
  }
  function stopLoop() { if (live.raf) cancelAnimationFrame(live.raf); live.raf = 0; }

  function meterNodes() {
    if (!live.net || !meter.a || !meter.b) return null;
    var a = live.net.pinNode[meter.a], b = live.net.pinNode[meter.b];
    return a === undefined || b === undefined ? null : { a: a, b: b };
  }
  function tick(dt) {
    if (!live.net) { setSim(null); status([{ cls: 'err', text: live.err }]); return; }
    var mn = meterNodes(), mopt = mn && (meter.mode === 'V' || meter.mode === 'A') ? { mode: meter.mode, a: mn.a, b: mn.b } : null;
    var r = E.step(live.net, live.state, { dt: live.dynamic && dt > 0 ? dt : null, meter: mopt });
    live.res = r;
    setSim({ res: r, pinNode: live.net.pinNode });
    updateMeter(r, mn);
    status(diagnose(r.faults));
  }

  function setSim(sim) { ed.setSim(sim); bench.setSim(sim); }
  function view() { return viewMode === 'bench' ? bench : ed; }
  /* Darstellung wechseln – Schaltung, Auswahl und Messspitzen bleiben (gemeinsamer Kern) */
  function setView(mode) {
    viewMode = mode === 'bench' ? 'bench' : 'schema';
    if (!core) return;
    core.space = viewMode; core.wireStart = null;
    $('#board').classList.toggle('off', viewMode !== 'schema'); $('#bench').classList.toggle('off', viewMode !== 'bench');
    view().fit();
  }

  var FAULT_TEXT = {
    SHORT: function (f) { return 'Kurzschluss an ' + f.part + ': Die Quelle liefert ' + E.fmt(Math.abs(f.i), 'A') + '. Plus und Minus sind ohne Verbraucher verbunden.'; },
    LED_BURNT: function (f) { return 'LED ' + f.part + ' ist durchgebrannt – der Strom war zu gross. Vorwiderstand pruefen, dann „Reparieren“.'; },
    LED_REVERSE: function (f) { return 'LED ' + f.part + ' liegt mit ' + E.fmt(Math.abs(f.v), 'V') + ' in Sperrrichtung – LEDs vertragen nur ca. 5 V Sperrspannung.'; },
    OVERLOAD: function (f) { return 'Widerstand ' + f.part + ' ist ueberlastet (' + E.fmt(Math.abs(f.p), 'W') + ') – er wird heiss.'; },
    LAMP_BURNT: function (f) { return 'Lampe ' + f.part + ' ist durchgebrannt – Ueberspannung.'; },
    AMMETER_OVERLOAD: function (f) { return 'Strommesser ' + f.part + ' misst mehr als 10 A – falsch angeschlossen?'; },
    UNSTABLE: function () { return 'Die Logikschaltung kommt nicht zur Ruhe – sie schwingt.'; },
    NO_GROUND: function () { return 'Logikbausteine und Taktgeber brauchen eine Masse-Verbindung (⏚).'; }
  };
  function diagnose(faults) { return (faults || []).map(function (f) { return { cls: 'err', text: (FAULT_TEXT[f.code] || function () { return f.code; })(f) }; }); }
  function status(items) {
    var el = $('#statusbar'); if (!el) return;
    el.innerHTML = items && items.length ? items.map(function (i) { return '<div class="st ' + i.cls + '">' + esc(i.text) + '</div>'; }).join('')
      : '<div class="st ok">Schaltung laeuft – keine Stoerung.</div>';
  }

  /* ---------- Multimeter ---------- */
  function setMeterMode(mode) {
    meter.mode = mode;
    $$('[data-mm]').forEach(function (b) { b.classList.toggle('on', b.dataset.mm === mode); });
    if (ed) { ed.tool = mode === 'OFF' ? 'wire' : 'probe'; if (mode === 'OFF') { ed.probes = { a: null, b: null }; meter.a = meter.b = null; meter.next = 'a'; } core.redraw(); }
    $('#mmHelp').textContent = mode === 'OFF' ? 'Messgeraet aus. Klick auf Anschluesse verbindet Leitungen.' :
      'Klick auf einen Anschluss setzt die ' + (meter.next === 'a' ? 'rote (+)' : 'schwarze (COM)') + ' Messspitze.';
    if (ed) tick(0);
  }
  function setProbe(pin) {
    meter[meter.next] = pin; ed.probes[meter.next] = pin;
    meter.next = meter.next === 'a' ? 'b' : 'a';
    $('#mmHelp').textContent = 'Naechster Klick setzt die ' + (meter.next === 'a' ? 'rote (+)' : 'schwarze (COM)') + ' Spitze.';
    log('probe', { id: current.task && current.task.id, mode: meter.mode, pin: pin });
    tick(0);
  }
  function updateMeter(r, mn) {
    var lcd = $('#lcd'), txt = '— — —', warn = '';
    if (meter.mode === 'OFF') txt = 'OFF';
    else if (!mn) txt = meter.mode === 'R' ? '0L Ω' : '- - -';
    else if (meter.mode === 'V') txt = E.fmt(r.nodeV[mn.a] - r.nodeV[mn.b], 'V');
    else if (meter.mode === 'A') {
      if (live.state.fuse) { txt = 'FUSE'; warn = 'Sicherung durchgebrannt! Strom misst man in Reihe, nie parallel zu einer Quelle.'; }
      else txt = E.fmt((r.nodeV[mn.a] - r.nodeV[mn.b]) / E.METER.rA, 'A');
    } else if (meter.mode === 'R') {
      var m = E.measure(ed.layout, { mode: 'R', a: meter.a, b: meter.b }, live.state);
      txt = m.ok ? m.display.replace('OL', '0L') : 'Err'; warn = m.ok ? '' : m.error;
    }
    lcd.textContent = txt;
    $('#mmWarn').textContent = warn; $('#btnFuse').hidden = !live.state.fuse;
    $('#mmProbes').innerHTML = '<span class="pr red">+ ' + esc(meter.a || '–') + '</span><span class="pr black">COM ' + esc(meter.b || '–') + '</span>';
  }

  /* ---------- Eigenschaften ---------- */
  function renderInspector() {
    var el = $('#inspector'); if (!ed) return;
    var p = ed.sel && ed.sel.indexOf('w:') !== 0 ? ed.part(ed.sel) : null;
    if (!p) { el.innerHTML = '<p class="dim small">Bauteil anklicken, um Werte zu aendern. <kbd>R</kbd> dreht, <kbd>Entf</kbd> loescht.</p>'; return; }
    var d = E.PARTS[p.type], q = p.props || (p.props = {}), lock = ed.locked[p.id], val = p.value !== undefined ? p.value : (q.value !== undefined ? q.value : d.props.value);
    var r = live.res && live.res.parts[p.id];
    var h = '<div class="insp-head"><b>' + esc(p.id) + '</b> ' + esc(d.label) + (lock ? ' <span class="tag">Aufgabe</span>' : '') + '</div>';
    function field(label, key, v, unit) { return '<label class="fld"><span>' + label + '</span><input data-prop="' + key + '" value="' + esc(v) + '"' + (lock ? ' disabled' : '') + '><em>' + unit + '</em></label>'; }
    if (p.type === 'battery') h += field('Spannung', 'value', Editor.fmtVal(val), 'V');
    if (p.type === 'resistor' || p.type === 'lamp' || p.type === 'pot') h += field('Widerstand', 'value', Editor.fmtVal(val), 'Ω');
    if (p.type === 'capacitor') h += field('Kapazitaet', 'value', Editor.fmtVal(val), 'F');
    if (p.type === 'clock') h += field('Frequenz', 'freq', q.freq || d.props.freq, 'Hz');
    if (p.type === 'pot') h += '<label class="fld"><span>Schleifer</span><input type="range" min="0" max="1" step="0.01" data-prop="pos" value="' + (q.pos !== undefined ? q.pos : 0.5) + '"></label>';
    if (p.type === 'led') {
      h += '<label class="fld"><span>Farbe</span><select data-prop="color"' + (lock ? ' disabled' : '') + '>' + Object.keys(E.LED_COLORS).map(function (c) { return '<option' + ((q.color || 'rot') === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>';
    }
    if (p.type === 'switch') h += '<button class="btn small" id="tgl">' + (q.closed ? 'Oeffnen' : 'Schliessen') + '</button>';
    if (r) {
      h += '<dl class="readout">';
      if (r.v !== undefined) h += '<dt>U</dt><dd>' + E.fmt(Math.abs(r.v), 'V') + '</dd>';
      if (r.i !== undefined) h += '<dt>I</dt><dd>' + E.fmt(Math.abs(r.i), 'A') + '</dd>';
      if (r.p !== undefined) h += '<dt>P</dt><dd>' + E.fmt(Math.abs(r.p), 'W') + '</dd>';
      if (r.burnt) h += '<dt>!</dt><dd class="err">defekt</dd>';
      h += '</dl><p class="dim tiny">Direktanzeige der Simulation – im Protokoll zaehlt, was du mit dem Messgeraet misst.</p>';
    }
    el.innerHTML = h;
    $$('[data-prop]', el).forEach(function (inp) {
      inp.onchange = inp.oninput = function (ev) {
        var k = inp.dataset.prop, v = inp.value;
        if (k === 'value' || k === 'freq') { var n = parseVal(v); if (!(n > 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); if (ev.type !== 'change') return; v = n; if (k === 'value') { p.value = n; delete q.value; } else q[k] = n; }
        else if (k === 'pos') q.pos = +v; else q[k] = v;
        persistDraft(); rebuild(); core.redraw(); if (k !== 'pos') renderInspector();
      };
    });
    var tg = $('#tgl'); if (tg) tg.onclick = function () { q.closed = !q.closed; persistDraft(); rebuild(); renderInspector(); };
  }

  /* ---------- Oszilloskop ---------- */
  function scope() {
    var cv = $('#scope'), ctx = cv.getContext('2d'), T = +$('#tb').value;
    var w = cv.width = cv.clientWidth * (window.devicePixelRatio || 1), h = cv.height = cv.clientHeight * (window.devicePixelRatio || 1);
    ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,176,0,0.12)'; ctx.lineWidth = 1;
    for (var i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(w * i / 10, 0); ctx.lineTo(w * i / 10, h); ctx.stroke(); }
    for (i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 8); ctx.lineTo(w, h * i / 8); ctx.stroke(); }
    if (!meter.a) { $('#scopeInfo').textContent = 'Setze zuerst die rote Messspitze (Multimeter V).'; return; }
    var s;
    try { s = E.simulate(ed.layout, { dt: T / 400, tEnd: T, probes: [{ a: meter.a, b: meter.b || undefined }] }).samples; }
    catch (e) { $('#scopeInfo').textContent = e.message; return; }
    var vs = s.map(function (x) { return x.ch0; }), mx = Math.max.apply(null, vs), mn = Math.min.apply(null, vs);
    var top = Math.max(1, Math.ceil(Math.max(mx, 0) * 1.1)), bot = Math.min(0, Math.floor(mn * 1.1));
    ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2 * (window.devicePixelRatio || 1); ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 6; ctx.beginPath();
    s.forEach(function (x, k) { var px = x.t / T * w, py = h - (x.ch0 - bot) / (top - bot) * h; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke(); ctx.shadowBlur = 0;
    $('#scopeInfo').textContent = 'Kanal: ' + meter.a + ' gegen ' + (meter.b || 'Masse') + ' · ' + bot + '…' + top + ' V · max ' + E.fmt(mx, 'V') + ' · min ' + E.fmt(mn, 'V');
    log('scope', { id: current.task && current.task.id, T: T });
  }

  /* ---------- Pruefen ---------- */
  function check() {
    var t = current.task; current.tries++;
    var ans = answers(), r = E.runTask(t, ed.layout, ans);
    var h = '<ul class="res">' + r.results.map(function (x) {
      var extra = '';
      if (!x.ok && x.info && typeof x.info.got === 'number') extra = ' <span class="dim">(ist: ' + E.fmt(Math.abs(x.info.got), '') + ')</span>';
      return '<li class="' + (x.ok ? 'ok' : 'bad') + '">' + (x.ok ? '✔' : '✘') + ' ' + esc(x.text) + extra + '</li>';
    }).join('') + '</ul>';
    var an = E.analyze(ed.layout); if (an.faults.length) h += diagnose(an.faults).map(function (d) { return '<div class="st err">' + esc(d.text) + '</div>'; }).join('');
    $('#results').innerHTML = h;
    log(r.pass ? 'task_done' : 'task_try', { id: t.id, tries: current.tries, hints: current.hints, dur: Math.round((Date.now() - current.started) / 1000), tags: t.tags });
    if (r.pass) {
      var first = !S.done[t.id]; S.done[t.id] = true; save();
      var nx = nextOf(t.id);
      modal('<h2 class="win">Geschafft!</h2><p>' + t.take + '</p>' + (first ? '' : '<p class="dim">(bereits geloest)</p>'),
        [{ label: 'Zur Karte', action: function () { renderMap(); show('map'); } }].concat(nx ? [{ label: 'Weiter', primary: true, action: function () { openItem(nx); } }] : []));
    }
  }

  /* ================= Theorie ================= */
  function openTheory(th) {
    show('theory'); current.theory = th; current.started = Date.now();
    var h = '<div class="theory"><div class="crumb">Kapitel ' + th.ch + ' · Theorie ' + th.id.slice(1) + '</div><h2>' + esc(th.title) + '</h2><article class="lesson">' + th.lesson + '</article>' +
      '<button class="btn primary" id="toQuiz">Verstanden – zum Check</button><div id="quiz"></div></div>';
    $('#scr-theory').innerHTML = h;
    $('#toQuiz').onclick = function () { this.hidden = true; renderQuiz(th); };
    log('theory_open', { id: th.id });
  }
  function renderQuiz(th) {
    var h = '<h3>Check – ' + Math.round(th.pass * 100) + ' % zum Bestehen</h3>';
    th.questions.forEach(function (q, i) {
      h += '<fieldset class="q" data-q="' + i + '"><legend>' + (i + 1) + '. ' + q.q + '</legend>' +
        q.options.map(function (o, j) { return '<label><input type="radio" name="q' + i + '" value="' + j + '"> ' + o + '</label>'; }).join('') + '<div class="expl"></div></fieldset>';
    });
    h += '<button class="btn primary" id="evalQuiz">Auswerten</button><div id="quizRes"></div>';
    $('#quiz').innerHTML = h;
    $('#evalQuiz').onclick = function () {
      var right = 0;
      th.questions.forEach(function (q, i) {
        var sel = $('input[name="q' + i + '"]:checked'), fs = $('[data-q="' + i + '"]'), ok = sel && +sel.value === q.correct;
        if (ok) right++;
        fs.className = 'q ' + (ok ? 'ok' : 'bad'); $('.expl', fs).innerHTML = (ok ? '✔ ' : '✘ ') + (q.explain || '');
      });
      var score = right / th.questions.length, pass = score >= th.pass - 1e-9;
      S.theory[th.id] = { best: Math.max(score, (S.theory[th.id] || {}).best || 0) };
      log('theory_check', { id: th.id, score: score, pass: pass, dur: Math.round((Date.now() - current.started) / 1000), tags: th.tags });
      if (pass) S.done[th.id] = true; save();
      var nx = nextOf(th.id);
      $('#quizRes').innerHTML = '<div class="st ' + (pass ? 'ok' : 'err') + '">' + right + ' von ' + th.questions.length + ' richtig – ' + (pass ? 'bestanden!' : 'noch nicht bestanden. Lies die Erklaerungen und versuche es erneut.') + '</div>' +
        (pass && nx ? '<button class="btn primary" id="thNext">Weiter</button>' : '<button class="btn" id="thRetry">Nochmals</button>');
      if ($('#thNext')) $('#thNext').onclick = function () { openItem(nx); };
      if ($('#thRetry')) $('#thRetry').onclick = function () { openTheory(th); };
    };
  }

  /* ================= Handbuch ================= */
  function renderManual(pageId) {
    var pages = DQ.manual || [], p = pages.filter(function (x) { return x.id === pageId; })[0] || pages[0];
    $('#scr-manual').innerHTML = '<div class="manual"><nav>' + pages.map(function (x) { return '<button class="' + (x === p ? 'on' : '') + '" data-man="' + x.id + '">' + esc(x.title) + '</button>'; }).join('') +
      '</nav><article>' + (p ? '<h2>' + esc(p.title) + '</h2>' + p.html : '') + '</article></div>';
    $$('[data-man]').forEach(function (b) { b.onclick = function () { renderManual(b.dataset.man); }; });
  }

  /* ================= Einstellungen ================= */
  function renderSettings() {
    var pr = S.profile;
    $('#scr-settings').innerHTML = '<div class="settings"><h2>Einstellungen</h2>' +
      '<section><h3>Darstellung</h3><label class="fld"><span>Thema</span><select id="setTheme"><option value="dark">Dunkel</option><option value="light">Hell</option></select></label></section>' +
      '<section><h3>Profil (lokal)</h3><p class="dim small">Wird spaeter fuer Klassen und die questuebergreifende Auswertung (Buehler Quest) verwendet. Personen-ID: <code>' + esc(pr.id) + '</code></p>' +
      '<label class="fld"><span>Vorname</span><input id="pfV" value="' + esc(pr.vorname) + '"></label><label class="fld"><span>Nachname</span><input id="pfN" value="' + esc(pr.nachname) + '"></label>' +
      '<label class="fld"><span>Pseudonym</span><input id="pfP" value="' + esc(pr.pseudonym) + '"></label></section>' +
      '<section><h3>Spielstand</h3><button class="btn" id="exp">Exportieren</button> <label class="btn">Importieren<input type="file" id="imp" accept=".json" hidden></label> <button class="btn danger" id="rst">Zuruecksetzen</button></section></div>';
    $('#setTheme').value = S.settings.theme;
    $('#setTheme').onchange = function () { S.settings.theme = this.value; applyTheme(); save(); };
    [['#pfV', 'vorname'], ['#pfN', 'nachname'], ['#pfP', 'pseudonym']].forEach(function (x) { $(x[0]).oninput = function () { S.profile[x[1]] = this.value; save(); }; });
    $('#exp').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
      a.download = 'digitalquest_spielstand.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('#imp').onchange = function () {
      var f = this.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var d = JSON.parse(rd.result); if (!d.profile || !d.done) throw 0; S = d; save(); renderSettings(); modal('<p>Spielstand geladen.</p>'); } catch (e) { modal('<p>Die Datei ist kein gueltiger Spielstand.</p>'); } };
      rd.readAsText(f);
    };
    $('#rst').onclick = function () {
      modal('<h2>Alles zuruecksetzen?</h2><p>Fortschritt und Entwuerfe werden geloescht. Die Personen-ID bleibt.</p>', [{ label: 'Abbrechen' }, { label: 'Zuruecksetzen', primary: true, action: function () { var id = S.profile; S = fresh(); S.profile = id; save(); renderSettings(); } }]);
    };
  }
  function applyTheme() { document.documentElement.dataset.theme = S.settings.theme; }

  /* ================= Start ================= */
  function init() {
    applyTheme();
    $$('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var g = b.dataset.go;
        if (g === 'map') renderMap(); if (g === 'manual') renderManual(); if (g === 'settings') renderSettings();
        show(g);
      };
    });
    $('#btnRot').onclick = function () { view().rotateSelected(); };
    $('#btnFit').onclick = function () { view().fit(); };
    window.addEventListener('resize', function () { if (ed && current.screen === 'task') view().fit(); });
    $('#btnDel').onclick = function () { ed.removeSelected(); renderInspector(); };
    $('#btnVolt').onclick = function () { ed.showVolt = bench.showVolt = !ed.showVolt; this.classList.toggle('on', ed.showVolt); core.redraw(); };
    $('#btnRepair').onclick = function () { live.state = E.newState(); rebuild(); status([{ cls: 'info', text: 'Defekte Bauteile ersetzt.' }]); };
    $('#btnReset').onclick = function () {
      modal('<h2>Aufgabe zuruecksetzen?</h2><p>Deine Schaltung wird auf den Startzustand gesetzt.</p>', [{ label: 'Abbrechen' }, { label: 'Zuruecksetzen', primary: true, action: function () { delete S.drafts[current.task.id]; save(); openTask(current.task); } }]);
    };
    $('#btnFuse').onclick = function () { live.state.fuse = false; tick(0); };
    $$('[data-mm]').forEach(function (b) { b.onclick = function () { setMeterMode(b.dataset.mm); }; });
    $('#btnScope').onclick = scope;
    document.addEventListener('keydown', function (ev) {
      if (current.screen !== 'task' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      ed && ed.key(ev); renderInspector();
    });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    renderMap(); show('map');
  }

  window.DigitalQuest = { get state() { return S; }, openItem: openItem, get editor() { return ed; }, get bench() { return bench; }, get core() { return core; }, setView: setView, get view() { return viewMode; }, engine: E, parseVal: parseVal };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

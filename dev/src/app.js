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
  /* Dozentenmodus (settings.teacher, per Code in den Einstellungen) oder ?alle: alles offen, Werkbank mit allen Bauteilen */
  function allOpen() { return UNLOCK_ALL || !!S.settings.teacher; }
  function unlocked(id) { var i = ORDER.indexOf(id); return allOpen() || i <= 0 || !!S.done[ORDER[i - 1]]; }
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
      (S.settings.teacher ? '<div class="teacher-bar"><b>Dozentenmodus</b> <span class="dim small">Alle Stationen offen, Freie Werkbank mit allen Bauteilen.</span><label class="fld"><span>Springe zu</span><select id="jump"><option value="">Station waehlen …</option>' +
        DQ.chapters.map(function (c) { return '<optgroup label="Kapitel ' + c.id + ' – ' + esc(c.title) + '">' + c.sequence.map(function (id) { var it = DQ.byId[id]; return '<option value="' + id + '">' + (it.kind === 'theory' ? 'Theorie ' + id.slice(1) : id) + ' ' + esc(it.title) + '</option>'; }).join('') + '</optgroup>'; }).join('') +
        '</select></label></div>' : '') +
      '<div class="map-actions"><button class="btn" data-open="sandbox" title="Frei bauen und messen – ohne Auftrag">Freie Werkbank</button><div class="progress"><div class="bar"><i style="width:' + (100 * done / Math.max(1, total)).toFixed(1) + '%"></i></div><span>' + done + ' / ' + total + '</span></div></div></div>';
    var parts = DQ.parts || [{ no: '', title: '', chapters: DQ.chapters.map(function (c) { return c.id; }) }];
    parts.forEach(function (pt) {
      var chs = DQ.chapters.filter(function (c) { return pt.chapters.indexOf(c.id) >= 0; }), ids = [];
      chs.forEach(function (c) { ids = ids.concat(c.sequence); });
      var pd = ids.filter(function (id) { return S.done[id]; }).length;
      if (pt.no) h += '<div class="part-head part-' + (pt.stage || 'grund') + '"><span class="part-no">Teil ' + pt.no + '</span><h2>' + esc(pt.title) + '</h2>' +
        (pt.stage ? '<span class="stage-tag ' + pt.stage + '">' + esc(DQ.stages[pt.stage]) + '</span>' : '') + '<span class="part-prog mono">' + pd + ' / ' + ids.length + '</span></div>';
      chs.forEach(function (c) {
        h += '<section class="chapter"><header><span class="chno">Kapitel ' + c.id + '</span><h2>' + esc(c.title) + '</h2><p>' + esc(c.intro || '') + '</p></header><div class="nodes">';
        c.sequence.forEach(function (id) {
          var it = DQ.byId[id], open = unlocked(id), ok = S.done[id];
          h += '<button class="node ' + it.kind + (ok ? ' done' : '') + (open ? '' : ' locked') + (it.boss ? ' boss' : '') + '" data-open="' + id + '"' + (open ? '' : ' disabled') + '>' +
            '<span class="ic">' + (ok ? ICON.ok : open ? ICON[it.kind] : ICON.lock) + '</span><span class="nid">' + (it.kind === 'theory' ? 'Theorie ' + id.slice(1) : 'Aufgabe ' + id) + '</span><span class="nt">' + esc(it.title) + '</span></button>';
        });
        h += '</div></section>';
      });
      if (pt.award) h += awardCard(DQ.awards[pt.award]);
    });
    $('#scr-map').innerHTML = h;
    $$('[data-open]', $('#scr-map')).forEach(function (b) { b.onclick = function () { openItem(b.dataset.open); }; });
    $$('[data-award]', $('#scr-map')).forEach(function (b) { b.onclick = function () { openAward(b.dataset.award); }; });
    if ($('#jump')) $('#jump').onchange = function () { if (this.value) openItem(this.value); };
  }

  /* ================= Auszeichnungen (Zertifikat Grundstufe, Abzeichen Profi-Stufe) ================= */
  function awardEarned(a) { return !!S.done[a.boss]; }
  function awardDate(a) { // erster erfolgreicher Abschluss der Boss-Aufgabe
    var ev = S.events.filter(function (e) { return e.type === 'task_done' && e.id === a.boss; })[0];
    return new Date(ev ? ev.t : Date.now());
  }
  function fmtDate(d) { return d.getDate() + '. ' + ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][d.getMonth()] + ' ' + d.getFullYear(); }
  function personName() { var p = S.profile; return (p.vorname + ' ' + p.nachname).trim() || p.pseudonym || ''; }
  function medal(a, size) { // Abzeichen/Siegel als SVG, Farbe je Stufe
    var gold = a.id === 'profi', c1 = gold ? '#ffcf4a' : '#c9d3dc', c2 = gold ? '#b07a00' : '#6f7c88', s = size || 120;
    return '<svg class="medal" viewBox="0 0 120 120" width="' + s + '" height="' + s + '" aria-hidden="true">' +
      '<path d="M38 70 L24 116 L44 106 L54 118 L60 78Z" fill="' + (gold ? '#c41d1d' : '#1f5fae') + '"/><path d="M82 70 L96 116 L76 106 L66 118 L60 78Z" fill="' + (gold ? '#c41d1d' : '#1f5fae') + '"/>' +
      '<circle cx="60" cy="52" r="44" fill="' + c2 + '"/><circle cx="60" cy="52" r="38" fill="' + c1 + '"/><circle cx="60" cy="52" r="31" fill="none" stroke="' + c2 + '" stroke-width="2" stroke-dasharray="3 3"/>' +
      (gold ? '<path d="M60 30 L66 45 L82 46 L69 56 L74 72 L60 63 L46 72 L51 56 L38 46 L54 45Z" fill="' + c2 + '"/>'
        : '<path d="M42 52 h10 l4-10 6 20 4-10 h12" fill="none" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg>';
  }
  function awardCard(a) {
    if (!a) return '';
    var got = awardEarned(a);
    return '<div class="award-card' + (got ? ' earned' : '') + '">' + medal(a, 72) + '<div><span class="part-no">' + esc(a.kind) + '</span><h3>' + esc(a.title) + '</h3>' +
      '<p class="dim small">' + (got ? 'Erhalten am ' + fmtDate(awardDate(a)) + '.' : 'Wird mit der Boss-Aufgabe ' + a.boss + ' freigeschaltet.') + '</p></div>' +
      (got ? '<button class="btn primary" data-award="' + a.id + '">' + esc(a.kind) + ' anzeigen</button>' : allOpen() ? '<button class="btn" data-award="' + a.id + '">Vorschau</button>' : '<span class="award-lock">' + ICON.lock + '</span>') + '</div>';
  }
  function openAward(id) {
    var a = DQ.awards[id]; if (!a || !(awardEarned(a) || allOpen())) return;
    show('award');
    var nm = personName(), chs = DQ.chapters.filter(function (c) { return c.id >= a.chapters[0] && c.id <= a.chapters[1]; }), n = 0;
    chs.forEach(function (c) { n += c.sequence.filter(function (x) { return S.done[x]; }).length; });
    $('#scr-award').innerHTML = '<div class="award-tools noprint"><button class="btn" id="awBack">Zur Karte</button>' +
      '<label class="fld"><span>Name auf dem ' + esc(a.kind) + '</span><input id="awName" value="' + esc(nm) + '" placeholder="Vorname Nachname"></label>' +
      '<button class="btn primary" id="awPrint">Drucken</button></div>' +
      '<article class="certificate ' + a.id + '">' + medal(a, 130) +
      '<div class="cert-brand">DIGITAL <b>QUEST</b></div><h1>' + esc(a.title) + '</h1>' +
      '<p class="cert-name" id="awNameOut">' + (esc(nm) || '<span class="dim">(Name eintragen)</span>') + '</p>' +
      '<p class="cert-text">' + esc(a.text) + '</p>' +
      '<ul class="cert-list">' + chs.map(function (c) { return '<li><b>' + c.id + '</b> ' + esc(c.title) + '</li>'; }).join('') + '</ul>' +
      '<p class="cert-meta">' + n + ' Stationen geloest · ' + DQ.stages[a.id] + ' · ' + fmtDate(awardDate(a)) + '</p>' +
      '<div class="cert-sign"><span>Datum</span><span>Unterschrift Lehrperson</span></div>' +
      '<p class="cert-id mono">ID ' + esc(S.profile.id.slice(0, 8)) + ' · ' + esc(a.id) + '</p></article>';
    $('#awBack').onclick = function () { renderMap(); show('map'); };
    $('#awPrint').onclick = function () { window.print(); };
    $('#awName').oninput = function () {
      var v = this.value.trim(), sp = v.split(/\s+/);
      S.profile.vorname = sp.shift() || ''; S.profile.nachname = sp.join(' '); save();
      $('#awNameOut').textContent = v;
    };
    log('award_view', { id: a.id });
  }
  function openItem(id) { if (id === 'sandbox') { openTask(sandboxTask()); return; } var it = DQ.byId[id]; if (!it) return; if (it.kind === 'theory') openTheory(it); else openTask(it); }

  /* Freie Werkbank (Sandbox): kein Auftrag, keine Pruefung; alle Bauteile aus bereits freigeschalteten Aufgaben
   * (Palette + Startaufbau), mit ?alle der ganze Bauteilkatalog. Entwurf unter drafts.sandbox. */
  function sandboxTask() {
    var types = {};
    if (allOpen()) Object.keys(E.PARTS).forEach(function (k) { types[k] = true; });
    DQ.tasks.forEach(function (t) {
      if (!unlocked(t.id)) return;
      t.palette.forEach(function (k) { types[k] = true; }); t.start.parts.forEach(function (p) { types[p.type] = true; });
    });
    if (!Object.keys(types).length) types.battery = types.lamp = types.switch = true;
    return { id: 'sandbox', kind: 'task', sandbox: true, ch: 0, title: 'Freie Werkbank', tags: [],
      brief: 'Baue und miss frei – ohne Auftrag und ohne Pruefung. Alle Bauteile, die du bisher freigeschaltet hast, liegen bereit. Dein Aufbau bleibt gespeichert.',
      palette: Object.keys(E.PARTS).filter(function (k) { return types[k]; }), start: { parts: [], wires: [] }, tests: [], measure: [], wrong: [] };
  }

  /* ================= Aufgabe ================= */
  /* Ein Schaltungszustand (core), zwei Darstellungen: Schema (ed) und Werkbank (bench) */
  var core = null, ed = null, bench = null, viewMode = /[?&]werkbank\b/.test(location.search) ? 'bench' : (S.settings.view === 'bench' ? 'bench' : 'schema');
  /* live.trace: Rechenschritte des letzten Arbeitspunkts, live.hist: letzte Zeitschritte (Zeitlupe) */
  var live = { net: null, state: E.newState(), dynamic: false, raf: 0, last: 0, res: null, trace: [], hist: [], replay: null };
  var HIST_MAX = 300;
  var meter = { mode: 'OFF', a: null, b: null, next: 'a' };
  function preferredView() { return /[?&]werkbank\b/.test(location.search) || S.settings.view === 'bench' ? 'bench' : 'schema'; }
  function meterType() { return S.settings.meterType === 'avg' ? 'avg' : 'trms'; }

  function parseVal(str) {
    var m = String(str).trim().replace(',', '.').replace('µ', 'u').match(/^(\d*\.?\d+)\s*([pnumkKM]?)(\d*)\s*[A-Za-zΩ]*$/);
    if (!m) return NaN;
    var mult = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6 }[m[2]] || 1;
    var num = m[3] ? parseFloat(m[1] + '.' + m[3]) : parseFloat(m[1]); // 4k7 = 4.7k
    return num * mult;
  }

  /* task.limit {gates: 2, and: 0 …} als Hinweis im Auftrag */
  function limitText(lim) {
    return '<p class="limit">Erlaubt: ' + Object.keys(lim).map(function (k) {
      var n = lim[k], name = k === 'gates' ? 'Logikgatter' : (E.PARTS[k] ? E.PARTS[k].label : k);
      return n === 0 ? (k === 'gates' ? 'keine ' : 'kein ') + name : 'hoechstens <b>' + n + '</b> ' + name;
    }).join(', ') + '.</p>';
  }

  function openTask(t) {
    show('task');
    current.task = t; current.started = Date.now(); current.hints = 0; current.tries = 0;
    var draft = S.drafts[t.id];
    var layout = draft && draft.layout ? draft.layout : t.start;
    var lockedIds = t.start.parts.map(function (p) { return p.id; });
    closeReplay(true);
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
      bench = new Bench($('#bench'), { core: core, onDial: function (m) { setMeterMode(m); }, onScope: scope });
    }
    setView(t.sandbox ? 'bench' : preferredView(), t.sandbox);
    bench.scope = null;
    ed.showVolt = bench.showVolt = false; $('#btnVolt').classList.remove('on');
    ed.showFlow = bench.showFlow = !!S.settings.flow; $('#btnFlow').classList.toggle('on', ed.showFlow);
    ed.load(layout, lockedIds, t.bench); bench.fit();
    setMeterMode('OFF');
    rebuild(); renderInspector();
    log(t.sandbox ? 'sandbox_open' : 'task_open', { id: t.id });
  }

  function renderTaskPanels(t, draft) {
    var ch = DQ.chapters.filter(function (c) { return c.id === t.ch; })[0];
    if (t.sandbox) {
      $('#taskInfo').innerHTML = '<div class="crumb">Labor · Sandbox</div><h2>' + esc(t.title) + '</h2><div class="brief">' + t.brief + '</div>' +
        '<div class="learn"><b>Ideen</b> Miss die Spannung an einer LED mit verschiedenen Vorwiderstaenden. Vergleiche V~ mit AVG und TRMS an Rechteck und Sinus. Schau dir mit der Zeitlupe an, wie eine Rueckkopplung einrastet.</div>' +
        '<button class="btn" id="toMap">Zur Karte</button>';
      $('#toMap').onclick = function () { renderMap(); show('map'); };
      renderPalette(t); return;
    }
    var h = '<div class="crumb">Kapitel ' + t.ch + ' · Aufgabe ' + t.id + (t.boss ? ' · <b class="boss-tag">BOSS</b>' : '') + '</div>' +
      '<h2>' + esc(t.title) + '</h2>' +
      (t.story ? '<p class="story">' + t.story + '</p>' : '') +
      '<div class="brief">' + t.brief + (t.limit && t.brief.indexOf('class="limit"') < 0 ? limitText(t.limit) : '') + '</div>' +
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
    renderPalette(t);
    void ch;
  }
  function renderPalette(t) {
    var pal = '';
    t.palette.forEach(function (type) {
      pal += '<button class="palbtn" data-add="' + type + '" title="' + esc(E.PARTS[type].label) + ' hinzufuegen"><svg viewBox="-46 -46 92 92"><g>' + Editor.symbol({ type: type, props: {} }) + '</g></svg><span>' + esc(E.PARTS[type].label) + '</span></button>';
    });
    $('#palette').innerHTML = pal || '<span class="dim small">Keine neuen Bauteile – nur messen.</span>';
    $$('[data-add]').forEach(function (b) { b.onclick = function () { view().addPart(b.dataset.add); renderInspector(); }; });
  }

  function answers() { var a = {}; $$('[data-ans]').forEach(function (i) { a[i.dataset.ans] = i.value; }); return a; }
  function persistDraft() {
    if (!current.task || !ed) return;
    S.drafts[current.task.id] = { layout: ed.layout, answers: answers(), t: Date.now() }; save();
  }

  function rebuild() {
    closeReplay(true);
    try { live.net = E.buildNetlist(ed.layout); live.err = null; }
    catch (e) { live.net = null; live.err = e.message; }
    live.dynamic = !!live.net && live.net.parts.some(function (p) { return p.type === 'capacitor' || p.type === 'clock' || p.type === 'acsource'; });
    live.hist = [];
    tick(0, true);
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
  function tick(dt, withTrace) {
    if (live.replay) return; // Zeitlupe zeigt einen festgehaltenen Schritt
    if (!live.net) { setSim(null); status([{ cls: 'err', text: live.err }]); return; }
    var mn = meterNodes(), mm = meter.mode === 'VAC' ? 'V' : meter.mode, mopt = mn && (mm === 'V' || mm === 'A') ? { mode: mm, a: mn.a, b: mn.b } : null;
    if (withTrace) { // Zeitlupe: Arbeitspunkt auf einer Kopie neu suchen – Dioden von vorn (reine Rechenhilfe), Gatter behalten ihr Gedaechtnis
      var ts = E.clone(live.state); ts.diode = {};
      try { live.trace = E.step(live.net, ts, { meter: mopt, trace: true }).trace || []; } catch (e) { live.trace = []; }
    }
    var r = E.step(live.net, live.state, { dt: live.dynamic && dt > 0 ? dt : null, meter: mopt });
    live.res = r;
    if (live.dynamic) { live.hist.push(r); if (live.hist.length > HIST_MAX) live.hist.shift(); }
    updateMeter(r, mn);
    setSim({ res: r, pinNode: live.net.pinNode });
    status(diagnose(r.faults, r));
  }

  function setSim(sim) { ed.setSim(sim); bench.setSim(sim); }
  function view() { return viewMode === 'bench' ? bench : ed; }
  /* Darstellung wechseln – Schaltung, Auswahl und Messspitzen bleiben (gemeinsamer Kern). temp: Wahl nicht speichern (Sandbox) */
  function setView(mode, temp) {
    viewMode = mode === 'bench' ? 'bench' : 'schema';
    if (!temp && S.settings.view !== viewMode) { S.settings.view = viewMode; save(); }
    var b = $('#btnView'); if (b) { b.textContent = viewMode === 'bench' ? '⊞ Schaltplan' : '▣ Werkbank'; b.title = viewMode === 'bench' ? 'Zur Schaltplan-Ansicht wechseln' : 'Zur Werkbank-Ansicht wechseln'; }
    if (!core) return;
    core.space = viewMode; core.wireStart = null;
    $('#board').classList.toggle('off', viewMode !== 'schema'); $('#bench').classList.toggle('off', viewMode !== 'bench');
    view().fit();
  }

  /* ---------- Zeitlupe ----------
   * Statische Schaltung: Rechenschritte des Arbeitspunkts (Dioden schalten, Gatter werden einzeln nachgefuehrt).
   * Schaltung mit Kondensator/Takt/Wechselquelle: die letzten Zeitschritte (Backward Euler). */
  function replaySteps() {
    if (live.dynamic) return live.hist.map(function (r) {
      var caps = live.net.parts.filter(function (p) { return p.type === 'capacitor'; }).map(function (p) { return 'U(' + p.id + ') = ' + E.fmt(r.parts[p.id].v, 'V'); });
      return { res: r, label: 't = ' + E.fmt(r.t, 's') + (caps.length ? ' · ' + caps.join(' · ') : '') };
    });
    var tr = live.trace || [];
    return tr.map(function (x, i) {
      var what = x.kind === 'done' ? 'Ruhelage erreicht – so bleibt die Schaltung.' : x.kind === 'unstable' ? 'Keine Ruhelage – die Gatter schalten sich immer wieder um.' :
        'Knotenspannungen berechnet → ' + x.changed.map(function (c) {
          if (typeof c.to === 'string') return c.id + ' ' + ({ on: 'leitet (aktiver Bereich)', sat: 'geht in Saettigung', off: 'sperrt', f: 'leitet', z: 'bricht durch (Z-Betrieb)' }[c.to] || c.to);
          if (Array.isArray(c.to)) return c.id + ' Ausgaenge ' + c.to.map(function (b) { return b ? 1 : 0; }).join('');
          return x.kind === 'diode' ? c.id + (c.to ? ' wird leitend' : ' sperrt') : c.id + ' schaltet auf ' + (c.to ? '1' : '0');
        }).join(', ');
      return { res: x.res, label: 'Rechenschritt ' + (i + 1) + ' von ' + tr.length + ': ' + what };
    });
  }
  function openReplay() {
    if (!live.net) return;
    var steps = replaySteps();
    if (steps.length < 2) { status([{ cls: 'info', text: 'Zeitlupe: Diese Schaltung ist in einem Rechenschritt fertig. Spannend wird es mit LEDs/Dioden, Logik-Rueckkopplungen, Kondensatoren und Wechselquellen.' }]); return; }
    stopLoop();
    live.replay = { steps: steps, i: steps.length - 1, timer: 0 };
    $('#replay').hidden = false; $('#btnReplay').classList.add('on');
    var sl = $('#rpSlider'); sl.max = steps.length - 1; sl.value = steps.length - 1;
    showStep(live.dynamic ? steps.length - 1 : 0); // Zeitverlauf: beim Jetzt beginnen; Rechenschritte: von vorne
    log('replay', { id: current.task && current.task.id, steps: steps.length, dynamic: live.dynamic });
  }
  function showStep(i) {
    var R = live.replay; if (!R) return;
    R.i = Math.max(0, Math.min(R.steps.length - 1, i));
    $('#rpSlider').value = R.i; $('#rpLabel').textContent = R.steps[R.i].label;
    setSim({ res: R.steps[R.i].res, pinNode: live.net.pinNode });
  }
  function playReplay() {
    var R = live.replay; if (!R) return;
    if (R.timer) { clearInterval(R.timer); R.timer = 0; $('#rpPlay').textContent = '▶'; return; }
    if (R.i >= R.steps.length - 1) showStep(0);
    $('#rpPlay').textContent = '⏸';
    R.timer = setInterval(function () { if (R.i >= R.steps.length - 1) { playReplay(); return; } showStep(R.i + 1); }, live.dynamic ? 60 : 700);
  }
  function closeReplay(quiet) {
    var R = live.replay; if (!R) return;
    if (R.timer) clearInterval(R.timer);
    live.replay = null; $('#replay').hidden = true; $('#btnReplay').classList.remove('on'); $('#rpPlay').textContent = '▶';
    if (!quiet) { tick(0); if (live.dynamic) startLoop(); }
  }

  /* Diagnose aus den Werten des aktuellen Versuchs (Istwert, Grenzwert, Vorschlag) statt festem Text pro Stoerungscode */
  function srcVoltage() { // hoechste Quellenspannung im Aufbau (Gleich- oder Scheitelwert)
    var u = 0; (live.net ? live.net.parts : []).forEach(function (p) { if (p.type === 'battery' || p.type === 'acsource') u = Math.max(u, Math.abs(p.props.value)); }); return u;
  }
  function ohm(r) { return E.fmt(r, 'Ω').replace('.000 ', ' ').replace(/(\.\d*?)0+ /, '$1 ').replace('. ', ' '); }
  var FAULT_TEXT = {
    SHORT: function (f) {
      return 'Kurzschluss an ' + f.part + ': Die Quelle liefert ' + E.fmt(Math.abs(f.i), 'A') + ' (zulaessig ' + E.fmt(f.imax, 'A') + '). Zwischen Plus und Minus liegt kein Verbraucher – ' +
        'der Strom wird nur vom Innenwiderstand begrenzt: I ≈ ' + E.fmt(f.u, 'V') + ' / ' + ohm(f.ri) + '.';
    },
    LED_BURNT: function (f) {
      if (!(f.i > 0)) return 'LED ' + f.part + ' ist durchgebrannt – Strom zu gross. Vorwiderstand pruefen, dann „Reparieren“.';
      var ub = srcVoltage(), t = 'LED ' + f.part + ' ist durchgebrannt: Es flossen ' + E.fmt(f.i, 'A') + ', erlaubt sind ' + E.fmt(f.imax, 'A') + '.';
      if (ub > f.vf) {
        var rNow = Math.max(0, (ub - f.vf) / f.i - 10), rMin = (ub - f.vf) / f.imax, rGood = (ub - f.vf) / 0.02;
        t += ' Bei ' + E.fmt(ub, 'V') + ' und U_F ≈ ' + E.fmt(f.vf, 'V') + ' braucht es mindestens R = (' + E.fmt(ub, 'V') + ' − ' + E.fmt(f.vf, 'V') + ') / ' + E.fmt(f.imax, 'A') + ' = ' + ohm(rMin) +
          ' Vorwiderstand, fuer 20 mA etwa ' + ohm(rGood) + '. Im Kreis waren nur rund ' + ohm(rNow) + '.';
      }
      return t + ' Danach „Reparieren“.';
    },
    LED_REVERSE: function (f) { return 'LED ' + f.part + ' liegt mit ' + E.fmt(Math.abs(f.v), 'V') + ' in Sperrrichtung (verkraftet ca. ' + E.fmt(f.vmax, 'V') + '). Anode (+, langes Bein) gehoert Richtung Pluspol.'; },
    OVERLOAD: function (f) {
      var rMin = f.v * f.v / f.pmax;
      return (live.net && live.net.byId[f.part] ? E.PARTS[live.net.byId[f.part].type].label : 'Bauteil') + ' ' + f.part + ' wird zu heiss: P = U · I = ' + E.fmt(Math.abs(f.v), 'V') + ' · ' + E.fmt(Math.abs(f.i), 'A') + ' = ' + E.fmt(Math.abs(f.p), 'W') +
        ', belastbar ist er mit ' + E.fmt(f.pmax, 'W') + '. Bei dieser Spannung braucht es mindestens ' + ohm(rMin) + ' (P = U² / R).';
    },
    LAMP_BURNT: function (f) { return f.p ? 'Lampe ' + f.part + ' ist durchgebrannt: Sie nahm ' + E.fmt(Math.abs(f.p), 'W') + ' auf bei ' + E.fmt(Math.abs(f.v), 'V') + ' – ausgelegt ist sie fuer ' + E.fmt(f.pnom, 'W') + '. Spannung zu hoch.' : 'Lampe ' + f.part + ' ist durchgebrannt – Ueberspannung.'; },
    AMMETER_OVERLOAD: function (f) { return 'Strommesser ' + f.part + ' misst ' + E.fmt(Math.abs(f.i), 'A') + ' (Grenze ' + E.fmt(f.imax, 'A') + ') – er liegt wohl parallel zur Quelle statt in Reihe.'; },
    UNSTABLE: function () {
      var g = {}; (live.trace || []).forEach(function (x) { if (x.kind === 'gate') x.changed.forEach(function (c) { g[c.id] = true; }); });
      var ids = Object.keys(g);
      return 'Die Logikschaltung kommt nicht zur Ruhe' + (ids.length ? ': ' + ids.join(' und ') + ' schalten sich gegenseitig immer wieder um' : '') + ' (Rueckkopplung ohne Ruhelage). Die Zeitlupe zeigt die einzelnen Schritte.';
    },
    NO_GROUND: function () { return 'Logikbausteine und Taktgeber brauchen eine Masse-Verbindung (⏚).'; },
    OUTPUT_CLASH: function (f) { return 'Ausgang gegen Ausgang: ' + f.parts.join(' und ') + ' treiben denselben Knoten mit unterschiedlichem Pegel (1 gegen 0). Es fliessen rund ' + E.fmt(f.i, 'A') + ' Ausgleichsstrom – die Ausgangsstufen werden heiss und gehen kaputt. Zwei Signale verknuepft man mit einem Gatter (z. B. ODER), nie durch direktes Zusammenschalten.'; }
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
    log('meter_mode', { id: current.task && current.task.id, mode: mode });
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
  /* Wechselgroessen (V~, und V⎓ bei schnellen Wechselquellen = Mittelwert) – nur neu rechnen, wenn sich Aufbau oder Spitzen aendern */
  function acReading() {
    var key = JSON.stringify(ed.layout) + '|' + meter.a + '|' + meter.b;
    if (meter.acKey !== key) { meter.acKey = key; meter.ac = E.acMeasure(ed.layout, { a: meter.a, b: meter.b }); }
    return meter.ac;
  }
  function slowestFreq() {
    var f = Infinity; (live.net ? live.net.parts : []).forEach(function (p) { if ((p.type === 'acsource' || p.type === 'clock') && p.props.freq > 0) f = Math.min(f, p.props.freq); }); return f;
  }
  /* Anzeige wie ein 6000-Digit-DMM (Bereichswahl, +0,2 % Kalibrierfehler, letzte Stelle flackert) */
  function updateMeter(r, mn) {
    var lcd = $('#lcd'), txt = '— — —', warn = '', sub = meter.mode === 'VAC' ? 'AC ' + (meterType() === 'avg' ? 'AVG' : 'TRMS') : meter.mode === 'V' || meter.mode === 'A' ? 'DC' : '';
    if (meter.mode === 'OFF') txt = 'OFF';
    else if (!mn) txt = meter.mode === 'R' ? '0L Ω' : '- - -';
    else if (meter.mode === 'V') {
      var vdc = r.nodeV[mn.a] - r.nodeV[mn.b];
      var fs = slowestFreq(); if (isFinite(fs) && fs >= 5) { var ac1 = acReading(); if (ac1.ok) vdc = ac1.dc; } // DMM zeigt bei schnellem Wechsel den Mittelwert (ohne Wechselquelle: Momentanwert mit Eigenverbrauch)
      txt = E.dmm(vdc, 'V').text;
    } else if (meter.mode === 'VAC') {
      var ac = acReading();
      if (!ac.ok) { txt = 'Err'; warn = ac.error; }
      else { txt = E.dmm(meterType() === 'avg' ? ac.avg : ac.rms, 'V').text; if (ac.static) warn = 'Keine Wechselquelle im Aufbau – V~ zeigt nur den Wechselanteil (hier 0).'; }
    } else if (meter.mode === 'A') {
      if (live.state.fuse) {
        txt = 'FUSE';
        var fi = live.state.fuseInfo;
        warn = 'Sicherung durchgebrannt' + (fi ? ': Durch das Messgeraet waeren ' + E.fmt(Math.abs(fi.i), 'A') + ' geflossen (Sicherung ' + E.fmt(fi.imax, 'A') + ')' : '') + '. Das Amperemeter hat fast 0 Ω – es gehoert in Reihe, nie parallel zu einer Quelle.';
      } else txt = E.dmm((r.nodeV[mn.a] - r.nodeV[mn.b]) / E.METER.rA, 'A').text;
    } else if (meter.mode === 'R') {
      var m = E.measure(ed.layout, { mode: 'R', a: meter.a, b: meter.b }, live.state);
      txt = m.ok ? E.dmm(m.value, 'Ω').text.replace('OL', '0L') : 'Err'; warn = m.ok ? '' : m.error;
    }
    lcd.textContent = txt;
    if (bench) bench.meter = { mode: meter.mode, text: txt, fuse: live.state.fuse, sub: sub };
    $('#mmWarn').textContent = warn; $('#btnFuse').hidden = !live.state.fuse;
    $('#mmProbes').innerHTML = '<span class="pr red">+ ' + esc(meter.a || '–') + '</span><span class="pr black">COM ' + esc(meter.b || '–') + '</span>';
  }

  /* ---------- Eigenschaften ---------- */
  function renderInspector() {
    var el = $('#inspector'); if (!ed) return;
    var p = ed.sel && ed.sel.indexOf('w:') !== 0 ? ed.part(ed.sel) : null;
    if (!p) { el.innerHTML = '<p class="dim small">Bauteil anklicken, um Werte zu aendern. <kbd>R</kbd> dreht, <kbd>Entf</kbd> loescht.</p>'; return; }
    var d = E.PARTS[p.type], q = p.props || (p.props = {}), lock = ed.locked[p.id] && p.type !== 'acsource' && p.type !== 'clock', val = p.value !== undefined ? p.value : (q.value !== undefined ? q.value : d.props.value);
    var r = live.res && live.res.parts[p.id];
    var h = '<div class="insp-head"><b>' + esc(p.id) + '</b> ' + esc(d.label) + (lock ? ' <span class="tag">Aufgabe</span>' : '') + '</div>';
    function field(label, key, v, unit) { return '<label class="fld"><span>' + label + '</span><input data-prop="' + key + '" value="' + esc(v) + '"' + (lock ? ' disabled' : '') + '><em>' + unit + '</em></label>'; }
    if (p.type === 'battery') h += field('Spannung', 'value', Editor.fmtVal(val), 'V');
    if (p.type === 'resistor' || p.type === 'lamp' || p.type === 'pot' || p.type === 'motor') h += field('Widerstand', 'value', Editor.fmtVal(val), 'Ω');
    if (p.type === 'zener') h += field('Z-Spannung', 'vz', q.vz || d.props.vz, 'V');
    if (p.type === 'npn') h += field('Stromverstaerkung β', 'beta', q.beta || d.props.beta, '');
    if (p.type === 'capacitor') h += field('Kapazitaet', 'value', Editor.fmtVal(val), 'F');
    if (p.type === 'clock') h += field('Frequenz', 'freq', q.freq || d.props.freq, 'Hz');
    if (p.type === 'acsource') {
      h += field('Scheitelwert Û', 'value', Editor.fmtVal(val), 'V') + field('Frequenz', 'freq', q.freq || d.props.freq, 'Hz');
      h += '<label class="fld"><span>Gleichanteil</span><input data-prop="offset" value="' + esc(q.offset || 0) + '"' + (lock ? ' disabled' : '') + '><em>V</em></label>';
      h += '<label class="fld"><span>Kurvenform</span><select data-prop="shape"' + (lock ? ' disabled' : '') + '>' + [['sine', 'Sinus'], ['square', 'Rechteck'], ['triangle', 'Dreieck']].map(function (o) {
        return '<option value="' + o[0] + '"' + ((q.shape || 'sine') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    }
    if (p.type === 'pot') h += '<label class="fld"><span>Schleifer</span><input type="range" min="0" max="1" step="0.01" data-prop="pos" value="' + (q.pos !== undefined ? q.pos : 0.5) + '"></label>';
    if (p.type === 'led') {
      h += '<label class="fld"><span>Farbe</span><select data-prop="color"' + (lock ? ' disabled' : '') + '>' + Object.keys(E.LED_COLORS).map(function (c) { return '<option' + ((q.color || 'rot') === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>';
    }
    if (p.type === 'switch') h += '<button class="btn small" id="tgl">' + (q.closed ? 'Oeffnen' : 'Schliessen') + '</button>';
    if (p.type === 'logicin') h += '<button class="btn small" id="tgl">Pegel auf ' + (q.closed ? '0' : '1') + ' schalten</button>';
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
        if (k === 'offset') { var o = parseFloat(String(v).replace(',', '.')); if (!isFinite(o)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); if (ev.type !== 'change') return; q.offset = o; }
        else if (k === 'value' || k === 'freq' || k === 'vz' || k === 'beta') { var n = parseVal(v); if (!(n > 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); if (ev.type !== 'change') return; v = n; if (k === 'value') { p.value = n; delete q.value; } else q[k] = n; }
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
    if (!meter.a) { $('#scopeInfo').textContent = 'Setze zuerst die rote Messspitze (Multimeter V).'; bench.scope = { pts: [], info: 'Zuerst rote Messspitze setzen (V)' }; bench.render(); return; }
    var s;
    try { s = E.simulate(ed.layout, { dt: T / 400, tEnd: T, probes: [{ a: meter.a, b: meter.b || undefined }] }).samples; }
    catch (e) { $('#scopeInfo').textContent = e.message; return; }
    var vs = s.map(function (x) { return x.ch0; }), mx = Math.max.apply(null, vs), mn = Math.min.apply(null, vs);
    var top = Math.max(1, Math.ceil(Math.max(mx, 0) * 1.1)), bot = Math.min(0, Math.floor(mn * 1.1));
    ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2 * (window.devicePixelRatio || 1); ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 6; ctx.beginPath();
    s.forEach(function (x, k) { var px = x.t / T * w, py = h - (x.ch0 - bot) / (top - bot) * h; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke(); ctx.shadowBlur = 0;
    $('#scopeInfo').textContent = 'Kanal: ' + meter.a + ' gegen ' + (meter.b || 'Masse') + ' · ' + bot + '…' + top + ' V · max ' + E.fmt(mx, 'V') + ' · min ' + E.fmt(mn, 'V');
    var stepN = Math.max(1, Math.floor(s.length / 150));
    bench.scope = { pts: s.filter(function (x, k) { return k % stepN === 0; }).map(function (x) { return [x.t / T, (x.ch0 - bot) / (top - bot)]; }),
      info: 'CH1 ' + meter.a + (meter.b ? '–' + meter.b : '') + ' · ' + bot + '…' + top + ' V · ' + $('#tb').selectedOptions[0].textContent };
    bench.render();
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
      var nx = nextOf(t.id), aw = null;
      Object.keys(DQ.awards || {}).forEach(function (k) { if (DQ.awards[k].boss === t.id) aw = DQ.awards[k]; });
      if (aw && first) log('award', { id: aw.id, tags: t.tags });
      modal('<h2 class="win">Geschafft!</h2><p>' + t.take + '</p>' + (first ? '' : '<p class="dim">(bereits geloest)</p>') +
        (aw ? '<div class="award-note">' + medal(aw, 64) + '<p><b>' + esc(aw.title) + '</b><br>Du hast die ' + esc(DQ.stages[aw.id]) + ' abgeschlossen. Dein ' + esc(aw.kind) + ' kannst du anzeigen und drucken.</p></div>' : ''),
        [{ label: 'Zur Karte', action: function () { renderMap(); show('map'); } }]
          .concat(aw ? [{ label: aw.kind + ' anzeigen', primary: !nx, action: function () { openAward(aw.id); } }] : [])
          .concat(nx ? [{ label: 'Weiter', primary: true, action: function () { openItem(nx); } }] : []));
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
      '<section><h3>Dozentenmodus</h3>' + (S.settings.teacher
        ? '<p class="small">Aktiv: Alle Stationen sind offen, auf der Karte gibt es eine Sprungliste, die Freie Werkbank hat alle Bauteile.</p><button class="btn" id="tOff">Dozentenmodus beenden</button>'
        : '<p class="dim small">Fuer Lehrpersonen: schaltet alle Stationen und alle Bauteile frei. Der Fortschritt der Lernenden bleibt unveraendert.</p><label class="fld"><span>Code</span><input id="tCode" type="password" autocomplete="off"></label><button class="btn" id="tOn">Einschalten</button> <span id="tMsg" class="small"></span>') + '</section>' +
      '<section><h3>Spielstand</h3><button class="btn" id="exp">Exportieren</button> <label class="btn">Importieren<input type="file" id="imp" accept=".json" hidden></label> <button class="btn danger" id="rst">Zuruecksetzen</button></section></div>';
    $('#setTheme').value = S.settings.theme;
    if ($('#tOn')) $('#tOn').onclick = $('#tCode').onkeydown = function (ev) {
      if (ev && ev.type === 'keydown' && ev.key !== 'Enter') return;
      if ($('#tCode').value.trim().toLowerCase() !== String(DQ.teacherCode).toLowerCase()) { $('#tMsg').textContent = 'Code falsch.'; $('#tMsg').className = 'small err'; return; }
      S.settings.teacher = true; log('teacher_on', {}); save(); applyMode(); renderSettings();
    };
    if ($('#tOff')) $('#tOff').onclick = function () { S.settings.teacher = false; log('teacher_off', {}); save(); applyMode(); renderSettings(); };
    $('#setTheme').onchange = function () { S.settings.theme = this.value; applyTheme(); save(); };
    [['#pfV', 'vorname'], ['#pfN', 'nachname'], ['#pfP', 'pseudonym']].forEach(function (x) { $(x[0]).oninput = function () { S.profile[x[1]] = this.value; save(); }; });
    $('#exp').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
      a.download = 'digitalquest_spielstand.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('#imp').onchange = function () {
      var f = this.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var d = JSON.parse(rd.result); if (!d.profile || !d.done) throw 0; S = d; save(); applyMode(); renderSettings(); modal('<p>Spielstand geladen.</p>'); } catch (e) { modal('<p>Die Datei ist kein gueltiger Spielstand.</p>'); } };
      rd.readAsText(f);
    };
    $('#rst').onclick = function () {
      modal('<h2>Alles zuruecksetzen?</h2><p>Fortschritt und Entwuerfe werden geloescht. Die Personen-ID bleibt.</p>', [{ label: 'Abbrechen' }, { label: 'Zuruecksetzen', primary: true, action: function () { var id = S.profile; S = fresh(); S.profile = id; save(); applyMode(); renderSettings(); } }]);
    };
  }
  function applyTheme() { document.documentElement.dataset.theme = S.settings.theme; }
  function applyMode() { var t = $('#modeTag'); if (t) t.hidden = !S.settings.teacher; }

  /* ================= Start ================= */
  function init() {
    applyTheme(); applyMode();
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
    $('#btnView').onclick = function () { setView(viewMode === 'bench' ? 'schema' : 'bench'); log('view', { id: current.task && current.task.id, view: viewMode }); };
    setView(viewMode, true);
    $('#btnFlow').onclick = function () { S.settings.flow = !S.settings.flow; save(); if (ed) { ed.showFlow = bench.showFlow = S.settings.flow; core.redraw(); } this.classList.toggle('on', S.settings.flow); log('flow', { on: S.settings.flow }); };
    $('#btnReplay').onclick = function () { if (live.replay) closeReplay(); else openReplay(); };
    $('#rpSlider').oninput = function () { showStep(+this.value); };
    $('#rpPrev').onclick = function () { if (live.replay) showStep(live.replay.i - 1); };
    $('#rpNext').onclick = function () { if (live.replay) showStep(live.replay.i + 1); };
    $('#rpPlay').onclick = playReplay;
    $('#rpClose').onclick = function () { closeReplay(); };
    $$('[data-mt]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mt === meterType());
      b.onclick = function () { S.settings.meterType = b.dataset.mt; save(); $$('[data-mt]').forEach(function (x) { x.classList.toggle('on', x.dataset.mt === meterType()); }); if (ed) tick(0); };
    });
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
      if (live.replay) { if (ev.key === 'ArrowLeft') showStep(live.replay.i - 1); else if (ev.key === 'ArrowRight') showStep(live.replay.i + 1); else if (ev.key === 'Escape') closeReplay(); return; }
      ed && ed.key(ev); renderInspector();
    });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    renderMap(); show('map');
  }

  window.DigitalQuest = { get state() { return S; }, openItem: openItem, get editor() { return ed; }, get bench() { return bench; }, get core() { return core; }, setView: setView, get view() { return viewMode; }, get live() { return live; }, engine: E, parseVal: parseVal, openAward: openAward };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

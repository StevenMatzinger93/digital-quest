/* Digital Quest Studio – Hauptfenster (window.Studio)
 * Schaltplan-Editor (editor.js ueber circuit-ui.js), Bauteilleiste, Eigenschaften, Menues, Werkzeugleiste, Statusleiste und die
 * Bildschleife der Simulation (sim.js). Oszilloskop-Fenster: scope.js, Zeitverlauf: timing.js, Beispiele: examples.js.
 * Kein Konto, kein Server, kein Speicher im Browser: Schaltungen gibt es als Datei (Stufe 8). */
(function (root) {
  'use strict';
  var E = root.DQEngine, Circuit = root.DQCircuit, Editor = root.DQEditor, Sim = root.DQStudioSim;
  var S = root.Studio = { E: E, version: '0.1', scopes: [], hooks: {}, initFns: [] };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Zahlen mit Vorsaetzen: 4k7, 100n, 2,2u, 1M, 1e-6 ---------- */
  function parseSI(str) {
    var s = String(str == null ? '' : str).trim().replace(',', '.').replace(/\s+/g, '');
    var m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(meg|[pnuµmkMGT])?(\d*)(?:ohm|Ω|Hz|[VAFHs])?$/i.exec(s); if (!m) return NaN;
    var P = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12 }, pre = m[2], mul = 1;
    if (pre) { if (/^meg$/i.test(pre)) mul = 1e6; else if (pre === 'M') mul = 1e6; else if (pre === 'm') mul = 1e-3; else mul = P[pre] || P[pre.toLowerCase()]; if (!mul) return NaN; }
    var v = +m[1]; if (m[3]) { if (!pre) return NaN; v = +(m[1].replace(/^[+-]/, '') + '.' + m[3]) * (m[1][0] === '-' ? -1 : 1); }
    return v * mul;
  }
  S.parseSI = parseSI;
  function fmtVal(v) { return Editor.fmtVal(v); }
  function fmtT(t) { // Zeit mit Einheit (ns bis s)
    var a = Math.abs(t); if (!isFinite(t)) return '–';
    if (a === 0) return '0 s'; if (a < 1e-6) return (t * 1e9).toPrecision(3) + ' ns'; if (a < 1e-3) return (t * 1e6).toPrecision(3) + ' µs';
    if (a < 1) return (t * 1e3).toPrecision(3) + ' ms'; return t.toPrecision(4) + ' s';
  }
  S.fmtT = fmtT;

  /* ---------- Bauteilleiste ---------- */
  var PALETTE = [
    { name: 'Logik', items: ['not', 'and', 'or', 'nand', 'nor', 'xor', 'xnor'] },
    { name: 'Flip-Flops', items: ['dff', 'tff', 'jkff', 'rsff', 'jkms'] },
    { name: 'Zähler', items: ['ctr_async', 'ctr_sync', 'ctr_bcd', 'ctr_johnson', 'ctr_mod'] },
    { name: 'Anzeigen', items: ['logicin', 'clock', 'logicled', 'seg7', 'dec7'] },
    { name: 'Analog', items: ['battery', 'acsource', 'ground', 'resistor', 'pot', 'capacitor', 'inductor', 'switch', 'button', 'lamp', 'motor', 'ammeter', 'diode', 'led', 'zener', 'npn'] },
    { name: 'Verbindung', items: ['node'] },
    { name: 'Zeichnen', items: ['draw:text', 'draw:line', 'draw:arrow', 'draw:rect', 'draw:ellipse'] }
  ]; // Gruppen wie das Menü «Beispiele» (examples.js): Logik · Flip-Flops · Zähler · Anzeigen · Analog (· Anwendungen nur als Beispiele)
  S.PALETTE = PALETTE;

  /* ---------- Eigenschaften je Bauteiltyp (Anzeige im Inspektor) ----------
   * k = Schluessel (value = Hauptwert), kind: num | choice | bool | pos */
  var FIELDS = {
    battery: [{ k: 'value', l: 'Spannung', u: 'V' }, { k: 'ri', l: 'Innenwiderstand', u: 'Ω' }],
    acsource: [{ k: 'value', l: 'Scheitelwert Û', u: 'V' }, { k: 'freq', l: 'Frequenz', u: 'Hz' }, { k: 'shape', l: 'Kurvenform', kind: 'choice', o: [['sine', 'Sinus'], ['square', 'Rechteck'], ['triangle', 'Dreieck']] }, { k: 'offset', l: 'Gleichanteil', u: 'V' }, { k: 'ri', l: 'Innenwiderstand', u: 'Ω' }],
    clock: [{ k: 'freq', l: 'Frequenz', u: 'Hz' }],
    resistor: [{ k: 'value', l: 'Widerstand', u: 'Ω' }], lamp: [{ k: 'value', l: 'Widerstand', u: 'Ω' }], motor: [{ k: 'value', l: 'Widerstand', u: 'Ω' }],
    pot: [{ k: 'value', l: 'Gesamtwiderstand', u: 'Ω' }, { k: 'pos', l: 'Schleiferstellung', kind: 'pos' }],
    capacitor: [{ k: 'value', l: 'Kapazität', u: 'F' }], inductor: [{ k: 'value', l: 'Induktivität', u: 'H' }],
    switch: [{ k: 'closed', l: 'Geschlossen', kind: 'bool' }], button: [{ k: 'closed', l: 'Gedrückt', kind: 'bool' }], logicin: [{ k: 'closed', l: 'Pegel 1', kind: 'bool' }],
    led: [{ k: 'color', l: 'Farbe', kind: 'choice', o: [['rot', 'rot'], ['gelb', 'gelb'], ['gruen', 'grün'], ['blau', 'blau'], ['weiss', 'weiss']] }],
    logicled: [{ k: 'color', l: 'Farbe', kind: 'choice', o: [['rot', 'rot'], ['gelb', 'gelb'], ['gruen', 'grün'], ['blau', 'blau']] }],
    diode: [{ k: 'vf', l: 'Durchlassspannung', u: 'V' }], zener: [{ k: 'vz', l: 'Z-Spannung', u: 'V' }, { k: 'vf', l: 'Durchlassspannung', u: 'V' }],
    npn: [{ k: 'beta', l: 'Stromverstärkung β', u: '' }]
  };
  var TRIG = { k: 'trig', l: 'Steuerungsart', kind: 'choice', o: [['pos', 'Flanke steigend ↑'], ['neg', 'Flanke fallend ↓'], ['level', 'Taktzustand (C = 1)']] };
  var TPD = { k: 'tpd', l: 'Laufzeit t_pd', u: 's' };
  ['dff', 'tff', 'jkff', 'rsff'].forEach(function (t) { FIELDS[t] = [TRIG, TPD]; }); FIELDS.jkms = [TPD];
  /* Gatter: Eingangszahl; zu viele Leitungen an wegfallenden Eingaengen werden entfernt */
  function dropDangling() {
    var ok = {}; core.layout.parts.forEach(function (p) { E.pinsOf(p.type, Object.assign({}, E.PARTS[p.type].props, p.props || {})).forEach(function (pin) { ok[p.id + '.' + pin] = 1; }); });
    core.layout.wires = core.layout.wires.filter(function (w) { return ok[w.from] && ok[w.to]; });
  }
  ['and', 'or', 'nand', 'nor', 'xor', 'xnor'].forEach(function (t) { FIELDS[t] = [{ k: 'inputs', l: 'Eingänge', kind: 'choice', num: true, o: [2, 3, 4, 5, 6, 7, 8].map(function (n) { return [n, String(n)]; }), rerender: true, onSet: dropDangling }]; });
  var CTR_TRIG = { k: 'trig', l: 'Taktflanke', kind: 'choice', o: [['pos', 'steigend ↑'], ['neg', 'fallend ↓']] };
  var CTR_DIR = { k: 'dir', l: 'Richtung', kind: 'choice', o: [['up', 'aufwärts'], ['down', 'abwärts']] };
  var CTR_BITS = { k: 'bits', l: 'Bitzahl', kind: 'choice', num: true, o: [2, 3, 4, 5, 6, 7, 8].map(function (n) { return [n, String(n)]; }), rerender: true, onSet: dropDangling };
  FIELDS.ctr_async = [CTR_BITS, CTR_DIR, CTR_TRIG, TPD]; FIELDS.ctr_sync = [CTR_BITS, CTR_DIR, CTR_TRIG, TPD]; FIELDS.ctr_johnson = [CTR_BITS, CTR_TRIG, TPD]; FIELDS.ctr_bcd = [CTR_TRIG, TPD];
  FIELDS.ctr_mod = [{ k: 'modn', l: 'Modulus n', int: [2, 64], rerender: true, onSet: dropDangling }, CTR_TRIG, TPD];
  S.FIELDS = FIELDS;
  var CHOICE_LABEL = { sine: 'Sinus', square: 'Rechteck', triangle: 'Dreieck' };

  function getProp(p, k) {
    var d = E.PARTS[p.type].props;
    if (k === 'value') return p.value !== undefined ? p.value : (p.props && p.props.value !== undefined ? p.props.value : d.value);
    return p.props && p.props[k] !== undefined ? p.props[k] : d[k];
  }
  function setProp(p, k, v) {
    if (k === 'value') { p.value = v; if (p.props) delete p.props.value; } else { p.props = p.props || {}; p.props[k] = v; }
  }
  S.getProp = getProp; S.setProp = setProp;

  /* ---------- Aufbau ---------- */
  var ed, core, sim, svg, rafId = 0, selId = null, lastDraw = 0, lastVersion = -1, lastInsVersion = -1, measureTool = false;
  S.digitalNodes = {}; S.logicColors = true;

  function init() {
    Editor.extra.nodes = true; // Leitung auf Leitung: Knotenpunkte (im Spiel nicht)
    Editor.extra.async = true; // Flipflops mit preSet/preClear zeichnen (im Spiel nicht)
    Circuit.SPACES.schema.w = 2400; Circuit.SPACES.schema.h = 1500; // grosse Zeichenflaeche (Spiel: 1000 × 620)
    svg = $('#board');
    ed = S.ed = new Editor(svg, {
      faultOf: function (id) { return S.faultTag(id); }, onChange: onChange, onSelect: onSelect, onProbe: onProbe, onDouble: function (p) { return !!(E.PARTS[p.type].ctr && S.expandCounter && S.expandCounter(p)); }, onMessage: function (m) { flash(m); },
      wireColor: wireColor
    });
    core = S.core = ed.core; core.tool = 'wire';
    ed.showVolt = false;
    sim = S.sim = new Sim({ getLayout: function () { return core.layout; } });
    buildPalette(); buildMenus(); buildToolbar(); bindCanvas(); bindKeys();
    $('#inspector').addEventListener('click', function (ev) { var b = ev.target.closest('[data-send]'), p = selId && core.part(selId); if (!b || !p || !S.sendSignal) return; var k = b.dataset.send; S.sendSignal(k === 'v' || k === 'i' ? 'scope' : 'timing', k === 'v' || k === 'i' ? { part: p, q: k } : { part: p, cnt: k === 'cnt' }); });
    ed.load({ parts: [], wires: [] }, [], null);
    sim.refresh(true); sim.reset();
    renderInspector(); renderStatus();
    if (S.initScopes) S.initScopes();
    if (S.initTiming) S.initTiming();
    if (S.initExamples) S.initExamples();
    S.initFns.forEach(function (f) { f(); });
    var loop = function (now) { rafId = requestAnimationFrame(loop); sim.frame(now); if (sim.version !== lastVersion) { lastVersion = sim.version; draw(now); } if (S.frame) S.frame(now); };
    rafId = requestAnimationFrame(loop);
  }

  /* Neuzeichnen des Schaltplans mit dem Simulationsergebnis; hoechstens 30 Bilder/s */
  function draw(now, force) {
    if (!force && now - lastDraw < 30) { lastVersion = -1; return; }
    lastDraw = now;
    var sig = visSig();
    if (force || sig !== lastSig) { lastSig = sig; if (sim.res && sim.net) ed.setSim({ res: sim.res, pinNode: sim.net.pinNode, ref: null }); else ed.setSim(null); }
    renderStatus(); renderLive();
  }
  var lastSig = '';
  /* Was der Schaltplan zeigt (Leuchten, Pegel, Segmente, Schaeden, Spannungsbeschriftung) – nur bei Aenderung neu zeichnen, das Bild bleibt ruhig und klickbar */
  function visSig() {
    var r = sim.res; if (!r) return 'none';
    var a = [sim.err || '', r.faults.map(function (f) { return f.code + (f.part || ''); }).join(), ed.showVolt ? 1 : 0];
    Object.keys(r.parts).forEach(function (id) {
      var q = r.parts[id]; a.push(q.on ? 1 : 0, q.out === undefined ? '' : Array.isArray(q.out) ? q.out.join('') : q.out ? 1 : 0, q.q ? 1 : 0, q.high ? 1 : 0, q.burnt ? 1 : 0,
        q.brightness ? Math.round(q.brightness * 12) : 0, q.seg ? q.seg.map(Number).join('') : '', q.p !== undefined && /lamp|motor/.test(id) ? Math.round(Math.min(1, Math.abs(q.p)) * 8) : '');
    });
    if (ed.showVolt || S.logicColors) Object.keys(r.nodeV).forEach(function (n) { a.push(ed.showVolt ? Math.round(r.nodeV[n] * 100) : (r.nodeV[n] > E.LOGIC.vth ? 1 : 0)); });
    return a.join('|');
  }
  S.redraw = function () { draw(performance.now(), true); };

  /* Leitungsfarbe: Logikleitungen gruen bei 1 (nur mit U-Werte-Schalter aus; Spannungsfarbe dann aus) */
  function wireColor(pid, res, pinNode) {
    if (!S.logicColors || !res || !pinNode) return undefined;
    var n = pinNode[pid]; if (n === undefined || !S.digitalNodes[n]) return undefined;
    return (res.nodeV[n] || 0) > E.LOGIC.vth ? '#22b573' : '#5b8196';
  }

  function onChange(kind) {
    if (S.onEdit) S.onEdit(kind);
    if (kind === 'move' || kind === 'rotate' || kind === 'draw') { return; }
    sim.refresh(kind === 'add' || kind === 'delete' || kind === 'wire' || kind === 'undo');
    findDigitalNodes();
    if (kind === 'add' || kind === 'delete' || kind === 'wire') { if (S.onStructure) S.onStructure(); }
    if (kind === 'delete' || kind === 'undo') selId = null;
    if (S.onCircuitChange) S.onCircuitChange();
    if (kind !== 'edit') renderInspector(true);
    S.redraw();
  }
  function findDigitalNodes() {
    S.digitalNodes = {}; if (!sim.net) return;
    sim.net.parts.forEach(function (p) {
      var d = E.PARTS[p.type]; if (!(d.logic || d.digital || d.ff || d.ctr || p.type === 'clock')) return;
      Object.keys(p.n).forEach(function (pin) { S.digitalNodes[p.n[pin]] = true; });
    });
  }
  function onSelect(p) { if (S.onSelectHook) S.onSelectHook(p); selId = p ? p.id : null; renderInspector(true); if (p && measureTool && S.measurePart) S.measurePart(p); }
  function onProbe(pin) { if (S.measurePin) S.measurePin(pin); }

  /* ---------- Bauteilleiste ---------- */
  function buildPalette() {
    var h = '';
    PALETTE.forEach(function (g, gi) {
      h += '<details' + (gi < 4 || g.items.length ? ' open' : '') + '><summary>' + esc(g.name) + '</summary>';
      if (!g.items.length) h += '<div class="pempty">Kommt in einer späteren Stufe.</div>';
      else h += '<div class="plist">' + g.items.map(function (t) { var d = E.PARTS[t] || { label: (S.DRAW_ITEMS.filter(function (x) { return x[0] === t; })[0] || [0, t])[1] }; return '<button class="pitem" draggable="true" data-add="' + t + '" title="' + esc(d.label) + ' – anklicken oder auf die Zeichenfläche ziehen">' + (E.PARTS[t] ? Editor.icon(t) : S.drawIcon(t)) + '<span class="nm">' + esc(d.label) + '</span></button>'; }).join('') + '</div>';
      h += '</details>';
    });
    $('#palette').innerHTML = h;
    $('#palette').addEventListener('click', function (ev) { var b = ev.target.closest('[data-add]'); if (b) S.addPart(b.dataset.add); });
    $('#palette').addEventListener('dragstart', function (ev) { var b = ev.target.closest('[data-add]'); if (!b) return; ev.dataTransfer.setData('text/plain', b.dataset.add); ev.dataTransfer.effectAllowed = 'copy'; });
  }
  /* Palette neu aufbauen (nach Erweiterungen durch spaetere Module) */
  S.rebuildPalette = buildPalette;
  S.addPart = function (type, x, y) {
    var p;
    if (/^draw:/.test(type)) return S.drawAdd(type.slice(5), x, y); // Zeichenelement
    if (x === undefined) p = ed.addPart(type); else p = core.addPart(type, x, y, 'schema');
    return p;
  };

  function bindCanvas() {
    svg.addEventListener('dragover', function (ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
    svg.addEventListener('drop', function (ev) {
      ev.preventDefault(); var t = ev.dataTransfer.getData('text/plain'); if (!t || !(E.PARTS[t] || /^draw:/.test(t))) return;
      var xy = ed._pt(ev); S.addPart(t, xy[0], xy[1]);
    });
  }
  function inField(el) { return el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== 'range' && el.type !== 'checkbox'; }
  function bindKeys() {
    document.addEventListener('keydown', function (ev) {
      if (inField(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === ' ' && !ev.target.closest('button,summary')) { ev.preventDefault(); S.toggleRun(); return; }
      if (ev.key === 'F9') { ev.preventDefault(); S.setBeamer(!S.beamer); return; }
      if (ev.key === 'Escape') { closeMenus(); closeModal(); }
      core.key(ev);
    });
  }

  /* ---------- Menues ---------- */
  var MENUS = [];
  function buildMenus() {
    MENUS = [
      { id: 'datei', label: 'Datei', items: [{ label: 'Neu', act: function () { S.newCircuit(); } }, { sep: 1 }, { label: 'Schaltung einpassen', act: function () { ed.fit(); } }] },
      { id: 'bsp', label: 'Beispiele', items: [] },
      { id: 'bearb', label: 'Bearbeiten', items: [{ label: 'Rückgängig', key: 'Strg+Z', act: function () { S.undo(); } }, { label: 'Wiederholen', key: 'Strg+Y', act: function () { S.redo(); } }, { sep: 1 }, { label: 'Drehen', key: 'R', act: function () { core.rotateSelected('schema'); S.redraw(); } }, { label: 'Löschen', key: 'Entf', act: function () { core.removeSelected(); } }, { label: 'Auswahl aufheben', key: 'Esc', act: function () { core.cancel(); } }] },
      { id: 'sim', label: 'Simulation', items: [{ label: 'Start / Pause', key: 'Leertaste', act: function () { S.toggleRun(); } }, { label: 'Einzelschritt', act: function () { S.stepOnce(); } }, { label: 'Zurücksetzen', act: function () { S.resetSim(); } }] },
      { id: 'ansicht', label: 'Ansicht', items: [{ label: 'Beamer-Modus', key: 'F9', act: function () { S.setBeamer(!S.beamer); } }, { label: 'Schaltung einpassen', act: function () { ed.fit(); } }, { label: 'U-Werte ein/aus', act: function () { $('#btnVolt').click(); } }] },
      { id: 'fenster', label: 'Fenster', items: [{ label: 'Neues Oszilloskop', act: function () { if (S.openScope) S.openScope(); } }, { label: 'Neues Bode-Diagramm', act: function () { if (S.openBode) S.openBode(); } }, { label: 'Logik: Ausdruck, Tabelle, KV', act: function () { if (S.openLogic) S.openLogic(); } }, { label: 'Zeitverlauf ein/aus', act: function () { S.toggleTiming && S.toggleTiming(); } }] },
      { id: 'hilfe', label: 'Hilfe', items: [{ label: 'Kurzanleitung', act: function () { help(); } }, { label: 'Tastenkürzel', act: function () { openModal('<h2>Tastenkürzel</h2><table class="itab" style="font-family:var(--font-ui);font-size:14px">' + S.shortcuts.map(function (r) { return '<tr><td style="text-align:left"><kbd>' + esc(r[0]) + '</kbd></td><td style="text-align:left">' + esc(r[1]) + '</td></tr>'; }).join('') + '</table><p><button class="tb" id="mClose">Schliessen</button></p>'); } }] }
    ];
    var bar = $('#menubar'), sp = $('.spacer', bar), h = '';
    MENUS.forEach(function (m) { var el = document.createElement('div'); el.className = 'menu'; el.id = 'menu-' + m.id; el.innerHTML = '<button aria-haspopup="true" aria-expanded="false">' + esc(m.label) + '</button><div class="drop" role="menu"></div>'; bar.insertBefore(el, sp); m.el = el; fillMenu(m); });
    bar.addEventListener('click', function (ev) {
      var b = ev.target.closest('.menu > button'), it = ev.target.closest('.drop button');
      if (it) { var m = MENUS.filter(function (x) { return x.el.contains(it); })[0], i = +it.dataset.i, item = m.items[i]; closeMenus(); if (item && item.act) item.act(); return; }
      if (b) { var wrap = b.parentNode, was = wrap.classList.contains('open'); closeMenus(); if (!was) { wrap.classList.add('open'); b.setAttribute('aria-expanded', 'true'); } }
    });
    document.addEventListener('click', function (ev) { if (!ev.target.closest('.menu')) closeMenus(); });
  }
  function fillMenu(m) {
    m.el.querySelector('.drop').innerHTML = m.items.map(function (it, i) { return it.sep ? '<hr>' : it.head ? '<span class="ex-head">' + esc(it.head) + '</span>' : it.info ? '<span class="ex-text">' + esc(it.info) + '</span>' : '<button role="menuitem" data-i="' + i + '">' + esc(it.label) + (it.key ? '<small>' + esc(it.key) + '</small>' : '') + '</button>'; }).join('');
  }
  function closeMenus() { $$('.menu.open').forEach(function (m) { m.classList.remove('open'); $('button', m).setAttribute('aria-expanded', 'false'); }); }
  S.setMenu = function (id, items) { var m = MENUS.filter(function (x) { return x.id === id; })[0]; if (m) { m.items = items; fillMenu(m); } };
  function help() {
    openModal('<h2>Kurzanleitung</h2><ul><li><b>Bauen:</b> Bauteil links anklicken oder auf die Zeichenfläche ziehen. Zwei Anschlüsse nacheinander anklicken = Leitung. <b>Leitung auf Leitung:</b> mit einer Leitung im Entstehen auf eine bestehende Leitung klicken, oder von einer Leitung wegziehen – dort entsteht ein Knotenpunkt (Punkt = verbunden, Kreuzung ohne Punkt = nicht verbunden).</li>' +
      '<li><b>Bearbeiten:</b> Bauteil anklicken, rechts Werte ändern (<kbd>4k7</kbd>, <kbd>100n</kbd> und <kbd>2,2u</kbd> gehen). <kbd>R</kbd> dreht, <kbd>Entf</kbd> löscht.</li>' +
      '<li><b>Simulation:</b> <kbd>Leertaste</kbd> startet und hält an, <b>Schritt</b> rechnet einen Schritt. Der Zeitfaktor bestimmt, wie schnell die Simulationszeit läuft.</li>' +
      '<li><b>Messen:</b> Werkzeug «Messen» wählen, dann Anschluss oder Bauteil anklicken – das Signal erscheint im Oszilloskop.</li>' +
      '<li><b>Zoom:</b> <kbd>Strg</kbd> + Mausrad oder zwei Finger; Ziehen auf leerer Fläche verschiebt, Doppelklick passt ein.</li></ul><p><button class="tb" id="mClose">Schliessen</button></p>');
  }
  function openModal(html) { $('#modal').innerHTML = html; $('#modalBg').classList.add('open'); var c = $('#mClose'); if (c) { c.onclick = closeModal; c.focus(); } }
  function closeModal() { $('#modalBg').classList.remove('open'); }
  S.openModal = openModal; S.closeModal = closeModal;
  $('#modalBg') && $('#modalBg').addEventListener('click', function (ev) { if (ev.target.id === 'modalBg') closeModal(); });

  /* ---------- Werkzeugleiste ---------- */
  var FACTORS = [['auto', 'Zeit: Auto'], [1e-4, 'Zeitlupe 1/10 000 ×'], [1e-3, 'Zeitlupe 1/1000 ×'], [0.01, 'Zeitlupe 1/100 ×'], [0.1, 'Zeitlupe 1/10 ×'], [1, 'Echtzeit 1 ×'], [10, 'Zeitraffer 10 ×'], [100, 'Zeitraffer 100 ×'], [1000, 'Zeitraffer 1000 ×']];
  function buildToolbar() {
    $('#selFactor').innerHTML = FACTORS.map(function (f) { return '<option value="' + f[0] + '">' + f[1] + '</option>'; }).join('');
    $('#selFactor').addEventListener('change', function () { S.setFactor(this.value); });
    $('#btnRun').addEventListener('click', function () { S.toggleRun(); });
    $('#btnStep').addEventListener('click', function () { S.stepOnce(); });
    $('#btnReset').addEventListener('click', function () { S.resetSim(); });
    $('#toolBuild').addEventListener('click', function () { S.setTool('build'); });
    $('#toolMeasure').addEventListener('click', function () { S.setTool('measure'); });
    $('#btnUndo').addEventListener('click', function () { S.undo(); }); $('#btnRedo').addEventListener('click', function () { S.redo(); });
    $('#btnRot').addEventListener('click', function () { core.rotateSelected('schema'); S.redraw(); });
    $('#btnDel').addEventListener('click', function () { core.removeSelected(); });
    $('#btnBeamer').addEventListener('click', function () { S.setBeamer(!S.beamer); });
    $('#btnFit').addEventListener('click', function () { ed.fit(); });
    $('#btnVolt').addEventListener('click', function () { ed.showVolt = !ed.showVolt; this.classList.toggle('on', ed.showVolt); this.setAttribute('aria-pressed', ed.showVolt); S.redraw(); });
    $('#btnScope').addEventListener('click', function () { if (S.openScope) S.openScope(); });
    $('#btnTiming').addEventListener('click', function () { if (S.toggleTiming) S.toggleTiming(); });
    $('#clockHz').addEventListener('change', function () {
      var f = parseSI(this.value); if (!(f > 0)) { this.classList.add('bad'); return; } this.classList.remove('bad');
      core.layout.parts.forEach(function (p) { if (p.type === 'clock') setProp(p, 'freq', f); });
      sim.refresh(false); renderInspector(true); S.redraw();
    });
    $('#clockHz').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') this.dispatchEvent(new Event('change')); });
  }
  S.setTool = function (t) {
    measureTool = t === 'measure'; core.tool = measureTool ? 'probe' : 'wire'; core.wireStart = null;
    $('#toolBuild').classList.toggle('on', !measureTool); $('#toolMeasure').classList.toggle('on', measureTool); $('#measureKind').hidden = !measureTool; $('#measureTarget').hidden = !measureTool;
    svg.style.cursor = measureTool ? 'crosshair' : ''; ed.render();
  };
  S.measureKind = function () { return $('#measureKind').value; };
  S.toggleRun = function () { if (sim.running) sim.pause(); else sim.start(); syncRun(); };
  function syncRun() { var b = $('#btnRun'); b.textContent = sim.running ? '⏸ Pause' : '▶ Start'; b.classList.toggle('is-running', sim.running); renderStatus(); }
  S.syncRun = syncRun;
  S.stepOnce = function () { sim.pause(); syncRun(); sim.step(1); S.redraw(); };
  S.resetSim = function () { sim.reset(); if (S.onReset) S.onReset(); S.redraw(); };
  S.setFactor = function (f) { sim.setFactor(f); $('#selFactor').value = String(f); S.redraw(); };
  S.newCircuit = function () {
    S.loadLayout({ parts: [], wires: [] });
  };
  /* Schaltung laden: ersetzt alles, Simulation von vorn */
  S.loadLayout = function (layout, opts) {
    opts = opts || {};
    sim.pause(); selId = null;
    ed.load(layout, [], null); sim.clearTraces();
    sim.refresh(true); findDigitalNodes(); sim.reset();
    if (S.onLoad) S.onLoad(opts);
    if (S.onEdit) S.onEdit('load');
    ed.fit(); renderInspector(true);
    if (opts.run !== false) sim.start(); syncRun(); S.redraw();
  };

  /* ---------- Eigenschaften ---------- */
  function renderInspector(force) {
    var el = $('#inspector'), p = selId && core.part(selId), dsel = core.sel && String(core.sel).indexOf('d:') === 0 && S.drawInspector;
    if (dsel) { var dh = S.drawInspector(core.sel.slice(2)); if (dh) { var keep = document.activeElement && el.contains(document.activeElement) && !force; if (!keep) { el.innerHTML = dh; S.bindDrawInspector(el, core.sel.slice(2)); } return; } }
    if (!p) {
      var wsel = core.sel && String(core.sel).indexOf('w:') === 0;
      el.innerHTML = '<h2>' + (wsel ? 'Leitung' : 'Simulation') + '</h2>' + (wsel ? '<p class="sub">Entf löscht die Leitung.</p>' :
        '<p class="sub">Nichts gewählt. Bauteil anklicken, um Werte zu ändern.</p><h3>Rechenschritt</h3>' +
        '<div class="field"><label for="dtIn">Schrittweite Δt</label><span><input id="dtIn" type="text" class="mono" value="' + (sim.dtAuto ? 'auto' : esc(fmtVal(sim.dtManual))) + '"><span class="unit">s</span></span></div>' +
        '<p class="hint">«auto» wählt Δt aus Frequenzen und Zeitkonstanten. Kleiner = genauer, aber langsamer.</p><dl class="live" id="insSim"></dl>');
      var di = $('#dtIn'); if (di) di.addEventListener('change', function () {
        var v = this.value.trim().toLowerCase(); if (v === 'auto' || v === '') sim.setDt('auto'); else { var x = parseSI(v); if (!(x > 0)) { this.classList.add('bad'); return; } sim.setDt(x); } this.classList.remove('bad'); S.redraw(); renderInspector(true);
      });
      renderLive(); return;
    }
    var d = E.PARTS[p.type], fs = FIELDS[p.type] || [], extra = S.extraFields ? S.extraFields(p) : [];
    var h = '<div class="ins-icon">' + Editor.icon(p.type, p.props) + '</div><h2>' + esc(p.id) + '</h2><p class="sub">' + esc(d.label) + '</p><div style="clear:both"></div>';
    fs.concat(extra).forEach(function (f) { h += fieldHTML(p, f); });
    if (S.inspectorExtra) h += S.inspectorExtra(p);
    h += '<h3>Messwerte jetzt</h3><dl class="live" id="insLive"></dl>';
    h += '<p class="hint">Löschen mit Entf, drehen mit R.</p>';
    el.innerHTML = h;
    $$('[data-f]', el).forEach(function (i) { i.addEventListener(i.type === 'range' || i.tagName === 'SELECT' || i.type === 'checkbox' ? 'input' : 'change', function () { applyField(p, i); }); });
    renderLive();
  }
  function fieldHTML(p, f) {
    var v = getProp(p, f.k), id = 'f_' + f.k;
    if (S.isHidden && S.isHidden(p.id, f.k)) return '<div class="field"><label for="' + id + '">' + esc(f.l) + '</label><span><input id="' + id + '" type="text" disabled value="verborgen"></span></div>';
    if (f.kind === 'bool') return '<div class="field"><label for="' + id + '">' + esc(f.l) + '</label><input id="' + id + '" data-f="' + f.k + '" type="checkbox"' + (v ? ' checked' : '') + ' style="width:28px;height:28px"></div>';
    if (f.kind === 'choice') return '<div class="field"><label for="' + id + '">' + esc(f.l) + '</label><select id="' + id + '" data-f="' + f.k + '">' + f.o.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    if (f.kind === 'pos') return '<div class="field wide"><label for="' + id + '">' + esc(f.l) + ': <span class="mono" id="posv">' + Math.round(v * 100) + ' %</span></label><input id="' + id + '" data-f="' + f.k + '" type="range" min="0" max="1" step="0.01" value="' + v + '"></div>';
    return '<div class="field"><label for="' + id + '">' + esc(f.l) + '</label><span><input id="' + id + '" data-f="' + f.k + '" type="text" inputmode="decimal" value="' + esc(fmtVal(v)) + '"><span class="unit">' + esc(f.u || '') + '</span></span></div>';
  }
  function applyField(p, i) {
    var k = i.dataset.f, f = (FIELDS[p.type] || []).concat(S.extraFields ? S.extraFields(p) : []).filter(function (x) { return x.k === k; })[0]; if (!f) return;
    if (f.kind === 'bool') { setProp(p, k, i.checked); }
    else if (f.kind === 'choice') { setProp(p, k, f.num ? +i.value : i.value); if (f.onSet) f.onSet(p); }
    else if (f.kind === 'pos') { setProp(p, k, +i.value); var pv = $('#posv'); if (pv) pv.textContent = Math.round(+i.value * 100) + ' %'; }
    else { var v = parseSI(i.value); if (!isFinite(v) || (k !== 'offset' && v < 0) || ((k === 'ri' || k === 'freq') && v <= 0)) { i.classList.add('bad'); return; } i.classList.remove('bad'); if (f.int) v = Math.max(f.int[0], Math.min(f.int[1], Math.round(v))); setProp(p, k, v); i.value = fmtVal(v); if (f.onSet) f.onSet(p); }
    onChange('edit'); if (f.rerender) renderInspector(true);
  }
  S.applyField = applyField;

  /* Messwerte des gewaehlten Bauteils und Simulationsdaten – laufend aktualisiert, ohne die Eingabefelder anzufassen */
  function renderLive() {
    var el = $('#insLive'), r = sim.res, p = selId && core.part(selId);
    if (el && p && r && r.parts[p.id]) {
      var q = r.parts[p.id], rows = [];
      function row(k, v, send, name) { rows.push({ k: k, v: v, send: send, name: name }); }
      if (q.v !== undefined) row('Spannung', E.fmt(q.v, 'V'), 'v', 'Spannung über ' + p.id);
      if (q.i !== undefined) row('Strom', E.fmt(q.i, 'A'), 'i', 'Strom durch ' + p.id);
      if (q.p !== undefined && Math.abs(q.p) > 1e-12) row('Leistung', E.fmt(q.p, 'W'));
      if (q.on !== undefined) row('Zustand', q.on ? '<span class="bigon">an</span>' : '<span class="bigoff">aus</span>', p.type === 'logicled' ? 'dig' : null, 'Pegel von ' + p.id);
      if (q.out !== undefined && !Array.isArray(q.out)) row('Ausgang', q.out ? '<span class="bigon">1</span>' : '0', 'dig', 'Ausgang von ' + p.id);
      if (q.q !== undefined) row('Q', q.q ? '<span class="bigon">1</span>' : '0', 'dig', 'Ausgang Q von ' + p.id);
      if (q.count !== undefined) row('Zählerstand', q.count, 'cnt', 'Zählerstand von ' + p.id);
      if (q.state !== undefined && typeof q.state === 'string') row('Bereich', q.state);
      // Zeilen nur neu bauen, wenn sich die Art der Zeilen ändert – die Knöpfe bleiben beim Klicken stehen
      var sig = p.id + '|' + rows.map(function (x) { return x.k + (x.send || ''); }).join();
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.innerHTML = rows.map(function (x, i) { return '<dt>' + x.k + (x.send ? ' <button class="sendbtn" data-send="' + x.send + '" aria-label="' + esc(x.name) + ' anzeigen" title="' + esc(x.name) + ' in die passende Anzeige schicken">⤴</button>' : '') + '</dt><dd data-r="' + i + '"></dd>'; }).join('') || '<dt>–</dt><dd></dd>';
      }
      rows.forEach(function (x, i) { var dd = el.querySelector('dd[data-r="' + i + '"]'); if (dd && dd.innerHTML !== String(x.v)) dd.innerHTML = x.v; });
    }
    var ss = $('#insSim');
    if (ss) ss.innerHTML = '<dt>Zeit t</dt><dd>' + fmtT(sim.state.t) + '</dd><dt>Δt</dt><dd>' + fmtT(sim.dt) + '</dd><dt>Schritte</dt><dd>' + sim.steps + '</dd><dt>Zeitfaktor</dt><dd>' + fmtFactor(sim.effFactor()) + '</dd>';
    if (S.liveInspector) S.liveInspector(p, r);
  }
  function fmtFactor(f) { return f >= 1 ? (+f.toPrecision(3)) + ' ×' : '1/' + Math.round(1 / f) + ' ×'; }

  /* ---------- Statusleiste ---------- */
  /* Meldungen: kurz (Statusleiste), lang (Eigenschaften: was passiert ist und warum), Marke am Bauteil */
  var U = function (v) { return E.fmt(Math.abs(v), 'V'); }, A = function (v) { return E.fmt(Math.abs(v), 'A'); }, Wt = function (v) { return E.fmt(Math.abs(v), 'W'); };
  var FAULT = {
    SHORT: { tag: 'Kurzschluss', s: function (f) { return 'Kurzschluss an ' + f.part + ': ' + A(f.i) + ' (Grenze ' + A(f.imax) + ')'; },
      l: function (f) { return 'Kurzschluss: ' + f.part + ' liefert ' + A(f.i) + ', erlaubt sind ' + A(f.imax) + '. Die Quelle (' + U(f.u) + ', Innenwiderstand ' + E.fmt(f.ri, 'Ω') + ') hängt praktisch ohne Last an sich selbst – nur ihr Innenwiderstand begrenzt den Strom. Einen Widerstand oder eine Last einbauen.'; } },
    OVERLOAD: { tag: 'überlastet', s: function (f) { return f.part + ' überlastet: ' + Wt(f.p) + ' (Grenze ' + Wt(f.pmax) + ')'; },
      l: function (f) { return f.part + ' wird zu heiss: ' + U(f.v) + ' · ' + A(f.i) + ' = ' + Wt(f.p) + ', zulässig sind ' + Wt(f.pmax) + '. In der Wirklichkeit würde das Bauteil verbrennen. Grösseren Widerstand wählen, die Spannung senken oder ein Leistungsbauteil nehmen.'; } },
    LED_BURNT: { tag: 'durchgebrannt', s: function (f) { return f.part + ' durchgebrannt: ' + A(f.i) + ' statt höchstens ' + A(f.imax); },
      l: function (f) { return f.part + ' ist durchgebrannt: Es flossen ' + A(f.i) + ' bei ' + U(f.v) + ', erlaubt sind ' + A(f.imax) + '. Eine LED begrenzt den Strom nicht selbst – es fehlt ein Vorwiderstand oder er ist zu klein. «Zurück» (Simulation zurücksetzen) macht sie wieder heil.'; } },
    LAMP_BURNT: { tag: 'durchgebrannt', s: function (f) { return f.part + ' durchgebrannt: ' + Wt(f.p) + ' bei ' + U(f.v) + ' (Nennleistung ' + Wt(f.pnom) + ')'; },
      l: function (f) { return f.part + ' ist durchgebrannt: Sie bekam ' + U(f.v) + ' und setzte ' + Wt(f.p) + ' um. Ausgelegt ist sie für ' + Wt(f.pnom) + '; ab dem ' + E.LIMITS.lampBurn + '-fachen (' + Wt(f.pnom * E.LIMITS.lampBurn) + ') schmilzt die Glühwendel. Spannung senken oder eine Lampe für höhere Spannung nehmen. «Zurück» macht sie wieder heil.'; } },
    LED_REVERSE: { tag: 'Sperrspannung', s: function (f) { return f.part + ': Sperrspannung ' + U(f.v) + ' (ab ' + U(f.vmax) + ' gefährlich)'; },
      l: function (f) { return f.part + ' liegt in Sperrrichtung an ' + U(f.v) + '. Eine LED leitet nur von der Anode zur Kathode, deshalb leuchtet sie nicht; ab etwa ' + U(f.vmax) + ' in Sperrrichtung würde sie in der Wirklichkeit zerstört. Anschlüsse vertauscht?'; } },
    AMMETER_OVERLOAD: { tag: 'Sicherung', s: function (f) { return f.part + ': Strom über ' + A(f.imax); }, l: function (f) { return f.part + ' misst über ' + A(f.imax) + ': Ein Strommesser gehört in Reihe in den Stromkreis, nie parallel zu einer Quelle; die Sicherung würde auslösen.'; } },
    UNSTABLE: { tag: 'instabil', s: function () { return 'Kein stabiler Zustand (Rückkopplung ohne Ruhelage)'; }, l: function () { return 'Die Schaltung findet keinen stabilen Zustand, weil eine Rückkopplung kein Gleichgewicht hat (z. B. ein NICHT-Glied auf sich selbst). Sie schwingt.'; } },
    NO_GROUND: { s: function () { return 'Kein Bezugspunkt: Masse-Symbol setzen'; }, l: function () { return 'Kein Bezugspunkt: Masse-Symbol setzen.'; } },
    OUTPUT_CLASH: { tag: 'Ausgänge gegeneinander', s: function (f) { return 'Zwei Ausgänge gegeneinander: ' + f.parts.join(', '); }, l: function (f) { return 'Die Ausgänge ' + f.parts.join(' und ') + ' sind verbunden und liefern verschiedene Pegel: Einer zieht nach 5 V, der andere nach 0 V, es fliesst ein Querstrom und der Pegel ist undefiniert.'; } },
    FF_RS: { tag: 'verboten', s: function (f) { return f.why === 'async' ? f.part + ': preSet und preClear zugleich ist unzulässig – Q und Q̄ gehen beide auf 1 (verbotener Zustand)' : f.part + ': S = R = 1 ist verboten (verbotener Zustand)'; },
      l: function (f) { return (f.why === 'async' ? f.part + ': preSet und preClear liegen zugleich an – unzulässig, Q und Q̄ gehen beide auf 1.' : f.part + ': S = R = 1 ist der verbotene Zustand, das Flipflop behält seinen Wert.') + ' Beim Wegnehmen eines Eingangs nimmt es den Zustand ein, den der verbleibende Eingang vorgibt.'; } }
  };
  S.faultText = function (f) { return FAULT[f.code] ? FAULT[f.code].s(f) : f.code; };
  S.faultLong = function (f) { return FAULT[f.code] ? FAULT[f.code].l(f) : f.code; };
  S.faultTag = function (id) { var f = (sim.faults || []).filter(function (x) { return x.part === id && FAULT[x.code] && FAULT[x.code].tag; })[0]; return f ? FAULT[f.code].tag : null; };
  S.partFaults = function (id) { return (sim.faults || []).filter(function (x) { return x.part === id || (x.parts && x.parts.indexOf(id) >= 0); }); };
  function renderStatus() {
    var el = $('#statusbar'), h = '';
    if (sim.err) h += '<span class="err">' + esc(sim.err) + '</span>';
    else {
      h += '<span>' + (sim.running ? '<b class="ok">● läuft</b>' : '<b class="warn">⏸ angehalten</b>') + '</span>';
      h += '<span>t = <span class="mono">' + fmtT(sim.state.t) + '</span></span><span>Δt = <span class="mono">' + fmtT(sim.dt) + '</span></span>';
      h += '<span>Zeitfaktor <span class="mono">' + fmtFactor(sim.effFactor()) + '</span>' + (sim.lag ? ' <span class="warn">– Rechner kommt nicht mit, Zeitfaktor senken</span>' : '') + '</span>';
    }
    var seen = {}; (sim.faults || []).forEach(function (f) { var t = S.faultText(f); if (!seen[t]) { seen[t] = 1; h += '<span class="err">⚠ ' + esc(t) + '</span>'; } });
    if (sim.tpdScale !== 1) h += '<span class="warn">⚠ Laufzeit überhöht ×' + (sim.tpdScale === 1e3 ? '10³' : sim.tpdScale === 1e6 ? '10⁶' : '10⁷') + '</span>';
    h += '<span class="sp"></span><span>' + (core.layout.parts.filter(function (p) { return p.type !== 'node'; }).length) + ' Bauteile · ' + core.layout.wires.length + ' Leitungen</span>';
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  }
  function flash(m) { var el = $('#statusbar'); el.insertAdjacentHTML('afterbegin', '<span class="warn">' + esc(m) + '</span>'); setTimeout(renderStatus, 3000); }

  /* Beamer-Modus (wie «Beamer» im Portal): dicke Linien, grosse Schrift, hoher Kontrast, grosse Bedienelemente. Ändert die Schaltung nicht. */
  S.beamer = false;
  S.setBeamer = function (on) {
    S.beamer = !!on; document.body.classList.toggle('beamer', S.beamer);
    var b = $('#btnBeamer'); if (b) { b.classList.toggle('on', S.beamer); b.setAttribute('aria-pressed', S.beamer); }
    if (S.gridApply) S.gridApply(); ed.fit(); S.redraw(); if (S.timingDraw) S.timingDraw(); S.scopes.forEach(function (sc) { sc.dirty(); });
  };
  S.refreshInspector = function () { renderInspector(true); };
  S.selected = function () { return selId && core.part(selId); };
  S.start = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);

/* Digital Quest Studio – Beispiele (Stufe 6, Menü «Beispiele»)
 * Mitgelieferte Schaltungen. Jedes Beispiel: {id, name, text, build() → {layout, scopes?, timing?, run?}}.
 * Die Digitaluhr ist das Zielbild des Studios: Taktgeber 1 Hz, Sekundenzähler (Einer 0–9, Zehner 0–5), BCD-Dekoder, zwei Siebensegmentanzeigen. */
(function (root) {
  'use strict';
  var S = root.Studio, E = root.DQEngine;
  var W = function (a, b) { return { from: a, to: b }; };
  function part(id, type, x, y, props, value) { var p = { id: id, type: type, x: x, y: y, rot: 0 }; if (props) p.props = props; if (value !== undefined) p.value = value; return p; }

  /* Digitaluhr: Sekunden 00 … 59. Der Zehnerzähler zählt bei der fallenden Flanke von Q3 des Einerzählers (9 → 0). */
  function digitaluhr() {
    var parts = [
      part('CLK1', 'clock', 200, 300, { freq: 1 }),
      part('Z1', 'ctr_bcd', 460, 300), part('Z2', 'ctr_mod', 460, 560, { modn: 6, trig: 'neg' }),
      part('IC1', 'dec7', 760, 300), part('IC2', 'dec7', 760, 560),
      part('AZ1', 'seg7', 1060, 300), part('AZ2', 'seg7', 1060, 560),
      part('GND1', 'ground', 620, 700)
    ], wires = [W('CLK1.out', 'Z1.C'), W('Z1.Q3', 'Z2.C'), W('GND1.g', 'IC2.D')];
    ['A', 'B', 'C', 'D'].forEach(function (p, k) { wires.push(W('Z1.Q' + k, 'IC1.' + p)); });
    ['A', 'B', 'C'].forEach(function (p, k) { wires.push(W('Z2.Q' + k, 'IC2.' + p)); });
    'abcdefg'.split('').forEach(function (s) { wires.push(W('IC1.' + s, 'AZ1.' + s)); wires.push(W('IC2.' + s, 'AZ2.' + s)); });
    return { layout: { parts: parts, wires: wires },
      timing: { rows: [{ kind: 'dig', a: 'CLK1.out' }], buses: [{ label: 'Einer', bits: [0, 1, 2, 3].map(function (k) { return { kind: 'dig', a: 'Z1.Q' + k }; }) }, { label: 'Zehner', bits: [0, 1, 2].map(function (k) { return { kind: 'dig', a: 'Z2.Q' + k }; }) }] } };
  }
  /* Asynchroner 4-Bit-Zähler aus Flipflops (aufgeklappt) bei 1 MHz: im Zeitverlauf kommen die Flanken der höheren Stufen später */
  function asyncZaehler() {
    var C = root.DQStudioCounters, ex = C.expansion('ctr_async', { bits: 4 }), parts = [part('CLK1', 'clock', 200, 300, { freq: 1e6 }), part('GND1', 'ground', 200, 460)], wires = [];
    var id = {}; ex.parts.forEach(function (p, i) { id[p.key] = 'FF' + (i + 1); parts.push(part(id[p.key], p.type, 420 + p.x + 280, 300 + p.y + 120, p.props)); });
    var ren = function (pin) { var a = pin.split('.'); return id[a[0]] + '.' + a[1]; };
    ex.wires.forEach(function (w) { wires.push(W(ren(w[0]), ren(w[1]))); });
    wires.push(W('CLK1.out', ren(ex.map.C)));
    return { layout: { parts: parts, wires: wires }, timing: { auto: true } };
  }
  function tiefpass() {
    return { layout: { parts: [part('G1', 'acsource', 240, 300, { freq: 1000, shape: 'sine', ri: 0.05 }, 1), part('R1', 'resistor', 520, 200, null, 1000), part('C1', 'capacitor', 800, 300, null, 1e-7), part('GND1', 'ground', 520, 440)],
      wires: [W('G1.p', 'R1.a'), W('R1.b', 'C1.a'), W('C1.b', 'G1.n'), W('G1.n', 'GND1.g')] },
      bode: [{ channels: [{ a: 'C1.a' }] }] };
  }
  function rlc() {
    return { layout: { parts: [part('G1', 'acsource', 240, 300, { freq: 500, shape: 'sine', ri: 0.05 }, 1), part('L1', 'inductor', 480, 200, null, 10e-3), part('C1', 'capacitor', 720, 200, null, 10e-6), part('R1', 'resistor', 900, 300, null, 10), part('GND1', 'ground', 520, 440)],
      wires: [W('G1.p', 'L1.a'), W('L1.b', 'C1.a'), W('C1.b', 'R1.a'), W('R1.b', 'G1.n'), W('G1.n', 'GND1.g')] },
      bode: [{ channels: [{ a: 'R1.a' }] }] };
  }
  /* Gruppen wie die Bauteilleiste (studio.js PALETTE): Logik · Flip-Flops · Zähler · Anzeigen · Analog · Anwendungen */
  var CATS = ['Logik', 'Flip-Flops', 'Zähler', 'Anzeigen', 'Analog', 'Anwendungen'];
  var OLD = [
    { cat: 'Zähler', id: 'zaehler', name: 'Asynchroner Zähler aus Flipflops (1 MHz)', text: '4 Bit aus Flipflops bei 1 MHz: Die höheren Stufen schalten mit Laufzeit später.', build: asyncZaehler },
    { cat: 'Analog', id: 'tiefpass', name: 'RC-Tiefpass: Bode-Diagramm', text: '−3 dB bei fg = 1/(2π·R·C) = 1,59 kHz, −20 dB je Dekade, Phase −45° bei fg.', build: tiefpass },
    { cat: 'Analog', id: 'rlc', name: 'Reihenschwingkreis: Resonanzkurve', text: 'Resonanz bei 503 Hz, Güte Q ≈ 3,1 (Bandpass über R).', build: rlc },
    { cat: 'Anwendungen', id: 'uhr', name: 'Digitaluhr (Sekunden 00 – 59)', text: 'Taktgeber 1 Hz, Einer (0–9) und Zehner (0–5), BCD-Dekoder, zwei Siebensegmentanzeigen.', build: digitaluhr }
  ];
  var LIST = [];
  CATS.forEach(function (c) { LIST = LIST.concat((S.exampleDefs || []).concat(OLD).filter(function (e) { return e.cat === c; })); });
  S.examples = LIST; S.exampleCats = CATS;

  /* ---------- Vorführung: Eingänge laufen reihum durch, bis jemand selbst etwas anfasst ---------- */
  var demo = null;
  function applyState(st) {
    var core = S.core;
    Object.keys(st).forEach(function (k) {
      var v = st[k], a = k.split('.'), p = core.part(a[0]); if (!p) return; p.props = p.props || {};
      if (typeof v === 'boolean') p.props.closed = v; else p.props[a[1] || 'value'] = v;
    });
    core.changed('demo');
  }
  S.stopDemo = function () { if (demo) { clearInterval(demo.timer); demo = null; } var b = document.getElementById('exDemo'); if (b) b.hidden = true; };
  S.startDemo = function (d) {
    S.stopDemo(); if (!d || !d.seq || !d.seq.length) return;
    demo = { i: 0, timer: setInterval(function () { demo.i = (demo.i + 1) % d.seq.length; applyState(d.seq[demo.i]); }, d.every * 1000), cfg: d };
    applyState(d.seq[0]);
    var b = document.getElementById('exDemo'); if (b) b.hidden = false;
  };
  S.demoRunning = function () { return !!demo; };

  /* ---------- Beispiel laden ---------- */
  /* Der erklärende Satz steht als Textelement im Schaltplan (Zeichenebene), über der Schaltung */
  function wrap(t, n) { var out = [], line = ''; t.split(' ').forEach(function (w) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }); if (line) out.push(line); return out.join('\n'); }
  function addNote(layout, text) {
    if (!text || (layout.draw && layout.draw.length)) return;
    var xs = layout.parts.map(function (p) { return p.x; }), ys = layout.parts.map(function (p) { return p.y; }), lines = wrap(text, 66).split('\n').length;
    layout.draw = [{ id: 'z1', kind: 'text', x: Math.max(20, Math.min.apply(null, xs) - 60), y: Math.max(20, Math.min.apply(null, ys) - 80 - lines * 20), text: wrap(text, 66), size: 16, color: '#5b6b73', bold: false }];
  }
  S.loadExample = function (id) {
    var ex = LIST.filter(function (e) { return e.id === id; })[0]; if (!ex) return false;
    var b = ex.build(); addNote(b.layout, ex.text);
    S.loadLayout(b.layout, { scopes: b.scopes, timing: b.timing, bode: b.bode, run: b.run, example: ex.id });
    S.name = ex.name; if (S.updateTitle) S.updateTitle();
    showBanner(ex); if (ex.demo) S.startDemo(ex.demo);
    return true;
  };
  function showBanner(ex) {
    var el = document.getElementById('exBanner'); if (!el) return;
    el.querySelector('b').textContent = ex.name; el.querySelector('.exbody').textContent = 'Die Erklärung steht über der Schaltung.'; el.hidden = false;
    if (S.ed) requestAnimationFrame(function () { S.ed.fit(); });
  }
  S.initExamples = function () {
    var items = [];
    CATS.forEach(function (c) {
      var list = LIST.filter(function (e) { return e.cat === c; }); if (!list.length) return;
      items.push({ head: c });
      list.forEach(function (e) { items.push({ label: e.name, act: function () { S.loadExample(e.id); } }); });
    });
    S.setMenu('bsp', items);
    var cv = document.getElementById('canvasWrap');
    if (cv && !document.getElementById('exBanner')) {
      var el = document.createElement('div'); el.id = 'exBanner'; el.className = 'exbanner'; el.hidden = true;
      el.innerHTML = '<b></b><span class="exbody"></span><span class="exdemo" id="exDemo" hidden>Die Eingänge schalten von selbst durch – ein Klick auf einen Schalter übernimmt.</span><button aria-label="Hinweis schliessen" title="Hinweis schliessen">×</button>';
      cv.insertBefore(el, cv.firstChild); el.querySelector('button').addEventListener('click', function () { el.hidden = true; if (S.ed) S.ed.fit(); });
    }
  };
  /* Fenster eines Beispiels (Oszilloskop, Bode) an den rechten Rand legen und die Schaltung links davon einpassen, damit nichts verdeckt wird */
  function placeWindows() {
    var wins = (S.scopes || []).concat(S.bodes || []), inset = 0;
    wins.forEach(function (w, k) { var W = w.el.offsetWidth; w.el.style.left = Math.max(8, root.innerWidth - W - 8 - 26 * k) + 'px'; w.el.style.top = (120 + 28 * k) + 'px'; inset = Math.max(inset, W - 300 + 16 + 26 * k); });
    if (S.ed) S.ed.insetRight = root.innerWidth > 900 ? inset : 0;
  }
  S.onLoad = (function (prev) { return function (o) { if (prev) prev(o); S.stopDemo(); if (o && o.example) placeWindows(); else if (S.ed) S.ed.insetRight = 0; if (!o || !o.example) { var el = document.getElementById('exBanner'); if (el && !el.hidden) { el.hidden = true; if (S.ed) requestAnimationFrame(function () { S.ed.fit(); }); } } }; })(S.onLoad);
  S.digitaluhr = digitaluhr;
})(window);

/* Digital Quest Studio – Signale in die Anzeigen bringen (Auftrag «Bauen», Paket 2)
 * Ohne Werkzeugwechsel: Rechtsklick (oder langes Drücken) auf einen Anschluss, ein Bauteil oder eine Leitung bietet
 * «In den Zeitverlauf», «Ins Oszilloskop», «Ins Bode-Diagramm» an. Dazu «Alle digitalen Signale aufnehmen» und die Knöpfe
 * im Eigenschaftenfeld (Messwerte jetzt). Nicht passende Ziele sind ausgegraut und sagen in einem Satz, warum. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var num = function (id) { return +(String(id).match(/\d+/) || [0])[0]; };

  /* ---------- Welche Anschlüsse eines Bauteils sind digitale Ausgänge? ---------- */
  function digitalOuts(p) {
    var d = E.PARTS[p.type], pins = E.pinsOf(p.type, Object.assign({}, d.props, p.props || {}));
    if (p.type === 'logicled') return ['in'];
    if (d.ff) return ['Q'];
    if (d.ctr) return pins.filter(function (x) { return /^Q/.test(x); });
    if (p.type === 'clock' || p.type === 'logicin') return ['out'];
    if (d.logic) return d.outs || ['out'];
    return [];
  }
  function isDigitalPin(pin) { var net = S.sim.net, n = net && net.pinNode[pin]; return n !== undefined && !!S.digitalNodes[n]; }
  S.digitalOuts = digitalOuts; S.isDigitalPin = isDigitalPin;

  /* ---------- Alle digitalen Signale der Schaltung (ohne Doppelte desselben Knotens) ---------- */
  /* Takt, Logikanzeigen (Anschluss in), Flipflop-Ausgänge Q, Zählerausgänge. Versorgungsleitungen gibt es als eigene Signale nicht. */
  S.digitalSignals = function () {
    var net = S.sim.net, out = [], seen = {}; if (!net) return out;
    function add(pin, label) { var n = net.pinNode[pin]; if (n === undefined || seen[n]) return; seen[n] = 1; out.push({ pin: pin, label: label }); }
    var by = function (f) { return net.parts.filter(f).sort(function (a, b) { return num(a.id) - num(b.id); }); };
    by(function (p) { return p.type === 'clock'; }).forEach(function (p) { add(p.id + '.out', p.id); });
    by(function (p) { return p.type === 'logicled'; }).forEach(function (p) { add(p.id + '.in', p.id); });
    by(function (p) { return E.PARTS[p.type].ff; }).forEach(function (p) { add(p.id + '.Q', p.id + '.Q'); });
    by(function (p) { return E.PARTS[p.type].ctr; }).forEach(function (p) { E.pinsOf(p.type, p.props).filter(function (x) { return /^Q/.test(x); }).forEach(function (x) { add(p.id + '.' + x, p.id + '.' + x); }); });
    return out;
  };
  S.addAllDigital = function () {
    var sig = S.digitalSignals(), n = 0;
    sig.forEach(function (s) { if (S.timing.addRow({ kind: 'dig', a: s.pin }, s.label)) n++; });
    return { found: sig.length, added: n };
  };

  /* ---------- Senden ---------- */
  function bodeAvailable() { return S.core.layout.parts.some(function (p) { return p.type === 'acsource'; }); }
  var SEND = {
    timing: function (what) {
      if (what.pin) { S.timing.addRow({ kind: 'dig', a: what.pin }); return; }
      var p = what.part; if (what.cnt) { S.timing.addRow({ kind: 'cnt', id: p.id }); return; }
      digitalOuts(p).forEach(function (x) { S.timing.addRow({ kind: 'dig', a: p.id + '.' + x }); });
    },
    scope: function (what) {
      var sc = S.activeScope() || S.openScope();
      if (what.pin) sc.addChannel({ kind: 'node', a: what.pin });
      else if (what.q === 'v' || what.q === 'i') sc.addChannel({ kind: what.q === 'v' ? 'pv' : 'pi', id: what.part.id });
      else digitalOuts(what.part).forEach(function (x) { sc.addChannel({ kind: 'node', a: what.part.id + '.' + x }); });
      sc.el.style.zIndex = 5;
    },
    bode: function (what) {
      var b = S.bodes && S.bodes.length ? S.bodes[S.bodes.length - 1] : S.openBode();
      if (what.pin) { b.addChannel({ a: what.pin }); return; }
      var p = what.part, pins = E.PARTS[p.type].pins, k = /^(led|diode|zener)$/.test(p.type) ? 'k' : pins[1];
      b.addChannel({ a: p.id + '.' + pins[0], b: p.id + '.' + k });
    }
  };
  S.sendSignal = function (target, what) { SEND[target](what); if (S.redraw) S.redraw(); };

  /* Was geht wohin: [{target, label, ok, why}] */
  function optionsFor(what) {
    var opts = [], p = what.part, pin = what.pin, dig, twoPole;
    if (pin) dig = isDigitalPin(pin); else dig = digitalOuts(p).length > 0;
    twoPole = p && !digitalOuts(p).length && E.PARTS[p.type].pins.length >= 2 && p.type !== 'ground' && p.type !== 'node';
    opts.push({ target: 'timing', label: 'In den Zeitverlauf', ok: dig, why: pin ? 'Kein digitales Signal – das hier ist eine Spannung, besser ins Oszilloskop.' : 'Dieses Bauteil hat keinen digitalen Ausgang.' });
    if (pin || !twoPole) opts.push({ target: 'scope', label: 'Ins Oszilloskop', ok: true });
    else { opts.push({ target: 'scope', q: 'v', label: 'Ins Oszilloskop: Spannung', ok: true }); opts.push({ target: 'scope', q: 'i', label: 'Ins Oszilloskop: Strom', ok: true }); }
    opts.push({ target: 'bode', label: 'Ins Bode-Diagramm', ok: bodeAvailable() && (pin || twoPole), why: !bodeAvailable() ? 'Das Bode-Diagramm braucht eine Wechselspannungsquelle.' : 'Das Bode-Diagramm zeigt die Spannung an Anschlüssen und über Zweipolen.' });
    return opts;
  }

  /* ---------- Hinweis in leeren Anzeigen ---------- */
  var HINT = {
    scope: ['Oszilloskop – noch kein Signal', 'Rechtsklick auf einen Anschluss oder ein Bauteil im Schaltplan, dann «Ins Oszilloskop».', []],
    bode: ['Bode-Diagramm – noch kein Signal', 'Rechtsklick auf einen Anschluss im Schaltplan, dann «Ins Bode-Diagramm». Es braucht eine Wechselspannungsquelle.', []],
    timing: ['Zeitverlauf – noch kein Signal', 'Rechtsklick auf einen Anschluss oder ein Bauteil im Schaltplan, dann «In den Zeitverlauf» – oder alle digitalen Signale auf einmal:', [['all', 'Alle digitalen Signale aufnehmen']]]
  };
  S.hintHTML = function (kind) { var h = HINT[kind]; return '<b>' + esc(h[0]) + '</b>' + esc(h[1]) + '<br>' + h[2].map(function (b) { return '<button class="tl-btn" data-hint="' + b[0] + '">' + esc(b[1]) + '</button>'; }).join(' '); };
  S.makeHint = function (win, kind) { var d = document.createElement('div'); d.className = 'sc-hint'; d.innerHTML = S.hintHTML(kind); $('.fb', win.el).appendChild(d); return d; };

  /* ---------- Kontextmenü ---------- */
  var menu = null;
  function closeCtx() { if (menu) { menu.remove(); menu = null; } }
  S.closeContext = closeCtx;
  function showCtx(x, y, title, items) {
    closeCtx();
    menu = document.createElement('div'); menu.className = 'ctxmenu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = '<div class="ctx-t">' + esc(title) + '</div>' + items.map(function (it, i) {
      return it.sep ? '<hr>' : '<button role="menuitem" data-i="' + i + '"' + (it.ok === false ? ' disabled' : '') + '>' + esc(it.label) + (it.ok === false && it.why ? '<small>' + esc(it.why) + '</small>' : '') + '</button>';
    }).join('');
    document.body.appendChild(menu);
    var w = menu.offsetWidth, h = menu.offsetHeight; menu.style.left = Math.max(4, Math.min(x, root.innerWidth - w - 4)) + 'px'; menu.style.top = Math.max(4, Math.min(y, root.innerHeight - h - 4)) + 'px';
    menu.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-i]'); if (!b || b.disabled) return; var it = items[+b.dataset.i]; closeCtx(); if (it && it.act) it.act(); });
    var first = menu.querySelector('button:not([disabled])'); if (first) first.focus();
  }
  function ctxFor(ev) {
    var core = S.core, t = ev.target.closest('[data-pin],[data-part],[data-wire]'); if (!t) return null;
    var what, title, items = [];
    if (t.dataset.pin) { what = { pin: t.dataset.pin }; title = t.dataset.pin; }
    else if (t.dataset.part) {
      var p = core.part(t.dataset.part); if (!p) return null;
      if (p.type === 'node') { what = { pin: p.id + '.p' }; title = 'Knoten ' + p.id; } else { what = { part: p }; title = p.id + ' – ' + E.PARTS[p.type].label; }
    } else {
      var w = core.layout.wires[+t.dataset.wire]; if (!w) return null; what = { pin: w.from }; title = 'Leitung ' + w.from + ' – ' + w.to;
    }
    optionsFor(what).forEach(function (o) { items.push({ label: o.label, ok: o.ok, why: o.why, act: function () { SEND[o.target](Object.assign({}, what, o.q ? { q: o.q } : {})); S.redraw(); } }); });
    if (what.part && what.part.type !== 'ground' && E.PARTS[what.part.type].ctr) { /* Zähler: Zählerstand als Zahl */
      items.push({ label: 'Zählerstand als Zahl in den Zeitverlauf', act: function () { SEND.timing({ part: what.part, cnt: true }); S.redraw(); } });
    }
    if (t.dataset.wire !== undefined) {
      items.push({ sep: 1 });
      var i = +t.dataset.wire, xy = S.ed._pt(ev), sn = root.DQEditor.snapWire(core.layout, xy, 16, -1);
      items.push({ label: 'Knotenpunkt hier setzen', ok: !!sn, why: 'Zu nahe an einem Anschluss – dort wirkt der Anschluss selbst.', act: function () { if (sn) core.splitWire(i, sn.xy); } });
      items.push({ label: 'Leitung löschen', act: function () { core.sel = 'w:' + i; core.removeSelected(); } });
    }
    return { title: title, items: items };
  }
  /* ---------- Menü «Anzeigen»: dieselben Wege ohne Mausklick auf ein Bauteil ---------- */
  function selectedWhat() { var p = S.core.sel && S.core.part(S.core.sel); return p ? (p.type === 'node' ? { pin: p.id + '.p' } : { part: p }) : null; }
  function viewMenu() {
    var w = selectedWhat(), o = w ? optionsFor(w) : [];
    var send = function (target) { return { label: { timing: 'Auswahl in den Zeitverlauf', scope: 'Auswahl ins Oszilloskop', bode: 'Auswahl ins Bode-Diagramm' }[target], act: function () {
      var cur = selectedWhat(); if (!cur) { S.core.opts.onMessage('Erst ein Bauteil auswählen – oder rechts auf ein Bauteil klicken.'); return; }
      var op = optionsFor(cur).filter(function (x) { return x.target === target; })[0]; if (!op || op.ok === false) { S.core.opts.onMessage(op && op.why || 'Das geht mit dieser Auswahl nicht.'); return; }
      SEND[target](Object.assign({}, cur, op.q ? { q: op.q } : {})); S.redraw();
    } }; };
    return [{ label: 'Neues Oszilloskop', act: function () { S.openScope(); } }, { label: 'Neues Bode-Diagramm', act: function () { S.openBode(); } }, { label: 'Logik: Ausdruck, Tabelle, KV', act: function () { S.openLogic && S.openLogic(); } }, { label: 'Zeitverlauf ein/aus', act: function () { S.toggleTiming && S.toggleTiming(); } },
      { sep: 1 }, { label: 'Alle digitalen Signale aufnehmen', act: function () { var r = S.addAllDigital(); if (!r.found) S.core.opts.onMessage('Keine digitalen Signale gefunden: Logikanzeigen, Flipflops, Zähler oder Taktgeber setzen.'); } },
      send('timing'), send('scope'), send('bode'),
      { sep: 1 }, { label: (S.ed.showVolt ? '✓ ' : '  ') + 'Spannungen im Schaltplan', key: 'U', act: function () { S.setValues('volt', !S.ed.showVolt); } }, { label: (S.ed.showAmp ? '✓ ' : '  ') + 'Ströme im Schaltplan', key: 'I', act: function () { S.setValues('amp', !S.ed.showAmp); } }];
  }
  S.initFns.push(function () {
    S.viewMenuSync = function () { S.setMenu('fenster', viewMenu()); }; S.viewMenuSync();
    var svg = $('#board'), press = null;
    svg.addEventListener('contextmenu', function (ev) {
      ev.preventDefault(); // das Browsermenü gibt es auf der Zeichenfläche nicht
      if (S.ed.rightActive()) return; // Maus: das Menü kommt vom Editor beim Loslassen der rechten Taste, wenn nicht geschoben wurde
      var c = ctxFor(ev); if (!c) { closeCtx(); return; }
      showCtx(ev.clientX, ev.clientY, c.title, c.items); // Tastatur (Menütaste, Umschalt + F10)
    });
    S.ed.opts.onContext = function (ev) { var c = ctxFor(ev); if (!c) { closeCtx(); return; } showCtx(ev.clientX, ev.clientY, c.title, c.items); };
    // langes Drücken (Touch) wie Rechtsklick
    svg.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'touch') return; var x = ev.clientX, y = ev.clientY, tgt = ev.target;
      press = { x: x, y: y, id: setTimeout(function () { var c = ctxFor({ target: tgt, clientX: x, clientY: y }); if (c) showCtx(x, y, c.title, c.items); }, 600) };
    });
    function cancel(ev) { if (press) { if (ev.type === 'pointermove' && Math.abs(ev.clientX - press.x) + Math.abs(ev.clientY - press.y) < 10) return; clearTimeout(press.id); press = null; } }
    svg.addEventListener('pointerup', cancel); svg.addEventListener('pointercancel', cancel); svg.addEventListener('pointermove', cancel);
    document.addEventListener('pointerdown', function (ev) { if (menu && !ev.target.closest('.ctxmenu')) closeCtx(); }, true);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeCtx(); });
    root.addEventListener('blur', closeCtx);
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-hint]'); if (!b) return; var a = b.dataset.hint;
      if (a === 'all') { var r = S.addAllDigital(); if (!r.found) S.core.opts.onMessage('Keine digitalen Signale gefunden: Logikanzeigen, Flipflops, Zähler oder Taktgeber setzen.'); }
    });
  });
})(window);

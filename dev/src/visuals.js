/* Digital Quest – Bild/Animation in Theorie-Lektionen (window.DQVisuals), Plan: docs/PLAN_THEORIE_ANIMATIONEN.md
 * defTheory({ …, visual: {type, …} | [{type, …}, …] }) – je type ein Baustein:
 *   circuit      Mini-Schaltung (mini.js: derselbe Renderer und dieselbe Engine wie im Labor)
 *   numberSteps  Zahlen-Schritt-Widget (Phase C)
 *   kmap         KV-Diagramm (Phase C)
 *   bode         Frequenzgang (Phase D)
 *   block        Blockbild als fertiges Inline-SVG
 *   worked       Musterbeispiele mit Fading: Beispiel 1 vollstaendig vorgerechnet, Beispiel 2 mit einem, Beispiel 3 mit
 *                zwei Eingabeschritten – die Eingabe wird gegen den vorgerechneten Wert geprueft (Toleranz), Loesung nach 2 Fehlversuchen
 *   meterwork    Messwerk-Animation: Drehspul (Moment ~ I) und Dreheisen (Moment ~ I²) nebeneinander, Zeiger folgen der
 *                Drehmoment-Balance mit/ohne Daempfung, Eingang DC oder Kurvenform; davor eine Vorhersage-Frage (predict)
 * Gemeinsam: caption (Bildunterschrift, HTML). Einsetzen in die Lektion: Platzhalter {{visual}} (bzw. {{visual:2}} …),
 * sonst nach dem ersten Absatz. DQVisuals.check(v, E) liefert Fehlertexte fuer den Validator (ohne DOM). */
(function (root) {
  'use strict';
  var TYPES = {};

  /* type: { mount(el, v) → {destroy}?, check(v, E) → [fehler] } */
  function register(type, def) { TYPES[type] = def; }

  function mount(el, v) {
    var t = TYPES[v.type];
    if (!t || !t.mount) { el.innerHTML = '<p class="dim small">Bild „' + v.type + '“ ist noch nicht verfuegbar.</p>'; return null; }
    el.classList.add('visual', 'visual-' + v.type);
    var body = document.createElement('div'); body.className = 'visual-body'; el.appendChild(body);
    if (v.caption) { var cap = document.createElement('p'); cap.className = 'visual-cap'; cap.innerHTML = v.caption; el.appendChild(cap); }
    return t.mount(body, v);
  }
  function check(v, E) {
    if (!v || typeof v !== 'object') return ['visual ist kein Objekt'];
    var t = TYPES[v.type];
    if (!t) return ['unbekannter visual.type „' + v.type + '“ (erlaubt: ' + Object.keys(TYPES).join(', ') + ')'];
    try { return t.check ? t.check(v, E) : []; } catch (e) { return ['Fehler beim Pruefen: ' + e.message]; }
  }
  /* Lektion + Bilder: HTML mit Platzhaltern, danach mountAll(container, list) */
  function lessonHtml(lesson, list) {
    var used = {}, slot = function (i) { used[i] = true; return '<div class="lesson-visual" data-vi="' + i + '"></div>'; };
    var marks = String(lesson).match(/\{\{visual:(\d+)\}\}/g) || [];
    marks.forEach(function (m) { used[+m.slice(9, -2) - 1] = true; }); // nummerierte zuerst reservieren
    var html = String(lesson).replace(/\{\{visual(?::(\d+))?\}\}/g, function (m, k) {
      if (k) return slot(+k - 1);
      var i = 0; while (used[i]) i++; return slot(i); // {{visual}}: kleinstes freies Bild
    });
    list.forEach(function (v, i) { // uebrige Bilder: das erste nach dem ersten Absatz, weitere ans Ende
      if (used[i]) return;
      var at = html.indexOf('</p>'), s = slot(i);
      html = i === 0 && at >= 0 ? html.slice(0, at + 4) + s + html.slice(at + 4) : html + s;
    });
    return html;
  }
  function mountAll(root2, list) {
    return Array.prototype.map.call(root2.querySelectorAll('.lesson-visual'), function (el) { var v = list[+el.dataset.vi]; return v ? mount(el, v) : null; });
  }
  function listOf(visual) { return visual ? [].concat(visual) : []; }

  /* ---------- circuit: Mini-Schaltung ---------- */
  register('circuit', {
    mount: function (el, v) { return root.DQMini.mount(el, v); },
    check: function (v, E) {
      var err = [], L = v.layout;
      if (!L || !Array.isArray(L.parts) || !Array.isArray(L.wires)) return ['circuit: layout {parts, wires} fehlt'];
      try { E.buildNetlist(L); } catch (e) { err.push('circuit: Layout ungueltig: ' + e.message); }
      var ids = {}; L.parts.forEach(function (p) { ids[p.id] = p; });
      ((v.bench && v.bench.parts) || []).forEach(function (b) { if (!ids[b.id]) err.push('circuit: bench-id ' + b.id + ' nicht im Layout'); });
      (v.sliders || []).forEach(function (s) {
        var p = ids[s.part]; if (!p) { err.push('circuit: Regler fuer unbekanntes Bauteil ' + s.part); return; }
        if (s.prop !== 'value' && !(s.prop in (E.PARTS[p.type].props || {}))) err.push('circuit: ' + p.type + ' hat keine Eigenschaft ' + s.prop);
        if (s.choices) { if (!s.choices.length) err.push('circuit: Auswahl ' + s.part + ' ohne choices'); return; }
        if (!(s.max > s.min) || (s.log && !(s.min > 0))) err.push('circuit: Regler ' + s.part + ' mit ungueltigem Bereich');
      });
      (v.readouts || []).forEach(function (x) { if (x.ac && ['rms', 'avg', 'dc', 'pp', 'peak'].indexOf(x.ac) < 0) err.push('circuit: ac muss rms|avg|dc|pp|peak sein'); if (x.sel && !ids[x.sel]) err.push('circuit: Anzeige fuer unbekanntes Bauteil ' + x.sel); if (x.a && !ids[x.a.split('.')[0]]) err.push('circuit: Anzeige an unbekanntem Anschluss ' + x.a); });
      if (v.scope && (!v.scope.a || !ids[v.scope.a.split('.')[0]])) err.push('circuit: Oszilloskop-Anschluss fehlt/unbekannt');
      return err;
    }
  });

  /* ---------- block: fertiges Inline-SVG (Blockbild) ---------- */
  register('block', {
    mount: function (el, v) { el.innerHTML = v.svg; return null; },
    check: function (v) { return /^\s*<svg[\s>]/.test(v.svg || '') ? [] : ['block: svg (Inline-SVG) fehlt']; }
  });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bitsOf(n, w) { var b = []; for (var i = w - 1; i >= 0; i--) b.push(n >> i & 1); return b; } // MSB zuerst

  /* ---------- numberSteps: Zahlen-Schritt-Widget ----------
   * Allgemein: steps:[{text (HTML), rows:[{label, cells:[…], hl:[Index], note}]}] – Kaestchen, hervorgehobene Stellen, ◀ ▶ Abspielen.
   * Erzeuger (mode) bauen die Schritte aus wenigen Angaben:
   *   mode:'gray', bits (Standard 3), parity (Standard ja) – Zaehler in Binaer und Gray, geaenderte Bits blinken,
   *        Paritaetsbit des Gray-Worts als XOR-Kette. */
  var GEN = {
    gray: function (v) {
      var w = v.bits || 3, N = 1 << w, out = [], names = [];
      for (var i = w - 1; i >= 0; i--) names.push(i);
      for (var k = 0; k <= N; k++) {
        var n = k % N, p = (k + N - 1) % N, b = bitsOf(n, w), g = bitsOf(n ^ (n >> 1), w), bp = bitsOf(p, w), gp = bitsOf(p ^ (p >> 1), w);
        var hb = [], hg = []; b.forEach(function (x, i) { if (k && x !== bp[i]) hb.push(i); }); g.forEach(function (x, i) { if (k && x !== gp[i]) hg.push(i); });
        var rows = [{ label: 'Dezimal', cells: [n] }, { label: 'Binaer B', cells: b, hl: hb, note: k ? hb.length + ' Bit' + (hb.length > 1 ? 's' : '') + ' geaendert' : '' },
          { label: 'Gray G', cells: g, hl: hg, note: k ? '1 Bit geaendert' : '' }];
        if (v.parity !== false) {
          var chain = [], acc = 0; g.forEach(function (x, i) { acc ^= x; chain.push(acc); });
          rows.push({ label: 'XOR-Kette', cells: chain, hl: [chain.length - 1], note: 'P = ' + names.map(function (i) { return 'G' + i; }).join(' ⊕ ') + ' = ' + acc });
        }
        out.push({ rows: rows, text: k === 0 ? 'Start bei 0. Mit ▶ zaehlst du weiter.' : k === N ? 'Von ' + p + ' zurueck auf 0: auch dieser Uebergang aendert im Gray-Code nur ein Bit – der Code ist zyklisch.'
          : 'Von ' + p + ' auf ' + n + ': binaer kippen <b>' + hb.length + '</b> Bit' + (hb.length > 1 ? 's' : '') + ', im Gray-Code nur <b>eines</b> (G' + names[hg[0]] + ').' + (v.parity !== false ? ' Das Paritaetsbit wechselt deshalb bei jedem Schritt.' : '') });
      }
      return out;
    }
  };
  /*   mode:'divide', value, base (2 oder 16) – fortgesetzte Division, Reste sammeln sich zur Zahl; am Ende Probe mit Wertigkeiten */
  var HEX = '0123456789ABCDEF';
  GEN.divide = function (v) {
    var b = v.base || 2, q = v.value, rest = [], out = [], sub = b === 2 ? '₂' : '₁₆';
    out.push({ rows: [{ label: 'Zahl', cells: [q] }, { label: 'Reste', cells: ['·'] }], text: 'Die Dezimalzahl ' + q + ' wird so lange durch ' + b + ' geteilt, bis 0 uebrig bleibt. Die Reste sind die Ziffern.' });
    while (q > 0) {
      var r = q % b, nq = Math.floor(q / b); rest.unshift(HEX[r]);
      out.push({ rows: [{ label: 'Zahl', cells: [nq] }, { label: 'Reste', cells: rest.slice(), hl: [0], note: 'neuer Rest links' }], text: q + ' : ' + b + ' = ' + nq + ' Rest <b>' + HEX[r] + '</b>' });
      q = nq;
    }
    var w = rest.map(function (x, i) { return Math.pow(b, rest.length - 1 - i); });
    out.push({ rows: [{ label: 'Wertigkeit', cells: w }, { label: 'Ziffer', cells: rest, hl: rest.map(function (x, i) { return x !== '0' ? i : -1; }).filter(function (i) { return i >= 0; }) }],
      text: 'Reste von unten nach oben gelesen: <b>' + rest.join('') + sub + '</b>. Probe: ' + rest.map(function (x, i) { return x !== '0' ? (HEX.indexOf(x) > 1 ? HEX.indexOf(x) + '·' : '') + w[i] : null; }).filter(Boolean).join(' + ') + ' = ' + v.value + '.' });
    return out;
  };
  /*   mode:'bases', value – dieselbe Zahl als Dezimal, BCD (je Ziffer 4 Bit) und Hex; zurueck nach dem Horner-Schema */
  GEN.bases = function (v) {
    var n = v.value, dec = String(n).split(''), hex = n.toString(16).toUpperCase().split(''), out = [];
    out.push({ rows: [{ label: 'Dezimal', cells: dec }], text: 'Die Zahl ' + n + ' in drei Darstellungen.' });
    out.push({ rows: [{ label: 'Dezimal', cells: dec }, { label: 'BCD', cells: dec.map(function (d) { return bitsOf(+d, 4).join(''); }), hl: dec.map(function (d, i) { return i; }) }],
      text: '<b>BCD</b>: jede Dezimalziffer einzeln mit 4 Bit – ' + dec.map(function (d) { return d + ' → ' + bitsOf(+d, 4).join(''); }).join(', ') + '.' });
    out.push({ rows: [{ label: 'Dezimal', cells: dec }, { label: 'Hex', cells: hex, hl: hex.map(function (d, i) { return i; }) }, { label: 'Dual (4er-Gruppen)', cells: hex.map(function (d) { return bitsOf(parseInt(d, 16), 4).join(''); }) }],
      text: '<b>Hex</b>: Basis 16, jede Hex-Ziffer entspricht genau 4 Bit – ' + n + ' = ' + hex.join('') + '₁₆.' });
    var acc = 0;
    hex.forEach(function (d, i) {
      var val = parseInt(d, 16), before = acc; acc = acc * 16 + val;
      out.push({ rows: [{ label: 'Hex', cells: hex, hl: [i] }, { label: 'Zwischenwert', cells: [acc] }],
        text: '<b>Horner</b>: ' + (i ? before + ' · 16 + ' + val + ' = ' + acc : 'Start mit der ersten Ziffer ' + d + (val > 9 ? ' = ' + val : '')) + (i === hex.length - 1 ? ' – fertig, wieder ' + n + '.' : '') });
    });
    return out;
  };
  /*   mode:'dmm', value, unit ('V') – derselbe Messwert in den Bereichen des Multimeters (Anzeige wie E.dmm: Bereichsgrenzen,
   *        Kalibrierfehler METER.cal, letzte Stelle ±1 Digit). Alle Zahlen aus der Engine. */
  GEN.dmm = function (v) {
    var E = root.DQEngine, unit = v.unit || 'V', x = v.value, cal = E.METER.cal, out = [];
    var rs = E.DMM_RANGES[unit].filter(function (r) { return Math.abs(x) < r[0]; });
    var chars = function (t) { return t.replace(/\s.*$/, '').split(''); };
    rs.forEach(function (r, k) {
      var t = (x / r[1] * (1 + cal)).toFixed(r[3]), lsd = Math.pow(10, -r[3]) * r[1];
      out.push({ rows: [{ label: 'Wahrer Wert', cells: [String(x)] }, { label: 'Anzeige', cells: chars(t).concat([r[2]]), hl: [t.length - 1] }, { label: 'Aufloesung', cells: [E.fmt(lsd, unit).replace(/\.?0+ /, ' ')] }],
        text: (k === 0 ? 'Automatische Bereichswahl: kleinster passender Bereich (bis ' + E.fmt(r[0], unit).replace(/\.?0+ /, ' ') + ') – die meisten Stellen.' : 'Bereich bis ' + E.fmt(r[0], unit).replace(/\.?0+ /, ' ') + ': eine Stelle weniger, die Aufloesung wird zehnmal groeber.') });
    });
    var r0 = rs[0];
    [0.1, 0.5, 0.9].forEach(function (u) {
      var d = E.dmm(x, unit, function () { return u; });
      out.push({ rows: [{ label: 'Wahrer Wert', cells: [String(x)] }, { label: 'Anzeige', cells: chars(d.text).concat([r0[2]]), hl: [chars(d.text).length - 1] }],
        text: 'Mehrmals abgelesen: Die letzte Stelle schwankt um ±1 Digit, dazu kommt der Kalibrierfehler von +' + (cal * 100).toFixed(1).replace('.', ',') + ' %. Deshalb nie mehr Stellen notieren, als das Geraet sicher liefert.' });
    });
    return out;
  };
  function stepsOf(v) { return v.mode ? GEN[v.mode](v) : v.steps; }
  register('numberSteps', {
    mount: function (el, v) {
      var steps = stepsOf(v), i = 0, timer = 0;
      el.innerHTML = '<div class="ns"><div class="ns-grid"></div><p class="ns-text"></p><div class="ns-bar"><button class="btn small" data-ns="-1" aria-label="Zurueck">◀</button><span class="ns-pos mono"></span><button class="btn small" data-ns="1" aria-label="Weiter">▶</button><button class="btn small" data-ns="play">▶ Abspielen</button></div></div>';
      var grid = el.querySelector('.ns-grid'), text = el.querySelector('.ns-text'), pos = el.querySelector('.ns-pos'), play = el.querySelector('[data-ns="play"]');
      function draw() {
        var s = steps[i];
        grid.innerHTML = s.rows.map(function (r) {
          return '<div class="ns-row"><span class="ns-lbl">' + esc(r.label) + '</span><span class="ns-cells">' + r.cells.map(function (c, k) {
            return '<span class="ns-cell' + ((r.hl || []).indexOf(k) >= 0 ? ' hl' : '') + '">' + esc(c) + '</span>'; }).join('') + '</span><span class="ns-note">' + esc(r.note || '') + '</span></div>';
        }).join('');
        text.innerHTML = s.text || ''; pos.textContent = (i + 1) + ' / ' + steps.length;
      }
      function go(d) { i = Math.max(0, Math.min(steps.length - 1, i + d)); draw(); }
      function stop() { clearInterval(timer); timer = 0; play.textContent = '▶ Abspielen'; }
      el.querySelector('[data-ns="-1"]').onclick = function () { stop(); go(-1); };
      el.querySelector('[data-ns="1"]').onclick = function () { stop(); go(1); };
      play.onclick = function () {
        if (timer) { stop(); return; }
        if (i >= steps.length - 1) i = -1;
        play.textContent = '⏸ Anhalten';
        timer = setInterval(function () { if (!el.isConnected || i >= steps.length - 1) { stop(); return; } go(1); }, v.interval || 1400);
        go(1);
      };
      draw();
      return { destroy: stop, go: go };
    },
    check: function (v) {
      if (v.mode && !GEN[v.mode]) return ['numberSteps: unbekannter mode „' + v.mode + '“ (erlaubt: ' + Object.keys(GEN).join(', ') + ')'];
      var s = stepsOf(v);
      if (!Array.isArray(s) || !s.length) return ['numberSteps: steps oder mode noetig'];
      var err = [];
      s.forEach(function (st, k) { if (!st.rows || !st.rows.length) err.push('numberSteps: Schritt ' + (k + 1) + ' ohne rows'); });
      return err;
    }
  });

  /* ---------- worked: Musterbeispiele mit Fading (Kapitel 16) ----------
   * {type:'worked', examples:[{title, given:[{label, value}], steps:[{text, label, expr?, value (Zahl), unit, digits?, tol? (relativ, Standard 2 %), input? (true = Lernende rechnen selbst)}]}]}
   * Schritte erscheinen nacheinander („Naechster Schritt“). Eingabeschritte zeigen ein Feld: Wert eintippen (Komma erlaubt),
   * „Pruefen“ vergleicht mit dem Sollwert; nach zwei Fehlversuchen laesst sich die Loesung zeigen. Fading: Zahl der Eingaben je Beispiel steigt. */
  function wkFmt(x, d) { return (+x).toFixed(d === undefined ? 2 : d).replace('.', ','); }
  register('worked', {
    mount: function (el, v) {
      var ex = v.examples, cur = 0;
      el.innerHTML = '<div class="wk"><div class="wk-tabs">' + ex.map(function (e, i) { return '<button class="btn small" data-wk-tab="' + i + '">' + (i + 1) + '. ' + esc(e.title) + (e.steps.some(function (s) { return s.input; }) ? ' <span class="dim">(' + e.steps.filter(function (s) { return s.input; }).length + '× selbst rechnen)</span>' : '') + '</button>'; }).join('') + '</div><div class="wk-body"></div></div>';
      var body = el.querySelector('.wk-body');
      function show(k) {
        cur = k; el.querySelectorAll('[data-wk-tab]').forEach(function (b, i) { b.classList.toggle('on', i === k); });
        var e = ex[k], shown = 0;
        body.innerHTML = '<div class="wk-given">' + (e.given || []).map(function (g) { return '<span><span class="dim">' + esc(g.label) + '</span> <b class="mono">' + esc(g.value) + '</b></span>'; }).join('') + '</div><ol class="wk-steps"></ol><div class="wk-bar"><button class="btn small primary" data-wk="next">Naechster Schritt</button><span class="wk-done dim small"></span></div>';
        var ol = body.querySelector('.wk-steps'), next = body.querySelector('[data-wk="next"]'), done = body.querySelector('.wk-done');
        function reveal() {
          if (shown >= e.steps.length) return;
          var s = e.steps[shown], li = document.createElement('li'), idx = shown; shown++;
          li.className = 'wk-step' + (s.input ? ' input' : '');
          li.innerHTML = '<p>' + s.text + '</p><div class="wk-row"><span class="wk-lbl">' + esc(s.label) + '</span>' + (s.expr ? '<span class="mono wk-expr">' + esc(s.expr) + '</span>' : '') +
            (s.input ? '<span class="wk-in"><input type="text" inputmode="decimal" class="mono" placeholder="?" aria-label="' + esc(s.label) + '"> <span class="wk-unit">' + esc(s.unit || '') + '</span> <button class="btn small" data-wk="check">Pruefen</button></span><span class="wk-fb"></span>'
              : '<span class="mono wk-val">= ' + wkFmt(s.value, s.digits) + ' ' + esc(s.unit || '') + '</span>') + '</div>';
          ol.appendChild(li);
          if (s.input) {
            next.disabled = true; var tries = 0, inp = li.querySelector('input'), fb = li.querySelector('.wk-fb');
            function check() {
              var x = parseFloat(String(inp.value).replace(/s/g, '').replace(',', '.').replace(/^±/, ''));
              if (isNaN(x)) { fb.textContent = 'Bitte eine Zahl eingeben.'; fb.className = 'wk-fb bad'; return; }
              var tol = s.tol === undefined ? 0.02 : s.tol, ok = Math.abs(x - s.value) <= Math.max(Math.abs(s.value) * tol, 1e-9);
              tries++;
              if (ok) { fb.textContent = '✔ Richtig: ' + wkFmt(s.value, s.digits) + ' ' + (s.unit || ''); fb.className = 'wk-fb ok'; inp.disabled = true; li.querySelector('[data-wk="check"]').disabled = true; li.classList.add('solved'); next.disabled = false; if (idx === e.steps.length - 1) finish(); }
              else { fb.innerHTML = '✘ Das stimmt noch nicht' + (Math.abs(x) > Math.abs(s.value) ? ' (zu gross).' : ' (zu klein).') + (tries >= 2 ? ' <button class="btn small" data-wk="solve">Loesung zeigen</button>' : ' Noch einmal – ' + (s.help || 'Formel oben anwenden.')); fb.className = 'wk-fb bad';
                var sv = fb.querySelector('[data-wk="solve"]'); if (sv) sv.onclick = function () { inp.value = wkFmt(s.value, s.digits); inp.disabled = true; li.querySelector('[data-wk="check"]').disabled = true; fb.textContent = 'Loesung: ' + wkFmt(s.value, s.digits) + ' ' + (s.unit || '') + (s.solution ? ' – ' + s.solution : ''); fb.className = 'wk-fb shown'; next.disabled = false; if (idx === e.steps.length - 1) finish(); }; }
            }
            li.querySelector('[data-wk="check"]').onclick = check; inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } }); inp.focus();
          } else if (shown >= e.steps.length) finish();
        }
        function finish() { next.hidden = true; done.textContent = e.result || 'Beispiel abgeschlossen.'; if (k < ex.length - 1) done.innerHTML += ' <button class="btn small" data-wk="nextEx">Weiter zu Beispiel ' + (k + 2) + '</button>'; var b = done.querySelector('[data-wk="nextEx"]'); if (b) b.onclick = function () { show(k + 1); }; }
        next.onclick = reveal; reveal();
      }
      el.querySelectorAll('[data-wk-tab]').forEach(function (b) { b.onclick = function () { show(+b.dataset.wkTab); }; });
      show(0);
      return { show: show, get current() { return cur; } };
    },
    check: function (v) {
      var err = [];
      if (!Array.isArray(v.examples) || !v.examples.length) return ['worked: examples fehlen'];
      v.examples.forEach(function (e, i) {
        if (!e.title || !Array.isArray(e.steps) || !e.steps.length) err.push('worked: Beispiel ' + (i + 1) + ' braucht title und steps');
        (e.steps || []).forEach(function (s, k) { if (!s.text || !s.label) err.push('worked: Beispiel ' + (i + 1) + ' Schritt ' + (k + 1) + ' braucht text und label'); if (typeof s.value !== 'number' || !isFinite(s.value)) err.push('worked: Beispiel ' + (i + 1) + ' Schritt ' + (k + 1) + ': value muss eine Zahl sein'); });
      });
      var n = v.examples.map(function (e) { return e.steps.filter(function (s) { return s.input; }).length; });
      for (var i = 1; i < n.length; i++) if (n[i] < n[i - 1]) err.push('worked: Fading – Beispiel ' + (i + 1) + ' hat weniger Eingabeschritte als Beispiel ' + i);
      return err;
    }
  });

  /* ---------- meterwork: Messwerk-Animation (Kapitel 16) ----------
   * {type:'meterwork', imax? (Skalenendwert, Standard 10 mA), predict?: {q, options:[…], correct, explain}, signal? ('dc'|'sine'|'triangle'|'square'), damping? (true)}
   * Zwei Instrumente nebeneinander: Drehspul (Antriebsmoment k1·I gegen Federmoment D·φ → φ ~ I, lineare Skala) und Dreheisen
   * (Abstossung ~ I² → φ ~ I², gestauchte Skala). Der Zeiger ist ein gedaempfter Schwinger: J·φ'' = M(I) − D·φ − b·φ' –
   * ohne Daempfung schwingt er ueber und pendelt aus. Bei Wechselstrom laeuft oben ein Punkt die Kurve entlang (verlangsamt);
   * das Drehspulwerk hat einen Gleichrichter (Moment ~ |i|, Skala × 1,11 = AVG-Prinzip aus T3B), das Dreheisenwerk zeigt den Effektivwert. */
  var MW = { rms: { sine: 1 / Math.SQRT2, triangle: 1 / Math.sqrt(3), square: 1, dc: 1 }, avg: { sine: 2 / Math.PI, triangle: 0.5, square: 1, dc: 1 } };
  function mwWave(shape, ph) { // ph 0..1, Scheitelwert 1
    if (shape === 'sine') return Math.sin(2 * Math.PI * ph);
    if (shape === 'square') return ph < 0.5 ? 1 : -1;
    if (shape === 'triangle') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
    return 1;
  }
  function mwFace(kind, w) { // Skalenbogen 0…Endwert: linear (Drehspul) bzw. quadratisch gestaucht (Dreheisen); Zeiger dreht um (cx, cy)
    var cx = w / 2, cy = 150, r = 112, ticks = '', labels = '';
    for (var i = 0; i <= 10; i++) {
      var x = i / 10, a = (kind === 'iron' ? x * x : x) * 90 - 45, ar = a * Math.PI / 180, big = i % 5 === 0;
      ticks += 'M' + (cx + Math.sin(ar) * r).toFixed(1) + ' ' + (cy - Math.cos(ar) * r).toFixed(1) + 'L' + (cx + Math.sin(ar) * (r - (big ? 12 : 7))).toFixed(1) + ' ' + (cy - Math.cos(ar) * (r - (big ? 12 : 7))).toFixed(1);
      if (big) labels += '<text x="' + (cx + Math.sin(ar) * (r - 22)).toFixed(1) + '" y="' + (cy - Math.cos(ar) * (r - 22) + 4).toFixed(1) + '" class="mw-num">' + (i / 10 * 100) + '</text>';
    }
    var mech = kind === 'coil'
      ? '<rect x="' + (cx - 78) + '" y="168" width="34" height="46" rx="4" fill="#c62828" opacity=".85"/><rect x="' + (cx + 44) + '" y="168" width="34" height="46" rx="4" fill="#1e88e5" opacity=".85"/>' +
        '<text x="' + (cx - 61) + '" y="198" class="mw-pole">N</text><text x="' + (cx + 61) + '" y="198" class="mw-pole">S</text>' +
        '<circle cx="' + cx + '" cy="191" r="22" fill="#4a5058"/><rect class="mw-coil" x="' + (cx - 16) + '" y="169" width="32" height="44" rx="3" fill="none" stroke="#e0b400" stroke-width="4"/>' +
        '<text x="' + cx + '" y="232" class="mw-lbl">Dauermagnet · drehbare Spule</text>'
      : '<rect x="' + (cx - 60) + '" y="166" width="120" height="50" rx="6" fill="none" stroke="#e0b400" stroke-width="5" stroke-dasharray="9 4"/>' +
        '<rect x="' + (cx - 22) + '" y="174" width="9" height="34" fill="#8d9296"/><rect class="mw-plate" x="' + (cx + 8) + '" y="174" width="9" height="34" fill="#cfd2d4"/>' +
        '<path class="mw-force" d="M' + (cx - 10) + ' 191h14" stroke="#ff8c00" stroke-width="2"/><text x="' + cx + '" y="232" class="mw-lbl">feste Spule · zwei Eisenplaettchen</text>';
    return '<svg viewBox="0 0 ' + w + ' 240" class="mw-face" aria-label="' + (kind === 'coil' ? 'Drehspulmesswerk' : 'Dreheisenmesswerk') + '">' +
      '<path d="M' + (cx + Math.sin(-Math.PI / 4) * r).toFixed(1) + ' ' + (cy - Math.cos(-Math.PI / 4) * r).toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + (cx + Math.sin(Math.PI / 4) * r).toFixed(1) + ' ' + (cy - Math.cos(Math.PI / 4) * r).toFixed(1) + '" class="mw-arc"/>' +
      '<path d="' + ticks + '" class="mw-ticks"/>' + labels + mech +
      '<g class="mw-needle" transform="rotate(-45 ' + cx + ' ' + cy + ')"><path d="M' + cx + ' ' + (cy + 14) + 'L' + cx + ' ' + (cy - r + 4) + '" stroke="#ff3333" stroke-width="2.6" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#222" stroke="#999"/></g>' +
      '<text x="' + cx + '" y="' + (cy + 34) + '" class="mw-read"></text></svg>';
  }
  register('meterwork', {
    mount: function (el, v) {
      var imax = v.imax || 10, w = 320, state = { signal: v.signal || 'dc', damp: v.damping !== false, amp: 0.6, t: 0 }, F = 8; // F: Frequenz der Wechselgroesse (verlangsamt sichtbar)
      var pred = v.predict;
      el.innerHTML = (pred ? '<div class="mw-predict"><h4>Vorhersage – erst denken, dann probieren</h4><p>' + pred.q + '</p>' + pred.options.map(function (o, i) { return '<button class="btn small" data-mwp="' + i + '">' + o + '</button>'; }).join('') + '<p class="mw-expl"></p></div>' : '') +
        '<div class="mw"' + (pred ? ' hidden' : '') + '>' +
        '<div class="mw-wave"><svg viewBox="0 0 640 70" class="mw-wsvg"><path class="mw-wpath" d=""/><circle class="mw-dot" r="5" cx="0" cy="35"/><text x="6" y="14" class="mw-lbl">Eingangsstrom i(t) – verlangsamt</text></svg></div>' +
        '<div class="mw-faces"><div><h4>Drehspulmesswerk <span class="dim">M = k₁ · I · (mit Gleichrichter)</span></h4>' + mwFace('coil', w) + '</div><div><h4>Dreheisenmesswerk <span class="dim">M = k₂ · I²</span></h4>' + mwFace('iron', w) + '</div></div>' +
        '<div class="mw-ctl"><label><span>Strom I</span><input type="range" min="0" max="1" step="0.01" value="' + state.amp + '" data-mw="amp"><b class="mono mw-i"></b></label>' +
        '<label><span>Eingang</span><select data-mw="signal">' + [['dc', 'Gleichstrom'], ['sine', 'Sinus'], ['triangle', 'Dreieck'], ['square', 'Rechteck']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === state.signal ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
        '<label><span>Daempfung</span><select data-mw="damp"><option value="1"' + (state.damp ? ' selected' : '') + '>mit (Wirbelstrom / Luftkammer)</option><option value="0"' + (state.damp ? '' : ' selected') + '>ohne – Zeiger schwingt ueber</option></select></label>' +
        '<button class="btn small" data-mw="kick" title="Strom kurz wegnehmen und wieder anlegen">Sprung</button></div>' +
        '<p class="mw-note dim small"></p></div>';
      var box = el.querySelector('.mw'), faces = el.querySelectorAll('.mw-face'), needles = el.querySelectorAll('.mw-needle'), reads = el.querySelectorAll('.mw-read'), coil = el.querySelector('.mw-coil'), plate = el.querySelector('.mw-plate'), force = el.querySelector('.mw-force');
      var wpath = el.querySelector('.mw-wpath'), dot = el.querySelector('.mw-dot'), note = el.querySelector('.mw-note'), iOut = el.querySelector('.mw-i');
      var ph = [0, 0], vel = [0, 0], raf = 0, last = 0, cx = w / 2, cy = 150;
      if (pred) el.querySelectorAll('[data-mwp]').forEach(function (b) {
        b.onclick = function () {
          var i = +b.dataset.mwp, ok = i === pred.correct;
          el.querySelectorAll('[data-mwp]').forEach(function (x) { x.disabled = true; x.classList.toggle('ok', +x.dataset.mwp === pred.correct); x.classList.toggle('bad', x === b && !ok); });
          el.querySelector('.mw-expl').innerHTML = (ok ? '✔ Richtig. ' : '✘ Nicht ganz. ') + (pred.explain || '') + ' Jetzt ausprobieren:';
          box.hidden = false; if (pred.signal) { state.signal = pred.signal; el.querySelector('[data-mw="signal"]').value = pred.signal; } start();
        };
      });
      function current(t) { return state.signal === 'dc' ? state.amp : state.amp * mwWave(state.signal, (t * F) % 1); } // in Anteilen von imax
      function torque(k, i) { return k === 0 ? Math.abs(i) * (state.signal === 'dc' ? 1 : 1.11) : i * i; } // Drehspul mit Gleichrichter (Skala mit Formfaktor), Dreheisen ~ I²
      function step(dt) {
        var sub = 8, h = dt / sub, w0 = 2 * Math.PI * 1.1, z = state.damp ? 0.75 : 0.06;
        for (var s = 0; s < sub; s++) {
          state.t += h; var i = current(state.t);
          for (var k = 0; k < 2; k++) { var acc = w0 * w0 * (torque(k, i) - ph[k]) - 2 * z * w0 * vel[k]; vel[k] += acc * h; ph[k] += vel[k] * h; if (ph[k] < -0.03) { ph[k] = -0.03; vel[k] = 0; } if (ph[k] > 1.12) { ph[k] = 1.12; vel[k] = -vel[k] * 0.3; } }
        }
      }
      function draw() {
        for (var k = 0; k < 2; k++) needles[k].setAttribute('transform', 'rotate(' + (ph[k] * 90 - 45).toFixed(2) + ' ' + cx + ' ' + cy + ')');
        var i = current(state.t), Ia = state.amp * imax;
        var show0 = state.signal === 'dc' ? Ia : Ia * MW.avg[state.signal] * 1.11, show1 = state.signal === 'dc' ? Ia : Ia * MW.rms[state.signal];
        reads[0].textContent = (state.signal === 'dc' ? 'zeigt ' : 'Anzeige (AVG-Skala) ') + show0.toFixed(2) + ' mA'; reads[1].textContent = (state.signal === 'dc' ? 'zeigt ' : 'Anzeige (Effektivwert) ') + show1.toFixed(2) + ' mA';
        coil.setAttribute('transform', 'rotate(' + (-ph[0] * 60).toFixed(1) + ' ' + cx + ' 191)'); plate.setAttribute('transform', 'rotate(' + (-ph[1] * 40).toFixed(1) + ' ' + (cx + 12) + ' 174)'); force.setAttribute('opacity', Math.min(1, 0.2 + i * i));
        iOut.textContent = (state.signal === 'dc' ? 'I = ' : 'Î = ') + Ia.toFixed(1) + ' mA';
        // Kurve oben: zwei Perioden, Punkt bei der aktuellen Phase
        var d = '', N = 128; for (var n = 0; n <= N; n++) { var t = n / N * 2, y = 35 - (state.signal === 'dc' ? state.amp : state.amp * mwWave(state.signal, t % 1)) * 28; d += (n ? 'L' : 'M') + (n / N * 640).toFixed(1) + ' ' + y.toFixed(1); }
        wpath.setAttribute('d', d);
        var phase = state.signal === 'dc' ? (state.t * 0.5) % 1 : ((state.t * F) % 1) / 2 + (Math.floor(state.t * F) % 2) * 0.5;
        dot.setAttribute('cx', (phase * 640).toFixed(1)); dot.setAttribute('cy', (35 - i * 28).toFixed(1));
        note.textContent = state.signal === 'dc' ? 'Gleichstrom: beide Zeiger stehen bei I – das Dreheisenwerk aber auf seiner gestauchten Skala.'
          : state.signal === 'sine' ? 'Sinus: Drehspul (Gleichrichtwert × 1,11) und Dreheisen (Effektivwert) zeigen gleich viel – der Formfaktor stimmt hier.'
          : state.signal === 'triangle' ? 'Dreieck: die AVG-Skala zeigt 0,555·Î, der Effektivwert ist 0,577·Î – das Drehspulwerk liegt 4 % zu tief.'
          : 'Rechteck: die AVG-Skala zeigt 1,11·Î, der Effektivwert ist Î – das Drehspulwerk liegt 11 % zu hoch.';
      }
      function loop(now) { if (!el.isConnected || box.hidden) { raf = 0; return; } var dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); draw(); raf = requestAnimationFrame(loop); }
      function start() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(loop); }
      el.querySelector('[data-mw="amp"]').oninput = function () { state.amp = +this.value; draw(); start(); };
      el.querySelector('[data-mw="signal"]').onchange = function () { state.signal = this.value; draw(); start(); };
      el.querySelector('[data-mw="damp"]').onchange = function () { state.damp = this.value === '1'; start(); };
      el.querySelector('[data-mw="kick"]').onclick = function () { var a = state.amp; state.amp = 0; step(0.4); state.amp = a; start(); };
      draw(); if (!pred) start();
      return { destroy: function () { if (raf) cancelAnimationFrame(raf); raf = 0; }, get state() { return state; }, get angles() { return ph.slice(); }, answer: function (i) { var b = el.querySelector('[data-mwp="' + i + '"]'); if (b) b.click(); } };
    },
    check: function (v) {
      var err = [];
      if (v.predict) { var p = v.predict; if (!p.q || !Array.isArray(p.options) || p.options.length < 2) err.push('meterwork: predict braucht q und mindestens 2 options'); if (!(p.correct >= 0 && p.correct < (p.options || []).length)) err.push('meterwork: predict.correct ausserhalb'); }
      if (v.signal && !MW.rms[v.signal]) err.push('meterwork: signal muss dc, sine, triangle oder square sein');
      return err;
    }
  });

  /* ---------- kmap: KV-Diagramm ----------
   * {type:'kmap', vars: 2..4, minterms:[…], dc?:[…], names? (Standard e1…en, e1 = niederwertigstes Bit), out? ('A'), edit? (Standard ja)}
   * Anordnung wie in Kapitel 8: Spalten e2 e1, Zeilen e3 bzw. e4 e3, jeweils Gray-Reihenfolge 00, 01, 11, 10.
   * „Paeckchen bilden“ sucht die minimale Ueberdeckung (Primimplikanten, kleinste Anzahl, dann wenigste Literale). */
  var GRAY = [0, 1, 3, 2];
  function kLayout(n) { // [Zeilenbits, Spaltenbits]
    return { 2: [1, 1], 3: [1, 2], 4: [2, 2] }[n];
  }
  function kCell(n, r, c) { var L = kLayout(n), cv = L[1] === 1 ? c : GRAY[c], rv = L[0] === 1 ? r : GRAY[r]; return (rv << L[1]) | cv; }
  /* Minimale Summe von Produkten: Implikant = {mask (1 = Variable faellt weg), val} */
  function minimize(n, ones, dc) {
    var N = 1 << n, on = {}, ok = {}, imps = [];
    ones.forEach(function (m) { on[m] = ok[m] = true; }); (dc || []).forEach(function (m) { ok[m] = true; });
    if (!ones.length) return [];
    for (var mask = 0; mask < N; mask++) for (var val = 0; val < N; val++) {
      if (val & mask) continue;
      var cells = [], allOk = true, anyOn = false;
      for (var m = 0; m < N; m++) if ((m & ~mask & (N - 1)) === val) { cells.push(m); if (!ok[m]) allOk = false; if (on[m]) anyOn = true; }
      if (allOk && anyOn) imps.push({ mask: mask, val: val, cells: cells });
    }
    var primes = imps.filter(function (a) { return !imps.some(function (b) { return b !== a && b.cells.length > a.cells.length && a.cells.every(function (c) { return b.cells.indexOf(c) >= 0; }); }); });
    var lits = function (p) { var k = 0; for (var i = 0; i < n; i++) if (!(p.mask >> i & 1)) k++; return k; };
    var best = null;
    (function search(start, chosen) { // exakt: kleinste Anzahl, dann wenigste Literale (bei hoechstens 4 Variablen schnell genug)
      if (best && chosen.length > best.length) return;
      var covered = ones.every(function (m) { return chosen.some(function (p) { return p.cells.indexOf(m) >= 0; }); });
      if (covered) {
        var cost = chosen.reduce(function (s, p) { return s + lits(p); }, 0);
        if (!best || chosen.length < best.length || (chosen.length === best.length && cost < best.cost)) { best = chosen.slice(); best.cost = cost; }
        return;
      }
      for (var i = start; i < primes.length; i++) { chosen.push(primes[i]); search(i + 1, chosen); chosen.pop(); }
    })(0, []);
    return best || [];
  }
  function termHtml(n, p, names) {
    var t = []; for (var i = n - 1; i >= 0; i--) { if (p.mask >> i & 1) continue; var nm = names[i]; t.push(p.val >> i & 1 ? esc(nm) : /^e\d$/.test(nm) ? 'ē' + nm.slice(1) : '<span class="ov">' + esc(nm) + '</span>'); }
    return t.length ? t.join('·') : '1';
  }
  var LOOP = ['#ffb000', '#1ec8e0', '#39ff14', '#ff5ea8', '#b48cff', '#ff8c00'];
  register('kmap', {
    mount: function (el, v) {
      var n = v.vars, L = kLayout(n), R = 1 << L[0], C = 1 << L[1], names = v.names || ['e1', 'e2', 'e3', 'e4'].slice(0, n), st = {};
      (v.minterms || []).forEach(function (m) { st[m] = 1; }); (v.dc || []).forEach(function (m) { st[m] = 'X'; });
      var cw = 58, ch = 44, ox = L[0] === 2 ? 104 : 74, oy = 40, groups = null; // ox: Platz fuer die Zeilenbeschriftung (bei 4 Variablen zwei Namen)
      function lbl(bitsN, k, first) { var g = bitsN === 1 ? k : GRAY[k], s = []; for (var i = bitsN - 1; i >= 0; i--) { var nm = names[first + i]; s.push(g >> i & 1 ? nm : 'ē' + nm.slice(1)); } return s.join(' '); }
      function svg() {
        var s = '<svg class="kv" viewBox="0 0 ' + (ox + C * cw + 20) + ' ' + (oy + R * ch + 20) + '">';
        for (var c = 0; c < C; c++) s += '<text class="kv-h" x="' + (ox + c * cw + cw / 2) + '" y="' + (oy - 10) + '">' + lbl(L[1], c, 0) + '</text>';
        for (var r = 0; r < R; r++) s += '<text class="kv-h" x="' + (ox - 10) + '" y="' + (oy + r * ch + ch / 2 + 5) + '" text-anchor="end">' + lbl(L[0], r, L[1]) + '</text>';
        for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
          var m = kCell(n, r, c), val = st[m] || 0;
          s += '<g class="kv-cell' + (v.edit !== false ? ' edit' : '') + '" data-m="' + m + '"><rect x="' + (ox + c * cw) + '" y="' + (oy + r * ch) + '" width="' + cw + '" height="' + ch + '"/>' +
            '<text class="kv-v' + (val === 1 ? ' one' : val === 'X' ? ' dc' : '') + '" x="' + (ox + c * cw + cw / 2) + '" y="' + (oy + r * ch + ch / 2 + 7) + '">' + val + '</text><text class="kv-m" x="' + (ox + c * cw + 5) + '" y="' + (oy + r * ch + 12) + '">' + m + '</text></g>';
        }
        (groups || []).forEach(function (p, gi) { s += loop(p, gi); });
        return s + '</svg>';
      }
      function loop(p, gi) { // Rechteck(e) um die Felder eines Paeckchens; ueber den Rand in Teilstuecken
        var rows = {}, cols = {}, col = LOOP[gi % LOOP.length], ins = 4 + (gi % 3) * 3, out = '';
        for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) if (p.cells.indexOf(kCell(n, r, c)) >= 0) { rows[r] = 1; cols[c] = 1; }
        function segs(set, len) { var ks = Object.keys(set).map(Number).sort(function (a, b) { return a - b; }), res = [], cur = null; ks.forEach(function (k) { if (cur && k === cur[1] + 1) cur[1] = k; else { cur = [k, k]; res.push(cur); } }); return res; }
        segs(rows, R).forEach(function (rs) { segs(cols, C).forEach(function (cs) {
          out += '<rect class="kv-loop" x="' + (ox + cs[0] * cw + ins) + '" y="' + (oy + rs[0] * ch + ins) + '" width="' + ((cs[1] - cs[0] + 1) * cw - 2 * ins) + '" height="' + ((rs[1] - rs[0] + 1) * ch - 2 * ins) + '" rx="14" style="stroke:' + col + '"/>';
        }); });
        return out;
      }
      el.innerHTML = '<div class="kvw"><div class="kv-svg"></div><div class="kv-side"><p class="dim small">' + (v.edit !== false ? 'Feld anklicken: 0 → 1 → X → 0' : '') + '</p>' +
        '<button class="btn small primary" data-kv="g">Paeckchen bilden</button> <button class="btn small" data-kv="c">Leeren</button><div class="kv-term"></div></div></div>';
      var box = el.querySelector('.kv-svg'), term = el.querySelector('.kv-term');
      function draw() {
        box.innerHTML = svg();
        if (v.edit !== false) Array.prototype.forEach.call(box.querySelectorAll('[data-m]'), function (g) {
          g.onclick = function () { var m = +g.dataset.m, cur = st[m] || 0; st[m] = cur === 0 ? 1 : cur === 1 ? 'X' : 0; if (!st[m]) delete st[m]; groups = null; term.innerHTML = ''; draw(); };
        });
      }
      el.querySelector('[data-kv="g"]').onclick = function () {
        var ones = [], dc = []; Object.keys(st).forEach(function (m) { if (st[m] === 1) ones.push(+m); else dc.push(+m); });
        groups = minimize(n, ones, dc); draw();
        term.innerHTML = '<b>' + esc(v.out || 'A') + ' = </b>' + (groups.length ? groups.map(function (p, gi) { return '<span style="color:' + LOOP[gi % LOOP.length] + '">' + termHtml(n, p, names) + '</span>'; }).join(' ∨ ') : '0') +
          '<p class="dim small">' + (groups.length ? groups.length + ' Paeckchen – je Paeckchen fallen die Variablen weg, die sich darin aendern.' : 'Keine Einsen – der Ausgang ist immer 0.') + '</p>';
      };
      el.querySelector('[data-kv="c"]').onclick = function () { st = {}; groups = null; term.innerHTML = ''; draw(); };
      draw();
      return null;
    },
    check: function (v) {
      var err = [];
      if (!(v.vars >= 2 && v.vars <= 4)) return ['kmap: vars muss 2, 3 oder 4 sein'];
      [].concat(v.minterms || [], v.dc || []).forEach(function (m) { if (!(m >= 0 && m < (1 << v.vars))) err.push('kmap: Minterm ' + m + ' ausserhalb 0…' + ((1 << v.vars) - 1)); });
      return err;
    }
  });

  /* ---------- bode: Frequenzgang ----------
   * {type:'bode', stages:[{kind:'lp'|'hp', r, c}, …], fmin?, fmax?, f? (Startwert Cursor)}
   * Kette aus RC-Stufen wie in Kapitel 14 (unbelastet hintereinander – Stufe 2 belastet Stufe 1): exakt mit komplexen
   * Widerstaenden gerechnet. Der Validator vergleicht die Kurve mit der Engine (E.acMeasure an der echten Schaltung). */
  function cx(re, im) { return { re: re, im: im || 0 }; }
  function cadd(a, b) { return cx(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cdiv(a, b) { var d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
  function cpar(a, b) { return b === null ? a : cdiv(cmul(a, b), cadd(a, b)); } // b = null: offen
  function transfer(stages, f) { // U_a / U_e als komplexe Zahl
    var w = 2 * Math.PI * f, zin = null, h = cx(1, 0);
    for (var k = stages.length - 1; k >= 0; k--) {
      var s = stages[k], zr = cx(s.r, 0), zc = cx(0, -1 / (w * s.c));
      var zs = s.kind === 'lp' ? zr : zc, zp = s.kind === 'lp' ? zc : zr, zpar = cpar(zp, zin);
      h = cmul(h, cdiv(zpar, cadd(zs, zpar))); zin = cadd(zs, zpar);
    }
    return h;
  }
  function fgOf(s) { return 1 / (2 * Math.PI * s.r * s.c); }
  function bodeRange(v) {
    var fgs = v.stages.map(fgOf), lo = Math.min.apply(null, fgs), hi = Math.max.apply(null, fgs);
    return [v.fmin || Math.pow(10, Math.floor(Math.log10(lo / 30))), v.fmax || Math.pow(10, Math.ceil(Math.log10(hi * 30)))];
  }
  /* Echte Schaltung zu den Stufen (fuer den Vergleich mit der Engine): G1 → Stufe 1 → Stufe 2 …, Ausgang am letzten Querglied */
  function bodeLayout(stages, f) {
    var P = [{ id: 'G1', type: 'acsource', value: 10, props: { freq: f, shape: 'sine', offset: 0 } }], Wr = [], node = 'G1.p', out = null;
    stages.forEach(function (s, k) {
      var ser = { id: 'S' + k, type: s.kind === 'lp' ? 'resistor' : 'capacitor', value: s.kind === 'lp' ? s.r : s.c };
      var sh = { id: 'P' + k, type: s.kind === 'lp' ? 'capacitor' : 'resistor', value: s.kind === 'lp' ? s.c : s.r };
      P.push(ser, sh); Wr.push({ from: node, to: ser.id + '.a' }, { from: ser.id + '.b', to: sh.id + '.a' }, { from: sh.id + '.b', to: 'G1.n' });
      node = ser.id + '.b'; out = sh.id + '.a';
    });
    return { layout: { parts: P, wires: Wr }, out: out };
  }
  function fmtF(f) { return f >= 1000 ? +(f / 1000).toPrecision(3) + ' kHz' : +f.toPrecision(3) + ' Hz'; }
  register('bode', {
    mount: function (el, v) {
      var rg = bodeRange(v), W = 560, H = 250, L = 52, T = 14, Rm = 30, B = 34, lo = Math.log10(rg[0]), hi = Math.log10(rg[1]), dbMin = v.dbMin || -60;
      var X = function (f) { return L + (Math.log10(f) - lo) / (hi - lo) * (W - L - Rm); }, Y = function (db) { return T + (0 - Math.max(dbMin, db)) / (0 - dbMin) * (H - T - B); };
      var s = '<svg class="bode" viewBox="0 0 ' + W + ' ' + H + '">', k, d = '';
      for (var e = Math.ceil(lo); e <= Math.floor(hi); e++) s += '<line class="bode-g" x1="' + X(Math.pow(10, e)) + '" x2="' + X(Math.pow(10, e)) + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="bode-t" x="' + X(Math.pow(10, e)) + '" y="' + (H - B + 16) + '">' + fmtF(Math.pow(10, e)) + '</text>';
      for (var db = 0; db >= dbMin; db -= 20) s += '<line class="bode-g" x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(db) + '" y2="' + Y(db) + '"/><text class="bode-t" x="' + (L - 6) + '" y="' + (Y(db) + 4) + '" text-anchor="end">' + db + ' dB</text>';
      s += '<line class="bode-3" x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(-3) + '" y2="' + Y(-3) + '"/><text class="bode-3t" x="' + (W - Rm) + '" y="' + (Y(-3) - 4) + '" text-anchor="end">−3 dB</text>';
      v.stages.forEach(function (st) { var fg = fgOf(st), x = X(fg); s += '<line class="bode-fg" x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="bode-fgt" x="' + (x + 4) + '" y="' + (T + 12) + '">f_g ' + fmtF(fg) + '</text>'; });
      for (k = 0; k <= 200; k++) { var f = Math.pow(10, lo + (hi - lo) * k / 200), m = transfer(v.stages, f), g = 20 * Math.log10(Math.hypot(m.re, m.im)); d += (k ? 'L' : 'M') + X(f).toFixed(1) + ' ' + Y(g).toFixed(1); }
      s += '<path class="bode-c" d="' + d + '"/><g class="bode-cur"><line class="bode-cl" y1="' + T + '" y2="' + (H - B) + '"/><circle class="bode-cd" r="5"/></g></svg>';
      var f0 = v.f || fgOf(v.stages[0]);
      el.innerHTML = '<div class="bodew">' + s + '<label class="mini-sl"><span>Frequenz</span><input type="range" min="' + lo + '" max="' + hi + '" step="0.005" value="' + Math.log10(f0) + '"><b class="mono"></b></label><div class="mini-ro bode-ro"></div></div>';
      var inp = el.querySelector('input'), out = el.querySelector('.mini-sl b'), ro = el.querySelector('.bode-ro'), cur = el.querySelector('.bode-cur'), cl = el.querySelector('.bode-cl'), cd = el.querySelector('.bode-cd');
      function upd() {
        var f = Math.pow(10, +inp.value), m = transfer(v.stages, f), a = Math.hypot(m.re, m.im), g = 20 * Math.log10(a), ph = Math.atan2(m.im, m.re) * 180 / Math.PI;
        out.textContent = fmtF(f); cl.setAttribute('x1', X(f)); cl.setAttribute('x2', X(f)); cd.setAttribute('cx', X(f)); cd.setAttribute('cy', Y(g));
        ro.innerHTML = '<span><b>U<sub>a</sub> / U<sub>e</sub></b> <span class="mono">' + (a * 100).toFixed(1) + ' %</span></span><span><b>Verstaerkung</b> <span class="mono">' + g.toFixed(1) + ' dB</span></span><span><b>Phase</b> <span class="mono">' + ph.toFixed(0) + '°</span></span>';
        void cur;
      }
      inp.oninput = upd; upd();
      return null;
    },
    check: function (v, E) {
      if (!Array.isArray(v.stages) || !v.stages.length) return ['bode: stages [{kind, r, c}] fehlt'];
      var err = [];
      v.stages.forEach(function (s, k) { if ((s.kind !== 'lp' && s.kind !== 'hp') || !(s.r > 0) || !(s.c > 0)) err.push('bode: Stufe ' + (k + 1) + ' braucht kind lp|hp, r > 0, c > 0'); });
      if (err.length || !E || !E.acMeasure) return err;
      v.stages.map(fgOf).forEach(function (f) { // Kurve = Engine? An jeder Grenzfrequenz nachmessen
        var b = bodeLayout(v.stages, f), m = E.acMeasure(b.layout, { a: b.out, b: 'G1.n' }), eng = m.rms / (10 / Math.SQRT2), t = transfer(v.stages, f), mine = Math.hypot(t.re, t.im);
        if (Math.abs(eng - mine) > Math.max(0.02 * mine, 0.005)) err.push('bode: weicht bei ' + fmtF(f) + ' von der Engine ab (' + mine.toFixed(3) + ' statt ' + eng.toFixed(3) + ')');
      });
      return err;
    }
  });

  root.DQVisuals = { transfer: transfer, bodeLayout: bodeLayout, minimize: minimize, gen: GEN, register: register, mount: mount, mountAll: mountAll, lessonHtml: lessonHtml, check: check, listOf: listOf, types: function () { return Object.keys(TYPES); } };
})(typeof window !== 'undefined' ? window : globalThis);

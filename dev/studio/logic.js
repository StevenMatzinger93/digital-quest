/* Digital Quest Studio – Fenster «Logik» (Nacht-Pakete 8 und 9)
 * Wahrheitstabelle und KV-Diagramm aus der Schaltung (Pegelschalter = Eingänge, Logikanzeigen = Ausgänge, alle Kombinationen werden durchgerechnet),
 * Minimalform; Boolescher Ausdruck eingeben → Schaltung erzeugen, Schaltung → Ausdruck ablesen. Schreibweise des Lehrmittels (bool.js).
 * Das KV-Diagramm zeichnet DQVisuals (kmap) aus dem Spiel, Tabellen LG.table aus content/_logic.js – beides wird genutzt, nicht neu gebaut. */
(function (root) {
  'use strict';
  var S = root.Studio, B = root.DQStudioBool, E = S.E;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var win = null;

  /* Tabelle, KV-Diagramme, Minimalform für die aktuelle Schaltung; gibt auch die Rechendaten zurück (für Tests) */
  S.logicAnalyse = function (layout, host) {
    var t = B.circuitTable(layout || S.core.layout), out = { table: t, forms: [] };
    if (host) host.innerHTML = '';
    if (t.error) { if (host) host.innerHTML = '<p class="warnbox">' + esc(t.error) + '</p>'; return out; }
    var n = t.inputs.length, names = t.inputs.map(function (x) { return x.n; }), outNames = t.outputs.length === 1 ? ['A'] : t.outputs.map(function (o, i) { return 'A' + (i + 1); });
    var kOf = function (b) { var k = 0; b.forEach(function (v, i) { k += v << i; }); return k; };
    var html = '';
    if (t.sequential) html += '<p class="warnbox">Die Schaltung enthält Flipflops, Zähler oder einen Taktgeber: Die Tabelle gilt nur, solange sich nichts merkt. Sie zeigt den Zustand beim Einschalten.</p>';
    var tbl = root.LG.table(n, function (b) { return t.rows[kOf(b)]; }, { outs: outNames });
    // Kopfzeile: E<n> → e<Nummer des Eingangs> (höchstwertiger Eingang links)
    var hi = 0; tbl = tbl.replace(/<th>E\d+<\/th>/g, function () { var nm = names[n - 1 - hi]; hi++; return '<th>e' + nm + '</th>'; });
    html += '<div class="lg-sec"><b>Wahrheitstabelle</b> <span class="hint">(Eingänge: ' + t.inputs.map(function (x) { return x.id + ' = e' + x.n; }).join(', ') + '; Ausgänge: ' + t.outputs.map(function (o, i) { return o.id + ' = ' + outNames[i]; }).join(', ') + ')</span>' + tbl + '</div>';
    t.outputs.forEach(function (o, j) {
      var ones = []; t.rows.forEach(function (r, k) { if (r[j]) ones.push(k); });
      var expr = B.minimalExpr(ones, names); out.forms.push({ name: outNames[j], ones: ones, expr: expr });
      html += '<div class="lg-sec"><b>' + outNames[j] + ' minimal:</b> <span class="lg-expr">' + outNames[j] + ' = ' + B.fmtHtml(expr) + '</span>' + (n >= 2 && n <= 4 ? '<div class="lg-kv" data-j="' + j + '"></div>' : '<p class="hint">KV-Diagramm gibt es für 2 bis 4 Eingänge.</p>') + '</div>';
    });
    if (host) {
      host.innerHTML = html;
      Array.prototype.forEach.call(host.querySelectorAll('.lg-kv'), function (el) {
        var j = +el.dataset.j, ones = out.forms[j].ones;
        root.DQVisuals.mount(el, { type: 'kmap', vars: n, minterms: ones, names: names.map(function (x) { return 'e' + x; }), out: outNames[j], edit: false });
        var g = el.querySelector('[data-kv="g"]'); if (g) g.click(); // Päckchen gleich bilden
        var clr = el.querySelector('[data-kv="c"]'); if (clr) clr.hidden = true;
      });
    }
    return out;
  };

  /* Ausdruck → Schaltung: ersetzt die Zeichenfläche (rückgängig mit Strg+Z) */
  S.logicFromExpr = function (text) {
    var p = B.parse(text), c = B.buildCircuit(p.ast);
    S.loadLayout(c.layout, { run: false }); S.name = p.name + ' = ' + B.fmtText(p.ast); S.updateTitle && S.updateTitle();
    return { parsed: p, circuit: c };
  };
  S.logicToExpr = function () { var outs = B.outputsOf(S.core.layout); if (!outs.length) throw new Error('Keine Logikanzeige und kein freier Gatterausgang: nichts abzulesen.'); return outs.map(function (o) { return { id: o.id, ast: B.readCircuit(S.core.layout, o.pin) }; }); };

  function open() {
    if (win) { win.style.display = ''; return win; }
    var el = win = document.createElement('div'); el.className = 'fwin'; el.style.cssText = 'left:' + Math.max(8, root.innerWidth - 700 - 330) + 'px;top:150px;width:680px;height:560px';
    el.innerHTML = '<div class="fh"><b>Logik: Ausdruck, Tabelle, KV-Diagramm</b><button data-a="close" title="Fenster schliessen" aria-label="Schliessen">×</button></div><div class="fb" style="overflow:auto;padding:10px 14px">' +
      '<div class="lg-sec"><label for="lgExpr"><b>Boolescher Ausdruck</b></label><input id="lgExpr" class="tin" style="width:100%;margin:4px 0" placeholder="A = e1 ( e2 v e3 )" value="A = e1 ( e2 v e3 )" autocomplete="off" spellcheck="false">' +
      '<p class="hint">ODER = <b>v</b> (auch +), UND = Nebeneinanderstellen (auch *), NICHT = Überstreichung, getippt <b>/e1</b> oder <b>!e1</b>. Eingänge e1, e2 …, UND kommt vor ODER.</p>' +
      '<p><button class="tb run" data-a="build">Schaltung erzeugen</button> <button class="tb" data-a="read">Ausdruck aus der Schaltung ablesen</button> <button class="tb" data-a="table">Wahrheitstabelle und KV-Diagramm</button></p><div id="lgMsg" class="lg-msg" aria-live="polite"></div></div><div id="lgOut"></div></div>';
    document.getElementById('floats').appendChild(el);
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a, msg = $('#lgMsg', el);
      try {
        if (a === 'close') { el.style.display = 'none'; return; }
        if (a === 'build') { var r = S.logicFromExpr($('#lgExpr', el).value), eq = r.parsed.exprs.length > 1; msg.className = 'lg-msg'; msg.innerHTML = '<b>' + esc(r.parsed.name) + ' = ' + B.fmtHtml(r.parsed.ast) + '</b>' + (eq ? '<br>' + (r.parsed.exprs.every(function (x) { return B.equivalent(x, r.parsed.ast); }) ? '✓ Alle Seiten der Gleichung sind logisch gleichwertig.' : '✗ Die Seiten der Gleichung sind <b>nicht</b> gleichwertig.') : '') + '<br>Schaltung mit ' + S.core.layout.parts.length + ' Bauteilen erzeugt (Strg+Z macht es rückgängig).'; $('#lgOut', el).innerHTML = ''; }
        if (a === 'read') { var rs = S.logicToExpr(); msg.className = 'lg-msg'; msg.innerHTML = rs.map(function (x, i) { return '<b>' + (rs.length === 1 ? 'A' : 'A' + (i + 1)) + ' = ' + B.fmtHtml(x.ast) + '</b> <span class="hint">(' + x.id + ')</span>'; }).join('<br>'); }
        if (a === 'table') { msg.innerHTML = ''; S.logicAnalyse(null, $('#lgOut', el)); }
      } catch (e) { msg.className = 'lg-msg err'; msg.textContent = e.message; }
    });
    $('#lgExpr', el).addEventListener('keydown', function (ev) { if (ev.key === 'Enter') $('[data-a="build"]', el).click(); ev.stopPropagation(); });
    var drag = null, fh = $('.fh', el);
    fh.addEventListener('pointerdown', function (ev) { if (ev.target.closest('button')) return; drag = { x: ev.clientX - el.offsetLeft, y: ev.clientY - el.offsetTop }; fh.setPointerCapture(ev.pointerId); });
    fh.addEventListener('pointermove', function (ev) { if (!drag) return; el.style.left = Math.max(-200, Math.min(root.innerWidth - 60, ev.clientX - drag.x)) + 'px'; el.style.top = Math.max(0, Math.min(root.innerHeight - 40, ev.clientY - drag.y)) + 'px'; });
    fh.addEventListener('pointerup', function () { drag = null; });
    return el;
  }
  S.openLogic = open;
  S.initFns.push(function () { var b = $('#btnLogic'); if (b) b.addEventListener('click', open); });
})(window);

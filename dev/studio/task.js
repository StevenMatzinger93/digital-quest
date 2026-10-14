/* Digital Quest Studio – Aufgabe stellen (Nacht-Paket 11)
 * Steven baut die richtige Schaltung und gibt sie als Aufgabe weiter:
 *  – Werte verbergen: einzelne Bauteilwerte stehen nicht im Klartext in der Aufgabendatei; die Schaltung rechnet trotzdem mit ihnen (die Lernenden messen
 *    und tragen den Wert ein). Die Datei enthält sie nur verschleiert (XOR mit der Aufgabennummer, Base64): das schützt vor dem Hinsehen im Texteditor,
 *    nicht vor jemandem, der die Datei mit einem Programm entschlüsselt.
 *  – Störung einbauen: Leitung unterbrechen, falscher Wert, vertauschte Anschlüsse. Die Störung wirkt in der Aufgabe, steht dort aber nirgends.
 *  – Lösung getrennt: eigene Lösungsdatei (richtige Schaltung, Werte, Störungen mit Ursache und Symptom, Aufbau wie `bugs` in web/data/dq_live.json).
 * Formate: «dqstudio-aufgabe» und «dqstudio-loesung», je Version 1. Kein DOM in buildTask() (Node-tauglich). */
(function (root) {
  'use strict';
  var S = root.Studio, E = root.DQEngine || (S && S.E);
  var TASK = 'dqstudio-aufgabe', SOL = 'dqstudio-loesung';
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function utf8(str) { return unescape(encodeURIComponent(str)); } function unutf8(b) { return decodeURIComponent(escape(b)); }
  function b64(s) { return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); }
  function unb64(s) { return typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); }
  function xor(str, key) { var o = ''; for (var i = 0; i < str.length; i++) o += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length)); return o; }
  function encode(obj, id) { return b64(xor(utf8(JSON.stringify(obj)), id)); }
  function decode(s, id) { return JSON.parse(unutf8(xor(unb64(s), id))); }
  function getv(p, k) { if (k === 'value') return p.value !== undefined ? p.value : (p.props && p.props.value !== undefined ? p.props.value : E.PARTS[p.type].props.value); return p.props && p.props[k] !== undefined ? p.props[k] : E.PARTS[p.type].props[k]; }
  function setv(p, k, v) { if (k === 'value') { p.value = v; if (p.props) delete p.props.value; } else { p.props = p.props || {}; p.props[k] = v; } }
  function newId() { var s = ''; for (var i = 0; i < 3; i++) s += Math.floor(Math.random() * 46656).toString(36).padStart(3, '0'); return s; }

  /* Unterschiede zwischen richtiger und gestörter Schaltung in Worten (Symptom) */
  function symptom(good, bad) {
    try {
      var a = E.analyze(clone(good)), b = E.analyze(clone(bad)), out = [];
      Object.keys(a.parts).forEach(function (id) {
        var x = a.parts[id], y = b.parts[id]; if (!y) return;
        if (x.on !== undefined && x.on !== y.on) out.push(id + (y.on ? ' leuchtet' : ' leuchtet nicht') + ' (richtig: ' + (x.on ? 'an' : 'aus') + ')');
        else if (x.out !== undefined && !Array.isArray(x.out) && x.out !== y.out) out.push(id + ' liefert ' + (y.out ? '1' : '0') + ' statt ' + (x.out ? '1' : '0'));
        else if (x.i !== undefined && Math.abs(x.i - y.i) > Math.max(1e-6, 0.05 * Math.abs(x.i))) out.push(id + ': Strom ' + E.fmt(Math.abs(y.i), 'A') + ' statt ' + E.fmt(Math.abs(x.i), 'A'));
      });
      return out.length ? 'Gegenüber der richtigen Schaltung weichen ab: ' + out.slice(0, 6).join('; ') + '.' : 'Die Störung ist von aussen kaum zu sehen.';
    } catch (e) { return 'Symptom nicht berechenbar: ' + e.message; }
  }

  /* opts: {title, text, hide:[{part, prop}], faults:[{type:'open', wire:index} | {type:'value', part, prop, value} | {type:'swap', part, a, b}]}
   * Gibt {task, solution, taskText, solutionText} */
  function buildTask(layout, opts) {
    opts = opts || {}; var id = newId(), good = clone(layout), work = clone(layout), hidden = {}, faults = [];
    // 1. Störungen auf die Aufgabenschaltung anwenden (Werte der richtigen Schaltung merken)
    (opts.faults || []).forEach(function (f) {
      if (f.type === 'open') { var w = work.wires[f.wire]; if (!w) throw new Error('Leitung ' + f.wire + ' gibt es nicht.'); work.wires.splice(f.wire, 1); faults.push({ type: 'open', cause: 'Leitung ' + w.from + ' – ' + w.to + ' unterbrochen', wire: { from: w.from, to: w.to } }); }
      else if (f.type === 'value') { var p = work.parts.filter(function (x) { return x.id === f.part; })[0]; if (!p) throw new Error('Bauteil ' + f.part + ' gibt es nicht.'); var old = getv(p, f.prop); setv(p, f.prop, f.value); faults.push({ type: 'value', cause: 'falscher Wert: ' + f.part + ' ' + f.prop + ' = ' + f.value + ' statt ' + old, part: f.part, prop: f.prop, wrong: f.value, right: old }); }
      else if (f.type === 'swap') {
        var q = work.parts.filter(function (x) { return x.id === f.part; })[0]; if (!q) throw new Error('Bauteil ' + f.part + ' gibt es nicht.'); var A = f.part + '.' + f.a, Bp = f.part + '.' + f.b;
        work.wires.forEach(function (w) { if (w.from === A) w.from = Bp; else if (w.from === Bp) w.from = A; if (w.to === A) w.to = Bp; else if (w.to === Bp) w.to = A; });
        faults.push({ type: 'swap', cause: 'Anschlüsse vertauscht: ' + A + ' und ' + Bp, part: f.part, a: f.a, b: f.b });
      } else throw new Error('Unbekannte Störung ' + f.type);
    });
    // 2. Werte verbergen: echte Werte (der gestörten Schaltung) verschleiert ablegen, im Klartext steht nichts
    var hide = (opts.hide || []).map(function (h) { var p = work.parts.filter(function (x) { return x.id === h.part; })[0]; if (!p) throw new Error('Bauteil ' + h.part + ' gibt es nicht.'); hidden[h.part + '.' + h.prop] = getv(p, h.prop); setv(p, h.prop, 0); return { part: h.part, prop: h.prop }; });
    var task = { format: TASK, version: 1, id: id, title: opts.title || 'Aufgabe', text: opts.text || '', hide: hide, hiddenData: hide.length ? encode(hidden, id) : '', layout: work, created: new Date().toISOString() };
    var trueHidden = {}; hide.forEach(function (h) { trueHidden[h.part + '.' + h.prop] = getv(good.parts.filter(function (x) { return x.id === h.part; })[0], h.prop); });
    var solution = { format: SOL, version: 1, taskId: id, title: task.title, text: task.text, layout: good, values: trueHidden, faults: faults.map(function (f) { f.symptom = symptom(good, work); return f; }) };
    // Werte in der Lösung sind die der richtigen Schaltung (bei «falscher Wert» auf einem verborgenen Wert entscheidet die richtige Schaltung)
    return { task: task, solution: solution, taskText: JSON.stringify(task, null, 1), solutionText: JSON.stringify(solution, null, 1) };
  }
  /* Aufgabe laden: gibt {layout (mit den echten verborgenen Werten), hide, values, title, text, id} */
  function openTask(task) {
    var lay = clone(task.layout), vals = task.hiddenData ? decode(task.hiddenData, task.id) : {};
    (task.hide || []).forEach(function (h) { var p = lay.parts.filter(function (x) { return x.id === h.part; })[0]; if (p) setv(p, h.prop, vals[h.part + '.' + h.prop]); });
    return { layout: lay, hide: task.hide || [], values: vals, title: task.title, text: task.text, id: task.id };
  }
  var api = { buildTask: buildTask, openTask: openTask, TASK: TASK, SOL: SOL, decode: decode };
  root.DQStudioTask = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!S || !S.initFns) return;

  /* ---------- Studio: Oberfläche ---------- */
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  S.task = null;
  S.isHidden = function (id, prop) { return !!(S.task && S.task.hide.some(function (h) { return h.part === id && h.prop === prop; })); };
  S.openTaskObject = function (t) {
    var o = openTask(t); S.loadLayout(o.layout, { run: false }); S.name = o.title; S.updateTitle();
    S.task = { id: o.id, title: o.title, text: o.text, hide: o.hide, values: o.values, answers: t.answers || {}, ok: {} };
    Object.keys(S.task.answers).forEach(function (k) { S.checkAnswer(k, S.task.answers[k]); });
    root.DQEditor.mask = function (p) { return S.task && S.task.hide.some(function (h) { return h.part === p.id && h.prop === 'value'; }) ? '? ' + ({ resistor: 'Ω', pot: 'Ω', lamp: 'Ω', motor: 'Ω', capacitor: 'F', inductor: 'H', battery: 'V', acsource: 'V' }[p.type] || '') : undefined; };
    S.renderTaskPanel(); S.redraw(); return o;
  };
  S.closeTask = function () { S.task = null; root.DQEditor.mask = null; var w = $('#taskPanel'); if (w) w.remove(); S.redraw(); };
  S.checkAnswer = function (key, text) {
    var v = S.task.values[key], a = S.parseSI(text); if (!isFinite(a)) return false; var ok = Math.abs(a - v) <= Math.max(0.05 * Math.abs(v), 1e-12); S.task.answers[key] = text; S.task.ok[key] = ok; return ok;
  };
  S.renderTaskPanel = function () {
    var t = S.task; if (!t) return; var w = $('#taskPanel');
    if (!w) { w = document.createElement('div'); w.id = 'taskPanel'; w.className = 'fwin'; w.style.cssText = 'left:240px;top:150px;width:420px;height:380px'; document.getElementById('floats').appendChild(w); w.addEventListener('pointerdown', function () { w.style.zIndex = 5; }); }
    var rows = t.hide.map(function (h) { var key = h.part + '.' + h.prop, f = (S.FIELDS[S.core.part(h.part).type] || []).filter(function (x) { return x.k === h.prop; })[0];
      return '<tr><td>' + esc(h.part) + '</td><td>' + esc(f ? f.l : h.prop) + '</td><td><input class="tin" data-key="' + key + '" value="' + esc(t.answers[key] || '') + '" placeholder="Wert?" style="width:100px;min-height:40px"> <span class="tk" data-k="' + key + '">' + (t.ok[key] === true ? '✓ stimmt' : t.ok[key] === false ? '✗ nicht ganz' : '') + '</span></td></tr>'; }).join('');
    w.innerHTML = '<div class="fh"><b>Aufgabe: ' + esc(t.title) + '</b><button data-a="close" title="Aufgabe schliessen" aria-label="Schliessen">×</button></div><div class="fb" style="padding:10px 14px;overflow:auto"><p>' + esc(t.text) + '</p>' +
      (rows ? '<h3>Verborgene Werte</h3><table class="itab" style="font-family:var(--font-ui);font-size:14px"><thead><tr><th>Bauteil</th><th>Grösse</th><th>Dein Wert</th></tr></thead><tbody>' + rows + '</tbody></table><p class="hint">Miss den Wert am Bauteil nach (Messen, Oszilloskop, Spannungen) und trage ihn ein: 4k7, 100n … Toleranz 5 %.</p>' : '') +
      '<p><button class="tb" data-a="sol">Lösung öffnen …</button></p></div>';
    w.onclick = function (ev) { var b = ev.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'close') S.closeTask(); if (b.dataset.a === 'sol') S.openDialog(); };
    w.onchange = function (ev) { var k = ev.target.dataset.key; if (!k) return; var ok = S.checkAnswer(k, ev.target.value), m = w.querySelector('[data-k="' + k + '"]'); if (m) m.textContent = ok ? '✓ stimmt' : '✗ nicht ganz'; };
  };
  /* Lösungsdatei öffnen: richtige Schaltung laden und die Störungen nennen */
  S.openSolutionObject = function (sol) {
    var hint = S.task && S.task.id === sol.taskId ? '' : (S.task ? '<p class="warnbox">Diese Lösung gehört zu einer anderen Aufgabe.</p>' : '');
    S.closeTask(); S.loadLayout(sol.layout, { run: false }); S.name = sol.title + ' – Lösung'; S.updateTitle();
    S.openModal('<h2>Lösung: ' + esc(sol.title) + '</h2>' + hint + (Object.keys(sol.values || {}).length ? '<h3>Verborgene Werte</h3><ul>' + Object.keys(sol.values).map(function (k) { return '<li>' + esc(k) + ' = ' + esc(root.DQEditor.fmtVal(sol.values[k])) + '</li>'; }).join('') + '</ul>' : '') +
      ((sol.faults || []).length ? '<h3>Eingebaute Störungen</h3><ul>' + sol.faults.map(function (f) { return '<li><b>' + esc(f.cause) + '</b><br><span class="hint">' + esc(f.symptom || '') + '</span></li>'; }).join('') + '</ul>' : '<p>Keine Störung eingebaut.</p>') + '<p><button class="tb" id="mClose">Schliessen</button></p>');
  };
  /* Dialog: Aufgabe stellen */
  S.taskDialog = function () {
    var L = S.core.layout; if (!L.parts.length) { S.openModal('<h2>Aufgabe stellen</h2><p>Zuerst die richtige Schaltung bauen.</p><p><button class="tb" id="mClose">Schliessen</button></p>'); return; }
    var numeric = []; L.parts.forEach(function (p) { (S.FIELDS[p.type] || []).filter(function (f) { return !f.kind && f.k !== 'tpd' && f.k !== 'modn'; }).forEach(function (f) { numeric.push({ part: p.id, prop: f.k, label: p.id + ' ' + f.l, v: S.getProp(p, f.k) }); }); });
    var pinsOf = function (p) { return E.pinsOf(p.type, Object.assign({}, E.PARTS[p.type].props, p.props || {})); };
    S.openModal('<h2>Aufgabe stellen</h2><div class="field wide"><label for="tkT">Titel</label><input id="tkT" class="tin" style="width:100%" value="' + esc(S.name) + '"></div><div class="field wide"><label for="tkX">Aufgabentext</label><textarea id="tkX" style="width:100%;min-height:70px;font:inherit" placeholder="Was sollen die Lernenden tun?"></textarea></div>' +
      '<h3>Werte verbergen</h3><div style="max-height:150px;overflow:auto">' + (numeric.map(function (n, i) { return '<label style="display:block"><input type="checkbox" data-hide="' + i + '"> ' + esc(n.label) + ' <span class="hint">(' + esc(root.DQEditor.fmtVal(n.v)) + ')</span></label>'; }).join('') || '<span class="hint">Keine Zahlenwerte.</span>') + '</div>' +
      '<h3>Störung einbauen</h3><div class="field"><label for="tkF">Art</label><select id="tkF"><option value="">keine</option><option value="open">Leitung unterbrechen</option><option value="value">falscher Wert</option><option value="swap">vertauschte Anschlüsse</option></select></div><div id="tkFopt"></div>' +
      '<p class="hint">Gespeichert werden zwei getrennte Dateien: die Aufgabe (für die Lernenden) und die Lösung (für dich).</p><p><button class="tb run" id="tkGo">Aufgabe und Lösung speichern</button> <button class="tb" id="mClose">Abbrechen</button></p>');
    var opt = $('#tkFopt'), sel = $('#tkF');
    sel.onchange = function () {
      var v = sel.value;
      if (v === 'open') opt.innerHTML = '<div class="field"><label for="tkW">Leitung</label><select id="tkW">' + L.wires.map(function (w, i) { return '<option value="' + i + '">' + esc(w.from + ' – ' + w.to) + '</option>'; }).join('') + '</select></div>';
      else if (v === 'value') opt.innerHTML = '<div class="field"><label for="tkP">Wert</label><select id="tkP">' + numeric.map(function (n, i) { return '<option value="' + i + '">' + esc(n.label) + '</option>'; }).join('') + '</select></div><div class="field"><label for="tkV">neuer (falscher) Wert</label><input id="tkV" class="tin" value=""></div>';
      else if (v === 'swap') opt.innerHTML = '<div class="field"><label for="tkS">Bauteil</label><select id="tkS">' + L.parts.filter(function (p) { return pinsOf(p).length >= 2; }).map(function (p) { return '<option value="' + p.id + '">' + p.id + '</option>'; }).join('') + '</select></div><div class="field"><label for="tkA">Anschluss A</label><select id="tkA"></select></div><div class="field"><label for="tkB">Anschluss B</label><select id="tkB"></select></div>';
      else opt.innerHTML = '';
      if (v === 'swap') { var fill = function () { var p = L.parts.filter(function (x) { return x.id === $('#tkS').value; })[0], ps = pinsOf(p); $('#tkA').innerHTML = ps.map(function (x, i) { return '<option' + (i === 0 ? ' selected' : '') + '>' + x + '</option>'; }).join(''); $('#tkB').innerHTML = ps.map(function (x, i) { return '<option' + (i === 1 ? ' selected' : '') + '>' + x + '</option>'; }).join(''); }; $('#tkS').onchange = fill; fill(); }
    };
    $('#tkGo').onclick = function () {
      try {
        var hide = []; document.querySelectorAll('[data-hide]').forEach(function (c) { if (c.checked) hide.push({ part: numeric[+c.dataset.hide].part, prop: numeric[+c.dataset.hide].prop }); });
        var faults = [], v = sel.value;
        if (v === 'open') faults.push({ type: 'open', wire: +$('#tkW').value });
        else if (v === 'value') { var n = numeric[+$('#tkP').value], nv = S.parseSI($('#tkV').value); if (!isFinite(nv)) throw new Error('Den falschen Wert verstehe ich nicht.'); faults.push({ type: 'value', part: n.part, prop: n.prop, value: nv }); }
        else if (v === 'swap') faults.push({ type: 'swap', part: $('#tkS').value, a: $('#tkA').value, b: $('#tkB').value });
        var r = buildTask(S.core.layout, { title: $('#tkT').value || 'Aufgabe', text: $('#tkX').value, hide: hide, faults: faults });
        S.downloadText((r.task.title.replace(/[^A-Za-z0-9ÄÖÜäöü_\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Aufgabe') + '.aufgabe.dqstudio.json', r.taskText);
        S.downloadText((r.task.title.replace(/[^A-Za-z0-9ÄÖÜäöü_\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Aufgabe') + '.loesung.dqstudio.json', r.solutionText);
        S.closeModal(); S.lastTask = r;
      } catch (e) { alert(e.message); }
    };
  };
  // Dateien: file.js ruft diese Hooks beim Öffnen auf
  S.initFns.push(function () {
    var prev = S.parseFile;
    S.parseFile = function (text) {
      var o; try { o = JSON.parse(text); } catch (e) { return prev(text); }
      if (o && o.format === TASK) { if (o.version > 1) return { ok: false, error: 'Die Aufgabe stammt aus einer neueren Version des Studios.' }; return { ok: true, task: o, layout: o.layout, name: o.title, sliders: [], from: o.version }; }
      if (o && o.format === SOL) { if (o.version > 1) return { ok: false, error: 'Die Lösung stammt aus einer neueren Version des Studios.' }; return { ok: true, solution: o, layout: o.layout, name: o.title, sliders: [], from: o.version }; }
      return prev(text);
    };
    var prevOpen = S.openText;
    S.openText = function (text, run) { var r = S.parseFile(text); if (r.ok && r.task) { S.openTaskObject(r.task); return r; } if (r.ok && r.solution) { S.openSolutionObject(r.solution); return r; } return prevOpen(text, run); };
  });
  S.downloadText = function (name, text) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000); };
  S.onLoad = (function (prev) { return function (o) { if (S.task) S.closeTask(); if (prev) prev(o); }; })(S.onLoad);
  /* Speichern während einer Aufgabe: wieder als Aufgabendatei (verborgene Werte verschleiert), samt Antworten */
  S.initFns.push(function () {
    var prevSer = S.serialize;
    S.serialize = function () {
      if (!S.task) return prevSer();
      var lay = clone(S.core.layout); S.task.hide.forEach(function (h) { var p = lay.parts.filter(function (x) { return x.id === h.part; })[0]; if (p) setv(p, h.prop, 0); });
      return { format: TASK, version: 1, id: S.task.id, title: S.task.title, text: S.task.text, hide: S.task.hide, hiddenData: encode(S.task.values, S.task.id), layout: lay, answers: S.task.answers, created: new Date().toISOString() };
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);

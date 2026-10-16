/* Digital Quest Studio – Lernpfad: Oberfläche (Nachtlauf 2, Block 2)
 * Eigener Bereich über dem Editor: Stationsliste, Station mit Aufgaben, Arbeitsfläche je Prüfart. Schaltungsaufgaben wechseln in den Editor
 * (Bauteilleiste nur mit den erlaubten Teilen, Aufgabenfenster mit «Prüfen»). Alle Stationen werden aus den Daten (st_*.js) gezeichnet.
 * Fortschritt: Browserspeicher (immer in try/catch, die Seite läuft auch ohne) und als Datei ausgeben und einlesen. Kein Konto, keine Anmeldung. */
(function (root) {
  'use strict';
  var S = root.Studio, P = root.DQPfad, B = root.DQStudioBool, E = S.E;
  var KEY = 'dqstudio_lernpfad_v1';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function jetzt() { return new Date().toISOString(); }
  var STATUS = { gesperrt: 'gesperrt', offen: 'offen', arbeit: 'in Arbeit', bestanden: 'bestanden' };
  var ASTATUS = { offen: 'offen', arbeit: 'in Arbeit', falsch: 'falsch', richtig: 'richtig' };
  var ICON = { offen: '○', arbeit: '◐', falsch: '✗', richtig: '✓' };

  /* ---------- Speicher ---------- */
  var stand = P.neuerStand(), speicherOk = true;
  function ladeStand() {
    try { var raw = root.localStorage.getItem(KEY); if (!raw) return; var r = P.importiere(raw); if (r.ok) stand = r.stand; } catch (e) { speicherOk = false; }
  }
  function sichere() {
    try { root.localStorage.setItem(KEY, P.exportiere(stand, jetzt())); } catch (e) { speicherOk = false; }
  }
  var sichertimer = 0; function sichereSpaeter() { clearTimeout(sichertimer); sichertimer = setTimeout(sichere, 300); }
  ladeStand();

  /* ---------- Überlagerung ---------- */
  var ov = null, cur = { sid: null, aid: null }, edit = null;
  function ensure() {
    if (ov) return ov;
    ov = document.createElement('div'); ov.id = 'pfad'; ov.className = 'pfad'; ov.hidden = true; ov.setAttribute('role', 'region'); ov.setAttribute('aria-label', 'Lernpfad Digitaltechnik');
    document.body.appendChild(ov);
    ov.addEventListener('click', onClick); ov.addEventListener('input', onInput); ov.addEventListener('change', onInput);
    return ov;
  }
  function placeOv() { var mb = $('#menubar'); ensure().style.top = (mb ? mb.offsetHeight : 44) + 'px'; }
  function open(view) { ensure(); if (edit) leaveEdit(true); placeOv(); ov.hidden = false; S.pfadAktiv = true; if (view === 'liste' || !cur.sid) cur.sid = null; render(); }
  function close() { if (edit) leaveEdit(true); if (ov) ov.hidden = true; S.pfadAktiv = false; S.palFilter = null; S.pfadPal = null; S.rebuildPalette(); S.stopPfadPanel && S.stopPfadPanel(); }
  S.pfad = { open: open, close: close, stand: function () { return stand; }, setStand: function (s) { stand = s; sichere(); render(); }, openStation: function (sid) { open(); cur.sid = sid; cur.aid = null; render(); }, openAufgabe: function (aid) { open(); cur.sid = aid.split('.')[0]; cur.aid = aid; render(); },
    get cur() { return cur; }, get edit() { return edit; }, pruefe: function () { return doCheck(); }, speicherOk: function () { return speicherOk; }, sichere: sichere, kvState: function () { return kv; } };

  /* ---------- Darstellung ---------- */
  function render() {
    if (!ov || ov.hidden) return;
    var h = '<div class="pf-top"><button class="tb" data-a="liste">Lernpfad</button>' + (cur.sid ? '<span class="pf-crumb">›</span><button class="tb" data-a="station">' + esc(cur.sid) + ' ' + esc(P.get(cur.sid).titel) + '</button>' : '') + '<span class="spacer"></span><button class="tb run" data-a="close" title="Zurück zum Editor (Lernpfad bleibt gespeichert)">Zum Editor ✕</button></div><div class="pf-body">';
    h += cur.sid ? stationHtml(P.get(cur.sid)) : listeHtml();
    ov.innerHTML = h + '</div>';
    if (cur.sid && cur.aid) mountTask(P.task(cur.aid));
  }
  function listeHtml() {
    var h = '<h1>Lernpfad Digitaltechnik</h1><p class="pf-lead">Stevens Kurs als geführter Weg durch das Studio: Du füllst Tabellen aus, vereinfachst Ausdrücke, zeichnest KV-Diagramme und baust Schaltungen – die Software rechnet nach und sagt dir, <b>was</b> falsch ist. Eine Station öffnet sich, wenn die vorige abgeschlossen ist. Stationen, die nicht von der Software geprüft werden (Messungen am Experimenter), sind gekennzeichnet.</p>';
    h += '<p class="hint">' + (speicherOk ? 'Dein Fortschritt liegt in diesem Browser. Mit «Fortschritt ausgeben» nimmst du ihn mit oder gibst ihn ab.' : '<b>Der Browser speichert nicht.</b> Gib deinen Fortschritt am Ende mit «Fortschritt ausgeben» als Datei aus.') + '</p>';
    h += '<p><button class="tb" data-a="export">Fortschritt ausgeben …</button> <button class="tb" data-a="import">Fortschritt einlesen …</button> <button class="tb" data-a="freigabelesen">Freigabedatei einlesen …</button> <button class="tb" data-a="freigabemachen">Freigabedatei erstellen (Lehrperson) …</button></p>';
    var teile = { A: 'Teil A – Stationäre Vorgänge', B: 'Teil B – Zeitabhängige Vorgänge' };
    ['A', 'B'].forEach(function (t) {
      var sts = P.stations.filter(function (s) { return s.teil === t; }); if (!sts.length) return;
      h += '<h2>' + teile[t] + '</h2><div class="pf-cards">';
      sts.forEach(function (s) {
        var stt = P.stationStatus(stand, s.id), z = P.zaehlung(stand, s.id), i = P.stations.indexOf(s), vor = i > 0 ? P.stations[i - 1] : null;
        h += '<button class="pf-card st-' + stt + '" data-sid="' + s.id + '"' + (stt === 'gesperrt' ? ' aria-disabled="true"' : '') + '><span class="pf-nr">' + s.id + '</span><span class="pf-tit">' + esc(s.titel) + '</span><span class="pf-kurz">' + esc(s.kurz || '') + '</span>' +
          '<span class="pf-badges"><span class="pf-st">' + STATUS[stt] + '</span>' + (s.auto === false ? '<span class="pf-lab">Laborstation</span>' : '') + '<span class="pf-cnt">' + z.richtig + ' / ' + z.pflicht + '</span></span>' + (stt === 'gesperrt' && vor ? '<span class="pf-sperr">Öffnet sich, wenn ' + vor.id + ' abgeschlossen ist.</span>' : '') + '</button>';
      });
      h += '</div>';
    });
    return h;
  }
  function stationHtml(s) {
    var stt = P.stationStatus(stand, s.id), z = P.zaehlung(stand, s.id);
    var h = '<h1><span class="pf-nr">' + s.id + '</span> ' + esc(s.titel) + ' <span class="pf-st st-' + stt + '">' + STATUS[stt] + '</span></h1>' + s.einfuehrung;
    if (s.verweis) h += '<p class="hint">' + esc(s.verweis) + '</p>';
    if (s.auto === false) h += '<p class="warnbox"><b>Laborstation.</b> Die Software prüft diese Station nicht: Die Messung machst du am Elektronik-Experimenter. Hier trägst du die Werte ein und markierst die Station am Ende selbst als erledigt.</p>';
    else if (s.aufgaben.some(function (a) { return !P.AUTO.concat(['x']).includes(a.art); })) h += '<p class="hint">Aufgaben mit dem Zeichen ✎ prüft die Software nicht – du bestätigst sie selbst.</p>';
    h += '<div class="pf-split"><div class="pf-list" role="list" aria-label="Aufgaben ' + s.id + '"><p class="hint">' + z.richtig + ' von ' + z.pflicht + ' Pflichtaufgaben richtig' + (z.alle > z.pflicht ? ', ' + (z.alle - z.pflicht) + ' freiwillig' : '') + '</p>';
    s.aufgaben.forEach(function (a) {
      var st = P.aufgabeStatus(stand, a.id);
      h += '<button class="pf-aufg ast-' + st + (cur.aid === a.id ? ' on' : '') + '" data-aid="' + a.id + '" role="listitem"><span class="pf-ic" aria-hidden="true">' + ICON[st] + '</span><span class="pf-at">' + esc(a.titel) + '</span>' + (P.AUTO.indexOf(a.art) < 0 ? '<span class="pf-tag" title="Wird nicht von der Software geprüft">✎</span>' : '') + (P.pflicht(a) ? '' : '<span class="pf-tag fw">freiwillig</span>') + '<span class="sr">' + ASTATUS[st] + '</span></button>';
    });
    h += '</div><div class="pf-work" id="pfWork">' + (cur.aid ? '' : '<p class="hint">Wähle links eine Aufgabe.</p>') + '</div></div>';
    return h;
  }

  /* ---------- Arbeitsfläche je Prüfart ---------- */
  var draft = null; // laufende Antwort der geöffneten Aufgabe
  var kv = null;    // KV-Zustand: {sel:[], gruppen:[]}
  function kopfHtml(a) {
    var e = P.eintrag(stand, a.id), h = '<h2>' + esc(a.titel) + (P.pflicht(a) ? '' : ' <span class="pf-tag fw">freiwillig</span>') + '</h2>' + a.text;
    if (a.gegeben) h += '<p class="pf-gegeben"><b>A =</b> ' + fmt(a.gegeben) + '</p>';
    return h;
  }
  function fmt(text) { try { var p = B.parse(text); return B.fmtHtml(B.clean(p.exprs[p.exprs.length - 1])); } catch (e) { return esc(text); } }
  function mountTask(a) {
    var w = $('#pfWork'); if (!w || !a) return; var e = P.eintrag(stand, a.id), h = kopfHtml(a);
    draft = e && e.antwort != null ? clone(e.antwort) : null;
    switch (a.art) {
      case 'tabelle': h += tabelleHtml(a); break;
      case 'ausdruck': h += '<p><label for="pfExpr">Dein Ausdruck</label><br><input id="pfExpr" class="tin pf-expr" type="text" autocomplete="off" spellcheck="false" placeholder="z. B. e1 ( e2 v /e3 )" value="' + esc(typeof draft === 'string' ? draft : '') + '" style="width:100%"></p><p class="pf-prev" id="pfPrev" aria-live="polite"></p>'; break;
      case 'kv': h += kvHtml(a); break;
      case 'fragen': h += fragenHtml(a); break;
      case 'protokoll': h += protokollHtml(a); break;
      case 'vergleich': h += vergleichHtml(a); break;
      default: h += '<p><button class="tb run" data-a="edit">Im Editor bauen</button></p><p class="hint">Der Editor öffnet sich mit den Bauteilen, die du bis hierher kennengelernt hast. Zum Prüfen kommst du zurück ins Aufgabenfenster.</p>';
    }
    h += '<div class="pf-actions">' + (['schaltung', 'nand', 'ics', 'folge'].indexOf(a.art) < 0 ? '<button class="tb run" data-a="check">' + (a.art === 'protokoll' ? 'Als erledigt markieren' : a.art === 'vergleich' ? 'Abgeben' : 'Prüfen') + '</button> ' : '') + (a.hilfe ? '<button class="tb" data-a="hilfe">Hilfe</button> ' : '') + '<button class="tb" data-a="loesung" id="pfLoesungBtn"' + (P.loesungFrei(stand, a.id) ? '' : ' hidden') + '>Lösung zeigen</button></div>';
    h += '<div class="pf-msg" id="pfMsg" role="status" aria-live="polite">' + (e && e.meldung ? '<span class="' + (e.letzte === 'richtig' ? 'ok' : 'bad') + '">' + esc(e.meldung) + '</span>' : '') + '</div><div id="pfSol"></div>';
    w.innerHTML = h;
    if (a.art === 'ausdruck') previewExpr();
    if (a.art === 'kv') kvDraw();
    if (e && e.gezeigt) zeigeLoesung(a);
  }
  function tabelleHtml(a) {
    var h = '<div class="pf-tw"><table class="itab pf-tab"><thead><tr>' + a.kopf.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>';
    a.zeilen.forEach(function (row, r) {
      h += '<tr>' + row.map(function (c, ci) {
        if (!P.isAns(c)) return '<td>' + (c && typeof c === 'object' ? c.html : esc(c)) + '</td>';
        var key = r + ',' + ci, val = draft && draft[key] != null ? draft[key] : '';
        if (c.opt) return '<td><select class="pf-cell" data-k="' + key + '" aria-label="' + esc(a.kopf[ci]) + ' Zeile ' + (r + 1) + '"><option value=""></option>' + c.opt.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></td>';
        return '<td><input class="pf-cell' + (c.typ === 'ausdr' ? ' wide' : '') + '" data-k="' + key + '" value="' + esc(val) + '" autocomplete="off" spellcheck="false" aria-label="' + esc(a.kopf[ci]) + ' Zeile ' + (r + 1) + '"></td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function fragenHtml(a) {
    var h = '<ol class="pf-fragen">'; draft = draft || [];
    a.fragen.forEach(function (q, i) {
      var multi = Array.isArray(q.richtig), sel = [].concat(draft[i] == null ? [] : draft[i]);
      h += '<li><p>' + q.q + '</p>' + q.opt.map(function (o, j) { return '<label class="pf-opt"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="pfq' + i + '" data-q="' + i + '" value="' + j + '"' + (sel.indexOf(j) >= 0 ? ' checked' : '') + '> ' + o + '</label>'; }).join('') + '</li>';
    });
    return h + '</ol>';
  }
  function protokollHtml(a) {
    draft = draft || { felder: {}, selbst: false }; var h = '';
    (a.tabellen || []).forEach(function (t, ti) {
      h += '<h3>' + esc(t.titel) + '</h3><div class="pf-tw"><table class="itab pf-tab"><thead><tr>' + t.kopf.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>';
      for (var r = 0; r < t.zeilen.length; r++) h += '<tr>' + t.zeilen[r].map(function (c, ci) { var key = ti + ',' + r + ',' + ci; return c === null ? '<td><input class="pf-cell wide" data-p="' + key + '" value="' + esc(draft.felder[key] || '') + '" autocomplete="off" aria-label="' + esc(t.kopf[ci]) + ' Zeile ' + (r + 1) + '"></td>' : '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
      h += '</tbody></table></div>';
    });
    h += '<p><label for="pfNotiz">Notizen</label><br><textarea id="pfNotiz" class="tin" rows="3" style="width:100%">' + esc(draft.notiz || '') + '</textarea></p>';
    h += '<p><label class="pf-opt"><input type="checkbox" id="pfSelbst"' + (draft.selbst ? ' checked' : '') + '> Ich habe die Messung durchgeführt und die Werte eingetragen.</label></p><p><button class="tb" data-a="drucken">Protokoll drucken …</button></p>';
    return h;
  }
  function vergleichHtml(a) {
    draft = draft || { text: '' };
    return '<p><label for="pfText">Was hast du gefunden? (kurz aufschreiben, das Diagramm zeichnest du auf Papier)</label><br><textarea id="pfText" class="tin" rows="4" style="width:100%">' + esc(draft.text || '') + '</textarea></p>';
  }
  function previewExpr() {
    var el = $('#pfExpr'), pv = $('#pfPrev'); if (!el || !pv) return; var v = el.value.trim();
    if (!v) { pv.innerHTML = ''; return; }
    try { var p = B.parse(v); pv.innerHTML = 'So liest die Software es: <b>' + B.fmtHtml(B.clean(p.exprs[p.exprs.length - 1])) + '</b>'; } catch (e) { pv.innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }
  }

  /* ---------- KV-Diagramm ---------- */
  var GRAY = [0, 1, 3, 2], LOOP = ['#d98200', '#0b8ea8', '#1f9d55', '#c2418a', '#7a56c8', '#b5492a'];
  function kvLay(n) { return { 2: [1, 1], 3: [1, 2], 4: [2, 2] }[n]; }
  function kvCellNr(n, r, c) { var L = kvLay(n), cv = L[1] === 1 ? c : GRAY[c], rv = L[0] === 1 ? r : GRAY[r]; return (rv << L[1]) | cv; }
  function kvHtml(a) {
    var d = draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {}; kv = { sel: [], gruppen: (d.gruppen || []).map(function (g) { return g.slice(); }) };
    return '<div class="kvw"><div class="kv-svg" id="pfKv"></div><div class="kv-side"><p class="hint">Felder anklicken, dann «Päckchen bilden». Ein Päckchen darf auch über den Rand gehen. Die kleine Zahl im Feld ist die Feldnummer.</p>' +
      '<p><button class="tb" data-a="kvgruppe">Päckchen bilden</button> <button class="tb" data-a="kvleer">Auswahl aufheben</button></p><ul class="pf-gl" id="pfGl"></ul>' +
      (a.ausdruck === false ? '' : '<p><label for="pfExpr">Minimalform</label><br><input id="pfExpr" class="tin pf-expr" type="text" autocomplete="off" spellcheck="false" placeholder="A = …" value="' + esc(d.ausdruck || '') + '" style="width:100%"></p><p class="pf-prev" id="pfPrev"></p>') + '</div></div>';
  }
  function kvDraw() {
    var a = P.task(cur.aid), n = a.n, L = kvLay(n), R = 1 << L[0], C = 1 << L[1], cw = 58, ch = 44, ox = L[0] === 2 ? 104 : 74, oy = 40, names = ['e1', 'e2', 'e3', 'e4'];
    var on = {}, dc = {}; a.ones.forEach(function (m) { on[m] = 1; }); (a.dc || []).forEach(function (m) { dc[m] = 1; });
    function lbl(b, k, first) { var g = b === 1 ? k : GRAY[k], s = []; for (var i = b - 1; i >= 0; i--) { var nm = names[first + i]; s.push(g >> i & 1 ? nm : '<tspan class="ovt">' + nm + '̅</tspan>'); } return s.join(' '); }
    var s = '<svg class="kv" viewBox="0 0 ' + (ox + C * cw + 20) + ' ' + (oy + R * ch + 20) + '" role="img" aria-label="KV-Diagramm mit ' + n + ' Eingängen">', r, c;
    for (c = 0; c < C; c++) s += '<text class="kv-h" x="' + (ox + c * cw + cw / 2) + '" y="' + (oy - 10) + '">' + lbl(L[1], c, 0) + '</text>';
    for (r = 0; r < R; r++) s += '<text class="kv-h" x="' + (ox - 10) + '" y="' + (oy + r * ch + ch / 2 + 5) + '" style="text-anchor:end">' + lbl(L[0], r, L[1]) + '</text>';
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      var m = kvCellNr(n, r, c), v = on[m] ? '1' : dc[m] ? 'X' : '0', sel = kv.sel.indexOf(m) >= 0;
      s += '<g class="kv-cell edit' + (sel ? ' sel' : '') + '" data-m="' + m + '" tabindex="0" role="button" aria-label="Feld ' + m + ' Wert ' + v + (sel ? ' ausgewählt' : '') + '"><rect x="' + (ox + c * cw) + '" y="' + (oy + r * ch) + '" width="' + cw + '" height="' + ch + '"/><text class="kv-v' + (v === '1' ? ' one' : v === 'X' ? ' dc' : '') + '" x="' + (ox + c * cw + cw / 2) + '" y="' + (oy + r * ch + ch / 2 + 7) + '">' + v + '</text><text class="kv-m" x="' + (ox + c * cw + 5) + '" y="' + (oy + r * ch + 12) + '">' + m + '</text></g>';
    }
    kv.gruppen.forEach(function (g, gi) {
      var rows = {}, cols = {}, col = LOOP[gi % LOOP.length], ins = 4 + (gi % 3) * 3;
      for (var rr = 0; rr < R; rr++) for (var cc = 0; cc < C; cc++) if (g.indexOf(kvCellNr(n, rr, cc)) >= 0) { rows[rr] = 1; cols[cc] = 1; }
      function segs(set) { var ks = Object.keys(set).map(Number).sort(function (x, y) { return x - y; }), res = [], curS = null; ks.forEach(function (k) { if (curS && k === curS[1] + 1) curS[1] = k; else { curS = [k, k]; res.push(curS); } }); return res; }
      segs(rows).forEach(function (rs) { segs(cols).forEach(function (cs) { s += '<rect class="kv-loop" x="' + (ox + cs[0] * cw + ins) + '" y="' + (oy + rs[0] * ch + ins) + '" width="' + ((cs[1] - cs[0] + 1) * cw - 2 * ins) + '" height="' + ((rs[1] - rs[0] + 1) * ch - 2 * ins) + '" rx="14" style="stroke:' + col + '"/>'; }); });
    });
    $('#pfKv').innerHTML = s + '</svg>';
    $('#pfGl').innerHTML = kv.gruppen.map(function (g, gi) { return '<li><span class="pf-sw" style="background:' + LOOP[gi % LOOP.length] + '"></span> Päckchen ' + (gi + 1) + ': Felder ' + g.join(', ') + ' <button class="tb" data-a="kvweg" data-gi="' + gi + '" aria-label="Päckchen ' + (gi + 1) + ' entfernen">✕</button></li>'; }).join('');
    previewExpr();
  }
  function kvAntwort() { var el = $('#pfExpr'); return { gruppen: kv.gruppen.map(function (g) { return g.slice().sort(function (x, y) { return x - y; }); }), ausdruck: el ? el.value : '' }; }

  /* ---------- Prüfen ---------- */
  function antwortVonFlaeche(a) {
    switch (a.art) {
      case 'tabelle': var m = {}; $$('.pf-cell[data-k]').forEach(function (el) { if (el.value !== '') m[el.dataset.k] = el.value; }); return m;
      case 'ausdruck': return $('#pfExpr').value;
      case 'kv': return kvAntwort();
      case 'fragen': var arr = []; a.fragen.forEach(function (q, i) { var v = $$('[data-q="' + i + '"]').filter(function (x) { return x.checked; }).map(function (x) { return +x.value; }); arr[i] = Array.isArray(q.richtig) ? v : (v.length ? v[0] : null); }); return arr;
      case 'protokoll': var f = {}; $$('.pf-cell[data-p]').forEach(function (el) { if (el.value !== '') f[el.dataset.p] = el.value; }); return { felder: f, notiz: $('#pfNotiz').value, selbst: $('#pfSelbst').checked };
      case 'vergleich': return { text: $('#pfText').value };
    }
    return null;
  }
  function zeigeMeldung(res) { var m = $('#pfMsg') || $('#pfpMsg'); if (m) m.innerHTML = '<span class="' + (res.ok ? 'ok' : 'bad') + '">' + (res.ok ? '✓ ' : '✗ ') + esc(res.meldung) + '</span>'; $$('#pfMsg, #pfpMsg').forEach(function (x) { if (x !== m) x.innerHTML = m.innerHTML; }); }
  function markiereTabelle(res) { $$('.pf-cell[data-k]').forEach(function (el) { el.classList.remove('ok', 'bad'); }); if (!res.falsch) return; var bad = {}; res.falsch.forEach(function (f) { bad[f.r + ',' + f.c] = 1; }); $$('.pf-cell[data-k]').forEach(function (el) { if (el.value === '') return; el.classList.add(bad[el.dataset.k] ? 'bad' : 'ok'); }); }
  function doCheck() {
    var a = P.task(cur.aid); if (!a) return null; var antwort, layout = false;
    if (edit) { antwort = clone(S.core.layout); layout = true; } else antwort = antwortVonFlaeche(a);
    var res; try { res = P.pruefe(a, antwort); } catch (e) { res = { ok: false, meldung: 'Das lässt sich nicht prüfen: ' + e.message }; }
    var wasRichtig = P.aufgabeStatus(stand, a.id) === 'richtig';
    P.speichereErgebnis(stand, a.id, res, antwort, jetzt()); sichere();
    zeigeMeldung(res); if (a.art === 'tabelle') markiereTabelle(res);
    if (a.art === 'vergleich' && res.ok) { var vb = $('#pfSol'); if (vb) vb.innerHTML = '<div class="pf-sol"><h3>Zum Vergleich</h3>' + (a.zeigeMuster || '') + '<p class="hint">Das ist nur zum Vergleich mit deinem Diagramm. Bewertet wird es nicht.</p></div>'; }
    var lb = $('#pfLoesungBtn') || $('#pfpLoesung'); if (lb) lb.hidden = !P.loesungFrei(stand, a.id);
    if (!edit) { var li = $('.pf-aufg[data-aid="' + a.id + '"]'); if (li) { li.className = 'pf-aufg ast-' + P.aufgabeStatus(stand, a.id) + ' on'; $('.pf-ic', li).textContent = ICON[P.aufgabeStatus(stand, a.id)]; } }
    if (res.ok && !wasRichtig && P.stationFertig(stand, cur.sid)) abschlussHinweis();
    return res;
  }
  function abschlussHinweis() {
    var msg = '<p class="pf-fertig">🎉 Station ' + cur.sid + ' abgeschlossen – alle Pflichtaufgaben sind richtig.' + (P.stations[P.stations.map(function (s) { return s.id; }).indexOf(cur.sid) + 1] ? ' Die nächste Station ist offen.' : '') + '</p>';
    var m = $('#pfMsg'); if (m) m.insertAdjacentHTML('beforeend', msg);
    var t = $('.pf-top'); if (t && ov) { var head = $('h1 .pf-st'); if (head) { head.textContent = STATUS.bestanden; head.className = 'pf-st st-bestanden'; } }
  }

  /* ---------- Lösung zeigen ---------- */
  function zeigeLoesung(a) {
    var box = $('#pfSol') || $('#pfpSol'); if (!box) return; var m = P.muster(a), h = '<div class="pf-sol"><h3>Lösung</h3>';
    switch (a.art) {
      case 'tabelle': h += '<div class="pf-tw"><table class="itab"><thead><tr>' + a.kopf.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + a.zeilen.map(function (row, r) { return '<tr>' + row.map(function (c, ci) { return '<td' + (P.isAns(c) ? ' class="act"' : '') + '>' + (P.isAns(c) ? esc([].concat(c.a)[0]) : c && typeof c === 'object' ? c.html : esc(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; break;
      case 'ausdruck': h += '<p class="pf-expr">' + fmt(m) + '</p>'; break;
      case 'kv': h += '<p>Päckchen: ' + m.gruppen.map(function (g, i) { return (i + 1) + ': Felder ' + g.join(', '); }).join(' · ') + '</p><p class="pf-expr">' + fmt(m.ausdruck) + '</p>'; break;
      case 'fragen': h += '<ol>' + a.fragen.map(function (q, i) { return '<li>' + [].concat(q.richtig).map(function (j) { return q.opt[j]; }).join(' · ') + (q.erkl ? ' <span class="hint">' + esc(q.erkl) + '</span>' : '') + '</li>'; }).join('') + '</ol>'; break;
      case 'vergleich': h += (a.zeigeMuster || '') ; break;
      default: h += '<p>So kann die Lösung aussehen (die Schaltung öffnet sich im Editor – deine eigene bleibt unverändert):</p><p><button class="tb" data-a="musterladen">Musterlösung im Editor ansehen</button></p>';
    }
    if (a.loesungText) h += '<p>' + a.loesungText + '</p>';
    box.innerHTML = h + '<p class="hint">Du hast die Lösung gesehen. Die Aufgabe zählt erst, wenn du sie selbst richtig löst – gib deine Antwort noch einmal ein.</p></div>';
  }

  /* ---------- Editor-Modus für Schaltungsaufgaben ---------- */
  function enterEdit(aid) {
    var a = P.task(aid); if (!a) return; var e = P.eintrag(stand, aid), start = a.start || P.startNetz(a.n || 2, a.ausgaenge || 1);
    var layout = e && e.antwort && e.antwort.parts ? clone(e.antwort) : clone(start), locked = a.gesperrt || start.parts.map(function (p) { return p.id; }); // Eingänge, Anzeigen und Takt gehören zur Aufgabe und bleiben
    edit = { aid: aid }; S.pfadPal = P.palette(a); S.palFilter = function (t) { return S.pfadPal.indexOf(t) >= 0; };
    ov.hidden = true; S.rebuildPalette(); S.loadLayout(layout, { run: true, locked: locked }); S.name = a.titel; S.updateTitle && S.updateTitle();
    panel(a);
  }
  function leaveEdit(still) {
    if (!edit) return; var a = P.task(edit.aid); if (a && !edit.muster) { P.speichereAntwort(stand, a.id, clone(S.core.layout), jetzt()); sichere(); }
    edit = null; var w = $('#pfpanel'); if (w) w.remove(); S.palFilter = null; S.pfadPal = null; S.rebuildPalette(); if (!still) { ov.hidden = false; render(); }
  }
  S.stopPfadPanel = function () { var w = $('#pfpanel'); if (w) w.remove(); };
  function panel(a, muster) {
    var w = $('#pfpanel'); if (w) w.remove();
    w = document.createElement('div'); w.id = 'pfpanel'; w.className = 'fwin pfpanel'; w.style.cssText = 'right:20px;top:150px;width:380px;max-height:70vh';
    var e = P.eintrag(stand, a.id), h = '<div class="fh"><b>' + esc(a.id) + ' ' + esc(a.titel) + '</b></div><div class="fb pf-pb">';
    if (muster) h += '<p class="warnbox"><b>Musterlösung.</b> Das ist nicht deine Schaltung. Deine bleibt gespeichert; mit «Zurück zur Station» kommst du zu ihr zurück.</p><p class="pf-actions"><button class="tb run" data-a="zurueck">Zurück zur Station</button></p>';
    else {
      h += a.text + (a.art === 'folge' ? '<p class="hint">' + (a.takt ? 'Die Software taktet den Eingang <b>' + esc(a.takt) + '</b> selbst (Pegel 1, dann wieder 0) und ' : 'Die Software schaltet die Eingänge selbst und ') + 'liest die Anzeigen ' + esc((a.lesen || []).join(', ')) + '.</p>' : '');
      if (a.limit || a.nur) h += '<p class="hint">' + (a.nur ? 'Erlaubt: ' + a.nur.map(P.typName).join(', ') + '. ' : '') + (a.limitText || '') + '</p>';
      h += '<p class="pf-actions"><button class="tb run" data-a="check">Prüfen</button> <button class="tb" id="pfpLoesung" data-a="loesung"' + (P.loesungFrei(stand, a.id) ? '' : ' hidden') + '>Lösung zeigen</button> <button class="tb" data-a="zurueck">Zurück zur Station</button></p>' +
        '<div class="pf-msg" id="pfpMsg" role="status" aria-live="polite">' + (e && e.meldung ? '<span class="' + (e.letzte === 'richtig' ? 'ok' : 'bad') + '">' + esc(e.meldung) + '</span>' : '') + '</div><div id="pfpSol"></div>';
    }
    w.innerHTML = h + '</div>'; document.getElementById('floats').appendChild(w); w.addEventListener('click', onClick);
  }
  var saveT = 0;
  S.initFns.push(function () {
    var prev = S.onEdit;
    S.onEdit = function (kind) { if (prev) prev(kind); if (edit && kind !== 'load') { clearTimeout(saveT); saveT = setTimeout(function () { if (edit) { P.speichereAntwort(stand, edit.aid, clone(S.core.layout), jetzt()); sichereSpaeter(); } }, 400); } };
  });

  /* ---------- Ereignisse ---------- */
  function onInput(ev) {
    var t = ev.target; if (!ov || !cur.aid) return; var a = P.task(cur.aid); if (!a || edit) return;
    if (t.id === 'pfExpr') previewExpr();
    if (t.matches('.pf-cell, #pfExpr, #pfNotiz, #pfSelbst, #pfText, [data-q]')) { P.speichereAntwort(stand, a.id, antwortVonFlaeche(a), jetzt()); sichereSpaeter(); }
  }
  function onClick(ev) {
    var kc = ev.target.closest('.kv-cell'); if (kc && kv) { var m = +kc.dataset.m, i = kv.sel.indexOf(m); if (i >= 0) kv.sel.splice(i, 1); else kv.sel.push(m); kvDraw(); return; }
    var card = ev.target.closest('[data-sid]'); if (card && !ev.target.closest('[data-a]')) { if (card.getAttribute('aria-disabled') === 'true') { var s = P.get(card.dataset.sid), i2 = P.stations.indexOf(s); alertBox('Station ' + s.id + ' ist noch gesperrt', 'Sie öffnet sich, wenn ' + P.stations[i2 - 1].id + ' abgeschlossen ist – oder wenn deine Lehrperson sie freischaltet.'); return; } cur.sid = card.dataset.sid; cur.aid = null; render(); return; }
    var ai = ev.target.closest('[data-aid]'); if (ai) { cur.aid = ai.dataset.aid; render(); return; }
    var b = ev.target.closest('[data-a]'); if (!b) return; var act = b.dataset.a, a = cur.aid && P.task(cur.aid);
    switch (act) {
      case 'liste': if (edit) leaveEdit(true); cur.sid = null; cur.aid = null; render(); break;
      case 'station': cur.aid = null; render(); break;
      case 'close': close(); break;
      case 'edit': enterEdit(cur.aid); break;
      case 'zurueck': leaveEdit(false); break;
      case 'check': doCheck(); break;
      case 'hilfe': { var m = $('#pfMsg'); if (m && a) m.innerHTML = '<span class="hint">Hilfe: ' + esc(a.hilfe) + '</span>'; break; }
      case 'loesung': P.markiereGezeigt(stand, a.id, jetzt()); sichere(); zeigeLoesung(a); break;
      case 'kvgruppe': if (kv && kv.sel.length) { kv.gruppen.push(kv.sel.slice().sort(function (x, y) { return x - y; })); kv.sel = []; P.speichereAntwort(stand, a.id, kvAntwort(), jetzt()); sichereSpaeter(); kvDraw(); } break;
      case 'kvleer': if (kv) { kv.sel = []; kvDraw(); } break;
      case 'kvweg': kv.gruppen.splice(+b.dataset.gi, 1); P.speichereAntwort(stand, a.id, kvAntwort(), jetzt()); sichereSpaeter(); kvDraw(); break;
      case 'musterladen': { var lay = P.muster(a); ov.hidden = true; edit = { aid: a.id, muster: true }; S.pfadPal = P.palette(a); S.palFilter = function (t) { return S.pfadPal.indexOf(t) >= 0; }; S.rebuildPalette(); S.loadLayout(clone(lay), { run: true, locked: [] }); S.name = a.titel + ' – Musterlösung'; panel(a, true); break; }
      case 'export': exportieren(); break;
      case 'import': dateiWaehlen(function (txt) { var r = P.importiere(txt); if (!r.ok) return alertBox('Das lässt sich nicht einlesen', r.error); stand = r.stand; sichere(); render(); alertBox('Fortschritt eingelesen', 'Dein Stand von ' + (stand.geaendert ? new Date(stand.geaendert).toLocaleString('de-CH') : 'früher') + ' ist wieder da.'); }); break;
      case 'freigabelesen': dateiWaehlen(function (txt) { var r = P.freigabeLesen(txt); if (!r.ok) return alertBox('Das lässt sich nicht einlesen', r.error); P.freischalten(stand, r.ids); sichere(); render(); alertBox('Freigabe eingelesen', r.ids.length + ' Station(en) freigeschaltet.'); }); break;
      case 'freigabemachen': freigabeDialog(); break;
      case 'drucken': drucken(a); break;
    }
  }
  function alertBox(titel, text) { S.openModal('<h2>' + esc(titel) + '</h2><p>' + esc(text) + '</p><p><button class="tb" id="mClose">Schliessen</button></p>'); }
  function dateiWaehlen(fn, key) { // Dateiauswahl des Systems (Chrome, Edge) oder des Browsers; studio/netz.js
    if (S.openFile) return S.openFile({ desc: 'Lernpfad-Datei', ext: '.json', key: key }, fn);
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = function () { var f = inp.files[0]; if (!f) { inp.remove(); return; } var rd = new FileReader(); rd.onload = function () { inp.remove(); fn(String(rd.result)); }; rd.readAsText(f); };
    inp.click();
  }
  function exportieren() { var d = new Date().toISOString().slice(0, 10), name = 'Lernpfad_Fortschritt_' + d + '.fortschritt.dqstudio.json', txt = P.exportiere(stand, jetzt()); if (S.saveFile) S.saveFile(name, txt, { desc: 'Lernpfad-Fortschritt', ext: '.json', key: 'fortschritt', dialog: true }); else S.downloadText(name, txt); }
  function freigabeDialog() {
    S.openModal('<h2>Stationen für die Klasse freischalten</h2><p class="hint">Du bestimmst das Tempo: Die gewählten Stationen sind bei den Lernenden offen, auch wenn die vorige noch nicht abgeschlossen ist. Gib ihnen die Datei, sie lesen sie im Lernpfad ein.</p><div style="max-height:300px;overflow:auto">' +
      P.stations.map(function (s) { return '<label class="pf-opt"><input type="checkbox" data-fg="' + s.id + '"> ' + s.id + ' ' + esc(s.titel) + '</label>'; }).join('') + '</div><p><button class="tb" data-fgall>Alle</button> <button class="tb run" id="fgGo">Freigabedatei speichern</button> <button class="tb" id="mClose">Abbrechen</button></p>');
    $('#modal [data-fgall]').onclick = function () { $$('#modal [data-fg]').forEach(function (c) { c.checked = true; }); };
    $('#fgGo').onclick = function () { var ids = $$('#modal [data-fg]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.fg; }); var ft = P.freigabeDatei(ids, jetzt()); if (S.saveFile) S.saveFile('Lernpfad_Freigabe.freigabe.dqstudio.json', ft, { desc: 'Lernpfad-Freigabe', ext: '.json', key: 'freigabe', dialog: true }); else S.downloadText('Lernpfad_Freigabe.freigabe.dqstudio.json', ft); S.closeModal(); };
  }
  function drucken(a) {
    var w = root.open('', '_blank'); if (!w) return alertBox('Drucken nicht möglich', 'Der Browser hat das Druckfenster blockiert.');
    var ant = antwortVonFlaeche(a), h = '<!doctype html><meta charset="utf-8"><title>' + esc(a.titel) + '</title><style>body{font:14px sans-serif;margin:20mm}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #333;padding:4px 10px;min-width:70px;height:22px}</style><h1>' + esc(a.titel) + '</h1>';
    (a.tabellen || []).forEach(function (t, ti) { h += '<h3>' + esc(t.titel) + '</h3><table><tr>' + t.kopf.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr>' + t.zeilen.map(function (z, r) { return '<tr>' + z.map(function (c, ci) { return '<td>' + (c === null ? esc(ant.felder[ti + ',' + r + ',' + ci] || '') : esc(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>'; });
    h += '<p>' + esc(ant.notiz || '') + '</p>'; w.document.write(h); w.document.close(); w.print();
  }

  /* ---------- Menü ---------- */
  S.initFns.push(function () {
    S.setMenu('pfad', [{ label: 'Stationen …', act: function () { open('liste'); } }, { sep: 1 }, { label: 'Fortschritt ausgeben …', act: exportieren }, { label: 'Fortschritt einlesen …', act: function () { open('liste'); $('[data-a="import"]', ov).click(); } }, { sep: 1 }, { label: 'Freigabedatei einlesen …', act: function () { open('liste'); $('[data-a="freigabelesen"]', ov).click(); } }, { label: 'Freigabedatei erstellen (Lehrperson) …', act: freigabeDialog }]);
  });
  root.addEventListener('resize', function () { if (ov && !ov.hidden) placeOv(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && ov && !ov.hidden && !ev.target.closest('input,textarea,select') && !$('#modalBg.open')) close(); });
})(window);

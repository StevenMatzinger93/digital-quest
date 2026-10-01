/* Digital Quest – Pruefung fuers Zertifikat im Spiel (window.DQExamUI), Portal-Version: labor/?exam=ID (wie bei SPS Quest).
 * Der Server zieht die Aufgaben, fuehrt die Zeit und bewertet jede Abgabe mit verdeckten Tests und eigenen Sollwerten.
 * Im Browser laeuft nur „Testen“ mit den sichtbaren Tests. Gesperrt: Tipps, Karte, Einstellungen, Live-Challenge.
 * Entwuerfe bleiben lokal (localStorage dq_exam_<ID>), damit ein Neuladen nichts kostet. */
(function (root) {
  'use strict';
  var LEVEL = { grund: 'Grundstufe', profi: 'Profi-Stufe' };
  function create(ctx) {
    var id = root.DQ_PORTAL ? +(new URLSearchParams(location.search).get('exam') || 0) : 0;
    var ex = null, tasks = [], questions = [], answers = {}, results = {}, drafts = {}, cur = -1, offset = 0, tick = 0, finishing = false, lastFocus = 0, busy = false;
    var esc = ctx.esc, $ = function (s) { return document.querySelector(s); }, KEY = 'dq_exam_' + id;
    function api(method, url, body) {
      return fetch('/api/' + url, { method: method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: body ? JSON.stringify(body) : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d }; }); });
    }
    function fmt(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60); return (m >= 60 ? Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2) : m) + ':' + ('0' + sec % 60).slice(-2); }
    function left() { return ex ? (ex.deadline - (Date.now() + offset)) / 1000 : 0; }
    function load() { try { drafts = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { drafts = {}; } }
    function store() { try { localStorage.setItem(KEY, JSON.stringify(drafts)); } catch (e) { /* voll: Entwurf bleibt nur im Speicher */ } }
    function overlay(html) {
      var o = $('#examOverlay');
      if (!o) { o = document.createElement('div'); o.id = 'examOverlay'; o.className = 'live-overlay exam-overlay'; o.setAttribute('role', 'dialog'); document.body.appendChild(o); }
      o.innerHTML = '<div class="live-card">' + html + '</div>'; o.style.display = 'flex';
    }
    function hideOverlay() { var o = $('#examOverlay'); if (o) o.style.display = 'none'; }

    /* ---------- Leiste ---------- */
    function stateOf(t) {
      var r = results[t.id], d = drafts[t.id];
      return (r ? (r.ok ? ' st-ok' : r.passed > 0 && !r.error ? ' st-part' : ' st-fail') : '') + (d && d.dirty ? ' dirty' : '');
    }
    function bar() {
      var b = $('#examBar');
      if (!b) { b = document.createElement('div'); b.id = 'examBar'; b.className = 'exam-bar'; b.setAttribute('role', 'navigation'); b.setAttribute('aria-label', 'Prüfung'); document.body.appendChild(b); document.body.classList.add('has-exam-bar'); }
      var l = left(), nq = questions.filter(function (q) { return answers[q.id] !== undefined; }).length;
      b.innerHTML = '<span class="eb-tag">PRÜFUNG</span><span class="eb-mode">' + LEVEL[ex.level] + (ex.proctored ? ' · unter Aufsicht' : '') + '</span>' +
        '<span class="eb-time' + (l < 300 ? ' low' : '') + '" id="ebTime" title="Restzeit">' + fmt(l) + '</span><span class="eb-nav">' +
        tasks.map(function (t, i) { return '<button class="eb-item' + (i === cur ? ' cur' : '') + stateOf(t) + '" data-eb="' + i + '" title="Aufgabe ' + (i + 1) + ': ' + esc(t.title) + '">' + (i + 1) + '</button>'; }).join('') +
        '<button class="eb-item' + (cur === 'q' ? ' cur' : '') + (nq === questions.length ? ' st-sent' : '') + '" data-eb="q" title="Theoriefragen">Theorie ' + nq + '/' + questions.length + '</button></span>' +
        '<button class="btn small eb-finish" id="ebFinish">Prüfung beenden</button>';
      Array.prototype.forEach.call(b.querySelectorAll('[data-eb]'), function (x) { x.onclick = function () { if (x.dataset.eb === 'q') openTheory(); else openTask(+x.dataset.eb); }; });
      $('#ebFinish').onclick = askFinish;
    }
    function timeOnly() { var t = $('#ebTime'); if (t) { var l = left(); t.textContent = fmt(l); t.classList.toggle('low', l < 300); } }

    /* ---------- Aufgaben ---------- */
    function gameTask(t, i) { // oeffentliche Fassung → Aufgabe im Format des Spiels; das Messprotokoll prueft nur der Server
      return { id: t.id, kind: 'task', exam: true, ch: t.ch, title: t.title, brief: t.brief, story: t.story || '', palette: t.palette || [], start: t.start, bench: t.bench || undefined,
        tests: t.tests || [], measure: [], protocol: t.measure || [], need: t.need || {}, limit: t.limit || undefined, tags: [], wrong: [], hint: '', hint2: '', no: i + 1, of: tasks.length };
    }
    function openTask(i) {
      var t = tasks[i]; if (!t || !running()) return;
      cur = i; hideOverlay();
      var d = drafts[t.id], a = answers[t.id], src = d && d.layout ? d : (a && a.layout ? a : null);
      ctx.open(gameTask(t, i), { exam: { id: id, item: t.id }, layout: src ? src.layout : null, answers: src ? src.answers || {} : {} });
      showResult(t.id); bar();
    }
    function draft(item, layout, ans) {
      if (!running()) return;
      var was = drafts[item], same = was && JSON.stringify(was.layout) === JSON.stringify(layout) && JSON.stringify(was.answers) === JSON.stringify(ans);
      if (same) return;
      drafts[item] = { layout: layout, answers: ans, dirty: true }; store();
      var b = document.querySelector('#examBar [data-eb="' + cur + '"]'); if (b) b.classList.add('dirty');
    }
    function reset(item) { delete drafts[item]; delete answers[item]; store(); openTask(cur); }
    function resultHtml(r) {
      if (!r) return '';
      if (r.error) return '<div class="exam-result bad"><b>Abgabe nicht bewertbar</b><p>' + esc(r.error) + '</p></div>';
      return '<div class="exam-result ' + (r.ok ? 'ok' : 'part') + '"><b>' + (r.ok ? 'Abgabe bestanden' : 'Abgabe gespeichert – noch nicht alles erfüllt') + '</b> <span class="mono">' + r.passed + ' / ' + r.total + ' Prüfpunkte</span>' +
        '<ul class="res">' + (r.checks || []).map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'bad') + '">' + (c.ok ? '✔ ' : '✘ ') + esc(c.text) + '</li>'; }).join('') +
        (r.hidden && r.hidden.total ? '<li class="' + (r.hidden.passed === r.hidden.total ? 'ok' : 'bad') + '">' + (r.hidden.passed === r.hidden.total ? '✔ ' : '✘ ') + 'Verdeckte Tests: ' + r.hidden.passed + ' von ' + r.hidden.total + '</li>' : '') + '</ul>' +
        '<p class="dim small">Du kannst weiterarbeiten und erneut abgeben – es zählt die letzte Abgabe.</p></div>';
    }
    function showResult(item) { var el = $('#examRes'); if (el) el.innerHTML = resultHtml(results[item]); }
    function send() {
      var t = tasks[cur]; if (!t || busy || !running()) return;
      var a = { layout: ctx.layout(), answers: ctx.answers() }, btn = $('#btnSend');
      busy = true; if (btn) { btn.disabled = true; btn.textContent = 'Wird bewertet …'; }
      api('POST', 'exams/' + id + '/answer', { item: t.id, answer: a }).then(function (r) {
        if (r.status === 200) { results[t.id] = r.data.result; answers[t.id] = a; drafts[t.id] = { layout: a.layout, answers: a.answers, dirty: false }; store(); showResult(t.id); bar(); }
        else if (r.status === 409) refresh();
        else ctx.modal('<h2>Abgabe nicht möglich</h2><p>' + esc(r.data.error || 'Fehler ' + r.status) + '</p>');
      }).catch(function () { ctx.modal('<h2>Keine Verbindung</h2><p>Die Abgabe kam nicht an. Dein Aufbau bleibt erhalten – bitte gleich nochmals abgeben.</p>'); })
        .then(function () { busy = false; var b2 = $('#btnSend'); if (b2) { b2.disabled = false; b2.textContent = 'Abgeben'; } });
    }

    /* ---------- Theorie ---------- */
    function openTheory() {
      if (!running()) return;
      cur = 'q'; hideOverlay(); ctx.show('theory');
      $('#scr-theory').innerHTML = '<div class="theory exam-theory"><div class="crumb">Prüfung · Theorie</div><h2>Theoriefragen</h2><p class="dim">Je Frage ist genau eine Antwort richtig. Jede Auswahl wird sofort gespeichert; die Auflösung gibt es erst nach dem Abschluss.</p>' +
        questions.map(function (q, i) {
          return '<fieldset class="q" data-qid="' + esc(q.id) + '"><legend>' + (i + 1) + '. ' + q.q + '</legend>' + q.options.map(function (o, j) {
            return '<label><input type="radio" name="xq' + i + '" value="' + j + '"' + (answers[q.id] === j ? ' checked' : '') + '> ' + o + '</label>'; }).join('') + '<div class="expl dim small"></div></fieldset>';
        }).join('') + '</div>';
      Array.prototype.forEach.call(document.querySelectorAll('#scr-theory input[type=radio]'), function (inp) {
        inp.onchange = function () {
          var fs = inp.closest('fieldset'), qid = fs.dataset.qid, note = fs.querySelector('.expl'), v = +inp.value;
          note.textContent = 'speichere …';
          api('POST', 'exams/' + id + '/answer', { item: qid, answer: v }).then(function (r) {
            if (r.status === 200) { answers[qid] = v; note.textContent = 'gespeichert'; bar(); }
            else { note.textContent = r.data.error || 'nicht gespeichert'; if (r.status === 409) refresh(); }
          }).catch(function () { note.textContent = 'keine Verbindung – bitte nochmals wählen'; });
        };
      });
      bar();
    }

    /* ---------- Abschluss ---------- */
    function askFinish() {
      if (!running()) return;
      var open = tasks.filter(function (t) { return !results[t.id]; }).length, dirty = tasks.filter(function (t) { return drafts[t.id] && drafts[t.id].dirty; }).length;
      var nq = questions.filter(function (q) { return answers[q.id] === undefined; }).length;
      ctx.modal('<h2>Prüfung beenden?</h2><p>Danach ist keine Abgabe mehr möglich.</p><ul>' +
        (open ? '<li><b>' + open + '</b> Aufgabe(n) ohne Abgabe</li>' : '') + (dirty ? '<li><b>' + dirty + '</b> Aufgabe(n) mit Änderungen seit der letzten Abgabe – sie zählen nur, wenn du sie abgibst</li>' : '') +
        (nq ? '<li><b>' + nq + '</b> Theoriefrage(n) offen</li>' : '') + (!open && !dirty && !nq ? '<li>Alles abgegeben.</li>' : '') + '</ul>',
        [{ label: 'Weiterarbeiten' }, { label: 'Jetzt beenden', primary: true, action: function () { finish(0); } }]);
    }
    function finish(n) {
      if (finishing && !n) return; finishing = true;
      overlay('<h2>Prüfung wird ausgewertet</h2><p class="live-big"><span class="live-pulse"></span> Einen Moment …</p>');
      api('POST', 'exams/' + id + '/submit', {}).then(function (r) {
        if (r.status === 409 && n < 8) { setTimeout(function () { finish(n + 1); }, 1500); return; }
        if (r.status !== 200) { finishing = false; overlay('<h2>Abschluss nicht möglich</h2><p>' + esc(r.data.error || 'Fehler') + '</p><div class="live-actions"><button class="btn" id="exBack">Zurück</button></div>'); $('#exBack').onclick = hideOverlay; return; }
        take(r.data); done();
      }).catch(function () { finishing = false; overlay('<h2>Keine Verbindung</h2><p>Die Prüfung läuft auf dem Server weiter. Bitte nochmals versuchen.</p><div class="live-actions"><button class="btn primary" id="exAgain">Nochmals</button></div>'); $('#exAgain').onclick = function () { finish(0); }; });
    }
    function done() {
      clearInterval(tick);
      var b = $('#examBar'); if (b) { b.remove(); document.body.classList.remove('has-exam-bar'); }
      try { localStorage.removeItem(KEY); } catch (e) { /* egal */ }
      var r = ex.result || {}, pct = Math.round((r.score || 0) * 100);
      var head = ex.state === 'voided' ? 'Prüfung annulliert' : r.passed ? (r.distinction ? 'Bestanden – mit Auszeichnung!' : 'Bestanden!') : 'Nicht bestanden';
      overlay('<div class="live-eyebrow exam-eyebrow">PRÜFUNG · ' + LEVEL[ex.level].toUpperCase() + '</div><h2>' + head + '</h2>' +
        (ex.state === 'voided' ? '<p>' + esc(ex.voidReason || '') + '</p>' : '<p class="live-big"><b>' + pct + ' %</b> <span class="dim small">(bestanden ab 70 %, Auszeichnung ab 90 %)</span></p>' +
          (ex.state === 'expired' ? '<p class="dim small">Die Zeit ist abgelaufen – bewertet wurde der Stand der Abgaben.</p>' : '') +
          '<table class="exam-table"><tr><th>Aufgaben (70 %)</th><td class="mono">' + Math.round((r.tasks || 0) * 100) + ' %</td></tr>' +
          (r.perTask || []).map(function (t, i) { return '<tr class="sub"><th>' + (i + 1) + '. ' + esc(t.title) + '</th><td class="mono">' + Math.round(t.points * 100) + ' %</td></tr>'; }).join('') +
          '<tr><th>Theorie (30 %)</th><td class="mono">' + (r.theoryRight || 0) + ' / ' + (r.theoryTotal || 0) + '</td></tr></table>' +
          (!r.passed && r.weakChapters && r.weakChapters.length ? '<p class="dim small">Zum Wiederholen: Kapitel ' + r.weakChapters.join(', ') + '. Der nächste Versuch ist frühestens in 24 Stunden möglich.</p>' : '')) +
        '<div class="live-actions">' + (r.passed && ex.state !== 'voided' ? '<a class="btn primary" href="../#/zertifikate/ausstellen/' + id + '">Zertifikat ausstellen</a>' : '') + '<a class="btn" href="../#/zertifikate">Zum Portal</a><a class="btn" href="./">Zum Labor</a></div>');
    }

    /* ---------- Laden ---------- */
    function running() { return ex && ex.state === 'running' && !finishing; }
    function take(d) {
      ex = d.exam; ex.result = d.result; tasks = d.tasks || []; questions = d.questions || []; offset = ex.now - Date.now();
      answers = {}; results = {};
      Object.keys(d.answers || {}).forEach(function (k) { var a = d.answers[k]; answers[k] = a.answer; if (a.result) results[k] = a.result; });
    }
    function refresh() {
      return api('GET', 'exams/' + id).then(function (r) {
        if (r.status === 401) { overlay('<h2>Nicht angemeldet</h2><p>Für die Prüfung brauchst du dein Konto.</p><div class="live-actions"><a class="btn primary" href="../#/login">Anmelden</a></div>'); return false; }
        if (r.status !== 200) { overlay('<h2>Prüfung</h2><p>' + esc(r.data.error || 'Fehler') + '</p><div class="live-actions"><a class="btn primary" href="../#/zertifikate">Zu den Zertifikaten</a></div>'); return false; }
        take(r.data);
        if (ex.state !== 'running') { done(); return false; }
        return true;
      });
    }
    function start() {
      if (!id) return Promise.resolve();
      document.body.classList.add('exam-mode'); load();
      overlay('<h2>Prüfung</h2><p class="live-big"><span class="live-pulse"></span> Wird geladen …</p>');
      return refresh().then(function (okay) {
        if (!okay) return;
        var first = 0; tasks.some(function (t, i) { if (!results[t.id]) { first = i; return true; } return false; });
        openTask(first);
        tick = setInterval(function () { if (!running()) return; timeOnly(); if (left() <= 0) finish(0); }, 1000);
        var lost = function () { if (!running() || Date.now() - lastFocus < 3000) return; lastFocus = Date.now(); api('POST', 'exams/' + id + '/focus', {}).catch(function () {}); };
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') lost(); });
        root.addEventListener('blur', lost);
        root.addEventListener('beforeunload', function (ev) { if (running() && tasks.some(function (t) { return drafts[t.id] && drafts[t.id].dirty; })) { ev.preventDefault(); ev.returnValue = ''; } });
      }).catch(function () { overlay('<h2>Keine Verbindung</h2><p>Die Prüfung konnte nicht geladen werden. Die Zeit läuft auf dem Server weiter.</p><div class="live-actions"><button class="btn primary" id="exRetry">Nochmals versuchen</button></div>'); $('#exRetry').onclick = function () { start(); }; });
    }
    return { id: id, start: start, send: send, draft: draft, reset: reset, back: function () { if (cur === 'q') openTheory(); else openTask(cur < 0 ? 0 : cur); },
      get exam() { return ex; }, get tasks() { return tasks; }, get questions() { return questions; }, get results() { return results; }, get current() { return cur; } };
  }
  root.DQExamUI = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);

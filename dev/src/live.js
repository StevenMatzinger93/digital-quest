/* Digital Quest – Live-Challenge im Spiel (window.DQLive), Portal-Version: labor/?live=ID (nach dem Vorbild von SPS Quest).
 * Die Aufgabe erscheint erst nach dem Start. Versuche, Tipps und die Loesung (Schaltung + Messwerte) gehen an den Worker,
 * alle 2,5 s wird der Stand abgefragt. Sprint: Aufgabe vom Startaufbau aus loesen. Stoerungsjagd: auf dem Tisch liegt
 * eine fehlerhafte Schaltung (eine wrong-Loesung der Aufgabe, bugId = b<Aufgabe>_<Nummer>), die Ursache ist zu beheben. */
(function (root) {
  'use strict';
  function create(ctx) {
    var id = root.DQ_PORTAL ? +(new URLSearchParams(location.search).get('live') || 0) : 0;
    var ch = null, me = null, top = [], info = {}, timer = 0, tick = 0, offset = 0, started = false, done = false, sending = Promise.resolve(), bugs = null;
    var esc = ctx.esc, $ = function (s) { return document.querySelector(s); };
    /* Paket A: Tier-Avatar auf dem Podest (Sieger tanzt), sonst nichts */
    var avHTML = function (av, cls) { return av && root.SPSQAvatar ? '<span class="live-av ' + (cls || '') + '">' + root.SPSQAvatar.svg(av, { size: 'card', pose: 'dance', anim: !/other/.test(cls || '') }) + '</span>' : ''; };
    function api(method, url, body) {
      return fetch('/api/' + url, { method: method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: body ? JSON.stringify(body) : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d }; }); });
    }
    function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
    function left() { return ch && ch.state === 'running' ? (ch.endsAt - (Date.now() + offset)) / 1000 : 0; }
    function modeName() { return ch && ch.mode === 'bug' ? 'Störungsjagd' : 'Sprint'; }
    function overlay(html) {
      var o = $('#liveOverlay');
      if (!o) { o = document.createElement('div'); o.id = 'liveOverlay'; o.className = 'live-overlay'; o.setAttribute('role', 'dialog'); document.body.appendChild(o); }
      o.innerHTML = '<div class="live-card">' + html + '</div>'; o.style.display = 'flex';
    }
    function hideOverlay() { var o = $('#liveOverlay'); if (o) o.style.display = 'none'; }
    function bar() {
      var b = $('#liveBar');
      if (!b) { b = document.createElement('div'); b.id = 'liveBar'; b.className = 'live-bar'; b.setAttribute('role', 'status'); document.body.appendChild(b); document.body.classList.add('has-live-bar'); }
      var l = left();
      b.innerHTML = '<span class="lb-live"><i></i>LIVE</span><span class="lb-mode">' + modeName() + '</span><span class="lb-time' + (l < 60 ? ' low' : '') + '">' + fmt(l) + '</span>' +
        '<span>' + (me && me.solved ? '<b class="lb-ok">✔ gelöst · ' + me.points + ' P' + (me.rank ? ' · Rang ' + me.rank : '') + '</b>' : 'Versuche ' + (me ? me.attempts : 0) + ' · Tipps ' + (me ? me.hints : 0)) + '</span>' +
        '<span class="lb-count">' + (info.solved || 0) + '/' + (info.players || 0) + ' gelöst</span>';
    }
    function board() {
      if (!ch) return;
      ctx.closeModal();
      var pod = top.slice(0, 3);
      overlay('<div class="live-eyebrow">LIVE-CHALLENGE · ' + modeName().toUpperCase() + '</div><h2>' + (ch.state === 'ended' ? 'Challenge beendet' : 'Rangliste') + '</h2>' +
        (me && me.solved ? '<p class="live-big">Rang <b>' + (me.rank || '–') + '</b> · ' + me.points + ' Punkte</p>' : '<p class="live-big">' + (ch.state === 'ended' ? 'Diesmal nicht gelöst – beim nächsten Mal!' : 'Noch nicht gelöst') + '</p>') +
        (pod.length ? '<div class="podium">' + [1, 0, 2].filter(function (i) { return pod[i]; }).map(function (i) { return '<div class="pod p' + (i + 1) + '">' + avHTML(pod[i].avatar, i ? 'other' : 'win') + '<div class="pod-name">' + esc(pod[i].username) + '</div><div class="pod-pts">' + pod[i].points + ' P</div><div class="pod-step">' + (i + 1) + '</div></div>'; }).join('') + '</div>' : '') +
        (top.length > 3 ? '<ol class="live-list" start="4">' + top.slice(3).map(function (p) { return '<li>' + esc(p.username) + ' <span>' + p.points + ' P</span></li>'; }).join('') + '</ol>' : '') +
        '<div class="live-actions">' + (ch.state === 'running' ? '<button class="btn" id="liveBack">Zurück zur Aufgabe</button>' : '') + '<a class="btn primary" href="../#/live">Zum Portal</a></div>');
      var bk = $('#liveBack'); if (bk) bk.onclick = hideOverlay;
    }
    function loadBugs() {
      if (bugs) return Promise.resolve(bugs);
      return fetch('../data/dq_live.json').then(function (r) { return r.json(); }).then(function (d) { bugs = d.bugs || []; return bugs; }).catch(function () { return []; });
    }
    function begin() {
      if (started) return; started = true;
      var t = ctx.byId[ch.taskId];
      if (!t || t.kind === 'theory') { overlay('<h2>Aufgabe nicht gefunden</h2><p>Diese Challenge nutzt eine Aufgabe, die es in dieser Version nicht gibt. Bitte die Seite neu laden.</p>'); return; }
      if (ch.mode !== 'bug') { ctx.open(t, { live: { id: id }, layout: null }); hideOverlay(); bar(); return; }
      var m = /^b(.+)_(\d+)$/.exec(ch.bugId || ''), w = m && m[1] === t.id ? (t.wrong || [])[+m[2] - 1] : null;
      loadBugs().then(function (list) {
        var b = list.filter(function (x) { return x.id === ch.bugId; })[0] || {};
        ctx.open(t, { live: { id: id, bug: { id: ch.bugId, symptom: b.symptom || '' } }, layout: w ? { parts: w.parts, wires: w.wires } : null });
        hideOverlay(); bar();
      });
    }
    function stop() { clearInterval(timer); clearInterval(tick); }
    function refresh() {
      return api('GET', 'live/' + id).then(function (r) {
        if (r.status === 401) { overlay('<h2>Nicht angemeldet</h2><p>Für die Live-Challenge brauchst du dein Konto.</p><div class="live-actions"><a class="btn primary" href="../#/login">Anmelden</a></div>'); stop(); return; }
        if (r.status !== 200) { overlay('<h2>Live-Challenge</h2><p>' + esc(r.data.error || 'Fehler') + '</p><div class="live-actions"><a class="btn primary" href="../#/live">Code eingeben</a></div>'); stop(); return; }
        ch = r.data.challenge; me = r.data.me; top = r.data.top || []; info = { players: r.data.players, solved: r.data.solved };
        offset = ch.serverTime - Date.now();
        if (ch.state === 'lobby') overlay('<div class="live-eyebrow">LIVE-CHALLENGE · ' + modeName().toUpperCase() + '</div><h2>Gleich geht es los</h2><p class="live-big"><span class="live-pulse"></span> Warte auf den Start …</p><p>' + info.players + ' Teilnehmende · ' + fmt(ch.duration) + ' min Zeit</p><p class="live-small">Angemeldet als <b>' + esc(ctx.acct && ctx.acct.user ? ctx.acct.user.username : '') + '</b></p>');
        else if (ch.state === 'running') { begin(); if (started) bar(); }
        else if (ch.state === 'ended' && !done) { done = true; if (started) bar(); board(); stop(); }
      }).catch(function () { /* kurz ohne Verbindung: naechste Abfrage versucht es wieder */ });
    }
    function start() {
      if (!id) return Promise.resolve();
      document.body.classList.add('live-mode');
      overlay('<h2>Live-Challenge</h2><p class="live-big"><span class="live-pulse"></span> Verbinde …</p>');
      return refresh().then(function () {
        if (done) return;
        timer = setInterval(refresh, 2500);
        tick = setInterval(function () { if (ch && ch.state === 'running' && started) { bar(); if (left() <= 0) refresh(); } }, 1000);
      });
    }
    function attempt(ok, code) {
      if (!id || !ch || ch.state !== 'running') return;
      if (me && !me.solved) me.attempts++;
      sending = sending.then(function () { return api('POST', 'live/' + id + '/attempt', { ok: ok, code: ok ? code : undefined }); }).then(function (r) {
        if (r && r.data && r.data.solved) {
          me.solved = true; me.points = r.data.points; bar();
          var p = $('#livePts'); if (p) p.innerHTML = '<b>+' + r.data.points + ' Punkte</b> in der Live-Challenge';
          refresh();
        }
      }).catch(function () {});
      bar();
    }
    function hint() { if (!id || !ch || ch.state !== 'running') return; if (me) me.hints++; bar(); sending = sending.then(function () { return api('POST', 'live/' + id + '/hint', {}); }).catch(function () {}); }
    return { id: id, start: start, attempt: attempt, hint: hint, board: board, get challenge() { return ch; }, get me() { return me; } };
  }
  root.DQLive = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);

/* Digital Quest – Konto-Abgleich mit dem Portal (window.DQAccount), nach dem Vorbild von SPS Quest.
 * Nur in der Portal-Version (window.DQ_PORTAL, Spiel unter /labor/). Angemeldet wird im Portal; das Spiel liest die Sitzung
 * (Cookie) und gleicht den Spielstand ab: PUT /api/progress/dq mit base, bei 409 gilt der weitere Stand.
 * Ohne Anmeldung, offline oder als Einzeldatei laeuft alles wie bisher lokal.
 * SYNC_KEY merkt sich, zu welchem Konto der lokale Spielstand gehoert (wichtig an geteilten Schul-PCs).
 * Dozent/Admin-Konto = Dozentenmodus: alle Stationen offen, Sprungliste, Werkbank mit allen Bauteilen. */
(function (root) {
  'use strict';
  var Q = 'dq', KEY = 'digitalquest_state_v1', SYNC_KEY = 'dquest_sync_' + Q, VG_KEY = 'dquest_vorgaben_' + Q;
  var PORTAL = !!root.DQ_PORTAL;
  var ctx = null, user = null, offline = false, timer = 0, busy = false, again = false, ready = null, mine = null;
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return ctx.esc(s); }
  function S() { return ctx.state(); }

  function api(method, url, body) {
    var text = body ? JSON.stringify(body) : undefined;
    return fetch('/api/' + url, { method: method, credentials: 'same-origin', keepalive: method === 'PUT' && !!text && text.length < 60000,
      headers: { 'content-type': 'application/json', 'x-dquest': '1' }, body: text })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d }; }); });
  }
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null') || {}; } catch (e) { return {}; } }
  function write(key, o) { try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) { /* voll oder gesperrt */ } }
  function getSync() { return read(SYNC_KEY); }
  function setSync(o) { if (user) o.role = user.role; write(SYNC_KEY, o); }
  function count(st) { var d = (st && st.done) || {}; return Object.keys(d).filter(function (k) { return d[k]; }).length; }
  function localHas(st) { return count(st) > 0 || Object.keys(st.drafts || {}).length > 0; }

  /* Was der Server bekommt: der Spielstand ohne Namen, Ereignisliste gekuerzt (Platz) */
  function payload() {
    var s = JSON.parse(JSON.stringify(S()));
    if (s.profile) { delete s.profile.vorname; delete s.profile.nachname; }
    delete s.account; delete s.syncOwner;
    if (s.settings) delete s.settings.teacher;
    if (s.events && s.events.length > 1500) s.events = s.events.slice(-1500);
    return s;
  }
  function adopt(state, updatedAt) {
    var old = S(), n = Object.assign(ctx.fresh(), state || {});
    n.settings = Object.assign({}, old.settings);
    var p = state && state.profile && state.profile.id ? state.profile : ctx.fresh().profile;
    n.profile = { id: p.id, vorname: '', nachname: '', pseudonym: p.pseudonym || '' };
    if (getSync().user && user && getSync().user.toLowerCase() === user.username.toLowerCase()) { n.profile.vorname = old.profile.vorname || ''; n.profile.nachname = old.profile.nachname || ''; }
    ctx.setState(n);
    setSync({ user: user.username, base: updatedAt || 0, dirty: false });
    ctx.refresh();
  }
  function push(force) {
    if (!user || (user.role === 'admin' && user.secretAdmin)) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true;
    var sy = getSync(), sum = ctx.summary();
    return api('PUT', 'progress/' + Q, { state: payload(), summary: sum, base: sy.base || 0, force: !!force }).then(function (r) {
      if (r.status === 200) { setSync({ user: user.username, base: r.data.updatedAt, dirty: false, summary: sum }); chip(); return; }
      if (r.status === 409) return api('GET', 'progress/' + Q).then(function (g) {
        if (g.status === 200 && g.data.state && count(g.data.state) > count(S())) {
          adopt(g.data.state, g.data.updatedAt);
          ctx.toast('Spielstand abgeglichen', 'Auf einem anderen Geraet warst du schon weiter – dieser Stand wird jetzt verwendet.');
        } else { busy = false; return push(true); }
      });
      if (r.status === 401) { user = null; chip(); ctx.refresh(); }
    }).catch(function () { /* offline: bleibt "dirty" und wird spaeter uebertragen */ }).then(function () {
      busy = false;
      if (again) { again = false; schedule(); }
    });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(push, 3000); }
  function changed() {
    if (!user) return;
    var sy = getSync(); sy.user = user.username; sy.dirty = true; setSync(sy);
    schedule();
  }
  function ask(html, yes, no) {
    return new Promise(function (res) { ctx.modal(html, [{ label: no, action: function () { res(false); } }, { label: yes, primary: true, action: function () { res(true); } }]); });
  }
  function keep(name) { try { localStorage.setItem(KEY + '_' + name, JSON.stringify(S())); } catch (e) { /* Sicherungskopie ist freiwillig */ } }

  function loadMine() {
    if (!user || user.role !== 'student') { mine = null; return Promise.resolve(); }
    return api('GET', 'assignments/mine').then(function (r) {
      if (r.status !== 200) return;
      mine = r.data.assignments || []; write(VG_KEY, { user: user.username, list: mine });
      ctx.refresh();
    }).catch(function () { /* offline: die zuletzt geladenen Vorgaben gelten weiter */ });
  }

  function start() {
    if (!PORTAL) return Promise.resolve();
    chip();
    return api('GET', 'me').then(function (r) {
      if (r.status !== 200 || !r.data.user) { offline = r.status !== 200; user = null; chip(); ctx.refresh(); return; }
      user = r.data.user; offline = false;
      var sy0 = getSync(); if (sy0.user && sy0.user.toLowerCase() === user.username.toLowerCase() && sy0.role !== user.role) setSync(sy0);
      chip(); ctx.refresh();
      loadMine();
      if (user.role === 'admin' && user.secretAdmin) return;
      return api('GET', 'progress/' + Q).then(function (g) {
        if (g.status !== 200) return;
        var srv = g.data.state, srvAt = g.data.updatedAt || 0, sy = getSync(), me = user.username;
        if (sy.user && sy.user.toLowerCase() === me.toLowerCase()) {
          if (srv && srvAt > (sy.base || 0)) {
            if (sy.dirty && count(S()) > count(srv)) return push(true);
            adopt(srv, srvAt);
          } else if (sy.dirty || !srv) return push();
          return;
        }
        if (sy.user) { // lokaler Stand gehoert einem anderen Konto: nie mischen
          keep(sy.user.toLowerCase());
          if (srv) adopt(srv, srvAt); else { adopt(null, 0); return push(true); }
          return;
        }
        if (!localHas(S())) { if (srv) adopt(srv, srvAt); else { setSync({ user: me, base: 0, dirty: true }); return push(true); } return; }
        if (!srv) return ask('<h2>Spielstand ins Konto uebernehmen?</h2><p>In diesem Browser gibt es schon einen Spielstand (' + count(S()) + ' geloeste Stationen). Soll er in dein Konto <b>' + esc(me) + '</b> uebernommen werden?</p>', 'Uebernehmen', 'Neu beginnen')
          .then(function (yes) { if (!yes) { keep('lokal'); adopt(null, 0); } setSync({ user: me, base: 0, dirty: true }); return push(true); });
        return ask('<h2>Welcher Spielstand soll gelten?</h2><p>Konto <b>' + esc(me) + '</b>: ' + count(srv) + ' geloest · dieser Browser: ' + count(S()) + ' geloest.</p><p class="dim small">Der andere Stand wird ueberschrieben.</p>', 'Browser-Spielstand', 'Konto-Spielstand')
          .then(function (useLocal) { if (useLocal) { setSync({ user: me, base: srvAt, dirty: true }); return push(true); } keep('lokal'); adopt(srv, srvAt); });
      });
    }).catch(function () { offline = true; chip(); ctx.refresh(); });
  }

  /* Konto-Chip in der Kopfzeile: fuehrt ins Portal (dort anmelden, abmelden, Leitstand) */
  function chip() {
    var el = $('#acctChip'); if (!el) return;
    el.hidden = !PORTAL; if (!PORTAL) return;
    if (user) { el.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></svg><span>' + esc(user.username) + '</span>'; el.href = '../'; el.classList.add('on');
      el.title = 'Angemeldet als ' + user.username + ' – der Fortschritt wird im Konto gespeichert. Klick: Portal'; }
    else { el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg><span>' + (offline ? 'offline' : 'Anmelden') + '</span>'; el.href = offline ? '../' : '../#/login'; el.classList.remove('on');
      el.title = offline ? 'Keine Verbindung – der Fortschritt bleibt in diesem Browser.' : 'Im Portal anmelden, um den Fortschritt im Konto zu speichern'; }
  }

  /* ---------- Vorgaben (Lernende) ---------- */
  function chapterOf(id) { var DQ = root.DQ; return DQ.chapters.filter(function (c) { return String(c.id) === String(id); })[0] || (DQ.workshop && DQ.workshop.id === id ? DQ.workshop : null); }
  function targetItems(z) { var c; if (z.ziel_typ === 'kapitel') { c = chapterOf(z.ziel_id); return c ? c.sequence.slice() : []; } return root.DQ.byId[z.ziel_id] ? [z.ziel_id] : []; }
  function targetLabel(z) {
    var DQ = root.DQ, c, it;
    if (z.ziel_typ === 'kapitel') { c = chapterOf(z.ziel_id); return c ? (c === DQ.workshop ? '' : 'Kapitel ' + c.id + ' – ') + c.title : 'Kapitel ' + z.ziel_id; }
    it = DQ.byId[z.ziel_id]; return it ? (it.kind === 'theory' ? 'Theorie ' + it.id.slice(1) : (it.messOnly ? 'Messaufgabe ' : 'Aufgabe ') + it.id) + ' – ' + it.title : 'Station ' + z.ziel_id;
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDue(d) { if (!d) return ''; var p = d.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
  function list() {
    if (!PORTAL) return [];
    if (mine) return mine;
    var c = read(VG_KEY), sy = getSync(); // offline: zuletzt geladene Vorgaben des Kontos, dem der Spielstand gehoert
    var who = user ? user.username : (offline ? sy.user : null);
    return who && c.user && c.user.toLowerCase() === String(who).toLowerCase() && (user ? user.role === 'student' : sy.role === 'student') ? c.list || [] : [];
  }
  /* Vorgaben mit Stand fuer die Karte: {z, label, items, done, over, left, next} */
  function vorgaben() {
    var s = S(), t = today();
    return list().map(function (a) {
      var z = { id: a.id, ziel_typ: a.type, ziel_id: a.target, faellig_am: a.due, fuer: a.forMe ? 'dich' : 'klasse', dozent: a.teacher };
      var items = targetItems(z), open = items.filter(function (id) { return !s.done[id]; }), fin = items.length > 0 && !open.length;
      return { z: z, label: targetLabel(z), items: items, done: fin, left: open.length, over: !!(z.faellig_am && z.faellig_am < t && !fin), next: open[0] || items[0] };
    }).filter(function (v) { return v.items.length; });
  }
  /* Dozentenmodus: am Konto (Rolle), offline gilt die zuletzt bekannte Rolle des Kontos, dem der Spielstand gehoert */
  function staff() {
    if (!PORTAL) return false;
    if (user) return user.role === 'teacher' || user.role === 'admin';
    var r = getSync().role; return offline && (r === 'teacher' || r === 'admin');
  }

  if (PORTAL) {
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && user && getSync().dirty) { clearTimeout(timer); push(); } });
    root.addEventListener('online', function () { if (user && getSync().dirty) push(); else if (!user) start(); });
  }

  root.DQAccount = {
    init: function (c) { ctx = c; },
    start: function () { return (ready = start()); },
    get ready() { return ready; }, get user() { return user; }, get portal() { return PORTAL; }, get offline() { return offline; },
    changed: changed, push: push, staff: staff, vorgaben: vorgaben, fmtDue: fmtDue, api: api, chip: chip
  };
})(typeof window !== 'undefined' ? window : globalThis);

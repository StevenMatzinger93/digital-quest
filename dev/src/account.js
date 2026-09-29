/* Digital Quest – Konto-Bereich (window.DQAccount): Anmeldung, Selbstregistrierung, Admin- und Dozentenansicht.
 * Freiwillig: Ohne Konto bleibt alles wie bisher (localStorage ist die Basis). Mit Konto kommen Klassen, Vorgaben
 * mit Frist und der Fortschritt-Spiegel auf dem Server dazu (worker/index.js).
 * app.js ruft DQAccount.init(ctx) auf; ctx: { state(), save(), modal(), esc(), log(), renderMap(), setTeacher(on) } */
(function (root) {
  'use strict';
  var DEFAULT_API = 'https://digital-quest.steven-matzinger93.workers.dev'; // fuer die Offline-Datei (file://)
  var ctx = null, view = { klasse: null, msg: '' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function S() { return ctx.state(); }
  function esc(s) { return ctx.esc(s); }
  function acc() { return S().account || null; }
  function role() { return acc() ? acc().konto.rolle : null; }

  function apiBase() {
    var q = /[?&]api=([^&]+)/.exec(location.search);
    if (q) return decodeURIComponent(q[1]).replace(/\/$/, '');
    if (/^https?:$/.test(location.protocol)) return location.origin;
    return DEFAULT_API;
  }
  /* Aufruf der API; wirft Error(Meldung) mit .status. 401 mit Token → lokal abmelden */
  function api(method, path, data) {
    var h = { 'Content-Type': 'application/json' }, a = acc();
    if (a && a.token) h.Authorization = 'Bearer ' + a.token;
    return fetch(apiBase() + path, { method: method, headers: h, body: data ? JSON.stringify(data) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { r: r, b: b }; }); },
        function () { var e = new Error('Keine Verbindung zum Server. Ohne Internet spielst du einfach lokal weiter.'); e.status = 0; throw e; })
      .then(function (x) {
        if (x.r.ok) return x.b;
        if (x.r.status === 401 && a && a.token && path !== '/api/login') { dropAccount(); }
        var e = new Error(x.b.fehler || ('Fehler ' + x.r.status)); e.status = x.r.status; throw e;
      });
  }
  function setAccount(res) {
    var s = S(), wasTeacher = !!s.settings.teacher;
    s.account = { token: res.token, konto: res.konto, api: apiBase(), seit: Date.now() };
    // Dozenten- und Admin-Konten schalten den Dozentenmodus ein (nur Freischaltung, veraendert keinen Fortschritt)
    if (res.konto.rolle !== 'schueler' && !wasTeacher) { s.account.teacherAuto = true; ctx.setTeacher(true); }
    ctx.log('login', { rolle: res.konto.rolle }); ctx.save();
  }
  function dropAccount() {
    var s = S(), a = s.account; if (!a) return;
    if (a.teacherAuto) ctx.setTeacher(false);
    delete s.account; view.klasse = null; ctx.save();
  }

  /* ---------- Darstellung ---------- */
  function render(msg) {
    if (msg !== undefined) view.msg = msg;
    var el = $('#scr-account'); if (!el) return;
    var a = acc(), h = '<div class="account"><h2>Konto</h2>';
    if (view.msg) h += '<div class="st ' + (view.msg.ok ? 'ok' : 'err') + '">' + esc(view.msg.text) + '</div>';
    if (!a) h += loggedOut();
    else {
      h += '<section class="acc-who"><div><span class="part-no">' + ({ admin: 'Admin', dozent: 'Dozent', schueler: 'Schueler' }[a.konto.rolle]) + '</span><h3>' + esc(a.konto.pseudonym) + '</h3>' +
        '<span class="dim small mono">' + esc(a.konto.benutzer) + (a.konto.klasse ? ' · Klasse ' + esc(a.konto.klasse) : '') + '</span></div>' +
        '<button class="btn" id="accOut">Abmelden</button></section>';
      if (a.konto.rolle === 'admin') h += '<div id="accAdmin" class="dim">Laedt …</div>';
      if (a.konto.rolle === 'dozent') h += '<div id="accDoz" class="dim">Laedt …</div>';
      if (a.konto.rolle === 'schueler') h += '<div id="accStud"></div>';
    }
    el.innerHTML = h + '</div>';
    bind();
    if (a && a.konto.rolle === 'admin') loadAdmin();
    if (a && a.konto.rolle === 'dozent') loadDozent();
    if (a && a.konto.rolle === 'schueler' && root.DQAccount.renderStudent) root.DQAccount.renderStudent($('#accStud'));
  }
  function loggedOut() {
    return '<p class="dim">Ein Konto ist <b>freiwillig</b>. Ohne Konto spielst du ganz normal – dein Fortschritt bleibt auf diesem Geraet. ' +
      'Mit Konto siehst du Vorgaben deiner Lehrperson und dein Fortschritt ist auch auf anderen Geraeten da. Es werden nur Benutzername und Pseudonym gespeichert, keine echten Namen.</p>' +
      '<div class="acc-grid"><form class="acc-card" id="fLogin"><h3>Anmelden</h3>' +
      field('Benutzername', 'lU', 'text', 'username') + field('Passwort', 'lP', 'password', 'current-password') +
      '<button class="btn primary" type="submit">Anmelden</button></form>' +
      '<form class="acc-card" id="fReg"><h3>Neu in einer Klasse?</h3><p class="dim small">Mit dem Klassencode deiner Lehrperson selbst ein Konto anlegen.</p>' +
      field('Klassencode', 'rC', 'text', 'off') + field('Benutzername', 'rU', 'text', 'username') + field('Pseudonym (wird angezeigt)', 'rN', 'text', 'nickname') +
      field('Passwort (mind. 6 Zeichen)', 'rP', 'password', 'new-password') + field('Passwort wiederholen', 'rP2', 'password', 'new-password') +
      '<button class="btn primary" type="submit">Konto anlegen</button></form></div>';
  }
  function field(label, id, type, ac) { return '<label class="fld acc-fld"><span>' + label + '</span><input id="' + id + '" type="' + type + '" autocomplete="' + ac + '"></label>'; }
  function fail(e) { render({ ok: false, text: e.message }); }
  function done(text) { render({ ok: true, text: text }); }

  function bind() {
    var fl = $('#fLogin');
    if (fl) fl.onsubmit = function (ev) {
      ev.preventDefault();
      api('POST', '/api/login', { benutzer: $('#lU').value, passwort: $('#lP').value })
        .then(function (res) { setAccount(res); if (res.konto.rolle === 'schueler' && root.DQAccount.afterStudentLogin) root.DQAccount.afterStudentLogin(); done('Angemeldet als ' + res.konto.pseudonym + '.'); }, fail);
    };
    var fr = $('#fReg');
    if (fr) fr.onsubmit = function (ev) {
      ev.preventDefault();
      if ($('#rP').value !== $('#rP2').value) { fail(new Error('Die Passwoerter stimmen nicht ueberein.')); return; }
      api('POST', '/api/registrieren', { code: $('#rC').value, benutzer: $('#rU').value, pseudonym: $('#rN').value, passwort: $('#rP').value })
        .then(function (res) { setAccount(res); if (root.DQAccount.afterStudentLogin) root.DQAccount.afterStudentLogin(); done('Willkommen in der Klasse ' + res.konto.klasse + '!'); }, fail);
    };
    var out = $('#accOut');
    if (out) out.onclick = function () {
      api('POST', '/api/logout').catch(function () {}).then(function () { dropAccount(); ctx.log('logout', {}); done('Abgemeldet. Dein lokaler Fortschritt bleibt auf diesem Geraet.'); ctx.renderMap(); });
    };
  }

  /* Eingabe-Dialog (Passwort setzen, Bestaetigen) ueber den Modal von app.js */
  function ask(title, text, input, okLabel, fn) {
    ctx.modal('<h2>' + esc(title) + '</h2><p>' + text + '</p>' + (input ? '<label class="fld acc-fld"><span>' + input + '</span><input id="askIn" type="text" autocomplete="off"></label>' : ''),
      [{ label: 'Abbrechen' }, { label: okLabel, primary: true, action: function () { fn(input ? ($('#askIn') || {}).value : true); } }]);
    setTimeout(function () { var i = $('#askIn'); if (i) i.focus(); }, 30);
  }

  /* ---------- Admin: Dozenten ---------- */
  function loadAdmin() {
    api('GET', '/api/admin/dozenten').then(function (res) {
      var h = '<section class="acc-card"><h3>Dozentinnen und Dozenten</h3>' +
        (res.dozenten.length ? '<table class="acc-t"><tr><th>Benutzer</th><th>Pseudonym</th><th>Klassen</th><th>Schueler</th><th></th></tr>' + res.dozenten.map(function (d) {
          return '<tr><td class="mono">' + esc(d.benutzer) + '</td><td>' + esc(d.pseudonym) + '</td><td>' + d.klassen + '</td><td>' + d.schueler + '</td>' +
            '<td class="acc-act"><button class="btn small" data-dpw="' + d.id + '">Passwort</button><button class="btn small danger" data-ddel="' + d.id + '" data-name="' + esc(d.benutzer) + '">Loeschen</button></td></tr>';
        }).join('') + '</table>' : '<p class="dim">Noch keine Dozenten.</p>') +
        '<form id="fDoz" class="acc-inline"><h4>Dozent anlegen</h4>' + field('Benutzername', 'dU', 'text', 'off') + field('Pseudonym', 'dN', 'text', 'off') + field('Start-Passwort', 'dP', 'text', 'off') +
        '<button class="btn primary" type="submit">Anlegen</button></form></section>';
      $('#accAdmin').outerHTML = '<div id="accAdmin">' + h + '</div>';
      $('#fDoz').onsubmit = function (ev) {
        ev.preventDefault();
        api('POST', '/api/admin/dozenten', { benutzer: $('#dU').value, pseudonym: $('#dN').value, passwort: $('#dP').value })
          .then(function (r) { done('Dozent ' + r.dozent.benutzer + ' angelegt. Start-Passwort bitte sicher weitergeben.'); }, fail);
      };
      $$('[data-dpw]').forEach(function (b) { b.onclick = function () { ask('Neues Passwort', 'Die Person wird dabei abgemeldet.', 'Neues Passwort (mind. 6 Zeichen)', 'Setzen', function (pw) { api('POST', '/api/admin/dozenten/' + b.dataset.dpw + '/passwort', { passwort: pw }).then(function () { done('Passwort gesetzt.'); }, fail); }); }; });
      $$('[data-ddel]').forEach(function (b) { b.onclick = function () { ask('Dozent loeschen?', 'Alle Klassen, Schueler-Konten und Vorgaben von <b>' + esc(b.dataset.name) + '</b> werden ebenfalls geloescht.', null, 'Endgueltig loeschen', function () { api('DELETE', '/api/admin/dozenten/' + b.dataset.ddel).then(function () { done('Geloescht.'); }, fail); }); }; });
    }, function (e) { $('#accAdmin').textContent = e.message; });
  }

  /* ---------- Dozent: Klassen, Schueler ---------- */
  function loadDozent() {
    api('GET', '/api/klassen').then(function (res) {
      var ks = res.klassen;
      if (view.klasse && !ks.some(function (k) { return k.id === view.klasse; })) view.klasse = null;
      if (!view.klasse && ks.length) view.klasse = ks[0].id;
      var h = '<section class="acc-card"><h3>Meine Klassen</h3><div class="acc-tabs">' + ks.map(function (k) {
        return '<button class="btn' + (k.id === view.klasse ? ' on' : '') + '" data-kl="' + k.id + '">' + esc(k.name) + ' <span class="dim small">(' + k.schueler + ')</span></button>';
      }).join('') + '</div>' +
        '<form id="fKl" class="acc-inline">' + field('Neue Klasse', 'kN', 'text', 'off') + '<button class="btn" type="submit">Klasse anlegen</button></form></section>' +
        '<div id="accKlasse"></div>';
      $('#accDoz').outerHTML = '<div id="accDoz">' + h + '</div>';
      $$('[data-kl]').forEach(function (b) { b.onclick = function () { view.klasse = b.dataset.kl; render(''); }; });
      $('#fKl').onsubmit = function (ev) { ev.preventDefault(); api('POST', '/api/klassen', { name: $('#kN').value }).then(function (r) { view.klasse = r.klasse.id; done('Klasse ' + r.klasse.name + ' angelegt – Klassencode ' + r.klasse.code + '.'); }, fail); };
      if (view.klasse) loadKlasse(view.klasse);
    }, function (e) { $('#accDoz').textContent = e.message; });
  }
  function progressOf(x) { var n = Object.keys(x.erledigt || {}).length; return n; }
  function loadKlasse(id) {
    api('GET', '/api/klassen/' + id).then(function (res) {
      var k = res.klasse, xs = res.schueler, total = ctx.order().length;
      var h = '<section class="acc-card"><div class="acc-kh"><div><span class="part-no">Klasse</span><h3>' + esc(k.name) + '</h3></div>' +
        '<div class="acc-code"><span class="dim small">Klassencode</span><b class="mono">' + esc(k.code) + '</b><button class="btn small" id="kCode" title="Neuen Code erzeugen – der alte gilt dann nicht mehr">Neu</button></div></div>' +
        (xs.length ? '<table class="acc-t"><tr><th>Pseudonym</th><th>Benutzer</th><th>Fortschritt</th><th>Zuletzt</th><th></th></tr>' + xs.map(function (x) {
          var n = progressOf(x);
          return '<tr><td>' + esc(x.pseudonym) + '</td><td class="mono">' + esc(x.benutzer) + '</td>' +
            '<td><div class="acc-bar"><i style="width:' + (100 * n / Math.max(1, total)).toFixed(1) + '%"></i></div><span class="small mono">' + n + ' / ' + total + '</span></td>' +
            '<td class="small">' + (x.zuletzt ? new Date(x.zuletzt).toLocaleDateString('de-CH') : '–') + '</td>' +
            '<td class="acc-act"><button class="btn small" data-spw="' + x.id + '">Passwort</button><button class="btn small danger" data-sdel="' + x.id + '" data-name="' + esc(x.pseudonym) + '">Entfernen</button></td></tr>';
        }).join('') + '</table>' : '<p class="dim">Noch keine Schueler. Gib den Klassencode weiter oder lege Konten hier an.</p>') +
        '<form id="fSch" class="acc-inline"><h4>Schueler anlegen</h4>' + field('Benutzername', 'sU', 'text', 'off') + field('Pseudonym', 'sN', 'text', 'off') + field('Start-Passwort', 'sP', 'text', 'off') +
        '<button class="btn" type="submit">Anlegen</button></form>' +
        '<p class="acc-danger"><button class="btn small danger" id="kDel">Klasse loeschen</button></p></section>' +
        '<div id="accZuw"></div>';
      $('#accKlasse').innerHTML = h;
      $('#kCode').onclick = function () { api('POST', '/api/klassen/' + k.id + '/code').then(function (r) { done('Neuer Klassencode: ' + r.code + '. Der alte gilt nicht mehr.'); }, fail); };
      $('#fSch').onsubmit = function (ev) { ev.preventDefault(); api('POST', '/api/klassen/' + k.id + '/schueler', { benutzer: $('#sU').value, pseudonym: $('#sN').value, passwort: $('#sP').value }).then(function (r) { done(r.schueler.pseudonym + ' angelegt (Benutzer ' + r.schueler.benutzer + ').'); }, fail); };
      $('#kDel').onclick = function () { ask('Klasse loeschen?', 'Alle Schueler-Konten der Klasse <b>' + esc(k.name) + '</b>, ihr gespiegelter Fortschritt und die Vorgaben werden geloescht. Der lokale Fortschritt auf den Geraeten bleibt.', null, 'Endgueltig loeschen', function () { api('DELETE', '/api/klassen/' + k.id).then(function () { view.klasse = null; done('Klasse geloescht.'); }, fail); }); };
      $$('[data-spw]').forEach(function (b) { b.onclick = function () { ask('Neues Passwort', 'Die Person wird dabei abgemeldet.', 'Neues Passwort (mind. 6 Zeichen)', 'Setzen', function (pw) { api('POST', '/api/schueler/' + b.dataset.spw + '/passwort', { passwort: pw }).then(function () { done('Passwort gesetzt.'); }, fail); }); }; });
      $$('[data-sdel]').forEach(function (b) { b.onclick = function () { ask('Schueler entfernen?', 'Das Konto von <b>' + esc(b.dataset.name) + '</b> und sein gespiegelter Fortschritt werden geloescht.', null, 'Entfernen', function () { api('DELETE', '/api/schueler/' + b.dataset.sdel).then(function () { done('Entfernt.'); }, fail); }); }; });
      if (root.DQAccount.renderAssignments) root.DQAccount.renderAssignments($('#accZuw'), k, xs);
    }, function (e) { $('#accKlasse').textContent = e.message; });
  }

  root.DQAccount = {
    init: function (c) { ctx = c; },
    render: render, api: api, apiBase: apiBase, acc: acc, role: role, esc: esc, ask: ask, done: done, fail: fail, field: field,
    reload: function () { render(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);

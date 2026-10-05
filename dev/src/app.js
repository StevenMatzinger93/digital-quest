/* Digital Quest – Spielsteuerung (window.DigitalQuest) */
(function () {
  'use strict';
  var root = window;
  var E = window.DQEngine, DQ = window.DQ, Editor = window.DQEditor, Circuit = window.DQCircuit, Bench = window.DQBench;
  var KEY = 'digitalquest_state_v1';
  var UNLOCK_ALL = /[?&]alle\b/.test(location.search);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ================= Speicherstand =================
   * Vorbereitung Buehler Quest: Personen-ID als UUID, Vor-/Nachname getrennt, Ereignisliste mit Zeitstempel. */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function fresh() {
    return { version: 1, created: Date.now(), profile: { id: uuid(), vorname: '', nachname: '', pseudonym: '' },
      done: {}, doneInfo: {}, drafts: {}, theory: {}, events: [], settings: { theme: 'dark', zoom: 1 } };
  }
  /* Sterne: 3 = ohne Fehlversuch und ohne Tipp, 2 = hoechstens 2 Fehlversuche und 1 Tipp, sonst 1 */
  function starsFor(tries, hints) { return tries <= 1 && !hints ? 3 : tries <= 3 && hints <= 1 ? 2 : 1; }
  /* Spielstand auf den heutigen Aufbau bringen: fehlende Felder ergaenzen, doneInfo aus den Ereignissen nachfuellen */
  function normalize(d) {
    var f = fresh(), s = Object.assign(f, d && typeof d === 'object' ? d : {});
    ['done', 'doneInfo', 'drafts', 'theory'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    if (!Array.isArray(s.events)) s.events = [];
    s.settings = Object.assign({ theme: 'dark', zoom: 1 }, s.settings || {}); delete s.settings.teacher;
    if (!s.profile || !s.profile.id) s.profile = fresh().profile;
    ['vorname', 'nachname', 'pseudonym'].forEach(function (k) { if (typeof s.profile[k] !== 'string') s.profile[k] = ''; });
    delete s.account; delete s.syncOwner;
    Object.keys(s.done).forEach(function (id) {
      if (!s.done[id] || s.doneInfo[id]) return;
      var ev = s.events.filter(function (e) { return e.id === id && (e.type === 'task_done' || (e.type === 'theory_check' && e.pass)); })[0];
      s.doneInfo[id] = ev ? { at: ev.t, tries: ev.tries || 1, hints: ev.hints || 0, stars: ev.type === 'task_done' ? starsFor(ev.tries || 1, ev.hints || 0) : 2 } : { at: 0, tries: 1, hints: 0, stars: 1 };
    });
    return s;
  }
  var S;
  try { S = normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { S = fresh(); }
  var ACCT = root.DQAccount || null, LIVE = null, EXAM = null;
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(S)); indicator('Gespeichert', 'ok'); }
      catch (e) { indicator('Nicht gespeichert!', 'err'); }
    }, 250);
    if (ACCT) ACCT.changed();
  }
  function indicator(t, cls) { var el = $('#saveInd'); if (el) { el.textContent = t; el.className = cls; } }
  function log(type, data) {
    var ev = { t: Date.now(), type: type }; for (var k in data) ev[k] = data[k];
    S.events.push(ev); if (S.events.length > 5000) S.events.splice(0, S.events.length - 5000); save();
  }

  /* ================= Reihenfolge / Freischaltung ================= */
  var ORDER = []; DQ.chapters.forEach(function (c) { c.sequence.forEach(function (id) { ORDER.push(id); }); });
  /* Dozentenmodus (am Dozenten- oder Admin-Konto des Portals) oder ?alle: alles offen, Werkbank mit allen Bauteilen */
  function staff() { return !!ACCT && ACCT.staff(); }
  function allOpen() { return UNLOCK_ALL || staff(); }
  /* Vorgaben vom Dozent (Konto): zugewiesene Stationen sind immer offen – eine Vorgabe soll man auch bearbeiten koennen */
  function vorgaben() { return ACCT ? ACCT.vorgaben() : []; }
  function assigned(id) { return vorgaben().some(function (v) { return v.items.indexOf(id) >= 0; }); }
  /* Kapitel mit 'after' (z. B. Vertiefung Messtechnik nach 4.10) haengen nicht an der Karten-Reihenfolge: die erste Station oeffnet, sobald 'after' geloest ist */
  var CH_OF = {}; DQ.chapters.forEach(function (c) { c.sequence.forEach(function (id) { CH_OF[id] = c; }); });
  function unlocked(id) {
    if (allOpen() || assigned(id)) return true;
    var c = CH_OF[id], k = c ? c.sequence.indexOf(id) : -1;
    if (c && c.after) return k <= 0 ? !!S.done[c.after] : !!S.done[c.sequence[k - 1]];
    var i = ORDER.indexOf(id); return i <= 0 || !!S.done[ORDER[i - 1]];
  }
  function nextOf(id) {
    var w = DQ.workshop && DQ.workshop.sequence.indexOf(id);
    if (w >= 0) return DQ.workshop.sequence[w + 1]; // Uebungswerkstatt: weiter innerhalb der Werkstatt
    var i = ORDER.indexOf(id); return ORDER[i + 1];
  }

  /* ================= Navigation ================= */
  function show(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'scr-' + name); });
    $$('[data-go]').forEach(function (b) { b.classList.toggle('active', b.dataset.go === name); });
    current.screen = name;
    if (name !== 'theory' && speech.active) speech.stop();
    if (name !== 'task') stopLoop();
    if (typeof hideSheet === 'function') hideSheet(true);
    window.scrollTo(0, 0);
    if (name !== 'task' && name !== 'theory') syncHash(name);
  }
  var current = { screen: 'map' };
  /* ---------- Zurueck-Navigation: jeder Bildschirm hat eine Adresse (#/karte, #/aufgabe/1.1, #/theorie/T1A …), damit die
   * Zurueck-Taste des Browsers (und die Geste am Handy) zur Karte fuehrt statt die App zu verlassen. Hash statt Pfad, damit
   * die Offline-Einzeldatei (file://) weiter funktioniert. Pruefung und Live-Challenge schreiben keine Adressen. */
  var ROUTE = { map: 'karte', task: 'aufgabe', theory: 'theorie', manual: 'handbuch', tutorial: 'tutorial', settings: 'einstellungen', award: 'auszeichnung' };
  var routing = { silent: false };
  function hashFor(name) {
    var id = name === 'task' && current.task ? (current.task.sandbox ? 'sandbox' : current.task.id) : name === 'theory' && current.theory ? current.theory.id : '';
    return '#/' + (ROUTE[name] || name) + (id ? '/' + id : '');
  }
  function syncHash(name) {
    if (routing.silent || current.exam || current.live || !ROUTE[name]) return;
    var h = hashFor(name); if (location.hash === h) return;
    try { history.pushState({ dq: name }, '', h); } catch (e) { location.hash = h; }
  }
  function routeHash() {
    var m = /^#\/([a-z]+)(?:\/(.+))?$/.exec(location.hash || ''); if (!m) return false;
    var name = Object.keys(ROUTE).filter(function (k) { return ROUTE[k] === m[1]; })[0]; if (!name) return false;
    routing.silent = true;
    try {
      if (name === 'task' || name === 'theory') { var id = decodeURIComponent(m[2] || ''); if (id === 'sandbox' || DQ.byId[id]) openItem(id); else { renderMap(); show('map'); } }
      else if (name === 'tutorial') renderTutorial();
      else { if (name === 'map' || name === 'award') { renderMap(); name = 'map'; } if (name === 'manual') renderManual(); if (name === 'settings') renderSettings(); show(name); }
    } finally { routing.silent = false; }
    return true;
  }
  function goMap() { renderMap(); show('map'); }

  /* ================= Modal ================= */
  function modal(html, buttons) {
    var m = $('#modal');
    m.innerHTML = '<div class="modal-box">' + html + '<div class="modal-btns"></div></div>';
    (buttons || [{ label: 'OK' }]).forEach(function (b) {
      var el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label;
      el.onclick = function () { m.classList.remove('open'); if (b.action) b.action(); };
      $('.modal-btns', m).appendChild(el);
    });
    m.classList.add('open');
  }

  /* ================= Karte ================= */
  var ICON = {
    theory: '<svg viewBox="0 0 24 24"><path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-4a3 3 0 0 0-3 3"/></svg>',
    task: '<svg viewBox="0 0 24 24"><path d="M2 12h5l2-5 3 10 2-5h8"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>',
    scope: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M5 13c2-6 4-6 6 0s4 6 6 0"/></svg>'
  };
  /* Kachel einer Station: Symbol zum Inhalt (DQTiles), Nummer, Titel, unten Sterne bzw. Zustand */
  var TILES = root.DQTiles ? root.DQTiles.create(DQ, E) : null;
  function nextOpen() { return ORDER.filter(function (id) { return !S.done[id] && unlocked(id); })[0]; }
  function tile(id, opt) {
    opt = opt || {};
    var it = DQ.byId[id], open = opt.open !== undefined ? opt.open : unlocked(id), ok = !!S.done[id], di = S.doneInfo[id] || {}, th = it.kind === 'theory';
    var label = th ? 'Theorie ' + id.slice(1) : (it.messOnly ? 'Messaufgabe ' : 'Aufgabe ') + id;
    var foot = ok ? (th ? '<span class="nstate ok">' + ICON.ok + ' bestanden' + (S.theory[id] ? ' · ' + Math.round(100 * (S.theory[id].best || 0)) + ' %' : '') + '</span>' : '<span class="nstars" title="' + (di.stars || 1) + ' von 3 Sternen">' + starRow(di.stars || 1) + '</span>')
      : !open ? '<span class="nstate">' + ICON.lock + ' gesperrt</span>'
      : opt.next ? '<span class="nstate go">▶ hier weiter</span>' : S.drafts[id] ? '<span class="nstate draft">begonnen</span>' : '<span class="nstate">' + (th ? 'lesen + Check' : 'offen') + '</span>';
    return '<button class="node k-' + it.kind + (ok ? ' done' : '') + (open ? '' : ' locked') + (it.boss ? ' boss' : '') + (opt.next ? ' next' : '') + '" data-open="' + id + '"' + (open ? '' : ' disabled') + ' aria-label="' + esc(label + ': ' + it.title + (ok ? ' (gelöst)' : open ? '' : ' (gesperrt)')) + '">' +
      '<span class="nsym">' + (TILES ? TILES.html(it, Editor) : ICON[it.kind]) + (ok ? '<i class="nok">' + ICON.ok + '</i>' : '') + (it.boss ? '<i class="nboss">BOSS</i>' : '') + (th ? '<i class="nkind">Theorie</i>' : '') + '</span>' +
      '<span class="nid">' + (th ? 'T' + id.slice(1) : id) + vgTag('aufgabe', id, true) + '</span><span class="nt">' + esc(it.title) + '</span><span class="nfoot">' + foot + '</span></button>';
  }
  function ring(done, total) { // Fortschrittsring eines Kapitels
    var r = 17, c = 2 * Math.PI * r, p = total ? done / total : 0;
    return '<svg class="ring' + (done >= total && total ? ' full' : '') + '" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="' + r + '" class="ring-bg"/><circle cx="22" cy="22" r="' + r + '" class="ring-fg" stroke-dasharray="' + (c * p).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 22 22)"/></svg>';
  }
  function chapterHead(c, d, n, extra) {
    return '<header class="ch-head"><span class="ch-sym">' + (TILES ? TILES.chapter(c, Editor) : '') + '</span><div class="ch-txt"><span class="chno">' + (c.kind === 'workshop' ? 'Frei üben' : 'Kapitel ' + c.id) + '</span>' + (extra || '') +
      '<h2>' + esc(c.title) + '</h2><p>' + esc(c.intro || '') + '</p></div><div class="ch-prog" title="' + d + ' von ' + n + ' Stationen gelöst">' + ring(d, n) + '<span class="mono">' + d + '<small>/' + n + '</small></span></div></header>';
  }
  function renderMap() {
    var total = ORDER.length, done = ORDER.filter(function (id) { return S.done[id]; }).length, nx = nextOpen(), nxIt = nx && DQ.byId[nx], stars = 0;
    Object.keys(S.done).forEach(function (id) { if (S.done[id] && DQ.byId[id] && DQ.byId[id].kind !== 'theory') stars += (S.doneInfo[id] || {}).stars || 1; });
    var h = '<div class="map-head"><div class="map-title"><h1>Laborkarte</h1><p class="dim">Baue, miss, verstehe. Jede Station schaltet die nächste frei.</p></div>' +
      '<div class="map-stats"><div class="stat"><b class="mono">' + done + '<small>/' + total + '</small></b><span>Stationen</span></div><div class="stat"><b class="mono"><span class="star on">★</span> ' + stars + '</b><span>Sterne</span></div>' +
      '<div class="stat wide"><div class="bar"><i style="width:' + (100 * done / Math.max(1, total)).toFixed(1) + '%"></i></div><span>' + Math.round(100 * done / Math.max(1, total)) + ' % geschafft</span></div></div>' +
      '<div class="map-actions">' + (nxIt ? '<button class="btn primary" data-open="' + nx + '" title="' + esc(nxIt.title) + '">▶ Weiter: ' + (nxIt.kind === 'theory' ? 'Theorie ' + nx.slice(1) : 'Aufgabe ' + nx) + '</button>' : '') +
      '<button class="btn" data-open="sandbox" title="Frei bauen und messen – ohne Auftrag">Freie Werkbank</button>' + (DQ.workshop ? '<a class="btn" href="#werkstatt" id="toWs">Übungswerkstatt</a>' : '') + '</div>' +
      (staff() ? '<div class="teacher-bar"><b>Dozentenmodus</b> <span class="dim small">Alle Stationen offen, Freie Werkbank mit allen Bauteilen. <a href="../#/leitstand">Zum Leitstand</a></span><label class="fld"><span>Springe zu</span><select id="jump"><option value="">Station wählen …</option>' +
        DQ.chapters.concat(DQ.workshop ? [DQ.workshop] : []).map(function (c) { return '<optgroup label="' + (c.kind === 'workshop' ? '' : 'Kapitel ' + c.id + ' – ') + esc(c.title) + '">' + c.sequence.map(function (id) { var it = DQ.byId[id]; return '<option value="' + id + '">' + (it.kind === 'theory' ? 'Theorie ' + id.slice(1) : id) + ' ' + esc(it.title) + '</option>'; }).join('') + '</optgroup>'; }).join('') +
        '</select></label></div>' : '') +
      vorgabenBox() + '</div>';
    var parts = DQ.parts || [{ no: '', title: '', chapters: DQ.chapters.map(function (c) { return c.id; }) }];
    parts.forEach(function (pt) {
      var chs = DQ.chapters.filter(function (c) { return pt.chapters.indexOf(c.id) >= 0; }), ids = [];
      chs.forEach(function (c) { ids = ids.concat(c.sequence); });
      var pd = ids.filter(function (id) { return S.done[id]; }).length;
      if (pt.no) h += '<div class="part-head part-' + (pt.stage || 'grund') + '"><span class="part-no">Teil ' + pt.no + '</span><h2>' + esc(pt.title) + '</h2>' +
        (pt.stage ? '<span class="stage-tag ' + pt.stage + '">' + esc(DQ.stages[pt.stage]) + '</span>' : '') + '<span class="part-prog mono">' + pd + ' / ' + ids.length + '</span></div>';
      chs.forEach(function (c) {
        var d = c.sequence.filter(function (id) { return S.done[id]; }).length, any = c.sequence.some(function (id) { return unlocked(id); });
        h += '<section class="chapter' + (d >= c.sequence.length ? ' complete' : '') + (any ? '' : ' closed') + '">' + chapterHead(c, d, c.sequence.length, vgTag('kapitel', String(c.id))) +
          '<div class="nodes">' + c.sequence.map(function (id) { return tile(id, { next: id === nx }); }).join('') + '</div></section>';
      });
      if (pt.award) h += awardCard(DQ.awards[pt.award]);
    });
    h += workshopSection();
    $('#scr-map').innerHTML = h;
    $$('[data-open]', $('#scr-map')).forEach(function (b) { b.onclick = function () { openItem(b.dataset.open); }; });
    $$('[data-award]', $('#scr-map')).forEach(function (b) { b.onclick = function () { openAward(b.dataset.award); }; });
    if ($('#toWs')) $('#toWs').onclick = function (ev) { ev.preventDefault(); $('#werkstatt').scrollIntoView({ behavior: 'smooth' }); };
    if ($('#jump')) $('#jump').onchange = function () { if (this.value) openItem(this.value); };
  }

  /* Uebungswerkstatt: eigener Bereich, immer offen, zaehlt nicht zum Kapitel-Fortschritt */
  function workshopSection() {
    var w = DQ.workshop; if (!w) return '';
    var d = w.sequence.filter(function (id) { return S.done[id]; }).length;
    return '<div class="part-head part-werkstatt" id="werkstatt"><span class="part-no">Frei üben</span><h2>' + esc(w.title) + '</h2><span class="stage-tag werkstatt">nur messen</span><span class="part-prog mono">' + d + ' / ' + w.sequence.length + '</span></div>' +
      '<section class="chapter workshop">' + chapterHead(w, d, w.sequence.length, vgTag('kapitel', w.id)) + '<div class="nodes">' + w.sequence.map(function (id) { return tile(id, { open: true }); }).join('') + '</div></section>';
  }
  /* Vorgaben vom Dozent auf der Karte: Kasten oben mit Frist und Stand, Hinweis an Kapitel und Station. Nichts wird gesperrt. */
  function vorgabenBox() {
    var vs = vorgaben(); if (!vs.length) return '';
    var fmt = ACCT.fmtDue, open = vs.filter(function (v) { return !v.done; }).length;
    return '<div class="vg-box"><div class="vg-head"><b>Vorgaben vom Dozent</b><span class="dim small">' + (open ? open + ' offen' : 'alles erledigt') + '</span></div><ul>' + vs.map(function (v) {
      return '<li class="' + (v.done ? 'vg-done' : v.over ? 'vg-over' : '') + '"><button class="vg-go" data-open="' + esc(v.next) + '">' + esc(v.label) + '</button>' +
        '<span class="vg-meta">' + (v.z.fuer === 'dich' ? 'für dich · ' : '') + (v.z.faellig_am ? (v.over ? 'überfällig seit ' : 'bis ') + fmt(v.z.faellig_am) : 'ohne Frist') + ' · ' + (v.done ? 'erledigt' : v.left + ' offen') + '</span></li>';
    }).join('') + '</ul></div>';
  }
  function vgTag(typ, id, small) {
    var v = vorgaben().filter(function (x) { return x.z.ziel_typ === typ && x.z.ziel_id === id; })[0];
    if (!v) return '';
    var d = v.z.faellig_am ? ' · bis ' + ACCT.fmtDue(v.z.faellig_am) : '';
    return '<span class="vg-tag' + (v.done ? ' done' : v.over ? ' over' : '') + (small ? ' small' : '') + '" title="Vorgabe vom Dozent' + esc(d) + '">Vorgabe' + (small ? '' : esc(d)) + '</span>';
  }

  /* ================= Auszeichnungen im Spiel (Abzeichen nach den Boss-Aufgaben; das gepruefte Zertifikat gibt es im Portal) ================= */
  function awardEarned(a) { return !!S.done[a.boss]; }
  function awardDate(a) { // erster erfolgreicher Abschluss der Boss-Aufgabe
    var ev = S.events.filter(function (e) { return e.type === 'task_done' && e.id === a.boss; })[0];
    return new Date(ev ? ev.t : Date.now());
  }
  function fmtDate(d) { return d.getDate() + '. ' + ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][d.getMonth()] + ' ' + d.getFullYear(); }
  function personName() { var p = S.profile; return (p.vorname + ' ' + p.nachname).trim() || p.pseudonym || ''; }
  function medal(a, size) { // Abzeichen/Siegel als SVG, Farbe je Stufe
    var gold = a.id === 'profi', c1 = gold ? '#ffcf4a' : '#c9d3dc', c2 = gold ? '#b07a00' : '#6f7c88', s = size || 120;
    return '<svg class="medal" viewBox="0 0 120 120" width="' + s + '" height="' + s + '" aria-hidden="true">' +
      '<path d="M38 70 L24 116 L44 106 L54 118 L60 78Z" fill="' + (gold ? '#c41d1d' : '#1f5fae') + '"/><path d="M82 70 L96 116 L76 106 L66 118 L60 78Z" fill="' + (gold ? '#c41d1d' : '#1f5fae') + '"/>' +
      '<circle cx="60" cy="52" r="44" fill="' + c2 + '"/><circle cx="60" cy="52" r="38" fill="' + c1 + '"/><circle cx="60" cy="52" r="31" fill="none" stroke="' + c2 + '" stroke-width="2" stroke-dasharray="3 3"/>' +
      (gold ? '<path d="M60 30 L66 45 L82 46 L69 56 L74 72 L60 63 L46 72 L51 56 L38 46 L54 45Z" fill="' + c2 + '"/>'
        : '<path d="M42 52 h10 l4-10 6 20 4-10 h12" fill="none" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg>';
  }
  function awardCard(a) {
    if (!a) return '';
    var got = awardEarned(a);
    return '<div class="award-card' + (got ? ' earned' : '') + '">' + medal(a, 72) + '<div><span class="part-no">' + esc(a.kind) + '</span><h3>' + esc(a.title) + '</h3>' +
      '<p class="dim small">' + (got ? 'Erhalten am ' + fmtDate(awardDate(a)) + '.' : 'Wird mit der Boss-Aufgabe ' + a.boss + ' freigeschaltet.') + (ACCT && ACCT.portal ? ' Das geprüfte <a href="../#/zertifikate">Zertifikat mit Prüfcode</a> gibt es im Portal.' : '') + '</p></div>' +
      (got ? '<button class="btn primary" data-award="' + a.id + '">' + esc(a.kind) + ' anzeigen</button>' : allOpen() ? '<button class="btn" data-award="' + a.id + '">Vorschau</button>' : '<span class="award-lock">' + ICON.lock + '</span>') + '</div>';
  }
  function openAward(id) {
    var a = DQ.awards[id]; if (!a || !(awardEarned(a) || allOpen())) return;
    show('award');
    var nm = personName(), chs = DQ.chapters.filter(function (c) { return c.id >= a.chapters[0] && c.id <= a.chapters[1]; }), n = 0;
    chs.forEach(function (c) { n += c.sequence.filter(function (x) { return S.done[x]; }).length; });
    $('#scr-award').innerHTML = '<div class="award-tools noprint"><button class="btn" id="awBack">Zur Karte</button>' +
      '<label class="fld"><span>Name auf dem ' + esc(a.kind) + '</span><input id="awName" value="' + esc(nm) + '" placeholder="Vorname Nachname"></label>' +
      '<button class="btn primary" id="awPrint">Drucken</button></div>' +
      '<article class="certificate ' + a.id + '">' + medal(a, 130) +
      '<div class="cert-brand">DIGITAL <b>QUEST</b></div><h1>' + esc(a.title) + '</h1>' +
      '<p class="cert-name" id="awNameOut">' + (esc(nm) || '<span class="dim">(Name eintragen)</span>') + '</p>' +
      '<p class="cert-text">' + esc(a.text) + '</p>' +
      '<ul class="cert-list">' + chs.map(function (c) { return '<li><b>' + c.id + '</b> ' + esc(c.title) + '</li>'; }).join('') + '</ul>' +
      '<p class="cert-meta">' + n + ' Stationen gelöst · ' + DQ.stages[a.id] + ' · ' + fmtDate(awardDate(a)) + '</p>' +
      '<div class="cert-sign"><span>Datum</span><span>Unterschrift Lehrperson</span></div>' +
      '<p class="cert-id mono">ID ' + esc(S.profile.id.slice(0, 8)) + ' · ' + esc(a.id) + '</p></article>';
    $('#awBack').onclick = function () { renderMap(); show('map'); };
    $('#awPrint').onclick = function () { window.print(); };
    $('#awName').oninput = function () {
      var v = this.value.trim(), sp = v.split(/\s+/);
      S.profile.vorname = sp.shift() || ''; S.profile.nachname = sp.join(' '); save();
      $('#awNameOut').textContent = v;
    };
    log('award_view', { id: a.id });
  }
  function openItem(id) { if (id === 'sandbox') { openTask(sandboxTask()); return; } var it = DQ.byId[id]; if (!it) return; if (it.kind === 'theory') openTheory(it); else openTask(it); }

  /* Freie Werkbank (Sandbox): kein Auftrag, keine Pruefung; alle Bauteile aus bereits freigeschalteten Aufgaben
   * (Palette + Startaufbau), mit ?alle der ganze Bauteilkatalog. Entwurf unter drafts.sandbox. */
  function sandboxTask() {
    var types = {};
    if (allOpen()) Object.keys(E.PARTS).forEach(function (k) { types[k] = true; });
    DQ.tasks.forEach(function (t) {
      if (!unlocked(t.id)) return;
      t.palette.forEach(function (k) { types[k] = true; }); t.start.parts.forEach(function (p) { types[p.type] = true; });
    });
    if (!Object.keys(types).length) types.battery = types.lamp = types.switch = true;
    return { measureUX: 'drag', rangeUX: 'manual',  id: 'sandbox', kind: 'task', sandbox: true, ch: 0, title: 'Freie Werkbank', tags: [],
      brief: 'Baue und miss frei – ohne Auftrag und ohne Prüfung. Alle Bauteile, die du bisher freigeschaltet hast, liegen bereit. Dein Aufbau bleibt gespeichert.',
      palette: Object.keys(E.PARTS).filter(function (k) { return types[k]; }), start: { parts: [], wires: [] }, tests: [], measure: [], wrong: [] };
  }

  /* ================= Aufgabe ================= */
  /* Ein Schaltungszustand (core), zwei Darstellungen: Schema (ed) und Werkbank (bench) */
  var core = null, ed = null, bench = null, viewMode = /[?&]werkbank\b/.test(location.search) ? 'bench' : (S.settings.view === 'bench' ? 'bench' : 'schema');
  /* live.trace: Rechenschritte des letzten Arbeitspunkts, live.hist: letzte Zeitschritte (Zeitlupe) */
  var live = { net: null, state: E.newState(), dynamic: false, raf: 0, last: 0, res: null, trace: [], hist: [], replay: null };
  var HIST_MAX = 300;
  var meter = { mode: 'OFF', a: null, b: null, next: 'a', range: 'AUTO' }; // range: 'AUTO' oder Endwert (nur measureUX 'drag')
  function dragUX() { return !!(current.task && current.task.measureUX === 'drag'); } // Werkbank: Messspitzen ziehen statt klicken (Standard)
  function manualRange() { return !!(current.task && current.task.rangeUX === 'manual'); } // Messbereich von Hand (Kapitel 16, Sandbox)
  function preferredView() { return /[?&]werkbank\b/.test(location.search) || S.settings.view === 'bench' ? 'bench' : 'schema'; }
  function meterType() { return S.settings.meterType === 'avg' ? 'avg' : 'trms'; }

  function parseVal(str) {
    var m = String(str).trim().replace(',', '.').replace('µ', 'u').match(/^(\d*\.?\d+)\s*([pnumkKM]?)(\d*)\s*[A-Za-zΩ]*$/);
    if (!m) return NaN;
    var mult = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6 }[m[2]] || 1;
    var num = m[3] ? parseFloat(m[1] + '.' + m[3]) : parseFloat(m[1]); // 4k7 = 4.7k
    return num * mult;
  }

  /* task.limit {gates: 2, and: 0 …} als Hinweis im Auftrag */
  function limitText(lim) {
    return '<p class="limit">Erlaubt: ' + Object.keys(lim).map(function (k) {
      var n = lim[k], name = k === 'gates' ? 'Logikgatter' : (E.PARTS[k] ? E.PARTS[k].label : k);
      return n === 0 ? (k === 'gates' ? 'keine ' : 'kein ') + name : 'höchstens <b>' + n + '</b> ' + name;
    }).join(', ') + '.</p>';
  }

  /* opt.live: Live-Challenge – eigener Aufbau (opt.layout), Stoerungsmeldung (opt.live.bug); der Spielstand bleibt unberuehrt */
  function openTask(t, opt) {
    opt = opt || {};
    show('task');
    if (demo) { demoPause(); demo = null; } // laufende Vorführung verwerfen (der neue Entwurf wird frisch geladen)
    current.task = t; current.started = Date.now(); current.hints = 0; current.tries = 0; current.live = opt.live || null; current.exam = opt.exam || null;
    syncHash('task');
    var draft = opt.live || opt.exam ? (opt.layout ? { layout: E.clone(opt.layout), answers: opt.answers || {} } : null) : S.drafts[t.id];
    var layout = draft && draft.layout ? draft.layout : t.start;
    var lockedIds = t.start.parts.map(function (p) { return p.id; });
    closeReplay(true);
    live.state = E.newState();
    meter = { mode: 'OFF', a: null, b: null, next: 'a', range: 'AUTO' };
    if ($('#tb')) $('#tb').value = String(suggestTb(layout)); // Oszilloskop-Bildbreite passend zur Aufgabe (Feedback: Aliasing bei 1 s)
    renderTaskPanels(t, draft);
    if (!ed) {
      core = new Circuit({
        onChange: function () { persistDraft(); rebuild(); renderInspector(); },
        onSelect: function () { renderInspector(); },
        onProbe: setProbe,
        onScopeProbe: function () { bench.scope = null; tick(0); if (bench) bench.render(); },
        onMessage: function (m) { status([{ cls: 'info', text: m }]); }
      });
      ed = new Editor($('#board'), { core: core });
      bench = new Bench($('#bench'), { core: core, onDial: function (m) { setMeterMode(m); }, onRange: function (r) { setMeterRange(r); }, onScope: function (k) { if (k === 'ch1' || k === 'ch2') toggleChannel(+k.slice(2)); else scope(); } });
      bindSheetHover($('#board')); bindSheetHover($('#bench'));
    }
    setView(t.sandbox ? 'bench' : preferredView(), t.sandbox);
    bench.dragUX = dragUX(); bench.scope = null;
    ed.showVolt = bench.showVolt = false; $('#btnVolt').classList.remove('on');
    ed.showFlow = bench.showFlow = !!S.settings.flow; $('#btnFlow').classList.toggle('on', ed.showFlow);
    ed.load(layout, lockedIds, t.bench); bench.fit();
    setMeterMode('OFF');
    rebuild(); renderInspector();
    if (!current.exam) log(t.sandbox ? 'sandbox_open' : current.live ? 'live_open' : 'task_open', { id: t.id });
  }

  function renderTaskPanels(t, draft) {
    var ch = DQ.chapters.filter(function (c) { return c.id === t.ch; })[0];
    if (t.sandbox) {
      $('#taskInfo').innerHTML = '<div class="crumb">Labor · Sandbox</div><h2>' + esc(t.title) + '</h2><div class="brief">' + t.brief + '</div>' +
        '<div class="learn"><b>Ideen</b> Miss die Spannung an einer LED mit verschiedenen Vorwiderständen. Vergleiche V~ mit AVG und TRMS an Rechteck und Sinus. Schau dir mit der Zeitlupe an, wie eine Rückkopplung einrastet.</div>' +
        '<button class="btn" id="toMap">Zur Karte</button>';
      $('#toMap').onclick = function () { renderMap(); show('map'); };
      renderPalette(t); return;
    }
    if (current.exam) { renderExamPanels(t, draft); return; }
    var lv = current.live;
    var h = (lv ? '<div class="live-note"><b>' + (lv.bug ? 'STÖRUNGSMELDUNG' : 'LIVE-CHALLENGE · SPRINT') + '</b>' + (lv.bug ? '<p>' + esc(lv.bug.symptom || 'Die Schaltung arbeitet nicht wie verlangt.') + '</p><p class="dim small">Auf dem Tisch liegt der fehlerhafte Aufbau. Finde die Ursache, behebe sie und lass prüfen.</p>' : '<p class="dim small">Löse die Aufgabe so schnell und sauber wie möglich. Fehlversuche und Tipps kosten Punkte.</p>') + '</div>' : '') +
      '<div class="crumb">' + (lv ? '' : '<button class="btn small back" data-back title="Zurück zur Laborkarte">← Karte</button>') + (t.ch === 'W' ? 'Übungswerkstatt · Messaufgabe ' : 'Kapitel ' + t.ch + ' · Aufgabe ') + t.id + (t.boss ? ' · <b class="boss-tag">BOSS</b>' : '') + '</div>' +
      '<h2>' + esc(t.title) + '</h2>' +
      (t.story ? '<p class="story">' + t.story + '</p>' : '') +
      '<div class="brief">' + t.brief + (t.limit && t.brief.indexOf('class="limit"') < 0 ? limitText(t.limit) : '') + '</div>' +
      (t.learn ? '<div class="learn"><b>Lernziel</b> ' + t.learn + '</div>' : '') +
      '<div class="hints"><button class="btn small" id="hint1">Tipp 1</button><button class="btn small" id="hint2">Tipp 2</button></div><div id="hintBox"></div>';
    if (t.measure.length && !current.live) h += setupHtml(t) + (demoMeasure(t) ? '<div id="demoBox"><button class="btn" id="btnDemo" title="Zeigt an einem Beispiel, wie gemessen und gerechnet wird – dein Aufbau bleibt unverändert">▶ Vorführen</button> <span class="dim small">zählt wie ein Tipp</span></div>' : '');
    if (t.measure.length) {
      h += '<div class="protocol"><h3>Messprotokoll <span class="proto-count" id="protoCount"></span><button class="btn small calc-ctx" data-calc title="Taschenrechner öffnen">🖩 Rechner</button></h3>' +
        '<p class="proto-note dim small">Gib den Wert so an, wie dein Gerät ihn anzeigt bzw. wie du ihn berechnest. Innerhalb der Toleranz ist er richtig – auf eine sinnvolle Stellenzahl runden (Komma oder Punkt).</p>';
      t.measure.forEach(function (m) {
        var v = draft && draft.answers && draft.answers[m.id] !== undefined ? draft.answers[m.id] : '';
        h += '<label data-mid="' + m.id + '"><span><i class="mst" data-mst="' + m.id + '" title="offen">○</i> ' + esc(m.ask) + '</span><input inputmode="decimal" data-ans="' + m.id + '" value="' + esc(v) + '" placeholder="' + (m.value !== undefined ? 'Rechenwert' : 'Messwert') + '"><em>' + esc(m.unit || '') + '</em>' +
          '<small class="tol">' + tolText(m) + '</small><div class="reveal" data-rv="' + m.id + '" hidden></div></label>';
      });
      h += '</div>';
    }
    h += '<button class="btn primary big" id="btnCheck">Prüfen</button><div id="results"></div><div id="solBox"></div>';
    if (t.measure.length) h += '<p class="tut-link"><b>Messen auf der Werkbank:</b> Spitzen und Tastkopf ziehen' + (t.rangeUX === 'manual' ? ', Messbereich wählen' : '') + ' – <a href="#" data-go="tutorial">Anleitung ansehen</a></p>';
    $('#taskInfo').innerHTML = h;
    var tl = $('#taskInfo [data-go="tutorial"]'); if (tl) tl.onclick = function (ev) { ev.preventDefault(); renderTutorial(); show('tutorial'); };
    var bk = $('#taskInfo [data-back]'); if (bk) bk.onclick = goMap;
    var bd = $('#btnDemo'); if (bd) bd.onclick = function () { demoStart(t); };
    $('#hint1').onclick = function () { if (current.hints < 1 && LIVE) LIVE.hint(); current.hints = Math.max(current.hints, 1); $('#hintBox').innerHTML = '<div class="hint">' + t.hint + '</div>'; };
    $('#hint2').onclick = function () { if (current.hints < 2 && LIVE) LIVE.hint(); current.hints = 2; $('#hintBox').innerHTML = '<div class="hint">' + t.hint + '</div><div class="hint">' + t.hint2 + '</div>'; };
    $$('[data-ans]').forEach(function (inp) { inp.oninput = persistDraft; });
    $('#btnCheck').onclick = check;
    renderMeasState(t);
    renderPalette(t);
    void ch;
  }
  /* ---------- Teilwertung pro Messwert (Feedback 01.10.2026) ----------
   * Jeder Messwert gilt als richtig, offen oder aufgedeckt. Nach zwei falschen Eingaben an einem Wert erscheint „Sollwert aufdecken“:
   * Sollwert und Rechenweg nur für diesen Wert, er zählt dann als erledigt (höchstens 1 Stern). Die Station ist abgeschlossen, sobald
   * alle Schaltungstests bestehen und jeder Messwert richtig oder aufgedeckt ist. Nicht in Prüfung und Live-Challenge. */
  function measState(t, d) { var n = 0, ok = 0, rv = 0; (t.measure || []).forEach(function (m) { n++; var s = d.meas[m.id]; if (s && s.ok) ok++; else if (s && s.revealed) rv++; }); return { n: n, ok: ok, revealed: rv, done: ok + rv === n }; }
  function renderMeasState(t) {
    if (!t.measure || !t.measure.length || current.exam || current.live) return;
    var d = draftOf(t), st = measState(t, d);
    var pc = $('#protoCount'); if (pc) pc.textContent = st.n ? (st.ok + (st.revealed ? ' + ' + st.revealed + ' aufgedeckt' : '') + ' von ' + st.n + ' Werten richtig') : '';
    t.measure.forEach(function (m) {
      var s = d.meas[m.id] || {}, i = $('[data-mst="' + m.id + '"]'), lab = $('[data-mid="' + m.id + '"]'), rv = $('[data-rv="' + m.id + '"]');
      if (!i) return;
      lab.classList.remove('m-ok', 'm-bad', 'm-rv');
      if (s.ok) { i.textContent = '✓'; i.title = 'richtig'; lab.classList.add('m-ok'); }
      else if (s.revealed) { i.textContent = '⟳'; i.title = 'aufgedeckt'; lab.classList.add('m-rv'); }
      else if (s.tries) { i.textContent = '✗'; i.title = s.tries + ' falsche Eingabe(n)'; lab.classList.add('m-bad'); }
      else { i.textContent = '○'; i.title = 'offen'; }
      if (rv) { if (s.revealed) { rv.hidden = false; rv.innerHTML = revealHtml(t, m); } else if (s.tries >= 2 && !s.ok) { rv.hidden = false; rv.innerHTML = '<button class="btn small" data-reveal="' + m.id + '">Sollwert aufdecken</button> <span class="dim small">zählt als erledigt, höchstens 1 Stern</span>'; } else { rv.hidden = true; rv.innerHTML = ''; } }
    });
    $$('[data-reveal]').forEach(function (b) { b.onclick = function () { revealValue(t, b.dataset.reveal); }; });
    renderSolBox(t);
  }
  /* Sollwerte wie der Validator: aus der Referenzschaltung; wenn die eigene Schaltung alle Tests besteht, aus dieser (Messwerte hängen davon ab) */
  function sollOf(t, layout) {
    var lay = t.ref; if (layout) { try { var r = E.runTask(t, layout, {}); if (r.results.filter(function (x) { return !(x.info && x.info.mid); }).every(function (x) { return x.ok; })) lay = layout; } catch (e) { /* Referenz */ } }
    try { return E.expectedAnswers(t, lay); } catch (e) { try { return E.expectedAnswers(t, t.ref); } catch (e2) { return {}; } }
  }
  function fmtSoll(v, unit) { if (v === undefined || v === null || isNaN(v)) return '–'; var a = Math.abs(v), s = a >= 100 ? v.toFixed(a >= 1000 ? 0 : 1) : a >= 10 ? v.toFixed(2) : a >= 1 ? v.toFixed(3) : (+v.toPrecision(3)).toString(); return s.replace('.', ',') + (unit ? ' ' + unit : ''); }
  /* Rechenweg: aus defTask.rechenweg (HTML oder Schritte) oder automatisch minimal aus measure */
  function rechenwegHtml(t, m, soll) {
    var rw = t.rechenweg && t.rechenweg[m.id];
    if (Array.isArray(rw)) return '<ol class="rw">' + rw.map(function (s) { return '<li>' + (s.text ? '<p>' + s.text + '</p>' : '') + (s.label || s.expr || s.value !== undefined ? '<div class="wk-row"><span class="wk-lbl">' + esc(s.label || '') + '</span>' + (s.expr ? '<span class="mono wk-expr">' + esc(s.expr) + '</span>' : '') + (s.value !== undefined ? '<span class="mono wk-val">= ' + fmtSoll(s.value, s.unit) + '</span>' : '') + '</div>' : '') + '</li>'; }).join('') + '</ol>';
    if (typeof rw === 'string') return '<div class="rw">' + rw + '</div>';
    var how = m.value !== undefined ? 'Rechenwert aus den Angaben der Aufgabe.' :
      m.truth ? 'Aus der Simulation: ' + (m.truth.q === 'i' ? 'Strom durch ' : m.truth.q === 'v' ? 'Spannung an ' : m.truth.q + ' von ') + esc(m.truth.sel) + '.' :
      'Messung ' + (m.mode === 'A' ? 'A⎓ in Reihe' : m.mode === 'AAC' ? 'A~ in Reihe (' + (m.meterType || 'TRMS').toUpperCase() + ')' : m.mode === 'R' ? 'Ω spannungsfrei' : m.mode === 'VAC' ? 'V~ (' + (m.meterType || 'TRMS').toUpperCase() + ')' : m.mode === 'AC' ? 'Oszilloskop (' + (m.q || 'dc') + ')' : 'V⎓') + (m.a ? ' zwischen ' + esc(m.a) + ' und ' + esc(m.b || 'Masse') : '') + '.';
    return '<div class="rw"><p>' + how + ' Sollwert <b>' + fmtSoll(soll, m.unit) + '</b> (Toleranz ±' + Math.round((m.tol || 0.03) * 100) + ' %).</p></div>';
  }
  function revealHtml(t, m) { var soll = sollOf(t, ed && ed.layout)[m.id]; return '<div class="rv-box"><b>Aufgedeckt – Sollwert ' + fmtSoll(soll, m.unit) + '</b>' + rechenwegHtml(t, m, soll) + '</div>'; }
  function revealValue(t, mid) {
    var d = draftOf(t), s = d.meas[mid] = d.meas[mid] || { tries: 0 }; if (s.ok || s.revealed) return;
    s.revealed = true; save(); log('value_reveal', { id: t.id, mid: mid, tries: s.tries || 0 });
    var inp = $('[data-ans="' + mid + '"]'); if (inp) { inp.disabled = true; var sv = sollOf(t, ed && ed.layout)[mid]; if (sv !== undefined && !isNaN(sv)) inp.value = String(+(+sv).toPrecision(4)); }
    renderMeasState(t);
    if (measState(t, d).done) toast('Alle Werte erledigt – jetzt „Prüfen“ drücken.');
  }
  /* ---------- Lösungsansicht nach zwei Fehlversuchen ---------- */
  function renderSolBox(t) {
    var box = $('#solBox'); if (!box || current.exam || current.live) return;
    var d = draftOf(t);
    if (!(d.fails >= 2) && !d.sol) { box.innerHTML = ''; return; }
    if (!$('#solView')) box.innerHTML = '<button class="btn" id="btnSol">Lösung ansehen</button> <span class="dim small">Referenzschaltung, Sollwerte und Rechenweg – die Station zählt danach mit höchstens 1 Stern und gilt erst als gelöst, wenn du selbst richtig baust und misst.</span><div id="solView" hidden></div>';
    $('#btnSol').onclick = function () { showSolution(t); };
  }
  var solMini = null;
  function showSolution(t) {
    var d = draftOf(t), v = $('#solView'); if (!v) return;
    if (!d.sol) { d.sol = true; save(); log('solution_view', { id: t.id, fails: d.fails || 0, tries: current.tries }); }
    var soll = sollOf(t, null), rows = (t.measure || []).map(function (m) { return '<tr><td>' + esc(m.ask) + '</td><td class="mono num">' + fmtSoll(soll[m.id], m.unit) + '</td></tr>'; }).join('');
    v.hidden = false;
    v.innerHTML = '<h3>Lösung</h3><p class="dim small">Referenzschaltung (' + (viewMode === 'bench' ? 'Werkbank' : 'Schaltplan') + ') – zum Vergleich, nicht zum Übernehmen:</p><div id="solCircuit"></div>' +
      (rows ? '<h4>Sollwerte</h4><table class="tt sol-tab">' + rows + '</table>' : '') +
      (t.measure && t.measure.length ? '<h4>Rechenweg</h4>' + t.measure.map(function (m) { return '<div class="rw-item"><b>' + esc(m.ask) + '</b>' + rechenwegHtml(t, m, soll[m.id]) + '</div>'; }).join('') : '') +
      (t.take ? '<p class="dim small">' + t.take + '</p>' : '') + '<button class="btn small" id="solClose">Lösung einklappen</button>';
    $('#btnSol').hidden = true;
    if (root.DQMini) { try { if (solMini && solMini.destroy) solMini.destroy(); solMini = root.DQMini.mount($('#solCircuit'), { layout: t.ref, bench: t.bench, view: viewMode, height: 240 }); } catch (e) { $('#solCircuit').innerHTML = '<p class="dim small">(' + esc(e.message) + ')</p>'; } }
    $('#solClose').onclick = function () { v.hidden = true; $('#btnSol').hidden = false; };
  }
  /* ---------- „So stellst du das Gerät ein“ (Feedback 01.10.2026): je Messwert Messart, Spitzen, Bereich (nur rangeUX manual),
   * beim Oszilloskop Tastkopf/Clip und Bildbreite, Schalterstellungen aus measure.set – automatisch aus measure[], Handtext über task.setup. */
  function suggestRange(u, val) { var l = E.DMM_MANUAL[u] || []; for (var i = 0; i < l.length; i++) if (Math.abs(val) <= l[i] * 0.999) return l[i]; return l[l.length - 1]; }
  function sourceFreqs(layout) { var f = []; (layout.parts || []).forEach(function (p) { if (p.type === 'acsource' || p.type === 'clock') { var q = p.props || {}; f.push(q.freq || E.PARTS[p.type].props.freq); } }); return f; }
  function suggestTb(layout) {
    var opts = $$('#tb option').map(function (o) { return +o.value; }).sort(function (a, b) { return a - b; }), fr = sourceFreqs(layout);
    if (fr.length) { var want = 2.5 / Math.min.apply(null, fr); for (var i = 0; i < opts.length; i++) if (opts[i] >= want) return opts[i]; return opts[opts.length - 1]; }
    if ((layout.parts || []).some(function (p) { return p.type === 'capacitor'; })) return opts[opts.length - 1]; // Lade-/Entladekurve: langer Ausschnitt
    return opts.length > 1 ? opts[1] : opts[0];
  }
  function tbLabel(v) { var o = $$('#tb option').filter(function (o) { return +o.value === v; })[0]; return o ? o.textContent : E.fmt(v, 's'); }
  function setupHtml(t) {
    if (typeof t.setup === 'string') return '<details class="setup" open><summary>So stellst du das Gerät ein</summary>' + t.setup + '</details>';
    var soll = sollOf(t, null), manual = t.rangeUX === 'manual', rows = t.measure.map(function (m) {
      if (t.setup && t.setup[m.id]) return '<li><b>' + esc(m.ask) + ':</b> ' + t.setup[m.id] + '</li>';
      var parts = [], setTxt = m.set ? Object.keys(m.set).map(function (k) { return k.indexOf('@') === 0 ? '' : k + ' ' + (m.set[k].closed ? 'zu' : 'offen'); }).filter(Boolean).join(', ') : '';
      if (setTxt) parts.push('Schalter: ' + setTxt);
      if (m.value !== undefined) parts.push('Rechenwert – kein Messgerät, Ergebnis in ' + (m.unit || 'der angegebenen Einheit') + ' eintragen');
      else if (m.truth && !m.mode) parts.push(m.truth.q === 'i' ? 'A⎓ in Reihe mit ' + m.truth.sel + ' (Leitung an ' + m.truth.sel + ' lösen, Spitzen in die Lücke)' : 'V⎓ an ' + m.truth.sel);
      else if (m.mode === 'AC') parts.push('Oszilloskop: Tastkopf CH' + (m.ch || 1) + ' an ' + m.a + ', Erdungsclip an ' + (m.b || 'Masse') + ', Bildbreite ' + tbLabel(suggestTb(t.ref)) + ', RUN – ' + ({ dc: 'Mittelwert ablesen', peak: 'Scheitelwert ablesen', pp: 'Spitze-Spitze ablesen', rms: 'Effektivwert', avg: 'Gleichrichtwert' }[m.q || 'dc'] || m.q));
      else {
        var u = m.mode === 'A' || m.mode === 'AAC' ? 'A' : m.mode === 'R' ? 'Ω' : 'V', mode = m.mode === 'A' ? 'A⎓ (in Reihe: Leitung lösen, Spitzen in die Lücke)' : m.mode === 'AAC' ? 'A~, Verfahren ' + ((m.meterType || 'trms').toUpperCase()) + ' (in Reihe: Leitung lösen, Spitzen in die Lücke)' : m.mode === 'R' ? 'Ω (spannungsfrei!)' : m.mode === 'VAC' ? 'V~, Verfahren ' + ((m.meterType || 'trms').toUpperCase()) : 'V⎓';
        parts.push('Messart ' + mode);
        if (m.mode !== 'A' && m.mode !== 'AAC') parts.push('rote Spitze an ' + m.a + ', schwarze an ' + (m.b || 'Masse'));
        if (manual && soll[m.id] !== undefined) { var sc = E.UNIT_SCALE[m.unit] || 1, rg = suggestRange(u, soll[m.id] * sc); parts.push('Bereich ' + E.rangeLabel(rg, u)); }
      }
      return '<li><b>' + esc(m.ask) + ':</b> ' + parts.join(' · ') + '</li>';
    });
    return '<details class="setup"' + (t.ch === 16 || t.ch === 'W' ? ' open' : '') + '><summary>So stellst du das Gerät ein</summary><ol>' + rows.join('') + '</ol>' +
      '<p class="dim small">Spitzen und Tastkopf auf der Werkbank ziehen, im Schaltplan auf die Anschlüsse klicken. OL heisst nur: Bereich zu klein.</p></details>';
  }
  /* Toleranz-Hinweis je Protokollzeile: Prozent aus tol (Standard 3 %), bei Rechenwerten Einheit und Stellenzahl */
  function tolText(m) {
    var pct = Math.round((m.tol || 0.03) * 100), t = 'Toleranz ±' + pct + ' %';
    if (m.value !== undefined) t += ' · berechnet in ' + (m.unit || '–') + (pct <= 2 ? ', 3 geltende Stellen' : ', 2–3 geltende Stellen');
    return t;
  }
  /* Pruefung: Auftrag, Messprotokoll, „Testen“ (sichtbare Tests im Browser) und „Abgeben“ (Bewertung auf dem Server). Keine Tipps. */
  function renderExamPanels(t, draft) {
    var h = '<div class="crumb">Prüfung · Aufgabe ' + t.no + ' von ' + t.of + ' · Kapitel ' + t.ch + '</div><h2>' + esc(t.title) + '</h2>' +
      (t.story ? '<p class="story">' + t.story + '</p>' : '') + '<div class="brief">' + t.brief + '</div>';
    if (t.protocol.length) {
      h += '<div class="protocol"><h3>Messprotokoll <button class="btn small calc-ctx" data-calc title="Taschenrechner öffnen">🖩 Rechner</button></h3>';
      t.protocol.forEach(function (m) {
        var v = draft && draft.answers && draft.answers[m.id] !== undefined ? draft.answers[m.id] : '';
        h += '<label><span>' + esc(m.ask) + '</span><input inputmode="decimal" data-ans="' + m.id + '" value="' + esc(v) + '" placeholder="Wert"><em>' + esc(m.unit || '') + '</em></label>';
      });
      h += '</div>';
    }
    h += '<div class="exam-btns"><button class="btn big" id="btnCheck" title="Prüft die sichtbaren Tests hier im Browser">Testen</button><button class="btn primary big" id="btnSend" title="Schickt Schaltung und Messwerte zur Bewertung">Abgeben</button></div>' +
      '<div id="results"></div><div id="examRes"></div>';
    $('#taskInfo').innerHTML = h;
    $$('[data-ans]').forEach(function (inp) { inp.oninput = persistDraft; });
    $('#btnCheck').onclick = check;
    $('#btnSend').onclick = function () { if (EXAM) EXAM.send(); };
    renderPalette(t);
  }
  function renderPalette(t) {
    var pal = '';
    t.palette.forEach(function (type) {
      pal += '<button class="palbtn" data-add="' + type + '" title="' + esc(E.PARTS[type].label) + ' hinzufügen"><svg viewBox="-46 -46 92 92"><g>' + Editor.symbol({ type: type, props: {} }) + '</g></svg><span>' + esc(E.PARTS[type].label) + '</span></button>';
    });
    $('#palette').innerHTML = pal || '<span class="dim small">Keine neuen Bauteile – nur messen.</span>';
    $$('[data-add]').forEach(function (b) {
      b.onclick = function () { hideSheet(true); view().addPart(b.dataset.add); renderInspector(); };
      // Palette: Maus drueber → sofort das volle Datenblatt (noch keine Messwerte, die im Weg stehen)
      b.onpointerenter = function (ev) { if (ev.pointerType === 'mouse') sheetSoon(function () { showSheet(b.dataset.add, null, b.getBoundingClientRect(), { from: 'palette' }); }, 120); };
      b.onpointerleave = function () { sheetLeave(); };
    });
  }

  /* ================= Bauteil-Datenblatt =================
   * Inhalt: DQ.datasheet(type, E) aus content/datasheets.js (Texte) + Engine-Werte; Bilder: Editor.icon und Bench.icon.
   * Ausloeser: Palette (Maus, sofort) · platziertes Bauteil (Maus verweilt ~0,7 s; der kurze U/I/P-Tooltip bleibt)
   * · Knopf „ⓘ Datenblatt“ im Eigenschaften-Panel (auch fuer Touch) · Handbuch-Seite „Datenblaetter“. */
  function sheetHtml(type, p, opt) {
    var d = DQ.datasheet(type, E, p), props = (p && p.props) || {}, vt = p ? Editor.valueText(p) : '';
    var rows = function (list, withText) { return list.map(function (r) { return '<tr><th>' + r.label + '</th><td class="mono">' + esc(r.value) + '</td></tr>' + (withText && r.text ? '<tr class="ds-note"><td colspan="2">' + r.text + '</td></tr>' : ''); }).join(''); };
    return '<div class="ds-head"><div><span class="ds-kind">Datenblatt</span><h3>' + esc(d.label) + '</h3>' +
      (p ? '<span class="dim small mono">' + esc(p.id) + (vt ? ' · ' + esc(vt) : '') + '</span>' : '<span class="dim small">Kurzzeichen ' + esc(d.prefix) + '</span>') + '</div>' +
      (opt && opt.close ? '<button class="ds-x" aria-label="Schliessen" title="Schliessen">×</button>' : '') + '</div>' +
      '<div class="ds-pics"><figure>' + Editor.icon(type, props, { pins: true }) + '<figcaption>Schaltzeichen</figcaption></figure>' +
      '<figure>' + Bench.icon(type, props, p ? p.value : undefined) + '<figcaption>Werkbank</figcaption></figure></div>' +
      '<p class="ds-fn">' + d.funktion + '</p>' +
      (d.pins.length ? '<h4>Anschlüsse</h4><table class="ds-t">' + d.pins.map(function (x) { return '<tr><th class="mono">' + esc(x.pin) + '</th><td>' + x.text + '</td></tr>'; }).join('') + '</table>' : '') +
      (d.grenzen.length ? '<h4>Grenzen</h4><table class="ds-t ds-lim">' + rows(d.grenzen, true) + '</table>' : '') +
      (d.kennwerte.length ? '<h4>Kennwerte</h4><table class="ds-t">' + rows(d.kennwerte) + '</table>' : '') +
      (d.formel ? '<div class="formula ds-f">' + d.formel + '</div>' : '');
  }
  var sheet = { timer: 0, hideTimer: 0, key: null, pinned: false, hover: null };
  function sheetEl() {
    var el = $('#dsPop');
    if (!el) {
      el = document.createElement('div'); el.id = 'dsPop'; el.className = 'ds-pop'; el.hidden = true; el.setAttribute('role', 'dialog');
      el.onpointerenter = function () { clearTimeout(sheet.hideTimer); };
      el.onpointerleave = function () { sheetLeave(); };
      document.body.appendChild(el);
    }
    return el;
  }
  function sheetSoon(fn, ms) { clearTimeout(sheet.timer); clearTimeout(sheet.hideTimer); sheet.timer = setTimeout(fn, ms); }
  function sheetLeave() { clearTimeout(sheet.timer); if (sheet.pinned) return; clearTimeout(sheet.hideTimer); sheet.hideTimer = setTimeout(function () { hideSheet(); }, 220); }
  function hideSheet(force) {
    clearTimeout(sheet.timer); clearTimeout(sheet.hideTimer);
    if (sheet.pinned && !force) return;
    var el = $('#dsPop'); if (el) el.hidden = true; sheet.key = null; sheet.pinned = false;
  }
  /* anchor: DOMRect, neben dem das Blatt erscheint; opt.pinned: bleibt offen bis Schliessen/Klick daneben */
  function showSheet(type, p, anchor, opt) {
    opt = opt || {};
    var el = sheetEl(), key = type + '|' + (p ? p.id : '');
    if (sheet.key !== key || el.hidden) {
      el.innerHTML = sheetHtml(type, p, { close: true });
      var x = el.querySelector('.ds-x'); if (x) x.onclick = function () { hideSheet(true); };
      log('datasheet', { type: type, from: opt.from || '' });
    }
    sheet.key = key; sheet.pinned = !!opt.pinned; el.hidden = false; el.dataset.type = type;
    var vw = innerWidth, vh = innerHeight, w = el.offsetWidth, h = el.offsetHeight, m = 10;
    if (vw < 700) { el.style.left = ''; el.style.top = ''; el.classList.add('sheet-bottom'); return; } // Handy: als Blatt von unten
    el.classList.remove('sheet-bottom');
    var left = anchor.right + m; if (left + w > vw - m) left = anchor.left - w - m; if (left < m) left = Math.max(m, Math.min(vw - w - m, anchor.left));
    var top = Math.max(m, Math.min(vh - h - m, anchor.top + anchor.height / 2 - h / 2));
    el.style.left = left + 'px'; el.style.top = top + 'px';
  }
  /* Platziertes Bauteil: Maus verweilt ~0,7 s auf demselben Bauteil (ohne Taste, ohne Ziehen) → Datenblatt neben dem Bauteil */
  function bindSheetHover(svg) {
    svg.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      var g = ev.buttons ? null : ev.target.closest && ev.target.closest('[data-part]'), id = g ? g.getAttribute('data-part') : null;
      if (id === sheet.hover) return;
      sheet.hover = id;
      if (!id) { sheetLeave(); return; }
      sheetSoon(function () {
        var p = ed && ed.part(id), el = svg.querySelector('[data-part="' + id + '"]');
        if (p && el && sheet.hover === id) showSheet(p.type, p, el.getBoundingClientRect(), { from: 'part' });
      }, 700);
    });
    svg.addEventListener('pointerleave', function () { sheet.hover = null; sheetLeave(); });
    svg.addEventListener('pointerdown', function () { sheet.hover = null; hideSheet(true); });
  }

  function answers() { var a = {}; $$('[data-ans]').forEach(function (i) { a[i.dataset.ans] = i.value; }); return a; }
  function persistDraft() {
    if (!current.task || !ed || current.live) return;
    if (current.exam) { if (EXAM) EXAM.draft(current.exam.item, ed.layout, answers()); return; }
    var d = S.drafts[current.task.id] || {}; d.layout = ed.layout; d.answers = answers(); d.t = Date.now(); S.drafts[current.task.id] = d; save();
  }
  /* Teilwertung und Lösung: Zustand je Aufgabe im Entwurf – meas[id] = {ok, tries, revealed}, fails (gescheiterte Prüfungen), sol (Lösung angesehen) */
  function draftOf(t) { var d = S.drafts[t.id] || (S.drafts[t.id] = { layout: ed ? ed.layout : t.start, answers: {}, t: Date.now() }); d.meas = d.meas || {}; return d; }

  function rebuild() {
    closeReplay(true);
    try { live.net = E.buildNetlist(ed.layout); live.err = null; }
    catch (e) { live.net = null; live.err = e.message; }
    live.dynamic = !!live.net && live.net.parts.some(function (p) { return p.type === 'capacitor' || p.type === 'clock' || p.type === 'acsource'; });
    live.hist = [];
    tick(0, true);
    if (live.dynamic) startLoop(); else stopLoop();
  }
  function startLoop() {
    if (live.raf) return;
    live.last = performance.now();
    var f = function (now) {
      var dt = Math.min(0.05, (now - live.last) / 1000); live.last = now;
      tick(dt); live.raf = requestAnimationFrame(f);
    };
    live.raf = requestAnimationFrame(f);
  }
  function stopLoop() { if (live.raf) cancelAnimationFrame(live.raf); live.raf = 0; }

  function meterNodes() {
    if (!live.net || !meter.a || !meter.b) return null;
    var a = live.net.pinNode[meter.a], b = live.net.pinNode[meter.b];
    return a === undefined || b === undefined ? null : { a: a, b: b };
  }
  function tick(dt, withTrace) {
    if (live.replay) return; // Zeitlupe zeigt einen festgehaltenen Schritt
    if (!live.net) { setSim(null); status([{ cls: 'err', text: live.err }]); return; }
    var mn = meterNodes(), mm = meter.mode === 'VAC' ? 'V' : meter.mode === 'AAC' ? 'A' : meter.mode, mopt = mn && (mm === 'V' || mm === 'A') ? { mode: mm, a: mn.a, b: mn.b } : null;
    if (withTrace) { // Zeitlupe: Arbeitspunkt auf einer Kopie neu suchen – Dioden von vorn (reine Rechenhilfe), Gatter behalten ihr Gedaechtnis
      var ts = E.clone(live.state); ts.diode = {};
      try { live.trace = E.step(live.net, ts, { meter: mopt, trace: true }).trace || []; } catch (e) { live.trace = []; }
    }
    var r = E.step(live.net, live.state, { dt: live.dynamic && dt > 0 ? dt : null, meter: mopt });
    live.res = r;
    var disp = liveDisplay(r);
    var disp = liveDisplay(r);
    var disp = liveDisplay(r);
    if (live.dynamic) { live.hist.push(r); if (live.hist.length > HIST_MAX) live.hist.shift(); }
    updateMeter(r, mn);
    setSim({ res: disp, pinNode: live.net.pinNode });
    status(diagnose(r.faults, r));
  }
  /* ---------- L1 (05.10.2026): Anzeige bei schnellen Wechselquellen mitteln statt mit der Bildrate abzutasten ----------
   * Quellen ab 8 Hz löst die Bildrate nicht sinnvoll auf – LED/Lampe/Spannungsfarben flackerten (Aliasing). Für die Darstellung wird
   * deshalb eine Periode der langsamsten schnellen Quelle in 48 Schritten auf einer Kopie des Zustands gerechnet: Helligkeit (LED),
   * Leistung (Lampe/Motor, Betrag) und „leuchtet“ als Mittel, Knotenspannungen als Effektivwert (Farben). Ergebnis je Aufbau und
   * Zustand höchstens 1 s zwischengespeichert. Messwerte, Ströme für die Stromfluss-Animation und Tooltips bleiben die Live-Werte;
   * langsame Quellen (Taktgeber 1 Hz) blinken weiter, weil sie nicht gemittelt werden. */
  var liveAvg = { key: '', at: 0 };
  function liveDisplay(r) {
    if (!live.net || !live.dynamic) return r;
    var fr = []; live.net.parts.forEach(function (p) { if ((p.type === 'acsource' || p.type === 'clock') && p.props.freq >= 8) fr.push(p.props.freq); });
    if (!fr.length) return r;
    var key = JSON.stringify(ed.layout) + '|' + JSON.stringify(live.state.burnt) + '|' + !!live.state.fuse + '|' + meter.mode + meter.a + meter.b;
    if (liveAvg.key !== key || performance.now() - liveAvg.at > 1000) {
      var T = 1 / Math.min.apply(null, fr), n = 48, st = E.clone(live.state), acc = {}, nv = {}, mn = meterNodes(), mm = meter.mode === 'VAC' ? 'V' : meter.mode === 'AAC' ? 'A' : meter.mode;
      var mopt = mn && (mm === 'V' || mm === 'A') ? { mode: mm, a: mn.a, b: mn.b } : null;
      try {
        for (var k = 0; k < n; k++) {
          var rk = E.step(live.net, st, { dt: T / n, meter: mopt });
          Object.keys(rk.parts).forEach(function (id) { var p = rk.parts[id], a = acc[id] = acc[id] || { brightness: 0, p: 0, on: 0 }; a.brightness += (p.brightness || 0) / n; a.p += Math.abs(p.p || 0) / n; if (p.on) a.on++; });
          Object.keys(rk.nodeV).forEach(function (nn) { nv[nn] = (nv[nn] || 0) + rk.nodeV[nn] * rk.nodeV[nn] / n; });
        }
        Object.keys(nv).forEach(function (nn) { nv[nn] = Math.sqrt(nv[nn]); });
        liveAvg = { key: key, at: performance.now(), parts: acc, nodeV: nv };
      } catch (e) { liveAvg = { key: key, at: performance.now(), parts: null }; }
    }
    if (!liveAvg.parts) return r;
    var disp = Object.assign({}, r, { nodeV: liveAvg.nodeV, parts: {}, averaged: true });
    Object.keys(r.parts).forEach(function (id) {
      var q = Object.assign({}, r.parts[id]), a = liveAvg.parts[id];
      if (a) { if (q.brightness !== undefined) q.brightness = a.brightness; if (q.p !== undefined) q.p = a.p; if (q.on !== undefined) q.on = a.on > 0; }
      disp.parts[id] = q;
    });
    return disp;
  }

  function setSim(sim) { ed.setSim(sim); bench.setSim(sim); }
  function view() { return viewMode === 'bench' ? bench : ed; }
  /* Darstellung wechseln – Schaltung, Auswahl und Messspitzen bleiben (gemeinsamer Kern). temp: Wahl nicht speichern (Sandbox) */
  function setView(mode, temp) {
    viewMode = mode === 'bench' ? 'bench' : 'schema';
    if (!temp && S.settings.view !== viewMode) { S.settings.view = viewMode; save(); }
    var b = $('#btnView'); if (b) { b.textContent = viewMode === 'bench' ? '⊞ Schaltplan' : '▣ Werkbank'; b.title = viewMode === 'bench' ? 'Zur Schaltplan-Ansicht wechseln' : 'Zur Werkbank-Ansicht wechseln'; }
    if (!core) return;
    core.space = viewMode; core.wireStart = null;
    $('#board').classList.toggle('off', viewMode !== 'schema'); $('#bench').classList.toggle('off', viewMode !== 'bench');
    view().fit();
  }

  /* ---------- Zeitlupe ----------
   * Statische Schaltung: Rechenschritte des Arbeitspunkts (Dioden schalten, Gatter werden einzeln nachgefuehrt).
   * Schaltung mit Kondensator/Takt/Wechselquelle: die letzten Zeitschritte (Backward Euler). */
  function replaySteps() {
    if (live.dynamic) return live.hist.map(function (r) {
      var caps = live.net.parts.filter(function (p) { return p.type === 'capacitor'; }).map(function (p) { return 'U(' + p.id + ') = ' + E.fmt(r.parts[p.id].v, 'V'); });
      return { res: r, label: 't = ' + E.fmt(r.t, 's') + (caps.length ? ' · ' + caps.join(' · ') : '') };
    });
    var tr = live.trace || [];
    return tr.map(function (x, i) {
      var what = x.kind === 'done' ? 'Ruhelage erreicht – so bleibt die Schaltung.' : x.kind === 'unstable' ? 'Keine Ruhelage – die Gatter schalten sich immer wieder um.' :
        'Knotenspannungen berechnet → ' + x.changed.map(function (c) {
          if (typeof c.to === 'string') return c.id + ' ' + ({ on: 'leitet (aktiver Bereich)', sat: 'geht in Sättigung', off: 'sperrt', f: 'leitet', z: 'bricht durch (Z-Betrieb)' }[c.to] || c.to);
          if (Array.isArray(c.to)) return c.id + ' Ausgänge ' + c.to.map(function (b) { return b ? 1 : 0; }).join('');
          return x.kind === 'diode' ? c.id + (c.to ? ' wird leitend' : ' sperrt') : c.id + ' schaltet auf ' + (c.to ? '1' : '0');
        }).join(', ');
      return { res: x.res, label: 'Rechenschritt ' + (i + 1) + ' von ' + tr.length + ': ' + what };
    });
  }
  function openReplay() {
    if (!live.net) return;
    var steps = replaySteps();
    if (steps.length < 2) { status([{ cls: 'info', text: 'Zeitlupe: Diese Schaltung ist in einem Rechenschritt fertig. Spannend wird es mit LEDs/Dioden, Logik-Rückkopplungen, Kondensatoren und Wechselquellen.' }]); return; }
    stopLoop();
    live.replay = { steps: steps, i: steps.length - 1, timer: 0 };
    $('#replay').hidden = false; $('#btnReplay').classList.add('on');
    var sl = $('#rpSlider'); sl.max = steps.length - 1; sl.value = steps.length - 1;
    showStep(live.dynamic ? steps.length - 1 : 0); // Zeitverlauf: beim Jetzt beginnen; Rechenschritte: von vorne
    log('replay', { id: current.task && current.task.id, steps: steps.length, dynamic: live.dynamic });
  }
  function showStep(i) {
    var R = live.replay; if (!R) return;
    R.i = Math.max(0, Math.min(R.steps.length - 1, i));
    $('#rpSlider').value = R.i; $('#rpLabel').textContent = R.steps[R.i].label;
    setSim({ res: R.steps[R.i].res, pinNode: live.net.pinNode });
  }
  function playReplay() {
    var R = live.replay; if (!R) return;
    if (R.timer) { clearInterval(R.timer); R.timer = 0; $('#rpPlay').textContent = '▶'; return; }
    if (R.i >= R.steps.length - 1) showStep(0);
    $('#rpPlay').textContent = '⏸';
    R.timer = setInterval(function () { if (R.i >= R.steps.length - 1) { playReplay(); return; } showStep(R.i + 1); }, live.dynamic ? 60 : 700);
  }
  function closeReplay(quiet) {
    var R = live.replay; if (!R) return;
    if (R.timer) clearInterval(R.timer);
    live.replay = null; $('#replay').hidden = true; $('#btnReplay').classList.remove('on'); $('#rpPlay').textContent = '▶';
    if (!quiet) { tick(0); if (live.dynamic) startLoop(); }
  }

  /* Diagnose aus den Werten des aktuellen Versuchs (Istwert, Grenzwert, Vorschlag) statt festem Text pro Stoerungscode */
  function srcVoltage() { // hoechste Quellenspannung im Aufbau (Gleich- oder Scheitelwert)
    var u = 0; (live.net ? live.net.parts : []).forEach(function (p) { if (p.type === 'battery' || p.type === 'acsource') u = Math.max(u, Math.abs(p.props.value)); }); return u;
  }
  function ohm(r) { return E.fmt(r, 'Ω').replace('.000 ', ' ').replace(/(\.\d*?)0+ /, '$1 ').replace('. ', ' '); }
  var FAULT_TEXT = {
    SHORT: function (f) {
      return 'Kurzschluss an ' + f.part + ': Die Quelle liefert ' + E.fmt(Math.abs(f.i), 'A') + ' (zulässig ' + E.fmt(f.imax, 'A') + '). Zwischen Plus und Minus liegt kein Verbraucher – ' +
        'der Strom wird nur vom Innenwiderstand begrenzt: I ≈ ' + E.fmt(f.u, 'V') + ' / ' + ohm(f.ri) + '.';
    },
    LED_BURNT: function (f) {
      if (!(f.i > 0)) return 'LED ' + f.part + ' ist durchgebrannt – Strom zu gross. Vorwiderstand prüfen, dann „Reparieren“.';
      var ub = srcVoltage(), t = 'LED ' + f.part + ' ist durchgebrannt: Es flossen ' + E.fmt(f.i, 'A') + ', erlaubt sind ' + E.fmt(f.imax, 'A') + '.';
      if (ub > f.vf) {
        var rNow = Math.max(0, (ub - f.vf) / f.i - 10), rMin = (ub - f.vf) / f.imax, rGood = (ub - f.vf) / 0.02;
        t += ' Bei ' + E.fmt(ub, 'V') + ' und U_F ≈ ' + E.fmt(f.vf, 'V') + ' braucht es mindestens R = (' + E.fmt(ub, 'V') + ' − ' + E.fmt(f.vf, 'V') + ') / ' + E.fmt(f.imax, 'A') + ' = ' + ohm(rMin) +
          ' Vorwiderstand, für 20 mA etwa ' + ohm(rGood) + '. Im Kreis waren nur rund ' + ohm(rNow) + '.';
      }
      return t + ' Danach „Reparieren“.';
    },
    LED_REVERSE: function (f) { return 'LED ' + f.part + ' liegt mit ' + E.fmt(Math.abs(f.v), 'V') + ' in Sperrrichtung (verkraftet ca. ' + E.fmt(f.vmax, 'V') + '). Anode (+, langes Bein) gehört Richtung Pluspol.'; },
    OVERLOAD: function (f) {
      var rMin = f.v * f.v / f.pmax;
      return (live.net && live.net.byId[f.part] ? E.PARTS[live.net.byId[f.part].type].label : 'Bauteil') + ' ' + f.part + ' wird zu heiss: P = U · I = ' + E.fmt(Math.abs(f.v), 'V') + ' · ' + E.fmt(Math.abs(f.i), 'A') + ' = ' + E.fmt(Math.abs(f.p), 'W') +
        ', belastbar ist er mit ' + E.fmt(f.pmax, 'W') + '. Bei dieser Spannung braucht es mindestens ' + ohm(rMin) + ' (P = U² / R).';
    },
    LAMP_BURNT: function (f) { return f.p ? 'Lampe ' + f.part + ' ist durchgebrannt: Sie nahm ' + E.fmt(Math.abs(f.p), 'W') + ' auf bei ' + E.fmt(Math.abs(f.v), 'V') + ' – ausgelegt ist sie für ' + E.fmt(f.pnom, 'W') + '. Spannung zu hoch.' : 'Lampe ' + f.part + ' ist durchgebrannt – Überspannung.'; },
    AMMETER_OVERLOAD: function (f) { return 'Strommesser ' + f.part + ' misst ' + E.fmt(Math.abs(f.i), 'A') + ' (Grenze ' + E.fmt(f.imax, 'A') + ') – er liegt wohl parallel zur Quelle statt in Reihe.'; },
    UNSTABLE: function () {
      var g = {}; (live.trace || []).forEach(function (x) { if (x.kind === 'gate') x.changed.forEach(function (c) { g[c.id] = true; }); });
      var ids = Object.keys(g);
      return 'Die Logikschaltung kommt nicht zur Ruhe' + (ids.length ? ': ' + ids.join(' und ') + ' schalten sich gegenseitig immer wieder um' : '') + ' (Rückkopplung ohne Ruhelage). Die Zeitlupe zeigt die einzelnen Schritte.';
    },
    NO_GROUND: function () { return 'Logikbausteine und Taktgeber brauchen eine Masse-Verbindung (⏚).'; },
    OUTPUT_CLASH: function (f) { return 'Ausgang gegen Ausgang: ' + f.parts.join(' und ') + ' treiben denselben Knoten mit unterschiedlichem Pegel (1 gegen 0). Es fliessen rund ' + E.fmt(f.i, 'A') + ' Ausgleichsstrom – die Ausgangsstufen werden heiss und gehen kaputt. Zwei Signale verknüpft man mit einem Gatter (z. B. ODER), nie durch direktes Zusammenschalten.'; }
  };
  function diagnose(faults) { return (faults || []).map(function (f) { return { cls: 'err', text: (FAULT_TEXT[f.code] || function () { return f.code; })(f) }; }); }
  function status(items) {
    var el = $('#statusbar'); if (!el) return;
    el.innerHTML = items && items.length ? items.map(function (i) { return '<div class="st ' + i.cls + '">' + esc(i.text) + '</div>'; }).join('')
      : '<div class="st ok">Schaltung läuft – keine Störung.</div>';
  }

  /* ---------- Multimeter ---------- */
  function setMeterMode(mode) {
    if (mode !== meter.mode) meter.range = 'AUTO';
    meter.mode = mode; renderRangeRow();
    $$('[data-mm]').forEach(function (b) { b.classList.toggle('on', b.dataset.mm === mode); });
    // Werkbank (Ziehen): die Spitzen bleiben stecken, auch wenn das Gerät aus ist (wie am echten Gerät); im Schaltplan (Klick) räumt OFF die Spitzen weg – sonst bleibt beim nächsten A⎓ ein Parallelzweig zur Quelle (FUSE)
    if (ed) { ed.tool = mode === 'OFF' ? 'wire' : 'probe'; if (mode === 'OFF' && !(dragUX() && viewMode === 'bench')) { ed.probes = { a: null, b: null }; meter.a = meter.b = null; meter.next = 'a'; } core.redraw(); }
    log('meter_mode', { id: current.task && current.task.id, mode: mode });
    $('#mmHelp').textContent = dragUX() && viewMode === 'bench' ? 'Werkbank: Messspitzen mit der Maus an die Buchsen ziehen (rot = +, schwarz = COM). Klick auf Buchsen verbindet Leitungen.' :
      mode === 'OFF' ? 'Messgerät aus. Klick auf Anschlüsse verbindet Leitungen.' :
      'Klick auf einen Anschluss setzt die ' + (meter.next === 'a' ? 'rote (+)' : 'schwarze (COM)') + ' Messspitze.';
    if (ed) tick(0);
  }
  /* Messbereich von Hand (nur measureUX 'drag'): 'AUTO' oder Endwert aus E.DMM_MANUAL; Wechsel des Modus setzt auf AUTO */
  function rangeUnit() { return meter.mode === 'A' || meter.mode === 'AAC' ? 'A' : meter.mode === 'R' ? 'Ω' : 'V'; }
  function setMeterRange(r) {
    meter.range = r === 'AUTO' ? 'AUTO' : +r;
    log('meter_range', { id: current.task && current.task.id, mode: meter.mode, range: meter.range });
    renderRangeRow(); if (ed) tick(0);
  }
  function rangeList() {
    if (!manualRange() || meter.mode === 'OFF') return null;
    var u = rangeUnit();
    return [{ label: 'AUTO', value: 'AUTO', on: meter.range === 'AUTO' }].concat(E.DMM_MANUAL[u].map(function (v) { return { label: E.rangeLabel(v, u), value: v, on: meter.range === v }; }));
  }
  function renderRangeRow() {
    var el = $('#mmRange'), rs = rangeList(); if (!el) return;
    el.hidden = !rs;
    el.innerHTML = rs ? '<span>Bereich</span>' + rs.map(function (r) { return '<button data-rg="' + r.value + '"' + (r.on ? ' class="on"' : '') + '>' + esc(r.label) + '</button>'; }).join('') : '';
    $$('[data-rg]', el).forEach(function (b) { b.onclick = function () { setMeterRange(b.dataset.rg); }; });
  }
  /* pin gesetzt: per Klick (which fehlt → abwechselnd rot/schwarz) oder per Ziehen (which = 'a'|'b', pin null = wieder geparkt) */
  function setProbe(pin, which) {
    if (which) { meter[which] = pin || null; if (meter.a && meter.b) meter.next = 'a'; else meter.next = meter.a ? 'b' : 'a'; }
    else {
      meter[meter.next] = pin; ed.probes[meter.next] = pin;
      meter.next = meter.next === 'a' ? 'b' : 'a';
      $('#mmHelp').textContent = 'Nächster Klick setzt die ' + (meter.next === 'a' ? 'rote (+)' : 'schwarze (COM)') + ' Spitze.';
    }
    log('probe', { id: current.task && current.task.id, mode: meter.mode, pin: pin });
    tick(0);
  }
  /* Anzeige eines Multimeters wie ein 6000-Digit-DMM (Bereichswahl, +0,2 % Kalibrierfehler, letzte Stelle flackert) – ohne DOM,
   * fuer die Aufgabe und das Werkbank-Tutorial. m = {mode, a, b, acKey, ac} (ac-Zwischenspeicher liegt im Objekt),
   * rg = fester Bereich (Endwert) oder undefined, mt = 'avg'|'trms'. Liefert {text, sub, warn, ol}. */
  function meterReading(m, layout, net, r, state, mn, rg, mt) {
    var txt = '— — —', warn = '', sub = m.mode === 'VAC' || m.mode === 'AAC' ? 'AC ' + (mt === 'avg' ? 'AVG' : 'TRMS') : m.mode === 'V' || m.mode === 'A' ? 'DC' : '';
    var unit = m.mode === 'A' || m.mode === 'AAC' ? 'A' : m.mode === 'R' ? 'Ω' : 'V';
    function ac() { // Wechselgroessen nur neu rechnen, wenn sich Aufbau oder Spitzen aendern
      var key = JSON.stringify(layout) + '|' + m.a + '|' + m.b;
      if (m.acKey !== key) { m.acKey = key; m.ac = E.acMeasure(layout, { a: m.a, b: m.b }); }
      return m.ac;
    }
    function acA() { // Wechselstrom über den Shunt (A~ und Hinweis bei A⎓): wie ac(), aber mit eingesetztem Amperemeter
      var key = JSON.stringify(layout) + '|A|' + m.a + '|' + m.b;
      if (m.acAKey !== key) { m.acAKey = key; m.acA = mn ? E.acMeasure(layout, { a: m.a, b: m.b }, { meter: { mode: 'A', a: mn.a, b: mn.b } }) : { ok: false }; }
      return m.acA;
    }
    function acA() { // Wechselstrom über den Shunt (A~ und Hinweis bei A⎓): wie ac(), aber mit eingesetztem Amperemeter
      var key = JSON.stringify(layout) + '|A|' + m.a + '|' + m.b;
      if (m.acAKey !== key) { m.acAKey = key; m.acA = mn ? E.acMeasure(layout, { a: m.a, b: m.b }, { meter: { mode: 'A', a: mn.a, b: mn.b } }) : { ok: false }; }
      return m.acA;
    }
    function acA() { // Wechselstrom über den Shunt (A~ und Hinweis bei A⎓): wie ac(), aber mit eingesetztem Amperemeter
      var key = JSON.stringify(layout) + '|A|' + m.a + '|' + m.b;
      if (m.acAKey !== key) { m.acAKey = key; m.acA = mn ? E.acMeasure(layout, { a: m.a, b: m.b }, { meter: { mode: 'A', a: mn.a, b: mn.b } }) : { ok: false }; }
      return m.acA;
    }
    var fs = Infinity; (net ? net.parts : []).forEach(function (p) { if ((p.type === 'acsource' || p.type === 'clock') && p.props.freq > 0) fs = Math.min(fs, p.props.freq); });
    var raw = NaN; // Rohwert in der Basiseinheit (für Bereichs- und Vorzeichenhinweise)
    if (m.mode === 'OFF') txt = 'OFF';
    else if (!mn || !r) {
      txt = m.mode === 'R' ? '0L Ω' : '- - -';
      if (r) warn = !m.a && !m.b ? 'Zwei Spitzen setzen: rot (+) an den Pluspunkt, schwarz (COM) an den Bezugspunkt – auf der Werkbank ziehen, im Schaltplan anklicken.' : 'Noch die ' + (m.a ? 'schwarze (COM)' : 'rote (+)') + ' Spitze an einen Anschluss setzen.';
    }
    else if (m.mode === 'V') {
      var vdc = r.nodeV[mn.a] - r.nodeV[mn.b], acV = null;
      if (isFinite(fs) && fs >= 5) { var ac1 = ac(); if (ac1.ok) { vdc = ac1.dc; acV = ac1; } } // DMM zeigt bei schnellem Wechsel den Mittelwert (ohne Wechselquelle: Momentanwert mit Eigenverbrauch)
      raw = vdc; txt = E.dmm(vdc, 'V', undefined, rg).text;
      if (acV && acV.rms > 0.05 && Math.abs(vdc) < 0.05 * acV.rms) warn = 'Deine Schaltung liefert Wechselspannung: V⎓ zeigt nur den Mittelwert (hier ≈ 0). Für den Effektivwert V~ wählen.';
    } else if (m.mode === 'VAC') {
      var a2 = ac();
      if (!a2.ok) { txt = 'Err'; warn = a2.error; }
      else { raw = mt === 'avg' ? a2.avg : a2.rms; txt = E.dmm(raw, 'V', undefined, rg).text; if (a2.static) warn = 'Du misst V~, die Schaltung liefert Gleichspannung – V~ zeigt nur den Wechselanteil (hier 0). Wähle V⎓.'; }
    } else if (m.mode === 'A') {
      if (state.fuse) {
        txt = 'FUSE';
        var fi = state.fuseInfo;
        warn = 'Sicherung durchgebrannt: Die Spitzen lagen parallel zu einer Quelle' + (fi ? ' – ' + E.fmt(Math.abs(fi.i), 'A') + ' statt höchstens ' + E.fmt(fi.imax, 'A') : '') + '. A-Messung immer in Reihe: Kreis auftrennen (eine Leitung löschen), das Messgerät in die Lücke setzen, dann „Sicherung ersetzen“.';
      } else {
        raw = (r.nodeV[mn.a] - r.nodeV[mn.b]) / E.METER.rA;
        if (isFinite(fs) && fs >= 5) { var acD = acA(); if (acD.ok && !acD.static) { raw = acD.dc / E.METER.rA; if (acD.rms / E.METER.rA > 1e-4 && Math.abs(raw) < 0.05 * acD.rms / E.METER.rA) warn = 'Deine Schaltung führt Wechselstrom: A⎓ zeigt nur den Mittelwert (hier ≈ 0). Für den Effektivwert A~ wählen.'; } } // DMM zeigt bei schnellem Wechsel den Mittelwert
        txt = E.dmm(raw, 'A', undefined, rg).text;
      }
    } else if (m.mode === 'AAC') {
      if (state.fuse) {
        txt = 'FUSE'; var fi2 = state.fuseInfo;
        warn = 'Sicherung durchgebrannt: Die Spitzen lagen parallel zu einer Quelle' + (fi2 ? ' – ' + E.fmt(Math.abs(fi2.i), 'A') + ' statt höchstens ' + E.fmt(fi2.imax, 'A') : '') + '. A-Messung immer in Reihe: Kreis auftrennen (eine Leitung löschen), das Messgerät in die Lücke setzen, dann „Sicherung ersetzen“.';
      } else {
        var a4 = acA();
        if (!a4.ok) { txt = 'Err'; warn = a4.error; }
        else { raw = (mt === 'avg' ? a4.avg : a4.rms) / E.METER.rA; txt = E.dmm(raw, 'A', undefined, rg).text; if (a4.static) warn = 'Du misst A~, der Strom ist Gleichstrom – A~ zeigt nur den Wechselanteil (hier 0). Wähle A⎓.'; }
      }
    } else if (m.mode === 'R') {
      var mr = E.measure(layout, { mode: 'R', a: m.a, b: m.b }, state);
      txt = mr.ok ? E.dmm(mr.value, 'Ω', undefined, rg).text.replace('OL', '0L') : 'Err'; if (mr.ok) raw = mr.value;
      warn = mr.ok ? '' : /spannungsfrei/.test(mr.error || '') ? 'Widerstandsmessung nur spannungsfrei: Schalter öffnen bzw. Quelle abklemmen oder das Bauteil einseitig herauslösen (eine Leitung löschen).' : mr.error;
    }
    var ol = !!(rg && mn && /^0?L$|OL|0L/.test(txt));
    if (ol && !warn) warn = 'Bereich zu klein (OL): ' + E.rangeLabel(rg, unit) + ' reicht nicht' + (isFinite(raw) && Math.abs(raw) > 0 ? ' – nimm ' + E.rangeLabel(suggestRange(unit, raw), unit) : ' – nimm den nächsten grösseren Bereich') + '.';
    else if (rg && !warn && isFinite(raw) && Math.abs(raw) > 0 && Math.abs(raw) < rg / 20 && suggestRange(unit, raw) < rg) warn = 'Bereich zu gross: ' + E.rangeLabel(rg, unit) + ' zeigt nur wenige Stellen – nimm ' + E.rangeLabel(suggestRange(unit, raw), unit) + '.';
    if (!warn && (m.mode === 'V' || m.mode === 'A') && isFinite(raw) && raw < -0.001) warn = 'Negatives Vorzeichen: rote und schwarze Spitze sind vertauscht – zulässig, der Betrag stimmt.';
    return { text: txt, sub: sub, warn: warn, ol: ol, range: rg ? E.rangeLabel(rg, unit) : null };
  }
  /* Kurve fuers Oszilloskop (Aufgabe und Tutorial): Abtastung ueber T Sekunden, Skala, Punkte fuer den Werkbank-Schirm */
  /* Oszilloskop-Kurve (Paket O, 05.10.2026): Abtastung mindestens 100 Punkte je Periode der schnellsten Quelle, vorher Einschwingen
   * wie E.acMeasure (5·R·C, höchstens 3 s). Anzeige als Hüllkurve: je Bildspalte Minimum und Maximum (bei vielen Perioden ein Band),
   * bei wenigen Perioden die Kurve selbst; Werkbank-Schirm, Seitenleiste und grosses Oszilloskop zeichnen dieselben Punkte (pts).
   * Kennwerte max/min kommen aus E.acMeasure (eingeschwungen, fein abgetastet), sobald mindestens eine Periode im Bild ist; sonst
   * aus dem Bildausschnitt mit Hinweis «Bildbreite zu klein». pts = [x 0…1, y 0…1]; bei einem Band erst die Oberkante, dann die Unterkante rückwärts. */
  function scopeCurve(layout, sp, T, label, chNo, scale) {
    var fr = sourceFreqs(layout), fmax = fr.length ? Math.max.apply(null, fr) : 0, fmin = fr.length ? Math.min.apply(null, fr) : 0, dt = T / 400;
    if (fmax > 0) dt = Math.min(dt, 1 / (fmax * 100)); dt = Math.max(dt, T / 40000);
    var rs = [], cs = []; (layout.parts || []).forEach(function (p) { var v = p.value !== undefined ? p.value : (p.props && p.props.value); if (p.type === 'resistor' && v > 0) rs.push(v); if (p.type === 'capacitor' && v > 0) cs.push(v); });
    var tauMax = rs.length && cs.length ? Math.max.apply(null, rs) * Math.max.apply(null, cs) : 0, settle = null;
    if (fr.length && tauMax > 0) { var T0 = 1 / Math.min.apply(null, fr); settle = { t: Math.ceil(Math.min(5 * tauMax, 3) / T0) * T0, dt: T0 / 40 }; } // ohne Wechselquelle (Ladekurve) bewusst ab t = 0
    var s = E.simulate(layout, { dt: dt, tEnd: T, settle: settle, probes: [{ a: sp.a, b: sp.b || undefined }] }).samples;
    var vs = s.map(function (x) { return x.ch0; }), mx = Math.max.apply(null, vs), mn = Math.min.apply(null, vs);
    var periods = fmin > 0 ? T * fmin : 0, short = fmin > 0 && periods < 0.999, ac = null;
    if (fmin > 0 && !short) { try { ac = E.acMeasure(layout, { a: sp.a, b: sp.b || undefined }); } catch (e) { ac = null; } }
    if (ac && ac.ok && !ac.static && isFinite(ac.max)) { mx = ac.max; mn = ac.min; } // exakte Kennwerte, unabhängig von der Bildbreite
    var top = scale ? scale.top : Math.max(1, Math.ceil(Math.max(mx, 0) * 1.1)), bot = scale ? scale.bot : Math.min(0, Math.floor(mn * 1.1)), span = top - bot;
    // Huellkurve: Spalten; bei mehr Perioden als Spalten/2 ist das Bild ein Band aus den exakten Kennwerten (kein Aliasing)
    var cols = 300, pts = [], t0 = s.length ? s[0].t : 0; // nach dem Einschwingen beginnt die Aufzeichnung nicht bei t = 0
    if (s.length <= 2 * cols) pts = s.map(function (x) { return [(x.t - t0) / T, (x.ch0 - bot) / span]; });
    else {
      var hi = [], lo = [], k, c0;
      for (k = 0; k < cols; k++) { hi[k] = -Infinity; lo[k] = Infinity; }
      s.forEach(function (x) { c0 = Math.max(0, Math.min(cols - 1, Math.floor((x.t - t0) / T * cols))); if (x.ch0 > hi[c0]) hi[c0] = x.ch0; if (x.ch0 < lo[c0]) lo[c0] = x.ch0; });
      if (ac && periods > cols / 6) for (k = 0; k < cols; k++) { hi[k] = mx; lo[k] = mn; } // unter 6 Spalten je Periode wäre die Hüllkurve selbst ein Moiré
      for (k = 0; k < cols; k++) if (isFinite(hi[k])) pts.push([(k + 0.5) / cols, (hi[k] - bot) / span]);
      for (k = cols - 1; k >= 0; k--) if (isFinite(lo[k])) pts.push([(k + 0.5) / cols, (lo[k] - bot) / span]);
    }
    var hint = short ? 'Bildbreite zu klein: weniger als eine Periode im Bild – Scheitelwert und Spitze-Spitze sind so nicht ablesbar, grössere Bildbreite wählen.' : '';
    return { samples: s, top: top, bot: bot, mx: mx, mn: mn, pts: pts, short: short, hint: hint, periods: periods,
      info: 'CH' + (chNo || 1) + ' ' + sp.a + (sp.b ? '–' + sp.b : '') + ' · ' + bot + '…' + top + ' V · ' + label + (short ? ' · zu klein!' : ''),
      text: 'Kanal: ' + sp.a + ' gegen ' + (sp.b || 'Masse') + ' · ' + bot + '…' + top + ' V · max ' + E.fmt(mx, 'V') + ' · min ' + E.fmt(mn, 'V') + (short ? ' · ' + hint : '') };
  }
  function updateMeter(r, mn) {
    var lcd = $('#lcd'), rg = manualRange() && meter.range !== 'AUTO' ? meter.range : undefined;
    var rd = meterReading(meter, ed.layout, live.net, r, live.state, mn, rg, meterType()), txt = rd.text, warn = rd.warn;
    lcd.textContent = txt;
    if (bench) bench.meter = { mode: meter.mode, text: txt, fuse: live.state.fuse, sub: rd.sub, ranges: rangeList(), range: rd.range };
    $('#mmWarn').textContent = warn; $('#btnFuse').hidden = !live.state.fuse;
    $('#mmProbes').innerHTML = '<span class="pr red">+ ' + esc(meter.a || '–') + '</span><span class="pr black">COM ' + esc(meter.b || '–') + '</span>';
  }

  /* ---------- Eigenschaften ---------- */
  function renderInspector() {
    var el = $('#inspector'); if (!ed) return;
    var p = ed.sel && ed.sel.indexOf('w:') !== 0 ? ed.part(ed.sel) : null;
    if (!p) { el.innerHTML = '<p class="dim small">Bauteil anklicken, um Werte zu ändern. <kbd>R</kbd> dreht, <kbd>Entf</kbd> löscht.</p>'; return; }
    var d = E.PARTS[p.type], q = p.props || (p.props = {}), lock = ed.locked[p.id] && p.type !== 'acsource' && p.type !== 'clock', val = p.value !== undefined ? p.value : (q.value !== undefined ? q.value : d.props.value);
    var r = live.res && live.res.parts[p.id];
    var h = '<div class="insp-head"><b>' + esc(p.id) + '</b> ' + esc(d.label) + (lock ? ' <span class="tag">Aufgabe</span>' : '') + '<button class="btn small ds-btn" id="dsBtn" title="Datenblatt: Funktion, Anschlüsse, Grenzen">ⓘ Datenblatt</button></div>';
    function field(label, key, v, unit) { return '<label class="fld"><span>' + label + '</span><input data-prop="' + key + '" value="' + esc(v) + '"' + (lock ? ' disabled' : '') + '><em>' + unit + '</em></label>'; }
    if (p.type === 'battery') h += field('Spannung', 'value', Editor.fmtVal(val), 'V');
    if (p.type === 'resistor' || p.type === 'lamp' || p.type === 'pot' || p.type === 'motor') h += field('Widerstand', 'value', Editor.fmtVal(val), 'Ω');
    if (p.type === 'zener') h += field('Z-Spannung', 'vz', q.vz || d.props.vz, 'V');
    if (p.type === 'npn') h += field('Stromverstärkung β', 'beta', q.beta || d.props.beta, '');
    if (p.type === 'capacitor') h += field('Kapazität', 'value', Editor.fmtVal(val), 'F');
    if (p.type === 'clock') h += field('Frequenz', 'freq', q.freq || d.props.freq, 'Hz');
    if (p.type === 'acsource') {
      h += field('Scheitelwert Û', 'value', Editor.fmtVal(val), 'V') + field('Frequenz', 'freq', q.freq || d.props.freq, 'Hz');
      h += '<label class="fld"><span>Gleichanteil</span><input data-prop="offset" value="' + esc(q.offset || 0) + '"' + (lock ? ' disabled' : '') + '><em>V</em></label>';
      h += '<label class="fld"><span>Kurvenform</span><select data-prop="shape"' + (lock ? ' disabled' : '') + '>' + [['sine', 'Sinus'], ['square', 'Rechteck'], ['triangle', 'Dreieck']].map(function (o) {
        return '<option value="' + o[0] + '"' + ((q.shape || 'sine') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    }
    if (p.type === 'pot') h += '<label class="fld"><span>Schleifer</span><input type="range" min="0" max="1" step="0.01" data-prop="pos" value="' + (q.pos !== undefined ? q.pos : 0.5) + '"></label>';
    if (p.type === 'led') {
      h += '<label class="fld"><span>Farbe</span><select data-prop="color"' + (lock ? ' disabled' : '') + '>' + Object.keys(E.LED_COLORS).map(function (c) { return '<option value="' + c + '"' + ((q.color || 'rot') === c ? ' selected' : '') + '>' + (E.LED_COLORS[c].label || c) + '</option>'; }).join('') + '</select></label>';
    }
    if (p.type === 'switch') h += '<p class="small">Stellung: <b>' + (q.closed ? 'zu (geschlossen) – Strom kann fliessen' : 'offen – kein Strom') + '</b></p><button class="btn small" id="tgl">' + (q.closed ? 'Schalter öffnen' : 'Schalter schliessen') + '</button>';
    if (p.type === 'logicin') h += '<button class="btn small" id="tgl">Pegel auf ' + (q.closed ? '0' : '1') + ' schalten</button>';
    if (r) {
      h += '<dl class="readout">';
      if (r.v !== undefined) h += '<dt>U</dt><dd>' + E.fmt(Math.abs(r.v), 'V') + '</dd>';
      if (r.i !== undefined) h += '<dt>I</dt><dd>' + E.fmt(Math.abs(r.i), 'A') + '</dd>';
      if (r.p !== undefined) h += '<dt>P</dt><dd>' + E.fmt(Math.abs(r.p), 'W') + '</dd>';
      if (r.burnt) h += '<dt>!</dt><dd class="err">defekt</dd>';
      h += '</dl><p class="dim tiny">Direktanzeige der Simulation – im Protokoll zählt, was du mit dem Messgerät misst.</p>';
    }
    el.innerHTML = h;
    $$('[data-prop]', el).forEach(function (inp) {
      inp.onchange = inp.oninput = function (ev) {
        var k = inp.dataset.prop, v = inp.value;
        if (k === 'offset') { var o = parseFloat(String(v).replace(',', '.')); if (!isFinite(o)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); if (ev.type !== 'change') return; q.offset = o; }
        else if (k === 'value' || k === 'freq' || k === 'vz' || k === 'beta') { var n = parseVal(v); if (!(n > 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); if (ev.type !== 'change') return; v = n; if (k === 'value') { p.value = n; delete q.value; } else q[k] = n; }
        else if (k === 'pos') q.pos = +v; else q[k] = v;
        persistDraft(); rebuild(); core.redraw(); if (k !== 'pos') renderInspector();
      };
    });
    $('#dsBtn').onclick = function () { showSheet(p.type, p, this.getBoundingClientRect(), { pinned: true, from: 'inspector' }); };
    var tg = $('#tgl'); if (tg) tg.onclick = function () { q.closed = !q.closed; persistDraft(); rebuild(); renderInspector(); };
  }

  /* ---------- Oszilloskop ----------
   * Kanal 1: bei measureUX 'drag' der eigene Tastkopf (core.scopeProbes.tip gegen gnd, Erdungsclip offen = Masse),
   * sonst (Altbestand, Schema-Ansicht) die Messspitzen des Multimeters. */
  /* Kanal 1: eigener Tastkopf, sobald er auf der Werkbank angeschlossen ist; im Schaltplan (kein Tastkopf zum Ziehen) sonst die Multimeter-Spitzen */
  function scopeProbes() {
    if (dragUX() && core && (core.scopeProbes.tip || viewMode === 'bench')) return { a: core.scopeProbes.tip, b: core.scopeProbes.gnd, a2: core.scopeProbes.tip2, own: true };
    return { a: meter.a, b: meter.b, own: false };
  }
  /* L3 (05.10.2026): zweiter Kanal – blauer Tastkopf CH2 gegen denselben Erdungsclip. Kanäle einzeln ein-/ausschaltbar (Gerät und Seitenleiste),
   * beide Kurven auf gemeinsamer Skala, Kennwerte je Kanal, Phasenverschiebung CH2 gegen CH1 aus den steigenden Nulldurchgängen. */
  var scopeCh = { 1: true, 2: true };
  function toggleChannel(n) { scopeCh[n] = !scopeCh[n]; $$('#scopeCh [data-ch]').forEach(function (b) { b.classList.toggle('on', scopeCh[+b.dataset.ch]); }); if (lastScope) { bench.scope = Object.assign({}, bench.scope, { ch: scopeCh }); bench.render(); scope(); } else if (bench) { bench.scope = Object.assign({}, bench.scope || {}, { ch: scopeCh }); bench.render(); } log('scope_ch', { ch: n, on: scopeCh[n] }); }
  function phaseShift(c1, c2, T0) { // Δt der ersten steigenden Nulldurchgänge (um den Gleichanteil), als Zeit und Winkel
    if (!c1 || !c2 || !T0) return null;
    function cross(s) { var dc = 0; s.forEach(function (x) { dc += x.ch0; }); dc /= s.length || 1; for (var k = 1; k < s.length; k++) if (s[k - 1].ch0 < dc && s[k].ch0 >= dc) return s[k].t - (s[k].ch0 - dc) / ((s[k].ch0 - s[k - 1].ch0) || 1e-12) * (s[k].t - s[k - 1].t); return null; }
    var t1 = cross(c1.samples), t2 = cross(c2.samples); if (t1 === null || t2 === null) return null;
    var dt = t2 - t1; dt = dt - Math.round(dt / T0) * T0; // auf (−T0/2, T0/2]
    return { dt: dt, deg: dt / T0 * 360 };
  }
  function scope() {
    var cv = $('#scope'), ctx = cv.getContext('2d'), T = +$('#tb').value;
    var w = cv.width = cv.clientWidth * (window.devicePixelRatio || 1), h = cv.height = cv.clientHeight * (window.devicePixelRatio || 1);
    ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,176,0,0.12)'; ctx.lineWidth = 1;
    for (var i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(w * i / 10, 0); ctx.lineTo(w * i / 10, h); ctx.stroke(); }
    for (i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 8); ctx.lineTo(w, h * i / 8); ctx.stroke(); }
    var sp = scopeProbes();
    if (!sp.a) {
      $('#scopeInfo').textContent = sp.own ? 'Tastkopf anschliessen: den gelben Tastkopf (CH1) an den Messpunkt ziehen, den schwarzen Erdungsclip an Masse bzw. den Bezugspunkt – dann RUN.' : 'Setze zuerst die rote Messspitze (Multimeter V).';
      bench.scope = { pts: [], info: sp.own ? 'Tastkopf anschliessen' : 'Zuerst rote Messspitze setzen (V)' }; bench.render(); return;
    }
    var c, c2 = null, label = $('#tb').selectedOptions[0].textContent;
    try {
      c = scopeCurve(ed.layout, sp, T, label);
      if (sp.own && sp.a2 && scopeCh[2]) { // CH2 auf derselben Skala wie CH1 (gemeinsame Masse)
        c2 = scopeCurve(ed.layout, { a: sp.a2, b: sp.b }, T, label, 2);
        var top = Math.max(c.top, c2.top), bot = Math.min(c.bot, c2.bot);
        if (top !== c.top || bot !== c.bot) c = scopeCurve(ed.layout, sp, T, label, 1, { top: top, bot: bot });
        if (top !== c2.top || bot !== c2.bot) c2 = scopeCurve(ed.layout, { a: sp.a2, b: sp.b }, T, label, 2, { top: top, bot: bot });
      }
    } catch (e) { $('#scopeInfo').textContent = e.message; return; }
    if (scopeCh[1]) drawTrace(ctx, c, T, w, h, '#ffb000');
    if (c2) drawTrace(ctx, c2, T, w, h, '#38bdf8');
    var fr0 = sourceFreqs(ed.layout), ph = c2 ? phaseShift(c, c2, fr0.length ? 1 / Math.min.apply(null, fr0) : 0) : null;
    lastScope = { c: c, c2: c2, phase: ph, T: T, layout: ed.layout, label: label, sp: sp };
    $('#scopeInfo').textContent = (c2 ? 'CH1 ' : '') + c.text + (c2 ? ' · CH2 ' + c2.text.replace(/^Kanal: /, '') + (ph ? ' · Phase CH2→CH1 ' + E.fmt(ph.dt, 's') + ' (' + ph.deg.toFixed(0) + '°)' : '') : '');
    $('#scopeCh').hidden = !sp.own;
    bench.scope = { pts: c.pts, pts2: c2 ? c2.pts : null, info: c.info + (c2 ? ' · CH2 ' + c2.bot + '…' + c2.top + ' V' : ''), ch: scopeCh };
    bench.render();
    log('scope', { id: current.task && current.task.id, T: T, ch2: !!c2 });
  }

  function drawTrace(ctx, c, T, w, h, color) {
    color = color || '#ffb000';
    ctx.strokeStyle = color; ctx.lineWidth = 2 * (window.devicePixelRatio || 1); ctx.shadowColor = color; ctx.shadowBlur = 6; ctx.beginPath();
    c.pts.forEach(function (p, k) { var px = p[0] * w, py = h - p[1] * h; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); // dieselben Punkte wie der Werkbank-Schirm (Kurve oder Hüllkurve)
    if (c.pts.length > 600) ctx.closePath();
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  /* Oszilloskop gross: Overlay mit dem Schirm in voller Breite und den Kennwerten (Û+, Û−, Uss, Bildbreite, Frequenz/Periode der
   * langsamsten Wechselquelle). Esc oder Klick daneben schliesst; der Aufbau bleibt unveraendert. Wird von Aufgabe und Tutorial genutzt. */
  var lastScope = null;
  function scopeBig(sc) {
    sc = sc || lastScope;
    var el = $('#scopeBig');
    if (!el) { el = document.createElement('div'); el.id = 'scopeBig'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Oszilloskop gross'); document.body.appendChild(el); }
    if (!sc) { el.innerHTML = '<div class="sb-back"></div><div class="sb-box"><div class="sb-head"><b>Oszilloskop</b><button class="sb-x" aria-label="Schliessen">×</button></div><p class="dim">Noch keine Aufnahme: zuerst Tastkopf bzw. Messspitzen setzen und RUN / „Aufnahme“ drücken.</p></div>'; }
    else {
      var c = sc.c, src = (sc.layout.parts || []).filter(function (p) { return p.type === 'acsource' || p.type === 'clock'; }), f = src.length ? Math.min.apply(null, src.map(function (p) { return (p.props && p.props.freq) || E.PARTS[p.type].props.freq || 50; })) : 0;
      var c2 = sc.c2, p1 = c2 ? 'CH1 ' : '';
      var stat = [[p1 + 'Û+ (max)', E.fmt(c.mx, 'V')], [p1 + 'Û− (min)', E.fmt(c.mn, 'V')], [p1 + 'Uss', E.fmt(c.mx - c.mn, 'V')]];
      if (c2) stat.push(['CH2 Û+ (max)', E.fmt(c2.mx, 'V')], ['CH2 Û− (min)', E.fmt(c2.mn, 'V')], ['CH2 Uss', E.fmt(c2.mx - c2.mn, 'V')]);
      if (sc.phase) stat.push(['Phase CH2→CH1', E.fmt(sc.phase.dt, 's') + ' / ' + sc.phase.deg.toFixed(0) + '°']);
      stat.push(['Bildbreite', sc.label], ['Raster', E.fmt(sc.T / 10, 's') + ' / Div']);
      if (f) stat.push(['Quelle f', E.fmt(f, 'Hz')], ['Periode T', E.fmt(1 / f, 's')]);
      if (c.short) stat.push(['Hinweis', 'Bildbreite zu klein – Û und Uss nicht ablesbar']);
      el.innerHTML = '<div class="sb-back"></div><div class="sb-box"><div class="sb-head"><b>Oszilloskop</b><span class="dim small">' + esc(c.info) + '</span><button class="sb-x" aria-label="Schliessen">×</button></div>' +
        '<canvas id="sbCanvas"></canvas><div class="sb-stats">' + stat.map(function (s) { return '<div><span>' + s[0] + '</span><b class="mono">' + esc(s[1]) + '</b></div>'; }).join('') + '</div>' +
        '<p class="dim small">Esc oder Klick daneben schliesst. Deine Schaltung und die Messspitzen bleiben, wie sie sind.</p></div>';
      el.hidden = false; // erst sichtbar machen, dann messen – sonst ist die Leinwand 0 × 0
      var cv = $('#sbCanvas'), ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
      var w = cv.width = cv.clientWidth * dpr, h = cv.height = cv.clientHeight * dpr;
      ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(255,176,0,0.15)'; ctx.lineWidth = 1;
      for (var i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(w * i / 10, 0); ctx.lineTo(w * i / 10, h); ctx.stroke(); }
      for (i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 8); ctx.lineTo(w, h * i / 8); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = (12 * dpr) + 'px ' + 'monospace'; ctx.fillText(c.top + ' V', 6 * dpr, 14 * dpr); ctx.fillText(c.bot + ' V', 6 * dpr, h - 6 * dpr);
      drawTrace(ctx, c, sc.T, w, h, '#ffb000'); if (c2) drawTrace(ctx, c2, sc.T, w, h, '#38bdf8');
    }
    el.hidden = false; document.body.classList.add('sb-open');
    var close = function () { el.hidden = true; document.body.classList.remove('sb-open'); document.removeEventListener('keydown', esc1); };
    var esc1 = function (ev) { if (ev.key === 'Escape') { ev.preventDefault(); close(); } };
    $('.sb-back', el).onclick = close; $('.sb-x', el).onclick = close; document.addEventListener('keydown', esc1);
    $('.sb-x', el).focus();
    log('scope_big', { id: current.task && current.task.id });
  }

  /* ---------- Vorführ-Modus (Feedback 01.10.2026, Phase 6) ----------
   * Zeigt an EINEM Messwert der Aufgabe (task.demo oder der erste mit Spitzen und Messart V / V~ / Ω / Oszilloskop), wie gemessen wird:
   * Messart und Bereich am Gerät, Spitzen bzw. Tastkopf gleiten zu den Buchsen (dieselbe dragProbeTo/dropProbe-Logik wie beim Ziehen),
   * Anzeige, dann der Rechenweg Schritt für Schritt. Tempo/Pause/Schritt wie in den Theorie-Animationen (DQVisuals.playbar), Abbrechen jederzeit.
   * Der Entwurf wird nie verändert: Alles läuft auf dem Live-Zustand, am Ende wird der Zustand vor der Vorführung wiederhergestellt.
   * Zählt wie ein Tipp (current.hints ≥ 1), Ereignis demo_view. Nicht in Prüfung und Live-Challenge. */
  var demo = null;
  function demoAble(m) { return !!(m.a && (m.mode === 'V' || m.mode === 'VAC' || m.mode === 'R' || m.mode === 'AC')); }
  function demoMeasure(t) { var ms = t.measure || [], pick = t.demo ? ms.filter(function (m) { return m.id === t.demo; })[0] : null; return pick && demoAble(pick) ? pick : ms.filter(demoAble)[0] || null; }
  function demoStart(t) {
    if (demo || current.exam || current.live || !ed) return;
    var m = demoMeasure(t); if (!m) return;
    if (viewMode !== 'bench') setView('bench', true);
    var lockedIds = t.start.parts.map(function (p) { return p.id; });
    var saved = { layout: E.clone(ed.layout), probes: { a: core.probes.a, b: core.probes.b }, scope: { tip: core.scopeProbes.tip, gnd: core.scopeProbes.gnd }, meter: E.clone(meter), tries: current.tries, hints: current.hints, draft: JSON.stringify(S.drafts[t.id] || null), tb: $('#tb').value };
    var soll = sollOf(t, null)[m.id], isScope = m.mode === 'AC', pa = isScope ? 'tip' : 'a', pb = isScope ? 'gnd' : 'b';
    var modeLbl = { V: 'V⎓ (Gleichspannung)', VAC: 'V~ (Wechselspannung, ' + (m.meterType || 'TRMS').toUpperCase() + ')', R: 'Ω (Widerstand, spannungsfrei)' }[m.mode];
    var setTxt = m.set ? Object.keys(m.set).filter(function (k) { return k[0] !== '@'; }).map(function (k) { return k + ' ' + (m.set[k].closed ? 'zu' : 'offen'); }).join(', ') : '';
    var steps = [];
    steps.push({ text: 'Wir messen: <b>' + esc(m.ask) + '</b>.' + (setTxt ? ' Zuerst die Schalter stellen: ' + esc(setTxt) + '.' : ''), run: function () {
      if (m.set) { Object.keys(m.set).forEach(function (k) { if (k[0] === '@') return; var p = core.part(k); if (p) { p.props = p.props || {}; Object.keys(m.set[k]).forEach(function (q) { p.props[q] = m.set[k][q]; }); } }); core.redraw(); rebuild(); }
    } });
    if (!isScope) steps.push({ text: 'Messart <b>' + modeLbl + '</b> am Drehschalter wählen.', run: function () { setMeterMode(m.mode); } });
    if (!isScope && manualRange() && soll !== undefined) { var u = m.mode === 'R' ? 'Ω' : 'V', rg = suggestRange(u, soll * (E.UNIT_SCALE[m.unit] || 1)); steps.push({ text: 'Bereich <b>' + esc(E.rangeLabel(rg, u)) + '</b> wählen – der kleinste, in den der Wert passt.', run: function () { setMeterRange(rg); } }); }
    steps.push({ text: (isScope ? 'Gelben <b>Tastkopf CH1</b>' : 'Rote Spitze <b>(+)</b>') + ' an <b>' + esc(m.a) + '</b> ziehen.', move: pa, pin: m.a, dur: 1.6 });
    if (m.b || !isScope) steps.push({ text: (isScope ? 'Schwarzen <b>Erdungsclip</b>' : 'Schwarze Spitze <b>(COM)</b>') + ' an <b>' + esc(m.b || 'Masse') + '</b> ziehen.', move: pb, pin: m.b || null, dur: 1.6 });
    if (isScope) steps.push({ text: 'Passende Bildbreite wählen und <b>RUN</b> drücken – das Oszilloskop zeichnet die Kurve.', run: function () { $('#tb').value = String(suggestTb(ed.layout)); scope(); } });
    steps.push({ text: 'Ablesen.', run: function () { tick(0); var txt = isScope ? $('#scopeInfo').textContent : $('#lcd').textContent + ($('#mmWarn').textContent ? ' – ' + $('#mmWarn').textContent : ''); demo.read = txt; }, after: function () { return 'Anzeige: <b class="mono">' + esc(demo.read) + '</b>'; } });
    var rw = t.rechenweg && t.rechenweg[m.id];
    if (Array.isArray(rw)) rw.forEach(function (s, k) { steps.push({ text: '<b>Rechenweg ' + (k + 1) + ':</b> ' + (s.text || ''), rw: s }); });
    else steps.push({ text: '<b>Sollwert:</b> ' + fmtSoll(soll, m.unit) + ' (Toleranz ±' + Math.round((m.tol || 0.03) * 100) + ' %).', rw: rw ? null : { label: m.ask, value: soll, unit: m.unit }, html: typeof rw === 'string' ? rw : null });
    steps.push({ text: '<b>Jetzt du:</b> Miss selbst und trage deine Werte ins Protokoll ein – dein Aufbau ist unverändert.', end: true });
    demo = { t: t, m: m, steps: steps, i: -1, p: 0, raf: 0, saved: saved, lockedIds: lockedIds, read: '', hold: 0, done: false };
    var box = $('#demoBox'); box.innerHTML = '<div class="demo"><div class="demo-head"><b>Vorführung</b><span class="dim small">Schritt <span id="demoPos">0</span> / ' + steps.length + '</span><button class="btn small" id="demoStop">Abbrechen</button></div><div id="demoBar"></div><p class="demo-text" id="demoText"></p><div class="demo-rw" id="demoRw"></div></div>';
    var V = root.DQVisuals, pb = V && V.playbar ? V.playbar({ onPlay: function () { demoResume(); }, onPause: function () { demoPause(); }, onStep: function () { demoPause(); demoAdvance(true); }, onSpeed: function () {}, started: function () { return demo && demo.i >= 0; } }, { resume: true }) : null;
    if (pb) { $('#demoBar').appendChild(pb.el); demo.pb = pb; }
    $('#demoStop').onclick = function () { demoEnd(true); };
    log('demo_view', { id: t.id, mid: m.id });
    demoAdvance(false); demoResume();
  }
  function demoSpeed() { return demo && demo.pb ? demo.pb.speed : 0.5; }
  function demoProbeStart(which) { var d = Bench.DEV.meter, s = Bench.DEV.scope; return which === 'tip' || which === 'gnd' ? [s.x + (which === 'tip' ? 40 : 80), s.y + 150] : [d.x + (which === 'a' ? -54 : -2), d.y + 200]; }
  function demoPinXY(pid) { var s = pid.split('.'), p = core.part(s[0]); return p ? bench.pinPos(p, s[1]) : null; }
  /* naechsten Schritt beginnen; instant = Animation sofort zu Ende fuehren (Schritt-Taste) */
  function demoAdvance(instant) {
    if (!demo) return;
    var cur = demo.steps[demo.i];
    if (cur && cur.move && demo.p < 1) { core.dropProbe(cur.move, cur.pin); demo.p = 1; } // laufende Bewegung abschliessen
    if (demo.i >= demo.steps.length - 1) { demoEnd(false); return; }
    demo.i++; demo.p = 0; demo.hold = 0;
    var s = demo.steps[demo.i]; $('#demoPos').textContent = String(demo.i + 1); $('#demoText').innerHTML = s.text;
    if (s.run) { try { s.run(); } catch (e) { /* Vorführung bleibt stabil */ } if (s.after) $('#demoText').innerHTML = s.text + ' ' + s.after(); }
    if (s.rw) { var r = s.rw; $('#demoRw').innerHTML += '<div class="wk-row"><span class="wk-lbl">' + esc(r.label || '') + '</span>' + (r.expr ? '<span class="mono wk-expr">' + esc(r.expr) + '</span>' : '') + (r.value !== undefined ? '<span class="mono wk-val">= ' + fmtSoll(r.value, r.unit) + '</span>' : '') + '</div>'; }
    if (s.html) $('#demoRw').innerHTML += '<div class="rw">' + s.html + '</div>';
    if (s.move) { s.from = demoProbeStart(s.move); s.to = s.pin ? demoPinXY(s.pin) : null; if (!s.to) { core.dropProbe(s.move, null); demo.p = 1; } else if (instant) { core.dropProbe(s.move, s.pin); demo.p = 1; } else core.dragProbeTo(s.move, s.from); }
    if (s.end) { demo.done = true; demoPause(); setTimeout(function () { if (demo && demo.done) demoEnd(false); }, 4000 / demoSpeed()); }
  }
  function demoFrame(now) {
    if (!demo) return;
    var dt = Math.min(0.05, (now - demo.last) / 1000) * demoSpeed(); demo.last = now;
    var s = demo.steps[demo.i];
    if (s && s.move && demo.p < 1) {
      demo.p = Math.min(1, demo.p + dt / s.dur); var k = demo.p < 0.5 ? 2 * demo.p * demo.p : 1 - Math.pow(-2 * demo.p + 2, 2) / 2; // weich
      core.dragProbeTo(s.move, [s.from[0] + (s.to[0] - s.from[0]) * k, s.from[1] + (s.to[1] - s.from[1]) * k]);
      if (demo.p >= 1) core.dropProbe(s.move, s.pin);
    } else if (!s.end) { demo.hold += dt; if (demo.hold >= (s.rw ? 2.2 : 1.4)) { demoAdvance(false); } }
    if (demo && demo.raf) demo.raf = requestAnimationFrame(demoFrame);
  }
  function demoResume() { if (!demo || demo.raf) return; demo.last = performance.now(); demo.raf = requestAnimationFrame(demoFrame); if (demo.pb) demo.pb.setPlaying(true); }
  function demoPause() { if (!demo) return; if (demo.raf) cancelAnimationFrame(demo.raf); demo.raf = 0; if (demo.pb) demo.pb.setPlaying(false); }
  /* Ende oder Abbruch: Zustand vor der Vorführung wiederherstellen (Schaltung, Spitzen, Messgerät, Bildbreite, Versuche); zählt wie ein Tipp */
  function demoEnd(aborted) {
    if (!demo) return;
    var d = demo, t = d.t; demoPause(); demo = null;
    core.load(d.saved.layout, d.lockedIds, t.bench);
    core.probes.a = d.saved.probes.a; core.probes.b = d.saved.probes.b; core.scopeProbes.tip = d.saved.scope.tip; core.scopeProbes.gnd = d.saved.scope.gnd;
    meter = d.saved.meter; $('#tb').value = d.saved.tb; renderRangeRow(); $$('[data-mm]').forEach(function (b) { b.classList.toggle('on', b.dataset.mm === meter.mode); });
    rebuild(); core.redraw(); bench.scope = null; bench.render();
    if (JSON.stringify(S.drafts[t.id] || null) !== d.saved.draft) { S.drafts[t.id] = d.saved.draft === 'null' ? undefined : JSON.parse(d.saved.draft); if (!S.drafts[t.id]) delete S.drafts[t.id]; save(); }
    current.tries = d.saved.tries; current.hints = Math.max(d.saved.hints, 1);
    var box = $('#demoBox'); if (box) { box.innerHTML = '<button class="btn" id="btnDemo">▶ Vorführen</button> <span class="dim small">' + (aborted ? 'abgebrochen – ' : 'fertig – ') + 'dein Aufbau ist unverändert, die Vorführung zählt wie ein Tipp</span>'; $('#btnDemo').onclick = function () { demoStart(t); }; }
    log(aborted ? 'demo_abort' : 'demo_done', { id: t.id, mid: d.m.id });
  }

  /* ---------- Pruefen ---------- */
  function check() {
    var t = current.task; current.tries++;
    var ans = answers(), r = E.runTask(t, ed.layout, ans);
    var h = '<ul class="res">' + r.results.map(function (x) {
      var extra = '';
      if (!x.ok && x.info && typeof x.info.got === 'number') extra = ' <span class="dim">(ist: ' + E.fmt(Math.abs(x.info.got), '') + ')</span>';
      return '<li class="' + (x.ok ? 'ok' : 'bad') + '">' + (x.ok ? '✔' : '✘') + ' ' + esc(x.text) + extra + '</li>';
    }).join('') + '</ul>';
    var an = E.analyze(ed.layout); if (an.faults.length) h += diagnose(an.faults).map(function (d) { return '<div class="st err">' + esc(d.text) + '</div>'; }).join('');
    $('#results').innerHTML = h;
    if (current.exam) { // nur die sichtbaren Tests; Messwerte und verdeckte Tests prueft der Server bei der Abgabe
      $('#results').innerHTML = '<p class="dim small">Sichtbare Tests im Browser' + (t.protocol.length ? ' – die Messwerte prüft der Server bei der Abgabe' : '') + ':</p>' + h;
      return;
    }
    if (current.live) {
      log(r.pass ? 'live_done' : 'live_try', { id: t.id, tries: current.tries, hints: current.hints });
      if (LIVE) LIVE.attempt(r.pass, { layout: ed.layout, answers: ans });
      if (r.pass) modal('<h2 class="win">Gelöst!</h2><p>' + t.take + '</p><p class="dim" id="livePts">Punkte werden berechnet …</p>', [{ label: 'Rangliste', primary: true, action: function () { if (LIVE) LIVE.board(); } }]);
      return;
    }
    // Teilwertung: Messwerte einzeln (richtig / offen / aufgedeckt), Schaltungstests bleiben Pflicht
    var d = draftOf(t), measRes = r.results.filter(function (x) { return x.info && x.info.mid; });
    measRes.forEach(function (x) {
      var s = d.meas[x.info.mid] = d.meas[x.info.mid] || { tries: 0 };
      if (s.revealed) return;
      if (x.ok) s.ok = true; else { s.ok = false; if (!x.info.empty) s.tries = (s.tries || 0) + 1; }
    });
    var testsOk = r.results.filter(function (x) { return !(x.info && x.info.mid); }).every(function (x) { return x.ok; });
    var ms = measState(t, d), pass = testsOk && ms.done;
    if (!pass) d.fails = (d.fails || 0) + 1;
    save();
    $('#results').innerHTML = '<ul class="res">' + r.results.map(function (x) {
      var mid = x.info && x.info.mid, s = mid ? d.meas[mid] : null, extra = '';
      if (s && s.revealed) return '<li class="rv">⟳ ' + esc(x.text.split(':')[0]) + ': aufgedeckt</li>';
      if (!x.ok && x.info && typeof x.info.got === 'number') extra = ' <span class="dim">(ist: ' + E.fmt(Math.abs(x.info.got), '') + ')</span>';
      return '<li class="' + (x.ok ? 'ok' : 'bad') + '">' + (x.ok ? '✔' : '✘') + ' ' + esc(x.text) + extra + '</li>';
    }).join('') + '</ul>' + (an.faults.length ? diagnose(an.faults).map(function (dg) { return '<div class="st err">' + esc(dg.text) + '</div>'; }).join('') : '') +
      (!pass && ms.n && !ms.done ? '<p class="dim small">' + ms.ok + ' von ' + ms.n + ' Werten richtig – richtige Werte bleiben stehen, nur die offenen musst du noch korrigieren.</p>' : '');
    renderMeasState(t);
    log(pass ? 'task_done' : 'task_try', { id: t.id, tries: current.tries, hints: current.hints, dur: Math.round((Date.now() - current.started) / 1000), tags: t.tags, revealed: ms.revealed, sol: !!d.sol });
    if (pass) {
      var low = !!d.sol || ms.revealed > 0;
      var first = !S.done[t.id], st = low ? 1 : starsFor(current.tries, current.hints), di = S.doneInfo[t.id];
      S.done[t.id] = true;
      if (!di || st > (di.stars || 0)) S.doneInfo[t.id] = { at: di && di.at ? di.at : Date.now(), tries: current.tries, hints: current.hints, stars: st, revealed: ms.revealed || undefined, solution: d.sol || undefined };
      else if (di) { if (d.sol) di.solution = true; if (ms.revealed) di.revealed = Math.max(di.revealed || 0, ms.revealed); }
      save();
      var nx = nextOf(t.id), aw = null;
      Object.keys(DQ.awards || {}).forEach(function (k) { if (DQ.awards[k].boss === t.id) aw = DQ.awards[k]; });
      if (aw && first) log('award', { id: aw.id, tags: t.tags });
      modal('<h2 class="win">Geschafft!</h2><p class="stars-win" title="' + st + ' von 3 Sternen">' + starRow(st) + '</p><p>' + t.take + '</p>' + (first ? '' : '<p class="dim">(bereits gelöst)</p>') +
        (aw ? '<div class="award-note">' + medal(aw, 64) + '<p><b>' + esc(aw.title) + '</b><br>Du hast die ' + esc(DQ.stages[aw.id]) + ' abgeschlossen. Dein ' + esc(aw.kind) + ' kannst du anzeigen und drucken.</p></div>' : ''),
        [{ label: 'Zur Karte', action: function () { renderMap(); show('map'); } }]
          .concat(aw ? [{ label: aw.kind + ' anzeigen', primary: !nx, action: function () { openAward(aw.id); } }] : [])
          .concat(nx ? [{ label: 'Weiter', primary: true, action: function () { openItem(nx); } }] : []));
    }
  }

  /* ================= Theorie ================= */
  function openTheory(th) {
    show('theory'); current.theory = th; current.started = Date.now(); syncHash('theory');
    var V = root.DQVisuals, vis = V ? V.listOf(th.visual) : []; // Bild/Animation (visual) an {{visual}} bzw. nach dem ersten Absatz
    var h = '<div class="theory"><div class="crumb"><button class="btn small back" data-back title="Zurück zur Laborkarte">← Karte</button>Kapitel ' + th.ch + ' · Theorie ' + th.id.slice(1) + '</div><div class="th-head"><h2>' + esc(th.title) + '</h2>' +
      (speech.ok() ? '<button class="btn small" id="thRead" title="Lektion vorlesen (Stimme des Systems, offline)">🔊 Vorlesen</button>' : '') + '</div>' +
      '<article class="lesson">' + (V ? V.lessonHtml(th.lesson, vis) : th.lesson) + '</article>' +
      (th.merksatz ? '<aside class="merksatz"><h3>Das Wichtigste in Kürze</h3><p>' + esc(th.merksatz) + '</p></aside>' : '') +
      '<button class="btn primary" id="toQuiz">Verstanden – zum Check</button><div id="quiz"></div></div>';
    $('#scr-theory').innerHTML = h;
    if ($('#thRead')) $('#thRead').onclick = function () { speech.toggle($('#scr-theory .lesson'), th.merksatz, $('#thRead')); };
    current.visuals = V && vis.length ? V.mountAll($('#scr-theory .lesson'), vis) : []; // Instanzen (fuer Tests: DigitalQuest.visuals)
    var bkT = $('#scr-theory [data-back]'); if (bkT) bkT.onclick = goMap;
    $('#toQuiz').onclick = function () { this.hidden = true; renderQuiz(th); };
    log('theory_open', { id: th.id });
  }
  /* Vorlesen mit der Sprachausgabe des Browsers (Web Speech API, offline, deutsche Systemstimme); zweiter Klick stoppt,
   * Verlassen der Lektion stoppt (show). Ohne API kein Knopf. */
  var speech = {
    ok: function () { return !!(root.speechSynthesis && root.SpeechSynthesisUtterance); },
    active: false, btn: null,
    text: function (el, merk) {
      var c = el.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('.lesson-visual, svg, table, .formula, script, style'), function (x) { x.remove(); });
      return (c.textContent || '').replace(/s+/g, ' ').trim() + (merk ? ' Das Wichtigste in Kürze: ' + merk : '');
    },
    stop: function () { if (!this.ok()) return; try { root.speechSynthesis.cancel(); } catch (e) { /* egal */ } this.active = false; if (this.btn) { this.btn.textContent = '🔊 Vorlesen'; this.btn.classList.remove('on'); } },
    toggle: function (el, merk, btn) {
      if (!this.ok()) return;
      if (this.active) { this.stop(); return; }
      var self = this, u = new root.SpeechSynthesisUtterance(this.text(el, merk).slice(0, 8000)); u.lang = 'de-CH'; u.rate = 1;
      var voices = root.speechSynthesis.getVoices ? root.speechSynthesis.getVoices() : [], v = voices.filter(function (x) { return /^de/.test(x.lang); })[0]; if (v) u.voice = v;
      u.onend = u.onerror = function () { self.active = false; if (self.btn) { self.btn.textContent = '🔊 Vorlesen'; self.btn.classList.remove('on'); } };
      this.active = true; this.btn = btn; if (btn) { btn.textContent = '⏹ Stopp'; btn.classList.add('on'); }
      try { root.speechSynthesis.cancel(); root.speechSynthesis.speak(u); } catch (e) { this.stop(); }
      log('theory_read', { id: current.theory && current.theory.id });
    }
  };
  function renderQuiz(th) {
    var h = '<h3>Check – ' + Math.round(th.pass * 100) + ' % zum Bestehen</h3>';
    th.questions.forEach(function (q, i) {
      h += '<fieldset class="q" data-q="' + i + '"><legend>' + (i + 1) + '. ' + q.q + '</legend>' +
        q.options.map(function (o, j) { return '<label><input type="radio" name="q' + i + '" value="' + j + '"> ' + o + '</label>'; }).join('') + '<div class="expl"></div></fieldset>';
    });
    h += '<button class="btn primary" id="evalQuiz">Auswerten</button><div id="quizRes"></div>';
    $('#quiz').innerHTML = h;
    $('#evalQuiz').onclick = function () {
      var right = 0;
      th.questions.forEach(function (q, i) {
        var sel = $('input[name="q' + i + '"]:checked'), fs = $('[data-q="' + i + '"]'), ok = sel && +sel.value === q.correct;
        if (ok) right++;
        fs.className = 'q ' + (ok ? 'ok' : 'bad'); $('.expl', fs).innerHTML = (ok ? '✔ ' : '✘ ') + (q.explain || '');
      });
      var score = right / th.questions.length, pass = score >= th.pass - 1e-9;
      S.theory[th.id] = { best: Math.max(score, (S.theory[th.id] || {}).best || 0) };
      log('theory_check', { id: th.id, score: score, pass: pass, dur: Math.round((Date.now() - current.started) / 1000), tags: th.tags });
      if (pass) { S.done[th.id] = true; var ts = score >= 1 - 1e-9 ? 3 : 2, td = S.doneInfo[th.id]; if (!td || ts > (td.stars || 0)) S.doneInfo[th.id] = { at: td && td.at ? td.at : Date.now(), tries: 1, hints: 0, stars: ts }; }
      save();
      var nx = nextOf(th.id);
      $('#quizRes').innerHTML = '<div class="st ' + (pass ? 'ok' : 'err') + '">' + right + ' von ' + th.questions.length + ' richtig – ' + (pass ? 'bestanden!' : 'noch nicht bestanden. Lies die Erklärungen und versuche es erneut.') + '</div>' +
        (pass && nx ? '<button class="btn primary" id="thNext">Weiter</button>' : '<button class="btn" id="thRetry">Nochmals</button>');
      if ($('#thNext')) $('#thNext').onclick = function () { openItem(nx); };
      if ($('#thRetry')) $('#thRetry').onclick = function () { openTheory(th); };
    };
  }

  /* ================= Werkbank-Tutorial =================
   * Eigener Screen mit einer echten Mini-Werkbank (gleicher Kern, Renderer und Engine wie in den Aufgaben, measureUX 'drag'):
   * fester Uebungsaufbau (Batterie–Widerstand, Generator–Widerstand), Schritte haken sich ab, sobald sie ausgefuehrt sind. */
  var tut = null;
  var TUT_LAYOUT = { parts: [{ id: 'B1', type: 'battery', value: 9, x: 160, y: 200, rot: 0, bench: { x: 230, y: 250, rot: 0 } }, { id: 'R1', type: 'resistor', value: 1000, x: 420, y: 200, rot: 90, bench: { x: 560, y: 250, rot: 90 } },
      { id: 'G1', type: 'acsource', value: 5, props: { freq: 50, shape: 'sine', offset: 0 }, x: 160, y: 440, rot: 0, bench: { x: 230, y: 580, rot: 0 } }, { id: 'R2', type: 'resistor', value: 1000, x: 420, y: 440, rot: 90, bench: { x: 560, y: 580, rot: 90 } }],
    wires: [W('B1.p', 'R1.a'), W('R1.b', 'B1.n'), W('G1.p', 'R2.a'), W('R2.b', 'G1.n')] };
  var TUT_STEPS = [
    ['probeA', 'Rote Messspitze (+) greifen und auf <b>R1.a</b> (oberer Anschluss des Widerstands an der Batterie) ziehen. Loslassen daneben legt sie zurück vor das Gerät.'],
    ['probeB', 'Schwarze Messspitze (COM) auf <b>R1.b</b> ziehen. Klick auf eine Buchse setzt keine Spitze – er zieht eine Leitung.'],
    ['mode', 'Am Drehschalter <b>V⎓</b> wählen. Der Schalter stellt die <b>Messart</b> ein (V⎓, V~, A⎓, Ω); die Tastenreihe darunter den <b>Messbereich</b>.'],
    ['ol', 'Bereich <b>2V</b> antippen: Das Gerät zeigt <b>OL</b> (overload) – 9 V passen nicht in einen Bereich bis 2 V. Kein Fehler im Aufbau, nur der Bereich ist zu klein.'],
    ['read', 'Bereich <b>20V</b> wählen und ablesen: 9,0x V. Der kleinste Bereich, in den der Wert passt, zeigt die meisten Stellen; AUTO wählt selbst.'],
    ['tip', 'Jetzt das Oszilloskop – ein <b>eigenes Kabelsystem</b>: gelben <b>Tastkopf</b> (CH1) auf <b>R2.a</b> ziehen, schwarzen <b>Erdungsclip</b> auf <b>R2.b</b>. Die Multimeter-Spitzen bleiben, wo sie sind.'],
    ['run', '<b>RUN</b> am Oszilloskop drücken: der Sinus des Generators erscheint (Bildbreite 40 ms). Ändere die Bildbreite unten und drücke RUN erneut.']
  ];
  function renderTutorial() {
    show('tutorial');
    var el = $('#scr-tutorial');
    el.innerHTML = '<div class="tutorial"><div class="tut-text"><div class="crumb">Werkbank · Bedienung der Messgeräte</div><h2>Werkbank-Tutorial</h2>' +
      '<p>In den Messtechnik-Aufgaben (Kapitel 16) bedienst du die Geräte wie im Labor: Messspitzen <b>ziehen</b>, Messart <b>und</b> Messbereich wählen, den Tastkopf des Oszilloskops selbst anschliessen. Rechts steht ein Übungsaufbau – probiere jeden Schritt direkt aus, die Liste hakt mit.</p>' +
      '<ol class="tut-steps">' + TUT_STEPS.map(function (s) { return '<li data-step="' + s[0] + '"><span class="tut-chk"></span><span>' + s[1] + '</span></li>'; }).join('') + '</ol>' +
      '<h3>Gut zu wissen</h3><ul class="tut-notes"><li><b>OL</b> heisst nur: Bereich zu klein. Grösseren Bereich wählen, nicht am Aufbau suchen.</li>' +
      '<li><b>Zwei Kabelsysteme:</b> rot/schwarz gehören zum Multimeter, gelb/schwarz (Clip) zum Oszilloskop. Beide können gleichzeitig an verschiedenen Stellen hängen.</li>' +
      '<li><b>A⎓</b> misst in Reihe: Leitung lösen, Spitzen in die Lücke. Parallel zu einer Quelle brennt die Sicherung durch (Knopf „Sicherung ersetzen“).</li>' +
      '<li><b>Ω</b> nur an der spannungsfreien Schaltung. <b>OFF</b> lässt die Spitzen stecken.</li>' +
      '<li>Klick auf eine Buchse verbindet Leitungen; Bauteile ziehen, <kbd>R</kbd> dreht.</li></ul>' +
      '<div class="tut-actions"><button class="btn" id="tutReset">Übungsaufbau zurücksetzen</button><button class="btn primary" id="tutMap">Zur Karte</button></div></div>' +
      '<div class="tut-bench"><svg id="tbench" tabindex="0" aria-label="Übungs-Werkbank"></svg>' +
      '<div class="tut-panel"><span class="lcd small" id="tutLcd">OFF</span><span id="tutSub" class="dim small"></span><span class="tut-probes" id="tutProbes"></span>' +
      '<label class="fld"><span>Bildbreite Oszilloskop</span><select id="tutTb"><option value="0.01">10 ms</option><option value="0.04" selected>40 ms</option><option value="0.2">200 ms</option></select></label>' +
      '<button class="btn small" id="tutScopeBig" title="Oszilloskop gross anzeigen">⤢ Oszilloskop gross</button>' +
      '<button class="btn small" id="tutFuse" hidden>Sicherung ersetzen</button><p id="tutWarn" class="small"></p><p id="tutScope" class="small dim"></p></div></div></div>';
    tutStart();
    $('#tutReset').onclick = function () { tutStop(); tutStart(); };
    $('#tutMap').onclick = function () { renderMap(); show('map'); };
    $('#tutTb').onchange = function () { if (tut && tut.bench.scope) tutScope(); };
    $('#tutScopeBig').onclick = function () { scopeBig(tut && tut.lastScope); };
    $('#tutFuse').onclick = function () { if (tut) { tut.state.fuse = false; tutTick(0); } };
    log('tutorial_open', {});
  }
  function tutStart() {
    var svg = $('#tbench'), core = new Circuit({
      onChange: function () { if (tut) { tut.net = null; try { tut.net = E.buildNetlist(core.layout); } catch (e) { /* offen */ } tut.m.acKey = null; tutTick(0); } },
      onProbe: function (pin, which) { if (!tut) return; tut.m[which] = pin || null; if (tut.m.a === 'R1.a') tutDone('probeA'); if (tut.m.b === 'R1.b') tutDone('probeB'); tutTick(0); },
      onScopeProbe: function () { if (!tut) return; tut.bench.scope = null; if (core.scopeProbes.tip === 'R2.a' && core.scopeProbes.gnd === 'R2.b') tutDone('tip'); tutTick(0); },
      onMessage: function () {}
    });
    var bench = new Bench(svg, { core: core, onDial: function (mode) { if (!tut) return; if (mode !== tut.m.mode) tut.m.range = 'AUTO'; tut.m.mode = mode; if (mode === 'V') tutDone('mode'); tutTick(0); },
      onRange: function (r) { if (!tut) return; tut.m.range = r === 'AUTO' ? 'AUTO' : +r; tutTick(0); }, onScope: tutScope });
    core.space = 'bench'; bench.dragUX = true;
    core.load(TUT_LAYOUT, TUT_LAYOUT.parts.map(function (p) { return p.id; }));
    tut = { core: core, bench: bench, m: { mode: 'OFF', a: null, b: null, range: 'AUTO' }, state: E.newState(), net: null, done: {}, raf: 0, last: 0 };
    try { tut.net = E.buildNetlist(core.layout); } catch (e) { /* offen */ }
    bench.fit(); tutTick(0);
    tut.last = performance.now();
    var loop = function (now) { if (!tut || current.screen !== 'tutorial') { if (tut) tut.raf = 0; return; } var dt = Math.min(0.05, (now - tut.last) / 1000); tut.last = now; tutTick(dt); tut.raf = requestAnimationFrame(loop); };
    tut.raf = requestAnimationFrame(loop);
  }
  function tutStop() { if (tut && tut.raf) cancelAnimationFrame(tut.raf); tut = null; }
  function tutDone(step) { if (!tut || tut.done[step]) return; tut.done[step] = true; var li = $('#scr-tutorial [data-step="' + step + '"]'); if (li) li.classList.add('done'); }
  function tutTick(dt) {
    if (!tut) return;
    var t = tut, m = t.m, mn = null, r = null;
    if (t.net) {
      var a = t.net.pinNode[m.a], b = t.net.pinNode[m.b]; if (a !== undefined && b !== undefined) mn = { a: a, b: b };
      var mm = m.mode === 'VAC' ? 'V' : m.mode, mopt = mn && (mm === 'V' || mm === 'A') ? { mode: mm, a: mn.a, b: mn.b } : null;
      r = E.step(t.net, t.state, { dt: dt > 0 ? dt : null, meter: mopt });
      t.bench.setSim({ res: r, pinNode: t.net.pinNode });
    }
    var rg = m.range !== 'AUTO' ? m.range : undefined, rd = meterReading(m, t.core.layout, t.net, r, t.state, mn, rg, meterType());
    var u = m.mode === 'A' ? 'A' : m.mode === 'R' ? 'Ω' : 'V';
    var ranges = m.mode === 'OFF' ? null : [{ label: 'AUTO', value: 'AUTO', on: m.range === 'AUTO' }].concat(E.DMM_MANUAL[u].map(function (v) { return { label: E.rangeLabel(v, u), value: v, on: m.range === v }; }));
    t.bench.meter = { mode: m.mode, text: rd.text, fuse: t.state.fuse, sub: rd.sub, ranges: ranges, range: rd.range };
    if (m.mode === 'V' && m.a === 'R1.a' && m.b === 'R1.b') { if (rd.ol && m.range === 2) tutDone('ol'); if (m.range === 20 && /^9\./.test(rd.text)) tutDone('read'); }
    $('#tutLcd').textContent = rd.text; $('#tutSub').textContent = rd.sub + (rd.range ? ' · MAN ' + rd.range : m.mode === 'OFF' ? '' : ' · AUTO');
    $('#tutProbes').innerHTML = '<span class="pr red">+ ' + esc(m.a || '–') + '</span><span class="pr black">COM ' + esc(m.b || '–') + '</span>';
    $('#tutWarn').textContent = rd.warn; $('#tutFuse').hidden = !t.state.fuse;
    if (!t.bench._hidden()) t.bench.render();
  }
  function tutScope() {
    if (!tut) return;
    var sp = { a: tut.core.scopeProbes.tip, b: tut.core.scopeProbes.gnd }, T = +$('#tutTb').value;
    if (!sp.a) { tut.bench.scope = { pts: [], info: 'Tastkopf anschliessen' }; $('#tutScope').textContent = 'Oszilloskop: zuerst den gelben Tastkopf an einen Anschluss ziehen.'; tut.bench.render(); return; }
    try { var c = scopeCurve(tut.core.layout, sp, T, $('#tutTb').selectedOptions[0].textContent); tut.bench.scope = { pts: c.pts, info: c.info }; tut.lastScope = { c: c, T: T, layout: tut.core.layout, label: $('#tutTb').selectedOptions[0].textContent, sp: sp }; $('#tutScope').textContent = 'Oszilloskop – ' + c.text; if (sp.a === 'R2.a') tutDone('run'); }
    catch (e) { $('#tutScope').textContent = e.message; }
    tut.bench.render();
  }

  /* ================= Handbuch ================= */
  function renderManual(pageId) {
    var pages = (DQ.manual || []).concat([{ id: 'datenblaetter', title: 'Datenblätter', html: '' }]), p = pages.filter(function (x) { return x.id === pageId; })[0] || pages[0];
    $('#scr-manual').innerHTML = '<div class="manual"><nav>' + pages.map(function (x) { return '<button class="' + (x === p ? 'on' : '') + '" data-man="' + x.id + '">' + esc(x.title) + '</button>'; }).join('') +
      '</nav><article>' + (p ? '<h2>' + esc(p.title) + '</h2>' + (p.id === 'datenblaetter' ? manualSheets() : p.html) : '') + '</article></div>';
    $$('[data-man]').forEach(function (b) { b.onclick = function () { renderManual(b.dataset.man); }; });
  }

  /* Handbuch-Seite: alle Datenblaetter zum Nachschlagen (auch ohne Maus) */
  function manualSheets() {
    return '<p>Jedes Bauteil mit Funktion, Anschlüssen und Grenzwerten. In einer Aufgabe siehst du das Datenblatt auch, wenn du mit der Maus über ein Bauteil der Palette fährst, länger auf einem eingebauten Bauteil verweilst oder im Eigenschaften-Panel auf „ⓘ Datenblatt“ tippst.</p>' +
      Object.keys(E.PARTS).map(function (t) { return '<section class="ds-card" id="ds-' + t + '">' + sheetHtml(t, null) + '</section>'; }).join('');
  }

  /* ================= Einstellungen ================= */
  function renderSettings() {
    var pr = S.profile;
    $('#scr-settings').innerHTML = '<div class="settings"><h2>Einstellungen</h2>' +
      '<section><h3>Darstellung</h3><label class="fld"><span>Thema</span><select id="setTheme"><option value="dark">Dunkel</option><option value="light">Hell</option></select></label></section>' +
      '<section><h3>Profil (lokal)</h3><p class="dim small">Wird später für Klassen und die questübergreifende Auswertung (Bühler Quest) verwendet. Personen-ID: <code>' + esc(pr.id) + '</code></p>' +
      '<label class="fld"><span>Vorname</span><input id="pfV" value="' + esc(pr.vorname) + '"></label><label class="fld"><span>Nachname</span><input id="pfN" value="' + esc(pr.nachname) + '"></label>' +
      '<label class="fld"><span>Pseudonym</span><input id="pfP" value="' + esc(pr.pseudonym) + '"></label></section>' +
      (ACCT && ACCT.portal ? '<section><h3>Konto</h3><p class="small">' + (ACCT.user ? 'Angemeldet als <b>' + esc(ACCT.user.username) + '</b> – der Fortschritt wird im Konto gespeichert.' + (staff() ? ' Dozentenmodus aktiv: alle Stationen offen, Sprungliste auf der Karte, Freie Werkbank mit allen Bauteilen.' : '') : ACCT.offline ? 'Keine Verbindung – der Fortschritt bleibt in diesem Browser und wird später abgeglichen.' : 'Nicht angemeldet – der Fortschritt bleibt in diesem Browser.') + '</p><a class="btn" href="../">Zum Portal</a></section>' : '') +
      '<section><h3>Spielstand</h3><button class="btn" id="exp">Exportieren</button> <label class="btn">Importieren<input type="file" id="imp" accept=".json" hidden></label> <button class="btn danger" id="rst">Zurücksetzen</button></section></div>';
    $('#setTheme').value = S.settings.theme;
    $('#setTheme').onchange = function () { S.settings.theme = this.value; applyTheme(); save(); };
    [['#pfV', 'vorname'], ['#pfN', 'nachname'], ['#pfP', 'pseudonym']].forEach(function (x) { $(x[0]).oninput = function () { S.profile[x[1]] = this.value; save(); }; });
    $('#exp').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
      a.download = 'digitalquest_spielstand.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('#imp').onchange = function () {
      var f = this.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var d = JSON.parse(rd.result); if (!d.profile || !d.done) throw 0; S = normalize(d); save(); applyMode(); renderSettings(); modal('<p>Spielstand geladen.</p>'); } catch (e) { modal('<p>Die Datei ist kein gültiger Spielstand.</p>'); } };
      rd.readAsText(f);
    };
    $('#rst').onclick = function () {
      modal('<h2>Alles zurücksetzen?</h2><p>Fortschritt und Entwürfe werden gelöscht. Die Personen-ID bleibt.</p>', [{ label: 'Abbrechen' }, { label: 'Zurücksetzen', primary: true, action: function () { var id = S.profile; S = fresh(); S.profile = id; save(); applyMode(); renderSettings(); } }]);
    };
  }
  function applyTheme() { document.documentElement.dataset.theme = S.settings.theme; }
  function applyMode() { var t = $('#modeTag'); if (t) t.hidden = !staff(); }
  function starRow(n) { return [1, 2, 3].map(function (i) { return '<span class="star' + (i <= n ? ' on' : '') + '">★</span>'; }).join(''); }
  function toast(title, text) {
    var el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = '<b>' + esc(title) + '</b><span>' + esc(text) + '</span>'; document.body.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, 6000);
  }
  /* Kurzfassung fuer Leitstand und Klassenliste (der Server liest den ganzen Spielstand nur im Schuelerdetail) */
  function summary() {
    var ids = Object.keys(S.done).filter(function (id) { return S.done[id] && DQ.byId[id]; });
    var nT = ids.filter(function (id) { return DQ.byId[id].kind !== 'theory'; }).length, stars = 0;
    ids.forEach(function (id) { stars += (S.doneInfo[id] || {}).stars || 1; });
    var nx = ORDER.filter(function (id) { return !S.done[id]; })[0], it = nx && DQ.byId[nx];
    return { tasks: nT, theory: ids.length - nT, points: stars * 10, stars: stars, ch: it ? +it.ch || 0 : 15,
      totalTasks: DQ.tasks.length, totalTheory: DQ.theories.length, lastAt: Date.now(), done: ids,
      current: it ? 'Kapitel ' + it.ch + (it.kind === 'theory' ? ' · Theorie ' + nx.slice(1) : ' · Aufgabe ' + nx) : 'fertig' };
  }
  /* Nach Anmeldung, Abgleich oder neuen Vorgaben: sichtbare Ansicht auffrischen */
  function refreshView() {
    applyTheme(); applyMode();
    if (current.screen === 'map') renderMap(); else if (current.screen === 'settings') renderSettings();
  }

  /* ================= Start ================= */
  function init() {
    applyTheme(); applyMode();
    root.DQ_PREFS = { get: function (k) { return S.settings[k]; }, set: function (k, v) { S.settings[k] = v; save(); } }; // Tempo der Theorie-Animationen u. a.
    if (ACCT) ACCT.init({ state: function () { return S; }, fresh: fresh, modal: modal, esc: esc, toast: toast, summary: summary, refresh: refreshView,
      setState: function (n) { S = normalize(n); clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { indicator('Nicht gespeichert!', 'err'); } } });
    root.DQ_REPORT_CONTEXT = function () {
      var c = current.screen === 'task' && current.task ? (current.task.sandbox ? 'Freie Werkbank' : 'Aufgabe ' + current.task.id) + ' (' + (viewMode === 'bench' ? 'Werkbank' : 'Schaltplan') + ')' :
        current.screen === 'theory' && current.theory ? 'Theorie ' + current.theory.id : ({ map: 'Laborkarte', manual: 'Handbuch', settings: 'Einstellungen', award: 'Auszeichnung', tutorial: 'Werkbank-Tutorial' })[current.screen] || current.screen;
      return { quest: 'dq', context: c };
    };
    $$('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var g = b.dataset.go;
        if (EXAM && g !== 'manual') { EXAM.back(); return; }
        if (g === 'map') renderMap(); if (g === 'manual') renderManual(); if (g === 'settings') renderSettings(); if (g === 'tutorial') { renderTutorial(); return; }
        show(g);
      };
    });
    // Logo: im Portal zur Halle (eine Ebene hoeher), in der Einzeldatei zur Karte. Fusszeile: Impressum/Datenschutz (Einzeldatei: Live-Seite)
    var brand = $('#brand');
    if (root.DQ_PORTAL) brand.href = '../';
    else brand.onclick = function (ev) { ev.preventDefault(); if (EXAM) { EXAM.back(); return; } goMap(); };
    if (!root.DQ_PORTAL) { $('#footImp').href = 'https://digital-quest.steven-matzinger93.workers.dev/impressum.html'; $('#footDs').href = 'https://digital-quest.steven-matzinger93.workers.dev/datenschutz.html'; $$('.lab-foot a').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; }); }
    $('#btnScopeBig').onclick = function () { scopeBig(); };
    $$('#scopeCh [data-ch]').forEach(function (b) { b.onclick = function () { toggleChannel(+b.dataset.ch); }; });
    window.addEventListener('popstate', function () {
      if (root.DQCalc && root.DQCalc.isOpen) { root.DQCalc.close(); return; } // Zurueck schliesst zuerst den Rechner
      if ($('#scopeBig') && !$('#scopeBig').hidden) { $('#scopeBig .sb-x').click(); return; }
      if (EXAM || current.live) return;
      if (!routeHash()) goMap();
    });
    if (root.DQCalc) {
      root.DQCalc.onLog = log;
      var calcHist = function () { if (root.DQCalc.isOpen) { try { history.pushState({ dq: 'calc' }, '', location.href); } catch (e) { /* file:// ohne History */ } } };
      $('#btnCalc').onclick = function () { root.DQCalc.toggle(); calcHist(); };
      document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-calc]'); if (b) { ev.preventDefault(); root.DQCalc.open(); calcHist(); } });
      document.addEventListener('keydown', function (ev) { if (ev.ctrlKey && ev.altKey && (ev.key === 'r' || ev.key === 'R')) { ev.preventDefault(); root.DQCalc.toggle(); calcHist(); } });
    }
    $('#btnRot').onclick = function () { view().rotateSelected(); };
    $('#btnFit').onclick = function () { view().fit(); };
    window.addEventListener('resize', function () { if (ed && current.screen === 'task') view().fit(); if (tut && current.screen === 'tutorial') tut.bench.fit(); });
    $('#btnDel').onclick = function () { ed.removeSelected(); renderInspector(); };
    $('#btnView').onclick = function () { setView(viewMode === 'bench' ? 'schema' : 'bench'); log('view', { id: current.task && current.task.id, view: viewMode }); };
    setView(viewMode, true);
    $('#btnFlow').onclick = function () { S.settings.flow = !S.settings.flow; save(); if (ed) { ed.showFlow = bench.showFlow = S.settings.flow; core.redraw(); } this.classList.toggle('on', S.settings.flow); log('flow', { on: S.settings.flow }); };
    $('#btnReplay').onclick = function () { if (live.replay) closeReplay(); else openReplay(); };
    $('#rpSlider').oninput = function () { showStep(+this.value); };
    $('#rpPrev').onclick = function () { if (live.replay) showStep(live.replay.i - 1); };
    $('#rpNext').onclick = function () { if (live.replay) showStep(live.replay.i + 1); };
    $('#rpPlay').onclick = playReplay;
    $('#rpClose').onclick = function () { closeReplay(); };
    $$('[data-mt]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mt === meterType());
      b.onclick = function () { S.settings.meterType = b.dataset.mt; save(); $$('[data-mt]').forEach(function (x) { x.classList.toggle('on', x.dataset.mt === meterType()); }); if (ed) tick(0); };
    });
    $('#btnVolt').onclick = function () { ed.showVolt = bench.showVolt = !ed.showVolt; this.classList.toggle('on', ed.showVolt); core.redraw(); };
    $('#btnRepair').onclick = function () { live.state = E.newState(); rebuild(); status([{ cls: 'info', text: 'Defekte Bauteile ersetzt.' }]); };
    $('#btnReset').onclick = function () {
      modal('<h2>Aufgabe zurücksetzen?</h2><p>Deine Schaltung wird auf den Startzustand gesetzt.</p>', [{ label: 'Abbrechen' }, { label: 'Zurücksetzen', primary: true, action: function () { if (current.exam) { if (EXAM) EXAM.reset(current.exam.item); return; } delete S.drafts[current.task.id]; save(); openTask(current.task); } }]);
    };
    $('#btnFuse').onclick = function () { live.state.fuse = false; tick(0); };
    $$('[data-mm]').forEach(function (b) { b.onclick = function () { setMeterMode(b.dataset.mm); }; });
    $('#btnScope').onclick = scope;
    document.addEventListener('pointerdown', function (ev) { var el = $('#dsPop'); if (el && !el.hidden && !el.contains(ev.target) && !(ev.target.closest && ev.target.closest('#dsBtn'))) hideSheet(true); }, true);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && $('#dsPop') && !$('#dsPop').hidden) { hideSheet(true); return; }
      if (root.DQCalc && root.DQCalc.isOpen) return;
      if (current.screen !== 'task' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (live.replay) { if (ev.key === 'ArrowLeft') showStep(live.replay.i - 1); else if (ev.key === 'ArrowRight') showStep(live.replay.i + 1); else if (ev.key === 'Escape') closeReplay(); return; }
      ed && ed.key(ev); renderInspector();
    });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    renderMap(); show('map');
    // Adresse beim Laden (#/aufgabe/1.1 …) oeffnen – nicht bei Sonderstarts aus dem Portal
    var q0 = new URLSearchParams(location.search);
    if (location.hash && !q0.get('live') && !q0.get('exam') && !q0.get('frei') && !q0.get('werkstatt')) setTimeout(routeHash, 0);
    /* Einstieg aus dem Portal: ?frei=1 Freie Werkbank, ?werkstatt=1 Uebungswerkstatt, ?live=ID Live-Challenge */
    var qs = new URLSearchParams(location.search);
    LIVE = root.DQLive ? root.DQLive.create({ modal: modal, esc: esc, acct: ACCT, byId: DQ.byId,
      open: function (t, o) { openTask(t, o); }, closeModal: function () { $('#modal').classList.remove('open'); } }) : null;
    if (LIVE && !LIVE.id) LIVE = null;
    EXAM = root.DQExamUI && !LIVE ? root.DQExamUI.create({ modal: modal, esc: esc, show: show, open: function (t, o) { openTask(t, o); },
      layout: function () { return ed ? E.clone(ed.layout) : null; }, answers: answers }) : null;
    if (EXAM && !EXAM.id) EXAM = null;
    if (EXAM) { var bk = document.createElement('button'); bk.textContent = 'Zur Prüfung'; bk.className = 'exam-back'; bk.onclick = function () { EXAM.back(); }; $('.top nav').appendChild(bk); }
    if (LIVE || EXAM) { /* Einstieg uebernimmt die Challenge bzw. die Pruefung */ }
    else if (qs.get('frei')) openItem('sandbox');
    else if (qs.get('werkstatt')) { var w = $('#werkstatt'); if (w) w.scrollIntoView(); }
    if (ACCT) { var rd = ACCT.start(); if (LIVE) rd.then(function () { LIVE.start(); }); if (EXAM) rd.then(function () { EXAM.start(); }); }
  }

  window.DigitalQuest = { get state() { return S; }, get account() { return ACCT; }, get liveChallenge() { return LIVE; }, get examUI() { return EXAM; }, get tutorial() { return tut; }, summary: summary, openItem: openItem, get editor() { return ed; }, get bench() { return bench; }, get core() { return core; }, setView: setView, get view() { return viewMode; }, get live() { return live; }, engine: E, parseVal: parseVal, openAward: openAward, get visuals() { return current.visuals || []; }, get demo() { return demo; }, get lastScope() { return lastScope; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

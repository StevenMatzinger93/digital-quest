/* ===== Digital Quest Portal: Startseite, Login-Terminal, Konto, Administration =====
   Aufbau und Ablaeufe wie im SPS-Quest-Portal (docs/PLAN_PORTAL.md). Leitstand: portal_leitstand.js, Live: portal_live.js */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = t => t ? new Date(t).toLocaleString('de-CH', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '–';
const ago = t => { if(!t) return 'nie'; const m = Math.round((Date.now() - t) / 60000); if(m < 1) return 'gerade eben'; if(m < 60) return 'vor ' + m + ' min'; const h = Math.round(m / 60); if(h < 24) return 'vor ' + h + ' h'; const d = Math.round(h / 24); return 'vor ' + d + ' Tag' + (d === 1 ? '' : 'en'); };
const ROLE = { admin:'Administrator', teacher:'Dozent/in', student:'Schüler/in' };
const Q = 'dq', GAME_KEY = 'digitalquest_state_v1', SYNC_KEY = 'dquest_sync_dq', GAME = 'labor/';
// Dozentenfunktionen (Leitstand): Dozenten und Admins (ein Admin-Konto kann zugleich Dozent einer Klasse sein)
const canTeach = u => !!u && (u.role === 'teacher' || u.role === 'admin');

// Tore der Halle: das Labor (die Quest), die Uebungswerkstatt (nur messen) und die Freie Werkbank
const GATES = [
  { q:'labor', name:'LABOR', title:'DIGITAL <b>QUEST</b>', machine:'15 Kapitel · bauen, messen, verstehen', href: GAME,
    svg:'<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 78V30h28M72 30h28v48H20" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" values="0;-22" dur="1.4s" repeatCount="indefinite"/></path><path d="M12 50h16M15 58h10" stroke-width="3.2"/><circle cx="60" cy="30" r="11"/><path d="M53 23l14 14M67 23L53 37"/><circle cx="60" cy="30" r="17" opacity=".35"><animate attributeName="opacity" values=".1;.5;.1" dur="2.4s" repeatCount="indefinite"/></circle><rect x="88" y="46" width="24" height="10" rx="2" transform="rotate(90 100 51)"/></svg>' },
  { q:'werkstatt', name:'WERKSTATT', title:'ÜBUNGS<b>WERKSTATT</b>', machine:'Fertige Schaltungen – nur messen', href: GAME + '?werkstatt=1',
    svg:'<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="16" width="96" height="62" rx="7"/><path d="M12 47h96M36 16v62M60 16v62M84 16v62" opacity=".25" stroke-width="1.2"/><path d="M14 47c8-30 16-30 24 0s16 30 24 0 16-30 24 0 16 30 22 6" stroke-dasharray="130"><animate attributeName="stroke-dashoffset" values="130;0" dur="2.6s" repeatCount="indefinite"/></path><path d="M30 90h60M46 78v12M74 78v12"/></svg>' },
  { q:'frei', name:'WERKBANK', title:'FREIE <b>WERKBANK</b>', machine:'Frei bauen und messen, ohne Auftrag', href: GAME + '?frei=1',
    svg:'<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 84h108"/><rect x="14" y="58" width="40" height="18" rx="4"/><circle cx="24" cy="67" r="3.2"/><circle cx="44" cy="67" r="3.2"/><rect x="66" y="58" width="40" height="18" rx="4"/><circle cx="76" cy="67" r="3.2"/><circle cx="96" cy="67" r="3.2"/><path d="M44 64C52 30 68 30 76 64"><animate attributeName="d" values="M44 64C52 30 68 30 76 64;M44 64C52 40 68 40 76 64;M44 64C52 30 68 30 76 64" dur="4s" repeatCount="indefinite"/></path><path d="M84 20l14 14M98 20L84 34" opacity=".6"/><circle cx="91" cy="27" r="13" opacity=".6"/></svg>' }
];

/* ---------- API ---------- */
async function api(method, url, body){
  let r;
  try{
    r = await fetch('/api/' + url, { method, credentials:'same-origin', headers:{ 'content-type':'application/json', 'x-dquest':'1' }, body: body ? JSON.stringify(body) : undefined });
  }catch(e){ setNet(false); throw new Error('Keine Verbindung zum Leitstand. Bist du online?'); }
  setNet(true);
  let data = {}; try{ data = await r.json(); }catch(e){}
  if(!r.ok){ const err = new Error(data.error || ('Fehler ' + r.status)); err.status = r.status; err.data = data; throw err; }
  return data;
}
function setNet(on){ const l = $('netLed'); l.classList.toggle('on', on); l.classList.toggle('off', !on); l.title = on ? 'Verbunden mit dem Leitstand' : 'Keine Verbindung'; }

let USER = null;
let META = null;
// Aufgaben-Metadaten (data/dq.json): Kapitel, Aufgaben, Theorien, Uebungswerkstatt
function questMeta(){
  if(!META) META = fetch('data/' + Q + '.json').then(r => r.json()).catch(e => { META = null; throw e; });
  return META;
}

/* ---------- UI-Helfer ---------- */
let toastT = 0;
function toast(msg, err){ const t = $('toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 4200); }
function dialog(title, html, buttons, opts){
  opts = opts || {};
  return new Promise(res => {
    $('dlgTitle').textContent = title; $('dlgBody').innerHTML = html;
    const dlg = document.querySelector('.dlg'); dlg.classList.toggle('wide', !!opts.wide);
    const acts = $('dlgActions'); acts.innerHTML = '';
    const close = v => { $('dlgOverlay').hidden = true; document.removeEventListener('keydown', onKey); if(opts.onClose) opts.onClose(); res(v); };
    (buttons || [{ label:'OK', value:true, cls:'pri' }]).forEach(b => {
      const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.type = 'button';
      el.onclick = async () => { if(b.check){ const ok = await b.check(); if(!ok) return; } close(b.value); };
      acts.appendChild(el);
    });
    const onKey = e => { if(e.key === 'Escape' && !opts.modal) close(null); };
    document.addEventListener('keydown', onKey);
    $('dlgOverlay').hidden = false;
    if(opts.onOpen) opts.onOpen($('dlgBody'));
    setTimeout(() => { const f = $('dlgBody').querySelector('input,textarea,select') || acts.querySelector('.pri') || acts.lastChild; if(f) f.focus(); }, 30);
  });
}
const confirmDlg = (title, html, yes, danger) => dialog(title, html, [{ label:'Abbrechen', value:false }, { label: yes || 'OK', value:true, cls: danger ? 'dan' : 'pri' }]);
function credsHTML(list){ return '<div class="creds">' + list.map(c => '<div><span>' + esc(c.username) + '</span><b>' + esc(c.password) + '</b></div>').join('') + '</div>'; }
function printSlips(title, list){
  $('printArea').innerHTML = '<div class="slips">' + list.map(c => '<div class="slip"><h4>Digital Quest – ' + esc(title) + '</h4>Adresse: ' + esc(location.origin) + '<br>Benutzer: <b>' + esc(c.username) + '</b><br>Passwort: <b>' + esc(c.password) + '</b><br><small>Beim ersten Anmelden neues Passwort wählen.</small></div>').join('') + '</div>';
  window.print();
}

/* ---------- Kopfleiste ---------- */
const EXTRA_NAV = [];   // weitere Menuepunkte: { href, label, show(user) }
function renderTop(){
  $('loginBtn').hidden = !!USER; $('userMenu').hidden = !USER;
  if(USER){
    $('userName').textContent = USER.username; $('userRole').textContent = ROLE[USER.role] + (USER.class ? ' · ' + USER.class.name : '');
    document.querySelectorAll('#userDrop [data-role]').forEach(a => a.hidden = a.dataset.role !== USER.role && !(a.dataset.role === 'teacher' && canTeach(USER)));
  }
  const nav = [['#/', 'Halle']];
  if(USER && USER.role === 'student') nav.push(['#/live', 'Live-Challenge']);
  EXTRA_NAV.filter(n => n.before === 'leitstand' && n.show(USER)).forEach(n => nav.push([n.href, n.label]));
  if(canTeach(USER)) nav.push(['#/leitstand', 'Leitstand']);
  EXTRA_NAV.filter(n => !n.before && n.show(USER)).forEach(n => nav.push([n.href, n.label]));
  if(USER && USER.role === 'admin') nav.push(['#/admin', 'Administration']);
  if(USER) nav.push(['#/konto', 'Konto']);
  EXTRA_NAV.filter(n => n.before === 'ende' && n.show(USER)).forEach(n => nav.push([n.href, n.label]));
  const h = location.hash || '#/';
  $('topnav').innerHTML = nav.map(([href, l]) => '<a href="' + href + '"' + ((href === '#/' ? h === '#/' || h === '' : h.startsWith(href)) ? ' class="active"' : '') + '>' + l + '</a>').join('');
}
$('loginBtn').onclick = () => openTerminal('login');
$('userBtn').onclick = e => { e.stopPropagation(); const d = $('userDrop'); d.hidden = !d.hidden; $('userBtn').setAttribute('aria-expanded', String(!d.hidden)); };
document.addEventListener('click', e => { if(!e.target.closest('#userMenu')) $('userDrop').hidden = true; });
$('userDrop').addEventListener('click', e => { if(e.target.closest('a')) $('userDrop').hidden = true; });
$('logoutBtn').onclick = logout;

/* ---------- Login-Terminal ---------- */
let bootTimer = 0;
function openTerminal(tab){
  $('termOverlay').hidden = false; $('termMsg').textContent = ''; $('termMsg').className = 'term-msg';
  setTab(tab || 'login');
  const lines = ['DIGITAL-QUEST LEITSTAND  v1.0', 'VERBINDUNG ZUM LABOR ......... OK', 'MESSGERÄTE .................. KALIBRIERT', 'SICHERUNGEN .................. GEPRÜFT', '> Bitte identifizieren.'];
  const pre = $('termBoot'); pre.textContent = ''; clearTimeout(bootTimer);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ pre.textContent = lines.join('\n'); }
  else { let i = 0; const step = () => { if(i < lines.length){ pre.textContent += (i ? '\n' : '') + lines[i++]; bootTimer = setTimeout(step, 140); } }; step(); }
  setTimeout(() => (tab === 'code' ? $('rgCode') : $('lgUser')).focus(), 60);
}
function closeTerminal(){ $('termOverlay').hidden = true; if(location.hash.startsWith('#/login') || location.hash.startsWith('#/code')) location.hash = '#/'; }
function setTab(t){
  document.querySelectorAll('.term-tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
  $('loginForm').hidden = t !== 'login'; $('codeForm').hidden = t !== 'code'; $('termMsg').textContent = '';
}
document.querySelectorAll('.term-tab').forEach(b => b.onclick = () => { setTab(b.dataset.tab); (b.dataset.tab === 'code' ? $('rgCode') : $('lgUser')).focus(); });
$('termClose').onclick = closeTerminal;
$('termOverlay').addEventListener('keydown', e => { if(e.key === 'Escape') closeTerminal(); });
function termMsg(m, ok){ $('termMsg').textContent = m; $('termMsg').className = 'term-msg ' + (ok ? 'ok' : 'err'); }
$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button'); btn.disabled = true; termMsg('> Prüfe Zugang …', true);
  try{
    const pw = $('lgPw').value;
    const r = await api('POST', 'login', { username: $('lgUser').value.trim(), password: pw });
    USER = r.user; $('lgPw').value = '';
    termMsg('> ZUGANG GEWÄHRT. Willkommen, ' + USER.username + '.', true);
    setTimeout(async () => { $('termOverlay').hidden = true; await afterLogin(pw); }, 450);
  }catch(err){ termMsg('> ' + err.message); }
  btn.disabled = false;
};
let codeCheckT = 0;
$('rgCode').addEventListener('input', () => {
  const v = $('rgCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); $('rgCode').value = v;
  clearTimeout(codeCheckT); $('rgClass').textContent = '';
  if(v.length === 6) codeCheckT = setTimeout(async () => {
    try{ const r = await api('GET', 'class-info?code=' + v); $('rgClass').innerHTML = '✓ Klasse <b>' + esc(r.name) + '</b> bei ' + esc(r.teacher); }
    catch(err){ $('rgClass').textContent = '✗ ' + err.message; }
  }, 250);
});
$('codeForm').onsubmit = async e => {
  e.preventDefault();
  if($('rgPw').value !== $('rgPw2').value) return termMsg('> Die Passwörter stimmen nicht überein.');
  const btn = e.target.querySelector('button'); btn.disabled = true; termMsg('> Lege Konto an …', true);
  try{
    const r = await api('POST', 'register', { code: $('rgCode').value, username: $('rgUser').value.trim(), password: $('rgPw').value });
    USER = r.user; $('rgPw').value = $('rgPw2').value = '';
    termMsg('> KONTO ANGELEGT. Willkommen, ' + USER.username + '.', true);
    setTimeout(async () => { $('termOverlay').hidden = true; await afterLogin(null); }, 450);
  }catch(err){ termMsg('> ' + err.message); }
  btn.disabled = false;
};

async function afterLogin(pw){
  renderTop();
  if(USER.mustChange) await forcePasswordChange(pw);
  if(USER.role === 'student' && !USER.noticeAck) await showNotice();
  if(location.hash.startsWith('#/login') || location.hash.startsWith('#/code') || !location.hash || location.hash === '#/'){
    location.hash = USER.role === 'teacher' ? '#/leitstand' : USER.role === 'admin' ? '#/admin' : '#/';
  }
  route();
}
async function showNotice(){
  await dialog('Hinweis zu deinem Konto',
    '<p class="notice">Deine Dozentin oder dein Dozent sieht in Digital Quest deinen <b>Fortschritt</b> und deine <b>Schaltungen</b> (Lösungen, Entwürfe und Messwerte) – so kann sie/er dir gezielt helfen.</p>' +
    '<p>Verwende nur dein <b>Pseudonym</b>, keinen echten Namen. Dein Name auf dem Zertifikat bleibt nur in deinem Browser. Mehr dazu in der <a href="datenschutz.html" target="_blank">Datenschutzerklärung</a>.</p>',
    [{ label:'Verstanden', value:true, cls:'pri' }], { modal:true });
  try{ await api('POST', 'me/notice', {}); USER.noticeAck = true; }catch(e){}
}
async function forcePasswordChange(knownOld){
  const min = USER.role === 'student' ? 6 : 8;
  await dialog('Neues Passwort wählen',
    '<p>Dein Konto hat ein Startpasswort. Wähle jetzt ein eigenes (mindestens ' + min + ' Zeichen).</p>' +
    (knownOld ? '' : '<label for="fpOld">Bisheriges Passwort</label><input class="inp" id="fpOld" type="password" autocomplete="current-password">') +
    '<label for="fpNew">Neues Passwort</label><input class="inp" id="fpNew" type="password" autocomplete="new-password">' +
    '<label for="fpNew2">Wiederholen</label><input class="inp" id="fpNew2" type="password" autocomplete="new-password"><p class="small" id="fpMsg" style="color:#ff8080"></p>',
    [{ label:'Speichern', value:true, cls:'pri', check: async () => {
      const n = $('fpNew').value;
      if(n !== $('fpNew2').value){ $('fpMsg').textContent = 'Die Passwörter stimmen nicht überein.'; return false; }
      try{ await api('POST', 'me/password', { old: knownOld || $('fpOld').value, password: n }); USER.mustChange = false; toast('Passwort geändert.'); return true; }
      catch(e){ $('fpMsg').textContent = e.message; return false; }
    } }], { modal:true });
}
async function logout(){
  // Spielstand dieses Kontos zuerst hochladen, dann aus dem Browser entfernen (geteilte Schul-PCs)
  try{
    const sy = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null');
    if(sy && USER && String(sy.user).toLowerCase() === USER.username.toLowerCase()){
      const st = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
      if(sy.dirty && st) await api('PUT', 'progress/' + Q, { state: st, summary: sy.summary || {}, base: sy.base || 0, force: true });
      localStorage.removeItem(SYNC_KEY);
      // Einstellungen und der Name fuers Zertifikat bleiben auf dem Geraet, der Fortschritt nicht
      const keep = st ? { version: 1, settings: st.settings, profile: st.profile } : { version: 1 };
      if(keep.settings) delete keep.settings.teacher;
      localStorage.setItem(GAME_KEY, JSON.stringify(keep));
    }
  }catch(e){}
  try{ await api('POST', 'logout', {}); }catch(e){}
  USER = null; renderTop(); toast('Abgemeldet. Der Spielstand wurde aus diesem Browser entfernt und liegt sicher im Konto.');
  location.hash = '#/'; route();
}

/* ---------- Startseite: Halle mit drei Toren ---------- */
const CHIEF_LINES = [
  'Willkommen im Labor. Ich bin die Werkmeisterin.',
  'Hier wird nicht geraten, hier wird gebaut und gemessen: Stromkreis, Logik, Zähler, Transistor – bis zur ganzen Antriebsstation.',
  'Das Tor zum Labor steht offen. In der Übungswerkstatt liegen fertige Schaltungen zum Messen bereit.',
  'Zeig, was du kannst. Und denk daran: erst messen, dann behaupten.'
];
let ariaTimer = 0, ariaDone = false;
function typeAria(el){
  clearTimeout(ariaTimer);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false; try{ seen = sessionStorage.getItem('dq_chief') === '1'; }catch(e){}
  const full = CHIEF_LINES.join(' ');
  if(reduce || seen || ariaDone){ el.innerHTML = esc(full); return; }
  let i = 0;
  const step = () => {
    if(!document.body.contains(el)) return;
    i += 1; el.innerHTML = esc(full.slice(0, i)) + '<span class="cur"></span>';
    if(i < full.length) ariaTimer = setTimeout(step, full[i - 1] === '.' || full[i - 1] === '–' ? 320 : 24);
    else { ariaDone = true; try{ sessionStorage.setItem('dq_chief', '1'); }catch(e){} }
  };
  step();
}
function localDone(){
  try{ const s = JSON.parse(localStorage.getItem(GAME_KEY) || 'null'); return s && s.done ? s.done : null; }catch(e){ return null; }
}
const HOME_EXTRA = [];   // weitere Abschnitte der Startseite (z. B. Anleitungen): () => html
async function viewHome(){
  const v = $('view');
  v.innerHTML = '<section class="hero"><div class="hero-eyebrow">Lernspiel für Elektro- und Digitaltechnik</div><h1>DIGITAL <span>QUEST</span></h1>' +
    '<p class="hero-sub">Baue echte Schaltungen, sieh sie live arbeiten und miss wie im Labor — mit Multimeter, Oszilloskop und einer Werkmeisterin, die jeden Messwert sehen will.</p>' +
    '<div class="aria chief" role="note" aria-label="Funkspruch der Werkmeisterin"><div class="aria-eye" aria-hidden="true"></div><div><div class="aria-who">WERKMEISTERIN · LABOR</div><div class="aria-text" id="ariaText"></div></div><button class="aria-skip" id="ariaSkip">überspringen</button></div></section>' +
    (USER && USER.role === 'student' ? '<div class="quick"><a class="btn pri" href="#/live">⚡ Live-Challenge beitreten</a>' + QUICK.student.join('') + '</div>' : '') +
    (canTeach(USER) ? '<div class="quick"><a class="btn pri" href="#/leitstand">Leitstand öffnen</a><a class="btn" href="#/live/neu">⚡ Neue Live-Challenge</a>' + QUICK.teacher.join('') + '</div>' : '') +
    '<section class="gates g3" aria-label="Die Tore">' + GATES.map(gateHTML).join('') + '</section>' +
    '<section class="home-cards">' +
      '<div class="hc"><div class="k">FÜR LERNENDE</div><h3>Ohne Konto sofort loslegen</h3><p>Das Labor läuft direkt im Browser, auch offline. Mit einem Konto (Klassencode) wandert dein Fortschritt mit – auf jedes Gerät.</p></div>' +
      '<div class="hc"><div class="k">FÜR DOZENTEN</div><h3>Klassen im Leitstand</h3><p>Klassen anlegen, Konten erzeugen, Fortschritt und Schaltungen jedes Pseudonyms sehen, Vorgaben mit Frist machen, Live-Challenge am Beamer.</p></div>' +
      '<div class="hc"><div class="k">DATENSPARSAM</div><h3>Nur Pseudonyme</h3><p>Keine E-Mail, keine echten Namen. Konten bestehen aus Benutzername und Passwort – mehr nicht.</p></div>' +
    '</section>' + HOME_EXTRA.map(f => f()).join('');
  typeAria($('ariaText'));
  $('ariaSkip').onclick = () => { ariaDone = true; typeAria($('ariaText')); $('ariaSkip').hidden = true; };
  // Fortschritt an den Toren
  let done = null;
  if(USER && USER.role !== 'admin'){ try{ const srv = await api('GET', 'progress/' + Q); if(srv && srv.state) done = srv.state.done || {}; }catch(e){} }
  if(!done) done = localDone();
  let m = null; try{ m = await questMeta(); }catch(e){}
  if(!done || !m) return;
  const show = (q, n, total) => { const el = document.querySelector('.gate[data-q="' + q + '"] .gate-state'); if(el && n) el.innerHTML = '▸ ' + n + ' / ' + total + ' gelöst<div class="gate-bar"><i style="width:' + Math.min(100, Math.round(100 * n / total)) + '%"></i></div>'; };
  const ids = m.tasks.map(t => t.id).concat(m.theory.map(t => t.id));
  show('labor', ids.filter(id => done[id]).length, ids.length);
  show('werkstatt', m.workshop.tasks.filter(t => done[t.id]).length, m.workshop.tasks.length);
}
function gateHTML(g){
  return '<a class="gate open" data-q="' + g.q + '" href="' + g.href + '">' +
    '<div class="gate-frame"><div class="gate-inner"><div class="gate-scene" aria-hidden="true">' + g.svg + '</div></div>' +
    '<div class="door l"><div class="hz"></div></div><div class="door r"><div class="hz"></div></div><span class="gate-lamp"></span><span class="gate-sign">' + g.name + '</span></div>' +
    '<div class="gate-info"><div class="gate-title">' + g.title + '</div><div class="gate-machine">' + g.machine + '</div>' +
    '<div class="gate-state">▸ Tor offen · eintreten</div></div></a>';
}
const QUICK = { student: [], teacher: [] };

/* ---------- Konto ---------- */
function needLogin(){ if(!USER){ $('view').innerHTML = '<div class="console"><div class="panel empty">Bitte zuerst im Leitstand-Terminal anmelden.<br><br><button class="btn pri" id="nlBtn">Anmelden</button></div></div>'; $('nlBtn').onclick = () => openTerminal('login'); return true; } return false; }
const ACCOUNT_EXTRA = [];   // weitere Felder auf der Kontoseite: (user) => html, danach bind(view)
function viewAccount(){
  if(needLogin()) return;
  const v = $('view');
  v.innerHTML = '<div class="console"><div class="crumbs"><a href="#/">HALLE</a> / KONTO</div><h1>' + esc(USER.username) + '</h1><p class="lead">' + ROLE[USER.role] + (USER.class ? ' · Klasse ' + esc(USER.class.name) + ' (' + esc(USER.class.teacher) + ')' : '') + '</p>' +
    (USER.role === 'admin' && USER.secretAdmin ? '<div class="panel"><h2>Admin-Konto</h2><p class="muted">Benutzername und Passwort kommen aus den Worker-Secrets <code>ADMIN_USER</code> / <code>ADMIN_PASSWORD</code> und werden im Cloudflare-Dashboard geändert.</p></div>' :
    '<div class="panel"><h2>Passwort ändern</h2><form id="pwForm" class="row"><input class="inp" type="password" id="pwOld" placeholder="bisheriges Passwort" autocomplete="current-password" required>' +
    '<input class="inp" type="password" id="pwNew" placeholder="neues Passwort" autocomplete="new-password" required><input class="inp" type="password" id="pwNew2" placeholder="wiederholen" autocomplete="new-password" required><button class="btn pri">Speichern</button></form></div>') +
    ACCOUNT_EXTRA.map(x => x.html(USER)).join('') +
    (canTeach(USER) ? '<div class="panel"><h2>Im Labor</h2><p class="muted">Mit deinem Konto sind im Labor <b>alle Stationen offen</b>, auf der Karte gibt es eine Sprungliste zu jeder Aufgabe, und die Freie Werkbank hat alle Bauteile. Dein eigener Fortschritt wird wie bei Lernenden gespeichert.</p></div>' : '') +
    (USER.role === 'student' ? '<div class="panel"><h2>Was sieht meine Dozentin / mein Dozent?</h2><p class="muted">Fortschritt, Sterne und deine Schaltungen (Lösungen, Entwürfe, Messwerte) im Labor. Dein Name auf dem Zertifikat bleibt nur in deinem Browser.</p></div>' +
      '<div class="panel"><h2>Konto löschen</h2><p class="muted">Löscht dein Konto und den gespeicherten Spielstand endgültig.</p><button class="btn dan" id="delSelf">Konto löschen …</button></div>' : '') +
    '</div>';
  ACCOUNT_EXTRA.forEach(x => x.bind && x.bind(v));
  if($('pwForm')) $('pwForm').onsubmit = async e => {
    e.preventDefault();
    if($('pwNew').value !== $('pwNew2').value) return toast('Die Passwörter stimmen nicht überein.', true);
    try{ await api('POST', 'me/password', { old: $('pwOld').value, password: $('pwNew').value }); toast('Passwort geändert. Andere Geräte wurden abgemeldet.'); e.target.reset(); }
    catch(err){ toast(err.message, true); }
  };
  if($('delSelf')) $('delSelf').onclick = async () => {
    const ok = await dialog('Konto endgültig löschen?', '<p>Der Spielstand im Konto geht verloren. Zur Bestätigung dein Passwort eingeben:</p><input class="inp" type="password" id="delPw" autocomplete="current-password">' + DELETE_EXTRA.join(''),
      [{ label:'Abbrechen', value:false }, { label:'Endgültig löschen', value:true, cls:'dan' }]);
    if(!ok) return;
    try{ await api('DELETE', 'me', Object.assign({ password: $('delPw').value }, $('delCerts') ? { deleteCertificates: $('delCerts').checked } : {})); USER = null; renderTop(); toast('Konto gelöscht.'); location.hash = '#/'; }
    catch(err){ toast(err.message, true); }
  };
}
const DELETE_EXTRA = [];

/* ---------- Administration ---------- */
async function viewAdmin(){
  if(needLogin()) return;
  if(USER.role !== 'admin'){ location.hash = '#/'; return; }
  const v = $('view');
  v.innerHTML = '<div class="console"><div class="crumbs"><a href="#/">HALLE</a> / ADMINISTRATION</div><h1>Administration</h1><p class="lead">Dozentenkonten verwalten. Nur der Admin legt Dozenten an. <a href="#/leitstand">Eigene Klassen im Leitstand →</a>' + ADMIN_LINKS.join('') + '</p>' +
    '<div class="kpis" id="kpis"></div>' +
    '<div class="panel"><h2>Neuer Dozent</h2><form class="row" id="newT"><input class="inp" id="ntName" placeholder="Benutzername (Kürzel)" maxlength="24" required><span class="muted small">Startpasswort wird erzeugt und muss beim ersten Login geändert werden.</span><span class="grow"></span><button class="btn pri">Anlegen</button></form></div>' +
    '<div class="panel"><h2>Dozenten</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Benutzer</th><th class="num">Klassen</th><th class="num">Lernende</th><th>angelegt</th><th>letzter Login</th><th></th></tr></thead><tbody id="tList"><tr><td colspan="6" class="muted">Lade …</td></tr></tbody></table></div></div></div>';
  $('newT').onsubmit = async e => {
    e.preventDefault();
    try{ const x = await api('POST', 'admin/teachers', { username: $('ntName').value.trim() }); await dialog('Dozent angelegt', '<p class="notice">Das Startpasswort wird nur jetzt angezeigt.</p>' + credsHTML([x])); viewAdmin(); }
    catch(err){ toast(err.message, true); }
  };
  try{
    const [s, t] = await Promise.all([api('GET', 'admin/stats'), api('GET', 'admin/teachers')]);
    $('kpis').innerHTML = [['Dozenten', s.teachers], ['Klassen', s.classes], ['Lernende', s.students], ['Spielstände', s.progress]].map(([l, n]) => '<div class="kpi"><div class="v">' + n + '</div><div class="l">' + l + '</div></div>').join('');
    $('tList').innerHTML = t.teachers.length ? t.teachers.map(x => '<tr><td><b>' + esc(x.username) + '</b></td><td class="num">' + x.classes + '</td><td class="num">' + x.students + '</td><td class="small muted">' + fmtDate(x.created_at) + '</td><td class="small muted">' + ago(x.last_login) + '</td>' +
      '<td style="white-space:nowrap"><button class="btn sm" data-tr="' + x.id + '" data-n="' + esc(x.username) + '">Passwort</button> <button class="btn sm dan" data-td="' + x.id + '" data-n="' + esc(x.username) + '" data-c="' + x.classes + '">✕</button></td></tr>').join('')
      : '<tr><td colspan="6" class="empty">Noch keine Dozenten.</td></tr>';
    v.querySelectorAll('[data-tr]').forEach(b => b.onclick = async () => {
      if(!await confirmDlg('Passwort zurücksetzen?', 'Neues Startpasswort für <b>' + esc(b.dataset.n) + '</b> erzeugen?', 'Zurücksetzen')) return;
      try{ const x = await api('POST', 'admin/teachers/' + b.dataset.tr + '/reset', {}); await dialog('Neues Startpasswort', credsHTML([x])); }catch(err){ toast(err.message, true); }
    });
    v.querySelectorAll('[data-td]').forEach(b => b.onclick = async () => {
      const n = +b.dataset.c;
      if(!await confirmDlg('Dozent löschen?', '<b>' + esc(b.dataset.n) + '</b> wird gelöscht' + (n ? ' – <b>mit ' + n + ' Klasse(n) und allen Konten darin</b>' : '') + '. Das kann nicht rückgängig gemacht werden.', 'Endgültig löschen', true)) return;
      try{ await api('DELETE', 'admin/teachers/' + b.dataset.td, { withClasses: true }); viewAdmin(); }catch(err){ toast(err.message, true); }
    });
  }catch(err){ toast(err.message, true); }
}
const ADMIN_LINKS = [];

/* ---------- Router ---------- */
const EXTRA_ROUTES = [];   // weitere Ansichten (Leitstand, Live-Challenge …) hängen sich hier ein
window.DQP = { Q, GAME, canTeach, questMeta, api, esc, dialog, confirmDlg, toast, credsHTML, printSlips, needLogin, get user(){ return USER; }, routes: EXTRA_ROUTES, nav: EXTRA_NAV,
  home: HOME_EXTRA, quick: QUICK, account: ACCOUNT_EXTRA, deleteExtra: DELETE_EXTRA, adminLinks: ADMIN_LINKS, fmtDate, ago, openTerminal, reroute: () => route() };
async function route(){
  const h = location.hash || '#/';
  renderTop();
  $('termOverlay').hidden = !(h.startsWith('#/login') || h.startsWith('#/code')) || !!USER;
  if(h.startsWith('#/login') && !USER) openTerminal('login');
  if(h.startsWith('#/code') && !USER){ openTerminal('code'); const c = h.split('/')[2]; if(c){ $('rgCode').value = c; $('rgCode').dispatchEvent(new Event('input')); } }
  let m;
  for(const r of EXTRA_ROUTES){ if((m = h.match(r.re))){ await r.view(m); window.scrollTo(0, 0); return; } }
  if(h === '#/konto') viewAccount();
  else if(h === '#/admin') viewAdmin();
  else viewHome();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* Passwort ein-/ausblenden: Auge-Knopf hinter jedem Passwortfeld (Terminal, Passwort aendern, Konto loeschen). Standard verdeckt,
 * Zustand wird nicht gespeichert, das Feld behaelt den Fokus. Haengt sich per MutationObserver an alle spaeter gerenderten Felder. */
function addEyes(root){
  (root.querySelectorAll ? root.querySelectorAll('input[type="password"]:not([data-eye])') : []).forEach(inp => {
    inp.dataset.eye = '1';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pw-eye'; b.setAttribute('aria-label', 'Passwort anzeigen'); b.setAttribute('aria-pressed', 'false'); b.title = 'Passwort anzeigen'; b.textContent = '👁';
    b.addEventListener('mousedown', e => e.preventDefault()); // Fokus bleibt im Feld
    b.addEventListener('click', () => { const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen'); b.title = b.getAttribute('aria-label'); b.classList.toggle('on', show); inp.focus(); });
    inp.insertAdjacentElement('afterend', b);
  });
}
addEyes(document);
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if(n.nodeType === 1) addEyes(n); }))).observe(document.body, { childList:true, subtree:true });

/* ---------- Staub in der Halle ---------- */
(function dust(){
  const cv = $('dust'), ctx = cv.getContext('2d');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let W = 0, H = 0, P = [];
  const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; P = Array.from({ length: Math.min(90, Math.round(W * H / 16000)) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, vx: (Math.random() - .5) * .15, vy: -Math.random() * .25 - .04, a: Math.random() * .5 + .1 })); };
  resize(); addEventListener('resize', resize);
  const tick = () => {
    if(!document.hidden){
      ctx.clearRect(0, 0, W, H);
      for(const p of P){ p.x += p.vx; p.y += p.vy; if(p.y < -5){ p.y = H + 5; p.x = Math.random() * W; } if(p.x < -5) p.x = W + 5; if(p.x > W + 5) p.x = -5;
        ctx.globalAlpha = p.a; ctx.fillStyle = '#ffe9c4'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    }
    requestAnimationFrame(tick);
  };
  tick();
})();

/* ---------- Start ---------- */
// Die weiteren Portal-Dateien (portal_*.js) haengen sich beim Laden ein; gestartet wird danach (siehe Ende von portal_zz_start.js)
window.DQP.start = async function(){
  try{ const r = await api('GET', 'me'); USER = r.user; }catch(e){ USER = null; }
  await route();
  if(USER && USER.mustChange) await forcePasswordChange(null);
  if(USER && USER.role === 'student' && !USER.noticeAck) await showNotice();
};
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();

/* ===== Digital Quest Portal: Live-Challenge (Dozent: anlegen + Beamer, Lernende: beitreten) – wie im SPS-Quest-Portal ===== */
(function(){
'use strict';
const P = window.DQP, $ = id => document.getElementById(id), esc = P.esc;
// Aufgaben- und Störungsdaten (data/dq.json + data/dq_live.json: Musterschaltungen und Störungsszenarien)
let METAP = null, CUR = null;
function meta(){
  if(!METAP) METAP = Promise.all([P.questMeta(), fetch('data/' + P.Q + '_live.json').then(r => r.json())]).then(([a, b]) => ({ info:a, live:b })).catch(e => { METAP = null; throw e; });
  return METAP;
}
const fmt = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const MODE = { sprint:'Sprint', bug:'Störungsjagd' };
const allTasks = m => m.info.tasks.concat(m.info.workshop.tasks.map(t => Object.assign({ ch: m.info.workshop.id }, t)));
function taskLabel(m, id){ const t = m && allTasks(m).find(x => x.id === id); return t ? t.id + ': ' + t.title : id; }

/* ---------- Dozent: Übersicht (im Leitstand eingeblendet) ---------- */
async function livePanel(){
  const host = $('view').querySelector('.console'); if(!host || $('livePanel')) return;
  const el = document.createElement('div'); el.className = 'panel live-panel'; el.id = 'livePanel';
  el.innerHTML = '<h2>Live-Challenge <span class="tag">am Beamer · Sprint oder Störungsjagd</span></h2><div class="row"><p class="muted small grow" style="margin:0">Alle lösen dieselbe Aufgabe – oder jagen einen eingebauten Fehler in einer Schaltung. Beitritt mit 4-stelligem Code, Rangliste live am Beamer.</p><a class="btn pri" href="#/live/neu">Neue Live-Challenge</a></div><div id="liveList" class="small" style="margin-top:12px"></div>';
  host.insertBefore(el, host.querySelector('.panel'));
  try{
    const [r, m] = await Promise.all([P.api('GET', 'challenges'), meta()]);
    $('liveList').innerHTML = r.challenges.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Modus</th><th>Aufgabe</th><th>Stand</th><th class="num">gelöst</th><th>angelegt</th><th></th></tr></thead><tbody>' +
      r.challenges.slice(0, 6).map(c => '<tr><td class="num" style="text-align:left">' + esc(c.code) + '</td><td>' + MODE[c.mode] + '</td><td>' + esc(taskLabel(m, c.taskId)) + '</td><td>' + ({ lobby:'<span class="pill warn">wartet</span>', running:'<span class="pill ok">läuft</span>', ended:'<span class="pill">beendet</span>' })[c.state] + '</td><td class="num">' + c.solved + '/' + c.players + '</td><td class="muted">' + P.fmtDate(c.createdAt) + '</td><td><a class="btn sm" href="#/beamer/' + c.id + '">Beamer</a></td></tr>').join('') + '</tbody></table></div>' : '';
  }catch(e){}
}
const mo = new MutationObserver(() => { if(location.hash === '#/leitstand' && P.canTeach(P.user) && $('clsList') && !$('livePanel')) livePanel(); });
mo.observe($('view'), { childList:true });

/* ---------- Dozent: neue Challenge ---------- */
async function viewNew(){
  if(!P.canTeach(P.user)){ location.hash = P.user ? '#/' : '#/login'; return; }
  const v = $('view');
  const head = '<div class="crumbs"><a href="#/">HALLE</a> / <a href="#/leitstand">LEITSTAND</a> / LIVE-CHALLENGE</div><h1>Neue Live-Challenge</h1><p class="lead">Wähle Modus, Aufgabe und Zeit. Danach öffnet sich die Beamer-Ansicht mit dem Beitrittscode.</p>';
  v.innerHTML = '<div class="console">' + head + '<div class="panel muted">Lade …</div></div>';
  let m, cls;
  try{ [m, cls] = await Promise.all([meta(), P.api('GET', 'classes')]); }catch(err){ v.querySelector('.panel').textContent = err.message; return; }
  const chapters = m.info.chapters.concat([{ n: m.info.workshop.id, title: m.info.workshop.title, workshop: true }]);
  v.querySelector('.console').innerHTML = head +
    '<form id="lcForm"><div class="panel"><h2>1 · Modus</h2><div class="mode-pick">' +
      '<label class="mode-card"><input type="radio" name="mode" value="sprint" checked><b>⚡ Sprint</b><span>Alle bauen und messen dieselbe Aufgabe. Punkte nach Zeit, Fehlversuchen und Tipps.</span></label>' +
      '<label class="mode-card"><input type="radio" name="mode" value="bug"><b>🐞 Störungsjagd</b><span>Die Schaltung ist fertig aufgebaut – mit einem eingebauten Fehler. Wer findet und behebt ihn zuerst?</span></label></div></div>' +
    '<div class="panel"><h2>2 · Aufgabe</h2><div class="row"><select class="inp" id="lcCh">' + chapters.map(c => '<option value="' + c.n + '">' + (c.workshop ? '' : 'Kapitel ' + c.n + ' – ') + esc(c.title) + '</option>').join('') + '</select><select class="inp grow" id="lcTask"></select></div><p class="muted small" id="lcInfo" style="margin:8px 0 0"></p></div>' +
    '<div class="panel"><h2>3 · Zeit und Teilnehmende</h2><div class="row"><select class="inp" id="lcDur">' + [3, 5, 8, 10, 15, 20, 30].map(n => '<option value="' + n * 60 + '"' + (n === 10 ? ' selected' : '') + '>' + n + ' Minuten</option>').join('') + '</select>' +
      '<select class="inp" id="lcCls"><option value="">alle mit dem Code</option>' + cls.classes.map(c => '<option value="' + c.id + '">nur Klasse ' + esc(c.name) + '</option>').join('') + '</select><span class="grow"></span><button class="btn pri">Challenge anlegen ▸</button></div></div></form>';
  const mode = () => v.querySelector('input[name=mode]:checked').value;
  const fill = () => {
    const ch = $('lcCh').value;
    const opts = mode() === 'bug' ? m.live.bugs.filter(b => String(b.ch) === ch).map(b => '<option value="' + b.id + '">' + esc(b.title) + '</option>')
      : allTasks(m).filter(t => String(t.ch) === ch).map(t => '<option value="' + t.id + '">' + esc(t.id + ': ' + t.title) + '</option>');
    $('lcTask').innerHTML = opts.join('') || '<option value="">– in diesem Kapitel gibt es kein Störungsszenario –</option>';
    info();
  };
  const info = () => {
    if(mode() === 'bug'){ const b = m.live.bugs.find(x => x.id === $('lcTask').value); $('lcInfo').innerHTML = b ? '<b>Störungsmeldung am Beamer:</b> ' + esc(b.symptom) + ' <span class="muted">(Ursache, nur für dich: ' + esc(b.cause) + ')</span>' : ''; }
    else $('lcInfo').textContent = 'Tipp: Aufgaben, die die Klasse schon kennt, eignen sich gut für einen Sprint.';
  };
  v.querySelectorAll('input[name=mode]').forEach(r => r.onchange = fill);
  $('lcCh').onchange = fill; $('lcTask').onchange = info;
  fill();
  $('lcForm').onsubmit = async e => {
    e.preventDefault();
    const sel = $('lcTask').value; if(!sel) return P.toast('Bitte eine Aufgabe wählen.', true);
    const body = { mode: mode(), quest: P.Q, duration: +$('lcDur').value, classId: $('lcCls').value || null };
    if(body.mode === 'bug'){ const b = m.live.bugs.find(x => x.id === sel); body.bugId = b.id; body.taskId = b.task; body.title = b.title; }
    else { body.taskId = sel; body.title = (allTasks(m).find(t => t.id === sel) || {}).title; }
    try{ const r = await P.api('POST', 'challenges', body); location.hash = '#/beamer/' + r.id; }
    catch(err){ P.toast(err.message, true); }
  };
}

/* ---------- Dozent: Beamer-Ansicht ---------- */
let BT = 0, BTick = 0, BSTATE = null, OFFSET = 0, lastPodium = '', MINIS = [];
function dropMinis(){ MINIS.forEach(x => { try{ x.destroy(); }catch(e){} }); MINIS = []; }
function stopBeamer(){ clearInterval(BT); clearInterval(BTick); BT = BTick = 0; dropMinis(); document.body.classList.remove('beamer-mode'); }
window.addEventListener('hashchange', () => { if(!location.hash.startsWith('#/beamer/')) stopBeamer(); });
async function viewBeamer(id){
  if(!P.canTeach(P.user)){ location.hash = P.user ? '#/' : '#/login'; return; }
  stopBeamer();
  document.body.classList.add('beamer-mode');
  const v = $('view');
  v.innerHTML = '<div class="beamer" id="beamer"><div class="bm-top"><span class="bm-live"><i></i> LIVE-CHALLENGE</span><span class="bm-title" id="bmTitle"></span><span class="grow"></span>' +
    '<button class="btn sm" id="bmFull" title="Vollbild">⛶ Vollbild</button><a class="btn sm" href="#/leitstand">✕ Schliessen</a></div><div id="bmBody" class="bm-body"><div class="muted">Lade …</div></div></div>';
  $('bmFull').onclick = () => { const el = document.documentElement; if(document.fullscreenElement) document.exitFullscreen(); else if(el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
  lastPodium = ''; CUR = null;
  const refresh = async () => {
    try{ BSTATE = await P.api('GET', 'challenges/' + id); OFFSET = BSTATE.challenge.serverTime - Date.now(); if(!CUR) CUR = await meta(); render(id); }
    catch(err){ if(err.status === 404 || err.status === 401){ stopBeamer(); $('bmBody').innerHTML = '<div class="empty">' + esc(err.message) + '</div>'; } }
  };
  await refresh();
  BT = setInterval(refresh, 2000);
  BTick = setInterval(() => { if(BSTATE && BSTATE.challenge.state === 'running'){ const el = $('bmTime'); if(el){ const l = (BSTATE.challenge.endsAt - Date.now() - OFFSET) / 1000; el.textContent = fmt(l); el.classList.toggle('low', l < 60); if(l <= 0) refresh(); } } }, 250);
}
function render(id){
  const c = BSTATE.challenge, pl = BSTATE.players, m = CUR.live;
  const bug = c.mode === 'bug' ? m.bugs.find(b => b.id === c.bugId) : null;
  const what = bug ? bug.title : taskLabel(CUR, c.taskId);
  $('bmTitle').textContent = MODE[c.mode] + ' · ' + what;
  const body = $('bmBody');
  if(c.state === 'lobby'){
    body.innerHTML = '<div class="bm-lobby"><div class="bm-join"><div class="bm-k">Beitreten auf</div><div class="bm-url">' + esc(location.host) + '</div><div class="bm-k">mit dem Code</div><div class="bm-code">' + esc(c.code) + '</div>' +
      '<div class="bm-k">Anmelden → Live → Code eingeben</div></div><div class="bm-side"><div class="bm-task"><div class="bm-k">' + MODE[c.mode] + ' · ' + fmt(c.duration) + ' min</div><h2>' + esc(what) + '</h2>' +
      (bug ? '<p class="bm-alarm">⚠ ' + esc(bug.symptom) + '</p>' : '') + '</div><div class="bm-k">' + pl.length + ' Teilnehmende</div><div class="bm-chips">' + pl.map(p => '<span class="bm-chip">' + esc(p.username) + '</span>').join('') + '</div>' +
      '<button class="btn pri bm-start" id="bmStart"' + (pl.length ? '' : ' disabled') + '>▶ Challenge starten</button></div></div>';
    $('bmStart').onclick = async () => { try{ await P.api('POST', 'challenges/' + id + '/start', {}); }catch(err){ P.toast(err.message, true); } };
    return;
  }
  const solved = pl.filter(p => p.solved).length;
  if(c.state === 'running'){
    const l = (c.endsAt - Date.now() - OFFSET) / 1000;
    body.innerHTML = '<div class="bm-run"><div class="bm-clock"><div class="bm-k">Restzeit</div><div class="bm-time' + (l < 60 ? ' low' : '') + '" id="bmTime">' + fmt(l) + '</div>' +
      '<div class="bm-stat"><b>' + solved + '</b> / ' + pl.length + ' gelöst</div><div class="bm-bar"><i style="width:' + (pl.length ? Math.round(100 * solved / pl.length) : 0) + '%"></i></div>' +
      (bug ? '<p class="bm-alarm">⚠ ' + esc(bug.symptom) + '</p>' : '') + '<div class="bm-k" style="margin-top:14px">Code ' + esc(c.code) + ' · späterer Beitritt möglich</div>' +
      '<button class="btn dan" id="bmStop">■ Challenge beenden</button></div><div class="bm-rank">' + rankTable(pl, false) + '</div></div>';
    $('bmStop').onclick = async () => { if(await P.confirmDlg('Challenge beenden?', 'Die Zeit wird angehalten und die Siegerehrung beginnt.', 'Beenden')) try{ await P.api('POST', 'challenges/' + id + '/stop', {}); }catch(err){ P.toast(err.message, true); } };
    return;
  }
  // beendet: Siegerehrung
  const top = pl.filter(p => p.solved).slice(0, 3);
  const key = JSON.stringify(pl.map(p => [p.userId, p.points, p.rank]));
  const showKey = BSTATE.shown ? JSON.stringify(BSTATE.shown.code).length + ':' + BSTATE.shown.points : '';
  if(key === lastPodium && $('bmShow')){   // Podest nicht neu zeichnen (Animation), nur die Lösungsansicht
    if($('bmShow').dataset.k !== showKey){ showSolution(id); $('bmShow').dataset.k = showKey; }
    return;
  }
  lastPodium = key;
  body.innerHTML = '<div class="bm-end"><div class="bm-k">Siegerehrung · ' + solved + ' von ' + pl.length + ' haben gelöst</div>' +
    (top.length ? '<div class="bm-podium">' + [1, 0, 2].filter(i => top[i]).map(i => '<div class="bp bp' + (i + 1) + '" style="animation-delay:' + [0.9, 0.5, 0.1][i] + 's"><div class="bp-name">' + esc(top[i].username) + '</div><div class="bp-pts">' + top[i].points + ' P · ' + fmt(top[i].solvedAfter) + '</div><div class="bp-step">' + (i + 1) + '</div></div>').join('') + '</div>'
      : '<p class="empty">Diesmal hat niemand gelöst. Zeit für eine Besprechung!</p>') +
    '<div class="bm-endgrid"><div class="bm-rank">' + rankTable(pl, true) + '</div><div class="bm-show" id="bmShow"></div></div>' +
    '<div class="row" style="justify-content:center;margin-top:16px"><a class="btn" href="#/live/neu">Neue Challenge</a><a class="btn" href="#/leitstand">Zum Leitstand</a></div></div>';
  $('bmShow').dataset.k = showKey;
  body.querySelectorAll('[data-show]').forEach(b => b.onclick = async () => { try{ await P.api('POST', 'challenges/' + id + '/show', { userId: +b.dataset.show }); BSTATE = await P.api('GET', 'challenges/' + id); render(id); }catch(err){ P.toast(err.message, true); } });
  showSolution(id);
}
function rankTable(pl, withShow){
  return '<table class="tbl bm-tbl"><thead><tr><th>#</th><th>Pseudonym</th><th class="num">Zeit</th><th class="num">Versuche</th><th class="num">Tipps</th><th class="num">Punkte</th>' + (withShow ? '<th></th>' : '') + '</tr></thead><tbody>' +
    (pl.length ? pl.map(p => '<tr class="' + (p.solved ? 'ok' : '') + '"><td>' + (p.rank || '–') + '</td><td>' + esc(p.username) + (p.solved ? ' ✓' : '') + '</td><td class="num">' + (p.solved ? fmt(p.solvedAfter) : '–') + '</td><td class="num">' + p.attempts + '</td><td class="num">' + p.hints + '</td><td class="num"><b>' + (p.solved ? p.points : '') + '</b></td>' +
      (withShow ? '<td>' + (p.hasCode ? '<button class="btn sm" data-show="' + p.userId + '" title="Lösung anonym am Beamer zeigen">Lösung zeigen</button>' : '') + '</td>' : '') + '</tr>').join('')
      : '<tr><td colspan="7" class="empty">Noch niemand beigetreten.</td></tr>') + '</tbody></table>';
}
// Lösung besprechen: eingereichte Schaltung (anonym) neben der Musterschaltung, beide als Mini-Schaltung (bedienbar, mit Stromfluss)
function showSolution(id){
  const el = $('bmShow'); if(!el) return;
  dropMinis();
  const s = BSTATE && BSTATE.shown;
  if(!s){ el.innerHTML = '<div class="bm-k">Lösung besprechen</div><p class="muted">Wähle links eine Lösung – sie erscheint hier <b>ohne Namen</b>, zusammen mit der Musterschaltung.</p>'; return; }
  const ref = CUR.live.refs[BSTATE.challenge.taskId], lay = s.code && (s.code.layout || s.code);
  const count = l => l ? l.parts.length + ' Bauteile · ' + l.wires.length + ' Leitungen' : '';
  el.innerHTML = '<div class="row"><div class="bm-k grow">Eingereichte Lösung (anonym) · ' + s.points + ' P</div><button class="btn sm" id="bmHide">ausblenden</button></div>' +
    '<div class="bm-circ"><div><div class="muted small">eingereicht · ' + count(lay) + '</div><div id="bmMine"></div></div><div><div class="muted small">Musterschaltung · ' + count(ref) + '</div><div id="bmRef"></div></div></div>';
  [['bmMine', lay], ['bmRef', ref]].forEach(([k, l]) => { try{ if(l && window.DQMini) MINIS.push(window.DQMini.mount($(k), { layout: l, height: 240 })); }catch(e){ $(k).textContent = 'Nicht darstellbar.'; } });
  $('bmHide').onclick = async () => { try{ await P.api('POST', 'challenges/' + id + '/show', { userId: null }); BSTATE.shown = null; showSolution(id); $('bmShow').dataset.k = ''; }catch(err){ P.toast(err.message, true); } };
}

/* ---------- Lernende: beitreten ---------- */
function viewJoin(m){
  const v = $('view');
  if(!P.user){ v.innerHTML = '<div class="console"><div class="panel empty">Für die Live-Challenge meldest du dich mit deinem Konto an.<br><br><button class="btn pri" id="ljLogin">Anmelden</button></div></div>'; $('ljLogin').onclick = () => P.openTerminal('login'); return; }
  v.innerHTML = '<div class="console"><div class="crumbs"><a href="#/">HALLE</a> / LIVE</div><div class="join-card panel"><div class="bm-live"><i></i> LIVE-CHALLENGE</div><h1>Beitreten</h1><p class="muted">Gib den 4-stelligen Code vom Beamer ein.</p>' +
    '<form id="ljForm"><input class="inp join-code" id="ljCode" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Beitrittscode" placeholder="• • • •" value="' + esc(m && m[1] || '') + '"><button class="btn pri join-go">Los ▸</button></form><p class="small muted">Angemeldet als <b>' + esc(P.user.username) + '</b></p></div></div>';
  $('ljCode').focus();
  $('ljForm').onsubmit = async e => {
    e.preventDefault();
    try{ const r = await P.api('POST', 'live/join', { code: $('ljCode').value }); location.href = P.GAME + '?live=' + r.challenge.id; }
    catch(err){ P.toast(err.message, true); $('ljCode').select(); }
  };
}

P.routes.push({ re: /^#\/live\/neu$/, view: viewNew });
P.routes.push({ re: /^#\/beamer\/(\d+)$/, view: m => viewBeamer(+m[1]) });
P.routes.push({ re: /^#\/live(?:\/(\d{4}))?$/, view: viewJoin });
})();

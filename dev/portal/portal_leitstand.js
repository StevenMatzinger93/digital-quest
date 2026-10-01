/* ===== Digital Quest Portal: Leitstand (Dozent) – Klassen, Konten, Fortschritt, Schaltungen der Lernenden, Vorgaben mit Frist =====
   Klassen/Konten/Fortschritt wie im SPS-Quest-Portal; die Vorgaben mit Frist sind eine eigene Funktion von Digital Quest. */
(function(){
'use strict';
const P = window.DQP, $ = id => document.getElementById(id), esc = P.esc, api = P.api, toast = P.toast, dialog = P.dialog, confirmDlg = P.confirmDlg, fmtDate = P.fmtDate, ago = P.ago;
const Q = P.Q;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmtDue = d => { if(!d) return '–'; const p = d.split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; };

/* ---------- Klassen ---------- */
async function viewClasses(){
  if(P.needLogin()) return;
  if(!P.canTeach(P.user)){ location.hash = '#/'; return; }
  const v = $('view');
  v.innerHTML = '<div class="console"><div class="crumbs"><a href="#/">HALLE</a> / LEITSTAND</div><h1>Leitstand</h1><p class="lead">Deine Klassen, Konten und der Fortschritt deiner Lernenden.' + LEAD_LINKS.join('') + '</p>' +
    '<div class="panel"><h2>Neue Klasse</h2><form class="row" id="newClass"><input class="inp grow" id="ncName" maxlength="60" placeholder="z.B. AT1A – Elektrotechnik" required><button class="btn pri">Klasse anlegen</button></form></div>' +
    '<div class="panel"><h2>Klassen</h2><div id="clsList" class="cards"><div class="muted">Lade …</div></div></div></div>';
  $('newClass').onsubmit = async e => {
    e.preventDefault();
    try{ const c = await api('POST', 'classes', { name: $('ncName').value }); location.hash = '#/leitstand/klasse/' + c.id; }
    catch(err){ toast(err.message, true); }
  };
  try{
    const r = await api('GET', 'classes');
    $('clsList').innerHTML = r.classes.length ? r.classes.map(c => '<a class="ccard" href="#/leitstand/klasse/' + c.id + '"><div class="t">' + esc(c.name) + '</div><div class="muted small">' + c.students + (c.students === 1 ? ' Konto' : ' Konten') + ' · angelegt ' + fmtDate(c.created_at) + '</div><div style="margin-top:8px">Code <span class="c">' + esc(c.code) + '</span> ' + (c.self_signup ? '<span class="pill ok">Selbstanmeldung offen</span>' : '<span class="pill">geschlossen</span>') + '</div></a>').join('')
      : '<div class="empty">Noch keine Klasse. Lege oben die erste an.</div>';
  }catch(err){ $('clsList').innerHTML = '<div class="empty">' + esc(err.message) + '</div>'; }
}
const LEAD_LINKS = [];

/* ---------- Eine Klasse ---------- */
async function viewClass(id){
  if(P.needLogin()) return;
  const v = $('view');
  let r, meta;
  try{ [r, meta] = await Promise.all([api('GET', 'classes/' + id), P.questMeta()]); }catch(err){ v.innerHTML = '<div class="console"><div class="panel empty">' + esc(err.message) + '</div></div>'; return; }
  const c = r.class, st = r.students;
  const sp = s => s.progress[Q] || {};
  const tot = st.length, active7 = st.filter(s => (sp(s).updatedAt || 0) > Date.now() - 7 * 864e5).length;
  const avg = tot ? Math.round(st.reduce((a, s) => a + (sp(s).tasks || 0), 0) / tot) : 0;
  v.innerHTML = '<div class="console"><div class="crumbs"><a href="#/">HALLE</a> / <a href="#/leitstand">LEITSTAND</a> / KLASSE</div>' +
    '<div class="row"><h1 class="grow">' + esc(c.name) + '</h1><button class="btn sm" id="renCls">Umbenennen</button><button class="btn sm dan" id="delCls">Klasse löschen</button></div>' +
    '<div class="kpis"><div class="kpi"><div class="v">' + tot + '</div><div class="l">Konten</div></div><div class="kpi"><div class="v">' + active7 + '</div><div class="l">aktiv (7 Tage)</div></div>' +
    '<div class="kpi"><div class="v">' + avg + '</div><div class="l">Ø Aufgaben</div></div><div class="kpi"><div class="v">' + st.filter(s => !s.noticeAck).length + '</div><div class="l">Hinweis offen</div></div></div>' +
    '<div class="panel"><h2>Klassencode <span class="tag">für die Selbstanmeldung im Portal</span></h2><div class="row"><span class="code-big" id="clsCode">' + esc(c.code) + '</span><span class="grow"></span>' +
    '<label class="row small"><input type="checkbox" id="selfSu"' + (c.selfSignup ? ' checked' : '') + '> Selbstanmeldung offen</label><button class="btn sm" id="newCode">Neuen Code erzeugen</button></div>' +
    '<p class="muted small" style="margin:8px 0 0">Lernende öffnen <b>' + esc(location.host) + '</b> → Anmelden → [KLASSENCODE] und wählen ein Pseudonym. Direktlink: <code id="clsLink">' + esc(location.origin + '/#/code/' + c.code) + '</code></p></div>' +
    '<div class="panel"><h2>Konten erzeugen <span class="tag">Startpasswort wird angezeigt und muss beim ersten Login geändert werden</span></h2>' +
    '<form class="row" id="genForm"><input class="inp" id="genPrefix" placeholder="Präfix, z.B. at1a_" maxlength="20" style="width:180px"><input class="inp" id="genCount" type="number" min="1" max="40" value="10" style="width:90px"><button class="btn pri">Nummeriert erzeugen</button>' +
    '<span class="muted small">oder</span><button class="btn" type="button" id="genList">Namensliste …</button></form></div>' +
    '<div class="panel"><div class="row"><h2 class="grow">Lernende <span class="tag">' + tot + ' Konten</span></h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pseudonym</th><th>Stand</th><th>Fortschritt</th><th class="num">Aufgaben</th><th class="num">Theorie</th><th class="num">Sterne</th><th>zuletzt</th><th></th></tr></thead><tbody>' +
    (st.length ? st.map(s => { const p = sp(s), pct = p.totalTasks ? Math.round(100 * (p.tasks || 0) / p.totalTasks) : 0;
      return '<tr><td><a href="#/leitstand/schueler/' + s.id + '">' + esc(s.username) + '</a>' + (s.mustChange ? ' <span class="pill warn" title="Startpasswort noch nicht geändert">Start-PW</span>' : '') + '</td><td class="small muted">' + esc(p.current || '–') + '</td>' +
        '<td><div class="pbar" title="' + pct + ' %"><i style="width:' + pct + '%"></i></div></td><td class="num">' + (p.tasks || 0) + '</td><td class="num">' + (p.theory || 0) + '</td><td class="num">' + (p.stars || 0) + '</td>' +
        '<td class="small muted" title="' + fmtDate(p.updatedAt || s.lastLogin) + '">' + ago(p.updatedAt || s.lastLogin) + '</td><td style="white-space:nowrap"><button class="btn sm" data-reset="' + s.id + '">Passwort</button> <button class="btn sm dan" data-del="' + s.id + '" data-name="' + esc(s.username) + '">✕</button></td></tr>'; }).join('')
      : '<tr><td colspan="8" class="empty">Noch keine Lernenden. Konten erzeugen oder den Klassencode weitergeben.</td></tr>') +
    '</tbody></table></div></div><div class="panel" id="vgPanel"><h2>Vorgaben <span class="tag">Kapitel oder Stationen mit Frist</span></h2><div class="muted">Lade …</div></div>' + CLASS_EXTRA.map(f => f(c)).join('') + '</div>';
  $('selfSu').onchange = async e => { try{ await api('PATCH', 'classes/' + id, { selfSignup: e.target.checked }); toast(e.target.checked ? 'Selbstanmeldung geöffnet.' : 'Selbstanmeldung geschlossen.'); }catch(err){ toast(err.message, true); } };
  $('newCode').onclick = async () => { if(!await confirmDlg('Neuen Klassencode erzeugen?', 'Der alte Code funktioniert danach nicht mehr. Bestehende Konten bleiben erhalten.', 'Neuer Code')) return; try{ const x = await api('PATCH', 'classes/' + id, { newCode: true }); $('clsCode').textContent = x.class.code; $('clsLink').textContent = location.origin + '/#/code/' + x.class.code; }catch(err){ toast(err.message, true); } };
  $('renCls').onclick = async () => {
    const ok = await dialog('Klasse umbenennen', '<input class="inp" id="renName" maxlength="60" value="' + esc(c.name) + '">', [{ label:'Abbrechen', value:false }, { label:'Speichern', value:true, cls:'pri' }]);
    if(ok){ try{ await api('PATCH', 'classes/' + id, { name: $('renName').value }); viewClass(id); }catch(err){ toast(err.message, true); } }
  };
  $('delCls').onclick = async () => {
    if(!await confirmDlg('Klasse löschen?', '<p>Die Klasse <b>' + esc(c.name) + '</b> und <b>alle ' + tot + ' Konten</b> mit ihren Spielständen und Vorgaben werden endgültig gelöscht.</p>', 'Endgültig löschen', true)) return;
    try{ await api('DELETE', 'classes/' + id); toast('Klasse gelöscht.'); location.hash = '#/leitstand'; }catch(err){ toast(err.message, true); }
  };
  const showCreated = async list => {
    const pr = await dialog(list.length + (list.length === 1 ? ' Konto' : ' Konten') + ' erzeugt', '<p class="notice">Die Startpasswörter werden <b>nur jetzt</b> angezeigt. Drucke sie aus oder notiere sie.</p>' + P.credsHTML(list),
      [{ label:'Zugangszettel drucken', value:'print' }, { label:'Fertig', value:true, cls:'pri' }], { modal:true });
    if(pr === 'print'){ P.printSlips(c.name, list); await showCreated(list); return; }
    viewClass(id);
  };
  $('genForm').onsubmit = async e => {
    e.preventDefault();
    const prefix = $('genPrefix').value.trim(); if(!prefix) return toast('Bitte ein Präfix angeben.', true);
    try{ const x = await api('POST', 'classes/' + id + '/students', { prefix, count: +$('genCount').value }); await showCreated(x.created); }catch(err){ toast(err.message, true); }
  };
  $('genList').onclick = async () => {
    const ok = await dialog('Konten aus Namensliste', '<p class="muted">Ein Pseudonym pro Zeile (keine echten Namen). 3–24 Zeichen: Buchstaben, Ziffern, <code>. _ -</code></p><textarea class="inp" id="genNames" placeholder="OhmFuchs\nBlauerKolben\n…"></textarea>',
      [{ label:'Abbrechen', value:false }, { label:'Erzeugen', value:true, cls:'pri' }]);
    if(!ok) return;
    const names = $('genNames').value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    try{ const x = await api('POST', 'classes/' + id + '/students', { usernames: names }); await showCreated(x.created); }catch(err){ toast(err.message, true); }
  };
  v.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
    const s = st.find(x => x.id === +b.dataset.reset);
    if(!await confirmDlg('Passwort zurücksetzen?', 'Für <b>' + esc(s.username) + '</b> wird ein neues Startpasswort erzeugt. Angemeldete Geräte werden abgemeldet.', 'Zurücksetzen')) return;
    try{ const x = await api('POST', 'students/' + s.id + '/reset', {}); await dialog('Neues Startpasswort', P.credsHTML([x]), [{ label:'Zettel drucken', value:'print' }, { label:'OK', value:true, cls:'pri' }]).then(p => { if(p === 'print') P.printSlips(c.name, [x]); }); viewClass(id); }
    catch(err){ toast(err.message, true); }
  });
  v.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if(!await confirmDlg('Konto löschen?', 'Das Konto <b>' + esc(b.dataset.name) + '</b> und alle Spielstände werden endgültig gelöscht.', 'Löschen', true)) return;
    try{ await api('DELETE', 'students/' + b.dataset.del); viewClass(id); }catch(err){ toast(err.message, true); }
  });
  CLASS_BIND.forEach(f => f(v, c, st));
  assignPanel(id, c, st, meta);
}
const CLASS_EXTRA = [], CLASS_BIND = [];

/* ---------- Vorgaben mit Frist (eigene Funktion von Digital Quest) ---------- */
function chapterOf(meta, id){ return String(id) === meta.workshop.id ? { n: meta.workshop.id, title: meta.workshop.title, seq: meta.workshop.tasks.map(t => t.id), workshop: true } : meta.chapters.find(c => String(c.n) === String(id)); }
function itemOf(meta, id){ return meta.tasks.find(t => t.id === id) || meta.theory.find(t => t.id === id) || meta.workshop.tasks.find(t => t.id === id); }
function targetItems(meta, a){ if(a.type === 'kapitel'){ const c = chapterOf(meta, a.target); return c ? c.seq.slice() : []; } return itemOf(meta, a.target) ? [a.target] : []; }
function itemLabel(meta, id){ const t = itemOf(meta, id); if(!t) return 'Station ' + id; return (/^T/.test(id) ? 'Theorie ' + id.slice(1) : /^W/.test(id) ? 'Messaufgabe ' + id : 'Aufgabe ' + id) + ' – ' + t.title; }
function targetLabel(meta, a){
  if(a.type === 'kapitel'){ const c = chapterOf(meta, a.target); return c ? (c.workshop ? '' : 'Kapitel ' + c.n + ' – ') + c.title : 'Kapitel ' + a.target + ' (unbekannt)'; }
  return itemLabel(meta, a.target);
}
async function assignPanel(id, c, st, meta){
  const el = $('vgPanel'); if(!el) return;
  let r; try{ r = await api('GET', 'classes/' + id + '/assignments'); }catch(err){ el.innerHTML = '<h2>Vorgaben</h2><div class="empty">' + esc(err.message) + '</div>'; return; }
  const as = r.assignments, t = today(), doneOf = s => new Set(((s.progress[Q] || {}).done) || []);
  const isDone = (a, s) => { const items = targetItems(meta, a), d = doneOf(s); return items.length > 0 && items.every(x => d.has(x)); };
  const chapters = meta.chapters.concat([chapterOf(meta, meta.workshop.id)]);
  el.innerHTML = '<h2>Vorgaben <span class="tag">Kapitel oder Stationen mit Frist · erscheinen bei den Lernenden oben auf der Karte</span></h2>' +
    (as.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vorgabe</th><th>Für</th><th>Frist</th><th>Erledigt</th><th></th></tr></thead><tbody>' + as.map(a => {
      const who = a.userId ? st.filter(s => s.id === a.userId) : st, fin = who.filter(s => isDone(a, s)), over = a.due && a.due < t && fin.length < who.length;
      return '<tr><td>' + esc(targetLabel(meta, a)) + '</td><td>' + (a.userId ? esc(a.username || '?') : '<i>ganze Klasse</i>') + '</td><td>' + (over ? '<span class="pill warn" style="color:#ff8f8f;border-color:rgba(255,77,77,.5)">' + fmtDue(a.due) + ' · überfällig</span>' : fmtDue(a.due)) + '</td>' +
        '<td><span class="num">' + fin.length + ' / ' + who.length + '</span> ' + who.map(s => '<span class="pill' + (isDone(a, s) ? ' ok' : '') + '" title="' + (isDone(a, s) ? 'erledigt' : 'offen') + '">' + esc(s.username) + '</span>').join(' ') + '</td>' +
        '<td style="white-space:nowrap"><button class="btn sm" data-vdue="' + a.id + '" data-due="' + esc(a.due || '') + '">Frist</button> <button class="btn sm dan" data-vdel="' + a.id + '">✕</button></td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="muted">Noch keine Vorgaben für diese Klasse.</p>') +
    '<form id="vgForm" class="vg-new"><h3>Neue Vorgabe</h3><div class="vg-cols"><div><div class="muted small">Was? – ganzes Kapitel ankreuzen oder aufklappen und einzelne Stationen wählen</div><div class="vg-tree">' +
    chapters.map(ch => '<details><summary><label><input type="checkbox" data-vk="' + ch.n + '"> ' + esc(ch.workshop ? ch.title : 'Kapitel ' + ch.n + ' – ' + ch.title) + '</label></summary><div class="vg-items">' +
      ch.seq.map(x => '<label><input type="checkbox" data-va="' + x + '"> ' + esc(itemLabel(meta, x)) + '</label>').join('') + '</div></details>').join('') + '</div></div>' +
    '<div><div class="muted small">Für wen?</div><label class="vg-r"><input type="radio" name="vfor" value="k" checked> ganze Klasse</label><label class="vg-r"><input type="radio" name="vfor" value="s"> einzelne Lernende</label>' +
    '<div class="vg-studs">' + (st.length ? st.map(s => '<label><input type="checkbox" data-vs="' + s.id + '"> ' + esc(s.username) + '</label>').join('') : '<span class="muted small">Noch keine Lernenden.</span>') + '</div>' +
    '<label for="vgDue" class="muted small">Frist (optional)</label><input class="inp" type="date" id="vgDue" min="' + t + '"><p class="muted small">Die Frist ist eine Erinnerung – im Labor wird nichts gesperrt. Vorgegebene Stationen sind für die Lernenden immer offen.</p><button class="btn pri">Zuweisen</button></div></div></form>';
  el.querySelectorAll('[data-vk]').forEach(cb => { cb.onclick = e => e.stopPropagation(); cb.onchange = () => cb.closest('details').querySelectorAll('[data-va]').forEach(i => { i.disabled = cb.checked; if(cb.checked) i.checked = false; }); });
  $('vgForm').onsubmit = async e => {
    e.preventDefault();
    const targets = [...el.querySelectorAll('[data-vk]:checked')].map(i => ({ type:'kapitel', id: i.dataset.vk })).concat([...el.querySelectorAll('[data-va]:checked')].map(i => ({ type:'aufgabe', id: i.dataset.va })));
    const single = el.querySelector('input[name=vfor]:checked').value === 's', ids = [...el.querySelectorAll('[data-vs]:checked')].map(i => +i.dataset.vs);
    if(!targets.length) return toast('Bitte mindestens ein Kapitel oder eine Station ankreuzen.', true);
    if(single && !ids.length) return toast('Bitte mindestens eine Person ankreuzen.', true);
    const body = { targets, due: $('vgDue').value || null }; if(single) body.studentIds = ids; else body.classId = id;
    try{ const x = await api('POST', 'assignments', body); toast(x.ids.length + (x.ids.length === 1 ? ' Vorgabe' : ' Vorgaben') + ' gespeichert.'); assignPanel(id, c, st, meta); }catch(err){ toast(err.message, true); }
  };
  el.querySelectorAll('[data-vdel]').forEach(b => b.onclick = async () => { try{ await api('DELETE', 'assignments/' + b.dataset.vdel); assignPanel(id, c, st, meta); }catch(err){ toast(err.message, true); } });
  el.querySelectorAll('[data-vdue]').forEach(b => b.onclick = async () => {
    const ok = await dialog('Frist ändern', '<label for="vdNew" class="muted small">Frist (leer = keine)</label><input class="inp" type="date" id="vdNew" value="' + esc(b.dataset.due) + '">', [{ label:'Abbrechen', value:false }, { label:'Speichern', value:true, cls:'pri' }]);
    if(!ok) return;
    try{ await api('PATCH', 'assignments/' + b.dataset.vdue, { due: $('vdNew').value || null }); assignPanel(id, c, st, meta); }catch(err){ toast(err.message, true); }
  });
}

/* ---------- Eine Person: Aufgabenraster, Schaltung (Loesung oder Entwurf) als Mini-Schaltung ---------- */
let MINI = null;
function circuitView(host, layout){
  if(MINI){ try{ MINI.destroy(); }catch(e){} MINI = null; }
  if(!layout || !layout.parts || !layout.parts.length){ host.innerHTML = '<p class="empty">Keine Schaltung gespeichert.</p>'; return; }
  if(!window.DQMini){ host.innerHTML = '<pre class="code">' + esc(JSON.stringify(layout, null, 1)) + '</pre>'; return; }
  try{ MINI = window.DQMini.mount(host, { layout, height: 300 }); }
  catch(e){ host.innerHTML = '<p class="empty">Die Schaltung lässt sich nicht darstellen: ' + esc(e.message) + '</p>'; }
}
async function viewStudent(id){
  if(P.needLogin()) return;
  const v = $('view');
  let r, meta;
  try{ [r, meta] = await Promise.all([api('GET', 'students/' + id + '/progress/' + Q), P.questMeta()]); }
  catch(err){ v.innerHTML = '<div class="console"><div class="panel empty">' + esc(err.message) + '</div></div>'; return; }
  const st = r.state || {}, done = st.done || {}, info = st.doneInfo || {}, dr = st.drafts || {}, th = st.theory || {};
  const s = r.summary || {};
  const nT = meta.tasks.filter(t => done[t.id]).length, nTh = meta.theory.filter(t => done[t.id]).length, nW = meta.workshop.tasks.filter(t => done[t.id]).length;
  const stars = Object.keys(info).reduce((a, k) => a + ((info[k] || {}).stars || 0), 0);
  const cell = x => {
    if(/^T/.test(x)){ const t = meta.theory.find(y => y.id === x); return '<button class="cell th ' + (done[x] ? 's2' : '') + '" title="Theorie: ' + esc(t.title) + (done[x] ? ' – bestanden' + (th[x] ? ' (' + Math.round(100 * (th[x].best || 0)) + ' %)' : '') : ' – offen') + '" data-th="' + x + '">T</button>'; }
    const t = itemOf(meta, x), d = done[x] ? (info[x] || { stars: 1 }) : null, cls = d ? 's' + (d.stars || 1) : (dr[x] ? 'draft' : '');
    return '<button class="cell ' + cls + (t.boss ? ' boss' : '') + '" data-task="' + x + '" title="' + esc(x + ': ' + t.title) + (d ? ' – ' + (d.stars || 1) + '★, ' + Math.max(0, (d.tries || 1) - 1) + ' Fehlversuche, ' + (d.hints || 0) + ' Tipps' : dr[x] ? ' – Entwurf' : '') + '">' + esc(x.replace(/^\d+\./, '')) + '</button>';
  };
  v.innerHTML = '<div class="console"><div class="crumbs"><a href="#/">HALLE</a> / <a href="#/leitstand">LEITSTAND</a> / LERNENDE</div><h1>' + esc(r.student.username) + '</h1>' +
    '<p class="lead">' + esc(s.current || 'noch nicht begonnen') + ' · zuletzt ' + ago(r.updatedAt) + (r.student.noticeAck ? '' : ' · <span class="pill warn">Hinweis zur Einsicht noch nicht bestätigt</span>') + '</p>' +
    '<div class="kpis"><div class="kpi"><div class="v">' + nT + '<span class="muted small">/' + meta.tasks.length + '</span></div><div class="l">Aufgaben</div></div>' +
    '<div class="kpi"><div class="v">' + nTh + '<span class="muted small">/' + meta.theory.length + '</span></div><div class="l">Theorie</div></div>' +
    '<div class="kpi"><div class="v">' + stars + '</div><div class="l">Sterne</div></div>' +
    '<div class="kpi"><div class="v">' + nW + '<span class="muted small">/' + meta.workshop.tasks.length + '</span></div><div class="l">Übungswerkstatt</div></div></div>' +
    '<div class="panel"><h2>Aufgaben <span class="tag">Klick auf eine Aufgabe zeigt die Schaltung (Lösung oder Entwurf) und die Messwerte</span></h2><div class="chgrid">' +
    meta.chapters.concat([chapterOf(meta, meta.workshop.id)]).map(ch => '<div class="chrow"><div class="chname"><b>' + esc(ch.n) + '</b> ' + esc(ch.title) + '</div><div class="cells">' + ch.seq.map(cell).join('') + '</div></div>').join('') + '</div>' +
    '<div class="legend"><span><i class="cell s3"></i>3★</span><span><i class="cell s2"></i>2★ / Theorie bestanden</span><span><i class="cell s1"></i>1★</span><span><i class="cell draft"></i>Entwurf</span><span><i class="cell"></i>offen</span></div></div></div>';
  v.querySelectorAll('[data-task]').forEach(b => b.onclick = () => {
    const x = b.dataset.task, t = itemOf(meta, x), d = done[x] ? (info[x] || {}) : null, draft = dr[x];
    const ans = draft && draft.answers ? Object.keys(draft.answers).filter(k => draft.answers[k] !== '') : [];
    dialog(x + ': ' + t.title,
      '<p class="muted small">' + (d ? 'gelöst' + (d.at ? ' ' + fmtDate(d.at) : '') + ' · ' + (d.stars || 1) + '★ · ' + Math.max(0, (d.tries || 1) - 1) + ' Fehlversuche · ' + (d.hints || 0) + ' Tipps' + (d.solution ? ' · <b>Lösung angesehen</b>' : '') + (d.revealed ? ' · <b>' + d.revealed + ' Wert(e) aufgedeckt</b>' : '') : draft ? 'noch nicht gelöst · Entwurf' : 'noch nicht begonnen') + '</p>' +
      '<div id="stCircuit"></div>' +
      (ans.length ? '<h4 style="margin:12px 0 4px">Messprotokoll</h4><table class="tbl"><tbody>' + ans.map(k => '<tr><td class="muted">' + esc(k) + '</td><td class="num">' + esc(draft.answers[k]) + '</td></tr>').join('') + '</tbody></table>' : ''),
      [{ label:'Schliessen', value:true, cls:'pri' }], { wide:true, onOpen: () => circuitView($('stCircuit'), draft && draft.layout), onClose: () => { if(MINI){ try{ MINI.destroy(); }catch(e){} MINI = null; } } });
  });
}

P.leitstand = { targetItems, targetLabel, itemLabel, itemOf, chapterOf, fmtDue, today, leadLinks: LEAD_LINKS, classExtra: CLASS_EXTRA, classBind: CLASS_BIND };
P.routes.push({ re: /^#\/leitstand$/, view: viewClasses });
P.routes.push({ re: /^#\/leitstand\/klasse\/(\d+)$/, view: m => viewClass(+m[1]) });
P.routes.push({ re: /^#\/leitstand\/schueler\/(\d+)$/, view: m => viewStudent(+m[1]) });
})();

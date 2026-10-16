/* ===== Digital Quest Portal: Leitstand – Lernpfad Digitaltechnik im Studio (Stufe 2) =====
   Zeigt je Klasse, wo die Lernenden im Lernpfad stehen: je Station (Zustand), je Aufgabe (richtig, falsch, in Arbeit, offen).
   Die Daten kommen aus dem Fortschritt der Quest «dqpfad» (Zusammenfassung, die das Studio für angemeldete Lernende auf den Server spiegelt). */
(function(){
'use strict';
const P = window.DQP, esc = P.esc;
const QP = 'dqpfad';
const SYM = { r:'✓', f:'✗', a:'◐', o:'·' }, TXT = { r:'richtig', f:'falsch (letzter Versuch)', a:'in Arbeit', o:'offen' };
const ST = { b:'bestanden', a:'in Arbeit', o:'offen' };
const ago = t => { if(!t) return '–'; const d = Math.max(0, Date.now() - t), m = Math.round(d / 6e4); return m < 2 ? 'gerade eben' : m < 90 ? 'vor ' + m + ' Min.' : d < 36e5 * 36 ? 'vor ' + Math.round(d / 36e5) + ' Std.' : 'vor ' + Math.round(d / 864e5) + ' Tagen'; };
const sum = s => (s.progress && s.progress[QP]) || null;

function panelHtml(){
  return '<div class="panel" id="lpPanel"><h2>Lernpfad Digitaltechnik <span class="tag">Studio · je Station und je Aufgabe</span></h2><div class="muted">Lade …</div></div>';
}
async function bind(v, c, st){
  const el = document.getElementById('lpPanel'); if(!el) return;
  let meta; try{ meta = (await P.questMeta()).lernpfad; }catch(e){ meta = null; }
  if(!meta || !meta.length){ el.innerHTML = '<h2>Lernpfad Digitaltechnik</h2><div class="empty">Die Stationsliste ist nicht verfügbar.</div>'; return; }
  const begonnen = p => p && p.stationen && Object.keys(p.stationen).some(k => p.stationen[k].s !== 'o' || /[rfa]/.test(p.stationen[k].a || ''));
  const rows = st.map(s => ({ s, p: sum(s) })).filter(x => begonnen(x.p));
  const studio = location.origin + '/studio/';
  if(!rows.length){
    el.innerHTML = '<h2>Lernpfad Digitaltechnik <span class="tag">Studio</span></h2><p class="muted small" style="margin:0">Noch hat niemand aus dieser Klasse am Lernpfad gearbeitet. Lernende melden sich im Portal an und öffnen das <b>Studio</b> (<code>' + esc(studio) + '</code>), Menü <b>Lernpfad</b> → Stationen. Ihr Fortschritt erscheint dann hier. Ohne Anmeldung bleibt der Fortschritt im Browser und ist für dich unsichtbar.</p>' +
      '<p class="muted small">Du kannst im Studio einzelne Stationen für die Klasse freischalten: Menü Lernpfad → «Freigabedatei erstellen (Lehrperson)».</p>';
    return;
  }
  const done = r => r.p.stations || 0, avg = Math.round(10 * rows.reduce((a, r) => a + done(r), 0) / rows.length) / 10;
  const cell = (r, sid) => { const x = r.p.stationen[sid], m = meta.find(q => q.id === sid); if(!x) return '<td class="lp lp-o" title="' + esc(sid + ' – noch nichts') + '">·</td>';
    return '<td class="lp lp-' + x.s + '" data-lp="' + r.s.id + ':' + sid + '" title="' + esc(sid + ' ' + (m ? m.titel : '') + ': ' + ST[x.s] + ', ' + x.r + ' von ' + x.p + ' Pflichtaufgaben') + '">' + (x.s === 'b' ? '✓' : x.s === 'a' ? '◐' : '·') + '</td>'; };
  const count = sid => rows.filter(r => r.p.stationen[sid] && r.p.stationen[sid].s === 'b').length;
  el.innerHTML = '<h2>Lernpfad Digitaltechnik <span class="tag">Studio · ' + rows.length + ' von ' + st.length + ' haben begonnen</span></h2>' +
    '<div class="kpis"><div class="kpi"><div class="v">' + rows.length + '</div><div class="l">haben begonnen</div></div><div class="kpi"><div class="v">' + avg + '</div><div class="l">Ø Stationen bestanden</div></div><div class="kpi"><div class="v">' + rows.filter(r => r.p.lastAt > Date.now() - 7 * 864e5).length + '</div><div class="l">aktiv (7 Tage)</div></div></div>' +
    '<p class="muted small">Ein Feld je Station: ✓ bestanden, ◐ in Arbeit, · offen. Auf ein Feld klicken zeigt die Aufgaben dieser Person, auf eine Stationsnummer die Aufgaben der ganzen Klasse.</p>' +
    '<div class="tbl-wrap"><table class="tbl lp-tbl"><thead><tr><th>Pseudonym</th>' + meta.map(m => '<th class="lp-h" data-lps="' + m.id + '" title="' + esc(m.id + ' ' + m.titel + (m.auto ? '' : ' (Laborstation)')) + '">' + m.id + '</th>').join('') + '<th class="num">Aufgaben</th><th>Zuletzt</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td><a href="#/leitstand/schueler/' + r.s.id + '">' + esc(r.s.username) + '</a></td>' + meta.map(m => cell(r, m.id)).join('') + '<td class="num">' + r.p.tasks + ' / ' + r.p.totalTasks + '</td><td class="small muted">' + ago(r.p.lastAt) + '</td></tr>').join('') +
    '</tbody><tfoot><tr><td class="small muted">bestanden</td>' + meta.map(m => '<td class="num small">' + count(m.id) + '</td>').join('') + '<td></td><td></td></tr></tfoot></table></div><div id="lpDetail"></div>';
  const det = document.getElementById('lpDetail');
  const taskLine = (m, a, ch) => '<span class="lp-t lp-t-' + ch + (a.pflicht ? '' : ' fw') + '" title="' + esc(a.id + ' ' + a.titel + ': ' + TXT[ch] + (a.pflicht ? '' : ' (freiwillig)')) + '">' + SYM[ch] + '</span>';
  el.querySelectorAll('[data-lp]').forEach(td => td.onclick = () => {
    const [uid, sid] = td.dataset.lp.split(':'), r = rows.find(x => String(x.s.id) === uid), m = meta.find(q => q.id === sid), x = r.p.stationen[sid];
    det.innerHTML = '<h3>' + esc(r.s.username) + ' – ' + esc(m.id + ' ' + m.titel) + ' <span class="pill ' + (x.s === 'b' ? 'ok' : '') + '">' + ST[x.s] + '</span></h3><p class="small muted">' + x.r + ' von ' + x.p + ' Pflichtaufgaben richtig' + (m.auto ? '' : ' · Laborstation: Die Lernenden bestätigen selbst, die Software prüft nichts') + '</p>' +
      '<table class="tbl"><thead><tr><th>Aufgabe</th><th></th><th>Stand</th></tr></thead><tbody>' + m.aufgaben.map((a, i) => { const ch = (x.a || '')[i] || 'o'; return '<tr><td>' + esc(a.id + ' ' + a.titel) + (a.pflicht ? '' : ' <span class="pill">freiwillig</span>') + '</td><td class="lp-sym lp-t-' + ch + '">' + SYM[ch] + '</td><td class="small">' + TXT[ch] + '</td></tr>'; }).join('') + '</tbody></table>';
  });
  el.querySelectorAll('[data-lps]').forEach(th => th.onclick = () => {
    const m = meta.find(q => q.id === th.dataset.lps);
    det.innerHTML = '<h3>' + esc(m.id + ' ' + m.titel) + ' <span class="tag">' + count(m.id) + ' von ' + rows.length + ' bestanden' + (m.auto ? '' : ' · Laborstation') + '</span></h3><div class="tbl-wrap"><table class="tbl lp-tbl"><thead><tr><th>Pseudonym</th>' + m.aufgaben.map(a => '<th class="lp-h" title="' + esc(a.id + ' ' + a.titel + (a.pflicht ? '' : ' (freiwillig)')) + '">' + esc(a.id.split('.')[1]) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => { const x = r.p.stationen[m.id]; return '<tr><td>' + esc(r.s.username) + '</td>' + m.aufgaben.map((a, i) => '<td class="lp-sym lp-t-' + ((x && x.a || '')[i] || 'o') + '">' + SYM[(x && x.a || '')[i] || 'o'] + '</td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="small muted">Aufgaben: ' + m.aufgaben.map(a => esc(a.id.split('.')[1] + ' = ' + a.titel)).join(' · ') + '</p>';
  });
}
P.leitstand.classExtra.push(c => panelHtml());
P.leitstand.classBind.push((v, c, st) => { bind(v, c, st); });
})();

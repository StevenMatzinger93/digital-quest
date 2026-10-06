/* ===== Digital Quest Portal: Wegweiser – «Wo finde ich was?» (Auftrag 06.10.2026, W2/W3) – #/wegweiser =====
   Klassische Übersicht aller Menüpunkte (Textquelle: wegweiser_data.js, gemeinsam mit dem Labor), nach Rolle gefiltert, mit Suche,
   «Häufigen Wegen», Druckansicht und dem geführten Rundgang (DQTour). Erster Besuch: einmalige, dezente Frage in der Halle
   (localStorage dq_ww_asked) – nie am Beamer, in der Prüfung oder in der Live-Ansicht. */
(function(){
'use strict';
const P = window.DQP, $ = id => document.getElementById(id), esc = P.esc, WW = window.DQWegweiser, GAME = P.GAME;
const ASKED = 'dq_ww_asked';
const role = () => WW.roleOf(P.user);
let Q = '';
const hay = i => (i.titel + ' ' + i.text + ' ' + i.wann).toLowerCase();
function openHref(i){ // Ziel des «Öffnen»-Knopfs: Portal-Adresse, Labor-Adresse oder Aktion
  if(i.bereich === 'labor') return i.hash ? GAME + i.hash : GAME;
  return i.href || null;
}
function card(i, r){
  const locked = !WW.sees(i, r);
  const href = openHref(i), act = i.action;
  const btn = locked ? '<span class="ww-lock">nach dem Anmelden</span>'
    : act ? '<button type="button" class="btn sm ww-open" data-act="' + act + '">Öffnen</button>'
    : href ? '<a class="btn sm ww-open" href="' + esc(href) + '">Öffnen</a>' + (i.href2 ? ' <a class="btn sm ww-open" href="' + esc(i.href2) + '">Impressum</a>' : '') : '';
  return '<div class="ww-card' + (locked ? ' locked' : '') + '" data-id="' + i.id + '"><div class="ww-ic" aria-hidden="true">' + i.icon + '</div><div class="ww-body"><b>' + esc(i.titel) + '</b>' +
    '<p>' + esc(i.text) + '</p><p class="ww-wann"><span>Wann?</span> ' + esc(i.wann) + '</p></div><div class="ww-act">' + btn + '</div></div>';
}
function view(){
  const r = role(), v = $('view');
  const match = i => !Q || hay(i).includes(Q);
  // Gast sieht Konto-Funktionen als «nach dem Anmelden», alle anderen Rollen nur ihre eigenen Einträge
  const generic = i => !!i.rollen && WW.ANGEMELDET.every(x => i.rollen.includes(x));   // Konto-Funktionen aller Rollen: für Gäste «nach dem Anmelden»
  const list = b => WW.items.filter(i => i.bereich === b && (WW.sees(i, r) || (r === 'gast' && generic(i))) && match(i));
  const wege = WW.wege.filter(w => WW.sees(w, r));
  const sect = (b, lead) => { const l = list(b); return '<section class="ww-sect" data-bereich="' + b + '"><h2>' + esc(WW.BEREICH[b]) + ' <span class="tag">' + l.length + '</span></h2>' + (lead ? '<p class="muted small">' + lead + '</p>' : '') + (l.length ? '<div class="ww-cards">' + l.map(i => card(i, r)).join('') + '</div>' : '<p class="empty">Kein Treffer.</p>') + '</section>'; };
  v.innerHTML = '<div class="console ww-page"><div class="crumbs"><a href="#/">HALLE</a> / WEGWEISER</div><h1>Wegweiser</h1><p class="lead">Wo finde ich was? Jeder Menüpunkt in einem Satz – für ' + ({ gast: 'Besucherinnen und Besucher ohne Konto', student: 'Lernende', teacher: 'Dozentinnen und Dozenten', admin: 'den Admin' })[r] + '.' +
      (r === 'gast' ? ' Nach dem Anmelden siehst du hier die Punkte deiner Rolle.' : '') + '</p>' +
    '<div class="ww-tools row"><label class="grow"><span class="sr-only">Suchen</span><input class="inp" id="wwSearch" type="search" placeholder="Suchen … z. B. Zertifikat, Passwort, Oszilloskop" value="' + esc(Q) + '" aria-label="Wegweiser durchsuchen"></label>' +
      '<button type="button" class="btn pri" id="wwTourPortal">▶ Rundgang Portal</button><a class="btn" id="wwTourLabor" href="' + esc(GAME + '#/handbuch/wegweiser') + '">▶ Rundgang Labor</a><button type="button" class="btn" id="wwPrint" title="Übersicht drucken">🖨 Drucken</button></div>' +
    (wege.length && !Q ? '<section class="panel ww-wege"><h2>Häufige Wege</h2><ul>' + wege.map(w => '<li><a href="' + esc(w.href) + '">' + esc(w.frage) + '</a>' + (w.hinweis ? ' <span class="muted small">' + esc(w.hinweis) + '</span>' : '') + '</li>').join('') + '</ul></section>' : '') +
    sect('portal') + sect('labor', 'Das Labor ist das Spiel hinter dem Tor «Labor». Diese Punkte stehen dort in der Kopfzeile.') + sect('aufgabe', 'Innerhalb einer Aufgabe. Die Bedienung der Messgeräte zeigt dir das Werkbank-Tutorial.') +
    '<p class="muted small ww-foot">Wegweiser · Digital Quest · Rolle: ' + esc(r === 'gast' ? 'ohne Konto' : r === 'student' ? 'Lernende' : r === 'teacher' ? 'Dozent/in' : 'Admin') + ' · ' + new Date().toLocaleDateString('de-CH') + '</p></div>';
  $('wwSearch').oninput = e => { Q = e.target.value.trim().toLowerCase(); render(); };
  $('wwTourPortal').onclick = () => startPortalTour();
  $('wwPrint').onclick = () => window.print();
  v.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(b.dataset.act));
  const s = $('wwSearch'); if(Q){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}
function render(){ view(); }
function act(a){
  if(a === 'feedback'){ const b = $('spsqRpBtn'); if(b) b.click(); else P.toast('Der Feedback-Knopf steht unten links.'); }
  else if(a === 'usermenu'){ const b = $('userBtn'); if(b && !b.closest('[hidden]')) b.click(); else P.toast('Das Benutzermenü erscheint oben rechts, sobald du angemeldet bist.'); }
}
// Rundgang Portal: Menüpunkte der Rolle in Menü-Reihenfolge; ist ein Element nicht sichtbar (Handy: Menü eingeklappt, Tore nur in der Halle),
// zeigt der Rundgang die Karte des Eintrags auf dieser Seite
function startPortalTour(){
  const r = role(), T = window.DQTour; if(!T) return;
  const steps = WW.items.filter(i => i.bereich === 'portal' && i.tour !== false && WW.sees(i, r)).map(i => {
    const sel = i.sel || '#topnav a[href="' + i.href + '"]';
    const el = document.querySelector(sel), ok = el && el.offsetParent !== null && !el.closest('[hidden]');
    return { el: ok ? el : document.querySelector('.ww-card[data-id="' + i.id + '"]'), titel: i.titel, text: i.text + ' ' + i.wann };
  }).filter(s => s.el);
  T.start(steps, { onDone: () => P.toast('Rundgang beendet – du findest ihn jederzeit im Wegweiser.'), onAbort: () => {} });
}
// Erster Besuch: einmalige Frage in der Halle (kein automatischer Start), Antwort je Browser in localStorage
function maybeAsk(){
  const h = location.hash || '#/';
  if(h !== '#/' || !window.DQTour) return;
  let asked = null; try{ asked = localStorage.getItem(ASKED); }catch(e){ asked = '1'; }
  if(asked || $('dqTourAsk')) return;
  window.DQTour.ask({ text: 'Neu hier? Der Wegweiser zeigt dir in einem kurzen Rundgang, wo was ist.', yes: 'Rundgang starten', no: 'Nein danke',
    onYes: () => { try{ localStorage.setItem(ASKED, '1'); }catch(e){} location.hash = '#/wegweiser'; setTimeout(startPortalTour, 350); },
    onNo: () => { try{ localStorage.setItem(ASKED, '1'); }catch(e){} } });
}
window.addEventListener('dqp:route', () => { const h = location.hash || '#/'; if(window.DQTour && window.DQTour.active && !h.startsWith('#/wegweiser')) window.DQTour.end(); if(!/^#\/(beamer|pruefung|live)/.test(h)) maybeAsk(); });
P.routes.push({ re: /^#\/wegweiser$/, view });
P.nav.push({ href: '#/wegweiser', label: 'Wegweiser', before: 'live', show: () => true });
P.wegweiser = { startPortalTour, view };
})();

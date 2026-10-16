/* Digital Quest Studio – Lernpfad: Anbindung an das Portal (Stufe 2, Nachtlauf 2)
 * Nur in der gehosteten Fassung (https://…/studio/); die Datei-Fassung hat keinen Server und diese Datei tut dort nichts.
 * Wer im Portal als Lernende(r) angemeldet ist, bekommt den Lernpfad-Fortschritt auf den Server gespiegelt (Quest «dqpfad»): vollständiger Stand und eine kleine Zusammenfassung,
 * die im Leitstand je Station und je Aufgabe erscheint. Das Studio bleibt ohne Anmeldung voll benutzbar; die Anmeldung fügt nur die Sichtbarkeit für die Lehrperson und den Abgleich
 * zwischen Geräten hinzu. Konten werden nie gemischt: Mit Konto hat der Fortschritt einen eigenen Speicherschlüssel je Konto; ohne Anmeldung Gearbeitetes wird nur nach ausdrücklicher
 * Zustimmung in ein Konto übernommen. Zwei Stände desselben Kontos (zwei Geräte) werden zusammengeführt (P.zusammen): Fortschritt geht nie verloren. */
(function (root) {
  'use strict';
  var S = root.Studio, P = root.DQPfad;
  var sy = S.pfadSync = { status: 'aus', user: null, fehler: null, base: 0, letzter: 0, busy: false, dirty: false };
  var timer = 0, retry = 0;
  function http() { return /^https?:$/.test(root.location.protocol); }
  function api(method, path, body, keepalive) {
    var h = { 'content-type': 'application/json' }; if (method !== 'GET') h['x-dquest'] = '1';
    return fetch('/api/' + path, { method: method, credentials: 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined, keepalive: !!keepalive }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || ('Fehler ' + r.status)); e.status = r.status; e.data = j; throw e; } return j; });
    });
  }
  function neuZeichnen() { if (S.pfad && S.pfad.refresh) S.pfad.refresh(); }
  function schluessel(u) { return S.pfad.KEY0 + '_u' + u.id; }
  var kurz = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  sy.start = function () {
    if (!http() || !S.pfad) return; sy.status = 'pruefe';
    api('GET', 'me').then(function (j) {
      var u = j.user; if (!u) { sy.status = 'abgemeldet'; neuZeichnen(); return; }
      sy.user = u; if (u.role !== 'student') { sy.status = 'lehrperson'; neuZeichnen(); return; }
      sy.status = 'verbunden'; return anmelden(u);
    }).catch(function () { sy.status = 'abgemeldet'; neuZeichnen(); }); // kein Netz: wie ohne Anmeldung, nichts geht verloren
  };
  /* Konto erkannt: Speicher des Kontos wählen, ohne Anmeldung Gearbeitetes anbieten, mit dem Server abgleichen */
  function anmelden(u) {
    var anonym = S.pfad.leseSchluessel(S.pfad.KEY0), hatAnonym = anonym && P.zusammenfassung(anonym).tasks + Object.keys(anonym.stationen).length > 0;
    S.pfad.wechsleSpeicher(schluessel(u));
    var uebernahme = Promise.resolve(false);
    if (hatAnonym) uebernahme = new Promise(function (res) {
      S.openModal('<h2>Fortschritt in dein Konto übernehmen?</h2><p>Du hast in diesem Browser schon ohne Anmeldung am Lernpfad gearbeitet. Soll dieser Fortschritt in dein Konto <b>' + kurz(u.username) + '</b> übernommen werden? Dann sieht ihn auch deine Lehrperson.</p><p class="hint">Wenn der Fortschritt von jemand anderem stammt, wähle «Nein»: Er bleibt dann unverändert in diesem Browser.</p><p><button class="tb run" id="uebJa">Ja, übernehmen</button> <button class="tb" id="uebNein">Nein</button></p>');
      document.getElementById('uebJa').onclick = function () { S.closeModal(); res(true); }; document.getElementById('uebNein').onclick = function () { S.closeModal(); res(false); };
    });
    return uebernahme.then(function (ja) {
      if (ja) { S.pfad.setStand(P.zusammen(S.pfad.stand(), anonym)); S.pfad.loescheSchluessel(S.pfad.KEY0); }
      return abgleichen();
    });
  }
  /* Server holen, zusammenführen, bei Unterschied zurückschreiben */
  function abgleichen() {
    return api('GET', 'progress/dqpfad').then(function (r) {
      sy.base = r.updatedAt || 0; var lokal = S.pfad.stand(), srv = r.state && r.state.stationen ? P.importiere(JSON.stringify({ format: P.FORMAT, version: P.VERSION, stand: r.state })) : null;
      var gem = srv && srv.ok ? P.zusammen(lokal, srv.stand) : lokal;
      if (JSON.stringify(gem) !== JSON.stringify(lokal)) S.pfad.setStand(gem);
      var gleich = !!(srv && srv.ok) && JSON.stringify(P.fuerServer(P.zusammen(gem, gem))) === JSON.stringify(P.fuerServer(P.zusammen(srv.stand, srv.stand))); // Server hat schon alles
      sy.fehler = null; sy.letzter = Date.now(); neuZeichnen();
      if (!gleich && (Object.keys(gem.stationen).length || (gem.frei || []).length)) return senden(); // ein leerer Stand wird nicht hochgeladen
    }).catch(function (e) { fehler(e); });
  }
  function senden(keepalive) {
    if (sy.status !== 'verbunden') return Promise.resolve();
    if (sy.busy) { sy.dirty = true; return Promise.resolve(); } sy.busy = true; sy.dirty = false;
    var st = S.pfad.stand();
    return api('PUT', 'progress/dqpfad', { state: P.fuerServer(st), summary: P.zusammenfassung(st), base: sy.base }, keepalive).then(function (r) { sy.base = r.updatedAt || sy.base; sy.fehler = null; sy.letzter = Date.now(); sy.busy = false; neuZeichnen(); if (sy.dirty) return senden(); })
      .catch(function (e) { sy.busy = false; if (e && e.status === 409) return abgleichen(); fehler(e); }); // 409: ein anderes Gerät war schneller → zusammenführen und noch einmal
  }
  function fehler(e) {
    if (e && (e.status === 401 || e.status === 403)) { sy.status = 'abgemeldet'; sy.fehler = null; neuZeichnen(); return; }
    sy.fehler = 'Gerade keine Verbindung zum Portal – dein Stand bleibt hier gespeichert und wird später abgeglichen.'; neuZeichnen();
    clearTimeout(retry); retry = setTimeout(function () { if (sy.status === 'verbunden') senden(); }, 30000);
  }
  /* wird von ui.js nach jeder Änderung des Standes gerufen */
  sy.geaendert = function () { if (sy.status !== 'verbunden') return; clearTimeout(timer); timer = setTimeout(function () { senden(); }, 2500); };
  sy.jetzt = function () { clearTimeout(timer); return senden(); };
  root.addEventListener('online', function () { if (sy.status === 'verbunden') senden(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && sy.status === 'verbunden' && timer) { clearTimeout(timer); timer = 0; senden(true); } });
  root.addEventListener('pagehide', function () { if (sy.status === 'verbunden' && timer) { clearTimeout(timer); timer = 0; senden(true); } });
  S.initFns.push(function () { sy.start(); });
})(window);

/* Digital Quest Studio – Betrieb im Netz (Nachtlauf 2, Block 5)
 * 1. Dateidialoge des Systems: Wo der Browser es kann (Chrome, Edge: File System Access API), öffnen und speichern «Öffnen …» und «Speichern» über die Dateiauswahl des Systems statt über
 *    den Download-Ordner; «Speichern» schreibt danach direkt in dieselbe Datei. Wo nicht, bleibt es beim bisherigen Weg (Download, Dateiauswahl des Browsers) – ohne Hinweis und ohne Fehler.
 * 2. Hinweis auf eine neuere Fassung: Meldet sich ein neuer Service Worker (gehostete Fassung), erscheint eine Leiste «Neuere Fassung verfügbar – neu laden».
 *    Ohne Meldung würde die geöffnete Seite die alte Fassung weiterlaufen lassen.
 * 3. «Als App installieren» im Menü Hilfe, wenn der Browser es anbietet (Manifest und Symbol bringt der Build für /studio/ mit). */
(function (root) {
  'use strict';
  var S = root.Studio;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Dateidialoge ---------- */
  S.fsa = function () { return typeof root.showSaveFilePicker === 'function' && typeof root.showOpenFilePicker === 'function'; };
  var handles = {}; // zuletzt gewählte Datei je Art (key): «Speichern» schreibt dorthin zurück
  function types(o) { var acc = {}; acc[o.mime || 'application/json'] = [o.ext || '.json']; return [{ description: o.desc || 'Datei', accept: acc }]; }
  function fallbackSave(name, text, o) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: o && o.mime || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  /* S.saveFile(name, text, {desc, ext, mime, key, dialog}) → Promise<'datei' | 'download' | 'abgebrochen'>; dialog: true erzwingt die Dateiauswahl («Speichern unter») */
  S.saveFile = function (name, text, o) {
    o = o || {};
    if (!S.fsa()) { fallbackSave(name, text, o); return Promise.resolve('download'); }
    var h = !o.dialog && o.key && handles[o.key];
    var write = function (handle) { return handle.createWritable().then(function (w) { return w.write(text).then(function () { return w.close(); }); }).then(function () { if (o.key) handles[o.key] = handle; if (S.onFileSaved) S.onFileSaved(handle.name, o.key); return 'datei'; }); };
    var chooser = function () { return root.showSaveFilePicker({ suggestedName: name, types: types(o) }).then(write); };
    var p = h ? write(h).catch(function () { return chooser(); }) : chooser(); // das Ziel ist weg (gelöscht, nicht mehr beschreibbar): neu wählen lassen
    return p.catch(function (e) { if (e && e.name === 'AbortError') return 'abgebrochen'; fallbackSave(name, text, o); return 'download'; });
  };
  /* S.openFile({desc, ext, mime, key}, fn(text, name)): Dateiauswahl des Systems oder des Browsers */
  S.openFile = function (o, fn) {
    o = o || {};
    if (S.fsa()) {
      root.showOpenFilePicker({ types: types(o), multiple: false }).then(function (hs) { var h = hs[0]; return h.getFile().then(function (f) { return f.text().then(function (t) { if (o.key) handles[o.key] = h; fn(t, f.name); }); }); })
        .catch(function (e) { if (e && e.name === 'AbortError') return; browserDialog(o, fn); });
      return;
    }
    browserDialog(o, fn);
  };
  function browserDialog(o, fn) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = (o.ext || '.json') + ',application/json'; inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = function () { var f = inp.files[0]; if (!f) { inp.remove(); return; } var rd = new FileReader(); rd.onload = function () { inp.remove(); fn(String(rd.result), f.name); }; rd.readAsText(f); };
    inp.click();
  }
  S.forgetFile = function (key) { delete handles[key]; };
  S.hasFileHandle = function (key) { return !!handles[key]; };

  /* Schaltung speichern und öffnen */
  var DESC = { desc: 'Digital Quest Studio Schaltung', ext: '.json', key: 'schaltung' };
  var oldSave = S.save, oldOpen = S.openDialog;
  S.save = function (opts) {
    if (!S.fsa()) return oldSave();
    var txt = JSON.stringify(S.serialize(), null, 1);
    S.saveFile(S.fileBase() + '.dqstudio.json', txt, Object.assign({}, DESC, { dialog: !!(opts && opts.dialog) }));
    return txt;
  };
  S.openDialog = function () { if (!S.fsa()) return oldOpen(); S.openFile(DESC, function (t) { S.openText(t); }); }; // der Handle bleibt: «Speichern» schreibt danach in die geöffnete Datei
  S.saveAs = function () { return S.save({ dialog: true }); };

  /* ---------- Hinweis auf neuere Fassung ---------- */
  S.showUpdateBar = function () {
    if ($('#updBar')) return;
    var b = document.createElement('div'); b.id = 'updBar'; b.className = 'updbar'; b.setAttribute('role', 'status');
    b.innerHTML = '<span><b>Neuere Fassung verfügbar.</b> Diese Seite zeigt noch die alte. Speichere deine Schaltung und lade die Seite neu.</span> <button class="tb run" data-a="reload">Jetzt neu laden</button> <button class="tb" data-a="later">Später</button>';
    document.body.insertBefore(b, document.body.firstChild);
    b.addEventListener('click', function (ev) { var a = ev.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'reload') root.location.reload(); else b.remove(); });
  };
  if ('serviceWorker' in navigator && /^https?:$/.test(root.location.protocol)) {
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!had) { had = true; return; } S.showUpdateBar(); }); // erste Installation: nur merken, nichts melden
  }

  /* ---------- Als App installieren ---------- */
  root.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); S.installEvent = ev; if (S.addMenuItem) S.addMenuItem('hilfe', { label: 'Als App installieren …', act: function () { var e = S.installEvent; S.installEvent = null; if (e) e.prompt(); S.removeMenuItem && S.removeMenuItem('hilfe', 'Als App installieren …'); } }); });
})(window);

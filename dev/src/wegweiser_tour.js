/* Digital Quest – Geführter Rundgang (Auftrag 06.10.2026, W3; Mechanik nach startTour/showTourStep in SPS Quest).
 * window.DQTour.start(steps, opts): steps [{ el (Selector oder Element), titel, text }], nur sichtbare Elemente werden gezeigt.
 *   Hintergrund abgedunkelt, Spotlight auf dem Element, Sprechblase mit Titel, Text (aria-live), «Schritt 3 von 9»,
 *   Knöpfe Zurück / Weiter / Beenden; Tastatur: Pfeiltasten, Enter = weiter, Esc = beenden; Fokus bleibt in der Sprechblase.
 *   opts: { onDone, onAbort, onStep(i, step) }. prefers-reduced-motion: keine Bewegung (CSS).
 * window.DQTour.ask({ text, yes, no, onYes, onNo }): dezente, einmalige Frage «Neu hier? Rundgang starten» unten am Bildschirm.
 * Gemeinsam für Portal und Labor; CSS wird einmal eingefügt (ensureCSS). */
(function (root) {
  'use strict';
  var CSS = '#dqTour{position:fixed;inset:0;z-index:9000;font-family:inherit}#dqTour[hidden]{display:none}' +
    '#dqTour .dqt-back{position:absolute;inset:0}' +
    '#dqTour .dqt-spot{position:absolute;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.66),0 0 0 3px #ffb000,0 0 24px rgba(255,176,0,.6);transition:left .25s,top .25s,width .25s,height .25s;pointer-events:none}' +
    '#dqTour .dqt-card{position:absolute;max-width:min(360px,calc(100vw - 24px));background:#0d1218;color:#e3e9ef;border:1px solid #2c3a4a;border-radius:12px;padding:14px 16px;box-shadow:0 20px 50px rgba(0,0,0,.5);font-size:14px;line-height:1.45}' +
    '#dqTour .dqt-step{font:600 11px ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#8b98a6;text-transform:uppercase}' +
    '#dqTour h3{margin:4px 0 6px;font-size:17px;color:#ffb000}#dqTour p{margin:0 0 12px}' +
    '#dqTour .dqt-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}#dqTour button{font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;border:1px solid #2c3a4a;background:#141b23;color:#e3e9ef;cursor:pointer;min-height:36px}' +
    '#dqTour button.pri{background:#ffb000;border-color:#ffb000;color:#111}#dqTour button:focus-visible{outline:2px solid #1ec8e0;outline-offset:2px}#dqTour .dqt-end{margin-left:auto;background:none;border-color:transparent;color:#8b98a6}' +
    '#dqTourAsk{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:8900;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);background:#0d1218;color:#e3e9ef;border:1px solid #2c3a4a;border-radius:12px;padding:10px 14px;box-shadow:0 14px 40px rgba(0,0,0,.5);font-size:14px}' +
    '#dqTourAsk[hidden]{display:none}#dqTourAsk button{font:inherit;font-size:13px;padding:6px 12px;border-radius:8px;border:1px solid #2c3a4a;background:#141b23;color:#e3e9ef;cursor:pointer;min-height:34px}#dqTourAsk button.pri{background:#ffb000;border-color:#ffb000;color:#111}' +
    '@media (prefers-reduced-motion: reduce){#dqTour .dqt-spot{transition:none}}' +
    '@media print{#dqTour,#dqTourAsk{display:none!important}}';
  function ensureCSS() {
    if (typeof document === 'undefined' || document.getElementById('dq-tour-css')) return;
    var s = document.createElement('style'); s.id = 'dq-tour-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  var T = null;
  function resolve(el) { return typeof el === 'string' ? document.querySelector(el) : el; }
  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return el.offsetParent !== null && r.width > 0 && r.height > 0; }
  function box() {
    var el = document.getElementById('dqTour');
    if (!el) {
      ensureCSS();
      el = document.createElement('div'); el.id = 'dqTour'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'dqtTitle');
      el.innerHTML = '<div class="dqt-back"></div><div class="dqt-spot"></div><div class="dqt-card"><div class="dqt-step" id="dqtStep"></div><h3 id="dqtTitle"></h3><p id="dqtText" aria-live="polite"></p>' +
        '<div class="dqt-btns"><button type="button" id="dqtPrev">‹ Zurück</button><button type="button" class="pri" id="dqtNext">Weiter ›</button><button type="button" class="dqt-end" id="dqtEnd">Beenden</button></div></div>';
      document.body.appendChild(el);
      el.querySelector('#dqtPrev').onclick = function () { go(T.i - 1); };
      el.querySelector('#dqtNext').onclick = function () { if (T.i >= T.steps.length - 1) end(true); else go(T.i + 1); };
      el.querySelector('#dqtEnd').onclick = function () { end(false); };
      el.querySelector('.dqt-back').onclick = function () { end(false); };
      el.addEventListener('keydown', function (ev) {
        if (!T) return;
        if (ev.key === 'Escape') { ev.preventDefault(); end(false); }
        else if (ev.key === 'ArrowRight' || ev.key === 'Enter') { if (ev.target.id === 'dqtPrev' || ev.target.id === 'dqtEnd') return; ev.preventDefault(); if (T.i >= T.steps.length - 1) end(true); else go(T.i + 1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(T.i - 1); }
        else if (ev.key === 'Tab') { // Fokus bleibt in der Sprechblase
          var f = el.querySelectorAll('button:not([hidden])'), first = f[0], last = f[f.length - 1];
          if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); } else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        }
      });
      window.addEventListener('resize', function () { if (T) place(); });
    }
    return el;
  }
  function place() {
    var s = T.steps[T.i], el = resolve(s.el), b = box();
    if (!visible(el)) { el = null; }
    var spot = b.querySelector('.dqt-spot'), card = b.querySelector('.dqt-card');
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'auto' }); }
    var r = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: 60, width: 80, height: 40, bottom: 100 }, pad = 6;
    spot.style.display = el ? '' : 'none';
    spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px'; spot.style.width = (r.width + 2 * pad) + 'px'; spot.style.height = (Math.min(r.height, window.innerHeight - 40) + 2 * pad) + 'px';
    b.querySelector('#dqtStep').textContent = 'Schritt ' + (T.i + 1) + ' von ' + T.steps.length;
    b.querySelector('#dqtTitle').textContent = s.titel || ''; b.querySelector('#dqtText').textContent = s.text || '';
    b.querySelector('#dqtPrev').hidden = T.i === 0;
    b.querySelector('#dqtNext').textContent = T.i >= T.steps.length - 1 ? 'Fertig ✓' : 'Weiter ›';
    var cw = Math.min(360, window.innerWidth - 24);
    card.style.width = cw + 'px';
    var left = r.left + r.width / 2 - cw / 2; left = Math.max(12, Math.min(window.innerWidth - cw - 12, left));
    var ch = card.offsetHeight || 190, top = r.bottom + 14; if (top + ch > window.innerHeight - 8) top = Math.max(12, r.top - ch - 14);
    card.style.left = left + 'px'; card.style.top = top + 'px';
    if (T.opts.onStep) T.opts.onStep(T.i, s);
    b.querySelector('#dqtNext').focus();
  }
  function go(i) { if (!T) return; T.i = Math.max(0, Math.min(T.steps.length - 1, i)); place(); }
  function end(done) {
    if (!T) return;
    var t = T; T = null; var b = document.getElementById('dqTour'); if (b) b.hidden = true;
    if (t.restore && t.restore.focus) try { t.restore.focus(); } catch (e) { /* weg */ }
    if (done && t.opts.onDone) t.opts.onDone(); if (!done && t.opts.onAbort) t.opts.onAbort(t.i);
  }
  function start(steps, opts) {
    if (T) end(false);
    var list = (steps || []).filter(function (s) { return s.el === null || visible(resolve(s.el)); });
    if (!list.length) return false;
    T = { steps: list, i: 0, opts: opts || {}, restore: document.activeElement };
    var b = box(); b.hidden = false; place();
    return true;
  }
  function ask(o) {
    ensureCSS();
    var old = document.getElementById('dqTourAsk'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'dqTourAsk'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>' + (o.text || 'Neu hier? Ein kurzer Rundgang zeigt dir, wo was ist.') + '</span><button type="button" class="pri" id="dqtAskYes">' + (o.yes || 'Rundgang starten') + '</button><button type="button" id="dqtAskNo">' + (o.no || 'Nein danke') + '</button>';
    document.body.appendChild(el);
    el.querySelector('#dqtAskYes').onclick = function () { el.remove(); if (o.onYes) o.onYes(); };
    el.querySelector('#dqtAskNo').onclick = function () { el.remove(); if (o.onNo) o.onNo(); };
    return el;
  }
  root.DQTour = { start: start, end: function () { end(false); }, ask: ask, ensureCSS: ensureCSS, get active() { return !!T; } };
})(typeof window !== 'undefined' ? window : globalThis);

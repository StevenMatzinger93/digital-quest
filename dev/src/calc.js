/* Digital Quest – eingebauter Taschenrechner (window.DQCalc), rein clientseitig, ohne Bibliothek.
 * Overlay ueber dem aktuellen Bildschirm (Aufgabe, Theorie, Karte bleiben sichtbar), oeffnen ueber die Kopfzeile (🖩)
 * oder den Knopf im Messprotokoll, schliessen mit X, Esc oder Klick daneben. Tastatur: Ziffern und Operatoren tippen,
 * Enter rechnet. Rechenarten: + − × ÷, Klammern, Potenz ^ und x², Wurzel √, Prozent (postfix, 20% = 0,2), sin/cos/tan
 * (Grad), log (Zehner), ln, abs, π. SI-Vorsaetze direkt an der Zahl: 4k7 → 4700, 100n → 100e-9, 2.2M, 5m, 47u/47µ.
 * Fehler (Division durch 0, Klammer fehlt, unbekanntes Zeichen) erscheinen als Text im Rechner, nie als Absturz. */
(function (root) {
  'use strict';
  var SI = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 };
  var FN = { sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: function (x) { return Math.log(x) / Math.LN10; },
    sin: function (x) { return Math.sin(x * Math.PI / 180); }, cos: function (x) { return Math.cos(x * Math.PI / 180); }, tan: function (x) { return Math.tan(x * Math.PI / 180); } };
  var CONST = { pi: Math.PI, 'π': Math.PI, e: Math.E };
  function fail(msg) { var e = new Error(msg); e.calc = true; throw e; }

  /* ---------- Zerlegen ---------- */
  function tokenize(src) {
    var s = String(src).replace(/,/g, '.').replace(/×|·/g, '*').replace(/÷|:/g, '/').replace(/−|–/g, '-').replace(/√/g, 'sqrt').replace(/²/g, '^2'), t = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^(\d*\.?\d+(?:e[+-]?\d+)?|\d+\.)/i.exec(s.slice(i));
        if (!m) fail('Zahl unvollstaendig');
        var num = parseFloat(m[1]); i += m[1].length;
        // SI-Vorsatz direkt an der Zahl (4k7 = 4,7k), nicht wenn ein Funktionsname folgt
        var suf = s[i], rest = s.slice(i + 1);
        if (suf && SI[suf] && !/^[a-zA-Z]/.test(rest)) {
          i++;
          var frac = /^\d+/.exec(s.slice(i)); if (frac && !/\./.test(m[1])) { num = parseFloat(m[1] + '.' + frac[0]); i += frac[0].length; }
          num *= SI[suf];
        }
        t.push({ k: 'n', v: num }); continue;
      }
      if (/[a-zA-Zπ]/.test(c)) { var w = /^[a-zA-Zπ]+/.exec(s.slice(i))[0]; i += w.length; t.push({ k: 'w', v: w }); continue; }
      if ('+-*/^%()'.indexOf(c) >= 0) { t.push({ k: c }); i++; continue; }
      fail('Unbekanntes Zeichen: „' + c + '“');
    }
    return t;
  }

  /* ---------- Rechnen (rekursiver Abstieg) ---------- */
  function evaluate(src) {
    if (!String(src).trim()) fail('Nichts eingegeben');
    var t = tokenize(src), p = 0;
    function peek() { return t[p]; }
    function take(k) { var x = t[p]; if (!x || (k && x.k !== k)) fail(k === ')' ? 'Klammer fehlt: )' : 'Ausdruck unvollstaendig'); p++; return x; }
    function expr() { var v = term(); while (peek() && (peek().k === '+' || peek().k === '-')) { var op = take().k, r = term(); v = op === '+' ? v + r : v - r; } return v; }
    function term() {
      var v = unary();
      while (peek() && (peek().k === '*' || peek().k === '/' || peek().k === '(' || peek().k === 'n' || peek().k === 'w')) {
        var op = peek().k === '*' || peek().k === '/' ? take().k : '*'; // 2(3+4) oder 2π: implizite Multiplikation
        var r = unary();
        if (op === '/') { if (r === 0) fail('Division durch 0'); v = v / r; } else v = v * r;
      }
      return v;
    }
    // Vorzeichen bindet schwaecher als die Potenz (-2^2 = -4), Potenz ist rechtsassoziativ (2^3^2 = 512)
    function unary() { if (peek() && peek().k === '-') { take(); return -unary(); } if (peek() && peek().k === '+') { take(); return unary(); } return power(); }
    function power() { var b = postfix(); if (peek() && peek().k === '^') { take(); var e = unary(); b = Math.pow(b, e); } return b; }
    function postfix() { var v = primary(); while (peek() && peek().k === '%') { take(); v = v / 100; } return v; }
    function primary() {
      var x = peek(); if (!x) fail('Ausdruck unvollstaendig');
      if (x.k === 'n') { take(); return x.v; }
      if (x.k === '(') { take(); var v = expr(); take(')'); return v; }
      if (x.k === 'w') {
        take();
        if (CONST[x.v] !== undefined) return CONST[x.v];
        var f = FN[x.v] || FN[x.v.toLowerCase()]; if (!f) fail('Unbekannt: „' + x.v + '“');
        var arg; if (peek() && peek().k === '(') { take(); arg = expr(); take(')'); } else arg = unary();
        var r = f(arg); if (!isFinite(r)) fail(x.v + ' nicht definiert fuer ' + fmt(arg)); return r;
      }
      if (x.k === ')') fail('Klammer fehlt: (');
      fail('Operator ohne Zahl');
    }
    var v = expr();
    if (p < t.length) fail(t[p].k === ')' ? 'Klammer zu viel: )' : 'Ausdruck unvollstaendig');
    if (!isFinite(v)) fail(isNaN(v) ? 'Nicht berechenbar' : 'Ergebnis zu gross');
    return v;
  }
  function fmt(v) {
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e12 || a < 1e-6) return v.toExponential(4).replace('e+', 'e');
    var s = +v.toPrecision(10); return String(s);
  }

  /* ---------- Oberflaeche ---------- */
  var el = null, hist = [], onLog = null;
  var KEYS = [['(', ')', '√', '^'], ['7', '8', '9', '÷'], ['4', '5', '6', '×'], ['1', '2', '3', '−'], ['0', ',', '%', '+'], ['π', 'x²', 'C', '⌫']];
  function build() {
    el = document.createElement('div'); el.id = 'calc'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Taschenrechner');
    el.innerHTML = '<div class="calc-back"></div><div class="calc-box"><div class="calc-head"><b>Taschenrechner</b><span class="dim small">Enter = rechnen · Esc = schliessen</span><button class="calc-x" aria-label="Schliessen" title="Schliessen">×</button></div>' +
      '<ol class="calc-hist" aria-label="Letzte Rechnungen"></ol>' +
      '<input class="calc-in" id="calcIn" autocomplete="off" spellcheck="false" placeholder="z. B. 15 · 0,5 % + 0,1  oder  √(3² + 3,54²)" aria-label="Rechnung">' +
      '<div class="calc-out" id="calcOut" aria-live="polite"></div>' +
      '<div class="calc-keys">' + KEYS.map(function (row) { return row.map(function (k) { return '<button data-k="' + k + '"' + (/[÷×−+^%√]/.test(k) ? ' class="op"' : k === 'C' || k === '⌫' ? ' class="fn"' : '') + '>' + k + '</button>'; }).join(''); }).join('') +
      '<button data-k="=" class="eq">=</button></div>' +
      '<div class="calc-fn">' + ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'abs('].map(function (k) { return '<button data-k="' + k + '">' + k.replace('(', '') + '</button>'; }).join('') + '<span class="dim small">Winkel in Grad · 4k7 = 4700 · 100n = 100·10⁻⁹</span></div></div>';
    document.body.appendChild(el);
    var inp = el.querySelector('#calcIn');
    el.querySelector('.calc-back').onclick = close; el.querySelector('.calc-x').onclick = close;
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.preventDefault(); close(); } });
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); run(); } });
    inp.addEventListener('input', function () { show('', false); });
    el.querySelectorAll('[data-k]').forEach(function (b) {
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); }); // Fokus bleibt im Eingabefeld
      b.onclick = function () { key(b.dataset.k); };
    });
    el.querySelector('.calc-box').addEventListener('click', function (ev) { ev.stopPropagation(); });
  }
  function insert(txt) {
    var inp = el.querySelector('#calcIn'), s = inp.selectionStart || inp.value.length, e = inp.selectionEnd || s;
    inp.value = inp.value.slice(0, s) + txt + inp.value.slice(e); inp.selectionStart = inp.selectionEnd = s + txt.length; inp.focus(); show('', false);
  }
  function key(k) {
    var inp = el.querySelector('#calcIn');
    if (k === '=') return run();
    if (k === 'C') { inp.value = ''; show('', false); inp.focus(); return; }
    if (k === '⌫') { var s = inp.selectionStart || inp.value.length; if (s > 0) { inp.value = inp.value.slice(0, s - 1) + inp.value.slice(inp.selectionEnd || s); inp.selectionStart = inp.selectionEnd = s - 1; } inp.focus(); show('', false); return; }
    if (k === 'x²') return insert('²');
    if (k === '√') return insert('√(');
    insert(k);
  }
  function show(text, isErr) { var o = el.querySelector('#calcOut'); o.textContent = text; o.classList.toggle('err', !!isErr); o.classList.toggle('ok', !!text && !isErr); }
  function run() {
    var inp = el.querySelector('#calcIn'), src = inp.value;
    try {
      var v = evaluate(src), out = fmt(v);
      show('= ' + out, false);
      hist.unshift({ q: src, a: out }); hist = hist.slice(0, 5); renderHist();
      inp.value = out; inp.select();
      if (onLog) onLog('calc', { expr: src.slice(0, 60) });
    } catch (e) { if (!e.calc) console.error(e); show(e.calc ? e.message : 'Nicht berechenbar', true); }
  }
  function renderHist() {
    var h = el.querySelector('.calc-hist');
    h.innerHTML = hist.map(function (x) { return '<li><button title="Rechnung uebernehmen">' + esc(x.q) + '</button><b>= ' + esc(x.a) + '</b></li>'; }).join('');
    Array.prototype.forEach.call(h.querySelectorAll('button'), function (b, i) { b.onclick = function () { el.querySelector('#calcIn').value = hist[i].q; el.querySelector('#calcIn').focus(); show('', false); }; });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function open(preset) {
    if (!el) build();
    el.hidden = false; document.body.classList.add('calc-open');
    var inp = el.querySelector('#calcIn'); if (preset !== undefined) inp.value = preset; inp.focus();
  }
  function close() { if (!el) return; el.hidden = true; document.body.classList.remove('calc-open'); }
  function toggle() { if (!el || el.hidden) open(); else close(); }

  root.DQCalc = { evaluate: evaluate, fmt: fmt, open: open, close: close, toggle: toggle, get isOpen() { return !!el && !el.hidden; }, get history() { return hist; }, set onLog(f) { onLog = f; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DQCalc;
})(typeof window !== 'undefined' ? window : globalThis);

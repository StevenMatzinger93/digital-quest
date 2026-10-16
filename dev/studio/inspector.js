/* Digital Quest Studio – Bauteil-Inspektor (Stufe 5)
 * Rechts, nach dem Entwurf: Funktion und Schaltzeichen, Analysetabelle (Wahrheitstabelle, aktive Zeile hervorgehoben), Ansteuertabelle mit
 * Don't-Care als X und Zustandsfolgediagramm. Die Begriffe stammen aus Stevens Lehrmittel und der «FlipFlop Lernwelt».
 * Alle Tabellen werden aus den Definitionen der Engine berechnet (E.PARTS[type].logic / .ff, E.ctrNext) – nichts ist von Hand eingetragen. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E;
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var b2 = function (x) { return x ? '1' : '0'; };
  var NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  function fullProps(p) { return Object.assign({}, E.PARTS[p.type].props, p.props || {}); }

  var FUNKTION = {
    not: 'NICHT-Glied (Inverter): Der Ausgang ist 1, wenn der Eingang 0 ist. Y = Ā.',
    and: 'UND-Glied (Konjunktion): Der Ausgang ist 1, nur wenn <b>alle</b> Eingänge 1 sind. Y = A ∧ B.',
    or: 'ODER-Glied (Disjunktion): Der Ausgang ist 1, wenn <b>mindestens ein</b> Eingang 1 ist. Y = A ∨ B.',
    nand: 'NAND (NICHT-UND): Der Ausgang ist 0, nur wenn alle Eingänge 1 sind. Y = ¬(A ∧ B).',
    nor: 'NOR (NICHT-ODER): Der Ausgang ist 1, nur wenn alle Eingänge 0 sind. Y = ¬(A ∨ B).',
    xor: 'XOR (Antivalenz): Der Ausgang ist 1, wenn eine <b>ungerade Zahl</b> von Eingängen 1 ist; bei zwei Eingängen: wenn sie verschieden sind.',
    xnor: 'XNOR (Äquivalenz): Der Ausgang ist 1, wenn eine <b>gerade Zahl</b> von Eingängen 1 ist; bei zwei Eingängen: wenn sie gleich sind.',
    dff: 'D-Flipflop: Bei der aktiven Taktflanke übernimmt Q den Wert von D und speichert ihn. A = D (AV: Ausgang vorher, A: Ausgang danach).',
    tff: 'T-Flipflop: Bei der aktiven Taktflanke kippt Q, wenn T = 1 ist; bei T = 0 bleibt Q. Teilt die Takt­frequenz durch 2.',
    jkff: 'JK-Flipflop: J = 1 setzt, K = 1 setzt zurück, J = K = 1 kippt, J = K = 0 speichert (bei aktiver Taktflanke).',
    rsff: 'RS-Flipflop (taktgesteuert): S = 1 setzt, R = 1 setzt zurück, S = R = 0 speichert. S = R = 1 ist verboten.',
    jkms: 'JK-Master-Slave-Flipflop: Der Master nimmt J und K bei C = 1 auf, der Ausgang ändert sich erst bei der fallenden Flanke von C.',
    ctr_async: 'Asynchroner Dualzähler (Ripple-Zähler): Jede Stufe taktet die nächste, die höheren Bits kippen mit Laufzeit später.',
    ctr_sync: 'Synchroner Dualzähler: Alle Flipflops haben denselben Takt, alle Bits wechseln gleichzeitig.',
    ctr_bcd: 'Synchroner Dezimalzähler: zählt 0 bis 9 und springt auf 0 (BCD-Code).',
    ctr_johnson: 'Johnson-Zähler: Schieberegister mit invertierter Rückkopplung; n Flipflops ergeben 2n Zustände.',
    ctr_mod: 'Modulo-n-Zähler: zählt von 0 bis n − 1 und springt auf 0.',
    dec7: 'BCD-7-Segment-Dekoder: wandelt den BCD-Code an A bis D in die Segmente a bis g. Die Codes 10 bis 15 bleiben dunkel.',
    seg7: '7-Segment-Anzeige: Jedes Segment leuchtet bei 1 am zugehörigen Eingang.',
    clock: 'Taktgeber: Rechteckspannung 0 V / 5 V mit einstellbarer Frequenz.',
    logicin: 'Pegelschalter: gibt per Klick 1 (5 V) oder 0 (0 V) aus.', logicled: 'Logikanzeige: leuchtet bei 1 am Eingang.'
  };

  function levelOf(pin) {
    var net = S.sim.net, r = S.sim.res; if (!net || !r) return false;
    var n = net.pinNode[pin]; return n !== undefined && (r.nodeV[n] || 0) > E.LOGIC.vth;
  }
  function table(cls, head, rowsHtml) { return '<table class="itab ' + cls + '"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsHtml + '</tbody></table>'; }
  function tr(key, cells) { return '<tr data-k="' + key + '">' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }

  /* ---------- Gatter, Dekoder: Analysetabelle ---------- */
  function gateTable(p) {
    var d = E.PARTS[p.type], pins = E.pinsOf(p.type, fullProps(p)).filter(function (x) { return x !== 'out'; }), n = pins.length, h = '';
    if (n > 6) return '<p class="hint">Mehr als 6 Eingänge: Tabelle zu gross, die Funktion steht oben.</p>';
    for (var i = 0; i < (1 << n); i++) {
      var ins = pins.map(function (x, k) { return !!((i >> (n - 1 - k)) & 1); }), out = d.logic(ins);
      h += tr(ins.map(b2).join(''), ins.map(b2).concat([b2(out)]));
    }
    return table('gate', pins.map(function (x, k) { return n === 1 ? 'A' : NAMES[k]; }).concat(['Y']), h);
  }
  function dec7Table() {
    var d = E.PARTS.dec7, h = '';
    for (var i = 0; i < 16; i++) { var ins = [0, 1, 2, 3].map(function (k) { return !!((i >> k) & 1); }), out = d.logic(ins); h += tr(ins.slice().reverse().map(b2).join(''), ins.slice().reverse().map(b2).concat(out.map(b2))); }
    return table('gate', ['D', 'C', 'B', 'A', 'a', 'b', 'c', 'd', 'e', 'f', 'g'], h);
  }

  /* ---------- Flipflops ---------- */
  function ffRows(d) {
    var pins = d.ffIns, n = pins.length, rows = [];
    for (var q = 0; q < 2; q++) for (var i = 0; i < (1 << n); i++) {
      var ins = pins.map(function (x, k) { return !!((i >> (n - 1 - k)) & 1); }), forb = !!d.rs && ins[0] && ins[1];
      rows.push({ q: !!q, ins: ins, qn: forb ? null : !!d.ff(!!q, ins) });
    }
    return rows;
  }
  function ffAnalysis(p) {
    var d = E.PARTS[p.type], pins = d.ffIns, h = '';
    ffRows(d).forEach(function (r) { h += tr(r.ins.map(b2).join('') + b2(r.q), r.ins.map(b2).concat([b2(r.q), r.qn === null ? '–' : b2(r.qn)])); });
    return table('ff', pins.concat(['AV', 'A']), h);
  }
  /* Ansteuertabelle: welche Eingaenge braucht der Uebergang AV → A? Eingaenge, die beide Werte erlauben, sind X (Don't-Care) */
  function excitation(d) {
    var pins = d.ffIns, rows = ffRows(d), out = [];
    [[false, false], [false, true], [true, false], [true, true]].forEach(function (t) {
      var ok = rows.filter(function (r) { return r.q === t[0] && r.qn === t[1]; }), vals = pins.map(function (x, k) {
        var s = {}; ok.forEach(function (r) { s[r.ins[k] ? 1 : 0] = 1; }); return s[0] && s[1] ? 'X' : s[1] ? '1' : '0';
      });
      out.push({ q: t[0], qn: t[1], vals: vals });
    });
    return out;
  }
  function ffExcitation(p) {
    var d = E.PARTS[p.type], ex = excitation(d), h = '';
    ex.forEach(function (r) { h += tr('x' + b2(r.q) + b2(r.qn), [b2(r.q), b2(r.qn)].concat(r.vals)); });
    return table('ffx', ['AV', 'A'].concat(d.ffIns), h);
  }
  /* Zustandsfolgediagramm: zwei Zustaende Q = 0 und Q = 1, Pfeile beschriftet mit den Eingaben der Ansteuertabelle */
  function ffDiagram(p) {
    var d = E.PARTS[p.type], ex = excitation(d), lab = function (r) { return d.ffIns.join('') + ' = ' + r.vals.join(' '); };
    var s = '<svg class="sfd" viewBox="0 0 280 150" role="img" aria-label="Zustandsfolgediagramm"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0f2d3a"/></marker></defs>';
    s += '<g data-state="0"><circle cx="70" cy="78" r="22"/><text x="70" y="83" text-anchor="middle">0</text></g><g data-state="1"><circle cx="210" cy="78" r="22"/><text x="210" y="83" text-anchor="middle">1</text></g>';
    s += '<path d="M90 66C115 48 165 48 190 66" marker-end="url(#arr)"/><text x="140" y="42" text-anchor="middle">' + esc(lab(ex[1])) + '</text>';
    s += '<path d="M190 90C165 108 115 108 90 90" marker-end="url(#arr)"/><text x="140" y="124" text-anchor="middle">' + esc(lab(ex[2])) + '</text>';
    s += '<path d="M58 58C40 22 82 22 76 56" marker-end="url(#arr)"/><text x="62" y="16" text-anchor="middle">' + esc(lab(ex[0])) + '</text>';
    s += '<path d="M198 58C180 22 222 22 216 56" marker-end="url(#arr)"/><text x="202" y="16" text-anchor="middle">' + esc(lab(ex[3])) + '</text></svg>';
    return s;
  }

  /* ---------- Zaehler ---------- */
  function ctrOrbit(p) {
    var q = fullProps(p), nb = E.ctrBitCount(E.PARTS[p.type], q), lp = { type: p.type, props: q }, bits = E.numToBits(0, nb), start = bits.join(), rows = [];
    for (var k = 0; k < 64; k++) { var nx = E.ctrNext(lp, bits); rows.push({ count: E.ctrCount(lp, bits), bits: bits, next: nx }); bits = nx; if (bits.join() === start) break; }
    return { rows: rows, nb: nb, more: rows.length === 64 };
  }
  function ctrTables(p) {
    var o = ctrOrbit(p), nb = o.nb, qh = [], jh = [], i, h1 = '', h2 = '';
    for (i = nb - 1; i >= 0; i--) { qh.push('Q' + i); jh.push('J' + i, 'K' + i); }
    o.rows.forEach(function (r) {
      var rev = function (b) { return b.slice().reverse().map(b2); }, jk = [];
      // Uebergaenge je Bit: 0→0: J=0 K=X · 0→1: J=1 K=X · 1→0: J=X K=1 · 1→1: J=X K=0
      for (var k = nb - 1; k >= 0; k--) { var a0 = r.bits[k], c0 = r.next[k]; jk.push(a0 ? 'X' : c0 ? '1' : '0', a0 ? (c0 ? '0' : '1') : 'X'); }
      h1 += tr(String(r.count), [r.count].concat(rev(r.bits), [E.ctrCount({ type: p.type, props: fullProps(p) }, r.next)]).concat(rev(r.next)));
      h2 += tr(String(r.count), [r.count].concat(jk));
    });
    var t1 = table('ctr', ['Z'].concat(qh, ['Z⁺'], qh.map(function (x) { return x + '⁺'; })), h1), t2 = table('ctr', ['Z'].concat(jh), h2);
    return { seq: t1, drive: t2, more: o.more, count: o.rows.length };
  }
  function ctrDiagram(p) {
    var o = ctrOrbit(p); if (o.rows.length > 16) return '<p class="hint">Zustandsfolgediagramm bis 16 Zustände – hier ' + (o.more ? 'mehr als 64' : o.rows.length) + '.</p>';
    var n = o.rows.length, R = n > 8 ? 78 : 62, cx = 140, cy = 100, s = '<svg class="sfd" viewBox="0 0 280 200" role="img" aria-label="Zustandsfolgediagramm"><defs><marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0f2d3a"/></marker></defs>';
    function pos(i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; }
    var rr = n > 8 ? 11 : 14;
    o.rows.forEach(function (r, i) {
      var a = pos(i), b = pos((i + 1) % n), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      if (n === 1) return;
      s += '<path d="M' + (a[0] + dx / L * rr).toFixed(1) + ' ' + (a[1] + dy / L * rr).toFixed(1) + 'L' + (b[0] - dx / L * (rr + 2)).toFixed(1) + ' ' + (b[1] - dy / L * (rr + 2)).toFixed(1) + '" marker-end="url(#arr2)"/>';
    });
    o.rows.forEach(function (r, i) { var a = pos(i); s += '<g data-state="' + r.count + '"><circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="' + rr + '"/><text x="' + a[0].toFixed(1) + '" y="' + (a[1] + 4).toFixed(1) + '" text-anchor="middle">' + r.count + '</text></g>'; });
    return s + '</svg>';
  }

  /* ---------- Einbau in den Inspektor ---------- */
  S.inspectorExtra = (function (prev) { return function (p) {
    var h = prev ? prev(p) : '', t = p.type, d = E.PARTS[t];
    h = '<div class="warnbox" id="insForbid" hidden role="alert"></div>' + h;
    if (FUNKTION[t]) h = '<h3>Funktion</h3><p class="fn">' + FUNKTION[t] + '</p>' + h;
    var tables = '';
    if (d.logic && !d.outs) tables = '<h3>Analysetabelle</h3>' + gateTable(p);
    else if (t === 'dec7') tables = '<h3>Analysetabelle</h3><div class="itab-wrap">' + dec7Table() + '</div>';
    else if (d.ff) tables = '<h3>Analysetabelle</h3>' + ffAnalysis(p) + '<h3>Ansteuertabelle</h3>' + ffExcitation(p) + '<p class="hint">X = beliebig (Don\'t-Care). Aktive Zeile: jetziger Zustand.</p><h3>Zustandsfolgediagramm</h3>' + ffDiagram(p);
    else if (d.ctr) { var c = ctrTables(p); tables = '<h3>Zustandsfolgetabelle</h3><div class="itab-wrap">' + c.seq + '</div>' + (c.more ? '<p class="hint">Nur die ersten 64 Zustände.</p>' : '') + '<h3>Ansteuertabelle (JK-Flipflops)</h3><div class="itab-wrap">' + c.drive + '</div><p class="hint">Je Bit: J und K für den Übergang zum nächsten Zustand, X = beliebig.</p><h3>Zustandsfolgediagramm</h3>' + ctrDiagram(p); }
    return h + tables;
  }; })(S.inspectorExtra);

  /* aktive Zeile live hervorheben */
  S.liveInspector = function (p, r) {
    var el = document.getElementById('inspector'); if (!el || !p || !r) return;
    var d = E.PARTS[p.type], key = null, key2 = null, state = null;
    var wb = document.getElementById('insForbid');
    if (wb) { var fl = S.partFaults(p.id), ft = fl.map(function (f) { return S.faultLong(f); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' '); if (wb.hidden === !!ft) wb.hidden = !ft; if (wb.textContent !== ft) wb.textContent = ft; }
    if (d.logic && !d.outs) { var pins = E.pinsOf(p.type, fullProps(p)).filter(function (x) { return x !== 'out'; }); key = pins.map(function (x) { return b2(levelOf(p.id + '.' + x)); }).join(''); }
    else if (p.type === 'dec7') key = ['D', 'C', 'B', 'A'].map(function (x) { return b2(levelOf(p.id + '.' + x)); }).join('');
    else if (d.ff) {
      var q = !!(r.parts[p.id] && r.parts[p.id].q), ins = d.ffIns.map(function (x) { return levelOf(p.id + '.' + x); });
      key = ins.map(b2).join('') + b2(q); var qn = d.ff(q, ins); key2 = b2(q) + b2(qn); state = b2(q);
    } else if (d.ctr) { key = String(r.parts[p.id] ? r.parts[p.id].count : ''); state = key; }
    $$('tr[data-k]', el).forEach(function (row) {
      var on = row.dataset.k === key || (key2 !== null && row.dataset.k === 'x' + key2);
      if (row.classList.contains('act') !== on) row.classList.toggle('act', on);
    });
    $$('g[data-state]', el).forEach(function (g) { var on = g.dataset.state === state; if (g.classList.contains('cur') !== on) g.classList.toggle('cur', on); });
  };
})(window);

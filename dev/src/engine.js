/* Digital Quest – Schaltungs-Engine (window.DQEngine)
 * Knotenanalyse (Nodal Analysis) mit Norton-Ersatz fuer alle Quellen, stueckweise-lineare
 * Dioden/LEDs, Logikgatter (5-V-Logik, implizite Versorgung), Kondensator (Backward Euler),
 * Multimeter (V, A, Ohm, V~ mit AVG/TRMS) mit realistischen Fehlbedienungen und Anzeige wie ein 6000-Digit-DMM,
 * Wechselspannungsquelle (Sinus/Rechteck/Dreieck), Rechenschritt-Verlauf fuer die Zeitlupe.
 * Einheiten: V, A, Ohm, F, s, Hz. Kein DOM – laeuft in Node und im Browser.
 */
(function (root) {
  'use strict';

  var GMIN = 1e-9;            // Leitwert jedes Knotens gegen Masse (verhindert singulaere Matrix)
  var G_OPEN = 1e-12;         // offener Schalter, gesperrte Diode, Gattereingang
  var G_CLOSED = 1e3;         // geschlossener Schalter (1 mOhm)
  var LOGIC = { vcc: 5, vth: 2.5, rout: 25 };
  var METER = { rV: 1e7, rA: 0.1, fuseA: 10, iOhm: 1e-3, olOhm: 40e6, cal: 0.002 }; // cal: Verstaerkungsfehler des Geraets (+0,2 %)
  var TRACE_MAX = 200;        // Zeitlupe: hoechstens so viele Rechenschritte pro Arbeitspunkt speichern

  var LED_COLORS = {
    rot: { vf: 1.8, rgb: '#ff3b30' }, gelb: { vf: 2.0, rgb: '#ffd60a' },
    gruen: { vf: 2.1, rgb: '#32d74b' }, blau: { vf: 3.0, rgb: '#0a84ff' }, weiss: { vf: 3.1, rgb: '#f5f5f7' }
  };

  /* Bauteilkatalog: Pins, Standardwerte, Namenspraefix. Geometrie liegt im Editor. */
  var PARTS = {
    ground:    { label: 'Masse', prefix: 'GND', pins: ['g'], props: {} },
    battery:   { label: 'Spannungsquelle', prefix: 'B', pins: ['p', 'n'], props: { value: 9, ri: 0.05, imax: 3 }, unit: 'V' },
    resistor:  { label: 'Widerstand', prefix: 'R', pins: ['a', 'b'], props: { value: 1000, pmax: 0.25 }, unit: 'Ω' },
    pot:       { label: 'Potentiometer', prefix: 'P', pins: ['a', 'w', 'b'], props: { value: 10000, pos: 0.5, pmax: 0.25 }, unit: 'Ω' },
    lamp:      { label: 'Lampe', prefix: 'H', pins: ['a', 'b'], props: { value: 60, pnom: 1.35 }, unit: 'Ω' },
    switch:    { label: 'Schalter', prefix: 'S', pins: ['a', 'b'], props: { closed: false } },
    button:    { label: 'Taster', prefix: 'T', pins: ['a', 'b'], props: { closed: false } },
    led:       { label: 'LED', prefix: 'D', pins: ['a', 'k'], props: { color: 'rot', rs: 10, imax: 0.03, inom: 0.02 } },
    diode:     { label: 'Diode', prefix: 'V', pins: ['a', 'k'], props: { vf: 0.7, rs: 1, imax: 1 } },
    capacitor: { label: 'Kondensator', prefix: 'C', pins: ['a', 'b'], props: { value: 100e-6 }, unit: 'F' },
    ammeter:   { label: 'Strommesser', prefix: 'A', pins: ['a', 'b'], props: {} },
    clock:     { label: 'Taktgeber', prefix: 'CLK', pins: ['out'], props: { freq: 1 }, unit: 'Hz' },
    acsource:  { label: 'Wechselspannungsquelle', prefix: 'G', pins: ['p', 'n'], props: { value: 10, freq: 50, shape: 'sine', offset: 0, ri: 0.05, imax: 3 }, unit: 'V' }, // value = Scheitelwert Û
    not:  { label: 'NICHT', prefix: 'U', pins: ['in', 'out'], props: {}, logic: function (i) { return !i[0]; } },
    and:  { label: 'UND', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return i[0] && i[1]; } },
    or:   { label: 'ODER', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return i[0] || i[1]; } },
    nand: { label: 'NAND', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return !(i[0] && i[1]); } },
    nor:  { label: 'NOR', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return !(i[0] || i[1]); } },
    xor:  { label: 'XOR', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return i[0] !== i[1]; } }
  };
  var SOURCES = { battery: 1, clock: 1, acsource: 1 };
  /* Momentanwert einer Wechselspannungsquelle zur Zeit t (Kurvenform sine | square | triangle, Scheitelwert value, Gleichanteil offset) */
  function wave(q, t) {
    var ph = ((t * q.freq) % 1 + 1) % 1, w;
    if (q.shape === 'square') w = ph < 0.5 ? 1 : -1;
    else if (q.shape === 'triangle') w = ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
    else w = Math.sin(2 * Math.PI * ph);
    return (q.offset || 0) + q.value * w;
  }

  function def(type) { var d = PARTS[type]; if (!d) throw new Error('Unbekanntes Bauteil: ' + type); return d; }
  function props(p) { var o = {}, d = def(p.type).props, k; for (k in d) o[k] = d[k]; for (k in (p.props || {})) o[k] = p.props[k]; if (p.value !== undefined) o.value = p.value; return o; }

  /* ---------- Netzliste aus Editor-Layout ----------
   * layout = { parts:[{id,type,value?,props?,x,y,rot}], wires:[{from:'R1.a', to:'B1.p'}] } */
  function buildNetlist(layout, extra) {
    var parent = {};
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function add(x) { if (parent[x] === undefined) parent[x] = x; }
    function union(a, b) { add(a); add(b); var ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }
    var parts = [], byId = {};
    (layout.parts || []).forEach(function (p) {
      var d = def(p.type);
      if (byId[p.id]) throw new Error('Doppelte Bauteil-ID: ' + p.id);
      d.pins.forEach(function (pin) { add(p.id + '.' + pin); });
      var q = { id: p.id, type: p.type, props: props(p), n: {} };
      parts.push(q); byId[p.id] = q;
    });
    var wires = (layout.wires || []).concat(extra || []);
    wires.forEach(function (w) {
      [w.from, w.to].forEach(function (pid) { if (parent[pid] === undefined) throw new Error('Unbekannter Anschluss: ' + pid); });
      union(w.from, w.to);
    });
    var groundRoots = {}, autoGround = false;
    parts.forEach(function (p) { if (p.type === 'ground') groundRoots[find(p.id + '.g')] = true; });
    if (!Object.keys(groundRoots).length) { // ohne Masse-Symbol: Minuspol der ersten Quelle ist Bezugspunkt 0 V
      var src = parts.filter(function (p) { return p.type === 'battery' || p.type === 'acsource'; })[0];
      if (src) { groundRoots[find(src.id + '.n')] = true; autoGround = true; }
    }
    var names = {}, count = 0, pinNode = {};
    Object.keys(parent).forEach(function (pid) {
      var r = find(pid);
      if (!names[r]) names[r] = groundRoots[r] ? '0' : 'N' + (++count);
      pinNode[pid] = names[r];
    });
    parts.forEach(function (p) { def(p.type).pins.forEach(function (pin) { p.n[pin] = pinNode[p.id + '.' + pin]; }); });
    var nodes = [];
    Object.keys(names).forEach(function (r) { if (names[r] !== '0') nodes.push(names[r]); });
    nodes.sort(function (a, b) { return +a.slice(1) - +b.slice(1); });
    return { parts: parts, byId: byId, nodes: nodes, pinNode: pinNode, hasGround: Object.keys(groundRoots).length > 0 && !autoGround, autoGround: autoGround };
  }

  /* ---------- Lineares Gleichungssystem (Gauss mit Pivotsuche) ---------- */
  function solveLinear(A, z) {
    var n = z.length, i, j, k;
    for (i = 0; i < n; i++) {
      var max = i;
      for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[max][i])) max = k;
      if (Math.abs(A[max][i]) < 1e-18) return null;
      var t = A[i]; A[i] = A[max]; A[max] = t; var tz = z[i]; z[i] = z[max]; z[max] = tz;
      for (k = i + 1; k < n; k++) {
        var f = A[k][i] / A[i][i]; if (f === 0) continue;
        for (j = i; j < n; j++) A[k][j] -= f * A[i][j];
        z[k] -= f * z[i];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) { var s = z[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
    return x;
  }

  /* burnInfo: Werte im Moment des Durchbrennens (fuer die Diagnose), fuseInfo: Strom beim Ausloesen der Multimeter-Sicherung */
  function newState() { return { burnt: {}, vC: {}, logic: {}, diode: {}, fuse: false, t: 0, burnInfo: {}, fuseInfo: null }; }

  /* ---------- Loeser fuer einen Arbeitspunkt / Zeitschritt ----------
   * opts: { state, dt (null = Gleichstrom-Arbeitspunkt), t, meter:{mode,a,b} (Knoten), zeroSources, inject:{a,b,i},
   *         trace: [] – nimmt jeden Rechenschritt auf: {iter, kind:'diode'|'gate'|'done'|'unstable', changed:[{id,to}], res} (max. TRACE_MAX) } */
  function solve(net, opts) {
    opts = opts || {};
    var st = opts.state || newState();
    var idx = {}; net.nodes.forEach(function (n, i) { idx[n] = i; });
    var N = net.nodes.length;
    var dt = opts.dt || null, t = opts.t || 0;
    var diode = {}, logic = {};
    net.parts.forEach(function (p) {
      if (p.type === 'led' || p.type === 'diode') diode[p.id] = !!st.diode[p.id];
      if (def(p.type).logic) logic[p.id] = st.logic[p.id] !== undefined ? st.logic[p.id] : false;
    });
    var V = null, iter = 0, converged = false, oscillating = false;

    function build() {
      var A = [], z = [], i;
      for (i = 0; i < N; i++) { A.push(new Float64Array(N)); z.push(0); A[i][i] += GMIN; }
      function G(a, b, g) {
        var ia = idx[a], ib = idx[b];
        if (ia !== undefined) A[ia][ia] += g;
        if (ib !== undefined) A[ib][ib] += g;
        if (ia !== undefined && ib !== undefined) { A[ia][ib] -= g; A[ib][ia] -= g; }
      }
      function I(a, b, cur) { // Strom cur wird in Knoten a eingespeist und aus b entnommen
        if (idx[a] !== undefined) z[idx[a]] += cur;
        if (idx[b] !== undefined) z[idx[b]] -= cur;
      }
      function norton(p, n, v, r) { var g = 1 / r; G(p, n, g); I(p, n, v * g); }
      net.parts.forEach(function (p) {
        var q = p.props, n = p.n;
        if (st.burnt[p.id]) { return; }
        switch (p.type) {
          case 'resistor': G(n.a, n.b, 1 / Math.max(q.value, 1e-3)); break;
          case 'lamp': G(n.a, n.b, 1 / Math.max(q.value, 1e-3)); break;
          case 'pot': G(n.a, n.w, 1 / Math.max(q.value * q.pos, 1e-3)); G(n.w, n.b, 1 / Math.max(q.value * (1 - q.pos), 1e-3)); break;
          case 'switch': case 'button': G(n.a, n.b, q.closed ? G_CLOSED : G_OPEN); break;
          case 'ammeter': G(n.a, n.b, 1 / METER.rA); break;
          case 'battery': norton(n.p, n.n, opts.zeroSources ? 0 : q.value, q.ri); break;
          case 'acsource': norton(n.p, n.n, opts.zeroSources ? 0 : wave(q, t), q.ri); break;
          case 'led': case 'diode':
            var vf = p.type === 'led' ? LED_COLORS[q.color].vf : q.vf;
            if (diode[p.id]) norton(n.a, n.k, vf, q.rs); else G(n.a, n.k, G_OPEN);
            break;
          case 'capacitor':
            if (dt) { var gc = q.value / dt; G(n.a, n.b, gc); I(n.a, n.b, gc * (st.vC[p.id] || 0)); }
            else G(n.a, n.b, G_OPEN);
            break;
          case 'clock':
            var high = opts.zeroSources ? false : (Math.floor(t * q.freq * 2) % 2 === 0);
            norton(n.out, '0', high ? LOGIC.vcc : 0, LOGIC.rout);
            break;
          default:
            if (def(p.type).logic) {
              def(p.type).pins.forEach(function (pin) { if (pin !== 'out') G(n[pin], '0', G_OPEN); });
              norton(n.out, '0', (logic[p.id] && !opts.zeroSources) ? LOGIC.vcc : 0, LOGIC.rout);
            }
        }
      });
      if (opts.meter) {
        var m = opts.meter;
        if (m.mode === 'V') G(m.a, m.b, 1 / METER.rV);
        if (m.mode === 'A' && !st.fuse) G(m.a, m.b, 1 / METER.rA);
      }
      if (opts.inject) I(opts.inject.a, opts.inject.b, opts.inject.i);
      return { A: A, z: z };
    }
    function volt(node) { return node === '0' || idx[node] === undefined ? 0 : V[idx[node]]; }

    var trace = opts.trace;
    function record(kind, changed) { // Zustand dieses Rechenschritts fuer die Zeitlupe festhalten
      if (!trace) return;
      trace.push({ iter: iter, kind: kind, changed: changed, res: evaluate() });
      if (trace.length > TRACE_MAX) trace.shift();
    }
    for (iter = 0; iter < 400; iter++) {
      var sys = build();
      var x = solveLinear(sys.A, sys.z);
      if (!x) throw new Error('Gleichungssystem nicht loesbar');
      V = x;
      var changed = [];
      net.parts.forEach(function (p) {
        if (st.burnt[p.id] || diode[p.id] === undefined) return;
        var q = p.props, vf = p.type === 'led' ? LED_COLORS[q.color].vf : q.vf;
        var vak = volt(p.n.a) - volt(p.n.k);
        if (!diode[p.id] && vak > vf + 1e-9) changed.push({ id: p.id, to: true });
        else if (diode[p.id] && vak < vf - 1e-9) changed.push({ id: p.id, to: false });
      });
      if (changed.length) { record('diode', changed); changed.forEach(function (c) { diode[c.id] = c.to; }); continue; }
      // Gatter einzeln nachfuehren (Gauss-Seidel) – stabil fuer Speicherschaltungen
      var gateChanged = null;
      for (var gi = 0; gi < net.parts.length && !gateChanged; gi++) {
        var g = net.parts[gi], d = def(g.type);
        if (!d.logic || st.burnt[g.id]) continue;
        var ins = d.pins.filter(function (pin) { return pin !== 'out'; }).map(function (pin) { return volt(g.n[pin]) > LOGIC.vth; });
        var out = !!d.logic(ins);
        if (out !== logic[g.id]) gateChanged = { id: g.id, to: out };
      }
      if (gateChanged) { record('gate', [gateChanged]); logic[gateChanged.id] = gateChanged.to; continue; }
      converged = true; break;
    }
    if (!converged) oscillating = true;
    var res = evaluate();
    record(converged ? 'done' : 'unstable', []);
    return { res: res, V: res.nodeV, diode: diode, logic: logic };

    // ---------- Auswertung (auch fuer jeden Zwischenschritt der Zeitlupe) ----------
    function evaluate() {
    var nodeV = { '0': 0 }; net.nodes.forEach(function (n) { nodeV[n] = volt(n); });
    var res = { nodeV: nodeV, parts: {}, faults: [], converged: converged, oscillating: oscillating };
    net.parts.forEach(function (p) {
      var q = p.props, n = p.n, r = { burnt: !!st.burnt[p.id] };
      function across(a, b) { return volt(a) - volt(b); }
      switch (p.type) {
        case 'resistor': case 'lamp': r.v = across(n.a, n.b); r.i = r.burnt ? 0 : r.v / Math.max(q.value, 1e-3); r.p = r.v * r.i; break;
        case 'pot': r.v = across(n.a, n.b); r.vw = across(n.w, n.b); r.i = across(n.a, n.w) / Math.max(q.value * q.pos, 1e-3); r.p = Math.abs(r.v * r.i); break;
        case 'switch': case 'button': r.v = across(n.a, n.b); r.i = r.v * (q.closed ? G_CLOSED : G_OPEN); break;
        case 'ammeter': r.v = across(n.a, n.b); r.i = r.v / METER.rA; break;
        case 'battery': r.v = across(n.p, n.n); r.i = r.burnt ? 0 : (q.value - r.v) / q.ri; r.p = r.v * r.i; break;
        case 'acsource': r.u0 = opts.zeroSources ? 0 : wave(q, t); r.v = across(n.p, n.n); r.i = (r.u0 - r.v) / q.ri; r.p = r.v * r.i; break;
        case 'led': case 'diode':
          var vf = p.type === 'led' ? LED_COLORS[q.color].vf : q.vf;
          r.v = across(n.a, n.k);
          r.i = (!r.burnt && diode[p.id]) ? (r.v - vf) / q.rs : 0; r.p = r.v * r.i; r.vf = vf;
          r.on = r.i > 1e-5; // leitend und mehr als 10 uA
          if (p.type === 'led') r.brightness = r.on ? Math.min(1, r.i / q.inom) : 0;
          break;
        case 'capacitor': r.v = across(n.a, n.b); r.i = dt ? q.value / dt * (r.v - (st.vC[p.id] || 0)) : 0; break;
        case 'clock': r.v = volt(n.out); r.high = r.v > LOGIC.vth; break;
        default: if (def(p.type).logic) { r.out = logic[p.id]; r.v = volt(n.out); }
      }
      res.parts[p.id] = r;
    });
    return res;
    }
  }

  /* Pruefen auf Schaeden, Zustand fortschreiben. Gibt Ergebnis zurueck (wird ggf. mehrfach geloest). */
  function step(net, state, opts) {
    opts = opts || {};
    state = state || newState();
    var out, guard = 0, trace = opts.trace ? [] : null;
    for (;;) {
      out = solve(net, { state: state, dt: opts.dt, t: state.t, meter: opts.meter, trace: trace });
      var newDamage = false, faults = [];
      net.parts.forEach(function (p) {
        var r = out.res.parts[p.id], q = p.props;
        var bi = state.burnInfo || (state.burnInfo = {});
        if (state.burnt[p.id]) { if (p.type === 'led' || p.type === 'lamp') faults.push(Object.assign({ code: p.type === 'led' ? 'LED_BURNT' : 'LAMP_BURNT', part: p.id }, bi[p.id] || {})); return; }
        if (p.type === 'led' && r.i > q.imax) { state.burnt[p.id] = true; newDamage = true; bi[p.id] = { i: r.i, v: r.v, imax: q.imax, vf: r.vf }; faults.push(Object.assign({ code: 'LED_BURNT', part: p.id }, bi[p.id])); }
        if (p.type === 'led' && r.v < -5) faults.push({ code: 'LED_REVERSE', part: p.id, v: r.v, vmax: 5 });
        if ((p.type === 'battery' || p.type === 'acsource') && Math.abs(r.i) > q.imax) faults.push({ code: 'SHORT', part: p.id, i: r.i, imax: q.imax, u: q.value, ri: q.ri });
        if ((p.type === 'resistor' || p.type === 'pot') && Math.abs(r.p) > q.pmax) faults.push({ code: 'OVERLOAD', part: p.id, p: r.p, pmax: q.pmax, v: r.v, i: r.i, r: q.value });
        if (p.type === 'lamp' && Math.abs(r.p) > q.pnom * 2) { state.burnt[p.id] = true; newDamage = true; bi[p.id] = { p: r.p, v: r.v, pnom: q.pnom }; faults.push(Object.assign({ code: 'LAMP_BURNT', part: p.id }, bi[p.id])); }
        if (p.type === 'ammeter' && Math.abs(r.i) > METER.fuseA) faults.push({ code: 'AMMETER_OVERLOAD', part: p.id, i: r.i, imax: METER.fuseA });
      });
      if (opts.meter && opts.meter.mode === 'A' && !state.fuse) {
        var im = (out.V[opts.meter.a] - out.V[opts.meter.b]) / METER.rA;
        if (Math.abs(im) > METER.fuseA) { state.fuse = true; state.fuseInfo = { i: im, imax: METER.fuseA }; newDamage = true; }
      }
      if (out.res.oscillating) faults.push({ code: 'UNSTABLE' });
      if (!net.hasGround && !net.autoGround && net.parts.some(function (p) { return def(p.type).logic || p.type === 'clock'; })) faults.push({ code: 'NO_GROUND' });
      out.res.faults = faults;
      if (!newDamage || ++guard > 20) break;
    }
    state.diode = out.diode; state.logic = out.logic;
    if (opts.dt) {
      net.parts.forEach(function (p) { if (p.type === 'capacitor') state.vC[p.id] = out.res.parts[p.id].v; });
      state.t += opts.dt;
    }
    out.res.t = state.t;
    if (trace) out.res.trace = trace;
    return out.res;
  }

  /* ---------- Multimeter ----------
   * probe: { mode:'V'|'A'|'R', a:'R1.a' (rote Spitze), b:'R1.b' (schwarze Spitze) } */
  function fmt(v, unit) {
    if (!isFinite(v)) return 'OL';
    var a = Math.abs(v), pre = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ']];
    if (a < 5e-10) return '0.000 ' + unit;
    for (var i = 0; i < pre.length; i++) if (a >= pre[i][0] || i === pre.length - 1) {
      var x = v / pre[i][0]; return (Math.abs(x) >= 100 ? x.toFixed(1) : Math.abs(x) >= 10 ? x.toFixed(2) : x.toFixed(3)) + ' ' + pre[i][1] + unit;
    }
  }
  /* ---------- Anzeige wie ein 6000-Digit-Multimeter ----------
   * Automatische Bereichswahl, Kalibrierfehler METER.cal und Flackern der letzten Stelle (±1 Digit).
   * rng: Zufallsquelle (Standard Math.random, 0 = ohne Rauschen). Gibt {text, value, range} zurueck. */
  var DMM_RANGES = {
    V: [[0.6, 1e-3, 'mV', 1], [6, 1, 'V', 3], [60, 1, 'V', 2], [600, 1, 'V', 1], [1000, 1, 'V', 0]],
    A: [[6e-3, 1e-3, 'mA', 3], [60e-3, 1e-3, 'mA', 2], [0.6, 1e-3, 'mA', 1], [6, 1, 'A', 3], [10, 1, 'A', 2]],
    'Ω': [[600, 1, 'Ω', 1], [6e3, 1e3, 'kΩ', 3], [60e3, 1e3, 'kΩ', 2], [600e3, 1e3, 'kΩ', 1], [6e6, 1e6, 'MΩ', 3], [40e6, 1e6, 'MΩ', 2]]
  };
  function dmm(value, unit, rng) {
    var rs = DMM_RANGES[unit]; if (!rs) return { text: fmt(value, unit), value: value };
    if (!isFinite(value)) return { text: 'OL', value: Infinity };
    var a = Math.abs(value), r = rs.filter(function (x) { return a < x[0]; })[0];
    if (!r) return { text: 'OL', value: Infinity, range: rs[rs.length - 1] };
    var rnd = rng === 0 ? function () { return 0.5; } : (rng || Math.random), lsd = Math.pow(10, -r[3]);
    var d = value / r[1] * (1 + METER.cal), u = rnd();
    d += (u < 0.25 ? -1 : u > 0.75 ? 1 : 0) * lsd;
    d = Math.round(d / lsd) * lsd; if (Math.abs(d) < lsd / 2) d = 0;
    return { text: d.toFixed(r[3]) + ' ' + r[2], value: d * r[1], range: r };
  }

  /* ---------- Wechselgroessen ----------
   * Simuliert einige Perioden der langsamsten Wechselquelle (Wechselspannungsquelle, Taktgeber) und wertet die letzte aus:
   * dc = Mittelwert (Anzeige V⎓), rms = Echt-Effektivwert des Wechselanteils (TRMS),
   * avg = Mittelwert-Gleichrichter, auf Sinus-Effektivwert skaliert (AVG: 1,1107 · Gleichrichtwert), peak, pp.
   * probe: {a, b} Pins. Ohne Wechselquelle: static:true, Wechselanteil 0. */
  var FORM_FACTOR_SINE = Math.PI / (2 * Math.SQRT2);
  function acMeasure(layout, probe, opts) {
    opts = opts || {};
    var net = buildNetlist(layout), freqs = [];
    net.parts.forEach(function (p) { if ((p.type === 'acsource' || p.type === 'clock') && p.props.freq > 0) freqs.push(p.props.freq); });
    if (net.pinNode[probe.a] === undefined || (probe.b && net.pinNode[probe.b] === undefined)) return { ok: false, error: 'Messspitze nicht an einem Anschluss' };
    if (!freqs.length) {
      var r0 = step(net, newState(), {}), v0 = r0.nodeV[net.pinNode[probe.a]] - (probe.b ? r0.nodeV[net.pinNode[probe.b]] : 0);
      return { ok: true, static: true, dc: v0, rms: 0, avg: 0, peak: Math.abs(v0), pp: 0 };
    }
    var T = 1 / Math.min.apply(null, freqs), per = opts.periods || 5, n = opts.samples || 200;
    var sim = simulate(layout, { dt: T / n, tEnd: T * per, probes: [{ a: probe.a, b: probe.b }] }).samples;
    var last = sim.slice(-n).map(function (x) { return x.ch0; });
    var dc = last.reduce(function (s, v) { return s + v; }, 0) / n;
    var rms = Math.sqrt(last.reduce(function (s, v) { return s + (v - dc) * (v - dc); }, 0) / n);
    var rect = last.reduce(function (s, v) { return s + Math.abs(v - dc); }, 0) / n;
    var mx = Math.max.apply(null, last), mn = Math.min.apply(null, last);
    return { ok: true, static: false, dc: dc, rms: rms, avg: FORM_FACTOR_SINE * rect, peak: Math.max(Math.abs(mx), Math.abs(mn)), pp: mx - mn, period: T };
  }

  function measure(layout, probe, state) {
    state = state || newState();
    var net = buildNetlist(layout);
    var a = net.pinNode[probe.a], b = net.pinNode[probe.b];
    if (a === undefined || b === undefined) return { ok: false, error: 'Messspitze nicht an einem Anschluss' };
    var mode = probe.mode;
    if (mode === 'V') {
      var r = step(net, state, { meter: { mode: 'V', a: a, b: b } });
      var v = r.nodeV[a] - r.nodeV[b];
      return { ok: true, mode: 'V', value: v, unit: 'V', display: fmt(v, 'V'), res: r };
    }
    if (mode === 'A') {
      var ra = step(net, state, { meter: { mode: 'A', a: a, b: b } });
      if (state.fuse) return { ok: false, mode: 'A', value: NaN, unit: 'A', display: 'FUSE', error: 'Sicherung im Messgeraet durchgebrannt – Strom wird in Reihe gemessen, nie parallel zu einer Quelle!', res: ra };
      var i = (ra.nodeV[a] - ra.nodeV[b]) / METER.rA;
      return { ok: true, mode: 'A', value: i, unit: 'A', display: fmt(i, 'A'), res: ra };
    }
    if (mode === 'R') {
      var live = step(net, state, {});
      var vab = live.nodeV[a] - live.nodeV[b];
      if (Math.abs(vab) > 0.02) return { ok: false, mode: 'R', value: NaN, unit: 'Ω', display: 'Err', error: 'Widerstand nur im spannungsfreien Zustand messen!', res: live };
      var dead = solve(net, { state: { burnt: state.burnt, vC: {}, logic: {}, diode: {} }, zeroSources: true, inject: { a: a, b: b, i: METER.iOhm } });
      var R = (dead.V[a] - dead.V[b]) / METER.iOhm;
      if (R > METER.olOhm) R = Infinity;
      return { ok: true, mode: 'R', value: R, unit: 'Ω', display: fmt(R, 'Ω'), res: live };
    }
    if (mode === 'VAC') { // Wechselspannung, AC-gekoppelt; probe.meterType 'avg' (Mittelwert-Gleichrichter) oder 'trms' (Standard)
      var ac = acMeasure(layout, probe);
      if (!ac.ok) return ac;
      var vac = probe.meterType === 'avg' ? ac.avg : ac.rms;
      return { ok: true, mode: 'VAC', value: vac, unit: 'V', display: fmt(vac, 'V'), ac: ac };
    }
    throw new Error('Unbekannter Messbereich: ' + mode);
  }

  /* ---------- Zeitsimulation (Oszilloskop) ----------
   * opts: { dt, tEnd, probes:[{a,b,label}] (Pins), events:[[t, {partId:{prop:value}}]] } */
  function simulate(layout, opts) {
    var lay = clone(layout), state = newState(), dt = opts.dt || 1e-3, tEnd = opts.tEnd || 1;
    var ev = (opts.events || []).slice().sort(function (x, y) { return x[0] - y[0]; }), ei = 0;
    var net = buildNetlist(lay), samples = [];
    // Anfangszustand: Kondensatoren entladen, Gatter aus Gleichstrom-Arbeitspunkt
    step(net, state, {});
    for (var k = 0; state.t <= tEnd + 1e-12; k++) {
      var changed = false;
      while (ei < ev.length && ev[ei][0] <= state.t + 1e-12) { applySet(net, ev[ei][1]); ei++; changed = true; }
      var r = step(net, state, { dt: dt });
      var row = { t: r.t };
      (opts.probes || []).forEach(function (pr, j) {
        row['ch' + j] = r.nodeV[net.pinNode[pr.a]] - (pr.b ? r.nodeV[net.pinNode[pr.b]] : 0);
      });
      row.res = opts.keep ? r : undefined;
      samples.push(row);
      if (k > 200000) break;
    }
    return { samples: samples, state: state };
  }

  function applySet(net, set) {
    Object.keys(set || {}).forEach(function (id) {
      var ps = select(net, id); if (!ps.length) throw new Error('Bauteil fehlt: ' + id);
      ps.forEach(function (p) { Object.keys(set[id]).forEach(function (k) { p.props[k] = set[id][k]; }); });
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- Aufgabenpruefung ----------
   * task.tests: [{ name, set:{S1:{closed:true}}, expect:[...] }]
   * expect-Eintraege:
   *   {sel:'D1'|'@led', on:true}                 LED leuchtet / aus
   *   {sel:'D1', i:[min,max]}                    Strom durch Bauteil
   *   {sel:'R1', v:[min,max]}                    Spannung ueber Bauteil
   *   {a:'B1.p', b:'R1.b', v:[min,max]}          Spannung zwischen zwei Anschluessen
   *   {sel:'U1', out:true}                       Gatterausgang
   *   {noFault:true} / {fault:'SHORT'}           keine Fehler / bestimmter Fehler
   *   {a:'R1.a', b:'R1.b', ac:'dc'|'rms'|'avg'|'peak'|'pp', range:[min,max]}   Wechselgroesse ueber eine Periode (acMeasure)
   * task.need: {led:1, resistor:1}  Mindestanzahl Bauteile je Typ
   * task.measure: [{id, ask, unit, tol, set?, mode+a+b | truth:{sel,q:'i'|'v'} | value}] – Messwert, den die lernende Person eintraegt
   *   mode 'V'|'A'|'R'|'VAC' (+meterType) wie am Multimeter, mode 'AC' + q ('dc'|'rms'|'avg'|'peak'|'pp') = Wechselgroesse
   *   (Oszilloskop/Mittelwert), value = fester Rechenwert (z. B. aus Messwerten berechneter Innenwiderstand) */
  function truthOf(m, ml) {
    if (m.value !== undefined) return { value: m.value, unit: '' };
    if (m.truth) { // Sollwert direkt aus der Simulation (z. B. Strom durch R1), unabhaengig davon, wie gemessen wurde
      var rt = api.analyze(ml), pp = rt.parts[m.truth.sel];
      if (!pp) throw new Error('Bauteil ' + m.truth.sel + ' fehlt');
      return { value: Math.abs(pp[m.truth.q]), unit: m.truth.q === 'i' ? 'A' : 'V' };
    }
    if (m.mode === 'AC') { var ac = acMeasure(ml, { a: m.a, b: m.b }); if (!ac.ok) throw new Error(ac.error); return { value: ac[m.q], unit: 'V' }; }
    return measure(ml, { mode: m.mode, a: m.a, b: m.b, meterType: m.meterType });
  }
  function applyMeasureSet(m, ml) {
    Object.keys(m.set || {}).forEach(function (id) { ml.parts.forEach(function (q) { if (q.id === id || id === '@' + q.type) { q.props = q.props || {}; Object.keys(m.set[id]).forEach(function (k) { q.props[k] = m.set[id][k]; }); } }); });
  }
  function select(net, sel) {
    if (sel.charAt(0) === '@') return net.parts.filter(function (p) { return p.type === sel.slice(1); });
    return net.byId[sel] ? [net.byId[sel]] : [];
  }
  function inRange(x, r) { return x >= r[0] - 1e-12 && x <= r[1] + 1e-12; }

  function runTask(task, layout, answers) {
    var results = [], allPass = true;
    function push(ok, text, info) { results.push({ ok: ok, text: text, info: info }); if (!ok) allPass = false; }
    var net;
    try { net = buildNetlist(layout); } catch (e) { return { pass: false, results: [{ ok: false, text: e.message }] }; }
    Object.keys(task.need || {}).forEach(function (type) {
      var c = net.parts.filter(function (p) { return p.type === type; }).length;
      push(c >= task.need[type], 'Bauteil ' + def(type).label + ': mindestens ' + task.need[type], { have: c });
    });
    (task.tests || []).forEach(function (t) {
      var lay = clone(layout), n2 = buildNetlist(lay), state = newState();
      try { applySet(n2, t.set); } catch (e) { push(false, (t.name || 'Test') + ': ' + e.message); return; }
      var r = step(n2, state, {});
      (t.expect || []).forEach(function (e) {
        var label = (t.name ? t.name + ' – ' : '');
        if (e.noFault) { push(r.faults.length === 0, label + 'keine Stoerung', { faults: r.faults }); return; }
        if (e.fault) { push(r.faults.some(function (f) { return f.code === e.fault; }), label + 'Stoerung ' + e.fault); return; }
        if (e.a && e.ac) {
          var acr = acMeasure(lay, { a: e.a, b: e.b }), av = acr.ok ? acr[e.ac] : NaN;
          push(acr.ok && inRange(av, e.range), label + ({ dc: 'Gleichanteil', rms: 'Effektivwert', avg: 'AVG-Anzeige', peak: 'Scheitelwert', pp: 'Spitze-Spitze' }[e.ac] || e.ac) + ' ' + e.a + '→' + e.b + ' im Bereich ' + fmt(e.range[0], 'V') + '…' + fmt(e.range[1], 'V'), { got: av });
          return;
        }
        if (e.a) {
          var v = r.nodeV[n2.pinNode[e.a]] - r.nodeV[n2.pinNode[e.b]];
          push(inRange(v, e.v), label + 'Spannung ' + e.a + '→' + e.b + ' im Bereich ' + fmt(e.v[0], 'V') + '…' + fmt(e.v[1], 'V'), { got: v });
          return;
        }
        var ps = select(n2, e.sel);
        if (!ps.length) { push(false, label + 'Bauteil ' + e.sel + ' fehlt'); return; }
        ps.forEach(function (p) {
          var pr = r.parts[p.id];
          if (e.on !== undefined) push(!!pr.on === e.on, label + p.id + (e.on ? ' leuchtet' : ' ist aus'), { got: pr });
          if (e.i) push(inRange(Math.abs(pr.i), e.i), label + 'Strom ' + p.id + ' ' + fmt(e.i[0], 'A') + '…' + fmt(e.i[1], 'A'), { got: pr.i });
          if (e.v) push(inRange(Math.abs(pr.v), e.v), label + 'Spannung ' + p.id + ' ' + fmt(e.v[0], 'V') + '…' + fmt(e.v[1], 'V'), { got: pr.v });
          if (e.out !== undefined) push(pr.out === e.out, label + p.id + ' Ausgang ' + (e.out ? '1' : '0'), { got: pr.out });
          if (e.brightness) push(inRange(pr.brightness || 0, e.brightness), label + p.id + ' Helligkeit', { got: pr.brightness });
        });
      });
    });
    (task.measure || []).forEach(function (m) {
      var truth, ml = clone(layout);
      applyMeasureSet(m, ml);
      try { truth = truthOf(m, ml); } catch (e) { push(false, m.ask + ': ' + e.message); return; }
      var ans = answers ? answers[m.id] : undefined;
      if (typeof ans === 'string') ans = ans.replace(',', '.');
      if (ans === undefined || ans === '' || isNaN(+ans)) { push(false, m.ask + ': Messwert fehlt', { expected: truth.value }); return; }
      var scale = UNIT_SCALE[m.unit] || 1;
      var tol = m.tol || 0.03, val = truth.value, ok = Math.abs(+ans * scale - val) <= Math.max(Math.abs(val) * tol, m.abs || 1e-9);
      push(ok, m.ask + ': ' + ans + ' ' + (m.unit || truth.unit), { expected: val });
    });
    return { pass: allPass && results.length > 0, results: results };
  }

  var UNIT_SCALE = { mA: 1e-3, mV: 1e-3, 'µA': 1e-6, 'kΩ': 1e3, 'MΩ': 1e6, ms: 1e-3, mW: 1e-3 };
  /* Sollwerte fuer task.measure in der Einheit der Aufgabe (fuer Validator und „Loesung zeigen“) */
  function expectedAnswers(task, layout) {
    var out = {};
    (task.measure || []).forEach(function (m) {
      var ml = clone(layout);
      applyMeasureSet(m, ml);
      var v = truthOf(m, ml).value;
      out[m.id] = +(v / (UNIT_SCALE[m.unit] || 1)).toPrecision(4);
    });
    return out;
  }

  var api = {
    expectedAnswers: expectedAnswers, UNIT_SCALE: UNIT_SCALE,
    version: '0.2.0', PARTS: PARTS, LED_COLORS: LED_COLORS, LOGIC: LOGIC, METER: METER, SOURCES: SOURCES, TRACE_MAX: TRACE_MAX,
    wave: wave, dmm: dmm, DMM_RANGES: DMM_RANGES, acMeasure: acMeasure,
    buildNetlist: buildNetlist, solve: solve, step: step, newState: newState,
    measure: measure, simulate: simulate, runTask: runTask, fmt: fmt, clone: clone,
    analyze: function (layout, state) { var net = buildNetlist(layout); return step(net, state || newState(), {}); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DQEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

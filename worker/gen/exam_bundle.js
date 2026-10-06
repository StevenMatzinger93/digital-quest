// GENERIERT von dev/build.js – nicht von Hand ändern. Engine, Prüfungskern und Prüfungspool für den Worker.
/* ==== engine.js ==== */
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
  var LIMITS = { lampBurn: 2, ledReverse: 5 }; // Lampe brennt ab lampBurn · Nennleistung durch; LED meldet Sperrspannung ab ledReverse Volt
  var TRACE_MAX = 200;        // Zeitlupe: hoechstens so viele Rechenschritte pro Arbeitspunkt speichern

  var LED_COLORS = {
    rot: { vf: 1.8, rgb: '#ff3b30' }, gelb: { vf: 2.0, rgb: '#ffd60a' },
    gruen: { vf: 2.1, rgb: '#32d74b', label: 'grün' }, blau: { vf: 3.0, rgb: '#0a84ff' }, weiss: { vf: 3.1, rgb: '#f5f5f7' } // Schlüssel bleiben ASCII (Spielstand), label nur für die Anzeige
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
    xor:  { label: 'XOR', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return i[0] !== i[1]; } },
    xnor: { label: 'XNOR', prefix: 'U', pins: ['in1', 'in2', 'out'], props: {}, logic: function (i) { return i[0] === i[1]; } },
    /* Experimentierboard: Pegelschalter (closed = 1 → 5 V) und Logikanzeige (leuchtet ab 2,5 V); Versorgung implizit wie bei Gattern */
    logicin:  { label: 'Pegelschalter', prefix: 'E', pins: ['out'], props: { closed: false }, digital: true },
    logicled: { label: 'Logikanzeige', prefix: 'L', pins: ['in'], props: { color: 'rot' }, digital: true },
    seg7:     { label: '7-Segment-Anzeige', prefix: 'AZ', pins: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], props: {}, digital: true },
    dec7:     { label: 'BCD-7-Segment-Decoder', prefix: 'IC', pins: ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd', 'e', 'f', 'g'], ins: ['A', 'B', 'C', 'D'], outs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], props: {},
      logic: function (i) { var n = (i[0] ? 1 : 0) + (i[1] ? 2 : 0) + (i[2] ? 4 : 0) + (i[3] ? 8 : 0); return (SEG7[n] || '0000000').split('').map(function (c) { return c === '1'; }); } },
    /* Flipflops: uebernehmen bei steigender Flanke an C (ffIns = Dateneingaenge), Ausgaenge Q und /Q */
    dff:  { label: 'D-Flipflop', prefix: 'FF', pins: ['D', 'C', 'Q', 'Qn'], ffIns: ['D'], props: {}, ff: function (q, i) { return i[0]; } },
    jkff: { label: 'JK-Flipflop', prefix: 'FF', pins: ['J', 'K', 'C', 'Q', 'Qn'], ffIns: ['J', 'K'], props: {}, ff: function (q, i) { return i[0] && i[1] ? !q : i[0] ? true : i[1] ? false : q; } },
    tff:  { label: 'T-Flipflop', prefix: 'FF', pins: ['T', 'C', 'Q', 'Qn'], ffIns: ['T'], props: {}, ff: function (q, i) { return i[0] ? !q : q; } },
    /* Halbleiter: NPN-Transistor (sperrt / aktiv: Ic = β·Ib / Saettigung: U_CE ≈ 0,2 V), Z-Diode (Durchbruch bei U_Z in Sperrrichtung) */
    npn:   { label: 'NPN-Transistor', prefix: 'Q', pins: ['b', 'c', 'e'], props: { beta: 100, vbe: 0.7, rbe: 50, vsat: 0.2, pmax: 0.5 } },
    zener: { label: 'Z-Diode', prefix: 'Z', pins: ['a', 'k'], props: { vz: 5.1, vf: 0.7, rs: 5, pmax: 0.5 } },
    motor: { label: 'Motor', prefix: 'M', pins: ['a', 'b'], props: { value: 20, inom: 0.3 }, unit: 'Ω' }
  };
  /* Segmente a…g fuer 0–9 (BCD), darueber dunkel */
  var SEG7 = ['1111110', '0110000', '1101101', '1111001', '0110011', '1011011', '1011111', '1110000', '1111111', '1111011'];
  function dIns(d) { return d.ins || (d.ffIns ? d.ffIns.concat(['C']) : d.pins.filter(function (p) { return p !== 'out'; })); }
  function dOuts(d) { return d.outs || (d.ff ? ['Q', 'Qn'] : ['out']); }
  function isDigital(d) { return !!(d.logic || d.digital || d.ff); }
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
    var groundRoots = {}, autoGround = false, refPin = null; // refPin: der Anschluss, der als Bezugspunkt 0 V dient (Masse-Symbol oder Minuspol der ersten Quelle)
    parts.forEach(function (p) { if (p.type === 'ground') { groundRoots[find(p.id + '.g')] = true; if (!refPin) refPin = p.id + '.g'; } });
    if (!Object.keys(groundRoots).length) { // ohne Masse-Symbol: Minuspol der ersten Quelle ist Bezugspunkt 0 V
      var src = parts.filter(function (p) { return p.type === 'battery' || p.type === 'acsource'; })[0];
      if (src) { groundRoots[find(src.id + '.n')] = true; autoGround = true; refPin = src.id + '.n'; }
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
    return { parts: parts, byId: byId, nodes: nodes, pinNode: pinNode, hasGround: Object.keys(groundRoots).length > 0 && !autoGround, autoGround: autoGround, refPin: refPin };
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
  /* tr: Transistor-Zustand ('off'|'on'|'sat'), zen: Z-Dioden-Zustand ('off'|'f'|'z'), ff: Flipflops {q, c (letzter Taktpegel)} */
  function newState() { return { burnt: {}, vC: {}, logic: {}, diode: {}, tr: {}, zen: {}, ff: {}, fuse: false, t: 0, burnInfo: {}, fuseInfo: null }; }

  /* ---------- Loeser fuer einen Arbeitspunkt / Zeitschritt ----------
   * opts: { state, dt (null = Gleichstrom-Arbeitspunkt), t, meter:{mode,a,b} (Knoten), zeroSources, inject:{a,b,i},
   *         trace: [] – nimmt jeden Rechenschritt auf: {iter, kind:'diode'|'gate'|'done'|'unstable', changed:[{id,to}], res} (max. TRACE_MAX) } */
  function solve(net, opts) {
    opts = opts || {};
    var st = opts.state || newState();
    var idx = {}; net.nodes.forEach(function (n, i) { idx[n] = i; });
    var N = net.nodes.length;
    var dt = opts.dt || null, t = opts.t || 0;
    var diode = {}, logic = {}, tr = {}, zen = {};
    net.parts.forEach(function (p) {
      var d = def(p.type);
      if (p.type === 'led' || p.type === 'diode') diode[p.id] = !!st.diode[p.id];
      if (p.type === 'npn') tr[p.id] = (st.tr || {})[p.id] || 'off';
      if (p.type === 'zener') zen[p.id] = (st.zen || {})[p.id] || 'off';
      if (d.logic) logic[p.id] = st.logic[p.id] !== undefined ? st.logic[p.id] : (dOuts(d).length > 1 ? dOuts(d).map(function () { return false; }) : false);
    });
    function outVal(p, k) { var v = logic[p.id]; return Array.isArray(v) ? !!v[k] : !!v; }
    function ffQ(p) { return !!((st.ff || {})[p.id] || {}).q; }
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
      function vccs(op, on, cp, cn, gm, voff) { // Strom gm·(V(cp) − V(cn) − voff) fliesst von op durch das Bauteil nach on
        var io = idx[op], jo = idx[on], ic = idx[cp], jc = idx[cn];
        if (io !== undefined) { if (ic !== undefined) A[io][ic] += gm; if (jc !== undefined) A[io][jc] -= gm; z[io] += gm * voff; }
        if (jo !== undefined) { if (ic !== undefined) A[jo][ic] -= gm; if (jc !== undefined) A[jo][jc] += gm; z[jo] -= gm * voff; }
      }
      function drive(node, high) { norton(node, '0', high && !opts.zeroSources ? LOGIC.vcc : 0, LOGIC.rout); }
      net.parts.forEach(function (p) {
        var q = p.props, n = p.n;
        if (st.burnt[p.id]) { return; }
        switch (p.type) {
          case 'resistor': case 'lamp': case 'motor': // props.defect: verdeckte Unterbrechung (Fehlersuche) – von aussen nicht sichtbar
            G(n.a, n.b, q.defect ? G_OPEN : 1 / Math.max(q.value, 1e-3)); break;
          case 'npn':
            if (tr[p.id] === 'off') { G(n.b, n.e, G_OPEN); G(n.c, n.e, G_OPEN); break; }
            norton(n.b, n.e, q.vbe, q.rbe);
            if (tr[p.id] === 'sat') norton(n.c, n.e, q.vsat, 1);
            else { G(n.c, n.e, G_OPEN); vccs(n.c, n.e, n.b, n.e, q.beta / q.rbe, q.vbe); }
            break;
          case 'zener':
            if (zen[p.id] === 'f') norton(n.a, n.k, q.vf, q.rs); else if (zen[p.id] === 'z') norton(n.k, n.a, q.vz, q.rs); else G(n.a, n.k, G_OPEN);
            break;
          case 'logicin': drive(n.out, !!q.closed); break;
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
            var dd = def(p.type);
            if (dd.logic || dd.ff) {
              dIns(dd).forEach(function (pin) { G(n[pin], '0', G_OPEN); });
              if (dd.ff) { drive(n.Q, ffQ(p)); drive(n.Qn, !ffQ(p)); }
              else dOuts(dd).forEach(function (pin, k) { drive(n[pin], outVal(p, k)); });
            } else if (dd.digital) dd.pins.forEach(function (pin) { if (p.type !== 'logicin') G(n[pin], '0', G_OPEN); });
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
      if (!x) throw new Error('Gleichungssystem nicht lösbar');
      V = x;
      var changed = [];
      net.parts.forEach(function (p) {
        if (st.burnt[p.id] || diode[p.id] === undefined) return;
        var q = p.props, vf = p.type === 'led' ? LED_COLORS[q.color].vf : q.vf;
        var vak = volt(p.n.a) - volt(p.n.k);
        if (!diode[p.id] && vak > vf + 1e-9) changed.push({ id: p.id, to: true });
        else if (diode[p.id] && vak < vf - 1e-9) changed.push({ id: p.id, to: false });
      });
      // Transistoren und Z-Dioden: Arbeitsbereich pruefen (wie Dioden, mit kleiner Hysterese)
      net.parts.forEach(function (p) {
        if (st.burnt[p.id]) return;
        var q = p.props, n = p.n;
        if (p.type === 'npn') {
          var vbe = volt(n.b) - volt(n.e), vce = volt(n.c) - volt(n.e), s0 = tr[p.id], s1 = s0;
          if (s0 === 'off') { if (vbe > q.vbe + 1e-6) s1 = 'on'; }
          else if (vbe < q.vbe - 1e-6) s1 = 'off';
          else if (s0 === 'on' && vce < q.vsat - 1e-4) s1 = 'sat';
          else if (s0 === 'sat') { var ib = (vbe - q.vbe) / q.rbe, ic = (vce - q.vsat) / 1; if (ic > q.beta * ib * 1.02) s1 = 'on'; }
          if (s1 !== s0) changed.push({ id: p.id, to: s1 });
        }
        if (p.type === 'zener') {
          var vak = volt(n.a) - volt(n.k), z0 = zen[p.id], z1 = z0;
          if (z0 === 'off') { if (vak > q.vf + 1e-9) z1 = 'f'; else if (-vak > q.vz + 1e-9) z1 = 'z'; }
          else if (z0 === 'f' && vak < q.vf - 1e-9) z1 = 'off';
          else if (z0 === 'z' && -vak < q.vz - 1e-9) z1 = 'off';
          if (z1 !== z0) changed.push({ id: p.id, to: z1 });
        }
      });
      if (changed.length) {
        record('diode', changed);
        changed.forEach(function (c) { if (tr[c.id] !== undefined) tr[c.id] = c.to; else if (zen[c.id] !== undefined) zen[c.id] = c.to; else diode[c.id] = c.to; });
        continue;
      }
      // Gatter einzeln nachfuehren (Gauss-Seidel) – stabil fuer Speicherschaltungen
      var gateChanged = null;
      for (var gi = 0; gi < net.parts.length && !gateChanged; gi++) {
        var g = net.parts[gi], d = def(g.type);
        if (!d.logic || st.burnt[g.id]) continue;
        var ins = dIns(d).map(function (pin) { return volt(g.n[pin]) > LOGIC.vth; });
        var out = d.logic(ins); out = Array.isArray(out) ? out.map(Boolean) : !!out;
        if (JSON.stringify(out) !== JSON.stringify(logic[g.id])) gateChanged = { id: g.id, to: out };
      }
      if (gateChanged) { record('gate', [gateChanged]); logic[gateChanged.id] = gateChanged.to; continue; }
      converged = true; break;
    }
    if (!converged) oscillating = true;
    var res = evaluate();
    record(converged ? 'done' : 'unstable', []);
    return { res: res, V: res.nodeV, diode: diode, logic: logic, tr: tr, zen: zen };

    // ---------- Auswertung (auch fuer jeden Zwischenschritt der Zeitlupe) ----------
    function evaluate() {
    var nodeV = { '0': 0 }; net.nodes.forEach(function (n) { nodeV[n] = volt(n); });
    var res = { nodeV: nodeV, parts: {}, faults: [], converged: converged, oscillating: oscillating };
    net.parts.forEach(function (p) {
      var q = p.props, n = p.n, r = { burnt: !!st.burnt[p.id] };
      function across(a, b) { return volt(a) - volt(b); }
      switch (p.type) {
        case 'resistor': case 'lamp': case 'motor': r.v = across(n.a, n.b); r.i = r.burnt || q.defect ? r.v * G_OPEN : r.v / Math.max(q.value, 1e-3); r.p = r.v * r.i;
          if (p.type === 'motor') r.speed = Math.min(1.5, Math.abs(r.i) / q.inom) * (r.i < 0 ? -1 : 1);
          break;
        case 'npn':
          r.vbe = across(n.b, n.e); r.v = across(n.c, n.e); r.state = tr[p.id];
          r.ib = r.state === 'off' ? 0 : (r.vbe - q.vbe) / q.rbe;
          r.i = r.state === 'off' ? 0 : r.state === 'sat' ? (r.v - q.vsat) / 1 : q.beta * r.ib;
          r.p = r.v * r.i + r.vbe * r.ib; r.on = r.state !== 'off';
          r.pin = { b: -r.ib, c: -r.i, e: r.ib + r.i };
          break;
        case 'zener':
          r.v = across(n.a, n.k); r.mode = zen[p.id];
          r.i = r.mode === 'f' ? (r.v - q.vf) / q.rs : r.mode === 'z' ? (r.v + q.vz) / q.rs : 0; r.p = r.v * r.i;
          break;
        case 'logicin': r.out = !!q.closed; r.v = volt(n.out); r.pin = { out: ((r.out ? LOGIC.vcc : 0) - r.v) / LOGIC.rout }; break;
        case 'logicled': r.v = volt(n.in); r.on = r.v > LOGIC.vth; break;
        case 'seg7': r.seg = def(p.type).pins.map(function (pin) { return volt(n[pin]) > LOGIC.vth; }); r.on = r.seg.some(Boolean); break;
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
        case 'clock': r.v = volt(n.out); r.high = r.v > LOGIC.vth; r.pin = { out: ((r.high && !opts.zeroSources ? LOGIC.vcc : 0) - r.v) / LOGIC.rout }; break;
        default:
          var dd = def(p.type);
          if (dd.ff) { r.q = ffQ(p); r.out = r.q; r.v = volt(n.Q); r.pin = { Q: ((r.q ? LOGIC.vcc : 0) - volt(n.Q)) / LOGIC.rout, Qn: ((r.q ? 0 : LOGIC.vcc) - volt(n.Qn)) / LOGIC.rout }; }
          else if (dd.logic) {
            r.out = logic[p.id]; r.pin = {};
            dOuts(dd).forEach(function (pin, k) { r.pin[pin] = ((outVal(p, k) ? LOGIC.vcc : 0) - volt(n[pin])) / LOGIC.rout; });
            if (!Array.isArray(r.out)) r.v = volt(n.out);
          }
      }
      if (!r.pin) { // Zweipole: r.i fliesst im Bauteil von a nach b (Quellen: von n nach p)
        if (p.type === 'battery' || p.type === 'acsource') r.pin = { p: r.i || 0, n: -(r.i || 0) };
        else if (p.type === 'pot') { var iaw = across(n.a, n.w) / Math.max(q.value * q.pos, 1e-3), iwb = across(n.w, n.b) / Math.max(q.value * (1 - q.pos), 1e-3); r.pin = { a: -iaw, w: iaw - iwb, b: iwb }; }
        else if (r.i !== undefined && n.a !== undefined) { var bpin = n.b !== undefined ? 'b' : 'k'; r.pin = { a: -r.i }; r.pin[bpin] = r.i; }
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
        if (p.type === 'led' && r.v < -LIMITS.ledReverse) faults.push({ code: 'LED_REVERSE', part: p.id, v: r.v, vmax: LIMITS.ledReverse });
        if ((p.type === 'battery' || p.type === 'acsource') && Math.abs(r.i) > q.imax) faults.push({ code: 'SHORT', part: p.id, i: r.i, imax: q.imax, u: q.value, ri: q.ri });
        if ((p.type === 'resistor' || p.type === 'pot') && Math.abs(r.p) > q.pmax) faults.push({ code: 'OVERLOAD', part: p.id, p: r.p, pmax: q.pmax, v: r.v, i: r.i, r: q.value });
        if (p.type === 'lamp' && Math.abs(r.p) > q.pnom * LIMITS.lampBurn) { state.burnt[p.id] = true; newDamage = true; bi[p.id] = { p: r.p, v: r.v, pnom: q.pnom }; faults.push(Object.assign({ code: 'LAMP_BURNT', part: p.id }, bi[p.id])); }
        if (p.type === 'ammeter' && Math.abs(r.i) > METER.fuseA) faults.push({ code: 'AMMETER_OVERLOAD', part: p.id, i: r.i, imax: METER.fuseA });
      });
      if (opts.meter && opts.meter.mode === 'A' && !state.fuse) {
        var im = (out.V[opts.meter.a] - out.V[opts.meter.b]) / METER.rA;
        if (Math.abs(im) > METER.fuseA) { state.fuse = true; state.fuseInfo = { i: im, imax: METER.fuseA }; newDamage = true; }
      }

      net.parts.forEach(function (p) { // Transistor/Z-Diode ueberlastet
        var r = out.res.parts[p.id], q = p.props;
        if ((p.type === 'npn' || p.type === 'zener') && Math.abs(r.p) > q.pmax) faults.push({ code: 'OVERLOAD', part: p.id, p: r.p, pmax: q.pmax, v: r.v, i: r.i });
      });
      if (out.res.oscillating) faults.push({ code: 'UNSTABLE' });
      if (!net.hasGround && !net.autoGround && net.parts.some(function (p) { return isDigital(def(p.type)) || p.type === 'clock'; })) faults.push({ code: 'NO_GROUND' });
      out.res.faults = faults;
      // Nie Ausgang gegen Ausgang: zwei digitale Ausgaenge am selben Knoten mit unterschiedlichem Pegel
      var drv = {};
      net.parts.forEach(function (p) {
        var d = def(p.type), r = out.res.parts[p.id]; if (state.burnt[p.id]) return;
        function add(pin, v) { var nd = p.n[pin]; if (nd === undefined) return; (drv[nd] = drv[nd] || []).push({ id: p.id, v: !!v }); }
        if (p.type === 'logicin') add('out', p.props.closed);
        else if (p.type === 'clock') add('out', Math.floor(state.t * p.props.freq * 2) % 2 === 0);
        else if (d.ff) { add('Q', r.q); add('Qn', !r.q); }
        else if (d.logic) dOuts(d).forEach(function (pin, k) { add(pin, Array.isArray(r.out) ? r.out[k] : r.out); });
      });
      Object.keys(drv).forEach(function (nd) {
        var ds = drv[nd]; if (ds.length < 2) return;
        if (ds.some(function (x) { return x.v; }) && ds.some(function (x) { return !x.v; }))
          faults.push({ code: 'OUTPUT_CLASH', part: ds[0].id, parts: ds.map(function (x) { return x.id; }), i: LOGIC.vcc / (2 * LOGIC.rout) });
      });
      // Flipflops: bei steigender Flanke an C die Eingaenge uebernehmen (alle gleichzeitig aus derselben Loesung)
      var ffChanged = false; state.ff = state.ff || {};
      net.parts.forEach(function (p) {
        var d = def(p.type); if (!d.ff || state.burnt[p.id]) return;
        var f = state.ff[p.id] || (state.ff[p.id] = { q: false, c: null }), c = (out.V[p.n.C] || 0) > LOGIC.vth;
        if (f.c === false && c) {
          var nq = !!d.ff(f.q, d.ffIns.map(function (pin) { return (out.V[p.n[pin]] || 0) > LOGIC.vth; }));
          if (nq !== f.q) { f.q = nq; ffChanged = true; }
        }
        f.c = c;
      });
      state.diode = out.diode; state.logic = out.logic; state.tr = out.tr; state.zen = out.zen;
      if (!(newDamage || ffChanged) || ++guard > 20) break;
    }
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
    A: [[600e-6, 1e-6, 'µA', 1], [6e-3, 1e-3, 'mA', 3], [60e-3, 1e-3, 'mA', 2], [0.6, 1e-3, 'mA', 1], [6, 1, 'A', 3], [10, 1, 'A', 2]],
    'Ω': [[600, 1, 'Ω', 1], [6e3, 1e3, 'kΩ', 3], [60e3, 1e3, 'kΩ', 2], [600e3, 1e3, 'kΩ', 1], [6e6, 1e6, 'MΩ', 3], [40e6, 1e6, 'MΩ', 2]]
  };
  /* Von Hand waehlbare Messbereiche (Endwert) wie an einem 2000-Count-Handmultimeter; Anzeige: E.dmm(value, unit, rng, range) */
  var DMM_MANUAL = { V: [0.2, 2, 20, 200, 600], A: [200e-6, 2e-3, 20e-3, 200e-3, 10], 'Ω': [200, 2e3, 20e3, 200e3, 2e6, 20e6] };
  var PREFIX = { V: [[1, 'mV', 1e-3], [Infinity, 'V', 1]], A: [[1e-3, 'µA', 1e-6], [1, 'mA', 1e-3], [Infinity, 'A', 1]], 'Ω': [[1e3, 'Ω', 1], [1e6, 'kΩ', 1e3], [Infinity, 'MΩ', 1e6]] };
  function rangeLabel(range, unit) { var p = PREFIX[unit].filter(function (x) { return range < x[0]; })[0]; var n = range / p[2]; return (n >= 1 ? String(+n.toPrecision(3)) : String(n).replace('0.', '.')) + p[1].replace('Ω', 'Ω'); }
  /* Anzeige bei festem Bereich: Endwert ueberschritten → OL; sonst 2000 Schritte Aufloesung (Rauschen der letzten Stelle, Kalibrierfehler wie AUTO) */
  function dmmManual(value, unit, rng, range) {
    if (!isFinite(value) || Math.abs(value) >= range) return { text: 'OL', value: Infinity, range: range, manual: true, ol: true };
    var p = PREFIX[unit].filter(function (x) { return range < x[0]; })[0], f = p[2], lsd = Math.pow(10, Math.floor(Math.log10(range / 2000)));
    var rnd = rng === 0 ? function () { return 0.5; } : (rng || Math.random), u = rnd();
    var d = value * (1 + METER.cal) + (u < 0.25 ? -1 : u > 0.75 ? 1 : 0) * lsd;
    d = Math.round(d / lsd) * lsd; if (Math.abs(d) < lsd / 2) d = 0;
    var dec = Math.max(0, Math.round(-Math.log10(lsd / f)));
    return { text: (d / f).toFixed(dec) + ' ' + p[1], value: d, range: range, manual: true, ol: false };
  }
  function dmm(value, unit, rng, range) {
    var rs = DMM_RANGES[unit]; if (!rs) return { text: fmt(value, unit), value: value };
    if (range && isFinite(range)) return dmmManual(value, unit, rng, range);
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
    var T = 1 / Math.min.apply(null, freqs), per = opts.periods || 5;
    // Zeitkonstanten grob abschaetzen (groesstes/kleinstes R mal C): lange Einschwingzeit vorab grob rechnen, kurze Nadeln fein abtasten
    var rs = [], cs = [];
    net.parts.forEach(function (p) { if (p.type === 'resistor' && p.props.value > 0) rs.push(p.props.value); if (p.type === 'capacitor' && p.props.value > 0) cs.push(p.props.value); });
    var tauMax = rs.length && cs.length ? Math.max.apply(null, rs) * Math.max.apply(null, cs) : 0;
    var tauMin = rs.length && cs.length ? Math.min.apply(null, rs) * Math.min.apply(null, cs) : Infinity;
    var n = opts.samples || Math.min(4000, Math.max(200, Math.ceil(40 * Math.max.apply(null, freqs) / Math.min.apply(null, freqs)), Math.ceil(20 * T / tauMin))); // auch schnelle Anteile und Nadeln fein abtasten
    var settle = opts.settle === false || 5 * tauMax <= T * (per - 1) ? null : { t: Math.ceil(Math.min(5 * tauMax, 3) / T) * T, dt: T / 40 };
    var sim = simulate(layout, { dt: T / n, tEnd: T * per, settle: settle, meter: opts.meter, probes: [{ a: probe.a, b: probe.b }] }).samples; // opts.meter: Shunt des Amperemeters (A~)
    var last = sim.slice(-n).map(function (x) { return x.ch0; });
    var dc = last.reduce(function (s, v) { return s + v; }, 0) / n;
    var rms = Math.sqrt(last.reduce(function (s, v) { return s + (v - dc) * (v - dc); }, 0) / n);
    var rect = last.reduce(function (s, v) { return s + Math.abs(v - dc); }, 0) / n;
    var mx = Math.max.apply(null, last), mn = Math.min.apply(null, last);
    return { ok: true, static: false, dc: dc, rms: rms, avg: FORM_FACTOR_SINE * rect, peak: Math.max(Math.abs(mx), Math.abs(mn)), pp: mx - mn, max: mx, min: mn, period: T };
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
      if (state.fuse) return { ok: false, mode: 'A', value: NaN, unit: 'A', display: 'FUSE', error: 'Sicherung im Messgerät durchgebrannt – Strom wird in Reihe gemessen, nie parallel zu einer Quelle!', res: ra };
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
    if (mode === 'AAC') { // Wechselstrom in Reihe (Shunt 0,1 Ω), AC-gekoppelt; probe.meterType 'avg' | 'trms' – wie VAC, nur über den Shunt
      var raA = step(net, state, { meter: { mode: 'A', a: a, b: b } });
      if (state.fuse) return { ok: false, mode: 'AAC', value: NaN, unit: 'A', display: 'FUSE', error: 'Sicherung im Messgerät durchgebrannt – Strom wird in Reihe gemessen, nie parallel zu einer Quelle!', res: raA };
      var acA = acMeasure(layout, { a: probe.a, b: probe.b }, { meter: { mode: 'A', a: a, b: b } });
      if (!acA.ok) return { ok: false, mode: 'AAC', value: NaN, unit: 'A', display: 'Err', error: acA.error };
      var iA = (probe.meterType === 'avg' ? acA.avg : acA.rms) / METER.rA;
      return { ok: true, mode: 'AAC', value: iA, unit: 'A', display: fmt(iA, 'A'), static: acA.static, ac: acA, res: raA };
    }
    if (mode === 'AAC') { // Wechselstrom in Reihe (Shunt 0,1 Ω), AC-gekoppelt; probe.meterType 'avg' | 'trms' – wie VAC, nur über den Shunt
      var raA = step(net, state, { meter: { mode: 'A', a: a, b: b } });
      if (state.fuse) return { ok: false, mode: 'AAC', value: NaN, unit: 'A', display: 'FUSE', error: 'Sicherung im Messgerät durchgebrannt – Strom wird in Reihe gemessen, nie parallel zu einer Quelle!', res: raA };
      var acA = acMeasure(layout, { a: probe.a, b: probe.b }, { meter: { mode: 'A', a: a, b: b } });
      if (!acA.ok) return { ok: false, mode: 'AAC', value: NaN, unit: 'A', display: 'Err', error: acA.error };
      var iA = (probe.meterType === 'avg' ? acA.avg : acA.rms) / METER.rA;
      return { ok: true, mode: 'AAC', value: iA, unit: 'A', display: fmt(iA, 'A'), static: acA.static, ac: acA, res: raA };
    }
    if (mode === 'AAC') { // Wechselstrom in Reihe (Shunt 0,1 Ω), AC-gekoppelt; probe.meterType 'avg' | 'trms' – wie VAC, nur über den Shunt
      var raA = step(net, state, { meter: { mode: 'A', a: a, b: b } });
      if (state.fuse) return { ok: false, mode: 'AAC', value: NaN, unit: 'A', display: 'FUSE', error: 'Sicherung im Messgerät durchgebrannt – Strom wird in Reihe gemessen, nie parallel zu einer Quelle!', res: raA };
      var acA = acMeasure(layout, { a: probe.a, b: probe.b }, { meter: { mode: 'A', a: a, b: b } });
      if (!acA.ok) return { ok: false, mode: 'AAC', value: NaN, unit: 'A', display: 'Err', error: acA.error };
      var iA = (probe.meterType === 'avg' ? acA.avg : acA.rms) / METER.rA;
      return { ok: true, mode: 'AAC', value: iA, unit: 'A', display: fmt(iA, 'A'), static: acA.static, ac: acA, res: raA };
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
   * opts: { dt, tEnd, probes:[{a,b,label}] (Pins), events:[[t, {partId:{prop:value}}]], settle:{t, dt} } */
  function simulate(layout, opts) {
    var lay = clone(layout), state = newState(), dt = opts.dt || 1e-3, tEnd = opts.tEnd || 1;
    var ev = (opts.events || []).slice().sort(function (x, y) { return x[0] - y[0]; }), ei = 0;
    var net = buildNetlist(lay), samples = [];
    // Anfangszustand: Kondensatoren entladen, Gatter aus Gleichstrom-Arbeitspunkt
    step(net, state, { meter: opts.meter });
    // opts.settle = {t, dt}: vorher grob einschwingen, ohne Aufzeichnung
    if (opts.settle && opts.settle.t > 0) {
      for (var s0 = 0; state.t < opts.settle.t - 1e-12 && s0 < 200000; s0++) step(net, state, { dt: Math.min(opts.settle.dt, opts.settle.t - state.t), meter: opts.meter });
      tEnd += state.t;
    }
    for (var k = 0; state.t <= tEnd + 1e-12; k++) {
      var changed = false;
      while (ei < ev.length && ev[ei][0] <= state.t + 1e-12) { applySet(net, ev[ei][1]); ei++; changed = true; }
      var r = step(net, state, { dt: dt, meter: opts.meter });
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
    /* limit: hoechstens so viele Bauteile eines Typs; Schluessel 'gates' zaehlt alle Logikgatter zusammen */
    Object.keys(task.limit || {}).forEach(function (type) {
      var c = net.parts.filter(function (p) { return type === 'gates' ? GATES[p.type] : p.type === type; }).length;
      push(c <= task.limit[type], (type === 'gates' ? 'Logikgatter' : def(type).label) + ': höchstens ' + task.limit[type], { have: c });
    });
    Object.keys(task.need || {}).forEach(function (type) {
      var c = net.parts.filter(function (p) { return p.type === type; }).length;
      push(c >= task.need[type], 'Bauteil ' + def(type).label + ': mindestens ' + task.need[type], { have: c });
    });
    /* Test = ein Zustand {set, expect} oder eine Schrittfolge {steps:[{set?, run?, dt?, expect?, name?}]} mit durchgehendem Zustand
     * (Flipflops, Zaehler, Kondensatoren). run = Sekunden Zeitsimulation mit dt (Standard 1 ms). */
    var n2, lay2;
    (task.tests || []).forEach(function (t) {
      var lay = clone(layout), state = newState(); n2 = buildNetlist(lay); lay2 = lay;
      var steps = t.steps || [{ set: t.set, expect: t.expect }];
      if (t.steps) step(n2, state, {}); // Einschalten: Ausgangszustand (Taktpegel der Flipflops) festhalten
      for (var si = 0; si < steps.length; si++) {
        var sp = steps[si], r;
        var label = (t.name ? t.name : 'Test') + (t.steps ? ' · ' + (sp.name || 'Schritt ' + (si + 1)) : '') + ' – ';
        try { applySet(n2, sp.set); applyMeasureSet({ set: sp.set }, lay2); } catch (e) { push(false, label + e.message); return; }
        r = step(n2, state, {});
        if (sp.run) { var dtr = sp.dt || 1e-3; for (var k = 0; k * dtr < sp.run - 1e-12 && k < 50000; k++) r = step(n2, state, { dt: dtr }); }
        checkAll(sp.expect || [], r, label);
      }
    });
    function checkAll(expects, r, label) {
      expects.forEach(function (e) {
        if (e.noFault) { push(r.faults.length === 0, label + 'keine Störung', { faults: r.faults }); return; }
        if (e.fault) { push(r.faults.some(function (f) { return f.code === e.fault; }), label + 'Störung ' + e.fault); return; }
        if (e.a && e.ac) {
          var acr = acMeasure(lay2, { a: e.a, b: e.b }), av = acr.ok ? acr[e.ac] : NaN;
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
          if (e.state !== undefined) push(pr.state === e.state, label + p.id + ' Arbeitsbereich ' + ({ off: 'gesperrt', on: 'aktiv', sat: 'Sättigung' }[e.state] || e.state), { got: pr.state });
          if (e.digit !== undefined) push(!!pr.seg && pr.seg.map(function (x) { return x ? '1' : '0'; }).join('') === (SEG7[e.digit] || '0000000'), label + p.id + ' zeigt ' + e.digit, { got: pr.seg });
        });
      });
    }
    (task.measure || []).forEach(function (m) {
      var truth, ml = clone(layout);
      applyMeasureSet(m, ml);
      try { truth = truthOf(m, ml); } catch (e) { push(false, m.ask + ': ' + e.message); return; }
      var ans = answers ? answers[m.id] : undefined;
      if (typeof ans === 'string') ans = ans.replace(',', '.');
      if (ans === undefined || ans === '' || isNaN(+ans)) { push(false, m.ask + ': Messwert fehlt', { expected: truth.value, mid: m.id, empty: true }); return; }
      var scale = UNIT_SCALE[m.unit] || 1;
      var tol = m.tol || 0.03, val = truth.value, ok = Math.abs(+ans * scale - val) <= Math.max(Math.abs(val) * tol, m.abs || 1e-9);
      push(ok, m.ask + ': ' + ans + ' ' + (m.unit || truth.unit), { expected: val, mid: m.id }); // mid: Teilwertung pro Messwert in der App
    });
    return { pass: allPass && results.length > 0, results: results };
  }

  var GATES = { not: 1, and: 1, or: 1, nand: 1, nor: 1, xor: 1, xnor: 1 };
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
    version: '0.2.0', PARTS: PARTS, LED_COLORS: LED_COLORS, LOGIC: LOGIC, METER: METER, LIMITS: LIMITS, SOURCES: SOURCES, TRACE_MAX: TRACE_MAX,
    wave: wave, dmm: dmm, DMM_RANGES: DMM_RANGES, DMM_MANUAL: DMM_MANUAL, rangeLabel: rangeLabel, acMeasure: acMeasure,
    buildNetlist: buildNetlist, solve: solve, step: step, newState: newState,
    measure: measure, simulate: simulate, runTask: runTask, fmt: fmt, clone: clone,
    /* Bezugspunkt eines Aufbaus als Anschlussname ('GND1.g' bzw. 'G1.n'); null ohne Quelle und Masse (Gleichrichter-Auftrag 06.10.2026, G1) */
    refPin: function (layout) { try { return buildNetlist(clone(layout)).refPin; } catch (e) { return null; } },
    analyze: function (layout, state) { var net = buildNetlist(layout); return step(net, state || newState(), {}); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DQEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== content/_helpers.js ==== */
/* Digital Quest – Inhalts-Helfer. Alle Inhalte registrieren sich in window.DQ. */
(function (root) {
  'use strict';
  var DQ = root.DQ = root.DQ || { chapters: [], tasks: [], theories: [], byId: {} };

  /* Kapitel: sequence legt die Reihenfolge fest, z. B. ['T1A','1.1','1.2',…,'T1B',…]
   * after (optional): Station, nach der die erste Station dieses Kapitels offen ist (statt der letzten Station des Vorkapitels) */
  root.defChapter = function (c) {
    if (!c.id || !c.title || !c.sequence) throw new Error('defChapter: id, title, sequence nötig');
    c.stage = c.stage || (c.id <= 10 ? 'grund' : 'profi');
    DQ.chapters.push(c); return c;
  };

  /* Aufgabe
   * id ('1.1'), ch, title, story, brief, learn, take, hint, hint2, tags[]
   * palette: erlaubte Bauteiltypen; start / ref: Layouts {parts, wires}; wrong: [{name, parts, wires}]
   * need, tests, measure: siehe engine.js runTask
   * bench (optional): Werkbank-Layout {parts:[{id, x, y, rot}]} – eigene Lage je Bauteil-ID aus start/ref (siehe bench.js)
   * measureUX (optional): 'drag' (Standard: Werkbank – Spitzen ziehen) | 'legacy' (Klick auf die Buchse setzt die Messspitze; Werkbank: Spitzen ziehen,
   *   eigener Oszilloskop-Tastkopf, Messbereich von Hand waehlen – Schema-Ansicht bleibt beim Klick)
   * boss: true fuer Abschlussaufgabe */
  root.defTask = function (t) {
    ['id', 'ch', 'title', 'brief', 'start', 'ref'].forEach(function (k) { if (t[k] === undefined) throw new Error('defTask ' + t.id + ': ' + k + ' fehlt'); });
    t.kind = 'task';
    t.palette = t.palette || [];
    t.tests = t.tests || []; t.measure = t.measure || []; t.wrong = t.wrong || []; t.tags = t.tags || [];
    // rechenweg (optional): { messwertId: HTML | [{text, label?, expr?, value?, unit?}] } – erscheint in der Lösungsansicht und beim Aufdecken
    // eines Messwerts; fehlt er, erzeugt die App einen minimalen Rechenweg aus measure (Sollwert, Messart, Anschlüsse).
    if (t.rechenweg) Object.keys(t.rechenweg).forEach(function (k) { if (!(t.measure || []).some(function (m) { return m.id === k; })) throw new Error('defTask ' + t.id + ': rechenweg für unbekannten Messwert „' + k + '“'); });
    // measureUX: 'drag' (Standard seit 01.10.2026 – Werkbank: Spitzen und Tastkopf ziehen) | 'legacy' (Klick setzt die Spitze, nur noch für Sonderfälle)
    // rangeUX: 'auto' (Standard: Messbereich automatisch) | 'manual' (Bereich von Hand wählen, falscher Bereich zeigt OL – Kapitel 16, Tutorial)
    // setup (optional): HTML für die Box „So stellst du das Gerät ein“ oder { messwertId: HTML } je Messwert; sonst automatisch aus measure
    t.measureUX = t.measureUX || 'drag';
    if (t.measureUX !== 'legacy' && t.measureUX !== 'drag') throw new Error('defTask ' + t.id + ': measureUX muss legacy oder drag sein');
    t.rangeUX = t.rangeUX || 'auto';
    if (t.rangeUX !== 'auto' && t.rangeUX !== 'manual') throw new Error('defTask ' + t.id + ': rangeUX muss auto oder manual sein');
    // demo (optional): Messwert-ID, die der Vorführ-Modus zeigt (sonst der erste Messwert mit Spitzen a/b und Messart V, V~, Ω oder Oszilloskop)
    if (t.demo && !(t.measure || []).some(function (m) { return m.id === t.demo; })) throw new Error('defTask ' + t.id + ': demo verweist auf unbekannten Messwert „' + t.demo + '“');
    if (t.setup && typeof t.setup === 'object') Object.keys(t.setup).forEach(function (k) { if (!(t.measure || []).some(function (m) { return m.id === k; })) throw new Error('defTask ' + t.id + ': setup für unbekannten Messwert „' + k + '“'); });
    DQ.tasks.push(t); DQ.byId[t.id] = t; return t;
  };

  /* Mess-Aufgabe (Uebungswerkstatt): fertige, gesperrte Schaltung – nichts bauen, nur messen.
   * Wie defTask, aber palette = [] und ref = start (Topologie und Werte fix); measure ist Pflicht. */
  root.defMessaufgabe = function (t) {
    if (!t.start || !t.measure || !t.measure.length) throw new Error('defMessaufgabe ' + t.id + ': start und measure nötig');
    t.palette = []; t.ref = t.start; t.messOnly = true;
    return root.defTask(t);
  };

  /* Theorie-Auftrag: Lektion (HTML) + Fragen; bestanden ab 80 %
   * merksatz (empfohlen): ein bis zwei Saetze „Das Wichtigste in Kuerze“, erscheinen als Box am Ende der Lektion
   * visual (optional): Bild/Animation {type:'circuit'|'block'|…} oder Liste davon – siehe src/visuals.js und CLAUDE.md
   * question: {q, options[], correct, explain, verify?:{layout, mode, a, b} | verifyTruth?:{layout, sel, q}} */
  root.defTheory = function (t) {
    ['id', 'ch', 'title', 'lesson', 'questions'].forEach(function (k) { if (t[k] === undefined) throw new Error('defTheory ' + t.id + ': ' + k + ' fehlt'); });
    t.kind = 'theory'; t.pass = t.pass || 0.8; t.tags = t.tags || [];
    DQ.theories.push(t); DQ.byId[t.id] = t; return t;
  };

  /* Kurzschreibweise fuer Leitungen */
  root.W = function (from, to) { return { from: from, to: to }; };
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== content/_logic.js ==== */
/* Digital Quest – Helfer fuer Logik-Aufgaben am Experimentierboard (window.LG)
 * Konvention wie in den Unterlagen: E1 = a = niederwertigstes Bit. Kombination k: E_i = Bit (i−1) von k.
 *   LG.io(n, outs)          Startaufbau: Pegelschalter E1…En, Logikanzeigen L1…, Masse (Schema + Werkbank-Lage)
 *   LG.net(n, gates, outs)  Loesung: gates = [[id, typ, [Quellen]]], Quelle 'E1' | 'U1'; outs = { L1: 'U3' }
 *   LG.truth(n, f, opt)     Tests fuer alle Kombinationen; f(bits) → 0/1 bzw. Array fuer mehrere Ausgaenge; opt.dc = Don't-Cares
 *   LG.table(n, f, opt)     Wahrheitstabelle als HTML fuer den Auftragstext
 *   LG.bench(layout)        Werkbank-Lagen passend zu io/net */
(function (root) {
  'use strict';
  var IN_PIN = function (type, k) { return type === 'not' ? 'in' : (k === 0 ? 'in1' : 'in2'); };
  function bits(n, k) { var b = []; for (var i = 0; i < n; i++) b.push(k >> i & 1); return b; }

  function io(n, outs) {
    outs = outs || ['L1'];
    var parts = [{ id: 'GND1', type: 'ground', x: 120, y: 160 + 100 * n, rot: 0 }];
    for (var i = 1; i <= n; i++) parts.push({ id: 'E' + i, type: 'logicin', x: 160, y: 60 + 100 * i, rot: 0 });
    outs.forEach(function (id, j) { parts.push({ id: id, type: 'logicled', x: 860, y: 160 + 100 * j, rot: 0 }); });
    return { parts: parts, wires: [] };
  }
  function depthOf(gates) {
    var d = {};
    function dep(id) {
      if (/^E/.test(id)) return 0;
      if (d[id] !== undefined) return d[id];
      var g = gates.filter(function (x) { return x[0] === id; })[0];
      d[id] = 1 + Math.max.apply(null, g[2].map(dep)); return d[id];
    }
    gates.forEach(function (g) { dep(g[0]); });
    return d;
  }
  function net(n, gates, outs, extra) {
    var l = io(n, Object.keys(outs)), d = depthOf(gates), col = {};
    gates.forEach(function (g) {
      var c = d[g[0]], k = col[c] = (col[c] || 0) + 1;
      l.parts.push({ id: g[0], type: g[1], x: 180 + 150 * c, y: 60 + 110 * k, rot: 0 });
      g[2].forEach(function (src, j) { l.wires.push(W(src + '.out', g[0] + '.' + IN_PIN(g[1], j))); });
    });
    Object.keys(outs).forEach(function (L) { l.wires.push(W(outs[L] + '.out', L + '.in')); });
    if (extra) l.wires = l.wires.concat(extra);
    return l;
  }
  function bench(layout) {
    var p = [], d = {}, col = {}, gates = layout.parts.filter(function (x) { return /^U/.test(x.id); });
    gates.forEach(function (g) { d[g.id] = Math.round((g.x - 180) / 150); });
    layout.parts.forEach(function (q) {
      if (q.type === 'ground') p.push({ id: q.id, x: 180, y: 700, rot: 0 });
      else if (q.type === 'logicin') p.push({ id: q.id, x: 180, y: 90 + 125 * (+q.id.slice(1)), rot: 0 });
      else if (q.type === 'logicled') p.push({ id: q.id, x: 860, y: 230 + 120 * (+q.id.slice(1) - 1), rot: 0 });
      else if (/^U/.test(q.id)) { var c = d[q.id], k = col[c] = (col[c] || 0) + 1; p.push({ id: q.id, x: 230 + 140 * c, y: 90 + 130 * k, rot: 0 }); }
    });
    return { parts: p };
  }
  function truth(n, f, opt) {
    opt = opt || {}; var tests = [], outs = opt.outs || ['L1'];
    for (var k = 0; k < (1 << n); k++) {
      if (opt.dc && opt.dc.indexOf(k) >= 0) continue;
      var b = bits(n, k), set = {}, r = f(b), exp = [];
      b.forEach(function (v, i) { set['E' + (i + 1)] = { closed: !!v }; });
      (Array.isArray(r) ? r : [r]).forEach(function (v, j) { exp.push({ sel: outs[j], on: !!v }); });
      if (!tests.length) exp.push({ noFault: true });
      tests.push({ name: b.slice().reverse().map(function (v, i) { return 'E' + (n - i) + '=' + v; }).join(' '), set: set, expect: exp });
    }
    return tests;
  }
  function table(n, f, opt) {
    opt = opt || {}; var outs = opt.outs || ['A'], h = '<table class="tt"><tr>';
    for (var i = n; i >= 1; i--) h += '<th>E' + i + '</th>';
    outs.forEach(function (o) { h += '<th class="o">' + o + '</th>'; }); h += '</tr>';
    for (var k = 0; k < (1 << n); k++) {
      var b = bits(n, k), r = f(b); h += '<tr>';
      for (var j = n - 1; j >= 0; j--) h += '<td>' + b[j] + '</td>';
      (Array.isArray(r) ? r : [r]).forEach(function (v) { h += '<td class="o">' + (opt.dc && opt.dc.indexOf(k) >= 0 ? 'X' : v ? 1 : 0) + '</td>'; });
      h += '</tr>';
    }
    return h + '</table>';
  }
  /* Minterm-Funktion: 1 bei den genannten Kombinationen */
  function sigma(list) { return function (b) { var k = 0; b.forEach(function (v, i) { k += v << i; }); return list.indexOf(k) >= 0 ? 1 : 0; }; }
  root.LG = { io: io, net: net, bench: bench, truth: truth, table: table, sigma: sigma, bits: bits };
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== exam_core.js ==== */
/* Digital Quest – Pruefungen fuers Zertifikat: gemeinsamer Kern fuer Worker, Validator und Tests (DQExam).
 * Nach dem Vorbild von SPS Quest (exam_core.js). Der Browser bekommt nur publicItem(): nie ref, hidden oder wrong.
 *
 *   defExamTask({ id:'G01', level:'grund'|'profi', ch (Kapitel), diff:1|2|3, tags?,
 *     params:{ U:[9, 12], … },                       // pro Pruefung per Seed gewaehlt
 *     build: p => ({ title, brief, story?, palette, need?, limit?, start, ref, bench?,
 *                    tests:  [ … ],                   // sichtbar: damit prueft „Testen“ im Browser
 *                    hidden: [ … ],                   // verdeckt: nur der Server (Grenzfaelle, weitere Zustaende)
 *                    measure:[ … ],                   // Messprotokoll (Sollwert aus der abgegebenen Schaltung)
 *                    wrong:  [{name, parts, wires}] })  // typische Fehler, muessen scheitern (Validator)
 *   })
 *   defExamQuestion({ id, level, ch, q:'HTML', options:['…'], answer: Index })
 *
 * Abgabe einer Aufgabe: { layout:{parts, wires}, answers:{messId: Wert} }. Vorgegebene Bauteile (start) muessen
 * unveraendert vorhanden sein, neue Bauteile nur aus der Palette – sonst 0 Punkte. */
(function (root) {
  'use strict';
  var E = root.DQEngine; // wird vor diesem Modul geladen (Worker-Bundle, exam_pool.js); kein require – der Bundler von Cloudflare wuerde es aufloesen wollen
  var X = root.DQ_EXAM = root.DQ_EXAM || { tasks: [], questions: [] };
  var QUEST = 'dq', LEVELS = ['grund', 'profi'];
  var RULES = {
    grund: { tasks: 5, questions: 10, minutes: 60, mix: [2, 2, 1], chapters: [1, 10] },
    profi: { tasks: 4, questions: 10, minutes: 75, mix: [1, 2, 1], chapters: [11, 15] }
  };
  var WEIGHT = { tasks: 0.7, theory: 0.3 }, PASS = 0.7, DISTINCTION = 0.9, PARTIAL = 0.6;
  var LIMITS = { bytes: 20 * 1024, parts: 80, wires: 240 };

  root.defExamTask = function (o) {
    ['id', 'level', 'ch', 'build'].forEach(function (k) { if (o[k] === undefined) throw new Error('defExamTask ' + o.id + ': ' + k + ' fehlt'); });
    if (X.tasks.some(function (t) { return t.id === o.id; })) throw new Error('defExamTask: ' + o.id + ' doppelt');
    o.quest = QUEST; o.diff = o.diff || 2; X.tasks.push(o); return o;
  };
  root.defExamQuestion = function (o) {
    if (X.questions.some(function (q) { return q.id === o.id; })) throw new Error('defExamQuestion: ' + o.id + ' doppelt');
    o.quest = QUEST; X.questions.push(o); return o;
  };

  /* ---------- Zufall (deterministisch) ---------- */
  function hashStr(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  /* ---------- Parameter ---------- */
  function paramKeys(def) { return Object.keys(def.params || {}); }
  function pickParams(def, r) { var p = {}; paramKeys(def).forEach(function (k) { var v = def.params[k]; p[k] = v[Math.floor(r() * v.length)]; }); return p; }
  function allParams(def, n) { // alle Kombinationen (Validator); bei grossen Raeumen n zufaellige
    var out = [{}];
    paramKeys(def).forEach(function (k) { var nx = []; out.forEach(function (o) { def.params[k].forEach(function (v) { var c = Object.assign({}, o); c[k] = v; nx.push(c); }); }); out = nx; });
    if (n && out.length > n) out = shuffle(out, rng('all:' + def.id)).slice(0, n);
    return out;
  }
  function validParams(def, p) { // Parameter aus der Datenbank: nur Werte, die die Aufgabe kennt
    return paramKeys(def).every(function (k) { return def.params[k].some(function (v) { return JSON.stringify(v) === JSON.stringify(p && p[k]); }); });
  }

  /* ---------- Instanz einer Aufgabe ---------- */
  function instantiate(def, p) {
    var b = def.build(p || {});
    return { id: def.id, quest: QUEST, level: def.level, ch: def.ch, diff: def.diff, tags: def.tags || [], params: p || {},
      title: b.title || '', brief: b.brief || '', story: b.story || '', palette: b.palette || [], need: b.need || {}, limit: b.limit || null,
      start: b.start, ref: b.ref, bench: b.bench || null, tests: b.tests || [], hidden: b.hidden || [], measure: b.measure || [], wrong: b.wrong || [] };
  }
  /* Aufgabe im Format des Spiels (runTask). which: 'visible' = sichtbare Tests + Messprotokoll, 'hidden' = nur verdeckte Tests */
  function toTask(it, which) {
    var t = { id: it.id, ch: it.ch, kind: 'task', exam: true, title: it.title, brief: it.brief, story: it.story, palette: it.palette, start: it.start, bench: it.bench, tags: it.tags, wrong: [] };
    if (which === 'hidden') { t.tests = it.hidden; t.measure = []; t.need = {}; return t; }
    t.tests = it.tests; t.measure = it.measure; t.need = it.need; if (it.limit) t.limit = it.limit;
    return t;
  }
  /* Was der Browser sehen darf: keine Musterloesung, keine verdeckten Tests, keine Rechenwerte des Messprotokolls */
  function publicItem(it) {
    return { id: it.id, level: it.level, ch: it.ch, title: it.title, brief: it.brief, story: it.story, palette: it.palette, need: it.need, limit: it.limit,
      start: it.start, bench: it.bench, tests: it.tests, measure: it.measure.map(function (m) { return { id: m.id, ask: m.ask, unit: m.unit || '' }; }) };
  }

  /* ---------- Fragen ---------- */
  function questionItem(def, perm) {
    var opts = def.options || [];
    perm = perm && perm.length === opts.length ? perm : opts.map(function (_, i) { return i; });
    return { id: def.id, level: def.level, ch: def.ch, q: def.q, options: perm.map(function (i) { return opts[i]; }), perm: perm, answer: perm.indexOf(def.answer) };
  }
  function publicQuestion(qi) { return { id: qi.id, ch: qi.ch, q: qi.q, options: qi.options }; }

  /* ---------- Ziehung ---------- */
  function pool(level) { return { tasks: X.tasks.filter(function (t) { return t.level === level; }), questions: X.questions.filter(function (q) { return q.level === level; }) }; }
  function draw(level, seed) {
    var R = RULES[level], r = rng('exam:' + seed), P = pool(level), chosen = [], chs = {};
    [1, 2, 3].forEach(function (d, di) {
      var cand = shuffle(P.tasks.filter(function (t) { return t.diff === d; }), r);
      for (var n = 0; n < R.mix[di] && cand.length; n++) {
        var fresh = cand.filter(function (t) { return !chs[t.ch]; })[0] || cand[0];
        cand = cand.filter(function (t) { return t !== fresh; }); chosen.push(fresh); chs[fresh.ch] = 1;
      }
    });
    shuffle(P.tasks.filter(function (t) { return chosen.indexOf(t) < 0; }), r).slice(0, Math.max(0, R.tasks - chosen.length)).forEach(function (t) { chosen.push(t); chs[t.ch] = 1; });
    var qs = [], qc = shuffle(P.questions, r), qch = {};
    while (qs.length < R.questions && qc.length) { // Fragen ueber moeglichst viele Kapitel streuen
      var need = qc.filter(function (q) { return !qch[q.ch]; })[0];
      if (!need) { qch = {}; need = qc[0]; }
      qc = qc.filter(function (q) { return q !== need; }); qs.push(need); qch[need.ch] = 1;
    }
    chosen.sort(function (a, b) { return a.ch - b.ch || a.diff - b.diff; });
    return {
      tasks: chosen.map(function (t) { return { t: 'task', id: t.id, params: pickParams(t, r) }; }),
      questions: qs.sort(function (a, b) { return a.ch - b.ch; }).map(function (q) { return { t: 'q', id: q.id, perm: shuffle(q.options.map(function (_, i) { return i; }), r) }; })
    };
  }
  function taskDef(id) { return X.tasks.filter(function (t) { return t.id === id; })[0]; }
  function questionDef(id) { return X.questions.filter(function (q) { return q.id === id; })[0]; }
  function build(items) { // items aus draw() → vollstaendige Instanzen (nur Server/Validator)
    return {
      tasks: (items.tasks || []).filter(function (x) { return taskDef(x.id) && validParams(taskDef(x.id), x.params); }).map(function (x) { return instantiate(taskDef(x.id), x.params); }),
      questions: (items.questions || []).filter(function (x) { return questionDef(x.id); }).map(function (x) { return questionItem(questionDef(x.id), x.perm); })
    };
  }

  /* ---------- Abgabe pruefen und saeubern ---------- */
  var PROP_FREE = { closed: 1, pos: 1 }; // stellt die lernende Person bzw. der Test
  function cleanProps(p) { var o = {}; Object.keys(p || {}).forEach(function (k) { var v = p[k]; if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') o[String(k).slice(0, 20)] = typeof v === 'string' ? v.slice(0, 40) : v; }); return o; }


  function cleanLayout(it, layout) {
    if (!layout || !Array.isArray(layout.parts) || !Array.isArray(layout.wires)) return { error: 'Keine Schaltung abgegeben.' };
    if (layout.parts.length > LIMITS.parts || layout.wires.length > LIMITS.wires) return { error: 'Die Schaltung ist zu gross.' };
    var ids = {}, parts = [], bad = null;
    layout.parts.forEach(function (p) {
      if (bad) return;
      if (!p || typeof p.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,11}$/.test(p.id) || !E.PARTS[p.type] || ids[p.id]) { bad = 'Ungültiges Bauteil in der Abgabe.'; return; }
      ids[p.id] = 1;
      var q = { id: p.id, type: p.type, x: +p.x || 0, y: +p.y || 0, rot: +p.rot || 0, props: cleanProps(p.props) };
      if (p.value !== undefined) { if (!(+p.value > 0) || !isFinite(+p.value)) { bad = 'Ungültiger Wert bei ' + p.id + '.'; return; } q.value = +p.value; }
      parts.push(q);
    });
    if (bad) return { error: bad };
    var wires = [];
    layout.wires.forEach(function (w) {
      if (bad) return;
      if (!w || typeof w.from !== 'string' || typeof w.to !== 'string' || w.from.length > 24 || w.to.length > 24) { bad = 'Ungültige Leitung in der Abgabe.'; return; }
      wires.push({ from: w.from, to: w.to });
    });
    if (bad) return { error: bad };
    // vorgegebene Bauteile unveraendert, neue nur aus der Palette
    var by = {}; parts.forEach(function (p) { by[p.id] = p; });
    var missing = it.start.parts.filter(function (s) { var p = by[s.id]; return !p || p.type !== s.type; }).map(function (s) { return s.id; });
    if (missing.length) return { error: 'Vorgegebene Bauteile fehlen: ' + missing.join(', ') + '. Bitte die Aufgabe zurücksetzen.' };
    // Werte der vorgegebenen Bauteile gelten wie gestellt (am Generator darf zum Messen gedreht werden – bewertet wird mit dem Aufgabenwert)
    it.start.parts.forEach(function (s) {
      var p = by[s.id], free = {};
      Object.keys(p.props).forEach(function (k) { if (PROP_FREE[k]) free[k] = p.props[k]; });
      p.props = Object.assign({}, cleanProps(s.props), free);
      if (s.value !== undefined) p.value = s.value; else delete p.value;
    });
    var given = {}; it.start.parts.forEach(function (s) { given[s.id] = 1; });
    var foreign = parts.filter(function (p) { return !given[p.id] && it.palette.indexOf(p.type) < 0; }).map(function (p) { return p.id; });
    if (foreign.length) return { error: 'Bauteile, die in dieser Aufgabe nicht erlaubt sind: ' + foreign.join(', ') + '.' };
    // vorgegebene Leitungen bleiben
    var has = {}; wires.forEach(function (w) { has[w.from + '|' + w.to] = has[w.to + '|' + w.from] = 1; });
    var cut = (it.start.wires || []).filter(function (w) { return !has[w.from + '|' + w.to]; });
    if (cut.length && !it.rewire) return { error: 'Vorgegebene Leitungen wurden entfernt. Bitte die Aufgabe zurücksetzen.' };
    return { layout: { parts: parts, wires: wires } };
  }
  function cleanAnswers(it, a) {
    var o = {}; a = a && typeof a === 'object' ? a : {};
    it.measure.forEach(function (m) { var v = a[m.id]; if (typeof v === 'number' || typeof v === 'string') o[m.id] = String(v).slice(0, 24); });
    return o;
  }

  /* ---------- Bewertung ---------- */
  function score(passed, total) { if (!total) return 0; if (passed === total) return 1; return Math.round(PARTIAL * passed / total * 1000) / 1000; }
  function gradeTask(it, answer) {
    var none = { points: 0, passed: 0, total: 0, ok: false, checks: [], hidden: { passed: 0, total: 0 } };
    if (JSON.stringify(answer || '').length > LIMITS.bytes) return Object.assign(none, { error: 'Abgabe zu gross (max. 20 KB).' });
    var c = cleanLayout(it, answer && answer.layout);
    if (c.error) return Object.assign(none, { error: c.error });
    var ans = cleanAnswers(it, answer && answer.answers), rv, rh;
    try { rv = E.runTask(toTask(it, 'visible'), c.layout, ans); } catch (e) { return Object.assign(none, { error: 'Die Schaltung lässt sich nicht berechnen: ' + String(e.message || e).slice(0, 160) }); }
    try { rh = it.hidden.length ? E.runTask(toTask(it, 'hidden'), c.layout, {}) : { results: [] }; } catch (e) { rh = { results: it.hidden.map(function () { return { ok: false }; }) }; }
    var all = rv.results.concat(rh.results), passed = all.filter(function (x) { return x.ok; }).length, points = score(passed, all.length);
    return { points: points, passed: passed, total: all.length, ok: points === 1, error: null,
      checks: rv.results.map(function (x) { return { ok: !!x.ok, text: String(x.text || '').slice(0, 200) }; }), // ohne Sollwerte
      hidden: { passed: rh.results.filter(function (x) { return x.ok; }).length, total: rh.results.length } };
  }
  function gradeQuestion(qi, answer) { var a = +answer; return { points: Number.isInteger(a) && a === qi.answer ? 1 : 0, ok: a === qi.answer }; }
  function total(built, pts) {
    var tp = built.tasks.map(function (t) { return pts[t.id] || 0; }), qp = built.questions.map(function (q) { return pts[q.id] || 0; });
    var avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; };
    var tA = avg(tp), qA = avg(qp), s = Math.round((WEIGHT.tasks * tA + WEIGHT.theory * qA) * 1000) / 1000;
    return { score: s, tasks: Math.round(tA * 1000) / 1000, theory: Math.round(qA * 1000) / 1000, passed: s >= PASS, distinction: s >= DISTINCTION };
  }
  /* Musterabgabe (Validator, Tests, Aufwaermen) */
  function refAnswer(it) { return { layout: { parts: it.ref.parts, wires: it.ref.wires }, answers: E.expectedAnswers(toTask(it, 'visible'), it.ref) }; }

  var api = { X: X, QUEST: QUEST, LEVELS: LEVELS, RULES: RULES, WEIGHT: WEIGHT, PASS: PASS, DISTINCTION: DISTINCTION, PARTIAL: PARTIAL, LIMITS: LIMITS,
    rng: rng, shuffle: shuffle, hashStr: hashStr, pickParams: pickParams, allParams: allParams, validParams: validParams,
    instantiate: instantiate, toTask: toTask, publicItem: publicItem, questionItem: questionItem, publicQuestion: publicQuestion,
    pool: pool, draw: draw, build: build, taskDef: taskDef, questionDef: questionDef,
    cleanLayout: cleanLayout, gradeTask: gradeTask, gradeFor: gradeTask, gradeQuestion: gradeQuestion, total: total, refAnswer: refAnswer };
  root.DQExam = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== content_exam/pool.js ==== */
/* Digital Quest – Pruefungspool (Zertifikat): Aufgabenvorlagen mit Parametern. Format: src/exam_core.js.
 * Diese Datei wird NICHT ins Spiel eingebaut – nur in den Worker (worker/gen/exam_bundle.js) und in den Validator
 * (validate_exam.js). Der Browser bekommt je Pruefung nur die oeffentliche Fassung der gezogenen Aufgaben.
 * Grundstufe G01–G11 (Kapitel 1–10), Profi-Stufe P01–P10 (Kapitel 11–15). Theoriefragen: build.js (aus den Lektionen). */
(function (root) {
  'use strict';
  var W = root.W, LG = root.LG, T = root.defExamTask;
  function P(id, type, x, y, rot, value, props) { var p = { id: id, type: type, x: x, y: y, rot: rot || 0 }; if (value !== undefined && value !== null) p.value = value; if (props) p.props = props; return p; }
  function lay(parts, wires) { return { parts: parts, wires: wires || [] }; }
  function plus(l, parts, wires) { return { parts: l.parts.concat(parts || []), wires: l.wires.concat(wires || []) }; }
  function named(name, l) { return { name: name, parts: l.parts, wires: l.wires }; }
  var E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  function e12(r) { var best = 10, d = Infinity; for (var e = 0; e <= 6; e++) E12.forEach(function (m) { var v = m * Math.pow(10, e - 1); if (Math.abs(Math.log(v / r)) < d) { d = Math.abs(Math.log(v / r)); best = v; } }); return +best.toPrecision(3); }
  function de(x, n) { return String(+(+x).toFixed(n === undefined ? 2 : n)).replace('.', ','); }
  function ohm(r) { return r >= 1000 ? de(r / 1000, 2) + ' kΩ' : de(r, 1) + ' Ω'; }
  var VF = { rot: 1.8, gelb: 2.0, gruen: 2.1, blau: 3.0 }, FARBE = { rot: 'rote', gelb: 'gelbe', gruen: 'grüne', blau: 'blaue' };
  function on(v) { return { closed: !!v }; }
  /* Taktfolge an E1: n Takte (steigende + fallende Flanke), danach expect */
  function clocks(n, expect, extra) { var s = []; for (var i = 0; i < n; i++) { s.push({ set: { E1: on(1) } }); s.push({ set: { E1: on(0) } }); } s[s.length - 1].expect = expect; return { name: n + ' Takt' + (n > 1 ? 'e' : ''), steps: (extra || []).concat(s) }; }

  /* ===================== GRUNDSTUFE ===================== */

  T({ id: 'G01', level: 'grund', ch: 1, diff: 1, tags: ['bauteil.led', 'elektro.dimensionieren'], params: { U: [5, 9, 12], farbe: ['rot', 'gelb', 'gruen', 'blau'] },
    build: function (p) {
      var start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('D1', 'led', 500, 300, 90, null, { color: p.farbe })]);
      var r = e12((p.U - VF[p.farbe]) / 0.015), wires = [W('B1.p', 'R1.a'), W('R1.b', 'D1.a'), W('D1.k', 'B1.n')];
      return { title: 'LED an ' + p.U + ' V', palette: ['resistor'], need: { resistor: 1 }, start: start,
        brief: 'Schliesse die <b>' + FARBE[p.farbe] + ' LED</b> an die Quelle mit <b>' + p.U + ' V</b> an. Wähle den <b>Vorwiderstand</b> so, dass 10–20 mA fliessen. Miss danach die Spannung an der LED und den Strom.',
        ref: plus(start, [P('R1', 'resistor', 300, 200, 0, r)], wires),
        tests: [{ name: 'Betrieb', expect: [{ sel: 'D1', on: true, i: [0.01, 0.02] }, { noFault: true }] }],
        hidden: [{ name: 'Reserve', set: { B1: { value: +(p.U * 1.1).toFixed(2) } }, expect: [{ sel: 'D1', on: true }, { noFault: true }] }],
        measure: [{ id: 'uled', ask: 'Spannung an der LED', unit: 'V', mode: 'V', a: 'D1.a', b: 'D1.k', tol: 0.03 }, { id: 'i', ask: 'Strom durch die LED', unit: 'mA', truth: { sel: 'D1', q: 'i' }, tol: 0.03 }],
        wrong: [named('Vorwiderstand viel zu klein', plus(start, [P('R1', 'resistor', 300, 200, 0, 10)], wires)), named('Vorwiderstand zu gross', plus(start, [P('R1', 'resistor', 300, 200, 0, r * 5)], wires)),
          named('LED verpolt', plus(start, [P('R1', 'resistor', 300, 200, 0, r)], [W('B1.p', 'R1.a'), W('R1.b', 'D1.k'), W('D1.a', 'B1.n')]))] };
    } });

  T({ id: 'G02', level: 'grund', ch: 2, diff: 1, tags: ['elektro.spannungsteiler'], params: { U: [9, 12, 24], k: [2, 3, 4], R2: [1000, 2200, 4700] },
    build: function (p) {
      var ua = p.U / p.k, start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('R2', 'resistor', 480, 380, 90, p.R2)], [W('R2.b', 'B1.n')]);
      var wires = [W('B1.p', 'R1.a'), W('R1.b', 'R2.a')], r1 = p.R2 * (p.k - 1);
      return { title: 'Spannungsteiler auf ' + de(ua) + ' V', palette: ['resistor'], need: { resistor: 2 }, limit: { resistor: 2 }, start: start,
        brief: 'Ergänze den <b>Spannungsteiler</b>: An R2 (' + ohm(p.R2) + ') sollen <b>' + de(ua) + ' V</b> liegen (±3 %), die Quelle liefert ' + p.U + ' V. Setze <b>einen</b> Widerstand R1 ein und miss den Strom durch R2.',
        ref: plus(start, [P('R1', 'resistor', 480, 220, 90, r1)], wires),
        tests: [{ name: 'Teilspannung', expect: [{ a: 'R2.a', b: 'R2.b', v: [ua * 0.97, ua * 1.03] }, { noFault: true }] }],
        hidden: [{ name: 'Doppelte Speisung', set: { B1: { value: 2 * p.U } }, expect: [{ a: 'R2.a', b: 'R2.b', v: [2 * ua * 0.97, 2 * ua * 1.03] }] }],
        measure: [{ id: 'i', ask: 'Strom durch R2', unit: 'mA', truth: { sel: 'R2', q: 'i' }, tol: 0.03 }],
        wrong: [named('R1 falsch gewählt', plus(start, [P('R1', 'resistor', 480, 220, 90, p.R2 * (p.k === 2 ? 2 : 1))], wires)), named('R1 parallel statt in Reihe', plus(start, [P('R1', 'resistor', 620, 380, 90, r1)], [W('B1.p', 'R2.a'), W('R1.a', 'R2.a'), W('R1.b', 'R2.b')]))] };
    } });

  T({ id: 'G03', level: 'grund', ch: 2, diff: 2, tags: ['elektro.parallelschaltung', 'elektro.kirchhoff'], params: { U: [5, 6], R1: [1000, 2200], n: [2, 3, 5] },
    build: function (p) {
      var i1 = p.U / p.R1, ig = p.n * i1, r2 = p.R1 / (p.n - 1);
      var start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('A1', 'ammeter', 300, 200, 0), P('R1', 'resistor', 460, 300, 90, p.R1)], [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n')]);
      var wires = [W('R2.a', 'R1.a'), W('R2.b', 'R1.b')];
      return { title: 'Gesamtstrom ' + de(ig * 1000, 1) + ' mA', palette: ['resistor'], need: { resistor: 2 }, limit: { resistor: 2 }, start: start,
        brief: 'Durch R1 (' + ohm(p.R1) + ') fliessen an ' + p.U + ' V ' + de(i1 * 1000, 2) + ' mA. Schalte <b>einen Widerstand R2 parallel</b>, sodass der Strommesser A1 <b>' + de(ig * 1000, 1) + ' mA</b> zeigt (±3 %). Trage den Strom durch R2 und den Gesamtwiderstand ein.',
        ref: plus(start, [P('R2', 'resistor', 620, 300, 90, +r2.toPrecision(4))], wires),
        tests: [{ name: 'Gesamtstrom', expect: [{ sel: 'A1', i: [ig * 0.97, ig * 1.03] }, { noFault: true }] }],
        hidden: [{ name: 'R1 unverändert', expect: [{ sel: 'R1', i: [i1 * 0.98, i1 * 1.02] }] }],
        measure: [{ id: 'i2', ask: 'Strom durch R2', unit: 'mA', truth: { sel: 'R2', q: 'i' }, tol: 0.03 }, { id: 'rg', ask: 'Gesamtwiderstand (berechnet)', unit: 'Ω', value: p.R1 / p.n, tol: 0.03 }],
        wrong: [named('R2 = R1', plus(start, [P('R2', 'resistor', 620, 300, 90, p.n === 2 ? p.R1 * 2 : p.R1)], wires)), named('R2 in Reihe', { parts: start.parts.concat([P('R2', 'resistor', 620, 300, 90, +r2.toPrecision(4))]), wires: [W('B1.p', 'A1.a'), W('A1.b', 'R1.a'), W('R1.b', 'B1.n'), W('R2.a', 'R1.b')] })] };
    } });

  T({ id: 'G04', level: 'grund', ch: 3, diff: 2, tags: ['elektro.gleichrichter', 'bauteil.diode'], params: { U: [10, 12, 15], f: [50, 100] },
    build: function (p) {
      var dc = (p.U - 0.7) / Math.PI;
      var start = lay([P('G1', 'acsource', 160, 300, 0, p.U, { freq: p.f, shape: 'sine', offset: 0 }), P('R1', 'resistor', 520, 300, 90, 1000)], [W('R1.b', 'G1.n')]);
      return { title: 'Einweggleichrichter', palette: ['diode'], need: { diode: 1 }, limit: { diode: 1 }, start: start,
        brief: 'Der Generator liefert eine Sinusspannung mit <b>Û = ' + p.U + ' V</b> und ' + p.f + ' Hz. Baue mit <b>einer Diode</b> einen Einweggleichrichter: R1.a soll nur <b>positive</b> Halbwellen bekommen. Miss den Gleichanteil und den Scheitelwert an R1.',
        ref: plus(start, [P('V1', 'diode', 340, 200, 0)], [W('G1.p', 'V1.a'), W('V1.k', 'R1.a')]),
        tests: [{ name: 'Einweg', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'dc', range: [dc * 0.9, dc * 1.1] }, { noFault: true }] }],
        hidden: [{ name: 'Scheitel', expect: [{ a: 'R1.a', b: 'R1.b', ac: 'peak', range: [(p.U - 0.9) * 0.97, p.U - 0.5] }] }],
        measure: [{ id: 'udc', ask: 'Gleichanteil an R1 (V⎓)', unit: 'V', mode: 'AC', q: 'dc', a: 'R1.a', b: 'R1.b', tol: 0.05 }, { id: 'up', ask: 'Scheitelwert an R1 (Oszilloskop)', unit: 'V', mode: 'AC', q: 'peak', a: 'R1.a', b: 'R1.b', tol: 0.05 }],
        wrong: [named('Diode verkehrt', plus(start, [P('V1', 'diode', 340, 200, 180)], [W('G1.p', 'V1.k'), W('V1.a', 'R1.a')])), named('Diode parallel zu R1', plus(start, [P('V1', 'diode', 640, 300, 90)], [W('G1.p', 'R1.a'), W('V1.a', 'R1.a'), W('V1.k', 'R1.b')]))] };
    } });

  T({ id: 'G05', level: 'grund', ch: 4, diff: 1, tags: ['messen.spannung', 'messen.strom'], params: { U: [9, 12, 24], R1: [470, 1000], R2: [1000, 2200], R3: [2200, 4700] },
    build: function (p) {
      var start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('S1', 'switch', 300, 200, 0, null, { closed: false }), P('R1', 'resistor', 440, 200, 0, p.R1), P('R2', 'resistor', 560, 300, 90, p.R2), P('R3', 'resistor', 700, 300, 90, p.R3)],
        [W('B1.p', 'S1.a'), W('S1.b', 'R1.a'), W('R1.b', 'R2.a'), W('R2.a', 'R3.a'), W('R2.b', 'B1.n'), W('R3.b', 'R2.b')]);
      var ref = JSON.parse(JSON.stringify(start)); ref.parts[1].props.closed = true;
      var m = { S1: { closed: true } };
      return { title: 'Messen in der gemischten Schaltung', palette: [], start: start, ref: ref,
        brief: 'R1 liegt in Reihe zur Parallelschaltung aus R2 und R3. <b>Schalte S1 ein</b> und miss: die Spannung an R1, die Spannung an R2 und den Strom durch R3. Rechne den Gesamtstrom aus deinen Messwerten.',
        tests: [{ name: 'Eingeschaltet', expect: [{ sel: 'R1', i: [p.U / (p.R1 + p.R2 * p.R3 / (p.R2 + p.R3)) * 0.98, p.U / (p.R1 + p.R2 * p.R3 / (p.R2 + p.R3)) * 1.02] }, { noFault: true }] }],
        measure: [{ id: 'u1', ask: 'Spannung an R1', unit: 'V', truth: { sel: 'R1', q: 'v' }, set: m, tol: 0.03 }, { id: 'u2', ask: 'Spannung an R2', unit: 'V', truth: { sel: 'R2', q: 'v' }, set: m, tol: 0.03 },
          { id: 'i3', ask: 'Strom durch R3', unit: 'mA', truth: { sel: 'R3', q: 'i' }, set: m, tol: 0.03 }, { id: 'ig', ask: 'Gesamtstrom', unit: 'mA', truth: { sel: 'R1', q: 'i' }, set: m, tol: 0.03 }],
        wrong: [] };
    } });

  T({ id: 'G06', level: 'grund', ch: 5, diff: 1, tags: ['digital.bcd', 'digital.7segment', 'digital.binaer'], params: { z: [[3, 6, 9], [2, 5, 8], [4, 7, 1], [6, 9, 0]], dual: ['1011', '1101', '0110', '1110', '1001'] },
    build: function (p) {
      var ins = [1, 2, 3, 4].map(function (i) { return P('E' + i, 'logicin', 180, 200 + 40 * i, 0); });
      var start = lay([P('GND1', 'ground', 120, 520, 0), P('IC1', 'dec7', 380, 300, 0), P('AZ1', 'seg7', 600, 300, 0)].concat(ins));
      var wires = ['A', 'B', 'C', 'D'].map(function (k, i) { return W('E' + (i + 1) + '.out', 'IC1.' + k); }).concat('abcdefg'.split('').map(function (s) { return W('IC1.' + s, 'AZ1.' + s); }));
      var t = function (n) { var set = {}; [0, 1, 2, 3].forEach(function (i) { set['E' + (i + 1)] = on(n >> i & 1); }); return { name: 'Zahl ' + n, set: set, expect: [{ sel: 'AZ1', digit: n }] }; };
      var bad = wires.map(function (w) { return w.from === 'E1.out' ? W('E1.out', 'IC1.D') : w.from === 'E4.out' ? W('E4.out', 'IC1.A') : w; });
      return { title: 'BCD-Anzeige verdrahten', palette: [], start: start, ref: plus(start, [], wires),
        brief: 'Verdrahte die Pegelschalter mit dem BCD-Decoder IC1 und den Decoder mit der 7-Segment-Anzeige: <b>E1 ist das niederwertigste Bit</b> (Eingang A), E4 das höchstwertige (D). Die Anzeige muss jede eingestellte Ziffer richtig zeigen. Rechne ausserdem die Dualzahl <b>' + p.dual + '</b> ins Dezimalsystem um.',
        tests: [t(p.z[0]), t(p.z[1])], hidden: [t(p.z[2]), t(7 - (p.z[0] % 2))],
        measure: [{ id: 'dez', ask: 'Dualzahl ' + p.dual + ' dezimal', unit: '', value: parseInt(p.dual, 2), tol: 0, abs: 0.01 }],
        wrong: [named('Bitreihenfolge vertauscht', plus(start, [], bad))] };
    } });

  var G07 = [
    { txt: 'A = (E1 ∧ E2) ∨ E3', f: function (b) { return (b[0] & b[1]) | b[2]; }, g: [['U1', 'and', ['E1', 'E2']], ['U2', 'or', ['U1', 'E3']]], w: [['U1', 'or', ['E1', 'E2']], ['U2', 'and', ['U1', 'E3']]] },
    { txt: 'A = (E1 ∨ E2) ∧ ¬E3', f: function (b) { return (b[0] | b[1]) & (1 - b[2]); }, g: [['U1', 'or', ['E1', 'E2']], ['U2', 'not', ['E3']], ['U3', 'and', ['U1', 'U2']]], w: [['U1', 'or', ['E1', 'E2']], ['U3', 'and', ['U1', 'E3']]] },
    { txt: 'A = ¬(E1 ∧ E2) ∧ E3', f: function (b) { return (1 - (b[0] & b[1])) & b[2]; }, g: [['U1', 'and', ['E1', 'E2']], ['U2', 'not', ['U1']], ['U3', 'and', ['U2', 'E3']]], w: [['U1', 'and', ['E1', 'E2']], ['U3', 'and', ['U1', 'E3']]] },
    { txt: 'A = (E1 ∧ ¬E2) ∨ (E2 ∧ E3)', f: function (b) { return (b[0] & (1 - b[1])) | (b[1] & b[2]); }, g: [['U1', 'not', ['E2']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], w: [['U2', 'and', ['E1', 'E2']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]] },
    { txt: 'A = ¬E1 ∨ (E2 ∧ E3)', f: function (b) { return (1 - b[0]) | (b[1] & b[2]); }, g: [['U1', 'not', ['E1']], ['U2', 'and', ['E2', 'E3']], ['U3', 'or', ['U1', 'U2']]], w: [['U2', 'and', ['E2', 'E3']], ['U3', 'or', ['E1', 'U2']]] }
  ];
  function last(g) { return g[g.length - 1][0]; }
  T({ id: 'G07', level: 'grund', ch: 6, diff: 1, tags: ['digital.gatter', 'digital.wahrheitstabelle'], params: { v: [0, 1, 2, 3, 4] },
    build: function (p) {
      var v = G07[p.v], ref = LG.net(3, v.g, { L1: last(v.g) }), tt = LG.truth(3, v.f);
      return { title: 'Schaltung aus der Gleichung', palette: ['and', 'or', 'not'], limit: { gates: 4 }, start: LG.io(3), ref: ref, bench: LG.bench(ref),
        brief: 'Baue die Schaltung zur Gleichung <b>' + v.txt + '</b> aus Grundgattern. L1 zeigt A.<p class="limit">Erlaubt: höchstens <b>4</b> Gatter.</p>',
        tests: tt.filter(function (_, i) { return i % 2 === 0; }), hidden: tt.filter(function (_, i) { return i % 2 === 1; }), measure: [],
        wrong: [named('Verknüpfung verwechselt', LG.net(3, v.w, { L1: last(v.w) }))] };
    } });

  var G08 = {
    UND: { n: 2, f: function (b) { return b[0] & b[1]; }, g: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['U1', 'U1']]], lim: 2 },
    ODER: { n: 2, f: function (b) { return b[0] | b[1]; }, g: [['U1', 'nand', ['E1', 'E1']], ['U2', 'nand', ['E2', 'E2']], ['U3', 'nand', ['U1', 'U2']]], lim: 3 },
    NOR: { n: 2, f: function (b) { return 1 - (b[0] | b[1]); }, g: [['U1', 'nand', ['E1', 'E1']], ['U2', 'nand', ['E2', 'E2']], ['U3', 'nand', ['U1', 'U2']], ['U4', 'nand', ['U3', 'U3']]], lim: 4 },
    XOR: { n: 2, f: function (b) { return b[0] ^ b[1]; }, g: [['U1', 'nand', ['E1', 'E2']], ['U2', 'nand', ['E1', 'U1']], ['U3', 'nand', ['E2', 'U1']], ['U4', 'nand', ['U2', 'U3']]], lim: 4 }
  };
  T({ id: 'G08', level: 'grund', ch: 7, diff: 2, tags: ['digital.nand', 'digital.normiert', 'digital.demorgan'], params: { ziel: ['UND', 'ODER', 'NOR', 'XOR'] },
    build: function (p) {
      var v = G08[p.ziel], ref = LG.net(2, v.g, { L1: last(v.g) }), one = [['U1', 'nand', ['E1', 'E2']]];
      return { title: p.ziel + ' nur aus NAND', palette: ['nand'], limit: { gates: v.lim }, start: LG.io(2), ref: ref, bench: LG.bench(ref),
        brief: 'Baue die Funktion <b>' + p.ziel + '</b> (E1, E2 → L1) <b>nur aus NAND-Gattern</b>.' + LG.table(2, v.f) + '<p class="limit">Erlaubt: höchstens <b>' + v.lim + '</b> NAND-Gatter.</p>',
        tests: LG.truth(2, v.f), hidden: [], measure: [], wrong: [named('ein einzelnes NAND', LG.net(2, one, { L1: 'U1' }))] };
    } });

  var G09 = [
    { m: [3, 5, 6, 7], pal: ['and', 'or', 'not'], lim: 5, g: [['U1', 'and', ['E1', 'E2']], ['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U1', 'U2']], ['U5', 'or', ['U4', 'U3']]] },
    { m: [1, 2, 4, 7], pal: ['and', 'or', 'not', 'xor'], lim: 2, g: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']]] },
    { m: [4, 5, 6], pal: ['and', 'or', 'not', 'nand'], lim: 2, g: [['U1', 'nand', ['E1', 'E2']], ['U2', 'and', ['U1', 'E3']]] },
    { m: [1, 3, 6, 7], pal: ['and', 'or', 'not'], lim: 4, g: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]] },
    { m: [0, 1, 2, 3, 7], pal: ['and', 'or', 'not'], lim: 3, g: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'E2']], ['U3', 'or', ['U1', 'U2']]] }
  ];
  T({ id: 'G09', level: 'grund', ch: 8, diff: 3, tags: ['digital.kv', 'digital.vereinfachen', 'digital.entwurf'], params: { v: [0, 1, 2, 3, 4] },
    build: function (p) {
      var v = G09[p.v], f = LG.sigma(v.m), ref = LG.net(3, v.g, { L1: last(v.g) });
      var w = [['U1', 'and', ['E1', 'E2']], ['U2', 'or', ['U1', 'E3']]];
      return { title: 'Von der Wahrheitstabelle zur Schaltung', palette: v.pal, limit: { gates: v.lim }, start: LG.io(3), ref: ref, bench: LG.bench(ref),
        brief: 'Entwirf die Schaltung zu dieser Wahrheitstabelle und <b>vereinfache</b> sie (KV-Diagramm oder Boolesche Algebra). L1 zeigt A.' + LG.table(3, f) + '<p class="limit">Erlaubt: höchstens <b>' + v.lim + '</b> Gatter.</p>',
        tests: LG.truth(3, f), hidden: [], measure: [], wrong: [named('nicht die verlangte Funktion', LG.net(3, w, { L1: 'U2' }))] };
    } });

  var G10 = {
    halb: { n: 2, outs: ['S', 'C'], txt: 'den <b>Halbaddierer</b>: L1 = Summe S, L2 = Übertrag C', f: function (b) { return [b[0] ^ b[1], b[0] & b[1]]; }, pal: ['and', 'or', 'xor', 'not'], lim: 2,
      g: [['U1', 'xor', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]], o: { L1: 'U1', L2: 'U2' }, w: [['U1', 'or', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]] },
    voll: { n: 3, outs: ['S', 'C'], txt: 'den <b>Volladdierer</b> (E1 + E2 + E3): L1 = Summe S, L2 = Übertrag C', f: function (b) { var s = b[0] + b[1] + b[2]; return [s & 1, s >> 1]; }, pal: ['and', 'or', 'xor', 'not'], lim: 5,
      g: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']], ['U4', 'and', ['U1', 'E3']], ['U5', 'or', ['U3', 'U4']]], o: { L1: 'U2', L2: 'U5' },
      w: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']]] },
    komp: { n: 2, outs: ['A=B', 'A>B'], txt: 'den <b>1-Bit-Komparator</b> (A = E2, B = E1): L1 leuchtet bei A = B, L2 bei A &gt; B', f: function (b) { return [b[0] === b[1] ? 1 : 0, b[1] & (1 - b[0])]; }, pal: ['and', 'or', 'xor', 'xnor', 'not'], lim: 3,
      g: [['U1', 'xnor', ['E1', 'E2']], ['U2', 'not', ['E1']], ['U3', 'and', ['E2', 'U2']]], o: { L1: 'U1', L2: 'U3' }, w: [['U1', 'xor', ['E1', 'E2']], ['U2', 'not', ['E1']], ['U3', 'and', ['E2', 'U2']]] }
  };
  T({ id: 'G10', level: 'grund', ch: 9, diff: 3, tags: ['digital.addierer', 'digital.komparator'], params: { art: ['halb', 'voll', 'komp'] },
    build: function (p) {
      var v = G10[p.art], ref = LG.net(v.n, v.g, v.o), wo = {}; Object.keys(v.o).forEach(function (k) { wo[k] = v.w.some(function (g) { return g[0] === v.o[k]; }) ? v.o[k] : last(v.w); });
      return { title: p.art === 'komp' ? 'Komparator' : p.art === 'halb' ? 'Halbaddierer' : 'Volladdierer', palette: v.pal, limit: { gates: v.lim }, start: LG.io(v.n, ['L1', 'L2']), ref: ref, bench: LG.bench(ref),
        brief: 'Baue ' + v.txt + '.' + LG.table(v.n, v.f, { outs: v.outs }) + '<p class="limit">Erlaubt: höchstens <b>' + v.lim + '</b> Gatter.</p>',
        tests: LG.truth(v.n, v.f, { outs: ['L1', 'L2'] }), hidden: [], measure: [], wrong: [named('ein Ausgang falsch', LG.net(v.n, v.w, wo))] };
    } });

  var G11 = {
    mux: { outs: ['Y'], leds: ['L1'], txt: 'einen <b>Multiplexer 2:1</b>: E3 = Auswahl S. Bei S = 0 zeigt L1 den Eingang E1, bei S = 1 den Eingang E2', f: function (b) { return b[2] ? b[1] : b[0]; }, lim: 4,
      g: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], o: { L1: 'U4' }, w: [['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]], wo: { L1: 'U4' } },
    demux: { outs: ['Y0', 'Y1'], leds: ['L1', 'L2'], txt: 'einen <b>Demultiplexer 1:2</b>: E1 = Daten, E2 = Auswahl S. Bei S = 0 geht E1 auf L1 (Y0), bei S = 1 auf L2 (Y1); der andere Ausgang ist 0', n: 2, f: function (b) { return [b[0] & (1 - b[1]), b[0] & b[1]]; }, lim: 3,
      g: [['U1', 'not', ['E2']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E1', 'E2']]], o: { L1: 'U2', L2: 'U3' }, w: [['U2', 'and', ['E1', 'E2']], ['U3', 'and', ['E1', 'E2']]], wo: { L1: 'U2', L2: 'U3' } }
  };
  T({ id: 'G11', level: 'grund', ch: 10, diff: 2, tags: ['digital.multiplexer', 'digital.demultiplexer'], params: { art: ['mux', 'demux'] },
    build: function (p) {
      var v = G11[p.art], n = v.n || 3, ref = LG.net(n, v.g, v.o);
      return { title: p.art === 'mux' ? 'Multiplexer 2:1' : 'Demultiplexer 1:2', palette: ['and', 'or', 'not'], limit: { gates: v.lim }, start: LG.io(n, v.leds), ref: ref, bench: LG.bench(ref),
        brief: 'Baue ' + v.txt + '.' + LG.table(n, v.f, { outs: v.outs }) + '<p class="limit">Erlaubt: höchstens <b>' + v.lim + '</b> Gatter.</p>',
        tests: LG.truth(n, v.f, { outs: v.leds }), hidden: [], measure: [], wrong: [named('Auswahl nicht invertiert', LG.net(n, v.w, v.wo))] };
    } });

  /* ===================== PROFI-STUFE ===================== */

  T({ id: 'P01', level: 'profi', ch: 11, diff: 1, tags: ['elektro.zeitkonstante', 'elektro.rc'], params: { U: [5, 10], C: [47e-6, 100e-6], tau: [0.5, 1, 2.2] },
    build: function (p) {
      var r = p.tau / p.C, start = lay([P('B1', 'battery', 160, 300, 0, p.U), P('C1', 'capacitor', 520, 300, 90, p.C)], [W('C1.b', 'B1.n')]);
      var wires = [W('B1.p', 'R1.a'), W('R1.b', 'C1.a')], u1 = p.U * (1 - Math.exp(-1)), u3 = p.U * (1 - Math.exp(-3));
      return { title: 'Zeitkonstante ' + de(p.tau, 1) + ' s', palette: ['resistor'], need: { resistor: 1 }, limit: { resistor: 1 }, start: start,
        brief: 'Der Kondensator C1 (' + de(p.C * 1e6, 0) + ' µF) soll über einen Widerstand an ' + p.U + ' V geladen werden. Wähle den <b>Ladewiderstand</b> so, dass die Zeitkonstante <b>τ = ' + de(p.tau, 1) + ' s</b> beträgt (±5 %). Trage den Widerstand und die Spannung nach 1 τ ein.',
        ref: plus(start, [P('R1', 'resistor', 340, 200, 0, +r.toPrecision(4))], wires),
        tests: [{ name: 'Ladekurve', steps: [{ name: 'nach 1 τ', run: p.tau, dt: p.tau / 400, expect: [{ sel: 'C1', v: [u1 * 0.96, u1 * 1.04] }, { noFault: true }] }] }],
        hidden: [{ name: 'Ladekurve lang', steps: [{ name: 'nach 3 τ', run: 3 * p.tau, dt: p.tau / 200, expect: [{ sel: 'C1', v: [u3 * 0.975, u3 * 1.02] }] }] }],
        measure: [{ id: 'r', ask: 'Ladewiderstand (berechnet)', unit: 'kΩ', value: r, tol: 0.05 }, { id: 'u', ask: 'Spannung an C1 nach 1 τ', unit: 'V', value: u1, tol: 0.05 }],
        wrong: [named('R um Faktor 10 zu klein', plus(start, [P('R1', 'resistor', 340, 200, 0, +(r / 10).toPrecision(4))], wires)), named('R doppelt so gross', plus(start, [P('R1', 'resistor', 340, 200, 0, +(r * 2).toPrecision(4))], wires))] };
    } });

  T({ id: 'P02', level: 'profi', ch: 14, diff: 2, tags: ['elektro.filter', 'elektro.grenzfrequenz'], params: { fg: [159, 338, 723], C: [100e-9, 220e-9, 470e-9] },
    build: function (p) {
      var r = 1 / (2 * Math.PI * p.fg * p.C), ue = 10 / Math.SQRT2;
      var start = lay([P('G1', 'acsource', 160, 300, 0, 10, { freq: p.fg, shape: 'sine', offset: 0 }), P('C1', 'capacitor', 520, 300, 90, p.C)], [W('C1.b', 'G1.n')]);
      var wires = [W('G1.p', 'R1.a'), W('R1.b', 'C1.a')];
      return { title: 'Tiefpass mit f_g = ' + p.fg + ' Hz', palette: ['resistor'], need: { resistor: 1 }, limit: { resistor: 1 }, start: start,
        brief: 'Baue mit C1 (' + de(p.C * 1e9, 0) + ' nF) einen <b>RC-Tiefpass</b> mit der Grenzfrequenz <b>f_g = ' + p.fg + ' Hz</b>. Ausgang ist die Spannung an C1. Der Generator liefert Û = 10 V. Miss die Ausgangsspannung (V~) bei f_g.',
        ref: plus(start, [P('R1', 'resistor', 340, 200, 0, +r.toPrecision(4))], wires),
        tests: [{ name: 'Bei f_g', set: { G1: { freq: p.fg } }, expect: [{ a: 'C1.a', b: 'C1.b', ac: 'rms', range: [ue * 0.68, ue * 0.735] }, { noFault: true }] }],
        hidden: [{ name: 'Bei 10 · f_g', set: { G1: { freq: 10 * p.fg } }, expect: [{ a: 'C1.a', b: 'C1.b', ac: 'rms', range: [ue * 0.085, ue * 0.115] }] }],
        measure: [{ id: 'ua', ask: 'U_a bei f_g (V~, TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'C1.a', b: 'C1.b', tol: 0.04, set: { G1: { freq: p.fg } } }, { id: 'r', ask: 'Widerstand (berechnet)', unit: 'kΩ', value: r, tol: 0.05 }],
        wrong: [named('R um Faktor 2π daneben', plus(start, [P('R1', 'resistor', 340, 200, 0, +(1 / (p.fg * p.C)).toPrecision(4))], wires)), named('R und C vertauscht (Hochpass)', { parts: start.parts.concat([P('R1', 'resistor', 340, 200, 0, +r.toPrecision(4))]), wires: [W('C1.b', 'G1.n'), W('G1.p', 'C1.a'), W('R1.a', 'C1.a'), W('R1.b', 'G1.n')] })] };
    } });

  T({ id: 'P03', level: 'profi', ch: 14, diff: 2, tags: ['elektro.filter', 'elektro.grenzfrequenz'], params: { fg: [100, 200, 500], R: [1000, 2200, 4700] },
    build: function (p) {
      var c = 1 / (2 * Math.PI * p.fg * p.R), ue = 10 / Math.SQRT2;
      var start = lay([P('G1', 'acsource', 160, 300, 0, 10, { freq: p.fg, shape: 'sine', offset: 0 }), P('R1', 'resistor', 520, 300, 90, p.R)], [W('R1.b', 'G1.n')]);
      var wires = [W('G1.p', 'C1.a'), W('C1.b', 'R1.a')];
      return { title: 'Hochpass mit f_g = ' + p.fg + ' Hz', palette: ['capacitor'], need: { capacitor: 1 }, limit: { capacitor: 1 }, start: start,
        brief: 'Baue mit R1 (' + ohm(p.R) + ') einen <b>RC-Hochpass</b> mit der Grenzfrequenz <b>f_g = ' + p.fg + ' Hz</b>. Ausgang ist die Spannung an R1. Der Generator liefert Û = 10 V. Miss die Ausgangsspannung (V~) bei f_g.',
        ref: plus(start, [P('C1', 'capacitor', 340, 200, 0, +c.toPrecision(4))], wires),
        tests: [{ name: 'Bei f_g', set: { G1: { freq: p.fg } }, expect: [{ a: 'R1.a', b: 'R1.b', ac: 'rms', range: [ue * 0.68, ue * 0.735] }, { noFault: true }] }],
        hidden: [{ name: 'Bei f_g / 10', set: { G1: { freq: p.fg / 10 } }, expect: [{ a: 'R1.a', b: 'R1.b', ac: 'rms', range: [ue * 0.085, ue * 0.115] }] }],
        measure: [{ id: 'ua', ask: 'U_a bei f_g (V~, TRMS)', unit: 'V', mode: 'VAC', meterType: 'trms', a: 'R1.a', b: 'R1.b', tol: 0.04, set: { G1: { freq: p.fg } } }, { id: 'c', ask: 'Kapazität (berechnet)', unit: 'nF', value: c, tol: 0.05 }],
        wrong: [named('C zehnmal zu gross', plus(start, [P('C1', 'capacitor', 340, 200, 0, +(c * 10).toPrecision(4))], wires))] };
    } });

  T({ id: 'P04', level: 'profi', ch: 12, diff: 1, tags: ['digital.zaehler', 'digital.flipflop'], params: { dir: ['vor', 'rueck'] },
    build: function (p) {
      var start = lay([P('E1', 'logicin', 160, 200, 0), P('E2', 'logicin', 160, 360, 0, null, { closed: true }), P('GND1', 'ground', 120, 560, 0), P('FF1', 'tff', 320, 260, 0), P('FF2', 'tff', 490, 260, 0), P('L1', 'logicled', 860, 230, 0), P('L2', 'logicled', 860, 340, 0)]);
      var w = function (q) { return [W('E2.out', 'FF1.T'), W('E1.out', 'FF1.C'), W('FF1.Q', 'L1.in'), W('E2.out', 'FF2.T'), W('FF1.' + q, 'FF2.C'), W('FF2.Q', 'L2.in')]; };
      var seq = p.dir === 'vor' ? [1, 2, 3, 0, 1] : [3, 2, 1, 0, 3], ex = function (n) { return [{ sel: 'L1', on: !!(n & 1) }, { sel: 'L2', on: !!(n & 2) }]; };
      return { title: '2-Bit-' + (p.dir === 'vor' ? 'Vorwärts' : 'Rückwärts') + 'zaehler', palette: [], start: start, ref: plus(start, [], w(p.dir === 'vor' ? 'Qn' : 'Q')),
        brief: 'Verdrahte die zwei T-Flipflops zu einem <b>asynchronen 2-Bit-' + (p.dir === 'vor' ? 'Vorwärtszähler' : 'Rückwärtszähler') + '</b>: E1 = Takt, E2 (fest 1) an beide T-Eingänge, L1 = Wertigkeit 1, L2 = Wertigkeit 2. Die Flipflops schalten bei <b>steigender</b> Flanke. Zählfolge ab 0: <b>' + seq.slice(0, 4).join(' → ') + '</b>.',
        tests: [clocks(1, ex(seq[0])), clocks(2, ex(seq[1]))], hidden: [clocks(3, ex(seq[2])), clocks(4, ex(seq[3])), clocks(5, ex(seq[4]))], measure: [],
        wrong: [named('falsche Zählrichtung', plus(start, [], w(p.dir === 'vor' ? 'Q' : 'Qn'))), named('beide Stufen am selben Takt', plus(start, [], [W('E2.out', 'FF1.T'), W('E1.out', 'FF1.C'), W('FF1.Q', 'L1.in'), W('E2.out', 'FF2.T'), W('E1.out', 'FF2.C'), W('FF2.Q', 'L2.in')]))] };
    } });

  T({ id: 'P05', level: 'profi', ch: 12, diff: 2, tags: ['digital.schieberegister', 'digital.flipflop'], params: { muster: [[1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 1, 0], [1, 0, 0, 1]] },
    build: function (p) {
      var start = lay([P('E1', 'logicin', 160, 200, 0), P('E2', 'logicin', 160, 360, 0), P('GND1', 'ground', 120, 560, 0), P('L1', 'logicled', 860, 200, 0), P('L2', 'logicled', 860, 300, 0), P('L3', 'logicled', 860, 400, 0)]);
      var ffs = [P('FF1', 'dff', 320, 300, 0), P('FF2', 'dff', 480, 300, 0), P('FF3', 'dff', 640, 300, 0)];
      var wires = [W('E2.out', 'FF1.D'), W('FF1.Q', 'FF2.D'), W('FF2.Q', 'FF3.D'), W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('E1.out', 'FF3.C'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in'), W('FF3.Q', 'L3.in')];
      var run = function (n) { // n Bits einschieben, danach Stand pruefen
        var s = [], reg = [0, 0, 0];
        for (var i = 0; i < n; i++) { s.push({ set: { E2: on(p.muster[i]), E1: on(0) } }); s.push({ set: { E1: on(1) } }); reg = [p.muster[i], reg[0], reg[1]]; }
        s.push({ name: 'nach ' + n + ' Takten', set: { E1: on(0) }, expect: [{ sel: 'L1', on: !!reg[0] }, { sel: 'L2', on: !!reg[1] }, { sel: 'L3', on: !!reg[2] }] });
        return { name: n + ' Bit eingeschoben', steps: s };
      };
      return { title: '3-Bit-Schieberegister', palette: ['dff'], need: { dff: 3 }, limit: { dff: 3 }, start: start, ref: plus(start, ffs, wires),
        brief: 'Baue aus <b>drei D-Flipflops</b> ein Schieberegister: E1 = gemeinsamer Takt, E2 = Dateneingang. Mit jeder steigenden Flanke wandert das Bit eine Stufe weiter: L1 = erste Stufe, L2 = zweite, L3 = dritte.',
        tests: [run(1), run(2)], hidden: [run(3), run(4)], measure: [],
        wrong: [named('Stufen nicht verkettet', plus(start, ffs, [W('E2.out', 'FF1.D'), W('E2.out', 'FF2.D'), W('E2.out', 'FF3.D'), W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('E1.out', 'FF3.C'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in'), W('FF3.Q', 'L3.in')]))] };
    } });

  T({ id: 'P06', level: 'profi', ch: 13, diff: 1, tags: ['bauteil.zdiode', 'elektro.stabilisierung'], params: { vz: [5.1, 5.6, 6.2], RL: [470, 1000] },
    build: function (p) {
      var start = lay([P('B1', 'battery', 160, 300, 0, 10), P('Z1', 'zener', 480, 300, 270, null, { vz: p.vz }), P('R2', 'resistor', 620, 300, 90, p.RL)], [W('Z1.a', 'B1.n'), W('R2.a', 'Z1.k'), W('R2.b', 'Z1.a')]);
      var wires = [W('B1.p', 'R1.a'), W('R1.b', 'Z1.k')], rng = [p.vz - 0.12, p.vz + 0.4];
      var lo = Math.pow(12 - p.vz, 2) / 0.24, hi = (9 - p.vz) / (p.vz / p.RL + 0.003), rv = Math.round((lo + hi) / 2); // zwischen Verlustleistung (12 V) und Mindeststrom (9 V)
      return { title: 'Stabilisierung mit Z-Diode ' + de(p.vz, 1) + ' V', palette: ['resistor'], need: { resistor: 2 }, limit: { resistor: 2 }, start: start,
        brief: 'Die Last R2 (' + ohm(p.RL) + ') soll aus einer Speisung von <b>9 V bis 12 V</b> stabil rund <b>' + de(p.vz, 1) + ' V</b> bekommen (' + de(rng[0], 2) + ' … ' + de(rng[1], 2) + ' V). Wähle den <b>Vorwiderstand</b> – nichts darf überlastet werden. Miss die Lastspannung bei 10 V.',
        ref: plus(start, [P('R1', 'resistor', 320, 200, 0, rv)], wires),
        tests: [{ name: '9 V', set: { B1: { value: 9 } }, expect: [{ sel: 'R2', v: rng }, { noFault: true }] }, { name: '12 V', set: { B1: { value: 12 } }, expect: [{ sel: 'R2', v: rng }, { noFault: true }] }],
        hidden: [{ name: '10,5 V', set: { B1: { value: 10.5 } }, expect: [{ sel: 'R2', v: rng }, { noFault: true }] }],
        measure: [{ id: 'u', ask: 'Lastspannung bei 10 V', unit: 'V', truth: { sel: 'R2', q: 'v' }, tol: 0.03 }],
        wrong: [named('R_V zu gross', plus(start, [P('R1', 'resistor', 320, 200, 0, 1000)], wires)), named('R_V zu klein (Überlast)', plus(start, [P('R1', 'resistor', 320, 200, 0, 22)], wires))] };
    } });

  var P07 = { lampe: { type: 'lamp', id: 'H1', name: 'die Lampe H1', U: 9, i: [0.13, 0.16] }, motor: { type: 'motor', id: 'M1', name: 'den Motor M1', U: 6, i: [0.26, 0.31] } };
  T({ id: 'P07', level: 'profi', ch: 13, diff: 2, tags: ['bauteil.transistor', 'elektro.schalten'], params: { last: ['lampe', 'motor'] },
    build: function (p) {
      var v = P07[p.last], start = lay([P('E1', 'logicin', 160, 380, 0), P('GND1', 'ground', 480, 540, 0), P('B1', 'battery', 700, 300, 0, v.U), P(v.id, v.type, 580, 240, 90)], [W('B1.p', v.id + '.a'), W('B1.n', 'GND1.g')]);
      var parts = function (rb) { return [P('Q1', 'npn', 480, 380, 0), P('R1', 'resistor', 320, 380, 0, rb)]; }, wires = [W('Q1.e', 'GND1.g'), W(v.id + '.b', 'Q1.c'), W('E1.out', 'R1.a'), W('R1.b', 'Q1.b')];
      return { title: 'Transistor schaltet ' + (p.last === 'lampe' ? 'die Lampe' : 'den Motor'), palette: ['npn', 'resistor'], need: { npn: 1, resistor: 1 }, limit: { npn: 1, resistor: 1 }, start: start,
        brief: 'Der Logikausgang E1 (5 V) soll ' + v.name + ' an ' + v.U + ' V schalten. Setze einen <b>NPN-Transistor</b> als Schalter ein und dimensioniere den <b>Basiswiderstand</b>: Bei E1 = 1 muss der Transistor in <b>Sättigung</b> sein, der Basisstrom soll aber höchstens 10 mA betragen. Miss U_CE im eingeschalteten Zustand.',
        ref: plus(start, parts(1000), wires),
        tests: [{ name: 'Schalten', steps: [{ name: 'E1 = 1', set: { E1: on(1) }, expect: [{ sel: 'Q1', state: 'sat' }, { sel: v.id, i: v.i }, { noFault: true }] }, { name: 'E1 = 0', set: { E1: on(0) }, expect: [{ sel: v.id, i: [0, 0.00001] }] }] }],
        hidden: [{ name: 'Basisstrom', set: { E1: on(1) }, expect: [{ sel: 'R1', i: [0.0005, 0.01] }] }],
        measure: [{ id: 'uce', ask: 'U_CE bei E1 = 1', unit: 'V', mode: 'V', a: 'Q1.c', b: 'Q1.e', tol: 0.1, abs: 0.03, set: { E1: { closed: true } } }],
        wrong: [named('Basiswiderstand viel zu gross', plus(start, parts(100000), wires)), named('Basis ohne Widerstand-Reserve (33 Ω)', plus(start, parts(33), wires))] };
    } });

  var P08 = {
    aus: { txt: 'AUS hat Vorrang', f: 'Q = (EIN ∨ Q) ∧ ¬AUS', g: function () { return { parts: [P('U1', 'or', 360, 220, 0), P('U2', 'not', 360, 400, 0), P('U3', 'and', 540, 260, 0)], wires: [W('E1.out', 'U1.in1'), W('U3.out', 'U1.in2'), W('E2.out', 'U2.in'), W('U1.out', 'U3.in1'), W('U2.out', 'U3.in2'), W('U3.out', 'L1.in')] }; }, both: false },
    ein: { txt: 'EIN hat Vorrang', f: 'Q = EIN ∨ (Q ∧ ¬AUS)', g: function () { return { parts: [P('U1', 'not', 360, 400, 0), P('U2', 'and', 480, 320, 0), P('U3', 'or', 620, 240, 0)], wires: [W('E2.out', 'U1.in'), W('U3.out', 'U2.in1'), W('U1.out', 'U2.in2'), W('E1.out', 'U3.in1'), W('U2.out', 'U3.in2'), W('U3.out', 'L1.in')] }; }, both: true }
  };
  T({ id: 'P08', level: 'profi', ch: 15, diff: 3, tags: ['steuerung.selbsthaltung', 'digital.speicher'], params: { vorrang: ['aus', 'ein'] },
    build: function (p) {
      var v = P08[p.vorrang], o = P08[p.vorrang === 'aus' ? 'ein' : 'aus'], start = lay([P('E1', 'logicin', 160, 200, 0), P('E2', 'logicin', 160, 400, 0), P('GND1', 'ground', 120, 560, 0), P('L1', 'logicled', 860, 240, 0)]);
      var g = v.g(), w = o.g(), L = function (x) { return [{ sel: 'L1', on: !!x }]; };
      return { title: 'Selbsthaltung – ' + v.txt, palette: ['and', 'or', 'not'], limit: { gates: 3 }, start: start, ref: plus(start, g.parts, g.wires),
        brief: 'Baue eine <b>Selbsthaltung</b> aus Gattern: E1 = Taster EIN, E2 = Taster AUS, L1 = Schütz Q. Ein kurzer Impuls auf EIN schaltet ein, Q hält sich selbst; AUS schaltet ab. Werden beide gleichzeitig gedrückt, gilt: <b>' + v.txt + '</b>.<p class="limit">Erlaubt: höchstens <b>3</b> Gatter.</p>',
        tests: [{ name: 'Ein und halten', steps: [{ name: 'Ruhe', set: { E1: on(0), E2: on(0) }, expect: L(0) }, { name: 'EIN gedrückt', set: { E1: on(1) }, expect: L(1) }, { name: 'EIN losgelassen', set: { E1: on(0) }, expect: L(1).concat([{ noFault: true }]) }] },
          { name: 'Aus', steps: [{ set: { E1: on(1), E2: on(0) } }, { set: { E1: on(0) } }, { name: 'AUS gedrückt', set: { E2: on(1) }, expect: L(0) }, { name: 'AUS losgelassen', set: { E2: on(0) }, expect: L(0) }] }],
        hidden: [{ name: 'Beide gedrückt', steps: [{ set: { E1: on(0), E2: on(0) } }, { name: 'EIN und AUS', set: { E1: on(1), E2: on(1) }, expect: L(v.both) }, { name: 'nur AUS bleibt', set: { E1: on(0) }, expect: L(0) }] },
          { name: 'Beide aus dem Betrieb', steps: [{ set: { E1: on(1), E2: on(0) } }, { set: { E1: on(0) } }, { name: 'EIN und AUS', set: { E1: on(1), E2: on(1) }, expect: L(v.both) }] }],
        measure: [], wrong: [named('falscher Vorrang', plus(start, w.parts, w.wires)), named('ohne Rückführung', plus(start, [P('U2', 'not', 360, 400, 0), P('U3', 'and', 540, 260, 0)], [W('E1.out', 'U3.in1'), W('E2.out', 'U2.in'), W('U2.out', 'U3.in2'), W('U3.out', 'L1.in')]))] };
    } });

  T({ id: 'P09', level: 'profi', ch: 15, diff: 2, tags: ['antrieb.treiber', 'sicherheit.nothalt', 'digital.und'], params: { U: [6, 9], nothalt: ['E2', 'E3'] },
    build: function (p) {
      var frei = p.nothalt === 'E2' ? 'E3' : 'E2';
      var start = lay([P('E1', 'logicin', 140, 180, 0), P('E2', 'logicin', 140, 280, 0), P('E3', 'logicin', 140, 380, 0), P('GND1', 'ground', 620, 560, 0), P('B1', 'battery', 840, 300, 0, p.U), P('M1', 'motor', 720, 240, 90)], [W('B1.p', 'M1.a'), W('B1.n', 'GND1.g')]);
      var parts = [P('U1', 'not', 280, 480, 0), P('U2', 'and', 320, 220, 0), P('U3', 'and', 440, 300, 0), P('R1', 'resistor', 520, 400, 0, 680), P('Q1', 'npn', 620, 400, 0)];
      var wires = [W(p.nothalt + '.out', 'U1.in'), W('E1.out', 'U2.in1'), W(frei + '.out', 'U2.in2'), W('U2.out', 'U3.in1'), W('U1.out', 'U3.in2'), W('U3.out', 'R1.a'), W('R1.b', 'Q1.b'), W('Q1.e', 'GND1.g'), W('M1.b', 'Q1.c')];
      var im = p.U / 20, S = function (a, b, c) { var s = { E1: on(a) }; s[frei] = on(b); s[p.nothalt] = on(c); return s; };
      var run = [{ sel: 'M1', i: [im * 0.9, im * 1.02] }], stop = [{ sel: 'M1', i: [0, 0.0001] }];
      return { title: 'Antrieb mit Freigabe und Not-Halt', palette: ['and', 'or', 'not', 'npn', 'resistor'], need: { npn: 1, resistor: 1 }, limit: { gates: 3, npn: 1 }, start: start, ref: plus(start, parts, wires),
        brief: 'Der Motor M1 (' + p.U + ' V) darf nur laufen, wenn <b>Start E1 = 1</b> und <b>Freigabe ' + frei + ' = 1</b> sind und der <b>Not-Halt ' + p.nothalt + ' nicht</b> ausgelöst ist (' + p.nothalt + ' = 1 heisst: Not-Halt gedrückt). Die Logik steuert einen NPN-Transistor mit Basiswiderstand, der den Motor gegen Masse schaltet.<p class="limit">Erlaubt: höchstens <b>3</b> Gatter, ein Transistor.</p>',
        tests: [{ name: 'Betrieb', steps: [{ name: 'Start + Freigabe', set: S(1, 1, 0), expect: run.concat([{ sel: 'Q1', state: 'sat' }, { noFault: true }]) }, { name: 'Not-Halt', set: S(1, 1, 1), expect: stop }] },
          { name: 'Ohne Freigabe', set: S(1, 0, 0), expect: stop }],
        hidden: [{ name: 'Ohne Start', set: S(0, 1, 0), expect: stop }, { name: 'Alles aus', set: S(0, 0, 0), expect: stop }, { name: 'Nur Not-Halt', set: S(0, 0, 1), expect: stop }, { name: 'Start + Not-Halt', set: S(1, 0, 1), expect: stop }],
        measure: [{ id: 'im', ask: 'Motorstrom im Betrieb', unit: 'mA', truth: { sel: 'M1', q: 'i' }, tol: 0.04, set: S(1, 1, 0) }],
        wrong: [named('Not-Halt nicht invertiert', plus(start, parts.filter(function (x) { return x.id !== 'U1'; }), wires.filter(function (w) { return w.to !== 'U1.in' && w.from !== 'U1.out'; }).concat([W(p.nothalt + '.out', 'U3.in2')]))),
          named('Freigabe vergessen', plus(start, parts.filter(function (x) { return x.id !== 'U2'; }), wires.filter(function (w) { return w.to.indexOf('U2.') && w.from !== 'U2.out'; }).concat([W('E1.out', 'U3.in1')])))] };
    } });

  T({ id: 'P10', level: 'profi', ch: 12, diff: 3, tags: ['digital.synchron', 'digital.zaehler'], params: { dir: ['vor', 'rueck'] },
    build: function (p) {
      var start = lay([P('E1', 'logicin', 160, 200, 0), P('GND1', 'ground', 120, 560, 0), P('L1', 'logicled', 860, 230, 0), P('L2', 'logicled', 860, 340, 0)]);
      var gate = p.dir === 'vor' ? 'xor' : 'xnor';
      var parts = function (g) { return [P('FF1', 'dff', 340, 220, 0), P('FF2', 'dff', 620, 360, 0), P('U1', g, 470, 380, 0)]; };
      var wires = [W('E1.out', 'FF1.C'), W('E1.out', 'FF2.C'), W('FF1.Qn', 'FF1.D'), W('FF1.Q', 'U1.in1'), W('FF2.Q', 'U1.in2'), W('U1.out', 'FF2.D'), W('FF1.Q', 'L1.in'), W('FF2.Q', 'L2.in')];
      var seq = p.dir === 'vor' ? [1, 2, 3, 0, 1] : [3, 2, 1, 0, 3], ex = function (n) { return [{ sel: 'L1', on: !!(n & 1) }, { sel: 'L2', on: !!(n & 2) }]; };
      return { title: 'Synchroner 2-Bit-Zähler', palette: ['dff', 'xor', 'xnor', 'not', 'and', 'or'], need: { dff: 2 }, limit: { dff: 2, gates: 2 }, start: start, ref: plus(start, parts(gate), wires),
        brief: 'Entwirf einen <b>synchronen 2-Bit-' + (p.dir === 'vor' ? 'Vorwärtszähler' : 'Rückwärtszähler') + '</b> aus zwei D-Flipflops: <b>beide</b> Flipflops hängen am Takt E1, die D-Eingänge bekommen ihre Werte aus einer Logik. L1 = Wertigkeit 1, L2 = Wertigkeit 2. Zählfolge ab 0: <b>' + seq.slice(0, 4).join(' → ') + '</b>.<p class="limit">Erlaubt: zwei D-Flipflops, höchstens <b>2</b> Gatter.</p>',
        tests: [clocks(1, ex(seq[0])), clocks(2, ex(seq[1]))], hidden: [clocks(3, ex(seq[2])), clocks(4, ex(seq[3])), clocks(5, ex(seq[4]))], measure: [],
        wrong: [named('falsche Zählrichtung', plus(start, parts(p.dir === 'vor' ? 'xnor' : 'xor'), wires))] };
    } });
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== Theoriefragen (aus den Lektionen) ==== */
[{"id":"Q1A_1","level":"grund","ch":1,"q":"Was braucht ein Stromkreis mindestens?","options":["Eine Quelle und einen Schalter","Eine Quelle, einen Verbraucher und einen geschlossenen Leiterweg","Einen Verbraucher und ein Messgerät","Zwei Leitungen und einen Schalter"],"answer":1},{"id":"Q1A_2","level":"grund","ch":1,"q":"Zwei Schalter liegen in Reihe mit einer Lampe. Wann leuchtet die Lampe?","options":["Wenn mindestens ein Schalter zu ist","Nur wenn beide Schalter zu sind","Immer","Nur wenn beide offen sind"],"answer":1},{"id":"Q1A_3","level":"grund","ch":1,"q":"Batterie 9 V, Schalter offen, Lampe. Welche Spannung misst du über dem offenen Schalter?","options":["0 V","4,5 V","9 V","18 V"],"answer":2},{"id":"Q1A_4","level":"grund","ch":1,"q":"Wie schliesst du ein Amperemeter an?","options":["Parallel zum Verbraucher","In Reihe: Kreis auftrennen, Messgerät in die Lücke","Direkt an die Batteriepole","Gar nicht – Strom kann man nur rechnen"],"answer":1},{"id":"Q1A_5","level":"grund","ch":1,"q":"Die Lampe (60 Ω) hängt über den geschlossenen Schalter an 9 V. Welcher Strom fliesst?","options":["15 mA","150 mA","540 mA","1,5 A"],"answer":1},{"id":"Q1B_1","level":"grund","ch":1,"q":"An 10 V liegt ein Widerstand von 470 Ω. Welcher Strom fliesst?","options":["2,13 mA","21,3 mA","47 mA","4,7 A"],"answer":1},{"id":"Q1B_2","level":"grund","ch":1,"q":"Bei 10 V sollen genau 10 mA fliessen. Wie gross muss R sein?","options":["100 Ω","1 kΩ","10 kΩ","0,1 Ω"],"answer":1},{"id":"Q1B_3","level":"grund","ch":1,"q":"Rote LED (U_F = 1,8 V) an 9 V, gewünscht 20 mA. Welcher Vorwiderstand?","options":["90 Ω","360 Ω","450 Ω","1,8 kΩ"],"answer":1},{"id":"Q1B_4","level":"grund","ch":1,"q":"Was passiert, wenn du eine LED ohne Vorwiderstand direkt an 9 V anschliesst?","options":["Sie leuchtet besonders schön","Nichts, sie sperrt","Der Strom wird sehr gross – sie brennt durch","Die Batterie lädt sich auf"],"answer":2},{"id":"Q1B_5","level":"grund","ch":1,"q":"Welche Leistung setzt ein 1-kΩ-Widerstand an 10 V um?","options":["0,01 W","0,1 W","1 W","10 W"],"answer":1},{"id":"Q2A_1","level":"grund","ch":2,"q":"Wie verhält sich der Strom in einer Reihenschaltung?","options":["Er ist an jeder Stelle gleich gross","Er wird nach jedem Widerstand kleiner","Er teilt sich auf die Widerstände auf","Er ist am grössten Widerstand am grössten"],"answer":0},{"id":"Q2A_2","level":"grund","ch":2,"q":"1 kΩ, 100 Ω, 220 Ω und 470 Ω liegen in Reihe. Wie gross ist der Gesamtwiderstand?","options":["79 Ω","790 Ω","1,79 kΩ","17,9 kΩ"],"answer":2},{"id":"Q2A_3","level":"grund","ch":2,"q":"Diese Reihe liegt an 10 V. Welche Spannung liegt am 1-kΩ-Widerstand?","options":["1 V","2,5 V","5,59 V","10 V"],"answer":2},{"id":"Q2A_4","level":"grund","ch":2,"q":"Was sagt die Maschenregel?","options":["Die Summe der Teilströme ist null","Die Summe der Teilspannungen ergibt die Quellenspannung","Alle Spannungen sind gleich","Die Spannung ist am Anfang der Reihe am grössten"],"answer":1},{"id":"Q2A_5","level":"grund","ch":2,"q":"In einer Lichterkette (Reihe) brennt eine Lampe durch. Was passiert?","options":["Nur diese Lampe ist dunkel","Alle Lampen gehen aus","Die anderen leuchten heller","Nichts"],"answer":1},{"id":"Q2B_1","level":"grund","ch":2,"q":"Zwei Widerstände von je 1 kΩ sind parallel geschaltet. Gesamtwiderstand?","options":["250 Ω","500 Ω","1 kΩ","2 kΩ"],"answer":1},{"id":"Q2B_2","level":"grund","ch":2,"q":"In einen Knoten fliessen 30 mA hinein, ein Zweig führt 10 mA ab. Wie viel fliesst im zweiten Abzweig?","options":["10 mA","20 mA","30 mA","40 mA"],"answer":1},{"id":"Q2B_3","level":"grund","ch":2,"q":"15 V, R1 = 2 kΩ oben, R2 = 1 kΩ unten. Welche Spannung liegt an R2?","options":["3 V","5 V","7,5 V","10 V"],"answer":1},{"id":"Q2B_4","level":"grund","ch":2,"q":"Was passiert mit U₂, wenn eine Last parallel zu R₂ angeschlossen wird?","options":["U₂ steigt","U₂ sinkt","U₂ bleibt gleich","U₂ wird negativ"],"answer":1},{"id":"Q2B_5","level":"grund","ch":2,"q":"Leerlauf 10 V, unter Last 9,1 V bei 9 mA. Wie gross ist der Innenwiderstand?","options":["1 Ω","10 Ω","100 Ω","1 kΩ"],"answer":2},{"id":"Q3A_1","level":"grund","ch":3,"q":"Eine Wechselspannung hat die Periodendauer T = 20 ms. Wie gross ist die Frequenz?","options":["20 Hz","50 Hz","200 Hz","500 Hz"],"answer":1},{"id":"Q3A_2","level":"grund","ch":3,"q":"Welchen linearen Mittelwert hat eine reine Sinusspannung mit Û = 10 V?","options":["0 V","6,37 V","7,07 V","10 V"],"answer":0},{"id":"Q3A_3","level":"grund","ch":3,"q":"Ein Sinus hat Û = 10 V. Wie gross ist der Spitze-Spitze-Wert U_ss?","options":["5 V","10 V","14,1 V","20 V"],"answer":3},{"id":"Q3A_4","level":"grund","ch":3,"q":"Was ist eine Mischgrösse?","options":["Eine Wechselgrösse mit Gleichanteil ≠ 0","Eine Spannung aus zwei Batterien","Ein Rechteck mit 50 % Tastgrad","Eine Spannung ohne Frequenz"],"answer":0},{"id":"Q3A_5","level":"grund","ch":3,"q":"Wie gross ist die Kreisfrequenz ω bei 50 Hz?","options":["50 1/s","100 1/s","314 1/s","3140 1/s"],"answer":2},{"id":"Q3B_1","level":"grund","ch":3,"q":"Ein Sinus hat Û = 10 V. Wie gross ist der Effektivwert?","options":["5 V","6,37 V","7,07 V","10 V"],"answer":2},{"id":"Q3B_2","level":"grund","ch":3,"q":"Wie gross ist der Gleichrichtwert dieses Sinus?","options":["3,18 V","6,37 V","7,07 V","10 V"],"answer":1},{"id":"Q3B_3","level":"grund","ch":3,"q":"Ein AVG-Multimeter misst ein Rechteck ±10 V. Was zeigt es an?","options":["7,07 V","9,0 V","10,0 V","11,1 V"],"answer":3},{"id":"Q3B_4","level":"grund","ch":3,"q":"Welches Messgerät zeigt bei einer beliebigen Kurvenform den richtigen Effektivwert?","options":["Drehspulgerät","AVG-Multimeter","TRMS-Multimeter","Jedes Multimeter auf V⎓"],"answer":2},{"id":"Q3B_5","level":"grund","ch":3,"q":"Welche Leistung setzt eine Sinusspannung Û = 10 V an 1 kΩ um?","options":["10 mW","50 mW","70,7 mW","100 mW"],"answer":1},{"id":"Q4A_1","level":"grund","ch":4,"q":"Ein Spannungsprüfer zeigt „Spannung vorhanden“ ohne Zahlenwert. Das ist …","options":["Messen","Prüfen","Kalibrieren","Eichen"],"answer":1},{"id":"Q4A_2","level":"grund","ch":4,"q":"Die amtliche Prüfung, ob ein Messgerät in der Fehlergrenze liegt, heisst …","options":["Justieren","Kalibrieren","Eichen","Prüfen"],"answer":2},{"id":"Q4A_3","level":"grund","ch":4,"q":"Wie misst eine Strommesszange den Strom?","options":["Sie trennt den Kreis auf","Über das Magnetfeld um den Leiter","Über einen Nebenwiderstand im Gerät","Gar nicht, nur Spannung"],"answer":1},{"id":"Q4A_4","level":"grund","ch":4,"q":"In welcher Messkategorie misst du an einer Steckdose der Gebäudeinstallation?","options":["CAT I","CAT II","CAT III","Keine"],"answer":2},{"id":"Q4A_5","level":"grund","ch":4,"q":"Ein Punkt hat das Potential 10 V, ein anderer 6 V (gegen Masse). Welche Spannung liegt dazwischen?","options":["4 V","6 V","10 V","16 V"],"answer":0},{"id":"Q4B_1","level":"grund","ch":4,"q":"Analoges Gerät, Bereich 20 V, Genauigkeit 0,5 %. Wie gross ist der mögliche Fehler?","options":["±0,01 V","±0,075 V","±0,1 V","±1 V"],"answer":2},{"id":"Q4B_2","level":"grund","ch":4,"q":"Digital, Anzeige 15,0 V, ±(0,5 % + 1 Digit). Maximaler Fehler?","options":["±0,075 V","±0,1 V","±0,175 V","±0,5 V"],"answer":2},{"id":"Q4B_3","level":"grund","ch":4,"q":"10 V an zwei Widerständen von je 10 MΩ. Was zeigt das Multimeter (10 MΩ) an R2?","options":["5,00 V","4,50 V","3,33 V","0 V"],"answer":2},{"id":"Q4B_4","level":"grund","ch":4,"q":"Bei der spannungsrichtigen Messung misst das Amperemeter …","options":["nur den Verbraucherstrom","den Verbraucherstrom plus den Voltmeterstrom","die Spannung am Voltmeter","gar nichts"],"answer":1},{"id":"Q4B_5","level":"grund","ch":4,"q":"Wann ist die spannungsrichtige Messung ungeeignet?","options":["Bei sehr kleinen Widerständen","Bei sehr grossen Widerständen","Bei Wechselspannung","Nie"],"answer":1},{"id":"Q5A_1","level":"grund","ch":5,"q":"Welche Dezimalzahl ist 1010₂?","options":["5","10","12","20"],"answer":1},{"id":"Q5A_2","level":"grund","ch":5,"q":"Wie lautet 49₁₀ im Dualsystem?","options":["100011","110001","101001","111000"],"answer":1},{"id":"Q5A_3","level":"grund","ch":5,"q":"Welche grösste Zahl kann eine 4-Bit-Dualzahl darstellen?","options":["4","8","15","16"],"answer":2},{"id":"Q5A_4","level":"grund","ch":5,"q":"Welchen Stellenwert hat das MSB einer 8-Bit-Zahl?","options":["8","64","128","256"],"answer":2},{"id":"Q5A_5","level":"grund","ch":5,"q":"Welche Spannung entspricht bei 5-V-Logik einer 1?","options":["0 V","ca. 1 V","ca. 2,5 V","ca. 5 V"],"answer":3},{"id":"Q5B_1","level":"grund","ch":5,"q":"Welche Dezimalzahl ist EF₁₆?","options":["215","239","254","255"],"answer":1},{"id":"Q5B_2","level":"grund","ch":5,"q":"Wie lautet 1111₂ hexadezimal?","options":["E","F","10","15"],"answer":1},{"id":"Q5B_3","level":"grund","ch":5,"q":"Wie viele Bits entsprechen einer Hex-Ziffer?","options":["2","3","4","8"],"answer":2},{"id":"Q5B_4","level":"grund","ch":5,"q":"Wie wird die Dezimalzahl 59 im BCD-Code dargestellt?","options":["0011 1011","0101 1001","0111 0011","1001 0101"],"answer":1},{"id":"Q5B_5","level":"grund","ch":5,"q":"Was zeigt ein BCD-7-Segment-Decoder bei der Eingabe 1100₂?","options":["12","C","Nichts – ungültiger BCD-Code","0"],"answer":2},{"id":"Q6A_1","level":"grund","ch":6,"q":"Wann liefert ein UND-Gatter mit zwei Eingängen eine 1?","options":["Wenn ein Eingang 1 ist","Wenn beide Eingänge 1 sind","Wenn beide 0 sind","Wenn die Eingänge verschieden sind"],"answer":1},{"id":"Q6A_2","level":"grund","ch":6,"q":"Welches Symbol steht im DIN-Kasten des ODER-Gatters?","options":["&","≥1","=1","1"],"answer":1},{"id":"Q6A_3","level":"grund","ch":6,"q":"Was ergibt e ∧ ē?","options":["e","ē","0","1"],"answer":2},{"id":"Q6A_4","level":"grund","ch":6,"q":"Was ergibt 0 ∨ e?","options":["0","1","e","ē"],"answer":2},{"id":"Q6A_5","level":"grund","ch":6,"q":"Warum darf man zwei Gatter-Ausgänge nicht direkt verbinden?","options":["Weil dann nichts leuchtet","Weil bei verschiedenen Pegeln ein grosser Ausgleichsstrom fliesst","Weil das Signal zu schwach wird","Das ist erlaubt"],"answer":1},{"id":"Q6B_1","level":"grund","ch":6,"q":"Wann ist der Ausgang eines NAND-Gatters 0?","options":["Wenn ein Eingang 0 ist","Nur wenn beide Eingänge 1 sind","Wenn beide 0 sind","Nie"],"answer":1},{"id":"Q6B_2","level":"grund","ch":6,"q":"Wann ist der Ausgang eines NOR-Gatters 1?","options":["Nur wenn beide Eingänge 0 sind","Wenn ein Eingang 1 ist","Wenn beide 1 sind","Immer"],"answer":0},{"id":"Q6B_3","level":"grund","ch":6,"q":"Welches Gatter liefert 1, wenn die beiden Eingänge verschieden sind?","options":["UND","ODER","XOR","XNOR"],"answer":2},{"id":"Q6B_4","level":"grund","ch":6,"q":"Was ergibt 1 ⊕ e (XOR mit 1)?","options":["0","1","e","ē"],"answer":3},{"id":"Q6B_5","level":"grund","ch":6,"q":"Warum heissen NAND und NOR Universalgatter?","options":["Sie sind am billigsten","Aus ihnen allein lässt sich jede Logikfunktion bauen","Sie haben mehr Eingänge","Sie funktionieren mit jeder Spannung"],"answer":1},{"id":"Q7A_1","level":"grund","ch":7,"q":"Was ist nach der Bindungsregel mit e1 ∨ e2·e3 gemeint?","options":["(e1 ∨ e2)·e3","e1 ∨ (e2·e3)","e1·e2 ∨ e3","Das ist nicht eindeutig"],"answer":1},{"id":"Q7A_2","level":"grund","ch":7,"q":"Vereinfache e1·e2 ∨ e1·e3.","options":["e1 ∨ e2·e3","e1·(e2 ∨ e3)","e2·e3","e1"],"answer":1},{"id":"Q7A_3","level":"grund","ch":7,"q":"Was ergibt e1 ∨ e1·e2 (Absorption)?","options":["e1","e2","e1·e2","1"],"answer":0},{"id":"Q7A_4","level":"grund","ch":7,"q":"Vereinfache e1·e2 ∨ e1·ē2.","options":["e2","e1","1","e1·e2"],"answer":1},{"id":"Q7A_5","level":"grund","ch":7,"q":"Wie viele UND-Gatter mit zwei Eingängen brauchst du für e1·e2·e3·e4?","options":["1","2","3","4"],"answer":2},{"id":"Q7B_1","level":"grund","ch":7,"q":"Was ist ¬(e1 ∨ e2) nach De Morgan?","options":["ē1 ∨ ē2","ē1 · ē2","e1 · e2","¬e1 ∨ e2"],"answer":1},{"id":"Q7B_2","level":"grund","ch":7,"q":"Wie wird ein NAND zum Inverter?","options":["Einen Eingang auf 0 legen","Beide Eingänge verbinden","Den Ausgang auf 1 legen","Geht nicht"],"answer":1},{"id":"Q7B_3","level":"grund","ch":7,"q":"Wie viele NAND braucht ein ODER?","options":["1","2","3","4"],"answer":2},{"id":"Q7B_4","level":"grund","ch":7,"q":"Wie viele NAND braucht ein UND?","options":["1","2","3","4"],"answer":1},{"id":"Q7B_5","level":"grund","ch":7,"q":"Warum baut man Schaltungen nur aus NAND?","options":["NAND ist schneller als alle anderen","Ein einziger Chiptyp genügt für jede Funktion","NAND braucht keine Versorgung","Weil UND verboten ist"],"answer":1},{"id":"Q8A_1","level":"grund","ch":8,"q":"Welche Zeilen der Wahrheitstabelle verwendet die DNF?","options":["Alle","Die mit A = 1","Die mit A = 0","Nur die erste"],"answer":1},{"id":"Q8A_2","level":"grund","ch":8,"q":"Wie lautet der Minterm für die Zeile E2 = 1, E1 = 0?","options":["e2 · e1","e2 · ē1","ē2 · e1","e2 ∨ ē1"],"answer":1},{"id":"Q8A_3","level":"grund","ch":8,"q":"Wie viele Zeilen hat die Wahrheitstabelle mit 3 Eingängen?","options":["3","6","8","9"],"answer":2},{"id":"Q8A_4","level":"grund","ch":8,"q":"Welche Zeilennummer hat E3 = 1, E2 = 0, E1 = 1?","options":["3","5","6","101"],"answer":1},{"id":"Q8A_5","level":"grund","ch":8,"q":"Die DNF liefert A = ē2·e1 ∨ e2·ē1. Welches Gatter ist das?","options":["UND","ODER","XOR","NOR"],"answer":2},{"id":"Q8B_1","level":"grund","ch":8,"q":"Wie unterscheiden sich benachbarte Felder im KV-Diagramm?","options":["In allen Variablen","In genau einer Variablen","In zwei Variablen","Gar nicht"],"answer":1},{"id":"Q8B_2","level":"grund","ch":8,"q":"Wie viele Felder darf ein Päckchen haben?","options":["Beliebig viele","1, 2, 4, 8 …","3, 6, 9 …","Nur 2"],"answer":1},{"id":"Q8B_3","level":"grund","ch":8,"q":"Wie viele Variablen fallen bei einem Päckchen aus 4 Feldern weg?","options":["1","2","3","4"],"answer":1},{"id":"Q8B_4","level":"grund","ch":8,"q":"Was bedeutet ein X im KV-Diagramm?","options":["Fehler","Die Kombination kommt nie vor – beliebig nutzbar","Immer 1","Immer 0"],"answer":1},{"id":"Q8B_5","level":"grund","ch":8,"q":"Die Einsen liegen bei Σm3(0, 2, 4, 6). Ergebnis?","options":["A = e1","A = ē1","A = e3","A = ē2"],"answer":1},{"id":"Q9A_1","level":"grund","ch":9,"q":"Was ist das Besondere am Gray-Code?","options":["Er braucht weniger Bits","Benachbarte Zahlen unterscheiden sich in genau einem Bit","Er ist BCD + 3","Er hat ein Paritätsbit"],"answer":1},{"id":"Q9A_2","level":"grund","ch":9,"q":"Wie lautet 5 im 3-Exzess-Code?","options":["0101","1000","0110","1010"],"answer":1},{"id":"Q9A_3","level":"grund","ch":9,"q":"Datenbits 1011, gerade Parität. Welches Paritätsbit?","options":["0","1"],"answer":1},{"id":"Q9A_4","level":"grund","ch":9,"q":"Mit welchem Gatter baut man einen Paritätsbitersteller?","options":["UND","ODER","XOR","NAND"],"answer":2},{"id":"Q9A_5","level":"grund","ch":9,"q":"Zwei Bits kippen bei der Übertragung. Erkennt die Paritätsprüfung den Fehler?","options":["Ja, immer","Nein – die Parität stimmt wieder","Nur beim ersten Bit","Nur bei Gray-Code"],"answer":1},{"id":"Q9B_1","level":"grund","ch":9,"q":"Wie viele Dateneingänge kann ein Multiplexer mit 3 Steuerleitungen auswählen?","options":["3","6","8","9"],"answer":2},{"id":"Q9B_2","level":"grund","ch":9,"q":"Was liefert ein Halbaddierer bei a = 1, b = 1?","options":["S = 1, C = 0","S = 0, C = 1","S = 1, C = 1","S = 0, C = 0"],"answer":1},{"id":"Q9B_3","level":"grund","ch":9,"q":"Welches Gatter liefert die Summe eines Halbaddierers?","options":["UND","ODER","XOR","NOR"],"answer":2},{"id":"Q9B_4","level":"grund","ch":9,"q":"Was unterscheidet den Volladdierer vom Halbaddierer?","options":["Er hat einen Übertragseingang","Er kann subtrahieren","Er hat keinen Übertrag","Er arbeitet mit Gray-Code"],"answer":0},{"id":"Q9B_5","level":"grund","ch":9,"q":"Wie lautet beim Komparator der Ausgang „e1 gleich e2“?","options":["e1·e2","e1 ⊕ e2","e1 ⊙ e2 (XNOR)","e1 ∨ e2"],"answer":2},{"id":"Q10A_1","level":"grund","ch":10,"q":"Welches Segment ist die Mitte der Anzeige?","options":["a","d","f","g"],"answer":3},{"id":"Q10A_2","level":"grund","ch":10,"q":"Gemeinsame Kathode: Wann leuchtet ein Segment?","options":["Bei 0","Bei 1","Immer","Nie"],"answer":1},{"id":"Q10A_3","level":"grund","ch":10,"q":"Welche Segmente leuchten bei der Ziffer 1?","options":["a und b","b und c","e und f","f und g"],"answer":1},{"id":"Q10A_4","level":"grund","ch":10,"q":"Wie viele Decoder braucht eine dreistellige Anzeige?","options":["1","2","3","7"],"answer":2},{"id":"Q10A_5","level":"grund","ch":10,"q":"Was zeigt ein BCD-Decoder bei 1110₂?","options":["14","E","nichts","4"],"answer":2},{"id":"Q10B_1","level":"grund","ch":10,"q":"Was macht man mit Kombinationen, die in der Anlage nie vorkommen?","options":["Man lässt sie weg und prüft sie nicht","Man markiert sie als X und nutzt sie beim Vereinfachen","Man setzt sie immer auf 1","Man setzt sie immer auf 0"],"answer":1},{"id":"Q10B_2","level":"grund","ch":10,"q":"Welche Kombination ist im Thermometer-Code (3 Sensoren, unten = E1) ungültig?","options":["001","011","101","111"],"answer":2},{"id":"Q10B_3","level":"grund","ch":10,"q":"A = 10₂, B = 01₂. Welche Stelle entscheidet den Vergleich?","options":["Die höhere (a1 = 1, b1 = 0)","Die niedrigere","Beide gleich","Keine"],"answer":0},{"id":"Q10B_4","level":"grund","ch":10,"q":"Warum lohnt es sich, gemeinsame Teilschaltungen zu suchen?","options":["Sie sparen Gatter und Fehlerquellen","Sie sind vorgeschrieben","Sie machen die Schaltung langsamer","Sie sind nur für NAND erlaubt"],"answer":0},{"id":"Q10B_5","level":"grund","ch":10,"q":"Wann ist eine Schaltung fertig?","options":["Wenn sie gezeichnet ist","Wenn alle Kombinationen geprüft sind","Wenn eine Kombination stimmt","Wenn sie wenig Gatter hat"],"answer":1},{"id":"Q11A_1","level":"profi","ch":11,"q":"Wie gross ist τ bei R = 10 kΩ und C = 100 µF?","options":["0,1 s","1 s","10 s","100 s"],"answer":1},{"id":"Q11A_2","level":"profi","ch":11,"q":"Auf wie viel Prozent ist ein Kondensator nach 1 τ geladen?","options":["37 %","50 %","63 %","100 %"],"answer":2},{"id":"Q11A_3","level":"profi","ch":11,"q":"Nach wie vielen τ gilt ein Kondensator als voll geladen?","options":["1","2","5","100"],"answer":2},{"id":"Q11A_4","level":"profi","ch":11,"q":"Wann fliesst beim Laden der grösste Strom?","options":["Ganz am Anfang","Nach 1 τ","Am Ende","Immer gleich"],"answer":0},{"id":"Q11A_5","level":"profi","ch":11,"q":"Ein voll geladener Kondensator (10 V) entlädt sich über R. Welche Spannung hat er nach 1 τ?","options":["0 V","3,7 V","5 V","6,3 V"],"answer":1},{"id":"Q11B_1","level":"profi","ch":11,"q":"Nach welcher Zeit schaltet ein Logikeingang hinter einem RC-Glied (τ = 1 s) auf 1?","options":["0,1 s","0,69 s","1 s","5 s"],"answer":1},{"id":"Q11B_2","level":"profi","ch":11,"q":"Wie verkleinert man die Brummspannung eines Gleichrichters?","options":["Kleineren Ladekondensator","Grösseren Ladekondensator","Kleineren Lastwiderstand","Gar nicht"],"answer":1},{"id":"Q11B_3","level":"profi","ch":11,"q":"Grenzfrequenz bei R = 1 kΩ, C = 10 µF?","options":["1,6 Hz","15,9 Hz","159 Hz","1,59 kHz"],"answer":1},{"id":"Q11B_4","level":"profi","ch":11,"q":"Welches Filter lässt tiefe Frequenzen durch?","options":["Hochpass","Tiefpass","Bandsperre","Keines"],"answer":1},{"id":"Q11B_5","level":"profi","ch":11,"q":"Auf wie viel Prozent ist die Ausgangsspannung bei der Grenzfrequenz gesunken?","options":["50 %","63 %","70,7 %","90 %"],"answer":2},{"id":"Q12A_1","level":"profi","ch":12,"q":"RS-Flipflop: Was passiert bei S = 0 und R = 0?","options":["Q = 0","Q = 1","Q behält seinen Zustand","verbotener Zustand"],"answer":2},{"id":"Q12A_2","level":"profi","ch":12,"q":"Welche Kombination ist beim NOR-RS-Flipflop verboten?","options":["S = 0, R = 0","S = 1, R = 0","S = 0, R = 1","S = 1, R = 1"],"answer":3},{"id":"Q12A_3","level":"profi","ch":12,"q":"Wann übernimmt ein flankengesteuertes D-Flipflop den Eingang D?","options":["Solange C = 1","Bei der steigenden Flanke an C","Wenn D sich ändert","Immer"],"answer":1},{"id":"Q12A_4","level":"profi","ch":12,"q":"Was macht ein T-Flipflop mit T = 1 bei jeder Taktflanke?","options":["Nichts","Es kippt","Es setzt","Es setzt zurück"],"answer":1},{"id":"Q12A_5","level":"profi","ch":12,"q":"JK-Flipflop, J = 1, K = 1, Taktflanke. Was passiert?","options":["Q = 1","Q = 0","Q kippt","verboten"],"answer":2},{"id":"Q12B_1","level":"profi","ch":12,"q":"Bis zu welcher Zahl zählt ein 3-Bit-Dualzähler?","options":["3","6","7","8"],"answer":2},{"id":"Q12B_2","level":"profi","ch":12,"q":"Woher bekommt beim asynchronen Aufwärtszähler das zweite Flipflop seinen Takt?","options":["Vom gemeinsamen Takt","Vom Q̄-Ausgang der ersten Stufe","Von J","Gar nicht"],"answer":1},{"id":"Q12B_3","level":"profi","ch":12,"q":"Was ist der Vorteil des synchronen Zählers?","options":["Weniger Flipflops","Alle Stufen schalten gleichzeitig","Er braucht keinen Takt","Er zählt rückwärts"],"answer":1},{"id":"Q12B_4","level":"profi","ch":12,"q":"Wann kippt beim synchronen 2-Bit-Zähler das zweite JK-Flipflop?","options":["Bei jedem Takt","Wenn Q1 = 1","Wenn Q1 = 0","Nie"],"answer":1},{"id":"Q12B_5","level":"profi","ch":12,"q":"Wie viele Zustände durchläuft ein 2-stufiger Johnson-Zähler?","options":["2","3","4","8"],"answer":2},{"id":"Q13A_1","level":"profi","ch":13,"q":"Wie gross ist die Schleusenspannung einer Siliziumdiode?","options":["0,3 V","0,7 V","1,8 V","5,1 V"],"answer":1},{"id":"Q13A_2","level":"profi","ch":13,"q":"Woran erkennt man die Kathode einer Diode?","options":["Am längeren Bein","Am Ring auf dem Gehäuse","An der Farbe","Gar nicht"],"answer":1},{"id":"Q13A_3","level":"profi","ch":13,"q":"In welcher Richtung wird eine Z-Diode zur Stabilisierung betrieben?","options":["Durchlassrichtung","Sperrrichtung","Egal","Wechselnd"],"answer":1},{"id":"Q13A_4","level":"profi","ch":13,"q":"Warum braucht eine Z-Diode einen Vorwiderstand?","options":["Damit sie leuchtet","Damit der Strom begrenzt wird","Damit sie sperrt","Braucht sie nicht"],"answer":1},{"id":"Q13A_5","level":"profi","ch":13,"q":"12 V, R_V = 470 Ω, U_Z = 5,1 V, keine Last. Wie gross ist I_Z (ungefähr)?","options":["5 mA","15 mA","25 mA","50 mA"],"answer":1},{"id":"Q13B_1","level":"profi","ch":13,"q":"Wie heissen die Anschlüsse eines Bipolartransistors?","options":["Anode, Kathode, Gate","Basis, Kollektor, Emitter","Source, Drain, Gate","Plus, Minus, Mitte"],"answer":1},{"id":"Q13B_2","level":"profi","ch":13,"q":"β = 100, I_B = 0,1 mA, aktiver Bereich. I_C = ?","options":["0,1 mA","1 mA","10 mA","100 mA"],"answer":2},{"id":"Q13B_3","level":"profi","ch":13,"q":"Wie gross ist U_CE in der Sättigung?","options":["ca. 0,2 V","ca. 0,7 V","halbe Speisung","volle Speisung"],"answer":0},{"id":"Q13B_4","level":"profi","ch":13,"q":"Warum steuert man einen Schalttransistor mit mehr Basisstrom als nötig an?","options":["Damit er schneller altert","Damit er sicher in Sättigung geht","Damit er sperrt","Damit β steigt"],"answer":1},{"id":"Q13B_5","level":"profi","ch":13,"q":"Die Lampe am Kollektor braucht 150 mA, β = 100. Mindestbasisstrom?","options":["0,15 mA","1,5 mA","15 mA","150 mA"],"answer":1},{"id":"Q14A_1","level":"profi","ch":14,"q":"U_a / U_e = 0,1. Wie viel dB sind das?","options":["−1 dB","−10 dB","−20 dB","−40 dB"],"answer":2},{"id":"Q14A_2","level":"profi","ch":14,"q":"Was bedeutet −3 dB?","options":["Halbe Spannung","Etwa 70,7 % der Spannung","Ein Zehntel","Doppelte Spannung"],"answer":1},{"id":"Q14A_3","level":"profi","ch":14,"q":"Grenzfrequenz bei R = 1 kΩ, C = 1 µF?","options":["15,9 Hz","159 Hz","1,59 kHz","15,9 kHz"],"answer":1},{"id":"Q14A_4","level":"profi","ch":14,"q":"Wie stark fällt ein Tiefpass 1. Ordnung oberhalb von f_g ab?","options":["3 dB pro Dekade","6 dB pro Dekade","20 dB pro Dekade","40 dB pro Dekade"],"answer":2},{"id":"Q14A_5","level":"profi","ch":14,"q":"Welche Achse ist beim Frequenzgang logarithmisch?","options":["Keine","Die Frequenzachse","Nur die Spannungsachse","Die Zeitachse"],"answer":1},{"id":"Q14B_1","level":"profi","ch":14,"q":"Woraus besteht ein einfacher RC-Bandpass?","options":["Zwei Tiefpässen","Hochpass und Tiefpass hintereinander","Zwei Hochpässen","Nur einem Kondensator"],"answer":1},{"id":"Q14B_2","level":"profi","ch":14,"q":"Was macht ein Differenzierglied (τ ≪ T) aus einem Rechteck?","options":["Ein Dreieck","Nadelimpulse an den Flanken","Einen Sinus","Gleichspannung"],"answer":1},{"id":"Q14B_3","level":"profi","ch":14,"q":"Was macht ein Integrierglied (τ ≫ T) aus einem Rechteck?","options":["Nadelimpulse","Ein flaches Dreieck um den Mittelwert","Ein doppelt so hohes Rechteck","Nichts"],"answer":1},{"id":"Q14B_4","level":"profi","ch":14,"q":"Wie gewinnt man aus einem Taktsignal 0 … 5 V eine Gleichspannung?","options":["Mit einem Hochpass","Mit einem Tiefpass (grosses τ)","Mit einer Z-Diode","Gar nicht"],"answer":1},{"id":"Q14B_5","level":"profi","ch":14,"q":"Welche Ordnung hat ein RC-Bandpass aus einem Hoch- und einem Tiefpass je auf einer Seite?","options":["0","1","2","4"],"answer":1},{"id":"Q15A_1","level":"profi","ch":15,"q":"Ein Motor nimmt bei 6 V einen Strom von 0,3 A auf. Wie gross ist die Leistung?","options":["0,05 W","1,8 W","6,3 W","20 W"],"answer":1},{"id":"Q15A_2","level":"profi","ch":15,"q":"Wie kehrt man die Drehrichtung eines Gleichstrommotors um?","options":["Höhere Spannung","Umpolen der Anschlüsse","Freilaufdiode entfernen","Gar nicht"],"answer":1},{"id":"Q15A_3","level":"profi","ch":15,"q":"Wozu dient die Freilaufdiode am Motor?","options":["Sie erhöht die Drehzahl","Sie schützt den Transistor vor der Abschaltspannung","Sie zeigt an, dass der Motor läuft","Sie ersetzt den Basiswiderstand"],"answer":1},{"id":"Q15A_4","level":"profi","ch":15,"q":"Wie wird die Freilaufdiode eingebaut?","options":["In Reihe zum Motor","Parallel zum Motor, Kathode an Plus","Parallel zum Motor, Anode an Plus","Zwischen Basis und Emitter"],"answer":1},{"id":"Q15A_5","level":"profi","ch":15,"q":"Wie gross ist die Verlustleistung am Transistor bei U_CE = 0,5 V und I_C = 0,28 A?","options":["0,14 W","0,5 W","1,4 W","2,8 W"],"answer":0},{"id":"Q15B_1","level":"profi","ch":15,"q":"Warum ist der Stopp-Taster ein Öffner?","options":["Weil er billiger ist","Drahtbruchsicher: Leitungsbruch wirkt wie Stopp","Damit der Motor schneller startet","Das ist egal"],"answer":1},{"id":"Q15B_2","level":"profi","ch":15,"q":"Was bewirkt die Selbsthaltung?","options":["Der Motor läuft nur, solange Start gedrückt ist","Der Motor läuft nach dem Loslassen von Start weiter","Der Motor läuft rückwärts","Sie ersetzt den Not-Halt"],"answer":1},{"id":"Q15B_3","level":"profi","ch":15,"q":"Der Not-Halt wird entriegelt. Was darf NICHT passieren?","options":["Die Anlage bleibt stehen","Die Anlage läuft von selbst wieder an","Man muss Start drücken","Die Betriebs-LED bleibt aus"],"answer":1},{"id":"Q15B_4","level":"profi","ch":15,"q":"Ein Impulsgeber liefert 1 Impuls pro Umdrehung. In 0,5 s Torzeit werden 5 Impulse gezählt. Drehzahl?","options":["5 1/min","10 1/min","300 1/min","600 1/min"],"answer":3},{"id":"Q15B_5","level":"profi","ch":15,"q":"Start und Stopp werden gleichzeitig gedrückt. Was macht Q = (Start ∨ Q) ∧ Stopp?","options":["Motor läuft","Motor steht (stoppdominant)","Motor wechselt die Richtung","Unbestimmt"],"answer":1}].forEach(q => globalThis.defExamQuestion(q));
export const Exam = globalThis.DQExam;
export const Engine = globalThis.DQEngine;
export const QUEST_TASKS = {"dq":[{"id":"1.1","ch":1,"final":false},{"id":"1.2","ch":1,"final":false},{"id":"1.3","ch":1,"final":false},{"id":"1.4","ch":1,"final":false},{"id":"1.5","ch":1,"final":false},{"id":"1.6","ch":1,"final":false},{"id":"1.7","ch":1,"final":false},{"id":"1.8","ch":1,"final":false},{"id":"1.9","ch":1,"final":false},{"id":"1.10","ch":1,"final":false},{"id":"2.1","ch":2,"final":false},{"id":"2.2","ch":2,"final":false},{"id":"2.3","ch":2,"final":false},{"id":"2.4","ch":2,"final":false},{"id":"2.5","ch":2,"final":false},{"id":"2.6","ch":2,"final":false},{"id":"2.7","ch":2,"final":false},{"id":"2.8","ch":2,"final":false},{"id":"2.9","ch":2,"final":false},{"id":"2.10","ch":2,"final":false},{"id":"3.1","ch":3,"final":false},{"id":"3.2","ch":3,"final":false},{"id":"3.3","ch":3,"final":false},{"id":"3.4","ch":3,"final":false},{"id":"3.5","ch":3,"final":false},{"id":"3.6","ch":3,"final":false},{"id":"3.7","ch":3,"final":false},{"id":"3.8","ch":3,"final":false},{"id":"3.9","ch":3,"final":false},{"id":"3.10","ch":3,"final":false},{"id":"4.1","ch":4,"final":false},{"id":"4.2","ch":4,"final":false},{"id":"4.3","ch":4,"final":false},{"id":"4.4","ch":4,"final":false},{"id":"4.5","ch":4,"final":false},{"id":"4.6","ch":4,"final":false},{"id":"4.7","ch":4,"final":false},{"id":"4.8","ch":4,"final":false},{"id":"4.9","ch":4,"final":false},{"id":"4.10","ch":4,"final":false},{"id":"5.1","ch":5,"final":false},{"id":"5.2","ch":5,"final":false},{"id":"5.3","ch":5,"final":false},{"id":"5.4","ch":5,"final":false},{"id":"5.5","ch":5,"final":false},{"id":"5.6","ch":5,"final":false},{"id":"5.7","ch":5,"final":false},{"id":"5.8","ch":5,"final":false},{"id":"5.9","ch":5,"final":false},{"id":"5.10","ch":5,"final":false},{"id":"6.1","ch":6,"final":false},{"id":"6.2","ch":6,"final":false},{"id":"6.3","ch":6,"final":false},{"id":"6.4","ch":6,"final":false},{"id":"6.5","ch":6,"final":false},{"id":"6.6","ch":6,"final":false},{"id":"6.7","ch":6,"final":false},{"id":"6.8","ch":6,"final":false},{"id":"6.9","ch":6,"final":false},{"id":"6.10","ch":6,"final":false},{"id":"7.1","ch":7,"final":false},{"id":"7.2","ch":7,"final":false},{"id":"7.3","ch":7,"final":false},{"id":"7.4","ch":7,"final":false},{"id":"7.5","ch":7,"final":false},{"id":"7.6","ch":7,"final":false},{"id":"7.7","ch":7,"final":false},{"id":"7.8","ch":7,"final":false},{"id":"7.9","ch":7,"final":false},{"id":"7.10","ch":7,"final":false},{"id":"8.1","ch":8,"final":false},{"id":"8.2","ch":8,"final":false},{"id":"8.3","ch":8,"final":false},{"id":"8.4","ch":8,"final":false},{"id":"8.5","ch":8,"final":false},{"id":"8.6","ch":8,"final":false},{"id":"8.7","ch":8,"final":false},{"id":"8.8","ch":8,"final":false},{"id":"8.9","ch":8,"final":false},{"id":"8.10","ch":8,"final":false},{"id":"9.1","ch":9,"final":false},{"id":"9.2","ch":9,"final":false},{"id":"9.3","ch":9,"final":false},{"id":"9.4","ch":9,"final":false},{"id":"9.5","ch":9,"final":false},{"id":"9.6","ch":9,"final":false},{"id":"9.7","ch":9,"final":false},{"id":"9.8","ch":9,"final":false},{"id":"9.9","ch":9,"final":false},{"id":"9.10","ch":9,"final":false},{"id":"10.1","ch":10,"final":false},{"id":"10.2","ch":10,"final":false},{"id":"10.3","ch":10,"final":false},{"id":"10.4","ch":10,"final":false},{"id":"10.5","ch":10,"final":false},{"id":"10.6","ch":10,"final":false},{"id":"10.7","ch":10,"final":false},{"id":"10.8","ch":10,"final":false},{"id":"10.9","ch":10,"final":false},{"id":"10.10","ch":10,"final":true},{"id":"11.1","ch":11,"final":false},{"id":"11.2","ch":11,"final":false},{"id":"11.3","ch":11,"final":false},{"id":"11.4","ch":11,"final":false},{"id":"11.5","ch":11,"final":false},{"id":"11.6","ch":11,"final":false},{"id":"11.7","ch":11,"final":false},{"id":"11.8","ch":11,"final":false},{"id":"11.9","ch":11,"final":false},{"id":"11.10","ch":11,"final":false},{"id":"12.1","ch":12,"final":false},{"id":"12.2","ch":12,"final":false},{"id":"12.3","ch":12,"final":false},{"id":"12.4","ch":12,"final":false},{"id":"12.5","ch":12,"final":false},{"id":"12.6","ch":12,"final":false},{"id":"12.7","ch":12,"final":false},{"id":"12.8","ch":12,"final":false},{"id":"12.9","ch":12,"final":false},{"id":"12.10","ch":12,"final":false},{"id":"13.1","ch":13,"final":false},{"id":"13.2","ch":13,"final":false},{"id":"13.3","ch":13,"final":false},{"id":"13.4","ch":13,"final":false},{"id":"13.5","ch":13,"final":false},{"id":"13.6","ch":13,"final":false},{"id":"13.7","ch":13,"final":false},{"id":"13.8","ch":13,"final":false},{"id":"13.9","ch":13,"final":false},{"id":"13.10","ch":13,"final":false},{"id":"14.1","ch":14,"final":false},{"id":"14.2","ch":14,"final":false},{"id":"14.3","ch":14,"final":false},{"id":"14.4","ch":14,"final":false},{"id":"14.5","ch":14,"final":false},{"id":"14.6","ch":14,"final":false},{"id":"14.7","ch":14,"final":false},{"id":"14.8","ch":14,"final":false},{"id":"14.9","ch":14,"final":false},{"id":"14.10","ch":14,"final":false},{"id":"15.1","ch":15,"final":false},{"id":"15.2","ch":15,"final":false},{"id":"15.3","ch":15,"final":false},{"id":"15.4","ch":15,"final":false},{"id":"15.5","ch":15,"final":false},{"id":"15.6","ch":15,"final":false},{"id":"15.7","ch":15,"final":false},{"id":"15.8","ch":15,"final":false},{"id":"15.9","ch":15,"final":false},{"id":"15.10","ch":15,"final":true},{"id":"16.1","ch":16,"final":false},{"id":"16.2","ch":16,"final":false},{"id":"16.3","ch":16,"final":false},{"id":"16.4","ch":16,"final":false},{"id":"16.5","ch":16,"final":false},{"id":"16.6","ch":16,"final":false},{"id":"16.7","ch":16,"final":false},{"id":"16.8","ch":16,"final":false}]};

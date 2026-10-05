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
    analyze: function (layout, state) { var net = buildNetlist(layout); return step(net, state || newState(), {}); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DQEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

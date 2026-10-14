/* Digital Quest Studio – laufende Simulation (window.DQStudioSim)
 * Feste Rechenschrittweite dt, davon entkoppelt die Bildschleife (requestAnimationFrame): je Bild so viele Schritte, wie der
 * Zeitfaktor verlangt, mit Zeitbudget und Obergrenze (Aufschaukeln auf langsamen Geraeten verhindern). Zeitfaktor = Simulationszeit
 * pro Sekunde Echtzeit. Aufzeichnung: Traces (Ringpuffer) fuer Oszilloskop-Fenster und Zeitverlauf.
 * Kein DOM – laeuft auch in Node (tests/studio.js). Rechenkern nur ueber die Schnittstelle (docs/SCHNITTSTELLE_RECHENKERN.md). */
(function (root) {
  'use strict';
  var E = root.DQEngine || (typeof require === 'function' ? require('../src/engine.js') : null);
  var DYN = { capacitor: 1, inductor: 1, acsource: 1, clock: 1 };
  var NOW = typeof performance !== 'undefined' ? function () { return performance.now(); } : function () { return Date.now(); };

  /* ---------- Aufzeichnung: Ringpuffer je Signal ----------
   * desc: {kind:'node', a} Spannung am Anschluss gegen Bezug | {kind:'diff', a, b} | {kind:'pv', id} Spannung am Bauteil | {kind:'pi', id} Strom
   * | {kind:'dig', a} Pegel (Spannung, Zeitverlauf) | {kind:'cnt', id} Zaehlerstand des Zaehlerbausteins (Zahl) */
  function Trace(desc, cap) {
    this.desc = desc; this.cap = cap || 120000; this.t = new Float64Array(this.cap); this.v = new Float64Array(this.cap); this.n = 0;
    this.unit = desc.kind === 'pi' ? 'A' : desc.kind === 'cnt' ? '' : 'V';
    this.label = Trace.labelOf(desc); this.color = null;
  }
  Trace.labelOf = function (d) {
    switch (d.kind) {
      case 'node': case 'dig': return 'U(' + d.a + ')';
      case 'diff': return 'U(' + d.a + ' − ' + d.b + ')';
      case 'pv': return 'U(' + d.id + ')'; case 'pi': return 'I(' + d.id + ')'; case 'cnt': return 'Z(' + d.id + ')';
    }
    return '?';
  };
  Trace.prototype.push = function (t, v) {
    if (this.n === this.cap) { var h = this.cap >> 1; this.t.copyWithin(0, h); this.v.copyWithin(0, h); this.n = this.cap - h; }
    this.t[this.n] = t; this.v[this.n] = v; this.n++;
  };
  Trace.prototype.clear = function () { this.n = 0; };
  /* Wert zur Zeit t (linear interpoliert, binaere Suche); NaN ausserhalb */
  Trace.prototype.at = function (t) {
    var n = this.n; if (!n || t < this.t[0] || t > this.t[n - 1]) return NaN;
    var lo = 0, hi = n - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (this.t[m] <= t) lo = m; else hi = m; }
    var t0 = this.t[lo], t1 = this.t[hi]; return t1 === t0 ? this.v[lo] : this.v[lo] + (this.v[hi] - this.v[lo]) * (t - t0) / (t1 - t0);
  };
  /* erster Index mit t[i] >= t */
  Trace.prototype.lower = function (t) { var lo = 0, hi = this.n; while (lo < hi) { var m = (lo + hi) >> 1; if (this.t[m] < t) lo = m + 1; else hi = m; } return lo; };
  Trace.prototype.read = function (res, net) {
    var d = this.desc, nv = res.nodeV, pn = net.pinNode, p;
    switch (d.kind) {
      case 'node': case 'dig': return pn[d.a] === undefined ? NaN : nv[pn[d.a]];
      case 'diff': return pn[d.a] === undefined || pn[d.b] === undefined ? NaN : nv[pn[d.a]] - nv[pn[d.b]];
      case 'pv': p = res.parts[d.id]; return p && p.v !== undefined ? p.v : NaN;
      case 'pi': p = res.parts[d.id]; return p && p.i !== undefined ? p.i : NaN;
      case 'cnt': p = res.parts[d.id]; return p && p.count !== undefined ? p.count : NaN;
    }
    return NaN;
  };

  /* ---------- Schrittweite aus dem Aufbau ----------
   * Quellen: 1/200 Periode; R·C: tau/100 (Rueckwaerts-Euler: Zeitkonstante wird um etwa dt/(2·tau) zu gross, bei tau/100 0,5 %);
   * L·C: 1/500 Schwingungsdauer; L/R: tau/100. Ohne Zeitgroessen 1 ms. Grenzen 10 ns … 20 ms. */
  function chooseDt(net) {
    var tmin = Infinity, rs = [], cs = [], ls = [];
    net.parts.forEach(function (p) {
      var q = p.props;
      if ((p.type === 'acsource' || p.type === 'clock') && q.freq > 0) tmin = Math.min(tmin, 1 / q.freq / 200);
      if ((p.type === 'resistor' || p.type === 'lamp' || p.type === 'motor' || p.type === 'pot') && q.value > 0) rs.push(q.value);
      if (p.type === 'capacitor' && q.value > 0) cs.push(q.value);
      if (p.type === 'inductor' && q.value > 0) ls.push(q.value);
    });
    var rmin = rs.length ? Math.min.apply(null, rs) : 0, rmax = rs.length ? Math.max.apply(null, rs) : 0;
    if (!rmin) net.parts.forEach(function (p) { if ((p.type === 'battery' || p.type === 'acsource') && p.props.ri > 0 && p.props.ri < 1e5) { rmin = rmin ? Math.min(rmin, p.props.ri) : p.props.ri; } }); // Quellen-ri nur ohne Widerstaende
    if (cs.length && rmin) tmin = Math.min(tmin, rmin * Math.min.apply(null, cs) / 100);
    if (ls.length && rmax) tmin = Math.min(tmin, Math.min.apply(null, ls) / rmax / 100);
    if (ls.length && cs.length) tmin = Math.min(tmin, 2 * Math.PI * Math.sqrt(Math.min.apply(null, ls) * Math.min.apply(null, cs)) / 500);
    if (!isFinite(tmin)) return 1e-3;
    return Math.max(1e-8, Math.min(0.02, tmin));
  }
  /* Darstellungsdauer (s): vier Perioden der langsamsten Quelle bzw. Zeitkonstanten; null ohne Zeitgroessen */
  function chooseSpan(net) {
    var T = 0, tau = 0;
    net.parts.forEach(function (p) { if ((p.type === 'acsource' || p.type === 'clock') && p.props.freq > 0) T = Math.max(T, 1 / p.props.freq); });
    return T ? 4 * T : null;
  }

  function Sim(opts) {
    opts = opts || {};
    this.getLayout = opts.getLayout || function () { return { parts: [], wires: [] }; };
    this.onFrame = opts.onFrame || null;
    this.net = null; this.state = E.newState(); this.res = null; this.err = null; this.faults = [];
    this.dtAuto = true; this.dtManual = 1e-3; this.dt = 1e-3;
    this.factor = 'auto'; this.running = opts.running !== false; this.acc = 0; this.last = 0;
    this.traces = []; this.lag = false; this.rate = 0; this.steps = 0; this.dynamic = false; this.span = null;
    this.iters = true;  // Zwischenloesungen je Rechenschritt aufzeichnen (Zeitverlauf: Laufzeit der Flipflops), siehe E.step opts.iters
    this.tpd = 20e-9;   // Laufzeit je Flipflop-Stufe (aus den Bauteilen, groesster Wert)
    this.hooks = [];    // function (res, t, iterList) nach jedem Schritt
    this.version = 0;   // zaehlt jede Aenderung der Zeit/des Ergebnisses (fuer Neuzeichnen)
  }
  Sim.chooseDt = chooseDt; Sim.Trace = Trace;

  Sim.prototype.addTrace = function (desc) {
    var key = JSON.stringify(desc), ex = this.traces.filter(function (t) { return JSON.stringify(t.desc) === key; })[0];
    if (ex) { ex.refs = (ex.refs || 0) + 1; return ex; }
    var tr = new Trace(desc); tr.refs = 1; this.traces.push(tr);
    if (this.res && this.net) { var v = tr.read(this.res, this.net); if (!isNaN(v)) tr.push(this.state.t, v); }
    return tr;
  };
  Sim.prototype.removeTrace = function (tr) { if (--tr.refs <= 0) this.traces = this.traces.filter(function (t) { return t !== tr; }); };
  Sim.prototype.clearTraces = function () { this.traces.forEach(function (t) { t.clear(); }); };

  /* Neuaufbau nach einer Aenderung am Schaltplan. structural: Teile/Leitungen geaendert (Zustand bleibt je Bauteil erhalten,
   * Zeit laeuft weiter – wie beim Umbauen im Labor). Gibt false zurueck, wenn die Netzliste nicht gebaut werden kann. */
  Sim.prototype.refresh = function (structural) {
    var layout = this.getLayout();
    try { this.net = E.buildNetlist(layout); this.err = null; }
    catch (e) { this.net = null; this.err = e.message; this.res = null; this.faults = []; this.version++; return false; }
    this.dynamic = this.net.parts.some(function (p) { return DYN[p.type]; });
    this.dt = this.dtAuto ? chooseDt(this.net) : this.dtManual;
    this.span = chooseSpan(this.net);
    var tp = 0; this.net.parts.forEach(function (p) { if (p.props.tpd > tp && (E.PARTS[p.type].ff || E.PARTS[p.type].ctr)) tp = p.props.tpd; }); this.tpd = tp || 20e-9;
    this.evaluate();
    return true;
  };
  /* Ergebnis fuer die Anzeige: statische Schaltung → Arbeitspunkt (Flanken von Schaltern zaehlen); dynamische im Stillstand → Vorschau
   * auf einer Kopie des Zustands (nichts wird festgeschrieben) */
  Sim.prototype.evaluate = function () {
    if (!this.net) return;
    try {
      if (!this.dynamic) this.res = E.step(this.net, this.state, { noGroundFault: true });
      else this.res = E.step(this.net, E.clone(this.state), { dt: this.dt, noGroundFault: true });
      this.err = null;
    } catch (e) { this.err = e.message; this.res = null; this.running = false; }
    this.faults = this.res ? this.res.faults : [];
    this.version++;
  };
  Sim.prototype.stepOnce = function () {
    var net = this.net; if (!net) return false;
    var o = { dt: this.dt, noGroundFault: true }; if (this.iters) o.iters = [];
    var res;
    try { res = E.step(net, this.state, o); } catch (e) { this.err = e.message; this.running = false; return false; }
    this.res = res; this.faults = res.faults; this.steps++;
    var tr = this.traces, t = this.state.t, it = o.iters, K = it ? it.length - 1 : 0, i, v;
    if (K > 0) { // Flipflops haben geschaltet: jeder Durchgang traegt seinen Zeitpunkt (Taktflanke + Laufzeiten)
      for (var k = 0; k <= K; k++) {
        var pseudo = { nodeV: it[k].nodeV, parts: res.parts };
        for (i = 0; i < tr.length; i++) { var kd = tr[i].desc.kind; if (kd === 'node' || kd === 'dig' || kd === 'diff') { v = tr[i].read(pseudo, net); if (!isNaN(v)) tr[i].push(it[k].t, v); } }
      }
    }
    else if (it && it.length) { // keine Flipflop-Ereignisse: Pegelsignale trotzdem zum Schrittanfang eintragen (die Flanke einer Quelle gehoert zu t − dt, nicht zum Schrittende)
      var ps0 = { nodeV: it[0].nodeV, parts: res.parts };
      for (i = 0; i < tr.length; i++) if (tr[i].desc.kind === 'dig') { v = tr[i].read(ps0, net); if (!isNaN(v)) tr[i].push(it[0].t, v); }
    }
    for (i = 0; i < tr.length; i++) { v = tr[i].read(res, net); if (!isNaN(v)) tr[i].push(t, v); }
    for (var h = 0; h < this.hooks.length; h++) this.hooks[h](res, t, o.iters || null, this.dt);
    return true;
  };
  /* Genau n Schritte (Einzelschritt, Tests) */
  Sim.prototype.step = function (n) { n = n || 1; for (var k = 0; k < n; k++) if (!this.stepOnce()) break; this.version++; };
  /* Simulationszeit seconds vorrechnen (ohne Bildschleife; fuer Tests und „Zeit vorspulen“), hoechstens maxSteps */
  Sim.prototype.advance = function (seconds, maxSteps) {
    if (!this.net) return 0;
    var n = Math.min(maxSteps || 5e6, Math.floor(seconds / this.dt + 1e-9)), k;
    for (k = 0; k < n; k++) if (!this.stepOnce()) break;
    this.version++; return k * this.dt;
  };
  Sim.prototype.reset = function () {
    this.state = E.newState(); this.acc = 0; this.steps = 0; this.lag = false; this.clearTraces();
    if (this.net) { this.refresh(false); try { this.res = E.step(this.net, this.state, { noGroundFault: true }); if (this.dynamic) this.res = E.step(this.net, E.clone(this.state), { dt: 1e-12, noGroundFault: true }); /* Anfangsbedingungen: L stromlos, C leer */ this.faults = this.res.faults; } catch (e) { this.err = e.message; } }
    var self = this; this.traces.forEach(function (tr) { if (self.res && self.net) { var v = tr.read(self.res, self.net); if (!isNaN(v)) tr.push(0, v); } });
    this.version++;
  };
  Sim.prototype.setDt = function (dt) { if (dt === 'auto') { this.dtAuto = true; } else { this.dtAuto = false; this.dtManual = Math.max(1e-9, Math.min(0.1, +dt)); } if (this.net) this.dt = this.dtAuto ? chooseDt(this.net) : this.dtManual; this.version++; };
  Sim.prototype.setFactor = function (f) { this.factor = f === 'auto' ? 'auto' : +f; this.acc = 0; };
  /* Zeitfaktor, der gerade gilt (Simulationszeit je Echtzeitsekunde). Auto: die Darstellungsdauer (4 Perioden) in etwa 2 s, hoechstens Echtzeit */
  Sim.prototype.effFactor = function () {
    if (this.factor !== 'auto') return this.factor;
    if (!this.span) return 1;
    var f = this.span / 2, nice = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5, 1];
    for (var i = nice.length - 1; i >= 0; i--) if (nice[i] <= f * 1.0001) return nice[i];
    return nice[0];
  };
  Sim.prototype.start = function () { this.running = true; this.last = NOW(); this.acc = 0; };
  Sim.prototype.pause = function () { this.running = false; };
  /* Bildschleife: vom Aufrufer mit requestAnimationFrame-Zeit (ms) gerufen */
  Sim.prototype.frame = function (now) {
    var wall = this.last ? Math.min(0.05, Math.max(0, (now - this.last) / 1000)) : 0; this.last = now;
    if (!this.running || !this.net || this.err) { this.lag = false; return; }
    this.acc += wall * this.effFactor();
    var t0 = NOW(), n = 0, due = Math.floor(this.acc / this.dt + 1e-9);
    this.lag = false;
    while (this.acc >= this.dt - 1e-18) {
      if (!this.stepOnce()) break;
      this.acc -= this.dt; n++;
      if ((n & 7) === 0 && NOW() - t0 > 12) { this.lag = true; break; }
      if (n >= 20000) { this.lag = true; break; }
    }
    if (this.lag) this.acc = 0; // nicht aufholen: Rueckstand verwerfen (Anzeige zeigt, dass der Rechner nicht mitkommt)
    this.rate = wall > 0 ? n * this.dt / wall : this.rate;
    if (n) this.version++;
  };

  root.DQStudioSim = Sim;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);

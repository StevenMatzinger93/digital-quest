/* Digital Quest – Bauteil-Datenblaetter (siehe docs/PLAN_BAUTEILDATENBLATT.md)
 * Hier stehen nur TEXTE: was das Bauteil tut, was jeder Anschluss bedeutet, was beim Ueberschreiten einer Grenze passiert.
 * ZAHLEN stehen hier keine: Grenz- und Kennwerte werden zur Laufzeit aus der Engine gelesen (E.PARTS[type].props, E.LIMITS,
 * E.LOGIC, E.LED_COLORS, E.METER) – aendert sich ein Wert in engine.js, zieht das Datenblatt automatisch mit.
 *
 * Eintrag je Bauteiltyp:
 *   funktion     HTML, ein bis zwei Saetze
 *   anschluesse  {pin: Text} – genau die Pins aus E.PARTS[type].pins
 *   grenzen      [{key, text}] – key = Eigenschaft in props; text = was beim Ueberschreiten passiert
 *   kennwerte    [key] – weitere Eigenschaften aus props, die angezeigt werden
 *   extra        function (E) → [{label, value, unit}] – abgeleitete Werte aus der Engine (z. B. U_F je LED-Farbe)
 *   formel       HTML (optional), z. B. Dimensionierungsformel
 * DQ.datasheet(type, E) setzt daraus das fertige Datenblatt zusammen (ohne DOM, auch im Validator nutzbar). */
(function (root) {
  'use strict';
  var DQ = root.DQ = root.DQ || { chapters: [], tasks: [], theories: [], byId: {} };

  /* Beschriftung und Einheit der Eigenschaften (nur Namen, keine Werte). value: Einheit kommt aus E.PARTS[type].unit */
  var PROP = {
    value: { label: 'Standardwert (einstellbar)' },
    imax: { label: 'Hoechststrom', unit: 'A' }, pmax: { label: 'Hoechstleistung', unit: 'W' },
    pnom: { label: 'Nennleistung', unit: 'W' }, inom: { label: 'Nennstrom', unit: 'A' },
    ri: { label: 'Innenwiderstand', unit: 'Ω' }, rs: { label: 'Bahnwiderstand', unit: 'Ω' },
    vf: { label: 'Durchlassspannung U<sub>F</sub>', unit: 'V' }, vz: { label: 'Z-Spannung U<sub>Z</sub> (einstellbar)', unit: 'V' },
    beta: { label: 'Stromverstaerkung β (einstellbar)', unit: '' }, vbe: { label: 'Basis-Emitter-Spannung U<sub>BE</sub>', unit: 'V' },
    rbe: { label: 'Bahnwiderstand Basis-Emitter', unit: 'Ω' }, vsat: { label: 'Saettigungsspannung U<sub>CE,sat</sub>', unit: 'V' },
    freq: { label: 'Frequenz (einstellbar)', unit: 'Hz' }, offset: { label: 'Gleichanteil (einstellbar)', unit: 'V' }
  };
  var LOGIC_EXTRA = function (E) { return [
    { label: 'Logikpegel 1 / 0', value: E.LOGIC.vcc + ' V / 0 V' },
    { label: 'Schaltschwelle am Eingang', value: E.LOGIC.vth, unit: 'V' },
    { label: 'Ausgangswiderstand', value: E.LOGIC.rout, unit: 'Ω' }]; };

  var S = DQ.datasheets = {
    battery: {
      funktion: 'Liefert eine <b>Gleichspannung</b>. Wie jede echte Quelle hat sie einen kleinen Innenwiderstand – bei Kurzschluss fliesst deshalb ein sehr grosser, aber endlicher Strom.',
      anschluesse: { p: 'Pluspol (+), rot', n: 'Minuspol (−), schwarz' },
      grenzen: [{ key: 'imax', text: 'Darueber meldet die Simulation <b>Kurzschluss</b>.' }], kennwerte: ['value', 'ri'],
      extra: function (E) { var q = E.PARTS.battery.props; return [{ label: 'Kurzschlussstrom I<sub>K</sub> = U / R<sub>i</sub>', value: q.value / q.ri, unit: 'A' }]; },
      formel: 'I<sub>K</sub> = U / R<sub>i</sub> – deshalb nie Plus direkt mit Minus verbinden.'
    },
    resistor: {
      funktion: 'Begrenzt den Strom: Nach dem <b>Ohmschen Gesetz</b> fliesst I = U / R. Die Leistung P = U · I wird in Waerme umgesetzt.',
      anschluesse: { a: 'Anschluss 1', b: 'Anschluss 2 (beliebig gepolt)' },
      grenzen: [{ key: 'pmax', text: 'Darueber wird er zu heiss: Stoerung <b>Ueberlast</b>.' }], kennwerte: ['value'],
      formel: 'U = R · I &nbsp;·&nbsp; P = U · I = I² · R = U² / R'
    },
    led: {
      funktion: 'Leuchtdiode: leuchtet, wenn Strom in <b>Durchlassrichtung</b> (Anode → Kathode) fliesst. Braucht immer einen <b>Vorwiderstand</b>.',
      anschluesse: { a: 'Anode (+), langes Bein', k: 'Kathode (−), kurzes Bein, abgeflachte Seite' },
      grenzen: [{ key: 'imax', text: 'Darueber <b>brennt sie durch</b> und bleibt defekt, bis du „Reparieren“ drueckst.' }],
      kennwerte: ['inom', 'rs'],
      extra: function (E) {
        return [{ label: 'Hoechste Sperrspannung', value: E.LIMITS.ledReverse, unit: 'V', grenze: true, text: 'Darueber meldet die Simulation die LED als <b>in Sperrrichtung ueberlastet</b> – Anode gehoert Richtung Plus.' }]
          .concat(Object.keys(E.LED_COLORS).map(function (c) { return { label: 'U<sub>F</sub> ' + c, value: E.LED_COLORS[c].vf, unit: 'V' }; }));
      },
      formel: 'Vorwiderstand R<sub>V</sub> = (U − U<sub>F</sub>) / I<sub>F</sub>'
    }
  };

  function fmtVal(E, v, unit) {
    if (typeof v === 'string') return v;
    if (unit === undefined || unit === '') return String(+(+v).toPrecision(4));
    return E.fmt(v, unit).replace(/(\.\d*?[1-9])0+\s|\.0+\s/, '$1 ').replace(/\s+/g, ' ').trim();
  }

  /* Fertiges Datenblatt aus Texten + Engine-Werten */
  DQ.datasheet = function (type, E) {
    var d = E.PARTS[type], t = S[type];
    if (!d) throw new Error('Unbekannter Bauteiltyp: ' + type);
    t = t || {};
    var q = d.props || {}, unitOf = function (k) { return k === 'value' ? (d.unit || '') : (PROP[k] || {}).unit; };
    var row = function (k) { return { key: k, label: (PROP[k] || { label: k }).label, value: fmtVal(E, q[k], unitOf(k)) }; };
    var grenzen = (t.grenzen || []).map(function (g) { var r = row(g.key); r.text = g.text; return r; });
    var kennwerte = (t.kennwerte || []).map(row);
    (t.extra ? t.extra(E) : []).forEach(function (x) {
      var r = { label: x.label, value: fmtVal(E, x.value, x.unit) };
      if (x.grenze) { r.text = x.text; grenzen.push(r); } else kennwerte.push(r);
    });
    return {
      type: type, label: d.label, prefix: d.prefix, funktion: t.funktion || '',
      pins: d.pins.map(function (p) { return { pin: p, text: (t.anschluesse || {})[p] || '' }; }),
      grenzen: grenzen, kennwerte: kennwerte, formel: t.formel || ''
    };
  };
  DQ.datasheetProps = PROP;
})(typeof window !== 'undefined' ? window : globalThis);

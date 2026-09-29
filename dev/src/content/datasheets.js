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
 *   extra        function (E, q) → [{label, value, unit}] – abgeleitete Werte (q = Kennwerte des Bauteils, z. B. U_F je LED-Farbe)
 *   formel       HTML (optional), z. B. Dimensionierungsformel
 * DQ.datasheet(type, E, part?) setzt daraus das fertige Datenblatt zusammen (ohne DOM, auch im Validator nutzbar). Mit part
 * (eingebautes Bauteil) gelten dessen eigene Werte (value, props) vor den Katalogwerten der Engine. */
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
  /* Zwei Ausgaenge direkt verbunden – gilt fuer alle Logikausgaenge */
  var CLASH = { label: 'Ausgang an Ausgang', value: 'verboten', grenze: true, text: 'Zwei Ausgaenge mit verschiedenem Pegel direkt verbunden: Stoerung <b>Ausgang gegen Ausgang</b>. Signale immer ueber ein Gatter verknuepfen.' };

  var S = DQ.datasheets = {
    battery: {
      funktion: 'Liefert eine <b>Gleichspannung</b>. Wie jede echte Quelle hat sie einen kleinen Innenwiderstand – bei Kurzschluss fliesst deshalb ein sehr grosser, aber endlicher Strom.',
      anschluesse: { p: 'Pluspol (+), rot', n: 'Minuspol (−), schwarz' },
      grenzen: [{ key: 'imax', text: 'Darueber meldet die Simulation <b>Kurzschluss</b>.' }], kennwerte: ['value', 'ri'],
      extra: function (E, q) { return [{ label: 'Kurzschlussstrom I<sub>K</sub> = U / R<sub>i</sub>', value: q.value / q.ri, unit: 'A' }]; },
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
    },
    ground: {
      funktion: 'Der <b>Bezugspunkt</b> der Schaltung: Hier sind 0 V. Alle Spannungen „gegen Masse“ beziehen sich darauf. Fehlt die Masse, gilt der Minuspol der ersten Spannungsquelle als 0 V. Logikbausteine brauchen immer einen Bezugspunkt.',
      anschluesse: { g: 'Masseanschluss (0 V)' }
    },
    pot: {
      funktion: 'Einstellbarer Spannungsteiler: Der <b>Schleifer</b> teilt den Gesamtwiderstand in zwei Teile. Schieberegler im Eigenschaften-Panel: 0 = Schleifer bei a, 1 = Schleifer bei b.',
      anschluesse: { a: 'Ende a des Widerstands', w: 'Schleifer (abgegriffene Teilspannung)', b: 'Ende b des Widerstands' },
      grenzen: [{ key: 'pmax', text: 'Darueber wird es zu heiss: Stoerung <b>Ueberlast</b>.' }], kennwerte: ['value'],
      formel: 'U<sub>wb</sub> = U<sub>ab</sub> · R<sub>wb</sub> / R<sub>ab</sub> (unbelastet)'
    },
    lamp: {
      funktion: 'Gluehlampe: Der Strom bringt den Gluehfaden zum Leuchten – je mehr Leistung, desto heller. Im Simulator mit festem Widerstand nachgebildet.',
      anschluesse: { a: 'Anschluss 1', b: 'Anschluss 2 (beliebig gepolt)' },
      grenzen: [], kennwerte: ['value', 'pnom'],
      extra: function (E, q) {
        return [{ label: 'Durchbrennen ab', value: q.pnom * E.LIMITS.lampBurn, unit: 'W', grenze: true, text: 'Bei mehr als ' + E.LIMITS.lampBurn + ' × Nennleistung <b>brennt sie durch</b> und bleibt defekt, bis du „Reparieren“ drueckst.' },
          { label: 'Nennspannung U = √(P · R)', value: Math.sqrt(q.pnom * q.value), unit: 'V' }];
      },
      formel: 'P = U² / R'
    },
    switch: {
      funktion: 'Schalter mit zwei festen Stellungen: <b>geschlossen</b> (leitet) oder <b>offen</b> (unterbricht den Stromkreis). Umschalten per Klick.',
      anschluesse: { a: 'Kontakt 1', b: 'Kontakt 2' }
    },
    button: {
      funktion: 'Drucktaster (Schliesser): leitet <b>nur solange er gedrueckt</b> wird, danach federt er zurueck und der Kreis ist wieder offen.',
      anschluesse: { a: 'Kontakt 1', b: 'Kontakt 2' }
    },
    diode: {
      funktion: 'Laesst Strom nur in eine Richtung durch: in <b>Durchlassrichtung</b> (Anode → Kathode) ab der Schleusenspannung, in Sperrrichtung praktisch nicht. Gleichrichter, Verpolschutz, Freilaufdiode.',
      anschluesse: { a: 'Anode (+)', k: 'Kathode (−), Ring auf dem Gehaeuse' },
      grenzen: [{ key: 'imax', text: 'Datenblattwert (Typ 1N4007). Die Simulation meldet hier keine Stoerung – im echten Labor wuerde die Diode zerstoert.' }],
      kennwerte: ['vf', 'rs']
    },
    capacitor: {
      funktion: 'Speichert Ladung. Ueber einen Widerstand laedt und entlaedt er sich mit der <b>Zeitkonstante τ = R · C</b>. Bei Gleichspannung sperrt er, sobald er geladen ist.',
      anschluesse: { a: 'Anschluss (+ beim Elko)', b: 'Anschluss (− beim Elko, Minus-Streifen). Die Simulation prueft die Polung nicht.' },
      kennwerte: ['value'],
      formel: 'τ = R · C &nbsp;·&nbsp; nach 5 τ praktisch voll geladen'
    },
    ammeter: {
      funktion: 'Fest eingebauter Strommesser: wird <b>in Reihe</b> in den Stromkreis geschaltet und zeigt den Strom, der durch ihn fliesst.',
      anschluesse: { a: 'Eingang (Strom fliesst von a nach b positiv)', b: 'Ausgang' },
      extra: function (E) { return [
        { label: 'Hoechststrom (Sicherung)', value: E.METER.fuseA, unit: 'A', grenze: true, text: 'Darueber: Stoerung – der Strommesser liegt dann meist faelschlich <b>parallel</b> zur Quelle.' },
        { label: 'Innenwiderstand (Shunt)', value: E.METER.rA, unit: 'Ω' }]; }
    },
    clock: {
      funktion: 'Taktgeber: gibt ein <b>Rechtecksignal</b> aus, das mit der eingestellten Frequenz zwischen 0 und 1 wechselt – fuer Blinker, Zaehler und Impulsgeber.',
      anschluesse: { out: 'Taktausgang (0 / 1)' },
      kennwerte: ['freq'], extra: LOGIC_EXTRA,
      formel: 'Periodendauer T = 1 / f'
    },
    acsource: {
      funktion: 'Kleiner Funktionsgenerator: liefert eine <b>Wechselspannung</b> mit einstellbarem Scheitelwert Û, Frequenz, Kurvenform (Sinus, Rechteck, Dreieck) und Gleichanteil.',
      anschluesse: { p: 'Ausgang +, rot (positive Halbwelle, wenn p gegen n gemessen)', n: 'Ausgang −, schwarz (Bezug)' },
      grenzen: [{ key: 'imax', text: 'Darueber meldet die Simulation <b>Kurzschluss</b>.' }], kennwerte: ['value', 'freq', 'offset', 'ri'],
      extra: function (E, q) { return [{ label: 'Effektivwert beim Sinus Û / √2', value: q.value / Math.SQRT2, unit: 'V' }]; },
      formel: 'Sinus: U = Û / √2 &nbsp;·&nbsp; Rechteck: U = Û &nbsp;·&nbsp; Dreieck: U = Û / √3'
    },
    not: gate('Inverter: Der Ausgang ist immer das <b>Gegenteil</b> des Eingangs.', { in: 'Eingang', out: 'Ausgang Y = ¬A' }, 'Y = ¬A'),
    and: gate('UND-Gatter: Der Ausgang ist nur 1, wenn <b>beide</b> Eingaenge 1 sind.', null, 'Y = A ∧ B'),
    or: gate('ODER-Gatter: Der Ausgang ist 1, wenn <b>mindestens ein</b> Eingang 1 ist.', null, 'Y = A ∨ B'),
    nand: gate('NAND-Gatter (NICHT-UND): Der Ausgang ist nur 0, wenn beide Eingaenge 1 sind. Aus NAND allein laesst sich jede Logik bauen.', null, 'Y = ¬(A ∧ B)'),
    nor: gate('NOR-Gatter (NICHT-ODER): Der Ausgang ist nur 1, wenn beide Eingaenge 0 sind. Zwei NOR ergeben ein RS-Flipflop.', null, 'Y = ¬(A ∨ B)'),
    xor: gate('XOR (Exklusiv-ODER, Antivalenz): Der Ausgang ist 1, wenn die Eingaenge <b>verschieden</b> sind.', null, 'Y = A ⊕ B'),
    xnor: gate('XNOR (Aequivalenz): Der Ausgang ist 1, wenn die Eingaenge <b>gleich</b> sind – ein 1-Bit-Vergleicher.', null, 'Y = ¬(A ⊕ B)'),
    logicin: {
      funktion: 'Pegelschalter am Experimentierboard: gibt per Klick eine logische <b>1 (5 V)</b> oder <b>0 (0 V)</b> aus. Oeffner-Taster (z. B. Stopp, Not-Halt) stehen in Ruhe auf 1.',
      anschluesse: { out: 'Pegelausgang' },
      extra: function (E) { return LOGIC_EXTRA(E).filter(function (r) { return !/schwelle/i.test(r.label); }).concat([CLASH]); }
    },
    logicled: {
      funktion: 'Logikanzeige: leuchtet, wenn am Eingang eine <b>1</b> anliegt. Sie belastet den Ausgang praktisch nicht.',
      anschluesse: { in: 'Eingang' },
      extra: function (E) { return [{ label: 'Leuchtet ab', value: E.LOGIC.vth, unit: 'V' }]; }
    },
    seg7: {
      funktion: '7-Segment-Anzeige mit <b>gemeinsamer Kathode</b>: Jedes Segment leuchtet bei 1. Mit einem BCD-Decoder davor zeigt sie Ziffern 0–9.',
      anschluesse: { a: 'Segment oben', b: 'Segment rechts oben', c: 'Segment rechts unten', d: 'Segment unten', e: 'Segment links unten', f: 'Segment links oben', g: 'Segment Mitte' },
      extra: function (E) { return [{ label: 'Segment leuchtet ab', value: E.LOGIC.vth, unit: 'V' }]; }
    },
    dec7: {
      funktion: 'BCD-7-Segment-Decoder (wie 4511): wandelt eine BCD-Zahl an A–D in die Segmentsignale a–g. Codes 10–15 bleiben dunkel.',
      anschluesse: { A: 'Eingang Wertigkeit 1', B: 'Eingang Wertigkeit 2', C: 'Eingang Wertigkeit 4', D: 'Eingang Wertigkeit 8', a: 'Segment a (oben)', b: 'Segment b', c: 'Segment c', d: 'Segment d (unten)', e: 'Segment e', f: 'Segment f', g: 'Segment g (Mitte)' },
      extra: function (E) { return LOGIC_EXTRA(E).concat([CLASH]); }
    },
    dff: ff('D-Flipflop: uebernimmt bei der <b>steigenden Flanke</b> an C den Wert von D und speichert ihn bis zur naechsten Flanke.', { D: 'Dateneingang' }, 'Q<sub>neu</sub> = D'),
    jkff: ff('JK-Flipflop: bei der steigenden Flanke an C: J = 1 setzt, K = 1 setzt zurueck, J = K = 1 <b>kippt</b>, J = K = 0 speichert.', { J: 'Setzen', K: 'Ruecksetzen' }, 'J K = 00 halten · 10 setzen · 01 ruecksetzen · 11 kippen'),
    tff: ff('T-Flipflop: <b>kippt</b> bei jeder steigenden Flanke an C, wenn T = 1 ist – teilt die Taktfrequenz durch 2. Grundbaustein von Zaehlern.', { T: 'Kippfreigabe (1 = kippen)' }, 'T = 1: Q<sub>neu</sub> = ¬Q'),
    npn: {
      funktion: 'NPN-Transistor: Ein kleiner <b>Basisstrom</b> steuert einen grossen <b>Kollektorstrom</b>. Arbeitsbereiche: gesperrt, aktiv (I<sub>C</sub> = β · I<sub>B</sub>), Saettigung (voll durchgeschaltet).',
      anschluesse: { b: 'Basis – Steuereingang, immer mit Basiswiderstand', c: 'Kollektor – Last (z. B. Lampe, Motor) Richtung Plus', e: 'Emitter – an Masse' },
      grenzen: [{ key: 'pmax', text: 'Verlustleistung U<sub>CE</sub> · I<sub>C</sub> darueber: Stoerung <b>Ueberlast</b>.' }],
      kennwerte: ['beta', 'vbe', 'vsat', 'rbe'],
      formel: 'I<sub>C</sub> = β · I<sub>B</sub> &nbsp;·&nbsp; Schalter: R<sub>B</sub> ≤ (U<sub>st</sub> − U<sub>BE</sub>) / (ü · I<sub>C</sub> / β)'
    },
    zener: {
      funktion: 'Z-Diode: in <b>Sperrrichtung</b> betrieben haelt sie ab der Z-Spannung die Spannung fast konstant – zum Begrenzen und Stabilisieren. In Durchlassrichtung wirkt sie wie eine normale Diode.',
      anschluesse: { a: 'Anode – Richtung Minus', k: 'Kathode (Ring) – Richtung Plus, ueber einen Vorwiderstand' },
      grenzen: [{ key: 'pmax', text: 'Verlustleistung U<sub>Z</sub> · I<sub>Z</sub> darueber: Stoerung <b>Ueberlast</b>.' }],
      kennwerte: ['vz', 'vf', 'rs'],
      formel: 'Vorwiderstand R<sub>V</sub> = (U<sub>e</sub> − U<sub>Z</sub>) / (I<sub>L</sub> + I<sub>Z</sub>)'
    },
    motor: {
      funktion: 'Gleichstrommotor: dreht umso schneller, je mehr Strom fliesst. <b>Umpolen</b> kehrt die Drehrichtung um. Im Simulator als Wicklungswiderstand nachgebildet.',
      anschluesse: { a: 'Anschluss 1 (Plus an a: Vorwaertslauf)', b: 'Anschluss 2 (Plus an b: Rueckwaertslauf)' },
      kennwerte: ['value', 'inom'],
      extra: function (E, q) { return [
        { label: 'Nennspannung U = I<sub>N</sub> · R', value: q.inom * q.value, unit: 'V' },
        { label: 'Nennleistung P = U · I<sub>N</sub>', value: q.inom * q.inom * q.value, unit: 'W' }]; },
      formel: 'Drehzahl ~ Strom &nbsp;·&nbsp; P = U · I'
    }
  };

  /* Gemeinsame Bausteine fuer Gatter und Flipflops */
  function gate(funktion, pins, formel) {
    return { funktion: funktion + ' Versorgung intern, braucht aber eine Masse.', anschluesse: pins || { in1: 'Eingang A', in2: 'Eingang B', out: 'Ausgang Y' },
      extra: function (E) { return LOGIC_EXTRA(E).concat([CLASH]); }, formel: formel };
  }
  function ff(funktion, ins, formel) {
    var pins = {}; Object.keys(ins).forEach(function (k) { pins[k] = ins[k]; });
    pins.C = 'Takteingang (steigende Flanke)'; pins.Q = 'Ausgang Q'; pins.Qn = 'Ausgang Q̄ (invertiert)';
    return { funktion: funktion, anschluesse: pins, extra: function (E) { return LOGIC_EXTRA(E).concat([CLASH]); }, formel: formel };
  }

  function fmtVal(E, v, unit) {
    if (typeof v === 'string') return v;
    if (unit === undefined || unit === '') return String(+(+v).toPrecision(4));
    return E.fmt(v, unit).replace(/(\.\d*?[1-9])0+\s|\.0+\s/, '$1 ').replace(/\s+/g, ' ').trim();
  }

  /* Fertiges Datenblatt aus Texten + Engine-Werten */
  DQ.datasheet = function (type, E, part) {
    var d = E.PARTS[type], t = S[type];
    if (!d) throw new Error('Unbekannter Bauteiltyp: ' + type);
    t = t || {};
    var q = {}, own = (part && part.props) || {};
    Object.keys(d.props || {}).forEach(function (k) { q[k] = own[k] !== undefined ? own[k] : d.props[k]; });
    if (part && part.value !== undefined) q.value = part.value;
    var unitOf = function (k) { return k === 'value' ? (d.unit || '') : (PROP[k] || {}).unit; };
    var row = function (k) { return { key: k, label: k === 'value' && part ? 'Wert' : (PROP[k] || { label: k }).label, value: fmtVal(E, q[k], unitOf(k)) }; };
    var grenzen = (t.grenzen || []).map(function (g) { var r = row(g.key); r.text = g.text; return r; });
    var kennwerte = (t.kennwerte || []).map(row);
    (t.extra ? t.extra(E, q) : []).forEach(function (x) {
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

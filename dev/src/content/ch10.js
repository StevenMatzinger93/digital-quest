/* Kapitel 10 – Anzeigen und komplexe Kombinatorik (Abschluss Grundstufe mit Boss-Aufgabe)
 * Quelle: Digitaltechnik stationaere Vorgaenge Kap. 7 (Codewandler BCD → 7-Segment, gemeinsame Kathode), Kap. 9 (Komparator,
 * Addierer), Pruefungen Digitaltechnik (Anwendungsaufgaben mit mehreren Eingaengen und Ausgaengen). */
(function () {
  'use strict';
  defChapter({
    id: 10, title: 'Anzeigen und komplexe Kombinatorik',
    intro: 'Zum Abschluss der Grundstufe baust du ganze Anwendungen: Zahlenanzeigen, eine Ampel, einen Wasserstandsmelder – und zum Schluss das Codeschloss des Labortresors.',
    sequence: ['T10A', '10.1', '10.2', '10.3', '10.4', '10.5', 'T10B', '10.6', '10.7', '10.8', '10.9', '10.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  var SEG = 'abcdefg'.split('');
  function segWires(ic, az, swap) { return SEG.map(function (k) { var t = swap && swap[k] ? swap[k] : k; return W(ic + '.' + k, az + '.' + t); }); }
  function setBits(n, v, off) { var s = {}; for (var b = 0; b < n; b++) s['E' + (b + 1 + (off || 0))] = { closed: !!(v >> b & 1) }; return s; }
  /* Anzeigeeinheit rechts: IC1 (Decoder) + AZ1 (Anzeige), optional verdrahtet */
  function addDisplay(l, wired, ic, az, y) {
    ic = ic || 'IC1'; az = az || 'AZ1'; y = y || 300;
    l.parts.push({ id: ic, type: 'dec7', x: 640, y: y, rot: 0 }, { id: az, type: 'seg7', x: 840, y: y, rot: 0 });
    if (wired) l.wires = l.wires.concat(segWires(ic, az));
    return l;
  }
  function benchDisp(b, ic, az, y) { b.parts.push({ id: ic || 'IC1', x: 620, y: y || 420, rot: 0 }, { id: az || 'AZ1', x: 820, y: y || 420, rot: 0 }); return b; }
  function digitTests(n, list, off) { return list.map(function (v) { return { name: 'Eingabe ' + v, set: setBits(n, v, off), expect: [{ sel: 'AZ1', digit: v }] }; }); }

  defTheory({
    id: 'T10A', ch: 10, title: '7-Segment-Anzeigen', tags: ['digital.7segment', 'digital.decoder'],
    lesson:
      '<p>Eine <b>7-Segment-Anzeige</b> besteht aus sieben LED-Balken a … g (a oben, dann im Uhrzeigersinn b, c, d, e, f, g in der Mitte). Bei <b>gemeinsamer Kathode</b> liegen alle Kathoden an Masse – ein Segment leuchtet bei <b>1</b>. Bei <b>gemeinsamer Anode</b> liegen die Anoden an +, ein Segment leuchtet bei <b>0</b> (invertierte Ansteuerung).</p>' +
      '<p>Ein <b>BCD-7-Segment-Decoder</b> (z. B. 4511) ist ein fertiger Codewandler: 4 BCD-Eingaenge (Wertigkeit 1, 2, 4, 8) → 7 Segmentausgaenge. Ungueltige Codes (10 … 15) schaltet er dunkel.</p>' +
      '<p>Jedes Segment ist eine eigene Logikfunktion. Beispiel fuer die Ziffern 0 … 3 (Eingaenge E2E1): a leuchtet bei 0, 2, 3 → a = E2 ∨ Ē1; g leuchtet bei 2, 3 → g = E2.</p>' +
      '<p>Mehrstellige Zahlen brauchen pro Stelle einen Decoder und eine Anzeige – die Zehner und die Einer je als BCD-Ziffer.</p>' +
      '<p><b>Unbenutzte Eingaenge</b> legt man fest auf 0 (an Masse) – nie offen lassen.</p>',
    questions: [
      { q: 'Welches Segment ist die Mitte der Anzeige?', options: ['a', 'd', 'f', 'g'], correct: 3, explain: 'a oben, d unten, g in der Mitte.' },
      { q: 'Gemeinsame Kathode: Wann leuchtet ein Segment?', options: ['Bei 0', 'Bei 1', 'Immer', 'Nie'], correct: 1, explain: 'Die Kathode liegt an Masse, eine 1 an der Anode laesst Strom fliessen.' },
      { q: 'Welche Segmente leuchten bei der Ziffer 1?', options: ['a und b', 'b und c', 'e und f', 'f und g'], correct: 1, explain: 'Die Eins sind die beiden rechten Segmente b und c.' },
      { q: 'Wie viele Decoder braucht eine dreistellige Anzeige?', options: ['1', '2', '3', '7'], correct: 2, explain: 'Pro Stelle ein Decoder.' },
      { q: 'Was zeigt ein BCD-Decoder bei 1110₂?', options: ['14', 'E', 'nichts', '4'], correct: 2, explain: '14 ist kein gueltiger BCD-Code – die Anzeige bleibt dunkel.' }
    ]
  });

  /* 10.1: ganze Anzeige aufbauen */
  var inputs4 = LG.io(4, []);
  var full = addDisplay(JSON.parse(JSON.stringify(inputs4)), true);
  ['A', 'B', 'C', 'D'].forEach(function (k, i) { full.wires.push(W('E' + (i + 1) + '.out', 'IC1.' + k)); });
  defTask({
    id: '10.1', ch: 10, title: 'Die Zahlenanzeige', tags: ['digital.7segment', 'digital.decoder'],
    story: 'Die Stueckzahl-Anzeige der Verpackungsmaschine ist ausgebaut. Baue sie mit Decoder und Anzeige neu auf.',
    brief: 'Hole einen <b>BCD-Decoder</b> und eine <b>7-Segment-Anzeige</b>. Verbinde E1 … E4 (Wertigkeit 1, 2, 4, 8) mit den Decoder-Eingaengen und die Segmentausgaenge mit der Anzeige. Pruefe 0, 5 und 9.',
    learn: 'Decoder + Anzeige = fertige Zahlenausgabe.', take: 'Die Wertigkeiten muessen stimmen: E1 → 1 (A), E2 → 2 (B), E3 → 4 (C), E4 → 8 (D).',
    hint: 'Erst die vier Eingaenge, dann die sieben Segmentleitungen.', hint2: 'IC1.a → AZ1.a … IC1.g → AZ1.g.',
    palette: ['dec7', 'seg7'], need: { dec7: 1, seg7: 1 }, start: inputs4, ref: full, bench: benchDisp(LG.bench(inputs4)),
    tests: digitTests(4, [0, 5, 9, 3])
  });

  function segTask(o) {
    var ref = LG.net(2, o.gates, { L1: o.gates.length ? o.gates[o.gates.length - 1][0] : o.src });
    defTask({
      id: o.id, ch: 10, title: o.title, tags: ['digital.7segment', 'digital.entwurf'], story: o.story,
      brief: o.brief + '<p class="limit">Erlaubt: hoechstens <b>' + o.limit + '</b> Gatter.</p>' + LG.table(2, o.f, { outs: [o.seg] }),
      learn: o.learn, take: o.take, hint: o.hint, hint2: o.hint2, palette: ['and', 'or', 'not'], limit: { gates: o.limit },
      start: LG.io(2), ref: ref, bench: LG.bench(ref), wrong: o.wrong ? [named(o.wrong[0], LG.net(2, o.wrong[1], { L1: o.wrong[2] }))] : [],
      tests: LG.truth(2, o.f)
    });
  }
  segTask({ id: '10.2', title: 'Segment a selbst gebaut', seg: 'a', f: function (b) { var k = b[0] + 2 * b[1]; return [0, 2, 3].indexOf(k) >= 0 ? 1 : 0; }, limit: 2,
    story: 'Ohne Decoder-IC: Die Logik fuer Segment a (oben) soll aus Gattern kommen – fuer die Ziffern 0 bis 3.',
    brief: 'Die Anzeige L1 steht fuer <b>Segment a</b>. Es leuchtet bei den Ziffern 0, 2 und 3, nicht bei 1.',
    learn: 'Jedes Segment ist eine eigene Logikfunktion.', take: 'a = E2 ∨ Ē1 – nur bei der 1 bleibt Segment a dunkel.',
    hint: 'Wann ist a = 0? Nur bei E2 = 0, E1 = 1.', hint2: 'U1 = ¬E1, U2 = E2 ∨ U1.',
    gates: [['U1', 'not', ['E1']], ['U2', 'or', ['E2', 'U1']]], wrong: ['nur E2', [], 'E2'] });
  segTask({ id: '10.3', title: 'Segment g', seg: 'g', f: function (b) { return b[1]; }, limit: 0, src: 'E2',
    story: 'Segment g (Mitte) fuer die Ziffern 0 bis 3.',
    brief: 'L1 steht fuer <b>Segment g</b>: Es leuchtet bei 2 und 3, nicht bei 0 und 1.',
    learn: 'Manche Segmente sind direkt ein Eingangsbit.', take: 'g = E2 – ganz ohne Gatter.',
    hint: 'Vergleiche die Spalte g mit den Eingangsspalten.', hint2: 'E2.out direkt an L1.', gates: [], wrong: ['E1 statt E2', [], 'E1'] });

  /* 10.4 zweistellig: E1…E4 Einer, E5…E8 Zehner */
  function two(wiredTens) {
    var l = { parts: [{ id: 'GND1', type: 'ground', x: 120, y: 600, rot: 0 }], wires: [] };
    for (var i = 1; i <= 8; i++) l.parts.push({ id: 'E' + i, type: 'logicin', x: 160, y: 60 * i + 40, rot: 0 });
    l.parts.push({ id: 'IC1', type: 'dec7', x: 640, y: 440, rot: 0 }, { id: 'AZ1', type: 'seg7', x: 840, y: 440, rot: 0 }, { id: 'IC2', type: 'dec7', x: 640, y: 160, rot: 0 }, { id: 'AZ2', type: 'seg7', x: 840, y: 160, rot: 0 });
    ['A', 'B', 'C', 'D'].forEach(function (k, i) { l.wires.push(W('E' + (i + 1) + '.out', 'IC1.' + k)); if (wiredTens) l.wires.push(W('E' + (i + 5) + '.out', 'IC2.' + k)); });
    l.wires = l.wires.concat(segWires('IC1', 'AZ1'));
    if (wiredTens) l.wires = l.wires.concat(segWires('IC2', 'AZ2'));
    return l;
  }
  var twoBench = { parts: [{ id: 'GND1', x: 340, y: 700, rot: 0 }, { id: 'IC1', x: 560, y: 560, rot: 0 }, { id: 'AZ1', x: 800, y: 560, rot: 0 }, { id: 'IC2', x: 560, y: 190, rot: 0 }, { id: 'AZ2', x: 800, y: 190, rot: 0 }] };
  for (var i = 1; i <= 8; i++) twoBench.parts.push({ id: 'E' + i, x: 190, y: 60 + 80 * i, rot: 0 });
  var tw = function (v) { var s = setBits(4, v % 10); var t = setBits(4, Math.floor(v / 10), 4); for (var k in t) s[k] = t[k]; return { name: 'Zahl ' + v, set: s, expect: [{ sel: 'AZ1', digit: v % 10 }, { sel: 'AZ2', digit: Math.floor(v / 10) }] }; };
  defTask({
    id: '10.4', ch: 10, title: 'Zwei Stellen', tags: ['digital.7segment', 'digital.bcd'],
    story: 'Der Zaehler soll bis 99 anzeigen. Die Einerstelle funktioniert, die Zehnerstelle ist noch tot.',
    brief: 'Verdrahte die <b>Zehnerstelle</b>: E5 … E8 (Wertigkeit 1, 2, 4, 8 der Zehner) an IC2, IC2 an AZ2. Pruefe 42 und 97.',
    learn: 'Mehrstellige BCD-Zahlen: jede Stelle eigener Decoder.', take: '42 in BCD: 0100 0010 – die Zehner 4, die Einer 2.',
    hint: 'Genau wie die Einerstelle, nur mit E5 … E8, IC2 und AZ2.', hint2: 'E5 → IC2.A, E6 → IC2.B, E7 → IC2.C, E8 → IC2.D; IC2.a…g → AZ2.a…g.',
    palette: [], start: two(false), ref: two(true), bench: twoBench,
    tests: [tw(42), tw(97), tw(10)]
  });

  /* 10.5 Halbaddierer auf der Anzeige */
  var ha = LG.net(2, [['U1', 'xor', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]], {});
  ha.parts = ha.parts.filter(function (p) { return p.type !== 'logicled'; });
  addDisplay(ha, true);
  ha.wires.push(W('U1.out', 'IC1.A'), W('U2.out', 'IC1.B'), W('IC1.C', 'GND1.g'), W('IC1.D', 'GND1.g'));
  var haStart = addDisplay(LG.io(2, []), true); haStart.wires.push(W('IC1.C', 'GND1.g'), W('IC1.D', 'GND1.g'));
  defTask({
    id: '10.5', ch: 10, title: 'Der Rechner zeigt an', tags: ['digital.addierer', 'digital.7segment'],
    story: 'Der Halbaddierer aus Kapitel 9 rechnet – aber niemand sieht das Ergebnis. Er soll auf die Anzeige.',
    brief: 'Baue einen <b>Halbaddierer</b> (E1 + E2) und fuehre Summe und Uebertrag als Dualzahl auf den Decoder: Summe → Wertigkeit 1 (A), Uebertrag → Wertigkeit 2 (B). Die Anzeige soll 0, 1 oder 2 zeigen.',
    learn: 'Rechenwerk + Codewandler + Anzeige: ein kleiner Taschenrechner.', take: 'Der Uebertrag hat die Wertigkeit 2 – 1 + 1 = 10₂ = 2.',
    hint: 'Die Eingaenge C und D des Decoders liegen schon an Masse (0).', hint2: 'U1 = E1 ⊕ E2 → IC1.A, U2 = E1·E2 → IC1.B.',
    palette: ['xor', 'and', 'or', 'not'], limit: { gates: 2 }, start: haStart, ref: ha, bench: benchDisp(LG.bench(ha)),
    tests: [[0, 0], [1, 0], [0, 1], [1, 1]].map(function (c) { return { name: c[1] + ' + ' + c[0], set: { E1: { closed: !!c[0] }, E2: { closed: !!c[1] } }, expect: [{ sel: 'AZ1', digit: c[0] + c[1] }, { noFault: true }] }; })
  });

  defTheory({
    id: 'T10B', ch: 10, title: 'Entwurf komplexer Schaltungen', tags: ['digital.entwurf', 'digital.komparator'],
    lesson:
      '<p>Grosse Aufgaben loest man <b>systematisch</b>:</p>' +
      '<ol><li><b>Aufgabe klaeren:</b> Welche Eingaenge (Sensoren, Taster), welche Ausgaenge (Lampen, Anzeigen)? Was bedeutet 1?</li>' +
      '<li><b>Wahrheitstabelle</b> fuer jeden Ausgang. Kombinationen, die nie vorkommen, als X markieren.</li>' +
      '<li><b>Vereinfachen</b> (Algebra oder KV-Diagramm), X-Felder nutzen.</li>' +
      '<li><b>Gemeinsame Teile</b> suchen: Ein Zwischensignal (z. B. „Code stimmt“) darf mehrere Ausgaenge speisen.</li>' +
      '<li><b>Aufbauen und alle Kombinationen pruefen</b> – erst dann ist die Schaltung fertig.</li></ol>' +
      '<p><b>Thermometer-Code:</b> Fuellstandssensoren sprechen von unten nach oben an – moeglich sind nur 000, 001, 011, 111. Alle anderen Kombinationen sind X.</p>' +
      '<p><b>2-Bit-Komparator</b> A > B: Erst die hoeheren Bits vergleichen; sind sie gleich, entscheiden die niedrigeren: X = a1·b̄1 ∨ (a1 ⊙ b1)·a0·b̄0.</p>',
    questions: [
      { q: 'Was macht man mit Kombinationen, die in der Anlage nie vorkommen?', options: ['Man laesst sie weg und prueft sie nicht', 'Man markiert sie als X und nutzt sie beim Vereinfachen', 'Man setzt sie immer auf 1', 'Man setzt sie immer auf 0'], correct: 1, explain: 'Don\'t-cares machen Paeckchen groesser.' },
      { q: 'Welche Kombination ist im Thermometer-Code (3 Sensoren, unten = E1) ungueltig?', options: ['001', '011', '101', '111'], correct: 2, explain: 'Der obere Sensor kann nicht ansprechen, solange der mittlere trocken ist.' },
      { q: 'A = 10₂, B = 01₂. Welche Stelle entscheidet den Vergleich?', options: ['Die hoehere (a1 = 1, b1 = 0)', 'Die niedrigere', 'Beide gleich', 'Keine'], correct: 0, explain: 'Die hoehere Stelle unterscheidet sich bereits – A > B.' },
      { q: 'Warum lohnt es sich, gemeinsame Teilschaltungen zu suchen?', options: ['Sie sparen Gatter und Fehlerquellen', 'Sie sind vorgeschrieben', 'Sie machen die Schaltung langsamer', 'Sie sind nur fuer NAND erlaubt'], correct: 0, explain: 'Ein Signal wie „Code stimmt“ kann mehrere Ausgaenge speisen.' },
      { q: 'Wann ist eine Schaltung fertig?', options: ['Wenn sie gezeichnet ist', 'Wenn alle Kombinationen geprueft sind', 'Wenn eine Kombination stimmt', 'Wenn sie wenig Gatter hat'], correct: 1, explain: 'Erst die vollstaendige Pruefung zeigt, dass jede Zeile stimmt.' }
    ]
  });

  /* 10.6 Wasserstand: Thermometer-Code → Anzahl auf Anzeige */
  var wl = LG.net(3, [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']]], {});
  wl.parts = wl.parts.filter(function (p) { return p.type !== 'logicled'; }); addDisplay(wl, true);
  wl.wires.push(W('U2.out', 'IC1.A'), W('E2.out', 'IC1.B'), W('IC1.C', 'GND1.g'), W('IC1.D', 'GND1.g'));
  var wlStart = addDisplay(LG.io(3, []), true); wlStart.wires.push(W('IC1.C', 'GND1.g'), W('IC1.D', 'GND1.g'));
  var thermo = [[0, 0], [1, 1], [3, 2], [7, 3]];
  defTask({
    id: '10.6', ch: 10, title: 'Der Wasserstandsmelder', tags: ['digital.entwurf', 'digital.dontcare', 'digital.7segment'],
    story: 'Drei Elektroden im Tank (E1 unten, E3 oben). Die Anzeige soll den Fuellstand 0 bis 3 zeigen.',
    brief: 'Moeglich sind nur 000, 001, 011, 111 (Thermometer-Code). Wandle sie in eine Dualzahl um und fuehre sie auf den Decoder (Wertigkeit 1 → A, 2 → B). Nutze die ungueltigen Kombinationen als X.',
    learn: 'Mit Don\'t-Cares wird der Codewandler winzig.', take: 'B2 = E2 und B1 = E1 ⊕ E2 ⊕ E3 – fuer die gueltigen Codes genau richtig.',
    hint: 'Bit 2 der Anzahl ist 1 bei den Staenden 2 und 3 – welche Elektrode ist dann immer nass?', hint2: 'E2 → IC1.B; U1 = E1 ⊕ E2, U2 = U1 ⊕ E3 → IC1.A.',
    palette: ['xor', 'and', 'or', 'not'], limit: { gates: 3 }, start: wlStart, ref: wl, bench: benchDisp(LG.bench(wl)),
    tests: thermo.map(function (t) { return { name: 'Stand ' + t[1], set: setBits(3, t[0]), expect: [{ sel: 'AZ1', digit: t[1] }, { noFault: true }] }; })
  });

  /* 10.7 Ampel */
  var ampel = LG.net(2, [['U1', 'not', ['E2']], ['U2', 'not', ['E1']], ['U3', 'and', ['E2', 'U2']]], { L1: 'U1', L2: 'E1', L3: 'U3' });
  var aStart = LG.io(2, ['L1', 'L2', 'L3']);
  [ampel, aStart].forEach(function (l) { l.parts.forEach(function (p) { if (p.id === 'L1') p.props = { color: 'rot' }; if (p.id === 'L2') p.props = { color: 'gelb' }; if (p.id === 'L3') p.props = { color: 'gruen' }; }); });
  var fA = function (b) { var k = b[0] + 2 * b[1]; return [k <= 1 ? 1 : 0, k === 1 || k === 3 ? 1 : 0, k === 2 ? 1 : 0]; };
  defTask({
    id: '10.7', ch: 10, title: 'Die Ampel', tags: ['digital.entwurf', 'digital.decoder'],
    story: 'Der Phasenzaehler der Baustellenampel liefert 0, 1, 2, 3. Die Lampen fehlen noch in der Logik.',
    brief: 'Phase 0: Rot · 1: Rot + Gelb · 2: Gruen · 3: Gelb. Baue die Logik fuer L1 (rot), L2 (gelb), L3 (gruen).' + LG.table(2, fA, { outs: ['Rot', 'Gelb', 'Gruen'] }) + '<p class="limit">Erlaubt: hoechstens <b>3</b> Gatter.</p>',
    learn: 'Mehrere Ausgaenge – jeder mit eigener, einfacher Funktion.', take: 'Rot = Ē2, Gelb = E1, Gruen = E2·Ē1.',
    hint: 'Schau jede Lampenspalte einzeln an. Gelb ist bei 1 und 3 an – welches Bit ist das?', hint2: 'U1 = ¬E2 → L1, E1 → L2, U2 = ¬E1, U3 = E2·U2 → L3.',
    palette: ['and', 'or', 'not'], limit: { gates: 3 }, start: aStart, ref: ampel, bench: LG.bench(ampel),
    tests: LG.truth(2, fA, { outs: ['L1', 'L2', 'L3'] })
  });

  /* 10.8 2-Bit-Komparator A > B: A = E2E1, B = E4E3 */
  var cmp = LG.net(4, [['U1', 'not', ['E4']], ['U2', 'and', ['E2', 'U1']], ['U3', 'xnor', ['E2', 'E4']], ['U4', 'not', ['E3']], ['U5', 'and', ['E1', 'U4']], ['U6', 'and', ['U3', 'U5']], ['U7', 'or', ['U2', 'U6']]], { L1: 'U7' });
  var fC = function (b) { return (b[0] + 2 * b[1]) > (b[2] + 2 * b[3]) ? 1 : 0; };
  defTask({
    id: '10.8', ch: 10, title: 'Welche Zahl ist groesser?', tags: ['digital.komparator', 'digital.entwurf'],
    story: 'Zwei Zaehler (A = E2E1, B = E4E3) laufen um die Wette. L1 soll leuchten, solange A vorne liegt.',
    brief: 'Baue einen <b>2-Bit-Komparator A > B</b>. Pruefe alle 16 Kombinationen.<p class="limit">Erlaubt: hoechstens <b>7</b> Gatter.</p>',
    learn: 'Vergleichen von der hoechsten Stelle her.', take: 'X = a1·b̄1 ∨ (a1 ⊙ b1)·a0·b̄0.',
    hint: 'Fall 1: a1 = 1 und b1 = 0. Fall 2: a1 = b1 und a0 = 1, b0 = 0.', hint2: 'U1 = ¬E4, U2 = E2·U1, U3 = XNOR(E2,E4), U4 = ¬E3, U5 = E1·U4, U6 = U3·U5, U7 = U2 ∨ U6.',
    palette: ['and', 'or', 'not', 'xnor', 'xor'], limit: { gates: 7 }, start: LG.io(4), ref: cmp, bench: LG.bench(cmp),
    wrong: [named('nur hoehere Stelle', LG.net(4, [['U1', 'not', ['E4']], ['U2', 'and', ['E2', 'U1']]], { L1: 'U2' }))],
    tests: LG.truth(4, fC)
  });

  /* 10.9 Fehlersuche Anzeige: f und b vertauscht */
  var faulty = addDisplay(LG.io(4, []), false); ['A', 'B', 'C', 'D'].forEach(function (k, i) { faulty.wires.push(W('E' + (i + 1) + '.out', 'IC1.' + k)); });
  var fixed = JSON.parse(JSON.stringify(faulty)); fixed.wires = fixed.wires.concat(segWires('IC1', 'AZ1'));
  faulty.wires = faulty.wires.concat(segWires('IC1', 'AZ1', { b: 'f', f: 'b' }));
  defTask({
    id: '10.9', ch: 10, title: 'Die Anzeige spinnt', tags: ['digital.7segment', 'elektro.fehlersuche'],
    story: 'Nach einer Reparatur zeigt die Anzeige bei 1 etwas Seltsames, bei 8 ist aber alles richtig. Der Kollege schwoert, er habe alles richtig angeschlossen.',
    brief: 'Finde den Verdrahtungsfehler zwischen Decoder und Anzeige und behebe ihn. Tipp: Probiere mehrere Ziffern und vergleiche, welches Segment falsch ist.',
    learn: 'Fehlersuche mit Testmustern: Welche Ziffern stimmen, welche nicht?', take: 'Bei 8 leuchten alle Segmente – vertauschte Leitungen fallen dort nicht auf. Die 1 (nur b und c) verraet den Fehler sofort.',
    hint: 'Zeig die 1: Welches Segment leuchtet statt b?', hint2: 'b und f sind vertauscht: IC1.b → AZ1.b, IC1.f → AZ1.f.',
    palette: [], start: faulty, ref: fixed, bench: benchDisp(LG.bench(faulty)),
    wrong: [named('noch vertauscht', faulty)], tests: digitTests(4, [1, 4, 7, 8, 2])
  });

  /* 10.10 BOSS: Codeschloss 1011 mit Pruefen-Taste E5 → L1 gruen (offen), L2 rot (Alarm) */
  var lock = LG.net(5, [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'E2']], ['U3', 'and', ['E4', 'U1']], ['U4', 'and', ['U2', 'U3']], ['U5', 'and', ['E5', 'U4']], ['U6', 'not', ['U4']], ['U7', 'and', ['E5', 'U6']]], { L1: 'U5', L2: 'U7' });
  var lockStart = LG.io(5, ['L1', 'L2']);
  [lock, lockStart].forEach(function (l) { l.parts.forEach(function (p) { if (p.id === 'L1') p.props = { color: 'gruen' }; if (p.id === 'L2') p.props = { color: 'rot' }; }); });
  var fL = function (b) { var code = b[0] + 2 * b[1] + 4 * b[2] + 8 * b[3] === 11; return b[4] ? [code ? 1 : 0, code ? 0 : 1] : [0, 0]; };
  defTask({
    id: '10.10', ch: 10, title: 'BOSS: Das Codeschloss', tags: ['digital.entwurf', 'digital.vergleicher', 'digital.boss'], boss: true,
    story: 'Der Labortresor bekommt ein neues Schloss. Die Werkmeisterin: „Das ist deine Gesellenpruefung fuer die Grundstufe. Ich will es sauber, klein und vollstaendig geprueft.“',
    brief: 'Der Code wird mit E4 E3 E2 E1 eingestellt, der geheime Code ist <b>1011</b>. Mit der Pruef-Taste E5 = 1 wird geprueft: Stimmt der Code, leuchtet <b>L1 (gruen, offen)</b>, sonst <b>L2 (rot, Alarm)</b>. Ohne Pruefen (E5 = 0) bleiben beide dunkel. Alle 32 Kombinationen werden geprueft.<p class="limit">Erlaubt: hoechstens <b>7</b> Gatter.</p>',
    learn: 'Ein Zwischensignal („Code stimmt“) speist zwei Ausgaenge.', take: 'M = E4·Ē3·E2·E1; offen = E5·M; Alarm = E5·M̄. Gemeinsame Teile sparen Gatter.',
    hint: 'Baue zuerst das Signal M „Code stimmt“ aus drei UND und einem Inverter.', hint2: 'U1 = ¬E3, U2 = E1·E2, U3 = E4·U1, U4 = U2·U3 (M), U5 = E5·U4 → L1, U6 = ¬U4, U7 = E5·U6 → L2.',
    palette: ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'], limit: { gates: 7 }, start: lockStart, ref: lock, bench: LG.bench(lock),
    wrong: [named('Alarm ohne Pruef-Taste', LG.net(5, [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'E2']], ['U3', 'and', ['E4', 'U1']], ['U4', 'and', ['U2', 'U3']], ['U5', 'and', ['E5', 'U4']], ['U6', 'not', ['U4']]], { L1: 'U5', L2: 'U6' }))],
    tests: LG.truth(5, fL, { outs: ['L1', 'L2'] })
  });
})();

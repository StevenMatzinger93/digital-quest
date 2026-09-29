/* Digital Quest – Symbole fuer die Kacheln der Laborkarte (window.DQTiles).
 * Jede Station bekommt ein Bild, das auf den Inhalt schliessen laesst:
 *  - Aufgaben: das praegende Bauteil als Schaltzeichen (das „neueste“ Bauteil der Musterloesung), bei Mess- und
 *    Fehlersuch-Aufgaben das Messgeraet bzw. die Lupe, bei Entwurfsaufgaben ohne eigenes Bauteil ein Piktogramm zum Thema.
 *  - Theorie: Piktogramm zum Thema (aus den Kompetenz-Tags), sonst das Bauteil, um das es danach geht.
 * Kein DOM: choose() liefert {kind:'part'|'pic', key}, html() das fertige <svg>. */
(function (root) {
  'use strict';
  var P = function (d, extra) { return '<svg class="pic" viewBox="0 0 64 48" aria-hidden="true">' + d + (extra || '') + '</svg>'; };
  var TXT = function (t, size, y) { return '<text x="32" y="' + (y || 31) + '" text-anchor="middle" class="pic-t" font-size="' + (size || 17) + '">' + t + '</text>'; };
  var BLK = function (label) { return P('<rect x="16" y="7" width="32" height="34" rx="3"/><path d="M6 16h10M6 32h10M48 24h10"/>' + TXT(label, label.length > 2 ? 11 : 15, 29)); };
  var PIC = {
    meter: P('<rect x="18" y="4" width="28" height="40" rx="4"/><rect x="22" y="8" width="20" height="10" rx="1.5" class="pic-f"/><circle cx="32" cy="29" r="6.5"/><path d="M32 29l3.5-5M24 40v4M40 40v4"/>'),
    scope: P('<rect x="6" y="6" width="52" height="36" rx="4"/><path d="M11 24c4-14 8-14 12 0s8 14 12 0 8-14 12 0" class="pic-a"/><path d="M10 24h44" class="pic-d"/>'),
    sine: P('<path d="M6 24h52M10 6v36" class="pic-d"/><path d="M10 24c5-18 11-18 16 0s11 18 16 0 8-14 12-6" class="pic-a"/>'),
    charge: P('<path d="M10 6v36h48" class="pic-d"/><path d="M10 42c6-22 16-30 46-32" class="pic-a"/><path d="M10 12h46" class="pic-d" stroke-dasharray="3 3"/>'),
    bode: P('<path d="M10 6v36h48" class="pic-d"/><path d="M10 14h22c8 0 12 8 24 26" class="pic-a"/><path d="M34 8v34" class="pic-d" stroke-dasharray="3 3"/>'),
    band: P('<path d="M10 6v36h48" class="pic-d"/><path d="M10 40c10 0 14-28 22-28s12 28 24 28" class="pic-a"/>'),
    bits: P(TXT('1011', 19, 31)),
    hex: P(TXT('0x2F', 17, 31)),
    table: P('<rect x="12" y="6" width="40" height="36" rx="2"/><path d="M12 16h40M12 24.7h40M12 33.4h40M25 6v36M38 6v36"/><circle cx="45" cy="29" r="2" class="pic-f"/><circle cx="45" cy="37.7" r="2" class="pic-f"/>'),
    kmap: P('<rect x="8" y="10" width="48" height="28" rx="2"/><path d="M20 10v28M32 10v28M44 10v28M8 24h48"/><rect x="21.5" y="12.5" width="21" height="9" rx="4.5" class="pic-a"/>'),
    formula: P(TXT('A∧B̅', 19, 31)),
    demorgan: P('<path d="M14 9h36" class="pic-a"/>' + TXT('A∨B', 19, 33)),
    search: P('<circle cx="27" cy="21" r="13"/><path d="M37 31l14 12"/><path d="M19 21h4l2-5 4 10 2-5h4" class="pic-a"/>'),
    book: P('<path d="M32 12c-6-4-14-5-22-4v30c8-1 16 0 22 4 6-4 14-5 22-4V8c-8-1-16 0-22 4zM32 12v30"/>'),
    safety: P('<path d="M32 5l20 7v12c0 10-8 17-20 20-12-3-20-10-20-20V12z"/><path d="M23 24l6 6 12-13" class="pic-a"/>'),
    ohm: P(TXT('U = R·I', 15, 30)),
    node: P('<path d="M6 24h22M28 24l24-14M28 24l24 14"/><circle cx="28" cy="24" r="3.5" class="pic-f"/><path d="M12 20l5 4-5 4M42 12l5 0-2 5M42 36l5 0-2-5" class="pic-a"/>'),
    divider: P('<path d="M32 3v6M32 21v6M32 39v6M32 24h22"/><rect x="26" y="9" width="12" height="12" rx="1"/><rect x="26" y="27" width="12" height="12" rx="1"/><circle cx="32" cy="24" r="2" class="pic-f"/>'),
    power: P('<path d="M36 4L18 27h12l-3 17 19-24H33z" class="pic-a"/>'),
    rectify: P('<path d="M6 30h52" class="pic-d"/><path d="M8 30c3-20 9-20 12 0 3-20 9-20 12 0 3-20 9-20 12 0 3-20 9-20 12 0" class="pic-a"/>'),
    rms: P(TXT('TRMS', 15, 30)),
    range: P('<path d="M10 38a22 22 0 0 1 44 0"/><path d="M32 38L44 20" class="pic-a"/><path d="M14 27l3 2M24 18l2 3M40 18l-2 3M50 27l-3 2"/>'),
    tol: P(TXT('± 1 %', 17, 31)),
    edge: P('<path d="M8 36h18V12h30"/><path d="M21 27l5-7 5 7" class="pic-a"/>'),
    store: P('<rect x="16" y="7" width="32" height="34" rx="3"/>' + TXT('1 Bit', 12, 28) + '<path d="M6 16h10M6 32h10M48 16h10M48 32h10"/>'),
    ramp: P('<path d="M10 6v36h48" class="pic-d"/><path d="M10 40h8l18-26h20" class="pic-a"/>'),
    estop: P('<circle cx="32" cy="24" r="18"/><circle cx="32" cy="24" r="10" class="pic-a"/><path d="M32 17v8" class="pic-a"/>'),
    latch: P('<path d="M8 12h14M42 12h14M8 36h48"/><path d="M22 12l18-7" class="pic-a"/><path d="M30 20v16M26 28h8" />'),
    station: P('<rect x="6" y="30" width="52" height="8" rx="2"/><circle cx="14" cy="34" r="2" class="pic-f"/><circle cx="50" cy="34" r="2" class="pic-f"/><rect x="24" y="14" width="16" height="16" rx="2" class="pic-a"/><path d="M8 42v3M56 42v3"/>'),
    wave: P('<path d="M4 24h12l5-14 9 28 6-14h24" class="pic-a"/>')
  };
  ['MUX', 'DMX', 'A=B', 'Σ', 'DEC', 'CTR', 'SRG', 'PAR', 'Gray'].forEach(function (k) { PIC['blk:' + k] = BLK(k); });

  /* Kompetenz-Tag → Piktogramm (erste passende Zeile gewinnt) */
  var TAGPIC = [
    [/^messen\.oszilloskop/, 'scope'], [/^messen\.(trms|wechselspannung)/, 'rms'], [/^messen\.(messbereich|geraete|grundbegriffe)/, 'range'], [/^messen\.(genauigkeit|systemfehler)/, 'tol'],
    [/^messen\.sicherheit/, 'safety'], [/^messen\./, 'meter'], [/fehlersuche/, 'search'],
    [/^digital\.(hex)/, 'hex'], [/^digital\.gray/, 'blk:Gray'], [/^digital\.paritaet/, 'blk:PAR'], [/^digital\.(zahlensysteme|binaer|bcd|codes)/, 'bits'],
    [/^digital\.(kv|dontcare)/, 'kmap'], [/^digital\.(wahrheitstabelle|dnf|knf|entwurf)/, 'table'], [/^digital\.demorgan/, 'demorgan'], [/^digital\.(boolesche_algebra|vereinfachen|normiert)/, 'formula'],
    [/^digital\.demultiplexer/, 'blk:DMX'], [/^digital\.multiplexer/, 'blk:MUX'], [/^digital\.(komparator|vergleicher)/, 'blk:A=B'], [/^digital\.addierer/, 'blk:Σ'], [/^digital\.decoder/, 'blk:DEC'],
    [/^digital\.schieberegister/, 'blk:SRG'], [/^digital\.(zaehler|synchron)/, 'blk:CTR'], [/^digital\.(flanke|steuerungsart)/, 'edge'], [/^digital\.speicher/, 'store'],
    [/^elektro\.(bandpass)/, 'band'], [/^elektro\.(filter|frequenzgang|grenzfrequenz|db|ordnung)/, 'bode'], [/^elektro\.(zeitkonstante|rc|rcglied|integrierglied|differenzierglied)/, 'charge'],
    [/^elektro\.(gleichrichter|gleichrichtwert)/, 'rectify'], [/^elektro\.(effektivwert)/, 'rms'], [/^elektro\.(wechselgroessen|frequenz|mittelwert)/, 'sine'],
    [/^elektro\.(ohm|grundgroessen|dimensionieren)/, 'ohm'], [/^elektro\.(kirchhoff|parallelschaltung)/, 'node'], [/^elektro\.(spannungsteiler|reihenschaltung)/, 'divider'], [/^elektro\.leistung/, 'power'],
    [/^antrieb\.rampe/, 'ramp'], [/^sicherheit\.nothalt/, 'estop'], [/^steuerung\.selbsthaltung/, 'latch'], [/^antrieb\.(station|boss)/, 'station']
  ];
  /* Kompetenz-Tag → Bauteil */
  var TAGPART = { 'digital.und': 'and', 'digital.oder': 'or', 'digital.nicht': 'not', 'digital.nand': 'nand', 'digital.nor': 'nor', 'digital.xor': 'xor', 'digital.xnor': 'xnor', 'digital.gatter': 'and',
    'bauteil.led': 'led', 'bauteil.diode': 'diode', 'bauteil.zdiode': 'zener', 'bauteil.transistor': 'npn', 'bauteil.lampe': 'lamp', 'elektro.kondensator': 'capacitor', 'digital.flipflop': 'dff',
    'digital.7segment': 'seg7', 'antrieb.motor': 'motor', 'antrieb.treiber': 'npn', 'antrieb.drehzahl': 'motor', 'digital.takt': 'clock', 'elektro.schalter': 'switch', 'elektro.stromkreis': 'lamp', 'elektro.quelle': 'battery',
    'digital.pegel': 'logicin', 'elektro.stabilisierung': 'zener', 'elektro.schalten': 'npn', 'elektro.verstaerker': 'npn' };
  /* Alltagsbauteile praegen eine Aufgabe nur, wenn sonst nichts Besonderes darin vorkommt */
  var PLAIN = { battery: 1, ground: 1, switch: 1, resistor: 1, lamp: 1, logicin: 1, logicled: 1, ammeter: 1, acsource: 1 };
  var FIRST_TAG_WINS = /^messen\.|fehlersuche|^sicherheit\.|^steuerung\.|^antrieb\.(rampe|station|boss)|^digital\.(kv|dontcare|demorgan|multiplexer|demultiplexer|komparator|addierer|paritaet|gray|schieberegister|zaehler)|^elektro\.(filter|frequenzgang|bandpass|grenzfrequenz|zeitkonstante|gleichrichter|effektivwert|kirchhoff|spannungsteiler|leistung)/;

  function picOf(tag) { for (var i = 0; i < TAGPIC.length; i++) if (TAGPIC[i][0].test(tag)) return TAGPIC[i][1]; return null; }
  function create(DQ, E) {
    var order = {}, n = 0;
    DQ.tasks.forEach(function (t) { ((t.ref && t.ref.parts) || []).forEach(function (p) { if (!(p.type in order)) order[p.type] = n++; }); });
    function keyPart(t) { // das zuletzt eingefuehrte Bauteil der Musterloesung; Alltagsbauteile nur als Rueckfall
      var best = null, plain = null;
      ((t.ref && t.ref.parts) || []).forEach(function (p) {
        if (p.type === 'ground' || !E.PARTS[p.type]) return;
        if (PLAIN[p.type]) { if (!plain || order[p.type] > order[plain]) plain = p.type; }
        else if (!best || order[p.type] > order[best]) best = p.type;
      });
      return { best: best, plain: plain };
    }
    function byTags(tags, partsToo) {
      for (var i = 0; i < tags.length; i++) {
        var pic = picOf(tags[i]); if (pic) return { kind: 'pic', key: pic };
        if (partsToo && TAGPART[tags[i]] && E.PARTS[TAGPART[tags[i]]]) return { kind: 'part', key: TAGPART[tags[i]] };
      }
      return null;
    }
    function choose(it) {
      var tags = it.tags || [], r;
      if (it.kind === 'theory') return byTags(tags, true) || { kind: 'pic', key: 'book' };
      if (tags[0] && FIRST_TAG_WINS.test(tags[0]) && (r = byTags([tags[0]]))) return r;
      if (tags[0] && tags[0] !== 'digital.flipflop' && TAGPART[tags[0]] && E.PARTS[TAGPART[tags[0]]]) return { kind: 'part', key: TAGPART[tags[0]] };
      var k = keyPart(it);
      if (k.best) return { kind: 'part', key: k.best };
      return byTags(tags, true) || (k.plain ? { kind: 'part', key: k.plain } : { kind: 'pic', key: 'wave' });
    }
    function html(it, Editor) {
      var c = choose(it);
      if (c.kind === 'part' && Editor) return Editor.icon(c.key, c.key === 'led' ? { color: 'rot' } : {});
      return PIC[c.key] || PIC.wave;
    }
    /* Kapitelbild: das haeufigste Kachel-Symbol des Kapitels */
    function chapter(c, Editor) {
      var cnt = {}, best = null;
      c.sequence.forEach(function (id) { var it = DQ.byId[id], x = choose(it), k = x.kind + ':' + x.key; cnt[k] = (cnt[k] || 0) + (it.kind === 'theory' ? 1.5 : 1); if (!best || cnt[k] > cnt[best]) best = k; });
      var kind = best.slice(0, best.indexOf(':')), key = best.slice(best.indexOf(':') + 1);
      return kind === 'part' && Editor ? Editor.icon(key, {}) : PIC[key] || PIC.wave;
    }
    return { choose: choose, html: html, chapter: chapter };
  }
  root.DQTiles = { create: create, PIC: PIC };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DQTiles;
})(typeof window !== 'undefined' ? window : globalThis);

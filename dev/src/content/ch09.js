/* Kapitel 9 – Stationaere Vorgaenge I: Codes, Kontrollinstanzen, Datenwege, Rechenwerke
 * Quelle: Digitaltechnik stationaere Vorgaenge Kap. 7 (Code und Codewandler: BCD, 3-Exzess, Gray), Kap. 8 (Paritaetsbit:
 * Ersteller PE, Auswerter PA), Kap. 9 (Multiplexer, Demultiplexer, Komparator, Halb- und Volladdierer). */
(function () {
  'use strict';
  defChapter({
    id: 9, title: 'Codes, Datenwege und Rechenwerke',
    intro: 'Paritaetsbits entdecken Uebertragungsfehler, Multiplexer waehlen Daten aus, Addierer rechnen. Du baust die Grundbausteine jedes Computers aus Gattern.',
    sequence: ['T9A', '9.1', '9.2', '9.3', '9.4', '9.5', 'T9B', '9.6', '9.7', '9.8', '9.9', '9.10']
  });
  var named = function (name, l) { l.name = name; return l; };
  /* o.outs = { L1: 'U2', L2: 'U3' }, o.f(bits) → [a1, a2 …] */
  function task(o) {
    var outs = o.outs || { L1: o.gates[o.gates.length - 1][0] }, L = Object.keys(outs);
    var ref = LG.net(o.n, o.gates, outs), names = o.names || L;
    defTask({
      id: o.id, ch: 9, title: o.title, tags: o.tags, story: o.story,
      brief: o.brief + (o.limit ? '<p class="limit">Erlaubt: hoechstens <b>' + o.limit.gates + '</b> Gatter.</p>' : '') + LG.table(o.n, o.f, { outs: names, dc: o.dc }) +
        (L.length > 1 ? '<p class="dim small">Ausgaenge: ' + L.map(function (l, i) { return l + ' = ' + names[i]; }).join(', ') + '</p>' : ''),
      learn: o.learn, take: o.take, hint: o.hint, hint2: o.hint2, boss: o.boss,
      palette: o.palette || ['and', 'or', 'not', 'xor'], need: {}, limit: o.limit,
      start: LG.io(o.n, L), ref: ref, bench: LG.bench(ref),
      wrong: (o.wrong || []).map(function (w) { return named(w[0], LG.net(o.n, w[1], w[2] || outs)); }),
      tests: LG.truth(o.n, o.f, { outs: L, dc: o.dc })
    });
  }

  defTheory({
    id: 'T9A', ch: 9, title: 'Codes und Paritaet', tags: ['digital.codes', 'digital.paritaet'],
    merksatz: 'Codes ordnen Zahlen Bitmuster zu: BCD je Ziffer, 3-Exzess = BCD + 3, Gray aendert pro Schritt genau ein Bit (Drehgeber); ein Paritaetsbit macht die Zahl der Einsen gerade oder ungerade.',
    visual: { type: 'numberSteps', mode: 'gray', bits: 3, parity: true, caption: 'Zaehle mit ▶ oder „Abspielen“ von 0 bis 7 und zurueck auf 0: Binaer kippen oft mehrere Bits gleichzeitig (3 → 4: alle drei), im Gray-Code immer genau eines. Die XOR-Kette ueber die Gray-Bits ergibt das Paritaetsbit – es wechselt bei jedem Schritt.' },
    lesson:
      '<p>Ein <b>Code</b> ordnet Zeichen oder Zahlen Bitmuster zu. <b>BCD</b> codiert jede Dezimalziffer mit 4 Bit. Der <b>3-Exzess-Code</b> ist BCD + 3 (0 → 0011) – praktisch fuer Rechenwerke, weil das Neunerkomplement einfach durch Invertieren entsteht. Beim <b>Gray-Code</b> aendert sich von einer Zahl zur naechsten <b>genau ein Bit</b> – wichtig fuer Drehgeber, damit beim Uebergang keine falschen Zwischenwerte entstehen.</p>' +
      '<p><b>Binaer → Gray:</b> G<sub>n</sub> = B<sub>n</sub> (hoechstes Bit bleibt), jedes weitere G<sub>i</sub> = B<sub>i+1</sub> ⊕ B<sub>i</sub>. <b>Gray → binaer:</b> B<sub>n</sub> = G<sub>n</sub>, dann B<sub>i</sub> = B<sub>i+1</sub> ⊕ G<sub>i</sub>.</p>' +
      '<p>Ein <b>Codewandler</b> wird wie jede Schaltung entworfen: Tabelle Eingangscode → Ausgangscode, fuer jedes Ausgangsbit vereinfachen.</p>' +
      '<p><b>Paritaet:</b> Ein zusaetzliches Bit macht die Anzahl Einsen gerade (gerade Paritaet). Der <b>Paritaetsbitersteller</b> (PE) beim Sender ist eine XOR-Kette ueber alle Datenbits. Der <b>Paritaetspruefer</b> (PA) beim Empfaenger rechnet das XOR ueber Daten und Paritaetsbit: Ergebnis 1 = Fehler. Ein einzelnes gekipptes Bit wird immer erkannt, zwei gleichzeitig nicht.</p>',
    questions: [
      { q: 'Was ist das Besondere am Gray-Code?', options: ['Er braucht weniger Bits', 'Benachbarte Zahlen unterscheiden sich in genau einem Bit', 'Er ist BCD + 3', 'Er hat ein Paritaetsbit'], correct: 1, explain: 'Beim Uebergang kippt nur ein Bit – keine falschen Zwischenwerte.' },
      { q: 'Wie lautet 5 im 3-Exzess-Code?', options: ['0101', '1000', '0110', '1010'], correct: 1, explain: '5 + 3 = 8 = 1000.' },
      { q: 'Datenbits 1011, gerade Paritaet. Welches Paritaetsbit?', options: ['0', '1'], correct: 1, explain: 'Drei Einsen – das Paritaetsbit 1 macht die Anzahl gerade.' },
      { q: 'Mit welchem Gatter baut man einen Paritaetsbitersteller?', options: ['UND', 'ODER', 'XOR', 'NAND'], correct: 2, explain: 'XOR ist 1 bei ungerader Anzahl Einsen.' },
      { q: 'Zwei Bits kippen bei der Uebertragung. Erkennt die Paritaetspruefung den Fehler?', options: ['Ja, immer', 'Nein – die Paritaet stimmt wieder', 'Nur beim ersten Bit', 'Nur bei Gray-Code'], correct: 1, explain: 'Zwei Fehler heben sich in der Paritaet auf.' }
    ]
  });

  task({ id: '9.1', n: 3, title: 'Paritaetsbitersteller', tags: ['digital.paritaet', 'digital.xor'], f: function (b) { return b[0] ^ b[1] ^ b[2]; },
    story: 'Drei Datenbits gehen seriell ueber ein langes Kabel. Der Sender haengt ein Paritaetsbit an.',
    brief: 'Baue den <b>Paritaetsbitersteller</b> fuer gerade Paritaet: L1 = P soll die Anzahl Einsen (E1, E2, E3 und P zusammen) gerade machen.', limit: { gates: 2 },
    learn: 'P = e1 ⊕ e2 ⊕ e3 – die XOR-Kette.', take: 'XOR zaehlt modulo 2: 1 bei ungerader Anzahl Einsen.',
    hint: 'Zwei XOR hintereinander.', hint2: 'U1 = E1 ⊕ E2, U2 = U1 ⊕ E3.', names: ['P'],
    gates: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']]], wrong: [['nur E1 ⊕ E2', [['U1', 'xor', ['E1', 'E2']]]]] });
  task({ id: '9.2', n: 4, title: 'Paritaetspruefer', tags: ['digital.paritaet', 'digital.xor'], f: function (b) { return b[0] ^ b[1] ^ b[2] ^ b[3]; },
    story: 'Beim Empfaenger kommen drei Datenbits (E1…E3) und das Paritaetsbit (E4) an.',
    brief: 'Baue den <b>Paritaetspruefer</b>: L1 = Fehler leuchtet, wenn die Anzahl Einsen ungerade ist.', limit: { gates: 3 },
    learn: 'Pruefen = XOR ueber alle Bits inklusive Paritaetsbit.', take: 'Ergebnis 1 heisst: ein Bit (oder drei) ist gekippt.',
    hint: 'Drei XOR fuer vier Bits.', hint2: 'U1 = E1 ⊕ E2, U2 = E3 ⊕ E4, U3 = U1 ⊕ U2.', names: ['F'],
    gates: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['E3', 'E4']], ['U3', 'xor', ['U1', 'U2']]] });
  task({ id: '9.3', n: 3, title: 'Binaer nach Gray', tags: ['digital.codes', 'digital.gray'], f: function (b) { return [b[1] ^ b[0], b[2] ^ b[1], b[2]]; },
    outs: { L1: 'U1', L2: 'U2', L3: 'E3' }, names: ['G1', 'G2', 'G3'],
    story: 'Ein Drehgeber soll im Gray-Code ausgeben. Die Zaehlerlogik liefert binaer (E3 = MSB).',
    brief: 'Baue den <b>Codewandler binaer → Gray</b> fuer 3 Bit.', limit: { gates: 2 },
    learn: 'G3 = B3, G2 = B3 ⊕ B2, G1 = B2 ⊕ B1.', take: 'Nachbarbits verXORen – das hoechste Bit bleibt.',
    hint: 'Das MSB geht direkt durch.', hint2: 'U1 = E2 ⊕ E1 → L1, U2 = E3 ⊕ E2 → L2, E3 → L3.',
    gates: [['U1', 'xor', ['E2', 'E1']], ['U2', 'xor', ['E3', 'E2']]] });
  task({ id: '9.4', n: 3, title: 'Gray nach binaer', tags: ['digital.codes', 'digital.gray'], f: function (b) { var b3 = b[2], b2 = b3 ^ b[1], b1 = b2 ^ b[0]; return [b1, b2, b3]; },
    outs: { L1: 'U2', L2: 'U1', L3: 'E3' }, names: ['B1', 'B2', 'B3'],
    story: 'Der Drehgeber liefert Gray-Code (E3 = G3). Die Steuerung rechnet binaer.',
    brief: 'Baue den <b>Codewandler Gray → binaer</b>.', limit: { gates: 2 },
    learn: 'B3 = G3, B2 = B3 ⊕ G2, B1 = B2 ⊕ G1 – die Kette laeuft von oben nach unten.', take: 'Jedes Binaerbit haengt vom naechsthoeheren Binaerbit ab.',
    hint: 'Zuerst B2 aus E3 und E2, dann B1 aus B2 und E1.', hint2: 'U1 = E3 ⊕ E2 → L2, U2 = U1 ⊕ E1 → L1, E3 → L3.',
    gates: [['U1', 'xor', ['E3', 'E2']], ['U2', 'xor', ['U1', 'E1']]] });
  task({ id: '9.5', n: 2, title: '1-aus-4-Decoder', tags: ['digital.decoder', 'digital.entwurf'], f: function (b) { var k = b[0] + 2 * b[1]; return [k === 0, k === 1, k === 2, k === 3].map(Number); },
    outs: { L1: 'U3', L2: 'U4', L3: 'U5', L4: 'U6' }, names: ['Y0', 'Y1', 'Y2', 'Y3'],
    story: 'Vier Maschinen, eine 2-Bit-Adresse: Nur die adressierte Maschine darf den Freigabe-Pegel bekommen.',
    brief: 'Baue einen <b>Decoder 1 aus 4</b>: Fuer jede Adresse E2E1 leuchtet genau eine Anzeige (Y0 bei 00 … Y3 bei 11).', limit: { gates: 6 },
    learn: 'Jeder Ausgang eines Decoders ist ein Minterm.', take: 'Y0 = Ē2·Ē1, Y1 = Ē2·E1, Y2 = E2·Ē1, Y3 = E2·E1.',
    hint: 'Zwei Inverter, vier UND.', hint2: 'U1 = ¬E1, U2 = ¬E2, U3 = U2·U1, U4 = U2·E1, U5 = E2·U1, U6 = E2·E1.', palette: ['and', 'not'],
    gates: [['U1', 'not', ['E1']], ['U2', 'not', ['E2']], ['U3', 'and', ['U2', 'U1']], ['U4', 'and', ['U2', 'E1']], ['U5', 'and', ['E2', 'U1']], ['U6', 'and', ['E2', 'E1']]] });

  defTheory({
    id: 'T9B', ch: 9, title: 'Multiplexer, Komparator, Addierer', tags: ['digital.multiplexer', 'digital.komparator', 'digital.addierer'],
    merksatz: 'Ein Multiplexer waehlt per Steuereingang einen von 2ⁿ Eingaengen, der Komparator vergleicht zwei Zahlen, Halb- und Volladdierer bilden aus XOR und UND das Rechenwerk (S = a ⊕ b, C = a·b).',
    visual: { type: 'circuit', toggleView: false, caption: 'Volladdierer: E1 und E2 sind die Bits der beiden Zahlen, E3 der Uebertrag von der Stelle davor. L1 = Summe, L2 = Uebertrag zur naechsten Stelle – bei 1 + 1 + 1 leuchten beide.',
      layout: LG.net(3, [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']], ['U4', 'and', ['U1', 'E3']], ['U5', 'or', ['U3', 'U4']]], { L1: 'U2', L2: 'U5' }) },
    lesson:
      '<p>Ein <b>Multiplexer</b> (Datenselektor) schaltet einen von mehreren Dateneingaengen auf den Ausgang – welcher, bestimmen die Steuereingaenge S. 2:1-MUX: A = d0·S̄ ∨ d1·S. Mit n Steuerleitungen waehlt man aus 2ⁿ Eingaengen. Der <b>Demultiplexer</b> verteilt umgekehrt einen Eingang auf einen von mehreren Ausgaengen.</p>' +
      '<p>Ein <b>Komparator</b> vergleicht zwei Zahlen: X (e1 > e2) = e1·ē2, Y (e1 = e2) = e1 ⊙ e2 (XNOR), Z (e1 < e2) = ē1·e2.</p>' +
      '<p><b>Halbaddierer:</b> addiert zwei Bits. Summe S = a ⊕ b, Uebertrag C = a·b. <b>Volladdierer:</b> addiert zusaetzlich den Uebertrag c<sub>in</sub> der vorherigen Stelle: S = a ⊕ b ⊕ c<sub>in</sub>, C<sub>out</sub> = a·b ∨ c<sub>in</sub>·(a ⊕ b). Mehrere Volladdierer hintereinander ergeben ein Rechenwerk fuer mehrstellige Dualzahlen.</p>',
    questions: [
      { q: 'Wie viele Dateneingaenge kann ein Multiplexer mit 3 Steuerleitungen auswaehlen?', options: ['3', '6', '8', '9'], correct: 2, explain: '2³ = 8.' },
      { q: 'Was liefert ein Halbaddierer bei a = 1, b = 1?', options: ['S = 1, C = 0', 'S = 0, C = 1', 'S = 1, C = 1', 'S = 0, C = 0'], correct: 1, explain: '1 + 1 = 10₂: Summe 0, Uebertrag 1.' },
      { q: 'Welches Gatter liefert die Summe eines Halbaddierers?', options: ['UND', 'ODER', 'XOR', 'NOR'], correct: 2, explain: 'S = a ⊕ b.' },
      { q: 'Was unterscheidet den Volladdierer vom Halbaddierer?', options: ['Er hat einen Uebertragseingang', 'Er kann subtrahieren', 'Er hat keinen Uebertrag', 'Er arbeitet mit Gray-Code'], correct: 0, explain: 'Der Volladdierer addiert drei Bits: a, b und den Uebertrag der vorherigen Stelle.' },
      { q: 'Wie lautet beim Komparator der Ausgang „e1 gleich e2“?', options: ['e1·e2', 'e1 ⊕ e2', 'e1 ⊙ e2 (XNOR)', 'e1 ∨ e2'], correct: 2, explain: 'Gleichheit = Aequivalenz.' }
    ]
  });

  task({ id: '9.6', n: 3, title: 'Der 2:1-Multiplexer', tags: ['digital.multiplexer', 'digital.entwurf'], f: function (b) { return b[2] ? b[1] : b[0]; }, names: ['A'],
    story: 'Die Anzeige soll wahlweise Sensor 1 (E1) oder Sensor 2 (E2) zeigen – umgeschaltet mit E3.',
    brief: 'Baue einen <b>2:1-Multiplexer</b>: Bei E3 = 0 folgt L1 dem Eingang E1, bei E3 = 1 dem Eingang E2.', limit: { gates: 4 },
    learn: 'A = d0·S̄ ∨ d1·S.', take: 'Das Steuersignal oeffnet genau einen der beiden UND-Wege.',
    hint: 'Ein UND fuer jeden Datenweg, eines davon mit invertiertem S.', hint2: 'U1 = ¬E3, U2 = E1·U1, U3 = E2·E3, U4 = U2 ∨ U3.', palette: ['and', 'or', 'not'],
    gates: [['U1', 'not', ['E3']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]],
    wrong: [['S nicht invertiert', [['U2', 'and', ['E1', 'E3']], ['U3', 'and', ['E2', 'E3']], ['U4', 'or', ['U2', 'U3']]]]] });
  task({ id: '9.7', n: 2, title: 'Der Demultiplexer', tags: ['digital.demultiplexer', 'digital.entwurf'], f: function (b) { return [b[0] & (1 - b[1]), b[0] & b[1]]; },
    outs: { L1: 'U2', L2: 'U3' }, names: ['A1', 'A2'],
    story: 'Ein Taktsignal (E1) soll wahlweise an Maschine 1 oder Maschine 2 gehen – gewaehlt mit E2.',
    brief: 'Baue einen <b>1:2-Demultiplexer</b>: E1 erscheint bei E2 = 0 an L1, bei E2 = 1 an L2.', limit: { gates: 3 },
    learn: 'Der Demultiplexer verteilt einen Eingang.', take: 'A1 = e·S̄, A2 = e·S.',
    hint: 'Zwei UND, eines mit invertierter Auswahl.', hint2: 'U1 = ¬E2, U2 = E1·U1, U3 = E1·E2.', palette: ['and', 'not'],
    gates: [['U1', 'not', ['E2']], ['U2', 'and', ['E1', 'U1']], ['U3', 'and', ['E1', 'E2']]] });
  task({ id: '9.8', n: 2, title: 'Der Komparator', tags: ['digital.komparator', 'digital.xnor'], f: function (b) { return [b[0] & (1 - b[1]), b[0] === b[1] ? 1 : 0, (1 - b[0]) & b[1]]; },
    outs: { L1: 'U3', L2: 'U5', L3: 'U4' }, names: ['X (e1>e2)', 'Y (e1=e2)', 'Z (e1<e2)'],
    story: 'Zwei Zaehlerbits sollen verglichen werden: groesser, gleich oder kleiner?',
    brief: 'Baue den <b>1-Bit-Komparator</b> mit drei Anzeigen: L1 bei E1 > E2, L2 bei E1 = E2, L3 bei E1 < E2.', limit: { gates: 5 },
    learn: 'X = e1·ē2, Y = e1 ⊙ e2, Z = ē1·e2.', take: 'Genau eine der drei Anzeigen leuchtet immer.',
    hint: 'Zwei Inverter, zwei UND, ein XNOR.', hint2: 'U1 = ¬E1, U2 = ¬E2, U3 = E1·U2, U4 = U1·E2, U5 = XNOR(E1, E2).', palette: ['and', 'not', 'xnor'],
    gates: [['U1', 'not', ['E1']], ['U2', 'not', ['E2']], ['U3', 'and', ['E1', 'U2']], ['U4', 'and', ['U1', 'E2']], ['U5', 'xnor', ['E1', 'E2']]] });
  task({ id: '9.9', n: 2, title: 'Der Halbaddierer', tags: ['digital.addierer', 'digital.xor'], f: function (b) { return [b[0] ^ b[1], b[0] & b[1]]; },
    outs: { L1: 'U1', L2: 'U2' }, names: ['S', 'C'],
    story: 'Die kleinste Rechenmaschine der Welt: 1 + 1.',
    brief: 'Baue den <b>Halbaddierer</b>: L1 = Summe S, L2 = Uebertrag C.', limit: { gates: 2 },
    learn: 'S = a ⊕ b, C = a·b.', take: '1 + 1 = 10₂ – die Summe ist 0, der Uebertrag 1.',
    hint: 'Ein XOR, ein UND.', hint2: 'U1 = E1 ⊕ E2 → L1, U2 = E1·E2 → L2.', palette: ['and', 'xor', 'or'],
    gates: [['U1', 'xor', ['E1', 'E2']], ['U2', 'and', ['E1', 'E2']]] });
  task({ id: '9.10', n: 3, title: 'Der Volladdierer', tags: ['digital.addierer', 'digital.xor'], f: function (b) { var s = b[0] + b[1] + b[2]; return [s & 1, s >> 1]; },
    outs: { L1: 'U2', L2: 'U5' }, names: ['S', 'Cout'],
    story: 'Mehrstellig rechnen: Jede Stelle bekommt den Uebertrag der vorherigen (E3 = Cin).',
    brief: 'Baue den <b>Volladdierer</b>: E1 + E2 + E3 → L1 = Summe, L2 = Uebertrag.', limit: { gates: 5 },
    learn: 'Zwei Halbaddierer und ein ODER ergeben einen Volladdierer.', take: 'S = a ⊕ b ⊕ c, Cout = a·b ∨ c·(a ⊕ b).',
    hint: 'Erst a ⊕ b, dann mit Cin weiter.', hint2: 'U1 = E1⊕E2, U2 = U1⊕E3, U3 = E1·E2, U4 = U1·E3, U5 = U3 ∨ U4.', palette: ['and', 'xor', 'or'],
    gates: [['U1', 'xor', ['E1', 'E2']], ['U2', 'xor', ['U1', 'E3']], ['U3', 'and', ['E1', 'E2']], ['U4', 'and', ['U1', 'E3']], ['U5', 'or', ['U3', 'U4']]] });
})();

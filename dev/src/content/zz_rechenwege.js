/* Digital Quest – Rechenwege für die Lösungsansicht und das Aufdecken einzelner Messwerte (Feedback 01.10.2026, Phase 3).
 * Pflicht (Validator-Warnung) für Kapitel 16 (jeder Messwert) und für jeden Rechenwert (measure.value) der übrigen Kapitel;
 * alle anderen Messwerte bekommen in der App einen automatischen Mindest-Rechenweg (Sollwert, Messart, Anschlüsse).
 * Format wie der Baustein „worked“: Schritte {text, label, expr, value, unit}. Zahlen sind gerundete Sollwerte der Engine. */
(function (root) {
  var DQ = root.DQ;
  function set(id, rw) { var t = DQ.byId[id]; if (!t) throw new Error('Rechenweg: Aufgabe ' + id + ' fehlt'); t.rechenweg = rw; }
  var S = function (text, label, expr, value, unit) { return { text: text, label: label, expr: expr, value: value, unit: unit }; };

  /* ---------- Kapitel 16 ---------- */
  set('16.1', {
    u: [S('V⎓, Bereich 600 V von Hand, rote Spitze an R1.a, schwarze an R1.b. Die Quelle hat 0,05 Ω Innenwiderstand, darum knapp unter 230 V.', 'U an R1', '230 V · 10 Ω / (10 Ω + 0,05 Ω)', 229.8, 'V')],
    i: [S('Ohmsches Gesetz mit Datenblattwert R1 = 10 Ω.', 'I = U / R', '229,8 V / 10 Ω', 22.98, 'A')],
    p: [S('Leistung aus Spannung und Strom.', 'P = U · I', '229,8 V · 22,98 A', 5279, 'W')],
    ed: [S('Digital: Prozent vom Anzeigewert plus Digit (im 600-V-Bereich ist 1 Digit 0,1 V).', 'Prozentanteil', '0,5 % · 230 V', 1.15, 'V'), S('', 'Digitanteil', '1 · 0,1 V', 0.1, 'V'), S('Beide Anteile addieren.', 'Fehler gesamt', '1,15 V + 0,1 V', 1.25, 'V')],
    ea: [S('Analog: Klasse mal Skalenendwert – unabhängig vom Zeigerstand.', 'Fehler', '1,5 % · 300 V', 4.5, 'V')]
  });
  set('16.2', {
    u1: [S('S1 zu, V⎓ an R1. Der Innenwiderstand der Quelle (0,05 Ω) nimmt etwas Spannung weg.', 'U1', '9 V · 10 Ω / 10,05 Ω', 8.954, 'V')],
    i1: [S('A⎓ in Reihe (Leitung auftrennen). Der Shunt des Amperemeters (0,1 Ω) kommt zum Kreis dazu – der Strom sinkt um rund 1 % gegenüber dem Rechenwert.', 'I1 gemessen', '9 V / (10 Ω + 0,05 Ω + 0,1 Ω)', 886, 'mA'), S('Die Prüfung nimmt den Strom aus der Simulation deiner Schaltung (mit oder ohne Amperemeter).', 'Sollwert (Simulation)', '', 895.4, 'mA')],
    i1c: [S('Ohne Messgerät, nur Quelle und R1.', 'I = U / R', '9 V / (10 Ω + 0,05 Ω)', 895.5, 'mA')],
    u2: [S('Das Voltmeter (10 MΩ) liegt parallel zu R2 (10 MΩ): zusammen 5 MΩ. Der Teiler wird 10 MΩ : 5 MΩ.', 'U2 angezeigt', '9 V · 5 MΩ / (10 MΩ + 5 MΩ)', 3, 'V')],
    u2c: [S('Unbelasteter Teiler aus zwei gleichen Widerständen: die Hälfte.', 'U2 ohne Messgerät', '9 V · 10 MΩ / 20 MΩ', 4.5, 'V')],
    dev: [S('Abweichung bezogen auf den wahren Wert.', 'Fehler', '(4,5 V − 3 V) / 4,5 V · 100 %', 33.3, '%')]
  });
  set('16.3', {
    s_avg: [S('AVG-Gerät: Gleichrichtwert × 1,11. Beim Sinus ist 2Û/π · 1,11 genau der Effektivwert.', 'Anzeige', '2 · 10 V / π · 1,11', 7.07, 'V')],
    s_rms: [S('TRMS misst den echten Effektivwert.', 'U_eff', '10 V / √2', 7.07, 'V')],
    s_pk: [S('Das Oszilloskop zeigt den Scheitelwert direkt.', 'Û', '', 10, 'V')],
    q_avg: [S('Rechteck: Gleichrichtwert = Û, das AVG-Gerät multipliziert trotzdem mit 1,11 – zu viel.', 'Anzeige', '10 V · 1,11', 11.1, 'V')],
    q_rms: [S('Beim Rechteck ist der Effektivwert gleich dem Scheitelwert.', 'U_eff', '', 10, 'V')],
    q_pk: [S('', 'Û', '', 10, 'V')],
    t_avg: [S('Dreieck: Gleichrichtwert = Û/2, mal 1,11 – zu wenig.', 'Anzeige', '10 V / 2 · 1,11', 5.55, 'V')],
    t_rms: [S('Effektivwert des Dreiecks.', 'U_eff', '10 V / √3', 5.77, 'V')],
    t_pk: [S('', 'Û', '', 10, 'V')]
  });
  set('16.4', {
    udc: [S('V⎓ zeigt den Gleichanteil, also den Offset des Generators.', 'U_DC', '', 3, 'V')],
    avg: [S('V~ ist AC-gekoppelt und sieht nur den Sinus mit Û = 5 V. Beim Sinus stimmt die AVG-Korrektur.', 'U_AC', '5 V / √2', 3.54, 'V')],
    rms: [S('TRMS: Effektivwert des Wechselanteils.', 'U_AC', '5 V / √2', 3.54, 'V')],
    pk: [S('Höchster Momentanwert = Offset + Scheitelwert.', 'u_max', '3 V + 5 V', 8, 'V')],
    ges: [S('Gleich- und Wechselanteil geometrisch addieren.', 'U_eff', '√(3² + 3,54²)', 4.64, 'V')],
    q_rms: [S('Rechteck mit Û = 5 V: Effektivwert des Wechselanteils = Û.', 'U_AC', '', 5, 'V')]
  });
  set('16.5', {
    f50: [S('Grenzfrequenz des RC-Glieds, dann die Tiefpass-Formel mit U_e = 10 V/√2 = 7,07 V.', 'f_g', '1 / (2π · 10 kΩ · 100 nF)', 159, 'Hz'), S('', 'U_a (50 Hz)', '7,07 V / √(1 + (50/159)²)', 6.74, 'V')],
    f159: [S('Bei f = f_g fällt die Spannung auf 70,7 %.', 'U_a (159 Hz)', '7,07 V / √2', 5.0, 'V')],
    f1k: [S('', 'U_a (1 kHz)', '7,07 V / √(1 + (1000/159)²)', 1.11, 'V')],
    f10k: [S('Weit über f_g: pro Dekade ein Zehntel.', 'U_a (10 kHz)', '7,07 V / √(1 + (10000/159)²)', 0.112, 'V')],
    pk1k: [S('Scheitelwert aus dem Effektivwert (Sinus).', 'Û (1 kHz)', '1,11 V · √2', 1.57, 'V')],
    dc: [S('Ein Sinus ohne Offset hat keinen Gleichanteil – V⎓ zeigt praktisch 0.', 'U_DC', '', 0, 'V')]
  });
  set('16.6', {
    dc: [S('Einweggleichrichter: nur die positive Halbwelle, Scheitel um die Diodenspannung kleiner. Mittelwert ≈ Û_R/π (Simulation mit Diodenkennlinie etwas kleiner).', 'U_DC', '≈ 9,3 V / π', 2.84, 'V')],
    avg: [S('Wechselanteil mit AVG-Gerät (Gleichrichtwert × 1,11) – die Kurve ist kein Sinus, der Faktor stimmt nicht genau.', 'U_AC (AVG)', '', 3.58, 'V')],
    rms: [S('Wechselanteil als echter Effektivwert.', 'U_AC (TRMS)', '', 3.56, 'V')],
    pk: [S('Scheitel an R1 = Û minus Flussspannung der Diode.', 'Û_R', '10 V − 0,71 V', 9.29, 'V')],
    ges: [S('Gleich- und Wechselanteil geometrisch addieren.', 'U_eff', '√(2,84² + 3,56²)', 4.55, 'V')]
  });
  set('16.7', {
    dc0: [S('Brücke ohne C: beide Halbwellen, Scheitel um zwei Diodenspannungen kleiner, Mittelwert ≈ 2Û_R/π (Simulation etwas kleiner).', 'U_DC', '≈ 2 · 8,6 V / π', 5.02, 'V')],
    ac0: [S('Restwelligkeit ohne Glättung – gross.', 'U_AC (TRMS)', '', 2.96, 'V')],
    pk0: [S('', 'Û_R', '10 V − 2 · 0,71 V', 8.58, 'V')],
    dc1: [S('Mit Ladekondensator hält C die Spannung zwischen den Scheiteln – der Mittelwert steigt.', 'U_DC', '', 6.65, 'V')],
    ac1: [S('Die Restwelligkeit sinkt deutlich.', 'U_AC (TRMS)', '', 1.30, 'V')],
    pk1: [S('Der Scheitel bleibt gleich.', 'Û_R', '', 8.58, 'V')]
  });
  set('16.8', {
    udc: [S('V⎓ am Shunt R2 = 10 Ω, Bereich 200 mV.', 'U_DC am Shunt', '', 49.7, 'mV')],
    idc: [S('Strom aus der Shunt-Spannung.', 'I_DC = U / R', '49,7 mV / 10 Ω', 4.97, 'mA')],
    uac: [S('V~ TRMS am Shunt.', 'U_AC am Shunt', '', 29.3, 'mV')],
    ipk: [S('Scheitelwert am Shunt (Oszilloskop ≈ 85 mV) durch 10 Ω.', 'I_pk', '85 mV / 10 Ω', 8.5, 'mA')],
    sys: [S('Der Shunt liegt in Reihe zur Last 1 kΩ und verkleinert den Strom.', 'Fehler', '10 Ω / (1000 Ω + 10 Ω) · 100 %', 0.99, '%')]
  });

  /* ---------- Rechenwerte der übrigen Kapitel ---------- */
  set('2.10', { ri: [S('Laststrom aus der Klemmenspannung, dann Innenwiderstand aus dem Spannungsabfall.', 'I_L', '9,09 V / 1 kΩ', 9.09, 'mA'), S('', 'R_i = (U₀ − U_L) / I_L', '(10 V − 9,09 V) / 9,09 mA', 100, 'Ω')] });
  set('3.6', { p: [S('Leistung aus dem Effektivwert.', 'P = U² / R', '7,07² V² / 1 kΩ', 50, 'mW')] });
  set('3.10', { uges: [S('Gleich- und Wechselanteil geometrisch addieren.', 'U = √(U_DC² + U_AC²)', '√(5² + 7,07²)', 8.66, 'V')] });
  set('4.6', { u0: [S('Unbelasteter Teiler aus zwei gleichen Widerständen.', 'U2', '10 V · 10 MΩ / 20 MΩ', 5, 'V')] });
  set('4.7', { i0: [S('Ohne Voltmeter fliesst nur der Strom durch den 10-MΩ-Widerstand.', 'I', '10 V / 10 MΩ', 1, 'µA')], i1: [S('Das Voltmeter (10 MΩ) liegt parallel: sein Strom (1 µA) fliesst zusätzlich durch A1.', 'I', '1 µA + 1 µA', 2, 'µA')] });
  set('4.8', { rin: [S('In der Schaltung liegt R1 parallel zu einem zweiten 1-kΩ-Widerstand – das Ohmmeter misst die Parallelschaltung.', 'R_parallel', '1 kΩ ∥ 1 kΩ', 500, 'Ω')], rtrue: [S('Einseitig herausgetrennt misst das Ohmmeter R1 allein.', 'R1', '', 1000, 'Ω')] });
  set('4.9', { uges: [S('Gleichanteil (V⎓) und echter Wechselanteil (TRMS) geometrisch addieren.', 'U_eff', '√(3² + 5,77²)', 6.51, 'V')] });
  set('4.10', { ud: [S('An der unterbrochenen Lampe fliesst kein Strom; an den intakten Lampen fällt nichts ab – die volle Quellenspannung liegt an der defekten.', 'U_defekt', '', 9, 'V')] });
  set('5.2', { dez: [S('Wertigkeiten 8 · 4 · 2 · 1 der leuchtenden Anzeigen addieren.', '1011₂', '8 + 0 + 2 + 1', 11, '')] });
  set('5.6', { dez: [S('Hex-Ziffern A = 10, B = 11, C = 12 …', 'C₁₆', '', 12, '')] });
  set('5.7', { dez: [S('Obere Ziffer mal 16 plus untere Ziffer.', '2D₁₆', '2 · 16 + 13', 45, '')] });
  set('5.9', { dez: [S('Wertigkeiten der gesetzten Bits addieren.', '1011 0110₂', '128 + 32 + 16 + 4 + 2', 182, '')], hi: [S('Obere vier Bits 1011₂ = B₁₆.', 'B₁₆', '8 + 2 + 1', 11, '')] });
  set('6.4', { a00: [S('E2 = 0, E1 = 0 einstellen und L1 ablesen.', 'L1', '', 0, '')], a01: [S('E2 = 0, E1 = 1: nur hier leuchtet L1.', 'L1', '', 1, '')], a10: [S('E2 = 1, E1 = 0.', 'L1', '', 0, '')], a11: [S('E2 = 1, E1 = 1.', 'L1', '', 0, '')] });
  set('8.4', { n: [S('Alle acht Kombinationen E3 E2 E1 von 000 bis 111 schalten und zählen, wann L1 leuchtet.', 'Anzahl Zeilen mit A = 1', '', 5, '')], s: [S('Zeilennummer = Dezimalwert von E3 E2 E1; die Nummern der leuchtenden Zeilen addieren.', 'Summe', '', 22, '')] });
  set('11.1', { tau: [S('Zeitkonstante des RC-Glieds.', 'τ = R · C', '10 kΩ · 100 µF', 1, 's')], imax: [S('Im Einschaltmoment ist C leer – der ganze Spannungsfall liegt an R.', 'I_max = U / R', '5 V / 10 kΩ', 0.5, 'mA')] });
  set('11.2', { tau: [S('Zeit bis 63 % der Endspannung; rechnerisch R · C, der Innenwiderstand der Quelle verlängert minimal.', 'τ', '≈ 10 kΩ · 100 µF', 1.03, 's')], u: [S('Nach einer Zeitkonstante sind 63,2 % erreicht.', 'u(τ)', '0,632 · 5 V', 3.16, 'V')] });
  set('11.5', { t: [S('Periodendauer ist der Kehrwert der Frequenz.', 'T = 1 / f', '1 / 5 Hz', 200, 'ms')] });
  set('13.9', { beta: [S('Stromverstärkung aus Kollektor- und Basisstrom.', 'β = I_C / I_B', '1,766 mA / 17,66 µA', 100, '')] });
  set('14.2', { fg: [S('Bei der Grenzfrequenz ist U_a = 70,7 % von U_e; rechnerisch aus R und C der Schaltung.', 'f_g = 1 / (2π · R · C)', '', 153.9, 'Hz')] });
  set('14.4', { v: [S('Verhältnis von Ausgang zu Eingang.', 'U_a / U_e', '0,703 V / 7,07 V', 0.0995, ''), S('Kontrolle: bei 10 · f_g fällt ein Tiefpass 1. Ordnung auf etwa 1/10.', '', '', 0.1, '')], db: [S('Spannungsverstärkung in Dezibel.', 'v = 20 · log(U_a/U_e)', '20 · log(0,0995)', -20.0, 'dB')] });
  set('15.1', { p: [S('Leistung aus gemessener Spannung und Strom.', 'P = U · I', '5,985 V · 0,2992 A', 1.79, 'W')] });
  set('15.5', { pm: [S('Motorleistung.', 'P_M = U_M · I', '5,511 V · 0,2755 A', 1.52, 'W')], pv: [S('Verlustleistung am Transistor aus U_CE und demselben Strom.', 'P_V = U_CE · I', '0,4755 V · 0,2755 A', 0.131, 'W')] });
  set('15.8', { n: [S('Anzeige nach 0,5 s Torzeit ablesen.', 'Impulse', '', 5, ''), ], rpm: [S('Impulse pro Sekunde, dann mal 60.', 'n', '5 / 0,5 s · 60', 600, '1/min')] });
  /* Übungswerkstatt */
  set('W4', { t: [S('Bildbreite 10 ms, zwei volle Perioden auf dem Schirm.', 'T', '10 ms / 2', 5, 'ms')], f: [S('Frequenz ist der Kehrwert der Periodendauer.', 'f = 1 / T', '1 / 5 ms', 200, 'Hz')] });
  set('W6', { v: [S('Bei der Grenzfrequenz ist die Ausgangsspannung auf 1/√2 gefallen.', 'U_a / U_e', '1 / √2', 0.707, '')] });
  set('W10', { t: [S('Bildbreite 5 ms, Perioden zählen; T ist der Kehrwert der Taktfrequenz.', 'T = 1 / f', '1 / 500 Hz', 2, 'ms')] });
  set('15.9', { ud: [S('Spannung Block für Block messen: Am unterbrochenen Basiswiderstand liegt die Steuerspannung an, dahinter (U_BE) 0 V.', 'U am defekten R1', '', 4.3, 'V')] });
})(typeof window !== 'undefined' ? window : globalThis);

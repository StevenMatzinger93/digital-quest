/* Handbuch – Seiten {id, title, html}. Wird mit den Themen erweitert. */
(function (root) {
  'use strict';
  root.DQ.manual = [
    { id: 'bedienung', title: 'Bedienung', html:
      '<p><b>Bauteil hinzufuegen:</b> Klick in der Palette. <b>Verschieben:</b> ziehen. <b>Drehen:</b> <kbd>R</kbd>. <b>Loeschen:</b> <kbd>Entf</kbd>.</p>' +
      '<p><b>Leitung ziehen:</b> Anschluss anklicken, dann den Ziel-Anschluss. Leitung anklicken und <kbd>Entf</kbd> entfernt sie.</p>' +
      '<p><b>Schalter</b> schaltest du per Klick, <b>Taster</b> sind nur gedrueckt, solange du sie haeltst.</p>' +
      '<p>Die Schaltung wird <b>laufend simuliert</b>. „U anzeigen“ faerbt alle Knoten nach ihrer Spannung (blau = 0 V, rot = hoechste Spannung). Faehrst du ueber ein Bauteil, siehst du U, I und P.</p>' +
      '<p><b>Schaltplan oder Werkbank:</b> Der Knopf „Werkbank“ / „Schaltplan“ wechselt die Darstellung. Es ist dieselbe Schaltung – auf der Werkbank stecken die Bauteile auf Steckbausteinen und werden mit Laborkabeln verbunden. Bauen, Messen und Pruefen funktionieren in beiden Ansichten gleich.</p>' +
      '<p><b>Zeitlupe:</b> zeigt Schritt fuer Schritt, wie die Simulation zum Ergebnis kommt – welche LED leitend wird, welches Gatter umschaltet, wie sich ein Kondensator ueber die Zeit laedt. Mit dem Schieberegler oder den Pfeiltasten blaettern, „Live“ kehrt zurueck.</p>' +
      '<p><b>Freie Werkbank:</b> auf der Karte. Bauen und messen ohne Auftrag, mit allen bisher freigeschalteten Bauteilen.</p>' },
    { id: 'multimeter', title: 'Multimeter', html:
      '<p>Waehle einen Messbereich (V, A, Ω). Danach setzen Klicks auf Anschluesse die Messspitzen: zuerst <b style="color:#ff6b61">rot (+)</b>, dann <b>schwarz (COM)</b>.</p>' +
      '<p>Auf der Werkbank steht dasselbe Geraet: Drehschalter anklicken, die Messkabel fuehren zu den Pruefspitzen.</p>' +
      '<ul><li><b>V⎓</b> – Gleichspannung, parallel zum Bauteil. Innenwiderstand 10 MΩ. Bei schneller Wechselspannung zeigt das Geraet den Mittelwert (beim Sinus 0 V).</li>' +
      '<li><b>V~</b> – Wechselspannung (nur der Wechselanteil). Zwei Messverfahren: <b>Mittelwert (AVG)</b> misst den Gleichrichtwert und rechnet ihn auf den Sinus-Effektivwert um – bei Rechteck oder Dreieck zeigt es falsch. <b>Echt-Effektivwert (TRMS)</b> stimmt fuer jede Kurvenform.</li><li><b>A</b> – in Reihe: Leitung loesen, Spitzen in die Luecke. Innenwiderstand 0,1 Ω, Sicherung 10 A.</li><li><b>Ω</b> – nur spannungsfrei. „0L“ = Unterbrechung.</li></ul>' +
      '<p>Wie ein echtes Geraet zeigt es 4 Stellen mit automatischer Bereichswahl, hat eine kleine Messabweichung (+0,2 %) und die letzte Stelle kann um 1 Digit schwanken.</p>' },
    { id: 'oszi', title: 'Oszilloskop', html:
      '<p>Das Oszilloskop zeichnet die Spannung zwischen den Multimeter-Spitzen (oder rot gegen Masse) ueber die Zeit auf – ab dem Einschalten. Ideal fuer Lade-/Entladekurven, Taktsignale und Wechselspannungen. Auf der Werkbank startet die Taste RUN am Geraet die Aufnahme.</p>' },
    { id: 'bauteile', title: 'Bauteile', html:
      '<dl><dt>Spannungsquelle</dt><dd>Ideale Quelle mit kleinem Innenwiderstand.</dd><dt>LED</dt><dd>Leuchtet ab U<sub>F</sub> (rot 1,8 V … blau 3,0 V), max. 30 mA.</dd>' +
      '<dt>Logikgatter</dt><dd>5-V-Logik, Schaltschwelle 2,5 V. Versorgung ist intern, brauchen aber eine Masse (⏚).</dd><dt>Kondensator</dt><dd>Laedt ueber einen Widerstand mit τ = R · C.</dd>' +
      '<dt>Wechselspannungsquelle</dt><dd>Kleiner Funktionsgenerator: Scheitelwert Û, Frequenz und Kurvenform (Sinus, Rechteck, Dreieck) einstellbar. Effektivwert beim Sinus: U = Û / √2.</dd></dl>' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);

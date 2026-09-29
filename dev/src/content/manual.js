/* Handbuch – Seiten {id, title, html}. Wird mit den Themen erweitert. */
(function (root) {
  'use strict';
  root.DQ.manual = [
    { id: 'bedienung', title: 'Bedienung', html:
      '<p><b>Bauteil hinzufuegen:</b> Klick in der Palette. <b>Verschieben:</b> ziehen. <b>Drehen:</b> <kbd>R</kbd>. <b>Loeschen:</b> <kbd>Entf</kbd>.</p>' +
      '<p><b>Leitung ziehen:</b> Anschluss anklicken, dann den Ziel-Anschluss. Leitung anklicken und <kbd>Entf</kbd> entfernt sie.</p>' +
      '<p><b>Schalter</b> schaltest du per Klick, <b>Taster</b> sind nur gedrueckt, solange du sie haeltst.</p>' +
      '<p>Die Schaltung wird <b>laufend simuliert</b>. „U anzeigen“ faerbt alle Knoten nach ihrer Spannung (blau = 0 V, rot = hoechste Spannung). Faehrst du ueber ein Bauteil, siehst du U, I und P.</p>' +
      '<p><b>Schaltplan oder Werkbank:</b> Der Knopf „Werkbank“ / „Schaltplan“ wechselt die Darstellung. Es ist dieselbe Schaltung – auf der Werkbank stecken die Bauteile auf Steckbausteinen und werden mit Laborkabeln verbunden. Bauen, Messen und Pruefen funktionieren in beiden Ansichten gleich. Auf der Werkbank zoomst du mit dem Mausrad (Handy: zwei Finger) und verschiebst den Tisch, indem du auf einer freien Stelle ziehst; „Einpassen“ zeigt wieder alles.</p>' +
      '<p><b>Zeitlupe:</b> zeigt Schritt fuer Schritt, wie die Simulation zum Ergebnis kommt – welche LED leitend wird, welches Gatter umschaltet, wie sich ein Kondensator ueber die Zeit laedt. Mit dem Schieberegler oder den Pfeiltasten blaettern, „Live“ kehrt zurueck.</p>' +
      '<p><b>Strom zeigen</b> („⇢ Strom“ in der Werkzeugleiste): Punkte wandern entlang der Leitungen in <b>technischer Stromrichtung</b> (von + nach −) – je schneller, desto mehr Strom. An jedem Kabel steht der Stromwert. So siehst du, wo sich der Strom aufteilt und wo gar keiner fliesst.</p>' +
      '<p><b>Freie Werkbank:</b> auf der Karte. Bauen und messen ohne Auftrag, mit allen bisher freigeschalteten Bauteilen.</p>' +
      '<p><b>Limits:</b> Manche Aufgaben erlauben nur eine bestimmte Anzahl Gatter („Erlaubt: hoechstens 3 Logikgatter“). Die Pruefung zaehlt mit.</p>' },
    { id: 'karte', title: 'Karte und Auszeichnungen', html:
      '<p>Die Karte ist in <b>vier Teile</b> gegliedert: <b>I</b> Elektrotechnische Grundlagen (Kapitel 1–4), <b>II</b> Digitaltechnik Grundlagen (5–8), <b>III</b> Kombinatorik und Anzeigen (9–10) – zusammen die <b>Grundstufe</b> – und <b>IV</b> Zeitverhalten und Praxis (11–15), die <b>Profi-Stufe</b>.</p>' +
      '<p>Jede Station schaltet die naechste frei. Theorien bestehst du ab 80 % richtigen Antworten, Aufgaben mit „Pruefen“. Rot umrandet sind die <b>Boss-Aufgaben</b>.</p>' +
      '<p><b>Zertifikat Grundstufe:</b> nach der Boss-Aufgabe 10.10 „Das Codeschloss“. <b>Abzeichen Profi-Stufe:</b> nach der Boss-Aufgabe 15.10 „Die Antriebsstation“. Beide erscheinen auf der Karte am Ende ihres Teils; mit „Anzeigen“ traegst du deinen Namen ein und kannst sie drucken (A4 quer).</p>' },
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
      '<dt>Wechselspannungsquelle</dt><dd>Kleiner Funktionsgenerator: Scheitelwert Û, Frequenz und Kurvenform (Sinus, Rechteck, Dreieck) einstellbar. Effektivwert beim Sinus: U = Û / √2.</dd>' +
      '<dt>Taktgeber</dt><dd>Rechteck 0/5 V mit einstellbarer Frequenz – fuer Blinker, Zaehler und Impulsgeber.</dd>' +
      '<dt>Pegelschalter (E)</dt><dd>Eingang am Experimentierboard: Klick schaltet zwischen 0 und 1 (5 V). Oeffner-Taster (z. B. Stopp, Not-Halt) stehen in Ruhe auf 1.</dd>' +
      '<dt>Logikanzeige (L)</dt><dd>Leuchtet bei 1 (ab 2,5 V). Belastet den Ausgang praktisch nicht.</dd>' +
      '<dt>BCD-7-Segment-Decoder (IC)</dt><dd>Eingaenge A (1), B (2), C (4), D (8) → Segmentausgaenge a … g. Codes 10 … 15 bleiben dunkel.</dd>' +
      '<dt>7-Segment-Anzeige (AZ)</dt><dd>Gemeinsame Kathode: Segment leuchtet bei 1. a oben, im Uhrzeigersinn b … f, g in der Mitte.</dd>' +
      '<dt>Flipflops (FF)</dt><dd>D-, JK- und T-Flipflop, uebernehmen bei der <b>steigenden Flanke</b> an C. Ausgaenge Q und Q̄. D: Q = D. JK: 10 setzen, 01 ruecksetzen, 11 kippen. T: kippt bei T = 1.</dd>' +
      '<dt>Diode (V)</dt><dd>Silizium, Schleusenspannung ca. 0,7 V. Ring = Kathode. Auch als Freilaufdiode am Motor (parallel, Kathode an Plus).</dd>' +
      '<dt>Z-Diode (Z)</dt><dd>In Sperrrichtung betrieben haelt sie die Z-Spannung (einstellbar, Standard 5,1 V). Immer mit Vorwiderstand.</dd>' +
      '<dt>NPN-Transistor (Q)</dt><dd>Basis, Kollektor, Emitter. Gesperrt, aktiv (I<sub>C</sub> = β · I<sub>B</sub>, β einstellbar) oder in Saettigung (U<sub>CE</sub> klein). Als Schalter mit Basiswiderstand uebersteuern.</dd>' +
      '<dt>Motor (M)</dt><dd>Gleichstrommotor, Nenndaten 6 V / 0,3 A, im Simulator als Wicklungswiderstand (Standard 20 Ω) nachgebildet: Die Drehzahl folgt dem Strom, Umpolen kehrt die Drehrichtung um.</dd>' +
      '<dt>Verdeckte Defekte</dt><dd>In Fehlersuch-Aufgaben kann ein Widerstand, eine Lampe oder ein Motor innen unterbrochen sein – von aussen sieht man nichts. Nur Messen hilft: volle Spannung ueber dem Bauteil, aber kein Strom.</dd></dl>' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);

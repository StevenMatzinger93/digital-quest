/* BEISPIEL-THEORIEN – Aufbau: Lektion + 5 Fragen (80 % zum Bestehen).
 * Fragen mit verify werden vom Validator gegen die Engine geprueft. */
(function () {
  'use strict';
  var divider = {
    parts: [{ id: 'B1', type: 'battery', value: 12 }, { id: 'R1', type: 'resistor', value: 1000 }, { id: 'R2', type: 'resistor', value: 2000 }],
    wires: [W('B1.p', 'R1.a'), W('R1.b', 'R2.a'), W('R2.b', 'B1.n')]
  };

  defTheory({
    id: 'T1A', ch: 1, title: 'Spannung, Strom, Widerstand', tags: ['elektro.grundgroessen', 'elektro.ohm'],
    lesson:
      '<p><b>Spannung U</b> (Volt, V) ist der „Druck“, der die Elektronen antreibt. Sie liegt immer <i>zwischen zwei Punkten</i> an.</p>' +
      '<p><b>Strom I</b> (Ampere, A) ist die Menge Ladung, die pro Sekunde durch einen Leiter fliesst. Er fliesst nur im <i>geschlossenen</i> Kreis.</p>' +
      '<p><b>Widerstand R</b> (Ohm, Ω) bremst den Strom.</p>' +
      '<div class="formula">U = R · I</div>' +
      '<p>In der Reihenschaltung fliesst durch alle Bauteile derselbe Strom; die Spannungen addieren sich.</p>',
    questions: [
      { q: 'Wie heisst die Einheit der Spannung?', options: ['Ampere', 'Volt', 'Ohm', 'Watt'], correct: 1, explain: 'Spannung wird in Volt (V) angegeben.' },
      { q: 'Ein Widerstand von 100 Ω wird von 50 mA durchflossen. Welche Spannung liegt an?', options: ['0,5 V', '2 V', '5 V', '50 V'], correct: 2, explain: 'U = 100 Ω · 0,05 A = 5 V.' },
      { q: '12 V liegen an R1 = 1 kΩ und R2 = 2 kΩ in Reihe. Welche Spannung liegt an R2?', options: ['4 V', '6 V', '8 V', '12 V'], correct: 2,
        explain: 'I = 12 V / 3 kΩ = 4 mA; U2 = 2 kΩ · 4 mA = 8 V.', verify: { layout: divider, mode: 'V', a: 'R2.a', b: 'R2.b' } },
      { q: 'Wie gross ist der Strom in dieser Schaltung?', options: ['4 mA', '6 mA', '12 mA', '36 mA'], correct: 0,
        explain: 'I = U / R<sub>ges</sub> = 12 V / 3000 Ω = 4 mA.', verifyTruth: { layout: divider, sel: 'R1', q: 'i' } },
      { q: 'Was passiert mit dem Strom, wenn der Widerstand verdoppelt wird (gleiche Spannung)?', options: ['Er verdoppelt sich', 'Er bleibt gleich', 'Er halbiert sich', 'Er wird null'], correct: 2, explain: 'I = U / R – doppelter Widerstand, halber Strom.' }
    ]
  });

  defTheory({
    id: 'T1B', ch: 1, title: 'Messen mit dem Multimeter', tags: ['messen.multimeter'],
    lesson:
      '<p><b>Spannung</b> misst du <i>parallel</i> zum Bauteil: rote Spitze an den einen, schwarze an den anderen Anschluss. Das Voltmeter ist sehr hochohmig (10 MΩ) und stoert kaum.</p>' +
      '<p><b>Strom</b> misst du <i>in Reihe</i>: Kreis auftrennen, Messgeraet in die Luecke. Das Amperemeter ist sehr niederohmig – parallel zu einer Quelle entsteht ein Kurzschluss, die Sicherung im Messgeraet brennt durch.</p>' +
      '<p><b>Widerstand</b> misst du nur im <i>spannungsfreien</i> Zustand. Das Ohmmeter schickt selbst einen kleinen Pruefstrom.</p>',
    questions: [
      { q: 'Wie wird das Voltmeter angeschlossen?', options: ['In Reihe', 'Parallel zum Bauteil', 'Zwischen Pluspol und Masse, egal wo', 'Gar nicht, nur rechnen'], correct: 1, explain: 'Spannung liegt zwischen zwei Punkten – parallel messen.' },
      { q: 'Warum brennt die Sicherung, wenn man im A-Bereich direkt an die Batterie geht?', options: ['Das Amperemeter ist sehr niederohmig – Kurzschluss', 'Die Batterie ist leer', 'Das Voltmeter ist hochohmig', 'Die Spitzen sind vertauscht'], correct: 0, explain: 'Ein Amperemeter hat fast 0 Ω – parallel zur Quelle wirkt es wie ein Draht.' },
      { q: 'Wann darf man einen Widerstand messen?', options: ['Immer', 'Nur bei eingeschalteter Anlage', 'Nur im spannungsfreien Zustand', 'Nur mit zwei Messgeraeten'], correct: 2, explain: 'Fremdspannung verfaelscht die Messung und kann das Geraet beschaedigen.' },
      { q: 'Die Anzeige zeigt „OL“ bei der Widerstandsmessung. Was bedeutet das?', options: ['Kurzschluss', 'Unterbrechung / sehr grosser Widerstand', 'Batterie leer', 'Falscher Messbereich V'], correct: 1, explain: 'OL = Overload: Der Widerstand ist groesser als der Messbereich – meist eine Unterbrechung.' },
      { q: 'Rot an R2 oben, Schwarz an R2 unten zeigt +8 V. Was zeigt das Geraet mit vertauschten Spitzen?', options: ['+8 V', '−8 V', '0 V', 'OL'], correct: 1, explain: 'Die Spannung ist gerichtet: vertauschte Spitzen kehren das Vorzeichen um.' }
    ]
  });
})();

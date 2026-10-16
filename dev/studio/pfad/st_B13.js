/* Lernpfad Station B13 – Speicher: Übersicht und Organisation. Überwiegend Theorie mit Prüffragen; die Zahlen der Organisationstabelle werden gerechnet (2^n Wörter). */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var org = { kopf: ['Wörter', 'Wortbreite in Bit', 'Adressleitungen', 'Kapazität in Bit', 'Kapazität in Byte'], zeilen: [[256, 8], [1024, 8], [4096, 4], [16384, 1], [65536, 8]].map(function (w) {
    var bits = w[0] * w[1]; return [String(w[0]), String(w[1]), { a: String(Math.round(Math.log(w[0]) / Math.LN2)), typ: 'dez' }, { a: String(bits), typ: 'dez' }, { a: String(bits / 8), typ: 'dez' }]; }) };
  var ARTEN = ['flüchtig, lesen und schreiben', 'nichtflüchtig, bei der Herstellung festgelegt', 'nichtflüchtig, einmal vom Anwender programmierbar', 'nichtflüchtig, mit UV-Licht löschbar', 'nichtflüchtig, elektrisch löschbar'];
  var art = { kopf: ['Speicher', 'Eigenschaft'], zeilen: [['RAM', { a: ARTEN[0], typ: 'wahl', opt: ARTEN }], ['ROM', { a: ARTEN[1], typ: 'wahl', opt: ARTEN }], ['PROM', { a: ARTEN[2], typ: 'wahl', opt: ARTEN }], ['EPROM', { a: ARTEN[3], typ: 'wahl', opt: ARTEN }], ['EEPROM', { a: ARTEN[4], typ: 'wahl', opt: ARTEN }]] };
  P.station({
    id: 'B13', teil: 'B', nr: 13, titel: 'Speicher', kurz: 'Übersicht und Organisation – überwiegend Theorie',
    einfuehrung: '<p>Zähler und Flipflops speichern einzelne Bits. Ein <b>Speicherbaustein</b> fasst sehr viele davon zusammen. Er ist in <b>Wörter</b> aufgeteilt, jedes Wort hat eine <b>Adresse</b> und besteht aus mehreren Bits (der <b>Wortbreite</b>, oft 8). Mit <b>n Adressleitungen</b> lassen sich <b>2<sup>n</sup></b> Wörter unterscheiden. Die Kapazität ist Wörter mal Wortbreite.</p><p>Die Speicherarten unterscheiden sich darin, ob sie ihren Inhalt ohne Spannung behalten (<b>nichtflüchtig</b>) und wie sie beschrieben werden: <b>RAM</b> (flüchtig, Schreib-Lese-Speicher), <b>ROM</b> (bei der Herstellung festgelegt), <b>PROM</b> (einmal programmierbar), <b>EPROM</b> (mit UV-Licht löschbar), <b>EEPROM</b> (elektrisch löschbar) – und der <b>Flash</b>, eine Weiterentwicklung des EEPROM, der blockweise gelöscht wird.</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: true,
    aufgaben: [
      { id: 'B13.1', titel: 'Organisation und Kapazität', art: 'tabelle', kopf: org.kopf, zeilen: org.zeilen, text: '<p>Fülle die Tabelle aus: Wie viele Adressleitungen braucht der Speicher, und wie gross ist seine Kapazität in Bit und in Byte (1 Byte = 8 Bit)?</p>', hilfe: 'Adressleitungen: Wie oft muss man 2 mit sich selbst multiplizieren, um die Zahl der Wörter zu erreichen?' },
      { id: 'B13.2', titel: 'Speicherarten zuordnen', art: 'tabelle', kopf: art.kopf, zeilen: art.zeilen, text: '<p>Wähle zu jedem Speicher die passende Eigenschaft.</p>' },
      { id: 'B13.3', titel: 'Prüffragen Speicher', art: 'fragen', text: '<p>Sechs kurze Fragen.</p>', fragen: [
        { q: 'Ein Speicher hat 10 Adressleitungen. Wie viele Wörter kann er adressieren?', opt: ['10', '100', '1000', '1024'], richtig: 3, erkl: '2¹⁰ = 1024.' },
        { q: 'Welcher Speicher verliert seinen Inhalt, wenn die Spannung abgeschaltet wird?', opt: ['ROM', 'EPROM', 'RAM', 'EEPROM'], richtig: 2, erkl: 'RAM ist flüchtig.' },
        { q: 'Ein Speicher hat 1024 Wörter zu 8 Bit. Wie viele Byte sind das?', opt: ['1024', '8192', '128', '1000'], richtig: 0, erkl: 'Ein Wort mit 8 Bit ist genau ein Byte: 1024 Byte.' },
        { q: 'Wozu dient bei einem Speicher die Adresse?', opt: ['Sie wählt das Wort aus, das gelesen oder geschrieben wird', 'Sie gibt die Taktfrequenz an', 'Sie schaltet den Speicher aus', 'Sie ist die Wortbreite'], richtig: 0, erkl: 'Jedes Wort hat seine Nummer: die Adresse.' },
        { q: 'Für welchen Zweck eignet sich ein ROM?', opt: ['Für Daten, die sich nie ändern (zum Beispiel ein Startprogramm)', 'Als Arbeitsspeicher', 'Als Zähler', 'Als Taktgeber'], richtig: 0, erkl: 'Sein Inhalt ist fest.' },
        { q: 'Wie viele Adressleitungen braucht man mindestens für 100 Wörter?', opt: ['6', '7', '8', '100'], richtig: 1, erkl: '2⁶ = 64 reicht nicht, 2⁷ = 128 reicht.' }] }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

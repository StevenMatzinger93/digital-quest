/* Digital Quest – Gliederung der Karte in vier Teile (siehe docs/THEMEN.md) und die Auszeichnungen.
 * award: nach bestandener Boss-Aufgabe (boss) gibt es das Zertifikat (Grundstufe) bzw. das Abzeichen (Profi-Stufe). */
(function (root) {
  'use strict';
  var DQ = root.DQ = root.DQ || { chapters: [], tasks: [], theories: [], byId: {} };
  DQ.parts = [
    { no: 'I', title: 'Elektrotechnische Grundlagen', stage: 'grund', chapters: [1, 2, 3, 4] },
    { no: 'II', title: 'Digitaltechnik Grundlagen', stage: 'grund', chapters: [5, 6, 7, 8] },
    { no: 'III', title: 'Kombinatorik und Anzeigen', stage: 'grund', chapters: [9, 10], award: 'grund' },
    { no: 'IV', title: 'Zeitverhalten und Praxis', stage: 'profi', chapters: [11, 12, 13, 14, 15], award: 'profi' }
  ];
  DQ.stages = { grund: 'Grundstufe', profi: 'Profi-Stufe' };
  DQ.awards = {
    grund: { id: 'grund', kind: 'Zertifikat', title: 'Zertifikat Grundstufe', boss: '10.10', chapters: [1, 10],
      text: 'hat die Grundstufe von Digital Quest erfolgreich abgeschlossen: Stromkreis und Messtechnik, Zahlensysteme, Logikgatter, Boolesche Algebra, Schaltungsentwurf und Kombinatorik – mit der Boss-Aufgabe „Das Codeschloss“.' },
    profi: { id: 'profi', kind: 'Abzeichen', title: 'Abzeichen Profi-Stufe', boss: '15.10', chapters: [11, 15],
      text: 'hat die Profi-Stufe von Digital Quest erfolgreich abgeschlossen: RC-Glied und Taktgeber, Flipflops und Zaehler, Diode und Transistor, RC-Filter und das Anwendungsprojekt – mit der Boss-Aufgabe „Die Antriebsstation“.' }
  };
})(typeof window !== 'undefined' ? window : globalThis);

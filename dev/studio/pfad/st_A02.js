/* Lernpfad Station A2 – Logikfamilien TTL und CMOS. LABORSTATION: Die Messung macht man am Elektronik-Experimenter, die Software prüft sie nicht.
 * Sie stellt das Messprotokoll bereit (Tabelle zum Eintragen, Speichern im Lernpfad-Fortschritt, Drucken); als erledigt markieren die Lernenden selbst.
 * Bewusst keine Sollwerte: Datenblattwerte stehen im Datenblatt, Messwerte kommen vom Gerät. */
(function (root) {
  'use strict';
  var P = root.DQPfad;
  var blatt = { titel: 'Datenblattwerte', kopf: ['Kenngrösse', '7400 (TTL)', '4027 (CMOS)'], zeilen: [
    ['Versorgungsspannung', null, null], ['Eingangsspannung L, höchstens (V_IL)', null, null], ['Eingangsspannung H, mindestens (V_IH)', null, null], ['Ausgangsspannung L, höchstens (V_OL)', null, null],
    ['Ausgangsspannung H, mindestens (V_OH)', null, null], ['Eingangsstrom bei L (I_IL)', null, null], ['Eingangsstrom bei H (I_IH)', null, null], ['Laufzeit (t_pd)', null, null], ['Leistungsaufnahme', null, null]] };
  var ue = ['0,0', '0,4', '0,8', '1,0', '1,2', '1,4', '1,6', '2,0', '2,4', '2,8', '3,2', '4,0', '5,0'];
  var mess = { titel: 'Übertragungskennlinie U_a = f(U_e)', kopf: ['U_e in V', 'U_a 7400 in V', 'U_a 74LS00 in V', 'U_a 74HC00 in V', 'U_a 4011 in V'], zeilen: ue.map(function (u) { return [u, null, null, null, null]; }) };
  var ausw = { titel: 'Auswertung', kopf: ['Baustein', 'Schaltschwelle (U_e, bei der U_a kippt) in V', 'Bemerkung'], zeilen: ['7400', '74LS00', '74HC00', '4011'].map(function (n) { return [n, null, null]; }) };
  P.station({
    id: 'A2', teil: 'A', nr: 2, titel: 'Logikfamilien TTL und CMOS', kurz: 'Laborstation: Datenblattwerte und Kennlinien messen',
    einfuehrung: '<p>Gatter gibt es in verschiedenen <b>Logikfamilien</b>. <b>TTL</b> (7400, 74LS00) ist aus bipolaren Transistoren gebaut, <b>CMOS</b> (74HC00, 4011, 4027) aus Feldeffekttransistoren. Beide verstehen dieselben 0 und 1, unterscheiden sich aber in Pegeln, Stromaufnahme, Geschwindigkeit und Empfindlichkeit.</p><p>In dieser Station machst du zwei Dinge <b>im Labor am Elektronik-Experimenter</b>:</p><ol><li>Du suchst im Datenblatt die Kennwerte eines TTL-Bausteins (7400) und eines CMOS-Bausteins (4027) heraus und trägst sie ein.</li><li>Du misst an vier Bausteinen die Übertragungskennlinie U<sub>a</sub> = f(U<sub>e</sub>): U<sub>e</sub> an einem NAND-Eingang einstellen (der andere Eingang liegt auf 1), U<sub>a</sub> mit dem Multimeter ablesen.</li></ol><p><b>Vorsicht:</b> Versorgung auf 5 V einstellen und kontrollieren, bevor du einschaltest. Ungebrauchte Eingänge anschliessen (Station A3).</p>',
    verweis: 'Vertieft in FestoLX, «Grundlagen Digitaltechnik».', schaltet: [], auto: false,
    aufgaben: [
      { id: 'A2.1', titel: 'Datenblattwerte eintragen', art: 'protokoll', tabellen: [blatt], text: '<p>Trage die Werte aus dem Datenblatt ein (mit Einheit). Die Software prüft sie nicht: Das Datenblatt ist die Lösung.</p><p>Das Protokoll wird in deinem Fortschritt gespeichert und lässt sich ausdrucken.</p>' },
      { id: 'A2.2', titel: 'Kennlinien messen', art: 'protokoll', tabellen: [mess], text: '<p>Miss U<sub>a</sub> bei den angegebenen U<sub>e</sub> für alle vier Bausteine und trage die Werte ein. Zwischen 1,0 V und 2,8 V kippt der Ausgang: Wenn du die Stelle genauer treffen willst, miss dort zusätzliche Punkte und schreibe sie in die Notizen.</p>' },
      { id: 'A2.3', titel: 'Auswertung', art: 'protokoll', tabellen: [ausw], text: '<p>Lies aus deiner Messung die <b>Schaltschwelle</b> jedes Bausteins ab: die Eingangsspannung, bei der der Ausgang von H nach L kippt. Notiere in der Bemerkung, was dir bei den Familien auffällt (Lage der Schwelle, Steilheit, Pegel bei 0 V).</p>' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);

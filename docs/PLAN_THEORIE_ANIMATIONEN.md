# Plan: Theorie-Lektionen mit Bild/Animation (Stand 29.09.2026)

> **Umgesetzt am 29.09.2026** (Phasen A–F, alle 30 Theorien) – Stand und bewusste Abweichungen siehe `docs/STAND.md` → "Theorie-Animationen", Datenformat in `CLAUDE.md` → "Theorie (defTheory)".

Auslöser: Theorie-Lektionen (`defTheory`, Feld `lesson`) sind heute reiner HTML-Text (Absätze, Formeln als Unicode-Hoch-/Tiefstellung). 30 Lektionen (T1A–T15B) über alle 15 Kapitel. Ziel: dort gezielt Bild/Animation einsetzen, wo es das Verständnis wirklich verbessert (Beispiel Gray-Code: dass sich immer nur ein Bit ändert, sieht man an einer laufenden Zählung sofort, an Fliesstext nur mit Kopfrechnen).

## Leitidee: wiederverwenden statt neu malen

Der wichtigste Befund vor der Detailplanung: **die Engine simuliert die meisten Theoriethemen bereits echt** (Stromkreise, alle Gatter, Flipflops, RC-Glieder, Dioden/Transistor, Wechselspannung). Es gibt schon eine Stromfluss-Animation (animierte Punkte auf den Leitungen, gemeinsamer Code in `editor.js`/`bench.js`), eine Zeitlupe (Quick Win, zeigt Simulationsschritte), ein Oszilloskop (Zeitkurven) und die Spannungsfarben-Live-Anzeige. Statt für jede Lektion eine eigene, von Hand gezeichnete Animation zu bauen, wird der **bestehende Schaltungs-Renderer als eingebettetes „Mini-Labor" in die Lektion eingebettet** – read-only oder mit Zeitlupe/Klicken, aber ohne Aufgabenprüfung. Das ist gleichzeitig die günstigste UND die stimmigste Lösung: die Theorie sieht dann aus wie das Labor selbst, nicht wie eine fremde Illustration. Nur für Themen, die die Engine nicht abbildet (reine Zahlendarstellung, Karnaugh-Diagramm, Frequenzgang/dB, Blockbilder), braucht es wirklich neue, aber dafür sehr einfache Bausteine.

## Die fünf Bausteine

| Baustein | Was er zeigt | Technik | Aufwand | Wiederverwendung |
|---|---|---|---|---|
| **Mini-Schaltung** | Ein Ausschnitt aus Schema/Werkbank, read-only oder mit Zeitlupe/Klicken (Schalter betätigen, Takt weiterschalten). Reagiert wirklich (Engine rechnet echt). | Bestehender `editor.js`/`bench.js`-Renderer, neuer schlanker Einbettungsmodus ohne Palette/Prüfung/Messprotokoll. | Mittel (einmalig: Einbettungsmodus bauen) | Grösster Baustein: ~18 von 30 Lektionen |
| **Zahlen-Schritt-Widget** | Zahl in Kästchen (Bits oder Ziffern), Schritt-für-Schritt-Umrechnung mit Vor/Zurück-Knopf, betroffene Stelle hervorgehoben. Bei Gray-Code zusätzlich zwei Reihen (Binär/Gray) nebeneinander mit Hervorhebung des sich ändernden Bits beim Weiterzählen. | Neues, kleines Modul (reines SVG/HTML+JS, keine Bibliothek) | Klein | ~5 Lektionen |
| **KV-Diagramm-Widget** | Interaktives Karnaugh-Feld: anklicken markiert Einsen, „Gruppieren" zeichnet die Schleife um benachbarte Felder und zeigt den vereinfachten Term. | Neues Modul, wird aus Wahrheitstabelle generiert (Daten hat die Engine/Validator schon) | Mittel | 2 Lektionen (T7A/B teils, T8B), later auch fuer Aufgaben nutzbar |
| **Frequenzgang-Widget** | Bode-artige Kurve (Amplitude über Frequenz, log-Skala), Grenzfrequenz markiert, Cursor zum Abfahren. Einzige wirklich neue Visualisierungsart (Zeitbereich gibt es schon, Frequenzbereich nicht). | Neues Modul, nutzt dieselbe RC-Berechnung wie die Engine (Formel, kein neuer Simulationscode) | Mittel | 2 Lektionen (T14A/B) |
| **Blockbild** | Statisches/leicht animiertes Blockschema (Kästchen + Pfeile), z. B. Antriebsstation. | Einfaches Inline-SVG von Hand | Klein, aber nicht wiederverwendbar | 2 Lektionen (T15A/B) |

Ein Baustein wie „Mini-Schaltung" ist damit die mit Abstand wichtigste Investition – er deckt über die Hälfte aller Lektionen ab und ist praktisch geschenkt, weil Engine und Renderer schon stehen.

## Übersicht aller 30 Theorien mit Visualisierungs-Vorschlag

| ID | Kapitel/Titel | Baustein | Konzept |
|---|---|---|---|
| T1A | 1 Der Stromkreis | Mini-Schaltung | Batterie–Schalter–Lampe, Schalter anklicken, Stromfluss-Punkte laufen sichtbar los/stoppen |
| T1B | 1 Ohmsches Gesetz und Vorwiderstand | Mini-Schaltung | LED mit Schieberegler am Widerstandswert, Strom/Helligkeit live, „brennt durch" ab Grenzwert |
| T2A | 2 Die Reihenschaltung | Mini-Schaltung | Zwei/drei Widerstände in Reihe, Spannungsfarben je Abschnitt, Summe live angezeigt |
| T2B | 2 Parallelschaltung, Knotenregel, Spannungsteiler | Mini-Schaltung | Spannungsteiler mit verschiebbarem Abgriff (Poti), Ausgangsspannung live |
| T3A | 3 Gleich- und Wechselgroessen | Mini-Schaltung (Oszilloskop) | AC-Quelle am Oszi, Kurvenform umschaltbar (Sinus/Rechteck/Dreieck), Periode/Frequenz markiert |
| T3B | 3 Gleichrichtwert, Effektivwert, AVG und TRMS | Mini-Schaltung (Oszilloskop) | Gleiche Kurve, zwei Messwert-Overlays (AVG-Linie vs. TRMS-Linie), Differenz sichtbar |
| T4A | 4 Messen, Pruefen, Messgeraete | Mini-Schaltung | Multimeter-Bereichswahl live an einer Beispielschaltung, falscher Bereich → OL/Sicherung als Warnbeispiel |
| T4B | 4 Genauigkeit und Messfehler | Zahlen-Schritt-Widget | Gleicher Messwert mit unterschiedlicher Auflösung/Kalibrierfehler nebeneinander (±Digit sichtbar) |
| T5A | 5 Stellenwertsystem und Dualzahlen | Zahlen-Schritt-Widget | Dezimalzahl → Divisions-Kette Schritt fuer Schritt, Reste sammeln sich zur Dualzahl |
| T5B | 5 Hexadezimal, BCD und Horner-Schema | Zahlen-Schritt-Widget | Gleiche Zahl parallel in Dezimal/Hex/BCD, Ziffern-fuer-Ziffer-Übersetzung |
| T6A | 6 UND, ODER, NICHT | Mini-Schaltung | Gatter mit anklickbaren Eingaengen, Ausgang/Logikanzeige reagiert sofort |
| T6B | 6 NAND, NOR, XOR, XNOR | Mini-Schaltung | Gleiches Prinzip, XOR zusaetzlich Wahrheitstabelle wird beim Klicken Zeile fuer Zeile abgehakt |
| T7A | 7 Gesetze der Booleschen Algebra | Mini-Schaltung (Vorher/Nachher) | Zwei Gatterschaltungen nebeneinander (z. B. vor/nach Vereinfachung), gleiche Eingaenge → gleicher Ausgang wird live bewiesen |
| T7B | 7 De Morgan und normierte Schaltungen | Mini-Schaltung (Vorher/Nachher) | UND-ODER-Schaltung vs. NAND-only-Schaltung, gleiche Wahrheitstabelle live gegenpruefen |
| T8A | 8 Von der Wahrheitstabelle zur Schaltung | KV-Diagramm-Widget (einfach) + Mini-Schaltung | Tabelle → automatisch DNF-Schaltung gebaut, Zeile anklicken hebt passenden Gatterpfad hervor |
| T8B | 8 Das KV-Diagramm | KV-Diagramm-Widget | Volles interaktives Feld: Einsen anklicken, Gruppieren, vereinfachter Term erscheint |
| T9A | 9 Codes und Paritaet | Zahlen-Schritt-Widget | **Gray-Code-Beispiel**: Zaehler 0…7 in Binaer und Gray nebeneinander laufen lassen, sich aenderndes Bit blinkt; Paritaet als drittes Feld (XOR-Kette farbig) |
| T9B | 9 Multiplexer, Komparator, Addierer | Mini-Schaltung | Volladdierer mit zwei Eingangs-Bitpaaren durchklicken, Uebertrag wandert sichtbar zur naechsten Stelle |
| T10A | 10 7-Segment-Anzeigen | Mini-Schaltung | Zaehler 0–9 durchklicken, Decoder schaltet Segmente, Anzeige reagiert live |
| T10B | 10 Entwurf komplexer Schaltungen | Mini-Schaltung | Wie T8A, aber mit den in Kap. 9/10 gelernten Bausteinen (Decoder/Komparator) kombiniert |
| T11A | 11 Laden und Entladen | Mini-Schaltung (Zeitlupe/Oszi) | RC-Glied, Taste „laden"/„entladen", Ladekurve läuft am Oszi mit, Zeitkonstante als Marke |
| T11B | 11 RC-Glieder in Schaltungen | Mini-Schaltung | Gleiches Bauteil in Filter-/Taktgeber-Kontext, Wirkung auf Rechtecksignal live |
| T12A | 12 Das Flipflop – ein Bit Gedaechtnis | Mini-Schaltung | RS-Flipflop aus zwei NOR, Set/Reset anklicken, Zustand bleibt sichtbar erhalten (Kernaussage „Gedaechtnis") |
| T12B | 12 Zaehler | Mini-Schaltung (Zeitlupe) | Flipflop-Kette, Takt Schritt fuer Schritt weiterschalten, Bitmuster zaehlt sichtbar hoch |
| T13A | 13 Diode und Z-Diode | Mini-Schaltung | Diode durchlass-/sperrrichtung anklicken, Z-Diode mit Spannungs-Schieberegler (Durchbruch sichtbar) |
| T13B | 13 Der Transistor | Mini-Schaltung | Basis-Strom-Schieberegler, Kollektor-Strom/LED-Helligkeit folgt, „als Schalter" demonstriert |
| T14A | 14 Frequenzgang und Dezibel | Frequenzgang-Widget | Tiefpass, Frequenz-Schieberegler, Kurve + Grenzfrequenz-Marke, dB-Wert live |
| T14B | 14 Bandpass, Bandsperre, Signalformung | Frequenzgang-Widget + Mini-Schaltung | Kurve fuer Bandpass, dazu Beispiel-Zeitsignal vorher/nachher am Oszi |
| T15A | 15 Die Antriebsstation | Blockbild + Mini-Schaltung | Blockbild Motor/Treiber/Steuerung, anklickbarer Ausschnitt oeffnet die echte Teilschaltung |
| T15B | 15 Steuerung und Sicherheit | Mini-Schaltung | Selbsthaltung/Not-Halt-Schaltung, Klicken auf Start/Stopp/Not-Halt zeigt Zustandswechsel |

## Datenmodell-Erweiterung (`defTheory`)

Neues optionales Feld `visual`, analog zum bereits eingefuehrten `bench`-Feld bei Aufgaben:

```
visual: {
  type: 'circuit' | 'numberSteps' | 'kmap' | 'bode' | 'block',
  // je nach type z. B.:
  layout: { parts: [...], wires: [...] },   // circuit: read-only Mini-Schaltung, optional interaktiv (interactive: true)
  steps: [...],                              // numberSteps: Schrittfolge mit Beschriftung
  table: [...],                               // kmap: Wahrheitstabelle
  rc: { r, c, type: 'lowpass'|'highpass' },   // bode: Bauteilwerte fuer die Kurve
  svg: '...'                                  // block: fertiges Inline-SVG
}
```
`validate.js` prueft: `type` bekannt, Pflichtfelder je Typ vorhanden, bei `circuit` dieselben Regeln wie bei `bench`-Layouts (IDs gueltig). Fehlt `visual`, bleibt die Lektion reiner Text (kein Zwang, aber Ziel: alle 30 damit ausstatten).

## Umsetzungsprojektplan

**Phase A – Baustein „Mini-Schaltung" (groesster Hebel zuerst)**
Den bestehenden `editor.js`/`bench.js`-Renderer so kapseln, dass er ohne Palette/Aufgabenpruefung/Messprotokoll in eine Lektion eingebettet werden kann: nur Zeichnen + optional Klicken auf Schalter/Takt + optional Zeitlupe-Knopf. Technisch: `core` (bereits ansichtsneutral aus Phase 1 der Werkbank) mit `readonly: true`/`allowedActions: ['toggleSwitch','clock']` instanziieren, in einem kleinen `<svg>` innerhalb der Lektion. Das ist die Vorbedingung fuer alle circuit-basierten Zeilen der Tabelle oben (~18 von 30).

**Phase B – Theorie-Renderer erweitern**
In `app.js`, wo `lesson`-HTML heute direkt eingesetzt wird: `visual`-Feld erkennen, passenden Baustein einhaengen, an fester Stelle in der Lektion (z. B. nach dem ersten Absatz oder wo ein Platzhalter `{{visual}}` im Text steht).

**Phase C – Zahlen-Schritt-Widget und KV-Diagramm-Widget**
Die zwei am naechsthaeufigsten gebrauchten neuen Bausteine, unabhaengig von Phase A entwickelbar (reines HTML/SVG/JS ohne Engine-Bezug). Gray-Code (T9A) als erste konkrete Umsetzung, weil explizit gewuenscht.

**Phase D – Frequenzgang-Widget**
Nur fuer T14A/B gebraucht, daher zeitlich spaeter; Formel (Grenzfrequenz, dB-Abfall) steht schon in der Engine/den Aufgaben von Kapitel 14 bereit.

**Phase E – Rollout ueber alle 30 Lektionen**
Reihenfolge nach Wirkung/Aufwand: zuerst die Lektionen, die nur „Mini-Schaltung read-only" brauchen (schnell, viele auf einmal), dann die mit Interaktion (Schieberegler/Klicken), zuletzt die vier Sonderfaelle (KV, Frequenzgang, 2× Blockbild).

**Phase F – QA**
`validate.js`: jede Lektion hat entweder `visual` oder einen dokumentierten Grund, warum nicht. `tests/smoke.js`: klickt durch alle 30 Lektionen, prueft dass jeder Baustein ohne JS-Fehler rendert und (bei `circuit`) reagiert.

## Aufwand/Priorisierung in Kuerze
Phase A ist die einzige wirklich neue Kernarbeit mit grossem Hebel - danach ist jede der ~18 Mini-Schaltungs-Lektionen nur noch Layout+Text, keine neue Technik. Die drei neuen Bausteine (Zahlen-Schritt, KV, Frequenzgang) sind einzeln klein und unabhaengig parallelisierbar. Empfehlung: Phase A + B zuerst (Fundament), dann sofort T9A (Gray-Code) als Beweis und Vorlage, danach breiter Rollout.

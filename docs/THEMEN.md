# Themenliste – Digital Quest (Stand 28.09.2026)

Kapitelplan, abgeleitet aus Stevens Quellmaterial in `99_inputs/` und `theorie/`. Vier Hauptteile (Teile) mit 15 Unterkapiteln, Grundstufe 1–10, Profi-Stufe 11–15 (Bauplan-Standard). Genaue Aufgaben (10 pro Kapitel) entstehen erst beim Sichten der jeweiligen Quelldokumente – diese Tabelle ist der Rahmen, nicht die fertigen Aufgaben.

## Teil I – Elektrotechnische Grundlagen (Kap. 1–4)

| Kap. | Thema | Theorie A | Theorie B | Messschwerpunkt | Quelle in 99_inputs/ |
|---|---|---|---|---|---|
| 1 | Stromkreis-Grundlagen | Stromkreis, Schalter | Ohm'sches Gesetz, Vorwiderstand | Strom/Spannung messen | *(vorhanden, Beispielkapitel)* |
| 2 | Gleich- und Wechselgrössen | Reihenschaltung | Parallelschaltung, Spannungsteiler | Spannungsteiler nachmessen | `neu formatiert/Gleich-&Wechselgrössen_neu.docx` (+ Lösung) |
| 3 | Wechselgrössen messen | Mittelwert (AVG) | Effektivwert (RMS), TRMS, Crest-Faktor | RMS vs. TRMS am Multimeter unterscheiden | `neu formatiert/Messtechnik Erweiterung_neu.docx` |
| 4 | Messtechnik allgemein | Oszilloskop-Grundlagen | Messfehler, Messbereich wählen | Fehlbedienung erkennen (OL, Sicherung) | `neu formatiert/Messtechnik Erweiterung_neu.docx` |

**Engine-Abhängigkeit Kap. 3**: braucht eine sinusförmige Wechselspannungsquelle in `engine.js` (heute nur Gleichspannung + Rechteck-Taktgeber) plus Mittelwert-/Effektivwert-Berechnung – siehe `docs/STAND.md`, Nächste Schritte.

## Teil II – Digitaltechnik Grundlagen (Kap. 5–8)

| Kap. | Thema | Theorie A | Theorie B | Messschwerpunkt | Quelle in 99_inputs/ |
|---|---|---|---|---|---|
| 5 | Zahlensysteme | Dual/Hex | BCD, Umrechnung | – | `Zahlensysteme_Umrechnung_animiert.pptx` |
| 6 | Boolesche Algebra | Grundgesetze | Vereinfachungsregeln | – | `Gesetze der Boolschen Algebra.docx` |
| 7 | Grundgatter | UND/ODER/NICHT | NAND/NOR/XOR | Pegel messen (0/1) | *(Engine vorhanden)* |
| 8 | Schaltungsvereinfachung | KV-Diagramm Prinzip | Von Wahrheitstabelle zur Schaltung | Wahrheitstabelle nachmessen | `Prüfungen/Prüfung Digitaltechnik_KV Diagramme.docx` |

## Teil III – Stationäre Vorgänge (Kap. 9–10, Abschluss Grundstufe: Boss-Aufgabe + Zertifikat)

| Kap. | Thema | Theorie A | Theorie B | Messschwerpunkt | Quelle in 99_inputs/ |
|---|---|---|---|---|---|
| 9 | Stationäre Vorgänge I | Kombinatorik Basis | Multiplexer/Decoder | Ausgangspegel je Eingangskombination | `neu formatiert/Digitaltechnik stationäre Vorgänge V4_neu.docx` (+ Lösung) |
| 10 | Stationäre Vorgänge II | 7-Segment/Codierer | Komplexe Kombinatorik | Wahrheitstabelle vollständig, + Boss-Aufgabe | dito, Fortsetzung |

## Teil IV – Profi-Stufe: Zeitverhalten & Praxis (Kap. 11–15, Abschluss: Boss-Aufgabe + Abzeichen)

| Kap. | Thema | Theorie A | Theorie B | Messschwerpunkt | Quelle in 99_inputs/ |
|---|---|---|---|---|---|
| 11 | Zeitabhängige Vorgänge I | RC-Glied, Zeitkonstante | Taktgeber | Ladekurve am Oszilloskop | `neu formatiert/Digitaltechnik zeitabhängige Vorgänge V3_neu.docx` (+ Lösung) |
| 12 | Flipflops & Speicher | RS aus NOR | Getaktete Flipflops | Zustand nach Takt messen | dito, Fortsetzung |
| 13 | Praktische Elektronik | Diode/Transistor als Schalter | Transistor-Grundschaltung | Schaltschwelle messen | `neu formatiert/Praktische Elektronik V1_neu.docx` (+ Lösung) |
| 14 | Elektrotechnik-Vertiefung | Ergänzungsstoff AU-Kurs | Ergänzungsstoff AU-Kurs | nach Bedarf | `neu formatiert/ET Kurs AU Zusatz_neu.docx` (+ Lösung) |
| 15 | Anwendungsprojekt | – | – | Gesamtanlage bauen + messen, + Boss-Aufgabe | `Aufträge/Brems-Antriebssystem TP1410 Auftrag.docx` |

## Offene Punkte
- Kapitel 9/10 und 11/12 sind grobe Zuordnung – die beiden "neu formatiert"-Quelldokumente sind sehr umfangreich (4–6 MB), vor dem Ableiten der 10 Aufgaben pro Kapitel lohnt sich ein genauerer Blick in den Inhalt, damit die Reihenfolge zum Aufbau des Dokuments passt statt nur zum Dateinamen.
- Kapitel 14 ist bewusst als Puffer/Vertiefung gedacht (Zusatzstoff), Position im Kapitelplan kann sich noch verschieben.
- Zusatzmaterial nicht in obiger Tabelle verortet: `Aktivitäten/` (Rätsel, GatterMemory – Auflockerungen, keine eigenen Kapitel), `Prüfungen/` (Referenz für Schwierigkeitsgrad und Aufgabenformate), zwei Erklärvideos in `Videos & Erklärungen/`.

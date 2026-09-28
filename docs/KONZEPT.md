# Digital Quest – Konzept (Entwurf 28.09.2026)

## Idee
Ein Labor im Browser zwischen **Fritzing** (anschaulich aufbauen) und **LTspice** (rechnen, messen, Kurven). Lernende bauen Schaltungen, die sofort laufen – und muessen sie **messen** wie in der Werkstatt. Theorie wird praktisch umgesetzt: jede Formel wird am Aufbau nachgemessen.

## Herzstueck: die Messwerkstatt (Schema <-> Werkbank)
Das ist der Grund, warum Digital Quest existiert und nicht "noch ein LTspice/Fritzing/TINA im Browser" ist: **Schema-Ansicht und Werkbank-Ansicht sind zwei Darstellungen derselben lebenden Schaltung**, angetrieben von derselben Knotenanalyse-Engine - kein zweiter Modus, kein Rendering-Trick, kein Umschalten mit Ergebnisverlust.

- **Schema-Ansicht** (heute vorhanden): IEC-Symbole, Editor-Raster, zum Verstehen und schnellen Aufbauen.
- **Werkbank-Ansicht** (neu, Kernstueck): 2.5D, fester Blickwinkel, an einem echten Elektroniklabor/Physik-Praktikum orientiert - Bauteile, Kabel mit Messspitzen/Krokoklemmen, Messgeraete mit echten Geraetefronten (Multimeter, Oszilloskop), so wie sie am Arbeitsplatz aussehen und bedient werden.
- Beide Ansichten lesen und schreiben denselben Schaltungszustand (Netzliste, Messwerte, Fehlerzustaende). Umschalten Schema <-> Werkbank aendert nur die Darstellung, nie das Ergebnis.
- Prioritaet: **Werkbank-Ansicht wird vor dem weiteren Inhaltsaufbau entwickelt** (Entscheid 28.09.2026, siehe `docs/ENTSCHEIDUNGEN.md`). Der Inhalt (Kapitel/Aufgaben) entsteht danach direkt in der fertigen Werkbank.
- **Quick Wins (Entscheid 28.09.2026, siehe `docs/ENTSCHEIDUNGEN.md`)**: Zeitlupen-Replay der Simulationsschritte, Diagnose aus echten Simulationswerten statt Textbaustein, Messgeraete-Toleranz/Rauschen inkl. Average-responding- vs. TRMS-Unterschied, freier Sandbox-Modus. Kein neues Bedienkonzept - die Engine rechnet mehr, die Oberflaeche zeigt mehr davon.

## Drei Saeulen
1. **Bauen** – Schaltplan-Editor mit IEC-Symbolen, Live-Simulation, Bauteile gehen bei Fehlern kaputt (LED ohne Vorwiderstand, Kurzschluss).
2. **Messen** – Multimeter (V/A/Ω mit realistischen Fehlbedienungen: Sicherung, Messung unter Spannung, OL), Oszilloskop, spaeter Logikanalysator und Funktionsgenerator. Messwerte werden im Messprotokoll eingetragen und geprueft.
3. **Verstehen** – Theorie-Auftraege (Lektion + 5 Fragen, 80 %), Fragen werden gegen die Engine verifiziert.

## Aufgabentypen
| Typ | Beispiel | Pruefung |
|---|---|---|
| Bauen | LED mit Vorwiderstand | Tests auf Strom/Spannung/Zustand |
| Messen | Strom im Kreis ermitteln | Messprotokoll gegen Simulation |
| Bauen + Messen | Spannungsteiler auslegen und nachmessen | beides |
| Fehlersuche | Anlage mit Defekt: finden, messen, beheben | Tests + Protokoll |
| Dimensionieren | Werte waehlen (Normreihe E12) | Tests mit Bereichen |
| Logik | Wahrheitstabelle als Schaltung | Tests je Eingangskombination |

## Didaktischer Aufbau (Standard der Quest-Reihe)
15 Kapitel × 10 Aufgaben, 30 Theorien; Theorie A → 1–5 → Theorie B → 6–10; Grundstufe 1–10, Profi 11–15; Boss-Aufgaben, Zertifikat, Abzeichen. Themen folgen (`docs/THEMEN.md`), Quellmaterial liegt in `theorie/`.

## Welt und Figuren (Entscheid 28.09.2026)
Die Lernumgebung heisst **Labor** (passt zum Werkbank-Stilvorbild "echtes Elektroniklabor/Physik-Praktikum"). Zwei Begleitfiguren wie in SCL Quest: eine erklaert (**Laborassistenz**), eine fordert (**Laborchef/Werkmeisterin**). Konkrete Namen/Aussehen der Figuren folgen spaeter, die Rollenaufteilung selbst ist gesetzt. Leitfarbe Bernstein `#ffb000` – erkennbar als Familie mit SCL Quest (gruen).

## Ausbaustufen des Editors
1. **Vorhanden:** Schema-Ansicht – Leitungen Anschluss→Anschluss, automatische rechtwinklige Fuehrung, Multimeter, Oszilloskop (1 Kanal).
2. **Jetzt/Prioritaet:** Werkbank-Ansicht (siehe "Herzstueck" oben) – ersetzt die urspruenglich separat geplante Steckbrett-Ansicht (Stufe 3 alt): eine zweite, laborechte Darstellung derselben Netzliste reicht als Alleinstellungsmerkmal, ein drittes Steckbrett-Look-and-feel zusaetzlich zur Werkbank ist nicht mehr vorgesehen.
3. Leitungen mit Knickpunkten, Zoom/Verschieben, Rueckgaengig (Schema-Ansicht).
4. Messgeraete: 2-Kanal-Oszilloskop, Logikanalysator, Funktionsgenerator, Netzgeraet mit Strombegrenzung.
5. Weitere Bauteile nach Themenliste (Transistor, Relais, Flipflops, Zaehler, 7-Segment, Sensoren …).

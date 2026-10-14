# Leistungsmessung Studio (Nacht-Paket 6b, 15.10.2026)

Werkzeug: `dev/tests/leistung.js` (`node tests/leistung.js [Grössen]`). Gemessen auf dem Entwicklungsrechner mit Chromium **ohne Grafikkarte**
(Software-Zeichnen, Fenster 1440 × 900): ein Laptop mit Grafikbeschleunigung zeichnet schneller, die Rechenzeit je Schritt ist dieselbe.

Schaltungen:
- **reine Logik:** Taktgeber 1 kHz und (n − 1) D-Flipflops als Ripple-Zähler;
- **reine Analogschaltung:** Wechselquelle 1 kHz und eine RC-Kette aus n − 1 Widerständen und Kondensatoren;
- **gemischt:** je die Hälfte nebeneinander.
Die Simulation läuft mit Zeitfaktor «Auto», das Oszilloskop ist zu, der Schaltplan zeichnet bei jeder sichtbaren Änderung neu.

## Aussage

**Bis etwa 50 Bauteile läuft das Studio flüssig** (mindestens 30 Bilder je Sekunde, die Simulation folgt dem Zeitfaktor ohne Rückstand), und zwar
- reine Logik bis **50** Bauteile,
- reine Analogschaltung bis **100** Bauteile,
- gemischte Schaltungen bis **25** Bauteile (bei 50 liegt die Bildrate noch bei 49, die Simulation bleibt aber in einem Drittel der Bilder zurück).

Mit eingeschaltetem «U-Werte» (alle Spannungen als Zahlen im Bild, zeichnet bei jedem Schritt neu) halbiert sich die Grenze: Logik 25, Analog 50, gemischt 25.
Die Digitaluhr (8 Bauteile als Kästen) liegt damit weit im flüssigen Bereich; aufgeklappt wurde sie nicht gemessen.

## Rechenzeit je Schritt (Node, Millisekunden)

| Bauteile | reine Logik | reine Analogschaltung | gemischt |
|---:|---:|---:|---:|
| 10 | 0.112 | 0.036 | 0.046 |
| 25 | 0.184 | 0.047 | 0.109 |
| 50 | 0.493 | 0.072 | 0.224 |
| 100 | 1.43 | 0.140 | 0.580 |
| 200 | 5.43 | 0.286 | 1.80 |
| 400 | 24.69 | 0.699 | 7.08 |

Logik wächst etwa mit dem Quadrat der Bauteilzahl (100 → 200 Bauteile: Faktor 3,8; 200 → 400: Faktor 4,5), die Analogschaltung etwa linear bis
leicht darüber. Die Ursache wurde nicht untersucht (dieses Paket misst nur); naheliegend ist das dichte Gleichungssystem (jeder Knoten gegen jeden) und das Nachführen der Flanken über mehrere Durchgänge je Schritt.

## Bilder je Sekunde der Oberfläche

| Bauteile | Art | Bilder/s | Bilder/s mit «U-Werte» | Simulation folgt dem Zeitfaktor |
|---:|---|---:|---:|---|
| 10 | logik | 60 | 60 | ja |
| 10 | analog | 60 | 60 | ja |
| 10 | gemischt | 60 | 60 | ja |
| 25 | logik | 60 | 60 | ja |
| 25 | analog | 60 | 60 | ja |
| 25 | gemischt | 59 | 59 | ja |
| 50 | logik | 59 | 47 | ja |
| 50 | analog | 60 | 57 | ja |
| 50 | gemischt | 49 | 25 | nein (Rückstand in 36 % der Bilder) |
| 100 | logik | 29 | 21 | nein (Rückstand in 99 % der Bilder) |
| 100 | analog | 60 | 23 | ja |
| 100 | gemischt | 38 | 15 | nein (Rückstand in 100 % der Bilder) |
| 200 | logik | 19 | 13 | nein (Rückstand in 100 % der Bilder) |
| 200 | analog | 37 | 13 | nein (Rückstand in 87 % der Bilder) |
| 200 | gemischt | 24 | 8 | nein (Rückstand in 100 % der Bilder) |
| 400 | logik | 10 | 7 | nein (Rückstand in 100 % der Bilder) |
| 400 | analog | 23 | 8 | nein (Rückstand in 100 % der Bilder) |
| 400 | gemischt | 16 | 5 | nein (Rückstand in 100 % der Bilder) |

«Rückstand» heisst: Die Statusleiste meldet «Rechner kommt nicht mit, Zeitfaktor senken»; die Simulationszeit läuft dann langsamer als verlangt,
die Kurven bleiben richtig. Mit kleinerem Zeitfaktor oder grösserer Schrittweite (Inspektor, «Schrittweite Δt») lassen sich auch grössere Schaltungen
bedienen.

## Was nicht gemessen wurde

Telefon und Tablet (die Messung lief im Rechner-Chromium), Oszilloskop-Fenster und Zeitverlauf gleichzeitig offen (zeichnen je ein Canvas, kosten
zusätzlich), Schaltungen über 400 Bauteile.

# Leistungsmessung Studio

## Stand 16.10.2026 (nach der Verbesserung, Nachtlauf 2)

Werkzeug unverändert: `dev/tests/leistung.js` (`node tests/leistung.js [Grössen]`), gleiche Schaltungen und gleiche Messbedingungen wie am 15.10.2026 (Chromium ohne Grafikkarte, Fenster 1440 × 900).

**Aussage:** Die Grenze der flüssigen Bedienung (mindestens 30 Bilder je Sekunde, die Simulation folgt dem Zeitfaktor ohne Rückstand) liegt jetzt bei

| | vorher (15.10.) | jetzt (16.10.) |
|---|---:|---:|
| reine Logik | 50 Bauteile | **100 Bauteile** |
| reine Analogschaltung | 100 | 100 |
| gemischt | 25 | **50** |
| mit «U-Werte»: Logik / Analog / gemischt | 25 / 50 / 25 | **100** / 50 / 25 |

**Engpass:** Der Profiler (Node, `--cpu-prof`) zeigte bei 200 Logik-Bauteilen: **50 % der Rechenzeit im Gauss-Löser, 22 % im Aufbau der dichten Matrix** (n × n Zahlen, bei jeder Iteration neu, obwohl in einer Digitalschaltung jeder Knoten nur mit der Masse gekoppelt ist und die Matrix fast nur aus Nullen besteht). Das erklärte das quadratische bis kubische Wachstum der Rechenzeit.

**Einfachste Verbesserung (umgesetzt):** Das Gleichungssystem wird dünn besetzt aufgebaut (`solveSparse` in `engine.js`): Nebendiagonale als Liste, Knoten ohne Kopplung werden einzeln gelöst (O(n)), zusammenhängende Gruppen als kleines dichtes System. Reine Analogschaltungen behalten den dichten Weg (alles hängt zusammen, dort ist er am schnellsten). Das Ergebnis ist dasselbe wie vorher (alle Tests des Rechenkerns, des Spiels und der Robustheit unverändert grün); es gibt dazu einen neuen Kern-Test für ein Bauteil mit beiden Anschlüssen am selben Knoten (hat beim Bauen einen Fehler im ersten Entwurf gezeigt).

**Was bleibt:** Bei den Logikschaltungen sind jetzt Auswerten (`evaluate`, je Iteration alle Bauteile), die Bauteilschleifen der Flipflops und das Zeichnen die grössten Posten, nicht mehr der Löser. Weitere Verbesserungen wären: `evaluate()` nur einmal je Schritt statt je Iteration aufrufen (für die Zeitlupe nötig, sonst nicht) und die Gatter nachführen, ohne jedes Mal das ganze System neu aufzubauen (nur die geänderten Ausgänge einspeisen). Mit «U-Werte» zeichnet der Schaltplan bei jedem Schritt neu; die Grenze dort bestimmt das Zeichnen.

### Rechenzeit je Schritt (Node, Millisekunden), jetzt

| Bauteile | reine Logik | reine Analogschaltung | gemischt |
|---:|---:|---:|---:|
| 10 | 0.101 | 0.045 | 0.062 |
| 25 | 0.097 | 0.061 | 0.077 |
| 50 | 0.158 | 0.074 | 0.124 |
| 100 | 0.321 | 0.136 | 0.241 |
| 200 | 0.616 | 0.297 | 0.472 |
| 400 | 1.25 | 0.743 | 0.950 |

Schritte je Sekunde, die ein Bild von 12 ms Zeitbudget schafft: 12 ms / Rechenzeit je Schritt; 60 Bilder/s ⇒ 16,7 ms je Bild.

### Bilder je Sekunde der Oberfläche, jetzt (Chromium ohne Grafikkarte, Fenster 1440 × 900)

| Bauteile | Art | Bilder/s | Bilder/s mit «U-Werte» | Simulation folgt dem Zeitfaktor |
|---:|---|---:|---:|---|
| 10 | logik | 60 | 60 | ja |
| 10 | analog | 60 | 60 | ja |
| 10 | gemischt | 60 | 60 | ja |
| 25 | logik | 61 | 60 | ja |
| 25 | analog | 60 | 60 | ja |
| 25 | gemischt | 60 | 60 | ja |
| 50 | logik | 56 | 56 | ja |
| 50 | analog | 60 | 60 | ja |
| 50 | gemischt | 60 | 50 | ja |
| 100 | logik | 53 | 52 | ja |
| 100 | analog | 60 | 28 | ja |
| 100 | gemischt | 50 | 20 | nein (Rückstand in 27 % der Bilder) |
| 200 | logik | 45 | 45 | nein (Rückstand in 9 % der Bilder) |
| 200 | analog | 51 | 17 | nein (Rückstand in 36 % der Bilder) |
| 200 | gemischt | 40 | 12 | nein (Rückstand in 100 % der Bilder) |
| 400 | logik | 37 | 34 | nein (Rückstand in 16 % der Bilder) |
| 400 | analog | 47 | 10 | nein (Rückstand in 100 % der Bilder) |
| 400 | gemischt | 40 | 7 | nein (Rückstand in 100 % der Bilder) |

### Aussage der Messung, jetzt

- logik: flüssig (≥ 30 Bilder/s, ohne Rückstand) bis 100 Bauteile, mit «U-Werte» bis 100
- analog: flüssig (≥ 30 Bilder/s, ohne Rückstand) bis 100 Bauteile, mit «U-Werte» bis 50
- gemischt: flüssig (≥ 30 Bilder/s, ohne Rückstand) bis 50 Bauteile, mit «U-Werte» bis 25


---

## Messung vom 15.10.2026 (vorher)


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

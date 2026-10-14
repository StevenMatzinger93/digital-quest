# Robustheitslauf Studio (Nacht-Paket 6a, 15.10.2026)

Werkzeug: `dev/tests/robust.js` (`node tests/robust.js [Durchläufe] [Startzahl]`). Zufällige und gezielt pathologische Schaltungen laufen durch
Netzliste, Arbeitspunkt, 40 Zeitschritte, Wechselstromanalyse bei drei Frequenzen und die Studio-Simulation (`sim.js`: Aufbau, Zurücksetzen,
acht Bilder der Bildschleife, Einzelschritte, Aufzeichnung). Feste Startzahl, damit jeder Lauf wiederholbar ist.

## Was geprüft wurde

| Prüfung | Ergebnis |
|---|---|
| Durchläufe | 2 553 mit Startzahl 20261015 und 2 553 mit Startzahl 7 (je 28 gezielt pathologisch, 2 500 zufällig, 5 aufgeklappte Zähler in je 5 Varianten); 5,7 und 5,5 Millionen Zahlenprüfungen |
| Zufallsschaltungen | 2 bis 12 Teile aus allen Bauteiltypen, Werte von 0 bis 10⁹ (auch 0 Ω, negative Spannung, 1 pF bis 1 F, 1 nH bis 100 H), alle Flipflop-Steuerungsarten, Gatter bis 8 Eingänge, Zähler 2 bis 8 Bit, Frequenzen 0,1 Hz bis 1 MHz, zufällig verdrahtet (auch Anschlüsse desselben Teils untereinander, doppelte Leitungen) |
| Absturz, unbehandelte Ausnahme | **keine** in beiden Läufen |
| NaN oder Unendlich in Spannungen, Strömen, Leistungen, Kurven, Wechselstromergebnissen | **keine** |
| «Simulation bleibt hängen» | siehe Befund 1: gefunden und behoben |
| Singuläre und unbestimmte Fälle | `Gleichungssystem nicht lösbar` trat in keinem Durchlauf auf (Gmin und die Pivot-Regularisierung der Engine fangen schwebende und unbestimmte Netze ab). Entsteht der Fehler trotzdem, fängt `sim.js` ihn ab, hält die Simulation an und zeigt den Text in der Statusleiste (`sim.err`) |

Gezielt pathologische Fälle und was das Studio meldet:

| Fall | Meldung |
|---|---|
| Bauteile ohne Leitungen (R, C, L schwebend) | keine, es fliesst nichts |
| Kurzschluss über eine Quelle, über eine Wechselquelle, zwei Quellen gegeneinander, Quellenschleife aus drei Quellen | `SHORT` |
| Widerstand 0 Ω | `SHORT` und `OVERLOAD` |
| Spule parallel zur Quelle | `SHORT` |
| Amperemeter parallel zur Quelle | `SHORT` und `AMMETER_OVERLOAD` |
| Potentiometer mit Schleifer am Rand an der Quelle | `SHORT` und `OVERLOAD` |
| Kondensator ohne Entladeweg, Kondensator nur an Kondensator, L und C ohne Dämpfung, Widerstand 10⁹ neben 10⁻³, 1 MHz an 1 pF | keine Meldung, Zahlen endlich |
| LED an 1000 V ohne Widerstand | `LED_BURNT` |
| NICHT-Glied auf sich selbst, Ringoszillator aus drei NICHT | `UNSTABLE` |
| zwei Gatterausgänge gegeneinander | `OUTPUT_CLASH` |
| preSet und preClear gleichzeitig, S = R = 1 | `FF_RS` (verbotener Zustand) |
| Flipflop und Zähler ohne Takt, Rückkopplung Q → C, RS-Speicher aus NAND, Gatter mit 8 offenen Eingängen, leere Schaltung | keine Meldung, definierte Zustände |

## Befunde

1. **Schwingende Schaltungen machten die Bildschleife ruckelig** (behoben). Eine Schaltung ohne stabilen Zustand (`UNSTABLE`, z. B. Ringoszillator,
   Gatter mit Rückführung) kostet in der Engine bis zu 400 Iterationen je Rechenschritt, je Schritt etwa 15 bis 20 ms. Die Schleife prüfte das
   Zeitbudget nur alle acht Schritte, ein Bild konnte also über 130 ms dauern. Der Lauf zeigte fünf Durchläufe über drei Sekunden.
   *Behebung:* Das Zeitbudget (12 ms je Bild) wird nach jedem Schritt geprüft; die Studio-Simulation begrenzt die Iterationen je Schritt auf 150
   (`E.step(opts.maxIter)`, Standard der Engine bleibt 400). Danach liegt das längste Bild bei 49 bis 88 ms, keine hängenden Durchläufe.

## Was offen bleibt

- Die Engine selbst (ohne `maxIter`) braucht bei einer schwingenden Schaltung weiterhin bis zu 400 Iterationen je Schritt. Das betrifft das Spiel und
  Direktaufrufe, nicht das Studio; verändert wurde dort nichts.
- Schwebende Teile und nicht angeschlossene Eingänge bleiben stumm (Eingänge lesen 0, es gibt keine «nicht angeschlossen»-Meldung). Das ist eine
  Funktion, kein Fehler; sie wurde in diesem Paket nicht ergänzt.
- Ein einzelner Rechenschritt lässt sich nicht unterbrechen; bei schwingenden Schaltungen mit sehr vielen Bauteilen dauert ein Bild deshalb bis rund
  100 ms (siehe `docs/LEISTUNG_STUDIO.md`).

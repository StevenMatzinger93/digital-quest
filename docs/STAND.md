# Stand – Digital Quest (28.09.2026)

## Grundgeruest erstellt
- **Engine** (`dev/src/engine.js`): Knotenanalyse, Spannungsquelle, Widerstand, Poti, Lampe, Schalter, Taster, LED (5 Farben), Diode, Kondensator (transient), Strommesser, Taktgeber, Gatter NICHT/UND/ODER/NAND/NOR/XOR. Schaeden (LED/Lampe durchgebrannt), Kurzschluss, Ueberlast, instabile Logik. Multimeter V/A/Ω mit Sicherung und Spannungsfreiheits-Pruefung. Zeitsimulation fuer das Oszilloskop. Aufgabenpruefung mit Messprotokoll. **33 Engine-Tests gruen.**
- **Editor** (`dev/src/editor.js`): SVG-Schaltplan, IEC-Symbole, Ziehen/Drehen/Loeschen, Leitungen per Klick, rechtwinklige Fuehrung, Live-Anzeige (LED-Leuchten, Lampenglimmen, Spannungsfarben, Tooltips mit U/I/P), Messspitzen.
- **App** (`dev/src/app.js`): Karte mit Freischaltung, Aufgabenansicht (Auftrag, Tipps, Messprotokoll, Pruefen, Diagnose), Multimeter, Eigenschaften, Oszilloskop, Theorie mit Check (80 %), Handbuch, Einstellungen (Thema hell/dunkel, Profil, Export/Import), Speicherstand mit Ereignisliste.
- **Beispielinhalte**: Kapitel 1 mit 3 Aufgaben (1.1 Lampe + Schalter, 1.2 LED-Vorwiderstand + Messung, 1.3 Strom/Spannung messen) und 2 Theorien. Sie zeigen das Format und werden durch die echten Themen ersetzt.
- **QA**: Validator 0 Fehler, Browser-Durchlauf (Theorie + 3 Aufgaben + Fehlbedienung Amperemeter + Handy) ohne Fehler.
- **Build**: `index.html` (≈ 105 KB, offline) und `web/` (PWA).

## Naechste Schritte
0. **Prioritaet (Entscheid 28.09.2026): Werkbank-Ansicht bauen** - neues Modul `dev/src/bench.js`, 2.5D werkbank-illustrierte Zweitdarstellung derselben Netzliste wie `editor.js`, Umschalt-Button Schema <-> Werkbank, Stil: echtes Elektroniklabor. Start mit den Kapitel-1-Bauteilen (Batterie, Schalter, Lampe, LED, Widerstand) und dem Multimeter. Siehe `docs/KONZEPT.md` und `docs/ENTSCHEIDUNGEN.md`.
0b. **Quick Wins (Entscheid 28.09.2026)**, gehoeren in dieselbe Bauphase wie die Werkbank: Zeitlupen-Replay (Simulationsverlauf statt nur Endergebnis speichern), Diagnose aus echten Simulationswerten, Messgeraete-Toleranz/Rauschen inkl. Average-responding- vs. TRMS-Anzeige, Sandbox-Modus. Details in `docs/ENTSCHEIDUNGEN.md`.
1. Themenliste steht (`docs/THEMEN.md`, Stand 28.09.2026) – als Naechstes: Quelldokumente in `99_inputs/` je Kapitel sichten und daraus die 10 Aufgaben + 2 Theorien pro Kapitel ableiten.
1b. **Engine-Erweiterung noetig fuer Kapitel 3** (Wechselgroessen messen: AVG/RMS/TRMS): `engine.js` kennt bisher nur Gleichspannungsquellen und einen Rechteck-Taktgeber, keine sinusfoermige Wechselspannungsquelle. Ohne AC-Quelle plus Mittelwert-/Effektivwert-Berechnung bleibt das Thema reine Theoriefrage ohne echten Messaufbau. Vor Kapitel 3 einplanen.
2. Theoriedokumente in `theorie/` sichten → Lektionen und Fragen ableiten.
3. Editor Stufe 2: Knickpunkte, Zoom/Pan, Rueckgaengig, Touch-Feinschliff.
4. Komfort nach Bauplan: Touren, Glossar, Diagnose-Ausbau, Loesungsvergleich, Spaced Review.
5. Bauteile/Messgeraete je nach Themen (Transistor, Relais, Flipflops, Zaehler, 7-Segment, Funktionsgenerator, 2-Kanal-Oszi).
6. Welt und Figuren festlegen, Kapitel-Intros schreiben.
7. Steckbrett-Ansicht (Fritzing-Gefuehl).

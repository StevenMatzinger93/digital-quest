# Marktanalyse – bestehende Simulations-/Lerntools (Stand 28.09.2026)

Recherche zur Einordnung von Digital Quest gegenüber heute genutzten Werkzeugen. Grundlage fuer den Werkbank-Entscheid in `docs/ENTSCHEIDUNGEN.md`.

## Kategorie 1 – Profi-SPICE-Tools
LTspice, TINA, Multisim, Proteus, HSPICE, SIMetrix. Staerke: industriegenaue Simulation, riesige Bauteilbibliotheken. Schwaeche fuer unseren Zweck: textlastige, ingenieurshafte Oberflaechen ohne didaktische Fuehrung, kein Story-/Aufgaben-Rahmen, kein "Bauteil geht kaputt"-Lernprinzip; Proteus/Multisim kostenpflichtig. Werkzeuge fuer Ingenieure, nicht fuer Einsteiger.

## Kategorie 2 – anschauliche Elektronik-Tools
- **Fritzing**: Simulator nur Gleichstrom, offiziell Beta, nur Bauteile aus separatem "SIM Parts"-Satz simulierbar, Schaltplan-Stromquellen liefern keine Spannung (echte DC-Netzteile noetig).
- **Tinkercad Circuits**: huebsche, laborähnliche Steckbrett-Optik, virtuelle Instrumente, aber kein Bauteilausfall, kein echtes Fehlbedienungs-Feedback, nicht fuer Digitaltechnik auf Gatterebene gedacht.
- **EveryCircuit**: schoene animierte Strom-/Spannungsdarstellung, fortgeschrittene Funktionen kostenpflichtig, keine Kurs-Struktur.

## Kategorie 3 – Digitaltechnik-spezifische Simulatoren
- **Logisim Evolution / Digital (Helmut Neemann)**: Gatter, Flipflops, Logikanalysator, Wahrheitstabellen – reine Desktop-Programme, klassische Schaltplan-Oberflaeche, kein Browser, keine Werkbank-Optik.
- **CircuitVerse**: browserbasiert, Klassen-/Aufgaben-Verwaltung, Timing-Diagramme; ANSI- statt IEC-Notation, rein schematisch.
- **DigiSim.io**: narrative Lektionen (mehrsprachig), CPU-Lehrbausteine, Steckbrett-Optik – aber proprietaer, stark eingeschraenkte Gratis-Version (16/61 Bauteile), pädagogisch abstrahiert statt an echter Hardware-Optik orientiert.

## Sonderfall PhET Circuit Construction Kit (AC/DC)
Kostenlose Lernsimulation der University of Colorado mit **Umschalten zwischen Schaltplan-Ansicht und "lifelike" Werkbank-Ansicht derselben Schaltung**, inkl. realistischem Ampere-/Voltmeter – zeigt, dass unser Kernprinzip pädagogisch funktioniert und erprobt ist. Umfang bleibt aber auf elektrotechnische Grundlagen beschraenkt (Reihen-/Parallelschaltung, Ohm'sches Gesetz, RLC): keine Digitaltechnik, keine Gatter/Flipflops, keine Fehlerdiagnose-Aufgaben mit durchgebrannten Bauteilen, keine Quest-Struktur (Geschichte, Kompetenz-Tags, Zertifikat).

## Einordnung Digital Quest
Keines der recherchierten Tools deckt die Kombination ab: dieselbe Live-Engine treibt Schaltplan **und** eine laborechte Werkbank-Ansicht an, ueber **beide** Bereiche Elektrotechnik **und** Digitaltechnik hinweg, mit Bauteilausfall und Messgeraet-Fehlbedienung als bewusstem Lernmoment, eingebettet in eine Quest-Struktur (Geschichte, Boss-Aufgaben, Kompetenz-Tags, automatisch pruefender Validator). Die Zutaten existieren verteilt bei anderen (PhET: Ansicht-Umschaltung; Logisim/Digital: Gatter-Tiefe; DigiSim: Kurs-Erzaehlung + Steckbrett-Optik; Fritzing: Multimeter-Idee) – niemand buendelt das zu einem durchgaengigen, geprueften Kurs ueber beide Fachbereiche. Reale, aktuell unbesetzte Nische.

Zu beobachten: DigiSim.io ist die aktivste kommerzielle Konkurrenz in diese Richtung. PhET zeigt zugleich, dass "Schema ⇄ Werkbank" allein noch kein Alleinstellungsmerkmal ist – der eigentliche Unterschied ist die Kombination mit Fehlerdiagnose-Paedagogik und Digitaltechnik-Tiefe.

## Quellen
- Circuit Construction Kit: AC – PhET Interactive Simulations (phet.colorado.edu)
- The Best Circuit Simulation Software: An Expert Review – Medium (adeptisacademy)
- 10 Tools Compared: Best Circuit Simulation Software (2026) – gitnux.org
- The Best Digital Logic Simulators in 2026 – digisim.io
- Software fuer den Einstieg in die Digitaltechnik – oer-informatik.de
- Simulating Circuits with Fritzing – blog.fritzing.org

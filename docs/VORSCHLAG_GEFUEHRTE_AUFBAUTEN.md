# Vorschlag: Geführte Übungsaufbauten in der Freien Werkbank (Testlauf 2, Phase 6)

Stand 16.10.2026 · **nur Vorschlag – kein Code vor Stevens OK**

## Wunsch

Davi (Testlauf 2): «In der Freien Werkbank ein paar detaillierte Übungsaufbauten, die wie in einem Video aufgebaut und erklärt werden, zum Nachbauen.»

## Idee in einem Satz

Der vorhandene **Vorführ-Modus** (Auftrag 6, Phase 6: Spitzen gleiten, Anzeige, Rechenweg, Tempo/Pause/Schritt/Abbrechen) wird vom **Messen** auf das **Aufbauen** erweitert: Bauteile erscheinen nacheinander, Leitungen werden gezogen, je Schritt ein Satz – danach «Selbst nachbauen» mit Vergleich.

## Ablauf für Lernende

1. Freie Werkbank → neuer Knopf **«Übungsaufbauten»** → Liste mit 3–5 Aufbauten (Titel, Dauer ca. 1–2 min, Bild).
2. **Ansehen:** Die Arbeitsfläche wird leer, ein Bauteil nach dem anderen «fliegt» aus der Palette an seinen Platz, Leitungen werden Stück für Stück gezogen (dieselbe Darstellung wie beim Bauen von Hand). Unten steht je Schritt **ein Satz** («Der Vorwiderstand R1 begrenzt den Strom – er kommt zwischen Pluspol und LED.»). Bedienung wie im Vorführ-Modus: Tempo 0,5× / 1× / 2×, Pause, Einzelschritt vor/zurück, Abbrechen. Am Ende misst die Vorführung einmal (vorhandene Spitzen-Animation).
3. **Selbst nachbauen:** Die Fläche wird geleert (nur Quelle bleibt, wenn gewünscht). Ein Knopf **«Vergleichen»** prüft, ob der eigene Aufbau elektrisch dasselbe ist (nicht dieselbe Lage!) und nennt den ersten Unterschied («Die LED ist verkehrt herum eingebaut.», «R1 fehlt zwischen B1.+ und D1.a.»). Der Aufbau bleibt danach in der Freien Werkbank und lässt sich als Aufbau speichern (Phase 5.3).
4. Kein Einfluss auf Sterne, Coins oder Fortschritt (wie die Freie Werkbank).

## Datenformat (Vorschlag)

Neue Inhaltsdatei `src/content/aufbauten.js`, je Aufbau:

```js
{ id: 'A1', title: 'LED mit Vorwiderstand', minutes: 1,
  start: { parts: [], wires: [] },                       // leer oder z. B. nur die Batterie
  steps: [
    { add: { id: 'B1', type: 'battery', value: 9, x: 200, y: 300, rot: 0, bench: { x: 260, y: 440 } }, text: 'Die 9-V-Batterie ist die Quelle.' },
    { add: { id: 'R1', type: 'resistor', value: 470, x: 360, y: 220, rot: 0 }, text: 'Der Vorwiderstand R1 begrenzt den Strom.' },
    { add: { id: 'D1', type: 'led', props: { color: 'rot' }, x: 520, y: 300, rot: 90 }, text: 'Die LED: Anode oben, Kathode unten.' },
    { wire: ['B1.p', 'R1.a'], text: 'Vom Pluspol zum Widerstand …' },
    { wire: ['R1.b', 'D1.a'] }, { wire: ['D1.k', 'B1.n'], text: '… und zurück zum Minuspol: Der Kreis ist geschlossen.' },
    { probe: { mode: 'V', a: 'D1.a', b: 'D1.k' }, text: 'An der LED liegen etwa 1,9 V.' }
  ],
  compare: { tests: [ { sel: 'D1', on: true }, { a: 'D1.a', b: 'D1.k', v: [1.7, 2.1] } ] }   // optional zusätzlich zum automatischen Vergleich
}
```

* Der Validator prüft: IDs eindeutig, Typen und Anschlüsse vorhanden, jeder Schritt baut auf dem vorigen auf, das Endbild läuft ohne Störung, `compare`-Tests bestehen am Endbild.
* **Vergleich «elektrisch gleich»:** Endbild und eigener Aufbau werden mit derselben Engine gerechnet; verglichen werden die Bauteile je Typ und Wert sowie die Knotenspannungen bzw. Ströme an jedem Bauteil (Zuordnung über Typ+Wert, nicht über die ID). Damit zählt auch ein gespiegelter oder anders benannter Aufbau.

## Beispiel-Aufbauten (Vorschlag)

| # | Aufbau | Schritte | Was man lernt |
|---|---|---|---|
| A1 | LED mit Vorwiderstand | 7 | Stromkreis schliessen, Polarität, Spannung an der LED messen |
| A2 | Spannungsteiler | 8 | Reihenschaltung, Teilspannungen, Messen mit V⎓ |
| A3 | Strom messen – Multimeter in der Lücke | 6 | Leitung lösen, A⎓ in Reihe (genau die Frage aus Testlauf 2, 1.6) |
| A4 | Brückengleichrichter mit Glättung | 12 | Leiter-Form (wie T3C), Ladekondensator, Oszilloskop mit Clip an R1.b |
| A5 | RS-Flipflop aus zwei NOR-Gattern | 9 | Rückkopplung, Setzen/Rücksetzen mit Pegelschaltern |

## Aufwand (Schätzung)

| Teil | Aufwand |
|---|---|
| Abspieler (Schritte ausführen, Animation Palette → Platz, Leitung ziehen, Untertitel, Tempo/Pause/Schritt, Abbrechen) – baut auf dem Vorführ-Modus auf | 1,5 Tage |
| Datenformat, Validator-Regeln | 0,5 Tag |
| «Selbst nachbauen» + Vergleich mit verständlicher erster Abweichung | 1 Tag |
| 5 Aufbauten schreiben (Texte, Lagen Schaltplan + Werkbank) | 1–1,5 Tage |
| Tests (Smoke: jeder Aufbau läuft durch, Vergleich erkennt richtig/falsch; Handy 390 px) | 0,5 Tag |
| **Total** | **rund 4,5–5 Tage** |

## Fragen an Steven

1. Ort: Knopf in der Freien Werkbank (Vorschlag) oder als eigener Teil der Übungswerkstatt?
2. Sollen Aufbauten von Lehrpersonen zugewiesen werden können (wie Werkstatt-Stationen)? Mehraufwand ca. 0,5 Tag.
3. Liste A1–A5 so übernehmen oder andere Schwerpunkte?
4. Ton (Vorlesen der Schritt-Sätze mit der Browser-Stimme wie bei den Lektionen)? Mehraufwand gering (0,25 Tag).

---

# Vorschlag: Leitungen mit Zwischenpunkten (Testlauf 2, Phase 5.5)

**Nur Vorschlag mit Aufwandschätzung – nicht umgesetzt.** Umgesetzt sind die günstigen Hilfen: Netz beim Darüberfahren hervorheben, Leitungsfarbe wählbar, Leitungen im Schaltplan rechtwinklig und – neu – mit dem Weg, der weniger Bauteile durchquert.

* **Daten:** Leitung `{ from, to, via: [[x, y], …] }` (Schaltplan-Koordinaten, auf das Raster gerastet). Die Engine liest weiter nur `from`/`to`; Prüfung und Server bleiben unberührt.
* **Bedienung:** Ziehen an einem Leitungsstück legt einen Zwischenpunkt an, Ziehen am Punkt verschiebt ihn, Doppelklick löscht ihn; Touch: langes Drücken. Zwischenpunkte zählen im Rückgängig-Verlauf mit.
* **Zeichnen:** rechtwinklig von Punkt zu Punkt (Schaltplan); auf der Werkbank laufen die Kabel als Bogen durch die Punkte (umgerechnet mit `autoBench`) oder ignorieren sie (zu entscheiden).
* **Schwierig:** Verschiebt man ein Bauteil, bleiben die Punkte stehen → Leitung wird «krumm». Lösung: Punkte relativ zum näheren Anschluss mitführen oder beim Verschieben die Punkte der betroffenen Leitungen verwerfen (einfacher, Vorschlag).
* **Aufwand:** Daten + Zeichnen 0,5 Tag; Bearbeiten mit Maus/Touch, Raster, Rückgängig 1–1,5 Tage; Werkbank-Darstellung 0,5 Tag; Tests 0,5 Tag → **2,5–3 Tage**.
* **Empfehlung:** erst nach Rückmeldung zu den günstigen Hilfen entscheiden – sie lösen den Kern der Meldung 12.1 («nur von–bis bestimmbar») bereits: Darüberfahren zeigt das ganze Netz.

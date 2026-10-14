# Digital Quest Studio – Bedienungsanleitung

Das Studio ist ein Schaltungssimulator zum freien Bauen, Simulieren und Messen: Gleichstrom, Zeitverlauf, Wechselstrom, Digitaltechnik bis zu Zählern.
Es ist kein Spiel – es gibt keine Kapitel, keine Punkte, kein Konto. Du brauchst nur die Datei `studio.html` (oder die Seite `/studio/`), sie läuft ohne Netz.

## 1. Starten

`studio.html` im Browser öffnen. Links liegen die Bauteile, in der Mitte die Zeichenfläche, rechts die Eigenschaften, unten der Zeitverlauf.
Die Simulation läuft sofort. **Beispiele** im Menü zeigen fertige Schaltungen – am schnellsten lernst du, wenn du die Digitaluhr oder das RC-Glied öffnest und daran herumprobierst.

## 2. Bauen

- **Bauteil setzen:** links anklicken (kommt in die Mitte) oder auf die Zeichenfläche ziehen.
- **Leitung ziehen:** zwei Anschlüsse nacheinander anklicken. Ein Klick auf eine Leitung wählt sie, **Entf** löscht sie.
- **Bewegen:** Bauteil ziehen. **R** dreht, **Entf** löscht. Ziehen auf leerer Fläche verschiebt den Ausschnitt, **Strg + Mausrad** oder zwei Finger zoomen, Doppelklick auf leere Fläche passt alles ein.
- **Werte ändern:** Bauteil anklicken, rechts den Wert eintippen. Vorsätze gehen: `4k7`, `100n`, `2,2u`, `1M`, `10m`.
- **Mehrere auswählen:** **Strg + A** wählt alles, **Umschalt + Klick** fügt Bauteile hinzu. **Strg + C / Strg + V** kopiert und fügt versetzt ein, die **Pfeiltasten** verschieben um ein Raster, **Entf** löscht die ganze Auswahl.
- **Rückgängig:** **Strg + Z**, **Strg + Y** (oder **Strg + Umschalt + Z**) wiederholt. Bis zu 200 Schritte, auch beim Aufklappen eines Zählers und beim Laden. Probiere ruhig aus.
- **Zwischenspeichern:** Das Studio sichert deine Schaltung alle paar Sekunden im Browser. Beim nächsten Start fragt es, ob es sie wiederherstellen soll. (Ist der Browserspeicher gesperrt, läuft alles trotzdem, nur ohne Sicherung.)

Die Zeichenfläche ist 2400 × 1500 gross. Ein **Masse-Symbol** brauchst du nur, wenn du einen Bezugspunkt festlegen willst; ohne Masse gilt der Minuspol der ersten Quelle.

## 3. Simulation und Zeit

| Knopf | Wirkung |
|---|---|
| **Pause / Start** (Leertaste) | hält die Simulation an oder lässt sie laufen |
| **Schritt** | rechnet genau einen Schritt |
| **Zurück** | setzt auf Zeit 0: Kondensatoren leer, Spulen stromlos, Flipflops und Zähler auf 0, durchgebrannte Bauteile wieder heil |
| **Zeit:** | wie schnell die Simulationszeit läuft: Auto, Zeitlupe (1/10 000 … 1/10), Echtzeit, Zeitraffer (10 … 1000). **Auto** wählt aus Frequenz und Zeitkonstanten selbst |
| **Taktgeber … Hz** | stellt alle Taktgeber auf einmal um |

Die Rechenschrittweite Δt wählt das Studio selbst («auto»). Willst du genauer oder schneller rechnen, trägst du rechts bei «Rechenschritt» (nichts ausgewählt) einen Wert ein. Meldet die Statusleiste **«Rechner kommt nicht mit»**, senke den Zeitfaktor.
Flüssig läuft es bis etwa **50 Bauteile** (siehe `docs/LEISTUNG_STUDIO.md`).

**Schieberegler:** Bauteil anklicken, unten bei «Schieberegler» ein Häkchen setzen. Bereich, linear oder logarithmisch und Schrittweite stellst du selbst ein. Der Regler steht in der Leiste unter der Werkzeugleiste und wirkt sofort, während die Simulation läuft – Kurve und Messwerte wandern mit.

## 4. Messen

Wähle das Werkzeug **Messen** und klicke einen Anschluss (Spannung gegen den Bezugspunkt) oder ein Bauteil (Spannung oder Strom, rechts neben dem Werkzeug wählbar). Das Signal landet je nach **Ziel** im Oszilloskop, im Bode-Diagramm oder im Zeitverlauf («Auto»: digitale Anschlüsse in den Zeitverlauf, analoge ins Oszilloskop).

**Oszilloskop** (Knopf «Oszilloskop»): beliebig viele Fenster, an der Titelleiste verschiebbar, an der Ecke vergrösserbar. Zeitbasis und Höhe stellen sich selbst ein («Auto»), von Hand wählbar.
**Anhalten** friert das Bild ein, **Cursor** zeigt Zeit- und Spannungsdifferenz. **τ bestimmen** legt die Cursor auf Anfang und 63,2 % der letzten Lade- oder Entladekurve und liest die Zeitkonstante ab (R · C bzw. L / R).

**Bode-Diagramm** (Knopf «Bode»): Frequenzgang aus der Wechselstromanalyse, Verstärkung in dB und Phase in Grad über logarithmischer Frequenz. Reiz ist 1 V an der ersten Wechselspannungsquelle. **−3 dB markieren** zeigt die Grenzfrequenz(en). Ändern sich Werte, rechnet das Diagramm neu.

**Zeitverlauf** (unten): digitale Signale untereinander, dazu **Zählerstand** als Zahl. «Takt und Ausgänge» fügt alles Passende ein; mit den Häkchen markierst du Zeilen und fasst sie zum Zählerstand zusammen (oberste markierte Zeile = niederwertigstes Bit). ▲ ▼ ordnen um.
Die **Laufzeit** der Flipflops (20 ns je Stufe) ist bei langsamen Takten unsichtbar klein. Zwei Wege: **hineinzoomen** (Auswahl «Zeit/Div» bis 1 ns/Div) oder **«Laufzeit überhöht»** (×10³, ×10⁶, ×10⁷). Dann ist der Zeitverlauf rot gerahmt – das sind nicht die echten Werte, die Zählfolge bleibt dieselbe.

Mit **U-Werte** stehen die Spannungen an allen Anschlüssen im Schaltplan.

## 5. Digitaltechnik

- **Pegelschalter** (Klick legt um) sind Eingänge, **Logikanzeigen** Ausgänge, Leitungen sind bei 1 grün.
- **Gatter** (UND, ODER, NICHT, NAND, NOR, XOR, XNOR): rechts stellst du die Zahl der Eingänge ein (2 bis 8). Offene Eingänge lesen 0.
- **Flipflops** D, T, JK, RS und JK-Master-Slave mit **preSet (PS)** und **preClear (PC)**, beide aktiv bei 1. Die **Steuerungsart** wählst du je Flipflop: Flanke steigend ↑, Flanke fallend ↓ oder Taktzustand (übernimmt solange C = 1); JK-MS schaltet bei fallender Taktflanke.
- **Verbotene Zustände** werden rot markiert («verboten») und im Klartext erklärt: **S = R = 1** beim RS-Flipflop (der Zustand bleibt) und **preSet und preClear zugleich** (Q und Q̄ gehen beide auf 1; beim Wegnehmen eines Eingangs gilt der verbleibende).
- **Zähler** als fertige Bausteine: asynchron, synchron, Dezimal (BCD), Johnson, Modulo-n. **Doppelklick** (oder «Aufklappen» rechts) ersetzt den Kasten durch seine Flipflops und Gatter, verdrahtet, an derselben Stelle – nicht rückgängig zu machen ausser mit Strg + Z.
- **BCD-7-Segment-Decoder** und **7-Segment-Anzeige** liegen unter «Anzeigen».
- **Inspektor** (rechts): zu jedem Gatter, Flipflop und Zähler die Funktion, die **Analysetabelle** (aktive Zeile hervorgehoben), die **Ansteuertabelle** (X = beliebig) und das **Zustandsfolgediagramm**.

## 6. Logik: Ausdruck, Tabelle, KV-Diagramm (Knopf «Logik»)

Schreibweise wie im Lehrmittel: **ODER = v**, **UND = Nebeneinanderstellen** (`e1e2`), **NICHT = Überstreichung**, Eingänge `e1, e2 …`, Ausgang `A`, **UND kommt vor ODER**. Beispiel: `A = e1 ( e2 v e3 ) = e1e2 v e1e3`.
Tippen kannst du auch `/e1` oder `!e1` für NICHT, `*` für UND und `+` für ODER; angezeigt wird immer die Lehrmittel-Schreibweise.

- **Schaltung erzeugen:** aus dem Ausdruck entsteht eine Schaltung (NICHT vor einer Klammer wird zum NAND/NOR). Stehen mehrere Ausdrücke mit `=` hintereinander, prüft das Studio, ob sie gleichwertig sind (De Morgan, Absorption …).
- **Ausdruck ablesen:** liest aus der gebauten Schaltung den Ausdruck (XOR wird in UND, ODER, NICHT aufgelöst; bei Rückkopplung gibt es eine Meldung).
- **Wahrheitstabelle und KV-Diagramm:** rechnet alle Kombinationen der Pegelschalter durch, zeigt die Tabelle, das KV-Diagramm mit den Päckchen und die **Minimalform**. Gilt für Schaltungen ohne Gedächtnis (bis 6 Eingänge, KV bis 4).

## 7. Dateien, Export, Drucken, Stückliste (Menü Datei)

- **Speichern** (Strg + S) schreibt eine lesbare Datei `Name.dqstudio.json`; **Öffnen** (Strg + O) oder Datei aufs Fenster ziehen. Ältere Dateiformate werden umgewandelt, Dateien aus neueren Versionen mit einer Meldung abgelehnt. **Name …** benennt die Schaltung.
- **Exportieren:** SVG (für Word, verlustfrei) oder PNG (doppelte Auflösung), in **Farbe** oder **Schwarzweiss**, mit oder ohne Messwerte (Spannungen an den Anschlüssen).
- **Drucken** (Strg + P): Schaltplan auf A4 quer, schwarzweiss, mit Titelfeld (Name, Datum, Namensfeld).
- **Stückliste:** Bauteil, Wert, Anzahl und Bezeichnungen als Tabelle und als CSV (öffnet in Excel).

## 8. Aufgabe stellen (Datei → Aufgabe stellen …)

Baue die **richtige** Schaltung, dann:
1. **Werte verbergen:** angekreuzte Werte stehen nicht im Klartext in der Aufgabe; die Schaltung rechnet aber damit. Die Lernenden messen und tragen den Wert in das Aufgabenfenster ein (Toleranz 5 %).
2. **Störung einbauen:** Leitung unterbrechen, falscher Wert oder vertauschte Anschlüsse. Sie wirkt in der Aufgabe, steht dort aber nirgends.
3. Das Studio speichert **zwei Dateien**: die Aufgabe (`….aufgabe.dqstudio.json`, für die Lernenden) und die Lösung (`….loesung.dqstudio.json`, nur für dich).

Die Lernenden öffnen die Aufgabendatei wie jede andere Datei; Bauteilwerte erscheinen als «?». Die Lösung lässt sich getrennt öffnen: sie zeigt die richtige Schaltung, die Werte und die eingebauten Störungen mit Ursache und Symptom.
**Grenze:** Die verborgenen Werte sind verschleiert, nicht verschlüsselt. Das schützt vor dem Blick in die Datei, nicht vor jemandem, der sie mit einem Programm entschlüsselt.

## 9. Überlastung

Bauteile, die zu viel abbekommen, werden **markiert** und die Statusleiste sowie die Eigenschaften erklären, was passiert ist und warum: Lampe durchgebrannt (ab dem 2-fachen der Nennleistung), LED in Sperrrichtung oder durchgebrannt (kein Vorwiderstand), Widerstand überlastet, Kurzschluss an einer Quelle, Strommesser parallel zur Quelle. **Zurück** macht durchgebrannte Bauteile wieder heil.

## 10. Beamer

**Ansicht → Beamer-Modus** oder **F9**: dickere Linien, grössere Schrift, höherer Kontrast, grössere Knöpfe. Die Schaltung ändert sich nicht.

## 11. Tastenkürzel

Hilfe → **Tastenkürzel** zeigt die Liste: Strg + Z / Y, Entf, R, Esc, Strg + A / C / V, Umschalt + Klick, Pfeiltasten, Leertaste, F9, Strg + S / O / P.

## 12. Beispiele

Digitaluhr (Sekunden 00 bis 59), Asynchroner Zähler mit Zeitverlauf, RC-Glied an Rechteckquelle, RC-Tiefpass: Bode-Diagramm, Reihenschwingkreis: Resonanzkurve, Schwingkreis aus L und C, Spannungsteiler, Halbaddierer.

## 13. Grenzen

- Gatter haben keine Laufzeit, nur Flipflops und Zähler (20 ns je Stufe, einstellbar). Im Stillstand wirken Flipflops sofort.
- Dioden, Transistor und Logik sind einfache, stückweise lineare Modelle (kein Operationsverstärker, keine Rausch- oder Monte-Carlo-Analyse).
- Die Wechselstromanalyse behandelt Dioden und Transistor mit dem Kleinsignalwert ihres Arbeitspunkts, Logik gar nicht.
- Über etwa 50 Bauteile (gemischte Schaltungen 25) kann die Simulation hinterherhinken; Zeitfaktor senken hilft.
- Verborgene Werte einer Aufgabe sind verschleiert, nicht verschlüsselt (Abschnitt 8).
- Es gibt kein Leiterplatten-Layout, kein VHDL, keine Mikrocontroller-Emulation.

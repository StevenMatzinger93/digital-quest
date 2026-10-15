# Digital Quest Studio – Bedienungsanleitung

Das Studio ist ein Schaltungssimulator zum freien Bauen, Simulieren und Messen: Gleichstrom, Zeitverlauf, Wechselstrom, Digitaltechnik bis zu Zählern.
Es ist kein Spiel – es gibt keine Kapitel, keine Punkte, kein Konto. Du brauchst nur die Datei `studio.html` (oder die Seite `/studio/`), sie läuft ohne Netz.

## 1. Starten

`studio.html` im Browser öffnen. Links liegen die Bauteile, in der Mitte die Zeichenfläche, rechts die Eigenschaften, unten der Zeitverlauf.
Die Simulation läuft sofort. **Beispiele** im Menü zeigen fertige Schaltungen – am schnellsten lernst du, wenn du die Digitaluhr oder das RC-Glied öffnest und daran herumprobierst.

## 2. Bauen

- **Bauteil setzen:** Die Bauteilleiste liegt oben, mit Registerkarten **Logik · Flip-Flops · Zähler · Anzeigen · Analog** (dazu «Verbindung» und «Zeichnen»). Bauteil anklicken – es hängt am Zeiger –, dann auf die Zeichenfläche klicken. Jeder weitere Klick setzt dasselbe Bauteil noch einmal, **R** dreht es vor dem Setzen, **Esc** beendet. Oder ein Bauteil aus der Leiste auf die Fläche ziehen. **Auf eine Leitung** gesetzt oder gezogen, wird ein Zweipol (Widerstand, Kondensator, Spule, Diode, Schalter …) in die Leitung eingefügt: die Stelle leuchtet grün auf, das Bauteil richtet sich nach der Leitung aus; Bauteile mit mehr Anschlüssen liegen nur daneben. Auch ein schon gesetztes, noch unverdrahtetes Zweipol-Bauteil lässt sich auf eine Leitung ziehen. Rückgängig stellt die ungeteilte Leitung wieder her.
- **Leitung ziehen:** zwei Anschlüsse nacheinander anklicken. Ein Klick auf eine Leitung wählt sie, **Entf** löscht sie.
- **Leitung auf Leitung (Knotenpunkt):** Ist eine Leitung im Entstehen, klickst du auf eine bestehende Leitung: Dort entsteht ein **Knotenpunkt**, die getroffene Leitung wird geteilt. Ein Vorschaupunkt zeigt vorher, wo er entsteht. Umgekehrt: von einer Leitung **wegziehen** (oder **Alt + Klick**) setzt dort einen Knoten und beginnt eine neue Leitung. Rechtsklick auf eine Leitung: «Knotenpunkt hier setzen». Auch aus der Leiste («Verbindung → Knoten») lässt er sich setzen. Knoten lassen sich verschieben, die Leitungen folgen. Löschst du einen Knoten mit genau zwei Leitungen, werden sie wieder zu einer. **Wie im Schaltplan nach IEC/DIN: Punkt = verbunden, Kreuzung ohne Punkt = nicht verbunden.**
- **Maus (wie in anderen CAD-Programmen):**
  - **Mausrad** zoomt, zum Mauszeiger hin.
  - **Rechte Taste gehalten und ziehen** (oder **mittlere Taste**) schiebt die Zeichenfläche. Ein Rechtsklick ohne Ziehen (weniger als 4 Bildpunkte) öffnet das Menü für Signale (siehe «Messen»); das Browsermenü gibt es dort nicht.
  - **Linke Taste auf leerer Fläche ziehen** zeichnet einen Auswahlrahmen; alles darin wird ausgewählt. **Umschalt** zum Rahmen oder zum Klick fügt hinzu bzw. nimmt heraus.
  - **Linke Taste auf einem Bauteil ziehen** verschiebt es; ist es Teil einer Auswahl, bewegt sich die ganze Auswahl, die Leitungen bleiben hängen.
  - Mauszeiger: Pfeil über leerer Fläche, Kreuz über einem Anschluss, Verschiebekreuz über einem Bauteil, Hand beim Schieben.
  - Auf Tablet und Handy: zwei Finger zoomen, ein Finger auf leerer Fläche schiebt, langes Drücken öffnet das Signal-Menü.
- **Drehen, löschen, einpassen:** **R** dreht, **Entf** löscht, Doppelklick auf leere Fläche passt alles ein.
- **Werte ändern:** Bauteil anklicken, rechts den Wert eintippen. Vorsätze gehen: `4k7`, `100n`, `2,2u`, `1M`, `10m`.
- **Mehrere auswählen:** **Strg + A** wählt alles, **Umschalt + Klick** fügt Bauteile hinzu. **Strg + C / Strg + V** kopiert und fügt versetzt ein, die **Pfeiltasten** verschieben um ein Raster, **Entf** löscht die ganze Auswahl.
- **Rückgängig:** **Strg + Z**, **Strg + Y** (oder **Strg + Umschalt + Z**) wiederholt. Bis zu 200 Schritte, auch beim Aufklappen eines Zählers und beim Laden. Probiere ruhig aus.
- **Zwischenspeichern:** Das Studio sichert deine Schaltung alle paar Sekunden im Browser. Beim nächsten Start fragt es, ob es sie wiederherstellen soll. (Ist der Browserspeicher gesperrt, läuft alles trotzdem, nur ohne Sicherung.)

**Zeichenelemente (Text, Linie, Pfeil, Rechteck, Ellipse):** In der Bauteilleiste unter «Zeichnen». Anklicken legt das Element in die Bildmitte, oder auf die Zeichenfläche ziehen. Dann
- **verschieben:** Element ziehen (Rechteck und Ellipse am Rand anfassen – in die Fläche klickst du hindurch auf das Bauteil darunter),
- **Grösse ändern:** die Griffe an den Ecken bzw. Enden ziehen,
- **einstellen:** rechts Farbe (Palette aus den Studio-Farben oder freie Farbwahl), Stärke, durchgezogen oder gestrichelt, Pfeilspitze; beim Rechteck und bei der Ellipse **Rand und Füllung getrennt**, die Füllung auch durchscheinend; beim Text Grösse, fett und mehrzeilig (Doppelklick springt ins Textfeld),
- **Reihenfolge:** «Ganz nach vorn / Eins nach vorn / Eins zurück / Ganz nach hinten»,
- **löschen:** Entf.

Die Elemente werden nie simuliert, stehen nicht in Netzliste und Stückliste und stören das Rechnen nicht. Der Knopf **Zeichnung: ein/aus** (oder Ansicht → Zeichenelemente anzeigen) blendet die ganze Ebene aus – so wird aus einer beschrifteten Lösung eine unbeschriftete Aufgabe. Rückgängig, Speichern, Laden, Export (SVG, PNG; Schwarzweiss rechnet die Farben in Grau um) und Druck gelten auch für die Zeichenelemente.

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

**Es gibt nur Bauen – keinen Modus.** Ein Klick auf ein Bauteil wählt es aus, mehr nicht: Er öffnet nie ein Fenster. Messen ist eine eigene Handlung. Mit **Rechtsklick** auf einen Anschluss, ein Bauteil oder eine Leitung bietet das Menü «In den Zeitverlauf», «Ins Oszilloskop», «Ins Bode-Diagramm» an. Nicht passende Ziele sind ausgegraut und sagen, warum. Auf dem Tablet: lange drücken. Im Eigenschaftenfeld hat jede Grösse bei «Messwerte jetzt» einen kleinen Knopf **⤴**, der sie in die passende Anzeige schickt. Ein leeres Oszilloskop, Bode-Diagramm oder Zeitverlauf erklärt in seiner Mitte, wie Signale hineinkommen.

**Dritter Weg:** Menü **Anzeigen**: «Alle digitalen Signale aufnehmen» und, mit einem Bauteil ausgewählt, «Auswahl ins Oszilloskop», «Auswahl in den Zeitverlauf», «Auswahl ins Bode-Diagramm». Analoge Signale kommen so ins Oszilloskop, digitale in den Zeitverlauf; der Zeitverlauf klappt dabei von selbst auf.

**Oszilloskop** (Knopf «Oszilloskop»): beliebig viele Fenster, an der Titelleiste verschiebbar, an der Ecke vergrösserbar. Zeitbasis und Höhe stellen sich selbst ein («Auto»), von Hand wählbar. **Darstellung:** «Überlappend» legt alle Kurven in ein Feld mit gemeinsamer Achse (richtig zum Vergleichen von Höhe und Phase), «Untereinander» gibt jedem Signal eine eigene Spur mit Namen links und gemeinsamer Zeitachse (richtig für Digitalsignale, dort steht an der Achse 0 und 1). Beim ersten Signal wählt das Fenster selbst – digital untereinander, analog überlappend; deine Handwahl bleibt für das Fenster bestehen.
**Anhalten** friert das Bild ein, **Cursor** zeigt Zeit- und Spannungsdifferenz. **τ bestimmen** legt die Cursor auf Anfang und 63,2 % der letzten Lade- oder Entladekurve und liest die Zeitkonstante ab (R · C bzw. L / R).

**Bode-Diagramm** (Knopf «Bode»): Frequenzgang aus der Wechselstromanalyse, Verstärkung in dB und Phase in Grad über logarithmischer Frequenz. Reiz ist 1 V an der ersten Wechselspannungsquelle. **−3 dB markieren** zeigt die Grenzfrequenz(en). Ändern sich Werte, rechnet das Diagramm neu.

**Zeitverlauf** (unten): digitale Signale untereinander, dazu **Zählerstand** als Zahl. **«Alle digitalen Signale aufnehmen»** nimmt Taktgeber, Logikanzeigen, Flipflop-Ausgänge und Zählerausgänge auf einmal auf (jeden Knoten einmal – hängt eine Lampe am Zählerausgang, steht die Lampe da, nicht beide). Dieselbe Umschaltung «Untereinander / Überlappend» wie im Oszilloskop; das erste Signal klappt einen eingeklappten Zeitverlauf auf. mit den Häkchen markierst du Zeilen und fasst sie zum Zählerstand zusammen (oberste markierte Zeile = niederwertigstes Bit). ▲ ▼ ordnen um.
Die **Laufzeit** der Flipflops (20 ns je Stufe) ist bei langsamen Takten unsichtbar klein. Zwei Wege: **hineinzoomen** (Auswahl «Zeit/Div» bis 1 ns/Div) oder **«Laufzeit überhöht»** (×10³, ×10⁶, ×10⁷). Dann ist der Zeitverlauf rot gerahmt – das sind nicht die echten Werte, die Zählfolge bleibt dieselbe.

**Alle Spannungen und Ströme auf einmal:** Der Knopf **U** (Taste **U**, Menü «Anzeigen») schreibt an jeden Knoten die Spannung gegen den Bezugspunkt in den Schaltplan, der Knopf **I** (Taste **I**) an jedes Bauteil den Strom. Der Bezugspunkt ist mit «⏚ 0 V» gekennzeichnet. Die Werte folgen der laufenden Simulation; die Beschriftungen weichen einander aus.

## Platz auf dem Bildschirm

Die Zeichenfläche bekommt die Höhe: Menü, Werkzeugleiste und Bauteilleiste sind je eine Zeile. Das **Eigenschaftenfeld** klappt mit dem schmalen Streifen **›** rechts ein und aus; der **Zeitverlauf** ist ohne Signale eingeklappt (Knopf «Zeitverlauf» oder das erste Signal öffnen ihn). Registerkarte und Eingeklapptes bleiben über Sitzungen erhalten.

**Gitternetz:** Ansicht → Gitternetz oder die Taste **G** schaltet durch: aus, **Punkte**, **Linien** (feine, helle Linien). Die **Rasterweite** (10, 20, 40, 100) stellst du im Menü Ansicht ein; der Standard 20 ist das Fangraster, in das Bauteile einrasten. Die Wahl bleibt beim nächsten Start erhalten. Im Beamer-Modus und im Druck ist das Gitter immer aus, im Export (SVG, PNG) nur mit dem Häkchen «mit Gitternetz».

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
- **Exportieren:** SVG (für Word, verlustfrei) oder PNG (doppelte Auflösung), in **Farbe** oder **Schwarzweiss**, mit oder ohne Messwerte, Gitternetz und **Zeichnungsrahmen** (dann Blatt 1 mit Rahmen und Schriftfeld).
- **Drucken** (Strg + P): siehe unten.
- **Stückliste:** Bauteil, Wert, Anzahl und Bezeichnungen als Tabelle und als CSV (öffnet in Excel).

### Zeichnungsrahmen und Schriftfeld

**Ansicht → Zeichnungsrahmen** legt ein Blatt (**A4 hoch**, **A4 quer** oder **A3 quer**) in wirklicher Grösse auf die Zeichenfläche: Blattrand, 38 Einheiten weiter innen die Rahmenlinie, unten das **Schriftfeld** (Titel, Thema, Name, Datum, Klasse, Änderung, Blatt n / N). Bei einer breiten Schaltung wählt das Studio einen Massstab (1 : 1,25 …), damit sie ins Blatt passt; **Rahmen um die Schaltung legen** wiederholt das. Der Rahmen lässt sich am Rand verschieben. **Was ausserhalb des Inhaltsbereichs liegt, kommt nicht in den Druck:** Die Fläche ausserhalb ist getönt, Bauteile dort tragen die Marke «ausserhalb». **Schriftfeld bearbeiten …** füllt die Felder aus (alle dürfen leer bleiben; Titel ist sonst der Name der Schaltung; der Knopf «heute» setzt das Datum). Rahmen, Schriftfeld und Massstab gehören zur Schaltung und stehen in der Datei.

### Drucken als Unterrichtsdokument

**Datei → Drucken** (Strg + P) öffnet den Dialog:
- **Blatt:** A4 hoch, A4 quer, A3 quer; Zeichnungsrahmen und Schriftfeld ein oder aus; Gitternetz mitdrucken (sonst nie).
- **Seiten:** Seite 1 ist immer die **Schaltung** im Rahmen, skaliert, aber nie grösser als in Wirklichkeit, darunter die Beschreibung aus dem Schriftfeld-Dialog. Für die Folgeseiten wählst du aus: **Wahrheitstabelle**, **Boolescher Ausdruck mit Minimalform**, **KV-Diagramm mit Gruppen**, **Oszilloskop-Kurven** und **Zeitverlauf** (so wie sie gerade stehen), **Stückliste**. Passt nicht alles auf eine Seite, wird umbrochen; das Schriftfeld zählt mit («2 / 3»).
- **Herleitung** (Tabelle, Ausdruck, KV) gibt es nur für **reine Logikschaltungen** aus Pegelschaltern, Gattern und Logikanzeigen (Tabelle bis 5, KV bis 4 Eingänge). Bei einer Analogschaltung oder einem Zähler sind die Punkte ausgegraut, mit Begründung in einem Satz.
- **Fassung:** **Lösung** (alles ausgefüllt, mit Absatz zum benutzten Rechenschritt, z. B. Ausklammern = konjunktives Distributivgesetz, und was er an Gattern einspart) oder **Aufgabe** (Tabelle, Ausdruck und KV-Raster bleiben als leere Vordrucke; die Kopfzeile verrät den Ausdruck nicht). So druckst du aus einer Schaltung Arbeitsblatt und Lösungsblatt.
- **Vorschau** zeigt die Seiten verkleinert. **PDF erzeugen** öffnet den Druckdialog des Browsers; dort als Ziel **«Als PDF speichern»** wählen (Blattgrösse und Ränder stehen schon im Auftrag). Schreibweise wie im Lehrmittel: ODER = v, UND = Nebeneinanderstellen, NICHT = Überstreichung, Eingänge e1, e2, e3, Ausgang A.

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

Hilfe → **Tastenkürzel** zeigt die Liste: Strg + P (Drucken), **G** (Gitternetz), Alt + Klick auf eine Leitung (Knotenpunkt), Strg + Z / Y, Entf, R, Esc, Strg + A / C / V, Umschalt + Klick, Pfeiltasten, Leertaste, F9, Strg + S / O / P.

## 12. Beispiele

Das Menü **Beispiele** ist in dieselben Gruppen gegliedert wie die Bauteilleiste: **Logik** · **Flip-Flops** · **Zähler** · **Anzeigen** · **Analog** · **Anwendungen**. Zu jedem Bauteil der Leiste gibt es eine kleine, lauffähige Schaltung (ein Test prüft das). Beim Öffnen steht oben der Name und ein erklärender Satz.

- **Logik:** UND, ODER, NAND, NOR, XOR, XNOR, NICHT – je mit Pegelschaltern und Logikanzeige; dazu `A = e1 ( e2 v e3 )`, De Morgan und der Halbaddierer.
- **Flip-Flops:** RS, D, T, JK, JK-Master-Slave mit Taktgeber, Anzeigen an Q und Q̄ und erreichbarem preSet und preClear; dazu «Takt auf vier Flipflops» mit Knotenpunkten.
- **Zähler:** asynchron, synchron, BCD, Johnson, Modulo-n – mit Lampen je Bit und fertig eingerichtetem Zeitverlauf; dazu der asynchrone Zähler aus Flipflops mit sichtbarer Laufzeit.
- **Anzeigen:** Siebensegmentanzeige mit BCD-Dekoder; Logikanzeige und Pegelschalter.
- **Analog:** Spannungsteiler, Potentiometer, Schalter und Lampe, Taster und Motor, Strommessung, LED mit Vorwiderstand, RC-Glied, RL-Glied, Schwingkreis (L und C), RC-Tiefpass (Bode), Reihenschwingkreis (Bode), Diode als Gleichrichter, Z-Diode als Begrenzer, Transistor als Schalter.
- **Anwendungen:** Digitaluhr (Sekunden 00 bis 59), Lauflicht mit Johnson-Zähler, Codeschloss.

**Vorführung:** Damit die Beispiele sofort etwas zeigen, schalten Pegelschalter, Schalter und Regler anfangs von selbst durch. Sobald du selbst etwas anfasst (Klick auf einen Schalter, Wert ändern, Bauteil bewegen), hört das auf und die Schaltung gehört dir. Die Vorführung legt keine Rückgängig-Schritte an. Der Hinweis oben lässt sich mit × schliessen.

Die Oszilloskop-Fenster eines Beispiels liegen am rechten Rand, die Schaltung steht links davon.

## 13. Grenzen

- Gatter haben keine Laufzeit, nur Flipflops und Zähler (20 ns je Stufe, einstellbar). Im Stillstand wirken Flipflops sofort.
- Dioden, Transistor und Logik sind einfache, stückweise lineare Modelle (kein Operationsverstärker, keine Rausch- oder Monte-Carlo-Analyse).
- Die Wechselstromanalyse behandelt Dioden und Transistor mit dem Kleinsignalwert ihres Arbeitspunkts, Logik gar nicht.
- Über etwa 50 Bauteile (gemischte Schaltungen 25) kann die Simulation hinterherhinken; Zeitfaktor senken hilft.
- Verborgene Werte einer Aufgabe sind verschleiert, nicht verschlüsselt (Abschnitt 8).
- Es gibt kein Leiterplatten-Layout, kein VHDL, keine Mikrocontroller-Emulation.

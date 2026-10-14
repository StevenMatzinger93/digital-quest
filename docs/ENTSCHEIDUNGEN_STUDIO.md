# Entscheidungen – Digital Quest Studio

Was `docs/AUFTRAG_STUDIO.md` Abschnitt 2 nicht regelt, steht hier mit einer Zeile Begründung. Neueste Einträge unten.

## Stufe 0 (14.10.2026)

| Entscheidung | Begründung |
|---|---|
| Quellcode in `dev/studio/` (`index.template.html`, `studio.css`, `sim.js`, `studio.js`, später `scope.js`, `timing.js` …); `build.js` hängt sie in einer festen Reihenfolge (`STUDIO_ORDER`) zusammen | Aufbau analog zu `dev/portal/`; ein Modul je Aufgabe, trotzdem eine ausgelieferte Datei |
| Offline-Datei heisst `studio.html` im Wurzelverzeichnis, gehostet unter `web/studio/index.html` (Pfad `/studio/`) | wie im Auftrag; `web/` ist bereits der Cloudflare-Ordner, kein Worker-Eingriff nötig |
| Schriften: IBM Plex nur als erste Wahl der Schrift-Kette, **nicht eingebettet**; Rückfall `system-ui` / `ui-monospace` | keine Netzabhängigkeit, und das Einbetten würde die Datei um mehrere hundert KB vergrössern; die Schrift selbst lässt sich später nachrüsten |
| Zeichenfläche des Studios 2400 × 1500 statt 1000 × 620 (`DQCircuit.SPACES.schema` wird nur im Studio verändert; `editor.js` liest die Grösse jetzt dynamisch) | die aufgeklappten Zähler und die Digitaluhr passen sonst nicht; das Spiel bleibt unverändert |
| Zusatzpunkt in `editor.js`: Option `wireColor(pid, res, pinNode)` für die Leitungsfarbe | Logikleitungen sollen bei 1 grün sein (Auftrag Abschnitt 4); ohne Option bleibt das Spiel gleich |
| `E.setGmin(g)` in `engine.js` | Der Parasitärleitwert 1e-9 S je Knoten verfälscht die Handrechnung um bis 1e-6; die Konformitätsprüfung verlangt 1e-9. Standardwert bleibt, nur `tests/kern.js` senkt ihn |
| Konformitätstoleranz 1e-9 **relativ** (plus 1e-15 absolut) | strenger als ein absoluter Wert, gilt für alle Grössenordnungen |
| Stromquelle in `kern.js` = Spannungsquelle mit ri = 1 MΩ (Norton) | der Auftrag verlangt keinen neuen Bauteiltyp in Stufe 0; die Engine kennt Quellen ohnehin nur als Norton-Ersatz |
| Studio-Menüs stehen nicht in `wegweiser_data.js` | die Pflicht gilt für Menüpunkte des Portals und Knöpfe der Labor-Kopfzeile; das Studio hat eine eigene Menüleiste. Beim Verlinken aus dem Portal kommt der Eintrag dazu |
| Die Simulation startet beim Öffnen im Zustand «läuft» | sofortiges Feedback wie bei Falstad; Pause mit Leertaste |
| `refresh()` bei Änderungen behält den Zustand (Kondensatorladung, Flipflops), die Zeit läuft weiter; «Zurück» setzt alles auf t = 0 | Umbauen im laufenden Betrieb wie im Labor |
| Im Stillstand zeigen dynamische Schaltungen eine Vorschau auf einer Kopie des Zustands | der Gleichstrom-Arbeitspunkt würde einen geladenen Kondensator als offen darstellen und damit falsche Werte zeigen |

## Stufe 1 – Simulation und Oszilloskop

| Entscheidung | Begründung |
|---|---|
| Schrittweite automatisch (`sim.js chooseDt`): Quellen T/200, R·C τ/100, L/R τ/100, L·C T0/500, sonst 1 ms; Grenzen 10 ns … 20 ms; im Inspektor überschreibbar | Rückwärts-Euler verlängert τ um etwa dt/(2τ): bei τ/100 sind es 0,5 %, damit hält die Messung 2 % ein. Quellen-ri zählt nur ohne Widerstände (sonst winzige Schritte) |
| Zeitfaktor = Simulationszeit je Echtzeitsekunde; «Auto»: vier Perioden in etwa 2 s, höchstens Echtzeit (1-2-5-Reihe) | 1-Hz-Takt läuft damit in Echtzeit, 100 Hz ruhig in Zeitlupe; Zeitlupe/-raffer als feste Stufen 1/10 000 … 1000 |
| Bildschleife: Zeitbudget 12 ms und höchstens 20 000 Schritte je Bild, Rückstand wird verworfen, die Statusleiste meldet «Rechner kommt nicht mit» | Aufschaukeln auf langsamen Geräten verhindern (Auftrag) |
| Aufzeichnung in Ringpuffern (120 000 Punkte je Signal); Oszilloskop zeichnet Hüllkurve je Bildspalte | schnelle Signale bleiben lesbar, Speicher beschränkt |
| Zeitbasis automatisch aus der Periode der Signale (steigende Durchgänge), sonst aus den Quellen, sonst wachsend; Skala 1-2-5, Amplitude wächst sofort und schrumpft erst bei mehr als 2,6-fachem Überschuss | ruhiges Bild ohne Handgriff |
| Messcursor halten die Anzeige an; «τ bestimmen» legt die Cursor auf den ruhigen Anfangswert und 63,2 % der grössten Lade-/Entladekurve | der Auftrag verlangt eine Zeitkonstante aus den Cursorn auf 2 %; von Hand zu treffen wäre fehleranfällig |
| Die Studio-Quellen werden wie im Spiel zu Beginn des Schritts ausgewertet (`solve(t = state.t)`) und nicht geändert | Spieltests hängen daran; die Verschiebung beträgt höchstens einen Schritt |
| Oszilloskop-Fenster: bis zu 8 Farben, ein Fenster je Gerät, Ziehen an der Titelleiste, Grösse mit CSS-`resize` | keine Fensterbibliothek nötig, funktioniert mit Touch |

## Stufe 2 – Spule

| Entscheidung | Begründung |
|---|---|
| `inductor`, Präfix `L`, Einheit H, Standard 10 mH; Companion-Modell dt/L parallel zu einer Stromquelle i(n−1); im Gleichstrom-Arbeitspunkt ein Kurzschluss (1 mΩ) | genau wie der Kondensator, an derselben Stelle (Auftrag) |
| Beim Zurücksetzen startet jede Spule stromlos, jeder Kondensator leer; die Anfangsanzeige wird mit dt = 1 ps gerechnet | sonst zeigt der Arbeitspunkt bei t = 0 einen Strom, den es noch nicht gibt |
| Neue Bauteiltypen tragen `studio: true`; das Spiel blendet sie in Handbuch und freier Werkbank aus, die Prüfungen von `tests/smoke.js` und `tests/tasks.js` überspringen sie | die Werkbank-Ansicht des Spiels kennt sie nicht; das Spiel bleibt unverändert |

## Stufe 3 – Digitalteil

| Entscheidung | Begründung |
|---|---|
| Gatter: Eigenschaft `inputs` (2 … 8); Anschlüsse über `E.pinsOf(type, props)`; ändert sich die Zahl, entfallen Leitungen an weggefallenen Eingängen | Tabellen (n = 2, 3, 4) in `kern.js`; das Spiel bleibt bei 2 |
| Mehr als zwei Eingänge: XOR = ungerade Zahl von Einsen, XNOR = gerade (Parität) | Standarddefinition; zwei Eingänge entsprechen dem bisherigen Verhalten |
| Offene Eingänge lesen 0 V (= 0) | wie bisher; TTL-Hochziehen wird nicht nachgebildet |
| preSet `PS` und preClear `PC` aktiv bei **1**; beide aktiv: preClear gewinnt; wirken unabhängig vom Takt | dem 5-V-Pegelmodell des Studios entsprechend; **Steven prüft** die Polarität gegen das Lehrmittel |
| `trig` je Flipflop: `pos`, `neg`, `level`; RS-Flipflop Standard `level`, JK-MS fest Master-Slave | Steuerungsarten laut Auftrag; JK-MS mit «1s-Catching» (Master folgt J/K bei C = 1) |
| `S = R = 1` beim RS-Flipflop: Zustand bleibt, Störung `FF_RS` in der Statusleiste | verbotener Zustand soll sichtbar sein, nicht still ein Wert |
| Taktzustandsgesteuert mit T = 1 oder J = K = 1: Race-Around ist erlaubt (Zeitsimulation), höchstens 20 Durchgänge je Schritt | verhält sich wie der Baustein |
| preSet/preClear zeichnet nur das Studio (`Editor.extra.async`), das Spiel bleibt unverändert | die Werkbank des Spiels hat keine solchen Anschlüsse |
| Studio meldet `NO_GROUND` nicht (`opts.noGroundFault`) | reine Digitalschaltungen haben keine Masse zum Verdrahten |

## Stufe 4 – Zähler

| Entscheidung | Begründung |
|---|---|
| Fünf Bausteine `ctr_async`, `ctr_sync`, `ctr_bcd`, `ctr_johnson`, `ctr_mod` mit Anschlüssen C (Takt), R (Rückstellen, aktiv 1), Q0 … (Q0 niederwertigstes Bit, oben) | alle aus einem Kern in der Engine, Pins aus `E.pinsOf` |
| Taktflanke und Richtung einstellbar; Bitzahl 2 … 8, Modulus 2 … 64 | Digitaluhr braucht eine fallende Flanke (Zehner taktet bei Q3 des Einers 1 → 0) |
| Aufklappen: asynchron aus D-Flipflops (D = /Q, nächste Stufe mit /Q taktet), synchron mit XOR und Übertragskette, BCD mit fest verdrahteter Logik, Johnson als Schieberegister, Modulo-n mit Quine-McCluskey und Don't-Care für unbenutzte Zustände | Kasten und Innenleben liefern dieselbe Folge (Vergleichstest, 64 Takte) |
| BCD-zu-Siebensegment-Dekoder: bestehender Typ `dec7` | war schon da, im Studio in der Gruppe «Anzeigen» |
| Das Aufklappen lässt sich nicht rückgängig machen (nur neu bauen) | Auftrag: «Der umgekehrte Weg muss nicht gehen» |

## Stufe 5 – Zeitverlauf und Inspektor

| Entscheidung | Begründung |
|---|---|
| Flipflop- und Zählerlaufzeit `tpd` (20 ns) als Ereignisse in `state.pend`, wirksam nach tpd, auch über Rechenschritte hinweg; im Arbeitspunkt sofort | der Auftrag verlangt sichtbare Laufzeit; mit Ereigniszeiten ist sie unabhängig von dt genau |
| `step(opts.iters)` liefert die Zwischenlösungen mit Zeitpunkt; der Zeitverlauf zeichnet Pegel als Treppe zu genau diesen Zeitpunkten | Flanke der höheren Stufe kommt je tpd später |
| Pegelsignale tragen den Rechenschritt-Anfang (nicht das Ende) als Zeit | die Taktflanke gehört zu t − dt, sonst scheint sie nach dem Flipflop zu kommen |
| Zählerstand-Zeile: aus markierten Zeilen (oberste = niederwertigstes Bit) oder automatisch aus allen Flipflop-Ausgängen | Zwischenwerte beim Durchlauf (7 → 6 → 4 → 0 → 8) sind echte Zwischenzustände eines Ripple-Zählers und bleiben sichtbar |
| Inspektor rechnet alle Tabellen aus den Engine-Definitionen (`logic`, `ff`, `ctrNext`); Ansteuertabelle: Eingänge, die beide Werte erlauben, werden X; Zähler: JK-Ansteuerung | keine Handeintragung, Tabelle und Verhalten können nicht auseinanderlaufen |
| Zeilenhöhe im Zeitverlauf 32 px (Maus) / 44 px (Touch) | Auftrag verlangt 44 px Mindestfläche; 32 px sind für sechs Zeilen auf dem Desktop ein Kompromiss |

## Stufe 6 – Digitaluhr

| Entscheidung | Begründung |
|---|---|
| Einer = Dezimalzähler, Zehner = Modulo-6-Zähler (fallende Flanke), getaktet von Q3 des Einers; Taktgeber 1 Hz | 9 → 0 lässt Q3 fallen, genau einmal je 10 Sekunden |
| `D` des Zehner-Dekoders an Masse | Eingang bleibt definiert 0 |
| Weitere Beispiele im Menü: asynchroner Zähler mit Zeitverlauf (1 MHz), RC-Glied, Schwingkreis, Spannungsteiler, Halbaddierer | zeigen Oszilloskop, Zeitverlauf und Logik ohne Aufbau (Stufe 8 baut die Sammlung später aus) |

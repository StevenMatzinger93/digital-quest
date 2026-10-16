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

## Nacht 14./15.10.2026

### Paket 1 – Korrekturen

| Entscheidung | Begründung |
|---|---|
| preSet und preClear zugleich: **unzulässiger Zustand**, Q und Q̄ beide 1, Meldung `FF_RS` (`why: 'async'`), Bauteil rot markiert («verboten»), Klartext im Inspektor und in der Statusleiste. Bleibt nur ein Eingang, gilt dessen Zustand; der gespeicherte Zustand bleibt während des unzulässigen Zustands erhalten. Ersetzt die frühere Regel «preClear gewinnt» | Beim 7474 und 7476 sind beide Eingänge low-aktiv; liegen beide an, gehen Q und Q̄ gemeinsam auf HIGH, und die Datenblätter führen das als unzulässige Kombination. Didaktisch ist das entscheidend: Der verbotene Zustand R = S = 1 beim RS-Flipflop ist ein Kernpunkt des Unterrichts, eine stille Auflösung nach preClear würde genau das verstecken, was die Lernenden sehen sollen |
| Eine Darstellung für beide verbotenen Zustände: derselbe Fehlercode `FF_RS`, dieselbe rote Markierung, derselbe Hinweiskasten; nur der Text nennt den Grund. Beim RS-Flipflop bleibt der Zustand bei S = R = 1 erhalten (nur markiert), beim preSet/preClear-Fall gehen die Ausgänge auf 1 | Auftrag: «eine Darstellung, nicht zwei»; das RS-Verhalten wurde nicht verändert |
| «Laufzeit überhöhen» (1×, 10³×, 10⁶×, zusätzlich 10⁷×): `opts.tpdScale` streckt die Laufzeit im Rechenschritt; Kennzeichnung rot im Zeitverlauf (Warnfeld, Rahmen) und in der Statusleiste | Die Überhöhung wirkt auf die Ereigniszeiten, nicht auf die Logik: die Zählerfolge ist identisch (Test). Bei 1 Hz und ×10⁶ liegen die Stufen genau 2 Bildpunkte auseinander (Bild 10 s auf 1000 Punkte) – knapp erkennbar; deshalb als Zugabe ×10⁷ (20 Punkte) |
| Hineinzoomen: Auswahl «Zeit/Div» im Zeitverlauf bis 1 ns/Div, die Zeitspanne steht in der Auswahl | Weg 1 des Auftrags |

### Paket 2 – Wechselstromanalyse (Stufe 7)

| Entscheidung | Begründung |
|---|---|
| `E.acSolve(layout, f, {source})` und `E.acSweep(layout, probe, {fmin, fmax, points})`: komplexe Knotenanalyse (Gauss mit Pivotsuche) auf derselben Netzliste; Arbeitspunkt aus einem Gleichstromschritt | Auftrag: eigener Rechenweg, dieselbe Netzliste |
| Reiz: 1 V Amplitude an der ersten Wechselspannungsquelle (sonst erste Spannungsquelle), andere Quellen sind Kurzschlüsse über ihren ri; die Verstärkung bezieht sich auf die Quellen-EMF, nicht auf die Klemmenspannung | bei ri = 0,05 Ω ist der Unterschied 5·10⁻⁵ bei 1 kΩ; die EMF ist die eindeutige Bezugsgrösse |
| Dioden, LED, Z-Diode: Kleinsignalwiderstand des Arbeitspunkts (leitend r_s, sonst offen); Transistor g_m = β/r_BE; Gatter und andere Logik bleiben ausser Betracht | stückweise lineare Modelle der Engine haben nur diesen einen Kleinsignalwert; ein genaueres Modell ist Sache des Operationsverstärker-Auftrags |
| Bode-Fenster: dB oben, Phase unten, logarithmische Frequenzachse 1 Hz … 1 MHz (einstellbar), 200 Stützstellen, Neuberechnung bei jeder Änderung der Schaltung; «−3 dB markieren» bezogen auf die höchste Verstärkung des ersten Kanals | gilt für Tiefpass (eine Marke) und Bandpass (zwei Marken) |
| `kern.js` bekommt die dritte Schnittstellenfunktion `ac(layout, probe, f)` | Konformität ist auch für den Wechselstromweg prüfbar |

### Paket 3 – Editorgrundlagen

| Entscheidung | Begründung |
|---|---|
| Rückgängig als Liste vollständiger Zustände der Schaltung (`JSON.stringify(layout)`), 200 Schritte; Umlegen eines Schalters zählt als Schritt | Byte-genauer Vergleich ist trivial; jede Änderung (auch Aufklappen, Laden, Einfügen) läuft durch denselben Weg `onChange` |
| Reglerziehen zählt erst beim Loslassen als Schritt, Verschieben (Pfeiltasten) je Tastendruck | sonst füllt ein Zug die Liste |
| Zwischenspeicher: `localStorage` Schlüssel `dqstudio_autosave_v1`, alle 3 s und beim Schliessen, leere Schaltung löscht ihn; nach dem Start Rückfrage; **nicht während einer Aufgabe** | Browserspeicher immer in try/catch; bei einer Aufgabe stünden sonst die verborgenen Werte im Klartext im Speicher |
| Mehrfachauswahl nur über Strg + A und Umschalt + Klick (kein Gummiband); Kopieren versetzt um 40 | genügt für Auftrag 3c; Gummiband ist eine Zugabe |

### Paket 4 – Schieberegler

| Entscheidung | Begründung |
|---|---|
| Regler je Zahlenwert über «Schieberegler» im Eigenschaftenfeld; Bereich, linear/logarithmisch, Schrittweite einstellbar; Leiste unter der Werkzeugleiste; bei Standardwerten (value, freq) logarithmisch mit Faktor 10 nach oben und unten | Falstad-ähnlich; die Leiste blendet sich ohne Regler aus |
| Während des Ziehens wird nur neu aufgebaut (`refresh(false)`), der Zustand bleibt | Simulation läuft unterbrechungsfrei, Kondensatorladung bleibt |

### Paket 5 – Dateien, Export, Drucken, Stückliste

| Entscheidung | Begründung |
|---|---|
| Format `dqstudio` Version 2 (`layout`, `name`, `sliders`); Version 1 flach (`parts`/`wires` oben), Version 0 reines Layout; höhere Versionen abgelehnt | Auftrag: ältere Dateien öffnen; die Umwandlung steht in `S.parseFile` |
| Export: eigenständiges SVG (eingebettete Stile, `XMLSerializer`, weisser Grund), PNG über Canvas mit 2-facher Auflösung; Schwarzweiss erzwingt Schwarz per `!important` | für Word sauber; mit einem strengen XML-Parser (Python `minidom`) und in Chromium geprüft |
| Druck: A4 quer, eigene `@media print`, ein Rahmen mit Schaltplan und Titelfeld (Schaltung, Datum, Name zum Eintragen) | Prüfung als PDF: eine Seite, 841,89 × 595,28 pt |
| Stückliste: gleiche Bauteile mit gleichem Wert zusammengefasst, Masse ausgenommen; CSV mit UTF-8-Marke und Semikolon | öffnet in Excel mit Umlauten |

### Paket 6 – Messungen (keine Funktion ergänzt)

Schleifenzeitbudget wird nach jedem Schritt geprüft und die Iterationen je Schritt auf 150 begrenzt (`maxIter`), weil der Robustheitslauf bei schwingenden Schaltungen Bilder über 130 ms fand. Siehe `docs/ROBUSTHEIT_STUDIO.md` und `docs/LEISTUNG_STUDIO.md`.

### Paket 7 – Überlastung

| Entscheidung | Begründung |
|---|---|
| Je Meldung drei Texte: kurz (Statusleiste), lang (Eigenschaften, mit Zahlen und Ursache), Marke am Bauteil; Bauteile mit Meldung rot gestrichelt umrandet | Auftrag: markiert, Klartext, was und warum |
| LED in Sperrrichtung bleibt eine Warnung ab 5 V (wie in der Engine `ledReverse`), wird nicht zerstört | die Engine kennt hier keine Zerstörung, nichts erfunden |

### Pakete 8 und 9 – Wahrheitstabelle, KV, Ausdruck

| Entscheidung | Begründung |
|---|---|
| `dev/studio/bool.js`: Eingabe der Schreibweise des Lehrmittels (v, Nebeneinanderstellen, Überstreichung als `<span class="ov">`), Ersatzzeichen `/ ! ¬ ' * · + ∨ ∧`, Vorrang NICHT vor UND vor ODER; Eingänge `e<Nummer>`, Ausgang `A` | verbindliche Schreibweise des Auftrags |
| Eingänge = Pegelschalter, Ausgänge = Logikanzeigen (ohne solche: freie Gatterausgänge); Namen `e<Nummer>` aus der Bezeichnung `E<Nummer>`; Tabelle bis 6 Eingänge, KV 2 bis 4 | Auftrag: automatisch erkannt |
| Tabelle über `LG.table` (`content/_logic.js`), KV und Päckchen über `DQVisuals.mount('kmap')` und `DQVisuals.minimize` aus dem Spiel; `visuals.js` und `_logic.js` sind im Studio-Build | Auftrag: nutzen, nicht neu bauen |
| NICHT vor UND/ODER wird NAND/NOR, NICHT einer Variablen ein geteiltes NICHT-Glied; XOR beim Ablesen als UND/ODER/NICHT ausgeschrieben; Rückkopplung wird gemeldet | Lehrmittel kennt kein XOR-Zeichen |
| Schaltungen mit Flipflops, Zähler oder Taktgeber: Warnung, Tabelle zeigt den Zustand beim Einschalten | die Tabelle gilt nur ohne Gedächtnis |

### Paket 10 – Beamer-Modus

Benannt wie im Portal («Beamer»); der **Vorführ-Modus** des Spiels ist etwas anderes (automatisches Vorführen einer Messung). Umschalten mit F9, Menü Ansicht oder Knopf; wirkt über `body.beamer` nur auf Darstellung (Schrift, Linien, Knöpfe, Kontrast), nicht auf die Schaltung.

### Paket 11 – Aufgabe stellen

| Entscheidung | Begründung |
|---|---|
| Zwei Dateien: `….aufgabe.dqstudio.json` (Format `dqstudio-aufgabe`) und `….loesung.dqstudio.json` (`dqstudio-loesung`, gleiche `taskId`); Aufbau der Störungen (`cause`, `symptom`) wie `bugs` in `web/data/dq_live.json` | Auftrag: getrennt; Aufbau übernommen |
| Verborgene Werte als XOR mit der Aufgabennummer und Base64 in `hiddenData`, im Klartext der Datei steht 0; die Schaltung rechnet mit den echten Werten | die Lernenden sollen messen können; echte Verschlüsselung (WebCrypto) braucht ein Passwort und einen sicheren Kontext. **Grenze offen benannt: Verschleierung, keine Sicherheit** |
| Störungen: Leitung unterbrechen, falscher Wert, vertauschte Anschlüsse (zwei Anschlüsse eines Bauteils tauschen ihre Leitungen); Symptom wird aus dem Vergleich beider Schaltungen berechnet | in der Aufgabendatei steht die Störung nirgends |
| Eingabe der verborgenen Werte im Aufgabenfenster, Toleranz 5 %; während der Aufgabe sind Wertfeld, Beschriftung und Stückliste maskiert; Speichern schreibt wieder eine Aufgabendatei (mit Antworten) | sonst verriete jedes Speichern die Werte |
| «Zur Prüfung durch Steven angemeldet» | der Arbeitsablauf hängt davon ab, wie er unterrichtet |


## Auftrag «Freier bauen und zeichnen», 15.10.2026

| Entscheidung | Warum |
|---|---|
| Knotenpunkt ist ein eigenes Bauteil `node` (Präfix K, ein Anschluss `p`, nur im Studio) und kein Zusatzfeld an Leitungen | Die Netzliste, Rückgängig, die Dateien, das Verschieben und die Stückliste-Ausnahme gehen dadurch ohne Sonderfall; eine Leitung ist weiter nur «Anschluss – Anschluss» |
| Leitung auf Leitung: Klick bei einer Leitung im Entstehen, Wegziehen von einer Leitung, Alt + Klick, Rechtsklick und Bauteil aus der Leiste | Der Auftrag nennt «beginnen oder enden» und «von Hand setzen»; Wegziehen geht auf Touch ohne Tastatur. Das einfache Anklicken einer Leitung bleibt «auswählen» (zum Löschen) |
| Der Punkt ist 3,6 Einheiten gross (Durchmesser 7,2 gegen Leitungsbreite 2,6, im Beamer-Modus 13) | Der Auftrag sagt «etwa das Doppelte der Leitungsbreite»; bei genau 5,2 war er beim Auszoomen kaum zu sehen |
| Das Umsetzen einer Leitung auf einen Knoten ist ein Rückgängig-Schritt (Leitung beenden), «Knoten setzen und weiterziehen» zwei (Knoten, dann Leitung) | Jede Handlung des Auftrags soll sich einzeln zurücknehmen lassen |
| Rechtsklick öffnet ein Kontextmenü mit allen drei Anzeigen; Touch: langes Drücken | Das ist der Weg ohne Werkzeugwechsel, den Steven suchte |
| «Alle digitalen Signale aufnehmen» nimmt Takt, Logikanzeigen, Flipflop-Ausgänge Q und Zählerausgänge auf, **jeden Knoten einmal**; hängt eine Lampe an einem Zählerausgang, steht die Lampe da | Bei Stevens Zähler mit vier Lampen soll es vier Zeilen geben, nicht acht; Versorgungsleitungen gibt es als eigene Signale nicht |
| Überlappend / Untereinander: je Oszilloskop-Fenster und im Zeitverlauf; Vorauswahl nach dem ersten Signal, Handwahl bleibt | wie im Auftrag; die Wahl wird nicht in der Datei gespeichert |
| Die Bauteilleiste hat jetzt dieselben Gruppen wie das Beispiele-Menü: Logik, Flip-Flops, Zähler, Anzeigen, Analog, Verbindung (Anwendungen gibt es nur als Beispiele). Taktgeber steht bei den Anzeigen, Masse bei Analog | «benannt und geordnet wie die Bauteilleiste, damit beides zusammenpasst» |
| Vorführung in Beispielen: Pegelschalter, Schalter und Regler schalten reihum von selbst, bis jemand etwas anfasst | Der Auftrag verlangt «läuft sofort» und «nach zwei Sekunden ein anderer Zustand» auch für Gatter, deren Eingänge sonst stillstehen |
| Lauflicht = Johnson-Zähler mit vier Lampen (nicht Zähler mit Dekoder) | Ein Dekoder mit vier UND-Gattern und vier Sammelleitungen wäre ein eigenes Beispiel über Knotenpunkte; der Johnson-Zähler zeigt das Wandern der Leuchtreihe sauber. Auf Wunsch nachzubauen |
| Gitter: Standard «Punkte» (wie bisher), nicht «aus»; Rasterweiten 10, 20, 40, 100 | Der Auftrag will «aus, Punkte, Linien» und den Fangraster als Standard; Punkte zeigte das Studio schon vorher |
| Leitungsführung: Leitungen verschiedener Netze werden im Studio seitlich versetzt, wenn sie übereinanderlägen | siehe `FORTSCHRITT_STUDIO.md` |
| Reihenfolge der Pakete: 6 vor 5 | Der Auftrag sagt selbst, dass Paket 5 auf Paket 6 aufbaut (Schriftfeld nutzt die Textdarstellung) und dass Paket 3 den Satz als Textelement aus Paket 6 verlangt |
| Zeichenelemente liegen in `layout.draw` (Reihenfolge = vorne/hinten) und `layout.drawHidden`, nicht als Bauteile | Sie dürfen nie in Netzliste, Rechnung, Stückliste oder «Alles auswählen» auftauchen; Rückgängig, Datei und Export laufen trotzdem über das Layout |
| Rechteck und Ellipse reagieren nur am Rand (Füllung lässt Klicks durch) | Durchscheinende Rahmen um Bauteile sollen die Bauteile nicht sperren |
| Der erklärende Satz eines Beispiels steht als Textelement im Schaltplan; die Hinweisleiste oben zeigt nur Namen und den Hinweis zur Vorführung | So kommt er auch in Export und Druck mit; ein doppelter Satz auf dem Bildschirm wäre nur Lärm |
| Zeichenelemente: Schwarzweiss-Export rechnet Farben nach Helligkeit in Schwarz, Dunkelgrau oder Hellgrau um | Der Druck ist schwarzweiss, farbige Hervorhebungen sollen trotzdem unterscheidbar bleiben |
| Der Zeichnungsrahmen steht im Massstab `sheet.scale` (1; 1,25 … 2) auf der Zeichenfläche; «Um die Schaltung legen» wählt den kleinsten, der passt | Auf A4 hoch bleiben nur 678 × 895 Einheiten Inhalt, schon kleine Schaltungen sind breiter; gedruckt wird entsprechend verkleinert, nie vergrössert |
| Was ausserhalb des Inhaltsbereichs liegt (Mittelpunkt des Bauteils bzw. Elements), kommt nicht in den Druck und ist auf dem Bildschirm markiert | wörtlich nach Auftrag |
| «PDF erzeugen» ruft den Druckdialog des Browsers auf (Ziel «Als PDF speichern»), kein eigener PDF-Schreiber | Offline, ohne Bibliothek, vektoriell, richtige Schriften; ein eigener PDF-Schreiber wäre mehrere hundert Zeilen ohne Gewinn. Falls Steven eine Schaltfläche will, die ohne Druckdialog eine Datei speichert, ist das ein eigener Auftrag |
| Seiten sind HTML mit festen Massen in Bildpunkten (96 dpi); die Schaltung auf Seite 1 ist ein SVG-Bild; Oszilloskop und Zeitverlauf kommen als Bild des gerade gezeichneten Bildschirmfensters | «so wie sie gerade stehen» |
| Die Tabelle läuft e1 (höchstes Bit) bis en (niedrigstes Bit) und zählt hoch; die Zeilen mit Ergebnis 1 sind grau, der Ergebniswert fett | wie im Entwurf und im Beispiel `A = e1 ē2 e3 v e1 e2 ē3 v e1 e2 e3` |
| KV-Diagramm: Zeilen = erste Eingänge, Spalten = übrige, Gray-Code; Gruppen nur durch Strichart unterschieden; Bezeichnungen unter dem Raster | Schwarzweiss-Druck; die Fläche neben der Tabelle reicht nicht für Bezeichnungen rechts |
| «Ausgeklammert» nimmt das häufigste Literal der Minimalform vor die Klammer, rekursiv; der Absatz nennt es «konjunktives Distributivgesetz» und zählt die gesparten Gatter | wie im Entwurf; die Gatterzählung zählt UND und ODER (NICHT-Glieder bleiben gleich) |
| Tabelle bis 5 Eingänge (32 Zeilen), KV bis 4; bei mehr ist der Punkt ausgegraut | passt sonst nicht auf ein Blatt; Stückliste läuft über Seiten, Tabelle nicht |
| Im Druckdialog ändert das Wählen eines Blattes auch den Rahmen auf der Zeichenfläche | Rahmen und Druckbereich sind dasselbe |

## Auftrag «Bedienung» (15.10.2026, `docs/AUFTRAG_BEDIENUNG.md`)

| Entscheidung | Begründung |
|---|---|
| Kein Bauen/Messen-Modus mehr; `S.setTool`, `#measureTarget`, `#measureKind`, `S.measurePin/-Part` sind entfernt | Ein Klick auf ein Bauteil darf nichts öffnen; Signale gehen nur noch per Rechtsklick, Eigenschaftenfeld oder Menü «Anzeigen» |
| Menü «Fenster» heisst «Anzeigen» und enthält «Alle digitalen Signale aufnehmen» sowie «Auswahl ins Oszilloskop / in den Zeitverlauf / ins Bode-Diagramm» | wörtlich nach Auftrag («die entsprechenden Punkte für die anderen Anzeigen»); gleiche Regeln und Ausgrauungen wie das Rechtsklick-Menü |
| Maussteuerung nur im Studio (`Editor.extra.mouse`) und nur für `pointerType === 'mouse'`; Touch und Stift verhalten sich wie bisher (Ziehen auf leerer Fläche schiebt) | Das Spiel nutzt denselben Editor und bleibt unverändert; ohne zweite Maustaste braucht Touch weiter den Schiebe-Weg |
| Rechtsklick: Menü erst beim Loslassen und nur, wenn der Zeiger weniger als 4 Bildpunkte bewegt wurde; `contextmenu` wird immer unterdrückt, nur Tastatur-Menütaste zeigt das Menü sofort | Schieben und Menü kommen sich so auf Linux, Mac und Windows (Menü bei Drücken bzw. Loslassen) nicht in die Quere |
| Auswahlrahmen wählt Bauteile, deren Mittelpunkt im Rahmen liegt; Leitungen und Zeichenelemente nicht | einfach und vorhersehbar; Leitungen hängen beim Verschieben ohnehin an den Bauteilen |
| Zeitverlauf ist ohne Signale eingeklappt und eingeklappt keine Zeile mehr (vorher blieb die Titelleiste) | nur so erreicht die Zeichenfläche bei 1366 × 768 über 80 % der Höhe; das erste Signal klappt ihn auf |
| Die Höhe der Zeichenfläche hängt nicht vom Eigenschaftenfeld ab; die Vorgaben «≥ 70 %» und «≥ 80 % mit eingeklapptem Feld» sind beide erfüllt (gemessen 80,7 %) | Das Einklappen des Feldes gewinnt Breite, nicht Höhe; die Höhe wurde so gewonnen, dass beide Zahlen gelten |
| Palette hat sieben Karten: die fünf verlangten plus «Verbindung» (Knoten) und «Zeichnen» | Knoten und Zeichenelemente brauchen eine Heimat; die ersten fünf Karten sind wie die Beispiele gegliedert |
| Werkzeug- und Bauteilleiste bleiben zwei Zeilen (je ~40 Punkte), kompakt; die Texte vieler Knöpfe entfallen unter 1700 Punkten Breite | In eine Zeile passen bei 1366 Punkten Karten, Bauteile und alle Werkzeuge nicht ohne Gedränge («wo es ohne Gedränge geht») |
| Klick auf die Leiste hängt das Bauteil an den Zeiger (statt es in die Bildmitte zu setzen); Zeichenelemente entstehen weiter sofort; auf Geräten mit grobem Zeiger (Touch) gilt das alte Setzen in die Mitte | wörtlich nach Auftrag; Touch hat keinen Zeiger, an dem etwas hängen könnte |
| Die Drehung des Bauteils am Zeiger bleibt nach dem Setzen erhalten | Reihen gleich gedrehter Bauteile; mit R lässt sich jederzeit zurückdrehen |
| Einfügen in Leitungen: nur Zweipole (zwei Anschlüsse, ausser Masse und Knoten); Anschluss nächst dem Leitungsanfang wird mit dem Anfang verbunden, die Drehung folgt dem getroffenen Leitungsstück | Dioden behalten so ihre Richtung von Anfang zu Ende der Leitung |
| Beim Ziehen aus der Leiste wird die Einfügemarke direkt im SVG gesetzt, nicht neu gezeichnet | Ein Neuzeichnen mitten im Ziehen ersetzt das Ziel der Ablage, die Ablage geht verloren (im Test gefunden) |
| `U-Werte` ist im Knopf «U» aufgegangen: Spannung je **Knoten** (eine Beschriftung statt einer je Anschluss), daneben «I» für Ströme | nach Auftrag; ein Knopf je Grösse, Menü und Tasten U und I schalten dasselbe |
| Beschriftungen suchen Plätze rund um den Anschluss, dann in Ringen weiter aussen, und meiden Bauteilkörper, «⏚ 0 V» und andere Beschriftungen; Werte kurz (7.5 V statt 7.500 V) | Digitaluhr: keine Überdeckung (Test) |
| Das Aufgabenfenster erscheint rechts statt links über dem Schaltplan | Es verdeckte sonst Bauteile bei kleinerer Zeichenfläche |

## Nachtlauf 2 (16./17.10.2026)

| Entscheidung | Begründung |
|---|---|
| Rechenkern: Wiederholt sich der diskrete Zustand (Dioden, Transistoren, Z-Dioden, Gatterausgänge) innerhalb eines Rechenschritts, wird die Iteration sofort abgebrochen (Grenzzyklus) | V hängt nur vom diskreten Zustand ab, die nächste Änderung nur von V: Kehrt der Zustand wieder, läuft es beweisbar endlos im Kreis. 400 Iterationen weiterzurechnen bringt nichts (waren die zwei, inzwischen drei, Hänger von `tests/robust.js`) |
| Im Zeitbereich schaltet bei einer schwingenden Schaltung je Zeitschritt genau ein Gatter (das erste in Bauteilreihenfolge, das nicht zu seinen Eingängen passt), ausgehend vom Zustand vor dem Schritt | Ein Gatter braucht eine Laufzeit. Ohne diese Regel blieb irgendein Punkt des Kreises stehen, und der Ringoszillator zeigte nichts. Mit ihr durchläuft der Ring aus drei NICHT die sechs Zustände 100 101 001 011 010 110 (Periode 6 Gatterlaufzeiten). `UNSTABLE` wird weiter gemeldet, der Arbeitspunkt selbst bleibt «nicht stabil» |
| Die Laufzeit eines Gatters ist ein Rechenschritt (`dt`), kein eigener Wert wie `tpd` bei Flipflops | Gatter haben kein `tpd`; ein neues Bauteilmerkmal wäre mehr, als der Auftrag verlangt. Der Spielbetrieb (ohne Rückkopplung ohne Ruhelage) ist unberührt |
| `AV` und `A` in Inspektor und Datenblatt: Analysetabelle Eingänge \| AV \| A, Ansteuertabelle AV \| A \| Eingänge | nach Stevens Unterlagen. Pin-Beschriftung am Bauteil bleibt Q und Q̄ (Schaltzeichen) |
| Zähler-Tabellen im Inspektor behalten ihre Köpfe (Z, Q0 … Q3, Z⁺ …) | Stevens Schreibweise ist für Flipflops belegt, nicht für Zählertabellen; Aufträge nennen sie nicht. Offen für Rückmeldung |
| Der Druck enthält keine Flipflop-Tabellen (nur Wahrheitstabelle reiner Logik), daher dort nichts umzustellen; der Zeitverlauf hat keine Tabellenköpfe | geprüft in `druck.js` und `timing.js` |

### Lernpfad (Block 2 und 3)

| Entscheidung | Begründung |
|---|---|
| Stationen und Aufgaben sind Daten in `dev/studio/pfad/st_*.js` (je Station eine Datei), Kern und Prüfmaschine in `pfad/kern.js` (ohne DOM), Oberfläche in `pfad/ui.js`, Hilfen zum Berechnen von Tabellen und Musterschaltungen in `pfad/bausteine.js` | Eine Änderung an der Darstellung trifft alle Stationen auf einmal (Auftrag Block 2). Der Kern läuft in Node, damit jede Station dort getestet werden kann |
| Nicht nach Station A5 angehalten | Abweichung von Abschnitt 9 laut `NACHTLAUF_2.md` |
| Zehn Prüfarten: die sieben aus dem Auftrag (`tabelle`, `ausdruck`, `schaltung`, `nand`, `ics`, `kv`, `folge`) plus `fragen`, `protokoll`, `vergleich` | Prüffragen und Laborstationen kommen im Auftrag vor (A3, A4, A12, B13, A2). `protokoll` und `vergleich` sind als «nicht von der Software geprüft» gekennzeichnet (✎ in der Liste, Hinweis in der Station) |
| Tabellenköpfe zählen e1 links, e1 = höchste Stelle der Zeilennummer (wie im Arbeitsblatt); Minterme und Soll-Tabellen der Prüfmaschine zählen e1 = niedrigstes Bit (wie KV-Diagramm und Studio) | Beide Konventionen bestehen schon im Studio. Die Stationen rechnen alles aus Funktionen e → Wert, so dass sich die Konvention nicht einschleichen kann. Offene Frage an Steven: Welche Nummerierung gilt in seinen Minterm-Aufgaben (`FRAGEN_STUDIO.md`) |
| Ausdrucksprüfung: gleichwertig über alle Eingangskombinationen, dann Buchstabenzahl ≤ kleinste Buchstabenzahl einer überdeckenden Summe (so zählt auch eine ausgeklammerte Form), bei Summe von Produkten zusätzlich Zahl der Glieder ≤ Minimalform | Eine ausgeklammerte Form kann weniger Buchstaben haben als jede Summe von Produkten; sie soll nicht abgelehnt werden |
| Quine-McCluskey im Kern ist eine eigene Rechnung, unabhängig von `DQVisuals.minimize`; der Test vergleicht sie zusätzlich mit einer Brute-Force-Rechnung (alle Würfel, alle Teilmengen) über alle Funktionen mit 1 bis 3 Variablen und Zufallsfunktionen mit 4 und 5 Variablen (auch mit Don't-Care) | Auftrag: «gegen eine unabhängige Berechnung prüfen» |
| Lösung zeigen nach zwei Fehlversuchen in Folge; die Aufgabe zählt danach erst, wenn die Lernenden sie selbst richtig lösen | «Abschluss: alle Pflichtaufgaben richtig» verlangt richtig, nicht gesehen |
| Einmal richtig bleibt richtig, auch wenn ein späterer Versuch falsch ist | Sonst würde das Ausprobieren anderer Lösungen den Fortschritt zerstören |
| Freischalten durch die Lehrperson ohne Anmeldung: Datei `*.freigabe.dqstudio.json` erstellen und von den Lernenden einlesen lassen | Stufe 1 hat keine Konten. Die Datei ist kein Schutz (wer sie sich selbst macht, schaltet sich selbst frei) – es geht ums Tempo, nicht um Sicherheit |
| Fortschritt im Browserspeicher (`dqstudio_lernpfad_v1`, in try/catch) und als Datei `*.fortschritt.dqstudio.json` | Wie im Auftrag. Beim Einlesen werden unbekannte Stationen verworfen, neuere Versionen abgelehnt |
| Während einer Lernpfad-Aufgabe wird nicht automatisch zwischengespeichert (`S.pfadAktiv`); die Schaltung der Aufgabe liegt im Lernpfad-Fortschritt | Sonst würde die Wiederherstellung die Aufgabenschaltung des Lernpfads mit einer freien Schaltung vermischen |
| Die Bauteilleiste zeigt in einer Aufgabe nur die bis dahin freigeschalteten Bauteile (`schaltet` je Station, kumulativ); Eingänge, Anzeigen und Masse der Aufgabe sind gesperrt | Auftrag Abschnitt 5. Test: Die Bauteile jeder Musterlösung sind freigeschaltet |
| A3 schaltet UND, NAND, NOR frei, A5 die übrigen | A3 (vor A5) zeigt schon Schaltungen mit Gattern, in denen der Fehler zu finden ist |
| A4 ohne alte DIN-Norm | Ohne Stevens Arbeitsblatt ist nicht gesichert, welche Zeichen er verlangt; erfundene Symbole wären schlimmer als keine (`FRAGEN_STUDIO.md`) |
| Die 18 Vereinfachungen (A8) und die 13 KV-Funktionen (A10) sind eigene Beispiele, nicht Stevens Serien | Seine Arbeitsblätter liegen nicht im Repository. Der Test stellt sicher, dass jedes Beispiel wirklich einfacher wird und die Minimalform stimmt; Steven ersetzt sie durch seine |
| KV: Gruppen werden mit Feldnummern (Minterm) und einer kleinen Zahl in jedem Feld gewählt, nicht per Zeichnen mit der Maus | Funktioniert auf Handy und Tastatur, und die Rückmeldung kann «Feld 6» sagen |

### Lernpfad Teil B (Block 4)

| Entscheidung | Begründung |
|---|---|
| Flipflops werden durch ihre Folgefunktion aus dem Lehrbuch beschrieben (`P.FF.rs/d/t/jk`); Analysetabelle, Ansteuertabelle (X wo beide Werte erlaubt sind), Zustandsfolgediagramm und Soll-Folgen entstehen daraus. Der Test vergleicht jede Folgefunktion mit dem Verhalten der Engine (alle Zustände und Eingaben) und schaltet das NOR-Flipflop aus zwei NOR sowie das getaktete NOR-AND-Flipflop in der Engine nach | Die Tabellen in den Stationen können so keine Tippfehler enthalten, und die Musterschaltungen bestätigen die Bauteile der Engine gegen das Lehrbuch |
| B1 und B2: e1 = Setzen (S), e2 = Rücksetzen (R) | Stevens Zuordnung ist nicht belegt (`FRAGEN_STUDIO.md`); die Aufgabentexte sagen es ausdrücklich, damit sie in sich stimmen |
| Zustandsfolgediagramme zeichnen die Lernenden von Hand; «Abgeben» zeigt danach das Diagramm der Software zum Vergleich, ohne Bewertung (Prüfart `vergleich`) | wie im Auftrag; die Station ist dafür mit ✎ gekennzeichnet |
| Die Prüfart `folge` hat optional einen Takteingang und kennt `abfolge` (Eingänge nacheinander setzen, nach jedem Schritt rechnen). Damit lassen sich Taktzustand und Taktflanke unterscheiden (D ändert sich, während C = 1 ist) und das 1s-Catching zeigen | Ohne Reihenfolge der Eingänge ist der Unterschied nicht prüfbar |
| Der Takteingang darf ein Pegelschalter oder ein Taktgeber sein; die Software taktet ihn von Hand (der Taktgeber wird dafür in einen Pegelschalter am selben Anschluss umgewandelt). Siebensegmentanzeigen werden als Ziffer gelesen | So lässt sich die Digitaluhr mit echtem Taktgeber und echten Anzeigen abnehmen, ohne eine Stunde zu simulieren |
| **Engine:** Ein Flipflop-Takt, der im selben Zeitpunkt eintrifft, in dem preSet/preClear wegfällt, zählt nicht (`f.ap` in `engine.js`) | Beim Rücksetzen eines Ripple-Zählers lässt das Zurückfallen einer Stufe Q̄ steigen und taktet die nächste; im echten Baustein hält der Rücksetzimpuls wegen der Gatterlaufzeit noch an. Ohne diese Regel zählte jeder Dezimal- und Modulo-Zähler mit preClear (und damit die Digitaluhr, wie der Auftrag sie verlangt) nach dem Zurücksetzen falsch weiter. Gilt auch im Spiel; Regressionstest in `tests/kern.js`, Ringoszillator und `robust.js` unverändert grün |
| B9 (Digitaluhr): Einerstelle und Zehnerstelle sind freiwillige Teilaufgaben, die Uhr ist die Pflichtaufgabe. Anzeige AZ1 = Einer, AZ2 = Zehner, der Taktgeber heisst CLK1 (erster Taktgeber, automatische Nummer) | Die Software muss wissen, welche Anzeige welche Stelle ist; die automatische Nummerierung des Studios macht das ohne Zusatzaufwand |
| B8 schaltet Taktgeber, BCD-Dekoder und Siebensegmentanzeige frei (Aufgabe «Zählerstand sichtbar machen»); B9 schaltet nichts Neues frei, der Test prüft das | Auftrag: Wer A1 bis B8 durchgearbeitet hat, hat alles für B9 |
| Modulo-n-Zähler in B12 mit asynchronem Dualzähler und preClear (n = 6, 3 verlangt, 12 freiwillig); BCD-Zähler in B11 synchron mit D-Flipflops (Gleichungen aus KV-Diagrammen mit Don't-Care 10 bis 15) | Entspricht den Bausteinen, die B8 und B10 liefern; die Studio-Zählerbauteile (`ctr_*`) stehen in den Aufgaben absichtlich nicht zur Verfügung, damit selbst gebaut wird |
| Laufzeit-Fragen (B8.5, B10.4): Die Antworten (20/40/60 ns, Zwischenzustände 110 und 100, Frequenz 8 Hz → 4 Hz) werden im Test mit der Studio-Simulation nachgemessen | Keine Zahl in einer Prüffrage ohne Messung |

### Betrieb im Netz (Block 5)

| Entscheidung | Begründung |
|---|---|
| Dateidialoge: `S.saveFile` und `S.openFile` in `studio/netz.js` nutzen `showSaveFilePicker`/`showOpenFilePicker`, wo es sie gibt; «Speichern» schreibt danach in dieselbe Datei, «Speichern unter …» fragt immer. Bei Abbruch nichts, bei Fehler stiller Rückfall auf Download | Auftrag: ohne Fehlermeldung, ohne Hinweis. Die Aufgaben-Dateien (zwei Dateien nacheinander) und die Bildexporte bleiben beim Download, weil zwei Dialoge hintereinander ohne neue Eingabe der Browser verweigert |
| Der Test ersetzt die Dialoge des Systems durch Ersatzfunktionen (`showSaveFilePicker` und `showOpenFilePicker`), prüft Aufruf, Schreiben und Rückfall | Die echten Dialoge des Betriebssystems lassen sich nicht automatisch bedienen; ob der echte Dialog in Chrome und Edge so aussieht, muss Steven einmal von Hand ansehen |
| Neuere Fassung: Hinweisleiste auf `controllerchange` des Service Workers (nicht beim ersten Besuch); «Jetzt neu laden» oder «Später» | Der Service Worker liefert zuerst aus dem Cache und lädt neu nach; ohne Hinweis liefe die geöffnete Seite mit dem alten Stand weiter |
| `dist/` mit `studio.html` und `LIESMICH.txt` wird vom Build erzeugt und eingecheckt; das Wurzel-`studio.html` bleibt | Auftrag: tragbare Fassung mit zwei Sätzen |

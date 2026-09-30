# Plan: Messgeraete-Bedienung (Ziehen statt Klicken) + Messtechnik-Erweiterung (neues Kapitel)

Entscheide vom 30.09.2026 (Rueckfragen beantwortet): Retrofit nur fuer neue Inhalte (bestehende ~150 Aufgaben bleiben vorerst beim Klick-Verhalten), neue Bedienung nur in der Werkbank (Schema-Ansicht bleibt Klick), Oszilloskop vorerst mit 1 Kanal, neues eigenes Kapitel statt Erweiterung von Kapitel 3/4.

## Teil A: Messspitzen ziehen statt klicken (Werkbank)

### Ist-Zustand (geprueft im Code)
- `circuit-ui.js` (`Circuit.prototype.clickPin`): Werkzeug `probe` setzt bei Klick auf einen Anschluss sofort `probes.a`/`probes.b` – kein Zwischenschritt, keine Bewegung.
- `bench.js` (`probeSvg`): zeichnet die Messspitze als Kabel vom Geraet zur Zielposition; ist keine Spitze gesetzt, liegt sie "geparkt" neben dem Geraet. Die Kabelfuehrung ist rein optisch, keine echte Interaktion.
- `app.js` (`scope()`): das Oszilloskop hat **keine eigene Messspitze** – es liest schlicht `meter.a`/`meter.b`, also dieselbe Spitze wie das Multimeter. Das ist fachlich ungenau (ein echtes Oszi hat einen eigenen Tastkopf) und genau der Punkt, den Steven mit "das KO soll ich selbst noch verbinden koennen" anspricht.
- Drehschalter (`data-dial`) schaltet nur den Messmodus (V/A/Ohm/...) um; es gibt keine manuelle Messbereichswahl – die Anzeige waehlt intern automatisch den Bereich und simuliert Digit-Rauschen/Kalibrierfehler (Kommentar app.js:626), aber der/die Lernende waehlt den Bereich nicht selbst. Das ist der zweite Punkt von "detaillierter einstellen".

### Zielbild
1. **Spitzen ziehen**: Auf der Werkbank liegen die Messspitzen (rot/schwarz fuer Multimeter, eigener Tastkopf + Erdungsclip fuer das Oszilloskop CH1) geparkt neben dem jeweiligen Geraet. Zum Messen muss die Spitze per Drag (Pointer-down auf Spitze → ziehen → Pointer-up ueber einem gueltigen Anschluss) tatsaechlich an den Punkt herangefuehrt werden. Ein Klick ohne Ziehen tut nichts mehr. Loslassen ausserhalb eines gueltigen Anschlusses: Spitze faellt zurueck an die Parkposition (mit kurzer Rueck-Animation).
2. **Manuelle Messbereichswahl**: Der Drehschalter bekommt zusaetzlich zu den Modi (V/A/Ohm/...) Bereichsstufen (z. B. 200mV/2V/20V/200V/600V fuer Spannung, analog fuer Strom/Widerstand). Falsch gewaehlter Bereich zeigt realistisch `OL` (Overload, zu klein gewaehlt) oder unnoetig ungenaue Anzeige (zu gross gewaehlt), genau wie bei einem echten Multimeter. Das ersetzt die bisherige automatische Bereichswahl fuer die neuen Messtechnik-Aufgaben (bestehende Aufgaben behalten Auto-Range, siehe Retrofit-Entscheid).
3. **Oszilloskop bekommt eigenen Tastkopf**: eigenes `scopeProbe` (Spitze + Erdungsclip), getrennt von `meter.a`/`meter.b`. Erst wenn beide gesetzt sind, zeigt das Oszi ein Bild; vorher bleibt der Schirm leer mit Hinweistext "Tastkopf anschliessen".

### Technische Umsetzung
- **Neuer Interaktionszustand** in `circuit-ui.js` (view-neutraler Kern, wird von `bench.js` genutzt, `editor.js` bleibt unveraendert): `dragProbe: {which:'meterA'|'meterB'|'scopeTip'|'scopeGnd', x, y}` waehrend des Ziehens; `probes`/neues `scopeProbes {tip, gnd}` wie gehabt nach dem Loslassen.
- **Nur in `bench.js`**: Pointer-Events (`pointerdown` auf `.bprobe`, `pointermove` auf dem SVG-Root, `pointerup`) ersetzen den bisherigen reinen Klick-Handler fuer Messspitzen. Whrend des Ziehens folgt das Kabel (bereits vorhandene `cablePath`-Funktion) dem Pointer statt einer festen Zielposition.
- **Gueltige Zielpunkte**: beim Pointerup wird geprueft, ob sich ein Anschluss (Pin) unter dem Pointer befindet (Hit-Test wie beim bestehenden Klick-Handler, nur jetzt bei Loslassen statt bei Klick).
- **Messbereichswahl**: neuer UI-Zustand `meter.range` (zusaetzlich zu `meter.mode`), Drehschalter-SVG um Rastpositionen fuer Bereiche erweitern (oder zweiter kleiner Drehknopf/Wahlschalter daneben, je nach Platz – Vorschlag: zweite Knopfreihe unterhalb des Hauptschalters, analog zu echten DMMs mit zwei Baenken). `E.dmm`-Funktion (bestehend, Engine) um Bereichsparameter erweitern: liefert bei falsch gewaehltem Bereich `OL` bzw. reduzierte Aufloesung statt wie bisher automatisch den passenden Bereich zu waehlen.
- **Scope-Tastkopf**: neues Objekt `bench.scopeProbes` analog zu `core.probes`; `scope()` in `app.js` liest kuenftig `scopeProbes.tip/gnd` statt `meter.a/meter.b`. Multimeter und Oszilloskop koennen dadurch gleichzeitig an unterschiedlichen Punkten haengen (z. B. Multimeter am Ausgang, Oszi am Eingang der Gleichrichterschaltung – genau das, was die neuen Vergleichsaufgaben brauchen).
- **Geltungsbereich (Retrofit-Entscheid)**: ein Flag pro Aufgabe (z. B. `measureUX: 'legacy'|'drag'`, Default `'legacy'` fuer alle ~150 bestehenden Aufgaben) steuert, ob `bench.js` fuer diese Aufgabe die neue Zieh-Interaktion oder das alte Klick-Verhalten nutzt. Neue Messtechnik-Kapitel-Aufgaben (Teil B) setzen `measureUX: 'drag'`. So funktioniert Altbestand unveraendert weiter, und es gibt keinen grossen Big-Bang-Test ueber alle Kapitel.
- **Schema-Ansicht**: bleibt unveraendert (Klick auf Anschluss setzt Spitze sofort) – kein Aenderungsbedarf an `editor.js`.

### Phasen Teil A
1. **A1 Grundmechanik Ziehen**: Pointer-Drag fuer Multimeter-Spitzen in `bench.js`, `measureUX`-Flag einbauen, Default `legacy` fuer alle bestehenden Aufgaben pruefen (Regressionstest: bestehende Aufgaben unveraendert bedienbar).
2. **A2 Oszilloskop-Tastkopf**: eigener `scopeProbes`-Zustand, Umstellung `scope()` in `app.js`, Anzeige "Tastkopf anschliessen" wenn nicht verbunden.
3. **A3 Messbereichswahl**: `meter.range`-Zustand, Drehschalter-Erweiterung in `bench.js`, `E.dmm` um OL-bei-falschem-Bereich erweitern, nur wirksam wenn `measureUX==='drag'`.
4. **A4 QA**: `node validate.js`, `node test_engine.js`, `node tests/smoke.js` gruen; neue Szenarien in `dev/tests/tasks.js` fuer Drag-Verhalten (Pointer-Events lassen sich in Playwright simulieren) und fuer OL-Anzeige bei falschem Bereich.

## Teil B: Neues Kapitel "Messtechnik-Erweiterung" (Inhalt aus dem Word)

### Was ist schon abgedeckt (nicht duplizieren)
- T3B "Gleichrichtwert, Effektivwert, AVG und TRMS", 3.4/3.5 (Einweg-/Brueckengleichrichter), T4A "Messen, Pruefen, Messgeraete", T4B "Genauigkeit und Messfehler" existieren bereits in Kapitel 3/4 und decken die Grundlagen ab, die auch im Word unter "Grundbegriffe" und teilweise "Genauigkeit/Messfehler" stehen.

### Was ist neu (Inhalt fuer das neue Kapitel)
1. **Analoge Messwerke** (Word Kap. 2.1/2.2): Drehspulmesswerk (Dauermagnet + drehbare Spule, DC = linearer Mittelwert, AC = Gleichrichtwert) und Dreheisenmesswerk (feste Spule + zwei Weicheisenplaettchen, misst AC und DC, AC = Effektivwert). Fachlich wichtig fuer das Verstaendnis, warum ein einfaches AVG-Geraet bei Nicht-Sinus-Signalen falsch misst (Bezug zu T3B).
2. **Sinnbilder auf dem Skalenfeld** (Word Kap. 2.3, Tabelle mit Symbolen): Gebrauchslage-Symbole, Pruefspannungs-Sterne, Messwerk-Symbole. Als Nachschlage-Theorie mit Bildtabelle, nicht als Bau-Aufgabe.
3. **Strommesszange** (Word Kap. 2.5): beruehrungslose Strommessung ueber Magnetfeld/Induktion. Rein theoretisch (die Engine hat kein Zangenamperemeter-Bauteil und braucht keins – Konzeptwissen reicht, Pruefung ueber Theoriefragen).
4. **Messkategorien CAT I-IV** (Word Kap. 3): Einsatzgebiete/Sicherheitsklassen. Theorie mit der Vergleichstabelle aus dem Word.
5. **Genauigkeit vertieft** (Word Kap. 5): die genaue Rechenmethode fuer analoge Genauigkeit (% vom Endausschlag) und digitale Genauigkeit (% vom Anzeigewert + Digit-Fehler) mit den Rechenbeispielen aus dem Word als neue Rechenaufgaben (nicht nur Theorie – bestehende `defTask`-Mechanik mit `measure`/berechneten Sollwerten eignet sich dafuer gut, da die Formeln eindeutig sind).
6. **Geraete-Vergleich systematisch** (Word Kap. 6.3/6.4/6.5): eine durchgehende Aufgabenserie "miss dieselbe Kurvenform (Sinus, Rechteck, Dreieck, Sinus+DC-Anteil) mit Analog/DMM/RMS/TRMS/Oszilloskop und vergleiche" – das ist inhaltlich neu als *systematische Aufgabenserie*, obwohl die Einzelthemen (TRMS, Kurvenformen) schon vereinzelt in Kapitel 3 vorkommen.
7. **Gleichrichter-Messaufgaben mit Instrumentenvergleich** (Word Kap. 6.6/6.7): Einweg- und Bruecken-/Zweiweggleichrichter (mit und ohne Ladekondensator) – Topologien sind identisch mit den bestehenden Aufgaben 3.4/3.5, aber hier liegt der Fokus auf dem **Instrumentenvergleich pro Schaltung** (Tabelle: welches Geraet zeigt bei welcher Schaltung welchen Wert, inkl. Strommessung zusaetzlich zur Spannungsmessung).
8. **Systemfehler-Rechenbeispiel** (Word Kap. 5.3.1, Leistungsmessung mit Amperemeter-Eigenverbrauch): als eigene Theorie-Vertiefung mit Formel und Rechenaufgabe.

### Technische Machbarkeit (geprueft)
- Alle im Word gezeigten Schaltungen (Einweggleichrichter: Wechselspannungsquelle–Diode–Widerstand; Bruecken-/Zweiweggleichrichter: Wechselspannungsquelle–4 Dioden als Bruecke–Kondensator–Widerstand) sind mit den **bestehenden** Engine-Bauteilen `acsource`, `diode`, `capacitor`, `resistor` 1:1 baubar. **Keine neuen Engine-Bauteile noetig.**
- Die Rechenaufgaben zu Genauigkeit/Systemfehler lassen sich mit der bestehenden `measure`/`tests`-Mechanik in `defTask` abbilden (Sollwert aus Simulation, Toleranzband ueber `tol`).
- Die neue Werkbank-Bedienung (Teil A) wird in diesem Kapitel durchgehend genutzt (`measureUX: 'drag'`), inklusive der neuen Messbereichswahl (Aufgaben, die bewusst den falschen Bereich testen lassen, z. B. "waehle 200mV bei einer 15V-Messung und beobachte OL").

### Aufbau des neuen Kapitels (Vorschlag, Nummer offen bis Content-Reihenfolge klar ist – z. B. Kapitel 16, ausserhalb der 4 bestehenden Teile I-IV oder als Ergaenzung zu Teil I)
- **T16A "Analoge Messwerke"**: Drehspul-/Dreheisenmesswerk, Bild + Text je Messwerk, dazu ein Werkstatt-Aufbau (Spannungsquelle–Amperemeter–Widerstand), an dem die Lernenden nachvollziehen, was das Messwerk bei Gleich- vs. Wechselstrom anzeigen wuerde (die Engine simuliert kein echtes Zeigerinstrument, aber die Zahlen lassen sich mit der Theorie verknuepfen: "bei diesem Signal wuerde ein Drehspulmesswerk X anzeigen, ein Dreheisenmesswerk Y").
- **T16B "Sinnbilder und Messkategorien"**: Bildtabelle Sinnbilder + CAT-I-IV-Tabelle, reine Theorie mit Bildern (aus dem Word uebernehmbar, siehe Bildrechte-Hinweis unten).
- **T16C "Genauigkeit vertieft"**: Rechenformeln fuer analoge/digitale Genauigkeit inkl. Digit-Fehler, mit einem Werkstatt-Aufbau zur Veranschaulichung (Spannungsquelle–Widerstand, verschiedene "virtuelle" Messgeraete-Genauigkeitsklassen zum Nachrechnen).
- **16.1-16.x Aufgaben**: Systemfehler-Rechenaufgabe (Word 6.1), Spannungs-/Strommessfehler-Schaltung mit kleinem/grossem Widerstand (Word 6.2), Kurvenform-Vergleichsserie Analog/DMM/RMS/TRMS/KO fuer Sinus/Rechteck/Dreieck (Word 6.3), Wechselgroesse mit DC-Anteil (Word 6.4), Frequenzerhoehung – ab wann liefern welche Geraete noch sinnvolle Werte (Word 6.5), Einweggleichrichter-Instrumentenvergleich (Word 6.6.1/6.6.3), Bruecken-/Zweiweggleichrichter-Instrumentenvergleich (Word 6.6.2), Stromvergleich an denselben Gleichrichterschaltungen (Word 6.7).
- **Strommesszange**: als zusaetzliche Theoriefrage/-absatz in T16A angehaengt (kein eigener Werkstatt-Aufbau moeglich, da kein Bauteil in der Engine).

### Bildrechte-Hinweis (wichtig, vor dem Bau zu klaeren)
Die Bilder im Word-Dokument (Drehspul-/Dreheisenmesswerk-Fotos, Sinnbild-Tabelle mit "Europa Lehrmittel"-Logo, Messkategorie-Icon) stammen erkennbar aus einem Lehrmittelverlag (Europa-Lehrmittel-Branding sichtbar auf der Sinnbild-Tabelle) und duerfen nicht einfach 1:1 in eine oeffentlich erreichbare Website uebernommen werden. Fuer das neue Kapitel muessen die Bilder **neu erstellt** werden (eigene Illustrationen/Fotos oder Nachzeichnungen im Digital-Quest-Stil, passend zur bestehenden Bildsprache aus `docs/PLAN_THEORIE_ANIMATIONEN.md`), nicht aus dem Word kopiert werden. Ich habe das als offenen Punkt markiert – bitte kurz bestaetigen, dass so vorgegangen werden soll (Alternative: du hast die Bildrechte selbst oder es gibt lizenzfreie Alternativen, dann bitte angeben).

### Phasen Teil B
1. **B1 Grobstruktur**: Kapitelnummer festlegen, `defChapter`-Eintrag, Reihenfolge der 3 Theorien + ca. 8 Aufgaben planen (Kurzfassung wie oben), in `docs/THEMEN.md` nachtragen.
2. **B2 Theorie-Inhalte**: T16A/T16B/T16C schreiben (Text + neu erstellte Bilder, siehe Bildrechte-Hinweis), im Stil von `docs/PLAN_THEORIE_ANIMATIONEN.md` (Baustein-Wiederverwendung wo moeglich, z. B. Mini-Schaltung-Baustein fuer T16A/T16C).
3. **B3 Aufgaben**: die ca. 8 Aufgaben (siehe oben) als `defTask`, inkl. `bench`-Layout und `measureUX: 'drag'`; Gleichrichter-Topologien aus 3.4/3.5 als Vorlage, aber mit Instrumentenvergleich-Fokus statt reiner Gleichrichter-Funktionspruefung.
4. **B4 QA + Rollout**: `node validate.js`, `node test_engine.js`, `node tests/smoke.js` gruen, `docs/STAND.md` aktualisieren, Kapitel in der Karte/Manual verlinken.

## Reihenfolge Gesamtplan
Teil A (Bedienung) sollte vor oder zumindest parallel mit Teil B3 (Aufgaben) fertig sein, da die neuen Aufgaben `measureUX: 'drag'` direkt nutzen sollen. Teil B1/B2 (Struktur, Theorie) koennen unabhaengig von Teil A gestartet werden.

## Offene Rueckfrage an Steven
Bitte bestaetigen: Bilder fuer das neue Kapitel werden neu erstellt statt aus dem Word-Dokument uebernommen (siehe "Bildrechte-Hinweis" oben) - oder hast du die Rechte an den Originalbildern bzw. eine lizenzfreie Quelle dafuer?

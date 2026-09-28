# CLAUDE.md – Digital Quest

Anleitung fuer Claude (Cowork / Claude Code) in diesem Repository.

## Was das ist
**Digital Quest** – eigenstaendiges, offline spielbares Lernspiel (Deutsch, Schweizer Schreibweise ohne ß) fuer Elektrotechnik und Digitaltechnik. Teil der spaeteren Dachmarke **Buehler Quest**, aber technisch unabhaengig von SPS Quest.
Idee: „zwischen Fritzing und LTspice“ – Lernende **bauen Schaltungen** im Schaltplan-Editor, die Schaltung wird **live simuliert**, und sie **messen** wie im Labor (Multimeter V/A/Ω, Oszilloskop). Messen ist gleichwertig mit Bauen.

Methode, Qualitaetsregeln und Design folgen dem Bauplan aus SCL Quest (`docs/BAUPLAN_LERNSPIEL.md`).

## Naechster Arbeitsschritt (Stand 28.09.2026)
**Vor Inhalten: Werkbank-Ansicht bauen, Phase 1 zuerst.** Reihenfolge und Details in `docs/STAND.md` ("Naechste Schritte", Punkte 0/0b) und `docs/ENTSCHEIDUNGEN.md` ("Werkbank-Ansicht", "Interaktionsumfang"). Kurzform: (1) Interaktionskern aus `editor.js` in `src/circuit-ui.js` loesen, (2) `src/bench.js`-Rendering-Grundgeruest, (3) Live-Sync, (4) Multimeter auf der Werkbank, (5) Umschalt-Button + `tests/smoke.js` fuer beide Ansichten. Das `bench`-Layout-Feld fuer `defTask` ist unter "Aufgaben schreiben" unten beschrieben. Erst danach: Themenliste (`docs/THEMEN.md`, steht bereits) in echte Kapitel/Aufgaben umsetzen.

## Aufbau
- `index.html` – ausgelieferte Einzeldatei, offline. **Generiert – nicht von Hand aendern.**
- `web/` – PWA-Version (Manifest, Service Worker mit Content-Hash, Icons). Ordner auf beliebigen HTTPS-Webspace laden.
- `theorie/` – Stevens Theoriedokumente (Quellmaterial). Claude leitet daraus Lektionen, Fragen und Aufgaben ab.
- `docs/` – KONZEPT, ENTSCHEIDUNGEN, STAND, THEMEN, BAUPLAN_LERNSPIEL.
- `dev/`
  - `src/engine.js` – `window.DQEngine`: Netzliste, Knotenanalyse, Bauteile, Messgeraete, Zeitsimulation, Aufgabenpruefung. Kein DOM.
  - `src/circuit-ui.js` – ansichtsneutraler Interaktionskern (geplant, Phase 1 der Werkbank-Umsetzung): Bauteil hinzufuegen/bewegen/drehen/loeschen, Leitung ziehen, ID-Vergabe. Kein eigenes Rendering – wird von `editor.js` UND `bench.js` genutzt, damit Editier-Logik nicht zweimal existiert. Bis zur Trennung liegt dieser Code noch in `editor.js`.
  - `src/editor.js` – `window.DQEditor`: SVG-Schaltplan-Renderer (Raster 20 px, IEC-Symbole, Live-Anzeige) ueber dem Interaktionskern.
  - `src/bench.js` – `window.DQBench` (geplant, **Herzstueck/Prioritaet**): 2.5D Werkbank-Renderer ueber demselben Interaktionskern wie `editor.js` (Bauteile, Kabel mit Messspitzen, Multimeter/Oszilloskop mit echten Geraetefronten). **Voll interaktiv** (bauen/verdrahten/drehen/loeschen genau wie im Schema, nicht nur Ansehen/Messen). Liest/schreibt denselben Schaltungszustand wie die Schema-Ansicht; Umschalt-Button Schema <-> Werkbank aendert nur die Darstellung. Positionen kommen aus dem `bench`-Layout der jeweiligen Aufgabe (siehe "Aufgaben schreiben"), nicht automatisch aus dem Schema-Layout abgeleitet. Stilvorbild: echtes Elektroniklabor/Physik-Praktikum, kein frei drehbares 3D. Siehe `docs/KONZEPT.md`, `docs/ENTSCHEIDUNGEN.md`.
  - `src/app.js` – Spielsteuerung (Karte, Aufgabe, Theorie, Handbuch, Einstellungen, Speicherstand). Plus **Sandbox-Modus (Quick Win)**: freie Werkbank ohne Auftrag/Pruefung, alle bereits freigeschalteten Bauteile, ueber Karte erreichbar.
  - `src/style.css`, `src/index.template.html`
  - `src/content/` – `_helpers.js` (`defChapter`, `defTask`, `defTheory`, `W`), `chNN.js`, `theory*.js`, `manual.js`
  - `build.js`, `validate.js`, `test_engine.js`, `tests/smoke.js` (Playwright)

## Arbeitsablauf
```
cd dev
node test_engine.js      # Engine-Tests
node validate.js         # muss "OK — keine Fehler" ausgeben
node build.js            # erzeugt ../index.html und ../web/
node tests/smoke.js      # Browser-Durchlauf (Playwright/Chromium), Screenshots in tests/shots
```
Fertig heisst: Tests gruen, Validator 0 Fehler, Browser-Durchlauf fehlerfrei, Handy ok, offline spielbar. Nach jedem Abschnitt `docs/STAND.md` aktualisieren.

## Engine-Semantik (engine.js)
- Knotenanalyse; alle Quellen als Norton-Ersatz (Spannungsquelle mit Innenwiderstand `ri`, Standard 0,05 Ω) → keine Zusatzzeilen, Kurzschluss bleibt loesbar und wird ueber `imax` erkannt.
- Jeder Knoten hat 1e-9 S gegen Masse (Gmin); offene Schalter/gesperrte Dioden 1e-12 S.
- Bezugspunkt: Masse-Symbol (`ground`); fehlt es, ist der Minuspol der ersten Spannungsquelle 0 V (`autoGround`).
- Dioden/LEDs stueckweise linear (U_F + r_s), iterativ. LED-Farben: rot 1,8 V, gelb 2,0, gruen 2,1, blau 3,0, weiss 3,1; `imax` 30 mA → durchgebrannt (bleibt defekt bis „Reparieren“).
- Logikgatter: 5-V-Logik, Schwelle 2,5 V, Ausgang 25 Ω, Versorgung implizit (brauchen aber einen Bezugspunkt). Gatter werden einzeln nachgefuehrt (Gauss-Seidel) → Speicherschaltungen (RS aus NOR) stabil; Rueckkopplungen ohne Ruhelage → `UNSTABLE`.
- Kondensator: Backward Euler (`dt`), im Gleichstrom-Arbeitspunkt offen. Taktgeber: Rechteck `freq`.
- Zustand (`newState`): `burnt`, `vC`, `logic`, `diode`, `fuse`, `t`.
- **Zeitlupen-Replay (Quick Win, Entscheid 28.09.2026)**: Gauss-Seidel-Zwischenschritte (Logik-Rueckkopplung) und Backward-Euler-Zeitschritte (Kondensator) werden als Verlauf mitgespeichert, nicht nur das Endergebnis - Grundlage fuer einen Schieberegler "Schritt fuer Schritt" in der Oberflaeche. Verlauf pro Simulationslauf begrenzen (z. B. letzte N Schritte statt unbegrenzt), damit lange Oszilloskop-Laeufe den Speicher nicht sprengen.
- **Diagnose aus echten Werten (Quick Win)**: die Diagnose-Box leitet ihren Text aus den tatsaechlichen Simulationswerten des aktuellen Versuchs ab (Sollwert/Istwert/Grenzwert des betroffenen Bauteils), nicht aus einem festen Text pro Stoerungscode.
- Multimeter: V = 10 MΩ parallel; A = 0,1 Ω Shunt zwischen den Spitzen, Sicherung 10 A (parallel zur Quelle → `FUSE`); Ω nur spannungsfrei (sonst Fehler), Pruefstrom 1 mA, > 40 MΩ = `OL`.
- **Messgeraete-Realismus (Quick Win)**: kleines Toleranzband/Eigenrauschen auf angezeigte Werte; Multimeter-Modus "Average-responding" (misst gleichgerichteten Mittelwert, skaliert auf Sinus-Effektivwert) vs. "TRMS" (echter Effektivwert) liefern bei nicht-sinusfoermigen Kurven unterschiedliche Anzeigen - Lernmoment fuer Kapitel 3 (AVG/RMS/TRMS).
- Stoerungscodes: `SHORT`, `LED_BURNT`, `LED_REVERSE`, `OVERLOAD`, `LAMP_BURNT`, `AMMETER_OVERLOAD`, `UNSTABLE`, `NO_GROUND`.

## Aufgaben schreiben (`defTask`)
`id ('1.1'), ch, title, story, brief, learn, take, hint, hint2, tags[], palette[], start, ref, wrong[], need{}, tests[], measure[], boss`
- Layout: `{parts:[{id,type,value?,props?,x,y,rot}], wires:[W('B1.p','R1.a')]}`. Anschluesse: siehe `PARTS` in engine.js (z. B. battery p/n, led a/k, Gatter in1/in2/out).
- **`bench`-Layout (Werkbank-Ansicht, optional pro Aufgabe)**: `bench: {parts:[{id,x,y,rot,side?}]}` – eigene Koordinaten pro Bauteil-ID fuer die Werkbank-Darstellung, von Hand gepflegt (keine automatische Ableitung aus dem Schema-Layout). `id` muss zu einer `id` aus `start`/`ref` passen; `wires` werden nicht wiederholt (Topologie kommt aus dem Schema-Layout). Fehlt `bench`, faellt die Werkbank-Ansicht auf eine einfache Auto-Anordnung zurueck (Uebergangsloesung fuer noch nicht migrierte Aufgaben). `validate.js` prueft: jede `bench`-`id` existiert im Schema-Layout, keine verwaisten Eintraege.
- Bauteile aus `start` sind gesperrt (nicht loeschbar, Werte fix). Neue Bauteile bekommen automatisch IDs (erster Widerstand R1 …).
- `tests: [{name, set:{S1:{closed:true}} | {'@switch':{…}}, expect:[…]}]`; expect: `{sel:'D1'|'@led', on, i:[min,max], v:[min,max], out, brightness}`, `{a:'B1.p', b:'R1.b', v:[min,max]}`, `{noFault:true}`, `{fault:'SHORT'}`.
- `measure: [{id, ask, unit ('V','mA','kΩ'…), tol, set?, mode:'V'|'A'|'R', a, b}]` oder mit `truth:{sel:'R1', q:'i'|'v'}` (Sollwert direkt aus der Simulation, egal wie gemessen wurde). Die lernende Person traegt ihren Messwert ins Protokoll ein.
- `tags`: Kompetenz-Tags (`elektro.ohm`, `messen.strom`, `digital.und` …) – Pflicht fuer die spaetere questuebergreifende Auswertung.
- Validator prueft: Referenz besteht (mit automatisch berechneten Sollwerten), Start besteht nicht, jede `wrong`-Loesung faellt durch, Referenz nutzt nur Start- oder Palettenbauteile, Theoriefragen mit `verify`/`verifyTruth` stimmen mit der Engine.

## Theorie (`defTheory`)
`id ('T1A'), ch, title, lesson (HTML), questions:[{q, options, correct, explain, verify?:{layout,mode,a,b}, verifyTruth?:{layout,sel,q}}], tags` – 5 Fragen, 80 % zum Bestehen.

## Speicherstand
`localStorage` Schluessel `digitalquest_state_v1`: `profile {id (UUID), vorname, nachname, pseudonym}`, `done`, `drafts {taskId:{layout, answers}}`, `theory`, `events [{t, type, id, …}]`, `settings`.
Vorbereitung Buehler Quest: UUID als Personen-ID, Namen getrennt, Ereignisliste mit Zeitstempel und Tags. **Keine** Verknuepfung zu SPS Quest bauen, solange nicht ausdruecklich verlangt.

## Entwickeln
`index.html?alle` schaltet alle Stationen frei. `window.DigitalQuest` (state, openItem, editor, engine) fuer Tests.

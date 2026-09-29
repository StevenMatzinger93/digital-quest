# CLAUDE.md – Digital Quest

Anleitung fuer Claude (Cowork / Claude Code) in diesem Repository.

## Was das ist
**Digital Quest** – eigenstaendiges, offline spielbares Lernspiel (Deutsch, Schweizer Schreibweise ohne ß) fuer Elektrotechnik und Digitaltechnik. Teil der spaeteren Dachmarke **Buehler Quest**, aber technisch unabhaengig von SPS Quest.
Idee: „zwischen Fritzing und LTspice“ – Lernende **bauen Schaltungen** im Schaltplan-Editor, die Schaltung wird **live simuliert**, und sie **messen** wie im Labor (Multimeter V/A/Ω, Oszilloskop). Messen ist gleichwertig mit Bauen.

Methode, Qualitaetsregeln und Design folgen dem Bauplan aus SCL Quest (`docs/BAUPLAN_LERNSPIEL.md`).

## Naechster Arbeitsschritt (Stand 29.09.2026 – Uebergabe an neue Session)
**Kapitel 1–13 sind fertig** (130 Aufgaben, 26 Theorien, alle in Schaltplan UND Werkbank per `tests/tasks.js` loesbar), Werkbank/Labor fertig. Offen, in dieser Reihenfolge (Details in `docs/STAND.md` → "Uebergabe"):
1. **Kapitel 14** (RC-Filter/Frequenzgang) liegt fast fertig auf Branch `wip/kapitel-14` (`dev/src/content/ch14.js`) – zwei Validator-Fehler in 14.7 und 14.8 beheben, dann nach `main`.
2. **Kapitel 15** Anwendungsprojekt "Antriebsstation" (nach Quelle TP1410) mit Profi-Boss schreiben – Plan in `docs/STAND.md`.
3. **Zertifikat** nach Grundstufen-Boss (10.10) und **Abzeichen** nach Profi-Boss (15.10); Karte nach **Teilen I–IV** gliedern; Handbuch um die neuen Bauteile ergaenzen.
4. `docs/THEMEN.md` ist bereits an die tatsaechliche Kapitelfolge angepasst; nach Abschluss STAND/ENTSCHEIDUNGEN nachfuehren, voller Testlauf (`node tests/smoke.js`, `node tests/tasks.js`).

## Einrichtung (neue Maschine / Cloud-Session)
```
cd dev
npm install                         # Playwright (nur fuer die Browser-Tests)
npx playwright install chromium     # Browser fuer tests/smoke.js und tests/tasks.js
```
Das Quellmaterial `99_inputs/` (Stevens Unterrichtsunterlagen) ist **bewusst nicht im Repository** (`.gitignore`) – es liegt lokal in Stevens OneDrive. Fuer Kapitel 14/15 steht das Noetige in `docs/STAND.md` → "Uebergabe"; wer das Original braucht, fragt Steven.
Jeder Push auf `main` deployt automatisch (Cloudflare Worker). Halbfertiges daher auf einem Branch (`wip/…`) ablegen und erst mit gruenem Validator nach `main`.

## Aufbau
- `index.html` – ausgelieferte Einzeldatei, offline. **Generiert – nicht von Hand aendern.**
- `web/` – PWA-Version (Manifest, Service Worker mit Content-Hash, Icons). Ordner auf beliebigen HTTPS-Webspace laden.
- `theorie/` – Stevens Theoriedokumente (Quellmaterial). Claude leitet daraus Lektionen, Fragen und Aufgaben ab.
- `docs/` – KONZEPT, ENTSCHEIDUNGEN, STAND, THEMEN, BAUPLAN_LERNSPIEL.
- `dev/`
  - `src/engine.js` – `window.DQEngine`: Netzliste, Knotenanalyse, Bauteile, Messgeraete, Zeitsimulation, Aufgabenpruefung. Kein DOM.
  - `src/circuit-ui.js` – `window.DQCircuit`, ansichtsneutraler Interaktionskern (Phase 1 erledigt): Bauteil hinzufuegen/bewegen/drehen/loeschen, Leitung ziehen, ID-Vergabe. Kein eigenes Rendering – wird von `editor.js` UND `bench.js` genutzt, damit Editier-Logik nicht zweimal existiert. Renderer melden nur Ereignisse in Modellkoordinaten (`clickPin`, `pressPart`, `dragTo`, `release` …) und haengen sich per `attach(view)` an. Zwei Koordinatenraeume: 'schema' (`p.x/p.y/p.rot`) und 'bench' (`p.bench = {x, y, rot}`, gespeichert im Entwurf).
  - `src/editor.js` – `window.DQEditor`: SVG-Schaltplan-Renderer (Raster 20 px, IEC-Symbole, Live-Anzeige) ueber dem Interaktionskern.
  - `src/bench.js` – `window.DQBench` (Grundgeruest steht seit Phase 2, **Herzstueck/Prioritaet**): 2.5D Werkbank-Renderer ueber demselben Interaktionskern wie `editor.js` (Bauteile, Kabel mit Messspitzen, Multimeter/Oszilloskop mit echten Geraetefronten). **Voll interaktiv** (bauen/verdrahten/drehen/loeschen genau wie im Schema, nicht nur Ansehen/Messen). Liest/schreibt denselben Schaltungszustand wie die Schema-Ansicht; Umschalt-Button Schema <-> Werkbank aendert nur die Darstellung. Positionen kommen aus dem `bench`-Layout der jeweiligen Aufgabe (siehe "Aufgaben schreiben"), nicht automatisch aus dem Schema-Layout abgeleitet. Stilvorbild: echtes Elektroniklabor/Physik-Praktikum, kein frei drehbares 3D. Siehe `docs/KONZEPT.md`, `docs/ENTSCHEIDUNGEN.md`.
  - `src/app.js` – Spielsteuerung (Karte, Aufgabe, Theorie, Handbuch, Einstellungen, Speicherstand). Plus **Sandbox-Modus (Quick Win)**: freie Werkbank ohne Auftrag/Pruefung, alle bereits freigeschalteten Bauteile, ueber Karte erreichbar.
  - `src/style.css`, `src/index.template.html`
  - `src/content/` – `_helpers.js` (`defChapter`, `defTask`, `defTheory`, `W`), `_logic.js` (`LG`: Board-Layouts, Wahrheitstabellen-Tests, Tabellen-HTML, Minterme – fuer Logik-Kapitel), `chNN.js` (je Kapitel Aufgaben + 2 Theorien), `manual.js`
  - `build.js`, `validate.js`, `test_engine.js`, `tests/smoke.js` (Playwright)

## Arbeitsablauf
```
cd dev
node test_engine.js      # Engine-Tests
node validate.js         # muss "OK — keine Fehler" ausgeben
node build.js            # erzeugt ../index.html und ../web/
node tests/smoke.js      # Browser-Durchlauf (Playwright/Chromium), Screenshots in tests/shots
node tests/tasks.js      # jede Aufgabe + jedes Bauteil in Schaltplan UND Werkbank nur ueber die Bedienung loesbar
```
Fertig heisst: Tests gruen, Validator 0 Fehler, Browser-Durchlauf fehlerfrei, `tests/tasks.js` gruen (Regel: **jede Aufgabe muss im Schaltplan und auf der Werkbank loesbar sein**), Handy ok, offline spielbar. Nach jedem Abschnitt `docs/STAND.md` aktualisieren.

## Engine-Semantik (engine.js)
- Knotenanalyse; alle Quellen als Norton-Ersatz (Spannungsquelle mit Innenwiderstand `ri`, Standard 0,05 Ω) → keine Zusatzzeilen, Kurzschluss bleibt loesbar und wird ueber `imax` erkannt.
- Jeder Knoten hat 1e-9 S gegen Masse (Gmin); offene Schalter/gesperrte Dioden 1e-12 S.
- Bezugspunkt: Masse-Symbol (`ground`); fehlt es, ist der Minuspol der ersten Spannungsquelle 0 V (`autoGround`).
- Dioden/LEDs stueckweise linear (U_F + r_s), iterativ. LED-Farben: rot 1,8 V, gelb 2,0, gruen 2,1, blau 3,0, weiss 3,1; `imax` 30 mA → durchgebrannt (bleibt defekt bis „Reparieren“).
- Logikgatter: 5-V-Logik, Schwelle 2,5 V, Ausgang 25 Ω, Versorgung implizit (brauchen aber einen Bezugspunkt). Gatter werden einzeln nachgefuehrt (Gauss-Seidel) → Speicherschaltungen (RS aus NOR) stabil; Rueckkopplungen ohne Ruhelage → `UNSTABLE`.
- Kondensator: Backward Euler (`dt`), im Gleichstrom-Arbeitspunkt offen. Taktgeber: Rechteck `freq`.
- Wechselspannungsquelle `acsource` (Praefix G, p/n): `value` = Scheitelwert Û, `freq`, `shape` sine|square|triangle, `offset`; Momentanwert `E.wave(q, t)`. `E.acMeasure(layout, {a,b})` simuliert 5 Perioden der langsamsten Wechselquelle und liefert `dc`, `rms` (TRMS, AC-gekoppelt), `avg` (Mittelwert-Gleichrichter × 1,1107), `peak`, `pp`.
- Zustand (`newState`): `burnt`, `vC`, `logic`, `diode`, `fuse`, `t`.
- **Zeitlupen-Replay (umgesetzt)**: `step(net, state, {trace:true})` liefert `res.trace` = Rechenschritte `{iter, kind:'diode'|'gate'|'done'|'unstable', changed:[{id,to}], res}`, max. `E.TRACE_MAX` (200). Zeitschritte dynamischer Schaltungen haelt die App (letzte 300). UI: Toolbar "Zeitlupe".
- **Diagnose aus echten Werten (umgesetzt)**: Stoerungen tragen Ist-/Grenzwerte (`LED_BURNT` i/imax/vf, `SHORT` i/imax/u/ri, `OVERLOAD` p/pmax/v/i, `LAMP_BURNT` p/pnom, `LED_REVERSE` v/vmax, `AMMETER_OVERLOAD` i/imax); Werte beim Durchbrennen in `state.burnInfo`, Sicherungsstrom in `state.fuseInfo`. Texte in `app.js` (`FAULT_TEXT`) rechnen daraus vor.
- Multimeter: V = 10 MΩ parallel; A = 0,1 Ω Shunt zwischen den Spitzen, Sicherung 10 A (parallel zur Quelle → `FUSE`); Ω nur spannungsfrei (sonst Fehler), Pruefstrom 1 mA, > 40 MΩ = `OL`.
- **Messgeraete-Realismus (umgesetzt)**: `E.dmm(value, unit, rng)` = Anzeige wie 6000-Digit-DMM (Bereichswahl, `METER.cal` +0,2 %, letzte Stelle ±1 Digit; `rng = 0` ohne Rauschen). Bereich `VAC` (`measure({mode:'VAC', meterType:'avg'|'trms'})`); Panel und Werkbank-Multimeter: OFF/V⎓/V~/A⎓/Ω, Verfahren AVG/TRMS in `settings.meterType` (Standard TRMS). V⎓ zeigt bei Wechselquellen ≥ 5 Hz den Mittelwert. Die Pruefung (`runTask`) nutzt immer die exakten Werte, nie die verrauschte Anzeige.
- **Weitere Bauteile** (seit 28./29.09.2026): Pegelschalter `logicin` (closed = 1), Logikanzeige `logicled`, `xnor`, BCD-Decoder `dec7` (A–D → a–g), 7-Segment `seg7`, Flipflops `dff`/`jkff`/`tff` (steigende Flanke an C, Zustand in `state.ff`), NPN `npn` (Zustaende off/on/sat, β), Z-Diode `zener` (vz), Motor `motor` (r.speed). `props.defect` bei Widerstand/Lampe/Motor = verdeckte Unterbrechung. Jedes Bauteil liefert `r.pin` = Strom je Anschluss (Stromfluss-Anzeige). Stoerung `OUTPUT_CLASH` = zwei Ausgaenge gegeneinander.
- Stoerungscodes: `SHORT`, `LED_BURNT`, `LED_REVERSE`, `OVERLOAD`, `LAMP_BURNT`, `AMMETER_OVERLOAD`, `UNSTABLE`, `NO_GROUND`.

## Aufgaben schreiben (`defTask`)
`id ('1.1'), ch, title, story, brief, learn, take, hint, hint2, tags[], palette[], start, ref, wrong[], need{}, tests[], measure[], boss`
- Layout: `{parts:[{id,type,value?,props?,x,y,rot}], wires:[W('B1.p','R1.a')]}`. Anschluesse: siehe `PARTS` in engine.js (z. B. battery p/n, led a/k, Gatter in1/in2/out).
- **`bench`-Layout (Werkbank-Ansicht, optional pro Aufgabe)**: `bench: {parts:[{id,x,y,rot,side?}]}` – eigene Koordinaten pro Bauteil-ID fuer die Werkbank-Darstellung, von Hand gepflegt (keine automatische Ableitung aus dem Schema-Layout). Die Messgeraete stehen rechts (Bereich x > 930 freilassen, siehe `SPACES.bench.reserved` in `circuit-ui.js`). `id` muss zu einer `id` aus `start`/`ref` passen; `wires` werden nicht wiederholt (Topologie kommt aus dem Schema-Layout). Fehlt `bench`, faellt die Werkbank-Ansicht auf eine einfache Auto-Anordnung zurueck (Uebergangsloesung fuer noch nicht migrierte Aufgaben). `validate.js` prueft: jede `bench`-`id` existiert im Schema-Layout, keine verwaisten Eintraege.
- Bauteile aus `start` sind gesperrt (nicht loeschbar, Werte fix). Neue Bauteile bekommen automatisch IDs (erster Widerstand R1 …).
- `limit: {gates: 2, and: 0 …}` – hoechstens so viele Bauteile (Schluessel `gates` = alle Logikgatter).
- Tests koennen **Schrittfolgen** sein: `{name, steps:[{set?, run? (Sekunden Zeitsimulation), dt?, expect?}]}` – Zustand bleibt erhalten (Flipflops, Kondensatoren); vorher wird einmal "eingeschaltet". Weitere expect: `{sel, state:'sat'|'on'|'off'}`, `{sel:'AZ1', digit:5}`, `{a, b, ac:'dc'|'rms'|'avg'|'peak'|'pp', range:[min,max]}` (sets gelten auch dafuer).
- `measure` zusaetzlich: `value` (fester Rechenwert), `mode:'AC', q:…` (Oszilloskop/Mittelwert), `mode:'VAC', meterType:'avg'|'trms'`, `truth:{sel, q, pin?}` (pin = Anschluss fuer die Strommessung im Test).
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
`index.html?alle` schaltet alle Stationen frei (und gibt der Freien Werkbank alle Bauteile), `?werkbank` startet in der Werkbank-Ansicht (sonst gilt `settings.view`, Umschalt-Button in der Toolbar). `window.DigitalQuest` (state, openItem, editor, bench, core, setView, engine) fuer Tests.

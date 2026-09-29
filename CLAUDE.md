# CLAUDE.md – Digital Quest

Anleitung fuer Claude (Cowork / Claude Code) in diesem Repository.

## Was das ist
**Digital Quest** – eigenstaendiges, offline spielbares Lernspiel (Deutsch, Schweizer Schreibweise ohne ß) fuer Elektrotechnik und Digitaltechnik. Teil der spaeteren Dachmarke **Buehler Quest**, aber technisch unabhaengig von SPS Quest.
Idee: „zwischen Fritzing und LTspice“ – Lernende **bauen Schaltungen** im Schaltplan-Editor, die Schaltung wird **live simuliert**, und sie **messen** wie im Labor (Multimeter V/A/Ω, Oszilloskop). Messen ist gleichwertig mit Bauen.

Methode, Qualitaetsregeln und Design folgen dem Bauplan aus SCL Quest (`docs/BAUPLAN_LERNSPIEL.md`).

## Stand (29.09.2026)
**Alle 15 Kapitel sind fertig** (150 Aufgaben, 30 Theorien, alle in Schaltplan UND Werkbank per `tests/tasks.js` loesbar), Werkbank/Labor fertig, Karte nach Teilen I–IV mit Symbol-Kacheln und Sternen, Abzeichen Grundstufe (Boss 10.10) und Profi-Stufe (Boss 15.10).
**Portal wie SPS Quest** (Plan `docs/PLAN_PORTAL.md`, umgesetzt 29.09.2026 auf Branch `wip/portal`): Halle mit Toren, Login-Terminal, Leitstand, Administration, Vorgaben mit Frist, Live-Challenge (Sprint, Stoerungsjagd), Pruefung mit Zertifikat, Anleitungen, Feedback-Knopf. Vorbild ist das Repository `StevenMatzinger93/scl-quest` – bei Fragen zur Bedienung dort nachsehen. Moegliche Weiterentwicklung steht in `docs/STAND.md` → "Naechste Schritte".

## Einrichtung (neue Maschine / Cloud-Session)
```
cd dev
npm install                         # Playwright (Browser-Tests); qrcode-generator (QR-Code auf dem Zertifikat, freiwillig)
npx playwright install chromium     # Browser fuer tests/smoke.js, tests/portal.js und tests/tasks.js
```
Das Quellmaterial `99_inputs/` (Stevens Unterrichtsunterlagen) ist **bewusst nicht im Repository** (`.gitignore`) – es liegt lokal in Stevens OneDrive. Wer das Original braucht, fragt Steven.
Jeder Push auf `main` deployt automatisch (Cloudflare Worker). Halbfertiges daher auf einem Branch (`wip/…`) ablegen und erst mit gruenem Validator nach `main`.

## Aufbau
- `index.html` – ausgelieferte Einzeldatei, offline. **Generiert – nicht von Hand aendern.**
- `web/` – gehostete Version (**generiert**): `index.html` = Portal, `labor/` = das Spiel mit Konto-Abgleich (`window.DQ_PORTAL`), `data/dq.json` + `data/dq_live.json` (Aufgabenliste, Musterschaltungen, Stoerungsszenarien), `sw.js` (Portal und Labor offline; `/api/` und `/z/` nie aus dem Cache).
- `worker/` – Cloudflare Worker (`/api/…` und die Pruefseite `/z/Code`), Aufbau wie SPS Quest: `index.js` (Anmeldung, Cookie-Sitzung `dq_sess`, Header `x-dquest: 1` fuer Schreibzugriffe, Rollen admin/teacher/student, Klassen, Konten, Fortschritt `PUT /api/progress/dq`), `assign.js` (Vorgaben mit Frist), `challenge.js` (Live-Challenge), `reports.js` (Meldungen), `exam.js` + `cert.js` (Pruefung, Zertifikat), `db.js` (Migrationen im Code – neue Tabellen als neue Migration anhaengen, nie eine alte aendern), `lib.js`, `gen/exam_bundle.js` (**generiert** vom Build: Engine + Pruefungspool).
- `theorie/` – Stevens Theoriedokumente (Quellmaterial). Claude leitet daraus Lektionen, Fragen und Aufgaben ab.
- `docs/` – KONZEPT, ENTSCHEIDUNGEN, STAND, THEMEN, BAUPLAN_LERNSPIEL.
- `dev/`
  - `src/engine.js` – `window.DQEngine`: Netzliste, Knotenanalyse, Bauteile, Messgeraete, Zeitsimulation, Aufgabenpruefung. Kein DOM.
  - `src/circuit-ui.js` – `window.DQCircuit`, ansichtsneutraler Interaktionskern (Phase 1 erledigt): Bauteil hinzufuegen/bewegen/drehen/loeschen, Leitung ziehen, ID-Vergabe. Kein eigenes Rendering – wird von `editor.js` UND `bench.js` genutzt, damit Editier-Logik nicht zweimal existiert. Renderer melden nur Ereignisse in Modellkoordinaten (`clickPin`, `pressPart`, `dragTo`, `release` …) und haengen sich per `attach(view)` an. Zwei Koordinatenraeume: 'schema' (`p.x/p.y/p.rot`) und 'bench' (`p.bench = {x, y, rot}`, gespeichert im Entwurf).
  - `src/editor.js` – `window.DQEditor`: SVG-Schaltplan-Renderer (Raster 20 px, IEC-Symbole, Live-Anzeige) ueber dem Interaktionskern.
  - `src/bench.js` – `window.DQBench` (Grundgeruest steht seit Phase 2, **Herzstueck/Prioritaet**): 2.5D Werkbank-Renderer ueber demselben Interaktionskern wie `editor.js` (Bauteile, Kabel mit Messspitzen, Multimeter/Oszilloskop mit echten Geraetefronten). **Voll interaktiv** (bauen/verdrahten/drehen/loeschen genau wie im Schema, nicht nur Ansehen/Messen). Liest/schreibt denselben Schaltungszustand wie die Schema-Ansicht; Umschalt-Button Schema <-> Werkbank aendert nur die Darstellung. Positionen kommen aus dem `bench`-Layout der jeweiligen Aufgabe (siehe "Aufgaben schreiben"), nicht automatisch aus dem Schema-Layout abgeleitet. Stilvorbild: echtes Elektroniklabor/Physik-Praktikum, kein frei drehbares 3D. Siehe `docs/KONZEPT.md`, `docs/ENTSCHEIDUNGEN.md`.
  - `src/account.js` – `window.DQAccount`: Konto-Abgleich mit dem Portal (nur Portal-Version): Sitzung lesen, Spielstand abgleichen (base/409, der weitere Stand gilt, Konten nie mischen), Konto-Chip, Vorgaben fuer die Karte, `staff()` = Dozentenmodus (Dozenten-/Admin-Konto). `src/live.js` – `window.DQLive`: Live-Challenge im Spiel (`labor/?live=ID`). `src/exam.js` – `window.DQExamUI`: Pruefung im Spiel (`labor/?exam=ID`). `src/tiles.js` – `window.DQTiles`: Symbol je Kachel der Laborkarte (berechnet aus Musterloesung und Tags).
  - `src/exam_core.js` – `DQExam`: Pruefungskern (Vorlagen mit Parametern, Ziehung, oeffentliche Fassung, Bewertung). `src/content_exam/pool.js` – Pruefungsvorlagen G01–G11, P01–P10. **Beides gehoert nur in den Worker und in die Tests, nie ins Spiel** (der Build bricht sonst ab).
  - `src/app.js` – Spielsteuerung (Karte, Aufgabe, Theorie, Handbuch, Einstellungen, Speicherstand). Plus **Sandbox-Modus (Quick Win)**: freie Werkbank ohne Auftrag/Pruefung, alle bereits freigeschalteten Bauteile, ueber Karte erreichbar.
  - `src/style.css`, `src/index.template.html`
  - `src/content/` – `_helpers.js` (`defChapter`, `defTask`, `defTheory`, `W`), `_parts.js` (`DQ.parts` Teile I–IV der Karte, `DQ.awards` Abzeichen Grund-/Profi-Stufe), `werkstatt.js` (Uebungswerkstatt `DQ.workshop`, id `W`, Mess-Aufgaben W1–W10 mit `defMessaufgabe` = defTask mit `palette: []`, `ref = start`; ausserhalb der 15 Kapitel, immer offen), `datasheets.js` (Bauteil-Datenblaetter: nur Texte, Zahlen live aus der Engine; neuer Bauteiltyp braucht einen Eintrag, sonst meldet der Validator einen Fehler), `_logic.js` (`LG`: Board-Layouts, Wahrheitstabellen-Tests, Tabellen-HTML, Minterme – fuer Logik-Kapitel), `chNN.js` (je Kapitel Aufgaben + 2 Theorien), `manual.js`
  - `portal/` – Quellen des Portals: `body.html`, `portal.css`, `portal.js` (Halle, Terminal, Konto, Administration; stellt `window.DQP` bereit), `portal_leitstand.js`, `portal_live.js`, `portal_pruefung.js`, `portal_zertifikate.js`, `portal_anleitung.js`, `portal_meldungen.js` (haengen sich ueber `DQP.routes`, `DQP.nav` … ein), `report.js` (Feedback-Knopf in Portal und Labor), `impressum.html`, `datenschutz.html`.
  - `build.js`, `validate.js`, `validate_exam.js`, `exam_pool.js`, `test_engine.js`, `test_api.js`, `test_exam_api.js`, `tests/smoke.js`, `tests/portal.js`, `tests/tasks.js` (Playwright), `tests/apiroute.js` (haengt Website + Worker-Code + D1-Nachbau unter `https://dq.test` in den Testbrowser), `tests/d1mock.js`

## Arbeitsablauf
```
cd dev
node test_engine.js      # Engine-Tests
node validate.js         # muss "OK — keine Fehler" ausgeben
node validate_exam.js    # Pruefungspool: jede Vorlage × Parameter (Musterloesung besteht, Fehler scheitern, nichts verraten)
node build.js            # erzeugt ../index.html, ../web/ und ../worker/gen/exam_bundle.js
node tests/smoke.js      # Browser-Durchlauf (Playwright/Chromium), Screenshots in tests/shots
node tests/tasks.js      # jede Aufgabe + jedes Bauteil in Schaltplan UND Werkbank nur ueber die Bedienung loesbar (Filter: 2.5 | 2. | W*)
node test_api.js         # Worker-API gegen D1-Nachbau (node:sqlite), ohne Cloudflare
node test_exam_api.js    # Pruefungen und Zertifikate (braucht das Bundle aus build.js)
node tests/portal.js     # Portal-Rundgang und Pruefung bis zum Zertifikat im Browser
```
Fertig heisst: Tests gruen, Validator 0 Fehler, Browser-Durchlauf fehlerfrei, `tests/tasks.js` gruen (Regel: **jede Aufgabe muss im Schaltplan und auf der Werkbank loesbar sein**), Handy ok, offline spielbar. Nach jedem Abschnitt `docs/STAND.md` aktualisieren.

## Engine-Semantik (engine.js)
- Knotenanalyse; alle Quellen als Norton-Ersatz (Spannungsquelle mit Innenwiderstand `ri`, Standard 0,05 Ω) → keine Zusatzzeilen, Kurzschluss bleibt loesbar und wird ueber `imax` erkannt.
- Jeder Knoten hat 1e-9 S gegen Masse (Gmin); offene Schalter/gesperrte Dioden 1e-12 S.
- Bezugspunkt: Masse-Symbol (`ground`); fehlt es, ist der Minuspol der ersten Spannungsquelle 0 V (`autoGround`).
- Dioden/LEDs stueckweise linear (U_F + r_s), iterativ. LED-Farben: rot 1,8 V, gelb 2,0, gruen 2,1, blau 3,0, weiss 3,1; `imax` 30 mA → durchgebrannt (bleibt defekt bis „Reparieren“).
- Logikgatter: 5-V-Logik, Schwelle 2,5 V, Ausgang 25 Ω, Versorgung implizit (brauchen aber einen Bezugspunkt). Gatter werden einzeln nachgefuehrt (Gauss-Seidel) → Speicherschaltungen (RS aus NOR) stabil; Rueckkopplungen ohne Ruhelage → `UNSTABLE`.
- Kondensator: Backward Euler (`dt`), im Gleichstrom-Arbeitspunkt offen. Taktgeber: Rechteck `freq`.
- Wechselspannungsquelle `acsource` (Praefix G, p/n): `value` = Scheitelwert Û, `freq`, `shape` sine|square|triangle, `offset`; Momentanwert `E.wave(q, t)`. `E.acMeasure(layout, {a,b})` simuliert 5 Perioden der langsamsten Wechselquelle (vorher Einschwingen bis 5·R·C, Abtastung fein genug fuer das kleinste R·C) und liefert `dc`, `rms` (TRMS, AC-gekoppelt), `avg` (Mittelwert-Gleichrichter × 1,1107), `peak`, `pp`.
- Zustand (`newState`): `burnt`, `vC`, `logic`, `diode`, `fuse`, `t`.
- **Zeitlupen-Replay (umgesetzt)**: `step(net, state, {trace:true})` liefert `res.trace` = Rechenschritte `{iter, kind:'diode'|'gate'|'done'|'unstable', changed:[{id,to}], res}`, max. `E.TRACE_MAX` (200). Zeitschritte dynamischer Schaltungen haelt die App (letzte 300). UI: Toolbar "Zeitlupe".
- **Diagnose aus echten Werten (umgesetzt)**: Stoerungen tragen Ist-/Grenzwerte (`LED_BURNT` i/imax/vf, `SHORT` i/imax/u/ri, `OVERLOAD` p/pmax/v/i, `LAMP_BURNT` p/pnom, `LED_REVERSE` v/vmax, `AMMETER_OVERLOAD` i/imax); Werte beim Durchbrennen in `state.burnInfo`, Sicherungsstrom in `state.fuseInfo`. Texte in `app.js` (`FAULT_TEXT`) rechnen daraus vor.
- Multimeter: V = 10 MΩ parallel; A = 0,1 Ω Shunt zwischen den Spitzen, Sicherung 10 A (parallel zur Quelle → `FUSE`); Ω nur spannungsfrei (sonst Fehler), Pruefstrom 1 mA, > 40 MΩ = `OL`.
- **Messgeraete-Realismus (umgesetzt)**: `E.dmm(value, unit, rng)` = Anzeige wie 6000-Digit-DMM (Bereichswahl, `METER.cal` +0,2 %, letzte Stelle ±1 Digit; `rng = 0` ohne Rauschen). Bereich `VAC` (`measure({mode:'VAC', meterType:'avg'|'trms'})`); Panel und Werkbank-Multimeter: OFF/V⎓/V~/A⎓/Ω, Verfahren AVG/TRMS in `settings.meterType` (Standard TRMS). V⎓ zeigt bei Wechselquellen ≥ 5 Hz den Mittelwert. Die Pruefung (`runTask`) nutzt immer die exakten Werte, nie die verrauschte Anzeige.
- **Weitere Bauteile** (seit 28./29.09.2026): Pegelschalter `logicin` (closed = 1), Logikanzeige `logicled`, `xnor`, BCD-Decoder `dec7` (A–D → a–g), 7-Segment `seg7`, Flipflops `dff`/`jkff`/`tff` (steigende Flanke an C, Zustand in `state.ff`), NPN `npn` (Zustaende off/on/sat, β), Z-Diode `zener` (vz), Motor `motor` (r.speed). `props.defect` bei Widerstand/Lampe/Motor = verdeckte Unterbrechung. Jedes Bauteil liefert `r.pin` = Strom je Anschluss (Stromfluss-Anzeige). Stoerung `OUTPUT_CLASH` = zwei Ausgaenge gegeneinander.
- **Datenblatt-Werte**: `E.LIMITS` (lampBurn, ledReverse) und alle `props` in `PARTS` werden vom Datenblatt live gelesen – Grenzwerte nur in engine.js aendern. Freistehende Bilder: `DQEditor.icon`, `DQBench.icon`.
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
- **`visual` (Bild/Animation, optional, Objekt oder Liste)**, analog zu `bench` bei Aufgaben – Plan `docs/PLAN_THEORIE_ANIMATIONEN.md`, Code `src/visuals.js` (`window.DQVisuals`). Eingesetzt an `{{visual}}` (bzw. `{{visual:2}}` …) im `lesson`-Text, sonst das erste Bild nach dem ersten Absatz, weitere am Ende. Gemeinsam: `caption` (HTML).
  - `{type:'circuit', layout:{parts,wires}, bench?, view?:'schema'|'bench', toggleView?, flow?, volt?, sliders?:[{part, prop ('value'|Eigenschaft), label, min, max, step?, unit?, log?, round?} | {part, prop, label, choices:[{value, label}]}], readouts?:[{label, sel, q:'v'|'i'|'p'|'brightness'|'on'|'out'|'speed'|'state', unit?} | {label, a, b} | {label, a, b, ac:'rms'|'avg'|'dc'|'pp'|'peak'}], scope?:{a, b, span, label}, slow?, height?}` – Mini-Schaltung (`src/mini.js`): derselbe Kern (`DQCircuit` mit `readonly`), derselbe Renderer (`DQEditor`/`DQBench` mit `tight`) und dieselbe Engine wie im Labor; bedienbar sind nur Schalter, Taster, Pegelschalter und die Regler. Kein neues Zeichensystem.
  - `{type:'numberSteps', steps:[{text, rows:[{label, cells:[…], hl:[Index], note}]}]}` oder mit Erzeuger `mode` – Zahlen-Schritt-Widget (Kaestchen, hervorgehobene Stellen, ◀ ▶ Abspielen). Erzeuger: `mode:'gray', bits, parity` (Binaer/Gray-Zaehler, geaenderte Bits blinken, Paritaet als XOR-Kette), `mode:'divide', value, base` (fortgesetzte Division, Probe mit Wertigkeiten), `mode:'bases', value` (BCD, Hex, Horner), `mode:'dmm', value, unit` (Messbereiche, Aufloesung, ±1 Digit und Kalibrierfehler aus `E.DMM_RANGES`/`E.METER`).
  - `{type:'kmap', vars:2..4, minterms:[…], dc?:[…], names? ('e1'…), out? ('A'), edit? (true)}` – KV-Diagramm wie in Kapitel 8 (Spalten e2 e1, Zeilen e3 bzw. e4 e3, Gray-Reihenfolge); Felder anklicken (0 → 1 → X), „Paeckchen bilden“ = minimale Ueberdeckung (exakt) mit farbigen Schleifen und Term.
  - `{type:'bode', stages:[{kind:'lp'|'hp', r, c}, …], fmin?, fmax?, f?, dbMin?}` – Frequenzgang (dB ueber log f) einer unbelasteten RC-Kette wie in Kapitel 14, komplex gerechnet; Grenzfrequenzen und −3 dB markiert, Frequenz-Regler mit U_a/U_e, dB und Phase. Der Validator vergleicht die Kurve an jeder Grenzfrequenz mit der Engine (E.acMeasure an der echten Schaltung).
  - `{type:'block', svg:'<svg …>'}` – Blockbild als fertiges Inline-SVG.
  - Validator: jede Theorie hat `visual` oder `visualNone: 'Grund'`; Typ bekannt, Pflichtfelder je Typ (circuit: Layout baubar, bench-/Regler-/Anzeige-IDs vorhanden; bode: Kurve = Engine), nicht mehr Platzhalter als Bilder. `tests/smoke.js` oeffnet alle 30 Lektionen: jeder Baustein rendert und reagiert (Mini-Schaltung: echter Klick auf einen Schalter aendert die Schaltung, Zeit laeuft mit; Instanzen unter `DigitalQuest.visuals`).

## Speicherstand
`localStorage` Schluessel `digitalquest_state_v1`: `profile {id (UUID), vorname, nachname, pseudonym}`, `done`, `doneInfo {id:{at, tries, hints, stars}}`, `drafts {taskId:{layout, answers}}`, `theory`, `events [{t, type, id, …}]`, `settings`. Beim Laden bringt `normalize()` (app.js) alte Spielstaende auf diesen Aufbau.
Portal-Version zusaetzlich: `dquest_sync_dq` (`{user, role, base, dirty}` – zu welchem Konto der lokale Stand gehoert), `dquest_vorgaben_dq` (zuletzt geladene Vorgaben), `dq_exam_<ID>` (Entwuerfe einer laufenden Pruefung). Das Spiel laeuft ohne Konto und offline. An den Server geht der Spielstand ohne Vor-/Nachname; Live-Challenge und Pruefung veraendern den Spielstand nicht.
Vorbereitung Buehler Quest: UUID als Personen-ID, Namen getrennt, Ereignisliste mit Zeitstempel und Tags. **Keine** Verknuepfung zu SPS Quest bauen, solange nicht ausdruecklich verlangt. Eigene D1-Datenbank (nicht die von SCL Quest).

## Entwickeln
`index.html?alle` schaltet alle Stationen frei (und gibt der Freien Werkbank alle Bauteile). Fuer Lehrpersonen: **Dozentenmodus** = im Portal mit einem Dozenten- oder Admin-Konto angemeldet (Kennzeichen DOZENT, Sprungliste auf der Karte). Portal-Version: `labor/?frei=1` (Freie Werkbank), `?werkstatt=1` (Uebungswerkstatt), `?live=ID` (Live-Challenge), `?exam=ID` (Pruefung). `?werkbank` startet in der Werkbank-Ansicht (sonst gilt `settings.view`, Umschalt-Button in der Toolbar). `window.DigitalQuest` (state, openItem, editor, bench, core, setView, engine, account, liveChallenge, examUI, summary) fuer Tests.

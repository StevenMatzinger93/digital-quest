# Auftrag 6 – Verbesserungen nach Lernenden-Feedback (01.10.2026)

Für Claude Code. Grundlage: 27 Meldungen aus dem Feedback-Knopf (Digitaltechnik 2026 Gruppe 2, Davi / Nicolas / Lukas, 01.10.2026, 08:03–12:52, Chrome/Edge unter Windows). Alle vom Typ «Feedback», Schwerpunkt Kapitel 16. Die Meldungen sind im Anhang wörtlich zusammengefasst und den Phasen zugeordnet.

**Arbeitsweise:** Branch `wip/feedback-1010`, eine Phase = ein Commit (oder mehrere), nach jeder Phase `npm test`-Äquivalent aus CLAUDE.md (Engine-Tests, Validator, Build, `tests/smoke.js`, `tests/tasks.js`, `test_api.js`). Erst mit grünem Validator nach `main` (jeder Push auf `main` deployt live). `docs/STAND.md` nach jeder Phase aktualisieren. Dateien unter `index.html`, `web/`, `worker/gen/` sind generiert – nie von Hand ändern.

**Reihenfolge ist wichtig:** Phase 2 (Umlaute) berührt fast jede Inhaltsdatei und kommt deshalb **vor** allen inhaltlichen Änderungen (Phasen 3–6), damit keine Merge-Konflikte und keine neuen ae/oe/ue-Texte entstehen.

---

## Entscheidungen von Steven (verbindlich)

| Thema | Entscheidung |
|---|---|
| Umlaute | Im ganzen Spiel (Kapitel, Theorien, Aufgaben, Handbuch, Portal, Meldungen, Zertifikat, Prüfungspool) auf echte ä/ö/ü umstellen. ß bleibt ss (Schweizer Schreibweise). |
| Lösungen | Lösung mit Rechenweg abrufbar **nach 2 Fehlversuchen**. Die Station zählt dann ohne 3 Sterne. |
| Weitermachen | **Teilwertung pro Messwert**: richtige Werte zählen, die Station gilt als abgeschlossen, sobald jeder Wert richtig oder aufgedeckt ist. |
| T16A | Straffen (Text kürzen, Zusatzblöcke ausklappbar) + Tempo-Regler und Pause für die Animation. |
| Messspitzen | **Ziehen auch für alle Altaufgaben** (heute `measureUX: 'legacy'`, Klick). |
| Mess-Hilfe | Konkrete Fehlermeldung beim falschen Anschluss + Einstellungs-Box in jeder Messaufgabe. |
| Mess-Animation | **Vorführ-Modus**: Spitzen werden automatisch gesetzt, Messwert und Rechenweg erscheinen Schritt für Schritt. |
| Festo-LX-Übersicht | Verworfen. Nicht umsetzen. |

---

## Phase 0 – Vier Punkte reproduzieren (kein Code, nur Befund)

Vor jeder Änderung diese vier Meldungen mit Playwright oder von Hand nachstellen und das Ergebnis in `docs/STAND.md` (Abschnitt «Feedback 01.10.2026») festhalten: Bug, Missverständnis oder Wunsch? Bei Bug gleich in Phase 4 beheben.

1. **Oszilloskop-Reset (Theorie T16C / Messaufgaben):** «Man muss beim Oszilloskop alles zurücksetzen, damit man die Lösungen richtig hat, obwohl alle Rechnungen und Messungen richtig sind.» Verdacht: Die Messwertprüfung hängt vom Gerätezustand ab (Tastkopf-Position, Zeitbasis, Kanal, Triggerung, `scopeProbes`) statt nur vom eingetragenen Wert, oder ein alter Zustand aus einer früheren Aufgabe bleibt hängen. Befund: welcher Zustand beeinflusst die Prüfung? Soll nur der **eingetragene Wert** gegen den Sollwert (`truth`) geprüft werden – das ist die bisherige Regel («Prüfung nutzt exakte Werte»).
2. **Schalter in 16.2:** «Bei Schaltern kommt nur Strom, wenn sie unbetätigt sind.» Prüfen, ob die Schalter auf der Werkbank (S1/S2) beim Anklicken tatsächlich öffnen/schliessen, ob die Beschriftung/Darstellung (Schliesser/Öffner, Stellung) missverständlich ist, oder ob ein Bug vorliegt (Zustand invertiert, Taster statt Schalter, falscher Startzustand). In Schaltplan **und** Werkbank prüfen.
3. **Strommesszange (T16A, Bild `IMG_ZANGE` in `ch16.js`):** «Die Grafik bei der Strommesszange ist falsch dargestellt.» Bild rendern (Screenshot) und gegen die Lektion prüfen: Zange umschliesst genau **einen** Leiter, Strompfeil/Magnetfeld richtig, Hin-/Rückleiter nicht beide in der Zange, Beschriftung stimmt. Rückfrage an Steven mit Screenshot, falls unklar, was Davi meint.
4. **«Werkbank auch rauf und runter bewegen» (16.6, Nicolas):** Klären, was gemeint ist: (a) Bauteile lassen sich nur horizontal verschieben, (b) die Ansicht lässt sich nicht scrollen/verschieben, (c) das Platzangebot ist unten/oben zu klein. Befund festhalten; falls Bauteile tatsächlich nur horizontal beweglich sind, ist das ein Bug in `bench.js`/`circuit-ui.js` (Bench-Koordinaten `p.bench = {x, y, rot}`).

Zusätzlich zwei unklare Meldungen einordnen (kein Auftrag, nur Befund):
- **T1B / «Messen ist Absicht, weil man es einfach ablesen kann 50/50» (Lukas):** Gibt es in T1B/Kapitel 1 Messaufgaben, bei denen der Wert aus Schaltplan oder Aufgabentext direkt ablesbar ist (trivial) oder die Auswahl erratbar ist? Liste der betroffenen Aufgaben im STAND notieren.
- **Aufgabe 1.5 / Altaufgaben:** «Messspitzen des Multimeters nicht bewegen … Ergebnisse nur erraten.» Prüfen, ob in 1.5 (legacy, Klick auf Buchse) auf der Werkbank wirklich etwas nicht funktioniert oder ob die Lernenden nur das neue Ziehen erwarten. Wird durch Phase 4 gelöst, Befund trotzdem notieren.

---

## Phase 1 – Kleine Korrekturen (Quick Fixes)

Jeweils mit einem Test in `tests/smoke.js` bzw. `tests/portal.js` absichern.

1. **Logo → Startseite** (Davi, W2): Im Labor ist `.brand` in `src/index.template.html` nur ein Bild. Klick auf das Logo führt zur Startseite des Portals (`/`), in der Offline-Einzeldatei `index.html` zur Laborkarte. Tastaturbedienbar (Link, nicht nur `onclick`). Gilt auch im Portal selbst (Halle).
2. **Passwort-Anzeige** (Lukas, `#/login`): Auge-Knopf (Passwort ein-/ausblenden) an allen Passwortfeldern des Portals: Login (`#lgPw`), Registrierung (`#rgPw`) und «Passwort ändern» (`portal.js`). Standard bleibt verdeckt, `aria-label`, Zustand wird nicht gespeichert, Feld behält Fokus.
3. **Zurück-Navigation** (Davi, Laborkarte: «Man kann nicht zurück klicken»): Karte → Station → Karte soll mit der Browser-Zurück-Taste (und Handy-Zurück-Geste) funktionieren, statt die Seite/App zu verlassen. Umsetzung mit History-API (`pushState`/`popstate` oder Hash-Routing) für die Screens in `app.js` (Karte, Aufgabe, Theorie, Handbuch, Tutorial, Einstellungen, Rechner-Overlay schliesst zuerst). Zusätzlich sichtbarer **«← Zurück zur Karte»-Knopf** in Aufgabe und Theorie, falls nicht vorhanden. Offline-Datei (`file://`) darf dadurch nicht kaputtgehen (Hash-Routing bevorzugen).
4. **Rundungshinweis** (Davi, 16.4): Im Messprotokoll **jeder** Messzeile die Toleranz anzeigen («Toleranz ±3 %», aus `tol`), dazu ein fester Hinweis im Protokollkopf: «Gib den Wert so an, wie dein Gerät ihn anzeigt bzw. wie du ihn berechnest. Innerhalb der Toleranz ist er richtig – auf eine sinnvolle Stellenzahl runden.» Bei Rechenwerten (`value`) zusätzlich Einheit und Stellenzahl-Hinweis. Keine Änderung an der Prüflogik.
5. **Impressum und Datenschutz** (Davi, Portal `/`: «nicht verfügbar»): Auf der Live-Seite prüfen, ob die Links in der Fusszeile funktionieren (`web/impressum.html`, `web/datenschutz.html`; Link in `portal/body.html`), ob sie vom Service Worker (`sw.js`) korrekt ausgeliefert werden und ob die Seiten auch aus dem Labor, der Einzeldatei und dem Anmeldebildschirm erreichbar sind (Fusszeile dort ergänzen). Laut STAND sind beide Seiten **Vorlagen** – **keine Betreiberangaben erfinden**. Falls Platzhalter drinstehen, sichtbar kennzeichnen und Steven in der Übergabe nach den echten Angaben fragen (Name/Adresse/E-Mail des Betreibers).
6. **Oszilloskop im Werkbank-Tutorial grösser** (Lukas): «zweite Angabe für die Sachen des Oszilloskops, die übersichtlicher und grösser ist». Knopf «Vergrössern» am Oszilloskop des Tutorials (und der Werkbank), der den Schirm samt Messwert-Anzeigen (Û, T, f, Bereiche) gross und gut lesbar im Overlay zeigt; Esc oder Klick daneben schliesst. Kein Zustandsverlust. Handy-tauglich.

---

## Phase 2 – Echte Umlaute im ganzen Spiel

**Ursache:** CLAUDE.md sagt «Schweizer Schreibweise ohne ß». Das wurde als «ae/oe/ue» umgesetzt: Lernende sehen «ueber», «Geraet», «waehlst», «erhoehen». Richtig ist: ä/ö/ü schreiben, nur ß durch ss ersetzen.

**Vorgehen (kein blindes Suchen-und-Ersetzen):**
1. Betroffene Quellen erfassen: `src/content/*.js` (ch01–ch16, `werkstatt.js`, `manual.js`, `datasheets.js`, `_parts.js`, `_helpers.js`-Texte), `src/app.js` (`FAULT_TEXT`, Texte), `src/*.js` mit sichtbaren Strings (`editor.js`, `bench.js`, `calc.js`, `visuals.js`, `live.js`, `exam.js`, `account.js`, `tiles.js`), `src/content_exam/pool.js`, `src/index.template.html`, `portal/*` (`body.html`, `portal*.js`, `report.js`, `impressum.html`, `datenschutz.html`), `worker/*.js` (Fehlermeldungen/Texte, Zertifikat), `docs/` (Doku darf bleiben, aber neue Texte mit Umlauten).
2. Umwandlung nur **in sichtbaren Textinhalten**, nie in Bezeichnern: Aufgaben-/Theorie-IDs, Tags (`messen.strom`), CSS-Klassen, Funktions- und Variablennamen, Dateinamen, JSON-Schlüssel, Event-Typen, `speichernamen` bleiben unverändert (ASCII).
3. **Wörterliste statt Regel:** Aus allen Strings die Wörter mit `ae|oe|ue` extrahieren, jedes Wort **einzeln** entscheiden (Liste in `dev/umlaut_woerter.json` pflegen, mit «umwandeln» / «bleibt»). Legitim bleiben z. B.: Quelle, Quellen, neue/neu…, aktuell, Dualsystem-Wörter mit «ue» in Fremdwörtern (Duett, Queue, Statue), Eigennamen/Einheiten, Vorsilben wie «Inter-», «Poe». Achtung Zusammensetzungen (Zuerst vs. «zue», «Spannungsquelle» enthält legitim «ue»). Bei Unsicherheit **nicht** umwandeln und in die Liste «prüfen» schreiben.
4. ß → ss bleibt (Schweizer Schreibweise); falls im Bestand noch ein ß steht, ersetzen.
5. **Validator-Regel** (`validate.js`): warnt/bricht bei verbleibenden Wörtern aus der Umwandlungsliste (z. B. «ueber», «Geraet», «waehl», «hoeher», «Spannungsabfall» ist ok!). Gleiche Regel für neue Texte, damit nichts zurückfällt. Die Regel arbeitet mit der Wortliste (nicht mit dem Muster `ue`).
6. **Folgen prüfen:** Suchfelder/Filter (Sprungliste, Handbuch-Suche, Tags) und Vergleiche von Texteingaben (Prüfungsantworten, `worked`-Eingaben, Textantworten) dürfen nicht an Umlauten scheitern; Schriftarten im Zertifikat-Canvas und im PDF müssen ä/ö/ü darstellen; Vorlesen (Web Speech) spricht Umlaute besser als Umschreibungen; Service-Worker-Cache-Version erhöhen, damit die alten Texte nicht aus dem Cache kommen.
7. **CLAUDE.md anpassen** (wichtig, sonst entsteht das Problem neu): Zeile «Schweizer Schreibweise ohne ß» ersetzen durch «**Schweizer Schreibweise: echte Umlaute ä/ö/ü, ß wird immer zu ss.** Keine ae/oe/ue-Umschreibung in sichtbaren Texten (Bezeichner/IDs bleiben ASCII).» Auch in `docs/BAUPLAN_LERNSPIEL.md` und anderen Doku-Stellen angleichen.

**Abnahme:** Stichprobe aller 33 Theorien und aller Kapitel (mind. je 3 Aufgaben pro Kapitel) im Browser, Screenshots vorher/nachher für T16A, 16.2, Karte, Handbuch, Portal. `tests/tasks.js` (alle Aufgaben, beide Ansichten) und `test_exam_api.js` müssen grün bleiben (Prüfungspool-Texte!). Liste «prüfen» in der Übergabe an Steven.

---

## Phase 3 – Lösungsansicht und Teilwertung

### 3.1 Lösungsansicht nach 2 Fehlversuchen
- Zählung: ein Fehlversuch = eine fehlgeschlagene Prüfung der Aufgabe (`doneInfo.tries`, bei Messprotokoll je Messwert, siehe 3.2). Nach dem 2. Fehlversuch erscheint der Knopf **«Lösung ansehen»**. Vorher nicht, auch nicht per Klick auf Hinweis.
- Inhalt der Lösung (aus bestehenden Daten, soweit vorhanden): (a) die **Referenzschaltung** (`ref`) als Mini-Schaltung (vorhandene `mini.js`), (b) **Sollwerte** aller Messwerte (aus `truth`/`value`/Engine, wie Validator), (c) ein **Rechenweg** pro Messwert/Rechenaufgabe.
- Neues optionales Feld `defTask.rechenweg` (HTML oder Liste von Schritten). Für **Kapitel 16 (16.1–16.8) und alle Aufgaben mit `value`/Rechenwert Pflicht** (Validator-Warnung, wenn es fehlt); für die restlichen Aufgaben wird der Rechenweg aus `measure`/Sollwert **automatisch minimal erzeugt** («Messwert U = … V an R1»), kein Handschreiben von 160 Texten. Rechenwege bevorzugt im Muster des `worked`-Bausteins (Schritte, Formel, Zahl, Einheit).
- Aufgabe 16.1 hat laut Meldung «Lösungen fehlen bei manchen Messaufgaben»: Alle 8 Aufgaben von Kapitel 16 prüfen, dass **jeder** Messwert einen Sollwert und Rechenweg in der Lösungsansicht hat.
- **Sterne:** Lösung angesehen → höchstens 1 Stern für diese Station. Dokumentieren in `STAND.md` und im Handbuch («Sterne»).
- Ansehen **schaltet nichts frei**: Die Station gilt nicht als erledigt, solange nicht selbst richtig gebaut/gemessen wurde (bzw. 3.2). Kein «Lösung übernehmen»-Knopf.
- **Nicht in Prüfung und Live-Challenge**: dort gibt es nie eine Lösungsansicht (ebenso keine Vorführung, Phase 6). `worker/exam.js` unverändert; Test, dass die öffentliche Fassung nichts verrät, bleibt grün.
- Ereignis `solution_view` (mit Aufgaben-ID, Anzahl Fehlversuche) in die Ereignisliste für den Leitstand; Leitstand-Schülerdetail zeigt das Merkmal «Lösung angesehen».

### 3.2 Teilwertung pro Messwert («weitermachen»)
- Heute blockiert ein falscher Wert die Station (Beispiel 16.5: ein Zahlenwert stimmt nicht, man kommt nicht weiter). Neu wird **jeder Messwert einzeln geprüft**; ein Wert gilt als **richtig**, **offen** oder **aufgedeckt** (nach 2 falschen Versuchen an diesem Wert erscheint Sollwert samt Rechenweg für genau diesen Wert).
- Die Station ist **abgeschlossen**, sobald jeder Messwert richtig oder aufgedeckt ist und alle Schaltungstests (`tests`) bestanden sind. Schaltungsbau und Tests bleiben Pflicht; die Teilwertung gilt nur für die Werte im Messprotokoll.
- **Sterne:** 3 = alles richtig, kein Fehlversuch, kein Tipp, keine Lösung; 2 = alles richtig mit Fehlversuch oder Tipp; 1 = mindestens ein Wert aufgedeckt oder Lösung angesehen. Die genaue Regel gegen `doneInfo` prüfen und mit den bestehenden Spielständen (Rückwärtskompatibilität, `normalize()`) verträglich halten. Alte Spielstände dürfen keine Sterne verlieren.
- Anzeige im Protokoll: je Zeile Status (✓ richtig, ✗ falsch, ⟳ aufgedeckt), oben «x von y Werten richtig». «Weiter» (nächste Station) wird freigegeben, sobald die Station abgeschlossen ist.
- Auswirkungen prüfen: Freischaltlogik der Karte, Abzeichen-/Zertifikat-Voraussetzungen («80 % der Aufgaben der Stufe + Boss»: **aufgedeckte Aufgaben zählen als erledigt, aber nicht als 3 Sterne** – nur so, wenn das Abzeichenkriterium Sterne gar nicht verlangt; sonst Stevens Entscheid einholen), Vorgaben mit Frist, Erledigt-Status im Leitstand und Sync (`PUT /api/progress/dq`, `base`/409), Prüfungsmodus (unverändert: keine Teilwertung nach dem Prinzip, die Prüfung bewertet wie bisher exakt).

---

## Phase 4 – Messen auf der Werkbank (Ziehen für alle, konkrete Hilfe)

### 4.1 Messspitzen ziehen auch in allen Altaufgaben
- Alle bisherigen ~160 Aufgaben (heute `measureUX: 'legacy'`) arbeiten auf der Werkbank mit Ziehen der Messspitzen (und des Oszilloskop-Tastkopfs). Die Schema-Ansicht bleibt beim Klick.
- **Wichtig – zwei Dinge trennen:** Das *Ziehen der Spitzen* wird für alle Aufgaben Standard. Die *manuelle Messbereichswahl* (heute an `drag` gekoppelt, falscher Bereich → OL) soll für Altaufgaben **nicht** plötzlich Pflicht werden, sonst werden die Einstiegskapitel schwerer. Lösungsvorschlag: neues Flag `rangeUX: 'auto' | 'manual'` (Standard `auto` für Kapitel 1–15 und Werkstatt, `manual` für Kapitel 16 und das Tutorial) oder `measureUX` in zwei Flags aufteilen. Entscheid dokumentieren.
- Klick auf eine Buchse bei `drag` verbindet weiterhin Leitungen (bestehend). Fehlwurf legt die Spitze zurück (bestehend).
- Validator: das Flag `measureUX` darf bestehen bleiben, die Standardwerte aber ändern sich; alle ~160 Aufgaben müssen per `tests/tasks.js` (`atomicDrag`, Werkbank) lösbar bleiben. Falls Aufgaben mit Platzproblemen auffallen (Messspitzen-Park-Position kollidiert mit Bauteilen), `bench`-Layouts anpassen.
- Die Meldung zu 1.5 (Phase 0) damit ebenfalls geschlossen.

### 4.2 Konkrete Fehlermeldungen beim Messen
Heute erscheint bei falschem Anschluss eine allgemeine Meldung («wie soll ich das ganze nun richtig anschliessen?», 16.2). Alle Messfehlerfälle erhalten eine **konkrete, handlungsorientierte** Meldung mit Hinweis, was zu tun ist (Text mit Umlauten, Phase 2 beachten):
- Amperemeter parallel zur Quelle / Sicherung (`FUSE`): «A-Messung immer in Reihe, Spitzen sind im Parallelzweig. Kreis auftrennen und das Messgerät einsetzen.»
- Ω an einer Schaltung unter Spannung: «Widerstandsmessung nur spannungsfrei: Quelle ausschalten oder Bauteil herauslösen.»
- Bereich zu klein (OL) / zu gross (zu wenig Auflösung): «Bereich zu klein/gross – nimm den nächsten passenden Bereich (z. B. 20 V statt 2 V).»
- Modus falsch (V⎓ vs. V~, A statt V): «Du misst V~, die Schaltung liefert Gleichspannung – wähle V⎓.»
- Spitzen vertauscht / negative Anzeige: «Negatives Vorzeichen: rote und schwarze Spitze sind vertauscht – das ist zulässig, der Betrag stimmt.»
- Keine zwei Spitzen angeschlossen / nur eine Buchse: «Zwei Spitzen setzen: rot an den Pluspunkt, schwarz an den Bezugspunkt.»
- Oszilloskop ohne Tastkopf/ohne Erdungsclip: bestehender Text «Tastkopf anschliessen» ergänzen: «Tastkopf an den Messpunkt, Erdungsclip an Masse.»
Die Meldungen müssen aus **echten Zuständen** kommen (`core.scopeProbes`, Multimeter-Modus, Bereich, Kreisstruktur), nicht aus Annahmen. Je ein Test in `tests/smoke.js` (Abschnitt «Bedienung»).

### 4.3 Einstellungs-Box in jeder Messaufgabe
Unter dem Aufgabentext (vor dem Protokoll) eine Box «**So stellst du das Gerät ein**» je Messwert: Messmodus, Bereich (nur bei `manual`), Spitzenpositionen, bei Oszilloskop Kanal/Bildbreite. **Automatisch** aus `measure[]` erzeugt (Modus `mode`, Spitzen `a`/`b`, kleinster Bereich ≥ Sollwert), Handüberschreibung per optionalem Feld `setup` möglich. Neu für alle Kapitel-16-Aufgaben prüfen (16.2: «zu viele Funktionen, unklar welche Einstellungen» – dort zuerst).

### 4.4 Werkbank-Details
- Nach Phase-0-Befund: Bauteile auf der Werkbank auch **vertikal** bewegbar bzw. Ansicht verschiebbar machen (falls Bug bestätigt).
- Schalter in 16.2 nach Befund korrigieren (Darstellung/Beschriftung Schliesser/Öffner oder Bug).
- **Oszilloskop-Reset-Bug** (T16C/Messaufgaben) nach Befund beheben: Die Prüfung vergleicht **nur den eingetragenen Wert** mit dem Sollwert; Gerätezustand darf die Wertung nicht verändern. Test: richtige Messung → Wert eintragen → ohne Zurücksetzen bestanden; zusätzlich: Wechsel zwischen Aufgaben setzt Gerätezustand sauber zurück, ohne dass Lernende es manuell tun müssen.
- Aufgabentexte der Messaufgaben: pro Aufgabe prüfen, ob der Text vage ist («viel geschrieben, schlussendlich nicht klar, welche Einstellungen»); Vorgehen als nummerierte Schritte (Auszug aus Einstellungs-Box), Rest als kurzer Hintergrund.

---

## Phase 5 – Theorie T16A straffen

Auslöser: «viel zu viele Informationen und weniger Grafiken», «Grafiken viel zu schnell», «Grafik bei der Strommesszange falsch». T16A hat Vorhersage-Frage, Animation (Drehspul/Dreheisen), Drehmoment-Balance, Dämpfung, Frequenzgrenzen, Vergleichstabelle und Merksatz – das verletzt die eigene Regel «höchstens ein Spotlight-Mittel pro Lektion».

1. **Text auf etwa 60 % kürzen** (Ziel: auf dem Handy in rund 4 Minuten lesbar). Kernaussagen bleiben: Drehspul → Mittelwert/Gleichrichtwert (Skala × 1,11 für Sinus), Dreheisen → Effektivwert, Strommesszange (ohne Auftrennen, nur ein Leiter).
2. **Ausklappbare Zusatzblöcke** (`<details>` mit klarer Überschrift «Zusatz: …»): «Frequenzgrenzen» und «Vergleichstabelle Eigenverbrauch/Frequenzbereich». Standardmässig zu; Merksatz und die 5–6 Fragen bleiben unverändert in der Zählung.
3. **Animation (`meterwork`) bedienbar machen:** Tempo-Regler (z. B. 0,25× / 0,5× / 1×, **Standard langsam**, `settings` merkt die Wahl), **Pause/Weiter**, Schritt-Knopf («▶ ein Schritt»). Die Animation startet nicht automatisch endlos; Anfang mit Beschriftung. Respektiert `prefers-reduced-motion`. Betrifft alle `visual`-Bausteine mit Zeitverlauf, mindestens `meterwork`; die gleiche Steuerung prüft sich auch für `numberSteps` (hat ◀ ▶).
4. **Bildmenge reduzieren:** pro Lektion nicht mehr als zwei Bilder/Widgets sichtbar; weitere hinter einem Knopf «Bild einblenden».
5. **Strommesszangen-Grafik** nach Phase-0-Befund korrigieren (`IMG_ZANGE`), danach prüfen, dass Beschriftung, Leiter, Magnetfeld und Textabsatz übereinstimmen.
6. Validator: `merksatz` bleibt Pflicht; Warnung, wenn `lesson` über der Zielgrösse liegt (nur Hinweis, z. B. > 1800 Zeichen ohne `<details>`). Smoke-Test: T16A öffnet, Zusatzblöcke klappen auf, Tempo-Regler ändert die Geschwindigkeit messbar, Pause hält an.

T16B bleibt unverändert, T16C bekommt nur die Wertungsänderungen aus Phase 3/4.

---

## Phase 6 – Vorführ-Modus für Messaufgaben

Wunsch (Nicolas): «Animation, wo erklärt wird, wie man genau misst und dann rechnet.»

- Knopf **«Vorführen»** in Messaufgaben auf der Werkbank. Die Vorführung zeigt **einen** Beispiel-Messwert (der erste Messwert der Aufgabe oder ein per `demo`-Feld gewählter): Multimeter/Oszilloskop stellt Modus und Bereich ein, die Spitzen gleiten automatisch zu den Buchsen (vorhandene `dragProbeTo/dropProbe`-Logik, kein Parallelsystem), die Anzeige erscheint, danach der **Rechenweg Schritt für Schritt** (Wiederverwendung des `worked`-Bausteins / Zahlen-Schritt-Widgets). Text neben der Animation erklärt jeden Schritt in einem Satz.
- Bedienung wie in T16A: **Tempo-Regler, Pause, Einzelschritt, Abbrechen**; nach dem Ende bleibt der Aufbau, den man selbst nachbauen kann, unverändert (die Vorführung verändert **nie** den Entwurf der lernenden Person).
- Datenquelle: `measure[]` (a, b, mode, Sollwert) plus `rechenweg` aus Phase 3. Keine separate Handarbeit pro Aufgabe; das Format ist generisch. Zuerst Kapitel 16 und das Tutorial, anschliessend alle Aufgaben, die `measure` mit `truth`/`value` haben.
- Sterne: Vorführen zählt wie ein **Tipp** (Hinweis). Nicht in Prüfung und Live-Challenge.
- Ereignis `demo_view` in die Ereignisliste.
- Tests: Vorführung läuft vollständig durch (Playwright), Entwurf bleibt nach Abbruch unverändert, Pausieren hält Spitzenbewegung an, Tempo-Regler wirkt.

---

## Phase 7 – QA, Doku, Übergabe

- Alle Tests aus CLAUDE.md grün, besonders `tests/tasks.js` (alle Aufgaben, Schaltplan **und** Werkbank, jetzt mit Ziehen), `tests/smoke.js` (neue Abschnitte: Logo, Passwort-Auge, Zurück-Navigation, Rundungshinweis, Lösungsansicht nach 2 Fehlversuchen, Teilwertung, T16A-Bedienung, Vorführen, grosses Oszilloskop), `test_api.js`/`test_exam_api.js` (Sync und Prüfung unverändert), Handy-Ansicht, Offline-Datei `index.html`, beide Themes.
- `docs/STAND.md` Abschnitt «Feedback 01.10.2026» (Befunde Phase 0, Entscheidungen, Sternregel, Flags `rangeUX`/`setup`/`rechenweg`/`demo`), `CLAUDE.md` (Umlautregel, neue Felder, Lösungsansicht), Handbuch-Seiten (Lösungen, Sterne, Vorführen, Messen), `docs/ENTSCHEIDUNGEN.md` (Teilwertung, Ziehen als Standard).
- Übergabe an Steven (Kurzbericht): was erledigt ist, was bewusst nicht (Festo-LX-Übersicht), Liste «Umlaut-Wörter zu prüfen», Befunde der vier Reproduktionen, Frage nach den Betreiberangaben für Impressum/Datenschutz.
- **Nicht tun:** keine neuen Konten/Zugangsdaten anlegen, keine Daten aus der Live-Datenbank löschen, Meldungen im Portal **nicht** selbst als «erledigt» markieren (macht Steven nach dem Deploy).

---

## Anhang – Die 27 Meldungen und ihre Zuordnung

| # | Zeit | Von | Kontext | Meldung (gekürzt) | Phase |
|---|---|---|---|---|---|
| 1 | 08:03 | Lukas | Portal #/login | Passwort während Schreiben nicht anzeigbar | 1.2 |
| 2 | 08:05 | Davi | Aufgabe W2 | Logo-Klick soll zur Startseite führen | 1.1 |
| 3 | 08:14 | Lukas | T1A | Lob: Wechsel Werkbank/Schaltplan | – |
| 4 | 08:26 | Nicolas | T16A | Kurse unübersichtlich, wie Festo LX | verworfen |
| 5 | 08:26 | Davi | T16A | Wörter mit Umlauten schreiben | 2 |
| 6 | 08:29 | Nicolas | T16A | Keine ä/ö/ü im Kurs (Beispielsätze aus dem Test) | 2 |
| 7 | 08:36 | Nicolas | 16.1 Schaltplan | Multimeter schwer zu bedienen | 4.2/4.3 |
| 8 | 08:37 | Davi | T16A | Grafiken viel zu schnell | 5.3 |
| 9 | 08:43 | Davi | T16A | Zu viele Informationen, weniger Grafiken | 5.1/5.4 |
| 10 | 08:48 | Davi | T16A | Grafik der Strommesszange falsch | 0.3/5.5 |
| 11 | 08:50 | Nicolas | 16.2 Schaltplan | Bei Schaltern kommt nur Strom, wenn sie unbetätigt sind | 0.2/4.4 |
| 12 | 09:04 | Davi | 16.1 Werkbank | Lösungen fehlen bei manchen Messaufgaben | 3.1 |
| 13 | 09:07 | Lukas | 16.2 Werkbank | Fehlermeldung beim Messen, wie richtig anschliessen? | 4.2 |
| 14 | 09:38 | Davi | 16.2 Werkbank | Zu viele Funktionen, unklar welche Einstellungen | 4.3/4.4 |
| 15 | 09:39 | Davi | 16.2 Werkbank | Lob: Interface der Werkstatt verständlich | – |
| 16 | 09:42 | Nicolas | 16.5 Schaltplan | Weitermachen, auch wenn ein Zahlenwert nicht stimmt | 3.2 |
| 17 | 10:21 | Lukas | Werkbank-Tutorial | Zweite, grössere Oszilloskop-Anzeige | 1.6 |
| 18 | 10:39 | Lukas | 1.5 Werkbank | Messspitzen nicht bewegbar, Werte nur erraten | 0/4.1 |
| 19 | 10:40 | Lukas | T1B | Messen Absicht, weil ablesbar (50/50) | 0 (Befund) |
| 20 | 10:45 | Davi | 16.4 Werkbank | Nicht angegeben, ob gerundet werden soll | 1.4 |
| 21 | 10:48 | Davi | 16.5 Werkbank | Lösungen mit Rechenweg wären hilfreich | 3.1 |
| 22 | 10:50 | Davi | Portal / | Impressum & Datenschutz nicht verfügbar | 1.5 |
| 23 | 10:52 | Davi | Laborkarte | Man kann nicht zurück klicken | 1.3 |
| 24 | 10:53 | Davi | Laborkarte | Lob: Taschenrechner | – |
| 25 | 11:03 | Nicolas | Laborkarte | Animation: wie genau messen und dann rechnen | 6 |
| 26 | 11:27 | Davi | T16C | Oszilloskop muss zurückgesetzt werden, obwohl richtig | 0.1/4.4 |
| 27 | 12:52 | Nicolas | 16.6 Werkbank | Werkbank auch rauf und runter bewegbar | 0.4/4.4 |

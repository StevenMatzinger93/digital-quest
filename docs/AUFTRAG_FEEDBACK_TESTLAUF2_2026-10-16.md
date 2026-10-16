# Auftrag für Claude Code: Feedback aus Testlauf 2 (07.–09.10.2026)

Repo: `StevenMatzinger93/digital-quest`, Stand `main` = `9c43921` (06.10.2026, nach Glättung K5). Diese Datei liegt als `docs/AUFTRAG_FEEDBACK_TESTLAUF2_2026-10-16.md` im Repo.
Grundlage: 30 Meldungen aus dem Feedback-Knopf (Digitaltechnik 2026 Gruppe 2: Davi, Nicolas, Laurin, Benjamin; 07.10. 15:00 bis 09.10. 14:59; Chrome/Edge unter Windows), davon 2 vom Typ «Fehler» und 28 vom Typ «Feedback». Die Meldungen stehen im Anhang mit ihrer Zuordnung.

**Prompt zum Einfügen in Claude Code:**

> Lies `CLAUDE.md`, `docs/STAND.md` und `docs/AUFTRAG_FEEDBACK_TESTLAUF2_2026-10-16.md`. Beginne mit Phase 0 (alle Reproduktionen, kein Code) und berichte mir die Befunde als Tabelle. Danach setzt du die Phasen 1 bis 5 in dieser Reihenfolge um, Phase 6 erst nach meinem OK zum Vorschlag. Arbeite auf dem Branch `wip/feedback-testlauf2`, nach jeder Phase alle Tests aus `CLAUDE.md` grün und `docs/STAND.md` nachführen, erst mit grünem Validator nach `main`.

---

## 1. Einordnung (Projektleitung, 16.10.2026)

Der zweite Testlauf zeigt ein anderes Bild als der erste: Die Lernenden sind weiter gekommen (Kapitel 1–16, Werkstatt, Freie Werkbank, Portal) und melden jetzt vor allem **Wertungsfehler**. Diese sind am dringendsten, weil sie Vertrauen kosten («richtig gelöst, aber als falsch gewertet») oder sich ausnutzen lassen (Sterne und Coins ohne Leistung).

| Priorität | Thema | Meldungen | Phase |
|---|---|---|---|
| **A – Wertung falsch oder ausnutzbar** | Richtige Lösung wird nicht angenommen, gelöschte Bauteile stören die Prüfung, Sterne nach Lösungsansicht erschleichbar, Sterne immer 1 von 3, Antwort B ist fast immer richtig | 1.6 (2×+1), 2.1, 2.5, 3.5, 16.8, Laborkarte Sterne, T8B | 0, 1 |
| **B – Bedienung stört** | Pop-ups verdecken den Mausweg, Rechner nicht verschiebbar, Oszilloskop wird nicht zurückgesetzt, Bauteile stapeln sich unsichtbar, Handbuch zeigt «undefined», Prüfungscode erst spät als falsch erkannt | 7.3, 3.4, W1, Freie Werkbank, Handbuch, Zertifikate | 2 |
| **C – Texte und Darstellung** | Aufgabentexte verwirrend oder überladen, Begriffe Deutsch/Englisch gemischt, Linien in T3C überlagert, Wegweiser-Untertitel unklar, Menüleisten und Rahmen uneinheitlich | 4.7, 16.7, 7.7, T3C, Wegweiser, Portal, Laborkarte | 3, 4 |
| **D – Wünsche Freie Werkbank** | Drag & Drop wie TINA, Rückgängig, Speichern, grössere Arbeitsfläche, Leitungsführung | Freie Werkbank (4×), 12.1 | 5 |
| **E – Später** | Geführte Übungsaufbauten «wie im Video» | Freie Werkbank | 6 (nur Vorschlag) |
| **Steven** | Impressum und Datenschutz ausfüllen | Portal, Freie Werkbank | – |

Zwei Meldungen sind Lob (16.7: Detailansicht beim Darüberfahren; früher schon Taschenrechner, Werkstatt). Diese Funktionen **nicht verändern**.

---

## 2. Vorbefunde der Projektleitung (am Code geprüft auf `9c43921`)

Diese Befunde sind bestätigt oder als starke Vermutung markiert. Phase 0 prüft sie nach.

1. **T8B – «die richtige Antwort ist immer die 2.»: bestätigt und systemisch.** In T8B ist bei allen 5 Fragen `correct: 1`. Über alle Theorien (`dev/src/content/*.js`) verteilen sich die 172 Fragen so: A 15 (9 %), **B 102 (59 %)**, C 46 (27 %), D 9 (5 %). Die Theorie-Kontrolle in `app.js` (ca. Zeile 1366) zeigt die Optionen in der Reihenfolge der Quelle. Nur die Prüfung mischt (`exam_core.js`, `perm`). Lernende können die Theorie-Kontrollen also ohne Wissen bestehen.
2. **1.6 – richtige Lösung lässt sich nicht abgeben (Benjamin «Fehler», Davi zweimal): starke Vermutung.** Der Text (`hint2`, Einstellungs-Box) sagt: «Leitung lösen und das Multimeter in die Lücke setzen – oder einen Strommesser in Reihe einbauen». `E.runTask` prüft aber nur den Entwurf `ed.layout`. Steckt das Multimeter in der Lücke, ist der Kreis im Entwurf offen, der Test «Betrieb» (`i` 20,5…22 mA an R1) misst 0 mA und schlägt fehl. Wer den Strommesser A1 einbaut, besteht. Das passt genau zu Davis Satz «die Lösung ist nicht richtig, weil nicht der Strommesser benutzt wurde». Gleiches Muster betrifft vermutlich **jede Aufgabe mit `tests` und Strommessung über das Multimeter** (1.7, 2.1, 2.2, …).
3. **2.1 – Fehlermeldungen zu gelöschten Bauteilen (Laurin «Fehler»): Vermutung.** Gelöschte Widerstände tauchen weiter in der Prüfung auf. Kandidaten: Leitungen oder `p.bench`-Einträge, die beim Löschen nicht mitentfernt werden; Messprotokoll-Zustand bezieht sich auf alte IDs; ID-Vergabe nach dem Löschen (R5 statt R4).
4. **Freie Werkbank – «63 Schalter, ich sehe nur 2» und «Schaltung läuft ohne Fehler, obwohl nichts angeschlossen»: Vermutung.** Klick auf die Palette legt jedes neue Bauteil an dieselbe Stelle; die Bauteile liegen deckungsgleich übereinander. Das erklärt auch 2.1 («zu viele Bauteile auf die Werkbank gelegt»). Die Statuszeile meldet «läuft ohne Fehler», weil ein Netz ohne Quelle keine Störung hat.
5. **16.8 – Lösungen aufdecken, neuer Durchgang, volle Punkte: Vermutung mit Codestelle.** `app.js` (ca. Zeile 1302–1304) setzt die Sterne bei erneutem Lösen neu (`st > di.stars` überschreibt). Wird der Zähler (`current.tries/hints`, `revealed`) beim Neustart zurückgesetzt, gibt es 3 Sterne trotz Lösungsansicht. Sterne sind Punkte (`stars * 10`) und Coins, das ist also ein Ausnutzungsweg.
6. **Laborkarte – «Bei den Sternen werden immer noch nur 1 von 3 angezeigt»: Vermutung.** `normalize()` (`app.js` Zeile 36) setzt `stars: 1`, wenn zu einer erledigten Station kein `doneInfo` bzw. kein `task_done`-Ereignis vorliegt. Wahrscheinlich gehen `doneInfo` oder die Ereignisse beim Sync mit dem Portal (`PUT /api/progress/dq`, Zusammenführen bei 409) oder beim Laden verloren. «Immer noch» heisst: wurde schon früher gemeldet.
7. **2.5 – Ergebnis richtig, aber als falsch gewertet: offen.** Test verlangt U an `R2` 4,9…5,1 V, das Messprotokoll akzeptiert ±3 %. Mögliche Ursachen: Lernende setzen den Widerstand mit dem Namen R2 oben ein (Teiler richtig, Namen vertauscht), Toleranz Test ±2 % gegen Protokoll ±3 %, oder Werte ausserhalb von 100 kΩ.
8. **3.5 – «Lösung der Periodendauer falsch übernommen»: offen.** Quelle stimmt (`tper`, `value: 10`, Rechenweg 20 ms / 2 = 10 ms). Zu prüfen: Was zeigt die Lösungsansicht bzw. das Aufdecken tatsächlich an (Einheit, Wert, Zeile vertauscht), und welche Periode meldet das Oszilloskop unter der Kurve (10 ms oder 20 ms)?
9. **Impressum und Datenschutz: bekannt.** Beide Seiten sind seit Auftrag 6 Vorlagen mit gelben Platzhaltern (`dev/portal/impressum.html`, `datenschutz.html`). Das ist keine Aufgabe für Claude Code, sondern für Steven (Abschnitt 5).

---

## 3. Phasen

### Phase 0 – Reproduzieren und Befund (kein Code)

Jede Meldung aus Priorität A und B mit Playwright nachstellen, Screenshots unter `dev/tests/shots/testlauf2/`, Ergebnis in `docs/STAND.md`, Abschnitt «Feedback Testlauf 2 (16.10.2026)», als Tabelle: Meldung · Bug / Missverständnis / Wunsch · Ursache (Datei, Funktion) · Massnahme.

Pflicht-Reproduktionen:
1. **1.6** auf der Werkbank und im Schaltplan: (a) Strommesser A1 in Reihe, (b) Multimeter A⎓ in die Lücke einer gelösten Leitung, (c) Wert mit «21,3», «21», «0,0213» eintragen. Welche Variante scheitert woran (Test, Messwert, Einheit)? Danach dasselbe für alle Aufgaben, deren `hint`, `hint2` oder Einstellungs-Box «Leitung lösen … in die Lücke» empfiehlt: **Liste der betroffenen Aufgaben**.
2. **2.1**: vier Widerstände bauen, zwei zusätzliche hinzufügen und löschen, verdrahten, prüfen. Welche Meldung erscheint, welche Daten bleiben nach dem Löschen übrig (Leitungen, `bench`, Protokoll)? Gleiches für Löschen per Taste, per Knopf und auf beiden Ansichten.
3. **2.5**: richtige Teiler mit (a) R1 oben/R2 unten, (b) Namen vertauscht, (c) 20 kΩ / 10 kΩ, (d) E12-Werte, die ein Ergebnis zwischen ±2 % und ±3 % liefern.
4. **3.5**: Lösungsansicht und Aufdecken für `tper`, Anzeige der Periode am Oszilloskop mit Clip an `R1.b` und ohne Clip.
5. **16.8**: Lösungen aufdecken bzw. ansehen → «neuer Durchgang» (welcher Knopf genau?) → Werte eintragen → Sterne, Punkte und Coins vergleichen. Gleiches für eine Aufgabe ohne Messprotokoll.
6. **Sterne 1 von 3**: Station mit 3 Sternen lösen, dann (a) neu laden, (b) abmelden/anmelden, (c) auf zweitem Browser laden, (d) Sync mit Konflikt (409). Wo geht `doneInfo.stars` verloren? Auch Karte, Kapitelansicht und Leitstand vergleichen.
7. **Freie Werkbank**: 5× auf «Schalter» klicken → wo landen die Bauteile? Statuszeile ohne Leitungen. Zähler «63 Schalter» nachstellen.
8. **W1**: zuerst eine Aufgabe mit Oszilloskop, dann W1 öffnen. Was bleibt vom Gerätezustand (Kanäle, Tastkopf, MATH, AC/DC-Kopplung, Bildbreite) hängen? Laut Auftrag 6 (Phase 4.4) sollte der Wechsel zurücksetzen; prüfen, ob die neuen Funktionen aus Paket O, G3 und K3 (CH2, MATH, AC-Kopplung) im Reset fehlen.
9. **Handbuch → Werkstatt**: Welcher Link führt auf die Seite «undefined»? (Vermutung: Verweis auf eine Handbuch-ID, die es nicht gibt, oder ein Abschnitt aus `wegweiser_data.js`.)
10. **3.4 Taschenrechner**: lässt sich das Fenster ziehen? Auf Desktop und Handy.
11. **7.3 Pop-ups**: Welches Pop-up erscheint beim Darüberfahren über die Palette, wo, und blockiert es Zeiger-Ereignisse?

### Phase 1 – Wertung korrigieren (Priorität A)

Jede Korrektur mit Test in `tests/smoke.js` bzw. `tests/tasks.js`.

1. **Multimeter in Reihe zählt als geschlossener Kreis.** Steckt das Multimeter im Modus A⎓ oder A~ mit beiden Spitzen in einer Lücke, bewertet `E.runTask` den Entwurf **mit** dem Messgerät als Strompfad (Innenwiderstand `METER.rA`, wie der Strommesser A1). Umsetzung bevorzugt so, dass die Spitzen als virtuelles `ammeter` in eine Kopie des Layouts eingesetzt werden, bevor die Tests laufen; der Entwurf selbst bleibt unverändert. Gilt in Schaltplan und Werkbank. Ohne Messgerät in der Lücke bleibt ein offener Kreis ein Fehler, aber mit klarer Meldung: «Der Stromkreis ist offen – setze das Multimeter (A⎓) in die Lücke oder schliesse die Leitung wieder.»
2. **Kein Bauteil ist Pflicht, wenn das Messgerät dieselbe Messung macht.** In 1.6, 1.7 und allen Aufgaben aus der Liste der Phase 0.1 verlangen weder `need` noch `tests` den Strommesser A1. Texte bleiben bei «Multimeter in die Lücke **oder** Strommesser».
3. **Gelöschte Bauteile restlos entfernen** (nach Befund 0.2): Beim Löschen eines Bauteils verschwinden seine Leitungen, sein `bench`-Eintrag und Bezüge in Protokoll und Spitzen. Prüfung meldet nie ein Bauteil, das nicht mehr auf der Arbeitsfläche ist. Validator bzw. Laufzeitprüfung: Leitungen auf nicht vorhandene Pins werden beim Laden eines Entwurfs bereinigt (auch für bestehende Spielstände).
4. **Teiler unabhängig von den Namen** (2.5, nach Befund 0.3): Test nach Funktion statt nach Bauteilnamen («der Widerstand am Minuspol hat 5 V ±2 %»), oder Text verlangt ausdrücklich, welcher Name wohin gehört, und die Meldung sagt es konkret («R2 muss unten am Minuspol liegen – bei dir liegt R2 oben»). Toleranz von Test und Messprotokoll angleichen und im Aufgabentext nennen. Gleiches Muster in den übrigen Teiler-Aufgaben prüfen (2.x, T2B-Beispiele).
5. **3.5 Periodendauer** nach Befund 0.4 korrigieren.
6. **Lösung angesehen bleibt angesehen.** `revealed` und `solution` hängen an der Station, nicht am Durchgang. Ein Neustart setzt sie **nicht** zurück; wer die Lösung gesehen oder einen Wert aufgedeckt hat, bekommt für diese Station höchstens 1 Stern, auch bei späteren Durchgängen (Regel aus Auftrag 6, 3.1). Ausnahme nur, wenn eine Dozentin die Station im Leitstand zurücksetzt. Coins und Punkte folgen den Sternen. Ereignis `solution_view` bleibt; der Leitstand zeigt «Lösung angesehen» weiter an.
7. **Sterne korrekt speichern und anzeigen** (nach Befund 0.6): `doneInfo` wird beim Sync vollständig übertragen und beim Zusammenführen pro Station mit dem **höheren** Stern-Wert behalten (unter Beachtung von Punkt 6). `normalize()` darf vorhandene Sterne nie auf 1 senken. Bestehende Spielstände der Testklasse: Sterne aus der Ereignisliste neu berechnen, wo möglich (einmalige Migration, mit Test). Keine Daten in der Live-Datenbank von Hand ändern.
8. **Antworten der Theorie-Kontrollen mischen.** Die Optionen werden bei jedem Öffnen der Kontrolle gemischt (gleiche Funktion wie `exam_core.js` `shuffle`, Zuordnung `correct` über eine Permutation, nicht über den Index der Anzeige). Optionen wie «Alle», «Keine», «Beide» bzw. Zahlenreihen in aufsteigender Reihenfolge dürfen über ein optionales Feld `fixed: true` an ihrer Stelle bleiben. Erklärungen, `verify` und die Auswertung in Prozent bleiben richtig. Zusätzlich **Validator-Warnung**, wenn innerhalb einer Theorie mehr als 3 von 5 Fragen dieselbe `correct`-Position haben (Quelldaten gleichmässiger verteilen, damit auch die Offline-Einzeldatei ohne Mischen fair ist). Prüfungspool unverändert (mischt bereits).

### Phase 2 – Bedienung (Priorität B)

1. **Pop-ups an der Palette (7.3):** Beschreibungen beim Darüberfahren erscheinen erst nach rund 400 ms Verweilen, **neben** der Palette (nicht über den Nachbar-Einträgen), sind für Zeiger-Ereignisse durchlässig (`pointer-events: none`) und verschwinden sofort beim Verlassen. Gilt für Schaltplan und Werkbank. Die Detailansicht der Bauteile auf der Arbeitsfläche (Lob aus 16.7) bleibt unverändert.
2. **Taschenrechner verschiebbar (3.4):** Fenster an der Titelleiste ziehbar (Maus und Touch), bleibt im sichtbaren Bereich, Position wird je Gerät in `settings` gemerkt, Doppelklick auf die Titelleiste setzt zurück.
3. **Oszilloskop zurücksetzen beim Aufgabenwechsel (W1):** Wechsel zu einer anderen Aufgabe setzt alle Kanäle, Tastköpfe, Erdungsclip, MATH, AC/DC-Kopplung, Bildbreite und RUN/STOP auf den Standard der neuen Aufgabe. Test: Aufgabe A mit geändertem Gerät → Aufgabe B → Gerät im Standard.
4. **Neue Bauteile nicht stapeln (Freie Werkbank, 2.1):** Klick auf die Palette legt das Bauteil an die nächste freie Stelle im sichtbaren Bereich (versetzt, ohne Überlappung) und markiert es kurz. Liegen trotzdem Bauteile übereinander, zeigt ein kleines Zahlzeichen am Bauteil die Anzahl. Die Bauteilzählung in der Kopfzeile stimmt mit der Arbeitsfläche überein.
5. **Statuszeile der Freien Werkbank:** «läuft ohne Fehler» nur, wenn mindestens eine Quelle in einem geschlossenen Kreis liegt. Sonst Klartext: «Keine Quelle angeschlossen» / «X Bauteile ohne Verbindung».
6. **Handbuch «undefined»** nach Befund 0.9 beheben. Validator-Regel: Jeder interne Handbuch-Verweis zeigt auf eine vorhandene Seite.
7. **Prüfungscode sofort prüfen (Zertifikate):** Beim Eingeben bzw. Beitreten prüft das Portal den Code gegen den Server (vorhandene Prüfung, offen, für diese Klasse) und zeigt «Code gültig – Prüfung XY, Start um …» oder «Code unbekannt / abgelaufen» an, bevor die Prüfung startet. Neuer, schlanker Endpunkt nur mit diesen Angaben, keine Aufgaben oder Lösungen; Rate-Limit wie beim Login. Test in `test_exam_api.js`.

### Phase 3 – Aufgabentexte und Begriffe (Priorität C)

1. **4.7 umschreiben:** Ziel in einem Satz, dann nummerierte Schritte («1. A1 ablesen: … 2. Multimeter V⎓ an R1 anlegen. 3. A1 erneut ablesen, während das Multimeter misst. 4. Beide Werte eintragen.»), Hintergrund (spannungsrichtige Schaltung) danach und kurz. Messprotokoll-Zeilen so benennen, dass sie den Schritten entsprechen («A1 ohne Voltmeter», «A1 mit Voltmeter»).
2. **16.7 und Messaufgaben in Kapitel 16 entschlacken:** `brief` höchstens drei Sätze, Einstellungs-Box standardmässig **eingeklappt** mit einer Zeile «So stellst du das Gerät ein (6 Werte)», je Messwert aufklappbar. Hintergrund in `learn`/`take`, nicht im `brief`. Gleiche Regel für 16.1–16.9 prüfen. Validator-Hinweis, wenn ein `brief` über ca. 400 Zeichen liegt.
3. **Begriffe einheitlich (7.7):** Regel: deutscher Begriff zuerst, englische Abkürzung beim ersten Vorkommen in Klammern, danach durchgehend dieselbe Schreibweise. Beispiel 7.7: «Im Lager gibt es nur NAND-Gatter (NICHT-UND). Gebraucht wird ein UND-Gatter.» Kapitel 6–12 sowie Werkstatt nach gemischten Paaren durchsuchen (UND/AND, ODER/OR, NICHT/NOT, NAND, NOR, XOR/Antivalenz, Flipflop), Liste der Änderungen in STAND. Glossar-Seite im Handbuch («Begriffe Deutsch/Englisch»). Regel in `CLAUDE.md` aufnehmen.
4. **T3C Brückengleichrichter:** Mini-Schaltung neu anordnen, sodass sich keine Leitungen kreuzen oder überlagern (klassische Raute mit Generator links, Last rechts). Strompfade der beiden Halbwellen farbig unterscheidbar. Screenshot vorher/nachher, beide Themes, Handy 390 px.
5. **Wegweiser-Untertitel:** Der Satz «Wo finde ich was? Jeder Menüpunkt in einem Satz – für Lernende.» liest sich wie eine Notiz für Autoren. Neu: «Hier findest du alle Bereiche von DigitalQuest und wofür du sie brauchst.» (`dev/portal/portal_wegweiser.js`, gleiche Stelle im Labor-Handbuch).

### Phase 4 – Einheitliches Erscheinungsbild (Priorität C)

1. **Menüleisten:** Kopfzeilen von Portal, Labor, Werkstatt, Freier Werkbank, Live-Challenge und Prüfung angleichen: gleiche Höhe, Schrift, Abstände, Knopfstil, Logo-Position, Benutzer-Chip. Unterschiede dürfen nur dort bleiben, wo sie Funktion tragen (z. B. Prüfungsmodus ohne Navigation), und sind dann bewusst gekennzeichnet. Ein gemeinsamer CSS-Baustein statt Kopien.
2. **Rahmen in der Auswahlleiste der Laborkarte:** Die weissen Umrandungen von Wegweiser- und Taschenrechner-Knopf an die übrigen Knöpfe angleichen (gleiche Rahmenfarbe aus den Theme-Variablen, beide Themes).
3. Bildvergleich mit Referenzbildern (wie `tests/avatar_snap.js`) für die Kopfzeilen aller Bereiche, beide Themes, Desktop und 390 px.

### Phase 5 – Freie Werkbank (Priorität D)

1. **Drag & Drop aus der Palette** (Wunsch «wie TINA»): Bauteil aus der Palette auf die Arbeitsfläche ziehen und dort ablegen; Klick bleibt als zweiter Weg erhalten (Tastatur, Handy). Gilt auch in Aufgaben, Schaltplan und Werkbank. Touch: langes Drücken startet das Ziehen.
2. **Rückgängig / Wiederholen:** Strg+Z / Strg+Y und zwei Knöpfe, mindestens 50 Schritte (Bauteil setzen, verschieben, drehen, löschen, Leitung ziehen/löschen, Wert ändern). In der Freien Werkbank und in Aufgaben; nicht in Prüfung und Live-Challenge über den Abgabezeitpunkt hinaus.
3. **Speichern:** In der Freien Werkbank mehrere benannte Aufbauten speichern, laden, löschen (lokal; mit Konto zusätzlich im Spielstand, sofern die Grösse es zulässt). Export/Import als Datei (JSON). «Steuerung speichern» aus Nicolas’ Meldung so verstehen: den ganzen Aufbau samt Schalterstellungen und Messgeräte-Einstellungen.
4. **Grössere Arbeitsfläche** («Die Mappe … ist etwas klein»): Arbeitsfläche der Freien Werkbank füllt die verfügbare Fensterfläche, verschiebbar (Ziehen auf leerer Fläche) und zoombar (Mausrad, Pinch, Knöpfe ±, «alles zeigen»). Mindestens doppelte Fläche gegenüber heute.
5. **Leitungen übersichtlicher (12.1):** Zuerst die günstigen Hilfen: Leitung beim Darüberfahren samt allen Anschlüssen desselben Netzes hervorheben; Leitungsfarbe wählbar; Leitungen weichen Bauteilen aus bzw. laufen rechtwinklig. **Zwischenpunkte** (Leitung mit Knickpunkten selbst führen) nur als Vorschlag mit Aufwandschätzung an Steven.

### Phase 6 – Geführte Übungsaufbauten (nur Vorschlag, kein Code)

Wunsch (Davi): «In der Freien Werkbank ein paar detaillierte Übungsaufbauten, die wie in einem Video aufgebaut und erklärt werden, zum Nachbauen.» Vorschlag ausarbeiten, wie der vorhandene Vorführ-Modus (Auftrag 6, Phase 6) auf den **Aufbau** erweitert werden kann: Bauteile erscheinen nacheinander, Leitungen werden gezogen, je Schritt ein Satz, Tempo/Pause/Einzelschritt, danach «Selbst nachbauen» mit Vergleich. Drei bis fünf Beispielaufbauten (z. B. LED mit Vorwiderstand, Spannungsteiler, Brückengleichrichter mit Glättung, RS-Flipflop). Aufwand und Datenformat an Steven, **kein Code vor seinem OK**.

### Phase 7 – QA, Doku, Übergabe

- Alle Tests aus `CLAUDE.md` grün, insbesondere `tests/tasks.js` (alle Aufgaben, beide Ansichten, neu auch mit Multimeter in der Lücke), `tests/smoke.js` (neue Abschnitte: Messgerät in Reihe, Löschen, Sterne/Sync, Lösung angesehen nach Neustart, Mischen der Theoriefragen, Pop-ups, Rechner ziehen, Oszilloskop-Reset, Palette ohne Stapeln, Handbuch-Verweise, Drag & Drop, Rückgängig, Speichern), `tests/portal.js` (Prüfungscode prüfen, Wegweiser-Text, Kopfzeilen), `test_api.js`, `test_exam_api.js`, Handy 390 px, Offline-Einzeldatei, beide Themes.
- `docs/STAND.md` (Befunde Phase 0, Liste der Aufgaben mit Strommessung, Begriffsänderungen), `CLAUDE.md` (Begriffsregel, `fixed` bei Fragen, Regel «Lösung angesehen bleibt»), Handbuch (Rückgängig, Speichern, Drag & Drop, Glossar), `docs/ENTSCHEIDUNGEN.md`.
- Kurzbericht an Steven: erledigt / bewusst nicht / offene Fragen.

---

## 4. Verbindliche Entscheidungen der Projektleitung

| Thema | Entscheidung |
|---|---|
| Strommessung | Multimeter in der Lücke ist der Regelfall und muss gewertet werden. Der Strommesser A1 ist nie Pflicht, wenn der Auftrag nicht ausdrücklich ihn verlangt. |
| Lösung angesehen | Gilt pro Station dauerhaft (höchstens 1 Stern), auch nach Neustart. Zurücksetzen nur durch Dozierende. |
| Theoriefragen | Werden gemischt; Quelldaten zusätzlich gleichmässig verteilen. |
| Toleranz | Bleibt bei ±3 % (bzw. aufgabenspezifisch), aber Test und Messprotokoll derselben Aufgabe nutzen dieselbe Toleranz, und sie steht im Text. Keine pauschale Erhöhung. |
| Begriffe | Deutsch zuerst, englische Abkürzung beim ersten Vorkommen in Klammern. |
| Freie Werkbank | Drag & Drop, Rückgängig, Speichern, grössere Fläche werden gebaut. Zwischenpunkte für Leitungen und geführte Übungsaufbauten nur als Vorschlag. |
| Lob (Detailansicht beim Darüberfahren, Taschenrechner) | Nicht verändern. |

## 5. Offen bei Steven (nicht Claude Code)

1. **Impressum und Datenschutz ausfüllen** (Name, Adresse, E-Mail, ggf. Firma/UID, Rechtsgrundlage, Kontakt für Auskunft, Datum). Zwei Lernende haben die Platzhalter gesehen; mit echten Schülerdaten im System sollte das **vor dem nächsten Testlauf** erledigt sein. Danach ersetzt Claude Code nur die Platzhalter, ohne Inhalte zu erfinden.
2. Für die Reproduktion von 1.6, 2.1 und 2.5 hilft es, wenn du im Leitstand die Entwürfe von Benjamin, Laurin und Nicolas ansiehst (Mini-Schaltung) und Screenshots in den Branch legst. Claude Code greift nicht auf die Live-Datenbank zu.
3. Meldungen im Portal nach dem Deploy selbst als «erledigt» markieren.

## 6. Nicht tun

- Keine Wertungsregel lockern, um Meldungen «wegzumachen» (keine pauschal grössere Toleranz, keine Tests entfernen).
- Keine Daten in der Live-Datenbank ändern oder löschen, keine neuen Konten.
- Detailansicht beim Darüberfahren und Taschenrechner-Funktionen nicht umbauen.
- `index.html`, `web/`, `worker/gen/` nicht von Hand ändern.

## 7. Fertig heisst

Alle Meldungen der Prioritäten A und B sind reproduziert und behoben oder begründet als Missverständnis eingeordnet; Strommessung mit dem Multimeter wird überall gewertet; gelöschte Bauteile stören nie; Sterne stimmen nach Neustart, Neuladen und Sync; Theoriefragen sind gemischt; Texte von 4.7, 7.7, 16.x und Wegweiser überarbeitet; Kopfzeilen einheitlich; Freie Werkbank mit Drag & Drop, Rückgängig, Speichern und grösserer Fläche; Vorschlag Phase 6 liegt bei Steven; alle Tests grün; Doku nachgeführt.

---

## Anhang – Die 30 Meldungen und ihre Zuordnung

| # | Zeit | Von | Typ | Kontext | Meldung (gekürzt) | Prio | Phase |
|---|---|---|---|---|---|---|---|
| 1 | 07.10. 15:00 | Nicolas | Feedback | Laborkarte | Sterne zeigen immer noch nur 1 von 3 | A | 0.6 / 1.7 |
| 2 | 07.10. 15:01 | Davi | Feedback | Handbuch | Werkstatt im Handbuch führt auf Seite «undefined» | B | 0.9 / 2.6 |
| 3 | 07.10. 15:22 | Davi | Feedback | Laborkarte | Weisse Rahmen bei Wegweiser und Taschenrechner passen nicht | C | 4.2 |
| 4 | 07.10. 15:25 | Davi | Feedback | Portal / | Menüleisten in den Modi uneinheitlich | C | 4.1 |
| 5 | 07.10. 15:29 | Davi | Feedback | Freie Werkbank | Datenschutz nicht vollständig | Steven | 5.1 |
| 6 | 07.10. 15:31 | Nicolas | Feedback | Freie Werkbank | Steuerung speichern und Rückgängig | D | 5.2 / 5.3 |
| 7 | 07.10. 15:42 | Nicolas | Feedback | Portal #/zertifikate | Falscher Prüfungscode erst beim Start erkennbar | B | 2.7 |
| 8 | 07.10. 16:07 | Nicolas | Feedback | Portal / | Datenschutz etc. ohne ausgefüllte Daten | Steven | 5.1 |
| 9 | 08.10. 07:57 | Nicolas | Feedback | 12.1 Schaltplan | Verbindungen unübersichtlich, nur von–bis bestimmbar | D | 5.5 |
| 10 | 08.10. 08:11 | Benjamin | **Fehler** | 1.6 Werkbank | Richtige Lösung lässt sich nicht abgeben | A | 0.1 / 1.1–1.2 |
| 11 | 08.10. 08:48 | Davi | Feedback | 16.7 Werkbank | Zu viele Informationen auf den Messaufgaben | C | 3.2 |
| 12 | 08.10. 09:31 | Davi | Feedback | 16.7 Werkbank | Lob: Detailansicht beim Darüberfahren | – | nicht ändern |
| 13 | 08.10. 09:40 | Davi | Feedback | Portal #/wegweiser | Was heisst «Jeder Menüpunkt in einem Satz – für Lernende»? | C | 3.5 |
| 14 | 08.10. 09:44 | Davi | Feedback | Freie Werkbank | Bauteile per Drag & Drop wie TINA | D | 5.1 |
| 15 | 08.10. 09:59 | Davi | Feedback | Freie Werkbank | 63 Schalter angezeigt, nur 2 sichtbar; «läuft ohne Fehler» ohne Anschluss | B | 0.7 / 2.4–2.5 |
| 16 | 08.10. 10:03 | Davi | Feedback | Freie Werkbank | Arbeitsfläche zu klein | D | 5.4 |
| 17 | 08.10. 10:06 | Nicolas | Feedback | 2.5 Schaltplan | Richtiges Resultat als falsch gewertet | A | 0.3 / 1.4 |
| 18 | 08.10. 10:17 | Davi | Feedback | 16.8 Werkbank | Nach Aufdecken neuer Durchgang → volle Punkte | A | 0.5 / 1.6 |
| 19 | 08.10. 10:23 | Laurin | **Fehler** | 2.1 Werkbank | Gelöschte Bauteile erzeugen Fehlermeldungen, Abgabe unmöglich | A | 0.2 / 1.3 |
| 20 | 08.10. 10:27 | Davi | Feedback | W1 Werkbank | Oszilloskop setzt sich bei neuer Messaufgabe nicht zurück | B | 0.8 / 2.3 |
| 21 | 08.10. 10:50 | Davi | Feedback | 3.4 Werkbank | Taschenrechner-Fenster nicht verschiebbar | B | 0.10 / 2.2 |
| 22 | 08.10. 10:57 | Davi | Feedback | Freie Werkbank | Geführte Übungsaufbauten «wie im Video» | E | 6 |
| 23 | 08.10. 13:11 | Davi | Feedback | 3.5 Werkbank | Lösung der Periodendauer an R1 falsch übernommen | A | 0.4 / 1.5 |
| 24 | 08.10. 15:19 | Nicolas | Feedback | 7.3 Schaltplan | Pop-ups blockieren den Mausweg zum nächsten Bauteil | B | 0.11 / 2.1 |
| 25 | 08.10. 15:36 | Nicolas | Feedback | 7.7 Schaltplan | Begriffe Deutsch/Englisch gemischt (NAND / UND) | C | 3.3 |
| 26 | 08.10. 15:41 | Davi | Feedback | T3C | Brückengleichrichter unverständlich, Linien überlagert | C | 3.4 |
| 27 | 09.10. 07:40 | Davi | Feedback | 1.6 Werkbank | Toleranz zu klein | A | 0.1 / 1.1 |
| 28 | 09.10. 07:43 | Davi | Feedback | 1.6 Werkbank | Strommesser Pflicht, obwohl TRMS-Multimeter dasselbe misst | A | 0.1 / 1.1–1.2 |
| 29 | 09.10. 14:53 | Davi | Feedback | 4.7 Werkbank | Aufgabenbeschreibung verwirrend | C | 3.1 |
| 30 | 09.10. 14:59 | Nicolas | Feedback | T8B | Richtige Antwort fast immer die 2. | A | 1.8 |

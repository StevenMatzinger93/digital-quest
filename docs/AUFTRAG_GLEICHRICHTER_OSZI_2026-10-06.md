# Auftrag für Claude Code: Brückengleichrichter am Oszilloskop – Bezugspunkt sichtbar machen (06.10.2026)

Repo: `StevenMatzinger93/digital-quest`, Stand `main` = `f514d6f` (05.10.2026). Diese Datei liegt als `docs/AUFTRAG_GLEICHRICHTER_OSZI_2026-10-06.md` im Repo.
Grundlage: Meldung von Steven vom 06.10.2026 nach dem Test des Brückengleichrichters.

**Prompt zum Einfügen in Claude Code:**

> Lies `CLAUDE.md`, `docs/STAND.md` und `docs/AUFTRAG_GLEICHRICHTER_OSZI_2026-10-06.md`. Beginne mit Paket G0 (Befund und Inventar) und berichte kurz. Setze danach G1 bis G5 in dieser Reihenfolge um. Bei G3 (Differenzmessung CH1 − CH2) und G4 (Theorie) zeigst du mir zuerst einen Vorschlag. Arbeite auf dem Branch `wip/gleichrichter-oszi`, nach jedem Paket alle Tests grün und `docs/STAND.md` nachführen, erst mit grünem Validator nach `main`.

---

## 1. Meldung

> «Ich habe den Brückengleichrichter getestet und stelle fest, dass dieser nicht richtig angezeigt wird. Bei einem Brückengleichrichter ist die negative Halbwelle auch positiv, dies wird aber nicht angezeigt.»

## 2. Wie ein Brückengleichrichter funktioniert (Soll-Bild)

Schaltung in 3.5 und 16.7: Generator G1 (Sinus, Û = 10 V, 50 Hz), vier Dioden V1 bis V4, Last R1 = 1 kΩ. Verdrahtung: V1 von `G1.p` nach `R1.a`, V2 von `G1.n` nach `R1.a`, V3 von `R1.b` nach `G1.p`, V4 von `R1.b` nach `G1.n` (jeweils Anode → Kathode).

- **Positive Halbwelle** (`G1.p` positiv): Strom fliesst G1.p → V1 → R1.a → R1 → R1.b → V4 → G1.n. V2 und V3 sperren.
- **Negative Halbwelle** (`G1.n` positiv): Strom fliesst G1.n → V2 → R1.a → R1 → R1.b → V3 → G1.p. V1 und V4 sperren.
- In beiden Halbwellen fliesst der Strom durch R1 **in dieselbe Richtung**, von `R1.a` nach `R1.b`. Die Spannung **an R1** (`R1.a` gegen `R1.b`) ist deshalb nie negativ.

So muss die Kurve an R1 aussehen:

| Merkmal | Wert bei Û = 10 V, 50 Hz | Begründung |
|---|---|---|
| Form | beide Halbwellen nach oben geklappt (Betrag des Sinus) | Zweiweg-Gleichrichtung |
| Scheitelwert | ≈ 8,6 V | Û − 2 · U_F, zwei Dioden liegen in Reihe im Strompfad |
| Minimum | 0 V, nie negativ | Strom fliesst nur in eine Richtung |
| Lücke am Nulldurchgang | kurz 0 V, solange der Betrag der Eingangsspannung unter ≈ 1,4 V liegt | beide Dioden brauchen ihre Durchlassspannung |
| Periodendauer der Kurve | 10 ms (100 Hz) | doppelte Netzfrequenz, jede Halbwelle ergibt einen Buckel |
| Gleichanteil (V⎓) | ≈ 5,0 V | etwas unter 2 · Û_R / π wegen der Lücken |
| Mit Ladekondensator (16.7, 10 µF) | Sägezahn oben am Scheitelwert, Gleichanteil ≈ 6,7 V | C lädt auf den Scheitel und entlädt sich über R1 |

Zum Vergleich der **Einweggleichrichter** (3.4, W5): nur jede zweite Halbwelle, Scheitel ≈ 9,3 V (Û − 1 · U_F), dazwischen 0 V, Periodendauer 20 ms.

## 3. Befund (Cowork, 06.10.2026, auf `f514d6f` nachgestellt)

**Die Simulation rechnet richtig. Falsch bzw. irreführend ist, gegen welchen Punkt das Oszilloskop misst, wenn der Erdungsclip nicht an `R1.b` hängt.**

Nachgestellt mit Aufgabe 16.7 auf der Werkbank, S1 offen, Bildbreite 50 ms:

| Tastkopf CH1 | Erdungsclip | Anzeige | Kennwerte |
|---|---|---|---|
| `R1.a` | `R1.b` | **richtig:** fünf Buckel in 50 ms, alle positiv | max 8,582 V, min 0 V |
| `R1.a` | nicht angeschlossen | **nur jede zweite Halbwelle**, dazwischen leicht negativ | max 9,291 V, min −0,709 V, Text «R1.a gegen Masse» |
| `R1.a` | `G1.n` | dasselbe Halbwellen-Bild | max 9,291 V, min −0,709 V |

Direkt mit der Engine gerechnet (`E.simulate`, Brücke aus 3.5):

- `R1.a` gegen `R1.b`: 0 → 8,1 → 0 → 8,1 → 0 … (Zweiweg, korrekt).
- `R1.a` gegen Bezugsknoten: 0 → 8,8 → 0 → −0,7 → 0 … (Halbwelle).
- `R1.b` gegen Bezugsknoten: 0 → 0,7 → 0 → −8,8 → 0 … (die andere Halbwelle, negativ).
- Die Differenz der beiden ist die korrekte Zweiweg-Kurve.

**Ursache im Code:**

1. `scopeCurve()` in `dev/src/app.js` ruft `E.simulate(..., { probes: [{ a: sp.a, b: sp.b || undefined }] })`. Ohne Erdungsclip ist `b` leer, und `simulate` misst dann gegen den Knoten `0`.
2. Knoten `0` ist ohne Masse-Symbol der **Minuspol der ersten Quelle** (`buildNetlist` in `dev/src/engine.js`: «ohne Masse-Symbol: Minuspol der ersten Quelle ist Bezugspunkt 0 V»). Beim Brückengleichrichter ist das `G1.n`, also ein Punkt **vor** der Brücke.
3. Die Anzeige nennt das nur «gegen Masse». Auf der Werkbank ist nirgends zu sehen, wo diese Masse liegt.
4. Dasselbe gilt in der Schaltplan-Ansicht («rot gegen Masse», wenn nur die rote Spitze gesetzt ist) und für CH2, der denselben Clip benutzt.

Physikalisch ist das Halbwellen-Bild sogar richtig: Wer am echten Gerät die Masse an den Generator-Minuspol legt und `R1.a` antastet, sieht genau das. Für Lernende wirkt es aber wie ein defekter Gleichrichter.

**Praxisbezug, der bisher fehlt:** Am echten Labortisch sind Oszilloskop-Masse und Generator-Masse oft beide geerdet. Den Erdungsclip an `R1.b` zu hängen, würde dann eine Diode der Brücke kurzschliessen. Deshalb misst man dort mit Trenntransformator, Differenztastkopf oder mit zwei Kanälen und der Rechenfunktion CH1 − CH2. In DigitalQuest ist das Oszilloskop potentialfrei, der Clip an `R1.b` ist erlaubt.

---

## 4. Pakete

### G0 – Befund bestätigen und Inventar (kein Code)

1. Tabelle aus Abschnitt 3 nachstellen (Playwright), Screenshots unter `dev/tests/shots/`.
2. **Inventar aller Stellen, an denen ein Oszilloskop-Kanal ohne zweiten Anschluss gegen Knoten `0` misst:** `scope()` und `scopeCurve()` (Aufgabe, Sandbox), Werkbank-Schirm, grosses Oszilloskop `#scopeBig`, Tutorial (`tutScope`), Mini-Schaltungen in der Theorie (`mini.js`, `spec.scope` mit und ohne `b`), Vorführ-Modus (`demoMeasure`), Einstellungs-Box (`setupHtml`, Text «Erdungsclip an Masse»), Prüfung und Live-Challenge, Leitstand-Schülerdetail.
3. **Inventar aller Aufgaben mit Gleichrichter oder Oszilloskop-Messwert:** mindestens 3.4, 3.5, 13.x mit Diode, 16.6, 16.7, 16.8, W5, W9, Prüfungsvorlage G04 und weitere Vorlagen mit Diode. Je Aufgabe: Haben alle Messwerte mit `mode: 'AC'` sowohl `a` als auch `b`? Wo steht `b` nicht, obwohl die Schaltung kein Masse-Symbol hat?
4. Ergebnis in `docs/STAND.md`, Abschnitt «Gleichrichter und Bezugspunkt (06.10.2026)».

### G1 – Bezugspunkt nie stillschweigend

Ziel: Niemand sieht eine Kurve, ohne zu wissen, wogegen gemessen wird.

1. **Klartext statt «gegen Masse»:** Ist kein Erdungsclip (bzw. keine schwarze Spitze) gesetzt, nennt die Anzeige den tatsächlichen Bezugspunkt, zum Beispiel «CH1 R1.a gegen G1.– (Bezugspunkt, Erdungsclip nicht angeschlossen)». Gilt für Seitenleiste, Werkbank-Schirm, grosses Oszilloskop und Tutorial. Dafür liefert die Engine den Bezugspunkt als Anschlussname (aus `groundRoots` in `buildNetlist`: Masse-Symbol oder Minuspol der ersten Quelle).
2. **Bezugspunkt sichtbar:** In Werkbank und Schaltplan wird der Anschluss, der als Bezugspunkt dient, markiert (Masse-Zeichen ⏚ am Pin, Tooltip «Bezugspunkt 0 V»), solange das Oszilloskop ohne Clip misst.
3. **Warnhinweis unter der Kurve**, wenn der Clip fehlt: «Der Erdungsclip ist nicht angeschlossen. Du misst gegen G1.– und nicht über dem Bauteil. Für die Spannung an R1: Tastkopf an R1.a, Erdungsclip an R1.b.» Der zweite Satz entsteht aus dem Bauteil, an dem der Tastkopf hängt (zweipoliges Bauteil → anderer Anschluss).
4. **Aufgabenbezogener Hinweis:** Verlangt ein Messwert der Aufgabe `a` und `b` und der Tastkopf hängt an `a`, der Clip aber nicht an `b`, erscheint der konkrete Hinweis mit den beiden Anschlüssen aus `measure[]`. Nicht in Prüfung und Live-Challenge (dort nur Punkt 1 und 2, keine Lösungshilfe).
5. **Negative Anteile kennzeichnen:** Kennwerte bleiben max/min, zusätzlich Mittelwert und Periodendauer bzw. Frequenz **des gemessenen Signals** (nicht der Quelle). Beim Brückengleichrichter zeigt das 10 ms / 100 Hz, beim Einweggleichrichter 20 ms / 50 Hz.
6. Keine Änderung an der Wertung: `E.runTask` vergleicht weiterhin nur den eingetragenen Wert mit dem Sollwert.

### G2 – Aufgaben und Texte der Gleichrichter-Stationen

1. Alle Messwerte aus dem Inventar G0.3 bekommen ausdrücklich `a` und `b`. Validator-Regel: Ein Messwert mit `mode: 'AC'` ohne `b` ist ein Fehler, ausser die Schaltung enthält ein Masse-Symbol.
2. Einstellungs-Box und Vorführ-Modus nennen immer beide Anschlüsse, nie «Masse» ohne Angabe des Punktes.
3. 3.5 hat heute nur den Gleichanteil als Messwert. Ergänzen: Scheitelwert an R1 (Oszilloskop) und die Frage nach der Periodendauer der Ausgangsspannung (10 ms), damit die Zweiweg-Gleichrichtung am Schirm überprüft wird. `rechenweg` dazu schreiben (Û − 2 · U_F).
4. Hinweistexte (`hint`, `hint2`, `take`) von 3.4, 3.5, 16.6, 16.7, W5 prüfen: Stimmen die Zahlen mit der Simulation überein, und steht überall, wo der Erdungsclip hingehört?
5. `wrong`-Varianten und Störungsszenarien der Live-Challenge bleiben lösbar (`tests/tasks.js`, Build erzeugt `dq_live.json` neu).

### G3 – Differenzmessung CH1 − CH2 (erst Vorschlag an Steven)

Seit dem 05.10.2026 gibt es CH2 mit gemeinsamem Erdungsclip. Daraus lässt sich die praxisnahe Messung bauen:

- Rechenkanal **MATH = CH1 − CH2**, eigene Farbe, ein- und ausschaltbar wie die Kanäle, eigene Kennwerte.
- Anwendung: Clip an `G1.n`, CH1 an `R1.a`, CH2 an `R1.b`. CH1 und CH2 zeigen je eine Halbwelle (eine positiv, eine negativ), MATH zeigt die Zweiweg-Kurve. Das erklärt Stevens Beobachtung am Gerät selbst.
- Vorschlag an Steven: Bedienung (Taste «MATH» am Gerät und in der Seitenleiste), ob eine neue Aufgabe dazukommt (z. B. 16.9 «Potentialfrei messen») oder nur ein Abschnitt in 16.7.

### G4 – Theorie und Handbuch (erst Vorschlag an Steven)

1. **Lektion zum Brückengleichrichter:** Heute erklärt keine Theorie die Strompfade. Vorschlag ausarbeiten, wo das hingehört (Ergänzung in Kapitel 3 neben T3B oder in Kapitel 13 bei der Diode). Inhalt: beide Strompfade als Bild mit hervorgehobenen leitenden Dioden, Soll-Kurve aus Abschnitt 2, Vergleich Einweg/Zweiweg, zwei Diodenspannungen Verlust, doppelte Frequenz.
2. **Spotlight-Mittel:** eine Mini-Schaltung der Brücke mit laufendem Oszilloskop **an R1** (`scope: { a: 'R1.a', b: 'R1.b' }`), Stromfluss-Animation und Zeitlupe, sodass man sieht, welches Diodenpaar gerade leitet. Regel einhalten: höchstens ein Spotlight-Mittel und höchstens zwei sichtbare Bilder je Lektion, Text unter 2600 Zeichen.
3. **Handbuch «Oszilloskop»:** neuer Abschnitt «Bezugspunkt und Erdungsclip»: Das Oszilloskop zeigt immer eine Spannung zwischen zwei Punkten. Ohne Clip ist der Bezugspunkt der Minuspol der Quelle bzw. das Masse-Symbol. Dazu der Praxishinweis aus Abschnitt 3 (geerdete Geräte, Trenntransformator, Differenztastkopf, CH1 − CH2).
4. **Werkbank-Tutorial:** Schritt «Tastkopf + Erdungsclip» um einen Satz ergänzen, was ohne Clip passiert.
5. Merksatz und Fragen der betroffenen Lektion ergänzen (eine Frage: «Welche Kurve siehst du an R1.a, wenn der Erdungsclip am Minuspol des Generators hängt?»).

### G5 – Tests und Abnahme

1. **Engine** (`test_engine.js`): Brücke aus 3.5 → Spannung `R1.a`–`R1.b` über zwei Perioden nie unter −0,01 V; Scheitel beider Halbwellen gleich (Abweichung < 1 %) und ≈ Û − 2 · U_F; Mittelwert im Bereich 4,9 … 5,9 V; Grundperiode 10 ms. Einweg: Scheitel ≈ Û − U_F, Periode 20 ms. Bezugspunkt-Name wird geliefert.
2. **Smoke** (`tests/smoke.js`, neuer Abschnitt «Gleichrichter»): 16.7 mit Clip an `R1.b` → min ≥ 0, Periode 10 ms, kein Warnhinweis. Ohne Clip → Text nennt `G1.–`, Warnhinweis sichtbar, Bezugspunkt markiert. Clip an `G1.n` → aufgabenbezogener Hinweis. Schaltplan-Ansicht mit nur roter Spitze → Klartext. Prüfung/Live → kein aufgabenbezogener Hinweis.
3. **Alle Ebenen** aus G0.2 je einmal im Test: Seitenleiste, Werkbank-Schirm, grosses Oszilloskop, Tutorial, Mini-Schaltung der Theorie, Vorführ-Modus.
4. `tests/tasks.js` (alle Aufgaben, beide Ansichten), `validate.js`, `validate_exam.js`, `test_api.js`, `test_exam_api.js`, `tests/portal.js` bleiben grün.
5. Handy 390 px: Warnhinweis und Kennwerte lesbar, kein Querscrollen.

---

## 5. Offene Entscheidungen für Steven (Empfehlung fett)

1. **Ohne Erdungsclip:** Kurve trotzdem zeigen, aber mit Klartext, Markierung und Warnhinweis, oder gar keine Kurve, bis der Clip sitzt? → **Zeigen mit Hinweis.** Das ist das echte Verhalten, und ältere Aufgaben mit Masse-Symbol funktionieren weiter.
2. **Differenzmessung CH1 − CH2 (G3):** bauen? → **Ja**, sie erklärt den Effekt und ist die Messung, die man im Labor wirklich braucht.
3. **Neue Aufgabe «Potentialfrei messen»:** → **Später**, zuerst G1 bis G5.
4. **Ort der Theorie (G4):** Kapitel 3 oder Kapitel 13? → **Kapitel 3**, dort wird die Brücke zum ersten Mal gebaut (3.5).
5. **Entspricht der Befund in Abschnitt 3 dem, was du gesehen hast?** Falls du den Erdungsclip an `R1.b` hattest und trotzdem nur eine Halbwelle kam: bitte Aufgabe, Ansicht (Werkbank oder Schaltplan) und Bildbreite nennen.

## 6. Nicht tun

- Die Simulation der Dioden und der Brücke nicht «korrigieren». Sie rechnet richtig.
- Keine Kurve künstlich nach oben klappen. Das Oszilloskop zeigt, was zwischen den beiden Anschlüssen liegt.
- Wertung, Prüfung und Live-Challenge inhaltlich nicht verändern.
- `index.html`, `web/`, `worker/gen/` nicht von Hand ändern.

## 7. Fertig heisst

Befund und Inventar in STAND; an R1 gemessen erscheint die Zweiweg-Kurve mit 10 ms Periode; ohne Clip nennt jede Oszilloskop-Anzeige den Bezugspunkt im Klartext und markiert ihn; alle Gleichrichter-Messwerte haben `a` und `b`; Handbuch und Theorie erklären Strompfade und Bezugspunkt; alle Tests grün; `docs/STAND.md` und `CLAUDE.md` nachgeführt.

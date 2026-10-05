# Auftrag für Claude Code: Oszilloskop-Darstellung, Labor-Feinheiten, Avatare mit Coins und Shop (05.10.2026)

Repo: `StevenMatzinger93/digital-quest`, Stand `main` = `42f54fb` (03.10.2026). Diese Datei liegt als `docs/AUFTRAG_OSZI_LABOR_AVATARE_2026-10-05.md` im Repo.
Grundlage: zwei Notizen von Steven vom 04.10.2026 (Oszilloskop zeigt den Sinus falsch; Avatar-System wie in SPS Quest), der offene Punkt 0c aus `docs/STAND.md` → «Nächste Schritte» und das Transferpaket `docs/AVATAR_SYSTEM_TRANSFER.md` (Avatar-System aus SPS Quest mit vollständigem Quellcode, ergänzt am 05.10.2026).

**Prompt zum Einfügen in Claude Code:**

> Lies `CLAUDE.md`, `docs/STAND.md` und `docs/AUFTRAG_OSZI_LABOR_AVATARE_2026-10-05.md`. Setze zuerst Paket O (Oszilloskop) um, dann Paket L in der Reihenfolge L1 bis L4. Für Paket A liest du zusätzlich `docs/AVATAR_SYSTEM_TRANSFER.md`, machst nur A0 (Abbildung auf DigitalQuest und Vorschlag) und wartest dann auf meine Antworten zu Abschnitt 6. Nach jedem Paket: alle Tests grün, `docs/STAND.md` nachführen, kurz berichten. Arbeite auf einem Branch `wip/…` und übernimm erst mit grünem Validator nach `main`.

---

## 1. Ausgangslage

- Alle Tests sind auf `42f54fb` grün (geprüft am 05.10.2026): Engine 107, Validator 0 Fehler (1 Warnung: T16C hat 6 statt 5 Fragen), Prüfungspool 172 Varianten, API 115, Prüfungs-API 89, `tests/tasks.js` 339 Durchläufe, `tests/smoke.js` und `tests/portal.js` OK.
- Auftrag 6 (Feedback vom 01.10.2026, Phasen 0–7) ist umgesetzt, siehe STAND «Feedback 01.10.2026».
- Laptop 2 ist eingerichtet (`C:\dev\DigitalQuest`, `npm ci`, Playwright-Chromium).
- In DigitalQuest gibt es noch **keinen** Code zu Avataren oder Coins (Suche nach `avatar` und `coin` in `dev/src`, `dev/portal`, `worker` ohne Treffer).

## 2. Arbeitsweise

- Je Paket ein Branch: `wip/oszi`, `wip/labor-feinheiten`, `wip/avatare`. Jeder Push auf `main` deployt live, darum erst mit grünem Validator und grünen Tests übernehmen.
- Nach jedem Paket die Tests aus `CLAUDE.md` (Engine, Validator, Prüfungspool, Build, API, Prüfungs-API, `tests/smoke.js`, `tests/portal.js`, `tests/tasks.js`).
- `index.html`, `web/` und `worker/gen/` sind generiert und werden nie von Hand geändert.
- Sichtbare Texte mit echten Umlauten ä/ö/ü, ß immer als ss. Bezeichner bleiben ASCII.
- `docs/STAND.md` nach jedem Paket nachführen, neue Felder und Regeln auch in `CLAUDE.md`.

---

## 3. Paket O – Oszilloskop zeigt den Sinus nicht korrekt

**Meldung von Steven (04.10.2026):** Beim Testen der Werkbank stellt das Oszilloskop die Sinuswelle nicht mehr korrekt auf dem Bildschirm dar. Ursache unklar, eventuell ist auch das Messgerät generell betroffen.

**Vorbefund (Cowork, 05.10.2026, nicht von Steven bestätigt):** Nachgestellt mit Aufgabe W1 (Generator Û 12 V, 50 Hz, Teiler 1 kΩ / 2 kΩ), Werkbank, Tastkopf an `R2.a`, Erdungsclip an `R2.b`.

| Bildbreite | Seitenleiste (`#scope`) | Oszilloskop auf der Werkbank | Kennwerte |
|---|---|---|---|
| 50 ms (Vorbelegung) | sauberer Sinus, 2,5 Perioden | sauberer Sinus | max 8,000 V, min −8,000 V |
| 100 ms | sauber, 5 Perioden | sauber | 8,000 / −8,000 V |
| 5 ms | nur eine Viertelperiode sichtbar | – | max 8,000 V, min 0,000 V |
| 1 s | volles Band (50 Perioden) | **gezackte, unregelmässige Hüllkurve** statt eines Bandes | 7,984 / −7,984 V |
| 5 s | wie 1 s | wie 1 s | 7,984 / −7,984 V |

Wahrscheinliche Ursache für das gezackte Bild: `scopeCurve()` in `dev/src/app.js` dünnt die Abtastwerte für die Anzeige auf rund 150 Punkte aus (`stepN = Math.floor(s.length / 150)`). Bei 1 s Bildbreite und 50 Hz sind das etwa 3 Punkte je Periode, die Kurve auf dem Werkbank-Schirm wird dadurch falsch gezeichnet. Die Kennwerte (max/min) stammen aus allen Abtastwerten und stimmen weitgehend.

Das ist **ein** nachgestellter Fall. Ob Steven genau das gesehen hat, ist offen.

**Aufgaben:**

1. **Zuerst reproduzieren** und in `docs/STAND.md` festhalten: Aufgaben W1, W4, W6, W7, 16.3, 16.5 und das Werkbank-Tutorial, jeweils alle Bildbreiten, beide Ansichten (Seitenleiste, Werkbank-Schirm, grosses Oszilloskop `#scopeBig`). Screenshots ablegen. Falls der Befund oben Stevens Beobachtung nicht erklärt: Steven mit Screenshot nach Aufgabe, Bildbreite und Gerät fragen, bevor etwas geändert wird.
2. **Anzeige korrigieren:** Bei vielen Perioden im Bild die Hüllkurve zeichnen (je Bildspalte Minimum und Maximum) statt jeden n-ten Punkt zu nehmen. Werkbank-Schirm, Seitenleiste und grosses Oszilloskop müssen dasselbe Bild zeigen.
3. **Kennwerte:** max/min dürfen bei keiner Bildbreite vom Sollwert abweichen, solange mindestens eine ganze Periode im Bild ist (heute 7,984 statt 8,000 V bei 1 s). Bei weniger als einer Periode (5 ms bei 50 Hz) einen Hinweis anzeigen, dass die Bildbreite zu klein ist, um Scheitelwert und Spitze-Spitze abzulesen.
4. **Multimeter prüfen** (Stevens Vermutung): V~ (AVG und TRMS) und V⎓ an denselben Aufgaben gegen `E.acMeasure` vergleichen. Nur Befund, falls alles stimmt.
5. **Tests:** `tests/smoke.js` um einen Abschnitt ergänzen, der für eine Sinus-Aufgabe jede Bildbreite durchgeht und prüft: Kennwerte innerhalb 1 %, Kurve auf Werkbank und Seitenleiste deckungsgleich, Hinweis bei zu kleiner Bildbreite.

**Fertig heisst:** Befund in STAND, Sinus bei jeder Bildbreite plausibel dargestellt, Kennwerte stimmen, Tests grün.

---

## 4. Paket L – Offene Labor-Feinheiten (STAND «Nächste Schritte», Punkt 0c)

Reihenfolge L1 → L4. Jeder Punkt beginnt mit einem kurzen Befund zum heutigen Stand, weil die Liste älter ist als Auftrag 6.

### L1 – Live-Anzeige bei schnellen Wechselquellen mitteln
- **Heute** (STAND «Bekannte Grenzen»): Die Live-Anzeige tastet 50-Hz-Quellen mit der Bildrate ab. LED, Lampe und Spannungsfarben flackern unregelmässig (Aliasing). Messwerte sind nicht betroffen.
- **Ziel:** Helligkeit von Lampe und LED sowie die Spannungsfarben aus dem Effektivwert bzw. Mittelwert über mindestens eine Periode ableiten, sobald die schnellste Quelle schneller ist als die Bildrate sinnvoll auflöst. Langsame Quellen (z. B. 1 Hz Taktgeber) sollen weiterhin sichtbar blinken.
- **Abnahme:** Lampe an 50 Hz leuchtet ruhig, in Schaltplan und Werkbank; Taktgeber 1 Hz blinkt weiter; Stromfluss-Animation unverändert.

### L2 – A~-Bereich am Multimeter
- **Heute:** Es gibt V⎓, V~, A⎓ und Ω, aber keinen Wechselstrombereich.
- **Ziel:** Messart A~ mit AVG und TRMS wie bei V~, in Reihe gemessen, mit Sicherung und denselben konkreten Meldungen wie bei A⎓ (parallel zur Quelle → FUSE). Bei `rangeUX: 'manual'` mit Bereichstasten. Datenblatt, Handbuch «Multimeter», Einstellungs-Box und Vorführ-Modus berücksichtigen die neue Messart.
- **Abnahme:** Wechselstrom durch einen Widerstand am Sinus stimmt mit `E.acMeasure` überein; A⎓ an Wechselstrom und A~ an Gleichstrom geben den passenden Hinweis; `tests/tasks.js` bleibt grün.

### L3 – Zweiter Oszilloskop-Kanal
- **Heute:** Ein Kanal mit eigenem Tastkopf und Erdungsclip (seit Auftrag 6).
- **Ziel:** CH2 mit zweitem Tastkopf (andere Farbe), gemeinsame Masse, Kanäle einzeln ein- und ausschaltbar, eigene Kennwerte je Kanal. Im Schaltplan ohne Tastkopf bleibt es bei einem Kanal. Sinnvoll für Ein-/Ausgang am RC-Glied (Kapitel 14) und Gleichrichter (Kapitel 3, 16).
- **Vorher abstimmen:** kurzer Bedienvorschlag (wo liegt der zweite Tastkopf, wie werden die Kanäle unterschieden) an Steven, bevor gebaut wird.
- **Abnahme:** Ein- und Ausgang eines Tiefpasses gleichzeitig sichtbar, Phasenverschiebung erkennbar; bestehende Aufgaben unverändert lösbar.

### L4 – Zoomen auf dem Handy
- **Heute:** Die Werkbank kennt bereits Zwei-Finger-Zoom (`bench.js`, `pinch`). STAND nennt trotzdem «Bausteine auf dem Handy per Pinch zoomen» als offen.
- **Zuerst klären:** Was fehlt konkret (Schaltplan-Ansicht, Mini-Schaltungen in der Theorie, Tutorial-Werkbank, oder Bedienbarkeit der kleinen Buchsen)? Befund auf 390 px Breite mit Screenshots, dann Vorschlag an Steven.
- **Abnahme:** nach Stevens Antwort festlegen.

---

## 5. Paket A – Avatare, Coins und Shop wie in SPS Quest

**Wunsch von Steven (04.10.2026):** In SPS Quest verdienen Teilnehmende mit gelösten Aufgaben Coins und kaufen damit im Shop Accessoires für ihren Avatar. Dasselbe soll es in DigitalQuest geben (Avatare, Coin-System, Shop).

### 5.1 Vorbild in SPS Quest (`StevenMatzinger93/scl-quest`, geprüft auf `cd685be`)

| Datei | Inhalt |
|---|---|
| `dev/src/avatar_core.js` (`SPSQAvatar`, 627 Zeilen) | Katalog (8 Tiere, Farben, `ITEMS` mit Plätzen, Seltenheit, Sets), SVG-Zeichnung (`svg(av, {size, pose, style})`), Coin-Regeln, Freischaltungen, `balance()` |
| `worker/avatar.js` | `GET/PUT /api/avatar`, `POST /api/avatar/buy`; Kontostand = aus dem synchronisierten Fortschritt berechnet + `coin_ledger` (Prämien, Käufe) |
| `worker/db.js`, Migration 9 | Tabellen `avatars` (user_id, animal, color, equip) und `coin_ledger` (user_id, amount, source, ref, eindeutig je Konto/Quelle/Referenz) |
| `worker/gen/avatar_bundle.js` | vom Build erzeugt (Kern + `AVATAR_META`) |
| `dev/portal/portal_avatar.js` | Garderobe `#/avatar` im Portal |
| `dev/test_avatar.js`, `dev/tests/avatar.js`, `dev/tests/avatar_snap.js` | Logik-, Browser- und Bildvergleich-Tests |
| `docs/AUFTRAG_FUP_LIVE_AVATARE.md` (auch hier im Repo) | Abschnitte 8 und 12: Avatare 2.0 und Garderobe 2.0 |

Coin-Regeln dort (`RULES`): Aufgabe 10 / 15 / 20 Coins für 1 / 2 / 3 Sterne, aufgedeckt 3, Kapitel-Boss +40, Final Boss +100, Theorie 10, Live-Challenge Platz 1–3 = 60 / 40 / 25, gelöst 10, Teilnahme 5, Zertifikat 300 (mit Auszeichnung 500). Coins sind nur verdienbar, nie kaufbar, rein kosmetisch.

### 5.2 Was in DigitalQuest anders ist

- Nur ein Bereich (`progress` mit Quest `dq`), nicht vier Sprachen. Fortschritt liegt in `done` / `doneInfo` (`stars`, `tries`, `hints`), Theorie in `theory`. Die Zuordnung auf die Coin-Regeln muss angepasst werden.
- Seit Auftrag 6 gibt es **aufgedeckte Messwerte** und die **Lösungsansicht** (höchstens 1 Stern). Das entspricht dem Fall «aufgedeckt» in SPS Quest.
- Boss-Aufgaben: 10.10 (Grundstufe) und 15.10 (Profi-Stufe). Kapitel 16 und die Übungswerkstatt zählen nicht zu Abzeichen und Zertifikat.
- Migrationen in `worker/db.js` laufen bis Nummer 6. Neue Tabellen als **neue** Migration anhängen, nie eine alte ändern.
- Live-Challenge heisst hier Sprint und Störungsjagd; Tabellen `challenges` und `challenge_players` existieren.
- Die Einzeldatei `index.html` läuft ohne Konto. Avatare und Coins gibt es nur mit Konto im Portal.

### 5.3 Transferpaket `docs/AVATAR_SYSTEM_TRANSFER.md`

Steven hat das Avatar-System aus SPS Quest als Transferpaket gezogen (Stand `cd685be`). **Ziel ist die Übernahme 1:1**, angepasst werden nur die Stellen aus Teil B, Abschnitt 6 des Pakets.

- Teil A beschreibt das System (Datenmodell, 8 Tiere, 77 Gegenstände plus 32 Farbvarianten, 5 Seltenheitsstufen, Coin-Regeln, Freischaltung, API).
- Teil B beschreibt den Einbau und die Abnahme-Checkliste.
- Teil C enthält den Quellcode. Geprüft am 05.10.2026: Kern (C1), Server (C2), Garderobe (C3) und Logik-Test (C8a) sind zeichengleich mit dem Repo `scl-quest`.

Der Prompt oben im Transferpaket ist allgemein gehalten. Für DigitalQuest gilt dieser Auftrag; die Zielpfade und Anpassungen stehen in 5.4.

### 5.4 Abbildung auf DigitalQuest (geprüft am Code, `42f54fb`)

| Stelle im Transferpaket | Stand in DigitalQuest | Was zu tun ist |
|---|---|---|
| Zielpfade | Aufbau wie SPS Quest | `dev/src/avatar_core.js`, `worker/avatar.js`, `dev/portal/portal_avatar.js`, `dev/test_avatar.js`, `dev/tests/avatar.js`, `dev/tests/avatar_snap.js`, `dev/lab/` |
| `./lib.js` (`json`, `fail`, `now`, `cleanText`) | alle vier vorhanden | Import unverändert |
| `./gen/exam_bundle.js` (`Exam`, `FINAL_TASKS`) | exportiert `Exam` und `QUEST_TASKS`, kein `FINAL_TASKS`; `Exam.checkGameTask` gibt es nicht | `verifiedFinals` anpassen: Boss 10.10 und 15.10 serverseitig prüfen oder Final-Teile nicht als serverbestätigt führen (Entscheid in A0 vorschlagen) |
| `./challenge.js` (`rank`) | exportiert nur `challengeRoutes` und `livePoints` | Rangfolge aus Anhang C7c übernehmen oder aus `livePoints` ableiten |
| Sudden Death (`end_rule`, `winner_id`), mehrere Aufgaben (`solved_n`) | Spalten gibt es nicht; `challenge_players` hat `attempts`, `hints`, `solved_at`, `points` | `challengeStats` ohne diese Spalten rechnen; `sdWins` bleibt 0, Teile mit dieser Bedingung ausblenden oder umdeuten |
| Tabelle `certificates` (`quest`, `level`, `revoked_at`) | vorhanden, gleiche Spalten | `certsOf` unverändert; es gibt aber nur `dq` × Grund/Profi, also höchstens 2 Zertifikate |
| Fortschritt `doneTasks` / `doneTheory` | `progress.state` mit `done`, `doneInfo` (`stars`, `tries`, `hints`), `theory` | in `progressOf()` im Worker in die erwartete Form umrechnen; aufgedeckte Messwerte und Lösungsansicht als `revealed` abbilden |
| Kollektionen `scl`, `kop`, `fup`, `awl`, `sensor` | ein Bereich `dq` mit Teilen I–V und Übungswerkstatt | Vorschlag: je Teil der Karte eine Kollektion (I Elektrotechnik, II Digitaltechnik, III Kombinatorik, IV Zeitverhalten und Praxis, V Messtechnik mit Werkstatt). Dazu den Fortschritt im Worker je Teil aufteilen, damit `questSolved` unverändert zählt |
| Bedingungen `profiCerts: 4`, `finals3`, `sensorAll`, `sensorClean` | in DigitalQuest nicht erreichbar | auf erreichbare Leistungen umdeuten (z. B. beide Zertifikate, beide Bosse, ganze Werkstatt) |
| `RULES` | 168 Aufgaben, 33 Theorien, 2 Bosse | Wirtschafts-Rechnung mit `economy(meta)`; Faustregel aus dem Paket: ein ganzer Kurs ≈ ein Legendär-Teil |
| `window.SPSQ` (Garderobe) | `window.DQP` mit `api`, `esc`, `toast`, `confirmDlg`, `routes`, `user`; `openTerminal` ist intern, `setUserAvatar` fehlt | fehlende Funktionen an `DQP` ergänzen, Garderobe darauf umstellen |
| Migration | `worker/db.js` endet bei Nummer 6 | Migration 7 mit `avatars`, `coin_ledger` und Index anhängen |
| CSS-Variablen `--scl`, `--line2`, `--dim`, `--mono` | eigenes Design (Leitfarbe Bernstein, `--accent-lead`) | auf die Variablen von `portal.css` abbilden |
| Titel und Texte («Fahrdienstleiter», `UNLOCK_TEXT`) | SPS-Thema | auf Elektronik und Digitaltechnik umschreiben, mit echten Umlauten |
| Variante ohne Server | Einzeldatei `index.html` läuft ohne Konto | **nicht bauen**: Avatare und Coins nur mit Konto im Portal |

### 5.5 Etappen

- **A0 – Abbildung und Vorschlag (wartet auf Steven):** Transferpaket lesen, Tabelle 5.4 am Code nachprüfen und ergänzen, Vorschlag für Kollektionen, umgedeutete Bedingungen, Titel und Coin-Regeln. Wirtschafts-Rechnung für DigitalQuest (verdienbare Coins bei vollständigem Durchlauf gegen Katalogsumme von rund 80 700). Antworten auf Abschnitt 6 einholen. **Kein Code vor Stevens Antwort.**
- **A1 – Kern und Worker:** Dateien aus Teil C unverändert anlegen, dann nur die Stellen aus 5.4 anpassen. Build erzeugt `worker/gen/avatar_bundle.js` mit `AVATAR_META` aus den Kapiteln. Migration 7. Konto löschen entfernt `avatars` und `coin_ledger`. `node test_avatar.js` muss grün sein (nach Katalog-Anpassungen Preisbänder und Server-Regel für Legendär/Mythisch beachten).
- **A2 – Garderobe im Portal:** `#/avatar` über `DQP`, Menüpunkt «Avatar & Coins», CSS aus Anhang C4. Handy 390 px.
- **A3 – Zeigen:** `avatarHTML()` im Konto-Chip (Portal und Labor), Leitstand-Klassenliste, Live-Challenge (Lobby, Rangliste, Podest am Beamer), Endbildschirm im Spiel. Prämien: `awardSpeedrun` nach Challenge-Ende, `awardCert` nach bestandener Prüfung.
- **A4 – Abnahme:** Checkliste aus Teil B, Abschnitt 8 des Transferpakets vollständig durchgehen und das Ergebnis in STAND festhalten.
- **Am Schluss:** Datenschutz-Seite um «Avatar und Coins» ergänzen (keine neuen Personendaten), Handbuch-Seite, Anleitung im Portal, `CLAUDE.md` und `STAND.md`.

**Tests:** `dev/test_avatar.js`, `tests/avatar.js` (API und Oberfläche), `tests/avatar_snap.js` (Bildvergleich, Bildrate), dazu `tests/portal.js`, `tests/smoke.js` und `test_api.js` weiterhin grün.

---

## 6. Offene Entscheidungen für Steven (Empfehlung fett)

1. **Umfang:** entschieden am 05.10.2026 durch das Transferpaket: ganzer Stand von SPS Quest, 1:1. Offen bleibt nur, wie die SPS-spezifischen Stellen umgedeutet werden (Punkte 2 bis 4).
2. **Kollektionen:** Je Teil der Karte eine Kollektion (I bis V mit Werkstatt)? → **Ja**, so bleibt die Zähl-Logik des Kerns unverändert.
3. **Nicht erreichbare Teile** (vier Profi-Zertifikate, Final Boss in drei Sprachen, Sudden Death, Sensorwerkstatt): umdeuten oder weglassen? → **Umdeuten**, wo es eine passende Leistung gibt, sonst ausblenden.
4. **Sudden Death:** in DigitalQuest nachbauen? → **Später**, eigener Auftrag.
5. **Gemeinsames Konto mit SPS Quest:** Sollen Avatar und Coins zwischen SPS Quest und DigitalQuest geteilt werden? Heute sind es zwei getrennte Datenbanken und Anmeldungen. → **Getrennt lassen**, Zusammenführen gehört zum Dach-Projekt Bühlerquest (Portal).
6. **Coin-Regeln:** Werte aus SPS Quest unverändert übernehmen? → **Ja, sofern die Wirtschafts-Rechnung aus A0 aufgeht** (DigitalQuest hat einen Bereich statt fünf, der Katalog kostet rund 80 700 Coins).
7. **Kapitel 16 und Übungswerkstatt:** Geben sie Coins, obwohl sie nicht zum Abzeichen zählen? → **Ja**, Üben soll sich lohnen.
8. **Bestehender Fortschritt:** Coins rückwirkend für schon gelöste Aufgaben? → **Ja**, ergibt sich von selbst, weil der Kontostand aus dem Fortschritt berechnet wird.
9. **Globaler Name:** `SPSQAvatar` behalten oder in `DQAvatar` umbenennen? → **Behalten**, damit spätere Änderungen aus SPS Quest ohne Umbenennen übernommen werden können.
10. **Oszilloskop (Paket O):** Entspricht der Vorbefund dem, was du gesehen hast? Falls nein: Aufgabe, Bildbreite, Gerät.
11. **Zoomen auf dem Handy (L4):** Was genau soll sich zoomen lassen?

---

## 7. Nicht tun

- Keine neuen Konten oder Zugangsdaten anlegen, keine Daten in der Live-Datenbank löschen.
- Meldungen im Portal nicht selbst als erledigt markieren.
- Kein Code für Paket A vor Stevens Antworten zu Abschnitt 6.
- Betreiberangaben in Impressum und Datenschutz nicht erfinden (Platzhalter bleiben, bis Steven sie liefert).

## 8. Wer macht was

- **Claude in Cowork (gemacht, 05.10.2026):** Stand in Notion und im Repo geprüft, Laptop 2 eingerichtet, alle Tests laufen lassen, Oszilloskop-Fall nachgestellt, SPS-Quest-Avatarsystem gesichtet, Transferpaket gegen das Repo `scl-quest` und gegen den DigitalQuest-Code geprüft, diesen Auftrag geschrieben.
- **Claude Code:** Pakete O und L umsetzen, A0 vorbereiten, nach Stevens Antworten A1–A4, Tests schreiben, STAND und CLAUDE nachführen.
- **Steven:** Entscheidungen Abschnitt 6, Abnahme je Paket, Betreiberangaben für Impressum und Datenschutz (noch offen aus Auftrag 6).

## 9. Fertig heisst (alle Pakete)

Build, Validator und Prüfungspool 0 Fehler, Engine-, API- und Prüfungs-Tests, `tests/smoke.js`, `tests/portal.js`, `tests/tasks.js` (Schaltplan und Werkbank) grün; Browser ohne JS-Fehler; Offline-Einzeldatei spielbar; alte Spielstände laden; `docs/STAND.md` nachgeführt.

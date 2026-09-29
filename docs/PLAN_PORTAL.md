# Plan: Portal, Leitstand, Live-Challenge und Zertifikat wie bei SPS Quest (Stand 29.09.2026)

Auftrag Steven (29.09.2026): Umgang und Handhabung von Konten, Dozentenbereich, Leitstand und Challenges sollen **exakt wie bei SPS Quest** funktionieren (Vorbild: GitHub `StevenMatzinger93/scl-quest`, Stand 27.09.2026 – der lokale Ordner "SCL Quest" ist veraltet). Dazu das Design der Laborkarte aufwerten (Kacheln mit Symbolen zum Inhalt).

## Entscheide (Steven, 29.09.2026)
- **Aufbau: Portal wie SPS Quest.** `web/index.html` = Portal (Halle mit Toren, ARIA-Funkspruch entfaellt → Laborchefin, Login als Leitstand-Terminal, Leitstand, Administration, Live-Challenge + Beamer). Das Spiel liegt unter `web/labor/`. Die Offline-Datei `index.html` bleibt das Spiel ohne Konto.
- **Dozentenmodus ans Konto gekoppelt:** Wer als Dozent oder Admin angemeldet ist, hat im Spiel alles offen und die Sprungliste. Die Code-Eingabe (`labor2026`) entfaellt; `?alle` bleibt fuer Tests.
- **Umfang:** Leitstand, Administration, Live-Challenge (Sprint, Stoerungsjagd), Vorgaben mit Frist (eigene Funktion, bleibt), Anleitungen, Feedback-Knopf 💬 mit Meldungen, **Zertifikat mit Pruefung**. **Kein Pikettdienst.**
- Leitfarbe bleibt Bernstein (Bauplan: jede Quest eigene Leitfarbe), Aufbau und Bedienung wie SPS Quest.

## Was sich gegenueber dem Stand vom 29.09. aendert
- Worker: statt eigener Tabellen (`dozenten`, `klassen`, `schueler` …) das Schema von SPS Quest (`users` mit Rolle, `classes`, `sessions`, `progress`, `attempts`, `challenges` …), Tabellen legt der Code an (`worker/db.js`). Sitzung per Cookie `dq_sess` (HttpOnly, SameSite=Lax), Schreibzugriffe mit Header `x-dquest: 1`. Bestehende Konten (2 Dozenten, 1 Klasse) werden uebernommen.
- Konten nur noch in der gehosteten Version (wie SPS Quest); die Offline-Datei spielt lokal.
- Spielstand-Abgleich wie SPS Quest: ganzer Spielstand je Konto (`PUT /api/progress/dq` mit `base`, 409 bei Konflikt, mehr Fortschritt gewinnt), Uebernahme des lokalen Stands auf Nachfrage, anderes Konto mischt nie, Abmelden laedt hoch und leert den Browser.
- Startpasswoerter werden erzeugt (`wort-wort-12`), muessen beim ersten Login geaendert werden; Zugangszettel zum Drucken; Hinweis an Lernende zur Einsicht der Lehrperson.
- `dev/src/account.js` (Konto-Seite im Spiel) entfaellt; im Spiel bleibt ein Konto-Chip mit Link ins Portal.

## Arbeitspakete (je Paket ein Commit auf `wip/portal`, am Schluss nach `main`)
1. **Worker**: `lib.js`, `db.js` (Migrationen inkl. Uebernahme der alten Tabellen), `index.js` (Login, Sitzungen, Rollen, Klassen, Konten, Fortschritt), `assign.js` (Vorgaben mit Frist), Tests `dev/test_api.js` gegen den D1-Nachbau.
2. **Portal-Grundgeruest**: `dev/portal/` (body, css, portal.js), Build nach `web/` (Portal, `labor/`, `data/dq.json`, Service Worker ohne `/api/`).
3. **Spiel**: Konto-Abgleich (`ACCT`), Dozent/Admin = alles offen + Sprungliste, Vorgaben auf der Karte, alte Konto-Seite und Code-Modus entfernen.
4. **Leitstand**: Klassen, Klassencode, Konten erzeugen + Zugangszettel, Klassenliste mit Fortschritt, Schuelerdetail mit Aufgabenraster und Loesung als Schaltplan, Vorgaben mit Frist; Administration.
5. **Live-Challenge**: Worker `challenge.js`, Portal (anlegen, Beamer, beitreten), Spiel (`labor/?live=ID`), Modi Sprint und Stoerungsjagd (Szenarien aus den `wrong`-Loesungen und Fehlersuch-Aufgaben).
6. **Laborkarte neu**: Kacheln mit Symbol zum Inhalt (Bauteil bzw. Thema), Sterne/Status, ruhigeres Raster.
7. **Anleitungen und Feedback**: Seiten fuer Lernende/Dozenten/Admin, Knopf 💬, Meldungen.
8. **Zertifikat mit Pruefung**: Pruefungspools, Bewertung im Worker mit der Engine, Pruefungsmodus im Spiel, Portal-Seiten, Pruefseite `/z/:code`.
9. **QA und Doku**: Tests, STAND, ENTSCHEIDUNGEN, CLAUDE.md, Testplan.

## Stand (29.09.2026): alle neun Pakete umgesetzt, Branch `wip/portal`
Tests gruen (Engine 98, Validator, Pruefungspool 172 Varianten, API 115, Pruefungen 89, `tests/smoke.js`, `tests/portal.js`, `tests/tasks.js` 322 Durchlaeufe). Beschreibung in `docs/STAND.md` → "Portal wie SPS Quest", Entscheide beim Bau in `docs/ENTSCHEIDUNGEN.md`.
Offen vor dem Livegang: Freigabe von Steven fuer den Merge nach `main` (deployt automatisch; die Datenbank stellt sich beim ersten API-Aufruf selbst um und uebernimmt die bestehenden Konten), `npm install qrcode-generator` in `dev/` fuer den QR-Code auf dem Zertifikat, Impressum/Datenschutz mit den echten Angaben fuellen, Testplan von Hand (STAND.md).

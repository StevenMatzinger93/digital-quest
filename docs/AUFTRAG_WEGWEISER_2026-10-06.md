# Auftrag für Claude Code: Wegweiser – erklärte Menüführung für Portal und Labor (06.10.2026)

Repo: `StevenMatzinger93/digital-quest`, Stand `main` = `f514d6f` (05.10.2026). Diese Datei liegt als `docs/AUFTRAG_WEGWEISER_2026-10-06.md` im Repo.
Grundlage: Wunsch von Steven vom 06.10.2026.

**Prompt zum Einfügen in Claude Code:**

> Lies `CLAUDE.md`, `docs/STAND.md` und `docs/AUFTRAG_WEGWEISER_2026-10-06.md`. Mache zuerst W0 (Inventar aller Menüpunkte je Rolle) und zeige mir den Textentwurf für den Wegweiser. Nach meinem OK setzt du W1 bis W4 um. Arbeite auf dem Branch `wip/wegweiser`, nach jedem Paket alle Tests grün und `docs/STAND.md` nachführen, erst mit grünem Validator nach `main`.

---

## 1. Wunsch

> «Das Menü ist sehr überladen, aber das ist ok. Ich möchte aber, dass es eine klassische Menüführung gibt, wo erklärt wird, wo was zu finden ist, um sich mit der Seite vertraut machen zu können.»

**Das Menü selbst bleibt, wie es ist.** Es wird nichts entfernt oder umsortiert. Neu kommt eine Orientierungshilfe dazu, die jeden Menüpunkt erklärt.

## 2. Ausgangslage (geprüft auf `f514d6f`)

**Portal** (`dev/portal/portal.js`, `renderTop()`; weitere Punkte hängen sich über `P.nav.push` ein):

| Menüpunkt | Adresse | Sichtbar für |
|---|---|---|
| Halle | `#/` | alle |
| Live-Challenge | `#/live` | Lernende |
| Leitstand | `#/leitstand` | Dozenten, Admin |
| Avatar & Coins | `#/avatar` | alle mit Konto |
| Meldungen | `#/meldungen` | Dozenten, Admin |
| Zertifikate | `#/zertifikate` | alle mit Konto ausser Admin |
| Administration | `#/admin` | Admin |
| Konto | `#/konto` | alle mit Konto |
| Anleitung | `#/anleitung` | alle |

Dazu die Halle mit den drei Toren (Labor, Übungswerkstatt, Freie Werkbank), das Benutzermenü oben rechts, der Feedback-Knopf und die Fusszeile (Impressum, Datenschutz).

**Labor** (`dev/src/index.template.html`): Logo (zur Halle bzw. Karte), Karte, Handbuch, Werkbank-Tutorial, Einstellungen, Taschenrechner, Konto-Chip. Innerhalb einer Aufgabe: Umschalter Schaltplan/Werkbank, Werkzeugleiste, Multimeter, Oszilloskop, Messprotokoll, Tipps, «Vorführen».

Es gibt heute **keinen geführten Rundgang** in DigitalQuest. SPS Quest hat eine Tour-Mechanik (`startTour` / `showTourStep` in `dev/src/app.js` des Repos `scl-quest`), die als Vorbild dient.

## 3. Lösung: Wegweiser in zwei Formen

1. **Wegweiser-Seite** («Wo finde ich was?»): eine klassische Übersicht wie eine Sitemap. Jeder Menüpunkt mit Symbol, einem Satz Erklärung und direktem Link. Nach Rolle gefiltert, jederzeit über das Menü erreichbar.
2. **Geführter Rundgang**: hebt die Menüpunkte nacheinander hervor und erklärt sie in je einem Satz. Startet beim ersten Besuch auf Nachfrage und lässt sich jederzeit von der Wegweiser-Seite aus wiederholen.

Beide nutzen **dieselbe Textquelle**, damit Erklärungen nur an einer Stelle gepflegt werden.

---

## 4. Pakete

### W0 – Inventar und Textentwurf (wartet auf Steven)

1. Vollständige Liste aller Menüpunkte, Tore, Knöpfe der Kopfzeile und Einträge im Benutzermenü, je Rolle (ohne Konto, Lernende, Dozent, Admin), für Portal und Labor. Tabelle aus Abschnitt 2 am Code nachprüfen und ergänzen.
2. Je Eintrag: Titel, ein Satz «Was finde ich hier?», ein Satz «Wann brauche ich das?». Sprache: Du-Form, kurze Sätze, echte Umlaute, ß als ss.
3. Entwurf als Tabelle an Steven. **Kein Code vor seinem OK.**

### W1 – Gemeinsame Textquelle

- Neue Datei `dev/portal/wegweiser_data.js` (bzw. passend zum Build) mit einer Liste: `id`, `bereich` (Portal / Labor / Aufgabe), `titel`, `text`, `wann`, `href` oder `selector` (Element für den Rundgang), `rollen`.
- Der Build bindet sie in Portal **und** Labor ein. Der Validator prüft: Jeder Eintrag in `P.nav` und jeder `data-go`-Knopf der Labor-Kopfzeile hat einen Wegweiser-Eintrag, sonst Fehler. So bleibt der Wegweiser vollständig, wenn später ein Menüpunkt dazukommt.

### W2 – Wegweiser-Seite

- **Portal:** Route `#/wegweiser`, Menüpunkt «Wegweiser» direkt nach «Halle», für alle sichtbar (auch ohne Konto). Zusätzlich ein gut sichtbarer Knopf «Neu hier? Wegweiser» in der Halle.
- **Labor:** Eintrag «Wegweiser» im Handbuch als erste Seite und ein Link in der Kopfzeile (Fragezeichen-Symbol), der im Portal-Labor auf `../#/wegweiser` führt und in der Offline-Einzeldatei die Handbuch-Seite öffnet.
- **Aufbau der Seite:** drei Abschnitte «Portal», «Labor», «In einer Aufgabe». Je Eintrag eine Karte mit Symbol, Titel, Erklärung und Knopf «Öffnen». Einträge, die die angemeldete Rolle nicht sieht, werden ausgeblendet; ohne Konto steht bei Konto-Funktionen «nach dem Anmelden».
- Oben ein Suchfeld, das die Karten nach Stichwort filtert (z. B. «Zertifikat», «Passwort», «Oszilloskop»).
- Ein Abschnitt «Häufige Wege» mit fünf bis acht Fragen als Direktlinks, zum Beispiel: «Wo sehe ich meine Vorgaben?», «Wo ändere ich mein Passwort?», «Wie trete ich einer Live-Challenge bei?», «Wo finde ich mein Zertifikat?», «Wo übe ich das Messen?», und für Dozenten «Wo lege ich eine Klasse an?», «Wo starte ich eine Prüfung?».
- Druckbar (Print-CSS, eine Seite je Rolle), damit Dozenten die Übersicht austeilen können.
- Handy 390 px: eine Spalte, kein Querscrollen.

### W3 – Geführter Rundgang

- Knopf «Rundgang starten» auf der Wegweiser-Seite, getrennt für Portal und Labor.
- Ablauf: Hintergrund abgedunkelt, der jeweilige Menüpunkt hervorgehoben (Spotlight), daneben eine Sprechblase mit Titel und Text aus der Textquelle, Knöpfe «Zurück», «Weiter», «Beenden», Anzeige «Schritt 3 von 9». Mechanik nach dem Vorbild `startTour` / `showTourStep` in SPS Quest.
- Nur Einträge, die für die Rolle sichtbar sind. Auf dem Handy öffnet der Rundgang zuerst das eingeklappte Menü.
- **Erster Besuch:** einmalige, dezente Frage «Neu hier? Rundgang starten» (kein automatischer Start). Die Antwort wird in den Einstellungen gemerkt (`settings`, im Portal lokal je Browser), kein neues Feld in der Datenbank.
- Tastatur: Pfeiltasten und Enter, Esc beendet; Fokus bleibt in der Sprechblase; `aria-live` für den Text. `prefers-reduced-motion`: ohne Bewegung.
- **Nie** in Prüfung, Live-Challenge und am Beamer.
- Ereignisse `tour_start`, `tour_done`, `tour_abort` in die Ereignisliste (nur im Labor, wie die übrigen Ereignisse).

### W4 – Einbindung, Tests, Doku

- Anleitungen im Portal (`portal_anleitung.js`): oben ein Verweis auf den Wegweiser, für Lernende und Dozenten.
- Handbuch im Labor: Seite «Wegweiser» und Verweis in «Bedienung».
- Service Worker: neue Dateien in die Cache-Liste, Cache-Version steigt durch den Build.
- **Tests:** `tests/portal.js` (Wegweiser ohne Konto, als Lernende, als Dozent, als Admin: je die richtigen Karten; Suche filtert; jeder «Öffnen»-Link führt zu einer vorhandenen Seite; Rundgang läuft bis zum Ende, Esc beendet, Frage erscheint nur einmal), `tests/smoke.js` (Labor: Link in der Kopfzeile, Handbuch-Seite, Rundgang, kein Rundgang in Prüfung/Live), Validator-Regel aus W1, Handy 390 px.
- `docs/STAND.md`, `CLAUDE.md` (neue Datei, Regel «neuer Menüpunkt braucht Wegweiser-Eintrag»).

---

## 5. Offene Entscheidungen für Steven (Empfehlung fett)

1. **Beides bauen (Seite und Rundgang) oder nur die Seite?** → **Beides**, die Seite zuerst. Die Seite ist die «klassische» Übersicht zum Nachschlagen, der Rundgang hilft beim ersten Besuch.
2. **Name:** «Wegweiser», «Übersicht» oder «Wo finde ich was?» → **«Wegweiser»** im Menü, Untertitel «Wo finde ich was?».
3. **Erster Besuch:** nur dezente Frage oder gar nichts automatisch? → **Dezente Frage, einmal.**
4. **Aufgaben-Oberfläche (Werkzeugleiste, Multimeter, Oszilloskop) im Rundgang:** dazunehmen? → **Nur als Abschnitt der Wegweiser-Seite**; die Bedienung erklärt bereits das Werkbank-Tutorial.
5. **Menü später doch aufräumen** (z. B. Dozenten-Punkte unter «Leitstand» bündeln)? → **Nicht in diesem Auftrag.**

## 6. Nicht tun

- Menüpunkte nicht entfernen, umbenennen oder umsortieren.
- Keine neuen Konten, keine Änderungen an der Datenbank.
- Keine Texte, die Funktionen versprechen, die es nicht gibt (z. B. Sudden Death).
- `index.html`, `web/`, `worker/gen/` nicht von Hand ändern.

## 7. Fertig heisst

Wegweiser-Seite im Portal und im Labor erreichbar, für jede Rolle vollständig und korrekt gefiltert; Rundgang für Portal und Labor läuft durch und lässt sich wiederholen; Validator meldet fehlende Einträge; alle Tests grün; `docs/STAND.md` und `CLAUDE.md` nachgeführt.

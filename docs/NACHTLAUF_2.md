# Nachtlauf 16./17.10.2026 — Digital Quest Studio

**Branch:** `wip/studio`. **Niemals nach `main`.**
Es gelten weiter: `AUFTRAG_STUDIO.md` Abschnitt 2, 5 und 6.

Rund acht Stunden ohne Aufsicht. Dieser Auftrag enthält bewusst mehr Arbeit,
als in acht Stunden hineinpasst — in der Reihenfolge, in der sie wichtig ist.
**Durcharbeiten, nicht hetzen.** Was hinten liegen bleibt, bleibt liegen und
wird gemeldet.

---

## Regeln für den Lauf

- **Nach jedem Block:** volle Testkette, `git commit`, Push auf `wip/studio`,
  Eintrag in `docs/FORTSCHRITT_STUDIO.md`. Nicht erst am Schluss — ein
  abgebrochener Lauf soll die fertige Arbeit behalten.
- **Nicht fragen, sondern entscheiden und notieren** in
  `docs/ENTSCHEIDUNGEN_STUDIO.md`, mit einer Zeile Begründung.
- **Nach drei vergeblichen Anläufen** an einer Sache: in
  `docs/FRAGEN_STUDIO.md` notieren, überspringen, weitermachen. Nicht
  festbeissen.
- **Eine Station oder ein Punkt, der klemmt, hält nie den Rest auf.**
- Nichts löschen, was nicht ausdrücklich ersetzt wird. Keine bestehenden Tests
  abschalten; wo eine Prüfung ihren Sinn verliert, wird sie ersetzt.

Testkette:

```
cd dev
node test_engine.js && node tests/kern.js && node validate.js && node build.js
node tests/studio.js
node tests/smoke.js && node tests/tasks.js      # Spiel, dauert ~15 min
```

---

## Block 1 — Rückstände abarbeiten (zuerst, weil klein und sicher)

### 1a. Die zwei Hänger im Rechenkern

`tests/robust.js` findet bei schwingenden Zufallsschaltungen Fälle, in denen
die Berechnung nicht zum Ende kommt. Sie liegen in `engine.js` und betreffen
damit auch das Spiel.

Behebung mit Augenmass: Eine Schaltung ohne stabilen Zustand ist physikalisch
sinnvoll (ein Ringoszillator schwingt nun einmal). Die Berechnung muss das
erkennen und **sauber melden statt hängen** — Obergrenze für die Iterationen,
Meldung «Schaltung schwingt, kein stabiler Arbeitspunkt», und im Zeitbereich
weiterrechnen statt abzubrechen.

**Abnahme:** `tests/robust.js` läuft mit beiden Startzahlen ohne Hänger durch.
Ein bewusst gebauter Ringoszillator aus drei NICHT-Gattern schwingt im
Zeitverlauf sichtbar, statt die Seite einzufrieren — als neuer Test in
`tests/kern.js`.

### 1b. Stevens Schreibweise AV und A

Siehe `AUFTRAG_LERNPFAD.md` Abschnitt 2. Aus Stevens Unterlagen belegt:
Ansteuertabelle hat die Spalten `AV | A | <Eingänge>`, nicht `Qₙ | Qₙ₊₁`.

Im Bauteil-Inspektor, im Zeitverlauf-Kopf und im Druck durchgängig auf `AV`
und `A` umstellen. Die Pin-Beschriftung am Bauteil bleibt `Q` und `Q̄` — das ist
Schaltzeichen, keine Tabelle.

**Abnahme:** Kein `Qₙ` mehr in Tabellenköpfen; Inspektor und Druck geprüft.

### 1c. Spiel-Testkette auf dem Endstand

`smoke.js` und `tasks.js` liefen zuletzt auf einer Momentaufnahme. Einmal
vollständig auf dem jetzigen Stand laufen lassen und das Ergebnis vermerken.
Falls etwas rot ist: beheben, das hat Vorrang vor allem Weiteren.

---

## Block 2 — Lernpfad: Gerüst und Prüfmaschine

Inhalt und Gliederung stehen vollständig in **`docs/AUFTRAG_LERNPFAD.md`**.
Dieser Block baut das Fundament.

**Abweichend von Abschnitt 9 dort: nicht nach Station A5 anhalten.** Station A5
wird als Muster gebaut, dann wird durchgearbeitet. Damit eine spätere Änderung
der Form billig bleibt: Stationen und Aufgaben liegen als **Daten** in eigenen
Dateien, nicht als handgeschriebene Oberfläche je Station. Eine Änderung an der
Darstellung trifft dann alle Stationen auf einmal.

Zu bauen:

- Lernpfad als eigener Bereich im Studio, erreichbar aus dem Hauptmenü
- Stationsliste mit Zustand je Station: gesperrt, offen, in Arbeit, bestanden
- Datenformat für Stationen und Aufgaben, versioniert
- Fortschritt im Browserspeicher, mit try/catch; dazu Ausgeben und Einlesen als
  Datei
- **Die sieben Prüfarten** aus `AUFTRAG_LERNPFAD.md` Abschnitt 3, jede einzeln
  getestet
- Station A5 (Die acht Gatter) vollständig als Muster, weil sie alle drei
  Aufgabenarten enthält

**Abnahme:** A5 lässt sich vollständig durcharbeiten. Musterlösung wird
angenommen, falsche Lösung begründet abgelehnt. Fortschritt überlebt das
Neuladen. Ausgeben und Einlesen ergibt denselben Stand.

---

## Block 3 — Teil A vollständig

Stationen A1 bis A13 nach `AUFTRAG_LERNPFAD.md` Abschnitt 4.

Reihenfolge: A1, A3, A4, A6, A7 (die kleinen zuerst), dann A8, A10, A11, A12,
A13, zuletzt A2 (Laborstation mit Messprotokoll).

**Fachliche Prüfung ist Pflicht:** Jede Wahrheitstabelle, jede Minimalform und
jedes KV-Ergebnis wird gegen eine **unabhängige Berechnung** geprüft
(Quine-McCluskey für die Minimalformen), nicht gegen die eingetippte Lösung.
Eine Station, deren Lösung dieser Prüfung nicht standhält, wird nicht
freigegeben, sondern in `FRAGEN_STUDIO.md` gemeldet.

**Abnahme je Station:** ein Test, der die Musterlösung einspielt (wird
angenommen) und eine falsche (wird abgelehnt).

---

## Block 4 — Teil B vollständig

Stationen B1 bis B13. Dieselben Regeln.

B9 (Digitale Uhr) ist die Abnahme des ganzen Pfades: Wer A1 bis B8
durchgearbeitet hat, muss alle nötigen Bauteile freigeschaltet haben. Als Test
über die Abhängigkeiten prüfen.

---

## Block 5 — Bereit für den Betrieb im Netz

Vorbereitung fürs Livestellen; der Merge nach `main` geschieht **nicht** hier,
den macht Steven.

- **Offline:** Der Service Worker (`web/sw.js`) nimmt `/studio/` auf, wie er es
  für Portal und Labor schon tut. Nach dem ersten Aufruf läuft das Studio ohne
  Netz. Beim Erscheinen einer neueren Fassung wird das sauber gemeldet, nicht
  stillschweigend ein alter Stand weitergeliefert.
- **Dateidialoge:** Wo der Browser es kann (Chrome und Edge), werden Öffnen und
  Speichern über die Dateiauswahl des Systems abgewickelt statt über den
  Download-Ordner. Wo nicht, bleibt es beim bisherigen Weg — ohne Fehlermeldung,
  ohne Hinweis.
- **Als App installierbar:** Ein Manifest für `/studio/`, damit sich das Studio
  mit eigenem Symbol und eigenem Fenster an die Taskleiste heften lässt. Name
  «Digital Quest Studio», Symbol aus `dev/assets/icon.svg`.
- **Tragbare Fassung:** `studio.html` bleibt wie bisher eine Datei, die ohne
  alles läuft. Dazu `LIESMICH.txt` in `dist/` mit zwei Sätzen, wie man sie
  benutzt.

**Abnahme:** Browser-Test mit abgeschaltetem Netz nach dem ersten Besuch. Das
Manifest wird vom Browser angenommen. Die Dateidialoge sind in Chromium
geprüft, der Rückfallweg ebenso.

---

## Block 6 — Abschluss

Volle Testkette einschliesslich der Spiel-Tests. Dann der Schlussbericht in
`docs/FORTSCHRITT_STUDIO.md`:

- Welche Blöcke fertig sind, welche nicht, und wo genau der Lauf stehen blieb
- Welche Stationen des Lernpfads fertig, geprüft und freigegeben sind — als
  Liste, Station für Station
- Was Steven prüfen muss, nach Dringlichkeit (Abschnitt 8 in
  `AUFTRAG_LERNPFAD.md` nennt die Punkte)
- Welche Entscheidungen selbst getroffen wurden
- Welche Fragen offen sind

**Keine Schönfärberei.** Ein Block, der nicht fertig wurde, steht als nicht
fertig da. Eine Station, deren Lösung der unabhängigen Prüfung nicht
standhielt, wird genannt, nicht versteckt.

---

## Wenn Zeit übrig bleibt

In dieser Reihenfolge:

1. Die Leistungsgrenze anheben — gemischte Schaltungen laufen heute nur bis
   etwa 25 Bauteile flüssig (`docs/LEISTUNG_STUDIO.md`). Wo liegt der Engpass,
   und was bringt die einfachste Verbesserung?
2. Lernpfad Stufe 2: Anbindung an das Portal, damit Steven im Leitstand sieht,
   wo seine Klasse steht (`AUFTRAG_LERNPFAD.md` Abschnitt 6). **Nur anfangen,
   wenn mindestens zwei Stunden bleiben** — eine halbfertige Anbindung ist
   schlechter als keine.
3. Die Anleitung `docs/ANLEITUNG_STUDIO.md` auf den neuen Stand bringen.

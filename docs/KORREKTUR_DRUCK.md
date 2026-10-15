# Korrektur: Druckseiten

Steven hat die Druckausgabe am 15.10.2026 angesehen (`l_seite1.png`,
`l_seite2.png`). **Fachlich stimmt alles** — Wahrheitstabelle, Minterme,
KV-Gruppen, Minimalform und die Gatterzählung im Schlusssatz wurden
nachgerechnet und sind richtig. Die Gruppen sind korrekt durch Strichart statt
Farbe unterschieden.

Zu korrigieren ist die Seitenaufteilung.

**Branch:** `wip/studio`. **Nicht nach `main`.**

---

## 1. Inhalt füllt die Seite — Fehler im Auftrag

`AUFTRAG_BAUEN.md`, Anhang A.3 sagt: «sie wird nie über ihre natürliche Grösse
hinaus vergrössert». **Das war falsch und wird gestrichen.** Es galt für den
Bildschirm; auf Papier soll die Fläche genutzt werden.

Heute ist auf beiden Seiten mehr als die Hälfte des Blattes leer, die
Bauteilbezeichner sind kaum lesbar.

**Neu:** Der Inhalt wird so skaliert, dass er den Inhaltsbereich füllt — in
beide Richtungen, auch vergrössernd. Seitenverhältnis bleibt erhalten.

- **Seite 1:** Die Schaltung füllt den Inhaltsbereich bis auf einen Rand von
  etwa 5 %. Der erklärende Absatz darunter behält seine Grösse.
- **Seite 2:** Wahrheitstabelle, KV-Diagramm und der Ausdrucksblock wachsen
  gemeinsam, bis der Inhaltsbereich gefüllt ist. Die Schriftgrössen wachsen
  mit, die Verhältnisse untereinander bleiben.
- Eine Obergrenze gibt es nicht; es darf gross werden. Lieber zu gross als
  halb leer — die Blätter werden auch am Beamer gezeigt.

**Abnahme:** Auf beiden Seiten bleibt zwischen Inhalt und Schriftfeld höchstens
ein Zehntel der Seitenhöhe frei. Das Beispiel `A = e1 ( e2 v e3 )` als Probe:
die Bauteilbezeichner sind in gedruckter Grösse ohne Mühe lesbar.

---

## 2. Titel ist ein Name, nicht die Formel

Heute steht «A = e1 ( e2 v e3 )» dreimal auf dem Blatt: als Titel oben links,
als Formel oben rechts und nochmals im Schriftfeld unter TITEL.

**Neu:**

- **Titel** (oben links und im Schriftfeld) ist der Name der Schaltung, also
  das, was im Schriftfeld eingetragen wurde — zum Beispiel «UND-Verknüpfung mit
  vorgeschaltetem ODER».
- **Oben rechts** steht die Formel, auf Folgeseiten «zur Schaltung auf Blatt 1».
- Ist kein Titel eingetragen, bleibt die Stelle leer; die Formel rückt **nicht**
  an die Titelstelle.

---

## 3. Erklärender Satz auf Seite 1 fehlt

Anhang A.3 sieht unter der Schaltung ein bis zwei Sätze vor, was sie tut. Auf
`l_seite1.png` fehlen sie.

Die Quelle ist das Beschreibungsfeld der Schaltung. Ist es leer, bleibt der
Platz leer — kein erfundener Text.

---

## 4. A4 hoch bleibt die Voreinstellung

Steven hat entschieden: **A4 hoch bleibt**, auch für Schaltpläne. Querformat
bleibt wählbar. Mit Punkt 1 löst sich das Platzproblem ohnehin.

Der Massstab (bis 1 : 2) bleibt für Schaltungen, die auch vergrössert nicht
hineinpassen — er greift dann nach unten statt nach oben.

---

## Abnahme insgesamt

Die beiden Probeseiten neu erzeugen und in `dev/tests/shots/` ablegen. Zu
erfüllen:

- Inhalt füllt beide Seiten, höchstens ein Zehntel Leerraum über dem
  Schriftfeld
- Titel und Formel stehen an getrennten Stellen, nichts doppelt
- Der erklärende Satz steht unter der Schaltung
- Fachlich unverändert: Tabelle, Gruppen, Minimalform, Gatterzählung bleiben
  wie sie sind, die Tests dazu bleiben grün
- Volle Testkette grün, besonders `tests/studio.js` im Gesamtlauf

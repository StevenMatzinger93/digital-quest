# Nachtauftrag Digital Quest Studio — 14./15.10.2026

**Steven schläft.** Dieser Auftrag ist so geschrieben, dass keine Rückfrage
nötig ist. Wo etwas nicht geregelt ist: entscheiden, in
`docs/ENTSCHEIDUNGEN_STUDIO.md` eintragen, weiterarbeiten.

**Branch:** `wip/studio` (derselbe, nicht neu abzweigen)
**Grundlage:** `docs/AUFTRAG_STUDIO.md` — Abschnitt 2 (Entscheidungen),
Abschnitt 5 (Regeln) und Abschnitt 6 (Architekturregel) gelten unverändert
weiter.

**Niemals nach `main` pushen.** Jeder Push dorthin deployt die Live-Seite.

---

## Ablauf

Die Pakete werden **der Reihe nach** abgearbeitet. Nach jedem Paket:
Testkette vollständig, `git commit`, Push auf `wip/studio`, Eintrag in
`docs/FORTSCHRITT_STUDIO.md`.

Kommst du bei einem Paket nach drei Anläufen nicht weiter: in
`docs/FRAGEN_STUDIO.md` notieren, Paket überspringen, nächstes beginnen.
Nicht die ganze Nacht an einer Sache hängen.

Testkette nach jedem Paket:

```
cd dev
node test_engine.js && node tests/kern.js && node validate.js && node build.js
node tests/smoke.js && node tests/tasks.js && node tests/studio.js
```

---

## Paket 1 — Korrekturen aus der Abnahme

### 1a. preSet und preClear gleichzeitig

**Bisher:** preClear gewinnt. **Neu:** unzulässiger Zustand.

Liegen preSet und preClear gleichzeitig an, gehen **beide Ausgänge auf 1**
(Q = 1 und Q̄ = 1). Das Flipflop verlässt seinen definierten Zustand. Im
Schaltplan wird das Bauteil markiert, im Inspektor steht ein Klartexthinweis.
Beim Wegnehmen eines der beiden Eingänge nimmt das Flipflop den Zustand ein,
den der verbleibende Eingang vorgibt.

**Begründung** (gehört so in `ENTSCHEIDUNGEN_STUDIO.md`): Beim 7474 und 7476
sind beide Eingänge low-aktiv; liegen beide an, gehen Q und Q̄ gemeinsam auf
HIGH, und die Datenblätter führen das als unzulässige Kombination. Didaktisch
ist das entscheidend: Steven lehrt den verbotenen Zustand R = S = 1 beim
RS-Flipflop als Kernpunkt. Eine stille Auflösung nach preClear würde genau das
verstecken, was die Lernenden sehen sollen.

Der unzulässige Zustand wird **gleich dargestellt wie der verbotene Zustand des
RS-Flipflops** — eine Darstellung, nicht zwei.

**Abnahme:** Test über alle Kombinationen aus preSet, preClear, Takt und
Dateneingang je Flipflop-Typ. Der unzulässige Zustand wird gemeldet, nicht
stillschweigend aufgelöst. Das Verlassen des Zustands ist geprüft.

### 1b. Laufzeit sichtbar machen

Die 20 ns Laufzeit pro Stufe sind bei 1 Hz Takt ein Hundertmillionstel einer
Periode — im Zeitverlauf unsichtbar. Genau diese Laufzeit ist aber der
didaktische Punkt des asynchronen Zählers.

Zwei Wege, beide bauen:
1. Im Zeitverlaufsdiagramm weit genug hineinzoomen können, bis die versetzten
   Flanken sichtbar werden, mit Angabe der Zeitspanne.
2. Ein Schalter **„Laufzeit überhöhen"** mit Faktor (1×, 10³×, 10⁶×), der die
   Gatterlaufzeit für die Darstellung streckt. Im eingeschalteten Zustand
   deutlich gekennzeichnet, damit niemand die überhöhten Werte für echt hält.

**Abnahme:** Beim asynchronen Zähler mit 1 Hz und Überhöhung 10⁶ sind die
versetzten Flanken der Stufen im Diagramm ohne Zoom erkennbar. Die
Rechenergebnisse ändern sich durch die Überhöhung nicht, nur die Darstellung.

---

## Paket 2 — Stufe 7: Wechselstromanalyse

Wie in `AUFTRAG_STUDIO.md`, Stufe 7. Komplexe Knotenanalyse um den
Arbeitspunkt als eigener Rechenweg neben Gleichstrom und Zeitbereich —
dieselbe Netzliste, anderer Löser. Bode-Diagramm mit Verstärkung in dB und
Phase in Grad über logarithmischer Frequenzachse.

**Abnahme:** RC-Tiefpass −3 dB bei `fg = 1/(2π·R·C)` auf 1 %, Abfall 20 dB je
Dekade, Phase −45° bei `fg`. RLC-Schwingkreis: Resonanzfrequenz und Güte
stimmen mit der Rechnung. Beides in `tests/kern.js`.

---

## Paket 3 — Editorgrundlagen

### 3a. Rückgängig und Wiederholen

**Die wichtigste fehlende Funktion.** Ohne sie trauen sich Lernende nicht
auszuprobieren, und Ausprobieren ist der Zweck des Werkzeugs.

Gilt für alle Änderungen an der Schaltung: Bauteil setzen, bewegen, drehen,
löschen, Leitung ziehen und löschen, Werte ändern, Zähler aufklappen.
Tastenkürzel Strg+Z und Strg+Y (zusätzlich Strg+Umschalt+Z). Mindestens
50 Schritte tief.

**Abnahme:** Automatischer Test: fünfzig zufällige Bedienschritte ausführen,
fünfzig Mal rückgängig machen, Schaltung ist byteweise identisch mit dem
Ausgangszustand. Danach fünfzig Mal wiederholen, identisch mit dem Zustand
nach den fünfzig Schritten.

### 3b. Automatisches Zwischenspeichern

Alle paar Sekunden in den Speicher des Browsers, Wiederherstellung beim
nächsten Start mit Rückfrage. Zugriffe auf den Browserspeicher immer in
try/catch, die Seite muss auch ohne funktionieren.

**Abnahme:** Browser-Test: Schaltung bauen, Seite neu laden, Wiederherstellung
wird angeboten und stellt dieselbe Schaltung her.

### 3c. Tastaturbedienung

Entf löscht, R dreht, Esc bricht ab, Strg+A wählt alles, Strg+C/V kopiert und
fügt ein, Pfeiltasten verschieben um ein Raster. Eine Übersicht der Kürzel im
Hilfemenü.

---

## Paket 4 — Schieberegler für Bauteilwerte

**Falstads stärkste Lehrfunktion.** Ein Bauteilwert bekommt einen Schieberegler
mit einstellbarem Bereich; während die Simulation läuft, zieht man daran und
sieht Kurve und Messwerte mitwandern.

- Je Bauteil über das Eigenschaftenfeld einschaltbar
- Bereich, Schrittweite und logarithmische oder lineare Teilung einstellbar
- Mehrere Regler gleichzeitig, in einer eigenen Leiste gesammelt
- Wirkt sofort, ohne die Simulation anzuhalten

**Abnahme:** Browser-Test: RC-Glied mit Regler am Widerstand, Simulation läuft,
Regler verändern, gemessene Zeitkonstante folgt dem eingestellten Wert auf 2 %.

---

## Paket 5 — Stufe 8: Dateien, Export, Drucken, Stückliste

Wie in `AUFTRAG_STUDIO.md`, Stufe 8, erweitert um:

**Drucken.** Schaltplan auf A4, schwarzweiss, saubere Linien, mit Titelfeld
(Name der Schaltung, Datum). Für Prüfungen auf Papier.

**Export für Unterrichtsunterlagen.** SVG und PNG, wahlweise in Farbe oder
schwarzweiss, mit und ohne Messwerte. Steven baut Word-Dokumente nach
Firmenvorlage — der Export muss dort sauber landen.

**Stückliste.** Aus der Schaltung erzeugt: Bauteil, Wert, Anzahl. Als Tabelle
im Fenster und als CSV. Für die Vorbereitung des Praktikums am echten
Steckbrett.

**Abnahme:** Speichern und Laden ergibt dieselbe Schaltung. Eine Datei mit
älterer Formatversion lässt sich öffnen. Der SVG-Export der Digitaluhr öffnet
sich fehlerfrei in einem anderen Programm. Stückliste der Digitaluhr stimmt mit
der Schaltung überein.

---

## Paket 6 — Robustheitslauf und Leistungsmessung

**Dieses Paket ändert nichts** — es misst und berichtet. Gefundene echte Fehler
werden behoben, aber keine Funktionen ergänzt.

### 6a. Robustheitslauf

Zufällige Schaltungen erzeugen (mindestens 2000 Durchläufe, feste
Startzahl für Wiederholbarkeit) und prüfen:

- Kein Absturz, keine unbehandelte Ausnahme
- Keine NaN oder Unendlich in Spannungen, Strömen oder Kurven
- Die laufende Simulation bleibt nicht hängen
- Singuläre und unbestimmte Fälle werden sauber gemeldet, nicht verschluckt
- Auch pathologische Fälle: schwebende Teile, Quellenschleifen, Kurzschluss
  über eine Quelle, Widerstand null, Kondensator ohne Entladeweg, Flipflop
  ohne Takt, Rückkopplung von Gattern auf sich selbst

Ergebnis nach `docs/ROBUSTHEIT_STUDIO.md`: was geprüft wurde, was gefunden,
was behoben, was offen bleibt.

### 6b. Leistungsmessung

Ab wie vielen Bauteilen ruckelt die laufende Simulation? Messreihe mit
wachsender Schaltungsgrösse, Bilder je Sekunde und Rechenzeit je Schritt.
Getrennt für reine Logik, reine Analogschaltung und gemischt.

Ergebnis nach `docs/LEISTUNG_STUDIO.md`, mit einer klaren Aussage: bis zu wie
vielen Bauteilen läuft es flüssig.

---

## Paket 7 — Überlastung sichtbar machen

Die Engine kennt bereits durchbrennende Lampen (`lampBurn`) und Sperrspannung
an LEDs (`ledReverse`). Im Studio wird das sichtbar statt still zu passieren:
Bauteil markiert, Klartextmeldung, was passiert ist und warum.

**Abnahme:** Lampe an zu hoher Spannung und LED in Sperrrichtung werden beide
gemeldet, mit verständlichem Text.

---

## Paket 8 — Wahrheitstabelle und KV-Diagramm aus der Schaltung

Gatter zusammenbauen, Knopf drücken, Tabelle erscheint.

- Eingänge werden automatisch erkannt (Pegelschalter), Ausgänge ebenso
- Alle Kombinationen durchrechnen, Tabelle anzeigen
- Dazu das KV-Diagramm mit erkannten Gruppen — `dev/src/visuals.js` kann
  bereits eines zeichnen (`kmap`), das wird genutzt, nicht neu gebaut
- Minimalform als Ausdruck in Stevens Schreibweise (siehe Paket 9)

**Abnahme:** Für mindestens zehn bekannte Schaltungen stimmt die erzeugte
Tabelle mit der Rechnung überein. Die Minimalform ist tatsächlich minimal
(gegen eine unabhängige Berechnung geprüft, etwa Quine-McCluskey). Vorhandene
Helfer aus `dev/src/content/_logic.js` (`LG.truth`, `LG.table`) werden genutzt.

---

## Paket 9 — Boolescher Ausdruck und Schaltung

Beide Richtungen: Ausdruck eingeben und Schaltung erzeugen; Schaltung zeichnen
und Ausdruck ablesen.

**Schreibweise — aus Stevens Lehrmittel „Gesetze der Bool'schen Algebra",
verbindlich:**

| Bedeutung | Schreibweise |
|---|---|
| ODER | `v` (kleines v zwischen den Gliedern) |
| UND | Nebeneinanderstellen ohne Zeichen: `e1e2` |
| NICHT | Überstreichung |
| Eingänge | `e1`, `e2`, `e3`, … |
| Ausgang | `A` |
| Vorrang | **UND kommt vor ODER** |

Beispiel aus dem Lehrmittel: `A = e1 ( e2 v e3 ) = e1e2 v e1e3`

Beim Eingeben müssen auch getippte Ersatzzeichen verstanden werden
(`/e1` oder `!e1` für die Negation, `*` für UND, `+` für ODER), angezeigt wird
aber immer Stevens Schreibweise.

**Abnahme:** Hin- und Rückweg: Ausdruck → Schaltung → Ausdruck ergibt einen
logisch gleichwertigen Ausdruck (über die Wahrheitstabelle geprüft, nicht über
den Text). Mindestens die Beispiele aus dem Lehrmittel, einschliesslich beider
Gesetze von De Morgan.

---

## Paket 10 — Beamer-Modus

Für den Unterricht an der Leinwand: dickere Linien, grössere Schrift, höherer
Kontrast, grössere Bedienelemente. Umschaltbar über das Menü und ein
Tastenkürzel. Digital Quest hat das Prinzip bereits als Vorführ-Modus — dort
nachsehen und gleich benennen.

**Abnahme:** Browser-Test bei 1920×1080: Bauteilwerte und Signalnamen sind in
der Grösse lesbar, die aus fünf Metern Entfernung trägt. Umschalten verändert
die Schaltung nicht.

---

## Paket 11 — Aufgabe stellen

Steven baut eine Schaltung und gibt sie als Aufgabe weiter.

- **Werte verbergen:** Einzelne Bauteilwerte werden ausgeblendet, die Lernenden
  tragen sie ein
- **Störung einbauen:** Unterbrochene Leitung, falscher Wert, vertauschte
  Anschlüsse — als Fehler markiert, für die Lernenden unsichtbar
- **Lösung mitspeichern,** getrennt von der Aufgabe, nicht im Klartext in der
  Aufgabendatei
- Speichern als Aufgabendatei, die sich im Studio öffnen lässt

Digital Quest hat Störungsszenarien bereits (`web/data/dq_live.json`,
`bugs`) — Aufbau dort ansehen und nach Möglichkeit übernehmen.

**Abnahme:** Aufgabe mit verborgenen Werten und einer Störung erstellen,
speichern, neu laden: die verborgenen Werte sind in der Datei nicht lesbar,
die Störung wirkt, die Lösung lässt sich getrennt öffnen.

**Zur Prüfung durch Steven angemeldet** — der Arbeitsablauf hängt davon ab, wie
er tatsächlich unterrichtet.

---

## Paket 12 — Bedienungsanleitung

Aus dem fertigen Stand heraus geschrieben, nicht aus dem Auftrag:
`docs/ANLEITUNG_STUDIO.md`. Was das Studio kann, wie man es bedient,
Tastenkürzel, die Beispiele, die Grenzen. Deutsch, Schweizer Schreibweise,
du-Form (Steven duzt seine Lernenden).

---

## Am Morgen

`docs/FORTSCHRITT_STUDIO.md` schliesst mit einer Zusammenfassung:

- Welche Pakete fertig sind, welche nicht und warum
- Was Steven prüfen muss, Paket für Paket
- Was im Robustheitslauf gefunden wurde
- Bis zu wie vielen Bauteilen es flüssig läuft
- Welche Entscheidungen du selbst getroffen hast

Keine Schönfärberei. Ein Paket, das nicht fertig geworden ist, steht als nicht
fertig da.

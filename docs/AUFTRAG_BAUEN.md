# Auftrag: Freier bauen und zeichnen — Digital Quest Studio

**Grundlage:** Stevens erste Arbeitssitzung mit dem Studio am 15.10.2026.
Alle sechs Punkte stammen aus dem Benutzen, nicht aus einer Wunschliste.

**Branch:** `wip/studio` (derselbe)
**Es gelten weiter:** `docs/AUFTRAG_STUDIO.md` Abschnitt 2, 5 und 6.
**Niemals nach `main` pushen.**

Reihenfolge wie unten. Nach jedem Paket: Testkette, Commit, Push, Eintrag in
`docs/FORTSCHRITT_STUDIO.md`.

---

## Paket 1 — Leitung an Leitung: Knotenpunkte

**Stevens Beobachtung:** «Möchte ich selber einen Knotenpunkt setzen können.
Wenn mehrere Bauteile auf eine Leitung gebracht werden, dann muss ich immer an
einem Bauteilstartpunkt ziehen. Ich möchte aber eine Leitung auf eine Leitung
befestigen können für mehr Freiheit beim Bauen.»

Das ist die wichtigste Einschränkung von allen sechs. Jede Schaltung mit einem
gemeinsamen Signal — Takt auf vier Flipflops, Masse auf alles — zwingt heute zu
einem Stern vom Bauteil aus statt zu einer Sammelleitung mit Abzweigen.

### Was gebaut wird

- **Leitung auf Leitung ziehen:** Mit dem Leitungswerkzeug auf einer
  bestehenden Leitung beginnen oder enden. An der Stelle entsteht ein
  Knotenpunkt; die getroffene Leitung wird dort geteilt.
- **Knotenpunkt von Hand setzen:** Eigenes Bauteil oder Klick auf eine Leitung,
  dann ist dort ein benannter Abzweigpunkt, von dem aus weitergezogen wird.
- **Fangen:** Beim Ziehen über eine Leitung zeigt ein Vorschaupunkt, wo der
  Knoten entstehen würde. Fangradius wie bei Anschlüssen.
- **Verschieben:** Ein Knotenpunkt lässt sich verschieben, die angehängten
  Leitungen folgen.
- **Löschen:** Löschen eines Knotens mit genau zwei Leitungen führt diese
  wieder zusammen, statt beide zu entfernen.

### Darstellung — das ist ein Lehrinhalt, kein Schönheitsfehler

Nach IEC/DIN gilt: **Punkt heisst verbunden, Kreuzung ohne Punkt heisst nicht
verbunden.** Genau das unterrichtet Steven.

- Verbindungspunkt als ausgefüllter Punkt, Durchmesser etwa das Doppelte der
  Leitungsbreite
- Kreuzende Leitungen ohne Knoten bekommen **keinen** Punkt und bleiben
  elektrisch getrennt
- Im Beamer-Modus wächst der Punkt mit

### Abnahme

- Vier Flipflops lassen sich an eine durchgehende Taktleitung hängen, ohne
  dass eine Leitung vom Taktgeber zu jedem einzelnen gezogen werden muss
- Die Netzliste erkennt alle vier als denselben Knoten — als Test
- Zwei sich kreuzende Leitungen ohne Knoten bleiben getrennt — als Test
- Knoten verschieben, Knoten löschen mit Zusammenführen: beides geprüft
- Rückgängig und Wiederholen umfassen auch Knotenpunkte
- Eine gespeicherte Datei mit Knoten lädt identisch zurück

---

## Paket 2 — Anzeigen auffindbar machen

**Stevens Beobachtung:** «Die Anzeigen sind nicht intuitiv zum Verwenden.
Beispielsweise habe ich einen Zähler gebaut, welcher zählt und ich möchte den
Zeitverlauf sehen, wie dieser läuft, sprich die Ausgänge der Lampen. Das geht
auch noch nicht oder ich bin doof beim Bedienen.»

**Es geht — aber er hat es nicht gefunden.** Das ist ein Fehler der Software.
Heute braucht es: Werkzeug «Messen» wählen, dann Ziel einstellen, dann im
Schaltplan klicken. Wer «Bauen» aktiv hat, bekommt keinen Hinweis darauf.

### Was gebaut wird

**Leere Anzeigen erklären sich selbst.** Ein leerer Zeitverlauf, ein leeres
Oszilloskop und ein leeres Bode-Fenster zeigen in ihrer Mitte, wie Signale
hineinkommen — mit dem Namen des Werkzeugs und, wo sinnvoll, einem Knopf, der
direkt auf «Messen» umschaltet.

**Aus dem Baumodus heraus erreichbar.** Rechtsklick auf einen Anschluss oder ein
Bauteil bietet im Kontextmenü an: «In den Zeitverlauf», «Ins Oszilloskop», «Ins
Bode-Diagramm». Ohne Werkzeugwechsel. Das ist der Weg, den Steven gesucht hat.

**Alles auf einmal.** Im Zeitverlauf ein Knopf «Alle digitalen Signale
aufnehmen», der sämtliche Logikanzeigen, Flipflop-Ausgänge und Zählerausgänge
der Schaltung übernimmt. Bei Stevens Zähler mit vier Lampen ist das ein Klick
statt vier.

**Aus dem Eigenschaftenfeld.** Das Feld rechts zeigt bereits «Messwerte jetzt».
Dort kommt je Grösse ein kleiner Knopf dazu, der sie in die passende Anzeige
schickt.

**Zeitverlauf sichtbar, wenn er etwas hat.** Nimmt er das erste Signal auf und
ist eingeklappt, klappt er auf.

### Überlappend oder untereinander

**Stevens Beobachtung beim Arbeiten:** Drei Digitalsignale im selben
Oszilloskop-Fenster liegen exakt übereinander — sie teilen sich dieselben
Pegel 0 V und 5 V, die Kurven verdecken sich gegenseitig.

Jedes Oszilloskop-Fenster bekommt eine Umschaltung:

- **Überlappend** — alle Kurven in einem Feld mit gemeinsamer Achse. Richtig
  zum Vergleichen von Höhe und Phase, etwa Eingang gegen Ausgang eines Filters.
- **Untereinander** — jedes Signal in einer eigenen Spur mit eigener Höhenachse,
  gemeinsame Zeitachse. Richtig für Digitalsignale und für analoge Signale sehr
  unterschiedlicher Grösse.

Die Spurhöhe passt sich der Fensterhöhe und der Anzahl Signale an. Jede Spur
trägt links ihren Namen in der Farbe der Kurve. Bei Digitalsignalen wird die
Höhenachse zu einer schlichten Beschriftung 0 und 1 statt einer Voltskala.

**Vorauswahl nach Inhalt:** Beim ersten Signal entscheidet das Fenster selbst —
digitale Signale untereinander, analoge überlappend. Sobald Steven von Hand
umschaltet, bleibt seine Wahl für dieses Fenster bestehen.

Dieselbe Umschaltung bekommt das Zeitverlaufsdiagramm, damit beide Anzeigen
gleich bedient werden.

### Abnahme

- Browser-Test: Zähler mit vier Logikanzeigen bauen, **ohne Werkzeugwechsel**
  per Rechtsklick alle vier in den Zeitverlauf bringen, Kurven laufen
- «Alle digitalen Signale aufnehmen» findet bei Stevens Zähler genau die
  Ausgänge und nicht die Versorgungsleitungen
- Jede leere Anzeige zeigt ihren Hinweistext
- Vier Digitalsignale untereinander: jede Spur ist einzeln lesbar, keine
  verdeckt eine andere; umschalten auf überlappend und zurück ändert die
  aufgenommenen Signale nicht
- Ein Fenster, das zuerst ein Digitalsignal bekommt, startet untereinander;
  eines mit einem analogen Signal startet überlappend

---

## Paket 3 — Beispiel für jedes Bauteil

**Stevens Wunsch:** «Bei den Beispielen für jedes Gatter, Flipflop oder Zähler
eine Beispielschaltung, wo man direkt öffnen kann und sieht wie das
funktioniert.»

Je Bauteil eine kleine, lauffähige Schaltung, die zeigt, was es tut. Nicht
Erklärtext, sondern eine Schaltung, die man anfassen kann.

### Kategorien

Das Menü «Beispiele» wird in **Kategorien** gegliedert, benannt und geordnet wie
die Bauteilleiste, damit beides zusammenpasst:

**Logik** · **Flip-Flops** · **Zähler** · **Anzeigen** · **Analog** ·
**Anwendungen**

| Kategorie | Beispiele |
|---|---|
| Logik | UND, ODER, NICHT, NAND, NOR, XOR, XNOR — je mit Pegelschaltern an den Eingängen und Logikanzeige am Ausgang. Dazu zwei zusammengesetzte: `A = e1 ( e2 v e3 )` und ein Beispiel zu De Morgan |
| Flip-Flops | RS, D, T, JK, JK-MS — mit Taktgeber, Pegelschaltern, Anzeigen an Q und Q̄, preSet und preClear erreichbar |
| Zähler | asynchron, synchron, BCD, Johnson, Modulo-n — mit Taktgeber, Anzeigen je Bit, Zeitverlauf schon eingerichtet |
| Anzeigen | Siebensegment mit BCD-Dekoder, Logikanzeige, Pegelschalter |
| Analog | Spannungsteiler, RC-Glied, RL-Glied, Schwingkreis, Diode, Z-Diode als Begrenzer, Transistor als Schalter |
| Anwendungen | Digitaluhr (bereits vorhanden), Lauflicht, Codeschloss |

Jede Kategorie ist im Menü eine eigene Gruppe mit Überschrift. Beim Öffnen
zeigt jedes Beispiel seinen Namen und den einen erklärenden Satz.

### Regeln für jedes Beispiel

- **Läuft sofort.** Öffnen, Simulation startet, man sieht etwas passieren.
- **Anzeigen schon eingerichtet.** Beim Zähler ist der Zeitverlauf bereits
  gefüllt, beim RC-Glied das Oszilloskop.
- **Ein Satz Erklärung** im Beispiel selbst, als Textelement aus Paket 6.
- **Klein.** Nur das Bauteil, um das es geht, und was zum Betrieb nötig ist.
- **Aufgeräumt.** Keine Leitung kreuzt unnötig.

Das Menü «Beispiele» wird nach denselben Gruppen gegliedert wie die
Bauteilleiste, damit beides zusammenpasst.

### Abnahme

- Jedes Bauteil aus der Leiste hat sein Beispiel — als Test, der die Leiste
  gegen die Beispielliste prüft, damit später kein Bauteil ohne Beispiel bleibt
- Jedes Beispiel lädt, startet und zeigt nach zwei Sekunden Simulation einen
  anderen Zustand als beim Start
- Gatter-Beispiele: alle Eingangskombinationen durchschalten ergibt die
  Wahrheitstabelle des Gatters

---

## Paket 4 — Gitternetz

**Stevens Wunsch:** «Eine Option, wo man feine Gitternetzlinien aktivieren kann,
welches zur Positionierung hilft.»

- Umschaltbar über Ansicht-Menü und Tastenkürzel
- Drei Stufen: aus, Punkte, Linien
- Rasterweite einstellbar, Standard passend zum Fangraster
- Feine Linien, so hell, dass sie die Schaltung nicht stören; im Beamer-Modus
  und beim Drucken ausgeblendet, sofern nicht ausdrücklich gewünscht
- Die Einstellung bleibt über Sitzungen erhalten

### Abnahme

- Alle drei Stufen sichtbar unterschiedlich, Rasterweite wirkt
- Export und Druck enthalten das Gitter nicht, solange es nicht angehakt ist
- Einstellung überlebt das Neuladen

---

## Paket 5 — Zeichnungsrahmen und A4-Druck

**Stevens Wunsch:** «Einen Zeichnungsrahmen aktivieren, welcher hilft den
A4-Druckbereich festzuhalten und beim Drucken die Schaltung mit Zeichnungsrahmen
gedruckt wird.»

Er baut Übungs- und Prüfungsunterlagen nach Firmenvorlage. Der Rahmen ist
Arbeitsmittel, nicht Zierde.

- **Rahmen einblenden:** A4 hoch, A4 quer, A3 quer. Der Bereich ist auf der
  Zeichenfläche sichtbar begrenzt, was ausserhalb liegt, wird beim Drucken
  nicht erfasst und ist erkennbar gekennzeichnet.
- **Schriftfeld** unten rechts, ausfüllbar: Titel der Schaltung, Name, Datum,
  Blattnummer, Änderungsstand. Felder leer lassen können.
- **Drucken** gibt genau diesen Bereich aus, mit Rahmen und Schriftfeld,
  schwarzweiss, saubere Linienstärken.
- **Export** als SVG und PNG wahlweise mit oder ohne Rahmen.
- Die Rahmeneinstellung gehört zur Schaltung und wird mitgespeichert.

### Mehrseitiges PDF: Schaltung und Herleitung

**Stevens Wunsch:** «Die Druckversion soll die Schaltung, die Boolesche Algebra,
KV-Diagramm auf PDF drucken können, und zwar Seite 1 Schaltung, und Seite zwei
soll anwählbar sein, was dazu gedruckt wird — Boolesche Algebra, KV-Diagramm,
Oszilloskop, sodass die nachvollzogen werden kann.»

Damit wird aus dem Druck ein Unterrichtsdokument statt eines Bildes.

**Der Entwurf ist in Anhang A dieses Auftrags beschrieben** — Masse, Felder und
Aufteilung der drei Blätter. Danach bauen; Abweichungen in
`ENTSCHEIDUNGEN_STUDIO.md` vermerken. (Steven hat den Entwurf gezeichnet
gesehen und freigegeben; die Zeichnung selbst liegt ausserhalb des
Repositorys.)

**Seite 1 ist immer die Schaltung**, im Zeichnungsrahmen mit Schriftfeld.

**Für die Folgeseiten wird ausgewählt**, was mitgedruckt wird:

- Wahrheitstabelle
- Boolescher Ausdruck mit Minimalform, in Stevens Schreibweise (Paket 9 des
  Nachtauftrags): ODER als `v`, UND durch Nebeneinanderstellen, NICHT als
  Überstreichung, Eingänge `e1, e2, e3`, Ausgang `A`
- KV-Diagramm mit eingezeichneten Gruppen und beschrifteten Gruppen
- Oszilloskop-Kurven, so wie sie gerade stehen
- Zeitverlauf
- Stückliste

Die Auswahl bestimmt die Reihenfolge; passt nicht alles auf eine Seite, wird
umbrochen. Die Seitenzahl im Schriftfeld zählt mit («2 / 3»).

**Zwei Fassungen**, umschaltbar im selben Dialog:

- **Lösung** — alles ausgefüllt
- **Aufgabe** — Tabelle, Ausdruck und KV-Diagramm bleiben als leere Vordrucke
  zum Ausfüllen von Hand, mit denselben Zeilen und Feldern

Damit druckt Steven aus einer Schaltung beides: das Arbeitsblatt und das
Lösungsblatt.

**Herleitung nur, wo sie Sinn ergibt.** Wahrheitstabelle, Ausdruck und
KV-Diagramm setzen eine reine Logikschaltung mit erkennbaren Eingängen und
Ausgängen voraus. Bei einer Analogschaltung oder einem Zähler mit Rückführung
sind diese Punkte im Dialog ausgegraut, mit Begründung in einem Satz — nicht
still ausgeblendet.

### Abnahme

- Druckausgabe einer Schaltung mit Rahmen auf A4 hoch und quer, Rahmen und
  Schriftfeld vollständig, nichts abgeschnitten
- Ein Bauteil ausserhalb des Rahmens erscheint im Druck nicht und wird auf dem
  Bildschirm als ausserhalb erkennbar
- Schriftfeld-Inhalte überleben Speichern und Laden
- Das Beispiel `A = e1 ( e2 v e3 )` ergibt ein zweiseitiges PDF: Seite 1 die
  Schaltung, Seite 2 Wahrheitstabelle, Ausdruck und KV-Diagramm. Inhaltlich
  geprüft: die Tabelle stimmt mit der Schaltung, die Minimalform mit der
  Tabelle, die Gruppen im KV-Diagramm mit der Minimalform
- Dieselbe Schaltung als «Aufgabe» gedruckt: dieselben Felder, leer
- Seitenzahlen im Schriftfeld stimmen mit der tatsächlichen Seitenzahl
- Bei einer Analogschaltung sind die Logik-Punkte ausgegraut und begründet

---

## Paket 6 — Text, Linien, Rahmen, Farbe

**Stevens Wunsch:** «Allgemeine Elemente hinzufügen können, wie Text, Linien,
Rahmen, und dies auch farbig möglich.»

Zeichenelemente ohne elektrische Bedeutung — für Beschriftungen, Hervorhebungen
und Gruppierungen in Unterrichtsunterlagen.

- **Text:** frei platzierbar, Grösse und Farbe einstellbar, mehrzeilig
- **Linie und Pfeil:** Stärke, Farbe, Strichart durchgezogen oder gestrichelt
- **Rechteck und Ellipse:** Rand und Füllung getrennt einstellbar, Füllung auch
  durchscheinend, damit darunterliegende Teile lesbar bleiben
- **Farbpalette:** eine überschaubare Auswahl aus der Farbwelt des Studios, dazu
  freie Farbwahl

Die Elemente liegen in einer eigenen Ebene. Sie werden nie simuliert, tauchen
nicht in Netzliste oder Stückliste auf und stören das Rechnen nicht. Sie lassen
sich gemeinsam ein- und ausblenden — nützlich, wenn aus einer beschrifteten
Lösung eine unbeschriftete Aufgabe werden soll.

Vorne und hinten anordnen, Rückgängig gilt auch hier.

### Abnahme

- Alle Elementarten anlegen, verschieben, in Grösse ändern, färben, löschen
- Eine Schaltung mit Zeichenelementen rechnet identisch wie ohne — als Test
  über die Netzliste
- Elemente überleben Speichern und Laden, erscheinen in Druck und Export
- Ein- und Ausblenden der Ebene wirkt
- Stückliste enthält keine Zeichenelemente

---

## Hinweis zur Reihenfolge

Paket 1 und 2 sind die beiden, an denen Steven beim Arbeiten hängengeblieben
ist — die zuerst. Paket 3 ist der grösste Nutzen für den Unterricht, aber auch
das meiste Stückwerk; es kann unterbrochen und fortgesetzt werden, ohne dass
etwas Halbfertiges stehenbleibt.

Paket 4 bis 6 gehören inhaltlich zusammen: Sie machen aus dem Simulator ein
Werkzeug, mit dem sich Unterrichtsunterlagen herstellen lassen. Paket 5 baut auf
Paket 6 auf, weil das Schriftfeld dieselbe Textdarstellung nutzt.

---

# Anhang A — Entwurf der Druckblätter

Steven hat diesen Entwurf gesehen und freigegeben. Masse in Bildpunkten bei
96 dpi, also A4 hoch = 794 × 1123.

## A.1 Druckdialog

Fenster 560 breit, Kopf «Drucken» mit dem Dateinamen rechts, darunter drei
Abschnitte, unten eine Fussleiste.

| Abschnitt | Inhalt |
|---|---|
| **Blatt** | Drei Knöpfe nebeneinander: A4 hoch (vorgewählt), A4 quer, A3 quer. Darunter ein Ankreuzfeld «Zeichnungsrahmen und Schriftfeld drucken», angehakt |
| **Seiten** | Zeile 1 hervorgehoben: Kreis mit «1», Titel «Schaltung», darunter klein «Immer dabei». Zeile 2: Kreis mit «2», Titel «Herleitung — auswählen, was dazu kommt», darunter sechs Ankreuzfelder in dieser Reihenfolge: Wahrheitstabelle ✓, Boolescher Ausdruck und Minimalform ✓, KV-Diagramm mit Gruppen ✓, Oszilloskop-Kurven, Zeitverlauf, Stückliste. Darunter ein Hinweis mit Info-Zeichen: «Passt nicht alles auf eine Seite, wird umbrochen. Die Reihenfolge ist die der Liste.» |
| **Fassung** | Zwei Knöpfe: Lösung (vorgewählt), Aufgabe (leer). Darunter: «Bei ‹Aufgabe› bleiben Tabelle, Ausdruck und KV-Diagramm leer zum Ausfüllen von Hand.» |
| **Fuss** | Links die Seitenzahl («2 Seiten»), rechts: Abbrechen · Vorschau · **PDF erzeugen** |

## A.2 Seitenaufbau, für alle Druckseiten gleich

| Grösse | Wert |
|---|---|
| Blattrand bis Rahmen | 38 |
| Rahmenlinie | 2 durchgezogen, schwarz |
| Rahmen bis Inhalt | 20 (also 58 ab Blattrand) |
| Höhe Schriftfeld | 112, sitzt unten im Rahmen |
| Inhaltsbereich endet | 170 über dem Blattrand |

**Kopfzeile des Inhalts:** Titel der Schaltung, fett, 19; rechtsbündig daneben
eine Kurzangabe (auf Seite 1 der Ausdruck, auf Folgeseiten «zur Schaltung auf
Blatt 1»); darunter eine durchgezogene Linie.

**Schriftfeld** in drei Spalten, getrennt durch senkrechte Linien:

| Spalte | Breite | Felder |
|---|---|---|
| links | 1fr | Titel (fett, 13,5), Thema |
| Mitte | 1fr | Name, Datum, Klasse, Änderung — als 2 × 2 |
| rechts | 170 | Blatt «1 / 2» gross in Monospace, darunter klein das Zeichen und «Digital Quest Studio» |

Jedes Feld trägt über dem Wert seine Bezeichnung in 9,5, Grossbuchstaben,
leicht gesperrt, grau. Leere Felder bleiben leer, die Bezeichnung bleibt
stehen.

## A.3 Seite 1 — Schaltung

Die Schaltung sitzt mittig im Inhaltsbereich und wird so skaliert, dass sie
hineinpasst, ohne zu verzerren (seit 15.10.2026: auch vergrössernd, bis auf
5 % Rand; die frühere Regel «nie über die natürliche Grösse» war falsch,
siehe `KORREKTUR_DRUCK.md`). Darunter, linksbündig, ein Absatz mit höchstens 60 Zeichen
je Zeile: ein bis zwei Sätze, was die Schaltung tut.

Alles schwarz auf weiss. Gattersymbole nach IEC mit `&`, `≥1`, `1`.
Anschlussbezeichner (U1, U2) klein und grau an den Leitungen.

## A.4 Seite 2 — Herleitung

Überschrift «Herleitung». Darunter zwei Spalten nebeneinander: links
**Wahrheitstabelle** in fester Breite 300, rechts das **KV-Diagramm**, Abstand
32.

**Wahrheitstabelle:** volle Rahmenlinien um jede Zelle, Kopfzeile grau
hinterlegt, Werte zentriert in Monospace. Zeilen mit Ergebnis 1 leicht grau
hinterlegt, der Ergebniswert fett.

**KV-Diagramm:** Zellen 60 × 60 mit 1,5 starkem Rahmen. Spaltenköpfe im
Gray-Code (00, 01, 11, 10) über den Spalten, darüber klein die Variablen
(«e2 e3»); Zeilenköpfe links, daneben klein die Variable («e1»). Gruppen als
abgerundete Rechtecke um die zusammengefassten Zellen, 2 stark; mehrere Gruppen
unterscheiden sich durch Strichart (durchgezogen, gestrichelt), **nicht durch
Farbe allein** — der Druck ist schwarzweiss. Jede Gruppe trägt ihre
Bezeichnung (`e1e3`, `e1e2`) ausserhalb des Rasters, nahe bei ihr.

**Darunter der boolesche Ausdruck**, als drei Zeilen mit Beschriftung links in
fester Breite 180 und dem Ausdruck rechts in Monospace 15:

| Beschriftung | Beispielinhalt |
|---|---|
| Aus der Tabelle | `A = e1 ē2 e3 v e1 e2 ē3 v e1 e2 e3` (Negation als Überstreichung) |
| Aus dem KV-Diagramm | `A = e1e3 v e1e2` |
| Ausgeklammert | `A = e1 ( e2 v e3 )` — fett, mit Trennlinie darüber |

Zum Schluss ein Absatz, der den benutzten Rechenschritt benennt (hier: das
konjunktive Distributivgesetz) und sagt, was er einspart.

**Bei «Aufgabe»** bleiben dieselben Gerüste stehen: Tabelle mit allen Zeilen
und leerer Ergebnisspalte, leeres KV-Raster mit Köpfen, die drei
Ausdruckszeilen mit Beschriftung und leerer rechter Seite.

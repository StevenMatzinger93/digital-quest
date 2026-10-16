# Auftrag: Lernpfad Digitaltechnik — Digital Quest Studio

**Branch:** `wip/studio`. **Niemals nach `main`.**
Es gelten weiter: `AUFTRAG_STUDIO.md` Abschnitt 2, 5 und 6.

Aus dem Simulator wird eine Lernumgebung: Stevens Kurs Digitaltechnik als
geführter Weg durch das Werkzeug, mit Aufgaben, die die Software selbst prüft.

---

## 1. Woher der Inhalt kommt

Grundlage sind **Stevens eigene Kursunterlagen**:

- `Digitaltechnik stationäre Vorgänge V4` (Kombinatorik) und die Lösungsfassung
- `Digitaltechnik zeitabhängige Vorgänge V3` (Flipflops, Zähler, Speicher) und
  die Lösungsfassung
- `Gesetze der Bool'schen Algebra`

Die Gliederung in Abschnitt 4 ist aus diesen Dokumenten abgeleitet, nicht
erfunden.

**Festo-Lehrmittel:** `Grundlagen Digitaltechnik` (FestoLX) ist lizenziertes
Material und liegt als Bilddatei ohne Text vor. Es wird **nicht übernommen**.
Wo ein Kapitel dort behandelt wird, steht im Lernpfad ein Hinweis in der Art
«vertieft in FestoLX, Grundlagen Digitaltechnik» — ein Verweis, kein Inhalt.

---

## 2. Stevens Schreibweise — verbindlich

Aus den Unterlagen übernommen. Wo das Studio heute anders schreibt, wird es
angepasst.

| Begriff | Stevens Schreibweise | Studio heute |
|---|---|---|
| Ausgang vorher | **AV** | Qₙ |
| Ausgang danach | **A** | Qₙ₊₁ |
| Eingänge allgemein | **e1, e2, e3** | — |
| Ausgang allgemein | **A** | — |
| ODER | `v` | — |
| UND | Nebeneinanderstellen | — |
| NICHT | Überstreichung | — |
| Vorrang | UND vor ODER | — |

**Ansteuertabelle** hat bei Steven die Spalten `AV | A | <Eingänge>`,
**Analysetabelle** die Spalten `<Eingänge> | Q` beziehungsweise `| A`.

Beim NOR-Flipflop heissen die Eingänge `e1`, `e2`; bei den benannten
Flipflops die üblichen Buchstaben T, D, R, S, J, K.

**Zu ändern:** Der Bauteil-Inspektor und die gedruckten Tabellen verwenden ab
jetzt `AV` und `A` statt `Qₙ` und `Qₙ₊₁`. Das ist der Punkt, den Steven prüfen
wollte — er ist damit beantwortet.

---

## 3. Was die Software prüfen kann, und was nicht

Das ist der Kern des Ganzen: Der Simulator kann Lösungen **selbst
nachrechnen**, statt nur eine Musterlösung anzuzeigen.

| Aufgabenart | Prüfung |
|---|---|
| Tabelle ausfüllen (Dez/Dual/Hex, Wahrheitstabelle, Analysetabelle, Ansteuertabelle) | Feld für Feld gegen die berechnete Lösung |
| Ausdruck vereinfachen | **logische Gleichwertigkeit** über alle Eingangskombinationen, dazu Zahl der Terme und Buchstaben gegen die Minimalform |
| Schaltung bauen, die eine Wahrheitstabelle erfüllt | alle Eingangskombinationen durchschalten, Ausgänge vergleichen |
| Schaltung nur mit NAND | Funktion wie oben, zusätzlich: nur erlaubte Bauteiltypen verwendet |
| Schaltung mit vorgegebenen ICs | zusätzlich: Zahl der Gatter je Typ eingehalten |
| KV-Diagramm | Gruppen gegen die eigene Berechnung, Minimalform gegen Quine-McCluskey |
| Zeitverhalten (Zähler, Flipflop) | Ausgangsfolge über n Takte gegen die Sollfolge |

**Was die Software nicht prüfen kann** und wo sie das auch sagt:

- **Messungen am Elektronik-Experimenter** (TTL/CMOS, Ua = f(Ue) an 7400,
  74LS00, 74HC00, 4011; Datenblattwerte). Das ist Laborarbeit und bleibt es.
  Die Software stellt dafür ein **Messprotokoll** bereit: dieselbe Tabelle wie
  im Arbeitsblatt, zum Eintragen, Speichern und Ausdrucken. Als erledigt
  markiert der Lernende sie selbst.
- **Zustandsfolgediagramme von Hand zeichnen.** Die Software zeigt nach dem
  Abgeben das eigene Diagramm des Flipflops zum Vergleich; bewertet wird nicht.

Eine Station, die nicht automatisch prüfbar ist, wird **deutlich als solche
gekennzeichnet**. Keine Scheinprüfung.

---

## 4. Der Lernpfad

Zwei Teile, wie Stevens Unterlagen. Jede Station hat eine Nummer, einen Namen,
eine kurze Einführung, Aufgaben und eine Abschlussbedingung.

### Teil A — Stationäre Vorgänge

| Nr. | Station | Aufgaben |
|---|---|---|
| A1 | Zahlensysteme | Tabelle Dezimal / Dual / Hexadezimal, 16 Zeilen, ohne Rechner |
| A2 | Logikfamilien TTL und CMOS | **Laborstation.** Datenblattwerte 7400 und 4027 eintragen; Ua = f(Ue) an vier ICs messen. Messprotokoll in der Software, Messung am Experimenter |
| A3 | Beschaltungsregeln | Nie Ausgang gegen Ausgang, keine offenen Eingänge. Kurze Prüffragen; dazu zwei Schaltungen, in denen der Fehler zu finden ist |
| A4 | Symbolik | Tabelle: Gatter in neuer DIN-Norm, alter DIN-Norm und US-Darstellung zuordnen |
| A5 | Die acht Gatter | Je Gatter: Wahrheitstabelle ausfüllen, booleschen Ausdruck angeben, Schaltung bauen und prüfen lassen. Trennstufe, NOT, AND, NAND, OR, NOR, XOR, XNOR |
| A6 | Positive und negative Logik | Zuordnungstabelle; eine Schaltung in beiden Auffassungen lesen |
| A7 | DNF und KNF | Förderband mit zwei Tastern: aus der Wahrheitstabelle beide Formen herleiten und **beide Schaltungen bauen**. Die Software prüft, dass beide dieselbe Funktion erfüllen |
| A8 | Boolesche Algebra | Gesetze mit Wahrheitstabellen nachweisen (Kommutativ, Assoziativ, Distributiv, De Morgan). Dann die **Übungsserie: 18 Ausdrücke vereinfachen**, Nummer 12 und 18 freiwillig |
| A9 | Normierte Schaltungen | Eine Schaltung nur mit NAND aufbauen. Zweite Aufgabe: mit je einem 74HC02 und 74HC08 auskommen |
| A10 | KV-Diagramm | **13 Ausdrücke in m4-Schreibweise** vereinfachen, Nummer 7 bis 13 freiwillig. Gruppen im Diagramm einzeichnen, Minimalform angeben, Schaltung bauen |
| A11 | Code und Codewandler | BCD, 3-Exzess, Gray. Wahrheitstabelle Anfangscode → Endcode, vereinfachen, Schaltung bauen. Pflicht: 3-Exzess nach BCD |
| A12 | Kontrollinstanzen | Paritätsbitersteller und -auswerter bauen. Hamming-Code als Zusatz |
| A13 | Datenkoordination | Multiplexer, Demultiplexer, Komparator, 4-Bit-Komparator, Halbaddierer, Volladdierer, Vollsubtrahierer — je bauen und prüfen lassen |

### Teil B — Zeitabhängige Vorgänge

| Nr. | Station | Aufgaben |
|---|---|---|
| B1 | NOR-Flipflop | Wahrheitstabelle, Analysetabelle, Ansteuertabelle, Zustandsfolgediagramm. Schaltung aus zwei NOR-Gattern selbst bauen |
| B2 | NOR-AND-Flipflop | wie B1, mit der getakteten Fassung |
| B3 | Steuerungsarten | Taktzustand gegen Taktflanke, positiv und negativ; preSet und preClear. Im Zeitverlauf zeigen |
| B4 | T-Flipflop | Analysetabelle, Zustandsfolgediagramm, Ansteuertabelle. Frequenzhalbierung im Zeitverlauf nachweisen |
| B5 | D-Flipflop | wie B4 |
| B6 | RS-Flipflop | wie B4, dazu der unzulässige Zustand |
| B7 | JK-Flipflop | wie B4, dazu JK-MS und das Problem des «1s-Catching» |
| B8 | Asynchroner Dualzähler | Aus Flipflops bauen, Zählfolge im Zeitverlauf prüfen, **Laufzeit sichtbar machen** |
| B9 | Digitale Uhr | Die Abnahme des ganzen Pfades: Sekundenzähler 0–59 mit zwei Siebensegmentanzeigen, selbst gebaut |
| B10 | Synchroner Dualzähler | Bauen, Unterschied zum asynchronen im Zeitverlauf zeigen |
| B11 | Synchroner Dezimalzähler | BCD-Zähler, Rücksetzung bei 10 |
| B12 | Spezial- und Johnson-Zähler | Modulo-n frei wählbar, Johnson-Zähler bauen |
| B13 | Speicher | Übersicht und Organisation. Überwiegend Theorie mit Prüffragen |

**Reihenfolge:** A1 bis A13, dann B1 bis B13. Eine Station öffnet sich, wenn
die vorige abgeschlossen ist. **Steven kann jede Station für seine Klasse
freischalten**, unabhängig vom Fortschritt — er bestimmt das Tempo, nicht die
Software.

---

## 5. Wie eine Station aussieht

- **Kopf:** Nummer, Name, ein bis zwei Sätze, worum es geht, Verweis aufs
  Lehrmittel
- **Aufgaben** einzeln, jede mit eigenem Zustand: offen, in Arbeit, richtig,
  falsch
- **Arbeitsfläche:** je nach Art eine Tabelle, ein Eingabefeld für den
  Ausdruck, ein KV-Raster oder der volle Schaltplan-Editor
- **«Prüfen»** gibt eine Rückmeldung in einem Satz, die sagt, *was* falsch ist,
  nicht nur *dass*: «Die Zeile für e1 = 1, e2 = 0 stimmt nicht» statt «falsch»
- **Lösung zeigen** gibt es nach zwei Fehlversuchen, deutlich gekennzeichnet
- **Abschluss:** alle Pflichtaufgaben richtig; freiwillige zählen nicht mit

Der Schaltplan-Editor ist in einer Aufgabe derselbe wie sonst, mit zwei
Einschränkungen: Die Bauteilleiste zeigt nur, was die Aufgabe erlaubt, und der
Auftragstext steht daneben.

---

## 6. Fortschritt und Lernerfolg

**Stufe 1 — ohne Anmeldung.** Der Fortschritt liegt im Browser des Lernenden.
Ausserdem: als Datei ausgeben und wieder einlesen, damit er ihn mitnehmen oder
abgeben kann. Zugriffe auf den Browserspeicher immer in try/catch, die Seite
muss auch ohne funktionieren.

**Stufe 2 — mit dem Portal.** Digital Quest hat bereits Konten, Klassen,
Fortschritt und einen Leitstand für Dozenten (`worker/index.js`,
`portal_leitstand.js`). Wer angemeldet ist, bekommt seinen Lernpfad-Fortschritt
dorthin gespiegelt; Steven sieht im Leitstand, wo seine Klasse steht — je
Station und je Aufgabe.

Das Studio bleibt **ohne Anmeldung voll benutzbar**. Die Anmeldung fügt nur die
Sichtbarkeit für den Dozenten hinzu.

Stufe 2 wird erst gebaut, wenn Stufe 1 steht und Steven sie gesehen hat.

---

## 7. Abnahme

**Je Station:** Ein Test, der die Musterlösung einspielt und prüft, dass die
Station sie als richtig annimmt, und eine falsche Lösung, dass sie sie
ablehnt. Für alle 26 Stationen.

**Fachlich:** Jede Wahrheitstabelle, jede Minimalform und jede Zählfolge im
Lernpfad wird gegen eine unabhängige Berechnung geprüft, nicht gegen die
Eingabe des Autors. Bei den Vereinfachungsaufgaben heisst das: Quine-McCluskey
gegen die hinterlegte Lösung.

**Fortschritt:** Station abschliessen, Seite neu laden, Fortschritt ist da.
Ausgeben und wieder einlesen ergibt denselben Stand.

**Digitaluhr (B9):** Ein Lernender, der den Pfad von A1 durchgearbeitet hat,
hat alle Bauteile freigeschaltet, die er dafür braucht. Als Test über die
Abhängigkeiten geprüft.

---

## 8. Was Steven prüfen muss

Hier ist sein Urteil nötig, der Agent kann es nicht ersetzen:

- **Die Aufgabentexte.** Sie sind aus den Arbeitsblättern abgeleitet, aber neu
  formuliert für den Bildschirm. Steven liest sie gegen.
- **Die Schwierigkeitsreihenfolge.** Ob A8 vor A10 richtig ist, weiss er aus
  dem Unterricht.
- **Welche Aufgaben Pflicht sind und welche freiwillig.** Der Vorschlag folgt
  den Hinweisen in den Arbeitsblättern (Boolesche Algebra 12 und 18, KV 7 bis
  13), aber das kann er anders wollen.
- **Die Rückmeldungstexte.** Ob sie helfen oder bevormunden.
- **Die Laborstationen.** Ob das Messprotokoll in der Software den Zettel
  wirklich ersetzen kann.

---

## 9. Reihenfolge des Bauens

1. **Gerüst:** Lernpfad als eigener Bereich, Stationsliste, Fortschritt lokal,
   eine Station vollständig als Muster — **A5, die acht Gatter**, weil sie alle
   drei Aufgabenarten enthält (Tabelle, Ausdruck, Schaltung)
2. **Prüfmaschine:** die sieben Prüfarten aus Abschnitt 3, jede mit Tests
3. **Teil A** vollständig
4. **Teil B** vollständig
5. **Schreibweise** AV/A durchgängig, auch im Inspektor und im Druck
6. **Laborstationen** mit Messprotokoll

Nach Schritt 1 anhalten und Steven das Muster zeigen. Alles Weitere baut
darauf auf; wenn die Form nicht stimmt, ist es besser, das nach einer Station
zu merken als nach sechsundzwanzig.

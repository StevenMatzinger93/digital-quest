# Auftrag für Claude Code: Glättung mit dem Ladekondensator sichtbar machen (06.10.2026)

Repo: `StevenMatzinger93/digital-quest`, Stand `main` = `6af9991` (06.10.2026). Diese Datei liegt als `docs/AUFTRAG_GLAETTUNG_KONDENSATOR_2026-10-06.md` im Repo.
Grundlage: Rückmeldung von Steven vom 06.10.2026 zu Aufgabe 16.7. Steven stuft das Thema als **sehr wichtig** ein.

**Prompt zum Einfügen in Claude Code:**

> Lies `CLAUDE.md`, `docs/STAND.md` und `docs/AUFTRAG_GLAETTUNG_KONDENSATOR_2026-10-06.md`. Beginne mit K0 (Befund, Zahlen nachrechnen, Engine-Fehler nachstellen) und berichte kurz. Setze danach K1 bis K5 in dieser Reihenfolge um. Arbeite auf dem Branch `wip/glaettung`, nach jedem Paket alle Tests grün und `docs/STAND.md` nachführen, erst mit grünem Validator nach `main`.

---

## 1. Meldung

> «Muss beim Brückengleichrichter mit Kondensator die Welle so aussehen? Sieht ein wenig komisch aus. Habe eine eher geglättete DC-Spannung erwartet.»

Stevens Bild (16.7, S1 zu): CH1 `R1.a` gegen `R1.b`, max 8,581 V, min 4,477 V, Mittelwert 6,654 V, Periode 10 ms. Auf dem Schirm ein kräftiger Sägezahn.

## 2. Fachlicher Hintergrund

**Die Kurve in 16.7 ist richtig, der Kondensator ist nur zu klein, um zu glätten.**

- Der Brückengleichrichter liefert alle 10 ms einen Buckel (100 Hz bei 50 Hz Netz).
- Der Ladekondensator lädt sich im Scheitel auf Û − 2 · U_F ≈ 8,6 V und entlädt sich bis zum nächsten Buckel über die Last R1.
- Entscheidend ist die Zeitkonstante **τ = R · C** im Vergleich zum Buckelabstand von 10 ms. In 16.7 ist τ = 1 kΩ · 10 µF = 10 ms, also gleich gross wie der Buckelabstand. Die Spannung fällt deshalb auf 8,58 V · e^(−0,65) ≈ 4,5 V, bevor der nächste Buckel nachlädt.
- Glättung entsteht erst bei τ ≫ 10 ms.
- Faustformel für die Welligkeit (Spitze-Spitze): **ΔU ≈ I / (2 · f · C)** mit I = U_DC / R und f = 50 Hz. Sie gilt nur für τ ≫ 10 ms und liefert etwas zu grosse Werte, weil die Entladung kürzer als 10 ms dauert.
- Grössere Last (kleinerer R) bedeutet mehr Strom und damit mehr Welligkeit.

**Sollwerte aus der Engine** (Brücke aus 16.7, Û = 10 V, 50 Hz, R1 = 1 kΩ, `E.acMeasure` an `R1.a`–`R1.b`, gerechnet am 06.10.2026 auf `6af9991`):

| C | τ = R · C | max | min | Welligkeit Spitze-Spitze | Gleichanteil | Restwelligkeit TRMS | Faustformel ΔU |
|---|---|---|---|---|---|---|---|
| ohne | – | 8,58 V | 0 V | 8,58 V | ≈ 5,0 V | ≈ 3,0 V | – |
| 10 µF | 10 ms | 8,581 V | 4,477 V | 4,10 V | 6,654 V | 1,302 V | nicht anwendbar |
| 47 µF | 47 ms | 8,573 V | 7,215 V | 1,36 V | 7,916 V | 0,410 V | 1,68 V |
| 100 µF | 100 ms | 8,553 V | 7,860 V | 0,69 V | 8,210 V | 0,208 V | 0,82 V |
| 220 µF | 220 ms | 8,505 V | 8,179 V | 0,33 V | 8,343 V | 0,098 V | 0,38 V |
| 470 µF | 470 ms | 8,459 V | 8,304 V | 0,16 V | 8,382 V | 0,046 V | 0,18 V |
| 1000 µF | 1 s | 8,429 V | 8,356 V | 0,07 V | 8,393 V | – | 0,08 V |

Die Zahlen sind in K0 nachzurechnen. In Aufgaben und Rechenwegen stehen keine fest eingetippten Sollwerte, sie kommen wie in Kapitel 16 üblich beim Laden aus `E.acMeasure`.

## 3. Was heute fehlt

1. 16.7 zeigt nur «ohne C» und «10 µF». Die Lernenden sehen nie eine geglättete Gleichspannung und erfahren nicht, wovon die Glättung abhängt.
2. Der Merksatz von 16.7 sagt zwar, dass ein grösserer Kondensator besser glättet, man kann es aber nicht ausprobieren.
3. Die Theorie T3C (neu seit 06.10.2026) erklärt Einweg, Brücke und Bezugspunkt, aber nicht die Glättung.
4. Das Oszilloskop zeigt bei kleiner Welligkeit auf der Skala 0 … 10 V eine fast gerade Linie. Das ist für «geglättet» richtig, zum Ablesen der Restwelligkeit fehlt aber eine Vergrösserung.
5. **Engine-Befund (Cowork, 06.10.2026):** `E.simulate` mit der Brücke und C = 1000 µF, `dt: 5e-5`, `tEnd: 0.04`, `settle: { t: 8, dt: 1e-4 }` bricht mit «Gleichungssystem nicht lösbar» ab (`solve` in `dev/src/engine.js`). Kürzere Läufe (0,1 s, `dt` 1e-3 bis 2e-5) und `E.acMeasure` laufen durch. Ausserdem begrenzt `scopeCurve()` das Einschwingen auf höchstens 3 s; bei 1000 µF wären 5 · τ = 5 s nötig.

---

## 4. Pakete

### K0 – Befund und Zahlen (kein Code an der Oberfläche)

1. Tabelle aus Abschnitt 2 mit der Engine nachrechnen, Abweichungen melden.
2. Engine-Fehler aus Abschnitt 3.5 nachstellen, Ursache finden (Verdacht: einzelner Zeitschritt mit schlecht konditionierter Matrix, wenn alle Dioden sperren und nur C die Last speist) und beheben. Engine-Test: Brücke mit 10 µF bis 2200 µF, Einschwingen bis 10 s, kein Abbruch, Ergebnis stimmt mit `E.acMeasure` überein.
3. Prüfen, ob die Sicherung, `imax` der Dioden oder `noFault` beim Einschalten mit grossem C ansprechen (Ladestromstoss). Falls ja: Befund und Vorschlag, bevor Aufgaben gebaut werden.
4. Ergebnis in `docs/STAND.md`, Abschnitt «Glättung (06.10.2026)».

### K1 – Neue Aufgabe 16.9 «Glättung: Wie gross muss der Ladekondensator sein?»

- **Aufbau (gesperrt, nur messen, `measureUX: 'drag'`, `rangeUX: 'manual'`):** Brücke wie 16.7, dazu **drei Kondensatoren mit je einem eigenen Schalter** parallel zu R1: C1 = 10 µF (S1), C2 = 100 µF (S2), C3 = 470 µF (S3). Keine neue Bauteilart nötig. `bench`-Layout so, dass Schalter und Kondensatoren klar zugeordnet sind (Beschriftung «S2 · zu», Wert am Kondensator).
- **Messwerte** (Tastkopf `R1.a`, Erdungsclip `R1.b`, Schalterstellungen über `set` je Messwert):
  1. je Kondensator einzeln: Gleichanteil (V⎓) und Welligkeit Spitze-Spitze (Oszilloskop),
  2. Rechenwert: τ für jeden Kondensator,
  3. Rechenwert: ΔU nach der Faustformel für 100 µF und 470 µF, zum Vergleich mit der Messung,
  4. Abschlussfrage als Rechenwert: «Welcher Kondensator ist nötig, damit die Welligkeit unter 0,5 V bleibt?» (Antwort aus der Messreihe: 470 µF; Format so wählen, dass die Prüfung eindeutig ist).
- **Texte:** `story`, `brief`, `learn`, `take`, `hint`, `hint2`, `rechenweg` (Pflicht in Kapitel 16), Einstellungs-Box, `demo` für den Vorführ-Modus (Welligkeit bei 100 µF). Kernaussage im `take`: «Glättung braucht τ = R · C viel grösser als 10 ms. 10 µF: Sägezahn, 100 µF: leichte Welle, 470 µF: fast Gleichspannung.»
- Mehrere Schalter gleichzeitig zu ist erlaubt (Kapazitäten addieren sich) und wird im `hint2` erwähnt.
- Zählt wie die übrigen Aufgaben von Kapitel 16 (keine Boss-Aufgabe, nicht für Abzeichen und Zertifikat). Karte, `tiles.js`, Wegweiser-Daten, Avatar-Meta (`AVATAR_META`, Kollektion Teil V) und Störungsszenarien berücksichtigen die neue Station.
- **16.7 bleibt inhaltlich**, bekommt aber im `take` und im Erfolgsdialog den Verweis «Weiter mit 16.9: So wird daraus eine glatte Gleichspannung».

### K2 – Last verändert die Welligkeit (Teil von 16.9 oder eigener Schritt)

- Zweiter Lastwiderstand R2 = 1 kΩ über Schalter S4 parallel zu R1 (Last 500 Ω, doppelter Strom).
- Ein Messwert: Welligkeit bei 470 µF mit doppelter Last. Erwartung: ungefähr doppelt so gross. Sollwert aus der Engine.
- Falls die Werkbank damit zu voll wird: Vorschlag an Steven, ob K2 eine eigene Aufgabe 16.10 wird.

### K3 – Oszilloskop: kleine Welligkeit ablesbar

1. Kennwert **U_ss (Spitze-Spitze)** in jeder Oszilloskop-Anzeige (Seitenleiste, Werkbank-Schirm, grosses Oszilloskop), nicht nur max und min.
2. **AC-Kopplung** je Kanal (Taste «AC/DC»): zieht den Gleichanteil ab und skaliert die Kurve neu, sodass 0,16 V Welligkeit den Schirm füllt. Die Anzeige nennt die Kopplung im Klartext («CH1 AC-gekoppelt, Gleichanteil 8,38 V abgezogen»). Standard bleibt DC.
3. Bei DC-Kopplung bleibt die Skala wie heute (0 … 10 V), damit «geglättet» auch wirklich als fast gerade Linie erscheint.
4. Einschwingen in `scopeCurve()`: Grenze von 3 s so anheben oder ersetzen, dass alle Kondensatorwerte der Aufgaben eingeschwungen dargestellt werden (Kennwerte kommen ohnehin aus `E.acMeasure`); Rechenzeit auf dem Handy messen und in STAND festhalten.
5. Handbuch «Oszilloskop» um AC/DC-Kopplung und U_ss ergänzen; Wegweiser-Text prüfen.

### K4 – Theorie und Mini-Schaltung

- **T3C erweitern** (oder, falls der Text über 2600 Zeichen käme, ein ausklappbarer Zusatzblock): Abschnitt «Glätten mit dem Ladekondensator» mit Laden im Scheitel, Entladen über die Last, τ = R · C gegen 10 ms, Faustformel und ihrer Grenze.
- **Spotlight-Mittel:** Mini-Schaltung der Brücke mit Kondensator und laufendem Oszilloskop an R1, dazu ein **Auswahlfeld oder Schieberegler für C** (ohne, 10 µF, 47 µF, 100 µF, 470 µF, 1000 µF) und ein zweiter für die Last (1 kΩ, 500 Ω, 100 Ω). Anzeige von U_DC, U_ss und τ neben der Kurve. Regel einhalten: höchstens zwei sichtbare Bilder je Lektion, weitere hinter «Bild einblenden».
- Eine Frage im Check ergänzen: «Der Kondensator wird zehnmal grösser. Was passiert mit der Welligkeit?» (ungefähr ein Zehntel). Merksatz ergänzen.
- T3C steht in Kapitel 3 (Grundstufe), 16.9 in Kapitel 16. Zusätzlich in **Kapitel 13** (Diode) prüfen, ob eine Aufgabe zur Glättung fehlt; nur Befund und Vorschlag.
- Die Prüfungsfragen entstehen aus den Lektionen: `validate_exam.js` und `test_exam_api.js` müssen grün bleiben.

### K5 – Tests und Abnahme

1. **Engine:** Test aus K0.2; dazu Welligkeit für 10 / 100 / 470 µF in den Bereichen der Tabelle (± 5 %), doppelte Last ergibt 1,7- bis 2,2-fache Welligkeit.
2. **Validator:** 16.9 vollständig (Rechenwege, `a` und `b` bei allen Oszilloskop-Messwerten, Datenblätter, Karte).
3. **`tests/tasks.js`:** 16.9 in Schaltplan und Werkbank nur über die Bedienung lösbar, auch die Schalterstellungen je Messwert.
4. **Smoke:** 16.9 öffnen, je Kondensator U_ss ablesen, AC-Kopplung ein und aus, Vorführ-Modus, T3C mit Regler (Kurve und Kennwerte ändern sich), Handy 390 px.
5. Alle übrigen Tests aus `CLAUDE.md` grün, `docs/STAND.md`, `CLAUDE.md` und `docs/THEMEN.md` nachgeführt.

---

## 5. Offene Entscheidungen für Steven (Empfehlung fett)

1. **Neue Aufgabe 16.9 oder 16.7 erweitern?** → **Neue Aufgabe 16.9.** 16.7 hat schon sechs Messwerte, und eine eigene Station macht die Glättung zum Thema.
2. **Kondensatorwerte:** 10 / 100 / 470 µF? → **Ja**, das sind gängige Werte und die Stufen Sägezahn, leichte Welle, fast glatt sind klar unterscheidbar.
3. **Umschalten:** drei Kondensatoren mit je einem Schalter, oder ein Kondensator mit einstellbarem Wert? → **Drei Schalter**, das entspricht dem echten Aufbau und braucht keine neue Bauteilart.
4. **Last-Variation (K2):** in 16.9 oder als 16.10? → **In 16.9, wenn die Werkbank übersichtlich bleibt.**
5. **AC-Kopplung am Oszilloskop (K3):** bauen? → **Ja**, sonst lässt sich eine kleine Restwelligkeit nur aus Zahlen ablesen, nicht sehen.
6. **Glättung auch in der Grundstufe als Aufgabe (Kapitel 3 oder 13)?** → **Zuerst Theorie mit Regler in T3C**, eine Grundstufen-Aufgabe erst nach deinem Blick auf den Vorschlag aus K4.

## 6. Nicht tun

- Den Kondensator in 16.7 nicht einfach vergrössern: Der Sägezahn ist dort der Lerninhalt («Zahlen verändern sich drastisch»), und die bestehenden Sollwerte bleiben gültig.
- Keine Kurve künstlich glätten. Das Oszilloskop zeigt, was die Simulation rechnet.
- Keine fest eingetippten Sollwerte, wo die Engine sie liefern kann.
- `index.html`, `web/`, `worker/gen/` nicht von Hand ändern.

## 7. Fertig heisst

16.9 ist in beiden Ansichten lösbar und zeigt Sägezahn, leichte Welle und fast glatte Gleichspannung nacheinander; U_ss und AC-Kopplung sind am Oszilloskop vorhanden; T3C erklärt die Glättung mit Regler; die Engine rechnet auch mit grossen Kondensatoren und langem Einschwingen ohne Abbruch; alle Tests grün; Doku nachgeführt.

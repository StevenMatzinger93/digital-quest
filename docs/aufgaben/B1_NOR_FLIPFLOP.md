# B1 — NOR-Flipflop: die Konvention ist belegt

Aus `Digitaltechnik_zeitabhängige_Vorgänge_V3_Lösungen_neu.docx`, Abschnitt 1.1.
Bild zum Gegenlesen: `nor_flipflop.png`.

Damit ist die offene Frage «welcher Eingang setzt» beantwortet:

> **e2 setzt. e1 setzt zurück. Bei e1 = e2 = 1 gewinnt e1, der Ausgang wird 0.**

Die Einstellung `P.KONV.norSetzen = e2` ist also richtig und bleibt.

## Aufbau

Zwei NOR-Gatter (`≥1`) über Kreuz rückgekoppelt. `e1` liegt am **oberen**
Gatter, dessen Ausgang `A` ist — deshalb setzt `e1` den Ausgang zurück. `e2`
liegt am unteren Gatter.

## Wahrheitstabelle, Spalten in dieser Reihenfolge

| e2 | e1 | AV | A |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 |
| 0 | 1 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 0 | 1 |
| 1 | 0 | 1 | 1 |
| 1 | 1 | 0 | 0 |
| 1 | 1 | 1 | 0 |

Verkürzt gelesen: `e2 e1 = 00` → speichern (A = AV) · `01` → Reset ·
`10` → Set · `11` → Reset.

## Spaltenreihenfolge der Tabellen

Das Lehrmittel ist darin nicht einheitlich, und das soll die Software
übernehmen, nicht glattbügeln:

- **Wahrheitstabelle:** `e2 | e1 | AV | A` — AV steht in der Mitte
- **Analysetabelle:** `e2 | e1 | A`
- **Ansteuertabelle:** `AV | A | e2 | e1` — AV und A stehen vorn

Zum NOR-Flipflop gehört im Lehrmittel ausserdem ein **Zustandsfolgediagramm**
mit der Aufgabe «Zeichnen Sie ein Zustandsfolgediagramm für das NOR-Flip-Flop».

## Was zu tun ist

Die Tabellen von B1 gegen diese Werte prüfen und die Spaltenreihenfolge
angleichen. Falls B1 bisher mit `e1` als Setzeingang gebaut war, umstellen —
auch in den Aufgabentexten und in der Beispielschaltung.

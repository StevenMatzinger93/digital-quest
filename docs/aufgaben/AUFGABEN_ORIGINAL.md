# Stevens Original-Übungsserien

Wörtlich aus `Digitaltechnik_stationäre_Vorgänge_V4.docx` und der zugehörigen
Lösungsfassung. **Diese Aufgaben ersetzen die selbst erfundenen Beispiele** in
den Stationen A7, A8 und A10.

Die Ausdrücke der Übungsserie Boolesche Algebra liegen im Word-Dokument als
Formelobjekte vor, nicht als Text. Sie wurden einzeln als Bild ausgelesen,
abgeschrieben und anschliessend maschinell nachgerechnet: jeder Ausdruck wurde
über alle Eingangskombinationen ausgewertet und mit Quine-McCluskey exakt
minimiert. Die Ergebnisse stehen in `boolesche_algebra.json` und
`kv_diagramm.json`.

**Steven muss die Abschrift gegenlesen.** Die Bilder dazu liegen bei
(`formeln_2-7.png`, `formeln_8-12.png`, `formeln_13-17.png`).

---

## Schreibweise

Im Lehrmittel: `v` = ODER, Nebeneinanderstellen oder `·` = UND, Überstrich =
NICHT, «UND kommt vor ODER». Eingänge heissen `e1`, `e2`, `e3`, `e4`, der
Ausgang `A`.

In den JSON-Dateien maschinenlesbar: `n(...)` = NICHT, `*` = UND, `+` = ODER.
Im KV-Teil nach der Schreibweise des Lehrmittels: `a'` = NICHT a.

---

## A7 — DNF und KNF: Förderband

> Ein Förderband (A) kann durch die Taster E1 bzw. E2 in Bewegung gesetzt
> werden. Beim Loslassen hält das Band wieder an.
>
> Erstelle die Schaltung bzw. den logischen Ausdruck für die unten aufgeführte
> Wahrheitstabelle für die beiden Möglichkeiten DNF und KNF.

| Dez | E2 | E1 | A |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 1 | 0 | 1 | 1 |
| 2 | 1 | 0 | 1 |
| 3 | 1 | 1 | 1 |

Vorgehen, wie im Lehrmittel formuliert:

1. **DNF** — Schaltung nach positiver Logik am Ausgang: Wenn A = 1 die Eingänge
   «verunden» und den Term mit jeder weiteren Möglichkeit «verodern».
2. **KNF** — Schaltung nach negativer Logik am Ausgang: Wenn A = 0 die Eingänge
   «verodern» und jeden weiteren Ausgangsterm «verunden» (Klammern setzen).
   Zudem werden alle Eingänge negiert.

Lösung: DNF = `n(E2)*E1 + E2*n(E1) + E2*E1`, KNF = `(E2 + E1)`.

Diese Aufgabe ist zugleich Aufgabe 1 der Übungsserie Boolesche Algebra: Dort
soll bewiesen werden, dass DNF und KNF dasselbe ergeben, indem der DNF-Ausdruck
vereinfacht wird.

---

## A8 — Übungsserie Boolesche Algebra

> Vereinfachen Sie folgende Ausdrücke. Bei deinem Ausbildner kannst du eine
> Zusammenfassung der Gesetze abholen.
>
> Hinweis: Aufgaben 12 und 18 sind fakultativ

Aufgabe 1 ist die Förderband-Übung oben. Aufgabe 18 ist «Zusatzübung KNF / DNF»
und hat keinen eigenen Ausdruck. Die sechzehn Ausdrücke sind die Aufgaben 2
bis 17.

| Nr | Ausdruck | Minimalform | Terme | Buchstaben |
|---|---|---|---|---|
| 2 | e1 + n(e1)·e2 + e1·e2 | e1 + e2 | 2 | 2 |
| 3 | e1·n(e2) + n(e1)·e2 + e1·e2 + n(e1)·n(e2) | 1 | 1 | 0 |
| 4 | e1·n(e2)·(e1+e3) + e1·e3·(n(e1)+n(e2)) | e1·n(e2) | 1 | 2 |
| 5 | (e1·e2 + e3)·(e1·e2 + e4) | e1·e2 + e3·e4 | 2 | 4 |
| 6 | e1·n(e2)·e3 + n(e1)·n(e2)·e3 | n(e2)·e3 | 1 | 2 |
| 7 | (1 + e2)·(e1·e2·e3) | e1·e2·e3 | 1 | 3 |
| 8 | (n(e1)·e2)·(e1·e2) + e1·e2 | e1·e2 | 1 | 2 |
| 9 | (e1·n(e2) + e1·n(e3))·(e2·e3 + e2·n(e3))·(e1·e2·e3) | 0 | 0 | 0 |
| 10 | e1 + n(e2)·e3·(e1 + n(n(e2·e3))) | e1 | 1 | 1 |
| 11 | e3·(n(e1·e2·e3) + e1·n(e2)·n(e3)) | n(e1)·e3 + n(e2)·e3 | 2 | 4 |
| 12 ◇ | n(e1·e2·e3 + n(e1)·n(e2)) + e2·n(e3) | n(e1)·e2 + e1·n(e2) + e2·n(e3) | 3 | 6 |
| 13 | e1·n(e2 + e3·(e1·e2 + e1·e3)) | e1·n(e2)·n(e3) | 1 | 3 |
| 14 | e1·e2 + e1·n(e2 + e3) | e1·n(e3) + e1·e2 | 2 | 4 |
| 15 | n(e1·e2·e3·(e1 + e2 + e3)) | n(e1) + n(e2) + n(e3) | 3 | 3 |
| 16 | n((n(e1·e2) + e1·e2·e3)·(e1·n(e2)·e3)) | n(e1) + n(e3) + e2 | 3 | 3 |
| 17 | e1·e2·e3 + e1·e2·n(e3) + n(e1)·e2·e3 + n(e1)·n(e2)·n(e3) | n(e1)·n(e2)·n(e3) + e2·e3 + e1·e2 | 3 | 7 |

◇ = fakultativ (zusammen mit Aufgabe 18).

Die Aufgaben sind didaktisch gebaut und das sollte in den Hinweisen stehen:
Nr. 3 ergibt 1, weil alle vier Kombinationen vorkommen. Nr. 7 ergibt
`e1·e2·e3`, weil `1 + e2 = 1` ist. Nr. 9 ergibt 0, weil die Faktoren einander
widersprechen. Nr. 10 ist eine Absorption. Nr. 15 und 16 sind De Morgan.

---

## A9 — Normierte Schaltungen

Zwei Aufgaben, wörtlich:

1. **Nur NAND:** «Du hast nur NAND ICs zur Verfügung. Wandle die folgende
   Schaltung um.» Die Schaltung im Lehrmittel hat die Eingänge e1 bis e5 und
   den Ausgang A.
2. **Gegebene ICs:** «Zur Verfügung stehen je ein IC 74HC02 und ein 74HC08.
   Folgende Ausdrücke müssen dabei erfüllt sein.» Die Lösungsfassung vermerkt
   dazu: **4× NOR und 4× AND**.

---

## A10 — Übungsserie KV-Diagramm

> Vereinfachen Sie folgende Ausdrücke mit KV-Diagrammen:
> (Aufgaben 7-13 sind fakultativ)
>
> Erklärungen: `a'` bedeutet NICHT a · `d'cb'a'` bedeutet 0100 ·
> `m4` bedeutet 4 Eingänge: a, b, c, d
>
> Beispiel: `Z = m4(0,5,8,9) + X(1,6)`
> Die Zahlen hinter `m4` entsprechen einer 1 im entsprechenden Feld, die Zahlen
> hinter dem `X` einem X im entsprechenden Feld.

Aus `d'cb'a' = 0100` folgt die Stellenwertigkeit: **d ist das höchstwertige,
a das niederwertigste Bit.** Index = d·8 + c·4 + b·2 + a·1.

| Nr | Aufgabe | Minimalform | Terme | Buchstaben |
|---|---|---|---|---|
| 1 | m4(0,1,2,4,5,6,8,9,10,13) | d'a' + c'a' + b'a | 3 | 6 |
| 2 | m4(1,5,7,12,13,14,15) | d'b'a + ca + dc | 3 | 7 |
| 3 | m4(1,2,3,5,6,7,9,11,12,13,14,15) | a + d'b + dc | 3 | 5 |
| 4 | m4(0,1,2,3,4,5,6,7,9,11,12,13,14,15) | d' + a + c | 3 | 3 |
| 5 | m4(5,7) + X(1,3,8,9,10,11) | d'a | 1 | 2 |
| 6 | m4(0,2,6,10,11,12,13) + X(3,4,5,14,15) | d'a' + c'b + cb' ◆ | 3 | 6 |
| 7 ◇ | m4(0,3,4,6,8,10,11) + X(1,5,7,9,12,13,15) | b' + a + d'c + dc' | 4 | 6 |
| 8 ◇ | m4(0,2) + X(4,5,6) | d'a' | 1 | 2 |
| 9 ◇ | m4(0,6,8,10,11) + X(1,3,5,7,13,15) | d'cb + c'b'a' + dc'b | 3 | 9 |
| 10 ◇ | m4(3,6,10,11,12,14) + X(1,4,5,7,9,13,15) | a + c + db | 3 | 4 |
| 14 | Z = Σ m5(2,10,13,15,18,26,29,31) | c'ba' + dca | 2 | 6 |
| 15 | Z = Σ m5(0,1,7,15,16,17,23,25,27,29,31) | d'c'b' + cba + eda | 3 | 9 |
| 16 | Z = Σ m5(3,4,5,10,12,19,20,21,22,26,30) | d'c'ba + d'cb' + dc'ba' + e'cb'a' + ecba' | 5 | 19 |
| 17 | Z = Σ m6(1,3,6,7,9,11,15,17,19,22,23,25,27,31,33,35,38,41,43,49,51,54,57,59) | c'a + f'ba + d'cba' | 3 | 9 |

◇ = fakultativ. ◆ = **vier gleichwertige Minimalformen**; die Prüfung muss
jede davon annehmen, nicht nur die hier aufgeschriebene.

Nicht in der Tabelle, weil es keine `m`-Aufgaben sind, aber Teil der Serie:

- **11.** Gegeben `Z = BCD' + BCD + AB'C' + A'B'C'`. a) algebraische
  Vereinfachung b) Vereinfachung mittels KV-Diagramm.
- **12.** Vereinfachung mittels KV-Diagramm: a) `a'bc + ab'c + abc' + abc`
  b) `cba' + cb'a' + cb'a + cba' + cba`
- **13.** Beweisen Sie:
  `a'bc + ab'c + abc' + abc = ab + ac + bc = (a + b)(b + c)(c + a)`

---

## Was die Prüfung können muss

Für A8 und A10 reicht ein Zeichenvergleich nicht. Geprüft wird:

1. **Logische Gleichwertigkeit** mit dem Originalausdruck, über alle
   Eingangskombinationen.
2. **Termzahl und Buchstabenzahl** gegen die Werte in den Tabellen. Erst beide
   zusammen zeigen, dass wirklich minimiert wurde.

Eine andere, gleich kurze Lösung ist richtig — siehe Nr. 6 der KV-Serie. Wer
den Ausdruck nur umschreibt, ohne zu kürzen, besteht die zweite Prüfung nicht.

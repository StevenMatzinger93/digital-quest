# A9 — Normierte Schaltungen: die Originalaufgaben

Nachtrag zu `docs/aufgaben/AUFGABEN_ORIGINAL.md`. Die Schaltungen lagen als
Bilder im Lehrmittel vor und wurden ausgelesen. Bilder zum Gegenlesen:
`a9_aufgabe.png`, `a9_loesung1_nand.png`, `a9_loesung2_ics.png`.

Überschrift im Lehrmittel: «Normierte Schaltungen», Einleitung:

> Oftmals werden in der Praxis nicht alle Eingänge eines fertigen ICs benützt.
> Dann werden Teile der booleschen Ausdrücke so verändert, dass die bereits
> benützten ICs verwendet werden können. Dies wird aus Kosten- sowie
> Platzgründen angewendet.

---

## Aufgabe 1 — «Nominiert NAND»

> Du hast nur NAND ICs zur Verfügung. Wandle die folgende Schaltung um.

Die gegebene Schaltung, abgelesen aus dem Schaltbild:

- `e1` und `e2` auf ein **UND** (`&`)
- `e3` und `e4` auf ein **ODER** (`≥1`)
- die beiden Ausgänge auf ein zweites **UND**
- dessen Ausgang zusammen mit `e5` auf ein drittes **UND**
- Ausgang `A`

Als Ausdruck: **A = e1 · e2 · (e3 + e4) · e5**

Die Lösung im Lehrmittel baut das aus acht NAND-Gattern (U1 bis U8, in der
Zeichnung als `&` mit Negationskreis) plus einem **SN7410**, einem NAND mit
drei Eingängen (dort als U7 bezeichnet).

**Prüfung:** Wahrheitstabelle über alle 32 Eingangskombinationen gegen
`A = e1·e2·(e3+e4)·e5`, zusätzlich Bauteilprüfung — ausser NAND darf kein
Gattertyp vorkommen. Dass das Lehrmittel ein NAND mit drei Eingängen zulässt,
gehört in den Aufgabentext, sonst sucht ein Lernender vergeblich nach einer
Lösung mit lauter Zweifach-NAND.

---

## Aufgabe 2 — Mit gegebenen ICs

> Zur Verfügung stehen je ein IC 74HC02 und ein 74HC08. Folgende Ausdrücke
> müssen dabei erfüllt sein:

Die Lösungsfassung vermerkt dazu: **4× NOR und 4× AND** — das ist der
Gattervorrat der beiden ICs (74HC02 = vier NOR mit je zwei Eingängen,
74HC08 = vier UND mit je zwei Eingängen).

Die Lösungsschaltung zeigt:

- `A` und `C` auf ein **NOR** (U7, aus dem 74HC02)
- dessen Ausgang zusammen mit `B` auf ein **UND** (U6, aus dem 74HC08)
- Ausgang `A1`

Als Ausdruck: **A1 = NICHT(A + C) · B**

**Offen und nicht erfunden:** Der Aufgabentext kündigt «folgende Ausdrücke»
im Plural an, auf dem Aufgabenblatt ist die Stelle darunter aber leer — dort
standen Formelobjekte, die sich nicht auslesen liessen, oder sie fehlen im
Dokument. Die Lösungsfassung zeigt nur diese eine Schaltung.

Also: **Aufgabe 2 wird mit genau diesem einen Ausdruck eingebaut.** Dass
möglicherweise weitere Ausdrücke zur Aufgabe gehören, kommt als Punkt in
`docs/FRAGEN_STUDIO.md` — Steven kann es an seinem Original nachsehen. Keine
weiteren Ausdrücke dazuerfinden.

**Prüfung:** Wahrheitstabelle gegen `A1 = n(A+C)·B`, dazu die Bauteilprüfung:
höchstens vier NOR und höchstens vier UND, keine anderen Gattertypen.

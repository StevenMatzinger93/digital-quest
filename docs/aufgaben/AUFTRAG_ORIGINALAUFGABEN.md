# Auftrag: Stevens Originalaufgaben einsetzen

**Branch:** `wip/studio`. **Niemals nach `main`.**

Im Nachtlauf 2 wurden für A7, A8 und A10 eigene Beispiele erfunden, weil die
Originale im Word-Dokument als Formelbilder vorliegen und nicht im Repository
waren. Sie liegen jetzt vor.

Dateien in `docs/aufgaben/`:

- `AUFGABEN_ORIGINAL.md` — die Serien im Wortlaut, mit nachgerechneten Lösungen
- `boolesche_algebra.json` — die 16 Ausdrücke, maschinenlesbar
- `kv_diagramm.json` — die 14 KV-Aufgaben, maschinenlesbar
- `formeln_2-7.png`, `formeln_8-12.png`, `formeln_13-17.png` — die Formeln, wie
  sie im Lehrmittel stehen

---

## 1. Ersetzen

**A7** bekommt die Förderband-Aufgabe mit der Wahrheitstabelle aus dem
Lehrmittel. Das Vorgehen für DNF und KNF wird im Wortlaut des Lehrmittels
wiedergegeben, nicht umformuliert.

**A8** bekommt die sechzehn Ausdrücke als Aufgaben 2 bis 17. Aufgabe 1 ist die
Förderband-Übung aus A7, Aufgabe 18 die Zusatzübung KNF/DNF ohne eigenen
Ausdruck. **12 und 18 sind freiwillig.**

**A10** bekommt die vierzehn KV-Aufgaben plus die drei Sonderaufgaben 11, 12
und 13. **7 bis 13 sind freiwillig.**

Die selbst erfundenen Beispiele kommen weg. Was von ihnen als zusätzliche
Übung taugt, darf als ausdrücklich freiwillige Zusatzaufgabe bleiben, deutlich
getrennt von Stevens Serie.

## 2. Zwei Dinge, die die Prüfung können muss

**Gleichwertige Minimalformen.** KV-Aufgabe 6 hat vier gleich kurze Lösungen.
Die Prüfung vergleicht deshalb nie mit einer aufgeschriebenen Lösung, sondern
prüft logische Gleichwertigkeit mit dem Originalausdruck **und** Termzahl und
Buchstabenzahl gegen die Werte in den JSON-Dateien.

**Die Stellenwertigkeit im KV-Teil.** Aus `d'cb'a' = 0100` folgt: d ist das
höchstwertige, a das niederwertigste Bit. Index = d·8 + c·4 + b·2 + a·1. Falls
im Lernpfad bisher anders nummeriert wurde, wird das hierauf umgestellt — und
zwar überall, auch in den Zeichnungen der KV-Felder.

Die Minimalformen in den JSON-Dateien sind mit Quine-McCluskey exakt berechnet,
nicht geschätzt. Sie sind die Vorgabe. Wenn deine eigene Rechnung abweicht:
nicht stillschweigend anpassen, sondern in `docs/FRAGEN_STUDIO.md` melden.

## 3. Abnahme

- Je Station ein Test, der die Musterlösung einspielt (wird angenommen) und
  eine richtige, aber nicht minimierte Form (wird abgelehnt)
- KV-Aufgabe 6 ausdrücklich mit zwei verschiedenen Minimalformen geprüft, beide
  werden angenommen
- Volle Testkette, Commit, Push, Eintrag in `docs/FORTSCHRITT_STUDIO.md`

## 4. Danach, falls Zeit bleibt

Die drei offenen Konventionen aus deinem Bericht so umbauen, dass sie an
**einer** Stelle stehen und nicht im Code verstreut sind — Steven wird sie
beantworten, und dann soll die Änderung eine Zeile sein:

- Nummerierung in der m4-Schreibweise (jetzt geklärt: a ist das niederwertigste
  Bit, siehe oben)
- Welcher Eingang beim NOR-Flipflop setzt (du hast e1 genommen)
- preClear-Regel im Rechenkern (FRAGEN_STUDIO.md Punkt 7)

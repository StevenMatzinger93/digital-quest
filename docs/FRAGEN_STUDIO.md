# Offene Fragen an Steven – Studio und Lernpfad (Nachtlauf 16./17.10.2026)

Hier steht, was ich nicht selbst entscheiden konnte oder wollte. Kurz, nach Dringlichkeit.

## Lernpfad

1. ~~**Stevens Arbeitsblätter fehlen im Repository.**~~ **Teilweise beantwortet (16.10.2026):** A7 (Förderband), A8 (Übungsserie) und A10 (KV-Serie) sind jetzt Stevens Originalaufgaben (`docs/aufgaben/`). Die erfundenen Beispiele sind weg; was als eigene Übung geblieben ist, ist ausdrücklich freiwillig und mit «Zusatz (eigene Übung)» gekennzeichnet. **Weiter von mir sind:** alle übrigen Stationen (A1, A3, A4, A6, A9 bis A13, Teil B) und alle Texte und Prüffragen. **Original:** Alle Aufgaben des Lernpfads sind aus der Beschreibung in `AUFTRAG_LERNPFAD.md` abgeleitet, die Zahlen und Ausdrücke sind **meine eigenen Beispiele**. Das betrifft vor allem die **18 Ausdrücke in A8**, die **13 KV-Funktionen in A10**, die Szenarien (Förderband in A7) und alle Texte. Bitte gegenlesen und, wo gewünscht, durch Deine eigenen ersetzen (Daten liegen in `dev/studio/pfad/st_*.js`, Format steht am Anfang von `pfad/kern.js`).
2. ~~**Minterm-Nummerierung («m4-Schreibweise»).**~~ **Geklärt:** d höchstwertig, a niederwertigst (`d'cb'a' = 0100`), im Lernpfad schon so; jetzt an einer Stelle (`dev/studio/pfad/konventionen.js`, `P.KONV.buchstaben`). Früher so gelesen: Ich habe «A = m(1, 3, 5)» so gelesen: Zeile k der Wahrheitstabelle, **e1 = niedrigstes Bit**. Die kleine Nummer steht in jedem Feld des KV-Diagramms. Wenn Du e1 als höchstes Bit zählst, ändert sich die Nummerierung aller KV-Aufgaben (die Funktionen selbst bleiben, nur die Nummern in `A = m(…)` müssen umgerechnet werden).
3. **Alte DIN-Norm (A4)** fehlt. Welche Zeichen verlangst Du? Ich konnte sie nicht sicher belegen und habe nichts erfunden.
4. **Pflicht und freiwillig:** nach Deinen Hinweisen (A8 Nr. 12 und 18, A10 Nr. 7 bis 13) und zusätzlich von mir als freiwillig gesetzt: A7 Mehrheitsentscheid, A12 Hamming, A13 4-Bit-Komparator.
5. **Verweise auf FestoLX** («Vertieft in FestoLX, Grundlagen Digitaltechnik») stehen bei allen Stationen als Vorschlag, ohne Kapitelnummern.

## Teil B des Lernpfads

7. **Ripple-Zähler mit Rücksetzen: Rechenkern geändert.** Eine hand gebaute Digitaluhr (B9) funktionierte im Studio nicht, weil das Rücksetzen einer Stufe die nächste getaktet hat (die Engine kennt keine Gatterlaufzeit; im echten Baustein hält der preClear-Impuls solange an). Ich habe die Regel «ein Takt im selben Zeitpunkt, in dem preClear wegfällt, zählt nicht» in `engine.js` ergänzt. Sie gilt auch im Spiel. Bitte schau Dir an, ob Du damit einverstanden bist; die Tests (Spiel, Studio, Rechenkern, Robustheit) sind grün.
8. **B9-Aufbau:** Die Uhr ist asynchron gebaut (Ripple, preClear bei 10 und bei 6, Übertrag über die fallende Flanke von Q3). Wenn Du im Unterricht einen anderen Aufbau erwartest (z. B. synchron), muss die Prüffolge nichts ändern, nur die Musterlösung und der Aufgabentext.
9. **Zustandsfolgediagramme** sind «von Hand» mit Vergleich. Wenn die Software sie später prüfen soll, braucht es ein Zeichenwerkzeug für Zustände und Pfeile (nicht gebaut).
10. **«Wenn Zeit übrig bleibt»**: siehe Schlussbericht in `FORTSCHRITT_STUDIO.md`.

## Nach dem Einsetzen der Originalaufgaben (16.10.2026)

11. **Wortlaut Aufgabe 18 (Zusatzübung KNF/DNF)** liegt nicht vor. Ich habe sie als «DNF und KNF der Funktion aus Aufgabe 12» umgesetzt (A8.18a, A8.18b, freiwillig). Bitte Wortlaut nennen.
12. **Aufgabe 11 der KV-Serie** (`Z = BCD' + BCD + AB'C' + A'B'C'`) verwendet Grossbuchstaben A bis D. Für das KV-Diagramm (11b) habe ich A als niederwertigstes Bit genommen (wie a), D als höchstwertiges. Die algebraische Vereinfachung (11a) ist davon unabhängig. Stimmt das?
13. **Nummerierung der Minterme in `boolesche_algebra.json`:** Dort zählt e1 als **höchstes** Bit (Aufgabe 4 hat `minterme [4, 5]`), im KV-Teil und in der Wahrheitstabelle des Förderbands zählt der erste Eingang als **niedrigstes**. Es ändert nichts an den Aufgaben (die Prüfung rechnet mit dem Ausdruck); der Test rechnet die Nummern um. Falls das Absicht war: bitte bestätigen.
14. **KV mit 5 und 6 Eingängen** (Aufgaben 14 bis 17): Ich zeichne zwei beziehungsweise vier 4×4-Diagramme (e = 0 | e = 1, f e = 00 … 11) mit durchgehender Feldnummer; Päckchen dürfen Diagramme überspannen. Wenn Du im Unterricht eine andere Anordnung zeichnest, bitte sagen.

## Nach A9 und B1 (16.10.2026)

16. **A9 Aufgabe 2, weitere Ausdrücke:** Der Aufgabentext kündigt «folgende Ausdrücke» im Plural an, belegt ist nur `A1 = NICHT(A + C) · B`. Es ist genau dieser eingebaut, nichts erfunden. Bitte am Original nachsehen, ob weitere Ausdrücke zur Aufgabe gehören.
17. **B1 Ansteuertabelle:** Die Werte der Ansteuertabelle (Spalten AV | A | e2 | e1) stehen im Auszug nicht. Ich habe die übliche Tabelle gerechnet (e2 e1 = 0 X, 1 0, 0 1, X 0; die Kombination 11 wird nicht benutzt) und lasse X überall zu, wo es die Gleichung mit gemeinsamer 1 hergibt. Bitte gegen die Lösung im Lehrmittel prüfen.

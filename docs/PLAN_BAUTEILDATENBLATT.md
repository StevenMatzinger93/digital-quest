# Plan: Bauteil-Datenblatt beim Drüberfahren (Stand 29.09.2026)

Idee: Fährt man mit der Maus über ein Bauteil (in der Palette vor dem Platzieren, oder auf ein bereits platziertes Bauteil in Schema/Werkbank), öffnet sich ein **Datenblatt**: Funktion, Anschlüsse, Grenzwerte, dazu das Bauteil als Bild sowohl im Schema-Symbol als auch in der 2.5D-Werkbank-Darstellung.

## Technische Grundlage – schon vieles vorhanden

Genau wie bei den Theorie-Animationen gilt: nicht neu bauen, was schon da ist.
- **Grenzwerte** stehen bereits strukturiert in `E.PARTS` (`dev/src/engine.js`): jeder Bauteiltyp hat `props` mit den echten Kennwerten (`imax`, `pmax`, `pnom`, `vz`, `beta`, `vf`, `rs` …) und `unit`. Das Datenblatt liest diese live aus der Engine – keine zweite, möglicherweise veraltete Zahlenquelle.
- **Schema-Bild**: `editor.js` hat mit `symbol(p, r)` bereits eine Funktion, die das IEC-Symbol jedes Bauteiltyps zeichnet (siehe `case 'resistor': …` usw.).
- **Werkbank-Bild**: `bench.js` hat die entsprechende Zeichenfunktion mit `case 'resistor': // Kohleschichtwiderstand …` für jeden Typ, inklusive der ganzen Detailoptik (Farbringe, Gehäuseform usw.).

Beide Zeichenfunktionen sind heute Teil des grossen Renderers (brauchen Kontext: Position im Layout, Simulationsergebnis `r`). Für das Datenblatt braucht es nur eine **freistehende Variante**: dieselbe Zeichenlogik, aber mit neutralen/Default-Werten (kein `r`, feste kleine Grösse, zentriert) – technisch eine kleine Extraktion, kein Neubau.

## Was im Datenblatt steht

1. **Funktion** – ein bis zwei Sätze, was das Bauteil tut (neuer Text, ~28 Bauteiltypen).
2. **Anschlüsse** – `E.PARTS[type].pins` gibt die Kürzel (z. B. `a`, `k` bei der LED); dazu je Pin ein kurzer Bedeutungstext (neu, da `PARTS` nur Kürzel kennt, keine Beschreibung).
3. **Grenzen** – direkt aus `E.PARTS[type].props` gelesen und mit Einheit beschriftet (z. B. LED: „max. 30 mA“ aus `imax`). Wo eine Formel dahintersteckt (z. B. Vorwiderstand), wird sie mit angezeigt.
4. **Zwei Bilder** – Schema-Symbol und Werkbank-Bild nebeneinander, aus den freistehenden Zeichenfunktionen.

## Bedienung – Vorschlag

Zwei Situationen, unterschiedlich gelöst, damit nichts an der bestehenden, funktionierenden Live-Anzeige kaputtgeht:
- **In der Palette** (Bauteil noch nicht platziert): Hover zeigt sofort das volle Datenblatt – hier gibt es noch keine Simulationswerte, die im Weg stehen könnten.
- **Auf einem platzierten Bauteil** (Schema oder Werkbank): Der bestehende Schnell-Tooltip (U/I/P, DEFEKT) bleibt wie er ist – der ist beim Messen wichtig und soll nicht verzögert werden. Zusätzlich öffnet ein längeres Verweilen (z. B. 500–700 ms) oder ein kleines „ⓘ"-Zeichen am Tooltip das volle Datenblatt. So gibt es keine Konkurrenz zwischen „schnell den Messwert sehen" und „das Bauteil verstehen".

Diese Aufteilung ist mein Vorschlag, kein fixer Entscheid – wenn du es lieber einheitlich (z. B. immer per Klick statt Hover) haben willst, sag Bescheid, dann halte ich das stattdessen fest.

## Umsetzungsprojektplan

**Phase A – Icon-Extraktion**: `symbol(type)`-Vorschau aus `editor.js` und die entsprechende Zeichenfunktion aus `bench.js` als freistehende, parameterlose (oder nur `type`+`props`) Funktionen nutzbar machen, ohne die bestehende Nutzung im Renderer zu verändern.

**Phase B – Datenmodell und Texte**: neues Content-Modul `dev/src/content/datasheets.js` mit `{funktion, anschluesse: {pin: text}}` für jeden der ~28 Typen in `E.PARTS`. Grenzen werden nicht dort gepflegt, sondern zur Laufzeit aus `E.PARTS[type].props` zusammengesetzt.

**Phase C – Popover-UI**: Datenblatt-Komponente in `app.js`, die Texte + zwei Icons + Grenzwerte zusammensetzt; Trigger wie oben (Palette sofort, platziertes Bauteil verzögert/über „ⓘ").

**Phase D – Rollout**: alle ~28 Bauteiltypen mit Funktionstext und Pin-Beschreibungen befüllen (inhaltliche Fleissarbeit, aber pro Typ klein).

**Phase E – QA**: `validate.js` prüft, dass jeder `E.PARTS`-Typ einen Eintrag in `datasheets.js` hat (kein Bauteil ohne Datenblatt). `tests/smoke.js` hovert exemplarisch über 2–3 Bauteile in Palette und Schema/Werkbank und prüft, dass das Datenblatt korrekt erscheint (Text + beide Bilder vorhanden).

## Aufwand/Reihenfolge in Kürze
Phase A ist die einzige technische Kernarbeit (Icons freistellen) – danach ist alles Übrige Inhalt (Texte) und eine vergleichsweise kleine UI-Komponente. Empfehlung: gleich nach den Theorie-Animationen angehen, weil Phase A dort (Mini-Schaltung-Baustein) ohnehin denselben Renderer anfasst – das lässt sich gut zusammen einplanen statt zweimal in denselben Code zu greifen.

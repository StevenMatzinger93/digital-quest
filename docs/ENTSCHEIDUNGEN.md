# Digital Quest – Entscheidungen (Stand 28.09.2026)

## Produkt
- Eigenstaendiges Produkt, spaeter Teil der Dachmarke **Buehler Quest**. SPS Quest bleibt unabhaengig.
- Thema: Elektrotechnik und Digitaltechnik. Die Themenliste liefert Steven (`docs/THEMEN.md`).
- Technischer Aufbau darf von SCL Quest abweichen; Methode und Design folgen `docs/BAUPLAN_LERNSPIEL.md`.
- Kern: Schaltungen bauen **und messen** („zwischen Fritzing und LTspice“). Messen ist gleichwertig mit Bauen.
- Theoriedokumente von Steven liegen in `theorie/` und sind die fachliche Grundlage.

## Klassen und Personen (spaeter, nicht jetzt bauen)
- Eigene Klassen und Konten in Digital Quest.
- Spaeter: Personen questuebergreifend verknuepfen (gleicher Name → „Gleiche Person?“ + Knopf „Verknuepfen“) fuer die Auswertung in Buehler Quest. Nie automatisch, immer bestaetigt, loesbar.
- Schon jetzt: UUID als Personen-ID, Vor-/Nachname getrennt, Lernereignisse mit Zeitstempel, Kompetenz-Tags an Aufgaben, stabile Exportschnittstelle.

## Werkbank-Ansicht (Herzstueck, Entscheid 28.09.2026)
- Digital Quest hebt sich von LTspice/Fritzing/TINA dadurch ab, dass **Schema-Ansicht und Werkbank-Ansicht dieselbe Engine/denselben Zustand teilen** - kein separates System, echtes virtuelles Labor statt Simulationssoftware-Optik.
- Werkbank-Stil: **2.5D, fester Blickwinkel** (kein frei drehbares 3D) - orientiert an einem **echten Elektroniklabor/Physik-Praktikum** (Werkbank, Kabel mit Messspitzen/Krokoklemmen, echte Geraetefronten fuer Multimeter/Oszilloskop), nicht an Tinkercad-Steckbrett-Optik.
- **Prioritaet: Werkbank-Ansicht wird vor dem weiteren Inhaltsaufbau (Themenliste/Kapitel/Aufgaben) entwickelt.** Neues Modul geplant: `dev/src/bench.js` (`window.DQBench`), das dieselbe Netzliste wie `editor.js` rendert, nur werkbank-illustriert statt IEC-schematisch.
- **Layout-Mapping (Entscheid 28.09.2026): pro Aufgabe eigene Werkbank-Anordnung.** Jede `defTask` bekommt neben `start`/`ref`/`wrong` (Schema-Layout) ein zusaetzliches Layout `bench` mit eigenen Koordinaten pro Bauteil-ID – keine automatische Ableitung aus dem Schema-Raster. Reihenfolge der Bauteil-/Geraete-Illustrationen: zuerst Kapitel-1-Bauteile (Batterie, Schalter, Lampe, LED, Widerstand) und das Multimeter.
- **Interaktionsumfang (Entscheid 28.09.2026): voll interaktiv von Anfang an.** Bauen/Verdrahten/Drehen/Loeschen muss auf der Werkbank genauso moeglich sein wie im Schema, nicht nur Ansehen/Messen. Deshalb wird der Interaktionskern (Bauteil hinzufuegen/bewegen/drehen/loeschen, Leitung ziehen, ID-Vergabe) aus `editor.js` herausgeloest in einen ansichtsneutralen Kern; `editor.js` und `bench.js` werden duenne Renderer darueber, die nur ihre eigene Bildschirm-Geometrie fuers Hit-Testing melden. Reihenfolge: (1) Interaktionskern trennen, (2) Werkbank-Rendering-Grundgeruest, (3) Live-Sync (LED/Lampe/Spannungsfarben/Tooltips), (4) Multimeter auf der Werkbank, (5) Umschalt-Button in `app.js` + `tests/smoke.js`-Durchlauf durch beide Ansichten. Siehe `docs/STAND.md`.

## Quick Wins Werkbank/Engine (Entscheid 28.09.2026)
Alle vier Quick Wins aus der Marktanalyse werden umgesetzt - kein neues Bedienkonzept fuer Lernende, nur die Engine rechnet mehr und zeigt mehr von dem, was sie ohnehin weiss:
1. **Zeitlupen-Replay**: Gauss-Seidel-Zwischenschritte (Logik-Rueckkopplung) und Backward-Euler-Zeitschritte (Kondensator-Ladevorgang) werden mitgespeichert statt nur das Endergebnis. Schieberegler "Schritt fuer Schritt" in der Oberflaeche, kein neuer Rechenaufwand, nur Speicherung vorhandener Zwischenwerte.
2. **Echte Diagnose statt Textbaustein**: Die Diagnose-Box (Bauplan Komfortfunktion) leitet ihre Erklaerung aus den tatsaechlichen Simulationswerten des aktuellen Versuchs ab (z. B. "Strom durch D1 war 45 mA, Grenzwert 30 mA, R1 zu klein fuer 9 V"), nicht aus einem festen Text pro Stoerungscode.
3. **Messgeraete-Realismus**: kleines Toleranzband/Eigenrauschen auf angezeigte Messwerte; Multimeter-Modus "Average-responding" vs. "TRMS" liefert bei verzerrter Kurve unterschiedliche (mal falsche, mal richtige) Anzeige - das ist der Lernmoment fuer Kapitel 3 (AVG/RMS/TRMS).
4. **Sandbox-Modus**: freie Werkbank ohne Aufgabe, mit allen bereits freigeschalteten Bauteilen, zum Ausprobieren. Keine neue Logik - nutzt Editor/Engine/Werkbank wie sie fuer Aufgaben ohnehin bestehen, nur ohne Auftrag/Pruefung.

## Hosting-Umgebung (Entscheid 28.09.2026, wie SPS/SCL Quest)
Gleiches Muster wie bei SCL Quest: eigenes GitHub-Repo + Cloudflare Worker (`wrangler.jsonc`, liefert `web/` als Website aus), per GitHub verbunden fuer Auto-Deploy bei Push. **Bewusst ohne D1-Datenbank/Klassen-Anbindung** – das gehoert zum zurueckgestellten Punkt "Klassen und Personen" oben und wird erst ergaenzt, wenn diese Funktion tatsaechlich gebaut wird. `wrangler.jsonc` liegt bereit (Worker-Name `digital-quest`). Offen/braucht Stevens Aktion: GitHub-Repo anlegen und verbinden, Cloudflare-Login (`wrangler login`), Worker mit GitHub-Repo verknuepfen (Cloudflare-Dashboard).

## Technik
- Offline-Einzeldatei + PWA, keine externen Bibliotheken noetig (Google Fonts optional).
- Leitfarbe Bernstein `#ffb000`, Token-Namen wie SCL Quest.

## Offen
- ~~Themenliste und Kapitelplan~~ – erledigt, siehe `docs/THEMEN.md`.
- ~~Welt, Figuren, Name der Lernumgebung~~ – erledigt (Entscheid 28.09.2026): Name **Labor**, Begleitfiguren Laborassistenz (erklaert) / Laborchef/Werkmeisterin (fordert), siehe `docs/KONZEPT.md`. Konkrete Namen/Aussehen der Figuren noch offen, aber nicht blockierend.
- Plattform (Login/Klassen) – analog SPS Quest, eigene Datenbank. **Bewusst zurueckgestellt**, nicht jetzt bauen (siehe "Klassen und Personen" oben).

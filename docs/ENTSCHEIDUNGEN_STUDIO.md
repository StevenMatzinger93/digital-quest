# Entscheidungen – Digital Quest Studio

Was `docs/AUFTRAG_STUDIO.md` Abschnitt 2 nicht regelt, steht hier mit einer Zeile Begründung. Neueste Einträge unten.

## Stufe 0 (14.10.2026)

| Entscheidung | Begründung |
|---|---|
| Quellcode in `dev/studio/` (`index.template.html`, `studio.css`, `sim.js`, `studio.js`, später `scope.js`, `timing.js` …); `build.js` hängt sie in einer festen Reihenfolge (`STUDIO_ORDER`) zusammen | Aufbau analog zu `dev/portal/`; ein Modul je Aufgabe, trotzdem eine ausgelieferte Datei |
| Offline-Datei heisst `studio.html` im Wurzelverzeichnis, gehostet unter `web/studio/index.html` (Pfad `/studio/`) | wie im Auftrag; `web/` ist bereits der Cloudflare-Ordner, kein Worker-Eingriff nötig |
| Schriften: IBM Plex nur als erste Wahl der Schrift-Kette, **nicht eingebettet**; Rückfall `system-ui` / `ui-monospace` | keine Netzabhängigkeit, und das Einbetten würde die Datei um mehrere hundert KB vergrössern; die Schrift selbst lässt sich später nachrüsten |
| Zeichenfläche des Studios 2400 × 1500 statt 1000 × 620 (`DQCircuit.SPACES.schema` wird nur im Studio verändert; `editor.js` liest die Grösse jetzt dynamisch) | die aufgeklappten Zähler und die Digitaluhr passen sonst nicht; das Spiel bleibt unverändert |
| Zusatzpunkt in `editor.js`: Option `wireColor(pid, res, pinNode)` für die Leitungsfarbe | Logikleitungen sollen bei 1 grün sein (Auftrag Abschnitt 4); ohne Option bleibt das Spiel gleich |
| `E.setGmin(g)` in `engine.js` | Der Parasitärleitwert 1e-9 S je Knoten verfälscht die Handrechnung um bis 1e-6; die Konformitätsprüfung verlangt 1e-9. Standardwert bleibt, nur `tests/kern.js` senkt ihn |
| Konformitätstoleranz 1e-9 **relativ** (plus 1e-15 absolut) | strenger als ein absoluter Wert, gilt für alle Grössenordnungen |
| Stromquelle in `kern.js` = Spannungsquelle mit ri = 1 MΩ (Norton) | der Auftrag verlangt keinen neuen Bauteiltyp in Stufe 0; die Engine kennt Quellen ohnehin nur als Norton-Ersatz |
| Studio-Menüs stehen nicht in `wegweiser_data.js` | die Pflicht gilt für Menüpunkte des Portals und Knöpfe der Labor-Kopfzeile; das Studio hat eine eigene Menüleiste. Beim Verlinken aus dem Portal kommt der Eintrag dazu |
| Die Simulation startet beim Öffnen im Zustand «läuft» | sofortiges Feedback wie bei Falstad; Pause mit Leertaste |
| `refresh()` bei Änderungen behält den Zustand (Kondensatorladung, Flipflops), die Zeit läuft weiter; «Zurück» setzt alles auf t = 0 | Umbauen im laufenden Betrieb wie im Labor |
| Im Stillstand zeigen dynamische Schaltungen eine Vorschau auf einer Kopie des Zustands | der Gleichstrom-Arbeitspunkt würde einen geladenen Kondensator als offen darstellen und damit falsche Werte zeigen |

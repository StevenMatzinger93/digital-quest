# Bauplan Lernspiel – themenneutrale Vorlage (Stand 28.09.2026)

Kopie aus dem Claude-Projekt „SCL Quest“ (`konzept/BAUPLAN_LERNSPIEL.md`). Destilliert aus SCL Quest v5. Gilt für jede eigenständige Quest der späteren Dachmarke **Bühler Quest** (SPS Quest, Digital Quest, …). Jede Quest ist ein eigenes Produkt mit eigenem Repo, eigener Engine und eigenen Klassen.

## 1. Kernprinzip
Die lernende Person **baut etwas Echtes** (Code, Schaltung, Wahrheitstabelle, Messaufbau …). Eine selbst geschriebene **Engine prüft es gegen Testfälle**, und eine **Simulation zeigt das tatsächliche Ergebnis** – nie eine vorgespielte Animation. Fehler werden sichtbar, erklärt und sind reparierbar.

## 2. Didaktischer Aufbau
- 15 Kapitel × 10 Aufgaben = 150 Aufgaben, dazu 30 Theorie-Aufträge.
- Kapitelablauf: Theorie A → Aufgaben 1–5 → Theorie B → Aufgaben 6–10.
- Theorie = Lektion + 5 Fragen, bestanden ab 80 %. Fragen, wo möglich, gegen die Engine verifiziert.
- Grundstufe (Kap. 1–10), Profi-Stufe (Kap. 11–15). Boss-Aufgabe am Ende jeder Stufe, Zertifikat nach Grundstufe, Abzeichen.
- Jede Aufgabe: story, brief, learn, take (Merksatz), man (Handbuchverweis), hint, hint2, Referenzlösung, Startzustand, typische Fehllösungen (`wrong`).
- Spaced Review auf der Karte, Lösungsvergleich nach dem Lösen, Glossar mit Unterstreichung in Aufgabentexten.
- Begleitfiguren mit festem Tonfall: eine erklärt, eine fordert.

## 3. Qualitätssicherung (nicht verhandelbar)
- **Validator** pro Aufgabe: Referenz besteht · Start scheitert · jede `wrong`-Lösung scheitert · Theoriefragen stimmen mit Engine überein. Ziel: „OK — keine Fehler“, 0 Warnungen.
- Engine-Unit-Tests.
- Playwright-Durchlauf: alle Theorien + alle Aufgaben über die echte Oberfläche, ohne JS-Fehler; Handy-Screenshot.
- **Fertig heisst:** Validator 0 Fehler, Browser-Durchlauf fehlerfrei, Handy ok, offline spielbar.

## 4. Technischer Rahmen
- Ausgeliefert: **eine** selbstständige `index.html` (offline), plus `web/` als PWA (Manifest, Service Worker cache-first mit Content-Hash).
- `dev/`: Engine (themenspezifisch), Editor/Szene (themenspezifisch), `app.js` (Spielsteuerung + Komfort), `src/content/` (`_helpers.js`, `chNN.js`, `theory.js`, `manual.js`), `build.js`, `validate.js`, `tests/`.
- Speicherstand in `localStorage` mit Versionsschlüssel + Migration, Export-Erinnerung, `navigator.storage.persist()`.

## 5. Komfortfunktionen (Standard in jeder Quest)
Fehlermarkierung live · Hover-Infos · Quick Fixes · Diagnose-Box „Mögliche Ursache“ · Lösungsvergleich · geführte Touren · Glossar A–Z · Volltextsuche im Handbuch · Speicheranzeige · helles Thema (Arbeitsfläche bleibt dunkel) · UI-Skalierung · Farbsehhilfe · Handy-Bedienung.

## 6. Design
- Filmisch-dunkle Industrieoptik, Arbeitsfläche immer dunkel.
- Tokens: `--bg-primary #121212`, `--bg-secondary #1a1a1a`, `--bg-panel #1c1c1c`, `--bg-editor #0c0d0a`, `--text-primary #e0e0e0`, `--text-dim #8a8a8a`; Akzente grün `#39ff14`, cyan `#1ec8e0`, orange `#ff8c00`, rot `#ff3333`, blau `#5b9bff`.
- Schriften: `Inter` (UI), `Fira Code` (Code/Werte).
- Jede Quest hat **eine eigene Leitfarbe**: SCL Quest grün, **Digital Quest Bernstein `#ffb000`**.

## 7. Arbeitsweise mit Claude
1. Konzept + `docs/ENTSCHEIDUNGEN.md`.
2. Phasen: A Engine → B Datenmodell → C Oberfläche → D Inhalte → E QA → F Abgleich mit Realität/Fachperson.
3. Nach jedem Abschnitt `docs/STAND.md` aktualisieren; `CLAUDE.md` beschreibt Engine-Semantik und Aufgabenformat.
4. Nebenzweige mit Vorschau, Übernahme nach main bei grünen Tests.

## 8. Vorbereitung Bühler Quest (jetzt nur beachten, nicht bauen)
Jede Quest bleibt eigenständig (eigene Klassen, Konten, DB). Später: Personen questübergreifend **verknüpfen** („Gleiche Person?“ → Knopf **Verknüpfen**) für die übergreifende Auswertung.
Ab sofort in jeder Quest:
- Personen-ID als **UUID**, nie wiederverwendet.
- Vorname und Nachname **getrennt** (plus Pseudonym); optional Unterscheidungsmerkmal bei Namensgleichheit.
- Lernereignisse mit Zeitstempel (Aufgabe, Versuch, Ergebnis, Tipps, Dauer).
- **Kompetenz-Tags** an Aufgaben und Theorien.
- Stabile Export-Schnittstelle (Personen, Fortschritt).
- Verknüpfung nie automatisch, immer bestätigt, lösbar; Datenschutz beachten.

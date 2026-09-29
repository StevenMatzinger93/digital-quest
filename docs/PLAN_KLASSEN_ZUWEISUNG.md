# Plan: Konten, Klassen, Zuweisungen mit Abgabedatum, Uebungswerkstatt

Entscheid vom 28.09.2026 in `docs/ENTSCHEIDUNGEN.md` ("## Offen") wird hiermit **bewusst wieder aufgenommen**: dort steht "Plattform (Login/Klassen): **Bewusst zurueckgestellt**, nicht jetzt bauen." Dieser Plan hebt das auf Wunsch des Auftraggebers auf. `wrangler.jsonc` hat deshalb bisher **keine** D1-Datenbank - das aendert sich mit diesem Plan (siehe Infrastruktur-Abschnitt).

## Abgleich mit SCL Quest ("genau gleich wie bei SCL Quest")

Ich habe SCL Quest's `docs/ENTSCHEIDUNGEN.md` erneut geprueft, dazu `docs/STAND.md` und den Quellcode (`dev/src/*.js`, keine eigene Worker-/API-Datei im Repo gefunden). Ergebnis:

- **Rollenmodell und Auth sind bei SCL Quest dokumentiert und die Infrastruktur ist vorbereitet**: Benutzername+Passwort (keine E-Mail), Rollen Admin/Dozent/Schueler, nur Admin legt Dozenten an, Schueler werden vom Dozenten oder per Klassencode-Selbstregistrierung angelegt, Dozent sieht Fortschritt und Klassencode, Passwort-Reset durch Dozent, nur Pseudonyme, Admin-Zugang ueber Worker-Secrets `ADMIN_USER`/`ADMIN_PASSWORD`, gehashte Passwoerter (PBKDF2 via WebCrypto), Rate-Limiting bei Fehlversuchen. D1-Datenbank `spsquest` ist angelegt, Binding `DB` in `wrangler.jsonc`, Secrets gesetzt.
- **Eine Zuweisungs-/Abgabedatum-Funktion (Dozent weist Kapitel/Aufgaben einer Klasse oder Einzelperson zu, mit Frist) habe ich bei SCL Quest nirgends gefunden** - weder in den Entscheiden noch im Code. Das ist also **kein bestehendes Feature zum Kopieren**, sondern eine neue Funktion, die wir hier fuer Digital Quest neu entwerfen (und bei Bedarf spaeter nach SCL Quest zurueckportieren koennten).
- Im Code selbst (nur `dev/src/*.js`, keine `functions/`- oder Worker-API-Datei sichtbar) konnte ich keine tatsaechliche Implementierung des Auth-/Klassen-Systems finden - es scheint, das Konten-/Klassensystem ist bei SCL Quest bisher primaer **Konzept + Hosting-Vorbereitung (D1, Secrets)**, aber die App-Logik (Login-UI, Worker-Endpunkte, Passwort-Hashing-Code) war im durchsuchten Code nicht auffindbar. Falls dort doch schon etwas laeuft, das ich uebersehen habe, bitte kurz Bescheid geben - sonst entwerfen wir das Backend hier komplett neu und halten uns an das dokumentierte Rollenmodell.

**Fazit fuer Digital Quest:** Wir uebernehmen das Rollenmodell (Admin/Dozent/Schueler, Benutzername+Passwort, PBKDF2, Klassencode, Pseudonyme, Rate-Limiting) 1:1 wie bei SCL Quest dokumentiert, und entwerfen die Zuweisungs-/Abgabedatum-Funktion sowie die Uebungswerkstatt neu.

## Bausteine

### 1. Konten und Klassen (wie SCL Quest)
- Rollen: Admin (Worker-Secrets `ADMIN_USER`/`ADMIN_PASSWORD`, kein D1-Eintrag), Dozent (vom Admin angelegt), Schueler (vom Dozenten angelegt ODER Selbstregistrierung per Klassencode).
- Login: Benutzername + Passwort, PBKDF2-Hash (WebCrypto), Rate-Limiting bei Fehlversuchen.
- Klasse: gehoert einem Dozenten, hat einen Klassencode (fuer Selbstregistrierung), enthaelt Schueler.
- Schueler-Profil bleibt pseudonym (kein echter Name Pflicht) - bestehendes `profile {id, vorname, nachname, pseudonym}` im `localStorage` wird die lokale Fortschrittsbasis; Server-Konto kommt zusaetzlich dazu (Server ist "Quelle der Wahrheit" fuer Zuweisungen/Fristen, lokal bleibt es weiter offline spielbar ohne Konto - Konto ist optional/zusaetzlich, nicht Pflicht zum Spielen).

### 2. Zuweisungen (neu)
- Dozent waehlt in seiner Ansicht ein Kapitel ODER einzelne Aufgaben (Mehrfachauswahl) aus und weist sie einer Klasse oder einzelnen Schuelern zu.
- Jede Zuweisung hat optional ein Abgabedatum (`faelligAm`).
- Schueler sehen zugewiesene Kapitel/Aufgaben auf der Karte mit einem Hinweis "Vorgabe vom Dozent" (Badge/Icon) und - falls vorhanden - dem Abgabedatum; nach Ablauf farblich markiert ("ueberfaellig"), es wird aber nichts gesperrt (kein Bestrafungsmechanismus, nur Sichtbarkeit/Erinnerung).
- Dozentenansicht zeigt pro Zuweisung den Erledigungsstatus je Schueler (nutzt den bestehenden `events`/`done`-Fortschritt, jetzt serverseitig gespiegelt statt nur lokal).

### 3. Uebungswerkstatt (neues Kapitel/Bereich, nicht Teil der 15 Quest-Kapitel)
- Eigener Bereich neben der Kapitel-Karte ("Uebungswerkstatt" oder "Messwerkstatt frei"): fertige, gesperrte Schaltungen (Topologie und Bauteilwerte fix, wie `start`-Bauteile), bei denen die Aufgabe ausschliesslich das **Messen** ist (Multimeter, Oszilloskop) - kein Bauen/Verdrahten.
- Technisch: neue `defTask`-Variante ohne Bau-Anteil (`palette: []`, alle Bauteile in `start`), mit `measure`-Eintraegen wie gehabt; nutzt 1:1 die bestehende Engine/Werkbank - keine neuen Engine-Features noetig.
- Inhaltlich: Oszilloskop-Aufgaben zu Kurvenform/Frequenz/Amplitude/Phasenverschiebung, AC/DC-Messungen, ergaenzt bestehende Themen aus Kapitel 3 (AVG/RMS/TRMS) und Kapitel 14 (Frequenzgang) mit zusaetzlicher freier Uebung.
- Kann von Dozenten genauso zugewiesen werden wie normale Kapitel/Aufgaben (Baustein 2 gilt hier gleich).

## Infrastruktur-Aenderungen (neu, bisher bewusst nicht vorhanden)
- `wrangler.jsonc`: `d1_databases`-Block ergaenzen (eigene Digital-Quest-Datenbank, nicht die von SCL Quest mitbenutzen), Worker-Secrets `ADMIN_USER`/`ADMIN_PASSWORD` setzen.
- D1-Schema (neu, angelehnt an SCL Quest, aber ohne dessen Code kopieren zu koennen, da nicht auffindbar): Tabellen `dozenten`, `klassen`, `schueler`, `zuweisungen` (kapitel_id|aufgabe_id, klasse_id|schueler_id, faelligAm), `fortschritt` (Spiegel von `done`/`events`).
- Worker-API-Endpunkte (neu zu bauen): Login, Dozent legt Klasse/Schueler an, Dozent erstellt/verwaltet Zuweisungen, Schueler ruft eigene Zuweisungen + Fortschritt ab, Admin legt Dozenten an.
- Client: neuer Login-/Konto-Bereich in `app.js`, Sync-Logik zwischen `localStorage` (offline, bleibt Basis) und Server (Zuweisungen/Fristen/Fortschritt-Spiegel).

## Phasenplan
1. **D1-Schema + Worker-API-Grundgeruest**: Tabellen anlegen, Login-Endpunkt, Admin legt Dozent an (Server-seitig zuerst, ohne UI).
2. **Dozenten-/Admin-UI**: Login, Klasse anlegen, Schueler anlegen/Klassencode, Liste eigener Klassen.
3. **Zuweisungen**: Dozent waehlt Kapitel/Aufgaben, weist Klasse/Schueler zu, setzt Abgabedatum; Speicherung in D1.
4. **Schueler-Ansicht**: Login optional, "Vorgabe vom Dozent"-Badge + Abgabedatum auf der Karte, Fortschritt-Spiegelung an Server.
5. **Uebungswerkstatt**: neuer Kartenbereich, erste 8-10 messreine Aufgaben (Oszilloskop-Schwerpunkt), Validator-Erweiterung falls noetig.
6. **QA**: `validate.js`, `test_engine.js`, `tests/smoke.js` erweitern um Login-/Zuweisungs-Szenarien (so weit ohne echten Server automatisierbar, sonst manueller Testplan), `docs/STAND.md` aktualisieren.

## Offene Rueckfrage an Steven
Falls im SCL-Quest-Code doch schon eine Auth-/Worker-Implementierung existiert, die ich beim Durchsuchen uebersehen habe (z. B. in einem separaten, nicht ueber den Ordner sichtbaren Cloudflare-Projekt), bitte kurz Bescheid geben - dann uebernehmen wir den bestehenden Code statt neu zu entwerfen.

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

## Labor-Umsetzung (Entscheide beim Bau, 28.09.2026)
- **Werkbank-Stil**: Praktikums-Steckbausteine mit 4-mm-Buchsen auf einer Laborunterlage, Laborkabel mit Bananensteckern (Pluspol rot, Minuspol/Masse schwarz). Tisch um K = 0,8 geneigt; Messgeraete in Frontansicht (stehen aufrecht).
- **Lage pro Bauteil**: Werkbank-Lage liegt als `p.bench = {x, y, rot}` am Bauteil im Entwurf; Schema- und Werkbank-Lage sind unabhaengig, die Topologie ist gemeinsam.
- **Messgeraete fest rechts** auf der Unterlage (Multimeter oben, Oszilloskop unten), Flaeche fuer Bauteile reserviert. Das Oszilloskop nutzt vorerst die Multimeter-Spitzen als Kanal (wie im Panel).
- **Multimeter-Verfahren V~**: Standard TRMS; AVG als Wahl im Panel – der Unterschied ist der Lernmoment. Pruefung von Aufgaben nutzt immer exakte Werte, die Anzeige hat Kalibrierfehler und Flackern.
- **Zeitlupe**: Rechenschritte werden auf einer Zustandskopie mit zurueckgesetzten Dioden neu gesucht (sonst waere die LED "schon leitend" und es gaebe nichts zu sehen); Gatterzustaende bleiben, weil sie echtes Gedaechtnis sind.
- **Freie Werkbank**: Bauteile = alles aus freigeschalteten Aufgaben (Palette + Startaufbau), nicht der ganze Katalog – damit die Sandbox den Lernfortschritt nicht vorwegnimmt (Entwicklung: `?alle` = alles).

## Abschluss Kapitel 14/15, Karte und Auszeichnungen (Entscheide beim Bau, 29.09.2026)
- **Wechselgroessen mit Einschwingen**: `acMeasure` schaetzt die Zeitkonstanten grob aus groesstem bzw. kleinstem R · C der Schaltung. Liegt 5 · τ<sub>max</sub> ueber der Messdauer, wird vorher mit grobem Zeitschritt (T/40, hoechstens 3 s) eingeschwungen; die Abtastung wird so fein gewaehlt, dass auch kurze Nadeln (τ<sub>min</sub>) mindestens 20 Punkte bekommen. Gewaehlt statt Test-Schrittfolgen, weil auch das Messgeraet (V~, V⎓-Mittelwert) und die Messprotokolle davon profitieren.
- **Motor bleibt ohmsch** (Wicklungswiderstand, Drehzahl ~ Strom). Keine Induktivitaet und keine Gegen-EMK – die Freilaufdiode wird deshalb ueber die Polung geprueft (falsch gepolt = Ueberlast am Transistor), ihre Schutzwirkung beim Abschalten steht in der Theorie. Der Sanftanlauf ist ein RC-Glied mit zusaetzlichem Widerstand vor der Basis (echte Rampe statt nur Verzoegerung).
- **Not-Halt loescht die Selbsthaltung** (sitzt im Rueckfuehrungspfad). Die Variante "Not-Halt nur am Ausgang" ist bewusst als Falschloesung hinterlegt – sie fuehrt zum Wiederanlauf nach dem Entriegeln.
- **Karte nach Teilen I–IV** (`dev/src/content/_parts.js`, `DQ.parts`): I 1–4, II 5–8, III 9–10 (Grundstufe), IV 11–15 (Profi-Stufe), wie in `docs/THEMEN.md`. Der Validator prueft, dass jedes Kapitel genau einem Teil angehoert.
- **Auszeichnungen lokal und druckbar** (`DQ.awards`): Zertifikat Grundstufe nach Boss 10.10, Abzeichen Profi-Stufe nach Boss 15.10. Anzeige als Karte am Ende des Teils und im Erfolgsdialog der Boss-Aufgabe; eigene Seite mit Namensfeld (schreibt ins Profil) und Druck (A4 quer, nur die Urkunde). Datum = erster erfolgreicher Abschluss der Boss-Aufgabe aus der Ereignisliste; Ereignis `award` fuer die spaetere Auswertung. Keine Server-Beglaubigung – das gehoert zu "Klassen und Personen".
- **Limit-Hinweis**: `task.limit` wird automatisch als "Erlaubt: …" im Auftrag angezeigt, sofern der Auftragstext ihn nicht schon selbst enthaelt.
- **`tests/tasks.js` bedient wie ein Mensch**: Werte werden mit Vorsatz eingetippt (`100n`, `2.2m`), Generatoren im Startaufbau werden angeklickt und im Panel eingestellt, Anschluesse werden vor dem Anklicken ins Bild gescrollt.

## Dozentenmodus (Entscheid 29.09.2026)
- Lokal im Spielstand (`settings.teacher`), eingeschaltet in den Einstellungen mit einem festen Code. Der Code ist **kein Sicherheitsmerkmal** (die Offline-Datei ist lesbar), er verhindert nur das zufaellige Einschalten durch Lernende. Echte Rollen gehoeren zu "Klassen und Personen".
- Der Modus schaltet nur frei, er markiert nichts als erledigt – eine Lehrperson kann auf einem Schuelergeraet vorfuehren, ohne den Fortschritt zu verfaelschen.

## Hosting-Umgebung (Entscheid 28.09.2026, wie SPS/SCL Quest)
Gleiches Muster wie bei SCL Quest: eigenes GitHub-Repo + Cloudflare Worker (`wrangler.jsonc`, liefert `web/` als Website aus), per GitHub verbunden fuer Auto-Deploy bei Push. **Bewusst ohne D1-Datenbank/Klassen-Anbindung** – das gehoert zum zurueckgestellten Punkt "Klassen und Personen" oben und wird erst ergaenzt, wenn diese Funktion tatsaechlich gebaut wird. `wrangler.jsonc` liegt bereit (Worker-Name `digital-quest`). ~~Offen/braucht Stevens Aktion~~ – erledigt (28.09.2026): GitHub-Repo `digital-quest` angelegt und verbunden, Cloudflare-Login gemacht, Worker `digital-quest` mit dem GitHub-Repo verknuepft (Settings -> Builds). Push nach `main` deployt jetzt automatisch, siehe `docs/STAND.md`.

## Klassen, Zuweisungen und Uebungswerkstatt (Entscheid 29.09.2026, hebt Zurueckstellung auf)
Der Punkt "Klassen und Personen" (oben) und die bewusste Zurueckstellung der Plattform (siehe Hosting-Umgebung und "Offen" unten) sind hiermit aufgehoben – Steven moechte dies jetzt doch bauen: Admin/Dozent/Schueler/Klassen genau wie bei SCL Quest dokumentiert (Benutzername+Passwort, PBKDF2, Klassencode, Pseudonyme, Rate-Limiting), dazu neu: Dozent weist Kapitel oder einzelne Aufgaben einer Klasse oder Einzelperson zu, mit optionalem Abgabedatum; Schueler sehen das als "Vorgabe vom Dozent" auf der Karte. Zusaetzlich ein neuer Bereich "Uebungswerkstatt" mit fertigen, gesperrten Schaltungen nur zum Messen (Oszilloskop-Schwerpunkt). Die Zuweisungs-/Abgabedatum-Funktion existiert bei SCL Quest nicht zum Kopieren (in dessen Docs/Code nicht gefunden) – sie wird hier neu entworfen. Damit braucht `wrangler.jsonc` jetzt doch eine D1-Datenbank (bisher bewusst keine, siehe Hosting-Umgebung oben). Voller Plan: `docs/PLAN_KLASSEN_ZUWEISUNG.md`.

## Konten und Zuweisungen – Entscheide beim Bau (29.09.2026)
- **Token statt Cookie** (`Authorization: Bearer`, 30 Tage, in D1 nur der SHA-256): so kann auch die Offline-Datei (file://) die API nutzen; CORS offen, keine Cookies → kein CSRF-Risiko. PBKDF2-SHA-256 mit 100 000 Iterationen (Hoechstwert der Workers-Laufzeit).
- **Benutzernamen eindeutig ueber Dozenten und Schueler**; Anmeldung ohne Rollenwahl. Rate-Limiting in D1 (Tabelle `sperren`): 5 Fehlversuche in 15 min je Name und je Adresse, ebenso fuer das Raten von Klassencodes.
- **Zuweisung = ein Ziel an einen Empfaenger** (Klasse ODER Person), Frist optional; erneut zuweisen aendert nur die Frist. Der Server kennt keine Kapitelinhalte – den Erledigt-Status rechnet der Client aus dem gespiegelten Fortschritt.
- **Zugewiesene Stationen sind offen**, auch ausserhalb der normalen Reihenfolge (eine Vorgabe muss bearbeitbar sein). Fristen sperren nie, sie markieren nur "ueberfaellig".
- **Fortschritt-Spiegel als Vereinigung**: lokal bleibt die Basis; der Server ergaenzt, nichts wird lokal geloescht – ausser die Person waehlt bei fremdem Spielstand ausdruecklich "nur meinen Stand laden".
- **Dozenten-/Admin-Konto schaltet den Dozentenmodus ein**, Abmelden wieder aus (nur wenn er durch die Anmeldung eingeschaltet wurde).
- **Uebungswerkstatt** als eigener Bereich (`DQ.workshop`), nicht als 16. Kapitel: zaehlt nicht in Fortschritt, Freischaltung oder Auszeichnungen.
- **D1-Block in `wrangler.jsonc` erst nach dem gemeinsamen `wrangler d1 create`** – eine Platzhalter-ID wuerde den automatischen Build scheitern lassen; bis dahin antwortet die API mit 503.

## Portal wie SPS Quest (Entscheid Steven 29.09.2026, ersetzt "Dozentenmodus" und "Konten und Zuweisungen" oben)
- **Bedienung exakt wie SPS Quest**: Portal mit Halle und Toren, Login-Terminal, Leitstand, Administration, Live-Challenge, Zertifikat mit Pruefung, Anleitungen, Feedback-Knopf. Kein Pikettdienst. Leitfarbe Bernstein.
- **Dozentenmodus haengt am Konto** (Rolle teacher/admin). Die Code-Eingabe entfaellt; `?alle` bleibt fuer Tests. Ohne Verbindung gilt die zuletzt bekannte Rolle des Kontos, dem der Spielstand gehoert.
- **Cookie statt Token**: Sitzung `dq_sess` (HttpOnly, SameSite=Lax, Secure), Schreibzugriffe nur mit Header `x-dquest: 1`. Konten gibt es nur in der gehosteten Version; die Einzeldatei spielt lokal.
- **Ganzer Spielstand je Konto** statt Vereinigung einzelner Eintraege: einfacher, und die Lehrperson sieht Schaltungen und Messwerte. Echte Namen (Vor-/Nachname) werden vor dem Hochladen entfernt, der Server loescht sie zusaetzlich.

## Portal – Entscheide beim Bau (29.09.2026)
- **Stoerungsszenarien aus den `wrong`-Loesungen**: Jede benannte Falschloesung einer Aufgabe ist eine Stoerung; das Symptom ist die erste Pruefung, die daran scheitert. Die Ursache (Name der Falschloesung) sieht nur die Lehrperson. So entstehen die Szenarien ohne Zusatzaufwand und bleiben mit den Aufgaben aktuell.
- **Live-Challenge und Pruefung veraendern den Spielstand nicht** (keine Entwuerfe, kein "erledigt") – sonst gaebe die Stoerungsjagd Fortschritt fuer Aufgaben, die noch gesperrt sind.
- **Kachel-Symbole werden berechnet, nicht gepflegt** (`tiles.js`): praegendes Bauteil = das zuletzt eingefuehrte Bauteil der Musterloesung; bei Mess-, Fehlersuch- und Entwurfsthemen ein Piktogramm aus den Kompetenz-Tags. Neue Aufgaben bekommen ihr Symbol von selbst.
- **Sterne**: 3 = ohne Fehlversuch und ohne Tipp, 2 = hoechstens zwei Fehlversuche und ein Tipp, sonst 1. Nochmals loesen kann die Sterne verbessern, nie verschlechtern.
- **Pruefungsaufgaben sind eigene Vorlagen mit Parametern**, nicht die Aufgaben des Spiels (deren Musterloesungen liegen fuer den Beamer offen in `dq_live.json`). Der Pool steht nur im Worker. Die Theoriefragen stammen aus den Lektionen (vom Validator gegen die Engine geprueft), die Antworten werden je Pruefung gemischt.
- **Bewertung einer Abgabe**: sichtbare Tests + Messprotokoll + verdeckte Tests; alles richtig = 1 Punkt, sonst 60 % des Anteils bestandener Pruefpunkte. Die Rueckmeldung nennt die sichtbaren Pruefpunkte ohne Sollwerte und bei den verdeckten nur die Anzahl.
- **Schutz vor Manipulation**: Der Server stellt die Werte der vorgegebenen Bauteile wieder her (am Generator darf zum Messen gedreht werden), verlangt alle vorgegebenen Bauteile und Leitungen und weist Bauteile ab, die nicht in der Palette sind. Sollwerte des Messprotokolls rechnet der Server aus der abgegebenen Schaltung.
- **Im Spiel heissen beide Auszeichnungen "Abzeichen"** – "Zertifikat" ist dem geprueften Zertifikat aus dem Portal vorbehalten.
- **QR-Bibliothek ist freiwillig**: Fehlt `qrcode-generator` in `dev/node_modules`, baut der Build ohne QR-Code (Pruefcode und Adresse stehen trotzdem auf dem Zertifikat).
- **Der Pruefungspool liegt im Repository.** Solange das Repository oeffentlich ist, sind Vorlagen und Musterloesungen dort lesbar (wie bei SPS Quest). Wer das nicht will, macht das Repository privat.

## Technik
- Offline-Einzeldatei + PWA, keine externen Bibliotheken noetig (Google Fonts optional).
- Leitfarbe Bernstein `#ffb000`, Token-Namen wie SCL Quest.

## Offen
- ~~Themenliste und Kapitelplan~~ – erledigt, siehe `docs/THEMEN.md`.
- ~~Welt, Figuren, Name der Lernumgebung~~ – erledigt (Entscheid 28.09.2026): Name **Labor**, Begleitfiguren Laborassistenz (erklaert) / Laborchef/Werkmeisterin (fordert), siehe `docs/KONZEPT.md`. Konkrete Namen/Aussehen der Figuren noch offen, aber nicht blockierend.
- Plattform (Login/Klassen) – **Entscheid aufgehoben (29.09.2026)**: wird jetzt doch gebaut, siehe neuen Abschnitt "Klassen, Zuweisungen und Uebungswerkstatt" unten und `docs/PLAN_KLASSEN_ZUWEISUNG.md`.

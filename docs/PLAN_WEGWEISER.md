# Wegweiser – Inventar und Textentwurf (W0, 06.10.2026)

Auftrag: `docs/AUFTRAG_WEGWEISER_2026-10-06.md`. Geprüft am Code von `main` f514d6f (`portal.js renderTop()`, `P.nav.push` in `portal_anleitung.js`, `portal_avatar.js`, `portal_meldungen.js`, `portal_zertifikate.js`, `body.html` Benutzermenü, `GATES`, `index.template.html` Kopfzeile und Werkzeugleiste, `app.js` Aufgabenseite). **Kein Code vor Stevens OK.**

Rollen: **G** = Gast (ohne Konto), **L** = Lernende, **D** = Dozent/in, **A** = Admin. Reihenfolge = Reihenfolge im Menü.

## 1. Inventar

### Portal – Hauptmenü (Kopfzeile)

| Nr | Menüpunkt | Adresse | G | L | D | A | Quelle |
|---|---|---|---|---|---|---|---|
| 1 | Halle | `#/` | ✓ | ✓ | ✓ | ✓ | `renderTop` |
| 2 | Live-Challenge | `#/live` | – | ✓ | – | – | `renderTop` (nur student) |
| 3 | Leitstand | `#/leitstand` | – | – | ✓ | ✓ | `renderTop` (`canTeach`) |
| 4 | Avatar & Coins | `#/avatar` | – | ✓ | ✓ | ✓ | `portal_avatar.js` |
| 5 | Meldungen | `#/meldungen` | – | – | ✓ | ✓ | `portal_meldungen.js` |
| 6 | Zertifikate | `#/zertifikate` | – | ✓ | ✓ | – | `portal_zertifikate.js` |
| 7 | Administration | `#/admin` | – | – | – | ✓ | `renderTop` |
| 8 | Konto | `#/konto` | – | ✓ | ✓ | ✓ | `renderTop` |
| 9 | Anleitung | `#/anleitung` | ✓ | ✓ | ✓ | ✓ | `portal_anleitung.js` |

Neu durch diesen Auftrag: **Wegweiser** `#/wegweiser` direkt nach «Halle», für alle.

### Portal – Kopfzeile rechts, Halle, Fusszeile

| Nr | Element | Adresse / Aktion | G | L | D | A |
|---|---|---|---|---|---|---|
| 10 | Anmelden (Leitstand-Terminal: Anmelden / Klassencode) | `#/login`, `#/code` | ✓ | – | – | – |
| 11 | Benutzermenü (Pseudonym mit Avatar) | aufklappen | – | ✓ | ✓ | ✓ |
| 11a | · Mein Konto | `#/konto` | – | ✓ | ✓ | ✓ |
| 11b | · Leitstand (Klassen) | `#/leitstand` | – | – | ✓ | ✓ |
| 11c | · Live-Challenge beitreten | `#/live` | – | ✓ | – | – |
| 11d | · Administration | `#/admin` | – | – | – | ✓ |
| 11e | · Abmelden | Aktion | – | ✓ | ✓ | ✓ |
| 12 | Tor Labor | `labor/` | ✓ | ✓ | ✓ | ✓ |
| 13 | Tor Übungswerkstatt | `labor/?werkstatt=1` | ✓ | ✓ | ✓ | ✓ |
| 14 | Tor Freie Werkbank | `labor/?frei=1` | ✓ | ✓ | ✓ | ✓ |
| 15 | Schnellknöpfe in der Halle | L: «Live-Challenge beitreten»; D/A: «Leitstand öffnen», «Neue Live-Challenge» | – | ✓ | ✓ | ✓ |
| 16 | Anleitungs-Karten in der Halle | `#/anleitung/lernende`, `/dozenten`, `/admin` | ✓ | ✓ | ✓ | ✓ |
| 17 | Feedback / Fehler melden (💬 unten links) | Dialog | ✓ | ✓ | ✓ | ✓ |
| 18 | Fusszeile Impressum, Datenschutz | `impressum.html`, `datenschutz.html` | ✓ | ✓ | ✓ | ✓ |

Unterseiten (keine eigenen Menüpunkte, im Wegweiser als Satz beim Hauptpunkt): Leitstand → Klasse (`#/leitstand/klasse/ID`: Lernende, Vorgaben, Konten erzeugen, Zugangszettel) → Schüler/in (`#/leitstand/schueler/ID`: Fortschritt, Schaltungen); Live-Challenge → Neue Challenge (`#/live/neu`), Beamer (`#/beamer/ID`); Zertifikate → Prüfung ausstellen (`#/zertifikate/ausstellen/ID`), Prüfseite (`#/zertifikat/DQ-…`); Prüfung unter Aufsicht (`#/pruefung/ID`, Dozent).

### Labor – Kopfzeile (für alle gleich; Gäste spielen ohne Konto)

| Nr | Element | Aktion | Quelle |
|---|---|---|---|
| 20 | Logo DIGITAL QUEST | zur Karte (im Portal-Labor: Konto-Chip führt zur Halle) | `#brand` |
| 21 | Karte | `data-go="map"` | Kapitel, Teile I–V, Übungswerkstatt, Vorgaben, Sterne, Abzeichen |
| 22 | Handbuch | `data-go="manual"` | Bedienung, Konto, Live, Prüfung, Karte, Multimeter, Oszilloskop, Bauteile |
| 23 | Werkbank-Tutorial | `data-go="tutorial"` | Mini-Werkbank mit Übungsaufbau |
| 24 | Einstellungen | `data-go="settings"` | Design, Zoom, Stromfluss, Messverfahren, Spielstand |
| 25 | Taschenrechner | `#btnCalc` (Strg+Alt+R) | Overlay |
| 26 | Konto-Chip | `#acctChip` (nur Portal-Labor) | Angemeldet als … / Anmelden; Klick: Portal |
| 27 | Kennzeichen DOZENT | `#modeTag` | nur mit Dozenten-/Admin-Konto |
| 28 | Feedback / Fehler melden (💬) | Dialog | nur Portal-Labor |

### Labor – in einer Aufgabe (nur Wegweiser-Seite, nicht im Rundgang – Entscheidung 4 im Auftrag)

| Nr | Element | Zweck |
|---|---|---|
| 30 | Auftrag, Lernziel, Tipp 1 / Tipp 2 | Linke Spalte |
| 31 | «So stellst du das Gerät ein» | Einstellungs-Box je Messwert |
| 32 | ▶ Vorführen | Vorführ-Modus (zählt wie ein Tipp) |
| 33 | Messprotokoll | Werte eintragen, ✓ / ✗ / ○ je Wert, Aufdecken nach zwei Fehlversuchen |
| 34 | Prüfen | Tests und Protokoll, Sterne |
| 35 | Lösung ansehen | nach zwei gescheiterten Prüfungen |
| 36 | Werkzeugleiste | Drehen, Löschen, Einpassen, U anzeigen, Strom, Zeitlupe, Schaltplan/Werkbank, Reparieren, Neu |
| 37 | Bauteil-Palette und Eigenschaften | Bauteile hinzufügen, Werte ändern, Datenblatt ⓘ |
| 38 | Multimeter | OFF, V⎓, V~, A⎓, A~, Ω; AVG/TRMS; Bereichstasten |
| 39 | Oszilloskop | Bildbreite, Aufnahme/RUN, CH1/CH2, gross anzeigen ⤢, Kennwerte |

## 2. Textentwurf (Du-Form, ein Satz «Was finde ich hier?», ein Satz «Wann brauche ich das?»)

### Portal

| Eintrag | Was finde ich hier? | Wann brauche ich das? | Rollen |
|---|---|---|---|
| **Halle** | Die Startseite mit den drei Toren ins Labor, in die Übungswerkstatt und zur Freien Werkbank. | Immer dann, wenn du spielen oder zurück zum Anfang willst. | alle |
| **Wegweiser** (neu) | Diese Übersicht: jeder Menüpunkt mit Erklärung, Suche und dem Rundgang. | Wenn du dich zurechtfinden willst oder etwas nicht findest. | alle |
| **Live-Challenge** | Hier gibst du den vierstelligen Code vom Beamer ein und trittst der Challenge deiner Lehrperson bei. | Wenn im Unterricht eine Challenge läuft. | L |
| **Leitstand** | Deine Klassen: Konten erzeugen, Zugangszettel drucken, Fortschritt und Schaltungen jeder Person sehen, Vorgaben mit Frist setzen, Live-Challenge starten, Prüfung unter Aufsicht öffnen. | Für alles, was du als Lehrperson mit deiner Klasse machst. | D, A |
| **Avatar & Coins** | Dein Tier mit Farbe und Ausrüstung; Coins verdienst du durch gelöste Aufgaben, Theorie, Challenges und Zertifikate. | Wenn du deinen Avatar gestalten oder deinen Coin-Stand sehen willst. | L, D, A |
| **Meldungen** | Alle Feedback- und Fehlermeldungen, die über den Knopf 💬 geschickt wurden. | Wenn du nachsehen willst, was Lernende gemeldet haben. | D, A |
| **Zertifikate** | Die Prüfung für das Zertifikat Grundstufe oder Profi-Stufe, deine bestandenen Zertifikate und der Beitritt zu einer Prüfung unter Aufsicht. | Wenn du eine Stufe abgeschlossen hast und das Zertifikat willst. | L, D |
| **Administration** | Dozentenkonten anlegen, Startpasswörter zurücksetzen, Konten löschen, Übersicht der Zahlen. | Wenn eine Lehrperson ein Konto braucht oder ihr Passwort vergessen hat. | A |
| **Konto** | Passwort ändern, sehen, was deine Lehrperson sieht, Konto samt Spielstand löschen. | Wenn du dein Passwort wechseln oder dein Konto verwalten willst. | L, D, A |
| **Anleitung** | Schritt-für-Schritt-Anleitungen für Lernende, Dozenten und Admin. | Wenn du wissen willst, wie ein Ablauf von Anfang bis Ende geht. | alle |
| **Anmelden** | Das Leitstand-Terminal: mit Benutzername und Passwort anmelden oder mit dem Klassencode ein Konto anlegen. | Beim ersten Mal und auf jedem neuen Gerät. | G |
| **Benutzermenü** (oben rechts) | Dein Pseudonym mit Avatar; darunter Mein Konto, je nach Rolle Leitstand, Live-Challenge oder Administration, und Abmelden. | Zum schnellen Wechseln und zum Abmelden an geteilten Geräten. | L, D, A |
| **Tor Labor** | Die Quest mit 16 Kapiteln: bauen, messen, Theorie, Boss-Aufgaben, Abzeichen. | Dein Hauptweg durch Digital Quest. | alle |
| **Tor Übungswerkstatt** | Zehn fertige Schaltungen, an denen du nur misst – Multimeter und Oszilloskop. | Wenn du das Messen üben willst, ohne zu bauen. | alle |
| **Tor Freie Werkbank** | Bauen und messen ohne Auftrag, mit allen bereits freigeschalteten Bauteilen. | Zum Ausprobieren eigener Ideen. | alle |
| **Feedback / Fehler melden** (💬) | Ein kurzes Feedback oder eine Fehlermeldung an die Entwicklung, mit deiner aktuellen Ansicht. | Wenn etwas nicht stimmt oder dir etwas fehlt. | alle |
| **Impressum, Datenschutz** | Wer die Seite betreibt und welche Daten gespeichert werden. | Wenn du wissen willst, was mit deinen Daten passiert. | alle |

### Labor

| Eintrag | Was finde ich hier? | Wann brauche ich das? |
|---|---|---|
| **Karte** | Alle Kapitel in den Teilen I–V, die Übungswerkstatt, deine Sterne, Abzeichen und die Vorgaben deiner Lehrperson. | Immer, wenn du eine Aufgabe oder Theorie auswählen willst. |
| **Handbuch** | Bedienung, Konto, Live-Challenge, Prüfung, Karte, Multimeter, Oszilloskop und Bauteile zum Nachschlagen. | Wenn du nicht mehr weisst, wie etwas geht. |
| **Werkbank-Tutorial** | Eine kleine Übungs-Werkbank: Messspitzen ziehen, Messart wählen, Bereich einstellen, Oszilloskop mit Tastkopf und Erdungsclip. | Vor der ersten Messaufgabe oder wenn das Messen hakt. |
| **Einstellungen** | Design, Schriftgrösse und Zoom, Stromfluss-Anzeige, Messverfahren AVG/TRMS, Spielstand sichern oder zurücksetzen. | Wenn du das Labor an dich anpassen willst. |
| **Taschenrechner** | Ein Rechner als Fenster über dem Spiel, mit Wurzel, Potenzen und Winkelfunktionen. | Für Rechenwerte im Messprotokoll. |
| **Konto-Chip** | Zeigt, ob du angemeldet bist; ein Klick führt ins Portal. | Wenn du prüfen willst, ob dein Fortschritt im Konto gespeichert wird. |
| **Logo** | Zurück zur Karte. | Von überall im Labor. |

### In einer Aufgabe

| Eintrag | Was finde ich hier? | Wann brauche ich das? |
|---|---|---|
| **Auftrag und Tipps** | Links der Auftrag, das Lernziel und zwei Tipps; Tipps kosten Sterne. | Wenn du nicht weiterkommst. |
| **So stellst du das Gerät ein** | Für jeden Messwert: Schalterstellung, Messart, Anschlüsse, Bildbreite. | Vor jeder Messung. |
| **Vorführen** | Das Labor zeigt an einem Messwert, wie gemessen wird – Spitzen gleiten selbst. | Wenn du eine Messung einmal sehen willst; zählt wie ein Tipp. |
| **Messprotokoll** | Hier trägst du deine Messwerte ein; jeder Wert wird einzeln geprüft. | Bei jeder Messaufgabe. |
| **Prüfen** | Prüft Schaltung und Protokoll und vergibt Sterne. | Wenn du fertig bist. |
| **Werkzeugleiste** | Drehen, Löschen, Einpassen, Spannungen und Stromfluss anzeigen, Zeitlupe, Wechsel Schaltplan/Werkbank, Reparieren, Neu. | Beim Bauen und Verstehen. |
| **Multimeter** | Messart OFF, V⎓, V~, A⎓, A~, Ω; Verfahren AVG oder TRMS; auf der Werkbank Spitzen ziehen, im Schaltplan Anschlüsse anklicken. | Für Spannung, Strom und Widerstand. |
| **Oszilloskop** | Spannung über die Zeit: Bildbreite wählen, Aufnahme/RUN, zwei Kanäle, gross anzeigen; darunter die Kennwerte. | Für Wechselgrössen, Lade- und Taktsignale. |

### Häufige Wege (Direktlinks auf der Wegweiser-Seite)

| Frage | Ziel | Rollen |
|---|---|---|
| Wo sehe ich meine Vorgaben? | Labor → Karte (oben «Vorgaben vom Dozent») | L |
| Wo ändere ich mein Passwort? | Konto | L, D, A |
| Wie trete ich einer Live-Challenge bei? | Live-Challenge | L |
| Wo finde ich mein Zertifikat? | Zertifikate | L, D |
| Wo übe ich das Messen? | Tor Übungswerkstatt, Werkbank-Tutorial | alle |
| Wie bekomme ich ein Konto? | Anmelden → Klassencode | G |
| Wo lege ich eine Klasse an? | Leitstand → Neue Klasse | D |
| Wo starte ich eine Prüfung unter Aufsicht? | Leitstand → Klasse → Prüfung | D |
| Wo sehe ich die Schaltungen meiner Lernenden? | Leitstand → Klasse → Schüler/in | D |
| Wo lege ich ein Dozentenkonto an? | Administration | A |

## 3. Offene Fragen an Steven (Abschnitt 5 des Auftrags, Empfehlung fett)

1. Seite **und** Rundgang (**beides**, Seite zuerst)?
2. Name **«Wegweiser»**, Untertitel «Wo finde ich was?»?
3. Erster Besuch: **dezente Frage, einmal** – oder nichts?
4. Aufgaben-Oberfläche **nur als Abschnitt der Seite**, nicht im Rundgang?
5. Texte oben: Tonlage und Länge in Ordnung? Änderungswünsche je Zeile.

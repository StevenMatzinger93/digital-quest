# Mindmap Digital Quest (Mermaid)

Stand 01.10.2026, aus dem Code ausgelesen (dev/src, worker, wrangler.jsonc). Dieselbe Struktur interaktiv: `docs/mindmap-digital-quest.html`.
Als „unklar“ markiert ist, was der Code nicht eindeutig zeigt.

```mermaid
mindmap
  root((Digital Quest))
    (E-Learning-Inhalte ［Labor］)
      Aufbau der Lernwelt
        Karte in 5 Teilen ［DQ.parts］, Stationen in fester Reihenfolge; nächste Station wird frei, wenn die vorherige erledigt ist ［Dozentenkonto / ?alle: alles offen］
        168 Aufgaben, 33 Theorien, 30 Bauteil-Datenblätter ［Zahlen live aus der Engine］
        Theorie-Station = Lektion ［HTML, Visuals, Merksatz-Box, Vorlesen］ + Check mit 5 Fragen, 80 % zum Bestehen
        Aufgaben-Station = Auftrag ［Story, Brief, Lernziel］, Schaltung bauen und/oder messen, Tipp 1 / Tipp 2, Prüfen; Sterne: 3 ［1. Versuch ohne Tipp］, 2 ［≤ 3 Versuche, ≤ 1 Tipp］, sonst 1
        Zwei Ansichten derselben Schaltung: Schaltplan ［IEC, Raster 20 px］ und 2.5D-Werkbank – jede Aufgabe ist in beiden lösbar ［tests/tasks.js］
      Teil I · Elektrotechnische Grundlagen ［Grundstufe］
        Kap. 1 Stromkreis und Ohmsches Gesetz – 10 Aufgaben; T1A Der Stromkreis, T1B Ohmsches Gesetz und Vorwiderstand
        Kap. 2 Reihen- und Parallelschaltung – 10 Aufgaben; T2A Reihenschaltung, T2B Parallelschaltung, Knotenregel, Spannungsteiler
        Kap. 3 Gleich- und Wechselgrössen – 10 Aufgaben; T3A Gleich- und Wechselgrössen, T3B Gleichrichtwert, Effektivwert, AVG und TRMS
        Kap. 4 Messtechnik – 10 Aufgaben; T4A Messen, Prüfen, Messgeräte, T4B Genauigkeit und Messfehler
      Teil II · Digitaltechnik Grundlagen ［Grundstufe］
        Kap. 5 Zahlensysteme – T5A Stellenwertsystem und Dualzahlen, T5B Hexadezimal, BCD, Horner
        Kap. 6 Grundgatter – T6A UND, ODER, NICHT; T6B NAND, NOR, XOR, XNOR
        Kap. 7 Boolesche Algebra – T7A Gesetze, T7B De Morgan und normierte Schaltungen
        Kap. 8 Schaltungsentwurf und KV-Diagramm – T8A Wahrheitstabelle → Schaltung, T8B KV-Diagramm
      Teil III · Kombinatorik und Anzeigen ［Grundstufe, Abzeichen］
        Kap. 9 Codes, Datenwege und Rechenwerke – T9A Codes und Parität, T9B Multiplexer, Komparator, Addierer
        Kap. 10 Anzeigen und komplexe Kombinatorik – T10A 7-Segment, T10B Entwurf komplexer Schaltungen
        Boss 10.10 → Abzeichen Grundstufe ［DQ.awards.grund, Kapitel 1–10］
      Teil IV · Zeitverhalten und Praxis ［Profi-Stufe, Abzeichen］
        Kap. 11 RC-Glied und Taktgeber – T11A Laden und Entladen, T11B RC-Glieder in Schaltungen
        Kap. 12 Flipflops und Zähler – T12A Das Flipflop, T12B Zähler
        Kap. 13 Diode, Z-Diode und Transistor – T13A Diode und Z-Diode, T13B Der Transistor
        Kap. 14 RC-Filter und Frequenzgang – T14A Frequenzgang und Dezibel, T14B Bandpass, Bandsperre, Signalformung
        Kap. 15 Anwendungsprojekt Antriebsstation – T15A Die Antriebsstation, T15B Steuerung und Sicherheit
        Boss 15.10 → Abzeichen Profi-Stufe ［Kapitel 11–15］
      Teil V · Vertiefung Messtechnik
        Kap. 16 Messtechnik-Erweiterung – 8 Aufgaben, 3 Theorien: T16A Analoge Messwerke, T16B Sinnbilder und Messkategorien, T16C Genauigkeit vertieft
        Öffnet nach Aufgabe 4.10 ［defChapter after］, zählt nicht zu Abzeichen oder Zertifikat
        Alle 8 Aufgaben mit measureUX „drag“: Messspitzen ziehen, eigener Tastkopf, Messbereich von Hand
      Ausserhalb der Kapitel
        Übungswerkstatt W1–W10 ［immer offen, nur messen］: Teilspannung am Sinus, Rechteck mit Gleichanteil, Dreieck AVG/TRMS, Periodendauer, Einweggleichrichter, Tiefpass an fg, Kondensator sperrt DC, Mischspannung, Z-Diode kappt Sinus, Taktsignal
        Freie Werkbank ［Sandbox］: alle bereits freigeschalteten Bauteile, ohne Auftrag
        Werkbank-Tutorial: 7 Schritte an einer echten Mini-Werkbank ［Spitzen ziehen, Messart, Bereich/OL, Tastkopf, RUN］
        Taschenrechner-Overlay ［DQCalc］, Handbuch, Einstellungen ［Theme, Zoom, Messverfahren AVG/TRMS］
      Messinstrumente
        Multimeter ［Panel und Werkbank-Gerät „DQ-6000“］
          Messarten: OFF · V⎓ · V~ · A⎓ · Ω ［Drehschalter］; V~ nach Einstellung als AVG ［Mittelwert × 1,11］ oder TRMS
          Bereiche AUTO ［6000 Digit］: V 600 mV / 6 / 60 / 600 / 1000 V; A 600 µA / 6 / 60 / 600 mA / 6 / 10 A; Ω 600 Ω … 40 MΩ
          Bereiche von Hand ［nur drag］: V 0,2 / 2 / 20 / 200 / 600 V; A 200 µA … 10 A; Ω 200 Ω … 20 MΩ; zu klein → OL
          Realismus: Kalibrierfehler +0,2 %, letzte Stelle ±1 Digit; Prüfung rechnet immer mit exakten Werten
          Innenleben: V = 10 MΩ parallel; A = 0,1 Ω Shunt, Sicherung 10 A ［FUSE］; Ω nur spannungsfrei, Prüfstrom 1 mA, > 40 MΩ = OL
          Deckt ab: Spannung, Strom, Widerstand, Wechselgrössen, Messbereich, Genauigkeit, Eigenverbrauch/Systemfehler ［Kap. 1–4, 16, Werkstatt; 84 Aufgaben mit Messprotokoll］
        Oszilloskop
          Eingang: drag → eigener Tastkopf CH1 + Erdungsclip; legacy → liest die Multimeter-Spitzen
          Bildbreite wählbar ［z. B. 10 / 40 ms］, RUN, Anzeige von max/min; Kurve aus der Zeitsimulation ［E.acMeasure / step］
          Deckt ab: Kurvenformen, Periodendauer/Frequenz, Gleichrichtung, Laden/Entladen, Filter, Takt ［Kap. 3, 11, 13, 14, 16, Werkstatt］
        Weitere Anzeigen: Amperemeter als Bauteil ［ammeter］, Logikanzeige ［logicled］, 7-Segment ［seg7］, Stromfluss-Anzeige, Spannungsfarben
        Analoge Messwerke ［Drehspul, Dreheisen］ nur als Theorie mit Animation in T16A – kein Engine-Bauteil
        Zeitlupe ［Replay der Rechenschritte］ und Diagnose aus echten Werten ［Störungen mit Ist-/Grenzwerten］
      Engine ［DQEngine, ohne DOM］
        Knotenanalyse, Quellen als Norton-Ersatz, Dioden/LEDs stückweise linear, Gatter 5-V-Logik ［Gauss-Seidel］, Kondensator Backward Euler, Wechselquelle sine/square/triangle
        30 Bauteiltypen: ground, battery, resistor, pot, lamp, switch, button, led, diode, capacitor, ammeter, clock, acsource, not, and, or, nand, nor, xor, xnor, logicin, logicled, seg7, dec7, dff, jkff, tff, npn, zener, motor
        Störungscodes: SHORT, LED_BURNT, LED_REVERSE, OVERLOAD, LAMP_BURNT, AMMETER_OVERLOAD, UNSTABLE, NO_GROUND, OUTPUT_CLASH, FUSE
        Aufgabenprüfung runTask: tests ［Schrittfolgen, expect］, measure ［Protokoll mit Toleranz］, wrong-Lösungen, limit, need
      Theorie-Bausteine ［DQVisuals］
        circuit ［Mini-Schaltung mit Reglern/Anzeigen/Scope］, numberSteps ［gray, divide, bases, dmm］, kmap, bode, block ［SVG］
        Nur Kapitel 16: meterwork ［Messwerk-Animation mit Vorhersage-Frage］, worked ［Musterbeispiele mit Fading］
      Kompetenz-Tags ［Pflicht je Aufgabe］
        Gruppen: elektro.*, digital.*, messen.*, bauteil.*, antrieb.*, steuerung.*, sicherheit.*, werkstatt – Grundlage für Prüfungsvorlagen und spätere Auswertung
    (Administration ［Portal］)
      Rollen und Rechte ［worker/index.js: admin, teacher, student］
        admin – Konto aus den Worker-Secrets ADMIN_USER/ADMIN_PASSWORD; legt Dozenten an/löscht sie, sieht Statistik ［Dozenten, Klassen, Lernende, Spielstände］, alle Zertifikate, vergibt Prüfungsguthaben; kann selbst Klassen führen
        teacher ［Dozent/in］ – Leitstand: eigene Klassen, Konten, Vorgaben, Live-Challenges, Prüfungssitzungen, Meldungen, Zertifikate der eigenen Klassen; im Labor alle Stationen offen ［Dozentenmodus］
        student ［Schüler/in］ – Labor mit Konto-Abgleich, Konto, Live-Challenge beitreten, Prüfung ablegen, eigene Zertifikate
        „Klassensprecher“ und „Kunden“: im Code nicht vorhanden – unklar, ob geplant
        Schreibzugriffe nur mit Header x-dquest: 1 ［CSRF-Schutz］, Sitzung als Cookie dq_sess ［HttpOnly, SameSite=Lax］
      Leitstand ［#/leitstand, portal_leitstand.js］
        Klassen anlegen, umbenennen, löschen; Klassencode für die Selbstanmeldung
        Konten erzeugen ［Startpasswort, Pflichtwechsel beim ersten Login］, Zugangszettel drucken, Passwort zurücksetzen
        Fortschritt je Lernender ［summary aus progress］, Klick auf Aufgabe zeigt Schaltung ［Lösung oder Entwurf］ und Messwerte
        Vorgaben: Kapitel oder Station an Klasse oder Person, optional mit Frist; sperrt nichts, Erinnerung oben auf der Karte
      Administration ［#/admin, nur admin］
        Neuer Dozent, Dozentenliste mit Klassen/Lernenden, KPIs, Dozent löschen ［mit Klassen］
        Prüfungsguthaben vergeben ［POST /api/admin/exam-credits an Person oder Klasse］, alle Zertifikate einsehen
      Live-Challenge ［worker/challenge.js, portal_live.js, labor/?live=ID］
        Modi: sprint ［eine Aufgabe auf Zeit］ und bug ［Störungsjagd an einem Szenario aus dq_live.json, 88 Szenarien］
        Dauer 60–3600 s, Beitritt per Code, Zustände lobby/running/ended, Punkte und Rangliste; Spielstand bleibt unberührt
      Prüfung und Zertifikat ［exam.js, cert.js, exam_core.js］
        Regeln: Grundstufe 5 Aufgaben + 10 Fragen, 60 min, Kap. 1–10; Profi 4 Aufgaben + 10 Fragen, 75 min, Kap. 11–15 ［Profi erst mit Grund-Zertifikat］
        Bewertung: Aufgaben 70 %, Theorie 30 %; bestanden ≥ 70 %, Auszeichnung ≥ 90 %; Pool G01–G11, P01–P10 mit Parametern ［Ziehung mit Seed］
        Prüfungssitzung durch Dozent ［Code, offen von/bis］; Start verbraucht ein Guthaben; Entwürfe lokal in dq_exam_<ID>
        Zertifikat mit Code, öffentlich prüfbar unter /z/Code ［serverseitig, Open-Graph］; zurückziehen/widerrufen möglich; QR-Code optional ［Bibliothek bewusst nicht installiert］
      Meldungen ［worker/reports.js］: Feedback-Knopf in Portal und Labor, Typ „Feedback“ oder „Fehler“, mit Kontext; Liste für Dozenten/Admin
      Anleitungen ［#/anleitung］, Impressum, Datenschutz
    (Studenten / Lernende)
      Zugang
        Ohne Konto: Labor sofort im Browser, offline ［Service Worker］, Spielstand nur lokal
        Mit Konto: Klassencode vom Dozenten → Selbstregistrierung ［#/code/…］ mit Pseudonym + Passwort, oder vom Dozenten erzeugtes Konto mit Startpasswort
        Datensparsam: keine E-Mail, keine echten Namen; Vor-/Nachname fürs Zertifikat bleibt nur im Browser
        Login-Sperre: 5 Fehlversuche je Benutzer, 40 je IP, 15 Minuten; Passwörter PBKDF2-SHA-256 ［100 000 Runden］
      Ablauf
        Halle ［Portal］ → Tor „Labor“ → Karte mit Teilen I–V, Werkstatt, Freie Werkbank
        Station öffnen → Auftrag lesen → bauen ［Palette, Drehen, Leitungen］ und/oder messen → Messprotokoll ausfüllen → Prüfen; Tipps kosten Sterne
        Theorie: Lektion mit Visuals lesen → „Verstanden – zum Check“ → 5 Fragen
        Boss 10.10 / 15.10 → Abzeichen-Bildschirm; Vorgaben der Lehrperson erscheinen oben auf der Karte
        Live-Challenge über Code beitreten ［labor/?live=ID］; Prüfung über Portal starten ［labor/?exam=ID］ → Zertifikat unter „Zertifikate“
      Fortschritt
        localStorage digitalquest_state_v1: profile ［UUID, Vorname, Nachname, Pseudonym］, done, doneInfo {at, tries, hints, stars}, drafts, theory, events, settings
        Mit Konto: Abgleich PUT /api/progress/dq mit base-Zeitstempel; bei 409 gilt der weitere Stand; offline bleibt „dirty“ und wird später übertragen; Konten werden nie gemischt
        Dozent sieht Fortschritt, Sterne und Schaltungen ［Entwürfe］; Lernende können Konto und Spielstand selbst löschen ［DELETE /api/me］
        Live-Challenge und Prüfung verändern den Spielstand nicht
    (Technik)
      Frontend ［dev/src, Vanilla JS + SVG, kein Framework］
        build.js erzeugt: index.html ［Einzeldatei, offline］, web/index.html ［Portal］, web/labor/ ［Spiel mit Konto-Abgleich］, web/data/dq.json + dq_live.json, web/sw.js, worker/gen/exam_bundle.js
        Spiel: engine.js, circuit-ui.js ［Interaktionskern］, editor.js ［Schaltplan］, bench.js ［Werkbank］, app.js, visuals.js, mini.js, tiles.js, calc.js, account.js, live.js, exam.js
        Portal: portal.js ［Halle, Terminal, Konto, Admin］ + portal_leitstand/_live/_pruefung/_zertifikate/_anleitung/_meldungen.js, report.js
        Inhalte: content/ch01–ch16.js, werkstatt.js, datasheets.js, _parts.js, _logic.js, manual.js; Prüfungspool content_exam/pool.js ［nur Worker/Tests］
      Hosting ［Cloudflare］
        Worker „digital-quest“ ［wrangler.jsonc］: main = worker/index.js, Assets aus web/, run_worker_first für /api/* und /z/*
        D1-Datenbank „digitalquest“ ［eigene, Region EEUR］, Binding DB; Secrets ADMIN_USER / ADMIN_PASSWORD
        GitHub StevenMatzinger93/digital-quest, Branch main → Deploy auf digital-quest.steven-matzinger93.workers.dev
        Deploy-Auslöser: laut Doku jeder Push auf main; die Verknüpfung ［Workers Builds / Git-Integration］ liegt ausserhalb des Repos – unklar
      Backend ［worker/］
        index.js: /api/health, login, logout, register, class-info, me ［+password, notice, display-name, DELETE］, progress/:quest GET/PUT, admin/teachers, admin/stats, classes ［+PATCH/DELETE, students, reset］
        assign.js /api/assignments · challenge.js /api/challenges, /api/live/join · reports.js /api/reports · exam.js /api/exams, /api/exam-sessions · cert.js /api/certificates, /api/admin/certificates, /api/admin/exam-credits, /z/:code
        Sitzung: Cookie dq_sess ［HttpOnly, SameSite=Lax, Secure］, Header x-dquest für POST/PUT/PATCH/DELETE; Login-Sperre in Tabelle attempts
        Prüfungsbewertung im Worker mit gen/exam_bundle.js ［Engine + Pool, vom Build erzeugt］
      Datenspeicherung ［D1, Migrationen in db.js］
        Tabellen: users, sessions, attempts, classes, progress, assignments, challenges, challenge_players, exams, exam_answers, exam_sessions, exam_credits, certificates, feedback_reports, migrations
        progress: ein JSON-Spielstand + summary je Nutzer und Quest ［„dq“］; Entwürfe der Lernenden darin enthalten
        Im Browser: digitalquest_state_v1, dquest_sync_dq, dquest_vorgaben_dq, dq_exam_<ID>
      Offline und Zusammenspiel
        sw.js: Portal und Labor im Cache ［dquest-<Version>］, /api/ und /z/ nie aus dem Cache; Cache-Version aus dem Build
        Labor ↔ account.js ↔ /api/me, /api/progress/dq, /api/assignments/mine; Portal-Seiten ↔ /api/*; Live und Prüfung ↔ eigene Routen
        Lokal statt Cloudflare: tests/apiroute.js hängt Worker + D1-Nachbau ［node:sqlite, tests/d1mock.js］ unter https://dq.test in den Testbrowser
      Qualitätssicherung
        validate.js ［Inhalte］, validate_exam.js ［Pool］, test_engine.js ［107］, test_api.js ［115］, test_exam_api.js ［89］, tests/smoke.js, tests/tasks.js ［jede Aufgabe in beiden Ansichten］, tests/portal.js ［Playwright/Chromium］
```

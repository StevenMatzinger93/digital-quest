/* Digital Quest – Wegweiser (Auftrag 06.10.2026, W1): gemeinsame Textquelle für die Wegweiser-Seite («Wo finde ich was?»)
 * im Portal und im Labor sowie für den geführten Rundgang. Wird vom Build in Portal UND Labor eingebunden (window.DQWegweiser).
 * Regel (Validator): jeder Menüpunkt des Portals (P.nav / renderTop) und jeder data-go-Knopf der Labor-Kopfzeile braucht hier einen Eintrag.
 * Felder: id, bereich ('portal' | 'labor' | 'aufgabe'), icon, titel, text («Was finde ich hier?»), wann («Wann brauche ich das?»),
 *   href (Portal-Adresse oder Datei), go (Labor data-go), sel (Element für den Rundgang), rollen (fehlt = alle: gast, student, teacher, admin),
 *   portalOnly (nur im Portal-Labor), tour: false (kein Rundgang-Schritt). Texte: Du-Form, echte Umlaute, ss statt ß. */
(function (root) {
  'use strict';
  var ANGEMELDET = ['student', 'teacher', 'admin'];
  var items = [
    /* ---- Portal: Hauptmenü in Menü-Reihenfolge ---- */
    { id: 'halle', bereich: 'portal', icon: '🏛️', titel: 'Halle', href: '#/',
      text: 'Die Startseite mit den drei Toren ins Labor, in die Übungswerkstatt und zur Freien Werkbank.', wann: 'Immer dann, wenn du spielen oder zurück zum Anfang willst.' },
    { id: 'wegweiser', bereich: 'portal', icon: '🧭', titel: 'Wegweiser', href: '#/wegweiser',
      text: 'Diese Übersicht: jeder Menüpunkt mit Erklärung, Suche und dem Rundgang.', wann: 'Wenn du dich zurechtfinden willst oder etwas nicht findest.' },
    { id: 'live', bereich: 'portal', icon: '⚡', titel: 'Live-Challenge', href: '#/live', rollen: ['student'],
      text: 'Hier gibst du den vierstelligen Code vom Beamer ein und trittst der Challenge deiner Lehrperson bei.', wann: 'Wenn im Unterricht eine Challenge läuft.' },
    { id: 'leitstand', bereich: 'portal', icon: '🎛️', titel: 'Leitstand', href: '#/leitstand', rollen: ['teacher', 'admin'],
      text: 'Deine Klassen: Konten erzeugen, Zugangszettel drucken, Fortschritt und Schaltungen jeder Person sehen, Vorgaben mit Frist setzen, Live-Challenge starten, Prüfung unter Aufsicht öffnen.', wann: 'Für alles, was du als Lehrperson mit deiner Klasse machst.' },
    { id: 'avatar', bereich: 'portal', icon: '🦊', titel: 'Avatar & Coins', href: '#/avatar', rollen: ANGEMELDET,
      text: 'Dein Tier mit Farbe und Ausrüstung; Coins verdienst du durch gelöste Aufgaben, Theorie, Challenges und Zertifikate.', wann: 'Wenn du deinen Avatar gestalten oder deinen Coin-Stand sehen willst.' },
    { id: 'meldungen', bereich: 'portal', icon: '💬', titel: 'Meldungen', href: '#/meldungen', rollen: ['teacher', 'admin'],
      text: 'Alle Feedback- und Fehlermeldungen, die über den Knopf 💬 geschickt wurden.', wann: 'Wenn du nachsehen willst, was Lernende gemeldet haben.' },
    { id: 'zertifikate', bereich: 'portal', icon: '🎓', titel: 'Zertifikate', href: '#/zertifikate', rollen: ['student', 'teacher'],
      text: 'Die Prüfung für das Zertifikat Grundstufe oder Profi-Stufe, deine bestandenen Zertifikate und der Beitritt zu einer Prüfung unter Aufsicht.', wann: 'Wenn du eine Stufe abgeschlossen hast und das Zertifikat willst.' },
    { id: 'admin', bereich: 'portal', icon: '🛠️', titel: 'Administration', href: '#/admin', rollen: ['admin'],
      text: 'Dozentenkonten anlegen, Startpasswörter zurücksetzen, Konten löschen, Übersicht der Zahlen.', wann: 'Wenn eine Lehrperson ein Konto braucht oder ihr Passwort vergessen hat.' },
    { id: 'konto', bereich: 'portal', icon: '👤', titel: 'Konto', href: '#/konto', rollen: ANGEMELDET,
      text: 'Passwort ändern, sehen, was deine Lehrperson sieht, Konto samt Spielstand löschen.', wann: 'Wenn du dein Passwort wechseln oder dein Konto verwalten willst.' },
    { id: 'anleitung', bereich: 'portal', icon: '📖', titel: 'Anleitung', href: '#/anleitung',
      text: 'Schritt-für-Schritt-Anleitungen für Lernende, Dozenten und Admin.', wann: 'Wenn du wissen willst, wie ein Ablauf von Anfang bis Ende geht.' },
    /* ---- Portal: Kopfzeile rechts, Halle, Fusszeile ---- */
    { id: 'anmelden', bereich: 'portal', icon: '🔑', titel: 'Anmelden', href: '#/login', sel: '#loginBtn', rollen: ['gast'],
      text: 'Das Leitstand-Terminal: mit Benutzername und Passwort anmelden oder mit dem Klassencode ein Konto anlegen.', wann: 'Beim ersten Mal und auf jedem neuen Gerät.' },
    { id: 'benutzermenue', bereich: 'portal', icon: '🪪', titel: 'Benutzermenü', sel: '#userBtn', action: 'usermenu', rollen: ANGEMELDET,
      text: 'Dein Pseudonym mit Avatar; darunter Mein Konto, je nach Rolle Leitstand, Live-Challenge oder Administration, und Abmelden.', wann: 'Zum schnellen Wechseln und zum Abmelden an geteilten Geräten.' },
    { id: 'tor-labor', bereich: 'portal', icon: '🔬', titel: 'Tor Labor', href: 'labor/', sel: '.gate[data-q="labor"]',
      text: 'Die Quest mit 16 Kapiteln: bauen, messen, Theorie, Boss-Aufgaben, Abzeichen.', wann: 'Dein Hauptweg durch Digital Quest.' },
    { id: 'tor-werkstatt', bereich: 'portal', icon: '🧰', titel: 'Tor Übungswerkstatt', href: 'labor/?werkstatt=1', sel: '.gate[data-q="werkstatt"]',
      text: 'Zehn fertige Schaltungen, an denen du nur misst, mit Multimeter und Oszilloskop.', wann: 'Wenn du das Messen üben willst, ohne zu bauen.' },
    { id: 'tor-frei', bereich: 'portal', icon: '🪛', titel: 'Tor Freie Werkbank', href: 'labor/?frei=1', sel: '.gate[data-q="frei"]',
      text: 'Bauen und messen ohne Auftrag, mit allen bereits freigeschalteten Bauteilen.', wann: 'Zum Ausprobieren eigener Ideen.' },
    { id: 'feedback', bereich: 'portal', icon: '💬', titel: 'Feedback / Fehler melden', sel: '#spsqRpBtn', action: 'feedback',
      text: 'Ein kurzes Feedback oder eine Fehlermeldung an die Entwicklung, mit deiner aktuellen Ansicht.', wann: 'Wenn etwas nicht stimmt oder dir etwas fehlt.' },
    { id: 'rechtliches', bereich: 'portal', icon: '§', titel: 'Impressum, Datenschutz', href: 'datenschutz.html', href2: 'impressum.html', sel: '.foot', tour: false,
      text: 'Wer die Seite betreibt und welche Daten gespeichert werden.', wann: 'Wenn du wissen willst, was mit deinen Daten passiert.' },
    /* ---- Labor: Kopfzeile ---- */
    { id: 'karte', bereich: 'labor', icon: '🗺️', titel: 'Karte', go: 'map', hash: '#/karte', sel: '.top nav button[data-go="map"]',
      text: 'Alle Kapitel in den Teilen I–V, die Übungswerkstatt, deine Sterne, Abzeichen und die Vorgaben deiner Lehrperson.', wann: 'Immer, wenn du eine Aufgabe oder Theorie auswählen willst.' },
    { id: 'handbuch', bereich: 'labor', icon: '📘', titel: 'Handbuch', go: 'manual', hash: '#/handbuch', sel: '.top nav button[data-go="manual"]',
      text: 'Bedienung, Konto, Live-Challenge, Prüfung, Karte, Multimeter, Oszilloskop und Bauteile zum Nachschlagen – und dieser Wegweiser.', wann: 'Wenn du nicht mehr weisst, wie etwas geht.' },
    { id: 'tutorial', bereich: 'labor', icon: '🎓', titel: 'Werkbank-Tutorial', go: 'tutorial', hash: '#/tutorial', sel: '.top nav button[data-go="tutorial"]',
      text: 'Eine kleine Übungs-Werkbank: Messspitzen ziehen, Messart wählen, Bereich einstellen, Oszilloskop mit Tastkopf und Erdungsclip.', wann: 'Vor der ersten Messaufgabe oder wenn das Messen hakt.' },
    { id: 'einstellungen', bereich: 'labor', icon: '⚙️', titel: 'Einstellungen', go: 'settings', hash: '#/einstellungen', sel: '.top nav button[data-go="settings"]',
      text: 'Design, Zoom, Stromfluss-Anzeige, Messverfahren AVG/TRMS, Spielstand sichern oder zurücksetzen.', wann: 'Wenn du das Labor an dich anpassen willst.' },
    { id: 'rechner', bereich: 'labor', icon: '🖩', titel: 'Taschenrechner', sel: '#btnCalc', action: 'calc',
      text: 'Ein Rechner als Fenster über dem Spiel, mit Wurzel, Potenzen und Winkelfunktionen (Strg+Alt+R).', wann: 'Für Rechenwerte im Messprotokoll.' },
    { id: 'kontochip', bereich: 'labor', icon: '👤', titel: 'Konto-Chip', sel: '#acctChip', portalOnly: true,
      text: 'Zeigt, ob du angemeldet bist; ein Klick führt ins Portal.', wann: 'Wenn du prüfen willst, ob dein Fortschritt im Konto gespeichert wird.' },
    { id: 'logo', bereich: 'labor', icon: '⚡', titel: 'Logo', sel: '#brand', hash: '#/karte',
      text: 'Zurück zur Karte.', wann: 'Von überall im Labor.' },
    /* ---- In einer Aufgabe (nur Seite, kein Rundgang) ---- */
    { id: 'auftrag', bereich: 'aufgabe', icon: '📋', titel: 'Auftrag und Tipps', tour: false,
      text: 'Links der Auftrag, das Lernziel und zwei Tipps; Tipps kosten Sterne.', wann: 'Wenn du nicht weiterkommst.' },
    { id: 'setup', bereich: 'aufgabe', icon: '🎚️', titel: 'So stellst du das Gerät ein', tour: false,
      text: 'Für jeden Messwert: Schalterstellung, Messart, Anschlüsse, Bildbreite.', wann: 'Vor jeder Messung.' },
    { id: 'vorfuehren', bereich: 'aufgabe', icon: '▶️', titel: 'Vorführen', tour: false,
      text: 'Das Labor zeigt an einem Messwert, wie gemessen wird – die Spitzen gleiten von selbst.', wann: 'Wenn du eine Messung einmal sehen willst; zählt wie ein Tipp.' },
    { id: 'protokoll', bereich: 'aufgabe', icon: '📝', titel: 'Messprotokoll', tour: false,
      text: 'Hier trägst du deine Messwerte ein; jeder Wert wird einzeln geprüft.', wann: 'Bei jeder Messaufgabe.' },
    { id: 'pruefen', bereich: 'aufgabe', icon: '✅', titel: 'Prüfen', tour: false,
      text: 'Prüft Schaltung und Protokoll und vergibt Sterne.', wann: 'Wenn du fertig bist.' },
    { id: 'werkzeuge', bereich: 'aufgabe', icon: '🧰', titel: 'Werkzeugleiste', tour: false,
      text: 'Drehen, Löschen, Einpassen, Spannungen und Stromfluss anzeigen, Zeitlupe, Wechsel Schaltplan/Werkbank, Reparieren, Neu.', wann: 'Beim Bauen und Verstehen.' },
    { id: 'multimeter', bereich: 'aufgabe', icon: '🔋', titel: 'Multimeter', tour: false,
      text: 'Messart OFF, V⎓, V~, A⎓, A~, Ω; Verfahren AVG oder TRMS; auf der Werkbank Spitzen ziehen, im Schaltplan Anschlüsse anklicken.', wann: 'Für Spannung, Strom und Widerstand.' },
    { id: 'oszilloskop', bereich: 'aufgabe', icon: '📈', titel: 'Oszilloskop', tour: false,
      text: 'Spannung über die Zeit: Bildbreite wählen, Aufnahme/RUN, zwei Kanäle, gross anzeigen; darunter die Kennwerte.', wann: 'Für Wechselgrössen, Lade- und Taktsignale.' }
  ];
  /* Häufige Wege: Frage → Ziel (Portal-Adresse oder Labor-Adresse mit labor: true) */
  var wege = [
    { frage: 'Wo sehe ich meine Vorgaben?', href: 'labor/#/karte', labor: true, rollen: ['student'], hinweis: 'Karte, oben «Vorgaben vom Dozent»' },
    { frage: 'Wo ändere ich mein Passwort?', href: '#/konto', rollen: ANGEMELDET },
    { frage: 'Wie trete ich einer Live-Challenge bei?', href: '#/live', rollen: ['student'] },
    { frage: 'Wo finde ich mein Zertifikat?', href: '#/zertifikate', rollen: ['student', 'teacher'] },
    { frage: 'Wo übe ich das Messen?', href: 'labor/?werkstatt=1', labor: true, hinweis: 'Übungswerkstatt – oder das Werkbank-Tutorial im Labor' },
    { frage: 'Wie bekomme ich ein Konto?', href: '#/code', rollen: ['gast'], hinweis: 'Anmelden → Klassencode' },
    { frage: 'Wo lege ich eine Klasse an?', href: '#/leitstand', rollen: ['teacher'], hinweis: 'Leitstand → Neue Klasse' },
    { frage: 'Wo starte ich eine Prüfung unter Aufsicht?', href: '#/leitstand', rollen: ['teacher'], hinweis: 'Leitstand → Klasse → Prüfung' },
    { frage: 'Wo sehe ich die Schaltungen meiner Lernenden?', href: '#/leitstand', rollen: ['teacher', 'admin'], hinweis: 'Leitstand → Klasse → Schüler/in' },
    { frage: 'Wo lege ich ein Dozentenkonto an?', href: '#/admin', rollen: ['admin'] }
  ];
  var BEREICH = { portal: 'Portal', labor: 'Labor', aufgabe: 'In einer Aufgabe' };
  function roleOf(user) { return user && user.role ? user.role : 'gast'; }
  function sees(x, role) { return !x.rollen || x.rollen.indexOf(role) >= 0; }
  function forRole(bereich, role) { return items.filter(function (i) { return i.bereich === bereich && sees(i, role); }); }
  root.DQWegweiser = { items: items, wege: wege, BEREICH: BEREICH, roleOf: roleOf, sees: sees, forRole: forRole, ANGEMELDET: ANGEMELDET };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DQWegweiser;
})(typeof window !== 'undefined' ? window : globalThis);

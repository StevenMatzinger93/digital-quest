# Avatar-System (Avatare, Garderobe, Coins) – Transferpaket

Quelle: Repo `StevenMatzinger93/scl-quest`, Stand `cd685be vom 03.10.2026` (Branch `main`).
Erstellt am 05.10.2026. Zweck: das Avatarsystem der SPS Quest 1:1 in ein anderes E-Learning übernehmen.

Diese Datei enthält **alles**: Erklärung, Datenmodell, Schnittstellen, Einbau-Schritte und im Anhang den **vollständigen, unveränderten Quellcode** aller beteiligten Dateien (maschinell aus dem Repo eingefügt, nicht abgetippt). Der Logik-Test des Systems lief beim Erstellen grün (`node test_avatar.js`: 727 bestanden, 0 fehlgeschlagen).

**Prompt für das andere Projekt (zum Einfügen in Claude Code):**

> Lies `AVATAR_SYSTEM_TRANSFER.md`. Lege die Dateien aus Teil C unter den angegebenen Zielpfaden an (Inhalt unverändert übernehmen). Passe danach nur die Stellen aus Teil B, Abschnitt 6 („Was du anpassen musst“) an unser Projekt an. Lass `node test_avatar.js` laufen und berichte.

---

# Teil A – Was das System ist

## 1. Überblick

| Baustein | Datei | Grösse | Aufgabe |
|---|---|---|---|
| **Kern** | `avatar_core.js` | 74 KB | Katalog (Tiere, Farben, Gegenstände), SVG-Zeichnung, Posen/Animation, Coin-Regeln, Freischalt-Logik. Läuft unverändert im Browser **und** auf dem Server (Node/Worker). Keine Abhängigkeiten. |
| **Server** | `worker/avatar.js` | 10 KB | API `GET/PUT /api/avatar`, `POST /api/avatar/buy`; Coin-Stand, Besitz, Prämien. Cloudflare Worker + D1 (SQLite). |
| **Garderobe** | `portal_avatar.js` | 12 KB | Oberfläche: Tier/Farbe wählen, Teile anziehen/kaufen, Filter, Fortschrittsbalken, Posen-Vorschau. |
| **Anzeige** | `avatarHTML()` + CSS | klein | Avatar als Chip (Kopf im Kreis) oder Ganzkörper überall im Produkt; Platzhalter mit Initialen, wenn noch kein Avatar gewählt ist. |
| **Tests** | `test_avatar.js`, `tests/avatar.js`, `tests/avatar_snap.js` | | Logik (Node), API + Oberfläche (Playwright), Bildvergleich + Bildrate. |
| **Vorschauseiten** | `lab/avatar_stil.html`, `lab/garderobe.html` | | Stilmuster und Katalog-Vorschau mit Wirtschaftsrechnung. |

Grundsätze (aus `ENTSCHEIDUNGEN.md`): Coins sind **nur verdienbar, nie mit Geld kaufbar, rein kosmetisch** (kein Spielvorteil). Der Server prüft Besitz, Freischaltung und Kontostand – der Browser zeigt nur an. Keine zusätzlichen Personendaten.

## 2. Datenmodell

Ein Avatar ist ein kleines Objekt:

```js
{ animal: 'fuchs', color: '#2f6f4f', equip: { oberteil: 'tshirt_grau', kopf: 'kappe_rot', brille: 'brille_rund' } }
```

- `animal`: eines von 8 Tieren – `fuchs`, `baer`, `eule`, `wolf`, `pinguin`, `biber`, `steinbock`, `katze` (eigene Zeichnungen, keine fremden Figuren/Marken).
- `color`: eine von 8 Hintergrund-/Sockelfarben (`COLORS`).
- `equip`: höchstens ein Gegenstand je Platz. 11 Plätze (`SLOTS`): `kopf`, `brille`, `oberteil`, `kette`, `hand`, `ruecken`, `schuhe`, `aura`, `sockel`, `siegerpose`, `titel`.
- `normalize(av)` macht aus beliebiger Eingabe immer einen gültigen Avatar (unbekannte Werte → Standard; ohne Oberteil → `tshirt_grau`). **Immer** vor Speichern und Zeichnen aufrufen.

### Katalog (`ITEMS`)

77 Gegenstände + 32 Farbvarianten. Felder je Gegenstand:

| Feld | Bedeutung |
|---|---|
| `slot`, `name`, `price` | Platz, Anzeigename, Preis in Coins |
| `kind`, `color`, `motif` | steuern die Zeichnung |
| `rarity` | `gewoehnlich` (24) · `selten` (16) · `episch` (19) · `legendaer` (10) · `mythisch` (8); Standard `gewoehnlich` |
| `unlock` | Bedingung zusätzlich zum Preis, z. B. `{ podium: 1 }`, `{ questSolved: { fup: 75 } }`, `{ cert: { quest: 'fup', level: 'profi' } }` |
| `earnOnly` | nicht kaufbar – gehört einem automatisch, sobald die Bedingung erfüllt ist |
| `set` | Kollektion (`scl`, `kop`, `fup`, `awl`, `sensor`); alle Teile einer Kollektion getragen → Sockel-Effekt |
| `anim` | bewegtes Teil (22 Stück) |
| `alt` | Farbvarianten; ID `teil~1` / `teil~2`, Preis +30 % (auf 10 gerundet) |
| `shop: 'monat'`, `shopSet` | Monats-Schaufenster (6 Teile, abwechselnd Set 0/1 je Kalendermonat) |

Preisbänder: Gewöhnlich 0–150 · Selten 250–500 · Episch 800–1 500 · Legendär 2 000–3 500 · Mythisch 4 000–8 000. Katalogsumme ≈ 80 700 Coins (ohne Varianten).

### Datenbank (2 Tabellen)

```sql
CREATE TABLE IF NOT EXISTS avatars (
  user_id INTEGER PRIMARY KEY,
  animal TEXT NOT NULL,
  color TEXT NOT NULL,
  equip TEXT NOT NULL DEFAULT '{}',      -- JSON
  updated_at INTEGER NOT NULL            -- Millisekunden
);
CREATE TABLE IF NOT EXISTS coin_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,               -- + Prämie, − Kauf
  source TEXT NOT NULL,                  -- 'kauf' | 'speedrun' | 'sudden' | 'teilnahme' | 'zertifikat'
  ref TEXT NOT NULL,                     -- Gegenstands-ID bzw. 'r1:<challengeId>', 'fup:profi' …
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, source, ref)           -- jede Prämie / jeder Kauf höchstens einmal
);
CREATE INDEX IF NOT EXISTS coin_ledger_user ON coin_ledger(user_id);
```

Beim Löschen eines Kontos beide Tabellen mitlöschen (`DELETE FROM avatars …`, `DELETE FROM coin_ledger …`).

## 3. Coins

**Der Kontostand wird nie gespeichert, sondern immer berechnet:**

```
Stand = verdient aus Lernfortschritt (berechnet)  +  Prämien im coin_ledger (amount > 0)  −  Käufe im coin_ledger (amount < 0)
```

Regeln (`RULES` im Kern):

| Leistung | Coins |
|---|---|
| Gelöste Aufgabe 1★ / 2★ / 3★ | 10 / 15 / 20 |
| Aufgabe mit „Lösung zeigen“ | 3 |
| Kapitel-Boss (Zusatz) | 40 |
| Final Boss (Zusatz) | 100 |
| Bestandene Theorie | 10 |
| Live-Challenge Platz 1 / 2 / 3 / nur gelöst | 60 / 40 / 25 / 10 |
| Sudden-Death-Sieg (Zusatz) | 80 |
| Teilnahme an gültiger Challenge | 5 |
| Zertifikat bestanden / mit Auszeichnung | 300 / 500 |

`earned(progress, meta)` erwartet den Lernfortschritt in dieser Form:

```js
progress = { <kursId>: { doneTasks: { <aufgabenId>: { stars: 1..3, revealed: false } }, doneTheory: { <theorieId>: true } } }
meta     = { <kursId>: { <aufgabenId>: { boss: true, final: false, ch: 3 }, $: { tasks: 150, theoryAll: 30 } } }
```

`meta` kennzeichnet nur Boss-/Final-Aufgaben (alle anderen Aufgaben brauchen keinen Eintrag); `$` trägt Gesamtzahlen für die Wirtschaftsrechnung.

## 4. Freischalten und Besitz

- `unlockCtx(e, ledger, certs, stats, meta)` baut den Kontext aus drei Quellen: Lernfortschritt, gültige Zertifikate, Challenge-Statistik (nur vom Server).
- `unlockProgress(id, ctx)` → `[{ text, have, need, ok }]` für Fortschrittsbalken und Fehlermeldungen; `isUnlocked`, `unlockText` bauen darauf auf.
- `owns(id, owned, ctx)`: gratis-Teil (Preis 0, keine Bedingung) **oder** `earnOnly` mit erfüllter Bedingung **oder** gekauft (Eintrag `source='kauf'` im Ledger).
- Bedingungs-Schlüssel: `final`, `bosses`, `quests`, `podium`, `certs`, `profiCerts`, `questSolved`, `questFinal`, `cert`, `challenges`, `wins`, `sdWins`, `bugFixed`, `flawless`, `finals3`, `sensorAll`, `sensorClean`.
- **Legendär/Mythisch hängen nur an Server-Quellen** (Zertifikate, Challenges) oder am Final Boss, den der Server beim Kauf gegen die Musterlösungs-Tests nachprüft. Der Test `test_avatar.js` erzwingt diese Regel.
- Gegen Ausnutzen: Eine Challenge zählt nur ab 3 Teilnehmenden und 2 Minuten Laufzeit (`CH_RULES`); jede Leistung höchstens einmal je Challenge (UNIQUE im Ledger).

## 5. Zeichnung

```js
SPSQAvatar.svg(av, opt)   // gibt einen SVG-String zurück
```

| Option | Werte | Wirkung |
|---|---|---|
| `size` | Zahl (px) oder `'chip'` | Kopf im Kreis, viewBox 100×100, ohne Verläufe; Ring in der Farbe des seltensten getragenen Teils |
| `size` | `'card'` / `'stage'` | Ganzkörper (Chibi, 2.5D), viewBox 100×120; auf isometrischem Sockel in der Avatarfarbe; `stage` mit grösserem Sockel und Lichtkegel |
| `pose` | `idle`, `wave`, `jubel`, `dance`, `sad` | Körperhaltung |
| `anim` | `true` | CSS-Animationen (Wippen, Blinzeln, Tanz, bewegte Teile). Fügt das Stylesheet automatisch ein (`ensureCSS()`) |
| `style` | `soft` (Standard), `flat`, `knete` | Zeichenstil |
| `title` | Text | `<title>` im SVG (Tooltip) |
| `uid` | Text | eigene ID-Vorsilbe; sonst automatisch eindeutig je Aufruf (keine Verlauf-ID-Kollisionen bei vielen Avataren) |

Weitere Helfer: `title(av)` (Titel-Schriftzug), `best(av)` (seltenstes Teil für „trägt: …“), `setDone(av)` (komplette Kollektion), `economy(meta)` (Katalogsumme vs. Coins je Kurs).
`prefers-reduced-motion` schaltet alle Animationen ab. Getestet: 40 animierte Avatare gleichzeitig ≥ 50 fps.

## 6. Server-API

| Aufruf | Antwort |
|---|---|
| `GET /api/avatar` | `{ avatar, chosen, coins: { balance, earned, speedrun, spent }, owned: [ids], unlock: ctx, rules, shopSet, chRules }` |
| `PUT /api/avatar` Body `{ animal, color, equip }` | normalisiert, prüft Besitz jedes Teils (403 sonst), speichert → `{ avatar }` |
| `POST /api/avatar/buy` Body `{ item }` | prüft: existiert · schon im Besitz · nicht `earnOnly` · im Schaufenster · freigeschaltet · Final Boss serverseitig bestanden · genug Coins → Ledger-Eintrag `-price` → `{ ok, owned, balance }` |

Alle drei brauchen ein angemeldetes Konto (401 sonst). Exportierte Helfer für andere Server-Module: `avatarOf(C, uid)`, `avatarsFor(C, ids)` (viele Konten auf einmal, z. B. Klassenliste/Rangliste), `coinState`, `challengeStats`, `awardSpeedrun(C, ch, ranked)`, `awardCert(C, uid, quest, level, distinction)`.

## 7. Wo der Avatar erscheint

Kopfzeile neben dem Benutzernamen (Chip 24 px) · Klassenliste der Lehrperson (Mini 28 px) · Live-Lobby am Beamer (Ganzkörper, „Pop“ beim Beitreten, „trägt: Legendäre …“) · Rangliste (Chip, Jubelsprung beim Lösen) · Podest (Siegestanz auf 3D-Stufen, Titel unter dem Namen) · Sudden-Death-Sieger gross, Verlierer in Pose `sad` · Endbildschirm im Spiel.

---

# Teil B – Einbau ins andere Projekt

## 1. Dateien anlegen

| Quelle (SPS Quest) | Empfohlenes Ziel | Pflicht? |
|---|---|---|
| `dev/src/avatar_core.js` | `src/avatar_core.js` | **ja** |
| `worker/avatar.js` | `server/avatar.js` | ja, wenn es Konten/Server gibt |
| `dev/portal/portal_avatar.js` | `src/avatar_garderobe.js` | ja (Garderobe) |
| CSS aus Anhang C4 | ins bestehende Stylesheet | ja |
| `avatarHTML()` aus Anhang C5 | in die Haupt-App | ja |
| `dev/test_avatar.js` | `test_avatar.js` | empfohlen |
| `dev/tests/avatar.js`, `avatar_snap.js` | `tests/` | optional (brauchen Playwright) |
| `dev/lab/*.html` | `lab/` | optional |

## 2. Schnellstart (nur Anzeige, ohne Server)

```html
<script src="avatar_core.js"></script>
<div id="a" style="width:160px;height:192px"></div>
<span id="b"></span>
<script>
  const A = window.SPSQAvatar;
  const av = A.normalize({ animal: 'pinguin', color: A.COLORS[1], equip: { oberteil: 'tshirt_rot', kopf: 'kappe_rot' } });
  document.getElementById('a').innerHTML = A.svg(av, { size: 'stage', pose: 'wave', anim: true });  // Ganzkörper, animiert
  document.getElementById('b').innerHTML = A.svg(av, { size: 32 });                                   // Kopf im Kreis, 32 px
</script>
```

In Node: `const A = require('./avatar_core.js')` – gleiche API.

## 3. Datenbank

Die drei SQL-Anweisungen aus Teil A, Abschnitt 2 als Migration ausführen. Das Schema ist Standard-SQLite; für Postgres/MySQL `AUTOINCREMENT` und `INSERT OR IGNORE` / `ON CONFLICT … DO UPDATE` an den Dialekt anpassen.

## 4. Server einhängen

1. Kern für den Server bündeln (so macht es `build.js` der SPS Quest):
   ```js
   // erzeugt server/gen/avatar_bundle.js
   const code = fs.readFileSync('src/avatar_core.js', 'utf8')
     + '\nexport const Avatar = globalThis.SPSQAvatar;\nexport const AVATAR_META = ' + JSON.stringify(AVATAR_META) + ';\n';
   ```
   `AVATAR_META` beim Build aus den Kursinhalten erzeugen (Form siehe Teil A, Abschnitt 3; Original-Zeilen in Anhang C6).
2. Routen eintragen: `avatarRoutes(C, p, m, H)` in die Routenkette des Servers; `C` = `{ db, body, user }`, `H.currentUser(C)` liefert das angemeldete Konto.
3. Profil-Antwort ergänzen: `out.avatar = await avatarOf(C, user.id)` → der Browser kennt den eigenen Avatar sofort nach dem Anmelden.
4. Listen ergänzen (Klassenliste, Rangliste): `const avs = await avatarsFor(C, ids)` und je Person `avatar: avs[id] || null`.
5. Prämien auslösen: nach Challenge-Ende `awardSpeedrun(C, ch, ranked)`, nach bestandener Prüfung `awardCert(...)`.

## 5. Oberfläche einhängen

1. `avatar_core.js` **vor** der Garderobe und der Haupt-App laden.
2. `avatarHTML(av, username, klassen)` (Anhang C5) überall verwenden, wo ein Name angezeigt wird. Klassen steuern die Darstellung: `chip` / `mini` / `row` = Kopf im Kreis; sonst Ganzkörper; `stage` = gross; Pose über `dance` / `sad` / `jump` / `wave`; `anim` oder `bm-av` = animiert.
3. Garderobe: `portal_avatar.js` registriert die Route `#/avatar` und erwartet ein Objekt `window.SPSQ` mit:
   `user`, `api(method, pfad, body)` → Promise mit JSON (wirft `Error` mit `message`), `esc(text)`, `toast(text, istFehler)`, `confirmDlg(titel, html, okText)` → Promise<boolean>, `openTerminal('login')`, `setUserAvatar(av)`, `routes` (Liste `{ re, view }`), sowie ein Element `<div id="view">`.
   Verwendete CSS-Klassen der Umgebung: `console`, `panel`, `btn`, `pri`, `small`, `muted`, `lead`, `crumbs`, `tbl`, `num`, `inp`, `row`, `tag`, `empty`.
4. Menüpunkt: `<a href="#/avatar">Avatar &amp; Coins</a>`.

## 6. Was du anpassen musst (alles andere bleibt 1:1)

| Stelle | Datei | Anpassung |
|---|---|---|
| Globaler Name `SPSQAvatar`, Style-ID `spsq-av-css` | Kern | kann bleiben; bei Umbenennung überall ersetzen |
| Kollektionen `SETS` und `QN` (`scl`, `kop`, `fup`, `awl`, `sensor`) | Kern | auf die Kurse/Module des neuen E-Learnings umbenennen; Teile mit `set:` und `unlock.questSolved/questFinal/cert` entsprechend anpassen |
| Texte `UNLOCK_TEXT`, Titel-Namen („Fahrdienstleiter“ …) | Kern | an das neue Thema anpassen |
| `sensorAll`, `sensorClean`, `meta.sensor.$` | Kern | Sonderfall Sensorwerkstatt – entfernen oder auf ein eigenes Modul umdeuten |
| `RULES` (Coins je Leistung) | Kern | an Umfang des neuen Kurses anpassen; Faustregel: ein ganzer Kurs ≈ ein Legendär-Teil |
| Form von `progress` (`doneTasks`, `doneTheory`, `stars`, `revealed`) | Kern `earned()` + Server `progressOf()` | auf das Fortschrittsformat des neuen Projekts abbilden (am einfachsten: im Server in diese Form umrechnen) |
| Tabellen `progress`, `certificates`, `challenges`, `challenge_players` | Server | Abfragen in `progressOf`, `certsOf`, `challengeStats` anpassen; gibt es keine Zertifikate/Challenges → Funktionen leere Liste / Nullwerte liefern lassen |
| Importe `./lib.js` (`json`, `fail`, `now`, `cleanText`), `./gen/exam_bundle.js` (`Exam`, `FINAL_TASKS`), `./challenge.js` (`rank`) | Server | durch eigene Helfer ersetzen (Originale in Anhang C7). Ohne Prüfungsmodul: `verifiedFinals` entfernen bzw. immer `true` liefern – dann aber Final-Boss-Teile nicht mehr als serverbestätigt betrachten |
| `C.db.prepare(...).bind(...).first()/all()/run()`, `C.db.batch()` | Server | Cloudflare-D1-Schnittstelle; bei anderer Datenbank auf den eigenen Treiber umstellen |
| `window.SPSQ` | Garderobe | eigenes App-Objekt mit den Funktionen aus Abschnitt 5 bereitstellen |
| Farben `--scl`, `--line2`, `--dim`, `--mono` | CSS | CSS-Variablen des neuen Designs setzen (Rückfallwerte sind im CSS schon enthalten) |

## 7. Variante ohne Server (reine Offline-HTML-Datei)

Der Kern funktioniert vollständig offline. Avatar und Käufe lassen sich in `localStorage` halten: `ledger` als Liste `{ amount, source, ref }` speichern und `SPSQAvatar.balance(progress, meta, ledger, [], {})` aufrufen – das liefert Stand, Besitz und Freischalt-Kontext wie der Server. **Einschränkung:** ohne Server kann jede Person ihren Stand im Browser verändern; Legendär/Mythisch (Zertifikate, Challenges) sind dann nicht erreichbar bzw. nicht vertrauenswürdig.

## 8. Abnahme-Checkliste

- [ ] `node test_avatar.js` → 0 fehlgeschlagen (nach Katalog-Anpassungen die Preisbänder/Server-Regel beachten)
- [ ] Schnellstart-Seite zeigt Ganzkörper und Chip, keine Konsolenfehler
- [ ] Neues Konto: Platzhalter mit Initialen, bis ein Avatar gespeichert ist
- [ ] Garderobe: Tier/Farbe wechseln, Gratis-Teil anziehen, speichern, neu laden → bleibt
- [ ] Kauf: zu wenig Coins → Meldung; genug → Stand sinkt, Teil „besitzt du“; zweiter Kauf desselben Teils kostet nichts
- [ ] Gesperrtes Teil: Fortschrittsbalken und Text der Bedingung sichtbar; Kauf per API wird mit 403 abgewiesen
- [ ] `PUT /api/avatar` mit fremdem Teil → 403
- [ ] 390 px Breite bedienbar; `prefers-reduced-motion` → keine Bewegung
- [ ] Konto löschen entfernt `avatars` und `coin_ledger`

## 9. Rechtliches und Datenschutz

Alle Tiere und Gegenstände sind eigene SVG-Zeichnungen des Projekts (Stil an Quiz-Figuren angelehnt, keine fremden Figuren oder Marken). Gespeichert werden nur Tier, Farbe, Ausrüstung und Coin-Buchungen je Konto – keine zusätzlichen Personendaten. In der Datenschutzerklärung des neuen Produkts „Avatar und Coins“ als Datenkategorie nennen (so auch in der SPS Quest).

---

# Teil C – Vollständiger Quellcode (unverändert aus dem Repo)

## C1 – Kern: avatar_core.js

Quelle: `dev/src/avatar_core.js` – ganze Datei

````js
/* ===== SPS Quest: Avatare und Coins (Feedback-Auftrag Paket 3) =====
   Gemeinsamer Kern für Portal (Anzeige, Garderobe) und Worker (Prüfung, Coin-Stand; über worker/gen/avatar_bundle.js).
   - Avatare sind Tiere (eigene Zeichnungen als SVG-Ebenen): Hintergrundfarbe, Oberteil, Kette, Kopf, Augen, Brille, Kopfbedeckung.
   - Coins sind nur verdienbar (gelöste Aufgaben nach Sternen, Kapitel-Boss, Final Boss, Theorie, Speedrun-Platzierung),
     nie mit Geld kaufbar und rein kosmetisch. Ausgegeben werden sie in der Garderobe.
   API: SPSQAvatar = { ANIMALS, COLORS, ITEMS, SLOTS, DEFAULT, normalize(av), svg(av, opt), earned(progress, meta, ledger), unlockCtx(...), isUnlocked(item, ctx), balance(...) } */
(function(root){
'use strict';
const ANIMALS = {
  fuchs:     { name: 'Fuchs',     fur: '#e8772e', light: '#fff3e6' },
  baer:      { name: 'Bär',       fur: '#8b5a2b', light: '#d9b38c' },
  eule:      { name: 'Eule',      fur: '#8a7a66', light: '#d8cbb0' },
  wolf:      { name: 'Wolf',      fur: '#7d8791', light: '#dfe4e8' },
  pinguin:   { name: 'Pinguin',   fur: '#1f2429', light: '#f4f4f4' },
  biber:     { name: 'Biber',     fur: '#7a4a2a', light: '#c49a74' },
  steinbock: { name: 'Steinbock', fur: '#b89468', light: '#eadbc4' },
  katze:     { name: 'Katze',     fur: '#9aa3ab', light: '#eef1f3' }
};
const COLORS = ['#2f6f4f', '#1f5f8b', '#6b3fa0', '#8b2f3f', '#a0661f', '#2f7f7f', '#3b3f46', '#b8860b'];
// Plätze am Körper (Garderobe 2.0, Auftrag 12.2) – Reihenfolge = Reihenfolge in der Garderobe
const SLOTS = { kopf: 'Kopfbedeckung', brille: 'Brille / Visier', oberteil: 'Oberteil', kette: 'Kette / Anhänger', hand: 'Hand', ruecken: 'Rücken', schuhe: 'Schuhe',
  aura: 'Aura', sockel: 'Sockel', siegerpose: 'Siegerpose', titel: 'Titel' };
// Seltenheitsstufen (12.1): Rahmenfarbe überall gleich
const RARITY = { gewoehnlich: { name: 'Gewöhnlich', color: '#9aa3ab', n: 0 }, selten: { name: 'Selten', color: '#3b82f6', n: 1 }, episch: { name: 'Episch', color: '#a855f7', n: 2 },
  legendaer: { name: 'Legendär', color: '#f5c518', n: 3 }, mythisch: { name: 'Mythisch', color: '#e0457b', n: 4 } };
// Quest-Kollektionen (12.3): Set = alle Teile einer Quest zugleich getragen → Sockel-Effekt
const SETS = { scl: { name: 'Roboterzelle (SCL)', bonus: 'Code-Ring' }, kop: { name: 'Seilbahn (KOP)', bonus: 'Schneekante' }, fup: { name: 'Stellwerk (FUP)', bonus: 'Schienen-Sockel' },
  awl: { name: 'Walzwerk (AWL)', bonus: 'Glutrand' }, sensor: { name: 'Werkstatt (Sensor)', bonus: 'Kabelring' } };
// Katalog: price 0 ohne unlock = von Anfang an frei; unlock = Bedingung zusätzlich zum Preis; earnOnly = nicht kaufbar, gehört einem bei erfüllter Bedingung
// rarity (Standard gewoehnlich), set, anim (bewegt sich), alt = Farbvarianten (je +30 %), shop:'monat' = Monats-Schaufenster
const ITEMS = {
  // Gewöhnlich (Paket 3, Preise und Besitz bleiben)
  tshirt_grau:    { slot: 'oberteil', name: 'T-Shirt grau',      price: 0,   kind: 'tshirt', color: '#6b7280' },
  tshirt_rot:     { slot: 'oberteil', name: 'T-Shirt rot',       price: 40,  kind: 'tshirt', color: '#c0392b' },
  tshirt_blau:    { slot: 'oberteil', name: 'T-Shirt blau',      price: 40,  kind: 'tshirt', color: '#2e6fd8' },
  tshirt_gruen:   { slot: 'oberteil', name: 'T-Shirt grün',      price: 40,  kind: 'tshirt', color: '#2f9e44' },
  tshirt_zahnrad: { slot: 'oberteil', name: 'T-Shirt Zahnrad',   price: 90,  kind: 'tshirt', color: '#1f2937', motif: 'zahnrad' },
  tshirt_blitz:   { slot: 'oberteil', name: 'T-Shirt Blitz',     price: 120, kind: 'tshirt', color: '#111827', motif: 'blitz', unlock: { podium: 1 } },
  hemd_weiss:     { slot: 'oberteil', name: 'Hemd weiss',        price: 80,  kind: 'hemd', color: '#f3f4f6' },
  hemd_blau:      { slot: 'oberteil', name: 'Hemd hellblau',     price: 80,  kind: 'hemd', color: '#a8c8f0' },
  hemd_kariert:   { slot: 'oberteil', name: 'Hemd kariert',      price: 110, kind: 'hemd', color: '#b83b3b', motif: 'kariert' },
  kette_silber:   { slot: 'kette',    name: 'Kette silber',      price: 60,  kind: 'kette', color: '#c9ced6' },
  kette_zahnrad:  { slot: 'kette',    name: 'Zahnrad-Anhänger',  price: 100, kind: 'kette', color: '#c9ced6', motif: 'zahnrad', unlock: { quests: 2 } },
  kette_gold:     { slot: 'kette',    name: 'Goldene Kette',     price: 150, kind: 'kette', color: '#f5c518', unlock: { final: 1 } },
  brille_rund:    { slot: 'brille',   name: 'Runde Brille',      price: 50,  kind: 'rund', color: '#1f2937' },
  brille_eckig:   { slot: 'brille',   name: 'Eckige Brille',     price: 50,  kind: 'eckig', color: '#1f2937' },
  schutzbrille:   { slot: 'brille',   name: 'Schutzbrille',      price: 70,  kind: 'schutz', color: '#9fd8ff' },
  sonnenbrille:   { slot: 'brille',   name: 'Sonnenbrille',      price: 90,  kind: 'sonne', color: '#0b0f14', unlock: { podium: 1 } },
  kappe_rot:      { slot: 'kopf',     name: 'Kappe rot',         price: 50,  kind: 'kappe', color: '#c0392b' },
  kappe_blau:     { slot: 'kopf',     name: 'Kappe blau',        price: 50,  kind: 'kappe', color: '#2e6fd8' },
  kappe_schwarz:  { slot: 'kopf',     name: 'Kappe schwarz',     price: 60,  kind: 'kappe', color: '#1f2937' },
  muetze:         { slot: 'kopf',     name: 'Wollmütze',         price: 70,  kind: 'muetze', color: '#2f9e44' },
  bauhelm:        { slot: 'kopf',     name: 'Bauhelm',           price: 120, kind: 'helm', color: '#f5c518', unlock: { bosses: 3 } },
  schuhe_turn:    { slot: 'schuhe',   name: 'Turnschuhe',        price: 60,  kind: 'sneaker', color: '#e5e7eb' },
  schuhe_rot:     { slot: 'schuhe',   name: 'Turnschuhe rot',    price: 60,  kind: 'sneaker', color: '#dc2626' },
  schuhe_sicher:  { slot: 'schuhe',   name: 'Sicherheitsschuhe', price: 120, kind: 'sicher', color: '#1f2937' },
  // Zertifikate (Paket P)
  kette_meister:  { slot: 'kette',    name: 'Meister-Anhänger',  price: 300, rarity: 'selten', kind: 'kette', color: '#f5c518', motif: 'zahnrad', unlock: { certs: 1 } },
  helm_meister:   { slot: 'kopf',     name: 'Meister-Helm',      price: 900, rarity: 'episch', kind: 'helm', color: '#e5e7eb', unlock: { profiCerts: 1 } },
  // Selten ohne Leistung
  schuhe_neon:    { slot: 'schuhe',   name: 'Neon-Sneaker',      price: 350, rarity: 'selten', kind: 'neon', color: '#a3e635' },
  tshirt_verlauf: { slot: 'oberteil', name: 'T-Shirt Sonnenuntergang', price: 300, rarity: 'selten', kind: 'tshirt', color: '#f97316', motif: 'verlauf' },
  // Quest-Kollektion SCL (Roboterzelle)
  scl_hoodie:     { slot: 'oberteil', name: 'Hoodie „IF…THEN“',  price: 400,  rarity: 'selten',    set: 'scl', kind: 'hoodie', color: '#1f2937', unlock: { questSolved: { scl: 25 } } },
  scl_visor:      { slot: 'brille',   name: 'Cyber-Visor',       price: 1200, rarity: 'episch',    set: 'scl', kind: 'visor', color: '#22d3ee', anim: true, alt: ['#f43f5e', '#a3e635'], unlock: { questSolved: { scl: 75 } } },
  scl_greifarm:   { slot: 'ruecken',  name: 'Greifarm-Rucksack', price: 2500, rarity: 'legendaer', set: 'scl', kind: 'greifarm', color: '#f59e0b', anim: true, alt: ['#64748b', '#ef4444'], unlock: { questFinal: 'scl' } },
  scl_aura:       { slot: 'aura',     name: 'Code-Aura',         price: 5000, rarity: 'mythisch',  set: 'scl', kind: 'code', color: '#39ff14', anim: true, unlock: { cert: { quest: 'scl', level: 'profi' } } },
  scl_titel:      { slot: 'titel',    name: 'Syntax-Sensei',     price: 600,  rarity: 'episch',    set: 'scl', kind: 'titel', unlock: { questSolved: { scl: 75 } } },
  // KOP (Seilbahn)
  kop_muetze:     { slot: 'kopf',     name: 'Bergführer-Mütze',  price: 400,  rarity: 'selten',    set: 'kop', kind: 'bergmuetze', color: '#b91c1c', unlock: { questSolved: { kop: 25 } } },
  kop_skibrille:  { slot: 'brille',   name: 'Skibrille verspiegelt', price: 1200, rarity: 'episch', set: 'kop', kind: 'ski', color: '#f97316', alt: ['#38bdf8', '#a855f7'], unlock: { questSolved: { kop: 75 } } },
  kop_kabine:     { slot: 'kette',    name: 'Seilbahn-Kabine',   price: 2500, rarity: 'legendaer', set: 'kop', kind: 'kabine', color: '#dc2626', anim: true, alt: ['#2563eb', '#16a34a'], unlock: { questFinal: 'kop' } },
  kop_sockel:     { slot: 'sockel',   name: 'Gipfel-Sockel mit Schneefall', price: 5000, rarity: 'mythisch', set: 'kop', kind: 'gipfel', color: '#e2e8f0', anim: true, unlock: { cert: { quest: 'kop', level: 'profi' } } },
  kop_titel:      { slot: 'titel',    name: 'Stromlaufplan-Profi', price: 600, rarity: 'episch',   set: 'kop', kind: 'titel', unlock: { questSolved: { kop: 75 } } },
  // FUP (Stellwerk)
  fup_lokmuetze:  { slot: 'kopf',     name: 'Lokführer-Mütze',   price: 400,  rarity: 'selten',    set: 'fup', kind: 'lokmuetze', color: '#1e3a8a', unlock: { questSolved: { fup: 25 } } },
  fup_kelle:      { slot: 'hand',     name: 'Signalkelle',       price: 1200, rarity: 'episch',    set: 'fup', kind: 'kelle', color: '#16a34a', alt: ['#dc2626', '#f5c518'], unlock: { questSolved: { fup: 75 } } },
  fup_laterne:    { slot: 'kette',    name: 'Weichenlaterne',    price: 2500, rarity: 'legendaer', set: 'fup', kind: 'laterne', color: '#1f2937', anim: true, alt: ['#7c2d12', '#334155'], unlock: { questFinal: 'fup' } },
  fup_dampf:      { slot: 'aura',     name: 'Dampf-Aura',        price: 5000, rarity: 'mythisch',  set: 'fup', kind: 'dampf', color: '#f1f5f9', anim: true, unlock: { cert: { quest: 'fup', level: 'profi' } } },
  fup_pfiff:      { slot: 'siegerpose', name: 'Pfiff-Siegerpose', price: 4000, rarity: 'mythisch', set: 'fup', kind: 'pfiff', color: '#cbd5e1', anim: true, unlock: { cert: { quest: 'fup', level: 'profi' } } },
  fup_titel:      { slot: 'titel',    name: 'Fahrdienstleiter',  price: 600,  rarity: 'episch',    set: 'fup', kind: 'titel', unlock: { questSolved: { fup: 75 } } },
  // AWL (Walzwerk)
  awl_schuerze:   { slot: 'oberteil', name: 'Lederschürze',      price: 400,  rarity: 'selten',    set: 'awl', kind: 'schuerze', color: '#7c4a24', unlock: { questSolved: { awl: 25 } } },
  awl_helm:       { slot: 'kopf',     name: 'Giesser-Helm mit Hitzevisier', price: 1200, rarity: 'episch', set: 'awl', kind: 'giesser', color: '#cbd5e1', alt: ['#f5c518', '#334155'], unlock: { questSolved: { awl: 75 } } },
  awl_stahl:      { slot: 'kette',    name: 'Glühender Stahlblock', price: 2500, rarity: 'legendaer', set: 'awl', kind: 'stahl', color: '#f97316', anim: true, alt: ['#ef4444', '#facc15'], unlock: { questFinal: 'awl' } },
  awl_funken:     { slot: 'aura',     name: 'Funkenregen',       price: 5000, rarity: 'mythisch',  set: 'awl', kind: 'funken', color: '#fb923c', anim: true, unlock: { cert: { quest: 'awl', level: 'profi' } } },
  awl_titel:      { slot: 'titel',    name: 'Akku-Legende',      price: 600,  rarity: 'episch',    set: 'awl', kind: 'titel', unlock: { questSolved: { awl: 75 } } },
  // Sensorwerkstatt (30 angezeigte Aufgaben, noch ohne Prüfung)
  sen_guertel:    { slot: 'oberteil', name: 'Werkzeuggürtel',    price: 400,  rarity: 'selten',    set: 'sensor', kind: 'guertel', color: '#475569', unlock: { questSolved: { sensor: 10 } } },
  sen_lampe:      { slot: 'kopf',     name: 'Stirnlampe',        price: 1200, rarity: 'episch',    set: 'sensor', kind: 'stirnlampe', color: '#facc15', anim: true, alt: ['#38bdf8', '#f472b6'], unlock: { questSolved: { sensor: 20 } } },
  sen_multimeter: { slot: 'hand',     name: 'Multimeter',        price: 2500, rarity: 'legendaer', set: 'sensor', kind: 'multimeter', color: '#facc15', anim: true, alt: ['#ef4444', '#22c55e'], unlock: { sensorAll: 1 } },
  sen_umhang:     { slot: 'ruecken',  name: 'Kabelbaum-Umhang',  price: 5000, rarity: 'mythisch',  set: 'sensor', kind: 'kabel', color: '#1d4ed8', anim: true, unlock: { sensorClean: 1 } },
  sen_titel:      { slot: 'titel',    name: 'Klemmen-König',     price: 600,  rarity: 'episch',    set: 'sensor', kind: 'titel', unlock: { questSolved: { sensor: 20 } } },
  // Challenge-Trophäen (12.4, nur serverseitig gezählt)
  sockel_holz:    { slot: 'sockel',   name: 'Holz-Sockel',       price: 250,  rarity: 'selten',    kind: 'holz', color: '#a16207', unlock: { challenges: 1 } },
  sockel_metall:  { slot: 'sockel',   name: 'Metall-Sockel',     price: 450,  rarity: 'selten',    kind: 'metall', color: '#94a3b8', unlock: { challenges: 5 } },
  sockel_neon:    { slot: 'sockel',   name: 'Neon-Sockel',       price: 900,  rarity: 'episch',    kind: 'neon', color: '#22d3ee', alt: ['#f472b6', '#39ff14'], unlock: { challenges: 15 } },
  sockel_holo:    { slot: 'sockel',   name: 'Hologramm-Sockel',  price: 2500, rarity: 'legendaer', kind: 'holo', color: '#67e8f9', anim: true, alt: ['#c084fc', '#86efac'], unlock: { challenges: 30 } },
  titel_stamm:    { slot: 'titel',    name: 'Stammgast',         price: 600,  rarity: 'episch',    kind: 'titel', unlock: { challenges: 50 } },
  hand_pokal:     { slot: 'hand',     name: 'Pokal',             price: 900,  rarity: 'episch',    kind: 'pokal', color: '#f5c518', alt: ['#cbd5e1', '#d97706'], unlock: { podium: 5 } },
  sp_konfetti:    { slot: 'siegerpose', name: 'Konfetti-Siegerpose', price: 2500, rarity: 'legendaer', kind: 'konfetti', color: '#f472b6', anim: true, unlock: { podium: 15 } },
  kopf_kranz:     { slot: 'kopf',     name: 'Siegerkranz',       price: 450,  rarity: 'selten',    kind: 'kranz', color: '#65a30d', unlock: { wins: 1 } },
  sockel_gold:    { slot: 'sockel',   name: 'Goldener Sockel',   price: 2200, rarity: 'legendaer', kind: 'gold', color: '#f5c518', anim: true, unlock: { wins: 10 } },
  aura_champion:  { slot: 'aura',     name: 'Champion-Aura',     price: 5500, rarity: 'mythisch',  kind: 'champion', color: '#fde047', anim: true, unlock: { wins: 25 } },
  aura_blitz:     { slot: 'aura',     name: 'Blitz-Aura',        price: 2500, rarity: 'legendaer', kind: 'blitz', color: '#facc15', anim: true, alt: ['#38bdf8', '#f472b6'], unlock: { sdWins: 1 } },
  titel_schnell:  { slot: 'titel',    name: 'Schnellster Finger', price: 800, rarity: 'episch',    kind: 'titel', unlock: { sdWins: 5 } },
  hand_lupe:      { slot: 'hand',     name: 'Detektiv-Lupe',     price: 350,  rarity: 'selten',    kind: 'lupe', color: '#7c4a24', unlock: { bugFixed: 5 } },
  kopf_deer:      { slot: 'kopf',     name: 'Deerstalker-Mütze', price: 900,  rarity: 'episch',    kind: 'deer', color: '#92724a', alt: ['#475569', '#14532d'], unlock: { bugFixed: 20 } },
  titel_null:     { slot: 'titel',    name: 'Null-Fehler',       price: 800,  rarity: 'episch',    kind: 'titel', glanz: true, unlock: { flawless: 10 } },
  // Questübergreifend
  ruecken_poly:   { slot: 'ruecken',  name: 'Polyglott-Umhang',  price: 3000, rarity: 'legendaer', kind: 'umhang', color: '#6d28d9', anim: true, alt: ['#0f766e', '#9f1239'], unlock: { finals3: 3 } },
  kopf_krone:     { slot: 'kopf',     name: 'SPS-Meister-Krone', price: 0,    rarity: 'mythisch',  kind: 'krone', color: '#f5c518', anim: true, earnOnly: true, unlock: { profiCerts: 4 } },
  // Monats-Schaufenster (je Monat 3 Teile, kommen später wieder)
  mon_schirm:     { slot: 'hand',     name: 'Regenschirm',       price: 450,  rarity: 'selten',    kind: 'schirm', color: '#0ea5e9', shop: 'monat', shopSet: 0 },
  mon_schal:      { slot: 'kette',    name: 'Ringelschal',       price: 400,  rarity: 'selten',    kind: 'schal', color: '#dc2626', shop: 'monat', shopSet: 0 },
  mon_jetpack:    { slot: 'ruecken',  name: 'Jetpack',           price: 1500, rarity: 'episch',    kind: 'jetpack', color: '#94a3b8', anim: true, shop: 'monat', shopSet: 0 },
  mon_kuerbis:    { slot: 'kopf',     name: 'Kürbis-Hut',        price: 900,  rarity: 'episch',    kind: 'kuerbis', color: '#f97316', shop: 'monat', shopSet: 1 },
  mon_strohhut:   { slot: 'kopf',     name: 'Strohhut',          price: 500,  rarity: 'selten',    kind: 'stroh', color: '#e7c77a', shop: 'monat', shopSet: 1 },
  mon_ballon:     { slot: 'hand',     name: 'Ballon',            price: 500,  rarity: 'selten',    kind: 'ballon', color: '#e11d48', anim: true, shop: 'monat', shopSet: 1 }
};
Object.keys(ITEMS).forEach(id => { const it = ITEMS[id]; it.id = id; it.rarity = it.rarity || 'gewoehnlich'; });
const QN = { scl: 'SCL', kop: 'KOP', fup: 'FUP', awl: 'AWL', sensor: 'Sensor' };
const UNLOCK_TEXT = { final: () => 'Final Boss einer Quest lösen', bosses: n => n + ' Kapitel-Bosse lösen', podium: n => n === 1 ? 'Einmal aufs Podest in einer Live-Challenge' : n + '× aufs Podest in Live-Challenges',
  quests: n => 'In ' + n + ' Quests eine Aufgabe lösen', certs: n => n === 1 ? 'Ein Zertifikat bestehen' : n + ' Zertifikate bestehen',
  profiCerts: n => n === 1 ? 'Ein Profi-Zertifikat bestehen' : n === 4 ? 'Alle vier Profi-Zertifikate bestehen' : n + ' Profi-Zertifikate bestehen',
  questSolved: o => Object.keys(o).map(q => o[q] + ' ' + QN[q] + '-Aufgaben lösen').join(', '), questFinal: q => 'Final Boss der ' + QN[q] + ' Quest lösen',
  cert: o => 'Zertifikat ' + QN[o.quest] + ' ' + (o.level === 'profi' ? 'Profi-Stufe' : 'Grundstufe'), challenges: n => n === 1 ? 'An einer Live-Challenge teilnehmen' : 'An ' + n + ' Live-Challenges teilnehmen',
  wins: n => n === 1 ? 'Eine Live-Challenge gewinnen' : n + ' Live-Challenges gewinnen', sdWins: n => n === 1 ? 'Ein Sudden Death gewinnen' : n + ' Sudden Deaths gewinnen',
  bugFixed: n => n + ' Störungsjagden lösen', flawless: n => n + ' Challenge-Aufgaben fehlerfrei lösen (ohne Fehlversuch und Tipp)', finals3: n => 'Final Boss in ' + n + ' Sprachen lösen',
  sensorAll: () => 'Alle 30 Sensor-Aufgaben und alle Sensor-Theorien lösen', sensorClean: () => 'Alle 30 Sensor-Aufgaben ohne „Lösung zeigen“ lösen' };
const DEFAULT = { animal: 'fuchs', color: COLORS[0], equip: { oberteil: 'tshirt_grau' } };

// Farbvarianten: „id~1“ / „id~2“ = Teil in der Farbe alt[0] / alt[1], Preis +30 %, gleiche Bedingung
function item(id){
  if(!id) return null;
  if(ITEMS[id]) return ITEMS[id];
  const m = /^([a-z0-9_]+)~([12])$/.exec(String(id)); const b = m && ITEMS[m[1]];
  if(!b || !b.alt || !b.alt[m[2] - 1]) return null;
  return Object.assign({}, b, { id, base: b.id, color: b.alt[m[2] - 1], name: b.name + ' (Variante ' + m[2] + ')', price: Math.ceil(b.price * 1.3 / 10) * 10, variant: +m[2], alt: null });
}
function variants(id){ const b = ITEMS[id]; return b && b.alt ? b.alt.map((c, i) => id + '~' + (i + 1)) : []; }
// Monats-Schaufenster: gerade Monate Set 0, ungerade Set 1 (Monatsindex seit Jahr 0, UTC)
function shopSetOf(t){ const d = new Date(t || Date.now()); return (d.getUTCFullYear() * 12 + d.getUTCMonth()) % 2; }
function onSale(id, t){ const it = item(id); return !!it && (it.shop !== 'monat' || it.shopSet === shopSetOf(t)); }

function normalize(av){
  av = av && typeof av === 'object' ? av : {};
  const out = { animal: ANIMALS[av.animal] ? av.animal : DEFAULT.animal, color: COLORS.includes(av.color) ? av.color : DEFAULT.color, equip: {} };
  const eq = av.equip && typeof av.equip === 'object' ? av.equip : DEFAULT.equip;
  Object.keys(SLOTS).forEach(s => { const it = item(eq[s]); if(it && it.slot === s) out.equip[s] = it.id; });
  if(!out.equip.oberteil) out.equip.oberteil = 'tshirt_grau';
  return out;
}
// Titel (Schriftzug unter dem Namen) und das seltenste getragene Teil (für „trägt …“ und den Chip-Rahmen)
function title(av){ const it = av && av.equip && item(av.equip.titel); return it ? { text: it.name, rarity: it.rarity, glanz: !!it.glanz } : null; }
function best(av){
  const n = normalize(av); let top = null;
  Object.keys(n.equip).forEach(s => { const it = item(n.equip[s]); if(it && s !== 'titel' && (!top || RARITY[it.rarity].n > RARITY[top.rarity].n)) top = it; });
  return top && top.rarity !== 'gewoehnlich' ? { name: top.name, rarity: top.rarity, rarityName: RARITY[top.rarity].name, color: RARITY[top.rarity].color } : null;
}
function setDone(av){
  const ids = Object.values(av.equip).map(id => item(id)).filter(Boolean);
  return Object.keys(SETS).find(s => { const all = Object.keys(ITEMS).filter(k => ITEMS[k].set === s && ITEMS[k].slot !== 'titel'); return all.every(k => ids.some(i => (i.base || i.id) === k)); }) || null;
}

/* ---------- Zeichnung (viewBox 100×100) ---------- */
const eyes = (fur, big) => big
  ? '<g class="av-eyes"><circle cx="40" cy="44" r="8" fill="#fff"/><circle cx="60" cy="44" r="8" fill="#fff"/><circle cx="41" cy="45" r="3.6" fill="#1b1b1b"/><circle cx="59" cy="45" r="3.6" fill="#1b1b1b"/><circle cx="42.2" cy="43.6" r="1.1" fill="#fff"/><circle cx="60.2" cy="43.6" r="1.1" fill="#fff"/></g>'
  : '<g class="av-eyes"><circle cx="41" cy="44" r="3.4" fill="#1b1b1b"/><circle cx="59" cy="44" r="3.4" fill="#1b1b1b"/><circle cx="42.1" cy="42.9" r="1" fill="#fff"/><circle cx="60.1" cy="42.9" r="1" fill="#fff"/></g>';
const nose = (y, c) => '<path d="M46.5 ' + y + 'h7l-3.5 4z" fill="' + (c || '#1b1b1b') + '"/>';
const HEADS = {
  fuchs: a => '<path d="M29 32L22 10L42 24z" fill="' + a.fur + '"/><path d="M71 32L78 10L58 24z" fill="' + a.fur + '"/><path d="M29 28L25 15L37 24z" fill="#3a1f10"/><path d="M71 28L75 15L63 24z" fill="#3a1f10"/>'
    + '<ellipse cx="50" cy="46" rx="24" ry="22" fill="' + a.fur + '"/><path d="M27 48Q38 58 50 66Q62 58 73 48Q66 64 50 70Q34 64 27 48z" fill="' + a.light + '"/>' + nose(55),
  baer: a => '<circle cx="30" cy="25" r="9" fill="' + a.fur + '"/><circle cx="70" cy="25" r="9" fill="' + a.fur + '"/><circle cx="30" cy="25" r="4.5" fill="' + a.light + '"/><circle cx="70" cy="25" r="4.5" fill="' + a.light + '"/>'
    + '<circle cx="50" cy="46" r="25" fill="' + a.fur + '"/><ellipse cx="50" cy="56" rx="11" ry="8.5" fill="' + a.light + '"/>' + nose(51),
  eule: a => '<path d="M30 30L26 14L40 25z" fill="' + a.fur + '"/><path d="M70 30L74 14L60 25z" fill="' + a.fur + '"/>'
    + '<ellipse cx="50" cy="47" rx="25" ry="24" fill="' + a.fur + '"/><circle cx="40" cy="44" r="11" fill="' + a.light + '"/><circle cx="60" cy="44" r="11" fill="' + a.light + '"/><path d="M47 53h6l-3 7z" fill="#f0a93a"/>'
    + '<path d="M36 64q4 3 8 0M48 66q4 3 8 0M58 63q3 3 6 0" stroke="#5f5445" stroke-width="1.4" fill="none"/>',
  wolf: a => '<path d="M28 34L25 10L44 26z" fill="' + a.fur + '"/><path d="M72 34L75 10L56 26z" fill="' + a.fur + '"/><path d="M30 29L28 16L39 26z" fill="#4a525a"/><path d="M70 29L72 16L61 26z" fill="#4a525a"/>'
    + '<ellipse cx="50" cy="46" rx="24" ry="23" fill="' + a.fur + '"/><path d="M36 50Q50 44 64 50Q62 68 50 70Q38 68 36 50z" fill="' + a.light + '"/>' + nose(53),
  pinguin: a => '<ellipse cx="50" cy="47" rx="25" ry="25" fill="' + a.fur + '"/><path d="M50 38C44 30 30 34 31 48C32 62 42 68 50 68C58 68 68 62 69 48C70 34 56 30 50 38z" fill="' + a.light + '"/>'
    + '<path d="M44 53h12l-6 6z" fill="#f39c12"/>',
  biber: a => '<circle cx="32" cy="27" r="5.5" fill="' + a.fur + '"/><circle cx="68" cy="27" r="5.5" fill="' + a.fur + '"/>'
    + '<ellipse cx="50" cy="47" rx="24" ry="23" fill="' + a.fur + '"/><ellipse cx="50" cy="56" rx="12" ry="9" fill="' + a.light + '"/>' + nose(50, '#3a2414')
    + '<rect x="46.4" y="58" width="3.4" height="6" rx="1" fill="#fff"/><rect x="50.2" y="58" width="3.4" height="6" rx="1" fill="#fff"/>',
  steinbock: a => '<path d="M36 26C30 12 16 8 10 16C18 12 26 18 30 30z" fill="#6d5a44"/><path d="M64 26C70 12 84 8 90 16C82 12 74 18 70 30z" fill="#6d5a44"/>'
    + '<ellipse cx="27" cy="36" rx="7" ry="4" fill="' + a.fur + '" transform="rotate(-20 27 36)"/><ellipse cx="73" cy="36" rx="7" ry="4" fill="' + a.fur + '" transform="rotate(20 73 36)"/>'
    + '<ellipse cx="50" cy="46" rx="22" ry="24" fill="' + a.fur + '"/><ellipse cx="50" cy="58" rx="10" ry="8" fill="' + a.light + '"/><path d="M45 68Q50 80 55 68z" fill="' + a.light + '"/>' + nose(53, '#3b2f22'),
  katze: a => '<path d="M28 34L26 12L44 26z" fill="' + a.fur + '"/><path d="M72 34L74 12L56 26z" fill="' + a.fur + '"/><path d="M30 29L29 17L39 26z" fill="#f2b8c6"/><path d="M70 29L71 17L61 26z" fill="#f2b8c6"/>'
    + '<ellipse cx="50" cy="47" rx="24" ry="22" fill="' + a.fur + '"/><path d="M47 52h6l-3 3.5z" fill="#e58aa0"/>'
    + '<path d="M44 55q-9-1-16 1M44 57q-8 1-15 4M56 55q9-1 16 1M56 57q8 1 15 4" stroke="#3b3f46" stroke-width="1" fill="none"/>'
};
function top(it){
  if(!it) return '';
  const c = it.color;
  const base = '<path d="M14 100C14 84 28 76 50 76C72 76 86 84 86 100z" fill="' + c + '"/>';
  let extra = '';
  if(it.kind === 'hemd') extra = '<path d="M41 76L50 88L59 76L56 74L50 82L44 74z" fill="#fff" stroke="#9aa3ab" stroke-width=".6"/><circle cx="50" cy="92" r="1.3" fill="#555"/><circle cx="50" cy="97" r="1.3" fill="#555"/>';
  else extra = '<path d="M42 76Q50 84 58 76" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>';
  if(it.motif === 'zahnrad') extra += '<g transform="translate(50 91)" fill="#f5c518"><circle r="5"/>' + [0, 45, 90, 135].map(r => '<rect x="-1.4" y="-7.5" width="2.8" height="15" transform="rotate(' + r + ')"/>').join('') + '<circle r="2" fill="' + c + '"/></g>';
  if(it.motif === 'blitz') extra += '<path d="M52 83L44 93h5l-3 7l9-11h-5z" fill="#f5c518"/>';
  if(it.motif === 'kariert') extra += '<g stroke="rgba(255,255,255,.35)" stroke-width="1.2">' + [24, 34, 44, 56, 66, 76].map(x => '<path d="M' + x + ' 78V100"/>').join('') + [84, 92].map(y => '<path d="M16 ' + y + 'H84"/>').join('') + '</g>';
  return base + extra;
}
function chain(it){
  if(!it) return '';
  let s = '<path d="M38 74Q50 88 62 74" stroke="' + it.color + '" stroke-width="2.2" fill="none" stroke-dasharray="2.5 1.2"/>';
  if(it.motif === 'zahnrad') s += '<g transform="translate(50 86)" fill="' + it.color + '"><circle r="3.6"/>' + [0, 60, 120].map(r => '<rect x="-1" y="-5.2" width="2" height="10.4" transform="rotate(' + r + ')"/>').join('') + '<circle r="1.4" fill="#333"/></g>';
  else s += '<circle cx="50" cy="84.5" r="3" fill="' + it.color + '"/>';
  return s;
}
function glasses(it, big, u){
  if(!it) return '';
  if(it.kind === 'visor' || it.kind === 'ski') return glasses2(it, u || 'x-');
  const r = big ? 10 : 7.5, c = it.color;
  if(it.kind === 'rund') return '<g fill="none" stroke="' + c + '" stroke-width="2"><circle cx="40" cy="44" r="' + r + '"/><circle cx="60" cy="44" r="' + r + '"/><path d="M' + (40 + r) + ' 44h' + (20 - 2 * r) + '"/></g>';
  if(it.kind === 'eckig') return '<g fill="none" stroke="' + c + '" stroke-width="2"><rect x="' + (40 - r) + '" y="' + (44 - r * 0.75) + '" width="' + 2 * r + '" height="' + 1.5 * r + '" rx="2"/><rect x="' + (60 - r) + '" y="' + (44 - r * 0.75) + '" width="' + 2 * r + '" height="' + 1.5 * r + '" rx="2"/><path d="M' + (40 + r) + ' 44h' + (20 - 2 * r) + '"/></g>';
  if(it.kind === 'sonne') return '<g fill="' + c + '"><rect x="' + (40 - r - 1) + '" y="39" width="' + (2 * r + 2) + '" height="' + (big ? 13 : 10) + '" rx="4"/><rect x="' + (60 - r - 1) + '" y="39" width="' + (2 * r + 2) + '" height="' + (big ? 13 : 10) + '" rx="4"/><path d="M' + (40 + r) + ' 42h' + (20 - 2 * r) + '" stroke="' + c + '" stroke-width="2"/></g><path d="M34 41l4-1" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/>';
  return '<path d="M26 44h48" stroke="#333" stroke-width="2.4"/><rect x="29" y="36" width="42" height="15" rx="6" fill="' + c + '" fill-opacity=".45" stroke="#e5f4ff" stroke-width="1.6"/>';
}
function hat(it, u){
  if(!it) return '';
  { const h = hat2(it, u || 'x-'); if(h) return h; }
  const c = it.color;
  if(it.kind === 'kappe') return '<path d="M27 32C27 16 73 16 73 32z" fill="' + c + '"/><path d="M50 32H84Q86 36 80 37H50z" fill="' + c + '"/><path d="M27 32H73" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/><circle cx="50" cy="17.5" r="2.2" fill="' + c + '" stroke="rgba(0,0,0,.25)"/>';
  if(it.kind === 'muetze') return '<path d="M26 34C26 12 74 12 74 34z" fill="' + c + '"/><rect x="25" y="29" width="50" height="8" rx="4" fill="' + c + '" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 2"/><circle cx="50" cy="11" r="5" fill="#fff"/>';
  if(it.kind === 'helm') return '<path d="M24 33C24 11 76 11 76 33z" fill="' + c + '"/><path d="M19 33H81Q82 37 78 37H22Q18 37 19 33z" fill="' + c + '" stroke="rgba(0,0,0,.25)"/><path d="M50 13V33M40 16V32M60 16V32" stroke="rgba(0,0,0,.18)" stroke-width="2"/>';
  return '';
}
/* ---------- Avatare 2.0 (Auftrag A0–A3): Ganzkörper im 2.5D-Stil ----------
   svg(av, {size:'chip'|'card'|'stage', pose:'idle'|'wave'|'jubel'|'dance'|'sad', style:'soft'|'flat'|'knete', anim, uid, title})
   - chip: nur Kopf im Kreis, ohne Verläufe (24–40 px: Portal-Kopf, Listen, Rangliste)
   - card/stage: ganzer Körper (Chibi, Kopf ≈ halbe Höhe) auf einem isometrischen Sockel in der Avatarfarbe; stage mit grösserem Sockel und Lichtkegel
   - style: soft = 2.5D weich schattiert (Standard, Entscheid A0), flat = Kahoot-nah flach, knete = Spielzeug-Look mit mehr Volumen
   - Verlauf-/Clip-IDs sind je Instanz eindeutig (uid), damit 40 Avatare auf einer Seite nicht kollidieren.
   - anim: CSS-Klassen für Wippen, Blinzeln, Jubelsprung, Siegestanz (CSS in SPSQAvatar.CSS, im Browser einmal eingefügt; prefers-reduced-motion → statisch). */
let SEQ = 0;
const POSES = ['idle', 'wave', 'jubel', 'dance', 'sad'];
const STYLES = ['soft', 'flat', 'knete'];
function mix(hex, f){   // f < 0: dunkler, f > 0: heller
  const n = parseInt(String(hex).slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  return '#' + c.map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)).map(v => ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2)).join('');
}
// Kopf-Silhouette je Tier (für Schattierung und Randlicht) und Höhe der Nase (Mund darunter)
const HEAD_SIL = { fuchs: [50, 46, 24, 22], baer: [50, 46, 25, 25], eule: [50, 47, 25, 24], wolf: [50, 46, 24, 23], pinguin: [50, 47, 25, 25], biber: [50, 47, 24, 23], steinbock: [50, 46, 22, 24], katze: [50, 47, 24, 22] };
const MOUTH_Y = { fuchs: 60.5, baer: 57, wolf: 58.5, steinbock: 58.5, katze: 57.5 };
const ARMS = { idle: [14, -14], wave: [14, -150], jubel: [152, -152], dance: [140, -35], sad: [5, -5] };
const TAILS = {
  fuchs: a => '<path d="M64 88C80 90 92 78 88 62C86 72 78 76 68 78z" fill="' + a.fur + '"/><path d="M88 62C86 68 84 70 80 72C84 66 86 62 88 62z" fill="' + a.light + '"/>',
  wolf: a => '<path d="M64 88C78 92 90 84 90 70C86 78 78 80 68 80z" fill="' + a.fur + '"/><path d="M90 70C88 75 86 77 83 78C86 74 88 72 90 70z" fill="' + a.light + '"/>',
  katze: a => '<path d="M66 90C80 92 84 80 80 70" stroke="' + a.fur + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
  biber: () => '<ellipse cx="74" cy="98" rx="11" ry="5.5" fill="#5a3a22" transform="rotate(-18 74 98)"/><path d="M66 96l14-4M68 100l14-4" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>',
  baer: a => '<circle cx="67" cy="88" r="4.5" fill="' + a.fur + '"/>',
  steinbock: a => '<ellipse cx="67" cy="84" rx="3" ry="5" fill="' + a.fur + '" transform="rotate(30 67 84)"/>',
  eule: a => '<path d="M44 94l6 8l6-8z" fill="' + mix(a.fur, -0.2) + '"/>',
  pinguin: () => ''
};
function eyes2(a, big, pose){
  if(pose === 'jubel' || pose === 'dance'){   // fröhlich zugekniffen
    const y = 45, w = big ? 7 : 5;
    return '<g class="av-eyes" fill="none" stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round"><path d="M' + (41 - w) + ' ' + (y + 2) + 'Q41 ' + (y - 4) + ' ' + (41 + w) + ' ' + (y + 2) + '"/><path d="M' + (59 - w) + ' ' + (y + 2) + 'Q59 ' + (y - 4) + ' ' + (59 + w) + ' ' + (y + 2) + '"/></g>';
  }
  const r = big ? 8 : 4.4, p = big ? 3.8 : r;
  let s = '<g class="av-eyes">';
  if(big) s += '<circle cx="40" cy="44" r="' + r + '" fill="#fff"/><circle cx="60" cy="44" r="' + r + '" fill="#fff"/>';
  s += '<circle cx="41" cy="45" r="' + p + '" fill="#1b1b1b"/><circle cx="59" cy="45" r="' + p + '" fill="#1b1b1b"/>'
    + '<circle cx="42.6" cy="43.2" r="' + (p * 0.38) + '" fill="#fff"/><circle cx="60.6" cy="43.2" r="' + (p * 0.38) + '" fill="#fff"/>'
    + '<circle cx="40" cy="46.6" r="' + (p * 0.16) + '" fill="#fff" opacity=".8"/><circle cx="58" cy="46.6" r="' + (p * 0.16) + '" fill="#fff" opacity=".8"/></g>';
  if(pose === 'sad') s += '<path d="M34 36l9 3M66 36l-9 3" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round"/><path d="M38 50q-1.6 3.2 0 4.4q1.6-1.2 0-4.4z" fill="#7cc4ff"/>';
  return s;
}
function mouth(animal, pose){
  const y = MOUTH_Y[animal]; if(!y) return '';
  if(pose === 'sad') return '<path d="M45 ' + (y + 2.5) + 'Q50 ' + (y - 1) + ' 55 ' + (y + 2.5) + '" stroke="#1b1b1b" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  if(pose === 'jubel' || pose === 'dance') return '<path d="M44.5 ' + y + 'Q50 ' + (y + 8) + ' 55.5 ' + y + 'z" fill="#7a1f2b"/><path d="M47 ' + (y + 3.6) + 'Q50 ' + (y + 6) + ' 53 ' + (y + 3.6) + '" fill="#e8798b"/>';
  return '<path d="M46 ' + y + 'Q48 ' + (y + 2.4) + ' 50 ' + y + 'Q52 ' + (y + 2.4) + ' 54 ' + y + '" stroke="#1b1b1b" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
}
function torsoDeco(it, u){
  if(!it) return '';
  let s = '';
  if(it.kind === 'hemd') s += '<path d="M44 56L50 66L56 56L54 55L50 61L46 55z" fill="#fff" stroke="#9aa3ab" stroke-width=".5"/><circle cx="50" cy="71" r="1.1" fill="#555"/><circle cx="50" cy="77" r="1.1" fill="#555"/><circle cx="50" cy="83" r="1.1" fill="#555"/>';
  else s += '<path d="M43 56.5Q50 63 57 56.5" stroke="rgba(0,0,0,.28)" stroke-width="1.8" fill="none"/>';
  if(it.motif === 'zahnrad') s += '<g transform="translate(50 74)" fill="#f5c518"><circle r="4.2"/>' + [0, 45, 90, 135].map(r => '<rect x="-1.2" y="-6.3" width="2.4" height="12.6" transform="rotate(' + r + ')"/>').join('') + '<circle r="1.7" fill="' + it.color + '"/></g>';
  if(it.motif === 'blitz') s += '<path d="M52 67L44 77h5l-3 8l9-11h-5z" fill="#f5c518"/>';
  if(it.motif === 'kariert') s += '<g clip-path="url(#' + u + 't)" stroke="rgba(255,255,255,.35)" stroke-width="1.1">' + [33, 39, 45, 55, 61, 67].map(x => '<path d="M' + x + ' 54V96"/>').join('') + [66, 74, 82, 90].map(y => '<path d="M28 ' + y + 'H72"/>').join('') + '</g>';
  return s;
}
function chain2(it, u){
  if(!it) return '';
  const c = it.color === '#f5c518' ? 'url(#' + u + 'g)' : it.color;
  let s = '<path d="M41 56Q50 68 59 56" stroke="' + c + '" stroke-width="1.8" fill="none" stroke-dasharray="2.2 1"/>';
  if(it.motif === 'zahnrad') s += '<g transform="translate(50 66)" fill="' + c + '"><circle r="3.2"/>' + [0, 60, 120].map(r => '<rect x="-.9" y="-4.6" width="1.8" height="9.2" transform="rotate(' + r + ')"/>').join('') + '<circle r="1.2" fill="#333"/></g>';
  else s += '<circle cx="50" cy="65" r="2.6" fill="' + c + '"/>';
  return s + '<circle cx="49" cy="64" r=".9" fill="#fff" opacity=".7"/>';
}
/* ---------- Garderobe 2.0: Zeichnungen der neuen Teile ----------
   Kopf/Brille im Kopf-Koordinatensystem (100×100, wie der Chip), alles andere im Figur-System (100×120). u = Instanz-Präfix für IDs. */
function hat2(it, u){
  const c = it.color, d = mix(c, -0.3), l = mix(c, 0.35);
  switch(it.kind){
    case 'bergmuetze': return '<path d="M25 35C25 9 75 9 75 35z" fill="' + c + '"/><path d="M26 27H74" stroke="#fff" stroke-width="3" stroke-dasharray="4 3"/><rect x="24" y="31" width="52" height="7" rx="3.5" fill="' + d + '"/>'
      + '<path d="M26 36Q22 48 28 52Q32 46 32 38z" fill="' + c + '"/><path d="M74 36Q78 48 72 52Q68 46 68 38z" fill="' + c + '"/><circle cx="50" cy="9" r="5.5" fill="#fff"/><circle cx="48.5" cy="7.5" r="1.6" fill="#e2e8f0"/>';
    case 'lokmuetze': return '<path d="M27 33C26 14 74 14 73 33z" fill="' + c + '"/>' + [32, 38, 44, 50, 56, 62, 68].map(x => '<path d="M' + x + ' 17V33" stroke="#e2e8f0" stroke-width="1.6" opacity=".8"/>').join('')
      + '<path d="M26 33H74" stroke="' + d + '" stroke-width="3"/><path d="M30 34Q50 46 70 34Q66 40 50 41Q34 40 30 34z" fill="#111827"/>';
    case 'giesser': return '<path d="M23 34C23 10 77 10 77 34z" fill="' + c + '"/><path d="M28 18Q50 6 72 18" stroke="' + l + '" stroke-width="2.4" fill="none"/>'
      + '<path d="M19 34H81Q82 38 78 38H22Q18 38 19 34z" fill="' + d + '"/><rect x="27" y="36" width="46" height="17" rx="6" fill="url(#' + u + 'v)" opacity=".86"/><path d="M31 39h12" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/>'
      + '<path d="M22 38Q20 60 28 66L32 52z" fill="#cbd5e1" opacity=".9"/><path d="M78 38Q80 60 72 66L68 52z" fill="#cbd5e1" opacity=".9"/>';
    case 'stirnlampe': return '<path d="M25 31Q50 24 75 31" stroke="#111827" stroke-width="5" fill="none"/><path class="av-beam" d="M50 28L88 6L96 24z" fill="' + c + '" opacity=".28"/>'
      + '<rect x="43" y="22" width="14" height="11" rx="3" fill="#334155"/><circle cx="50" cy="27.5" r="4" fill="' + c + '"/><circle cx="48.8" cy="26.3" r="1.3" fill="#fff"/>';
    case 'kranz': return '<g fill="' + c + '">' + Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.05 + i * 0.1125), x = 50 + 27 * Math.cos(a), y = 38 + 22 * Math.sin(a); return '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="5" ry="2.4" transform="rotate(' + (a * 180 / Math.PI + 60).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>'; }).join('') + '</g>'
      + '<g fill="' + l + '">' + Array.from({ length: 8 }, (_, i) => { const a = Math.PI * (1.1 + i * 0.115), x = 50 + 24 * Math.cos(a), y = 38 + 19 * Math.sin(a); return '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="3.6" ry="1.8" transform="rotate(' + (a * 180 / Math.PI - 60).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>'; }).join('') + '</g><circle cx="50" cy="16" r="2.4" fill="#f5c518"/>';
    case 'deer': return '<path d="M25 34C25 13 75 13 75 34z" fill="' + c + '"/><g stroke="' + d + '" stroke-width="1" opacity=".7">' + [30, 38, 46, 54, 62, 70].map(x => '<path d="M' + x + ' 16V34"/>').join('') + [22, 28].map(y => '<path d="M27 ' + y + 'H73"/>').join('') + '</g>'
      + '<path d="M25 33Q18 34 16 40Q24 40 30 35z" fill="' + c + '"/><path d="M75 33Q82 34 84 40Q76 40 70 35z" fill="' + c + '"/><path d="M46 14q4 -6 8 0" stroke="' + d + '" stroke-width="2" fill="none"/><path d="M40 34Q50 40 60 34" stroke="' + d + '" stroke-width="2" fill="none"/>';
    case 'krone': return '<path d="M27 32L29 12L39 22L50 8L61 22L71 12L73 32z" fill="url(#' + u + 'g)" stroke="#a87a00" stroke-width="1"/><rect x="27" y="29" width="46" height="6" rx="2" fill="url(#' + u + 'g)" stroke="#a87a00" stroke-width="1"/>'
      + '<circle cx="50" cy="20" r="3" fill="#e0457b"/><circle cx="37" cy="25" r="2.2" fill="#38bdf8"/><circle cx="63" cy="25" r="2.2" fill="#22c55e"/><path class="av-spark" d="M66 9l1.2 3l3 1.2l-3 1.2l-1.2 3l-1.2-3l-3-1.2l3-1.2z" fill="#fff"/>';
    case 'kuerbis': return '<ellipse cx="50" cy="24" rx="24" ry="14" fill="' + c + '"/><path d="M38 12Q34 24 38 36M50 10V38M62 12Q66 24 62 36" stroke="' + d + '" stroke-width="1.6" fill="none"/><path d="M50 10Q52 2 58 2" stroke="#3f6212" stroke-width="3" fill="none"/>';
    case 'stroh': return '<ellipse cx="50" cy="31" rx="36" ry="8" fill="' + c + '"/><path d="M32 30C32 12 68 12 68 30z" fill="' + c + '"/><path d="M33 26H67" stroke="#b91c1c" stroke-width="3.5"/><path d="M18 31Q50 40 82 31" stroke="' + d + '" stroke-width="1" fill="none"/>';
  }
  return '';
}
function glasses2(it, u){
  const c = it.color;
  if(it.kind === 'visor') return '<path d="M24 44h52" stroke="#111827" stroke-width="2.4"/><rect x="26" y="36" width="48" height="15" rx="7.5" fill="#0b1220" fill-opacity=".85" stroke="' + c + '" stroke-width="1.4"/>'
    + '<g clip-path="url(#' + u + 'vc)"><rect class="av-led" x="27" y="41.5" width="9" height="4" rx="2" fill="' + c + '"/></g><path d="M30 39h14" stroke="' + c + '" stroke-opacity=".5" stroke-width="1"/>';
  if(it.kind === 'ski') return '<path d="M22 42Q50 36 78 42" stroke="#111827" stroke-width="4" fill="none"/><rect x="27" y="34" width="46" height="19" rx="9" fill="#111827"/><rect x="29" y="36" width="42" height="15" rx="7.5" fill="url(#' + u + 'm)"/>'
    + '<path d="M33 39q6 -2 12 0" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/>';
  return '';
}
function torso2(it, u){
  const c = it.color, d = mix(c, -0.3);
  if(it.kind === 'hoodie') return '<path d="M38 57Q50 64 62 57Q60 70 50 72Q40 70 38 57z" fill="' + d + '"/><path d="M38 80H62L60 90H40z" fill="' + d + '"/><path d="M46 60v9M54 60v9" stroke="#e2e8f0" stroke-width="1"/>'
    + '<text x="50" y="78.5" font-family="monospace" font-weight="700" font-size="5.2" text-anchor="middle" fill="#39ff14">IF…THEN</text>';
  if(it.kind === 'schuerze') return '<path d="M38 60Q50 56 62 60L64 96Q50 100 36 96z" fill="' + c + '"/><path d="M38 60L44 54M62 60L56 54" stroke="' + d + '" stroke-width="2"/><path d="M40 74H60" stroke="' + d + '" stroke-width="1.4"/>'
    + '<circle cx="40" cy="62" r="1.1" fill="#d6d3d1"/><circle cx="60" cy="62" r="1.1" fill="#d6d3d1"/><rect x="45" y="78" width="10" height="7" rx="1.5" fill="' + d + '"/>';
  if(it.kind === 'guertel') return '<rect x="31" y="84" width="38" height="5" rx="2" fill="#78350f"/><rect x="47" y="84" width="6" height="5" rx="1" fill="#d6d3d1"/><rect x="34" y="88" width="7" height="8" rx="1.5" fill="#92400e"/>'
    + '<path d="M60 88v9" stroke="#facc15" stroke-width="2.4"/><path d="M60 97v3" stroke="#94a3b8" stroke-width="1.2"/><path d="M64 88l2 9M67 88l-2 9" stroke="#ef4444" stroke-width="1.6"/>';
  if(it.motif === 'verlauf') return '<path d="' + TORSO + '" fill="url(#' + u + 'sun)"/><circle cx="50" cy="76" r="5" fill="#fde047" opacity=".9"/><path d="M38 82H62M40 86H60" stroke="#7c2d12" stroke-width="1.4" opacity=".6"/>';
  return '';
}
function chain3(it, u){
  const c = it.color, strap = '<path d="M41 56Q50 64 59 56" stroke="#94a3b8" stroke-width="1.2" fill="none"/>';
  if(it.kind === 'kabine') return strap + '<g class="av-swing"><path d="M50 61v4" stroke="#334155" stroke-width="1.2"/><rect x="44" y="65" width="12" height="10" rx="2" fill="' + c + '"/><rect x="45.5" y="66.5" width="4" height="4" fill="#bfdbfe"/><rect x="50.5" y="66.5" width="4" height="4" fill="#bfdbfe"/></g>';
  if(it.kind === 'laterne') return strap + '<rect x="45" y="62" width="10" height="13" rx="2" fill="' + c + '"/><path d="M47 62v-2h6v2" stroke="' + c + '" stroke-width="1.2" fill="none"/>'
    + '<circle class="av-lamp-r" cx="50" cy="66" r="2.4" fill="#ef4444"/><circle class="av-lamp-g" cx="50" cy="71.5" r="2.4" fill="#22c55e"/>';
  if(it.kind === 'stahl') return strap + '<circle class="av-glow" cx="50" cy="68" r="8" fill="' + c + '" opacity=".35"/><rect x="45" y="63" width="10" height="9" rx="1.5" fill="url(#' + u + 'h)"/>';
  if(it.kind === 'schal') return '<path d="M38 57Q50 64 62 57L62 61Q50 68 38 61z" fill="' + c + '"/><path d="M56 60l3 18l5-1l-3-17z" fill="' + c + '"/><path d="M40 59v3M45 61v3M50 62v3M55 61v3M57.5 66l4 -1M58.5 71l4 -1" stroke="#fff" stroke-width="1.6"/>';
  return '';
}
// Gegenstand in der Hand: aufrecht im Bild, Ursprung = Hand (gegen die Armdrehung zurückgedreht)
function handItem(it, u){
  const c = it.color, d = mix(c, -0.3);
  switch(it.kind){
    case 'kelle': return '<path d="M0 2V-14" stroke="#1f2937" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-20" r="7" fill="#fff"/><circle cx="0" cy="-20" r="5.4" fill="' + c + '"/><circle cx="-2" cy="-22" r="1.4" fill="#fff" opacity=".6"/>';
    case 'multimeter': return '<rect x="-6.5" y="-15" width="13" height="18" rx="2.5" fill="' + c + '"/><rect x="-4.5" y="-13" width="9" height="5.5" rx="1" fill="#0f172a"/>'
      + '<text class="av-mm1" x="0" y="-8.8" font-family="monospace" font-size="4.2" text-anchor="middle" fill="#4ade80">24.0</text><text class="av-mm2" x="0" y="-8.8" font-family="monospace" font-size="4.2" text-anchor="middle" fill="#4ade80">23.8</text>'
      + '<circle cx="0" cy="-2.5" r="2.6" fill="#1f2937"/><path d="M-3 3l-4 9M3 3l4 9" stroke="#ef4444" stroke-width="1.2"/><path d="M3 3l4 9" stroke="#111827" stroke-width="1.2"/>';
    case 'pokal': return '<path d="M-6 -16H6Q6 -6 0 -5Q-6 -6 -6 -16z" fill="url(#' + u + 'g)"/><path d="M-6 -14q-4 0 -3 4q1 2 4 2M6 -14q4 0 3 4q-1 2 -4 2" stroke="' + d + '" stroke-width="1.2" fill="none"/><rect x="-1.2" y="-5" width="2.4" height="4" fill="' + d + '"/><rect x="-4.5" y="-1.5" width="9" height="3" rx="1" fill="' + d + '"/>';
    case 'lupe': return '<path d="M0 2L5 -8" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/><circle cx="8" cy="-14" r="7" fill="#bae6fd" fill-opacity=".45" stroke="#334155" stroke-width="2"/><path d="M5 -17q2 -2 4 -1" stroke="#fff" stroke-width="1.2" fill="none"/>';
    case 'schirm': return '<path d="M0 4V-22" stroke="#334155" stroke-width="1.4"/><path d="M0 4q0 3 -3 3" stroke="#334155" stroke-width="1.4" fill="none"/><path d="M-17 -18Q0 -36 17 -18Q12 -21 8.5 -18Q4 -21 0 -18Q-4 -21 -8.5 -18Q-12 -21 -17 -18z" fill="' + c + '"/>';
    case 'ballon': return '<path d="M0 2Q4 -10 -1 -22" stroke="#94a3b8" stroke-width=".8" fill="none"/><g class="av-float"><ellipse cx="-1" cy="-30" rx="7" ry="8.5" fill="' + c + '"/><path d="M-1 -21.5l-1.5 2h3z" fill="' + c + '"/><ellipse cx="-3.5" cy="-33" rx="1.8" ry="2.6" fill="#fff" opacity=".5"/></g>';
  }
  return '';
}
function back(it, u){
  const c = it.color, d = mix(c, -0.3);
  switch(it.kind){
    case 'greifarm': return '<rect x="29" y="58" width="42" height="30" rx="6" fill="' + d + '"/><g class="av-robo"><path d="M64 60L76 44L86 32" stroke="' + c + '" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="64" cy="60" r="3.6" fill="#334155"/><circle cx="76" cy="44" r="3" fill="#334155"/>'
      + '<path d="M86 32l-2 -7M86 32l6 -4" stroke="#334155" stroke-width="2.4" stroke-linecap="round"/></g>';
    case 'umhang': return '<path d="M35 58Q50 54 65 58L78 104Q50 112 22 104z" fill="' + c + '"/><path d="M22 104Q50 112 78 104" stroke="#f5c518" stroke-width="2" fill="none"/><text x="72" y="96" font-size="6" fill="#f5c518" font-family="monospace">:=</text><text x="22" y="96" font-size="6" fill="#f5c518" font-family="monospace">U</text>';
    case 'kabel': return ['#7c4a24', '#1d4ed8', '#111827', '#64748b', '#16a34a', '#facc15'].map((k, i) => { const x0 = 37 + i * 5.2, x1 = 26 + i * 9.6; return '<path class="av-wave" d="M' + x0 + ' 58Q' + (x0 + (i % 2 ? 4 : -4)) + ' 80 ' + x1 + ' 104" stroke="' + k + '" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="' + (x1 - 1.4) + '" y="103" width="2.8" height="4" fill="#cbd5e1"/>'; }).join('');
    case 'jetpack': return '<rect x="30" y="58" width="12" height="26" rx="5" fill="' + c + '"/><rect x="58" y="58" width="12" height="26" rx="5" fill="' + c + '"/><path class="av-flame" d="M32 85Q36 98 40 85z" fill="#f97316"/><path class="av-flame" d="M60 85Q64 98 68 85z" fill="#f97316"/>';
  }
  return '';
}
function feet(it, dark, part){
  if(!it) return part('ellipse', 'cx="41.5" cy="103" rx="7.5" ry="4.2"', dark) + part('ellipse', 'cx="58.5" cy="103" rx="7.5" ry="4.2"', dark);
  const c = it.color, sole = it.kind === 'sicher' ? '#111827' : '#f8fafc';
  return [41.5, 58.5].map(x => '<ellipse cx="' + x + '" cy="104.6" rx="8.4" ry="3" fill="' + sole + '"/>' + part('ellipse', 'cx="' + x + '" cy="102.6" rx="7.8" ry="4.2"', c)
    + (it.kind === 'sicher' ? '<path d="M' + (x - 7) + ' 103q3 -4 6 -4" stroke="#facc15" stroke-width="2" fill="none"/>' : '<path d="M' + (x - 2) + ' 100.5l3 1.5M' + (x - 3.5) + ' 102l3 1.5" stroke="' + (it.kind === 'neon' ? '#0f172a' : '#94a3b8') + '" stroke-width=".9"/>')
    + (it.kind === 'neon' ? '<ellipse cx="' + x + '" cy="105.5" rx="9" ry="1.6" fill="' + c + '" opacity=".45"/>' : '')).join('');
}
function aura(it){
  const c = it.color;
  switch(it.kind){
    case 'code': return '<g class="av-aura" font-family="monospace" font-weight="700" fill="' + c + '">' + [['{', 14, 40, 0], ['}', 82, 46, .8], [':=', 10, 70, 1.6], ['IF', 80, 74, 2.4], ['}', 20, 22, 3.2], ['{', 74, 20, .4]].map(([t, x, y, dl]) => '<text class="av-rise" style="animation-delay:-' + dl + 's" x="' + x + '" y="' + y + '" font-size="9">' + t + '</text>').join('') + '</g>';
    case 'dampf': return '<g class="av-aura" fill="' + c + '">' + [[22, 92, 6, 0], [78, 90, 7, .7], [16, 72, 5, 1.4], [84, 66, 5.5, 2.1], [30, 50, 4, 2.8]].map(([x, y, r, dl]) => '<circle class="av-rise" style="animation-delay:-' + dl + 's" cx="' + x + '" cy="' + y + '" r="' + r + '" opacity=".75"/>').join('') + '</g>';
    case 'funken': return '<g class="av-aura" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round">' + [[16, 20, 0], [84, 14, .5], [26, 8, 1], [72, 30, 1.5], [12, 46, 2], [88, 52, .8], [50, 4, 1.2]].map(([x, y, dl]) => '<path class="av-fall" style="animation-delay:-' + dl + 's" d="M' + x + ' ' + y + 'l1.5 4"/>').join('') + '</g>';
    case 'champion': return '<g class="av-aura"><circle cx="50" cy="56" r="42" fill="' + c + '" opacity=".18"/><g class="av-spin" stroke="' + c + '" stroke-width="2.4" opacity=".55">' + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return '<path d="M' + (50 + 30 * Math.cos(a)).toFixed(1) + ' ' + (56 + 30 * Math.sin(a)).toFixed(1) + 'L' + (50 + 44 * Math.cos(a)).toFixed(1) + ' ' + (56 + 44 * Math.sin(a)).toFixed(1) + '"/>'; }).join('') + '</g></g>';
    case 'blitz': return '<g class="av-aura" fill="' + c + '">' + [[12, 30, 0], [80, 22, .35], [86, 70, .7], [10, 74, 1.05]].map(([x, y, dl]) => '<path class="av-flash" style="animation-delay:-' + dl + 's" d="M' + x + ' ' + y + 'l-5 9h4l-3 8l8-11h-4l3-6z"/>').join('') + '</g>';
  }
  return '';
}
function plate(it, av, u, stage, style, setKey){
  const rx = stage ? 40 : 34, h = style === 'knete' ? 8 : 5.5, pc = av.color;
  let top = 'url(#' + u + 'p)', side = mix(pc, -0.35), bottom = mix(pc, -0.45), deco = '';
  if(it){
    const c = it.color;
    if(it.kind === 'holz'){ top = c; side = mix(c, -0.35); bottom = mix(c, -0.5); deco = '<path d="M' + (50 - rx + 8) + ' 106Q50 101 ' + (50 + rx - 8) + ' 106M' + (50 - rx + 14) + ' 110Q50 106 ' + (50 + rx - 14) + ' 110" stroke="' + mix(c, -0.3) + '" stroke-width="1" fill="none"/>'; }
    else if(it.kind === 'metall'){ top = 'url(#' + u + 'mt)'; side = '#475569'; bottom = '#334155'; deco = [-0.7, -0.25, 0.25, 0.7].map(f => '<circle cx="' + (50 + f * rx).toFixed(1) + '" cy="' + (107 + (Math.abs(f) > 0.5 ? 2 : 6)) + '" r="1.1" fill="#e2e8f0"/>').join(''); }
    else if(it.kind === 'neon'){ top = '#0b1220'; side = '#111827'; bottom = '#020617'; deco = '<ellipse cx="50" cy="107" rx="' + (rx - 1) + '" ry="8.2" fill="none" stroke="' + c + '" stroke-width="2"/><ellipse cx="50" cy="107" rx="' + (rx + 1) + '" ry="9.6" fill="none" stroke="' + c + '" stroke-width="3" opacity=".3"/>'; }
    else if(it.kind === 'holo'){ top = c; side = mix(c, -0.3); bottom = mix(c, -0.5); deco = '<g class="av-holo"><ellipse cx="50" cy="107" rx="' + rx + '" ry="9" fill="' + c + '" opacity=".25"/>' + [-6, -2, 2, 6].map(y => '<path d="M' + (50 - rx + 6) + ' ' + (107 + y) + 'H' + (50 + rx - 6) + '" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>').join('') + '<path d="M' + (50 - rx * 0.8) + ' 107L36 70H64L' + (50 + rx * 0.8) + ' 107z" fill="' + c + '" opacity=".12"/></g>'; }
    else if(it.kind === 'gold'){ top = 'url(#' + u + 'g)'; side = '#a87a00'; bottom = '#7c5a00'; deco = '<path class="av-shine" d="M' + (50 - rx + 10) + ' 103l6 0l-4 8l-6 0z" fill="#fff" opacity=".6"/>'; }
    else if(it.kind === 'gipfel'){ deco = '<path d="M' + (50 - rx + 4) + ' 108L28 92L36 98L46 84L56 96L64 90L' + (50 + rx - 4) + ' 108z" fill="#64748b"/><path d="M46 84L41 91L46 89L50 92L52 90z" fill="#fff"/><path d="M28 92L25 97L29 96L32 97z" fill="#fff"/><path d="M64 90L61 95L65 94L67 95z" fill="#fff"/>'
      + '<g class="av-snow" fill="#fff">' + [[14, 10, 0], [30, 2, 1], [62, 8, 2], [84, 4, .5], [46, 0, 1.5], [76, 20, 2.5], [20, 30, 3]].map(([x, y, dl]) => '<circle class="av-fall" style="animation-delay:-' + dl + 's" cx="' + x + '" cy="' + y + '" r="1.3"/>').join('') + '</g>'; top = '#e2e8f0'; side = '#94a3b8'; bottom = '#64748b'; }
  }
  // Set-Bonus: ganze Kollektion getragen
  if(setKey === 'scl') deco += '<ellipse cx="50" cy="107" rx="' + (rx - 5) + '" ry="6.4" fill="none" stroke="#39ff14" stroke-width="1.4" stroke-dasharray="3 2"/>';
  if(setKey === 'kop') deco += '<path d="M' + (50 - rx) + ' 107Q50 95 ' + (50 + rx) + ' 107Q50 101 ' + (50 - rx) + ' 107z" fill="#fff" opacity=".85"/>';
  if(setKey === 'fup') deco += '<g stroke="#6b4423" stroke-width="2.2">' + [-24, -14, -4, 6, 16, 26].map(x => '<path d="M' + (50 + x) + ' 101.5l-2 11"/>').join('') + '</g><path d="M' + (50 - rx + 4) + ' 104.5H' + (50 + rx - 4) + 'M' + (50 - rx + 2) + ' 109.5H' + (50 + rx - 2) + '" stroke="#cbd5e1" stroke-width="1.6"/>';
  if(setKey === 'awl') deco += '<ellipse class="av-glow" cx="50" cy="107" rx="' + rx + '" ry="9" fill="none" stroke="#f97316" stroke-width="2.4"/>';
  if(setKey === 'sensor') deco += '<ellipse cx="50" cy="107" rx="' + (rx - 4) + '" ry="6.8" fill="none" stroke="url(#' + u + 'k)" stroke-width="2"/>';
  return '<ellipse cx="50" cy="' + (107 + h) + '" rx="' + rx + '" ry="9" fill="' + bottom + '"/><rect x="' + (50 - rx) + '" y="107" width="' + 2 * rx + '" height="' + h + '" fill="' + side + '"/>'
    + '<ellipse cx="50" cy="107" rx="' + rx + '" ry="9" fill="' + top + '"/><ellipse cx="50" cy="107" rx="' + (rx - 1.5) + '" ry="7.8" fill="none" stroke="#fff" stroke-opacity=".22"/>' + deco
    + '<ellipse cx="50" cy="105.5" rx="21" ry="4.6" fill="url(#' + u + 'd)"/>';
}
function victory(it, u){
  if(it.kind === 'konfetti') return '<g class="av-aura">' + [[16, 8, '#f472b6', 0], [30, 2, '#38bdf8', .4], [70, 6, '#facc15', .8], [86, 14, '#4ade80', 1.2], [50, 0, '#a78bfa', .2], [22, 24, '#facc15', 1], [80, 30, '#f472b6', .6]].map(([x, y, k, dl], i) => '<rect class="av-fall" style="animation-delay:-' + dl + 's" x="' + x + '" y="' + y + '" width="3" height="1.6" fill="' + k + '" transform="rotate(' + (i * 37) + ' ' + x + ' ' + y + ')"/>').join('') + '</g>';
  if(it.kind === 'pfiff') return '<g class="av-aura"><circle class="av-rise" cx="66" cy="22" r="4" fill="#f1f5f9"/><circle class="av-rise" style="animation-delay:-.6s" cx="72" cy="14" r="5" fill="#f1f5f9"/><text x="76" y="30" font-size="7" font-weight="800" fill="#f8fafc" font-family="system-ui,sans-serif">Pfiff!</text></g>';
  return '';
}

function figure(av, opt){
  const a = ANIMALS[av.animal], it = s => item(av.equip[s]), big = av.animal === 'eule';
  let pose = POSES.includes(opt.pose) ? opt.pose : 'idle';
  const style = STYLES.includes(opt.style) ? opt.style : 'soft', stage = opt.size === 'stage';
  const u = opt.uid || ('av' + (++SEQ).toString(36)) + '-';
  const shade = style !== 'flat', K = style === 'knete' ? 1.5 : 1;
  const ol = style === 'knete' ? c => ' stroke="' + mix(c, -0.35) + '" stroke-width="1.4"' : style === 'flat' ? c => ' stroke="' + mix(c, -0.3) + '" stroke-width="1"' : () => '';
  const ov = shape => shade ? shape.replace(/fill="[^"]*"/, 'fill="url(#' + u + 's)"').replace(/ stroke="[^"]*" stroke-width="[^"]*"/, '') : '';
  const part = (tag, attrs, fill) => { const s = '<' + tag + ' ' + attrs + ' fill="' + fill + '"' + ol(fill) + '/>'; return s + ov(s); };
  const shirt = it('oberteil'), shirtC = shirt ? shirt.color : a.fur, fur = a.fur, dark = mix(fur, -0.3);
  const vic = pose === 'dance' && it('siegerpose');
  const setKey = setDone(av), hatIt = it('kopf'), brIt = it('brille');
  const defs = '<defs>'
    + '<radialGradient id="' + u + 's" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="#fff" stop-opacity="' + (0.42 * K).toFixed(2) + '"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="' + (0.06 * K).toFixed(2) + '"/><stop offset="1" stop-color="#000" stop-opacity="' + (0.32 * K).toFixed(2) + '"/></radialGradient>'
    + '<radialGradient id="' + u + 'd"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="' + u + 'p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + mix(av.color, 0.35) + '"/><stop offset="1" stop-color="' + mix(av.color, -0.1) + '"/></linearGradient>'
    + '<linearGradient id="' + u + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".45" stop-color="#f5c518"/><stop offset="1" stop-color="#a87a00"/></linearGradient>'
    + '<clipPath id="' + u + 't"><path d="' + TORSO + '"/></clipPath>'
    + (stage ? '<radialGradient id="' + u + 'l" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' : '')
    + (brIt && brIt.kind === 'visor' ? '<clipPath id="' + u + 'vc"><rect x="27" y="37" width="46" height="13" rx="6.5"/></clipPath>' : '')
    + (brIt && brIt.kind === 'ski' ? '<linearGradient id="' + u + 'm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + mix(brIt.color, 0.45) + '"/><stop offset=".5" stop-color="' + brIt.color + '"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>' : '')
    + (hatIt && hatIt.kind === 'giesser' ? '<linearGradient id="' + u + 'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/></linearGradient>' : '')
    + '<linearGradient id="' + u + 'h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef08a"/><stop offset=".5" stop-color="' + ((it('kette') || {}).color || '#f97316') + '"/><stop offset="1" stop-color="#991b1b"/></linearGradient>'
    + '<linearGradient id="' + u + 'mt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f5f9"/><stop offset="1" stop-color="#64748b"/></linearGradient>'
    + '<linearGradient id="' + u + 'sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f472b6"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#7c2d12"/></linearGradient>'
    + '<linearGradient id="' + u + 'k" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7c4a24"/><stop offset=".25" stop-color="#1d4ed8"/><stop offset=".5" stop-color="#111827"/><stop offset=".75" stop-color="#64748b"/><stop offset="1" stop-color="#16a34a"/></linearGradient>'
    + '</defs>';
  // Sockel / Kachel, Aura dahinter
  let base = '';
  if(stage) base += '<path d="M28 0H72L96 110H4z" fill="url(#' + u + 'l)"/>';
  if(style === 'flat') base += '<rect x="8" y="10" width="84" height="104" rx="18" fill="' + av.color + '"/><ellipse cx="50" cy="106" rx="24" ry="4.5" fill="' + mix(av.color, -0.25) + '"/>';
  else base += plate(it('sockel'), av, u, stage, style, setKey);
  if(it('aura')) base += aura(it('aura'));
  // Arme (Siegerpose: beide hoch)
  const [aL, aR] = vic ? ARMS.jubel : ARMS[pose];
  const hand = it('hand');
  const arm = (x, ang, side) => '<g class="av-arm av-arm-' + side + '" transform="translate(' + x + ' 60) rotate(' + ang + ')">'
    + part('rect', 'x="-4.6" y="-2" width="9.2" height="24" rx="4.6"', fur) + part('rect', 'x="-5.2" y="-3" width="10.4" height="10" rx="4.4"', shirtC)
    + (side === 'r' && hand ? '<g transform="translate(0 22) rotate(' + (-ang) + ')">' + handItem(hand, u) + '</g>' : '')
    + part('circle', 'cx="0" cy="22" r="5"', mix(a.light, -0.05)) + '</g>';
  const legs = part('rect', 'x="37" y="86" width="11" height="17" rx="5.5"', fur) + part('rect', 'x="52" y="86" width="11" height="17" rx="5.5"', fur)
    + feet(it('schuhe'), av.animal === 'pinguin' ? '#f39c12' : dark, part);
  const ch = it('kette');
  const torso = part('path', 'd="' + TORSO + '"', shirtC) + torsoDeco(shirt, u) + (shirt ? torso2(shirt, u) : '') + (ch && ['kabine', 'laterne', 'stahl', 'schal'].includes(ch.kind) ? chain3(ch, u) : chain2(ch, u));
  const [hx, hy, hrx, hry] = HEAD_SIL[av.animal];
  const rim = shade ? '<path d="M' + (hx - hrx * 0.92).toFixed(1) + ' ' + (hy - hry * 0.2).toFixed(1) + 'A' + hrx + ' ' + hry + ' 0 0 1 ' + (hx - hrx * 0.3).toFixed(1) + ' ' + (hy - hry * 0.94).toFixed(1) + '" stroke="#fff" stroke-opacity="' + (0.4 * K).toFixed(2) + '" stroke-width="2" fill="none" stroke-linecap="round"/>' : '';
  const headOv = shade ? '<ellipse cx="' + hx + '" cy="' + hy + '" rx="' + hrx + '" ry="' + hry + '" fill="url(#' + u + 's)"/>' : '';
  const gloss = style === 'knete' ? '<ellipse cx="' + (hx - 9) + '" cy="' + (hy - 13) + '" rx="6" ry="3" fill="#fff" opacity=".35" transform="rotate(-25 ' + (hx - 9) + ' ' + (hy - 13) + ')"/>' : '';
  const tilt = pose === 'sad' ? 8 : pose === 'dance' ? -6 : -3;
  const whistle = vic && vic.kind === 'pfiff' && MOUTH_Y[av.animal] ? '<rect x="52" y="' + (MOUTH_Y[av.animal] - 1) + '" width="9" height="4" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width=".6"/>' : '';
  const head = '<g class="av-head" transform="translate(50 36) rotate(' + tilt + ') scale(.8) translate(-50 -46)">'
    + HEADS[av.animal](a) + headOv + rim + gloss + eyes2(a, big, pose) + mouth(av.animal, pose) + whistle + glasses(brIt, big, u) + hat(hatIt, u) + '</g>';
  const fig = '<g class="av-fig">' + (it('ruecken') ? back(it('ruecken'), u) : '') + (TAILS[av.animal] || (() => ''))(a) + legs + torso + arm(36, aL, 'l') + arm(64, aR, 'r') + head + '</g>';
  const t = opt.title ? '<title>' + String(opt.title).replace(/[<&>"]/g, '') + '</title>' : '';
  const cls = 'av-svg avf av-' + (stage ? 'stage' : 'card') + ' p-' + pose + ' s-' + style + (opt.anim ? ' av-anim' : '');
  return '<svg class="' + cls + '" viewBox="0 0 100 120" role="img" aria-label="' + a.name + '" xmlns="http://www.w3.org/2000/svg">' + t + defs + base + fig + (vic ? victory(vic, u) : '') + '</svg>';
}
const TORSO = 'M36 56Q50 51 64 56Q72 72 68.5 91Q50 97 31.5 91Q28 72 36 56z';
// Animationen (nur mit opt.anim; im Browser einmal als <style> eingefügt)
const CSS = '.avf .av-fig,.avf .av-arm,.avf .av-head{transform-box:fill-box}'
  + '.avf.av-anim .av-fig{transform-origin:50% 100%}'
  + '.avf.av-anim.p-idle .av-fig,.avf.av-anim.p-wave .av-fig{animation:avfBob 2.6s ease-in-out infinite}'
  + '.avf.av-anim.p-wave .av-arm-r{transform-origin:50% 8%;animation:avfWave 1.2s ease-in-out infinite}'
  + '.avf.av-anim.p-jubel .av-fig{animation:avfJump .8s cubic-bezier(.3,1.6,.5,1) infinite}'
  + '.avf.av-anim.p-dance .av-fig{animation:avfDance 1s ease-in-out infinite}'
  + '.avf.av-anim.p-dance .av-arm-l{transform-origin:50% 8%;animation:avfWave .5s ease-in-out infinite alternate}'
  + '.avf.av-anim.p-sad .av-fig{animation:avfSad 3.4s ease-in-out infinite}'
  + '.avf.av-anim .av-eyes{transform-box:fill-box;transform-origin:center;animation:avfBlink 4.4s infinite}'
  + '@keyframes avfBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}'
  + '@keyframes avfWave{0%,100%{rotate:0deg}50%{rotate:-22deg}}'
  + '@keyframes avfJump{0%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(0) scale(1.06,.92)}50%{transform:translateY(-14px) scale(.96,1.05)}}'
  + '@keyframes avfDance{0%,100%{transform:rotate(-7deg) translateY(0)}25%{transform:rotate(0) translateY(-6px)}50%{transform:rotate(7deg) translateY(0)}75%{transform:rotate(0) translateY(-6px)}}'
  + '@keyframes avfSad{0%,100%{transform:translateY(0)}50%{transform:translateY(1.5px) scale(1,.98)}}'
  + '@keyframes avfBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}'
  // Garderobe 2.0: bewegte Teile (individuelle transform-Eigenschaften, damit SVG-transform-Attribute erhalten bleiben)
  + '.avf.av-anim .av-led{animation:avfLed 1.8s ease-in-out infinite alternate}'
  + '.avf.av-anim .av-beam,.avf.av-anim .av-glow{animation:avfPulse 1.6s ease-in-out infinite}'
  + '.avf.av-anim .av-spark,.avf.av-anim .av-shine{animation:avfTwinkle 2.2s ease-in-out infinite}'
  + '.avf.av-anim .av-swing{transform-box:fill-box;transform-origin:50% 0;animation:avfSwing 2s ease-in-out infinite}'
  + '.avf.av-anim .av-robo{transform-box:view-box;transform-origin:64px 60px;animation:avfRobo 3s ease-in-out infinite}'
  + '.avf.av-anim .av-lamp-r{animation:avfBlinkA 1.4s steps(1) infinite}.avf.av-anim .av-lamp-g{animation:avfBlinkB 1.4s steps(1) infinite}'
  + '.avf.av-anim .av-mm1{animation:avfBlinkA 1.2s steps(1) infinite}.avf.av-anim .av-mm2{animation:avfBlinkB 1.2s steps(1) infinite}'
  + '.avf .av-mm2{opacity:0}.avf.av-anim .av-wave{animation:avfSway 2.4s ease-in-out infinite}'
  + '.avf.av-anim .av-flame{transform-box:fill-box;transform-origin:50% 0;animation:avfFlame .25s ease-in-out infinite alternate}'
  + '.avf.av-anim .av-rise{animation:avfRise 3.2s linear infinite}.avf.av-anim .av-fall{animation:avfFall 2.6s linear infinite}'
  + '.avf.av-anim .av-spin{transform-box:fill-box;transform-origin:center;animation:avfSpin 12s linear infinite}'
  + '.avf.av-anim .av-flash{animation:avfFlash 1.4s steps(2) infinite}.avf.av-anim .av-holo{animation:avfHolo 2.4s steps(6) infinite}'
  + '.avf.av-anim .av-float{animation:avfFloat 2.4s ease-in-out infinite}'
  + '@keyframes avfLed{from{translate:0 0}to{translate:28px 0}}'
  + '@keyframes avfPulse{0%,100%{opacity:.25}50%{opacity:.6}}@keyframes avfTwinkle{0%,100%{opacity:.2}50%{opacity:1}}'
  + '@keyframes avfSwing{0%,100%{rotate:-10deg}50%{rotate:10deg}}@keyframes avfRobo{0%,100%{rotate:0deg}50%{rotate:-12deg}}'
  + '@keyframes avfBlinkA{0%{opacity:1}50%{opacity:0}}@keyframes avfBlinkB{0%{opacity:0}50%{opacity:1}}'
  + '@keyframes avfSway{0%,100%{translate:0 0}50%{translate:2px 0}}@keyframes avfFlame{from{scale:1 .8}to{scale:1 1.2}}'
  + '@keyframes avfRise{0%{translate:0 6px;opacity:0}20%{opacity:.9}100%{translate:0 -22px;opacity:0}}'
  + '@keyframes avfFall{0%{translate:0 -6px;opacity:0}15%{opacity:1}100%{translate:0 30px;opacity:0}}'
  + '@keyframes avfSpin{to{rotate:360deg}}@keyframes avfFlash{0%{opacity:1}50%{opacity:.15}}@keyframes avfHolo{0%,100%{opacity:1}50%{opacity:.55}}'
  + '@keyframes avfFloat{0%,100%{translate:0 0}50%{translate:0 -3px}}'
  // Titel unter dem Namen (Portal/Beamer): Rahmenfarbe der Seltenheit, „Null-Fehler“ mit Glanz
  + '.av-title{display:inline-block;font-size:.72em;font-weight:700;letter-spacing:.02em;padding:1px 7px;border-radius:999px;border:1px solid currentColor;line-height:1.5;white-space:nowrap}'
  + '.av-title.glanz{background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);background-size:250% 100%;animation:avfGlanz 2.6s linear infinite}'
  + '@keyframes avfGlanz{from{background-position:120% 0}to{background-position:-120% 0}}'
  + '@media (prefers-reduced-motion: reduce){.avf.av-anim *,.avf.av-anim .av-fig,.av-title.glanz{animation:none!important}}';
function ensureCSS(){
  if(typeof document === 'undefined' || !document.head || document.getElementById('spsq-av-css')) return;
  const s = document.createElement('style'); s.id = 'spsq-av-css'; s.textContent = CSS; document.head.appendChild(s);
}

/* svg(av, opt): opt.size 'card'/'stage' → Ganzkörper (figure), sonst Kopf im Kreis (chip; Zahl = Pixelgrösse wie bisher) */
function svg(av, opt){
  av = normalize(av); opt = opt || {};
  if(opt.size === 'card' || opt.size === 'stage'){ if(opt.anim) ensureCSS(); return figure(av, opt); }
  const a = ANIMALS[av.animal], it = s => item(av.equip[s]);
  const big = av.animal === 'eule', u = opt.uid || ('av' + (++SEQ).toString(36)) + '-';
  // Chip ohne Verläufe: Verweise der neuen Teile auf flache Farben
  const flat = h => h.replace(/url\(#x-g\)/g, '#f5c518').replace(/url\(#x-v\)/g, '#f59e0b').replace(/url\(#x-m\)/g, (it('brille') || {}).color || '#f97316').replace(/ clip-path="url\(#x-vc\)"/g, '');
  const top1 = best(av), ring = top1 ? '<circle cx="50" cy="50" r="47" fill="none" stroke="' + top1.color + '" stroke-width="6"/>' : '';
  const t = opt.title ? '<title>' + String(opt.title).replace(/[<&>"]/g, '') + '</title>' : '';
  const px = typeof opt.size === 'number' ? opt.size : 0;
  return '<svg class="av-svg av-chip" viewBox="0 0 100 100" role="img" aria-label="' + a.name + '"' + (px ? ' width="' + px + '" height="' + px + '"' : '') + ' xmlns="http://www.w3.org/2000/svg">' + t
    + '<defs><clipPath id="' + u + 'c"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#' + u + 'c)">'
    + '<circle cx="50" cy="50" r="50" fill="' + av.color + '"/>'
    + top(it('oberteil')) + chain(it('kette')) + HEADS[av.animal](a) + eyes(a.fur, big) + flat(glasses(it('brille'), big) + hat(it('kopf')))
    + '</g>' + ring + '</svg>';
}

/* ---------- Coins ---------- */
// progress: {quest: state}; meta: {quest: {taskId: {boss, final}}}; ledger: [{amount, source, ref}]
const RULES = { star: [10, 15, 20], revealed: 3, boss: 40, final: 100, theory: 10, speedrun: { 1: 60, 2: 40, 3: 25, solved: 10, sudden: 80, teilnahme: 5 }, cert: { pass: 300, distinction: 500 } };
function earned(progress, meta){
  const out = { tasks: 0, bosses: 0, finals: 0, theory: 0, total: 0, n: 0, bossN: 0, finalN: 0, quests: 0, q: {}, clean: {}, finalQ: {}, theoryQ: {} };
  Object.keys(progress || {}).forEach(q => {
    const st = progress[q] || {}, m = (meta && meta[q]) || {};
    const done = st.doneTasks || {}; let any = false;
    out.q[q] = 0; out.clean[q] = 0;
    Object.keys(done).forEach(id => {
      const d = done[id] || {}; any = true; out.n++; out.q[q]++; if(!d.revealed) out.clean[q]++;
      out.tasks += d.revealed ? RULES.revealed : RULES.star[Math.max(1, Math.min(3, d.stars || 1)) - 1];
      const f = m[id] || {};
      if(f.final && !d.revealed){ out.finals += RULES.final; out.finalN++; if(f.ch !== 15) out.finalQ[q] = id; }   // Final Boss: nur der Final-Zuschlag
      else if(f.boss && !d.revealed){ out.bosses += RULES.boss; out.bossN++; }
    });
    // Sensorwerkstatt: nur die 30 angezeigten Aufgaben zählen für die Kollektion
    if(m.$ && m.$.shown){ out.q[q] = m.$.shown.filter(id => done[id]).length; out.clean[q] = m.$.shown.filter(id => done[id] && !done[id].revealed).length; }
    out.theoryQ[q] = Object.keys(st.doneTheory || {}).length;
    out.theory += out.theoryQ[q] * RULES.theory;
    if(any) out.quests++;
  });
  out.total = out.tasks + out.bosses + out.finals + out.theory;
  return out;
}
// Freischalt-Kontext aus drei Quellen: synchronisierter Fortschritt (e), gültige Zertifikate (certs [{quest, level}]) und Challenge-Statistik (stats, serverseitig, 12.4)
function unlockCtx(e, ledger, certs, stats, meta){
  const L = ledger || [], Z = certs || [], S = stats || {}, sm = meta && meta.sensor && meta.sensor.$;
  const sensorN = sm ? sm.shown.length : 30;
  return { final: e.finalN, bosses: e.bossN, quests: e.quests,
    podium: Math.max(L.filter(x => x.source === 'speedrun' && /^r[123]:/.test(x.ref || '')).length, S.podium || 0),
    certs: Z.length, profiCerts: new Set(Z.filter(z => z.level === 'profi').map(z => z.quest)).size, certList: Z.map(z => ({ quest: z.quest, level: z.level })),
    questSolved: e.q || {}, questFinal: e.finalQ || {}, finals3: Object.keys(e.finalQ || {}).length,
    sensorAll: (e.q && e.q.sensor || 0) >= sensorN && (!sm || (e.theoryQ.sensor || 0) >= sm.theory) ? 1 : 0,
    sensorClean: (e.clean && e.clean.sensor || 0) >= sensorN ? 1 : 0,
    challenges: S.challenges || 0, wins: S.wins || 0, sdWins: S.sdWins || 0, bugFixed: S.bugFixed || 0, flawless: S.flawless || 0 };
}
// Fortschritt je Bedingung: [{text, have, need, ok}] (Fortschrittsbalken in der Garderobe, Fehlermeldung beim Kauf)
function unlockProgress(id, ctx){
  const it = item(id); if(!it || !it.unlock) return [];
  ctx = ctx || {}; const out = [];
  Object.keys(it.unlock).forEach(k => {
    const v = it.unlock[k], txt = UNLOCK_TEXT[k] ? UNLOCK_TEXT[k](v) : k;
    if(k === 'questSolved') Object.keys(v).forEach(q => { const have = (ctx.questSolved || {})[q] || 0; out.push({ text: UNLOCK_TEXT.questSolved({ [q]: v[q] }), have: Math.min(have, v[q]), need: v[q], ok: have >= v[q], unit: QN[q] + '-Aufgaben' }); });
    else if(k === 'questFinal') out.push({ text: txt, have: (ctx.questFinal || {})[v] ? 1 : 0, need: 1, ok: !!(ctx.questFinal || {})[v] });
    else if(k === 'cert'){ const ok = (ctx.certList || []).some(z => z.quest === v.quest && z.level === v.level); out.push({ text: txt, have: ok ? 1 : 0, need: 1, ok }); }
    else { const have = ctx[k] || 0; out.push({ text: txt, have: Math.min(have, v), need: v, ok: have >= v }); }
  });
  return out;
}
function isUnlocked(id, ctx){ const it = item(id); return !!it && unlockProgress(id, ctx).every(p => p.ok); }
function unlockText(id, ctx){
  const p = unlockProgress(id, ctx); if(!p.length) return '';
  return p.map(x => x.text + (ctx && x.need > 1 && !x.ok ? ' (' + x.have + '/' + x.need + ')' : '')).join(', ');
}
// Besitz: frei (Preis 0 ohne Bedingung), „nur verdienbar“ (Bedingung erfüllt) oder gekauft (coin_ledger)
function owns(id, owned, ctx){
  const it = item(id); if(!it) return false;
  if(it.price === 0 && !it.unlock) return true;
  if(it.earnOnly) return isUnlocked(id, ctx);
  return (owned || []).includes(id);
}
function balance(progress, meta, ledger, certs, stats){
  const e = earned(progress, meta), L = ledger || [];
  const bonus = L.filter(x => x.amount > 0).reduce((a, x) => a + x.amount, 0), spent = -L.filter(x => x.amount < 0).reduce((a, x) => a + x.amount, 0);
  return { earned: e, speedrun: bonus, spent, balance: e.total + bonus - spent, owned: L.filter(x => x.source === 'kauf').map(x => x.ref), ctx: unlockCtx(e, L, certs, stats, meta) };
}
// Wirtschaft (A4): Katalogsumme je Stufe und Coins je Quest (Obergrenze: alle Aufgaben 3★, alle Bosse, Final Bosse, Theorien)
function economy(meta){
  const sum = {}; let total = 0;
  Object.keys(ITEMS).forEach(id => { const it = ITEMS[id]; if(it.earnOnly || it.shop) return; const p = it.price + (it.alt ? it.alt.length * Math.ceil(it.price * 1.3 / 10) * 10 : 0); sum[it.rarity] = (sum[it.rarity] || 0) + it.price; total += it.price; sum.varianten = (sum.varianten || 0) + (p - it.price); });
  const perQuest = {};
  Object.keys(meta || {}).forEach(q => { const m = meta[q], ids = Object.keys(m).filter(k => k !== '$'); const n = m.$ && m.$.tasks || 150;
    perQuest[q] = n * RULES.star[2] + ids.filter(k => m[k].boss).length * RULES.boss + ids.filter(k => m[k].final).length * RULES.final + (m.$ && m.$.theoryAll || 30) * RULES.theory; });
  return { byRarity: sum, total, perQuest };
}
const API = { ANIMALS, COLORS, ITEMS, SLOTS, RARITY, SETS, DEFAULT, RULES, POSES, STYLES, CSS, ensureCSS, normalize, svg, item, variants, onSale, shopSetOf, title, best, setDone,
  earned, unlockCtx, unlockProgress, isUnlocked, unlockText, owns, balance, economy };
root.SPSQAvatar = API;
if(typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
````

## C2 – Server: avatar.js

Quelle: `worker/avatar.js` – ganze Datei

````js
// SPS Quest — Avatare und Coins (Feedback-Auftrag Paket 3).
// Coins sind nur verdienbar und rein kosmetisch: Stand = aus dem synchronisierten Fortschritt berechnet (Aufgaben nach Sternen,
// Kapitel-Boss, Final Boss, Theorie) + Speedrun-Prämien im coin_ledger − Käufe im coin_ledger. Kein Geld, kein Spielvorteil.
import { json, fail, now, cleanText } from './lib.js';
import { Avatar, AVATAR_META } from './gen/avatar_bundle.js';
import { Exam, FINAL_TASKS } from './gen/exam_bundle.js';
import { rank } from './challenge.js';

export async function avatarRoutes(C, p, m, H){
  if(!p.startsWith('/api/avatar')) return null;
  C.user = await H.currentUser(C);
  if(!C.user) fail(401, 'Nicht angemeldet.');
  if(p === '/api/avatar' && m === 'GET') return getOwn(C);
  if(p === '/api/avatar' && m === 'PUT') return saveOwn(C);
  if(p === '/api/avatar/buy' && m === 'POST') return buy(C);
  fail(404, 'Unbekannte Adresse.');
}

async function ledgerOf(C, uid){
  return ((await C.db.prepare('SELECT amount, source, ref, created_at FROM coin_ledger WHERE user_id = ? ORDER BY id').bind(uid).all()).results || []);
}
async function progressOf(C, uid){
  const rows = (await C.db.prepare('SELECT quest, state FROM progress WHERE user_id = ?').bind(uid).all()).results || [];
  const out = {};
  rows.forEach(r => { try{ const s = JSON.parse(r.state || '{}'); out[r.quest] = { doneTasks: s.doneTasks || {}, doneTheory: s.doneTheory || {} }; }catch(e){} });
  return out;
}
async function certsOf(C, uid){
  return ((await C.db.prepare('SELECT quest, level FROM certificates WHERE user_id = ? AND revoked_at IS NULL').bind(uid).all()).results || []);
}
// Challenge-Statistik (Garderobe 2.0, 12.4) – nur serverseitig: eine Challenge zählt, wenn sie beendet ist, ≥ 3 Teilnehmende hatte
// und ≥ 2 min lief (gestartet wird sie immer von einer Lehrperson); jede Leistung höchstens einmal je Challenge
export const CH_RULES = { minPlayers: 3, minMs: 120000 };
export async function challengeStats(C, uid){
  const out = { challenges: 0, podium: 0, wins: 0, sdWins: 0, bugFixed: 0, flawless: 0 };
  const chs = ((await C.db.prepare("SELECT c.* FROM challenges c JOIN challenge_players me ON me.challenge_id = c.id AND me.user_id = ? WHERE c.state = 'ended' AND c.started_at IS NOT NULL AND COALESCE(c.ended_at, c.ends_at) - c.started_at >= ?")
    .bind(uid, CH_RULES.minMs).all()).results || []);
  for(let i = 0; i < chs.length; i += 90){
    const part = chs.slice(i, i + 90), ids = part.map(c => c.id);
    const rows = ((await C.db.prepare('SELECT * FROM challenge_players WHERE challenge_id IN (' + ids.map(() => '?').join(',') + ')').bind(...ids).all()).results || []);
    part.forEach(ch => {
      const pl = rows.filter(r => r.challenge_id === ch.id); if(pl.length < CH_RULES.minPlayers) return;
      let tl = null; try{ tl = JSON.parse(ch.tasks || 'null'); }catch(e){}
      const multi = Array.isArray(tl) && tl.length > 1, ranked = rank(pl, multi, ch.end_rule === 'first' ? ch.winner_id : null), me = ranked.find(p => p.user_id === uid);
      if(!me) return;
      const solved = !!(me.solved_at || me.solved_n);
      out.challenges++;
      if(me.rank && me.rank <= 3) out.podium++;
      if(me.rank === 1) out.wins++;
      if(ch.end_rule === 'first' && ch.winner_id === uid) out.sdWins++;
      if(ch.mode === 'bug' && solved) out.bugFixed++;
      if(solved && !me.hints && (me.attempts || 0) <= (multi ? (me.solved_n || 1) : 1)) out.flawless++;
    });
  }
  return out;
}
export async function coinState(C, uid){
  const [prog, ledger, certs, stats] = await Promise.all([progressOf(C, uid), ledgerOf(C, uid), certsOf(C, uid), challengeStats(C, uid)]);
  return Avatar.balance(prog, AVATAR_META, ledger, certs, stats);
}
// Final Boss serverseitig nachprüfen: synchronisierte Lösung gegen die Tests (legendäre Teile, Auftrag 12.6)
async function verifiedFinals(C, uid, quests){
  const ok = {};
  for(const q of quests){
    const t = FINAL_TASKS[q]; if(!t){ ok[q] = false; continue; }
    const r = await C.db.prepare('SELECT state FROM progress WHERE user_id = ? AND quest = ?').bind(uid, q).first();
    let code = null; try{ const st = JSON.parse((r && r.state) || '{}'); code = (st.solutions || {})[t.id]; }catch(e){}
    ok[q] = typeof code === 'string' && Exam.checkGameTask(t, code, q);
  }
  return ok;
}
// Paket P: bestandenes Zertifikat → Coins (+300, mit Auszeichnung +500), einmal je Quest und Stufe; bleibt beim Zurückziehen
export async function awardCert(C, uid, quest, level, distinction){
  const R = Avatar.RULES.cert;
  await C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(uid, distinction ? R.distinction : R.pass, 'zertifikat', quest + ':' + level, now()).run();
}
export async function avatarOf(C, uid){
  const r = await C.db.prepare('SELECT animal, color, equip FROM avatars WHERE user_id = ?').bind(uid).first();
  return r ? Avatar.normalize({ animal: r.animal, color: r.color, equip: JSON.parse(r.equip || '{}') }) : null;
}
// Avatare vieler Konten (Klassenliste, Challenge) – null = noch kein Avatar gewählt (Platzhalter)
export async function avatarsFor(C, ids){
  const out = {}; ids = [...new Set(ids.filter(Boolean))];
  for(let i = 0; i < ids.length; i += 90){
    const part = ids.slice(i, i + 90);
    const rows = (await C.db.prepare('SELECT user_id, animal, color, equip FROM avatars WHERE user_id IN (' + part.map(() => '?').join(',') + ')').bind(...part).all()).results || [];
    rows.forEach(r => { out[r.user_id] = Avatar.normalize({ animal: r.animal, color: r.color, equip: JSON.parse(r.equip || '{}') }); });
  }
  return out;
}
async function getOwn(C){
  const [av, coins] = await Promise.all([avatarOf(C, C.user.id), coinState(C, C.user.id)]);
  return json({ avatar: av, chosen: !!av, coins: { balance: coins.balance, earned: coins.earned, speedrun: coins.speedrun, spent: coins.spent }, owned: coins.owned, unlock: coins.ctx, rules: Avatar.RULES,
    shopSet: Avatar.shopSetOf(now()), chRules: CH_RULES });
}
const owns = (id, coins) => Avatar.owns(id, coins.owned, coins.ctx);
async function saveOwn(C){
  const b = C.body || {};
  const coins = await coinState(C, C.user.id);
  const av = Avatar.normalize({ animal: b.animal, color: b.color, equip: b.equip });
  Object.keys(av.equip).forEach(s => { const id = av.equip[s]; if(!owns(id, coins)) fail(403, '„' + Avatar.item(id).name + '“ gehört dir noch nicht.'); });
  await C.db.prepare('INSERT INTO avatars (user_id, animal, color, equip, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET animal = excluded.animal, color = excluded.color, equip = excluded.equip, updated_at = excluded.updated_at')
    .bind(C.user.id, av.animal, av.color, JSON.stringify(av.equip), now()).run();
  return json({ avatar: av });
}
async function buy(C){
  const id = cleanText(C.body.item, 40), it = Avatar.item(id);
  if(!it) fail(404, 'Diesen Gegenstand gibt es nicht.');
  const coins = await coinState(C, C.user.id);
  if(owns(id, coins)) return json({ ok: true, owned: true, balance: coins.balance });
  if(it.earnOnly) fail(403, '„' + it.name + '“ kann man nicht kaufen, nur verdienen: ' + Avatar.unlockText(id, coins.ctx) + '.');
  if(!Avatar.onSale(id, now())) fail(403, '„' + it.name + '“ gibt es nur im Monats-Schaufenster – es kommt später wieder.');
  if(!Avatar.isUnlocked(id, coins.ctx)) fail(403, 'Noch gesperrt – ' + it.name + ': ' + Avatar.unlockText(id, coins.ctx) + '.');
  // Final Boss: der lokale Spielstand allein reicht nicht – die synchronisierte Lösung muss die Tests bestehen
  const u = it.unlock || {};
  if(u.questFinal || u.finals3){
    const quests = u.questFinal ? [u.questFinal] : Object.keys(coins.ctx.questFinal || {});
    const v = await verifiedFinals(C, C.user.id, quests), good = quests.filter(q => v[q]).length;
    if(u.questFinal && !v[u.questFinal]) fail(403, 'Deine Lösung des Final Boss (' + u.questFinal.toUpperCase() + ') besteht die Tests nicht oder ist noch nicht mit deinem Konto gespeichert.');
    if(u.finals3 && good < u.finals3) fail(403, 'Nur ' + good + ' von ' + u.finals3 + ' Final-Boss-Lösungen bestehen die Tests auf dem Server.');
  }
  if(coins.balance < it.price) fail(400, 'Dafür reichen deine Coins noch nicht (' + coins.balance + ' von ' + it.price + ').');
  await C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(C.user.id, -it.price, 'kauf', id, now()).run();
  return json({ ok: true, owned: true, balance: coins.balance - it.price });
}
// Speedrun-Prämie beim Ende einer Challenge (Modus 'sprint', mindestens 2 Teilnehmende): Rang 1–3 und „gelöst“; einmal pro Challenge
export async function awardSpeedrun(C, ch, ranked){
  const R = Avatar.RULES.speedrun, t = now(), stmts = [];
  // Teilnahme +5 (12.5): nur wenn die Challenge zählt (≥ 3 Teilnehmende, ≥ 2 min)
  if(ranked.length >= CH_RULES.minPlayers && ch.started_at && (ch.ended_at || t) - ch.started_at >= CH_RULES.minMs)
    await C.db.batch(ranked.map(p => C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(p.user_id, R.teilnahme || 5, 'teilnahme', 't:' + ch.id, t)));
  // Sudden Death (L1): nur der Sieger bekommt die Platz-1-Prämie und den Sudden-Death-Zuschlag, auch in der Störungsjagd
  if(ch.end_rule === 'first'){
    if(!ch.winner_id || ranked.length < 2) return;
    await C.db.batch([
      C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(ch.winner_id, R[1], 'speedrun', 'r1:' + ch.id, t),
      C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(ch.winner_id, R.sudden || 80, 'sudden', 'sd:' + ch.id, t)
    ]);
    return;
  }
  if(ch.mode !== 'sprint' || ranked.length < 2) return;
  ranked.forEach(p => {
    const solved = p.solved_at || p.solved_n;
    if(!solved) return;
    const rank = p.rank && p.rank <= 3 ? p.rank : 0;
    stmts.push(C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(p.user_id, rank ? R[rank] : R.solved, 'speedrun', (rank ? 'r' + rank : 's') + ':' + ch.id, t));
  });
  if(stmts.length) await C.db.batch(stmts);
}
````

## C3 – Garderobe: portal_avatar.js

Quelle: `dev/portal/portal_avatar.js` – ganze Datei

````js
/* ===== SPS Quest Portal: Avatar & Coins (Feedback-Auftrag Paket 3, Garderobe 2.0 A5) – #/avatar =====
   Tier und Farbe wählen, Kleidung/Accessoires anziehen oder mit Coins kaufen. Coins sind nur verdienbar (Aufgaben, Bosse,
   Theorie, Live-Challenges, Zertifikate), nie mit Geld kaufbar und rein kosmetisch. Der Server prüft Besitz, Freischaltung und Stand. */
(function(){
'use strict';
const P = window.SPSQ, $ = id => document.getElementById(id), esc = P.esc, A = window.SPSQAvatar;
let ST = null, draft = null;

async function view(){
  const v = $('view');
  if(!P.user){ v.innerHTML = '<div class="console"><div class="panel empty">Bitte zuerst anmelden.<br><br><button class="btn pri" id="avLogin">Anmelden</button></div></div>'; $('avLogin').onclick = () => P.openTerminal('login'); return; }
  v.innerHTML = '<div class="console"><div class="panel muted">Lade …</div></div>';
  try{ ST = await P.api('GET', 'avatar'); }catch(err){ v.innerHTML = '<div class="console"><div class="panel empty">' + esc(err.message) + '</div></div>'; return; }
  draft = A.normalize(ST.avatar || A.DEFAULT);
  render();
}
let POSE = 'wave';
// Garderobe 2.0 (A5): Filter nach Kollektion, Seltenheit und „bald freischaltbar“; Seltenheitsrahmen; Fortschrittsbalken je Bedingung; Farbvarianten; Monats-Schaufenster
const F = { set: 'alle', rar: 'alle', soon: false };
const owns = id => A.owns(id, ST.owned, ST.unlock);
const CHAL = ['challenges', 'podium', 'wins', 'sdWins', 'bugFixed', 'flawless'];
const isChal = it => it.unlock && Object.keys(it.unlock).some(k => CHAL.includes(k));
const soonOf = id => { const p = A.unlockProgress(id, ST.unlock); return p.length && !p.every(x => x.ok) && p.every(x => x.ok || x.have / x.need >= 0.5); };
function visible(id){
  const it = A.item(id);
  if(it.shop === 'monat' && it.shopSet !== ST.shopSet && !owns(id)) return false;
  if(it.variant && !owns(id) && !A.isUnlocked(it.base, ST.unlock)) return false;   // Farbvarianten erst, wenn das Teil freigeschaltet ist
  if(F.set === 'challenge' ? !isChal(it) : F.set === 'monat' ? it.shop !== 'monat' : F.set !== 'alle' && it.set !== F.set) return false;
  if(F.rar !== 'alle' && it.rarity !== F.rar) return false;
  if(F.soon && !soonOf(id)) return false;
  return true;
}
const opt = (v, cur, label) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>';
function render(){
  const v = $('view'), c = ST.coins, e = c.earned, R = ST.rules;
  A.ensureCSS();
  const tt = A.title(draft), best = A.best(draft), setK = A.setDone(draft);
  const shop = Object.keys(A.ITEMS).filter(id => A.ITEMS[id].shop === 'monat' && A.ITEMS[id].shopSet === ST.shopSet);
  const ids = [].concat(...Object.keys(A.ITEMS).map(id => [id].concat(A.variants(id))));
  v.innerHTML = '<div class="console av-page"><div class="crumbs"><a href="#/">HALLEN</a> / AVATAR</div><h1>Avatar &amp; Coins</h1>' +
    '<p class="lead">Dein Tier erscheint im Portal, in der Klassenliste und bei Live-Challenges am Beamer. Coins verdienst du nur durchs Spielen – sie sind nie mit Geld kaufbar und bringen keinen Spielvorteil. Seltene Teile brauchen eine Leistung, die der Server bestätigt.</p>' +
    '<div class="av-grid"><div class="panel av-preview"><div class="av-big" id="avBig">' + A.svg(draft, { size: 'stage', pose: POSE, anim: true }) + '</div>' +
      (tt ? '<div class="av-title' + (tt.glanz ? ' glanz' : '') + '" style="color:' + A.RARITY[tt.rarity].color + '">' + esc(tt.text) + '</div>' : '') +
      (best ? '<div class="small av-wears">trägt: <b style="color:' + best.color + '">' + esc(best.rarityName + ' ' + best.name) + '</b></div>' : '') +
      (setK ? '<div class="small av-set">✨ Set „' + esc(A.SETS[setK].name) + '“ komplett: ' + esc(A.SETS[setK].bonus) + '</div>' : '') +
      '<div class="av-poses" role="group" aria-label="Pose ansehen">' + [['idle', 'Stehen'], ['wave', 'Winken'], ['jubel', 'Jubeln'], ['dance', 'Siegestanz'], ['sad', 'Traurig']].map(([k, n]) => '<button type="button" class="btn small' + (POSE === k ? ' pri' : '') + '" data-pose="' + k + '" aria-pressed="' + (POSE === k) + '">' + n + '</button>').join('') + '</div>' +
      '<div class="av-coins"><span class="coin">●</span> <b id="avBal">' + c.balance + '</b> Coins</div>' +
      '<button class="btn pri" id="avSave">Speichern</button><p class="muted small" id="avMsg" role="status"></p></div>' +
    '<div class="panel"><h2>Tier</h2><div class="av-animals">' + Object.keys(A.ANIMALS).map(k => '<button type="button" class="av-pick' + (draft.animal === k ? ' on' : '') + '" data-animal="' + k + '" aria-pressed="' + (draft.animal === k) + '">' + A.svg({ animal: k, color: draft.color, equip: {} }, { size: 'card' }) + '<span>' + esc(A.ANIMALS[k].name) + '</span></button>').join('') + '</div>' +
      '<h2>Farbe</h2><div class="av-colors">' + A.COLORS.map(col => '<button type="button" class="av-col' + (draft.color === col ? ' on' : '') + '" data-color="' + col + '" style="background:' + col + '" aria-label="Farbe ' + col + '" aria-pressed="' + (draft.color === col) + '"></button>').join('') + '</div>' +
      (shop.length ? '<h2>Monats-Schaufenster <span class="tag">nur diesen Monat</span></h2><p class="muted small">Jeden Monat drei Sonderteile – sie kommen später wieder.</p><div class="av-items">' + shop.map(itemBtn).join('') + '</div>' : '') +
      '<div class="av-filter row"><label class="small">Kollektion <select class="inp" id="avfSet">' + opt('alle', F.set, 'alle') + Object.keys(A.SETS).map(k => opt(k, F.set, A.SETS[k].name)).join('') + opt('challenge', F.set, 'Challenge-Trophäen') + opt('monat', F.set, 'Monats-Schaufenster') + '</select></label>' +
        '<label class="small">Seltenheit <select class="inp" id="avfRar">' + opt('alle', F.rar, 'alle') + Object.keys(A.RARITY).map(k => opt(k, F.rar, A.RARITY[k].name)).join('') + '</select></label>' +
        '<label class="small row"><input type="checkbox" id="avfSoon"' + (F.soon ? ' checked' : '') + '> bald freischaltbar</label></div>' +
      Object.keys(A.SLOTS).map(slot => { const list = ids.filter(id => A.item(id).slot === slot && visible(id)); if(!list.length) return '';
        return '<h2>' + esc(A.SLOTS[slot]) + '</h2><div class="av-items">' + (slot !== 'oberteil' && F.set === 'alle' && F.rar === 'alle' && !F.soon ? '<button type="button" class="av-item' + (!draft.equip[slot] ? ' on' : '') + '" data-slot="' + slot + '" data-item=""><span class="av-thumb av-none">–</span><span>ohne</span></button>' : '') +
          list.map(itemBtn).join('') + '</div>'; }).join('') +
    '</div></div>' +
    '<div class="panel"><h2>So verdienst du Coins</h2><table class="tbl"><tbody>' +
      '<tr><td>Gelöste Aufgaben (1★ / 2★ / 3★, Lösung angesehen)</td><td class="num">' + R.star.join(' / ') + ' / ' + R.revealed + '</td><td class="num"><b>' + e.tasks + '</b></td></tr>' +
      '<tr><td>Kapitel-Boss (Zusatz)</td><td class="num">' + R.boss + '</td><td class="num"><b>' + e.bosses + '</b></td></tr>' +
      '<tr><td>Final Boss (Zusatz)</td><td class="num">' + R.final + '</td><td class="num"><b>' + e.finals + '</b></td></tr>' +
      '<tr><td>Bestandene Theorie</td><td class="num">' + R.theory + '</td><td class="num"><b>' + e.theory + '</b></td></tr>' +
      '<tr><td>Live-Challenge (Platz 1 / 2 / 3, gelöst · Sudden-Death-Sieg · Teilnahme) und Zertifikat (bestanden / mit Auszeichnung)</td><td class="num">' + R.speedrun[1] + ' / ' + R.speedrun[2] + ' / ' + R.speedrun[3] + ' / ' + R.speedrun.solved + ' · ' + R.speedrun.sudden + ' · ' + (R.speedrun.teilnahme || 5) + (R.cert ? ' · ' + R.cert.pass + ' / ' + R.cert.distinction : '') + '</td><td class="num"><b>' + c.speedrun + '</b></td></tr>' +
      '<tr><td>Ausgegeben</td><td></td><td class="num">−' + c.spent + '</td></tr>' +
      '<tr><td><b>Stand</b></td><td></td><td class="num"><b>' + c.balance + '</b></td></tr></tbody></table>' +
      '<p class="muted small">Gezählt wird der Fortschritt, der mit deinem Konto gespeichert ist (alle Quests). Challenges zählen ab ' + ((ST.chRules || {}).minPlayers || 3) + ' Teilnehmenden und ' + Math.round(((ST.chRules || {}).minMs || 120000) / 60000) + ' Minuten Laufzeit.</p></div></div>';
  bind();
}
function itemBtn(id){
  const it = A.item(id), own = owns(id), on = draft.equip[it.slot] === id, open = A.isUnlocked(id, ST.unlock), rc = A.RARITY[it.rarity].color;
  const preview = it.slot === 'titel' ? '<span class="av-title' + (it.glanz ? ' glanz' : '') + '" style="color:' + rc + '">' + esc(it.name) + '</span>'
    : A.svg(Object.assign({}, draft, { equip: Object.assign({}, draft.equip, { [it.slot]: id }) }), { size: 'card', pose: it.slot === 'siegerpose' ? 'dance' : 'idle' });
  const prog = !own && !open ? A.unlockProgress(id, ST.unlock) : [];
  const state = own ? (on ? 'angezogen' : 'besitzt du') : it.earnOnly ? (open ? 'verdient' : '🔒 nur verdienbar') : !open ? '🔒 gesperrt' : it.price + ' Coins';
  return '<button type="button" class="av-item r-' + it.rarity + (on ? ' on' : '') + (own ? ' own' : '') + (!open && !own ? ' locked' : '') + '" style="--rc:' + rc + '" data-slot="' + it.slot + '" data-item="' + id + '" title="' + esc(it.name + ' – ' + A.RARITY[it.rarity].name + ' – ' + (prog.length ? A.unlockText(id, ST.unlock) : state)) + '">' +
    '<span class="av-rar">' + esc(A.RARITY[it.rarity].name) + (it.anim ? ' · bewegt' : '') + '</span>' +
    '<span class="av-thumb' + (it.slot === 'titel' ? ' av-tthumb' : '') + '">' + preview + '</span><span>' + esc(it.name) + '</span><small>' + esc(state) + (!own && !open && !it.earnOnly ? ' · ' + it.price + ' Coins' : '') + '</small>' +
    prog.map(p => '<span class="av-prog" title="' + esc(p.text) + '"><span class="av-prog-t">' + esc(p.text) + '</span><span class="av-bar"><i style="width:' + Math.round(100 * p.have / p.need) + '%"></i></span><span class="av-prog-n">' + (p.need > 1 ? p.have + '/' + p.need : (p.ok ? '✓' : '–')) + '</span></span>').join('') + '</button>';
}
function bind(){
  const v = $('view');
  v.querySelectorAll('[data-animal]').forEach(b => b.onclick = () => { draft.animal = b.dataset.animal; render(); });
  v.querySelectorAll('[data-pose]').forEach(b => b.onclick = () => { POSE = b.dataset.pose; render(); });
  v.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { draft.color = b.dataset.color; render(); });
  $('avfSet').onchange = e => { F.set = e.target.value; render(); }; $('avfRar').onchange = e => { F.rar = e.target.value; render(); }; $('avfSoon').onchange = e => { F.soon = e.target.checked; render(); };
  v.querySelectorAll('[data-slot]').forEach(b => b.onclick = async () => {
    const slot = b.dataset.slot, id = b.dataset.item;
    if(!id){ delete draft.equip[slot]; render(); return; }
    if(!owns(id)){
      const it = A.item(id);
      if(it.earnOnly || !A.isUnlocked(id, ST.unlock)){ P.toast('Noch gesperrt – ' + it.name + ': ' + A.unlockText(id, ST.unlock) + '.', true); return; }
      if(ST.coins.balance < it.price){ P.toast('Dafür reichen deine Coins noch nicht (' + ST.coins.balance + ' von ' + it.price + ').', true); return; }
      if(!await P.confirmDlg('Kaufen?', '<p>„' + esc(it.name) + '“ für <b>' + it.price + ' Coins</b> kaufen? Coins sind nur verdient, nicht gekauft – und du behältst den Gegenstand.</p>', 'Kaufen')) return;
      try{ const r = await P.api('POST', 'avatar/buy', { item: id }); ST.owned.push(id); ST.coins.balance = r.balance; ST.coins.spent += it.price; }
      catch(err){ P.toast(err.message, true); return; }
    }
    draft.equip[slot] = id; render();
  });
  $('avSave').onclick = async () => {
    try{ const r = await P.api('PUT', 'avatar', draft); ST.avatar = r.avatar; P.setUserAvatar(r.avatar); $('avMsg').textContent = 'Gespeichert.'; P.toast('Avatar gespeichert.'); }
    catch(err){ $('avMsg').textContent = err.message; P.toast(err.message, true); }
  };
}
P.routes.push({ re: /^#\/avatar$/, view });
})();
````

## C4a – CSS: Avatar, Garderobe

Quelle: `dev/portal/portal.css` – Zeilen 530–575

````css
/* ---------- Avatare und Coins (Feedback-Auftrag Paket 3) ---------- */
.av{ display:inline-flex; align-items:center; justify-content:center; border-radius:50%; overflow:hidden; flex:none; vertical-align:middle; }
.av svg{ width:100%; height:100%; display:block; }
.av.ph{ background:hsl(var(--h) 55% 30%); border:2px solid hsl(var(--h) 70% 60%); color:#fff; font:800 11px var(--mono, monospace); }
.av.chip{ width:24px; height:24px; margin:-4px 0; }
.av.mini{ width:28px; height:28px; margin-right:8px; }
.av-cell{ white-space:nowrap; } .av-cell a{ vertical-align:middle; }
.bm-av .av-eyes{ transform-box:fill-box; transform-origin:center; animation:avBlink 4.2s infinite; }
@keyframes avBlink{ 0%, 92%, 100%{ transform:scaleY(1); } 95%{ transform:scaleY(.1); } }
@media (prefers-reduced-motion: reduce){ .bm-av .av-eyes{ animation:none; } }
.av-grid{ display:grid; grid-template-columns:minmax(220px, 300px) 1fr; gap:18px; align-items:start; }
.av-preview{ position:sticky; top:12px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.av-big{ width:230px; height:276px; border-radius:18px; background:radial-gradient(ellipse at 50% 85%, rgba(57,255,20,.14), transparent 65%); } .av-big svg{ width:100%; height:100%; }
.av-poses{ display:flex; flex-wrap:wrap; gap:6px; justify-content:center; } .av-poses button{ min-height:36px; }
.av-coins{ font-size:22px; } .av-coins .coin{ color:#f5c518; text-shadow:0 0 8px rgba(245,197,24,.6); }
.av-animals{ display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:10px; }
.av-pick, .av-item{ display:flex; flex-direction:column; align-items:center; gap:4px; background:#0d141b; border:1px solid var(--line2, #2a3a4c); border-radius:10px; padding:8px 6px; color:inherit; cursor:pointer; font:inherit; font-size:13px; min-height:44px; }
.av-pick svg{ width:62px; height:74px; }
.av-pick.on, .av-item.on{ border-color:var(--scl, #39ff14); box-shadow:0 0 0 2px rgba(57,255,20,.25); }
.av-colors{ display:flex; flex-wrap:wrap; gap:8px; } .av-col{ width:36px; height:36px; border-radius:50%; border:2px solid rgba(255,255,255,.25); cursor:pointer; } .av-col.on{ border-color:#fff; box-shadow:0 0 0 3px rgba(57,255,20,.4); }
.av-items{ display:grid; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); gap:10px; }
.av-thumb{ width:64px; height:77px; display:flex; align-items:center; justify-content:center; } .av-thumb.av-none{ height:64px; border-radius:50%; } .av-thumb svg{ width:100%; height:100%; }
.av-none{ background:#111820; color:var(--dim, #9fb0c0); font-size:22px; }
.av-item small{ color:var(--dim, #9fb0c0); font-size:11.5px; text-align:center; } .av-item.own small{ color:var(--scl, #39ff14); } .av-item.locked{ opacity:.55; }
.av-page h2{ margin-top:14px; }
@media (max-width:760px){ .av-grid{ grid-template-columns:1fr; } .av-preview{ position:static; } .av-big{ width:170px; height:204px; } }
/* Avatare 2.0 (A3): Ganzkörper statt Kreis; die Figur animiert sich selbst (avatar_core.js CSS) */
.av.full{ border-radius:0; overflow:visible; }
.bm-av.full{ width:60px; height:72px; border-radius:0; }
.bm-av.full.idle, .bm-av.full.jump, .bm-av.full.dance{ animation:none; }
.bm-av.full.dance{ width:100px; height:120px; margin-bottom:0; }
.bm-av.full.stage{ width:200px; height:240px; }
.bm-av.full.sad{ transform:none; filter:grayscale(.45) brightness(.85); }
.bm-crowd .bm-av.full{ width:64px; height:77px; }
/* Garderobe 2.0 (A5): Seltenheitsrahmen, Fortschritt, Filter */
.av-item{ position:relative; border-color:color-mix(in srgb, var(--rc, #2a3a4c) 55%, transparent); }
.av-item.r-gewoehnlich{ border-color:var(--line2, #2a3a4c); }
.av-item.r-legendaer, .av-item.r-mythisch{ box-shadow:inset 0 0 18px color-mix(in srgb, var(--rc) 22%, transparent); }
.av-item.r-mythisch{ background:linear-gradient(160deg, #1a1020, #0d141b 60%); }
.av-rar{ font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--rc, #9aa3ab); }
.av-tthumb{ height:auto; min-height:40px; } .av-tthumb .av-title{ font-size:12px; }
.av-prog{ display:grid; grid-template-columns:1fr auto; gap:2px 6px; width:100%; font-size:10.5px; color:var(--dim, #9fb0c0); text-align:left; }
.av-prog-t{ grid-column:1 / -1; line-height:1.25; } .av-bar{ height:6px; border-radius:3px; background:#1f2a36; overflow:hidden; align-self:center; } .av-bar i{ display:block; height:100%; background:var(--rc, #39ff14); }
.av-filter{ display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; margin:16px 0 4px; padding:10px; border:1px solid var(--line2, #2a3a4c); border-radius:10px; }
.av-filter label{ display:flex; gap:6px; align-items:center; }
.av-wears, .av-set{ color:var(--dim, #9fb0c0); text-align:center; } .av-set{ color:#ffd166; }
````

## C4b – CSS: Beamer (Lobby, Rangliste, Animationen)

Quelle: `dev/portal/portal.css` – Zeilen 500–519

````css
/* ---------- Beamer (Feedback-Auftrag Paket 2): Anlagenbild, Avatare, Ticker, Speedrun-Fortschritt, Musik ---------- */
.bm-plant{ display:flex; align-items:center; gap:14px; margin-bottom:6px; }
.bm-plant svg{ width:clamp(90px, 10vw, 150px); height:auto; flex:none; filter:drop-shadow(0 0 12px currentColor); }
.bm-brief{ font-size:clamp(17px, 1.6vw, 22px); line-height:1.4; margin:6px 0; color:var(--txt, #e6eef6); }
.bm-tasks{ margin:6px 0; padding-left:26px; font-size:clamp(16px, 1.5vw, 20px); line-height:1.5; }
.bm-crowd{ display:flex; flex-wrap:wrap; gap:10px 14px; max-height:34vh; overflow:auto; }
.bm-who{ display:flex; flex-direction:column; align-items:center; gap:4px; font-size:14px; max-width:92px; text-align:center; }
.bm-who > span:last-child{ max-width:92px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bm-who.in{ animation:chipIn .5s ease-out; }
.bm-av{ display:inline-flex; align-items:center; justify-content:center; width:46px; height:46px; border-radius:50%; flex:none; position:relative; }
.bm-av.ph{ background:hsl(var(--h) 55% 30%); border:2px solid hsl(var(--h) 70% 60%); color:#fff; font:800 16px var(--mono, monospace); }
.bm-av svg{ width:100%; height:100%; }
.bm-name{ display:flex; align-items:center; gap:10px; } .bm-name .bm-av{ width:38px; height:38px; font-size:13px; }
.bm-av.idle{ animation:avIdle 3.2s ease-in-out infinite; }
.bm-av.jump{ animation:avJump .7s cubic-bezier(.3,1.6,.5,1) 3; }
.bm-av.dance{ width:74px; height:74px; font-size:22px; margin-bottom:8px; animation:avDance 1.1s ease-in-out infinite; }
@keyframes avIdle{ 0%,100%{ transform:translateY(0) scale(1); } 50%{ transform:translateY(-2px) scale(1.03); } }
@keyframes avJump{ 0%,100%{ transform:translateY(0); } 40%{ transform:translateY(-16px) rotate(-6deg); } 70%{ transform:translateY(-4px) rotate(4deg); } }
@keyframes avDance{ 0%,100%{ transform:rotate(-8deg) translateY(0); } 25%{ transform:rotate(0) translateY(-10px); } 50%{ transform:rotate(8deg) translateY(0); } 75%{ transform:rotate(0) translateY(-10px); } }
@media (prefers-reduced-motion: reduce){ .bm-av.idle, .bm-av.jump, .bm-av.dance, .bm-who.in{ animation:none; } }
````

## C4c – CSS: Podest

Quelle: `dev/portal/portal.css` – Zeilen 343–357

````css
.bm-podium{ display:flex; align-items:flex-end; justify-content:center; gap:18px; margin:18px 0 26px; }
.bp{ width:min(220px, 28vw); display:flex; flex-direction:column; align-items:center; animation:rise .9s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes rise{ from{ transform:translateY(80px); opacity:0; } }
.bp-name{ font-size:clamp(18px, 2.4vw, 30px); font-weight:800; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bp-pts{ font-family:var(--mono); color:var(--dim); margin-bottom:26px; }
.bp-step{ width:100%; border-radius:12px 12px 0 0; display:flex; justify-content:center; padding-top:10px; font-size:44px; font-weight:800; color:#111; }
.bp1 .bp-step{ height:190px; background:linear-gradient(#ffe066, #c99700); box-shadow:0 0 60px rgba(255,210,60,.35); }
.bp2 .bp-step{ height:140px; background:linear-gradient(#f0f0f0, #9a9a9a); }
.bp3 .bp-step{ height:105px; background:linear-gradient(#f0b070, #a0602a); }
/* A2: Podest als 3D-Stufen (Oberseite in Isometrie, Seitenschatten) */
.bp-step{ position:relative; border-radius:0 0 4px 4px; box-shadow:inset -22px 0 0 rgba(0,0,0,.16), inset 0 -10px 0 rgba(0,0,0,.08); }
.bp1 .bp-step{ box-shadow:inset -22px 0 0 rgba(0,0,0,.16), inset 0 -10px 0 rgba(0,0,0,.08), 0 0 60px rgba(255,210,60,.35); }
.bp-step::before{ content:''; position:absolute; left:0; right:0; bottom:100%; height:18px; background:inherit; filter:brightness(1.22); clip-path:polygon(8% 0, 92% 0, 100% 100%, 0 100%); }
.bp .bm-av.full.dance{ width:140px; height:168px; margin-bottom:-6px; }
.bp1 .bm-av.full.dance{ width:170px; height:204px; }
````

## C4d – CSS: Sudden-Death-Sieger / Verlierer

Quelle: `dev/portal/portal.css` – Zeilen 576–586

````css
.bm-title{ display:block; margin-top:2px; } .bm-wears{ font-size:15px; color:var(--dim, #9fb0c0); }
/* Sudden Death (L1) */
.bm-sd{ display:inline-block; background:linear-gradient(90deg, #8b0000, #d62828); color:#fff; font-weight:800; letter-spacing:.06em; padding:8px 16px; border-radius:8px; margin-bottom:10px; box-shadow:0 0 24px rgba(214,40,40,.45); }
.bm-sd-end{ text-align:center; } .bm-sd-win{ display:flex; flex-direction:column; align-items:center; margin:10px 0 6px; }
.bm-av.stage{ width:180px; height:180px; font-size:48px; } .bm-sd-t{ font-size:26px; color:#ffd166; font-weight:800; }
.bm-lost{ display:flex; flex-wrap:wrap; justify-content:center; gap:12px 18px; margin:8px 0 14px; } .bm-lost small{ font-size:12px; }
.bm-av.sad{ filter:grayscale(.75) brightness(.8); transform:rotate(-8deg) translateY(4px); }
.bm-flash{ animation:bmFlash .9s ease-out 1; } @keyframes bmFlash{ 0%{ background:rgba(255,255,255,.55); } 100%{ background:transparent; } }
@media (prefers-reduced-motion: reduce){ .bm-flash{ animation:none; } }
.bm-lost .bm-who > span{ max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* „So funktioniert’s“ am Beamer (L2) */
````

## C4e – CSS: Avatar im Spiel-Endbildschirm

Quelle: `dev/src/styles_new.css` – Zeilen 779–782

````css
.live-av{ display:inline-block; width:120px; height:144px; margin:6px auto 2px; } .live-av svg{ width:100%; height:100%; }
.live-av.win{ animation:none; } .live-av.win.other{ animation:none; }
@keyframes liveWin{ 0%,100%{ transform:rotate(-6deg); } 50%{ transform:rotate(6deg) translateY(-6px); } }
@media (prefers-reduced-motion: reduce){ .live-av.win{ animation:none; } }
````

## C5a – Anzeige-Helfer avatarHTML()

Quelle: `dev/portal/portal.js` – Zeilen 538–553 und 115; `esc` = HTML-Escape

````js
// Avatar (Paket 3): Tier aus avatar_core.js, sonst Platzhalter (Initialen, Farbe aus dem Pseudonym)
const avHue = s => [...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
// Avatare 2.0 (A3): Klassen steuern die Darstellung – chip/mini/row = Kopf im Kreis, sonst Ganzkörper (stage = gross);
// Pose aus dance/sad/jump/wave, Animation nur am Beamer (bm-av) oder mit „anim“
function avatarHTML(av, username, cls){
  const c = ' ' + (cls || '') + ' ', has = k => c.includes(' ' + k + ' ');
  if(av && window.SPSQAvatar){
    const A = window.SPSQAvatar;
    if(has('chip') || has('mini') || has('row')) return '<span class="av' + c + '" aria-hidden="true">' + A.svg(av, { size: 'chip' }) + '</span>';
    const pose = has('dance') ? 'dance' : has('sad') ? 'sad' : has('jump') ? 'jubel' : has('wave') ? 'wave' : 'idle';
    return '<span class="av full' + c + '" aria-hidden="true">' + A.svg(av, { size: has('stage') ? 'stage' : 'card', pose, anim: has('bm-av') || has('anim') }) + '</span>';
  }
  const ini = String(username || '?').replace(/[^A-Za-zÄÖÜäöü0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  return '<span class="av ph ' + (cls || '') + '" style="--h:' + avHue(username) + '" aria-hidden="true"><b>' + esc(ini) + '</b></span>';
}
const EXTRA_ROUTES = [];   // weitere Ansichten (z.B. Live-Challenge) hängen sich hier ein

// Kopfzeile:
function renderUserChip(){ if(!USER) return; $('userName').innerHTML = avatarHTML(USER.avatar, USER.username, 'chip') + ' ' + esc(USER.username); }
````

## C5b – Verwendung am Beamer (Lobby, Titel, „trägt …“)

Quelle: `dev/portal/portal_live.js` – Zeilen 118–128

````js
// Avatar: bis Paket 3 ein Platzhalter (Kreis mit Initialen, Farbe aus dem Pseudonym); mit P.avatarHTML (Paket 3) das Tier des Kontos
const hue = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
function avatar(p, cls){
  if(P.avatarHTML) return P.avatarHTML(p.avatar, p.username, 'bm-av ' + (p.avatar ? '' : 'ph-bm ') + (cls || ''));
  const ini = String(p.username || '?').replace(/[^A-Za-zÄÖÜäöü0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  return '<span class="bm-av ph ' + (cls || '') + '" style="--h:' + hue(p.username) + '" aria-hidden="true"><b>' + esc(ini) + '</b></span>';
}
// Garderobe 2.0 (A6): Titel unter dem Namen und „trägt …“ beim Beitreten
const AVC = () => window.SPSQAvatar;
function titleHTML(p){ const A = AVC(), t = A && p && p.avatar && A.title(p.avatar); if(!t) return ''; A.ensureCSS(); return '<span class="av-title bm-title' + (t.glanz ? ' glanz' : '') + '" style="color:' + A.RARITY[t.rarity].color + '">' + esc(t.text) + '</span>'; }
function wears(p){ const A = AVC(), b = A && p && p.avatar && A.best(p.avatar); return b ? ' – trägt: ' + b.rarityName + ' ' + b.name : ''; }
````

## C5c – Verwendung im Spiel (Sieger-Avatar)

Quelle: `dev/src/app.js` – Zeile 2253

````js
  const avHTML = (av, cls) => av && window.SPSQAvatar ? '<span class="live-av ' + (cls || '') + '">' + window.SPSQAvatar.svg(av, { size: 'card', pose: 'dance', anim: !/other/.test(cls || '') }) + '</span>' : '';
````

## C6 – Build: AVATAR_META und Server-Bundle

Quelle: `dev/build.js` – Zeilen 194–196 und 260–266; `C.tasks` = Aufgaben des Kurses, `R(datei)` = Datei aus dev/src lesen

````js
  AVATAR_META[key] = Object.fromEntries(C.tasks.filter(t => t.isBoss || t.isFinal || t.boss || t.final).map(t => [t.id, { boss: !!(t.isBoss || t.boss), final: !!(t.isFinal || t.final), ch: t.level }]));
  // Garderobe 2.0: angezeigte Aufgaben/Theorien je Quest (Sensor-Kollektion, Wirtschaftsrechnung)
  AVATAR_META[key].$ = { tasks: tasks.filter(t => !t.hidden).length, theoryAll: theory.length, ...(key === 'sensor' ? { shown: tasks.filter(t => !t.hidden).map(t => t.id), theory: theory.length } : {}) };

// ---- Worker-Bundle Avatare/Coins: Katalog + Coin-Regeln + Boss-/Final-Kennzeichen je Quest ----
{
  const code = '// ERZEUGT von dev/build.js – nicht von Hand ändern. Avatar-Katalog und Coin-Regeln (dev/src/avatar_core.js) für den Worker.\n'
    + R('avatar_core.js') + '\nexport const Avatar = globalThis.SPSQAvatar;\nexport const AVATAR_META = ' + JSON.stringify(AVATAR_META) + ';\n';
  fs.writeFileSync(path.join(__dirname, '..', 'worker', 'gen', 'avatar_bundle.js'), code);
  console.log('worker/gen/avatar_bundle.js ' + (code.length / 1024).toFixed(0) + ' KB');
}
````

## C7a – Datenbank-Migration

Quelle: `worker/db.js` – Zeilen 229–248

````js
  // Feedback-Auftrag Paket 3: Tier-Avatare und Coins (nur verdienbar, rein kosmetisch). Stand = Fortschritt (berechnet) + coin_ledger.
  { id: 9, name: 'avatare-coins', sql: [
    `CREATE TABLE IF NOT EXISTS avatars (
       user_id INTEGER PRIMARY KEY,
       animal TEXT NOT NULL,
       color TEXT NOT NULL,
       equip TEXT NOT NULL DEFAULT '{}',
       updated_at INTEGER NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS coin_ledger (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       amount INTEGER NOT NULL,
       source TEXT NOT NULL,
       ref TEXT NOT NULL,
       created_at INTEGER NOT NULL,
       UNIQUE(user_id, source, ref)
     )`,
    `CREATE INDEX IF NOT EXISTS coin_ledger_user ON coin_ledger(user_id)`
  ]},
````

## C7b – Server-Helfer aus lib.js

Quelle: `worker/lib.js` – von avatar.js verwendet: json, fail, now, cleanText

````js
export class HttpError extends Error {
  constructor(status, msg, extra){ super(msg); this.status = status; this.extra = extra || null; }
}
export const fail = (status, msg, extra) => { throw new HttpError(status, msg, extra); };

export function json(data, status = 200, headers = {}){
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, headers)
  });
}

export const now = () => Date.now();
export function cleanText(s, max){ return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
````

## C7c – Rangfolge rank() aus challenge.js

Quelle: `worker/challenge.js` – von challengeStats verwendet

````js
const progOf = pl => { try{ return JSON.parse(pl.progress || '{}') || {}; }catch(e){ return {}; } };
const lastSolve = pl => Math.max(0, ...Object.values(progOf(pl)).map(x => x.s || 0));
export function rank(players, multi, winnerId){
  if(winnerId){ const w = players.find(p => p.user_id === winnerId); if(w){ const rest = rank(players.filter(p => p !== w), multi); w.rank = 1; rest.forEach(p => { if(p.rank) p.rank += 1; }); return [w].concat(rest); } }
  if(multi){
    const sorted = players.slice().sort((a, b) => (b.solved_n - a.solved_n) || (b.solved_n ? lastSolve(a) - lastSolve(b) : 0) || a.username.localeCompare(b.username));
    let r = 0, last = null;
    sorted.forEach((p, i) => { if(p.solved_n){ if(!last || last.solved_n !== p.solved_n || lastSolve(last) !== lastSolve(p)) r = i + 1; p.rank = r; last = p; } else p.rank = null; });
    return sorted;
  }
  const sorted = players.slice().sort((a, b) => {
    if(!!b.solved_at !== !!a.solved_at) return b.solved_at ? 1 : -1;
    if(a.solved_at) return (b.points - a.points) || (a.solved_at - b.solved_at);
    return a.username.localeCompare(b.username);
  });
  let r = 0, last = null;
  sorted.forEach((p, i) => { if(p.solved_at){ if(!last || last.points !== p.points || last.solved_at !== p.solved_at) r = i + 1; p.rank = r; last = p; } else p.rank = null; });
  return sorted;
}
````

## C7d – Einhängepunkte im Server

Quelle: `worker/index.js` – alle Zeilen mit Avatar-Bezug

````js
import { avatarRoutes, avatarOf, avatarsFor } from './avatar.js';
  const r = (await challengeRoutes(C, p, m, H)) || (await feedbackRoutes(C, p, m, H)) || (await reportRoutes(C, p, m, H)) || (await examRoutes(C, p, m, H)) || (await certRoutes(C, p, m, H)) || (await avatarRoutes(C, p, m, H));
  out.avatar = await avatarOf(C, u.id).catch(() => null);   // Paket 3: Tier-Avatar (null = noch keiner gewählt)
    C.db.prepare('DELETE FROM avatars WHERE user_id = ?').bind(id),
    C.db.prepare('DELETE FROM coin_ledger WHERE user_id = ?').bind(id),
  const avs = await avatarsFor(C, Object.keys(by).map(Number));
  Object.values(by).forEach(s => { s.avatar = avs[s.id] || null; });
````

## C7e – Einhängepunkte Challenge / Zertifikat

Quelle: `worker/challenge.js, worker/cert.js` – alle Zeilen mit Avatar-Bezug

````js
import { avatarsFor, awardSpeedrun } from './avatar.js';
  try{ await awardSpeedrun(C, ch, rank(await players(C, ch.id), !!taskList(ch), ch.winner_id)); }catch(e){ console.warn('Speedrun-Prämie', e && e.message); }
// Sieger einer Sudden-Death-Challenge (Pseudonym + Avatar), sonst null
  const av = await avatarsFor(C, [r.user_id]);
  return { userId: r.user_id, username: r.username, avatar: av[r.user_id] || null };
  const avs = await avatarsFor(C, pls.map(p => p.user_id));
    players: pls.map(p => ({ userId: p.user_id, username: p.username, avatar: avs[p.user_id] || null, attempts: p.attempts, hints: p.hints, solved: !!p.solved_at,

// cert.js
import { awardCert } from './avatar.js';
  await awardCert(C, C.user.id, e.quest, e.level, !!e.distinction);
````

## C8a – Logik-Test: test_avatar.js

Quelle: `dev/test_avatar.js` – ganze Datei; Aufruf `node test_avatar.js`, erwartet den Kern unter `./src/avatar_core.js`

````js
// Garderobe 2.0 (A4–A6), reine Logik: node test_avatar.js
// Katalog (Seltenheit, Preise je Stufe, Bedingungen nur aus Server-Quellen für Legendär/Mythisch), Zeichnung aller Teile,
// Freischaltregeln und Fortschritt, alte Inventare, Varianten, Schaufenster, Sets, Wirtschaft.
const A = require('./src/avatar_core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if(c){ pass++; } else { fail++; console.log('✗ ' + m); } };
const BAND = { gewoehnlich: [0, 150], selten: [250, 500], episch: [800, 1500], legendaer: [2000, 3500], mythisch: [4000, 8000] };
const SERVER = ['cert', 'certs', 'profiCerts', 'challenges', 'podium', 'wins', 'sdWins', 'bugFixed', 'flawless', 'questFinal', 'finals3', 'sensorAll', 'sensorClean'];
const ids = Object.keys(A.ITEMS);
ids.forEach(id => {
  const it = A.ITEMS[id];
  ok(A.SLOTS[it.slot] && A.RARITY[it.rarity], id + ': Platz und Seltenheit gültig');
  // Titel (Episch) und Paket-3-/P-Teile dürfen ausserhalb des Bandes liegen
  if(!['titel'].includes(it.slot) && !it.earnOnly && !['kette_meister', 'helm_meister'].includes(id)) ok(it.price >= BAND[it.rarity][0] && it.price <= BAND[it.rarity][1], id + ': Preis ' + it.price + ' im Band ' + it.rarity);
  if(['legendaer', 'mythisch'].includes(it.rarity) && !it.shop) ok(it.unlock && Object.keys(it.unlock).every(k => SERVER.includes(k)), id + ': Legendär/Mythisch nur mit Server-Bedingung');
  if(it.anim) ok(it.rarity !== 'gewoehnlich', id + ': bewegte Teile sind mindestens selten');
  if(it.unlock) ok(A.unlockText(id).length > 5, id + ': Bedingungstext');
  // Zeichnung: Ganzkörper in allen Posen ohne doppelte IDs und mit aufgelösten Verweisen; Chip ohne Verläufe
  const av = { animal: 'baer', color: A.COLORS[2], equip: { oberteil: 'tshirt_grau', [it.slot]: id } };
  for(const pose of A.POSES){
    const s = A.svg(av, { size: 'card', pose, anim: true, uid: 'q-' });
    const d = [...s.matchAll(/ id="([^"]+)"/g)].map(m => m[1]), refs = [...s.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
    ok(new Set(d).size === d.length && refs.every(r => d.includes(r)) && !/undefined|NaN/.test(s), id + '/' + pose + ': Zeichnung sauber');
  }
  ok(!/url\(#/.test(A.svg(av, { size: 'chip' }).replace(/clip-path="url\(#[^)]+c\)"/, '')) && !/undefined|NaN/.test(A.svg(av)), id + ': Chip ohne Verläufe');
});
// alte Inventare (Paket 3): Preise, Plätze und Besitz unverändert
const OLD = { tshirt_grau: 0, tshirt_rot: 40, tshirt_blitz: 120, hemd_kariert: 110, kette_gold: 150, sonnenbrille: 90, kappe_rot: 50, bauhelm: 120 };
Object.keys(OLD).forEach(id => ok(A.ITEMS[id] && A.ITEMS[id].price === OLD[id] && A.ITEMS[id].rarity === 'gewoehnlich', id + ': Preis aus Paket 3 bleibt'));
const old = A.normalize({ animal: 'wolf', color: '#1f5f8b', equip: { oberteil: 'hemd_kariert', kette: 'kette_gold', brille: 'sonnenbrille', kopf: 'bauhelm' } });
ok(old.equip.kopf === 'bauhelm' && old.equip.kette === 'kette_gold', 'alter Avatar bleibt angezogen');
ok(A.owns('tshirt_grau', [], {}) && A.owns('kappe_rot', ['kappe_rot'], {}) && !A.owns('kappe_rot', [], {}), 'Besitz: frei / gekauft / nicht gekauft');
// Freischaltregeln und Fortschritt
const meta = { scl: { final_boss: { final: true, ch: 10 }, p15_final: { final: true, ch: 15 }, $: { tasks: 150 } }, sensor: { $: { shown: Array.from({ length: 30 }, (_, i) => 's' + i), theory: 12, tasks: 30 } } };
const prog = { scl: { doneTasks: Object.fromEntries(Array.from({ length: 52 }, (_, i) => ['t' + i, { stars: 3 }])), doneTheory: {} } };
let ctx = A.balance(prog, meta, [], [], {}).ctx;
ok(A.isUnlocked('scl_hoodie', ctx) && !A.isUnlocked('scl_visor', ctx), '25 SCL-Aufgaben: Hoodie frei, Visor (75) nicht');
ok(/52\/75/.test(A.unlockText('scl_visor', ctx)), 'Fortschritt im Text: ' + A.unlockText('scl_visor', ctx));
const pr = A.unlockProgress('scl_visor', ctx)[0]; ok(pr.have === 52 && pr.need === 75 && !pr.ok, 'Fortschrittsbalken 52/75');
ok(!A.isUnlocked('scl_greifarm', ctx), 'Greifarm ohne Final Boss gesperrt');
prog.scl.doneTasks.final_boss = { stars: 3 }; ctx = A.balance(prog, meta, [], [], {}).ctx;
ok(A.isUnlocked('scl_greifarm', ctx) && ctx.questFinal.scl === 'final_boss', 'Final Boss im Spielstand: Greifarm freischaltbar (Kauf prüft der Worker)');
prog.scl.doneTasks.p15_final = { stars: 3 }; ctx = A.balance(prog, meta, [], [], {}).ctx;
ok(ctx.finals3 === 1, 'Final Boss 2 zählt nicht als weitere Sprache');
prog.scl.doneTasks.final_boss = { revealed: true }; ctx = A.balance(prog, meta, [], [], {}).ctx;
ok(!A.isUnlocked('scl_greifarm', ctx), 'Final Boss mit „Lösung zeigen“ schaltet nichts frei');
ctx = A.balance(prog, meta, [], [{ quest: 'scl', level: 'grund' }, { quest: 'scl', level: 'profi' }], {}).ctx;
ok(A.isUnlocked('scl_aura', ctx) && !A.isUnlocked('kop_sockel', ctx) && ctx.profiCerts === 1, 'Zertifikat SCL Profi: Code-Aura frei, KOP nicht');
ok(!A.owns('kopf_krone', [], ctx), 'Krone erst mit allen vier Profi-Zertifikaten');
ctx = A.balance(prog, meta, [], ['scl', 'kop', 'fup', 'awl'].map(q => ({ quest: q, level: 'profi' })), {}).ctx;
ok(A.owns('kopf_krone', [], ctx), 'vier Profi-Zertifikate: Krone gehört einem (nur verdienbar)');
ctx = A.balance({}, meta, [], [], { challenges: 15, podium: 4, wins: 1, sdWins: 1, bugFixed: 5, flawless: 9 }).ctx;
ok(A.isUnlocked('sockel_neon', ctx) && !A.isUnlocked('sockel_holo', ctx) && !A.isUnlocked('hand_pokal', ctx) && A.isUnlocked('aura_blitz', ctx) && A.isUnlocked('hand_lupe', ctx) && !A.isUnlocked('titel_null', ctx), 'Challenge-Trophäen nach Stufen');
const sp = { sensor: { doneTasks: Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['s' + i, { stars: 2 }]).concat([['hidden1', {}]])), doneTheory: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['th' + i, {}])) } };
ctx = A.balance(sp, meta, [], [], {}).ctx;
ok(A.isUnlocked('sen_multimeter', ctx) && A.isUnlocked('sen_umhang', ctx) && ctx.questSolved.sensor === 30, 'Sensor: alle 30 angezeigten + Theorien');
sp.sensor.doneTasks.s3 = { revealed: true }; ctx = A.balance(sp, meta, [], [], {}).ctx;
ok(A.isUnlocked('sen_multimeter', ctx) && !A.isUnlocked('sen_umhang', ctx), 'Sensor-Meister nur ohne „Lösung zeigen“');
// Varianten
const v1 = A.item('scl_visor~1');
ok(v1 && v1.price === 1560 && v1.color === A.ITEMS.scl_visor.alt[0] && v1.slot === 'brille', 'Variante +30 %: ' + (v1 && v1.price));
ok(!A.item('kappe_rot~1') && !A.item('scl_visor~3') && !A.item('x~1'), 'ungültige Varianten');
ok(A.normalize({ equip: { brille: 'scl_visor~2' } }).equip.brille === 'scl_visor~2', 'Variante bleibt beim Normalisieren');
// Schaufenster: je Monat 3, wechselt monatlich
const jan = Date.UTC(2026, 0, 15), feb = Date.UTC(2026, 1, 15);
const sale = t => ids.filter(id => A.ITEMS[id].shop && A.onSale(id, t));
ok(sale(jan).length === 3 && sale(feb).length === 3 && sale(jan).every(id => !sale(feb).includes(id)), 'Schaufenster: 3 Teile je Monat, monatlich wechselnd');
ok(A.onSale('kappe_rot', jan), 'normale Teile immer kaufbar');
// Sets und Titel
const fupSet = { animal: 'katze', equip: { kopf: 'fup_lokmuetze', hand: 'fup_kelle~1', kette: 'fup_laterne', aura: 'fup_dampf', siegerpose: 'fup_pfiff', titel: 'fup_titel' } };
ok(A.setDone(A.normalize(fupSet)) === 'fup' && /stroke="#cbd5e1" stroke-width="1.6"/.test(A.svg(fupSet, { size: 'card' })), 'FUP-Set komplett (auch mit Variante): Schienen-Sockel');
ok(A.title(fupSet).text === 'Fahrdienstleiter' && A.best(fupSet).rarity === 'mythisch', 'Titel und seltenstes Teil');
// Wirtschaft: Katalog ≈ 60 000–80 000 (ohne Varianten/Schaufenster), mehr als alle Quests zusammen
const E = A.economy({ scl: { $: { tasks: 150 } }, kop: { $: { tasks: 150 } }, fup: { $: { tasks: 150 } }, awl: { $: { tasks: 150 } }, sensor: { $: { tasks: 30, theoryAll: 12 } } });
ok(E.total >= 60000 && E.total <= 82000, 'Katalogsumme ' + E.total);
ok(Object.values(E.perQuest).reduce((a, b) => a + b, 0) < E.total / 3, 'Quests allein reichen nicht für den ganzen Katalog');
console.log('Garderobe 2.0: ' + pass + ' bestanden, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
````

## C8b – API- und Oberflächentest: tests/avatar.js

Quelle: `dev/tests/avatar.js` – ganze Datei; braucht Playwright und laufenden Server

````js
// Avatare und Coins (Feedback-Auftrag Paket 3): API (Stand aus Fortschritt, Kauf, Sperren, Speedrun-Prämie) und Oberfläche (Garderobe, Kopf, Klassenliste, Beamer)
// Gegen einen laufenden Worker: node tests/avatar.js [http://localhost:8787]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const sql = cmd => execFileSync('npx', ['wrangler', 'd1', 'execute', 'spsquest', '-c', '../wrangler.jsonc', '--local', '--command', cmd], { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
const BASE = process.argv[2] || 'http://localhost:8787';
const vars = Object.fromEntries(fs.readFileSync(path.join(__dirname, '..', '..', '.dev.vars'), 'utf8').split('\n').filter(Boolean).map(l => l.split('=')));
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const RUN = Date.now().toString(36).slice(-5);
let fails = 0, oks = 0;
const ok = (c, m) => { if(c){ oks++; console.log('✓ ' + m); } else { fails++; console.log('✗ ' + m); } };
const api = async (cookie, method, url, body) => { const r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', 'x-spsquest': '1', cookie: cookie || '' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})), cookie: (r.headers.get('set-cookie') || '').split(';')[0] }; };
(async () => {
  const adm = await api('', 'POST', '/api/login', { username: vars.ADMIN_USER, password: vars.ADMIN_PASSWORD });
  await api(adm.cookie, 'POST', '/api/admin/teachers', { username: 'av_' + RUN, password: 'av-lehrer-1' });
  const tl = await api('', 'POST', '/api/login', { username: 'av_' + RUN, password: 'av-lehrer-1' });
  await api(tl.cookie, 'POST', '/api/me/password', { old: 'av-lehrer-1', password: 'av-lehrer-2' });
  const cls = await api(tl.cookie, 'POST', '/api/classes', { name: 'Avatar ' + RUN });
  const names = ['Otter' + RUN, 'Luchs' + RUN], ck = [];
  for(const u of names){ const r = await api('', 'POST', '/api/register', { code: cls.data.code, username: u, password: 'schueler-pw' }); await api(r.cookie, 'POST', '/api/me/notice', {}); ck.push(r.cookie); }
  const [A, B] = ck;
  // 1) Stand aus dem Fortschritt: 3 Aufgaben (1★, 2★, 3★), 1 Kapitel-Boss, 1 Theorie
  let r = await api(A, 'GET', '/api/avatar');
  ok(r.status === 200 && r.data.coins.balance === 0 && r.data.avatar === null, 'neues Konto: 0 Coins, noch kein Avatar');
  const state = { doneTasks: { r1t1: { stars: 1 }, r1t2: { stars: 2 }, c1_boss: { stars: 3 } }, doneTheory: { th1a: { score: 5, n: 5 } } };
  await api(A, 'PUT', '/api/progress/scl', { state, summary: { tasks: 3 }, base: 0 });
  r = await api(A, 'GET', '/api/avatar');
  ok(r.data.coins.balance === 10 + 15 + 20 + 40 + 10, 'Coins aus dem Fortschritt: 10 + 15 + 20 + Boss 40 + Theorie 10 = ' + r.data.coins.balance);
  // 2) Kaufen, Sperren, Besitz
  ok((await api(A, 'PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kappe_rot' } })).status === 403, 'Anziehen ohne Besitz wird abgelehnt');
  ok((await api(A, 'POST', '/api/avatar/buy', { item: 'kette_gold' })).status === 403, 'Goldene Kette gesperrt (Final Boss fehlt)');
  ok((await api(A, 'POST', '/api/avatar/buy', { item: 'hemd_kariert' })).status === 400, 'zu teuer wird abgelehnt');
  r = await api(A, 'POST', '/api/avatar/buy', { item: 'kappe_rot' });
  ok(r.status === 200 && r.data.balance === 95 - 50, 'Kappe gekauft, Stand 45');
  ok((await api(A, 'PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kappe_rot' } })).status === 200, 'gekaufte Kappe anziehen');
  r = await api(A, 'GET', '/api/avatar'); ok(r.data.owned.includes('kappe_rot') && r.data.coins.spent === 50, 'Kauf im Coin-Buch');
  // Final Boss schaltet die goldene Kette frei (Preis 150): Fortschritt mit Final Boss
  state.doneTasks.final_boss = { stars: 3 }; await api(A, 'PUT', '/api/progress/scl', { state, summary: { tasks: 4 }, base: 0, force: true });
  r = await api(A, 'GET', '/api/avatar'); ok(r.data.unlock.final === 1 && r.data.coins.balance === 45 + 20 + 100, 'Final Boss: +120 Coins, Freischaltung „final“');
  ok((await api(A, 'POST', '/api/avatar/buy', { item: 'kette_gold' })).status === 200, 'Goldene Kette nach dem Final Boss kaufbar');
  // 3) Speedrun-Prämie: zwei lösen, Otter zuerst → Rang 1 (60) und Rang 2 (40), einmal pro Challenge
  const ch = await api(tl.cookie, 'POST', '/api/challenges', { mode: 'sprint', quest: 'scl', taskId: 'r1t3', duration: 300 });
  const code = ch.data.code;
  for(const c of ck) await api(c, 'POST', '/api/live/join', { code });
  await api(tl.cookie, 'POST', '/api/challenges/' + ch.data.id + '/start', {});
  await api(A, 'POST', '/api/live/' + ch.data.id + '/attempt', { ok: true, code: 'x' });
  await new Promise(res => setTimeout(res, 30));
  await api(B, 'POST', '/api/live/' + ch.data.id + '/attempt', { ok: true, code: 'y' });
  const beforeB = (await api(B, 'GET', '/api/avatar')).data.coins.balance;
  await api(tl.cookie, 'POST', '/api/challenges/' + ch.data.id + '/stop', {});
  await api(tl.cookie, 'POST', '/api/challenges/' + ch.data.id + '/stop', {});
  const a2 = (await api(A, 'GET', '/api/avatar')).data, b2 = (await api(B, 'GET', '/api/avatar')).data;
  ok(a2.coins.speedrun === 60 && a2.unlock.podium === 1, 'Speedrun Rang 1: +60 Coins, Podest zählt');
  ok(b2.coins.speedrun === 40 && b2.coins.balance === beforeB + 40, 'Speedrun Rang 2: +40 Coins (einmal, auch bei doppeltem Stopp)');
  // 5) Garderobe 2.0 (A5): Final Boss wird auf dem Server geprüft, Challenge-Statistik mit Regeln gegen Ausnutzen, Varianten, Schaufenster, nur verdienbar
  const uidOf = async c => (await api(c, 'GET', '/api/me')).data.user.id;
  const uA = await uidOf(A), uB = await uidOf(B);
  sql('INSERT INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (' + uA + ', 9000, \'test\', \'t' + RUN + '\', 0), (' + uB + ', 9000, \'test\', \'t' + RUN + '\', 0)');
  r = await api(A, 'POST', '/api/avatar/buy', { item: 'scl_greifarm' });
  ok(r.status === 403 && /Final Boss/.test(r.data.error), 'Legendär: Final Boss nur im Spielstand reicht nicht (' + r.data.error + ')');
  const refs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'web', 'data', 'scl_live.json'), 'utf8')).refs;
  await api(B, 'PUT', '/api/progress/scl', { state: { doneTasks: { final_boss: { stars: 3 } }, doneTheory: {}, solutions: { final_boss: 'Alarm := TRUE;' } }, summary: {}, base: 0, force: true });
  r = await api(B, 'POST', '/api/avatar/buy', { item: 'scl_greifarm' });
  ok(r.status === 403 && /Tests/.test(r.data.error), 'Legendär: falsche Final-Boss-Lösung abgelehnt');
  state.solutions = { final_boss: refs.final_boss }; await api(A, 'PUT', '/api/progress/scl', { state, summary: { tasks: 4 }, base: 0, force: true });
  r = await api(A, 'POST', '/api/avatar/buy', { item: 'scl_greifarm' });
  ok(r.status === 200, 'Legendär: echte Final-Boss-Lösung → Greifarm-Rucksack gekauft ' + JSON.stringify(r.data));
  ok((await api(A, 'POST', '/api/avatar/buy', { item: 'kopf_krone' })).status === 403, 'SPS-Meister-Krone ist nicht kaufbar');
  ok((await api(A, 'POST', '/api/avatar/buy', { item: 'kappe_rot~1' })).status === 404, 'Variante ohne Vorlage gibt es nicht');
  const off = Object.keys(JSON.parse(JSON.stringify(require('../src/avatar_core.js').ITEMS))).find(id => { const A0 = require('../src/avatar_core.js'); return A0.ITEMS[id].shop && !A0.onSale(id, Date.now()); });
  r = await api(A, 'POST', '/api/avatar/buy', { item: off });
  ok(r.status === 403 && /Schaufenster/.test(r.data.error), 'Schaufenster: ' + off + ' nur in seinem Monat');
  r = await api(A, 'GET', '/api/avatar');
  ok(r.data.unlock.challenges === 0 && r.data.unlock.podium === 1, 'Challenge mit 2 Teilnehmenden und < 2 min zählt nicht für Trophäen (Podest aus Paket 3 bleibt)');
  r = await api(A, 'POST', '/api/avatar/buy', { item: 'sockel_holz' });
  ok(r.status === 403 && /0\/1|teilnehmen/.test(r.data.error), 'Holz-Sockel gesperrt mit Fortschritt: ' + r.data.error);
  // Challenge, die zählt: 3 Teilnehmende, > 2 min (Startzeit zurückgesetzt), Otter gewinnt
  const c3 = (await api('', 'POST', '/api/register', { code: cls.data.code, username: 'Dachs' + RUN, password: 'schueler-pw' })).cookie; await api(c3, 'POST', '/api/me/notice', {});
  const ch2 = await api(tl.cookie, 'POST', '/api/challenges', { mode: 'sprint', quest: 'scl', taskId: 'r1t3', duration: 600 });
  for(const c of [A, B, c3]) await api(c, 'POST', '/api/live/join', { code: ch2.data.code });
  await api(tl.cookie, 'POST', '/api/challenges/' + ch2.data.id + '/start', {});
  sql('UPDATE challenges SET started_at = started_at - 180000 WHERE id = ' + ch2.data.id);
  await api(A, 'POST', '/api/live/' + ch2.data.id + '/attempt', { ok: true, code: 'x' });
  await api(tl.cookie, 'POST', '/api/challenges/' + ch2.data.id + '/stop', {});
  const a3 = (await api(A, 'GET', '/api/avatar')).data, d3 = (await api(c3, 'GET', '/api/avatar')).data;
  ok(a3.unlock.challenges === 1 && a3.unlock.wins === 1 && a3.unlock.flawless === 1, 'Statistik: Teilnahme, Sieg, fehlerfrei zählen ' + JSON.stringify(a3.unlock));
  ok(d3.unlock.challenges === 1 && d3.unlock.wins === 0 && d3.coins.speedrun === 5, 'Teilnahme +5 Coins, kein Sieg für Dachs');
  ok((await api(A, 'POST', '/api/avatar/buy', { item: 'sockel_holz' })).status === 200 && (await api(A, 'POST', '/api/avatar/buy', { item: 'kopf_kranz' })).status === 200, 'Holz-Sockel und Siegerkranz jetzt kaufbar');
  r = await api(A, 'PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kopf_kranz', kette: 'kette_gold', ruecken: 'scl_greifarm', sockel: 'sockel_holz', oberteil: 'tshirt_grau' } });
  ok(r.status === 200 && r.data.avatar.equip.ruecken === 'scl_greifarm' && r.data.avatar.equip.kette === 'kette_gold', 'neue Plätze anziehen; alte Teile bleiben gültig');
  ok((await api(A, 'PUT', '/api/avatar', { animal: 'wolf', equip: { hand: 'hand_pokal' } })).status === 403, 'nicht gekauftes Teil im neuen Platz abgelehnt');
  await api(A, 'PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kappe_rot', oberteil: 'tshirt_grau' } });
  // 4) Oberfläche
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } }); const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await ctx.addCookies([{ name: A.split('=')[0], value: A.split('=').slice(1).join('='), url: BASE }]);
  await p.goto(BASE + '/#/avatar'); await p.waitForSelector('.av-page');
  ok(await p.locator('.av-pick').count() === 8, '8 Tiere zur Auswahl');
  await p.click('.av-pick[data-animal="eule"]'); await p.click('.av-col[data-color="#6b3fa0"]');
  await p.click('.av-item[data-item="kappe_rot"]');
  ok(await p.locator('.av-item.locked[data-item="bauhelm"]').count() === 1 && /Kapitel-Bosse/.test(await p.getAttribute('.av-item[data-item="bauhelm"]', 'title')), 'Bauhelm gesperrt mit Hinweis auf die Bedingung');
  await p.click('.av-item[data-item="tshirt_rot"]'); await p.click('#dlgActions button:has-text("Kaufen")');
  await p.waitForSelector('.av-item.on[data-item="tshirt_rot"]');
  await p.click('#avSave'); await p.waitForSelector('#avMsg:has-text("Gespeichert")');
  r = await api(A, 'GET', '/api/avatar');
  ok(r.data.avatar.animal === 'eule' && r.data.avatar.color === '#6b3fa0' && r.data.avatar.equip.oberteil === 'tshirt_rot' && r.data.avatar.equip.kopf === 'kappe_rot', 'Garderobe speichert Tier, Farbe, T-Shirt und Kappe');
  ok(await p.locator('#userName .av svg').count() === 1, 'Avatar im Portal-Kopf');
  await p.screenshot({ path: SHOTS + '/avatar_garderobe.png' });
  // Dozent: Klassenliste mit Avatar, Beamer mit Tier
  const t = await ctx.browser().newContext({ viewport: { width: 1600, height: 900 } }); const tp = await t.newPage();
  await t.addCookies([{ name: tl.cookie.split('=')[0], value: tl.cookie.split('=').slice(1).join('='), url: BASE }]);
  await tp.goto(BASE + '/#/leitstand/klasse/' + cls.data.id); await tp.waitForSelector('.av-cell');
  ok(await tp.locator('.av-cell .av svg').count() === 1 && await tp.locator('.av-cell .av.ph').count() === 2, 'Klassenliste: Tier für Otter, Platzhalter für Luchs und Dachs');
  await tp.goto(BASE + '/#/beamer/' + ch.data.id); await tp.waitForSelector('.bm-podium .bp');
  ok(await tp.locator('.bm-podium .bm-av svg').count() === 1, 'Podest zeigt das Tier');
  await tp.waitForTimeout(2000); await tp.screenshot({ path: SHOTS + '/avatar_podest.png' });
  ok(!errors.length, 'keine JS-Fehler ' + errors.join(' | '));
  await api(tl.cookie, 'DELETE', '/api/classes/' + cls.data.id);
  await browser.close();
  console.log('Avatare/Coins: ' + oks + ' bestanden, ' + fails + ' fehlgeschlagen');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
````

## C8c – Bildvergleich und Bildrate: tests/avatar_snap.js

Quelle: `dev/tests/avatar_snap.js` – ganze Datei

````js
// Avatare 2.0 (A1–A3): Schnappschüsse der 8 Tiere (Bildvergleich gegen tests/baseline/avatar/*.png), eindeutige IDs bei 40 Avataren,
// Posen/Stile, reduzierte Bewegung und Bildrate mit 40 animierten Avataren (Ziel ≥ 50 fps).
// Aufruf: node tests/avatar_snap.js [--update]   (--update schreibt neue Referenzbilder, nach bewusster Stiländerung)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = require('../src/avatar_core.js');
const CORE = fs.readFileSync(path.join(__dirname, '..', 'src', 'avatar_core.js'), 'utf8');
const BASE = path.join(__dirname, 'baseline', 'avatar'), UPDATE = process.argv.includes('--update');
let pass = 0, fail = 0;
const ok = (c, m) => { if(c){ pass++; console.log('✓ ' + m); } else { fail++; console.log('✗ ' + m); } };
const EQ = [{ oberteil: 'tshirt_zahnrad', kopf: 'kappe_rot', brille: 'brille_rund', kette: 'kette_gold' }, { oberteil: 'hemd_kariert', kopf: 'bauhelm' }, { oberteil: 'tshirt_blitz', brille: 'sonnenbrille' }, { oberteil: 'hemd_blau', kopf: 'muetze', kette: 'kette_silber' }];
const AV = Object.keys(A.ANIMALS).map((k, i) => ({ animal: k, color: A.COLORS[i], equip: EQ[i % EQ.length] }));
(async () => {
  // Markup: IDs je Instanz eindeutig, alle Verweise aufgelöst, Kopf-Chip ohne Verläufe
  for(const st of A.STYLES) for(const p of A.POSES){
    const s = A.svg(AV[0], { size: 'card', pose: p, style: st, uid: 'u1-' });
    const ids = [...s.matchAll(/ id="([^"]+)"/g)].map(m => m[1]), refs = [...s.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
    if(!(ids.every(i => i.startsWith('u1-')) && refs.every(r => ids.includes(r)))){ ok(false, 'IDs/Verweise ' + st + '/' + p); }
  }
  ok(true, 'Markup: alle IDs mit Instanz-Präfix, alle Verweise aufgelöst (3 Stile × 5 Posen)');
  ok(!/Gradient/.test(A.svg(AV[0], { size: 'chip' })) && /viewBox="0 0 100 100"/.test(A.svg(AV[0], { size: 'chip' })), 'Chip: nur Kopf, ohne Verläufe');
  ok(/av-chip/.test(A.svg(AV[0])) && /av-chip/.test(A.svg(AV[0], { size: 28 })), 'alter Aufruf svg(av) liefert weiterhin den Kopf-Chip');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0b1016"><div id="h"></div><script>' + CORE + '</script>');
  // 40 Avatare auf einer Seite (wie die Beamer-Lobby): keine doppelten IDs, alle Verweise lösen auf
  const uniq = await page.evaluate(av => {
    const A = window.SPSQAvatar, h = document.getElementById('h');
    h.innerHTML = Array.from({ length: 40 }, (_, i) => '<span style="display:inline-block;width:64px;height:77px">' + A.svg(av[i % av.length], { size: 'card', anim: true, pose: A.POSES[i % 5] }) + '</span>').join('');
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id).filter(x => x !== 'h' && x !== 'spsq-av-css');
    const refs = [...document.querySelectorAll('[fill^="url"],[clip-path^="url"],[stroke^="url"]')].flatMap(e => ['fill', 'clip-path', 'stroke'].map(a => e.getAttribute(a)).filter(v => v && v.startsWith('url')).map(v => v.match(/#([^)]+)/)[1]));
    return { n: ids.length, u: new Set(ids).size, missing: refs.filter(r => !document.getElementById(r)).length, css: !!document.getElementById('spsq-av-css') };
  }, AV);
  ok(uniq.n >= 200 && uniq.n === uniq.u && !uniq.missing, '40 Avatare: ' + uniq.n + ' IDs, alle eindeutig, keine offenen Verweise');
  ok(uniq.css, 'Animations-CSS einmal eingefügt');
  // Bildrate mit 40 animierten Avataren
  const fps = await page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if(performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  ok(fps >= 50, '40 animierte Avatare: ' + fps.toFixed(1) + ' fps (≥ 50)');
  // reduzierte Bewegung → statisch
  await page.emulateMedia({ reducedMotion: 'reduce' });
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.av-anim .av-fig')).animationName === 'none'), 'prefers-reduced-motion: keine Animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Schnappschüsse der 8 Tiere (ohne Animation) gegen Referenzbilder
  await page.evaluate(av => { const A = window.SPSQAvatar; document.getElementById('h').innerHTML = av.map((x, i) => '<div class="snap" style="display:inline-block;width:200px;height:240px">' + A.svg(x, { size: 'card', uid: 's' + i + '-' }) + '</div>').join(''); }, AV);
  const els = await page.$$('.snap');
  for(let i = 0; i < AV.length; i++){
    const buf = await els[i].screenshot(), file = path.join(BASE, AV[i].animal + '.png');
    if(UPDATE || !fs.existsSync(file)){ fs.writeFileSync(file, buf); ok(true, AV[i].animal + ': Referenzbild geschrieben'); continue; }
    const diff = await page.evaluate(async ([a, b]) => {
      const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + src; });
      const [x, y] = await Promise.all([load(a), load(b)]);
      if(x.width !== y.width || x.height !== y.height) return 1;
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
      const p = px(x), q = px(y); let bad = 0;
      for(let k = 0; k < p.length; k += 4) if(Math.abs(p[k] - q[k]) + Math.abs(p[k + 1] - q[k + 1]) + Math.abs(p[k + 2] - q[k + 2]) > 60) bad++;
      return bad / (p.length / 4);
    }, [buf.toString('base64'), fs.readFileSync(file).toString('base64')]);
    ok(diff < 0.01, AV[i].animal + ': Schnappschuss stimmt (' + (diff * 100).toFixed(2) + ' % abweichend)');
  }
  ok(!errors.length, 'keine JS-Fehler ' + errors.join(' | '));
  await browser.close();
  console.log('Avatar-Schnappschüsse: ' + pass + ' bestanden, ' + fail + ' fehlgeschlagen');
  process.exit(fail ? 1 : 0);
})();
````

## C9a – Vorschauseite Stilmuster

Quelle: `dev/lab/avatar_stil.html` – ganze Datei; der Build bettet avatar_core.js ein

````html
<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Avatar-Stilmuster</title>
<style>
:root{ --bg:#0b1016; --panel:#121b25; --line:#24364a; --text:#e6edf3; --dim:#9fb0c0; --acc:#39ff14; }
*{ box-sizing:border-box; } body{ margin:0; background:var(--bg); color:var(--text); font:15px/1.45 system-ui, sans-serif; padding:16px; }
h1{ font-size:22px; margin:0 0 4px; } h2{ font-size:17px; margin:0 0 8px; } p{ color:var(--dim); margin:0 0 12px; max-width:860px; }
.cols{ display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px; }
.col{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px; }
.col.pick{ border-color:var(--acc); box-shadow:0 0 0 2px rgba(57,255,20,.25); } .col .tag{ font-size:12px; color:var(--acc); }
.pair{ display:flex; gap:8px; justify-content:center; } .pair svg{ width:140px; height:168px; }
.poses{ display:flex; flex-wrap:wrap; gap:4px; justify-content:center; margin-top:8px; } .poses figure{ margin:0; text-align:center; font-size:11px; color:var(--dim); } .poses svg{ width:64px; height:77px; display:block; }
.podium{ display:flex; align-items:flex-end; justify-content:center; gap:4px; margin-top:14px; }
.podium .st{ display:flex; flex-direction:column; align-items:center; } .podium svg{ width:86px; height:103px; }
.step{ width:88px; border-radius:6px 6px 0 0; display:flex; align-items:flex-start; justify-content:center; font:800 22px system-ui; color:#0b1016; padding-top:4px;
  background:linear-gradient(180deg, #ffe58a, #c99a14); box-shadow:inset -10px 0 0 rgba(0,0,0,.15), inset 0 6px 0 rgba(255,255,255,.35); }
.step.s2{ background:linear-gradient(180deg, #eef2f6, #9aa6b2); } .step.s3{ background:linear-gradient(180deg, #f2c29b, #a8642f); }
.lobby{ display:flex; flex-wrap:wrap; gap:2px; justify-content:center; margin-top:12px; background:#0d151e; border-radius:10px; padding:8px; }
.lobby span{ display:flex; flex-direction:column; align-items:center; font-size:11px; color:var(--dim); width:64px; } .lobby svg{ width:58px; height:70px; }
.chips{ display:flex; gap:6px; justify-content:center; margin-top:10px; } .chips svg{ width:28px; height:28px; }
</style></head><body>
<h1>Avatare 2.0 – Stilmuster (A0)</h1>
<p>Drei Varianten derselben Figuren, gezeichnet vom echten Renderer (<code>SPSQAvatar.svg(av, {size, pose, style})</code>). Fuchs und Bär mit Kappe, Brille und Kette, darunter die Posen, ein Podest und eine Lobby. <b>Gewählt (Empfehlung): (b) 2.5D weich schattiert</b> – Steven kann umstellen, dann wird nur der Standardwert <code>style</code> im Renderer geändert.</p>
<div class="cols" id="cols"></div>
<script src="../src/avatar_core.js"></script>
<script>
const A = window.SPSQAvatar;
const FUCHS = { animal:'fuchs', color:A.COLORS[1], equip:{ oberteil:'tshirt_zahnrad', kopf:'kappe_rot', brille:'brille_rund', kette:'kette_gold' } };
const BAER  = { animal:'baer', color:A.COLORS[4], equip:{ oberteil:'hemd_kariert', kopf:'kappe_blau', brille:'sonnenbrille', kette:'kette_silber' } };
const ALL = Object.keys(A.ANIMALS).map((k, i) => ({ animal:k, color:A.COLORS[i % A.COLORS.length], equip:{ oberteil:['tshirt_rot','hemd_weiss','tshirt_blau','tshirt_blitz','hemd_blau','tshirt_gruen','tshirt_grau','hemd_kariert'][i], kopf:['','muetze','kappe_schwarz','','bauhelm','','kappe_rot',''][i] || undefined, brille:['','','eckig','','','schutzbrille','','brille_rund'][i] ? ['','','brille_eckig','','','schutzbrille','','brille_rund'][i] : undefined } }));
const V = [['flat', '(a) flach, Kahoot-nah'], ['soft', '(b) 2.5D weich schattiert'], ['knete', '(c) Knete / Spielzeug']];
document.getElementById('cols').innerHTML = V.map(([st, name]) => '<div class="col' + (st === 'soft' ? ' pick' : '') + '"><h2>' + name + '</h2>' + (st === 'soft' ? '<div class="tag">gewählt</div>' : '')
  + '<div class="pair">' + A.svg(FUCHS, { size:'card', style:st, anim:true, pose:'wave' }) + A.svg(BAER, { size:'card', style:st, anim:true }) + '</div>'
  + '<div class="poses">' + A.POSES.map(p => '<figure>' + A.svg(FUCHS, { size:'card', style:st, pose:p }) + p + '</figure>').join('') + '</div>'
  + '<div class="podium">' + [[BAER, 2, 46], [FUCHS, 1, 70], [ALL[6], 3, 30]].map(([av, n, h]) => '<div class="st">' + A.svg(av, { size:n === 1 ? 'stage' : 'card', style:st, pose:n === 1 ? 'dance' : 'jubel', anim:true }) + '<div class="step s' + n + '" style="height:' + h + 'px">' + n + '</div></div>').join('') + '</div>'
  + '<div class="lobby">' + ALL.map(av => '<span>' + A.svg(av, { size:'card', style:st, anim:true }) + A.ANIMALS[av.animal].name + '</span>').join('') + '</div>'
  + '<div class="chips">' + ALL.map(av => A.svg(av, { size:28 })).join('') + '</div>'
  + '</div>').join('');
</script>
</body></html>
````

## C9b – Vorschauseite Garderobe / Katalog

Quelle: `dev/lab/garderobe.html` – ganze Datei

````html
<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Garderobe 2.0 Katalog</title>
<style>
:root{ --bg:#0b1016; --panel:#121b25; --line:#24364a; --text:#e6edf3; --dim:#9fb0c0; --acc:#39ff14; }
*{ box-sizing:border-box; } body{ margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui, sans-serif; padding:16px; }
h1{ font-size:22px; margin:0 0 4px; } h2{ font-size:17px; margin:22px 0 8px; } p{ color:var(--dim); max-width:900px; }
.grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; }
.card{ background:var(--panel); border:1px solid var(--rc); border-radius:12px; padding:8px; text-align:center; }
.card svg{ width:110px; height:132px; } .card b{ display:block; font-size:13px; } .card small{ color:var(--dim); display:block; font-size:11px; }
.rar{ font-size:10px; font-weight:700; text-transform:uppercase; color:var(--rc); letter-spacing:.05em; }
table{ border-collapse:collapse; width:100%; max-width:1100px; } th, td{ border-bottom:1px solid var(--line); padding:5px 8px; text-align:left; vertical-align:top; } td.n{ text-align:right; font-variant-numeric:tabular-nums; }
.wrap{ overflow-x:auto; } .chip{ display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--rc); margin-right:6px; }
</style></head><body>
<h1>Garderobe 2.0 – Katalog und Wirtschaft (A4)</h1>
<p>Alle Teile mit Seltenheit, Preis, Bedingung und Kollektion, gezeichnet vom echten Renderer im gewählten 2.5D-Stil (bewegte Teile animiert). Darunter die Wirtschafts-Rechnung: Coins je Quest (Obergrenze) gegen die Katalogsumme. Preise/Teile gibt Steven frei; geändert wird nur <code>ITEMS</code> in <code>dev/src/avatar_core.js</code>.</p>
<div id="econ"></div>
<div id="cards"></div>
<h2>Katalogtabelle</h2><div class="wrap" id="tbl"></div>
<script src="../src/avatar_core.js"></script>
<script>
const A = window.SPSQAvatar, META = /*@AVATAR_META*/null;
const base = { animal:'fuchs', color:A.COLORS[1], equip:{ oberteil:'tshirt_grau' } };
const ids = Object.keys(A.ITEMS);
const groups = [['Quest-Kollektionen', id => A.ITEMS[id].set], ['Challenge-Trophäen', id => A.ITEMS[id].unlock && Object.keys(A.ITEMS[id].unlock).some(k => ['challenges','podium','wins','sdWins','bugFixed','flawless'].includes(k)) && !A.ITEMS[id].set],
  ['Monats-Schaufenster', id => A.ITEMS[id].shop], ['Weitere', () => true]];
const used = new Set();
document.getElementById('cards').innerHTML = groups.map(([name, f]) => { const list = ids.filter(id => !used.has(id) && f(id)); list.forEach(id => used.add(id));
  return '<h2>' + name + ' (' + list.length + ')</h2><div class="grid">' + list.map(id => { const it = A.ITEMS[id], rc = A.RARITY[it.rarity].color;
    const pic = it.slot === 'titel' ? '<div style="height:132px;display:flex;align-items:center;justify-content:center"><span class="av-title' + (it.glanz ? ' glanz' : '') + '" style="color:' + rc + '">' + it.name + '</span></div>'
      : A.svg(Object.assign({}, base, { equip: Object.assign({}, base.equip, { [it.slot]: id }) }), { size:'card', anim:true, pose: it.slot === 'siegerpose' ? 'dance' : 'idle' });
    return '<div class="card" style="--rc:' + rc + '"><span class="rar">' + A.RARITY[it.rarity].name + '</span>' + pic + '<b>' + it.name + '</b><small>' + A.SLOTS[it.slot] + ' · ' + (it.earnOnly ? 'nur verdienbar' : it.price + ' Coins') + '</small><small>' + (A.unlockText(id) || 'ohne Bedingung') + '</small></div>'; }).join('') + '</div>'; }).join('');
A.ensureCSS();
document.getElementById('tbl').innerHTML = '<table><thead><tr><th>Teil</th><th>Platz</th><th>Seltenheit</th><th class="n">Preis</th><th>Bedingung</th><th>Kollektion</th><th>bewegt</th><th>Varianten</th></tr></thead><tbody>'
  + ids.map(id => { const it = A.ITEMS[id], rc = A.RARITY[it.rarity].color; return '<tr style="--rc:' + rc + '"><td>' + it.name + '</td><td>' + A.SLOTS[it.slot] + '</td><td><span class="chip"></span>' + A.RARITY[it.rarity].name + '</td><td class="n">' + (it.earnOnly ? '–' : it.price) + '</td><td>' + (A.unlockText(id) || '–') + (it.shop ? ' · Schaufenster' : '') + '</td><td>' + (it.set ? A.SETS[it.set].name : '') + '</td><td>' + (it.anim ? 'ja' : '') + '</td><td>' + (it.alt ? it.alt.length + ' × ' + A.item(id + '~1').price : '') + '</td></tr>'; }).join('') + '</tbody></table>';
const E = A.economy(META || {});
const Q = { scl:'SCL Quest', kop:'KOP Quest', fup:'FUP Quest', awl:'AWL Quest', sensor:'Sensorwerkstatt' };
document.getElementById('econ').innerHTML = '<h2>Wirtschaft</h2><table style="max-width:640px"><tbody>'
  + Object.keys(E.perQuest).map(q => '<tr><td>' + (Q[q] || q) + ' – alles mit 3★, Bosse, Final Boss, Theorie</td><td class="n">' + E.perQuest[q].toLocaleString('de-CH') + '</td></tr>').join('')
  + '<tr><td><b>Alle Bereiche zusammen</b></td><td class="n"><b>' + Object.values(E.perQuest).reduce((a, b) => a + b, 0).toLocaleString('de-CH') + '</b></td></tr>'
  + Object.keys(A.RARITY).map(r => '<tr style="--rc:' + A.RARITY[r].color + '"><td><span class="chip"></span>Katalog ' + A.RARITY[r].name + '</td><td class="n">' + (E.byRarity[r] || 0).toLocaleString('de-CH') + '</td></tr>').join('')
  + '<tr><td><b>Katalog gesamt</b> (ohne Varianten und Schaufenster; Ziel ≈ 60 000–80 000)</td><td class="n"><b>' + E.total.toLocaleString('de-CH') + '</b></td></tr>'
  + '<tr><td>Farbvarianten zusätzlich (+30 % je Variante)</td><td class="n">' + (E.byRarity.varianten || 0).toLocaleString('de-CH') + '</td></tr>'
  + '<tr><td>Live-Challenges (Platz 1/2/3, gelöst, Sudden Death, Teilnahme) und Zertifikate (+300/+500) kommen dazu</td><td></td></tr></tbody></table>';
</script>
</body></html>
````


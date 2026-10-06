# Avatare, Coins und Shop in Digital Quest – Etappe A0: Abbildung und Vorschlag (05.10.2026)

> **Umgesetzt 05.10.2026 (A1–A4, Branch `wip/avatare`)** nach Stevens Antworten: alle Vorschläge dieses Plans so übernommen (fünf Kollektionen, Regeln ×3, Umdeutungen, Titel, `SPSQAvatar`, Menü für alle Rollen). Abweichungen vom Plan: Legendär-Teile der Teile I–III hängen am Kapitel-Boss 10.10 (`bosses: 1`), die von Teil IV am Final Boss 15.10 (`final: 1`); beide prüft der Server am gespeicherten Entwurf (`drafts`) mit `Engine.runTask` – auch für günstige Teile (Goldkette, Bauhelm). `bosses` zählt beide Boss-Aufgaben (10.10 und 15.10), der Final-Zuschlag bleibt nur für 15.10. Stand und Tests: `docs/STAND.md`, Abschnitt «Paket A».

Grundlage: `docs/AVATAR_SYSTEM_TRANSFER.md` (SPS Quest, Stand cd685be) und `docs/AUFTRAG_OSZI_LABOR_AVATARE_2026-10-05.md`, Abschnitt 5. Geprüft am Code von Digital Quest (41134b6). **Kein Code vor Stevens Antworten zu Abschnitt 6 des Auftrags** – unten stehen die Vorschläge, auf die sich die Fragen beziehen.

## 1. Tabelle 5.4 am Code nachgeprüft und ergänzt

| Stelle im Transferpaket | Stand in Digital Quest (geprüft) | Vorschlag |
|---|---|---|
| Zielpfade | wie SPS Quest (dev/src, worker, dev/portal, dev/tests) | `dev/src/avatar_core.js`, `worker/avatar.js`, `dev/portal/portal_avatar.js`, `dev/test_avatar.js`, `dev/tests/avatar.js`, `dev/tests/avatar_snap.js`, `dev/lab/` (Vorschauseiten) |
| `./lib.js` (`json`, `fail`, `now`, `cleanText`) | alle vier vorhanden | unverändert |
| `./gen/exam_bundle.js` (`Exam`, `FINAL_TASKS`) | exportiert `Exam` und `QUEST_TASKS` (alle Aufgaben mit Tests) plus die Engine; `Exam.checkGameTask` gibt es nicht | **`verifiedFinals` serverseitig über `E.runTask(QUEST_TASKS['15.10'], draft.layout, draft.answers)`** auf dem synchronisierten Entwurf (`progress.state.drafts`) – der Server bestätigt den Final Boss selbst, Final-Teile bleiben serverbestätigt |
| `./challenge.js` (`rank`) | exportiert `challengeRoutes`, `livePoints` | `rank()` aus Anhang C7c übernehmen (arbeitet auf `points`, `solved_at`, beides vorhanden) |
| Sudden Death (`end_rule`, `winner_id`), mehrere Aufgaben (`solved_n`) | Spalten fehlen; `challenge_players` hat `attempts`, `hints`, `solved_at`, `points` | `challengeStats` ohne diese Spalten: `wins` = Platz 1 nach `rank()`, `flawless` = `solved_at` ohne `attempts`/`hints`, `bugFixed` = gelöste Challenges mit `mode = 'bug'`, `sdWins` = 0; Teile mit `sdWins` ausblenden (Abschnitt 3) |
| Tabelle `certificates` (`quest`, `level`, `revoked_at`) | vorhanden, gleiche Spalten; nur `dq` × `grund`/`profi` | `certsOf` unverändert; höchstens 2 Zertifikate |
| Fortschritt `doneTasks` / `doneTheory` | `progress.state` mit `done`, `doneInfo {stars, tries, hints, solution, revealed}`, `theory` | `progressOf()` im Worker rechnet um: `doneTasks[id] = { stars, revealed: !!(doneInfo.solution || doneInfo.revealed) }`, `doneTheory[id] = true` für bestandene Theorien; aufgeteilt nach Kollektion (Abschnitt 2) |
| Kollektionen `scl`, `kop`, `fup`, `awl`, `sensor` | ein Bereich `dq` mit Teilen I–V (DQ.parts) und Übungswerkstatt | je Teil eine Kollektion (Abschnitt 2); `questSolved` zählt dann je Teil wie bisher je Quest |
| `profiCerts: 4`, `finals3`, `sensorAll`, `sensorClean` | nicht erreichbar | umdeuten (Abschnitt 3) |
| `RULES` | 168 Aufgaben, 33 Theorien, 2 Bosse | Abschnitt 4 (Wirtschafts-Rechnung) |
| `window.SPSQ` | `window.DQP` mit `api`, `esc`, `toast`, `confirmDlg`, `routes`, `user`; `openTerminal` intern, `setUserAvatar` fehlt | `DQP.openTerminal` exportieren, `DQP.setUserAvatar(av)` ergänzen (schreibt in den Konto-Chip), Garderobe auf `DQP` umstellen |
| Migration | `worker/db.js` endet bei 6 | Migration 7: `avatars`, `coin_ledger`, Index `coin_ledger(user_id, source, ref)` UNIQUE; Konto löschen (`DELETE /api/me`) löscht beide |
| CSS-Variablen `--scl`, `--line2`, `--dim`, `--mono` | `portal.css`: `--term` (Bernstein), `--line`, `--dim`, `--mono` | `--scl` → `--term`, `--line2` → `--line`, übrige gleichnamig |
| Texte, Titel | SPS-Thema | Abschnitt 5 |
| Variante ohne Server | Einzeldatei ohne Konto | nicht bauen – Avatare und Coins nur mit Konto im Portal; die Einzeldatei zeigt keinen Avatar |
| Build | `build.js` erzeugt `worker/gen/exam_bundle.js` | zusätzlich `worker/gen/avatar_bundle.js` (Kern + `AVATAR_META` aus `DQ.parts`/`DQ.tasks`: Boss-/Final-Kennzeichnung, Aufgaben- und Theoriezahl je Kollektion) |
| Portal-Menü | `renderTop()` mit Rollen | Menüpunkt «Avatar & Coins» für angemeldete Konten (auch Dozenten), Route `#/avatar` |

## 2. Kollektionen (Vorschlag: je Teil der Karte eine)

| Schlüssel | Name | Kapitel | Aufgaben | Theorien | `questSolved`-Stufen (⅙ / ⅓ / ½ wie 25/50/75 von 150) |
|---|---|---|---|---|---|
| `elektro` | Elektrotechnik (Teil I) | 1–4 | 40 | 8 | 7 / 13 / 20 |
| `digital` | Digitaltechnik (Teil II) | 5–8 | 40 | 8 | 7 / 13 / 20 |
| `kombi` | Kombinatorik und Anzeigen (Teil III) | 9–10 | 20 | 4 | 4 / 7 / 10 |
| `praxis` | Zeitverhalten und Praxis (Teil IV) | 11–15 | 50 | 10 | 9 / 17 / 25 |
| `messen` | Messtechnik (Teil V + Übungswerkstatt) | 16, W | 18 | 3 | 3 / 6 / 9 |

Bosse: 10.10 = Kapitel-Boss (`boss`, +40), 15.10 = Final Boss (`final`, +100, serverbestätigt). Kapitel 16 und Werkstatt geben Coins (Kollektion `messen`), zählen aber weiterhin nicht zu Abzeichen und Zertifikat.

## 3. Nicht erreichbare Bedingungen umdeuten

| SPS Quest | Digital Quest |
|---|---|
| `profiCerts: 1` (Meister-Helm) | Profi-Zertifikat bestehen (`cert: {quest:'dq', level:'profi'}`) |
| `profiCerts: 4` (Krone, `earnOnly`) | **beide Zertifikate und beide Bosse** (`certs: 2` + `bosses: 2`) – «Digital-Quest-Meisterkrone» |
| `finals3: 3` (Polyglott-Umhang) | **alle fünf Kollektionen vollständig gelöst** (neue Bedingung `setsAll: 5`) |
| `questFinal: {fup}` usw. | `final: 1` (15.10) bzw. `bosses: 1` (10.10) |
| `sensorAll`, `sensorClean` | `messenAll` = alle 18 Aufgaben (seit 06.10.2026 19, mit 16.9) und 3 Theorien der Kollektion `messen`; `messenClean` = alle 18 ohne Aufdecken/Lösung |
| `sdWins` (Blitz-Aura, Schnellster Finger) | ausblenden (`hidden: true`), bis Sudden Death gebaut ist (eigener Auftrag) |
| `podium`, `wins`, `challenges`, `flawless`, `bugFixed` | erreichbar (Sprint, Störungsjagd) – unverändert |

## 4. Coin-Regeln und Wirtschafts-Rechnung

Katalog ohne Varianten ≈ 80 700 Coins (`economy()`). Verdienbar bei vollständigem Durchlauf:

| Posten | Regeln 1:1 aus SPS Quest | Vorschlag ×3 |
|---|---|---|
| 168 Aufgaben mit 3★ (20 / 60) | 3 360 | 10 080 |
| Boss 10.10 (+40 / +120), Final 15.10 (+100 / +300) | 140 | 420 |
| 33 Theorien (10 / 30) | 330 | 990 |
| 2 Zertifikate mit Auszeichnung (500 / 1 500) | 1 000 | 3 000 |
| **Summe ohne Challenges** | **4 830** | **14 490** |
| je Live-Challenge (Platz 1 + gelöst + Teilnahme) | 75 | 75 (unverändert) |

Vergleich SPS Quest: fünf Kurse × ≈ 3 500 + vier Profi-Zertifikate ≈ 20 000 Coins → Katalog/verdienbar ≈ 4. Digital Quest mit Regeln 1:1 ≈ 17 (ein ganzer Durchlauf = ein Legendär-Teil, die Faustregel gilt dann für das ganze Produkt, nicht je Kollektion). **Empfehlung: Aufgaben-, Boss-, Theorie- und Zertifikats-Coins verdreifachen** (Challenge-Prämien unverändert, weil sie je Challenge anfallen): Verhältnis ≈ 5,6, jede Kollektion ≈ ein Legendär-Teil, die Preisbänder des Katalogs bleiben unverändert (so bleiben Server-Regel und Tests aus dem Paket gültig).

## 5. Titel und Texte (Vorschlag, echte Umlaute)

Kollektions-Titel: Elektrotechnik «Ohm-Flüsterer», Digitaltechnik «Bit-Bändiger», Kombinatorik «Logik-Baumeister», Praxis «Takt-Meister», Messtechnik «Messprofi». Sockel-Boni: «Leiterplatten-Sockel», «Bit-Raster», «Segment-Kranz», «Oszillogramm», «Messspitzen-Ring». Krone: «Digital-Quest-Meisterkrone». `UNLOCK_TEXT` wörtlich übersetzt («Final Boss 15.10 lösen», «Beide Zertifikate bestehen», «Alle Messtechnik-Aufgaben ohne Lösung lösen» …).

## 6. Antworten, die A1 braucht (Abschnitt 6 des Auftrags)

1. Kollektionen je Teil I–V (Abschnitt 2) – ja/nein?
2. Umdeutungen aus Abschnitt 3 – so, oder einzelne Teile lieber weglassen?
3. Coin-Regeln: 1:1 oder ×3 (Abschnitt 4)?
4. Titel/Texte aus Abschnitt 5 – passt die Tonlage?
5. Globaler Name `SPSQAvatar` beibehalten (Empfehlung ja) – bestätigen.
6. Menüpunkt «Avatar & Coins» auch für Dozenten und Admin (Empfehlung ja, sie sehen am Beamer sonst keinen eigenen Avatar)?

## 7. Etappen nach der Antwort (unverändert aus dem Auftrag)
A1 Kern und Worker (Migration 7, `test_avatar.js` grün) · A2 Garderobe im Portal · A3 Anzeige (Konto-Chip, Leitstand, Live-Challenge, Endbildschirm, Prämien) · A4 Abnahme-Checkliste aus Teil B, Abschnitt 8. Dazu Datenschutz-Seite, Handbuch, Anleitung, CLAUDE.md, STAND.md.

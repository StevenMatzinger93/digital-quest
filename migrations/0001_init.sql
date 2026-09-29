-- Digital Quest – D1-Schema: Konten, Klassen, Zuweisungen, Fortschritt (siehe docs/PLAN_KLASSEN_ZUWEISUNG.md)
-- Anwenden: npx wrangler d1 migrations apply digitalquest --remote   (lokal: --local)
-- Nur Pseudonyme: echte Namen (Zertifikat) bleiben im localStorage des Geraets und werden nie hochgeladen.
-- Admin hat keinen Eintrag: Zugang ueber die Worker-Secrets ADMIN_USER / ADMIN_PASSWORD.

CREATE TABLE dozenten (
  id         TEXT PRIMARY KEY,              -- UUID
  benutzer   TEXT NOT NULL UNIQUE,          -- Kleinbuchstaben, eindeutig ueber dozenten UND schueler (im Worker geprueft)
  pw         TEXT NOT NULL,                 -- pbkdf2$<iterationen>$<salz b64>$<hash b64>
  pseudonym  TEXT NOT NULL,
  erstellt   INTEGER NOT NULL               -- ms seit 1970
);

CREATE TABLE klassen (
  id         TEXT PRIMARY KEY,
  dozent_id  TEXT NOT NULL REFERENCES dozenten(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,          -- Klassencode fuer die Selbstregistrierung
  erstellt   INTEGER NOT NULL
);
CREATE INDEX klassen_dozent ON klassen(dozent_id);

CREATE TABLE schueler (
  id         TEXT PRIMARY KEY,
  benutzer   TEXT NOT NULL UNIQUE,
  pw         TEXT NOT NULL,
  pseudonym  TEXT NOT NULL,
  klasse_id  TEXT NOT NULL REFERENCES klassen(id) ON DELETE CASCADE,
  erstellt   INTEGER NOT NULL,
  zuletzt    INTEGER                        -- letzte Synchronisierung
);
CREATE INDEX schueler_klasse ON schueler(klasse_id);

-- Zuweisung: ein Ziel (Kapitel oder Aufgabe/Theorie) an eine Klasse ODER eine einzelne Person, optional mit Frist
CREATE TABLE zuweisungen (
  id          TEXT PRIMARY KEY,
  dozent_id   TEXT NOT NULL REFERENCES dozenten(id) ON DELETE CASCADE,
  ziel_typ    TEXT NOT NULL CHECK (ziel_typ IN ('kapitel', 'aufgabe')),
  ziel_id     TEXT NOT NULL,                -- '12' / 'W' (Uebungswerkstatt) bzw. '12.5' / 'T12A' / 'W3'
  klasse_id   TEXT REFERENCES klassen(id) ON DELETE CASCADE,
  schueler_id TEXT REFERENCES schueler(id) ON DELETE CASCADE,
  faellig_am  TEXT,                         -- 'YYYY-MM-DD' oder NULL
  erstellt    INTEGER NOT NULL,
  CHECK ((klasse_id IS NULL) <> (schueler_id IS NULL))
);
CREATE INDEX zuweisungen_klasse ON zuweisungen(klasse_id);
CREATE INDEX zuweisungen_schueler ON zuweisungen(schueler_id);
CREATE INDEX zuweisungen_dozent ON zuweisungen(dozent_id);

-- Spiegel des lokalen Fortschritts (done) und der Lernereignisse (events)
CREATE TABLE fortschritt (
  schueler_id TEXT NOT NULL REFERENCES schueler(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  erledigt    INTEGER NOT NULL,             -- Zeitpunkt (ms), frueheste Meldung gewinnt
  PRIMARY KEY (schueler_id, item_id)
);
CREATE TABLE ereignisse (
  schueler_id TEXT NOT NULL REFERENCES schueler(id) ON DELETE CASCADE,
  t           INTEGER NOT NULL,
  typ         TEXT NOT NULL,
  item_id     TEXT NOT NULL DEFAULT '',
  daten       TEXT,                         -- restliche Felder als JSON (Versuche, Tipps, Dauer, Tags …)
  PRIMARY KEY (schueler_id, t, typ, item_id)
);

CREATE TABLE sitzungen (
  token_hash TEXT PRIMARY KEY,              -- SHA-256 des Tokens; das Token selbst liegt nur beim Client
  rolle      TEXT NOT NULL CHECK (rolle IN ('admin', 'dozent', 'schueler')),
  konto_id   TEXT NOT NULL,
  ablauf     INTEGER NOT NULL
);
CREATE INDEX sitzungen_konto ON sitzungen(konto_id);

-- Rate-Limiting fuer Anmeldung und Klassencode (Schluessel 'u:<benutzer>', 'ip:<adresse>', 'code:<adresse>')
CREATE TABLE sperren (
  schluessel TEXT PRIMARY KEY,
  fehler     INTEGER NOT NULL,
  seit       INTEGER NOT NULL,
  gesperrt_bis INTEGER NOT NULL DEFAULT 0
);

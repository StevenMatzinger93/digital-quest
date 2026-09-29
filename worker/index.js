/* Digital Quest – Cloudflare Worker: Konten, Klassen, Zuweisungen, Fortschritt-Spiegel (Plan: docs/PLAN_KLASSEN_ZUWEISUNG.md)
 *
 * Statische Dateien (web/) liefert Cloudflare direkt aus; der Worker beantwortet nur /api/…
 * Rollen: admin (Worker-Secrets ADMIN_USER / ADMIN_PASSWORD, kein D1-Eintrag) · dozent (vom Admin angelegt)
 *         · schueler (vom Dozenten angelegt oder Selbstregistrierung mit Klassencode). Nur Pseudonyme.
 * Anmeldung: Benutzername + Passwort, PBKDF2-SHA-256 (WebCrypto), Sitzungs-Token im Header "Authorization: Bearer …"
 *            (kein Cookie → funktioniert auch aus der Offline-Datei index.html). Rate-Limiting bei Fehlversuchen.
 * Das Spiel bleibt ohne Konto voll spielbar – der Server ist eine Ergaenzung, localStorage bleibt die Basis. */

export const PBKDF2_ITER = 100000;              // Hoechstwert, den Cloudflare Workers fuer PBKDF2 erlauben
const SESSION_MS = 30 * 24 * 3600 * 1000;       // Sitzung 30 Tage
const LIMIT = { fehler: 5, fenster: 15 * 60 * 1000, sperre: 15 * 60 * 1000 };
const RE_USER = /^[a-z0-9._-]{3,32}$/;
const RE_ITEM = /^[A-Za-z0-9.]{1,12}$/;

/* ---------- Hilfen ---------- */
const enc = new TextEncoder();
function b64(buf) { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); }
function unb64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function b64url(buf) { return b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function rnd(n) { return crypto.getRandomValues(new Uint8Array(n)); }
function uuid() { return crypto.randomUUID(); }
async function sha256(s) { return b64(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
function sameBytes(a, b) { // Vergleich in konstanter Zeit
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0;
}
function sameText(a, b) { return sameBytes(enc.encode(String(a)), enc.encode(String(b))); }

export async function hashPassword(pw, iter = PBKDF2_ITER, salt = rnd(16)) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return 'pbkdf2$' + iter + '$' + b64(salt) + '$' + b64(bits);
}
export async function verifyPassword(pw, stored) {
  const p = String(stored || '').split('$');
  if (p.length !== 4 || p[0] !== 'pbkdf2') return false;
  const again = (await hashPassword(pw, +p[1], unb64(p[2]))).split('$')[3];
  return sameBytes(unb64(again), unb64(p[3]));
}

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const fail = (status, msg, extra) => { throw new HttpError(status, msg, extra); };

const CORS = {
  'Access-Control-Allow-Origin': '*', // Token statt Cookie: die Offline-Datei (file://) darf die API ebenfalls nutzen
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS) });
}
async function body(req) {
  if (req.method === 'GET' || req.method === 'DELETE') return {};
  try { const b = await req.json(); return b && typeof b === 'object' ? b : {}; } catch (e) { fail(400, 'Ungueltige Anfrage (kein JSON).'); }
}
function userName(v) { const u = String(v || '').trim().toLowerCase(); if (!RE_USER.test(u)) fail(400, 'Benutzername: 3–32 Zeichen, nur Buchstaben a–z, Ziffern und . _ -'); return u; }
function password(v) { const p = String(v || ''); if (p.length < 6 || p.length > 128) fail(400, 'Passwort: mindestens 6 Zeichen.'); return p; }
function pseudonym(v, fallback) { const s = String(v || fallback || '').trim().replace(/\s+/g, ' '); if (!s || s.length > 40) fail(400, 'Pseudonym: 1–40 Zeichen.'); return s; }
function ip(req) { return req.headers.get('CF-Connecting-IP') || 'lokal'; }

/* ---------- Rate-Limiting ---------- */
async function checkLock(db, keys, now) {
  for (const k of keys) {
    const r = await db.prepare('SELECT gesperrt_bis FROM sperren WHERE schluessel = ?').bind(k).first();
    if (r && r.gesperrt_bis > now) fail(429, 'Zu viele Fehlversuche. Bitte in ' + Math.ceil((r.gesperrt_bis - now) / 60000) + ' Minuten erneut versuchen.', { wartenSek: Math.ceil((r.gesperrt_bis - now) / 1000) });
  }
}
async function noteFailure(db, keys, now) {
  for (const k of keys) {
    const r = await db.prepare('SELECT fehler, seit FROM sperren WHERE schluessel = ?').bind(k).first();
    const fresh = !r || now - r.seit > LIMIT.fenster, n = fresh ? 1 : r.fehler + 1;
    await db.prepare('INSERT INTO sperren (schluessel, fehler, seit, gesperrt_bis) VALUES (?, ?, ?, ?) ON CONFLICT(schluessel) DO UPDATE SET fehler = excluded.fehler, seit = excluded.seit, gesperrt_bis = excluded.gesperrt_bis')
      .bind(k, n, fresh ? now : r.seit, n >= LIMIT.fehler ? now + LIMIT.sperre : 0).run();
  }
}
async function clearFailures(db, keys) { for (const k of keys) await db.prepare('DELETE FROM sperren WHERE schluessel = ?').bind(k).run(); }

/* ---------- Sitzungen ---------- */
async function newSession(db, rolle, kontoId, now) {
  const token = b64url(rnd(32));
  await db.prepare('INSERT INTO sitzungen (token_hash, rolle, konto_id, ablauf) VALUES (?, ?, ?, ?)').bind(await sha256(token), rolle, kontoId, now + SESSION_MS).run();
  await db.prepare('DELETE FROM sitzungen WHERE ablauf < ?').bind(now).run(); // Aufraeumen
  return token;
}
async function session(req, db, now) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get('Authorization') || '');
  if (!m) return null;
  const s = await db.prepare('SELECT rolle, konto_id, ablauf FROM sitzungen WHERE token_hash = ?').bind(await sha256(m[1])).first();
  if (!s || s.ablauf < now) return null;
  return { rolle: s.rolle, id: s.konto_id, tokenHash: await sha256(m[1]) };
}
function need(s, ...rollen) { if (!s) fail(401, 'Bitte anmelden.'); if (!rollen.includes(s.rolle)) fail(403, 'Keine Berechtigung.'); return s; }
async function userTaken(db, u) {
  return !!(await db.prepare('SELECT 1 AS x FROM dozenten WHERE benutzer = ?').bind(u).first()) ||
    !!(await db.prepare('SELECT 1 AS x FROM schueler WHERE benutzer = ?').bind(u).first());
}
async function konto(db, s) {
  if (s.rolle === 'admin') return { rolle: 'admin', id: 'admin', benutzer: 'admin', pseudonym: 'Admin' };
  if (s.rolle === 'dozent') {
    const d = await db.prepare('SELECT id, benutzer, pseudonym FROM dozenten WHERE id = ?').bind(s.id).first();
    return d && Object.assign({ rolle: 'dozent' }, d);
  }
  const k = await db.prepare('SELECT s.id, s.benutzer, s.pseudonym, s.klasse_id, k.name AS klasse FROM schueler s JOIN klassen k ON k.id = s.klasse_id WHERE s.id = ?').bind(s.id).first();
  return k && Object.assign({ rolle: 'schueler' }, k);
}

/* ---------- Endpunkte ---------- */
const routes = [];
const on = (method, path, fn) => routes.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

on('GET', '/api/status', async ({ env }) => ({ ok: true, api: 1, konten: !!env.DB }));

on('POST', '/api/login', async ({ req, env, db, now }) => {
  const b = await body(req), u = String(b.benutzer || '').trim().toLowerCase(), pw = String(b.passwort || '');
  if (!u || !pw) fail(400, 'Benutzername und Passwort eingeben.');
  const keys = ['u:' + u, 'ip:' + ip(req)];
  await checkLock(db, keys, now);
  let rolle = null, id = null;
  if (env.ADMIN_USER && env.ADMIN_PASSWORD && sameText(u, String(env.ADMIN_USER).toLowerCase())) {
    if (sameText(pw, env.ADMIN_PASSWORD)) { rolle = 'admin'; id = 'admin'; }
  } else {
    const d = await db.prepare('SELECT id, pw FROM dozenten WHERE benutzer = ?').bind(u).first();
    const s = d ? null : await db.prepare('SELECT id, pw FROM schueler WHERE benutzer = ?').bind(u).first();
    const k = d || s;
    if (k && await verifyPassword(pw, k.pw)) { rolle = d ? 'dozent' : 'schueler'; id = k.id; }
    else if (!k) await hashPassword(pw); // gleiche Rechenzeit, ob es den Namen gibt oder nicht
  }
  if (!rolle) { await noteFailure(db, keys, now); fail(401, 'Benutzername oder Passwort falsch.'); }
  await clearFailures(db, ['u:' + u]);
  const token = await newSession(db, rolle, id, now);
  return { token, konto: await konto(db, { rolle, id }) };
});

on('POST', '/api/logout', async ({ s, db }) => { if (s) await db.prepare('DELETE FROM sitzungen WHERE token_hash = ?').bind(s.tokenHash).run(); return { ok: true }; });

on('GET', '/api/me', async ({ s, db }) => {
  need(s, 'admin', 'dozent', 'schueler');
  const k = await konto(db, s); if (!k) fail(401, 'Konto gibt es nicht mehr.');
  return { konto: k };
});

/* Admin: Dozenten verwalten */
on('GET', '/api/admin/dozenten', async ({ s, db }) => {
  need(s, 'admin');
  const r = await db.prepare('SELECT d.id, d.benutzer, d.pseudonym, d.erstellt, (SELECT COUNT(*) FROM klassen k WHERE k.dozent_id = d.id) AS klassen, ' +
    '(SELECT COUNT(*) FROM schueler x JOIN klassen k ON k.id = x.klasse_id WHERE k.dozent_id = d.id) AS schueler FROM dozenten d ORDER BY d.benutzer').all();
  return { dozenten: r.results };
});
on('POST', '/api/admin/dozenten', async ({ s, req, db, now }) => {
  need(s, 'admin');
  const b = await body(req), u = userName(b.benutzer), pw = password(b.passwort), ps = pseudonym(b.pseudonym, u);
  if (await userTaken(db, u)) fail(409, 'Benutzername ist schon vergeben.');
  const id = uuid();
  await db.prepare('INSERT INTO dozenten (id, benutzer, pw, pseudonym, erstellt) VALUES (?, ?, ?, ?, ?)').bind(id, u, await hashPassword(pw), ps, now).run();
  return { dozent: { id, benutzer: u, pseudonym: ps, erstellt: now } };
});
on('POST', '/api/admin/dozenten/:id/passwort', async ({ s, req, db, p }) => {
  need(s, 'admin');
  const pw = password((await body(req)).passwort);
  const r = await db.prepare('UPDATE dozenten SET pw = ? WHERE id = ?').bind(await hashPassword(pw), p.id).run();
  if (!r.meta.changes) fail(404, 'Dozent nicht gefunden.');
  await db.prepare('DELETE FROM sitzungen WHERE konto_id = ?').bind(p.id).run();
  return { ok: true };
});
on('DELETE', '/api/admin/dozenten/:id', async ({ s, db, p }) => {
  need(s, 'admin');
  const r = await db.prepare('DELETE FROM dozenten WHERE id = ?').bind(p.id).run(); // Klassen, Schueler, Zuweisungen fallen mit (ON DELETE CASCADE)
  if (!r.meta.changes) fail(404, 'Dozent nicht gefunden.');
  return { ok: true };
});

/* ---------- Einstieg ---------- */
export async function handle(req, env) {
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Nicht gefunden', { status: 404 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    const route = routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!route) fail(404, 'Unbekannter Endpunkt.');
    if (!env.DB && url.pathname !== '/api/status') fail(503, 'Konten sind auf diesem Server noch nicht eingerichtet.');
    const now = Date.now(), db = env.DB, s = db ? await session(req, db, now) : null;
    const p = route.re.exec(url.pathname).groups || {};
    return json(await route.fn({ req, env, db, now, s, p, url }));
  } catch (e) {
    if (e instanceof HttpError) return json(Object.assign({ fehler: e.message }, e.extra || {}), e.status);
    console.error(e);
    return json({ fehler: 'Interner Fehler.' }, 500);
  }
}
export default { fetch: (req, env) => handle(req, env) };
export const _intern = { on, fail, need, body, userName, password, pseudonym, userTaken, konto, uuid, rnd, checkLock, noteFailure, clearFailures, ip, RE_ITEM };

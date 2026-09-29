// Tests fuer den Worker (worker/index.js) gegen einen D1-Nachbau (node:sqlite): node test_api.js
const path = require('path'), { pathToFileURL } = require('url');
const { d1 } = require('./tests/d1mock.js');
let pass = 0, failN = 0;
const ok = (c, name, info) => { if (c) pass++; else { failN++; console.log('FEHLER', name, info !== undefined ? JSON.stringify(info) : ''); } };

(async () => {
  const W = await import(pathToFileURL(path.join(__dirname, '../worker/index.js')));
  const env = { DB: d1(), ADMIN_USER: 'admin', ADMIN_PASSWORD: 'geheim-admin' };
  const call = async (method, p, data, token, ip) => {
    const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip || '10.0.0.1' };
    if (token) h.Authorization = 'Bearer ' + token;
    const r = await W.handle(new Request('https://dq.test' + p, { method, headers: h, body: data ? JSON.stringify(data) : undefined }), env);
    return { status: r.status, body: await r.json().catch(() => null), headers: r.headers };
  };
  const login = async (u, pw, ip) => (await call('POST', '/api/login', { benutzer: u, passwort: pw }, null, ip)).body;
  let r;

  /* ===== Phase 1: Anmeldung, Admin, Dozenten ===== */
  const h = await W.hashPassword('abc123');
  ok(/^pbkdf2\$100000\$/.test(h) && await W.verifyPassword('abc123', h) && !await W.verifyPassword('abc124', h), 'PBKDF2: Hash und Pruefung');
  ok(h !== await W.hashPassword('abc123'), 'PBKDF2: Salz macht jeden Hash einzigartig');

  r = await call('GET', '/api/status'); ok(r.status === 200 && r.body.konten === true, 'Status');
  ok(r.headers.get('Access-Control-Allow-Origin') === '*', 'CORS-Header');
  r = await W.handle(new Request('https://dq.test/api/login', { method: 'OPTIONS' }), env); ok(r.status === 204, 'Preflight OPTIONS');
  r = await W.handle(new Request('https://dq.test/api/me'), {}); ok(r.status === 503, 'Ohne D1: 503 statt Absturz');
  r = await W.handle(new Request('https://dq.test/index.html'), { ASSETS: { fetch: () => new Response('seite') } }); ok(await r.text() === 'seite', 'Nicht-API geht an die statischen Dateien');

  const adm = await login('admin', 'geheim-admin'); ok(adm && adm.token && adm.konto.rolle === 'admin', 'Admin meldet sich mit den Secrets an', adm);
  r = await call('POST', '/api/login', { benutzer: 'admin', passwort: 'falsch' }, null, '10.0.0.2'); ok(r.status === 401, 'Admin mit falschem Passwort abgewiesen');
  r = await call('GET', '/api/me', null, adm.token); ok(r.status === 200 && r.body.konto.rolle === 'admin', '/api/me als Admin');
  r = await call('GET', '/api/me'); ok(r.status === 401, '/api/me ohne Token: 401');

  r = await call('POST', '/api/admin/dozenten', { benutzer: 'Frau.Keller', passwort: 'lehrer1', pseudonym: 'Frau K.' }, adm.token);
  ok(r.status === 200 && r.body.dozent.benutzer === 'frau.keller', 'Admin legt Dozent an (Name klein)', r.body);
  const dozId = r.body.dozent.id;
  r = await call('POST', '/api/admin/dozenten', { benutzer: 'frau.keller', passwort: 'xyz123' }, adm.token); ok(r.status === 409, 'Doppelter Benutzername abgewiesen');
  r = await call('POST', '/api/admin/dozenten', { benutzer: 'x', passwort: 'xyz123' }, adm.token); ok(r.status === 400, 'Zu kurzer Benutzername abgewiesen');
  r = await call('POST', '/api/admin/dozenten', { benutzer: 'herr.b', passwort: '123' }, adm.token); ok(r.status === 400, 'Zu kurzes Passwort abgewiesen');
  r = await call('GET', '/api/admin/dozenten', null, adm.token); ok(r.body.dozenten.length === 1 && r.body.dozenten[0].klassen === 0, 'Admin sieht Dozentenliste');
  ok(!JSON.stringify(r.body).includes('pbkdf2'), 'Passwort-Hash wird nie ausgeliefert');

  const doz = await login('FRAU.KELLER', 'lehrer1'); ok(doz && doz.konto.rolle === 'dozent' && doz.konto.pseudonym === 'Frau K.', 'Dozent meldet sich an (Gross/Klein egal)', doz);
  r = await call('GET', '/api/admin/dozenten', null, doz.token); ok(r.status === 403, 'Dozent darf keine Admin-Endpunkte');
  const row = await env.DB.prepare('SELECT pw FROM dozenten WHERE id = ?').bind(dozId).first();
  ok(/^pbkdf2\$/.test(row.pw) && !row.pw.includes('lehrer1'), 'Passwort nur als Hash gespeichert');

  // Rate-Limiting: 5 Fehlversuche auf einen Namen → gesperrt, auch mit richtigem Passwort
  for (let i = 0; i < 5; i++) await call('POST', '/api/login', { benutzer: 'frau.keller', passwort: 'falsch' + i }, null, '10.0.1.' + i);
  r = await call('POST', '/api/login', { benutzer: 'frau.keller', passwort: 'lehrer1' }, null, '10.0.2.1');
  ok(r.status === 429 && r.body.wartenSek > 0, 'Nach 5 Fehlversuchen ist der Benutzer gesperrt', r.body);
  await env.DB.prepare("UPDATE sperren SET gesperrt_bis = 0 WHERE schluessel = 'u:frau.keller'").run();
  for (let i = 0; i < 5; i++) await call('POST', '/api/login', { benutzer: 'gibtsnicht' + i, passwort: 'x' }, null, '10.9.9.9');
  r = await call('POST', '/api/login', { benutzer: 'frau.keller', passwort: 'lehrer1' }, null, '10.9.9.9');
  ok(r.status === 429, 'Nach 5 Fehlversuchen von derselben Adresse ist die Adresse gesperrt');
  r = await call('POST', '/api/login', { benutzer: 'frau.keller', passwort: 'lehrer1' }, null, '10.0.3.1'); ok(r.status === 200, 'Andere Adresse, richtiges Passwort: wieder frei');

  r = await call('POST', '/api/admin/dozenten/' + dozId + '/passwort', { passwort: 'neues-pw' }, adm.token); ok(r.status === 200, 'Admin setzt Dozenten-Passwort zurueck');
  r = await call('GET', '/api/me', null, doz.token); ok(r.status === 401, 'Alte Dozenten-Sitzung nach Reset ungueltig');
  const doz2 = await login('frau.keller', 'neues-pw', '10.0.4.1'); ok(doz2 && doz2.token, 'Anmeldung mit neuem Passwort');
  await call('POST', '/api/logout', null, doz2.token); r = await call('GET', '/api/me', null, doz2.token); ok(r.status === 401, 'Abmelden beendet die Sitzung');

  /* ===== Phase 2: Klassen, Schueler, Klassencode ===== */
  const D = await login('frau.keller', 'neues-pw', '10.0.5.1');
  r = await call('POST', '/api/admin/dozenten', { benutzer: 'herr.meier', passwort: 'lehrer2' }, adm.token);
  const D2 = await login('herr.meier', 'lehrer2', '10.0.5.2');
  r = await call('POST', '/api/klassen', { name: 'EL 1a' }, D.token);
  ok(r.status === 200 && /^[A-HJ-NP-Z2-9]{6}$/.test(r.body.klasse.code), 'Klasse mit lesbarem 6-Zeichen-Code', r.body);
  const K1 = r.body.klasse;
  r = await call('POST', '/api/klassen', { name: '' }, D.token); ok(r.status === 400, 'Klasse ohne Namen abgewiesen');
  r = await call('POST', '/api/klassen', { name: 'EL 1b' }, adm.token); ok(r.status === 403, 'Admin legt keine Klassen an (nur Dozenten)');
  r = await call('POST', '/api/klassen/' + K1.id + '/schueler', { benutzer: 'blitz', passwort: 'geheim1', pseudonym: 'Blitz' }, D.token);
  ok(r.status === 200 && r.body.schueler.pseudonym === 'Blitz', 'Dozent legt Schueler an');
  const S1 = r.body.schueler;
  r = await call('POST', '/api/klassen/' + K1.id + '/schueler', { benutzer: 'frau.keller', passwort: 'geheim1' }, D.token); ok(r.status === 409, 'Schuelername darf keinen Dozentennamen belegen');
  r = await call('GET', '/api/klassen/' + K1.id, null, D2.token); ok(r.status === 404, 'Fremder Dozent sieht die Klasse nicht');
  r = await call('POST', '/api/klassen/' + K1.id + '/schueler', { benutzer: 'fremd', passwort: 'geheim1' }, D2.token); ok(r.status === 404, 'Fremder Dozent kann keine Schueler anlegen');
  r = await call('GET', '/api/klassen', null, D.token); ok(r.body.klassen.length === 1 && r.body.klassen[0].schueler === 1, 'Klassenliste mit Anzahl Schueler');
  r = await call('GET', '/api/klassen', null, D2.token); ok(r.body.klassen.length === 0, 'Jeder Dozent sieht nur eigene Klassen');

  // Selbstregistrierung
  r = await call('POST', '/api/registrieren', { code: K1.code.toLowerCase(), benutzer: 'Funke', passwort: 'geheim2', pseudonym: 'Funke' }, null, '10.0.6.1');
  ok(r.status === 200 && r.body.token && r.body.konto.klasse === 'EL 1a', 'Selbstregistrierung mit Klassencode (Gross/Klein egal)', r.body);
  const S2tok = r.body.token;
  r = await call('GET', '/api/me', null, S2tok); ok(r.body.konto.rolle === 'schueler' && r.body.konto.benutzer === 'funke', 'Registrierter Schueler ist angemeldet');
  r = await call('POST', '/api/klassen', { name: 'X' }, S2tok); ok(r.status === 403, 'Schueler darf keine Klassen anlegen');
  for (let i = 0; i < 5; i++) await call('POST', '/api/registrieren', { code: 'ZZZZZ' + i, benutzer: 'rater' + i, passwort: 'geheim2' }, null, '10.0.7.1');
  r = await call('POST', '/api/registrieren', { code: K1.code, benutzer: 'rater9', passwort: 'geheim2' }, null, '10.0.7.1');
  ok(r.status === 429, 'Codes raten: nach 5 Fehlversuchen gesperrt');
  const S1l = await login('blitz', 'geheim1', '10.0.8.1'); ok(S1l && S1l.konto.klasse === 'EL 1a', 'Vom Dozenten angelegter Schueler meldet sich an');

  // Code erneuern, Passwort-Reset, Entfernen
  r = await call('POST', '/api/klassen/' + K1.id + '/code', null, D.token); ok(r.body.code && r.body.code !== K1.code, 'Neuer Klassencode');
  r = await call('POST', '/api/registrieren', { code: K1.code, benutzer: 'spaet', passwort: 'geheim2' }, null, '10.0.9.1'); ok(r.status === 404, 'Alter Code gilt nicht mehr');
  r = await call('POST', '/api/schueler/' + S1.id + '/passwort', { passwort: 'neu-123' }, D.token); ok(r.status === 200, 'Dozent setzt Schueler-Passwort zurueck');
  r = await call('GET', '/api/me', null, S1l.token); ok(r.status === 401, 'Alte Schueler-Sitzung nach Reset ungueltig');
  r = await call('POST', '/api/schueler/' + S1.id + '/passwort', { passwort: 'neu-123' }, D2.token); ok(r.status === 404, 'Fremder Dozent kann kein Passwort setzen');
  r = await call('GET', '/api/klassen/' + K1.id, null, D.token);
  ok(r.body.schueler.length === 2 && r.body.schueler.every(x => x.erledigt && !x.pw), 'Klassenansicht: Schueler mit Fortschritt, ohne Passwort');
  const funkeId = r.body.schueler.find(x => x.benutzer === 'funke').id;
  r = await call('DELETE', '/api/schueler/' + funkeId, null, D.token); ok(r.status === 200, 'Dozent entfernt Schueler');
  r = await call('GET', '/api/me', null, S2tok); ok(r.status === 401, 'Entfernter Schueler ist abgemeldet');
  r = await call('POST', '/api/klassen', { name: 'Wegwerf' }, D.token); const KW = r.body.klasse;
  await call('POST', '/api/klassen/' + KW.id + '/schueler', { benutzer: 'weg1', passwort: 'geheim1' }, D.token);
  r = await call('DELETE', '/api/klassen/' + KW.id, null, D.token); ok(r.status === 200, 'Klasse loeschen');
  ok(!(await env.DB.prepare("SELECT 1 AS x FROM schueler WHERE benutzer = 'weg1'").first()), 'Schueler einer geloeschten Klasse sind mit geloescht');

  /* ===== Phase 3: Zuweisungen ===== */
  r = await call('POST', '/api/klassen/' + K1.id + '/schueler', { benutzer: 'welle', passwort: 'geheim3', pseudonym: 'Welle' }, D.token);
  const S3 = r.body.schueler;
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: '12' }, { typ: 'aufgabe', id: '14.3' }], klasse_id: K1.id, faellig_am: '2026-10-20' }, D.token);
  ok(r.status === 200 && r.body.ids.length === 2, 'Zwei Ziele an die ganze Klasse', r.body);
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'aufgabe', id: 'W3' }], schueler_ids: [S1.id, S3.id] }, D.token);
  ok(r.status === 200 && r.body.ids.length === 2, 'Ein Ziel an zwei einzelne Schueler (ohne Frist)');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: '12' }], klasse_id: K1.id, faellig_am: '2026-10-27' }, D.token);
  r = await call('GET', '/api/klassen/' + K1.id + '/zuweisungen', null, D.token);
  const z12 = r.body.zuweisungen.filter(z => z.ziel_id === '12');
  ok(r.body.zuweisungen.length === 4 && z12.length === 1 && z12[0].faellig_am === '2026-10-27', 'Erneut zuweisen aktualisiert nur die Frist (kein Duplikat)', r.body);
  ok(r.body.zuweisungen.filter(z => z.schueler_id).every(z => z.pseudonym), 'Einzel-Zuweisungen tragen das Pseudonym');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: '12' }], klasse_id: K1.id, faellig_am: '20.10.2026' }, D.token); ok(r.status === 400, 'Falsches Datumsformat abgewiesen');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'raum', id: '12' }], klasse_id: K1.id }, D.token); ok(r.status === 400, 'Unbekannter Ziel-Typ abgewiesen');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: "1'; DROP" }], klasse_id: K1.id }, D.token); ok(r.status === 400, 'Unsaubere Ziel-ID abgewiesen');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: '3' }] }, D.token); ok(r.status === 400, 'Ohne Empfaenger abgewiesen');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: '3' }], klasse_id: K1.id }, D2.token); ok(r.status === 404, 'Fremder Dozent kann der Klasse nichts zuweisen');
  r = await call('POST', '/api/zuweisungen', { ziele: [{ typ: 'kapitel', id: '3' }], schueler_ids: [S1.id] }, D2.token); ok(r.status === 404, 'Fremder Dozent kann fremden Schuelern nichts zuweisen');
  r = await call('GET', '/api/klassen/' + K1.id + '/zuweisungen', null, D2.token); ok(r.status === 404, 'Fremder Dozent sieht die Zuweisungen nicht');
  const zid = z12[0].id;
  r = await call('POST', '/api/zuweisungen/' + zid, { faellig_am: null }, D.token); ok(r.status === 200, 'Frist entfernen');
  r = await call('DELETE', '/api/zuweisungen/' + zid, null, D2.token); ok(r.status === 404, 'Fremder Dozent kann nicht loeschen');
  r = await call('DELETE', '/api/zuweisungen/' + zid, null, D.token); ok(r.status === 200, 'Zuweisung loeschen');
  r = await call('GET', '/api/klassen/' + K1.id + '/zuweisungen', null, D.token); ok(r.body.zuweisungen.length === 3, 'Nach dem Loeschen 3 Zuweisungen');

  /* ===== Phase 4: Schueler-Sicht, Fortschritt-Spiegel ===== */
  const SB = await login('blitz', 'neu-123', '10.0.10.1'), SW = await login('welle', 'geheim3', '10.0.10.2');
  r = await call('GET', '/api/meine', null, SB.token);
  ok(r.status === 200 && r.body.zuweisungen.length === 2 && r.body.zuweisungen.every(z => z.dozent === 'Frau K.'), 'Schueler sieht Klassen- und eigene Vorgaben mit Dozent', r.body);
  ok(r.body.zuweisungen.some(z => z.ziel_id === 'W3' && z.fuer === 'dich') && r.body.zuweisungen.some(z => z.ziel_id === '14.3' && z.fuer === 'klasse' && z.faellig_am === '2026-10-20'), 'Vorgabe kennzeichnet Klasse/dich und Frist');
  r = await call('GET', '/api/meine', null, D.token); ok(r.status === 403, 'Dozent hat keine Schueler-Sicht');
  r = await call('POST', '/api/sync', { erledigt: { '1.1': 1000, T1A: 900, 'bad id!': 5 }, ereignisse: [{ t: 900, type: 'theory_check', id: 'T1A', score: 1, tags: ['elektro.stromkreis'] }, { t: 1000, type: 'task_done', id: '1.1', tries: 2 }] }, SB.token);
  ok(r.status === 200 && r.body.erledigt['1.1'] === 1000 && r.body.erledigt.T1A === 900 && !r.body.erledigt['bad id!'], 'Sync speichert erledigt, verwirft unsaubere IDs', r.body);
  r = await call('POST', '/api/sync', { erledigt: { '1.1': 5000, '1.2': 2000 }, ereignisse: [{ t: 1000, type: 'task_done', id: '1.1', tries: 2 }] }, SB.token);
  ok(r.body.erledigt['1.1'] === 1000 && r.body.erledigt['1.2'] === 2000, 'Fruehester Zeitpunkt gewinnt, Neues kommt dazu');
  const ev = await env.DB.prepare('SELECT COUNT(*) AS n FROM ereignisse WHERE schueler_id = ?').bind(S1.id).first();
  ok(ev.n === 2, 'Doppelte Ereignisse werden ignoriert', ev);
  const evd = await env.DB.prepare("SELECT daten FROM ereignisse WHERE typ = 'theory_check'").first();
  ok(JSON.parse(evd.daten).tags[0] === 'elektro.stromkreis', 'Ereignis behaelt Zusatzfelder (Tags) als JSON');
  r = await call('POST', '/api/sync', { erledigt: { '1.1': 1 } }, D.token); ok(r.status === 403, 'Nur Schueler synchronisieren');
  r = await call('POST', '/api/sync', { erledigt: Object.fromEntries(Array.from({ length: 1001 }, (_, i) => ['X' + i, 1])) }, SB.token); ok(r.status === 413, 'Zu grosse Sync-Anfrage abgewiesen');
  r = await call('GET', '/api/meine', null, SW.token); ok(Object.keys(r.body.erledigt).length === 0, 'Fortschritt ist pro Schueler getrennt');
  r = await call('GET', '/api/klassen/' + K1.id, null, D.token);
  const bl = r.body.schueler.find(x => x.benutzer === 'blitz');
  ok(bl.erledigt['1.2'] === 2000 && bl.zuletzt > 0, 'Dozent sieht den gespiegelten Fortschritt und "zuletzt"');

  globalThis.__t = { D, D2, K1, S1, S3, adm };
  if (globalThis.__more) await globalThis.__more({ call, login, ok, env, W });
  console.log(`API-Tests: ${pass} ok, ${failN} Fehler`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

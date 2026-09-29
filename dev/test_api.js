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

  console.log(`API-Tests: ${pass} ok, ${failN} Fehler`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

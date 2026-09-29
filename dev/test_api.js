// Tests fuer den Worker (worker/index.js) gegen einen D1-Nachbau (node:sqlite), ohne Cloudflare: node test_api.js
// Ablaeufe wie bei SPS Quest (tests/api.js, tests/live.js), dazu die Vorgaben mit Frist.
const path = require('path'), { pathToFileURL } = require('url');
const { d1 } = require('./tests/d1mock.js');
let pass = 0, failN = 0;
const ok = (c, name, info) => { if (c) pass++; else { failN++; console.log('FEHLER', name, info !== undefined ? JSON.stringify(info) : ''); } };
const imp = f => import(pathToFileURL(path.join(__dirname, '../worker/' + f)));

(async () => {
  const W = (await imp('index.js')).default, L = await imp('lib.js'), DB = await imp('db.js'), CH = await imp('challenge.js');
  const mkEnv = opts => ({ DB: d1(opts), ADMIN_USER: 'Chef', ADMIN_PASSWORD: 'geheim-admin', ASSETS: { fetch: () => new Response('seite') } });
  let env = mkEnv();
  function client(ip) {
    let cookie = '';
    return async function call(method, url, body, headers) {
      const h = Object.assign({ 'content-type': 'application/json', 'x-dquest': '1', 'cf-connecting-ip': ip || '10.0.0.1' }, headers || {});
      if (cookie) h.cookie = cookie;
      const r = await W.fetch(new Request('https://dq.test' + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env, {});
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
      let data = null; try { data = await r.json(); } catch (e) { /* kein JSON */ }
      return { status: r.status, data, setCookie: sc };
    };
  }
  let r;

  /* ===== 1 Grundlagen, Passwort-Hash ===== */
  const h = await L.hashPassword('abc123');
  ok(/^pbkdf2\$100000\$/.test(h) && await L.verifyPassword('abc123', h) && !await L.verifyPassword('abc124', h), 'PBKDF2: Hash und Pruefung');
  ok(h !== await L.hashPassword('abc123'), 'PBKDF2: Salz macht jeden Hash einzigartig');
  ok(/^[a-z]+-[a-z]+-\d\d$/.test(L.randomPassword()), 'Startpasswort wort-wort-12');
  const admin = client('10.0.0.1'), teacher = client('10.0.0.2'), other = client('10.0.0.3'), stud = client('10.0.0.4'), stud2 = client('10.0.0.5'), anon = client('10.0.0.9');
  ok((await anon('GET', '/api/health')).status === 200, 'health');
  ok((await anon('GET', '/api/me')).data.user === null, 'me ohne Login: user null');
  ok((await anon('POST', '/api/login', { username: 'x', password: 'y' }, { 'x-dquest': '' })).status === 403, 'Schreibzugriff nur mit Header x-dquest');
  r = await W.fetch(new Request('https://dq.test/index.html'), env, {}); ok(await r.text() === 'seite', 'Nicht-API geht an die statischen Dateien');
  r = await W.fetch(new Request('https://dq.test/api/me'), { ASSETS: env.ASSETS }, {}); ok(r.status === 500, 'Ohne D1: Fehler statt Absturz');

  /* ===== 2 Admin ===== */
  ok((await admin('POST', '/api/login', { username: 'chef', password: 'falsch' })).status === 401, 'Admin falsches Passwort');
  r = await admin('POST', '/api/login', { username: 'chef', password: 'geheim-admin' });
  ok(r.status === 200 && r.data.user.role === 'admin' && r.data.user.secretAdmin, 'Admin-Login aus den Secrets (Gross/Klein egal)', r.data);
  ok(/HttpOnly/.test(r.setCookie) && /SameSite=Lax/.test(r.setCookie) && /Secure/.test(r.setCookie) && /^dq_sess=/.test(r.setCookie), 'Sitzungs-Cookie dq_sess HttpOnly, SameSite, Secure');
  r = await admin('POST', '/api/admin/teachers', { username: 'frau.keller' });
  ok(r.status === 201 && r.data.password, 'Dozent anlegen, Startpasswort erzeugt');
  const tPw = r.data.password;
  ok((await admin('POST', '/api/admin/teachers', { username: 'Frau.Keller' })).status === 409, 'doppelter Name (Gross/Klein) 409');
  ok((await admin('POST', '/api/admin/teachers', { username: 'Chef' })).status === 409, 'Admin-Name gesperrt');
  ok((await admin('POST', '/api/admin/teachers', { username: 'mit leer' })).status === 400, 'ungueltiger Name');
  ok((await admin('POST', '/api/me/password', { old: 'geheim-admin', password: 'irgendwas-neues' })).status === 400, 'Secret-Admin aendert das Passwort nicht im Portal');
  r = await admin('POST', '/api/admin/teachers', { username: 'herr.meier' }); const oPw = r.data.password;

  /* ===== 3 Dozent ===== */
  r = await teacher('POST', '/api/login', { username: 'FRAU.KELLER', password: tPw });
  ok(r.status === 200 && r.data.user.mustChange && r.data.user.role === 'teacher', 'Dozent-Login, muss Passwort aendern');
  ok((await teacher('POST', '/api/me/password', { old: tPw, password: 'kurz' })).status === 400, 'zu kurzes Passwort (Dozent: 8)');
  ok((await teacher('POST', '/api/me/password', { old: 'falsch', password: 'neues-passwort' })).status === 401, 'altes Passwort falsch');
  ok((await teacher('POST', '/api/me/password', { old: tPw, password: 'neues-passwort' })).status === 200, 'Passwort aendern');
  ok((await teacher('GET', '/api/me')).data.user.mustChange === false, 'mustChange weg');
  ok((await teacher('GET', '/api/admin/teachers')).status === 403, 'Dozent darf nicht in die Administration');
  const row = await env.DB.prepare("SELECT pw FROM users WHERE username = 'frau.keller'").first();
  ok(/^pbkdf2\$/.test(row.pw) && !row.pw.includes('neues-passwort'), 'Passwort nur als Hash gespeichert');
  await other('POST', '/api/login', { username: 'herr.meier', password: oPw });
  r = await teacher('POST', '/api/classes', { name: 'EL 1a' });
  ok(r.status === 201 && /^[A-HJ-NP-Z2-9]{6}$/.test(r.data.code), 'Klasse anlegen, lesbarer 6-Zeichen-Code', r.data);
  const cls = r.data;
  ok((await teacher('POST', '/api/classes', { name: ' ' })).status === 400, 'Klasse ohne Namen abgewiesen');
  ok((await anon('GET', '/api/class-info?code=' + cls.code)).data.name === 'EL 1a', 'Klassencode pruefen');
  ok((await other('GET', '/api/classes/' + cls.id)).status === 404, 'Fremder Dozent sieht die Klasse nicht');
  ok((await other('GET', '/api/classes')).data.classes.length === 0, 'Jeder Dozent sieht nur eigene Klassen');

  /* ===== 4 Lernende: Selbstanmeldung, erzeugte Konten ===== */
  r = await stud('POST', '/api/register', { code: cls.code.toLowerCase(), username: 'Funke', password: 'geheim1' });
  ok(r.status === 201 && r.data.user.class.name === 'EL 1a' && !r.data.user.noticeAck, 'Selbstanmeldung mit Klassencode', r.data);
  const funkeId = r.data.user.id;
  ok((await anon('POST', '/api/register', { code: 'ZZZZZZ', username: 'x_y_z', password: 'geheim1' })).status === 404, 'falscher Klassencode');
  ok((await anon('POST', '/api/register', { code: cls.code, username: 'funke', password: 'geheim1' })).status === 409, 'Pseudonym schon vergeben');
  ok((await stud('POST', '/api/me/notice', {})).status === 200 && (await stud('GET', '/api/me')).data.user.noticeAck, 'Hinweis zur Einsicht bestaetigt');
  ok((await stud('POST', '/api/classes', { name: 'X' })).status === 403, 'Schueler darf keine Klassen anlegen');
  r = await teacher('POST', '/api/classes/' + cls.id + '/students', { prefix: 'el1a_', count: 3 });
  ok(r.status === 201 && r.data.created.length === 3 && r.data.created[0].username === 'el1a_01', 'Konten nummeriert erzeugen');
  const gen = r.data.created[0];
  r = await teacher('POST', '/api/classes/' + cls.id + '/students', { usernames: ['Blitz', 'Welle'] });
  ok(r.status === 201 && r.data.created.length === 2, 'Konten aus Namensliste');
  ok((await teacher('POST', '/api/classes/' + cls.id + '/students', { usernames: ['Neu1', 'neu1'] })).status === 400, 'doppelte Namen in der Liste');
  ok((await other('POST', '/api/classes/' + cls.id + '/students', { prefix: 'x_', count: 1 })).status === 404, 'Fremder Dozent erzeugt keine Konten');
  r = await stud2('POST', '/api/login', { username: gen.username, password: gen.password });
  ok(r.status === 200 && r.data.user.mustChange, 'Erzeugtes Konto: Login, muss Passwort aendern');
  ok((await stud2('POST', '/api/me/password', { old: gen.password, password: 'meins-1' })).status === 200, 'Schueler aendert Startpasswort (6 Zeichen)');
  r = await teacher('GET', '/api/classes/' + cls.id);
  ok(r.data.students.length === 6 && r.data.students.every(s => !('pw' in s)), 'Klassenliste ohne Passwoerter', r.data.students.length);
  r = await teacher('PATCH', '/api/classes/' + cls.id, { selfSignup: false });
  ok(r.data.class.selfSignup === false && (await anon('GET', '/api/class-info?code=' + cls.code)).status === 404, 'Selbstanmeldung schliessen');
  r = await teacher('PATCH', '/api/classes/' + cls.id, { selfSignup: true, newCode: true, name: 'EL 1a neu' });
  ok(r.data.class.code !== cls.code && r.data.class.name === 'EL 1a neu', 'Neuer Code und umbenennen');
  ok((await anon('GET', '/api/class-info?code=' + cls.code)).status === 404, 'Alter Code gilt nicht mehr');

  /* ===== 5 Fortschritt ===== */
  const state = { version: 1, profile: { id: 'uuid-1', vorname: 'Anna', nachname: 'Muster', pseudonym: 'Funke' }, done: { T1A: true, '1.1': true }, drafts: {}, events: [], settings: {} };
  r = await stud('PUT', '/api/progress/dq', { state, summary: { tasks: 1, theory: 1, points: 350, stars: 3, done: ['T1A', '1.1', 'bad id!'], current: 'Kapitel 1 · Aufgabe 1.2', totalTasks: 150, totalTheory: 30 }, base: 0 });
  ok(r.status === 200 && r.data.updatedAt > 0, 'Spielstand speichern');
  const base1 = r.data.updatedAt;
  r = await stud('GET', '/api/progress/dq');
  ok(r.data.state.done['1.1'] && r.data.state.profile.pseudonym === 'Funke' && !r.data.state.profile.vorname && !r.data.state.profile.nachname, 'Echte Namen werden nicht gespeichert', r.data.state.profile);
  ok((await stud('PUT', '/api/progress/xx', { state })).status === 404, 'Unbekannte Quest');
  r = await stud('PUT', '/api/progress/dq', { state, summary: {}, base: base1 - 5 });
  ok(r.status === 409 && r.data.updatedAt === base1, 'Konflikt 409, wenn woanders weitergespielt wurde');
  ok((await stud('PUT', '/api/progress/dq', { state, summary: {}, base: base1 - 5, force: true })).status === 200, 'force ueberschreibt');
  ok((await admin('PUT', '/api/progress/dq', { state })).status === 400, 'Secret-Admin speichert keinen Spielstand');
  await stud('PUT', '/api/progress/dq', { state, summary: { tasks: 1, theory: 1, done: ['T1A', '1.1', 'bad id!'] }, force: true });
  r = await teacher('GET', '/api/classes/' + cls.id);
  const fu = r.data.students.find(s => s.username === 'Funke');
  ok(fu.progress.dq.tasks === 1 && fu.progress.dq.done.join() === 'T1A,1.1', 'Dozent sieht Zusammenfassung mit erledigten Stationen (gefiltert)', fu.progress);
  r = await teacher('GET', '/api/students/' + funkeId + '/progress/dq');
  ok(r.status === 200 && r.data.state.done.T1A, 'Dozent sieht den Spielstand der eigenen Lernenden');
  ok((await other('GET', '/api/students/' + funkeId + '/progress/dq')).status === 404, 'Fremder Dozent sieht ihn nicht');

  /* ===== 6 Vorgaben mit Frist ===== */
  r = await teacher('GET', '/api/classes/' + cls.id); const blitz = r.data.students.find(s => s.username === 'Blitz');
  r = await teacher('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: '12' }, { type: 'aufgabe', id: '14.3' }], classId: cls.id, due: '2026-10-20' });
  ok(r.status === 201 && r.data.ids.length === 2, 'Zwei Ziele an die ganze Klasse', r.data);
  r = await teacher('POST', '/api/assignments', { targets: [{ type: 'aufgabe', id: 'W3' }], studentIds: [funkeId, blitz.id] });
  ok(r.status === 201 && r.data.ids.length === 2, 'Ein Ziel an zwei einzelne Lernende (ohne Frist)');
  await teacher('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: '12' }], classId: cls.id, due: '2026-10-27' });
  r = await teacher('GET', '/api/classes/' + cls.id + '/assignments');
  const a12 = r.data.assignments.filter(a => a.target === '12');
  ok(r.data.assignments.length === 4 && a12.length === 1 && a12[0].due === '2026-10-27', 'Erneut zuweisen aktualisiert nur die Frist', r.data);
  ok(r.data.assignments.filter(a => a.userId).every(a => a.username), 'Einzel-Vorgaben tragen das Pseudonym');
  ok((await teacher('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: '12' }], classId: cls.id, due: '20.10.2026' })).status === 400, 'Falsches Datumsformat');
  ok((await teacher('POST', '/api/assignments', { targets: [{ type: 'raum', id: '12' }], classId: cls.id })).status === 400, 'Unbekannter Ziel-Typ');
  ok((await teacher('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: "1'; DROP" }], classId: cls.id })).status === 400, 'Unsaubere Ziel-Nummer');
  ok((await teacher('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: '3' }] })).status === 400, 'Ohne Empfaenger');
  ok((await other('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: '3' }], classId: cls.id })).status === 404, 'Fremder Dozent: Klasse');
  ok((await other('POST', '/api/assignments', { targets: [{ type: 'kapitel', id: '3' }], studentIds: [funkeId] })).status === 404, 'Fremder Dozent: Lernende');
  ok((await other('GET', '/api/classes/' + cls.id + '/assignments')).status === 404, 'Fremder Dozent sieht die Vorgaben nicht');
  r = await stud('GET', '/api/assignments/mine');
  ok(r.data.assignments.length === 3 && r.data.assignments.some(a => a.target === 'W3' && a.forMe) && r.data.assignments.some(a => a.target === '14.3' && !a.forMe && a.due === '2026-10-20'), 'Lernende sehen Klassen- und eigene Vorgaben', r.data);
  ok((await stud2('GET', '/api/assignments/mine')).data.assignments.length === 2, 'Andere Person: nur die Klassen-Vorgaben');
  ok((await other('DELETE', '/api/assignments/' + a12[0].id)).status === 404, 'Fremder Dozent kann nicht loeschen');
  ok((await teacher('PATCH', '/api/assignments/' + a12[0].id, { due: null })).status === 200, 'Frist entfernen');
  ok((await teacher('DELETE', '/api/assignments/' + a12[0].id)).status === 200, 'Vorgabe loeschen');

  /* ===== 7 Live-Challenge ===== */
  ok((await stud('POST', '/api/challenges', { mode: 'sprint', taskId: '1.2' })).status === 403, 'Lernende legen keine Challenge an');
  r = await teacher('POST', '/api/challenges', { mode: 'sprint', taskId: '12.5', title: 'Zaehler', duration: 300 });
  ok(r.status === 201 && /^[1-9]\d{3}$/.test(r.data.code), '4-stelliger Beitrittscode', r.data);
  const ch = r.data;
  ok((await teacher('POST', '/api/challenges', { mode: 'bug', taskId: '1.8' })).status === 400, 'Stoerungsjagd braucht ein Szenario');
  ok((await teacher('POST', '/api/challenges', { mode: 'pikett', taskId: '1.8' })).status === 400, 'Pikett-Challenge gibt es nicht');
  ok((await stud('POST', '/api/live/join', { code: '12' })).status === 400, 'Code mit 4 Ziffern');
  r = await stud('POST', '/api/live/join', { code: ch.code }); ok(r.status === 200 && r.data.challenge.state === 'lobby' && r.data.challenge.taskId === '12.5', 'Beitreten', r.data);
  await stud2('POST', '/api/live/join', { code: ch.code });
  ok((await stud('POST', '/api/live/' + ch.id + '/attempt', { ok: true })).status === 409, 'Vor dem Start keine Abgabe');
  ok((await other('POST', '/api/challenges/' + ch.id + '/start', {})).status === 404, 'Fremder Dozent startet nicht');
  ok((await teacher('POST', '/api/challenges/' + ch.id + '/start', {})).status === 200, 'Start');
  ok((await teacher('POST', '/api/challenges/' + ch.id + '/start', {})).status === 409, 'Doppelter Start 409');
  await stud('POST', '/api/live/' + ch.id + '/attempt', { ok: false });
  await stud('POST', '/api/live/' + ch.id + '/hint', {});
  r = await stud('POST', '/api/live/' + ch.id + '/attempt', { ok: true, code: { parts: [{ id: 'R1', type: 'resistor' }], wires: [] } });
  ok(r.data.solved && r.data.points >= 100 && r.data.points <= 850, 'Geloest: Punkte mit Abzug fuer Fehlversuch und Tipp', r.data);
  const p1 = r.data.points;
  r = await stud2('POST', '/api/live/' + ch.id + '/attempt', { ok: true, code: { parts: [], wires: [] } });
  ok(r.data.points > p1, 'Ohne Fehlversuch und Tipp mehr Punkte');
  ok((await stud('POST', '/api/live/' + ch.id + '/attempt', { ok: true })).data.points === p1, 'Zweite Abgabe aendert nichts');
  r = await stud('GET', '/api/live/' + ch.id);
  ok(r.data.me.solved && r.data.me.rank === 2 && r.data.top.length === 2 && r.data.top[0].username === gen.username, 'Rangliste fuer Lernende', r.data);
  r = await teacher('GET', '/api/challenges/' + ch.id);
  ok(r.data.players.length === 2 && r.data.players[0].rank === 1 && r.data.players.every(p => p.hasCode) && r.data.challenge.state === 'running', 'Beamer-Stand');
  await teacher('POST', '/api/challenges/' + ch.id + '/show', { userId: funkeId });
  r = await teacher('GET', '/api/challenges/' + ch.id); ok(r.data.shown && r.data.shown.code.parts[0].id === 'R1', 'Loesung am Beamer zeigen');
  ok((await teacher('POST', '/api/challenges/' + ch.id + '/stop', {})).status === 200 && (await teacher('GET', '/api/challenges/' + ch.id)).data.challenge.state === 'ended', 'Beenden');
  ok((await stud('POST', '/api/live/join', { code: ch.code })).status === 404, 'Beendete Challenge: kein Beitritt');
  ok(CH.livePoints({ started_at: 1000, duration: 600 }, { solved_at: 1000, attempts: 1, hints: 0 }) === 1000 && CH.livePoints({ started_at: 1000, duration: 600 }, { solved_at: 601000, attempts: 9, hints: 5 }) === 100, 'Punkteformel: 1000 … mindestens 100');
  r = await teacher('GET', '/api/challenges'); ok(r.data.challenges.length === 1 && r.data.challenges[0].solved === 2, 'Liste der Challenges');

  /* ===== 8 Meldungen (Feedback-Knopf) ===== */
  ok((await anon('POST', '/api/reports', { type: 'fehler', message: '  ' })).status === 400, 'Leere Meldung');
  ok((await anon('POST', '/api/reports', { type: 'fehler', message: 'Knopf klemmt', quest: 'dq', context: 'Aufgabe 1.2' })).status === 201, 'Meldung ohne Login');
  ok((await stud('POST', '/api/reports', { type: 'feedback', message: 'Macht Spass' })).status === 201, 'Meldung mit Login');
  r = await teacher('GET', '/api/reports'); ok(r.data.reports.length === 1 && r.data.reports[0].username === 'Funke' && r.data.reports[0].className === 'EL 1a neu', 'Dozent sieht die Meldungen der eigenen Lernenden', r.data);
  r = await admin('GET', '/api/reports'); ok(r.data.reports.length === 2 && r.data.counts.open === 2, 'Admin sieht alle');
  ok((await teacher('PATCH', '/api/reports/' + r.data.reports[0].id, { done: true })).status === 403, 'Nur Admin hakt ab');
  ok((await stud('GET', '/api/reports')).status === 403, 'Lernende sehen keine Meldungen');

  /* ===== 9 Passwort-Reset, Loeschen, Abmelden ===== */
  r = await teacher('POST', '/api/students/' + funkeId + '/reset', {});
  ok(r.status === 200 && r.data.password, 'Dozent setzt Passwort zurueck');
  ok((await stud('GET', '/api/me')).data.user === null, 'Angemeldete Geraete sind abgemeldet');
  r = await stud('POST', '/api/login', { username: 'funke', password: r.data.password }); ok(r.data.user.mustChange, 'Neues Startpasswort muss geaendert werden');
  ok((await other('POST', '/api/students/' + funkeId + '/reset', {})).status === 404, 'Fremder Dozent setzt nicht zurueck');
  ok((await stud2('DELETE', '/api/me', { password: 'falsch' })).status === 401, 'Konto loeschen braucht das Passwort');
  ok((await stud2('DELETE', '/api/me', { password: 'meins-1' })).status === 200 && !(await env.DB.prepare('SELECT 1 AS x FROM users WHERE username = ?').bind(gen.username).first()), 'Schueler loescht eigenes Konto');
  ok((await teacher('DELETE', '/api/students/' + blitz.id)).status === 200, 'Dozent entfernt Konto');
  ok(!(await env.DB.prepare('SELECT 1 AS x FROM assignments WHERE user_id = ?').bind(blitz.id).first()), 'Vorgaben der Person sind mit geloescht');
  r = await admin('POST', '/api/admin/teachers/' + (await env.DB.prepare("SELECT id FROM users WHERE username = 'herr.meier'").first()).id + '/reset', {});
  ok(r.status === 200 && (await other('GET', '/api/me')).data.user === null, 'Admin setzt Dozenten-Passwort zurueck, Sitzung beendet');
  const kId = (await env.DB.prepare("SELECT id FROM users WHERE username = 'frau.keller'").first()).id;
  ok((await admin('DELETE', '/api/admin/teachers/' + kId, {})).status === 409, 'Dozent mit Klassen: erst bestaetigen');
  ok((await admin('DELETE', '/api/admin/teachers/' + kId, { withClasses: true })).status === 200, 'Dozent mit Klassen loeschen');
  const left = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM users WHERE role = 'student') AS s, (SELECT COUNT(*) FROM classes) AS c, (SELECT COUNT(*) FROM progress) AS p, (SELECT COUNT(*) FROM assignments) AS a, (SELECT COUNT(*) FROM challenges) AS ch").first();
  ok(left.s === 0 && left.c === 0 && left.p === 0 && left.a === 0 && left.ch === 0, 'Klassen, Konten, Spielstaende, Vorgaben, Challenges fallen mit', left);
  r = await admin('GET', '/api/admin/stats'); ok(r.data.teachers === 1 && r.data.students === 0, 'Kennzahlen');
  ok((await admin('POST', '/api/logout', {})).status === 200 && (await admin('GET', '/api/me')).data.user === null, 'Abmelden');

  /* ===== 10 Rate-Limit ===== */
  const bad = client('10.7.7.7');
  for (let i = 0; i < 5; i++) await bad('POST', '/api/login', { username: 'herr.meier', password: 'falsch' + i });
  r = await client('10.7.7.8')('POST', '/api/login', { username: 'herr.meier', password: 'egal' });
  ok(r.status === 429 && /Minute/.test(r.data.error), 'Nach 5 Fehlversuchen ist der Benutzer 15 min gesperrt', r.data);
  const spam = client('10.8.8.8');
  for (let i = 0; i < 40; i++) await spam('POST', '/api/login', { username: 'gibtsnicht' + i, password: 'x' });
  ok((await spam('POST', '/api/login', { username: 'chef', password: 'geheim-admin' })).status === 429, 'Nach 40 Fehlversuchen ist die Adresse gesperrt');
  ok((await client('10.8.8.9')('POST', '/api/login', { username: 'chef', password: 'geheim-admin' })).status === 200, 'Andere Adresse: frei');

  /* ===== 11 Altbestand vom 29.09.2026 uebernehmen ===== */
  DB.resetSchemaCache();
  env = mkEnv({ fixture: path.join(__dirname, 'tests/fixtures/altbestand_0001.sql') });
  const oldPw = await L.hashPassword('altes-passwort');
  env.DB.raw.prepare("INSERT INTO dozenten VALUES ('d-1', 'steven.test', ?, 'Steven', 1000)").run(oldPw);
  env.DB.raw.prepare("INSERT INTO dozenten VALUES ('d-2', 'zweiter', ?, 'Zwei', 1000)").run(oldPw);
  env.DB.raw.prepare("INSERT INTO klassen VALUES ('k-1', 'd-1', 'AT1A', 'ABC234', 2000)").run();
  env.DB.raw.prepare("INSERT INTO schueler VALUES ('s-1', 'altschueler', ?, 'Alt', 'k-1', 3000, NULL)").run(oldPw);
  const old = client('10.3.3.3');
  r = await old('POST', '/api/login', { username: 'steven.test', password: 'altes-passwort' });
  ok(r.status === 200 && r.data.user.role === 'teacher' && !r.data.user.mustChange && r.data.user.displayName === 'Steven', 'Altbestand: Dozent meldet sich mit bisherigem Passwort an', r.data);
  r = await old('GET', '/api/classes'); ok(r.data.classes.length === 1 && r.data.classes[0].code === 'ABC234' && r.data.classes[0].students === 1, 'Altbestand: Klasse mit Code und Konto uebernommen', r.data);
  ok(!(env.DB.raw.prepare("SELECT name FROM sqlite_master WHERE name IN ('dozenten', 'klassen', 'schueler', 'sitzungen')").get()), 'Alte Tabellen sind entfernt');

  console.log(`API-Tests: ${pass} ok, ${failN} Fehler`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

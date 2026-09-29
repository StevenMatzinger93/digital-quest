// Tests fuer Pruefungen und Zertifikate (worker/exam.js, worker/cert.js) gegen den D1-Nachbau: node test_exam_api.js
// Braucht worker/gen/exam_bundle.js (node build.js).
const path = require('path'), { pathToFileURL } = require('url');
const { d1 } = require('./tests/d1mock.js');
let pass = 0, failN = 0;
const ok = (c, name, info) => { if (c) pass++; else { failN++; console.log('FEHLER', name, info !== undefined ? JSON.stringify(info).slice(0, 400) : ''); } };
const imp = f => import(pathToFileURL(path.join(__dirname, '../worker/' + f)));

(async () => {
  const W = (await imp('index.js')).default, L = await imp('lib.js'), DB = await imp('db.js'), { Exam, QUEST_TASKS } = await imp('gen/exam_bundle.js');
  DB.resetSchemaCache();
  const env = { DB: d1(), ADMIN_USER: 'chef', ADMIN_PASSWORD: 'geheim-admin', ASSETS: { fetch: () => new Response('seite') } };
  function client(ip) {
    let cookie = '';
    return async function call(method, url, body) {
      const h = { 'content-type': 'application/json', 'x-dquest': '1', 'cf-connecting-ip': ip };
      if (cookie) h.cookie = cookie;
      const r = await W.fetch(new Request('https://dq.test' + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env, {});
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
      const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch (e) { /* kein JSON */ }
      return { status: r.status, data, text };
    };
  }
  const R = env.DB.raw, anon = client('10.2.0.9');
  await anon('GET', '/api/health'); // Tabellen anlegen
  const addUser = async (u, pw, role, cls, dn) => Number(R.prepare('INSERT INTO users (username, pw, role, class_id, created_at, notice_ack, must_change, display_name) VALUES (?, ?, ?, ?, ?, 1, 0, ?)').run(u, await L.hashPassword(pw), role, cls || null, Date.now(), dn || null).lastInsertRowid);
  const tid = await addUser('frau.keller', 'lehrerin-1', 'teacher', null, 'K. Keller, BBZ');
  const cid = Number(R.prepare('INSERT INTO classes (name, teacher_id, code, self_signup, created_at) VALUES (?, ?, ?, 1, ?)').run('EL 1a', tid, 'ABC234', Date.now()).lastInsertRowid);
  const sid = await addUser('blitz', 'geheim1', 'student', cid), sid2 = await addUser('funke', 'geheim2', 'student', cid);
  const teacher = client('10.2.0.1'), stud = client('10.2.0.2'), stud2 = client('10.2.0.3'), admin = client('10.2.0.4');
  ok((await teacher('POST', '/api/login', { username: 'frau.keller', password: 'lehrerin-1' })).status === 200, 'Dozent angemeldet');
  ok((await stud('POST', '/api/login', { username: 'blitz', password: 'geheim1' })).status === 200, 'Lernende angemeldet');
  ok((await stud2('POST', '/api/login', { username: 'funke', password: 'geheim2' })).status === 200, 'Zweite Lernende angemeldet');
  ok((await admin('POST', '/api/login', { username: 'chef', password: 'geheim-admin' })).status === 200, 'Admin angemeldet');
  let r;

  /* ===== 1 Voraussetzungen ===== */
  ok((await anon('GET', '/api/exams/eligibility?quest=dq')).status === 401, 'Pruefungen nur mit Konto');
  ok((await stud('GET', '/api/exams/eligibility?quest=scl')).status === 400, 'unbekannte Quest');
  r = await stud('GET', '/api/exams/eligibility?quest=dq');
  ok(r.status === 200 && !r.data.levels.grund.ok && r.data.levels.grund.missing.length === 2 && r.data.rules.grund.tasks === Exam.RULES.grund.tasks, 'ohne Fortschritt gesperrt (80 % und Boss fehlen)', r.data);
  ok(r.data.levels.profi.missing.some(x => /Grundstufe/.test(x)), 'Profi-Stufe verlangt das Zertifikat der Grundstufe');
  ok((await stud('POST', '/api/exams', { quest: 'dq', level: 'grund' })).status === 403, 'Start ohne Voraussetzungen 403');
  const g = QUEST_TASKS.dq.filter(t => t.ch <= 10), p = QUEST_TASKS.dq.filter(t => t.ch > 10);
  const done = {}; g.slice(0, Math.ceil(0.8 * g.length) - 1).forEach(t => { done[t.id] = true; });
  const put = (c, d) => c('PUT', '/api/progress/dq', { state: { version: 1, done: d, doneInfo: {}, drafts: {}, theory: {}, events: [], settings: {}, profile: { id: 'x' } }, summary: { tasks: Object.keys(d).length, done: Object.keys(d) }, force: true });
  await put(stud, done);
  r = await stud('GET', '/api/exams/eligibility?quest=dq'); ok(!r.data.levels.grund.ok && r.data.levels.grund.missing.length === 2, 'knapp unter 80 %: gesperrt', r.data.levels.grund);
  g.forEach(t => { done[t.id] = true; }); delete done['1.1'];
  await put(stud, done);
  r = await stud('GET', '/api/exams/eligibility?quest=dq'); ok(r.data.levels.grund.ok && r.data.levels.grund.finalOk, 'mit Fortschritt und Boss: bereit', r.data.levels.grund);
  ok((await admin('POST', '/api/exams', { quest: 'dq', level: 'grund' })).status === 403, 'Admin legt keine Pruefung ab');

  /* ===== 2 Pruefung ablegen ===== */
  r = await stud('POST', '/api/exams', { quest: 'dq', level: 'grund' });
  ok(r.status === 201 && r.data.tasks.length === Exam.RULES.grund.tasks && r.data.questions.length === Exam.RULES.grund.questions, 'Pruefung gestartet', r.data);
  const ex = r.data, id = ex.exam.id, pub = JSON.stringify(ex);
  ok(!/"(ref|hidden|wrong|answer|perm|truth|tol)":/.test(pub.replace(/"answers":\{\}/, '')), 'Antwort an den Browser ohne Loesungsdaten', pub.match(/"(ref|hidden|wrong|answer|perm|truth|tol)":/));
  ok(ex.exam.deadline - ex.exam.startedAt === Exam.RULES.grund.minutes * 60000 && ex.exam.state === 'running', 'Frist = Pruefungsdauer');
  ok((await stud('POST', '/api/exams', { quest: 'dq', level: 'grund' })).data.exam.id === id, 'zweiter Start setzt die laufende Pruefung fort');
  ok((await stud2('GET', '/api/exams/' + id)).status === 404, 'fremde Pruefung nicht lesbar');
  const built = Exam.build(JSON.parse(R.prepare('SELECT items FROM exams WHERE id = ?').get(id).items));
  const t0 = built.tasks[0], a0 = Exam.refAnswer(t0);
  r = await stud('POST', '/api/exams/' + id + '/answer', { item: t0.id, answer: { layout: t0.start, answers: {} } });
  ok(r.status === 200 && r.data.result.ok === false && r.data.result.total > 0 && Array.isArray(r.data.result.checks), 'Startaufbau abgegeben: nicht bestanden, Rueckmeldung ohne Sollwerte', r.data);
  ok(!/expected|info/.test(JSON.stringify(r.data)), 'Rueckmeldung verraet keine Sollwerte');
  const forb = JSON.parse(JSON.stringify(a0)); forb.layout.parts.push({ id: 'B9', type: t0.palette.includes('battery') ? 'zener' : 'battery', x: 1, y: 1, rot: 0, value: 9 });
  r = await stud('POST', '/api/exams/' + id + '/answer', { item: t0.id, answer: forb });
  ok(r.status === 200 && /nicht erlaubt/.test(r.data.result.error || ''), 'fremdes Bauteil: 0 Punkte mit Hinweis', r.data);
  ok((await stud('POST', '/api/exams/' + id + '/answer', { item: t0.id, answer: 'text' })).status === 400, 'Abgabe ohne Schaltung 400');
  ok((await stud('POST', '/api/exams/' + id + '/answer', { item: 'G99', answer: a0 })).status === 404, 'unbekannte Aufgabe 404');
  ok((await stud('POST', '/api/exams/' + id + '/answer', { item: t0.id, answer: { layout: { parts: Array(3000).fill(a0.layout.parts[0]), wires: [] }, answers: {} } })).status === 413, 'zu grosse Abgabe 413');
  for (const t of built.tasks) { r = await stud('POST', '/api/exams/' + id + '/answer', { item: t.id, answer: Exam.refAnswer(t) }); ok(r.status === 200 && r.data.result.ok, 'Musterloesung ' + t.id + ' volle Punkte', r.data); }
  // Theorie: alle bis auf eine richtig
  for (const [i, q] of built.questions.entries()) {
    r = await stud('POST', '/api/exams/' + id + '/answer', { item: q.id, answer: i === 0 ? (q.answer + 1) % q.options.length : q.answer });
    ok(r.status === 200 && r.data.saved && r.data.result === undefined, 'Theorie ' + q.id + ' gespeichert, ohne Rueckmeldung', r.data);
  }
  ok((await stud('POST', '/api/exams/' + id + '/answer', { item: built.questions[0].id, answer: 9 })).status === 400, 'ungueltige Auswahl 400');
  ok((await stud('POST', '/api/exams/' + id + '/focus', {})).status === 200 && (await stud('GET', '/api/exams/' + id)).data.exam.focusLost === 1, 'Fokusverlust wird gezaehlt');
  r = await stud('GET', '/api/exams/' + id);
  ok(Object.keys(r.data.answers).length === built.tasks.length + built.questions.length && r.data.answers[t0.id].result.ok && r.data.result === null, 'Stand der Abgaben lesbar, Ergebnis erst am Schluss');
  r = await stud('POST', '/api/exams/' + id + '/submit', {});
  const want = Math.round((0.7 + 0.3 * (built.questions.length - 1) / built.questions.length) * 1000) / 1000;
  ok(r.status === 200 && r.data.exam.state === 'submitted' && r.data.result.passed && r.data.result.distinction && Math.abs(r.data.result.score - want) < 1e-9, 'abgeschlossen: bestanden mit Auszeichnung, Punkte 70/30', r.data.result);
  ok(r.data.result.perTask.length === built.tasks.length && r.data.result.theoryRight === built.questions.length - 1, 'Ergebnis mit Aufgaben und Theorie');
  ok((await stud('POST', '/api/exams/' + id + '/answer', { item: t0.id, answer: a0 })).status === 409, 'nach dem Abschluss keine Abgabe mehr');
  r = await stud('POST', '/api/exams', { quest: 'dq', level: 'grund' }); ok(r.status === 429 && r.data.nextAt > Date.now(), 'Wartefrist 24 h', r.data);
  r = await stud('GET', '/api/exams'); ok(r.data.exams.length === 1 && r.data.exams[0].passed, 'Liste meiner Pruefungen');

  /* ===== 3 Zertifikat ===== */
  ok((await stud('POST', '/api/certificates', { examId: id, holderName: 'Bea Blitz' })).status === 400, 'ohne Einwilligung kein Zertifikat');
  ok((await stud('POST', '/api/certificates', { examId: id, holderName: '<b>x</b>', consent: true })).status === 400, 'Name mit Sonderzeichen abgewiesen');
  ok((await stud2('POST', '/api/certificates', { examId: id, holderName: 'Fritz Funke', consent: true })).status === 404, 'fremde Pruefung: kein Zertifikat');
  r = await stud('POST', '/api/certificates', { examId: id, holderName: 'Bea  Blitz', consent: true });
  ok(r.status === 201 && /^DQ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(r.data.certificate.code) && r.data.certificate.holder === 'Bea Blitz' && r.data.certificate.title === 'Digital Quest – Grundstufe' && r.data.certificate.distinction, 'Zertifikat ausgestellt', r.data);
  const code = r.data.certificate.code;
  ok((await stud('POST', '/api/certificates', { examId: id, holderName: 'Anders', consent: true })).data.certificate.code === code, 'zweites Ausstellen liefert dasselbe Zertifikat');
  r = await anon('GET', '/api/certificates/' + code); ok(r.status === 200 && r.data.status === 'valid' && r.data.holder === 'Bea Blitz' && r.data.score === Math.round(want * 100) && r.data.proctored === false, 'oeffentliche Abfrage: gueltig', r.data);
  ok((await anon('GET', '/api/certificates/DQ-AAAA-AAAA')).data.status === 'unknown', 'unbekannter Code');
  r = await anon('GET', '/z/' + code); ok(r.status === 200 && /Zertifikat gültig/.test(r.text) && /Bea Blitz/.test(r.text) && /DIGITAL QUEST/.test(r.text) && !/SPS|Siemens/.test(r.text), 'Pruefseite /z/Code');
  ok((await anon('GET', '/z/' + code.toLowerCase())).status === 200, 'Pruefseite: Kleinschreibung egal');
  r = await anon('GET', '/z/DQ-AAAA-AAAA'); ok(r.status === 404 && /unbekannt/.test(r.text), 'Pruefseite fuer unbekannten Code');
  r = await anon('GET', '/z/%3Cscript%3E'); ok(r.text === 'seite' || !/<script>/.test(r.text), 'Pruefseite gibt keinen fremden Code aus');
  r = await stud('GET', '/api/certificates/mine'); ok(r.data.certificates.length === 1 && r.data.certificates[0].status === 'valid', 'meine Zertifikate');
  r = await teacher('GET', '/api/classes/' + cid + '/certificates'); ok(r.status === 200 && r.data.certificates.length === 1 && r.data.certificates[0].username === 'blitz' && r.data.exams.length === 1, 'Dozent sieht Zertifikate der Klasse', r.data);
  ok((await stud('GET', '/api/classes/' + cid + '/certificates')).status === 403, 'Lernende sehen die Klassenliste der Zertifikate nicht');
  r = await admin('GET', '/api/admin/certificates'); ok(r.data.stats.exams === 1 && r.data.stats.passed === 1 && r.data.certificates.length === 1, 'Administration: Kennzahlen und Liste', r.data);

  /* ===== 4 Profi-Stufe unter Aufsicht ===== */
  r = await stud('GET', '/api/exams/eligibility?quest=dq'); ok(r.data.levels.grund.certificate === code && !r.data.levels.profi.ok && !r.data.levels.profi.missing.some(x => /Grundstufe/.test(x)), 'Grundstufe erledigt, Profi wartet auf den Fortschritt', r.data.levels);
  ok((await stud('POST', '/api/exam-sessions', { quest: 'dq', level: 'profi' })).status === 403, 'Lernende legen keine Pruefungssitzung an');
  r = await teacher('POST', '/api/exam-sessions', { quest: 'dq', level: 'profi', classId: cid, minutes: 60 });
  ok(r.status === 201 && /^[A-Z0-9]{6}$/.test(r.data.code), 'Pruefung unter Aufsicht angelegt', r.data);
  const sess = r.data;
  ok((await stud('POST', '/api/exams', { sessionCode: 'XXXXXX' })).status === 404, 'falscher Pruefungscode');
  ok((await stud2('POST', '/api/exams', { sessionCode: sess.code })).status === 403, 'ohne Zertifikat der Grundstufe keine Profi-Pruefung (auch unter Aufsicht)');
  r = await stud('POST', '/api/exams', { sessionCode: sess.code.toLowerCase() });
  ok(r.status === 201 && r.data.exam.level === 'profi' && r.data.exam.proctored && /K\. Keller, BBZ, EL 1a/.test(r.data.exam.proctor) && r.data.tasks.length === Exam.RULES.profi.tasks, 'Beitritt mit Code: Voraussetzungen aus dem Spiel entfallen', r.data.exam);
  const id2 = r.data.exam.id;
  ok(r.data.exam.deadline <= sess.closesAt, 'Frist endet spaetestens mit dem Fenster');
  const b2 = Exam.build(JSON.parse(R.prepare('SELECT items FROM exams WHERE id = ?').get(id2).items));
  await stud('POST', '/api/exams/' + id2 + '/answer', { item: b2.tasks[0].id, answer: Exam.refAnswer(b2.tasks[0]) });
  r = await teacher('GET', '/api/exam-sessions/' + sess.id); ok(r.data.exams.length === 1 && r.data.exams[0].username === 'blitz' && r.data.exams[0].tasksDone === 1 && r.data.exams[0].state === 'running', 'Dozent sieht den Stand live', r.data);
  // Zeit abgelaufen: Abgabe wird verweigert, die Pruefung zaehlt mit dem Stand
  R.prepare('UPDATE exams SET deadline = ? WHERE id = ?').run(Date.now() - 60000, id2);
  ok((await stud('POST', '/api/exams/' + id2 + '/answer', { item: b2.tasks[1].id, answer: Exam.refAnswer(b2.tasks[1]) })).status === 409, 'nach Ablauf keine Abgabe mehr');
  r = await stud('GET', '/api/exams/' + id2); ok(r.data.exam.state === 'expired' && r.data.result && !r.data.result.passed && r.data.result.weakChapters.length > 0, 'abgelaufen: bewertet, nicht bestanden, schwache Kapitel genannt', r.data.result);
  ok((await stud('POST', '/api/certificates', { examId: id2, holderName: 'Bea Blitz', consent: true })).status === 409, 'nicht bestanden: kein Zertifikat');
  ok((await teacher('DELETE', '/api/exam-sessions/' + sess.id)).status === 200 && (await stud2('POST', '/api/exams', { sessionCode: sess.code })).status === 403, 'Fenster geschlossen');
  r = await teacher('GET', '/api/exam-sessions'); ok(r.data.sessions.length === 1 && r.data.sessions[0].participants === 1, 'Liste der Sitzungen');

  /* ===== 5 Annullieren, widerrufen, zurueckziehen, Konto loeschen ===== */
  ok((await teacher('POST', '/api/exams/' + id + '/void', {})).status === 400, 'Annullieren braucht eine Begruendung');
  ok((await stud2('POST', '/api/exams/' + id + '/void', { reason: 'x' })).status === 403, 'Lernende annullieren nicht');
  r = await teacher('POST', '/api/exams/' + id + '/void', { reason: 'Hilfe vom Nachbarn' }); ok(r.status === 200, 'Dozent annulliert die Pruefung');
  r = await anon('GET', '/api/certificates/' + code); ok(r.data.status === 'revoked' && r.data.holder === undefined, 'Zertifikat widerrufen, Name nicht mehr sichtbar', r.data);
  ok(/widerrufen/.test((await anon('GET', '/z/' + code)).text), 'Pruefseite zeigt widerrufen');
  // neues Zertifikat ueber eine direkt eingetragene bestandene Pruefung
  const mk = uid => Number(R.prepare("INSERT INTO exams (user_id, quest, level, seed, items, state, started_at, deadline, ended_at, score, passed, distinction, detail) VALUES (?, 'dq', 'grund', 's', '{\"tasks\":[],\"questions\":[]}', 'submitted', ?, ?, ?, 0.8, 1, 0, '{}')").run(uid, Date.now() - 40 * 864e5, Date.now() - 40 * 864e5, Date.now() - 40 * 864e5).lastInsertRowid);
  const e3 = mk(sid2);
  r = await stud2('POST', '/api/certificates', { examId: e3, holderName: 'Fritz Funke', consent: true }); const code2 = r.data.certificate.code;
  ok(r.status === 201 && !r.data.certificate.distinction && r.data.certificate.score === 80, 'zweites Zertifikat', r.data);
  ok((await teacher('POST', '/api/certificates/' + code2 + '/revoke', { reason: 'x' })).status === 403, 'Widerrufen darf nur der Admin');
  ok((await stud('DELETE', '/api/certificates/' + code2)).status === 404, 'fremdes Zertifikat nicht zurueckziehbar');
  ok((await stud2('DELETE', '/api/certificates/' + code2)).status === 200, 'Zertifikat zurueckgezogen');
  r = await anon('GET', '/api/certificates/' + code2); ok(r.data.status === 'withdrawn' && !r.data.holder && R.prepare('SELECT holder_name FROM certificates WHERE id = ?').get(code2).holder_name === '', 'zurueckgezogen: Name geloescht', r.data);
  const e4 = mk(sid2); r = await stud2('POST', '/api/certificates', { examId: e4, holderName: 'Fritz Funke', consent: true }); const code3 = r.data.certificate.code;
  ok((await admin('POST', '/api/certificates/' + code3 + '/revoke', { reason: 'Test' })).status === 200 && (await anon('GET', '/api/certificates/' + code3)).data.status === 'revoked', 'Admin widerruft');
  const e5 = mk(sid2); r = await stud2('POST', '/api/certificates', { examId: e5, holderName: 'Fritz Funke', consent: true }); const code4 = r.data.certificate.code;
  ok((await stud2('DELETE', '/api/me', { password: 'geheim2' })).status === 200, 'Konto geloescht');
  r = await anon('GET', '/api/certificates/' + code4); ok(r.data.status === 'valid' && r.data.holder === 'Fritz Funke', 'Zertifikat bleibt nach dem Loeschen des Kontos pruefbar', r.data);
  ok(!R.prepare('SELECT 1 FROM exams WHERE user_id = ?').get(sid2) && R.prepare('SELECT user_id FROM certificates WHERE id = ?').get(code4).user_id === null, 'Pruefungen geloescht, Zertifikat ohne Bezug zum Konto');

  /* ===== 6 Abfragen der Pruefseite sind begrenzt ===== */
  const many = client('10.2.9.9'); let lim = 0;
  for (let i = 0; i < 64; i++) if ((await many('GET', '/api/certificates/DQ-AAAA-AAAA')).status === 429) lim++;
  ok(lim > 0 && lim < 10, 'mehr als 60 Abfragen pro Minute: 429', lim);

  console.log(`Pruefungs-Tests: ${pass} ok, ${failN} Fehler`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

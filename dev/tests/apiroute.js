// Testaufbau ohne Cloudflare: Eine Playwright-Seite bekommt die ganze Website unter https://dq.test –
// /api/* beantwortet der echte Worker-Code (worker/index.js) mit einem D1-Nachbau (node:sqlite),
// alles andere kommt aus dem Ordner web/ (wie die Static Assets bei Cloudflare).
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const { d1 } = require('./d1mock.js');
const SITE = 'https://dq.test', WEB = path.join(__dirname, '../../web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css' };
function asset(req) {
  let p = decodeURIComponent(new URL(req.url).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(WEB, p);
  if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('Nicht gefunden', { status: 404 });
  return new Response(fs.readFileSync(f), { headers: { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' } });
}
async function attachSite(target, env) {
  const W = (await import(pathToFileURL(path.join(__dirname, '../../worker/index.js')))).default;
  const L = await import(pathToFileURL(path.join(__dirname, '../../worker/lib.js')));
  const DB = await import(pathToFileURL(path.join(__dirname, '../../worker/db.js')));
  DB.resetSchemaCache();
  env = Object.assign({ DB: d1(), ADMIN_USER: 'chef', ADMIN_PASSWORD: 'admin-test', ASSETS: { fetch: asset } }, env || {});
  await target.route(SITE + '/**', async route => {
    const q = route.request(), h = Object.assign({}, await q.allHeaders(), { 'cf-connecting-ip': '10.1.1.1' });
    delete h[':authority']; delete h[':method']; delete h[':path']; delete h[':scheme'];
    const res = await W.fetch(new Request(q.url(), { method: q.method(), headers: h, body: ['GET', 'HEAD'].includes(q.method()) ? undefined : q.postData() }), env, {});
    const headers = {}; res.headers.forEach((v, k) => { headers[k] = v; });
    await route.fulfill({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) });
  });
  // Konto direkt in der Datenbank anlegen (fuer Tests: ohne den Weg ueber Admin und Startpasswort)
  const addUser = async (username, password, role, classId) => {
    await W.fetch(new Request(SITE + '/api/health'), env, {}); // Tabellen anlegen
    const r = env.DB.raw.prepare('INSERT INTO users (username, pw, role, class_id, created_at, notice_ack, must_change) VALUES (?, ?, ?, ?, ?, 1, 0)').run(username, await L.hashPassword(password), role, classId || null, Date.now());
    return Number(r.lastInsertRowid);
  };
  const addClass = (name, teacherId, code) => Number(env.DB.raw.prepare('INSERT INTO classes (name, teacher_id, code, self_signup, created_at) VALUES (?, ?, ?, 1, ?)').run(name, teacherId, code, Date.now()).lastInsertRowid);
  return { env, addUser, addClass, SITE };
}
module.exports = { attachSite, SITE };

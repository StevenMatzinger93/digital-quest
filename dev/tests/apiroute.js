// Verbindet eine Playwright-Seite mit dem echten Worker-Code (worker/index.js) und einem D1-Nachbau (node:sqlite).
// Die Seite wird mit ?api=https://api.test geladen; alle Anfragen dorthin beantwortet der Worker in Node.
const path = require('path'), { pathToFileURL } = require('url');
const { d1 } = require('./d1mock.js');
async function attachApi(target, env) {
  const W = await import(pathToFileURL(path.join(__dirname, '../../worker/index.js')));
  env = env || { DB: d1(), ADMIN_USER: 'admin', ADMIN_PASSWORD: 'admin-test' };
  await target.route('https://api.test/**', async route => {
    const q = route.request(), h = Object.assign({}, q.headers(), { 'cf-connecting-ip': '10.1.1.1' });
    const res = await W.handle(new Request(q.url(), { method: q.method(), headers: h, body: ['GET', 'HEAD'].includes(q.method()) ? undefined : q.postData() }), env);
    const headers = {}; res.headers.forEach((v, k) => { headers[k] = v; });
    await route.fulfill({ status: res.status, headers, body: await res.text() });
  });
  return { W, env };
}
module.exports = { attachApi, API: 'https://api.test' };

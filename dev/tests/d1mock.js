// D1-Nachbau fuer Tests: dieselbe Schnittstelle wie Cloudflare D1 (prepare/bind/first/all/run, batch), gespeichert in node:sqlite.
// Die Tabellen legt der Worker selbst an (worker/db.js). d1({fixture}) spielt vorher eine SQL-Datei ein (z. B. den Altbestand).
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
function d1(opts) {
  opts = opts || {};
  const db = new DatabaseSync(opts.file || ':memory:');
  if (opts.fixture) db.exec(fs.readFileSync(opts.fixture, 'utf8'));
  const plain = o => o && Object.assign({}, o);
  const fix = a => a.map(v => v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
  function stmt(sql, args) {
    return {
      bind: (...a) => stmt(sql, fix(a)),
      first: async col => { const r = plain(db.prepare(sql).get(...args)); return r ? (col ? r[col] : r) : null; },
      all: async () => ({ results: db.prepare(sql).all(...args).map(plain), success: true }),
      run: async () => { const i = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(i.changes), last_row_id: Number(i.lastInsertRowid) } }; },
      _run: () => db.prepare(sql).run(...args)
    };
  }
  return {
    prepare: sql => stmt(sql, []),
    batch: async list => {
      db.exec('BEGIN');
      try { const r = list.map(s => { const i = s._run(); return { success: true, meta: { changes: Number(i.changes), last_row_id: Number(i.lastInsertRowid) } }; }); db.exec('COMMIT'); return r; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    raw: db
  };
}
module.exports = { d1 };

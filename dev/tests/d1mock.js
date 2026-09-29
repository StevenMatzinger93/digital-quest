// D1-Nachbau fuer Tests: dieselbe Schnittstelle wie Cloudflare D1 (prepare/bind/first/all/run, batch), gespeichert in node:sqlite.
// Spielt alle Migrationen aus ../../migrations ein. Fremdschluessel an (wie D1).
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');
function d1(file) {
  const db = new DatabaseSync(file || ':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const dir = path.join(__dirname, '../../migrations');
  fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort().forEach(f => db.exec(fs.readFileSync(path.join(dir, f), 'utf8')));
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
      try { const r = list.map(s => ({ success: true, meta: { changes: Number(s._run().changes) } })); db.exec('COMMIT'); return r; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    raw: db
  };
}
module.exports = { d1 };

// Digital Quest — Vorgaben vom Dozent (eigene Funktion, gibt es bei SPS Quest nicht).
// Eine Zeile = ein Ziel (ganzes Kapitel 'kapitel' oder eine Station 'aufgabe') an eine Klasse ODER eine Person, optional mit Frist.
// Mehrfachauswahl legt mehrere Zeilen an; dasselbe Ziel an denselben Empfaenger aktualisiert nur die Frist.
// Nichts wird gesperrt – die Frist ist Erinnerung. Den Erledigt-Stand rechnet das Portal aus summary.done der Lernenden.
import { json, fail, now, cleanText } from './lib.js';

const ID_RE = /^[A-Za-z0-9.]{1,12}$/;

export async function assignRoutes(C, p, m, H){
  if(!p.startsWith('/api/assignments') && !/^\/api\/classes\/\d+\/assignments$/.test(p)) return null;
  C.user = await H.currentUser(C);
  if(!C.user) fail(401, 'Nicht angemeldet.');
  let mm;
  if(p === '/api/assignments/mine' && m === 'GET') return mine(C);
  if(p === '/api/assignments' && m === 'POST') return create(C, H);
  if((mm = p.match(/^\/api\/classes\/(\d+)\/assignments$/)) && m === 'GET') return listForClass(C, H, +mm[1]);
  if((mm = p.match(/^\/api\/assignments\/(\d+)$/))){
    if(m === 'PATCH') return patch(C, H, +mm[1]);
    if(m === 'DELETE') return remove(C, H, +mm[1]);
  }
  fail(404, 'Unbekannte Adresse.');
}

function dueDate(v){
  if(v === null || v === undefined || v === '') return null;
  const s = String(v);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) fail(400, 'Frist im Format JJJJ-MM-TT.');
  return s;
}
function targets(list){
  if(!Array.isArray(list) || !list.length || list.length > 200) fail(400, 'Bitte mindestens ein Kapitel oder eine Station wählen.');
  return list.map(z => {
    const type = z && z.type, id = cleanText(z && z.id, 12);
    if(type !== 'kapitel' && type !== 'aufgabe') fail(400, 'Ziel-Typ muss kapitel oder aufgabe sein.');
    if(!ID_RE.test(id)) fail(400, 'Ungültige Kapitel- oder Stations-Nummer.');
    return { type, id };
  });
}
const pub = a => ({ id: a.id, type: a.target_type, target: a.target_id, classId: a.class_id, userId: a.user_id, username: a.username || null, due: a.due, createdAt: a.created_at });

async function create(C, H){
  H.requireRole(C, 'teacher', 'admin');
  const b = C.body, ts = targets(b.targets), due = dueDate(b.due);
  const to = [];
  if(b.classId){ const c = await H.ownClass(C, +b.classId); to.push({ col: 'class_id', id: c.id }); }
  else if(Array.isArray(b.studentIds) && b.studentIds.length){
    if(b.studentIds.length > 200) fail(400, 'Zu viele Empfänger.');
    for(const id of b.studentIds){ const s = await H.studentOf(C, +id); to.push({ col: 'user_id', id: s.id }); }
  } else fail(400, 'Bitte eine Klasse oder einzelne Lernende wählen.');
  const ids = [];
  for(const t of ts) for(const e of to){
    const ex = await C.db.prepare('SELECT id FROM assignments WHERE teacher_id = ? AND target_type = ? AND target_id = ? AND ' + e.col + ' = ?').bind(C.user.id, t.type, t.id, e.id).first();
    if(ex){ await C.db.prepare('UPDATE assignments SET due = ? WHERE id = ?').bind(due, ex.id).run(); ids.push(ex.id); continue; }
    const r = await C.db.prepare('INSERT INTO assignments (teacher_id, quest, target_type, target_id, class_id, user_id, due, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(C.user.id, 'dq', t.type, t.id, e.col === 'class_id' ? e.id : null, e.col === 'user_id' ? e.id : null, due, now()).run();
    ids.push(r.meta.last_row_id);
  }
  return json({ ids }, 201);
}
// Alle Vorgaben einer Klasse: an die ganze Klasse und an einzelne Lernende der Klasse
async function listForClass(C, H, id){
  const c = await H.ownClass(C, id);
  const r = await C.db.prepare(`SELECT a.*, u.username FROM assignments a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.class_id = ? OR u.class_id = ? ORDER BY a.due IS NULL, a.due, a.created_at`).bind(c.id, c.id).all();
  return json({ assignments: (r.results || []).map(pub) });
}
async function own(C, H, id){
  H.requireRole(C, 'teacher', 'admin');
  const a = await C.db.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first();
  if(!a || (C.user.role !== 'admin' && a.teacher_id !== C.user.id)) fail(404, 'Vorgabe nicht gefunden.');
  return a;
}
async function patch(C, H, id){
  const a = await own(C, H, id);
  await C.db.prepare('UPDATE assignments SET due = ? WHERE id = ?').bind(dueDate(C.body.due), a.id).run();
  return json({ ok: true });
}
async function remove(C, H, id){
  const a = await own(C, H, id);
  await C.db.prepare('DELETE FROM assignments WHERE id = ?').bind(a.id).run();
  return json({ ok: true });
}
// Lernende: eigene Vorgaben (an die Klasse und an mich)
async function mine(C){
  if(C.user.role !== 'student') return json({ assignments: [] });
  const r = await C.db.prepare(`SELECT a.*, t.username AS teacher, t.display_name AS teacher_name FROM assignments a JOIN users t ON t.id = a.teacher_id
      WHERE a.class_id = ? OR a.user_id = ? ORDER BY a.due IS NULL, a.due, a.created_at`).bind(C.user.class_id || -1, C.user.id).all();
  return json({ assignments: (r.results || []).map(a => ({ id: a.id, type: a.target_type, target: a.target_id, due: a.due, createdAt: a.created_at,
    teacher: a.teacher_name || a.teacher, forMe: !!a.user_id })) });
}
export async function wipeAssignments(C, classId){
  await C.db.prepare('DELETE FROM assignments WHERE class_id = ?').bind(classId).run();
}

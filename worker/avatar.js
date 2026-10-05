// Digital Quest — Avatare und Coins (Auftrag 05.10.2026, Paket A; übernommen aus SPS Quest, docs/AVATAR_SYSTEM_TRANSFER.md Teil C2).
// Coins sind nur verdienbar und rein kosmetisch: Stand = aus dem synchronisierten Spielstand berechnet (Aufgaben nach Sternen,
// Kapitel-Boss 10.10, Final Boss 15.10, Theorie) + Prämien im coin_ledger (Live-Challenge, Zertifikat) − Käufe im coin_ledger.
// Kein Geld, kein Spielvorteil. Kollektionen = Teile I–V der Karte (AVATAR_META aus dev/build.js).
import { json, fail, now, cleanText } from './lib.js';
import { Avatar, AVATAR_META, FINAL_TASKS } from './gen/avatar_bundle.js';
import { Engine } from './gen/exam_bundle.js';
import { rank, livePoints } from './challenge.js';

export async function avatarRoutes(C, p, m, H){
  if(!p.startsWith('/api/avatar')) return null;
  C.user = await H.currentUser(C);
  if(!C.user) fail(401, 'Nicht angemeldet.');
  if(p === '/api/avatar' && m === 'GET') return getOwn(C);
  if(p === '/api/avatar' && m === 'PUT') return saveOwn(C);
  if(p === '/api/avatar/buy' && m === 'POST') return buy(C);
  fail(404, 'Unbekannte Adresse.');
}

async function ledgerOf(C, uid){
  return ((await C.db.prepare('SELECT amount, source, ref, created_at FROM coin_ledger WHERE user_id = ? ORDER BY id').bind(uid).all()).results || []);
}
// Stations-ID → Kollektion (Aufgaben und Theorien je Teil, aus AVATAR_META.$.ids / theoryIds)
let COLL = null;
function collOf(){
  if(COLL) return COLL;
  COLL = { task: {}, theory: {} };
  Object.keys(AVATAR_META).forEach(q => { const $ = AVATAR_META[q].$ || {}; ($.ids || []).forEach(id => { COLL.task[id] = q; }); ($.theoryIds || []).forEach(id => { COLL.theory[id] = q; }); });
  return COLL;
}
// Spielstand von Digital Quest (done, doneInfo {stars, revealed, solution}, theory) → Form des Avatar-Kerns je Kollektion
// (doneTasks[id] = {stars, revealed}, doneTheory[id] = true). „Lösung zeigen“ oder aufgedeckte Messwerte → Satz „revealed“.
async function progressOf(C, uid){
  const rows = (await C.db.prepare('SELECT quest, state FROM progress WHERE user_id = ?').bind(uid).all()).results || [];
  const out = {}, M = collOf();
  Object.keys(AVATAR_META).forEach(q => { out[q] = { doneTasks: {}, doneTheory: {} }; });
  rows.forEach(r => {
    try{
      const s = JSON.parse(r.state || '{}'), done = s.done || {}, info = s.doneInfo || {};
      Object.keys(done).forEach(id => {
        if(!done[id]) return;
        if(M.theory[id]) out[M.theory[id]].doneTheory[id] = true;
        else if(M.task[id]){ const d = info[id] || {}; out[M.task[id]].doneTasks[id] = { stars: d.stars || 1, revealed: !!(d.solution || d.revealed) }; }
      });
    }catch(e){ /* kaputter Spielstand zählt nicht */ }
  });
  return out;
}
async function certsOf(C, uid){
  return ((await C.db.prepare('SELECT quest, level FROM certificates WHERE user_id = ? AND revoked_at IS NULL').bind(uid).all()).results || []);
}
// Challenge-Statistik – nur serverseitig: eine Challenge zählt, wenn sie beendet ist, ≥ 3 Teilnehmende hatte und ≥ 2 min lief
// (gestartet wird sie immer von einer Lehrperson); jede Leistung höchstens einmal je Challenge. Digital Quest kennt (noch) kein
// Sudden Death und keine Mehrfach-Aufgaben: wins = Platz 1 nach rank(), flawless = gelöst ohne Fehlversuch und Tipp, sdWins = 0.
export const CH_RULES = { minPlayers: 3, minMs: 120000 };
export async function challengeStats(C, uid){
  const out = { challenges: 0, podium: 0, wins: 0, sdWins: 0, bugFixed: 0, flawless: 0 };
  const chs = ((await C.db.prepare("SELECT c.* FROM challenges c JOIN challenge_players me ON me.challenge_id = c.id AND me.user_id = ? WHERE c.state = 'ended' AND c.started_at IS NOT NULL AND COALESCE(c.ended_at, c.ends_at) - c.started_at >= ?")
    .bind(uid, CH_RULES.minMs).all()).results || []);
  for(let i = 0; i < chs.length; i += 90){
    const part = chs.slice(i, i + 90), ids = part.map(c => c.id);
    const rows = ((await C.db.prepare('SELECT * FROM challenge_players WHERE challenge_id IN (' + ids.map(() => '?').join(',') + ')').bind(...ids).all()).results || []);
    part.forEach(ch => {
      const pl = rows.filter(r => r.challenge_id === ch.id); if(pl.length < CH_RULES.minPlayers) return;
      const ranked = rank(pl.map(p => Object.assign(p, { points: p.points || livePoints(ch, p) }))), me = ranked.find(p => p.user_id === uid);
      if(!me) return;
      const solved = !!me.solved_at;
      out.challenges++;
      if(me.rank && me.rank <= 3) out.podium++;
      if(me.rank === 1) out.wins++;
      if(ch.mode === 'bug' && solved) out.bugFixed++;
      if(solved && !me.hints && (me.attempts || 0) <= 1) out.flawless++;
    });
  }
  return out;
}
export async function coinState(C, uid){
  const [prog, ledger, certs, stats] = await Promise.all([progressOf(C, uid), ledgerOf(C, uid), certsOf(C, uid), challengeStats(C, uid)]);
  return Avatar.balance(prog, AVATAR_META, ledger, certs, stats);
}
// Boss-Aufgaben serverseitig nachprüfen: der mit dem Konto gespeicherte Entwurf (progress.state.drafts[id] = {layout, answers})
// muss die Tests der Aufgabe bestehen (Engine.runTask). Gilt für Teile mit Bedingung final (15.10) oder bosses (10.10, 15.10).
const BOSS_IDS = Object.keys(FINAL_TASKS), FINAL_ID = BOSS_IDS.find(id => FINAL_TASKS[id].final) || '15.10';
async function verifiedBosses(C, uid, ids){
  const ok = {}; ids.forEach(id => { ok[id] = false; });
  const rows = (await C.db.prepare('SELECT state FROM progress WHERE user_id = ?').bind(uid).all()).results || [];
  rows.forEach(r => {
    let drafts = {}; try{ drafts = JSON.parse(r.state || '{}').drafts || {}; }catch(e){ return; }
    ids.forEach(id => {
      const d = drafts[id], t = FINAL_TASKS[id]; if(ok[id] || !t || !d || !d.layout) return;
      try{ ok[id] = !!Engine.runTask(t, d.layout, d.answers || {}).pass; }catch(e){ ok[id] = false; }
    });
  });
  return ok;
}
async function checkBossUnlock(C, uid, it){
  const u = it.unlock || {};
  if(!u.final && !u.bosses) return;
  const ids = u.final && !u.bosses ? [FINAL_ID] : BOSS_IDS;
  const v = await verifiedBosses(C, uid, ids), good = ids.filter(id => v[id]).length;
  if(u.final && !v[FINAL_ID]) fail(403, 'Deine Lösung des Final Boss 15.10 besteht die Tests nicht oder ist noch nicht mit deinem Konto gespeichert.');
  if(u.bosses && good < u.bosses) fail(403, 'Nur ' + good + ' von ' + u.bosses + ' Boss-Lösungen (10.10, 15.10) bestehen die Tests auf dem Server – im Labor mit dem Konto speichern.');
}
// Bestandenes Zertifikat → Coins (+900, mit Auszeichnung +1500), einmal je Quest und Stufe; bleibt beim Zurückziehen
export async function awardCert(C, uid, quest, level, distinction){
  const R = Avatar.RULES.cert;
  await C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(uid, distinction ? R.distinction : R.pass, 'zertifikat', quest + ':' + level, now()).run();
}
export async function avatarOf(C, uid){
  const r = await C.db.prepare('SELECT animal, color, equip FROM avatars WHERE user_id = ?').bind(uid).first();
  return r ? Avatar.normalize({ animal: r.animal, color: r.color, equip: JSON.parse(r.equip || '{}') }) : null;
}
// Avatare vieler Konten (Klassenliste, Challenge) – null = noch kein Avatar gewählt (Platzhalter)
export async function avatarsFor(C, ids){
  const out = {}; ids = [...new Set(ids.filter(Boolean))];
  for(let i = 0; i < ids.length; i += 90){
    const part = ids.slice(i, i + 90);
    const rows = (await C.db.prepare('SELECT user_id, animal, color, equip FROM avatars WHERE user_id IN (' + part.map(() => '?').join(',') + ')').bind(...part).all()).results || [];
    rows.forEach(r => { out[r.user_id] = Avatar.normalize({ animal: r.animal, color: r.color, equip: JSON.parse(r.equip || '{}') }); });
  }
  return out;
}
async function getOwn(C){
  const [av, coins] = await Promise.all([avatarOf(C, C.user.id), coinState(C, C.user.id)]);
  return json({ avatar: av, chosen: !!av, coins: { balance: coins.balance, earned: coins.earned, speedrun: coins.speedrun, spent: coins.spent }, owned: coins.owned, unlock: coins.ctx, rules: Avatar.RULES,
    shopSet: Avatar.shopSetOf(now()), chRules: CH_RULES, sets: Object.keys(AVATAR_META).map(q => ({ key: q, tasks: AVATAR_META[q].$.tasks, theory: AVATAR_META[q].$.theoryAll })) });
}
const owns = (id, coins) => Avatar.owns(id, coins.owned, coins.ctx);
async function saveOwn(C){
  const b = C.body || {};
  const coins = await coinState(C, C.user.id);
  const av = Avatar.normalize({ animal: b.animal, color: b.color, equip: b.equip });
  for(const s of Object.keys(av.equip)){
    const id = av.equip[s], it = Avatar.item(id);
    if(!owns(id, coins)) fail(403, '„' + it.name + '“ gehört dir noch nicht.');
    if(it.earnOnly) await checkBossUnlock(C, C.user.id, it);   // nur verdienbare Teile (Krone): Boss-Lösungen auf dem Server bestätigen
  }
  await C.db.prepare('INSERT INTO avatars (user_id, animal, color, equip, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET animal = excluded.animal, color = excluded.color, equip = excluded.equip, updated_at = excluded.updated_at')
    .bind(C.user.id, av.animal, av.color, JSON.stringify(av.equip), now()).run();
  return json({ avatar: av });
}
async function buy(C){
  const id = cleanText(C.body.item, 40), it = Avatar.item(id);
  if(!it || it.hidden) fail(404, 'Diesen Gegenstand gibt es nicht.');
  const coins = await coinState(C, C.user.id);
  if(owns(id, coins)) return json({ ok: true, owned: true, balance: coins.balance });
  if(it.earnOnly) fail(403, '„' + it.name + '“ kann man nicht kaufen, nur verdienen: ' + Avatar.unlockText(id, coins.ctx) + '.');
  if(!Avatar.onSale(id, now())) fail(403, '„' + it.name + '“ gibt es nur im Monats-Schaufenster – es kommt später wieder.');
  if(!Avatar.isUnlocked(id, coins.ctx)) fail(403, 'Noch gesperrt – ' + it.name + ': ' + Avatar.unlockText(id, coins.ctx) + '.');
  // Boss-Aufgaben: der lokale Spielstand allein reicht nicht – der gespeicherte Entwurf muss die Tests bestehen
  await checkBossUnlock(C, C.user.id, it);
  if(coins.balance < it.price) fail(400, 'Dafür reichen deine Coins noch nicht (' + coins.balance + ' von ' + it.price + ').');
  await C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(C.user.id, -it.price, 'kauf', id, now()).run();
  return json({ ok: true, owned: true, balance: coins.balance - it.price });
}
// Prämie beim Ende einer Challenge (Modus 'sprint', mindestens 2 Teilnehmende): Rang 1–3 und „gelöst“; einmal pro Challenge (UNIQUE im coin_ledger).
// ranked = Spieler mit points und rank (challenge.js rank()). Teilnahme +5 nur, wenn die Challenge zählt (≥ 3 Teilnehmende, ≥ 2 min).
export async function awardSpeedrun(C, ch, ranked){
  const R = Avatar.RULES.speedrun, t = now(), stmts = [];
  if(ranked.length >= CH_RULES.minPlayers && ch.started_at && (ch.ended_at || t) - ch.started_at >= CH_RULES.minMs)
    await C.db.batch(ranked.map(p => C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(p.user_id, R.teilnahme || 5, 'teilnahme', 't:' + ch.id, t)));
  if(ch.mode !== 'sprint' || ranked.length < 2) return;
  ranked.forEach(p => {
    if(!p.solved_at) return;
    const r = p.rank && p.rank <= 3 ? p.rank : 0;
    stmts.push(C.db.prepare('INSERT OR IGNORE INTO coin_ledger (user_id, amount, source, ref, created_at) VALUES (?, ?, ?, ?, ?)').bind(p.user_id, r ? R[r] : R.solved, 'speedrun', (r ? 'r' + r : 's') + ':' + ch.id, t));
  });
  if(stmts.length) await C.db.batch(stmts);
}

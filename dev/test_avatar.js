// Avatare und Coins (Paket A, 05.10.2026): Kern-Logik (Katalog, Seltenheit, Preise, Zeichnung, Freischaltregeln, Wirtschaft) und
// Worker-API gegen den D1-Nachbau (Stand aus dem Spielstand, Kauf, Sperren, Boss-Prüfung auf dem Server, Challenge-Prämien und
// -Statistik, Zertifikats-Coins, Konto löschen). Aufruf: node test_avatar.js   (braucht worker/gen/*.js aus build.js)
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const { d1 } = require('./tests/d1mock.js');
const A = require('./src/avatar_core.js');
let pass = 0, failN = 0;
const ok = (c, m, info) => { if (c) pass++; else { failN++; console.log('FEHLER', m, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } };

/* ===== 1 Katalog ===== */
const BAND = { gewoehnlich: [0, 150], selten: [250, 500], episch: [800, 1500], legendaer: [2000, 3500], mythisch: [4000, 8000] };
// Bedingungen, die der Server bestätigt (Zertifikate, Challenge-Statistik, Boss-Lösungen) oder aus dem ganzen Spielstand rechnet
const SERVER = ['cert', 'certs', 'profiCerts', 'challenges', 'podium', 'wins', 'sdWins', 'bugFixed', 'flawless', 'final', 'bosses', 'setsAll', 'messenAll', 'messenClean'];
const ids = Object.keys(A.ITEMS);
ok(Object.keys(A.SETS).join() === 'elektro,digital,kombi,praxis,messen', 'fünf Kollektionen = Teile I–V');
ok(A.RULES.star.join() === '30,45,60' && A.RULES.revealed === 10 && A.RULES.boss === 120 && A.RULES.final === 300 && A.RULES.theory === 30 && A.RULES.cert.pass === 900 && A.RULES.cert.distinction === 1500, 'Coin-Regeln ×3');
ok(A.RULES.speedrun[1] === 60 && A.RULES.speedrun.teilnahme === 5, 'Challenge-Prämien unverändert');
ids.forEach(id => {
  const it = A.ITEMS[id];
  ok(A.SLOTS[it.slot] && A.RARITY[it.rarity], id + ': Platz und Seltenheit gültig');
  if (!['titel'].includes(it.slot) && !it.earnOnly && !['kette_meister', 'helm_meister'].includes(id)) ok(it.price >= BAND[it.rarity][0] && it.price <= BAND[it.rarity][1], id + ': Preis ' + it.price + ' im Band ' + it.rarity);
  if (['legendaer', 'mythisch'].includes(it.rarity) && !it.shop) ok(it.unlock && Object.keys(it.unlock).every(k => SERVER.includes(k)), id + ': Legendär/Mythisch nur mit Server-Bedingung', it.unlock);
  if (it.anim) ok(it.rarity !== 'gewoehnlich', id + ': bewegte Teile sind mindestens selten');
  if (it.unlock) ok(A.unlockText(id).length > 5 && !/undefined|NaN|SCL|KOP|FUP|AWL|Sensor|Quest lösen/.test(A.unlockText(id)), id + ': Bedingungstext ' + A.unlockText(id));
  if (it.set) ok(A.SETS[it.set], id + ': Kollektion bekannt');
  if (it.unlock && it.unlock.questSolved) Object.keys(it.unlock.questSolved).forEach(q => ok(A.SETS[q], id + ': questSolved-Kollektion ' + q));
  const av = { animal: 'baer', color: A.COLORS[2], equip: { oberteil: 'tshirt_grau', [it.slot]: id } };
  for (const pose of A.POSES) {
    const s = A.svg(av, { size: 'card', pose, anim: true, uid: 'q-' });
    const d = [...s.matchAll(/ id="([^"]+)"/g)].map(m => m[1]), refs = [...s.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
    ok(new Set(d).size === d.length && refs.every(r => d.includes(r)) && !/undefined|NaN/.test(s), id + '/' + pose + ': Zeichnung sauber');
  }
  ok(!/url\(#/.test(A.svg(av, { size: 'chip' }).replace(/clip-path="url\(#[^)]+c\)"/, '')) && !/undefined|NaN/.test(A.svg(av)), id + ': Chip ohne Verläufe');
});
ok(A.ITEMS.aura_blitz.hidden && A.ITEMS.titel_schnell.hidden && ids.filter(id => A.ITEMS[id].hidden).every(id => A.ITEMS[id].unlock && A.ITEMS[id].unlock.sdWins), 'Sudden-Death-Teile ausgeblendet');
ok(A.ITEMS.kopf_krone.name === 'Digital-Quest-Meisterkrone' && A.ITEMS.kopf_krone.earnOnly && A.ITEMS.kopf_krone.unlock.certs === 2 && A.ITEMS.kopf_krone.unlock.bosses === 2, 'Krone: beide Zertifikate und beide Boss-Aufgaben, nur verdienbar');
ok(A.ITEMS.ruecken_poly.unlock.setsAll === 5 && A.ITEMS.sen_multimeter.unlock.messenAll === 1 && A.ITEMS.sen_umhang.unlock.messenClean === 1, 'Umgedeutete Bedingungen: setsAll, messenAll, messenClean');
ok(['Ohm-Flüsterer', 'Bit-Bändiger', 'Logik-Baumeister', 'Takt-Meister', 'Messprofi'].every(t => ids.some(id => A.ITEMS[id].slot === 'titel' && A.ITEMS[id].name === t)), 'Kollektions-Titel');
// alte Inventare: Preise, Plätze und Besitz wie im Transferpaket
const OLD = { tshirt_grau: 0, tshirt_rot: 40, tshirt_blitz: 120, hemd_kariert: 110, kette_gold: 150, sonnenbrille: 90, kappe_rot: 50, bauhelm: 120 };
Object.keys(OLD).forEach(id => ok(A.ITEMS[id] && A.ITEMS[id].price === OLD[id] && A.ITEMS[id].rarity === 'gewoehnlich', id + ': Preis bleibt'));
const old = A.normalize({ animal: 'wolf', color: '#1f5f8b', equip: { oberteil: 'hemd_kariert', kette: 'kette_gold', brille: 'sonnenbrille', kopf: 'bauhelm' } });
ok(old.equip.kopf === 'bauhelm' && old.equip.kette === 'kette_gold', 'Avatar normalisieren behält angezogene Teile');
ok(A.owns('tshirt_grau', [], {}) && A.owns('kappe_rot', ['kappe_rot'], {}) && !A.owns('kappe_rot', [], {}), 'Besitz: frei / gekauft / nicht gekauft');

/* ===== 2 Freischaltregeln und Fortschritt (Kollektionen wie in AVATAR_META) ===== */
const meta = { elektro: { $: { tasks: 40, theoryAll: 8 } }, digital: { $: { tasks: 40, theoryAll: 8 } }, kombi: { '10.10': { boss: true, final: false, ch: 10 }, $: { tasks: 20, theoryAll: 4 } },
  praxis: { '15.10': { boss: false, final: true, ch: 15 }, $: { tasks: 50, theoryAll: 10 } }, messen: { $: { tasks: 18, theoryAll: 3 } } };
const many = (pre, n, v) => Object.fromEntries(Array.from({ length: n }, (_, i) => [pre + i, v || { stars: 3 }]));
const prog = { elektro: { doneTasks: many('1.', 10), doneTheory: { T1A: true } } };
let B = A.balance(prog, meta, [], [], {}), ctx = B.ctx;
ok(B.earned.total === 10 * 60 + 30 && B.balance === 630, 'Coins: 10 Aufgaben 3★ (600) + Theorie (30) = ' + B.balance);
ok(A.isUnlocked('scl_hoodie', ctx) && !A.isUnlocked('scl_visor', ctx), '7 Elektro-Aufgaben: Hoodie frei, Visor (20) nicht');
ok(/10\/20/.test(A.unlockText('scl_visor', ctx)), 'Fortschritt im Text: ' + A.unlockText('scl_visor', ctx));
const pr = A.unlockProgress('scl_visor', ctx)[0]; ok(pr.have === 10 && pr.need === 20 && !pr.ok, 'Fortschrittsbalken 10/20');
ok(!A.isUnlocked('kette_gold', ctx) && !A.isUnlocked('bauhelm', ctx) && !A.isUnlocked('scl_greifarm', ctx), 'ohne Boss: Goldkette, Bauhelm, Greifarm gesperrt');
prog.kombi = { doneTasks: { '10.10': { stars: 3 } }, doneTheory: {} }; B = A.balance(prog, meta, [], [], {}); ctx = B.ctx;
ok(ctx.bosses === 1 && ctx.final === 0 && B.earned.bosses === 120 && B.balance === 630 + 60 + 120, 'Kapitel-Boss 10.10: +60 +120, bosses = 1');
ok(A.isUnlocked('bauhelm', ctx) && A.isUnlocked('scl_greifarm', ctx) && !A.isUnlocked('kette_gold', ctx) && !A.isUnlocked('awl_stahl', ctx), 'Boss 10.10: Bauhelm und Greifarm frei, Final-Teile nicht');
prog.praxis = { doneTasks: { '15.10': { stars: 2 } }, doneTheory: {} }; B = A.balance(prog, meta, [], [], {}); ctx = B.ctx;
ok(ctx.bosses === 2 && ctx.final === 1 && B.earned.finals === 300 && B.earned.bosses === 120 && B.balance === 810 + 45 + 300, 'Final Boss 15.10: +45 +300 (kein Boss-Zuschlag dazu), bosses = 2');
ok(A.isUnlocked('kette_gold', ctx) && A.isUnlocked('awl_stahl', ctx) && !A.owns('kopf_krone', [], ctx), 'Final: Goldkette und Stahlblock frei; Krone braucht noch die Zertifikate');
prog.praxis.doneTasks['15.10'] = { stars: 3, revealed: true }; ctx = A.balance(prog, meta, [], [], {}).ctx;
ok(ctx.final === 0 && ctx.bosses === 1 && !A.isUnlocked('kette_gold', ctx), 'Final Boss mit „Lösung zeigen“ schaltet nichts frei');
prog.praxis.doneTasks['15.10'] = { stars: 3 };
ctx = A.balance(prog, meta, [], [{ quest: 'dq', level: 'grund' }], {}).ctx;
ok(A.isUnlocked('scl_aura', ctx) && A.isUnlocked('kop_sockel', ctx) && !A.isUnlocked('awl_funken', ctx) && A.isUnlocked('kette_meister', ctx) && !A.isUnlocked('helm_meister', ctx) && ctx.certs === 1, 'Zertifikat Grundstufe: Auren der Teile I–III frei, Profi-Teile nicht');
ok(!A.owns('kopf_krone', [], ctx), 'Krone erst mit beiden Zertifikaten');
ctx = A.balance(prog, meta, [], [{ quest: 'dq', level: 'grund' }, { quest: 'dq', level: 'profi' }], {}).ctx;
ok(A.owns('kopf_krone', [], ctx) && A.isUnlocked('helm_meister', ctx) && A.isUnlocked('awl_funken', ctx), 'beide Zertifikate + beide Bosse: Krone gehört einem (nur verdienbar), Profi-Teile frei');
ctx = A.balance({}, meta, [], [], { challenges: 15, podium: 4, wins: 1, sdWins: 1, bugFixed: 5, flawless: 9 }).ctx;
ok(A.isUnlocked('sockel_neon', ctx) && !A.isUnlocked('sockel_holo', ctx) && !A.isUnlocked('hand_pokal', ctx) && A.isUnlocked('kopf_kranz', ctx) && A.isUnlocked('hand_lupe', ctx) && !A.isUnlocked('titel_null', ctx), 'Challenge-Trophäen nach Stufen');
const mp = { messen: { doneTasks: many('W', 18, { stars: 2 }), doneTheory: { T16A: true, T16B: true, T16C: true } } };
ctx = A.balance(mp, meta, [], [], {}).ctx;
ok(A.isUnlocked('sen_multimeter', ctx) && A.isUnlocked('sen_umhang', ctx) && ctx.questSolved.messen === 18 && ctx.messenAll === 1, 'Messtechnik: alle 18 Messaufgaben + 3 Theorien');
mp.messen.doneTasks.W3 = { stars: 2, revealed: true }; ctx = A.balance(mp, meta, [], [], {}).ctx;
ok(A.isUnlocked('sen_multimeter', ctx) && !A.isUnlocked('sen_umhang', ctx), 'Kabelbaum-Umhang nur ohne Aufdecken');
delete mp.messen.doneTheory.T16C; ctx = A.balance(mp, meta, [], [], {}).ctx;
ok(!A.isUnlocked('sen_multimeter', ctx), 'messenAll braucht alle Theorien');
const all = { elektro: { doneTasks: many('1.', 40) }, digital: { doneTasks: many('5.', 40) }, kombi: { doneTasks: many('9.', 20) }, praxis: { doneTasks: many('11.', 50) }, messen: { doneTasks: many('W', 18) } };
ctx = A.balance(all, meta, [], [], {}).ctx;
ok(ctx.setsAll === 5 && A.isUnlocked('ruecken_poly', ctx) && ctx.quests === 5, 'alle fünf Kollektionen vollständig: Polyglott-Umhang');
all.messen.doneTasks = many('W', 17); ctx = A.balance(all, meta, [], [], {}).ctx;
ok(ctx.setsAll === 4 && !A.isUnlocked('ruecken_poly', ctx) && /4\/5/.test(A.unlockText('ruecken_poly', ctx)), 'eine Aufgabe fehlt: 4/5');
// Varianten, Schaufenster, Sets, Titel
const v1 = A.item('scl_visor~1');
ok(v1 && v1.price === 1560 && v1.color === A.ITEMS.scl_visor.alt[0] && v1.slot === 'brille', 'Variante +30 %: ' + (v1 && v1.price));
ok(!A.item('kappe_rot~1') && !A.item('scl_visor~3') && !A.item('x~1'), 'ungültige Varianten');
ok(A.normalize({ equip: { brille: 'scl_visor~2' } }).equip.brille === 'scl_visor~2', 'Variante bleibt beim Normalisieren');
const jan = Date.UTC(2026, 0, 15), feb = Date.UTC(2026, 1, 15);
const sale = t => ids.filter(id => A.ITEMS[id].shop && A.onSale(id, t));
ok(sale(jan).length === 3 && sale(feb).length === 3 && sale(jan).every(id => !sale(feb).includes(id)), 'Schaufenster: 3 Teile je Monat, monatlich wechselnd');
ok(A.onSale('kappe_rot', jan), 'normale Teile immer kaufbar');
const kombiSet = { animal: 'katze', equip: { kopf: 'fup_lokmuetze', hand: 'fup_kelle~1', kette: 'fup_laterne', aura: 'fup_dampf', siegerpose: 'fup_pfiff', titel: 'fup_titel' } };
ok(A.setDone(A.normalize(kombiSet)) === 'kombi' && /stroke="#cbd5e1" stroke-width="1.6"/.test(A.svg(kombiSet, { size: 'card' })), 'Kombinatorik-Set komplett (auch mit Variante): Segment-Kranz gezeichnet');
ok(A.title(kombiSet).text === 'Logik-Baumeister' && A.best(kombiSet).rarity === 'mythisch', 'Titel und seltenstes Teil');
['elektro', 'digital', 'praxis', 'messen'].forEach(k => {
  const eq = {}; ids.filter(id => A.ITEMS[id].set === k && A.ITEMS[id].slot !== 'titel').forEach(id => { eq[A.ITEMS[id].slot] = id; });
  ok(A.setDone(A.normalize({ equip: eq })) === k, 'Set ' + k + ' komplett erkannt');
});
// Wirtschaft: Katalog ≈ 60 000–82 000 (ohne Varianten, Schaufenster, ausgeblendete), ein ganzer Durchlauf ≈ 11 500
const EC = A.economy(meta), perAll = Object.values(EC.perQuest).reduce((a, b) => a + b, 0);
ok(EC.total >= 60000 && EC.total <= 82000, 'Katalogsumme ' + EC.total);
ok(perAll >= 11000 && perAll <= 12000 && perAll < EC.total / 3, 'Durchlauf aller Kollektionen ' + perAll + ' Coins, weniger als ein Drittel des Katalogs');

/* ===== 3 Worker-API ===== */
const imp = f => import(pathToFileURL(path.join(__dirname, '../worker/' + f)));
(async () => {
  const W = (await imp('index.js')).default, DB = await imp('db.js'), AV = await imp('avatar.js'), AB = await imp('gen/avatar_bundle.js');
  const env = { DB: d1(), ADMIN_USER: 'Chef', ADMIN_PASSWORD: 'geheim-admin', ASSETS: { fetch: () => new Response('seite') } };
  function client(ip) {
    let cookie = '';
    return async function call(method, url, body) {
      const h = { 'content-type': 'application/json', 'x-dquest': '1', 'cf-connecting-ip': ip };
      if (cookie) h.cookie = cookie;
      const r = await W.fetch(new Request('https://dq.test' + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env, {});
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
      let data = null; try { data = await r.json(); } catch (e) { /* kein JSON */ }
      return { status: r.status, data };
    };
  }
  const M = AB.AVATAR_META;
  ok(DB.SCHEMA_VERSION === 7, 'Schema-Version 7 (Migration avatare-coins)');
  ok(Object.keys(M).join() === 'elektro,digital,kombi,praxis,messen' && M.elektro.$.tasks === 40 && M.digital.$.tasks === 40 && M.kombi.$.tasks === 20 && M.praxis.$.tasks === 50 && M.messen.$.tasks === 18, 'AVATAR_META: Aufgaben je Kollektion', Object.keys(M).map(k => M[k].$.tasks));
  ok(M.elektro.$.theoryAll === 8 && M.messen.$.theoryAll === 3 && M.messen.$.ids.includes('W10') && M.messen.$.theoryIds.includes('T16C'), 'AVATAR_META: Theorien, Werkstatt in der Messtechnik');
  ok(M.kombi['10.10'] && M.kombi['10.10'].boss && !M.kombi['10.10'].final && M.praxis['15.10'] && M.praxis['15.10'].final && !M.praxis['15.10'].boss, 'AVATAR_META: 10.10 Kapitel-Boss, 15.10 Final Boss');
  ok(AB.FINAL_TASKS['15.10'] && AB.FINAL_TASKS['15.10'].final && AB.FINAL_TASKS['15.10'].tests.length && AB.FINAL_TASKS['10.10'] && !AB.FINAL_TASKS['10.10'].final, 'FINAL_TASKS: beide Boss-Aufgaben mit Tests');
  const T1 = M.elektro.$.ids;
  const admin = client('10.0.0.1'), teacher = client('10.0.0.2'), otter = client('10.0.0.4'), luchs = client('10.0.0.5'), dachs = client('10.0.0.6'), anon = client('10.0.0.9');
  await admin('POST', '/api/login', { username: 'chef', password: 'geheim-admin' });
  let r = await admin('POST', '/api/admin/teachers', { username: 'av.lehrer' }); const tPw = r.data.password;
  await teacher('POST', '/api/login', { username: 'av.lehrer', password: tPw });
  await teacher('POST', '/api/me/password', { old: tPw, password: 'neues-passwort' });
  const cls = (await teacher('POST', '/api/classes', { name: 'AV 1' })).data;
  const uid = {};
  for (const [c, n] of [[otter, 'Otter'], [luchs, 'Luchs'], [dachs, 'Dachs']]) { r = await c('POST', '/api/register', { code: cls.code, username: n, password: 'geheim1' }); ok(r.status === 201, 'Konto ' + n, r.data); uid[n] = r.data.user.id; await c('POST', '/api/me/notice', {}); }
  const tables = env.DB.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('avatars', 'coin_ledger')").all().map(x => x.name).sort();
  ok(tables.join() === 'avatars,coin_ledger', 'Tabellen avatars und coin_ledger angelegt', tables);
  ok((await anon('GET', '/api/avatar')).status === 401, 'Avatar nur angemeldet');
  r = await teacher('GET', '/api/avatar'); ok(r.status === 200 && r.data.coins.balance === 0, 'Dozent: Avatar & Coins erreichbar (eigener Avatar am Beamer)');
  // Stand aus dem Spielstand: 1★, 2★ mit Lösung, Boss 10.10 3★, eine Theorie
  r = await otter('GET', '/api/avatar');
  ok(r.status === 200 && r.data.coins.balance === 0 && r.data.avatar === null && !r.data.chosen && r.data.rules.star[0] === 30 && r.data.sets.length === 5, 'neues Konto: 0 Coins, noch kein Avatar, Regeln und Kollektionen dabei', r.data);
  const state = { done: { [T1[0]]: true, [T1[1]]: true, '10.10': true, T1A: true, 'Xfremd': true }, doneInfo: { [T1[0]]: { stars: 1 }, [T1[1]]: { stars: 2, solution: true }, '10.10': { stars: 3 } }, theory: { T1A: { best: 1 } }, drafts: {} };
  r = await otter('PUT', '/api/progress/dq', { state, summary: { tasks: 3 }, base: 0 }); ok(r.status === 200, 'Spielstand speichern', r.data);
  r = await otter('GET', '/api/avatar');
  ok(r.data.coins.balance === 30 + 10 + 60 + 120 + 30, 'Coins aus dem Spielstand: 30 + 10 (Lösung gezeigt) + 60 + Boss 120 + Theorie 30 = ' + r.data.coins.balance, r.data.coins);
  ok(r.data.unlock.bosses === 1 && r.data.unlock.final === 0 && r.data.unlock.questSolved.elektro === 2 && r.data.unlock.questSolved.kombi === 1 && r.data.unlock.quests === 2, 'Freischalt-Kontext: Boss, Kollektionen (fremde ID zählt nicht)', r.data.unlock);
  // Kaufen, Sperren, Besitz
  ok((await otter('PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kappe_rot' } })).status === 403, 'Anziehen ohne Besitz wird abgelehnt');
  r = await otter('POST', '/api/avatar/buy', { item: 'kette_gold' }); ok(r.status === 403 && /Final Boss/.test(r.data.error), 'Goldene Kette gesperrt (Final Boss fehlt): ' + r.data.error);
  r = await otter('POST', '/api/avatar/buy', { item: 'scl_hoodie' }); ok(r.status === 403 && /2\/7/.test(r.data.error), 'Hoodie gesperrt mit Fortschritt: ' + r.data.error);
  ok((await otter('POST', '/api/avatar/buy', { item: 'scl_visor' })).status === 403, 'Visor gesperrt');
  ok((await otter('POST', '/api/avatar/buy', { item: 'aura_blitz' })).status === 404, 'ausgeblendetes Teil gibt es nicht');
  ok((await otter('POST', '/api/avatar/buy', { item: 'kopf_krone' })).status === 403, 'Krone ist nicht kaufbar');
  ok((await otter('POST', '/api/avatar/buy', { item: 'kappe_rot~1' })).status === 404, 'Variante ohne Vorlage gibt es nicht');
  r = await otter('POST', '/api/avatar/buy', { item: 'bauhelm' }); ok(r.status === 403 && /Boss-Lösungen|Tests/.test(r.data.error), 'Bauhelm (Boss 10.10) ohne gespeicherte Lösung abgelehnt: ' + r.data.error);
  r = await otter('POST', '/api/avatar/buy', { item: 'hemd_kariert' }); ok(r.status === 200 && r.data.balance === 250 - 110, 'Hemd gekauft, Stand 140');
  r = await otter('POST', '/api/avatar/buy', { item: 'kappe_rot' }); ok(r.status === 200 && r.data.balance === 90, 'Kappe gekauft, Stand 90');
  ok((await otter('POST', '/api/avatar/buy', { item: 'kappe_rot' })).data.owned === true, 'Doppelkauf ändert nichts');
  ok((await otter('POST', '/api/avatar/buy', { item: 'kappe_blau' })).status === 400 || (await otter('GET', '/api/avatar')).data.coins.balance === 40, 'Zweite Kappe: Stand 40 (50 reichen)');
  r = await otter('POST', '/api/avatar/buy', { item: 'kette_silber' }); ok(r.status === 400 && /reichen/.test(r.data.error), 'zu teuer wird abgelehnt');
  r = await otter('PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kappe_rot', oberteil: 'hemd_kariert' } });
  ok(r.status === 200 && r.data.avatar.animal === 'wolf' && r.data.avatar.equip.kopf === 'kappe_rot', 'gekaufte Teile anziehen');
  r = await otter('GET', '/api/avatar'); ok(r.data.owned.includes('kappe_rot') && r.data.coins.spent === 210 && r.data.chosen, 'Käufe im Coin-Buch');
  r = await otter('GET', '/api/me'); ok(r.data.user.avatar && r.data.user.avatar.animal === 'wolf', 'me liefert den Avatar');
  r = await luchs('GET', '/api/me'); ok(r.data.user.avatar === null, 'me ohne Avatar: null');
  // Final Boss: Coins aus dem Spielstand, Freischaltung nur mit serverseitig bestandener Lösung
  state.done['15.10'] = true; state.doneInfo['15.10'] = { stars: 3 };
  await otter('PUT', '/api/progress/dq', { state, summary: {}, base: 0, force: true });
  r = await otter('GET', '/api/avatar'); ok(r.data.unlock.final === 1 && r.data.unlock.bosses === 2 && r.data.coins.balance === 40 + 60 + 300, 'Final Boss: +60 +300 Coins, final = 1', r.data.coins);
  r = await otter('POST', '/api/avatar/buy', { item: 'kette_gold' }); ok(r.status === 403 && /gespeichert|Tests/.test(r.data.error), 'Goldkette: Spielstand allein reicht nicht: ' + r.data.error);
  state.drafts['15.10'] = { layout: { parts: [], wires: [] }, answers: {} };
  await otter('PUT', '/api/progress/dq', { state, summary: {}, base: 0, force: true });
  r = await otter('POST', '/api/avatar/buy', { item: 'kette_gold' }); ok(r.status === 403 && /Tests/.test(r.data.error), 'Goldkette: falsche Lösung abgelehnt');
  // Musterlösung aus dem Inhalt
  require('./src/engine.js'); require('./src/content/_helpers.js');
  fs.readdirSync(path.join(__dirname, 'src/content')).filter(f => f.endsWith('.js') && f !== '_helpers.js' && f !== 'manual.js').sort().forEach(f => require('./src/content/' + f));
  state.drafts['15.10'] = { layout: globalThis.DQ.byId['15.10'].ref, answers: {} };
  await otter('PUT', '/api/progress/dq', { state, summary: {}, base: 0, force: true });
  r = await otter('POST', '/api/avatar/buy', { item: 'kette_gold' }); ok(r.status === 200 && r.data.balance === 400 - 150, 'Goldkette nach bestandener Final-Boss-Lösung gekauft', r.data);
  r = await otter('POST', '/api/avatar/buy', { item: 'bauhelm' }); ok(r.status === 200, 'Bauhelm (eine Boss-Lösung bestätigt) gekauft', r.data);
  ok((await otter('PUT', '/api/avatar', { animal: 'wolf', color: '#1f5f8b', equip: { kopf: 'kopf_krone' } })).status === 403, 'Krone ohne Zertifikate nicht anziehbar');
  // Challenge-Prämie: zwei lösen, Otter zuerst → Rang 1 (60) und Rang 2 (40), einmal pro Challenge; zählt noch nicht als Trophäe
  const ch = (await teacher('POST', '/api/challenges', { mode: 'sprint', quest: 'dq', taskId: T1[2], duration: 300 })).data;
  for (const c of [otter, luchs]) await c('POST', '/api/live/join', { code: ch.code });
  await teacher('POST', '/api/challenges/' + ch.id + '/start', {});
  await otter('POST', '/api/live/' + ch.id + '/attempt', { ok: true, code: { parts: [], wires: [] } });
  await new Promise(res => setTimeout(res, 30));
  await luchs('POST', '/api/live/' + ch.id + '/attempt', { ok: true, code: { parts: [], wires: [] } });
  const beforeB = (await luchs('GET', '/api/avatar')).data.coins.balance;
  await teacher('POST', '/api/challenges/' + ch.id + '/stop', {});
  await teacher('POST', '/api/challenges/' + ch.id + '/stop', {});
  let a2 = (await otter('GET', '/api/avatar')).data, b2 = (await luchs('GET', '/api/avatar')).data;
  ok(a2.coins.speedrun === 60 && a2.unlock.podium === 1, 'Rang 1: +60 Coins, Podest zählt', a2.coins);
  ok(b2.coins.speedrun === 40 && b2.coins.balance === beforeB + 40, 'Rang 2: +40 Coins (einmal, auch bei doppeltem Stopp)', b2.coins);
  ok(a2.unlock.challenges === 0 && a2.unlock.wins === 0, 'Challenge mit 2 Teilnehmenden und < 2 min zählt nicht für Trophäen');
  r = await otter('POST', '/api/avatar/buy', { item: 'sockel_holz' }); ok(r.status === 403 && /0\/1|teilnehmen/.test(r.data.error), 'Holz-Sockel gesperrt: ' + r.data.error);
  // Challenge, die zählt: 3 Teilnehmende, > 2 min (Startzeit zurückgesetzt), Otter gewinnt fehlerfrei
  const ch2 = (await teacher('POST', '/api/challenges', { mode: 'sprint', quest: 'dq', taskId: T1[2], duration: 600 })).data;
  for (const c of [otter, luchs, dachs]) await c('POST', '/api/live/join', { code: ch2.code });
  await teacher('POST', '/api/challenges/' + ch2.id + '/start', {});
  env.DB.raw.prepare('UPDATE challenges SET started_at = started_at - 180000 WHERE id = ?').run(ch2.id);
  await otter('POST', '/api/live/' + ch2.id + '/attempt', { ok: true, code: { parts: [], wires: [] } });
  await teacher('POST', '/api/challenges/' + ch2.id + '/stop', {});
  a2 = (await otter('GET', '/api/avatar')).data; const d2 = (await dachs('GET', '/api/avatar')).data;
  ok(a2.unlock.challenges === 1 && a2.unlock.wins === 1 && a2.unlock.flawless === 1 && a2.unlock.podium === 2 && a2.coins.speedrun === 60 + 60 + 5, 'Statistik: Teilnahme, Sieg, fehlerfrei; Prämie Rang 1 + Teilnahme', a2.unlock);
  ok(d2.unlock.challenges === 1 && d2.unlock.wins === 0 && d2.coins.speedrun === 5, 'Teilnahme +5 Coins, kein Sieg für Dachs', d2.coins);
  r = await otter('POST', '/api/avatar/buy', { item: 'sockel_holz' }); ok(r.status === 200, 'Holz-Sockel jetzt kaufbar', r.data);
  r = await otter('POST', '/api/avatar/buy', { item: 'kopf_kranz' }); ok(r.status === 400 && /reichen/.test(r.data.error), 'Siegerkranz (ein Sieg) frei, aber zu teuer: ' + r.data.error);
  // Störungsjagd: mit Fehlversuch gelöst → bugFixed, aber nicht fehlerfrei
  const ch3 = (await teacher('POST', '/api/challenges', { mode: 'bug', quest: 'dq', taskId: T1[2], bugId: 'b' + T1[2] + '_1', duration: 600 })).data;
  ok(ch3 && ch3.code, 'Störungsjagd angelegt', ch3);
  for (const c of [otter, luchs, dachs]) await c('POST', '/api/live/join', { code: ch3.code });
  await teacher('POST', '/api/challenges/' + ch3.id + '/start', {});
  env.DB.raw.prepare('UPDATE challenges SET started_at = started_at - 180000 WHERE id = ?').run(ch3.id);
  await otter('POST', '/api/live/' + ch3.id + '/attempt', { ok: false });
  await otter('POST', '/api/live/' + ch3.id + '/attempt', { ok: true, code: { parts: [], wires: [] } });
  await teacher('POST', '/api/challenges/' + ch3.id + '/stop', {});
  a2 = (await otter('GET', '/api/avatar')).data;
  ok(a2.unlock.bugFixed === 1 && a2.unlock.flawless === 1 && a2.unlock.challenges === 2 && a2.unlock.wins === 2 && a2.coins.speedrun === 125 + 5, 'Störungsjagd: bugFixed zählt, nicht fehlerfrei, keine Sprint-Prämie, Teilnahme +5', a2.unlock);
  // Zeit abgelaufen (ohne Stopp-Knopf): Prämien beim nächsten Abruf
  const ch4 = (await teacher('POST', '/api/challenges', { mode: 'sprint', quest: 'dq', taskId: T1[2], duration: 600 })).data;
  for (const c of [otter, luchs, dachs]) await c('POST', '/api/live/join', { code: ch4.code });
  await teacher('POST', '/api/challenges/' + ch4.id + '/start', {});
  await luchs('POST', '/api/live/' + ch4.id + '/attempt', { ok: true, code: { parts: [], wires: [] } });
  env.DB.raw.prepare('UPDATE challenges SET started_at = started_at - 200000, ends_at = ? WHERE id = ?').run(Date.now() - 1000, ch4.id);
  r = await luchs('GET', '/api/live/' + ch4.id); ok(r.status === 200 && r.data.challenge.state === 'ended', 'Ablauf beendet die Challenge beim Abruf', r.data && r.data.challenge);
  b2 = (await luchs('GET', '/api/avatar')).data;
  ok(b2.coins.speedrun === 40 + 5 + 5 + 5 + 60 && b2.unlock.wins === 1, 'Zeitablauf: Luchs Rang 1 (+60) und Teilnahmen', b2.coins);
  // Zertifikat → Coins, einmal je Stufe (Haken in cert.js)
  const C0 = { db: env.DB };
  await AV.awardCert(C0, uid.Otter, 'dq', 'grund', false); await AV.awardCert(C0, uid.Otter, 'dq', 'grund', true);
  a2 = (await otter('GET', '/api/avatar')).data;
  ok(a2.coins.speedrun === 135 + 900, 'Zertifikat Grundstufe: +900 einmal (135 aus Challenges inkl. Teilnahme am Zeitablauf)', a2.coins);
  await AV.awardCert(C0, uid.Otter, 'dq', 'profi', true); a2 = (await otter('GET', '/api/avatar')).data;
  ok(a2.coins.speedrun === 135 + 900 + 1500, 'Zertifikat Profi mit Auszeichnung: +1500', a2.coins);
  const certSrc = fs.readFileSync(path.join(__dirname, '../worker/cert.js'), 'utf8'), chSrc = fs.readFileSync(path.join(__dirname, '../worker/challenge.js'), 'utf8');
  ok(/awardCert\(C, C\.user\.id, e\.quest, e\.level/.test(certSrc) && /awardSpeedrun\(/.test(chSrc), 'Haken in cert.js und challenge.js vorhanden');
  // Klassenliste mit Avataren
  r = await teacher('GET', '/api/classes/' + cls.id);
  const sO = r.data.students.find(s => s.username === 'Otter'), sL = r.data.students.find(s => s.username === 'Luchs');
  ok(sO && sO.avatar && sO.avatar.animal === 'wolf' && sL && sL.avatar === null, 'Klassenliste: Avatar für Otter, null für Luchs');
  // Konto löschen entfernt Avatar und Coin-Buch
  const cnt = () => env.DB.raw.prepare('SELECT (SELECT COUNT(*) FROM avatars WHERE user_id = ?) AS a, (SELECT COUNT(*) FROM coin_ledger WHERE user_id = ?) AS l').get(uid.Otter, uid.Otter);
  ok(cnt().a === 1 && cnt().l > 3, 'vor dem Löschen: Avatar und Einträge vorhanden', cnt());
  r = await otter('DELETE', '/api/me', { password: 'geheim1' }); ok(r.status === 200, 'Konto löschen', r.data);
  ok(cnt().a === 0 && cnt().l === 0, 'Konto löschen entfernt avatars und coin_ledger', cnt());
  console.log(`Avatare/Coins: ${pass} bestanden, ${failN} fehlgeschlagen`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

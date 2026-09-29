/* Digital Quest – Pruefungen fuers Zertifikat: gemeinsamer Kern fuer Worker, Validator und Tests (DQExam).
 * Nach dem Vorbild von SPS Quest (exam_core.js). Der Browser bekommt nur publicItem(): nie ref, hidden oder wrong.
 *
 *   defExamTask({ id:'G01', level:'grund'|'profi', ch (Kapitel), diff:1|2|3, tags?,
 *     params:{ U:[9, 12], … },                       // pro Pruefung per Seed gewaehlt
 *     build: p => ({ title, brief, story?, palette, need?, limit?, start, ref, bench?,
 *                    tests:  [ … ],                   // sichtbar: damit prueft „Testen“ im Browser
 *                    hidden: [ … ],                   // verdeckt: nur der Server (Grenzfaelle, weitere Zustaende)
 *                    measure:[ … ],                   // Messprotokoll (Sollwert aus der abgegebenen Schaltung)
 *                    wrong:  [{name, parts, wires}] })  // typische Fehler, muessen scheitern (Validator)
 *   })
 *   defExamQuestion({ id, level, ch, q:'HTML', options:['…'], answer: Index })
 *
 * Abgabe einer Aufgabe: { layout:{parts, wires}, answers:{messId: Wert} }. Vorgegebene Bauteile (start) muessen
 * unveraendert vorhanden sein, neue Bauteile nur aus der Palette – sonst 0 Punkte. */
(function (root) {
  'use strict';
  var E = root.DQEngine || (typeof require === 'function' ? require('./engine.js') : null);
  var X = root.DQ_EXAM = root.DQ_EXAM || { tasks: [], questions: [] };
  var QUEST = 'dq', LEVELS = ['grund', 'profi'];
  var RULES = {
    grund: { tasks: 5, questions: 10, minutes: 60, mix: [2, 2, 1], chapters: [1, 10] },
    profi: { tasks: 4, questions: 10, minutes: 75, mix: [1, 2, 1], chapters: [11, 15] }
  };
  var WEIGHT = { tasks: 0.7, theory: 0.3 }, PASS = 0.7, DISTINCTION = 0.9, PARTIAL = 0.6;
  var LIMITS = { bytes: 20 * 1024, parts: 80, wires: 240 };

  root.defExamTask = function (o) {
    ['id', 'level', 'ch', 'build'].forEach(function (k) { if (o[k] === undefined) throw new Error('defExamTask ' + o.id + ': ' + k + ' fehlt'); });
    if (X.tasks.some(function (t) { return t.id === o.id; })) throw new Error('defExamTask: ' + o.id + ' doppelt');
    o.quest = QUEST; o.diff = o.diff || 2; X.tasks.push(o); return o;
  };
  root.defExamQuestion = function (o) {
    if (X.questions.some(function (q) { return q.id === o.id; })) throw new Error('defExamQuestion: ' + o.id + ' doppelt');
    o.quest = QUEST; X.questions.push(o); return o;
  };

  /* ---------- Zufall (deterministisch) ---------- */
  function hashStr(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  /* ---------- Parameter ---------- */
  function paramKeys(def) { return Object.keys(def.params || {}); }
  function pickParams(def, r) { var p = {}; paramKeys(def).forEach(function (k) { var v = def.params[k]; p[k] = v[Math.floor(r() * v.length)]; }); return p; }
  function allParams(def, n) { // alle Kombinationen (Validator); bei grossen Raeumen n zufaellige
    var out = [{}];
    paramKeys(def).forEach(function (k) { var nx = []; out.forEach(function (o) { def.params[k].forEach(function (v) { var c = Object.assign({}, o); c[k] = v; nx.push(c); }); }); out = nx; });
    if (n && out.length > n) out = shuffle(out, rng('all:' + def.id)).slice(0, n);
    return out;
  }
  function validParams(def, p) { // Parameter aus der Datenbank: nur Werte, die die Aufgabe kennt
    return paramKeys(def).every(function (k) { return def.params[k].some(function (v) { return JSON.stringify(v) === JSON.stringify(p && p[k]); }); });
  }

  /* ---------- Instanz einer Aufgabe ---------- */
  function instantiate(def, p) {
    var b = def.build(p || {});
    return { id: def.id, quest: QUEST, level: def.level, ch: def.ch, diff: def.diff, tags: def.tags || [], params: p || {},
      title: b.title || '', brief: b.brief || '', story: b.story || '', palette: b.palette || [], need: b.need || {}, limit: b.limit || null,
      start: b.start, ref: b.ref, bench: b.bench || null, tests: b.tests || [], hidden: b.hidden || [], measure: b.measure || [], wrong: b.wrong || [] };
  }
  /* Aufgabe im Format des Spiels (runTask). which: 'visible' = sichtbare Tests + Messprotokoll, 'hidden' = nur verdeckte Tests */
  function toTask(it, which) {
    var t = { id: it.id, ch: it.ch, kind: 'task', exam: true, title: it.title, brief: it.brief, story: it.story, palette: it.palette, start: it.start, bench: it.bench, tags: it.tags, wrong: [] };
    if (which === 'hidden') { t.tests = it.hidden; t.measure = []; t.need = {}; return t; }
    t.tests = it.tests; t.measure = it.measure; t.need = it.need; if (it.limit) t.limit = it.limit;
    return t;
  }
  /* Was der Browser sehen darf: keine Musterloesung, keine verdeckten Tests, keine Rechenwerte des Messprotokolls */
  function publicItem(it) {
    return { id: it.id, level: it.level, ch: it.ch, title: it.title, brief: it.brief, story: it.story, palette: it.palette, need: it.need, limit: it.limit,
      start: it.start, bench: it.bench, tests: it.tests, measure: it.measure.map(function (m) { return { id: m.id, ask: m.ask, unit: m.unit || '' }; }) };
  }

  /* ---------- Fragen ---------- */
  function questionItem(def, perm) {
    var opts = def.options || [];
    perm = perm && perm.length === opts.length ? perm : opts.map(function (_, i) { return i; });
    return { id: def.id, level: def.level, ch: def.ch, q: def.q, options: perm.map(function (i) { return opts[i]; }), perm: perm, answer: perm.indexOf(def.answer) };
  }
  function publicQuestion(qi) { return { id: qi.id, ch: qi.ch, q: qi.q, options: qi.options }; }

  /* ---------- Ziehung ---------- */
  function pool(level) { return { tasks: X.tasks.filter(function (t) { return t.level === level; }), questions: X.questions.filter(function (q) { return q.level === level; }) }; }
  function draw(level, seed) {
    var R = RULES[level], r = rng('exam:' + seed), P = pool(level), chosen = [], chs = {};
    [1, 2, 3].forEach(function (d, di) {
      var cand = shuffle(P.tasks.filter(function (t) { return t.diff === d; }), r);
      for (var n = 0; n < R.mix[di] && cand.length; n++) {
        var fresh = cand.filter(function (t) { return !chs[t.ch]; })[0] || cand[0];
        cand = cand.filter(function (t) { return t !== fresh; }); chosen.push(fresh); chs[fresh.ch] = 1;
      }
    });
    shuffle(P.tasks.filter(function (t) { return chosen.indexOf(t) < 0; }), r).slice(0, Math.max(0, R.tasks - chosen.length)).forEach(function (t) { chosen.push(t); chs[t.ch] = 1; });
    var qs = [], qc = shuffle(P.questions, r), qch = {};
    while (qs.length < R.questions && qc.length) { // Fragen ueber moeglichst viele Kapitel streuen
      var need = qc.filter(function (q) { return !qch[q.ch]; })[0];
      if (!need) { qch = {}; need = qc[0]; }
      qc = qc.filter(function (q) { return q !== need; }); qs.push(need); qch[need.ch] = 1;
    }
    chosen.sort(function (a, b) { return a.ch - b.ch || a.diff - b.diff; });
    return {
      tasks: chosen.map(function (t) { return { t: 'task', id: t.id, params: pickParams(t, r) }; }),
      questions: qs.sort(function (a, b) { return a.ch - b.ch; }).map(function (q) { return { t: 'q', id: q.id, perm: shuffle(q.options.map(function (_, i) { return i; }), r) }; })
    };
  }
  function taskDef(id) { return X.tasks.filter(function (t) { return t.id === id; })[0]; }
  function questionDef(id) { return X.questions.filter(function (q) { return q.id === id; })[0]; }
  function build(items) { // items aus draw() → vollstaendige Instanzen (nur Server/Validator)
    return {
      tasks: (items.tasks || []).filter(function (x) { return taskDef(x.id) && validParams(taskDef(x.id), x.params); }).map(function (x) { return instantiate(taskDef(x.id), x.params); }),
      questions: (items.questions || []).filter(function (x) { return questionDef(x.id); }).map(function (x) { return questionItem(questionDef(x.id), x.perm); })
    };
  }

  /* ---------- Abgabe pruefen und saeubern ---------- */
  var PROP_FREE = { closed: 1, pos: 1 }; // stellt die lernende Person bzw. der Test
  function cleanProps(p) { var o = {}; Object.keys(p || {}).forEach(function (k) { var v = p[k]; if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') o[String(k).slice(0, 20)] = typeof v === 'string' ? v.slice(0, 40) : v; }); return o; }


  function cleanLayout(it, layout) {
    if (!layout || !Array.isArray(layout.parts) || !Array.isArray(layout.wires)) return { error: 'Keine Schaltung abgegeben.' };
    if (layout.parts.length > LIMITS.parts || layout.wires.length > LIMITS.wires) return { error: 'Die Schaltung ist zu gross.' };
    var ids = {}, parts = [], bad = null;
    layout.parts.forEach(function (p) {
      if (bad) return;
      if (!p || typeof p.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,11}$/.test(p.id) || !E.PARTS[p.type] || ids[p.id]) { bad = 'Ungueltiges Bauteil in der Abgabe.'; return; }
      ids[p.id] = 1;
      var q = { id: p.id, type: p.type, x: +p.x || 0, y: +p.y || 0, rot: +p.rot || 0, props: cleanProps(p.props) };
      if (p.value !== undefined) { if (!(+p.value > 0) || !isFinite(+p.value)) { bad = 'Ungueltiger Wert bei ' + p.id + '.'; return; } q.value = +p.value; }
      parts.push(q);
    });
    if (bad) return { error: bad };
    var wires = [];
    layout.wires.forEach(function (w) {
      if (bad) return;
      if (!w || typeof w.from !== 'string' || typeof w.to !== 'string' || w.from.length > 24 || w.to.length > 24) { bad = 'Ungueltige Leitung in der Abgabe.'; return; }
      wires.push({ from: w.from, to: w.to });
    });
    if (bad) return { error: bad };
    // vorgegebene Bauteile unveraendert, neue nur aus der Palette
    var by = {}; parts.forEach(function (p) { by[p.id] = p; });
    var missing = it.start.parts.filter(function (s) { var p = by[s.id]; return !p || p.type !== s.type; }).map(function (s) { return s.id; });
    if (missing.length) return { error: 'Vorgegebene Bauteile fehlen: ' + missing.join(', ') + '. Bitte die Aufgabe zuruecksetzen.' };
    // Werte der vorgegebenen Bauteile gelten wie gestellt (am Generator darf zum Messen gedreht werden – bewertet wird mit dem Aufgabenwert)
    it.start.parts.forEach(function (s) {
      var p = by[s.id], free = {};
      Object.keys(p.props).forEach(function (k) { if (PROP_FREE[k]) free[k] = p.props[k]; });
      p.props = Object.assign({}, cleanProps(s.props), free);
      if (s.value !== undefined) p.value = s.value; else delete p.value;
    });
    var given = {}; it.start.parts.forEach(function (s) { given[s.id] = 1; });
    var foreign = parts.filter(function (p) { return !given[p.id] && it.palette.indexOf(p.type) < 0; }).map(function (p) { return p.id; });
    if (foreign.length) return { error: 'Bauteile, die in dieser Aufgabe nicht erlaubt sind: ' + foreign.join(', ') + '.' };
    // vorgegebene Leitungen bleiben
    var has = {}; wires.forEach(function (w) { has[w.from + '|' + w.to] = has[w.to + '|' + w.from] = 1; });
    var cut = (it.start.wires || []).filter(function (w) { return !has[w.from + '|' + w.to]; });
    if (cut.length && !it.rewire) return { error: 'Vorgegebene Leitungen wurden entfernt. Bitte die Aufgabe zuruecksetzen.' };
    return { layout: { parts: parts, wires: wires } };
  }
  function cleanAnswers(it, a) {
    var o = {}; a = a && typeof a === 'object' ? a : {};
    it.measure.forEach(function (m) { var v = a[m.id]; if (typeof v === 'number' || typeof v === 'string') o[m.id] = String(v).slice(0, 24); });
    return o;
  }

  /* ---------- Bewertung ---------- */
  function score(passed, total) { if (!total) return 0; if (passed === total) return 1; return Math.round(PARTIAL * passed / total * 1000) / 1000; }
  function gradeTask(it, answer) {
    var none = { points: 0, passed: 0, total: 0, ok: false, checks: [], hidden: { passed: 0, total: 0 } };
    if (JSON.stringify(answer || '').length > LIMITS.bytes) return Object.assign(none, { error: 'Abgabe zu gross (max. 20 KB).' });
    var c = cleanLayout(it, answer && answer.layout);
    if (c.error) return Object.assign(none, { error: c.error });
    var ans = cleanAnswers(it, answer && answer.answers), rv, rh;
    try { rv = E.runTask(toTask(it, 'visible'), c.layout, ans); } catch (e) { return Object.assign(none, { error: 'Die Schaltung laesst sich nicht berechnen: ' + String(e.message || e).slice(0, 160) }); }
    try { rh = it.hidden.length ? E.runTask(toTask(it, 'hidden'), c.layout, {}) : { results: [] }; } catch (e) { rh = { results: it.hidden.map(function () { return { ok: false }; }) }; }
    var all = rv.results.concat(rh.results), passed = all.filter(function (x) { return x.ok; }).length, points = score(passed, all.length);
    return { points: points, passed: passed, total: all.length, ok: points === 1, error: null,
      checks: rv.results.map(function (x) { return { ok: !!x.ok, text: String(x.text || '').slice(0, 200) }; }), // ohne Sollwerte
      hidden: { passed: rh.results.filter(function (x) { return x.ok; }).length, total: rh.results.length } };
  }
  function gradeQuestion(qi, answer) { var a = +answer; return { points: Number.isInteger(a) && a === qi.answer ? 1 : 0, ok: a === qi.answer }; }
  function total(built, pts) {
    var tp = built.tasks.map(function (t) { return pts[t.id] || 0; }), qp = built.questions.map(function (q) { return pts[q.id] || 0; });
    var avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; };
    var tA = avg(tp), qA = avg(qp), s = Math.round((WEIGHT.tasks * tA + WEIGHT.theory * qA) * 1000) / 1000;
    return { score: s, tasks: Math.round(tA * 1000) / 1000, theory: Math.round(qA * 1000) / 1000, passed: s >= PASS, distinction: s >= DISTINCTION };
  }
  /* Musterabgabe (Validator, Tests, Aufwaermen) */
  function refAnswer(it) { return { layout: { parts: it.ref.parts, wires: it.ref.wires }, answers: E.expectedAnswers(toTask(it, 'visible'), it.ref) }; }

  var api = { X: X, QUEST: QUEST, LEVELS: LEVELS, RULES: RULES, WEIGHT: WEIGHT, PASS: PASS, DISTINCTION: DISTINCTION, PARTIAL: PARTIAL, LIMITS: LIMITS,
    rng: rng, shuffle: shuffle, hashStr: hashStr, pickParams: pickParams, allParams: allParams, validParams: validParams,
    instantiate: instantiate, toTask: toTask, publicItem: publicItem, questionItem: questionItem, publicQuestion: publicQuestion,
    pool: pool, draw: draw, build: build, taskDef: taskDef, questionDef: questionDef,
    cleanLayout: cleanLayout, gradeTask: gradeTask, gradeFor: gradeTask, gradeQuestion: gradeQuestion, total: total, refAnswer: refAnswer };
  root.DQExam = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

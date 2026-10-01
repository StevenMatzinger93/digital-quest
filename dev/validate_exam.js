// Validator fuer den Pruefungspool: node validate_exam.js
// Jede Vorlage × Parameter: Musterloesung = volle Punkte, Startaufbau und typische Fehler scheitern,
// die oeffentliche Fassung verraet nichts, die Bewertung ist schnell genug fuer den Worker.
const { Exam, E } = require('./exam_pool.js');
const errs = [], warn = []; let n = 0;
const LEAK = /"(ref|hidden|wrong|truth|tol)"\s*:/;
Exam.X.tasks.forEach(def => {
  const combos = Exam.allParams(def, 60);
  if (!combos.length) errs.push(def.id + ': keine Parameter');
  combos.forEach(p => {
    const tag = def.id + ' ' + JSON.stringify(p); n++;
    let it; try { it = Exam.instantiate(def, p); } catch (e) { errs.push(tag + ': build wirft ' + e.message); return; }
    if (!it.title || !it.brief) errs.push(tag + ': Titel oder Auftrag fehlt');
    if (!it.tests.length && !it.measure.length) errs.push(tag + ': keine sichtbare Prüfung');
    const ids = new Set(it.start.parts.map(x => x.id));
    it.start.parts.forEach(s => { if (!it.ref.parts.some(r => r.id === s.id && r.type === s.type)) errs.push(tag + ': Startbauteil ' + s.id + ' fehlt in der Musterlösung'); });
    it.ref.parts.forEach(r => { if (!ids.has(r.id) && !it.palette.includes(r.type)) errs.push(tag + ': ' + r.id + ' (' + r.type + ') nicht in der Palette'); });
    let ans;
    try { ans = Exam.refAnswer(it); } catch (e) { errs.push(tag + ': Sollwerte nicht berechenbar: ' + e.message); return; }
    const t0 = process.hrtime.bigint(), g = Exam.gradeTask(it, ans), ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > 80) warn.push(tag + ': Bewertung ' + ms.toFixed(0) + ' ms');
    if (g.points !== 1) errs.push(tag + ': Musterlösung ' + g.passed + '/' + g.total + (g.error ? ' – ' + g.error : '') + ' · ' + g.checks.filter(c => !c.ok).map(c => c.text).join(' | ') + (g.hidden.passed < g.hidden.total ? ' | verdeckt ' + g.hidden.passed + '/' + g.hidden.total : ''));
    if (g.total < 2) warn.push(tag + ': nur ' + g.total + ' Pruefpunkt(e)');
    // Startaufbau darf nicht bestehen
    const s = Exam.gradeTask(it, { layout: it.start, answers: it.palette.length ? ans.answers : {} });
    if (s.points === 1) errs.push(tag + ': Startaufbau besteht');
    it.wrong.forEach(w => {
      const r = Exam.gradeTask(it, { layout: { parts: w.parts, wires: w.wires }, answers: ans.answers });
      if (r.points === 1) errs.push(tag + ': Falschlösung "' + w.name + '" besteht');
      if (r.error) errs.push(tag + ': Falschlösung "' + w.name + '" wird abgewiesen statt bewertet: ' + r.error);
    });
    // Manipulation: geaenderter Wert eines vorgegebenen Bauteils zaehlt nicht, fremde Bauteile werden abgewiesen
    const tam = JSON.parse(JSON.stringify(ans)); tam.layout.parts.forEach(x => { if (ids.has(x.id) && x.value !== undefined) x.value = x.value * 3; });
    if (Exam.gradeTask(it, tam).points !== 1) errs.push(tag + ': geänderte Startwerte beeinflussen die Bewertung');
    const forb = JSON.parse(JSON.stringify(ans)); forb.layout.parts.push({ id: 'XX9', type: it.palette.includes('battery') ? 'zener' : 'battery', x: 0, y: 0, rot: 0, value: 5 });
    if (!Exam.gradeTask(it, forb).error) errs.push(tag + ': fremdes Bauteil wird nicht abgewiesen');
    const pub = Exam.publicItem(it);
    if (LEAK.test(JSON.stringify(pub)) || pub.measure.some(m => Object.keys(m).some(k => !['id', 'ask', 'unit'].includes(k)))) errs.push(tag + ': öffentliche Fassung verrät Lösungsdaten');
    // Die Aufgabe muss auch im Spiel pruefbar sein (sichtbare Tests)
    try { const v = E.runTask(Exam.toTask(it, 'visible'), it.ref, ans.answers); if (!v.pass) errs.push(tag + ': sichtbare Tests scheitern an der Musterlösung'); } catch (e) { errs.push(tag + ': ' + e.message); }
  });
});
Exam.LEVELS.forEach(lv => {
  const P = Exam.pool(lv), R = Exam.RULES[lv];
  if (P.tasks.length < R.tasks + 2) errs.push(lv + ': nur ' + P.tasks.length + ' Aufgabenvorlagen (nötig ' + (R.tasks + 2) + ')');
  if (P.questions.length < 3 * R.questions) errs.push(lv + ': nur ' + P.questions.length + ' Fragen');
  [1, 2, 3].forEach((d, i) => { const c = P.tasks.filter(t => t.diff === d).length; if (c < R.mix[i] + 1) errs.push(lv + ': Schwierigkeit ' + d + ' hat nur ' + c + ' Vorlagen'); });
  P.tasks.forEach(t => { if (t.ch < R.chapters[0] || t.ch > R.chapters[1]) errs.push(t.id + ': Kapitel ' + t.ch + ' gehört nicht zur Stufe ' + lv); });
  P.questions.forEach(q => { if (!(q.answer >= 0 && q.answer < q.options.length)) errs.push(q.id + ': Antwortindex'); });
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const d = Exam.draw(lv, 'seed' + i), b = Exam.build(d);
    if (b.tasks.length !== R.tasks || b.questions.length !== R.questions) { errs.push(lv + ': Ziehung ' + i + ' unvollständig (' + b.tasks.length + '/' + b.questions.length + ')'); break; }
    if (new Set(b.tasks.map(t => t.id)).size !== R.tasks || new Set(b.questions.map(q => q.id)).size !== R.questions) { errs.push(lv + ': Ziehung ' + i + ' mit Doppelten'); break; }
    b.questions.forEach(q => { const def = Exam.questionDef(q.id); if (q.options[q.answer] !== def.options[def.answer]) errs.push(q.id + ': gemischte Antwort zeigt auf die falsche Option'); });
    seen.add(JSON.stringify(d.tasks));
  }
  if (seen.size < 100) warn.push(lv + ': nur ' + seen.size + ' verschiedene Aufgabensätze in 300 Ziehungen');
  console.log(lv + ': ' + P.tasks.length + ' Vorlagen, ' + P.questions.length + ' Fragen, ' + seen.size + ' verschiedene Aufgabensätze in 300 Ziehungen');
});
warn.forEach(w => console.log('Warnung: ' + w));
if (errs.length) { console.log('FEHLER (' + errs.length + '):\n' + errs.slice(0, 60).join('\n')); process.exit(1); }
console.log('Prüfungspool OK — ' + n + ' Aufgaben-Varianten geprüft, 0 Fehler (' + warn.length + ' Warnungen)');

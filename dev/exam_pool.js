// Laedt Engine, Helfer, Spielinhalte (fuer die Theoriefragen) und den Pruefungspool in Node.
// Gebraucht von validate_exam.js, build.js (Worker-Bundle) und den Tests.
const fs = require('fs'), path = require('path');
const src = f => path.join(__dirname, 'src', f);
globalThis.window = globalThis;
globalThis.DQEngine = require(src('engine.js'));
require(src('content/_helpers.js'));
fs.readdirSync(src('content')).filter(f => /\.js$/.test(f) && !/^_helpers|^manual/.test(f)).sort().forEach(f => require(src('content/' + f)));
const Exam = require(src('exam_core.js'));
const POOL_FILES = fs.readdirSync(src('content_exam')).filter(f => /\.js$/.test(f)).sort();
POOL_FILES.forEach(f => require(src('content_exam/' + f)));
// Theoriefragen: die Fragen der Lektionen (vom Validator gegen die Engine geprueft), Antworten werden je Pruefung gemischt
const questions = [];
globalThis.DQ.theories.forEach(t => t.questions.forEach((q, i) => {
  const o = { id: 'Q' + t.id.slice(1) + '_' + (i + 1), level: t.ch <= 10 ? 'grund' : 'profi', ch: t.ch, q: q.q, options: q.options.slice(), answer: q.correct };
  questions.push(o); if (!Exam.questionDef(o.id)) globalThis.defExamQuestion(Object.assign({}, o));
}));
module.exports = { Exam, questions, POOL_FILES, DQ: globalThis.DQ, E: globalThis.DQEngine };

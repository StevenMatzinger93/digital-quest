globalThis.window = globalThis; globalThis.DQEngine = require('./src/engine.js');
require('./src/content/_helpers.js'); require('fs').readdirSync('./src/content').filter(f => !/^_helpers|manual/.test(f)).sort().forEach(f => require('./src/content/' + f));
const DQ = globalThis.DQ;
for (const id of process.argv.slice(2)) { const t = DQ.byId[id]; console.log('\n### ' + id + ' ' + t.title + '\n' + JSON.stringify({ brief: t.brief, palette: t.palette, limit: t.limit, need: t.need, start: t.start, ref: t.ref, tests: t.tests, measure: t.measure, wrong: (t.wrong || []).map(w => w.name) })); }

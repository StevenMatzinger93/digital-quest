// Build: node build.js
//   ../index.html          das Spiel als eine Datei, offline, ohne Konto
//   ../web/                gehostete Version (Aufbau wie SPS Quest):
//     index.html           Portal (Halle mit Toren, Login-Terminal, Leitstand, Administration, Live-Challenge)
//     labor/index.html     das Spiel mit Konto-Abgleich (window.DQ_PORTAL) und Feedback-Knopf
//     data/dq.json         Kapitel, Aufgaben, Theorien, Uebungswerkstatt (fuer Leitstand und Challenge)
//     data/dq_live.json    Musterschaltungen und Stoerungsszenarien (aus den wrong-Loesungen)
//     sw.js                ein Service Worker fuer Portal und Spiel, /api/ nie aus dem Cache
//   ../worker/gen/exam_bundle.js   Engine + Pruefungspool fuer den Worker (Bewertung der Pruefungen auf dem Server)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
// Zeilenenden vereinheitlichen: Git unter Windows checkt mit CRLF aus
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const P = f => fs.readFileSync(path.join(__dirname, 'portal', f), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const script = (title, code) => { if (/<\/script/i.test(code)) throw new Error(title + ' enthaelt </script>'); return '<script>\n/* ==== ' + title + ' ==== */\n' + code + '\n</script>\n'; };
const content = fs.readdirSync(path.join(__dirname, 'src/content')).filter(f => f.endsWith('.js') && f !== '_helpers.js' && f !== 'manual.js').sort();
const files = ['engine.js', 'content/_helpers.js', ...content.map(f => 'content/' + f), 'content/manual.js', 'circuit-ui.js', 'editor.js', 'bench.js', 'mini.js', 'visuals.js', 'tiles.js', 'calc.js', 'account.js', 'live.js', 'exam.js', 'app.js'].filter(f => fs.existsSync(path.join(__dirname, 'src', f)));
const js = files.map(f => `/* ==== ${f} ==== */\n` + src(f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS enthaelt </script>');
const tpl = src('index.template.html');
const fill = (t, pwa) => t.split('/*CSS*/').join(src('style.css')).split('/*JS*/').join(js).split('<!--PWA-->').join(pwa);
const root = path.join(__dirname, '..'), web = path.join(root, 'web'), lab = path.join(web, 'labor');

/* ---------- Spiel offline (eine Datei) ---------- */
fs.writeFileSync(path.join(root, 'index.html'), fill(tpl, '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(__dirname, 'assets/icon.svg'), 'utf8')) + '">'));

/* ---------- Spiel im Portal: web/labor/ ---------- */
fs.rmSync(web, { recursive: true, force: true });
fs.mkdirSync(path.join(web, 'data'), { recursive: true }); fs.mkdirSync(lab, { recursive: true });
const NOFONTS = t => t.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^\n]*\n?/, ''); // gehostet: keine Google-Fonts (Datenschutz)
const game = NOFONTS(fill(tpl, '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="../icon.svg"><link rel="apple-touch-icon" href="../icon-192.png">' +
  '<script>if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("../sw.js").catch(()=>{}));</script>'))
  .replace(/<body([^>]*)>\n/, (m, a) => '<body' + a + '>\n<script>window.DQ_PORTAL = true;</script>\n')
  .replace(/<\/body>/, () => script('FEEDBACK / FEHLER MELDEN', P('report.js')) + '</body>');
if (!/window\.DQ_PORTAL = true/.test(game)) throw new Error('DQ_PORTAL nicht eingesetzt');
fs.writeFileSync(path.join(lab, 'index.html'), game);
const icons = [{ src: '../icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '../icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: '../icon.svg', sizes: 'any', type: 'image/svg+xml' }];
fs.writeFileSync(path.join(lab, 'manifest.webmanifest'), JSON.stringify({ name: 'Digital Quest – Labor', short_name: 'Digital Quest', lang: 'de-CH', start_url: './', scope: '../', display: 'standalone', background_color: '#121212', theme_color: '#121212', icons }, null, 2));
['icon.svg', 'icon-192.png', 'icon-512.png'].forEach(f => { const p = path.join(__dirname, 'assets', f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(web, f)); });

/* ---------- Daten fuer Leitstand und Live-Challenge ---------- */
const E = require('./src/engine.js');
require('./src/content/_helpers.js');
content.forEach(f => require('./src/content/' + f));
const DQ = globalThis.DQ;
const meta = {
  quest: 'dq',
  chapters: DQ.chapters.map(c => ({ n: c.id, title: c.title, pro: c.stage === 'profi', seq: c.sequence })),
  tasks: DQ.tasks.filter(t => !t.messOnly || t.ch !== DQ.workshop.id).map(t => ({ id: t.id, ch: t.ch, title: t.title, boss: !!t.boss })),
  theory: DQ.theories.map(t => ({ id: t.id, ch: t.ch, title: t.title })),
  workshop: { id: DQ.workshop.id, title: DQ.workshop.title, tasks: DQ.workshop.sequence.map(id => ({ id, title: DQ.byId[id].title })) }
};
fs.writeFileSync(path.join(web, 'data', 'dq.json'), JSON.stringify(meta));
// Stoerungsszenarien: jede benannte Falschloesung (wrong) einer Aufgabe. Symptom = erste Pruefung, die daran scheitert
// (die Ursache – der Name der Falschloesung – sieht nur die Lehrperson).
const refs = {}, bugs = [];
DQ.tasks.forEach(t => {
  refs[t.id] = { parts: t.ref.parts, wires: t.ref.wires };
  (t.wrong || []).forEach((w, i) => {
    let bad = null;
    try { bad = E.runTask(t, w, E.expectedAnswers(t, t.ref)).results.filter(r => !r.ok)[0]; } catch (e) { return; }
    if (!bad) return;
    bugs.push({ id: 'b' + t.id + '_' + (i + 1), task: t.id, ch: t.ch, title: 'Störung in ' + t.id + ' „' + t.title + '“' + (t.wrong.length > 1 ? ' (' + (i + 1) + ')' : ''), cause: w.name || 'Falschlösung ' + (i + 1),
      symptom: 'Die Schaltung zu „' + t.title + '“ arbeitet nicht wie verlangt. Nicht erfüllt: ' + String(bad.text).replace(/\s+/g, ' ') + '.' });
  });
});
fs.writeFileSync(path.join(web, 'data', 'dq_live.json'), JSON.stringify({ refs, bugs }));

/* ---------- Portal ---------- */
const circuitCss = src('style.css').split('/*CIRCUIT-START*/').slice(1).map(x => x.split('/*CIRCUIT-END*/')[0]).join('\n');
if (circuitCss.length < 4000) throw new Error('Schaltungs-Stile (CIRCUIT-START/END in style.css) fehlen');
const portalCss = P('portal.css') + '\n/* ==== Mini-Schaltung im Portal: Variablen und Stile aus dem Spiel (style.css, CIRCUIT-Bloecke) ==== */\n' +
  ':root { --sym: #d8d8d8; --wire: #d9a441; --accent-lead: #ffb000; --accent-lead-dim: #8a6000; --accent-green: #39ff14; --accent-cyan: #1ec8e0; --accent-red: #ff3333; --accent-orange: #ff8c00;' +
  ' --bg-editor: #0c0d0a; --bg-secondary: #0d1218; --bg-tertiary: #111821; --text-dim: #8b98a6; --text-faint: #5a6774; --font-code: var(--mono); --font-ui: var(--font); }\n' + circuitCss +
  '\n.mini .btn.small { padding: 4px 10px; font-size: 13px; } .mini .mono { font-family: var(--mono); }\n';
const portalHead = (title, desc) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${desc}">
<meta name="theme-color" content="#05070a">
<title>${title}</title>
<link rel="icon" href="icon.svg">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-192.png">
<style>
${portalCss}
</style>
</head>
<body>
`;
const portalScripts = ['portal.js'].concat(fs.readdirSync(path.join(__dirname, 'portal')).filter(f => /^portal_.*\.js$/.test(f)).sort());
// Bibliotheken des Spiels, mit denen das Portal Schaltungen der Lernenden zeigt (Mini-Schaltung: Engine + Renderer)
const portalLibs = ['engine.js', 'circuit-ui.js', 'editor.js', 'bench.js', 'mini.js'];
const QR_LIB = path.join(__dirname, 'node_modules', 'qrcode-generator', 'qrcode.js');
const portal = portalHead('Digital Quest – Schaltungen bauen, messen, verstehen', 'Digital Quest: Lernspiel für Elektro- und Digitaltechnik mit Live-Simulation und Messgeräten. Klassen, Konten, Vorgaben und Live-Challenge für den Unterricht.')
  + P('body.html') + portalLibs.map(f => script('LABOR: ' + f, src(f))).join('')
  + (fs.existsSync(QR_LIB) ? script('QR-CODE (qrcode-generator, MIT-Lizenz, (c) Kazuhiko Arase)', fs.readFileSync(QR_LIB, 'utf8')) : '')
  + portalScripts.map(f => script('PORTAL: ' + f, P(f))).join('') + script('FEEDBACK / FEHLER MELDEN', P('report.js')) + '</body>\n</html>\n';
fs.writeFileSync(path.join(web, 'index.html'), portal);
['impressum.html', 'datenschutz.html'].forEach(f => {
  const s = P(f), m = s.match(/<title>(.*?)<\/title>/);
  fs.writeFileSync(path.join(web, f), portalHead((m ? m[1] : f) + ' – Digital Quest', 'Digital Quest – ' + (m ? m[1] : f)) + s.replace(/<title>.*?<\/title>\n?/, '') + '</body>\n</html>\n');
});
fs.writeFileSync(path.join(web, 'manifest.webmanifest'), JSON.stringify({
  name: 'Digital Quest', short_name: 'Digital Quest', lang: 'de-CH', start_url: './', scope: './', display: 'standalone',
  background_color: '#05070a', theme_color: '#05070a', description: 'Lernspiel für Elektro- und Digitaltechnik: bauen, messen, verstehen.',
  icons: icons.map(i => Object.assign({}, i, { src: i.src.replace('../', '') }))
}, null, 2));

/* ---------- Worker: Engine + Pruefungspool (nie im Browser) ---------- */
const XP = require('./exam_pool.js');
const bundleParts = ['engine.js', 'content/_helpers.js', 'content/_logic.js', 'exam_core.js'].concat(XP.POOL_FILES.map(f => 'content_exam/' + f));
const QUEST_TASKS = { dq: DQ.tasks.filter(t => typeof t.ch === 'number').map(t => ({ id: t.id, ch: t.ch, final: !!t.boss && (t.ch === 10 || t.ch === 15) })) };
const NL = String.fromCharCode(10);
const bundle = ['// GENERIERT von dev/build.js – nicht von Hand aendern. Engine, Pruefungskern und Pruefungspool fuer den Worker.']
  .concat(bundleParts.map(f => '/* ==== ' + f + ' ==== */' + NL + src(f)))
  .concat(['/* ==== Theoriefragen (aus den Lektionen) ==== */', JSON.stringify(XP.questions) + '.forEach(q => globalThis.defExamQuestion(q));',
    'export const Exam = globalThis.DQExam;', 'export const QUEST_TASKS = ' + JSON.stringify(QUEST_TASKS) + ';', '']).join(NL);
fs.mkdirSync(path.join(root, 'worker', 'gen'), { recursive: true });
fs.writeFileSync(path.join(root, 'worker', 'gen', 'exam_bundle.js'), bundle);
for (const f of files) if (/content_exam|exam_core/.test(f)) throw new Error('Pruefungspool darf nicht ins Spiel: ' + f);
if (/defExamTask|"hidden"/.test(game)) throw new Error('Pruefungspool ist im Spiel gelandet');

/* ---------- Service Worker (Wurzel): Portal und Spiel offline, /api/ und /z/ nie aus dem Cache ---------- */
const FILES = ['./', './index.html', './impressum.html', './datenschutz.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png',
  './data/dq.json', './data/dq_live.json', './labor/', './labor/index.html', './labor/manifest.webmanifest'];
const ver = crypto.createHash('sha1').update(portal + game + JSON.stringify(meta)).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(web, 'sw.js'), `// Service Worker: hält Portal und Labor offline verfügbar (Cache-first, Version ${ver})
const CACHE = 'dquest-${ver}';
const FILES = ${JSON.stringify(FILES)};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/z/')) return;
  e.respondWith(caches.match(e.request, { ignoreSearch:true }).then(r => r || fetch(e.request).then(res => {
    if(res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match(url.pathname.startsWith('/labor/') ? './labor/index.html' : './index.html'))));
});
`);
const kb = f => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log(`Build ok: index.html (${kb(path.join(root, 'index.html'))}), web/ Portal (${kb(path.join(web, 'index.html'))}) + labor/ (${kb(path.join(lab, 'index.html'))}), ${bugs.length} Stoerungsszenarien, Worker-Bundle ${(bundle.length / 1024).toFixed(0)} KB (${XP.Exam.X.tasks.length} Pruefungsvorlagen, ${XP.questions.length} Fragen), Cache ${ver}, ${files.length} Quelldateien`);

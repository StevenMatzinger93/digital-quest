// Build: node build.js  → ../index.html (offline, eine Datei) und ../web/ (PWA)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const content = fs.readdirSync(path.join(__dirname, 'src/content')).filter(f => f.endsWith('.js') && f !== '_helpers.js' && f !== 'manual.js').sort();
const files = ['engine.js', 'content/_helpers.js', ...content.map(f => 'content/' + f), 'content/manual.js', 'editor.js', 'app.js'];
const js = files.map(f => `/* ==== ${f} ==== */\n` + src(f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS enthaelt </script>');
const tpl = src('index.template.html');
const fill = (t, pwa) => t.split('/*CSS*/').join(src('style.css')).split('/*JS*/').join(js).split('<!--PWA-->').join(pwa);
const root = path.join(__dirname, '..'), web = path.join(root, 'web');
fs.writeFileSync(path.join(root, 'index.html'), fill(tpl, '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(__dirname, 'assets/icon.svg'), 'utf8')) + '">'));
fs.mkdirSync(web, { recursive: true });
const html = fill(tpl, '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-192.png">' +
  '<script>if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));</script>');
const hash = crypto.createHash('sha256').update(html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(web, 'index.html'), html);
['icon.svg', 'icon-192.png', 'icon-512.png'].forEach(f => { const p = path.join(__dirname, 'assets', f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(web, f)); });
fs.writeFileSync(path.join(web, 'manifest.webmanifest'), JSON.stringify({
  name: 'Digital Quest', short_name: 'Digital Quest', lang: 'de-CH', start_url: './', display: 'standalone',
  background_color: '#121212', theme_color: '#121212',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }]
}, null, 2));
fs.writeFileSync(path.join(web, 'sw.js'), `const C='dq-${hash}';const F=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok&&new URL(e.request.url).origin===location.origin){const c=n.clone();caches.open(C).then(x=>x.put(e.request,c));}return n;}).catch(()=>caches.match('index.html'))));});
`);
console.log(`Build ok: index.html (${(fs.statSync(path.join(root, 'index.html')).size / 1024).toFixed(0)} KB), web/ (Cache ${hash}), ${files.length} Quelldateien`);

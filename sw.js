// 安裝到手機桌面用的 Service Worker。
// 網頁本身：先抓網路上的最新版（最多等 3 秒），抓不到或太慢才用上次存下來的，所以更新後不會卡在舊版。
// 圖示、程式庫：直接用存下來的（很快），同時在背景更新。
const CACHE = 'outreach-v4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg', './img/logo.svg', './lib/modern-screenshot.js', './lib/qrcode-generator.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // LINE 登入、後端等外部請求不經過這裡
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (isPage) {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match(req, { ignoreSearch: true }).then(c => { if (!done && c) { done = true; resolve(c); } });
      const timer = setTimeout(fallback, 3000);
      fetch(req).then(res => { clearTimeout(timer); save(req, res); if (!done) { done = true; resolve(res); } })
        .catch(() => { clearTimeout(timer); caches.match(req, { ignoreSearch: true }).then(c => { if (!done) { done = true; resolve(c || Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => save(req, res)).catch(() => hit);
    return hit || net;
  }));
});

const root = self.registration.scope;
const CACHE_PREFIX = 'labela-shell-' + encodeURIComponent(new URL(root).pathname) + '-';
const CACHE_NAME = CACHE_PREFIX + '__REVISION__';
const ASSETS = __SHELL_FILES__;
const urls = ASSETS.map(path => new URL(path, root).href);
const indexURL = new URL('index.html', root).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const responses = await Promise.all(urls.map(async url => {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        const type = response.headers.get('content-type') || '';
        const validType = url.endsWith('.html') ? type.includes('text/html') :
          url.endsWith('.css') ? type.includes('text/css') : /javascript/.test(type);
        if (!response.ok || !validType) throw Error('Incomplete offline assets: ' + url);
        if (new URL(response.url).origin !== new URL(root).origin || !response.url.startsWith(root)) {
          throw Error('Offline asset redirected outside the app: ' + url);
        }
        // Cloudflare redirects index.html to /. Navigation requests cannot reuse a
        // redirected response, so store a new response with decoded body metadata.
        const body = await response.arrayBuffer();
        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('content-length');
        headers.delete('transfer-encoding');
        return new Response(body, { status: response.status, statusText: response.statusText, headers });
      }));
      await Promise.all(urls.map((url, i) => cache.put(url, responses[i])));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== new URL(root).origin || !url.href.startsWith(root)) return;
  const key = request.mode === 'navigate' ? indexURL :
    urls.find(asset => new URL(asset).pathname === url.pathname);
  if (!key) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE_NAME)).match(key);
    return cached || fetch(request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') {
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const ready = (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
      event.ports[0]?.postMessage({ ready });
    })());
  }
});

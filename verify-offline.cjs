const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'labela-offline-'));
let version = 1;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  let file = pathname.replace(/^\/labels\//, '/').slice(1) || 'index.html';
  if (!['index.html', 'style.css', 'app.js', 'mobile.js', 'offline.js', 'sw.js'].includes(file)) {
    response.writeHead(404); response.end(); return;
  }
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'application/javascript';
  if (version === 3 && file === 'style.css') {
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    response.end('<!doctype html>Unavailable asset'); return;
  }
  let body = fs.readFileSync(path.join(__dirname, 'dist', file), 'utf8');
  if (file === 'sw.js') body = body.replace(/const CACHE_NAME = [^;]+;/, "const CACHE_NAME = CACHE_PREFIX + 'test-version-" + version + "';");
  if (file === 'index.html') body = body.replace('<html lang="es">', '<html lang="es" data-test-version="' + version + '">');
  if (file === 'app.js') body += '\nwindow.__offlineTestBuild = ' + version + ';';
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(body);
});
async function ready(page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline-status')?.dataset.ready === 'true');
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let context;
  try {
    context = await chromium.launchPersistentContext(directory, { headless: true, viewport: { width: 1366, height: 768 } });
    let page = await context.newPage();
    await page.goto(origin + '/'); await ready(page);
    await page.evaluate(() => {
      state = { name: 'Diseño offline', w: 100, h: 60, bg: '#ffffff', elements: [el('text', 5, 5, 80, 20, 'Texto offline', { border: true })] };
      selected = state.elements[0].id; render(); persist();
    });
    await context.setOffline(true);
    await page.reload(); await ready(page);
    assert.equal(await page.evaluate(() => state.name), 'Diseño offline');
    assert.equal(await page.locator('#board [data-text-border]').count(), 1);
    await page.locator('[data-tab="data"]').click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#csv').click();
    await (await chooserPromise).setFiles({ name: 'datos.csv', mimeType: 'text/csv', buffer: Buffer.from('producto\nSin Internet\n') });
    await page.waitForFunction(() => rows[0]?.producto === 'Sin Internet');
    assert.equal(await page.evaluate(() => rows[0].producto), 'Sin Internet');
    await page.evaluate(() => { selected = state.elements[0].id; startInlineEdit(state.elements[0]); });
    await page.locator('.inline-text').fill('Edición sin Internet');
    await page.locator('.inline-text').press('Control+Enter');
    await page.locator('#save').click();
    const svg = await page.evaluate(() => svgDoc());
    assert(svg.includes('Edición sin Internet'));
    assert(await page.evaluate(() => buildPrintJob(state, [{}], 1).html.includes('data-text-border')));
    await page.close();
    page = await context.newPage();
    await page.goto(origin + '/?reopened=1'); await ready(page);
    assert.equal(await page.evaluate(() => state.elements[0].text), 'Edición sin Internet');
    assert.equal(await page.evaluate(() => rows[0].producto), 'Sin Internet');
    console.log('PASS offline reload, reopen, editing, CSV import, export and print generation');
    await context.setOffline(false);
    version = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    await page.waitForFunction(() => !document.querySelector('#offline-update').hidden);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.testVersion), '1');
    assert.equal(await page.evaluate(() => window.__offlineTestBuild), 1);
    // A storage failure must block an update/reload when the working design is unsaved.
    await page.evaluate(() => {
      window.originalStorageSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function() { throw Error('quota'); };
      state.elements[0].text = 'Pendiente de guardar';
    });
    await page.locator('#offline-update').click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.testVersion), '1');
    assert(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting));
    await page.evaluate(() => {
      Storage.prototype.setItem = window.originalStorageSet;
      selected = state.elements[0].id; startInlineEdit(state.elements[0]);
      activeEditor.input.value = 'Edición pendiente al actualizar';
    });
    await Promise.all([page.waitForNavigation(), page.locator('#offline-update').click()]);
    await ready(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.testVersion), '2');
    assert.equal(await page.evaluate(() => window.__offlineTestBuild), 2);
    assert.equal(await page.evaluate(() => state.elements[0].text), 'Edición pendiente al actualizar');
    assert(await page.evaluate(async () => !(await caches.keys()).some(name => name.endsWith('test-version-1'))));
    console.log('PASS atomic update, pending inline edit saved, failed storage blocks reload, old cache cleanup');
    version = 3;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      window.failedOfflineUpdate = false;
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', event => {
        if (event.target.state === 'redundant') window.failedOfflineUpdate = true;
      }));
      await reg.update();
    });
    await page.waitForFunction(() => window.failedOfflineUpdate);
    await context.setOffline(true);
    await page.reload(); await ready(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.testVersion), '2');
    assert.equal(await page.evaluate(() => window.__offlineTestBuild), 2);
    assert(await page.evaluate(async () => !(await caches.keys()).some(name => name.endsWith('test-version-3'))));
    console.log('PASS broken asset update preserves complete previous offline version');
    await context.close();
    context = await chromium.launchPersistentContext(directory, { headless: true, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await context.setOffline(true);
    page = await context.newPage();
    await page.goto(origin + '/'); await ready(page);
    assert.equal(await page.evaluate(() => state.elements[0].text), 'Edición pendiente al actualizar');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= 390));
    console.log('PASS browser restart offline, saved design and compact mobile layout');
    await context.setOffline(false); version = 2;
    const scoped = await context.newPage();
    await scoped.goto(origin + '/labels/'); await ready(scoped);
    await context.setOffline(true);
    await scoped.reload(); await ready(scoped);
    await page.reload(); await ready(page);
    assert(await scoped.evaluate(async () => (await caches.keys()).some(name => name.startsWith('labela-shell-%2Flabels%2F-'))));
    assert(await page.evaluate(async () => (await caches.keys()).some(name => name.startsWith('labela-shell-%2F-'))));
    console.log('PASS subdirectory support and independent offline caches per scope');
  } finally {
    if (context) await context.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const browser = await chromium.launch();
  try {
    // Exercise actual pointer capture, guide overlays, cleanup and undo.
    const guidePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await guidePage.goto(pathToFileURL(resolve('dist/index.html')).href);
    await guidePage.evaluate(() => {
      state = { name: 'Guías', w: 100, h: 60, bg: '#ffffff', elements: [el('rect', 10, 10, 20, 10)] };
      selected = null; history = []; future = []; fitScreen = false; fitWidth = false; zoom = 1; render();
    });
    await guidePage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const geometry = await guidePage.evaluate(() => {
      const board = $('#board').getBoundingClientRect();
      return { x: board.left, y: board.top, k: scale() };
    });
    const point = (x, y) => [geometry.x + x * geometry.k, geometry.y + y * geometry.k];
    await guidePage.mouse.move(...point(20, 15));
    await guidePage.mouse.down();
    await guidePage.mouse.move(...point(49.3, 29.3));
    assert.deepEqual(await guidePage.evaluate(() => [state.elements[0].x, state.elements[0].y]), [40, 25]);
    assert(await guidePage.locator('.alignment-guide').count() >= 2);
    assert.equal(await guidePage.locator('.alignment-guide').first().evaluate(node => getComputedStyle(node).pointerEvents), 'none');
    assert.equal(await guidePage.evaluate(() => svgDoc().includes('alignment-guide')), false);
    await guidePage.keyboard.down('Alt');
    await guidePage.mouse.move(...point(49.2, 29.2));
    assert.equal(await guidePage.locator('.alignment-guide').count(), 0);
    assert(await guidePage.evaluate(() => Math.abs(state.elements[0].x - 39.2) < .1));
    await guidePage.keyboard.up('Alt');
    await guidePage.mouse.move(...point(49.3, 29.3));
    await guidePage.mouse.up();
    assert.equal(await guidePage.locator('.alignment-guide').count(), 0);
    await guidePage.evaluate(() => stepHistory('undo'));
    assert.deepEqual(await guidePage.evaluate(() => [state.elements[0].x, state.elements[0].y]), [10, 10]);
    await guidePage.mouse.move(...point(20, 15));
    await guidePage.mouse.down();
    await guidePage.mouse.move(...point(49.3, 29.3));
    await guidePage.locator('.element').dispatchEvent('pointercancel');
    assert.equal(await guidePage.locator('.alignment-guide').count(), 0);
    await guidePage.mouse.up();
    await guidePage.close();
    for (const scenario of [
      { width: 1366, height: 600, touch: false, fraction: .55 },
      { width: 1280, height: 720, touch: false, fraction: .55 },
      { width: 390, height: 600, touch: true, fraction: .45 },
      { width: 844, height: 390, touch: true, fraction: .40 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: scenario.height },
        hasTouch: scenario.touch, isMobile: scenario.touch,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(resolve('dist/index.html')).href);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const sizes = await page.evaluate(() => {
        const area = document.querySelector('#canvas-area').getBoundingClientRect();
        return { width: area.width, height: area.height, bottom: area.bottom,
          pageWidth: document.documentElement.scrollWidth, viewport: innerHeight };
      });
      assert(sizes.height >= scenario.height * scenario.fraction, JSON.stringify({scenario,sizes}));
      assert(sizes.bottom <= scenario.height + 1, 'Canvas must stay inside the viewport');
      assert(sizes.pageWidth <= scenario.width + 1, 'Tool rows must not widen the page');
      if (scenario.touch) {
        assert(sizes.width >= scenario.width - 1, 'Phone canvas must keep the full width');
        await page.locator('#mobile-settings').click();
        assert(await page.locator('#mobile-panel').evaluate(panel => panel.open));
        await page.locator('#mobile-panel-close').click();
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => { state.elements = []; addElement('text'); });
      for (const selector of ['#text-bold', '#toolbar-fit-box', '#text-turn-right']) {
        const control = page.locator(selector);
        await control.click();
        const bounds = await page.locator(selector).boundingBox();
        const toolbar = await page.locator('#text-toolbar').boundingBox();
        assert(bounds.y >= toolbar.y && bounds.y + bounds.height <= toolbar.y + toolbar.height,
          'Toolbar buttons must remain fully visible inside the compact row');
      }
      assert.equal(await page.evaluate(() => state.elements[0].rotation), 90);
      if (scenario.touch) {
        const box = await page.locator('#text-turn-right').boundingBox();
        assert(box.height >= 40, 'Touch controls must remain large enough');
      }
      assert.deepEqual(errors, []);
      console.log('PASS compact layout', scenario.width, scenario.height, 'canvas height:', sizes.height);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

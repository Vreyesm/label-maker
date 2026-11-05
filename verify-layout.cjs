const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const browser = await chromium.launch();
  try {
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
      await page.evaluate(() => { state.elements = []; addElement('text'); });
      for (const selector of ['#text-bold', '#toolbar-fit-box', '#text-turn-right']) {
        const control = page.locator(selector);
        await control.scrollIntoViewIfNeeded();
        await control.click();
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

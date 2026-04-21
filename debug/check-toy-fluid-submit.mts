// Verifies the preset-submission UI (Option C v1, client side):
//   1. A Submit icon is present in the top bar (tooltip "Submit this preset").
//   2. Clicking it opens the SubmitPresetModal.
//   3. With no endpoint configured, the modal shows the "not enabled" banner.
//   4. The Submit button stays disabled without name + terms-accept.
//   5. Escape closes the modal.

import { chromium } from 'playwright';

const TARGET = process.env.TARGET || 'http://localhost:3000/toy-fluid.html';

function pass(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));

  await page.goto(TARGET, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 1. Submit icon present in top bar
  const submitBtn = page.locator('button[title*="Submit this preset"]').first();
  pass('Submit icon present in top bar', await submitBtn.isVisible());

  // 2. Click → modal opens
  await submitBtn.click();
  await page.waitForTimeout(250);
  const modalHeading = await page.locator('text=Submit preset').first().isVisible();
  pass('Clicking Submit opens modal', modalHeading);

  // 3. With endpoint unset → "not enabled" banner shows
  const disabledBanner = await page.locator('text=/Submissions aren.+t enabled/').first().isVisible().catch(() => false);
  pass('Modal shows "not enabled" banner when endpoint is null', disabledBanner);

  // 4. Submit button is disabled (either visually or attribute)
  const submitBtnInModal = page.locator('button:has-text("Submit")').last();
  const disabledAttr = await submitBtnInModal.isDisabled().catch(() => false);
  pass('Submit button is disabled without name + terms accept', disabledAttr);

  // 5. Escape closes the modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const stillOpen = await page.locator('text=Submit preset').first().isVisible().catch(() => false);
  pass('Escape closes the modal', !stillOpen);

  pass('no pageerrors', errs.length === 0);
  await browser.close();
  if (errs.length) { console.log('--- errors ---'); errs.forEach(e => console.log(e)); }
})().catch(e => { console.error(e); process.exit(2); });

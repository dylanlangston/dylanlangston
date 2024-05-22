import { test, expect } from '@playwright/test';

test('Ensure layout is correct', async ({ page }) => {
  await page.goto('');
  await page.reload();

  await expect(page).toHaveScreenshot("body.png", {
    clip: {
      x: 0,
      y: 0,
      height: 650,
      width: 400,
    },
    timeout: 10000,
    maxDiffPixelRatio: 0.02,
  });

  await expect(page).toHaveScreenshot("message.png", {
    clip: {
      x: 575,
      y: 50,
      height: 375,
      width: 660,
    },
    timeout: 10000,
    maxDiffPixelRatio: 0.2,
  });

  await expect(page).toHaveScreenshot("entire.png", {
    fullPage: true,
    timeout: 10000,
    maxDiffPixelRatio: 0.1,
  });
});

import { test, expect } from '@playwright/test';
import { getServer } from '../library/GeneratePreview';
import { build, get_default_templates } from '../library/Builder';
import * as http from 'http';
import { NullLogger } from '../library/NullLogger';

let serverInstances: { [key: number]: { server: http.Server, date: Date } } = {};

const templates = get_default_templates();

test.beforeEach(async ({ page }) => {
  const info = test.info();
  const port = 8080 + info.parallelIndex;

  let date: Date = new Date("01/02/2024");
  if (info.tags[0]) {
    date = new Date(info.tags[0].substring(1, info.tags[0].length).replace('/', '-'));
  }

  if (serverInstances[info.parallelIndex]?.date != date) {
    const buildResult = await build(templates, '1.0.0', date, `test-${port}`, true, new NullLogger());
  }

  if (!(serverInstances[info.parallelIndex]?.server)) {
    const server = getServer(port, templates, `test-${port}`);
    server.listen(port);
    serverInstances[info.parallelIndex] = { server, date };
  }
  else {
    const { server } = serverInstances[info.parallelIndex];
    serverInstances[info.parallelIndex] = { server, date };
  }

  await page.goto(`http://localhost:${port}/`, {
    waitUntil: "load"
  });

  // Wait for fade in effect
  await new Promise(r => setTimeout(r, 1000));
});

test('Ensure layout is correct', async ({ page }) => {
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
    maxDiffPixelRatio: 0.20,
  });

  await expect(page).toHaveScreenshot("entire.png", {
    fullPage: true,
    timeout: 10000,
    maxDiffPixelRatio: 0.1,
  });

  page.emulateMedia({
    colorScheme: 'dark'
  });

  await expect(page).toHaveScreenshot("entire-dark.png", {
    fullPage: true,
    timeout: 10000,
    maxDiffPixelRatio: 0.1,
  });
});

for (let holiday of [
  "01/01/2020",
  "02/14/2020",
  "03/17/2020",
  "04/01/2020",
  "04/22/2020",
  "05/04/2020",
  "05/05/2020",
  "10/31/2020",
  "12/25/2020"
]) {
  test(`Check holiday layout - ${holiday}`, { tag: '@' + holiday }, async ({ page }) => {
    await expect(page).toHaveScreenshot(`${holiday.replace('/', '-')}_message.png`, {
      clip: {
        x: 575,
        y: 50,
        height: 375,
        width: 660,
      },
      timeout: 10000,
      maxDiffPixelRatio: 0.20,
    });
  });
}
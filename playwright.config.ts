import { defineConfig } from '@playwright/test';
import fs from 'fs';

const systemChromium = ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) =>
  fs.existsSync(p)
);

export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    headless: true,
    launchOptions: {
      ...(systemChromium ? { executablePath: systemChromium } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
});

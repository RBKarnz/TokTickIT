import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false, // avoid concurrency collisions on database records
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // run sequentially to ensure deterministic DB states
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'Tablet',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
});

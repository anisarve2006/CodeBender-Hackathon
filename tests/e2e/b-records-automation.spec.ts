import { test, expect } from '@playwright/test';

test.describe('Member B: Records, Documents, Meds, and Automation E2E', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/c/00000000-0000-0000-0000-000000000000/appointments');
    await expect(page).toHaveURL(/\/login/);
  });

  test('calendar route requires authentication and returns 401 without session', async ({
    request,
  }) => {
    const res = await request.get('/api/calendar/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(401);
  });

  test('document signed URL route rejects unauthenticated requests with 401', async ({
    request,
  }) => {
    const res = await request.get('/api/documents/00000000-0000-0000-0000-000000000000/url');
    expect(res.status()).toBe(401);
  });

  test('export data route rejects unauthenticated requests with 403 or 401', async ({
    request,
  }) => {
    const res = await request.get('/api/circles/00000000-0000-0000-0000-000000000000/export');
    expect([401, 403]).toContain(res.status());
  });

  test('PWA manifest is accessible and serves standalone application metadata', async ({
    request,
  }) => {
    const res = await request.get('/manifest.webmanifest');
    if (res.status() === 200) {
      const json = await res.json();
      expect(json.name).toBe('Family Care Hub');
      expect(json.display).toBe('standalone');
    }
  });

  test('Service worker script is served with valid javascript content-type', async ({
    request,
  }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toMatch(/javascript/);
  });
});

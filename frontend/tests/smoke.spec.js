import { test, expect } from '@playwright/test';

test('home page loads with title and nav rail', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('WTF LivePulse');
  await expect(page.getByRole('link', { name: 'WTF LivePulse' })).toBeVisible();
});

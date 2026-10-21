import { test, expect } from '@playwright/test';

test('home page loads with title and nav bar', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('WTF LivePulse');
  await expect(page.getByText('WTF LivePulse')).toBeVisible();
});

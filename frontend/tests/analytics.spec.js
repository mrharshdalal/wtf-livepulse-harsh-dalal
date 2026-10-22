import { test, expect } from '@playwright/test';

test.describe('Analytics', () => {
  test('loads all 5 widgets without errors for the selected gym', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/analytics');
    await expect(page.locator('.gym-nav-row')).toHaveCount(10, { timeout: 10000 });

    await expect(page.getByText('Peak Hours Heatmap')).toBeVisible();
    await expect(page.locator('.hcell').first()).toBeVisible();

    await expect(page.getByText('Revenue by Plan Type')).toBeVisible();
    await expect(page.getByText('Monthly')).toBeVisible();

    await expect(page.getByText('New vs Renewal')).toBeVisible();
    await expect(page.locator('.donut-legend')).toBeVisible();

    await expect(page.getByText('Cross-Gym Revenue')).toBeVisible();
    await expect(page.locator('.hbar-row')).toHaveCount(10);

    await expect(page.getByText('Churn Risk', { exact: true })).toBeVisible();

    const bodyText = await page.locator('.main-content').innerText();
    expect(bodyText).not.toContain('undefined');
    expect(consoleErrors).toEqual([]);
  });
});

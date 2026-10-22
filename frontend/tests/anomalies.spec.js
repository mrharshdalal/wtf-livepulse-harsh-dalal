import { test, expect } from '@playwright/test';
import { withClient } from './helpers/db.js';

test.describe('Anomalies', () => {
  test('badge increments live when a new anomaly is detected (no reload)', async ({ page }) => {
    // Read-only: finds a gym that's already stale but not yet flagged,
    // rather than forcing the condition via a destructive UPDATE across a
    // gym's real check-in history (see backend's anomalyDetector.test.js
    // for the same non-destructive principle). Skips gracefully if no
    // such gym exists right now, rather than corrupting data to force one.
    const candidateGymId = await withClient((client) =>
      client
        .query(
          `SELECT g.id FROM gyms g
           WHERE g.status = 'active'
             AND g.id NOT IN (SELECT gym_id FROM checkins WHERE checked_in >= NOW() - INTERVAL '2 hours 10 minutes')
             AND g.id NOT IN (SELECT gym_id FROM anomalies WHERE type = 'zero_checkins' AND resolved = FALSE)
           LIMIT 1`
        )
        .then((r) => r.rows[0]?.id)
    );
    test.skip(!candidateGymId, 'No naturally-stale, not-yet-flagged gym available right now');
    test.setTimeout(45000); // one real 30s detector cycle + buffer

    await page.goto('/');
    const badgeBefore = await page
      .locator('.rail-icon .badge')
      .textContent()
      .catch(() => '0');

    await expect(async () => {
      const badgeNow = await page.locator('.rail-icon .badge').textContent();
      expect(badgeNow).not.toBe(badgeBefore);
    }).toPass({ timeout: 40000, intervals: [2000] });
  });

  test('dismiss flow: confirm modal dismisses a warning anomaly without a reload', async ({ page }) => {
    const message = `e2e fixture ${Date.now()}`;
    const anomalyId = await withClient(async (client) => {
      const { rows: gyms } = await client.query('SELECT id FROM gyms LIMIT 1');
      const { rows } = await client.query(
        `INSERT INTO anomalies (gym_id, type, severity, message) VALUES ($1, 'revenue_drop', 'warning', $2) RETURNING id`,
        [gyms[0].id, message]
      );
      return rows[0].id;
    });

    try {
      await page.goto('/anomalies');
      await page.locator('.search-box.toolbar input').fill(message);

      const row = page.locator('table.data-table tr', { hasText: message });
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Dismiss', exact: true }).click();

      const modal = page.locator('.modal-card');
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'Dismiss', exact: true }).click();

      await expect(row.getByRole('button', { name: 'Dismissed' })).toBeVisible({ timeout: 5000 });
    } finally {
      await withClient((client) => client.query('DELETE FROM anomalies WHERE id = $1', [anomalyId]));
    }
  });
});

-- Benchmark queries for WTF LivePulse. Run directly in psql once the
-- database has been seeded. Each uses the first gym (by name) as $1.
-- TODO: capture results as screenshots under screenshots/ and fill in
-- README.md / the root README "Query Benchmarks" table.

-- Q1: Live Occupancy (target < 0.5ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) FROM checkins
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1)
  AND checked_out IS NULL;

-- Q2: Today's Revenue (target < 0.8ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT SUM(amount) FROM payments
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1)
  AND paid_at >= CURRENT_DATE;

-- Q3: Churn Risk (target < 1ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, name, last_checkin_at FROM members
WHERE status = 'active'
  AND last_checkin_at < NOW() - INTERVAL '45 days';

-- Q4: Peak Hour Heatmap (target < 0.3ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM gym_hourly_stats
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1);

-- Q5: Cross-Gym Revenue (target < 2ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT gym_id, SUM(amount) FROM payments
WHERE paid_at >= NOW() - INTERVAL '30 days'
GROUP BY gym_id
ORDER BY SUM(amount) DESC;

-- Q6: Active Anomalies (target < 0.3ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM anomalies
WHERE resolved = FALSE
ORDER BY detected_at DESC;

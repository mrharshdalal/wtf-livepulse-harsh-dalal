-- Benchmark queries for WTF LivePulse. Run against the seeded database via:
--   docker compose exec -T db psql -U wtf -d wtf_livepulse -f /dev/stdin < benchmarks/queries.sql
-- Each is copied verbatim from the production SQL in backend/src/services/
-- (not a simplified approximation), with the $1/$2 bind params inlined as
-- literals so EXPLAIN ANALYZE can run them directly in psql. Each uses the
-- first gym (by name) as the target gym. Results: see README.md.

-- Q1: Live Occupancy -- statsService.getLiveOccupancy (target < 0.5ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*)::int AS n FROM checkins
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1)
  AND checked_out IS NULL;

-- Q2: Today's Revenue -- statsService.getTodayRevenue (target < 0.8ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COALESCE(SUM(amount), 0)::numeric AS n FROM payments
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1)
  AND paid_at >= CURRENT_DATE;

-- Q3: Churn Risk -- statsService.getChurnRisk (target < 1ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, name, last_checkin_at,
       CASE WHEN last_checkin_at IS NULL OR last_checkin_at < NOW() - INTERVAL '60 days'
            THEN 'critical' ELSE 'high' END AS risk_level
FROM members
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1) AND status = 'active'
  AND (last_checkin_at IS NULL OR last_checkin_at < NOW() - INTERVAL '45 days')
ORDER BY last_checkin_at ASC NULLS FIRST;

-- Q4: Peak Hour Heatmap -- statsService.getHeatmap, from the gym_hourly_stats
-- materialized view (target < 0.3ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT day_of_week, hour_of_day, checkin_count FROM gym_hourly_stats
WHERE gym_id = (SELECT id FROM gyms ORDER BY name LIMIT 1)
ORDER BY day_of_week, hour_of_day;

-- Q5: Cross-Gym Revenue -- statsService.getCrossGymRevenue (target < 2ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT g.id AS gym_id, g.name AS gym_name,
       COALESCE(p.total_revenue, 0)::numeric AS total_revenue,
       RANK() OVER (ORDER BY COALESCE(p.total_revenue, 0) DESC) AS rank
FROM gyms g
LEFT JOIN (
  SELECT gym_id, SUM(amount) AS total_revenue FROM payments
  WHERE paid_at >= NOW() - INTERVAL '30 days' GROUP BY gym_id
) p ON p.gym_id = g.id
ORDER BY total_revenue DESC, gym_name ASC;

-- Q6: Active Anomalies -- anomalyRepository.listAnomalies, unfiltered
-- (GET /api/anomalies with no gym_id/severity query params -- the most
-- common real usage) (target < 0.3ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, gym_id, type, severity, message, resolved, dismissed, detected_at, resolved_at
FROM anomalies
WHERE (resolved = FALSE OR resolved_at >= NOW() - INTERVAL '24 hours')
  AND (NULL::uuid IS NULL OR gym_id = NULL::uuid)
  AND (NULL::text IS NULL OR severity = NULL::text)
ORDER BY detected_at DESC;

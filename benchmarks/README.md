# Query Benchmarks

`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` output for the six benchmark
queries in `queries.sql` (Q1-Q6), captured against the fully seeded database
(10 gyms, 5,000 members, ~270k check-ins, ~6k payments). Each query is
copied verbatim from the production SQL that actually backs the
corresponding endpoint — not a simplified stand-in.

**Note on "screenshots":** this environment has no terminal-screenshot
capability, so each query's full plan is saved as plain text under
`screenshots/` instead of a `.png` — the text is the same evidence a
screenshot would show, just copy-pasteable and greppable.

## Results

| # | Query (production source) | Target | Actual | Plan |
|---|---|---|---|---|
| Q1 | Live Occupancy (`statsService.getLiveOccupancy`) | < 0.5ms | **0.089 ms** | Index Only Scan on `idx_checkins_live_occupancy` |
| Q2 | Today's Revenue (`statsService.getTodayRevenue`) | < 0.8ms | **0.084 ms** | Index Scan on `idx_payments_gym_date` |
| Q3 | Churn Risk (`statsService.getChurnRisk`) | < 1ms | **0.240 ms** | BitmapAnd of `idx_members_gym_id` + `idx_members_churn_risk` |
| Q4 | Peak Hour Heatmap (`statsService.getHeatmap`, from `gym_hourly_stats` mat. view) | < 0.3ms | **0.108 ms** | Bitmap Index Scan on `gym_hourly_stats_uidx` |
| Q5 | Cross-Gym Revenue (`statsService.getCrossGymRevenue`) | < 2ms | **0.556 ms** | Bitmap Index Scan on `idx_payments_date` + Hash Left Join + WindowAgg (`RANK()`) |
| Q6 | Active Anomalies (`anomalyRepository.listAnomalies`, unfiltered) | < 0.3ms | **0.036 ms** | Seq Scan on `anomalies` (table is ~19 rows — an index would be slower, not faster) |

All six clear their target comfortably, and none of the two write-heavy,
large tables (`checkins` ~270k rows, `payments` ~6k rows) ever falls back to
a sequential scan — every hit on those two tables goes through an index.
The `Seq Scan on gyms` (10 rows, used by every query to resolve "the first
gym by name") and `Seq Scan on anomalies` (Q6, ~19 rows) are both scans of
genuinely tiny tables where the planner is right to skip the index — not a
missed-index gap.

Full per-query plans: `screenshots/Q1_live_occupancy.txt` through
`screenshots/Q6_active_anomalies.txt`.

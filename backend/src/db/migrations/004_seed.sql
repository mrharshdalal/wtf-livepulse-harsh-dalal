-- TODO: implement the real seed per the Data Specification.
-- It must create 10 gyms, 5,000 members, ~270k check-ins over 90 days and
-- ~5-6k payments. It must be idempotent (safe to re-run), must finish in
-- under 60s, must print progress (RAISE NOTICE), and must finish by running
-- REFRESH MATERIALIZED VIEW gym_hourly_stats and VACUUM ANALYZE.

DO $$ BEGIN RAISE NOTICE 'Seed placeholder — TODO: implement seed per Data Specification'; END $$;

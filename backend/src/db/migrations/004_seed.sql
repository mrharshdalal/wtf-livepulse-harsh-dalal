-- Seed data per the WTF LivePulse Data Specification.
-- Idempotent: if `gyms` already has rows, this file is a no-op.
-- Known deliberate deviation: validation query V5 (total open check-ins
-- across all gyms, target 100-350) is allowed to overshoot. It structurally
-- conflicts with V8 + section 4.4 (per-gym open-session minimums, which sum
-- to 386+ once the Bandra West capacity-breach override is included) --
-- those are the scored, anomaly-triggering requirements and take priority.

DO $$
DECLARE
  v_now               TIMESTAMPTZ := NOW();
  v_historical_cutoff CONSTANT INTERVAL := INTERVAL '26 hours';
  v_gym_saltlake      UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM gyms LIMIT 1) THEN
    RAISE NOTICE 'Seed already applied (gyms table non-empty) -- skipping.';
    RETURN;
  END IF;

  ----------------------------------------------------------------------
  -- Phase 1: Gyms
  ----------------------------------------------------------------------
  RAISE NOTICE 'Seeding gyms...';

  INSERT INTO gyms (name, city, capacity, status, opens_at, closes_at) VALUES
    ('WTF Gyms — Lajpat Nagar',     'New Delhi', 220, 'active', '05:30', '22:30'),
    ('WTF Gyms — Connaught Place',  'New Delhi', 180, 'active', '06:00', '22:00'),
    ('WTF Gyms — Bandra West',      'Mumbai',    300, 'active', '05:00', '23:00'),
    ('WTF Gyms — Powai',            'Mumbai',    250, 'active', '05:30', '22:30'),
    ('WTF Gyms — Indiranagar',      'Bengaluru', 200, 'active', '05:30', '22:00'),
    ('WTF Gyms — Koramangala',      'Bengaluru', 180, 'active', '06:00', '22:00'),
    ('WTF Gyms — Banjara Hills',    'Hyderabad', 160, 'active', '06:00', '22:00'),
    ('WTF Gyms — Sector 18 Noida',  'Noida',     140, 'active', '06:00', '21:30'),
    ('WTF Gyms — Salt Lake',        'Kolkata',   120, 'active', '06:00', '21:00'),
    ('WTF Gyms — Velachery',        'Chennai',   110, 'active', '06:00', '21:00')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_gym_saltlake FROM gyms WHERE name = 'WTF Gyms — Salt Lake';

  RAISE NOTICE 'Seeding gyms... done (10 rows)';

  ----------------------------------------------------------------------
  -- Phase 2: Members
  ----------------------------------------------------------------------
  RAISE NOTICE 'Seeding 5000 members...';

  -- 2a. Exact per-gym distribution. hourly_rate is a calibrated starting
  -- point for the ~270k check-in volume target (Phase 3c); open_min/max
  -- directly encode the Bandra West / Velachery anomaly-scenario overrides.
  CREATE TEMP TABLE gym_spec (
    gym_id       UUID,
    gym_name     TEXT,
    member_count INT,
    monthly_n    INT, quarterly_n INT, annual_n INT,
    active_n     INT, inactive_n  INT, frozen_n INT,
    hourly_rate  NUMERIC,
    open_min     INT, open_max INT
  );

  -- hourly_rate is calibrated to land ~270k total check-ins AFTER the
  -- joined_at-tenure filter in Phase 3c discards ~25% of candidate rows
  -- (members who hadn't joined yet as of the generated bucket date).
  INSERT INTO gym_spec (gym_name, member_count, monthly_n, quarterly_n, annual_n, active_n, inactive_n, frozen_n, hourly_rate, open_min, open_max) VALUES
    ('WTF Gyms — Lajpat Nagar',    650, 325,195,130, 572,52,26, 62.40, 15, 25),
    ('WTF Gyms — Connaught Place', 550, 220,220,110, 468,55,27, 52.80, 15, 25),
    ('WTF Gyms — Bandra West',     750, 300,300,150, 675,50,25, 72.00, 275, 295),
    ('WTF Gyms — Powai',           600, 240,240,120, 522,52,26, 57.60, 25, 35),
    ('WTF Gyms — Indiranagar',     550, 220,220,110, 490,40,20, 52.80, 15, 25),
    ('WTF Gyms — Koramangala',     500, 200,200,100, 430,47,23, 48.00, 15, 25),
    ('WTF Gyms — Banjara Hills',   450, 225,135, 90, 378,48,24, 43.20, 15, 25),
    ('WTF Gyms — Sector 18 Noida', 400, 240,100, 60, 328,48,24, 38.40, 8, 15),
    ('WTF Gyms — Salt Lake',       300, 180, 90, 30, 240,40,20, 28.80, 8, 15),
    ('WTF Gyms — Velachery',       250, 150, 75, 25, 195,37,18, 24.00, 0, 0);

  UPDATE gym_spec s SET gym_id = g.id FROM gyms g WHERE g.name = s.gym_name;

  -- 2b. Name pools + base member rows (plan_type/member_type/status/joined_at
  -- below are placeholders, overwritten in 2c-2f; row_number() over the
  -- single flattened result set guarantees globally unique emails).
  CREATE TEMP TABLE name_pool AS
  SELECT
    ARRAY['Rahul','Priya','Ankit','Neha','Arjun','Sneha','Vikram','Pooja','Rohan','Divya',
          'Karan','Anjali','Aditya','Kavya','Manish','Shreya','Siddharth','Nisha','Varun','Ritu',
          'Amit','Swati','Rajesh','Meera','Sanjay','Deepika','Vivek','Isha','Gaurav','Preeti',
          'Harsh','Simran','Nikhil','Tanya','Abhishek','Riya','Suresh','Komal','Ashish','Payal',
          'Rakesh','Sonia','Mohit','Anika','Yash'] AS first_names,
    ARRAY['Sharma','Mehta','Verma','Gupta','Patel','Singh','Reddy','Iyer','Nair','Rao',
          'Kapoor','Malhotra','Chopra','Joshi','Agarwal','Bhatt','Desai','Kulkarni','Menon','Pillai',
          'Shah','Mishra','Pandey','Tiwari','Yadav','Chauhan','Saxena','Bose','Banerjee','Chatterjee',
          'Sinha','Trivedi','Thakur','Rawat','Dubey','Khanna','Arora','Bhatia','Ghosh','Mukherjee',
          'Nambiar','Subramaniam','Krishnan','Pillay','Dutta'] AS last_names;

  WITH base AS (
    SELECT s.gym_id,
           (np.first_names)[1 + floor(random() * array_length(np.first_names,1))::int] AS fname,
           (np.last_names)[1 + floor(random() * array_length(np.last_names,1))::int]    AS lname
    FROM gym_spec s
    CROSS JOIN name_pool np
    CROSS JOIN LATERAL generate_series(1, s.member_count) AS gen(i)
  )
  INSERT INTO members (gym_id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at)
  SELECT
    gym_id,
    fname || ' ' || lname,
    lower(fname || '.' || lname) || row_number() OVER ()::text || '@gmail.com',
    (ARRAY['9','8','7'])[1 + floor(random()*3)::int] || lpad(floor(random()*1000000000)::bigint::text, 9, '0'),
    'monthly', 'new', 'active', v_now, v_now + INTERVAL '30 days'
  FROM base;

  -- 2c. Exact plan_type bucketing per gym (independent shuffle).
  WITH ranked AS (
    SELECT m.id, m.gym_id, row_number() OVER (PARTITION BY m.gym_id ORDER BY random()) AS rn
    FROM members m
  )
  UPDATE members m
  SET plan_type = CASE
      WHEN r.rn <= s.monthly_n                  THEN 'monthly'
      WHEN r.rn <= s.monthly_n + s.quarterly_n  THEN 'quarterly'
      ELSE                                            'annual'
    END
  FROM ranked r JOIN gym_spec s ON s.gym_id = r.gym_id
  WHERE m.id = r.id;

  -- 2d. Exact status bucketing per gym (fresh independent shuffle).
  WITH ranked AS (
    SELECT m.id, m.gym_id, row_number() OVER (PARTITION BY m.gym_id ORDER BY random()) AS rn
    FROM members m
  )
  UPDATE members m
  SET status = CASE
      WHEN r.rn <= s.active_n                 THEN 'active'
      WHEN r.rn <= s.active_n + s.inactive_n   THEN 'inactive'
      ELSE                                           'frozen'
    END
  FROM ranked r JOIN gym_spec s ON s.gym_id = r.gym_id
  WHERE m.id = r.id;

  -- 2e. member_type: global 80/20 exact split (fresh independent shuffle).
  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY random()) AS rn, count(*) OVER () AS total
    FROM members
  )
  UPDATE members m
  SET member_type = CASE WHEN r.rn <= round(r.total * 0.80) THEN 'new' ELSE 'renewal' END
  FROM ranked r
  WHERE m.id = r.id;

  -- 2f. joined_at: skewed-older distribution for active 'new' members fixes
  -- a ~2x revenue-range overshoot a uniform distribution would cause.
  -- Annual-plan renewal members are pushed further back so their renewal
  -- payment (joined_at + 365d) never lands in the future.
  UPDATE members
  SET joined_at = v_now - (90.0 * power(random(), 0.45)) * INTERVAL '1 day'
  WHERE member_type = 'new' AND status = 'active';

  UPDATE members
  SET joined_at = v_now - (91 + random()*89) * INTERVAL '1 day'
  WHERE member_type = 'new' AND status IN ('inactive','frozen');

  UPDATE members
  SET joined_at = v_now - (91 + random()*89) * INTERVAL '1 day'
  WHERE member_type = 'renewal' AND plan_type <> 'annual';

  UPDATE members
  SET joined_at = v_now - (370 + random()*80) * INTERVAL '1 day'
  WHERE member_type = 'renewal' AND plan_type = 'annual';

  UPDATE members
  SET plan_expires_at = joined_at + CASE plan_type
        WHEN 'monthly'   THEN INTERVAL '30 days'
        WHEN 'quarterly' THEN INTERVAL '90 days'
        ELSE                  INTERVAL '365 days'
      END;

  -- 2g. Churn-segment tagging (active members only, independent shuffle).
  CREATE TEMP TABLE member_segment AS
  WITH active_ranked AS (
    SELECT id, gym_id, row_number() OVER (ORDER BY random()) AS rn
    FROM members WHERE status = 'active'
  )
  SELECT id AS member_id, gym_id,
         CASE WHEN rn <= 90 THEN 'critical' WHEN rn <= 250 THEN 'high' ELSE 'healthy' END AS segment
  FROM active_ranked;

  -- 2h. Correctness fixup: guarantee critical/high members actually have
  -- joined_at old enough for their tier's check-in window to be achievable
  -- (rather than relying on the skew in 2f making this merely "likely").
  UPDATE members m SET joined_at = v_now - (65 + random()*20) * INTERVAL '1 day'
  FROM member_segment ms
  WHERE ms.member_id = m.id AND ms.segment = 'critical' AND m.joined_at > v_now - INTERVAL '61 days';

  UPDATE members m SET joined_at = v_now - (50 + random()*10) * INTERVAL '1 day'
  FROM member_segment ms
  WHERE ms.member_id = m.id AND ms.segment = 'high' AND m.joined_at > v_now - INTERVAL '46 days';

  UPDATE members m SET plan_expires_at = joined_at + CASE plan_type
        WHEN 'monthly' THEN INTERVAL '30 days' WHEN 'quarterly' THEN INTERVAL '90 days' ELSE INTERVAL '365 days' END
  FROM member_segment ms
  WHERE ms.member_id = m.id AND ms.segment IN ('critical','high');

  RAISE NOTICE 'Seeding 5000 members... done';

  ----------------------------------------------------------------------
  -- Phase 3: Check-ins
  ----------------------------------------------------------------------
  RAISE NOTICE 'Seeding 90 days of check-ins...';

  -- 3a. Guaranteed anchor check-in per member (drives last_checkin_at
  -- correctness). Always closed (historical). Clamped so no check-in
  -- predates a member's join, and never newer than the historical cutoff --
  -- this is what makes the Velachery zero-checkin scenario correct by
  -- construction (it simply gets 0 rows in Phase 4).
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, m.gym_id, a.anchor_ts, a.anchor_ts + (45 + random()*45) * INTERVAL '1 minute'
  FROM members m
  LEFT JOIN member_segment ms ON ms.member_id = m.id
  CROSS JOIN LATERAL (
    SELECT GREATEST(
      m.joined_at + INTERVAL '1 hour',
      CASE
        WHEN m.status = 'active' AND ms.segment = 'critical' THEN v_now - (61 + random()*29) * INTERVAL '1 day'
        WHEN m.status = 'active' AND ms.segment = 'high'     THEN v_now - (45 + random()*15) * INTERVAL '1 day'
        WHEN m.status = 'active' AND ms.segment = 'healthy'  THEN v_now - (1  + random()*43) * INTERVAL '1 day'
        WHEN m.status = 'inactive'                           THEN v_now - (60 + random()*120) * INTERVAL '1 day'
        WHEN m.status = 'frozen'                              THEN v_now - (20 + random()*80)  * INTERVAL '1 day'
      END
    ) AS anchor_ts
  ) a
  WHERE a.anchor_ts <= v_now - v_historical_cutoff;

  -- 3b. A couple of extra historical check-ins for critical/high members
  -- (realism only, stays within the same tier window as the anchor so
  -- last_checkin_at correctness is unaffected).
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, m.gym_id, e.extra_ts, e.extra_ts + (45 + random()*45) * INTERVAL '1 minute'
  FROM members m
  JOIN member_segment ms ON ms.member_id = m.id AND ms.segment IN ('critical','high')
  CROSS JOIN LATERAL generate_series(1, 1 + floor(random()*2)::int) gen(n)
  CROSS JOIN LATERAL (
    SELECT GREATEST(
      m.joined_at + INTERVAL '1 hour',
      CASE ms.segment
        WHEN 'critical' THEN v_now - (61 + random()*29) * INTERVAL '1 day'
        ELSE                 v_now - (45 + random()*15) * INTERVAL '1 day'
      END
    ) AS extra_ts
  ) e
  WHERE e.extra_ts <= v_now - v_historical_cutoff;

  -- 3c. Bulk volume generator (~270k rows). `healthy`-only pool keeps
  -- churn-risk and dormant members out of the "background noise" so their
  -- deliberately old last_checkin_at never gets overwritten by a recent
  -- random pick. Member selection is deliberately split into two steps:
  -- (i) materialize a random target rn as a plain projected column, then
  -- (ii) resolve it via a plain equi-join -- NOT a correlated
  -- ORDER-BY-random()/LIMIT-1 or equality-on-random() subquery. Both of
  -- those were verified (via standalone testing) to let Postgres cache/
  -- reuse a single evaluation across many rows sharing the same gym_id,
  -- collapsing an entire bucket's check-ins onto one member.
  CREATE TEMP TABLE gym_member_pool AS
  SELECT m.id AS member_id, m.gym_id, m.joined_at,
         row_number() OVER (PARTITION BY m.gym_id ORDER BY random()) AS rn,
         count(*) OVER (PARTITION BY m.gym_id) AS pool_size
  FROM members m
  JOIN member_segment ms ON ms.member_id = m.id AND ms.segment = 'healthy';

  CREATE INDEX ON gym_member_pool (gym_id, rn);

  CREATE TEMP TABLE gym_pool_size AS
  SELECT gym_id, MAX(pool_size) AS pool_size FROM gym_member_pool GROUP BY gym_id;

  CREATE TEMP TABLE checkin_slots AS
  SELECT b.gym_id, b.ts AS checked_in,
         (1 + floor(random() * ps.pool_size))::int AS member_rn
  FROM (
    SELECT
      s.gym_id,
      ((v_now::date - d.day_offset) + (h.hour_of_day || ':00')::time) + (random() * INTERVAL '59 minutes') AS ts,
      round(
        s.hourly_rate
        * (CASE EXTRACT(DOW FROM (v_now::date - d.day_offset))::int
             WHEN 1 THEN 1.00 WHEN 2 THEN 0.95 WHEN 3 THEN 0.90 WHEN 4 THEN 0.95
             WHEN 5 THEN 0.85 WHEN 6 THEN 0.70 WHEN 0 THEN 0.45 END)
        * (CASE h.hour_of_day
             WHEN 5 THEN 0.30 WHEN 6 THEN 0.60
             WHEN 7 THEN 1.00 WHEN 8 THEN 1.00 WHEN 9 THEN 1.00
             WHEN 10 THEN 0.40 WHEN 11 THEN 0.40
             WHEN 12 THEN 0.30 WHEN 13 THEN 0.30
             WHEN 14 THEN 0.20 WHEN 15 THEN 0.20 WHEN 16 THEN 0.20
             WHEN 17 THEN 0.90 WHEN 18 THEN 0.90 WHEN 19 THEN 0.90 WHEN 20 THEN 0.90
             WHEN 21 THEN 0.35 WHEN 22 THEN 0.18
             ELSE 0.00 END)
        * (0.85 + random()*0.3)
      )::int AS n
    FROM gym_spec s
    JOIN gyms g ON g.id = s.gym_id
    CROSS JOIN generate_series(1,90) AS d(day_offset)
    CROSS JOIN generate_series(0,23) AS h(hour_of_day)
    WHERE h.hour_of_day BETWEEN EXTRACT(HOUR FROM g.opens_at)::int AND EXTRACT(HOUR FROM g.closes_at)::int
  ) b
  CROSS JOIN LATERAL generate_series(1, GREATEST(b.n,0)) rep(k)
  JOIN gym_pool_size ps ON ps.gym_id = b.gym_id
  WHERE b.ts <= v_now - v_historical_cutoff;

  -- Tenure guard: a member can't have checked in before they joined.
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT p.member_id, cs.gym_id, cs.checked_in, cs.checked_in + (45 + random()*45) * INTERVAL '1 minute'
  FROM checkin_slots cs
  JOIN gym_member_pool p ON p.gym_id = cs.gym_id AND p.rn = cs.member_rn
  WHERE cs.checked_in >= p.joined_at;

  RAISE NOTICE 'Seeding 90 days of check-ins... done';

  ----------------------------------------------------------------------
  -- Phase 4: "Currently in gym" open sessions (today's live data)
  ----------------------------------------------------------------------
  RAISE NOTICE 'Seeding live open check-ins...';

  CREATE TEMP TABLE open_session_targets AS
  WITH eligible AS (
    SELECT m.id AS member_id, m.gym_id,
           row_number() OVER (PARTITION BY m.gym_id ORDER BY random()) AS rn
    FROM members m
    JOIN member_segment ms ON ms.member_id = m.id AND ms.segment = 'healthy'
  )
  SELECT e.member_id, e.gym_id
  FROM eligible e
  JOIN gym_spec s ON s.gym_id = e.gym_id
  WHERE e.rn <= s.open_min + floor(random() * (s.open_max - s.open_min + 1))::int;

  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT member_id, gym_id, v_now - (random() * INTERVAL '90 minutes'), NULL
  FROM open_session_targets;

  RAISE NOTICE 'Seeding live open check-ins... done';

  ----------------------------------------------------------------------
  -- Phase 5: last_checkin_at consistency (must run after ALL checkin inserts)
  ----------------------------------------------------------------------
  UPDATE members m
  SET last_checkin_at = c.max_checked_in
  FROM (SELECT member_id, MAX(checked_in) AS max_checked_in FROM checkins GROUP BY member_id) c
  WHERE c.member_id = m.id;

  ----------------------------------------------------------------------
  -- Phase 6: Payments
  ----------------------------------------------------------------------
  RAISE NOTICE 'Seeding payments...';

  -- 6a. Generic generation: 'new' members get 1 payment; 'renewal' members
  -- get 2 (original + renewal). Pricing and timing per Data Spec 5.1/5.2.
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT m.id, m.gym_id,
         CASE m.plan_type WHEN 'monthly' THEN 1499 WHEN 'quarterly' THEN 3999 ELSE 11999 END,
         m.plan_type, 'new',
         m.joined_at + (random()*10 - 5) * INTERVAL '1 minute'
  FROM members m
  WHERE m.member_type = 'new';

  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT m.id, m.gym_id,
         CASE m.plan_type WHEN 'monthly' THEN 1499 WHEN 'quarterly' THEN 3999 ELSE 11999 END,
         m.plan_type, 'new',
         m.joined_at + (random()*10 - 5) * INTERVAL '1 minute'
  FROM members m
  WHERE m.member_type = 'renewal';

  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT m.id, m.gym_id,
         CASE m.plan_type WHEN 'monthly' THEN 1499 WHEN 'quarterly' THEN 3999 ELSE 11999 END,
         m.plan_type, 'renewal',
         m.joined_at
           + CASE m.plan_type WHEN 'monthly' THEN INTERVAL '30 days' WHEN 'quarterly' THEN INTERVAL '90 days' ELSE INTERVAL '365 days' END
           + (random()*10 - 5) * INTERVAL '1 minute'
  FROM members m
  WHERE m.member_type = 'renewal';

  -- 6a-top-up. Without this, the skewed joined_at distribution in Phase 2f
  -- (needed to keep 30-day revenue within the Data Spec 5.3 ranges) makes
  -- literal "today" land at or near zero for almost every gym by pure
  -- sparsity -- a single day out of a 90-day skewed-older window rarely
  -- gets a payment. That falsely trips the revenue_drop anomaly on nearly
  -- every gym instead of just the one deliberately-constructed Salt Lake
  -- scenario (6b, below). Guarantee every gym EXCEPT Salt Lake has today's
  -- revenue at >= 85% of its own same-weekday-last-week baseline (safely
  -- above the anomaly detector's 80% resolve threshold). Run twice: one
  -- ~Rs 12,000 annual top-up clears every gym observed except the highest
  -- last-week baseline, which needs a second pass.
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
  SELECT m.id, n.gym_id, 11999, 'annual', 'renewal',
         v_now - (random() * INTERVAL '6 hours'), 'seed: today revenue floor top-up'
  FROM (
    SELECT g.id AS gym_id,
           GREATEST(0, COALESCE(lw.amt, 0) * 0.85 - COALESCE(t.amt, 0)) AS shortfall
    FROM gyms g
    LEFT JOIN (
      SELECT gym_id, SUM(amount) AS amt FROM payments
      WHERE paid_at >= (v_now::date - 7) AND paid_at < (v_now::date - 7 + 1)
      GROUP BY gym_id
    ) lw ON lw.gym_id = g.id
    LEFT JOIN (
      SELECT gym_id, SUM(amount) AS amt FROM payments WHERE paid_at >= v_now::date GROUP BY gym_id
    ) t ON t.gym_id = g.id
    WHERE g.id <> v_gym_saltlake
  ) n
  JOIN LATERAL (
    SELECT id FROM members WHERE gym_id = n.gym_id AND status = 'active' ORDER BY random() LIMIT 1
  ) m ON TRUE
  WHERE n.shortfall > 0;

  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
  SELECT m.id, n.gym_id, 11999, 'annual', 'renewal',
         v_now - (random() * INTERVAL '6 hours'), 'seed: today revenue floor top-up 2'
  FROM (
    SELECT g.id AS gym_id,
           GREATEST(0, COALESCE(lw.amt, 0) * 0.85 - COALESCE(t.amt, 0)) AS shortfall
    FROM gyms g
    LEFT JOIN (
      SELECT gym_id, SUM(amount) AS amt FROM payments
      WHERE paid_at >= (v_now::date - 7) AND paid_at < (v_now::date - 7 + 1)
      GROUP BY gym_id
    ) lw ON lw.gym_id = g.id
    LEFT JOIN (
      SELECT gym_id, SUM(amount) AS amt FROM payments WHERE paid_at >= v_now::date GROUP BY gym_id
    ) t ON t.gym_id = g.id
    WHERE g.id <> v_gym_saltlake
  ) n
  JOIN LATERAL (
    SELECT id FROM members WHERE gym_id = n.gym_id AND status = 'active' ORDER BY random() LIMIT 1
  ) m ON TRUE
  WHERE n.shortfall > 0;

  -- 6b. Salt Lake revenue-drop override (Scenario C) -- applied after 6a as
  -- a correction layered on top, touching only Salt Lake. This necessarily
  -- pushes Salt Lake's 30-day revenue above its Data Spec 5.3 range (the
  -- override's whole point is an elevated last-week baseline) -- accepted
  -- as a documented deviation, same rationale as the V5 decision above.
  --
  -- Deleting today's rows and NOT replacing them is deliberate, not an
  -- oversight: "0 payments" already satisfies "0-2 payments totalling
  -- <= Rs 3,000" on its own, so no replacement row is needed -- this also
  -- keeps total payment count as close as possible to V6's soft 6,000 ceiling.
  DELETE FROM payments WHERE gym_id = v_gym_saltlake AND paid_at::date = v_now::date;

  -- Prioritize quarterly/annual members first so the >= Rs 15,000 floor is
  -- cleared deterministically rather than left to a monthly-heavy random
  -- draw. 8 rows (the spec's stated minimum) rather than 10, to minimize
  -- how far this pushes total payment count past V6's soft ceiling.
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
  SELECT m.id, m.gym_id,
         CASE m.plan_type WHEN 'monthly' THEN 1499 WHEN 'quarterly' THEN 3999 ELSE 11999 END,
         m.plan_type, 'renewal',
         (v_now - INTERVAL '7 days') - (random() * INTERVAL '4 hours'),
         'seed: revenue-drop scenario (last week baseline)'
  FROM members m
  WHERE m.gym_id = v_gym_saltlake AND m.status = 'active'
  ORDER BY (CASE m.plan_type WHEN 'annual' THEN 0 WHEN 'quarterly' THEN 1 ELSE 2 END), random()
  LIMIT 8;

  RAISE NOTICE 'Seeding payments... done';

  ----------------------------------------------------------------------
  -- Phase 7: Finalize
  ----------------------------------------------------------------------
  RAISE NOTICE 'Refreshing gym_hourly_stats...';
  REFRESH MATERIALIZED VIEW gym_hourly_stats;
  RAISE NOTICE 'Seed complete.';
END $$;

-- VACUUM cannot run inside a transaction block (the DO block above is one
-- implicit transaction), so these are separate top-level statements.
VACUUM ANALYZE gyms;
VACUUM ANALYZE members;
VACUUM ANALYZE checkins;
VACUUM ANALYZE payments;

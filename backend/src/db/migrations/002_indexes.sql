-- Supports churn-risk scans: active members who haven't checked in recently.
CREATE INDEX IF NOT EXISTS idx_members_churn_risk ON members (last_checkin_at) WHERE status = 'active';

-- Supports per-gym member lookups and joins.
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members (gym_id);

-- Supports time-range scans over check-ins (BRIN is cheap for append-mostly, time-ordered data).
CREATE INDEX IF NOT EXISTS idx_checkins_time_brin ON checkins USING BRIN (checked_in);

-- Supports "who is currently in the gym" live-occupancy lookups.
CREATE INDEX IF NOT EXISTS idx_checkins_live_occupancy ON checkins (gym_id, checked_out) WHERE checked_out IS NULL;

-- Supports per-member check-in history lookups, most recent first.
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins (member_id, checked_in DESC);

-- Supports per-gym revenue queries ordered by date.
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON payments (gym_id, paid_at DESC);

-- Supports cross-gym revenue queries ordered by date.
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (paid_at DESC);

-- Supports the active-anomalies feed, newest first, per gym.
CREATE INDEX IF NOT EXISTS idx_anomalies_active ON anomalies (gym_id, detected_at DESC) WHERE resolved = FALSE;

-- TODO: tune indexes after seeding (e.g. covering index for cross-gym revenue) — no Seq Scan allowed on checkins/payments.

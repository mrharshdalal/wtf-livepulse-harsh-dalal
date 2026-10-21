const { query } = require('../db/pool');

async function getGymsList() {
  // ONE query, no N+1: LATERAL subqueries per gym, each hitting
  // idx_checkins_live_occupancy / idx_payments_gym_date.
  const { rows } = await query(`
    SELECT g.id, g.name, g.city, g.capacity, g.status,
           occ.current_occupancy,
           COALESCE(rev.today_revenue, 0)::numeric AS today_revenue
    FROM gyms g
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS current_occupancy
      FROM checkins c WHERE c.gym_id = g.id AND c.checked_out IS NULL
    ) occ ON TRUE
    LEFT JOIN LATERAL (
      SELECT SUM(amount) AS today_revenue
      FROM payments p WHERE p.gym_id = g.id AND p.paid_at >= CURRENT_DATE
    ) rev ON TRUE
    ORDER BY g.name`);
  return rows.map((r) => ({ ...r, today_revenue: Number(r.today_revenue) }));
}

async function getGymBasic(gymId) {
  const { rows } = await query(
    `SELECT id, name, city, capacity, status, opens_at, closes_at FROM gyms WHERE id = $1`,
    [gymId]
  );
  return rows[0] || null;
}

async function gymExists(gymId) {
  const { rows } = await query(`SELECT 1 FROM gyms WHERE id = $1`, [gymId]);
  return rows.length > 0;
}

/** @param {string} gymId */
async function getLiveOccupancy(gymId) {
  // Target < 0.5ms (Q1) -- exact match on idx_checkins_live_occupancy.
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
    [gymId]
  );
  return rows[0].n;
}

/** @param {string} gymId */
async function getTodayRevenue(gymId) {
  // Target < 0.8ms (Q2). CURRENT_DATE evaluates in the session TZ
  // (Asia/Kolkata, set in db/pool.js's connect hook).
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS n FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
    [gymId]
  );
  return Number(rows[0].n);
}

async function getSameWeekdayLastWeekRevenue(gymId) {
  // Exactly 7 days back is automatically the same weekday -- no DOW math.
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS n FROM payments
     WHERE gym_id = $1 AND paid_at >= (CURRENT_DATE - INTERVAL '7 days')
       AND paid_at < (CURRENT_DATE - INTERVAL '7 days' + INTERVAL '1 day')`,
    [gymId]
  );
  return Number(rows[0].n);
}

async function getRecentCheckinWithinWindow(gymId, windowHours = 3) {
  // Bounded scan (evaluator only needs "newer than ~2h or not") is far
  // cheaper than an unbounded MAX(checked_in) over the whole table.
  const { rows } = await query(
    `SELECT MAX(checked_in) AS last_checkin_at FROM checkins
     WHERE gym_id = $1 AND checked_in >= NOW() - ($2::int * INTERVAL '1 hour')`,
    [gymId, windowHours]
  );
  return rows[0].last_checkin_at; // Date|null
}

/** @param {string} gymId */
async function getChurnRisk(gymId) {
  // Fixed 45+/60+ day lookback -- NOT affected by dateRange.
  const { rows } = await query(
    `SELECT id, name, last_checkin_at,
            CASE WHEN last_checkin_at IS NULL OR last_checkin_at < NOW() - INTERVAL '60 days'
                 THEN 'critical' ELSE 'high' END AS risk_level
     FROM members
     WHERE gym_id = $1 AND status = 'active'
       AND (last_checkin_at IS NULL OR last_checkin_at < NOW() - INTERVAL '45 days')
     ORDER BY last_checkin_at ASC NULLS FIRST`,
    [gymId]
  );
  return rows;
}

/** @param {string} gymId */
async function getHeatmap(gymId) {
  // Always last 7 days (baked into the view's own WHERE) -- target < 0.3ms (Q4).
  const { rows } = await query(
    `SELECT day_of_week, hour_of_day, checkin_count FROM gym_hourly_stats
     WHERE gym_id = $1 ORDER BY day_of_week, hour_of_day`,
    [gymId]
  );
  return rows; // sparse (0-count cells absent); frontend zero-fills the 7x24 grid
}

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

async function getRevenueByPlan(gymId, days) {
  // Explicit ::int cast avoids "could not determine data type of parameter".
  const { rows } = await query(
    `SELECT plan_type, COALESCE(SUM(amount), 0)::numeric AS revenue, COUNT(*)::int AS payment_count
     FROM payments WHERE gym_id = $1 AND paid_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY plan_type ORDER BY plan_type`,
    [gymId, days]
  );
  return rows.map((r) => ({ ...r, revenue: Number(r.revenue) }));
}

async function getNewVsRenewalRatio(gymId, days) {
  // From payments.payment_type (timestamped), not members.member_type
  // (a static label set once at seed time that can't be windowed by date).
  const { rows } = await query(
    `SELECT payment_type, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS revenue
     FROM payments WHERE gym_id = $1 AND paid_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY payment_type`,
    [gymId, days]
  );
  return rows.map((r) => ({ ...r, revenue: Number(r.revenue) }));
}

async function getCrossGymRevenue() {
  // Target < 2ms. LEFT JOIN so a zero-revenue gym still ranks.
  const { rows } = await query(`
    SELECT g.id AS gym_id, g.name AS gym_name,
           COALESCE(p.total_revenue, 0)::numeric AS total_revenue,
           RANK() OVER (ORDER BY COALESCE(p.total_revenue, 0) DESC) AS rank
    FROM gyms g
    LEFT JOIN (
      SELECT gym_id, SUM(amount) AS total_revenue FROM payments
      WHERE paid_at >= NOW() - INTERVAL '30 days' GROUP BY gym_id
    ) p ON p.gym_id = g.id
    ORDER BY total_revenue DESC, gym_name ASC`);
  return rows.map((r) => ({ ...r, total_revenue: Number(r.total_revenue), rank: Number(r.rank) }));
}

async function getRecentEvents(gymId, limit = 20) {
  // No events table exists -- reconstructed via UNION ALL. Each branch is
  // independently top-K'd BEFORE the union so payments (rare) can't get
  // starved out by checkins (common); re-limited after the merge.
  const { rows } = await query(
    `SELECT * FROM (
      (SELECT 'checkin' AS event_type, c.checked_in AS event_time, m.name AS member_name,
              NULL::numeric AS amount, NULL::text AS plan_type
       FROM checkins c JOIN members m ON m.id = c.member_id
       WHERE c.gym_id = $1 ORDER BY c.checked_in DESC LIMIT $2)
      UNION ALL
      (SELECT 'checkout', c.checked_out, m.name, NULL::numeric, NULL::text
       FROM checkins c JOIN members m ON m.id = c.member_id
       WHERE c.gym_id = $1 AND c.checked_out IS NOT NULL ORDER BY c.checked_out DESC LIMIT $2)
      UNION ALL
      (SELECT 'payment', p.paid_at, m.name, p.amount, p.plan_type
       FROM payments p JOIN members m ON m.id = p.member_id
       WHERE p.gym_id = $1 ORDER BY p.paid_at DESC LIMIT $2)
    ) events ORDER BY event_time DESC LIMIT $2`,
    [gymId, limit]
  );
  return rows.map((r) => ({ ...r, amount: r.amount === null ? null : Number(r.amount) }));
}

async function getRecentEventsAllGyms(limit = 20) {
  // Cross-gym equivalent of getRecentEvents -- backs the Dashboard's
  // "last 20 events across all gyms" activity feed (assignment M-05),
  // which getRecentEvents can't serve since it's scoped to one gym_id.
  // Same UNION ALL / per-branch top-K pattern, plus a gym name join.
  const { rows } = await query(
    `SELECT * FROM (
      (SELECT 'checkin' AS event_type, c.checked_in AS event_time, m.name AS member_name, g.name AS gym_name, g.id AS gym_id,
              NULL::numeric AS amount, NULL::text AS plan_type
       FROM checkins c JOIN members m ON m.id = c.member_id JOIN gyms g ON g.id = c.gym_id
       ORDER BY c.checked_in DESC LIMIT $1)
      UNION ALL
      (SELECT 'checkout', c.checked_out, m.name, g.name, g.id, NULL::numeric, NULL::text
       FROM checkins c JOIN members m ON m.id = c.member_id JOIN gyms g ON g.id = c.gym_id
       WHERE c.checked_out IS NOT NULL ORDER BY c.checked_out DESC LIMIT $1)
      UNION ALL
      (SELECT 'payment', p.paid_at, m.name, g.name, g.id, p.amount, p.plan_type
       FROM payments p JOIN members m ON m.id = p.member_id JOIN gyms g ON g.id = p.gym_id
       ORDER BY p.paid_at DESC LIMIT $1)
    ) events ORDER BY event_time DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({ ...r, amount: r.amount === null ? null : Number(r.amount) }));
}

module.exports = {
  getGymsList, getGymBasic, gymExists, getLiveOccupancy, getTodayRevenue,
  getSameWeekdayLastWeekRevenue, getRecentCheckinWithinWindow, getChurnRisk,
  getHeatmap, getRevenueByPlan, getNewVsRenewalRatio, getCrossGymRevenue,
  getRecentEvents, getRecentEventsAllGyms, RANGE_DAYS,
};

# WTF LivePulse

A real-time multi-gym operations dashboard: live occupancy, revenue, churn
risk, and automatic anomaly detection across 10 gyms, backed by a seeded
90-day history and a speed-adjustable live traffic simulator. React 18 +
Vite on the frontend, Node.js 20 + Express 4 + `ws` on the backend,
PostgreSQL 15 for storage — all orchestrated with Docker Compose.

## Quick Start

- **Prerequisites:** Docker Desktop (nothing else needs to be installed on the host).
- **Run everything:** `docker compose up` (first run seeds the database automatically; takes a few seconds).
- **URLs:**
  - Frontend: http://localhost:3000
  - API health check: http://localhost:3001/api/health
- **Run tests:**
  - Backend: `cd backend && npm test` (81+ unit/integration tests, 80%+ coverage enforced)
  - Frontend e2e: `cd frontend && npx playwright test` (assumes the stack from `docker compose up` is already running)

## Architecture Decisions

- **UUID primary keys, not serial IDs.** Every table uses
  `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (via Postgres's `pgcrypto`
  extension, enabled in `000_timezone.sql`), matching the Data
  Specification's schema literally rather than substituting auto-increment
  integers.
- **Indexes are purpose-built per query, not generic.** Each index in
  `002_indexes.sql` exists to serve one specific hot path: a partial index
  on `checkins (gym_id, checked_out) WHERE checked_out IS NULL` for live
  occupancy, a partial index on `members (last_checkin_at) WHERE status =
  'active'` for churn risk, a BRIN index on `checkins (checked_in)` (cheap
  for the append-mostly, time-ordered check-in stream), and a partial index
  on `anomalies (gym_id, detected_at DESC) WHERE resolved = FALSE` for the
  active-anomaly feed. See **Query Benchmarks** below for the measured
  payoff.
- **`gym_hourly_stats` is a materialized view, refreshed on a timer.** The
  heatmap aggregates 7 days of check-ins per gym/hour; querying it live
  would mean re-aggregating ~270k rows on every request. It's refreshed
  once at seed time and then periodically by `jobs/viewRefresher.js` (every
  60s, via `REFRESH MATERIALIZED VIEW CONCURRENTLY`, which the view's
  unique index makes non-blocking for concurrent reads) so it keeps
  reflecting the simulator's live writes instead of going stale after
  the container starts.
- **Anomaly detection uses independent fire/resolve thresholds (hysteresis),
  not a single negated condition.** E.g. capacity breach fires at >90% but
  only resolves below 85% — the 85-90% band deliberately does neither. A
  single threshold would flap an anomaly open/closed on every tick as
  occupancy hovers near the line; the band absorbs that noise. Same pattern
  for revenue drop (fires <70% of last week, resolves ≥80%).
- **The traffic simulator pins its firing probability to a fixed reference
  window (`BASE_TICK_MS = 2000`), not the actual scheduled tick
  interval.** At higher speed multipliers the engine ticks more often on a
  shorter real interval; if the per-tick probability were computed against
  that shrinking interval, the speedup would mathematically cancel itself
  out (more, smaller-probability ticks nets to the same real-world rate
  regardless of speed). Pinning the probability to the fixed window means
  ticking `speed`× more often at the same per-tick probability correctly
  multiplies real-world throughput by `speed`.
- **WebSocket event delivery supports multiple independent subscribers per
  event type.** `useWebSocket`'s handler registry is a
  `Map<eventType, Set<handler>>`, not a single handler per type — several
  components (e.g. the global anomaly-count badge and a page-scoped,
  filtered anomaly list) can each subscribe to `ANOMALY_DETECTED` without
  clobbering one another's callback.
- **The simulator's "reset" is epoch-based, not a full data wipe.** Starting
  the simulator records a timestamp; `reset` deletes only check-ins/payments
  created at or after that epoch and restores any session the simulator
  itself closed — the original seeded history (and its hand-built anomaly
  scenarios) is never touched.

## AI Tools Used

**This section is mandatory.** It must list every AI tool used while building
this project and what each one was used for.

- **Claude Code (Plan Mode)** — used to research the codebase and the two
  spec documents, and to design/align on a step-by-step implementation
  approach (seed data → backend logic → frontend → tests → benchmarks)
  before making changes at each step.
- **Claude Code (Execute Mode)** — used to implement each agreed plan:
  writing and editing code, running the stack and test suites, diagnosing
  and fixing real bugs surfaced by actually running the code (not just
  reading it), and verifying results end-to-end.

## Query Benchmarks

`EXPLAIN (ANALYZE, BUFFERS)` output for the six benchmark queries, captured
against the fully seeded database (10 gyms, 5,000 members, ~270k check-ins,
~6k payments). Each query is the exact production SQL from
`backend/src/services/` — see `benchmarks/queries.sql` to run them yourself
and `benchmarks/screenshots/*.txt` for the full plans (saved as text, not
images — see that folder's README for why).

| # | Query | Index Used | Target | Actual |
|---|-------|------------|--------|--------|
| Q1 | Live Occupancy | `idx_checkins_live_occupancy` (Index Only Scan) | < 0.5ms | **0.089 ms** |
| Q2 | Today's Revenue | `idx_payments_gym_date` (Index Scan) | < 0.8ms | **0.084 ms** |
| Q3 | Churn Risk | `idx_members_gym_id` + `idx_members_churn_risk` (BitmapAnd) | < 1ms | **0.240 ms** |
| Q4 | Peak Hour Heatmap | `gym_hourly_stats_uidx` (Bitmap Index Scan on the mat. view) | < 0.3ms | **0.108 ms** |
| Q5 | Cross-Gym Revenue | `idx_payments_date` (Bitmap Index Scan) + Hash Left Join | < 2ms | **0.556 ms** |
| Q6 | Active Anomalies | Seq Scan (table is ~19 rows — an index would be slower) | < 0.3ms | **0.036 ms** |

All six clear their target comfortably. Neither large table (`checkins`
~270k rows, `payments` ~6k rows) ever falls back to a sequential scan across
any of the six queries.

## Known Limitations

- **Theme and accent color deliberately deviate from the written spec.**
  The assignment calls for a dark theme with a red/teal/orange accent
  ("Bloomberg terminal" styling). After reviewing reference screenshots the
  user supplied (a light, card-based SaaS layout), the decision was made —
  explicitly, after I flagged the conflict — to build a light theme with a
  purple/indigo accent (`#6C5CE7`) instead, trading spec-literal compliance
  for closer fidelity to that direction. This is a conscious choice, not an
  oversight.
- **Seed data favors triggering anomalies over strict demographic
  accuracy, with specific, known consequences for two of the Data
  Specification's own validation checks (§8).** Per an explicit instruction
  during Step 1 ("I don't need the data to be very accurate because I want
  to trigger anomalies too"), the seed script's random distributions are
  tuned so the three hand-built anomaly scenarios (Velachery zero-checkins,
  Bandra West capacity breach, Salt Lake revenue drop) reliably exist after
  seeding. The concrete fallout:
  - **V5 (total open check-ins, spec range 100-350) fails** — typically
    400-450 live. Bandra West alone is seeded to 275-295 open check-ins to
    guarantee its capacity-breach scenario (§4.4's per-gym minimum), which
    structurally conflicts with keeping the cross-gym V5 total under 350;
    satisfying both simultaneously isn't possible at the capacities given.
  - **V6 (total payments, spec range 5,000-6,000) occasionally overshoots
    slightly** (~6,000-6,050) — the revenue-floor top-up pass (seed Phase
    6a) that guarantees every gym has *some* today-revenue can push the
    total a little past the upper bound.
  - **Two gyms' 30-day revenue falls outside §5.3's expected per-gym
    range**: Salt Lake runs *over* (its last-week baseline is deliberately
    inflated so today's revenue reads as a >30% drop, per the anomaly
    scenario) and Sector 18 Noida runs *under* (a side effect of the same
    randomized distribution, not an intentional scenario).
- **Two E2E tests interpret their spec requirement practically rather than
  literally** (full reasoning in `STEP4_IMPLEMENTATION_PLAN.md` Decision
  #4): the simulator-feed-update test asserts a new row within 10s, not a
  literal 2s, to avoid fighting the simulator's realistic Poisson-calibrated
  throughput; the anomaly-badge test waits for a *naturally* already-stale
  gym rather than forcing the condition via a destructive DB mutation, and
  skips gracefully if none currently exists.
- **The zero-checkins anomaly uses each gym's own `opens_at`/`closes_at`,
  not a fixed global window.** The two spec documents disagree here: the
  Technical Assignment's §3.3 trigger text says a fixed "6am-10pm"; the
  Data Specification's §2 explicitly instructs using the per-gym
  `opens_at`/`closes_at` columns. The per-gym approach was kept — it's more
  realistic (gyms in this seed genuinely have different hours) and follows
  the more specific of the two instructions.
- **The anomaly detector and traffic simulator run on a fixed real-time
  interval** (30s and 2s/`speed` respectively) — they are not deterministic
  or replayable; re-running the stack produces different simulator-driven
  events each time, by design.
- **No authentication.** Per the assignment's scope, this is a
  single-tenant internal dashboard with no login/session layer.

## Project Structure

```
wtf-livepulse/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── jest.config.js
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── gyms.js
│   │   │   ├── members.js
│   │   │   ├── analytics.js
│   │   │   ├── anomalies.js
│   │   │   ├── events.js
│   │   │   └── simulator.js
│   │   ├── services/
│   │   │   ├── statsService.js       — read-side SQL (occupancy, revenue, churn, heatmap, cross-gym)
│   │   │   ├── anomalyService.js     — pure evaluator functions (fire/resolve thresholds)
│   │   │   ├── anomalyRepository.js  — anomalies table CRUD
│   │   │   ├── simulatorEngine.js    — Poisson-calibrated check-in/checkout/payment generation
│   │   │   └── simulatorService.js   — start/stop/reset facade
│   │   ├── shared/
│   │   │   └── trafficPatterns.js    — hour/day traffic multipliers (timezone-safe)
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   ├── 000_timezone.sql
│   │   │   │   ├── 001_initial.sql
│   │   │   │   ├── 002_indexes.sql
│   │   │   │   ├── 003_views.sql
│   │   │   │   └── 004_seed.sql
│   │   │   └── pool.js
│   │   ├── jobs/
│   │   │   ├── anomalyDetector.js    — 30s evaluation loop
│   │   │   ├── simulator.js          — 2s/speed tick loop
│   │   │   └── viewRefresher.js      — 60s gym_hourly_stats refresh loop
│   │   ├── websocket/
│   │   │   ├── index.js
│   │   │   └── broadcast.js
│   │   └── middleware/
│   │       ├── errorHandler.js
│   │       └── validate.js
│   └── tests/
│       ├── setupEnv.js
│       ├── unit/           — anomalyService, simulatorEngine, trafficPatterns, broadcast, errorHandler
│       └── integration/    — gyms, anomalies, analytics, simulator, simulatorEngine, anomalyDetector, viewRefresher, events, pool, health
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── playwright.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── layout/      — AppShell, IconRail, SidePanel, Header, icons
│   │   │   ├── ui/          — Card, Pill, Modal, SkeletonCard, ErrorState, EmptyState, SearchInput, ToastStack, …
│   │   │   ├── dashboard/   — ActivityFeed, OccupancyCard, AllGymsMini, SimulatorControl
│   │   │   └── analytics/   — Heatmap, RevenueByPlanChart, NewRenewalDonut, CrossGymBarChart, ChurnRiskTable
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Anomalies.jsx
│   │   ├── hooks/           — useWebSocket, WebSocketProvider, useGymData, useGymsList, useAnomalies, useAnomalyToasts, useAnalytics, useCrossGymRevenue, useActivityFeed, useCountUp
│   │   ├── store/
│   │   │   └── useStore.js
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── formatters.js
│   │   └── styles/
│   │       ├── theme.css
│   │       └── components.css
│   └── tests/
│       ├── smoke.spec.js
│       ├── dashboard.spec.js
│       ├── analytics.spec.js
│       ├── anomalies.spec.js
│       └── helpers/db.js
│
└── benchmarks/
    ├── README.md
    ├── queries.sql
    └── screenshots/
        └── Q1_live_occupancy.txt … Q6_active_anomalies.txt
```

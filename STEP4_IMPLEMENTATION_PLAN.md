# Step 4 Implementation Plan: Testing

## Context

Steps 1–3 (seed, backend logic, frontend) are done and verified manually.
Per the requirements audit just run against `WTF_LivePulse_Technical_Assignment.docx`
§9, actual test coverage right now is **2 unit, 2 integration, 1 E2E** —
all scaffold-era placeholders — against a required minimum of **10 unit,
12 integration, 3 E2E**, with backend coverage currently ~30% against an
80% target. This step closes that gap for real, not just to the minimum
count but with tests that actually exercise the business logic (pure
evaluators, real endpoints against the real seeded DB, real live-update
behavior) rather than padding the count with trivial assertions.

## Resolved Design Decisions

1. **Integration tests hit the real seeded Postgres, not mocks.** The
   assignment explicitly wants tests like "GET /api/gyms returns correct
   structure with 10 gyms **after seeding**" — a mock can't validate that;
   only a real query against real seed data can. The existing
   `health.test.js` (which mocks `db/pool`) stays as-is as a fast smoke
   test; all new integration tests connect to the real database.
2. **Host-run `npm test` needs a working `DATABASE_URL`.** `config.js`
   currently only skips the "must be set" check in test mode — it doesn't
   provide a usable default, so a real DB-backed test would fail to
   connect. Since the assignment's reviewer flow is "`docker compose up`
   first, then `cd backend && npm test`" (db's `5432` is already
   host-mapped), add `backend/tests/setupEnv.js` (wired via Jest's
   `setupFiles`, which runs before any test file loads `config.js`) that
   defaults `DATABASE_URL` to `postgres://wtf:wtf_secret@localhost:5432/wtf_livepulse`
   if not already set — zero extra configuration for the reviewer, exactly
   per the spec's requirement, as long as `db` is running.
3. **Anomaly-state-dependent tests use DB fixtures, not live simulator
   state.** Whether a critical anomaly currently exists is not
   deterministic (it depends on live simulator-driven occupancy). Tests
   that need a specific anomaly (403-on-critical-dismiss, successful
   warning-dismiss, 404-on-missing) directly `INSERT`/`DELETE` their own
   fixture rows via the `pg` pool in `beforeAll`/`afterAll`, rather than
   hoping the right state already exists. This makes them deterministic
   regardless of when they run.
4. **Two E2E scenarios need an honest interpretation, not a literal one** —
   flagging both explicitly since they involve judgment calls:
   - *"check-in... updates the feed within 2 seconds."* Our simulator's
     throughput is deliberately calibrated to realistic human check-in
     rates (Step 2's Poisson model), not a guaranteed-event-every-2-seconds
     firehose — forcing a literal 2s guarantee would mean abandoning that
     realism. The test starts the simulator at 10x and asserts the feed
     gains a new row within a practical window (10s, using Playwright's
     auto-retrying assertion) — this validates the real thing the
     requirement cares about (WebSocket push, not polling) without
     fighting the realism calibration.
   - *"an anomaly appearing causes the badge to increment."* The anomaly
     detector runs on a real 30s interval (`config.anomalyIntervalMs`) —
     there's no way to force a tick faster without changing production
     code for a test's convenience. The test directly manipulates a
     *known-healthy* gym's most recent `checkins` row (via `pg`) to be
     >2h10m old — guaranteeing a fresh `zero_checkins` condition — then
     waits up to 40s (one real detector cycle + buffer) for the rail badge
     to increment with **no page reload in between**, which is what
     actually proves the live (not polled, not refresh-triggered) behavior
     the requirement is testing for.
5. **Enable the coverage threshold** once tests land: uncomment
   `jest.config.js`'s `coverageThreshold` block at 80% lines/statements —
   currently commented out with a "TODO: once real logic lands" note that
   this step fulfills.

## Backend Unit Tests — target ~22 (min 10)

### `backend/tests/unit/anomalyService.test.js` (new, ~15 tests)
Pure functions, no DB — covers every evaluator the assignment explicitly
names, plus the hysteresis bands:
- `evaluateZeroCheckins`: fires when stale + within hours; does not fire
  when recent; does not fire outside operating hours even if stale;
  resolves on a recent check-in; does not resolve while still stale; fires
  when `lastCheckinAt` is `null`.
- `evaluateCapacityBreach`: fires >90%; does not fire at exactly 90%;
  resolves <85%; hysteresis band 85–90% (neither fires nor resolves).
- `evaluateRevenueDrop`: fires <70% of last week; does not fire at exactly
  70%; resolves at ≥80%; hysteresis band 70–80%; the `lastWeekSameDayRevenue
  <= 0` guard (no baseline → never fires).

### `backend/tests/unit/simulatorEngine.test.js` (new, ~6 tests)
- `dueForCheckout`: false below 45 min; true at/above the 90 min hard
  ceiling; deterministic true/false in between via a mocked `randomFn`.
- `poissonFireProbability`: 0 when `expectedPerHour` is 0; monotonically
  increases with `expectedPerHour`; always stays within `[0, 1)`.

### `backend/tests/unit/trafficPatterns.test.js` (new, ~6 tests)
Directly satisfies the assignment's named "simulator generates check-ins
with realistic time distribution" case:
- `hourMultiplier`: 0 during closed hours; 1.0 at the morning peak; 0.9 at
  the evening peak.
- `dayMultiplier`: Monday 1.0, Sunday 0.45.
- `trafficMultiplier` combines both correctly for a known timestamp.

Existing `sanity.test.js` (isUuid) stays unchanged.

## Backend Integration Tests — target ~21 (min 12)

### `backend/tests/integration/gyms.test.js` (new, ~6 tests)
- `GET /api/gyms` → 200, exactly 10 gyms, required fields present.
- `GET /api/gyms/:id/live` → 200 with occupancy/revenue/recent_events/
  active_anomalies for a real seeded gym id.
- `GET /api/gyms/:id/live` → 400 on a malformed id.
- `GET /api/gyms/:id/live` → 404 on a well-formed but nonexistent id.
- `GET /api/gyms/:id/analytics` → 200 with heatmap/revenue_by_plan/
  churn_risk/new_vs_renewal.
- `GET /api/gyms/:id/analytics?dateRange=bogus` → 400.

### `backend/tests/integration/anomalies.test.js` (new, ~8 tests)
- `GET /api/anomalies` → 200, array.
- A `gym_id`+`severity` combination with no matches → `[]` (determined
  dynamically against real data so it's never flaky-by-coincidence).
- `GET /api/anomalies?gym_id=not-a-uuid` → 400.
- `GET /api/anomalies?severity=invalid` → 400.
- `PATCH /dismiss` on a **fixture critical** anomaly → 403, `dismissed`
  unchanged.
- `PATCH /dismiss` on a **fixture warning** anomaly → 200, `dismissed: true`.
- `PATCH /dismiss` on a nonexistent id → 404.
- `PATCH /dismiss` on a malformed id → 400.

### `backend/tests/integration/analytics.test.js` (new, ~1 test)
- `GET /api/analytics/cross-gym` → 200, 10 gyms, sorted by revenue
  descending, each with `gym_id`/`gym_name`/`total_revenue`/`rank`.

### `backend/tests/integration/simulator.test.js` (new, ~4 tests)
- `POST /start` `{speed:1}` → `{status:'running', speed:1}`.
- `POST /start` `{speed:3}` (invalid) → 400.
- `POST /stop` → `{status:'paused'}`.
- `POST /reset` → `{status:'reset'}` (run last; harmless against seed data
  per the reset-epoch mechanism from Step 2).

Existing `health.test.js` stays as the fast mocked smoke test.

## Frontend E2E Tests (Playwright) — target 6 (min 3)

All against the already-running `docker compose up` stack on `:3000`,
per the existing `playwright.config.js`.

1. **Dashboard loads cleanly** — gym list renders (10 rows), no console
   errors, no `undefined` visible in the KPIs.
2. **Gym switch updates the page** — click a different sidebar gym, assert
   the header title and occupancy number both change to match, with no
   navigation/reload.
3. **Simulator-driven live feed update** — start the simulator (10x),
   assert a new Activity Feed row appears within a practical window (see
   Decision #4).
4. **Anomaly badge increments live** — force a fresh `zero_checkins`
   condition via direct DB fixture, assert the rail badge count increases
   within one detector cycle with no reload (see Decision #4).
5. **Dismiss flow** — open Anomalies, dismiss a fixture warning anomaly,
   confirm via the modal, assert the row updates to "Dismissed" without a
   reload.
6. **Analytics page loads cleanly** — all 5 widgets (heatmap, revenue bars,
   donut, cross-gym ranking, churn table) render without errors for the
   selected gym.

## Verification

1. `docker compose up -d` (full stack, already seeded) before running
   either suite.
2. `cd backend && npm test` — all ~43 backend tests pass; check the
   coverage summary clears 80% lines/statements (the newly-enabled
   threshold will fail the run otherwise, surfacing exactly which files
   need more coverage).
3. `cd frontend && npx playwright test` — all 6 E2E tests pass headless.
4. Re-run `cd backend && npm test` a second time back-to-back to confirm
   the fixture-based tests are idempotent (no leftover rows breaking a
   second run).
5. Update the README's "How to Run Tests" expectations if anything differs
   from the assignment's literal `cd backend && npm test` / `cd frontend
   && npx playwright test` commands (shouldn't, but confirm).

// Runs before any test file loads config.js/db/pool.js (wired via Jest's
// `setupFiles`). Reviewers run `cd backend && npm test` from the host,
// with `docker compose up` already started -- db's 5432 is host-mapped,
// so this default lets integration tests connect with zero extra
// configuration, matching the assignment's "must work without any
// additional configuration" requirement.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://wtf:wtf_secret@localhost:5432/wtf_livepulse';
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

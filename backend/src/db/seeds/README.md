The primary seed lives in `../migrations/004_seed.sql` and runs automatically
through the Postgres `docker-entrypoint-initdb.d` mechanism on first database
init. This folder is reserved for an optional Node-based seed script
(`seed.js`) if one turns out to be needed later (e.g. for re-seeding without
recreating the Postgres volume).

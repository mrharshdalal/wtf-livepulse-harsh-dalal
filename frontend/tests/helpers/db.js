import { Client } from 'pg';

// E2E tests run on the host against the docker-compose stack (same
// assumption as playwright.config.js's default baseURL) -- db's 5432 is
// host-mapped, so this connects with zero extra configuration as long as
// `docker compose up` is running.
const CONNECTION_STRING =
  process.env.DATABASE_URL || 'postgres://wtf:wtf_secret@localhost:5432/wtf_livepulse';

async function withClient(fn) {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export { withClient };

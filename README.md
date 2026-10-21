# WTF LivePulse

A real-time multi-gym operations dashboard. React 18 + Vite on the frontend,
Node.js 20 + Express 4 + `ws` on the backend, PostgreSQL 15 for storage — all
orchestrated with Docker Compose.

This repository is currently an **empty, runnable scaffold**. Business logic
(seed data, analytics queries, anomaly rules, simulator behaviour, charts,
polished UI) is not implemented yet.

## Quick Start

- **Prerequisites:** Docker Desktop (nothing else needs to be installed on the host).
- **Run everything:** `docker compose up`
- **URLs:**
  - Frontend: http://localhost:3000
  - API health check: http://localhost:3001/api/health
- **Run tests:**
  - Backend: `cd backend && npm test`
  - Frontend e2e: `cd frontend && npx playwright test`

<!-- TODO: expand with more detail once real features land -->

## Architecture Decisions

<!-- TODO: document key architecture decisions (DB schema rationale, WebSocket
design, simulator approach, anomaly detection approach, etc.) as they are made. -->

## AI Tools Used

**This section is mandatory.** It must list every AI tool used while building
this project and what each one was used for.

<!-- TODO: list AI tools used (e.g. Claude Code, Copilot, ChatGPT) and describe
what each was used for. -->

## Query Benchmarks

<!-- TODO: fill in this table once benchmarks/queries.sql has been run against
a seeded database. Screenshots go in benchmarks/screenshots/. -->

| # | Query | Index Used | Execution Time | Screenshot |
|---|-------|------------|-----------------|------------|
| Q1 | Live Occupancy | TODO | TODO | TODO |
| Q2 | Today's Revenue | TODO | TODO | TODO |
| Q3 | Churn Risk | TODO | TODO | TODO |
| Q4 | Peak Hour Heatmap | TODO | TODO | TODO |
| Q5 | Cross-Gym Revenue | TODO | TODO | TODO |
| Q6 | Active Anomalies | TODO | TODO | TODO |

## Known Limitations

<!-- TODO: document known limitations as functionality is implemented. -->

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
│   ├── .dockerignore
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
│   │   │   └── simulator.js
│   │   ├── services/
│   │   │   ├── anomalyService.js
│   │   │   ├── simulatorService.js
│   │   │   └── statsService.js
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   ├── 000_timezone.sql
│   │   │   │   ├── 001_initial.sql
│   │   │   │   ├── 002_indexes.sql
│   │   │   │   ├── 003_views.sql
│   │   │   │   └── 004_seed.sql
│   │   │   ├── seeds/
│   │   │   │   └── README.md
│   │   │   └── pool.js
│   │   ├── jobs/
│   │   │   ├── anomalyDetector.js
│   │   │   └── simulator.js
│   │   ├── websocket/
│   │   │   ├── index.js
│   │   │   └── broadcast.js
│   │   └── middleware/
│   │       ├── errorHandler.js
│   │       └── validate.js
│   └── tests/
│       ├── unit/
│       │   └── sanity.test.js
│       └── integration/
│           └── health.test.js
│
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── playwright.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   └── .gitkeep
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Anomalies.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   ├── useGymData.js
│   │   │   └── useAnomalies.js
│   │   ├── store/
│   │   │   └── useStore.js
│   │   ├── lib/
│   │   │   └── api.js
│   │   └── styles/
│   │       └── theme.css
│   └── tests/
│       └── smoke.spec.js
│
└── benchmarks/
    ├── README.md
    ├── queries.sql
    └── screenshots/
        └── .gitkeep
```

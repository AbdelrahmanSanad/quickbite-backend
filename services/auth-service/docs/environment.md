# Auth Service — Environment Variables

All variables are validated at boot by a Joi schema (`src/config/env.validation.ts`).
A missing or invalid value **fails startup** with a clear message. Copy
`.env.example` to `.env` for local development. Never commit `.env`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production`. Controls Swagger exposure (docs served only when not `production`). |
| `PORT` | no | `3000` | HTTP port the service listens on (local dev uses `3001`). |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string for this service's own DB (`auth_db`). |
| `REDIS_URL` | **yes** | — | Redis connection string (verification/reset codes + rate-limit counters). |
| `JWT_ACCESS_SECRET` | **yes** | — | Secret for signing access-token JWTs. Min 16 chars. Use a strong random value per environment. |
| `JWT_ACCESS_TTL` | no | `900` | Access-token lifetime, seconds (default 15 min). |
| `REFRESH_TTL` | no | `604800` | Refresh-token / session lifetime, seconds (default 7 days, sliding). |
| `CORS_ORIGINS` | no | `''` | Comma-separated allowed origins (e.g. `http://localhost:3000`). Empty = no cross-origin allowed. |
| `THROTTLE_TTL` | no | `60` | Rate-limit window, seconds. |
| `THROTTLE_LIMIT` | no | `100` | Global max requests per window per IP. Auth routes are stricter (10/min; forgot-password 5/min). |

## Notes

- **Secrets** (`JWT_ACCESS_SECRET`, DB/Redis passwords) must never be hardcoded or
  committed — they come only from the environment.
- In **production**, Swagger (`/docs`) is disabled and `CORS_ORIGINS` should list
  only your real frontends.
- Interactive API docs (non-production): `http://localhost:3001/docs`.

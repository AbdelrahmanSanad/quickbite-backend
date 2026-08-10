# @quickbite/restaurant-service

QuickBite **Restaurant Service** — manages restaurants, branches, categories, and
products, and serves the public menu.

- **Port:** 3002
- **Owns:** `restaurant_db` (PostgreSQL) — never accesses another service's DB.
- **Cache:** Redis (menu).
- **Auth:** validates the shared access JWT locally (stateless) — see the auth
  service and `docs/sprints/sprint-2-restaurant-service.md`.

## Commands (from the repo root)

```bash
npm run dev   -w @quickbite/restaurant-service   # watch mode
npm run build -w @quickbite/restaurant-service
npm run lint  -w @quickbite/restaurant-service
npm run test  -w @quickbite/restaurant-service   # unit
npm run test:e2e -w @quickbite/restaurant-service
```

Implementation follows the Sprint 2 plan
(`docs/sprints/sprint-2-restaurant-service.md`), one task at a time via the
`restaurant-sprint` skill.

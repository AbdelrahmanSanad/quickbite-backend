# Sprint 2 — Restaurant Service

> **Status:** planning approved? _pending developer review_.
> Tasks are checkbox-tracked (`[ ]` todo, `[x]` done). The `restaurant-sprint`
> skill implements **one task at a time** and stops for review — it never
> auto-continues.
>
> **This is a plan. No implementation code is generated here.**

---

## 1. Sprint Goal

Build the **Restaurant Service** as an independent NestJS microservice that lets
a `RESTAURANT_OWNER` manage their restaurants, branches, categories, and
products, and lets anyone read a restaurant's public menu.

After Sprint 2 the platform gains its **catalog capability**: the data an Order
service will later need to build a cart. The service:

- owns its own database (`restaurant_db`) — **never** touches `auth_db`;
- enforces authentication and role/ownership authorization from the access JWT;
- caches the read-heavy public menu in Redis with correct invalidation;
- is documented (Swagger) and tested (unit + integration), and ships in Docker.

---

## 2. Architecture Context

```text
Client
   ↓
API Gateway            (not yet implemented — see note)
   ↓  Authorization: Bearer <access JWT>
Restaurant Service
   ├── PostgreSQL (restaurant_db)
   └── Redis (menu cache)
```

**How authentication reaches the service (verified against the repo).** Auth is
**stateless JWT**. The Auth Service signs the access token with
`JWT_ACCESS_SECRET` (HS256, payload `{ sub, email, role }`, ~15 min TTL) and does
**not** store it. Therefore the Restaurant Service validates the *same* token
**locally** with the shared `JWT_ACCESS_SECRET` — no call to the Auth Service, no
access to `auth_db`. The Bearer header is forwarded by the gateway (or sent
directly during development, since the gateway is an empty folder today).

**Reusing the auth primitives (decision — architect it before Task 5).** The
`JwtAuthGuard`, `@CurrentUser()`, and `AuthenticatedUser { userId, email, role }`
currently live inside `auth-service`. Restaurant Service needs the same guard
**plus** a new `RolesGuard` + `@Roles()` (role-based authz does not exist yet).

- **Option A — extract to a shared lib** (`libs/nest-auth`, consumed by both
  services). Pros: no drift on a security-critical component, DRY, two real
  consumers now justify it. Cons: a new workspace package + its build wiring.
- **Option B — duplicate a minimal guard** in Restaurant Service. Pros: zero
  new package. Cons: two copies of security code that can silently diverge.

> **Recommendation:** Option A. There are now **two** consumers of the same JWT
> contract, and duplicating auth logic is exactly the kind of drift risk we want
> to avoid. The lib holds only stateless primitives (guard, decorator, roles
> guard, type) — no DB, no secrets. **Assumption:** `JWT_ACCESS_SECRET` is shared
> config across services (it already is, via each service's validated env).

---

## 3. Domain Model

```text
Restaurant (aggregate root, owned by ownerId)
    ├── Branch      (physical locations)
    └── Category
           └── Product
```

All entities live in `restaurant_db`. `Restaurant.ownerId` is the **Auth user
UUID** with **no cross-database foreign key**. Convention matches auth-service:
`camelCase` in Prisma client, `snake_case` columns via `@map`, UUID PKs,
`created_at`/`updated_at`/`deleted_at`, **soft delete** via `deletedAt` (queries
filter `deletedAt IS NULL`).

### Restaurant
- **Purpose:** the ownable aggregate root; a business a `RESTAURANT_OWNER` runs.
- **Fields:** `id` (uuid pk), `ownerId` (uuid, **no FK**), `name` (≤150),
  `description` (text, nullable), `status` (enum `ACTIVE|SUSPENDED`),
  `phone` (nullable), `email` (nullable), timestamps, `deletedAt`.
- **Relationships:** 1—N `Branch`, 1—N `Category`.
- **Constraints:** `name` required; `status` defaults `ACTIVE`.
- **Indexes:** `ownerId`, `status`, `deletedAt` (or partial `deletedAt IS NULL`).
- **Soft delete:** yes.

### Branch
- **Purpose:** a physical location of a restaurant.
- **Fields:** `id`, `restaurantId` (FK), `name` (≤150), `address` (text),
  `phone` (nullable), `isActive` (bool, default true), timestamps, `deletedAt`.
  _Optional (mark clearly, not MVP-required): `latitude`/`longitude`._
- **Relationships:** N—1 `Restaurant`.
- **Constraints:** `restaurantId` required; `name` required.
- **Indexes:** `restaurantId`.
- **Soft delete:** yes.

### Category
- **Purpose:** groups products within a restaurant's menu.
- **Fields:** `id`, `restaurantId` (FK), `name` (≤100), `sortOrder` (int,
  default 0), timestamps, `deletedAt`.
- **Relationships:** N—1 `Restaurant`, 1—N `Product`.
- **Constraints:** **unique `(restaurantId, name)` among non-deleted rows**
  (partial unique index) — prevents duplicate category names in one restaurant.
- **Indexes:** `restaurantId`; partial-unique `(restaurantId, name)`.
- **Soft delete:** yes.

### Product
- **Purpose:** a menu item with a single price.
- **Fields:** `id`, `categoryId` (FK), `name` (≤150), `description` (text,
  nullable), `price` (`Decimal(10,2)`, > 0), `isAvailable` (bool, default true),
  `sortOrder` (int, default 0), timestamps, `deletedAt`.
  _Optional (not MVP): `imageUrl`, `currency` (else a service-wide default)._
- **Relationships:** N—1 `Category` (⇒ indirectly a `Restaurant`).
- **Constraints:** `categoryId` required; `price` > 0.
- **Indexes:** `categoryId`.
- **Soft delete:** yes.

**Ownership derivation:** Product → Category → Restaurant.`ownerId`;
Branch/Category → Restaurant.`ownerId`. Ownership is verified with a single
`where` that joins up to the restaurant — never trusted from the request body.

---

## 4. Restaurant

**Create Restaurant** — `POST /restaurants`
- Auth required; role **`RESTAURANT_OWNER`**.
- `ownerId` is taken from the **authenticated identity** (`request.user.userId`),
  never from the body.
- Validate name/description/phone/email. Initial `status = ACTIVE`
  (**assumption:** no admin-approval flow in the MVP; `PENDING_APPROVAL` is a
  future status).

**Get Restaurant** — `GET /restaurants/:id`
- **Public** (customers browse). Returns the restaurant profile; menu is a
  separate endpoint (§11). Returns 404 if not found or soft-deleted.

**Update Restaurant** — `PATCH /restaurants/:id`
- Auth + `RESTAURANT_OWNER` + **ownership** (must own the restaurant; `ADMIN`
  may override — §8). Allowed fields: `name`, `description`, `phone`, `email`,
  `status` (`ADMIN` only for `SUSPENDED`). **Invalidates** the restaurant +
  menu caches (§10).

**Delete Restaurant** — `DELETE /restaurants/:id`
- Auth + `RESTAURANT_OWNER` + ownership. **Soft delete** (`deletedAt`), MVP
  approach consistent with auth-service. Cascades logically: its branches,
  categories, and products become unreadable (filtered by the deleted parent).
  **Invalidates** restaurant + menu caches.

---

## 5. Branch Management

Endpoints: `POST /restaurants/:restaurantId/branches`,
`GET /restaurants/:restaurantId/branches`, `GET /branches/:id`,
`PATCH /branches/:id`, `DELETE /branches/:id`.

- **Authorization:** create/update/delete require `RESTAURANT_OWNER` **and**
  ownership of the parent restaurant; reads are public.
- **Ownership guard:** the owner may only touch branches whose
  `branch.restaurant.ownerId == request.user.userId`.
- **Validation:** `name` required (≤150), `address` required, `phone` optional.
- **DB ops:** insert/update/soft-delete filtered by `restaurantId`.
- **Cache impact:** none in the MVP (branches are not cached — see §10).
- **Errors:** 401, 403 (not owner), 404 (restaurant/branch not found), 400.

---

## 6. Category Management

Endpoints: `POST /restaurants/:restaurantId/categories`,
`GET /restaurants/:restaurantId/categories`, `GET /categories/:id`,
`PATCH /categories/:id`, `DELETE /categories/:id`.

- **Authorization:** writes require `RESTAURANT_OWNER` + ownership; reads public.
- **Duplicate names:** rejected within the same restaurant via the partial-unique
  `(restaurantId, name)` index → **409 Conflict**.
- **Ordering:** `sortOrder` (int) supported for menu display.
- **Soft delete:** yes.
- **Cache impact:** category writes **invalidate the restaurant's menu cache**.
- **Errors:** 401, 403, 404, 409 (duplicate), 400.

> Do not add fields beyond `name`/`sortOrder` for the MVP unless clearly marked
> optional.

---

## 7. Product Management

Endpoints: `POST /categories/:categoryId/products`,
`GET /categories/:categoryId/products`, `GET /products/:id`,
`PATCH /products/:id`, `DELETE /products/:id`.

- **MVP assumptions (from the sprint brief):** a product belongs to a category
  (⇒ indirectly to a restaurant); has **one price**; price does **not** vary by
  branch; branch-specific offers/promotions are out of scope.
- **Fields:** `name`, `description?`, `price` (Decimal, > 0), `isAvailable`,
  `sortOrder`.
- **Authorization:** writes require `RESTAURANT_OWNER` + ownership (via
  category → restaurant); reads public.
- **Soft delete:** yes.
- **Cache impact:** product writes **invalidate the restaurant's menu cache**.
- **Errors:** 401, 403, 404 (category/product not found), 400 (bad price, etc.).

---

## 8. Authorization Model

```text
CUSTOMER        → cannot manage restaurants (read-only public access)
RESTAURANT_OWNER→ can manage ONLY restaurants they own (ownerId == userId)
ADMIN           → administrative override on any restaurant (project policy)
```

For **every** protected operation:
- **Authentication:** valid access JWT (`JwtAuthGuard`).
- **Role:** `@Roles(RESTAURANT_OWNER)` (or `ADMIN`) via a new `RolesGuard`
  reading `request.user.role`.
- **Ownership:** the loaded resource's `ownerId` (resolved up to the restaurant)
  must equal `request.user.userId`; `ADMIN` bypasses the ownership check.

> **Critical:** never trust `ownerId` (or any identity) from the request body or
> query. Always derive it from the validated JWT (`request.user.userId`).

---

## 9. Database Design

```text
restaurant_db
├── restaurants  (id, owner_id, name, ..., status, timestamps, deleted_at)
├── branches     (id, restaurant_id → restaurants, ...)
├── categories   (id, restaurant_id → restaurants, ...)
└── products     (id, category_id  → categories,  ...)
```

- **Primary keys:** UUID on every table.
- **Foreign keys (inside the service only):** `branches.restaurant_id`,
  `categories.restaurant_id`, `products.category_id`. `onDelete: Cascade` for
  referential integrity on hard deletes; day-to-day deletes are **soft**
  (`deleted_at`) and filtered in the application layer.
- **Unique constraints:** partial-unique `(restaurant_id, name)` on `categories`
  where `deleted_at IS NULL`.
- **Indexes:** `restaurants(owner_id)`, `restaurants(status)`,
  `branches(restaurant_id)`, `categories(restaurant_id)`,
  `products(category_id)`; `deleted_at` where it helps filtering.
- **Cascading:** FK cascade for hard delete; soft delete handled in code.
- **Important query patterns:** menu build (restaurant + its categories + their
  products, all non-deleted, ordered by `sortOrder`); ownership check
  (resource → restaurant.owner_id); list by parent id.

> **Soft-delete read rule (Tasks 5–9):** `deletedAt` does **not** cascade —
> soft-deleting a parent leaves children with `deletedAt IS NULL`. Every read
> must therefore filter `deletedAt IS NULL` **up the full ownership chain**
> (product → category → restaurant), not just on the row itself, or soft-deleted
> parents' children leak. Use a shared "active + ancestors active" query helper,
> and cover it with the soft-deleted-parent e2e test (§15).

> **Deferred to Task 8:** an optional DB-level `CHECK (price > 0)` on `products`
> (defense-in-depth beyond the DTO validation) — add as a new migration, since
> the init migration is already applied.

```text
Restaurant.ownerId  →  User ID from Auth Service
No cross-database foreign key. (ownerId is a plain, indexed UUID column.)
```

> No Prisma code in this document — the schema is authored in Task 3.

---

## 10. Redis Strategy

**Minimum useful caching for the MVP = the public menu only.** The menu is the
read-heavy, join-expensive, customer-facing payload; everything else is cheap,
owner-facing, low-volume, and not worth caching yet.

| Key | Value | TTL | Read | Write | Invalidation triggers |
|---|---|---|---|---|---|
| `restaurant:{id}:menu` | JSON: restaurant + categories[] + products[] (non-deleted, ordered) | 300s | cache-aside on `GET /restaurants/:id/menu` | populate on miss | any create/update/delete of that restaurant's restaurant-profile, category, or product |

Optional/secondary (implement only if a real read-hot path appears):
`restaurant:{id}` (profile). **Not cached in MVP:** branch lists, category lists,
single-entity gets (cheap indexed lookups).

```text
Request → Redis
   ├── HIT  → return cached menu
   └── MISS → PostgreSQL → build menu → SET restaurant:{id}:menu (TTL) → return
```

**Invalidation (delete the key; let the next read repopulate):**
- Restaurant update / soft-delete → `DEL restaurant:{id}:menu` (+ profile key if used)
- Category create/update/delete → `DEL restaurant:{id}:menu`
- Product create/update/delete → `DEL restaurant:{id}:menu` (resolve `restaurantId` via category)
- Branch changes → **no menu impact** (branches aren't in the menu payload)

Reuse the existing `RedisModule` + `REDIS_CLIENT` (ioredis) convention from
auth-service. **Redis-unavailable behavior:** treat as a cache miss — fall back
to PostgreSQL and still serve the request (cache is an optimization, not a
dependency for correctness).

---

## 11. API Contracts

Auth column: **Public** = no token; **Owner** = JWT + `RESTAURANT_OWNER` +
ownership (ADMIN overrides ownership).

| Method | Path | Auth | Body / Params | Success | Errors |
|---|---|---|---|---|---|
| POST | `/restaurants` | Owner | name, description?, phone?, email? | 201 restaurant | 400,401,403 |
| GET | `/restaurants/:id` | Public | — | 200 restaurant | 404 |
| GET | `/restaurants/:id/menu` | Public | — | 200 menu (cached) | 404 |
| PATCH | `/restaurants/:id` | Owner | partial fields | 200 restaurant | 400,401,403,404 |
| DELETE | `/restaurants/:id` | Owner | — | 204 | 401,403,404 |
| POST | `/restaurants/:restaurantId/branches` | Owner | name, address, phone? | 201 branch | 400,401,403,404 |
| GET | `/restaurants/:restaurantId/branches` | Public | — | 200 branch[] | 404 |
| GET | `/branches/:id` | Public | — | 200 branch | 404 |
| PATCH | `/branches/:id` | Owner | partial | 200 branch | 400,401,403,404 |
| DELETE | `/branches/:id` | Owner | — | 204 | 401,403,404 |
| POST | `/restaurants/:restaurantId/categories` | Owner | name, sortOrder? | 201 category | 400,401,403,404,409 |
| GET | `/restaurants/:restaurantId/categories` | Public | — | 200 category[] | 404 |
| GET | `/categories/:id` | Public | — | 200 category | 404 |
| PATCH | `/categories/:id` | Owner | partial | 200 category | 400,401,403,404,409 |
| DELETE | `/categories/:id` | Owner | — | 204 | 401,403,404 |
| POST | `/categories/:categoryId/products` | Owner | name, description?, price, isAvailable?, sortOrder? | 201 product | 400,401,403,404 |
| GET | `/categories/:categoryId/products` | Public | — | 200 product[] | 404 |
| GET | `/products/:id` | Public | — | 200 product | 404 |
| PATCH | `/products/:id` | Owner | partial | 200 product | 400,401,403,404 |
| DELETE | `/products/:id` | Owner | — | 204 | 401,403,404 |

> Contracts only — no implementation here. `GET /restaurants/:id/menu` is the
> one cached endpoint (§10).

---

## 12. Validation

`class-validator` DTOs + the global `ValidationPipe` (whitelist,
forbidNonWhitelisted, transform) — same convention as auth-service.

- **Restaurant:** `name` string 1–150; `description?` ≤2000; `phone?`/`email?`
  well-formed; `status` not settable by owners (ADMIN-only, separate rule).
- **Branch:** `name` 1–150; `address` 1–500; `phone?` valid.
- **Category:** `name` 1–100; `sortOrder?` integer ≥ 0; duplicate name in the
  same restaurant → 409.
- **Product:** `name` 1–150; `price` decimal **> 0**, ≤ a sane max, 2dp;
  `isAvailable?` boolean; `sortOrder?` integer ≥ 0.
- **IDs:** all path ids `IsUUID`.
- **Invalid relationships:** creating a product under a category that isn't the
  owner's, or a branch/category under a restaurant that isn't the owner's → 403.

---

## 13. Error Handling

Reuse auth-service's pattern: **domain errors** thrown by the application layer,
mapped to HTTP by a `DomainExceptionFilter` (transport-agnostic domain).

| Domain error | HTTP |
|---|---|
| RestaurantNotFound / BranchNotFound / CategoryNotFound / ProductNotFound | 404 |
| Unauthenticated (guard) | 401 |
| Forbidden role / **not the owner** (`InvalidOwnership`) | 403 |
| DuplicateCategory | 409 |
| Invalid input (validation) | 400 |

Consistent JSON shape `{ statusCode, error, message }`; never leak internal
details or another owner's data.

---

## 14. RabbitMQ

**RabbitMQ is not required for the current Restaurant Service operations.**

Every Sprint-2 operation is a synchronous CRUD request/response within a single
service and database. There is no cross-service workflow, no eventual-consistency
requirement, and no consumer that needs to react asynchronously. Adding a broker
now would be complexity without a use case — against `CLAUDE.md` (REST for MVP;
RabbitMQ only for a clear async benefit).

**When to reconsider:** when a *second* service must react to menu changes —
e.g. a Search/Catalog read-model projection, or an Order service caching menu
snapshots. At that point a `MenuUpdated` / `RestaurantUpdated` event (publisher:
Restaurant Service; consumer: that service) becomes justified. The service
already emits domain events in-process (auth-service pattern), so promoting them
to RabbitMQ later is a single adapter change.

---

## 15. Testing Strategy

Mirror auth-service: Jest unit tests (pure, port-mocked) + e2e integration
(supertest against real Postgres + Redis, with Postgres/Redis CI service
containers already wired in `.github/workflows/ci.yml`).

**Unit tests (business rules, no infra):** ownership checks (owner vs
non-owner vs admin), role authorization, validation edge cases, CRUD use-case
logic, duplicate-category rule, cache read/write/invalidate logic (mocked store).

**Integration (e2e) tests (Postgres + Redis + HTTP + auth context):**
- Full owner flow: create restaurant → category → product → `GET menu`.
- Auth/role/ownership enforcement end-to-end (needs a real access JWT — mint one
  with the shared secret, or reuse an Auth login helper).
- Menu cache: miss → hit → invalidation after a product change.

**Important edge cases:** customer tries to create a restaurant (403); owner
edits another owner's restaurant (403); restaurant/category/product not found
(404); category belongs to another restaurant (403); product belongs to another
category/restaurant (403); stale cache after write (must be invalidated);
**Redis unavailable → still serves from DB**; DB error → clean 5xx.

> Do not write tests until the relevant task. Never claim a test passed unless it
> actually ran.

---

## 16. Implementation Tasks

> One task per skill invocation. Each ends with the quality gate + a code-review
> pass, then **STOP** for developer review. Order respects dependencies.

### Task 1 — Restaurant Service bootstrap
- [x] status
- **Objective:** scaffold `services/restaurant-service` (NestJS 11) as a
  workspace package (`@quickbite/restaurant-service`), mirroring auth-service
  (scripts, tsconfig, eslint incl. the architecture rules, `.env`/`.env.example`,
  port e.g. 3002).
- **Prereqrs:** none.
- **Files:** `services/restaurant-service/*`, root `package-lock.json`.
- **Requirements:** `dev`/`build`/`lint`/`test`/`test:e2e`/`db:*` scripts; global
  `ValidationPipe`; Turborepo picks it up.
- **Acceptance:** `turbo run build lint test --filter=@quickbite/restaurant-service`
  green; service boots.
- **Tests:** scaffold spec passes.

### Task 2 — PostgreSQL / Prisma setup
- [x] status
- **Objective:** Prisma wired to `restaurant_db`; `PrismaService`/`PrismaModule`
  (auth-service pattern); env validated (Joi) with `DATABASE_URL`, `REDIS_URL`,
  `JWT_ACCESS_SECRET`, throttle/CORS.
- **Prereq:** Task 1. **Acceptance:** `prisma generate` + a baseline migrate
  deploy work against `restaurant_db`.

### Task 3 — Domain schema + migration
- [x] status
- **Objective:** author the Prisma schema (§3/§9) — Restaurant, Branch, Category,
  Product; enums; indexes; partial-unique category name; soft delete. Create the
  migration.
- **Acceptance:** migration applied; tables/indexes/constraints verified in
  `restaurant_db`.

### Task 4 — Shared auth lib + AuthN/AuthZ integration
- [x] status

> **Deferred to Task 5 (from code review):** add a supertest e2e for the auth
> guard/module wiring (no token → 401, wrong role → 403, owner → 200) on the
> first real protected endpoint — the DI path is currently proven by unit tests
> + a manual smoke test only. **Follow-ups tracked:** migrate auth-service onto
> `@quickbite/nest-auth` (single source for the token contract); RS256-static
> signing before a 3rd service inherits the shared secret.
- **Objective:** per §2 Option A, create `libs/nest-auth` (`JwtAuthGuard`,
  `@CurrentUser`, `RolesGuard`, `@Roles`, `AuthenticatedUser`) and consume it in
  Restaurant Service. (Refactor auth-service to consume it too **only if low
  risk**; otherwise leave auth-service untouched and note the follow-up.)
- **Acceptance:** a protected `GET /restaurants/mine`-style probe rejects
  no/invalid token (401) and wrong role (403); unit tests for guard + roles.

### Task 5 — Restaurant CRUD + ownership
- [x] status
- **Objective:** Clean-Architecture Restaurant module (domain/application/
  infrastructure/presentation): create/get/update/soft-delete; `ownerId` from
  JWT; ownership + role enforced; domain errors + filter.
- **Acceptance:** contracts in §11 behave; ownership/role edge cases covered by
  unit tests.

> **Done:** 4 endpoints (POST/GET/PATCH/DELETE `/restaurants`), `ownerId` from
> JWT only, ADMIN ownership bypass, soft-delete→404, `deletedAt` hidden. 13 unit
> + 16 e2e tests (the deferred Task-4 guard-wiring matrix now runs on the real
> `POST /restaurants`). Probe controller removed. **No schema change.**
> **Deferred (code review, non-blocking):** strict phone-format validation (§12);
> scoping `update`/`softDelete` with `deletedAt IS NULL` to close a benign
> concurrent-delete read-after-write window; reconciling the `null`-clears
> contract between the repo port and the DTOs. e2e CI wiring is Task 12.

### Task 6 — Branch management
- [ ] status
- **Objective:** Branch CRUD scoped to the owner's restaurant (§5).
- **Acceptance:** owner-only writes; cross-owner attempts → 403; unit tests.

### Task 7 — Category management
- [ ] status
- **Objective:** Category CRUD (§6) incl. duplicate-name 409 and `sortOrder`.
- **Acceptance:** duplicate category → 409; ownership enforced; unit tests.

### Task 8 — Product management
- [ ] status
- **Objective:** Product CRUD (§7) under a category; price validation; ownership
  via category → restaurant.
- **Acceptance:** invalid price → 400; cross-restaurant product → 403; unit tests.

### Task 9 — Menu endpoint + Redis cache + invalidation
- [ ] status
- **Objective:** `GET /restaurants/:id/menu` cache-aside on
  `restaurant:{id}:menu` (§10); invalidate on restaurant/category/product writes;
  Redis-down falls back to DB.
- **Acceptance:** miss→hit→invalidate proven; Redis-unavailable still serves.

### Task 10 — Swagger + error consistency
- [ ] status
- **Objective:** `@nestjs/swagger` docs (`/docs`, non-prod), `@ApiProperty`
  examples, documented error responses; consistent `DomainExceptionFilter`.
- **Acceptance:** `/docs` lists all endpoints with auth + error codes.

### Task 11 — Unit tests
- [ ] status
- **Objective:** complete unit coverage of use-cases, ownership, roles,
  validation, cache logic.
- **Acceptance:** `turbo run test --filter=@quickbite/restaurant-service` green.

### Task 12 — Integration (e2e) tests
- [ ] status
- **Objective:** e2e flows (§15) against Postgres + Redis; extend CI to run this
  service's `test:e2e` (its own DB/migrate step).
- **Acceptance:** e2e green locally and in CI.

### Task 13 — Docker / health check / final verification
- [ ] status
- **Objective:** service Dockerfile + compose wiring (own `restaurant_db`), a
  real health endpoint, full `build/lint/test/e2e` green, image boots.
- **Acceptance:** Definition of Done (§17) fully satisfied.

---

## 17. Definition of Done

- [x] Restaurant Service runs independently
- [x] Restaurant DB isolated from Auth DB (no cross-DB FK; `ownerId` is a plain UUID)
- [x] Restaurant CRUD works
- [ ] Branch CRUD works
- [ ] Category CRUD works
- [ ] Product CRUD works
- [x] Authentication enforced (JWT)
- [x] Authorization enforced (role)
- [x] Ownership checks enforced
- [ ] Redis caching implemented where justified (menu)
- [ ] Cache invalidation works
- [ ] Validation works
- [ ] Error handling consistent
- [ ] Swagger updated
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Lint passes
- [ ] Type-check passes
- [ ] Build passes
- [ ] Docker environment works

---

## Assumptions (explicit)

1. **Shared JWT secret** across services (already true via validated env) —
   enables local, stateless token validation with no Auth Service call.
2. **No admin-approval flow** for restaurants in the MVP → initial `status =
   ACTIVE`; `PENDING_APPROVAL` is a future addition.
3. **Reads are public** (customers browse menus without a token); only writes are
   protected. Revisit if the product requires auth to browse.
4. **Soft delete on all four entities** for consistency/auditability with
   auth-service, rather than only the aggregate root.
5. **API Gateway is not implemented yet** → during Sprint 2 the service is called
   directly with the Bearer token; gateway routing is a later concern.
6. **Shared auth lib (Option A)** is the recommended reuse path; if extraction
   proves risky mid-sprint, fall back to a minimal duplicated guard (Option B)
   and record the decision.

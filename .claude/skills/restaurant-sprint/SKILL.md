---
name: restaurant-sprint
description: Implement Sprint 2 (Restaurant Service) ONE task at a time from docs/sprints/sprint-2-restaurant-service.md, using the solution-architect / feature-planner / code-reviewer agents and the project's hooks + CI. Trigger with /restaurant-sprint, "next restaurant task", "implement the next sprint 2 task", or a named task like "restaurant task 5". Plans the task (planner/architect), implements ONLY that task, runs the quality gate + relevant e2e, self-reviews with code-reviewer, checks the task off, commits/pushes to the sprint branch, and then STOPS for developer review. Never auto-continues to the next task; never implements the whole sprint at once.
---

# Restaurant Sprint (Sprint 2) — one task at a time

Implements the Restaurant Service from
`docs/sprints/sprint-2-restaurant-service.md`, **one task per invocation**,
following the same professional flow proven in Sprint 1 and integrating the
three review agents. **The developer reviews each task before the next begins.**

## Non-negotiables (from the sprint brief + CLAUDE.md)

- **Do NOT implement the whole sprint at once.** One task, then **STOP**.
- **Do NOT auto-continue** to the next task — wait for the developer's explicit go.
- Restaurant Service is **independent**: its own `restaurant_db`, **no access to
  `auth_db`**, **no cross-DB foreign key** (`ownerId` is a plain UUID).
- Do not modify Auth Service (or its DB) or other services unless the task
  explicitly requires it.
- **No RabbitMQ** unless a real async use case appears (the plan says it's not
  needed). **No caching beyond** what §10 justifies (the menu).
- Never trust `ownerId` from the request — use the authenticated identity.
- Never claim a test passed unless it actually ran; never mark a task done unless
  its acceptance criteria are satisfied. Don't over-engineer the MVP.

## Workflow

### 1. Select the task
1. Read `CLAUDE.md` and `docs/sprints/sprint-2-restaurant-service.md`.
2. Resolve the target task: the argument (e.g. "task 5"), or the **first Task
   whose `- [ ] status` is unchecked**, in document order.
3. Print the task id, objective, prerequisites, and acceptance criteria. If a
   prerequisite task isn't done, **stop and say so** rather than guessing.

### 2. Plan the task (agents)
- Dispatch the **feature-planner** agent to turn the task into a concrete plan
  (affected modules, API contracts, DB/Redis changes, validation, authz, tests).
- For **architectural** tasks — Task 4 (shared auth lib) and Task 9 (cache
  strategy), or any task that changes a cross-cutting decision — dispatch the
  **solution-architect** agent first (Problem → Options → Trade-offs →
  Recommendation) and **confirm the direction with the developer before coding**.
- Reuse existing conventions (Clean Architecture layers, ports/adapters,
  `PrismaService`, `RedisModule`/`REDIS_CLIENT`, `@map` snake_case, Joi env,
  `DomainExceptionFilter`, `class-validator` DTOs, the JWT guard pattern).

### 3. Branch
1. Working tree must be clean (else stop and report).
2. Base branch: `development`. Use a **single sprint branch**
   `feat/restaurant-service` — create it off `development` on the first task,
   reuse it for subsequent tasks (so the tasks build on each other without
   stacking separate branches).

### 4. Implement ONLY this task
Implement just this task's scope. The **hooks run automatically**:
- PostToolUse formats + lints each edited file (fast feedback);
- the Bash guard blocks destructive commands.
Honor the plan's layer boundaries and the architecture ESLint rules.

### 5. Migrate (if the schema changed)
`npm run db:migrate -w @quickbite/restaurant-service -- --name <task_slug>`
(author the migration SQL and `db:deploy` if the CLI is non-interactive, as in
Sprint 1). Verify tables/indexes/constraints against `restaurant_db`.

### 6. Quality gate (must pass)
From the repo root:
- `npx turbo run build lint test --filter=@quickbite/restaurant-service`
- Run **e2e** (`npm run test:e2e -w @quickbite/restaurant-service`) when the task
  touches controllers, auth/guards, persistence, or the cache — i.e. Tasks 5–9,
  12, 13. Skip e2e for pure scaffolding/planning tasks.
Never proceed with a red gate; never `--no-verify`.

### 7. Self-review (agent)
Dispatch the **code-reviewer** agent on this task's diff. Fix every **CRITICAL**
and **HIGH** finding; surface MEDIUM/LOW/NIT in the report. Re-run the gate after
fixes.

### 8. Update the plan
Check off this task's `- [ ] status` → `- [x] status` in the sprint doc, plus any
Definition-of-Done items now satisfied. Commit the doc update with the code.

### 9. Commit + push (never merge)
- Conventional commit: `feat(restaurant): <task title> (task N)`.
- End the body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Push `feat/restaurant-service`. On the first push open a PR into `development`
  (`gh pr create --base development`); later pushes update it. The **pre-push
  hook + CI** run the gate. **Never merge** — the developer merges.

### 10. STOP and report
Report and then **halt** (do not start the next task):
1. What changed (task + scope).
2. Files changed.
3. Tests executed.
4. Test results (real).
5. Any issues / limitations.
6. code-reviewer verdict + top findings.

Wait for the developer to explicitly ask for the next task.

## Guardrails
- One task per invocation; never batch tasks; never auto-continue.
- No RabbitMQ without a real async use case; no caching beyond §10.
- No cross-service DB access; no cross-DB FK.
- Never commit `.env` or secrets; never skip the gate.
- If a task's plan reveals a dependency on an unfinished task, stop and surface it.

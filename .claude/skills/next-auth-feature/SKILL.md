---
name: next-auth-feature
description: Implement the next unstarted feature from the QuickBite Auth Service sprint backlog end-to-end. Trigger when the user invokes /next-auth-feature or says "work on the next auth feature", "implement the next auth story", "take the next auth task", or names a specific feature like "do auth 2.1" / "implement Login". Also triggers with no feature given (auto-picks the next feature with unchecked tasks in docs/sprint-1-auth.md, in document order). The skill parses the backlog, creates a feature branch, dispatches a focused implementation agent that fits the feature, follows the auth-service conventions (NestJS + Prisma + Redis + Argon2), runs the build/lint/test quality gate, checks off completed tasks in the backlog, commits, and (when a GitHub remote exists) pushes and opens a PR. Never auto-merges.
---

# Next Auth Feature

Implements one feature from `docs/sprint-1-auth.md` at a time, following QuickBite's
architecture (see `CLAUDE.md`): Microservices, Clean Architecture, DDD, MVP-first.

## Inputs

- **No argument** → auto-pick the first feature in `docs/sprint-1-auth.md` that has
  at least one unchecked `[ ]` task, in document order (Epic 1 → Epic 7).
- **A feature id or name** (e.g. `2.1`, "Login", "Refresh Token") → work on that one.

Always confirm the selected feature with the user before writing code if the pick was
automatic **and** the feature touches more than one architectural layer.

## Workflow

### 1. Select the feature
1. Read `docs/sprint-1-auth.md`.
2. Resolve the target feature (from the argument, or the first with unchecked tasks).
3. Print the feature id, title, and its remaining unchecked tasks.

### 2. Plan (explain before building — per CLAUDE.md)
Before any code, state briefly:
- Which **Clean Architecture layers** it touches: `domain` (entities/value objects),
  `application` (use-cases/ports), `infrastructure` (Prisma repo, Redis store, hashing,
  events), `presentation` (controller, DTOs, guards).
- The **trade-offs** and the **simplest production-ready** approach.
- Whether a **Prisma migration** is needed.
Wait for confirmation on non-trivial features (multi-layer or new public endpoints).

### 3. Branch
1. Ensure the working tree is clean (`git status`). If dirty, stop and report.
2. Determine the base branch (`main` if it exists, else `master`) and update it.
3. Create and switch to a feature branch:
   `feat/auth-<featureId>-<kebab-title>`  e.g. `feat/auth-2.1-login`.
   For epic-level task groups (Epics 4–7) use `feat/auth-<epicNumber>-<kebab-title>`.

### 4. Implement (dispatch the fitting agent)
Pick the approach that fits the feature, then implement following existing conventions
in `services/auth-service` (module structure, `VerificationCodeStore` pattern, DI tokens,
`@map`/snake_case Prisma, env via `@nestjs/config`):

| Feature shape | How to run it |
| --- | --- |
| Standard CRUD / use-case implementation (most features) | Spawn a **general-purpose** agent scoped to that feature with the plan from step 2. |
| Ambiguous design / new cross-cutting pattern | Spawn a **Plan** agent first, confirm, then implement. |
| "Where does X live / does it already exist?" | Spawn an **Explore** agent before implementing. |

Only spawn an agent when the user asked for agent-driven work or the feature is large;
otherwise implement inline. Conventions to honor:
- **Passwords → Argon2** (`argon2`), refresh tokens → hashed before storage.
- **Redis** codes via the existing `VerificationCodeStore` (`EMAIL_VERIFICATION_STORE`,
  `PASSWORD_RESET_STORE`).
- **Events** (`UserRegistered`, `PasswordResetRequested`): emit through an app-level
  event abstraction now; wire to RabbitMQ only when a real consumer exists (MVP-first).
- **Validation** via `class-validator` DTOs + a global `ValidationPipe`.
- **No hardcoded secrets** — everything through validated env.

### 5. Migrate (if schema changed)
Run `npm run db:migrate -w @quickbite/auth-service -- --name <feature_slug>` and verify
the migration file is created under `prisma/migrations/`.

### 6. Quality gate (must pass before commit)
From the repo root:
- `npx turbo run build --filter=@quickbite/auth-service`
- `npx turbo run lint  --filter=@quickbite/auth-service`
- `npx turbo run test  --filter=@quickbite/auth-service`
If any fails, fix and re-run. Never proceed with a red gate.

### 7. Update the backlog
Check off (`[ ]` → `[x]`) every task in `docs/sprint-1-auth.md` that this feature
satisfied, plus the per-feature Definition-of-Done items that now hold.

### 8. Commit
Conventional commit, scoped to auth:
`feat(auth): implement <feature title> (<featureId>)`
Include the backlog update in the same commit.
End the commit message body with:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### 9. Push + PR (only if a GitHub remote is configured)
1. If `git remote` is empty → **stop here**, tell the user the branch is committed
   locally and that a remote/`gh` must be set up to push (see the repo README/notes).
2. Otherwise push the branch. The **pre-push hook** re-runs the quality gate and blocks
   on failure — do not use `--no-verify`.
3. Open a PR with `gh pr create` titled `feat(auth): <title> [<branch>]`, body listing
   the completed tasks and DoD. **Never merge** — leave it for review.

## Guardrails
- One feature per invocation. Don't batch multiple features into one branch/PR.
- Never `git push --no-verify` or skip the gate.
- Never commit `.env` or secrets.
- If the plan reveals the feature depends on an unbuilt one, stop and surface the
  dependency instead of guessing.

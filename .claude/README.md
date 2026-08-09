# Claude Code configuration — QuickBite backend

This directory configures Claude Code for the repo: a small set of **hooks**,
project **permissions**, and the `next-auth-feature` skill.

The guiding rule is **three tiers of validation, cheapest first** — hooks stay
fast during normal work; the real gate runs before code leaves the machine.

| Tier | When | What runs | Where |
| --- | --- | --- | --- |
| **Fast feedback** | after each file edit | Prettier + ESLint on the **one** changed file (+ secret scan) | `PostToolUse` hook |
| **Full validation** | before every push | `turbo run lint build test` (unit) | `.githooks/pre-push` |
| **CI (authoritative)** | every PR into `development` | lint · build · unit · **e2e** (Postgres+Redis containers) | `.github/workflows/ci.yml` |

Expensive tests are **not** run after every edit on purpose — that would make
editing painfully slow. The pre-push hook and CI are the authoritative gates.

---

## Hooks

### 1. PreToolUse — Bash safety guard (`hooks/guard-bash.mjs`)
- **Runs:** before every `Bash` command.
- **Blocks (exit 2):** `rm -rf`, `rm` on `/`, `git reset --hard`, `git clean -fd/-fdx`,
  `git push --force/-f/--force-with-lease`, `git checkout -- .`, `git add -f *.env`,
  `docker system prune -a/--volumes`, `docker volume rm/prune`, `DROP/TRUNCATE`,
  `prisma migrate reset`, `prisma db push --accept-data-loss`, `mkfs`/`dd of=/dev/*`,
  fork bombs.
- **Allows:** everything else — `git status/add/commit/push`, `npm`, `docker compose`, `node`, …
- **Fails open:** if the script errors, the command is allowed (the guard never
  bricks the shell). It is defense-in-depth, complementing `permissions.deny`.

### 2. PostToolUse — quality check (`hooks/post-edit-quality.mjs`)
- **Runs:** after `Edit`/`Write`/`MultiEdit` on `*.ts,tsx,js,jsx,mjs,cjs`.
- **Does:** `prettier --write` → `eslint --fix` **on the single file** → a
  high-confidence secret scan (private keys, AWS/GitHub/Slack tokens).
- **Reports (exit 2):** remaining ESLint errors (including the Clean Architecture
  import rules) or a detected secret, so the agent fixes them immediately.
- **Does NOT:** run tests or a whole-project type-check (those are pre-push/CI).

There is intentionally **no** "run the whole suite on task end" hook and **no**
separate pre-commit hook — both would duplicate the pre-push gate and CI and slow
normal work.

---

## Permissions (`settings.json`)
- **`allow`:** common read-only / dev commands (git status/diff/log, `npm run *`,
  `turbo run`, `docker compose ps`, …) so they don't prompt.
- **`deny`:** the same destructive commands the Bash guard blocks — a second layer.
- No broad/unrestricted shell grant; anything not listed still prompts.

---

## Architecture rules (enforced by ESLint, not a filename checker)
Defined in `services/*/eslint.config.mjs` via `@typescript-eslint/no-restricted-imports`,
so they run in the PostToolUse hook **and** in pre-push **and** in CI.

```
Presentation → Application → Domain        (Infrastructure implements ports)
```
- **Domain** (`src/modules/*/domain/**`) must not import: `@nestjs/*`, Prisma,
  `ioredis`, `argon2`, `express`, `joi`, `helmet`, `class-validator/-transformer`,
  or anything from `application/**`, `infrastructure/**`, `presentation/**`.
- **Application** (`src/modules/*/application/**`) must not import concrete
  infrastructure packages (Prisma, ioredis, argon2, `@nestjs/jwt|throttler|swagger|
  config|event-emitter`, helmet, express) or anything from `infrastructure/**` /
  `presentation/**`. It may use `@nestjs/common` for DI. Its dependencies are the
  domain **ports** (interfaces + DI tokens, which live in the domain).

> Known follow-up: none — the store DI tokens were moved into the domain ports so
> the application no longer reaches into infrastructure.

## Security rules
- Bash guard blocks force-adding `.env` files and destructive DB commands.
- PostToolUse blocks committing obvious secrets (private keys, cloud/VCS tokens).
- Real secrets live only in gitignored `.env`; config is validated at boot (Joi).
- These are lightweight checks, **not** a replacement for a dedicated scanner.

---

## Testing / operating the hooks

**Run a hook manually** (simulate the JSON Claude Code sends on stdin):
```bash
echo '{"tool_input":{"command":"git clean -fd"}}' | node .claude/hooks/guard-bash.mjs; echo "exit $?"
echo '{"tool_input":{"file_path":"services/auth-service/src/main.ts"}}' | node .claude/hooks/post-edit-quality.mjs; echo "exit $?"
```
Exit `2` = blocked/problems reported; exit `0` = allowed/clean.

**Temporarily disable a hook:** comment it out of `settings.json` (remove its entry
from `PreToolUse`/`PostToolUse`) and reload the session. Do not delete the scripts.

**Modify a hook safely:**
1. Edit the `.mjs` script.
2. `node --check .claude/hooks/<file>.mjs` (syntax).
3. Re-run the manual tests above with safe **and** dangerous samples.
4. Only then rely on it. Keep guards **fail-open** so a bug can't block all work.

**Fast feedback vs full validation vs CI:** see the table at the top. If a change
touches controllers, guards, auth, persistence, or integration boundaries, the
**e2e** tests in CI are the real check — run them locally with
`npm run test:e2e -w @quickbite/auth-service` (needs the infra containers up).

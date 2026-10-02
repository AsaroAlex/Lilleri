# Contributing to Lilleri

## Before you start

1. Read `PROJECT_STATE.md` (current state, next action) and `docs/README.md` (documentation map).
2. Architectural changes need an ADR in `docs/adr/` (template: `0000-adr-template.md`).
3. Product behaviour follows `docs/product/prd.md`; copy follows `docs/brand/tone-of-voice.md`.

## Local setup

```bash
corepack enable            # or install pnpm 10
pnpm install
cp .env.example .env       # fill in local values only, never real secrets
docker compose up -d       # PostgreSQL for development (see docker-compose.yml)
pnpm dev
```

Useful commands:

| Command | What it does |
| --- | --- |
| `pnpm check` | Biome lint/format check, typecheck and unit tests across the monorepo |
| `pnpm check:fix` | Apply Biome fixes and formatting |
| `pnpm test:integration` | Integration tests against PostgreSQL (`TEST_DATABASE_URL`) |
| `pnpm build` | Build all packages and apps |

## Conventions

- **Commits**: Conventional Commits (`feat(reconciliation): pair internal transfers`), enforced by
  the `commit-msg` hook. Allowed types: feat, fix, docs, chore, refactor, perf, test, build, ci,
  style, revert, research, design, brand.
- **TypeScript**: strict mode, no `any`, ESM only, `import type` for types.
- **Money**: integer minor units as `bigint` plus an ISO 4217 currency code. Never floating point.
  Use the helpers in `@lilleri/domain`.
- **Dates**: booking/value dates are calendar dates in `Europe/Rome` (`YYYY-MM-DD` strings);
  instants are UTC timestamps.
- **Packages**: `@lilleri/*` scope. Domain code must not import provider payload types.
- **Tests**: every reconciliation or classification rule ships with fixture-based tests and the
  financial invariants must keep passing.
- **Privacy**: no real personal data in fixtures; fixtures are synthetic.

## Pull requests

Use the PR template. Keep PRs focused; update docs and `PROJECT_STATE.md` in the same PR.

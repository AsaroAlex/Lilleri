# Lilleri

**Collega i tuoi conti una volta. Lilleri tiene in ordine i tuoi soldi, da solo — e ti chiede
qualcosa solo quando ha un dubbio.**

Lilleri is a consumer personal-finance product, Italy-first and built to scale across Europe. It
aggregates accounts through a licensed open-banking provider, reconciles what actually happened
(pending → booked, duplicates across sources, internal transfers, card settlements, refunds),
categorises with a personal model that learns from corrections — explicit rules always win — and
surfaces only what needs attention in a Review Inbox.

> Status: **pre-MVP foundation**. See [`PROJECT_STATE.md`](./PROJECT_STATE.md) for the live state
> and [`docs/STATUS.md`](./docs/STATUS.md) (when present) for the executive report.

## Repository map

| Path | Content |
| --- | --- |
| `docs/` | Research, product, brand, design, architecture, ADRs, security, compliance, business ([map](./docs/README.md)) |
| `apps/` | Applications (API, mobile, web) |
| `packages/` | Shared packages (`@lilleri/*`): domain, database, providers, engines, brand tokens, … |
| `tools/` | Brand rendering toolkit and orchestration scripts used to produce the docs |
| `PROJECT_STATE.md` | Persistent working memory: current state, next action, decisions |

## Quick start

```bash
pnpm install
pnpm check        # Biome + typecheck + unit tests
```

Further commands are documented in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Principles

Trust before conversion. Correct data before automation. The complexity lives in the system, not
in the user's experience.

## What and why

## How it was verified

- [ ] `pnpm check` (Biome + typecheck + unit tests)
- [ ] `pnpm test:integration` (if the change touches the database or ingestion)
- [ ] Financial invariants still hold (duplicates never counted twice, transfers never change net worth, split children sum to parent)

## Data, privacy and security

- [ ] No new personal or financial data stored without a documented reason (`docs/compliance/privacy-model.md`)
- [ ] No secrets, real bank data or personal identifiers in code, fixtures or logs
- [ ] Analytics events stay semantic (no descriptions, IBANs or exact amounts)

## Docs

- [ ] ADR added/updated for architectural decisions
- [ ] `PROJECT_STATE.md` updated

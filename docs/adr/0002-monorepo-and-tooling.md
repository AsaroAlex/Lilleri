# ADR-0002: Monorepo and tooling

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D for the scoped mock-first architecture; not a real-data release approval

## Context

FACT: the root manifests already select pnpm, Turborepo, Biome, strict TypeScript and Vitest; the money package is implemented. FACT: historical [spikes](../research/raw/toolchain-spikes.md) exercised TypeScript 7 and the proposed frameworks but do not prove every current package combination. ASSUMPTION: a small team benefits from shared exact-money/domain/client types and atomic changes. Tool versions in research can drift from the lockfile; adopting a latest compiler without integration checks can break Next or Expo.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| pnpm + Turbo + Biome + Vitest | One workspace, shared strict TS | Existing tooling and reproducible package graph | Root scripts need meaningful package coverage | Root manifests, historical spikes |
| npm workspaces + custom scripts | Fewer orchestrator tools | Familiar simple base | More manual dependency ordering/cache | No current equivalent benchmark |
| Separate repositories / Nx | Independent releases or larger graph management | Strong isolation/graph features | Overhead for current team and slice | Brief permits monorepo; current repo is pnpm |

Proposal: retain the current pnpm workspace. Critique: installing tools and adding hooks is not proof of repository quality; published package release tools could be unnecessary. Counterproposal: keep only useful scripts, test actual consumers and defer Changesets until packages need publication. Decision: maintain current tooling and lockfile with explicit quality evidence.

## Decision

DECISION: pnpm with a checked-in lockfile, Turborepo dependency-aware build/typecheck/test tasks, Biome source lint/format and Vitest financially meaningful tests. Use strict TS with explicit exports and compatible ESM configuration. Current manifest/lockfile wins over historical version claims. TypeScript major upgrades require API, SQL, Next build and Expo export/typecheck evidence; do not switch to canary/latest merely because it is available. Native packages follow Expo's supported set.

CI installs frozen dependencies and runs lint/format, typecheck, unit tests, implemented integration tests and build. The real-PG service must test actual code rather than a no-op script. Secret scans and advisory review remain separate evidence; warning-only audit does not close a production gate. Hooks support source formatting and Conventional Commits but never replace CI. Changesets is a future option for publishable packages; private workspace versioning does not need unnecessary release ceremony. Do not create empty packages to satisfy a tree diagram.

## Consequences

Shared exact types and atomic changes reduce cross-package drift. A root build can catch server exports accidentally imported by mobile. Costs include configuring package exports/build order and ensuring scripts fail honestly. Cache inputs must include relevant schema/fixtures/config; otherwise a green cached test can hide changed behaviour. Existing commit/branch requirements are governance, not architecture permission to publish. Generated artifacts need a reproducible owner and drift check where consumed.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Tool/version incompatibility | Medium | Medium | Pin lockfile and verify frameworks before upgrade | Next/Expo type API or native build failures |
| Green root command omits packages | Medium | High | Inspect workspace tasks and actual test inventory | New package lacks scripts or tests |

## Revisit conditions

Revisit Turbo/monorepo tooling after measured CI cost or dependency-graph complexity justifies a replacement. Add package release tooling only when external consumers require versions. Compiler version remains revisitable after successful compatibility evidence, without changing domain/API contracts.

## References

- [Repository structure](../architecture/repository-structure.md).
- [Historical toolchain spikes](../research/raw/toolchain-spikes.md) (executed 2026-10-02, historical environment).
- [Root package manifest](../../package.json); [CI](../../.github/workflows/ci.yml).

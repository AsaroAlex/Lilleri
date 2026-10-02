# ADR-0003: Technology stack

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D for the scoped mock-first architecture; not a real-data release approval

## Context

FACT: [stack research](../research/raw/tech-stack-options.md) compares React Native/Expo, Flutter/native, Fastify/Nest/Hono and PostgreSQL access libraries. FACT: historical spikes successfully typechecked/build-exported minimal Fastify, Expo and Next examples, without production-device or auth-flow validation. ASSUMPTION: the team is TypeScript-capable and benefits from one language. The first goal is a synthetic walking skeleton, not a deployed bank-connected service. Security comes from implementation boundaries and verification, not a framework score.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Expo + Next + Fastify/Zod + Drizzle | TypeScript product and REST backend | Shared contracts, current spikes/tooling | Native upgrade and backend auth responsibility | Stack research, toolchain spikes |
| Flutter + managed backend | Dart mobile plus backend platform | Capable mobile UI and managed primitives | Split languages, additional vendor boundary | Stack matrix; no current product spike |
| Native Swift/Kotlin + Go/Java | Separate native clients and API | Platform control, established ecosystems | Three codebases and larger delivery burden | Brief's small-team assumption |

Proposal: use the TypeScript stack. Critique: latest RN differs from the SDK's validated pairing, and Next is substantial for a landing. Counterproposal: pin Expo-compatible native versions, use a minimal Next landing and keep framework-independent money/engines. Decision: choose the stack while deferring experimental modules and platform integration claims.

## Decision

DECISION: Expo React Native for mobile, Next for the public landing, Fastify with explicit Zod validation/OpenAPI for REST, PostgreSQL with Drizzle and PGlite for local synthetic dev/test. Use `@lilleri/*` package scope. Backend is Node on the tested compatible current runtime, not a speculative Bun/edge migration. Do not mix SDK 57 with an unrelated latest RN version. Current package manifests and successful builds define pinned versions.

REST transport and schemas stay in the API; pure domain/engines do not depend on framework/vendor types. Mobile receives bigint amounts as integer strings and uses exact formatting helpers. Next handles no bank payloads by default. An API-client package is created when useful; generation/contract drift is checked before relying on it. Native screen-reader, secure-storage, passkey and store-release behaviours require device evidence beyond a web export. Experimental Expo RSC, native styling systems and animation libraries are not prerequisites for the initial core loop.

## Consequences

One language makes financial contracts and synthetic fixtures easier to share. Fastify plugin boundaries provide a small transport layer, while pure engines remain extractable. Negative: the team owns session security, upgrade discipline and validation plumbing; framework selection does not outsource compliance. Expo native dependencies must follow supported pairings. Next can later be split into a content-oriented framework if marketing volume warrants it. A rendered shell is insufficient evidence of a functioning correction/replay experience.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Expo/native version drift | Medium | High | Supported pairing and export/device checks | Native mismatch warnings or device crashes |
| Backend contract leaks persistence/vendor formats | Medium | High | Domain port and DTO review | Client imports ORM or provider SDK |

## Revisit conditions

Revisit mobile choice if verified platform requirements cannot be served by supported Expo modules or team capabilities change. Revisit landing framework for substantial editorial content. Revisit API framework only for measured limitations, not novelty; retain exact-money/provider contracts.

## References

- [Stack options](../research/raw/tech-stack-options.md), source dates/URLs retained there.
- [Spikes](../research/raw/toolchain-spikes.md) and [system decision matrix](../architecture/system-architecture.md).
- [API contract](../architecture/api-contract.md).

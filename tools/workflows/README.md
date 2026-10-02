# Orchestration scripts (Claude Code Workflow tool)

These are the multi-agent workflow scripts used to produce the research, synthesis, brand and
architecture documentation of this repository. They are plain JavaScript scripts for the Claude
Code `Workflow` tool (not Node programs): each `agent(...)` call spawns a specialist sub-agent with
the given prompt and returns its structured output. They are kept here so that a later session can
re-run or resume a phase (`Workflow({scriptPath, resumeFromRunId})`) without rewriting the prompts.

| Script | Phase | Produces |
| --- | --- | --- |
| `phase0-research-market.js` | 0 | `docs/research/raw/competitors-*.md`, `user-pain-points.md`, `brand-competitor-analysis.md`, `naming-lilleri.md` |
| `phase0-research-findata.js` | 0 | `docs/research/raw/open-banking-providers-{a,b}.md`, `non-bank-sources-and-os-limits.md`, `regulatory-landscape.md`, `business-and-cost-inputs.md` |
| `phase0-research-tech.js` | 0 | `docs/research/raw/tech-stack-options.md`, `ai-ml-transaction-intelligence.md`, `reconciliation-and-data-model-patterns.md`, `typography-options.md`, `build-vs-buy-and-vendors.md` |
| `phase1-synthesis-a.js` | 1 | `docs/research/*.md` (market, matrix, opportunity, pain points, providers, cost model, data sources), `docs/product/personas.md`, `jobs-to-be-done.md`, `docs/compliance/*.md` + red-team critique and revision |
| `phase1-synthesis-b1.js` | 1 | `docs/business/*.md`, `docs/brand/brand-strategy.md`, `naming-analysis.md`, `messaging-framework.md`, `docs/research/brand-competitor-analysis.md` |
| `phase1-synthesis-b2.js` | 1 | `docs/product/vision.md`, `prd.md`, `mvp.md`, `backlog.md`, `metrics.md`, `roadmap.md`, `pre-mortem.md` + critique/revision of business, brand and product docs |
| `phase2-explore.js` | 2 | logo directions A/B/C, colour territories, typography decision under `docs/brand/explorations/` and `packages/brand/explorations/` |
| `phase2-judge-consolidate.js` | 2 | judge panel, final identity (`packages/brand/logo`, `icon`, `tokens`, `png`), `docs/brand/brand-identity.md` etc., `docs/design/*.md`, `docs/brand/tone-of-voice.md`, brand red team + fix |
| `phase3-architecture.js` | 3 | `docs/architecture/*.md`, `docs/adr/0001…0018`, `docs/security/*.md` + red team + fix |

Notes for re-runs: the `TOOLS` constant in the phase-2 scripts must point to a directory containing
`tools/brand-render` with its `node_modules` installed. Web search budget is roughly 200 queries per
workflow run; `WebFetch` is blocked for most domains in the cloud sandbox.

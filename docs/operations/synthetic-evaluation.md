# Local synthetic evaluation

**Date:** 2026-10-03 · **Scope:** runnable subset of E25.3, with original invented fixtures. E25.1's representative labelled corpus, E25.4's live audit and production calibration remain open.

The runner executes the current provider normalizer and deterministic `analyse` engine. Expected annotations are stored separately from raw provider rows and are never passed to the engine. Explicit rules, preferences and one-shot corrections in their own strata are input behaviour under test; their results do not measure an unseen classifier's accuracy.

## Run and inspect

```sh
pnpm exec turbo run build --filter=@lilleri/engines --filter=@lilleri/financial-providers
node tools/evaluate-synthetic.mjs --output=/tmp/lilleri-synthetic-evaluation.json
node tools/evaluate-synthetic.mjs --measure-latency --output=/tmp/lilleri-synthetic-evaluation-latency.json
pnpm --filter @lilleri/engines test
```

The JSON report includes fixture identity and SHA-256, engine version, sample counts, category confusion cells, per-category precision/recall/F1, per-source and per-stratum counts, classification automatic/review/abstention rates and annotated automatic errors. Reconciliation reports exact-state agreement and automatic-confirmation precision/recall/F1 per decision type. A failed fixture expectation or unexpected unlabelled relationship exits with status 1. The report contains aggregate results, not descriptions or merchant text.

The frozen [fixture](../../fixtures/evaluation/synthetic-v1.json) contains **38 scenarios / 51 transactions**, including the nine non-quiet flat assigned categories, EUR/GBP/JPY/KWD, unknown merchants, normalized aliases, explicit precedence, equal-priority conflict, Italian/English instruction-like descriptions, pending/booked, duplicate, owned-account/card/cash transfers and bounded refunds. Invented institutions are not bank coverage. The tiny, single-author set has no independent annotation, temporal holdout or representative category/bank frequencies; its sample results cannot estimate production accuracy. It does not contain the planned full 25 reconciliation scenario corpus or 3,000–5,000 labelled rows.

Local execution on 2026-10-03 passed all **50 engine tests**, including eight evaluation cases, typecheck, Biome and the four-task dependency build. The CLI agreed with 51/51 classification annotations and 13/13 relationship annotations; observed automatic errors were **0/46 classification decisions and 0/6 confirmed relationships** in this authored toy sample. Five of 51 classifications requested review. Assigned-category correctness was 46/47 known labels because a reviewed rule conflict abstained. These are fixture counts, not an accuracy or zero-error claim for independent data. Changed fixture bytes/split, a training argument and an output path that would overwrite the frozen fixture were refused in separate CLI checks.

## Denominators and abstention

Every rate carries an integer `numerator`, `denominator` and `value`. A zero denominator gives JSON `null`, including an empty sample, unseen category or an entirely reviewed tier. Values are proportions, not percentages. F1 stores `2 × truePositive / (2 × truePositive + falsePositive + falseNegative)` with those exact counts.

Classification prediction is null when the engine requests review or returns `uncategorised`; a reviewed suggested category contributes a false negative for its known ground-truth category, rather than a correct automatic assignment. `assignedCategoryAccuracy` divides correct automatic labels by all rows with a known ground-truth category, including abstentions. Confusion cells include a null row for deliberately undecidable truth and a null column for abstention. They cover all annotated rows. The legacy flat `health` category is rejected because its canonical mapping includes quiet leaves; no quiet quality dimension is emitted.

An annotation with `categoryId: null` explicitly says the input is undecidable, while an absent annotation (`expected: null` in the pure evaluator) says truth is unavailable. Missing truth never becomes a correct or wrong classification. `observedAutoReleaseError` divides automatic wrong labels by **annotated automatic decisions**; unlabelled automatic decisions are disclosed separately. `annotationAgreement` is a regression check of the suggested category and review routing, distinct from automatic assigned-category accuracy. No corrections are combined with the numerator or counted twice.

Reconciliation rows represent explicitly labelled eligible pairs. `absent` is an annotated negative relationship; null truth is unlabelled. Automatic confirmation errors use annotated confirmations only. Precision and recall refer to confirmed relationships, while suggested, rejected, undone and absent outcomes are checked separately through exact-state agreement. Rates are over these selected pairs, not all possible transaction pairs or independently audited bank matches.

## Immutable evaluation boundary

The CLI accepts only the reviewed version and byte digest recorded in its manifest. A modified file, different split or unregistered version is refused; changing cases requires a new reviewed fixture version and digest. The fixture has a `frozen-evaluation-only` split. There is no training mode, model fitting, threshold tuning or promotion to AUTOPILOT. `--fixture=PATH` permits locating the same reviewed bytes, not inserting a training corpus. Use synthetic inputs only.

Injection cases verify that deterministic source processing preserves descriptions as data and does not invent a merchant from instructions or promote a partial merchant match into an exact dictionary hit. This is local deterministic evidence, not a test of an external LLM's prompt protections. Quiet categories are absent and rejected by the scorer; full quiet-set filtering across insights, exports and future models needs its own implementation and tests.

Hierarchical canonical credit, kind inference (kind is a source input), calibration plots, live drift, representative confidence intervals, independent annotation agreement, model cost per 1,000 and external model schema failure rates are explicitly unmeasured. Optional latency is measured around normalization and analysis for each scenario in one process; it provides no production latency or load claim. Provider access, purpose/consent review and an independently labelled, properly split corpus are prerequisites for advancing those parts of E25.

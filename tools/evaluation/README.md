# Offline evaluation and shadow policy tools

These tools prepare the local parts of E25/E11. They do not train a model, call an external service, enable automatic decisions, or establish representative quality from synthetic fixtures. The existing immutable regression runner remains `tools/evaluate-synthetic.mjs`; its results are separate.

## Corpus boundary

`dataset.schema.json` describes the portable input shape. `validateCorpus()` additionally verifies a separately reviewed manifest digest, the approved catalogue, each split digest, exact row membership, and disjoint profile/merchant/source fingerprints. All training times must precede calibration times, which must precede held-out test times. This is a deliberately strict cold-start evaluation split; any future alternative protocol requires a separate version and review.

Manifest/split digests use SHA-256 over canonical JSON: object keys recursively sorted by UTF-16 code-unit order, original array order except split rows sorted by ID, and exact string values. They are semantic digests, not `sha256sum` over pretty-printed file bytes. Obtain the expected manifest digest independently from the reviewed immutable manifest; calculating it from an unreviewed submitted file does not approve that file. Original byte-frozen repository fixtures retain their existing separate contract.

Rows contain pseudonymous identities, source digests, bank/kind/time/state/subset metadata and canonical annotations. They accept no descriptions, merchant display names, amounts, accounts or credentials. Profile/merchant fingerprints need an approved pseudonymisation scheme; unsalted hashes of identifiable source strings are insufficient. Quiet/private rows must have no merchant identity or category labels. Unbooked, injected and unknown-kind examples have an explicit null target. Training accepts only labelled, booked, nonquiet, nonprivate, noninjected rows. Privacy/injection/abstention examples belong in the separate evaluation splits.

First and second annotator identities and their independent labels are preserved. Disagreement requires a third independent adjudicator and a matching final label. The manifest also binds declared authorization hashes, allowed evaluation/training purposes, expiry and clocks. Those declarations and hash references are an input contract; this filesystem tool does not authenticate a consent journal, licence, DPO sign-off or actual human annotation. Those underlying records must be reviewed before using personal or licensed data. Synthetic declarations never qualify a promotion.

## Metrics and policy

Prediction files bind the exact manifest, split, model artifact, model version, calibration version and threshold version. Every row appears once, has a typed decision and complete normalized probabilities over the approved catalogue plus `__abstain__`. Predictions cannot contain ground truth, extra fields or foreign IDs.

Rates retain exact integer numerators/denominators as decimal strings and return `null` for an empty denominator. The report distinguishes auto/review/abstention rates over all rows, false-auto over actual auto decisions, abstention recall over null targets, and coverage/accuracy over eligible labelled rows. An unknown-labelled erroneous guess counts against per-category precision and false-auto; it does not disappear. Precision, recall, F1, parent agreement and bank/kind/subset cuts remain local report data.

Multiclass Brier is the mean sum of squared probability errors; ECE and reliability bins use eligible labelled examples only. They describe supplied probability outputs, not a fitted Platt/isotonic/LLM calibrator or proven live calibration. Float precision applies to these statistical quantities; financial money is absent from the tools.

A reviewed policy supplies the score grid, exact rational error target, minimum auto support, reliability bins, quality limits, scope/mode, versions, required cohorts and rollback version. No default score threshold enables automation. Threshold selection uses calibration only. Held-out test labels can reject the selected threshold; they cannot select its replacement. Shadow replay also preserves mode-independent quiet/private/injection/unbooked/unknown guards.

The promotion assessment requires the independent E25 corpus floor: 3,000–5,000 rows, 12–16 parents, 70–110 leaves and at least 30 held-out examples for each eligible nonquiet leaf, alongside the policy's bank/kind/subset/support requirements. Quiet leaves retain guardrail examples instead of inference labels. The report explicitly refuses synthetic evidence, missing purpose, insufficient representation/support, bad held-out error/calibration and guardrail violations. A passing result is `eligibleForHumanReview`; it is never model activation or launch approval.

The local policy journal binds an independently reviewed assessment hash and journal hash to a review reference, immutable policy version/digest, captured clock and append-only event chain. Rollback selects an existing known version. This is decision metadata: no production component reads it automatically, and hash continuity alone is not an authenticated external audit authority.

## Running

Build the domain first, then run the local evaluator with actual reviewed files:

```sh
pnpm --filter @lilleri/domain build
node --test tools/evaluation/evaluation.test.mjs
node tools/evaluation/run.mjs \
  --dataset=/path/to/reviewed-corpus.json \
  --manifest-sha256=INDEPENDENT_CANONICAL_MANIFEST_DIGEST \
  --calibration=/path/to/calibration-predictions.json \
  --test=/path/to/held-out-predictions.json \
  --policy=/path/to/reviewed-shadow-policy.json \
  --output=/path/to/new-assessment.json
```

`--now=UTC_ISO_INSTANT` is available for reproducible historical assessment. Current authorization still needs current review before any later policy action. Exit 0 means eligible for human review; exit 2 means the valid report refuses eligibility; malformed/unreviewed input fails with exit 1. Output uses exclusive creation and mode `0600`, so it cannot overwrite an input or an existing report, including via a symlink.

An explicitly reviewed local metadata transition writes a new journal artifact:

```sh
node tools/evaluation/transition.mjs \
  --journal=/path/to/prior-journal.json \
  --assessment=/path/to/reviewed-assessment.json \
  --receipt=/path/to/explicit-review-receipt.json \
  --output=/path/to/new-journal.json
```

The receipt must contain `action`, `targetVersion`, `reviewReferenceDigest`, `occurredAt`, `reviewedAssessmentDigest` (null for rollback), and `reviewedJournalDigest`. Preserve the source artifacts and independently reviewed references. No CLI transition changes runtime thresholds or activates a model.

## Actual local evidence and open dependencies

The 19 Node tool-correctness groups passed, separately from the repository's Vitest totals. An independent read-only review also reran the first 18 groups. The CLI exercised the actual 72-leaf catalogue with 14 original synthetic metadata rows and correctly refused promotion (exit 2): synthetic source, tool-correctness purpose, and missing representative coverage. That is a gate correctness proof, not measured Italian accuracy, calibrated probability quality or a model promotion. The report is `/workspace/.lilleri-validation/evaluation-cli-report-final.json` for this cloud session.

E25 still needs an authorized representative corpus with actual double annotation/adjudication and reviewed provenance, a 200-row live audit workflow, real drift cohorts and operational scheduling. E11 still needs actual calibrator fitting/service integration and reviewed production thresholds. Real model artifacts, model shadow runs, native/UI automation modes and approved external inference remain outside this tooling change.

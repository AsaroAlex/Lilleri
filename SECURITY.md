# Security policy

This repository is a **synthetic local prototype**, not an authenticated financial service. Read [security architecture](docs/security/security-architecture.md), [threat model](docs/security/threat-model.md), [incident response](docs/security/incident-response.md) and [delivery evidence](docs/STATUS.md).

## Current boundary

The Fastify API requires explicit nonproduction `DEMO_MODE=1`, binds loopback and rejects unexpected hosts/browser origins. It uses a server-selected synthetic profile; profile-scoped queries/references and adversarial tests protect that prototype boundary. It has **no production login or authenticated membership authorization**. Local PGlite/PostgreSQL files may be plaintext and contain synthetic fixtures only. Do not expose the demo over a public/LAN host or load real financial records into it.

Implemented scenario tests do not establish production RLS, passkeys/MFA, TLS/KMS field encryption, WAF, secret-manager operation, backup/PITR recovery, GDPR rights completion, penetration testing or legal clearance. These are explicit real-data prerequisites in the security/compliance documents. The API's production rejection is intentional.

## Observed dependency and scan status

FACT, checked 2026-10-02: `pnpm audit --prod --json` returned exit 1, with one high and one moderate advisory in the Expo tooling dependency chain. The retained audit was read and installed import/call sites were inspected; see [final review](docs/reviews/final-review.md) for scope and evidence.

| Dependency finding | Current disposition |
| --- | --- |
| node-forge 1.4.0 via `expo > @expo/cli`, high [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | **Open.** RSA signature verification accepts extra nested DigestAlgorithm elements. The audit snapshot lists no patched release. Expo certificate/signing tooling contains actual certificate/public-key verification calls; end-to-end reachability and a sufficient mitigation have not been proved |
| uuid 7.0.3 via `expo > @expo/config-plugins > xcode`, moderate [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | **Open dependency finding.** The advisory affects caller buffers in v3/v5/v6 APIs; inspected xcode 3.0.1 calls v4 without a buffer. This narrows that observed use, not every transitive caller. Audit recommends >=11.1.1; a cross-major override has not been validated |

The inspected synthetic API does not import Expo tooling, but build/signing dependencies remain part of release security. Do not treat passing application tests as a cryptography or supply-chain assessment. No third-party cryptography fork or unverified dependency override was introduced. Production signing/release remains gated on a supported fix or independently validated mitigation for the exact path and a repeated audit. Patch availability may change after this snapshot.

Local gitleaks and trufflehog were unavailable. An evidence owner reported a limited redacted pattern check of 84 selected files with zero candidates; it did not scan all repository content or Git history. The configured CI secret-scan job has not been claimed as executed. Neither result proves that the repository is free of secrets. CI's dependency audit is advisory (`continue-on-error`) and does not clear the findings above.

## Reporting a vulnerability

A monitored security email and response SLA have **not been established**. The former placeholder email is not a reporting destination. If GitHub private vulnerability reporting is enabled for the repository, use it; otherwise use an existing private maintainer contact to arrange confidential disclosure. Do not publish secrets, personal financial records or exploitable confidential details in a public issue. Do not access another person's data or run destructive, denial-of-service or social-engineering tests.

## Contributor requirements

- Never commit credentials, production tokens/certificates, bank credentials, full PAN or real personal financial fixtures. Environment examples contain local demo values only; actual secrets require the approved future secret-management process.
- Keep demo bind/origin/host and production guards intact. A profile ID/header from a client is not authenticated authorization.
- Preserve exact-money/valid-date checks, bounded input/cursors and profile references. Test stale revisions, duplicate/reordered inputs, replay, partial failure and unauthorized identifiers where relevant.
- Logs/traces/analytics must exclude tokens/cookies, raw provider payloads, transaction descriptions, account identifiers, amounts and sensitive categories. Debug/error handling must not bypass these rules.
- External AI/OCR is not enabled by the mock. Any future integration needs a permitted purpose/basis, approved processor/endpoint/retention/transfer terms, minimal tenant-scoped data, actual permission where required and evaluation. Pseudonymisation is not anonymity.
- Follow the current retention/purpose schedule. Cold storage is not deletion; a live key deletion does not prove backup erasure. Real-data export/delete requires subject authorization, complete derivative/processor handling and tested restore-tombstone replay.
- Review lockfile/dependencies and secrets. CI config includes secret scanning and an advisory dependency audit; configured jobs are not executed findings, and an audit with `continue-on-error` is not a release security gate.

## Real-data release prerequisites

Before any real-bank pilot, implement and verify production identity/session/recovery and profile membership isolation, appropriate storage/transport/key/secret protections, privacy/retention/rights and backup/restore controls, response/logging safeguards and incident ownership. Resolve or independently validate mitigations for open dependency advisories in the actual release path and rerun the audit. Obtain the written acceptable licence route, provider permission/contract, processor/privacy/DPIA/taxonomy assessment and informed participant consent. Store billing/native-device release and household sharing require additional lifecycle/isolation checks. No document alone clears these gates.

This project is pre-release, with no supported production versions or published security SLA. Fixes follow the actively reviewed development branch; do not assume a production support guarantee from `main` or the current branch name.

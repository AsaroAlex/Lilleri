# Security policy

Lilleri handles extremely sensitive personal financial data. Security and privacy are designed in,
not added later. The full architecture is in `docs/security/`.

## Reporting a vulnerability

Please **do not open a public issue**. Write to **security@lilleri.app** (placeholder until the
domain is secured — see `docs/brand/naming-analysis.md`) or use GitHub's private vulnerability
reporting on this repository. Include steps to reproduce and the impact you observed. We aim to
acknowledge within 2 business days and to share a remediation plan within 10 business days.

Please do not access, modify or exfiltrate other people's data while testing, and do not run
denial-of-service or social-engineering tests.

## Ground rules for contributors

- Never commit secrets, tokens, certificates or real personal/bank data. Use `.env` (ignored) and
  the documented secret manager. `.env.example` contains names only.
- Never store bank credentials (all bank access goes through the licensed provider's redirect/SCA
  flow) and never store full card numbers (PAN).
- Every stored datum needs a documented reason and retention class
  (`docs/compliance/privacy-model.md`, `docs/compliance/data-retention.md`).
- Logs, traces and analytics must not contain transaction descriptions, IBANs, account numbers or
  exact amounts. Use semantic events.
- AI vendors receive the minimum payload needed (e.g. a cleaned description and amount sign), never
  names, IBANs, balances or full histories.
- Dependencies: prefer well-maintained packages; CI runs secret scanning and a dependency audit.

## Supported versions

Pre-release. Only the `main` branch receives fixes.

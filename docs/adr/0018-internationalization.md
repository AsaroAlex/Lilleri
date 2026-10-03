# ADR-0018: Internationalization

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Product and brand/copy owners; architecture decision owner; client implementation owners
- **Decision gate:** D for presentation contracts; translation does not approve a new market

## Context

FACT: the [brief](../BRIEF.md) requires Italian-first product copy, English repository documentation and future English, Spanish, French and German support. FACT: the current [money formatter](../../packages/money/src/format.ts) formats bigint through explicit locale rules without converting monetary values to Number. Its locale coverage is a formatter capability, not evidence of translated product screens. FACT: the [tone guide](../brand/tone-of-voice.md) distinguishes access consent, optional permissions, correction, uncertainty and whole-price periods. ASSUMPTION: stable message keys now will avoid costly string extraction later. UNKNOWN: launch dates and approved copy/legal/provider/support coverage outside Italy.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Stable typed Italian catalogue first | Complete messages and named placeholders, expansion when needed | Low initial cost; preserves meaning and future locale boundary | Requires disciplined keys/plurals and later tooling evaluation | [Brief](../BRIEF.md); [tone guide](../brand/tone-of-voice.md) |
| Hardcoded Italian, extract later | Direct strings in every component | Fastest first line of UI | Scattered copy, inconsistent financial wording and concatenation | [Design system](../design/design-system.md) message requirements |
| Full translation SaaS/framework from start | Many catalogues and workflow tooling | Mature editorial/plural support | Unneeded integration cost; speculative translations/market claims | [Stack research](../research/raw/tech-stack-options.md) |

Proposal: immediately ship five machine-translated languages. Critique: translated strings do not establish bank coverage, lawful notices or native understanding; consent/financial uncertainty can change meaning. Counterproposal: Italian messages with stable keys and parameter contracts now, pseudo-localisation for layout, native-reviewed catalogues as each market becomes eligible. Decision: choose staged internationalization rather than treating language availability as a market release.

## Decision

DECISION: user-visible Italian text uses stable semantic keys such as `connections.renew`, `review.saved` and `summary.unavailable`. Keys describe meaning rather than English/Italian sentence text. Store complete messages with named, typed placeholders and explicit plural variants; never assemble translated fragments around a number, merchant or action. Keep one authoritative Italian catalogue accessible to actual consumers; introduce a shared i18n package only when multiple consumers justify it. Use a mature plural/message formatter when language expansion requires it; do not build a general translation platform for the shell.

Maintain a product glossary: Movimenti, Collegamenti, In attesa, Da rivedere, Perché? and Annulla have stable meanings. API error/status/category keys remain machine identifiers; clients map them to catalogued presentation. User merchant/category names and original bank descriptions are data and are not silently translated or modified. Financial explanations derive from applied evidence with translated templates; localisation cannot turn a suggestion into fact or rename a source relationship.

Default product locale is `it-IT`. Store an explicit supported preference when implemented; unknown device locales fall back predictably to Italian. Follow the shared exact-money formatter, currency exponent and sign rules. For the Italian financial display use the approved symbol-before convention consistently, including non-breaking spacing and full significant digits; screen readers receive a meaningful accessible amount. Never pass bigint through Number or a generic interpolation number formatter. Unknown money is “Non disponibile”, distinct from zero. Locale changes separators and wording, not stored currency or arithmetic; conversion requires explicit FX evidence.

Implementation update, 2026-10-03: [local profile settings](../architecture/profile-settings-and-entitlements.md) persist the explicitly supported Italian locale and actual profile timezone with a revision guard and scoped audit/export. The UI offers timezone changes without an unsupported language picker. Node tests cover Rome summer time versus UTC; financial calendar dates and multi-currency facts remain unchanged. Message catalogues and the English UI remain outstanding, so this preference is not claimed as completion of E21.

Date-only booked/value fields remain calendar facts. Format them without shifting through UTC midnight. UTC instants use the user's/profile display timezone, with `Europe/Rome` the current default, and display actual freshness. Do not infer source timezone from locale. Machine-readable exports preserve exact integer/decimal and date contracts; local display separators do not become ambiguous canonical data.

Validate Italian singular/plural, zero, long names, large/negative amounts, JPY/KWD precision and DST boundaries. Pseudo-localised long strings reveal layout issues without claiming a translated language is shipped. Before expansion, native editors and legal/product reviewers approve uncertainty, privacy/provider notices, price/cancellation language and cultural tone. Keep critical permission/legal copy versioned; do not mix a translated screen with an unapproved notice through silent fallback. Brand remains Lilleri; the Tuscan tagline is adapted for comprehension rather than literally translated.

## Consequences

- Positive: messages can evolve without changing machine semantics; exact financial values stay consistent across locales and platforms.
- Accepted trade-offs: catalogues and parameter/plural contracts need maintenance; native/legal review costs remain when expanding.
- Easier: copy consistency, accessibility labels and long-string layout tests. Harder: locale fallback, critical notice versioning and preserving meaning in new markets.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Generic interpolation loses money precision | Medium | High | Format exact Money separately; large-value fixtures | Final digits change after language switch |
| Translation changes consent or estimate meaning | Medium | Critical | Complete messages, native/legal review and versioned notices | Permission appears compulsory or estimate factual |
| New language mistaken for market support | Medium | High | Separate language and provider/legal release evidence | Country advertised without cleared coverage/support |

## Revisit conditions

Reassess catalogue/tooling when a second approved language or multiple editing teams need it. Expand formatter/currency tables only with reviewed rules and exact-value tests. New provider date semantics, RTL requirements, critical-message fallback issues or native comprehension failures reopen affected contracts. No language launch bypasses the separate provider, privacy, support and commercial gates.

## References

- [ADR-0001 documentation language](0001-documentation-language-and-conventions.md); [ADR-0006 money/time](0006-money-and-time-representation.md).
- [Money formatter](../../packages/money/src/format.ts), repository implementation inspected 2026-10-02; platform-specific claims in historical comments are not fresh device evidence.
- [Tone of voice](../brand/tone-of-voice.md); [design system](../design/design-system.md); [visual gate](../design/visual-quality-gate.md), specifications dated 2026-10-02.
- [Privacy model](../compliance/privacy-model.md); [provider capability matrix](../research/provider-capability-matrix.md).

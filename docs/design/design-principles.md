# Design principles

**Status:** DECISION for the design specification; implementation and user validation remain separate. **Date:** 2026-10-02. Documentation is English; customer copy is Italian. Sources: [brief](../BRIEF.md), [vision](../product/vision.md), [jobs](../product/jobs-to-be-done.md), [MVP](../product/mvp.md), [consent model](../compliance/consent-model.md), [brand strategy](../brand/brand-strategy.md). This document defines Gate F; it does not claim that the gate has passed a user study.

## One glance → one insight → one action

The home screen answers one immediate question, explains one useful thing and offers one next step. The default question is “Come va questo mese?” (How is this month going?). A readable month total sits above a short explanation; a review or reconnect action takes priority when the underlying data needs attention. Home is not a terminal, a collection of charts or a menu of product features.

| Principle | Concrete design decision | Reject when | Verification |
|---|---|---|---|
| Trust before delight | Show the connected sources, period and last successful update behind every aggregate. A mismatch or stale account changes the headline qualifier before any animation. | A confident total hides missing accounts, pending amounts or stale data. | Ask a participant what is included and when it was updated; compare their answer to the fixture. |
| Zero setup is a complete path | Welcome → account → named-provider explanation → provider consent/bank authentication → real sync → useful month picture. No category, budget, chart or card setup precedes value. | The user must configure the app before understanding their money. | Complete the path with only required inputs and default categories. |
| Infer first, ask second | Inbox cards propose an answer and a brief reason: “Potrebbe essere un trasferimento al tuo Revolut.” | A user must inspect every row or answer an unqualified “Che cos’è?”. | An unambiguous fixture produces no review item; an ambiguous fixture shows a proposal. |
| Precision before automation | An uncertain suggestion stays a suggestion. The visible status follows the actual classification/reconciliation decision. | Copy says “Sistemato” while a hypothesis was merely generated. | Check presentation against evidence/status, not just a confidence score. |
| One useful action | One filled primary button per task; the rest are quiet links or a labelled action menu. | Multiple equal CTAs compete for attention, or every tile demands a tap. | Five-second test: participant identifies the main action without instruction. |
| Complexity stays in the system | Show “Perché?” and the original bank description on demand. Technical IDs, model tiers, HTTP codes and thresholds stay out of the flow. | Debugging or cache clearing becomes the user's recovery task. | Every error describes cause, consequence and available next step in Italian. |
| User rules win | Distinguish “Regola scelta da te” from “Suggerimento di Lilleri”; rules are editable and reversible. | Automated changes silently override an explicit rule. | Conflict fixture: rule remains effective and its provenance is shown. |
| Never guilt the user | Describe the change and its period: “Spesa alimentare: € 42 in più rispetto a settembre.” | Copy says irresponsible, failed, overspent, good/bad person, “finally” or “again”. | Copy review against [tone of voice](../brand/tone-of-voice.md). |
| Reversibility is part of the action | After a correction show “Categoria aggiornata · Annulla”; detail retains a change history. Larger changes preview affected rows. | A swipe destroys source records, or undo exists only in a vanishing toast. | Undo after navigating away; compare totals and categories with the previous state. |
| Honesty during degradation | “Ultimo aggiornamento 09:42” and a source-specific explanation replace an apparently live state. | A failed sync looks successful, a spinner has no exit, or a fallback replaces a real balance with a fabricated zero. | Offline, partial-sync, expired-consent and mismatch fixtures. |

## Hierarchy and calm

- Use whitespace and typography before borders. A page has one large number or headline, one short explanation, then supporting rows. Cards group meaning; they are not required around every row.
- The main viewport has at most one insight card, one review summary and a brief upcoming-payment preview. Accounts, the full breakdown and the full timeline open from labelled links.
- Use a 4 pt spacing system with 8 pt rhythm. The default mobile gutter is 24 pt; 16 pt on compact screens. White space grows on a tablet, while text width remains readable.
- Keep information within a tab → detail → sheet structure. A fourth nested surface is a cue to simplify the task. Preserve filters, period and scroll position on return.
- Useful microinteractions confirm change, reveal its reason or preserve context. They do not award points, animate every number or celebrate spending.

“Fintech premium calm” means readable financial detail, predictable controls, warm materials and the absence of pressure. It does not mean tiny text, low contrast, decorative shadows or a sparse screen that omits important status.

## Explainable and reversible intelligence

“Perché?” opens a sheet with: **what** was proposed/applied; **why** in one sentence; **evidence** (source movement(s), dates and matched amount); **effect** on spend/income; **control** (“Modifica” or “Annulla abbinamento”). The explanation comes from structured decision evidence. A language model must not invent a plausible explanation after the event.

Confidence is expressed as a state (“Da confermare”, “Riconosciuto”, “Scelta da te”), not an uncalibrated percentage. Estimates show “Stima” immediately beside the amount, with their formula and excluded data available. Never present safe-to-spend as a guarantee: “Stima fino al 31 ottobre” (Estimate until 31 October) and “Come lo calcoliamo” are mandatory. If the inputs are incomplete, replace the number with the reason and a recovery action.

Correction and learning are separate choices. “Salva” fixes the selected movement. “Sì, sempre” creates a merchant rule only after its scope is visible. Declining the rule still saves the correction. A transfer pair appears once, with both accounts and an undo; the user can see why it did not count as spending.

## Accessibility is a release condition

**DECISION:** WCAG 2.1 AA is the minimum, with WCAG 2.2 target-size and focus-obscuring checks added as good practice. Mobile uses native accessibility semantics and the same intent. Do not label this specification as an accessibility certification.

| Commitment | Requirement |
|---|---|
| Contrast | Body text ≥ 4.5:1; large text ≥ 3:1; meaningful controls, focus indicators and chart marks ≥ 3:1 against adjacent colours. Verify actual pairings in both themes; a palette alone is insufficient. |
| Text | UI body 16 pt default. Support OS Dynamic Type/font scaling to 200% without clipping amounts or actions; reflow at 320 CSS px on web. Captions carry supporting detail, never the only explanation. |
| Targets | Every actionable area ≥ 44 × 44 pt; Android expands hit areas to ≥ 48 dp where practical. Adjacent actions remain distinct. A 24 px icon is inside the target, not the target itself. |
| VoiceOver/TalkBack | Each row announces merchant, date, amount/currency, status, category and available actions. Group related content; avoid repeating decorative logos and currency glyphs. Tab labels and selected state are explicit. |
| Alternative actions | Every swipe/drag action also exists in a labelled menu. Split editing works without dragging; charts have a text summary/table. Biometric authentication has an accessible OS-supported fallback. |
| Focus | Web supports keyboard navigation and visible focus. Sheets move focus to their heading, trap only while modal, and return focus to the launcher. Errors point to the affected input. Sticky CTAs never cover focused content. |
| Colour | Expense/income and warning/success use words, signs, icons or shapes as well as colour. No red/green-only charts or balance meanings. |
| Motion | Respect OS reduced motion. Replace travel, scaling and count-up with immediate state change or a short fade; retain the status text and undo. No flashing, endless shimmer or motion-required information. |
| Announcements | Announce completed sync, saved corrections and errors once. Do not announce every skeleton update, every imported transaction or every balance tick. |

## A screen without the logo must still be Lilleri

The chosen visual foundation is B **li + dot**, with T3 **Carta & Vinaccia** (warm paper and wine). The repeated signature is a restrained **paired-line and dot**: two source rows resolve to one aligned result; a small dot marks the resolved state. It expresses bringing records into order. It is not a coin, a payment badge or an AI assistant persona.

The recognition test uses four concrete signals together: warm paper background; wine primary action; Geist type with aligned tabular amounts; paired lines/dot used only at connection, reconciliation or review completion. Newsreader is an editorial accent for a rare heading in marketing/first welcome, never for amounts, input, tables or error text. The UI can look recognisable without repeating the mark on every card.

**HYPOTHESIS:** in a blind five-screen exercise, participants should group Lilleri screens together and describe them as clear/calm rather than banking/crypto/gaming. Test both themes, grayscale and a non-Italian layout with long strings. Failure requires revising hierarchy or the signature device, not adding more logos.

## Validation and open questions

Use five moderated prototype tasks before Gate F: connect a source; identify the month total and its freshness; correct one merchant and decline a rule; explain a paired transfer; renew an expired connection and export data. Include P1 Giulia and P4 Paola, a screen-reader user and large-text use. This is a proposed study, not completed research.

OPEN QUESTIONS: whether “Inbox” or “Da rivedere” is most understandable in navigation; whether the headline should prioritise month spending or available balance by context; whether a first-sync report calms or overwhelms; whether the mark remains distinctive in independent competitor testing. Resolve with prototype observation and the [visual gate](visual-quality-gate.md), not opinion alone.

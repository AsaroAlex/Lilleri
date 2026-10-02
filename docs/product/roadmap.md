# Lilleri roadmap — phases 0–8 and evidence-based release decisions

**Document / review date:** 2026-10-02. Documentation is English; public copy is Italian. Relative effort and all team/budget/metric values are ASSUMPTIONS or HYPOTHESES, not elapsed work or delivery promises. Source claims below are carried research with their original verification limits.

## Delivery and evidence boundary (review decision, 2026-10-02)

This is a requirements document, not a list of delivered features. Local work uses synthetic fixtures and a mock provider. Official sandbox work needs provider-issued non-production access. Any real-data pilot needs a written acceptable licence route, provider permission/contract, DPIA/privacy controls, security isolation and informed participant consent before access. Bank credentials are never collected by Lilleri. Mock or sandbox success does not verify Italian production coverage, user demand, retention, classification calibration, store approval or legal clearance.

The full P0 list describes a future cleared beta, not the initial repository scaffold. Implement a small synthetic vertical slice first: exact money → mock ingest → idempotency → deterministic reconciliation/classification with explicit rules → evidence/review/undo → honest synthetic summary. Record actual commands/results in repository status; do not claim every planned fixture or UI flow is already implemented.

Canonical commercial policy: **Lilleri Gratis / Lilleri Plus** at launch; Plus **€4.99/month / €39.99/year is a hypothesis**. **Lilleri Famiglia Later** after consent/sharing/isolation tests; **Pro reserved** for future professional workflows. Closed beta is free. A proposed **30-day non-renewing Plus preview** requires implemented entitlements; it never charges. Store billing, real purchases and renewal metrics are P1 and require explicit checkout and release gates. Correctness, corrections/learning/rules, privacy/security/consent safety, retained-data access, export and deletion stay free in every plan and after downgrade.

Evidence dates/FACT labels below are inherited from source research, including its snippets and uncertainty; this review does not freshly verify vendor terms or law. Numerical success criteria are HYPOTHESES. Fixture correctness cannot establish production precision. Report audited error numerator/denominator, sample selection, decision type, bank/period, label agreement and confidence intervals; audit and user corrections must not double-count errors. A zero-error small sample is not proof of zero error. All A–G letters refer to the brief: A market, B data feasibility, C business, D architecture, E security, F core-loop UX, G brand. Beta/public-launch/expansion releases are separate decisions.


## 0. Planning decision

The authorized implementation path starts with a **local synthetic vertical slice**, then the selected provider's official sandbox. Real-bank access, production billing and public launch need external and technical gates; writing requirements cannot clear them. Avoid a first delivery that requires all future P0 modules, calibrated AI, both mobile stores, multiple live adapters and a legal opinion at once.

**Proposal:** original roadmap moved straight to founders’ restricted-production accounts and treated research Gate A/B/C summaries plus later monetisation as pass evidence.

**Critique (CTO/PM/investor):** actual account coverage, costs, legal route, field quality and user behaviour remain unverified. Gate letters D–G conflicted with the founder's brief. Five-person hiring and monetised beta assumptions exceeded the initial small-team capability. The model included unshipped consumer Pro/Famiglia and offers.

**Counterproposal:** restore the brief's gate meanings; distinguish local/mock delivery, sandbox, cleared pilot, free beta, explicit purchase experiment, public launch and later expansion. Deliver useful small increments and replace assumptions with evidence. Gratis/Plus and zero offer income anchor launch economics.

**DECISION:** phases remain 0–8, with no calendar dates or claimed person-months already spent. Research is a documented synthesis under review, not completed commercial/legal validation. Gate C is conditional/economically unvalidated; Base Plus-only marginal GP is negative and Target does not fund Base stage budgets.

## 1. Relative effort and team constraints

| Size | Relative scope | Example |
|---|---|---|
| S | Small bounded increment | Correct a fixture/parser, an honest failure state, one deterministic invariant |
| M | Several integrated increments | One canonical provider contract suite, review/evidence slice, export path |
| L | Substantial cross-component work | Authentication/isolation, live-provider consent/refresh, mobile core loop |
| XL | Large programme split into smaller releases | Cleared beta hardening, household sharing, one-country expansion |

Assume 2–4 contributors covering engineering/product/design; legal/privacy/security specialists are separate dependencies. Parallelism cannot shorten vendor/counsel lead time or empirical retention windows. Hiring, sponsorship and services require a funded plan, not a stage threshold. Fixed €8/15/30k at 1k, €20/40/70k at 10k, €70/120/200k at 100k and €300/500/900k at 1M MAU are scenario envelopes, not approved spend or an implied required team. Never double-count AIS minimum, cloud capacity, support labour or CAC.

## 2. Phase overview

| Phase | Goal / deliverable | Dependency | Main risk | Exit evidence | Relative effort |
|---|---|---|---|---|---|
| 0 Research | Traceable market/provider/legal/brand/business synthesis with uncertainty | Research sources and original brief | Snippet claims mistaken for coverage/contracts or paid demand | Sources/unknowns reviewed; Gate A/B/C evidence gaps assigned; local mock work may proceed | L, synthesis exists; validation open |
| 1 Brand & Prototype | Original identity/tokens, honest synthetic core-loop prototype, price/value comprehension research | Phase0 candidate strategy | Looks like bank/crypto or promises universal automation | Gate F conceptual UX and Gate G brand review, with actual tests claimed only when run; legal/trademark clearance remains separate | L |
| 2 Technical foundation | Repo/tooling, safe exact-money domain, provider-agnostic port, synthetic datasets, deterministic vertical slice, relevant tests/CI | Reviewed technical decisions | Overengineering/security controls documented but absent | Actual install/lint/format/typecheck/test/build evidence; Gate D architecture; security threat baseline and mock isolation tests feed E | L; small increments |
| 3 Open Banking MVP | Official sandbox adapter and later cleared real-data pilot; sync/identity/lifecycle/reporting plus import fallback | Non-production access for sandbox; written licence route/provider contract/DPIA/security/consent before real data | Mock success falsely sold as live coverage; ambiguous identities | Contract/error/paging/expiry checks in sandbox; real coverage/field/churn evidence only after pilot gates; no source names implied supported by fixture labels | XL |
| 4 AI automation | Rules/merchant deterministic learning first; representative labels and calibration; optional later model cascade; recurring/estimated insights | Deterministic correctness and lawful minimised evaluation data | Hidden errors or unjustified LLM/API use | Audited error/rate/abstention by decision type with confidence intervals, versioned evidence and undo; no model promotion from synthetic accuracy alone | L/XL |
| 5 Closed Beta | Free opt-in pilot ≤50 then ≤200, expand only after correctness/support evidence; actual usable trust loop | Real-data legal/provider/privacy/security clearance and documented supported types | Unsupported accounts, work burden, biased metrics | Retention/correctness/support/UX cohorts; Gate F revalidation, no paid conversion until explicit eligible purchase experiment | XL |
| 6 Italian launch | Reviewed supported-source product, stores, support/incident/export/delete, optional purchase only after billing gates | All applicable A–G evidence plus public-release criteria | Unfunded Gratis subsidy and store/reliability gaps | Written launch release decision with actual legal/provider/security/store/UX/correctness and funded cash evidence | L/XL |
| 7 Monetisation optimisation | Actual Plus renewals/contribution, free-envelope review, price experiments; Famiglia/offer concepts separately gated | Delivered paid benefits and eligible mature cohorts | Revenue harms trust; household liability | Gate C re-evaluated from collected revenue/invoices; expansion decision separate; sharing and offers require their own gates | XL |
| 8 European expansion | One country at a time: coverage, legal route, local semantics/copy/support/prices | Sustainable funded operating path and country evidence | Italian assumptions transplanted to different market | Per-market A–G review and release decision; no validated Italy-only300k ceiling or1M demand assumed | XL per market |

## 3. Canonical decision gates A–G (per brief)

| Gate | Question | Required evidence | Current assessment / next evidence | Owner |
|---|---|---|---|---|
| A Market | Is an actionable market opportunity established? | Recurring user problem, differentiation against bank apps, reachable demand and actual WTP evidence | **NOT YET ASSESSABLE commercially**; research supports hypotheses, incumbent-depth/user tests needed | Product + growth |
| B Data feasibility | Is Italian source coverage technically/legal feasible? | Contracted institution/account-type matrix, licence route, consent/quota/history/field/pending/id-quality evidence | **Real-data production blocked** pending provider/counsel/contract/pilot evidence; local mock feasible | CTO + fintech + counsel |
| C Business | Is a potentially sustainable funded model evidenced? | Written billing units/costs, actual paid retention/subsidy, full contribution and cash path; `revenue-scenarios.md` C1–C6 | **Conditional/unvalidated**; Plus-only offers€0, Base negative; shadow beta economics insufficient | CFO + product |
| D Architecture | Is the architecture approved for the current stage? | Stack/domain/provider/AI/deployment/auth/monetisation/design decisions, threat-aware isolation/money/identity choice and scoped implementation | Review ADRs and actual local slice; production approval not implied by boilerplate | CTO + architect |
| E Security | Is the security baseline implemented and tested? | Auth/tenant boundaries, secrets/access, encryption/retention/export/delete, audit/restore/incident process appropriate to stage | Local tests feed baseline; real-data security review and required pen-test/restore evidence must precede applicable releases | Security + privacy |
| F Core-loop UX | Is CONNECT→SYNC→UNDERSTAND→CORRECT→LEARN→AUTOMATE conceptually validated? | Honest supported-source consent, freshness, understandable picture, necessary correction, evidence/undo and failure/exit usability | Prototype/design review can support conceptual validation; actual usability/accessibility evidence only when run | PM + UX |
| G Brand | Is identity distinctive, coherent and usable? | Originality, recognition without logo,16–1024px/mono marks, financial typography, light/dark accessibility, naming/message/capability consistency | Asset/docs review and practical rendering tests; recall/trademark/domain clearance not inferred | Brand + UX |

A gate is an internal decision with evidence and limits, never substitute for legal/provider permission. Provider-specific **RFP-G1–G4** references are contractual due-diligence questions, not the brief's Gate G. Guardrail IDsG1–G18 in metrics are metric rows, not decision gates.

## 4. Implementation milestones and release reviews

| Milestone | Concrete output | Exit / restriction |
|---|---|---|
| Local slice | Exact-money tests, mock provider, validation/idempotent ingest, conservative transfer/card/pending/duplicate logic as implemented, deterministic classification/rules, evidence/review/undo and synthetic summary | Actual commands/fixtures pass; label demo synthetic; do not claim auth/mobile/provider/billing feature before it exists |
| Official sandbox | Same canonical port, consent/expiry/paging/status/error contract suite; documented unknown fields/account types | Provider-issued sandbox access; no coverage or production reliability claim |
| Cleared real-data pilot | Permission/contract, written route, DPIA, approved processors/taxonomy, secret/isolation/retention/security review, informed participants, human support | After gates, start ≤50; real labels/evidence minimised; no bank credentials; pending/fill/id-stability/renewal measured |
| Free beta | Future P0 accepted, honest failure states, privacy/export/delete/restore, audit design, consent/support instrumentation | Expand ≤200 only after evidence; no charge, no collected paid conversion or€0.95-per-paid pass |
| Purchase experiment | Pure entitlement layer already tested; non-renewing preview optional; explicit separate checkout, validated receipts/webhooks, restore/grace/expiry/cancel/refund/renewal and tax/store/counsel controls | Only eligible priced cohorts; earned net contribution with refunds/support/preview costs and maturity denominators |
| Public launch | Supported bank/type list; correctness/audit evidence; legal/provider/store/security/privacy/accessibility/support and funded business release checklist (`mvp.md` §6) | No hypothetical price/coverage/accuracy represented as delivered or measured; hold/narrow scope on missing evidence |
| Expansion review | Mature Plus renewals, actual invoices/cost/retention/runway, market support and country-specific A–G evidence | Separate from Gate G brand; no assumed offer revenue, mandatory second adapter or automatic next-country launch |

## 5. Capability sequencing and hard boundaries

Core correctness and safety are free and implemented before monetised breadth/planning. Keep classification deterministic until field labels show where a model adds value. Optional third-party AI requires approved purpose/endpoint/DPA/permission/minimisation and evaluation; pseudonymisation does not remove personal-data duties. Advanced chat/OCR/email/API and household remain Later; “Plus” does not make unbuilt features exist.

CSV parsing starts with tested formats/generic safe import. Do not advertise XLSX/PDF/OFX/QIF before implemented security/locale/dedup checks. Retained data remains accessible/correctable/exportable after source refresh pauses. Safe-to-spend/forecast values show formula, freshness, assumptions and missing-source limits; no advice or money movement.

Famiglia requires invitations, own-member bank consent, private-by-default visibility, account/tag permissions, revoke/leave, own export/delete and adversarial per-person isolation; no five-seat price promise. Offers require distinct licence/purpose/contract/product/privacy/trust approval; voluntary opt-in cannot authorise a prohibited AIS data use. No commercial account targeting is assumed. Pro is reserved for future professional research, not an automatic consumer depth tier.

## 6. Re-planning triggers (DECISIONS; targets are hypotheses)

| Signal | Action |
|---|---|
| Provider fees/billing/coverage worse than scenario | Re-run Plus-only joint sensitivity and F/F′ scope; do not silently degrade existing commitments |
| Counsel/provider route denied or unclear | Keep mock/sandbox within permission; evaluate legally acceptable route before real-data access |
| Wrong structural matches/silent drops/overwrites | Stop auto-application for affected type, preserve evidence, route review/undo and repair; growth pauses |
| Repeated correction despite exact explicit-rule context | Investigate precedence/identity/context regression before adding AI |
| Hidden-error interval misses accuracy tolerance or sample too small | Continue representative audit; no pass claim based on zero synthetic errors |
| Free AIS/active paid subscription>€0.95 two measured months | Review funded new-cohort time-boxed F′ with up-front limits; all-free beta uses shadow absolute costs only |
| Contribution-LTV/payback fails | No acquisition scale; investigate value/coverage/price, collect cohort evidence; do not rely on offer income to clear launch |
| Founder workload/support cannot sustain promises | Reduce optional scope, sequence work, fund service safety; no forced hiring assumption |
| Provider outage/shutdown | Honest freshness/fallback; switching needs verified second adapter, contract and re-consent, never automatic coverage guarantee |
| Distinctiveness or usability fails | Revise asset/copy/flow and rerun relevant checks; no paid font/trademark clearance inferred |

## 7. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| R-1 | Preserve phases 0–8 with local mock first; exact delivery claims belong to status and actual checks |
| R-2 | Restore brief A–G; beta/launch/expansion are separate release decisions |
| R-3 | Real-data access only after legal/provider/contract/DPIA/security/consent gates; no pre-contract pilot assumed |
| R-4 | Future beta P0 is staged, not the initial small-team scaffold; deterministic core before external models |
| R-5 | Gratis / Plus launch; Famiglia Later, Pro reserved; price hypotheses and zero offers launch economics |
| R-6 | Free beta cannot prove paid conversion or subsidy-per-paid threshold; purchase/renewal evidence requires mature billing cohorts |
| R-7 | Funding and hiring follow cash path/invoices; no seed estimate or fixed Italy MAU ceiling treated as fact |
| R-8 | Capture canonical plan/capability mapping in monetisation ADR before purchase UI; separate billing integration from pure entitlements |

## 8. Open questions

Provider/counsel turnaround and accepted route; actual bank/account-type quality and dormant charges; observed Italian demand/WTP/retention; smallest adequate audit strata/sample; core-loop user comprehension; runtime/mobile/store choices as actually implemented; affordable free sync and future household seat cost; cash runway and per-country expansion conditions. Owners/gates above identify how each unknown is resolved. No outreach, spend or approval is performed by this roadmap.

## Review log

| Reviewer | Concrete finding | Resolution |
|---|---|---|
| PM (blocker) | Gate D/E/F/G redefined as legal/correctness/beta/expansion against original brief | Restored architecture/security/UX/brand; separate release reviews |
| Fintech/security (blocker) | Restricted production assumed founders’ real data allowed before contract | Mock and official sandbox first; cleared pilot only after external/privacy/security gates |
| CTO (major) | Walking skeleton required almost all future P0, model calibration and five hires | Small deterministic synthetic slice; broad P0 future beta; relative resource estimates only |
| CFO/investor (major) | Roadmap monetisation inherited unavailable Pro/Famiglia/offer revenue and ~240k break-even | Canonical Gratis/Plus, zero launch offers, commercial gate unvalidated; no unfunded hiring/seed claim |
| Data (major) | Research “done”,25-fixture green and beta implied gates passed | Document existence distinguished from actual validation; CI/audits/real cohorts have separate evidence |

## Sources

All carried-over claims verified on 2026-10-02 by the input documents; IDs resolve in their Sources sections.

### Input documents (this repository)

| Document | Used for |
|---|---|
| `docs/research/market-analysis.md` | Gate A verdict and conditions (§9); decisions 1–10; Q1 incumbent depth |
| `docs/research/open-banking-providers.md` | §1 PSD2 parameters; §2 licensing routes; §5.5 D1–D9 and RFP gates G1–G4; §6 Gate B |
| `docs/research/data-sources-feasibility.md` | MVP source set (A, C, H, I, D-lite); never list; policy plumbing |
| `docs/research/opportunity-map.md` | §2 feature areas; §3 differentiator ranking; §4 what not to build; §5 decisions |
| `docs/research/user-pain-points.md` | §0 failure modes; D1–D13 |
| `docs/product/personas.md` | PD-1…PD-8 (validation plan, household rules, data-model room for P5) |
| `docs/product/jobs-to-be-done.md` | Loop and invariants; WOW/TRUST definitions; J-1…J-9 |
| `docs/compliance/regulatory-landscape.md` | §2 master table; §4 constraints register; §5 calendar; D1–D10; R1–R2 |
| `docs/compliance/consent-model.md` | §4 consent records; §5 renewal timeline (day 150/170/178/180) |
| `docs/compliance/privacy-model.md` | Analytics rules; AI vendor requirements; DPIA scope |
| `docs/business/business-model.md` | D-BM-1…D-BM-7; §7 second rails |
| `docs/business/unit-economics.md` | U-inputs; D-UE-1…4; R-UE-2 (finance model package) |
| `docs/business/revenue-scenarios.md` | §4 fixed costs and team by stage; §6 Gate C C1–C6; D-RS-1…4 |
| `docs/business/go-to-market.md` | §4 waitlist/beta/open beta exit criteria; §5 sequencing; §6 CAC rules; D-GTM-1…6; Q6 first market |
| `docs/brand/brand-strategy.md` | D1–D11; §13 brand measures; plan naming (D7) |
| `docs/brand/messaging-framework.md` | Inbox name candidates; glossary |
| `docs/research/raw/ai-ml-transaction-intelligence.md` | §6.1 eval set; §7 pipeline and cost; §5 provider posture |
| `docs/research/raw/reconciliation-and-data-model-patterns.md` | §4.2–4.4 models and state machines; §9.1 identity; §9.2 match types; §9.3 fixtures |
| `docs/product/metrics.md` | Gate thresholds; measurement plan by phase |
| `docs/product/pre-mortem.md` | Failure modes F01–F23 referenced per phase |

### Key external sources carried over

| ID | Source | URL | Date | Reliability | Used for |
|---|---|---|---|---|---|
| A-#11 | Banca d'Italia FAQ Istituti di pagamento (90-day decision term; agents) | https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/faq-istituti-pagamento/index.html | 2026-10-02 (snippet) | high | Route C timing |
| B-#1 | Fabrick Pass (AISP as a service, Banca d'Italia PI) | https://www.fabrick.com/it/fabrick-pass-servizi-as-a-service | 2026-10-02 | high (self) | Fallback route |
| B-#12 | Enable Banking Italy market page; restricted production (FAQ) | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/docs/faq/ | 2026-10-02 (snippet/mirror) | high | Pilot instrument |
| A-#172 | Bank of Lithuania register: Yapily Connect UAB | https://www.lb.lt/en/sfi-financial-market-participants/yapily-connect-uab | 2026-10-02 | high | Primary provider licence evidence |
| A-#152 / A-#153 | OEIL 2023/0209(COD); Clearingpost on the 14 Dec 2026 indicative plenary | https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023%2F0209%28COD%29 ; https://clearingpost.com/insights/legislative-observatory-lists-december-14-indicative-plenary-date-for-psd3-and-p/ | 2026-10-02 | high / medium | PSR watch |
| EU-1 / EU-2 | Delegated Reg. 2018/389 + EBA Q&A 2019_4631; Delegated Reg. 2022/2360 | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 ; https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj/eng | 2018–2023 | high | Sync and consent parameters |
| A-#195 | Yapily data restrictions (Intesa 429, two-week window) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | live | high | Per-bank sync parameters |
| RL S-32 | Apple App Review Guidelines (3.2.1(viii), 5.1.1(v), 5.1.2(i)) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 (first-hand) | high | Store readiness |
| AP-1 / GP-1 | Apple EU terms (1 Oct 2026); Android Developers blog on Play fees (Jun 2026) | https://developer.apple.com/support/apps-in-the-eu/ ; https://android-developers.googleblog.com/2026/06/play-expanded-billing.html | 2026 | high / medium-high | Billing scaffolding |
| NEW-1 (regulatory) | Google Play policy announcement 15 Jul 2026 | https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026-07-15 | medium (snippet) | AI permission step |
| NEW-4 (market) | CRIF 57.4 % connection success, H1 2025 | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ | 2025-10 | medium | Connection targets |
| NEW-7 (market) | Intesa Sanpaolo newsroom: XME Banks | https://group.intesasanpaolo.com/it/newsroom/comunicati-stampa/2020/02/intesa-sanpaolo-presenta-xme-banks-per-la-gestione-di-conti-corr | 2020-02 | medium-high (snippet) | Incumbent depth check |
| WS-01 | Hype support: Radar | https://support.hype.it/privati/articles/radar-come-monitorare-entrate-uscite-e-piani-risparmio-dei-tuoi-conti | n/d | high (snippet) | Incumbent depth check |
| W-1 | RevenueCat State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps | 2026-10-02 | medium | Trial design |
| US-W3 | Plaid customer story on YNAB | https://plaid.com/en-gb/customer-stories/ynab/ | 2025 | high (vendor) | Provider quality → conversion |
| PP-G-01 | Actual Budget #1628 | https://github.com/actualbudget/actual/issues/1628 | 2023-09-01 | high | Why pairing is Phase 3 core |
| PP-AD-01 | Actual Budget docs: GoCardless closed to new accounts | https://raw.githubusercontent.com/actualbudget/actual/master/packages/docs/docs/advanced/bank-sync/gocardless.md | 2026-10-02 | high | Provider risk |
| A-#180 / A-#64 | CNBC on Visa layoffs (Tink parent); Finextra on TrueLayer layoffs | https://www.cnbc.com/2026/07/28/visa-is-cutting-7percent-of-employees-in-efficiency-push-as-ai-reshapes-work.html ; https://www.finextra.com/newsarticle/45072/truelayer-lays-off-25-of-staff-in-a-single-day | 2026 / 2025 | high | Provider risk |

End of document.

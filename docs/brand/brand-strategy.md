# Lilleri brand strategy

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe).
**Document type:** brand strategy (purpose, positioning, personality, benefit territory, architecture, guardrails, international scalability).
**Verification date for every claim:** 2026-10-02.
**Inputs:** `docs/research/raw/user-pain-points.md`, `competitors-italy-and-ai-first.md`, `competitors-eu-uk.md`, `competitors-us.md`, `brand-competitor-analysis.md` (raw) and the synthesised `docs/research/brand-competitor-analysis.md`, `docs/brand/naming-analysis.md`, `docs/research/raw/typography-options.md`.

**Labels.** FACT = verified against a cited source on 2026-10-02 (research facts are cited by their source IDs in the input documents). ASSUMPTION = plausible, unverified. HYPOTHESIS = to be tested with users or data. DECISION = a choice made here (brand decisions do not need an ADR unless they constrain architecture; the ones that do are flagged). OPEN QUESTION / UNKNOWN = not established. Product capabilities that do not yet exist are labelled **commitment** and must not be presented to users as facts until shipped.

**Consolidation — DECISION, 2026-10-02:** Direction B li monogram / T3 Carta & Vinaccia / Geist UI, Newsreader editorial. `brand-identity.md` and `brand-jury.md` now govern visual implementation. Gate G is conceptually satisfied for implementation; designer finalisation, legal clearance and user/device validation remain open. No recruited consumer panel or timed recognition test occurred.

**Launch scope — DECISION:** Gratis / Plus only; Famiglia is Later until consent-aware sharing exists; Pro reserved for possible professional workflows. Current Plus planning hypothesis is €4.99/month or €39.99/year, not a live offer. See `brand-architecture.md` and current business review for entitlements/economics. Correctness/privacy do not become a paid accuracy tier. Possible optional labelled partner offers later mean an absolute “no advertising ever” promise is inappropriate; draft policy is “Niente banner. Non vendiamo i tuoi dati.”

**Truthful promise:** “Collega i tuoi conti. Lilleri mette in ordine i movimenti e ti chiede quando serve.” (“Connect your accounts. Lilleri organises transactions and asks when needed.”) “Once” describes low setup effort, not perpetual access: bank/provider authentication and consent may need renewal at the actual provider expiry. The current demo uses synthetic data and does not connect real banks; public copy must disclose this rather than borrow the future licensed-provider promise.

---

## 1. What the research tells the brand (one page)

| Finding | Why it matters for the brand | Status / source |
|---|---|---|
| The same five failure modes dominate every market: connections break, duplicates appear, categorisation "never learns", transfers and card settlements distort spend, transactions go missing. Best-rated US apps still ship "clear the cache" as the fix | The brand's core proof is *correctness that takes care of itself*; the enemy is not "banks", it is the mess | FACT, `user-pain-points.md` §0.1–0.2, §A #1–6; `competitors-us.md` §4.1 |
| Trust is won by boring things (read-only via a named aggregator, bank-side SCA, no data selling, export, deletion) and lost by billing surprises, unauthorised actions, shutdowns that strand users, opaque "sync offline" states | Trust surfaces are brand surfaces; the voice must be candid about failures | FACT, `user-pain-points.md` §0.5, §E |
| App-store ratings (4.5–4.9) and Trustpilot/BBB scores (2.0–3.5) diverge for the same products; the gap is billing and support, not features | "Revenue must never destroy trust" has a measurable brand KPI: the rating gap | FACT, `competitors-us.md` §4.5 |
| In Italy, "see all your accounts in one place" is table stakes: Intesa XME Banks and Hype Next/Premium already advertise cross-bank aggregation | Lilleri cannot position on aggregation; it positions on what happens *after* aggregation (reconciliation, personal categorisation, the inbox) | FACT (medium), `competitors-italy-and-ai-first.md` §3.10, V-09, W-01 |
| Italian users meet money apps through referral codes and creator videos; they want the *output* of AI (a clean monthly picture) with minimal effort and are nervous about data (PSD2 read-only reassurance "my bank confirmed it") | Zero-setup is the hook; "read-only, named licensed provider, in Italian" is a brand line, not a footnote | FACT (low-medium), `competitors-italy-and-ai-first.md` §7 |
| Forced migrations (Postepay app → Poste app Oct 2025; Hype merged into Banca Sella Apr 2026), closures (Oval Money, Yolt, Moneyhub, Spiir) and the Sep 2026 Revolut data-disclosure incident keep "will this app disappear / who sees my data" alive | Durability and data custody are brand promises; export and deletion are features to *show*, not hide | FACT (medium), `competitors-italy-and-ai-first.md` §3.1, §3.9, §8.6; `competitors-eu-uk.md` §5 |
| The visual field is crowded: blue saturated, green/teal/purple/pink owned, cold monochrome is the new premium default, and orange-red became Satispay's in May 2024 | The identity must be warm, calm and desaturated to be both premium and different | FACT/HYPOTHESIS, `docs/research/brand-competitor-analysis.md` §3 |
| "Simple" is claimed by everyone (isybank "Semplicemente banca", Satispay, every tracker); "smart/AI-powered" is hype vocabulary users distrust | Lilleri's words must be *order*, *clarity*, *done*, not *simple* or *smart* | FACT (medium) / HYPOTHESIS, `docs/research/brand-competitor-analysis.md` §7 |
| The name means "money" in Tuscan, comes with a proverb, is light and musical, and may under-signal seriousness | The identity and voice carry the seriousness; the name carries the warmth | FACT/HYPOTHESIS, `naming-analysis.md` §1–2 |

---

## 2. Purpose, mission, vision, promise

| Element | Statement | Notes |
|---|---|---|
| **Purpose** (why we exist) | People should be able to know what is happening to their money without giving it their evenings. | The pain research shows the alternative today is spreadsheets, "1000 apps" abandoned, or exporting statements into ChatGPT (`competitors-italy-and-ai-first.md` Y-02). DECISION |
| **Mission** (what we do) | Lilleri connects every account a person has and keeps one correct, explainable record of what happens to their money — reconciled automatically, categorised their way, private by design, Italian first. | Each clause maps to a product commitment in §7. DECISION |
| **Vision** (the world if we succeed) | A Europe where checking what happened to your money is as effortless and as trustworthy as checking the time. | Long-horizon; the "trustworthy" qualifier is deliberate — effortless alone is a Revolut/Cleo world. DECISION |
| **Promise** (what the user can hold us to) | *Collega i tuoi conti. Lilleri mette in ordine i movimenti e ti chiede quando serve.* ("Connect your accounts. Lilleri organises transactions and asks when needed.") | Product commitment, not current real-bank availability. Review and renewal remain explicit; never promise perpetual authorisation or total automation. DECISION |
| **Internal one-liner** | Your money, correctly accounted for, by itself. | For decks, briefs and hiring; not consumer copy. |

---

## 3. Positioning

### 3.1 Four candidates compared

| Criterion (weight) | P1 — "Keeps your money correctly accounted for, by itself" | P2 — "Inbox zero for your finances" | P3 — "The calm money app" | P4 — "Your automatic personal accountant" |
|---|---|---|---|---|
| Truthful at launch (25 %) | 5 — describes the reconciliation core, with the inbox as the honest caveat | 4 — true, but "inbox" implies the user does work | 3 — claims an emotion before earning it | 2 — "commercialista" in Italy implies tax and fiscal services Lilleri does not provide |
| Differentiation vs Italian incumbents and trackers (20 %) | 5 — nobody claims correctness/reconciliation; aggregation is table stakes | 5 — unique mechanic, nobody markets it | 2 — Monarch, N26 and Qonto already occupy "calm/minimal" registers | 4 — distinctive, but expectation-setting is dangerous |
| Comprehension for a non-Tuscan Italian (20 %) | 4 — "i conti tornano da soli" is instantly understood | 3 — e-mail metaphor; weaker outside knowledge workers | 5 — immediate | 4 — immediate, but misleading |
| Trust (15 %) | 5 — correctness and "asks when unsure" are trust claims | 4 | 3 — soft | 2 — over-promise |
| International translatability (10 %) | 5 | 4 ("inbox zero" is an English-language trope) | 5 | 3 (accountant vs bookkeeper vs commercialista vary) |
| Longevity (10 %) | 5 — not tied to a feature | 3 — tied to one feature | 4 | 4 |
| **Weighted score** | **4.80** | **3.95** | **3.40** | **3.00** |

Scores are the brand team's judgement (HYPOTHESIS); the ranking is robust to ±1 on any single cell.

### 3.2 Chosen positioning (DECISION)

**English (internal master):**

> For people in Italy who juggle several accounts, cards and wallets and have given up on budgeting apps, **Lilleri** is the personal-finance app that **keeps their money correctly accounted for, by itself** — unlike bank apps that only see their own ledger and trackers that break, duplicate and never learn — because it **reconciles every transaction automatically** (pending to booked, duplicates, transfers, card settlements, refunds), **learns each person's categories with their own rules always winning**, and **asks only when it is unsure**.

**Italian (for briefs and the brand book):**

> Per chi ha più conti, carte e wallet e ha smesso di credere alle app di budget, Lilleri è l'app di finanza personale che tiene i conti in ordine da sola — a differenza delle app delle banche, che vedono solo il proprio conto, e dei tracker che si scollegano, duplicano e non imparano mai — perché riconcilia ogni movimento automaticamente, impara le tue categorie con le tue regole che vincono sempre, e ti chiede solo quando ha un dubbio.

P2 becomes the **product narrative** for the Review Inbox ("inbox zero per i tuoi soldi" is a feature story, not the brand), and P3 becomes the **emotional overlay** (§5). P4 is rejected (DECISION): in Italy "commercialista" carries fiscal-service expectations and regulatory connotations the product must not invite.

### 3.3 Target (brand lens, not the product persona set)

| Dimension | Primary | Status |
|---|---|---|
| Who | Italians aged roughly 25–45 with 3–5 financial relationships (a traditional bank, a neobank or prepaid, a payments wallet, often a broker), smartphone-first, who tried a tracker or a spreadsheet and stopped | ASSUMPTION — matches the creator-described stacks (`competitors-italy-and-ai-first.md` §1.3, §7) |
| Tension | "I know roughly, I don't know exactly, and finding out costs me a Sunday" | HYPOTHESIS |
| What they already pay for money apps | €2.90–€9.99/month neobank and payment tiers (Hype, Satispay, N26, Revolut) | FACT (low-medium), `user-pain-points.md` §F |
| Size (brand planning only) | Low 1.5 M / Base 3 M / High 5 M Italians fit the "multi-account, tracker-abandoner" description | ASSUMPTION — no market data could be verified; see `competitors-italy-and-ai-first.md` §6 for the sources to pull |

---

## 4. Brand personality: six traits, "this not that"

| Trait (IT / EN) | This, not that | How it shows in product | How it shows in marketing and support | Italian voice sample (gloss) |
|---|---|---|---|---|
| **Calma, non fredda** (calm, not cold) | Unhurried and warm, never clinical | Warm paper surfaces; no red alarms for ordinary events; one thing at a time in the inbox | No countdown timers, no "last chance"; support answers in full sentences | *"Tutto a posto. Tre movimenti da guardare quando vuoi."* ("All in order. Three transactions to look at whenever you like.") |
| **Precisa, non pignola** (precise, not pedantic) | Exact numbers, no lecturing | Amounts to the cent, tabular figures, the "why" behind every categorisation | Never rounds "for effect"; never moralises about spending | *"Bonifico di 1.250,00 € abbinato al tuo conto Fineco."* ("Transfer of €1,250.00 matched to your Fineco account.") |
| **Discreta, non reticente** (discreet, not secretive) | Says little, hides nothing | Consent screen names the licensed provider, says read-only, shows expiry; export and delete are two taps | Privacy page in plain Italian; no "military-grade" clichés | *"Vediamo i movimenti, non possiamo muovere soldi. Il consenso scade il 14 marzo."* ("We can see transactions, we cannot move money. Consent expires 14 March.") |
| **Calda, non carina** (warm, not cute) | Human warmth without mascots, emoji or jokes about being broke | No character, no confetti; warmth comes from colour, type and tone | The Tuscan story told like an anecdote, not a gimmick | *"Lilleri, in Toscana, sono i soldi. I tuoi li teniamo in ordine."* ("In Tuscany, lilleri means money. We keep yours in order.") |
| **Franca, non brusca** (candid, not blunt) | Tells you what broke, why and when it will retry | Sync states name the bank, the cause and the next attempt; never "internal error" | Status page in Italian; outage e-mails before the user notices | *"Intesa Sanpaolo non risponde dalle 9:10. Riproviamo alle 13:00."* ("Intesa Sanpaolo has not responded since 9:10. We will retry at 13:00.") |
| **Leggera, non superficiale** (light, not flippant) | The lightness of the name, with substance underneath | Fast, quiet interactions; the empty inbox as the hero moment | Short lines, present tense, no exclamation marks | *"Niente da fare oggi."* ("Nothing to do today.") |

**Tone rules derived (DECISION):** short declaratives; present tense; no exclamation marks; no "smart", "AI", "boost", "super", "magic"; Italian-first with anglicisms only for product nouns that have no natural Italian; numbers always precise; failures always explained.

---

## 5. Archetype assessment (used as a check, not as a foundation)

| Archetype | Fit | Verdict |
|---|---|---|
| Sage (clarity, truth) | High on the functional side: "one correct record", "the why" | Keep the Sage's *clarity*, not its coldness |
| Caregiver (looks after your things) | High on the service side: it tidies up for you, warns you before consent expires | Keep the Caregiver's *manners*, not its paternalism |
| Everyman / Regular Guy | Medium: the dialect name is folksy | Risk of "cheap" if over-played |
| Ruler (control, order) | Medium: "in ordine" | Risk of "bank-like" |
| Magician (transformation, "it just works") | Low: this is the "AI magic" register users distrust | **Never** |
| Jester | Low: the proverb invites it; the category punishes it (Cleo, Snoop) | Never |

**DECISION:** Lilleri does not adopt a published archetype. The brand book uses one internal filter — *the Sage's clarity with the Caregiver's manners, never the Magician's tricks* — to resolve tone disputes. Archetype language appears nowhere in consumer-facing material.

---

## 6. Emotional benefit territory

| Territory | Fit with pain points | Fit with the promise | Already owned by | Risk | Verdict |
|---|---|---|---|---|---|
| **Control** | High (YNAB users praise "sense of control") | Medium — control implies the user does the work; Lilleri does it | YNAB (method), Finanzguru 2026 campaign "Control it like Toni" | "Bank-like"; contradicts automation | Reason-to-believe (the user *keeps* control: rules win, undo, export), not the headline emotion |
| **Calm / tranquillità** | High — churn comes from not trusting the numbers; calm is what trusted numbers produce | High | Monarch ("calm household finance"), N26/Qonto visual register (cold calm) | Claiming calm without proof reads as wellness-app fluff | **Destination emotion** — but only ever *earned through clarity* |
| **Lightness / leggerezza** | Medium | Medium (the name is light) | Nobody in finance | Frivolity; "money is light" is a dangerous message | Tonal flavour (voice, motion), never the promise |
| **Clarity / chiarezza** | Very high — "knowing where money goes" is the #1 loved outcome | Very high — "explainable record", "the why" | Nobody owns it in Italian consumer fintech; isybank owns "essential" | Can sound dry | **Vehicle** — the thing Lilleri delivers that produces calm |
| **Awareness / consapevolezza** | High (the basic job) | Medium | Education brands (Tinaba's Investiamo) | Sounds like a course; implies the user must learn | Supporting |
| **Autonomy / autonomia** | Medium (self-hosters, YNAB) | Low–medium | Open-source PFMs | Niche, technical | Not used |

**DECISION — emotional territory: "la tranquillità di sapere" (the calm of knowing).** Clarity is what Lilleri does; calm is how it feels; control is why you can trust it. The sequence is fixed: *clarity → calm*, never calm asserted on its own. Lightness is the tone of voice that stops calm from becoming solemn.

---

## 7. Functional benefit and reasons to believe

**Functional benefit (DECISION):** *Un solo registro corretto dei tuoi soldi, che si tiene in ordine da solo* — one correct record of your money that keeps itself in order: (a) every account in one ledger, (b) every transaction reconciled and categorised the way you would do it, (c) only what needs you reaches you.

| # | Reason to believe | Maps to pain point / evidence | Status | When it may be claimed publicly |
|---|---|---|---|---|
| R1 | Automatic reconciliation: pending → booked matched to one record; duplicates collapsed; the two legs of a transfer paired across institutions; card settlements paired; refunds matched to the original purchase | `user-pain-points.md` §A #2, #3, #8, #17; Actual Budget's most up-voted request (382 votes) is exactly this | Product commitment (DECISION) | Only when shipped and measured (define a reconciliation-accuracy metric before launch) |
| R2 | Personal categorisation that learns per user, shows a short "why", and where the user's explicit rules always beat the model | §A #5 ("never learns"); Copilot per-user model is the praised benchmark; nobody shows a "why" | Product commitment | Same |
| R3 | A Review Inbox that receives only low-confidence or user-defined cases; the empty state is the hero | `competitors-us.md` §5.3 (Monarch "needs review", Copilot "To Review") | Product commitment | Same |
| R4 | Consent that is explained: provider named, read-only stated, expiry countdown, pre-expiry nudge, one-tap batch renewal | §A #4; no competitor markets this (`competitors-eu-uk.md` §6) | Product commitment | Same |
| R5 | Sync failures that name the bank, the cause and the next retry; a public connector-health page in Italian | §A #1, §E "opaque failures" | Product commitment | Same |
| R6 | Read-only access through a licensed account-information provider, with authentication at the bank (SCA); Lilleri never holds bank credentials | §E "what reassures"; provider still **UNKNOWN** (see `open-banking-providers-*.md`) | Commitment; provider name UNKNOWN | When the provider contract is signed |
| R7 | Export (CSV/PDF) and account deletion available on every tier from day one; a readable "what we store and who we send it to" page | §E (Mint, Moneyhub, Spiir, Oval shutdowns; Revolut Sep 2026 incident) | Product commitment | At launch |
| R8 | No selling of data, no lending, no cash advances, no ads inside the inbox; no trial that converts without a reminder; cancellation in-app | §A #7 (billing anger), Cleo FTC case, Snoop data sales | Business-model commitment (DECISION; needs the business-model ADR) | At launch |
| R9 | Italian payment semantics understood natively: F24, MAV/RAV, bollettini/PagoPA, SDD, "ricarica Postepay" as a transfer, cash withdrawals paired to a cash wallet | `competitors-italy-and-ai-first.md` §8.1–8.3 | Product commitment | Same as R1 |
| R10 | Coverage honesty: a per-bank, per-account-type coverage page ("UniCredit credit cards are not available via open banking — here is what you can do") | `competitors-italy-and-ai-first.md` §9.2.8 | Product commitment | At launch |

None of R1–R10 is a FACT today. Marketing copy may describe *what Lilleri does* only once the behaviour exists and is measured; until then, copy describes intent ("Lilleri è pensata per…") or nothing. DECISION, tied to the trust priority.

---

## 8. Brand architecture

| Element | Rule | Status |
|---|---|---|
| Master brand | **Lilleri** is a monolithic master brand. Everything the user touches is "Lilleri" plus a plain descriptor. No sub-brands, no endorsed brands, no product families at launch | DECISION |
| Plan naming | Master brand **Lilleri**; launch descriptors **Lilleri Gratis** and **Lilleri Plus**. **Lilleri Famiglia** is Later, gated to actual sharing. In a labelled plan selector “Gratis”/“Plus” is sufficient; prose uses the full name. Never “Lilleri+” | DECISION |
| Words never used for plans | Premium, Metal, Gold, Platinum, Ultra, Black, VIP, Elite — the neobank status ladder; they sell status, not usefulness, and read "bank-like/cheap" at once. Also never "Pro" for a consumer tier | DECISION |
| "Lilleri Pro" | Reserved for a possible future **partita-IVA** tier (personal + business separation, tax set-aside), because in Italy "Pro" reads as "professionista". Not at launch; requires its own decision | OPEN QUESTION |
| "Lilleri Business" | **Not coherent** with a consumer brand built on calm and personal clarity; a separate B2B product (banks, PFM modules) would dilute the master brand and compete with Fabrick-style players. Do not create. If B2B2C distribution happens, Lilleri is the *consumer* brand inside a partner, never "Lilleri Business" | DECISION |
| Feature naming | Features get descriptive Italian nouns, not brand names: "Da rivedere" (to review), "Regole" (rules), "Abbonamenti" (subscriptions), "Trasferimenti" (transfers), "Esporta" (export). At most **one** branded product noun may exist — the Review Inbox — and only if testing shows a name helps recall (candidate names in `messaging-framework.md` §7). Avoid the Hype "Radar"/"Box", Revolut "Pockets", N26 "Spaces" habit of branding every tab | DECISION |
| Partner branding | The licensed account-information provider is *named* in consent flows (trust) but never co-branded in the identity; banks appear as merchant/bank logos, never as endorsements | DECISION |
| Legal entity | Trading name and legal name relationship UNKNOWN (entity not yet formed) | UNKNOWN |
| Wordmark casing | Lowercase wordmark; "Lilleri" capitalised in prose | DECISION (see `naming-analysis.md` D6) |

---

## 9. Why would someone remember Lilleri after one use?

| Question | Answer | Status |
|---|---|---|
| **The name** | Because it means "money" in Tuscan and comes with a proverb half the country can finish; because of the l-l-r rhythm; because nobody else in finance has a dialect name. The onboarding tells the story once, in two sentences, and never again | HYPOTHESIS (test: 7-day recall and spelling) |
| **Which visual element** | A warm paper field with a small ink mark — not a letter on a saturated colour — on a home screen full of saturated squares (Satispay orange, Revolut black, PayPal blue, N26 teal). Candidate mark concepts: the "ll" ligature of the name; two strokes settling into one line (reconciliation) | HYPOTHESIS; to be decided in Phase 2 (`docs/research/brand-competitor-analysis.md` §9) |
| **Which verbal element** | The two-beat signature "Tu spendi. Lilleri sistema." and the empty-inbox line "Niente da fare." — one is the brand's sentence, the other is the product's | HYPOTHESIS; evaluated in `messaging-framework.md` |
| **Which product element** | The moment the Review Inbox reaches zero, and the first time a transfer between two of your own banks is shown as *one* movement instead of an expense and an income | HYPOTHESIS (product commitment R1, R3) |
| **Which emotion** | Relief — "ah, è tutto a posto" — the calm of knowing without having done anything | DECISION (§6) |

---

## 10. Anti-patterns (what Lilleri is not)

| Anti-pattern | What it looks like | Who does it (status) | Lilleri rule |
|---|---|---|---|
| **Childish** | Mascots, piggy banks, confetti, emoji categories, cartoon coins | Snoop, Plum (historic), Emma (ASSUMPTION) | No characters, no celebration animations, restrained category icons |
| **Meme-like** | Roast mode, slang, sarcasm, "swear jar" | Cleo (FACT: product features), Hype promo tone (ASSUMPTION) | No jokes about the user's spending; wit only in the Tuscan story |
| **Corporate** | Stock photography, "soluzioni", capital-letter Values, blue gradients | Incumbent banks, Nexi (ASSUMPTION) | Present-tense plain Italian; no "soluzione", "innovativo", "a 360°" |
| **Bank-like** | Tricolore, shields, locks, "la tua sicurezza è la nostra priorità", branches | isybank tricolore tail (FACT), bank apps (ASSUMPTION) | Security shown by clarity and candour, never by icons or slogans |
| **Cold** | Pure black on pure white, clinical grids, no warmth | Revolut, Qonto, Apple, PayPal 2024, Robinhood 2024 (FACT for palettes) | Warm paper and ink base; human sentences |
| **Technical** | "PSD2", "AISP", "API", "sync", "ledger" in consumer copy | Self-hosted PFMs, developer-led tools | Technical terms appear only where the law or trust requires them (the consent screen), always with a plain gloss |
| **Cheap** | Discount badges, countdowns, "GRATIS!!!", referral spam | Promo-code culture of Italian neobanks (FACT, `competitors-italy-and-ai-first.md` §7) | Referral programmes exist but are written like the rest of the brand; no exclamation marks |
| **Crypto-bro** | Neon, dark mode by default, rockets, "to the moon", gradients | Revolut themes/holo (FACT), Robinhood lime legacy, crypto apps | No neon, no rockets, no growth metaphors; light mode is the brand's native mode |
| **Neon fintech cliché** | Lime on black, purple "we're not a bank", pink BNPL, letter-in-a-square icon | Wise/Robinhood lime, Starling/Nubank purple, Klarna/Scalapay pink, Revolut/Venmo/Lydia icons (FACT for hexes) | Desaturated signature colour; non-letter icon |
| **AI theatre** | Sparkles, "AI-powered", "95 % accuracy" with no mechanism, chat box as the whole product | Many 2025–26 apps (`competitors-us.md` §3, §6.14) | Show the "why" and a confidence, never a sparkle; the model is a mechanism, not a persona |

---

## 11. International scalability

| Dimension | Approach | Status |
|---|---|---|
| Name | Pronounceable and clean in all markets checked; opaque (arbitrary) outside Italy, which helps distinctiveness; the Tuscan story is told, not translated; Finnish Humpty Dumpty association accepted for a late market | FACT/ASSUMPTION, `naming-analysis.md` §3, §8 |
| Emotional territory | "The calm of knowing" is universal; no market-specific humour in the core | DECISION |
| Italian-ness | Italy is the **origin story**, not the costume: no flag, no tricolore, no trattoria/Vespa/Tuscan-hills imagery; "Italian like Olivetti and a well-set table, not like a souvenir shop". Warm earth colours and good typography carry the origin | DECISION |
| Copy system | Italian is the master language for product copy; an English master glossary of every product noun (transaction, transfer, settlement, refund, rule, inbox, consent) is maintained from day one so localisation is a translation of terms, not a rewrite of the brand | DECISION (constrains the i18n architecture — needs an ADR reference) |
| Plan names | "Lilleri Plus" travels unchanged; "Lilleri Famiglia" is localised per market ("Lilleri Family", "Lilleri Familie", "Lilleri Famille") | DECISION |
| Numbers | Amount formatting follows a hand-reviewed locale table (it-IT `1.234,56 €`, de-DE, fr-FR narrow spaces, en-IE `€1,234.56`), with tabular figures and the Unicode minus — numbers are the brand's most-seen element, so their rendering is a brand rule | FACT for the locale outputs, `typography-options.md` §10 |
| Currency | The mark never contains "€"; the palette never depends on a currency colour | DECISION |
| Voice | The tone rules (short, present tense, no exclamation marks, precise numbers, explained failures) are language-independent and are the only part of the voice guide that is mandatory in every market | DECISION |
| Trust surfaces | Consent, coverage and data pages are per-market: name the local licensed provider and the local SCA pattern (EU bank-side SCA vs UK re-consent) | DECISION |
| Risks | The soft name may under-signal seriousness in markets with no proverb to anchor it; compensate with typography and candour, not with a descriptor glued to the name | HYPOTHESIS |

---

## 12. Brand guardrails tied to the priority order

Priorities (from the project brief, in order): trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetisation, feature count. Brand rules that follow:

| Priority | Brand rule |
|---|---|
| Trust > everything | No claim without a shipped, measured behaviour. No dark patterns. No ads in the inbox. No lending. Reminders before any charge. Export and delete always visible. |
| Correctness | Numbers are never rounded for effect; every automatic action is reversible and explained. |
| Security and privacy | Consent copy names the provider and the read-only scope; the privacy page is written in the brand voice, not legalese; incidents are communicated before users ask (Revolut Sep 2026 is the counter-example). |
| Simplicity and automation | One signature colour, one motion, one branded noun at most; features get plain nouns. |
| Reliability | A public status page in Italian is part of the brand surface. |
| Brand recognition | Earned through consistency (warm paper, ink, the mark, the two-beat tagline), not through saturation or promo noise. |
| Monetisation | Plans are descriptors; basics (categories, rules, export) are never gated — the research shows gating basics is the fastest route to the Trustpilot gap. |

---

## 13. Brand measures (planning ranges, not targets yet)

| Measure | Low / Base / High | Status |
|---|---|---|
| Spelling-correct recall of the name 7 days after first use (Italian testers) | 40 % / 60 % / 75 % | ASSUMPTION — set the bar in the Phase 1 test plan |
| Aided awareness, Italians 25–45, 12 months after launch | 1 % / 3 % / 8 % | ASSUMPTION — no comparable data; depends entirely on go-to-market budget |
| Gap between app-store rating and Trustpilot score at month 12 | ≤ 1.5 / ≤ 1.0 / ≤ 0.5 points | HYPOTHESIS — category benchmark is 1.5–2.5 points (`competitors-us.md` §4.5); YNAB (4.6 Trustpilot) shows the gap is avoidable |
| Share of support tickets caused by "what happened to my sync" | ≤ 30 % / ≤ 20 % / ≤ 10 % | ASSUMPTION — proxy for the candour rule (R5) |
| Icon-confusion rate vs Satispay/N26/Revolut at 60 px | ≤ 15 % / ≤ 10 % / ≤ 5 % | HYPOTHESIS — Phase 2 test |

---

## Decisions / Recommendations

| # | Decision | Type | Needs ADR? |
|---|---|---|---|
| D1 | Purpose, mission, vision and promise as in §2; the promise always carries the "asks only when unsure" clause | DECISION | No |
| D2 | Positioning P1 ("keeps your money correctly accounted for, by itself"); P2 as product narrative; P3 as emotional overlay; P4 rejected | DECISION | No |
| D3 | Six personality traits and the tone rules of §4 | DECISION | No |
| D4 | No published archetype; internal filter "Sage's clarity, Caregiver's manners, never the Magician" | DECISION | No |
| D5 | Emotional territory "la tranquillità di sapere": clarity → calm; control as RTB; lightness as tone | DECISION | No |
| D6 | Reasons to believe are product commitments until shipped and measured; no public claim before then | DECISION | Yes — ties to the reconciliation-accuracy metric and the business-model ADR (R8) |
| D7 | Monolithic master brand; launch “Lilleri Gratis / Lilleri Plus”; Famiglia Later only with real sharing; no Premium/Metal/Gold/Ultra; Pro reserved for a future professional workflow; no Lilleri Business | DECISION | `brand-architecture.md` and business review govern active ladder; earlier four-plan scenarios are comparators |
| D8 | Feature names are plain Italian nouns; at most one branded noun (the inbox), pending test | DECISION | No |
| D9 | Anti-patterns of §10 are hard rules for identity and copy | DECISION | No |
| D10 | Italian is the master copy language with an English term glossary from day one; locale-correct number rendering is a brand rule | DECISION | Yes — i18n and money-formatting architecture (`typography-options.md` §10.4) |
| D11 | Identity exploration follows `docs/research/brand-competitor-analysis.md` §9 (warm paper/ink base; one of three signature territories; non-letter icon) | RECOMMENDATION | No |

## Open questions

| # | Question | Owner / how to resolve |
|---|---|---|
| Q1 | Which licensed account-information provider will be named in consent flows (R6)? | Provider decision (`open-banking-providers-*.md`), ADR |
| Q2 | What reconciliation-accuracy and categorisation-accuracy metrics gate the public use of R1–R3? | Product + data; define before launch |
| Q3 | Does a branded name for the Review Inbox improve recall, or does "Da rivedere" suffice? | Phase 1 copy test (see `messaging-framework.md` §7) |
| Q4 | Recognition of the name and proverb outside Tuscany; 7-day recall | Phase 1 user test (`naming-analysis.md` checklist 9) |
| Q5 | Will the business model include any second revenue rail (aligned affiliate, B2B2C)? If so, how is it disclosed without breaking R8? | Business-model ADR |
| Q6 | Legal entity name and its relationship to the trading name | Company formation |
| Q7 | Italian aided-awareness ranking of competitors, to confirm which three identities Lilleri must be most distinct from | 200-respondent survey, Phase 1 |

## Sources

All inputs verified 2026-10-02; source IDs refer to the tables inside each input document.

| ID | Document | Used for |
|---|---|---|
| I1 | `docs/research/raw/user-pain-points.md` (§0, §A, §C, §D, §E, §F, §G, §H; GitHub issues G-01…G-87; sibling-doc digests D-EU/D-US) | §1, §6, §7 |
| I2 | `docs/research/raw/competitors-italy-and-ai-first.md` (§1, §3, §7, §8, §9; V-09, W-01, W-02, W-04, W-08, Y-01…Y-05) | §1, §3.3, §8, §10 |
| I3 | `docs/research/raw/competitors-eu-uk.md` (§1, §5, §6, §11, §12; S-19, S-45, S-63, S-66–S-87) | §1, §7, §12 |
| I4 | `docs/research/raw/competitors-us.md` (§3, §4.1, §4.5, §5, §6; S51, S54, S28, W5–W33) | §1, §7, §10, §13 |
| I5 | `docs/research/brand-competitor-analysis.md` (§3, §4, §7, §8, §9; WB-01…WB-15) | §1, §9, §10, §11 |
| I6 | `docs/brand/naming-analysis.md` (§1–§3, §8, §11; WB-N1…WB-N9) | §1, §9, §11 |
| I7 | `docs/research/raw/typography-options.md` (§1, §5, §10) | §11 |
| I8 | Project brief for LILLERI (priorities, promise, "revenue must never destroy trust") | §2, §12 |

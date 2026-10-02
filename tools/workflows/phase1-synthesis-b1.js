export const meta = {
  name: 'lilleri-synthesis-b1',
  description: 'Synthesize business model, brand strategy and naming for Lilleri',
  phases: [{ title: 'Synthesize' }],
}

const CONTEXT = `You are a senior member of the LILLERI founding team (today 2026-10-02). Lilleri is a greenfield consumer Personal Finance Management product, Italy-first then Europe. Promise: "connect your accounts once and Lilleri automatically understands what happens to your money" — zero-setup, automatic reconciliation (pending→booked, duplicates, internal transfers, card settlements, refunds), personal AI categorization that learns per user with explicit rules winning over AI, a Review Inbox ("inbox zero for your finances"), subscription/recurring detection and actionable insights. Absolute priorities, in order: trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetization, feature count. Revenue must never destroy trust.

RULES: Read the raw research under /home/user/Lilleri/docs/research/raw/ and any synthesized docs named below (Read tool; read fully). Documentation language is English; product copy, taglines and voice examples are Italian (with English glosses). Keep every claim labelled FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION / UNKNOWN and keep source URLs with verification dates (carry over; never invent sources; keep UNKNOWN as UNKNOWN). Never present estimates as facts; give Low/Base/High ranges. Prefer tables. Each document ends with "Decisions / Recommendations", "Open questions" and "Sources". You may run WebSearch to close small gaps (WebFetch is blocked). Write files with the Write tool at the exact paths requested (directories exist). Do not modify files outside those you are asked to write.`

const OUT_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'Max 300 words: key decisions/recommendations and biggest uncertainties' },
    gate_assessment: { type: 'string' },
  },
  required: ['files', 'summary'],
}
const CRIT_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, file: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'file', 'issue', 'fix'] } },
    verdict: { type: 'string' },
  },
  required: ['findings', 'verdict'],
}

const RAW = (n) => '/home/user/Lilleri/docs/research/raw/' + n

const JOBS = [
  {
    key: 'business',
    role: 'Subscription monetization expert + fintech unit-economics analyst + CFO + advertising monetization expert',
    inputs: [RAW('business-and-cost-inputs.md'), RAW('open-banking-providers-a.md'), RAW('open-banking-providers-b.md'), RAW('competitors-us.md'), RAW('competitors-eu-uk.md'), RAW('competitors-italy-and-ai-first.md'), RAW('user-pain-points.md'), RAW('ai-ml-transaction-intelligence.md'), RAW('build-vs-buy-and-vendors.md')],
    outputs: ['docs/business/business-model.md', 'docs/business/pricing-analysis.md', 'docs/business/unit-economics.md', 'docs/business/revenue-scenarios.md', 'docs/business/go-to-market.md', 'docs/business/cost-architecture.md'],
    task: `Write: (1) docs/business/business-model.md — evaluate free-tier models A-F (A free manual tracking/bank sync premium; B 1 bank free; C 1-2 accounts free; D bank sync free with limited refresh; E ad-funded bank sync; F hybrid freemium) with COGS implications from the provider cost ranges, pick one via proposal → critique → counter-proposal → decision; define plan ladder (Free / Plus / Pro / Family, Business as Later) with paywall dimensions (institutions, accounts, refresh, history depth, advanced AI, receipts, household, export, forecasting, automation, insights, rules) and the rule that privacy/security features are never paywalled; evaluate advertising critically (A generic ads, B contextual, C sponsored financial offers, D affiliate marketplace, E cashback, F switching) with trust/legal/UX/revenue analysis and decide; revenue add-ons policy (clearly labelled, optional separate consent, no hidden advice). (2) docs/business/pricing-analysis.md — competitor price table (EUR, with sources/dates), willingness-to-pay evidence, price anchoring, App Store/Play commission and EU alternative terms effects, VAT, web vs IAP pricing parity, proposed price points with Low/Base/High, trial strategy, annual discount, family pricing. (3) docs/business/unit-economics.md — the COGS/user/month formula (open banking + sync + enrichment + AI + compute + storage + notifications + third-party APIs + support + payment fees + other) with Low/Base/High per line and explicit ASSUMPTION labels, for free vs paid users; ARPU, gross margin per plan, CAC assumptions, payback, LTV; sensitivity analysis on the 5 most uncertain inputs (provider price, conversion, churn, AI cost per user, connections per user); break-even analysis. Provide the formulas in a way that can be turned into a spreadsheet/TypeScript model. (4) docs/business/revenue-scenarios.md — scenarios at 1k/10k/100k/1M users with Free/Paid/Family mixes (pessimistic/base/optimistic), monthly revenue, COGS, gross margin, fixed costs ranges, team size implied; clearly state Gate C (business potentially sustainable?) verdict. (5) docs/business/go-to-market.md — Italian launch strategy: positioning, channels (ASO, content/SEO on Italian money topics, Reddit/Telegram/YouTube personal finance communities in Italy, referral, partnerships), waitlist/closed beta, launch sequencing, CAC targets, metrics. (6) docs/business/cost-architecture.md — FIXED / VARIABLE / STEP costs, cost drivers (DB, storage, bandwidth, Redis, workers, AI, OCR, open banking, email APIs, push, analytics, observability, auth, support, app stores), budget alerts, cost per new user / MAU / connected user / paid user / 1k transactions, and cost-control design rules (caching, batching, tiered AI).`,
  },
  {
    key: 'brand-strategy',
    role: 'Brand strategist + marketing strategist + senior brand designer + type/naming specialist',
    inputs: [RAW('brand-competitor-analysis.md'), RAW('naming-lilleri.md'), RAW('user-pain-points.md'), RAW('competitors-italy-and-ai-first.md'), RAW('competitors-eu-uk.md'), RAW('competitors-us.md'), RAW('typography-options.md')],
    outputs: ['docs/brand/brand-strategy.md', 'docs/brand/naming-analysis.md', 'docs/brand/messaging-framework.md', 'docs/research/brand-competitor-analysis.md'],
    task: `Write: (1) docs/brand/brand-strategy.md — brand purpose, mission, vision, promise, positioning statement (use the "For [target], Lilleri is the [category] that [benefit], unlike [alternatives], because [reason to believe]" formula or a better one, with 3 alternatives compared), brand personality (4-6 traits with "this not that" pairs), archetype assessment (use only if it adds value), emotional benefit territory (control / calm / lightness / clarity / awareness / autonomy — choose and justify), functional benefit, reasons to believe, brand architecture (Lilleri master brand; Lilleri Plus/Pro/Family naming rules; Business only if coherent), the answers to: why would someone remember the name after one use, which visual element, which verbal element, which product element, which emotion; explicit anti-patterns (not childish, meme-like, corporate, bank-like, cold, technical, cheap, crypto-bro, neon fintech cliché); international scalability of the brand. (2) docs/brand/naming-analysis.md — the professional naming analysis of Lilleri: meaning (Tuscan "lilleri" = money, the proverb), memorability, Italian and international pronunciation, spelling/typo risks, SEO/ASO, verbalization potential, distinctiveness, negative meanings in other languages, indicative domain and social availability (UNKNOWN where not verifiable, with checklist), trademark risk (similar marks like Lili, Lydia, Lilium..., classes 9/36/42) with explicit statement that this is NOT legal clearance, and a go/no-go: the name stays Lilleri unless a serious blocker exists. (3) docs/brand/messaging-framework.md — messaging territories (automation, simplicity, financial clarity, control, peace of mind), at least 20 Italian headline/tagline candidates with English glosses, evaluation matrix (memorability, comprehension, differentiation, trust, premium perception, translatability, longevity) narrowing to 5 finalists, a primary recommendation with rationale and alternatives, plus message hierarchy for landing page (hero, value props, how it works, trust), app store listing copy (title, subtitle, short description — Italian), and messaging per plan. Assess "Tu spendi. Lilleri sistema." and "Le tue finanze si organizzano da sole." professionally. (4) docs/research/brand-competitor-analysis.md — the polished brand competitor analysis (from the raw doc): per-competitor identity table, palette landscape, shape landscape, typography trends, clichés to avoid, white-space opportunities, and a shortlist of 3 color/visual territories for Lilleri to explore in the identity phase with rationale (do not finalize the palette here).`,
  },
]

phase('Synthesize')
const drafts = await parallel(JOBS.map(j => () => agent(`${CONTEXT}\n\nROLE: ${j.role}\n\nINPUT DOCS (read all): ${j.inputs.join(', ')}\n\nOUTPUT FILES: ${j.outputs.map(o => '/home/user/Lilleri/' + o).join(', ')}\n\nTASK: ${j.task}`, { label: `synth:${j.key}`, phase: 'Synthesize', schema: OUT_SCHEMA })))

return { drafts: drafts.filter(Boolean) }

export const meta = {
  name: 'lilleri-synthesis-a',
  description: 'Synthesize market, pain-point, open-banking and compliance research into decision documents, then red-team them',
  phases: [{ title: 'Synthesize' }, { title: 'Critique' }, { title: 'Revise' }],
}

const CONTEXT = `You are a senior member of the LILLERI founding team (today 2026-10-02). Lilleri is a greenfield consumer Personal Finance Management product, Italy-first then Europe. Promise: "connect your accounts once and Lilleri automatically understands what happens to your money" — zero-setup, automatic reconciliation (pending→booked, duplicates, internal transfers, card settlements, refunds), personal AI categorization that learns per user with explicit rules winning over AI, a Review Inbox ("inbox zero for your finances"), subscription/recurring detection and actionable insights. Absolute priorities, in order: trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetization, feature count.

RULES: Read the raw research under /home/user/Lilleri/docs/research/raw/ (Read tool; the files are long — read them fully, they are your evidence base). Documentation language is English; product copy examples are Italian. Keep every claim labelled FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION / UNKNOWN and keep source URLs with verification dates (carry them over from the raw docs; do not invent sources; if a raw doc says UNKNOWN keep it UNKNOWN). Never present estimates as facts. Prefer tables for comparisons. Be concrete and decision-oriented: each document must end with "Decisions / Recommendations", "Open questions" and "Sources". You may run additional WebSearch queries to close small gaps (WebFetch is blocked). Write files with the Write tool at the exact paths requested (directories exist). Do not modify files outside the ones you are asked to write.`

const OUT_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'Max 300 words: key decisions/recommendations and the biggest uncertainties' },
    gate_assessment: { type: 'string', description: 'If a decision gate applies: PASS / PASS WITH CONDITIONS / FAIL and why' },
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

const JOBS = [
  {
    key: 'market',
    inputs: ['competitors-us.md', 'competitors-eu-uk.md', 'competitors-italy-and-ai-first.md', 'user-pain-points.md', 'brand-competitor-analysis.md'],
    outputs: ['docs/research/market-analysis.md', 'docs/research/competitor-matrix.md', 'docs/research/opportunity-map.md'],
    role: 'Product Manager consumer fintech + growth lead + UX researcher',
    task: `Write (1) docs/research/market-analysis.md: market context (Italy, Europe, UK, US), market size signals for Italy (accounts, cards, open-banking adoption; label statuses), segments, trends 2024-2026 (Mint shutdown, AI-first entrants, aggregator consolidation), bank-app analytics as the default competitor, why users still need a third-party PFM, and a clear answer to "Why should Lilleri exist?" — do NOT accept "because it uses AI"; validate or replace the hypothesis "the financial tracker you don't have to manage / le tue finanze si organizzano da sole" with evidence from pain points; conclude with Gate A (market opportunity clear?) assessment. (2) docs/research/competitor-matrix.md: a wide matrix (rows = products incl. Wallet, Spendee, YNAB, Monarch, Copilot, Rocket Money, Emma, Snoop, Plum, MoneyWiz, Money Pro, Revolut, N26, Hype, Splitwise, Tricount, Cleo, Finanzguru, Bankin', Fintonic, Italian players found; columns = the fields in the raw docs: target, markets, onboarding steps-to-value, bank connection/aggregator, sync, categorization/AI learning, rules, automation, recurring, merchant normalization, review flow, splits, transfers, refunds, cash, budget, forecast, net worth, goals, notifications, anomalies, shared, receipts, import/export, web, pricing, free tier, ads/affiliate, strengths, weaknesses, recurring complaints) using UNKNOWN where needed; plus per-product one-paragraph verdicts. (3) docs/research/opportunity-map.md: for each major feature area use the template SOURCE OF INSPIRATION / USER PROBLEM / CURRENT MARKET SOLUTION / WEAKNESS / OUR IMPROVEMENT (at least 15 areas: onboarding, connection UX, consent renewal, review inbox, categorization learning, rules, merchant normalization, transfers/card settlement, duplicates, subscriptions, insights, budgets/safe-to-spend, shared/household, cash, receipts, import, privacy dashboard, pricing/free tier) and a prioritized list of differentiators ranked by user value × feasibility × defensibility; explicitly list what NOT to build in MVP.`,
  },
  {
    key: 'users',
    inputs: ['user-pain-points.md', 'competitors-italy-and-ai-first.md', 'competitors-eu-uk.md', 'competitors-us.md'],
    outputs: ['docs/research/user-pain-points.md', 'docs/product/personas.md', 'docs/product/jobs-to-be-done.md'],
    role: 'UX researcher + consumer fintech PM',
    task: `Write (1) docs/research/user-pain-points.md: the synthesized, ranked pain-point map (top 25 with evidence counts and sources, grouped: connection/sync, data correctness, categorization, review burden, trust/privacy, pricing, Italian-specific), jobs users hire PFM apps for, loved features, churn reasons, trust reassurances; (2) docs/product/personas.md: 4-5 evidence-based personas for Italy (e.g., the busy professional with 3 accounts + Amex + Satispay + Revolut; the couple sharing expenses; the freelance/partita IVA who mixes personal and business — note as Later; the young saver on Postepay/Hype; the family budget manager) each with context, accounts/sources, goals, frustrations, trust threshold, willingness to pay, what "zero setup" means for them, and a "day in the life" sync scenario; (3) docs/product/jobs-to-be-done.md: JTBD statements (functional, emotional, social), the core loop CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY → LEARN → AUTOMATE mapped to jobs, the WOW moment and TRUST moment definitions with evidence, and success signals per job.`,
  },
  {
    key: 'openbanking',
    inputs: ['open-banking-providers-a.md', 'open-banking-providers-b.md', 'non-bank-sources-and-os-limits.md', 'regulatory-landscape.md'],
    outputs: ['docs/research/open-banking-providers.md', 'docs/research/provider-capability-matrix.md', 'docs/research/provider-cost-model.md', 'docs/research/data-sources-feasibility.md'],
    role: 'Open banking specialist + PSD2/open finance specialist + CTO fintech',
    task: `Write (1) docs/research/open-banking-providers.md: narrative evaluation of Tink, Fabrick, TrueLayer, Yapily, Salt Edge, GoCardless Bank Account Data, Enable Banking, Powens, Plaid EU, Neonomics, Mastercard Open Banking, CBI Globe direct and any other found; the Italian PSD2 mechanics (CBI Globe, 90-day history, SCA/consent 180 days, 4x/day background refresh, pending availability, credit cards reachability incl. Nexi/Amex, Postepay, PayPal as AIS source, Satispay), the licensing route (operate under provider licence/agent vs own AISP registration: requirements, timelines, costs with status labels), and a proposal → critique → counter-proposal → decision section ending with a primary provider recommendation, a secondary/fallback provider, and the reasons; include Gate B assessment (feasible Italian financial-data coverage?). (2) docs/research/provider-capability-matrix.md: a full matrix with ALL the criteria requested (Italian banks covered, coverage quality, credit card, prepaid, account types, pending, booked, merchant, merchant category, MCC, original description, balances, history, background refresh, webhooks, enrichment, categorization, recurring detection, account ownership, sandbox, mobile SDK, OAuth/SCA handling, consent duration, consent renewal UX, pricing, setup fees, minimum spend, per-user cost, per-connection cost, per-call cost, commercial constraints, SLA, EU data residency, licensing arrangement, operate under provider licence, agent/FPP possibility, time-to-market, lock-in, docs quality, DX) with raw values AND a 1-5 score per criterion with justification, weighted total, and sensitivity notes ("this UNKNOWN could flip the ranking"). (3) docs/research/provider-cost-model.md: cost model per connected account/user/month under Low/Base/High assumptions per provider, at 1k/10k/100k/1M users with 1.0/1.8/2.5 connections per user, including enrichment add-ons; all unknown prices as explicit ASSUMPTION ranges with how to verify (request quote). (4) docs/research/data-sources-feasibility.md: the multi-source strategy A-I (open banking, official provider APIs, file import, receipt scanning, email receipts, Android notification listener, OS integrations like FinanceKit, manual, recurring manual templates) with FEASIBLE / FEASIBLE WITH CONSENT+COST / NOT FEASIBLE / POLICY RISK per source and per platform (iOS/Android), explicit statements on Apple Pay/Google Pay/Satispay/PayPal limitations, and an MVP vs later recommendation.`,
  },
  {
    key: 'compliance',
    inputs: ['regulatory-landscape.md', 'non-bank-sources-and-os-limits.md', 'open-banking-providers-a.md', 'open-banking-providers-b.md'],
    outputs: ['docs/compliance/regulatory-landscape.md', 'docs/compliance/privacy-model.md', 'docs/compliance/consent-model.md', 'docs/compliance/data-retention.md', 'docs/compliance/legal-open-questions.md'],
    role: 'Fintech compliance analyst + privacy/GDPR specialist',
    task: `Write (1) docs/compliance/regulatory-landscape.md: for PSD2, PSD3, PSR, FIDA, DORA, AI Act, GDPR, ePrivacy, Italian rules (TUB, Banca d'Italia, Garante, AGCM, Codice del Consumo, OAM/mediazione creditizia, IVASS), EAA, NIS2, App Store and Google Play policies: a table with "current law (in force?)", "future change", "status as of 2026-10-02 (in force / adopted-not-yet-applicable / provisional agreement / proposal)", "expected impact on Lilleri", "action required now", "needs professional legal review?"; then a "Current regulation checkpoint" section explicitly stating what is NOT yet law. (2) docs/compliance/privacy-model.md: data inventory (what Lilleri stores, why, lawful basis, retention, encryption class, who can access), data minimization decisions, special-category inference risks (pharmacies, donations, unions, political parties, health) and mitigations (do not infer, do not profile on those, allow category hiding), DPIA outline, analytics privacy rules (semantic events only, no descriptions/IBAN/amounts to third parties), AI vendor data handling requirements (EU residency, zero retention, minimal payload), user rights flows (access, export, deletion, revocation), DPO decision, breach notification timelines. (3) docs/compliance/consent-model.md: consent types (AIS consent via provider, GDPR consent for optional features: email ingestion, notifications, marketing, personalised offers), what is contract-necessary vs consent-based, consent records schema, renewal UX (180-day rule), dashboard requirements (see connections, consent status, revoke), copy principles (no legalese). (4) docs/compliance/data-retention.md: retention per data class (raw provider payloads, normalized transactions, receipts, logs, audit, AI logs, backups), deletion workflows, backup implications, legal holds. (5) docs/compliance/legal-open-questions.md: prioritized list of questions requiring a lawyer before production (agent model under provider licence in Italy, affiliate/financial promotion rules, AML applicability, AI Act classification, DORA contractual flow-down, cross-border expansion), each with why it matters, risk if wrong, and suggested expert type.`,
  },
]

phase('Synthesize')
const drafts = await parallel(JOBS.map(j => () => agent(`${CONTEXT}\n\nROLE: ${j.role}\n\nINPUT RAW DOCS (read all): ${j.inputs.map(i => '/home/user/Lilleri/docs/research/raw/' + i).join(', ')}\n\nOUTPUT FILES: ${j.outputs.map(o => '/home/user/Lilleri/' + o).join(', ')}\n\nTASK: ${j.task}`, { label: `synth:${j.key}`, phase: 'Synthesize', schema: OUT_SCHEMA })))

phase('Critique')
const critics = [
  { key: 'skeptical-investor', persona: 'a skeptical fintech investor who has seen ten PFM startups die' },
  { key: 'fintech-cto', persona: 'a CTO who has shipped PSD2 aggregation in Italy and knows which assumptions about account access are usually false' },
  { key: 'privacy-counsel', persona: 'an Italian privacy and fintech compliance counsel' },
  { key: 'consumer', persona: 'a careful Italian consumer deciding whether to connect their bank account to a new app' },
]
const reviewTargets = JOBS.flatMap(j => j.outputs).map(o => '/home/user/Lilleri/' + o)
const critiques = await parallel(critics.map(c => () => agent(`You are ${c.persona}. Today is 2026-10-02. Read these Lilleri documents (Read tool): ${reviewTargets.join(', ')}. Red-team them: find false confidence (hypotheses presented as facts, numbers without sources, legislative proposals treated as law, licensing shortcuts that may not exist in Italy), missing considerations, internal contradictions between documents, weak differentiation arguments, and decisions not justified by evidence. Be specific: cite file and the exact statement. Propose a concrete fix for each finding. Severity: blocker (would mislead a decision), major, minor. Return at most 25 findings, most severe first.`, { label: `critique:${c.key}`, phase: 'Critique', schema: CRIT_SCHEMA })))

const allFindings = critiques.filter(Boolean).flatMap(c => c.findings)
log(`critique: ${allFindings.length} findings`)

phase('Revise')
const revisions = await parallel(JOBS.map(j => () => {
  const mine = allFindings.filter(f => j.outputs.some(o => f.file.includes(o.split('/').pop())))
  if (!mine.length) return Promise.resolve({ files: j.outputs, summary: 'no findings', gate_assessment: '' })
  return agent(`${CONTEXT}\n\nROLE: ${j.role} (revision pass). The documents you own: ${j.outputs.map(o => '/home/user/Lilleri/' + o).join(', ')}. Red-team reviewers raised these findings (JSON): ${JSON.stringify(mine)}. For each: verify against the raw research (and fresh WebSearch if needed), then either fix the document in place (Edit tool) or, if the finding is wrong, add a short "Reviewer note" explaining why it stands. Keep documents coherent with each other. Append a "## Review log" section listing each finding and its resolution. Return the summary.`, { label: `revise:${j.key}`, phase: 'Revise', schema: OUT_SCHEMA })
}))

return { drafts: drafts.filter(Boolean), findings: allFindings.length, revisions: revisions.filter(Boolean) }

export const meta = {
  name: 'lilleri-research-market',
  description: 'Market, competitor, pain-point, brand-competitor and naming research for Lilleri',
  phases: [{ title: 'Research' }, { title: 'Verify' }],
}

const PREAMBLE = `You are a specialist researcher on the LILLERI project: a greenfield consumer Personal Finance Management (PFM) app, Italy-first then Europe. Product promise: "connect your accounts once and Lilleri automatically understands what happens to your money" (zero-setup, automatic reconciliation of transfers/duplicates/card settlements, personal AI categorization that learns per user, review inbox, subscription detection). Today is 2026-10-02.

TOOLING CONSTRAINTS: Use the WebSearch tool extensively (aim for 20-40 distinct queries; use English AND Italian queries where relevant; vary phrasing; query app-store, Reddit, Trustpilot, Product Hunt and news). WebFetch is blocked by the network egress proxy for almost every domain (it returns EGRESS_BLOCKED) — do not depend on it; if one attempt fails, do not retry other URLs on that domain. Do not install packages. Do not modify any file other than the output document you are asked to write.

EVIDENCE RULES: Every potentially variable claim must carry: source URL, verification date (2026-10-02), source publication date if visible, reliability (high = official/primary; medium = reputable secondary; low = blog/forum/unclear), and doubts. Label claims FACT / ASSUMPTION / HYPOTHESIS / UNKNOWN. Never present a hypothesis as a fact. If a number (price, coverage, user count) cannot be found, write UNKNOWN and say how to verify it. When sources conflict, report both. Search-engine snippets may be stale: note the date you see. Do NOT copy proprietary marketing text verbatim beyond short quotes; paraphrase.

OUTPUT: Write complete findings as a structured Markdown document (English, tables welcome, concrete) to the file path given below using the Write tool (create it; the parent directory exists). Start the document with a title, a one-paragraph scope note, and a "Sources" table at the end. Then return the structured summary requested by the output schema.`

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    doc_path: { type: 'string' },
    summary: { type: 'string', description: 'Max 350 words: the most decision-relevant findings' },
    key_findings: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, status: { type: 'string', enum: ['FACT', 'ASSUMPTION', 'HYPOTHESIS', 'UNKNOWN'] }, source: { type: 'string' } }, required: ['claim', 'status'] } },
    open_questions: { type: 'array', items: { type: 'string' } },
    search_count: { type: 'number' },
  },
  required: ['doc_path', 'summary', 'key_findings', 'open_questions', 'search_count'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    doc_path: { type: 'string' },
    checked: { type: 'number' },
    corrected: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['doc_path', 'checked', 'corrected', 'notes'],
}

const COMPETITOR_FIELDS = `For EACH product cover (write UNKNOWN where you cannot find it): target users; markets/countries; onboarding steps and number of steps to first value; UX highlights; bank connection method and aggregator used if identifiable (Plaid, MX, Finicity, Tink, TrueLayer, Salt Edge, Yapily, GoCardless, etc.); sync frequency; categorization approach (rules, ML, AI, manual) and whether it learns from corrections; custom categories; rules engine; automation level; recurring/subscription detection; merchant normalization/logos; search; transaction review flows; split transactions; internal transfer detection; refund handling; cash handling; budgets; forecasting/cash flow; net worth; goals; notifications; anomaly alerts; shared finances/couples/households; receipt scanning; import/export formats; web app availability; mobile platforms; pricing (monthly/annual, local currency, source and date); paywall structure; free tier limits; advertising; affiliate/marketplace revenue; retention mechanisms; strengths; weaknesses; recurring negative review themes; most loved features; most frequent problems. Also note any recent news (acquisitions, shutdowns, pivots, pricing changes, layoffs) from 2024-2026.`

const ITEMS = [
  {
    key: 'competitors-us',
    path: 'docs/research/raw/competitors-us.md',
    prompt: `TASK: Deep competitor analysis of US-centric PFM apps: YNAB, Monarch Money, Copilot Money, Rocket Money, Quicken Simplifi, Empower (Personal Capital), PocketGuard, Origin, and any notable AI-first newcomer launched 2024-2026 in the US (search "AI personal finance app 2026", "new budgeting app launch 2025 2026", "Mint alternative 2026"). Include the Mint shutdown (2024) and how users migrated. ${COMPETITOR_FIELDS} Pay special attention to: how each handles pending→posted transactions, duplicates, transfers, credit-card payments; how AI categorization learns; review-inbox style flows; pricing trends 2024-2026. Finish with a section "Patterns worth adopting (reimplemented originally)" and "Patterns to avoid".`,
  },
  {
    key: 'competitors-eu-uk',
    path: 'docs/research/raw/competitors-eu-uk.md',
    prompt: `TASK: Deep competitor analysis of UK/EU PFM apps: Emma (UK), Snoop (UK), Plum (UK/EU), Moneyhub (UK), Spendee (CZ), Wallet by BudgetBakers (CZ), MoneyWiz, Money Pro, Toshl, Finanzguru (DE), Outbank (DE), Bankin' (FR), Linxo (FR), Fintonic (ES), Buddy, Monefy, Cleo (AI chat), and any other EU PFM with open-banking aggregation found via search (query in English, German, French, Spanish and Italian). ${COMPETITOR_FIELDS} Note specifically: whether each supports Italian banks; what EU aggregator they use; how they handle PSD2 90/180-day consent renewal UX; EU pricing in EUR; free-tier structure; any ad-funded or affiliate models (e.g. Emma's, Snoop's, Plum's); shutdowns or pivots 2023-2026. Finish with "Patterns worth adopting (reimplemented originally)" and "Patterns to avoid".`,
  },
  {
    key: 'competitors-italy-ai',
    path: 'docs/research/raw/competitors-italy-and-ai-first.md',
    prompt: `TASK: (1) Italian market analysis of personal finance management: Italian PFM apps and fintechs (search Italian terms: "app gestione spese", "app finanze personali", "app budget migliore 2026", "aggregatore conti app Italia", "app collega tutti i conti"; investigate e.g. Oval Money (status?), Mooney, Hype, Tinaba, Buddybank, Fabrick-based consumer apps, Banca Mediolanum / Intesa / UniCredit / Fineco app PFM features, Satispay features, Moneyfarm, Gimme5, "Spendless", "Fatture in Cloud" (no, it is B2B), any Italian-born PFM found). (2) Bank/neobank built-in analytics as competition: Revolut (analytics, subscriptions, budgets, categorization), N26 (Insights/Spaces), Hype, Satispay, bunq, Intesa Sanpaolo app, UniCredit, Fineco, BancoPosta/Postepay — what they offer and the big gap: they cannot see other institutions. (3) Shared expenses: Splitwise, Tricount, Settle Up — features, pricing, pain points. (4) AI-first newcomers worldwide 2024-2026 (Cleo, Copilot's AI, Monarch AI assistant, Origin AI, Kudos, Bright, Piere, Finbo, any "AI money manager" launched recently, incl. Italian/European ones). Italian market sizing: smartphone penetration, open banking adoption in Italy (number of users/consents, CBI Globe stats, Bank of Italy data), number of current accounts, use of credit/prepaid cards (Postepay numbers), cash usage, average number of banking relationships per Italian, trust attitudes toward fintech in Italy. ${COMPETITOR_FIELDS} Finish with "What Italian users specifically need that global apps miss" and "Patterns worth adopting / to avoid".`,
  },
  {
    key: 'pain-points',
    path: 'docs/research/raw/user-pain-points.md',
    prompt: `TASK: Mine real user feedback about PFM apps to build a pain-point map. Sources via search: App Store and Google Play review themes, Reddit (r/personalfinance, r/ynab, r/MonarchMoney, r/CopilotMoney, r/ItaliaPersonalFinance, r/Fintech, r/UKPersonalFinance), Trustpilot (Emma, Rocket Money, Plum, Snoop, Revolut), Product Hunt, HN threads, Italian forums (FinanzaOnline, Reddit Italia), YouTube review summaries, blog comparisons. Cover at least: YNAB, Monarch, Copilot, Rocket Money, Emma, Snoop, Plum, Spendee, Wallet, MoneyWiz, Money Pro, Revolut analytics, N26 insights, Splitwise, and Italian users' complaints about bank apps and PSD2 connections (consent renewals every 90/180 days, broken connections, missing transactions, delays, duplicates, miscategorization, "pending" confusion, credit card double counting, transfers counted as income, cash, PayPal, Postepay/BancoPosta coverage, Satispay). Produce: (a) a ranked list of the 25 most frequent pain points with evidence quotes (paraphrased, short) and sources; (b) "jobs users hire these apps for"; (c) the features users love most; (d) churn reasons; (e) trust concerns about connecting bank accounts (what reassures people, what scares them); (f) willingness-to-pay signals and price complaints; (g) specific Italian-market pain points. Mark each item with how many independent sources support it.`,
  },
  {
    key: 'brand-competitors',
    path: 'docs/research/raw/brand-competitor-analysis.md',
    prompt: `TASK: Brand/visual identity analysis of the fintech and PFM landscape, to make Lilleri recognizable and distinct. Analyse for each: logo concept (describe, do not reproduce), wordmark style, logomark/app icon (shape, color, symbol), primary palette (hex values when documented publicly, e.g. in brand pages or press kits), typography (named typeface when known: e.g. custom fonts), visual language (gradients, flat, 3D, illustration, photography), tone of voice, brand positioning, premium vs mass perception, recognizability, recent rebrands (2022-2026). Cover: Revolut (2023 rebrand), N26, Klarna, Satispay, Wise (2023 rebrand), Curve, Monzo, Starling, Hype, Fineco, Intesa Sanpaolo, UniCredit, Mooney, Scalapay, Nexi, PayPal, Cash App, Venmo, Robinhood, Moneyfarm, Emma, Snoop, Plum, Monarch, Copilot, YNAB, Rocket Money, Cleo, Spendee, Wallet by BudgetBakers, Splitwise, Trade Republic, bunq, Lydia/Sumeria, Qonto, Apple Wallet/Card, Google Wallet. Then produce: (1) a palette landscape map (which hues are crowded: blues, greens, purples, black/white, pinks/corals, yellows) with evidence; (2) a logo-shape landscape (circles, rounded squares, letters, abstract marks, mascots); (3) typography trends (geometric sans, grotesk, custom); (4) iconography/illustration trends; (5) clichés to avoid (neon gradients, coins, rising charts, piggy banks, € symbols, wallets); (6) white-space opportunities for an Italian-born, calm, premium, "finances organize themselves" brand: candidate color territories (at least 5, each with rationale, psychological associations, accessibility notes, and which competitors are nearest), candidate mark concepts, and naming/verbal territory notes. Include references to design-industry commentary where found (Brand New/Under Consideration, It's Nice That, Dezeen, Behance case studies).`,
  },
  {
    key: 'naming',
    path: 'docs/research/raw/naming-lilleri.md',
    prompt: `TASK: Preliminary naming analysis of "Lilleri" (official product name; do NOT propose alternatives unless you find a serious legal/commercial blocker). Research: (1) meaning and etymology: "lilleri" in Tuscan/Italian dialect (money; the saying "senza lilleri non si lallera"), regional connotations, any use in other languages (Finnish/Estonian/Scandinavian word look-alikes, Swedish "lilla", etc.), possible negative or ridiculous meanings in English, Spanish, French, German, Portuguese, Dutch, Polish, Arabic, Japanese, Chinese transliteration; (2) existing usage: companies, startups, apps, software, fintech, restaurants, shops, music, books, people named Lilleri/Lillieri/Lilleri Money; search App Store and Google Play ("Lilleri app"), GitHub, npm ("lilleri"), Crunchbase, LinkedIn companies, Italian Registro Imprese mentions; (3) domains: whether lilleri.com, lilleri.it, lilleri.app, lilleri.eu, lilleri.money, getlilleri.com, lilleri.io appear to be registered/in use (you cannot WHOIS; infer from search results and say UNKNOWN where needed, describing how to verify); (4) social handles (@lilleri on Instagram, X, TikTok, LinkedIn) — infer from search; (5) trademark: search EUIPO eSearch/TMview and UIBM mentions for "Lilleri" via search engine; similar marks in class 9/36/42 (e.g., "Lilli", "Lillo", "Lilium", "Lilly", "Lili", "Lydia/Sumeria", "Lili bank" (US fintech), "Lilo", "Lillen"); note likelihood-of-confusion risks with existing fintech names (e.g., Lili (US business banking), Lydia, Lunar, Lili Bank). (6) Linguistics: memorability, Italian pronunciation (LIL-le-ri), international pronunciation, spelling risks (Lileri, Lilleri vs Lillery), verbalization potential ("lillerare"?), SEO/ASO competition for the keyword, distinctiveness, length, sound symbolism (soft 'l' sounds: light, playful, liquid). Give a risk assessment with explicit UNKNOWN items and a verification checklist (EUIPO search, UIBM, WHOIS, store search, professional trademark clearance). State clearly this is NOT a legal clearance.`,
  },
]

phase('Research')
const results = await pipeline(
  ITEMS,
  (it) => agent(`${PREAMBLE}\n\nOUTPUT FILE: /home/user/Lilleri/${it.path}\n\n${it.prompt}`, { label: `research:${it.key}`, phase: 'Research', schema: RESEARCH_SCHEMA }),
  (r, it) => r && agent(`You are an adversarial fact-checker on the Lilleri project (today 2026-10-02). Read the research document at /home/user/Lilleri/${it.path} (use the Read tool). Identify the 8-12 claims that are most consequential for product, brand or business decisions AND most likely to be wrong or stale (prices, user counts, shutdowns, aggregator used, coverage, legal status, trademark/domain availability). For each, run fresh WebSearch queries (WebFetch is blocked; do not rely on it) trying to REFUTE the claim. Then EDIT the document in place with the Edit tool: fix wrong claims, downgrade unsupported FACTs to ASSUMPTION/UNKNOWN, add missing sources, and append a final section "## Verification notes (adversarial pass)" listing each claim checked, verdict (confirmed / corrected / unverifiable), and sources. Do not delete useful content. Return the summary requested.`, { label: `verify:${it.key}`, phase: 'Verify', schema: VERIFY_SCHEMA }),
)

const ok = results.filter(Boolean)
log(`market research: ${ok.length}/${ITEMS.length} docs verified`)
return { verified: ok, docs: ITEMS.map(i => i.path) }
# Lilleri messaging framework

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe).
**Document type:** messaging framework (territories, tagline candidates and evaluation, message hierarchy, store listing copy, plan messaging, vocabulary).
**Verification date for every claim:** 2026-10-02.
**Language rule:** documentation in English; all product copy, taglines and voice examples in **Italian** with English glosses in parentheses or in the "Gloss" column.
**Inputs:** `docs/brand/brand-strategy.md` (positioning, personality, emotional territory), `docs/brand/naming-analysis.md`, `docs/research/brand-competitor-analysis.md`, and the raw research on pain points and competitors.

**Labels.** FACT, ASSUMPTION, HYPOTHESIS, DECISION, OPEN QUESTION / UNKNOWN as in the rest of the repository. All tagline scores are the brand team's professional judgement and are therefore **HYPOTHESIS until tested with users**. Every line that describes a product behaviour is subject to the rule in `brand-strategy.md` §7: no public claim before the behaviour is shipped and measured.

---

## 0. Voice in five rules (the constraints every line below obeys)

| Rule | Why (evidence) |
|---|---|
| Short declaratives, present tense, no exclamation marks | Calm competence; the opposite of Hype/Revolut promo tone and Cleo/Snoop chat tone (`docs/research/brand-competitor-analysis.md` §8) |
| Say *order*, *clarity*, *done*; never *simple*, *smart*, *AI*, *boost*, *super*, *magic* | "Simple" is claimed by isybank ("Semplicemente banca") and every tracker; AI vocabulary is a documented trust risk (`competitors-us.md` §6.14) |
| Precise numbers, never rounded for effect; Italian amount format `1.234,56 €` | Correctness is priority #2; numbers are the brand's most-seen element (`typography-options.md` §10) |
| Name the bank, the cause and the next retry whenever something fails | "Sync offline"/"internal error" is a documented trust-killer (`user-pain-points.md` §E) |
| Italian first; anglicisms only for product nouns with no natural Italian; the Tuscan proverb only in storytelling | `naming-analysis.md` D5 |

---

## 1. Messaging territories

| Territory | Core idea (IT / gloss) | What it answers (pain evidence) | Proof Lilleri can offer (commitment status) | Risk | Role |
|---|---|---|---|---|---|
| **Automation** ("si sistema da sé" — it sorts itself out) | *Tu spendi. Lilleri sistema.* — the user changes nothing; the app does the bookkeeping | "Too much manual work" churn reason; the 382-vote request to pair transfers automatically; "15 minutes a month" is the best Italian creators manage with Wallet (`user-pain-points.md` §D; `competitors-italy-and-ai-first.md` Y-02) | Automatic reconciliation (R1), learning categorisation (R2), inbox that asks only when unsure (R3) — all commitments | Over-claim ("da soli" when the inbox exists); must always pair with "ti chiede solo quando ha un dubbio" | **Lead** |
| **Financial clarity** ("chiaro dove vanno" — clear where it goes) | One correct record; the "why" behind every categorisation; transfers shown as one movement | "Knowing where money goes" is the #1 loved outcome; "cannot trust the numbers" is the #1 churn reason (`user-pain-points.md` §B, §D) | R1, R2, R5 (named sync states), R10 (coverage honesty) | Can sound dry; avoid charts-and-arrows imagery | **Lead's proof** — clarity is what makes automation trustworthy |
| **Peace of mind** ("la tranquillità di sapere" — the calm of knowing) | Calm earned through clarity; the empty inbox | Anxiety about money and about apps that break or disappear (`user-pain-points.md` §E) | Only credible after R1–R5 are live and measured | Claiming calm before proof reads as wellness fluff; Monarch owns "calm" in the US | **Emotional overlay** (campaign, onboarding end-state) |
| **Control** ("decidi tu" — you decide) | Your rules always win; undo everything; export and delete any time; read-only access | Users fear write access, data selling, lock-in; they want rules that don't get gated (`user-pain-points.md` §E, §A #15) | Rules-beat-AI (R2), export/delete (R7), read-only via a licensed provider (R6) | "Control" implies effort; YNAB and Finanzguru ("Control it like Toni") own the word | **Trust proof** — used in consent, settings, pricing and FAQ copy; never the headline |
| **Simplicity** ("senza impostare niente" — without setting anything up) | Zero setup; no categories to invent; no method to learn | YNAB's 2–4-week learning curve; Monarch's 7-day trial too short to set up (`user-pain-points.md` §A #23) | Zero-setup onboarding, default Italian taxonomy | "Simple" is claimed by everyone in Italy; it no longer differentiates | **Tone, not claim** — simplicity is demonstrated by copy length and flow, not asserted |

**DECISION:** the message hierarchy is *Automation (what it does) → Clarity (why you can trust it) → Peace of mind (how it feels)*, with Control as the trust proof underneath and Simplicity as the way everything is written.

---

## 2. Headline and tagline candidates (25)

Grouped by territory. All lines are original drafts; a web search for the two lines the brief asked to assess ("Tu spendi. Lilleri sistema." and "Le tue finanze si organizzano da sole.") found no competitor using either (weak negative, WB-M1; search engines index only part of the market).

| # | Italian | Gloss | Territory | Notes |
|---|---|---|---|---|
| 1 | **Tu spendi. Lilleri sistema.** | You spend. Lilleri sorts it out. | Automation | "Sistema" = tidies/fixes *and* the noun "system": both readings work |
| 2 | **Le tue finanze si organizzano da sole.** | Your finances organise themselves. | Automation | Literal rendering of the project promise |
| 3 | I tuoi soldi, in ordine. Da soli. | Your money, in order. By itself. | Automation | From the raw brand research drafts |
| 4 | Collega i conti una volta. Al resto pensa Lilleri. | Connect your accounts once. Lilleri takes care of the rest. | Automation | The promise line; "al resto pensa X" is idiomatic |
| 5 | Collega una volta. Poi niente. | Connect once. Then nothing. | Automation | Terse; risks reading as "then nothing happens" |
| 6 | Il conto torna. Senza farlo tornare tu. | The numbers add up. Without you making them. | Clarity | Plays on "il conto torna" (it adds up); untranslatable |
| 7 | Ogni movimento al suo posto. | Every transaction in its place. | Clarity | Calm, descriptive, travels well |
| 8 | Si sistema da sé. | It sorts itself out. | Automation | Too elliptical alone; works as a sub-line |
| 9 | Soldi chiari, senza fare niente. | Clear money, without doing anything. | Clarity | "Senza fare niente" can sound lazy |
| 10 | Sai sempre dove vanno i tuoi soldi. | You always know where your money goes. | Clarity | True to the #1 loved outcome; generic |
| 11 | Chiaro dove finiscono i soldi. | Clear where the money ends up. | Clarity | "Finiscono" has a faint "runs out" shade |
| 12 | Una sola verità sui tuoi soldi. | One single truth about your money. | Clarity | "Verità" is grandiose for a trust-first brand |
| 13 | Tutti i conti. Un solo quadro. | All accounts. One picture. | Clarity | Aggregation is table stakes in Italy (XME Banks, Hype) |
| 14 | **La tranquillità di sapere.** | The calm of knowing. | Peace of mind | The emotional territory in four words |
| 15 | Niente da fare. Davvero. | Nothing to do. Really. | Peace of mind | The empty-inbox line; needs context |
| 16 | Meno pensieri, più lilleri. | Fewer worries, more lilleri. | Name-play | Implies you will *have* more money — a claim Lilleri cannot make |
| 17 | Dormi tranquillo, i conti sono a posto. | Sleep easy, the accounts are in order. | Peace of mind | Bank-advert cliché |
| 18 | **Decidi tu le regole. Lilleri le applica.** | You set the rules. Lilleri applies them. | Control | The "rules beat AI" promise, plainly |
| 19 | Capisce i tuoi soldi. Obbedisce alle tue regole. | It understands your money. It obeys your rules. | Control | "Obbedisce" is strong; good for a principles page |
| 20 | Solo lettura. Tutto chiaro. | Read-only. All clear. | Control | Consent-screen line, not a headline |
| 21 | Zero fogli Excel. Zero categorie da inventare. | Zero spreadsheets. Zero categories to invent. | Simplicity | Concrete; dates quickly ("Excel") |
| 22 | Senza impostare niente. | Without setting anything up. | Simplicity | Sub-line material |
| 23 | Finanze personali, senza il lavoro. | Personal finance, without the work. | Simplicity | Flat |
| 24 | Senza lilleri 'un si lallera. Con Lilleri, sai dove vanno. | Without lilleri there's no fun. With Lilleri, you know where they go. | Name-play | Tuscan campaign only; see `naming-analysis.md` D5 |
| 25 | Lilleri. I tuoi soldi, capiti. | Lilleri. Your money, understood. | Clarity | Warm, slightly ambiguous ("capiti" = understood / happened) |

---

## 3. Evaluation matrix

Criteria and weights (DECISION): **Trust 20 %** (does it make a claim Lilleri can keep, in a register that earns trust?), **Comprehension 20 %** (instant meaning for a non-Tuscan Italian), **Differentiation 15 %** (vs Satispay "People Paying People", isybank "Semplicemente banca"/"Quello che ti serve, quando ti serve", Revolut hype, tracker descriptors), **Memorability 15 %**, **Premium perception 10 %**, **Translatability 10 %**, **Longevity 10 %**. Scores 1–5; weighted total out of 5. Scores are HYPOTHESIS.

| # | Line (short) | Mem | Comp | Diff | Trust | Prem | Transl | Long | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Tu spendi. Lilleri sistema. | 5 | 5 | 5 | 4 | 4 | 3 | 5 | **4.50** |
| 18 | Decidi tu le regole. Lilleri le applica. | 3 | 5 | 4 | 5 | 4 | 5 | 4 | **4.35** |
| 3 | I tuoi soldi, in ordine. Da soli. | 4 | 5 | 4 | 4 | 4 | 4 | 5 | **4.30** |
| 14 | La tranquillità di sapere. | 4 | 4 | 4 | 4 | 5 | 5 | 5 | **4.30** |
| 4 | Collega i conti una volta. Al resto pensa Lilleri. | 3 | 5 | 4 | 5 | 3 | 5 | 4 | **4.25** |
| 7 | Ogni movimento al suo posto. | 3 | 5 | 3 | 4 | 4 | 4 | 5 | 4.00 |
| 25 | Lilleri. I tuoi soldi, capiti. | 4 | 4 | 4 | 4 | 4 | 3 | 5 | 4.00 |
| 19 | Capisce i tuoi soldi. Obbedisce alle tue regole. | 3 | 4 | 4 | 5 | 3 | 4 | 4 | 3.95 |
| 10 | Sai sempre dove vanno i tuoi soldi. | 3 | 5 | 2 | 4 | 3 | 5 | 5 | 3.85 |
| 12 | Una sola verità sui tuoi soldi. | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 3.80 |
| 5 | Collega una volta. Poi niente. | 4 | 3 | 5 | 3 | 4 | 4 | 4 | 3.75 |
| 2 | Le tue finanze si organizzano da sole. | 3 | 5 | 3 | 3 | 3 | 5 | 4 | 3.70 |
| 6 | Il conto torna. Senza farlo tornare tu. | 4 | 4 | 4 | 4 | 4 | 1 | 4 | 3.70 |
| 21 | Zero fogli Excel. Zero categorie da inventare. | 4 | 5 | 4 | 3 | 2 | 4 | 2 | 3.60 |
| 9 | Soldi chiari, senza fare niente. | 4 | 4 | 4 | 3 | 2 | 3 | 4 | 3.50 |
| 20 | Solo lettura. Tutto chiaro. | 3 | 3 | 3 | 5 | 3 | 3 | 4 | 3.50 |
| 13 | Tutti i conti. Un solo quadro. | 3 | 5 | 1 | 4 | 3 | 4 | 3 | 3.40 |
| 23 | Finanze personali, senza il lavoro. | 3 | 4 | 3 | 3 | 3 | 4 | 4 | 3.40 |
| 15 | Niente da fare. Davvero. | 4 | 2 | 5 | 3 | 3 | 3 | 4 | 3.35 |
| 22 | Senza impostare niente. | 3 | 4 | 3 | 3 | 2 | 4 | 4 | 3.30 |
| 8 | Si sistema da sé. | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 3.25 |
| 11 | Chiaro dove finiscono i soldi. | 3 | 4 | 2 | 3 | 2 | 4 | 4 | 3.15 |
| 16 | Meno pensieri, più lilleri. | 5 | 3 | 5 | 2 | 2 | 1 | 3 | 3.10 |
| 24 | Senza lilleri 'un si lallera… | 5 | 2 | 5 | 3 | 2 | 1 | 3 | 3.10 |
| 17 | Dormi tranquillo, i conti sono a posto. | 3 | 5 | 1 | 3 | 2 | 3 | 3 | 3.00 |

**Five finalists (DECISION):** #1, #18, #3, #14, #4. Each has a distinct job (§4), so they are not competing for one slot.

---

## 4. Primary recommendation and the two lines assessed

### 4.1 Professional assessment of "Tu spendi. Lilleri sistema."

| Dimension | Assessment |
|---|---|
| Structure | Two beats, four words, the brand name in the second beat: the tagline *teaches the name* every time it is read. Parallel subjects ("tu" / "Lilleri") state the division of labour in the plainest possible way: the user keeps living, the app keeps the books. |
| The verb "sistema" | The strongest word in the line. In everyday Italian *sistemare* means to tidy, to put right, to settle (a bill, a room, a problem). It is warmer than *organizza*, more active than *gestisce*, and it is not bank vocabulary. Read as a noun, "Lilleri sistema" also means "the Lilleri system" — a quiet second meaning that does no harm. |
| Honesty | It claims an outcome (things get sorted) without claiming total automation; it leaves room for the inbox. It does not claim savings, growth or "more money". |
| Risks | (a) "Tu spendi" foregrounds spending; a minority may hear "you spend [too much]". Mitigation: never pair it with imagery of shopping; pair it with the ordered ledger. (b) The pun does not translate; the English master must be a new line, not a translation ("You spend. Lilleri sorts it out." is serviceable, not equal). (c) It says nothing about income, savings or investments — acceptable, because the brand is about correctness, not wealth. (d) Four words leave no room for the "asks only when unsure" clause, so the hero sub-headline must carry it. |
| Verdict | **Recommended as the brand tagline** (signature line under the wordmark, end-frame of campaigns, App Store subtitle). Weighted 4.50/5, highest of the set. HYPOTHESIS until tested with 20 users for comprehension and tone. |

### 4.2 Professional assessment of "Le tue finanze si organizzano da sole."

| Dimension | Assessment |
|---|---|
| Structure | Six words, a full sentence, no brand name. It is the literal Italian of the project promise ("your finances organise themselves"), which makes it accurate but descriptive. |
| Vocabulary | "Finanze" is register-formal (bank/Ministry vocabulary) where the brand speaks of *soldi* and *conti*; "si organizzano" is weaker than *sistema* and "organise" is what the *user* does in every tracker. Reviewers already describe competitors as apps that "registrano da sole" (record by themselves) — the construction is familiar, not ownable. |
| Honesty | "Da sole" (entirely by themselves) is the absolute claim the trust priority warns against; the inbox exists. It also invites the question "then what are the notifications for?" |
| Strengths | Instantly understood by every Italian; translates cleanly into every market; it is the clearest statement of the category Lilleri wants to create. |
| Verdict | **Not a tagline; adopt as the promise line** in explanatory contexts (landing hero sub-headline, press boilerplate, investor material), in a corrected form that keeps it honest: *"Le tue finanze si mettono in ordine da sole. Lilleri ti chiede solo quando ha un dubbio."* ("Your finances put themselves in order. Lilleri asks you only when it is unsure.") Weighted 3.70/5 as a tagline; its value is as a sentence that explains, not as a sentence that is remembered. |

### 4.3 Roles of the five finalists (DECISION)

| Line | Role | Where |
|---|---|---|
| #1 Tu spendi. Lilleri sistema. | Brand tagline | Wordmark lock-up, campaign end-frames, App Store subtitle, e-mail footers |
| #3 I tuoi soldi, in ordine. Da soli. | Hero headline (alternative A) | Landing page hero when the tagline sits elsewhere on the page |
| #4 Collega i conti una volta. Al resto pensa Lilleri. | Promise / "how it works" line | Hero sub-headline, onboarding first screen, press boilerplate |
| #14 La tranquillità di sapere. | Emotional campaign line | Brand film, out-of-home, onboarding completion screen |
| #18 Decidi tu le regole. Lilleri le applica. | Trust and control line | Pricing page, principles page, rules screen, FAQ |

**Alternatives if #1 fails the user test:** #3 as tagline (loses the name but keeps the rhythm); #25 "Lilleri. I tuoi soldi, capiti." (warmer, less active). **English master line (not a translation):** "You spend. Lilleri sorts it out." — to be revisited with a native copywriter before any non-Italian launch (OPEN QUESTION).

---

## 5. Message hierarchy: landing page

All copy Italian; glosses in brackets. Lines marked † describe product behaviour and may be published only once the behaviour exists and is measured (`brand-strategy.md` §7). `[AISP]` is a placeholder for the licensed provider's name (UNKNOWN today).

| Block | Copy (IT) | Gloss | Notes |
|---|---|---|---|
| **Hero — headline** | I tuoi soldi, in ordine. Da soli. | Your money, in order. By itself. | Alternative: the tagline itself |
| **Hero — sub-headline** | Collega i conti una volta. Lilleri abbina bonifici, pagamenti con carta e rimborsi, impara le tue categorie e ti chiede solo quando ha un dubbio.† | Connect your accounts once. Lilleri matches transfers, card payments and refunds, learns your categories and asks you only when it is unsure. | Carries the honesty clause |
| **Hero — CTA** | Inizia con i tuoi conti | Start with your accounts | Never "Scarica gratis!" |
| **Hero — trust strip** | Solo lettura · Accesso tramite [AISP], autorizzato · Nessuna vendita di dati · Esporti e cancelli quando vuoi | Read-only · Access via [AISP], licensed · No data selling · Export and delete whenever you want | Four facts, no icons of shields |
| **Value prop 1 — Reconciliation** | *Un movimento, una volta sola.* Un bonifico tra due tuoi conti è un bonifico, non una spesa e un'entrata. Il pagamento della carta non conta due volte. Il rimborso torna da dove era partito.† | *One transaction, once.* A transfer between two of your accounts is a transfer, not an expense and an income. The card payment is not counted twice. The refund goes back where it came from. | Answers pain points #2, #3, #8, #17 |
| **Value prop 2 — Categories** | *Le tue categorie, non le nostre.* Lilleri impara da ogni correzione e ti dice perché ha scelto così. Se scrivi una regola, la regola vince sempre.† | *Your categories, not ours.* Lilleri learns from every correction and tells you why it chose that. If you write a rule, the rule always wins. | Answers #5; explicit-rules-beat-AI |
| **Value prop 3 — The inbox** | *Solo quello che ha bisogno di te.* I movimenti sicuri si sistemano da soli. Quelli incerti ti aspettano in un unico posto. L'obiettivo è vederlo vuoto.† | *Only what needs you.* Certain transactions sort themselves out. Uncertain ones wait for you in one place. The goal is to see it empty. | "Inbox zero" without the English |
| **Value prop 4 — Subscriptions** | *Sai cosa paghi ogni mese, e quando.* Abbonamenti, bollette bimestrali, assicurazione semestrale, TARI: Lilleri riconosce la periodicità, anche quando non è mensile.† | *You know what you pay every month, and when.* Subscriptions, bimonthly utilities, half-yearly insurance, TARI: Lilleri recognises the rhythm, even when it is not monthly. | Italian recurring costs (`competitors-italy-and-ai-first.md` §8.8) |
| **How it works — 1** | Collega i tuoi conti. Ti autorizzi direttamente sulla tua banca. Noi vediamo i movimenti, non possiamo muovere soldi. | Connect your accounts. You authorise directly at your bank. We see transactions, we cannot move money. | Bank-side SCA, read-only |
| **How it works — 2** | Lilleri mette in ordine. Storico, bonifici, carte, rimborsi, categorie: fatto da solo, spiegato riga per riga.† | Lilleri puts things in order. History, transfers, cards, refunds, categories: done by itself, explained line by line. | |
| **How it works — 3** | Tu guardi quando vuoi. Quando serve una tua decisione, te lo chiede una volta e impara. | You look whenever you like. When your decision is needed, it asks once and learns. | |
| **Trust block — heading** | Quello che non facciamo | What we do not do | Negative-space trust |
| **Trust block — body** | Non vendiamo i tuoi dati. Non prestiamo soldi. Non mettiamo pubblicità tra i tuoi movimenti. Non ti addebitiamo nulla senza avvisarti prima. Non teniamo le tue credenziali: l'accesso passa da [AISP], un intermediario autorizzato, e scade quando lo decidi tu o la legge. Esporti tutto in CSV e cancelli l'account in due tocchi. | We do not sell your data. We do not lend money. We do not put adverts between your transactions. We do not charge you anything without telling you first. We do not keep your credentials: access goes through [AISP], a licensed intermediary, and expires when you or the law decide. You export everything in CSV and delete the account in two taps. | Each sentence maps to a commitment (R6–R8); the legal review must confirm the wording on consent duration |
| **Coverage block** | Quali banche funzionano, e cosa non possiamo vedere | Which banks work, and what we cannot see | Links to the coverage page (R10); lists limits honestly (e.g. credit-card accounts not exposed by some banks) |
| **Pricing teaser** | Lilleri è gratis per tenere i conti in ordine. Lilleri Plus aggiunge profondità, non correttezza. | Lilleri is free for keeping your accounts in order. Lilleri Plus adds depth, not correctness. | See §7; pricing itself is ASSUMPTION |
| **Closing** | Tu spendi. Lilleri sistema. | You spend. Lilleri sorts it out. | The tagline closes the page |

**Social proof:** no fabricated testimonials or ratings. Until real reviews exist the page shows the trust block and the coverage page instead (DECISION).

---

## 6. App store listing copy (Italian)

Limits: Apple App Store name ≤ 30 characters, subtitle ≤ 30, promotional text ≤ 170; Google Play title ≤ 30, short description ≤ 80. Counts verified on 2026-10-02 (ASSUMPTION that store limits are unchanged; re-check at submission).

| Field | Option A (recommended) | Chars | Option B | Chars |
|---|---|---|---|---|
| **Name / title** | Lilleri: soldi in ordine (Lilleri: money in order) | 24 | Lilleri – Conti in ordine (Lilleri – Accounts in order) | 25 |
| **Subtitle (Apple)** | Tu spendi. Lilleri sistema. | 27 | Conti collegati, tutto chiaro (Accounts connected, all clear) | 29 |
| **Short description (Google Play)** | Collega i conti una volta: Lilleri riconcilia, categorizza e avvisa. Tu spendi. (Connect your accounts once: Lilleri reconciles, categorises and alerts you. You spend.) | 79 | Collega i conti una volta. Lilleri mette in ordine spese, bonifici, abbonamenti. (Connect your accounts once. Lilleri puts expenses, transfers, subscriptions in order.) | 80 |
| **Promotional text (Apple)** | Colleghi i conti una volta. Lilleri abbina bonifici e pagamenti con carta, impara le tue categorie e ti chiede solo quando ha un dubbio. Solo lettura. (You connect your accounts once. Lilleri matches transfers and card payments, learns your categories and asks only when unsure. Read-only.) | 150 | — | — |

Notes: "riconcilia" in Option A is slightly technical; it is kept because it is the one word that names the differentiator and it is searchable. Option B's "mette in ordine" is warmer for users who do not know the word. Store **keywords** (Apple, ≤ 100 chars, comma-separated, no spaces): `spese,conti,bonifici,abbonamenti,budget,categorie,banca,openbanking,psd2,lileri,lillery` — mis-spellings included per `naming-analysis.md` §4.

**Full description (Apple/Google, ≤ 4,000 chars; draft, Italian):**

> **Tu spendi. Lilleri sistema.**
>
> Lilleri collega tutti i tuoi conti — banca, carta, prepagata, wallet — e tiene un unico registro corretto di quello che succede ai tuoi soldi. Da solo.
>
> **Un movimento, una volta sola.** Un bonifico tra due tuoi conti è un bonifico, non una spesa e un'entrata. Il pagamento della carta di credito non conta due volte. Il rimborso torna nella categoria da cui era partito. Il movimento "in attesa" diventa quello contabilizzato, senza duplicati.†
>
> **Le tue categorie, non le nostre.** Lilleri impara da ogni tua correzione e ti dice perché ha scelto così. Se scrivi una regola, la regola vince sempre.†
>
> **Solo quello che ha bisogno di te.** I movimenti sicuri si sistemano da soli. Quelli incerti ti aspettano in un unico posto, con una spiegazione. L'obiettivo è vederlo vuoto.†
>
> **Abbonamenti e spese ricorrenti.** Lilleri riconosce cosa paghi ogni mese, ogni due mesi, ogni anno — e ti avvisa prima del prossimo addebito.†
>
> **Pensata per l'Italia.** F24, MAV/RAV, bollettini e PagoPA, ricariche Postepay, prelievi in contanti: Lilleri sa cosa sono e li mette al posto giusto.†
>
> **Quello che non facciamo.** Non vendiamo i tuoi dati. Non prestiamo soldi. Non mettiamo pubblicità tra i tuoi movimenti. Non ti addebitiamo nulla senza avvisarti prima. Non conserviamo le tue credenziali: l'accesso ai conti è in sola lettura, tramite [AISP], intermediario autorizzato; ti autentichi direttamente sulla tua banca e puoi revocare quando vuoi. Esporti tutto in CSV e cancelli l'account in due tocchi.
>
> **Quali banche funzionano.** L'elenco aggiornato, con quello che ogni banca ci lascia vedere, è su lilleri.app/banche.
>
> Lilleri è gratis per tenere i conti in ordine. Lilleri Plus aggiunge profondità — mai la correttezza.
>
> *Lilleri, in Toscana, vuol dire soldi. "Senza lilleri 'un si lallera", dicono. Con Lilleri, almeno sai dove vanno.*

(English gloss of the closing line: "In Tuscany, lilleri means money. 'No lilleri, no fun', they say. With Lilleri, at least you know where they go.") Every † paragraph is withheld until the behaviour ships; the coverage URL assumes `lilleri.app` is secured (`naming-analysis.md` D2).

---

## 7. Messaging per plan

Plan structure and names follow `brand-strategy.md` §8 (DECISION). **Prices are not decided**; the research bands are reproduced as planning ranges only.

| Plan | Positioning line (IT / gloss) | What the copy may promise | What the copy must never say | Price context (ASSUMPTION) |
|---|---|---|---|---|
| **Lilleri** (free core) | *Tutto quello che serve per avere i conti in ordine.* (Everything you need to have your accounts in order.) | All accounts, full reconciliation, learning categories, rules, the inbox, subscriptions, export, deletion — correctness is never gated | "Gratis per sempre" (a promise that shutdown history shows cannot be guaranteed); "limitato"; "prova" (it is not a trial) | €0 |
| **Lilleri Plus** | *Più profondità. La stessa correttezza.* (More depth. The same correctness.) | Longer history, forecasts and "quanto posso spendere" (safe-to-spend), reports, priority support with a stated response time, early access | "Sblocca" (unlock) for anything that affects correctness; "Premium"; countdown offers; any renewal step-up without a reminder | Monthly Low €2.99 / Base €3.99 / High €4.99; annual Low €24.99 / Base €29.99 / High €39.99 — mid-pack versus the 2026 EU "Plus" band of €3.99–€5.99 monthly and Italian neobank tiers of €2.90–€9.99 (`user-pain-points.md` §F; `competitors-eu-uk.md` §8) |
| **Lilleri Famiglia** | *I conti di casa, in ordine insieme.* (The household accounts, in order together.) | Shared view with separate logins, per-person attribution, joint-account semantics *and* split-tagging on personal accounts (both Italian couple models) | "Membri extra a €X" gating; copying Splitwise's manual-entry model | Price UNKNOWN; must not be structured as a per-member surcharge (Emma's "extra member" pricing is a documented confusion point) |
| **Lilleri Pro** (future, not at launch) | *Personale e partita IVA, senza mischiare.* (Personal and freelance, without mixing.) | Business/personal separation, tax set-aside tracking, exports for the commercialista | Any tax-advice claim; any "commercialista" substitution claim | OPEN QUESTION |

**Billing copy rules (DECISION, from the trust priority):** a reminder e-mail and notification before any trial converts or any annual plan renews; the cancel path is in the app, one screen; price changes are announced with the old and new price side by side; "Perché pagare" (why pay) is a page in the brand voice that says plainly that subscriptions are how Lilleri stays independent of data sales and lending.

**Candidate names for the Review Inbox (OPEN QUESTION, test in Phase 1):** "Da rivedere" (plain, recommended default), "Posta" (mail — the inbox metaphor, risks confusion with e-mail), "Il Vaglio" (the sieve — ownable, slightly literary). The brand allows at most one branded noun; if "Da rivedere" tests well, none is needed.

---

## 8. Vocabulary: use / avoid

| Use (IT) | Gloss | Avoid (IT/EN) | Why |
|---|---|---|---|
| soldi, conti, movimenti | money, accounts, transactions | finanze (in headlines), transazioni, "ledger" | Register: everyday, not bank or developer |
| in ordine, sistemato, a posto, fatto | in order, sorted, settled, done | ottimizzato, smart, intelligente, magico | Order and completion, not cleverness |
| chiaro, spiegato, perché | clear, explained, why | insight, analytics, dashboard | Clarity as a human word |
| bonifico, pagamento con carta, rimborso, abbonamento, addebito | transfer, card payment, refund, subscription, direct debit | "sync", "merge", "dedupe", "pending" (use *in attesa*) | Italian payment nouns; technical terms only on the consent screen |
| sola lettura, autorizzato, scade il… | read-only, licensed, expires on… | sicuro al 100 %, livello bancario, military-grade | Candour over superlatives |
| ti chiede, ti avvisa, impara | asks you, warns you, learns | "AI-powered", "assistente", "chat" | The mechanism, not a persona |
| F24, MAV, RAV, PagoPA, SDD, Postepay | (Italian payment types, unchanged) | "tax payment", "bill" as the only label | Native semantics (`competitors-italy-and-ai-first.md` §8.1) |
| Lilleri Plus, Lilleri Famiglia | — | Premium, Metal, Gold, Ultra, Pro (consumer) | `brand-strategy.md` §8 |

**English master glossary** (for localisation; maintained with the i18n architecture): transaction = movimento; booked = contabilizzato; pending = in attesa; transfer = bonifico / trasferimento (between own accounts = *trasferimento tra tuoi conti*); card settlement = addebito della carta; refund = rimborso; rule = regola; inbox = da rivedere; consent = consenso; coverage = banche supportate.

---

## Decisions / Recommendations

| # | Decision | Type |
|---|---|---|
| D1 | Message hierarchy: Automation → Clarity → Peace of mind; Control as trust proof; Simplicity as tone, never as a claim | DECISION |
| D2 | Brand tagline: **"Tu spendi. Lilleri sistema."** — pending a 20-user comprehension and tone test; fallback #3 "I tuoi soldi, in ordine. Da soli." | DECISION (conditional) |
| D3 | "Le tue finanze si organizzano da sole." is not the tagline; used as the promise line in the corrected, honest form "Le tue finanze si mettono in ordine da sole. Lilleri ti chiede solo quando ha un dubbio." | DECISION |
| D4 | Five finalists with fixed roles (§4.3): #1 tagline, #3 hero, #4 promise/how-it-works, #14 emotional campaign, #18 trust/control | DECISION |
| D5 | Landing-page hierarchy of §5; the "Quello che non facciamo" block is mandatory on the landing page, the store listing and the pricing page | DECISION |
| D6 | Store listing Option A (title "Lilleri: soldi in ordine", subtitle the tagline, short description A) with mis-spelling keywords | RECOMMENDATION |
| D7 | Plan messaging of §7: correctness never gated; no "unlock"; reminders before every charge; "Famiglia" never priced per member | DECISION |
| D8 | Every line marked † is withheld from public copy until the behaviour ships and is measured | DECISION (from `brand-strategy.md` D6) |
| D9 | Vocabulary list of §8 is binding for product copy; the English master glossary is created with the i18n architecture | DECISION |
| D10 | The Tuscan proverb appears only in the store description's closing line, onboarding storytelling and Tuscan campaigns | DECISION (from `naming-analysis.md` D5) |

## Open questions

| # | Question | How to resolve |
|---|---|---|
| Q1 | Does "Tu spendi. Lilleri sistema." read as judgmental ("you spend [too much]") to any segment? | 20-user test, Tuscany vs Milan vs South; measure comprehension, tone, recall at 7 days |
| Q2 | English master line for non-Italian markets | Native copywriter; not a translation of the pun |
| Q3 | Name of the licensed provider to appear as `[AISP]` in all trust copy | Provider decision / ADR |
| Q4 | Does the Review Inbox need a branded noun? | Phase 1 copy test of "Da rivedere" vs "Posta" vs "Il Vaglio" |
| Q5 | Final prices and plan contents (the ranges here are research bands, not decisions) | Pricing analysis and business-model ADR |
| Q6 | Legal wording of the consent-duration sentence ("scade quando lo decidi tu o la legge") per bank (90 vs 180 days vary) | Compliance review (`regulatory-landscape.md`) |
| Q7 | Store character limits and keyword rules at submission time | Re-check Apple and Google guidelines at submission |

## Sources

All verified 2026-10-02.

| ID | Source | Used for |
|---|---|---|
| I1 | `docs/brand/brand-strategy.md` (positioning, personality, emotional territory, RTBs R1–R10, plan architecture) | §0, §1, §4, §7 |
| I2 | `docs/brand/naming-analysis.md` (proverb, mis-spellings, domain strategy, D5/D6) | §2 #24, §6 keywords, §7 |
| I3 | `docs/research/brand-competitor-analysis.md` (competitor taglines: Satispay "People Paying People" WB-01; isybank "Semplicemente banca", "Quello che ti serve, quando ti serve" WB-07; clichés §7) | §0, §3 differentiation scores |
| I4 | `docs/research/raw/user-pain-points.md` (§A pain points #1–#25, §B jobs, §D churn, §E trust, §F willingness to pay) | §1, §5, §7 |
| I5 | `docs/research/raw/competitors-italy-and-ai-first.md` (§7 creator evidence, §8 Italian payment semantics and recurring costs, §9 patterns) | §1, §5, §6, §8 |
| I6 | `docs/research/raw/competitors-eu-uk.md` (§8 EUR pricing, §11–§12 patterns; Emma extra-member pricing S-63) | §7 |
| I7 | `docs/research/raw/competitors-us.md` (§4.3 review-inbox flows, §5 patterns, §6.14 opaque AI claims) | §0, §1, §5 |
| I8 | `docs/research/raw/typography-options.md` §10 (Italian amount formatting) | §0 |
| WB-M1 | Web searches for the exact phrases "Tu spendi" + "sistema" and "si organizzano da sole" with finance-app terms (2026-10-02) returned no competitor using either line; results were generic Italian app round-ups: https://apps.apple.com/it/app/budget-e-finanze-spendee/id635861140 ; https://www.money.it/migliori-app-per-la-gestione-delle-spese-2026 ; https://www.aranzulla.it/app-per-gestione-spese-1176476.html ; https://learnn.com/blog/app-per-la-gestione-delle-spese-e-delle-entrate | §2 (weak negative; search engines index only part of the market) |
| WB-M2 | Character counts computed locally on 2026-10-02 for every store-copy candidate (Python `len()`); store limits (Apple 30/30/170, Google 30/80) from the brand team's knowledge, re-check at submission | §6 |

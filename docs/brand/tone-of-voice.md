# Tone of voice

**Status:** DECISION/specification, 2026-10-02. Italian-first customer copy; English documentation and example glosses. Based on [brand strategy](brand-strategy.md), [messaging](messaging-framework.md), [product vision](../product/vision.md), [consent](../compliance/consent-model.md) and [privacy](../compliance/privacy-model.md). Behaviour, provider, price and retention promises are publishable only when true and verified.

## Voice: a clear person beside you

Lilleri speaks like a capable person who makes a complex thing understandable. Direct, short, precise, warm and respectful. It says what happened, what is known and what the user can do. It never plays accountant, bank, aggressive consultant, chatbot friend, motivational coach or meme account. Financial stress is not a joke or a personal failing.

The voice stays stable; tone changes with context. Routine completion is brief. Uncertainty is explicit. Errors are considerate and practical. A price/consent/deletion decision is exact even when the sentence becomes longer. Italian uses **tu** without over-familiarity, imperative CTAs naming the action and neutral observations about money. Prefer “Puoi…” to instructions about how a person should live.

**Never blame the user.** A missing authentication is “Il collegamento deve essere rinnovato”, not “Non hai rinnovato”. A failed request is “Non siamo riusciti a salvare”, not “Hai inserito dati sbagliati”. An inline input error can plainly say “Inserisci un indirizzo e-mail completo” without judging the person.

## Writing rules

| DO | DON'T | Reason |
|---|---|---|
| One idea per sentence; concrete nouns/actions | Paragraph of bank/legal/developer jargon | The action should be understood on first reading. |
| “Movimento”, “conto”, “collegamento”, “in attesa” | “Transaction”, “ledger”, “sync”, “pending” in Italian UI | Everyday product vocabulary. |
| “Ultimo aggiornamento 09:42” | “In tempo reale” when data arrives periodically | Timestamp describes the actual data. |
| “Potrebbe essere…” / “Da confermare” | “Abbiamo capito tutto” / uncalibrated “98% sicuro” | Distinguish hypothesis from applied fact. |
| Say the bank/provider and real limitation | “Tutte le banche”, “funziona sempre”, “sicuro al 100%” | Coverage/security claims require evidence. |
| “Categoria aggiornata · Annulla” | “Ottimo lavoro! Sei un campione del risparmio!” | Confirm the task without scoring the person. |
| “€ 42 in più rispetto a settembre” | “Hai speso troppo, di nuovo” | Period comparison is factual; guilt is not useful. |
| Whole amount/period before billing | Monthly equivalent alone for an annual debit | A user must know what is charged. |
| “Non ora” with equal readability | “No, preferisco perdere il controllo” | No shaming opt-out. |
| Verified privacy commitments | “GDPR compliant”, “military-grade”, vague trust badges | Explain scope, recipient and control. |
| “Niente banner. Non vendiamo i tuoi dati.” | Absolute “Niente pubblicità. Mai.” when Later sponsored options remain under study | Current product commitment cannot hide a future commercial decision. |
| Real observed source/calculation | Fabricated causal story or fabricated testimonial | Confidence is built on evidence. |

Avoid “AI-powered”, magico, rivoluzionario, super, smart, premium, ottimizza, scopri il segreto, livello bancario and exclamation marks in operational copy. Do not turn a failure into a pun on *lilleri*. Tuscan heritage is an occasional editorial note, never required to understand the app. No emoji in money, consent, security, billing or error messages. No all-caps pressure.

## Copy examples: product and service

The English column is a meaning gloss, not approved English-market copy. Prices/data are examples; `[Provider]`/`[Autorità]` must be replaced with verified identities before production.

| Context | Use, Italian | English gloss | Avoid / qualification |
|---|---|---|---|
| Welcome | “I tuoi soldi, in ordine. Collega un conto: ti chiediamo solo quando c’è un dubbio.” | Your money, in order. Connect an account; we ask only when unsure. | No promise to connect every source or always remove every task. |
| Onboarding CTA | “Inizia” / “Collega Intesa” | Start / Connect Intesa | “Rivoluziona le tue finanze!” |
| Account error | “Inserisci un indirizzo e-mail completo, come nome@esempio.it.” | Enter a complete e-mail address. | “E-mail non valida!” without help. |
| Trust moment | “Lilleri legge saldi e movimenti tramite [Provider], vigilato da [Autorità]. Confermi nella tua banca. Non possiamo muovere denaro.” | Reads balances and movements through the named provider; confirm at your bank; we cannot move money. | Never claim Lilleri is a bank or licensed AISP when it is not. |
| Sync | “Sto recuperando i movimenti.” / “Sto organizzando le categorie.” | Retrieving movements / organising categories. | Show only real running stages; no fake “Quasi finito” or ETA. |
| First result | “Lilleri ha organizzato 643 movimenti. 5 richiedono la tua attenzione.” → “Controlla” | Organised 643 movements; 5 need attention → Review. | Counts come from actual completed/unresolved records; synthetic in demos. |
| Successful correction | “Categoria aggiornata.” → “Annulla” | Category updated → Undo. | “Finalmente tutto giusto!” |
| Empty Inbox | “Niente da rivedere. Ti avvisiamo quando serve.” | Nothing to review. We'll tell you when needed. | Not “Sei finanziariamente perfetto”; no disguised upsell. |
| Error | “Fineco non risponde. I tuoi dati restano aggiornati alle 09:42.” | Fineco is not responding. Your data is current as of 09:42. | Name maintenance only if known; “Errore 500”, “Pulisci la cache” and blaming the bank without evidence. |
| Unknown error | “Non siamo riusciti ad aggiornare Intesa. Non conosciamo ancora la causa.” | Could not update Intesa; cause not yet known. | Unsupported explanation. Add real retry/status option. |
| Renewal alert | “Il collegamento con Intesa deve essere rinnovato.” → “Ricollega” | Intesa connection needs renewal → Reconnect. | “Hai dimenticato di…”; never hardcode provider expiry. |
| Stale/offline | “Non sei in linea. Ultimo aggiornamento 09:42.” | Offline. Last update 09:42. | Fake live indicator; “Tutto aggiornato” after a failed retry. |
| Partial sync | “2 conti aggiornati. Fineco è ancora in aggiornamento.” | Two accounts updated; Fineco still updating. | Full success if one source is missing. |
| AI suggestion | “Potrebbe essere un trasferimento al tuo Revolut. Gli importi coincidono.” → “Conferma” / “Modifica” / “Perché?” | May be a transfer to your Revolut; amounts match. | “L’AI sa che…”; matching amount alone is not proof. Evidence preview must support the proposed relation. |
| Rule prompt | “Vuoi classificare i prossimi acquisti da Esselunga come Spesa alimentare?” → “Sì, sempre” / “Solo questo movimento” | Classify future Esselunga purchases as groceries? Always / This movement only. | Ambiguous rule scope or past backfill hidden behind Always. |
| Subscription detection | “Abbiamo trovato un possibile abbonamento Netflix: € 15,99 al mese.” | Found a possible Netflix subscription: €15.99/month. | “Stai buttando soldi”; use possible until confirmed. |
| Price alert, P1 | “Netflix è passato da € 12,99 a € 15,99.” → “Vedi addebiti” | Netflix changed from €12.99 to €15.99 → See charges. | Only comparable actual charges/established series justify certainty; otherwise “L’ultimo addebito è più alto”. |
| Spending insight | “Spesa alimentare: € 42 in più rispetto a settembre.” → “Vedi movimenti” | Groceries: €42 more than September. | Equal-period comparison with explicit cutoff; no unsupported causal claim. |
| Planning estimate | “Stima: € 612 fino al 31 ottobre.” → “Come lo calcoliamo” | Estimate: €612 until 31 October → How calculated. | “Puoi spendere €612 senza problemi”; do not show when inputs are inadequate. |
| Privacy | “Vedi chi può accedere ai tuoi dati e revoca quando vuoi.” | See who can access your data; revoke whenever you want. | Actual revoke path must exist; no vague “Tranquillo, ci pensiamo noi”. |
| External AI permission | “Per alcuni movimenti possiamo usare [Fornitore]. Prima di inviare dati, scegli tu.” → “Attiva” / “Non ora” | Some movements may use the named external provider; you choose before sending. | Add actual data/recipient/retention disclosure. No “anonimo” claim for pseudonymised data, unverified EU/no-training/no-retention promise or paywall for refusal. |
| Disconnect | “Fermeremo gli aggiornamenti di Intesa. Vuoi conservare lo storico?” | Stop Intesa updates; keep history? | Disconnect and delete consequences are separate. |
| Export | “Preparo il file con i tuoi dati. Ti mostriamo qui quando è pronto.” | Preparing the export; status shown here when ready. | Do not promise instant delivery or export an incomplete silent subset. |
| Deletion | “Elimineremo i tuoi dati finanziari. Alcuni documenti possono essere conservati per obblighi di legge: vedi quali e per quanto.” | Financial data deleted; some records may remain for legal obligations, with details. | “Cancelliamo tutto subito” when retention/cooling-off remains. |
| Service notification | “C’è un collegamento da rinnovare. Apri Lilleri per vedere i dettagli.” | A connection needs renewal; open for details. | Lock-screen merchant, amount, account or sensitive financial label. |

## Copy examples: commercial decisions

| Context | Use, Italian | English gloss / publication condition |
|---|---|---|
| Gratis scope | “Gratis include una banca e fino a due conti collegati. Puoi aggiungere conti manuali e importare file.” | One live institution/up to two accounts, manual/import alternatives; actual approved envelope required. |
| Plus paywall | “Collega più banche con Lilleri Plus. € 4,99 al mese, oppure € 39,99 all’anno in un unico addebito.” | Connect more banks; whole monthly/annual prices. **HYPOTHESIS**, prototypes visibly labelled; publish only actual entitlements/approved price. |
| Free alternative | “Continua con Gratis” | Continue free; not shaming, hidden or made to look disabled. |
| Preview proposal | “Prova Plus per 30 giorni, senza dati di pagamento. Poi torni a Gratis: nessun addebito automatico.” | 30-day non-renewing preview, no payment details. **HYPOTHESIS**, beta is free; offer only once lifecycle is implemented. |
| Renewal | “Il 2 novembre rinnoveremo Plus a € 39,99 per un anno. Puoi gestire il rinnovo qui.” | Exact date/whole amount/period and genuine store/manage route. No announcement unless the reminder can be delivered. |
| Cancellation | “Plus resta attivo fino al 2 novembre. Dopo continui con Gratis.” | Clear end date and free continuation; platform cancellation must be verified. No survey/offer blocking it. |
| Price change | “Dal 2 novembre il prezzo annuale passa da € 39,99 a € 44,99.” | Old/new total and effective date; illustrative only, not planned increase. Include notice and options required by actual contract/store rules. |
| Advertising / sponsored, Later | “Contenuto sponsorizzato da [Partner]. Lilleri riceve [commissione/compenso verificato] se [evento].” | Clearly labelled commercial content, not a product recommendation disguised as insight. **Not launch functionality**; requires separate legal/trust gate and optional consent where relevant. |
| Brand advertising | “Tu spendi. Lilleri sistema.” / “Un movimento, una volta sola.” | Selected brand line and reconciliation benefit; behaviour claims require measured/implemented evidence. Test tagline for judgement/misreading. |

Do not market Famiglia as available at launch. **Lilleri Famiglia** and €9,99/month / €79,99/year are Later hypotheses conditional on separate logins and real controlled sharing, not a cosmetic label for Plus. **Lilleri Pro** is reserved; no tax-advice promise. Name the actual product; avoid Premium/Gold/Metal/Ultra.

## UI voice and marketing voice

UI copy performs a task: factual, short, contextual. It states effect before consequence and keeps labels stable: “Ricollega”, “Perché?”, “Annulla”. Marketing may use rhythm, Italian warmth and a short story about the name. It must still carry the honesty clause, named coverage/limits and current commercial model. Marketing cannot smuggle automation, price, testimonials, coverage or privacy claims past the evidence gate.

The selected tagline “Tu spendi. Lilleri sistema.” remains a DECISION pending comprehension/tone testing. If “Tu spendi” is read as blame or permission to overspend, use the evaluated fallback “I tuoi soldi, in ordine.” rather than defend clever copy against users. Never place a spending pun in a mismatch, debt/negative-balance, consent or deletion flow.

## Italian product glossary

| IT label | Meaning / localisation source | Notes |
|---|---|---|
| Home | Overview | Public tab label retained; internal home destination. |
| Movimenti | Transactions | Everyday Italian; do not alternate with transazioni. |
| Inbox / Da rivedere | Review Inbox | Internal destination Inbox; “Da rivedere” recommended descriptive label/accessibility name. Test before freezing nav. |
| Da controllare | Needs attention | Specific diagnostic alert, not an interchangeable tab label. |
| In attesa | Pending | “Di contabilizzazione” in explanatory detail. |
| Contabilizzato | Booked | Bank-confirmed state, not merely imported. |
| Trasferimento | Transfer between own accounts | “Bonifico” describes payment channel; not every bonifico is internal. |
| Addebito carta | Card settlement | Explain spend treatment; distinguish actual card purchase. |
| Rimborso | Refund | Link to original expense where supported. |
| Dividi movimento | Split transaction | Button “Dividi”; avoid “split” in customer UI. |
| Duplicato / Unisci duplicati | Duplicate / merge | Preserve sources and undo. |
| Abbonamenti e ricorrenti | Subscriptions and recurring payments | Covers bollette/stipendio/rate/trasferimenti, not only monthly subscriptions. |
| Categorie / Regole | Categories / rules | User chooses; rule precedes suggestion. |
| Collegamenti | Data connections | “Conti” are financial accounts, not the connection permission. |
| Consenso all’accesso | Provider/bank access consent | Distinct from optional AI permission, OS permission, marketing consent and contract. |
| Permessi e privacy | Permissions and privacy | Separate toggles/recipients/effects. |
| I tuoi dati | Data ownership dashboard | Export, revoke, retention, deletion. |
| Aggiorna / Ultimo aggiornamento | Refresh / last successful update | Do not expose sync/pipeline in Italian copy. |
| Rinnova / Ricollega | Renew before expiry / reconnect after break | Follow context and real provider flow. |
| Stima / Come lo calcoliamo | Estimate / calculation | Always visible near estimated money. |
| Perché? / Annulla | Why? / Undo | Evidence and reversibility, not a chatbot prompt. |
| Gratis / Lilleri Plus | Free / paid active ladder | Famiglia Later, Pro reserved; plans do not own correctness/privacy. |

## Translation rules: EN, ES, FR, DE

Localise meaning and financial conventions; do not literally translate the Tuscan pun or invent a jokey international name. A native editor approves marketing. The stable concepts above live in the i18n glossary; complete messages include plural/number/date/currency placeholders, never concatenated fragments. Preserve uncertainty, consent distinctions, dates and whole-price periods in every language.

| Language | Proposed register / sample (not approved launch copy) | Watch for |
|---|---|---|
| English | Plain conversational: “Your money, in order.” / “Last updated at 09:42.” / “Review” | “Transaction” acceptable in detail; no literal “You spend” tagline without cultural testing; currencies by locale. |
| Spanish | Direct respectful **tú**: “Tu dinero, en orden.” / “Última actualización: 09:42.” | Regional terminology/decimal formats; no scolding “gastaste demasiado”. |
| French | Proposed respectful **vous** for trust/control: “Votre argent, en ordre.” / “Dernière mise à jour à 09:42.” | Native testing of register; required spacing/currency; no switch between tu/vous. |
| German | Proposed conversational **du**, validated by native audience: “Dein Geld, geordnet.” / “Zuletzt aktualisiert um 09:42 Uhr.” | Long compounds wrap; precise meaning of Zustimmung/Berechtigung; no forced informal joke. |

Register choices are HYPOTHESES for localisation testing, not blanket country facts. English/Spanish/French/German launch follows actual coverage/support/legal notices, not translated strings alone.

## Copy review gate

Before publishing, answer: Is it true now? Does it distinguish fact, suggestion, estimate and sample? Does it describe the next action/consequence? Could a stressed user read it as blame? Can a user decline with dignity? Is the whole price/period visible? Does it expose sensitive data on a lock screen? Is the provider/retention claim verified? Does it wrap at large text? Record unresolved claims as blockers rather than editing away the qualifier.

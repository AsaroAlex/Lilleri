# User flows

**Status:** DECISION/specification, 2026-10-02. Not a claim of implemented flows. **Scope:** P0 closed-beta core; P1 launch/billing, split/refund linking and recurring alerts explicitly marked below; Famiglia Later. Product copy is Italian with brief English glosses. Financial examples and merchant names are synthetic. Inputs: [PRD](../product/prd.md), [MVP](../product/mvp.md), [personas](../product/personas.md), [jobs](../product/jobs-to-be-done.md), [consent](../compliance/consent-model.md), [privacy](../compliance/privacy-model.md), [voice](../brand/tone-of-voice.md).

## Flow contract

Every flow has an entry, one primary action, decision branches, failure/recovery and a clear end. Async writes are idempotent; keep the prior state until confirmation. Only genuine provider/pipeline events change progress. P0 BALANCED/CONTROL modes and every explicit rule take precedence over suggestions. An optional permission is never an entitlement. Navigation back preserves context and entered data.

**Never-gated controls:** correctness/reconciliation, categories and rules, review/undo, connection revocation, privacy/security, export and deletion. Gratis's live connection envelope is displayed before connect: one institution, up to two synced accounts; manual/imported sources remain available. The envelope is a business hypothesis to validate, not an accuracy restriction. Closed beta is free; billing copy below is a public-launch design.

## 1. Onboarding: first useful picture

| Step | User view/action | Branch, failure and recovery |
|---|---|---|
| Welcome | “I tuoi soldi, in ordine.” / “Collega un conto. Lilleri organizza i movimenti e ti chiede solo quando ha un dubbio.” (Connect an account; asks only when unsure.) CTA “Inizia”. | “Guarda un esempio” opens visibly labelled **Dati di esempio**. It never creates a fake connection or implies the sample is the user's data. |
| Account | E-mail → verification → passkey; supported password/authenticator fallback. Explicit age attestation “Ho almeno 18 anni” and Terms acceptance are separate required controls. Privacy notice is linked and acknowledged, not optional-processing consent. | Invalid mail preserves input. Unverified mail → “Controlla la tua e-mail” / “Invia di nuovo”. Passkey cancellation offers fallback. Under 18 cannot proceed; no ID collection invented. |
| Select source | Search institution/account type; live coverage status and known limits. CTA “Collega Intesa”. | Unsupported/unknown route → “Non ancora collegabile” / “Aggiungi a mano” or “Importa un file”. Never show “supportata” based only on an unverified provider list. |
| Trust moment | “Come funziona il collegamento”: named licensed entity **[Provider]**, supervisor **[Autorità]**, what is read (saldi/movimenti), what cannot happen (move money), next redirect and duration policy. CTA “Continua con [Provider]”. | Provider identity and licence text are verified release inputs. Placeholders block live publication. Users can go back without losing account creation. |
| Provider consent | Provider-hosted/mandated wording; identify Lilleri as recipient. | Do not replace required copy. Decline/cancel returns to picker with “Collegamento non completato” and fallback. |
| Bank authentication | App-to-app/browser bank SCA; Lilleri never collects banking credentials. | Return state checked server-side; duplicate callback does not duplicate account. Timeout/cancel/invalid redirect shows reconnect option and preserved state. |
| Real sync | “Sto recuperando i movimenti” → “Sto riconoscendo i negozi” → “Sto organizzando le categorie” → “Sto cercando pagamenti ricorrenti”. Show only running/completed stages supported by telemetry. | No fake progress bar/percent/ETA. “Puoi chiudere questa schermata. Ti ritroviamo qui quando i dati sono pronti.” CTA “Continua più tardi”. On failure, source/status/last successful time and retry. |
| First picture / WOW | “Cosa ho capito”. **Example:** “Lilleri ha organizzato 643 movimenti. 5 richiedono la tua attenzione.” CTA “Controlla”. Month totals, real history window, visible transfer pair and last update follow. | Replace 643/5 with actual counts; organised excludes unresolved/skipped records. Partial sync is explicitly “Prima parte pronta”. Zero data is not a zero financial balance. |
| Optional external-AI permission | After first value, disclose the actual external vendor(s), minimal data and real handling policy. “Attiva” / “Non ora”, equal readability. Both continue; rules/in-house classification work. | No data sent externally before grant. Refusal is recorded to avoid repeated prompts. Vendor changes require new disclosure before sharing. Never promise EU residence/no retention without contract evidence. |
| Optional service notifications | In context after a review/renewal need: “Ti avvisiamo quando c’è qualcosa da rivedere o un collegamento da rinnovare.” → “Attiva avvisi” / “Non ora”, then OS prompt. | OS refusal retains in-app indicators. Marketing is a separate optional setting, off by default. No repeated OS prompt or forced settings excursion. |

Trust copy template: “Per leggere saldi e movimenti, Lilleri usa **[entità autorizzata]**, vigilata da **[autorità]**. Nella prossima schermata autorizzi [Provider] e poi confermi nella tua banca. Lilleri non può muovere denaro. La banca può chiederti di rinnovare l’accesso; ti mostreremo la data del collegamento.” (Names who reads, who regulates, what happens next and renewal.) Once selected, display the exact available duration/expiry from the provider. 180 days is a regulatory reference, **not a duration invented for every connection**.

First sync must state the real `history_from`: “Movimenti disponibili dal 2 luglio. Puoi aggiungere lo storico con un file.” Not a universal claim of “tre mesi”. A single-institution first picture shows supported recurring payments and a safe-to-spend **estimate only if enough inputs exist**. The second-institution nudge explains pairing and shows Plus cost before opening payment. Home remains useful on Gratis.

## 2. Connect, refresh and renew an institution

Entry: Impostazioni → Collegamenti → “Aggiungi collegamento”, or account/context recovery. Before submitting show account types, unavailable types, provider and plan envelope. A user exceeding Gratis chooses Plus, a manual/import route or back; existing connected data remains correct/exportable.

After SCA: select only accounts the provider actually exposes → confirm → sync → connection detail. If the same account exists, offer reconnection to its history rather than a second copy. “Collegato” is displayed only after verified callback; “Dati in aggiornamento” covers the remaining ingestion.

Renewal: reminder → “Il collegamento con Intesa deve essere rinnovato” (Intesa connection needs renewal) → **“Ricollega”** → pre-redirect explanation → provider renewal/bank SCA → verified expiry → catch-up sync. The management screen may use “Rinnova” before expiry; the recovery banner uses “Ricollega” after expiry. Do not create an account or erase history during renewal.

Dates always come from provider `expires_at`; 150/170/178-day reminders from the 180-day model are adapted to shorter/unknown windows rather than assuming 180 days. Stop reminders after renewal or disconnect. “Rinnova tutti” is a batch itinerary with separate required provider/bank authorisations, never a claim of one shared consent. Late renewal checks actual history gaps: “Mancano i movimenti dal 1 maggio al 16 giugno” → “Importa un file”. Rate-limited refresh shows the real next retry and avoids a button that submits forbidden requests.

## 3. Review Inbox: only decisions that need you

Entry: badge/Home “5 da rivedere” → Inbox. Cards show merchant, date/amount/source, proposed answer and reason. Correction count never includes marketing or every successfully classified row.

| Action | Short path | Safeguard/end |
|---|---|---|
| Confirm | “Conferma” or optional swipe-right → applied proposed classification | One interaction; “Confermato · Annulla”. |
| Category | Tap category → select/search category | Two common interactions; save returns to next card. Create category is a longer intentional path. |
| Transfer | “Altre azioni” → “Trasferimento”; if one evidence-supported candidate exists, preview/confirm pair | Selection needs additional steps when candidates are ambiguous. Never force an unsafe two-tap financial match merely to meet a UX target. |
| Split, P1 | “Dividi” → child amounts/categories → “Salva divisione” | Longer advanced flow; sum must equal original. |
| Duplicate | “Duplicato” → evidence preview → “Unisci” | Preserve both source records; reverse merge from detail. |
| Refund, P1 | “Rimborso” → original expense candidate → link | Partial amount allowed; no inferred salary classification. |
| Ignore | “Ignora suggerimento” | Dismisses the proposal; retains movement and totals. Hiding/excluding a financial movement is a separate explicit decision. |

The one/two-interaction target applies to routine confirm/category decisions with safe proposals. Advanced links require preview; labelled menu equivalents support screen readers and keyboard. A swipe never deletes records. Inbox zero: “Niente da rivedere. Ti avvisiamo quando serve.” (Nothing to review; we'll tell you when needed.) No upsell interrupts this state.

## 4. A correction teaches only what the user chooses

After changing Esselunga to Spesa alimentare, save this movement first. Non-blocking prompt: “Vuoi classificare i prossimi acquisti da Esselunga come Spesa alimentare?” (Classify future Esselunga purchases as groceries?) → **“Sì, sempre”** / “Solo questo movimento”. “Household” from an English example is not Italian UI copy; merchant scope and category are localised.

“Sì, sempre” previews merchant-match scope, account/profile and future-only effect → create rule → “Regola creata · Modifica”. Existing transactions change only through a separate “Applica anche a 12 movimenti” preview with affected count and undo. “Solo questo movimento” preserves the saved correction and asks no second time in that session. A failed rule save says “Il movimento è aggiornato. La regola non è stata salvata.” and offers retry without rolling back the correction.

## 5. Transaction detail and “Perché?”

Movimenti/search → row → detail: amount/currency/date/status, full merchant, original description, account, category and linked relationships. Edit actions below evidence, not a crowded icon toolbar. “Perché?” → decision sheet with “Regola scelta da te”, deterministic evidence or explicit uncertainty, effect on totals, sources and “Modifica”/“Annulla”.

Pending: “In attesa di contabilizzazione. L’importo può cambiare.” → no invented booked date. On booked arrival keep identity/navigation and show confirmed final amount. A card-settlement label explains whether the row was excluded from spend and why; a missing card source remains a limitation, not proof of every underlying purchase.

## 6. Split, transfer, refund and duplicate semantics

| Flow | Steps and copy | Validation/failure/reversal |
|---|---|---|
| Split, P1 | Detail → “Dividi movimento” → original read-only € 90,00 → two children (Spesa €60, Casa €30) → add/remove child → “Salva divisione” | Child sum exactly equals parent in minor units; show “Restano € 5,00 da assegnare”. No double-counting parent + children. Undo restores original allocation; user can edit a saved split. |
| Transfer | Detail → “Segna come trasferimento” → source/destination evidence, other leg candidates → “Conferma trasferimento” | Pair must satisfy currency/amount/account evidence. Unknown other leg → mark as an unpaired transfer with limitation, not fabricate it. Before save: “Non conterà come spesa o entrata.” Undo restores prior interpretation. |
| Refund, P1 | Detail → “Collega a una spesa” → candidates by amount/date/merchant → full/partial preview → “Collega rimborso” | Refund may be smaller; prevent aggregate linked refunds above expense without an explicit exception. Show effect in original category/period policy; do not claim a settlement transfer is a refund. Undo retains both source rows. |
| Duplicate | Detail/Inbox → “Confronta movimenti” → sources, amounts, dates/status → select canonical presentation → “Unisci duplicati” | Show “Vedrai un solo movimento; conserviamo entrambe le fonti.” Never erase a raw record. Distinct same-day/amount legitimate purchases can be “Due acquisti diversi”; remember feedback. Undo restores both presentations/totals. |

## 7. Categories: create, rename, merge, archive

Settings → Categorie, or picker “Nuova categoria”. Create name/icon/optional colour; income/expense/transfer type preserved. Rename changes the user label, not the canonical identity. Duplicate/blank names receive a local inline explanation; large names remain readable.

Merge: select category → “Unisci con…” → destination → preview **count of transactions, rules and recurring labels** to migrate → “Unisci categorie”. History follows the selected taxonomy; no amount changes. Conflicting rules are surfaced before save. Archive: explain “Non la proporremo per i nuovi movimenti. Lo storico resta qui.” User chooses whether to migrate existing assignments; migration preview is explicit and reversible where stored. Do not silently recategorise archived history as Altro. Hiding/“Privata” suppresses sensitive narratives as specified in privacy; it does not falsify the spending total.

## 8. Rules and automation control

Settings → Regole → list with merchant/condition/action/scope and enabled status → create/edit → preview matching examples → save. Include order/conflict explanation in human language, “Questa regola ha la precedenza”, rather than a priority integer. Rule conditions are merchant/account/date context where supported, not arbitrary code. Disable/delete requires clear scope and preserves historical manual decisions; optional backfill is separate.

Settings → Automazione → BALANCED “Chiedi quando c’è un dubbio” (default) / CONTROL “Fammi confermare le decisioni”. Explain that CONTROL requests more review. AUTOPILOT is P1 after calibrated evaluation; do not render it as an unavailable paid shortcut. Explicit rule still wins in every mode.

## 9. Recurring payments and subscriptions

Insight → Abbonamenti e ricorrenti → list grouped by next date and actual type (abbonamento, bolletta, stipendio, trasferimento ricorrente, rata). Each item has expected amount/range, cadence, estimated next date and evidence. “Ricorrenza proposta” → confirm/not recurring; a one-off must not become a certain subscription.

P1 price-change alert: **“Netflix è passato da € 12,99 a € 15,99.”** Only when two comparable actual charges and an established series support it; otherwise “L’ultimo addebito Netflix è più alto di € 3,00. Controlla se è cambiato il prezzo.” → “Vedi addebiti” → compare → confirm/not a price increase. Exclude FX/refunds/partial periods where they make the comparison invalid. No “Annulla abbonamento” button unless a real supported external cancellation route exists; links to provider details are labelled external. Quiet-set sensitive merchants do not produce unsolicited recurrence narratives.

## 10. Insights and the formula

Home/Insight → one observation → “Perché?” → exact source period and calculation with estimate/confidence qualifier → “Vedi movimenti”/supported corrective action. Example: “Spesa alimentare: € 42 in più rispetto a settembre” with equal period/date cutoff and booked movement policy. No invented causal explanation such as “Hai comprato più spesso” from totals alone.

Safe-to-spend: “Stima: € 612 fino al 31 ottobre” → “Come lo calcoliamo” → available balances minus known scheduled outflows/reserves, pending treatment and excluded sources. Missing/stale sources suppress or clearly qualify the estimate. It is a planning estimate, not spending permission, credit advice or a guaranteed forecast.

## 11. Privacy dashboard: control and exit

Impostazioni → **I tuoi dati** / Permessi e privacy. Show connections, permission toggles, “Cosa conserviamo e perché”, export and deletion as ordinary controls, independent of plan.

| Task | Steps | Consequence/recovery |
|---|---|---|
| Revoke connection | Collegamenti → institution → “Scollega” → re-auth → choose “Conserva lo storico” / “Elimina i dati di questa banca” → confirm | Revoke at provider, stop refresh, remove access tokens. Distinguish revocation requested from confirmed if provider fails. Kept history shows disconnected date; deletion explains dependent matches/totals before submission. |
| Pause | Institution → “Metti in pausa” → duration/meaning → confirm | Stops Lilleri refresh as supported; **does not claim consent revoked**. “Riprendi” verifies consent before fetching. |
| AI permission | Permessi → external-AI toggle off | Stops future external sharing; categories remain; in-house/rule fallback. No fear copy or loss of correctness. |
| Export | “Esporta i dati” → re-auth → format/scope → start → job state → expiring secure download/share | No attachment containing financial data via third-party analytics. Network failure resumable. Unavailable export shows truthful status and support route. |
| Delete account | “Elimina account” → re-auth → concise data/retention summary → optional export → explicit confirmation | Show actual deletion deadline/cooling-off policy, provider revocation and subscription cancellation route; no promise “everything immediately” when legal records remain. Do not force a reason, survey or call. Unsubscribe and deletion remain separate consequences. |
| Retention | “Cosa conserviamo e perché” → readable inventory | States retained records, reason, actual period and rights/contact. Link detailed notice; never replace it with vague “GDPR compliant”. |

Deletion confirmation: “Elimineremo i tuoi dati finanziari e fermeremo i collegamenti. Alcuni documenti possono essere conservati per obblighi di legge: vedi quali e per quanto.” Final timelines must come from ratified retention/counsel policy; the seven-day cooling-off and ≤30-day completion model remains a specification pending that ratification. User can cancel deletion during the actual supported cooling-off period. No blocking save offer.

## 12. Gratis → Plus and cancellation (P1 public launch)

Entry only at a concrete extra capability or second live institution, after first value. Explain the free envelope before launching payment. Paywall shows **Lilleri Plus**, actual entitlements and never-gated controls. Sample **HYPOTHESIS**: “€ 4,99 al mese” or “€ 39,99 all’anno, addebitati in un’unica soluzione”. Annual is not displayed only as a monthly equivalent. Prototype carries “Prezzi ipotetici · nessun addebito”. No Famiglia checkout; €9,99/month or €79,99/year are Later research hypotheses conditional on real sharing. Pro reserved.

Choose monthly/yearly → full renewal/total price and store route → explicit purchase → OS/store confirmation → verified entitlement → return to task. Cancelled/failed purchase preserves Gratis. Pending purchase says pending; restore purchases is visible. “Continua con Gratis”/close is readable. No fake countdown, scarcity, pre-ticked optional consent or forced trial/card. **HYPOTHESIS:** offer a 30-day non-renewing Plus preview without payment details: “30 giorni, poi torni a Gratis. Nessun addebito automatico.” This requires an implemented preview lifecycle and does not create a paid subscription; beta remains free. An automatically renewing trial is not part of this proposal.

Impostazioni → Abbonamento → “Gestisci abbonamento” → platform management link or supported direct cancel → confirmation of period end and next entitlement. Show “Plus attivo fino al 2 novembre”; no unsupported promise that the app can cancel an App Store purchase itself. After downgrade choose which eligible accounts keep sync; others remain “In pausa”, history/export intact. Retention is not a leverage point. Annual renewal/trial conversion reminders require an actual schedule and delivery state; price increases show old/new total and effective date.

## 13. Degraded modes: the number tells the truth first

| State | Visible copy/action | Behaviour |
|---|---|---|
| Offline | “Non sei in linea. Dati aggiornati alle 09:42.” → “Riprova” once connectivity returns | Read-only cache; no false saved confirmation for unsent writes. P1 queued writes visibly pending and cancellable. |
| Bank/provider down | “Fineco non risponde. Ultimo aggiornamento riuscito: 09:42.” → “Vedi stato” or eligible retry | Name maintenance only if known; otherwise “Non conosciamo ancora la causa”. Display next retry only when scheduled. |
| Stale | “Include Intesa aggiornata ieri alle 18:10” → “Aggiorna collegamenti” | Qualify aggregate; avoid implying the newest source timestamp covers all accounts. |
| Expired consent | “Il collegamento con Intesa deve essere rinnovato.” → “Ricollega” | Keep history and last good time. Neutral “In pausa” state; no deleted account or generic system error. |
| Partial sync | “2 conti aggiornati. Fineco è ancora in aggiornamento.” → “Vedi dettagli” | Ready subsets visible and labelled; no complete-success count or unexplained lower balance. |
| No data yet | “La banca non ha restituito movimenti per questo periodo.” → change period/import if appropriate | Different from zero spending and from failed retrieval. |
| Balance mismatch | “Il saldo Revolut differisce di € 5,00 da quello ricevuto dalla banca.” → “Controlla” | Detail shows source timestamps and known candidate causes; re-fetch state. Do not invent cause or silently adjust balance. |
| Rate limit | “Il prossimo aggiornamento è previsto alle 13:00.” | Genuine schedule/quota; only expose manual refresh if provider permits it. |

## 14. Verification and unresolved choices

Test each branch with synthetic provider fixtures; include cancel during SCA, late callback, duplicate callback, unknown expiry, short expiry, unavailable bank, 0 movements, skipped row, declined AI, declined push, failed correction, failed rule, refund ambiguity, split imbalance, stale FX, failed export, pending purchase and downgrade. Semantic analytics contain outcome/type/count buckets only; never merchant, descriptor, amount, IBAN, account ID or free text.

User study remains OPEN: can P1/P4 explain read-only access before redirect, recognise a paired transfer, find “Perché?”, decline a rule/AI permission, distinguish stale from live data and leave with an export? Targets in MVP are hypotheses. The [quality gate](visual-quality-gate.md) defines visual/accessibility evidence; these flows do not certify implementation, coverage, billing, regulatory approval or measured accuracy.

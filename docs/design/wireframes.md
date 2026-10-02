# Wireframes

**Status:** DECISION/specification, 2026-10-02. Text wireframes, not rendered-screen verification. Copy/data are synthetic Italian examples. Screens marked P1 are public-launch/expansion designs, not implemented beta claims. Each frame uses semantic warm-paper/wine colours, Geist, tabular money and the paired-line/dot signature described in [principles](design-principles.md). Actual typography, theme and target sizes are specified in [design system](design-system.md).

Legend: `[Filled CTA]` = one primary action; `(Link)` = quiet secondary; `>` = detail navigation; `•` = state accompanied by a text label, never colour alone. On mobile keep safe-area insets, scrolling large text and ≥44 pt targets. ASCII does not prescribe fixed pixel widths. Main navigation is **Home / Movimenti / Inbox / Insight / Impostazioni**; “Da rivedere” is the proposed accessible Inbox name. Test whether it should also be the visible label.

## 1. Splash

```text
┌───────────────────────────────┐
│                               │
│           [li + dot]          │
│            Lilleri            │
│                               │
└───────────────────────────────┘
```

**Task:** restore/start a session. **Primary:** automatic transition, no button. **Secondary:** none. **Hierarchy:** mark/name only; never delay a ready session for a brand film. **Confusion:** long splash could suggest freeze; after a real delay show meaningful loading/recovery. **Remove:** tagline, rate us, ads, fake progress. **Brand:** recognisable monochrome-capable mark on paper; static in reduced motion.

## 2. Welcome / onboarding

```text
┌───────────────────────────────┐
│ Lilleri                       │
│                               │
│ I tuoi soldi, in ordine.      │
│ Collega un conto. Ti chiediamo │
│ solo quando c’è un dubbio.     │
│        ────  ────  → ──── •   │
│ [Inizia]                      │
│ (Guarda un esempio)           │
│ (Ho già un account)           │
└───────────────────────────────┘
```

**Task:** understand value and start. **Primary:** Inizia. **Secondary:** example/sign-in. **Hierarchy:** promise → one line of honest automation → action. **Confusion:** an example can look like personal money; example route always says “Dati di esempio”. **Remove:** feature carousel, setup quiz, push/AI requests. **Brand:** small paired-line illustration and warm editorial welcome; Newsreader permitted only in this headline, not controls.

## 3. Account creation

```text
┌───────────────────────────────┐
│ ‹ Indietro                    │
│ Crea il tuo account           │
│ E-mail                        │
│ [nome@esempio.it             ] │
│ □ Ho almeno 18 anni           │
│ □ Accetto i Termini           │
│ Informativa privacy (link)    │
│ [Continua]                    │
│ (Accedi)                      │
└───────────────────────────────┘
```

**Task:** create verified identity. **Primary:** Continua; next screen verifies e-mail then offers passkey. **Secondary:** sign-in/back. **Hierarchy:** one input → required age/contract → linked notice. **Confusion:** privacy notice must not be labelled optional GDPR consent; no bundled marketing consent. **Remove:** name/address/income/location requests, card details, competing social-login row without justification. **Brand:** generous spacing and direct everyday copy; inline errors retain input.

## 4. Connection trust moment

```text
┌───────────────────────────────┐
│ ‹ Indietro                    │
│ Come funziona il collegamento │
│ Leggiamo saldi e movimenti.   │
│ Non possiamo muovere denaro.  │
│ Accesso tramite [Provider],   │
│ vigilato da [Autorità].       │
│ Confermi nella tua banca.     │
│ Durata: [dato verificato]     │
│ [Continua con Provider]       │
│ (Come revocare l’accesso)     │
└───────────────────────────────┘
```

**Task:** make an informed redirect decision. **Primary:** continue to actual provider. **Secondary:** revoke explanation/back. **Hierarchy:** scope and limitations → named entity → next step/duration → CTA. **Confusion:** provider name may differ on bank screen; explicitly explain exact legal entity. Unknown identity/placeholder blocks live release. **Remove:** decorative shields, “sicuro al 100%”, unsupported “bank-level”, checkbox for every sentence. **Brand:** warm plain language, no sales tone.

## 5. Select / connect institution

```text
┌───────────────────────────────┐
│ ‹        Collega un conto     │
│ [Cerca banca o fonte        ] │
│ Intesa Sanpaolo       >       │
│ Conto • Collegabile           │
│ [limiti verificati per carta] │
│ Satispay              >       │
│ Non ancora collegabile        │
│ (Aggiungi a mano)             │
│ (Importa un file)             │
└───────────────────────────────┘
```

**Task:** choose a supported route/account type. **Primary:** select institution then connect. **Secondary:** manual/import/back. **Hierarchy:** search → institution + coverage → alternative. **Confusion:** a bank logo is not proof all its cards work; type coverage is explicit and current. **Remove:** “tutte le banche”, endless icon wall, favoured affiliate institution. **Brand:** bank logos retain their own assets; Lilleri owns the frame, without recolouring/mimicking co-brand endorsement.

## 6. Sync

```text
┌───────────────────────────────┐
│ Sto organizzando i movimenti  │
│ ✓ Intesa collegata            │
│ ✓ Movimenti recuperati        │
│ • Sto riconoscendo i negozi   │
│   Categorie: in attesa        │
│   Ricorrenti: in attesa       │
│ [Vedi i dati già disponibili] │
│ (Continua più tardi)          │
└───────────────────────────────┘
```

**Task:** understand real work and continue safely. **Primary:** see ready data when present; no CTA before any data exists. **Secondary:** leave/recovery. **Hierarchy:** actual running stage → completed evidence → useful exit. **Confusion:** completed connection ≠ completed ingestion; terms stay distinct. **Remove:** invented percentage/ETA, rotating “AI magic”, trapped indefinite spinner. **Brand:** paired lines settle into one dot only on real completion; static state labels survive reduced motion.

## 7. Home: two alternatives and choice

Variant A, **month-first**, selected:

```text
┌───────────────────────────────┐
│ Ottobre 2026          Periodo │
│ Spese del mese                │
│ € 1.248,72                    │
│ Ultimo aggiornamento 09:42    │
│ Conti inclusi (3) >           │
│                               │
│ 5 movimenti da rivedere       │
│ [Controlla]                   │
│                               │
│ Cosa è cambiato               │
│ Spesa alimentare: +€ 42       │
│ rispetto a settembre         │
│ (Perché?) (Vedi movimenti)    │
│                               │
│ In arrivo                    │
│ Netflix • stima 28 ott €15,99 │
│ (Tutti i ricorrenti)          │
│ Home Movimenti Inbox Insight │
│                 Impostazioni │
└───────────────────────────────┘
```

Variant B, **balance-first**, evaluated:

```text
┌───────────────────────────────┐
│ I tuoi conti                  │
│ Saldo disponibile € 8.412,40  │
│ Intesa €4.800 • Fineco €3.212 │
│ Revolut €400                  │
│ Spese mese € 1.248,72         │
│ [Controlla 5 movimenti]       │
│ Stima fino al 31: € 612       │
│ (Come lo calcoliamo)          │
└───────────────────────────────┘
```

**DECISION:** select A because it leads with the month-understanding job and one clear repair action. B makes account coverage immediately apparent but encourages several comparable amounts and confuses aggregate balance with guaranteed spending capacity. Available balances remain one tap away in A; safe-to-spend is a separately labelled estimate only when supported. This is a reasoned prototype decision, not user-validated preference.

**Task:** know the month, see the next useful action. **Primary:** Controlla when review exists; otherwise the one actionable insight. **Secondary:** source/period/detail links. **Hierarchy:** month total → freshness/coverage → attention → one explanation → upcoming preview. **Confusion:** stale/partial totals must qualify the headline; review repair supersedes upbeat insight. **Remove:** six tiles, carousel of upsells, multiple charts, daily caps, leaderboard. **Brand:** paper, wine CTA, aligned amounts and paired-line signature; calm without hiding evidence.

First-use sheet/header, not a permanent extra card: “Cosa ho capito: Lilleri ha organizzato **[actual count]** movimenti. **[actual unresolved count]** richiedono la tua attenzione.” Show available history start and an actual transfer pair. No success ceremony for a mismatch.

## 8. Transactions

```text
┌───────────────────────────────┐
│ Movimenti           Ottobre >│
│ [Cerca movimento            ] │
│ Filtri (2)  Tutti/In attesa   │
│ Oggi                          │
│ Esselunga          −€ 42,50   │
│ Spesa alimentare · Intesa     │
│ Intesa → Revolut    € 200,00  │
│ Trasferimento · Escluso spese │
│ Negozio lungo…      −€ 18,00  │
│ In attesa · Da rivedere       │
│ [Tab bar]                    │
└───────────────────────────────┘
```

**Task:** find and verify a movement. **Primary:** row detail. **Secondary:** search/filter/period. **Hierarchy:** date grouping → merchant + exact money → category/source/status. **Confusion:** transfers lack expense sign and say exclusion; pending stays explicit. **Remove:** merchant logos without reliable data, edit icons on every row, dense running-balance column. **Brand:** consistent tabular amount alignment; long merchant wraps, money does not truncate. Virtualise 100+ rows while preserving accessible navigation and scroll return.

## 9. Transaction detail

```text
┌───────────────────────────────┐
│ ‹ Movimenti                   │
│ Esselunga                     │
│ −€ 42,50                      │
│ Contabilizzato • 2 ottobre    │
│ Intesa ••••1234               │
│ Categoria: Spesa alimentare > │
│ Regola scelta da te (Perché?)│
│ Descrizione originale >      │
│ [Modifica categoria]          │
│ (Altre azioni) (Cronologia)   │
└───────────────────────────────┘
```

**Task:** inspect meaning and correct it. **Primary:** contextual edit. **Secondary:** why/source/history/actions. **Hierarchy:** merchant/money/status → source → category/evidence → edit. **Confusion:** original descriptor and normalised merchant are distinct; “Perché?” shows genuine evidence. **Remove:** decorative pie chart, “AI 98%” badge, raw IDs. **Brand:** spacious readable financial detail; correction/undo matches Inbox.

## 10. Review Inbox

```text
┌───────────────────────────────┐
│ Da rivedere                 5│
│ SUMUP *BAR CENTRALE          │
│ −€ 8,50 · ieri · Intesa      │
│ Potrebbe essere Caffè e bar.  │
│ (Perché?)                    │
│ [Conferma] [Categoria >]      │
│ (Altre azioni)               │
│                             │
│ Dopo il salvataggio:         │
│ Categoria aggiornata Annulla │
│ [Tab bar]                    │
└───────────────────────────────┘
```

**Task:** resolve an ambiguity with a proposal. **Primary:** confirm. **Secondary:** category/labelled action menu/why. **Hierarchy:** identity/amount → proposed answer/reason → action. **Confusion:** Ignore dismisses suggestion, not financial history; explain before action. **Remove:** upgrade prompt, approve-all without preview, full-screen confetti, mandatory swiping. **Brand:** emptiness is valued: “Niente da rivedere.” Same language/visual confirmation as detail.

## 11. Category management

```text
┌───────────────────────────────┐
│ ‹ Impostazioni   Categorie   │
│ [Cerca categoria            ] │
│ Spesa alimentare    243 >    │
│ Casa                118 >    │
│ Farmacia • Privata    12 >   │
│ [Nuova categoria]            │
│ Detail: Rinomina / Unisci >  │
│         Archivia / Nascondi  │
└───────────────────────────────┘
```

**Task:** organise labels without corrupting history. **Primary:** create/contextual save. **Secondary:** rename/merge/archive/hide. **Hierarchy:** names → meaningful record count → management. **Confusion:** archive vs delete vs hide require consequence text; merge preview migrates transactions/rules. **Remove:** paywall, canonical IDs, mandatory rainbow palette. **Brand:** small category icon + readable text, restrained colour; sensitive categories do not create narratives.

## 12. Rules and creation prompt

```text
┌───────────────────────────────┐
│ ‹ Impostazioni      Regole   │
│ Esselunga → Spesa alimentare │
│ Prossimi acquisti • Attiva > │
│ [Nuova regola]               │
│                             │
│ Prompt dopo una correzione:  │
│ Stessa categoria per i       │
│ prossimi acquisti Esselunga? │
│ [Sì, sempre]                 │
│ (Solo questo movimento)      │
└───────────────────────────────┘
```

**Task:** intentionally define future behaviour. **Primary:** save rule/Sì sempre. **Secondary:** decline/edit/disable. **Hierarchy:** condition → effect → scope → confirmation. **Confusion:** correction is already saved; past transactions need a separate backfill preview. **Remove:** threshold tuning, code-like expressions, default-selected rule consent. **Brand:** compact exact promise; visual paired condition/result and undo.

## 13. Recurring payments

```text
┌───────────────────────────────┐
│ ‹ Insight     Abbonamenti e  │
│               ricorrenti     │
│ Prossimi 60 giorni           │
│ Netflix • Abbonamento       >│
│ Stima: 28 ott • € 15,99      │
│ Enel • Bolletta             >│
│ Ogni 2 mesi • € 60–80       │
│ (Mostra ricorrenze proposte)  │
└───────────────────────────────┘
```

**Task:** see expected charges and verify detection. **Primary:** item detail/confirm proposed recurrence. **Secondary:** filter/evidence/correct cadence. **Hierarchy:** date → payment identity/type → expected amount/date confidence. **Confusion:** expected debit is not guaranteed and not cancelled by deleting a detected series. **Remove:** “cancel subscription” without supported route, unsolicited sensitive-merchant stories, generic “monthly” for bimonthly bills. **Brand:** orderly timeline, textual type and quiet separators. Price alerts are P1.

## 14. Insight and explanation

```text
┌───────────────────────────────┐
│ Insight            Ottobre >│
│ Cosa è cambiato              │
│ Spesa alimentare             │
│ € 42 in più di settembre    │
│ Confronto 1–20 di ogni mese  │
│ [Vedi movimenti]             │
│ (Perché?)                    │
│                             │
│ Sheet: Come lo calcoliamo    │
│ Ottobre €242 − Settembre €200│
│ Fonti, esclusioni, aggiorn.  │
└───────────────────────────────┘
```

**Task:** understand a supported change and inspect evidence. **Primary:** evidence/action. **Secondary:** why/period. **Hierarchy:** one statement → comparable period → action → calculation on demand. **Confusion:** total change does not establish behaviour or cause; qualifiers include pending/FX exclusions. **Remove:** financial coaching, unexplained “AI score”, six series, guilt language. **Brand:** editorial clarity with UI Geist, signature alignment in equation; direct labels if a chart is necessary.

## 15. Settings / privacy dashboard

```text
┌───────────────────────────────┐
│ Impostazioni                 │
│ Collegamenti               > │
│ Categorie / Regole         > │
│ Automazione                > │
│ I tuoi dati                > │
│ Permessi e privacy         > │
│ Abbonamento                > │
│ Aspetto / Lingua           > │
│ Assistenza                 > │
│ [Tab bar]                    │
└───────────────────────────────┘
```

Privacy detail:

```text
┌───────────────────────────────┐
│ ‹             I tuoi dati   │
│ Cosa conserviamo e perché  > │
│ [Esporta i dati]             │
│ (Gestisci collegamenti)      │
│ (Elimina account)            │
│                             │
│ Permessi separati:           │
│ AI esterna       [disattiva] │
│ Avvisi servizio  [stato OS]  │
│ Marketing        [spento]    │
└───────────────────────────────┘
```

**Task:** exercise control/find exit. **Primary:** contextual task, export in data view. **Secondary:** retention/delete/permissions. **Hierarchy:** regular management → privacy/data → support. **Confusion:** revocation, data deletion and subscription cancellation have different effects; each is described. **Remove:** hidden delete, reason questionnaire, bundled opt-ins, paid privacy upgrade. **Brand:** calm trustworthy language; destructive action legible without sensational red layout.

## 16. Manage connections

```text
┌───────────────────────────────┐
│ ‹            Collegamenti   │
│ Intesa • Da rinnovare        │
│ Dati aggiornati ieri 18:10   │
│ [Ricollega]                  │
│ Fineco • Attivo             >│
│ Scade [data provider]        │
│ Revolut • In pausa          >│
│ [Aggiungi collegamento]      │
│ Detail: provider, conto,     │
│ scope, date, pausa/scollega  │
└───────────────────────────────┘
```

**Task:** identify access and repair it. **Primary:** Ricollega for blocked source; Add is secondary in that context. **Secondary:** detail/refresh/pause/disconnect. **Hierarchy:** state + freshness → correct recovery → supporting sources. **Confusion:** pause is not revoke; unknown expiry cannot display a made-up date. **Remove:** HTTP errors, stale green connected badge, freshening timestamps on failed retries. **Brand:** neutral expiry warning, real paired connection evidence and human copy.

## 17. Subscription / paywall, P1

```text
┌───────────────────────────────┐
│ Chiudi                  Plus │
│ Collega più banche,          │
│ con Lilleri Plus.            │
│ [entitlements actually live] │
│ ○ € 4,99 al mese             │
│ ○ € 39,99 all’anno           │
│   Un unico addebito annuale  │
│ Rinnovo e cancellazione >    │
│ [Continua con Plus]          │
│ (Continua con Gratis)        │
│ (Ripristina acquisti)        │
│ PREZZI IPOTETICI · NO CHARGE  │
└───────────────────────────────┘
```

**Task:** choose an optional extra with informed cost. **Primary:** continue to explicit platform purchase, not instantly charge. **Secondary:** Gratis/close/restore/terms. **Hierarchy:** actual value → whole price/period → renewal/cancel → choice. **Confusion:** annual total is not a monthly bill; prototype visibly disclaims charging. **Remove:** timer, fake discount, correctness lock, preselected marketing/AI permission, Famiglia sale before sharing. **Brand:** same paper/wine system and frank copy; no metallic premium visual skin.

**HYPOTHESIS:** a 30-day non-renewing Plus preview may be offered without payment details. A separate preview card must say “30 giorni, poi torni a Gratis. Nessun addebito automatico.” It does not replace or disguise a paid subscription choice. Closed beta remains free.

## 18. State overlays and advanced sheets

Offline/stale banner: source freshness, consequence and one available recovery; keep useful cached data beneath. Error/empty/loading variants use the same layout and real state, not an unrelated illustration. A split sheet shows original amount, child rows and remaining difference; transfer/refund/duplicate sheets show the two-source evidence preview and reversible effect before confirm. These are P1 where flagged in [flows](user-flows.md).

**Task:** recover or make a precise advanced edit. **Primary:** retry/confirm when valid. **Secondary:** cancel/why/history. **Hierarchy:** current fact → effect → supported action. **Confusion:** estimated and booked amounts, partial data and actual zero must remain distinct. **Remove:** stale success animation, disabled control with no reason, oversized cartoon state. **Brand:** system surfaces and paired evidence; a state is recognisable without reintroducing the logo.

## Review protocol

Render every selected frame in light/dark at compact/large dimensions, large text and screen-reader labels. Test focus/order and real flow branches. These ASCII frames establish information architecture; they cannot prove contrast, optical quality or accessibility. Evidence and pending work are recorded by [visual-quality-gate.md](visual-quality-gate.md). The chosen Home variant and Inbox naming remain HYPOTHESES for moderated prototype testing with Giulia, Paola and assistive-technology participants.

# Consent model — what Lilleri asks, on which legal footing, how it records it, and how it renews it

**Project:** LILLERI (consumer PFM, Italy-first then Europe; proposed recipient of licensed-provider AIS data; route not yet approved)
**Review date:** 2026-10-02. **Retained source date:** 2026-10-02; no new legal/policy/provider verification in this review.
**Author:** Privacy/GDPR specialist + fintech compliance analyst, founding team
**Status of this document:** synthesis of Phase 0 research; input to onboarding design (`design/user-flows.md`), the consent service in `architecture/`, the privacy notice and the provider RFP. Companion documents: `compliance/regulatory-landscape.md`, `compliance/privacy-model.md`, `compliance/data-retention.md`, `compliance/legal-open-questions.md`. **Not legal advice.**

## How to read this document

- Labels: **FACT**, **ASSUMPTION**, **HYPOTHESIS**, **DECISION**, **OPEN QUESTION / UNKNOWN** (see `docs/README.md`).
- Evidence limits: current consolidated law/policy, provider contract and actual Italian bank lifecycle remain UNKNOWN at production assurance level. FACT labels below describe retained evidence, not fresh verification. Contract necessity and roles are proposed assessments, not automatic legal conclusions.
- Evidence base: `docs/research/raw/regulatory-landscape.md` (**RL-§x**), `non-bank-sources-and-os-limits.md` (**NB-§x**), `open-banking-providers-a.md` (**PA-§x**), `open-banking-providers-b.md` (**PB-§x**); WebSearch gap closures cited as **NEW-n** (table in `regulatory-landscape.md` §8.2).
- "Consent" is used in three legally different senses in this product; the taxonomy in §2 keeps them apart: (i) the **PSD2 explicit consent** the user gives to the licensed provider to access the bank (contractual, per EDPB 06/2020); (ii) **GDPR Art. 6(1)(a) / Art. 9(2)(a) consent** for optional processing; (iii) **permissions** required by the OS or the app stores (camera, notifications, third-party AI sharing) that are not GDPR bases but must be captured and logged anyway.
- Product copy examples are Italian; documentation is English.

---

## 1. Executive summary

1. **HYPOTHESIS:** objectively necessary core PFM purposes may use Art. 6(1)(b); counsel must approve the per-purpose map and raw Article 9/10 conditions before real data. PSD2 explicit consent to the provider is distinct from GDPR basis, SCA and store/OS permission (RL-§6.1).
2. **DECISION:** onboarding records T&Cs acceptance and privacy-notice delivery separately. A bank connection uses provider AIS consent and bank/provider authentication. Optional external-AI permission is requested only before the first relevant external call; denial continues with rules/in-house mode. Import/manual use does not require a bank consent.
3. **FACT (retained GDPR description):** consent withdrawal must be as easy as giving, specific, informed, freely given and evidenced. **DECISION:** no bundled/pre-ticked permissions or coercive paywalls. A six-month no-reprompt discipline is a project policy inspired by cookie guidance, not a universal statutory rule for every in-app permission.
4. **DECISION:** separate AIS consent scope/validity, SCA requirement, session/token expiry and actual history/refresh allowance. Reported180-day SCA mechanics are not a guaranteed connection term. Four unattended accesses and90-day exemption/provider windows are not success/history guarantees; metadata and actual coverage determine renewal/gaps.
5. **DECISION:** one connection/privacy/data dashboard exposes actual provider/entity, scope, status, freshness, expiry if known and revoke/delete actions. An own screen does not prove provider/platform dashboard compliance or satisfy future PSR obligations.
6. **DECISION:** plain Italian, accurate dates and provider-approved words. Provider licence does not authorise Lilleri automatically; Route A and submission claims require Q1/Q4/Q20 closure.
---

## 2. Consent and permission taxonomy

| ID | Name | Legal nature | Required for the core service? | Who collects / where | Recorded by Lilleri? | Withdrawal effect | Renewal |
|---|---|---|---|---|---|---|---|
| **K-CONTRACT** | T&Cs acceptance; privacy-notice delivery/acknowledgment separately | Contract formation (Art. 6(1)(b)); Cod. Cons. artt. 49, 51; tacit-renewal clauses need specific approval (art. 1341 c.c.) | **Yes** | Lilleri, onboarding screen 1; versioned | Yes (version, timestamp, build) | Account closure | On material T&C change: notice + re-acceptance |
| **K-AIS** | PSD2 account-access consent | PSD2 Art. 67(2)(a) / Art. 94(2) **explicit consent** — contractual, not GDPR consent (EDPB 06/2020); given to the **licensed provider** (AISP of record), with Lilleri named as recipient and the purpose stated (Art. 67(2)(f)) | **Only for bank-connected mode**; imports/manual mode require no AIS consent | Provider's hosted page or mandated copy inside Lilleri (TrueLayer mandatory copy + UI review; Yapily Connect screen naming Yapily Connect Ltd/UAB; Tink T&Cs/Privacy links; Enable Banking terms widget) → then bank SCA | Yes (provider consent id, scope, granted/expiry, institution); provider is source of truth for expiry | "Scollega" → revoke at provider (and bank where supported), stop refresh, token deletion; data kept or deleted per user choice | SCA requirement and consent validity are separate; read actual provider/bank scope, expiry and required renewal action |
| **P-AI** | Permission to share personal data with a third-party AI provider | Store-mandated explicit permission (Apple 5.1.2(i) verbatim; Play general User Data obligations; exact 15 Jul 2026 AI-specific clarification UNKNOWN — NEW-1 conflicts with raw RL AV3); GDPR transparency (Art. 13); not itself a GDPR lawful basis; per-purpose necessity/basis and Article 9 condition remain to be reviewed | **No** — Premium and core must work without it (Apple 5.1.1(ii)); rules + in-house classifier fallback | Lilleri, immediately before first external personal-data AI call; settings toggle | Yes (text version, vendor list version) | Stop sending to external AI; in-house/rule mode; existing categories kept | On vendor change (new vendor = new disclosure) |
| **C-ANALYTICS** | Product-analytics identifier | ePrivacy Dir. Art. 5(3) → Codice privacy art. 122 consent (Garante cookie guidelines 2021); consent exemption/anonymity only if actual conditions are established; pseudonymisation alone insufficient | No | Lilleri, settings or a single non-blocking in-context prompt; off by default | Yes | Stop consent-based analytics and delete consent-only linked events; assess genuinely anonymous aggregates separately | Re-prompt not before 6 months |
| **N-SERVICE** | OS notification permission for service messages | OS permission only (iOS/Android); no marketing consent needed for service push (art. 130 scope — ASSUMPTION on push classification) | No (but strongly useful: renewal reminders, Review-Inbox items) | OS prompt, asked in context ("ti avvisiamo quando c'è qualcosa da rivedere") | OS state mirrored | OS settings | OS-driven |
| **C-MARKETING** | Marketing push / e-mail / in-app promotional messages | Codice privacy art. 130 consent; soft opt-in art. 130(4) only for own similar services by e-mail collected at sale, with opt-out in every message | No | Lilleri, settings; separate toggle from N-SERVICE; unchecked by default | Yes | Immediate stop; suppression list | — |
| **C-OFFERS** | Personalised offers / partner products (future) | Art. 6(1)(a) consent (profiling for marketing) + art. 130; may trigger OAM/IVASS questions (`regulatory-landscape.md` §4.6) | No — **not in v1** | — | — | — | — |
| **C-EMAIL** | E-mail receipt ingestion | GDPR Art. 6(1)(a) consent per mailbox/forwarding address; Google Limited Use if OAuth; purpose limited to receipts/invoices | No | Lilleri, feature entry point; forward-to-inbox first (NB-§5.3) | Yes (mailbox/alias id, scope) | Stop ingestion; delete raw/extracted consent-based material unless an independently valid basis applies; no silent basis switch | — |
| **P-CAMERA** | Camera / photo picker for receipts | OS permission; Apple 5.1.1(iii) prefers picker/share sheet | No | OS prompt at first "Aggiungi scontrino" | OS state mirrored | OS settings | — |
| **P-NOTIF-ACCESS** | Android notification access (post-MVP experiment) | OS special access + GDPR consent; Play prominent disclosure + runtime consent; on-device parsing only (NB-§4.2) | No | Lilleri prominent-disclosure screen → system settings | Yes | Disable listener; delete parsed items per choice | — |
| **C-SPECIAL** | Explicit consent for a feature that infers special-category data (e.g., deductible donations, union fees) — **not in v1** | GDPR Art. 9(2)(a) explicit consent, specific, separate, logged; withdrawal deletes derived labels | No | Dedicated screen, never bundled | Yes (separate record) | Delete derived labels; feature off | — |
| **C-RESEARCH** | Opt-in to user research / beta programmes | Consent | No | Settings / invitation | Yes | Stop | — |
| **K-AGE** | Age attestation (18+) | Legal capacity; 18+ product boundary (DECISION); self-attestation alone does not prove legal age safeguards | Yes | Onboarding (self-declaration; provider KYC does not verify age of users — the provider performs KYB on Lilleri, not CDD on users, RL-§9) | Yes | — | — |

Labels: legal interpretations in the table are HYPOTHESIS pending counsel; retained sources describe PSD2/GDPR/Codice privacy/store rules as recorded in RL; the "who collects" column is FACT for provider mechanics (PA-§2.6, PB-§4) and DECISION for Lilleri screens.

### 2.1 Contract-necessary vs consent-based — feature matrix (DECISION; HYPOTHESIS on contract necessity; subject to Article 9/10 and counsel review)

| Feature | Basis | Ask? | Notes |
|---|---|---|---|
| Account creation, login, security | Contract | T&Cs acceptance only | — |
| Connect a bank, fetch balances/transactions, keep them in sync | Contract + K-AIS (provider) | Provider consent + bank SCA | Separate provider consent/authentication; Article 9 condition may also be needed for actual data |
| Automatic reconciliation (pending→booked, duplicates, transfers, card settlements, refunds) | Contract | None | Necessary to deliver the promise |
| Categorisation by rules and in-house classifier | Contract | None | Assess actual effects/Art. 22; voluntary rules-only setting; Art. 21 depends on lawful basis |
| Categorisation using an external LLM | Contract (basis) + **P-AI** (permission) | Yes, explicit | Fallback mode without it |
| Review Inbox, subscriptions detection, insights, budgets | Contract | None | Quiet-set exclusions apply (`privacy-model.md` §5) |
| AI chat over the user's data | Contract + P-AI (if external) + Art. 50 disclosure | Yes (P-AI) | "Stai parlando con un assistente AI" |
| Service notifications | OS permission | Yes, in context | Not marketing |
| Marketing | C-MARKETING | Yes, separate | Off by default |
| E-mail receipts | C-EMAIL | Yes, per mailbox | Forward-to-inbox first |
| Receipt photos | Contract + P-CAMERA (+ P-AI if the OCR is a third-party AI) | Yes (OS) | Picker preferred |
| CSV/XLSX/PDF import | Contract | None | User-initiated |
| Analytics with identifier | C-ANALYTICS | Yes (optional) | Optional identifier processing stops without consent; necessary telemetry/anonymous aggregates assessed separately |
| Export, deletion, revocation | Rights | None | Always available |
| Any special-category feature | C-SPECIAL | Yes, explicit, separate | Not in v1 |
| Partner offers / affiliate | C-OFFERS + regulatory clearance | Yes | Not in v1 |

---

## 3. Onboarding sequence — what is asked, when, and why (DECISION)

| Step | Screen | Ask | Legal hook | Copy (Italian, draft) |
|---|---|---|---|---|
| 1 | Welcome | None | — | "Collega i tuoi conti una volta. Lilleri capisce da sola cosa succede ai tuoi soldi — e ti fa vedere sempre perché." |
| 2 | Account | E-mail/passkey; age 18+ | K-CONTRACT, K-AGE | "Creando l'account accetti i Termini e prendi visione dell'Informativa privacy." (links; no checkbox needed for the notice; one explicit action for the T&Cs) |
| 3 | "Come funziona il collegamento" (pre-redirect explainer, **before** the provider's screen) | Information only | PSD2 transparency; provider-mandated disclosure | "Per leggere i tuoi movimenti, Lilleri usa **[Provider]**, un intermediario autorizzato e vigilato da **[Autorità]**. Nella prossima schermata darai il consenso a [Provider] e poi confermerai nella tua banca. Lilleri vede solo saldi e movimenti: **non può muovere denaro**. Ti avvisiamo quando il collegamento deve essere rinnovato. La durata e i passaggi dipendono dalla banca e dal fornitore." |
| 4 | Provider consent screen (hosted or mandated copy) | K-AIS | PSD2 Art. 67/94(2); provider T&Cs | Provider wording (e.g., TrueLayer header "{{client name}}'s partner, TrueLayer, would like {{duration}} access to your {{bank name}} account details", PA-§2.6) — **not editable by Lilleri** beyond the allowed variables |
| 5 | Bank SCA (redirect/app-to-app) | Bank's own | RTS | — |
| 6 | First sync + "Cosa ho capito" | None | — | Shows actual received history and freshness; never promises90 days before verified coverage (PA-§7) |
| 7 | AI permission | **P-AI** | Apple 5.1.2(i); Play User Data | See `privacy-model.md` §7 copy; buttons "Attiva" / "Non ora"; both paths continue |
| 8 | Notifications (when the first Review-Inbox item exists) | N-SERVICE | OS | "Ti avvisiamo solo quando c'è qualcosa da rivedere o un collegamento da rinnovare. Niente pubblicità." |
| later | Receipts, e-mail, analytics id, marketing | P-CAMERA, C-EMAIL, C-ANALYTICS, C-MARKETING | as per §2 | Asked only when the user reaches the feature |

Rule: **no screen asks for more than one thing**, and the Premium paywall never appears before step 6 (store rules forbid gating paid functionality on data permissions; Apple 5.1.1(ii)).

---

## 4. Consent records schema (DECISION)

Purpose: prove consent (GDPR Art. 7(1)), reconstruct exactly what the user saw, drive the renewal UX, and answer regulators and app reviewers. Stored in the audit class (immutable, append-only), encryption class E2, retention per `data-retention.md` (minimised account-life evidence; proposed restricted3-year post-close ceiling only where claims/accountability necessity is documented; longer only class-specific counsel-approved requirement/hold, not an automatic 10-year archive).

### 4.1 `consent_event` (append-only; one row per grant/withdraw/renew/expire)

| Field | Type | Notes |
|---|---|---|
| `event_id` | UUID | — |
| `user_id` | UUID (pseudonymous) | — |
| `consent_type` | enum | `K-CONTRACT`, `K-AIS`, `P-AI`, `C-ANALYTICS`, `N-SERVICE`, `C-MARKETING`, `C-OFFERS`, `C-EMAIL`, `P-CAMERA`, `P-NOTIF-ACCESS`, `C-SPECIAL`, `C-RESEARCH`, `K-AGE` |
| `action` | enum | `granted`, `withdrawn`, `renewed`, `expired`, `revoked_at_bank`, `revoked_at_provider`, `superseded` (new text version), `denied` (user declined — stored to avoid re-asking before 6 months) |
| `scope` | JSON | e.g. `{connection_id}`, `{mailbox_alias}`, `{vendor_list_version}`, `{feature:"donazioni_detraibili"}` |
| `text_version` | string | semantic version of the exact screen text, e.g. `p-ai/it-IT/1.3` |
| `text_hash` | SHA-256 | hash of the rendered copy + links; the versioned copy itself lives in a content registry |
| `notice_version` | string | privacy-notice version shown/linked |
| `channel` | enum | `ios`, `android`, `web` |
| `app_build` | string | — |
| `locale` | string | — |
| `ui_context` | string | screen id (e.g., `onboarding.step7`) — proves "in context", not bundled |
| `occurred_at` | timestamp (UTC) | — |
| `evidence` | JSON | minimal: `{method:"tap", control:"btn_attiva"}`; **no IP, no device fingerprint** (minimisation; IP exists in short-lived auth logs only) |
| `expires_at` | timestamp / null | actual consent validity if supplied; never inferred from last SCA; `reask_not_before` is a separate field |
| `source_of_truth` | string | `lilleri` or `provider:<name>` (K-AIS) or `os` (N-SERVICE, P-CAMERA) |

### 4.2 `connection` (current state; derived from provider data + consent events)

| Field | Notes |
|---|---|
| `connection_id`, `user_id` | — |
| `provider` (`yapily`, `tink`, `enable_banking`, `fabrick`, …) and `provider_entity` (licensed EU entity shown to the user, e.g. "Yapily Connect UAB (Bank of Lithuania)") | Name shown on the bank screen (PA-§2.6) |
| `provider_consent_id`, `institution_id`, `institution_name`, `accounts[]` (tokenised ids, masked display) | — |
| `granted_at`, `consent_valid_until`, `sca_last_at`, `sca_required_at`, `provider_session_expires_at`, `token_expires_at` | **Never compute consent validity as SCA + 180 days**; provider fields have distinct meanings and may be UNKNOWN. Adapter contract maps them; stale/unknown authorization fails closed |
| `history_from` (first available transaction date) | Sets the "capisce dal …" promise |
| `status` | `active`, `expiring` (≤ 30 days), `expired`, `revoked_by_user`, `revoked_at_bank`, `revoked_at_provider`, `error_auth`, `error_provider`, `paused_by_user` |
| `last_successful_refresh_at`, `next_refresh_at`, `access_budget_scope`, `allowed_background_accesses`, `access_window_start`, `accesses_used` | Conservative configurable unattended request budget; rolling window/scope/paging and contractual limits mapped, no guarantee of successful updates |
| `gap_detected` (bool), `gap_from`, `gap_to` | Compare received coverage/cursors to last known data; Tink90-day refetch is provider-specific, no universal elapsed-time detector |
| `data_retention_choice_on_revoke` | `keep`, `delete` |

### 4.3 Example `consent_event` (P-AI granted)

```json
{
  "event_id": "7f0e…",
  "user_id": "u_…",
  "consent_type": "P-AI",
  "action": "granted",
  "scope": { "vendor_list_version": "ai-vendors/2026-10" },
  "text_version": "p-ai/it-IT/1.0",
  "text_hash": "sha256:…",
  "notice_version": "privacy/it-IT/1.0",
  "channel": "ios",
  "app_build": "1.0.0 (42)",
  "locale": "it-IT",
  "ui_context": "onboarding.step7",
  "occurred_at": "2026-10-02T09:14:03Z",
  "evidence": { "method": "tap", "control": "btn_attiva" },
  "expires_at": null,
  "source_of_truth": "lilleri"
}
```

### 4.4 Invariants (DECISION)

- A latest grant event is necessary evidence, not sufficient proof of legal validity. Feature gates also check purpose/scope/text, provider authorization/revocation, required SCA, lawful basis/Article 9 condition and vendor status. A null/unknown expiry does not mean indefinite valid bank access.
- Every feature gate reads the consent service, never a cached boolean in the client.
- Text versions are immutable; material new purpose/scope/vendor/data changes require legal assessment and fresh permission where required. A copy edit alone does not reset a refusal/re-prompt window or validate consent.
- `denied` events suppress re-asking for 6 months (Garante guideline analogy for cookies — ASSUMPTION that applying the same discipline in-app is prudent).
- Exports (`privacy-model.md` §9) include the user's consent history.

---

## 5. Renewal UX — actual connection lifecycle (DECISION)

### 5.1 Legal/provider mechanics and uncertainty

**FACT (retained descriptions):** RTS2022/2360 changes the AIS SCA exemption/renewal mechanics to 180 days; exemption scope and conditions (including balance/recent-transaction information and justified security challenges) require consolidated-text reading (RL-§1.1, PA-§2.1). This is not a universal180-day consent duration. Consent validity, SCA due date, provider session and tokens must be mapped separately. Any fresh token/SCA does not prove renewed AIS consent or a GDPR basis.

**FACT (provider-specific evidence):** Tink late reconfirmation can restrict refetch to90 days (PA #43); provider/bank history and shorter sessions differ. **UNKNOWN:** actual Italian institution behaviour and received history until pilot. Neither user-present requests nor an on-open trigger bypass provider limits, lawful scope, bank limits or SCA.

### 5.2 Relative timeline

| Trigger | UX / action |
|---|---|
| Active actual authorization | Show scope, last successful sync, actual known expiry/required action; unknown dates labelled |
|30days before actual renewal action due | Low-priority inbox reminder if useful for that term; avoid reminders older than short session validity |
|10days /2days before actual due date | Optional service reminder under OS permission and reviewed non-marketing basis; neutral actual-date copy |
| Provider says SCA/consent/session expired or revoked | Stop unusable access; truthful stale timestamp; provider's exact reconnect action; do not erase lawful historical ledger by default |
| Renewal returns incomplete coverage | Compare actual covered interval/cursors; explain observed gap and offer import; no universal day 270 threshold |
| User chooses disconnect | Revoke promptly, destroy tokens and offer separate retention/erasure choice; reminders stop |

Draft: *“Il collegamento con [Banca] deve essere rinnovato. I dati sono aggiornati al [data]. [Provider] ti guiderà nei passaggi richiesti dalla banca. [Rinnova]”*. Do not claim “30 seconds”, “never lose a movement” or a fixed180-day term without actual verified support.

### 5.3 Technical invariants

Separate consent/SCA/session states and evidence; provider signals (PA-§3) are mapped to actual semantics, not a single `expires_at`. Use conservative configurable unattended request budgets and respect429/backoff/paging. Do not use background refresh to extend dormancy indefinitely. Provider switches require new entity/scope/notice/consent review; licence identity is more than a display attribute. Future PSR renewal proposals create no current shortcut.

## 6. Dashboard requirements (DECISION; FACT where cited)

### 6.1 "Collegamenti" (connections)

For each connection: institution and logo; **provider named** ("tramite Yapily Connect UAB, autorizzato dalla Banca di Lituania" — exact entity per contract); accounts included (masked); consent granted date; **expiry date and days left**; last successful update; status in plain words; what Lilleri can see ("saldi e movimenti; non può operare"); actions: **Rinnova**, **Aggiorna ora** (user-present refresh), **Metti in pausa**, **Scollega** (with the data choice: "Conserva lo storico" / "Elimina tutto ciò che viene da questa banca"), link to the bank's own permission page where it exists (PSR dashboards in the future). Salt Edge mandates an end-user dashboard for consent revocation; TrueLayer/Yapily/Tink require a manage/revoke surface (PA-§2.6, §7) — provider-specific UI approval remains a production blocker; this design alone is not satisfaction evidence.

### 6.2 "Permessi e privacy" (permissions)

One list with every item of §2 that is not K-CONTRACT/K-AIS: current state, date granted/denied, what it enables, one-tap toggle; link to the versioned text the user accepted; "Categorie riservate" (hide categories) and "Transazioni private"; "Disattiva categorizzazione automatica" (voluntary control; applicable Art. 21 requests handled by basis); the AI vendor list version and the chat disclosure.

### 6.3 "I tuoi dati" (your data)

Export (ZIP), delete account, delete a data source, consent history view, DPO contact, link to the Garante complaint page.

### 6.4 Non-functional

- Reflects provider-side revocation within one refresh cycle (webhooks where available: Tink `refresh:finished`, Yapily consent webhooks; otherwise polling).
- Accessible (WCAG 2.1 AA: status not conveyed by colour alone).
- Every action writes a `consent_event`.

---

## 7. Copy principles (no legalese) — DECISION

| Principle | Do | Don't | Why |
|---|---|---|---|
| One decision per screen | "Vuoi che Lilleri usi un'AI esterna per capire i movimenti?" | Bundling AI + analytics + marketing in one "Accetto" | GDPR Art. 7(2) granularity; Garante no-bundling |
| Consequence before the button | "Se dici no, Lilleri usa solo le regole e il suo classificatore interno: funziona, impara un po' più lentamente." | "Per un'esperienza migliore attiva tutto" | Freely given consent; no nudging |
| Name the provider truthfully | "Nella schermata della banca vedrai [Provider], il nostro partner autorizzato." | Hiding the provider or implying Lilleri is the bank's partner | Provider mandatory copy (PA-§2.6); 3.2.1(viii) review honesty |
| Say what Lilleri cannot do | "Lilleri non può muovere denaro né vedere le tue credenziali." | Vague "accesso sicuro" | Trust; PSD2 scope (read-only AIS) |
| Symmetric buttons | [Attiva] [Non ora] same size and weight | Grey "Non ora" link under a big green button | AGCM dark-pattern practice; Garante cookie guidelines on equal choices |
| Numbers, not adjectives | Actual date, actual received history and verified duration; uncertainty stated | "periodicamente", "presto" | Comprehension |
| Explain inference policy once, plainly | "Non usiamo i movimenti per dedurre salute, religione o opinioni politiche. Alcune descrizioni possono rivelare dati delicati: [misure verificate]." | Legal text about "categorie particolari ex art. 9" | Art. 9 transparency without jargon |
| Withdrawal as easy as consent | A toggle in the same place, instant | "Scrivi a privacy@…" | Art. 7(3) |
| Layered notice | Layer 1: five lines in Italian; Layer 2: full notice | Full notice as the only option | Art. 12 |
| No legalese in buttons | "Collega la banca", "Rinnova", "Scollega" | "Acconsento al trattamento" | Plain language |
| Tone | Calm, specific, never alarmist on expiry ("Il collegamento è scaduto. Nessun problema: i tuoi dati sono al sicuro.") | Red "ERRORE: consenso scaduto" | Pain-point evidence: consent expiry experienced as random breakage (`research/market-analysis.md` §1 point 4) |

Review process: every consent/permission string ships with a text version, a DPO review and a copy review against this table; strings are stored in the content registry referenced by `text_version`.

---

## Review log

**Date:** 2026-10-02. **Method:** retained-source adversarial review, no fresh legal/policy access.

| Critique | Resolution | Remaining human production blocker |
|---|---|---|
| Consent, SCA, token/session expiry and GDPR basis were collapsed | Separate legal/technical concepts, scope and adapter fields; grant event/null expiry insufficient | Counsel basis/Article 9 review and provider actual field semantics |
|180-day term/four syncs/90-day history and fixed day150/270 UX overpromised | Actual expiry/action metadata, configurable access budgets and observed coverage; no universal sync/history guarantee | Provider/bank pilot and reviewed RTS/contract |
| Provider licence, privacy notice acknowledgment and AI permission implied legal authorisation/consent | Conditional route; contract/notice distinct; permission≠GDPR basis; imports/manual do not need AIS | Q1/Q3/Q4/Q20 and approved onboarding copy |
| Six-month rule and ten-year archive treated universal | Six months a project policy; restricted evidence necessity/period per retention doc | DPO/counsel consent proof/re-prompt/claims assessment |
| Quiet set/withdrawal and store policy certainty exceeded evidence | Raw sensitive data review and derivative deletion; Play AI-specific date unknown | DPIA/vendor/policy evidence; working rights/permission gates |

**Gate verdict:** **PASS WITH CONDITIONS for synthetic UX/design only; real-data/store submission acceptance BLOCKED**. No provider UI, counsel or legal approval is recorded.

## 8. Decisions / Recommendations

| # | Decision / recommendation | Label |
|---|---|---|
| D1 | Three legally distinct families — K (contract), K-AIS (PSD2 via provider), C/P (GDPR consents and OS/store permissions) — modelled in one consent service with append-only events and versioned text. | DECISION |
| D2 | Core path records T&Cs/notice separately and provider AIS consent/authentication when bank-connected; optional third-party-AI permission is requested just before first relevant external call; other optional purposes stay off. | DECISION |
| D3 | P-AI is optional and symmetric; the product works in rules + in-house mode without it; Premium is never gated on any permission. | DECISION |
| D4 | Consent/SCA/session/token dates are distinct provider-adapter metadata; relative reminders follow actual due action; observed coverage drives gap detection/import. No fixed 150/170/178-day cadence. | DECISION |
| D5 | "Collegamenti", "Permessi e privacy" and "I tuoi dati" screens are MVP scope, not post-launch polish. | DECISION |
| D6 | Copy principles in §7 are a release checklist item; the provider's mandated copy is used verbatim where required and explained in Lilleri's own words on the screen before it. | DECISION |
| D7 | Consent events exclude IP and device fingerprints; proof rests on text version/hash, build, screen id and timestamp. | DECISION |
| D8 | `denied` suppresses routine re-asks for 6 months as project policy; material new scope/purpose requires reviewed fresh permission, not a cosmetic-copy reset. | DECISION |
| R1 | Submit the onboarding and consent screens to the chosen provider's UI review early (TrueLayer and Yapily require it) and to counsel together with the T&Cs. | RECOMMENDATION |
| R2 | Usability-test the pre-redirect explainer and the renewal item with Italian users: the two moments where trust is won or lost. | RECOMMENDATION |
| R3 | Ask each shortlisted provider for the Italian consent duration actually delivered per top-10 bank and for consent webhooks (RFP). | RECOMMENDATION |

---

## 9. Open questions

| # | Question | Why it matters | How to resolve |
|---|---|---|---|
| OQ1 | Exact mandatory consent copy and UI-review rules of the chosen provider for Italian PSUs (TrueLayer: mandatory copy; Yapily: Yapily Connect screen; Tink: T&Cs links; Enable Banking: terms widget; Fabrick: UNKNOWN) | Screens 3–4 | Provider RFP + docs |
| OQ2 | Real consent validity delivered by Italian banks through each provider (90 vs 180 days) | Renewal cadence | Read `expires_at` on real consents for the top-10 banks (PA-§6 #7) |
| OQ3 | Whether Banca d'Italia requires specific disclosures in the consent flow for a model-A recipient (`legal-open-questions.md` Q1) | Legality of the flow | Counsel |
| OQ4 | Is a service push about an expiring consent "marketing" under art. 130 in the Garante's view? (ASSUMPTION: no) | N-SERVICE vs C-MARKETING | Counsel (light) |
| OQ5 | Whether applying the 6-month no-re-ask rule to in-app permissions (P-AI, analytics) is required or merely prudent | Re-ask cadence | DPO |
| OQ6 | PSR agreed text: AISP-side SCA cycle 180 vs 365 days; dashboard duties on the AISP (not Lilleri under model A) | Renewal design horizon ≈2028 | Read Council doc 8222/26 |
| OQ7 | Store review stance on the pre-redirect explainer naming the provider ("financial institution performing such services", Apple 3.2.1(viii)) | Submission | Review notes with licence evidence; pre-submission question to App Review |
| OQ8 | T&C wording for tacit renewal (art. 1341 c.c. specific approval) in an IAP context | Contract validity | Consumer-law counsel |

---

## 10. Sources

Retained research date: **2026-10-02**; source publication/access limits preserved, not re-fetched in this review. See `regulatory-landscape.md` §8 for the full raw-note source table; IDs below point to it.

| ID | Source | URL | Pub. date | Reliability | Used for |
|---|---|---|---|---|---|
| RL S-01, S-26 | PSD2 Art. 67, 94(2); EDPB 06/2020 (contractual explicit consent) | https://eur-lex.europa.eu/eli/dir/2015/2366/oj ; https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-062020-interplay-second-payment-services-directive_en | 2015 / 2020 | high (not fetched) | K-AIS legal nature |
| RL S-03 / PA #1, #159–161 / PB #55 | Delegated Reg. (EU) 2022/2360 (180 days; mandatory AISP exemption; applies 25 Jul 2023); Regulation Tomorrow; Mondaq; EBA Q&A 2023_6820/6833 | https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj ; https://www.regulationtomorrow.com/2022/08/commission-delegated-regulation-amending-the-rts-as-regards-the-90-day-exemption-for-account-access/ | 2022–2023 | high / medium-high | Renewal rule |
| RL S-04 / PA #3 | EBA Q&A 2019_4631 (4×/24 h) | https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 | n/d | high | Refresh budget |
| PA #43, #47, #48, #139 | Tink docs: consent reconfirmation (90-day re-fetch, gaps); credentials session; one-SCA page; changelog (180-day per market) | https://docs.tink.com/resources/transactions/consent-reconfirmation ; https://docs.tink.com/resources/aggregation/credentials-session ; https://docs.tink.com/changelog?tags=Tink+Link | n/d | high (mirror) | Gap handling; expiry per market |
| PA #90, #94, #148, #195 | Yapily docs: financial data consents (180 days EEA); UX guidelines; data restrictions (Intesa 2-week window, HTTP 429) | https://docs.yapily.com/data/financial-data-resources/financial-data-consents ; https://docs.yapily.com/tools-and-services/yapily-connect/yapilyconnect-ux-ais-guidelines ; https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | n/d | high (mirror/live) | Expiry; refresh constraints |
| PA #71–73, #142 | TrueLayer docs: create a connection v1 (90 days wording); reconfirmation UX; collect user consent (mandatory copy, UI review, agent footer) | https://docs.truelayer.com/docs/create-a-connection-v1 ; https://docs.truelayer.com/docs/ux-for-reconfirmation-of-consent ; https://docs.truelayer.com/docs/collect-user-consent | n/d | high (mirror) | Mandated copy; renewal endpoints |
| PA #92–93, #144–147, #172 | Yapily Connect overview; licensing & registration; hosted pages consent screen; Bank of Lithuania register (Yapily Connect UAB) | https://docs.yapily.com/tools-and-services/yapily-connect/overview ; https://docs.yapily.com/concepts/licensing-and-registration ; https://www.lb.lt/en/sfi-financial-market-participants/yapily-connect-uab | n/d | high | Provider name on consent screen |
| PA #114–117, #149 | Salt Edge Partner Program; v6 Licensing; end-user dashboard requirement; `max_consent_days`; reconnect | https://www.saltedge.com/products/account_information/partner_program ; https://docs.saltedge.com/v6 | n/d | high (mirror) | Dashboard requirement |
| PB #42 | Enable Banking docs: terms-consent widget; linked accounts; FAQ | https://enablebanking.com/docs/api/widgets ; https://enablebanking.com/docs/faq | n/d | high (mirror) | Provider terms step |
| RL S-27 | Garante cookie guidelines (no pre-ticked boxes; scrolling ≠ consent; equal choices; 6-month re-prompt) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876 | 2021-06-10 | high (not fetched) | C-ANALYTICS; re-ask rule; copy principles |
| RL-§7 | Codice privacy art. 122, art. 130 (marketing; soft opt-in 130(4)) | https://www.normattiva.it | consolidated | high (not fetched) | C-MARKETING, N-SERVICE |
| RL-§8.1, RL S-49 | Codice del Consumo artt. 18–27 (dark patterns), 33(2)(i), 49, 51(2); art. 1341 c.c. | https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206 | consolidated | high (not fetched) | K-CONTRACT; symmetric buttons |
| RL S-32, S-74 / NB S-04 | Apple App Review Guidelines 5.1.1(ii), 5.1.1(iii), 5.1.2(i), 3.2.1(viii) (first-hand) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 | high | P-AI; no gating; picker; provider disclosure |
| RL S-40, S-41; NEW-1 | Google Play User Data policy; Policy announcement 15 Jul 2026 | https://support.google.com/googleplay/android-developer/answer/10144311?hl=en ; https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026 | high / medium-high (snippet) | P-AI on Android; prominent disclosure |
| NB S-08, S-32–S-35 | Android NotificationListenerService; Android 15 OTP redaction; Play policies landing page | https://developer.android.com/reference/android/service/notification/NotificationListenerService ; https://developer.android.com/distribute/play-policies | n/d | high (first-hand) | P-NOTIF-ACCESS |
| NB S-10, S-46 | Gmail API scopes / Limited Use | https://developers.google.com/workspace/gmail/api/auth/scopes | n/d | medium-high (mirror) | C-EMAIL |
| RL S-25 | L. 132/2025 (minors <14; AI information duties) | https://www.gazzettaufficiale.it/eli/id/2025/09/25/25G00144/sg | 2025-09-25 | high (not fetched) | K-AGE; chat disclosure |
| RL-§2.2, PB #61 | PSR agreed-text descriptions (AISP-side SCA; dashboards) — not in force | https://www.ey.com/en_be/technical/financial-services/financial-services-alerts/payment-services-regulation-key-impacts-on-payment-service-providers ; https://www.openbankingtracker.com/guides/psd3-psr-readiness | 2026 | medium | Pluggable renewal step |
| `docs/research/market-analysis.md` §1 | Pain-point synthesis: consent expiry experienced as random breakage (11 sources); connections break and need re-auth (22) | local | 2026-10-02 | internal (independently sourced) | Tone of the renewal UX |

*End of document.*

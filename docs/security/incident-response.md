# Incident response and recovery

**Date:** 2026-10-02 · **Status:** runbook design for a future operated service. Current local data is synthetic; no incident team, deployed backups or recovery SLA is claimed.

## Activation and roles

DECISION: any credible confidentiality, financial-integrity, identity/key or availability event opens an incident record. Synthetic failures may exercise the procedure, but do not imply a personal-data breach. Assign an incident commander, technical responder, evidence recorder, user/support communicator and controller/legal lead with independent DPO advice before real-data beta. In a small team one person may hold several roles; keep critical containment/release and legal decisions reviewed. A supplier contact registry and current escalation route are prerequisites; names/phone numbers are not invented here.

| Severity | Trigger | Response target (HYPOTHESIS to staff) |
| --- | --- | --- |
| SEV1 | Confirmed/suspected cross-profile disclosure, stolen provider/key/admin credential, broad takeover or corrupted financial totals | Immediate triage/containment, initial responsible-owner contact≤30min; status cadence30–60min |
| SEV2 | Large provider outage, repeated ingestion loss, partial data corruption, unavailable core loop | Start≤1h in staffed window; transparent stale state; hourly status |
| SEV3 | Isolated failed sync, low-risk bug, no disclosure/financial corruption | Triage within one business day; retain safe error evidence |

Detection comes from auth/access anomalies, cross-tenant tests/alerts, redaction sentinels, provider status, job/quarantine/cursor metrics, corrections/undo spikes, backup/retention checks, dependency advisories and user reports via the repository security contact. Do not paste ledger payloads into tickets/chat to explain an incident.

## First hour

1. Record event time, detection source, affected service/version and known/unknown facts; preserve safe logs/access records with restricted access and a necessary TTL. Separate detection, suspected occurrence and legal awareness time.
2. Assign commander and severity; stop risky writes/exports/source fetch/model calls as necessary through kill switch or rollback. Prefer narrow isolation, but confidentiality takes priority over uptime.
3. Revoke compromised sessions/credentials, restrict affected roles/network paths and fence jobs; preserve minimal evidence before destructive actions where possible.
4. Determine affected tenants/data classes/source/processor/time window from scoped IDs and audit, never broad content exports. Keep uncertainty visible; no 'no data lost' statement without evidence.
5. Inform controller/legal and DPO adviser immediately for possible personal data; start statutory assessment without waiting for full root cause. Prepare staged notification if facts are incomplete.
6. Record actions, owners, timestamp and rationale; communicate safe user-impact/freshness status. No user-facing blame or unsupported reassurance.

## Scenario runbooks

| Scenario | Containment | Investigation / recovery |
| --- | --- | --- |
| Cross-profile/data breach | Disable affected route/export, revoke risky sessions, pause derived writes if scope uncertain | Identify query/ID paths and affected records, preserve safe access evidence, patch composite/auth boundary, rerun hostile tests and assess disclosure |
| Provider outage/quota | Suspend retry storm, honour budgets, preserve last successful data, show stale timestamp | Check actual provider status/expiry, contact supplier, bounded reschedule/backfill with overlap; do not mark partial as fresh |
| Provider token/secret compromise | Stop source jobs, revoke at provider, remove/rotate secret versions, restrict grants | Identify read/access window, assess vendor copies, reauthorise only through approved flow; never collect bank passwords |
| KMS/DEK/admin compromise | Restrict decrypt/admin grants, quarantine exports/backups, rotate affected keys carefully | Inventory recoverable key/ciphertext copies and grants, preserve decrypt logs, assess all reachable profiles; rotation does not erase already stolen plaintext |
| Account takeover wave | Revoke affected/all sessions as justified, suspend recovery/exports, rate-limit, notify users safely | Audit sign-in/recovery flows, credential/session theft, device links and support actions; step-up before reinstating |
| Wrong reconciliation/classification | Disable offending algorithm version, preserve source observations and sticky feedback | Compute affected decisions/totals, undo/replay versioned derived state, test adversarial fixture and display correction explanation |
| AI/OCR vendor incident | Kill model calls and queued payloads, revoke vendor key, ask for precise scope/retention evidence | No current calls expected; for future service trace minimal job IDs, deletion/processor response and transfer/breach duties; deterministic mode continues |
| Ransomware/backup loss | Isolate compromised environment/credentials, prevent backup deletion, preserve restricted evidence | Rebuild clean artifact/IaC, restore verified safe point, replay tombstones/expiry before traffic, measure loss/RPO; no ransom assumption |
| Supply-chain malicious artifact | Halt deploy/update, revoke signing/CI tokens if compromised, roll to reviewed artifact | Trace build/dependency provenance, scan affected runtime, patch version, rebuild and examine exfiltration scope |

Repeated source fetches need active consent and may cost/breach quota. Backfill cannot invent a missing history window; expose gaps and import options. Restore/replay never reactivates erased profiles, expired consents or old sessions. Recovery success requires exact financial invariants and authorised tenant checks, not just HTTP200.

## Personal-data breach and notification clock

FACT (retained GDPR description, not fresh legal certification): Article33 controller notification is without undue delay and where feasible within72hours after becoming aware unless unlikely to result in risk; Article34 addresses notification to affected subjects without undue delay for likely high risk, subject to applicable exceptions. Processor-to-controller notification is without undue delay under actual duties/contract and is not a separate automatic72hour grace period. Counsel assesses current applicable obligations and regulator route; [regulatory analysis](../compliance/regulatory-landscape.md) preserves source uncertainty.

The controller/legal lead records awareness time and risk rationale, with DPO advice. Clock starts at awareness, not when investigation ends. Prepare Garante/competent-authority submission with nature/data/subject estimates, contact, likely consequences, mitigation and incomplete facts; use phased updates when needed. Document non-notification rationale and all breaches even when risk threshold is not met. Supplier/regulatory/store contractual notice duties may differ and must be inventoried. Incident severity does not automatically equal legal risk level. No blanket promise to 'notify everyone in72hours'.

Maintain minimised incident evidence, decisions, communications and updates under a reviewed retention/hold basis; do not retain full financial histories indefinitely as evidence. Only controller/legal determines scoped hold with DPO advice. Protect affected third-party/counterparty data too.

## Italian communication templates

Provider outage: “Il collegamento con [banca] è momentaneamente in pausa. Puoi continuare a vedere i dati aggiornati al [data e ora]. Stiamo verificando il problema; ti avviseremo quando il collegamento riprenderà.”

Security notice draft, adapt to known facts/legal review: “Abbiamo rilevato un accesso non autorizzato che potrebbe aver coinvolto [dati confermati o ancora in verifica]. Abbiamo [azioni concrete]. La verifica è in corso. Se devi fare qualcosa, trovi qui i passaggi: [istruzioni]. Per informazioni puoi contattarci a [canale verificato].” Do not assert bank funds/passwords are unaffected without evidence of scope.

Correction: “Abbiamo corretto il modo in cui alcuni movimenti erano collegati. I movimenti originali sono conservati e le tue scelte restano valide. Puoi vedere cosa è cambiato e annullare i collegamenti nella sezione [percorso effettivo].” Use only if implementation actually preserves those choices.

Recovery update: “Il servizio è ripreso. I dati di [fonti] sono aggiornati al [orario]. Stiamo ancora recuperando [intervallo noto]; i movimenti mancanti sono segnalati.” Never invent completion or fake progress.

## Disaster recovery and restore drill

Targets from [NFR](../architecture/nfr.md): beta RPO≤1h/RTO≤8h, production planning RPO≤15min/RTO≤4h, all HYPOTHESIS until timed drills and staffing/configuration support them. Current synthetic environment may reset its fixture and has no real-data durability SLA. PITR, backup encryption and separate-region retention are not currently evidenced features.

Proposed real-data drill quarterly and after key/backup/deletion changes: choose clean recovery point; create isolated restore with independent restricted credentials; inventory key versions; replay externally protected deletion/source/household tombstones and retention expiry; revoke restored sessions/tokens; prevent provider/AI jobs from running; run migration/exact totals/repeated-purchase/undo/tenant checks; compare source checkpoints to recoverable interval; record RPO/RTO and all failures. Bring traffic/jobs back only after commander review and scoped smoke tests. A copied database that resurrects erased records fails recovery even if data totals match.

## Post-mortem and readiness

Within a reasonable agreed window after containment, produce: incident/awareness timeline; user impact and known/unknown data scope; severity/legal-risk/notice decisions; root/contributing causes; detection/containment/recovery gaps; what worked; financial/source/correction validation; actions with owner/deadline/test; remaining risks; processor responses and communication links. Avoid blame and unexplained 'human error'; describe which control failed and how to verify the repair.

Real-bank beta readiness needs named on-call/escalation contacts, supplier terms, tested kill/revoke switches, tabletop breach exercise, timed restore/deletion drill and user communication approval workflow. The present documents are reviewable foundations, not completion evidence. References: [STRIDE](threat-model.md), [security baseline](security-architecture.md), [privacy](../compliance/privacy-model.md), [retention](../compliance/data-retention.md), [consent](../compliance/consent-model.md).

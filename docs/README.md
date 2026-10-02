# Lilleri documentation

Lilleri is a consumer personal-finance product whose promise is simple:
**connect your accounts once and your finances organise themselves.**

This folder is the single source of truth for research, decisions, product,
brand, design, security, compliance and business documentation. Start with
[`STATUS.md`](./STATUS.md).

| Area | Folder | What you will find |
| --- | --- | --- |
| Status | `STATUS.md` | Executive summary, what is implemented, open questions, next steps |
| Research | `research/` | Market, competitors, pain points, open-banking providers, raw research notes |
| Product | `product/` | Vision, personas, jobs-to-be-done, PRD, MVP, backlog, metrics, roadmap, pre-mortem |
| Brand | `brand/` | Brand strategy, naming analysis, identity, visual language, guidelines, tone of voice, assets |
| Design | `design/` | Design principles, design system, user flows, wireframes |
| Architecture | `architecture/` | System architecture, domain model, data pipeline, API, observability, cost architecture |
| ADR | `adr/` | Architecture decision records (template in `0000-adr-template.md`) |
| Security | `security/` | Threat model (STRIDE), security architecture, incident response |
| Compliance | `compliance/` | Regulatory landscape, privacy model, consent model, data retention, legal open questions |
| Business | `business/` | Business model, pricing analysis, unit economics, revenue scenarios, go-to-market |

## Conventions

- Documentation is written in **English** so the repository can be worked on by an
  international team. Product copy, brand voice examples and UI strings are
  **Italian-first** (see `brand/tone-of-voice.md`).
- Every claim that can change over time carries a status label:
  **FACT**, **ASSUMPTION**, **HYPOTHESIS**, **DECISION**, **OPEN QUESTION / UNKNOWN**.
- Sources are cited with a URL and the date they were checked.
- Important decisions get an ADR. Decisions without an ADR are not decisions.

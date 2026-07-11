# CompensaIQ — Employee Salary Management Software

### Requirements Document

## Goal

Give ACME's HR Manager a single web-based system to manage salary data for 10,000 employees across multiple countries, replacing spreadsheets — and let them _ask questions_ about how the org pays people (trends, gaps, comparisons) instead of manually building pivot tables.

## Primary Persona

HR Manager — non-technical, needs fast answers ("what's our average pay gap in engineering across the US and India?"), not a spreadsheet with more clicks.

## In Scope

**1. Employee Directory**

- CRUD for employee records (name, employee ID, department, level, country, manager, start date)
- Search, filter (department/country/level), pagination — must stay fast at 10k rows

**2. Salary Management**

- Salary record per employee: base pay, currency, bonus/variable pay, effective date
- Full history (not just current value) — salary changes are append-only, not overwritten, so trends and past decisions stay auditable
- Currency stored natively + normalized to USD for cross-country comparison

**3. "Answer Questions" Layer (the core differentiator)**

- Aggregate views: average/median pay by department, country, level; headcount cost trends over time; basic pay-equity gap flags
- Natural-language query box: HR manager types a question in plain English, the system translates it into a safe, parameterized query against precomputed aggregates and returns a grounded answer (never freeform SQL from the LLM directly — the query surface is fixed and validated)

**4. Compensation Bands & Ratio**

- Define pay bands (min/mid/max) per role/level/country, following the pattern used by Rippling's compensation module
- Show each employee's compa-ratio (actual pay ÷ band midpoint) and flag employees materially outside their band

**5. Compensation Benchmarking (seeded mock market data)**

- A seeded internal "market benchmark" reference table per role/level/country, in the style of ADP's benchmarking data — not a live external feed, clearly labeled as illustrative/seeded data
- Comparison view: internal pay vs. benchmark, by dimension

**6. Org Chart View**

- Visual reporting-line chart derived from the existing manager relationship, clickable through to employee detail

**7. Audit Log**

- Immutable, append-only log of every create/edit/deactivate/bulk action (actor, timestamp, before/after values) — mirrors the audit-log pattern used across enterprise HR platforms, and reinforces the same append-only philosophy already used for salary history

**8. Custom & Saved Reports**

- A report builder: pick dimensions + metrics, preview, export CSV, optionally save the report definition for reuse

**9. Access Control**

- HR Manager role (full access) via Auth.js; single-account gate, no public signup

**10. Seeding & Data**

- Script generating 10,000 employees across ~5-6 countries, realistic department/level distribution, plausible salary bands and history, plus seeded compensation bands and benchmark data

## Explicitly Out of Scope (and why)

| Excluded                                                                | Reasoning                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payroll processing / bank disbursement                                  | Different system of record; this tool manages _data about_ pay, not the pay run itself. Even unified platforms like Rippling and Workday treat this as a distinct module with its own compliance surface |
| Tax withholding / compliance calculations                               | Jurisdiction-specific, high-liability, out of proportion to the assessment's scope                                                                                                                       |
| Multi-step approval workflows for raises                                | Rippling/Workday support this, but it's a state-machine feature for a _process_, not for managing salary data itself — adds significant complexity for limited signal here                               |
| Employee self-service portal                                            | Out of persona — the brief defines one persona (HR Manager), not an employee-facing app                                                                                                                  |
| Performance reviews tied to compensation                                | Workday links these, but performance management is a separate domain from salary data management                                                                                                         |
| Multi-parallel org hierarchies (legal entity, cost center, matrix orgs) | Workday-tier complexity; a single manager-based reporting hierarchy is sufficient for a 10k-employee HR tool at this scope                                                                               |
| SSO / multi-tenant / i18n                                               | Enterprise-scale concerns not implied by a single-org, single-HR-manager persona                                                                                                                         |
| Editable historical salary records                                      | Deliberately append-only — preserves trend integrity, avoids silent data loss                                                                                                                            |
| Live external benchmarking data feed (e.g. ADP's 42M-employee dataset)  | No real data source available for a take-home; a seeded, clearly-labeled mock benchmark table demonstrates the same UX pattern without pretending to have real market data                               |

## Success Criteria

- HR Manager can find any employee's current and historical pay in under 3 clicks
- Directory and search stay responsive at 10k rows
- At least 3 non-trivial questions about pay data can be answered through the NL query feature with a grounded, correct response
- Clean incremental commit history showing the build's evolution

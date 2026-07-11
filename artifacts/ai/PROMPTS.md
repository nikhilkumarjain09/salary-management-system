# PROMPTS.md — Sequential Build Guide for Antigravity
### PaySight: Employee Salary Management Software

Methodology: feed one phase at a time into Antigravity. Do not move to the next phase until the current one builds, runs, and is committed. Commit after every phase (this is graded).

Every phase prompt below starts with the same line: **"Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions."** SETTINGS.md holds the standing rules (theme, icons, reusable components, animation, responsiveness, audit logging, code quality) so they don't need to be retyped in every prompt — just make sure SETTINGS.md is committed to the repo root before Phase 1 runs.

If you notice drift mid-phase (light-mode colors, an emoji, a duplicated one-off component, a write path that skips the audit log), stop and send: *"You've drifted from SETTINGS.md on [X] — fix it before continuing."* Don't let it ride "for later."

Phases 8-10 add enterprise features (compensation bands, benchmarking, org chart) modeled on real patterns from Rippling and ADP's compensation tooling — see the research notes at the bottom of this file for sourcing.

---

## Phase 0 — Requirements Alignment
```
Read REQUIREMENTS.md in this repo. Confirm you understand the scope, the persona,
and the explicit out-of-scope list. Do not propose features from the out-of-scope
list at any point in this build. Summarize the plan back to me in 5 bullet points
before writing any code.
```

## Phase 1 — Project Scaffolding & Design System
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Scaffold a Next.js 15 App Router project with TypeScript, Tailwind CSS, and
shadcn/ui. Set up ESLint + Prettier. Install lucide-react and framer-motion.

Define the design tokens and folder structure described in SETTINGS.md
(globals.css CSS variables for both Dark and Light themes, type scale,
spacing/radius scale). Implement the theme system: a ThemeProvider, a
ThemeToggle component in the app header, and the no-flash-on-load pattern
described in SETTINGS.md. Default to Dark. Add the placeholder favicon and
logo component as described there.

Build the first pass of the reusable component layer in components/ui/:
Button (with loading state prop), Card, PageHeader, EmptyState,
LoadingSpinner, and Skeleton (a generic shimmering block plus a
SkeletonTable and SkeletonCard variant — these get used starting Phase 5).

Set up folder structure: app/, components/ui/, components/, lib/, prisma/,
scripts/. Commit as "chore: project scaffolding, theme system, and design
system".
```

## Phase 2 — Database Schema (Prisma + PostgreSQL)
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Design a Prisma schema for:
- User (id, email, passwordHash) — a single account type, no role column,
  since there is only one persona (HR Manager) for this tool
- Employee (id, employeeCode, name, department, level, country, managerId
  self-relation, startDate, isActive)
- SalaryRecord (id, employeeId, baseAmount, currency, bonusAmount, effectiveDate,
  createdAt) — append-only, never updated in place, so history is queryable
- CompensationBand (id, department, level, country, minAmount, midAmount,
  maxAmount, currency) — one row per role/level/country combination, used to
  calculate each employee's compa-ratio (actual pay ÷ band midpoint)
- MarketBenchmark (id, department, level, country, benchmarkAmount, currency,
  percentile, sourceLabel) — seeded mock data, sourceLabel should literally
  say "Seeded illustrative data — not a live market feed" so this is never
  mistaken for real external data
- AuditLogEntry (id, actorLabel, action, entityType, entityId, beforeValue
  Json?, afterValue Json?, createdAt) — append-only, one row per create/edit/
  deactivate/bulk action anywhere in the app
- Add indexes on Employee.department, Employee.country, Employee.level,
  Employee.name, Employee.startDate, a compound index on Employee.isActive +
  department + level + country (matches the DatabaseSearchService query
  pattern from Phase 5), SalaryRecord.employeeId + effectiveDate,
  CompensationBand.department + level + country, and AuditLogEntry.entityType
  + entityId for query performance at 10k+ rows.
Explain the append-only decision for SalaryRecord and AuditLogEntry in a code
comment. Run migration. Commit as "feat: database schema".
```

## Phase 3 — Seed Script (10,000 Employees + Bands + Benchmarks)
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Write a seed script (scripts/seed.ts) using @faker-js/faker that generates
10,000 employees distributed realistically across 6 countries (US, India, UK,
Germany, Singapore, Brazil), 8 departments, and 5 levels (L1-L5). For each
employee generate 1-4 historical SalaryRecord entries with plausible raises
over time and country-appropriate currency/amounts (e.g., INR for India, USD
for US). Also seed a CompensationBand row for every department/level/country
combination that actually occurs in the generated data, with plausible
min/mid/max spreads, and a MarketBenchmark row for each of those same
combinations (clearly labeled as seeded/illustrative, not real). Batch-insert
for performance (createMany, chunked). This script only writes to Postgres —
Elasticsearch index population (if configured) is handled in Phase 5 once
the search service exists. Add a progress log. Commit as
"feat: seed script for 10k employees, bands, and benchmarks".
```

## Phase 4 — Auth (Session Gate)
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Implement Auth.js v5 with credentials-based login. Seed exactly one account
(the HR Manager) — no signup flow, no role/permission table, since there is
only one persona for this tool. Add middleware that protects every /app
route except /login: no session redirects to /login, a valid session gets
full access. Style the login page using the shared components/ui/
Button/FormField — this is the first screen anyone sees, it should look
intentional. Commit as "feat: authentication".
```

## Phase 5 — Employee Directory (Pluggable Search)
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Extend components/ui/ with the remaining reusable pieces this phase needs:
DataTable (sortable, paginated, supports skeleton cell/row overlays), Modal,
FormField (label + input + validation error, one consistent look for every
form in the app), and StatCard (for dashboard numbers later). Build these
once — do not create page-specific table or form markup afterward.

Implement search as a pluggable ISearchService interface (lib/search.ts)
with two implementations:
- DatabaseSearchService: indexed Prisma queries — the zero-dependency
  default so local startup never requires external infra.
- ElasticsearchSearchService: only activates when ELASTICSEARCH_URL is set
  in .env; supports fuzzy/typo-tolerant full-text search, edge_ngram-based
  autocomplete, and match highlighting via the @elastic/elasticsearch client.
A factory function selects the implementation at startup based on whether
ELASTICSEARCH_URL is configured — no other code should care which one is
active.

Employee CRUD mutations commit to Postgres first (source of truth); on
success, a background sync call updates the Elasticsearch index if it's
active. If that sync fails, log it via a retry logger rather than failing
the mutation — the relational DB must never be blocked or rolled back by a
search-index sync issue. If ELASTICSEARCH_URL is configured, add a one-time
bulk-index script (scripts/sync-search-index.ts) that pushes all existing
Postgres employees (including the 10,000 from the Phase 3 seed) into
Elasticsearch — this is what an operator runs once after enabling ES on an
already-seeded database.

Build the employee directory: a paginated, filtered table (department/
country/level dropdowns + name search) that calls ISearchService.search(),
not Prisma directly, so it transparently works against either backend. Show
SkeletonTable rows while loading — never a spinner or blank table. Must stay
fast at 10k rows regardless of which search backend is active. Add an
employee detail page showing profile info and full salary history in a
timeline layout, using SkeletonCard while loading. Add create/edit employee
forms using FormField + Modal with zod validation on both the form (client)
and the API route (server) — see SETTINGS.md's Validation section. Commit
as "feat: employee directory with pluggable search (DB fallback +
Elasticsearch)".
```

## Phase 6 — Enterprise Interaction Patterns
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions, especially the "Enterprise Interaction Patterns"
section.

Build ContextMenu, ConfirmDialog, CommandPalette, and BulkActionBar in
components/ui/ as described in SETTINGS.md — all must open instantly on
trigger per the "Popups: Instant Open" section, with no mount delay before
content is visible and interactive.

Wire ContextMenu into the employee directory table: right-click (and a
visible kebab button per row) opens actions — View Details, Edit, View
Salary History, Export This Employee, Deactivate. Deactivate routes through
ConfirmDialog, clearly stating the employee's name and that this is
reversible (isActive can be toggled back) vs. destructive.

Add row checkboxes to DataTable. When one or more rows are selected, show
BulkActionBar with the count and: Export Selected (CSV), Bulk Change
Department, Bulk Change Level. Bulk changes go through ConfirmDialog stating
exactly how many employees will be affected before committing.

Wire up CommandPalette (Cmd/Ctrl+K) globally: search employees by name/ID
using the same ISearchService from Phase 5 (not a separate ad hoc query, so
autocomplete/fuzzy behavior stays consistent whether ES is active or not),
plus jump to Dashboard, Directory, or the NL query box. Full keyboard
navigation, closes on Escape.

Commit as "feat: context menus, bulk actions, and command palette".
```

## Phase 7 — Audit Log
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions, especially the "Audit Logging" section.

Add an AuditLogEntry write to every mutation built so far: employee create/
edit/deactivate, salary record creation, and every bulk action from Phase 6.
Capture actor, action, entity type/id, and before/after values where
applicable.

Build an Audit Log page: a paginated, filterable (by entity type, date
range, action) table using the shared DataTable, showing a human-readable
description of each entry (e.g., "Deactivated employee Jane Doe" rather than
raw JSON). Clicking an entry expands to show the before/after diff. Commit
as "feat: audit logging and audit log viewer".
```

## Phase 8 — Compensation Bands & Compa-Ratio
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Build a Compensation Bands page: a table of all CompensationBand rows
(department/level/country/min/mid/max), editable through the shared
FormField + Modal pattern, with edits going through the audit log.

On the employee detail page, show the employee's compa-ratio (current base
pay ÷ their band's midpoint, normalized to the band's currency) as a
StatCard with a clear visual indicator when an employee falls notably below
or above their band (e.g., under 80% or over 120%). On the employee
directory, add an optional column/filter for "outside band" employees so the
HR manager can spot outliers at a glance. Commit as
"feat: compensation bands and compa-ratio".
```

## Phase 9 — Compensation Benchmarking
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Build a Benchmarking view (on the employee detail page and as its own
dashboard section): compare an employee's or a department/level/country
group's actual pay against the seeded MarketBenchmark data, shown as a
simple bar or gauge comparison. Every screen showing benchmark data must
visibly display the MarketBenchmark.sourceLabel text so it's never mistaken
for a real live market feed. Commit as
"feat: compensation benchmarking against seeded market data".
```

## Phase 10 — Org Chart View
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Build an Org Chart page deriving structure from Employee.managerId: a
collapsible tree/chart view (a library like react-organizational-chart, or a
custom recursive component, is fine) starting from top-level employees with
no manager. Each node shows name, title/level, and department, and is
clickable through to that employee's detail page. Must stay usable with
10,000 employees — default to collapsed below 2 levels deep with expand-on-
click, not rendering the entire tree at once. Commit as
"feat: org chart view".
```

## Phase 11 — Salary Management UI
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

On the employee detail page, add a "Record Salary Change" form that appends
a new SalaryRecord — never edits an existing one. Show currency clearly next
to every amount. Add a small inline chart (recharts) of that employee's pay
history over time. Commit as "feat: salary history recording and
visualization".
```

## Phase 12 — Analytics Dashboard
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Build a dashboard page using StatCard for headline metrics, plus:
average/median pay by department (bar chart), by country (normalized to USD,
bar chart), headcount cost trend over the last 12 months (line chart), and a
simple pay-equity view (spread of pay within the same department+level
across countries, flagged if variance exceeds a threshold). Precompute these
as aggregate queries (SQL GROUP BY, not in-memory reduction over 10k rows in
JS). Commit as "feat: analytics dashboard with precomputed aggregates".
```

## Phase 13 — Natural-Language Query Feature
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Add an "Ask about pay" query box on the dashboard. Design a fixed, validated
set of query "shapes" (e.g., avg pay by dept/country/level, headcount cost
trend, pay gap by dimension, compa-ratio outliers) as parameterized
functions — not raw SQL generation. Use the Anthropic API to classify the
user's natural-language question into one of these shapes + extract its
parameters (structured JSON output), then execute the matching safe query
and return a grounded answer with the underlying numbers shown, not just
prose. If the question doesn't map to a known shape, say so rather than
guessing. Commit as "feat: natural language query interface for pay data".
```

## Phase 14 — Custom & Saved Reports
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Build a Reports page: a simple report builder letting the HR manager pick
dimensions (department, country, level) and metrics (avg/median pay,
headcount, compa-ratio), preview the result as a table, and export it as
CSV. Let the HR manager save a report definition (name + chosen dimensions/
metrics) for one-click reuse later — store this as a simple JSON config per
saved report, not a new bespoke schema per report type. Commit as
"feat: custom and saved reports with CSV export".
```

## Phase 15 — Testing
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Write unit tests (Vitest) for: salary currency normalization logic, compa-
ratio calculation, the NL-query shape-matching function (mock the LLM call),
the auth middleware (no session redirects, valid session passes through),
bulk-action affected-row counting, audit log entry creation on a mutation,
the pay-equity variance calculation, and the search service factory (mock
ELASTICSEARCH_URL present/absent and confirm the correct implementation is
selected, mock the ES client entirely — no real network calls). Tests must
be fast and deterministic — no real network/LLM calls, no real database (use
an in-memory or mocked Prisma client). Add a couple of integration tests for
the employee API routes. Commit as "test: unit and integration test
coverage".
```

## Phase 16 — Skeleton, Theme, and Validation Hardening
```
Read SETTINGS.md before starting, especially "Loading Skeletons", "Theme &
Visual Identity", "Popups: Instant Open", and "Validation".

Audit every data-loading screen built so far (directory, employee detail,
audit log, compensation bands, benchmarking, org chart, dashboard, reports)
and confirm each shows an appropriate Skeleton variant during load — add one
anywhere it's missing or still shows a bare spinner/blank state.

Toggle between Dark and Light theme on every screen and fix any hardcoded
colors that don't respond to the toggle, any contrast issues in Light theme,
and confirm the no-flash-on-load behavior actually works on a hard refresh.

Confirm ContextMenu, ConfirmDialog, CommandPalette, Modal, and Toast all open
instantly with no perceptible delay anywhere they're used.

Confirm the directory and CommandPalette search behave correctly with
ELASTICSEARCH_URL both unset (DB fallback) and set to a local test instance
(fuzzy/typo-tolerant results, highlighting) — the UI and loading states
should look identical either way; only the search quality/speed differs.

Audit every form in the app (employee create/edit, salary record,
compensation bands, saved reports, login) and confirm zod validation exists
on both the client (field-level errors) and the corresponding API route
(server-side), with specific, actionable error messages. Commit as
"fix: skeleton coverage, theme consistency, and validation hardening".
```

## Phase 17 — UI Polish & No-Breach Audit
```
Read SETTINGS.md again in full before this phase — this is the audit phase
against it specifically.

Do a full pass over every screen at mobile (375px), tablet (768px), and
desktop (1440px+) widths. Fix any overflow, clipped text, or broken table
layouts — the org chart especially needs a usable mobile/narrow-screen
fallback. Check every rule in SETTINGS.md against every screen built so far:
theme consistency (both Dark and Light), icon consistency, no duplicated
one-off components, animation consistency, loading states on every async
action, ContextMenu/ConfirmDialog/CommandPalette keyboard accessibility, and
confirm every write path (including bands, reports, and benchmarking edits)
logs to the audit log. Consolidate any violations found. Commit as
"polish: responsive layout, component consistency, and animation pass".
```

## Phase 18 — Deployment
```
Read SETTINGS.md before starting and follow it for all design, component, and
code-quality decisions.

Deploy the app (Vercel for the Next.js app, a managed Postgres like Neon or
Render for the database). Document environment variables needed in a
.env.example, including the optional ELASTICSEARCH_URL (+
ELASTICSEARCH_USERNAME/ELASTICSEARCH_PASSWORD if using a hosted deployment
like Elastic Cloud or Render) — clearly note in the README that these are
optional and the app runs fully functional on the DB-only search fallback if
they're omitted, so the reviewer doesn't need to stand up Elasticsearch to
evaluate the submission. Add a README with setup instructions, architecture
decisions, and a link to the requirements doc. Commit as
"chore: deployment config and README".
```

### Phase 18a — Hosted Elasticsearch on Render (manual + follow-up prompt)

Note: Render's private networking only works between services hosted on
Render itself. Since the Next.js app is deployed on Vercel, Elasticsearch
must be deployed as a public Web Service (not a Private Service) with
security enabled — it's internet-reachable, so it needs auth. If you'd
rather keep it fully private, the whole app would need to move to Render;
this runbook assumes you're keeping Vercel and exposing ES with basic auth.

**Manual steps in the Render dashboard (infra setup, not something
Antigravity can do):**
1. Fork `render-examples/elasticsearch` on GitHub.
2. Render → New → Web Service → connect the fork → set Language to Docker.
3. Env vars: `discovery.type=single-node`, `xpack.security.enabled=true`,
   `ELASTIC_PASSWORD=<strong generated password>`.
4. Advanced → add a persistent Disk so the index survives restarts/redeploys.
5. Pick an instance type with enough memory (Elasticsearch needs more than
   the smallest free/starter tier typically provides — check Render's
   current pricing for the smallest tier offering at least 1-2GB RAM).
6. Deploy. `ELASTICSEARCH_URL` = the service's public Render URL,
   `ELASTICSEARCH_USERNAME=elastic`, `ELASTICSEARCH_PASSWORD` = what you set.
7. Add all three as environment variables in the Vercel project settings.

**Follow-up prompt for Antigravity (after the above is live):**
```
Read SETTINGS.md, especially the "Search Architecture" section.

Elasticsearch is now deployed as a separate hosted service (Render Web
Service, publicly reachable over HTTPS with basic auth enabled) rather than
a local Docker instance. Update the ElasticsearchSearchService to:

1. Confirm it authenticates using ELASTICSEARCH_USERNAME and
   ELASTICSEARCH_PASSWORD (basic auth) when present, in addition to
   ELASTICSEARCH_URL — not just URL-only, since this instance requires auth.
2. Confirm all requests go over HTTPS and fail loudly (logged, not silent)
   if auth is misconfigured, rather than silently falling back to
   DatabaseSearchService without explanation — a misconfigured ES should be
   a visible warning in logs, even though the app still works via fallback.
3. Add a lightweight health-check utility (a script or an admin-only API
   route) that pings the ES health endpoint and reports connected/not
   connected, useful for confirming the hosted instance is reachable after
   deployment.

Update .env.example to include ELASTICSEARCH_URL, ELASTICSEARCH_USERNAME,
and ELASTICSEARCH_PASSWORD with comments explaining they're optional in
local dev (DB fallback applies) but required for the hosted instance in
production. Update the README with the Render deployment steps for
Elasticsearch. Run the Phase 5 bulk-index backfill script against the new
hosted instance and confirm it completes. Commit as "feat: hosted
Elasticsearch integration with auth and health check".
```

## Phase 19 — Demo Video Prep
```
Not a code prompt — record a 3-5 minute walkthrough: (1) login as HR
Manager, (2) toggle between Dark and Light theme, (3) browse/search the
10k-employee directory and point out the skeleton loading state on a slow
network throttle, (4) right-click an employee row to show the context menu,
(5) select several rows and show a bulk action with its confirmation dialog,
(6) open the command palette and jump to an employee, (7) view an employee's
salary history and record a new change, showing a validation error first
(e.g. negative salary) before the successful save, (8) show that employee's
compa-ratio and benchmark comparison, (9) show the org chart, (10) show the
analytics dashboard, (11) ask 2-3 questions in the NL query box and show
grounded answers, (12) build and export a custom report, (13) show the audit
log reflecting everything just done. Narrate the key architectural decisions
briefly (append-only salary and audit history, normalized currency, fixed
query shapes for the LLM feature, confirmation-gated destructive actions,
client+server validation).
```

---

## Research Notes (sourcing for Phases 7-10, 14)
- Compensation bands, compa-ratio, and a promotion-discussion calculator are
  modeled on Rippling's Compensation Bands module.
- Compensation benchmarking against a large aggregated dataset is modeled on
  ADP Workforce Now's benchmarking feature (real version uses a 42M-employee
  dataset — ours uses seeded, clearly-labeled illustrative data instead).
- Immutable audit logging for every HR/payroll action is a pattern used
  across Rippling's platform, extended here to cover every write in this app.
- Org chart derived from reporting lines, and custom/scheduled reporting on
  headcount/compensation/DEI metrics, are both standard features across
  Rippling's HRIS and reporting engine.
- Deliberately not modeled: Workday's multi-hierarchy org modeling (legal
  entity, cost center, matrix orgs) and multi-step compensation approval
  workflows — genuinely enterprise-tier complexity beyond this tool's scope.

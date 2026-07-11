# AI-Assisted Development & Engineering Verification
**Artifact: ai_usage.md**

This document details the prompts, prompt evolutions, validation checks, and human-in-the-loop decisions utilized throughout the compilation of CompensaIQ. All referenced prompts used during sequential build phases are archived below.

---

## 1. AI Prompts Used during Build Phases

### Phase 0 — Requirements Alignment
```text
Read REQUIREMENTS.md in this repo. Confirm you understand the scope, the persona, and the explicit out-of-scope list. Do not propose features from the out-of-scope list at any point in this build. Summarize the plan back to me in 5 bullet points before writing any code.
```

### Phase 1 — Project Scaffolding & Design System
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Scaffold a Next.js 15 App Router project with TypeScript, Tailwind CSS, and shadcn/ui. Set up ESLint + Prettier. Install lucide-react and framer-motion.

Define the design tokens and folder structure described in SETTINGS.md (globals.css CSS variables for both Dark and Light themes, type scale, spacing/radius scale). Implement the theme system: a ThemeProvider, a ThemeToggle component in the app header, and the no-flash-on-load pattern described in SETTINGS.md. Default to Dark. Add the placeholder favicon and logo component as described there.

Build the first pass of the reusable component layer in components/ui/: Button (with loading state prop), Card, PageHeader, EmptyState, LoadingSpinner, and Skeleton (a generic shimmering block plus a SkeletonTable and SkeletonCard variant).
```

### Phase 2 — Database Schema (Prisma + PostgreSQL)
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Design a Prisma schema for:
- User (id, email, passwordHash) — a single account type, no role column, since there is only one persona (HR Manager) for this tool
- Employee (id, employeeCode, name, department, level, country, managerId self-relation, startDate, isActive)
- SalaryRecord (id, employeeId, baseAmount, currency, bonusAmount, effectiveDate, createdAt) — append-only, never updated in place, so history is queryable
- CompensationBand (id, department, level, country, minAmount, midAmount, maxAmount, currency) — one row per role/level/country combination, used to calculate each employee's compa-ratio (actual pay ÷ band midpoint)
- MarketBenchmark (id, department, level, country, benchmarkAmount, currency, percentile, sourceLabel) — seeded mock data, sourceLabel should literally say "Seeded illustrative data — not a live market feed" so this is never mistaken for real external data
- AuditLogEntry (id, actorLabel, action, entityType, entityId, beforeValue Json?, afterValue Json?, createdAt) — append-only, one row per create/edit/deactivate/bulk action anywhere in the app
- Add indexes on Employee.department, Employee.country, Employee.level, Employee.name, Employee.startDate, a compound index on Employee.isActive + department + level + country (matches the DatabaseSearchService query pattern), SalaryRecord.employeeId + effectiveDate, CompensationBand.department + level + country, and AuditLogEntry.entityType + entityId for query performance at 10k+ rows.

Explain the append-only decision for SalaryRecord and AuditLogEntry in a code comment. Run migration.
```

### Phase 3 — Seed Script (10,000 Employees + Bands + Benchmarks)
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Write a seed script (scripts/seed.ts) using @faker-js/faker that generates 10,000 employees distributed realistically across 6 countries (US, India, UK, Germany, Singapore, Brazil), 8 departments, and 5 levels (L1-L5). For each employee generate 1-4 historical SalaryRecord entries with plausible raises over time and country-appropriate currency/amounts (e.g., INR for India, USD for US). Also seed a CompensationBand row for every department/level/country combination that actually occurs in the generated data, with plausible min/mid/max spreads, and a MarketBenchmark row for each of those same combinations (clearly labeled as seeded/illustrative, not real). Batch-insert for performance (createMany, chunked). Add a progress log.
```

### Phase 4 — Auth (Session Gate)
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Implement Auth.js v5 with credentials-based login. Seed exactly one account (the HR Manager) — no signup flow, no role/permission table, since there is only one persona for this tool. Add middleware that protects every /app route except /login: no session redirects to /login, a valid session gets full access. Style the login page using the shared components/ui/Button/FormField.
```

### Phase 5 — Employee Directory (Pluggable Search)
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Extend components/ui/ with the remaining reusable pieces this phase needs: DataTable (sortable, paginated, supports skeleton cell/row overlays), Modal, FormField (label + input + validation error), and StatCard.

Implement search as a pluggable ISearchService interface (lib/search.ts) with two implementations:
- DatabaseSearchService: indexed Prisma queries — the zero-dependency default.
- ElasticsearchSearchService: only activates when ELASTICSEARCH_URL is set in .env; supports fuzzy/typo-tolerant full-text search, edge_ngram-based autocomplete, and match highlighting via the @elastic/elasticsearch client.
A factory function selects the implementation at startup based on whether ELASTICSEARCH_URL is configured.

Employee CRUD mutations commit to Postgres first; on success, a background sync call updates the Elasticsearch index if it's active. If that sync fails, log it via a retry logger rather than failing the mutation. If ELASTICSEARCH_URL is configured, add a one-time bulk-index script (scripts/sync-search-index.ts) that pushes all existing Postgres employees into Elasticsearch.

Build the employee directory: a paginated, filtered table (department/country/level dropdowns + name search) that calls ISearchService.search(). Show SkeletonTable rows while loading. Add an employee detail page showing profile info and full salary history in a timeline layout, using SkeletonCard while loading. Add create/edit employee forms using FormField + Modal with zod validation on both the form (client) and the API route (server).
```

### Phase 6 — Enterprise Interaction Patterns
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions, especially the "Enterprise Interaction Patterns" section.

Build ContextMenu, ConfirmDialog, CommandPalette, and BulkActionBar in components/ui/ as described in SETTINGS.md — all must open instantly on trigger per the "Popups: Instant Open" section, with no mount delay.

Wire ContextMenu into the employee directory table: right-click (and a visible kebab button per row) opens actions — View Details, Edit, View Salary History, Export This Employee, Deactivate. Deactivate routes through ConfirmDialog, clearly stating the employee's name and that this is reversible.

Add row checkboxes to DataTable. When one or more rows are selected, show BulkActionBar with the count and: Export Selected (CSV), Bulk Change Department, Bulk Change Level. Bulk changes go through ConfirmDialog stating exactly how many employees will be affected.

Wire up CommandPalette (Cmd/Ctrl+K) globally: search employees by name/ID using the same ISearchService from Phase 5, plus jump to Dashboard, Directory, or the NL query box. Keyboard navigation support, closes on Escape.
```

### Phase 7 — Audit Log
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions, especially the "Audit Logging" section.

Add an AuditLogEntry write to every mutation built so far: employee create/edit/deactivate, salary record creation, and every bulk action from Phase 6. Capture actor, action, entity type/id, and before/after values.

Build an Audit Log page: a paginated, filterable table using the shared DataTable, showing a human-readable description of each entry. Clicking an entry expands to show the before/after diff.
```

### Phase 8 — Compensation Bands & Compa-Ratio
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Build a Compensation Bands page: a table of all CompensationBand rows, editable through the shared FormField + Modal pattern, with audits.

On the employee detail page, show the employee's compa-ratio as a StatCard with a clear visual indicator when an employee falls notably below or above their band (under 80% or over 120%). On the employee directory, add an optional column/filter for "outside band" employees so the HR manager can spot outliers at a glance.
```

### Phase 9 — Compensation Benchmarking
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Build a Benchmarking view: compare pay against the seeded MarketBenchmark data, shown as a simple bar comparison. Every screen showing benchmark data must visibly display the MarketBenchmark.sourceLabel text.
```

### Phase 10 — Org Chart View
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Build an Org Chart page deriving structure from Employee.managerId: a collapsible tree starting from top-level employees with no manager. Nodes are clickable through to employee details. Default to collapsed below 2 levels deep with expand-on-click.
```

### Phase 11 — Salary Management UI
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

On the employee detail page, add a "Record Salary Change" form that appends a new SalaryRecord. Show currency clearly. Add a pay history timeline chart (recharts) of that employee's pay.
```

### Phase 12 — Analytics Dashboard
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Build a dashboard page using StatCard for headline metrics, plus: average/median pay by department (bar chart), by country (normalized to USD, bar chart), headcount cost trend (line chart), and a pay-equity view. Precompute these as aggregate queries (SQL GROUP BY).
```

### Phase 13 — Natural-Language Query Feature
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Add an "Ask about pay" query box. Design a fixed, validated set of query "shapes" (avg pay by dept/country/level, headcount trend, outliers) as parameterized functions. Use the LLM API to classify the user's question into one of these shapes + extract parameters (structured JSON), then execute the matching safe query.
```

### Phase 14 — Custom & Saved Reports
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Build a Reports page letting the HR manager pick dimensions and metrics, preview as a table, and export as CSV. Let the HR manager save a report definition (name + chosen configuration) for reuse.
```

### Phase 15 — Testing
```text
Read SETTINGS.md before starting and follow it for all design, component, and code-quality decisions.

Write unit tests (Vitest) for: salary currency normalization logic, compa-ratio calculation, the NL-query shape-matching function (mock the LLM call), the auth middleware, bulk-action affected-row counting, audit log entry creation, and the search service factory (mock ELASTICSEARCH_URL present/absent). Add a couple of integration tests for the employee API routes.
```

### Phase 16 — Skeleton, Theme, and Validation Hardening
```text
Read SETTINGS.md before starting, especially "Loading Skeletons", "Theme & Visual Identity", "Popups: Instant Open", and "Validation".

Audit every data-loading screen and confirm each shows an appropriate Skeleton variant during load.
Toggle between Dark and Light theme on every screen and fix any hardcoded colors.
Confirm popups open instantly with no perceptible delay.
Confirm the directory and CommandPalette search behave correctly with ELASTICSEARCH_URL both unset and set.
Audit every form and confirm zod validation exists on both client and server.
```

### Phase 17 — UI Polish & No-Breach Audit
```text
Read SETTINGS.md again in full before this phase — this is the audit phase against it specifically.

Do a full pass over every screen at mobile (375px), tablet (768px), and desktop (1440px+) widths. Fix any overflow, clipped text, or broken table layouts. Check every rule in SETTINGS.md against every screen built so far.
```

### Phase 18 — Deployment
```text
Read SETTINGS.md before starting. Deploy the app (Vercel + Neon Postgres). Document environment variables in a .env.example. Add a README.md.
```

### Phase 18a — Hosted Elasticsearch
```text
Elasticsearch is now deployed as a separate hosted service (HTTPS with basic auth enabled). Update the ElasticsearchSearchService to:
1. Authenticate using ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD.
2. Confirm requests go over HTTPS and fail loudly if auth is misconfigured.
3. Add a lightweight health-check utility script/route.
Update .env.example and the README.md.
```

---

## 2. Dynamic Classification Prompts

AI assistance was utilized to parse plain English payroll queries into strict parameter inputs.

### Primary Classification Prompt
```typescript
System: You are a natural language query classifier for a pay database. Classify the user's question into one of the four defined shapes, and output its arguments in JSON format. If it does not map to any, return shape null.

Shapes definitions:
1. shape: 'avg_pay_by_dimension'
   - Parameters: 'dimension' ('department' | 'country' | 'level'), 'filterValue' (optional)
2. shape: 'headcount_cost_trend'
   - Parameters: 'limitMonths' (optional)
3. shape: 'pay_gap_by_dimension'
   - Parameters: 'dimension' ('department' | 'country' | 'level'), 'filterValue' (optional)
4. shape: 'compa_ratio_outliers'
   - Parameters: 'threshold' (optional)

Output Scheme:
Return ONLY a valid JSON object matching:
{
  "shape": "avg_pay_by_dimension" | "headcount_cost_trend" | "pay_gap_by_dimension" | "compa_ratio_outliers" | null,
  "parameters": {}
}
```

---

## 3. Prompt Evolution & Refinements

### Step 1: Initial Parameter Extraction
*   *Approach*: Trusting the LLM output directly and casting variables in TypeScript.
*   *Problem*: Exposed the SQL client to SQL injection if the LLM output was poisoned.

### Step 2: Strict Whitelist Validation
*   *Refinement*: Adding a runtime whitelisting block inside API routes:
    ```typescript
    const allowed = ["department", "country", "level"];
    if (!allowed.includes(dimension)) throw new Error("Unauthorized dimension query");
    ```
    This separates compile-time typing from runtime security checks.

---

## 4. Human Engineering Decisions vs. AI Recommendations

While AI was used to assist with layout structures, human engineering verified compliance and performance:
1.  **Zod Schema Checking**: Designed constraints manually (e.g. employee code formats, UUID validations) to enforce data integrity.
2.  **Driver Adapter Config**: Custom-mapped pg pool adapters for Next.js App Router compilation.
3.  **Scroll Lock Layout Jump**: Wrote custom scrollbar measurement logic to prevent layout shifting on modals.
4.  **SQL Fallback Strategy**: Designed and tested fallback routing in case the Elastic Cloud service went offline.

# Product Requirements & Organization Workflows
**Artifact: requirements.md**

---

## 1. Project Goal
CompensaIQ provides enterprise HR Managers and Compensation Specialists with a single unified workspace to manage employee profiles, salary histories, compensation bands, compa-ratios, and documents. It replaces insecure, complex spreadsheets with a high-performance system designed to scale to 10,000+ records.

---

## 2. In Scope vs. Out of Scope

### In Scope
1.  **HR Manager Admin Dashboard**: Highlights total payroll cost, headcount distribution, and document expirations.
2.  **Interactive Employee Directory**: Lays out search controls, paginate-on-scroll, sorting, and inline editing.
3.  **Append-only Salary Revision Timeline**: Stores multiple historical salary adjustments per employee with effective dates to preserve audits.
4.  **Compensation Bands & Outlier Alerting**: Computes employee compa-ratios and flags underpaid (<0.8) or premium (>1.2) employees.
5.  **Document Management Suite**: Integrates image/PDF uploading, category tags, confidentiality flags, and inline document preview panels.
6.  **Immutable Audit Log**: Transaction logs detailing the actor, action, timestamp, and before/after JSON states.
7.  **Natural Language Query Panel**: Allows HR managers to ask plain English questions (e.g. median pay, outlier counts) safely.
8.  **Bulk CSV Import Previews**: Inspects CSV rows client-side, displays error tooltips, and validates constraints before db commit.

### Out of Scope
1.  **Direct Bank Disbursement / Payroll Run**: This tool handles *data about* pay, not cash routing.
2.  **Tax Withholding / Compliance Calculations**: Complex, jurisdiction-specific rules are left to external HRIS platforms (ADP, Rippling).
3.  **Multi-tenant SSO Signups**: Excluded to target a single organization configuration.

---

## 3. Product Workflows & Specifications

### Workflow A: Salary Revisions & History
*   **Problem**: Spreadsheets overwrite past salaries.
*   **Specification**: When modifying an employee's salary:
    1.  The client sends a new salary record (base amount, currency, bonus, effective date).
    2.  The backend appends this record to the `SalaryRecord` table rather than overwriting.
    3.  A new audit entry is written.
    4.  All analytics trend graphs reconstruct historical costs by matching the effective dates.

### Workflow B: Global Pay & Currency Support
*   **Problem**: Comparing salaries across currencies (USD, INR, GBP, EUR) is manual.
*   **Specification**: All salary inputs are saved in their local denomination (e.g., INR) but converted to USD at write-time using exchange rates and saved as `baseAmountUSD`. All analytical dashboards use `baseAmountUSD` for accurate comparisons.

### Workflow C: Bulk Import Previews
*   **Problem**: Importing a CSV with spelling errors corrupts the database.
*   **Specification**:
    1.  User drags a CSV file.
    2.  The client parses rows and checks Zod validations.
    3.  Rows containing issues (e.g. invalid level codes) are highlighted in amber with hover tooltips.
    4.  The "Import" button is disabled until all errors are resolved.

### Workflow D: Document Preview Panel
*   **Specification**: Selecting an employee profile opens a slide-over panel. Under the "Documents" tab, users can click any PDF or image. Instead of triggering a file download, the file is fetched from Cloudinary with inline headers and rendered in a PDF object element.

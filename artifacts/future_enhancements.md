# Product Roadmap & Changelog
**Artifact: future_enhancements.md**

---

## 1. Feature Roadmap

### Phase 1: Core HR Platform Hardening
*   **Approval Workflows**: Implement a state machine for salary revisions. Changes must be approved by the designated manager before taking effect.
*   **Notification Center**: Trigger email and in-app alerts for pending document expirations or salary revisions.
*   **SSO Integration**: Add support for SAML and OIDC (Okta, Azure AD) for single sign-on.

### Phase 2: AI & Document Intelligence
*   **AI Salary Recommendations**: Predict optimal salary revisions based on employee levels, compa-ratios, and historical performance scores.
*   **OCR Document Ingestion**: Implement optical character recognition (OCR) to automatically extract employee names, document titles, and expiration dates from uploaded PDFs.
*   **Document Classification**: Auto-tag uploaded documents (e.g. passport, contract) using image classification.

### Phase 3: Scaling & Distributed Architecture
*   **Redis Caching**: Replace in-memory caches with distributed Redis caching to support multiple serverless instances.
*   **Asynchronous Job Processing**: Move large imports and bulk actions to an asynchronous worker queue (e.g. BullMQ) to avoid blocking API request/response cycles.
*   **Multi-tenant Architecture**: Support database schemas or workspace isolation for hosting multiple companies on a single platform.

---

## 2. Changelog & Release Notes

### [v1.1.0] — 2026-07-11
#### Added
*   **Dropdown Search Modes**: Added startsWith, exactMatch, and contains filter dropdowns.
*   **DevOps Infrastructure**: Added Dockerfile, docker-compose, and GitHub Actions CI pipelines.
*   **Input Sanitization**: Whitelisted LLM parameters in natural language queries to prevent SQL injection.
*   **Custom Dialog Popups**: Replaced window.alert with custom Modal dialog popups.

#### Fixed
*   **Sidebar Collapse Transitions**: Stabilized link icon shapes and brand image layouts.
*   **Inline PDF Previews**: Configured Cloudinary inline serving headers and HTML5 PDF elements.

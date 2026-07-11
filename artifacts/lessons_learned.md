# Technical Challenges & Risk Analysis
**Artifact: lessons_learned.md**

---

## 1. Technical Challenges

### A. Next.js Dynamic Imports and Cold Starts
*   **Challenge**: CompensaIQ uses PostgreSQL PG adapters. Importing driver adapters inside request lifecycles added cold-start latency to serverless functions.
*   **Resolution**: Moved imports to the top-level module scope inside `lib/prisma.ts` to allow global caching of the database client across serverless invocations.

### B. PDF Inline Serving
*   **Challenge**: Cloudinary served PDFs as raw attachments, causing browsers to download files instead of rendering previews.
*   **Resolution**: Configured the Cloudinary provider upload stream to dynamically set `resource_type: "image"` for PDFs, forcing the service to output inline headers. Wrapped previews in HTML5 `<object>` elements with `iframe` fallbacks.

---

## 2. Risk Analysis & Mitigation

### A. SQL Injection via LLM Parameters
*   **Risk**: Prompt injection can trick the LLM into outputting SQL fragments inside classification arguments.
*   **Mitigation**: Implement strict runtime whitelisting checks inside API route handlers to validate all dynamic query parameters.

### B. Elasticsearch Sync Failures
*   **Risk**: Network timeouts during database commits can leave the search index out of sync.
*   **Mitigation**: Standardize error fallback routes. If Elasticsearch is offline or slow, searches default to direct database querying. Implement a synchronization cron script to reconcile data differences.

### C. Exchange Rate Drift
*   **Risk**: Hardcoded currency conversion rates lead to inaccurate USD salary normalizations.
*   **Mitigation**: Fetch live rates from a currency exchange rate API and cache them daily in the database.

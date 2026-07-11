# DevOps & Production Readiness Blueprint
**Artifact: production_readiness_and_devops.md**

---

## 1. Automated Testing Strategy

CompensaIQ is tested using Vitest to verify business logic correctness and API robustness under mock conditions.

### Test Categories
1.  **Unit Tests (`test/unit.test.ts`)**: Verify core functions (e.g. `convertToUSD`, `convertFromUSD` currency conversions) and search service factory initialization.
2.  **Integration Tests (`test/integration.test.ts`)**: Verify API handlers by mocking database actions and asserting payload structures and audit log side effects.
3.  **Security Tests (`test/pay-query-validation.test.ts`)**: Verify parameter validation on natural language query inputs to block injection.

### Running Tests
Execute the entire test suite locally:
```bash
npx vitest run
```

---

## 2. Production Deployment Runbook

### Prerequisites
*   Neon Serverless PostgreSQL project instance
*   Elastic Cloud (Elasticsearch) deployment endpoint
*   Cloudinary credentials (cloud name, API key, API secret)

### Step-by-Step Deployment
1.  **Environment Setup**: Add all environment variables listed in `.env.example` to Vercel/production settings.
2.  **Database Migration**: Run the migration command pointing to the production database:
    ```bash
    npx prisma migrate deploy
    ```
3.  **Database Seeding**: Populate the database with standard metadata and the default administrator account:
    ```bash
    pnpm prisma:seed
    ```
4.  **Elasticsearch Initialization**: Synchronize search indexes:
    ```bash
    pnpm search:sync
    ```

---

## 3. Operational Infrastructure

### Observability & Logging
*   All exceptions and API operations write error traces using standard error boundaries.
*   Production containers should route logs to aggregate logging services (e.g. Datadog, Logtail) for centralized tracing.

### Health Monitoring
*   **Endpoint**: `/api/health`
*   **Behavior**: Executes a quick `prisma.$queryRaw` statement to verify PostgreSQL connection and queries the search index to confirm Elastic node availability.
*   **Alerting**: Monitor the health endpoint using uptime monitoring tools (e.g., Better Stack) to trigger alerts on failure.

### Backups & Recovery
*   **PostgreSQL**: Neon provides point-in-time recovery (PITR) and automated daily snapshots.
*   **Elasticsearch**: Configured with automatic index snapshots stored in cloud storage buckets.
*   **Disaster Recovery (DR)**: Runbooks should document restoring databases from snapshots and rebuilding search indexes from scratch using the `pnpm search:sync` utility script.

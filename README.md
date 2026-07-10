# Salary Management System

An enterprise-grade Salary Management System built with Next.js, Prisma, Neon PostgreSQL, Auth.js (v5), Groq AI, and Elastic Cloud.

---

## Technical Stack

- **Framework**: Next.js 15 (App Router with Turbopack)
- **Database**: Neon Serverless PostgreSQL
- **ORM**: Prisma ORM v7 (Driver-adapter based architecture)
- **Authentication**: Auth.js v5 (Credentials Provider)
- **Search**: Elastic Cloud (Elasticsearch) with direct Database fallback
- **AI Integration**: Groq API (Llama 3 classification shapes)
- **Styling**: Vanilla CSS with Tailwind CSS tokens and themes

---

## Environment Variables Configuration

Copy `.env.example` to `.env` and fill in the required keys:

```bash
cp .env.example .env
```

| Variable                 | Scope        | Description                                                               |
| :----------------------- | :----------- | :------------------------------------------------------------------------ |
| `DATABASE_URL`           | **Required** | The connection string for your database (PostgreSQL in production).       |
| `AUTH_SECRET`            | **Required** | A random 32-byte secret used to sign session cookies.                     |
| `GROQ_API_KEY`           | **Required** | API Key from Groq Cloud console to enable the Natural Language query bar. |
| `ELASTICSEARCH_URL`      | _Optional_   | The Elasticsearch HTTPS node URL from Elastic Cloud.                      |
| `ELASTICSEARCH_USERNAME` | _Optional_   | Username for Elastic Cloud authentication (default: `elastic`).           |
| `ELASTICSEARCH_PASSWORD` | _Optional_   | Password for Elastic Cloud authentication.                                |

---

## Local Setup (Zero-Manual-Step Sandbox)

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Generate Prisma client**:
    ```bash
    pnpm prisma:generate
    ```
3.  **Run migrations and seed local database** (Uses SQLite fallback if `DATABASE_URL` is omitted):
    ```bash
    npx prisma migrate dev --name init
    pnpm prisma:seed
    ```
4.  **Start development server**:
    ```bash
    pnpm dev
    ```

---

## Production Deployment Guide

For a full step-by-step production runbook, please refer to the [DEPLOYMENT_RUNBOOK.md](file:///e:/salary-management-system/DEPLOYMENT_RUNBOOK.md) file.

### 1. Neon Database Setup

1.  Create a PostgreSQL Project on [Neon](https://neon.tech/).
2.  Retrieve the Connection String (`postgresql://...`) and save it as `DATABASE_URL` in Vercel's environment variables.
3.  Execute the migration command locally pointing to your Neon database URL:
    ```bash
    npx prisma migrate deploy
    ```
4.  Seed the production database with 10,000 employees and the default HR Manager user:
    ```bash
    pnpm prisma:seed
    ```
5.  Verify statistics:
    ```bash
    pnpm search:health
    ```

### 2. Elastic Cloud Setup

1.  Provision an Elasticsearch deployment on [Elastic Cloud](https://cloud.elastic.co/).
2.  Retrieve the HTTPS Endpoint, Username (`elastic`), and Password.
3.  Expose these values as `ELASTICSEARCH_URL`, `ELASTICSEARCH_USERNAME`, and `ELASTICSEARCH_PASSWORD`.
4.  Run the bulk indexer script to load the 10,000 seeded employees into your Elastic Cloud index:
    ```bash
    pnpm search:sync
    ```

### 3. Vercel Deployment

1.  Connect your repository to Vercel.
2.  Add all environment variables listed in `.env.example`.
3.  Vercel will automatically run `prisma generate` during the `postinstall` step and compile Next.js production bundles.

---

## Troubleshooting

### 1. Prisma 7 Engine Validation Failure

- **Error**: `Using engine type "client" requires either "adapter" or "accelerateUrl"`
- **Cause**: In Prisma 7, the Rust query engine is disabled. You must provide a driver adapter.
- **Resolution**: Our `lib/prisma.ts` dynamically configures the `@prisma/adapter-pg` or `@prisma/adapter-better-sqlite3` adapter based on the protocol specified in `DATABASE_URL`. Ensure your `DATABASE_URL` starts with `postgres://` or `postgresql://` in production.

### 2. Elasticsearch Failures and Fallbacks

- **Behavior**: If the Elasticsearch node goes offline or connection times out, the search bar queries will fail gracefully and fall back to PostgreSQL database searches automatically.
- **Resolution**: Run `pnpm search:health` to check connection status. Check server logs to see the startup fallback messages: `[Search] ELASTICSEARCH_URL is not set. Falling back to DatabaseSearchService (PostgreSQL).`

### 3. Groq API Limits / Missing Key

- **Behavior**: If the `GROQ_API_KEY` is missing or invalid, the Natural Language pay query assistant returns a user-friendly error asking to check the environment configuration instead of throwing a server crash.

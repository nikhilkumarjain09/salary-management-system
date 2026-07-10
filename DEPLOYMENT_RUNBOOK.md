# Production Deployment Runbook

This document details the step-by-step instructions and command sequences to deploy the Salary Management System to production using Neon, Elastic Cloud, and Vercel.

---

## 1. Setup Neon Database (Manual Steps)

1.  Sign in to [Neon Console](https://neon.tech/).
2.  Click **Create a project**.
3.  Name your project (e.g., `salary-management-system`) and select your region.
4.  Copy the connection string (with pooled connections or direct connections depending on traffic) from the Dashboard. It will look like:
    ```
    postgresql://alex:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
    ```
5.  This string will be used as `DATABASE_URL` both locally (for seeding/migrations) and in Vercel.

---

## 2. Setup Elastic Cloud (Manual Steps)

1.  Sign in to [Elastic Cloud Console](https://cloud.elastic.co/).
2.  Click **Create deployment**.
3.  Choose Elasticsearch and name your deployment.
4.  Download the credentials sheet containing the `Username` (usually `elastic`) and `Password`.
5.  Navigate to the deployment page and copy the **Elasticsearch Endpoint URL** (HTTPS, e.g. `https://my-deployment.es.us-central1.gcp.cloud.es.io:443`).

---

## 3. Local Preparation & Seeding Commands

Perform these steps on your local machine to migrate and seed the remote production Neon database:

### Step 1: Set database connection variable

In your terminal, temporarily set `DATABASE_URL` to your Neon production string.

- **PowerShell (Windows)**:
  ```powershell
  $env:DATABASE_URL="postgresql://alex:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```
- **Bash (Mac/Linux)**:
  ```bash
  export DATABASE_URL="postgresql://alex:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```

### Step 2: Generate the Prisma Client

Clean compile client assets:

```bash
pnpm install
pnpm prisma:generate
```

### Step 3: Run Migrations against Neon

Push schema tables to Neon:

```bash
npx prisma migrate deploy
```

### Step 4: Seed the Production Neon Database

Populate 10,000 employees, historical salaries, compensation bands, market benchmarks, and the default HR Manager user:

```bash
pnpm prisma:seed
```

### Step 5: Verify Seeding and Database Counts

Verify Neon database count statistics:

```bash
pnpm search:health
```

### Step 6: Sync to Elastic Cloud

Index all 10,000 employees into Elastic Cloud:
Set your Elastic Cloud credentials in the terminal:

- **PowerShell (Windows)**:
  ```powershell
  $env:ELASTICSEARCH_URL="https://my-deployment.es.us-central1.gcp.cloud.es.io:443"
  $env:ELASTICSEARCH_USERNAME="elastic"
  $env:ELASTICSEARCH_PASSWORD="your-password-here"
  ```
- **Bash (Mac/Linux)**:
  ```bash
  export ELASTICSEARCH_URL="https://my-deployment.es.us-central1.gcp.cloud.es.io:443"
  export ELASTICSEARCH_USERNAME="elastic"
  export ELASTICSEARCH_PASSWORD="your-password-here"
  ```

Run the sync script:

```bash
pnpm search:sync
```

---

## 4. Setup Vercel Deployment (Manual Steps)

1.  Go to [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
2.  Import your repository.
3.  Configure the **Environment Variables**:
    - `DATABASE_URL` (Set to the Neon connection string)
    - `AUTH_SECRET` (Generate using `openssl rand -base64 32`)
    - `GROQ_API_KEY` (Your Groq API key)
    - `ELASTICSEARCH_URL` (Elastic Cloud URL)
    - `ELASTICSEARCH_USERNAME` (elastic)
    - `ELASTICSEARCH_PASSWORD` (Your Elastic Cloud password)
4.  Click **Deploy**.
5.  Once deployment completes, open the deployment link and log in with:
    - **Email**: `hr.manager@acme.com`
    - **Password**: `admin123`

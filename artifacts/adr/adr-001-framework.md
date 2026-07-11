# ADR-001: Next.js Framework Choice
**Category: Architecture**

## Status
Approved

## Context
We need a web application framework to build the Employee Salary Management System. The requirements demand search performance, API route endpoints, secure sessions, and rich, responsive client interfaces.

## Decision
We selected **Next.js 16 (App Router)** with React Server Components (RSC) and server actions.

## Alternatives Considered
*   **Vite + Express SPA**: Requires managing two separate codebases and deployment steps. It lacks server-side rendering (SSR), adding API latency for initial loads.

## Consequences
*   **Pros**: Monolithic deployment. RSC allows direct database calls inside page rendering, reducing HTTP roundtrips.
*   **Cons**: Cold-start latency inside serverless function environments. Managed by structuring driver adapters globally.

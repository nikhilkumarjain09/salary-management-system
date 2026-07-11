# ADR-002: Neon Serverless PostgreSQL Database Choice
**Category: Database**

## Status
Approved

## Context
The system requires a database capable of handling complex salary history queries, audit trail logging, and constraint validations.

## Decision
We selected **Neon Serverless PostgreSQL** as the primary relational database.

## Alternatives Considered
*   **MongoDB (NoSQL)**: Lacks strict foreign key constraint enforcement and atomic multi-table transaction blocks, which are critical for financial audits.
*   **Local PostgreSQL Instance**: Adds configuration complexity for serverless deployments.

## Consequences
*   **Pros**: Automatic scaling, instant branching, and connection pooling.
*   **Cons**: Cold start times on serverless database queries. Handled by configuring driver adapters to pool connections.

# ADR-003: Elasticsearch & DB Fallback Search Architecture
**Category: Search**

## Status
Approved

## Context
HR managers need to perform fast global searches and filters across 10k+ rows.

## Decision
We implemented **Elasticsearch (Elastic Cloud)** as the primary search provider, backed by **PostgreSQL DB search** as a fallback.

## Alternatives Considered
*   **Postgres Full-Text Search**: Works well for simple queries but lacks fuzzy matching, edge n-gram highlights, and independent cluster scaling.

## Consequences
*   **Pros**: Sub-10ms search results. Automatic query routing fallbacks to PostgreSQL if Elasticsearch encounters connection limits or timeouts.
*   **Cons**: Requires indexing sync overhead inside request handlers. Managed by executing indexing synchronously post-commit.

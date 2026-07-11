# ADR-005: Cursor Pagination Strategy
**Category: Performance**

## Status
Approved

## Context
When displaying lists of 10k to 1M+ rows, offset-based pagination (`OFFSET 10000`) becomes slow.

## Decision
We implemented **Cursor-Based Pagination** using encoded base64 token cursor values mapping sorting values and database primary keys.

## Alternatives Considered
*   **Offset Pagination**: Simpler to implement but degrades in performance under large page sizes.

## Consequences
*   **Pros**: Query speed is constant regardless of how deep the user paginates.
*   **Cons**: Lacks random access (e.g. "Go directly to page 55").

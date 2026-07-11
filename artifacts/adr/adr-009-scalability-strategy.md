# ADR-009: Future Scalability Strategy
**Category: Architecture**

## Status
Approved

## Context
As the app scales from 10k to 1M+ rows, real-time database queries and synchronous file/index actions will crash.

## Decision
We outlined a **decopled scaling architecture** incorporating Redis caching, asynchronous background queues (BullMQ), and read-write split scaling.

## Alternatives Considered
*   **Vertical DB scaling**: Expensive and hits physical limits quickly.

## Consequences
*   **Pros**: Constant 50ms performance.
*   **Cons**: Higher infrastructure maintenance overhead.

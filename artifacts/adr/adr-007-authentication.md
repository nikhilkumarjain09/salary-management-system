# ADR-007: Authentication & RBAC via Auth.js
**Category: Security**

## Status
Approved

## Context
We need to secure the application behind authentication and restrict actions (e.g. document modification, salary edits) based on user roles.

## Decision
We implemented **Auth.js v5 (NextAuth)** using the Credentials Provider. User roles are embedded in JWT tokens and verified inside API routes.

## Alternatives Considered
*   **Third-party Auth Services (Auth0, Clerk)**: Add external dependencies and costs.

## Consequences
*   **Pros**: Session management is secure and handled server-side via cookie verification.
*   **Cons**: Custom Credentials Provider doesn't support passwordless login patterns out-of-the-box.

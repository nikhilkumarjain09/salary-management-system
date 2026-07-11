# ADR-008: Document Management preview
**Category: Product**

## Status
Approved

## Context
HR managers need to preview uploaded documents (PDFs, images) without downloading them.

## Decision
We implemented **Cloudinary inline headers** combined with **HTML5 `<object>` rendering** and iframe fallbacks.

## Alternatives Considered
*   **Downloading files locally**: Bad UX.
*   **Third-party PDF render libraries**: Add bloat.

## Consequences
*   **Pros**: PDFs and images are rendered natively inside the browser.
*   **Cons**: Relies on browser-native PDF plug-ins.

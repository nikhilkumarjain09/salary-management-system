# ADR-006: React Table Virtualization
**Category: Frontend**

## Status
Approved

## Context
Rendering a list of 10k rows crashes browsers due to DOM rendering load.

## Decision
We implemented a **Custom React Virtualization** viewport render engine inside the `DataTable` component.

## Alternatives Considered
*   **Infinite Scrolling without Virtualization**: Appends elements to the DOM, eventually running out of memory.
*   **Third-party virtualization libraries (react-window)**: Add dependencies.

## Consequences
*   **Pros**: Active DOM node count is constant.
*   **Cons**: Requires absolute row positioning.

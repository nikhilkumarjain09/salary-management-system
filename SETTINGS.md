# SETTINGS.md — Design & Engineering Constraints

### Read this before every phase. These rules apply across the entire build and override any conflicting default behavior.

## Theme & Visual Identity

- Two themes: Dark (default) and Light, both defined as the same set of CSS
  variables (`--background`, `--surface`, `--surface-hover`, `--border`,
  `--text-primary`, `--text-muted`, `--accent`) with different values per
  theme — never hardcode a color outside these tokens, or the toggle will
  produce visual bugs.
- A theme toggle lives in the app header/nav, persists the choice (cookie or
  localStorage in the deployed app), and applies instantly with no flash of
  the wrong theme on reload (set the theme class/attribute before first
  paint, e.g. via a small inline script or Next.js theme-cookie pattern).
- Default to Dark on first visit if no preference is stored yet.
- A real type scale (`text-xs` through `text-3xl`) with distinct weights for
  headings vs body vs labels. Don't just bump font-size for hierarchy.
- One consistent spacing/radius scale — cards, inputs, and buttons all share
  the same border-radius token. No mixed rounding across components.
- Design must look intentional and custom — not a default shadcn/ui template
  with no modification. This applies equally to both themes; the light
  theme is not an afterthought.

## Loading Skeletons

- Every view that loads data from the server (directory table, employee
  detail, dashboard charts/stats, audit log, reports, org chart) shows a
  skeleton matching the shape of the eventual content — skeleton table rows
  for DataTable, skeleton card/stat blocks for StatCard, skeleton chart area
  for charts — never a bare spinner or blank screen for initial data loads.
- Skeletons use a subtle shimmer/pulse animation, respecting
  `prefers-reduced-motion` (fall back to a static muted-color block).
- Reserve real spinners (LoadingSpinner) only for scoped, in-place actions
  after data is already visible (button clicks, form submits) — not for
  initial page/data loads, which always get a skeleton instead.

## Popups: Instant Open

- Modal, ConfirmDialog, ContextMenu, CommandPalette, and Toast must open the
  instant the trigger fires — no mount delay, no waiting on a fade-in before
  content is visible/interactive. Any entrance animation is fast (~100-150ms)
  and purely cosmetic on top of already-rendered, already-interactive
  content — it must never gate interactivity or make the popup feel laggy.
- Closing can be equally fast; don't block the next action on an exit
  animation finishing.

## Validation

- Every form (create/edit employee, salary record, compensation bands,
  saved reports, login) validates with zod on both the client (inline,
  field-level, as-you-type or on-blur error messages using the shared
  FormField error slot) and again on the server inside the API route —
  never trust client-side validation alone.
- Validation error messages are specific and actionable ("Base salary must
  be greater than 0", not "Invalid input").
- Server-side validation failures return a clear error the client surfaces
  via Toast or inline FormField error, never a raw stack trace or generic 500.

## Icons

- `lucide-react` only. Consistent stroke width and size across the entire app.
- No emojis anywhere — not in UI copy, not in placeholder text, not in commit
  messages or code comments.
- Classic/professional icon choices only — avoid playful, cartoonish, or
  inconsistent icon styles.

## Components

- Build and reuse a shared component layer in `components/ui/`: Button, Card,
  DataTable, Modal, FormField, StatCard, PageHeader, EmptyState,
  LoadingSpinner, Skeleton, ThemeToggle, ContextMenu, ConfirmDialog,
  CommandPalette, BulkActionBar, Tooltip, Toast.
- Every new screen must use these shared components. Do not write one-off
  table, form, or card markup on a page — extend the shared component instead
  and use it everywhere, including on screens built in earlier phases if they
  currently duplicate this markup.
- Every button/input/card variant needed by a new feature should be added as
  a prop or variant on the existing shared component, not as a new adjacent
  component.

## Enterprise Interaction Patterns

- **ContextMenu**: right-click (and a visible "⋮" kebab button for
  touch/no-mouse users — never rely on right-click alone) on table rows and
  key entities, offering relevant actions (view, edit, view history, export,
  deactivate). Positioned to stay on-screen near cursor/trigger, closes on
  outside click or Escape.
- **ConfirmDialog**: any destructive or hard-to-reverse action (deactivating
  an employee, bulk edits affecting many rows) must go through a confirmation
  modal stating exactly what will happen and how many records are affected —
  never a bare browser `confirm()`. Primary destructive action button is
  visually distinct (e.g. a warning/red state) from the cancel button.
- **CommandPalette**: a Cmd/Ctrl+K quick-access palette for jumping to an
  employee, a page, or a common action, with keyboard-only navigation
  (arrow keys + Enter) and fuzzy search.
- **BulkActionBar**: appears when one or more rows are selected via
  checkboxes in DataTable, showing count selected and available bulk actions
  (export selected, bulk department/level change), each still going through
  ConfirmDialog if destructive.
- All of the above must be fully keyboard-accessible and close on Escape —
  this is a professional tool, not a mobile-only touch UI.

## Animation

- Subtle only: fade/slide-in on page and section load (staggered slightly for
  lists, not all at once), hover/press micro-interactions on buttons and
  table rows, animated count-up for dashboard numbers, smooth transitions on
  modals/drawers opening and closing.
- Use Framer Motion or CSS transitions with one shared easing/duration token
  set — reuse the same timing values everywhere, don't invent new ones per
  component.
- Respect `prefers-reduced-motion`. Nothing flashy, bouncy, or attention-
  grabbing — this is a professional HR tool.

## Loading & Feedback States

- Every action that hits the network (save, delete, query, filter) shows its
  own local loading state — never a full-page/global spinner for a scoped
  action.
- Success and error states use toasts, not silent failures or console-only
  errors.

## Responsiveness

- Must not break at any width from 320px to 2560px.
- Tables scroll horizontally on narrow screens rather than overflow or clip.
- Verify every new screen at mobile (375px), tablet (768px), and desktop
  (1440px+) before considering the phase done.

## Branding Placeholders

- Favicon lives at `app/favicon.ico`, logo lives at `components/logo.tsx` (or
  `public/logo.svg`) — both simple, monochrome, on-brand placeholders. Keep
  them isolated in these single files so they can be swapped for final brand
  assets later without touching any other code.

## Audit Logging

- Every mutation anywhere in the app (create, edit, deactivate, bulk action,
  band change) must write one AuditLogEntry — actor, action, entity type/id,
  before/after values. This is a standing rule from Phase 7 onward, not a
  one-time task: any new write path added in a later phase (bands, reports,
  etc.) must also log to AuditLogEntry.
- Never mutate or delete an AuditLogEntry once written.

## Code Quality

- TypeScript strict mode. No `any` without a comment justifying it.
- Zero-manual-step local startup: `pnpm install && pnpm dev` should be enough
  (seed script documented as a separate step).

## If You Notice Drift

If a previous phase's output violates any rule above (light-mode colors, an
emoji, a one-off component that duplicates a shared one, inconsistent icons),
fix it as part of the current phase before adding new work — do not leave it
"for later."

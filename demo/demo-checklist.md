# Demo Quality & Feature Checklist
**Location: demo/demo-checklist.md**

---

This checklist verifies the visual quality, data validity, and responsiveness of the system's core flows prior to final recording.

## 1. Visual Verification & Layout
- [x] **No Broken UI**: Grid layout is symmetric and aligned.
- [x] **Zero Console Errors**: Developer logs remain clear of React key or prop type warnings.
- [x] **Smooth Transitions**: Modals fade and slide naturally.
- [x] **Stable Sidebar**: Brand texts and link icons compress during collapses without layout shifting.

## 2. Directory Features
- [x] **Search Modes**: Verify Starts With, Contains, and Exact Match functions return expected counts.
- [x] **Virtual List Scrolling**: Check for lag-free scrolling when navigating large datasets.
- [x] **Compact Layout**: Filters grid uses tight spacing to pull the table header up.

## 3. Operations & Document Auditing
- [x] **Relational Revisions**: Creating a salary update updates the profile aggregates and logs history.
- [x] **Secure PDF Previews**: PDF assets load and render inline inside the side-drawer.
- [x] **Client CSV Parser**: Dropping corrupted CSV templates highlights columns in amber with Zod-defined error descriptions.

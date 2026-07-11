# SaaS Product Demo Script
**Location: demo/demo-script.md**

---

## Demo Overview
*   **Target Length**: 5–8 minutes
*   **Format**: SaaS Product Walkthrough (High-fidelity presentation for Engineering Panels)
*   **Goal**: Demonstrate CompensaIQ's premium layout, speed, advanced filtering, relational history tracking, bulk upload validation, secure document previews, and AI query assistant.

---

## Scene Timeline

| Scene | Duration | Feature | UI Target | User Action | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | 0:30 | Introduction | Login Page | Enter credentials; click "Sign In". | Smooth fade-in of the main analytics Dashboard page. |
| **2** | 1:00 | Analytics & KPIs | Dashboard | Hover over KPI cards; scroll salary breakdown charts. | Responsive tooltips and micro-animations render. |
| **3** | 1:30 | Employee Directory | Directory | Toggle "Search Mode" selector; input partial names. | Sub-10ms list filters update on input debounce. |
| **4** | 1:00 | Salary History | Profile Panel | Open employee profile; click "Salary History". | Timeline of salary revision logs displays without overwrites. |
| **5** | 1:00 | Document Preview | Profile Documents | Select PDF asset; trigger inline preview. | PDF renders directly inside the side-drawer object pane. |
| **6** | 1:00 | Bulk CSV Preview | Bulk Upload Modal | Drag & drop malformed CSV file. | Client checks Zod constraints; displays hover error tooltips. |
| **7** | 1:00 | AI Query Assistant | NL Query Panel | Input plain English payroll questions. | Grounded results return without SQL injection risk. |
| **8** | 0:30 | Wrap-up | Settings | Toggle theme; summarize scaling architecture. | Graceful logout animation. |

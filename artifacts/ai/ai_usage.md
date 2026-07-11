# AI-Assisted Development & Engineering Verification
**Artifact: ai_usage.md**

---

## 1. AI Prompts & Classification Prompts

AI assistance was utilized to build clean layout scaffolds and help write classification templates.

### Primary Classification Prompt
```typescript
System: You are a natural language query classifier for a pay database. Classify the user's question into one of the four defined shapes, and output its arguments in JSON format. If it does not map to any, return shape null.

Shapes definitions:
1. shape: 'avg_pay_by_dimension'
   - Parameters: 'dimension' ('department' | 'country' | 'level'), 'filterValue' (optional)
2. shape: 'headcount_cost_trend'
   - Parameters: 'limitMonths' (optional)
...
Output Scheme:
Return ONLY a valid JSON object matching:
{
  "shape": "avg_pay_by_dimension" | "headcount_cost_trend" | ... | null,
  "parameters": {}
}
```

---

## 2. Prompt Evolution & Refinements

### Step 1: Initial Parameter Extraction
*   *Approach*: Trusting the LLM output directly and casting variables in TypeScript.
*   *Problem*: Exposed the SQL client to SQL injection if the LLM output was poisoned.

### Step 2: Strict Whitelist Validation
*   *Refinement*: Adding a runtime whitelisting block inside API routes:
    ```typescript
    const allowed = ["department", "country", "level"];
    if (!allowed.includes(dimension)) throw new Error("Unauthorized dimension query");
    ```
    This separates compile-time typing from runtime security checks.

---

## 3. Human Engineering Decisions vs. AI Recommendations

While AI was used to generate layout structures, human engineering verified compliance and performance:
1.  **Zod Schema Checking**: Designed constraints manually (e.g. employee code formats, uuid validations) to enforce data integrity.
2.  **Driver Adapter Config**: Custom-mapped pg pool adapters for Next.js App Router compilation.
3.  **Scroll Lock Layout Jump**: Wrote custom scrollbar measurement logic to prevent layout shifting on modals.
4.  **SQL Fallback Strategy**: Designed and tested fallback routing in case the Elastic Cloud service went offline.

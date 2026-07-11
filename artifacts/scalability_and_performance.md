# Scalability & Performance Engineering
**Artifact: scalability_and_performance.md**

---

## 1. Pagination & Cursor Spacing
Offset-based pagination (`LIMIT 50 OFFSET 10000`) degrades query speeds as the offset increases because the database engine must scan and discard all preceding records. 

CompensaIQ solves this by implementing **Cursor-Based Pagination**:
*   The query fetches `limit + 1` rows.
*   The last record's tie-breaker attributes (e.g. `(name, id)`) are base64-encoded and returned as `nextCursor`.
*   Subsequent requests pass the cursor, allowing the database to execute a fast indexed filter (`WHERE (name, id) > (last_name, last_id)`), keeping response times constant under any depth.

---

## 2. DOM Virtualization
Drawing 10,000+ complex table rows inside the browser DOM results in memory overhead and rendering lag. CompensaIQ features a **Custom React Virtualization** layout:
*   The viewport height is measured, and only the rows visible inside the window (plus a small buffer) are rendered.
*   Absolute positioning wraps rows inside a scroll container, keeping the active DOM node count below 100 regardless of the dataset size.

---

## 3. Database Indexing Scheme

### Composite Filtering Index
```sql
CREATE INDEX employee_filter_idx ON "Employee" ("isActive", "department", "level", "country");
```
*   **Why it matters**: Matches the primary filters grid, allowing multi-column filtering in a single index scan.

### Sorting & Pagination Indexes
```sql
CREATE INDEX employee_name_sort_idx ON "Employee" ("name" ASC, "id" ASC);
CREATE INDEX employee_code_sort_idx ON "Employee" ("employeeCode" ASC, "id" ASC);
```
*   **Why it matters**: Optimizes the default sorting and cursor-based tie-breakers.

---

## 4. Scaling Plan (10k to 1M+ Employees)

### Scenario A: 10,000 Employees (Current)
*   **Performance Profile**: sub-50ms API replies.
*   **Caching**: Local in-memory Map cache (`localCache`) is sufficient.
*   **Aggregation**: Real-time SQL aggregates execute in under 15ms.

### Scenario B: 100,000 Employees
*   **Performance Profile**: Aggregation endpoints (`/api/analytics`) begin to slow down due to sequential median and headcount cost calculations.
*   **Caching**: Ephemeral in-memory caches will cause cache stampedes across multiple serverless functions.
*   **Scaling Actions**:
    1.  Replace the local cache `Map` with a distributed **Redis** instance (e.g. Upstash Redis) to synchronize cache states.
    2.  Precompute analytics aggregates asynchronously via cron jobs and save them into a read-optimized summary table.

### Scenario C: 1,000,000+ Employees
*   **Performance Profile**: Real-time database aggregations will time out. Synchronous search indexing blocks API response cycles.
*   **Scaling Actions**:
    1.  **Asynchronous Job Processing**: Move bulk imports and indexing updates to an asynchronous queue (e.g. BullMQ + Redis) processed by background worker instances.
    2.  **Read-Write Split**: Route read-heavy searches exclusively to Elasticsearch clusters and write updates to PostgreSQL, separating read and write workloads.
    3.  **Database Partitioning**: Partition the PostgreSQL `Employee` and `SalaryRecord` tables by country or region to limit index size.

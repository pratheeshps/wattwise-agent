# Storage resilience operations

Wattwise records failed object deletions in the PostgreSQL `StorageCleanup` table. The worker retries due tasks with exponential backoff (2 minutes initially, capped at 24 hours).

Configure `STORAGE_CLEANUP_SECRET` as a high-entropy secret in every application environment. Schedule an HTTP POST to `/api/internal/storage-cleanup` (for example, every 5 minutes) with:

```http
Authorization: Bearer <STORAGE_CLEANUP_SECRET>
```

The worker processes at most 50 due tasks per request and returns `processed`, `deleted`, and `failed` counts. Requests without the secret are rejected. Do not expose the secret in client-side variables or browser code.

Upload rollback cleanup is best-effort when the database is unavailable: the application logs a queue-persistence failure because no durable retry record can be written while PostgreSQL is unreachable. Once the database is available, the normal retry worker processes persisted tasks.

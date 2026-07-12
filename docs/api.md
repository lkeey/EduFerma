# EduFerma API

EduFerma exposes versioned API routes under `/api/v1/**`.

- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/openapi.json`
- Task bank: `/api/v1/task-bank`
- Student dashboard: `/api/v1/student/dashboard`
- Teacher dashboard: `/api/v1/teacher/dashboard`

The dashboard routes read from the server-side platform service layer. When
`DATABASE_URL` is configured, the service queries Neon Postgres through Drizzle.
Without `DATABASE_URL`, local development falls back to explicit demo data and
marks the response source as `demo-fallback`.

Student-facing responses must not expose `answerHash`, `solutionMd`, teacher
notes, local source paths or other teacher-only fields.

Run API governance before merging API changes:

```bash
pnpm api:governance
```

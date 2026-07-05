# OpenAPI Workflow

## Adding A New API Endpoint

A new API endpoint is not complete until:

1. Route handler exists.
2. Request schema exists when the endpoint accepts input.
3. Response schema exists.
4. Permission check exists.
5. OpenAPI operation exists.
6. Tests exist.
7. API governance passes.
8. Swagger UI renders the endpoint.

Example:

```text
Add /api/v1/teacher/foo
-> add route.ts
-> add Zod schemas
-> add OpenAPI operation
-> add tests
-> run pnpm api:governance
```

Blocking rule:

```text
route.ts exists in /api/v1
-> must exist in openapi.json
-> must have operationId
-> must have request/response schema
-> must have security or explicit public marker
-> must have tests
```

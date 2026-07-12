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

Concrete workflow:

```text
1. Add or update apps/web/src/app/api/v1/**/route.ts.
2. Parse params/body with validators from packages/validators when input exists.
3. Call requireApiRole(...) and any ownership check before service access.
4. Route handler calls getServices().<domain>.<operation>.
5. Service returns a student-safe or teacher DTO from packages/core/src/services.
6. Add or update routeDefinitions in packages/api-contract/src/registry.ts.
7. Add request/response schema mapping in packages/api-contract/src/openapi.ts.
8. Run pnpm api:openapi:generate and commit packages/api-contract/openapi.json.
9. Add unit/API tests for auth, role, validation and sensitive-field behavior.
10. Check /api/docs renders from /api/openapi.json when docs are enabled.
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

Recommended verification:

```bash
pnpm api:openapi:generate
pnpm api:openapi:check
pnpm api:governance
pnpm test
pnpm build
```

Internal integration routes outside `/api/v1`, such as provider webhooks or cron
callbacks, may stay out of OpenAPI only when they are documented and registered
as explicit governance exceptions. They still need authentication, validation,
tests and secret-hygiene review.

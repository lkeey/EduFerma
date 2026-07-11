# API

EduFerma uses API-first data access for platform data. Business endpoints live
under `/api/v1`.

## OpenAPI And Swagger

- OpenAPI JSON: `/api/openapi.json`
- Swagger UI: `/api/docs`

Both are controlled by `OPENAPI_DOCS_ENABLED`. In production this can be set to
`false` to hide docs without breaking the app.

## Adding A Route

1. Add `apps/web/src/app/api/v1/**/route.ts`.
2. Add or reuse request and response schemas.
3. Enforce auth, role and ownership on the server.
4. Return only serialized safe fields.
5. Add an OpenAPI operation.
6. Add tests.
7. Run `pnpm api:governance`.

No `/api/v1` route is complete until it is present in OpenAPI.

## Integration Webhooks

Integration callbacks that are provider-owned, such as
`POST /api/integrations/telegram/webhook`, are not part of the versioned
EduFerma public API contract and are intentionally excluded from OpenAPI. They
must still validate provider authentication, validate request shape, avoid
printing secrets, and have tests. Telegram webhook details live in
`docs/telegram-delivery.md`.

## Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

Standard codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `SETUP_REQUIRED`,
`INTERNAL_ERROR`.

## Security

Protected operations use Clerk-backed session auth. Demo auth is permitted only
when `ENABLE_DEMO_AUTH=true` and `NODE_ENV !== "production"`.

Student APIs must never include `answer_json`, `solution_md`, teacher notes or
local/internal source paths.

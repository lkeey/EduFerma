# API Versioning

Business APIs live under `/api/v1`.

Reserved non-versioned endpoints:

- `/api/health`
- `/api/health/db`
- `/api/openapi.json`
- `/api/docs`
- `/api/integrations/**` — provider-owned callbacks such as `POST /api/integrations/telegram/webhook`; excluded from the versioned OpenAPI contract.

Breaking changes require a new version or an explicit migration note. Do not
silently change response shapes consumed by the frontend or external tools.

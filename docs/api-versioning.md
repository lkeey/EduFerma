# API Versioning

Business APIs live under `/api/v1`.

Reserved non-versioned endpoints:

- `/api/health`
- `/api/health/db`
- `/api/openapi.json`
- `/api/docs`
- `/api/webhooks/**`

Breaking changes require a new version or an explicit migration note. Do not
silently change response shapes consumed by the frontend or external tools.
